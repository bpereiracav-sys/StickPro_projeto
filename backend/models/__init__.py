# Models - Type definitions and Pydantic models for StickPro
from typing import Optional, List, Dict, Literal
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from datetime import datetime, timezone
from enum import Enum
import uuid

# Type definitions
UserRole = Literal["admin", "gestor_desportivo", "treinador", "treinador_adjunto", "delegado", "jogador", "responsavel"]
EventType = Literal["treino", "jogo_campeonato", "jogo_amigavel", "torneio", "outro"]
AttendanceStatus = Literal["confirmado", "ausente", "pendente", "faltou_sem_aviso"]
MatchLocation = Literal["casa", "fora", "neutro"]
PlayerPosition = Literal["GR", "JC"]
ChampionshipFormat = Literal["5x5", "3x3"]
ConvocationType = Literal["automatica", "manual"]
EquipmentSize = str

# Admin-level roles
ADMIN_ROLES = ["admin", "gestor_desportivo"]

def is_admin_role(role: str) -> bool:
    """Check if a role has admin-level permissions"""
    return role in ADMIN_ROLES

# Default permissions by role
DEFAULT_PERMISSIONS = {
    "admin": {
        "can_view_all": True, "can_edit_all": True, "can_manage_permissions": True,
        "can_view_family_data": True, "can_edit_family_data": True, "can_manage_teams": True,
        "can_manage_championships": True, "can_manage_events": True, "can_manage_members": True,
    },
    "gestor_desportivo": {
        "can_view_all": True, "can_edit_all": True, "can_manage_permissions": True,
        "can_view_family_data": True, "can_edit_family_data": True, "can_manage_teams": True,
        "can_manage_championships": True, "can_manage_events": True, "can_manage_members": True,
    },
    "treinador": {
        "can_view_all": False, "can_edit_all": False, "can_manage_permissions": False,
        "can_view_family_data": False, "can_edit_family_data": False, "can_manage_teams": True,
        "can_manage_championships": True, "can_manage_events": True, "can_manage_members": True,
    },
    "treinador_adjunto": {
        "can_view_all": False, "can_edit_all": False, "can_manage_permissions": False,
        "can_view_family_data": False, "can_edit_family_data": False, "can_manage_teams": True,
        "can_manage_championships": True, "can_manage_events": True, "can_manage_members": True,
    },
    "delegado": {
        "can_view_all": False, "can_edit_all": False, "can_manage_permissions": False,
        "can_view_family_data": False, "can_edit_family_data": False, "can_manage_teams": True,
        "can_manage_championships": True, "can_manage_events": True, "can_manage_members": True,
    },
    "jogador": {
        "can_view_all": False, "can_edit_all": False, "can_manage_permissions": False,
        "can_view_family_data": False, "can_edit_family_data": False, "can_manage_teams": False,
        "can_manage_championships": False, "can_manage_events": False, "can_manage_members": False,
        "can_edit_own_profile": True,
    },
    "responsavel": {
        "can_view_all": False, "can_edit_all": False, "can_manage_permissions": False,
        "can_view_family_data": True, "can_edit_family_data": True, "can_manage_teams": False,
        "can_manage_championships": False, "can_manage_events": False, "can_manage_members": False,
    }
}

# Pydantic Models
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

class FamilyMember(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    first_name: str
    surname: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    relationship: str = "pai"

class UserProfile(BaseModel):
    photo_url: Optional[str] = None
    first_name: Optional[str] = None
    surname: Optional[str] = None
    nickname: Optional[str] = None
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    fpp_license: Optional[str] = None
    family_members: List[FamilyMember] = []
    weight: Optional[float] = None
    height: Optional[float] = None
    shoe_size: Optional[str] = None
    year_joined_club: Optional[int] = None
    fpp_number: Optional[str] = None
    function: Optional[UserRole] = None
    position: Optional[PlayerPosition] = None
    jersey_number: Optional[int] = None
    training_kit_size: Optional[str] = None
    tracksuit_size: Optional[str] = None
    polo_size: Optional[str] = None
    training_sock_size: Optional[str] = None

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

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    surname: Optional[str] = None
    role: UserRole
    additional_roles: List[UserRole] = []
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    team_ids: List[str] = []
    team_roles: Dict[str, UserRole] = {}
    club_id: Optional[str] = None
    associated_accounts: List[str] = []
    parent_account_id: Optional[str] = None
    linked_player_id: Optional[str] = None
    linked_player_ids: List[str] = []
    profile: Optional[UserProfile] = None
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
    team_roles: Dict[str, UserRole] = {}
    club_id: Optional[str] = None
    associated_accounts: List[str] = []
    parent_account_id: Optional[str] = None
    linked_player_id: Optional[str] = None
    linked_player_ids: List[str] = []
    profile: Optional[UserProfile] = None
    permissions: Optional[Dict[str, bool]] = None

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
    assistant_coach_ids: List[str] = []
    delegate_ids: List[str] = []
    player_ids: List[str] = []
    club_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    venue_name: Optional[str] = None
    venue_location: Optional[str] = None
    admin_ids: List[str] = []
    primary_color: Optional[str] = "#006D5B"
    secondary_color: Optional[str] = "#FFD700"
    accent_color: Optional[str] = "#1a1a2e"
    theme_mode: Optional[str] = "light"
    timezone: Optional[str] = "Europe/Lisbon"
    sidebar_accent_color: Optional[str] = "#22d3ee"
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

# Subscription Models
class SubscriptionPlan(str, Enum):
    standard = "standard"
    premium = "premium"
    enterprise = "enterprise"

class SubscriptionStatus(str, Enum):
    active = "active"
    cancelled = "cancelled"
    expired = "expired"

class Subscription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    club_id: str
    plan_type: SubscriptionPlan = SubscriptionPlan.standard
    status: SubscriptionStatus = SubscriptionStatus.active
    start_date: str
    end_date: Optional[str] = None
    payment_method: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Event Models
class EventCreate(BaseModel):
    title: str
    event_type: EventType
    team_id: Optional[str] = None
    championship_id: Optional[str] = None
    match_id: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    description: Optional[str] = None
    is_home: Optional[bool] = None
    opponent: Optional[str] = None
    convocation_type: ConvocationType = "automatica"

class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    event_type: EventType
    team_id: Optional[str] = None
    championship_id: Optional[str] = None
    match_id: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    description: Optional[str] = None
    is_home: Optional[bool] = None
    opponent: Optional[str] = None
    convocation_type: ConvocationType = "automatica"
    has_convocation: bool = False
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Attendance Models
class AttendanceUpdate(BaseModel):
    status: AttendanceStatus
    note: Optional[str] = None

class Attendance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    player_id: str
    status: AttendanceStatus = "pendente"
    note: Optional[str] = None
    responded_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
