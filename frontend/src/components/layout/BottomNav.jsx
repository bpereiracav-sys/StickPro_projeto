import { Link, useLocation } from 'react-router-dom';
import { Calendar, MessageSquare, Users, BarChart3, User } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { href: '/calendar', label: 'Calendário', icon: Calendar },
  { href: '/messages', label: 'Mensagens', icon: MessageSquare },
  { href: '/members', label: 'Membros', icon: Users },
  { href: '/stats', label: 'Estatísticas', icon: BarChart3 },
  { href: '/profile', label: 'Perfil', icon: User },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-40 flex items-center justify-around px-2 safe-area-bottom" data-testid="bottom-nav">
      {navItems.map((item) => {
        const isActive = location.pathname === item.href || 
                        (item.href === '/profile' && location.pathname === '/profile');
        const Icon = item.icon;
        
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-14 rounded-lg transition-all",
              isActive 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            data-testid={`bottom-nav-${item.label.toLowerCase()}`}
          >
            <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
            <span className={cn(
              "text-[10px] mt-1 font-medium truncate max-w-full px-1",
              isActive ? "text-primary" : "text-muted-foreground"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default BottomNav;
