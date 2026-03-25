import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { teamsApi, championshipsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  Medal
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
  const [teams, setTeams] = useState([]);
  const [championships, setChampionships] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('2025/2026');
  const [selectedChampionshipId, setSelectedChampionshipId] = useState('all');
  const [stats, setStats] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('players');

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
    } else {
      setStandings([]);
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

  const currentTeam = teams.find(t => t.id === selectedTeamId);
  const currentChampionship = championships.find(c => c.id === selectedChampionshipId);

  // Calculate team totals
  const teamTotals = stats.reduce((acc, s) => ({
    games: acc.games + (s.games_played || 0),
    goals: acc.goals + (s.goals || 0),
    assists: acc.assists + (s.assists || 0),
    yellows: acc.yellows + (s.yellow_cards || 0),
    blues: acc.blues + (s.blue_cards || 0),
    reds: acc.reds + (s.red_cards || 0),
    saves: acc.saves + (s.saves || 0)
  }), { games: 0, goals: 0, assists: 0, yellows: 0, blues: 0, reds: 0, saves: 0 });

  // Top scorers and assists
  const topScorers = [...stats].sort((a, b) => (b.goals || 0) - (a.goals || 0)).slice(0, 5);
  const topAssists = [...stats].sort((a, b) => (b.assists || 0) - (a.assists || 0)).slice(0, 5);

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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-border bg-secondary/5">
              <CardContent className="p-4 text-center">
                <Trophy className="w-8 h-8 text-secondary mx-auto mb-2" />
                <p className="text-3xl font-heading font-mono text-secondary">{teamTotals.goals}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Golos Marcados</p>
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
                            <TableRow>
                              <TableHead>Jogador</TableHead>
                              <TableHead className="text-center">J</TableHead>
                              <TableHead className="text-center">G</TableHead>
                              <TableHead className="text-center">A</TableHead>
                              <TableHead className="text-center">AM</TableHead>
                              <TableHead className="text-center">AZ</TableHead>
                              <TableHead className="text-center">V</TableHead>
                              <TableHead className="text-center">D</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stats.map((stat, index) => (
                              <TableRow key={stat.player_id || index}>
                                <TableCell>
                                  <Link 
                                    to={`/players/${stat.player_id}`}
                                    className="flex items-center gap-2 hover:text-primary transition-colors"
                                  >
                                    <Avatar className="w-8 h-8">
                                      <AvatarImage src={stat.player?.avatar_url} />
                                      <AvatarFallback className="text-xs bg-primary text-white">
                                        {getInitials(stat.player?.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{stat.player?.name || 'Jogador'}</span>
                                  </Link>
                                </TableCell>
                                <TableCell className="text-center font-mono">{stat.games_played || 0}</TableCell>
                                <TableCell className="text-center font-mono text-secondary font-semibold">{stat.goals || 0}</TableCell>
                                <TableCell className="text-center font-mono">{stat.assists || 0}</TableCell>
                                <TableCell className="text-center font-mono text-amber-600">{stat.yellow_cards || 0}</TableCell>
                                <TableCell className="text-center font-mono text-blue-600">{stat.blue_cards || 0}</TableCell>
                                <TableCell className="text-center font-mono text-destructive">{stat.red_cards || 0}</TableCell>
                                <TableCell className="text-center font-mono">{stat.saves || 0}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">Sem estatísticas registadas</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-4">
                      J = Jogos | G = Golos | A = Assistências | AM = Amarelos | AZ = Azuis | V = Vermelhos | D = Defesas
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

                  {/* Top Assists */}
                  <Card className="border border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-heading text-lg tracking-wide flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        MELHORES ASSISTÊNCIAS
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
                </div>
              </div>
            </TabsContent>

            {/* Standings Tab */}
            <TabsContent value="standings">
              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="font-heading text-xl tracking-wide flex items-center gap-2">
                    <Medal className="w-6 h-6 text-amber-500" />
                    CLASSIFICAÇÃO
                  </CardTitle>
                  {currentChampionship && (
                    <CardDescription>{currentChampionship.name}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {selectedChampionshipId === 'all' ? (
                    <div className="text-center py-8">
                      <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Selecione um campeonato para ver a classificação</p>
                    </div>
                  ) : standings.length > 0 ? (
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
                            <TableHead className="text-center font-bold">Pts</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {standings.map((row, index) => (
                            <TableRow 
                              key={row.team} 
                              className={row.team === selectedTeam?.name ? 'bg-primary/5 font-semibold' : ''}
                            >
                              <TableCell className="font-bold">{index + 1}</TableCell>
                              <TableCell>
                                {row.team === selectedTeam?.name && <Trophy className="w-4 h-4 inline mr-2 text-primary" />}
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
