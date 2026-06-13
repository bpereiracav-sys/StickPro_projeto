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
  PlusCircle,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { getInitials, getRoleName } from '../../lib/utils';
import { toast } from 'sonner';
import { dashboardApi } from '../../services/api';

const CUSTOM_LOGO_URL = '/stickpro-logo.png';

const StickProLogo = () => (
  <img
    src={CUSTOM_LOGO_URL}
    alt="StickPro"
    className="h-14 w-auto max-w-[240px] object-contain"
    data-testid="stick-pro-logo"
  />
);

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
  } = useAuth();

  const { t } = useLanguage();
  const { selectedTeam, isAllTeamsSelected } = useTeam();
  const permissions = usePermissions();

  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [switchingProfile, setSwitchingProfile] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState(0);

  const tr = (key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };

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

  const navSections = useMemo(() => {
    const sections = [
      {
        title: tr('sidebar.operations', 'Operações'),
        items: [
          { href: '/dashboard', label: tr('nav.home', 'Dashboard'), icon: Home, visible: true },
          { href: '/calendar', label: tr('nav.calendar', 'Calendário'), icon: Calendar, visible: true },
          {
            href: '/convocations',
            label: tr('nav.convocations', 'Convocatórias'),
            icon: ClipboardCheck,
            visible: true,
            notificationCount: pendingNotifications,
          },
          { href: '/messages', label: tr('nav.messages', 'Mensagens'), icon: MessageSquare, visible: true },
        ],
      },
      {
        title: tr('sidebar.sport', 'Desportivo'),
        items: [
          {
            href: '/my-teams',
            label: tr('nav.myTeams', 'Minhas Equipas'),
            icon: Users,
            visible: !permissions.isAdmin,
          },
          {
            href: '/teams',
            label: tr('nav.teams', 'Equipas'),
            icon: Users,
            visible: permissions.canManageTeam,
          },
          {
            href: '/members',
            label: tr('nav.members', 'Membros'),
            icon: Users,
            visible: permissions.hasPermission('view_team_members'),
          },
          { href: '/championships', label: tr('nav.championships', 'Competições'), icon: Trophy, visible: true },
          {
            href: '/attendance',
            label: tr('nav.attendance', 'Presenças'),
            icon: ClipboardCheck,
            visible: permissions.hasPermission('view_team_attendance'),
          },
          { href: '/stats', label: tr('nav.stats', 'Estatísticas'), icon: BarChart3, visible: true },
        ],
      },
      {
        title: tr('sidebar.management', 'Gestão'),
        items: [
          {
            href: '/payments',
            label: tr('nav.payments', 'Pagamentos'),
            icon: CreditCard,
            visible: permissions.isAdmin || permissions.isPlayer || permissions.isFamilyMember,
          },
          { href: '/library', label: tr('nav.library', 'Biblioteca'), icon: BookOpen, visible: true },
          { href: '/club', label: tr('nav.club', 'Clube'), icon: Building2, visible: permissions.isAdmin },
          { href: '/subscription', label: tr('nav.subscription', 'Subscrição'), icon: CreditCard, visible: permissions.isAdmin },
          { href: '/settings', label: tr('nav.settings', 'Definições'), icon: Settings, visible: true },
        ],
      },
    ];

    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.visible),
      }))
      .filter((section) => section.items.length > 0);
  }, [t, permissions, pendingNotifications]);

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
        <img
          src={CUSTOM_LOGO_URL}
          alt="StickPro"
          className="h-9 w-auto object-contain"
          data-testid="mobile-header-logo"
        />

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="relative h-9 w-9" style={{ color: 'var(--sidebar-text)' }}>
            <Bell className="w-5 h-5" />
            {pendingNotifications > 0 && (
              <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
            )}
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
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMenuOpen(false)} />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-50
          transition-transform duration-300 ease-in-out
          w-72 lg:translate-x-0
          ${menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          backgroundColor: 'hsl(var(--sidebar-bg))',
          borderRight: '1px solid hsl(var(--sidebar-border))',
          color: 'var(--sidebar-text)',
        }}
      >
        <div className="flex h-full flex-col">
          <div
            className="flex h-20 items-center px-5"
            style={{ borderBottom: '1px solid hsl(var(--sidebar-border))' }}
          >
            <StickProLogo />
          </div>

          {isViewingAsAssociated && viewingAs && (
            <div className="px-3 py-2 bg-amber-500/20 border-b border-amber-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-amber-200">A ver como responsável de</span>
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
              <p className="text-sm font-semibold text-amber-100 mt-1">{viewingAs.name}</p>
            </div>
          )}

          <div className="px-4 py-4">
            <div
              className="rounded-2xl border p-3"
              style={{
                borderColor: 'hsl(var(--sidebar-border))',
                backgroundColor: 'hsla(var(--sidebar-accent), 0.08)',
              }}
            >
              {selectedTeam && !isAllTeamsSelected ? (
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: 'hsla(var(--sidebar-accent), 0.2)' }}
                  >
                    {selectedTeam.photo_url ? (
                      <img src={selectedTeam.photo_url} alt="" className="w-11 h-11 rounded-xl object-cover" />
                    ) : (
                      <Users className="w-5 h-5" style={{ color: 'var(--sidebar-active-text)' }} />
                    )}
                  </div>

                  <div className="text-left flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--sidebar-text)' }}>
                      {selectedTeam.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'hsl(var(--sidebar-muted))' }}>
                      {selectedTeam.category} • {selectedTeam.season}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'hsla(var(--sidebar-accent), 0.2)' }}
                  >
                    <Building2 className="w-5 h-5" style={{ color: 'var(--sidebar-active-text)' }} />
                  </div>

                  <div className="text-left flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--sidebar-text)' }}>
                      {tr('nav.myClub', 'Meu Clube')}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(var(--sidebar-muted))' }}>
                      Vista agregada do clube
                    </p>
                  </div>
                </div>
              )}

              <div
                className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
                style={{
                  backgroundColor: 'hsla(var(--sidebar-accent), 0.12)',
                  color: 'hsl(var(--sidebar-muted))',
                }}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Clube operacional ativo
              </div>
            </div>

            <Button asChild className="mt-3 w-full rounded-xl font-semibold" data-testid="sidebar-create-event-btn">
              <Link to="/calendar" onClick={() => setMenuOpen(false)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Evento
              </Link>
            </Button>
          </div>

          <ScrollArea className="flex-1 px-3 pb-4">
            <nav className="space-y-5">
              {navSections.map((section) => (
                <div key={section.title}>
                  <p
                    className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em]"
                    style={{ color: 'hsl(var(--sidebar-muted))' }}
                  >
                    {section.title}
                  </p>

                  <div className="space-y-1">
                    {section.items.map((link) => {
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
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative sidebar-nav-link border-l-2 pl-[10px]"
                          style={
                            isActive
                              ? {
                                  color: 'var(--sidebar-active-text, #22d3ee)',
                                  borderLeftColor: 'var(--sidebar-active-text, #22d3ee)',
                                  backgroundColor: 'hsla(var(--sidebar-accent), 0.12)',
                                }
                              : {
                                  color: 'hsl(var(--sidebar-muted))',
                                  borderLeftColor: 'transparent',
                                }
                          }
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
                  </div>
                </div>
              ))}
            </nav>
          </ScrollArea>

          <div className="p-3" style={{ borderTop: '1px solid hsl(var(--sidebar-border))' }}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto py-3 rounded-xl"
                  style={{ color: 'var(--sidebar-text)' }}
                  data-testid="user-menu-sidebar"
                >
                  <Avatar className={`h-9 w-9 mr-3 ${isViewingAsAssociated ? 'ring-2 ring-amber-400' : ''}`}>
                    <AvatarImage src={user?.avatar_url} alt={displayName} />
                    <AvatarFallback
                      className="text-sm font-semibold"
                      style={{
                        backgroundColor: isViewingAsAssociated ? '#f59e0b' : 'hsl(var(--sidebar-accent))',
                        color: 'var(--sidebar-text)',
                      }}
                    >
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="text-left flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--sidebar-text)' }}>
                      {displayName}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(var(--sidebar-muted))' }}>
                      {getRoleName(displayRole)}
                    </p>
                  </div>

                  <ChevronDown className="w-4 h-4" style={{ color: 'hsl(var(--sidebar-muted))' }} />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-64 bg-slate-800 border-slate-700" align="end">
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
                          <p className="font-medium text-sm">{profile.label || profile.user_name}</p>
                          {profile.type === 'associated' && (
                            <p className="text-xs opacity-70">Como responsável</p>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}

                    <DropdownMenuSeparator className="bg-slate-700" />
                  </>
                )}

                <DropdownMenuItem className="text-red-400 hover:bg-slate-700 cursor-pointer" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {tr('auth.logout', 'Sair')}
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
