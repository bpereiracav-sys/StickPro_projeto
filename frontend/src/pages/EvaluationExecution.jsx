import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { usePermissions } from '../context/PermissionsContext';
import {
  evaluationsApi,
  eventsApi,
  teamsApi,
} from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
  CheckCircle,
  ClipboardCheck,
  Dumbbell,
  Loader2,
  Save,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

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

function buildEvaluationKey(playerId, criterionId) {
  return `${playerId}::${criterionId}`;
}

function ScoreSelector({ value, min = 1, max = 5, onChange }) {
  const options = [];

  for (let current = min; current <= max; current += 1) {
    options.push(current);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((score) => {
        const selected = Number(value) === score;

        return (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold transition ${
              selected
                ? 'border-cyan-500 bg-cyan-500 text-white shadow-md shadow-cyan-100'
                : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-300 hover:text-cyan-700'
            }`}
          >
            {score}
          </button>
        );
      })}
    </div>
  );
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
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

  const [evaluationStarted, setEvaluationStarted] = useState(false);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [scores, setScores] = useState({});
  const [criterionComments, setCriterionComments] = useState({});
  const [generalComments, setGeneralComments] = useState({});
  const [shareWithPlayer, setShareWithPlayer] = useState(false);
  const [shareWithGuardian, setShareWithGuardian] = useState(false);
  const [savingEvaluations, setSavingEvaluations] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  const tr = (key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };

  const canEvaluate =
    permissions?.canCreateEvaluations === true;

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
      const [plansResponse, teamsResponse] =
        await Promise.all([
          evaluationsApi.getPlans(),
          teamsApi.getAll().catch(() => ({
            data: [],
          })),
        ]);
  
      const plansData = plansResponse?.data;
      const teamsData = teamsResponse?.data;
  
      setPlans(
        Array.isArray(plansData)
          ? plansData
          : []
      );
  
      setTeams(
        Array.isArray(teamsData)
          ? teamsData
          : []
      );
    } catch (error) {
      console.error(
        'Error loading evaluation execution data:',
        error
      );
  
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          tr(
            'evaluations.executionLoadError',
            'Erro ao carregar dados de avaliação'
          )
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayersAndEvents = async (teamId) => {
    if (!teamId) {
      setPlayers([]);
      setEvents([]);
      setSelectedPlayerIds([]);
      return;
    }
  
    setLoadingPlayers(true);
  
    try {
      const [playersResponse, eventsResponse] =
        await Promise.all([
          evaluationsApi.getTeamPlayers(teamId),
          eventsApi
            .getAll({
              team_id: teamId,
            })
            .catch(() => ({
              data: [],
            })),
        ]);
  
      const playersData = playersResponse?.data;
      const eventsData = eventsResponse?.data;
  
      setPlayers(
        Array.isArray(playersData)
          ? playersData
          : []
      );
  
      const normalizedEvents =
        Array.isArray(eventsData)
          ? eventsData
          : Array.isArray(eventsData?.events)
            ? eventsData.events
            : [];
  
      setEvents(normalizedEvents);
      setSelectedPlayerIds([]);
      setSelectedEventId('none');
    } catch (error) {
      console.error(
        'Error loading team players/events:',
        error
      );
  
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          tr(
            'evaluations.playersLoadError',
            'Erro ao carregar atletas da equipa'
          )
      );
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

  const selectedPlayers = useMemo(() => {
    return players.filter((player) => selectedPlayerIds.includes(player.id));
  }, [players, selectedPlayerIds]);

  const planCriteria = useMemo(() => {
    return [...(selectedPlan?.criteria || [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
  }, [selectedPlan]);

  const activePlayer = selectedPlayers[activePlayerIndex] || null;
  const totalCriteria = planCriteria.length;
  const totalExpectedScores = selectedPlayers.length * totalCriteria;

  const completedScores = useMemo(() => {
    let count = 0;

    selectedPlayers.forEach((player) => {
      planCriteria.forEach((item) => {
        const key = buildEvaluationKey(player.id, item.criterion_id);

        if (scores[key] !== undefined && scores[key] !== null && scores[key] !== '') {
          count += 1;
        }
      });
    });

    return count;
  }, [selectedPlayers, planCriteria, scores]);

  const overallProgress =
    totalExpectedScores > 0
      ? Math.round((completedScores / totalExpectedScores) * 100)
      : 0;

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

    if (!selectedPlan || planCriteria.length === 0) {
      toast.error(
        tr(
          'evaluations.planWithoutCriteria',
          'O plano selecionado não tem critérios disponíveis'
        )
      );
      return;
    }

    setEvaluationStarted(true);
    setActivePlayerIndex(0);
  };

  const backToWizard = () => {
    setEvaluationStarted(false);
  };

  const updateScore = (playerId, criterionId, value) => {


    const key = buildEvaluationKey(playerId, criterionId);
    setScores((prev) => ({ ...prev, [key]: value }));
  };

  const updateCriterionComment = (playerId, criterionId, value) => {
    const key = buildEvaluationKey(playerId, criterionId);
    setCriterionComments((prev) => ({ ...prev, [key]: value }));
  };

  const updateGeneralComment = (playerId, value) => {
    setGeneralComments((prev) => ({ ...prev, [playerId]: value }));
  };

  const getPlayerCompletedCriteria = (playerId) => {
    return planCriteria.reduce((count, item) => {
      const key = buildEvaluationKey(playerId, item.criterion_id);

      return scores[key] !== undefined && scores[key] !== null && scores[key] !== ''
        ? count + 1
        : count;
    }, 0);
  };

  const getPlayerAverage = (playerId) => {
    const values = planCriteria
      .map((item) => {
        const key = buildEvaluationKey(playerId, item.criterion_id);
        return scores[key];
      })
      .filter((value) => value !== undefined && value !== null && value !== '')
      .map(Number);

    if (values.length === 0) return null;

    return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
  };

  const goToPreviousPlayer = () => {
    setActivePlayerIndex((current) => Math.max(current - 1, 0));
  };

  const goToNextPlayer = () => {
    setActivePlayerIndex((current) =>
      Math.min(current + 1, selectedPlayers.length - 1)
    );
  };

  const buildPayloadPreview = () => ({
    plan_id: selectedPlanId,
    team_id: selectedTeamId,
    event_id: selectedEventId === 'none' ? null : selectedEventId,
    period_label: periodLabel || null,
    visibility: 'coach_only',
    evaluations: selectedPlayers.map((player) => ({
      player_id: player.id,
      share_with_player: shareWithPlayer,
      share_with_guardian: shareWithGuardian,
      general_comment: generalComments[player.id] || null,
      scores: planCriteria
        .map((item) => {
          const key = buildEvaluationKey(player.id, item.criterion_id);

          return {
            criterion_id: item.criterion_id,
            score: scores[key],
            comment: criterionComments[key] || null,
          };
        })
        .filter(
          (item) =>
            item.score !== undefined && item.score !== null && item.score !== ''
        ),
    })),
  });

  const resetEvaluationFlow = () => {
    setStepIndex(0);
    setSelectedPlanId('');
    setSelectedTeamId('');
    setSelectedEventId('none');
    setPeriodLabel('');
    setSelectedPlayerIds([]);
    setEvaluationStarted(false);
    setActivePlayerIndex(0);
    setScores({});
    setCriterionComments({});
    setGeneralComments({});
    setShareWithPlayer(false);
    setShareWithGuardian(false);
    setSaveResult(null);
  };

  const startNewEvaluation = () => {
    resetEvaluationFlow();
    fetchInitialData();
  };

  const validateBeforeSave = () => {
    if (!selectedPlanId || !selectedTeamId || selectedPlayerIds.length === 0) {
      toast.error(tr('evaluations.executionMissingData', 'Seleciona plano, equipa e atletas'));
      return false;
    }

    if (!selectedPlan || planCriteria.length === 0) {
      toast.error(
        tr(
          'evaluations.planWithoutCriteria',
          'O plano selecionado não tem critérios disponíveis'
        )
      );
      return false;
    }

    if (completedScores < totalExpectedScores) {
      toast.error(
        tr(
          'evaluations.completeAllScores',
          'Preenche todas as pontuações antes de guardar'
        )
      );
      return false;
    }

    return true;
  };

  const prepareSave = async () => {
    if (!validateBeforeSave()) return;

    const payload = buildPayloadPreview();
    setSavingEvaluations(true);

    try {
      const prepareSave = async () => {
  if (!validateBeforeSave()) {
    return;
  }

  const payload = buildPayloadPreview();

  setSavingEvaluations(true);

  try {
    const response =
      await evaluationsApi.createFromPlan(
        payload
      );

    const result = response?.data || {};

    const numericScores = Object.values(scores)
      .filter(
        (value) =>
          value !== undefined &&
          value !== null &&
          value !== ''
      )
      .map(Number);

    setSaveResult({
      ...result,
      planName: selectedPlan?.name,
      teamName: selectedTeam?.name,
      eventName: selectedEvent?.title,
      playersCount: selectedPlayers.length,
      criteriaCount: planCriteria.length,
      averageScore:
        numericScores.length > 0
          ? (
              numericScores.reduce(
                (sum, value) => sum + value,
                0
              ) / numericScores.length
            ).toFixed(1)
          : null,
    });

    setEvaluationStarted(false);

    toast.success(
      tr(
        'evaluations.savedSuccessfully',
        'Avaliações guardadas com sucesso'
      )
    );
  } catch (error) {
    console.error(
      'Error saving evaluations:',
      error
    );

    toast.error(
      error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        tr(
          'evaluations.saveError',
          'Erro ao guardar avaliações'
        )
    );
  } finally {
    setSavingEvaluations(false);
  }
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

  const renderEvaluationGrid = () => {
    if (!activePlayer) return null;

    const playerAverage = getPlayerAverage(activePlayer.id);
    const playerCompleted = getPlayerCompletedCriteria(activePlayer.id);

    return (
      <div className="space-y-5">
        <Card className="overflow-hidden border border-cyan-100 bg-white shadow-xl shadow-slate-200/60">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-5 text-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Badge className="mb-3 border border-white/15 bg-white/10 text-white">
                  <Dumbbell className="mr-1.5 h-3.5 w-3.5" />
                  {tr('evaluations.evaluationGrid', 'Grelha de Avaliação')}
                </Badge>

                <h2 className="font-heading text-3xl tracking-tight">
                  {selectedPlan?.name || tr('evaluations.plan', 'Plano')}
                </h2>

                <p className="mt-1 text-sm text-cyan-50/75">
                  {selectedTeam?.name || '-'} · {selectedPlayers.length}{' '}
                  {tr('evaluations.players', 'atletas')} · {totalCriteria}{' '}
                  {tr('evaluations.criteria', 'critérios')}
                </p>
              </div>

              <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur lg:min-w-[260px]">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span>{tr('evaluations.globalProgress', 'Progresso global')}</span>
                  <span className="font-bold">{overallProgress}%</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-cyan-400 transition-all"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>

                <p className="mt-2 text-xs text-cyan-50/70">
                  {completedScores}/{totalExpectedScores}{' '}
                  {tr('evaluations.scoresCompleted', 'pontuações preenchidas')}
                </p>
              </div>
            </div>
          </div>

          <CardContent className="p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <aside className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full"
                  onClick={backToWizard}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {tr('evaluations.backToSetup', 'Voltar à preparação')}
                </Button>

                <Card className="border border-slate-200 bg-slate-50">
                  <CardContent className="p-3">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      {tr('evaluations.players', 'Atletas')}
                    </p>

                    <div className="space-y-2">
                      {selectedPlayers.map((player, index) => {
                        const completed = getPlayerCompletedCriteria(player.id);
                        const isActive = index === activePlayerIndex;
                        const average = getPlayerAverage(player.id);

                        return (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => setActivePlayerIndex(index)}
                            className={`w-full rounded-2xl border p-3 text-left transition ${
                              isActive
                                ? 'border-cyan-300 bg-cyan-50 ring-2 ring-cyan-100'
                                : 'border-slate-200 bg-white hover:border-cyan-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-xs font-bold text-slate-700">
                                {getInitials(player.name || '?')}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-950">
                                  {player.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {completed}/{totalCriteria}{' '}
                                  {tr('evaluations.criteria', 'critérios')}
                                  {average ? ` · ${average}` : ''}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </aside>

              <main className="space-y-4">
                <Card className="border border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-cyan-50 text-lg font-bold text-cyan-700">
                          {getInitials(activePlayer.name || '?')}
                        </div>

                        <div>
                          <h3 className="font-heading text-2xl text-slate-950">
                            {activePlayer.name}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {activePlayer.position || tr('roles.player', 'Atleta')}
                          </p>
                        </div>
                      </div>

                      <div className="min-w-[220px]">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-500">
                            {tr('evaluations.progress', 'Progresso')}
                          </span>
                          <span className="font-bold text-slate-700">
                            {totalCriteria > 0
                              ? Math.round((playerCompleted / totalCriteria) * 100)
                              : 0}
                            %
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-cyan-500 transition-all duration-300"
                            style={{
                              width: `${
                                totalCriteria > 0
                                  ? Math.round((playerCompleted / totalCriteria) * 100)
                                  : 0
                              }%`,
                            }}
                          />
                        </div>

                        {playerAverage && (
                          <p className="mt-2 text-right text-sm text-slate-500">
                            {tr('evaluations.average', 'Média')}: {playerAverage}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  {planCriteria.map((planItem) => {
                    const criterion = planItem.criterion || {};
                    const criterionId = planItem.criterion_id;
                    const key = buildEvaluationKey(activePlayer.id, criterionId);
                    const min = criterion.scale_min || 1;
                    const max = criterion.scale_max || 5;

                    return (
                      <Card key={criterionId} className="border border-slate-200">
                        <CardContent className="p-4">
                          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                            <div>
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <h4 className="font-semibold text-slate-950">
                                  {criterion.name || criterionId}
                                </h4>

                                {planItem.required !== false && (
                                  <Badge
                                    variant="outline"
                                    className="rounded-full border-cyan-100 bg-cyan-50 text-cyan-700"
                                  >
                                    {tr('evaluations.required', 'Obrigatório')}
                                  </Badge>
                                )}

                                <Badge variant="outline" className="rounded-full">
                                  {min}–{max}
                                </Badge>

                                {planItem.weight && (
                                  <Badge variant="outline" className="rounded-full">
                                    {tr('evaluations.weight', 'Peso')}: {planItem.weight}
                                  </Badge>
                                )}
                              </div>

                              {criterion.description && (
                                <p className="text-sm leading-6 text-slate-500">
                                  {criterion.description}
                                </p>
                              )}
                            </div>

                            <ScoreSelector
                              value={scores[key]}
                              min={min}
                              max={max}
                              onChange={(value) =>
                                updateScore(activePlayer.id, criterionId, value)
                              }
                            />
                          </div>

                          <div className="mt-3">
                            <Textarea
                              value={criterionComments[key] || ''}
                              onChange={(event) =>
                                updateCriterionComment(
                                  activePlayer.id,
                                  criterionId,
                                  event.target.value
                                )
                              }
                              placeholder={tr(
                                'evaluations.criterionCommentPlaceholder',
                                'Comentário opcional sobre este critério'
                              )}
                              className="min-h-[76px] rounded-2xl"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <Card className="border border-slate-200">
                  <CardContent className="p-4">
                    <Label>
                      {tr('evaluations.generalComment', 'Comentário geral')}
                    </Label>
                    <Textarea
                      value={generalComments[activePlayer.id] || ''}
                      onChange={(event) =>
                        updateGeneralComment(activePlayer.id, event.target.value)
                      }
                      placeholder={tr(
                        'evaluations.generalCommentPlaceholder',
                        'Resumo qualitativo da avaliação do atleta'
                      )}
                      className="mt-2 min-h-[100px] rounded-2xl"
                    />
                  </CardContent>
                </Card>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={goToPreviousPlayer}
                    disabled={activePlayerIndex === 0}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {tr('common.previous', 'Anterior')}
                  </Button>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={goToNextPlayer}
                      disabled={activePlayerIndex === selectedPlayers.length - 1}
                    >
                      {tr('common.next', 'Seguinte')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      className="rounded-full bg-cyan-600 hover:bg-cyan-700"
                      onClick={prepareSave}
                      disabled={savingEvaluations}
                    >
                      {savingEvaluations ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {savingEvaluations
                        ? tr('evaluations.saving', 'A guardar...')
                        : tr('evaluations.saveEvaluations', 'Guardar avaliações')}
                    </Button>
                  </div>
                </div>
              </main>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-slate-50">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-slate-950">
                  {tr('evaluations.sharingOptions', 'Opções de partilha')}
                </p>
                <p className="text-sm text-slate-500">
                  {tr(
                    'evaluations.sharingOptionsHelp',
                    'Estas opções serão enviadas no payload das avaliações.'
                  )}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm">
                  <Checkbox
                    checked={shareWithPlayer}
                    onCheckedChange={(checked) => setShareWithPlayer(Boolean(checked))}
                  />
                  {tr('evaluations.shareWithPlayer', 'Partilhar com atleta')}
                </label>

                <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm">
                  <Checkbox
                    checked={shareWithGuardian}
                    onCheckedChange={(checked) =>
                      setShareWithGuardian(Boolean(checked))
                    }
                  />
                  {tr('evaluations.shareWithGuardian', 'Partilhar com responsável')}
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };


  const renderSuccessScreen = () => {
    if (!saveResult) return null;

    return (
      <div className="space-y-5">
        <Card className="overflow-hidden border border-emerald-100 bg-white shadow-xl shadow-slate-200/60">
          <div className="bg-gradient-to-br from-emerald-600 via-cyan-600 to-slate-900 p-6 text-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Badge className="mb-3 border border-white/15 bg-white/10 text-white">
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                  {tr('evaluations.savedSuccessfully', 'Avaliações guardadas com sucesso')}
                </Badge>

                <h2 className="font-heading text-3xl tracking-tight sm:text-5xl">
                  {tr('evaluations.evaluationCompleted', 'Avaliação concluída')}
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:text-base">
                  {tr(
                    'evaluations.evaluationCompletedHelp',
                    'As avaliações foram guardadas e já podem ser usadas no acompanhamento da evolução dos atletas.'
                  )}
                </p>
              </div>

              <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10">
                <Trophy className="h-10 w-10" />
              </div>
            </div>
          </div>

          <CardContent className="p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {tr('evaluations.plan', 'Plano')}
                </p>
                <p className="mt-2 font-heading text-xl text-slate-950">
                  {saveResult.planName || '-'}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {tr('common.team', 'Equipa')}
                </p>
                <p className="mt-2 font-heading text-xl text-slate-950">
                  {saveResult.teamName || '-'}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {tr('evaluations.createdEvaluations', 'Avaliações criadas')}
                </p>
                <p className="mt-2 font-heading text-4xl text-slate-950">
                  {saveResult.created_count ?? saveResult.playersCount ?? 0}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {tr('evaluations.average', 'Média')}
                </p>
                <p className="mt-2 font-heading text-4xl text-slate-950">
                  {saveResult.averageScore || '-'}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Button
                type="button"
                className="rounded-full bg-cyan-600 hover:bg-cyan-700"
                onClick={startNewEvaluation}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {tr('evaluations.newEvaluation', 'Nova Avaliação')}
              </Button>

              <Button asChild variant="outline" className="rounded-full">
                <Link to="/evaluation-plans">
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  {tr('evaluations.plansTitle', 'Planos de Avaliação')}
                </Link>
              </Button>

              <Button asChild variant="outline" className="rounded-full">
                <Link to="/evaluation-criteria">
                  <Dumbbell className="mr-2 h-4 w-4" />
                  {tr('evaluations.criteriaTitle', 'Critérios de Avaliação')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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

  if (saveResult) {
    return (
      <div
        className="space-y-5 pb-20 pt-1 lg:-mt-12 lg:pb-0"
        data-testid="evaluation-execution-page"
      >
        <section className="overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-slate-950 p-5 text-white shadow-xl shadow-slate-200/70 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Badge className="mb-3 border border-white/15 bg-white/10 text-white">
                <DevelopmentIcon className="mr-1.5 h-4 w-4" />
                {tr('developmentCenter.title', 'Centro de Desenvolvimento')}
              </Badge>

              <h1 className="font-heading text-3xl tracking-tight sm:text-5xl">
                {tr('evaluations.evaluationCompleted', 'Avaliação concluída')}
              </h1>
            </div>
          </div>
        </section>

        {renderSuccessScreen()}
      </div>
    );
  }

  if (evaluationStarted) {
    return (
      <div
        className="space-y-5 pb-20 pt-1 lg:-mt-12 lg:pb-0"
        data-testid="evaluation-execution-page"
      >
        <section className="overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-slate-950 p-5 text-white shadow-xl shadow-slate-200/70 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Badge className="mb-3 border border-white/15 bg-white/10 text-white">
                <DevelopmentIcon className="mr-1.5 h-4 w-4" />
                {tr('developmentCenter.title', 'Centro de Desenvolvimento')}
              </Badge>

              <h1 className="font-heading text-3xl tracking-tight sm:text-5xl">
                {tr('evaluations.evaluationGrid', 'Grelha de Avaliação')}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                {tr(
                  'evaluations.gridSubtitle',
                  'Avalia cada atleta com base nos critérios do plano selecionado.'
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                variant="outline"
                className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Link to="/evaluation-plans">
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  {tr('evaluations.plansTitle', 'Planos de Avaliação')}
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {renderEvaluationGrid()}
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
