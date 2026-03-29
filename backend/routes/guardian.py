# Guardian Routes - API endpoints for parent/guardian users
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict

router = APIRouter(prefix="/guardian", tags=["Guardian"])

# Note: These routes are currently implemented in server.py
# This file serves as a template for future refactoring
# 
# Endpoints to migrate:
# - GET /guardian/children
# - GET /guardian/children/{child_id}/teams
#
# Dependencies needed:
# - get_current_user (auth)
# - db (database connection)
# - is_admin_role function
