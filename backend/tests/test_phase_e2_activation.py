"""Tests for Phase E2 — Account Activation Email Flow.

Covers:
* ``services.activation_emails.build_activation_link`` — uses FRONTEND_URL,
  rejects empty input.
* HTML body escapes user-controlled values (XSS-style).
* Plain-text fallback is generated.
* ``send_activation_email`` calls into ``services.emails.send_email``.
* Delivery failure does not raise — returns False.
* Invalid recipient / missing token raise ValueError.
* Public endpoint ``POST /api/auth/request-new-activation-link`` returns the
  same generic message for existing-inactive / nonexistent / already-activated
  accounts (no enumeration leak).
* Throttle guard prevents back-to-back sends.

These tests are self-contained: they mock ``send_email`` so no Resend
network call is attempted, and they use a dedicated MongoDB test collection
isolated via a unique DB_NAME prefix.
"""
from __future__ import annotations

import asyncio
import os
import sys
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


# ---------------------------------------------------------------------------
# Unit tests — link builder and template rendering
# ---------------------------------------------------------------------------


@pytest.fixture
def frontend_url(monkeypatch):
    url = "https://app.stickpro.test"
    monkeypatch.setenv("FRONTEND_URL", url)
    return url


def test_build_activation_link_uses_frontend_url(frontend_url):
    from services.activation_emails import build_activation_link

    link = build_activation_link("abc123")
    assert link == f"{frontend_url}/activate-account?token=abc123"


def test_build_activation_link_strips_trailing_slash(monkeypatch):
    monkeypatch.setenv("FRONTEND_URL", "https://app.example.com/")
    from services.activation_emails import build_activation_link

    link = build_activation_link("tok")
    assert link == "https://app.example.com/activate-account?token=tok"


def test_build_activation_link_explicit_override(monkeypatch):
    monkeypatch.delenv("FRONTEND_URL", raising=False)
    from services.activation_emails import build_activation_link

    link = build_activation_link("tok", frontend_url="https://x.y")
    assert link == "https://x.y/activate-account?token=tok"


def test_build_activation_link_url_encodes_token(frontend_url):
    from services.activation_emails import build_activation_link

    link = build_activation_link("a/b?c=d&e")
    assert "/activate-account?token=a%2Fb%3Fc%3Dd%26e" in link


def test_build_activation_link_rejects_missing_token(frontend_url):
    from services.activation_emails import build_activation_link

    with pytest.raises(ValueError):
        build_activation_link("")


def test_build_activation_link_rejects_missing_frontend_url(monkeypatch):
    monkeypatch.delenv("FRONTEND_URL", raising=False)
    from services.activation_emails import build_activation_link

    with pytest.raises(ValueError) as ei:
        build_activation_link("tok")
    assert "FRONTEND_URL" in str(ei.value)


def test_html_body_escapes_user_name(frontend_url):
    from services.activation_emails import _render_bodies, build_activation_link

    malicious = '<script>alert("xss")</script>'
    html_body, _ = _render_bodies(
        name=malicious,
        activation_link=build_activation_link("tok"),
    )
    assert "<script>" not in html_body
    assert "&lt;script&gt;" in html_body
    assert "alert(&quot;xss&quot;)" in html_body


def test_html_body_escapes_activation_link(frontend_url):
    from services.activation_emails import _render_bodies

    # craft a link containing & and " — must be HTML-escaped in href and text
    link = 'https://x.y/activate-account?token=a"&b=c'
    html_body, _ = _render_bodies(name="Joao", activation_link=link)
    # raw double-quote inside href would break the attribute; must be escaped
    assert 'token=a"' not in html_body
    assert "token=a&quot;" in html_body
    assert "&amp;b=c" in html_body


def test_plain_text_fallback_is_provided(frontend_url):
    from services.activation_emails import _render_bodies, build_activation_link

    link = build_activation_link("t1")
    _, plain = _render_bodies(name="Joao", activation_link=link)
    assert "Joao" in plain
    assert link in plain
    assert "Stick Pro" in plain
    # plain text must not contain HTML tags
    assert "<" not in plain
    assert "</" not in plain


# ---------------------------------------------------------------------------
# send_activation_email — orchestration
# ---------------------------------------------------------------------------


def _success_result(message_id="msg_abc"):
    from services.emails import EmailResult

    return EmailResult(success=True, message_id=message_id, attempts=1)


def test_send_activation_email_calls_send_email(frontend_url):
    from services import activation_emails

    fake = AsyncMock(return_value=_success_result())
    with patch.object(activation_emails, "send_email", fake):
        ok = asyncio.run(
            activation_emails.send_activation_email(
                to_email="user@example.com",
                name="Joao",
                token="tok_xyz",
                idempotency_key="member-create-42",
            )
        )
    assert ok is True
    fake.assert_awaited_once()
    msg = fake.await_args.args[0]
    assert msg.to == ["user@example.com"]
    assert msg.subject == "Ativa a tua conta Stick Pro"
    assert msg.text and "tok_xyz" in msg.text
    assert msg.html and "tok_xyz" in msg.html
    assert msg.tags == {"category": "activation"}
    assert msg.headers == {"X-Idempotency-Key": "member-create-42"}


def test_send_activation_email_returns_false_on_exception(frontend_url):
    from services import activation_emails

    fake = AsyncMock(side_effect=RuntimeError("resend down"))
    with patch.object(activation_emails, "send_email", fake):
        ok = asyncio.run(
            activation_emails.send_activation_email(
                to_email="user@example.com",
                name="Joao",
                token="tok",
            )
        )
    assert ok is False
    fake.assert_awaited_once()


