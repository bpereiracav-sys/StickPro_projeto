/**
 * Permissions Context for Role-Based Access Control (RBAC)
 *
 * Centralizes role, team and profile-based access control.
 * Uses canonical Portuguese role keys and remains compatible
 * with legacy/internal role aliases through normalizeRole().
 */

import { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { normalizeRole } from '../lib/utils';

const PermissionsContext = createContext(null);

// Canonical role constants
export const ROLES = {
  ADMIN: 'admin',
  SPORTS_MANAGER: 'gestor_desportivo',
  COACH: 'treinador',
  ASSISTANT_COACH: 'treinador_adjunto',
  DELEGATE: 'delegado',
  PLAYER: 'jogador',
  FAMILY_MEMBER: 'responsavel',
};

// Admin-level roles
export const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SPORTS_MANAGER];

// Role display names
export const ROLE_NAMES = {
  admin: 'Administrador',
  gestor_desportivo: 'Gestor Desportivo',
  treinador: 'Treinador',
  treinador_adjunto: 'Treinador Adjunto',
  delegado: 'Delegado',
  jogador: 'Jogador',
  responsavel: 'Responsável/Familiar',
};

function getDefaultPermissions() {
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

    // Role info
    role: null,
    allRoles: [],

    // Helper functions
    canAccessTeam: () => false,
    canAccessAnyTeam: () => false,
    filterAccessibleTeams: () => [],
    canAccessUser: () => false,
    canEditUser: () => false,
    canAccessEvent: () => false,
    canAccessChampionship: () => false,
    canAccessAttendance: () => false,
    getTeamFilter: () => ({}),
    hasPermission: () => false,
  };
}

