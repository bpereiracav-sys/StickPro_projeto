"""
Role-Based Access Control (RBAC) System for StickPro

User Roles:
- admin: Full access to all data and teams
- gestor_desportivo (sports_manager): Full access to all data and teams (same as admin)
- treinador (coach): Access to assigned teams
- treinador_adjunto (assistant_coach): Access to assigned teams  
- delegado (delegate): Access to assigned teams
- jogador (player): Access to own data and team context
- responsavel (family_member): Access to linked player data only

Team Association Rules:
- Users can be associated with one or more teams via team_ids
- Admin/Sports Manager can access all teams
- Staff (coach, assistant, delegate) access only assigned teams
- Players access their own team(s)
- Family members access linked player's data
"""

from typing import List, Optional, Set
from enum import Enum
from functools import wraps
from fastapi import HTTPException


class Role(str, Enum):
    ADMIN = "admin"
    SPORTS_MANAGER = "gestor_desportivo"
    COACH = "treinador"
    ASSISTANT_COACH = "treinador_adjunto"
    DELEGATE = "delegado"
    PLAYER = "jogador"
    FAMILY_MEMBER = "responsavel"


# Admin-level roles that have full permissions
ADMIN_LEVEL_ROLES = {Role.ADMIN, Role.SPORTS_MANAGER}


# Role hierarchy - higher roles inherit lower role permissions
ROLE_HIERARCHY = {
    Role.ADMIN: 100,
    Role.SPORTS_MANAGER: 100,  # Same level as admin
    Role.COACH: 80,
    Role.ASSISTANT_COACH: 70,
    Role.DELEGATE: 60,
    Role.PLAYER: 40,
    Role.FAMILY_MEMBER: 20,
}

# Permissions by role
ROLE_PERMISSIONS = {
    Role.ADMIN: {
        "view_all_teams": True,
        "manage_all_teams": True,
        "view_all_users": True,
        "manage_all_users": True,
        "view_all_events": True,
        "manage_all_events": True,
        "view_all_stats": True,
        "manage_all_stats": True,
        "view_all_attendance": True,
        "manage_all_attendance": True,
        "view_club_settings": True,
        "manage_club_settings": True,
        "import_data": True,
        "export_data": True,
    },
    Role.SPORTS_MANAGER: {
        "view_all_teams": True,
        "manage_all_teams": True,
        "view_all_users": True,
        "manage_all_users": True,
        "view_all_events": True,
        "manage_all_events": True,
        "view_all_stats": True,
        "manage_all_stats": True,
        "view_all_attendance": True,
        "manage_all_attendance": True,
        "view_club_settings": True,
        "manage_club_settings": True,
        "import_data": True,
        "export_data": True,
    },
    Role.COACH: {
        "view_team_members": True,
        "manage_team_members": True,
        "view_team_events": True,
        "manage_team_events": True,
        "view_team_stats": True,
        "manage_team_stats": True,
        "view_team_attendance": True,
        "manage_team_attendance": True,
        "create_convocations": True,
        "manage_lineups": True,
        "import_data": True,
        "export_data": True,
    },
    Role.ASSISTANT_COACH: {
        "view_team_members": True,
        "manage_team_members": False,
        "view_team_events": True,
        "manage_team_events": True,
        "view_team_stats": True,
        "manage_team_stats": True,
        "view_team_attendance": True,
        "manage_team_attendance": True,
        "create_convocations": True,
        "manage_lineups": True,
        "import_data": False,
        "export_data": True,
    },
    Role.DELEGATE: {
        "view_team_members": True,
        "manage_team_members": False,
        "view_team_events": True,
        "manage_team_events": True,
        "view_team_stats": True,
        "manage_team_stats": False,
        "view_team_attendance": True,
        "manage_team_attendance": True,
        "create_convocations": True,
        "manage_lineups": False,
        "import_data": False,
        "export_data": True,
    },
    Role.PLAYER: {
        "view_own_profile": True,
        "edit_own_profile": True,
        "view_team_events": True,
        "view_team_stats": True,
        "view_own_stats": True,
        "respond_convocation": True,
        "view_team_members": True,
    },
    Role.FAMILY_MEMBER: {
        "view_linked_player_profile": True,
        "view_linked_player_events": True,
        "view_linked_player_stats": True,
        "respond_convocation_for_player": True,
    },
}


