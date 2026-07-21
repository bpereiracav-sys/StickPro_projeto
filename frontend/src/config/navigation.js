import {
  Home,
  Calendar,
  MessageSquare,
  Users,
  Trophy,
  BarChart3,
  ClipboardCheck,
  Award,
  BookOpen,
  CreditCard,
  Building2,
  Settings,
  FileText,
  Target,
  ClipboardList,
  Library,
} from 'lucide-react';

/**
 * RC1.1 — Navegação MultiPerfil
 *
 * Regras:
 *
 * 1. A navegação depende exclusivamente das permissões do perfil ativo.
 * 2. Não se deve usar user.role para decidir menus.
 * 3. Não existe um perfil funcional Pai/Mãe.
 * 4. Um atleta associado recebe a mesma navegação de atleta.
 * 5. O backend continua a ser a autoridade final de autorização.
 */

export const NAV_SECTIONS = [
  {
    id: 'home',
    titleKey: null,
    fallbackTitle: null,
    items: [
      {
        id: 'home',
        path: '/dashboard',
        labelKey: 'nav.home',
        fallbackLabel: 'Início',
        icon: Home,
        publicForAuthenticated: true,
      },
    ],
  },

  {
    id: 'operations',
    titleKey: 'sidebar.operations',
    fallbackTitle: 'Operacional',
    items: [
      {
        id: 'calendar',
        path: '/calendar',
        labelKey: 'nav.calendar',
        fallbackLabel: 'Calendário',
        icon: Calendar,
        permission: 'view_team_events',
      },
      {
        id: 'messages',
        path: '/messages',
        labelKey: 'nav.messages',
        fallbackLabel: 'Mensagens',
        icon: MessageSquare,
        publicForAuthenticated: true,
        children: [
          {
            id: 'conversations',
            path: '/messages',
            fallbackLabel: 'Conversas',
          },
          {
            id: 'groups',
            path: '/messages/groups',
            fallbackLabel: 'Grupos',
          },
          {
            id: 'attachments',
            path: '/messages/attachments',
            fallbackLabel: 'Anexos',
          },
        ],
      },
    ],
  },

  {
    id: 'sports_development',
    titleKey: 'sidebar.sportsDevelopment',
    fallbackTitle: 'Desenvolvimento Desportivo',
    items: [
      {
        id: 'members',
        path: '/members',
        labelKey: 'nav.members',
        fallbackLabel: 'Membros',
        icon: Users,
        permission: 'view_team_members',
      },
      {
        id: 'teams',
        path: '/teams',
        labelKey: 'nav.teams',
        fallbackLabel: 'Equipas',
        icon: Users,

        /**
         * Todos os perfis desportivos podem consultar as equipas às quais
         * têm acesso. A capacidade de editar continua dependente de
         * canManageTeam dentro da página.
         */
        permission: 'view_team_members',
      },
      {
        id: 'competitions',
        path: '/championships',
        labelKey: 'nav.championships',
        fallbackLabel: 'Competições',
        icon: Trophy,
        permission: 'view_team_stats',
        children: [
          {
            id: 'dashboard',
            path: '/championships',
            fallbackLabel: 'Dashboard',
          },
          {
            id: 'games',
            path: '/championships/games',
            fallbackLabel: 'Jogos',
          },
          {
            id: 'results',
            path: '/championships/results',
            fallbackLabel: 'Resultados',
          },
          {
            id: 'standings',
            path: '/championships/standings',
            fallbackLabel: 'Classificações',
          },
          {
            id: 'imports',
            path: '/championships/imports',
            fallbackLabel: 'Importações',
            permission: 'import_data',
          },
        ],
      },
      {
        id: 'stats',
        path: '/stats',
        labelKey: 'nav.stats',
        fallbackLabel: 'Estatísticas',
        icon: BarChart3,
        permission: 'view_team_stats',
      },
      {
        id: 'attendance',
        path: '/attendance',
        labelKey: 'nav.attendance',
        fallbackLabel: 'Presenças',
        icon: ClipboardCheck,
        permission: 'view_team_attendance',
      },
      {
        id: 'development_center',
        path: '/development-center',
        legacyPaths: [
          '/evaluation-criteria',
          '/evaluation-plans',
          '/evaluations',
        ],
        labelKey: 'nav.developmentCenter',
        fallbackLabel: 'Centro Desenvolvimento',
        icon: Award,
        permission: 'view_development_center',
        children: [
          {
            id: 'dashboard',
            path: '/development-center',
            fallbackLabel: 'Dashboard',
            permission: 'view_development_center',
          },
          {
            id: 'criteria',
            path: '/evaluation-criteria',
            fallbackLabel: 'Critérios',
            icon: ClipboardList,
            permission: 'create_evaluations',
          },
          {
            id: 'plans',
            path: '/evaluation-plans',
            fallbackLabel: 'Planos',
            icon: FileText,
            permission: 'create_evaluations',
          },
          {
            id: 'evaluations',
            path: '/evaluations',
            fallbackLabel: 'Avaliações',
            icon: Award,
            permission: 'view_development_center',
          },
          {
            id: 'new_evaluation',
            path: '/evaluations/new',
            fallbackLabel: 'Nova Avaliação',
            icon: ClipboardCheck,
            permission: 'create_evaluations',
          },
          {
            id: 'objectives',
            path: '/development-center/objectives',
            fallbackLabel: 'Objetivos',
            icon: Target,
            disabled: true,
          },
          {
            id: 'reports',
            path: '/development-center/reports',
            fallbackLabel: 'Relatórios',
            icon: FileText,
            disabled: true,
          },
          {
            id: 'technical_book',
            path: '/development-center/technical-book',
            fallbackLabel: 'Livro Técnico',
            icon: BookOpen,
            disabled: true,
          },
        ],
      },
    ],
  },

  {
    id: 'knowledge',
    titleKey: 'sidebar.knowledge',
    fallbackTitle: 'Conhecimento',
    items: [
      {
        id: 'library',
        path: '/library',
        labelKey: 'nav.library',
        fallbackLabel: 'Biblioteca',
        icon: Library,
        publicForAuthenticated: true,
      },
    ],
  },

  {
    id: 'administration',
    titleKey: 'sidebar.administration',
    fallbackTitle: 'Administração',
    items: [
      {
        id: 'payments',
        path: '/payments',
        labelKey: 'nav.payments',
        fallbackLabel: 'Pagamentos',
        icon: CreditCard,
        permission: 'view_payments',
      },
      {
        id: 'club',
        path: '/club',
        labelKey: 'nav.club',
        fallbackLabel: 'Clube',
        icon: Building2,
        permission: 'view_club_settings',
      },
      {
        id: 'subscription',
        path: '/subscription',
        labelKey: 'nav.subscription',
        fallbackLabel: 'Subscrição',
        icon: CreditCard,
        permission: 'manage_subscription',
      },
      {
        id: 'settings',
        path: '/settings',
        labelKey: 'nav.settings',
        fallbackLabel: 'Definições',
        icon: Settings,
        publicForAuthenticated: true,
      },
    ],
  },
];

