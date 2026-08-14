import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileClock,
  History,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  Users,
  CircleAlert,
  Lightbulb,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePermissions } from '../context/PermissionsContext';
import { evaluationsApi, teamsApi } from '../services/api';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const PID_STATUS_CONFIG = {
  draft: {
    label: 'Rascunho',
    className: 'border-slate-200 bg-slate-50 text-slate-700',
  },
  active: {
    label: 'Ativo',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  review: {
    label: 'Em revisão',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  completed: {
    label: 'Concluído',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  archived: {
    label: 'Arquivado',
    className: 'border-slate-200 bg-slate-100 text-slate-600',
  },
};

// ============================================================
// Intelligent Development Plan
// Sprint C3.6.5
// ============================================================

const INTELLIGENT_PLAN_STATUS_CONFIG = {
  suggested: {
    label: 'Sugerido',
    className:
      'border-slate-200 bg-slate-50 text-slate-700',
  },

  active: {
    label: 'Plano Inteligente ativo',
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
  },

  review: {
    label: 'Em revisão',
    className:
      'border-amber-200 bg-amber-50 text-amber-700',
  },

  completed: {
    label: 'Concluído',
    className:
      'border-blue-200 bg-blue-50 text-blue-700',
  },
};

const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.members)) return payload.members;
  if (Array.isArray(payload?.players)) return payload.players;
  return [];
};

const getPlayerName = (profile) =>
  profile?.player_name ||
  profile?.athlete_name ||
  profile?.display_name ||
  profile?.full_name ||
  profile?.name ||
  profile?.player?.name ||
  profile?.player?.full_name ||
  'Atleta';

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const formatDate = (value, fallback = '—') => {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const toDateInputValue = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getEvaluationDate = (evaluation) =>
  evaluation?.evaluation_date ||
  evaluation?.created_at ||
  evaluation?.date ||
  evaluation?.updated_at ||
  null;

const getEvaluationAverage = (evaluation) => {
  const direct =
    evaluation?.overall_score ??
    evaluation?.average_score ??
    evaluation?.average ??
    evaluation?.score;

  if (direct !== null && direct !== undefined && direct !== '') {
    const value = Number(direct);
    if (Number.isFinite(value)) return value;
  }

  const scores =
    evaluation?.scores ||
    evaluation?.criteria_scores ||
    evaluation?.results ||
    [];

  const values = Array.isArray(scores)
    ? scores
        .map((item) => Number(item?.score ?? item?.value))
        .filter(Number.isFinite)
    : [];

  if (!values.length) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const getEvaluationCriterionScores = (evaluation) => {
  const raw =
    evaluation?.scores ||
    evaluation?.criteria_scores ||
    evaluation?.results ||
    [];

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item, index) => ({
      id:
        item?.criterion_id ||
        item?.id ||
        item?.code ||
        `${evaluation?.id || 'evaluation'}-${index}`,

      name:
        item?.criterion_name ||
        item?.name ||
        item?.criterion?.name ||
        item?.criterion?.observableAction ||
        `Critério ${index + 1}`,

      score: Number(
        item?.score ??
        item?.value
      ),
    }))
    .filter((item) =>
      Number.isFinite(item.score)
    );
};

const getObjectiveProgress = (objective) => {
  const direct = Number(
    objective?.progress ?? objective?.progress_percentage
  );

  if (Number.isFinite(direct)) {
    return Math.max(0, Math.min(100, direct));
  }

  const current = Number(
    objective?.current_score ?? objective?.current_value
  );

  const target = Number(
    objective?.target_score ?? objective?.target_value
  );

  if (Number.isFinite(current) && Number.isFinite(target) && target > 0) {
    return Math.max(0, Math.min(100, (current / target) * 100));
  }

  return objective?.status === 'completed' ? 100 : 0;
};

const buildPIDRecommendations = ({
  evaluations,
  objectives,
}) => {
  const orderedEvaluations = [
    ...(Array.isArray(evaluations)
      ? evaluations
      : []),
  ].sort(
    (first, second) =>
      new Date(
        getEvaluationDate(first) || 0
      ) -
      new Date(
        getEvaluationDate(second) || 0
      )
  );

  const criterionMap = new Map();

  orderedEvaluations.forEach(
    (evaluation) => {
      getEvaluationCriterionScores(
        evaluation
      ).forEach((criterion) => {
        if (
          !criterionMap.has(
            criterion.id
          )
        ) {
          criterionMap.set(
            criterion.id,
            {
              id: criterion.id,
              name: criterion.name,
              scores: [],
            }
          );
        }

        criterionMap
          .get(criterion.id)
          .scores.push(
            criterion.score
          );
      });
    }
  );

  const criterionSummaries =
    Array.from(
      criterionMap.values()
    )
      .map((criterion) => {
        const latest =
          criterion.scores.length
            ? criterion.scores[
                criterion.scores.length -
                  1
              ]
            : null;

        const previous =
          criterion.scores.length > 1
            ? criterion.scores[
                criterion.scores.length -
                  2
              ]
            : null;

        const average =
          criterion.scores.length
            ? criterion.scores.reduce(
                (sum, value) =>
                  sum + value,
                0
              ) /
              criterion.scores.length
            : null;

        return {
          ...criterion,
          latest,
          previous,
          average,
          evolution:
            latest !== null &&
            previous !== null
              ? latest - previous
              : null,
        };
      })
      .filter(
        (criterion) =>
          criterion.latest !== null
      );

  const activeObjectives =
    (Array.isArray(objectives)
      ? objectives
      : []
    ).filter(
      (objective) =>
        objective?.status === 'active'
    );

  const activeCriterionIds =
    new Set(
      activeObjectives
        .map(
          (objective) =>
            objective?.criterion_id
        )
        .filter(Boolean)
        .map(String)
    );

  const recommendations = [];

  const priorityCriterion = [
    ...criterionSummaries,
  ].sort(
    (first, second) =>
      first.latest -
      second.latest
  )[0];

  if (
    priorityCriterion &&
    priorityCriterion.latest < 3 &&
    !activeCriterionIds.has(
      String(
        priorityCriterion.id
      )
    )
  ) {
    recommendations.push({
      id: `priority-${priorityCriterion.id}`,
      type: 'priority',
      title: 'Criar objetivo prioritário',
      description:
        `${priorityCriterion.name} apresenta o valor atual mais baixo (${priorityCriterion.latest.toFixed(
          1
        )}) e ainda não possui um objetivo ativo.`,
      criterionId:
        priorityCriterion.id,
      criterionName:
        priorityCriterion.name,
    });
  }

  const regressionCriterion = [
    ...criterionSummaries,
  ]
    .filter(
      (criterion) =>
        criterion.evolution !== null &&
        criterion.evolution < -0.25
    )
    .sort(
      (first, second) =>
        first.evolution -
        second.evolution
    )[0];

  if (regressionCriterion) {
    recommendations.push({
      id: `regression-${regressionCriterion.id}`,
      type: 'attention',
      title: 'Rever competência em regressão',
      description:
        `${regressionCriterion.name} registou uma descida de ${Math.abs(
          regressionCriterion.evolution
        ).toFixed(
          1
        )} pontos na avaliação mais recente.`,
      criterionId:
        regressionCriterion.id,
      criterionName:
        regressionCriterion.name,
    });
  }

  const positiveCriterion = [
    ...criterionSummaries,
  ]
    .filter(
      (criterion) =>
        criterion.evolution !== null &&
        criterion.evolution > 0.25
    )
    .sort(
      (first, second) =>
        second.evolution -
        first.evolution
    )[0];

  if (positiveCriterion) {
    recommendations.push({
      id: `positive-${positiveCriterion.id}`,
      type: 'positive',
      title: 'Evolução positiva',
      description:
        `${positiveCriterion.name} melhorou ${positiveCriterion.evolution.toFixed(
          1
        )} pontos entre as duas últimas avaliações.`,
      criterionId:
        positiveCriterion.id,
      criterionName:
        positiveCriterion.name,
    });
  }

  const stalledObjective =
    activeObjectives.find(
      (objective) =>
        getObjectiveProgress(
          objective
        ) < 25
    );

  if (stalledObjective) {
    recommendations.push({
      id: `objective-${stalledObjective.id}`,
      type: 'attention',
      title: 'Objetivo com progresso reduzido',
      description:
        `O objetivo “${
          stalledObjective.title ||
          stalledObjective.criterion_name ||
          'Objetivo individual'
        }” apresenta progresso inferior a 25%.`,
      criterionId:
        stalledObjective.criterion_id,
      criterionName:
        stalledObjective.criterion_name,
    });
  }

  if (
    orderedEvaluations.length < 2
  ) {
    recommendations.push({
      id: 'insufficient-history',
      type: 'neutral',
      title: 'Histórico ainda reduzido',
      description:
        'São necessárias pelo menos duas avaliações para analisar tendências de evolução com maior segurança.',
    });
  }

  if (
    recommendations.length === 0 &&
    orderedEvaluations.length >= 2
  ) {
    recommendations.push({
      id: 'stable-plan',
      type: 'positive',
      title: 'Plano globalmente equilibrado',
      description:
        'Não foram identificadas regressões relevantes nem objetivos com progresso crítico.',
    });
  }

  return recommendations.slice(
    0,
    4
  );
};

