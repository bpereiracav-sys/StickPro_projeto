"""Tests for Phase E1 — Resend Production Readiness.

Covers:
* :func:`services.emails.validate_email_config` strict/lenient behaviour.
* :func:`services.emails.send_email` dry-run path.
* :func:`services.emails.send_email` retry on transient errors (5xx / 429 /
  generic exceptions) using a mocked SDK.
* :func:`services.emails.send_email` no-retry on permanent errors
  (validation, invalid api key).
* CLI ``backend/scripts/validate_email_config.py`` exit codes.
"""
from __future__ import annotations

import asyncio
import os
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from resend.exceptions import (
    ApplicationError,
    InvalidApiKeyError,
    RateLimitError,
    ValidationError,
)

# Ensure ``services`` is importable when pytest is run from backend/.
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.emails import (  # noqa: E402
    EmailAttachment,
    EmailConfigError,
    EmailDeliveryError,
    EmailMessage,
    REQUIRED_PRODUCTION_VARS,
    _build_params,
    is_retryable_error,
    send_email,
    validate_email_config,
)


def _make_resend_error(cls, message="boom", error_type="application_error", code=500):
    """Build a Resend SDK exception. Different subclasses have different
    constructor signatures, so we always pass the superset and the SDK picks
    what it needs."""
    try:
        return cls(message=message, error_type=error_type, code=code)
    except TypeError:
        # Older ApplicationError-like classes use positional ordering
        return cls(message, error_type, code)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


@pytest.fixture
def clean_env(monkeypatch):
    """Strip email-related env vars so each test sets exactly what it needs."""
    for var in ("ENVIRONMENT", "RESEND_API_KEY", "SENDER_EMAIL", "FRONTEND_URL"):
        monkeypatch.delenv(var, raising=False)
    return monkeypatch


def _sample_message(**overrides) -> EmailMessage:
    base = dict(
        to="user@example.com",
        subject="Hi",
        html="<p>Hello</p>",
    )
    base.update(overrides)
    return EmailMessage(**base)


# ---------------------------------------------------------------------------
# EmailMessage validation
# ---------------------------------------------------------------------------


def test_email_message_accepts_single_string_recipient():
    msg = EmailMessage(to="a@b.c", subject="s", html="<p/>")
    assert msg.to == ["a@b.c"]


def test_email_message_rejects_empty_recipients():
    with pytest.raises(ValueError):
        EmailMessage(to=[], subject="s", html="<p/>")


def test_email_message_requires_subject_and_html():
    with pytest.raises(ValueError):
        EmailMessage(to="a@b.c", subject="", html="<p/>")
    with pytest.raises(ValueError):
        EmailMessage(to="a@b.c", subject="s", html="")


# ---------------------------------------------------------------------------
# _build_params
# ---------------------------------------------------------------------------


def test_build_params_includes_optional_fields():
    msg = EmailMessage(
        to="a@b.c",
        subject="s",
        html="<p/>",
        text="plain",
        reply_to="reply@x.y",
        tags={"category": "txn"},
        headers={"X-Idempotency-Key": "abc"},
        attachments=[EmailAttachment(filename="f.txt", content=b"hi")],
    )
    params = _build_params(msg, sender="from@x.y")
    assert params["from"] == "from@x.y"
    assert params["to"] == ["a@b.c"]
    assert params["text"] == "plain"
    assert params["reply_to"] == "reply@x.y"
    assert params["tags"] == [{"name": "category", "value": "txn"}]
    assert params["headers"] == {"X-Idempotency-Key": "abc"}
    assert params["attachments"][0]["filename"] == "f.txt"
    # base64("hi") == "aGk="
    assert params["attachments"][0]["content"] == "aGk="


# ---------------------------------------------------------------------------
# validate_email_config
# ---------------------------------------------------------------------------


def test_validate_email_config_dev_lenient(clean_env):
    clean_env.setenv("ENVIRONMENT", "development")
    report = validate_email_config()
    assert report["ok"] is False
    assert report["environment"] == "development"
    assert set(report["missing"]) == set(REQUIRED_PRODUCTION_VARS)
    assert report["strict"] is False