/**
 * Verifica uma flag booleana existente no PermissionsContext.
 */
function hasPermissionFlag(permissionFlag, permissions) {
  if (!permissionFlag || !permissions) {
    return false;
  }

  return Boolean(permissions[permissionFlag]);
}

/**
 * Verifica uma permissão declarativa através de hasPermission().
 */
function hasNamedPermission(permission, permissions) {
  if (
    !permission ||
    typeof permissions?.hasPermission !== 'function'
  ) {
    return false;
  }

  return permissions.hasPermission(permission);
}

/**
 * Determina a visibilidade de um item.
 *
 * O parâmetro user foi removido intencionalmente. A conta autenticada pode
 * possuir vários perfis, mas apenas o perfil ativo deve controlar o menu.
 */
export function canShowNavigationItem(item, permissions) {
  if (!item) {
    return false;
  }

  if (item.visible === false) {
    return false;
  }

  if (item.disabled === true) {
    return false;
  }

  if (item.publicForAuthenticated === true) {
    return true;
  }

  if (
    item.permissionFlag &&
    hasPermissionFlag(item.permissionFlag, permissions)
  ) {
    return true;
  }

  if (
    item.permission &&
    hasNamedPermission(item.permission, permissions)
  ) {
    return true;
  }

  return false;
}

/**
 * Filtra também os filhos do menu.
 *
 * Atualmente a Sidebar apresenta apenas os itens principais, mas manter os
 * filhos filtrados evita disponibilizar no futuro atalhos para operações sem
 * autorização, como Importações ou Nova Avaliação.
 */
function filterNavigationChildren(children, permissions) {
  if (!Array.isArray(children)) {
    return children;
  }

  return children.filter((child) => {
    if (child.disabled === true) {
      return false;
    }

    /**
     * Filhos sem regra explícita herdam a visibilidade do item principal.
     */
    if (
      !child.permission &&
      !child.permissionFlag &&
      child.publicForAuthenticated !== false
    ) {
      return true;
    }

    return canShowNavigationItem(child, permissions);
  });
}

/**
 * Assinatura nova:
 *
 * getVisibleNavigationSections(permissions)
 *
 * Mantemos também compatibilidade temporária com a assinatura anterior:
 *
 * getVisibleNavigationSections(user, permissions)
 *
 * Isto permite atualizar a Sidebar sem provocar erros imediatos noutros
 * componentes que possam importar a função.
 */
