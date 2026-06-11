from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from enum import Enum
import os
import io
import logging
import asyncio
import resend
import secrets
import hashlib
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator
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
import pandas as pd

# Import RBAC permissions module
from permissions import PermissionChecker, get_permission_checker, Role, ROLE_PERMISSIONS

# Phase E2: new modular activation email helper (services.emails-backed).
# Imported lazily-friendly so app boot fails loudly if services/ is missing.
from services.activation_emails import send_activation_email

# Phase E3: password reset email helper.
from services.password_reset_emails import send_password_reset_email

# P0 startup hardening: validate email-related env vars at module import.
# In production, this raises EmailConfigError and aborts boot when any of
# RESEND_API_KEY / SENDER_EMAIL / FRONTEND_URL is missing. In development
# and test environments, validate_email_config() only logs a warning and
# returns — outbound mail falls back to dry-run mode via services.emails.
from services.emails import validate_email_config as _validate_email_config
_validate_email_config()

ROOT_DIR = Path(__file__).parent
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
# Security: JWT_SECRET MUST be set in production. In development/testing only,
# an insecure fallback is used so the app can boot — never deploy this way.
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'development').lower()
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    if ENVIRONMENT == 'production':
        raise RuntimeError(
            "JWT_SECRET environment variable is required in production. "
            "Set JWT_SECRET to a strong random value (min 32 chars) before starting the app."
        )
    JWT_SECRET = 'dev-only-insecure-jwt-secret-change-me'
    logging.getLogger(__name__).warning(
        "JWT_SECRET not set - using insecure development fallback. "
        "DO NOT use this in production. Set JWT_SECRET in backend/.env."
    )
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Roller Hockey Hub API")

# Mount uploads folder for static files - use /api/uploads so it's accessible via proxy
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

UserRole = Literal["admin", "gestor_desportivo", "treinador", "treinador_adjunto", "delegado", "jogador", "responsavel"]
EventType = Literal["treino", "jogo_campeonato", "jogo_amigavel", "torneio", "outro"]
AttendanceStatus = Literal["confirmado", "ausente", "pendente", "faltou_sem_aviso"]
MatchLocation = Literal["casa", "fora", "neutro"]
PlayerPosition = Literal["GR", "JC"]
ChampionshipFormat = Literal["5x5", "3x3"]
ConvocationType = Literal["automatica", "manual"]
EquipmentSize = str  # Free text: S/M/L/XL or 8/10/12 etc

# Admin-level roles (have full permissions)
ADMIN_ROLES = ["admin", "gestor_desportivo"]

def is_admin_role(role: str) -> bool:
    """Check if a role has admin-level permissions"""
    return role in ADMIN_ROLES

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
    "gestor_desportivo": {
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
    gender: Optional[str] = None  # masculino, feminino
    nationality: Optional[str] = None  # NEW: Nationality
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
    position: Optional[str] = None  # GR/JC - changed to str for flexibility
    jersey_number: Optional[str] = None  # Changed to str for flexibility
    
    # Equipment sizes (free text)
    training_kit_size: Optional[str] = None
    tracksuit_size: Optional[str] = None
    polo_size: Optional[str] = None
    training_sock_size: Optional[str] = None

    model_config = ConfigDict(extra="ignore")

    # Validator to handle empty strings and type coercion
    @field_validator('weight', 'height', mode='before')
    @classmethod
    def empty_str_to_none_float(cls, v):
        if v == '' or v is None:
            return None
        try:
            return float(v)
        except (ValueError, TypeError):
            return None

    @field_validator('year_joined_club', mode='before')
    @classmethod
    def empty_str_to_none_int(cls, v):
        if v == '' or v is None:
            return None
        try:
            return int(v)
        except (ValueError, TypeError):
            return None

    @field_validator('jersey_number', 'position', mode='before')
    @classmethod
    def coerce_to_string(cls, v):
        if v is None or v == '':
            return None
        return str(v)

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    surname: Optional[str] = None
    role: UserRole  # Primary/global role (admin stays here)
    additional_roles: List[UserRole] = []
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    team_ids: List[str] = []
    team_roles: Dict[str, UserRole] = {}  # NEW: team_id -> role mapping
    club_id: Optional[str] = None  # Club association
    associated_accounts: List[str] = []
    parent_account_id: Optional[str] = None
    linked_player_id: Optional[str] = None  # For family_members: linked player's ID
    linked_player_ids: List[str] = []  # NEW: Multiple linked players for family accounts
    
    # Extended profile data
    profile: Optional[UserProfile] = None
    
    # Custom permissions (if admin has modified defaults)
    custom_permissions: Optional[Dict[str, bool]] = None

    # Phase O1 — Admin onboarding wizard. Null until the admin (or
    # gestor_desportivo) finishes the onboarding flow at least once.
    onboarding_completed_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    surname: Optional[str] = None
    role: UserRole
    additional_roles: List[UserRole] = []
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    team_ids: List[str] = []
    team_roles: Dict[str, UserRole] = {}  # NEW
    club_id: Optional[str] = None
    associated_accounts: List[str] = []
    parent_account_id: Optional[str] = None
    linked_player_id: Optional[str] = None
    linked_player_ids: List[str] = []  # NEW
    profile: Optional[UserProfile] = None
    permissions: Optional[Dict[str, bool]] = None
    # Phase O1 — surfaced so the frontend can route admins to /onboarding
    # on first login without an extra request.
    onboarding_completed_at: Optional[datetime] = None

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
    photo_url: Optional[str] = None

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    season: Optional[str] = None
    photo_url: Optional[str] = None

class Team(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    season: str
    photo_url: Optional[str] = None
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
    # Pavilhão/Arena do clube
    venue_name: Optional[str] = None  # Nome do pavilhão
    venue_location: Optional[str] = None  # Localização/morada do pavilhão
    admin_ids: List[str] = []  # Users with admin access to this club
    # Theme colors
    primary_color: Optional[str] = "#006D5B"  # Default teal
    secondary_color: Optional[str] = "#FFD700"  # Default gold
    accent_color: Optional[str] = "#1a1a2e"  # Default dark
    theme_mode: Optional[str] = "light"  # light or dark
    # Timezone
    timezone: Optional[str] = "Europe/Lisbon"  # Default timezone
    # Sidebar accent color for active item text
    sidebar_accent_color: Optional[str] = "#22d3ee"  # Default cyan
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClubUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    founded_year: Optional[int] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    venue_name: Optional[str] = None
    venue_location: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    theme_mode: Optional[str] = None
    timezone: Optional[str] = None
    sidebar_accent_color: Optional[str] = None

# Season Models
class SeasonCreate(BaseModel):
    name: str  # e.g., "2024/2025"
    start_date: str  # ISO date string
    end_date: str  # ISO date string
    is_active: bool = False

class Season(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    club_id: str
    name: str
    start_date: str
    end_date: str
    is_active: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SeasonUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: Optional[bool] = None

# Subscription Models
class SubscriptionPlan(str, Enum):
    standard = "standard"
    plus = "plus"

class SubscriptionStatus(str, Enum):
    active = "active"
    expired = "expired"
    cancelled = "cancelled"
    pending = "pending"

class PaymentMethod(str, Enum):
    credit_card = "credit_card"
    bank_transfer = "bank_transfer"

class InvoiceStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    overdue = "overdue"
    cancelled = "cancelled"

class SubscriptionCreate(BaseModel):
    plan_type: SubscriptionPlan = SubscriptionPlan.standard
    payment_method: PaymentMethod = PaymentMethod.bank_transfer

class Subscription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    club_id: str
    plan_type: str = "standard"  # "standard" or "plus"
    start_date: str  # ISO date string
    end_date: str  # ISO date string (1 year after start)
    status: str = "active"  # "active", "expired", "cancelled", "pending"
    payment_method: str = "bank_transfer"  # "credit_card" or "bank_transfer"
    member_count: int = 0  # Number of subscribed members
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SubscriptionUpdate(BaseModel):
    plan_type: Optional[str] = None
    payment_method: Optional[str] = None
    status: Optional[str] = None
    member_count: Optional[int] = None

class SubscriptionInvoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subscription_id: str
    club_id: str
    invoice_number: str  # e.g., "INV-2024-001"
    start_date: str  # Billing period start
    end_date: str  # Billing period end
    paying_members: int
    price_per_member: float  # e.g., 2.50
    total_due: float
    total_paid: float = 0.0
    status: str = "pending"  # "pending", "paid", "overdue", "cancelled"
    file_url: Optional[str] = None  # PDF invoice link
    paid_at: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SubscriptionInvoiceCreate(BaseModel):
    start_date: str
    end_date: str
    paying_members: int
    price_per_member: float
    total_due: float

# Library Models
class LibraryItemType(str, Enum):
    pdf = "pdf"
    link = "link"
    video = "video"

class LibraryItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    item_type: LibraryItemType
    url: str  # For links/videos or file path for PDFs
    category: Optional[str] = None  # e.g., "Regras", "Táticas", "Treino"
    tags: List[str] = []

class LibraryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    item_type: LibraryItemType
    url: str
    category: Optional[str] = None
    tags: List[str] = []
    thumbnail_url: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Match Lineup Models (for coaches to manage game periods)
class LineupPosition(BaseModel):
    position: str  # "guarda_redes", "defesa_esquerda", "defesa_direita", "avancado_esquerda", "avancado_direita"
    player_id: Optional[str] = None
    player_name: Optional[str] = None

class MatchPeriod(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # "1ª Parte", "2ª Parte", "Prolongamento", etc.
    order: int
    positions: List[LineupPosition] = []
    notes: Optional[str] = None

# Lineup visibility options
LineupVisibility = Literal["coach_only", "assistant", "delegate", "assistant_and_delegate"]

class MatchLineupCreate(BaseModel):
    match_id: str
    periods: List[MatchPeriod] = []
    visibility: LineupVisibility = "coach_only"

class MatchLineup(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    match_id: str
    team_id: str
    periods: List[dict] = []
    visibility: LineupVisibility = "coach_only"
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Competition Team Models (equipas participantes nas competições)
class TeamKitColors(BaseModel):
    primary_shirt: Optional[str] = None
    secondary_shirt: Optional[str] = None
    primary_shorts: Optional[str] = None
    secondary_shorts: Optional[str] = None
    primary_socks: Optional[str] = None
    secondary_socks: Optional[str] = None

class CompetitionTeamCreate(BaseModel):
    name: str
    pavilion_name: Optional[str] = None
    pavilion_address: Optional[str] = None
    field_player_kit: Optional[TeamKitColors] = None
    goalkeeper_kit: Optional[TeamKitColors] = None

class CompetitionTeam(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    championship_id: str
    name: str
    pavilion_name: Optional[str] = None
    pavilion_address: Optional[str] = None
    field_player_kit: Optional[dict] = None
    goalkeeper_kit: Optional[dict] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# AI Chat Models
class AIChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

# Championship Models
class ChampionshipCreate(BaseModel):
    name: str
    season: str
    team_id: str
    description: Optional[str] = None
    format: ChampionshipFormat = "5x5"
    location: Optional[str] = None
    convocation_type: ConvocationType = "manual"
    age_group: Optional[str] = None
    competition_type: Optional[str] = "campeonato_distrital"

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
    age_group: Optional[str] = None
    competition_type: Optional[str] = "campeonato_distrital"
    participating_teams: List[str] = []
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChampionshipMatchCreate(BaseModel):
    championship_id: str
    home_team: Optional[str] = None  # Nome da equipa da casa (pode ser qualquer equipa)
    opponent_team: str  # Nome da equipa visitante
    match_date: datetime
    match_time: Optional[str] = None  # Hora do jogo (HH:MM)
    location: MatchLocation
    venue: Optional[str] = None
    is_club_match: bool = True  # Se é jogo da equipa do clube ou jogo entre outras equipas
    bonus_points: int = 0
    penalty_points: int = 0
    matchday: Optional[int] = None  # Número da jornada

class ChampionshipMatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    championship_id: str
    team_id: str
    home_team: Optional[str] = None
    opponent_team: str
    match_date: datetime
    match_time: Optional[str] = None  # Hora do jogo (HH:MM)
    location: MatchLocation
    venue: Optional[str] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    is_completed: bool = False
    is_club_match: bool = True
    bonus_points: int = 0
    penalty_points: int = 0
    matchday: Optional[int] = None  # Número da jornada
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
    position: Optional[PlayerPosition] = None  # Made optional for stats import
    started_match: bool = False
    minutes_played: int = 0
    goals: int = 0
    own_goals: int = 0
    assists: int = 0
    penalties_scored: int = 0
    penalties_missed: int = 0
    penalties_saved: int = 0
    penalties_conceded: int = 0
    free_kicks_scored: int = 0
    free_kicks_missed: int = 0
    free_kicks_saved: int = 0
    free_kicks_conceded: int = 0
    direct_free_kicks: int = 0
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
    position: Optional[PlayerPosition] = None
    started_match: bool = False
    minutes_played: int = 0
    goals: int = 0
    own_goals: int = 0
    assists: int = 0
    penalties_scored: int = 0
    penalties_missed: int = 0
    penalties_saved: int = 0
    penalties_conceded: int = 0
    free_kicks_scored: int = 0
    free_kicks_missed: int = 0
    free_kicks_saved: int = 0
    free_kicks_conceded: int = 0
    direct_free_kicks: int = 0
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
class ConvocationVisibility(str, Enum):
    players = "players"
    delegates = "delegates"
    all = "all"

class ConvocationCreate(BaseModel):
    event_id: str
    player_ids: List[str]
    message: Optional[str] = None
    visibility: ConvocationVisibility = ConvocationVisibility.all

class Convocation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    player_ids: List[str]
    message: Optional[str] = None
    visibility: ConvocationVisibility = ConvocationVisibility.all
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Unavailability Models
UnavailabilityReason = Literal["ferias", "doenca", "escola", "outro"]

class UnavailabilityCreate(BaseModel):
    start_date: datetime
    end_date: datetime
    reason: str  # ferias, doenca, escola, outro
    notes: Optional[str] = None  # Free text for additional details

class Unavailability(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    team_ids: List[str] = []  # Teams affected
    start_date: datetime
    end_date: datetime
    reason: str
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Event Reminder Models
class EventReminder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    team_id: str
    reminder_type: str  # "no_convocation_4h"
    sent_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notified_user_ids: List[str] = []

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

# ==================== PAYMENT MODELS ====================

PaymentStatus = Literal["pending", "paid", "overdue"]
PaymentType = Literal["monthly_fee", "custom"]

class MonthlyFeeCreate(BaseModel):
    user_id: str
    amount: float
    month: int  # 1-12
    year: int
    due_date: datetime
    notes: Optional[str] = None

class MonthlyFee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    amount: float
    month: int
    year: int
    due_date: datetime
    status: PaymentStatus = "pending"
    paid_at: Optional[datetime] = None
    proof_url: Optional[str] = None
    proof_filename: Optional[str] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomPaymentCreate(BaseModel):
    user_id: str
    title: str
    description: Optional[str] = None
    amount: float
    due_date: datetime

class CustomPayment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = None
    amount: float
    due_date: datetime
    status: PaymentStatus = "pending"
    paid_at: Optional[datetime] = None
    proof_url: Optional[str] = None
    proof_filename: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentSettingsUpdate(BaseModel):
    payments_disabled: Optional[bool] = None
    default_monthly_fee: Optional[float] = None

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
    """Send email using Resend API - falls back gracefully if not configured"""
    resend_api_key = os.environ.get('RESEND_API_KEY')
    sender_email = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
    
    if not resend_api_key:
        logger.warning(f"[EMAIL SKIPPED] RESEND_API_KEY not configured. Would send to: {to_email}, Subject: {subject}")
        return False
    
    try:
        # Configure Resend with API key
        resend.api_key = resend_api_key
        
        # Build email params
        params = {
            "from": sender_email,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        
        # Add attachment if provided
        if attachment_name and attachment_data:
            params["attachments"] = [{
                "filename": attachment_name,
                "content": base64.b64encode(attachment_data).decode('utf-8')
            }]
        
        # Send email using thread to keep async non-blocking
        email_response = await asyncio.to_thread(resend.Emails.send, params)
        
        logger.info(f"[EMAIL SENT] To: {to_email}, Subject: {subject}, ID: {email_response.get('id', 'unknown')}")
        return True
        
    except Exception as e:
        # Log error but don't break the app flow
        logger.error(f"[EMAIL ERROR] Failed to send to {to_email}: {str(e)}")
        return False


def build_email_template(title: str, content: str, footer_text: str = None) -> str:
    """Build a clean, professional email template"""
    footer = footer_text or "Esta é uma mensagem automática do StickPro."
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 20px 0;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 32px; text-align: center;">
                                <h1 style="margin: 0; color: #22d3ee; font-size: 24px; font-weight: 700; letter-spacing: 2px;">STICK PRO</h1>
                            </td>
                        </tr>
                        <!-- Title -->
                        <tr>
                            <td style="padding: 32px 32px 16px 32px;">
                                <h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 600;">{title}</h2>
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style="padding: 0 32px 32px 32px; color: #374151; font-size: 15px; line-height: 1.6;">
                                {content}
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">
                                    {footer}
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

# ==================== PUSH NOTIFICATIONS HELPER ====================

async def send_push_to_users(user_ids: List[str], title: str, body: str, url: str = "/"):
    """Send push notifications to specific users"""
    from pywebpush import webpush, WebPushException
    import json
    
    vapid_private_key = os.environ.get('VAPID_PRIVATE_KEY')
    vapid_claims_email = os.environ.get('VAPID_CLAIMS_EMAIL', 'noreply@stickpro.com')
    
    if not vapid_private_key:
        logger.warning("VAPID_PRIVATE_KEY not configured, skipping push notifications")
        return
    
    # Get subscriptions for these users
    subscriptions = await db.push_subscriptions.find(
        {"user_id": {"$in": user_ids}}, 
        {"_id": 0}
    ).to_list(1000)
    
    if not subscriptions:
        logger.info(f"No push subscriptions found for users: {user_ids}")
        return
    
    payload = json.dumps({
        "title": title,
        "body": body,
        "url": url,
        "icon": "/icons/icon-192x192.png"
    })
    
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub['endpoint'],
                    "keys": sub['keys']
                },
                data=payload,
                vapid_private_key=vapid_private_key,
                vapid_claims={"sub": f"mailto:{vapid_claims_email}"}
            )
            logger.info(f"Push sent to user {sub['user_id']}")
        except WebPushException as e:
            logger.error(f"Push failed for user {sub['user_id']}: {e}")
            # Remove invalid subscriptions
            if e.response and e.response.status_code in [404, 410]:
                await db.push_subscriptions.delete_one({"endpoint": sub['endpoint']})
        except Exception as e:
            logger.error(f"Push error: {e}")


async def notify_guardians_of_team_event(team_id: str, event_title: str, event_type: str, event_time: str):
    """
    Notify all guardians (parents) whose children are members of a team when an event is created.
    
    Args:
        team_id: ID of the team the event is for
        event_type: Type of event (treino, jogo_campeonato, etc.)
        event_title: Title of the event
        event_time: When the event will happen
    """
    try:
        # Get the team
        team = await db.teams.find_one({"id": team_id}, {"_id": 0, "name": 1, "player_ids": 1, "member_ids": 1})
        if not team:
            logger.warning(f"Team {team_id} not found for notification")
            return
        
        team_name = team.get('name', 'Equipa')
        # Use player_ids or member_ids (whichever has data)
        member_ids = team.get('player_ids', []) or team.get('member_ids', [])
        
        # If no members in team, find users who have this team in their team_ids
        if not member_ids:
            member_ids = []
            async for user in db.users.find({"team_ids": team_id}, {"_id": 0, "id": 1}):
                member_ids.append(user['id'])
        
        if not member_ids:
            logger.info(f"No members found in team {team_name} for notification")
            return
        
        logger.info(f"Found {len(member_ids)} members in team {team_name}")
        
        # Find all guardians who have children in this team
        guardian_ids = []
        async for user in db.users.find(
            {
                "role": "responsavel",
                "$or": [
                    {"linked_player_ids": {"$in": member_ids}},
                    {"linked_player_id": {"$in": member_ids}}
                ]
            },
            {"_id": 0, "id": 1, "email": 1, "name": 1, "linked_player_ids": 1, "linked_player_id": 1}
        ):
            guardian_ids.append(user['id'])
            
            # Get children names for the email
            all_linked = user.get('linked_player_ids', [])
            if user.get('linked_player_id'):
                all_linked = list(set(all_linked + [user['linked_player_id']]))
            
            # Filter to only children in this team
            children_in_team = [pid for pid in all_linked if pid in member_ids]
            
            if children_in_team and user.get('email'):
                # Get child names
                child_names = []
                for child_id in children_in_team:
                    child = await db.users.find_one({"id": child_id}, {"_id": 0, "name": 1})
                    if child:
                        child_names.append(child.get('name', 'Atleta').split(' ')[0])
                
                children_str = ', '.join(child_names) if child_names else 'o seu filho'
                
                # Send email notification
                event_type_names = {
                    'treino': 'Treino',
                    'jogo_campeonato': 'Jogo de Campeonato',
                    'jogo_amigavel': 'Jogo Amigável',
                    'torneio': 'Torneio',
                    'outro': 'Evento'
                }
                event_type_name = event_type_names.get(event_type, 'Evento')
                
                html_content = f"""
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #006D5B;">Novo Evento para {children_str}</h2>
                        <p>Olá {user.get('name', 'Responsável').split(' ')[0]},</p>
                        <p>Foi criado um novo evento para a equipa <strong>{team_name}</strong>:</p>
                        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Tipo:</strong> {event_type_name}</p>
                            <p style="margin: 5px 0;"><strong>Título:</strong> {event_title}</p>
                            <p style="margin: 5px 0;"><strong>Data/Hora:</strong> {event_time}</p>
                        </div>
                        <p>Aceda à aplicação para confirmar a presença de {children_str}.</p>
                        <p style="color: #666; font-size: 12px; margin-top: 30px;">
                            Este email foi enviado automaticamente pelo StickPro.
                        </p>
                    </div>
                </body>
                </html>
                """
                
                try:
                    await send_email_notification(
                        to_email=user['email'],
                        subject=f"Novo {event_type_name} - {team_name}",
                        html_content=html_content
                    )
                    logger.info(f"Email notification sent to guardian {user['email']} about event {event_title}")
                except Exception as e:
                    logger.error(f"Failed to send email to guardian {user['email']}: {e}")
        
        # Send push notifications to all guardians
        if guardian_ids:
            event_type_names = {
                'treino': 'Treino',
                'jogo_campeonato': 'Jogo',
                'jogo_amigavel': 'Jogo',
                'torneio': 'Torneio',
                'outro': 'Evento'
            }
            event_type_name = event_type_names.get(event_type, 'Evento')
            
            await send_push_to_users(
                user_ids=guardian_ids,
                title=f"Novo {event_type_name} - {team_name}",
                body=f"{event_title}",
                url="/dashboard"
            )
            logger.info(f"Push notifications sent to {len(guardian_ids)} guardians")
        else:
            logger.info(f"No guardians found to notify for team {team_name}")
    
    except Exception as e:
        logger.error(f"Error notifying guardians: {e}")

# ==================== AUTH ROUTES ====================

async def build_available_profiles(user: dict) -> List[dict]:
    """Build list of all profiles a user can access"""
    profiles = []
    
    # Own profile with all roles
    all_roles = [user["role"]] + user.get("additional_roles", [])
    for role in all_roles:
        # Get teams for this role
        user_teams = []
        for team_id in user.get("team_ids", []):
            team = await db.teams.find_one({"id": team_id}, {"_id": 0})
            if team:
                user_teams.append(team)
        
        profiles.append({
            "type": "self",
            "user_id": user["id"],
            "user_name": user["name"],
            "role": role,
            "label": f'{user["name"]} ({getRoleNamePt(role)})',
            "teams": user_teams
        })
    
    # Associated accounts (e.g., children)
    for assoc_id in user.get("associated_accounts", []):
        assoc_user = await db.users.find_one({"id": assoc_id}, {"_id": 0, "hashed_password": 0})
        if assoc_user:
            assoc_teams = []
            for team_id in assoc_user.get("team_ids", []):
                team = await db.teams.find_one({"id": team_id}, {"_id": 0})
                if team:
                    assoc_teams.append(team)
            
            profiles.append({
                "type": "associated",
                "user_id": assoc_user["id"],
                "user_name": assoc_user["name"],
                "role": "responsavel",
                "label": f'Responsável de {assoc_user["name"]}',
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


class ActivateAccountRequest(BaseModel):
    token: str
    password: str


@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Emails duplicados são permitidos (ex: pai com vários filhos)
    # Cada conta é única pelo ID, não pelo email
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        phone=user_data.phone,
        additional_roles=user_data.additional_roles
    )
    user_dict = user.model_dump()
    user_dict["hashed_password"] = hash_password(user_data.password)
    user_dict["is_activated"] = True
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    token = create_token(user.id, user.email, user.role)
    
    user_dict.pop("hashed_password", None)
    profiles = await build_available_profiles(user_dict)
    
    return {
        "token": token,
        "user": UserResponse(**user.model_dump()).model_dump(),
        "available_profiles": profiles
    }


@api_router.post("/auth/activate")
async def activate_account(data: ActivateAccountRequest):
    user = await db.users.find_one({"invite_token": data.token}, {"_id": 0})

    if not user:
        raise HTTPException(status_code=400, detail="Convite inválido")

    if user.get("is_activated"):
        raise HTTPException(status_code=400, detail="Conta já ativada")

    expires_at = user.get("invite_expires_at")
    if not expires_at:
        raise HTTPException(status_code=400, detail="Convite inválido")

    if datetime.fromisoformat(expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Convite expirado")

    hashed_password = bcrypt.hashpw(
        data.password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "hashed_password": hashed_password,
                "is_activated": True,
                "activated_at": datetime.now(timezone.utc).isoformat()
            },
            "$unset": {
                "invite_token": "",
                "invite_expires_at": ""
            }
        }
    )

    return {"message": "Conta ativada com sucesso"}


# Phase E2 — public, unauthenticated endpoint to request a fresh activation link.
# Security properties:
#   * Always returns the same generic message regardless of whether the email
#     exists in the database — prevents account enumeration.
#   * Only sends a link for accounts that exist AND are NOT yet activated.
#   * Refreshes the invite_token if it's missing or expired; otherwise reuses
#     the still-valid one (token rotation is bounded by the 7-day expiry).
#   * Throttles repeat sends per account to once every 60 seconds via the
#     last_activation_email_sent_at field — the API still returns success so
#     attackers can't probe the throttle either.
class RequestActivationLinkRequest(BaseModel):
    email: EmailStr


_GENERIC_ACTIVATION_RESPONSE = {
    "message": (
        "Se existir uma conta inativa associada a este email, "
        "enviámos um novo link de ativação."
    )
}


@api_router.post("/auth/request-new-activation-link")
async def request_new_activation_link(data: RequestActivationLinkRequest):
    email = data.email.strip().lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})

    if not user or user.get("is_activated"):
        return _GENERIC_ACTIVATION_RESPONSE

    # Throttle: at most one activation email every 60 seconds per account.
    last_sent_iso = user.get("last_activation_email_sent_at")
    if last_sent_iso:
        try:
            last_sent = datetime.fromisoformat(last_sent_iso)
            if (datetime.now(timezone.utc) - last_sent).total_seconds() < 60:
                return _GENERIC_ACTIVATION_RESPONSE
        except Exception:
            pass  # bad data — fall through and treat as no throttle

    # Refresh token only if missing or expired; otherwise reuse the valid one.
    invite_token = user.get("invite_token")
    invite_expires_at = user.get("invite_expires_at")
    token_valid = False
    if invite_token and invite_expires_at:
        try:
            token_valid = datetime.fromisoformat(invite_expires_at) > datetime.now(timezone.utc)
        except Exception:
            token_valid = False
    if not token_valid:
        invite_token = secrets.token_urlsafe(32)
        invite_expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"invite_token": invite_token, "invite_expires_at": invite_expires_at}}
        )

    sent_at_iso = datetime.now(timezone.utc).isoformat()
    try:
        await send_activation_email(
            to_email=email,
            name=user.get("name", "Atleta"),
            token=invite_token,
            idempotency_key=f"resend-{user['id']}-{invite_token[:8]}",
        )
    except Exception as e:
        logger.warning(f"[ACTIVATION EMAIL] request-new-link: {e}")
    else:
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"last_activation_email_sent_at": sent_at_iso}}
        )

    return _GENERIC_ACTIVATION_RESPONSE


# ============================================================================
# Phase E3 — Password Reset
# ============================================================================
#
# Two endpoints, both public/unauthenticated:
#
#   POST /api/auth/forgot-password { email }    → always returns generic 200
#   POST /api/auth/reset-password  { token, password } → 204 on success,
#                                                        400 on invalid/expired/used
#
# Security properties:
#   * forgot-password never reveals whether an account exists.
#   * The raw token is sent in the email; only its SHA-256 hash is stored.
#     A leaked DB snapshot therefore does not let an attacker reset passwords.
#   * Tokens are single-use: marked `used_at` atomically on successful reset.
#   * Tokens expire after 1 hour.
#   * forgot-password is rate-limited to one send / 60 s per account via the
#     `last_password_reset_email_sent_at` field on the user document.
#   * Every reset attempt (success or failure) is logged to the
#     `password_reset_audit` MongoDB collection with timestamp, masked email,
#     IP-agnostic outcome code and reason.
#
# Token lifecycle storage on the user document:
#   {
#     "password_reset_token_hash": "<hex sha256>",  # cleared on success
#     "password_reset_expires_at": "<iso8601 UTC>",
#     "last_password_reset_email_sent_at": "<iso8601 UTC>"
#   }
#
PASSWORD_RESET_TOKEN_TTL = timedelta(hours=1)
PASSWORD_RESET_THROTTLE_SECONDS = 60
PASSWORD_RESET_MIN_LEN = 8

