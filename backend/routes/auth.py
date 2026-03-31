"""Authentication routes for Stick Pro."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
import jwt
import bcrypt
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# Database connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'roller-hockey-hub-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

# Router
router = APIRouter(prefix="/auth", tags=["Authentication"])


# ==================== MODELS ====================

class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "jogador"
    phone: Optional[str] = None
    additional_roles: List[str] = []


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    additional_roles: List[str] = []
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    team_ids: List[str] = []
    associated_accounts: List[str] = []


# ==================== UTILITY FUNCTIONS ====================

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_token(user_id: str, email: str, role: str) -> str:
    """Create a JWT token."""
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current user from JWT token."""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utilizador não encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


def get_role_name_pt(role: str) -> str:
    """Get Portuguese role name."""
    roles = {
        "admin": "Administrador",
        "gestor_desportivo": "Gestor Desportivo",
        "treinador": "Treinador",
        "treinador_adjunto": "Treinador Adjunto",
        "delegado": "Delegado",
        "jogador": "Jogador",
        "responsavel": "Responsável"
    }
    return roles.get(role, role)


async def build_available_profiles(user: dict) -> List[dict]:
    """Build list of all profiles a user can access."""
    profiles = []
    
    # Own profile with all roles
    all_roles = [user['role']] + user.get('additional_roles', [])
    for role in all_roles:
        # Get teams for this role
        user_teams = []
        for team_id in user.get('team_ids', []):
            team = await db.teams.find_one({"id": team_id}, {"_id": 0})
            if team:
                user_teams.append(team)
        
        profiles.append({
            "type": "self",
            "user_id": user['id'],
            "user_name": user['name'],
            "role": role,
            "label": f"{user['name']} ({get_role_name_pt(role)})",
            "teams": user_teams
        })
    
    # Associated accounts (e.g., children)
    for assoc_id in user.get('associated_accounts', []):
        assoc_user = await db.users.find_one({"id": assoc_id}, {"_id": 0, "password": 0})
        if assoc_user:
            assoc_teams = []
            for team_id in assoc_user.get('team_ids', []):
                team = await db.teams.find_one({"id": team_id}, {"_id": 0})
                if team:
                    assoc_teams.append(team)
            
            profiles.append({
                "type": "associated",
                "user_id": assoc_user['id'],
                "user_name": assoc_user['name'],
                "role": "responsavel",
                "label": f"Responsável de {assoc_user['name']}",
                "teams": assoc_teams
            })
    
    return profiles


# ==================== ROUTES ====================

# Note: These routes are documented but the actual implementation
# remains in server.py to avoid breaking changes during migration.
# To complete migration, uncomment routes and update server.py imports.

# @router.post("/register")
# async def register(user_data: UserCreate):
#     """Register a new user."""
#     pass

# @router.post("/login")
# async def login(credentials: UserLogin):
#     """Login and get JWT token."""
#     pass

# @router.get("/me")
# async def get_me(current_user: dict = Depends(get_current_user)):
#     """Get current user info."""
#     pass

# @router.get("/permissions")
# async def get_my_permissions(current_user: dict = Depends(get_current_user)):
#     """Get current user's permissions."""
#     pass

# @router.get("/profiles")
# async def get_my_profiles(current_user: dict = Depends(get_current_user)):
#     """Get all available profiles for the current user."""
#     pass
