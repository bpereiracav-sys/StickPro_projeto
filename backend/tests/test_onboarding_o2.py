"""Tests for Phase O2 — Admin Onboarding Wizard: Club + Season steps.

Covers the persistence/resume surface added on top of O1:
    * ``GET   /api/onboarding/status`` now returns
      ``current_step`` / ``completed_steps`` / ``club_id`` / ``season_id``.
    * ``PATCH /api/onboarding/state`` merges per-step progress
      (idempotent, validates step keys, accepts club_id / season_id).
    * Existing ``POST /api/clubs`` + ``POST /api/clubs/{id}/seasons`` are
      exercised end-to-end through the wizard flow.
    * The new ``acronym`` field on Club round-trips.
"""
from __future__ import annotations

import os
import sys
import uuid
from pathlib import Path

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

    test_db_name = f"stickpro_o2_test_{uuid.uuid4().hex[:8]}"
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


def _make_user(db, *, email, role="admin", password="o2pass"):
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": "O2 Tester",
        "is_activated": True,
        "hashed_password": hashed,
        "role": role,
        "club_id": "test_club",
        "team_ids": [],
    }
    db.users.insert_one(doc)
    return doc


def _login(client, email, password="o2pass"):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# GET /api/onboarding/status — new fields
# ---------------------------------------------------------------------------


