"""Tests for Phase O1 — Admin Onboarding Wizard (shell + routing).

Covers the two new endpoints:
    * ``GET  /api/onboarding/status``
    * ``POST /api/onboarding/complete``

Both must be admin-only (admin / gestor_desportivo), idempotent, and must
surface ``onboarding_completed_at`` through ``/api/auth/me`` so the frontend
can route on first login without an extra round trip.
"""
from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import bcrypt
import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


# ---------------------------------------------------------------------------
# Fixtures — isolated Mongo + FastAPI TestClient
# ---------------------------------------------------------------------------


@pytest.fixture
def api_client_and_db(monkeypatch):
    import pymongo

    test_db_name = f"stickpro_o1_test_{uuid.uuid4().hex[:8]}"
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


def _make_user(db, *, email, role="admin", password="onboardpass",
               onboarding_completed_at=None):
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": "Onboard Tester",
        "is_activated": True,
        "hashed_password": hashed,
        "role": role,
        "club_id": "test_club",
        "team_ids": [],
    }
    if onboarding_completed_at is not None:
        doc["onboarding_completed_at"] = onboarding_completed_at
    db.users.insert_one(doc)
    return doc


def _login(client, email, password="onboardpass"):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# GET /api/onboarding/status
# ---------------------------------------------------------------------------


def test_status_requires_authentication(api_client_and_db):
    client, _db, _server = api_client_and_db
    r = client.get("/api/onboarding/status")
    # No Authorization header → FastAPI HTTPBearer returns 403
    assert r.status_code in (401, 403)


def test_status_rejects_non_admin_role(api_client_and_db):
    client, db, _server = api_client_and_db
    _make_user(db, email="player@example.com", role="jogador")
    token = _login(client, "player@example.com")
    r = client.get("/api/onboarding/status", headers=_auth(token))
    assert r.status_code == 403


def test_status_returns_false_for_fresh_admin(api_client_and_db):
    client, db, _server = api_client_and_db
    _make_user(db, email="admin@example.com", role="admin")
    token = _login(client, "admin@example.com")
    r = client.get("/api/onboarding/status", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert body == {"completed": False, "completed_at": None}


def test_status_returns_true_for_completed_admin(api_client_and_db):
    client, db, _server = api_client_and_db
    iso = datetime.now(timezone.utc).isoformat()
    _make_user(
        db,
        email="done@example.com",
        role="gestor_desportivo",
        onboarding_completed_at=iso,
    )
    token = _login(client, "done@example.com")
    r = client.get("/api/onboarding/status", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert body["completed"] is True
    assert body["completed_at"] == iso


# ---------------------------------------------------------------------------
# POST /api/onboarding/complete
# ---------------------------------------------------------------------------


def test_complete_requires_authentication(api_client_and_db):
    client, _db, _server = api_client_and_db
    r = client.post("/api/onboarding/complete")
    assert r.status_code in (401, 403)


def test_complete_rejects_non_admin_role(api_client_and_db):
    client, db, _server = api_client_and_db
    _make_user(db, email="coach@example.com", role="treinador")
    token = _login(client, "coach@example.com")
    r = client.post("/api/onboarding/complete", headers=_auth(token))
    assert r.status_code == 403


def test_complete_marks_admin_and_persists(api_client_and_db):
    client, db, _server = api_client_and_db
    user = _make_user(db, email="firstrun@example.com", role="admin")
    token = _login(client, "firstrun@example.com")

    r = client.post("/api/onboarding/complete", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert body["completed"] is True
    assert body["completed_at"]
    # ISO 8601 with timezone
    parsed = datetime.fromisoformat(body["completed_at"])
    assert parsed.tzinfo is not None

    stored = db.users.find_one({"id": user["id"]})
    assert stored.get("onboarding_completed_at") == body["completed_at"]


def test_complete_is_idempotent(api_client_and_db):
    """Second call must not overwrite the original timestamp."""
    client, db, _server = api_client_and_db
    _make_user(db, email="twice@example.com", role="admin")
    token = _login(client, "twice@example.com")

    first = client.post("/api/onboarding/complete", headers=_auth(token))
    assert first.status_code == 200
    first_ts = first.json()["completed_at"]

    second = client.post("/api/onboarding/complete", headers=_auth(token))
    assert second.status_code == 200
    second_ts = second.json()["completed_at"]
    assert first_ts == second_ts


def test_complete_then_status_round_trip(api_client_and_db):
    client, db, _server = api_client_and_db
    _make_user(db, email="rt@example.com", role="admin")
    token = _login(client, "rt@example.com")

    pre = client.get("/api/onboarding/status", headers=_auth(token)).json()
    assert pre["completed"] is False

    client.post("/api/onboarding/complete", headers=_auth(token))

    post = client.get("/api/onboarding/status", headers=_auth(token)).json()
    assert post["completed"] is True
    assert post["completed_at"]


# ---------------------------------------------------------------------------
# /api/auth/me must expose onboarding_completed_at
# ---------------------------------------------------------------------------


def test_auth_me_exposes_onboarding_completed_at_null(api_client_and_db):
    client, db, _server = api_client_and_db
    _make_user(db, email="me1@example.com", role="admin")
    token = _login(client, "me1@example.com")
    r = client.get("/api/auth/me", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert "onboarding_completed_at" in body
    assert body["onboarding_completed_at"] is None


def test_auth_me_exposes_onboarding_completed_at_set(api_client_and_db):
    client, db, _server = api_client_and_db
    iso = datetime.now(timezone.utc).isoformat()
    _make_user(
        db, email="me2@example.com", role="admin", onboarding_completed_at=iso
    )
    token = _login(client, "me2@example.com")
    r = client.get("/api/auth/me", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert body["onboarding_completed_at"] == iso
