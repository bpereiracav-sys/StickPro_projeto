import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavBar } from './TopNavBar';
import { BottomNav } from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Activity } from 'lucide-react';

const ONBOARDING_REQUIRED_ROLES = new Set(['admin', 'gestor_desportivo']);

export function AppLayout({ children }) {
  const { isAuthenticated, user } = useAuth();
  const { refreshTheme } = useTheme();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      refreshTheme();
    }
  }, [isAuthenticated, refreshTheme]);

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  // Phase O1 — redirect admins/gestor_desportivo to the onboarding wizard on
  // first login. The /onboarding route itself renders without AppLayout, so
  // this only fires for other protected routes.
  const role = user?.role;
  const needsOnboarding =
    role &&
    ONBOARDING_REQUIRED_ROLES.has(role) &&
    !user?.onboarding_completed_at &&
    location.pathname !== '/onboarding';

  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
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
    </div>
  );
}

export default AppLayout;