_GENERIC_FORGOT_RESPONSE = {
    "message": (
        "Se existir uma conta associada a este email, "
        "enviámos um link para redefinir a palavra-passe."
    )
}


def _hash_reset_token(token: str) -> str:
    """SHA-256 hex digest of a reset token. Stored in DB; raw token in email."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _mask_email_for_audit(email: str) -> str:
    """Return a redacted form like 'j***@example.com' for audit logs."""
    if not email or "@" not in email:
        return "***"
    local, _, domain = email.partition("@")
    if len(local) <= 1:
        return f"*@{domain}"
    return f"{local[0]}***@{domain}"


async def _audit_password_reset(
    *, email: str, outcome: str, reason: str = "", user_id: Optional[str] = None
) -> None:
    """Append a row to the password_reset_audit collection. Never raises."""
    try:
        await db.password_reset_audit.insert_one(
            {
                "id": str(uuid.uuid4()),
                "email_masked": _mask_email_for_audit(email or ""),
                "user_id": user_id,
                "outcome": outcome,
                "reason": reason,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )
    except Exception as e:  # pragma: no cover — audit must never block flow
        logger.error(f"[AUDIT] failed to write password_reset_audit row: {e}")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10)
    password: str = Field(..., min_length=PASSWORD_RESET_MIN_LEN)


@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """Issue a password reset token + email. Always returns generic 200."""
    email = data.email.strip().lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})

    # Unknown email — log discreetly, return generic.
    if not user:
        await _audit_password_reset(email=email, outcome="ignored", reason="unknown_email")
        return _GENERIC_FORGOT_RESPONSE

    # Not-yet-activated accounts: redirect users to the activation flow
    # instead of issuing a reset token (no clear identity yet).
    if not user.get("is_activated", False):
        await _audit_password_reset(
            email=email, outcome="ignored", reason="account_not_activated",
            user_id=user.get("id"),
        )
        return _GENERIC_FORGOT_RESPONSE

    # Throttle: at most one reset email every 60 s per account.
    last_sent_iso = user.get("last_password_reset_email_sent_at")
    if last_sent_iso:
        try:
            last_sent = datetime.fromisoformat(last_sent_iso)
            if (datetime.now(timezone.utc) - last_sent).total_seconds() < PASSWORD_RESET_THROTTLE_SECONDS:
                await _audit_password_reset(
                    email=email, outcome="ignored", reason="throttled",
                    user_id=user.get("id"),
                )
                return _GENERIC_FORGOT_RESPONSE
        except Exception:
            pass

    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_reset_token(raw_token)
    expires_at_iso = (datetime.now(timezone.utc) + PASSWORD_RESET_TOKEN_TTL).isoformat()
    sent_at_iso = datetime.now(timezone.utc).isoformat()

    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "password_reset_token_hash": token_hash,
                "password_reset_expires_at": expires_at_iso,
            }
        },
    )

    delivered = False
    try:
        delivered = await send_password_reset_email(
            to_email=email,
            name=user.get("name", "Atleta"),
            token=raw_token,
            idempotency_key=f"forgot-{user['id']}-{token_hash[:8]}",
        )
    except Exception as e:
        logger.warning(f"[PASSWORD RESET] send failed: {e}")

    if delivered:
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"last_password_reset_email_sent_at": sent_at_iso}},
        )
        await _audit_password_reset(
            email=email, outcome="email_sent", reason="", user_id=user["id"],
        )
    else:
        await _audit_password_reset(
            email=email, outcome="email_failed", reason="delivery_failed",
            user_id=user["id"],
        )

    return _GENERIC_FORGOT_RESPONSE


@api_router.post("/auth/reset-password", status_code=204)
async def reset_password(data: ResetPasswordRequest):
    """Consume a reset token and set the new password. Single-use."""
    token_hash = _hash_reset_token(data.token)
    user = await db.users.find_one(
        {"password_reset_token_hash": token_hash}, {"_id": 0}
    )

    if not user:
        await _audit_password_reset(
            email="?", outcome="reset_rejected", reason="invalid_token",
        )
        raise HTTPException(status_code=400, detail="Link inválido ou já utilizado")

    # Expiry check
    expires_at_iso = user.get("password_reset_expires_at")
    if not expires_at_iso:
        await _audit_password_reset(
            email=user.get("email", ""), outcome="reset_rejected",
            reason="missing_expiry", user_id=user.get("id"),
        )
        raise HTTPException(status_code=400, detail="Link inválido ou já utilizado")
    try:
        expires_at = datetime.fromisoformat(expires_at_iso)
    except Exception:
        await _audit_password_reset(
            email=user.get("email", ""), outcome="reset_rejected",
            reason="bad_expiry", user_id=user.get("id"),
        )
        raise HTTPException(status_code=400, detail="Link inválido ou já utilizado")
    if expires_at < datetime.now(timezone.utc):
        # Clean up the expired token to make the state explicit and reduce
        # future enumeration surface area.
        await db.users.update_one(
            {"id": user["id"]},
            {"$unset": {
                "password_reset_token_hash": "",
                "password_reset_expires_at": "",
            }},
        )
        await _audit_password_reset(
            email=user.get("email", ""), outcome="reset_rejected",
            reason="expired", user_id=user.get("id"),
        )
        raise HTTPException(status_code=400, detail="Link expirado")

    # Atomic single-use: only consume if the hash field is still present.
    new_hashed = hash_password(data.password)
    update_result = await db.users.update_one(
        {
            "id": user["id"],
            "password_reset_token_hash": token_hash,
        },
        {
            "$set": {
                "hashed_password": new_hashed,
                "is_activated": True,  # ensures user can log in after reset
                "password_reset_used_at": datetime.now(timezone.utc).isoformat(),
            },
            "$unset": {
                "password_reset_token_hash": "",
                "password_reset_expires_at": "",
            },
        },
    )
    if update_result.modified_count != 1:
        await _audit_password_reset(
            email=user.get("email", ""), outcome="reset_rejected",
            reason="already_used", user_id=user.get("id"),
        )
        raise HTTPException(status_code=400, detail="Link inválido ou já utilizado")

    await _audit_password_reset(
        email=user.get("email", ""), outcome="reset_succeeded",
        user_id=user.get("id"),
    )
    # No body: 204 status. Clients should redirect to /login.
    return None


@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})

    stored_hash = user.get("hashed_password") if user else None

    if not user or not stored_hash:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    if not user.get("is_activated", False):
        raise HTTPException(status_code=401, detail="Conta ainda não ativada")

    if not verify_password(credentials.password, stored_hash):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    token = create_token(user["id"], user["email"], user["role"])
    profiles = await build_available_profiles(user)
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "additional_roles": user.get("additional_roles", []),
            "phone": user.get("phone"),
            "avatar_url": user.get("avatar_url"),
            "team_ids": user.get("team_ids", []),
            "associated_accounts": user.get("associated_accounts", [])
        },
        "available_profiles": profiles
    }


@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    profiles = await build_available_profiles(current_user)
    
    # Build user permissions
    checker = get_permission_checker(current_user)
    permissions = {
        "is_admin": checker.is_admin,
        "is_coach": checker.is_coach,
        "is_assistant_coach": checker.is_assistant_coach,
        "is_delegate": checker.is_delegate,
        "is_player": checker.is_player,
        "is_family_member": checker.is_family_member,
        "is_staff": checker.is_staff,
        "can_manage_team": checker.can_manage_team,
        "can_manage_events": checker.can_manage_events,
        "can_manage_stats": checker.can_manage_stats,
        "can_manage_attendance": checker.can_manage_attendance,
        "can_create_convocations": checker.can_create_convocations,
        "can_manage_lineups": checker.can_manage_lineups,
        "can_import_data": checker.can_import_data,
        "can_manage_club": checker.can_manage_club,
    }
    
    return {
        **UserResponse(**current_user).model_dump(),
        "available_profiles": profiles,
        "permissions": permissions,
        "accessible_team_ids": list(checker.team_ids) if not checker.is_admin else None
    }


@api_router.get("/auth/permissions")
async def get_my_permissions(current_user: dict = Depends(get_current_user)):
    """Get current user's permissions"""
    checker = get_permission_checker(current_user)
    
    return {
        "role": current_user.get("role"),
        "additional_roles": current_user.get("additional_roles", []),
        "team_ids": list(checker.team_ids),
        "is_admin": checker.is_admin,
        "is_coach": checker.is_coach,
        "is_assistant_coach": checker.is_assistant_coach,
        "is_delegate": checker.is_delegate,
        "is_player": checker.is_player,
        "is_family_member": checker.is_family_member,
        "is_staff": checker.is_staff,
        "can_manage_team": checker.can_manage_team,
        "can_manage_events": checker.can_manage_events,
        "can_manage_stats": checker.can_manage_stats,
        "can_manage_attendance": checker.can_manage_attendance,
        "can_create_convocations": checker.can_create_convocations,
        "can_manage_lineups": checker.can_manage_lineups,
        "can_import_data": checker.can_import_data,
        "can_manage_club": checker.can_manage_club,
        "linked_player_id": current_user.get("linked_player_id"),
    }


@api_router.get("/auth/profiles")
async def get_my_profiles(current_user: dict = Depends(get_current_user)):
    """Get all available profiles for the current user"""
    return await build_available_profiles(current_user)


# ==================== ONBOARDING ROUTES (Phase O1) ====================
# Admin onboarding wizard — shell + routing only. Subsequent phases
# (O2..O4) layer real club/season/team/member creation on top of this.

ONBOARDING_ALLOWED_ROLES = {"admin", "gestor_desportivo"}


def _ensure_onboarding_role(current_user: dict) -> None:
    """Reject non-admin roles. The wizard is admin/gestor_desportivo only."""
    role = current_user.get("role")
    if role not in ONBOARDING_ALLOWED_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Apenas administradores podem aceder ao onboarding",
        )


@api_router.get("/onboarding/status")
async def get_onboarding_status(current_user: dict = Depends(get_current_user)):
    """Return whether the current admin has finished the onboarding wizard."""
    _ensure_onboarding_role(current_user)
    completed_at = current_user.get("onboarding_completed_at")
    completed_at_iso: Optional[str] = None
    if isinstance(completed_at, datetime):
        completed_at_iso = completed_at.isoformat()
    elif isinstance(completed_at, str) and completed_at:
        completed_at_iso = completed_at
    return {
        "completed": completed_at_iso is not None,
        "completed_at": completed_at_iso,
    }


@api_router.post("/onboarding/complete")
async def complete_onboarding(current_user: dict = Depends(get_current_user)):
    """Mark the admin's onboarding wizard as completed.

    Idempotent: if already completed, returns the existing timestamp without
    overwriting it, so we keep the original finish date for analytics.
    """
    _ensure_onboarding_role(current_user)

    existing = current_user.get("onboarding_completed_at")
    if existing:
        completed_at_iso = (
            existing.isoformat() if isinstance(existing, datetime) else existing
        )
        return {"completed": True, "completed_at": completed_at_iso}

    now = datetime.now(timezone.utc)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"onboarding_completed_at": now.isoformat()}},
    )
    return {"completed": True, "completed_at": now.isoformat()}


# ==================== USER ROUTES ====================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(role: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if role:
        query["role"] = role
    users = await db.users.find(query, {"_id": 0, "hashed_password": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]


# ==================== ASSOCIATED ACCOUNTS ROUTES ====================
# NOTE: These routes MUST be defined BEFORE /users/{user_id} to avoid route conflicts

@api_router.get("/users/associated")
async def get_associated_accounts(current_user: dict = Depends(get_current_user)):
    """Get all accounts associated with the current user (children/athletes)"""
    associated_ids = current_user.get("associated_accounts", [])
    
    if not associated_ids:
        return []
    
    associated_users = await db.users.find(
        {"id": {"$in": associated_ids}},
        {"_id": 0, "hashed_password": 0}
    ).to_list(100)
    
    # Add relationship info
    for user in associated_users:
        user["relationship"] = "filho/a"
    
    return associated_users


@api_router.post("/users/associate")
async def associate_account(request: AssociateAccountRequest, current_user: dict = Depends(get_current_user)):
    """Associate a child/athlete account with the current user (parent/guardian)"""
    
    child = await db.users.find_one({"id": request.child_user_id}, {"_id": 0})
    if not child:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    if request.child_user_id in current_user.get("associated_accounts", []):
        raise HTTPException(status_code=400, detail="Conta já está associada")
    
    if child.get("parent_account_id"):
        raise HTTPException(status_code=400, detail="Esta conta já tem um responsável associado")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$addToSet": {"associated_accounts": request.child_user_id}}
    )
    
    await db.users.update_one(
        {"id": request.child_user_id},
        {"$set": {"parent_account_id": current_user["id"]}}
    )
    
    return {"message": f'Conta de {child["name"]} associada com sucesso', "child": child}


@api_router.post("/users/associate/search")
async def search_user_to_associate(email: str, current_user: dict = Depends(get_current_user)):
    """Search for a user by email to associate"""
    user = await db.users.find_one({"email": email}, {"_id": 0, "hashed_password": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado com este email")
    
    if user["id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Não pode associar a sua própria conta")
    
    if user["id"] in current_user.get("associated_accounts", []):
        raise HTTPException(status_code=400, detail="Esta conta já está associada")
    
    if user.get("parent_account_id"):
        raise HTTPException(status_code=400, detail="Esta conta já tem um responsável")
    
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "team_ids": user.get("team_ids", [])
    }


@api_router.delete("/users/associate/{child_id}")
async def remove_association(child_id: str, current_user: dict = Depends(get_current_user)):
    """Remove association with a child account"""
    
    if child_id not in current_user.get("associated_accounts", []):
        raise HTTPException(status_code=404, detail="Associação não encontrada")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$pull": {"associated_accounts": child_id}}
    )
    
    await db.users.update_one(
        {"id": child_id},
        {"$set": {"parent_account_id": None}}
    )
    
    return {"message": "Associação removida com sucesso"}


@api_router.put("/users/{user_id}/admin-role")
async def toggle_admin_role(user_id: str, role_data: dict, current_user: dict = Depends(get_current_user)):
    """Grant or revoke admin role - only admins can do this"""
    checker = get_permission_checker(current_user)
    
    if not checker.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem alterar roles de admin")
    
    # Can't remove own admin role
    if user_id == current_user["id"] and not role_data.get("is_admin", True):
        raise HTTPException(status_code=400, detail="Não pode remover o seu próprio role de admin")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    
    is_admin = role_data.get("is_admin", False)
    
    if is_admin:
        # Grant admin role
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"role": "admin"}}
        )
        return {"message": f'Role de admin concedido a {user["name"]}', "role": "admin"}
    else:
        # Remove admin role - set to most common role in their teams or jogador
        new_role = "jogador"
        team_roles = user.get("team_roles", {})
        if team_roles:
            # Use the most common role from their team roles
            roles_count = {}
            for role in team_roles.values():
                roles_count[role] = roles_count.get(role, 0) + 1
            if roles_count:
                new_role = max(roles_count, key=roles_count.get)
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"role": new_role}}
        )
        return {"message": f'Role de admin removido de {user["name"]}', "role": new_role}


class LinkPlayerRequest(BaseModel):
    """Request to link a family member to a player"""
    player_id: str


@api_router.post("/users/link-player")
async def link_family_member_to_player(request: LinkPlayerRequest, current_user: dict = Depends(get_current_user)):
    """Link a family member (responsavel) to a player they are responsible for"""
    
    # Only family members (responsavel) can be linked to players
    if current_user.get("role") != "responsavel":
        raise HTTPException(status_code=400, detail="Apenas responsáveis/familiares podem ser ligados a jogadores")
    
    # Check if player exists and is a player
    player = await db.users.find_one({"id": request.player_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Jogador não encontrado")
    
    if player.get("role") != "jogador":
        raise HTTPException(status_code=400, detail="O utilizador selecionado não é um jogador")
    
    # Update the family member with linked_player_id
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "linked_player_id": request.player_id,
            "team_ids": player.get("team_ids", [])  # Give family member access to player's teams
        }}
    )
    
    return {
        "message": f'Ligado com sucesso ao jogador {player["name"]}',
        "linked_player": {
            "id": player["id"],
            "name": player["name"],
            "team_ids": player.get("team_ids", [])
        }
    }


@api_router.post("/users/link-players")
async def link_multiple_players(request: dict, current_user: dict = Depends(get_current_user)):
    """Link a family member to multiple players - for family accounts"""
    
    # Only family members (responsavel/familiar) can be linked to players
    if current_user.get("role") not in ["responsavel", "familiar"]:
        raise HTTPException(status_code=400, detail="Apenas responsáveis/familiares podem ser ligados a jogadores")
    
    player_ids = request.get("player_ids", [])
    if not player_ids:
        raise HTTPException(status_code=400, detail="Deve fornecer pelo menos um jogador")
    
    # Verify all players exist
    players = await db.users.find({"id": {"$in": player_ids}, "role": "jogador"}, {"_id": 0}).to_list(100)
    
    if len(players) != len(player_ids):
        raise HTTPException(status_code=404, detail="Um ou mais jogadores não encontrados")
    
    # Collect all team_ids from linked players
    all_team_ids = set()
    for player in players:
        all_team_ids.update(player.get("team_ids", []))
    
    # Update the family member with linked_player_ids
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "linked_player_ids": player_ids,
            "linked_player_id": player_ids[0] if player_ids else None,  # Keep backwards compatibility
            "team_ids": list(all_team_ids)  # Give family member access to all linked players' teams
        }}
    )
    
    return {
        "message": f"Ligado com sucesso a {len(players)} jogador(es)",
        "linked_players": [{"id": p["id"], "name": p["name"]} for p in players]
    }


@api_router.delete("/users/link-player")
async def unlink_family_member_from_player(current_user: dict = Depends(get_current_user)):
    """Remove the link between a family member and a player"""
    
    if not current_user.get("linked_player_id"):
        raise HTTPException(status_code=400, detail="Não está ligado a nenhum jogador")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"linked_player_id": None}}
    )
    
    return {"message": "Ligação removida com sucesso"}


@api_router.post("/auth/switch-profile")
async def switch_profile(request: ActiveProfileRequest, current_user: dict = Depends(get_current_user)):
    """Switch to a different profile (self or associated account)"""
    
    if request.profile_type == "self":
        target_user = current_user
        active_role = request.active_role or current_user["role"]
    elif request.profile_type == "associated":
        if not request.associated_user_id:
            raise HTTPException(status_code=400, detail="ID da conta associada é obrigatório")
        
        if request.associated_user_id not in current_user.get("associated_accounts", []):
            raise HTTPException(status_code=403, detail="Conta não está associada a si")
        
        target_user = await db.users.find_one({"id": request.associated_user_id}, {"_id": 0, "hashed_password": 0})
        if not target_user:
            raise HTTPException(status_code=404, detail="Conta associada não encontrada")
        
        active_role = "responsavel"
    else:
        raise HTTPException(status_code=400, detail="Tipo de perfil inválido")
    
    teams = []
    for team_id in target_user.get("team_ids", []):
        team = await db.teams.find_one({"id": team_id}, {"_id": 0})
        if team:
            teams.append(team)
    
    return {
        "profile_type": request.profile_type,
        "viewing_as": {
            "id": target_user["id"],
            "name": target_user["name"],
            "role": active_role,
            "teams": teams
        },
        "original_user": {
            "id": current_user["id"],
            "name": current_user["name"]
        }
    }

# ==================== USER BY ID ROUTES ====================

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    return UserResponse(**user)

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    if current_user['id'] != user_id and not is_admin_role(current_user['role']):
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
            # First ensure profile object exists (to avoid "Cannot create field in null" error)
            await db.users.update_one(
                {"id": user_id, "profile": None},
                {"$set": {"profile": {}}}
            )
            # Then update the profile fields
            await db.users.update_one(
                {"id": user_id},
                {"$set": {f"profile.{k}": v for k, v in profile_data.items()}}
            )
    
    # Filter basic fields
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if filtered_updates:
        await db.users.update_one({"id": user_id}, {"$set": filtered_updates})
    
    return {"message": "Utilizador atualizado"}

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role_data: dict, current_user: dict = Depends(get_current_user)):
    """Update user role - Admin only"""
    if not is_admin_role(current_user['role']):
        raise HTTPException(status_code=403, detail="Apenas administradores podem alterar permissões")
    
    new_role = role_data.get('role')
    if new_role not in ['admin', 'gestor_desportivo', 'treinador', 'treinador_adjunto', 'delegado', 'jogador', 'responsavel']:
        raise HTTPException(status_code=400, detail="Role inválido")
    
    # Cannot demote yourself
    if current_user['id'] == user_id and not is_admin_role(new_role):
        raise HTTPException(status_code=400, detail="Não podes remover o teu próprio privilégio de admin")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    
    await db.users.update_one({"id": user_id}, {"$set": {"role": new_role}})
    
    return {"message": f"Permissão alterada para {new_role}"}

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
    if not is_admin_role(current_user['role']):
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
    
    if not is_admin_role(current_user['role']) and current_user['id'] not in club.get('admin_ids', []):
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    allowed_fields = ['name', 'logo_url', 'address', 'city', 'country', 'founded_year', 'website', 'email', 'phone', 'venue_name', 'venue_location', 'primary_color', 'secondary_color', 'accent_color', 'theme_mode', 'timezone', 'sidebar_accent_color']
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if filtered_updates:
        await db.clubs.update_one({"id": club_id}, {"$set": filtered_updates})
    
    return {"message": "Clube atualizado"}

# ==================== SEASONS ROUTES ====================

@api_router.post("/clubs/{club_id}/seasons")
async def create_season(club_id: str, season_data: SeasonCreate, current_user: dict = Depends(get_current_user)):
    """Create a new season for a club"""
    if current_user['role'] not in ['admin', 'gestor_desportivo']:
        raise HTTPException(status_code=403, detail="Sem permissão para criar temporadas")
    
    club = await db.clubs.find_one({"id": club_id})
    if not club:
        raise HTTPException(status_code=404, detail="Clube não encontrado")
    
    # If this season is active, deactivate all other seasons
    if season_data.is_active:
        await db.seasons.update_many(
            {"club_id": club_id},
            {"$set": {"is_active": False}}
        )
    
    season = Season(
        club_id=club_id,
        name=season_data.name,
        start_date=season_data.start_date,
        end_date=season_data.end_date,
        is_active=season_data.is_active
    )
    
    await db.seasons.insert_one(season.model_dump())
    
    return {"message": "Temporada criada", "season": season.model_dump()}

@api_router.get("/clubs/{club_id}/seasons")
async def get_seasons(club_id: str, current_user: dict = Depends(get_current_user)):
    """Get all seasons for a club"""
    seasons = await db.seasons.find({"club_id": club_id}, {"_id": 0}).sort("start_date", -1).to_list(100)
    return seasons

@api_router.get("/clubs/{club_id}/seasons/active")
async def get_active_season(club_id: str, current_user: dict = Depends(get_current_user)):
    """Get the active season for a club"""
    season = await db.seasons.find_one({"club_id": club_id, "is_active": True}, {"_id": 0})
    return season

@api_router.put("/clubs/{club_id}/seasons/{season_id}")
async def update_season(club_id: str, season_id: str, updates: SeasonUpdate, current_user: dict = Depends(get_current_user)):
    """Update a season"""
    if current_user['role'] not in ['admin', 'gestor_desportivo']:
        raise HTTPException(status_code=403, detail="Sem permissão para editar temporadas")
    
    season = await db.seasons.find_one({"id": season_id, "club_id": club_id})
    if not season:
        raise HTTPException(status_code=404, detail="Temporada não encontrada")
    
    update_data = updates.model_dump(exclude_unset=True)
    
    # If setting this season as active, deactivate others
    if update_data.get('is_active'):
        await db.seasons.update_many(
            {"club_id": club_id, "id": {"$ne": season_id}},
            {"$set": {"is_active": False}}
        )
    
    if update_data:
        await db.seasons.update_one({"id": season_id}, {"$set": update_data})
    
    return {"message": "Temporada atualizada"}

