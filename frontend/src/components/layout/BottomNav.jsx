import { Link, useLocation } from 'react-router-dom';
import { Calendar, MessageSquare, Users, BarChart3, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';
import { usePermissions } from '../../context/PermissionsContext';

export function BottomNav() {
  const location = useLocation();
  const { t } = useLanguage();
  const permissions = usePermissions();

  const navItems = [
    {
      href: '/calendar',
      label: t('nav.calendar') !== 'nav.calendar' ? t('nav.calendar') : 'Calendário',
      icon: Calendar,
      visible: true,
      testId: 'calendar',
    },
    {
      href: '/messages',
      label: t('nav.messages') !== 'nav.messages' ? t('nav.messages') : 'Mensagens',
      icon: MessageSquare,
      visible: true,
      testId: 'messages',
    },
    {
      href: '/members',
      label: t('nav.members') !== 'nav.members' ? t('nav.members') : 'Membros',
      icon: Users,
      visible: permissions.hasPermission('view_team_members'),
      testId: 'members',
    },
    {
      href: '/stats',
      label: t('nav.stats') !== 'nav.stats' ? t('nav.stats') : 'Estatísticas',
      icon: BarChart3,
      visible: true,
      testId: 'stats',
    },
    {
      href: '/profile',
      label: t('nav.myProfile') !== 'nav.myProfile' ? t('nav.myProfile') : 'Perfil',
      icon: User,
      visible: true,
      testId: 'profile',
    },
  ].filter((item) => item.visible);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-40 flex items-center justify-around px-2 safe-area-bottom"
      data-testid="bottom-nav"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          location.pathname === item.href ||
          location.pathname.startsWith(item.href + '/');

        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex flex-col items-center justify-center min-w-0 flex-1 h-14 rounded-lg transition-all px-1',
              isActive
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
            data-testid={`bottom-nav-${item.testId}`}
          >
            <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-primary')} />
            <span
              className={cn(
                'text-[10px] mt-1 font-medium truncate max-w-full',
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
