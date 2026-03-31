"""Type definitions for Stick Pro."""
from typing import Literal

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
    """Check if a role has admin-level permissions."""
    return role in ADMIN_ROLES
