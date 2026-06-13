import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTeam } from '../../context/TeamContext';
import { usePermissions } from '../../context/PermissionsContext';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Building2,
  Users,
  UserCircle,
  LogOut,
  Settings,
  ChevronDown,
  Check,
  Bell,
  Search,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { getInitials, getRoleName } from '../../lib/utils';
import { clubApi, dashboardApi } from '../../services/api';

const LANGUAGES = [
  { code: 'pt', label: 'PT', name: 'Português', flag: '🇵🇹' },
  { code: 'en', label: 'EN', name: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'ES', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'FR', name: 'Français', flag: '🇫🇷' },
  { code: 'it', label: 'IT', name: 'Italiano', flag: '🇮🇹' },
];

export function TopNavBar() {
  const { user, logout, isAuthenticated, availableProfiles } = useAuth();

  const languageContext = useLanguage();
  const { t, language = 'pt' } = languageContext;

  const { teams, selectedTeam, selectTeam, selectAllTeams, isAllTeamsSelected } = useTeam();
  const permissions = usePermissions();

  const location = useLocation();
  const navigate = useNavigate();

  const [club, setClub] = useState(null);
  const [pendingNotifications, setPendingNotifications] = useState(0);

  const tr = (key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchClub();
      fetchNotifications();

      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }

    setClub(null);
    setPendingNotifications(0);
  }, [isAuthenticated]);

  const fetchClub = async () => {
    try {
      const response = await clubApi.getAll();

      if (response?.data?.length > 0) {
        setClub(response.data[0]);
      } else {
        setClub(null);
      }
    } catch (error) {
      console.error('Error fetching club:', error);
      setClub(null);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await dashboardApi.get();
      const pendingCount = response.data?.pending_convocations?.length || 0;
      setPendingNotifications(pendingCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setPendingNotifications(0);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSelectTeam = (team) => {
    selectTeam(team);
    navigate('/dashboard');
  };

  const handleSelectAllTeams = () => {
    selectAllTeams();
    navigate('/dashboard');
  };

  const handleLanguageChange = (nextLanguage) => {
    const changeLanguage =
      languageContext.setLanguage ||
      languageContext.changeLanguage ||
      languageContext.updateLanguage ||
      languageContext.setLocale;

    if (typeof changeLanguage === 'function') {
      changeLanguage(nextLanguage);
      return;
    }

    localStorage.setItem('language', nextLanguage);
    window.location.reload();
  };

  const hasChildren = useMemo(() => {
    return availableProfiles?.some((profile) => profile.type === 'associated');
  }, [availableProfiles]);

  const activeLanguage =
    LANGUAGES.find((item) => item.code === language) || LANGUAGES[0];

  const activeContextLabel = selectedTeam
    ? selectedTeam.name
    : tr('nav.myClub', 'Meu Clube');

  const activeContextSubtitle = selectedTeam
    ? `${selectedTeam.category || 'Equipa'}${selectedTeam.season ? ` • ${selectedTeam.season}` : ''}`
    : club?.name || 'Gestão integrada do Clube';

  const teamsLabel = tr('nav.teams', 'Equipas');
  const myTeamsLabel = tr('nav.myTeams', 'As Minhas Equipas');
  const myProfileLabel = tr('nav.myProfile', 'Meu Perfil');
  const settingsLabel = tr('nav.settings', 'Definições');

  if (!isAuthenticated) {
    return (
      <header className="sticky top-0 z-50 border-b border-border bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/stickpro-logo.png"
                alt="StickPro"
                className="h-10 w-auto max-w-[180px] object-contain"
                data-testid="stick-pro-logo"
              />
            </Link>

            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link to="/login">{tr('auth.login', 'Entrar')}</Link>
              </Button>

              <Button asChild>
                <Link to="/register">{tr('auth.register', 'Registar')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className="hidden lg:block sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:ml-72"
      data-testid="top-nav-bar"
    >
      <div className="px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            to="/dashboard"
            className="flex min-w-[300px] max-w-[440px] items-center gap-3"
          >
            {club?.logo_url ? (
              <img
                src={club.logo_url}
                alt={club.name}
                className="h-10 w-10 rounded-xl object-contain"
                data-testid="club-logo"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate font-heading text-lg font-semibold tracking-tight text-slate-950">
                {club?.name || 'StickPro'}
              </p>
              <p className="truncate text-xs text-slate-500">
                {selectedTeam
                  ? activeContextSubtitle
                  : tr('topnav.clubOverview', 'Gestão integrada do Clube')}
              </p>
            </div>
          </Link>

          <div className="flex flex-1 items-center justify-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 min-w-[240px] justify-between rounded-full border-slate-200 bg-slate-50/80 px-4 hover:bg-slate-100"
                  data-testid="topnav-context-selector"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {selectedTeam ? (
                      <Users className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <Building2 className="h-4 w-4 shrink-0 text-primary" />
                    )}

                    <span className="truncate font-medium text-slate-800">
                      {activeContextLabel}
                    </span>
                  </span>

                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-72 bg-white" align="center">
                <DropdownMenuLabel>
                  {tr('topnav.activeContext', 'Contexto ativo')}
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleSelectAllTeams}
                  className="flex cursor-pointer items-center justify-between"
                  data-testid="topnav-select-club"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>

                    <div>
                      <p className="text-sm font-medium">
                        {tr('nav.myClub', 'Meu Clube')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {club?.name || tr('topnav.clubOverview', 'Gestão integrada do Clube')}
                      </p>
                    </div>
                  </div>

                  {isAllTeamsSelected && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {myTeamsLabel}
                </DropdownMenuLabel>

                {teams?.length > 0 ? (
                  teams.map((team) => (
                    <DropdownMenuItem
                      key={team.id}
                      onClick={() => handleSelectTeam(team)}
                      className="flex cursor-pointer items-center justify-between"
                      data-testid={`topnav-team-${team.id}`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {team.photo_url ? (
                          <img
                            src={team.photo_url}
                            alt=""
                            className="h-8 w-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{team.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {team.category}
                          </p>
                        </div>
                      </div>

                      {selectedTeam?.id === team.id && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>
                    <span className="text-muted-foreground">
                      {tr('common.noData', 'Sem equipas')}
                    </span>
                  </DropdownMenuItem>
                )}

                {permissions.canManageTeam && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/teams" className="flex cursor-pointer items-center gap-2">
                        <Settings className="h-4 w-4" />
                        {teamsLabel}
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              className="h-10 min-w-[300px] justify-start rounded-full border-slate-200 bg-white px-4 text-slate-400 hover:bg-slate-50"
              data-testid="topnav-search"
              type="button"
            >
              <Search className="mr-2 h-4 w-4" />
              {tr('topnav.searchPlaceholder', 'Pesquisar atleta, equipa, evento...')}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full"
              asChild
              data-testid="topnav-notifications"
            >
              <Link to="/convocations">
                <Bell className="h-5 w-5" />
                {pendingNotifications > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {pendingNotifications > 99 ? '99+' : pendingNotifications}
                  </span>
                )}
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 rounded-full px-3"
                  data-testid="topnav-language-selector"
                >
                  <span className="mr-1">{activeLanguage.flag}</span>
                  <span className="text-sm font-semibold">{activeLanguage.label}</span>
                  <ChevronDown className="ml-1 h-4 w-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-48 bg-white" align="end">
                <DropdownMenuLabel>
                  {tr('settings.language', 'Idioma')}
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {LANGUAGES.map((item) => (
                  <DropdownMenuItem
                    key={item.code}
                    onClick={() => handleLanguageChange(item.code)}
                    className="flex cursor-pointer items-center justify-between"
                    data-testid={`language-${item.code}`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{item.flag}</span>
                      <span>{item.name}</span>
                    </span>

                    {activeLanguage.code === item.code && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                  data-testid="user-menu-btn"
                >
                  <Avatar className="h-10 w-10 border-2 border-primary">
                    <AvatarImage
                      src={user?.avatar_url || user?.profile?.photo_url}
                      alt={user?.name}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-60 bg-white" align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getRoleName(user?.role)}
                    </p>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <UserCircle className="mr-2 h-4 w-4" />
                    {myProfileLabel}
                  </Link>
                </DropdownMenuItem>

                {(permissions.isAdmin || permissions.canManageClub) && (
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      {settingsLabel}
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="flex cursor-pointer items-center gap-2 text-destructive"
                  onClick={handleLogout}
                  data-testid="logout-menu-btn"
                >
                  <LogOut className="h-4 w-4" />
                  {tr('auth.logout', 'Sair')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}

export default TopNavBar;
