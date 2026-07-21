import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import axios from 'axios';

import { normalizeRole } from '../lib/utils';

const AuthContext = createContext(null);

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ADMIN_ROLES = new Set([
  'admin',
  'gestor_desportivo',
]);

function normalizeProfile(profile) {
  if (!profile) return null;

  return {
    ...profile,
    role: profile.role ? normalizeRole(profile.role) : null,
  };
}

function normalizeProfiles(profiles = []) {
  if (!Array.isArray(profiles)) {
    return [];
  }

  return profiles
    .map(normalizeProfile)
    .filter(Boolean);
}

function normalizeUser(user) {
  if (!user) return null;

  return {
    ...user,
    role: user.role ? normalizeRole(user.role) : null,
  };
}

function profilesMatch(profileA, profileB) {
  if (!profileA || !profileB) {
    return false;
  }

  if (
    profileA.profile_id &&
    profileB.profile_id &&
    profileA.profile_id === profileB.profile_id
  ) {
    return true;
  }

  return (
    profileA.type === profileB.type &&
    profileA.user_id === profileB.user_id &&
    profileA.role === profileB.role
  );
}

function buildFallbackSelfProfile(userData) {
  if (!userData?.id) {
    return null;
  }

  return {
    type: 'self',
    user_id: userData.id,
    role: normalizeRole(userData.role),
  };
}

