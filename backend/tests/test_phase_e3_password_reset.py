"""Tests for Phase E3 — Password Reset Flow.

Covers the service helper (link, escape, send) and the two new endpoints
(``POST /api/auth/forgot-password``, ``POST /api/auth/reset-password``)
exercised through FastAPI's TestClient against an isolated Mongo DB.
"""
from __future__ import annotations

import asyncio
import hashlib
import os
import sys
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


# ---------------------------------------------------------------------------
# Unit tests — link builder and template
# ---------------------------------------------------------------------------


@pytest.fixture
def frontend_url(monkeypatch):
    url = "https://app.stickpro.test"
    monkeypatch.setenv("FRONTEND_URL", url)
    return url


def test_build_reset_link_uses_frontend_url(frontend_url):
    from services.password_reset_emails import build_reset_link

    link = build_reset_link("abc123")
    assert link == f"{frontend_url}/reset-password?token=abc123"


def test_build_reset_link_url_encodes_token(frontend_url):
    from services.password_reset_emails import build_reset_link

    link = build_reset_link("a/b?c=d&e")
    assert "/reset-password?token=a%2Fb%3Fc%3Dd%26e" in link


def test_build_reset_link_rejects_missing_token(frontend_url):
    from services.password_reset_emails import build_reset_link

    with pytest.raises(ValueError):
        build_reset_link("")


def test_build_reset_link_rejects_missing_frontend_url(monkeypatch):
    monkeypatch.delenv("FRONTEND_URL", raising=False)
    from services.password_reset_emails import build_reset_link

    with pytest.raises(ValueError):
        build_reset_link("tok")


def test_html_body_escapes_user_controlled_values(frontend_url):
    from services.password_reset_emails import _render_bodies, build_reset_link

    html_body, _ = _render_bodies(
        name='<script>alert(1)</script>',
        reset_link=build_reset_link('a"&b'),
    )
    # User-controlled name must be HTML-escaped, not raw.
    assert "<script>" not in html_body
    assert "&lt;script&gt;" in html_body
    # Token portion is URL-encoded by build_reset_link: " -> %22, & -> %26
    assert "%22" in html_body
    assert "%26b" in html_body
    # No raw double-quote leaks into the href attribute.
    assert 'token=a"' not in html_body


def test_plain_text_body_has_no_html(frontend_url):
    from services.password_reset_emails import _render_bodies, build_reset_link

    _, plain = _render_bodies(name="Joao", reset_link=build_reset_link("t"))
    assert "Joao" in plain
    assert "Stick Pro" in plain
    assert "<" not in plain
    assert "</" not in plain


def _success_result(message_id="msg_pr"):
    from services.emails import EmailResult

    return EmailResult(success=True, message_id=message_id, attempts=1)


def test_send_password_reset_email_calls_send_email(frontend_url):
    from services import password_reset_emails as pr

    fake = AsyncMock(return_value=_success_result())
    with patch.object(pr, "send_email", fake):
        ok = asyncio.run(
            pr.send_password_reset_email(
                to_email="user@example.com",
                name="Joao",
                token="tok_pr",
                idempotency_key="forgot-42-abcd",
            )
        )
    assert ok is True
    fake.assert_awaited_once()
    msg = fake.await_args.args[0]
    assert msg.to == ["user@example.com"]
    assert msg.subject == "Redefinir palavra-passe Stick Pro"
    assert msg.text and "tok_pr" in msg.text
    assert msg.tags == {"category": "password_reset"}
    assert msg.headers == {"X-Idempotency-Key": "forgot-42-abcd"}


def test_send_password_reset_email_returns_false_on_exception(frontend_url):
    from services import password_reset_emails as pr

    fake = AsyncMock(side_effect=RuntimeError("resend down"))
    with patch.object(pr, "send_email", fake):
        ok = asyncio.run(
            pr.send_password_reset_email(
                to_email="user@example.com", name="J", token="tok",
            )
        )
    assert ok is False


def test_send_password_reset_email_rejects_invalid_inputs(frontend_url):
    from services.password_reset_emails import send_password_reset_email

    with pytest.raises(ValueError):
        asyncio.run(send_password_reset_email(to_email="x", name="n", token="t"))
    with pytest.raises(ValueError):
        asyncio.run(
            send_password_reset_email(to_email="a@b.c", name="n", token="")
        )


# ---------------------------------------------------------------------------
# Endpoint tests via FastAPI TestClient + isolated Mongo
# ---------------------------------------------------------------------------


