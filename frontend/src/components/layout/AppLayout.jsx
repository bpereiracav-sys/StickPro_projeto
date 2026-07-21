import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Activity } from 'lucide-react';

import { Sidebar } from './Sidebar';
import { TopNavBar } from './TopNavBar';
import { BottomNav } from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const ONBOARDING_REQUIRED_ROLES = new Set([
  'admin',
  'gestor_desportivo',
]);

export function AppLayout({ children }) {
  const {
    isAuthenticated,
    user,
    loading,
    effectiveRole,
    isSelfProfile,
  } = useAuth();

  const { refreshTheme } = useTheme();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      refreshTheme();
    }
  }, [isAuthenticated, refreshTheme]);

  /*
   * Evita que a aplicação apresente temporariamente páginas públicas
   * enquanto a sessão e o perfil ativo ainda estão a ser restaurados.
   */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Activity
            className="h-8 w-8 animate-pulse text-primary"
            strokeWidth={1.75}
          />

          <p className="text-sm font-medium">
            A carregar a StickPro...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        {children}
      </div>
    );
  }

  /*
   * O onboarding pertence ao perfil próprio da conta.
   *
   * Uma conta administrativa que esteja a visualizar um atleta associado
   * não deve ser redirecionada para o onboarding administrativo.
   */
  const needsOnboarding =
    isSelfProfile &&
    effectiveRole &&
    ONBOARDING_REQUIRED_ROLES.has(effectiveRole) &&
    !user?.onboarding_completed_at &&
    location.pathname !== '/onboarding';

  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900">
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.06),transparent_34%)]"
        aria-hidden="true"
      />

      <TopNavBar />
      <Sidebar />

      <main className="relative z-10 min-h-screen pb-20 lg:ml-64 lg:pb-0">
        <div className="mx-auto w-full max-w-7xl px-3 pb-3 pt-2 sm:px-5 sm:pb-5 sm:pt-3 lg:px-8 lg:pb-6 lg:pt-3">
          <div className="rounded-[1.5rem] border border-white/70 bg-white/78 p-2 shadow-sm shadow-slate-200/70 backdrop-blur-xl sm:p-3 lg:rounded-[2rem] lg:p-3">
            {children}
          </div>
        </div>
      </main>

      <BottomNav />

      <div
        className="pointer-events-none fixed bottom-6 right-6 z-0 hidden lg:block"
        aria-hidden="true"
      >
        <Activity
          className="h-28 w-28 text-primary/[0.035]"
          strokeWidth={1}
        />
      </div>
    </div>
  );
}

export default AppLayout;
