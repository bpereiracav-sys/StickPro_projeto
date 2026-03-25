import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopNavBar } from './TopNavBar';
import { Toaster } from '../ui/sonner';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { teamsApi } from '../../services/api';

export function AppLayout({ children }) {
  const { isAuthenticated } = useAuth();
  const { refreshTheme } = useTheme();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTeams();
      // Refresh theme when user is authenticated
      refreshTheme();
    }
  }, [isAuthenticated, refreshTheme]);

  const fetchTeams = async () => {
    try {
      const response = await teamsApi.getAll();
      setTeams(response.data);
      
      // Restore selected team from localStorage or use first team
      const savedTeamId = localStorage.getItem('selectedTeamId');
      if (savedTeamId) {
        const savedTeam = response.data.find(t => t.id === savedTeamId);
        if (savedTeam) {
          setSelectedTeam(savedTeam);
        } else if (response.data.length > 0) {
          setSelectedTeam(response.data[0]);
        }
      } else if (response.data.length > 0 && !selectedTeam) {
        setSelectedTeam(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleSelectTeam = (team) => {
    setSelectedTeam(team);
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
      {/* Top Navigation Bar */}
      <TopNavBar />
      
      {/* Sidebar */}
      <Sidebar 
        teams={teams} 
        selectedTeam={selectedTeam} 
        onSelectTeam={handleSelectTeam}
      />
      
      {/* Main Content */}
      <main className="lg:ml-64 pt-14 lg:pt-16 min-h-screen">
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
      
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default AppLayout;