@pytest.fixture
def api_client_and_db(monkeypatch):
    import pymongo

    test_db_name = f"stickpro_e3_test_{uuid.uuid4().hex[:8]}"
    monkeypatch.setenv("DB_NAME", test_db_name)
    monkeypatch.setenv("FRONTEND_URL", "https://app.stickpro.test")
    monkeypatch.setenv("ENVIRONMENT", "development")
    for mod in list(sys.modules):
        if mod.startswith("server") or mod.startswith("services"):
            del sys.modules[mod]
    import importlib
    server = importlib.import_module("server")
    from fastapi.testclient import TestClient

    sender = AsyncMock(return_value=_success_result())
    # Patch the helper inside services.password_reset_emails
    monkeypatch.setattr(
        sys.modules["services.password_reset_emails"], "send_email", sender
    )

    sync_client = pymongo.MongoClient(os.environ["MONGO_URL"])
    sync_db = sync_client[test_db_name]

    with TestClient(server.app) as client:
        try:
            yield client, sync_db, sender, server
        finally:
            try:
                sync_client.drop_database(test_db_name)
            finally:
                sync_client.close()


def _make_user(db, *, email, is_activated=True,
               password_reset_token_hash=None,
               password_reset_expires_at=None,
               last_password_reset_email_sent_at=None,
               password="oldpassword"):
    # Use the same bcrypt hash routine as server.py
    import bcrypt
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": "Test User",
        "is_activated": is_activated,
        "hashed_password": hashed,
        "role": "jogador",
        "club_id": "test_club",
        "team_ids": [],
    }
    if password_reset_token_hash:
        doc["password_reset_token_hash"] = password_reset_token_hash
    if password_reset_expires_at:
        doc["password_reset_expires_at"] = password_reset_expires_at
    if last_password_reset_email_sent_at:
        doc["last_password_reset_email_sent_at"] = last_password_reset_email_sent_at
    db.users.insert_one(doc)
    return doc


FORGOT_GENERIC = (
    "Se existir uma conta associada a este email, "
    "enviámos um link para redefinir a palavra-passe."
)


def test_forgot_password_generic_for_unknown_email(api_client_and_db):
    client, _db, sender, _server = api_client_and_db
    r = client.post(
        "/api/auth/forgot-password", json={"email": "nope@example.com"}
    )
    assert r.status_code == 200
    assert r.json() == {"message": FORGOT_GENERIC}
    sender.assert_not_awaited()


def test_forgot_password_generic_for_inactive_account(api_client_and_db):
    client, db, sender, _server = api_client_and_db
    _make_user(db, email="pending@example.com", is_activated=False)
    r = client.post(
        "/api/auth/forgot-password", json={"email": "pending@example.com"}
    )
    assert r.status_code == 200
    assert r.json() == {"message": FORGOT_GENERIC}
    sender.assert_not_awaited()  # inactive accounts go through activation flow


def test_forgot_password_sends_and_persists_hash(api_client_and_db):
    client, db, sender, _server = api_client_and_db
    user = _make_user(db, email="alice@example.com")
    r = client.post(
        "/api/auth/forgot-password", json={"email": "alice@example.com"}
    )
    assert r.status_code == 200
    assert r.json() == {"message": FORGOT_GENERIC}
    sender.assert_awaited_once()

    # The raw token should be in the EmailMessage; the DB should only have its hash.
    msg = sender.await_args.args[0]
    raw_token = msg.text.split("/reset-password?token=")[1].split()[0]
    # the link gets quoted; strip any trailing path noise
    raw_token = raw_token.strip()

    stored = db.users.find_one({"id": user["id"]})
    expected_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    assert stored["password_reset_token_hash"] == expected_hash
    assert stored["password_reset_token_hash"] != raw_token  # not raw
    assert "password_reset_expires_at" in stored


def test_forgot_password_throttle_blocks_repeat(api_client_and_db):
    client, db, sender, _server = api_client_and_db
    _make_user(
        db,
        email="throttled@example.com",
        last_password_reset_email_sent_at=datetime.now(timezone.utc).isoformat(),
    )
    r = client.post(
        "/api/auth/forgot-password", json={"email": "throttled@example.com"}
    )
    assert r.status_code == 200
    assert r.json() == {"message": FORGOT_GENERIC}
    sender.assert_not_awaited()


def test_forgot_password_invalid_email_returns_422(api_client_and_db):
    client, _db, sender, _server = api_client_and_db
    r = client.post(
        "/api/auth/forgot-password", json={"email": "not-an-email"}
    )
    assert r.status_code == 422
    sender.assert_not_awaited()


def test_forgot_password_writes_audit_log(api_client_and_db):
    client, db, _sender, _server = api_client_and_db
    _make_user(db, email="audit@example.com")
    client.post("/api/auth/forgot-password", json={"email": "audit@example.com"})
    client.post("/api/auth/forgot-password", json={"email": "unknown@example.com"})

    rows = list(db.password_reset_audit.find({}))
    outcomes = {r["outcome"] for r in rows}
    assert "email_sent" in outcomes
    assert "ignored" in outcomes
    # Email never appears in clear form in audit rows
    for row in rows:
        assert "@example.com" in row["email_masked"]
        assert "audit@" not in row["email_masked"]
        assert "***" in row["email_masked"]


# ---------- reset-password ----------


def _issue_reset_for(client, db, email):
    """Trigger forgot-password for an email and recover the raw token from the
    mock EmailMessage on the last sender call."""
    client.post("/api/auth/forgot-password", json={"email": email})
    # Read back the token hash from the DB and the raw token from the sender
    # via the existing pytest fixture machinery isn't accessible here; instead
    # we just look at the latest stored hash and re-issue a known token.
    # Simpler: stamp our own token directly into the DB.
    raw_token = "raw-test-" + uuid.uuid4().hex
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_iso = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    db.users.update_one(
        {"email": email},
        {"$set": {
            "password_reset_token_hash": token_hash,
            "password_reset_expires_at": expires_iso,
        },
         "$unset": {"password_reset_used_at": ""}},
    )
    return raw_token


def test_reset_password_rejects_invalid_token(api_client_and_db):
    client, _db, _sender, _server = api_client_and_db
    r = client.post(
        "/api/auth/reset-password",
        json={"token": "thisDoesNotExist123456", "password": "newpass1!"},
    )
    assert r.status_code == 400
    assert r.json()["detail"]


def test_reset_password_rejects_expired_token(api_client_and_db):
    import bcrypt
    client, db, _sender, _server = api_client_and_db
    user = _make_user(db, email="expired@example.com")
    raw = "raw-expired-" + uuid.uuid4().hex
    token_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "password_reset_token_hash": token_hash,
            "password_reset_expires_at":
                (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat(),
        }},
    )
    r = client.post(
        "/api/auth/reset-password",
        json={"token": raw, "password": "newpass1!"},
    )
    assert r.status_code == 400
    # Expired token must have been cleared
    refreshed = db.users.find_one({"id": user["id"]})
    assert "password_reset_token_hash" not in refreshed
    # Old password still works (i.e. user was not unintentionally reset)
    assert bcrypt.checkpw(b"oldpassword", refreshed["hashed_password"].encode())


def test_reset_password_short_password_returns_422(api_client_and_db):
    client, db, _sender, _server = api_client_and_db
    user = _make_user(db, email="short@example.com")
    raw = _issue_reset_for(client, db, "short@example.com")
    _ = user
    r = client.post(
        "/api/auth/reset-password",
        json={"token": raw, "password": "abc"},
    )
    assert r.status_code == 422


def test_reset_password_success_changes_password_and_logs_audit(api_client_and_db):
    import bcrypt
    client, db, _sender, _server = api_client_and_db
    user = _make_user(db, email="ok@example.com", password="oldpassword")
    raw = _issue_reset_for(client, db, "ok@example.com")
    r = client.post(
        "/api/auth/reset-password",
        json={"token": raw, "password": "newsecret1"},
    )
    assert r.status_code == 204
    refreshed = db.users.find_one({"id": user["id"]})
    # Token consumed
    assert "password_reset_token_hash" not in refreshed
    assert "password_reset_used_at" in refreshed
    # Password changed
    assert not bcrypt.checkpw(b"oldpassword", refreshed["hashed_password"].encode())
    assert bcrypt.checkpw(b"newsecret1", refreshed["hashed_password"].encode())
    # Audit
    assert db.password_reset_audit.find_one({"outcome": "reset_succeeded"}) is not None


def test_reset_password_token_is_single_use(api_client_and_db):
    client, db, _sender, _server = api_client_and_db
    _make_user(db, email="single@example.com", password="oldpassword")
    raw = _issue_reset_for(client, db, "single@example.com")
    r1 = client.post(
        "/api/auth/reset-password",
        json={"token": raw, "password": "firstreset1"},
    )
    assert r1.status_code == 204
    # Second attempt with same token must fail
    r2 = client.post(
        "/api/auth/reset-password",
        json={"token": raw, "password": "secondreset1"},
    )
    assert r2.status_code == 400


def test_reset_password_after_reset_allows_login(api_client_and_db):
    """Smoke E2E: reset → login with the new password succeeds."""
    client, db, _sender, _server = api_client_and_db
    _make_user(db, email="loginpath@example.com", password="oldpassword")
    raw = _issue_reset_for(client, db, "loginpath@example.com")
    r = client.post(
        "/api/auth/reset-password",
        json={"token": raw, "password": "newpasslogin1"},
    )
    assert r.status_code == 204

    r_login = client.post(
        "/api/auth/login",
        json={"email": "loginpath@example.com", "password": "newpasslogin1"},
    )
    assert r_login.status_code == 200, r_login.text
    assert r_login.json().get("token")
