/**
 * Permissions Context for Role-Based Access Control (RBAC)
 *
 * RC1.1 — Arquitetura MultiPerfil
 *
 * Princípio obrigatório:
 *
 * Conta autenticada
 *      ↓
 * activeProfile
 *      ↓
 * perfil efetivo
 *      ↓
 * permissões
 *
 * As permissões nunca podem ser calculadas pela soma dos papéis da conta.
 * Apenas o perfil atualmente selecionado determina as permissões operacionais.
 */

import {
  createContext,
  useContext,
  useMemo,
} from 'react';

import { useAuth } from './AuthContext';
import { normalizeRole } from '../lib/utils';

const PermissionsContext = createContext(null);

/**
 * Papéis canónicos da aplicação.
 *
 * Não existe um papel funcional Pai/Mãe.
 * O acesso familiar é feito através de perfis associados de atletas.
 */
export const ROLES = {
  ADMIN: 'admin',
  SPORTS_MANAGER: 'gestor_desportivo',
  TECHNICAL_DIRECTOR: 'diretor_tecnico',
  COACH: 'treinador',
  ASSISTANT_COACH: 'treinador_adjunto',
  DELEGATE: 'delegado',
  PLAYER: 'jogador',

  /**
   * Mantido apenas para compatibilidade temporária com dados antigos.
   * Não deve ser utilizado para criar novos perfis ou novas permissões.
   */
  LEGACY_FAMILY_MEMBER: 'responsavel',
};

export const ROLE_NAMES = {
  admin: 'Administrador',
  gestor_desportivo: 'Gestor Desportivo',
  diretor_tecnico: 'Diretor Técnico',
  treinador: 'Treinador',
  treinador_adjunto: 'Treinador Adjunto',
  delegado: 'Delegado',
  jogador: 'Atleta',
  responsavel: 'Responsável — perfil antigo',
};

/**
 * Papéis com acesso administrativo global.
 *
 * O Diretor Técnico possui acesso desportivo global, mas não deve receber
 * automaticamente permissões administrativas sobre clube, pagamentos,
 * subscrição ou configurações institucionais.
 */
export const ADMIN_ROLES = [
  ROLES.ADMIN,
  ROLES.SPORTS_MANAGER,
];

export const TECHNICAL_STAFF_ROLES = [
  ROLES.TECHNICAL_DIRECTOR,
  ROLES.COACH,
  ROLES.ASSISTANT_COACH,
  ROLES.DELEGATE,
];

function normalizeId(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function normalizeIds(values = []) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [
    ...new Set(
      values
        .map(normalizeId)
        .filter(Boolean)
    ),
  ];
}

function getProfileTeamIds({
  activeProfile,
  viewingAs,
  user,
  isViewingAsAssociated,
}) {
  /**
   * Num perfil associado, nunca utilizar primeiro os team_ids da conta.
   * Isso poderia transmitir ao atleta as equipas do treinador ou administrador.
   */
  if (isViewingAsAssociated) {
    return normalizeIds(
      viewingAs?.team_ids ||
        activeProfile?.team_ids ||
        viewingAs?.teams?.map((team) => team?.id) ||
        activeProfile?.teams?.map((team) => team?.id) ||
        []
    );
  }

  /**
   * Num perfil próprio, preferimos os dados específicos do perfil ativo.
   * user.team_ids funciona apenas como fallback para compatibilidade.
   */
  return normalizeIds(
    activeProfile?.team_ids ||
      activeProfile?.teams?.map((team) => team?.id) ||
      user?.team_ids ||
      []
  );
}

function getEffectivePlayerId({
  activeProfile,
  viewingAs,
  user,
  role,
  isViewingAsAssociated,
}) {
  if (isViewingAsAssociated) {
    return normalizeId(
      viewingAs?.player_id ||
        viewingAs?.linked_player_id ||
        viewingAs?.user_id ||
        viewingAs?.id ||
        activeProfile?.player_id ||
        activeProfile?.linked_player_id ||
        activeProfile?.user_id ||
        activeProfile?.id
    );
  }

  if (role === ROLES.PLAYER) {
    return normalizeId(
      activeProfile?.player_id ||
        activeProfile?.linked_player_id ||
        activeProfile?.user_id ||
        activeProfile?.id ||
        user?.linked_player_id ||
        user?.id
    );
  }

  return null;
}