@api_router.delete("/clubs/{club_id}/seasons/{season_id}")
async def delete_season(club_id: str, season_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a season"""
    if current_user['role'] not in ['admin', 'gestor_desportivo']:
        raise HTTPException(status_code=403, detail="Sem permissão para eliminar temporadas")
    
    result = await db.seasons.delete_one({"id": season_id, "club_id": club_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Temporada não encontrada")
    
    return {"message": "Temporada eliminada"}

@api_router.put("/clubs/{club_id}/seasons/{season_id}/activate")
async def activate_season(club_id: str, season_id: str, current_user: dict = Depends(get_current_user)):
    """Set a season as active (deactivates all others)"""
    if current_user['role'] not in ['admin', 'gestor_desportivo']:
        raise HTTPException(status_code=403, detail="Sem permissão para ativar temporadas")
    
    season = await db.seasons.find_one({"id": season_id, "club_id": club_id})
    if not season:
        raise HTTPException(status_code=404, detail="Temporada não encontrada")
    
    # Deactivate all seasons
    await db.seasons.update_many({"club_id": club_id}, {"$set": {"is_active": False}})
    
    # Activate this season
    await db.seasons.update_one({"id": season_id}, {"$set": {"is_active": True}})
    
    return {"message": "Temporada ativada"}

# ==================== SUBSCRIPTION ROUTES ====================

@api_router.get("/subscription")
async def get_subscription(current_user: dict = Depends(get_current_user)):
    """Get subscription for current user's club"""
    if current_user['role'] not in ['admin', 'gestor_desportivo']:
        raise HTTPException(status_code=403, detail="Sem permissão para ver subscrição")
    
    # Get club
    club = await db.clubs.find_one({}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=404, detail="Clube não encontrado")
    
    # Get or create subscription
    subscription = await db.subscriptions.find_one({"club_id": club['id']}, {"_id": 0})
    
    if not subscription:
        # Create default subscription
        from datetime import timedelta
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        one_year_later = (datetime.now(timezone.utc) + timedelta(days=365)).strftime("%Y-%m-%d")
        
        # Count active members
        member_count = await db.users.count_documents({"is_archived": {"$ne": True}})
        
        new_subscription = Subscription(
            club_id=club['id'],
            plan_type="standard",
            start_date=today,
            end_date=one_year_later,
            status="active",
            payment_method="bank_transfer",
            member_count=member_count
        )
        await db.subscriptions.insert_one(new_subscription.model_dump())
        subscription = new_subscription.model_dump()
    
    # Update member count
    member_count = await db.users.count_documents({"is_archived": {"$ne": True}})
    if subscription.get('member_count') != member_count:
        await db.subscriptions.update_one(
            {"id": subscription['id']},
            {"$set": {"member_count": member_count}}
        )
        subscription['member_count'] = member_count
    
    return subscription

@api_router.patch("/subscription")
async def update_subscription(updates: SubscriptionUpdate, current_user: dict = Depends(get_current_user)):
    """Update subscription settings"""
    if current_user['role'] not in ['admin', 'gestor_desportivo']:
        raise HTTPException(status_code=403, detail="Sem permissão para editar subscrição")
    
    club = await db.clubs.find_one({}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=404, detail="Clube não encontrado")
    
    subscription = await db.subscriptions.find_one({"club_id": club['id']})
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscrição não encontrada")
    
    update_data = updates.model_dump(exclude_unset=True)
    if update_data:
        await db.subscriptions.update_one(
            {"id": subscription['id']},
            {"$set": update_data}
        )
    
    return {"message": "Subscrição atualizada"}

@api_router.post("/subscription/cancel")
async def cancel_subscription(current_user: dict = Depends(get_current_user)):
    """Cancel the subscription"""
    if not is_admin_role(current_user['role']):
        raise HTTPException(status_code=403, detail="Apenas administradores podem cancelar subscrições")
    
    club = await db.clubs.find_one({}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=404, detail="Clube não encontrado")
    
    subscription = await db.subscriptions.find_one({"club_id": club['id']})
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscrição não encontrada")
    
    await db.subscriptions.update_one(
        {"id": subscription['id']},
        {"$set": {"status": "cancelled"}}
    )
    
    return {"message": "Subscrição cancelada"}

@api_router.get("/subscription/invoices")
async def get_invoices(current_user: dict = Depends(get_current_user)):
    """Get all invoices for the subscription"""
    if current_user['role'] not in ['admin', 'gestor_desportivo']:
        raise HTTPException(status_code=403, detail="Sem permissão para ver faturas")
    
    club = await db.clubs.find_one({}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=404, detail="Clube não encontrado")
    
    subscription = await db.subscriptions.find_one({"club_id": club['id']}, {"_id": 0})
    if not subscription:
        return []
    
    invoices = await db.subscription_invoices.find(
        {"subscription_id": subscription['id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return invoices

@api_router.post("/subscription/invoices")
async def create_invoice(invoice_data: SubscriptionInvoiceCreate, current_user: dict = Depends(get_current_user)):
    """Create a new invoice (admin only)"""
    if not is_admin_role(current_user['role']):
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar faturas")
    
    club = await db.clubs.find_one({}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=404, detail="Clube não encontrado")
    
    subscription = await db.subscriptions.find_one({"club_id": club['id']})
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscrição não encontrada")
    
    # Generate invoice number
    count = await db.subscription_invoices.count_documents({"club_id": club['id']})
    invoice_number = f"INV-{datetime.now().year}-{str(count + 1).zfill(3)}"
    
    invoice = SubscriptionInvoice(
        subscription_id=subscription['id'],
        club_id=club['id'],
        invoice_number=invoice_number,
        start_date=invoice_data.start_date,
        end_date=invoice_data.end_date,
        paying_members=invoice_data.paying_members,
        price_per_member=invoice_data.price_per_member,
        total_due=invoice_data.total_due,
        status="pending"
    )
    
    await db.subscription_invoices.insert_one(invoice.model_dump())
    
    return {"message": "Fatura criada", "invoice": invoice.model_dump()}

@api_router.get("/subscription/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific invoice"""
    if current_user['role'] not in ['admin', 'gestor_desportivo']:
        raise HTTPException(status_code=403, detail="Sem permissão para ver faturas")
    
    invoice = await db.subscription_invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    
    return invoice

@api_router.get("/subscription/invoices/{invoice_id}/download")
async def download_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    """Get download link for invoice"""
    if current_user['role'] not in ['admin', 'gestor_desportivo']:
        raise HTTPException(status_code=403, detail="Sem permissão para descarregar faturas")
    
    invoice = await db.subscription_invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    
    if not invoice.get('file_url'):
        raise HTTPException(status_code=404, detail="Ficheiro da fatura não disponível")
    
    return {"download_url": invoice['file_url']}

@api_router.patch("/subscription/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    """Update an invoice (mark as paid, etc.)"""
    if not is_admin_role(current_user['role']):
        raise HTTPException(status_code=403, detail="Apenas administradores podem editar faturas")
    
    invoice = await db.subscription_invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    
    allowed_fields = ['status', 'total_paid', 'paid_at', 'file_url']
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if filtered_updates:
        await db.subscription_invoices.update_one(
            {"id": invoice_id},
            {"$set": filtered_updates}
        )
    
    return {"message": "Fatura atualizada"}

# ==================== PERMISSIONS ROUTES ====================

@api_router.get("/permissions/defaults")
async def get_default_permissions(current_user: dict = Depends(get_current_user)):
    """Get default permissions for all roles"""
    if not is_admin_role(current_user['role']):
        raise HTTPException(status_code=403, detail="Apenas administradores podem ver permissões")
    return DEFAULT_PERMISSIONS

@api_router.get("/permissions/{user_id}")
async def get_user_permissions_endpoint(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get effective permissions for a specific user"""
    if not is_admin_role(current_user['role']) and current_user['id'] != user_id:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    
    return get_user_permissions(user)

@api_router.put("/permissions/{user_id}")
async def update_user_permissions(user_id: str, permissions: dict, current_user: dict = Depends(get_current_user)):
    """Update custom permissions for a user (admin only)"""
    if not is_admin_role(current_user['role']):
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

# ==================== GUARDIAN (PARENT) ROUTES ====================

@api_router.get("/guardian/children")
async def get_guardian_children(current_user: dict = Depends(get_current_user)):
    """
    Get list of children (linked players) for a guardian/parent user.
    Returns children with their teams count.
    """
    user_role = current_user.get('role')
    
    # Only responsavel (parent/guardian) can access this
    if user_role != 'responsavel':
        raise HTTPException(status_code=403, detail="Apenas responsáveis podem aceder a esta funcionalidade")
    
    # Get linked player IDs from user
    linked_player_ids = current_user.get('linked_player_ids', [])
    linked_player_id = current_user.get('linked_player_id')
    
    # Combine both fields (backwards compatibility)
    all_linked = list(set(linked_player_ids + ([linked_player_id] if linked_player_id else [])))
    
    if not all_linked:
        return []
    
    # Fetch children data
    children = []
    for child_id in all_linked:
        child = await db.users.find_one({"id": child_id}, {"_id": 0, "password": 0})
        if child:
            # Count teams
            team_ids = child.get('team_ids', [])
            children.append({
                "id": child['id'],
                "name": child.get('name', 'Atleta'),
                "avatar_url": child.get('avatar_url'),
                "email": child.get('email'),
                "role": child.get('role'),
                "teams_count": len(team_ids),
                "team_ids": team_ids
            })
    
    return children

@api_router.get("/guardian/children/{child_id}/teams")
async def get_guardian_child_teams(child_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get teams and clubs for a specific child.
    Returns same structure as "As minhas equipas".
    """
    user_role = current_user.get('role')
    
    # Only responsavel (parent/guardian) can access this
    if user_role != 'responsavel':
        raise HTTPException(status_code=403, detail="Apenas responsáveis podem aceder a esta funcionalidade")
    
    # Verify that child is linked to this parent
    linked_player_ids = current_user.get('linked_player_ids', [])
    linked_player_id = current_user.get('linked_player_id')
    all_linked = list(set(linked_player_ids + ([linked_player_id] if linked_player_id else [])))
    
    if child_id not in all_linked:
        raise HTTPException(status_code=403, detail="Este atleta não está associado à sua conta")
    
    # Fetch child data
    child = await db.users.find_one({"id": child_id}, {"_id": 0})
    if not child:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")
    
    # Get child's teams
    child_team_ids = child.get('team_ids', [])
    
    teams = []
    if child_team_ids:
        teams = await db.teams.find({"id": {"$in": child_team_ids}}, {"_id": 0}).to_list(100)
        
        # Add child's role in each team
        for team in teams:
            team_role = 'jogador'  # Default
            if child_id in team.get('coach_ids', []):
                team_role = 'treinador'
            elif child_id in team.get('assistant_coach_ids', []):
                team_role = 'treinador_adjunto'
            elif child_id in team.get('delegate_ids', []):
                team_role = 'delegado'
            team['child_role'] = team_role
            team['child_name'] = child.get('name', 'Atleta').split(' ')[0]
    
    # Get club data
    clubs = await db.clubs.find({}, {"_id": 0}).to_list(10)
    club = clubs[0] if clubs else None
    
    return {
        "child": {
            "id": child['id'],
            "name": child.get('name'),
            "avatar_url": child.get('avatar_url')
        },
        "teams": teams,
        "club": club
    }

# ==================== TEAM ROUTES ====================

@api_router.post("/teams", response_model=Team)
async def create_team(team_data: TeamCreate, current_user: dict = Depends(get_current_user)):
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_team:
        raise HTTPException(status_code=403, detail="Sem permissão para criar equipas")
    
    team = Team(**team_data.model_dump())
    if checker.is_coach and not checker.is_admin:
        team.coach_ids.append(current_user['id'])
    
    team_dict = team.model_dump()
    team_dict['created_at'] = team_dict['created_at'].isoformat()
    await db.teams.insert_one(team_dict)
    return team

@api_router.get("/teams", response_model=List[Team])
async def get_teams(current_user: dict = Depends(get_current_user)):
    checker = get_permission_checker(current_user)
    
    if checker.is_admin:
        teams = await db.teams.find({}, {"_id": 0}).to_list(100)
    else:
        # Filter teams based on user's team_ids
        user_team_ids = list(checker.team_ids)
        if user_team_ids:
            teams = await db.teams.find({"id": {"$in": user_team_ids}}, {"_id": 0}).to_list(100)
        else:
            # Legacy fallback: check if user is in team's coach/delegate/player lists
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
    checker = get_permission_checker(current_user)
    
    # Check team access (admin can access all, others need team assignment)
    if not checker.is_admin and not checker.can_access_team(team_id):
        raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")
    
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Equipa não encontrada")
    if isinstance(team.get('created_at'), str):
        team['created_at'] = datetime.fromisoformat(team['created_at'])
    return team

@api_router.put("/teams/{team_id}")
async def update_team(team_id: str, team_data: TeamUpdate, current_user: dict = Depends(get_current_user)):
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_team:
        raise HTTPException(status_code=403, detail="Sem permissão para editar equipas")
    
    if not checker.is_admin and not checker.can_access_team(team_id):
        raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")
    
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Equipa não encontrada")
    
    # Build update dict with non-None values
    update_data = {k: v for k, v in team_data.model_dump().items() if v is not None}
    
    if update_data:
        await db.teams.update_one({"id": team_id}, {"$set": update_data})
    
    updated_team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    return updated_team

@api_router.delete("/teams/{team_id}")
async def delete_team(team_id: str, current_user: dict = Depends(get_current_user)):
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_club:
        raise HTTPException(status_code=403, detail="Apenas administradores podem eliminar equipas")
    
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Equipa não encontrada")
    
    # Remove team from all users
    await db.users.update_many(
        {"team_ids": team_id},
        {"$pull": {"team_ids": team_id}}
    )
    
    # Delete related events
    await db.events.delete_many({"team_id": team_id})
    
    # Delete related championships
    await db.championships.delete_many({"team_id": team_id})
    
    # Delete the team
    await db.teams.delete_one({"id": team_id})
    
    return {"message": "Equipa eliminada com sucesso"}


@api_router.post("/teams/{team_id}/members")
async def add_team_member(team_id: str, member_data: dict, current_user: dict = Depends(get_current_user)):
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_team:
        raise HTTPException(status_code=403, detail="Sem permissão para gerir membros")
    
    if not checker.is_admin and not checker.can_access_team(team_id):
        raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")
    
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Equipa não encontrada")
    
    user_id = member_data.get('user_id')
    role = member_data.get('role', 'jogador')
    
    # Map role to team field
    field_map = {'treinador': 'coach_ids', 'treinador_adjunto': 'coach_ids', 'delegado': 'delegate_ids', 'jogador': 'player_ids', 'responsavel': 'player_ids', 'familiar': 'player_ids'}
    field = field_map.get(role, 'player_ids')
    
    # Add to team
    await db.teams.update_one({"id": team_id}, {"$addToSet": {field: user_id}})
    
    # Update user: add team_id and set team_roles mapping
    await db.users.update_one(
        {"id": user_id}, 
        {
            "$addToSet": {"team_ids": team_id},
            "$set": {f"team_roles.{team_id}": role}
        }
    )
    
    return {"message": "Membro adicionado à equipa", "role": role}

@api_router.put("/teams/{team_id}/members/{user_id}/role")
async def update_team_member_role(team_id: str, user_id: str, role_data: dict, current_user: dict = Depends(get_current_user)):
    """Update a member's role within a specific team"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_team:
        raise HTTPException(status_code=403, detail="Sem permissão para gerir membros")
    
    if not checker.is_admin and not checker.can_access_team(team_id):
        raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")
    
    new_role = role_data.get('role', 'jogador')
    
    # Remove from old field and add to new field in team
    await db.teams.update_one(
        {"id": team_id}, 
        {"$pull": {"coach_ids": user_id, "delegate_ids": user_id, "player_ids": user_id}}
    )
    
    field_map = {'treinador': 'coach_ids', 'treinador_adjunto': 'coach_ids', 'delegado': 'delegate_ids', 'jogador': 'player_ids', 'responsavel': 'player_ids', 'familiar': 'player_ids'}
    field = field_map.get(new_role, 'player_ids')
    
    await db.teams.update_one({"id": team_id}, {"$addToSet": {field: user_id}})
    
    # Update team_roles mapping
    await db.users.update_one(
        {"id": user_id},
        {"$set": {f"team_roles.{team_id}": new_role}}
    )
    
    return {"message": "Role atualizado", "role": new_role}

@api_router.delete("/teams/{team_id}/members/{user_id}")
async def remove_team_member(team_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_team:
        raise HTTPException(status_code=403, detail="Sem permissão para gerir membros")
    
    if not checker.is_admin and not checker.can_access_team(team_id):
        raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")
    
    await db.teams.update_one({"id": team_id}, {"$pull": {"coach_ids": user_id, "delegate_ids": user_id, "player_ids": user_id}})
    await db.users.update_one({"id": user_id}, {"$pull": {"team_ids": team_id}})
    
    return {"message": "Membro removido da equipa"}

@api_router.get("/teams/{team_id}/members")
async def get_team_members(team_id: str, current_user: dict = Depends(get_current_user)):
    checker = get_permission_checker(current_user)
    
    # Check team access
    if not checker.is_admin and not checker.can_access_team(team_id):
        raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")
    
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Equipa não encontrada")
    
    all_ids = team.get('coach_ids', []) + team.get('delegate_ids', []) + team.get('player_ids', [])
    
    # For family members, only show linked player
    if checker.is_family_member and checker.linked_player_id:
        if checker.linked_player_id in all_ids:
            all_ids = [checker.linked_player_id]
        else:
            all_ids = []
    
    # For players, show all team members (read-only view)
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
    club_id: Optional[str] = None
    jersey_number: Optional[str] = None
    position: Optional[str] = None
    phone: Optional[str] = None
    nationalities: Optional[List[str]] = None


class MemberUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    jersey_number: Optional[str] = None
    position: Optional[str] = None
    phone: Optional[str] = None
    nationalities: Optional[List[str]] = None
    is_archived: Optional[bool] = None
    is_activated: Optional[bool] = None
    invite_token: Optional[str] = None
    invite_expires_at: Optional[str] = None


@api_router.post("/members")
async def create_member(data: MemberCreate, current_user: dict = Depends(get_current_user)):
    """Create a new member (user) associated with the club with pending activation"""
    checker = get_permission_checker(current_user)

    if not checker.can_manage_team:
        raise HTTPException(status_code=403, detail="Sem permissão para criar membros")

    if data.team_id and not checker.is_admin and not checker.can_access_team(data.team_id):
        raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")

    club_id = data.club_id
    if not club_id:
        club = await db.clubs.find_one({}, {"_id": 0, "id": 1})
        if club:
            club_id = club["id"]

    existing_user = await db.users.find_one({"email": data.email.strip().lower()}, {"_id": 0})
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Já existe um utilizador com este email. Use 'Adicionar membros do clube'."
        )

    user_id = str(uuid.uuid4())
    invite_token = secrets.token_urlsafe(32)
    invite_expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

    user = {
        "id": user_id,
        "name": data.name,
        "email": data.email.strip().lower(),
        "hashed_password": None,
        "role": data.role,
        "club_id": club_id,
        "team_ids": [data.team_id] if data.team_id else [],
        "is_activated": False,
        "invite_token": invite_token,
        "invite_expires_at": invite_expires_at,
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

    if data.team_id:
        field_map = {
            "treinador": "coach_ids",
            "treinador_adjunto": "assistant_coach_ids",
            "delegado": "delegate_ids"
        }
        field = field_map.get(data.role, "player_ids")
        await db.teams.update_one({"id": data.team_id}, {"$addToSet": {field: user_id}})

    frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
    activation_link = f"{frontend_url}/activate-account?token={invite_token}" if frontend_url else ""

    # Phase E2: dispatch activation email via the new service. Failure to
    # send must NOT abort the user creation flow; activation_link is still
    # returned so the operator can hand it over manually if needed.
    try:
        await send_activation_email(
            to_email=user["email"],
            name=user["name"],
            token=invite_token,
            idempotency_key=f"member-create-{user_id}",
        )
    except Exception as e:
        logger.warning(f"[ACTIVATION EMAIL] failed to send to {user['email']}: {e}")

    safe_user = {k: v for k, v in user.items() if k not in ("hashed_password", "_id")}

    return {
        "user": safe_user,
        "activation_link": activation_link,
        "invite_token": invite_token
    }


@api_router.get("/clubs/{club_id}/members")
async def get_club_members(club_id: str, current_user: dict = Depends(get_current_user)):
    """Get all members that belong to the club"""
    members = await db.users.find(
        {"club_id": club_id, "role": {"$ne": "admin"}},
        {"_id": 0, "hashed_password": 0}
    ).to_list(500)
    return members


@api_router.post("/members/{member_id}/send-invite")
async def send_member_invite(member_id: str, current_user: dict = Depends(get_current_user)):
    checker = get_permission_checker(current_user)

    if not checker.can_manage_team:
        raise HTTPException(status_code=403, detail="Sem permissão para enviar convites")

    user = await db.users.find_one({"id": member_id}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Membro não encontrado")

    if user.get("is_activated"):
        raise HTTPException(status_code=400, detail="A conta já está ativada")

    invite_token = secrets.token_urlsafe(32)
    invite_expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

    await db.users.update_one(
        {"id": member_id},
        {
            "$set": {
                "invite_token": invite_token,
                "invite_expires_at": invite_expires_at
            }
        }
    )

    frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
    activation_link = f"{frontend_url}/activate-account?token={invite_token}" if frontend_url else ""

    # Phase E2: dispatch the activation email. Email failure does not abort
    # the flow — operator still gets the activation_link in the response.
    try:
        await send_activation_email(
            to_email=user["email"],
            name=user.get("name", "Atleta"),
            token=invite_token,
            idempotency_key=f"send-invite-{member_id}-{invite_token[:8]}",
        )
    except Exception as e:
        logger.warning(f"[ACTIVATION EMAIL] send-invite to {user.get('email')}: {e}")

    return {
        "message": "Convite gerado com sucesso",
        "activation_link": activation_link
    }


@api_router.get("/clubs/{club_id}/members/search")
async def search_club_members(
    club_id: str,
    query: str,
    current_user: dict = Depends(get_current_user)
):
    checker = get_permission_checker(current_user)

    if not checker.can_manage_team:
        raise HTTPException(status_code=403, detail="Sem permissão")

    members = await db.users.find(
        {
            "club_id": club_id,
            "role": {"$ne": "admin"},
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"email": {"$regex": query, "$options": "i"}}
            ]
        },
        {"_id": 0, "hashed_password": 0}
    ).to_list(50)

    return members


@api_router.post("/teams/{team_id}/add-existing-member/{member_id}")
async def add_existing_member_to_team(
    team_id: str,
    member_id: str,
    current_user: dict = Depends(get_current_user)
):
    checker = get_permission_checker(current_user)

    if not checker.can_manage_team:
        raise HTTPException(status_code=403, detail="Sem permissão")

    if not checker.is_admin and not checker.can_access_team(team_id):
        raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")

    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Equipa não encontrada")

    user = await db.users.find_one({"id": member_id}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Membro não encontrado")

    role = user.get("role", "jogador")
    field_map = {
        "treinador": "coach_ids",
        "treinador_adjunto": "assistant_coach_ids",
        "delegado": "delegate_ids"
    }
    field = field_map.get(role, "player_ids")

    await db.teams.update_one({"id": team_id}, {"$addToSet": {field: member_id}})
    await db.users.update_one({"id": member_id}, {"$addToSet": {"team_ids": team_id}})

    return {"message": "Membro adicionado à equipa com sucesso"}


@api_router.post("/members/import")
async def import_members(file: UploadFile = File(...), team_id: str = None, club_id: str = None, current_user: dict = Depends(get_current_user)):
    """Import members from Excel/CSV file - members are associated with the club with pending activation"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_import_data:
        raise HTTPException(status_code=403, detail="Sem permissão para importar dados")
    
    if team_id and not checker.is_admin and not checker.can_access_team(team_id):
        raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")
    
    if not club_id:
        club = await db.clubs.find_one({}, {"_id": 0, "id": 1})
        if club:
            club_id = club["id"]
    
    content = await file.read()
    results = {"success": 0, "errors": [], "created": [], "warnings": []}
    
    try:
        if file.filename.endswith(".csv"):
            import csv
            reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
            rows = list(reader)
        else:
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
                import csv
                reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
                rows = list(reader)
        
        for row in rows:
            try:
                nome = (row.get("Nome") or row.get("nome") or row.get("Nombre") or row.get("nombre") or 
                       row.get("Prénom") or row.get("prenom") or row.get("prénom") or 
                       row.get("First Name") or row.get("first_name") or row.get("name") or "")
                
                apelido = (row.get("Apelido") or row.get("apelido") or row.get("Sobrenome") or row.get("sobrenome") or
                          row.get("Apellido") or row.get("apellido") or 
                          row.get("Nom") or row.get("nom") or 
                          row.get("Cognome") or row.get("cognome") or
                          row.get("Surname") or row.get("surname") or row.get("last_name") or "")
                
                data_nascimento = (row.get("Data de Nascimento") or row.get("data_nascimento") or row.get("nascimento") or
                                  row.get("Fecha de Nacimiento") or row.get("fecha_nacimiento") or
                                  row.get("Date de Naissance") or row.get("date_naissance") or
                                  row.get("Data di Nascita") or row.get("data_nascita") or
                                  row.get("Date of Birth") or row.get("birth_date") or row.get("dob") or "")
                
                email = (row.get("Email") or row.get("email") or row.get("E-mail") or row.get("e-mail") or
                        row.get("Correo") or row.get("correo") or "")
                
                funcao = (row.get("Função") or row.get("funcao") or row.get("função") or
                         row.get("Rol") or row.get("rol") or
                         row.get("Fonction") or row.get("fonction") or
                         row.get("Ruolo") or row.get("ruolo") or
                         row.get("Role") or row.get("role") or "jogador")
                
                numero = (row.get("Número") or row.get("numero") or row.get("Nº") or row.get("nº") or row.get("N") or row.get("n") or
                         row.get("Numero") or
                         row.get("Numéro") or row.get("numéro") or
                         row.get("Number") or row.get("number") or row.get("Jersey") or row.get("jersey") or "")
                
                posicao = (row.get("Posição") or row.get("posicao") or row.get("posição") or
                          row.get("Posición") or row.get("posicion") or
                          row.get("Poste") or row.get("poste") or
                          row.get("Posizione") or row.get("posizione") or
                          row.get("Position") or row.get("position") or "")
                
                telefone = (row.get("Telefone") or row.get("telefone") or row.get("contacto") or
                           row.get("Teléfono") or row.get("telefono") or
                           row.get("Téléphone") or row.get("téléphone") or row.get("telephone") or
                           row.get("Telefono") or
                           row.get("Phone") or row.get("phone") or "")
                
                nacionalidade = (row.get("Nacionalidade") or row.get("nacionalidade") or
                                row.get("Nacionalidad") or row.get("nacionalidad") or
                                row.get("Nationalité") or row.get("nationalité") or row.get("nationalite") or
                                row.get("Nazionalità") or row.get("nazionalità") or row.get("nazionalita") or
                                row.get("Nationality") or row.get("nationality") or "")
                
                sexo = (row.get("Sexo") or row.get("sexo") or
                       row.get("Sexe") or row.get("sexe") or
                       row.get("Sesso") or row.get("sesso") or
                       row.get("Gender") or row.get("gender") or row.get("Sex") or row.get("sex") or "")
                
                full_name = f"{nome} {apelido}".strip() if apelido else nome.strip()
                
                if not full_name or not email:
                    results["errors"].append(f"Linha sem nome ou email: {row}")
                    continue

                normalized_email = email.strip().lower()
                existing_user = await db.users.find_one({"email": normalized_email}, {"_id": 0})
                if existing_user:
                    results["warnings"].append(f"Email já existente no clube/sistema: {normalized_email}")
                    continue
                
                user_id = str(uuid.uuid4())
                invite_token = secrets.token_urlsafe(32)
                invite_expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
                
                funcao_map = {
                    "administrador": "admin",
                    "admin": "admin",
                    "gestor desportivo": "gestor_desportivo",
                    "gestor_desportivo": "gestor_desportivo",
                    "diretor desportivo": "gestor_desportivo",
                    "treinador": "treinador",
                    "treinador principal": "treinador",
                    "treinador adjunto": "treinador_adjunto",
                    "adjunto": "treinador_adjunto",
                    "delegado": "delegado",
                    "jogador": "jogador",
                    "atleta": "jogador",
                    "responsavel": "responsavel",
                    "responsável": "responsavel",
                    "pai": "responsavel",
                    "mãe": "responsavel",
                    "encarregado": "responsavel",
                    "administrator": "admin",
                    "sports manager": "gestor_desportivo",
                    "sports director": "gestor_desportivo",
                    "coach": "treinador",
                    "head coach": "treinador",
                    "assistant coach": "treinador_adjunto",
                    "assistant": "treinador_adjunto",
                    "delegate": "delegado",
                    "team manager": "delegado",
                    "player": "jogador",
                    "guardian": "responsavel",
                    "parent": "responsavel",
                    "family": "responsavel",
                    "gestor deportivo": "gestor_desportivo",
                    "director deportivo": "gestor_desportivo",
                    "entrenador": "treinador",
                    "entrenador principal": "treinador",
                    "entrenador asistente": "treinador_adjunto",
                    "entrenador adjunto": "treinador_adjunto",
                    "jugador": "jogador",
                    "responsable": "responsavel",
                    "familiar": "responsavel",
                    "administrateur": "admin",
                    "responsable sportif": "gestor_desportivo",
                    "directeur sportif": "gestor_desportivo",
                    "entraîneur": "treinador",
                    "entraineur": "treinador",
                    "entraîneur adjoint": "treinador_adjunto",
                    "entraineur adjoint": "treinador_adjunto",
                    "délégué": "delegado",
                    "delegue": "delegado",
                    "joueur": "jogador",
                    "amministratore": "admin",
                    "responsabile sportivo": "gestor_desportivo",
                    "direttore sportivo": "gestor_desportivo",
                    "allenatore": "treinador",
                    "allenatore in seconda": "treinador_adjunto",
                    "vice allenatore": "treinador_adjunto",
                    "delegato": "delegado",
                    "giocatore": "jogador",
                }
                role = funcao_map.get(funcao.lower().strip(), "jogador") if funcao else "jogador"
                
                posicao_map = {
                    "guarda-redes": "GR",
                    "gr": "GR",
                    "goalkeeper": "GR",
                    "portero": "GR",
                    "jogador de campo": "JC",
                    "jc": "JC",
                    "field player": "JC",
                    "jugador de campo": "JC",
                    "avançado": "JC",
                    "defesa": "JC",
                }
                normalized_position = posicao_map.get(str(posicao).lower().strip(), str(posicao).strip().upper() if posicao else "")
                
                sexo_map = {
                    "masculino": "Masculino",
                    "m": "Masculino",
                    "male": "Masculino",
                    "hombre": "Masculino",
                    "feminino": "Feminino",
                    "f": "Feminino",
                    "female": "Feminino",
                    "mujer": "Feminino",
                }
                normalized_gender = sexo_map.get(str(sexo).lower().strip(), "") if sexo else ""
                
                nationalities = []
                if nacionalidade:
                    nationality_map = {
                        "portuguesa": "PT", "portugal": "PT", "pt": "PT",
                        "espanhola": "ES", "espanha": "ES", "spain": "ES", "es": "ES", "española": "ES",
                        "francesa": "FR", "frança": "FR", "france": "FR", "fr": "FR",
                        "brasileira": "BR", "brasil": "BR", "brazil": "BR", "br": "BR",
                        "italiana": "IT", "itália": "IT", "italy": "IT", "it": "IT",
                        "alemã": "DE", "alemanha": "DE", "germany": "DE", "de": "DE",
                        "inglesa": "GB", "inglaterra": "GB", "uk": "GB", "gb": "GB", "england": "GB",
                        "americana": "US", "eua": "US", "usa": "US", "us": "US",
                        "angolana": "AO", "angola": "AO", "ao": "AO",
                        "moçambicana": "MZ", "moçambique": "MZ", "mozambique": "MZ", "mz": "MZ",
                        "cabo-verdiana": "CV", "cabo verde": "CV", "cv": "CV",
                        "guineense": "GW", "guiné-bissau": "GW", "gw": "GW",
                        "são-tomense": "ST", "são tomé": "ST", "st": "ST",
                        "holandesa": "NL", "holanda": "NL", "netherlands": "NL", "nl": "NL",
                        "belga": "BE", "bélgica": "BE", "belgium": "BE", "be": "BE",
                        "suíça": "CH", "switzerland": "CH", "ch": "CH",
                        "argentina": "AR", "ar": "AR",
                        "marroquina": "MA", "marrocos": "MA", "morocco": "MA", "ma": "MA",
                        "romena": "RO", "roménia": "RO", "romania": "RO", "ro": "RO",
                    }
                    nat_parts = [n.strip() for n in str(nacionalidade).replace(";", ",").split(",")]
                    for nat in nat_parts:
                        if nat:
                            code = nationality_map.get(nat.lower(), nat.upper()[:2] if len(nat) == 2 else None)
                            if code and code not in nationalities:
                                nationalities.append(code)
                
                user = {
                    "id": user_id,
                    "name": full_name,
                    "email": normalized_email,
                    "hashed_password": None,
                    "role": role,
                    "club_id": club_id,
                    "team_ids": [team_id] if team_id else [],
                    "nationalities": nationalities[:2],
                    "is_activated": False,
                    "invite_token": invite_token,
                    "invite_expires_at": invite_expires_at,
                    "profile": {
                        "sports_info": {
                            "jersey_number": str(numero).strip() if numero else "",
                            "position": normalized_position
                        },
                        "identity": {
                            "phone": str(telefone).strip() if telefone else "",
                            "birth_date": str(data_nascimento).strip() if data_nascimento else "",
                            "gender": normalized_gender
                        }
                    },
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.users.insert_one(user)
                
                if team_id:
                    field_map = {
                        "treinador": "coach_ids",
                        "treinador_adjunto": "assistant_coach_ids",
                        "delegado": "delegate_ids"
                    }
                    field = field_map.get(role, "player_ids")
                    await db.teams.update_one({"id": team_id}, {"$addToSet": {field: user_id}})
                
                frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
                activation_link = f"{frontend_url}/activate-account?token={invite_token}" if frontend_url else ""

                results["success"] += 1
                results["created"].append({
                    "name": full_name,
                    "email": normalized_email,
                    "activation_link": activation_link
                })
                
            except Exception as e:
                results["errors"].append(f"Erro na linha: {str(e)}")
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar ficheiro: {str(e)}")
    
    return results

@api_router.post("/members/{member_id}/teams/{team_id}")
async def add_member_to_team(member_id: str, team_id: str, current_user: dict = Depends(get_current_user)):
    """Add a club member to a team"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_team:
        raise HTTPException(status_code=403, detail="Sem permissão para gerir membros")
    
    # Check team access
    if not checker.is_admin and not checker.can_access_team(team_id):
        raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")
    
    # Get the member
    member = await db.users.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    # Get the team
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Equipa não encontrada")
    
    # Add team to member's team_ids
    await db.users.update_one({"id": member_id}, {"$addToSet": {"team_ids": team_id}})
    
    # Add member to team's appropriate list
    role = member.get('role', 'jogador')
    field_map = {'treinador': 'coach_ids', 'treinador_adjunto': 'coach_ids', 'delegado': 'delegate_ids'}
    field = field_map.get(role, 'player_ids')
    await db.teams.update_one({"id": team_id}, {"$addToSet": {field: member_id}})
    
    return {"message": "Membro adicionado à equipa"}

@api_router.delete("/members/{member_id}/teams/{team_id}")
async def remove_member_from_team(member_id: str, team_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a member from a team"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_team:
        raise HTTPException(status_code=403, detail="Sem permissão para gerir membros")
    
    # Check team access
    if not checker.is_admin and not checker.can_access_team(team_id):
        raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")
    
    # Remove team from member's team_ids
    await db.users.update_one({"id": member_id}, {"$pull": {"team_ids": team_id}})
    
    # Remove member from all team lists
    await db.teams.update_one(
        {"id": team_id}, 
        {"$pull": {"player_ids": member_id, "coach_ids": member_id, "delegate_ids": member_id}}
    )
    
    return {"message": "Membro removido da equipa"}

@api_router.delete("/members/{member_id}")
async def delete_member_permanently(member_id: str, current_user: dict = Depends(get_current_user)):
    """Permanently delete a member and all associated data (Admin only)"""
    checker = get_permission_checker(current_user)
    
    # Only admin can permanently delete members
    if not checker.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem eliminar membros permanentemente")
    
    # Check if member exists
    member = await db.users.find_one({"id": member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    # Cannot delete yourself
    if member_id == current_user.get('id'):
        raise HTTPException(status_code=400, detail="Não pode eliminar a sua própria conta")
    
    # Cannot delete admin accounts
    if member.get('role') in ['admin']:
        raise HTTPException(status_code=400, detail="Não pode eliminar contas de administrador")
    
    # Remove member from all teams
    team_ids = member.get('team_ids', [])
    for team_id in team_ids:
        await db.teams.update_one(
            {"id": team_id},
            {"$pull": {"player_ids": member_id, "coach_ids": member_id, "delegate_ids": member_id}}
        )
    
    # Remove from linked_player_ids (guardians)
    await db.users.update_many(
        {"linked_player_ids": member_id},
        {"$pull": {"linked_player_ids": member_id}}
    )
    
    # Remove attendance records
    await db.attendance.delete_many({"user_id": member_id})
    
    # Remove player stats
    await db.player_stats.delete_many({"player_id": member_id})
    
    # Remove unavailabilities
    await db.unavailabilities.delete_many({"user_id": member_id})
    
    # Remove payments
    await db.payments.delete_many({"user_id": member_id})
    await db.monthly_fees.delete_many({"user_id": member_id})
    
    # Remove push subscriptions
    await db.push_subscriptions.delete_many({"user_id": member_id})
    
    # Remove user messages (private ones)
    await db.messages.delete_many({"sender_id": member_id})
    
    # Finally, delete the user
    result = await db.users.delete_one({"id": member_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=500, detail="Erro ao eliminar membro")
    
    return {"message": "Membro eliminado permanentemente", "deleted_id": member_id}

@api_router.get("/members")
async def get_members_paginated(
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    team_id: Optional[str] = None,
    club_id: Optional[str] = None,
    include_archived: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Get paginated members list with search"""
    checker = get_permission_checker(current_user)
    
    query = {"role": {"$ne": "admin"}}
    
    # Filter by archived status
    if not include_archived:
        query["is_archived"] = {"$ne": True}
    
    # Apply team filter
    if team_id:
        if not checker.is_admin and not checker.can_access_team(team_id):
            raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")
        query["team_ids"] = team_id
    elif club_id:
        query["club_id"] = club_id
    elif not checker.is_admin:
        # Non-admin can only see members from their teams
        user_teams = list(checker.team_ids)
        if user_teams:
            query["team_ids"] = {"$in": user_teams}
        else:
            return {"members": [], "total": 0, "page": page, "per_page": per_page, "total_pages": 0}
    
    # Apply search filter
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    # Get total count
    total = await db.users.count_documents(query)
    total_pages = (total + per_page - 1) // per_page
    
    # Get paginated results sorted alphabetically
    skip = (page - 1) * per_page
    members = await db.users.find(query, {"_id": 0, "password": 0}).sort("name", 1).skip(skip).limit(per_page).to_list(per_page)
    
    return {
        "members": members,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages
    }

@api_router.get("/members/archived")
async def get_archived_members(
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get archived members - admin only"""
    checker = get_permission_checker(current_user)
    
    if not checker.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem ver membros arquivados")
    
    query = {"is_archived": True, "role": {"$ne": "admin"}}
    
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    total = await db.users.count_documents(query)
    total_pages = (total + per_page - 1) // per_page
    
    skip = (page - 1) * per_page
    members = await db.users.find(query, {"_id": 0, "password": 0}).sort("name", 1).skip(skip).limit(per_page).to_list(per_page)
    
    return {
        "members": members,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages
    }

@api_router.get("/members/export")
async def export_members_excel(
    team_id: Optional[str] = Query(None, description="Filter by team ID"),
    role: Optional[str] = Query(None, description="Filter by role"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    current_user: dict = Depends(get_current_user)
):
    """Export members to Excel file - admin only"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    from openpyxl.utils import get_column_letter
    
    checker = get_permission_checker(current_user)
    
    if not checker.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem exportar membros")
    
    # Build query
    query = {"is_archived": {"$ne": True}}
    
    if team_id:
        query["team_ids"] = team_id
    
    if role:
        query["role"] = role
    
    # Get members
    members = await db.users.find(query, {"_id": 0}).to_list(1000)
    
    # Get all teams for team names
    teams = await db.teams.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    team_map = {t["id"]: t["name"] for t in teams}
    
    # Apply search filter
    if search:
        search_lower = search.lower()
        members = [m for m in members if 
                   search_lower in m.get('name', '').lower() or 
                   search_lower in m.get('email', '').lower()]
    
    # Role translations
    role_names = {
        'admin': 'Administrador',
        'treinador': 'Treinador',
        'treinador_adjunto': 'Treinador Adjunto',
        'jogador': 'Jogador',
        'delegado': 'Delegado',
        'familiar': 'Familiar'
    }
    
    # Create Excel workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Membros"
    
    # Define headers
    headers = [
        "Nome",
        "Email",
        "Equipa(s)",
        "Função",
        "Nacionalidade",
        "Data de Nascimento",
        "Telefone",
        "Número de Jogador",
        "Posição"
    ]
    
    # Header styling
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="0D9488", end_color="0D9488", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Write headers
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = thin_border
    
    # Write data
    for row_idx, member in enumerate(members, 2):
        profile = member.get('profile') or {}
        identity = profile.get('identity') or {}
        sports = profile.get('sports') or {}
        
        # Get team names
        team_ids = member.get('team_ids', [])
        team_names = [team_map.get(tid, '') for tid in team_ids if team_map.get(tid)]
        
        # Format birth date
        birth_date = identity.get('birth_date', '')
        if birth_date:
            try:
                dt = datetime.fromisoformat(birth_date.replace('Z', '+00:00'))
                birth_date = dt.strftime('%d/%m/%Y')
            except:
                pass
        
        row_data = [
            member.get('name', ''),
            member.get('email', ''),
            ', '.join(team_names),
            role_names.get(member.get('role', ''), member.get('role', '')),
            identity.get('nationality', ''),
            birth_date,
            identity.get('phone', ''),
            sports.get('player_number', ''),
            sports.get('position', '')
        ]
        
        for col, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_idx, column=col, value=value)
            cell.border = thin_border
            cell.alignment = Alignment(vertical="center")
    
    # Adjust column widths
    column_widths = [25, 30, 25, 18, 15, 14, 15, 12, 15]
    for col, width in enumerate(column_widths, 1):
        ws.column_dimensions[get_column_letter(col)].width = width
    
    # Freeze header row
    ws.freeze_panes = 'A2'
    
    # Save to BytesIO
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"membros_export_{timestamp}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/members/{member_id}")
async def get_member_detail(member_id: str, current_user: dict = Depends(get_current_user)):
    """Get member details including statistics"""
    checker = get_permission_checker(current_user)
    
    member = await db.users.find_one({"id": member_id}, {"_id": 0, "password": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    # Check access - admin can see all, others can see if in same team or is self
    if not checker.is_admin:
        if member_id != current_user['id']:
            member_teams = set(member.get('team_ids', []))
            user_teams = set(checker.team_ids)
            if not member_teams.intersection(user_teams):
                raise HTTPException(status_code=403, detail="Sem acesso a este membro")
    
    # Get statistics summary
    stats = {
        "total_events": 0,
        "attendance_rate": 0,
        "goals": 0,
        "assists": 0
    }
    
    # Count attendance
    attendances = await db.attendance.find({"player_id": member_id}, {"_id": 0}).to_list(500)
    if attendances:
        stats["total_events"] = len(attendances)
        confirmed = sum(1 for a in attendances if a.get('status') == 'confirmado')
        stats["attendance_rate"] = round((confirmed / len(attendances)) * 100, 1) if attendances else 0
    
    # Get player stats
    player_stats = await db.player_match_stats.find({"player_id": member_id}, {"_id": 0}).to_list(200)
    for ps in player_stats:
        stats["goals"] += ps.get('goals', 0)
        stats["assists"] += ps.get('assists', 0)
    
    return {
        "member": member,
        "statistics": stats
    }

@api_router.put("/members/{member_id}")
async def update_member(member_id: str, data: MemberUpdate, current_user: dict = Depends(get_current_user)):
    """Update member data"""
    checker = get_permission_checker(current_user)
    
    member = await db.users.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    # Check permissions
    is_own_profile = member_id == current_user['id']
    can_edit = checker.is_admin or (is_own_profile and not data.is_archived and not data.role)
    
    if not can_edit:
        # Staff can edit members in their teams (except role and archive)
        if checker.is_staff:
            member_teams = set(member.get('team_ids', []))
            user_teams = set(checker.team_ids)
            if member_teams.intersection(user_teams) and not data.is_archived and not data.role:
                can_edit = True
    
    if not can_edit:
        raise HTTPException(status_code=403, detail="Sem permissão para editar este membro")
    
    # Only admin can archive/unarchive or change role
    if (data.is_archived is not None or data.role is not None) and not checker.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem arquivar membros ou alterar roles")
    
    # Build update dict
    update_data = {}
    if data.name:
        update_data["name"] = data.name
    if data.email:
        update_data["email"] = data.email
    if data.role:
        update_data["role"] = data.role
    if data.nationalities is not None:
        update_data["nationalities"] = data.nationalities[:2]  # Max 2
    if data.is_archived is not None:
        update_data["is_archived"] = data.is_archived
        if data.is_archived:
            update_data["archived_at"] = datetime.now(timezone.utc).isoformat()
        else:
            update_data["archived_at"] = None
    if data.is_activated is not None:
        update_data["is_activated"] = data.is_activated
    
    # Update profile fields
    if data.jersey_number is not None:
        update_data["profile.sports_info.jersey_number"] = data.jersey_number
    if data.position is not None:
        update_data["profile.sports_info.position"] = data.position
    if data.phone is not None:
        update_data["profile.identity.phone"] = data.phone
    
    if update_data:
        await db.users.update_one({"id": member_id}, {"$set": update_data})
    
    return {"message": "Membro atualizado"}

@api_router.post("/members/{member_id}/archive")
async def archive_member(member_id: str, current_user: dict = Depends(get_current_user)):
    """Archive a member without deleting statistics - admin only"""
    checker = get_permission_checker(current_user)
    
    if not checker.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem arquivar membros")
    
    member = await db.users.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    if member.get('role') == 'admin':
        raise HTTPException(status_code=400, detail="Não é possível arquivar administradores")
    
    # Archive member - remove from teams but keep statistics
    team_ids = member.get('team_ids', [])
    
    # Store previous teams for potential restore
    await db.users.update_one({"id": member_id}, {
        "$set": {
            "is_archived": True,
            "archived_at": datetime.now(timezone.utc).isoformat(),
            "archived_team_ids": team_ids,
            "team_ids": []
        }
    })
    
    # Remove from all teams
    for team_id in team_ids:
        await db.teams.update_one(
            {"id": team_id},
            {"$pull": {"player_ids": member_id, "coach_ids": member_id, "delegate_ids": member_id}}
        )
    
    return {"message": "Membro arquivado com sucesso. Estatísticas mantidas."}

@api_router.post("/members/{member_id}/restore")
async def restore_member(member_id: str, team_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Restore an archived member - admin only"""
    checker = get_permission_checker(current_user)
    
    if not checker.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem restaurar membros")
    
    member = await db.users.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    if not member.get('is_archived'):
        raise HTTPException(status_code=400, detail="Membro não está arquivado")
    
    # Determine which team to restore to
    restore_team_id = team_id or (member.get('archived_team_ids', []) or [None])[0]
    
    update_data = {
        "is_archived": False,
        "archived_at": None
    }
    
    if restore_team_id:
        update_data["team_ids"] = [restore_team_id]
        
        # Add to team
        role = member.get('role', 'jogador')
        field_map = {'treinador': 'coach_ids', 'treinador_adjunto': 'coach_ids', 'delegado': 'delegate_ids'}
        field = field_map.get(role, 'player_ids')
        await db.teams.update_one({"id": restore_team_id}, {"$addToSet": {field: member_id}})
    
    await db.users.update_one({"id": member_id}, {"$set": update_data})
    
    return {"message": "Membro restaurado com sucesso", "team_id": restore_team_id}

@api_router.post("/members/{member_id}/send-activation-reminder")
async def send_activation_reminder(member_id: str, current_user: dict = Depends(get_current_user)):
    """Send push notification reminder to activate account - admin only"""
    checker = get_permission_checker(current_user)
    
    if not checker.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem enviar lembretes")
    
    member = await db.users.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    if member.get('is_activated'):
        raise HTTPException(status_code=400, detail="Conta já está ativada")
    
    # Send push notification
    try:
        await send_push_to_users(
            user_ids=[member_id],
            title="Ativa a tua conta!",
            body="Por favor, atualiza a tua palavra-passe para ativar a tua conta no StickPro.",
            url="/settings"
        )
    except Exception as e:
        logging.error(f"Failed to send activation reminder: {e}")
    
    # Send email
    # Phase E2: ensure a valid (non-expired) invite_token exists, then send
    # the activation email through services.activation_emails. The legacy
    # inline HTML/send_email_notification path is kept disabled to avoid
    # duplicate sends.
    try:
        invite_token = member.get("invite_token")
        invite_expires_at = member.get("invite_expires_at")
        token_valid = False
        if invite_token and invite_expires_at:
            try:
                token_valid = datetime.fromisoformat(invite_expires_at) > datetime.now(timezone.utc)
            except Exception:
                token_valid = False
        if not token_valid:
            invite_token = secrets.token_urlsafe(32)
            invite_expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
            await db.users.update_one(
                {"id": member_id},
                {"$set": {"invite_token": invite_token, "invite_expires_at": invite_expires_at}}
            )

        await send_activation_email(
            to_email=member.get("email"),
            name=member.get("name", "Atleta"),
            token=invite_token,
            idempotency_key=f"reminder-{member_id}-{invite_token[:8]}",
        )
    except Exception as e:
        logging.error(f"Failed to send activation email: {e}")
    
    return {"message": "Lembrete enviado"}

# ==================== CHAMPIONSHIP ROUTES ====================

@api_router.post("/championships")
async def create_championship(data: ChampionshipCreate, current_user: dict = Depends(get_current_user)):
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_events:
        raise HTTPException(status_code=403, detail="Sem permissão para criar competições")
    
    # Check team access if team_id is provided
    if data.team_id and not checker.is_admin:
        if not checker.can_access_team(data.team_id):
            raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")
    
    championship = Championship(**data.model_dump(), created_by=current_user['id'])
    champ_dict = championship.model_dump()
    champ_dict['created_at'] = champ_dict['created_at'].isoformat()
    
    await db.championships.insert_one(champ_dict)
    # Remove MongoDB _id before returning
    champ_dict.pop('_id', None)
    return champ_dict

@api_router.get("/championships")
async def get_championships(team_id: Optional[str] = None, season: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    checker = get_permission_checker(current_user)
    query = {}
    
    if team_id:
        # Verify user can access the requested team
        if not checker.is_admin and not checker.can_access_team(team_id):
            raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")
        query["team_id"] = team_id
    elif not checker.is_admin:
        # Filter by user's accessible teams
        user_teams = list(checker.team_ids)
        if user_teams:
            query["team_id"] = {"$in": user_teams}
        else:
            return []  # No team access, no championships
    
    if season:
        query["season"] = season
    
    championships = await db.championships.find(query, {"_id": 0}).to_list(100)
    return championships

@api_router.get("/championships/{championship_id}")
async def get_championship(championship_id: str, current_user: dict = Depends(get_current_user)):
    checker = get_permission_checker(current_user)
    
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Campeonato não encontrado")
    
    # Check team access
    champ_team_id = championship.get('team_id')
    if champ_team_id and not checker.is_admin and not checker.can_access_team(champ_team_id):
        raise HTTPException(status_code=403, detail="Sem acesso a esta competição")
    
    return championship

@api_router.put("/championships/{championship_id}")
async def update_championship(championship_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_events:
        raise HTTPException(status_code=403, detail="Sem permissão para editar competições")
    
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Campeonato não encontrado")
    
    # Check team access
    if not checker.is_admin and not checker.can_access_team(championship.get('team_id')):
        raise HTTPException(status_code=403, detail="Sem acesso a esta competição")
    
    allowed = ['name', 'description', 'participating_teams']
    filtered = {k: v for k, v in updates.items() if k in allowed}
    
    if filtered:
        await db.championships.update_one({"id": championship_id}, {"$set": filtered})
    return {"message": "Campeonato atualizado"}

@api_router.delete("/championships/{championship_id}")
async def delete_championship(championship_id: str, current_user: dict = Depends(get_current_user)):
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_team:
        raise HTTPException(status_code=403, detail="Sem permissão para eliminar competições")
    
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Campeonato não encontrado")
    
    # Check team access
    if not checker.is_admin and not checker.can_access_team(championship.get('team_id')):
        raise HTTPException(status_code=403, detail="Sem acesso a esta competição")
    
    await db.championships.delete_one({"id": championship_id})
    await db.championship_matches.delete_many({"championship_id": championship_id})
    return {"message": "Campeonato eliminado"}

# ==================== CHAMPIONSHIP MATCH ROUTES ====================

@api_router.post("/championships/{championship_id}/matches")
async def create_championship_match(championship_id: str, data: ChampionshipMatchCreate, current_user: dict = Depends(get_current_user)):
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_events:
        raise HTTPException(status_code=403, detail="Sem permissão para criar jogos")
    
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Campeonato não encontrado")
    
    # Check team access
    if not checker.is_admin and not checker.can_access_team(championship.get('team_id')):
        raise HTTPException(status_code=403, detail="Sem acesso a esta competição")
    
    match = ChampionshipMatch(
        championship_id=championship_id,
        team_id=championship['team_id'],
        home_team=data.home_team,
        opponent_team=data.opponent_team,
        match_date=data.match_date,
        match_time=data.match_time,
        location=data.location,
        venue=data.venue,
        is_club_match=data.is_club_match,
        bonus_points=data.bonus_points,
        penalty_points=data.penalty_points,
        matchday=data.matchday
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
    checker = get_permission_checker(current_user)
    
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Campeonato não encontrado")
    
    # Check team access
    champ_team_id = championship.get('team_id')
    if champ_team_id and not checker.is_admin and not checker.can_access_team(champ_team_id):
        raise HTTPException(status_code=403, detail="Sem acesso a esta competição")
    
    matches = await db.championship_matches.find({"championship_id": championship_id}, {"_id": 0}).sort("match_date", 1).to_list(100)
    
    for match in matches:
        if isinstance(match.get('match_date'), str):
            match['match_date'] = datetime.fromisoformat(match['match_date'])
    
    return matches

@api_router.put("/championships/matches/{match_id}/result")
async def update_match_result(match_id: str, result: MatchResultUpdate, current_user: dict = Depends(get_current_user)):
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_stats:
        raise HTTPException(status_code=403, detail="Sem permissão para atualizar resultados")
    
    match = await db.championship_matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    
    # Check team access
    if not checker.is_admin and not checker.can_access_team(match.get('team_id')):
        raise HTTPException(status_code=403, detail="Sem acesso a este jogo")
    
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
    home_team: Optional[str] = None
    opponent_team: Optional[str] = None
    match_date: Optional[datetime] = None
    match_time: Optional[str] = None
    location: Optional[MatchLocation] = None
    venue: Optional[str] = None
    matchday: Optional[int] = None

@api_router.put("/championships/matches/{match_id}")
async def update_match(match_id: str, updates: MatchUpdate, current_user: dict = Depends(get_current_user)):
    """Update match details (date, time, location, opponent)"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_events:
        raise HTTPException(status_code=403, detail="Sem permissão para editar jogos")
    
    match = await db.championship_matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    
    # Check team access
    if not checker.is_admin and not checker.can_access_team(match.get('team_id')):
        raise HTTPException(status_code=403, detail="Sem acesso a este jogo")
    
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if update_data:
        await db.championship_matches.update_one({"id": match_id}, {"$set": update_data})
    
    return {"message": "Jogo atualizado"}

@api_router.delete("/championships/matches/{match_id}")
async def delete_match(match_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a championship match"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_events:
        raise HTTPException(status_code=403, detail="Sem permissão para eliminar jogos")
    
    match = await db.championship_matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    
    # Check team access
    if not checker.is_admin and not checker.can_access_team(match.get('team_id')):
        raise HTTPException(status_code=403, detail="Sem acesso a este jogo")
    
    # Delete associated event and attendance
    event = await db.events.find_one({"championship_match_id": match_id}, {"_id": 0})
    if event:
        await db.attendance.delete_many({"event_id": event['id']})
        await db.convocations.delete_many({"event_id": event['id']})
        await db.events.delete_one({"id": event['id']})
    
    await db.championship_matches.delete_one({"id": match_id})
    return {"message": "Jogo eliminado"}

@api_router.get("/championships/matches/import-template")
async def download_matches_import_template(token: str = None, current_user: dict = None):
    """Download Excel template for importing matches"""
    # Allow token via query param for direct download links
    if token and not current_user:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            current_user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password": 0})
        except:
            pass
    
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    import io
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Modelo Importação Jogos"
    
    # Define headers (Portuguese as main, others in comments)
    headers = [
        "Jornada",           # Round / Matchday
        "Data",              # Date
        "Hora",              # Time
        "Equipa Casa",       # Home Team
        "Adversário",        # Opponent / Away Team
        "Local",             # Venue / Pavilion
        "Localização"        # Location (casa/fora/neutro)
    ]
    
    # Style definitions
    header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")  # Dark blue
    header_font = Font(color="FFFFFF", bold=True, size=11)
    example_fill = PatternFill(start_color="E8F4FD", end_color="E8F4FD", fill_type="solid")  # Light blue
    hint_fill = PatternFill(start_color="FFF3CD", end_color="FFF3CD", fill_type="solid")  # Light yellow
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    center_align = Alignment(horizontal='center', vertical='center')
    left_align = Alignment(horizontal='left', vertical='center')
    
    # Write headers
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align
        cell.border = thin_border
    
    # Example data rows
    example_data = [
        [1, "2026-01-15", "15:00", "Escolares", "UD Vilafranquense", "Pavilhão Municipal", "casa"],
        [1, "2026-01-15", "16:30", "SC Torres", "Escolares", "Pavilhão SC Torres", "fora"],
        [2, "2026-01-22", "10:00", "Escolares", "Benfica", "Pavilhão Municipal", "casa"],
        [2, "2026-01-22", "17:00", "Sporting", "Escolares", "Pavilhão João Rocha", "fora"],
        [3, "2026-01-29", "14:00", "Escolares", "Porto", "Campo Neutro", "neutro"],
    ]
    
    for row_idx, row_data in enumerate(example_data, 2):
        for col_idx, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.fill = example_fill
            cell.border = thin_border
            cell.alignment = center_align if col_idx in [1, 2, 3, 7] else left_align
    
    # Add hints row
    hints = [
        "Número da jornada (1, 2, 3...)",
        "AAAA-MM-DD ou DD/MM/AAAA",
        "HH:MM (24h)",
        "Nome da equipa da casa",
        "Nome do adversário",
        "Nome do pavilhão (opcional)",
        "casa, fora ou neutro"
    ]
    
    hint_row = len(example_data) + 3
    ws.cell(row=hint_row, column=1, value="INSTRUÇÕES:").font = Font(bold=True, size=10)
    
    for col, hint in enumerate(hints, 1):
        cell = ws.cell(row=hint_row + 1, column=col, value=hint)
        cell.fill = hint_fill
        cell.font = Font(size=9, italic=True)
        cell.alignment = left_align
    
    # Multi-language support note
    ws.cell(row=hint_row + 3, column=1, value="Cabeçalhos alternativos suportados:").font = Font(bold=True, size=10)
    alt_headers = [
        "PT: Jornada | ES: Jornada | EN: Round/Matchday | FR: Journée | IT: Giornata",
        "PT: Data | ES: Fecha | EN: Date | FR: Date | IT: Data",
        "PT: Hora | ES: Hora | EN: Time | FR: Heure | IT: Ora",
        "PT: Equipa Casa | ES: Equipo Local | EN: Home Team | FR: Équipe Domicile | IT: Squadra Casa",
        "PT: Adversário | ES: Rival | EN: Opponent/Away Team | FR: Adversaire | IT: Avversario",
        "PT: Local/Pavilhão | ES: Lugar/Pabellón | EN: Venue/Pavilion | FR: Lieu | IT: Luogo",
        "PT: Localização | ES: Ubicación | EN: Location | FR: Localisation | IT: Localizzazione",
    ]
    for idx, text in enumerate(alt_headers):
        ws.cell(row=hint_row + 4 + idx, column=1, value=text).font = Font(size=9, color="666666")
    
    # Adjust column widths
    column_widths = [10, 14, 8, 25, 25, 30, 15]
    for col, width in enumerate(column_widths, 1):
        ws.column_dimensions[get_column_letter(col)].width = width
    
    # Save to BytesIO
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    from fastapi.responses import StreamingResponse
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=modelo_importacao_jogos.xlsx"
        }
    )

@api_router.post("/championships/{championship_id}/matches/import")
async def import_championship_matches(
    championship_id: str, 
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Import matches from Excel/CSV file with multilingual header support"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_events:
        raise HTTPException(status_code=403, detail="Sem permissão para importar jogos")
    
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Campeonato não encontrado")
    
    if not checker.is_admin and not checker.can_access_team(championship.get('team_id')):
        raise HTTPException(status_code=403, detail="Sem acesso a esta competição")
    
    # Read file
    content = await file.read()
    filename = file.filename.lower()
    
    rows = []
    if filename.endswith('.csv'):
        import csv
        import io
        decoded = content.decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(decoded))
        rows = list(reader)
    elif filename.endswith('.xlsx'):
        from openpyxl import load_workbook
        import io
        wb = load_workbook(io.BytesIO(content), read_only=True)
        ws = wb.active
        headers = [cell.value for cell in next(ws.iter_rows(min_row=1, max_row=1))]
        for row in ws.iter_rows(min_row=2, values_only=True):
            if any(cell is not None for cell in row):
                rows.append(dict(zip(headers, row)))
    else:
        raise HTTPException(status_code=400, detail="Formato não suportado. Use .csv ou .xlsx")
    
    results = {"success": 0, "errors": [], "imported": []}
    
    for row in rows:
        try:
            # Multilingual header mapping (PT, ES, FR, IT, EN)
            home_team = (
                row.get('Equipa Casa') or row.get('equipa_casa') or 
                row.get('Equipo Local') or row.get('equipo_local') or
                row.get('Équipe Domicile') or row.get('equipe_domicile') or
                row.get('Squadra Casa') or row.get('squadra_casa') or
                row.get('Home Team') or row.get('home_team') or ""
            )
            
            opponent_team = (
                row.get('Adversário') or row.get('adversario') or row.get('Equipa Visitante') or
                row.get('Rival') or row.get('Equipo Visitante') or
                row.get('Adversaire') or row.get('Équipe Extérieur') or
                row.get('Avversario') or row.get('Squadra Ospite') or
                row.get('Opponent') or row.get('Away Team') or row.get('opponent') or ""
            )
            
            match_date_str = (
                row.get('Data') or row.get('data') or
                row.get('Fecha') or row.get('fecha') or
                row.get('Date') or row.get('date') or ""
            )
            
            match_time = (
                row.get('Hora') or row.get('hora') or
                row.get('Heure') or row.get('heure') or
                row.get('Ora') or row.get('ora') or
                row.get('Time') or row.get('time') or ""
            )
            
            venue = (
                row.get('Local') or row.get('local') or row.get('Pavilhão') or
                row.get('Lugar') or row.get('Pabellón') or
                row.get('Lieu') or row.get('Pavillon') or
                row.get('Luogo') or row.get('Palazzetto') or
                row.get('Venue') or row.get('venue') or row.get('Pavilion') or ""
            )
            
            location_str = (
                row.get('Localização') or row.get('localizacao') or
                row.get('Ubicación') or row.get('ubicacion') or
                row.get('Localisation') or row.get('localisation') or
                row.get('Localizzazione') or row.get('localizzazione') or
                row.get('Location') or row.get('location') or "casa"
            )
            
            matchday_str = (
                row.get('Jornada') or row.get('jornada') or
                row.get('Journée') or row.get('journee') or
                row.get('Giornata') or row.get('giornata') or
                row.get('Round') or row.get('round') or row.get('Matchday') or ""
            )
            
            if not opponent_team:
                results["errors"].append(f"Linha sem adversário: {row}")
                continue
            
            # Parse date
            try:
                if isinstance(match_date_str, datetime):
                    match_date = match_date_str
                elif match_date_str:
                    from dateutil import parser
                    match_date = parser.parse(str(match_date_str))
                else:
                    match_date = datetime.now(timezone.utc)
            except:
                match_date = datetime.now(timezone.utc)
            
            # Normalize location
            location_map = {
                'casa': 'casa', 'home': 'casa', 'domicile': 'casa', 'local': 'casa',
                'fora': 'fora', 'away': 'fora', 'extérieur': 'fora', 'visitante': 'fora', 'trasferta': 'fora',
                'neutral': 'neutro', 'neutro': 'neutro', 'neutre': 'neutro'
            }
            location = location_map.get(str(location_str).lower().strip(), 'casa')
            
            # Parse matchday
            matchday = None
            if matchday_str:
                try:
                    matchday = int(matchday_str)
                except:
                    pass
            
            # Determine if club match
            team_name = championship.get('team_name', '')
            is_club_match = home_team.lower() == team_name.lower() if team_name else True
            
            # Create match
            match = ChampionshipMatch(
                championship_id=championship_id,
                team_id=championship['team_id'],
                home_team=home_team if home_team else None,
                opponent_team=opponent_team,
                match_date=match_date,
                match_time=str(match_time).strip() if match_time else None,
                location=location,
                venue=str(venue).strip() if venue else None,
                is_club_match=is_club_match,
                matchday=matchday
            )
            
            match_dict = match.model_dump()
            match_dict['match_date'] = match_dict['match_date'].isoformat()
            match_dict['created_at'] = match_dict['created_at'].isoformat()
            
            await db.championship_matches.insert_one(match_dict)
            match_dict.pop('_id', None)
            
            results["success"] += 1
            results["imported"].append({
                "home_team": home_team,
                "opponent_team": opponent_team,
                "match_date": str(match_date)[:10]
            })
            
        except Exception as e:
            results["errors"].append(f"Erro na linha: {str(e)}")
    
    return results

class GameSheetImport(BaseModel):
    url: str
    match_id: str

@api_router.post("/championships/matches/import-gamesheet")
async def import_gamesheet(data: GameSheetImport, current_user: dict = Depends(get_current_user)):
    """Import match data from APL game sheet URL"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_stats:
        raise HTTPException(status_code=403, detail="Sem permissão para importar fichas de jogo")
    
    # Verify match exists and user has access
    match = await db.championship_matches.find_one({"id": data.match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    
    if not checker.is_admin and not checker.can_access_team(match.get('team_id')):
        raise HTTPException(status_code=403, detail="Sem acesso a este jogo")
    
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
                                """Parse a fraction stat like '1/2' returning (scored, failed)
                                Format: X/Y where X = scored, Y = total attempts
                                Returns: (scored, failed) where failed = Y - X
                                """
                                if cell_index >= len(cells):
                                    return (0, 0)
                                text = cells[cell_index].get_text(strip=True)
                                if '/' in text:
                                    parts = text.split('/')
                                    try:
                                        scored = int(parts[0]) if parts[0].isdigit() else 0
                                        total = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else scored
                                        failed = max(0, total - scored)
                                        return (scored, failed)
                                    except (ValueError, IndexError):
                                        return (0, 0)
                                return (0, 0)
                            
                            goals = parse_stat(4)       # G (Golos)
                            assists = parse_stat(5)     # AG (Assistências)
                            defenses = parse_stat(6)    # D (Defesas)
                            penalties_tuple = parse_fraction_stat(7)   # Pe (Penáltis - X/Y format)
                            free_kicks_tuple = parse_fraction_stat(8)  # LD (Livres Diretos - X/Y format)
                            yellow_cards = parse_stat(9)   # Amarelo
                            blue_cards = parse_stat(10)    # Azul
                            red_cards = parse_stat(11)     # Vermelho
                            
                            if current_team:
                                player_stats.append({
                                    'team': current_team,
                                    'jersey_number': jersey,
                                    'name': name,
                                    'G': goals,
                                    'AG': assists,
                                    'D': defenses,
                                    'PM': penalties_tuple[0],      # Penáltis Marcados
                                    'PF': penalties_tuple[1],      # Penáltis Falhados
                                    'LDM': free_kicks_tuple[0],    # Livres Diretos Marcados
                                    'LDF': free_kicks_tuple[1],    # Livres Diretos Falhados
                                    'yellow': yellow_cards,
                                    'blue': blue_cards,
                                    'red': red_cards,
                                    # Legacy fields for backwards compatibility
                                    'goals': goals,
                                    'assists': assists,
                                    'defenses': defenses,
                                    'penalties_scored': penalties_tuple[0],
                                    'free_kicks_scored': free_kicks_tuple[0],
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
                profile = member.get('profile') or {}
                sports_info = profile.get('sports_info') or {}
                jersey = sports_info.get('jersey_number')
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


class GameSheetExtract(BaseModel):
    url: str

@api_router.post("/championships/extract-gamesheet-stats")
async def extract_gamesheet_stats(data: GameSheetExtract, current_user: dict = Depends(get_current_user)):
    """
    Extract and transform player statistics from a game sheet URL.
    Returns a structured list of players with all stats fields.
    
    Output schema per player:
    - player_name: str
    - team: str
    - jersey_number: str
    - G: int (goals)
    - AG: int (assists)
    - D: int (saves/defenses)
    - PM: int (penalties scored)
    - PF: int (penalties failed)
    - LDM: int (direct free hits scored)
    - LDF: int (direct free hits failed)
    - yellow: int (yellow cards)
    - blue: int (blue cards)
    - red: int (red cards)
    """
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_stats:
        raise HTTPException(status_code=403, detail="Sem permissão para extrair estatísticas")
    
    # Fetch the game sheet
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(data.url)
            response.raise_for_status()
            # Try to detect and fix encoding issues
            # APL uses Windows-1252 encoding for Portuguese characters
            try:
                html = response.content.decode('windows-1252')
            except:
                try:
                    html = response.content.decode('iso-8859-1')
                except:
                    html = response.text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao aceder à ficha de jogo: {str(e)}")
    
    soup = BeautifulSoup(html, 'html.parser')
    
    # Detect language from headers (multilingual support)
    def detect_language(soup):
        """Detect language from common header patterns"""
        text = soup.get_text().lower()
        if 'golos' in text or 'assistências' in text:
            return 'pt'
        elif 'goles' in text or 'asistencias' in text:
            return 'es'
        elif 'buts' in text or 'passes décisives' in text:
            return 'fr'
        elif 'gol' in text or 'assist' in text:
            return 'it'
        return 'en'
    
    language = detect_language(soup)
    
    # Normalize player name (remove accents, lowercase, trim)
    def normalize_player_name(name):
        import unicodedata
        # Remove captain marker
        name = re.sub(r'\s*©\s*', '', name).strip()
        # Normalize unicode characters
        name = unicodedata.normalize('NFD', name)
        name = ''.join(c for c in name if unicodedata.category(c) != 'Mn')
        # Clean up spaces
        name = re.sub(r'\s+', ' ', name).strip()
        return name
    
    result = {
        'home_score': None,
        'away_score': None,
        'teams': [],
        'players': [],
        'language_detected': language
    }
    
    try:
        # Find the final score
        score_span = soup.find('span', style=lambda x: x and 'background-color:#000000' in x if x else False)
        if score_span:
            score_text = score_span.get_text(strip=True)
            score_match = re.search(r'(\d+)\s*-\s*(\d+)', score_text)
            if score_match:
                result['home_score'] = int(score_match.group(1))
                result['away_score'] = int(score_match.group(2))
        
        # Fallback score search
        if result['home_score'] is None:
            score_pattern = re.search(r'<b>(\d+)\s*-\s*(\d+)</b>', html)
            if score_pattern:
                result['home_score'] = int(score_pattern.group(1))
                result['away_score'] = int(score_pattern.group(2))
        
        # Find all statistics divs
        stats_divs = soup.find_all('div', class_='estadisticas')
        current_team = None
        
        for stats_div in stats_divs:
            tables = stats_div.find_all('table')
            for table in tables:
                rows = table.find_all('tr')
                
                for row in rows:
                    cells = row.find_all('td')
                    if not cells:
                        continue
                    
                    # Check for team header
                    first_cell = cells[0]
                    if first_cell.get('class') and 'fondo1' in first_cell.get('class', []):
                        team_name_span = first_cell.find('span')
                        if team_name_span:
                            current_team = team_name_span.get_text(strip=True)
                            if current_team and current_team not in result['teams']:
                                result['teams'].append(current_team)
                        continue
                    
                    # Skip header rows and technical staff
                    if first_cell.get('class') and 'fondo3' in first_cell.get('class', []):
                        continue
                    
                    row_text = row.get_text()
                    if 'Técnicos' in row_text or 'Total da equipa' in row_text:
                        continue
                    
                    # Parse player row
                    if len(cells) >= 12:
                        try:
                            jersey_text = cells[0].get_text(strip=True)
                            
                            # Skip staff roles
                            if jersey_text in ['D', 'T', 'T2', 'MAS', 'MEC', '']:
                                continue
                            
                            jersey = jersey_text.lstrip('0') or '0'
                            
                            # Get player name
                            name_cell = cells[3]
                            name = name_cell.get_text(strip=True)
                            name = re.sub(r'\s*©\s*', '', name).strip()
                            name = re.sub(r'\s+', ' ', name)
                            
                            if not name:
                                continue
                            
                            # Parse stat functions
                            def parse_stat(cell_index):
                                if cell_index >= len(cells):
                                    return 0
                                text = cells[cell_index].get_text(strip=True)
                                if text == '--' or text == '-':
                                    return 0
                                if text.isdigit():
                                    return int(text)
                                return 0
                            
                            def parse_fraction(cell_index):
                                """Parse X/Y format, return (scored, failed)"""
                                if cell_index >= len(cells):
                                    return (0, 0)
                                text = cells[cell_index].get_text(strip=True)
                                if text == '--' or text == '-' or text == '':
                                    return (0, 0)
                                if '/' in text:
                                    parts = text.split('/')
                                    try:
                                        scored = int(parts[0]) if parts[0].strip().isdigit() else 0
                                        total = int(parts[1]) if len(parts) > 1 and parts[1].strip().isdigit() else scored
                                        failed = max(0, total - scored)
                                        return (scored, failed)
                                    except (ValueError, IndexError):
                                        return (0, 0)
                                return (0, 0)
                            
                            # Extract all stats
                            G = parse_stat(4)
                            AG = parse_stat(5)
                            D = parse_stat(6)
                            Pe = parse_fraction(7)
                            LD = parse_fraction(8)
                            yellow = parse_stat(9)
                            blue = parse_stat(10)
                            red = parse_stat(11)
                            
                            player_data = {
                                'player_name': name,
                                'player_name_normalized': normalize_player_name(name).lower(),
                                'team': current_team or 'Unknown',
                                'jersey_number': jersey,
                                'G': G,
                                'AG': AG,
                                'D': D,
                                'PM': Pe[0],
                                'PF': Pe[1],
                                'LDM': LD[0],
                                'LDF': LD[1],
                                'yellow': yellow,
                                'blue': blue,
                                'red': red
                            }
                            
                            # Validation
                            assert player_data['PM'] >= 0, "PM must be >= 0"
                            assert player_data['PF'] >= 0, "PF must be >= 0"
                            assert player_data['LDM'] >= 0, "LDM must be >= 0"
                            assert player_data['LDF'] >= 0, "LDF must be >= 0"
                            
                            result['players'].append(player_data)
                            
                        except Exception as e:
                            logging.warning(f"Error parsing player row: {e}")
                            continue
        
    except Exception as e:
        logging.error(f"Error extracting gamesheet stats: {e}")
        raise HTTPException(status_code=400, detail=f"Erro ao processar ficha de jogo: {str(e)}")
    
    return result


class APLCalendarImport(BaseModel):
    """Import championship calendar from APL website"""
    url: str  # URL of the APL division calendar page
    championship_id: str

@api_router.post("/championships/import-apl-calendar")
async def import_apl_calendar(data: APLCalendarImport, current_user: dict = Depends(get_current_user)):
    """Import matches calendar from APL division page"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_import_data:
        raise HTTPException(status_code=403, detail="Sem permissão para importar dados")
    
    # Verify championship exists
    championship = await db.championships.find_one({"id": data.championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Campeonato não encontrado")
    
    # Check team access
    if not checker.is_admin and not checker.can_access_team(championship.get('team_id')):
        raise HTTPException(status_code=403, detail="Sem acesso a esta competição")
    
    team_id = championship.get('team_id')
    
    # Fetch the APL calendar page
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(data.url)
            response.raise_for_status()
            html = response.text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao aceder ao calendário APL: {str(e)}")
    
    soup = BeautifulSoup(html, 'html.parser')
    
    matches_imported = 0
    matches_data = []
    
    try:
        # Find all match rows in the calendar tables
        # APL calendars typically have tables with match info
        tables = soup.find_all('table')
        
        for table in tables:
            rows = table.find_all('tr')
            current_matchday = None
            
            for row in rows:
                cells = row.find_all(['td', 'th'])
                row_text = row.get_text(strip=True)
                
                # Check for matchday header (e.g., "Jornada 1", "J1", "1ª Jornada")
                matchday_match = re.search(r'[Jj]ornada\s*(\d+)|[Jj](\d+)|(\d+)[ªº]?\s*[Jj]ornada', row_text)
                if matchday_match:
                    current_matchday = int(matchday_match.group(1) or matchday_match.group(2) or matchday_match.group(3))
                    continue
                
                # Skip header rows
                if len(cells) < 3:
                    continue
                
                # Try to extract match info from cells
                # Common patterns: [Date] [Time] [Home Team] [Score/vs] [Away Team] [Venue]
                cell_texts = [cell.get_text(strip=True) for cell in cells]
                
                # Look for date pattern (DD/MM/YYYY or DD-MM-YYYY)
                date_str = None
                time_str = None
                home_team = None
                away_team = None
                venue = None
                score_home = None
                score_away = None
                
                for i, text in enumerate(cell_texts):
                    # Date pattern
                    date_match = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})', text)
                    if date_match:
                        day, month, year = date_match.groups()
                        if len(year) == 2:
                            year = "20" + year
                        date_str = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                        continue
                    
                    # Time pattern
                    time_match = re.search(r'(\d{1,2})[h:.](\d{2})', text)
                    if time_match and not date_str:
                        time_str = f"{time_match.group(1).zfill(2)}:{time_match.group(2)}"
                        continue
                    
                    # Score pattern (e.g., "3-2", "3 - 2")
                    score_match = re.search(r'^(\d+)\s*[-x]\s*(\d+)$', text)
                    if score_match:
                        score_home = int(score_match.group(1))
                        score_away = int(score_match.group(2))
                        continue
                    
                    # Team names (non-empty text that's not date/time/score)
                    if text and len(text) >= 2 and not date_match and not time_match and not score_match:
                        if text.lower() not in ['vs', 'x', '-', 'local', 'hora', 'data', 'resultado']:
                            if not home_team:
                                home_team = text
                            elif not away_team:
                                away_team = text
                            elif not venue and len(text) > 3:
                                venue = text
                
                # Create match if we have minimum required data
                if home_team and away_team and date_str:
                    match_data = {
                        "home_team": home_team,
                        "away_team": away_team,
                        "date": date_str,
                        "time": time_str or "15:00",
                        "matchday": current_matchday,
                        "venue": venue,
                        "score_home": score_home,
                        "score_away": score_away
                    }
                    matches_data.append(match_data)
        
        # Import matches to database
        club = await db.clubs.find_one({}, {"_id": 0, "id": 1, "name": 1})
        club_name = club.get('name', '') if club else ''
        team = await db.teams.find_one({"id": team_id}, {"_id": 0, "name": 1})
        team_name = team.get('name', '') if team else ''
        
        for match_data in matches_data:
            # Determine if this is a club match
            is_club_match = (
                club_name.lower() in match_data['home_team'].lower() or
                club_name.lower() in match_data['away_team'].lower() or
                team_name.lower() in match_data['home_team'].lower() or
                team_name.lower() in match_data['away_team'].lower()
            )
            
            # Determine location (home/away/neutral)
            location = 'casa'
            if is_club_match:
                if club_name.lower() in match_data['home_team'].lower() or team_name.lower() in match_data['home_team'].lower():
                    location = 'casa'
                else:
                    location = 'fora'
            
            # Create match record
            match_id = str(uuid.uuid4())
            match_datetime = f"{match_data['date']}T{match_data['time']}:00"
            
            match_doc = {
                "id": match_id,
                "championship_id": data.championship_id,
                "team_id": team_id,
                "home_team": match_data['home_team'] if not is_club_match else None,
                "opponent_team": match_data['away_team'] if is_club_match and location == 'casa' else match_data['home_team'],
                "match_date": match_datetime,
                "location": location,
                "venue": match_data['venue'],
                "is_club_match": is_club_match,
                "matchday": match_data['matchday'],
                "home_score": match_data['score_home'],
                "away_score": match_data['score_away'],
                "is_completed": match_data['score_home'] is not None,
                "imported_from_apl": True,
                "apl_import_url": data.url,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Check if match already exists (same teams and date)
            existing = await db.championship_matches.find_one({
                "championship_id": data.championship_id,
                "match_date": match_datetime
            })
            
            if not existing:
                await db.championship_matches.insert_one(match_doc)
                matches_imported += 1
        
    except Exception as e:
        logging.error(f"Error parsing APL calendar: {e}")
        raise HTTPException(status_code=400, detail=f"Erro ao processar calendário APL: {str(e)}")
    
    return {
        "message": "Calendário APL importado com sucesso",
        "matches_found": len(matches_data),
        "matches_imported": matches_imported,
        "matches_skipped": len(matches_data) - matches_imported
    }


# =====================
# Match Lineup Endpoints (for coaches)
# =====================

@api_router.get("/championships/matches/{match_id}/lineup")
async def get_match_lineup(match_id: str, current_user: dict = Depends(get_current_user)):
    """Get lineup for a match with visibility check"""
    lineup = await db.match_lineups.find_one({"match_id": match_id}, {"_id": 0})
    if not lineup:
        # Return empty lineup structure
        return {
            "match_id": match_id,
            "periods": [],
            "visibility": "coach_only",
            "created_at": None
        }
    
    # Check visibility permissions
    checker = get_permission_checker(current_user)
    visibility = lineup.get('visibility', 'coach_only')
    
    # Coaches and admins always see the lineup
    if checker.can_manage_lineups:
        return lineup
    
    # Check visibility setting
    user_role = current_user.get('role', '')
    can_view = False
    
    if visibility == 'assistant':
        can_view = user_role == 'treinador_adjunto'
    elif visibility == 'delegate':
        can_view = user_role == 'delegado'
    elif visibility == 'assistant_and_delegate':
        can_view = user_role in ['treinador_adjunto', 'delegado']
    
    if not can_view:
        # Return empty if not allowed to see
        return {
            "match_id": match_id,
            "periods": [],
            "visibility": visibility,
            "restricted": True,
            "created_at": None
        }
    
    return lineup

@api_router.post("/championships/matches/{match_id}/lineup")
async def save_match_lineup(match_id: str, lineup_data: dict, current_user: dict = Depends(get_current_user)):
    """Save or update lineup for a match - Coaches and Admins only"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_lineups:
        raise HTTPException(status_code=403, detail="Sem permissão para gerir line-ups")
    
    # Verify match exists
    match = await db.championship_matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    
    # Check team access
    if not checker.is_admin and not checker.can_access_team(match.get('team_id')):
        raise HTTPException(status_code=403, detail="Sem acesso a este jogo")
    
    # Check if lineup already exists
    existing = await db.match_lineups.find_one({"match_id": match_id})
    
    if existing:
        # Update existing lineup
        await db.match_lineups.update_one(
            {"match_id": match_id},
            {"$set": {
                "periods": lineup_data.get('periods', []),
                "visibility": lineup_data.get('visibility', 'coach_only'),
                "updated_at": datetime.now(timezone.utc),
                "updated_by": current_user['id']
            }}
        )
        updated = await db.match_lineups.find_one({"match_id": match_id}, {"_id": 0})
        return updated
    else:
        # Create new lineup
        lineup = MatchLineup(
            match_id=match_id,
            team_id=match.get('team_id') or match.get('championship_id'),
            periods=lineup_data.get('periods', []),
            visibility=lineup_data.get('visibility', 'coach_only'),
            created_by=current_user['id']
        )
        await db.match_lineups.insert_one(lineup.model_dump())
        return {**lineup.model_dump(), "_id": None}

@api_router.delete("/championships/matches/{match_id}/lineup")
async def delete_match_lineup(match_id: str, current_user: dict = Depends(get_current_user)):
    """Delete lineup for a match"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_lineups:
        raise HTTPException(status_code=403, detail="Sem permissão para eliminar line-ups")
    
    # Verify match exists and check access
    match = await db.championship_matches.find_one({"id": match_id}, {"_id": 0})
    if match and not checker.is_admin and not checker.can_access_team(match.get('team_id')):
        raise HTTPException(status_code=403, detail="Sem acesso a este jogo")
    
    result = await db.match_lineups.delete_one({"match_id": match_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Line-up não encontrado")
    
    return {"message": "Line-up eliminado"}


# =====================
# Competition Teams Endpoints (equipas participantes)
# =====================

@api_router.get("/championships/{championship_id}/teams")
async def get_competition_teams(championship_id: str, current_user: dict = Depends(get_current_user)):
    """Get all teams participating in a championship"""
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Campeonato não encontrado")
    
    teams = await db.competition_teams.find({"championship_id": championship_id}, {"_id": 0}).to_list(100)
    return teams

@api_router.post("/championships/{championship_id}/teams")
async def create_competition_team(championship_id: str, data: CompetitionTeamCreate, current_user: dict = Depends(get_current_user)):
    """Create a new team in the championship"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_events:
        raise HTTPException(status_code=403, detail="Sem permissão para gerir equipas")
    
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Campeonato não encontrado")
    
    # Check team access
    if not checker.is_admin and not checker.can_access_team(championship.get('team_id')):
        raise HTTPException(status_code=403, detail="Sem acesso a este campeonato")
    
    # Check for duplicate team name
    existing = await db.competition_teams.find_one({
        "championship_id": championship_id,
        "name": {"$regex": f"^{data.name}$", "$options": "i"}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Já existe uma equipa com este nome")
    
    team = CompetitionTeam(
        championship_id=championship_id,
        name=data.name,
        pavilion_name=data.pavilion_name,
        pavilion_address=data.pavilion_address,
        field_player_kit=data.field_player_kit.model_dump() if data.field_player_kit else None,
        goalkeeper_kit=data.goalkeeper_kit.model_dump() if data.goalkeeper_kit else None,
        created_by=current_user['id']
    )
    
    await db.competition_teams.insert_one(team.model_dump())
    
    # Add to championship's participating_teams list
    await db.championships.update_one(
        {"id": championship_id},
        {"$addToSet": {"participating_teams": data.name}}
    )
    
    return {**team.model_dump(), "_id": None}

@api_router.put("/championships/teams/{team_id}")
async def update_competition_team(team_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Update a competition team"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_events:
        raise HTTPException(status_code=403, detail="Sem permissão para gerir equipas")
    
    team = await db.competition_teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Equipa não encontrada")
    
    allowed_fields = ['name', 'pavilion_name', 'pavilion_address', 'field_player_kit', 'goalkeeper_kit']
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Sem dados para atualizar")
    
    await db.competition_teams.update_one(
        {"id": team_id},
        {"$set": update_data}
    )
    
    updated = await db.competition_teams.find_one({"id": team_id}, {"_id": 0})
    return updated

@api_router.delete("/championships/teams/{team_id}")
async def delete_competition_team(team_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a competition team"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_events:
        raise HTTPException(status_code=403, detail="Sem permissão para gerir equipas")
    
    team = await db.competition_teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Equipa não encontrada")
    
    # Remove from championship's participating_teams
    await db.championships.update_one(
        {"id": team.get('championship_id')},
        {"$pull": {"participating_teams": team.get('name')}}
    )
    
    await db.competition_teams.delete_one({"id": team_id})
    return {"message": "Equipa eliminada"}

@api_router.post("/championships/{championship_id}/teams/import")
async def import_competition_teams(championship_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Import competition teams from Excel file"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_import_data:
        raise HTTPException(status_code=403, detail="Sem permissão para importar dados")
    
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Campeonato não encontrado")
    
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="Formato de ficheiro não suportado. Use Excel (.xlsx, .xls) ou CSV")
    
    try:
        content = await file.read()
        
        if file.filename.endswith('.csv'):
            import io
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
        
        # Normalize column names
        df.columns = [str(col).lower().strip().replace(' ', '_') for col in df.columns]
        
        teams_imported = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                # Get team name
                team_name = None
                for col in ['nome', 'name', 'equipa', 'team', 'nome_equipa', 'team_name']:
                    if col in df.columns and pd.notna(row.get(col)):
                        team_name = str(row[col]).strip()
                        break
                
                if not team_name:
                    errors.append(f"Linha {idx + 2}: Nome da equipa não encontrado")
                    continue
                
                # Check for duplicate
                existing = await db.competition_teams.find_one({
                    "championship_id": championship_id,
                    "name": {"$regex": f"^{team_name}$", "$options": "i"}
                })
                if existing:
                    errors.append(f"Linha {idx + 2}: Equipa '{team_name}' já existe")
                    continue
                
                # Extract other fields
                pavilion_name = None
                pavilion_address = None
                
                for col in ['pavilhao', 'pavilion', 'recinto', 'venue']:
                    if col in df.columns and pd.notna(row.get(col)):
                        pavilion_name = str(row[col]).strip()
                        break
                
                for col in ['morada', 'address', 'endereco', 'pavilion_address']:
                    if col in df.columns and pd.notna(row.get(col)):
                        pavilion_address = str(row[col]).strip()
                        break
                
                # Create team
                team = CompetitionTeam(
                    championship_id=championship_id,
                    name=team_name,
                    pavilion_name=pavilion_name,
                    pavilion_address=pavilion_address,
                    created_by=current_user['id']
                )
                
                await db.competition_teams.insert_one(team.model_dump())
                
                # Add to participating_teams list
                await db.championships.update_one(
                    {"id": championship_id},
                    {"$addToSet": {"participating_teams": team_name}}
                )
                
                teams_imported += 1
                
            except Exception as e:
                errors.append(f"Linha {idx + 2}: {str(e)}")
        
        return {
            "message": f"Importação concluída: {teams_imported} equipas importadas",
            "teams_imported": teams_imported,
            "errors": errors[:10]  # Return first 10 errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar ficheiro: {str(e)}")


@api_router.get("/championships/{championship_id}/standings")
async def get_championship_standings(championship_id: str, current_user: dict = Depends(get_current_user)):
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Campeonato não encontrado")
    
    matches = await db.championship_matches.find({"championship_id": championship_id, "is_completed": True}, {"_id": 0}).to_list(100)
    
    # Build standings
    standings = {}
    team_data = await db.teams.find_one({"id": championship['team_id']}, {"_id": 0, "name": 1})
    our_team_name = team_data['name'] if team_data else "Nossa Equipa"
    
    # Initialize our team
    standings[our_team_name] = {"team": our_team_name, "played": 0, "won": 0, "drawn": 0, "lost": 0, "goals_for": 0, "goals_against": 0, "bonus": 0, "penalty": 0, "points": 0}
    
    # Initialize all teams from matches (including external teams)
    for match in matches:
        is_club_match = match.get('is_club_match', True)
        
        if is_club_match:
            # For club matches, add opponent
            opp = match['opponent_team']
            if opp not in standings:
                standings[opp] = {"team": opp, "played": 0, "won": 0, "drawn": 0, "lost": 0, "goals_for": 0, "goals_against": 0, "bonus": 0, "penalty": 0, "points": 0}
        else:
            # For external matches, add both teams
            home_team = match.get('home_team', 'Equipa A')
            away_team = match['opponent_team']
            if home_team not in standings:
                standings[home_team] = {"team": home_team, "played": 0, "won": 0, "drawn": 0, "lost": 0, "goals_for": 0, "goals_against": 0, "bonus": 0, "penalty": 0, "points": 0}
            if away_team not in standings:
                standings[away_team] = {"team": away_team, "played": 0, "won": 0, "drawn": 0, "lost": 0, "goals_for": 0, "goals_against": 0, "bonus": 0, "penalty": 0, "points": 0}
    
    # Calculate stats
    for match in matches:
        home_score = match.get('home_score', 0)
        away_score = match.get('away_score', 0)
        bonus = match.get('bonus_points', 0)
        penalty = match.get('penalty_points', 0)
        is_club_match = match.get('is_club_match', True)
        
        if is_club_match:
            # Club match: our team vs opponent
            opp = match['opponent_team']
            loc = match.get('location', 'casa')
            
            if loc == 'casa':
                our_goals = home_score
                their_goals = away_score
            else:
                our_goals = away_score
                their_goals = home_score
            
            standings[our_team_name]['played'] += 1
            standings[our_team_name]['goals_for'] += our_goals
            standings[our_team_name]['goals_against'] += their_goals
            standings[our_team_name]['bonus'] += bonus
            standings[our_team_name]['penalty'] += penalty
            
            standings[opp]['played'] += 1
            standings[opp]['goals_for'] += their_goals
            standings[opp]['goals_against'] += our_goals
            
            if our_goals > their_goals:
                standings[our_team_name]['won'] += 1
                standings[our_team_name]['points'] += 3
                standings[opp]['lost'] += 1
            elif our_goals < their_goals:
                standings[our_team_name]['lost'] += 1
                standings[opp]['won'] += 1
                standings[opp]['points'] += 3
            else:
                standings[our_team_name]['drawn'] += 1
                standings[our_team_name]['points'] += 1
                standings[opp]['drawn'] += 1
                standings[opp]['points'] += 1
        else:
            # External match: two external teams
            home_team = match.get('home_team', 'Equipa A')
            away_team = match['opponent_team']
            
            standings[home_team]['played'] += 1
            standings[home_team]['goals_for'] += home_score
            standings[home_team]['goals_against'] += away_score
            standings[home_team]['bonus'] += bonus
            standings[home_team]['penalty'] += penalty
            
            standings[away_team]['played'] += 1
            standings[away_team]['goals_for'] += away_score
            standings[away_team]['goals_against'] += home_score
            
            if home_score > away_score:
                standings[home_team]['won'] += 1
                standings[home_team]['points'] += 3
                standings[away_team]['lost'] += 1
            elif home_score < away_score:
                standings[home_team]['lost'] += 1
                standings[away_team]['won'] += 1
                standings[away_team]['points'] += 3
            else:
                standings[home_team]['drawn'] += 1
                standings[home_team]['points'] += 1
                standings[away_team]['drawn'] += 1
                standings[away_team]['points'] += 1
    
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
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_stats:
        raise HTTPException(status_code=403, detail="Sem permissão para gerir estatísticas")
    
    match = await db.championship_matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    
    # Check team access
    if not checker.is_admin and not checker.can_access_team(match.get('team_id')):
        raise HTTPException(status_code=403, detail="Sem acesso a este jogo")
    
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
    stats = await db.player_match_stats.find({"match_id": match_id}, {"_id": 0}).to_list(500)
    
    # Deduplicate - keep only the most recent record for each player
    # Group by player_id and keep the one with most recent created_at or non-empty data
    player_stats_map = {}
    for stat in stats:
        player_id = stat.get('player_id')
        if player_id not in player_stats_map:
            player_stats_map[player_id] = stat
        else:
            # Compare - prefer record with actual data
            existing = player_stats_map[player_id]
            existing_has_data = any([
                existing.get('goals', 0) > 0,
                existing.get('saves', 0) > 0,
                existing.get('penalties_scored', 0) > 0,
                existing.get('penalties_missed', 0) > 0,
                existing.get('yellow_cards', 0) > 0,
                existing.get('started_match', False)
            ])
            new_has_data = any([
                stat.get('goals', 0) > 0,
                stat.get('saves', 0) > 0,
                stat.get('penalties_scored', 0) > 0,
                stat.get('penalties_missed', 0) > 0,
                stat.get('yellow_cards', 0) > 0,
                stat.get('started_match', False)
            ])
            # Prefer record with data, or more recent if both have data or neither has
            if new_has_data and not existing_has_data:
                player_stats_map[player_id] = stat
            elif new_has_data == existing_has_data:
                # Compare created_at
                new_time = stat.get('created_at', '')
                existing_time = existing.get('created_at', '')
                if new_time > existing_time:
                    player_stats_map[player_id] = stat
    
    stats = list(player_stats_map.values())
    
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
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_events:
        raise HTTPException(status_code=403, detail="Sem permissão para criar eventos")
    
    # Check team access if team_id is provided
    if event_data.team_id and not checker.is_admin:
        if not checker.can_access_team(event_data.team_id):
            raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")
    
    event = Event(**event_data.model_dump(), created_by=current_user['id'])
    event_dict = event.model_dump()
    event_dict['start_time'] = event_dict['start_time'].isoformat()
    if event_dict['end_time']:
        event_dict['end_time'] = event_dict['end_time'].isoformat()
    event_dict['created_at'] = event_dict['created_at'].isoformat()
    
    await db.events.insert_one(event_dict)
    # Remove MongoDB _id before returning
    event_dict.pop('_id', None)
    
    # Notify guardians (parents) of team members about the new event
    if event_data.team_id:
        # Format event time for notification
        event_time = event_dict['start_time']
        if isinstance(event_time, str):
            try:
                dt = datetime.fromisoformat(event_time.replace('Z', '+00:00'))
                event_time = dt.strftime('%d/%m/%Y às %H:%M')
            except:
                pass
        
        # Run notification in background (don't block response)
        import asyncio
        asyncio.create_task(notify_guardians_of_team_event(
            team_id=event_data.team_id,
            event_title=event_data.title,
            event_type=event_data.event_type,
            event_time=event_time
        ))
    
    return event_dict

@api_router.get("/events")
async def get_events(team_id: Optional[str] = None, event_type: Optional[str] = None, championship_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    checker = get_permission_checker(current_user)
    query = {}
    
    if team_id:
        # Verify user can access the requested team
        if not checker.is_admin and not checker.can_access_team(team_id):
            raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")
        query["team_id"] = team_id
    elif not checker.is_admin:
        # Filter by user's accessible teams
        user_teams = list(checker.team_ids)
        if user_teams:
            query["team_id"] = {"$in": user_teams}
        else:
            return []  # No team access, no events
    
    if event_type:
        query["event_type"] = event_type
    if championship_id:
        query["championship_id"] = championship_id
    
    events = await db.events.find(query, {"_id": 0}).sort("start_time", 1).to_list(500)
    
    for event in events:
        if isinstance(event.get('start_time'), str):
            event['start_time'] = datetime.fromisoformat(event['start_time'])
        if event.get('end_time') and isinstance(event['end_time'], str):
            event['end_time'] = datetime.fromisoformat(event['end_time'])
    
    return events

# NOTE: This route MUST be defined BEFORE /events/{event_id} to avoid route conflicts
@api_router.get("/events/upcoming-without-convocation")
async def get_upcoming_events_without_convocation(current_user: dict = Depends(get_current_user)):
    """Get upcoming events (next 24h) that don't have convocations - for coach notifications"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_create_convocations:
        return []
    
    now = datetime.now(timezone.utc)
    next_24h = now + timedelta(hours=24)
    
    # Build query based on user's teams
    query = {
        "start_time": {"$gte": now.isoformat(), "$lte": next_24h.isoformat()},
        "status": "scheduled"
    }
    
    if not checker.is_admin:
        user_teams = list(checker.team_ids)
        if not user_teams:
            return []
        query["team_id"] = {"$in": user_teams}
    
    events = await db.events.find(query, {"_id": 0}).to_list(50)
    
    # Filter events without convocations
    events_without_conv = []
    for event in events:
        convocation = await db.convocations.find_one({"event_id": event['id']}, {"_id": 0})
        if not convocation:
            events_without_conv.append(event)
    
    return events_without_conv

@api_router.get("/events/{event_id}")
async def get_event(event_id: str, current_user: dict = Depends(get_current_user)):
    checker = get_permission_checker(current_user)
    
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    
    # Check team access
    event_team_id = event.get('team_id')
    if event_team_id and not checker.is_admin and not checker.can_access_team(event_team_id):
        raise HTTPException(status_code=403, detail="Sem acesso a este evento")
    
    return event

@api_router.put("/events/{event_id}")
async def update_event(event_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_events:
        raise HTTPException(status_code=403, detail="Sem permissão para editar eventos")
    
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
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_team:
        raise HTTPException(status_code=403, detail="Sem permissão para eliminar eventos")
    
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    
    # Check team access
    if not checker.is_admin and event.get('team_id') and not checker.can_access_team(event.get('team_id')):
        raise HTTPException(status_code=403, detail="Sem acesso a este evento")
    
    await db.events.delete_one({"id": event_id})
    await db.convocations.delete_many({"event_id": event_id})
    await db.attendance.delete_many({"event_id": event_id})
    
    return {"message": "Evento eliminado"}

# ==================== CONVOCATION ROUTES ====================

@api_router.post("/convocations")
async def create_convocation(conv_data: ConvocationCreate, current_user: dict = Depends(get_current_user)):
    checker = get_permission_checker(current_user)
    
    if not checker.can_create_convocations:
        raise HTTPException(status_code=403, detail="Sem permissão para criar convocatórias")
    
    event = await db.events.find_one({"id": conv_data.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    
    # Check team access
    if not checker.is_admin and event.get('team_id') and not checker.can_access_team(event.get('team_id')):
        raise HTTPException(status_code=403, detail="Sem acesso a este evento")
    
    event_date = event['start_time'] if isinstance(event['start_time'], datetime) else datetime.fromisoformat(event['start_time'])
    
    # Check for unavailable players and warn
    unavailable_player_ids = []
    for player_id in conv_data.player_ids:
        unavails = await db.unavailabilities.find({
            "user_id": player_id,
            "start_date": {"$lte": event_date.isoformat()},
            "end_date": {"$gte": event_date.isoformat()}
        }, {"_id": 0}).to_list(1)
        if unavails:
            unavailable_player_ids.append(player_id)
    
    # Filter out unavailable players from convocation (they can still be manually added later)
    available_player_ids = [pid for pid in conv_data.player_ids if pid not in unavailable_player_ids]
    
    convocation = Convocation(
        event_id=conv_data.event_id,
        player_ids=available_player_ids,
        message=conv_data.message,
        visibility=conv_data.visibility,
        created_by=current_user['id']
    )
    conv_dict = convocation.model_dump()
    conv_dict['created_at'] = conv_dict['created_at'].isoformat()
    
    await db.convocations.insert_one(conv_dict)
    # Remove MongoDB _id before returning
    conv_dict.pop('_id', None)
    
    # Create attendance records only for available players
    for player_id in available_player_ids:
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
    
    # Send push notifications to convoked players
    try:
        await send_push_to_users(
            user_ids=available_player_ids,
            title="Nova Convocatória!",
            body=f"{event.get('title', 'Evento')} - {event_date.strftime('%d/%m às %H:%M')}",
            url="/attendance"
        )
    except Exception as e:
        logging.error(f"Failed to send push notifications: {e}")
    
    # Add info about unavailable players that were skipped
    conv_dict['skipped_unavailable_players'] = unavailable_player_ids
    
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
    checker = get_permission_checker(current_user)
    
    attendance = await db.attendance.find_one({"id": attendance_id})
    if not attendance:
        raise HTTPException(status_code=404, detail="Registo de presença não encontrado")
    
    # Get event to check if it has started
    event = await db.events.find_one({"id": attendance['event_id']}, {"_id": 0})
    event_started = False
    if event:
        event_time = event.get('start_time')
        if isinstance(event_time, str):
            event_time = datetime.fromisoformat(event_time.replace('Z', '+00:00'))
        # Ensure event_time is timezone-aware
        if event_time.tzinfo is None:
            event_time = event_time.replace(tzinfo=timezone.utc)
        event_started = datetime.now(timezone.utc) >= event_time
    
    # Determine who can update
    can_update = False
    is_self_or_family = False
    
    if checker.is_admin:
        can_update = True
    elif checker.is_coach and attendance.get('team_id'):
        # Coaches can always update for their teams (even after event started)
        can_update = checker.can_access_team(attendance.get('team_id'))
    elif attendance['player_id'] == current_user['id']:
        # Players can update their own attendance
        is_self_or_family = True
        can_update = True
    elif checker.is_staff and attendance.get('team_id'):
        # Other staff can update attendance for their teams
        can_update = checker.can_access_team(attendance.get('team_id'))
    elif checker.is_family_member and checker.linked_player_id:
        # Family members can update linked player's attendance
        is_self_or_family = True
        can_update = attendance['player_id'] == checker.linked_player_id
    
    if not can_update:
        raise HTTPException(status_code=403, detail="Sem permissão para atualizar esta presença")
    
    # After event started, only admin/coach can edit
    if event_started and is_self_or_family:
        raise HTTPException(
            status_code=403, 
            detail="O evento já começou. Apenas treinadores podem atualizar a presença."
        )
    
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
    checker = get_permission_checker(current_user)
    
    # Check team access
    if not checker.is_admin and not checker.can_access_team(team_id):
        raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")
    
    query = {"team_id": team_id}
    
    if event_type:
        query["event_type"] = event_type
    if championship_id:
        query["championship_id"] = championship_id
    
    attendances = await db.attendance.find(query, {"_id": 0}).to_list(5000)
    
    # For players, filter to only show their own attendance
    if checker.is_player and not checker.is_staff and not checker.is_admin:
        attendances = [a for a in attendances if a['player_id'] == current_user['id']]
    # For family members, filter to only show linked player's attendance
    elif checker.is_family_member and checker.linked_player_id:
        attendances = [a for a in attendances if a['player_id'] == checker.linked_player_id]
    
    # Filter by month if specified
    if month:
        attendances = [a for a in attendances if datetime.fromisoformat(a['event_date']).month == month]
    
    # Group by player
    player_stats = {}
    for att in attendances:
        pid = att['player_id']
        if pid not in player_stats:
            player_stats[pid] = {"total": 0, "confirmado": 0, "ausente": 0, "pendente": 0, "faltou_sem_aviso": 0}
        player_stats[pid]["total"] += 1
        status = att.get('status', 'pendente')
        if status in player_stats[pid]:
            player_stats[pid][status] += 1
    
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
    checker = get_permission_checker(current_user)
    
    # Check team access
    if not checker.is_admin and not checker.can_access_team(team_id):
        raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")
    
    # Get all attendance for this team
    attendances = await db.attendance.find({"team_id": team_id}, {"_id": 0}).to_list(5000)
    
    # For family members, filter to only show linked player's attendance
    if checker.is_family_member and checker.linked_player_id:
        attendances = [a for a in attendances if a['player_id'] == checker.linked_player_id]
    
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

@api_router.get("/teams/{team_id}/attendance/search")
async def search_team_attendance(team_id: str, query: str, current_user: dict = Depends(get_current_user)):
    """Search attendance by player name"""
    checker = get_permission_checker(current_user)
    
    # Check team access
    if not checker.is_admin and not checker.can_access_team(team_id):
        raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")
    
    # For players and family members, they can only search their own data
    if checker.is_player and not checker.is_staff:
        # Get own attendance
        attendances = await db.attendance.find({
            "team_id": team_id,
            "player_id": current_user['id']
        }, {"_id": 0}).to_list(500)
        
        # Filter by search term in own name
        user = await db.users.find_one({"id": current_user['id']}, {"_id": 0, "name": 1})
        if user and query.lower() not in user.get('name', '').lower():
            return []
    elif checker.is_family_member and checker.linked_player_id:
        attendances = await db.attendance.find({
            "team_id": team_id,
            "player_id": checker.linked_player_id
        }, {"_id": 0}).to_list(500)
        
        player = await db.users.find_one({"id": checker.linked_player_id}, {"_id": 0, "name": 1})
        if player and query.lower() not in player.get('name', '').lower():
            return []
    else:
        # Staff and admin can search all players
        # First find players matching the query
        players = await db.users.find({
            "team_ids": team_id,
            "name": {"$regex": query, "$options": "i"}
        }, {"_id": 0, "id": 1, "name": 1}).to_list(50)
        
        player_ids = [p['id'] for p in players]
        
        if not player_ids:
            return []
        
        attendances = await db.attendance.find({
            "team_id": team_id,
            "player_id": {"$in": player_ids}
        }, {"_id": 0}).to_list(2000)
    
    # Group by player
    player_stats = {}
    for att in attendances:
        pid = att['player_id']
        if pid not in player_stats:
            player_stats[pid] = {"total": 0, "confirmado": 0, "ausente": 0, "pendente": 0, "faltou_sem_aviso": 0}
        player_stats[pid]["total"] += 1
        status = att.get('status', 'pendente')
        if status in player_stats[pid]:
            player_stats[pid][status] += 1
    
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

@api_router.get("/teams/{team_id}/attendance/unavailabilities")
async def get_team_attendance_unavailabilities(team_id: str, current_user: dict = Depends(get_current_user)):
    """Get unavailability periods relevant to attendance for this team"""
    checker = get_permission_checker(current_user)
    
    # Check team access
    if not checker.is_admin and not checker.can_access_team(team_id):
        raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")
    
    # Get team members
    team_members = await db.users.find({"team_ids": team_id}, {"_id": 0, "id": 1, "name": 1, "role": 1}).to_list(100)
    member_ids = [m['id'] for m in team_members]
    
    # For players, only show own unavailabilities
    if checker.is_player and not checker.is_staff:
        unavailabilities = await db.unavailabilities.find({
            "user_id": current_user['id']
        }, {"_id": 0}).sort("start_date", -1).to_list(50)
    # For family members, show linked player's unavailabilities
    elif checker.is_family_member and checker.linked_player_id:
        unavailabilities = await db.unavailabilities.find({
            "user_id": checker.linked_player_id
        }, {"_id": 0}).sort("start_date", -1).to_list(50)
    else:
        # Staff and admin can see all team members' unavailabilities
        unavailabilities = await db.unavailabilities.find({
            "user_id": {"$in": member_ids}
        }, {"_id": 0}).sort("start_date", -1).to_list(200)
    
    # Enrich with user info
    for unav in unavailabilities:
        user = await db.users.find_one({"id": unav['user_id']}, {"_id": 0, "name": 1, "role": 1})
        if user:
            unav['user_name'] = user.get('name', 'Unknown')
            unav['user_role'] = user.get('role', 'jogador')
    
    return unavailabilities

@api_router.get("/attendance/my/detailed")
async def get_my_detailed_attendance(current_user: dict = Depends(get_current_user)):
    """Get current user's detailed attendance with event info and unavailabilities"""
    checker = get_permission_checker(current_user)
    
    # Determine which player's data to show
    player_id = current_user['id']
    if checker.is_family_member and checker.linked_player_id:
        player_id = checker.linked_player_id
    
    # Get attendance
    attendances = await db.attendance.find({"player_id": player_id}, {"_id": 0}).sort("event_date", -1).to_list(200)
    
    result = []
    now = datetime.now(timezone.utc)
    
    for att in attendances:
        event = await db.events.find_one({"id": att['event_id']}, {"_id": 0})
        if event:
            # Check if event has started
            event_time = event.get('start_time')
            if isinstance(event_time, str):
                event_time = datetime.fromisoformat(event_time.replace('Z', '+00:00'))
            
            # Ensure event_time is timezone-aware
            if event_time.tzinfo is None:
                event_time = event_time.replace(tzinfo=timezone.utc)
            
            event_started = now >= event_time
            
            result.append({
                "attendance": att,
                "event": event,
                "event_started": event_started,
                "can_edit": not event_started or checker.is_admin or checker.is_coach
            })
    
    # Get unavailabilities
    unavailabilities = await db.unavailabilities.find({
        "user_id": player_id
    }, {"_id": 0}).sort("start_date", -1).to_list(50)
    
    return {
        "attendance": result,
        "unavailabilities": unavailabilities
    }

@api_router.get("/events/{event_id}/attendance")
async def get_event_attendance(event_id: str, current_user: dict = Depends(get_current_user)):
    """Get attendance records for a specific event"""
    checker = get_permission_checker(current_user)
    
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check team access
    if not checker.is_admin and event.get('team_id') and not checker.can_access_team(event.get('team_id')):
        raise HTTPException(status_code=403, detail="Sem acesso a este evento")
    
    attendances = await db.attendance.find({"event_id": event_id}, {"_id": 0}).to_list(100)
    
    # For family members, filter to only show linked player's attendance
    if checker.is_family_member and checker.linked_player_id:
        attendances = [a for a in attendances if a['player_id'] == checker.linked_player_id]
    
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

# ==================== CONVOCATION STATUS ROUTES ====================

class ConvocationStatusUpdate(BaseModel):
    player_id: str
    status: str  # 'confirmado', 'ausente', 'pendente'

@api_router.get("/events/{event_id}/convocation-status")
async def get_convocation_status(event_id: str, current_user: dict = Depends(get_current_user)):
    """Get convocation status for an event - grouped by present/absent/pending"""
    checker = get_permission_checker(current_user)
    
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    
    team_id = event.get('team_id')
    if not checker.is_admin and not checker.can_access_team(team_id):
        raise HTTPException(status_code=403, detail="Sem acesso a este evento")
    
    # Get all attendance records for this event
    attendances = await db.attendance.find({"event_id": event_id}, {"_id": 0}).to_list(500)
    
    # Get player info
    player_ids = [a['player_id'] for a in attendances]
    players = await db.users.find({"id": {"$in": player_ids}}, {"_id": 0, "password": 0}).to_list(500)
    players_map = {p['id']: p for p in players}
    
    # Group by status
    present = []
    absent = []
    pending = []
    
    for att in attendances:
        player = players_map.get(att['player_id'])
        if not player:
            continue
        
        player_data = {
            "id": player['id'],
            "name": player.get('name'),
            "email": player.get('email'),
            "avatar_url": player.get('avatar_url'),
            "jersey_number": player.get('profile', {}).get('sports_info', {}).get('jersey_number'),
            "status": att.get('status', 'pendente'),
            "reason": att.get('reason'),
            "attendance_id": att.get('id')
        }
        
        status = att.get('status', 'pendente')
        if status == 'confirmado':
            present.append(player_data)
        elif status == 'ausente' or status == 'faltou_sem_aviso':
            absent.append(player_data)
        else:
            pending.append(player_data)
    
    # Check if event has passed
    event_date = event.get('date') or event.get('start_date')
    event_passed = False
    if event_date:
        try:
            event_dt = datetime.fromisoformat(event_date.replace('Z', '+00:00'))
            event_passed = datetime.now(timezone.utc) > event_dt
        except:
            pass
    
    return {
        "event_id": event_id,
        "event_title": event.get('title'),
        "event_date": event_date,
        "event_passed": event_passed,
        "present": sorted(present, key=lambda x: x['name'] or ''),
        "absent": sorted(absent, key=lambda x: x['name'] or ''),
        "pending": sorted(pending, key=lambda x: x['name'] or ''),
        "total": len(present) + len(absent) + len(pending),
        "confirmed_count": len(present)
    }

@api_router.put("/events/{event_id}/convocation-status")
async def update_convocation_status(event_id: str, update: ConvocationStatusUpdate, current_user: dict = Depends(get_current_user)):
    """Update a player's convocation status - Coach/Admin only"""
    checker = get_permission_checker(current_user)
    
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    
    team_id = event.get('team_id')
    
    # Only coach and admin can update status
    if not checker.is_admin and not (checker.is_coach and checker.can_access_team(team_id)):
        raise HTTPException(status_code=403, detail="Apenas treinadores e administradores podem atualizar o estado")
    
    # Validate status
    valid_statuses = ['confirmado', 'ausente', 'pendente', 'faltou_sem_aviso']
    if update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Use: {', '.join(valid_statuses)}")
    
    # Find and update attendance
    attendance = await db.attendance.find_one({
        "event_id": event_id,
        "player_id": update.player_id
    })
    
    if not attendance:
        raise HTTPException(status_code=404, detail="Registo de presença não encontrado")
    
    await db.attendance.update_one(
        {"id": attendance['id']},
        {"$set": {
            "status": update.status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": current_user['id']
        }}
    )
    
    return {"message": "Estado atualizado", "status": update.status}

@api_router.post("/events/{event_id}/send-reminder")
async def send_convocation_reminder(event_id: str, current_user: dict = Depends(get_current_user)):
    """Send reminder to all pending players for an event"""
    checker = get_permission_checker(current_user)
    
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    
    team_id = event.get('team_id')
    
    # Only coach and admin can send reminders
    if not checker.is_admin and not (checker.is_coach and checker.can_access_team(team_id)):
        raise HTTPException(status_code=403, detail="Apenas treinadores e administradores podem enviar lembretes")
    
    # Get pending attendances
    pending_attendances = await db.attendance.find({
        "event_id": event_id,
        "status": "pendente"
    }, {"_id": 0}).to_list(200)
    
    if not pending_attendances:
        return {"message": "Sem jogadores pendentes", "sent_count": 0}
    
    player_ids = [a['player_id'] for a in pending_attendances]
    players = await db.users.find({"id": {"$in": player_ids}}, {"_id": 0, "id": 1, "email": 1, "name": 1}).to_list(200)
    
    sent_count = 0
    errors = []
    
    # Try to send email reminders
    resend_key = os.environ.get('RESEND_API_KEY')
    
    for player in players:
        try:
            # Create app notification
            notification = {
                "id": str(uuid.uuid4()),
                "user_id": player['id'],
                "type": "convocation_reminder",
                "title": "Lembrete de Convocatória",
                "message": f"Por favor confirma a tua presença no evento: {event.get('title')}",
                "event_id": event_id,
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notification)
            
            # Try email if available
            if resend_key and player.get('email'):
                try:
                    import resend
                    resend.api_key = resend_key
                    resend.Emails.send({
                        "from": "StickPro <noreply@stickpro.app>",
                        "to": [player['email']],
                        "subject": f"Lembrete: {event.get('title')}",
                        "html": f"""
                        <h2>Lembrete de Convocatória</h2>
                        <p>Olá {player.get('name', 'Atleta')},</p>
                        <p>Por favor confirma a tua presença no evento <strong>{event.get('title')}</strong>.</p>
                        <p>Data: {event.get('date', event.get('start_date', 'N/A'))[:10]}</p>
                        <p>Acede à app para confirmar ou indicar ausência.</p>
                        """
                    })
                except Exception as e:
                    logging.warning(f"Email send error: {e}")
            
            sent_count += 1
        except Exception as e:
            errors.append(f"{player.get('name')}: {str(e)}")
    
    return {
        "message": "Lembretes enviados",
        "sent_count": sent_count,
        "errors": errors
    }

@api_router.post("/events/{event_id}/auto-mark-absent")
async def auto_mark_absent(event_id: str, current_user: dict = Depends(get_current_user)):
    """Auto-mark all pending players as absent for past events"""
    checker = get_permission_checker(current_user)
    
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    
    team_id = event.get('team_id')
    
    # Only coach and admin can auto-mark
    if not checker.is_admin and not (checker.is_coach and checker.can_access_team(team_id)):
        raise HTTPException(status_code=403, detail="Apenas treinadores e administradores podem marcar como ausente")
    
    # Check if event has passed
    event_date = event.get('date') or event.get('start_date')
    if event_date:
        try:
            event_dt = datetime.fromisoformat(event_date.replace('Z', '+00:00'))
            if datetime.now(timezone.utc) <= event_dt:
                raise HTTPException(status_code=400, detail="O evento ainda não passou")
        except HTTPException:
            raise
        except:
            pass
    
    # Update all pending to 'faltou_sem_aviso' (absent without notice)
    result = await db.attendance.update_many(
        {"event_id": event_id, "status": "pendente"},
        {"$set": {
            "status": "faltou_sem_aviso",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": current_user['id'],
            "auto_marked": True
        }}
    )
    
    return {
        "message": "Pendentes marcados como ausentes",
        "updated_count": result.modified_count
    }

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
    """
    Get dashboard data filtered by user role:
    - Admin/Gestor Desportivo: ALL club events
    - Coach/Delegate/Player: ONLY events from their teams
    - Parent/Guardian: Events of their linked children
    """
    user_role = current_user.get('role')
    user_teams = current_user.get('team_ids', [])
    linked_player_ids = current_user.get('linked_player_ids', [])
    linked_player_id = current_user.get('linked_player_id')
    
    # Build event query based on role
    now = datetime.now(timezone.utc).isoformat()
    upcoming_query = {"start_time": {"$gte": now}}
    
    if is_admin_role(user_role):
        # Admin/Gestor Desportivo: see ALL club events (no team filter)
        pass
    elif user_role == 'responsavel':
        # Parent/Guardian: see events of their children
        # Get team_ids from linked players
        child_team_ids = set()
        all_linked = linked_player_ids if linked_player_ids else ([linked_player_id] if linked_player_id else [])
        
        for player_id in all_linked:
            player = await db.users.find_one({"id": player_id}, {"_id": 0, "team_ids": 1})
            if player and player.get('team_ids'):
                child_team_ids.update(player['team_ids'])
        
        if child_team_ids:
            upcoming_query["team_id"] = {"$in": list(child_team_ids)}
        else:
            # No linked children or children have no teams - return empty
            upcoming_query["team_id"] = {"$in": []}
    else:
        # Coach/Delegate/Player: see ONLY events from their teams
        if user_teams:
            upcoming_query["team_id"] = {"$in": user_teams}
        else:
            # User has no teams - return empty
            upcoming_query["team_id"] = {"$in": []}
    
    upcoming_events = await db.events.find(upcoming_query, {"_id": 0}).sort("start_time", 1).limit(5).to_list(5)
    
    for event in upcoming_events:
        if isinstance(event.get('start_time'), str):
            event['start_time'] = datetime.fromisoformat(event['start_time'])
        team = await db.teams.find_one({"id": event['team_id']}, {"_id": 0})
        event['team'] = team
    
    # Pending attendances - always user's own or linked players'
    attendance_query = {"status": "pendente"}
    if user_role == 'responsavel' and (linked_player_ids or linked_player_id):
        all_linked = linked_player_ids if linked_player_ids else ([linked_player_id] if linked_player_id else [])
        attendance_query["player_id"] = {"$in": [current_user['id']] + all_linked}
    else:
        attendance_query["player_id"] = current_user['id']
    
    pending_attendances = await db.attendance.find(attendance_query, {"_id": 0}).to_list(10)
    
    pending_convocations = []
    for att in pending_attendances:
        event = await db.events.find_one({"id": att['event_id']}, {"_id": 0})
        if event:
            if isinstance(event.get('start_time'), str):
                event['start_time'] = datetime.fromisoformat(event['start_time'])
            pending_convocations.append({"attendance": att, "event": event})
    
    # Teams count based on role
    if is_admin_role(user_role):
        teams_count = await db.teams.count_documents({})
    elif user_role == 'responsavel':
        # Count teams of linked children
        child_team_ids = set()
        all_linked = linked_player_ids if linked_player_ids else ([linked_player_id] if linked_player_id else [])
        for player_id in all_linked:
            player = await db.users.find_one({"id": player_id}, {"_id": 0, "team_ids": 1})
            if player and player.get('team_ids'):
                child_team_ids.update(player['team_ids'])
        teams_count = len(child_team_ids)
    else:
        teams_count = len(user_teams)
    
    # Recent messages - filter by accessible teams
    recent_messages = []
    if is_admin_role(user_role):
        # Admin sees all messages
        recent_messages = await db.messages.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    elif user_role == 'responsavel':
        # Parent sees messages from children's teams
        child_team_ids = set()
        all_linked = linked_player_ids if linked_player_ids else ([linked_player_id] if linked_player_id else [])
        for player_id in all_linked:
            player = await db.users.find_one({"id": player_id}, {"_id": 0, "team_ids": 1})
            if player and player.get('team_ids'):
                child_team_ids.update(player['team_ids'])
        if child_team_ids:
            recent_messages = await db.messages.find({"team_id": {"$in": list(child_team_ids)}}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    elif user_teams:
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
    
    # Return URL with /api prefix so it's accessible via proxy
    return {"url": f"/api/uploads/{filename}", "filename": filename}

@api_router.delete("/upload/{filename}")
async def delete_image(filename: str, current_user: dict = Depends(get_current_user)):
    """Delete an uploaded image"""
    filepath = UPLOADS_DIR / filename
    if filepath.exists():
        filepath.unlink()
        return {"message": "Ficheiro eliminado"}
    raise HTTPException(status_code=404, detail="Ficheiro não encontrado")

# =====================
# Library Endpoints
# =====================

@api_router.get("/library")
async def get_library_items(
    category: Optional[str] = None,
    item_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all library items with optional filters"""
    query = {}
    if category:
        query["category"] = category
    if item_type:
        query["item_type"] = item_type
    
    items = await db.library_items.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@api_router.get("/library/categories")
async def get_library_categories(current_user: dict = Depends(get_current_user)):
    """Get all unique categories"""
    categories = await db.library_items.distinct("category")
    return [c for c in categories if c]

@api_router.post("/library")
async def create_library_item(item: LibraryItemCreate, current_user: dict = Depends(get_current_user)):
    """Create a new library item"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_team:
        raise HTTPException(status_code=403, detail="Sem permissão para criar recursos")
    
    # Generate thumbnail for videos
    thumbnail_url = None
    if item.item_type == "video":
        # Extract YouTube/Vimeo thumbnail
        if "youtube.com" in item.url or "youtu.be" in item.url:
            video_id = None
            if "youtu.be" in item.url:
                video_id = item.url.split("/")[-1].split("?")[0]
            elif "v=" in item.url:
                video_id = item.url.split("v=")[1].split("&")[0]
            if video_id:
                thumbnail_url = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
        elif "vimeo.com" in item.url:
            video_id = item.url.split("/")[-1]
            thumbnail_url = f"https://vumbnail.com/{video_id}.jpg"
    
    library_item = LibraryItem(
        title=item.title,
        description=item.description,
        item_type=item.item_type,
        url=item.url,
        category=item.category,
        tags=item.tags,
        thumbnail_url=thumbnail_url,
        created_by=current_user['id']
    )
    
    await db.library_items.insert_one(library_item.model_dump())
    return {**library_item.model_dump(), "_id": None}

@api_router.put("/library/{item_id}")
async def update_library_item(item_id: str, item: LibraryItemCreate, current_user: dict = Depends(get_current_user)):
    """Update a library item"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_team:
        raise HTTPException(status_code=403, detail="Sem permissão para editar recursos")
    
    existing = await db.library_items.find_one({"id": item_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    update_data = item.model_dump()
    await db.library_items.update_one({"id": item_id}, {"$set": update_data})
    
    updated = await db.library_items.find_one({"id": item_id}, {"_id": 0})
    return updated

@api_router.delete("/library/{item_id}")
async def delete_library_item(item_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a library item"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_manage_team:
        raise HTTPException(status_code=403, detail="Sem permissão para eliminar recursos")
    
    result = await db.library_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    return {"message": "Item eliminado com sucesso"}

# =====================
# AI Assistant Endpoints
# =====================

@api_router.post("/ai/chat")
async def ai_chat(request: AIChatRequest, current_user: dict = Depends(get_current_user)):
    """Chat with AI assistant about roller hockey and app help"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="AI não configurado")
    
    session_id = request.session_id or f"user_{current_user['id']}_{datetime.now().strftime('%Y%m%d')}"
    
    # Get chat history for this session
    history = await db.ai_chat_history.find(
        {"session_id": session_id}
    ).sort("timestamp", 1).to_list(50)
    
    # Build system message
    system_message = """Tu és o Assistente StickPro, um especialista em hóquei em patins e na aplicação StickPro.

SOBRE A APP STICKPRO:
- Gestão de equipas de hóquei em patins
- Calendário de eventos (treinos, jogos, torneios)
- Convocatórias e presenças
- Estatísticas de jogadores (golos, assistências, cartões)
- Campeonatos (5x5 e 3x3)
- Importação de fichas de jogo da APL
- Gestão de membros e perfis
- Biblioteca de documentos

SOBRE HÓQUEI EM PATINS:
- É um desporto com 5 jogadores (4 de campo + 1 guarda-redes)
- Jogado com patins de 4 rodas, stick e bola
- Duração: 2 partes de 25 minutos (seniores)
- Penáltis, livres diretos, cartões (azul, amarelo, vermelho)
- Principais ligas: Portugal (1ª Divisão), Espanha (OK Liga), Itália (Serie A1)

Responde sempre em português de forma clara e útil. Se não souberes a resposta, diz que não tens certeza."""

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-4o-mini")
        
        # Add history to context by directly appending to messages list
        for msg in history[-10:]:  # Last 10 messages
            chat.messages.append({
                'role': msg['role'],
                'content': msg['content']
            })
        
        # Send message
        user_message = UserMessage(text=request.message)
        response = await chat.send_message(user_message)
        
        # Save to history
        await db.ai_chat_history.insert_one({
            "session_id": session_id,
            "user_id": current_user['id'],
            "role": "user",
            "content": request.message,
            "timestamp": datetime.now(timezone.utc)
        })
        await db.ai_chat_history.insert_one({
            "session_id": session_id,
            "user_id": current_user['id'],
            "role": "assistant",
            "content": response,
            "timestamp": datetime.now(timezone.utc)
        })
        
        return {
            "response": response,
            "session_id": session_id
        }
        
    except Exception as e:
        logging.error(f"AI Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Erro no assistente: {str(e)}")

@api_router.get("/ai/chat/history")
async def get_ai_chat_history(session_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get chat history for user"""
    query = {"user_id": current_user['id']}
    if session_id:
        query["session_id"] = session_id
    
    history = await db.ai_chat_history.find(query, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return history

@api_router.delete("/ai/chat/history")
async def clear_ai_chat_history(session_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Clear chat history"""
    query = {"user_id": current_user['id']}
    if session_id:
        query["session_id"] = session_id
    
    await db.ai_chat_history.delete_many(query)
    return {"message": "Histórico apagado"}

# =====================
# Push Notifications Endpoints
# =====================

@api_router.get("/notifications/vapid-public-key")
async def get_vapid_public_key():
    """Get VAPID public key for push subscription"""
    public_key = os.environ.get('VAPID_PUBLIC_KEY')
    if not public_key:
        raise HTTPException(status_code=500, detail="Push notifications não configuradas")
    return {"publicKey": public_key}

@api_router.post("/notifications/subscribe")
async def subscribe_to_notifications(subscription: dict, current_user: dict = Depends(get_current_user)):
    """Subscribe user to push notifications"""
    # Store subscription in database
    subscription_data = {
        "user_id": current_user['id'],
        "endpoint": subscription.get('endpoint'),
        "keys": subscription.get('keys'),
        "created_at": datetime.now(timezone.utc)
    }
    
    # Update or insert subscription
    await db.push_subscriptions.update_one(
        {"user_id": current_user['id'], "endpoint": subscription.get('endpoint')},
        {"$set": subscription_data},
        upsert=True
    )
    
    return {"message": "Subscribed to notifications"}

@api_router.delete("/notifications/unsubscribe")
async def unsubscribe_from_notifications(current_user: dict = Depends(get_current_user)):
    """Unsubscribe user from push notifications"""
    await db.push_subscriptions.delete_many({"user_id": current_user['id']})
    return {"message": "Unsubscribed from notifications"}

@api_router.post("/notifications/send")
async def send_notification(notification_data: dict, current_user: dict = Depends(get_current_user)):
    """Send push notification - Admin/Coach only"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_create_convocations:
        raise HTTPException(status_code=403, detail="Sem permissão para enviar notificações")
    
    from pywebpush import webpush, WebPushException
    import json
    
    vapid_private_key = os.environ.get('VAPID_PRIVATE_KEY')
    vapid_claims_email = os.environ.get('VAPID_CLAIMS_EMAIL', 'noreply@stickpro.com')
    
    if not vapid_private_key:
        raise HTTPException(status_code=500, detail="Push notifications não configuradas")
    
    # Get target user subscriptions
    user_ids = notification_data.get('user_ids', [])
    team_id = notification_data.get('team_id')
    
    query = {}
    if user_ids:
        query["user_id"] = {"$in": user_ids}
    elif team_id:
        # Get all team members
        members = await db.team_members.find({"team_id": team_id}, {"user_id": 1}).to_list(1000)
        member_ids = [m['user_id'] for m in members]
        query["user_id"] = {"$in": member_ids}
    else:
        # Send to all users
        pass
    
    subscriptions = await db.push_subscriptions.find(query, {"_id": 0}).to_list(1000)
    
    payload = json.dumps({
        "title": notification_data.get('title', 'Stick Pro'),
        "body": notification_data.get('body', 'Nova notificação'),
        "url": notification_data.get('url', '/'),
        "icon": "/icons/icon-192x192.png"
    })
    
    success_count = 0
    failed_count = 0
    
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub['endpoint'],
                    "keys": sub['keys']
                },
                data=payload,
                vapid_private_key=vapid_private_key,
                vapid_claims={"sub": f"mailto:{vapid_claims_email}"}
            )
            success_count += 1
        except WebPushException as e:
            logging.error(f"Push failed: {e}")
            # Remove invalid subscriptions
            if e.response and e.response.status_code in [404, 410]:
                await db.push_subscriptions.delete_one({"endpoint": sub['endpoint']})
            failed_count += 1
        except Exception as e:
            logging.error(f"Push error: {e}")
            failed_count += 1
    
    return {
        "message": "Notificações enviadas",
        "success": success_count,
        "failed": failed_count
    }

# ==================== UNAVAILABILITY ROUTES ====================

@api_router.get("/unavailabilities")
async def get_unavailabilities(team_id: Optional[str] = None, user_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get unavailability periods - filtered by team/user and role permissions"""
    checker = get_permission_checker(current_user)
    query = {}
    
    if user_id:
        # Specific user's unavailabilities
        if user_id == current_user['id']:
            query["user_id"] = user_id
        elif checker.is_admin or checker.is_staff:
            query["user_id"] = user_id
        else:
            raise HTTPException(status_code=403, detail="Sem permissão para ver indisponibilidades de outros utilizadores")
    elif team_id:
        # Team's unavailabilities
        if not checker.is_admin and not checker.can_access_team(team_id):
            raise HTTPException(status_code=403, detail="Sem acesso a esta equipa")
        query["team_ids"] = team_id
    elif not checker.is_admin:
        # Filter by user's accessible teams
        user_teams = list(checker.team_ids)
        if user_teams:
            query["team_ids"] = {"$in": user_teams}
        else:
            # Show only own unavailabilities
            query["user_id"] = current_user['id']
    
    unavailabilities = await db.unavailabilities.find(query, {"_id": 0}).sort("start_date", 1).to_list(200)
    
    # Enrich with user info
    for unav in unavailabilities:
        user = await db.users.find_one({"id": unav['user_id']}, {"_id": 0, "name": 1, "role": 1})
        if user:
            unav['user_name'] = user.get('name', 'Unknown')
            unav['user_role'] = user.get('role', 'jogador')
    
    return unavailabilities

@api_router.get("/unavailabilities/my")
async def get_my_unavailabilities(current_user: dict = Depends(get_current_user)):
    """Get current user's unavailabilities"""
    unavailabilities = await db.unavailabilities.find({"user_id": current_user['id']}, {"_id": 0}).sort("start_date", 1).to_list(100)
    return unavailabilities

@api_router.post("/unavailabilities")
async def create_unavailability(data: UnavailabilityCreate, current_user: dict = Depends(get_current_user)):
    """Create unavailability period - players, coaches and delegates can create their own"""
    if data.start_date >= data.end_date:
        raise HTTPException(status_code=400, detail="Data inicial deve ser anterior à data final")
    
    # Get user's team IDs
    user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
    user_teams = user.get('team_ids', []) if user else []
    
    unavailability = Unavailability(
        user_id=current_user['id'],
        team_ids=user_teams,
        start_date=data.start_date,
        end_date=data.end_date,
        reason=data.reason,
        notes=data.notes
    )
    
    unav_dict = unavailability.model_dump()
    unav_dict['start_date'] = unav_dict['start_date'].isoformat()
    unav_dict['end_date'] = unav_dict['end_date'].isoformat()
    unav_dict['created_at'] = unav_dict['created_at'].isoformat()
    
    await db.unavailabilities.insert_one(unav_dict)
    unav_dict.pop('_id', None)
    
    # Notify coaches of the affected teams
    for team_id in user_teams:
        # Get coaches for this team
        team = await db.teams.find_one({"id": team_id}, {"_id": 0})
        if team:
            coach_ids = team.get('coach_ids', [])
            # Also get users with coach role assigned to this team
            coaches = await db.users.find({
                "$or": [
                    {"id": {"$in": coach_ids}},
                    {"team_ids": team_id, "role": {"$in": ["treinador", "treinador_adjunto"]}}
                ]
            }, {"_id": 0, "id": 1}).to_list(20)
            
            coach_user_ids = [c['id'] for c in coaches if c['id'] != current_user['id']]
            
            if coach_user_ids:
                reason_labels = {
                    'ferias': 'Férias',
                    'doenca': 'Doença/Consulta Médica',
                    'escola': 'Atividades Escolares',
                    'outro': 'Outro Motivo'
                }
                reason_label = reason_labels.get(data.reason, data.reason)
                
                # Send push notification
                try:
                    await send_push_to_users(
                        user_ids=coach_user_ids,
                        title="Jogador Indisponível",
                        body=f"{current_user.get('name', 'Jogador')} está indisponível ({reason_label}) de {data.start_date.strftime('%d/%m')} a {data.end_date.strftime('%d/%m')}",
                        url="/attendance"
                    )
                except Exception as e:
                    logging.error(f"Failed to notify coaches of unavailability: {e}")
                
                # Send email to coaches
                try:
                    for coach in coaches:
                        if coach['id'] != current_user['id']:
                            coach_data = await db.users.find_one({"id": coach['id']}, {"_id": 0, "email": 1, "name": 1})
                            if coach_data and coach_data.get('email'):
                                email_content = f"""
                                    <p>Olá <strong>{coach_data.get('name', 'Treinador')}</strong>,</p>
                                    <p>O atleta <strong>{current_user.get('name', 'Jogador')}</strong> registou um período de indisponibilidade:</p>
                                    <table style="margin: 20px 0; border-collapse: collapse;">
                                        <tr style="background-color: #fef3c7;">
                                            <td style="padding: 12px 16px; border: 1px solid #fcd34d; font-weight: 600;">Período</td>
                                            <td style="padding: 12px 16px; border: 1px solid #fcd34d;">{data.start_date.strftime('%d/%m/%Y')} a {data.end_date.strftime('%d/%m/%Y')}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 12px 16px; border: 1px solid #e5e7eb; font-weight: 600;">Motivo</td>
                                            <td style="padding: 12px 16px; border: 1px solid #e5e7eb;">{reason_label}</td>
                                        </tr>
                                    </table>
                                    {f'<p><strong>Notas:</strong> {data.notes}</p>' if data.notes else ''}
                                    <p style="color: #6b7280; font-size: 14px;">O atleta não será incluído nas convocatórias durante este período.</p>
                                """
                                
                                await send_email_notification(
                                    coach_data.get('email'),
                                    f"Indisponibilidade: {current_user.get('name', 'Jogador')}",
                                    build_email_template("Atleta Indisponível", email_content)
                                )
                except Exception as e:
                    logging.error(f"Failed to send unavailability email to coaches: {e}")
    
    return unav_dict

@api_router.put("/unavailabilities/{unavailability_id}")
async def update_unavailability(unavailability_id: str, data: UnavailabilityCreate, current_user: dict = Depends(get_current_user)):
    """Update unavailability - only owner can update"""
    unavailability = await db.unavailabilities.find_one({"id": unavailability_id}, {"_id": 0})
    if not unavailability:
        raise HTTPException(status_code=404, detail="Indisponibilidade não encontrada")
    
    if unavailability['user_id'] != current_user['id']:
        checker = get_permission_checker(current_user)
        if not checker.is_admin:
            raise HTTPException(status_code=403, detail="Sem permissão para editar esta indisponibilidade")
    
    if data.start_date >= data.end_date:
        raise HTTPException(status_code=400, detail="Data inicial deve ser anterior à data final")
    
    update_data = {
        "start_date": data.start_date.isoformat(),
        "end_date": data.end_date.isoformat(),
        "reason": data.reason,
        "notes": data.notes
    }
    
    await db.unavailabilities.update_one({"id": unavailability_id}, {"$set": update_data})
    return {"message": "Indisponibilidade atualizada"}

@api_router.delete("/unavailabilities/{unavailability_id}")
async def delete_unavailability(unavailability_id: str, current_user: dict = Depends(get_current_user)):
    """Delete unavailability - only owner or admin can delete"""
    unavailability = await db.unavailabilities.find_one({"id": unavailability_id}, {"_id": 0})
    if not unavailability:
        raise HTTPException(status_code=404, detail="Indisponibilidade não encontrada")
    
    if unavailability['user_id'] != current_user['id']:
        checker = get_permission_checker(current_user)
        if not checker.is_admin:
            raise HTTPException(status_code=403, detail="Sem permissão para eliminar esta indisponibilidade")
    
    await db.unavailabilities.delete_one({"id": unavailability_id})
    return {"message": "Indisponibilidade eliminada"}

@api_router.get("/unavailabilities/check")
async def check_unavailability(player_ids: str, event_date: str, current_user: dict = Depends(get_current_user)):
    """Check if players are unavailable for a specific date - used during convocation creation"""
    checker = get_permission_checker(current_user)
    
    if not checker.can_create_convocations:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    player_id_list = player_ids.split(',')
    event_dt = datetime.fromisoformat(event_date.replace('Z', '+00:00'))
    
    # Find unavailabilities that overlap with event date
    unavailable_players = []
    
    for player_id in player_id_list:
        unavails = await db.unavailabilities.find({
            "user_id": player_id,
            "start_date": {"$lte": event_dt.isoformat()},
            "end_date": {"$gte": event_dt.isoformat()}
        }, {"_id": 0}).to_list(10)
        
        if unavails:
            player = await db.users.find_one({"id": player_id}, {"_id": 0, "name": 1})
            unavailable_players.append({
                "player_id": player_id,
                "player_name": player.get('name', 'Unknown') if player else 'Unknown',
                "unavailabilities": unavails
            })
    
    return {"unavailable_players": unavailable_players}

# ==================== EVENT REMINDER SYSTEM ====================

async def process_event_reminders():
    """
    Process events approaching without convocation and send reminders to coaches.
    This function is idempotent - it can be called multiple times safely.
    """
    now = datetime.now(timezone.utc)
    
    # Window: events starting between 3.5h and 4.5h from now
    # This gives a 1-hour window to catch events even if the job runs slightly off schedule
    window_start = now + timedelta(hours=3, minutes=30)
    window_end = now + timedelta(hours=4, minutes=30)
    
    logging.info(f"Processing event reminders for events between {window_start} and {window_end}")
    
    # Find upcoming events without convocation in the window
    events = await db.events.find({
        "start_time": {
            "$gte": window_start.isoformat(),
            "$lte": window_end.isoformat()
        },
        "status": "scheduled"
    }, {"_id": 0}).to_list(100)
    
    reminders_sent = 0
    reminders_skipped = 0
    
    for event in events:
        event_id = event['id']
        team_id = event.get('team_id')
        
        if not team_id:
            continue
        
        # Check if this event already has a convocation
        convocation = await db.convocations.find_one({"event_id": event_id}, {"_id": 0})
        if convocation:
            reminders_skipped += 1
            continue
        
        # Check if reminder was already sent for this event
        existing_reminder = await db.event_reminders.find_one({
            "event_id": event_id,
            "reminder_type": "no_convocation_4h"
        }, {"_id": 0})
        
        if existing_reminder:
            reminders_skipped += 1
            continue
        
        # Get coaches for this team
        team = await db.teams.find_one({"id": team_id}, {"_id": 0})
        if not team:
            continue
        
        coach_ids = team.get('coach_ids', [])
        
        # Also get users with coach role assigned to this team
        coaches = await db.users.find({
            "$or": [
                {"id": {"$in": coach_ids}},
                {"team_ids": team_id, "role": {"$in": ["treinador", "treinador_adjunto"]}}
            ]
        }, {"_id": 0, "id": 1, "email": 1, "name": 1}).to_list(20)
        
        if not coaches:
            logging.warning(f"No coaches found for team {team_id}, skipping reminder for event {event_id}")
            continue
        
        coach_user_ids = list(set([c['id'] for c in coaches]))
        
        # Parse event time for display
        event_time = event['start_time']
        if isinstance(event_time, str):
            event_time = datetime.fromisoformat(event_time.replace('Z', '+00:00'))
        
        # Send push notification to coaches
        try:
            await send_push_to_users(
                user_ids=coach_user_ids,
                title="⚠️ Evento sem Convocatória!",
                body=f"{event.get('title', 'Evento')} começa às {event_time.strftime('%H:%M')} e ainda não tem convocatória",
                url="/calendar"
            )
        except Exception as e:
            logging.error(f"Failed to send push reminder for event {event_id}: {e}")
        
        # Send email notification to coaches
        for coach in coaches:
            try:
                email_content = f"""
                    <p>Olá <strong>{coach.get('name', 'Treinador')}</strong>,</p>
                    <p>O evento <strong>{event.get('title', 'Evento')}</strong> começa dentro de aproximadamente 4 horas e ainda não tem convocatória criada.</p>
                    <div style="margin: 20px 0; padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                        <p style="margin: 0 0 8px 0; font-weight: 600; color: #92400e;">⚠️ Ação Necessária</p>
                        <p style="margin: 0; color: #78350f;">Por favor, crie a convocatória para que os jogadores possam confirmar presença.</p>
                    </div>
                    <table style="margin: 20px 0; border-collapse: collapse; width: 100%;">
                        <tr style="background-color: #f8fafc;">
                            <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 600;">Evento</td>
                            <td style="padding: 12px; border: 1px solid #e5e7eb;">{event.get('title', 'Evento')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 600;">Data/Hora</td>
                            <td style="padding: 12px; border: 1px solid #e5e7eb;">{event_time.strftime('%d/%m/%Y às %H:%M')}</td>
                        </tr>
                        <tr style="background-color: #f8fafc;">
                            <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 600;">Tipo</td>
                            <td style="padding: 12px; border: 1px solid #e5e7eb;">{event.get('event_type', 'Outro')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 600;">Local</td>
                            <td style="padding: 12px; border: 1px solid #e5e7eb;">{event.get('location', 'N/A')}</td>
                        </tr>
                        <tr style="background-color: #f8fafc;">
                            <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 600;">Equipa</td>
                            <td style="padding: 12px; border: 1px solid #e5e7eb;">{team.get('name', 'N/A')}</td>
                        </tr>
                    </table>
                """
                
                await send_email_notification(
                    coach.get('email'),
                    f"⚠️ Lembrete: {event.get('title', 'Evento')} sem convocatória",
                    build_email_template("Evento sem Convocatória", email_content)
                )
            except Exception as e:
                logging.error(f"Failed to send email reminder to {coach.get('email')}: {e}")
        
        # Record that reminder was sent
        reminder = EventReminder(
            event_id=event_id,
            team_id=team_id,
            reminder_type="no_convocation_4h",
            notified_user_ids=coach_user_ids
        )
        reminder_dict = reminder.model_dump()
        reminder_dict['sent_at'] = reminder_dict['sent_at'].isoformat()
        await db.event_reminders.insert_one(reminder_dict)
        
        reminders_sent += 1
        logging.info(f"Sent reminder for event {event_id} to {len(coach_user_ids)} coach(es)")
    
    return {
        "processed": len(events),
        "reminders_sent": reminders_sent,
        "reminders_skipped": reminders_skipped
    }

@api_router.post("/reminders/process")
async def trigger_reminder_processing(current_user: dict = Depends(get_current_user)):
    """
    Manually trigger reminder processing.
    Admin only - this endpoint can be called by a cron job or scheduler.
    """
    checker = get_permission_checker(current_user)
    
    if not checker.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem processar lembretes")
    
    result = await process_event_reminders()
    return result

@api_router.get("/reminders/status")
async def get_reminder_status(event_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get reminder status for events"""
    checker = get_permission_checker(current_user)
    
    if not checker.is_staff and not checker.is_admin:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    query = {}
    if event_id:
        query["event_id"] = event_id
    
    reminders = await db.event_reminders.find(query, {"_id": 0}).sort("sent_at", -1).to_list(50)
    return reminders

@api_router.get("/reminders/pending")
async def get_pending_reminders(current_user: dict = Depends(get_current_user)):
    """
    Get events that will need reminders soon (next 6 hours) but don't have convocations yet.
    Useful for coaches to see what events need attention.
    """
    checker = get_permission_checker(current_user)
    
    if not checker.can_create_convocations:
        return []
    
    now = datetime.now(timezone.utc)
    next_6h = now + timedelta(hours=6)
    
    # Build query based on user's teams
    query = {
        "start_time": {"$gte": now.isoformat(), "$lte": next_6h.isoformat()},
        "status": "scheduled"
    }
    
    if not checker.is_admin:
        user_teams = list(checker.team_ids)
        if not user_teams:
            return []
        query["team_id"] = {"$in": user_teams}
    
    events = await db.events.find(query, {"_id": 0}).to_list(50)
    
    # Filter events without convocations and check reminder status
    result = []
    for event in events:
        convocation = await db.convocations.find_one({"event_id": event['id']}, {"_id": 0})
        if not convocation:
            # Check if reminder was already sent
            reminder = await db.event_reminders.find_one({
                "event_id": event['id'],
                "reminder_type": "no_convocation_4h"
            }, {"_id": 0})
            
            event['reminder_sent'] = reminder is not None
            event['reminder_sent_at'] = reminder.get('sent_at') if reminder else None
            result.append(event)
    
    return result

# ==================== PAYMENTS AND MONTHLY FEES ROUTES ====================

def get_payment_status(due_date: datetime, paid_at: Optional[datetime]) -> str:
    """Calculate payment status based on due date and payment date"""
    if paid_at:
        return "paid"
    now = datetime.now(timezone.utc)
    if isinstance(due_date, str):
        due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
    if due_date.tzinfo is None:
        due_date = due_date.replace(tzinfo=timezone.utc)
    if now > due_date:
        return "overdue"
    return "pending"

@api_router.get("/payments/my")
async def get_my_payments(season: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get current user's payments - accessible by all roles for their own data"""
    query = {"user_id": current_user['id']}
    
    # Get monthly fees
    fees = await db.monthly_fees.find(query, {"_id": 0}).sort("due_date", -1).to_list(100)
    
    # Get custom payments
    custom = await db.custom_payments.find(query, {"_id": 0}).sort("due_date", -1).to_list(100)
    
    # Update status for each payment
    for fee in fees:
        fee['status'] = get_payment_status(fee.get('due_date'), fee.get('paid_at'))
        fee['type'] = 'monthly_fee'
    
    for payment in custom:
        payment['status'] = get_payment_status(payment.get('due_date'), payment.get('paid_at'))
        payment['type'] = 'custom'
    
    # Combine and sort by due_date
    all_payments = fees + custom
    all_payments.sort(key=lambda x: x.get('due_date', ''), reverse=True)
    
    return all_payments

@api_router.get("/payments/status")
async def get_my_payment_status(current_user: dict = Depends(get_current_user)):
    """Get overall payment status for dashboard indicator"""
    now = datetime.now(timezone.utc)
    
    # Check if user has payments disabled
    user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
    if user and user.get('payments_disabled'):
        return {"status": "disabled", "message": "Pagamentos desativados"}
    
    # Get unpaid fees
    unpaid_fees = await db.monthly_fees.find({
        "user_id": current_user['id'],
        "paid_at": None
    }, {"_id": 0}).to_list(50)
    
    # Get unpaid custom payments
    unpaid_custom = await db.custom_payments.find({
        "user_id": current_user['id'],
        "paid_at": None
    }, {"_id": 0}).to_list(50)
    
    overdue_count = 0
    pending_count = 0
    total_overdue = 0
    total_pending = 0
    
    for fee in unpaid_fees:
        due_date = fee.get('due_date')
        if isinstance(due_date, str):
            due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
        if due_date and due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=timezone.utc)
        if due_date and now > due_date:
            overdue_count += 1
            total_overdue += fee.get('amount', 0)
        else:
            pending_count += 1
            total_pending += fee.get('amount', 0)
    
    for payment in unpaid_custom:
        due_date = payment.get('due_date')
        if isinstance(due_date, str):
            due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
        if due_date and due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=timezone.utc)
        if due_date and now > due_date:
            overdue_count += 1
            total_overdue += payment.get('amount', 0)
        else:
            pending_count += 1
            total_pending += payment.get('amount', 0)
    
    if overdue_count > 0:
        return {
            "status": "overdue",
            "overdue_count": overdue_count,
            "pending_count": pending_count,
            "total_overdue": total_overdue,
            "total_pending": total_pending
        }
    elif pending_count > 0:
        return {
            "status": "pending",
            "pending_count": pending_count,
            "total_pending": total_pending
        }
    else:
        return {"status": "paid", "message": "Todos os pagamentos em dia"}

@api_router.get("/payments/admin")
async def get_all_payments(user_id: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get all payments - admin only"""
    checker = get_permission_checker(current_user)
    
    if not checker.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem aceder a todos os pagamentos")
    
    fee_query = {}
    custom_query = {}
    
    if user_id:
        fee_query["user_id"] = user_id
        custom_query["user_id"] = user_id
    
    # Get monthly fees
    fees = await db.monthly_fees.find(fee_query, {"_id": 0}).sort("due_date", -1).to_list(500)
    
    # Get custom payments
    custom = await db.custom_payments.find(custom_query, {"_id": 0}).sort("due_date", -1).to_list(500)
    
    # Enrich with user info and update status
    user_cache = {}
    for fee in fees:
        fee['status'] = get_payment_status(fee.get('due_date'), fee.get('paid_at'))
        fee['type'] = 'monthly_fee'
        uid = fee.get('user_id')
        if uid not in user_cache:
            user = await db.users.find_one({"id": uid}, {"_id": 0, "name": 1, "email": 1})
            user_cache[uid] = user
        if user_cache.get(uid):
            fee['user_name'] = user_cache[uid].get('name', 'Unknown')
            fee['user_email'] = user_cache[uid].get('email', '')
    
    for payment in custom:
        payment['status'] = get_payment_status(payment.get('due_date'), payment.get('paid_at'))
        payment['type'] = 'custom'
        uid = payment.get('user_id')
        if uid not in user_cache:
            user = await db.users.find_one({"id": uid}, {"_id": 0, "name": 1, "email": 1})
            user_cache[uid] = user
        if user_cache.get(uid):
            payment['user_name'] = user_cache[uid].get('name', 'Unknown')
            payment['user_email'] = user_cache[uid].get('email', '')
    
    # Filter by status if specified
    all_payments = fees + custom
    if status:
        all_payments = [p for p in all_payments if p.get('status') == status]
    
    all_payments.sort(key=lambda x: x.get('due_date', ''), reverse=True)
    
    return all_payments

@api_router.get("/payments/export")
async def export_payments_excel(
    status: Optional[str] = Query(None, description="Filter by status: paid, pending, overdue"),
    payment_type: Optional[str] = Query(None, description="Filter by type: monthly_fee, custom"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    team_id: Optional[str] = Query(None, description="Filter by team ID"),
    season: Optional[str] = Query(None, description="Filter by season (e.g., 2025/2026)"),
    due_date_from: Optional[str] = Query(None, description="Due date from (ISO format)"),
    due_date_to: Optional[str] = Query(None, description="Due date to (ISO format)"),
    paid_date_from: Optional[str] = Query(None, description="Payment date from (ISO format)"),
    paid_date_to: Optional[str] = Query(None, description="Payment date to (ISO format)"),
    search: Optional[str] = Query(None, description="Search by player name or email"),
    current_user: dict = Depends(get_current_user)
):
    """Export payments to Excel file - admin only"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    from openpyxl.utils import get_column_letter
    
    checker = get_permission_checker(current_user)
    
    if not checker.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem exportar pagamentos")
    
    # Build queries for both collections
    fee_query = {}
    custom_query = {}
    
    if user_id:
        fee_query["user_id"] = user_id
        custom_query["user_id"] = user_id
    
    # Get monthly fees
    fees = await db.monthly_fees.find(fee_query, {"_id": 0}).sort("due_date", -1).to_list(1000)
    
    # Get custom payments
    custom = await db.custom_payments.find(custom_query, {"_id": 0}).sort("due_date", -1).to_list(1000)
    
    # Get all users for enrichment
    users = await db.users.find({}, {"_id": 0, "id": 1, "name": 1, "email": 1, "profile": 1, "team_ids": 1}).to_list(1000)
    user_map = {u["id"]: u for u in users}
    
    # Get all teams for team names
    teams = await db.teams.find({}, {"_id": 0, "id": 1, "name": 1, "season": 1}).to_list(100)
    team_map = {t["id"]: t for t in teams}
    
    # Process and enrich payments
    all_payments = []
    
    for fee in fees:
        fee['type'] = 'monthly_fee'
        fee['type_display'] = 'Mensalidade'
        fee['status'] = get_payment_status(fee.get('due_date'), fee.get('paid_at'))
        fee['description'] = f"Mensalidade {fee.get('month', '')}/{fee.get('year', '')}"
        
        user = user_map.get(fee.get('user_id'))
        if user:
            fee['user_name'] = user.get('name', 'Unknown')
            fee['user_email'] = user.get('email', '')
            fee['date_of_birth'] = user.get('profile', {}).get('identity', {}).get('birth_date', '')
            # Get team info
            team_ids = user.get('team_ids', [])
            team_names = [team_map.get(tid, {}).get('name', '') for tid in team_ids if team_map.get(tid)]
            fee['team'] = ', '.join(team_names) if team_names else ''
            team_seasons = [team_map.get(tid, {}).get('season', '') for tid in team_ids if team_map.get(tid)]
            fee['season'] = team_seasons[0] if team_seasons else ''
        
        all_payments.append(fee)
    
    for payment in custom:
        payment['type'] = 'custom'
        payment['type_display'] = 'Pagamento Personalizado'
        payment['status'] = get_payment_status(payment.get('due_date'), payment.get('paid_at'))
        
        user = user_map.get(payment.get('user_id'))
        if user:
            payment['user_name'] = user.get('name', 'Unknown')
            payment['user_email'] = user.get('email', '')
            payment['date_of_birth'] = user.get('profile', {}).get('identity', {}).get('birth_date', '')
            team_ids = user.get('team_ids', [])
            team_names = [team_map.get(tid, {}).get('name', '') for tid in team_ids if team_map.get(tid)]
            payment['team'] = ', '.join(team_names) if team_names else ''
            team_seasons = [team_map.get(tid, {}).get('season', '') for tid in team_ids if team_map.get(tid)]
            payment['season'] = team_seasons[0] if team_seasons else ''
        
        all_payments.append(payment)
    
    # Apply filters
    if status:
        all_payments = [p for p in all_payments if p.get('status') == status]
    
    if payment_type:
        all_payments = [p for p in all_payments if p.get('type') == payment_type]
    
    if team_id:
        team_name = team_map.get(team_id, {}).get('name', '')
        if team_name:
            all_payments = [p for p in all_payments if team_name in p.get('team', '')]
    
    if season:
        all_payments = [p for p in all_payments if p.get('season') == season or season in p.get('description', '')]
    
    if due_date_from:
        all_payments = [p for p in all_payments if p.get('due_date', '') >= due_date_from]
    
    if due_date_to:
        all_payments = [p for p in all_payments if p.get('due_date', '') <= due_date_to]
    
    if paid_date_from:
        all_payments = [p for p in all_payments if p.get('paid_at') and p.get('paid_at', '') >= paid_date_from]
    
    if paid_date_to:
        all_payments = [p for p in all_payments if p.get('paid_at') and p.get('paid_at', '') <= paid_date_to]
    
    if search:
        search_lower = search.lower()
        all_payments = [p for p in all_payments if 
                       search_lower in p.get('user_name', '').lower() or 
                       search_lower in p.get('user_email', '').lower()]
    
    # Sort by due date descending
    all_payments.sort(key=lambda x: x.get('due_date', ''), reverse=True)
    
    # Create Excel workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Pagamentos"
    
    # Define headers
    headers = [
        "Nome do Jogador",
        "Data de Nascimento",
        "Equipa",
        "Época",
        "Tipo de Pagamento",
        "Descrição",
        "Valor (€)",
        "Data de Criação",
        "Data de Vencimento",
        "Estado",
        "Data de Pagamento",
        "Comprovativo",
        "Notas"
    ]
    
    # Header styling
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="0D9488", end_color="0D9488", fill_type="solid")  # Teal color
    header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Write headers
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = thin_border
    
    # Status translations
    status_map = {
        'paid': 'Pago',
        'pending': 'Pendente',
        'overdue': 'Atrasado'
    }
    
    # Write data
    for row_idx, payment in enumerate(all_payments, 2):
        # Format dates
        due_date = payment.get('due_date', '')
        if due_date:
            try:
                dt = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                due_date = dt.strftime('%d/%m/%Y')
            except:
                pass
        
        created_at = payment.get('created_at', '')
        if created_at:
            try:
                dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                created_at = dt.strftime('%d/%m/%Y')
            except:
                pass
        
        paid_at = payment.get('paid_at', '')
        if paid_at:
            try:
                dt = datetime.fromisoformat(paid_at.replace('Z', '+00:00'))
                paid_at = dt.strftime('%d/%m/%Y')
            except:
                pass
        
        birth_date = payment.get('date_of_birth', '')
        if birth_date:
            try:
                dt = datetime.fromisoformat(birth_date.replace('Z', '+00:00'))
                birth_date = dt.strftime('%d/%m/%Y')
            except:
                pass
        
        row_data = [
            payment.get('user_name', ''),
            birth_date,
            payment.get('team', ''),
            payment.get('season', ''),
            payment.get('type_display', ''),
            payment.get('description', payment.get('title', '')),
            payment.get('amount', 0),
            created_at,
            due_date,
            status_map.get(payment.get('status'), payment.get('status', '')),
            paid_at,
            'Sim' if payment.get('proof_url') else 'Não',
            payment.get('notes', '')
        ]
        
        for col, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_idx, column=col, value=value)
            cell.border = thin_border
            cell.alignment = Alignment(vertical="center")
            
            # Format amount column
            if col == 7 and isinstance(value, (int, float)):
                cell.number_format = '€#,##0.00'
    
    # Adjust column widths
    column_widths = [25, 15, 20, 12, 20, 35, 12, 14, 14, 12, 14, 12, 30]
    for col, width in enumerate(column_widths, 1):
        ws.column_dimensions[get_column_letter(col)].width = width
    
    # Freeze header row
    ws.freeze_panes = 'A2'
    
    # Save to BytesIO
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"pagamentos_export_{timestamp}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/payments/summary")
async def get_payments_summary(current_user: dict = Depends(get_current_user)):
    """Get payments summary - admin only"""
    checker = get_permission_checker(current_user)
    
    if not checker.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem ver resumo de pagamentos")
    
    now = datetime.now(timezone.utc)
    
    # Get all unpaid
    unpaid_fees = await db.monthly_fees.find({"paid_at": None}, {"_id": 0}).to_list(500)
    unpaid_custom = await db.custom_payments.find({"paid_at": None}, {"_id": 0}).to_list(500)
    
    # Get paid this month
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    paid_fees_month = await db.monthly_fees.find({
        "paid_at": {"$gte": month_start.isoformat()}
    }, {"_id": 0}).to_list(500)
    paid_custom_month = await db.custom_payments.find({
        "paid_at": {"$gte": month_start.isoformat()}
    }, {"_id": 0}).to_list(500)
    
    total_overdue = 0
    total_pending = 0
    overdue_count = 0
    pending_count = 0
    
    for fee in unpaid_fees:
        due_date = fee.get('due_date')
        if isinstance(due_date, str):
            due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
        if due_date and due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=timezone.utc)
        if due_date and now > due_date:
            overdue_count += 1
            total_overdue += fee.get('amount', 0)
        else:
            pending_count += 1
            total_pending += fee.get('amount', 0)
    
    for payment in unpaid_custom:
        due_date = payment.get('due_date')
        if isinstance(due_date, str):
            due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
        if due_date and due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=timezone.utc)
        if due_date and now > due_date:
            overdue_count += 1
            total_overdue += payment.get('amount', 0)
        else:
            pending_count += 1
            total_pending += payment.get('amount', 0)
    
    total_collected_month = sum(f.get('amount', 0) for f in paid_fees_month) + sum(p.get('amount', 0) for p in paid_custom_month)
    
    return {
        "overdue_count": overdue_count,
        "pending_count": pending_count,
        "total_overdue": total_overdue,
        "total_pending": total_pending,
        "collected_this_month": total_collected_month,
        "paid_count_this_month": len(paid_fees_month) + len(paid_custom_month)
    }

@api_router.post("/payments/monthly-fees")
async def create_monthly_fee(data: MonthlyFeeCreate, current_user: dict = Depends(get_current_user)):
    """Create a monthly fee - admin only"""
    checker = get_permission_checker(current_user)
    
    if not checker.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar mensalidades")
    
    # Check if user exists
    user = await db.users.find_one({"id": data.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    
    # Check if fee already exists for this month/year
    existing = await db.monthly_fees.find_one({
        "user_id": data.user_id,
        "month": data.month,
        "year": data.year
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"Já existe mensalidade para {data.month}/{data.year}")
    
    fee = MonthlyFee(
        user_id=data.user_id,
        amount=data.amount,
        month=data.month,
        year=data.year,
        due_date=data.due_date,
        notes=data.notes,
        created_by=current_user['id']
    )
    
    fee_dict = fee.model_dump()
    fee_dict['due_date'] = fee_dict['due_date'].isoformat()
    fee_dict['created_at'] = fee_dict['created_at'].isoformat()
    
    await db.monthly_fees.insert_one(fee_dict)
    fee_dict.pop('_id', None)
    
    return fee_dict

@api_router.post("/payments/monthly-fees/bulk")
async def create_monthly_fees_bulk(month: int, year: int, amount: float, due_date: datetime, user_ids: List[str] = None, current_user: dict = Depends(get_current_user)):
    """Create monthly fees for multiple users - admin only"""
    checker = get_permission_checker(current_user)
    
    if not checker.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar mensalidades")
    
    if not user_ids:
        # Get all active players
        users = await db.users.find({
            "role": "jogador",
            "is_archived": {"$ne": True},
            "payments_disabled": {"$ne": True}
        }, {"_id": 0, "id": 1}).to_list(500)
        user_ids = [u['id'] for u in users]
    
    created = 0
    skipped = 0
    
    for uid in user_ids:
        # Check if already exists
        existing = await db.monthly_fees.find_one({
            "user_id": uid,
            "month": month,
            "year": year
        })
        if existing:
            skipped += 1
            continue
        
        # Check if user has payments disabled
        user = await db.users.find_one({"id": uid}, {"_id": 0})
        if user and user.get('payments_disabled'):
            skipped += 1
            continue
        
        fee = MonthlyFee(
            user_id=uid,
            amount=amount,
            month=month,
            year=year,
            due_date=due_date,
            created_by=current_user['id']
        )
        
        fee_dict = fee.model_dump()
        fee_dict['due_date'] = fee_dict['due_date'].isoformat()
        fee_dict['created_at'] = fee_dict['created_at'].isoformat()
        
        await db.monthly_fees.insert_one(fee_dict)
        created += 1
    
    return {"message": f"Mensalidades criadas: {created}, ignoradas: {skipped}"}

@api_router.post("/payments/monthly-fees/import")
async def import_monthly_fees(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Import monthly fees from Excel - admin only"""
    checker = get_permission_checker(current_user)
    
    if not checker.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem importar mensalidades")
    
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="Formato não suportado. Use Excel ou CSV")
    
    try:
        content = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
        
        df.columns = [str(col).lower().strip().replace(' ', '_') for col in df.columns]
        
        created = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                # Find user by email or name
                email = None
                user = None
                
                for col in ['email', 'e-mail', 'correio']:
                    if col in df.columns and pd.notna(row.get(col)):
                        email = str(row[col]).strip()
                        break
                
                if email:
                    user = await db.users.find_one({"email": email}, {"_id": 0})
                
                if not user:
                    errors.append(f"Linha {idx + 2}: Utilizador não encontrado")
                    continue
                
                # Get amount
                amount = None
                for col in ['valor', 'amount', 'montante', 'quantia']:
                    if col in df.columns and pd.notna(row.get(col)):
                        amount = float(row[col])
                        break
                
                if not amount:
                    errors.append(f"Linha {idx + 2}: Valor não encontrado")
                    continue
                
                # Get month/year
                month = None
                year = None
                for col in ['mes', 'month', 'mês']:
                    if col in df.columns and pd.notna(row.get(col)):
                        month = int(row[col])
                        break
                
                for col in ['ano', 'year']:
                    if col in df.columns and pd.notna(row.get(col)):
                        year = int(row[col])
                        break
                
                if not month or not year:
                    errors.append(f"Linha {idx + 2}: Mês ou ano não encontrado")
                    continue
                
                # Get due date
                due_date = None
                for col in ['vencimento', 'due_date', 'data_limite']:
                    if col in df.columns and pd.notna(row.get(col)):
                        due_date = pd.to_datetime(row[col])
                        break
                
                if not due_date:
                    # Default to last day of month
                    if month == 12:
                        due_date = datetime(year + 1, 1, 1) - timedelta(days=1)
                    else:
                        due_date = datetime(year, month + 1, 1) - timedelta(days=1)
                
                # Check if exists
                existing = await db.monthly_fees.find_one({
                    "user_id": user['id'],
                    "month": month,
                    "year": year
                })
                if existing:
                    errors.append(f"Linha {idx + 2}: Já existe mensalidade para {month}/{year}")
                    continue
                
                fee = MonthlyFee(
                    user_id=user['id'],
                    amount=amount,
                    month=month,
                    year=year,
                    due_date=due_date,
                    created_by=current_user['id']
                )
                
                fee_dict = fee.model_dump()
                fee_dict['due_date'] = fee_dict['due_date'].isoformat()
                fee_dict['created_at'] = fee_dict['created_at'].isoformat()
                
                await db.monthly_fees.insert_one(fee_dict)
                created += 1
                
            except Exception as e:
                errors.append(f"Linha {idx + 2}: {str(e)}")
        
        return {
            "message": f"Importação concluída: {created} mensalidades criadas",
            "created": created,
            "errors": errors[:10]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar ficheiro: {str(e)}")

@api_router.post("/payments/custom")
async def create_custom_payment(data: CustomPaymentCreate, current_user: dict = Depends(get_current_user)):
    """Create a custom payment/charge - admin only"""
    checker = get_permission_checker(current_user)
    
    if not checker.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar pagamentos")
    
    # Check if user exists
    user = await db.users.find_one({"id": data.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    
    payment = CustomPayment(
        user_id=data.user_id,
        title=data.title,
        description=data.description,
        amount=data.amount,
        due_date=data.due_date,
        created_by=current_user['id']
    )
    
    payment_dict = payment.model_dump()
    payment_dict['due_date'] = payment_dict['due_date'].isoformat()
    payment_dict['created_at'] = payment_dict['created_at'].isoformat()
    
    await db.custom_payments.insert_one(payment_dict)
    payment_dict.pop('_id', None)
    
    # Notify the user via push and email
    try:
        await send_push_to_users(
            user_ids=[data.user_id],
            title="Novo Pagamento",
            body=f"Foi criado um novo pagamento: {data.title} - €{data.amount:.2f}",
            url="/payments"
        )
    except Exception as e:
        logging.error(f"Failed to notify user of new payment: {e}")
    
    # Send email notification
    try:
        due_date_str = data.due_date.strftime('%d/%m/%Y') if hasattr(data.due_date, 'strftime') else str(data.due_date)[:10]
        email_content = f"""
            <p>Olá <strong>{user.get('name', 'Atleta')}</strong>,</p>
            <p>Foi criado um novo pagamento para ti:</p>
            <table style="margin: 20px 0; border-collapse: collapse; width: 100%;">
                <tr style="background-color: #f8fafc;">
                    <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 600;">Descrição</td>
                    <td style="padding: 12px; border: 1px solid #e5e7eb;">{data.title}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 600;">Valor</td>
                    <td style="padding: 12px; border: 1px solid #e5e7eb; font-size: 18px; color: #0f172a;"><strong>€{data.amount:.2f}</strong></td>
                </tr>
                <tr style="background-color: #f8fafc;">
                    <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 600;">Vencimento</td>
                    <td style="padding: 12px; border: 1px solid #e5e7eb;">{due_date_str}</td>
                </tr>
            </table>
            {f'<p><strong>Detalhes:</strong> {data.description}</p>' if data.description else ''}
            <p style="margin-top: 20px;">Podes aceder à app para ver todos os teus pagamentos e carregar o comprovativo.</p>
        """
        
        await send_email_notification(
            user.get('email'),
            f"Novo Pagamento: {data.title}",
            build_email_template("Novo Pagamento Criado", email_content)
        )
    except Exception as e:
        logging.error(f"Failed to send payment email: {e}")
    
    return payment_dict

@api_router.put("/payments/{payment_type}/{payment_id}/mark-paid")
async def mark_payment_as_paid(payment_type: str, payment_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a payment as paid - admin only"""
    checker = get_permission_checker(current_user)
    
    if not checker.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem marcar pagamentos como pagos")
    
    collection = db.monthly_fees if payment_type == "monthly_fee" else db.custom_payments
    
    payment = await collection.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    
    now = datetime.now(timezone.utc)
    await collection.update_one(
        {"id": payment_id},
        {"$set": {"paid_at": now.isoformat(), "status": "paid"}}
    )
    
    # Send confirmation email to the user
    try:
        user = await db.users.find_one({"id": payment.get('user_id')}, {"_id": 0})
        if user and user.get('email'):
            # Get payment description
            if payment_type == "monthly_fee":
                months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                month_name = months[payment.get('month', 1) - 1]
                payment_desc = f"Mensalidade {month_name}/{payment.get('year', '')}"
            else:
                payment_desc = payment.get('title', 'Pagamento')
            
            email_content = f"""
                <p>Olá <strong>{user.get('name', 'Atleta')}</strong>,</p>
                <p>Confirmamos que o teu pagamento foi registado com sucesso:</p>
                <div style="margin: 20px 0; padding: 20px; background-color: #ecfdf5; border-radius: 8px; border-left: 4px solid #10b981;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #065f46;">Pagamento Confirmado</p>
                    <p style="margin: 0; font-size: 18px; font-weight: 600; color: #047857;">{payment_desc}</p>
                    <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: 700; color: #059669;">€{payment.get('amount', 0):.2f}</p>
                </div>
                <p style="color: #6b7280; font-size: 14px;">Data de confirmação: {now.strftime('%d/%m/%Y às %H:%M')}</p>
                <p style="margin-top: 20px;">Obrigado!</p>
            """
            
            await send_email_notification(
                user.get('email'),
                f"Pagamento Confirmado: {payment_desc}",
                build_email_template("Pagamento Confirmado ✓", email_content)
            )
    except Exception as e:
        logging.error(f"Failed to send payment confirmation email: {e}")
    
    return {"message": "Pagamento marcado como pago"}

@api_router.put("/payments/{payment_type}/{payment_id}/upload-proof")
async def upload_payment_proof(payment_type: str, payment_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload payment proof - owner or admin"""
    collection = db.monthly_fees if payment_type == "monthly_fee" else db.custom_payments
    
    payment = await collection.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    
    checker = get_permission_checker(current_user)
    if payment['user_id'] != current_user['id'] and not checker.is_admin:
        raise HTTPException(status_code=403, detail="Sem permissão para este pagamento")
    
    # Validate file type
    allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp']
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Tipo de ficheiro não suportado. Use PDF, JPG ou PNG")
    
    # Read and save file
    content = await file.read()
    
    # Create uploads directory if needed
    uploads_dir = Path("/app/uploads/proofs")
    uploads_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    filename = f"{payment_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = uploads_dir / filename
    
    with open(file_path, 'wb') as f:
        f.write(content)
    
    # Store relative path
    proof_url = f"/uploads/proofs/{filename}"
    
    await collection.update_one(
        {"id": payment_id},
        {"$set": {"proof_url": proof_url, "proof_filename": file.filename}}
    )
    
    return {"message": "Comprovativo carregado", "proof_url": proof_url}

@api_router.delete("/payments/{payment_type}/{payment_id}")
async def delete_payment(payment_type: str, payment_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a payment - admin only"""
    checker = get_permission_checker(current_user)
    
    if not checker.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem eliminar pagamentos")
    
    collection = db.monthly_fees if payment_type == "monthly_fee" else db.custom_payments
    
    result = await collection.delete_one({"id": payment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    
    return {"message": "Pagamento eliminado"}

@api_router.put("/users/{user_id}/payment-settings")
async def update_user_payment_settings(user_id: str, data: PaymentSettingsUpdate, current_user: dict = Depends(get_current_user)):
    """Update user payment settings - admin only"""
    checker = get_permission_checker(current_user)
    
    if not checker.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem alterar definições de pagamento")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    
    update_data = {}
    if data.payments_disabled is not None:
        update_data['payments_disabled'] = data.payments_disabled
    if data.default_monthly_fee is not None:
        update_data['default_monthly_fee'] = data.default_monthly_fee
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    return {"message": "Definições atualizadas"}

@api_router.get("/users/{user_id}/payments")
async def get_user_payments(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get payments for a specific user - admin or owner only"""
    checker = get_permission_checker(current_user)
    
    if user_id != current_user['id'] and not checker.is_admin:
        raise HTTPException(status_code=403, detail="Sem permissão para ver pagamentos de outros utilizadores")
    
    # Get monthly fees
    fees = await db.monthly_fees.find({"user_id": user_id}, {"_id": 0}).sort("due_date", -1).to_list(100)
    
    # Get custom payments
    custom = await db.custom_payments.find({"user_id": user_id}, {"_id": 0}).sort("due_date", -1).to_list(100)
    
    # Update status
    for fee in fees:
        fee['status'] = get_payment_status(fee.get('due_date'), fee.get('paid_at'))
        fee['type'] = 'monthly_fee'
    
    for payment in custom:
        payment['status'] = get_payment_status(payment.get('due_date'), payment.get('paid_at'))
        payment['type'] = 'custom'
    
    all_payments = fees + custom
    all_payments.sort(key=lambda x: x.get('due_date', ''), reverse=True)
    
    return all_payments


# Background task runner for periodic reminder processing
async def start_reminder_scheduler():
    """
    Start a background task that processes reminders every 30 minutes.
    This is a simple scheduler - in production, consider using Celery or APScheduler.
    """
    while True:
        try:
            logging.info("Running scheduled reminder processing...")
            result = await process_event_reminders()
            logging.info(f"Reminder processing complete: {result}")
        except Exception as e:
            logging.error(f"Error in reminder scheduler: {e}")
        
        # Wait 30 minutes before next run
        await asyncio.sleep(30 * 60)

# Start the scheduler when the app starts
@app.on_event("startup")
async def startup_event():
    # Start the reminder scheduler as a background task
    asyncio.create_task(start_reminder_scheduler())
    logging.info("Event reminder scheduler started")

# ==================== MAIN ====================

app.include_router(api_router)

# Static files for payment proofs
BASE_DIR = Path(__file__).resolve().parent
uploads_path = BASE_DIR / "uploads"
uploads_path.mkdir(parents=True, exist_ok=True)
if uploads_path.exists():
    app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

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