export function PermissionsProvider({ children }) {
  const { user, effectiveRole, viewingAs } = useAuth();

  const permissions = useMemo(() => {
    if (!user) {
      return getDefaultPermissions();
    }

    const normalizedRole = normalizeRole(effectiveRole || user.role);
    const normalizedAdditionalRoles = (user.additional_roles || []).map(normalizeRole);

    const allRoles = [...new Set([normalizedRole, ...normalizedAdditionalRoles])];
    const teamIds = new Set(user.team_ids || []);
    const linkedPlayerId = user.linked_player_id || viewingAs?.linked_player_id || null;

    // Role checks
    const isAdmin = ADMIN_ROLES.includes(normalizedRole);
    const isCoach = allRoles.includes(ROLES.COACH);
    const isAssistantCoach = allRoles.includes(ROLES.ASSISTANT_COACH);
    const isDelegate = allRoles.includes(ROLES.DELEGATE);
    const isPlayer = normalizedRole === ROLES.PLAYER;
    const isFamilyMember = normalizedRole === ROLES.FAMILY_MEMBER;

    // Staff includes sports manager/admin from an operational perspective
    const isStaff =
      isAdmin || isCoach || isAssistantCoach || isDelegate;

    // Permission checks
    const canManageTeam = isAdmin || isCoach;
    const canManageEvents = isAdmin || isCoach || isAssistantCoach || isDelegate;
    const canManageStats = isAdmin || isCoach || isAssistantCoach;
    const canManageAttendance = isAdmin || isCoach || isAssistantCoach || isDelegate;
    const canCreateConvocations = isAdmin || isCoach || isAssistantCoach || isDelegate;
    const canManageLineups = isAdmin || isCoach || isAssistantCoach;
    const canImportData = isAdmin || isCoach;
    const canManageClub = isAdmin;

    const canAccessTeam = (teamId) => {
      if (isAdmin) return true;
      if (!teamId) return true; // club-wide access
      return teamIds.has(teamId);
    };

    const canAccessAnyTeam = (targetTeamIds) => {
      if (isAdmin) return true;
      if (!targetTeamIds || targetTeamIds.length === 0) return true;
      return targetTeamIds.some((tid) => teamIds.has(tid));
    };

    const filterAccessibleTeams = (targetTeamIds) => {
      if (isAdmin) return targetTeamIds || [];
      return (targetTeamIds || []).filter((tid) => teamIds.has(tid));
    };

    const canAccessUser = (targetUser) => {
      if (isAdmin) return true;
      if (!targetUser) return false;

      // own profile
      if (targetUser.id === user.id) return true;

      // family member -> linked player only
      if (isFamilyMember && linkedPlayerId && targetUser.id === linkedPlayerId) {
        return true;
      }

      const targetTeams = new Set(targetUser.team_ids || []);

      // staff can access users in their teams
      if (isCoach || isAssistantCoach || isDelegate) {
        for (const tid of teamIds) {
          if (targetTeams.has(tid)) return true;
        }
      }

      // player can see own team context only
      if (isPlayer) {
        for (const tid of teamIds) {
          if (targetTeams.has(tid)) return true;
        }
      }

      return false;
    };

    const canEditUser = (targetUser) => {
      if (isAdmin) return true;
      if (!targetUser) return false;

      // own profile
      if (targetUser.id === user.id) return true;

      // coaches can edit users in their teams
      if (isCoach) {
        const targetTeams = new Set(targetUser.team_ids || []);
        for (const tid of teamIds) {
          if (targetTeams.has(tid)) return true;
        }
      }

      return false;
    };

    const canAccessEvent = (event) => {
      if (isAdmin) return true;
      if (!event) return false;

      const eventTeamId = event.team_id;
      if (!eventTeamId) return true; // club-wide event

      return teamIds.has(eventTeamId);
    };

    const canAccessChampionship = (championship) => {
      if (isAdmin) return true;
      if (!championship) return false;

      if (!championship.team_id) return true;
      return teamIds.has(championship.team_id);
    };

    const canAccessAttendance = (attendance) => {
      if (isAdmin) return true;
      if (!attendance) return false;

      if ((isCoach || isAssistantCoach || isDelegate) && attendance.event?.team_id) {
        return teamIds.has(attendance.event.team_id);
      }

      if (isPlayer && attendance.player_id === user.id) {
        return true;
      }

      if (isFamilyMember && linkedPlayerId && attendance.player_id === linkedPlayerId) {
        return true;
      }

      return false;
    };

    const getTeamFilter = () => {
      if (isAdmin) return {};
      if (teamIds.size > 0) {
        return { team_id: [...teamIds] };
      }
      return { team_id: null };
    };

    const hasPermission = (permission) => {
      if (isAdmin) return true;

      const permissionMap = {
        view_all_teams: isAdmin,
        manage_all_teams: isAdmin,

        view_team_members: isCoach || isAssistantCoach || isDelegate || isPlayer,
        manage_team_members: canManageTeam,

        view_team_events: true,
        manage_team_events: canManageEvents,

        view_team_stats: true,
        manage_team_stats: canManageStats,

        view_team_attendance: isCoach || isAssistantCoach || isDelegate || isPlayer || isFamilyMember,
        manage_team_attendance: canManageAttendance,

        create_convocations: canCreateConvocations,
        manage_lineups: canManageLineups,
        import_data: canImportData,
        export_data: isCoach || isAssistantCoach || isDelegate,

        view_club_settings: isAdmin,
        manage_club_settings: canManageClub,
      };

      return permissionMap[permission] || false;
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

      // Role info
      role: normalizedRole,
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

      // Helpers
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

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}

export function withPermission(Component, options = {}) {
  return function ProtectedComponent(props) {
    const permissions = usePermissions();
    const { requiredRole, requiredPermission, fallback = null } = options;

    const normalizedRequiredRole = requiredRole ? normalizeRole(requiredRole) : null;

    if (normalizedRequiredRole && !permissions.allRoles.includes(normalizedRequiredRole)) {
      return fallback;
    }

    if (requiredPermission && !permissions.hasPermission(requiredPermission)) {
      return fallback;
    }

    return <Component {...props} />;
  };
}

export default PermissionsContext;
