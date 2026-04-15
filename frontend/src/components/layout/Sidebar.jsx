import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTeam } from '../../context/TeamContext';
import { usePermissions } from '../../context/PermissionsContext';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Calendar,
  Users,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  Home,
  ChevronDown,
  Bell,
  Trophy,
  ClipboardCheck,
  RefreshCw,
  Shield,
  BookOpen,
  Building2,
  CreditCard,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { getInitials, getRoleName, normalizeRole } from '../../lib/utils';
import { toast } from 'sonner';
import { dashboardApi } from '../../services/api';

const CUSTOM_LOGO_URL =
  'https://customer-assets.emergentagent.com/job_roller-hockey-hub-1/artifacts/e8f8q5qy_logoBranco2.png';

const StickProLogo = ({ size = 'md' }) => {
  const sizes = {
    sm: { box: 'w-16 h-16' },
    md: { box: 'w-20 h-20' },
    lg: { box: 'w-24 h-24' },
  };

  const s = sizes[size] || sizes.md;

  return (
    <img
      src={CUSTOM_LOGO_URL}
      alt="Logo"
      className={`${s.box} object-contain transition-all duration-300`}
      data-testid="stick-pro-logo"
    />
  );
};

export function Sidebar() {
  const {
    user,
    logout,
    isAuthenticated,
    availableProfiles,
    activeProfile,
    viewingAs,
    isViewingAsAssociated,
    switchProfile,
    effectiveRole,
  } = useAuth();

  const { t } = useLanguage();
  const { selectedTeam, isAllTeamsSelected } = useTeam();
  const permissions = usePermissions();

  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [switchingProfile, setSwitchingProfile] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState(0);

  const normalizedEffectiveRole = normalizeRole(effectiveRole);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await dashboardApi.get();
        const pendingCount = response.data?.pending_convocations?.length || 0;
        setPendingNotifications(pendingCount);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSwitchProfile = async (profile) => {
    setSwitchingProfile(true);
    try {
      await switchProfile(profile);
      toast.success(`Perfil alterado: ${profile.label || profile.user_name}`);
      navigate('/dashboard');
      setMenuOpen(false);
    } catch (error) {
      toast.error('Erro ao mudar de perfil');
    } finally {
      setSwitchingProfile(false);
    }
  };

  const handleSwitchToSelf = async () => {
    const selfProfile = availableProfiles.find(
      (profile) => profile.type === 'self' && profile.user_id === user?.id
    );

    if (selfProfile) {
      await handleSwitchProfile(selfProfile);
    }
  };

  const otherProfiles = useMemo(() => {
    return availableProfiles.filter((profile) => {
      if (
        activeProfile?.type === 'self' &&
        profile.type === 'self' &&
        profile.user_id === user?.id
      ) {
        return false;
      }

      if (
        activeProfile?.type === 'associated' &&
        profile.type === 'associated' &&
        profile.user_id === activeProfile?.user_id
      ) {
        return false;
      }

      return true;
    });
  }, [availableProfiles, activeProfile, user?.id]);

  const displayName = viewingAs?.name || user?.name;
  const displayRole = viewingAs?.role || user?.role;

  const navLinks = useMemo(() => {
    const paymentsLabel =
      t('nav.payments') !== 'nav.payments' ? t('nav.payments') : 'Pagamentos';

    const libraryLabel =
      t('nav.library') !== 'nav.library' ? t('nav.library') : 'Biblioteca';

    const teamsLabel =
      t('nav.teams') !== 'nav.teams' ? t('nav.teams') : 'Equipas';

    const links = [
      {
        href: '/dashboard',
        label: t('nav.home'),
        icon: Home,
        visible: true,
        notificationCount: pendingNotifications,
      },
      {
        href: '/calendar',
        label: t('nav.calendar'),
        icon: Calendar,
        visible: true,
      },
      {
        href: '/my-teams',
        label: t('nav.myTeams'),
        icon: Users,
        visible: true,
      },
      {
        href: '/teams',
        label: teamsLabel,
        icon: Users,
        visible: permissions.canManageTeam,
      },
      {
        href: '/members',
        label: t('nav.members'),
        icon: Users,
        visible: permissions.hasPermission('view_team_members'),
      },
      {
        href: '/championships',
        label: t('nav.championships'),
        icon: Trophy,
        visible: true,
      },
      {
        href: '/attendance',
        label: t('nav.attendance'),
        icon: ClipboardCheck,
        visible: permissions.hasPermission('view_team_attendance'),
      },
      {
        href: '/stats',
        label: t('nav.stats'),
        icon: BarChart3,
        visible: true,
      },
      {
        href: '/payments',
        label: paymentsLabel,
        icon: CreditCard,
        visible:
          permissions.isAdmin ||
          permissions.isPlayer ||
          permissions.isFamilyMember,
      },
      {
        href: '/library',
        label: libraryLabel,
        icon: BookOpen,
        visible: true,
      },
      {
        href: '/messages',
        label: t('nav.messages'),
        icon: MessageSquare,
        visible: true,
      },
      {
        href: '/club',
        label: t('nav.club') || 'Clube',
        icon: Building2,
        visible: permissions.isAdmin,
      },
      {
        href: '/subscription',
        label: t('nav.subscription') || 'Subscrição',
        icon: CreditCard,
        visible: permissions.isAdmin,
      },
      {
        href: '/settings',
        label: t('nav.settings'),
        icon: Settings,
        visible: true,
      },
    ];

    return links.filter((link) => link.visible);
  }, [t, permissions, pendingNotifications, normalizedEffectiveRole]);

  if (!isAuthenticated) return null;

  return (
    <>
      <header
        className="lg:hidden fixed top-0 left-0 right-0 h-14 z-40 flex items-center justify-between px-4"
        style={{
          backgroundColor: 'hsl(var(--sidebar-bg))',
          borderBottom: '1px solid hsl(var(--sidebar-border))',
        }}
      >
        <div className="flex items-center gap-2 ml-2">
          <img
            src={CUSTOM_LOGO_URL}
            alt="Logo"
            className="w-10 h-10 object-contain flex-shrink-0"
            data-testid="mobile-header-logo"
          />
          <span
            className="font-heading text-base tracking-tight"
            style={{ color: 'var(--sidebar-text)' }}
          >
            Stick<span style={{ color: 'var(--sidebar-active-text)' }}>Pro</span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9"
            style={{ color: 'var(--sidebar-text)' }}
          >
            <Bell className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            style={{ color: 'var(--sidebar-text)' }}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-50
          transition-transform duration-300 ease-in-out
          w-64 lg:translate-x-0
          ${menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          backgroundColor: 'hsl(var(--sidebar-bg))',
          borderRight: '1px solid hsl(var(--sidebar-border))',
          color: 'var(--sidebar-text)',
        }}
      >
        <div className="flex flex-col h-full">
          <div
            className="h-16 flex items-center gap-3 px-4"
            style={{ borderBottom: '1px solid hsl(var(--sidebar-border))' }}
          >
            <StickProLogo size="md" />
            <div>
              <span
                className="font-heading text-lg tracking-tight block leading-tight"
                style={{ color: 'var(--sidebar-text)' }}
              >
                Stick<span style={{ color: 'var(--sidebar-active-text)' }}>Pro</span>
              </span>
              <span
                className="text-xs"
                style={{ color: 'hsl(var(--sidebar-muted))' }}
              >
                {t('sidebar.tagline') !== 'sidebar.tagline'
                  ? t('sidebar.tagline')
                  : 'Gestão Desportiva'}
              </span>
            </div>
          </div>

          {isViewingAsAssociated && viewingAs && (
            <div className="px-3 py-2 bg-amber-500/20 border-b border-amber-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-amber-200">
                    A ver como responsável de
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-amber-200 hover:text-white hover:bg-amber-500/30"
                  onClick={handleSwitchToSelf}
                  disabled={switchingProfile}
                  data-testid="switch-to-self-btn"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Voltar
                </Button>
              </div>
              <p className="text-sm font-semibold text-amber-100 mt-1">
                {viewingAs.name}
              </p>
            </div>
          )}

          <div
            className="px-3 py-4"
            style={{ borderBottom: '1px solid hsl(var(--sidebar-border))' }}
          >
            {selectedTeam && !isAllTeamsSelected ? (
              <div className="flex items-center gap-3 px-2 py-2">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'hsla(var(--sidebar-accent), 0.2)' }}
                >
                  {selectedTeam.photo_url ? (
                    <img
                      src={selectedTeam.photo_url}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <Users
                      className="w-5 h-5"
                      style={{ color: 'var(--sidebar-active-text)' }}
                    />
                  )}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p
                    className="font-semibold text-sm truncate"
                    style={{ color: 'var(--sidebar-text)' }}
                  >
                    {selectedTeam.name}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'hsl(var(--sidebar-muted))' }}
                  >
                    {selectedTeam.category} • {selectedTeam.season}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-2 py-2">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'hsla(var(--sidebar-accent), 0.2)' }}
                >
                  <Building2
                    className="w-5 h-5"
                    style={{ color: 'var(--sidebar-active-text)' }}
                  />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p
                    className="font-semibold text-sm truncate"
                    style={{ color: 'var(--sidebar-text)' }}
                  >
                    {t('nav.myClub') || 'Meu Clube'}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'hsl(var(--sidebar-muted))' }}
                  >
                    Vista agregada do clube
                  </p>
                </div>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 py-4">
            <nav className="px-3 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive =
                  location.pathname === link.href ||
                  location.pathname.startsWith(`${link.href}/`);

                const testId = `nav-${link.href.replace(/\//g, '') || 'root'}`;

                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative sidebar-nav-link border-l-2 pl-[10px]"
                    style={
                      isActive
                        ? {
                            color: 'var(--sidebar-active-text, #22d3ee)',
                            borderLeftColor: 'var(--sidebar-active-text, #22d3ee)',
                            backgroundColor: 'hsla(var(--sidebar-accent), 0.1)',
                          }
                        : {
                            color: 'hsl(var(--sidebar-muted))',
                            borderLeftColor: 'transparent',
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'hsl(var(--sidebar-hover))';
                        e.currentTarget.style.color = 'var(--sidebar-text)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'hsl(var(--sidebar-muted))';
                      }
                    }}
                    data-testid={testId}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={isActive ? { color: 'var(--sidebar-active-text, #22d3ee)' } : {}}
                    />
                    <span className="font-medium text-sm">{link.label}</span>

                    {link.notificationCount > 0 && (
                      <span
                        className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full"
                        data-testid="notification-badge"
                      >
                        {link.notificationCount > 99 ? '99+' : link.notificationCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          <div
            className="p-3"
            style={{ borderTop: '1px solid hsl(var(--sidebar-border))' }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto py-3 rounded-lg"
                  style={{ color: 'var(--sidebar-text)' }}
                  data-testid="user-menu-sidebar"
                >
                  <Avatar
                    className={`h-9 w-9 mr-3 ${
                      isViewingAsAssociated ? 'ring-2 ring-amber-400' : ''
                    }`}
                  >
                    <AvatarImage src={user?.avatar_url} alt={displayName} />
                    <AvatarFallback
                      className="text-sm font-semibold"
                      style={{
                        backgroundColor: isViewingAsAssociated
                          ? '#f59e0b'
                          : 'hsl(var(--sidebar-accent))',
                        color: 'var(--sidebar-text)',
                      }}
                    >
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="text-left flex-1 min-w-0">
                    <p
                      className="font-semibold text-sm truncate"
                      style={{ color: 'var(--sidebar-text)' }}
                    >
                      {displayName}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: 'hsl(var(--sidebar-muted))' }}
                    >
                      {getRoleName(displayRole)}
                    </p>
                  </div>

                  <ChevronDown
                    className="w-4 h-4"
                    style={{ color: 'hsl(var(--sidebar-muted))' }}
                  />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-64 bg-slate-800 border-slate-700"
                align="end"
              >
                {otherProfiles.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-slate-400 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      Mudar Perfil
                    </DropdownMenuLabel>

                    {otherProfiles.map((profile, idx) => (
                      <DropdownMenuItem
                        key={`profile-${idx}`}
                        className={`cursor-pointer ${
                          profile.type === 'associated'
                            ? 'text-amber-300 hover:bg-amber-500/20'
                            : 'text-white hover:bg-slate-700'
                        }`}
                        onClick={() => handleSwitchProfile(profile)}
                        disabled={switchingProfile}
                        data-testid={`switch-profile-${profile.user_id}`}
                      >
                        {profile.type === 'associated' ? (
                          <Shield className="w-4 h-4 mr-2" />
                        ) : (
                          <Users className="w-4 h-4 mr-2" />
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            {profile.label || profile.user_name}
                          </p>
                          {profile.type === 'associated' && (
                            <p className="text-xs opacity-70">Como responsável</p>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}

                    <DropdownMenuSeparator className="bg-slate-700" />
                  </>
                )}

                <DropdownMenuItem
                  className="text-red-400 hover:bg-slate-700 cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('auth.logout') || 'Sair'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
