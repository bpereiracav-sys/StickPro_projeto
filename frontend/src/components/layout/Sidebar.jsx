import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  User,
  Trophy,
  ClipboardCheck
} from 'lucide-react';
import { useState } from 'react';
import { getInitials, getRoleName } from '../../lib/utils';

export function Sidebar({ teams = [], selectedTeam, onSelectTeam }) {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  // Menu items based on selected team context
  const navLinks = [
    { href: '/dashboard', label: 'Início', icon: Home },
    { href: '/calendar', label: 'Calendário', icon: Calendar },
    { href: '/members', label: 'Membros', icon: Users },
    { href: '/championships', label: 'Campeonatos', icon: Trophy },
    { href: '/attendance', label: 'Presenças', icon: ClipboardCheck },
    { href: '/stats', label: 'Estatísticas', icon: BarChart3 },
    { href: '/messages', label: 'Mensagens', icon: MessageSquare },
    { href: '/settings', label: 'Definições', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-border z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
            <span className="text-white font-heading text-sm">RH</span>
          </div>
          <span className="font-heading text-lg text-foreground tracking-wide">
            ROLLER HOCKEY
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
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
            <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center">
              <span className="text-white font-heading text-xl">RH</span>
            </div>
            <div>
              <span className="font-heading text-lg tracking-wide block leading-tight">
                ROLLER HOCKEY
              </span>
              <span className="text-xs text-slate-400">HUB</span>
            </div>
          </div>

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
                    data-testid={`nav-${link.label.toLowerCase().replace('í', 'i').replace('ã', 'a').replace('ç', 'c')}`}
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
                  <Avatar className="h-9 w-9 mr-3">
                    <AvatarImage src={user?.avatar_url} alt={user?.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-sm truncate">{user?.name}</p>
                    <p className="text-xs text-slate-400">{getRoleName(user?.role)}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700" align="end">
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
