import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
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
  User,
  Trophy,
  ClipboardCheck,
  RefreshCw,
  Shield
} from 'lucide-react';
import { useState } from 'react';
import { getInitials, getRoleName } from '../../lib/utils';
import { toast } from 'sonner';

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

export function Sidebar({ teams = [], selectedTeam, onSelectTeam }) {
  const { 
    user, 
    logout, 
    isAuthenticated, 
    availableProfiles, 
    activeProfile, 
    viewingAs,
    isViewingAsAssociated,
    switchProfile,
    effectiveRole
  } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [switchingProfile, setSwitchingProfile] = useState(false);

  // Menu items based on selected team context - with translations
  const navLinks = [
    { href: '/dashboard', label: t('nav.home'), icon: Home },
    { href: '/calendar', label: t('nav.calendar'), icon: Calendar },
    { href: '/members', label: t('nav.members'), icon: Users },
    { href: '/championships', label: t('nav.championships'), icon: Trophy },
    { href: '/attendance', label: t('nav.attendance'), icon: ClipboardCheck },
    { href: '/stats', label: t('nav.stats'), icon: BarChart3 },
    { href: '/messages', label: t('nav.messages'), icon: MessageSquare },
    { href: '/settings', label: t('nav.settings'), icon: Settings },
  ];

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
    } catch (error) {
      toast.error('Erro ao mudar de perfil');
    } finally {
      setSwitchingProfile(false);
    }
  };

  const handleSwitchToSelf = async () => {
    const selfProfile = availableProfiles.find(p => p.type === 'self' && p.user_id === user?.id);
    if (selfProfile) {
      await handleSwitchProfile(selfProfile);
    }
  };

  if (!isAuthenticated) return null;

  // Display name - show viewed user if viewing as associated
  const displayName = viewingAs?.name || user?.name;
  const displayRole = viewingAs?.role || user?.role;

  // Filter profiles for switching (exclude current)
  const otherProfiles = availableProfiles.filter(p => {
    if (activeProfile?.type === 'self' && p.type === 'self' && p.user_id === user?.id) return false;
    if (activeProfile?.type === 'associated' && p.type === 'associated' && p.user_id === activeProfile?.user_id) return false;
    return true;
  });

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-border z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 ml-2">
          <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center flex-shrink-0">
            <span className="text-white font-heading text-sm font-bold">SP</span>
          </div>
          <span className="font-heading text-base text-foreground tracking-wide truncate">
            STICK PRO
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="relative h-9 w-9">
            <Bell className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-9 w-9"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {collapsed && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setCollapsed(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-slate-900 text-white z-50
        transition-transform duration-300 ease-in-out
        w-64 lg:translate-x-0
        ${collapsed ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center gap-3 px-4 border-b border-slate-700">
            <StickProLogo size="md" />
            <div>
              <span className="font-heading text-lg tracking-wide block leading-tight">
                STICK PRO
              </span>
              <span className="text-xs text-slate-400">Gestão de Hóquei</span>
            </div>
          </div>

          {/* Viewing As Banner */}
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
              <p className="text-sm font-semibold text-amber-100 mt-1">{viewingAs.name}</p>
            </div>
          )}

          {/* Team Selector */}
          {teams.length > 0 && (
            <div className="px-3 py-4 border-b border-slate-700">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between text-white hover:bg-slate-800 h-auto py-3"
                    data-testid="team-selector"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/20 rounded-sm flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm">
                          {selectedTeam?.name || 'Selecionar Equipa'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {selectedTeam?.category || 'Escolha uma equipa'}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700" align="start">
                  <DropdownMenuLabel className="text-slate-400">As Minhas Equipas</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  {teams.map(team => (
                    <DropdownMenuItem 
                      key={team.id}
                      onClick={() => onSelectTeam(team)}
                      className="text-white hover:bg-slate-700 cursor-pointer"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      <div>
                        <p className="font-medium">{team.name}</p>
                        <p className="text-xs text-slate-400">{team.category}</p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="px-3 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.href || location.pathname.startsWith(link.href + '/');
                const testId = `nav-${link.href.replace('/', '')}`;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setCollapsed(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors
                      ${isActive 
                        ? 'bg-primary text-white' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                    `}
                    data-testid={testId}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* User Menu */}
          <div className="p-3 border-t border-slate-700">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-white hover:bg-slate-800 h-auto py-3"
                  data-testid="user-menu-sidebar"
                >
                  <Avatar className={`h-9 w-9 mr-3 ${isViewingAsAssociated ? 'ring-2 ring-amber-400' : ''}`}>
                    <AvatarImage src={user?.avatar_url} alt={displayName} />
                    <AvatarFallback className={`${isViewingAsAssociated ? 'bg-amber-500' : 'bg-primary'} text-primary-foreground text-sm font-semibold`}>
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-sm truncate">{displayName}</p>
                    <p className="text-xs text-slate-400">{getRoleName(displayRole)}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 bg-slate-800 border-slate-700" align="end">
                {/* Profile switching section */}
                {otherProfiles.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-slate-400 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      Mudar Perfil
                    </DropdownMenuLabel>
                    {otherProfiles.map((profile, idx) => (
                      <DropdownMenuItem 
                        key={`profile-${idx}`}
                        className={`cursor-pointer ${profile.type === 'associated' ? 'text-amber-300 hover:bg-amber-500/20' : 'text-white hover:bg-slate-700'}`}
                        onClick={() => handleSwitchProfile(profile)}
                        disabled={switchingProfile}
                        data-testid={`switch-profile-${profile.user_id}`}
                      >
                        {profile.type === 'associated' ? (
                          <Shield className="w-4 h-4 mr-2" />
                        ) : (
                          <User className="w-4 h-4 mr-2" />
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
                
                <DropdownMenuItem asChild>
                  <Link to={`/players/${user?.id}`} className="text-white hover:bg-slate-700 cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    O Meu Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="text-white hover:bg-slate-700 cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Definições
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem 
                  className="text-red-400 hover:bg-slate-700 cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
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
