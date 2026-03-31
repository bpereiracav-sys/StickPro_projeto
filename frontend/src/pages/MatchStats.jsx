import { useState, useEffect, useMemo } from 'react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2, User, Download, Link as LinkIcon, CheckCircle, AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [editingScore, setEditingScore] = useState(false);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

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
        setHomeScore(currentMatch.home_score?.toString() || '');
        setAwayScore(currentMatch.away_score?.toString() || '');
        
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

  // Calculate total goals from player stats
  const totalPlayerGoals = useMemo(() => {
    let goals = 0;
    let ownGoals = 0;
    Object.values(playerStats).forEach(stats => {
      goals += (stats.goals || 0);
      ownGoals += (stats.own_goals || 0);
    });
    return { goals, ownGoals };
  }, [playerStats]);

  // Check if there's an inconsistency between goals and result
  const goalsInconsistency = useMemo(() => {
    const resultHomeScore = parseInt(homeScore) || 0;
    const resultAwayScore = parseInt(awayScore) || 0;
    
    // Our team's goals = player goals + opponent own goals (counted for us)
    // Note: own_goals are goals our players scored against our team
    const expectedHomeGoals = totalPlayerGoals.goals;
    
    if (resultHomeScore !== expectedHomeGoals) {
      return {
        hasInconsistency: true,
        resultGoals: resultHomeScore,
        playerGoals: expectedHomeGoals,
        difference: expectedHomeGoals - resultHomeScore
      };
    }
    return { hasInconsistency: false };
  }, [homeScore, totalPlayerGoals]);

  // Auto-sync result with player goals
  const syncResultWithGoals = () => {
    setHomeScore(totalPlayerGoals.goals.toString());
    toast.success('Resultado atualizado automaticamente!');
  };

  const handleSaveStats = async () => {
    setSaving(true);
    try {
      // Save match result if changed
      const newHomeScore = parseInt(homeScore) || 0;
      const newAwayScore = parseInt(awayScore) || 0;
      if (newHomeScore !== match.home_score || newAwayScore !== match.away_score) {
        await championshipsApi.updateMatchResult(matchId, {
          home_score: newHomeScore,
          away_score: newAwayScore,
          is_completed: true
        });
        // Update local state
        setMatch(prev => ({
          ...prev,
          home_score: newHomeScore,
          away_score: newAwayScore,
          is_completed: true
        }));
      }

      // Save player stats
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
      console.error('Save error:', error);
      toast.error('Erro ao guardar estatísticas');
    } finally {
      setSaving(false);
    }
  };

  // Normalize name for matching (remove accents, lowercase)
  const normalizeName = (name) => {
    if (!name) return '';
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Import stats from external URL
  const handleImportStats = async () => {
    if (!importUrl.trim()) {
      toast.error('Introduza o URL da ficha de jogo');
      return;
    }

    setImporting(true);
    setImportResult(null);
    
    try {
      const response = await championshipsApi.extractGamesheetStats(importUrl);
      const extractedData = response.data;
      
      if (!extractedData.players || extractedData.players.length === 0) {
        toast.error('Não foram encontradas estatísticas na ficha de jogo');
        setImporting(false);
        return;
      }

      // Match extracted players with team members
      const matchedPlayers = [];
      const unmatchedExtracted = [];
      
      // Create normalized member names map
      const membersByNormalizedName = {};
      members.forEach(member => {
        const fullName = member.profile?.first_name && member.profile?.surname 
          ? `${member.profile.first_name} ${member.profile.surname}`
          : member.name;
        const normalized = normalizeName(fullName);
        membersByNormalizedName[normalized] = member;
        
        // Also add just the surname for partial matching
        if (member.profile?.surname) {
          const surnameNorm = normalizeName(member.profile.surname);
          if (!membersByNormalizedName[surnameNorm]) {
            membersByNormalizedName[surnameNorm] = member;
          }
        }
      });

      // Match extracted stats to members
      const newStats = { ...playerStats };
      
      extractedData.players.forEach(extracted => {
        const extractedNormalized = normalizeName(extracted.player_name);
        
        // Try exact match first
        let matchedMember = membersByNormalizedName[extractedNormalized];
        
        // Try partial match (surname only)
        if (!matchedMember) {
          const nameParts = extractedNormalized.split(' ');
          for (const part of nameParts) {
            if (membersByNormalizedName[part]) {
              matchedMember = membersByNormalizedName[part];
              break;
            }
          }
        }
        
        // Try jersey number match as fallback
        if (!matchedMember && extracted.jersey_number) {
          matchedMember = members.find(m => 
            m.profile?.jersey_number?.toString() === extracted.jersey_number.toString()
          );
        }
        
        if (matchedMember) {
          matchedPlayers.push({
            member: matchedMember,
            extracted: extracted
          });
          
          // Update stats
          newStats[matchedMember.id] = {
            ...newStats[matchedMember.id],
            started_match: extracted.started_match || (extracted.G > 0 || extracted.AG > 0 || extracted.D > 0),
            goals: extracted.G || 0,
            own_goals: extracted.AG || 0,
            saves: extracted.D || 0,
            penalties_scored: extracted.PM || 0,
            penalties_missed: extracted.PF || 0,
            free_kicks_scored: extracted.LDM || 0,
            free_kicks_missed: extracted.LDF || 0,
            yellow_cards: extracted.yellow || 0,
            blue_cards: extracted.blue || 0,
            red_cards: extracted.red || 0
          };
        } else {
          unmatchedExtracted.push(extracted);
        }
      });

      setPlayerStats(newStats);
      setImportResult({
        matched: matchedPlayers,
        unmatched: unmatchedExtracted,
        teams: extractedData.teams,
        score: { home: extractedData.home_score, away: extractedData.away_score }
      });

      if (matchedPlayers.length > 0) {
        toast.success(`${matchedPlayers.length} jogadores encontrados e estatísticas importadas!`);
      } else {
        toast.warning('Nenhum jogador correspondente encontrado. Verifique os nomes.');
      }

    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erro ao importar estatísticas: ' + (error.response?.data?.detail || error.message));
    } finally {
      setImporting(false);
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
            <h2 className="font-heading text-xl mb-2">Jogo Externo</h2>
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
          <h1 className="font-heading text-2xl lg:text-3xl text-foreground tracking-tight">
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
            {canManageEvents ? (
              <div className="flex items-center gap-1 bg-secondary text-primary-foreground px-3 py-1 rounded-md">
                <Input
                  type="number"
                  min="0"
                  className="h-7 w-12 text-center p-1 font-mono font-bold bg-white/20 border-0"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  data-testid="home-score-input"
                />
                <span className="font-bold">-</span>
                <Input
                  type="number"
                  min="0"
                  className="h-7 w-12 text-center p-1 font-mono font-bold bg-white/20 border-0"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  data-testid="away-score-input"
                />
              </div>
            ) : match.is_completed ? (
              <Badge className="bg-secondary text-primary-foreground">
                {match.home_score} - {match.away_score}
              </Badge>
            ) : null}
          </div>
        </div>

        {canManageEvents && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setImportDialogOpen(true)} 
              data-testid="import-stats-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              Importar de URL
            </Button>
            <Button onClick={handleSaveStats} disabled={saving} data-testid="save-stats-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar Estatísticas
            </Button>
          </div>
        )}
      </div>

      {/* Goals Inconsistency Alert */}
      {canManageEvents && goalsInconsistency.hasInconsistency && (
        <div className="border border-amber-500 bg-amber-50 rounded-lg p-4 mb-4" data-testid="goals-inconsistency-alert">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-amber-800 font-semibold text-sm">Inconsistência de Golos</h4>
              <p className="text-amber-700 text-sm mt-1">
                O resultado indica <strong>{goalsInconsistency.resultGoals} golos</strong>, mas a soma dos golos dos jogadores é <strong>{goalsInconsistency.playerGoals} golos</strong>.
                {goalsInconsistency.difference > 0 
                  ? ` (${goalsInconsistency.difference} golo(s) a mais nas estatísticas)`
                  : ` (${Math.abs(goalsInconsistency.difference)} golo(s) a menos nas estatísticas)`
                }
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="bg-white border-amber-500 text-amber-700 hover:bg-amber-100"
                  onClick={syncResultWithGoals}
                  data-testid="sync-result-btn"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Atualizar resultado para {goalsInconsistency.playerGoals}-{awayScore || 0}
                </Button>
                <span className="text-xs text-amber-600 self-center">ou corrija manualmente as estatísticas/resultado</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Table - Formato Boletim APL */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="font-heading text-xl tracking-tight">Boletim de Jogo - Estatísticas Individuais</CardTitle>
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

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Importar Estatísticas de URL</DialogTitle>
            <DialogDescription>
              Cole o URL da ficha de jogo da APL para importar automaticamente as estatísticas dos jogadores.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="import-url">URL da Ficha de Jogo</Label>
              <div className="flex gap-2">
                <Input
                  id="import-url"
                  placeholder="https://aplisboa.assyssoftware.es/intranet/web/partido2.asp?id=..."
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleImportStats} 
                  disabled={importing}
                  data-testid="extract-stats-btn"
                >
                  {importing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Exemplo: https://aplisboa.assyssoftware.es/intranet/web/partido2.asp?id=8670
              </p>
            </div>

            {/* Import Result */}
            {importResult && (
              <div className="space-y-4 border-t pt-4">
                {/* Score */}
                {importResult.score.home !== null && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-secondary text-primary-foreground">
                      Resultado: {importResult.score.home} - {importResult.score.away}
                    </Badge>
                  </div>
                )}

                {/* Matched Players */}
                {importResult.matched.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Jogadores Encontrados ({importResult.matched.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {importResult.matched.map(({ member, extracted }) => (
                        <div key={member.id} className="text-xs p-2 bg-green-50 rounded border border-green-200">
                          <span className="font-medium">{member.name}</span>
                          <span className="text-muted-foreground"> ← {extracted.player_name}</span>
                          {extracted.G > 0 && <Badge className="ml-1 text-xs py-0">G:{extracted.G}</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unmatched Players */}
                {importResult.unmatched.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Jogadores Não Encontrados ({importResult.unmatched.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {importResult.unmatched.map((player, idx) => (
                        <div key={idx} className="text-xs p-2 bg-amber-50 rounded border border-amber-200">
                          <span>{player.player_name}</span>
                          <span className="text-muted-foreground"> (#{player.jersey_number})</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Estes jogadores não foram encontrados na equipa. Verifique se os nomes estão corretos.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setImportDialogOpen(false);
              setImportResult(null);
              setImportUrl('');
            }}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
