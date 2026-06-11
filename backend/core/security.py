"""Security and authentication utilities."""
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
import jwt
import bcrypt
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# JWT Configuration
# Security: JWT_SECRET MUST be set in production. In development/testing only,
# an insecure fallback is used so the app can boot - never deploy this way.
import logging as _logging
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'development').lower()
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    if ENVIRONMENT == 'production':
        raise RuntimeError(
            "JWT_SECRET environment variable is required in production. "
            "Set JWT_SECRET to a strong random value (min 32 chars) before starting the app."
        )
    JWT_SECRET = 'dev-only-insecure-jwt-secret-change-me'
    _logging.getLogger(__name__).warning(
        "JWT_SECRET not set - using insecure development fallback. "
        "DO NOT use this in production. Set JWT_SECRET in backend/.env."
    )
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))


def create_jwt_token(user_id: str, email: str, role: str, club_id: Optional[str] = None, 
                     team_id: Optional[str] = None, active_profile_type: str = "admin") -> str:
    """Create a JWT token for the user."""
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "club_id": club_id,
        "team_id": team_id,
        "active_profile_type": active_profile_type,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt_token(token: str) -> Dict[str, Any]:
    """Decode a JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Get current user from JWT token."""
    payload = decode_jwt_token(credentials.credentials)
    return payload
