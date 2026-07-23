import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { usePermissions } from '../context/PermissionsContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Filter,
  Loader2,
  Search,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

const ALL_VALUE = 'all';

const CATEGORY_CONFIG = {
  technical: { label: 'Técnica', className: 'border-cyan-200 bg-cyan-50 text-cyan-700' },
  tactical: { label: 'Tática', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  physical: { label: 'Física', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  psychological: { label: 'Psicológica', className: 'border-purple-200 bg-purple-50 text-purple-700' },
  attitude: { label: 'Atitude', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  other: { label: 'Outro', className: 'border-slate-200 bg-slate-50 text-slate-700' },
};

const getApiBaseUrl = () => {
  const raw = process.env.REACT_APP_BACKEND_URL || '';
  if (!raw) return '/api';
  if (raw.endsWith('/api')) return raw;
  return `${raw.replace(/\/$/, '')}/api`;
};

const getAuthToken = () => {
  const possibleKeys = ['token', 'access_token', 'authToken', 'stickpro_token', 'stickproToken'];
  for (const key of possibleKeys) {
    const value = localStorage.getItem(key);
    if (value) return value.replace(/^"|"$/g, '');
  }
  return null;
};

const apiRequest = async (path, options = {}) => {
  const token = getAuthToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.detail || data?.message || 'Erro na operação');
  return data;
};

const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const getPlayerName = (player) =>
  player?.name ||
  player?.full_name ||
  player?.display_name ||
  [player?.first_name, player?.last_name].filter(Boolean).join(' ') ||
  'Atleta';

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const getEvaluationDate = (evaluation) =>
  evaluation?.evaluation_date || evaluation?.created_at || evaluation?.date || evaluation?.updated_at || null;

const formatDate = (value) => {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getEvaluationPlanName = (evaluation) =>
  evaluation?.plan_name || evaluation?.plan?.name || evaluation?.template_name || evaluation?.title || 'Avaliação';

const getEvaluationAverage = (evaluation) => {
  const directValue = evaluation?.average_score ?? evaluation?.average ?? evaluation?.score ?? evaluation?.total_score;
  if (directValue !== undefined && directValue !== null && directValue !== '') {
    const number = Number(directValue);
    return Number.isFinite(number) ? number : null;
  }

  const scores = evaluation?.scores || evaluation?.criteria_scores || evaluation?.results || [];
  const values = Array.isArray(scores)
    ? scores.map((item) => Number(item?.score ?? item?.value)).filter(Number.isFinite)
    : Object.values(scores).map((item) => Number(item?.score ?? item?.value ?? item)).filter(Number.isFinite);

  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const getCriteriaEntries = (evaluation) => {
  const raw = evaluation?.criteria_scores || evaluation?.scores || evaluation?.results || evaluation?.criteria || [];

  if (Array.isArray(raw)) {
    return raw.map((item, index) => ({
      id: item?.criterion_id || item?.id || item?.code || `${evaluation?.id || 'evaluation'}-${index}`,
      name: item?.criterion_name || item?.name || item?.criterion?.name || `Critério ${index + 1}`,
      category: item?.category || item?.criterion?.category || evaluation?.category || 'other',
      score: Number(item?.score ?? item?.value),
    }));
  }

  return Object.entries(raw || {}).map(([key, value]) => ({
    id: key,
    name: value?.name || key,
    category: value?.category || evaluation?.category || 'other',
    score: Number(value?.score ?? value?.value ?? value),
  }));
};

function MetricCard({ label, value, helper, icon: Icon, accent = 'cyan' }) {
  const styles = {
    cyan: 'border-cyan-100 from-white via-cyan-50/70 to-slate-50 text-cyan-700',
    emerald: 'border-emerald-100 from-white via-emerald-50/70 to-slate-50 text-emerald-700',
    purple: 'border-purple-100 from-white via-purple-50/70 to-slate-50 text-purple-700',
    amber: 'border-amber-100 from-white via-amber-50/70 to-slate-50 text-amber-700',
  };

  return (
    <Card className={`bg-gradient-to-br ${styles[accent] || styles.cyan}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
            <p className="mt-2 font-heading text-4xl text-slate-950">{value}</p>
            {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-white/80">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrendIndicator({ value }) {
  if (value === null || value === undefined) {
    return <Badge variant="outline" className="border-slate-200 text-slate-500">Sem comparação</Badge>;
  }

  const positive = value >= 0;

  return (
    <Badge
      variant="outline"
      className={positive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}
    >
      {positive ? <TrendingUp className="mr-1 h-3.5 w-3.5" /> : <TrendingDown className="mr-1 h-3.5 w-3.5" />}
      {positive ? '+' : ''}{value.toFixed(1)}
    </Badge>
  );
}

export default function EvaluationHistory() {
  const { t } = useLanguage();
  const permissions = usePermissions();
  const navigate = useNavigate();

  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(ALL_VALUE);
  const [dateFilter, setDateFilter] = useState(ALL_VALUE);
  const [query, setQuery] = useState('');

  const tr = (key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };

  const canViewHistory =
    permissions?.isAdmin ||
    permissions?.isStaff ||
    permissions?.canManageTeam ||
    permissions?.canCreateEvaluations ||
    permissions?.hasPermission?.('view_team_members') ||
    permissions?.hasPermission?.('create_evaluations');

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (!selectedTeamId) {
      setPlayers([]);
      setSelectedPlayerId('');
      setEvaluations([]);
      return;
    }
    fetchPlayers(selectedTeamId);
  }, [selectedTeamId]);

  useEffect(() => {
    if (!selectedPlayerId) {
      setEvaluations([]);
      return;
    }
    fetchPlayerEvaluations(selectedPlayerId);
  }, [selectedPlayerId]);

  const fetchTeams = async () => {
    setLoadingTeams(true);
    try {
      const data = await apiRequest('/teams');
      setTeams(normalizeCollection(data));
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error(error.message || tr('evaluations.teamsLoadError', 'Erro ao carregar equipas'));
    } finally {
      setLoadingTeams(false);
    }
  };

  const fetchPlayers = async (teamId) => {
    setLoadingPlayers(true);
    setSelectedPlayerId('');
    setEvaluations([]);

    try {
      const data = await apiRequest(`/members?team_id=${encodeURIComponent(teamId)}&role=player`);
      const members = normalizeCollection(data).filter((member) => {
        const role = String(member?.role || member?.user_role || '').toLowerCase();
        return !role || role === 'player' || role === 'athlete';
      });
      setPlayers(members);
    } catch (error) {
      console.error('Error loading players:', error);
      toast.error(error.message || tr('evaluations.playersLoadError', 'Erro ao carregar atletas'));
      setPlayers([]);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const fetchPlayerEvaluations = async (playerId) => {
    setLoadingEvaluations(true);
    try {
      const data = await apiRequest(`/evaluations/player/${encodeURIComponent(playerId)}`);
      const list = normalizeCollection(data).sort((a, b) => {
        const aDate = new Date(getEvaluationDate(a) || 0).getTime();
        const bDate = new Date(getEvaluationDate(b) || 0).getTime();
        return bDate - aDate;
      });
      setEvaluations(list);
    } catch (error) {
      console.error('Error loading player evaluations:', error);
      toast.error(error.message || tr('evaluations.historyLoadError', 'Erro ao carregar o histórico de avaliações'));
      setEvaluations([]);
    } finally {
      setLoadingEvaluations(false);
    }
  };

  const selectedTeam = useMemo(() => teams.find((team) => team.id === selectedTeamId), [teams, selectedTeamId]);
  const selectedPlayer = useMemo(() => players.find((player) => player.id === selectedPlayerId), [players, selectedPlayerId]);

  const categories = useMemo(() => {
    const values = new Set();
    evaluations.forEach((evaluation) => {
      if (evaluation?.category) values.add(evaluation.category);
      getCriteriaEntries(evaluation).forEach((criterion) => {
        if (criterion.category) values.add(criterion.category);
      });
    });
    return Array.from(values);
  }, [evaluations]);

  const filteredEvaluations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const now = new Date();

    return evaluations.filter((evaluation) => {
      const evaluationDate = getEvaluationDate(evaluation);
      const date = evaluationDate ? new Date(evaluationDate) : null;

      if (dateFilter !== ALL_VALUE && date && !Number.isNaN(date.getTime())) {
        const limit = new Date(now);
        if (dateFilter === '30') limit.setDate(now.getDate() - 30);
        if (dateFilter === '90') limit.setDate(now.getDate() - 90);
        if (dateFilter === '365') limit.setFullYear(now.getFullYear() - 1);
        if (date < limit) return false;
      }

      if (categoryFilter !== ALL_VALUE) {
        const hasCategory =
          evaluation?.category === categoryFilter ||
          getCriteriaEntries(evaluation).some((criterion) => criterion.category === categoryFilter);
        if (!hasCategory) return false;
      }

      if (normalizedQuery) {
        const haystack = [
          getEvaluationPlanName(evaluation),
          evaluation?.period_label,
          evaluation?.comments,
          evaluation?.general_comment,
          evaluation?.event_name,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }

      return true;
    });
  }, [evaluations, categoryFilter, dateFilter, query]);

  const summary = useMemo(() => {
    const averages = filteredEvaluations.map(getEvaluationAverage).filter((value) => value !== null);
    const overallAverage = averages.length > 0 ? averages.reduce((sum, value) => sum + value, 0) / averages.length : null;
    const latestAverage = averages.length > 0 ? averages[0] : null;
    const previousAverage = averages.length > 1 ? averages[1] : null;
    const evolution = latestAverage !== null && previousAverage !== null ? latestAverage - previousAverage : null;

    const criteriaMap = new Map();
    filteredEvaluations.forEach((evaluation) => {
      getCriteriaEntries(evaluation).forEach((criterion) => {
        if (!Number.isFinite(criterion.score)) return;
        if (!criteriaMap.has(criterion.id)) {
          criteriaMap.set(criterion.id, {
            id: criterion.id,
            name: criterion.name,
            category: criterion.category,
            scores: [],
          });
        }
        criteriaMap.get(criterion.id).scores.push(criterion.score);
      });
    });

    const criterionAverages = Array.from(criteriaMap.values())
      .map((criterion) => ({
        ...criterion,
        average: criterion.scores.reduce((sum, value) => sum + value, 0) / criterion.scores.length,
      }))
      .sort((a, b) => b.average - a.average);

    return {
      total: filteredEvaluations.length,
      overallAverage,
      evolution,
      strongestCriterion: criterionAverages[0] || null,
      criteria: criterionAverages,
    };
  }, [filteredEvaluations]);

  if (!canViewHistory) {
    return (
      <div className="space-y-4 pb-20 lg:pb-0">
        <Card className="border border-amber-100 bg-amber-50">
          <CardContent className="p-6">
            <p className="font-semibold text-amber-800">
              {tr('evaluations.noHistoryPermission', 'Sem permissão para consultar o histórico de avaliações.')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 pt-1 lg:pb-0" data-testid="evaluation-history-page">
      <section className="overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-slate-950 p-5 text-white shadow-xl shadow-slate-200/70 sm:p-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate('/development-center')}
          className="mb-4 -ml-2 text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tr('developmentCenter.title', 'Centro de Desenvolvimento')}
        </Button>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="mb-3 border border-white/15 bg-white/10 text-white">
              <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
              {tr('evaluations.longitudinalTracking', 'Acompanhamento longitudinal')}
            </Badge>

            <h1 className="font-heading text-3xl tracking-tight sm:text-5xl">
              {tr('evaluations.historyTitle', 'Histórico de Avaliações')}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              {tr('evaluations.historySubtitle', 'Consulta a evolução de cada atleta, compara avaliações e identifica tendências ao longo da época.')}
            </p>
          </div>

          <Button asChild className="h-11 rounded-full bg-cyan-500 px-5 text-white hover:bg-cyan-600">
            <Link to="/evaluations/new">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              {tr('evaluations.newEvaluation', 'Nova avaliação')}
            </Link>
          </Button>
        </div>
      </section>

      <Card className="border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-600" />
            {tr('evaluations.choosePlayer', 'Selecionar atleta')}
          </CardTitle>
          <CardDescription>
            {tr('evaluations.choosePlayerHelp', 'Escolhe primeiro a equipa e depois o atleta cujo percurso pretendes analisar.')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 lg:grid-cols-2">
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId} disabled={loadingTeams}>
              <SelectTrigger className="h-12 rounded-2xl">
                <SelectValue placeholder={loadingTeams ? tr('common.loading', 'A carregar...') : tr('common.selectTeam', 'Selecionar equipa')} />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId} disabled={!selectedTeamId || loadingPlayers}>
              <SelectTrigger className="h-12 rounded-2xl">
                <SelectValue placeholder={loadingPlayers ? tr('common.loading', 'A carregar...') : tr('evaluations.selectPlayer', 'Selecionar atleta')} />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>{getPlayerName(player)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!selectedPlayerId ? (
        <Card className="border border-dashed border-slate-200 bg-slate-50">
          <CardContent className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
            <UserRound className="mb-3 h-14 w-14 text-slate-300" />
            <p className="font-heading text-xl text-slate-950">
              {tr('evaluations.noPlayerSelected', 'Nenhum atleta selecionado')}
            </p>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              {tr('evaluations.noPlayerSelectedHelp', 'Seleciona uma equipa e um atleta para consultar o respetivo histórico evolutivo.')}
            </p>
          </CardContent>
        </Card>
      ) : loadingEvaluations ? (
        <Card className="border border-slate-200 bg-white">
          <CardContent className="flex min-h-[320px] items-center justify-center">
            <Loader2 className="h-9 w-9 animate-spin text-cyan-600" />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden border border-cyan-100 bg-white shadow-xl shadow-slate-200/60">
            <div className="bg-gradient-to-br from-cyan-600 via-blue-600 to-slate-950 p-5 text-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-lg font-bold">
                    {getInitials(getPlayerName(selectedPlayer))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan-100">
                      {selectedTeam?.name || tr('common.team', 'Equipa')}
                    </p>
                    <h2 className="font-heading text-2xl sm:text-3xl">{getPlayerName(selectedPlayer)}</h2>
                  </div>
                </div>

                <Badge className="w-fit border border-white/15 bg-white/10 text-white">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {summary.total} {summary.total === 1 ? 'avaliação' : 'avaliações'}
                </Badge>
              </div>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={tr('evaluations.totalEvaluations', 'Avaliações')} value={summary.total} helper={tr('evaluations.filteredPeriod', 'No período filtrado')} icon={ClipboardCheck} accent="cyan" />
            <MetricCard label={tr('evaluations.average', 'Média global')} value={summary.overallAverage !== null ? summary.overallAverage.toFixed(1) : '-'} helper={tr('evaluations.scaleOneToFive', 'Escala 1–5')} icon={BarChart3} accent="emerald" />
            <MetricCard label={tr('evaluations.evolution', 'Evolução')} value={summary.evolution !== null ? `${summary.evolution >= 0 ? '+' : ''}${summary.evolution.toFixed(1)}` : '-'} helper={tr('evaluations.lastTwoEvaluations', 'Entre as duas últimas avaliações')} icon={TrendingUp} accent="purple" />
            <MetricCard label={tr('evaluations.strongestArea', 'Ponto forte')} value={summary.strongestCriterion?.name || '-'} helper={summary.strongestCriterion ? summary.strongestCriterion.average.toFixed(1) : tr('common.noData', 'Sem dados')} icon={Target} accent="amber" />
          </div>

          <Card className="border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-cyan-600" />
                    {tr('common.filters', 'Filtros')}
                  </CardTitle>
                  <CardDescription>{tr('evaluations.historyFiltersHelp', 'Filtra o histórico por texto, categoria e período.')}</CardDescription>
                </div>

                <div className="grid gap-2 sm:grid-cols-3 lg:w-[660px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-full pl-9" placeholder={tr('common.search', 'Pesquisar...')} />
                  </div>

                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value={ALL_VALUE}>{tr('evaluations.allCategories', 'Todas as categorias')}</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>{CATEGORY_CONFIG[category]?.label || category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value={ALL_VALUE}>{tr('evaluations.allPeriods', 'Todo o período')}</SelectItem>
                      <SelectItem value="30">{tr('evaluations.last30Days', 'Últimos 30 dias')}</SelectItem>
                      <SelectItem value="90">{tr('evaluations.last90Days', 'Últimos 90 dias')}</SelectItem>
                      <SelectItem value="365">{tr('evaluations.lastYear', 'Último ano')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-cyan-600" />
                  {tr('evaluations.evolutionByCriterion', 'Evolução por critério')}
                </CardTitle>
                <CardDescription>{tr('evaluations.evolutionByCriterionHelp', 'Média acumulada dos critérios avaliados no período selecionado.')}</CardDescription>
              </CardHeader>

              <CardContent>
                {summary.criteria.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <BarChart3 className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                    <p className="font-semibold text-slate-800">{tr('common.noData', 'Sem dados')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {summary.criteria.slice(0, 8).map((criterion) => {
                      const width = Math.max(0, Math.min(100, (criterion.average / 5) * 100));
                      const category = CATEGORY_CONFIG[criterion.category] || CATEGORY_CONFIG.other;

                      return (
                        <div key={criterion.id}>
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900">{criterion.name}</p>
                              <Badge variant="outline" className={`mt-1 ${category.className}`}>{category.label}</Badge>
                            </div>
                            <p className="font-heading text-xl text-slate-950">{criterion.average.toFixed(1)}</p>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-cyan-600" />
                  {tr('evaluations.timeline', 'Linha temporal')}
                </CardTitle>
                <CardDescription>{tr('evaluations.timelineHelp', 'Percurso recente do atleta.')}</CardDescription>
              </CardHeader>

              <CardContent>
                {filteredEvaluations.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <ClipboardCheck className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                    <p className="font-semibold text-slate-800">{tr('evaluations.noEvaluations', 'Ainda não existem avaliações')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredEvaluations.slice(0, 8).map((evaluation, index) => {
                      const average = getEvaluationAverage(evaluation);
                      const previousAverage = index < filteredEvaluations.length - 1 ? getEvaluationAverage(filteredEvaluations[index + 1]) : null;
                      const trend = average !== null && previousAverage !== null ? average - previousAverage : null;

                      return (
                        <div key={evaluation.id || `${getEvaluationDate(evaluation)}-${index}`} className="rounded-3xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{formatDate(getEvaluationDate(evaluation))}</p>
                              <h3 className="mt-1 truncate font-heading text-lg text-slate-950">{getEvaluationPlanName(evaluation)}</h3>
                              {evaluation?.period_label && <p className="mt-1 text-sm text-slate-500">{evaluation.period_label}</p>}
                            </div>

                            <div className="text-right">
                              <p className="font-heading text-2xl text-slate-950">{average !== null ? average.toFixed(1) : '-'}</p>
                              <TrendIndicator value={trend} />
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                            <span className="text-xs text-slate-400">
                              {getCriteriaEntries(evaluation).length} {tr('evaluations.criteria', 'critérios')}
                            </span>

                            {evaluation?.id && (
                              <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => navigate(`/evaluations/${evaluation.id}`)}>
                                {tr('common.viewDetails', 'Ver detalhes')}
                                <ChevronRight className="ml-1 h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