def test_validate_email_config_production_missing_raises(clean_env):
    clean_env.setenv("ENVIRONMENT", "production")
    with pytest.raises(EmailConfigError) as ei:
        validate_email_config()
    msg = str(ei.value)
    for var in REQUIRED_PRODUCTION_VARS:
        assert var in msg


def test_validate_email_config_production_complete_ok(clean_env):
    clean_env.setenv("ENVIRONMENT", "production")
    clean_env.setenv("RESEND_API_KEY", "re_test")
    clean_env.setenv("SENDER_EMAIL", "noreply@stickpro.test")
    clean_env.setenv("FRONTEND_URL", "https://app.stickpro.test")
    report = validate_email_config()
    assert report["ok"] is True
    assert report["missing"] == []
    assert set(report["present"]) == set(REQUIRED_PRODUCTION_VARS)


def test_validate_email_config_strict_override(clean_env):
    clean_env.setenv("ENVIRONMENT", "development")
    with pytest.raises(EmailConfigError):
        validate_email_config(strict=True)


# ---------------------------------------------------------------------------
# is_retryable_error classifier
# ---------------------------------------------------------------------------


def test_is_retryable_error_classification():
    assert is_retryable_error(_make_resend_error(ApplicationError)) is True
    assert is_retryable_error(_make_resend_error(RateLimitError, code=429)) is True
    assert is_retryable_error(TimeoutError("net down")) is True
    assert is_retryable_error(ConnectionError("net down")) is True
    # Permanent
    assert is_retryable_error(_make_resend_error(ValidationError, code=422)) is False
    assert is_retryable_error(_make_resend_error(InvalidApiKeyError, code=401)) is False


# ---------------------------------------------------------------------------
# send_email — dry-run path
# ---------------------------------------------------------------------------


def test_send_email_dry_run_in_development(clean_env):
    clean_env.setenv("ENVIRONMENT", "development")
    # No RESEND_API_KEY
    result = asyncio.run(send_email(_sample_message()))
    assert result.success is True
    assert result.dry_run is True
    assert result.message_id and result.message_id.startswith("dryrun-")
    assert result.attempts == 0


def test_send_email_dry_run_blocked_in_production(clean_env):
    clean_env.setenv("ENVIRONMENT", "production")
    with pytest.raises(EmailConfigError):
        asyncio.run(send_email(_sample_message()))


# ---------------------------------------------------------------------------
# send_email — retry behaviour (SDK mocked)
# ---------------------------------------------------------------------------


def _patch_sdk(side_effects):
    """Patch ``resend.Emails.send`` with a list of side effects.

    Each item is either a returned dict (success) or an Exception (failure).
    """
    iterator = iter(side_effects)

    def fake_send(params):
        nxt = next(iterator)
        if isinstance(nxt, Exception):
            raise nxt
        return nxt

    return patch("resend.Emails.send", side_effect=fake_send)


async def _no_sleep(_):
    """Drop-in replacement for asyncio.sleep so tests don't actually wait."""
    return None


def test_send_email_retries_then_succeeds(clean_env):
    clean_env.setenv("ENVIRONMENT", "development")
    clean_env.setenv("RESEND_API_KEY", "re_test_123")
    clean_env.setenv("SENDER_EMAIL", "noreply@stickpro.test")

    side_effects = [
        _make_resend_error(ApplicationError, "transient 500"),
        _make_resend_error(RateLimitError, "slow down", code=429),
        {"id": "msg_abc"},
    ]
    with _patch_sdk(side_effects) as mock_send:
        result = asyncio.run(
            send_email(
                _sample_message(),
                max_attempts=3,
                base_delay=0.0,
                jitter=False,
                sleep=_no_sleep,
            )
        )
    assert result.success is True
    assert result.message_id == "msg_abc"
    assert result.attempts == 3
    assert mock_send.call_count == 3


def test_send_email_exhausts_retries_and_raises(clean_env):
    clean_env.setenv("ENVIRONMENT", "development")
    clean_env.setenv("RESEND_API_KEY", "re_test_123")
    clean_env.setenv("SENDER_EMAIL", "noreply@stickpro.test")

    side_effects = [
        _make_resend_error(ApplicationError, "transient 500"),
        _make_resend_error(ApplicationError, "transient 500"),
        _make_resend_error(ApplicationError, "transient 500"),
    ]
    with _patch_sdk(side_effects) as mock_send:
        with pytest.raises(EmailDeliveryError) as ei:
            asyncio.run(
                send_email(
                    _sample_message(),
                    max_attempts=3,
                    base_delay=0.0,
                    jitter=False,
                    sleep=_no_sleep,
                )
            )
    assert "ApplicationError" in str(ei.value)
    assert mock_send.call_count == 3


