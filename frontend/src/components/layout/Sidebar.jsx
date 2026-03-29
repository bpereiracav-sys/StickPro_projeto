import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTeam } from '../../context/TeamContext';
import { useTheme } from '../../context/ThemeContext';
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
  Shield,
  BookOpen,
  Building2,
  CreditCard
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getInitials, getRoleName } from '../../lib/utils';
import { toast } from 'sonner';
import { dashboardApi } from '../../services/api';

// Custom Logo URL - Green transparent logo that adapts to themes
const CUSTOM_LOGO_URL = "https://customer-assets.emergentagent.com/job_roller-hockey-hub-1/artifacts/6xtd360b_logoVerdTransp.png";

// Theme-aware Logo Component - uses CSS filters to adapt colors
const StickProLogo = ({ size = 'md', isDark = false }) => {
  const sizes = {
    sm: { box: 'w-16 h-16' },
    md: { box: 'w-20 h-20' },
    lg: { box: 'w-24 h-24' }
  };
  const s = sizes[size] || sizes.md;
  
  // In dark mode: invert and adjust hue to make it brighter/lighter
  // In light mode: keep original green
  const filterStyle = isDark 
    ? 'brightness(1.5) saturate(1.2)' // Brighten for dark backgrounds
    : 'none';
  
  return (
    <img 
      src={CUSTOM_LOGO_URL} 
      alt="Logo" 
      className={`${s.box} object-contain transition-all duration-300`}
      style={{ filter: filterStyle }}
      data-testid="stick-pro-logo"
    />
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
  const { selectedTeam: contextSelectedTeam, isAllTeamsSelected } = useTeam();
  const { theme } = useTheme();
  const isDarkTheme = theme?.mode === 'dark';
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switchingProfile, setSwitchingProfile] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState(0);

  // Use context selected team if available
  const activeTeam = contextSelectedTeam || selectedTeam;

  // Fetch pending notifications count
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
      // Refresh notifications every 60 seconds
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Menu items based on selected team context - with translations
  const navLinks = [
    { href: '/dashboard', label: t('nav.home'), icon: Home, notificationCount: pendingNotifications },
    { href: '/calendar', label: t('nav.calendar'), icon: Calendar },
    { href: '/members', label: t('nav.members'), icon: Users },
    { href: '/championships', label: t('nav.championships'), icon: Trophy },
    { href: '/attendance', label: t('nav.attendance'), icon: ClipboardCheck },
    { href: '/stats', label: t('nav.stats'), icon: BarChart3 },
    { href: '/payments', label: 'Pagamentos', icon: CreditCard },
    { href: '/library', label: 'Biblioteca', icon: BookOpen },
    { href: '/messages', label: t('nav.messages'), icon: MessageSquare },
    { href: '/club', label: t('nav.club') || 'Clube', icon: Building2, adminOnly: true },
    { href: '/subscription', label: t('nav.subscription') || 'Subscrição', icon: CreditCard, adminOnly: true },
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
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 border-b border-slate-800 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 ml-2">
          <img 
            src={CUSTOM_LOGO_URL} 
            alt="Logo" 
            className="w-10 h-10 object-contain flex-shrink-0"
            style={{ filter: 'brightness(1.5) saturate(1.2)' }}
            data-testid="mobile-header-logo"
          />
          <span className="font-heading text-base text-white tracking-tight">
            Stick<span className="text-cyan-400">Pro</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="relative h-9 w-9 text-white hover:bg-slate-800">
            <Bell className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-9 w-9 text-white hover:bg-slate-800"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-slate-900 text-white z-50
        transition-transform duration-300 ease-in-out
        w-64 lg:translate-x-0 border-r border-slate-800
        ${menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center gap-3 px-4 border-b border-slate-800">
            <StickProLogo size="md" isDark={isDarkTheme} />
            <div>
              <span className="font-heading text-lg tracking-tight block leading-tight text-white">
                Stick<span className="text-cyan-400">Pro</span>
              </span>
              <span className="text-xs text-slate-400">Gestão Desportiva</span>
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

          {/* Team Selector - Only show when a specific team is selected (not "My Club" mode) */}
          {activeTeam && !isAllTeamsSelected && (
            <div className="px-3 py-4 border-b border-slate-800">
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                  {activeTeam.photo_url ? (
                    <img src={activeTeam.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <Users className="w-5 h-5 text-cyan-400" />
                  )}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-semibold text-sm text-white truncate">
                    {activeTeam.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {activeTeam.category} • {activeTeam.season}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="px-3 space-y-1">
              {navLinks.map((link) => {
                // Skip admin-only links for non-admin users
                if (link.adminOnly && effectiveRole !== 'admin') {
                  return null;
                }
                const Icon = link.icon;
                const isActive = location.pathname === link.href || location.pathname.startsWith(link.href + '/');
                const testId = `nav-${link.href.replace('/', '')}`;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative
                      ${isActive 
                        ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400 pl-[10px]' 
                        : 'text-slate-300 hover:bg-slate-800/50 hover:text-white border-l-2 border-transparent pl-[10px]'}
                    `}
                    data-testid={testId}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : ''}`} />
                    <span className="font-medium text-sm">{link.label}</span>
                    {/* Notification Badge */}
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

          {/* User Menu */}
          <div className="p-3 border-t border-slate-800">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-white hover:bg-slate-800 h-auto py-3 rounded-lg"
                  data-testid="user-menu-sidebar"
                >
                  <Avatar className={`h-9 w-9 mr-3 ${isViewingAsAssociated ? 'ring-2 ring-amber-400' : ''}`}>
                    <AvatarImage src={user?.avatar_url} alt={displayName} />
                    <AvatarFallback className={`${isViewingAsAssociated ? 'bg-amber-500' : 'bg-cyan-500'} text-white text-sm font-semibold`}>
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