function MetricCard({ icon: Icon, label, value, description, tone }) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 truncate text-lg font-bold text-slate-950">
            {value}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ObjectiveCard({ objective }) {
  const progress = getObjectiveProgress(objective);

  const title =
    objective?.title ||
    objective?.criterion_name ||
    objective?.name ||
    'Objetivo de desenvolvimento';

  const completed = objective?.status === 'completed';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">
            {objective?.domain_name ||
              objective?.domain ||
              objective?.category ||
              'Plano individual'}
          </p>
        </div>

        <Badge
          variant="outline"
          className={
            completed
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }
        >
          {completed ? (
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          ) : (
            <Target className="mr-1 h-3.5 w-3.5" />
          )}

          {completed ? 'Concluído' : 'Em desenvolvimento'}
        </Badge>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500">Progresso</span>
          <span className="font-bold text-slate-700">
            {Math.round(progress)}%
          </span>
        </div>

        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-cyan-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-400">Atual</p>
          <p className="mt-1 font-bold text-slate-800">
            {objective?.current_score ??
              objective?.current_value ??
              '—'}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-400">Meta</p>
          <p className="mt-1 font-bold text-slate-800">
            {objective?.target_score ??
              objective?.target_value ??
              '—'}
          </p>
        </div>
      </div>

      {objective?.deadline && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
          <CalendarDays className="h-3.5 w-3.5" />
          Prazo: {formatDate(objective.deadline)}
        </p>
      )}
    </div>
  );
}