export function getVisibleNavigationSections(
  permissionsOrLegacyUser,
  legacyPermissions
) {
  const permissions =
    legacyPermissions || permissionsOrLegacyUser;

  return NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) =>
          canShowNavigationItem(item, permissions)
        )
        .map((item) => ({
          ...item,
          children: filterNavigationChildren(
            item.children,
            permissions
          ),
        })),
    }))
    .filter((section) => section.items.length > 0);
}

export function isNavigationItemActive(item, pathname) {
  if (!item || !pathname) {
    return false;
  }

  const paths = [
    item.path,
    ...(item.legacyPaths || []),
  ].filter(Boolean);

  return paths.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(`${path}/`)
  );
}

export const DASHBOARD_QUICK_ACTIONS = [
  {
    id: 'calendar',
    path: '/calendar',
    labelKey: 'nav.calendar',
    fallbackLabel: 'Calendário',
    descriptionKey: 'dashboard.quickActions.calendar',
    fallbackDescription: 'Ver treinos, jogos e eventos',
    icon: Calendar,
    permission: 'view_team_events',
  },
  {
    id: 'messages',
    path: '/messages',
    labelKey: 'nav.messages',
    fallbackLabel: 'Mensagens',
    descriptionKey: 'dashboard.quickActions.messages',
    fallbackDescription: 'Comunicação da equipa',
    icon: MessageSquare,
    publicForAuthenticated: true,
  },
  {
    id: 'development_center_staff',
    path: '/development-center',
    labelKey: 'nav.developmentCenter',
    fallbackLabel: 'Centro Desenvolvimento',
    descriptionKey: 'dashboard.quickActions.developmentCenter',
    fallbackDescription: 'Avaliar e acompanhar atletas',
    icon: Award,
    permission: 'create_evaluations',
  },
  {
    id: 'my_development',
    path: '/development-center',
    labelKey: 'nav.myDevelopment',
    fallbackLabel: 'O Meu Desenvolvimento',
    descriptionKey: 'dashboard.quickActions.myDevelopment',
    fallbackDescription: 'Ver evolução, objetivos e feedback',
    icon: Award,
    permission: 'view_development_center',
    playerOnly: true,
  },
  {
    id: 'new_evaluation',
    path: '/evaluations/new',
    labelKey: 'evaluation.newEvaluation',
    fallbackLabel: 'Nova Avaliação',
    descriptionKey: 'dashboard.quickActions.newEvaluation',
    fallbackDescription: 'Avaliar atletas rapidamente',
    icon: ClipboardCheck,
    permission: 'create_evaluations',
  },
  {
    id: 'competitions',
    path: '/championships',
    labelKey: 'nav.championships',
    fallbackLabel: 'Competições',
    descriptionKey: 'dashboard.quickActions.competitions',
    fallbackDescription: 'Jogos, resultados e estatísticas',
    icon: Trophy,
    permission: 'view_team_stats',
  },
  {
    id: 'attendance',
    path: '/attendance',
    labelKey: 'nav.attendance',
    fallbackLabel: 'Presenças',
    descriptionKey: 'dashboard.quickActions.attendance',
    fallbackDescription: 'Assiduidade e convocatórias',
    icon: ClipboardCheck,
    permission: 'view_team_attendance',
  },
  {
    id: 'plans',
    path: '/evaluation-plans',
    labelKey: 'evaluationPlans.title',
    fallbackLabel: 'Planos',
    descriptionKey: 'dashboard.quickActions.plans',
    fallbackDescription: 'Planos de avaliação',
    icon: FileText,
    permission: 'create_evaluations',
  },
];

/**
 * Evita mostrar simultaneamente:
 *
 * - "Centro Desenvolvimento" para staff;
 * - "O Meu Desenvolvimento" para atleta.
 */
function canShowQuickAction(item, permissions) {
  if (!canShowNavigationItem(item, permissions)) {
    return false;
  }

  if (item.playerOnly === true) {
    return Boolean(permissions?.isPlayer);
  }

  return true;
}

/**
 * Assinatura nova:
 *
 * getVisibleDashboardQuickActions(permissions)
 *
 * Compatível temporariamente com:
 *
 * getVisibleDashboardQuickActions(user, permissions)
 */
export function getVisibleDashboardQuickActions(
  permissionsOrLegacyUser,
  legacyPermissions
) {
  const permissions =
    legacyPermissions || permissionsOrLegacyUser;

  return DASHBOARD_QUICK_ACTIONS.filter((item) =>
    canShowQuickAction(item, permissions)
  );
}
