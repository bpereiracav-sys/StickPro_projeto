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
        visibleFor: ['all'],
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
        visibleFor: ['all'],
      },
      {
        id: 'messages',
        path: '/messages',
        labelKey: 'nav.messages',
        fallbackLabel: 'Mensagens',
        icon: MessageSquare,
        visibleFor: ['all'],
        children: [
          { id: 'conversations', path: '/messages', fallbackLabel: 'Conversas' },
          { id: 'groups', path: '/messages/groups', fallbackLabel: 'Grupos' },
          { id: 'attachments', path: '/messages/attachments', fallbackLabel: 'Anexos' },
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
        permissionFlag: 'canManageTeam',
      },
      {
        id: 'competitions',
        path: '/championships',
        labelKey: 'nav.championships',
        fallbackLabel: 'Competições',
        icon: Trophy,
        visibleFor: ['all'],
        children: [
          { id: 'dashboard', path: '/championships', fallbackLabel: 'Dashboard' },
          { id: 'games', path: '/championships/games', fallbackLabel: 'Jogos' },
          { id: 'results', path: '/championships/results', fallbackLabel: 'Resultados' },
          { id: 'standings', path: '/championships/standings', fallbackLabel: 'Classificações' },
          { id: 'imports', path: '/championships/imports', fallbackLabel: 'Importações' },
        ],
      },
      {
        id: 'stats',
        path: '/stats',
        labelKey: 'nav.stats',
        fallbackLabel: 'Estatísticas',
        icon: BarChart3,
        visibleFor: ['all'],
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
        legacyPaths: ['/evaluation-criteria', '/evaluation-plans', '/evaluations'],
        labelKey: 'nav.developmentCenter',
        fallbackLabel: 'Centro Desenvolvimento',
        icon: Award,
        visibleFor: ['admin', 'gestor_desportivo', 'treinador', 'treinador_adjunto', 'delegado', 'jogador', 'responsavel'],
        children: [
          { id: 'dashboard', path: '/development-center', fallbackLabel: 'Dashboard' },
          { id: 'criteria', path: '/evaluation-criteria', fallbackLabel: 'Critérios', icon: ClipboardList },
          { id: 'plans', path: '/evaluation-plans', fallbackLabel: 'Planos', icon: FileText },
          { id: 'evaluations', path: '/evaluations', fallbackLabel: 'Avaliações', icon: Award },
          { id: 'new_evaluation', path: '/evaluations/new', fallbackLabel: 'Nova Avaliação', icon: ClipboardCheck },
          { id: 'objectives', path: '/development-center/objectives', fallbackLabel: 'Objetivos', icon: Target, disabled: true },
          { id: 'reports', path: '/development-center/reports', fallbackLabel: 'Relatórios', icon: FileText, disabled: true },
          { id: 'technical_book', path: '/development-center/technical-book', fallbackLabel: 'Livro Técnico', icon: BookOpen, disabled: true },
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
        visibleFor: ['all'],
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
        visibleFor: ['admin', 'gestor_desportivo', 'jogador', 'responsavel'],
      },
      {
        id: 'club',
        path: '/club',
        labelKey: 'nav.club',
        fallbackLabel: 'Clube',
        icon: Building2,
        permissionFlag: 'isAdmin',
      },
      {
        id: 'subscription',
        path: '/subscription',
        labelKey: 'nav.subscription',
        fallbackLabel: 'Subscrição',
        icon: CreditCard,
        permissionFlag: 'isAdmin',
      },
      {
        id: 'settings',
        path: '/settings',
        labelKey: 'nav.settings',
        fallbackLabel: 'Definições',
        icon: Settings,
        visibleFor: ['all'],
      },
    ],
  },
];

export function canShowNavigationItem(item, user, permissions) {
  if (!item) return false;

  if (item.visible === false) return false;

  if (item.visibleFor?.includes('all')) return true;

  if (item.permissionFlag && permissions?.[item.permissionFlag]) {
    return true;
  }

  if (
    item.permission &&
    typeof permissions?.hasPermission === 'function' &&
    permissions.hasPermission(item.permission)
  ) {
    return true;
  }

  const role = user?.role;

  if (role && item.visibleFor?.includes(role)) {
    return true;
  }

  return false;
}

export function getVisibleNavigationSections(user, permissions) {
  return NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        canShowNavigationItem(item, user, permissions)
      ),
    }))
    .filter((section) => section.items.length > 0);
}

export function isNavigationItemActive(item, pathname) {
  if (!item || !pathname) return false;

  const paths = [item.path, ...(item.legacyPaths || [])].filter(Boolean);

  return paths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}
