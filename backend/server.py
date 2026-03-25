from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Literal, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import base64
import shutil
import httpx
from bs4 import BeautifulSoup
import re

ROOT_DIR = Path(__file__).parent
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'roller-hockey-hub-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Roller Hockey Hub API")

# Mount uploads folder for static files
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

UserRole = Literal["admin", "treinador", "treinador_adjunto", "delegado", "jogador", "responsavel"]
EventType = Literal["treino", "jogo_campeonato", "jogo_amigavel", "torneio", "outro"]
AttendanceStatus = Literal["confirmado", "ausente", "pendente"]
MatchLocation = Literal["casa", "fora", "neutro"]
PlayerPosition = Literal["GR", "JC"]
ChampionshipFormat = Literal["5x5", "3x3"]
ConvocationType = Literal["automatica", "manual"]
EquipmentSize = str  # Free text: S/M/L/XL or 8/10/12 etc

# ==================== PERMISSION SYSTEM ====================

# Default permissions by role
DEFAULT_PERMISSIONS = {
    "admin": {
        "can_view_all": True,
        "can_edit_all": True,
        "can_manage_permissions": True,
        "can_view_family_data": True,
        "can_edit_family_data": True,
        "can_manage_teams": True,
        "can_manage_championships": True,
        "can_manage_events": True,
        "can_manage_members": True,
    },
    "treinador": {
        "can_view_all": False,
        "can_edit_all": False,
        "can_manage_permissions": False,
        "can_view_family_data": False,
        "can_edit_family_data": False,
        "can_manage_teams": True,
        "can_manage_championships": True,
        "can_manage_events": True,
        "can_manage_members": True,
    },
    "treinador_adjunto": {
        "can_view_all": False,
        "can_edit_all": False,
        "can_manage_permissions": False,
        "can_view_family_data": False,
        "can_edit_family_data": False,
        "can_manage_teams": True,
        "can_manage_championships": True,
        "can_manage_events": True,
        "can_manage_members": True,
    },
    "delegado": {
        "can_view_all": False,
        "can_edit_all": False,
        "can_manage_permissions": False,
        "can_view_family_data": False,
        "can_edit_family_data": False,
        "can_manage_teams": True,
        "can_manage_championships": True,
        "can_manage_events": True,
        "can_manage_members": True,
    },
    "jogador": {
        "can_view_all": False,
        "can_edit_all": False,
        "can_manage_permissions": False,
        "can_view_family_data": False,
        "can_edit_family_data": False,
        "can_manage_teams": False,
        "can_manage_championships": False,
        "can_manage_events": False,
        "can_manage_members": False,
        "can_edit_own_profile": True,
    },
    "responsavel": {
        "can_view_all": False,
        "can_edit_all": False,
        "can_manage_permissions": False,
        "can_view_family_data": True,
        "can_edit_family_data": True,
        "can_manage_teams": False,
        "can_manage_championships": False,
        "can_manage_events": False,
        "can_manage_members": False,
    }
}

