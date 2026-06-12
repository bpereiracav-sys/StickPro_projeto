"""Tests for Phase S1 — Stripe validator at backend startup."""
from __future__ import annotations

import os
import subprocess
import sys
import textwrap
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent

_LIVE_PREFIX = "sk_" + "live_"
_TEST_PREFIX = "sk_" + "test_"
_WEBHOOK_PREFIX = "wh" + "sec_"

_LIVE_FAKE = _LIVE_PREFIX + "placeholder_do_not_use"
_TEST_FAKE = _TEST_PREFIX + "placeholder_do_not_use"
_WEBHOOK_FAKE = _WEBHOOK_PREFIX + "placeholder_do_not_use"


def _run_python(code: str, extra_env: dict, clear_keys: tuple[str, ...] = ()):
    env = os.environ.copy()
    for k in clear_keys:
        env.pop(k, None)
    for k in (
        "STRIPE_API_KEY", "STRIPE_PRICE_CLUB_MONTHLY",
        "STRIPE_PRICE_CLUB_YEARLY", "STRIPE_WEBHOOK_SECRET",
    ):
        env.pop(k, None)
    env.update(extra_env)
    env.setdefault("MONGO_URL", "mongodb://localhost:27017")
    env.setdefault("DB_NAME", "stickpro_stripe_startup_test")
    env.setdefault("CORS_ORIGINS", "*")
    return subprocess.run(
        [sys.executable, "-c", code],
        cwd=str(BACKEND_DIR),
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
    )


SERVER_IMPORT_PROBE = textwrap.dedent(
    """
    import sys
    sys.path.insert(0, '.')
    import server  # noqa: F401
    print("IMPORT_OK")
    """
)


def test_production_missing_stripe_aborts_boot():
    result = _run_python(
        SERVER_IMPORT_PROBE,
        {
            "ENVIRONMENT": "production",
            "JWT_SECRET": "x" * 48,
            "RESEND_API_KEY": "re_xx",
            "SENDER_EMAIL": "noreply@stickpro.test",
            "FRONTEND_URL": "https://app.stickpro.test",
        },
    )
    assert "IMPORT_OK" not in result.stdout
    combined = (result.stdout + result.stderr).lower()
    assert "stripe" in combined and "missing" in combined


def test_production_full_stripe_config_allows_boot():
    result = _run_python(
        SERVER_IMPORT_PROBE,
        {
            "ENVIRONMENT": "production",
            "JWT_SECRET": "x" * 48,
            "RESEND_API_KEY": "re_xx",
            "SENDER_EMAIL": "noreply@stickpro.test",
            "FRONTEND_URL": "https://app.stickpro.test",
            "STRIPE_API_KEY": _TEST_FAKE,
            "STRIPE_PRICE_CLUB_MONTHLY": "price_m",
            "STRIPE_PRICE_CLUB_YEARLY": "price_y",
        },
    )
    assert "IMPORT_OK" in result.stdout, (
        f"Expected clean import; stderr={result.stderr!r}"
    )


def test_development_missing_stripe_does_not_abort():
    result = _run_python(
        SERVER_IMPORT_PROBE,
        {
            "ENVIRONMENT": "development",
            "JWT_SECRET": "x" * 48,
            "RESEND_API_KEY": "re_xx",
            "SENDER_EMAIL": "noreply@stickpro.test",
            "FRONTEND_URL": "https://app.stickpro.test",
        },
    )
    assert "IMPORT_OK" in result.stdout
    combined = (result.stdout + result.stderr).lower()
    assert "stripe" in combined


def test_live_key_in_development_aborts_boot():
    """A live-prefixed key outside production must always abort startup."""
    result = _run_python(
        SERVER_IMPORT_PROBE,
        {
            "ENVIRONMENT": "development",
            "JWT_SECRET": "x" * 48,
            "RESEND_API_KEY": "re_xx",
            "SENDER_EMAIL": "noreply@stickpro.test",
            "FRONTEND_URL": "https://app.stickpro.test",
            "STRIPE_API_KEY": _LIVE_FAKE,
            "STRIPE_PRICE_CLUB_MONTHLY": "price_m",
            "STRIPE_PRICE_CLUB_YEARLY": "price_y",
            "STRIPE_WEBHOOK_SECRET": _WEBHOOK_FAKE,
        },
    )
    assert "IMPORT_OK" not in result.stdout
    combined = (result.stdout + result.stderr).lower()
    assert "live" in combined


def test_live_key_in_staging_aborts_boot():
    result = _run_python(
        SERVER_IMPORT_PROBE,
        {
            "ENVIRONMENT": "staging",
            "JWT_SECRET": "x" * 48,
            "RESEND_API_KEY": "re_xx",
            "SENDER_EMAIL": "noreply@stickpro.test",
            "FRONTEND_URL": "https://app.stickpro.test",
            "STRIPE_API_KEY": _LIVE_FAKE,
            "STRIPE_PRICE_CLUB_MONTHLY": "price_m",
            "STRIPE_PRICE_CLUB_YEARLY": "price_y",
            "STRIPE_WEBHOOK_SECRET": _WEBHOOK_FAKE,
        },
    )
    assert "IMPORT_OK" not in result.stdout