def test_send_email_does_not_retry_on_validation_error(clean_env):
    clean_env.setenv("ENVIRONMENT", "development")
    clean_env.setenv("RESEND_API_KEY", "re_test_123")
    clean_env.setenv("SENDER_EMAIL", "noreply@stickpro.test")

    side_effects = [_make_resend_error(ValidationError, "invalid from address", code=422)]
    with _patch_sdk(side_effects) as mock_send:
        with pytest.raises(EmailDeliveryError) as ei:
            asyncio.run(
                send_email(
                    _sample_message(),
                    max_attempts=5,
                    base_delay=0.0,
                    jitter=False,
                    sleep=_no_sleep,
                )
            )
    assert "ValidationError" in str(ei.value)
    assert mock_send.call_count == 1, "permanent errors must not retry"


def test_send_email_does_not_retry_on_invalid_api_key(clean_env):
    clean_env.setenv("ENVIRONMENT", "development")
    clean_env.setenv("RESEND_API_KEY", "re_bad_key")
    clean_env.setenv("SENDER_EMAIL", "noreply@stickpro.test")

    side_effects = [_make_resend_error(InvalidApiKeyError, "nope", code=401)]
    with _patch_sdk(side_effects) as mock_send:
        with pytest.raises(EmailDeliveryError):
            asyncio.run(
                send_email(
                    _sample_message(),
                    max_attempts=4,
                    base_delay=0.0,
                    jitter=False,
                    sleep=_no_sleep,
                )
            )
    assert mock_send.call_count == 1


def test_send_email_retries_on_generic_network_error(clean_env):
    clean_env.setenv("ENVIRONMENT", "development")
    clean_env.setenv("RESEND_API_KEY", "re_test_123")
    clean_env.setenv("SENDER_EMAIL", "noreply@stickpro.test")

    side_effects = [ConnectionError("DNS fail"), {"id": "msg_zzz"}]
    with _patch_sdk(side_effects) as mock_send:
        result = asyncio.run(
            send_email(
                _sample_message(),
                max_attempts=3,
                base_delay=0.0,
                jitter=False,
                sleep=_no_sleep,
            )
        )
    assert result.success is True
    assert result.attempts == 2
    assert mock_send.call_count == 2


# ---------------------------------------------------------------------------
# CLI validator
# ---------------------------------------------------------------------------


def _run_cli(env_overrides):
    env = os.environ.copy()
    for var in ("ENVIRONMENT", "RESEND_API_KEY", "SENDER_EMAIL", "FRONTEND_URL"):
        env.pop(var, None)
    env.update(env_overrides)
    env.setdefault("MONGO_URL", "mongodb://localhost:27017")
    env.setdefault("DB_NAME", "test_database")
    script = BACKEND_DIR / "scripts" / "validate_email_config.py"
    return subprocess.run(
        [sys.executable, str(script)],
        env=env,
        cwd=str(BACKEND_DIR),
        capture_output=True,
        text=True,
        timeout=15,
    )


def test_cli_production_missing_returns_1():
    result = _run_cli({"ENVIRONMENT": "production"})
    assert result.returncode == 1, result.stdout + result.stderr
    assert "Missing required email configuration" in (result.stdout + result.stderr)


def test_cli_production_complete_returns_0():
    result = _run_cli(
        {
            "ENVIRONMENT": "production",
            "RESEND_API_KEY": "re_test",
            "SENDER_EMAIL": "noreply@stickpro.test",
            "FRONTEND_URL": "https://app.stickpro.test",
        }
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "[OK]" in result.stdout


def test_cli_development_missing_returns_0_with_warning():
    result = _run_cli({"ENVIRONMENT": "development"})
    assert result.returncode == 0, result.stdout + result.stderr
    assert "[WARN]" in result.stdout