class PermissionChecker:
    """
    Reusable permission checker for RBAC operations.
    Use this class to check if a user has access to specific resources.
    """
    
    def __init__(self, user: dict, db=None):
        """
        Initialize permission checker with user data.
        
        Args:
            user: Current user dict with id, role, team_ids, club_id, linked_player_id
            db: Optional database reference for async lookups
        """
        self.user = user
        self.db = db
        self.user_id = user.get('id')
        self.role = Role(user.get('role', 'jogador'))
        self.team_ids: Set[str] = set(user.get('team_ids', []))
        self.club_id = user.get('club_id')
        self.linked_player_id = user.get('linked_player_id')  # For family members
        self.additional_roles = [Role(r) for r in user.get('additional_roles', [])]
    
    @property
    def is_admin(self) -> bool:
        """Check if user has admin-level permissions (admin or sports manager)."""
        return self.role in ADMIN_LEVEL_ROLES
    
    @property
    def is_sports_manager(self) -> bool:
        """Check if user is sports manager."""
        return self.role == Role.SPORTS_MANAGER
    
    @property
    def is_coach(self) -> bool:
        """Check if user is coach or has coach role."""
        return self.role == Role.COACH or Role.COACH in self.additional_roles
    
    @property
    def is_assistant_coach(self) -> bool:
        """Check if user is assistant coach."""
        return self.role == Role.ASSISTANT_COACH or Role.ASSISTANT_COACH in self.additional_roles
    
    @property
    def is_delegate(self) -> bool:
        """Check if user is delegate."""
        return self.role == Role.DELEGATE or Role.DELEGATE in self.additional_roles
    
    @property
    def is_player(self) -> bool:
        """Check if user is player."""
        return self.role == Role.PLAYER
    
    @property
    def is_family_member(self) -> bool:
        """Check if user is family member."""
        return self.role == Role.FAMILY_MEMBER
    
    @property
    def is_staff(self) -> bool:
        """Check if user is any staff role (coach, assistant, delegate)."""
        return self.is_coach or self.is_assistant_coach or self.is_delegate
    
    @property
    def can_manage_team(self) -> bool:
        """Check if user can manage team (create/edit/delete team data)."""
        return self.is_admin or self.is_coach
    
    @property
    def can_manage_events(self) -> bool:
        """Check if user can manage events (create/edit/delete)."""
        return self.is_admin or self.is_coach or self.is_assistant_coach or self.is_delegate
    
    @property
    def can_manage_stats(self) -> bool:
        """Check if user can manage statistics."""
        return self.is_admin or self.is_coach or self.is_assistant_coach
    
    @property
    def can_manage_attendance(self) -> bool:
        """Check if user can manage attendance."""
        return self.is_admin or self.is_staff
    
    @property
    def can_create_convocations(self) -> bool:
        """Check if user can create convocations."""
        return self.is_admin or self.is_staff
    
    @property
    def can_manage_lineups(self) -> bool:
        """Check if user can manage match lineups."""
        return self.is_admin or self.is_coach or self.is_assistant_coach
    
    @property
    def can_import_data(self) -> bool:
        """Check if user can import data (Excel, APL, etc)."""
        return self.is_admin or self.is_coach
    
    @property
    def can_manage_club(self) -> bool:
        """Check if user can manage club settings."""
        return self.is_admin
    
    def has_permission(self, permission: str) -> bool:
        """
        Check if user has a specific permission.
        
        Args:
            permission: Permission key from ROLE_PERMISSIONS
        
        Returns:
            True if user has the permission
        """
        if self.is_admin:
            return True
        
        role_perms = ROLE_PERMISSIONS.get(self.role, {})
        if role_perms.get(permission):
            return True
        
        # Check additional roles
        for add_role in self.additional_roles:
            add_perms = ROLE_PERMISSIONS.get(add_role, {})
            if add_perms.get(permission):
                return True
        
        return False
    
    def can_access_team(self, team_id: str) -> bool:
        """
        Check if user can access a specific team.
        
        Args:
            team_id: ID of the team to check
        
        Returns:
            True if user can access the team
        """
        # Admin can access all teams
        if self.is_admin:
            return True
        
        # Staff and players can access their assigned teams
        if team_id in self.team_ids:
            return True
        
        # Family members can access their linked players' teams
        # Note: This requires async lookup, so for now we check against team_ids
        # The linked player's teams should be included in team_ids during user fetch
        if self.is_family_member:
            return team_id in self.team_ids
        
        return False
    
    def can_access_teams(self, team_ids: List[str]) -> bool:
        """
        Check if user can access any of the specified teams.
        
        Args:
            team_ids: List of team IDs to check
        
        Returns:
            True if user can access at least one team
        """
        if self.is_admin:
            return True
        
        return bool(self.team_ids.intersection(set(team_ids)))
    
    def filter_teams(self, team_ids: List[str]) -> List[str]:
        """
        Filter team IDs to only those the user can access.
        
        Args:
            team_ids: List of team IDs to filter
        
        Returns:
            Filtered list of accessible team IDs
        """
        if self.is_admin:
            return team_ids
        
        return [tid for tid in team_ids if tid in self.team_ids]
    
    def can_access_user(self, target_user: dict) -> bool:
        """
        Check if current user can access another user's data.
        
        Args:
            target_user: The user whose data is being accessed
        
        Returns:
            True if current user can access target user's data
        """
        # Admin can access all users
        if self.is_admin:
            return True
        
        target_id = target_user.get('id')
        
        # Users can always access their own data
        if target_id == self.user_id:
            return True
        
        # Family members can access their linked player
        if self.is_family_member and self.linked_player_id:
            if target_id == self.linked_player_id:
                return True
        
        # Staff can access users in their teams
        if self.is_staff:
            target_team_ids = set(target_user.get('team_ids', []))
            return bool(self.team_ids.intersection(target_team_ids))
        
        # Players can see other players in their team (limited data)
        if self.is_player:
            target_team_ids = set(target_user.get('team_ids', []))
            return bool(self.team_ids.intersection(target_team_ids))
        
        return False
    
    def can_edit_user(self, target_user: dict) -> bool:
        """
        Check if current user can edit another user's data.
        
        Args:
            target_user: The user whose data is being edited
        
        Returns:
            True if current user can edit target user's data
        """
        # Admin can edit all users
        if self.is_admin:
            return True
        
        target_id = target_user.get('id')
        
        # Users can edit their own profile
        if target_id == self.user_id:
            return True
        
        # Coaches can edit users in their teams
        if self.is_coach:
            target_team_ids = set(target_user.get('team_ids', []))
            return bool(self.team_ids.intersection(target_team_ids))
        
        return False
    
    def can_access_event(self, event: dict) -> bool:
        """
        Check if user can access an event.
        
        Args:
            event: Event dict with team_id
        
        Returns:
            True if user can access the event
        """
        if self.is_admin:
            return True
        
        event_team_id = event.get('team_id')
        if not event_team_id:
            return True  # Club-wide events are accessible
        
        # Staff and players access their team events
        if event_team_id in self.team_ids:
            return True
        
        # Family members access events their linked player is invited to
        if self.is_family_member and self.linked_player_id:
            # Would need to check if linked player is in the event's team
            # For now, check if event team matches linked player's teams
            # This would require async lookup - return True for now if team matches
            return event_team_id in self.team_ids
        
        return False
    
    def can_access_championship(self, championship: dict) -> bool:
        """
        Check if user can access a championship.
        
        Args:
            championship: Championship dict with team_id
        
        Returns:
            True if user can access the championship
        """
        if self.is_admin:
            return True
        
        champ_team_id = championship.get('team_id')
        return champ_team_id in self.team_ids
    
    def can_access_attendance(self, attendance: dict) -> bool:
        """
        Check if user can access attendance record.
        
        Args:
            attendance: Attendance dict with player_id and event
        
        Returns:
            True if user can access the attendance
        """
        if self.is_admin:
            return True
        
        # Staff can access all attendance for their teams
        if self.is_staff:
            event_team_id = attendance.get('event', {}).get('team_id')
            if event_team_id and event_team_id in self.team_ids:
                return True
        
        # Players can view their own attendance
        if self.is_player:
            if attendance.get('player_id') == self.user_id:
                return True
        
        # Family members can view linked player's attendance
        if self.is_family_member and self.linked_player_id:
            if attendance.get('player_id') == self.linked_player_id:
                return True
        
        return False
    
    def get_team_filter(self) -> dict:
        """
        Get MongoDB filter for team-based queries.
        
        Returns:
            MongoDB filter dict to use in queries
        """
        if self.is_admin:
            return {}  # No filter for admin
        
        if self.team_ids:
            return {"team_id": {"$in": list(self.team_ids)}}
        
        return {"team_id": None}  # No access if no teams
    
    def get_user_filter(self) -> dict:
        """
        Get MongoDB filter for user-based queries.
        
        Returns:
            MongoDB filter dict to use in queries
        """
        if self.is_admin:
            return {}  # No filter for admin
        
        if self.is_family_member and self.linked_player_id:
            return {"id": self.linked_player_id}
        
        if self.team_ids:
            return {"team_ids": {"$in": list(self.team_ids)}}
        
        return {"id": self.user_id}  # Only own data
    
    def raise_if_no_permission(self, permission: str, message: str = None):
        """
        Raise HTTPException if user doesn't have permission.
        
        Args:
            permission: Permission to check
            message: Optional custom error message
        """
        if not self.has_permission(permission):
            raise HTTPException(
                status_code=403,
                detail=message or f"Sem permissão: {permission}"
            )
    
    def raise_if_no_team_access(self, team_id: str, message: str = None):
        """
        Raise HTTPException if user can't access team.
        
        Args:
            team_id: Team ID to check
            message: Optional custom error message
        """
        if not self.can_access_team(team_id):
            raise HTTPException(
                status_code=403,
                detail=message or "Sem acesso a esta equipa"
            )


