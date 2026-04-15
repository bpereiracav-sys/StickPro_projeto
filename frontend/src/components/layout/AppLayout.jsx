import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopNavBar } from './TopNavBar';
import { BottomNav } from './BottomNav';
import { Toaster } from '../ui/sonner';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Activity } from 'lucide-react';

export function AppLayout({ children }) {
  const { isAuthenticated } = useAuth();
  const { refreshTheme } = useTheme();

  useEffect(() => {
    if (isAuthenticated) {
      refreshTheme();
    }
  }, [isAuthenticated, refreshTheme]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        {children}
        <Toaster position="top-right" richColors />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <TopNavBar />
      <Sidebar />

      <main className="lg:ml-64 pt-14 lg:pt-16 pb-20 lg:pb-0 min-h-screen">
        <div className="p-4 lg:p-6 max-w-7xl">{children}</div>
      </main>

      <BottomNav />

      <div
        className="hidden lg:block fixed bottom-6 right-6 pointer-events-none z-0"
        aria-hidden="true"
      >
        <Activity className="w-24 h-24 text-primary/[0.03]" strokeWidth={1} />
      </div>

      <Toaster position="top-right" richColors />
    </div>
  );
}

export default AppLayout;
