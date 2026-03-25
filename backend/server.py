from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import asyncio

ROOT_DIR = Path(__file__).parent
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

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

UserRole = Literal["admin", "treinador", "delegado", "jogador", "responsavel"]
EventType = Literal["jogo", "treino"]
AttendanceStatus = Literal["confirmado", "ausente", "pendente"]

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole = "jogador"
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    team_ids: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    team_ids: List[str] = []

class AuthResponse(BaseModel):
    token: str
    user: UserResponse

class TeamCreate(BaseModel):
    name: str
    category: str  # e.g., "Sub-15", "Seniores", "Feminino"
    season: str  # e.g., "2024/2025"

class Team(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    season: str
    coach_ids: List[str] = []
    delegate_ids: List[str] = []
    player_ids: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PlayerStats(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_id: str
    team_id: str
    season: str
    games_played: int = 0
    goals: int = 0
    assists: int = 0
    yellow_cards: int = 0
    red_cards: int = 0
    blue_cards: int = 0  # specific to roller hockey
    saves: int = 0  # for goalkeepers

class EventCreate(BaseModel):
    team_id: str
    event_type: EventType
    title: str
    description: Optional[str] = None
    location: str
    start_time: datetime
    end_time: Optional[datetime] = None
    opponent: Optional[str] = None  # for games

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
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

class AttendanceUpdate(BaseModel):
    status: AttendanceStatus
    reason: Optional[str] = None

class Attendance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    convocation_id: str
    event_id: str
    player_id: str
    status: AttendanceStatus = "pendente"
    reason: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageCreate(BaseModel):
    team_id: str
    content: str

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    team_id: str
    sender_id: str
    sender_name: str
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GameStatsCreate(BaseModel):
    event_id: str
    home_score: int = 0
    away_score: int = 0
    player_stats: List[dict] = []  # [{player_id, goals, assists, cards}]

class GameStats(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    home_score: int = 0
    away_score: int = 0
    player_stats: List[dict] = []
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

async def send_email_notification(to_email: str, subject: str, html_content: str):
    """MOCK: Email sending - configure Resend API key to enable"""
    logger.info(f"[MOCK EMAIL] To: {to_email}, Subject: {subject}")
    # When Resend is configured, uncomment:
    # import resend
    # resend.api_key = os.environ.get('RESEND_API_KEY')
    # params = {"from": os.environ.get('SENDER_EMAIL'), "to": [to_email], "subject": subject, "html": html_content}
    # await asyncio.to_thread(resend.Emails.send, params)
    return True

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=AuthResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já registado")
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        phone=user_data.phone
    )
    
    user_dict = user.model_dump()
    user_dict['password'] = hash_password(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    token = create_token(user.id, user.email, user.role)
    
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            phone=user.phone,
            team_ids=user.team_ids
        )
    )

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    token = create_token(user['id'], user['email'], user['role'])
    
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user['id'],
            email=user['email'],
            name=user['name'],
            role=user['role'],
            phone=user.get('phone'),
            avatar_url=user.get('avatar_url'),
            team_ids=user.get('team_ids', [])
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ==================== USER ROUTES ====================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(role: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if role:
        query["role"] = role
    users = await db.users.find(query, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

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
    
    allowed_fields = ['name', 'phone', 'avatar_url']
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if filtered_updates:
        await db.users.update_one({"id": user_id}, {"$set": filtered_updates})
    
    return {"message": "Utilizador atualizado"}

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
            "$or": [
                {"coach_ids": user_id},
                {"delegate_ids": user_id},
                {"player_ids": user_id}
            ]
        }, {"_id": 0}).to_list(100)
    
    for team in teams:
        if isinstance(team.get('created_at'), str):
            team['created_at'] = datetime.fromisoformat(team['created_at'])
    
    return teams

@api_router.get("/teams/{team_id}", response_model=Team)
async def get_team(team_id: str, current_user: dict = Depends(get_current_user)):
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Equipa não encontrada")
    if isinstance(team.get('created_at'), str):
        team['created_at'] = datetime.fromisoformat(team['created_at'])
    return Team(**team)

@api_router.post("/teams/{team_id}/members")
async def add_team_member(team_id: str, member_data: dict, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'treinador']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Equipa não encontrada")
    
    user_id = member_data.get('user_id')
    role = member_data.get('role', 'jogador')
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    
    field_map = {
        'treinador': 'coach_ids',
        'delegado': 'delegate_ids',
        'jogador': 'player_ids',
        'responsavel': 'player_ids'
    }
    
    field = field_map.get(role, 'player_ids')
    await db.teams.update_one({"id": team_id}, {"$addToSet": {field: user_id}})
    await db.users.update_one({"id": user_id}, {"$addToSet": {"team_ids": team_id}})
    
    return {"message": "Membro adicionado à equipa"}

@api_router.delete("/teams/{team_id}/members/{user_id}")
async def remove_team_member(team_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'treinador']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    await db.teams.update_one({"id": team_id}, {
        "$pull": {
            "coach_ids": user_id,
            "delegate_ids": user_id,
            "player_ids": user_id
        }
    })
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

# ==================== EVENT ROUTES ====================

@api_router.post("/events", response_model=Event)
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
    return event

@api_router.get("/events")
async def get_events(team_id: Optional[str] = None, event_type: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if team_id:
        query["team_id"] = team_id
    if event_type:
        query["event_type"] = event_type
    
    if current_user['role'] != 'admin':
        user_teams = current_user.get('team_ids', [])
        if user_teams:
            query["team_id"] = {"$in": user_teams}
    
    events = await db.events.find(query, {"_id": 0}).sort("start_time", 1).to_list(100)
    
    for event in events:
        if isinstance(event.get('start_time'), str):
            event['start_time'] = datetime.fromisoformat(event['start_time'])
        if event.get('end_time') and isinstance(event['end_time'], str):
            event['end_time'] = datetime.fromisoformat(event['end_time'])
        if isinstance(event.get('created_at'), str):
            event['created_at'] = datetime.fromisoformat(event['created_at'])
    
    return events

@api_router.get("/events/{event_id}")
async def get_event(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    
    if isinstance(event.get('start_time'), str):
        event['start_time'] = datetime.fromisoformat(event['start_time'])
    if event.get('end_time') and isinstance(event['end_time'], str):
        event['end_time'] = datetime.fromisoformat(event['end_time'])
    
    return event

@api_router.put("/events/{event_id}")
async def update_event(event_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'treinador', 'delegado']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    if 'start_time' in updates and isinstance(updates['start_time'], datetime):
        updates['start_time'] = updates['start_time'].isoformat()
    if 'end_time' in updates and isinstance(updates['end_time'], datetime):
        updates['end_time'] = updates['end_time'].isoformat()
    
    await db.events.update_one({"id": event_id}, {"$set": updates})
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

@api_router.post("/convocations", response_model=Convocation)
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
    
    # Create attendance records for each player
    for player_id in conv_data.player_ids:
        attendance = Attendance(
            convocation_id=convocation.id,
            event_id=conv_data.event_id,
            player_id=player_id
        )
        att_dict = attendance.model_dump()
        att_dict['updated_at'] = att_dict['updated_at'].isoformat()
        await db.attendance.insert_one(att_dict)
        
        # Send email notification (MOCK)
        player = await db.users.find_one({"id": player_id}, {"_id": 0})
        if player:
            await send_email_notification(
                player['email'],
                f"Convocatória: {event.get('title', 'Evento')}",
                f"<h1>Foste convocado!</h1><p>{conv_data.message or 'Por favor confirma a tua presença.'}</p>"
            )
    
    return convocation

@api_router.get("/convocations")
async def get_convocations(event_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if event_id:
        query["event_id"] = event_id
    
    convocations = await db.convocations.find(query, {"_id": 0}).to_list(100)
    
    for conv in convocations:
        if isinstance(conv.get('created_at'), str):
            conv['created_at'] = datetime.fromisoformat(conv['created_at'])
    
    return convocations

@api_router.get("/convocations/my")
async def get_my_convocations(current_user: dict = Depends(get_current_user)):
    # Get all attendance records for this player
    attendances = await db.attendance.find({"player_id": current_user['id']}, {"_id": 0}).to_list(100)
    
    result = []
    for att in attendances:
        event = await db.events.find_one({"id": att['event_id']}, {"_id": 0})
        convocation = await db.convocations.find_one({"id": att['convocation_id']}, {"_id": 0})
        
        if event and convocation:
            if isinstance(event.get('start_time'), str):
                event['start_time'] = datetime.fromisoformat(event['start_time'])
            result.append({
                "attendance": att,
                "event": event,
                "convocation": convocation
            })
    
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
        {"$set": {
            "status": update.status,
            "reason": update.reason,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Presença atualizada"}

@api_router.get("/events/{event_id}/attendance")
async def get_event_attendance(event_id: str, current_user: dict = Depends(get_current_user)):
    attendances = await db.attendance.find({"event_id": event_id}, {"_id": 0}).to_list(100)
    
    result = []
    for att in attendances:
        player = await db.users.find_one({"id": att['player_id']}, {"_id": 0, "password": 0})
        if player:
            result.append({**att, "player": player})
    
    return result

# ==================== CHAT ROUTES ====================

@api_router.post("/messages", response_model=Message)
async def send_message(msg_data: MessageCreate, current_user: dict = Depends(get_current_user)):
    message = Message(
        team_id=msg_data.team_id,
        sender_id=current_user['id'],
        sender_name=current_user['name'],
        content=msg_data.content
    )
    
    msg_dict = message.model_dump()
    msg_dict['created_at'] = msg_dict['created_at'].isoformat()
    
    await db.messages.insert_one(msg_dict)
    return message

@api_router.get("/messages/{team_id}")
async def get_messages(team_id: str, limit: int = 50, current_user: dict = Depends(get_current_user)):
    messages = await db.messages.find(
        {"team_id": team_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
    
    return list(reversed(messages))

# ==================== STATS ROUTES ====================

@api_router.post("/game-stats", response_model=GameStats)
async def create_game_stats(stats_data: GameStatsCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'treinador', 'delegado']:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    game_stats = GameStats(**stats_data.model_dump())
    stats_dict = game_stats.model_dump()
    stats_dict['created_at'] = stats_dict['created_at'].isoformat()
    
    await db.game_stats.insert_one(stats_dict)
    
    # Update player season stats
    event = await db.events.find_one({"id": stats_data.event_id}, {"_id": 0})
    if event:
        for ps in stats_data.player_stats:
            await db.player_stats.update_one(
                {"player_id": ps.get('player_id'), "team_id": event['team_id']},
                {
                    "$inc": {
                        "games_played": 1,
                        "goals": ps.get('goals', 0),
                        "assists": ps.get('assists', 0),
                        "yellow_cards": ps.get('yellow_cards', 0),
                        "red_cards": ps.get('red_cards', 0),
                        "blue_cards": ps.get('blue_cards', 0),
                        "saves": ps.get('saves', 0)
                    }
                },
                upsert=True
            )
    
    return game_stats

@api_router.get("/game-stats/{event_id}")
async def get_game_stats(event_id: str, current_user: dict = Depends(get_current_user)):
    stats = await db.game_stats.find_one({"event_id": event_id}, {"_id": 0})
    if not stats:
        raise HTTPException(status_code=404, detail="Estatísticas não encontradas")
    return stats

@api_router.get("/player-stats/{player_id}")
async def get_player_stats(player_id: str, team_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"player_id": player_id}
    if team_id:
        query["team_id"] = team_id
    
    stats = await db.player_stats.find(query, {"_id": 0}).to_list(10)
    return stats

@api_router.get("/player-stats/{player_id}/consolidated")
async def get_player_consolidated_stats(player_id: str, current_user: dict = Depends(get_current_user)):
    """Get consolidated statistics for a player across all teams"""
    
    # Get player info
    player = await db.users.find_one({"id": player_id}, {"_id": 0, "password": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Jogador não encontrado")
    
    # Get all stats for this player across all teams
    all_stats = await db.player_stats.find({"player_id": player_id}, {"_id": 0}).to_list(100)
    
    # Consolidate stats
    consolidated = {
        "games_played": 0,
        "goals": 0,
        "assists": 0,
        "yellow_cards": 0,
        "red_cards": 0,
        "blue_cards": 0,
        "saves": 0
    }
    
    teams_stats = []
    for stat in all_stats:
        # Add to consolidated totals
        consolidated["games_played"] += stat.get("games_played", 0)
        consolidated["goals"] += stat.get("goals", 0)
        consolidated["assists"] += stat.get("assists", 0)
        consolidated["yellow_cards"] += stat.get("yellow_cards", 0)
        consolidated["red_cards"] += stat.get("red_cards", 0)
        consolidated["blue_cards"] += stat.get("blue_cards", 0)
        consolidated["saves"] += stat.get("saves", 0)
        
        # Get team info for per-team breakdown
        team = await db.teams.find_one({"id": stat.get("team_id")}, {"_id": 0})
        teams_stats.append({
            **stat,
            "team": team
        })
    
    # Get all teams the player belongs to
    player_teams = []
    if player.get("team_ids"):
        for team_id in player["team_ids"]:
            team = await db.teams.find_one({"id": team_id}, {"_id": 0})
            if team:
                if isinstance(team.get('created_at'), str):
                    team['created_at'] = datetime.fromisoformat(team['created_at'])
                player_teams.append(team)
    
    return {
        "player": player,
        "consolidated": consolidated,
        "per_team_stats": teams_stats,
        "teams": player_teams,
        "teams_count": len(player_teams)
    }

@api_router.get("/teams/{team_id}/stats")
async def get_team_stats(team_id: str, current_user: dict = Depends(get_current_user)):
    stats = await db.player_stats.find({"team_id": team_id}, {"_id": 0}).to_list(100)
    
    # Enrich with player info
    result = []
    for stat in stats:
        player = await db.users.find_one({"id": stat['player_id']}, {"_id": 0, "password": 0})
        if player:
            result.append({**stat, "player": player})
    
    return result

# ==================== DASHBOARD ROUTES ====================

@api_router.get("/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    user_teams = current_user.get('team_ids', [])
    
    # Upcoming events
    now = datetime.now(timezone.utc).isoformat()
    upcoming_query = {"start_time": {"$gte": now}}
    if current_user['role'] != 'admin' and user_teams:
        upcoming_query["team_id"] = {"$in": user_teams}
    
    upcoming_events = await db.events.find(
        upcoming_query,
        {"_id": 0}
    ).sort("start_time", 1).limit(5).to_list(5)
    
    for event in upcoming_events:
        if isinstance(event.get('start_time'), str):
            event['start_time'] = datetime.fromisoformat(event['start_time'])
        team = await db.teams.find_one({"id": event['team_id']}, {"_id": 0})
        event['team'] = team
    
    # Pending convocations
    pending_attendances = await db.attendance.find({
        "player_id": current_user['id'],
        "status": "pendente"
    }, {"_id": 0}).to_list(10)
    
    pending_convocations = []
    for att in pending_attendances:
        event = await db.events.find_one({"id": att['event_id']}, {"_id": 0})
        if event:
            if isinstance(event.get('start_time'), str):
                event['start_time'] = datetime.fromisoformat(event['start_time'])
            pending_convocations.append({"attendance": att, "event": event})
    
    # Teams count
    if current_user['role'] == 'admin':
        teams_count = await db.teams.count_documents({})
    else:
        teams_count = len(user_teams)
    
    # Recent messages
    recent_messages = []
    if user_teams:
        recent_messages = await db.messages.find(
            {"team_id": {"$in": user_teams}},
            {"_id": 0}
        ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "upcoming_events": upcoming_events,
        "pending_convocations": pending_convocations,
        "teams_count": teams_count,
        "recent_messages": recent_messages
    }

# ==================== ROOT ROUTE ====================

@api_router.get("/")
async def root():
    return {"message": "Roller Hockey Hub API", "version": "1.0.0"}

# Include the router in the main app
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
