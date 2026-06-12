"""Tests for Phase O3 — Admin Onboarding Wizard: Teams + Members steps.

Covers the additive backend surface used by the wizard:
    * ``TeamCreate`` now accepts ``club_id`` so teams created during the
      wizard are linked to the club from onboarding_state.
    * ``MemberCreate`` accepts ``suppress_invite=True`` so the Members
      step can create members without firing activation emails (those are
      sent later by the Invitations step).
    * ``PATCH /api/onboarding/state`` already supports the ``teams`` and
      ``members`` step keys (added in O2's whitelist) and stores them in
      ``completed_steps`` idempotently.
"""
from __future__ import annotations

import os
import sys
import uuid
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

    test_db_name = f"stickpro_o3_test_{uuid.uuid4().hex[:8]}"
    monkeypatch.setenv("DB_NAME", test_db_name)
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("FRONTEND_URL", "https://app.stickpro.test")

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


def _make_admin(db, *, email="admin@example.com", password="o3pass"):
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": "O3 Admin",
        "is_activated": True,
        "hashed_password": hashed,
        "role": "admin",
        "club_id": "seed_club",
        "team_ids": [],
    }
    db.users.insert_one(doc)
    return doc


def _login(client, email, password="o3pass"):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _bootstrap_club_and_season(client, headers):
    club = client.post(
        "/api/clubs",
        json={"name": "Club O3", "acronym": "CO3", "country": "Portugal"},
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
    # Mirror onboarding_state as the wizard would after O2.
    client.patch(
        "/api/onboarding/state",
        json={
            "completed_step": "club",
            "club_id": club["id"],
            "current_step": 2,
        },
        headers=headers,
    )
    client.patch(
        "/api/onboarding/state",
        json={
            "completed_step": "season",
            "season_id": season["id"],
            "current_step": 3,
        },
        headers=headers,
    )
    return club, season


# ---------------------------------------------------------------------------
# POST /api/teams — accepts club_id
# ---------------------------------------------------------------------------


def test_team_create_persists_club_id(api_client_and_db):
    client, db, _server = api_client_and_db
    _make_admin(db, email="t1@example.com")
    token = _login(client, "t1@example.com")
    headers = _auth(token)
    club, season = _bootstrap_club_and_season(client, headers)

    r = client.post(
        "/api/teams",
        json={
            "name": "Seniores",
            "category": "Seniores",
            "season": season["name"],
            "club_id": club["id"],
        },
        headers=headers,
    )
    assert r.status_code == 200, r.text
    team = r.json()
    assert team["name"] == "Seniores"
    assert team["club_id"] == club["id"]
    assert team["season"] == "2026/2027"

    stored = db.teams.find_one({"id": team["id"]})
    assert stored["club_id"] == club["id"]


def test_team_create_without_club_id_keeps_none(api_client_and_db):
    """Backwards-compat: existing callers that don't pass club_id still work."""
    client, db, _server = api_client_and_db
    _make_admin(db, email="t2@example.com")
    token = _login(client, "t2@example.com")
    headers = _auth(token)

    r = client.post(
        "/api/teams",
        json={
            "name": "Sub-16",
            "category": "Sub-16",
            "season": "2026/2027",
        },
        headers=headers,
    )
    assert r.status_code == 200
    team = r.json()
    assert team.get("club_id") is None


# ---------------------------------------------------------------------------
# POST /api/members — suppress_invite flag
# ---------------------------------------------------------------------------


def test_member_create_default_dispatches_activation_email(api_client_and_db):
    client, db, server = api_client_and_db
    _make_admin(db, email="m1@example.com")
    token = _login(client, "m1@example.com")
    headers = _auth(token)
    _bootstrap_club_and_season(client, headers)

    # Patch the activation email helper as used inside server.py.
    sender = AsyncMock(return_value=True)
    with patch.object(server, "send_activation_email", sender):
        r = client.post(
            "/api/members",
            json={
                "name": "Coach Pereira",
                "email": "coach@example.com",
                "role": "treinador",
            },
            headers=headers,
        )
    assert r.status_code == 200, r.text
    sender.assert_awaited_once()


def test_member_create_with_suppress_invite_skips_email(api_client_and_db):
    client, db, server = api_client_and_db
    _make_admin(db, email="m2@example.com")
    token = _login(client, "m2@example.com")
    headers = _auth(token)
    _bootstrap_club_and_season(client, headers)

    sender = AsyncMock(return_value=True)
    with patch.object(server, "send_activation_email", sender):
        r = client.post(
            "/api/members",
            json={
                "name": "Player One",
                "email": "p1@example.com",
                "role": "jogador",
                "suppress_invite": True,
            },
            headers=headers,
        )
    assert r.status_code == 200, r.text
    body = r.json()
    sender.assert_not_awaited()
    # Token is still issued so the Invitations step can use it later.
    assert body.get("invite_token")
    stored = db.users.find_one({"email": "p1@example.com"})
    assert stored["invite_token"] == body["invite_token"]
    assert stored.get("is_activated") is False


def test_member_create_with_suppress_invite_attaches_team(api_client_and_db):
    """Players created with suppress_invite still land in the team's
    player_ids list — only the email is skipped."""
    client, db, server = api_client_and_db
    _make_admin(db, email="m3@example.com")
    token = _login(client, "m3@example.com")
    headers = _auth(token)
    _bootstrap_club_and_season(client, headers)

    # Create a team to attach to.
    team = client.post(
        "/api/teams",
        json={"name": "Seniores", "category": "Seniores", "season": "2026/2027"},
        headers=headers,
    ).json()

    sender = AsyncMock(return_value=True)
    with patch.object(server, "send_activation_email", sender):
        member = client.post(
            "/api/members",
            json={
                "name": "Player Two",
                "email": "p2@example.com",
                "role": "jogador",
                "team_id": team["id"],
                "suppress_invite": True,
            },
            headers=headers,
        ).json()

    sender.assert_not_awaited()
    stored_team = db.teams.find_one({"id": team["id"]})
    assert member["user"]["id"] in stored_team.get("player_ids", [])


# ---------------------------------------------------------------------------
# PATCH /api/onboarding/state — teams / members keys
# ---------------------------------------------------------------------------


def test_patch_state_accepts_teams_and_members_keys(api_client_and_db):
    client, db, _server = api_client_and_db
    _make_admin(db, email="s1@example.com")
    token = _login(client, "s1@example.com")
    headers = _auth(token)

    r1 = client.patch(
        "/api/onboarding/state",
        json={"completed_step": "teams", "current_step": 4},
        headers=headers,
    )
    assert r1.status_code == 200
    assert r1.json()["completed_steps"] == ["teams"]
    assert r1.json()["current_step"] == 4

    r2 = client.patch(
        "/api/onboarding/state",
        json={"completed_step": "members", "current_step": 5},
        headers=headers,
    )
    assert r2.status_code == 200
    assert r2.json()["completed_steps"] == ["teams", "members"]
    assert r2.json()["current_step"] == 5

    # Resume contract — a brand-new /status call must reflect the new state.
    status = client.get("/api/onboarding/status", headers=headers).json()
    assert status["current_step"] == 5
    assert status["completed_steps"] == ["teams", "members"]


def test_patch_state_teams_members_are_idempotent(api_client_and_db):
    client, db, _server = api_client_and_db
    _make_admin(db, email="s2@example.com")
    token = _login(client, "s2@example.com")
    headers = _auth(token)

    for _ in range(3):
        client.patch(
            "/api/onboarding/state",
            json={"completed_step": "teams"},
            headers=headers,
        )
    body = client.get("/api/onboarding/status", headers=headers).json()
    assert body["completed_steps"] == ["teams"]


# ---------------------------------------------------------------------------
# End-to-end wizard flow O1..O3
# ---------------------------------------------------------------------------


def test_full_o3_wizard_flow(api_client_and_db):
    client, db, server = api_client_and_db
    _make_admin(db, email="flow@example.com")
    token = _login(client, "flow@example.com")
    headers = _auth(token)
    club, season = _bootstrap_club_and_season(client, headers)

    # 1. Create a team with the wizard's payload shape.
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

    # 2. Persist Teams step completion → advance to Members (step 4).
    r = client.patch(
        "/api/onboarding/state",
        json={"completed_step": "teams", "current_step": 4},
        headers=headers,
    )
    assert r.json()["completed_steps"] == ["club", "season", "teams"]
    assert r.json()["current_step"] == 4

    # 3. Add a coach and a player with suppress_invite=True.
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
        ).json()
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
        ).json()
    sender.assert_not_awaited()  # no emails fired during onboarding

    # 4. Persist Members step → advance to Invitations (step 5).
    r = client.patch(
        "/api/onboarding/state",
        json={"completed_step": "members", "current_step": 5},
        headers=headers,
    )
    assert r.json()["completed_steps"] == ["club", "season", "teams", "members"]
    assert r.json()["current_step"] == 5

    # 5. Sanity-check final resume state.
    status = client.get("/api/onboarding/status", headers=headers).json()
    assert status["current_step"] == 5
    assert status["completed_steps"] == ["club", "season", "teams", "members"]
    assert status["club_id"] == club["id"]
    assert status["season_id"] == season["id"]
    assert status["completed"] is False  # Finish fires on Summary

    # 6. Team is linked to the club; coach & player landed in the team.
    stored_team = db.teams.find_one({"id": team["id"]})
    assert stored_team["club_id"] == club["id"]
    assert coach["user"]["id"] in stored_team["coach_ids"]
    assert player["user"]["id"] in stored_team["player_ids"]
