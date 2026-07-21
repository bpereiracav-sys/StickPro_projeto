import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { championshipsApi, teamsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Skeleton } from '../components/ui/skeleton';
import { Checkbox } from '../components/ui/checkbox';
import MatchLineup from '../components/game-center/MatchLineup';
import MatchPremiumHero from '../components/game-center/MatchPremiumHero';
import MatchOverviewDashboard from '../components/game-center/MatchOverviewDashboard';
import MatchTimeline from '../components/game-center/MatchTimeline';
import TimelineSyncPanel from '../components/game-center/TimelineSyncPanel';
import MatchWorkflowHero from '../components/game-center/MatchWorkflowHero';
import WorkflowChecklist from '../components/game-center/WorkflowChecklist';
import WorkflowNextAction from '../components/game-center/WorkflowNextAction';
import SmartAssistantPanel from '../components/game-center/SmartAssistantPanel';
import MatchAuditHistoryPanel from '../components/game-center/MatchAuditHistoryPanel';
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
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Save,
  User,
} from 'lucide-react';
import { getInitials, formatDate, formatTime } from '../lib/utils';
import GameHeader from '../components/game-center/GameHeader';
import GameTabs from '../components/game-center/GameTabs';
import TechnicalAssistantCard from '../components/game-center/TechnicalAssistantCard';