export default function DevelopmentPID() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useLanguage();
  const permissions = usePermissions();

  const { activeProfile, viewingAs, availableProfiles } = useAuth();

  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teamId, setTeamId] = useState(
    searchParams.get('team_id') || ''
  );
  const [selectedPlayerId, setSelectedPlayerId] = useState(
    searchParams.get('player_id') || ''
  );

  const [pid, setPid] = useState(null);
  const [objectives, setObjectives] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    title: '',
    notes: '',
    next_review: '',
  });

  const [
    registeringSession,
    setRegisteringSession,
  ] = useState(false);

  const [
    decidingRenewal,
    setDecidingRenewal,
  ] = useState(false);
  
  const [
    adjustedRenewalTarget,
    setAdjustedRenewalTarget,
  ] = useState('');
  
  const tr = (key, fallback) => {
    const translated = t(key);
    return translated && translated !== key ? translated : fallback;
  };

  const effectivePlayerId =
    permissions?.effectivePlayerId ||
    permissions?.linkedPlayerId ||
    null;

  const isAthleteMode = Boolean(
    effectivePlayerId &&
      (permissions?.isPlayer === true ||
        permissions?.isViewingAsAssociated === true)
  );

  const canManage =
    permissions?.canCreateEvaluations === true ||
    permissions?.hasPermission?.('create_evaluations') === true ||
    permissions?.isAdmin === true ||
    permissions?.isCoach === true;

  const flattenedProfiles = useMemo(() => {
    if (Array.isArray(availableProfiles)) {
      return availableProfiles;
    }
  
    if (
      availableProfiles &&
      typeof availableProfiles === 'object'
    ) {
      return [
        ...(Array.isArray(
          availableProfiles.self
        )
          ? availableProfiles.self
          : []),
  
        ...(Array.isArray(
          availableProfiles.associated
        )
          ? availableProfiles.associated
          : []),
      ];
    }
  
    return [];
  }, [availableProfiles]);

  const handleRegisterSession =
    async () => {
      if (
        !pid?.id ||
        !intelligentPlan
      ) {
        toast.error(
          'Não foi possível identificar o PID ativo.'
        );
  
        return;
      }
  
      setRegisteringSession(true);
  
      try {
        const response =
          await evaluationsApi
            .registerIntelligentPIDSession(
              pid.id,
              1
            );
  
        const updatedPID =
          response?.data;
  
        if (!updatedPID?.id) {
          throw new Error(
            'O backend não devolveu o PID atualizado.'
          );
        }
  
        setPid(
          updatedPID
        );
  
        toast.success(
          'Sessão registada no Plano Inteligente.'
        );
      } catch (error) {
        console.error(
          'Error registering PID session:',
          error
        );
  
        toast.error(
          error?.response
            ?.data?.detail ||
          error?.message ||
          'Não foi possível registar a sessão.'
        );
      } finally {
        setRegisteringSession(false);
      }
    };

  const matchedAthleteProfile = useMemo(() => {
    const targetId = selectedPlayerId || effectivePlayerId;
    if (!targetId) return null;

    return (
      flattenedProfiles.find((profile) => {
        const ids = [
          profile?.id,
          profile?.user_id,
          profile?.player_id,
          profile?.athlete_id,
          profile?.profile_id,
          profile?.player?.id,
        ]
          .filter((value) => value !== null && value !== undefined)
          .map(String);

        return ids.includes(String(targetId));
      }) || null
    );
  }, [flattenedProfiles, selectedPlayerId, effectivePlayerId]);

  const playerFromSelector = useMemo(
    () =>
      players.find(
        (player) => String(player?.id) === String(selectedPlayerId)
      ) || null,
    [players, selectedPlayerId]
  );

  const athleteProfile =
    playerFromSelector ||
    matchedAthleteProfile ||
    viewingAs ||
    activeProfile ||
    null;

  const playerId = isAthleteMode
    ? effectivePlayerId
    : selectedPlayerId;

  const athleteName = getPlayerName(athleteProfile);

  const loadTeams = useCallback(async () => {
    if (isAthleteMode) return;

    setLoadingTeams(true);

    try {
      const response = await teamsApi.getAll();
      setTeams(normalizeCollection(response?.data));
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Não foi possível carregar as equipas.');
    } finally {
      setLoadingTeams(false);
    }
  }, [isAthleteMode]);

  const loadPlayers = useCallback(
    async (nextTeamId) => {
      if (isAthleteMode || !nextTeamId) {
        setPlayers([]);
        return;
      }

      setLoadingPlayers(true);

      try {
        const response = await evaluationsApi.getTeamPlayers(nextTeamId);
        setPlayers(normalizeCollection(response?.data));
      } catch (error) {
        console.error('Error loading players:', error);
        setPlayers([]);
        toast.error('Não foi possível carregar os atletas.');
      } finally {
        setLoadingPlayers(false);
      }
    },
    [isAthleteMode]
  );

  const loadPIDData = useCallback(async (targetPlayerId) => {
    if (!targetPlayerId) {
      setPid(null);
      setObjectives([]);
      setEvaluations([]);
      return;
    }
  
    setLoadingData(true);
  
    try {
      /*
       * IMPORTANTE:
       *
       * Os objetivos são carregados primeiro porque o endpoint
       * getPlayerObjectives executa a reconciliação do PID com
       * a última reavaliação.
       *
       * Só depois voltamos a pedir o PID, garantindo que
       * intelligent_plan_status, fases e estado operacional
       * já vêm sincronizados.
       */
  
      const [
        objectivesResult,
        evaluationsResult,
      ] = await Promise.allSettled([
        evaluationsApi.getPlayerObjectives(
          targetPlayerId
        ),
  
        evaluationsApi.getPlayerEvaluations(
          targetPlayerId
        ),
      ]);
  
      const nextObjectives =
        objectivesResult.status ===
        'fulfilled'
          ? normalizeCollection(
              objectivesResult.value?.data
            )
          : [];
  
      const nextEvaluations =
        evaluationsResult.status ===
        'fulfilled'
          ? normalizeCollection(
              evaluationsResult.value?.data
            )
          : [];
  
      setObjectives(
        nextObjectives
      );
  
      setEvaluations(
        nextEvaluations
      );
  
      /*
       * A reconciliação backend já terminou.
       * Agora carregamos novamente o PID atualizado.
       */
  
      let nextPID = null;
  
      try {
        const pidResponse =
          await evaluationsApi.getPlayerPID(
            targetPlayerId
          );
  
        nextPID =
          pidResponse?.data ||
          null;
      } catch (error) {
        console.error(
          'Error loading PID:',
          error
        );
  
        toast.error(
          error?.response
            ?.data?.detail ||
            'Não foi possível carregar o PID.'
        );
      }
  
      setPid(
        nextPID
      );
  
      setForm({
        title:
          nextPID?.title ||
          'Plano Individual de Desenvolvimento',
  
        notes:
          nextPID?.notes ||
          '',
  
        next_review:
          toDateInputValue(
            nextPID?.next_review
          ),
      });
  
      if (
        objectivesResult.status ===
        'rejected'
      ) {
        console.error(
          'Error loading PID objectives:',
          objectivesResult.reason
        );
      }
  
      if (
        evaluationsResult.status ===
        'rejected'
      ) {
        console.error(
          'Error loading PID evaluations:',
          evaluationsResult.reason
        );
      }
    } catch (error) {
      console.error(
        'Error loading PID page:',
        error
      );
  
      setPid(null);
      setObjectives([]);
      setEvaluations([]);
  
      toast.error(
        'Não foi possível carregar o Plano Individual de Desenvolvimento.'
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    if (!isAthleteMode && teamId) {
      loadPlayers(teamId);
    }
  }, [isAthleteMode, teamId, loadPlayers]);

  useEffect(() => {
    loadPIDData(playerId);
  }, [playerId, loadPIDData]);

  useEffect(() => {
    const params = {};

    if (!isAthleteMode && teamId) {
      params.team_id = teamId;
    }

    if (!isAthleteMode && selectedPlayerId) {
      params.player_id = selectedPlayerId;
    }

    setSearchParams(params, { replace: true });
  }, [
    isAthleteMode,
    teamId,
    selectedPlayerId,
    setSearchParams,
  ]);

  const pidRecommendations =
    useMemo(
      () =>
        buildPIDRecommendations({
          evaluations,
          objectives,
        }),
      [
        evaluations,
        objectives,
      ]
    );
  
  const savePID = async () => {
    if (!pid?.id) return;

    setSaving(true);

    try {
      const payload = {
        title:
          form.title.trim() ||
          'Plano Individual de Desenvolvimento',
        notes: form.notes.trim() || null,
        next_review: form.next_review
          ? new Date(`${form.next_review}T12:00:00`).toISOString()
          : null,
      };

      const response = await evaluationsApi.updatePID(pid.id, payload);
      const updatedPID = response?.data || { ...pid, ...payload };

      setPid(updatedPID);
      setEditing(false);
      toast.success('Plano Individual de Desenvolvimento atualizado.');
    } catch (error) {
      console.error('Error updating PID:', error);

      toast.error(
        error?.response?.data?.detail ||
          'Não foi possível atualizar o PID.'
      );
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setForm({
      title:
        pid?.title ||
        'Plano Individual de Desenvolvimento',
      notes: pid?.notes || '',
      next_review: toDateInputValue(pid?.next_review),
    });

    setEditing(false);
  };

  const statusConfig =
    PID_STATUS_CONFIG[pid?.status || 'active'] ||
    PID_STATUS_CONFIG.active;

  const intelligentPlan =
    pid?.intelligent_plan &&
    typeof pid.intelligent_plan === 'object'
      ? pid.intelligent_plan
      : null;

  const currentPIDVersion = Number(
      pid?.current_version ?? 1
    );
    
  const currentIntelligentPlanId =
      intelligentPlan?.id ||
      intelligentPlan?.sourceRecommendationId ||
      null;
  
  const summary = useMemo(() => {
    /*
     * Objetivos do ciclo inteligente atualmente ativo.
     *
     * intelligent_plan_id é a associação preferencial entre
     * o objetivo e o Plano Inteligente.
     *
     * pid_version funciona como fallback para objetivos antigos.
     */
  
    const currentCycleObjectives = objectives.filter(
      (objective) => {
        /*
         * O objetivo tem de pertencer ao PID atualmente aberto.
         */
        if (
          String(objective?.pid_id || '') !==
          String(pid?.id || '')
        ) {
          return false;
        }
  
        const objectivePlanId =
          objective?.intelligent_plan_id ||
          null;
  
        /*
         * Quando ambos possuem intelligent_plan_id,
         * essa associação é a fonte de verdade.
         */
        if (
          currentIntelligentPlanId &&
          objectivePlanId
        ) {
          return (
            String(objectivePlanId) ===
            String(currentIntelligentPlanId)
          );
        }
  
        /*
         * Compatibilidade com objetivos antigos que ainda
         * não possuem intelligent_plan_id.
         */
        const objectivePIDVersion =
          Number(
            objective?.pid_version ?? 1
          );
  
        return (
          objectivePIDVersion ===
          currentPIDVersion
        );
      }
    );
  
    const activeObjectives =
      currentCycleObjectives.filter(
        (objective) =>
          objective?.status === 'active'
      );
  
    const pausedObjectives =
      currentCycleObjectives.filter(
        (objective) =>
          objective?.status === 'paused'
      );
  
    const completedObjectives =
      currentCycleObjectives.filter(
        (objective) =>
          objective?.status === 'completed'
      );
  
    const progressValues = [
      ...activeObjectives,
      ...completedObjectives,
    ]
      .map(getObjectiveProgress)
      .filter(Number.isFinite);
  
    const averageProgress =
      progressValues.length
        ? progressValues.reduce(
            (sum, value) =>
              sum + value,
            0
          ) / progressValues.length
        : 0;
  
    const orderedEvaluations = [
      ...evaluations,
    ].sort(
      (first, second) =>
        new Date(
          getEvaluationDate(second) || 0
        ) -
        new Date(
          getEvaluationDate(first) || 0
        )
    );
  
    const latestEvaluation =
      orderedEvaluations[0] ||
      null;
  
    return {
      activeObjectives,
      pausedObjectives,
      completedObjectives,
      averageProgress,
      latestEvaluation,
  
      latestAverage:
        latestEvaluation
          ? getEvaluationAverage(
              latestEvaluation
            )
          : null,
    };
  }, [
    objectives,
    evaluations,
    pid?.id,
    currentPIDVersion,
    currentIntelligentPlanId,
  ]);
  const intelligentPlanStatus =
    pid?.intelligent_plan_status ||
    intelligentPlan?.planStatus ||
    null;
  
  const intelligentPlanStatusConfig =
    INTELLIGENT_PLAN_STATUS_CONFIG[
      intelligentPlanStatus
    ] ||
    INTELLIGENT_PLAN_STATUS_CONFIG.active;
  
  const intelligentPlanPhases =
    Array.isArray(
      intelligentPlan?.phases
    )
      ? intelligentPlan.phases
      : [];

  const operationalProgress =
    intelligentPlan
      ?.operationalProgress &&
    typeof intelligentPlan
      .operationalProgress === 'object'
      ? intelligentPlan.operationalProgress
      : {};
  
  const completedSessions =
    Number(
      operationalProgress
        .completedSessions
    ) || 0;
  
  const totalSessions =
    Number(
      operationalProgress
        .totalSessions
    ) ||
    Number(
      intelligentPlan
        ?.estimatedSessions
    ) ||
    0;
  
  const operationalProgressPercentage =
    Number.isFinite(
      Number(
        operationalProgress
          .progressPercentage
      )
    )
      ? Number(
          operationalProgress
            .progressPercentage
        )
      : (
          totalSessions > 0
            ? Math.round(
                (
                  completedSessions /
                  totalSessions
                ) *
                1000
              ) / 10
            : 0
        );
  
  const currentPhaseId =
    operationalProgress
      .currentPhaseId ||
    null;
  
  const currentPhase =
    intelligentPlanPhases.find(
      (phase) =>
        phase?.id ===
        currentPhaseId
    ) ||
    intelligentPlanPhases.find(
      (phase) =>
        phase?.status === 'active'
    ) ||
    null;  
  
  const intelligentPlanFocus =
    Array.isArray(
      intelligentPlan?.trainingFocus
    )
      ? intelligentPlan.trainingFocus
      : [];
  
  const intelligentPlanSuccessCriteria =
    Array.isArray(
      intelligentPlan?.successCriteria
    )
      ? intelligentPlan.successCriteria
      : [];
  
  if (!isAthleteMode && !canManage) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-6 text-amber-800">
          Sem permissão para gerir Planos Individuais de Desenvolvimento.
        </CardContent>
      </Card>
    );
  }

  const handleRenewalDecision =
    async (action) => {
      const renewalProposal =
        intelligentPlan?.renewalProposal;
  
      if (
        !pid?.id ||
        !renewalProposal
      ) {
        toast.error(
          'Não foi possível identificar a proposta de renovação.'
        );
  
        return;
      }
  
      if (
        action === 'adjust'
      ) {
        const nextTarget =
          Number(
            adjustedRenewalTarget
          );
  
        if (
          adjustedRenewalTarget === '' ||
          !Number.isFinite(
            nextTarget
          )
        ) {
          toast.error(
            'Indica uma nova meta válida antes de ajustar a proposta.'
          );
  
          return;
        }
  
        const scaleMax =
          Number(
            renewalProposal
              ?.scaleMax
          );
  
        if (
          Number.isFinite(
            scaleMax
          ) &&
          nextTarget >
            scaleMax
        ) {
          toast.error(
            `A nova meta não pode ser superior a ${scaleMax}.`
          );
  
          return;
        }
  
        if (
          nextTarget <= 0
        ) {
          toast.error(
            'A nova meta deve ser superior a zero.'
          );
  
          return;
        }
      }
  
      setDecidingRenewal(
        true
      );
  
      try {
        const payload = {
          action,
  
          adjusted_target:
            action === 'adjust'
              ? Number(
                  adjustedRenewalTarget
                )
              : null,
  
          note: null,
        };
  
        const response =
          await evaluationsApi
            .decidePIDRenewal(
              pid.id,
              payload
            );
  
        const updatedPID =
          response?.data;
  
        if (
          !updatedPID?.id
        ) {
          throw new Error(
            'O backend não devolveu o PID atualizado.'
          );
        }
  
        setPid(
          updatedPID
        );
  
        const updatedProposal =
          updatedPID
            ?.intelligent_plan
            ?.renewalProposal;
  
        if (
          action === 'adjust'
        ) {
          const updatedTarget =
            updatedProposal
              ?.suggestedTarget;
  
          if (
            updatedTarget !== null &&
            updatedTarget !== undefined
          ) {
            setAdjustedRenewalTarget(
              String(
                updatedTarget
              )
            );
          }
  
          toast.success(
            'Proposta ajustada. Continua a aguardar confirmação técnica.'
          );
        } else if (
          action === 'approve'
        ) {
          setAdjustedRenewalTarget(
            ''
          );
  
          toast.success(
            'Proposta de renovação confirmada.'
          );
        } else {
          setAdjustedRenewalTarget(
            ''
          );
  
          toast.success(
            'Proposta de renovação rejeitada.'
          );
        }
      } catch (error) {
        console.error(
          'Error deciding PID renewal:',
          error
        );
  
        toast.error(
          error?.response
            ?.data?.detail ||
            error?.message ||
            'Não foi possível registar a decisão.'
        );
      } finally {
        setDecidingRenewal(
          false
        );
      }
    };
  
  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-5 py-6 text-white shadow-xl shadow-slate-200/60 sm:px-7 sm:py-8 lg:px-9">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />

        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/development-center')}
            className="mb-5 -ml-2 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tr(
              'developmentCenter.title',
              'Centro de Desenvolvimento'
            )}
          </Button>

          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge className="border border-cyan-300/20 bg-cyan-400/15 text-cyan-100">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Sistema de desenvolvimento
                </Badge>
              
                {pid && (
                  <Badge className="border border-white/10 bg-white/10 text-slate-200">
                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                    Versão {pid.current_version || 1}
                  </Badge>
                )}
              
                {intelligentPlan && (
                  <Badge className="border border-emerald-300/20 bg-emerald-400/15 text-emerald-100">
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    PID Inteligente
                  </Badge>
                )}
              </div>

              <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Plano Individual de Desenvolvimento
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Organiza objetivos, prioridades, avaliações e momentos de revisão num único plano individual para cada atleta.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 font-bold">
                  {getInitials(athleteName)}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-heading text-xl">
                    {playerId ? athleteName : 'Selecionar atleta'}
                  </p>
                  <p className="truncate text-sm text-slate-300">
                    {pid?.season || 'Plano individual'}
                  </p>
                </div>
              </div>

              {pid && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={statusConfig.className}
                  >
                    {statusConfig.label}
                  </Badge>

                  <Badge className="border border-white/10 bg-white/10 text-slate-200">
                    Início {formatDate(pid.start_date, '—')}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {!isAthleteMode && (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-600" />
              Selecionar atleta
            </CardTitle>
            <CardDescription>
              Escolha a equipa e o atleta cujo PID pretende consultar.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-3 lg:grid-cols-2">
            <Select
              value={teamId}
              onValueChange={(value) => {
                setTeamId(value);
                setSelectedPlayerId('');
                setPlayers([]);
              }}
              disabled={loadingTeams}
            >
              <SelectTrigger className="h-12 rounded-2xl">
                <SelectValue
                  placeholder={
                    loadingTeams
                      ? 'A carregar equipas...'
                      : 'Selecionar equipa'
                  }
                />
              </SelectTrigger>

              <SelectContent className="bg-white">
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedPlayerId}
              onValueChange={setSelectedPlayerId}
              disabled={!teamId || loadingPlayers}
            >
              <SelectTrigger className="h-12 rounded-2xl">
                <SelectValue
                  placeholder={
                    loadingPlayers
                      ? 'A carregar atletas...'
                      : 'Selecionar atleta'
                  }
                />
              </SelectTrigger>

              <SelectContent className="bg-white">
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {getPlayerName(player)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {!playerId ? (
        <Card className="border-dashed border-slate-300 bg-slate-50">
          <CardContent className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
            <UserRound className="h-12 w-12 text-slate-300" />
            <h2 className="mt-4 font-heading text-2xl text-slate-800">
              Selecione um atleta
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              O Plano Individual de Desenvolvimento será apresentado depois de escolher uma equipa e um atleta.
            </p>
          </CardContent>
        </Card>
      ) : loadingData ? (
        <Card>
          <CardContent className="flex min-h-[320px] items-center justify-center">
            <Loader2 className="h-9 w-9 animate-spin text-cyan-600" />
          </CardContent>
        </Card>
      ) : !pid ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
            <FileClock className="h-12 w-12 text-red-300" />
            <h2 className="mt-4 font-heading text-2xl text-red-900">
              PID indisponível
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-red-700">
              Não foi possível obter ou criar o Plano Individual de Desenvolvimento deste atleta.
            </p>

            <Button
              type="button"
              variant="outline"
              className="mt-5 rounded-full bg-white"
              onClick={() => loadPIDData(playerId)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Target}
              label="Objetivos ativos"
              value={summary.activeObjectives.length}
              description={`${summary.completedObjectives.length} concluídos`}
              tone="bg-amber-50 text-amber-700"
            />

            <MetricCard
              icon={TrendingUp}
              label="Progresso médio"
              value={`${Math.round(summary.averageProgress)}%`}
              description="Objetivos atualmente ativos"
              tone="bg-cyan-50 text-cyan-700"
            />

            <MetricCard
              icon={ClipboardCheck}
              label="Última avaliação"
              value={
                summary.latestAverage !== null
                  ? summary.latestAverage.toFixed(1)
                  : '—'
              }
              description={
                summary.latestEvaluation
                  ? formatDate(
                      getEvaluationDate(summary.latestEvaluation)
                    )
                  : 'Sem avaliações'
              }
              tone="bg-violet-50 text-violet-700"
            />

            <MetricCard
              icon={CalendarDays}
              label="Próxima revisão"
              value={formatDate(pid.next_review, 'Por definir')}
              description={`Versão ${pid.current_version || 1}`}
              tone="bg-emerald-50 text-emerald-700"
            />
          </section>

          <section>
            <Card className="overflow-hidden border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 shadow-sm">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                    <Sparkles className="h-6 w-6" />
                  </div>
          
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Development Engine
                    </CardTitle>
          
                    <CardDescription>
                      Leitura automática das avaliações e dos objetivos ativos do PID.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
          
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {pidRecommendations.map(
                    (recommendation) => {
                      const config =
                        recommendation.type ===
                        'positive'
                          ? {
                              Icon: TrendingUp,
                              className:
                                'border-emerald-100 bg-emerald-50/70',
                              iconClass:
                                'bg-emerald-100 text-emerald-700',
                            }
                          : recommendation.type ===
                              'priority'
                            ? {
                                Icon: Target,
                                className:
                                  'border-red-100 bg-red-50/70',
                                iconClass:
                                  'bg-red-100 text-red-700',
                              }
                            : recommendation.type ===
                                'attention'
                              ? {
                                  Icon:
                                    TrendingDown,
                                  className:
                                    'border-amber-100 bg-amber-50/70',
                                  iconClass:
                                    'bg-amber-100 text-amber-700',
                                }
                              : {
                                  Icon:
                                    Lightbulb,
                                  className:
                                    'border-slate-200 bg-white',
                                  iconClass:
                                    'bg-slate-100 text-slate-600',
                                };
          
                      const Icon =
                        config.Icon;
          
                      return (
                        <div
                          key={
                            recommendation.id
                          }
                          className={`rounded-2xl border p-4 ${config.className}`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.iconClass}`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
          
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">
                                {
                                  recommendation.title
                                }
                              </p>
          
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                {
                                  recommendation.description
                                }
                              </p>
          
                              {recommendation.type ===
                                'priority' &&
                                recommendation.criterionId &&
                                canManage && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-3 rounded-full bg-white"
                                    onClick={() =>
                                      navigate(
                                        `/evaluations/objectives?player_id=${playerId}${
                                          teamId ? `&team_id=${teamId}` : ''
                                        }&pid_id=${pid.id}&pid_version=${pid.current_version || 1}`
                                      )
                                  >
                                    <Target className="mr-2 h-4 w-4" />
                                    Criar objetivo
                                  </Button>
                                )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          {intelligentPlan && (
            <section>
              <Card className="overflow-hidden border-cyan-100 bg-white shadow-xl shadow-cyan-100/40">
                <CardHeader className="border-b border-cyan-100 bg-gradient-to-r from-cyan-50 via-white to-indigo-50">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            intelligentPlanStatusConfig
                              .className
                          }
                        >
                          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          
                          {
                            intelligentPlanStatusConfig
                              .label
                          }
                        </Badge>
          
                        {intelligentPlan
                          .generatedAutomatically && (
                          <Badge
                            variant="outline"
                            className="border-purple-200 bg-purple-50 text-purple-700"
                          >
                            Gerado automaticamente
                          </Badge>
                        )}
                      </div>
          
                      <CardTitle className="mt-3 font-heading text-2xl text-slate-950">
                        Plano Inteligente de Desenvolvimento
                      </CardTitle>
          
                      <CardDescription className="mt-1 max-w-3xl">
                        Plano operacional associado à prioridade de desenvolvimento
                        identificada para este atleta.
                      </CardDescription>
                    </div>
          
                    <div className="lg:text-right">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Competência
                      </p>
          
                      <p className="mt-1 font-semibold text-slate-900">
                        {
                          intelligentPlan
                            .criterionName ||
                          'Competência de desenvolvimento'
                        }
                      </p>
          
                      <p className="mt-1 text-xs text-slate-500">
                        {[
                          intelligentPlan
                            .domainLabel,
                          intelligentPlan
                            .subdomainLabel,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </div>
                </CardHeader>
          
                <CardContent className="space-y-5 p-5">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-2xl border border-purple-100 bg-purple-50/70 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-purple-700">
                        IDI inicial
                      </p>
          
                      <p className="mt-2 font-heading text-2xl text-slate-950">
                        {Number.isFinite(
                          Number(
                            intelligentPlan.idiScore
                          )
                        )
                          ? Number(
                              intelligentPlan.idiScore
                            ).toFixed(1)
                          : '—'}
                      </p>
          
                      <p className="text-xs text-slate-500">
                        /100
                      </p>
                    </div>
          
                    <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-700">
                        Duração
                      </p>
          
                      <p className="mt-2 font-heading text-2xl text-slate-950">
                        {
                          intelligentPlan
                            .totalWeeks ??
                          '—'
                        }
                      </p>
          
                      <p className="text-xs text-slate-500">
                        semanas
                      </p>
                    </div>
          
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">
                        Frequência
                      </p>
          
                      <p className="mt-2 font-heading text-2xl text-slate-950">
                        {
                          intelligentPlan
                            .sessionsPerWeek ??
                          '—'
                        }
                      </p>
          
                      <p className="text-xs text-slate-500">
                        sessões/semana
                      </p>
                    </div>
          
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                        Volume
                      </p>
          
                      <p className="mt-2 font-heading text-2xl text-slate-950">
                        {
                          intelligentPlan
                            .estimatedSessions ??
                          '—'
                        }
                      </p>
          
                      <p className="text-xs text-slate-500">
                        sessões
                      </p>
                    </div>
          
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        Reavaliação
                      </p>
          
                      <p className="mt-2 font-heading text-lg leading-tight text-slate-950">
                        {formatDate(
                          intelligentPlan
                            ?.review
                            ?.recommendedDate ||
                          pid.next_review,
                          'Por definir'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Execução do plano
                        </p>
                  
                        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <p className="font-heading text-3xl text-slate-950">
                            {completedSessions}
                            <span className="ml-1 text-base font-normal text-slate-400">
                              / {totalSessions}
                            </span>
                          </p>
                  
                          <p className="text-sm text-slate-500">
                            sessões realizadas
                          </p>
                        </div>
                      </div>
                  
                      <div className="text-left lg:text-right">
                        <p className="font-heading text-3xl text-slate-950">
                          {operationalProgressPercentage.toFixed(
                            1
                          )}
                          %
                        </p>
                  
                        <p className="text-xs text-slate-500">
                          progresso operacional
                        </p>
                      </div>
                    </div>
                  
                    <div className="mt-4">
                      <div className="h-2.5 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(
                                100,
                                operationalProgressPercentage
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Fase atual
                        </p>
                  
                        <p className="mt-1 font-semibold text-slate-900">
                          {currentPhase
                            ?.label ||
                            (
                              intelligentPlan
                                ?.planStatus ===
                              'completed'
                                ? 'Plano concluído'
                                : 'Por iniciar'
                            )}
                        </p>
                      </div>
                  
                      {canManage &&
                        intelligentPlan
                          ?.planStatus !==
                          'completed' && (
                          <Button
                            type="button"
                            onClick={
                              handleRegisterSession
                            }
                            disabled={
                              registeringSession
                            }
                            className="rounded-full bg-cyan-600 text-white hover:bg-cyan-700"
                          >
                            {registeringSession ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                A registar...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Registar sessão realizada
                              </>
                            )}
                          </Button>
                        )}
                    </div>
                  </div>
                  
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Objetivo principal
                    </p>
          
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {
                        intelligentPlan
                          .objective ||
                        'Sem objetivo definido.'
                      }
                    </p>
                  </div>
          
                  <div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-heading text-xl text-slate-950">
                          Fases do plano
                        </p>
          
                        <p className="mt-1 text-sm text-slate-500">
                          Progressão prevista para a intervenção.
                        </p>
                      </div>
          
                      <Badge
                        variant="outline"
                        className="w-fit rounded-full border-slate-200 bg-slate-50 text-slate-600"
                      >
                        {
                          intelligentPlanPhases.length
                        }{' '}
                        {
                          intelligentPlanPhases.length ===
                          1
                            ? 'fase'
                            : 'fases'
                        }
                      </Badge>
                    </div>
          
                    {intelligentPlanPhases.length ===
                    0 ? (
                      <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                        Ainda não existem fases definidas neste plano.
                      </p>
                    ) : (
                      <div className="mt-4 grid gap-3 lg:grid-cols-3">
                        {intelligentPlanPhases.map(
                          (
                            phase,
                            index
                          ) => (
                            <div
                              key={
                                phase.id ||
                                index
                              }
                              className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                                  {index + 1}
                                </div>
          
                                <div>
                                  <p className="font-semibold text-slate-900">
                                    {
                                      phase.label ||
                                      `Fase ${
                                        index + 1
                                      }`
                                    }
                                  </p>
          
                                  <p className="text-xs text-slate-500">
                                    Semanas{' '}
                                    {
                                      phase.startWeek ??
                                      '—'
                                    }
                                    –
                                    {
                                      phase.endWeek ??
                                      '—'
                                    }
                                  </p>
                                </div>
                              </div>
          
                              <p className="mt-3 text-sm leading-6 text-slate-600">
                                {
                                  phase.objective ||
                                  phase.description ||
                                  'Sem descrição.'
                                }
                              </p>

                              <div className="mt-3 flex items-center justify-between gap-3">
                                <Badge
                                  variant="outline"
                                  className={
                                    phase.status ===
                                    'completed'
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                      : phase.status ===
                                        'active'
                                      ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
                                      : 'border-slate-200 bg-slate-50 text-slate-500'
                                  }
                                >
                                  {phase.status ===
                                  'completed'
                                    ? 'Concluída'
                                    : phase.status ===
                                      'active'
                                    ? 'Em curso'
                                    : 'Por iniciar'}
                                </Badge>
                              
                                <span className="text-xs text-slate-500">
                                  {Number(
                                    phase.completedSessions
                                  ) || 0}
                                  {' / '}
                                  {Number(
                                    phase.estimatedSessions
                                  ) || 0}
                                  {' sessões'}
                                </span>
                              </div>
                              
                              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={
                                    phase.status ===
                                    'completed'
                                      ? 'h-full rounded-full bg-emerald-500'
                                      : phase.status ===
                                        'active'
                                      ? 'h-full rounded-full bg-cyan-500'
                                      : 'h-full rounded-full bg-slate-300'
                                  }
                                  style={{
                                    width: `${Math.max(
                                      0,
                                      Math.min(
                                        100,
                                        Number(
                                          phase.progressPercentage
                                        ) || 0
                                      )
                                    )}%`,
                                  }}
                                />
                              </div>
                              
                              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                  Volume previsto
                                </p>
          
                                <p className="mt-1 text-sm font-semibold text-slate-800">
                                  {
                                    phase
                                      .estimatedSessions ??
                                    '—'
                                  }{' '}
                                  sessões
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
          
                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">
                        Focos de treino
                      </p>
          
                      {intelligentPlanFocus.length ===
                      0 ? (
                        <p className="mt-3 text-sm text-slate-500">
                          Sem focos de treino registados.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {intelligentPlanFocus
                            .slice(0, 5)
                            .map(
                              (
                                focus,
                                index
                              ) => (
                                <div
                                  key={`pid-focus-${index}`}
                                  className="flex items-start gap-2 rounded-xl bg-white/80 p-3"
                                >
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
          
                                  <p className="text-sm leading-5 text-slate-600">
                                    {focus}
                                  </p>
                                </div>
                              )
                            )}
                        </div>
                      )}
                    </div>
          
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                        Critérios de sucesso
                      </p>
          
                      {intelligentPlanSuccessCriteria.length ===
                      0 ? (
                        <p className="mt-3 text-sm text-slate-500">
                          Sem critérios de sucesso registados.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {intelligentPlanSuccessCriteria.map(
                            (
                              criterion,
                              index
                            ) => (
                              <div
                                key={`pid-success-${index}`}
                                className="flex items-start gap-2"
                              >
                                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
          
                                <p className="text-sm leading-6 text-slate-600">
                                  {criterion}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
          
                  {intelligentPlanStatus !==
                    'completed' &&
                    intelligentPlan
                      ?.review
                      ?.reason && (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                      <div className="flex items-start gap-3">
                        <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          
                        <div>
                          <p className="font-semibold text-slate-900">
                            Reavaliação inteligente
                          </p>
          
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {
                              intelligentPlan
                                .review
                                .reason
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          {!intelligentPlan && canManage && (
            <section>
              <Card className="border-dashed border-cyan-200 bg-cyan-50/30">
                <CardContent className="flex flex-col items-center justify-center p-7 text-center sm:p-9">
                  <Sparkles className="h-11 w-11 text-cyan-300" />
          
                  <h3 className="mt-4 font-heading text-xl text-slate-900">
                    Ainda não existe um Plano Inteligente ativo
                  </h3>
          
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    O Plano Inteligente é gerado a partir das avaliações, do IDI e
                    das recomendações automáticas do atleta e pode ser ativado pela
                    equipa técnica.
                  </p>
                </CardContent>
              </Card>
            </section>
          )}

          {[
            'proposal_pending',
            'adjusted',
          ].includes(
            intelligentPlan?.renewalStatus
          ) &&
            intelligentPlan?.renewalProposal && (
              <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-violet-200 bg-white text-violet-700"
                      >
                        Próximo passo sugerido
                      </Badge>
                
                      <Badge
                        variant="outline"
                        className="border-cyan-200 bg-cyan-50 text-cyan-700"
                      >
                        Development Engine
                      </Badge>
                    </div>
                
                    <h3 className="mt-3 text-lg font-bold text-slate-900">
                      {
                        intelligentPlan
                          .renewalProposal
                          .title
                      }
                    </h3>
                
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      {
                        intelligentPlan
                          .renewalProposal
                          .reason
                      }
                    </p>
                  </div>
                
                  <Badge
                    variant="outline"
                    className="w-fit border-amber-200 bg-amber-50 text-amber-700"
                  >
                    {intelligentPlan
                      ?.renewalProposal
                      ?.status ===
                    'pending_confirmation'
                      ? 'Ajustada · aguarda confirmação'
                      : intelligentPlan
                          ?.renewalStatus ===
                        'adjusted'
                        ? 'Ajustada · aguarda confirmação'
                        : 'A aguardar decisão'}
                  </Badge>
                </div>
                
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-slate-100 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Competência
                    </p>
          
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {
                        intelligentPlan
                          .renewalProposal
                          .sourceCriterionName ||
                        '—'
                      }
                    </p>
                  </div>
          
                  <div className="rounded-xl border border-slate-100 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Resultado
                    </p>
          
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {
                        intelligentPlan
                          .renewalProposal
                          .reviewScore ??
                        '—'
                      }
                    </p>
                  </div>
          
                  <div className="rounded-xl border border-slate-100 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Meta anterior
                    </p>
          
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {
                        intelligentPlan
                          .renewalProposal
                          .previousTarget ??
                        '—'
                      }
                    </p>
                  </div>
          
                  <div className="rounded-xl border border-slate-100 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Próxima orientação
                    </p>
          
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {
                        intelligentPlan
                          .renewalProposal
                          .type ===
                        'consolidate'
                          ? 'Consolidar'
                          : intelligentPlan
                              .renewalProposal
                              .type ===
                            'raise_target'
                            ? 'Elevar meta'
                            : 'Nova prioridade'
                      }
                    </p>
                  </div>
                </div>
          
                {/* ======================================================
                    Decisão técnica sobre a renovação
                    Sprint C3.6.6D.4B.3B.2
                    ====================================================== */}
          
                {canManage && (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white/80 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Decisão técnica
                    </p>
          
                    {intelligentPlan
                      ?.renewalProposal
                      ?.type !==
                      'new_priority' && (
                      <div className="mt-3 max-w-xs">
                        <label
                          htmlFor="renewal-target"
                          className="text-sm font-medium text-slate-700"
                        >
                          Nova meta
                        </label>
          
                        <input
                          id="renewal-target"
                          type="number"
                          step="0.1"
                          min="1"
                          max={
                            intelligentPlan
                              ?.renewalProposal
                              ?.scaleMax ||
                            5
                          }
                          value={
                            adjustedRenewalTarget
                          }
                          onChange={(event) =>
                            setAdjustedRenewalTarget(
                              event.target.value
                            )
                          }
                          placeholder={
                            intelligentPlan
                              ?.renewalProposal
                              ?.suggestedTarget ??
                            ''
                          }
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                        />
                      </div>
                    )}
          
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={() =>
                          handleRenewalDecision(
                            'reject'
                          )
                        }
                        disabled={
                          decidingRenewal
                        }
                      >
                        Rejeitar
                      </Button>
          
                      {intelligentPlan
                        ?.renewalProposal
                        ?.type !==
                        'new_priority' && (
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full"
                          onClick={() =>
                            handleRenewalDecision(
                              'adjust'
                            )
                          }
                          disabled={
                            decidingRenewal
                          }
                        >
                          Ajustar
                        </Button>
                      )}
          
                      <Button
                        type="button"
                        className="rounded-full bg-cyan-600 text-white hover:bg-cyan-700"
                        onClick={() =>
                          handleRenewalDecision(
                            'approve'
                          )
                        }
                        disabled={
                          decidingRenewal
                        }
                      >
                        {decidingRenewal ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            A guardar...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                      
                            {intelligentPlan
                              ?.renewalProposal
                              ?.status ===
                                'pending_confirmation' ||
                            intelligentPlan
                              ?.renewalStatus ===
                                'adjusted'
                              ? 'Confirmar proposta ajustada'
                              : 'Aprovar proposta'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
          
              </div>
            )}
          
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-amber-600" />
                      Objetivos do plano
                    </CardTitle>
                    <CardDescription>
                      Metas ativas e concluídas associadas ao percurso do atleta.
                    </CardDescription>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() =>
                      navigate(
                        `/evaluations/objectives?player_id=${playerId}${
                          teamId ? `&team_id=${teamId}` : ''
                        }&pid_id=${pid.id}&pid_version=${pid.current_version || 1}`
                      )
                    }
                  >
                    Gerir objetivos
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {summary.activeObjectives.length === 0 &&
                summary.completedObjectives.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <Target className="mx-auto h-10 w-10 text-slate-300" />
              
                    <p className="mt-3 font-semibold text-slate-700">
                      Ainda não existem objetivos
                    </p>
              
                    <p className="mt-1 text-sm text-slate-500">
                      Os objetivos definidos pela equipa técnica aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {summary.activeObjectives.length > 0 && (
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                            Em desenvolvimento
                          </p>
              
                          <Badge
                            variant="outline"
                            className="border-amber-200 bg-amber-50 text-amber-700"
                          >
                            {
                              summary
                                .activeObjectives
                                .length
                            }
                          </Badge>
                        </div>
              
                        <div className="grid gap-3 md:grid-cols-2">
                          {summary.activeObjectives
                            .slice(0, 4)
                            .map(
                              (objective) => (
                                <ObjectiveCard
                                  key={
                                    objective.id ||
                                    objective._id ||
                                    objective.title
                                  }
                                  objective={
                                    objective
                                  }
                                />
                              )
                            )}
                        </div>
                      </div>
                    )}
              
                    {summary.completedObjectives.length >
                      0 && (
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                            Concluídos
                          </p>
              
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700"
                          >
                            {
                              summary
                                .completedObjectives
                                .length
                            }
                          </Badge>
                        </div>
              
                        <div className="grid gap-3 md:grid-cols-2">
                          {summary.completedObjectives
                            .slice(0, 4)
                            .map(
                              (objective) => (
                                <ObjectiveCard
                                  key={
                                    objective.id ||
                                    objective._id ||
                                    objective.title
                                  }
                                  objective={
                                    objective
                                  }
                                />
                              )
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Pencil className="h-5 w-5 text-cyan-600" />
                      Dados do PID
                    </CardTitle>
                    <CardDescription>
                      Informação base e calendário de revisão.
                    </CardDescription>
                  </div>

                  {canManage && !editing && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => setEditing(true)}
                    >
                      Editar
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {editing ? (
                  <>
                    <div>
                      <label
                        htmlFor="pid-title"
                        className="text-sm font-medium text-slate-700"
                      >
                        Título
                      </label>

                      <input
                        id="pid-title"
                        type="text"
                        value={form.title}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="pid-next-review"
                        className="text-sm font-medium text-slate-700"
                      >
                        Próxima revisão
                      </label>

                      <input
                        id="pid-next-review"
                        type="date"
                        value={form.next_review}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            next_review: event.target.value,
                          }))
                        }
                        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="pid-notes"
                        className="text-sm font-medium text-slate-700"
                      >
                        Notas técnicas
                      </label>

                      <textarea
                        id="pid-notes"
                        value={form.notes}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        rows={5}
                        className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                        placeholder="Notas gerais do plano..."
                      />
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={cancelEditing}
                        disabled={saving}
                      >
                        Cancelar
                      </Button>

                      <Button
                        type="button"
                        className="rounded-full"
                        onClick={savePID}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Guardar
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Título
                      </p>
                      <p className="mt-2 font-semibold text-slate-900">
                        {pid.title ||
                          'Plano Individual de Desenvolvimento'}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Última revisão
                        </p>
                        <p className="mt-2 flex items-center gap-2 font-semibold text-slate-900">
                          <History className="h-4 w-4 text-slate-400" />
                          {formatDate(pid.last_review, 'Sem revisão')}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Próxima revisão
                        </p>
                        <p className="mt-2 flex items-center gap-2 font-semibold text-slate-900">
                          <Clock3 className="h-4 w-4 text-slate-400" />
                          {formatDate(pid.next_review, 'Por definir')}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Notas técnicas
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {pid.notes ||
                          'Ainda não foram registadas notas gerais para este plano.'}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <Card className="group border-cyan-100 bg-gradient-to-br from-white via-cyan-50/60 to-white transition hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5">
                <TrendingUp className="h-6 w-6 text-cyan-600" />
                <h3 className="mt-4 font-heading text-xl text-slate-950">
                  Evolução e comparação
                </h3>
                <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-600">
                  Consulte a evolução temporal, o Heat Map e a comparação com a equipa.
                </p>

                <Button
                  type="button"
                  variant="ghost"
                  className="mt-4 w-full justify-between rounded-xl"
                  onClick={() =>
                    navigate(
                      `/evaluations/history?player_id=${playerId}${
                        teamId ? `&team_id=${teamId}` : ''
                      }`
                    )
                  }
                >
                  Abrir desenvolvimento
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Button>
              </CardContent>
            </Card>

            <Card className="group border-amber-100 bg-gradient-to-br from-white via-amber-50/60 to-white transition hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5">
                <Target className="h-6 w-6 text-amber-600" />
                <h3 className="mt-4 font-heading text-xl text-slate-950">
                  Objetivos individuais
                </h3>
                <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-600">
                  Crie, atualize e conclua as metas associadas ao plano.
                </p>

                <Button
                  type="button"
                  variant="ghost"
                  className="mt-4 w-full justify-between rounded-xl"
                  onClick={() =>
                    navigate(
                      `/evaluations/objectives?player_id=${playerId}${
                        teamId ? `&team_id=${teamId}` : ''
                      }`
                    )
                  }
                >
                  Gerir objetivos
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Button>
              </CardContent>
            </Card>

            <Card className="group border-violet-100 bg-gradient-to-br from-white via-violet-50/60 to-white transition hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5">
                <Award className="h-6 w-6 text-violet-600" />
                <h3 className="mt-4 font-heading text-xl text-slate-950">
                  Revisões do plano
                </h3>
                <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-600">
                  O histórico de versões e revisões será integrado na próxima fase.
                </p>

                <Button
                  type="button"
                  variant="ghost"
                  className="mt-4 w-full justify-between rounded-xl"
                  disabled
                >
                  Próxima fase
                  <FileClock className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

