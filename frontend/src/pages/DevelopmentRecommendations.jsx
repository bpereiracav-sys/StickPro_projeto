import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Dumbbell,
  Gauge,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react';

import { toast } from 'sonner';

import {
  evaluationsApi,
  teamsApi,
} from '../services/api';

import {
  buildAutomaticDevelopmentRecommendations,
  formatRecommendationTrend,
  getDevelopmentPriorityConfig,
  searchDevelopmentRecommendations,
} from '../components/development/developmentRecommendations';

import {
  Badge,
} from '../components/ui/badge';

import {
  Button,
} from '../components/ui/button';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';

import {
  Input,
} from '../components/ui/input';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';

import {
  useLanguage,
} from '../context/LanguageContext';

import {
  usePermissions,
} from '../context/PermissionsContext';

import {
  useAuth,
} from '../context/AuthContext';


const ALL_VALUE = 'all';

function DevelopmentIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 48c8-17 17-26 32-32"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <path
        d="M18 44h28"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <circle
        cx="22"
        cy="51"
        r="5"
        stroke="currentColor"
        strokeWidth="4"
      />

      <circle
        cx="42"
        cy="51"
        r="5"
        stroke="currentColor"
        strokeWidth="4"
      />

      <path
        d="M38 12h12v12"
        stroke="#06b6d4"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M50 12 34 28"
        stroke="#06b6d4"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

const normalizeCollection = (
  payload
) => {
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
};


const getPlayerName = (
  player
) =>
  player?.name ||
  player?.full_name ||
  player?.display_name ||
  [
    player?.first_name,
    player?.last_name,
  ]
    .filter(Boolean)
    .join(' ') ||
  'Atleta';


const getInitials = (
  name = ''
) =>
  String(name)
    .split(' ')
    .filter(Boolean)
    .map(
      (part) => part[0]
    )
    .join('')
    .slice(0, 2)
    .toUpperCase();


const getEvaluationDate = (
  evaluation
) =>
  evaluation?.evaluation_date ||
  evaluation?.created_at ||
  evaluation?.date ||
  evaluation?.updated_at ||
  null;


const formatDate = (
  value
) => {
  if (!value) {
    return 'Sem data';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 'Sem data';
  }

  return date.toLocaleDateString(
    'pt-PT',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );
};


const getEvaluationAverage = (
  evaluation
) => {
  const directValue =
    evaluation?.overall_score ??
    evaluation?.average_score ??
    evaluation?.average ??
    evaluation?.score ??
    evaluation?.total_score;

  if (
    directValue !== undefined &&
    directValue !== null &&
    directValue !== ''
  ) {
    const numericValue =
      Number(directValue);

    if (
      Number.isFinite(
        numericValue
      )
    ) {
      return numericValue;
    }
  }

  const scores =
    Array.isArray(
      evaluation?.scores
    )
      ? evaluation.scores
      : [];

  const values =
    scores
      .map(
        (item) =>
          Number(
            item?.score ??
            item?.value
          )
      )
      .filter(
        Number.isFinite
      );

  if (
    values.length === 0
  ) {
    return null;
  }

  return (
    values.reduce(
      (
        sum,
        value
      ) =>
        sum + value,
      0
    ) /
    values.length
  );
};


const getLatestEvaluation = (
  evaluations = []
) =>
  [...evaluations]
    .sort(
      (
        first,
        second
      ) =>
        new Date(
          getEvaluationDate(
            second
          ) || 0
        ).getTime() -
        new Date(
          getEvaluationDate(
            first
          ) || 0
        ).getTime()
    )[0] ||
  null;

const getIdiStatusConfig = (
  status
) => {
  const configs = {
    critical: {
      label:
        'Desenvolvimento prioritário',
      className:
        'border-red-200 bg-red-50 text-red-700',
    },

    attention: {
      label:
        'Necessita de atenção',
      className:
        'border-orange-200 bg-orange-50 text-orange-700',
    },

    progressing: {
      label:
        'Em desenvolvimento',
      className:
        'border-amber-200 bg-amber-50 text-amber-700',
    },

    expected: {
      label:
        'Dentro do esperado',
      className:
        'border-cyan-200 bg-cyan-50 text-cyan-700',
    },

    advanced: {
      label:
        'Desempenho avançado',
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-700',
    },

    unknown: {
      label:
        'Sem dados suficientes',
      className:
        'border-slate-200 bg-slate-50 text-slate-600',
    },
  };

  return (
    configs[status] ||
    configs.unknown
  );
};


