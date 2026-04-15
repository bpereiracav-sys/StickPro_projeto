import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { normalizeRole } from '../lib/utils';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';
const ADMIN_ROLES = ['admin', 'gestor_desportivo'];

function normalizeProfile(profile) {
  if (!profile) return null;

  return {
    ...profile,
    role: profile?.role ? normalizeRole(profile.role) : profile?.role,
  };
}

function normalizeProfiles(profiles = []) {
  return profiles.map(normalizeProfile);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null); // self or associated
  const [viewingAs, setViewingAs] = useState(null); // resolved associated profile data

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      const userData = response.data;
      const normalizedAvailableProfiles = normalizeProfiles(userData.available_profiles || []);

      setUser(userData);
      setAvailableProfiles(normalizedAvailableProfiles);

      const savedProfile = localStorage.getItem('activeProfile');

      if (savedProfile) {
        try {
          const parsedProfile = JSON.parse(savedProfile);
          const normalizedProfile = normalizeProfile(parsedProfile);

          if (
            normalizedProfile &&
            (normalizedProfile.type === 'self' || normalizedProfile.type === 'associated')
          ) {
            setActiveProfile(normalizedProfile);

            if (normalizedProfile.type === 'associated') {
              setViewingAs(normalizedProfile);
            } else {
              setViewingAs(null);
            }
          } else {
            const fallbackProfile = {
              type: 'self',
              user_id: userData.id,
              role: normalizeRole(userData.role),
            };
            setActiveProfile(fallbackProfile);
            setViewingAs(null);
            localStorage.setItem('activeProfile', JSON.stringify(fallbackProfile));
          }
        } catch (error) {
          const fallbackProfile = {
            type: 'self',
            user_id: userData.id,
            role: normalizeRole(userData.role),
          };
          setActiveProfile(fallbackProfile);
          setViewingAs(null);
          localStorage.setItem('activeProfile', JSON.stringify(fallbackProfile));
        }
      } else {
        const defaultProfile = {
          type: 'self',
          user_id: userData.id,
          role: normalizeRole(userData.role),
        };
        setActiveProfile(defaultProfile);
        setViewingAs(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    const { token: newToken, user: userData, available_profiles } = response.data;

    const normalizedAvailableProfiles = normalizeProfiles(available_profiles || []);
    const selfProfile = {
      type: 'self',
      user_id: userData.id,
      role: normalizeRole(userData.role),
    };

    localStorage.setItem('token', newToken);
    localStorage.removeItem('activeProfile');
    axios.defaults.headers.common.Authorization = `Bearer ${newToken}`;

    setToken(newToken);
    setUser(userData);
    setAvailableProfiles(normalizedAvailableProfiles);
    setActiveProfile(selfProfile);
    setViewingAs(null);

    return { user: userData, availableProfiles: normalizedAvailableProfiles };
  };

  const register = async (data) => {
    const response = await axios.post(`${API_URL}/auth/register`, data);
    const { token: newToken, user: userData, available_profiles } = response.data;

    const normalizedAvailableProfiles = normalizeProfiles(available_profiles || []);
    const selfProfile = {
      type: 'self',
      user_id: userData.id,
      role: normalizeRole(userData.role),
    };

    localStorage.setItem('token', newToken);
    localStorage.removeItem('activeProfile');
    axios.defaults.headers.common.Authorization = `Bearer ${newToken}`;

    setToken(newToken);
    setUser(userData);
    setAvailableProfiles(normalizedAvailableProfiles);
    setActiveProfile(selfProfile);
    setViewingAs(null);

    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('activeProfile');
    delete axios.defaults.headers.common.Authorization;

    setToken(null);
    setUser(null);
    setAvailableProfiles([]);
    setActiveProfile(null);
    setViewingAs(null);
    setLoading(false);
  };

  const switchProfile = async (profile) => {
    const normalizedProfile = normalizeProfile(profile);

    try {
      const response = await axios.post(`${API_URL}/auth/switch-profile`, {
        profile_type: normalizedProfile.type,
        associated_user_id: normalizedProfile.user_id,
        active_role: normalizedProfile.role,
      });

      setActiveProfile(normalizedProfile);
      localStorage.setItem('activeProfile', JSON.stringify(normalizedProfile));

      if (normalizedProfile.type === 'associated') {
        const resolvedViewingAs = normalizeProfile(response.data.viewing_as);
        setViewingAs(resolvedViewingAs);
      } else {
        setViewingAs(null);
      }

      return response.data;
    } catch (error) {
      console.error('Error switching profile:', error);
      throw error;
    }
  };

  const refreshProfiles = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/profiles`);
      const normalizedProfiles = normalizeProfiles(response.data || []);
      setAvailableProfiles(normalizedProfiles);
      return normalizedProfiles;
    } catch (error) {
      console.error('Error refreshing profiles:', error);
      return [];
    }
  };

  const updateUser = (updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  const effectiveRole = useMemo(() => {
    return normalizeRole(viewingAs?.role || user?.role);
  }, [viewingAs?.role, user?.role]);

  const isAdmin = ADMIN_ROLES.includes(effectiveRole);
  const isCoach = effectiveRole === 'treinador';
  const isAssistantCoach = effectiveRole === 'treinador_adjunto';
  const isDelegate = effectiveRole === 'delegado';
  const isPlayer = effectiveRole === 'jogador';
  const isParent = effectiveRole === 'responsavel';
  const isSportsManager = effectiveRole === 'gestor_desportivo';

  const canManageTeam = isAdmin || isCoach;
  const canManageEvents = isAdmin || isCoach || isAssistantCoach || isDelegate;

  const hasAssociatedAccounts = (user?.associated_accounts?.length || 0) > 0;
  const isViewingAsAssociated = activeProfile?.type === 'associated';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUser,

        // Profile switching
        availableProfiles,
        activeProfile,
        viewingAs,
        switchProfile,
        refreshProfiles,
        hasAssociatedAccounts,
        isViewingAsAssociated,

        // Role checks
        effectiveRole,
        isAdmin,
        isCoach,
        isAssistantCoach,
        isDelegate,
        isPlayer,
        isParent,
        isSportsManager,

        // Permissions helpers
        canManageTeam,
        canManageEvents,

        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