function getDefaultPermissions() {
  return {
    // Contexto do perfil
    role: null,
    activeProfileType: null,
    effectiveUserId: null,
    effectivePlayerId: null,
    isViewingAsAssociated: false,

    // Role checks
    isAdmin: false,
    isSportsManager: false,
    isTechnicalDirector: false,
    isCoach: false,
    isAssistantCoach: false,
    isDelegate: false,
    isPlayer: false,
    isLegacyFamilyMember: false,
    isStaff: false,
    isTechnicalStaff: false,

    // Permissões gerais
    canViewClubWideSportingData: false,
    canManageTeam: false,
    canManageEvents: false,
    canManageStats: false,
    canManageAttendance: false,
    canCreateConvocations: false,
    canManageLineups: false,
    canImportData: false,
    canExportData: false,
    canManageClub: false,
    canManagePayments: false,
    canManageSubscription: false,
    canManageUsers: false,
    canCreateEvaluations: false,
    canViewTeamEvaluations: false,

    // Team access
    teamIds: [],
    linkedPlayerId: null,

    // Compatibilidade
    allRoles: [],

    // Helpers
    canAccessTeam: () => false,
    canAccessAnyTeam: () => false,
    filterAccessibleTeams: () => [],
    canAccessUser: () => false,
    canEditUser: () => false,
    canAccessEvent: () => false,
    canAccessChampionship: () => false,
    canAccessAttendance: () => false,
    canAccessPlayer: () => false,
    canAccessEvaluation: () => false,
    getTeamFilter: () => ({ team_id: null }),
    hasRole: () => false,
    hasPermission: () => false,
  };
}

