import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Edit3,
  Gauge,
  Lightbulb,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePermissions } from '../context/PermissionsContext';
import {
  evaluationsApi,
  teamsApi,
} from '../services/api';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
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

const EMPTY_FORM = {
  criterion_id: '',
  title: '',
  description: '',
  target_value: '4',
  target_date: '',
  status: 'active',
};

function collection(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
}

function playerName(player) {
  return (
    player?.name ||
    player?.full_name ||
    player?.display_name ||
    [player?.first_name, player?.last_name]
      .filter(Boolean)
      .join(' ') ||
    'Atleta'
  );
}

function evaluationDate(evaluation) {
  return (
    evaluation?.evaluation_date ||
    evaluation?.created_at ||
    evaluation?.date ||
    evaluation?.updated_at ||
    null
  );
}

function formatDate(value) {
  if (!value) {
    return 'Sem prazo';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sem prazo';
  }

  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function criterionScores(evaluation) {
  const raw =
    evaluation?.criteria_scores ||
    evaluation?.scores ||
    evaluation?.results ||
    evaluation?.criteria ||
    [];

  if (Array.isArray(raw)) {
    return raw.map((item, index) => ({
      id:
        item?.criterion_id ||
        item?.id ||
        item?.code ||
        `${evaluation?.id || 'evaluation'}-${index}`,
      name:
        item?.criterion_name ||
        item?.name ||
        item?.criterion?.name ||
        `Critério ${index + 1}`,
      score: Number(item?.score ?? item?.value),
    }));
  }

  return Object.entries(raw || {}).map(([id, value]) => ({
    id,
    name: value?.name || id,
    score: Number(
      value?.score ??
        value?.value ??
        value
    ),
  }));
}

function statusInfo(status) {
  return (
    {
      completed: [
        'Concluído',
        'border-emerald-200 bg-emerald-50 text-emerald-700',
      ],
      paused: [
        'Pausado',
        'border-amber-200 bg-amber-50 text-amber-700',
      ],
      cancelled: [
        'Cancelado',
        'border-slate-200 bg-slate-100 text-slate-600',
      ],
      active: [
        'Em curso',
        'border-cyan-200 bg-cyan-50 text-cyan-700',
      ],
    }[status] || [
      'Em curso',
      'border-cyan-200 bg-cyan-50 text-cyan-700',
    ]
  );
}

function getObjectiveTiming(item) {
  if (item.status === 'completed') {
    return {
      label: 'Objetivo atingido',
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-700',
      Icon: Award,
    };
  }

  if (item.status !== 'active') {
    return {
      label:
        item.status === 'paused'
          ? 'Acompanhamento pausado'
          : 'Sem acompanhamento ativo',
      className:
        'border-slate-200 bg-slate-100 text-slate-600',
      Icon: Clock3,
    };
  }

  if (!item.target_date) {
    return {
      label:
        item.progress >= 75
          ? 'Boa evolução'
          : 'Em acompanhamento',
      className:
        item.progress >= 75
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-cyan-200 bg-cyan-50 text-cyan-700',
      Icon:
        item.progress >= 75
          ? TrendingUp
          : Gauge,
    };
  }

  const created = new Date(
    item.created_at ||
      item.updated_at ||
      Date.now()
  );

  const deadline = new Date(item.target_date);
  const now = new Date();

  const total = Math.max(
    1,
    deadline.getTime() - created.getTime()
  );

  const elapsed = Math.max(
    0,
    now.getTime() - created.getTime()
  );

  const expected = Math.max(
    0,
    Math.min(
      100,
      (elapsed / total) * 100
    )
  );

  if (
    deadline < now &&
    item.progress < 100
  ) {
    return {
      label: 'Prazo ultrapassado',
      className:
        'border-red-200 bg-red-50 text-red-700',
      Icon: CircleAlert,
    };
  }

  if (item.progress >= expected + 12) {
    return {
      label: 'À frente do esperado',
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-700',
      Icon: TrendingUp,
    };
  }

  if (item.progress + 15 < expected) {
    return {
      label: 'Necessita de atenção',
      className:
        'border-amber-200 bg-amber-50 text-amber-700',
      Icon: TrendingDown,
    };
  }

  return {
    label: 'Dentro do esperado',
    className:
      'border-cyan-200 bg-cyan-50 text-cyan-700',
    Icon: Gauge,
  };
}

function ObjectiveCard({
  item,
  canManage,
  onEdit,
  onDelete,
  onComplete,
}) {
  const [statusLabel, statusClass] =
    statusInfo(item.status);

  const timing = getObjectiveTiming(item);
  const TimingIcon = timing.Icon;

  const baseline = Number(
    item.baseline_value ??
      item.criterion?.scale_min ??
      1
  );

  const target = Number(item.target_value);

  const scaleMax = Number(
    item.criterion?.scale_max ?? 5
  );

  const safeProgress = Math.max(
    0,
    Math.min(
      100,
      Number(item.progress) || 0
    )
  );

  const remaining =
    Number.isFinite(item.currentValue) &&
    Number.isFinite(target)
      ? Math.max(
          0,
          target - item.currentValue
        )
      : null;

  return (
    <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={statusClass}
              >
                {statusLabel}
              </Badge>

              <Badge
                variant="outline"
                className={timing.className}
              >
                <TimingIcon className="mr-1.5 h-3.5 w-3.5" />
                {timing.label}
              </Badge>
            </div>

            <h3 className="font-heading text-xl text-slate-950">
              {item.title}
            </h3>

            <p className="mt-1 text-sm font-medium text-cyan-700">
              {item.criterion?.name ||
                item.criterion_name ||
                'Critério'}
            </p>

            {item.description && (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {item.description}
              </p>
            )}
          </div>

          {canManage && (
            <div className="flex gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9 rounded-xl"
                onClick={() => onEdit(item)}
                aria-label="Editar objetivo"
              >
                <Edit3 className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9 rounded-xl text-red-600"
                onClick={() => onDelete(item)}
                aria-label="Eliminar objetivo"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Progresso do objetivo
              </p>

              <p className="mt-1 font-heading text-3xl text-slate-950">
                {Math.round(safeProgress)}%
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400">
                Atual / Meta
              </p>

              <p className="font-heading text-xl text-cyan-700">
                {Number.isFinite(item.currentValue)
                  ? item.currentValue.toFixed(1)
                  : '—'}{' '}
                /{' '}
                {Number.isFinite(target)
                  ? target.toFixed(1)
                  : '—'}
              </p>
            </div>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-700"
              style={{
                width: `${safeProgress}%`,
              }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Valor inicial:{' '}
              {Number.isFinite(baseline)
                ? baseline.toFixed(1)
                : '—'}
            </span>

            <span>
              Escala máxima:{' '}
              {Number.isFinite(scaleMax)
                ? scaleMax.toFixed(1)
                : '—'}
            </span>

            <span>
              {remaining === null
                ? 'Sem avaliação atual'
                : remaining === 0
                  ? 'Meta alcançada'
                  : `Faltam ${remaining.toFixed(
                      1
                    )} pontos`}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
              <CalendarClock className="h-3.5 w-3.5" />
              Prazo
            </p>

            <p className="mt-1 font-semibold text-slate-800">
              {formatDate(item.target_date)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
              <Target className="h-3.5 w-3.5" />
              Competência
            </p>

            <p className="mt-1 truncate font-semibold text-slate-800">
              {item.criterion?.name ||
                item.criterion_name ||
                'Critério'}
            </p>
          </div>
        </div>

        {canManage &&
          item.status === 'active' &&
          item.progress >= 100 && (
            <Button
              type="button"
              variant="outline"
              className="mt-4 rounded-full border-emerald-200 bg-emerald-50 text-emerald-700"
              onClick={() => onComplete(item)}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Marcar como concluído
            </Button>
          )}
      </CardContent>
    </Card>
  );
}

export default function PlayerObjectives() {
  const { t } = useLanguage();

  const {
    user,
    activeProfile,
    viewingAs,
    loading: authLoading,
  } = useAuth();

  const permissions = usePermissions();
  const navigate = useNavigate();

  const [searchParams, setSearchParams] =
    useSearchParams();
  
  const pidId =
  searchParams.get('pid_id');

  const pidVersionParam =
    searchParams.get('pid_version');
  
  const pidVersion =
    pidVersionParam !== null &&
    pidVersionParam !== ''
      ? Number(pidVersionParam)
      : null;

  /*
   * O administrador pode receber PID e versão pela URL.
   *
   * No modo atleta, ou quando a página é aberta diretamente,
   * utilizamos o PID atual devolvido pelo backend.
   */
  const effectivePIDId =
    pidId ||
    currentPID?.id ||
    null;
  
  const effectivePIDVersion =
    Number.isFinite(pidVersion)
      ? pidVersion
      : Number(
          currentPID?.current_version ??
          1
      );
  
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [evaluations, setEvaluations] =
    useState([]);
  const [objectives, setObjectives] =
    useState([]);

  const [currentPID, setCurrentPID] =
  useState(null);
  
  const [teamId, setTeamId] = useState('');
  const [playerId, setPlayerId] =
    useState('');
  const [statusFilter, setStatusFilter] =
    useState('all');

  const [loadingTeams, setLoadingTeams] =
    useState(false);

  const [
    loadingPlayers,
    setLoadingPlayers,
  ] = useState(false);

  const [loadingData, setLoadingData] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [
    evaluationsError,
    setEvaluationsError,
  ] = useState('');

  const [
    objectivesError,
    setObjectivesError,
  ] = useState('');

  const [formOpen, setFormOpen] =
    useState(false);

  const [editingId, setEditingId] =
    useState('');

  const [form, setForm] =
    useState(EMPTY_FORM);

  const tr = useCallback(
    (key, fallback) => {
      const value = t(key);

      return value && value !== key
        ? value
        : fallback;
    },
    [t]
  );

  const effectivePlayerId =
    permissions?.effectivePlayerId ||
    permissions?.linkedPlayerId ||
    null;

  const isAthleteMode = Boolean(
    effectivePlayerId &&
      (
        permissions?.isPlayer ||
        permissions?.isViewingAsAssociated
      )
  );

  const canManageObjectives = Boolean(
    permissions?.canCreateEvaluations ||
      permissions?.hasPermission?.(
        'create_evaluations'
      )
  );

  const canViewOwnObjectives =
    isAthleteMode;

  const canViewObjectives = Boolean(
    canManageObjectives ||
      canViewOwnObjectives
  );

  const athleteProfile =
    viewingAs ||
    activeProfile ||
    user ||
    null;

  /*
   * No modo atleta, a identificação do atleta é automática.
   * O parâmetro player_id da URL nunca pode substituir o perfil ativo.
   */
  useEffect(() => {
    if (!isAthleteMode) {
      return;
    }

    setPlayerId(effectivePlayerId);
    setTeamId('');
    setPlayers([]);
    setFormOpen(false);
    setEditingId('');
  }, [
    isAthleteMode,
    effectivePlayerId,
  ]);

  /*
   * No modo gestão, permite abrir diretamente o atleta indicado na URL.
   */
  useEffect(() => {
    if (
      isAthleteMode ||
      !canManageObjectives
    ) {
      return;
    }

    const requestedTeamId =
      searchParams.get('team_id');

    const create =
      searchParams.get('create');
    
    if (
      create === 'objective' &&
      canManageObjectives
    ) {
      setFormOpen(true);
    }
    
    if (requestedTeamId) {
      setTeamId(requestedTeamId);
    }
  }, [
    isAthleteMode,
    canManageObjectives,
    searchParams,
  ]);

  /*
   * Carrega equipas apenas para os perfis que podem gerir objetivos.
   * Um atleta não deve fazer pedidos globais de equipas.
   */
  useEffect(() => {
    if (
      authLoading ||
      !canManageObjectives ||
      isAthleteMode
    ) {
      setLoadingTeams(false);
      return;
    }

    let cancelled = false;

    const loadTeams = async () => {
      setLoadingTeams(true);

      try {
        const response =
          await teamsApi.getAll();

        if (!cancelled) {
          setTeams(
            collection(response?.data)
          );
        }
      } catch (error) {
        if (!cancelled) {
          setTeams([]);

          toast.error(
            error.response?.data?.detail ||
              'Erro ao carregar equipas'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingTeams(false);
        }
      }
    };

    loadTeams();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    canManageObjectives,
    isAthleteMode,
  ]);

  /*
   * No modo atleta, carrega os critérios acessíveis sem exigir
   * a seleção de uma equipa.
   */
  useEffect(() => {
    if (
      authLoading ||
      !isAthleteMode ||
      !effectivePlayerId
    ) {
      return;
    }

    let cancelled = false;

    const loadAthleteCriteria = async () => {
      try {
        const response =
          await evaluationsApi.getCriteria();

        if (!cancelled) {
          setCriteria(
            collection(response?.data).filter(
              (criterion) =>
                criterion?.is_active !== false
            )
          );
        }
      } catch (error) {
        /*
         * Os objetivos podem trazer o critério incorporado.
         * Uma falha nesta chamada não deve bloquear o PID.
         */
        if (!cancelled) {
          setCriteria([]);
        }
      }
    };

    loadAthleteCriteria();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    isAthleteMode,
    effectivePlayerId,
  ]);

  /*
   * No modo gestão, carrega os atletas e critérios da equipa.
   */
  useEffect(() => {
    if (
      isAthleteMode ||
      !canManageObjectives
    ) {
      return;
    }
  
    if (!teamId) {
      setPlayers([]);
      setCriteria([]);
      setPlayerId('');
      return;
    }
  
    let cancelled = false;
  
    const loadTeamContext = async () => {
      setLoadingPlayers(true);
      setPlayers([]);
      setCriteria([]);
  
      try {
        const [
          playersResponse,
          criteriaResponse,
        ] = await Promise.all([
          evaluationsApi.getTeamPlayers(
            teamId
          ),
  
          evaluationsApi.getCriteria({
            team_id: teamId,
          }),
        ]);
  
        if (cancelled) {
          return;
        }
  
        const loadedPlayers =
          collection(
            playersResponse?.data
          );
  
        const loadedCriteria =
          collection(
            criteriaResponse?.data
          ).filter(
            (criterion) =>
              criterion?.is_active !==
              false
          );
  
        setPlayers(
          loadedPlayers
        );
  
        setCriteria(
          loadedCriteria
        );
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error.response
              ?.data?.detail ||
              'Erro ao carregar atletas e critérios'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingPlayers(false);
        }
      }
    };
  
    loadTeamContext();
  
    return () => {
      cancelled = true;
    };
  }, [
    teamId,
    isAthleteMode,
    canManageObjectives,
  ]);

  const loadPlayer =
    useCallback(async (id) => {
      if (!id) {
        setEvaluations([]);
        setObjectives([]);
        setEvaluationsError('');
        setObjectivesError('');
        return;
      }

      setLoadingData(true);
      setEvaluationsError('');
      setObjectivesError('');

      try {
        const [
          evaluationsResult,
          objectivesResult,
          pidResult,
        ] = await Promise.allSettled([
          evaluationsApi.getPlayerEvaluations(
            id
          ),
        
          evaluationsApi.getPlayerObjectives(
            id
          ),
        
          evaluationsApi.getPlayerPID(
            id
          ),
        ]);

        if (
          evaluationsResult.status ===
          'fulfilled'
        ) {
          setEvaluations(
            collection(
              evaluationsResult.value?.data
            )
          );
        } else {
          setEvaluations([]);

          setEvaluationsError(
            evaluationsResult.reason
              ?.response?.data?.detail ||
              'Não foi possível carregar as avaliações.'
          );
        }

        if (
          objectivesResult.status ===
          'fulfilled'
        ) {
          setObjectives(
            collection(
              objectivesResult.value?.data
            )
          );
        } else {
          setObjectives([]);

          setObjectivesError(
            objectivesResult.reason
              ?.response?.data?.detail ||
              'Não foi possível carregar os objetivos.'
          );
        }
        if (
          pidResult.status ===
          'fulfilled'
        ) {
          setCurrentPID(
            pidResult.value?.data ||
            null
          );
        } else {
          setCurrentPID(null);
        
          console.error(
            'Error loading current PID:',
            pidResult.reason
          );
        }
        
      } finally {
        setLoadingData(false);
      }
    }, []);

  useEffect(() => {
    if (playerId) {
      loadPlayer(playerId);
      return;
    }

    if (!id) {
      setEvaluations([]);
      setObjectives([]);
      setCurrentPID(null);
      setEvaluationsError('');
      setObjectivesError('');
      return;
    }, [
    playerId,
    loadPlayer,
  ]);

  /*
   * Mantém a URL alinhada com a seleção realizada pelo treinador.
   */
  useEffect(() => {
    if (isAthleteMode) {
      return;
    }

    const nextParams =
      new URLSearchParams(
        searchParams
      );

    if (teamId) {
      nextParams.set(
        'team_id',
        teamId
      );
    } else {
      nextParams.delete('team_id');
    }

    if (playerId) {
      nextParams.set(
        'player_id',
        playerId
      );
    } else {
      nextParams.delete('player_id');
    }

    if (
      nextParams.toString() !==
      searchParams.toString()
    ) {
      setSearchParams(
        nextParams,
        {
          replace: true,
        }
      );
    }
  }, [
    teamId,
    playerId,
    isAthleteMode,
    searchParams,
    setSearchParams,
  ]);

  const criteriaMap = useMemo(
    () =>
      new Map(
        criteria.map((criterion) => [
          criterion.id,
          criterion,
        ])
      ),
    [criteria]
  );

  const latest = useMemo(() => {
    const scoresMap = new Map();

    [...evaluations]
      .sort(
        (evaluationA, evaluationB) =>
          new Date(
            evaluationDate(
              evaluationB
            ) || 0
          ) -
          new Date(
            evaluationDate(
              evaluationA
            ) || 0
          )
      )
      .forEach((evaluation) => {
        criterionScores(
          evaluation
        ).forEach((score) => {
          if (
            Number.isFinite(score.score) &&
            !scoresMap.has(score.id)
          ) {
            scoresMap.set(
              score.id,
              score.score
            );
          }
        });
      });

    return scoresMap;
  }, [evaluations]);

  const enriched = useMemo(() => {
    /*
     * Quando esta página é aberta a partir de um PID,
     * apresenta apenas os objetivos pertencentes a esse PID.
     *
     * Os restantes objetivos continuam preservados na base
     * de dados e podem continuar a ser usados no histórico.
     */
    const scopedObjectives =
      effectivePIDId
        ? objectives.filter(
            (objective) => {
              /*
               * Apenas objetivos pertencentes
               * ao PID atualmente ativo.
               */
              if (
                String(
                  objective?.pid_id || ''
                ) !==
                String(
                  effectivePIDId
                )
              ) {
                return false;
              }
    
              /*
               * Apenas objetivos da versão atual
               * do PID.
               */
              const objectivePIDVersion =
                Number(
                  objective?.pid_version ??
                  1
                );
    
              return (
                objectivePIDVersion ===
                effectivePIDVersion
              );
            }
          )
    : [];
  
    return scopedObjectives.map(
      (objective) => {
        const embeddedCriterion =
          objective?.criterion ||
          null;
  
        const criterion =
          criteriaMap.get(
            objective.criterion_id
          ) ||
          embeddedCriterion ||
          {
            id:
              objective.criterion_id,
            name:
              objective.criterion_name ||
              'Critério',
            scale_min:
              objective.scale_min ?? 1,
            scale_max:
              objective.scale_max ?? 5,
          };
  
        const latestValue =
          latest.get(
            objective.criterion_id
          );
  
        const baseline = Number(
          objective.baseline_value ??
            criterion?.scale_min ??
            1
        );
  
        /*
         * Se ainda não existir uma avaliação posterior
         * à criação deste objetivo, o valor atual deve
         * corresponder ao baseline que originou o objetivo.
         *
         * Isto evita apresentar "—" imediatamente após
         * ativar um Plano Inteligente.
         */
        const currentValue =
          Number.isFinite(latestValue)
            ? latestValue
            : baseline;
  
        const target = Number(
          objective.target_value
        );
  
        let progress = 0;
  
        if (
          Number.isFinite(currentValue) &&
          Number.isFinite(target) &&
          Number.isFinite(baseline)
        ) {
          if (target <= baseline) {
            progress =
              currentValue >= target
                ? 100
                : 0;
          } else {
            progress =
              ((currentValue - baseline) /
                (target - baseline)) *
              100;
          }
        }
        return {
          ...objective,
          criterion,
          currentValue,
          progress: Math.max(
            0,
            Math.min(
              100,
              progress
            )
          ),
        };
      }
    );
  }, [
    objectives,
    criteriaMap,
    latest,
    effectivePIDId,
    effectivePIDVersion,
  ]);

  const visible =
    statusFilter === 'all'
      ? enriched
      : enriched.filter(
          (objective) =>
            objective.status ===
            statusFilter
        );

  const stats = useMemo(() => {
    const active =
      enriched.filter(
        (objective) =>
          objective.status ===
          'active'
      );

    const completed =
      enriched.filter(
        (objective) =>
          objective.status ===
          'completed'
      );

    const attention =
      active.filter((objective) => {
        const label =
          getObjectiveTiming(
            objective
          ).label;

        return [
          'Necessita de atenção',
          'Prazo ultrapassado',
        ].includes(label);
      });

    return {
      total: enriched.length,
      active: active.length,
      completed:
        completed.length,
      attention:
        attention.length,
      progress:
        active.length > 0
          ? active.reduce(
              (
                total,
                objective
              ) =>
                total +
                objective.progress,
              0
            ) / active.length
          : 0,
    };
  }, [enriched]);

  const pidInsights =
    useMemo(() => {
      if (!enriched.length) {
        return [];
      }

      const active =
        enriched.filter(
          (objective) =>
            objective.status ===
            'active'
        );

      const best =
        [...active].sort(
          (
            objectiveA,
            objectiveB
          ) =>
            objectiveB.progress -
            objectiveA.progress
        )[0];

      const risk =
        active.find(
          (objective) =>
            [
              'Necessita de atenção',
              'Prazo ultrapassado',
            ].includes(
              getObjectiveTiming(
                objective
              ).label
            )
        );

      const insights = [];

      if (best) {
        insights.push(
          `O objetivo “${best.title}” é o que apresenta maior progresso (${Math.round(
            best.progress
          )}%).`
        );
      }

      if (risk) {
        insights.push(
          `O objetivo “${risk.title}” necessita de acompanhamento prioritário.`
        );
      }

      if (
        stats.completed > 0
      ) {
        insights.push(
          `${stats.completed} ${
            stats.completed === 1
              ? 'objetivo já foi concluído'
              : 'objetivos já foram concluídos'
          }.`
        );
      }

      if (
        !risk &&
        active.length
      ) {
        insights.push(
          'O plano encontra-se globalmente dentro do ritmo esperado.'
        );
      }

      return insights.slice(
        0,
        3
      );
    }, [
      enriched,
      stats.completed,
    ]);

  const selectedPlayer =
    isAthleteMode
      ? athleteProfile
      : players.find(
          (player) =>
            String(player.id) ===
            String(playerId)
        );

  const selectedTeam =
    teams.find(
      (team) =>
        String(team.id) ===
        String(teamId)
    );

  const athleteTeamNames =
    useMemo(() => {
      const sources = [
        ...(Array.isArray(
          viewingAs?.teams
        )
          ? viewingAs.teams
          : []),
        ...(Array.isArray(
          activeProfile?.teams
        )
          ? activeProfile.teams
          : []),
      ];

      return [
        ...new Set(
          sources
            .map(
              (team) =>
                team?.name
            )
            .filter(Boolean)
        ),
      ];
    }, [
      viewingAs?.teams,
      activeProfile?.teams,
    ]);

  const teamLabel =
    selectedTeam?.name ||
    athleteTeamNames.join(', ') ||
    (
      isAthleteMode
        ? 'As minhas equipas'
        : ''
    );

  const historyPath =
    playerId
      ? `/evaluations/history?player_id=${encodeURIComponent(
          playerId
        )}`
      : '/evaluations/history';

  const closeForm = () => {
    setFormOpen(false);
    setEditingId('');
    setForm(EMPTY_FORM);
  };

  const createForm = () => {
    if (
      !canManageObjectives
    ) {
      return;
    }

    setEditingId('');
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const editForm = (
    objective
  ) => {
    if (
      !canManageObjectives
    ) {
      return;
    }

    setEditingId(
      objective.id
    );

    setForm({
      criterion_id:
        objective.criterion_id ||
        '',
      title:
        objective.title || '',
      description:
        objective.description ||
        '',
      target_value: String(
        objective.target_value ??
          4
      ),
      target_date:
        objective.target_date
          ? String(
              objective.target_date
            ).slice(0, 10)
          : '',
      status:
        objective.status ||
        'active',
    });

    setFormOpen(true);
  };

  const save = async () => {
    if (
      !canManageObjectives
    ) {
      toast.error(
        'Sem permissão para gerir objetivos.'
      );
      return;
    }

    if (
      !playerId ||
      !teamId
    ) {
      toast.error(
        'Seleciona a equipa e o atleta.'
      );
      return;
    }

    if (!form.criterion_id) {
      toast.error(
        'Seleciona um critério.'
      );
      return;
    }

    const criterion =
      criteriaMap.get(
        form.criterion_id
      );

    const target = Number(
      form.target_value
    );

    const minimum = Number(
      criterion?.scale_min ?? 1
    );

    const maximum = Number(
      criterion?.scale_max ?? 5
    );

    if (
      !Number.isFinite(target) ||
      target < minimum ||
      target > maximum
    ) {
      toast.error(
        `A meta deve estar entre ${minimum} e ${maximum}.`
      );
      return;
    }

    const currentCriterionValue =
      latest.get(
        form.criterion_id
      );

    const payload = {
      player_id: playerId,
      team_id: teamId,
      criterion_id:
        form.criterion_id,
      title:
        form.title.trim() ||
        `Desenvolver ${
          criterion?.name ||
          'competência'
        }`,
      description:
        form.description.trim() ||
        null,
      target_value: target,
      baseline_value:
        Number.isFinite(
          currentCriterionValue
        )
          ? currentCriterionValue
          : minimum,
      target_date:
        form.target_date ||
        null,
      status: form.status,
    };

    setSaving(true);

    try {
      if (editingId) {
        await evaluationsApi.updateObjective(
          editingId,
          payload
        );
      } else {
        await evaluationsApi.createObjective(
          payload
        );
      }

      toast.success(
        editingId
          ? 'Objetivo atualizado.'
          : 'Objetivo criado.'
      );

      closeForm();

      await loadPlayer(
        playerId
      );
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          'Erro ao guardar objetivo'
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (
    objective
  ) => {
    if (
      !canManageObjectives
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Eliminar o objetivo "${objective.title}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await evaluationsApi.deleteObjective(
        objective.id
      );

      toast.success(
        'Objetivo eliminado.'
      );

      await loadPlayer(
        playerId
      );
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          'Erro ao eliminar objetivo'
      );
    }
  };

  const complete = async (
    objective
  ) => {
    if (
      !canManageObjectives
    ) {
      return;
    }

    try {
      await evaluationsApi.updateObjective(
        objective.id,
        {
          status: 'completed',
        }
      );

      toast.success(
        'Objetivo concluído.'
      );

      await loadPlayer(
        playerId
      );
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          'Erro ao concluir objetivo'
      );
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  if (!canViewObjectives) {
    return (
      <Card className="border-amber-100 bg-amber-50">
        <CardContent className="p-6 text-amber-800">
          Sem permissão para consultar objetivos.
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className="space-y-5 pb-20 pt-1 lg:pb-0"
      data-testid="player-objectives-page"
    >
      <section className="overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-slate-950 p-5 text-white shadow-xl sm:p-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (pidId) {
              navigate(
                `/evaluations/pid?pid_id=${pidId}`
              );
              return;
            }
        
            navigate('/evaluations/pid');
          }}
          className="mb-4 -ml-2 text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tr(
            'developmentCenter.title',
            'Centro de Desenvolvimento'
          )}
        </Button>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="mb-3 border-white/15 bg-white/10 text-white">
              <Target className="mr-1.5 h-3.5 w-3.5" />
              Plano Individual de Desenvolvimento
            </Badge>

            {pidId && (
              <p className="mt-2 text-xs text-cyan-200">
                Plano ativo: {pidId}
              </p>
            )}
            
            <h1 className="font-heading text-3xl sm:text-5xl">
              Objetivos Individuais
            </h1>

            <p className="mt-2 max-w-2xl text-slate-300">
              {isAthleteMode
                ? 'Consulta as tuas metas, prioridades e evolução ao longo da época.'
                : 'Define metas por competência e acompanha automaticamente o progresso de cada atleta.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <Link
                to={historyPath}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Histórico
              </Link>
            </Button>

            {canManageObjectives &&
              playerId && (
                <Button
                  type="button"
                  onClick={createForm}
                  className="rounded-full bg-cyan-500 hover:bg-cyan-600"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo objetivo
                </Button>
              )}
          </div>
        </div>
      </section>

      {!isAthleteMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-600" />
              Selecionar atleta
            </CardTitle>

            <CardDescription>
              Escolhe a equipa e o atleta cujo plano pretendes consultar ou gerir.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-3 lg:grid-cols-2">
            <Select
              value={teamId}
              onValueChange={
                setTeamId
              }
              disabled={
                loadingTeams
              }
            >
              <SelectTrigger className="h-12 rounded-2xl">
                <SelectValue
                  placeholder={
                    loadingTeams
                      ? 'A carregar...'
                      : 'Selecionar equipa'
                  }
                />
              </SelectTrigger>

              <SelectContent className="bg-white">
                {teams.map(
                  (team) => (
                    <SelectItem
                      key={team.id}
                      value={team.id}
                    >
                      {team.name}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>

            <Select
              value={playerId}
              onValueChange={
                setPlayerId
              }
              disabled={
                !teamId ||
                loadingPlayers
              }
            >
              <SelectTrigger className="h-12 rounded-2xl">
                <SelectValue
                  placeholder={
                    loadingPlayers
                      ? 'A carregar...'
                      : 'Selecionar atleta'
                  }
                />
              </SelectTrigger>

              <SelectContent className="bg-white">
                {players.map(
                  (player) => (
                    <SelectItem
                      key={player.id}
                      value={player.id}
                    >
                      {playerName(
                        player
                      )}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {playerId && (
        <>
          <Card className="border-cyan-100 bg-gradient-to-br from-white via-cyan-50/60 to-slate-50">
            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-cyan-600 text-white">
                  <UserRound />
                </div>

                <div>
                  <p className="text-sm text-cyan-700">
                    {teamLabel}
                  </p>

                  <h2 className="font-heading text-2xl">
                    {playerName(
                      selectedPlayer
                    )}
                  </h2>

                  {isAthleteMode && (
                    <p className="mt-1 text-xs text-slate-500">
                      Consulta em modo atleta
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
                {[
                  [
                    'Total',
                    stats.total,
                  ],
                  [
                    'Em curso',
                    stats.active,
                  ],
                  [
                    'Concluídos',
                    stats.completed,
                  ],
                  [
                    'Atenção',
                    stats.attention,
                  ],
                  [
                    'Progresso',
                    `${Math.round(
                      stats.progress
                    )}%`,
                  ],
                ].map(
                  ([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl bg-white/80 p-3"
                    >
                      <p className="text-xs text-slate-500">
                        {label}
                      </p>

                      <p className="font-heading text-2xl">
                        {value}
                      </p>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {(evaluationsError ||
            objectivesError) && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="space-y-2 p-5 text-sm text-amber-900">
                <div className="flex items-start gap-2">
                  <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />

                  <div>
                    <p className="font-semibold">
                      Alguns dados do plano individual não ficaram disponíveis.
                    </p>

                    {evaluationsError && (
                      <p className="mt-1">
                        Avaliações:{' '}
                        {evaluationsError}
                      </p>
                    )}

                    {objectivesError && (
                      <p className="mt-1">
                        Objetivos:{' '}
                        {objectivesError}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {pidInsights.length >
            0 && (
            <Card className="overflow-hidden border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                    <Sparkles className="h-6 w-6" />
                  </div>

                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                      <Lightbulb className="h-4 w-4" />
                      {isAthleteMode
                        ? 'Resumo do teu desenvolvimento'
                        : 'Coach Insights'}
                    </p>

                    <h3 className="mt-1 font-heading text-xl text-slate-950">
                      Leitura automática do Plano Individual
                    </h3>

                    <div className="mt-3 grid gap-2 lg:grid-cols-3">
                      {pidInsights.map(
                        (
                          insight,
                          index
                        ) => (
                          <div
                            key={`${index}-${insight}`}
                            className="rounded-2xl border border-white bg-white/80 p-3 text-sm leading-5 text-slate-600 shadow-sm"
                          >
                            {insight}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {formOpen &&
            canManageObjectives && (
              <Card className="border-cyan-200">
                <CardHeader>
                  <div className="flex justify-between gap-4">
                    <div>
                      <CardTitle>
                        {editingId
                          ? 'Editar objetivo'
                          : 'Novo objetivo'}
                      </CardTitle>

                      <CardDescription>
                        Associa a meta a um critério de avaliação.
                      </CardDescription>
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={closeForm}
                      aria-label="Fechar formulário"
                    >
                      <X />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <Label>
                        Critério
                      </Label>

                      <Select
                        value={
                          form.criterion_id
                        }
                        onValueChange={(
                          value
                        ) =>
                          setForm(
                            (
                              previous
                            ) => ({
                              ...previous,
                              criterion_id:
                                value,
                            })
                          )
                        }
                      >
                        <SelectTrigger className="mt-2 h-12 rounded-2xl">
                          <SelectValue placeholder="Selecionar critério" />
                        </SelectTrigger>

                        <SelectContent className="bg-white">
                          {criteria.map(
                            (
                              criterion
                            ) => (
                              <SelectItem
                                key={
                                  criterion.id
                                }
                                value={
                                  criterion.id
                                }
                              >
                                {
                                  criterion.name
                                }
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>
                        Título
                      </Label>

                      <Input
                        className="mt-2 h-12 rounded-2xl"
                        value={
                          form.title
                        }
                        onChange={(
                          event
                        ) =>
                          setForm(
                            (
                              previous
                            ) => ({
                              ...previous,
                              title:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label>
                      Descrição
                    </Label>

                    <Textarea
                      className="mt-2 rounded-2xl"
                      value={
                        form.description
                      }
                      onChange={(
                        event
                      ) =>
                        setForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            description:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label>
                        Meta
                      </Label>

                      <Input
                        type="number"
                        step="0.1"
                        className="mt-2 h-12 rounded-2xl"
                        value={
                          form.target_value
                        }
                        onChange={(
                          event
                        ) =>
                          setForm(
                            (
                              previous
                            ) => ({
                              ...previous,
                              target_value:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </div>

                    <div>
                      <Label>
                        Prazo
                      </Label>

                      <Input
                        type="date"
                        className="mt-2 h-12 rounded-2xl"
                        value={
                          form.target_date
                        }
                        onChange={(
                          event
                        ) =>
                          setForm(
                            (
                              previous
                            ) => ({
                              ...previous,
                              target_date:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </div>

                    <div>
                      <Label>
                        Estado
                      </Label>

                      <Select
                        value={
                          form.status
                        }
                        onValueChange={(
                          value
                        ) =>
                          setForm(
                            (
                              previous
                            ) => ({
                              ...previous,
                              status:
                                value,
                            })
                          )
                        }
                      >
                        <SelectTrigger className="mt-2 h-12 rounded-2xl">
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent className="bg-white">
                          <SelectItem value="active">
                            Em curso
                          </SelectItem>

                          <SelectItem value="paused">
                            Pausado
                          </SelectItem>

                          <SelectItem value="completed">
                            Concluído
                          </SelectItem>

                          <SelectItem value="cancelled">
                            Cancelado
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={closeForm}
                    >
                      Cancelar
                    </Button>

                    <Button
                      type="button"
                      className="rounded-full bg-cyan-600 hover:bg-cyan-700"
                      onClick={save}
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
                </CardContent>
              </Card>
            )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-2xl">
                Plano individual
              </h2>

              <p className="text-sm text-slate-500">
                Metas, ritmo de evolução e prioridades de desenvolvimento do atleta.
              </p>
            </div>

            <Select
              value={statusFilter}
              onValueChange={
                setStatusFilter
              }
            >
              <SelectTrigger className="w-[180px] rounded-full bg-white">
                <SelectValue />
              </SelectTrigger>

              <SelectContent className="bg-white">
                <SelectItem value="all">
                  Todos
                </SelectItem>

                <SelectItem value="active">
                  Em curso
                </SelectItem>

                <SelectItem value="completed">
                  Concluídos
                </SelectItem>

                <SelectItem value="paused">
                  Pausados
                </SelectItem>

                <SelectItem value="cancelled">
                  Cancelados
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingData ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
            </div>
          ) : objectivesError ? (
            <Card className="border-dashed border-amber-200 bg-amber-50">
              <CardContent className="flex min-h-[220px] flex-col items-center justify-center p-6 text-center">
                <CircleAlert className="mb-3 h-12 w-12 text-amber-500" />

                <h3 className="font-heading text-2xl text-slate-950">
                  Objetivos temporariamente indisponíveis
                </h3>

                <p className="mt-2 max-w-xl text-sm text-slate-600">
                  {objectivesError}
                </p>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 rounded-full bg-white"
                  onClick={() =>
                    loadPlayer(
                      playerId
                    )
                  }
                >
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          ) : visible.length ===
            0 ? (
            <Card className="border-dashed bg-slate-50">
              <CardContent className="flex min-h-[260px] flex-col items-center justify-center p-6 text-center">
                <Target className="mb-3 h-14 w-14 text-slate-300" />

                <h3 className="font-heading text-2xl">
                  Ainda não existem objetivos
                </h3>

                <p className="mt-2 max-w-lg text-sm text-slate-500">
                  {isAthleteMode
                    ? 'O teu treinador ainda não definiu objetivos individuais para este plano de desenvolvimento.'
                    : statusFilter === 'all'
                      ? 'Cria o primeiro objetivo individual para iniciar o acompanhamento.'
                      : 'Não existem objetivos com o estado selecionado.'}
                </p>

                {canManageObjectives &&
                  statusFilter ===
                    'all' && (
                    <Button
                      type="button"
                      className="mt-4 rounded-full bg-cyan-600 hover:bg-cyan-700"
                      onClick={
                        createForm
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Criar objetivo
                    </Button>
                  )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {visible.map(
                (objective) => (
                  <ObjectiveCard
                    key={
                      objective.id
                    }
                    item={
                      objective
                    }
                    canManage={
                      canManageObjectives
                    }
                    onEdit={
                      editForm
                    }
                    onDelete={
                      remove
                    }
                    onComplete={
                      complete
                    }
                  />
                )
              )}
            </div>
          )}
        </>
      )}

      {!playerId &&
        !isAthleteMode && (
          <Card className="border-dashed bg-slate-50">
            <CardContent className="flex min-h-[260px] flex-col items-center justify-center p-6 text-center">
              <UserRound className="mb-3 h-14 w-14 text-slate-300" />

              <h3 className="font-heading text-2xl">
                Seleciona um atleta
              </h3>

              <p className="mt-2 max-w-lg text-sm text-slate-500">
                Escolhe primeiro uma equipa e depois o atleta cujo Plano Individual de Desenvolvimento pretendes consultar.
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
