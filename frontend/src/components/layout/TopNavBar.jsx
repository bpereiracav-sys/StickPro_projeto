import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
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
  Baby,
  UserCircle,
  LogOut,
  Settings,
  ChevronDown,
  Check,
} from 'lucide-react';
import { getInitials, getRoleName } from '../../lib/utils';
import { clubApi } from '../../services/api';

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
      className={`${s.box} object-contain`}
      data-testid="stick-pro-logo"
    />
  );
};

export function TopNavBar() {
  const { user, logout, isAuthenticated, availableProfiles } = useAuth();
  const { t } = useLanguage();
  const { teams, selectedTeam, selectTeam, selectAllTeams, isAllTeamsSelected } = useTeam();
  const permissions = usePermissions();

  const location = useLocation();
  const navigate = useNavigate();

  const [club, setClub] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setClub(null);
      return;
    }

    const fetchClub = async () => {
      try {
        const response = await clubApi.getAll();
        setClub(response.data?.length > 0 ? response.data[0] : null);
      } catch (error) {
        console.error('Error fetching club:', error);
        setClub(null);
      }
    };

    fetchClub();
  }, [isAuthenticated]);

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

  const hasChildren = useMemo(() => {
    return availableProfiles?.some((profile) => profile.type === 'associated');
  }, [availableProfiles]);

  const teamsLabel = t('nav.teams') !== 'nav.teams' ? t('nav.teams') : 'Equipas';
  const childrenLabel =
    t('nav.childrenTeams') !== 'nav.childrenTeams'
      ? t('nav.childrenTeams')
      : 'Os Meus Filhos';

  if (!isAuthenticated) {
    return (
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <StickProLogo size="md" />
              <span className="font-heading text-xl text-foreground tracking-tight">
                Stick<span className="text-primary">Pro</span>
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link to="/login">{t('auth.login')}</Link>
              </Button>
              <Button asChild>
                <Link to="/register">{t('auth.register')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className="hidden lg:block bg-white border-b border-border sticky top-0 z-50 lg:ml-64"
      data-testid="top-nav-bar"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center gap-3 min-w-0">
            {club?.logo_url ? (
              <img
                src={club.logo_url}
                alt={club.name}
                className="w-10 h-10 object-contain rounded-lg"
                data-testid="club-logo"
              />
            ) : (
              <StickProLogo size="md" />
            )}

            <span className="font-heading text-xl text-foreground tracking-tight hidden sm:block truncate">
              {club?.name || (
                <>
                  Stick<span className="text-primary">Pro</span>
                </>
              )}
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            <Button
              variant="ghost"
              className={`flex items-center gap-2 ${
                isAllTeamsSelected ? 'text-primary bg-primary/5' : ''
              }`}
              onClick={handleSelectAllTeams}
              data-testid="nav-my-club"
            >
              <Building2 className="w-4 h-4" />
              {t('nav.myClub')}
              {isAllTeamsSelected && <Check className="w-3 h-3 ml-1" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`flex items-center gap-2 ${
                    selectedTeam ? 'text-primary bg-primary/5' : ''
                  }`}
                  data-testid="nav-my-teams"
                >
                  <Users className="w-4 h-4" />
                  {selectedTeam ? selectedTeam.name : t('nav.myTeams')}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-64 bg-white">
                <DropdownMenuLabel>{t('nav.myTeams')}</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {teams.length > 0 ? (
                  teams.map((team) => (
                    <DropdownMenuItem
                      key={team.id}
                      onClick={() => handleSelectTeam(team)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {team.photo_url ? (
                          <img
                            src={team.photo_url}
                            alt=""
                            className="w-6 h-6 rounded object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                            <Users className="w-3 h-3 text-primary" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <span className="font-medium truncate block">{team.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {team.category}
                          </span>
                        </div>
                      </div>

                      {selectedTeam?.id === team.id && (
                        <Check className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>
                    <span className="text-muted-foreground">
                      {t('common.noData') || 'Sem equipas'}
                    </span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link to="/my-teams" className="flex items-center gap-2 cursor-pointer">
                    <Users className="w-4 h-4" />
                    {t('nav.myTeams')}
                  </Link>
                </DropdownMenuItem>

                {permissions.canManageTeam && (
                  <DropdownMenuItem asChild>
                    <Link to="/teams" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="w-4 h-4" />
                      {teamsLabel}
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {hasChildren && (
              <Button
                variant="ghost"
                className="flex items-center gap-2"
                asChild
                data-testid="nav-children"
              >
                <Link to="/children">
                  <Baby className="w-4 h-4" />
                  {childrenLabel}
                </Link>
              </Button>
            )}

            <Button
              variant="ghost"
              className={`flex items-center gap-2 ${
                location.pathname === '/profile' ? 'text-primary bg-primary/5' : ''
              }`}
              asChild
              data-testid="nav-my-profile"
            >
              <Link to="/profile">
                <UserCircle className="w-4 h-4" />
                {t('nav.myProfile')}
              </Link>
            </Button>
          </nav>

          <div className="flex items-center gap-3">
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

              <DropdownMenuContent className="w-56 bg-white" align="end">
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
                    <UserCircle className="w-4 h-4 mr-2" />
                    {t('nav.myProfile')}
                  </Link>
                </DropdownMenuItem>

                {permissions.isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      {t('nav.settings')}
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="flex items-center gap-2 text-destructive cursor-pointer"
                  onClick={handleLogout}
                  data-testid="logout-menu-btn"
                >
                  <LogOut className="w-4 h-4" />
                  {t('auth.logout')}
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