class Permissions(BaseModel):
    can_view_all: bool = False
    can_edit_all: bool = False
    can_manage_permissions: bool = False
    can_view_family_data: bool = False
    can_edit_family_data: bool = False
    can_manage_teams: bool = False
    can_manage_championships: bool = False
    can_manage_events: bool = False
    can_manage_members: bool = False
    can_edit_own_profile: bool = True

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    surname: Optional[str] = None
    role: UserRole = "jogador"
    phone: Optional[str] = None
    additional_roles: List[UserRole] = []

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Family member model
class FamilyMember(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    first_name: str
    surname: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    relationship: str = "pai"  # pai, mae, outro

# Extended User Profile
class UserProfile(BaseModel):
    # Identity
    photo_url: Optional[str] = None
    first_name: Optional[str] = None
    surname: Optional[str] = None
    nickname: Optional[str] = None
    birth_date: Optional[str] = None  # ISO date string
    fpp_license: Optional[str] = None  # Federação Portuguesa de Patinagem
    
    # Family members
    family_members: List[FamilyMember] = []
    
    # Biometric data
    weight: Optional[float] = None  # kg
    height: Optional[float] = None  # cm
    shoe_size: Optional[str] = None  # Free text
    
    # Sports info
    year_joined_club: Optional[int] = None
    fpp_number: Optional[str] = None
    function: Optional[UserRole] = None  # jogador, treinador, etc
    position: Optional[PlayerPosition] = None  # GR/JC
    jersey_number: Optional[int] = None
    
    # Equipment sizes (free text)
    training_kit_size: Optional[str] = None
    tracksuit_size: Optional[str] = None
    polo_size: Optional[str] = None
    training_sock_size: Optional[str] = None

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    surname: Optional[str] = None
    role: UserRole  # Primary role
    additional_roles: List[UserRole] = []
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    team_ids: List[str] = []
    associated_accounts: List[str] = []
    parent_account_id: Optional[str] = None
    
    # Extended profile data
    profile: Optional[UserProfile] = None
    
    # Custom permissions (if admin has modified defaults)
    custom_permissions: Optional[Dict[str, bool]] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    surname: Optional[str] = None
    role: UserRole
    additional_roles: List[UserRole] = []
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    team_ids: List[str] = []
    associated_accounts: List[str] = []
    parent_account_id: Optional[str] = None
    profile: Optional[UserProfile] = None
    permissions: Optional[Dict[str, bool]] = None

class AssociateAccountRequest(BaseModel):
    child_user_id: str
    relationship: str = "filho/a"  # filho/a, atleta, etc.

class ActiveProfileRequest(BaseModel):
    profile_type: str  # "self" or "associated"
    associated_user_id: Optional[str] = None  # If viewing as associated account
    active_role: Optional[UserRole] = None  # Which role to use
    team_id: Optional[str] = None  # Which team context

class AuthResponse(BaseModel):
    token: str
    user: UserResponse
    available_profiles: List[dict] = []  # List of profiles user can access

class TeamCreate(BaseModel):
    name: str
    category: str
    season: str

class Team(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    season: str
    coach_ids: List[str] = []
    assistant_coach_ids: List[str] = []  # Treinador adjunto
    delegate_ids: List[str] = []
    player_ids: List[str] = []
    club_id: Optional[str] = None  # Reference to club
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Club Model
class ClubCreate(BaseModel):
    name: str
    logo_url: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: str = "Portugal"
    founded_year: Optional[int] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class Club(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    logo_url: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: str = "Portugal"
    founded_year: Optional[int] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    admin_ids: List[str] = []  # Users with admin access to this club
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Championship Models
class ChampionshipCreate(BaseModel):
    name: str
    season: str
    team_id: str
    description: Optional[str] = None
    format: ChampionshipFormat = "5x5"
    location: Optional[str] = None
    convocation_type: ConvocationType = "manual"

class Championship(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    season: str
    team_id: str
    description: Optional[str] = None
    format: ChampionshipFormat = "5x5"
    location: Optional[str] = None
    convocation_type: ConvocationType = "manual"
    participating_teams: List[str] = []
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChampionshipMatchCreate(BaseModel):
    championship_id: str
    opponent_team: str
    match_date: datetime
    location: MatchLocation
    venue: Optional[str] = None

class ChampionshipMatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    championship_id: str
    team_id: str
    opponent_team: str
    match_date: datetime
    location: MatchLocation
    venue: Optional[str] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    is_completed: bool = False
    bonus_points: int = 0
    penalty_points: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MatchResultUpdate(BaseModel):
    home_score: int
    away_score: int
    bonus_points: int = 0
    penalty_points: int = 0

# Player Match Stats - comprehensive stats per match
class PlayerMatchStatsCreate(BaseModel):
    match_id: str
    player_id: str
    position: PlayerPosition
    minutes_played: int = 0
    goals: int = 0
    assists: int = 0
    penalties_scored: int = 0
    penalties_missed: int = 0
    penalties_saved: int = 0
    penalties_conceded: int = 0
    free_kicks_scored: int = 0
    free_kicks_missed: int = 0
    free_kicks_saved: int = 0
    free_kicks_conceded: int = 0
    saves: int = 0
    blue_cards: int = 0
    yellow_cards: int = 0
    white_cards: int = 0
    red_cards: int = 0

class PlayerMatchStats(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    match_id: str
    player_id: str
    team_id: str
    championship_id: str
    position: PlayerPosition
    minutes_played: int = 0
    goals: int = 0
    assists: int = 0
    penalties_scored: int = 0
    penalties_missed: int = 0
    penalties_saved: int = 0
    penalties_conceded: int = 0
    free_kicks_scored: int = 0
    free_kicks_missed: int = 0
    free_kicks_saved: int = 0
    free_kicks_conceded: int = 0
    saves: int = 0
    blue_cards: int = 0
    yellow_cards: int = 0
    white_cards: int = 0
    red_cards: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Event Models
class EventCreate(BaseModel):
    team_id: str
    event_type: EventType
    title: str
    description: Optional[str] = None
    location: str
    start_time: datetime
    end_time: Optional[datetime] = None
    opponent: Optional[str] = None
    championship_id: Optional[str] = None
    status: Optional[str] = "scheduled"  # scheduled, postponed, cancelled

class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    team_id: str
    event_type: EventType
    title: str
    description: Optional[str] = None
    location: str
    start_time: datetime
    end_time: Optional[datetime] = None
    opponent: Optional[str] = None
    championship_id: Optional[str] = None
    championship_match_id: Optional[str] = None
    status: str = "scheduled"  # scheduled, postponed, cancelled
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Attendance Models
class Attendance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    convocation_id: Optional[str] = None
    player_id: str
    team_id: str
    event_type: str
    championship_id: Optional[str] = None
    status: AttendanceStatus = "pendente"
    reason: Optional[str] = None
    event_date: datetime
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AttendanceUpdate(BaseModel):
    status: AttendanceStatus
    reason: Optional[str] = None

# Convocation Models
class ConvocationCreate(BaseModel):
    event_id: str
    player_ids: List[str]
    message: Optional[str] = None

class Convocation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    player_ids: List[str]
    message: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Message Models with attachments
class MessageCreate(BaseModel):
    team_id: str
    content: str
    recipient_ids: List[str] = []  # Empty = all team members
    attachment_name: Optional[str] = None
    attachment_data: Optional[str] = None  # Base64 encoded

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    team_id: str
    sender_id: str
    sender_name: str
    content: str
    recipient_ids: List[str] = []
    attachment_name: Optional[str] = None
    attachment_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
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

# ==================== EMAIL MOCK ====================

async def send_email_notification(to_email: str, subject: str, html_content: str, attachment_name: str = None, attachment_data: bytes = None):
    """MOCK: Email sending - configure Resend API key to enable"""
    logger.info(f"[MOCK EMAIL] To: {to_email}, Subject: {subject}")
    return True

# ==================== AUTH ROUTES ====================

async def build_available_profiles(user: dict) -> List[dict]:
    """Build list of all profiles a user can access"""
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
            "label": f"{user['name']} ({getRoleNamePt(role)})",
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

def getRoleNamePt(role: str) -> str:
    roles = {
        "admin": "Administrador",
        "treinador": "Treinador",
        "delegado": "Delegado",
        "jogador": "Jogador",
        "responsavel": "Responsável"
    }
    return roles.get(role, role)

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já registado")
    
    user = User(
        email=user_data.email, 
        name=user_data.name, 
        role=user_data.role, 
        phone=user_data.phone,
        additional_roles=user_data.additional_roles
    )
    user_dict = user.model_dump()
    user_dict['password'] = hash_password(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    token = create_token(user.id, user.email, user.role)
    
    profiles = await build_available_profiles(user_dict)
    
    return {
        "token": token,
        "user": UserResponse(**user.model_dump()).model_dump(),
        "available_profiles": profiles
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    token = create_token(user['id'], user['email'], user['role'])
    profiles = await build_available_profiles(user)
    
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "name": user['name'],
            "role": user['role'],
            "additional_roles": user.get('additional_roles', []),
            "phone": user.get('phone'),
            "avatar_url": user.get('avatar_url'),
            "team_ids": user.get('team_ids', []),
            "associated_accounts": user.get('associated_accounts', [])
        },
        "available_profiles": profiles
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    profiles = await build_available_profiles(current_user)
    return {
        **UserResponse(**current_user).model_dump(),
        "available_profiles": profiles
    }

@api_router.get("/auth/profiles")
async def get_my_profiles(current_user: dict = Depends(get_current_user)):
    """Get all available profiles for the current user"""
    return await build_available_profiles(current_user)

# ==================== USER ROUTES ====================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(role: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if role:
        query["role"] = role
    users = await db.users.find(query, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

# ==================== ASSOCIATED ACCOUNTS ROUTES ====================
# NOTE: These routes MUST be defined BEFORE /users/{user_id} to avoid route conflicts

@api_router.get("/users/associated")
async def get_associated_accounts(current_user: dict = Depends(get_current_user)):
    """Get all accounts associated with the current user (children/athletes)"""
    associated_ids = current_user.get('associated_accounts', [])
    
    if not associated_ids:
        return []
    
    associated_users = await db.users.find(
        {"id": {"$in": associated_ids}}, 
        {"_id": 0, "password": 0}
    ).to_list(100)
    
    # Add relationship info
    for user in associated_users:
        user['relationship'] = 'filho/a'
    
    return associated_users

@api_router.post("/users/associate")
async def associate_account(request: AssociateAccountRequest, current_user: dict = Depends(get_current_user)):
    """Associate a child/athlete account with the current user (parent/guardian)"""
    
    child = await db.users.find_one({"id": request.child_user_id}, {"_id": 0})
    if not child:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    if request.child_user_id in current_user.get('associated_accounts', []):
        raise HTTPException(status_code=400, detail="Conta já está associada")
    
    if child.get('parent_account_id'):
        raise HTTPException(status_code=400, detail="Esta conta já tem um responsável associado")
    
    await db.users.update_one(
        {"id": current_user['id']},
        {"$addToSet": {"associated_accounts": request.child_user_id}}
    )
    
    await db.users.update_one(
        {"id": request.child_user_id},
        {"$set": {"parent_account_id": current_user['id']}}
    )
    
    return {"message": f"Conta de {child['name']} associada com sucesso", "child": child}

@api_router.post("/users/associate/search")
async def search_user_to_associate(email: str, current_user: dict = Depends(get_current_user)):
    """Search for a user by email to associate"""
    user = await db.users.find_one({"email": email}, {"_id": 0, "password": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado com este email")
    
    if user['id'] == current_user['id']:
        raise HTTPException(status_code=400, detail="Não pode associar a sua própria conta")
    
    if user['id'] in current_user.get('associated_accounts', []):
        raise HTTPException(status_code=400, detail="Esta conta já está associada")
    
    if user.get('parent_account_id'):
        raise HTTPException(status_code=400, detail="Esta conta já tem um responsável")
    
    return {
        "id": user['id'],
        "name": user['name'],
        "email": user['email'],
        "role": user['role'],
        "team_ids": user.get('team_ids', [])
    }

@api_router.delete("/users/associate/{child_id}")
async def remove_association(child_id: str, current_user: dict = Depends(get_current_user)):
    """Remove association with a child account"""
    
    if child_id not in current_user.get('associated_accounts', []):
        raise HTTPException(status_code=404, detail="Associação não encontrada")
    
    await db.users.update_one(
        {"id": current_user['id']},
        {"$pull": {"associated_accounts": child_id}}
    )
    
    await db.users.update_one(
        {"id": child_id},
        {"$set": {"parent_account_id": None}}
    )
    
    return {"message": "Associação removida com sucesso"}

@api_router.post("/auth/switch-profile")
async def switch_profile(request: ActiveProfileRequest, current_user: dict = Depends(get_current_user)):
    """Switch to a different profile (self or associated account)"""
    
    if request.profile_type == "self":
        target_user = current_user
        active_role = request.active_role or current_user['role']
    elif request.profile_type == "associated":
        if not request.associated_user_id:
            raise HTTPException(status_code=400, detail="ID da conta associada é obrigatório")
        
        if request.associated_user_id not in current_user.get('associated_accounts', []):
            raise HTTPException(status_code=403, detail="Conta não está associada a si")
        
        target_user = await db.users.find_one({"id": request.associated_user_id}, {"_id": 0, "password": 0})
        if not target_user:
            raise HTTPException(status_code=404, detail="Conta associada não encontrada")
        
        active_role = "responsavel"
    else:
        raise HTTPException(status_code=400, detail="Tipo de perfil inválido")
    
    teams = []
    for team_id in target_user.get('team_ids', []):
        team = await db.teams.find_one({"id": team_id}, {"_id": 0})
        if team:
            teams.append(team)
    
    return {
        "profile_type": request.profile_type,
        "viewing_as": {
            "id": target_user['id'],
            "name": target_user['name'],
            "role": active_role,
            "teams": teams
        },
        "original_user": {
            "id": current_user['id'],
            "name": current_user['name']
        }
    }

# ==================== USER BY ID ROUTES ====================

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    return UserResponse(**user)

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    if current_user['id'] != user_id and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    # Check if user has permission to edit this data
    user_permissions = get_user_permissions(current_user)
    
    allowed_fields = ['name', 'surname', 'phone', 'avatar_url']
    
    # Handle profile updates
    if 'profile' in updates:
        profile_data = updates.pop('profile')
        
        # Filter family data based on permissions
        if 'family_members' in profile_data:
            if not user_permissions.get('can_edit_family_data', False) and current_user['id'] != user_id:
                del profile_data['family_members']
        
        # Update profile in database
        if profile_data:
            await db.users.update_one(
                {"id": user_id},
                {"$set": {f"profile.{k}": v for k, v in profile_data.items()}}
            )
    
    # Filter basic fields
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if filtered_updates:
        await db.users.update_one({"id": user_id}, {"$set": filtered_updates})
    
    return {"message": "Utilizador atualizado"}

def get_user_permissions(user: dict) -> dict:
    """Get effective permissions for a user"""
    role = user.get('role', 'jogador')
    base_permissions = DEFAULT_PERMISSIONS.get(role, DEFAULT_PERMISSIONS['jogador']).copy()
    
    # Apply custom permissions if set
    custom = user.get('custom_permissions', {})
    if custom:
        base_permissions.update(custom)
    
    return base_permissions

# ==================== CLUB ROUTES ====================

@api_router.post("/clubs")
async def create_club(club_data: ClubCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar clubes")
    
    club = Club(**club_data.model_dump())
    club.admin_ids.append(current_user['id'])
    
    club_dict = club.model_dump()
    club_dict['created_at'] = club_dict['created_at'].isoformat()
    await db.clubs.insert_one(club_dict)
    club_dict.pop('_id', None)
    
    return club_dict

@api_router.get("/clubs")
async def get_clubs(current_user: dict = Depends(get_current_user)):
    clubs = await db.clubs.find({}, {"_id": 0}).to_list(100)
    return clubs

@api_router.get("/clubs/{club_id}")
async def get_club(club_id: str, current_user: dict = Depends(get_current_user)):
    club = await db.clubs.find_one({"id": club_id}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=404, detail="Clube não encontrado")
    return club

@api_router.put("/clubs/{club_id}")
async def update_club(club_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    club = await db.clubs.find_one({"id": club_id})
    if not club:
        raise HTTPException(status_code=404, detail="Clube não encontrado")
    
    if current_user['role'] != 'admin' and current_user['id'] not in club.get('admin_ids', []):
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    allowed_fields = ['name', 'logo_url', 'address', 'city', 'country', 'founded_year', 'website', 'email', 'phone']
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if filtered_updates:
        await db.clubs.update_one({"id": club_id}, {"$set": filtered_updates})
    
    return {"message": "Clube atualizado"}

# ==================== PERMISSIONS ROUTES ====================

@api_router.get("/permissions/defaults")
async def get_default_permissions(current_user: dict = Depends(get_current_user)):
    """Get default permissions for all roles"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Apenas administradores podem ver permissões")
    return DEFAULT_PERMISSIONS

@api_router.get("/permissions/{user_id}")
async def get_user_permissions_endpoint(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get effective permissions for a specific user"""
    if current_user['role'] != 'admin' and current_user['id'] != user_id:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    
    return get_user_permissions(user)

@api_router.put("/permissions/{user_id}")
async def update_user_permissions(user_id: str, permissions: dict, current_user: dict = Depends(get_current_user)):
    """Update custom permissions for a user (admin only)"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Apenas administradores podem modificar permissões")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    
    # Validate permission keys
    valid_keys = set(DEFAULT_PERMISSIONS['admin'].keys())
    filtered_permissions = {k: v for k, v in permissions.items() if k in valid_keys}
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"custom_permissions": filtered_permissions}}
    )
    
    return {"message": "Permissões atualizadas"}

# ==================== TEAM ROUTES ====================

@api_router.post("/teams", response_model=Team)
async def create_team(team_data: TeamCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'treinador']:
        raise HTTPException(status_code=403, detail="Apenas admins e treinadores podem criar equipas")
    
    team = Team(**team_data.model_dump())
    if current_user['role'] == 'treinador':
        team.coach_ids.append(current_user['id'])
    
    team_dict = team.model_dump()
    team_dict['created_at'] = team_dict['created_at'].isoformat()
    await db.teams.insert_one(team_dict)
    return team

@api_router.get("/teams", response_model=List[Team])
async def get_teams(current_user: dict = Depends(get_current_user)):
    if current_user['role'] == 'admin':
        teams = await db.teams.find({}, {"_id": 0}).to_list(100)
    else:
        user_id = current_user['id']
        teams = await db.teams.find({
            "$or": [{"coach_ids": user_id}, {"delegate_ids": user_id}, {"player_ids": user_id}]
        }, {"_id": 0}).to_list(100)
    
    for team in teams:
        if isinstance(team.get('created_at'), str):
            team['created_at'] = datetime.fromisoformat(team['created_at'])
    return teams

@api_router.get("/teams/{team_id}")
async def get_team(team_id: str, current_user: dict = Depends(get_current_user)):
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Equipa não encontrada")
    if isinstance(team.get('created_at'), str):
        team['created_at'] = datetime.fromisoformat(team['created_at'])
    return team

@api_router.post("/teams/{team_id}/members")
async def add_team_member(team_id: str, member_data: dict, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'treinador']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Equipa não encontrada")
    
    user_id = member_data.get('user_id')
    role = member_data.get('role', 'jogador')
    
    field_map = {'treinador': 'coach_ids', 'delegado': 'delegate_ids', 'jogador': 'player_ids', 'responsavel': 'player_ids'}
    field = field_map.get(role, 'player_ids')
    
    await db.teams.update_one({"id": team_id}, {"$addToSet": {field: user_id}})
    await db.users.update_one({"id": user_id}, {"$addToSet": {"team_ids": team_id}})
    
    return {"message": "Membro adicionado à equipa"}

@api_router.delete("/teams/{team_id}/members/{user_id}")
async def remove_team_member(team_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'treinador']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    await db.teams.update_one({"id": team_id}, {"$pull": {"coach_ids": user_id, "delegate_ids": user_id, "player_ids": user_id}})
    await db.users.update_one({"id": user_id}, {"$pull": {"team_ids": team_id}})
    
    return {"message": "Membro removido da equipa"}

@api_router.get("/teams/{team_id}/members")
async def get_team_members(team_id: str, current_user: dict = Depends(get_current_user)):
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Equipa não encontrada")
    
    all_ids = team.get('coach_ids', []) + team.get('delegate_ids', []) + team.get('player_ids', [])
    members = await db.users.find({"id": {"$in": all_ids}}, {"_id": 0, "password": 0}).to_list(100)
    
    result = []
    for member in members:
        member_role = "jogador"
        if member['id'] in team.get('coach_ids', []):
            member_role = "treinador"
        elif member['id'] in team.get('delegate_ids', []):
            member_role = "delegado"
        result.append({**member, "team_role": member_role})
    
    return result

class MemberCreate(BaseModel):
    name: str
    email: EmailStr
    role: UserRole = "jogador"
    team_id: Optional[str] = None
    jersey_number: Optional[str] = None
    position: Optional[str] = None
    phone: Optional[str] = None

@api_router.post("/members")
async def create_member(data: MemberCreate, current_user: dict = Depends(get_current_user)):
    """Create a new member (user) and optionally add to a team"""
    if current_user['role'] not in ['admin', 'treinador']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    # Check if email exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já registado")
    
    # Create user with random password
    import secrets
    temp_password = secrets.token_urlsafe(8)
    hashed_password = bcrypt.hashpw(temp_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "name": data.name,
        "email": data.email,
        "password": hashed_password,
        "role": data.role,
        "team_ids": [data.team_id] if data.team_id else [],
        "profile": {
            "sports_info": {
                "jersey_number": data.jersey_number or "",
                "position": data.position or ""
            },
            "identity": {
                "phone": data.phone or ""
            }
        },
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    # Add to team if specified
    if data.team_id:
        field_map = {'treinador': 'coach_ids', 'delegado': 'delegate_ids'}
        field = field_map.get(data.role, 'player_ids')
        await db.teams.update_one({"id": data.team_id}, {"$addToSet": {field: user_id}})
    
    user.pop("password")
    user.pop("_id", None)
    return {"user": user, "temp_password": temp_password}

@api_router.post("/members/import")
async def import_members(file: UploadFile = File(...), team_id: str = None, current_user: dict = Depends(get_current_user)):
    """Import members from Excel/CSV file"""
    if current_user['role'] not in ['admin', 'treinador']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    import io
    content = await file.read()
    
    results = {"success": 0, "errors": [], "created": []}
    
    try:
        # Try to parse as CSV first
        if file.filename.endswith('.csv'):
            import csv
            reader = csv.DictReader(io.StringIO(content.decode('utf-8')))
            rows = list(reader)
        else:
            # For Excel, we need openpyxl
            try:
                import openpyxl
                wb = openpyxl.load_workbook(io.BytesIO(content))
                ws = wb.active
                headers = [cell.value for cell in ws[1]]
                rows = []
                for row in ws.iter_rows(min_row=2, values_only=True):
                    if any(row):
                        rows.append(dict(zip(headers, row)))
            except ImportError:
                # Fallback: try CSV
                reader = csv.DictReader(io.StringIO(content.decode('utf-8')))
                rows = list(reader)
        
        import secrets
        for row in rows:
            try:
                name = row.get('nome') or row.get('name') or row.get('Nome') or ""
                email = row.get('email') or row.get('Email') or ""
                
                if not name or not email:
                    results["errors"].append(f"Linha sem nome ou email: {row}")
                    continue
                
                # Check if exists
                existing = await db.users.find_one({"email": email})
                if existing:
                    results["errors"].append(f"Email já existe: {email}")
                    continue
                
                temp_password = secrets.token_urlsafe(8)
                hashed = bcrypt.hashpw(temp_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                
                user_id = str(uuid.uuid4())
                role = row.get('role') or row.get('funcao') or row.get('Função') or 'jogador'
                if role not in ['admin', 'treinador', 'treinador_adjunto', 'delegado', 'jogador', 'responsavel']:
                    role = 'jogador'
                
                user = {
                    "id": user_id,
                    "name": name.strip(),
                    "email": email.strip().lower(),
                    "password": hashed,
                    "role": role,
                    "team_ids": [team_id] if team_id else [],
                    "profile": {
                        "sports_info": {
                            "jersey_number": str(row.get('numero') or row.get('Número') or ""),
                            "position": row.get('posicao') or row.get('Posição') or ""
                        },
                        "identity": {
                            "phone": row.get('telefone') or row.get('Telefone') or ""
                        }
                    },
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.users.insert_one(user)
                
                if team_id:
                    field_map = {'treinador': 'coach_ids', 'delegado': 'delegate_ids'}
                    field = field_map.get(role, 'player_ids')
                    await db.teams.update_one({"id": team_id}, {"$addToSet": {field: user_id}})
                
                results["success"] += 1
                results["created"].append({"name": name, "email": email, "temp_password": temp_password})
                
            except Exception as e:
                results["errors"].append(f"Erro na linha: {str(e)}")
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar ficheiro: {str(e)}")
    
    return results

# ==================== CHAMPIONSHIP ROUTES ====================

@api_router.post("/championships")
async def create_championship(data: ChampionshipCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'treinador', 'delegado']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    championship = Championship(**data.model_dump(), created_by=current_user['id'])
    champ_dict = championship.model_dump()
    champ_dict['created_at'] = champ_dict['created_at'].isoformat()
    
    await db.championships.insert_one(champ_dict)
    # Remove MongoDB _id before returning
    champ_dict.pop('_id', None)
    return champ_dict

@api_router.get("/championships")
async def get_championships(team_id: Optional[str] = None, season: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if team_id:
        query["team_id"] = team_id
    if season:
        query["season"] = season
    
    championships = await db.championships.find(query, {"_id": 0}).to_list(100)
    return championships

@api_router.get("/championships/{championship_id}")
async def get_championship(championship_id: str, current_user: dict = Depends(get_current_user)):
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Campeonato não encontrado")
    return championship

@api_router.put("/championships/{championship_id}")
async def update_championship(championship_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'treinador', 'delegado']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    allowed = ['name', 'description', 'participating_teams']
    filtered = {k: v for k, v in updates.items() if k in allowed}
    
    if filtered:
        await db.championships.update_one({"id": championship_id}, {"$set": filtered})
    return {"message": "Campeonato atualizado"}

@api_router.delete("/championships/{championship_id}")
async def delete_championship(championship_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'treinador']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    await db.championships.delete_one({"id": championship_id})
    await db.championship_matches.delete_many({"championship_id": championship_id})
    return {"message": "Campeonato eliminado"}

# ==================== CHAMPIONSHIP MATCH ROUTES ====================

@api_router.post("/championships/{championship_id}/matches")
async def create_championship_match(championship_id: str, data: ChampionshipMatchCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'treinador', 'delegado']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Campeonato não encontrado")
    
    match = ChampionshipMatch(
        championship_id=championship_id,
        team_id=championship['team_id'],
        opponent_team=data.opponent_team,
        match_date=data.match_date,
        location=data.location,
        venue=data.venue
    )
    
    match_dict = match.model_dump()
    match_dict['match_date'] = match_dict['match_date'].isoformat()
    match_dict['created_at'] = match_dict['created_at'].isoformat()
    
    await db.championship_matches.insert_one(match_dict)
    # Remove MongoDB _id before returning
    match_dict.pop('_id', None)
    
    # Also create an event for this match
    event = Event(
        team_id=championship['team_id'],
        event_type="jogo_campeonato",
        title=f"vs {data.opponent_team}",
        location=data.venue or ("Casa" if data.location == "casa" else "Fora"),
        start_time=data.match_date,
        opponent=data.opponent_team,
        championship_id=championship_id,
        championship_match_id=match.id,
        created_by=current_user['id']
    )
    event_dict = event.model_dump()
    event_dict['start_time'] = event_dict['start_time'].isoformat()
    event_dict['created_at'] = event_dict['created_at'].isoformat()
    await db.events.insert_one(event_dict)
    
    return match_dict

@api_router.get("/championships/{championship_id}/matches")
async def get_championship_matches(championship_id: str, current_user: dict = Depends(get_current_user)):
    matches = await db.championship_matches.find({"championship_id": championship_id}, {"_id": 0}).sort("match_date", 1).to_list(100)
    
    for match in matches:
        if isinstance(match.get('match_date'), str):
            match['match_date'] = datetime.fromisoformat(match['match_date'])
    
    return matches

@api_router.put("/championships/matches/{match_id}/result")
async def update_match_result(match_id: str, result: MatchResultUpdate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'treinador', 'delegado']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    await db.championship_matches.update_one(
        {"id": match_id},
        {"$set": {
            "home_score": result.home_score,
            "away_score": result.away_score,
            "bonus_points": result.bonus_points,
            "penalty_points": result.penalty_points,
            "is_completed": True
        }}
    )
    return {"message": "Resultado atualizado"}

class MatchUpdate(BaseModel):
    opponent_team: Optional[str] = None
    match_date: Optional[datetime] = None
    location: Optional[MatchLocation] = None
    venue: Optional[str] = None

@api_router.put("/championships/matches/{match_id}")
async def update_match(match_id: str, updates: MatchUpdate, current_user: dict = Depends(get_current_user)):
    """Update match details (date, time, location, opponent)"""
    if current_user['role'] not in ['admin', 'treinador', 'delegado']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    match = await db.championship_matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if update_data:
        await db.championship_matches.update_one({"id": match_id}, {"$set": update_data})
    
    return {"message": "Jogo atualizado"}

@api_router.delete("/championships/matches/{match_id}")
async def delete_match(match_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a championship match"""
    if current_user['role'] not in ['admin', 'treinador', 'delegado']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    match = await db.championship_matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    
    # Delete associated event and attendance
    event = await db.events.find_one({"championship_match_id": match_id}, {"_id": 0})
    if event:
        await db.attendance.delete_many({"event_id": event['id']})
        await db.convocations.delete_many({"event_id": event['id']})
        await db.events.delete_one({"id": event['id']})
    
    await db.championship_matches.delete_one({"id": match_id})
    return {"message": "Jogo eliminado"}

class GameSheetImport(BaseModel):
    url: str
    match_id: str

@api_router.post("/championships/matches/import-gamesheet")
async def import_gamesheet(data: GameSheetImport, current_user: dict = Depends(get_current_user)):
    """Import match data from APL game sheet URL"""
    if current_user['role'] not in ['admin', 'treinador', 'delegado']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    # Fetch and parse the game sheet
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(data.url)
            response.raise_for_status()
            html = response.text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao aceder à ficha de jogo: {str(e)}")
    
    soup = BeautifulSoup(html, 'html.parser')
    
    # Extract match result
    result_data = {}
    
    try:
        # Find the final score from the styled span (e.g., "7 - 2")
        score_span = soup.find('span', style=lambda x: x and 'background-color:#000000' in x if x else False)
        if score_span:
            score_text = score_span.get_text(strip=True)
            score_match = re.search(r'(\d+)\s*-\s*(\d+)', score_text)
            if score_match:
                result_data['home_score'] = int(score_match.group(1))
                result_data['away_score'] = int(score_match.group(2))
        
        # Fallback: search for score pattern in HTML
        if 'home_score' not in result_data:
            score_pattern = re.search(r'<b>(\d+)\s*-\s*(\d+)</b>', html)
            if score_pattern:
                result_data['home_score'] = int(score_pattern.group(1))
                result_data['away_score'] = int(score_pattern.group(2))
        
        # Find stats tables - look for tables with class="estadisticas" or containing player stats
        player_stats = []
        current_team = None
        
        # Find all statistics divs
        stats_divs = soup.find_all('div', class_='estadisticas')
        
        for stats_div in stats_divs:
            tables = stats_div.find_all('table')
            for table in tables:
                rows = table.find_all('tr')
                
                for row in rows:
                    cells = row.find_all('td')
                    if not cells:
                        continue
                    
                    # Check for team header (contains logo and team name)
                    first_cell = cells[0]
                    if first_cell.get('class') and 'fondo1' in first_cell.get('class', []):
                        # This is a team header row
                        team_name_span = first_cell.find('span')
                        if team_name_span:
                            current_team = team_name_span.get_text(strip=True)
                        continue
                    
                    # Check for header row (contains column names like G, AG, etc.)
                    if first_cell.get('class') and 'fondo3' in first_cell.get('class', []):
                        continue
                    
                    # Skip "Técnicos" section
                    row_text = row.get_text()
                    if 'Técnicos' in row_text or 'Total da equipa' in row_text:
                        continue
                    
                    # Parse player row - structure:
                    # [0]=nº, [1]=5I, [2]=flag, [3]=Nome, [4]=G, [5]=AG, [6]=D, [7]=Pe, [8]=LD, [9]=Amarelo, [10]=Azul, [11]=Vermelho
                    if len(cells) >= 12:
                        try:
                            jersey_text = cells[0].get_text(strip=True)
                            
                            # Skip if first column is a staff role (D, T, T2, MAS, MEC) or empty
                            if jersey_text in ['D', 'T', 'T2', 'MAS', 'MEC', '']:
                                continue
                            
                            # Get jersey number - can be "1", "01", etc.
                            jersey = jersey_text.lstrip('0') or '0'
                            
                            # Get player name from column 3
                            name_cell = cells[3]
                            name = name_cell.get_text(strip=True)
                            # Clean up name (remove captain marker ©)
                            name = re.sub(r'\s*©\s*', '', name).strip()
                            name = re.sub(r'\s+', ' ', name)  # Normalize spaces
                            
                            if not name:
                                continue
                            
                            # Extract stats - handle both numbers and "--" for staff
                            def parse_stat(cell_index):
                                """Parse a stat cell, returning 0 for non-numeric values"""
                                if cell_index >= len(cells):
                                    return 0
                                text = cells[cell_index].get_text(strip=True)
                                if text.isdigit():
                                    return int(text)
                                return 0
                            
                            def parse_fraction_stat(cell_index):
                                """Parse a fraction stat like '1/2' returning the first number (scored)"""
                                if cell_index >= len(cells):
                                    return 0
                                text = cells[cell_index].get_text(strip=True)
                                if '/' in text:
                                    parts = text.split('/')
                                    if parts[0].isdigit():
                                        return int(parts[0])
                                return 0
                            
                            goals = parse_stat(4)       # G (Golos)
                            assists = parse_stat(5)     # AG (Assistências)
                            defenses = parse_stat(6)    # D (Defesas)
                            penalties = parse_fraction_stat(7)   # Pe (Penáltis - X/Y format)
                            free_kicks = parse_fraction_stat(8)  # LD (Livres Diretos - X/Y format)
                            yellow_cards = parse_stat(9)   # Amarelo
                            blue_cards = parse_stat(10)    # Azul
                            red_cards = parse_stat(11)     # Vermelho
                            
                            if current_team:
                                player_stats.append({
                                    'team': current_team,
                                    'jersey_number': jersey,
                                    'name': name,
                                    'goals': goals,
                                    'assists': assists,
                                    'defenses': defenses,
                                    'penalties_scored': penalties,
                                    'free_kicks_scored': free_kicks,
                                    'yellow_cards': yellow_cards,
                                    'blue_cards': blue_cards,
                                    'red_cards': red_cards
                                })
                        except Exception as e:
                            logging.warning(f"Error parsing player row: {e}")
                            continue
        
        result_data['player_stats'] = player_stats
        
        # Extract competition and date info
        text_content = soup.get_text()
        
        # Find date
        date_pattern = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', text_content)
        if date_pattern:
            result_data['match_date'] = f"{date_pattern.group(3)}-{date_pattern.group(2).zfill(2)}-{date_pattern.group(1).zfill(2)}"
        
        # Find venue - stop at line break or special characters
        venue_pattern = re.search(r'Recinto:\s*([A-Z0-9\s\.\-]+)', text_content)
        if venue_pattern:
            result_data['venue'] = venue_pattern.group(1).strip()
        
        # Find referee
        referee_pattern = re.search(r'Árbitros?:\s*([^\n,]+)', text_content)
        if referee_pattern:
            result_data['referee'] = referee_pattern.group(1).strip()
            
    except Exception as e:
        logging.error(f"Error parsing gamesheet: {e}")
        raise HTTPException(status_code=400, detail=f"Erro ao processar ficha de jogo: {str(e)}")
    
    # Update match with imported data
    match = await db.championship_matches.find_one({"id": data.match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    
    update_fields = {
        "home_score": result_data.get('home_score', 0),
        "away_score": result_data.get('away_score', 0),
        "is_completed": True,
        "gamesheet_url": data.url,
        "gamesheet_imported_at": datetime.now(timezone.utc).isoformat()
    }
    
    if result_data.get('venue'):
        update_fields['venue'] = result_data['venue']
    if result_data.get('referee'):
        update_fields['referee'] = result_data['referee']
    
    await db.championship_matches.update_one({"id": data.match_id}, {"$set": update_fields})
    
    # Update player statistics
    championship = await db.championships.find_one({"id": match['championship_id']}, {"_id": 0})
    team_id = championship['team_id'] if championship else None
    
    stats_updated = 0
    unmatched_players = []
    
    if team_id and result_data.get('player_stats'):
        # Get all team members once for efficient matching
        team_members = await db.users.find({"team_ids": team_id}, {"_id": 0}).to_list(200)
        
        # Helper function to normalize text (remove accents, uppercase)
        def normalize_name(name):
            """Remove accents and normalize name for comparison"""
            import unicodedata
            if not name:
                return ""
            # Normalize unicode and remove diacritics
            normalized = unicodedata.normalize('NFD', name)
            ascii_text = ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')
            return ascii_text.upper().strip()
        
        for ps in result_data['player_stats']:
            player = None
            ps_name_normalized = normalize_name(ps['name'])
            ps_name_parts = ps_name_normalized.split()
            
            # Method 1: Try to find by exact jersey number
            for member in team_members:
                jersey = member.get('profile', {}).get('sports_info', {}).get('jersey_number')
                if jersey and str(jersey) == str(ps['jersey_number']):
                    player = member
                    break
            
            # Method 2: Try by full name match (normalized, no accents)
            if not player:
                for member in team_members:
                    member_name_normalized = normalize_name(member.get('name', ''))
                    if member_name_normalized == ps_name_normalized:
                        player = member
                        break
            
            # Method 3: Try by first + last name match (ignoring middle names)
            # "ANTONIO PEREIRA" should match "António Matias Pereira"
            if not player and len(ps_name_parts) >= 2:
                ps_first = ps_name_parts[0]
                ps_last = ps_name_parts[-1]
                for member in team_members:
                    member_name_normalized = normalize_name(member.get('name', ''))
                    member_parts = member_name_normalized.split()
                    if len(member_parts) >= 2:
                        mem_first = member_parts[0]
                        mem_last = member_parts[-1]
                        # Match if first AND last name match
                        if ps_first == mem_first and ps_last == mem_last:
                            player = member
                            break
            
            # Method 4: Try by partial name match (any matching part with min 3 chars)
            if not player:
                for member in team_members:
                    member_name_normalized = normalize_name(member.get('name', ''))
                    member_parts = member_name_normalized.split()
                    matches = 0
                    for ps_part in ps_name_parts:
                        if len(ps_part) >= 3:
                            for mem_part in member_parts:
                                if ps_part == mem_part:
                                    matches += 1
                                    break
                    # Need at least 2 matching parts for a positive match
                    if matches >= 2:
                        player = member
                        break
            
            # Method 5: Try fuzzy match - name contains or is contained
            if not player:
                for member in team_members:
                    member_name_normalized = normalize_name(member.get('name', ''))
                    if len(ps_name_normalized) >= 4 and len(member_name_normalized) >= 4:
                        if ps_name_normalized in member_name_normalized or member_name_normalized in ps_name_normalized:
                            player = member
                            break
            
            if player:
                # Create or update player match stats
                stat_id = f"{data.match_id}_{player['id']}"
                stat_doc = {
                    "id": stat_id,
                    "match_id": data.match_id,
                    "championship_id": match['championship_id'],
                    "player_id": player['id'],
                    "team_id": team_id,
                    "goals": ps['goals'],
                    "assists": ps['assists'],
                    "defenses": ps.get('defenses', 0),
                    "penalties_scored": ps.get('penalties_scored', 0),
                    "free_kicks_scored": ps.get('free_kicks_scored', 0),
                    "yellow_cards": ps['yellow_cards'],
                    "blue_cards": ps['blue_cards'],
                    "red_cards": ps['red_cards'],
                    "imported_from_gamesheet": True,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Use the same collection as the rest of the app: player_match_stats
                await db.player_match_stats.update_one(
                    {"id": stat_id},
                    {"$set": stat_doc},
                    upsert=True
                )
                stats_updated += 1
            else:
                # Track unmatched players (with stats) for feedback
                if ps['goals'] > 0 or ps['assists'] > 0 or ps['yellow_cards'] > 0 or ps['blue_cards'] > 0 or ps['red_cards'] > 0:
                    unmatched_players.append(f"#{ps['jersey_number']} {ps['name']}")
    
    # Save raw gamesheet stats in match document for reference (even if no players matched)
    if result_data.get('player_stats'):
        await db.championship_matches.update_one(
            {"id": data.match_id},
            {"$set": {
                "gamesheet_player_stats": result_data['player_stats'],
                "gamesheet_raw_data": {
                    "home_score": result_data.get('home_score', 0),
                    "away_score": result_data.get('away_score', 0),
                    "venue": result_data.get('venue'),
                    "referee": result_data.get('referee'),
                    "total_players": len(result_data['player_stats']),
                    "imported_at": datetime.now(timezone.utc).isoformat()
                }
            }}
        )
    
    response = {
        "message": "Ficha de jogo importada com sucesso",
        "result": f"{result_data.get('home_score', 0)} - {result_data.get('away_score', 0)}",
        "players_found": len(result_data.get('player_stats', [])),
        "stats_updated": stats_updated
    }
    
    if unmatched_players:
        response["unmatched_players"] = unmatched_players
        response["message"] += f" ({len(unmatched_players)} jogadores com estatísticas não encontrados na equipa)"
    
    return response


@api_router.get("/championships/matches/{match_id}/gamesheet-stats")
async def get_match_gamesheet_stats(match_id: str, current_user: dict = Depends(get_current_user)):
    """Get the raw gamesheet stats for a match"""
    match = await db.championship_matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    
    return {
        "match_id": match_id,
        "home_score": match.get('home_score'),
        "away_score": match.get('away_score'),
        "gamesheet_url": match.get('gamesheet_url'),
        "gamesheet_imported_at": match.get('gamesheet_imported_at'),
        "player_stats": match.get('gamesheet_player_stats', []),
        "raw_data": match.get('gamesheet_raw_data', {})
    }


@api_router.get("/championships/{championship_id}/standings")
async def get_championship_standings(championship_id: str, current_user: dict = Depends(get_current_user)):
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Campeonato não encontrado")
    
    matches = await db.championship_matches.find({"championship_id": championship_id, "is_completed": True}, {"_id": 0}).to_list(100)
    
    # Build standings
    standings = {}
    team_name = (await db.teams.find_one({"id": championship['team_id']}, {"_id": 0, "name": 1}))['name']
    
    # Initialize our team
    standings[team_name] = {"team": team_name, "played": 0, "won": 0, "drawn": 0, "lost": 0, "goals_for": 0, "goals_against": 0, "bonus": 0, "penalty": 0, "points": 0}
    
    # Initialize opponents
    for match in matches:
        opp = match['opponent_team']
        if opp not in standings:
            standings[opp] = {"team": opp, "played": 0, "won": 0, "drawn": 0, "lost": 0, "goals_for": 0, "goals_against": 0, "bonus": 0, "penalty": 0, "points": 0}
    
    # Calculate stats
    for match in matches:
        home_score = match.get('home_score', 0)
        away_score = match.get('away_score', 0)
        opp = match['opponent_team']
        loc = match.get('location', 'casa')
        bonus = match.get('bonus_points', 0)
        penalty = match.get('penalty_points', 0)
        
        # Our team stats
        if loc == 'casa':
            our_goals = home_score
            their_goals = away_score
        else:
            our_goals = away_score
            their_goals = home_score
        
        standings[team_name]['played'] += 1
        standings[team_name]['goals_for'] += our_goals
        standings[team_name]['goals_against'] += their_goals
        standings[team_name]['bonus'] += bonus
        standings[team_name]['penalty'] += penalty
        
        standings[opp]['played'] += 1
        standings[opp]['goals_for'] += their_goals
        standings[opp]['goals_against'] += our_goals
        
        if our_goals > their_goals:
            standings[team_name]['won'] += 1
            standings[team_name]['points'] += 3
            standings[opp]['lost'] += 1
        elif our_goals < their_goals:
            standings[team_name]['lost'] += 1
            standings[opp]['won'] += 1
            standings[opp]['points'] += 3
        else:
            standings[team_name]['drawn'] += 1
            standings[team_name]['points'] += 1
            standings[opp]['drawn'] += 1
            standings[opp]['points'] += 1
    
    # Apply bonus/penalty
    for team in standings.values():
        team['points'] += team['bonus'] - team['penalty']
        team['goal_diff'] = team['goals_for'] - team['goals_against']
    
    # Sort by points, then goal difference, then goals for
    sorted_standings = sorted(standings.values(), key=lambda x: (-x['points'], -x['goal_diff'], -x['goals_for']))
    
    return sorted_standings

# ==================== PLAYER MATCH STATS ROUTES ====================

@api_router.post("/matches/{match_id}/player-stats")
async def create_player_match_stats(match_id: str, stats: PlayerMatchStatsCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'treinador', 'delegado']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    match = await db.championship_matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    
    player_stats = PlayerMatchStats(
        **stats.model_dump(),
        team_id=match['team_id'],
        championship_id=match['championship_id']
    )
    
    stats_dict = player_stats.model_dump()
    stats_dict['created_at'] = stats_dict['created_at'].isoformat()
    
    # Upsert - update if exists, insert if not
    await db.player_match_stats.update_one(
        {"match_id": match_id, "player_id": stats.player_id},
        {"$set": stats_dict},
        upsert=True
    )
    
    return stats_dict

@api_router.get("/matches/{match_id}/player-stats")
async def get_match_player_stats(match_id: str, current_user: dict = Depends(get_current_user)):
    stats = await db.player_match_stats.find({"match_id": match_id}, {"_id": 0}).to_list(100)
    
    # Enrich with player info
    for stat in stats:
        player = await db.users.find_one({"id": stat['player_id']}, {"_id": 0, "password": 0})
        if player:
            stat['player'] = player
    
    return stats

@api_router.get("/players/{player_id}/match-stats")
async def get_player_all_match_stats(player_id: str, championship_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"player_id": player_id}
    if championship_id:
        query["championship_id"] = championship_id
    
    stats = await db.player_match_stats.find(query, {"_id": 0}).to_list(500)
    return stats

# ==================== EVENT ROUTES ====================

@api_router.post("/events")
async def create_event(event_data: EventCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'treinador', 'delegado']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    event = Event(**event_data.model_dump(), created_by=current_user['id'])
    event_dict = event.model_dump()
    event_dict['start_time'] = event_dict['start_time'].isoformat()
    if event_dict['end_time']:
        event_dict['end_time'] = event_dict['end_time'].isoformat()
    event_dict['created_at'] = event_dict['created_at'].isoformat()
    
    await db.events.insert_one(event_dict)
    # Remove MongoDB _id before returning
    event_dict.pop('_id', None)
    return event_dict

@api_router.get("/events")
async def get_events(team_id: Optional[str] = None, event_type: Optional[str] = None, championship_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if team_id:
        query["team_id"] = team_id
    if event_type:
        query["event_type"] = event_type
    if championship_id:
        query["championship_id"] = championship_id
    
    if current_user['role'] != 'admin':
        user_teams = current_user.get('team_ids', [])
        if user_teams:
            query["team_id"] = {"$in": user_teams}
    
    events = await db.events.find(query, {"_id": 0}).sort("start_time", 1).to_list(500)
    
    for event in events:
        if isinstance(event.get('start_time'), str):
            event['start_time'] = datetime.fromisoformat(event['start_time'])
        if event.get('end_time') and isinstance(event['end_time'], str):
            event['end_time'] = datetime.fromisoformat(event['end_time'])
    
    return events

@api_router.get("/events/{event_id}")
async def get_event(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    return event

@api_router.put("/events/{event_id}")
async def update_event(event_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'treinador', 'treinador_adjunto', 'delegado']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    
    allowed_fields = ['event_type', 'title', 'description', 'location', 'start_time', 'end_time', 'opponent', 'status']
    filtered_updates = {}
    
    for key, value in updates.items():
        if key in allowed_fields:
            if key in ['start_time', 'end_time'] and value:
                if isinstance(value, str):
                    filtered_updates[key] = value
                else:
                    filtered_updates[key] = value.isoformat() if hasattr(value, 'isoformat') else value
            else:
                filtered_updates[key] = value
    
    if filtered_updates:
        await db.events.update_one({"id": event_id}, {"$set": filtered_updates})
    
    return {"message": "Evento atualizado"}

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'treinador']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    await db.events.delete_one({"id": event_id})
    await db.convocations.delete_many({"event_id": event_id})
    await db.attendance.delete_many({"event_id": event_id})
    
    return {"message": "Evento eliminado"}

# ==================== CONVOCATION ROUTES ====================

@api_router.post("/convocations")
async def create_convocation(conv_data: ConvocationCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'treinador']:
        raise HTTPException(status_code=403, detail="Apenas treinadores podem criar convocatórias")
    
    event = await db.events.find_one({"id": conv_data.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    
    convocation = Convocation(**conv_data.model_dump(), created_by=current_user['id'])
    conv_dict = convocation.model_dump()
    conv_dict['created_at'] = conv_dict['created_at'].isoformat()
    
    await db.convocations.insert_one(conv_dict)
    # Remove MongoDB _id before returning
    conv_dict.pop('_id', None)
    
    # Create attendance records
    event_date = event['start_time'] if isinstance(event['start_time'], datetime) else datetime.fromisoformat(event['start_time'])
    
    for player_id in conv_data.player_ids:
        attendance = Attendance(
            event_id=conv_data.event_id,
            convocation_id=convocation.id,
            player_id=player_id,
            team_id=event['team_id'],
            event_type=event['event_type'],
            championship_id=event.get('championship_id'),
            event_date=event_date
        )
        att_dict = attendance.model_dump()
        att_dict['event_date'] = att_dict['event_date'].isoformat()
        att_dict['updated_at'] = att_dict['updated_at'].isoformat()
        await db.attendance.insert_one(att_dict)
        
        # Send email (MOCK)
        player = await db.users.find_one({"id": player_id}, {"_id": 0})
        if player:
            await send_email_notification(
                player['email'],
                f"Convocatória: {event.get('title', 'Evento')}",
                f"<h1>Foste convocado!</h1><p>{conv_data.message or 'Por favor confirma a tua presença.'}</p>"
            )
    
    return conv_dict

@api_router.get("/convocations/my")
async def get_my_convocations(current_user: dict = Depends(get_current_user)):
    attendances = await db.attendance.find({"player_id": current_user['id']}, {"_id": 0}).to_list(100)
    
    result = []
    for att in attendances:
        event = await db.events.find_one({"id": att['event_id']}, {"_id": 0})
        convocation = await db.convocations.find_one({"id": att.get('convocation_id')}, {"_id": 0}) if att.get('convocation_id') else None
        
        if event:
            if isinstance(event.get('start_time'), str):
                event['start_time'] = datetime.fromisoformat(event['start_time'])
            result.append({"attendance": att, "event": event, "convocation": convocation})
    
    return result

@api_router.put("/attendance/{attendance_id}")
async def update_attendance(attendance_id: str, update: AttendanceUpdate, current_user: dict = Depends(get_current_user)):
    attendance = await db.attendance.find_one({"id": attendance_id})
    if not attendance:
        raise HTTPException(status_code=404, detail="Registo de presença não encontrado")
    
    if attendance['player_id'] != current_user['id'] and current_user['role'] not in ['admin', 'treinador', 'delegado']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    await db.attendance.update_one(
        {"id": attendance_id},
        {"$set": {"status": update.status, "reason": update.reason, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Presença atualizada"}

# ==================== ATTENDANCE ANALYTICS ROUTES ====================

@api_router.get("/teams/{team_id}/attendance")
async def get_team_attendance(team_id: str, season: Optional[str] = None, month: Optional[int] = None, 
                              event_type: Optional[str] = None, championship_id: Optional[str] = None,
                              current_user: dict = Depends(get_current_user)):
    query = {"team_id": team_id}
    
    if event_type:
        query["event_type"] = event_type
    if championship_id:
        query["championship_id"] = championship_id
    
    attendances = await db.attendance.find(query, {"_id": 0}).to_list(5000)
    
    # Filter by month if specified
    if month:
        attendances = [a for a in attendances if datetime.fromisoformat(a['event_date']).month == month]
    
    # Group by player
    player_stats = {}
    for att in attendances:
        pid = att['player_id']
        if pid not in player_stats:
            player_stats[pid] = {"total": 0, "confirmado": 0, "ausente": 0, "pendente": 0}
        player_stats[pid]["total"] += 1
        player_stats[pid][att['status']] += 1
    
    # Enrich with player info
    result = []
    for pid, stats in player_stats.items():
        player = await db.users.find_one({"id": pid}, {"_id": 0, "password": 0})
        if player:
            stats['player'] = player
            stats['attendance_rate'] = round((stats['confirmado'] / stats['total']) * 100, 1) if stats['total'] > 0 else 0
            result.append(stats)
    
    result.sort(key=lambda x: -x['attendance_rate'])
    return result

@api_router.get("/teams/{team_id}/attendance/summary")
async def get_team_attendance_summary(team_id: str, current_user: dict = Depends(get_current_user)):
    # Get all attendance for this team
    attendances = await db.attendance.find({"team_id": team_id}, {"_id": 0}).to_list(5000)
    
    # Group by month
    monthly = {}
    by_event_type = {
        "treino": {"total": 0, "confirmado": 0}, 
        "jogo_campeonato": {"total": 0, "confirmado": 0}, 
        "jogo_amigavel": {"total": 0, "confirmado": 0},
        "torneio": {"total": 0, "confirmado": 0},
        "outro": {"total": 0, "confirmado": 0}
    }
    
    for att in attendances:
        event_date = datetime.fromisoformat(att['event_date']) if isinstance(att['event_date'], str) else att['event_date']
        month_key = event_date.strftime("%Y-%m")
        
        if month_key not in monthly:
            monthly[month_key] = {"total": 0, "confirmado": 0}
        
        monthly[month_key]["total"] += 1
        if att['status'] == 'confirmado':
            monthly[month_key]["confirmado"] += 1
        
        et = att.get('event_type', 'treino')
        if et in by_event_type:
            by_event_type[et]["total"] += 1
            if att['status'] == 'confirmado':
                by_event_type[et]["confirmado"] += 1
    
    return {"monthly": monthly, "by_event_type": by_event_type, "total_records": len(attendances)}

@api_router.get("/events/{event_id}/attendance")
async def get_event_attendance(event_id: str, current_user: dict = Depends(get_current_user)):
    """Get attendance records for a specific event"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    attendances = await db.attendance.find({"event_id": event_id}, {"_id": 0}).to_list(100)
    
    # Enrich with player info
    result = []
    for att in attendances:
        player = await db.users.find_one({"id": att['player_id']}, {"_id": 0, "password": 0})
        if player:
            att['player'] = player
        result.append(att)
    
    # Calculate summary
    summary = {
        "total": len(result),
        "confirmado": len([a for a in result if a['status'] == 'confirmado']),
        "ausente": len([a for a in result if a['status'] == 'ausente']),
        "pendente": len([a for a in result if a['status'] == 'pendente'])
    }
    
    return {"attendance": result, "summary": summary}

# ==================== STATISTICS ROUTES ====================

@api_router.get("/teams/{team_id}/stats")
async def get_team_stats(team_id: str, championship_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"team_id": team_id}
    if championship_id:
        query["championship_id"] = championship_id
    
    all_stats = await db.player_match_stats.find(query, {"_id": 0}).to_list(5000)
    
    # Aggregate by player
    player_totals = {}
    for stat in all_stats:
        pid = stat['player_id']
        if pid not in player_totals:
            player_totals[pid] = {
                "player_id": pid, "games_played": 0, "minutes_played": 0, "goals": 0, "assists": 0,
                "penalties_scored": 0, "penalties_missed": 0, "penalties_saved": 0, "penalties_conceded": 0,
                "free_kicks_scored": 0, "free_kicks_missed": 0, "free_kicks_saved": 0, "free_kicks_conceded": 0,
                "saves": 0, "blue_cards": 0, "yellow_cards": 0, "white_cards": 0, "red_cards": 0
            }
        
        pt = player_totals[pid]
        pt['games_played'] += 1
        for key in ['minutes_played', 'goals', 'assists', 'penalties_scored', 'penalties_missed', 
                    'penalties_saved', 'penalties_conceded', 'free_kicks_scored', 'free_kicks_missed',
                    'free_kicks_saved', 'free_kicks_conceded', 'saves', 'blue_cards', 'yellow_cards', 
                    'white_cards', 'red_cards']:
            pt[key] += stat.get(key, 0)
    
    # Enrich with player info
    result = []
    for pid, stats in player_totals.items():
        player = await db.users.find_one({"id": pid}, {"_id": 0, "password": 0})
        if player:
            stats['player'] = player
            result.append(stats)
    
    return result

@api_router.get("/player-stats/{player_id}/consolidated")
async def get_player_consolidated_stats(player_id: str, current_user: dict = Depends(get_current_user)):
    player = await db.users.find_one({"id": player_id}, {"_id": 0, "password": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Jogador não encontrado")
    
    # Get all match stats for this player
    all_stats = await db.player_match_stats.find({"player_id": player_id}, {"_id": 0}).to_list(1000)
    
    # Consolidated totals
    consolidated = {
        "games_played": 0, "minutes_played": 0, "goals": 0, "assists": 0,
        "penalties_scored": 0, "penalties_missed": 0, "penalties_saved": 0, "penalties_conceded": 0,
        "free_kicks_scored": 0, "free_kicks_missed": 0, "free_kicks_saved": 0, "free_kicks_conceded": 0,
        "saves": 0, "blue_cards": 0, "yellow_cards": 0, "white_cards": 0, "red_cards": 0
    }
    
    # Per team stats
    team_stats = {}
    for stat in all_stats:
        tid = stat.get('team_id')
        if tid not in team_stats:
            team_stats[tid] = {k: 0 for k in consolidated.keys()}
            team_stats[tid]['team_id'] = tid
        
        consolidated['games_played'] += 1
        team_stats[tid]['games_played'] += 1
        
        for key in list(consolidated.keys())[1:]:
            consolidated[key] += stat.get(key, 0)
            team_stats[tid][key] += stat.get(key, 0)
    
    # Enrich team stats with team info
    per_team_stats = []
    for tid, ts in team_stats.items():
        team = await db.teams.find_one({"id": tid}, {"_id": 0})
        if team:
            ts['team'] = team
            per_team_stats.append(ts)
    
    # Get teams the player belongs to
    teams = []
    for tid in player.get('team_ids', []):
        team = await db.teams.find_one({"id": tid}, {"_id": 0})
        if team:
            teams.append(team)
    
    return {
        "player": player,
        "consolidated": consolidated,
        "per_team_stats": per_team_stats,
        "teams": teams,
        "teams_count": len(teams)
    }

# ==================== MESSAGE ROUTES ====================

@api_router.post("/messages")
async def send_message(msg_data: MessageCreate, current_user: dict = Depends(get_current_user)):
    message = Message(
        team_id=msg_data.team_id,
        sender_id=current_user['id'],
        sender_name=current_user['name'],
        content=msg_data.content,
        recipient_ids=msg_data.recipient_ids,
        attachment_name=msg_data.attachment_name
    )
    
    # Handle attachment (store as base64 in DB for simplicity - in production use object storage)
    if msg_data.attachment_data:
        message.attachment_url = f"data:{msg_data.attachment_name};base64,{msg_data.attachment_data}"
    
    msg_dict = message.model_dump()
    msg_dict['created_at'] = msg_dict['created_at'].isoformat()
    
    await db.messages.insert_one(msg_dict)
    # Remove MongoDB _id before returning
    msg_dict.pop('_id', None)
    
    # Send email notifications
    if msg_data.recipient_ids:
        recipients = await db.users.find({"id": {"$in": msg_data.recipient_ids}}, {"_id": 0, "email": 1, "name": 1}).to_list(100)
    else:
        # Send to all team members
        team = await db.teams.find_one({"id": msg_data.team_id}, {"_id": 0})
        if team:
            all_ids = team.get('coach_ids', []) + team.get('delegate_ids', []) + team.get('player_ids', [])
            recipients = await db.users.find({"id": {"$in": all_ids}}, {"_id": 0, "email": 1, "name": 1}).to_list(100)
        else:
            recipients = []
    
    for recipient in recipients:
        if recipient['email'] != current_user['email']:
            await send_email_notification(
                recipient['email'],
                f"Nova mensagem de {current_user['name']}",
                f"<p>{msg_data.content}</p>"
            )
    
    return msg_dict

@api_router.get("/messages/{team_id}")
async def get_messages(team_id: str, limit: int = 50, current_user: dict = Depends(get_current_user)):
    messages = await db.messages.find(
        {"team_id": team_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return list(reversed(messages))

@api_router.get("/teams/{team_id}/members-for-message")
async def get_members_for_message(team_id: str, current_user: dict = Depends(get_current_user)):
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Equipa não encontrada")
    
    all_ids = team.get('coach_ids', []) + team.get('delegate_ids', []) + team.get('player_ids', [])
    members = await db.users.find({"id": {"$in": all_ids}}, {"_id": 0, "password": 0, "id": 1, "name": 1, "email": 1, "role": 1}).to_list(100)
    
    return members

# ==================== DASHBOARD ROUTE ====================

@api_router.get("/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    user_teams = current_user.get('team_ids', [])
    
    now = datetime.now(timezone.utc).isoformat()
    upcoming_query = {"start_time": {"$gte": now}}
    if current_user['role'] != 'admin' and user_teams:
        upcoming_query["team_id"] = {"$in": user_teams}
    
    upcoming_events = await db.events.find(upcoming_query, {"_id": 0}).sort("start_time", 1).limit(5).to_list(5)
    
    for event in upcoming_events:
        if isinstance(event.get('start_time'), str):
            event['start_time'] = datetime.fromisoformat(event['start_time'])
        team = await db.teams.find_one({"id": event['team_id']}, {"_id": 0})
        event['team'] = team
    
    pending_attendances = await db.attendance.find({"player_id": current_user['id'], "status": "pendente"}, {"_id": 0}).to_list(10)
    
    pending_convocations = []
    for att in pending_attendances:
        event = await db.events.find_one({"id": att['event_id']}, {"_id": 0})
        if event:
            if isinstance(event.get('start_time'), str):
                event['start_time'] = datetime.fromisoformat(event['start_time'])
            pending_convocations.append({"attendance": att, "event": event})
    
    teams_count = await db.teams.count_documents({}) if current_user['role'] == 'admin' else len(user_teams)
    
    recent_messages = []
    if user_teams:
        recent_messages = await db.messages.find({"team_id": {"$in": user_teams}}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "upcoming_events": upcoming_events,
        "pending_convocations": pending_convocations,
        "teams_count": teams_count,
        "recent_messages": recent_messages
    }

# ==================== ROOT ROUTE ====================

@api_router.get("/")
async def root():
    return {"message": "Roller Hockey Hub API", "version": "2.0.0"}

# Include router
# ==================== FILE UPLOAD ====================

@api_router.post("/upload/image")
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload an image file and return the URL"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de ficheiro não permitido. Use JPEG, PNG, GIF ou WebP.")
    
    # Validate file size (max 5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Ficheiro muito grande. Máximo 5MB.")
    
    # Generate unique filename
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = UPLOADS_DIR / filename
    
    # Save file
    with open(filepath, "wb") as f:
        f.write(content)
    
    # Return URL
    return {"url": f"/uploads/{filename}", "filename": filename}

@api_router.delete("/upload/{filename}")
async def delete_image(filename: str, current_user: dict = Depends(get_current_user)):
    """Delete an uploaded image"""
    filepath = UPLOADS_DIR / filename
    if filepath.exists():
        filepath.unlink()
        return {"message": "Ficheiro eliminado"}
    raise HTTPException(status_code=404, detail="Ficheiro não encontrado")

# ==================== MAIN ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