def test_status_fresh_admin_returns_default_state(api_client_and_db):
    client, db, _server = api_client_and_db
    _make_user(db, email="fresh@example.com", role="admin")
    token = _login(client, "fresh@example.com")

    r = client.get("/api/onboarding/status", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert body["completed"] is False
    assert body["completed_at"] is None
    assert body["current_step"] == 0
    assert body["completed_steps"] == []
    assert body["club_id"] is None
    assert body["season_id"] is None


def test_status_legacy_user_without_onboarding_state(api_client_and_db):
    """Users that predate O2 must still see a sane default state."""
    client, db, _server = api_client_and_db
    user = _make_user(db, email="legacy@example.com", role="admin")
    # Simulate a pre-O2 user by removing the field entirely.
    db.users.update_one(
        {"id": user["id"]}, {"$unset": {"onboarding_state": ""}}
    )
    token = _login(client, "legacy@example.com")

    r = client.get("/api/onboarding/status", headers=_auth(token))
    body = r.json()
    assert body["current_step"] == 0
    assert body["completed_steps"] == []


# ---------------------------------------------------------------------------
# PATCH /api/onboarding/state — RBAC, validation, merging
# ---------------------------------------------------------------------------


def test_patch_state_requires_auth(api_client_and_db):
    client, _db, _server = api_client_and_db
    r = client.patch("/api/onboarding/state", json={"current_step": 1})
    assert r.status_code in (401, 403)


def test_patch_state_rejects_non_admin(api_client_and_db):
    client, db, _server = api_client_and_db
    _make_user(db, email="coach@example.com", role="treinador")
    token = _login(client, "coach@example.com")
    r = client.patch(
        "/api/onboarding/state",
        json={"current_step": 1},
        headers=_auth(token),
    )
    assert r.status_code == 403


def test_patch_state_sets_current_step(api_client_and_db):
    client, db, _server = api_client_and_db
    user = _make_user(db, email="a1@example.com", role="admin")
    token = _login(client, "a1@example.com")

    r = client.patch(
        "/api/onboarding/state",
        json={"current_step": 2},
        headers=_auth(token),
    )
    assert r.status_code == 200
    assert r.json()["current_step"] == 2

    stored = db.users.find_one({"id": user["id"]})
    assert stored["onboarding_state"]["current_step"] == 2


def test_patch_state_appends_completed_step_idempotent(api_client_and_db):
    client, db, _server = api_client_and_db
    user = _make_user(db, email="a2@example.com", role="admin")
    token = _login(client, "a2@example.com")

    r1 = client.patch(
        "/api/onboarding/state",
        json={"completed_step": "club"},
        headers=_auth(token),
    )
    assert r1.status_code == 200
    assert r1.json()["completed_steps"] == ["club"]

    # Same step twice → still a single entry.
    r2 = client.patch(
        "/api/onboarding/state",
        json={"completed_step": "club"},
        headers=_auth(token),
    )
    assert r2.json()["completed_steps"] == ["club"]

    r3 = client.patch(
        "/api/onboarding/state",
        json={"completed_step": "season"},
        headers=_auth(token),
    )
    assert r3.json()["completed_steps"] == ["club", "season"]

    stored = db.users.find_one({"id": user["id"]})
    assert stored["onboarding_state"]["completed_steps"] == ["club", "season"]


def test_patch_state_rejects_unknown_step_key(api_client_and_db):
    client, db, _server = api_client_and_db
    _make_user(db, email="a3@example.com", role="admin")
    token = _login(client, "a3@example.com")

    r = client.patch(
        "/api/onboarding/state",
        json={"completed_step": "rocket_launch"},
        headers=_auth(token),
    )
    assert r.status_code == 400


def test_patch_state_rejects_negative_step(api_client_and_db):
    client, db, _server = api_client_and_db
    _make_user(db, email="a4@example.com", role="admin")
    token = _login(client, "a4@example.com")

    r = client.patch(
        "/api/onboarding/state",
        json={"current_step": -1},
        headers=_auth(token),
    )
    assert r.status_code == 400


def test_patch_state_stores_club_and_season_ids(api_client_and_db):
    client, db, _server = api_client_and_db
    user = _make_user(db, email="a5@example.com", role="admin")
    token = _login(client, "a5@example.com")

    r = client.patch(
        "/api/onboarding/state",
        json={"club_id": "club-uuid", "season_id": "season-uuid"},
        headers=_auth(token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["club_id"] == "club-uuid"
    assert body["season_id"] == "season-uuid"

    stored = db.users.find_one({"id": user["id"]})
    assert stored["onboarding_state"]["club_id"] == "club-uuid"
    assert stored["onboarding_state"]["season_id"] == "season-uuid"


def test_status_reflects_patched_state(api_client_and_db):
    client, db, _server = api_client_and_db
    _make_user(db, email="a6@example.com", role="admin")
    token = _login(client, "a6@example.com")

    client.patch(
        "/api/onboarding/state",
        json={
            "current_step": 3,
            "completed_step": "club",
            "club_id": "abc",
        },
        headers=_auth(token),
    )
    client.patch(
        "/api/onboarding/state",
        json={"completed_step": "season", "season_id": "xyz"},
        headers=_auth(token),
    )

    body = client.get(
        "/api/onboarding/status", headers=_auth(token)
    ).json()
    assert body["current_step"] == 3
    assert body["completed_steps"] == ["club", "season"]
    assert body["club_id"] == "abc"
    assert body["season_id"] == "xyz"


# ---------------------------------------------------------------------------
# End-to-end wizard flow using real club + season endpoints
# ---------------------------------------------------------------------------


def test_full_club_then_season_wizard_flow(api_client_and_db):
    client, db, _server = api_client_and_db
    _make_user(db, email="flow@example.com", role="admin")
    token = _login(client, "flow@example.com")
    headers = _auth(token)

    # 1. Create club via the real endpoint, with new acronym field.
    create_club = client.post(
        "/api/clubs",
        json={
            "name": "SL Benfica",
            "acronym": "SLB",
            "city": "Lisboa",
            "country": "Portugal",
            "logo_url": "https://example.com/logo.png",
        },
        headers=headers,
    )
    assert create_club.status_code == 200, create_club.text
    club = create_club.json()
    assert club["name"] == "SL Benfica"
    assert club["acronym"] == "SLB"
    assert club["city"] == "Lisboa"
    club_id = club["id"]

    # 2. Persist Club step completion.
    r = client.patch(
        "/api/onboarding/state",
        json={
            "completed_step": "club",
            "current_step": 2,
            "club_id": club_id,
        },
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["club_id"] == club_id

    # 3. Create season via the real endpoint.
    create_season = client.post(
        f"/api/clubs/{club_id}/seasons",
        json={
            "name": "2026/2027",
            "start_date": "2026-09-01",
            "end_date": "2027-06-30",
            "is_active": True,
        },
        headers=headers,
    )
    assert create_season.status_code == 200, create_season.text
    season = create_season.json()["season"]
    season_id = season["id"]
    assert season["is_active"] is True
    assert season["name"] == "2026/2027"

    # 4. Persist Season step completion and advance to Teams (step 3).
    r = client.patch(
        "/api/onboarding/state",
        json={
            "completed_step": "season",
            "current_step": 3,
            "season_id": season_id,
        },
        headers=headers,
    )
    body = r.json()
    assert body["completed_steps"] == ["club", "season"]
    assert body["current_step"] == 3
    assert body["season_id"] == season_id

    # 5. A fresh status call should report the resume point.
    status = client.get("/api/onboarding/status", headers=headers).json()
    assert status["current_step"] == 3
    assert status["completed_steps"] == ["club", "season"]
    assert status["club_id"] == club_id
    assert status["season_id"] == season_id
    # Not finished — Finish only fires on Summary step.
    assert status["completed"] is False