def get_permission_checker(current_user: dict, db=None) -> PermissionChecker:
    """
    Factory function to create a PermissionChecker instance.
    
    Args:
        current_user: Current user from get_current_user dependency
        db: Optional database reference
    
    Returns:
        PermissionChecker instance
    """
    return PermissionChecker(current_user, db)


# Decorator for route-level permission checks
def require_permission(permission: str):
    """
    Decorator to require a specific permission for a route.
    
    Usage:
        @require_permission("manage_team_events")
        async def create_event(...):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get current_user from kwargs
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(status_code=401, detail="Não autenticado")
            
            checker = PermissionChecker(current_user)
            checker.raise_if_no_permission(permission)
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_role(*roles: Role):
    """
    Decorator to require specific roles for a route.
    
    Usage:
        @require_role(Role.ADMIN, Role.COACH)
        async def manage_team(...):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(status_code=401, detail="Não autenticado")
            
            user_role = Role(current_user.get('role', 'jogador'))
            additional = [Role(r) for r in current_user.get('additional_roles', [])]
            all_roles = [user_role] + additional
            
            if not any(r in roles for r in all_roles):
                raise HTTPException(
                    status_code=403,
                    detail="Função não autorizada para esta operação"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_team_access(team_id_param: str = 'team_id'):
    """
    Decorator to require team access for a route.
    
    Usage:
        @require_team_access('team_id')
        async def get_team_data(team_id: str, ...):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            team_id = kwargs.get(team_id_param)
            
            if not current_user:
                raise HTTPException(status_code=401, detail="Não autenticado")
            
            if not team_id:
                return await func(*args, **kwargs)
            
            checker = PermissionChecker(current_user)
            checker.raise_if_no_team_access(team_id)
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator
