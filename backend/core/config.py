"""Application configuration."""
from pathlib import Path
from dotenv import load_dotenv
import os

ROOT_DIR = Path(__file__).parent.parent
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

load_dotenv(ROOT_DIR / '.env')

# Admin-level roles (have full permissions)
ADMIN_ROLES = ["admin", "gestor_desportivo"]


def is_admin_role(role: str) -> bool:
    """Check if a role has admin-level permissions."""
    return role in ADMIN_ROLES


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
        "can_view_all": True,
        "can_edit_all": False,
        "can_manage_permissions": False,
        "can_view_family_data": True,
        "can_edit_family_data": False,
        "can_manage_teams": False,
        "can_manage_championships": True,
        "can_manage_events": True,
        "can_manage_members": True,
    },
    "treinador_adjunto": {
        "can_view_all": True,
        "can_edit_all": False,
        "can_manage_permissions": False,
        "can_view_family_data": True,
        "can_edit_family_data": False,
        "can_manage_teams": False,
        "can_manage_championships": True,
        "can_manage_events": True,
        "can_manage_members": False,
    },
    "delegado": {
        "can_view_all": True,
        "can_edit_all": False,
        "can_manage_permissions": False,
        "can_view_family_data": True,
        "can_edit_family_data": False,
        "can_manage_teams": False,
        "can_manage_championships": False,
        "can_manage_events": False,
        "can_manage_members": False,
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
    },
    "responsavel": {
        "can_view_all": False,
        "can_edit_all": False,
        "can_manage_permissions": False,
        "can_view_family_data": True,
        "can_edit_family_data": False,
        "can_manage_teams": False,
        "can_manage_championships": False,
        "can_manage_events": False,
        "can_manage_members": False,
    },
}
