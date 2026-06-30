import { Link, useLocation } from 'react-router-dom';
import { Calendar, MessageSquare, Users, BarChart3, Menu } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';
import { usePermissions } from '../../context/PermissionsContext';

export function BottomNav() {
  const location = useLocation();
  const { t } = useLanguage();
  const permissions = usePermissions();

  const tr = (key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };

  const openSidebar = () => {
    window.dispatchEvent(new CustomEvent('stickpro:open-sidebar'));
  };

  const navItems = [
    {
      href: '/dashboard',
      label: tr('nav.dashboard', 'Dashboard'),
      icon: Menu,
      visible: true,
      testId: 'dashboard',
      isSidebarTrigger: true,
    },
    {
      href: '/calendar',
      label: tr('nav.calendar', 'Calendário'),
      icon: Calendar,
      visible: true,
      testId: 'calendar',
    },
    {
      href: '/messages',
      label: tr('nav.messages', 'Mensagens'),
      icon: MessageSquare,
      visible: true,
      testId: 'messages',
    },
    {
      href: '/teams',
      label: tr('nav.teams', 'Equipas'),
      icon: Users,
      visible: permissions.hasPermission('view_team_members') || permissions.canManageTeam,
      testId: 'teams',
    },
    {
      href: '/stats',
      label: tr('nav.stats', 'Estatísticas'),
      icon: BarChart3,
      visible: true,
      testId: 'stats',
    },
  ].filter((item) => item.visible);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border bg-card px-2 safe-area-bottom"
      data-testid="bottom-nav"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          !item.isSidebarTrigger &&
          (location.pathname === item.href ||
            location.pathname.startsWith(`${item.href}/`));

        if (item.isSidebarTrigger) {
          return (
            <button
              key={item.testId}
              type="button"
              onClick={openSidebar}
              className="flex h-14 min-w-0 flex-1 flex-col items-center justify-center rounded-lg px-1 text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
              data-testid={`bottom-nav-${item.testId}`}
              aria-label={tr('nav.openMenu', 'Abrir menu')}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="mt-1 max-w-full truncate text-[10px] font-medium">
                {tr('nav.more', 'Mais')}
              </span>
            </button>
          );
        }

        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex h-14 min-w-0 flex-1 flex-col items-center justify-center rounded-lg px-1 transition-all',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
            data-testid={`bottom-nav-${item.testId}`}
          >
            <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
            <span
              className={cn(
                'mt-1 max-w-full truncate text-[10px] font-medium',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default BottomNav;