def test_send_activation_email_rejects_invalid_email(frontend_url):
    from services.activation_emails import send_activation_email

    with pytest.raises(ValueError):
        asyncio.run(
            send_activation_email(to_email="not-an-email", name="x", token="t")
        )


def test_send_activation_email_rejects_missing_token(frontend_url):
    from services.activation_emails import send_activation_email

    with pytest.raises(ValueError):
        asyncio.run(
            send_activation_email(to_email="a@b.c", name="x", token="")
        )


def test_send_activation_email_dry_run_succeeds_without_resend_key(monkeypatch):
    """In dev with no RESEND_API_KEY, the underlying service returns a dry-run
    EmailResult — the helper must report success."""
    monkeypatch.setenv("FRONTEND_URL", "https://app.example.com")
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    from services.activation_emails import send_activation_email

    ok = asyncio.run(
        send_activation_email(
            to_email="user@example.com", name="Joao", token="tok_abc"
        )
    )
    assert ok is True


# ---------------------------------------------------------------------------
# Public endpoint — /api/auth/request-new-activation-link
# ---------------------------------------------------------------------------


@pytest.fixture
def api_client_and_db(monkeypatch):
    """Build a FastAPI TestClient wired to a temporary Mongo DB name.

    Each test run gets its own DB and tears it down afterwards to avoid
    polluting the dev database. A synchronous pymongo client is used inside
    tests for setup/teardown — the FastAPI app itself continues to use motor
    via TestClient.
    """
    import pymongo

    test_db_name = f"stickpro_e2_test_{uuid.uuid4().hex[:8]}"
    monkeypatch.setenv("DB_NAME", test_db_name)
    monkeypatch.setenv("FRONTEND_URL", "https://app.stickpro.test")
    monkeypatch.setenv("ENVIRONMENT", "development")
    # Force-reload server module to pick up the patched DB_NAME
    for mod in list(sys.modules):
        if mod.startswith("server") or mod.startswith("services"):
            del sys.modules[mod]
    import importlib
    server = importlib.import_module("server")
    from fastapi.testclient import TestClient

    sender = AsyncMock(return_value=_success_result())
    monkeypatch.setattr(
        sys.modules["services.activation_emails"], "send_email", sender
    )

    sync_client = pymongo.MongoClient(os.environ["MONGO_URL"])
    sync_db = sync_client[test_db_name]

    with TestClient(server.app) as client:
        try:
            yield client, sync_db, sender
        finally:
            try:
                sync_client.drop_database(test_db_name)
            finally:
                sync_client.close()


def _insert_user_sync(db, *, email, is_activated=False, invite_token=None,
                     invite_expires_at=None, last_activation_email_sent_at=None):
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": "Test User",
        "is_activated": is_activated,
        "role": "jogador",
        "club_id": "test_club",
        "team_ids": [],
        "hashed_password": None,
    }
    if invite_token:
        user["invite_token"] = invite_token
    if invite_expires_at:
        user["invite_expires_at"] = invite_expires_at
    if last_activation_email_sent_at:
        user["last_activation_email_sent_at"] = last_activation_email_sent_at
    db.users.insert_one(user)
    return user


GENERIC = (
    "Se existir uma conta inativa associada a este email, "
    "enviámos um novo link de ativação."
)


def test_resend_returns_generic_for_unknown_email(api_client_and_db):
    client, _db, sender = api_client_and_db
    r = client.post(
        "/api/auth/request-new-activation-link",
        json={"email": "nope@example.com"},
    )
    assert r.status_code == 200
    assert r.json()["message"] == GENERIC
    sender.assert_not_awaited()


def test_resend_returns_generic_for_already_activated(api_client_and_db):
    client, db, sender = api_client_and_db
    _insert_user_sync(db, email="active@example.com", is_activated=True)
    r = client.post(
        "/api/auth/request-new-activation-link",
        json={"email": "active@example.com"},
    )
    assert r.status_code == 200
    assert r.json()["message"] == GENERIC
    sender.assert_not_awaited()


def test_resend_sends_for_existing_inactive(api_client_and_db):
    client, db, sender = api_client_and_db
    _insert_user_sync(db, email="pending@example.com", is_activated=False)
    r = client.post(
        "/api/auth/request-new-activation-link",
        json={"email": "pending@example.com"},
    )
    assert r.status_code == 200
    assert r.json()["message"] == GENERIC
    sender.assert_awaited_once()
    msg = sender.await_args.args[0]
    assert msg.to == ["pending@example.com"]
    assert msg.tags == {"category": "activation"}


def test_resend_throttle_blocks_second_immediate_call(api_client_and_db):
    from datetime import datetime, timezone

    client, db, sender = api_client_and_db
    _insert_user_sync(
        db,
        email="throttled@example.com",
        is_activated=False,
        last_activation_email_sent_at=datetime.now(timezone.utc).isoformat(),
    )
    r = client.post(
        "/api/auth/request-new-activation-link",
        json={"email": "throttled@example.com"},
    )
    assert r.status_code == 200
    assert r.json()["message"] == GENERIC
    sender.assert_not_awaited()


def test_resend_invalid_email_returns_422(api_client_and_db):
    client, _db, sender = api_client_and_db
    r = client.post(
        "/api/auth/request-new-activation-link",
        json={"email": "not-an-email"},
    )
    assert r.status_code == 422
    sender.assert_not_awaited()
