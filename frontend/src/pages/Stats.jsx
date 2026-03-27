import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { teamsApi, championshipsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { 
  BarChart3, 
  Trophy,
  Target,
  Users,
  TrendingUp,
  Filter,
  Medal,
  Shield,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Hand,
  Goal
} from 'lucide-react';
import { getInitials } from '../lib/utils';

const seasons = [
  { value: 'all', label: 'Todas as épocas' },
  { value: '2025/2026', label: '2025/2026' },
  { value: '2024/2025', label: '2024/2025' },
  { value: '2023/2024', label: '2023/2024' },
];

export default function Stats() {
  const { user } = useAuth();
  const { selectedTeam, teams: contextTeams } = useTeam();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [championships, setChampionships] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('2025/2026');
  const [selectedChampionshipId, setSelectedChampionshipId] = useState('all');
  const [stats, setStats] = useState([]);
  const [standings, setStandings] = useState([]);
  const [matches, setMatches] = useState([]); // For recent results sequence
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('players');
  
  // New state for search and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'goals', direction: 'desc' });
  
  // Toggle for bonus/penalty points in standings
  const [includeBonusPenalty, setIncludeBonusPenalty] = useState(true);

  // Set selected team from context
  useEffect(() => {
    if (selectedTeam) {
      setSelectedTeamId(selectedTeam.id);
    } else if (contextTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(contextTeams[0].id);
    }
    setTeams(contextTeams);
    if (contextTeams.length > 0) {
      setLoading(false);
    }
  }, [selectedTeam, contextTeams]);

  useEffect(() => {
    if (selectedTeamId) {
      fetchChampionships();
      fetchStats();
    }
  }, [selectedTeamId, selectedSeason]);

  useEffect(() => {
    if (selectedChampionshipId && selectedChampionshipId !== 'all') {
      fetchStandings();
      fetchMatches();
    } else {
      setStandings([]);
      setMatches([]);
    }
  }, [selectedChampionshipId]);

  const fetchChampionships = async () => {
    try {
      const params = { team_id: selectedTeamId };
      if (selectedSeason !== 'all') params.season = selectedSeason;
      const response = await championshipsApi.getAll(params);
      setChampionships(response.data);
      if (response.data.length > 0) {
        setSelectedChampionshipId(response.data[0].id);
      } else {
        setSelectedChampionshipId('all');
      }
    } catch (error) {
      console.error('Error fetching championships:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const champId = selectedChampionshipId !== 'all' ? selectedChampionshipId : undefined;
      const response = await teamsApi.getStats(selectedTeamId, champId);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchStandings = async () => {
    try {
      const response = await championshipsApi.getStandings(selectedChampionshipId);
      setStandings(response.data);
    } catch (error) {
      console.error('Error fetching standings:', error);
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await championshipsApi.getMatches(selectedChampionshipId);
      setMatches(response.data);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const currentTeam = teams.find(t => t.id === selectedTeamId);
  const currentChampionship = championships.find(c => c.id === selectedChampionshipId);

  // Sorting function
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Get sort icon
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ChevronsUpDown className="w-3 h-3 ml-1 opacity-50" />;
    return sortConfig.direction === 'desc' 
      ? <ChevronDown className="w-3 h-3 ml-1" />
      : <ChevronUp className="w-3 h-3 ml-1" />;
  };

  // Filtered and sorted stats
  const filteredAndSortedStats = useMemo(() => {
    let filtered = [...stats];
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(stat => 
        stat.player?.name?.toLowerCase().includes(query)
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortConfig.key) {
        case 'name':
          aVal = a.player?.name || '';
          bVal = b.player?.name || '';
          break;
        case 'jersey':
          aVal = parseInt(a.player?.profile?.sports_info?.jersey_number) || 999;
          bVal = parseInt(b.player?.profile?.sports_info?.jersey_number) || 999;
          break;
        default:
          aVal = a[sortConfig.key] || 0;
          bVal = b[sortConfig.key] || 0;
      }
      
      if (sortConfig.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
    
    return filtered;
  }, [stats, searchQuery, sortConfig]);

  // Calculate standings with or without bonus/penalty
  const calculatedStandings = useMemo(() => {
    if (!standings.length) return [];
    
    return standings.map(row => {
      const basePoints = (row.won * 3) + row.drawn;
      const totalPoints = includeBonusPenalty 
        ? basePoints + (row.bonus || 0) - (row.penalty || 0)
        : basePoints;
      
      return {
        ...row,
        points: totalPoints,
        goal_diff: row.goals_for - row.goals_against
      };
    }).sort((a, b) => {
      // Sort by points, then goal difference, then goals for
      if (b.points !== a.points) return b.points - a.points;
      if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
      return b.goals_for - a.goals_for;
    });
  }, [standings, includeBonusPenalty]);

  // Get last 5 completed matches for the selected team (club matches only - exclude external matches)
  const getRecentResults = () => {
    const teamName = currentTeam?.name;
    if (!teamName) return [];
    
    return matches
      .filter(m => m.is_completed && m.is_club_match !== false) // Only club matches
      .sort((a, b) => new Date(b.match_date) - new Date(a.match_date))
      .slice(0, 5)
      .map(m => {
        const isHome = m.location === 'casa';
        const ourGoals = isHome ? m.home_score : m.away_score;
        const theirGoals = isHome ? m.away_score : m.home_score;
        let result = 'E';
        if (ourGoals > theirGoals) result = 'V';
        else if (ourGoals < theirGoals) result = 'D';
        return { result, match: m };
      });
  };

  // Calculate goals conceded from standings
  const getGoalsConceded = () => {
    const teamName = currentTeam?.name;
    if (!teamName || standings.length === 0) return 0;
    const teamStanding = standings.find(s => s.team === teamName);
    return teamStanding?.goals_against || 0;
  };

  // Calculate team totals
  const teamTotals = stats.reduce((acc, s) => ({
    games: acc.games + (s.games_played || 0),
    goals: acc.goals + (s.goals || 0),
    assists: acc.assists + (s.assists || 0),
    yellows: acc.yellows + (s.yellow_cards || 0),
    blues: acc.blues + (s.blue_cards || 0),
    whites: acc.whites + (s.white_cards || 0),
    reds: acc.reds + (s.red_cards || 0),
    saves: acc.saves + (s.saves || 0),
    penalties_scored: acc.penalties_scored + (s.penalties_scored || 0),
    penalties_missed: acc.penalties_missed + (s.penalties_missed || 0),
    free_kicks_scored: acc.free_kicks_scored + (s.free_kicks_scored || 0),
    free_kicks_missed: acc.free_kicks_missed + (s.free_kicks_missed || 0)
  }), { games: 0, goals: 0, assists: 0, yellows: 0, blues: 0, whites: 0, reds: 0, saves: 0, 
        penalties_scored: 0, penalties_missed: 0, free_kicks_scored: 0, free_kicks_missed: 0 });

  // Top scorers and assists
  const topScorers = [...stats].sort((a, b) => (b.goals || 0) - (a.goals || 0)).slice(0, 5);
  const topAssists = [...stats].sort((a, b) => (b.assists || 0) - (a.assists || 0)).slice(0, 5);
  
  // Top goalkeepers (most saves) - only players with GR position
  const topGoalkeepers = [...stats]
    .filter(s => {
      const position = s.player?.profile?.sports_info?.position?.toLowerCase() || '';
      return position.includes('gr') || position.includes('guarda') || position.includes('redes');
    })
    .sort((a, b) => (b.saves || 0) - (a.saves || 0))
    .slice(0, 3);
  
  // Cards stats
  const cardsStats = {
    blue: [...stats].sort((a, b) => (b.blue_cards || 0) - (a.blue_cards || 0)).slice(0, 5),
    yellow: [...stats].sort((a, b) => (b.yellow_cards || 0) - (a.yellow_cards || 0)).slice(0, 5),
    red: [...stats].sort((a, b) => (b.red_cards || 0) - (a.red_cards || 0)).slice(0, 5),
    white: [...stats].sort((a, b) => (b.white_cards || 0) - (a.white_cards || 0)).slice(0, 5)
  };
  
  // Set pieces stats
  const setPiecesStats = {
    penalties_scored: [...stats].sort((a, b) => (b.penalties_scored || 0) - (a.penalties_scored || 0)).slice(0, 5),
    penalties_saved: [...stats].sort((a, b) => (b.penalties_saved || 0) - (a.penalties_saved || 0)).slice(0, 5),
    free_kicks_scored: [...stats].sort((a, b) => (b.free_kicks_scored || 0) - (a.free_kicks_scored || 0)).slice(0, 5),
    free_kicks_saved: [...stats].sort((a, b) => (b.free_kicks_saved || 0) - (a.free_kicks_saved || 0)).slice(0, 5)
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="stats-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl text-foreground tracking-wide flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            ESTATÍSTICAS
          </h1>
          <p className="text-muted-foreground mt-1">Desempenho da equipa e jogadores</p>
        </div>
      </div>

      {teams.length === 0 ? (
        <Card className="border border-border">
          <CardContent className="py-16 text-center">
            <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading text-xl mb-2">Sem Equipas</h3>
            <p className="text-muted-foreground mb-4">Crie uma equipa para ver as estatísticas</p>
            <Button asChild>
              <Link to="/teams">Criar Equipa</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-lg tracking-wide flex items-center gap-2">
                <Filter className="w-5 h-5" />
                FILTROS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger data-testid="team-filter">
                    <SelectValue placeholder="Equipa" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                  <SelectTrigger data-testid="season-filter">
                    <SelectValue placeholder="Época" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {seasons.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedChampionshipId} onValueChange={(v) => { setSelectedChampionshipId(v); fetchStats(); }}>
                  <SelectTrigger data-testid="championship-filter">
                    <SelectValue placeholder="Campeonato" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">Todos os campeonatos</SelectItem>
                    {championships.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Team Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border border-border bg-secondary/5">
              <CardContent className="p-4 text-center">
                <Trophy className="w-8 h-8 text-secondary mx-auto mb-2" />
                <p className="text-3xl font-heading font-mono text-secondary">{teamTotals.goals}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Golos Marcados</p>
              </CardContent>
            </Card>
            <Card className="border border-border bg-destructive/5">
              <CardContent className="p-4 text-center">
                <Shield className="w-8 h-8 text-destructive mx-auto mb-2" />
                <p className="text-3xl font-heading font-mono text-destructive">{getGoalsConceded()}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Golos Sofridos</p>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-4 text-center">
                <Target className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-3xl font-heading font-mono">{teamTotals.assists}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Assistências</p>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-3xl font-heading font-mono">{stats.length}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Jogadores</p>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-3xl font-heading font-mono">{teamTotals.games}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Jogos</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Results Sequence */}
          {selectedChampionshipId !== 'all' && getRecentResults().length > 0 && (
            <Card className="border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-lg tracking-wide">ÚLTIMOS 5 JOGOS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 flex-wrap">
                  {getRecentResults().map((r, idx) => (
                    <button
                      key={idx}
                      onClick={() => navigate(`/championships/${selectedChampionshipId}/matches/${r.match.id}/stats`)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-transform hover:scale-110 cursor-pointer ${
                        r.result === 'V' ? 'bg-green-500 hover:bg-green-600' :
                        r.result === 'D' ? 'bg-red-500 hover:bg-red-600' :
                        'bg-amber-500 hover:bg-amber-600'
                      }`}
                      title={`${r.match.opponent_team} (${r.match.home_score}-${r.match.away_score})`}
                    >
                      {r.result}
                    </button>
                  ))}
                  <span className="text-sm text-muted-foreground ml-2">
                    (clique para ver o jogo)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  V = Vitória | E = Empate | D = Derrota
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tabs: Players / Standings */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 w-full max-w-md">
              <TabsTrigger value="players" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Jogadores
              </TabsTrigger>
              <TabsTrigger value="standings" className="flex items-center gap-2">
                <Medal className="w-4 h-4" />
                Classificação
              </TabsTrigger>
            </TabsList>

            {/* Players Tab */}
            <TabsContent value="players">
              <div className="space-y-6">
                {/* Search and filters */}
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Pesquisar jogador por nome..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="player-search"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Full Stats Table */}
                  <Card className="lg:col-span-2 border border-border">
                    <CardHeader>
                      <CardTitle className="font-heading text-xl tracking-wide">
                        ESTATÍSTICAS INDIVIDUAIS
                      </CardTitle>
                      {currentChampionship && (
                        <CardDescription>{currentChampionship.name} - {selectedSeason}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      {stats.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table className="stats-table">
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead 
                                  className="text-center w-12 cursor-pointer hover:bg-muted"
                                  onClick={() => handleSort('jersey')}
                                >
                                  <div className="flex items-center justify-center">
                                    N.º {getSortIcon('jersey')}
                                  </div>
                                </TableHead>
                                <TableHead 
                                  className="cursor-pointer hover:bg-muted"
                                  onClick={() => handleSort('name')}
                                >
                                  <div className="flex items-center">
                                    Nome {getSortIcon('name')}
                                  </div>
                                </TableHead>
                                <TableHead 
                                  className="text-center w-10 cursor-pointer hover:bg-muted" 
                                  title="Golos"
                                  onClick={() => handleSort('goals')}
                                >
                                  <div className="flex items-center justify-center">
                                    G {getSortIcon('goals')}
                                  </div>
                                </TableHead>
                                <TableHead 
                                  className="text-center w-10 cursor-pointer hover:bg-muted" 
                                  title="Assistências para Golo"
                                  onClick={() => handleSort('assists')}
                                >
                                  <div className="flex items-center justify-center">
                                    AG {getSortIcon('assists')}
                                  </div>
                                </TableHead>
                                <TableHead 
                                  className="text-center w-10 cursor-pointer hover:bg-muted" 
                                  title="Defesas"
                                  onClick={() => handleSort('saves')}
                                >
                                  <div className="flex items-center justify-center">
                                    D {getSortIcon('saves')}
                                  </div>
                                </TableHead>
                                <TableHead className="text-center w-16" title="Penáltis (Marcados/Tentativas)">Pe</TableHead>
                                <TableHead className="text-center w-16" title="Livres Diretos (Marcados/Tentativas)">LD</TableHead>
                                <TableHead 
                                  className="text-center w-10 cursor-pointer hover:bg-muted" 
                                  title="Cartão Azul"
                                  onClick={() => handleSort('blue_cards')}
                                >
                                  <div className="w-4 h-5 bg-blue-500 border border-blue-700 rounded-sm mx-auto" />
                                </TableHead>
                                <TableHead 
                                  className="text-center w-10 cursor-pointer hover:bg-muted" 
                                  title="Cartão Amarelo"
                                  onClick={() => handleSort('yellow_cards')}
                                >
                                  <div className="w-4 h-5 bg-yellow-400 border border-yellow-600 rounded-sm mx-auto" />
                                </TableHead>
                                <TableHead 
                                  className="text-center w-10 cursor-pointer hover:bg-muted" 
                                  title="Cartão Vermelho"
                                  onClick={() => handleSort('red_cards')}
                                >
                                  <div className="w-4 h-5 bg-red-600 border border-red-800 rounded-sm mx-auto" />
                                </TableHead>
                                <TableHead 
                                  className="text-center w-10 cursor-pointer hover:bg-muted" 
                                  title="Cartão Branco"
                                  onClick={() => handleSort('white_cards')}
                                >
                                  <div className="w-4 h-5 bg-white border border-gray-400 rounded-sm mx-auto" />
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredAndSortedStats.map((stat, index) => {
                                const jerseyNumber = stat.player?.profile?.sports_info?.jersey_number || '-';
                                const playerName = stat.player?.name || 'Jogador';
                                const position = stat.player?.profile?.sports_info?.position?.toLowerCase() || '';
                                const isGoalkeeper = position.includes('gr') || position.includes('guarda') || position.includes('redes');
                                // Calculate penalties and free kicks totals
                                const penaltiesScored = stat.penalties_scored || 0;
                                const penaltiesMissed = stat.penalties_missed || 0;
                                const penaltiesTotal = penaltiesScored + penaltiesMissed;
                                const freeKicksScored = stat.free_kicks_scored || stat.direct_free_kicks || 0;
                                const freeKicksMissed = stat.free_kicks_missed || 0;
                                const freeKicksTotal = freeKicksScored + freeKicksMissed;
                                
                                return (
                                  <TableRow key={stat.player_id || index} className={isGoalkeeper ? 'bg-blue-50 dark:bg-blue-950/30' : ''}>
                                    <TableCell className="text-center font-mono font-semibold">{jerseyNumber}</TableCell>
                                    <TableCell>
                                      <Link 
                                        to={`/players/${stat.player_id}`}
                                        className="hover:text-primary transition-colors font-medium"
                                      >
                                        {playerName}
                                        {isGoalkeeper && (
                                          <Badge variant="outline" className="ml-2 text-xs">GR</Badge>
                                        )}
                                      </Link>
                                    </TableCell>
                                    <TableCell className="text-center font-mono font-bold text-secondary">
                                      {stat.goals || 0}
                                    </TableCell>
                                    <TableCell className="text-center font-mono text-muted-foreground">
                                      {stat.assists || 0}
                                    </TableCell>
                                    <TableCell className="text-center font-mono">
                                      {isGoalkeeper ? (stat.saves || 0) : '-'}
                                    </TableCell>
                                    <TableCell className="text-center font-mono text-sm">
                                      {penaltiesTotal > 0 ? `${penaltiesScored}/${penaltiesTotal}` : '-'}
                                    </TableCell>
                                    <TableCell className="text-center font-mono text-sm">
                                      {freeKicksTotal > 0 ? `${freeKicksScored}/${freeKicksTotal}` : '-'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {(stat.blue_cards || 0) > 0 && (
                                        <div className="w-4 h-5 bg-blue-500 border border-blue-700 rounded-sm mx-auto flex items-center justify-center text-[10px] font-bold text-white">
                                          {stat.blue_cards}
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {(stat.yellow_cards || 0) > 0 && (
                                        <div className="w-4 h-5 bg-yellow-400 border border-yellow-600 rounded-sm mx-auto flex items-center justify-center text-[10px] font-bold text-yellow-900">
                                          {stat.yellow_cards}
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {(stat.red_cards || 0) > 0 && (
                                        <div className="w-4 h-5 bg-red-600 border border-red-800 rounded-sm mx-auto flex items-center justify-center text-[10px] font-bold text-white">
                                          {stat.red_cards}
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {(stat.white_cards || 0) > 0 && (
                                        <div className="w-4 h-5 bg-white border border-gray-400 rounded-sm mx-auto flex items-center justify-center text-[10px] font-bold text-gray-700">
                                          {stat.white_cards}
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-muted-foreground">Sem estatísticas registadas</p>
                        </div>
                      )}
                      {searchQuery && filteredAndSortedStats.length === 0 && stats.length > 0 && (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">Nenhum jogador encontrado para "{searchQuery}"</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-4">
                        N.º = Número | G = Golos | AG = Assistências | D = Defesas | Pe = Penáltis | LD = Livres Diretos | Clique nos cabeçalhos para ordenar
                      </p>
                    </CardContent>
                  </Card>

                  {/* Top Performers */}
                  <div className="space-y-6">
                    {/* Top Scorers */}
                    <Card className="border border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="font-heading text-lg tracking-wide flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-secondary" />
                          MELHORES MARCADORES
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {topScorers.length > 0 && topScorers.some(s => s.goals > 0) ? (
                          <div className="space-y-3">
                            {topScorers.filter(s => s.goals > 0).map((stat, index) => (
                              <div key={stat.player_id} className="flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                  index === 1 ? 'bg-slate-300 text-slate-700' :
                                  index === 2 ? 'bg-amber-600 text-white' :
                                  'bg-muted text-muted-foreground'
                                }`}>
                                  {index + 1}
                                </span>
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(stat.player?.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{stat.player?.name}</p>
                                </div>
                                <span className="font-heading text-lg text-secondary">{stat.goals || 0}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm text-center py-4">Sem dados</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Top Assists - renamed from "Melhores Assistências" */}
                    <Card className="border border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="font-heading text-lg tracking-wide flex items-center gap-2">
                          <Target className="w-5 h-5 text-primary" />
                          MAIS ASSISTÊNCIAS
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {topAssists.length > 0 && topAssists.some(s => s.assists > 0) ? (
                          <div className="space-y-3">
                            {topAssists.filter(s => s.assists > 0).map((stat, index) => (
                              <div key={stat.player_id} className="flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                  index === 1 ? 'bg-slate-300 text-slate-700' :
                                  index === 2 ? 'bg-amber-600 text-white' :
                                  'bg-muted text-muted-foreground'
                                }`}>
                                  {index + 1}
                                </span>
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(stat.player?.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{stat.player?.name}</p>
                                </div>
                                <span className="font-heading text-lg text-primary">{stat.assists || 0}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm text-center py-4">Sem dados</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Top Goalkeepers */}
                    {topGoalkeepers.length > 0 && topGoalkeepers.some(s => s.saves > 0) && (
                      <Card className="border border-border bg-blue-50/50 dark:bg-blue-950/20">
                        <CardHeader className="pb-2">
                          <CardTitle className="font-heading text-lg tracking-wide flex items-center gap-2">
                            <Hand className="w-5 h-5 text-blue-500" />
                            MELHORES GUARDA-REDES
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {topGoalkeepers.filter(s => s.saves > 0).map((stat, index) => (
                              <div key={stat.player_id} className="flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                  index === 1 ? 'bg-slate-300 text-slate-700' :
                                  index === 2 ? 'bg-amber-600 text-white' :
                                  'bg-muted text-muted-foreground'
                                }`}>
                                  {index + 1}
                                </span>
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="text-xs bg-blue-100">
                                    {getInitials(stat.player?.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{stat.player?.name}</p>
                                </div>
                                <span className="font-heading text-lg text-blue-500">{stat.saves || 0}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                {/* Cards Statistics Section */}
                <Card className="border border-border">
                  <CardHeader>
                    <CardTitle className="font-heading text-xl tracking-wide">
                      DISCIPLINA - CARTÕES
                    </CardTitle>
                    <CardDescription>Cartões azuis, amarelos, vermelhos e brancos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Blue Cards */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-6 bg-blue-500 border border-blue-700 rounded-sm" />
                          <span className="font-medium">Azuis ({teamTotals.blues})</span>
                        </div>
                        {cardsStats.blue.filter(s => s.blue_cards > 0).length > 0 ? (
                          cardsStats.blue.filter(s => s.blue_cards > 0).slice(0, 3).map((stat, idx) => (
                            <div key={stat.player_id} className="flex items-center justify-between text-sm">
                              <span className="truncate">{stat.player?.name}</span>
                              <Badge variant="outline">{stat.blue_cards}</Badge>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">Sem cartões</p>
                        )}
                      </div>

                      {/* Yellow Cards */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-6 bg-yellow-400 border border-yellow-600 rounded-sm" />
                          <span className="font-medium">Amarelos ({teamTotals.yellows})</span>
                        </div>
                        {cardsStats.yellow.filter(s => s.yellow_cards > 0).length > 0 ? (
                          cardsStats.yellow.filter(s => s.yellow_cards > 0).slice(0, 3).map((stat, idx) => (
                            <div key={stat.player_id} className="flex items-center justify-between text-sm">
                              <span className="truncate">{stat.player?.name}</span>
                              <Badge variant="outline">{stat.yellow_cards}</Badge>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">Sem cartões</p>
                        )}
                      </div>

                      {/* Red Cards */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-6 bg-red-600 border border-red-800 rounded-sm" />
                          <span className="font-medium">Vermelhos ({teamTotals.reds})</span>
                        </div>
                        {cardsStats.red.filter(s => s.red_cards > 0).length > 0 ? (
                          cardsStats.red.filter(s => s.red_cards > 0).slice(0, 3).map((stat, idx) => (
                            <div key={stat.player_id} className="flex items-center justify-between text-sm">
                              <span className="truncate">{stat.player?.name}</span>
                              <Badge variant="outline">{stat.red_cards}</Badge>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">Sem cartões</p>
                        )}
                      </div>

                      {/* White Cards */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-6 bg-white border border-gray-400 rounded-sm" />
                          <span className="font-medium">Brancos ({teamTotals.whites})</span>
                        </div>
                        {cardsStats.white.filter(s => s.white_cards > 0).length > 0 ? (
                          cardsStats.white.filter(s => s.white_cards > 0).slice(0, 3).map((stat, idx) => (
                            <div key={stat.player_id} className="flex items-center justify-between text-sm">
                              <span className="truncate">{stat.player?.name}</span>
                              <Badge variant="outline">{stat.white_cards}</Badge>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">Sem cartões</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Set Pieces Statistics Section */}
                <Card className="border border-border">
                  <CardHeader>
                    <CardTitle className="font-heading text-xl tracking-wide flex items-center gap-2">
                      <Goal className="w-6 h-6 text-amber-500" />
                      BOLAS PARADAS
                    </CardTitle>
                    <CardDescription>Penáltis e livres diretos - marcados e defendidos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Penalties Scored */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Penáltis Marcados
                          </Badge>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {teamTotals.penalties_scored}/{teamTotals.penalties_scored + teamTotals.penalties_missed}
                        </div>
                        {setPiecesStats.penalties_scored.filter(s => s.penalties_scored > 0).length > 0 ? (
                          setPiecesStats.penalties_scored.filter(s => s.penalties_scored > 0).slice(0, 3).map((stat) => (
                            <div key={stat.player_id} className="flex items-center justify-between text-sm">
                              <span className="truncate">{stat.player?.name}</span>
                              <span className="font-mono">{stat.penalties_scored}/{(stat.penalties_scored || 0) + (stat.penalties_missed || 0)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">Sem dados</p>
                        )}
                      </div>

                      {/* Free Kicks Scored */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Livres Marcados
                          </Badge>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {teamTotals.free_kicks_scored}/{teamTotals.free_kicks_scored + teamTotals.free_kicks_missed}
                        </div>
                        {setPiecesStats.free_kicks_scored.filter(s => s.free_kicks_scored > 0).length > 0 ? (
                          setPiecesStats.free_kicks_scored.filter(s => s.free_kicks_scored > 0).slice(0, 3).map((stat) => (
                            <div key={stat.player_id} className="flex items-center justify-between text-sm">
                              <span className="truncate">{stat.player?.name}</span>
                              <span className="font-mono">{stat.free_kicks_scored}/{(stat.free_kicks_scored || 0) + (stat.free_kicks_missed || 0)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">Sem dados</p>
                        )}
                      </div>

                      {/* Penalties Saved (GK) */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Penáltis Defendidos
                          </Badge>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          {stats.reduce((acc, s) => acc + (s.penalties_saved || 0), 0)}
                        </div>
                        {setPiecesStats.penalties_saved.filter(s => s.penalties_saved > 0).length > 0 ? (
                          setPiecesStats.penalties_saved.filter(s => s.penalties_saved > 0).slice(0, 3).map((stat) => (
                            <div key={stat.player_id} className="flex items-center justify-between text-sm">
                              <span className="truncate">{stat.player?.name}</span>
                              <span className="font-mono">{stat.penalties_saved}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">Sem dados</p>
                        )}
                      </div>

                      {/* Free Kicks Saved (GK) */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Livres Defendidos
                          </Badge>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          {stats.reduce((acc, s) => acc + (s.free_kicks_saved || 0), 0)}
                        </div>
                        {setPiecesStats.free_kicks_saved.filter(s => s.free_kicks_saved > 0).length > 0 ? (
                          setPiecesStats.free_kicks_saved.filter(s => s.free_kicks_saved > 0).slice(0, 3).map((stat) => (
                            <div key={stat.player_id} className="flex items-center justify-between text-sm">
                              <span className="truncate">{stat.player?.name}</span>
                              <span className="font-mono">{stat.free_kicks_saved}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">Sem dados</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Standings Tab */}
            <TabsContent value="standings">
              <Card className="border border-border">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle className="font-heading text-xl tracking-wide flex items-center gap-2">
                        <Medal className="w-6 h-6 text-amber-500" />
                        CLASSIFICAÇÃO
                      </CardTitle>
                      {currentChampionship && (
                        <CardDescription>{currentChampionship.name}</CardDescription>
                      )}
                    </div>
                    
                    {/* Toggle for bonus/penalty points */}
                    {selectedChampionshipId !== 'all' && standings.length > 0 && (
                      <div className="flex items-center space-x-2" data-testid="bonus-penalty-toggle">
                        <Switch
                          id="bonus-penalty"
                          checked={includeBonusPenalty}
                          onCheckedChange={setIncludeBonusPenalty}
                        />
                        <Label htmlFor="bonus-penalty" className="text-sm cursor-pointer">
                          Incluir Bónus/Penalizações
                        </Label>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedChampionshipId === 'all' ? (
                    <div className="text-center py-8">
                      <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Selecione um campeonato para ver a classificação</p>
                    </div>
                  ) : calculatedStandings.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Equipa</TableHead>
                            <TableHead className="text-center">J</TableHead>
                            <TableHead className="text-center">V</TableHead>
                            <TableHead className="text-center">E</TableHead>
                            <TableHead className="text-center">D</TableHead>
                            <TableHead className="text-center">GM</TableHead>
                            <TableHead className="text-center">GS</TableHead>
                            <TableHead className="text-center">DG</TableHead>
                            {includeBonusPenalty && (
                              <>
                                <TableHead className="text-center text-green-600" title="Bónus">B</TableHead>
                                <TableHead className="text-center text-red-600" title="Penalizações">P</TableHead>
                              </>
                            )}
                            <TableHead className="text-center font-bold">Pts</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {calculatedStandings.map((row, index) => (
                            <TableRow 
                              key={row.team} 
                              className={row.team === currentTeam?.name ? 'bg-primary/5 font-semibold' : ''}
                            >
                              <TableCell className="font-bold">{index + 1}</TableCell>
                              <TableCell>
                                {row.team === currentTeam?.name && <Trophy className="w-4 h-4 inline mr-2 text-primary" />}
                                {row.team}
                              </TableCell>
                              <TableCell className="text-center">{row.played}</TableCell>
                              <TableCell className="text-center text-secondary">{row.won}</TableCell>
                              <TableCell className="text-center">{row.drawn}</TableCell>
                              <TableCell className="text-center text-destructive">{row.lost}</TableCell>
                              <TableCell className="text-center">{row.goals_for}</TableCell>
                              <TableCell className="text-center">{row.goals_against}</TableCell>
                              <TableCell className="text-center font-mono">
                                {row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff}
                              </TableCell>
                              {includeBonusPenalty && (
                                <>
                                  <TableCell className="text-center text-green-600">
                                    {row.bonus > 0 ? `+${row.bonus}` : '-'}
                                  </TableCell>
                                  <TableCell className="text-center text-red-600">
                                    {row.penalty > 0 ? `-${row.penalty}` : '-'}
                                  </TableCell>
                                </>
                              )}
                              <TableCell className="text-center font-bold text-lg">{row.points}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Medal className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Sem dados de classificação</p>
                      <p className="text-sm text-muted-foreground">Adicione resultados aos jogos do campeonato</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-4">
                    J=Jogos | V=Vitórias (3pts) | E=Empates (1pt) | D=Derrotas | GM=Golos Marcados | GS=Golos Sofridos | DG=Diferença
                    {includeBonusPenalty && ' | B=Bónus | P=Penalizações'}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
