import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { championshipsApi, teamsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Skeleton } from '../components/ui/skeleton';
import { Checkbox } from '../components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2, User } from 'lucide-react';
import { getInitials, formatDate, formatTime } from '../lib/utils';

export default function MatchStats() {
  const { championshipId, matchId } = useParams();
  const { canManageEvents } = useAuth();
  const [match, setMatch] = useState(null);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [playerStats, setPlayerStats] = useState({});
  const [existingStats, setExistingStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [matchId]);

  const fetchData = async () => {
    try {
      const [matchesRes, existingRes] = await Promise.all([
        championshipsApi.getMatches(championshipId),
        championshipsApi.getMatchPlayerStats(matchId)
      ]);
      
      const currentMatch = matchesRes.data.find(m => m.id === matchId);
      if (currentMatch) {
        setMatch(currentMatch);
        
        const teamRes = await teamsApi.getOne(currentMatch.team_id);
        setTeam(teamRes.data);
        
        const membersRes = await teamsApi.getMembers(currentMatch.team_id);
        // Filter only players
        const players = membersRes.data.filter(m => 
          m.role === 'jogador' || 
          m.profile?.function === 'jogador' ||
          m.profile?.sports_info?.function === 'jogador'
        );
        setMembers(players);
        
        // Initialize player stats
        const initialStats = {};
        players.forEach(player => {
          const existing = existingRes.data.find(s => s.player_id === player.id);
          initialStats[player.id] = {
            started_match: existing?.started_match || false,
            goals: existing?.goals || 0,
            own_goals: existing?.own_goals || 0,
            saves: existing?.saves || 0,
            penalties_scored: existing?.penalties_scored || 0,
            penalties_missed: existing?.penalties_missed || 0,
            free_kicks_scored: existing?.free_kicks_scored || existing?.direct_free_kicks || 0,
            free_kicks_missed: existing?.free_kicks_missed || 0,
            yellow_cards: existing?.yellow_cards || 0,
            blue_cards: existing?.blue_cards || 0,
            red_cards: existing?.red_cards || 0
          };
        });
        setPlayerStats(initialStats);
        setExistingStats(existingRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleStatChange = (playerId, field, value) => {
    setPlayerStats(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: field === 'started_match' ? value : (parseInt(value) || 0)
      }
    }));
  };

  const handleSaveStats = async () => {
    setSaving(true);
    try {
      for (const [playerId, stats] of Object.entries(playerStats)) {
        // Check if stats have any non-zero values
        const hasStats = stats.started_match || 
          stats.goals > 0 || 
          stats.own_goals > 0 || 
          stats.saves > 0 || 
          stats.penalties_scored > 0 ||
          stats.penalties_missed > 0 ||
          stats.free_kicks_scored > 0 ||
          stats.free_kicks_missed > 0 ||
          stats.yellow_cards > 0 ||
          stats.blue_cards > 0 ||
          stats.red_cards > 0;
        
        if (hasStats) {
          await championshipsApi.savePlayerMatchStats(matchId, playerId, {
            started_match: stats.started_match,
            goals: stats.goals || 0,
            own_goals: stats.own_goals || 0,
            saves: stats.saves || 0,
            penalties_scored: stats.penalties_scored || 0,
            penalties_missed: stats.penalties_missed || 0,
            free_kicks_scored: stats.free_kicks_scored || 0,
            free_kicks_missed: stats.free_kicks_missed || 0,
            direct_free_kicks: stats.free_kicks_scored || 0, // Also save as direct_free_kicks for compatibility
            yellow_cards: stats.yellow_cards || 0,
            blue_cards: stats.blue_cards || 0,
            red_cards: stats.red_cards || 0
          });
        }
      }
      toast.success('Estatísticas guardadas!');
    } catch (error) {
      toast.error('Erro ao guardar estatísticas');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Jogo não encontrado</p>
        <Button asChild className="mt-4">
          <Link to={`/championships/${championshipId}`}>Voltar</Link>
        </Button>
      </div>
    );
  }

  // Show message for external matches (matches without club teams)
  if (match.is_club_match === false) {
    return (
      <div className="space-y-6" data-testid="match-stats-page">
        {/* Back Button */}
        <Link 
          to={`/championships/${championshipId}`}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar à Competição
        </Link>

        <Card className="border border-border">
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-heading text-xl mb-2">JOGO EXTERNO</h2>
            <p className="text-muted-foreground mb-2">
              {match.home_team} vs {match.opponent_team}
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <Badge variant="outline">{formatDate(match.match_date)}</Badge>
              {match.venue && <Badge variant="outline">{match.venue}</Badge>}
              {match.is_completed && (
                <Badge className="bg-secondary text-primary-foreground">
                  {match.home_score} - {match.away_score}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              As estatísticas de jogadores não estão disponíveis para jogos entre outras equipas.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="match-stats-page">
      {/* Back Button */}
      <Link 
        to={`/championships/${championshipId}`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar à Competição
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl text-foreground tracking-wide">
            ESTATÍSTICAS DO JOGO
          </h1>
          <p className="text-muted-foreground mt-1">
            {match.is_club_match === false 
              ? `${match.home_team} vs ${match.opponent_team}` 
              : `${team?.name} vs ${match.opponent_team}`
            }
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline">{formatDate(match.match_date)}</Badge>
            <Badge variant="outline">{formatTime(match.match_date)}</Badge>
            {match.is_completed && (
              <Badge className="bg-secondary text-primary-foreground">
                {match.home_score} - {match.away_score}
              </Badge>
            )}
          </div>
        </div>

        {canManageEvents && (
          <Button onClick={handleSaveStats} disabled={saving} data-testid="save-stats-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar Estatísticas
          </Button>
        )}
      </div>

      {/* Stats Table - Formato Boletim APL */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="font-heading text-xl tracking-wide">BOLETIM DE JOGO - ESTATÍSTICAS INDIVIDUAIS</CardTitle>
          <p className="text-xs text-muted-foreground mt-2">
            Formato oficial APLisboa • N.º = Número | 5I = 5 Iniciais | G = Golos | AG = Auto-Golos | D = Defesas | Pe = Penáltis (marcados/tentativas) | LD = Livres Diretos (marcados/tentativas)
          </p>
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center w-12">N.º</TableHead>
                    <TableHead className="text-center w-12" title="5 Iniciais">5I</TableHead>
                    <TableHead className="min-w-[150px]">Nome</TableHead>
                    <TableHead className="text-center w-12" title="Golos">G</TableHead>
                    <TableHead className="text-center w-12" title="Auto-Golos">AG</TableHead>
                    <TableHead className="text-center w-12" title="Defesas (Guarda-Redes)">D</TableHead>
                    <TableHead className="text-center w-20" title="Penáltis Marcados">PM</TableHead>
                    <TableHead className="text-center w-20" title="Penáltis Falhados">PF</TableHead>
                    <TableHead className="text-center w-20" title="Livres Diretos Marcados">LDM</TableHead>
                    <TableHead className="text-center w-20" title="Livres Diretos Falhados">LDF</TableHead>
                    <TableHead className="text-center w-10" title="Cartão Amarelo">
                      <div className="w-4 h-5 bg-yellow-400 border border-yellow-600 rounded-sm mx-auto" />
                    </TableHead>
                    <TableHead className="text-center w-10" title="Cartão Azul">
                      <div className="w-4 h-5 bg-blue-500 border border-blue-700 rounded-sm mx-auto" />
                    </TableHead>
                    <TableHead className="text-center w-10" title="Cartão Vermelho">
                      <div className="w-4 h-5 bg-red-600 border border-red-800 rounded-sm mx-auto" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((player) => {
                    const jerseyNumber = player.profile?.sports_info?.jersey_number || 
                                        player.profile?.jersey_number || '-';
                    const playerName = player.name || 'Jogador';
                    const isGoalkeeper = player.profile?.sports_info?.position?.toLowerCase()?.includes('guarda') || 
                                        player.profile?.sports_info?.position?.toLowerCase()?.includes('redes') ||
                                        player.profile?.position?.toLowerCase()?.includes('gr');
                    const stats = playerStats[player.id] || {};
                    
                    return (
                      <TableRow key={player.id} className={isGoalkeeper ? 'bg-blue-50 dark:bg-blue-950/30' : ''} data-testid={`player-row-${player.id}`}>
                        <TableCell className="text-center font-mono font-semibold">{jerseyNumber}</TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={stats.started_match || false}
                            onCheckedChange={(checked) => handleStatChange(player.id, 'started_match', checked)}
                            aria-label="5 Iniciais"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {getInitials(playerName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{playerName}</span>
                            {isGoalkeeper && <Badge variant="outline" className="text-xs">GR</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            className="h-8 w-12 text-center p-1 font-mono"
                            value={stats.goals || ''}
                            onChange={(e) => handleStatChange(player.id, 'goals', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            className="h-8 w-12 text-center p-1 font-mono"
                            value={stats.own_goals || ''}
                            onChange={(e) => handleStatChange(player.id, 'own_goals', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {isGoalkeeper ? (
                            <Input
                              type="number"
                              min="0"
                              className="h-8 w-12 text-center p-1 font-mono"
                              value={stats.saves || ''}
                              onChange={(e) => handleStatChange(player.id, 'saves', e.target.value)}
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            className="h-8 w-12 text-center p-1 font-mono"
                            value={stats.penalties_scored || ''}
                            onChange={(e) => handleStatChange(player.id, 'penalties_scored', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            className="h-8 w-12 text-center p-1 font-mono"
                            value={stats.penalties_missed || ''}
                            onChange={(e) => handleStatChange(player.id, 'penalties_missed', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            className="h-8 w-12 text-center p-1 font-mono"
                            value={stats.free_kicks_scored || ''}
                            onChange={(e) => handleStatChange(player.id, 'free_kicks_scored', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            className="h-8 w-12 text-center p-1 font-mono"
                            value={stats.free_kicks_missed || ''}
                            onChange={(e) => handleStatChange(player.id, 'free_kicks_missed', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            className="h-8 w-10 text-center p-1 font-mono bg-yellow-50"
                            value={stats.yellow_cards || ''}
                            onChange={(e) => handleStatChange(player.id, 'yellow_cards', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            className="h-8 w-10 text-center p-1 font-mono bg-blue-50"
                            value={stats.blue_cards || ''}
                            onChange={(e) => handleStatChange(player.id, 'blue_cards', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            className="h-8 w-10 text-center p-1 font-mono bg-red-50"
                            value={stats.red_cards || ''}
                            onChange={(e) => handleStatChange(player.id, 'red_cards', e.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum jogador na equipa</p>
            </div>
          )}
          
          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <strong>Legenda:</strong> N.º = Número da camisola | 5I = 5 Iniciais (titular) | G = Golos | AG = Auto-Golos | D = Defesas (GR) | PM = Penáltis Marcados | PF = Penáltis Falhados | LDM = Livres Diretos Marcados | LDF = Livres Diretos Falhados
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <strong>Nota:</strong> Na página de Estatísticas Gerais, Pe e LD aparecem no formato "marcados/tentativas" (ex: 2/3 significa 2 marcados em 3 tentativas)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
