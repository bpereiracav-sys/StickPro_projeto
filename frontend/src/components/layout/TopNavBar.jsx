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
  Plus,
  CalendarPlus,
  ClipboardList,
  Trophy,
  UserPlus,
  ShieldCheck,
  UserRoundCheck,
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
  const {
  user,
  logout,
  isAuthenticated,
  availableProfiles,
  activeProfile,
  switchProfile,
} = useAuth();

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

  const handleSwitchProfile = async (profile) => {
    try {
      await switchProfile(profile);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error switching profile:', error);
    }
  };
  
  const getProfileIcon = (profile) => {
    if (profile.type === 'associated') {
      return UserRoundCheck;
    }
  
    return ShieldCheck;
  };

  const getProfileDisplayRole = (profile) => {
    if (profile?.type === 'associated') {
      return tr('roles.player', 'Atleta');
    }
  
    return getRoleName(profile?.role);
  };  
  
  const activeProfileLabel =
    activeProfile?.label ||
    activeProfile?.description ||
    getRoleName(user?.role);

  const profileTargetId =
    activeProfile?.associated_user_id ||
    activeProfile?.user_id ||
    activeProfile?.id ||
    user?.id;
  
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
    : club?.name || tr('nav.myClub', 'Meu Clube');

  const activeContextSubtitle = selectedTeam
    ? `${selectedTeam.category || 'Equipa'}${selectedTeam.season ? ` • ${selectedTeam.season}` : ''}`
    : tr('topnav.clubOverview', 'Gestão integrada do Clube');

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
    <>
      <header
        className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950 text-white lg:hidden"
        data-testid="mobile-top-nav-bar"
      >
        <div className="flex h-16 items-center justify-between gap-3 px-4">
          <Link
            to="/dashboard"
            className="flex shrink-0 items-center"
            data-testid="mobile-topnav-logo-dashboard"
            aria-label="Dashboard"
          >
            <img
              src="/stickpro-logo.png"
              alt="StickPro"
              className="h-9 w-auto max-w-[118px] object-contain"
              data-testid="mobile-stick-pro-logo"
            />
          </Link>

          <Link
            to="/dashboard"
            className="min-w-0 flex-1 px-2 text-center"
            data-testid="mobile-topnav-profile-dashboard"
          >
            <p className="truncate font-heading text-base font-bold leading-tight tracking-tight text-white">
              {activeProfile?.user_name || activeProfile?.label || user?.name || 'StickPro'}
            </p>
            <p className="truncate text-[11px] font-medium leading-tight text-slate-300">
              {activeProfile?.type === 'associated'
                ? tr('roles.player', 'Atleta')
                : activeProfileLabel}
            </p>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full text-white hover:bg-white/10 hover:text-white"
              asChild
              data-testid="mobile-topnav-notifications"
            >
              <Link to="/convocations" aria-label={tr('nav.notifications', 'Notificações')}>
                <Bell className="h-5 w-5" />
                {pendingNotifications > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {pendingNotifications > 99 ? '99+' : pendingNotifications}
                  </span>
                )}
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-11 w-11 rounded-full p-0 hover:bg-white/10"
                  data-testid="mobile-user-menu-btn"
                  aria-label={tr('nav.myProfile', 'Meu Perfil')}
                >
                  <Avatar className="h-10 w-10 border-2 border-white/80">
                    <AvatarImage
                      src={activeProfile?.avatar_url || user?.avatar_url || user?.profile?.photo_url}
                      alt={activeProfile?.user_name || user?.name}
                    />
                    <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                      {getInitials(activeProfile?.user_name || activeProfile?.label || user?.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-72 bg-white" align="end">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border-2 border-primary">
                      <AvatarImage
                        src={activeProfile?.avatar_url || user?.avatar_url || user?.profile?.photo_url}
                        alt={activeProfile?.user_name || user?.name}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {getInitials(activeProfile?.user_name || activeProfile?.label || user?.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {activeProfile?.user_name || activeProfile?.label || user?.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {activeProfileLabel}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {availableProfiles?.length > 1 && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      {tr('profiles.switchProfile', 'Mudar perfil')}
                    </DropdownMenuLabel>

                    {availableProfiles.map((profile) => {
                      const ProfileIcon = getProfileIcon(profile);

                      const isActive =
                        activeProfile?.profile_id === profile.profile_id ||
                        (
                          activeProfile?.type === profile.type &&
                          activeProfile?.user_id === profile.user_id &&
                          activeProfile?.role === profile.role
                        );

                      return (
                        <DropdownMenuItem
                          key={
                            profile.profile_id ||
                            `${profile.type}-${profile.user_id}-${profile.role}`
                          }
                          onClick={() => handleSwitchProfile(profile)}
                          className="flex cursor-pointer items-center justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                              <ProfileIcon className="h-4 w-4 text-primary" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {profile.label || profile.user_name}
                              </p>

                              <p className="truncate text-xs text-muted-foreground">
                                {profile.type === 'associated'
                                  ? getProfileDisplayRole(profile)
                                  : profile.description ||
                                    profile.role_name ||
                                    getProfileDisplayRole(profile)}
                              </p>
                            </div>
                          </div>

                          {isActive && (
                            <Check className="h-4 w-4 shrink-0 text-primary" />
                          )}
                        </DropdownMenuItem>
                      );
                    })}

                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem
                  onClick={() =>
                    navigate('/profile', {
                      state: {
                        profileUserId: profileTargetId,
                      },
                    })
                  }
                  className="cursor-pointer"
                >
                  <UserCircle className="mr-2 h-4 w-4" />
                  {myProfileLabel}
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

                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {tr('settings.language', 'Idioma')}
                </DropdownMenuLabel>

                {LANGUAGES.map((item) => (
                  <DropdownMenuItem
                    key={item.code}
                    onClick={() => handleLanguageChange(item.code)}
                    className="flex cursor-pointer items-center justify-between"
                    data-testid={`mobile-language-${item.code}`}
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

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="flex cursor-pointer items-center gap-2 text-destructive"
                  onClick={handleLogout}
                  data-testid="mobile-logout-menu-btn"
                >
                  <LogOut className="h-4 w-4" />
                  {tr('auth.logout', 'Sair')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <header
        className="hidden lg:block sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:ml-72"
        data-testid="top-nav-bar"
      >
        <div className="px-6">
          <div className="flex h-16 items-center justify-between gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex h-12 min-w-[260px] max-w-[380px] items-center justify-between gap-3 rounded-2xl px-3 hover:bg-slate-50"
                data-testid="topnav-club-selector"
              >
                <span className="flex min-w-0 items-center gap-3">
                  {club?.logo_url ? (
                    <img
                      src={club.logo_url}
                      alt={club.name}
                      className="h-10 w-10 shrink-0 rounded-xl object-contain"
                      data-testid="club-logo"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <span className="text-sm font-bold text-primary">
                        {getInitials(club?.name || 'StickPro')}
                      </span>
                    </div>
                  )}

                  <span className="min-w-0 text-left">
                    <span className="block truncate font-heading text-base font-semibold tracking-tight text-slate-950">
                      {club?.name || 'StickPro'}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {activeContextSubtitle}
                    </span>
                  </span>
                </span>

                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-80 bg-white" align="start">
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
                      {club?.name || tr('nav.myClub', 'Meu Clube')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tr('topnav.clubOverview', 'Gestão integrada do Clube')}
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

          <div className="flex flex-1 items-center justify-center">
            <div className="relative w-full max-w-[380px]">
  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

  <input
    type="text"
    className="h-10 w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
    data-testid="topnav-search"
    placeholder={tr('topnav.searchPlaceholder', 'Pesquisar atleta, equipa, evento...')}
  />
</div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="h-10 rounded-full px-6 font-medium"
                  data-testid="topnav-new-button"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {tr('topnav.new', 'Novo')}
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-56 bg-white" align="end">
                <DropdownMenuLabel>
                  {tr('topnav.createNew', 'Criar novo')}
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link to="/calendar" className="cursor-pointer">
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    {tr('calendar.newEvent', 'Novo Evento')}
                  </Link>
                </DropdownMenuItem>

               <DropdownMenuItem asChild>
                  <Link to="/convocations" className="cursor-pointer">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    {tr('dashboard.newConvocation', 'Nova Convocatória')}
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/competitions" className="cursor-pointer">
                    <Trophy className="mr-2 h-4 w-4" />
                   {tr('championships.newGame', 'Novo Jogo')}
                  </Link>
                </DropdownMenuItem>

                {(permissions.canManageTeam || permissions.canManageClub || permissions.isAdmin) && (
                  <DropdownMenuItem asChild>
                    <Link to="/members" className="cursor-pointer">
                      <UserPlus className="mr-2 h-4 w-4" />
                      {tr('members.newMember', 'Novo Atleta')}
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

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
                      src={activeProfile?.avatar_url || user?.avatar_url || user?.profile?.photo_url}
                      alt={activeProfile?.user_name || user?.name}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {getInitials(activeProfile?.user_name || activeProfile?.label || user?.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-60 bg-white" align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {activeProfileLabel}
                    </p>
                  </div>
                </DropdownMenuLabel>
              
                <DropdownMenuSeparator />
              
                {availableProfiles?.length > 1 && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      {tr('profiles.switchProfile', 'Mudar perfil')}
                    </DropdownMenuLabel>
              
                    {availableProfiles.map((profile) => {
                      const ProfileIcon = getProfileIcon(profile);
              
                      const isActive =
                        activeProfile?.profile_id === profile.profile_id ||
                        (
                          activeProfile?.type === profile.type &&
                          activeProfile?.user_id === profile.user_id &&
                          activeProfile?.role === profile.role
                        );
              
                      return (
                        <DropdownMenuItem
                          key={
                            profile.profile_id ||
                            `${profile.type}-${profile.user_id}-${profile.role}`
                          }
                          onClick={() => handleSwitchProfile(profile)}
                          className="flex cursor-pointer items-center justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                              <ProfileIcon className="h-4 w-4 text-primary" />
                            </div>
              
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {profile.label || profile.user_name}
                              </p>
              
                              <p className="truncate text-xs text-muted-foreground">
                                {profile.type === 'associated'
                                  ? getProfileDisplayRole(profile)
                                  : profile.description ||
                                    profile.role_name ||
                                    getProfileDisplayRole(profile)}
                              </p>
                            </div>
                          </div>
              
                          {isActive && (
                            <Check className="h-4 w-4 shrink-0 text-primary" />
                          )}
                        </DropdownMenuItem>
                      );
                    })}
              
                    <DropdownMenuSeparator />
                  </>
                )}
              
                <DropdownMenuItem
                  onClick={() =>
                    navigate('/profile', {
                      state: {
                        profileUserId: profileTargetId,
                      },
                    })
                  }
                  className="cursor-pointer"
                >
                  <UserCircle className="mr-2 h-4 w-4" />
                  {myProfileLabel}
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
    </>
  );
}

export default TopNavBar;
