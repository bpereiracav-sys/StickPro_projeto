import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { TeamProvider } from "./context/TeamContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PermissionsProvider, usePermissions } from "./context/PermissionsContext";

import { Toaster } from "./components/ui/sonner";
import { AppLayout } from "./components/layout/AppLayout";
import {
  PWAInstallPrompt,
  registerServiceWorker,
} from "./components/PWAInstallPrompt";
import { AIAssistant } from "./components/AIAssistant";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import TeamDetail from "./pages/TeamDetail";
import PlayerProfile from "./pages/PlayerProfile";
import CalendarPage from "./pages/Calendar";
import Convocations from "./pages/Convocations";
import Chat from "./pages/Chat";
import Stats from "./pages/Stats";
import Settings from "./pages/Settings";
import Members from "./pages/Members";
import Championships from "./pages/Championships";
import ChampionshipDetail from "./pages/ChampionshipDetail";
import MatchStats from "./pages/MatchStats";
import Attendance from "./pages/Attendance";
import ClubPage from "./pages/ClubPage";
import ProfilePage from "./pages/ProfilePage";
import MemberProfilePage from "./pages/MemberProfilePage";
import TeamsPage from "./pages/TeamsPage";
import MyTeamsPage from "./pages/MyTeamsPage";
import ChildrenPage from "./pages/ChildrenPage";
import LibraryPage from "./pages/LibraryPage";
import Payments from "./pages/Payments";
import SubscriptionPage from "./pages/SubscriptionPage";

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function PermissionRoute({
  children,
  allowedRoles = [],
  requiredPermission = null,
  redirectTo = "/dashboard",
}) {
  const { isAuthenticated, loading } = useAuth();
  const permissions = usePermissions();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const hasAllowedRole =
    allowedRoles.length === 0 || allowedRoles.includes(permissions.role);

  const hasRequiredPermission =
    !requiredPermission || permissions.hasPermission(requiredPermission);

  if (!hasAllowedRole || !hasRequiredPermission) {
    return <Navigate to={redirectTo} replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route
        path="/"
        element={
          <PublicRoute>
            <Landing />
          </PublicRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* General authenticated */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/convocations"
        element={
          <ProtectedRoute>
            <Convocations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-teams"
        element={
          <ProtectedRoute>
            <MyTeamsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/children"
        element={
          <ProtectedRoute>
            <ChildrenPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/library"
        element={
          <ProtectedRoute>
            <LibraryPage />
          </ProtectedRoute>
        }
      />

      {/* Team management */}
      <Route
        path="/teams"
        element={
          <PermissionRoute
            allowedRoles={["admin", "gestor_desportivo", "treinador"]}
          >
            <TeamsPage />
          </PermissionRoute>
        }
      />
      <Route path="/teams-management" element={<Navigate to="/teams" replace />} />
      <Route
        path="/teams/:teamId"
        element={
          <ProtectedRoute>
            <TeamDetail />
          </ProtectedRoute>
        }
      />

      {/* Members */}
      <Route
        path="/members"
        element={
          <PermissionRoute
            allowedRoles={[
              "admin",
              "gestor_desportivo",
              "treinador",
              "treinador_adjunto",
              "delegado",
            ]}
            requiredPermission="view_team_members"
          >
            <Members />
          </PermissionRoute>
        }
      />
      <Route
        path="/members/:memberId/profile"
        element={
          <PermissionRoute
            allowedRoles={[
              "admin",
              "gestor_desportivo",
              "treinador",
              "treinador_adjunto",
              "delegado",
            ]}
            requiredPermission="view_team_members"
          >
            <MemberProfilePage />
          </PermissionRoute>
        }
      />
      <Route
        path="/players/:playerId"
        element={
          <ProtectedRoute>
            <PlayerProfile />
          </ProtectedRoute>
        }
      />

      {/* Competitions / stats / attendance */}
      <Route
        path="/championships"
        element={
          <ProtectedRoute>
            <Championships />
          </ProtectedRoute>
        }
      />
      <Route
        path="/championships/:championshipId"
        element={
          <ProtectedRoute>
            <ChampionshipDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/championships/:championshipId/matches/:matchId/stats"
        element={
          <ProtectedRoute>
            <MatchStats />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <PermissionRoute requiredPermission="view_team_attendance">
            <Attendance />
          </PermissionRoute>
        }
      />
      <Route
        path="/stats"
        element={
          <ProtectedRoute>
            <Stats />
          </ProtectedRoute>
        }
      />

      {/* Payments */}
      <Route
        path="/payments"
        element={
          <PermissionRoute
            allowedRoles={[
              "admin",
              "gestor_desportivo",
              "jogador",
              "responsavel",
            ]}
          >
            <Payments />
          </PermissionRoute>
        }
      />

      {/* Admin / club management */}
      <Route
        path="/club"
        element={
          <PermissionRoute
            allowedRoles={["admin", "gestor_desportivo"]}
            requiredPermission="view_club_settings"
          >
            <ClubPage />
          </PermissionRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PermissionRoute
            allowedRoles={["admin", "gestor_desportivo"]}
          >
            <Settings />
          </PermissionRoute>
        }
      />
      <Route
        path="/subscription"
        element={
          <PermissionRoute
            allowedRoles={["admin", "gestor_desportivo"]}
          >
            <SubscriptionPage />
          </PermissionRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <PermissionsProvider>
            <ThemeProvider>
              <TeamProvider>
                <AppRoutes />
                <Toaster position="top-right" richColors />
                <PWAInstallPrompt />
                <AIAssistant />
              </TeamProvider>
            </ThemeProvider>
          </PermissionsProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