function selectDefaultProfile(profiles, userData) {
  const normalizedUserRole = normalizeRole(userData?.role);

  const matchingSelfProfile = profiles.find(
    (profile) =>
      profile.type === 'self' &&
      profile.user_id === userData?.id &&
      profile.role === normalizedUserRole
  );

  if (matchingSelfProfile) {
    return matchingSelfProfile;
  }

  const firstSelfProfile = profiles.find(
    (profile) => profile.type === 'self'
  );

  if (firstSelfProfile) {
    return firstSelfProfile;
  }

  return profiles[0] || buildFallbackSelfProfile(userData);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [viewingAs, setViewingAs] = useState(null);

  const clearAuthenticationState = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('activeProfile');

    delete axios.defaults.headers.common.Authorization;

    setToken(null);
    setUser(null);
    setAvailableProfiles([]);
    setActiveProfile(null);
    setViewingAs(null);
    setLoading(false);
  }, []);

  const applyActiveProfile = useCallback((profile, resolvedViewingAs = null) => {
    const normalizedProfile = normalizeProfile(profile);

    if (!normalizedProfile) {
      setActiveProfile(null);
      setViewingAs(null);
      localStorage.removeItem('activeProfile');
      return;
    }

    setActiveProfile(normalizedProfile);
    localStorage.setItem(
      'activeProfile',
      JSON.stringify(normalizedProfile)
    );

    if (normalizedProfile.type === 'associated') {
      setViewingAs(
        normalizeProfile(resolvedViewingAs) || normalizedProfile
      );
    } else {
      setViewingAs(null);
    }
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);

      const userData = normalizeUser(response.data);
      const normalizedProfiles = normalizeProfiles(
        response.data?.available_profiles || []
      );

      setUser(userData);
      setAvailableProfiles(normalizedProfiles);

      const defaultProfile = selectDefaultProfile(
        normalizedProfiles,
        userData
      );

      const savedProfileRaw = localStorage.getItem('activeProfile');

      if (!savedProfileRaw) {
        applyActiveProfile(defaultProfile);
        return;
      }

      try {
        const savedProfile = normalizeProfile(
          JSON.parse(savedProfileRaw)
        );

        const existingProfile = normalizedProfiles.find((profile) =>
          profilesMatch(profile, savedProfile)
        );

        if (
          existingProfile &&
          ['self', 'associated'].includes(existingProfile.type)
        ) {
          /*
           * Para perfis associados, os dados guardados localmente permitem
           * restaurar a seleção visual. A autorização real continuará sempre
           * a ser validada pelo backend em cada pedido.
           */
          applyActiveProfile(existingProfile, existingProfile);
        } else {
          applyActiveProfile(defaultProfile);
        }
      } catch (error) {
        console.warn(
          'Não foi possível restaurar o perfil ativo guardado:',
          error
        );

        applyActiveProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Erro ao obter o utilizador autenticado:', error);
      clearAuthenticationState();
    } finally {
      setLoading(false);
    }
  }, [applyActiveProfile, clearAuthenticationState]);

  useEffect(() => {
    if (!token) {
      delete axios.defaults.headers.common.Authorization;
      setLoading(false);
      return;
    }

    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    fetchUser();
  }, [token, fetchUser]);

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });

    const {
      token: newToken,
      user: responseUser,
      available_profiles: responseProfiles,
    } = response.data;

    const userData = normalizeUser(responseUser);
    const normalizedProfiles = normalizeProfiles(responseProfiles || []);
    const defaultProfile = selectDefaultProfile(
      normalizedProfiles,
      userData
    );

    localStorage.setItem('token', newToken);
    localStorage.removeItem('activeProfile');

    axios.defaults.headers.common.Authorization = `Bearer ${newToken}`;

    setToken(newToken);
    setUser(userData);
    setAvailableProfiles(normalizedProfiles);
    applyActiveProfile(defaultProfile);

    return {
      user: userData,
      availableProfiles: normalizedProfiles,
      activeProfile: defaultProfile,
    };
  };

  const register = async (data) => {
    const response = await axios.post(
      `${API_URL}/auth/register`,
      data
    );

    const {
      token: newToken,
      user: responseUser,
      available_profiles: responseProfiles,
    } = response.data;

    const userData = normalizeUser(responseUser);
    const normalizedProfiles = normalizeProfiles(responseProfiles || []);
    const defaultProfile = selectDefaultProfile(
      normalizedProfiles,
      userData
    );

    localStorage.setItem('token', newToken);
    localStorage.removeItem('activeProfile');

    axios.defaults.headers.common.Authorization = `Bearer ${newToken}`;

    setToken(newToken);
    setUser(userData);
    setAvailableProfiles(normalizedProfiles);
    applyActiveProfile(defaultProfile);

    return userData;
  };

  const logout = useCallback(() => {
    clearAuthenticationState();
  }, [clearAuthenticationState]);

  const switchProfile = async (profile) => {
    const normalizedProfile = normalizeProfile(profile);

    if (!normalizedProfile) {
      throw new Error('Perfil inválido.');
    }

    if (
      !['self', 'associated'].includes(normalizedProfile.type)
    ) {
      throw new Error('Tipo de perfil inválido.');
    }

    const profileExists = availableProfiles.some((availableProfile) =>
      profilesMatch(availableProfile, normalizedProfile)
    );

    if (!profileExists) {
      throw new Error(
        'O perfil selecionado já não está disponível nesta conta.'
      );
    }

    try {
      const payload = {
        profile_type: normalizedProfile.type,
        active_role: normalizedProfile.role,
      };

      if (normalizedProfile.type === 'associated') {
        payload.associated_user_id = normalizedProfile.user_id;
      }

      const response = await axios.post(
        `${API_URL}/auth/switch-profile`,
        payload
      );

      const returnedProfile = normalizeProfile(
        response.data?.active_profile
      );

      const profileToApply =
        returnedProfile || normalizedProfile;

      const resolvedViewingAs =
        profileToApply.type === 'associated'
          ? normalizeProfile(response.data?.viewing_as) ||
            profileToApply
          : null;

      applyActiveProfile(profileToApply, resolvedViewingAs);

      return response.data;
    } catch (error) {
      console.error('Erro ao mudar de perfil:', error);
      throw error;
    }
  };

  const refreshProfiles = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/profiles`);

      const normalizedProfiles = normalizeProfiles(
        response.data || []
      );

      setAvailableProfiles(normalizedProfiles);

      const currentProfileStillExists = normalizedProfiles.some(
        (profile) => profilesMatch(profile, activeProfile)
      );

      if (!currentProfileStillExists) {
        const fallbackProfile = selectDefaultProfile(
          normalizedProfiles,
          user
        );

        applyActiveProfile(fallbackProfile);
      }

      return normalizedProfiles;
    } catch (error) {
      console.error('Erro ao atualizar os perfis:', error);
      return [];
    }
  };

  const updateUser = useCallback((updates) => {
    setUser((previousUser) => {
      if (!previousUser) {
        return previousUser;
      }

      return normalizeUser({
        ...previousUser,
        ...updates,
      });
    });
  }, []);

  /*
   * activeProfile é a fonte principal.
   *
   * viewingAs contém dados resolvidos adicionais do perfil associado.
   * O papel da conta autenticada só é usado como fallback.
   */
  const effectiveRole = useMemo(
    () =>
      normalizeRole(
        viewingAs?.role ||
          activeProfile?.role ||
          user?.role
      ),
    [viewingAs?.role, activeProfile?.role, user?.role]
  );

  const effectiveUserId = useMemo(
    () =>
      viewingAs?.user_id ||
      viewingAs?.id ||
      activeProfile?.user_id ||
      user?.id ||
      null,
    [
      viewingAs?.user_id,
      viewingAs?.id,
      activeProfile?.user_id,
      user?.id,
    ]
  );

  const isViewingAsAssociated =
    activeProfile?.type === 'associated';

  const isSelfProfile =
    !activeProfile || activeProfile.type === 'self';

  const hasAssociatedAccounts = useMemo(
    () =>
      availableProfiles.some(
        (profile) => profile.type === 'associated'
      ),
    [availableProfiles]
  );

  const isAdmin = ADMIN_ROLES.has(effectiveRole);
  const isSportsManager = effectiveRole === 'gestor_desportivo';
  const isTechnicalDirector = effectiveRole === 'diretor_tecnico';
  const isCoach = effectiveRole === 'treinador';
  const isAssistantCoach = effectiveRole === 'treinador_adjunto';
  const isDelegate = effectiveRole === 'delegado';
  const isPlayer = effectiveRole === 'jogador';

  /*
   * Compatibilidade temporária com código antigo.
   *
   * Não representa um perfil Pai/Mãe. Deve ser removido dos componentes
   * durante a auditoria RC1.1 depois de localizarmos todas as utilizações.
   */
  const isLegacyResponsibleRole = effectiveRole === 'responsavel';

  const canManageTeam =
    isAdmin ||
    isTechnicalDirector ||
    isCoach;

  const canManageEvents =
    isAdmin ||
    isTechnicalDirector ||
    isCoach ||
    isAssistantCoach ||
    isDelegate;

  const contextValue = useMemo(
    () => ({
      user,
      token,
      loading,

      login,
      register,
      logout,
      updateUser,
      fetchUser,

      availableProfiles,
      activeProfile,
      viewingAs,
      switchProfile,
      refreshProfiles,

      effectiveRole,
      effectiveUserId,

      hasAssociatedAccounts,
      isViewingAsAssociated,
      isSelfProfile,

      isAdmin,
      isSportsManager,
      isTechnicalDirector,
      isCoach,
      isAssistantCoach,
      isDelegate,
      isPlayer,

      /*
       * Alias temporário para não provocar erros de build antes da
       * refatorização dos componentes antigos.
       */
      isParent: isLegacyResponsibleRole,
      isLegacyResponsibleRole,

      canManageTeam,
      canManageEvents,

      isAuthenticated: Boolean(user),
    }),
    [
      user,
      token,
      loading,
      logout,
      updateUser,
      fetchUser,
      availableProfiles,
      activeProfile,
      viewingAs,
      effectiveRole,
      effectiveUserId,
      hasAssociatedAccounts,
      isViewingAsAssociated,
      isSelfProfile,
      isAdmin,
      isSportsManager,
      isTechnicalDirector,
      isCoach,
      isAssistantCoach,
      isDelegate,
      isPlayer,
      isLegacyResponsibleRole,
      canManageTeam,
      canManageEvents,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
}
