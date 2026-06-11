"""Regression test for the POST /api/members ObjectId serialization bug.

Bug:
    motor.AsyncIOMotorCollection.insert_one() mutates its input dict and adds
    `_id` (a BSON ObjectId) to it. The original POST /api/members handler then
    returned a `safe_user` dict that excluded "hashed_password" but kept "_id".
    FastAPI's JSON encoder cannot serialize ObjectId, causing the entire
    endpoint to return HTTP 500.

Fix:
    Exclude "_id" from the response dict alongside "hashed_password".

This test exercises the endpoint end-to-end through FastAPI's TestClient
against an isolated MongoDB and asserts:
    * The endpoint returns HTTP 200 (not 500).
    * The response body is valid JSON.
    * The response NEVER contains an _id field, an ObjectId or "_id" key
      anywhere in the user document.
    * The hashed_password is also not leaked.
"""
from __future__ import annotations

import asyncio
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


def _success_email_result():
    """Helper: a stand-in EmailResult so the dispatch path doesn't try Resend."""
    from services.emails import EmailResult

    return EmailResult(success=True, message_id="dryrun-test", attempts=1)


@pytest.fixture
def api_client_and_db(monkeypatch):
    """Spin up the FastAPI app with a unique temp Mongo database."""
    import pymongo

    test_db_name = f"stickpro_hotfix_test_{uuid.uuid4().hex[:8]}"
    monkeypatch.setenv("DB_NAME", test_db_name)
    monkeypatch.setenv("FRONTEND_URL", "https://app.stickpro.test")
    monkeypatch.setenv("ENVIRONMENT", "development")
    # Force a fresh server import bound to the temp DB.
    for mod in list(sys.modules):
        if mod.startswith("server") or mod.startswith("services"):
            del sys.modules[mod]
    import importlib
    server = importlib.import_module("server")
    from fastapi.testclient import TestClient

    # Stub the email send so the test doesn't depend on Resend at all.
    sender = AsyncMock(return_value=_success_email_result())
    monkeypatch.setattr(
        sys.modules["services.activation_emails"], "send_email", sender
    )

    sync_client = pymongo.MongoClient(os.environ["MONGO_URL"])
    sync_db = sync_client[test_db_name]

    with TestClient(server.app) as client:
        try:
            yield client, sync_db
        finally:
            try:
                sync_client.drop_database(test_db_name)
            finally:
                sync_client.close()


def _seed_admin(db) -> tuple[str, str, str]:
    """Insert an activated admin user and a club; return (token, admin_id, club_id)."""
    admin_id = str(uuid.uuid4())
    club_id = str(uuid.uuid4())
    pwd = "AdminHotfix123!"
    db.clubs.insert_one(
        {
            "id": club_id,
            "name": "Hotfix Club",
            "owner_id": admin_id,
            "active_season": "2025-2026",
            "branding": {},
            "settings": {},
        }
    )
    db.users.insert_one(
        {
            "id": admin_id,
            "email": "hotfix-admin@stickpro.app",
            "name": "Hotfix Admin",
            "is_activated": True,
            "role": "admin",
            "club_id": club_id,
            "hashed_password": bcrypt.hashpw(
                pwd.encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8"),
            "team_ids": [],
            "linked_player_ids": [],
        }
    )
    return pwd, admin_id, club_id


def test_post_members_does_not_leak_objectid(api_client_and_db):
    client, db = api_client_and_db
    pwd, _admin_id, _club_id = _seed_admin(db)

    # Authenticate as the admin.
    login = client.post(
        "/api/auth/login",
        json={"email": "hotfix-admin@stickpro.app", "password": pwd},
    )
    assert login.status_code == 200, login.text
    token = login.json()["token"]

    # Create a member — this is the endpoint under test.
    member_email = f"hotfix-{uuid.uuid4().hex[:8]}@stickpro.app"
    r = client.post(
        "/api/members",
        json={"name": "Hotfix Player", "email": member_email, "role": "jogador"},
        headers={"Authorization": f"Bearer {token}"},
    )
    # PRIMARY ASSERTION: no 500 from ObjectId leak.
    assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text!r}"

    # Response must be JSON.
    body = r.json()
    assert "user" in body, body
    user = body["user"]

    # The bug specifically manifested as an _id key (bson.ObjectId) in user.
    assert "_id" not in user, f"_id leaked into response: {user!r}"
    # The handler must also continue to strip hashed_password (pre-existing
    # contract — keep verifying it).
    assert "hashed_password" not in user

    # Sanity-check the expected shape.
    assert user["email"] == member_email
    assert user["is_activated"] is False
    assert body["activation_link"].endswith(
        f"/activate-account?token={body['invite_token']}"
    )


def test_post_members_response_is_fully_json_serializable(api_client_and_db):
    """A second-order guard: regardless of which keys are present, the whole
    response must round-trip through json (it would not if an ObjectId were
    still embedded somewhere)."""
    import json

    client, db = api_client_and_db
    pwd, _admin_id, _club_id = _seed_admin(db)
    token = client.post(
        "/api/auth/login",
        json={"email": "hotfix-admin@stickpro.app", "password": pwd},
    ).json()["token"]

    r = client.post(
        "/api/members",
        json={
            "name": "Round Trip",
            "email": f"hotfix-rt-{uuid.uuid4().hex[:8]}@stickpro.app",
            "role": "jogador",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    # Re-serialize the parsed body — if anything in the dict is non-serializable
    # (ObjectId, datetime instances, …) this would raise.
    json.dumps(r.json())