export function PermissionsProvider({ children }) {
  const {
    user,
    activeProfile,
    viewingAs,
    effectiveRole,
    effectiveUserId,
    isViewingAsAssociated,
  } = useAuth();

  const permissions = useMemo(() => {
    if (!user) {
      return getDefaultPermissions();
    }

    /**
     * Apenas o papel efetivo pode conceder permissões.
     *
     * Não juntamos additional_roles porque esses papéis representam outros
     * perfis disponíveis, e não permissões simultaneamente ativas.
     */
    const normalizedRole = normalizeRole(
      effectiveRole ||
        viewingAs?.role ||
        activeProfile?.role ||
        user?.role
    );

    const activeProfileType =
      activeProfile?.type || 'self';

    const resolvedEffectiveUserId = normalizeId(
      effectiveUserId ||
        viewingAs?.user_id ||
        viewingAs?.id ||
        activeProfile?.user_id ||
        activeProfile?.id ||
        user?.id
    );

    const resolvedTeamIds = getProfileTeamIds({
      activeProfile,
      viewingAs,
      user,
      isViewingAsAssociated,
    });

    const teamIds = new Set(resolvedTeamIds);

    const effectivePlayerId = getEffectivePlayerId({
      activeProfile,
      viewingAs,
      user,
      role: normalizedRole,
      isViewingAsAssociated,
    });

    /*
     * Role checks
     */
    const isAdmin = normalizedRole === ROLES.ADMIN;

    const isSportsManager =
      normalizedRole === ROLES.SPORTS_MANAGER;

    const isAdministrativeRole =
      isAdmin || isSportsManager;

    const isTechnicalDirector =
      normalizedRole === ROLES.TECHNICAL_DIRECTOR;

    const isCoach =
      normalizedRole === ROLES.COACH;

    const isAssistantCoach =
      normalizedRole === ROLES.ASSISTANT_COACH;

    const isDelegate =
      normalizedRole === ROLES.DELEGATE;

    const isPlayer =
      normalizedRole === ROLES.PLAYER;

    const isLegacyFamilyMember =
      normalizedRole === ROLES.LEGACY_FAMILY_MEMBER;

    const isTechnicalStaff =
      isTechnicalDirector ||
      isCoach ||
      isAssistantCoach ||
      isDelegate;

    const isStaff =
      isAdministrativeRole || isTechnicalStaff;

    /*
     * Acesso global desportivo
     *
     * Admin, Gestor Desportivo e Diretor Técnico podem consultar todas
     * as equipas e recursos desportivos do clube.
     */
    const canViewClubWideSportingData =
      isAdministrativeRole || isTechnicalDirector;

    /*
     * Permissões operacionais
     */
    const canManageTeam =
      isAdministrativeRole ||
      isTechnicalDirector ||
      isCoach;

    const canManageEvents =
      isAdministrativeRole ||
      isTechnicalDirector ||
      isCoach ||
      isAssistantCoach ||
      isDelegate;

    const canManageStats =
      isAdministrativeRole ||
      isTechnicalDirector ||
      isCoach ||
      isAssistantCoach;

    const canManageAttendance =
      isAdministrativeRole ||
      isTechnicalDirector ||
      isCoach ||
      isAssistantCoach ||
      isDelegate;

    const canCreateConvocations =
      isAdministrativeRole ||
      isTechnicalDirector ||
      isCoach ||
      isAssistantCoach ||
      isDelegate;

    const canManageLineups =
      isAdministrativeRole ||
      isTechnicalDirector ||
      isCoach ||
      isAssistantCoach;

    const canImportData =
      isAdministrativeRole ||
      isTechnicalDirector ||
      isCoach;

    const canExportData =
      isAdministrativeRole ||
      isTechnicalDirector ||
      isCoach ||
      isAssistantCoach ||
      isDelegate;

    /*
     * Gestão institucional
     */
    const canManageClub =
      isAdministrativeRole;

    const canManagePayments =
      isAdministrativeRole;

    const canManageSubscription =
      isAdmin;

    const canManageUsers =
      isAdministrativeRole;

    /*
     * Avaliações e Centro de Desenvolvimento
     */
    const canCreateEvaluations =
      isAdministrativeRole ||
      isTechnicalDirector ||
      isCoach ||
      isAssistantCoach;

    const canViewTeamEvaluations =
      isAdministrativeRole ||
      isTechnicalDirector ||
      isCoach ||
      isAssistantCoach;

    const hasRole = (role) => {
      if (!role) {
        return false;
      }

      return normalizedRole === normalizeRole(role);
    };

    const canAccessTeam = (teamId) => {
      const normalizedTeamId = normalizeId(teamId);

      if (canViewClubWideSportingData) {
        return true;
      }

      /**
       * Um recurso sem equipa não é automaticamente público.
       *
       * Apenas staff pode consultar recursos de âmbito geral do clube.
       * Atletas não devem receber acesso global através de team_id ausente.
       */
      if (!normalizedTeamId) {
        return isStaff;
      }

      return teamIds.has(normalizedTeamId);
    };

    const canAccessAnyTeam = (targetTeamIds = []) => {
      const normalizedTargetTeamIds =
        normalizeIds(targetTeamIds);

      if (canViewClubWideSportingData) {
        return true;
      }

      if (normalizedTargetTeamIds.length === 0) {
        return isStaff;
      }

      return normalizedTargetTeamIds.some((teamId) =>
        teamIds.has(teamId)
      );
    };

    const filterAccessibleTeams = (targetTeams = []) => {
      if (!Array.isArray(targetTeams)) {
        return [];
      }

      if (canViewClubWideSportingData) {
        return targetTeams;
      }

      return targetTeams.filter((team) => {
        const teamId =
          typeof team === 'object'
            ? team?.id || team?._id
            : team;

        return teamIds.has(normalizeId(teamId));
      });
    };

    const canAccessPlayer = (playerId, playerTeamIds = []) => {
      const normalizedPlayerId = normalizeId(playerId);

      if (!normalizedPlayerId) {
        return false;
      }

      if (canViewClubWideSportingData) {
        return true;
      }

      if (
        effectivePlayerId &&
        normalizedPlayerId === effectivePlayerId
      ) {
        return true;
      }

      if (isTechnicalStaff) {
        return canAccessAnyTeam(playerTeamIds);
      }

      return false;
    };

    const canAccessUser = (targetUser) => {
      if (!targetUser) {
        return false;
      }

      if (canViewClubWideSportingData) {
        return true;
      }

      const targetUserId = normalizeId(
        targetUser.id || targetUser._id
      );

      if (
        targetUserId &&
        targetUserId === resolvedEffectiveUserId
      ) {
        return true;
      }

      if (
        effectivePlayerId &&
        targetUserId === effectivePlayerId
      ) {
        return true;
      }

      const targetTeamIds = normalizeIds(
        targetUser.team_ids ||
          targetUser.teams?.map((team) => team?.id) ||
          []
      );

      /*
       * Staff apenas consulta utilizadores das suas equipas.
       */
      if (isTechnicalStaff) {
        return targetTeamIds.some((teamId) =>
          teamIds.has(teamId)
        );
      }

      /*
       * Um atleta pode consultar elementos do contexto das suas equipas
       * quando a interface necessita dessa informação.
       */
      if (isPlayer) {
        return targetTeamIds.some((teamId) =>
          teamIds.has(teamId)
        );
      }

      return false;
    };

    const canEditUser = (targetUser) => {
      if (!targetUser) {
        return false;
      }

      const targetUserId = normalizeId(
        targetUser.id || targetUser._id
      );

      /*
       * Administradores e gestores podem editar membros.
       */
      if (canManageUsers) {
        return true;
      }

      /*
       * O utilizador pode editar o seu perfil efetivo.
       */
      if (
        targetUserId &&
        targetUserId === resolvedEffectiveUserId
      ) {
        return true;
      }

      /*
       * Um perfil associado não deve ganhar permissão para editar o atleta
       * apenas por ser controlado por outra conta.
       *
       * Alterações sensíveis continuam dependentes das regras do backend.
       */
      if (isViewingAsAssociated) {
        return false;
      }

      /*
       * Treinadores podem editar dados desportivos dos membros das equipas
       * às quais pertencem. O backend deve limitar os campos permitidos.
       */
      if (isCoach) {
        const targetTeamIds = normalizeIds(
          targetUser.team_ids ||
            targetUser.teams?.map((team) => team?.id) ||
            []
        );

        return targetTeamIds.some((teamId) =>
          teamIds.has(teamId)
        );
      }

      return false;
    };

    const canAccessEvent = (event) => {
      if (!event) {
        return false;
      }

      if (canViewClubWideSportingData) {
        return true;
      }

      const eventTeamIds = normalizeIds(
        event.team_ids ||
          [event.team_id] ||
          []
      );

      if (eventTeamIds.length === 0) {
        return isStaff;
      }

      return eventTeamIds.some((teamId) =>
        teamIds.has(teamId)
      );
    };

    const canAccessChampionship = (championship) => {
      if (!championship) {
        return false;
      }

      if (canViewClubWideSportingData) {
        return true;
      }

      const championshipTeamIds = normalizeIds(
        championship.team_ids ||
          [championship.team_id] ||
          []
      );

      if (championshipTeamIds.length === 0) {
        return isStaff;
      }

      return championshipTeamIds.some((teamId) =>
        teamIds.has(teamId)
      );
    };

    const canAccessAttendance = (attendance) => {
      if (!attendance) {
        return false;
      }

      if (canViewClubWideSportingData) {
        return true;
      }

      const attendancePlayerId = normalizeId(
        attendance.player_id ||
          attendance.user_id
      );

      if (
        effectivePlayerId &&
        attendancePlayerId === effectivePlayerId
      ) {
        return true;
      }

      const attendanceTeamId = normalizeId(
        attendance.team_id ||
          attendance.event?.team_id
      );

      if (
        isTechnicalStaff &&
        attendanceTeamId &&
        teamIds.has(attendanceTeamId)
      ) {
        return true;
      }

      return false;
    };

    const canAccessEvaluation = (evaluation) => {
      if (!evaluation) {
        return false;
      }

      if (canViewClubWideSportingData) {
        return true;
      }

      const evaluationPlayerId = normalizeId(
        evaluation.player_id
      );

      if (
        effectivePlayerId &&
        evaluationPlayerId === effectivePlayerId
      ) {
        const visibility =
          evaluation.visibility || 'coach_only';

        return [
          'player',
          'guardian',
          'all',
        ].includes(visibility);
      }

      if (canViewTeamEvaluations) {
        const evaluationTeamId = normalizeId(
          evaluation.team_id
        );

        return (
          Boolean(evaluationTeamId) &&
          teamIds.has(evaluationTeamId)
        );
      }

      return false;
    };

    const getTeamFilter = () => {
      if (canViewClubWideSportingData) {
        return {};
      }

      if (teamIds.size === 1) {
        return {
          team_id: [...teamIds][0],
        };
      }

      if (teamIds.size > 1) {
        return {
          team_ids: [...teamIds],
        };
      }

      /**
       * Nenhuma equipa atribuída deve produzir um filtro sem resultados.
       * Nunca deve significar acesso global.
       */
      return {
        team_ids: [],
      };
    };

    const permissionMap = {
      /*
       * Equipas e membros
       */
      view_all_teams: canViewClubWideSportingData,
      manage_all_teams:
        isAdministrativeRole || isTechnicalDirector,

      view_team_members:
        isStaff || isPlayer,

      manage_team_members: canManageTeam,

      create_members: canManageUsers,
      delete_members: canManageUsers,

      /*
       * Calendário e eventos
       */
      view_team_events: true,
      manage_team_events: canManageEvents,

      /*
       * Competições e Match Center
       */
      view_team_stats: true,
      manage_team_stats: canManageStats,

      create_convocations: canCreateConvocations,
      manage_lineups: canManageLineups,
      manage_match_timeline: canManageStats,
      close_match:
        isAdministrativeRole ||
        isTechnicalDirector ||
        isCoach,

      /*
       * Presenças
       */
      view_team_attendance:
        isStaff || isPlayer,

      manage_team_attendance: canManageAttendance,

      /*
       * Importação e exportação
       */
      import_data: canImportData,
      export_data: canExportData,

      /*
       * Centro de Desenvolvimento
       */
      view_development_center:
        isStaff || isPlayer,

      create_evaluations: canCreateEvaluations,
      view_team_evaluations: canViewTeamEvaluations,

      /*
       * Clube
       */
      view_club_settings: isAdministrativeRole,
      manage_club_settings: canManageClub,

      /*
       * Pagamentos e subscrição
       */
      view_payments:
        isAdministrativeRole || isPlayer,

      manage_payments: canManagePayments,
      manage_subscription: canManageSubscription,
    };

    const hasPermission = (permission) => {
      if (!permission) {
        return false;
      }

      return Boolean(permissionMap[permission]);
    };

    return {
      // Contexto
      role: normalizedRole,
      activeProfileType,
      effectiveUserId: resolvedEffectiveUserId,
      effectivePlayerId,
      linkedPlayerId: effectivePlayerId,
      isViewingAsAssociated,

      /**
       * Compatibilidade com componentes existentes.
       *
       * allRoles contém apenas o papel ativo para impedir que outros perfis
       * da mesma conta concedam permissões simultâneas.
       */
      allRoles: normalizedRole
        ? [normalizedRole]
        : [],

      // Role checks
      isAdmin,
      isSportsManager,
      isTechnicalDirector,
      isCoach,
      isAssistantCoach,
      isDelegate,
      isPlayer,
      isLegacyFamilyMember,

      /**
       * Alias temporário. Não corresponde a um perfil real.
       */
      isFamilyMember: isLegacyFamilyMember,

      isStaff,
      isTechnicalStaff,

      // Permission checks
      canViewClubWideSportingData,
      canManageTeam,
      canManageEvents,
      canManageStats,
      canManageAttendance,
      canCreateConvocations,
      canManageLineups,
      canImportData,
      canExportData,
      canManageClub,
      canManagePayments,
      canManageSubscription,
      canManageUsers,
      canCreateEvaluations,
      canViewTeamEvaluations,

      // Team access
      teamIds: [...teamIds],

      // Helpers
      canAccessTeam,
      canAccessAnyTeam,
      filterAccessibleTeams,
      canAccessUser,
      canEditUser,
      canAccessEvent,
      canAccessChampionship,
      canAccessAttendance,
      canAccessPlayer,
      canAccessEvaluation,
      getTeamFilter,
      hasRole,
      hasPermission,
    };
  }, [
    user,
    activeProfile,
    viewingAs,
    effectiveRole,
    effectiveUserId,
    isViewingAsAssociated,
  ]);

  return (
    <PermissionsContext.Provider value={permissions}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);

  if (!context) {
    throw new Error(
      'usePermissions must be used within a PermissionsProvider'
    );
  }

  return context;
}

export function withPermission(Component, options = {}) {
  return function ProtectedComponent(props) {
    const permissions = usePermissions();

    const {
      requiredRole,
      requiredPermission,
      fallback = null,
    } = options;

    /**
     * Verifica apenas o papel ativo.
     *
     * Um papel existente noutro perfil da conta não pode autorizar
     * o componente enquanto esse perfil não estiver selecionado.
     */
    if (
      requiredRole &&
      !permissions.hasRole(requiredRole)
    ) {
      return fallback;
    }

    if (
      requiredPermission &&
      !permissions.hasPermission(requiredPermission)
    ) {
      return fallback;
    }

    return <Component {...props} />;
  };
}

export default PermissionsContext;
