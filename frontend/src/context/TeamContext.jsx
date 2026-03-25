import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { teamsApi } from '../services/api';
import { useAuth } from './AuthContext';

const TeamContext = createContext();

export function TeamProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null); // null = "Meu Clube" (all teams)
  const [loading, setLoading] = useState(true);

  const fetchTeams = useCallback(async () => {
    if (!isAuthenticated) {
      setTeams([]);
      setSelectedTeam(null);
      setLoading(false);
      return;
    }
    
    try {
      const response = await teamsApi.getAll();
      setTeams(response.data || []);
      
      // Restore selected team from localStorage
      const savedTeamId = localStorage.getItem('stickpro_selected_team');
      if (savedTeamId && savedTeamId !== 'all') {
        const team = response.data.find(t => t.id === savedTeamId);
        if (team) {
          setSelectedTeam(team);
        }
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const selectTeam = useCallback((team) => {
    setSelectedTeam(team);
    if (team) {
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

  // Get team IDs for filtering
  const getTeamFilter = useCallback(() => {
    if (selectedTeam) {
      return selectedTeam.id;
    }
    // Return all team IDs when "Meu Clube" is selected
    return teams.map(t => t.id);
  }, [selectedTeam, teams]);

  const value = {
    teams,
    selectedTeam,
    loading,
    selectTeam,
    selectAllTeams,
    refreshTeams,
    getTeamFilter,
    isAllTeamsSelected: selectedTeam === null,
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}

export default TeamContext;