function SummaryMetric({
  label,
  value,
  helper,
  icon: Icon,
  accent = 'cyan',
}) {
  const styles = {
    cyan:
      'border-cyan-100 bg-gradient-to-br from-white via-cyan-50/70 to-slate-50 text-cyan-700',

    amber:
      'border-amber-100 bg-gradient-to-br from-white via-amber-50/70 to-slate-50 text-amber-700',

    emerald:
      'border-emerald-100 bg-gradient-to-br from-white via-emerald-50/70 to-slate-50 text-emerald-700',

    purple:
      'border-purple-100 bg-gradient-to-br from-white via-purple-50/70 to-slate-50 text-purple-700',
  };

  return (
    <Card
      className={
        styles[accent] ||
        styles.cyan
      }
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide">
              {label}
            </p>

            <p className="mt-2 whitespace-normal break-words font-heading text-2xl leading-tight text-slate-950 xl:text-3xl">
              {value}
            </p>

            {helper && (
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {helper}
              </p>
            )}
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/80">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


function RecommendationCard({
  recommendation,
  compact = false,
}) {
  const [expanded, setExpanded] =
    useState(false);

  const priorityConfig =
    getDevelopmentPriorityConfig(
      recommendation.priority
    );

  return (
    <Card className="overflow-hidden border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
      <CardContent
        className={
          compact
            ? 'p-4'
            : 'p-5'
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-heading text-xl text-slate-950">
              {
                recommendation
                  .criterionName
              }
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {[
                recommendation
                  .domainLabel,
                recommendation
                  .subdomainLabel,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`rounded-full px-3 py-1 ${
                priorityConfig.className
              }`}
            >
              {priorityConfig.label}
            </Badge>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Resultado atual
            </p>

            <p className="mt-1 font-heading text-2xl text-slate-950">
              {recommendation.latestScore !==
              null
                ? Number(
                    recommendation
                      .latestScore
                  ).toFixed(1)
                : '—'}

              <span className="text-sm text-slate-400">
                /
                {
                  recommendation
                    .scaleMax
                }
              </span>
            </p>
          </div>

          <div className="rounded-2xl bg-indigo-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-500">
              IDI
            </p>
          
            <p className="mt-1 font-heading text-2xl text-slate-900">
              {Number(
                recommendation.idiScore || 0
              ).toFixed(1)}
          
              <span className="text-sm text-slate-400">
                /100
              </span>
            </p>
          
            <p className="mt-1 text-xs text-slate-500">
              {recommendation.idiStatusLabel}
            </p>
          </div>          
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Índice
            </p>

            <p className="mt-1 font-heading text-2xl text-slate-950">
              {Number(
                recommendation
                  .recommendationIndex ||
                  0
              ).toFixed(0)}

              <span className="text-sm text-slate-400">
                /100
              </span>
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Tendência
            </p>

            <p className="mt-2 text-xs font-semibold text-slate-700">
              {formatRecommendationTrend(
                recommendation.trend
              )}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="ghost"
            className="h-auto rounded-full px-3 py-2 text-cyan-700 hover:bg-cyan-50 hover:text-cyan-800"
            onClick={() =>
              setExpanded(
                (current) => !current
              )
            }
          >
            {expanded
              ? 'Ocultar plano de desenvolvimento'
              : 'Ver plano de desenvolvimento'}
        
            <ArrowRight
              className={`ml-2 h-4 w-4 transition-transform ${
                expanded
                  ? 'rotate-90'
                  : ''
              }`}
            />
          </Button>
        
          {expanded && (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Objetivo sugerido
                </p>
        
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {
                    recommendation
                      .objective
                  }
                </p>
              </div>
        
              {recommendation
                .coachMessage && (
                <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">
                    Orientação ao treinador
                  </p>
        
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {
                      recommendation
                        .coachMessage
                    }
                  </p>
                </div>
              )}
        
              {recommendation
                .trainingFocus
                ?.length > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Focos de treino
                  </p>
        
                  <div className="mt-3 space-y-2">
                    {recommendation
                      .trainingFocus
                      .slice(0, 3)
                      .map(
                        (
                          focus,
                          index
                        ) => (
                          <div
                            key={
                              `${recommendation.id}-focus-${index}`
                            }
                            className="flex items-start gap-2 text-sm leading-6 text-slate-600"
                          >
                            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
        
                            <span>
                              {focus}
                            </span>
                          </div>
                        )
                      )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-400">
            {
              recommendation
                .evaluationCount
            }{' '}
            {
              recommendation
                .evaluationCount ===
              1
                ? 'avaliação considerada'
                : 'avaliações consideradas'
            }
          </p>

          <Badge
            variant="outline"
            className="rounded-full border-slate-200 bg-white text-slate-500"
          >
            Reavaliação recomendada
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}


export default function DevelopmentRecommendations() {
  const {
    t,
  } = useLanguage();

  const permissions =
    usePermissions();

  const {
    activeProfile,
    viewingAs,
  } = useAuth();

  const navigate =
    useNavigate();

  const {
    playerId:
      routePlayerId,
  } = useParams();

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const queryPlayerId =
    searchParams.get(
      'playerId'
    );

  const initialPlayerId =
    routePlayerId ||
    queryPlayerId ||
    permissions
      ?.effectivePlayerId ||
    permissions
      ?.linkedPlayerId ||
    '';

  const [teams, setTeams] =
    useState([]);

  const [players, setPlayers] =
    useState([]);

  const [
    evaluations,
    setEvaluations,
  ] = useState([]);

  const [
    selectedTeamId,
    setSelectedTeamId,
  ] = useState(
    searchParams.get(
      'teamId'
    ) || ''
  );

  const [
    selectedPlayerId,
    setSelectedPlayerId,
  ] = useState(
    initialPlayerId
      ? String(
          initialPlayerId
        )
      : ''
  );

  const [
    loadingTeams,
    setLoadingTeams,
  ] = useState(true);

  const [
    loadingPlayers,
    setLoadingPlayers,
  ] = useState(false);

  const [
    loadingEvaluations,
    setLoadingEvaluations,
  ] = useState(false);

  const [
    recommendationQuery,
    setRecommendationQuery,
  ] = useState('');

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState(
    ALL_VALUE
  );

  const tr = (
    key,
    fallback
  ) => {
    const value =
      t(key);

    return (
      value &&
      value !== key
        ? value
        : fallback
    );
  };

  const effectivePlayerId =
    permissions
      ?.effectivePlayerId ||
    permissions
      ?.linkedPlayerId ||
    null;

  const isAthleteMode =
    Boolean(
      effectivePlayerId &&
      (
        permissions
          ?.isPlayer === true ||
        permissions
          ?.isViewingAsAssociated ===
          true
      )
    );

  const canManageDevelopment =
    !isAthleteMode &&
    Boolean(
      permissions
        ?.isAdmin === true ||
      permissions
        ?.isStaff === true ||
      permissions
        ?.canManageTeam ===
        true ||
      permissions
        ?.canCreateEvaluations ===
        true ||
      permissions
        ?.hasPermission?.(
          'create_evaluations'
        ) === true
    );

  const canViewRecommendations =
    canManageDevelopment ||
    isAthleteMode;

  useEffect(() => {
    if (
      isAthleteMode
    ) {
      setLoadingTeams(false);

      if (
        effectivePlayerId
      ) {
        setSelectedPlayerId(
          String(
            effectivePlayerId
          )
        );
      }

      return;
    }

    fetchTeams();
  }, [
    isAthleteMode,
    effectivePlayerId,
  ]);

  useEffect(() => {
    if (
      isAthleteMode
    ) {
      return;
    }

    if (
      !selectedTeamId
    ) {
      setPlayers([]);

      if (
        !routePlayerId &&
        !queryPlayerId
      ) {
        setSelectedPlayerId('');
      }

      return;
    }

    fetchPlayers(
      selectedTeamId
    );
  }, [
    selectedTeamId,
    isAthleteMode,
  ]);

  useEffect(() => {
    if (
      !selectedPlayerId
    ) {
      setEvaluations([]);
      return;
    }

    fetchPlayerEvaluations(
      selectedPlayerId
    );

    const nextParams =
      new URLSearchParams(
        searchParams
      );

    nextParams.set(
      'playerId',
      selectedPlayerId
    );

    if (
      selectedTeamId
    ) {
      nextParams.set(
        'teamId',
        selectedTeamId
      );
    } else {
      nextParams.delete(
        'teamId'
      );
    }

    setSearchParams(
      nextParams,
      {
        replace: true,
      }
    );
  }, [
    selectedPlayerId,
  ]);

  const fetchTeams =
    async () => {
      setLoadingTeams(true);

      try {
        const response =
          await teamsApi.getAll();

        setTeams(
          normalizeCollection(
            response?.data
          )
        );
      } catch (error) {
        console.error(
          'Error loading teams:',
          error
        );

        toast.error(
          error?.response
            ?.data?.detail ||
          error?.response
            ?.data?.message ||
          error?.message ||
          'Erro ao carregar equipas'
        );
      } finally {
        setLoadingTeams(false);
      }
    };

  const fetchPlayers =
    async (
      teamId
    ) => {
      if (!teamId) {
        setPlayers([]);
        return;
      }

      setLoadingPlayers(true);

      try {
        const response =
          await evaluationsApi
            .getTeamPlayers(
              teamId
            );

        setPlayers(
          normalizeCollection(
            response?.data
          )
        );
      } catch (error) {
        console.error(
          'Error loading players:',
          error
        );

        toast.error(
          error?.response
            ?.data?.detail ||
          error?.response
            ?.data?.message ||
          error?.message ||
          'Erro ao carregar atletas'
        );

        setPlayers([]);
      } finally {
        setLoadingPlayers(false);
      }
    };

  const fetchPlayerEvaluations =
    async (
      playerId
    ) => {
      setLoadingEvaluations(true);

      try {
        const response =
          await evaluationsApi
            .getPlayerEvaluations(
              playerId
            );

        const list =
          normalizeCollection(
            response?.data
          ).sort(
            (
              first,
              second
            ) =>
              new Date(
                getEvaluationDate(
                  second
                ) || 0
              ).getTime() -
              new Date(
                getEvaluationDate(
                  first
                ) || 0
              ).getTime()
          );

        setEvaluations(
          list
        );
      } catch (error) {
        console.error(
          'Error loading recommendations:',
          error
        );

        toast.error(
          error?.response
            ?.data?.detail ||
          error?.response
            ?.data?.message ||
          error?.message ||
          'Erro ao carregar recomendações'
        );

        setEvaluations([]);
      } finally {
        setLoadingEvaluations(false);
      }
    };

  const selectedTeam =
    useMemo(
      () =>
        teams.find(
          (team) =>
            String(
              team.id
            ) ===
            String(
              selectedTeamId
            )
        ) ||
        null,
      [
        teams,
        selectedTeamId,
      ]
    );

  const selectedPlayer =
    useMemo(
      () => {
        const player =
          players.find(
            (item) =>
              String(
                item.id
              ) ===
              String(
                selectedPlayerId
              )
          );

        if (player) {
          return player;
        }

        if (
          isAthleteMode
        ) {
          const profile =
            viewingAs?.player ||
            viewingAs?.athlete ||
            viewingAs?.profile ||
            viewingAs ||
            activeProfile?.player ||
            activeProfile?.athlete ||
            activeProfile?.profile ||
            activeProfile ||
            {};

          return {
            id:
              selectedPlayerId,

            name:
              profile
                ?.player_name ||
              profile
                ?.athlete_name ||
              profile
                ?.display_name ||
              profile
                ?.full_name ||
              profile?.name ||
              'Atleta',
          };
        }

        return null;
      },
      [
        players,
        selectedPlayerId,
        isAthleteMode,
        viewingAs,
        activeProfile,
      ]
    );

  const recommendationsEngine =
    useMemo(
      () =>
        buildAutomaticDevelopmentRecommendations({
          evaluations,
          maximumRecommendations:
            100,
        }),
      [
        evaluations,
      ]
    );

  const allRecommendations =
    recommendationsEngine
      ?.allRecommendations ||
    [];

  const competencyIDI =
    recommendationsEngine
      ?.competencyIDI ||
    [];

  const domainIDI =
    recommendationsEngine
      ?.domainIDI ||
    [];
  
  const globalIDI =
    recommendationsEngine
      ?.globalIDI ||
    null;
  
  const developmentDashboard =
    useMemo(
      () => {
        const globalIdiScore =
          Number(
            globalIDI?.idiScore
          );
  
        const hasGlobalIdi =
          Number.isFinite(
            globalIdiScore
          );
  
        const priorityDomain =
          globalIDI
            ?.priorityDomain ||
          recommendationsEngine
            ?.primaryDomain ||
          domainIDI[0] ||
          null;
  
        const strongestDomain =
          globalIDI
            ?.strongestDomain ||
          recommendationsEngine
            ?.strongestDomain ||
          (
            domainIDI.length > 0
              ? domainIDI[
                  domainIDI.length -
                    1
                ]
              : null
          );
  
        const priorityCompetency =
          recommendationsEngine
            ?.primaryCompetency ||
          competencyIDI[0] ||
          null;
  
        const strongestCompetency =
          recommendationsEngine
            ?.strongestCompetency ||
          (
            competencyIDI.length > 0
              ? competencyIDI[
                  competencyIDI.length -
                    1
                ]
              : null
          );
  
        const attentionCount =
          competencyIDI.filter(
            (competency) =>
              [
                'critical',
                'attention',
                'progressing',
              ].includes(
                competency?.status
              )
          ).length;
  
        const domainsAttentionCount =
          domainIDI.filter(
            (domain) =>
              [
                'critical',
                'attention',
                'progressing',
              ].includes(
                domain?.status
              )
          ).length;
  
        return {
          globalIdi:
            hasGlobalIdi
              ? globalIdiScore
              : null,
  
          globalStatus:
            globalIDI?.status ||
            'unknown',
  
          globalStatusLabel:
            globalIDI
              ?.statusLabel ||
            'Sem dados suficientes',
  
          priorityDomain,
  
          strongestDomain,
  
          priorityCompetency,
  
          strongestCompetency,
  
          attentionCount,
  
          domainsAttentionCount,
  
          domainCount:
            Number(
              globalIDI?.domainCount
            ) || domainIDI.length,
  
          competencyCount:
            Number(
              globalIDI
                ?.competencyCount
            ) ||
            competencyIDI.length,
  
          criterionCount:
            Number(
              globalIDI
                ?.criterionCount
            ) || 0,
  
          weightingMethod:
            globalIDI
              ?.weightingMethod ||
            'criterion_count',
        };
      },
      [
        globalIDI,
        domainIDI,
        competencyIDI,
        recommendationsEngine,
      ]
    );
  
  const filteredRecommendations =
    useMemo(
      () => {
        let result =
          searchDevelopmentRecommendations(
            allRecommendations,
            recommendationQuery
          );

        if (
          priorityFilter !==
          ALL_VALUE
        ) {
          result =
            result.filter(
              (
                recommendation
              ) =>
                recommendation
                  .priority ===
                priorityFilter
            );
        }

        return result;
      },
      [
        allRecommendations,
        recommendationQuery,
        priorityFilter,
      ]
    );

  const latestEvaluation =
    useMemo(
      () =>
        getLatestEvaluation(
          evaluations
        ),
      [
        evaluations,
      ]
    );

  const evaluationAverages =
    useMemo(
      () =>
        evaluations
          .map(
            getEvaluationAverage
          )
          .filter(
            (
              value
            ) =>
              value !==
                null &&
              Number.isFinite(
                value
              )
          ),
      [
        evaluations,
      ]
    );

  const latestAverage =
    evaluationAverages
      .length > 0
      ? evaluationAverages[0]
      : null;

  const primaryRecommendation =
    recommendationsEngine
      ?.primaryRecommendation ||
    null;

  const priorityRecommendations =
    recommendationsEngine
      ?.priorities ||
    [];

  const consolidationRecommendations =
    recommendationsEngine
      ?.consolidation ||
    [];

  const strengthRecommendations =
    recommendationsEngine
      ?.strengths ||
    [];

  const improvingRecommendations =
    allRecommendations.filter(
      (
        recommendation
      ) =>
        recommendation
          ?.trend
          ?.direction ===
        'improving'
    );

  const decliningRecommendations =
    allRecommendations.filter(
      (
        recommendation
      ) =>
        recommendation
          ?.trend
          ?.direction ===
        'declining'
    );

  if (
    !canViewRecommendations
  ) {
    return (
      <div className="space-y-4 pb-20 lg:pb-0">
        <Card className="border border-amber-100 bg-amber-50">
          <CardContent className="p-6">
            <p className="font-semibold text-amber-800">
              Sem permissão para consultar as recomendações.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="space-y-5 pb-20 pt-1 lg:pb-0"
      data-testid="development-recommendations-page"
    >
      <section className="overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-slate-950 p-5 text-white shadow-xl shadow-slate-200/70 sm:p-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            navigate(
              '/development-center'
            )
          }
          className="mb-4 -ml-2 text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />

          Centro de Desenvolvimento
        </Button>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="mb-3 border border-white/15 bg-white/10 text-white">
              <DevelopmentIcon className="mr-1.5 h-4 w-4" />

              Assistente Técnico Inteligente
            </Badge>

            <h1 className="font-heading text-3xl tracking-tight sm:text-5xl">
              Recomendações de Desenvolvimento
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Identifica prioridades, competências a consolidar e pontos
              fortes com base nas avaliações e na evolução do atleta.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedPlayerId && (
              <Button
                asChild
                variant="outline"
                className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Link
                  to={
                    `/evaluations/history?playerId=${selectedPlayerId}` +
                    (
                      selectedTeamId
                        ? `&teamId=${selectedTeamId}`
                        : ''
                    )
                  }
                >
                  <BarChart3 className="mr-2 h-4 w-4" />

                  Consultar histórico
                </Link>
              </Button>
            )}

            {canManageDevelopment && (
              <Button
                asChild
                className="rounded-full bg-cyan-500 text-white hover:bg-cyan-600"
              >
                <Link to="/evaluations/new">
                  <ClipboardCheck className="mr-2 h-4 w-4" />

                  Nova avaliação
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {!isAthleteMode && (
        <Card className="border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-600" />

              Selecionar atleta
            </CardTitle>

            <CardDescription>
              Escolhe a equipa e o atleta para consultar as respetivas
              recomendações.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-3 lg:grid-cols-2">
              <Select
                value={
                  selectedTeamId
                }
                onValueChange={(
                  value
                ) => {
                  setSelectedTeamId(
                    value
                  );

                  setSelectedPlayerId(
                    ''
                  );

                  setEvaluations(
                    []
                  );
                }}
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
                        key={
                          team.id
                        }
                        value={
                          team.id
                        }
                      >
                        {
                          team.name
                        }
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>

              <Select
                value={
                  selectedPlayerId
                }
                onValueChange={
                  setSelectedPlayerId
                }
                disabled={
                  !selectedTeamId ||
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
                        key={
                          player.id
                        }
                        value={
                          player.id
                        }
                      >
                        {
                          getPlayerName(
                            player
                          )
                        }
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedPlayerId ? (
        <Card className="border border-dashed border-slate-200 bg-slate-50">
          <CardContent className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
            <UserRound className="mb-3 h-14 w-14 text-slate-300" />

            <p className="font-heading text-xl text-slate-950">
              Nenhum atleta selecionado
            </p>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Seleciona uma equipa e um atleta para consultar o respetivo
              plano de recomendações.
            </p>
          </CardContent>
        </Card>
      ) : loadingEvaluations ? (
        <Card className="border border-slate-200 bg-white">
          <CardContent className="flex min-h-[360px] items-center justify-center">
            <Loader2 className="h-9 w-9 animate-spin text-cyan-600" />
          </CardContent>
        </Card>
      ) : evaluations.length === 0 ? (
        <Card className="border border-dashed border-slate-200 bg-slate-50">
          <CardContent className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
            <ClipboardCheck className="mb-3 h-14 w-14 text-slate-300" />

            <p className="font-heading text-xl text-slate-950">
              Ainda não existem avaliações
            </p>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              As recomendações serão geradas automaticamente após a
              realização das primeiras avaliações.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden border border-cyan-100 bg-white shadow-xl shadow-slate-200/60">
            <div className="bg-gradient-to-br from-cyan-600 via-blue-600 to-slate-950 p-5 text-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-lg font-bold">
                    {getInitials(
                      getPlayerName(
                        selectedPlayer
                      )
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan-100">
                      {selectedTeam?.name ||
                        'Desenvolvimento individual'}
                    </p>

                    <h2 className="font-heading text-2xl sm:text-3xl">
                      {getPlayerName(
                        selectedPlayer
                      )}
                    </h2>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className="border border-white/15 bg-white/10 text-white">
                    <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />

                    {
                      evaluations.length
                    }{' '}
                    {
                      evaluations.length ===
                      1
                        ? 'avaliação'
                        : 'avaliações'
                    }
                  </Badge>

                  {latestEvaluation && (
                    <Badge className="border border-white/15 bg-white/10 text-white">
                      <CalendarClock className="mr-1.5 h-3.5 w-3.5" />

                      Última:{' '}
                      {formatDate(
                        getEvaluationDate(
                          latestEvaluation
                        )
                      )}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryMetric
              label="IDI Global ponderado"
              value={
                developmentDashboard
                  .globalIdi !== null
                  ? developmentDashboard
                      .globalIdi
                      .toFixed(1)
                  : '—'
              }
              helper={
                developmentDashboard
                  .globalIdi !== null
                  ? `${developmentDashboard.globalStatusLabel} · ${developmentDashboard.criterionCount} critérios considerados`
                  : 'Ainda não existem dados suficientes.'
              }
              icon={Gauge}
              accent="purple"
            />
          
            <SummaryMetric
              label="Domínio prioritário"
              value={
                developmentDashboard
                  .priorityDomain
                  ?.name ||
                '—'
              }
              helper={
                developmentDashboard
                  .priorityDomain
                  ? `IDI ${Number(
                      developmentDashboard
                        .priorityDomain
                        .idiScore
                    ).toFixed(1)} · ${
                      developmentDashboard
                        .priorityDomain
                        .statusLabel
                    }`
                  : 'Sem domínios calculados.'
              }
              icon={Target}
              accent="amber"
            />
          
            <SummaryMetric
              label="Domínio mais forte"
              value={
                developmentDashboard
                  .strongestDomain
                  ?.name ||
                '—'
              }
              helper={
                developmentDashboard
                  .strongestDomain
                  ? `IDI ${Number(
                      developmentDashboard
                        .strongestDomain
                        .idiScore
                    ).toFixed(1)} · ${
                      developmentDashboard
                        .strongestDomain
                        .statusLabel
                    }`
                  : 'Sem domínios calculados.'
              }
              icon={TrendingUp}
              accent="emerald"
            />
          
            <Card className="border-cyan-100 bg-gradient-to-br from-white via-cyan-50/70 to-slate-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">
                    Cobertura da análise
                  </p>
            
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/80 text-cyan-700">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                </div>
            
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-cyan-100 bg-white/80 p-3 text-center">
                    <p className="font-heading text-2xl leading-none text-slate-950 xl:text-3xl">
                      {
                        developmentDashboard
                          .domainCount
                      }
                    </p>
            
                    <p className="mt-2 text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-500">
                      Domínios
                    </p>
                  </div>
            
                  <div className="rounded-2xl border border-cyan-100 bg-white/80 p-3 text-center">
                    <p className="font-heading text-2xl leading-none text-slate-950 xl:text-3xl">
                      {
                        developmentDashboard
                          .competencyCount
                      }
                    </p>
            
                    <p className="mt-2 text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-500">
                      Competências
                    </p>
                  </div>
            
                  <div className="rounded-2xl border border-cyan-100 bg-white/80 p-3 text-center">
                    <p className="font-heading text-2xl leading-none text-slate-950 xl:text-3xl">
                      {
                        developmentDashboard
                          .criterionCount
                      }
                    </p>
            
                    <p className="mt-2 text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-500">
                      Critérios
                    </p>
                  </div>
                </div>
            
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Base considerada no cálculo do IDI Global ponderado.
                </p>
              </CardContent>
            </Card>
          </div>

          {developmentDashboard
            .globalIdi !== null && (
            <Card className="overflow-hidden border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Gauge className="h-7 w-7" />
                    </div>
          
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Síntese inteligente
                      </p>
          
                      <h3 className="mt-1 font-heading text-2xl text-slate-950">
                        IDI Global{' '}
                        {developmentDashboard
                          .globalIdi
                          .toFixed(1)}
                        /100
                      </h3>
          
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                        O IDI Global é calculado a partir dos domínios avaliados,
                        ponderando cada domínio pelo número de critérios válidos que
                        representa. Cada critério combina nível atual, tendência e
                        consistência.
                      </p>
                    </div>
                  </div>
          
                  <Badge
                    variant="outline"
                    className={
                      getIdiStatusConfig(
                        developmentDashboard
                          .globalStatus
                      ).className
                    }
                  >
                    {
                      developmentDashboard
                        .globalStatusLabel
                    }
                  </Badge>
                </div>
          
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                      Domínio prioritário
                    </p>
          
                    <p className="mt-2 font-semibold text-slate-900">
                      {
                        developmentDashboard
                          .priorityDomain
                          ?.name ||
                        'Sem dados'
                      }
                    </p>
          
                    {developmentDashboard
                      .priorityDomain && (
                      <p className="mt-1 text-xs text-slate-500">
                        IDI{' '}
                        {Number(
                          developmentDashboard
                            .priorityDomain
                            .idiScore
                        ).toFixed(1)}
                        {' · '}
                        {
                          developmentDashboard
                            .priorityDomain
                            .competencyCount
                        }{' '}
                        competências
                      </p>
                    )}
                  </div>
          
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                      Domínio mais forte
                    </p>
                  
                    <p className="mt-2 whitespace-normal break-words font-semibold leading-tight text-slate-900">
                      {
                        developmentDashboard
                          .strongestDomain
                          ?.name ||
                        'Sem dados'
                      }
                    </p>
                  
                    {developmentDashboard
                      .strongestDomain && (
                      <p className="mt-1 text-xs text-slate-500">
                        IDI{' '}
                        {Number(
                          developmentDashboard
                            .strongestDomain
                            .idiScore
                        ).toFixed(1)}
                        {' · '}
                        {
                          developmentDashboard
                            .strongestDomain
                            .criterionCount
                        }{' '}
                        critérios
                      </p>
                    )}
                  </div>
          
                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">
                      Competência prioritária
                    </p>
          
                    <p className="mt-2 font-semibold text-slate-900">
                      {
                        developmentDashboard
                          .priorityCompetency
                          ?.name ||
                        'Sem dados'
                      }
                    </p>
          
                    {developmentDashboard
                      .priorityCompetency && (
                      <p className="mt-1 text-xs text-slate-500">
                        IDI{' '}
                        {Number(
                          developmentDashboard
                            .priorityCompetency
                            .idiScore
                        ).toFixed(1)}
                        {' · '}
                        {
                          developmentDashboard
                            .priorityCompetency
                            .statusLabel
                        }
                      </p>
                    )}
                  </div>
          
                  <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-purple-700">
                      Método de cálculo
                    </p>
                  
                    <p className="mt-2 font-semibold text-slate-900">
                      IDI ponderado
                    </p>
                  
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      O peso de cada domínio considera o número de critérios válidos avaliados.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="border border-blue-100 bg-gradient-to-br from-white via-blue-50/50 to-slate-50 shadow-xl shadow-slate-200/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
          
                Índice Inteligente por Domínio
              </CardTitle>
          
              <CardDescription>
                Agregação ponderada das competências em cada domínio de
                desenvolvimento.
              </CardDescription>
            </CardHeader>
          
            <CardContent>
              {domainIDI.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Ainda não existem domínios calculados.
                </p>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {domainIDI.map(
                    (domain) => (
                      <div
                        key={domain.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="whitespace-normal break-words font-heading text-xl leading-tight text-slate-950">
                              {domain.name}
                            </p>
          
                            <p className="mt-1 text-xs text-slate-500">
                              {
                                domain
                                  .competencyCount
                              }{' '}
                              {
                                domain
                                  .competencyCount ===
                                1
                                  ? 'competência'
                                  : 'competências'
                              }
                              {' · '}
                              {
                                domain
                                  .criterionCount
                              }{' '}
                              {
                                domain
                                  .criterionCount ===
                                1
                                  ? 'critério'
                                  : 'critérios'
                              }
                            </p>
                          </div>
          
                          <div className="shrink-0 text-right">
                            <p className="font-heading text-3xl text-slate-950">
                              {Number(
                                domain.idiScore
                              ).toFixed(1)}
                            </p>
          
                            <p className="text-xs text-slate-400">
                              /100
                            </p>
                          </div>
                        </div>
          
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className={
                              getIdiStatusConfig(
                                domain.status
                              ).className
                            }
                          >
                            {domain.statusLabel}
                          </Badge>
          
                          <Badge
                            variant="outline"
                            className="border-slate-200 bg-slate-50 text-slate-600"
                          >
                            Ponderado por critérios
                          </Badge>
                        </div>
          
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <div className="rounded-xl bg-amber-50 p-3">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">
                              Competência prioritária
                            </p>
          
                            <p className="mt-1 whitespace-normal break-words text-sm font-semibold leading-tight text-slate-900">
                              {
                                domain
                                  .priorityCompetency
                                  ?.name ||
                                '—'
                              }
                            </p>
          
                            {domain
                              .priorityCompetency && (
                              <p className="mt-1 text-xs text-slate-500">
                                IDI{' '}
                                {Number(
                                  domain
                                    .priorityCompetency
                                    .idiScore
                                ).toFixed(1)}
                              </p>
                            )}
                          </div>
          
                          <div className="rounded-xl bg-emerald-50 p-3">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                              Competência mais forte
                            </p>
          
                            <p className="mt-1 whitespace-normal break-words text-sm font-semibold leading-tight text-slate-900">
                              {
                                domain
                                  .strongestCompetency
                                  ?.name ||
                                '—'
                              }
                            </p>
          
                            {domain
                              .strongestCompetency && (
                              <p className="mt-1 text-xs text-slate-500">
                                IDI{' '}
                                {Number(
                                  domain
                                    .strongestCompetency
                                    .idiScore
                                ).toFixed(1)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/50 to-slate-50 shadow-xl shadow-slate-200/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-indigo-600" />
          
                Índice Inteligente por Competência
              </CardTitle>
          
              <CardDescription>
                Síntese automática do desenvolvimento por competência.
              </CardDescription>
            </CardHeader>
          
            <CardContent>
              {competencyIDI.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Ainda não existem competências calculadas.
                </p>
              ) : (
                <div className="space-y-3">
                  {competencyIDI.map((competency) => (
                    <div
                      key={competency.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="whitespace-normal break-words font-semibold leading-tight text-slate-900">
                            {competency.name}
                          </p>
          
                          <p className="mt-1 whitespace-normal break-words text-xs leading-tight text-slate-500">
                            {competency.domainName}
                          </p>
                        </div>
          
                        <div className="text-right">
                          <p className="font-heading text-2xl text-slate-900">
                            {Number(
                              competency.idiScore || 0
                            ).toFixed(1)}
                          </p>
          
                          <p className="text-xs text-slate-500">
                            /100
                          </p>
                        </div>
                      </div>
          
                      <div className="mt-3">
                        <Badge
                          className="border border-indigo-200 bg-indigo-50 text-indigo-700"
                        >
                          {competency.statusLabel}
                        </Badge>
                      </div>
          
                      <div className="mt-4 grid grid-cols-5 gap-2 text-center">
          
                        <div>
                          <p className="font-bold text-red-600">
                            {competency.critical}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Críticos
                          </p>
                        </div>
          
                        <div>
                          <p className="font-bold text-orange-600">
                            {competency.high}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Elevados
                          </p>
                        </div>
          
                        <div>
                          <p className="font-bold text-amber-600">
                            {competency.moderate}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Moderados
                          </p>
                        </div>
          
                        <div>
                          <p className="font-bold text-cyan-600">
                            {competency.consolidation}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Consolidação
                          </p>
                        </div>
          
                        <div>
                          <p className="font-bold text-emerald-600">
                            {competency.strengths}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Fortes
                          </p>
                        </div>
          
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>   
          
          {primaryRecommendation && (
            <Card className="overflow-hidden border border-cyan-200 bg-white shadow-xl shadow-cyan-100/50">
              <CardHeader className="border-b border-cyan-100 bg-gradient-to-r from-cyan-50 via-white to-blue-50">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">
                      Recomendação principal
                    </p>

                    <CardTitle className="mt-1 text-2xl">
                      {
                        primaryRecommendation
                          .criterionName
                      }
                    </CardTitle>

                    <CardDescription>
                      {[
                        primaryRecommendation
                          .domainLabel,
                        primaryRecommendation
                          .subdomainLabel,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5">
                <RecommendationCard
                  recommendation={
                    primaryRecommendation
                  }
                  compact
                />
              </CardContent>
            </Card>
          )}

          <Card className="border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-cyan-600" />

                    Todas as recomendações
                  </CardTitle>

                  <CardDescription>
                    Consulta prioridades, competências a consolidar e pontos
                    fortes.
                  </CardDescription>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:w-[540px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <Input
                      value={
                        recommendationQuery
                      }
                      onChange={(
                        event
                      ) =>
                        setRecommendationQuery(
                          event.target
                            .value
                        )
                      }
                      className="rounded-full pl-9"
                      placeholder="Pesquisar competência..."
                    />
                  </div>

                  <Select
                    value={
                      priorityFilter
                    }
                    onValueChange={
                      setPriorityFilter
                    }
                  >
                    <SelectTrigger className="rounded-full">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent className="bg-white">
                      <SelectItem value={ALL_VALUE}>
                        Todas
                      </SelectItem>

                      <SelectItem value="critical">
                        Prioridade crítica
                      </SelectItem>

                      <SelectItem value="high">
                        Prioridade elevada
                      </SelectItem>

                      <SelectItem value="moderate">
                        Prioridade moderada
                      </SelectItem>

                      <SelectItem value="consolidation">
                        Consolidação
                      </SelectItem>

                      <SelectItem value="strength">
                        Pontos fortes
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <Tabs
                defaultValue="all"
                className="space-y-4"
              >
                <TabsList className="h-auto flex-wrap justify-start rounded-2xl bg-slate-100 p-1">
                  <TabsTrigger
                    value="all"
                    className="rounded-xl"
                  >
                    Todas
                  </TabsTrigger>

                  <TabsTrigger
                    value="priorities"
                    className="rounded-xl"
                  >
                    Prioridades
                  </TabsTrigger>

                  <TabsTrigger
                    value="consolidation"
                    className="rounded-xl"
                  >
                    Consolidação
                  </TabsTrigger>

                  <TabsTrigger
                    value="strengths"
                    className="rounded-xl"
                  >
                    Pontos fortes
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="all"
                  className="mt-0"
                >
                  {filteredRecommendations.length ===
                  0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                      <Search className="mx-auto mb-3 h-10 w-10 text-slate-300" />

                      <p className="font-semibold text-slate-800">
                        Nenhuma recomendação encontrada
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 xl:grid-cols-2">
                      {filteredRecommendations.map(
                        (
                          recommendation
                        ) => (
                          <RecommendationCard
                            key={
                              recommendation.id
                            }
                            recommendation={
                              recommendation
                            }
                          />
                        )
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent
                  value="priorities"
                  className="mt-0"
                >
                  <div className="grid gap-4 xl:grid-cols-2">
                    {priorityRecommendations.map(
                      (
                        recommendation
                      ) => (
                        <RecommendationCard
                          key={
                            recommendation.id
                          }
                          recommendation={
                            recommendation
                          }
                        />
                      )
                    )}
                  </div>
                </TabsContent>

                <TabsContent
                  value="consolidation"
                  className="mt-0"
                >
                  <div className="grid gap-4 xl:grid-cols-2">
                    {consolidationRecommendations.map(
                      (
                        recommendation
                      ) => (
                        <RecommendationCard
                          key={
                            recommendation.id
                          }
                          recommendation={
                            recommendation
                          }
                        />
                      )
                    )}
                  </div>
                </TabsContent>

                <TabsContent
                  value="strengths"
                  className="mt-0"
                >
                  <div className="grid gap-4 xl:grid-cols-2">
                    {strengthRecommendations.map(
                      (
                        recommendation
                      ) => (
                        <RecommendationCard
                          key={
                            recommendation.id
                          }
                          recommendation={
                            recommendation
                          }
                        />
                      )
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/60 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />

                  Competências em evolução
                </CardTitle>
              </CardHeader>

              <CardContent>
                {improvingRecommendations.length ===
                0 ? (
                  <p className="text-sm text-slate-500">
                    Não existem ainda tendências positivas suficientes.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {improvingRecommendations
                      .slice(0, 5)
                      .map(
                        (
                          recommendation
                        ) => (
                          <div
                            key={
                              recommendation.id
                            }
                            className="flex items-center justify-between gap-3 rounded-2xl border border-white bg-white/80 p-3"
                          >
                            <div>
                              <p className="font-medium text-slate-900">
                                {
                                  recommendation
                                    .criterionName
                                }
                              </p>

                              <p className="text-xs text-slate-500">
                                {
                                  recommendation
                                    .subdomainLabel
                                }
                              </p>
                            </div>

                            <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">
                              {formatRecommendationTrend(
                                recommendation
                                  .trend
                              )}
                            </Badge>
                          </div>
                        )
                      )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-red-100 bg-gradient-to-br from-white via-red-50/50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />

                  Competências em redução
                </CardTitle>
              </CardHeader>

              <CardContent>
                {decliningRecommendations.length ===
                0 ? (
                  <p className="text-sm text-slate-500">
                    Não foram detetadas regressões significativas.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {decliningRecommendations
                      .slice(0, 5)
                      .map(
                        (
                          recommendation
                        ) => (
                          <div
                            key={
                              recommendation.id
                            }
                            className="flex items-center justify-between gap-3 rounded-2xl border border-white bg-white/80 p-3"
                          >
                            <div>
                              <p className="font-medium text-slate-900">
                                {
                                  recommendation
                                    .criterionName
                                }
                              </p>

                              <p className="text-xs text-slate-500">
                                {
                                  recommendation
                                    .subdomainLabel
                                }
                              </p>
                            </div>

                            <Badge className="border border-red-200 bg-red-50 text-red-700">
                              {formatRecommendationTrend(
                                recommendation
                                  .trend
                              )}
                            </Badge>
                          </div>
                        )
                      )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border border-slate-200 bg-slate-50">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">
                    Índice Inteligente de Desenvolvimento
                  </p>
          
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    O IDI combina o nível atual, a tendência e a consistência.
                    Os intervalos esperados configurados pelo Coordenador Técnico
                    ou pelo treinador são aplicados automaticamente quando
                    disponíveis.
                  </p>
                </div>
          
                <Badge
                  variant="outline"
                  className="shrink-0 rounded-full border-cyan-200 bg-cyan-50 text-cyan-700"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
          
                  Motor ativo
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs leading-5 text-slate-500">
              As recomendações são geradas automaticamente a partir das
              avaliações disponíveis. Devem ser interpretadas pelo treinador
              considerando a idade, posição, equipa, contexto competitivo e
              momento da época.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
