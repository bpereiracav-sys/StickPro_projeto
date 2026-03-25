import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null); // Currently active profile (self or associated)
  const [viewingAs, setViewingAs] = useState(null); // User we're viewing as (if associated)

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      const userData = response.data;
      setUser(userData);
      setAvailableProfiles(userData.available_profiles || []);
      
      // Restore active profile from localStorage
      const savedProfile = localStorage.getItem('activeProfile');
      if (savedProfile) {
        try {
          const profile = JSON.parse(savedProfile);
          setActiveProfile(profile);
          if (profile.type === 'associated') {
            setViewingAs(profile);
          }
        } catch (e) {
          // Invalid saved profile, use default
          setActiveProfile({ type: 'self', user_id: userData.id });
        }
      } else {
        setActiveProfile({ type: 'self', user_id: userData.id });
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
    
    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
    setAvailableProfiles(available_profiles || []);
    setActiveProfile({ type: 'self', user_id: userData.id });
    setViewingAs(null);
    localStorage.removeItem('activeProfile');
    
    return { user: userData, availableProfiles: available_profiles };
  };

  const register = async (data) => {
    const response = await axios.post(`${API_URL}/auth/register`, data);
    const { token: newToken, user: userData, available_profiles } = response.data;
    
    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
    setAvailableProfiles(available_profiles || []);
    setActiveProfile({ type: 'self', user_id: userData.id });
    
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('activeProfile');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setAvailableProfiles([]);
    setActiveProfile(null);
    setViewingAs(null);
  };

  const switchProfile = async (profile) => {
    try {
      const response = await axios.post(`${API_URL}/auth/switch-profile`, {
        profile_type: profile.type,
        associated_user_id: profile.user_id,
        active_role: profile.role
      });
      
      setActiveProfile(profile);
      localStorage.setItem('activeProfile', JSON.stringify(profile));
      
      if (profile.type === 'associated') {
        setViewingAs(response.data.viewing_as);
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
      setAvailableProfiles(response.data);
      return response.data;
    } catch (error) {
      console.error('Error refreshing profiles:', error);
    }
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  // Current effective role (considering if viewing as associated)
  const effectiveRole = viewingAs?.role || user?.role;
  
  const isAdmin = effectiveRole === 'admin';
  const isCoach = effectiveRole === 'treinador';
  const isDelegate = effectiveRole === 'delegado';
  const isPlayer = effectiveRole === 'jogador';
  const isParent = effectiveRole === 'responsavel';
  const canManageTeam = isAdmin || isCoach;
  const canManageEvents = isAdmin || isCoach || isDelegate;
  
  // Check if user has associated accounts
  const hasAssociatedAccounts = (user?.associated_accounts?.length || 0) > 0;
  const isViewingAsAssociated = activeProfile?.type === 'associated';

  return (
    <AuthContext.Provider value={{
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
      // Role checks (use effective role)
      effectiveRole,
      isAdmin,
      isCoach,
      isDelegate,
      isPlayer,
      isParent,
      canManageTeam,
      canManageEvents,
      isAuthenticated: !!user
    }}>
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
