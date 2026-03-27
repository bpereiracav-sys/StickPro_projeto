/**
 * Permissions Context for Role-Based Access Control (RBAC)
 * 
 * This context provides permission checking utilities throughout the app.
 * It integrates with AuthContext to provide role and team-based access control.
 * 
 * User Roles:
 * - admin: Full access to all data and teams
 * - treinador (coach): Access to assigned teams
 * - treinador_adjunto (assistant_coach): Access to assigned teams
 * - delegado (delegate): Access to assigned teams
 * - jogador (player): Access to own data and team context
 * - responsavel (family_member): Access to linked player data only
 */

import { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';

const PermissionsContext = createContext(null);

// Role constants
export const ROLES = {
  ADMIN: 'admin',
  COACH: 'treinador',
  ASSISTANT_COACH: 'treinador_adjunto',
  DELEGATE: 'delegado',
  PLAYER: 'jogador',
  FAMILY_MEMBER: 'responsavel',
};

// Role display names
export const ROLE_NAMES = {
  admin: 'Administrador',
  treinador: 'Treinador',
  treinador_adjunto: 'Treinador Adjunto',
  delegado: 'Delegado',
  jogador: 'Jogador',
  responsavel: 'Responsável/Familiar',
};

export function PermissionsProvider({ children }) {
  const { user, effectiveRole, viewingAs } = useAuth();

  const permissions = useMemo(() => {
    if (!user) {
      return {
        // Role checks
        isAdmin: false,
        isCoach: false,
        isAssistantCoach: false,
        isDelegate: false,
        isPlayer: false,
        isFamilyMember: false,
        isStaff: false,
        
        // Permission checks
        canManageTeam: false,
        canManageEvents: false,
        canManageStats: false,
        canManageAttendance: false,
        canCreateConvocations: false,
        canManageLineups: false,
        canImportData: false,
        canManageClub: false,
        
        // Team access
        teamIds: [],
        linkedPlayerId: null,
        
        // Helper functions
        canAccessTeam: () => false,
        canAccessUser: () => false,
        canEditUser: () => false,
        getTeamFilter: () => ({}),
      };
    }

    const role = effectiveRole || user.role;
    const additionalRoles = user.additional_roles || [];
    const allRoles = [role, ...additionalRoles];
    const teamIds = new Set(user.team_ids || []);
    const linkedPlayerId = user.linked_player_id || viewingAs?.linked_player_id;

    // Role checks
    const isAdmin = role === ROLES.ADMIN;
    const isCoach = allRoles.includes(ROLES.COACH);
    const isAssistantCoach = allRoles.includes(ROLES.ASSISTANT_COACH);
    const isDelegate = allRoles.includes(ROLES.DELEGATE);
    const isPlayer = role === ROLES.PLAYER;
    const isFamilyMember = role === ROLES.FAMILY_MEMBER;
    const isStaff = isCoach || isAssistantCoach || isDelegate;

    // Permission checks
    const canManageTeam = isAdmin || isCoach;
    const canManageEvents = isAdmin || isCoach || isAssistantCoach || isDelegate;
    const canManageStats = isAdmin || isCoach || isAssistantCoach;
    const canManageAttendance = isAdmin || isStaff;
    const canCreateConvocations = isAdmin || isStaff;
    const canManageLineups = isAdmin || isCoach || isAssistantCoach;
    const canImportData = isAdmin || isCoach;
    const canManageClub = isAdmin;

    /**
     * Check if user can access a specific team
     * @param {string} teamId - Team ID to check
     * @returns {boolean}
     */
    const canAccessTeam = (teamId) => {
      if (isAdmin) return true;
      if (!teamId) return true; // Club-wide access
      return teamIds.has(teamId);
    };

    /**
     * Check if user can access multiple teams (any of them)
     * @param {string[]} targetTeamIds - Team IDs to check
     * @returns {boolean}
     */
    const canAccessAnyTeam = (targetTeamIds) => {
      if (isAdmin) return true;
      if (!targetTeamIds || targetTeamIds.length === 0) return true;
      return targetTeamIds.some(tid => teamIds.has(tid));
    };

    /**
     * Filter team IDs to only those the user can access
     * @param {string[]} targetTeamIds - Team IDs to filter
     * @returns {string[]}
     */
    const filterAccessibleTeams = (targetTeamIds) => {
      if (isAdmin) return targetTeamIds;
      return (targetTeamIds || []).filter(tid => teamIds.has(tid));
    };

    /**
     * Check if user can access another user's data
     * @param {object} targetUser - User object to check access for
     * @returns {boolean}
     */
    const canAccessUser = (targetUser) => {
      if (isAdmin) return true;
      if (!targetUser) return false;
      
      // Can always access own data
      if (targetUser.id === user.id) return true;
      
      // Family members can access linked player
      if (isFamilyMember && linkedPlayerId && targetUser.id === linkedPlayerId) {
        return true;
      }
      
      // Staff can access users in their teams
      if (isStaff) {
        const targetTeams = new Set(targetUser.team_ids || []);
        for (const tid of teamIds) {
          if (targetTeams.has(tid)) return true;
        }
      }
      
      // Players can see other players in their team (limited)
      if (isPlayer) {
        const targetTeams = new Set(targetUser.team_ids || []);
        for (const tid of teamIds) {
          if (targetTeams.has(tid)) return true;
        }
      }
      
      return false;
    };

    /**
     * Check if user can edit another user's data
     * @param {object} targetUser - User object to check edit permission for
     * @returns {boolean}
     */
    const canEditUser = (targetUser) => {
      if (isAdmin) return true;
      if (!targetUser) return false;
      
      // Can edit own profile
      if (targetUser.id === user.id) return true;
      
      // Coaches can edit users in their teams
      if (isCoach) {
        const targetTeams = new Set(targetUser.team_ids || []);
        for (const tid of teamIds) {
          if (targetTeams.has(tid)) return true;
        }
      }
      
      return false;
    };

    /**
     * Check if user can access an event
     * @param {object} event - Event object with team_id
     * @returns {boolean}
     */
    const canAccessEvent = (event) => {
      if (isAdmin) return true;
      if (!event) return false;
      
      const eventTeamId = event.team_id;
      if (!eventTeamId) return true; // Club-wide event
      
      return teamIds.has(eventTeamId);
    };

    /**
     * Check if user can access a championship
     * @param {object} championship - Championship object with team_id
     * @returns {boolean}
     */
    const canAccessChampionship = (championship) => {
      if (isAdmin) return true;
      if (!championship) return false;
      
      return teamIds.has(championship.team_id);
    };

    /**
     * Check if user can access attendance record
     * @param {object} attendance - Attendance record
     * @returns {boolean}
     */
    const canAccessAttendance = (attendance) => {
      if (isAdmin) return true;
      if (!attendance) return false;
      
      // Staff can access all attendance for their teams
      if (isStaff && attendance.event?.team_id) {
        return teamIds.has(attendance.event.team_id);
      }
      
      // Players can view their own attendance
      if (isPlayer && attendance.player_id === user.id) {
        return true;
      }
      
      // Family members can view linked player's attendance
      if (isFamilyMember && linkedPlayerId && attendance.player_id === linkedPlayerId) {
        return true;
      }
      
      return false;
    };

    /**
     * Get query params for team filtering
     * @returns {object}
     */
    const getTeamFilter = () => {
      if (isAdmin) return {};
      if (teamIds.size > 0) {
        return { team_id: [...teamIds] };
      }
      return { team_id: null }; // No access
    };

    /**
     * Check specific permission by name
     * @param {string} permission - Permission name
     * @returns {boolean}
     */
    const hasPermission = (permission) => {
      if (isAdmin) return true;
      
      const permMap = {
        'view_all_teams': isAdmin,
        'manage_all_teams': isAdmin,
        'view_team_members': isStaff || isPlayer,
        'manage_team_members': canManageTeam,
        'view_team_events': true, // All authenticated users
        'manage_team_events': canManageEvents,
        'view_team_stats': true,
        'manage_team_stats': canManageStats,
        'view_team_attendance': isStaff || isPlayer,
        'manage_team_attendance': canManageAttendance,
        'create_convocations': canCreateConvocations,
        'manage_lineups': canManageLineups,
        'import_data': canImportData,
        'export_data': isStaff,
        'view_club_settings': isAdmin,
        'manage_club_settings': canManageClub,
      };
      
      return permMap[permission] || false;
    };

    return {
      // Role checks
      isAdmin,
      isCoach,
      isAssistantCoach,
      isDelegate,
      isPlayer,
      isFamilyMember,
      isStaff,
      role,
      allRoles,
      
      // Permission checks
      canManageTeam,
      canManageEvents,
      canManageStats,
      canManageAttendance,
      canCreateConvocations,
      canManageLineups,
      canImportData,
      canManageClub,
      
      // Team access
      teamIds: [...teamIds],
      linkedPlayerId,
      
      // Helper functions
      canAccessTeam,
      canAccessAnyTeam,
      filterAccessibleTeams,
      canAccessUser,
      canEditUser,
      canAccessEvent,
      canAccessChampionship,
      canAccessAttendance,
      getTeamFilter,
      hasPermission,
    };
  }, [user, effectiveRole, viewingAs]);

  return (
    <PermissionsContext.Provider value={permissions}>
      {children}
    </PermissionsContext.Provider>
  );
}

/**
 * Hook to access permissions
 * @returns {object} Permissions object with all checks and helpers
 */
export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}

/**
 * Higher-order component to protect routes based on permissions
 * @param {React.Component} Component - Component to protect
 * @param {object} options - Permission options
 * @returns {React.Component}
 */
export function withPermission(Component, options = {}) {
  return function ProtectedComponent(props) {
    const permissions = usePermissions();
    const { requiredRole, requiredPermission, fallback = null } = options;

    if (requiredRole && !permissions.allRoles.includes(requiredRole)) {
      return fallback;
    }

    if (requiredPermission && !permissions.hasPermission(requiredPermission)) {
      return fallback;
    }

    return <Component {...props} />;
  };
}

export default PermissionsContext;
