"""Tests for Phase O4 — Admin Onboarding Wizard: Invitations + Summary.

Covers the two new endpoints layered on top of the existing wizard
state machine:

    * ``GET  /api/onboarding/invite-preview`` — lists the pending members
      of the admin's onboarding club so the Summary step can render a
      preview table.
    * ``POST /api/onboarding/send-invites``  — batch dispatch of
      activation invites with per-member results, dry-run flag, token
      reuse logic and per-club scope guards.
"""
from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import AsyncMock, patch

import bcrypt
import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def api_client_and_db(monkeypatch):
    import pymongo

    test_db_name = f"stickpro_o4_test_{uuid.uuid4().hex[:8]}"
    monkeypatch.setenv("DB_NAME", test_db_name)
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("FRONTEND_URL", "https://app.stickpro.test")
    monkeypatch.delenv("RESEND_API_KEY", raising=False)

    for mod in list(sys.modules):
        if mod.startswith("server") or mod.startswith("services"):
            del sys.modules[mod]
    import importlib
    server = importlib.import_module("server")
    from fastapi.testclient import TestClient

    sync_client = pymongo.MongoClient(os.environ["MONGO_URL"])
    sync_db = sync_client[test_db_name]

    with TestClient(server.app) as client:
        try:
            yield client, sync_db, server
        finally:
            try:
                sync_client.drop_database(test_db_name)
            finally:
                sync_client.close()


def _make_admin(db, *, email="admin@example.com", password="o4pass"):
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": "O4 Admin",
        "is_activated": True,
        "hashed_password": hashed,
        "role": "admin",
        "club_id": "seed",
        "team_ids": [],
    }
    db.users.insert_one(doc)
    return doc


def _login(client, email, password="o4pass"):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _setup_wizard_through_members(client, server, headers):
    """Helper: walk the wizard up to having a club + season + team +
    2 members created with suppress_invite=True."""
    club = client.post(
        "/api/clubs",
        json={"name": "Club O4", "acronym": "CO4", "country": "Portugal"},
        headers=headers,
    ).json()
    season = client.post(
        f"/api/clubs/{club['id']}/seasons",
        json={
            "name": "2026/2027",
            "start_date": "2026-09-01",
            "end_date": "2027-06-30",
            "is_active": True,
        },
        headers=headers,
    ).json()["season"]
    client.patch(
        "/api/onboarding/state",
        json={"completed_step": "club", "club_id": club["id"]},
        headers=headers,
    )
    client.patch(
        "/api/onboarding/state",
        json={"completed_step": "season", "season_id": season["id"]},
        headers=headers,
    )
    team = client.post(
        "/api/teams",
        json={
            "name": "Seniores",
            "category": "Seniores",
            "season": season["name"],
            "club_id": club["id"],
        },
        headers=headers,
    ).json()
    client.patch(
        "/api/onboarding/state",
        json={"completed_step": "teams"},
        headers=headers,
    )

    sender = AsyncMock(return_value=True)
    with patch.object(server, "send_activation_email", sender):
        coach = client.post(
            "/api/members",
            json={
                "name": "Coach Silva",
                "email": "silva@example.com",
                "role": "treinador",
                "team_id": team["id"],
                "suppress_invite": True,
            },
            headers=headers,
        ).json()["user"]
        player = client.post(
            "/api/members",
            json={
                "name": "Player Lopes",
                "email": "lopes@example.com",
                "role": "jogador",
                "team_id": team["id"],
                "suppress_invite": True,
            },
            headers=headers,
        ).json()["user"]

    client.patch(
        "/api/onboarding/state",
        json={"completed_step": "members", "current_step": 5},
        headers=headers,
    )
    return {"club": club, "season": season, "team": team, "coach": coach, "player": player}


# ---------------------------------------------------------------------------
# GET /api/onboarding/invite-preview
# ---------------------------------------------------------------------------


def test_preview_requires_admin(api_client_and_db):
    client, db, _server = api_client_and_db
    # Non-admin user.
    hashed = bcrypt.hashpw(b"x", bcrypt.gensalt()).decode("utf-8")
    db.users.insert_one({
        "id": str(uuid.uuid4()), "email": "coach@example.com",
        "name": "C", "hashed_password": hashed, "is_activated": True,
        "role": "treinador", "club_id": "seed", "team_ids": [],
    })
    token = _login(client, "coach@example.com", password="x")
    r = client.get("/api/onboarding/invite-preview", headers=_auth(token))
    assert r.status_code == 403


def test_preview_empty_when_no_club(api_client_and_db):
    client, db, _server = api_client_and_db
    _make_admin(db, email="empty@example.com")
    token = _login(client, "empty@example.com")
    r = client.get("/api/onboarding/invite-preview", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert body == {"club_id": None, "members": [], "dry_run": True}


def test_preview_lists_pending_members_with_team_names(api_client_and_db):
    client, db, server = api_client_and_db
    _make_admin(db, email="prev@example.com")
    token = _login(client, "prev@example.com")
    headers = _auth(token)
    ctx = _setup_wizard_through_members(client, server, headers)

    r = client.get("/api/onboarding/invite-preview", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["club_id"] == ctx["club"]["id"]
    assert body["dry_run"] is True
    emails = {m["email"] for m in body["members"]}
    assert emails == {"silva@example.com", "lopes@example.com"}
    for m in body["members"]:
        assert m["has_token"] is True
        assert m["team_name"] == "Seniores"


def test_preview_excludes_activated_users(api_client_and_db):
    client, db, server = api_client_and_db
    _make_admin(db, email="act@example.com")
    token = _login(client, "act@example.com")
    headers = _auth(token)
    ctx = _setup_wizard_through_members(client, server, headers)

    # Activate the coach manually — they must drop off the preview.
    db.users.update_one(
        {"id": ctx["coach"]["id"]}, {"$set": {"is_activated": True}}
    )
    r = client.get("/api/onboarding/invite-preview", headers=headers)
    emails = {m["email"] for m in r.json()["members"]}
    assert emails == {"lopes@example.com"}


# ---------------------------------------------------------------------------
# POST /api/onboarding/send-invites
# ---------------------------------------------------------------------------


def test_send_invites_requires_admin(api_client_and_db):
    client, db, _server = api_client_and_db
    hashed = bcrypt.hashpw(b"x", bcrypt.gensalt()).decode("utf-8")
    db.users.insert_one({
        "id": str(uuid.uuid4()), "email": "del@example.com",
        "name": "D", "hashed_password": hashed, "is_activated": True,
        "role": "delegado", "club_id": "seed", "team_ids": [],
    })
    token = _login(client, "del@example.com", password="x")
    r = client.post(
        "/api/onboarding/send-invites", json={}, headers=_auth(token)
    )
    assert r.status_code == 403


def test_send_invites_400_without_club(api_client_and_db):
    client, db, _server = api_client_and_db
    _make_admin(db, email="noclub@example.com")
    token = _login(client, "noclub@example.com")
    r = client.post(
        "/api/onboarding/send-invites", json={}, headers=_auth(token)
    )
    assert r.status_code == 400


def test_send_invites_sends_to_all_pending(api_client_and_db):
    client, db, server = api_client_and_db
    _make_admin(db, email="all@example.com")
    token = _login(client, "all@example.com")
    headers = _auth(token)
    ctx = _setup_wizard_through_members(client, server, headers)

    sender = AsyncMock(return_value=True)
    with patch.object(server, "send_activation_email", sender):
        r = client.post(
            "/api/onboarding/send-invites", json={}, headers=headers
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["dry_run"] is True  # no RESEND_API_KEY
    assert body["sent_count"] == 2
    assert body["skipped_count"] == 0
    assert body["failed_count"] == 0
    assert sender.await_count == 2

    sent_emails = {row["email"] for row in body["sent"]}
    assert sent_emails == {"silva@example.com", "lopes@example.com"}


def test_send_invites_filters_by_member_ids(api_client_and_db):
    client, db, server = api_client_and_db
    _make_admin(db, email="sel@example.com")
    token = _login(client, "sel@example.com")
    headers = _auth(token)
    ctx = _setup_wizard_through_members(client, server, headers)

    sender = AsyncMock(return_value=True)
    with patch.object(server, "send_activation_email", sender):
        r = client.post(
            "/api/onboarding/send-invites",
            json={"member_ids": [ctx["coach"]["id"]]},
            headers=headers,
        )
    assert r.status_code == 200
    body = r.json()
    assert body["sent_count"] == 1
    assert body["sent"][0]["email"] == "silva@example.com"
    assert sender.await_count == 1


def test_send_invites_skips_activated(api_client_and_db):
    client, db, server = api_client_and_db
    _make_admin(db, email="skip@example.com")
    token = _login(client, "skip@example.com")
    headers = _auth(token)
    ctx = _setup_wizard_through_members(client, server, headers)

    db.users.update_one(
        {"id": ctx["coach"]["id"]}, {"$set": {"is_activated": True}}
    )
    sender = AsyncMock(return_value=True)
    with patch.object(server, "send_activation_email", sender):
        r = client.post(
            "/api/onboarding/send-invites", json={}, headers=headers
        )
    body = r.json()
    assert body["sent_count"] == 1
    assert body["skipped_count"] == 1
    assert body["skipped"][0]["email"] == "silva@example.com"
    assert body["skipped"][0]["reason"] == "already_activated"


def test_send_invites_flags_foreign_club_ids(api_client_and_db):
    client, db, server = api_client_and_db
    _make_admin(db, email="for@example.com")
    token = _login(client, "for@example.com")
    headers = _auth(token)
    _setup_wizard_through_members(client, server, headers)

    sender = AsyncMock(return_value=True)
    with patch.object(server, "send_activation_email", sender):
        r = client.post(
            "/api/onboarding/send-invites",
            json={"member_ids": ["00000000-0000-0000-0000-000000000000"]},
            headers=headers,
        )
    body = r.json()
    assert body["sent_count"] == 0
    assert body["failed_count"] == 1
    assert body["failed"][0]["reason"] == "foreign_club"


def test_send_invites_reuses_valid_token(api_client_and_db):
    client, db, server = api_client_and_db
    _make_admin(db, email="reuse@example.com")
    token = _login(client, "reuse@example.com")
    headers = _auth(token)
    ctx = _setup_wizard_through_members(client, server, headers)

    coach_before = db.users.find_one({"id": ctx["coach"]["id"]})
    original_token = coach_before["invite_token"]
    # Make sure the expiry is still in the future (suppress_invite path sets it +7d).
    assert original_token

    sender = AsyncMock(return_value=True)
    with patch.object(server, "send_activation_email", sender):
        r = client.post(
            "/api/onboarding/send-invites",
            json={"member_ids": [ctx["coach"]["id"]]},
            headers=headers,
        )
    body = r.json()
    assert body["sent_count"] == 1
    assert body["sent"][0]["token_reused"] is True

    coach_after = db.users.find_one({"id": ctx["coach"]["id"]})
    assert coach_after["invite_token"] == original_token


def test_send_invites_rotates_expired_token(api_client_and_db):
    client, db, server = api_client_and_db
    _make_admin(db, email="exp@example.com")
    token = _login(client, "exp@example.com")
    headers = _auth(token)
    ctx = _setup_wizard_through_members(client, server, headers)

    # Force expiry into the past.
    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    db.users.update_one(
        {"id": ctx["coach"]["id"]},
        {"$set": {"invite_expires_at": past}},
    )
    original_token = db.users.find_one(
        {"id": ctx["coach"]["id"]}
    )["invite_token"]

    sender = AsyncMock(return_value=True)
    with patch.object(server, "send_activation_email", sender):
        r = client.post(
            "/api/onboarding/send-invites",
            json={"member_ids": [ctx["coach"]["id"]]},
            headers=headers,
        )
    body = r.json()
    assert body["sent_count"] == 1
    assert body["sent"][0]["token_reused"] is False

    coach_after = db.users.find_one({"id": ctx["coach"]["id"]})
    assert coach_after["invite_token"] != original_token


def test_send_invites_idempotent_repeat_does_not_error(api_client_and_db):
    """Second call with the same ids must not raise and must still report
    each member as sent (token gets re-used, send is called again)."""
    client, db, server = api_client_and_db
    _make_admin(db, email="idem@example.com")
    token = _login(client, "idem@example.com")
    headers = _auth(token)
    _setup_wizard_through_members(client, server, headers)

    sender = AsyncMock(return_value=True)
    with patch.object(server, "send_activation_email", sender):
        r1 = client.post(
            "/api/onboarding/send-invites", json={}, headers=headers
        )
        r2 = client.post(
            "/api/onboarding/send-invites", json={}, headers=headers
        )
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["sent_count"] == 2
    assert r2.json()["sent_count"] == 2
    # Second pass should reuse tokens.
    assert all(row["token_reused"] for row in r2.json()["sent"])


def test_send_invites_dry_run_flag_false_in_production(api_client_and_db, monkeypatch):
    client, db, server = api_client_and_db
    _make_admin(db, email="prod@example.com")
    token = _login(client, "prod@example.com")
    headers = _auth(token)
    _setup_wizard_through_members(client, server, headers)

    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("RESEND_API_KEY", "dummy-key")

    sender = AsyncMock(return_value=True)
    with patch.object(server, "send_activation_email", sender):
        r = client.post(
            "/api/onboarding/send-invites", json={}, headers=headers
        )
    assert r.json()["dry_run"] is False
