import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Toaster } from '../ui/sonner';
import { useAuth } from '../../context/AuthContext';
import { teamsApi } from '../../services/api';

export function AppLayout({ children }) {
  const { isAuthenticated } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTeams();
    }
  }, [isAuthenticated]);

  const fetchTeams = async () => {
    try {
      const response = await teamsApi.getAll();
      setTeams(response.data);
      if (response.data.length > 0 && !selectedTeam) {
        setSelectedTeam(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleSelectTeam = (team) => {
    setSelectedTeam(team);
    // Store in localStorage for persistence
    localStorage.setItem('selectedTeamId', team.id);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        {children}
        <Toaster position="top-right" richColors />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar 
        teams={teams} 
        selectedTeam={selectedTeam} 
        onSelectTeam={handleSelectTeam}
      />
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default AppLayout;
