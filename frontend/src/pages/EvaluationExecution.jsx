import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { usePermissions } from '../context/PermissionsContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle,
  ClipboardCheck,
  Dumbbell,
  Loader2,
  Sparkles,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

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

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || 'Erro na operação');
  }

  return data;
};

const STEPS = [
  { key: 'plan', label: 'Plano' },
  { key: 'team', label: 'Equipa' },
  { key: 'event', label: 'Evento' },
  { key: 'players', label: 'Atletas' },
];

const PLAN_CATEGORY_LABELS = {
  training: 'Treino',
  match: 'Jogo',
  goalkeeper: 'Guarda-redes',
  technical: 'Técnico',
  tactical: 'Tático',
  physical: 'Físico',
  custom: 'Personalizado',
};

function DevelopmentIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 48c8-17 17-26 32-32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M18 44h28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="22" cy="51" r="5" stroke="currentColor" strokeWidth="4" />
      <circle cx="42" cy="51" r="5" stroke="currentColor" strokeWidth="4" />
      <path d="M38 12h12v12" stroke="#06b6d4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M50 12 34 28" stroke="#06b6d4" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default function EvaluationExecution() {
  const { t } = useLanguage();
  const permissions = usePermissions();

  const [loading, setLoading] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [plans, setPlans] = useState([]);
  const [teams, setTeams] = useState([]);
  const [events, setEvents] = useState([]);
  const [players, setPlayers] = useState([]);

  const [stepIndex, setStepIndex] = useState(0);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('none');
  const [periodLabel, setPeriodLabel] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);

  const tr = (key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };

  const canEvaluate =
    permissions?.isAdmin ||
    permissions?.isStaff ||
    permissions?.canManageTeam ||
    permissions?.hasPermission?.('view_team_members');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      fetchPlayersAndEvents(selectedTeamId);
    } else {
      setPlayers([]);
      setEvents([]);
      setSelectedPlayerIds([]);
    }
  }, [selectedTeamId]);

  const fetchInitialData = async () => {
    setLoading(true);

    try {
      const [plansData, teamsData] = await Promise.all([
        apiRequest('/evaluations/plans'),
        apiRequest('/teams').catch(() => []),
      ]);

      setPlans(Array.isArray(plansData) ? plansData : []);
      setTeams(Array.isArray(teamsData) ? teamsData : []);
    } catch (error) {
      console.error('Error loading evaluation execution data:', error);
      toast.error(tr('evaluations.executionLoadError', 'Erro ao carregar dados de avaliação'));
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayersAndEvents = async (teamId) => {
    setLoadingPlayers(true);

    try {
      const [playersData, eventsData] = await Promise.all([
        apiRequest(`/evaluations/teams/${teamId}/players`),
        apiRequest(`/events?team_id=${teamId}`).catch(() => []),
      ]);

      setPlayers(Array.isArray(playersData) ? playersData : []);

      const normalizedEvents = Array.isArray(eventsData)
        ? eventsData
        : Array.isArray(eventsData?.events)
          ? eventsData.events
          : [];

      setEvents(normalizedEvents);
      setSelectedPlayerIds([]);
    } catch (error) {
      console.error('Error loading team players/events:', error);
      toast.error(tr('evaluations.playersLoadError', 'Erro ao carregar atletas da equipa'));
    } finally {
      setLoadingPlayers(false);
    }
  };

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId),
    [plans, selectedPlanId]
  );

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId),
    [teams, selectedTeamId]
  );

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId),
    [events, selectedEventId]
  );

  const availablePlans = useMemo(() => {
    if (!selectedTeamId) return plans;

    return plans.filter((plan) => !plan.team_id || plan.team_id === selectedTeamId);
  }, [plans, selectedTeamId]);

  const canContinue = () => {
    const currentStep = STEPS[stepIndex]?.key;

    if (currentStep === 'plan') return Boolean(selectedPlanId);
    if (currentStep === 'team') return Boolean(selectedTeamId);
    if (currentStep === 'event') return true;
    if (currentStep === 'players') return selectedPlayerIds.length > 0;

    return false;
  };

  const nextStep = () => {
    if (!canContinue()) {
      toast.error(tr('evaluations.completeCurrentStep', 'Completa este passo antes de avançar'));
      return;
    }

    setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const previousStep = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const togglePlayer = (playerId) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const toggleAllPlayers = () => {
    if (selectedPlayerIds.length === players.length) {
      setSelectedPlayerIds([]);
      return;
    }

    setSelectedPlayerIds(players.map((player) => player.id));
  };

  const goToEvaluationGrid = () => {
    if (!selectedPlanId || !selectedTeamId || selectedPlayerIds.length === 0) {
      toast.error(tr('evaluations.executionMissingData', 'Seleciona plano, equipa e atletas'));
      return;
    }

    toast.info(
      tr(
        'evaluations.gridNextSprint',
        'Grelha de avaliação será ativada no próximo sprint.'
      )
    );
  };

  const formatEventLabel = (event) => {
    if (!event) return '';

    const date = event.start_time
      ? new Date(event.start_time).toLocaleDateString(undefined, {
          day: '2-digit',
          month: 'short',
        })
      : '';

    const hour = event.start_time
      ? new Date(event.start_time).toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    return `${event.title || tr('calendar.event', 'Evento')} ${date ? `· ${date}` : ''} ${hour ? `· ${hour}` : ''}`;
  };

  if (!canEvaluate) {
    return (
      <div className="space-y-4 pb-20 lg:pb-0">
        <Card className="border border-amber-100 bg-amber-50">
          <CardContent className="p-6">
            <p className="font-semibold text-amber-800">
              {tr('evaluations.noPermission', 'Sem permissão para criar avaliações.')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 pt-1 lg:-mt-12 lg:pb-0" data-testid="evaluation-execution-page">
      <section className="overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-slate-950 p-5 text-white shadow-xl shadow-slate-200/70 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="mb-3 border border-white/15 bg-white/10 text-white">
              <DevelopmentIcon className="mr-1.5 h-4 w-4" />
              {tr('developmentCenter.title', 'Centro de Desenvolvimento')}
            </Badge>

            <h1 className="font-heading text-3xl tracking-tight sm:text-5xl">
              {tr('evaluations.newEvaluation', 'Nova Avaliação')}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              {tr(
                'evaluations.executionSubtitle',
                'Escolhe um plano, uma equipa e os atletas a avaliar. A grelha de avaliação será construída automaticamente a partir dos critérios do plano.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link to="/evaluation-plans">
                <ClipboardCheck className="mr-2 h-4 w-4" />
                {tr('evaluations.plansTitle', 'Planos de Avaliação')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Card className="border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-600" />
            {tr('evaluations.evaluationWizard', 'Assistente de Avaliação')}
          </CardTitle>
          <CardDescription>
            {tr(
              'evaluations.evaluationWizardHelp',
              'Completa os passos para preparar a avaliação. No próximo sprint será adicionada a grelha de pontuação.'
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-2 sm:grid-cols-4">
            {STEPS.map((step, index) => {
              const active = index === stepIndex;
              const done = index < stepIndex;

              return (
                <div
                  key={step.key}
                  className={`rounded-2xl border p-3 ${
                    active
                      ? 'border-cyan-300 bg-cyan-50 text-cyan-800'
                      : done
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold shadow-sm">
                      {done ? <CheckCircle className="h-4 w-4" /> : index + 1}
                    </span>
                    <p className="text-sm font-semibold">
                      {tr(`evaluations.steps.${step.key}`, step.label)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {STEPS[stepIndex]?.key === 'plan' && (
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="space-y-3">
                <Label>{tr('evaluations.selectPlan', 'Selecionar plano')}</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue placeholder={tr('evaluations.choosePlan', 'Escolhe um plano')} />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {availablePlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {plans.length === 0 && (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                    {tr(
                      'evaluations.noPlansCreateFirst',
                      'Ainda não existem planos. Cria primeiro um plano de avaliação.'
                    )}
                    <Button asChild variant="link" className="px-2 text-amber-800">
                      <Link to="/evaluation-plans">
                        {tr('evaluations.newPlan', 'Novo plano')}
                      </Link>
                    </Button>
                  </div>
                )}
              </div>

              <Card className="border border-cyan-100 bg-cyan-50/70">
                <CardContent className="p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">
                    {tr('evaluations.selectedPlan', 'Plano selecionado')}
                  </p>

                  {selectedPlan ? (
                    <div className="mt-3 space-y-2">
                      <h3 className="font-heading text-xl text-slate-950">
                        {selectedPlan.name}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {selectedPlan.description ||
                          tr('evaluations.noDescription', 'Sem descrição')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-full bg-white">
                          {PLAN_CATEGORY_LABELS[selectedPlan.category] || selectedPlan.category}
                        </Badge>
                        <Badge variant="outline" className="rounded-full bg-white">
                          {selectedPlan.criteria_count ?? selectedPlan.criteria?.length ?? 0}{' '}
                          {tr('evaluations.criteria', 'critérios')}
                        </Badge>
                        {selectedPlan.estimated_minutes && (
                          <Badge variant="outline" className="rounded-full bg-white">
                            {selectedPlan.estimated_minutes} min
                          </Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">
                      {tr('evaluations.choosePlanToPreview', 'Escolhe um plano para ver o resumo.')}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {STEPS[stepIndex]?.key === 'team' && (
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="space-y-3">
                <Label>{tr('evaluations.selectTeam', 'Selecionar equipa')}</Label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue placeholder={tr('common.selectTeam', 'Selecionar equipa')} />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Card className="border border-emerald-100 bg-emerald-50/70">
                <CardContent className="p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                    {tr('common.team', 'Equipa')}
                  </p>
                  <h3 className="mt-3 font-heading text-xl text-slate-950">
                    {selectedTeam?.name || tr('evaluations.noTeamSelected', 'Nenhuma equipa selecionada')}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedTeamId
                      ? tr('evaluations.teamWillLoadPlayers', 'Serão carregados os atletas desta equipa.')
                      : tr('evaluations.chooseTeamHelp', 'Escolhe a equipa a avaliar.')}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {STEPS[stepIndex]?.key === 'event' && (
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>{tr('evaluations.linkEventOptional', 'Associar evento (opcional)')}</Label>
                  <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                    <SelectTrigger className="h-12 rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="none">
                        {tr('evaluations.noEvent', 'Sem evento associado')}
                      </SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {formatEventLabel(event)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>{tr('evaluations.periodLabel', 'Período / nota da avaliação')}</Label>
                  <Input
                    value={periodLabel}
                    onChange={(event) => setPeriodLabel(event.target.value)}
                    className="h-12 rounded-2xl"
                    placeholder={tr('evaluations.periodExample', 'Ex.: Outubro 2026, Pós-jogo, Treino técnico')}
                  />
                </div>
              </div>

              <Card className="border border-purple-100 bg-purple-50/70">
                <CardContent className="p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-purple-700">
                    {tr('calendar.event', 'Evento')}
                  </p>
                  <h3 className="mt-3 font-heading text-xl text-slate-950">
                    {selectedEvent ? selectedEvent.title : tr('evaluations.optional', 'Opcional')}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedEvent
                      ? formatEventLabel(selectedEvent)
                      : tr(
                          'evaluations.eventOptionalHelp',
                          'Podes criar avaliações independentes de um treino ou jogo.'
                        )}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {STEPS[stepIndex]?.key === 'players' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-950">
                    {tr('evaluations.selectPlayers', 'Selecionar atletas')}
                  </p>
                  <p className="text-sm text-slate-500">
                    {selectedPlayerIds.length}/{players.length}{' '}
                    {tr('evaluations.playersSelected', 'atletas selecionados')}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={toggleAllPlayers}
                  disabled={players.length === 0}
                >
                  <Users className="mr-2 h-4 w-4" />
                  {selectedPlayerIds.length === players.length
                    ? tr('common.clearSelection', 'Limpar seleção')
                    : tr('common.selectAll', 'Selecionar todos')}
                </Button>
              </div>

              {loadingPlayers ? (
                <div className="flex min-h-[240px] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
                </div>
              ) : players.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <Users className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                  <p className="font-semibold text-slate-700">
                    {tr('evaluations.noPlayersForTeam', 'Não foram encontrados atletas nesta equipa')}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {players.map((player) => {
                    const selected = selectedPlayerIds.includes(player.id);

                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => togglePlayer(player.id)}
                        className={`rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                          selected
                            ? 'border-cyan-300 bg-cyan-50 ring-2 ring-cyan-100'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={selected} onCheckedChange={() => togglePlayer(player.id)} />
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-700">
                            {(player.name || '?')
                              .split(' ')
                              .map((part) => part[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950">
                              {player.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {player.position || tr('roles.player', 'Atleta')}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={previousStep}
              disabled={stepIndex === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {tr('common.back', 'Voltar')}
            </Button>

            {stepIndex < STEPS.length - 1 ? (
              <Button
                type="button"
                className="rounded-full"
                onClick={nextStep}
                disabled={!canContinue()}
              >
                {tr('common.continue', 'Continuar')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                className="rounded-full bg-cyan-600 hover:bg-cyan-700"
                onClick={goToEvaluationGrid}
                disabled={!canContinue()}
              >
                <Dumbbell className="mr-2 h-4 w-4" />
                {tr('evaluations.startEvaluation', 'Iniciar avaliação')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 bg-slate-50">
        <CardContent className="p-4">
          <div className="grid gap-3 text-sm md:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {tr('evaluations.plan', 'Plano')}
              </p>
              <p className="font-semibold text-slate-800">
                {selectedPlan?.name || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {tr('common.team', 'Equipa')}
              </p>
              <p className="font-semibold text-slate-800">
                {selectedTeam?.name || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {tr('calendar.event', 'Evento')}
              </p>
              <p className="font-semibold text-slate-800">
                {selectedEvent?.title || tr('evaluations.noEvent', 'Sem evento')}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {tr('evaluations.players', 'Atletas')}
              </p>
              <p className="font-semibold text-slate-800">
                {selectedPlayerIds.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
