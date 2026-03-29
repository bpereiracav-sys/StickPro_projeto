import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTeam } from '../../context/TeamContext';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
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
  Menu,
  X,
  ChevronDown,
  Check
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getInitials, getRoleName } from '../../lib/utils';
import { clubApi, teamsApi, usersApi } from '../../services/api';

// Custom Logo Component with Theme Support
const CUSTOM_LOGO_URL = "https://customer-assets.emergentagent.com/job_roller-hockey-hub-1/artifacts/e8f8q5qy_logoBranco2.png";

const StickProLogo = ({ size = 'md' }) => {
  const sizes = {
    sm: { box: 'w-16 h-16' },
    md: { box: 'w-20 h-20' },
    lg: { box: 'w-24 h-24' }
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
  const { user, logout, isAuthenticated, hasAssociatedAccounts, availableProfiles } = useAuth();
  const { t } = useLanguage();
  const { teams, selectedTeam, selectTeam, selectAllTeams, isAllTeamsSelected } = useTeam();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [club, setClub] = useState(null);
  const [childrenTeams, setChildrenTeams] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchClub();
      if (hasAssociatedAccounts) {
        fetchChildrenTeams();
      }
    }
  }, [isAuthenticated, hasAssociatedAccounts]);

  const fetchClub = async () => {
    try {
      const response = await clubApi.getAll();
      if (response.data.length > 0) {
        setClub(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching club:', error);
    }
  };

  const fetchChildrenTeams = async () => {
    try {
      const response = await usersApi.getAssociated();
      const children = response.data;
      
      // Get teams for each child
      const allChildTeams = [];
      for (const child of children) {
        if (child.team_ids && child.team_ids.length > 0) {
          for (const teamId of child.team_ids) {
            try {
              const teamResponse = await teamsApi.getOne(teamId);
              allChildTeams.push({
                ...teamResponse.data,
                childName: child.name
              });
            } catch (e) {
              console.error('Error fetching team:', e);
            }
          }
        }
      }
      setChildrenTeams(allChildTeams);
    } catch (error) {
      console.error('Error fetching children teams:', error);
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

  // Check if user has children accounts
  const hasChildren = availableProfiles?.some(p => p.type === 'associated');
  
  // Check if user is admin
  const isAdmin = ['admin', 'gestor_desportivo'].includes(user?.role);

  // Mobile navigation items
  const navItems = [
    { 
      href: '/dashboard', 
      label: t('nav.home'), 
      icon: Building2,
      show: true 
    },
    { 
      href: '#', 
      label: t('nav.myClub'), 
      icon: Building2,
      show: true,
      onClick: handleSelectAllTeams
    },
    { 
      href: '#', 
      label: t('nav.myTeams'), 
      icon: Users,
      show: teams.length > 0,
      items: teams.map(team => ({
        href: '#',
        label: team.name,
        onClick: () => handleSelectTeam(team)
      }))
    },
    { 
      href: '/children', 
      label: t('nav.myChildren'), 
      icon: Baby,
      show: hasChildren 
    },
    { 
      href: '/profile', 
      label: t('nav.myProfile'), 
      icon: UserCircle,
      show: true 
    },
  ];

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
                <Link to="/login">Entrar</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Registar</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="hidden lg:block bg-white border-b border-border sticky top-0 z-50 lg:ml-64" data-testid="top-nav-bar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Club Image */}
          <Link to="/dashboard" className="flex items-center gap-3">
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
            <span className="font-heading text-xl text-foreground tracking-tight hidden sm:block">
              {club?.name || (<>Stick<span className="text-primary">Pro</span></>)}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {/* Meu Clube */}
            <Button
              variant="ghost"
              className={`flex items-center gap-2 ${isAllTeamsSelected ? 'text-primary bg-primary/5' : ''}`}
              onClick={handleSelectAllTeams}
              data-testid="nav-my-club"
            >
              <Building2 className="w-4 h-4" />
              {t('nav.myClub')}
              {isAllTeamsSelected && <Check className="w-3 h-3 ml-1" />}
            </Button>

            {/* Minhas Equipas */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={`flex items-center gap-2 ${selectedTeam ? 'text-primary bg-primary/5' : ''}`}
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
                      <div className="flex items-center gap-2">
                        {team.photo_url ? (
                          <img src={team.photo_url} alt="" className="w-6 h-6 rounded object-cover" />
                        ) : (
                          <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                            <Users className="w-3 h-3 text-primary" />
                          </div>
                        )}
                        <div>
                          <span className="font-medium">{team.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{team.category}</span>
                        </div>
                      </div>
                      {selectedTeam?.id === team.id && <Check className="w-4 h-4 text-primary" />}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>
                    <span className="text-muted-foreground">Sem equipas</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/my-teams" className="flex items-center gap-2 cursor-pointer">
                    <Users className="w-4 h-4" />
                    As Minhas Equipas
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/teams-management" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="w-4 h-4" />
                      Gerir Equipas
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Os Meus Filhos */}
            {hasChildren && (
              <Button
                variant="ghost"
                className="flex items-center gap-2"
                asChild
                data-testid="nav-children"
              >
                <Link to="/my-teams?tab=children">
                  <Baby className="w-4 h-4" />
                  Os Meus Filhos
                </Link>
              </Button>
            )}

            {/* Meu Perfil */}
            <Button
              variant="ghost"
              className={`flex items-center gap-2 ${location.pathname === '/profile' ? 'text-primary bg-primary/5' : ''}`}
              asChild
              data-testid="nav-my-profile"
            >
              <Link to="/profile">
                <UserCircle className="w-4 h-4" />
                {t('nav.myProfile')}
              </Link>
            </Button>
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full" data-testid="user-menu-btn">
                  <Avatar className="h-10 w-10 border-2 border-primary">
                    <AvatarImage src={user?.avatar_url || user?.profile?.photo_url} alt={user?.name} />
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
                    <p className="text-xs text-muted-foreground">{getRoleName(user?.role)}</p>
                  </div>
                </DropdownMenuLabel>
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

            {/* Mobile Menu Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden py-4 border-t border-border">
            {navItems.filter(item => item.show !== false).map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.href + index} className="py-2">
                  {item.onClick ? (
                    <button
                      className="flex items-center gap-3 px-4 py-2 text-foreground hover:bg-muted rounded-sm w-full text-left"
                      onClick={() => {
                        item.onClick();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  ) : (
                    <Link
                      to={item.href}
                      className="flex items-center gap-3 px-4 py-2 text-foreground hover:bg-muted rounded-sm"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  )}
                  {item.items && item.items.length > 0 && (
                    <div className="ml-12 mt-1 space-y-1">
                      {item.items.map((subItem, idx) => (
                        subItem.onClick ? (
                          <button
                            key={idx}
                            className="block px-4 py-1 text-sm text-muted-foreground hover:text-foreground w-full text-left"
                            onClick={() => {
                              subItem.onClick();
                              setMobileMenuOpen(false);
                            }}
                          >
                            {subItem.label}
                          </button>
                        ) : (
                          <Link
                            key={idx}
                            to={subItem.href}
                            className="block px-4 py-1 text-sm text-muted-foreground hover:text-foreground"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {subItem.label}
                          </Link>
                        )
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}

export default TopNavBar;
