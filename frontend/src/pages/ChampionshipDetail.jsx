import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { championshipsApi, teamsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
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
import { toast } from 'sonner';
import { 
  ArrowLeft, Trophy, Plus, Loader2, Calendar, MapPin, Home, Plane, 
  Target, Edit, Check, X, Trash2, Users, Zap, FileSpreadsheet, Download, ExternalLink,
  LayoutGrid, BarChart3
} from 'lucide-react';
import { formatDate, formatTime } from '../lib/utils';
import { MatchLineupEditor } from '../components/MatchLineupEditor';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ChampionshipDetail() {
  const { championshipId } = useParams();
  const { canManageEvents, token } = useAuth();
  const [championship, setChampionship] = useState(null);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [editMatchDialogOpen, setEditMatchDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [importing, setImporting] = useState(false);
  const [gamesheetUrl, setGamesheetUrl] = useState('');
  const [lineupDialogOpen, setLineupDialogOpen] = useState(false);
  const [lineupMatch, setLineupMatch] = useState(null);
  
  const [matchForm, setMatchForm] = useState({
    home_team: '',
    opponent_team: '',
    match_date: '',
    location: 'casa',
    venue: '',
    is_club_match: true,
    bonus_points: 0,
    penalty_points: 0
  });
  
  const [resultForm, setResultForm] = useState({
    home_score: 0,
    away_score: 0,
    bonus_points: 0,
    penalty_points: 0
  });

  useEffect(() => {
    fetchData();
  }, [championshipId]);

  const fetchData = async () => {
    try {
      const [champRes, matchesRes, standingsRes] = await Promise.all([
        championshipsApi.getOne(championshipId),
        championshipsApi.getMatches(championshipId),
        championshipsApi.getStandings(championshipId)
      ]);
      
      setChampionship(champRes.data);
      setMatches(matchesRes.data);
      setStandings(standingsRes.data);
      
      // Get team info
      const teamRes = await teamsApi.getOne(champRes.data.team_id);
      setTeam(teamRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const matchData = {
        ...matchForm,
        championship_id: championshipId,
        match_date: new Date(matchForm.match_date).toISOString(),
        home_team: matchForm.is_club_match ? team?.name : matchForm.home_team,
      };
      
      await championshipsApi.createMatch(championshipId, matchData);
      toast.success('Jogo adicionado!');
      setMatchDialogOpen(false);
      setMatchForm({ home_team: '', opponent_team: '', match_date: '', location: 'casa', venue: '', is_club_match: true, bonus_points: 0, penalty_points: 0 });
      fetchData();
    } catch (error) {
      toast.error('Erro ao adicionar jogo');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateResult = async (e) => {
    e.preventDefault();
    if (!selectedMatch) return;
    setCreating(true);

    try {
      await championshipsApi.updateMatchResult(selectedMatch.id, resultForm);
      toast.success('Resultado atualizado!');
      setResultDialogOpen(false);
      setSelectedMatch(null);
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar resultado');
    } finally {
      setCreating(false);
    }
  };

  const openResultDialog = (match) => {
    setSelectedMatch(match);
    setResultForm({
      home_score: match.home_score || 0,
      away_score: match.away_score || 0,
      bonus_points: match.bonus_points || 0,
      penalty_points: match.penalty_points || 0
    });
    setResultDialogOpen(true);
  };

  const openEditMatchDialog = (match) => {
    setSelectedMatch(match);
    const matchDate = new Date(match.match_date);
    const localDatetime = matchDate.toISOString().slice(0, 16);
    setMatchForm({
      opponent_team: match.opponent_team,
      match_date: localDatetime,
      location: match.location,
      venue: match.venue || ''
    });
    setEditMatchDialogOpen(true);
  };

  const handleUpdateMatch = async (e) => {
    e.preventDefault();
    if (!selectedMatch) return;
    setCreating(true);

    try {
      await championshipsApi.updateMatch(selectedMatch.id, {
        ...matchForm,
        match_date: new Date(matchForm.match_date).toISOString()
      });
      toast.success('Jogo atualizado!');
      setEditMatchDialogOpen(false);
      setSelectedMatch(null);
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar jogo');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteMatch = async (matchId) => {
    if (!confirm('Tem a certeza que quer eliminar este jogo? Esta ação é irreversível.')) return;
    setDeleting(matchId);

    try {
      await championshipsApi.deleteMatch(matchId);
      toast.success('Jogo eliminado!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao eliminar jogo');
    } finally {
      setDeleting(null);
    }
  };

  const openImportDialog = (match) => {
    setSelectedMatch(match);
    setGamesheetUrl(match.gamesheet_url || '');
    setImportDialogOpen(true);
  };

  const handleImportGamesheet = async () => {
    if (!gamesheetUrl || !selectedMatch) {
      toast.error('Insira o link da ficha de jogo');
      return;
    }
    setImporting(true);

    try {
      const response = await fetch(`${API_URL}/api/championships/matches/import-gamesheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          url: gamesheetUrl,
          match_id: selectedMatch.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao importar');
      }

      const data = await response.json();
      toast.success(`Importado! Resultado: ${data.result} | ${data.stats_updated} jogadores atualizados`);
      setImportDialogOpen(false);
      setSelectedMatch(null);
      setGamesheetUrl('');
      fetchData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setImporting(false);
    }
  };

  const getLocationIcon = (loc) => {
    if (loc === 'casa') return <Home className="w-4 h-4 text-secondary" />;
    if (loc === 'fora') return <Plane className="w-4 h-4 text-primary" />;
    return <Target className="w-4 h-4 text-muted-foreground" />;
  };

  const getLocationLabel = (loc) => {
    if (loc === 'casa') return 'Casa';
    if (loc === 'fora') return 'Fora';
    return 'Neutro';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!championship) {
    return (
      <div className="text-center py-16">
        <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Campeonato não encontrado</p>
        <Button asChild className="mt-4">
          <Link to="/championships">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="championship-detail-page">
      {/* Back Button */}
      <Link 
        to="/championships" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar aos Campeonatos
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-wide flex items-start gap-2">
            <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0 mt-1" />
            <span className="break-words">{championship.name}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">{championship.season}</Badge>
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <Users className="w-3 h-3" />
              {championship.format || '5x5'}
            </Badge>
            <Badge variant={championship.convocation_type === 'automatica' ? 'default' : 'outline'} className="flex items-center gap-1 text-xs whitespace-nowrap">
              <Zap className="w-3 h-3" />
              <span className="hidden sm:inline">{championship.convocation_type === 'automatica' ? 'Conv. Automática' : 'Conv. Manual'}</span>
              <span className="sm:hidden">{championship.convocation_type === 'automatica' ? 'Auto' : 'Manual'}</span>
            </Badge>
            <span className="text-muted-foreground text-sm truncate max-w-[150px] sm:max-w-none">{team?.name}</span>
          </div>
        </div>

        {canManageEvents && (
          <Button onClick={() => setMatchDialogOpen(true)} data-testid="add-match-btn" className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Jogo
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="matches" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="matches">Jogos ({matches.length})</TabsTrigger>
          <TabsTrigger value="standings">Classificação</TabsTrigger>
        </TabsList>

        {/* Matches Tab */}
        <TabsContent value="matches" className="space-y-4">
          {matches.length > 0 ? (
            <div className="space-y-3">
              {matches.map((match) => (
                <Card key={match.id} className="border border-border" data-testid={`match-${match.id}`}>
                  <CardContent className="p-3 sm:p-4">
                    {/* Mobile: Stack layout, Desktop: Row layout */}
                    <div className="flex flex-col gap-3">
                      {/* Date, Location and Teams */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="text-center min-w-[70px] sm:min-w-[80px]">
                            <p className="text-xs text-muted-foreground uppercase">
                              {formatDate(match.match_date)}
                            </p>
                            <p className="font-heading text-base sm:text-lg">{formatTime(match.match_date)}</p>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {getLocationIcon(match.location)}
                            <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5">
                              {getLocationLabel(match.location)}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                            <span className="font-semibold text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">
                              {match.is_club_match === false ? match.home_team : team?.name}
                            </span>
                            <span className="text-muted-foreground text-sm">vs</span>
                            <span className="font-semibold text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">
                              {match.opponent_team}
                            </span>
                            {match.is_club_match === false && (
                              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">Externo</Badge>
                            )}
                          </div>
                          {match.venue && (
                            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-1 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{match.venue}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Result and Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-end">
                        {match.is_completed ? (
                          <div className="flex items-center gap-2">
                            <div className="text-center px-3 py-1.5 sm:px-4 sm:py-2 bg-muted rounded-sm">
                              <span className="font-heading text-xl sm:text-2xl">
                                {match.is_club_match === false
                                  ? `${match.home_score} - ${match.away_score}`
                                  : match.location === 'casa' 
                                    ? `${match.home_score} - ${match.away_score}`
                                    : `${match.away_score} - ${match.home_score}`
                                }
                              </span>
                            </div>
                            {(match.bonus_points > 0 || match.penalty_points > 0) && (
                              <div className="text-xs">
                                {match.bonus_points > 0 && (
                                  <span className="text-secondary">+{match.bonus_points}</span>
                                )}
                                {match.penalty_points > 0 && (
                                  <span className="text-destructive ml-1">-{match.penalty_points}</span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-600 w-fit">
                            Por jogar
                          </Badge>
                        )}

                        {canManageEvents && (
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 px-2 sm:px-3"
                              onClick={() => openEditMatchDialog(match)}
                              data-testid={`edit-match-${match.id}`}
                            >
                              <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                              onClick={() => openResultDialog(match)}
                              data-testid={`edit-result-${match.id}`}
                            >
                              {match.is_completed ? 'Resultado' : 'Inserir'}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 px-2 sm:px-3"
                              onClick={() => openImportDialog(match)}
                              data-testid={`import-gamesheet-${match.id}`}
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 px-2 sm:px-3"
                              asChild
                            >
                              <Link to={`/championships/${championshipId}/matches/${match.id}/stats`}>
                                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </Link>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 px-2 sm:px-3"
                              onClick={() => {
                                setLineupMatch(match);
                                setLineupDialogOpen(true);
                              }}
                              data-testid={`lineup-${match.id}`}
                            >
                              <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 px-2 sm:px-3 text-destructive border-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteMatch(match.id)}
                              disabled={deleting === match.id}
                              data-testid={`delete-match-${match.id}`}
                            >
                              {deleting === match.id ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border border-border">
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum jogo agendado</p>
                {canManageEvents && (
                  <Button className="mt-4" onClick={() => setMatchDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Jogo
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Standings Tab */}
        <TabsContent value="standings">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="font-heading text-xl tracking-wide">CLASSIFICAÇÃO</CardTitle>
            </CardHeader>
            <CardContent>
              {standings.length > 0 ? (
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
                        <TableHead className="text-center">B</TableHead>
                        <TableHead className="text-center">P</TableHead>
                        <TableHead className="text-center font-bold">Pts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {standings.map((row, index) => (
                        <TableRow 
                          key={row.team} 
                          className={row.team === team?.name ? 'bg-primary/5' : ''}
                        >
                          <TableCell className="font-bold">{index + 1}</TableCell>
                          <TableCell className="font-semibold">
                            {row.team === team?.name && <Trophy className="w-4 h-4 inline mr-2 text-primary" />}
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
                          <TableCell className="text-center text-secondary">{row.bonus}</TableCell>
                          <TableCell className="text-center text-destructive">{row.penalty}</TableCell>
                          <TableCell className="text-center font-bold text-lg">{row.points}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Sem dados de classificação. Adicione resultados aos jogos.
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-4">
                J=Jogos | V=Vitórias (3pts) | E=Empates (1pt) | D=Derrotas | GM=Golos Marcados | GS=Golos Sofridos | DG=Diferença | B=Bónus | P=Penalização
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Match Dialog */}
      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl tracking-wide">ADICIONAR JOGO</DialogTitle>
            <DialogDescription>
              Agendar um novo jogo na competição
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateMatch}>
            <div className="space-y-4 py-4">
              {/* Tipo de Jogo */}
              <div className="space-y-2">
                <Label>Tipo de Jogo</Label>
                <Select
                  value={matchForm.is_club_match ? 'clube' : 'outros'}
                  onValueChange={(v) => setMatchForm({ ...matchForm, is_club_match: v === 'clube' })}
                >
                  <SelectTrigger data-testid="match-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="clube">Jogo da nossa equipa</SelectItem>
                    <SelectItem value="outros">Jogo entre outras equipas (classificação)</SelectItem>
                  </SelectContent>
                </Select>
                {!matchForm.is_club_match && (
                  <p className="text-xs text-muted-foreground">
                    Útil para registar jogos de outras equipas para manter a classificação correta.
                  </p>
                )}
              </div>

              {/* Equipa da Casa (só se for jogo entre outras equipas) */}
              {!matchForm.is_club_match && (
                <div className="space-y-2">
                  <Label>Equipa da Casa</Label>
                  <Input
                    placeholder="Nome da equipa"
                    value={matchForm.home_team}
                    onChange={(e) => setMatchForm({ ...matchForm, home_team: e.target.value })}
                    required
                    data-testid="match-home-team-input"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>{matchForm.is_club_match ? 'Equipa Adversária' : 'Equipa Visitante'}</Label>
                <Input
                  placeholder="Nome da equipa"
                  value={matchForm.opponent_team}
                  onChange={(e) => setMatchForm({ ...matchForm, opponent_team: e.target.value })}
                  required
                  data-testid="match-opponent-input"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data e Hora</Label>
                  <Input
                    type="datetime-local"
                    value={matchForm.match_date}
                    onChange={(e) => setMatchForm({ ...matchForm, match_date: e.target.value })}
                    required
                    data-testid="match-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Local</Label>
                  <Select
                    value={matchForm.location}
                    onValueChange={(v) => setMatchForm({ ...matchForm, location: v })}
                  >
                    <SelectTrigger data-testid="match-location-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="casa">Casa</SelectItem>
                      <SelectItem value="fora">Fora</SelectItem>
                      <SelectItem value="neutro">Campo Neutro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Pavilhão/Recinto (opcional)</Label>
                <Input
                  placeholder="Ex: Pavilhão Municipal"
                  value={matchForm.venue}
                  onChange={(e) => setMatchForm({ ...matchForm, venue: e.target.value })}
                  data-testid="match-venue-input"
                />
              </div>

              {/* Penalizações/Bonificações */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bonificação (pontos)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={matchForm.bonus_points}
                    onChange={(e) => setMatchForm({ ...matchForm, bonus_points: parseInt(e.target.value) || 0 })}
                    data-testid="match-bonus-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Penalização (pontos)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={matchForm.penalty_points}
                    onChange={(e) => setMatchForm({ ...matchForm, penalty_points: parseInt(e.target.value) || 0 })}
                    data-testid="match-penalty-input"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMatchDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating} data-testid="submit-match-btn">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Result Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl tracking-wide">RESULTADO DO JOGO</DialogTitle>
            <DialogDescription>
              {selectedMatch && `${team?.name} vs ${selectedMatch.opponent_team}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateResult}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{selectedMatch?.location === 'casa' ? team?.name : selectedMatch?.opponent_team}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={resultForm.home_score}
                    onChange={(e) => setResultForm({ ...resultForm, home_score: parseInt(e.target.value) || 0 })}
                    data-testid="home-score-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{selectedMatch?.location === 'casa' ? selectedMatch?.opponent_team : team?.name}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={resultForm.away_score}
                    onChange={(e) => setResultForm({ ...resultForm, away_score: parseInt(e.target.value) || 0 })}
                    data-testid="away-score-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pontos Bónus</Label>
                  <Input
                    type="number"
                    min="0"
                    value={resultForm.bonus_points}
                    onChange={(e) => setResultForm({ ...resultForm, bonus_points: parseInt(e.target.value) || 0 })}
                    data-testid="bonus-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pontos Penalização</Label>
                  <Input
                    type="number"
                    min="0"
                    value={resultForm.penalty_points}
                    onChange={(e) => setResultForm({ ...resultForm, penalty_points: parseInt(e.target.value) || 0 })}
                    data-testid="penalty-input"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResultDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating} data-testid="submit-result-btn">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Match Dialog */}
      <Dialog open={editMatchDialogOpen} onOpenChange={setEditMatchDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl tracking-wide">EDITAR JOGO</DialogTitle>
            <DialogDescription>
              Alterar detalhes do jogo
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateMatch}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Equipa Adversária</Label>
                <Input
                  placeholder="Nome da equipa"
                  value={matchForm.opponent_team}
                  onChange={(e) => setMatchForm({ ...matchForm, opponent_team: e.target.value })}
                  required
                  data-testid="edit-match-opponent-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Data e Hora</Label>
                <Input
                  type="datetime-local"
                  value={matchForm.match_date}
                  onChange={(e) => setMatchForm({ ...matchForm, match_date: e.target.value })}
                  required
                  data-testid="edit-match-date-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Local</Label>
                <Select
                  value={matchForm.location}
                  onValueChange={(v) => setMatchForm({ ...matchForm, location: v })}
                >
                  <SelectTrigger data-testid="edit-match-location-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="casa">Casa</SelectItem>
                    <SelectItem value="fora">Fora</SelectItem>
                    <SelectItem value="neutro">Campo Neutro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pavilhão/Recinto (opcional)</Label>
                <Input
                  placeholder="Ex: Pavilhão Municipal"
                  value={matchForm.venue}
                  onChange={(e) => setMatchForm({ ...matchForm, venue: e.target.value })}
                  data-testid="edit-match-venue-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditMatchDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating} data-testid="submit-edit-match-btn">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Gamesheet Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl tracking-wide flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-primary" />
              IMPORTAR FICHA DE JOGO
            </DialogTitle>
            <DialogDescription>
              Introduza o link da ficha de jogo oficial para importar automaticamente o resultado e estatísticas dos jogadores.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedMatch && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="font-medium">{team?.name} vs {selectedMatch.opponent_team}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedMatch.match_date && new Date(selectedMatch.match_date).toLocaleDateString('pt-PT')}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="gamesheet-url">Link da Ficha de Jogo</Label>
              <Input
                id="gamesheet-url"
                placeholder="https://aplisboa.assyssoftware.es/intranet/web/partido2.asp?id=..."
                value={gamesheetUrl}
                onChange={(e) => setGamesheetUrl(e.target.value)}
                data-testid="gamesheet-url-input"
              />
              <p className="text-xs text-muted-foreground">
                Cole o link completo da ficha de jogo da Associação de Patinagem
              </p>
            </div>

            {selectedMatch?.gamesheet_url && (
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-muted-foreground">Ficha já importada</span>
                <a 
                  href={selectedMatch.gamesheet_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  Ver <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>O que será importado:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-1 space-y-0.5">
                <li>• Resultado final do jogo</li>
                <li>• Golos e assistências de cada jogador</li>
                <li>• Cartões (amarelos, azuis, vermelhos)</li>
                <li>• Local e árbitros</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImportGamesheet} disabled={importing || !gamesheetUrl}>
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  A importar...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Importar Dados
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lineup Dialog */}
      <Dialog open={lineupDialogOpen} onOpenChange={setLineupDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-primary" />
              Line-up do Jogo
            </DialogTitle>
            <DialogDescription>
              {lineupMatch && (
                <>
                  {team?.name} vs {lineupMatch.opponent_team} - {formatDate(lineupMatch.match_date)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {lineupMatch && (
            <MatchLineupEditor 
              matchId={lineupMatch.id}
              teamId={championship?.team_id}
              onClose={() => {
                setLineupDialogOpen(false);
                setLineupMatch(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
