import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getInitials, getRoleName } from '../../lib/utils';
import { clubApi, teamsApi, usersApi } from '../../services/api';

// StickPro Logo Component
const StickProLogo = ({ size = 'md' }) => {
  const sizes = {
    sm: { box: 'w-8 h-8', text: 'text-sm' },
    md: { box: 'w-10 h-10', text: 'text-xl' },
    lg: { box: 'w-12 h-12', text: 'text-2xl' }
  };
  const s = sizes[size] || sizes.md;
  
  return (
    <div className={`${s.box} bg-primary rounded-sm flex items-center justify-center`}>
      <span className={`text-white font-heading ${s.text} font-bold`}>SP</span>
    </div>
  );
};

export function TopNavBar() {
  const { user, logout, isAuthenticated, hasAssociatedAccounts, availableProfiles } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [club, setClub] = useState(null);
  const [myTeams, setMyTeams] = useState([]);
  const [childrenTeams, setChildrenTeams] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchClub();
      fetchTeams();
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

  const fetchTeams = async () => {
    try {
      const response = await teamsApi.getAll();
      setMyTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
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

  const navItems = [
    {
      label: 'Meu Clube',
      icon: Building2,
      href: '/club',
      items: club ? [
        { label: club.name, href: '/club', description: 'Informações do clube' }
      ] : []
    },
    {
      label: 'Minhas Equipas',
      icon: Users,
      href: '/teams',
      items: myTeams.map(team => ({
        label: team.name,
        href: `/teams/${team.id}`,
        description: team.category
      }))
    },
    {
      label: 'Equipas dos Meus Filhos',
      icon: Baby,
      href: '/children-teams',
      show: hasAssociatedAccounts,
      items: childrenTeams.map(team => ({
        label: team.name,
        href: `/teams/${team.id}`,
        description: `${team.category} - ${team.childName}`
      }))
    },
    {
      label: 'Meu Perfil',
      icon: UserCircle,
      href: '/profile',
      items: []
    }
  ];

  if (!isAuthenticated) {
    return (
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <StickProLogo size="md" />
              <span className="font-heading text-xl text-foreground tracking-wide">
                STICK PRO
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
    <header className="bg-white border-b border-border sticky top-0 z-50" data-testid="top-nav-bar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Club Image */}
          <Link to="/dashboard" className="flex items-center gap-3">
            {club?.logo_url ? (
              <img 
                src={club.logo_url} 
                alt={club.name} 
                className="w-10 h-10 object-contain rounded-sm"
                data-testid="club-logo"
              />
            ) : (
              <StickProLogo size="md" />
            )}
            <span className="font-heading text-xl text-foreground tracking-wide hidden sm:block">
              {club?.name || 'STICK PRO'}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.filter(item => item.show !== false).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.href);
              
              if (item.items && item.items.length > 0) {
                return (
                  <DropdownMenu key={item.href}>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className={`flex items-center gap-2 ${isActive ? 'text-primary bg-primary/5' : ''}`}
                        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 bg-white">
                      <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {item.items.map((subItem, idx) => (
                        <DropdownMenuItem key={idx} asChild>
                          <Link to={subItem.href} className="flex flex-col items-start cursor-pointer">
                            <span className="font-medium">{subItem.label}</span>
                            {subItem.description && (
                              <span className="text-xs text-muted-foreground">{subItem.description}</span>
                            )}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                      {item.items.length === 0 && (
                        <DropdownMenuItem disabled>
                          <span className="text-muted-foreground">Nenhum item</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }

              return (
                <Button
                  key={item.href}
                  variant="ghost"
                  className={`flex items-center gap-2 ${isActive ? 'text-primary bg-primary/5' : ''}`}
                  asChild
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Link to={item.href}>
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
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
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <UserCircle className="w-4 h-4" />
                    Meu Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="w-4 h-4" />
                    Definições
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="flex items-center gap-2 text-destructive cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  Sair
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
            {navItems.filter(item => item.show !== false).map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.href} className="py-2">
                  <Link
                    to={item.href}
                    className="flex items-center gap-3 px-4 py-2 text-foreground hover:bg-muted rounded-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                  {item.items && item.items.length > 0 && (
                    <div className="ml-12 mt-1 space-y-1">
                      {item.items.map((subItem, idx) => (
                        <Link
                          key={idx}
                          to={subItem.href}
                          className="block px-4 py-1 text-sm text-muted-foreground hover:text-foreground"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {subItem.label}
                        </Link>
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