export default function MatchStats() {
  const { championshipId, matchId } = useParams();
  const { canManageEvents } = useAuth();

  const [match, setMatch] = useState(null);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [playerStats, setPlayerStats] = useState({});
  const [existingStats, setExistingStats] = useState([]);
  const [technicalAssistant, setTechnicalAssistant] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);
  const [activeMatchTab, setActiveMatchTab] = useState('summary');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [championshipId, matchId]);

  const fetchData = async () => {
    setLoading(true);

    try {
      const [matchRes, existingRes, assistantRes] = await Promise.all([
        championshipsApi.getMatch(matchId),
        championshipsApi.getMatchPlayerStats(matchId),
        championshipsApi.getTechnicalAssistant(matchId),
      ]);

      const currentMatch = matchRes.data;
      setMatch(currentMatch);
      setTechnicalAssistant(assistantRes.data);
      setExistingStats(existingRes.data || []);
      setHomeScore(currentMatch.home_score?.toString() || '');
      setAwayScore(currentMatch.away_score?.toString() || '');

      const teamRes = await teamsApi.getOne(currentMatch.team_id);
      setTeam(teamRes.data);

      const membersRes = await teamsApi.getMembers(currentMatch.team_id);
      const players = (membersRes.data || []).filter((member) =>
        member.role === 'jogador' ||
        member.profile?.function === 'jogador' ||
        member.profile?.sports_info?.function === 'jogador'
      );

      setMembers(players);

      const initialStats = {};
      players.forEach((player) => {
        const existing = (existingRes.data || []).find((stat) => stat.player_id === player.id);
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
          red_cards: existing?.red_cards || 0,
        };
      });

      setPlayerStats(initialStats);
    } catch (error) {
      console.error('Error fetching match center data:', error);
      toast.error('Erro ao carregar dados do jogo');
    } finally {
      setLoading(false);
    }
  };

  const handleStatChange = (playerId, field, value) => {
    setPlayerStats((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: field === 'started_match' ? value : (parseInt(value, 10) || 0),
      },
    }));
  };

  const totalPlayerGoals = useMemo(() => {
    let goals = 0;
    let ownGoals = 0;

    Object.values(playerStats).forEach((stats) => {
      goals += stats.goals || 0;
      ownGoals += stats.own_goals || 0;
    });

    return { goals, ownGoals };
  }, [playerStats]);

  const goalsInconsistency = useMemo(() => {
    const resultHomeScore = parseInt(homeScore, 10) || 0;
    const expectedHomeGoals = totalPlayerGoals.goals;

    if (resultHomeScore !== expectedHomeGoals) {
      return {
        hasInconsistency: true,
        resultGoals: resultHomeScore,
        playerGoals: expectedHomeGoals,
        difference: expectedHomeGoals - resultHomeScore,
      };
    }

    return { hasInconsistency: false };
  }, [homeScore, totalPlayerGoals]);

  const syncResultWithGoals = () => {
    setHomeScore(totalPlayerGoals.goals.toString());
    toast.success('Resultado atualizado automaticamente');
  };

  const handleSaveStats = async () => {
    setSaving(true);

    try {
      const newHomeScore = parseInt(homeScore, 10) || 0;
      const newAwayScore = parseInt(awayScore, 10) || 0;

      if (newHomeScore !== match.home_score || newAwayScore !== match.away_score) {
        await championshipsApi.updateMatchResult(matchId, {
          home_score: newHomeScore,
          away_score: newAwayScore,
          is_completed: true,
        });

        setMatch((prev) => ({
          ...prev,
          home_score: newHomeScore,
          away_score: newAwayScore,
          is_completed: true,
        }));
      }

      for (const [playerId, stats] of Object.entries(playerStats)) {
        const hasStats =
          stats.started_match ||
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
            direct_free_kicks: stats.free_kicks_scored || 0,
            yellow_cards: stats.yellow_cards || 0,
            blue_cards: stats.blue_cards || 0,
            red_cards: stats.red_cards || 0,
          });
        }
      }

      const assistantRes = await championshipsApi.regenerateTechnicalAssistant(matchId);
      setTechnicalAssistant(assistantRes.data);
      toast.success('Estatísticas guardadas e Assistente Técnico recalculado');
      fetchData();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erro ao guardar estatísticas');
    } finally {
      setSaving(false);
    }
  };

  const normalizeName = (name) => {
    if (!name) return '';
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  };

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
        return;
      }

      const matchedPlayers = [];
      const unmatchedExtracted = [];
      const membersByNormalizedName = {};

      members.forEach((member) => {
        const fullName = member.profile?.first_name && member.profile?.surname
          ? `${member.profile.first_name} ${member.profile.surname}`
          : member.name;

        const normalized = normalizeName(fullName);
        membersByNormalizedName[normalized] = member;

        if (member.profile?.surname) {
          const surnameNorm = normalizeName(member.profile.surname);
          if (!membersByNormalizedName[surnameNorm]) {
            membersByNormalizedName[surnameNorm] = member;
          }
        }
      });

      const newStats = { ...playerStats };

      extractedData.players.forEach((extracted) => {
        const extractedNormalized = normalizeName(extracted.player_name);
        let matchedMember = membersByNormalizedName[extractedNormalized];

        if (!matchedMember) {
          const nameParts = extractedNormalized.split(' ');
          for (const part of nameParts) {
            if (membersByNormalizedName[part]) {
              matchedMember = membersByNormalizedName[part];
              break;
            }
          }
        }

        if (!matchedMember && extracted.jersey_number) {
          matchedMember = members.find(
            (member) => member.profile?.jersey_number?.toString() === extracted.jersey_number.toString()
          );
        }

        if (matchedMember) {
          matchedPlayers.push({ member: matchedMember, extracted });
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
            red_cards: extracted.red || 0,
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
        score: {
          home: extractedData.home_score,
          away: extractedData.away_score,
        },
      });

      if (extractedData.home_score !== null && extractedData.home_score !== undefined) {
        setHomeScore(extractedData.home_score.toString());
      }

      if (extractedData.away_score !== null && extractedData.away_score !== undefined) {
        setAwayScore(extractedData.away_score.toString());
      }

      if (matchedPlayers.length > 0) {
        toast.success(`${matchedPlayers.length} jogadores encontrados e estatísticas importadas`);
      } else {
        toast.warning('Nenhum jogador correspondente encontrado. Verifique os nomes.');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(`Erro ao importar estatísticas: ${error.response?.data?.detail || error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleRegenerateAssistant = async () => {
    setAssistantLoading(true);

    try {
      const response = await championshipsApi.regenerateTechnicalAssistant(matchId);
      setTechnicalAssistant(response.data);
      await fetchData();
      toast.success('Assistente Técnico recalculado');
    } catch (error) {
      toast.error('Erro ao recalcular Assistente Técnico');
    } finally {
      setAssistantLoading(false);
    }
  };

  const handlePublishAssistant = async () => {
    setAssistantLoading(true);

    try {
      const response = await championshipsApi.publishTechnicalAssistant(matchId);
      setTechnicalAssistant(response.data);
      toast.success('Assistente Técnico publicado');
    } catch (error) {
      toast.error('Erro ao publicar Assistente Técnico');
    } finally {
      setAssistantLoading(false);
    }
  };

  const renderSummaryContent = () => (
    <MatchOverviewDashboard
      match={match}
      members={members}
      existingStats={existingStats}
      technicalAssistant={technicalAssistant}
      canManageEvents={canManageEvents}
    />
  );

  const renderGamesheetContent = () => (
    <Card className="border-white/70 bg-white/90 shadow-lg shadow-slate-200/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-xl tracking-tight">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Boletim oficial APL/FPP
        </CardTitle>
        <CardDescription>
          Importação assistida da ficha oficial e validação dos dados do jogo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <InfoBox label="Estado" value={match.gamesheet_url ? 'Importado' : 'Por importar'} />
          <InfoBox label="Última importação" value={match.gamesheet_imported_at ? formatDate(match.gamesheet_imported_at) : '-'} />
          <InfoBox label="Árbitro" value={match.referee || '-'} />
        </div>

        <div className="flex flex-wrap gap-2">
          {canManageEvents && (
            <Button onClick={() => setImportDialogOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              Importar estatísticas de URL
            </Button>
          )}

          {match.gamesheet_url && (
            <Button variant="outline" asChild>
              <a href={match.gamesheet_url} target="_blank" rel="noopener noreferrer">
                Abrir ficha oficial
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderStatisticsContent = () => (
    <div className="space-y-4">
      {canManageEvents && goalsInconsistency.hasInconsistency && (
        <div className="rounded-lg border border-amber-500 bg-amber-50 p-4" data-testid="goals-inconsistency-alert">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-800">Inconsistência de Golos</h4>
              <p className="mt-1 text-sm text-amber-700">
                O resultado indica <strong>{goalsInconsistency.resultGoals} golos</strong>, mas a soma dos golos dos jogadores é <strong>{goalsInconsistency.playerGoals} golos</strong>.
                {goalsInconsistency.difference > 0
                  ? ` (${goalsInconsistency.difference} golo(s) a mais nas estatísticas)`
                  : ` (${Math.abs(goalsInconsistency.difference)} golo(s) a menos nas estatísticas)`}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-500 bg-white text-amber-700 hover:bg-amber-100"
                  onClick={syncResultWithGoals}
                  data-testid="sync-result-btn"
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Atualizar resultado para {goalsInconsistency.playerGoals}-{awayScore || 0}
                </Button>
                <span className="self-center text-xs text-amber-600">ou corrija manualmente as estatísticas/resultado</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <Card className="border-white/70 bg-white/90 shadow-lg shadow-slate-200/70">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-heading text-xl tracking-tight">Boletim de Jogo - Estatísticas Individuais</CardTitle>
            <p className="mt-2 text-xs text-muted-foreground">
              Formato oficial APLisboa • N.º = Número | 5I = 5 Iniciais | G = Golos | AG = Auto-Golos | D = Defesas | Pe = Penáltis | LD = Livres Diretos
            </p>
          </div>

          {canManageEvents && (
            <Button onClick={handleSaveStats} disabled={saving} data-testid="save-stats-btn">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar Estatísticas
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">N.º</TableHead>
                    <TableHead className="w-12 text-center" title="5 Iniciais">5I</TableHead>
                    <TableHead className="min-w-[150px]">Nome</TableHead>
                    <TableHead className="w-12 text-center" title="Golos">G</TableHead>
                    <TableHead className="w-12 text-center" title="Auto-Golos">AG</TableHead>
                    <TableHead className="w-12 text-center" title="Defesas">D</TableHead>
                    <TableHead className="w-20 text-center" title="Penáltis Marcados">PM</TableHead>
                    <TableHead className="w-20 text-center" title="Penáltis Falhados">PF</TableHead>
                    <TableHead className="w-20 text-center" title="Livres Diretos Marcados">LDM</TableHead>
                    <TableHead className="w-20 text-center" title="Livres Diretos Falhados">LDF</TableHead>
                    <TableHead className="w-10 text-center" title="Cartão Amarelo">
                      <div className="mx-auto h-5 w-4 rounded-sm border border-yellow-600 bg-yellow-400" />
                    </TableHead>
                    <TableHead className="w-10 text-center" title="Cartão Azul">
                      <div className="mx-auto h-5 w-4 rounded-sm border border-blue-700 bg-blue-500" />
                    </TableHead>
                    <TableHead className="w-10 text-center" title="Cartão Vermelho">
                      <div className="mx-auto h-5 w-4 rounded-sm border border-red-800 bg-red-600" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((player) => {
                    const jerseyNumber = player.profile?.sports_info?.jersey_number || player.profile?.jersey_number || '-';
                    const playerName = player.name || 'Jogador';
                    const isGoalkeeper =
                      player.profile?.sports_info?.position?.toLowerCase()?.includes('guarda') ||
                      player.profile?.sports_info?.position?.toLowerCase()?.includes('redes') ||
                      player.profile?.position?.toLowerCase()?.includes('gr');
                    const stats = playerStats[player.id] || {};
                    const inputDisabled = !canManageEvents;

                    return (
                      <TableRow key={player.id} className={isGoalkeeper ? 'bg-blue-50 dark:bg-blue-950/30' : ''} data-testid={`player-row-${player.id}`}>
                        <TableCell className="text-center font-mono font-semibold">{jerseyNumber}</TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={stats.started_match || false}
                            onCheckedChange={(checked) => handleStatChange(player.id, 'started_match', checked)}
                            disabled={inputDisabled}
                            aria-label="5 Iniciais"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                                {getInitials(playerName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{playerName}</span>
                            {isGoalkeeper && <Badge variant="outline" className="text-xs">GR</Badge>}
                          </div>
                        </TableCell>
                        <StatInput value={stats.goals} disabled={inputDisabled} onChange={(value) => handleStatChange(player.id, 'goals', value)} />
                        <StatInput value={stats.own_goals} disabled={inputDisabled} onChange={(value) => handleStatChange(player.id, 'own_goals', value)} />
                        <TableCell className="text-center">
                          {isGoalkeeper ? (
                            <Input type="number" min="0" className="h-8 w-12 p-1 text-center font-mono" value={stats.saves || ''} disabled={inputDisabled} onChange={(e) => handleStatChange(player.id, 'saves', e.target.value)} />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <StatInput value={stats.penalties_scored} disabled={inputDisabled} onChange={(value) => handleStatChange(player.id, 'penalties_scored', value)} />
                        <StatInput value={stats.penalties_missed} disabled={inputDisabled} onChange={(value) => handleStatChange(player.id, 'penalties_missed', value)} />
                        <StatInput value={stats.free_kicks_scored} disabled={inputDisabled} onChange={(value) => handleStatChange(player.id, 'free_kicks_scored', value)} />
                        <StatInput value={stats.free_kicks_missed} disabled={inputDisabled} onChange={(value) => handleStatChange(player.id, 'free_kicks_missed', value)} />
                        <StatInput value={stats.yellow_cards} disabled={inputDisabled} className="bg-yellow-50" onChange={(value) => handleStatChange(player.id, 'yellow_cards', value)} />
                        <StatInput value={stats.blue_cards} disabled={inputDisabled} className="bg-blue-50" onChange={(value) => handleStatChange(player.id, 'blue_cards', value)} />
                        <StatInput value={stats.red_cards} disabled={inputDisabled} className="bg-red-50" onChange={(value) => handleStatChange(player.id, 'red_cards', value)} />
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center">
              <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum jogador na equipa</p>
            </div>
          )}

          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              <strong>Legenda:</strong> N.º = Número da camisola | 5I = 5 Iniciais | G = Golos | AG = Auto-Golos | D = Defesas | PM = Penáltis Marcados | PF = Penáltis Falhados | LDM = Livres Diretos Marcados | LDF = Livres Diretos Falhados
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAssistantContent = () => (
    <TechnicalAssistantCard
      assistant={technicalAssistant}
      canEdit={canManageEvents}
      onRegenerate={handleRegenerateAssistant}
      onPublish={handlePublishAssistant}
      loading={assistantLoading}
    />
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Jogo não encontrado</p>
        <Button asChild className="mt-4">
          <Link to={`/championships/${championshipId}`}>Voltar</Link>
        </Button>
      </div>
    );
  }

  if (match.is_club_match === false) {
    return (
      <div className="space-y-6" data-testid="match-stats-page">
        <GameHeader
          championshipId={championshipId}
          match={match}
          team={team}
          canManageEvents={canManageEvents}
          homeScore={homeScore}
          awayScore={awayScore}
          setHomeScore={setHomeScore}
          setAwayScore={setAwayScore}
        />

        <Card className="border border-border">
          <CardContent className="py-12 text-center">
            <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 font-heading text-xl">Jogo Externo</h2>
            <p className="mb-2 text-muted-foreground">
              {match.home_team} vs {match.opponent_team}
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Badge variant="outline">{formatDate(match.match_date)}</Badge>
              {match.venue && <Badge variant="outline">{match.venue}</Badge>}
              {match.is_completed && (
                <Badge className="bg-secondary text-primary-foreground">
                  {match.home_score} - {match.away_score}
                </Badge>
              )}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              As estatísticas de jogadores não estão disponíveis para jogos entre outras equipas.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="match-stats-page">
      <MatchPremiumHero
        championshipId={championshipId}
        match={match}
        team={team}
        homeScore={homeScore}
        awayScore={awayScore}
      />

      <MatchWorkflowHero
        workflow={match.workflow}
      />
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WorkflowChecklist
            workflow={match.workflow}
          />
        </div>
      
        <WorkflowNextAction
          workflow={match.workflow}
          onContinue={setActiveMatchTab}
        />
      </div>      
      
      <SmartAssistantPanel
        match={match}
        workflow={match.workflow}
        existingStats={existingStats}
        technicalAssistant={technicalAssistant}
        onNavigate={setActiveMatchTab}
      />

      <GameTabs
        match={match}
        canSeeStaffTabs={canManageEvents}
        activeTab={activeMatchTab}
        onTabChange={setActiveMatchTab}
        workflow={match.workflow}
        summaryContent={renderSummaryContent()}
        lineupContent={
          <MatchLineup
            match={match}
            team={team}
            members={members}
            canEdit={canManageEvents}
          />
        }
        liveContent={
          <div className="space-y-6">
            <MatchTimeline
              match={match}
              members={members}
              canEdit={canManageEvents}
              onTimelineChange={() =>
                setTimelineRefreshKey((value) => value + 1)
              }
            />
        
            <TimelineSyncPanel
              matchId={match.id}
              canEdit={canManageEvents}
              refreshKey={timelineRefreshKey}
              onSynced={fetchData}
            />
          </div>
        }
        gamesheetContent={renderGamesheetContent()}
        statisticsContent={renderStatisticsContent()}
        assistantContent={renderAssistantContent()}

        documentsContent={
          <Card className="border-white/70 bg-white/90 shadow-lg">
            <CardHeader>
              <CardTitle>Documentos do Jogo</CardTitle>
              <CardDescription>
                Área documental em desenvolvimento.
              </CardDescription>
            </CardHeader>
        
            <CardContent>
              O novo Centro Documental será integrado aqui.
            </CardContent>
          </Card>
        }
        
        historyContent={
          <MatchAuditHistoryPanel
            matchId={match.id}
          />
        }
      />

      <ImportStatsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        importUrl={importUrl}
        setImportUrl={setImportUrl}
        importing={importing}
        importResult={importResult}
        onImport={handleImportStats}
        onReset={() => {
          setImportDialogOpen(false);
          setImportResult(null);
          setImportUrl('');
        }}
      />
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value || '-'}</p>
    </div>
  );
}

function StatInput({ value, disabled, onChange, className = '' }) {
  return (
    <TableCell className="text-center">
      <Input
        type="number"
        min="0"
        className={`h-8 w-12 p-1 text-center font-mono ${className}`}
        value={value || ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </TableCell>
  );
}

function ImportStatsDialog({
  open,
  onOpenChange,
  importUrl,
  setImportUrl,
  importing,
  importResult,
  onImport,
  onReset,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="font-heading">Importar Estatísticas de URL</DialogTitle>
          <DialogDescription>
            Cole o URL da ficha de jogo da APL/FPP para importar automaticamente as estatísticas dos jogadores.
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
              <Button onClick={onImport} disabled={importing} data-testid="extract-stats-btn">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Exemplo: https://aplisboa.assyssoftware.es/intranet/web/partido2.asp?id=8670
            </p>
          </div>

          {importResult && (
            <div className="space-y-4 border-t pt-4">
              {importResult.score.home !== null && (
                <div className="flex items-center gap-2">
                  <Badge className="bg-secondary text-primary-foreground">
                    Resultado: {importResult.score.home} - {importResult.score.away}
                  </Badge>
                </div>
              )}

              {importResult.matched.length > 0 && (
                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    Jogadores Encontrados ({importResult.matched.length})
                  </h4>
                  <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto">
                    {importResult.matched.map(({ member, extracted }) => (
                      <div key={member.id} className="rounded border border-green-200 bg-green-50 p-2 text-xs">
                        <span className="font-medium">{member.name}</span>
                        <span className="text-muted-foreground"> ← {extracted.player_name}</span>
                        {extracted.G > 0 && <Badge className="ml-1 py-0 text-xs">G:{extracted.G}</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.unmatched.length > 0 && (
                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-700">
                    <AlertCircle className="h-4 w-4" />
                    Jogadores Não Encontrados ({importResult.unmatched.length})
                  </h4>
                  <div className="grid max-h-32 grid-cols-2 gap-2 overflow-y-auto">
                    {importResult.unmatched.map((player, index) => (
                      <div key={index} className="rounded border border-amber-200 bg-amber-50 p-2 text-xs">
                        <span>{player.player_name}</span>
                        <span className="text-muted-foreground"> (#{player.jersey_number})</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Estes jogadores não foram encontrados na equipa. Verifique se os nomes estão corretos.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onReset}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
