import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { teamsApi } from '../services/api';
import { useAuth } from './AuthContext';

const TeamContext = createContext(null);

export function TeamProvider({ children }) {
  const { isAuthenticated } = useAuth();

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null); // null = Meu Clube
  const [loading, setLoading] = useState(true);

  const fetchTeams = useCallback(async () => {
    if (!isAuthenticated) {
      setTeams([]);
      setSelectedTeam(null);
      localStorage.removeItem('stickpro_selected_team');
      setLoading(false);
      return;
    }

    try {
      const response = await teamsApi.getAll();
      const fetchedTeams = response.data || [];

      setTeams(fetchedTeams);

      const savedTeamId = localStorage.getItem('stickpro_selected_team');

      if (!savedTeamId || savedTeamId === 'all') {
        setSelectedTeam(null);
        return;
      }

      const savedTeam = fetchedTeams.find((team) => team.id === savedTeamId);

      if (savedTeam) {
        setSelectedTeam(savedTeam);
      } else {
        setSelectedTeam(null);
        localStorage.setItem('stickpro_selected_team', 'all');
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeams([]);
      setSelectedTeam(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setLoading(true);
    fetchTeams();
  }, [fetchTeams]);

  const selectTeam = useCallback((team) => {
    setSelectedTeam(team || null);

    if (team?.id) {
      localStorage.setItem('stickpro_selected_team', team.id);
    } else {
      localStorage.setItem('stickpro_selected_team', 'all');
    }
  }, []);

  const selectAllTeams = useCallback(() => {
    setSelectedTeam(null);
    localStorage.setItem('stickpro_selected_team', 'all');
  }, []);

  const refreshTeams = useCallback(async () => {
    setLoading(true);
    await fetchTeams();
  }, [fetchTeams]);

  const getTeamFilter = useCallback(() => {
    if (selectedTeam?.id) {
      return selectedTeam.id;
    }

    return teams.map((team) => team.id);
  }, [selectedTeam, teams]);

  const value = useMemo(
    () => ({
      teams,
      selectedTeam,
      loading,
      selectTeam,
      selectAllTeams,
      refreshTeams,
      getTeamFilter,
      isAllTeamsSelected: selectedTeam === null,
    }),
    [
      teams,
      selectedTeam,
      loading,
      selectTeam,
      selectAllTeams,
      refreshTeams,
      getTeamFilter,
    ]
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const context = useContext(TeamContext);

  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }

  return context;
}

export default TeamContext;
