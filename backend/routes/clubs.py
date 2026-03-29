# Clubs Routes - Club management endpoints
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict

router = APIRouter(prefix="/clubs", tags=["Clubs"])

# Note: These routes are currently implemented in server.py
# This file serves as a template for future refactoring
#
# Endpoints to migrate:
# - GET /clubs
# - POST /clubs
# - GET /clubs/{club_id}
# - PATCH /clubs/{club_id}
# - DELETE /clubs/{club_id}
# - POST /clubs/{club_id}/seasons
# - GET /clubs/{club_id}/seasons
#
# Dependencies needed:
# - get_current_user (auth)
# - is_admin_role function
# - db (database connection)
