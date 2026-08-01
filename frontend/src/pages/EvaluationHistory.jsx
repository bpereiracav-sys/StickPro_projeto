import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useNavigate,
} from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { usePermissions } from '../context/PermissionsContext';
import { useAuth } from '../context/AuthContext';
import { evaluationsApi, teamsApi } from '../services/api';
import {
  buildPlayerTeamDevelopmentTree,
} from '../components/development/criteriaTree';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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

import DevelopmentComparisonTree from
'../components/development/DevelopmentComparisonTree';

const ALL_VALUE = 'all';
const SCORE_MAX = 5;

const CATEGORY_CONFIG = {
  technical: {
    label: 'Técnica',
    className: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  },
  tactical: {
    label: 'Tática',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  physical: {
    label: 'Física',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  psychological: {
    label: 'Psicológica',
    className: 'border-purple-200 bg-purple-50 text-purple-700',
  },
  attitude: {
    label: 'Atitude',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  other: {
    label: 'Outro',
    className: 'border-slate-200 bg-slate-50 text-slate-700',
  },
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
  evaluation?.evaluation_date ||
  evaluation?.created_at ||
  evaluation?.date ||
  evaluation?.updated_at ||
  null;

const formatDate = (value) => {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';

  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatShortDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
  });
};

const getEvaluationPlanName = (evaluation) =>
  evaluation?.plan_name ||
  evaluation?.plan?.name ||
  evaluation?.template_name ||
  evaluation?.title ||
  'Avaliação';

const getEvaluationAverage = (evaluation) => {
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
    const number = Number(directValue);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  const scores =
    evaluation?.scores ||
    evaluation?.criteria_scores ||
    evaluation?.results ||
    [];

  const values = Array.isArray(scores)
    ? scores
        .map((item) =>
          Number(
            item?.score ??
              item?.value
          )
        )
        .filter(Number.isFinite)
    : Object.values(scores || {})
        .map((item) =>
          Number(
            item?.score ??
              item?.value ??
              item
          )
        )
        .filter(Number.isFinite);

  if (values.length === 0) {
    return null;
  }

  return (
    values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length
  );
};

const getCriteriaEntries = (evaluation) => {
  const raw =
    evaluation?.scores ||
    evaluation?.criteria_scores ||
    evaluation?.results ||
    evaluation?.criteria ||
    [];

  if (Array.isArray(raw)) {
    return raw
      .map((item, index) => {
        const criterion =
          item?.criterion || {};

        const score = Number(
          item?.score ??
            item?.value
        );

        return {
          id:
            item?.criterion_id ||
            item?.id ||
            item?.code ||
            `${evaluation?.id || 'evaluation'}-${index}`,

          name:
            item?.criterion_name ||
            item?.name ||
            criterion?.name ||
            criterion?.observableAction ||
            `Critério ${index + 1}`,

          category:
            item?.category ||
            criterion?.category ||
            evaluation?.category ||
            'other',

          domain:
            item?.domain ||
            criterion?.domain ||
            null,

          domainLabel:
            item?.domainLabel ||
            item?.domain_label ||
            criterion?.domainLabel ||
            criterion?.domain_label ||
            null,

          subdomain:
            item?.subdomain ||
            criterion?.subdomain ||
            null,

          subdomainLabel:
            item?.subdomainLabel ||
            item?.subdomain_label ||
            criterion?.subdomainLabel ||
            criterion?.subdomain_label ||
            null,

          score,
        };
      })
      .filter((item) =>
        Number.isFinite(item.score)
      );
  }

  return Object.entries(raw || {})
    .map(([key, value]) => ({
      id: key,

      name:
        value?.criterion_name ||
        value?.name ||
        value?.criterion?.name ||
        key,

      category:
        value?.category ||
        value?.criterion?.category ||
        evaluation?.category ||
        'other',

      domain:
        value?.domain ||
        value?.criterion?.domain ||
        null,

      domainLabel:
        value?.domainLabel ||
        value?.domain_label ||
        value?.criterion?.domainLabel ||
        value?.criterion?.domain_label ||
        null,

      subdomain:
        value?.subdomain ||
        value?.criterion?.subdomain ||
        null,

      subdomainLabel:
        value?.subdomainLabel ||
        value?.subdomain_label ||
        value?.criterion?.subdomainLabel ||
        value?.criterion?.subdomain_label ||
        null,

      score: Number(
        value?.score ??
          value?.value ??
          value
      ),
    }))
    .filter((item) =>
      Number.isFinite(item.score)
    );
};
function MetricCard({ label, value, helper, icon: Icon, accent = 'cyan' }) {
  const styles = {
    cyan: 'border-cyan-100 from-white via-cyan-50/70 to-slate-50 text-cyan-700',
    emerald:
      'border-emerald-100 from-white via-emerald-50/70 to-slate-50 text-emerald-700',
    purple:
      'border-purple-100 from-white via-purple-50/70 to-slate-50 text-purple-700',
    amber:
      'border-amber-100 from-white via-amber-50/70 to-slate-50 text-amber-700',
  };

  return (
    <Card className={`bg-gradient-to-br ${styles[accent] || styles.cyan}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide">
              {label}
            </p>
            <p className="mt-2 truncate font-heading text-4xl text-slate-950">
              {value}
            </p>
            {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/80">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrendIndicator({ value }) {
  if (value === null || value === undefined) {
    return (
      <Badge variant="outline" className="border-slate-200 text-slate-500">
        Sem comparação
      </Badge>
    );
  }

  const positive = value >= 0;

  return (
    <Badge
      variant="outline"
      className={
        positive
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-red-200 bg-red-50 text-red-700'
      }
    >
      {positive ? (
        <TrendingUp className="mr-1 h-3.5 w-3.5" />
      ) : (
        <TrendingDown className="mr-1 h-3.5 w-3.5" />
      )}
      {positive ? '+' : ''}
      {value.toFixed(1)}
    </Badge>
  );
}


function CriterionTrendBadge({ difference }) {
  if (difference === null || difference === undefined) {
    return (
      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-500">
        Sem comparação
      </Badge>
    );
  }

  if (difference > 0.05) {
    return (
      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
        <TrendingUp className="mr-1 h-3.5 w-3.5" />
        +{difference.toFixed(1)} · Em evolução
      </Badge>
    );
  }

  if (difference < -0.05) {
    return (
      <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
        <TrendingDown className="mr-1 h-3.5 w-3.5" />
        {difference.toFixed(1)} · Atenção
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
      0.0 · Estável
    </Badge>
  );
}

function EvolutionLineChart({ points }) {
  if (points.length < 2) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <TrendingUp className="mb-3 h-12 w-12 text-slate-300" />
        <p className="font-semibold text-slate-800">Dados insuficientes</p>
        <p className="mt-1 text-sm text-slate-500">
          São necessárias pelo menos duas avaliações para mostrar a tendência.
        </p>
      </div>
    );
  }

  const width = 720;
  const height = 280;
  const padding = { top: 24, right: 24, bottom: 48, left: 42 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const x = (index) =>
    padding.left + (index / Math.max(points.length - 1, 1)) * innerWidth;
  const y = (value) =>
    padding.top + innerHeight - (Math.max(0, Math.min(SCORE_MAX, value)) / SCORE_MAX) * innerHeight;

  const polyline = points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ');
  const area = `${padding.left},${padding.top + innerHeight} ${polyline} ${x(
    points.length - 1
  )},${padding.top + innerHeight}`;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[640px] w-full"
        role="img"
        aria-label="Gráfico de evolução temporal"
      >
        <defs>
          <linearGradient id="evolutionArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(6 182 212)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(6 182 212)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[1, 2, 3, 4, 5].map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="rgb(226 232 240)"
              strokeDasharray="4 5"
            />
            <text
              x={padding.left - 14}
              y={y(tick) + 4}
              textAnchor="end"
              fontSize="12"
              fill="rgb(100 116 139)"
            >
              {tick}
            </text>
          </g>
        ))}

        <polygon points={area} fill="url(#evolutionArea)" />
        <polyline
          points={polyline}
          fill="none"
          stroke="rgb(6 182 212)"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <circle
              cx={x(index)}
              cy={y(point.value)}
              r="6"
              fill="white"
              stroke="rgb(6 182 212)"
              strokeWidth="4"
            />
            <text
              x={x(index)}
              y={y(point.value) - 14}
              textAnchor="middle"
              fontSize="12"
              fontWeight="700"
              fill="rgb(15 23 42)"
            >
              {point.value.toFixed(1)}
            </text>
            <text
              x={x(index)}
              y={height - 18}
              textAnchor="middle"
              fontSize="11"
              fill="rgb(100 116 139)"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function RadarChart({ data }) {
  const width = 420;
  const height = 360;
  const centerX = width / 2;
  const centerY = 174;
  const radius = 118;
  const values = data.length >= 3 ? data : [];

  if (values.length < 3) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <Target className="mb-3 h-12 w-12 text-slate-300" />
        <p className="font-semibold text-slate-800">Radar indisponível</p>
        <p className="mt-1 text-sm text-slate-500">
          São necessárias avaliações em pelo menos três domínios.
        </p>
      </div>
    );
  }

  const angleFor = (index) => -Math.PI / 2 + (index / values.length) * Math.PI * 2;
  const pointFor = (index, fraction) => {
    const angle = angleFor(index);
    return {
      x: centerX + Math.cos(angle) * radius * fraction,
      y: centerY + Math.sin(angle) * radius * fraction,
    };
  };

  const polygon = values
    .map((item, index) => {
      const point = pointFor(index, Math.max(0, Math.min(SCORE_MAX, item.value)) / SCORE_MAX);
      return `${point.x},${point.y}`;
    })
    .join(' ');

  return (
    <div className="flex justify-center overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[360px] max-w-[430px] w-full"
        role="img"
        aria-label="Radar de competências"
      >
        {[1, 2, 3, 4, 5].map((level) => {
          const points = values
            .map((_, index) => {
              const point = pointFor(index, level / SCORE_MAX);
              return `${point.x},${point.y}`;
            })
            .join(' ');

          return (
            <polygon
              key={level}
              points={points}
              fill={level === 5 ? 'rgb(248 250 252)' : 'none'}
              stroke="rgb(203 213 225)"
              strokeWidth="1"
            />
          );
        })}

        {values.map((_, index) => {
          const point = pointFor(index, 1);
          return (
            <line
              key={index}
              x1={centerX}
              y1={centerY}
              x2={point.x}
              y2={point.y}
              stroke="rgb(203 213 225)"
            />
          );
        })}

        <polygon
          points={polygon}
          fill="rgb(139 92 246)"
          fillOpacity="0.22"
          stroke="rgb(124 58 237)"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {values.map((item, index) => {
          const point = pointFor(index, Math.max(0, Math.min(SCORE_MAX, item.value)) / SCORE_MAX);
          const labelPoint = pointFor(index, 1.2);

          return (
            <g key={item.key}>
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill="white"
                stroke="rgb(124 58 237)"
                strokeWidth="3"
              />
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="12"
                fontWeight="700"
                fill="rgb(51 65 85)"
              >
                {item.label}
              </text>
              <text
                x={labelPoint.x}
                y={labelPoint.y + 16}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fill="rgb(124 58 237)"
              >
                {item.value.toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function InsightList({ title, description, items, tone }) {
  const positive = tone === 'positive';

  return (
    <Card
      className={
        positive
          ? 'border-emerald-100 bg-gradient-to-br from-white via-emerald-50/60 to-white'
          : 'border-amber-100 bg-gradient-to-br from-white via-amber-50/60 to-white'
      }
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {positive ? (
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          ) : (
            <Target className="h-5 w-5 text-amber-600" />
          )}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">Sem dados suficientes.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id || `${item.name}-${index}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/80 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{item.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.domainLabel ||
                      item.subdomainLabel ||
                      CATEGORY_CONFIG[item.category]?.label ||
                      item.category ||
                      'Outro'}
                  </p>
                </div>
                <span
                  className={
                    positive
                      ? 'font-heading text-xl text-emerald-700'
                      : 'font-heading text-xl text-amber-700'
                  }
                >
                  {Number(
                    item?.metrics?.average ??
                    item?.average ??
                    0
                  ).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function EvaluationHistory() {
  const { t } = useLanguage();
  const permissions = usePermissions();
  const {
    user,
    activeProfile,
    viewingAs,
    availableProfiles,
  } = useAuth();
  const navigate = useNavigate();

  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [teamEvaluationRecords, setTeamEvaluationRecords] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);
  const [loadingTeamComparison, setLoadingTeamComparison] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(ALL_VALUE);
  const [dateFilter, setDateFilter] = useState(ALL_VALUE);
  const [query, setQuery] = useState('');

  const tr = (key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };

  const effectivePlayerId =
    permissions?.effectivePlayerId ||
    permissions?.linkedPlayerId ||
    null;
  
  const isAthleteMode = Boolean(
    effectivePlayerId &&
      (
        permissions?.isPlayer === true ||
        permissions?.isViewingAsAssociated === true
      )
  );
  
  const canManageHistory =
    !isAthleteMode &&
    Boolean(
      permissions?.isAdmin === true ||
        permissions?.isStaff === true ||
        permissions?.canManageTeam === true ||
        permissions?.canCreateEvaluations === true ||
        permissions?.hasPermission?.('view_team_members') === true ||
        permissions?.hasPermission?.('create_evaluations') === true
    );
  
  const canViewHistory =
    canManageHistory || isAthleteMode;

  useEffect(() => {
    if (!isAthleteMode || !effectivePlayerId) {
      return;
    }

    setSelectedPlayerId(String(effectivePlayerId));
    setSelectedTeamId('');
    setPlayers([]);
    setTeamEvaluationRecords([]);
    setLoadingTeamComparison(false);
  }, [
    isAthleteMode,
    effectivePlayerId,
  ]);

  useEffect(() => {
    if (isAthleteMode) {
      setLoadingTeams(false);
      return;
    }

    fetchTeams();
  }, [isAthleteMode]);

  useEffect(() => {
    if (isAthleteMode) {
      return;
    }

    if (!selectedTeamId) {
      setPlayers([]);
      setSelectedPlayerId('');
      setEvaluations([]);
      setTeamEvaluationRecords([]);
      setLoadingTeamComparison(false);
      return;
    }

    fetchPlayers(selectedTeamId);
  }, [
    selectedTeamId,
    isAthleteMode,
  ]);

  useEffect(() => {
    if (!selectedPlayerId) {
      setEvaluations([]);
      return;
    }

    fetchPlayerEvaluations(selectedPlayerId);
  }, [selectedPlayerId]);

  useEffect(() => {
    if (
      isAthleteMode ||
      !selectedTeamId ||
      players.length === 0
    ) {
      setTeamEvaluationRecords([]);
      setLoadingTeamComparison(false);
      return;
    }

    fetchTeamComparison(players);
  }, [
    isAthleteMode,
    selectedTeamId,
    players,
  ]);

  const fetchTeams = async () => {
    setLoadingTeams(true);

    try {
      const response = await teamsApi.getAll();
      setTeams(normalizeCollection(response?.data));
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          tr('evaluations.teamsLoadError', 'Erro ao carregar equipas')
      );
    } finally {
      setLoadingTeams(false);
    }
  };

  const fetchPlayers = async (teamId) => {
    setLoadingPlayers(true);
    setSelectedPlayerId('');
    setPlayers([]);
    setEvaluations([]);
    setTeamEvaluationRecords([]);
    setLoadingTeamComparison(false);

    try {
      const response = await evaluationsApi.getTeamPlayers(teamId);
      setPlayers(normalizeCollection(response?.data));
    } catch (error) {
      console.error('Error loading players:', error);
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          tr('evaluations.playersLoadError', 'Erro ao carregar atletas')
      );
      setPlayers([]);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const fetchPlayerEvaluations = async (playerId) => {
    setLoadingEvaluations(true);

    try {
      const response = await evaluationsApi.getPlayerEvaluations(playerId);

      const list = normalizeCollection(response?.data).sort((a, b) => {
        const aDate = new Date(getEvaluationDate(a) || 0).getTime();
        const bDate = new Date(getEvaluationDate(b) || 0).getTime();
        return bDate - aDate;
      });

      setEvaluations(list);
    } catch (error) {
      console.error('Error loading player evaluations:', error);
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          tr(
            'evaluations.historyLoadError',
            'Erro ao carregar o histórico de avaliações'
          )
      );
      setEvaluations([]);
    } finally {
      setLoadingEvaluations(false);
    }
  };

  const fetchTeamComparison = async (teamPlayers) => {
    setLoadingTeamComparison(true);

    try {
      const responses = await Promise.allSettled(
        teamPlayers.map((player) =>
          evaluationsApi.getPlayerEvaluations(player.id)
        )
      );

      const records = responses.map((result, index) => ({
        playerId: teamPlayers[index]?.id,
        playerName: getPlayerName(teamPlayers[index]),
        evaluations:
          result.status === 'fulfilled'
            ? normalizeCollection(result.value?.data)
            : [],
      }));

      setTeamEvaluationRecords(records);
    } catch (error) {
      console.error('Error loading team comparison:', error);
      setTeamEvaluationRecords([]);
    } finally {
      setLoadingTeamComparison(false);
    }
  };

  const selectedTeam = useMemo(
    () =>
      teams.find(
        (team) =>
          String(team.id) ===
          String(selectedTeamId)
      ),
    [teams, selectedTeamId]
  );

  const flattenedAvailableProfiles = useMemo(() => {
  if (Array.isArray(availableProfiles)) {
    return availableProfiles;
  }

  if (
    availableProfiles &&
    typeof availableProfiles === 'object'
  ) {
    return [
      ...(Array.isArray(availableProfiles.self)
        ? availableProfiles.self
        : []),

      ...(Array.isArray(availableProfiles.associated)
        ? availableProfiles.associated
        : []),

      ...(Array.isArray(availableProfiles.profiles)
        ? availableProfiles.profiles
        : []),
    ];
  }

  return [];
}, [availableProfiles]);

const matchedAthleteProfile = useMemo(() => {
  if (!effectivePlayerId) {
    return null;
  }

  return (
    flattenedAvailableProfiles.find((profile) => {
      const candidateIds = [
        profile?.id,
        profile?.player_id,
        profile?.playerId,
        profile?.profile_id,
        profile?.profileId,
        profile?.athlete_id,
        profile?.athleteId,
        profile?.player?.id,
        profile?.profile?.id,
      ]
        .filter(
          (value) =>
            value !== undefined &&
            value !== null
        )
        .map(String);

      return candidateIds.includes(
        String(effectivePlayerId)
      );
    }) || null
  );
}, [
  flattenedAvailableProfiles,
  effectivePlayerId,
]);

const athleteProfile =
  matchedAthleteProfile ||
  viewingAs?.profile ||
  viewingAs?.player ||
  viewingAs?.athlete ||
  viewingAs ||
  activeProfile?.profile ||
  activeProfile?.player ||
  activeProfile?.athlete ||
  activeProfile ||
  null;

const evaluatedPlayerData = useMemo(() => {
  if (!isAthleteMode || evaluations.length === 0) {
    return null;
  }

  for (const evaluation of evaluations) {
    const candidate =
      evaluation?.player ||
      evaluation?.athlete ||
      evaluation?.player_profile ||
      evaluation?.athlete_profile ||
      null;

    const candidateName =
      evaluation?.player_name ||
      evaluation?.athlete_name ||
      evaluation?.player_full_name ||
      evaluation?.athlete_full_name ||
      candidate?.player_name ||
      candidate?.athlete_name ||
      candidate?.display_name ||
      candidate?.full_name ||
      candidate?.name ||
      null;

    if (candidateName) {
      return {
        id:
          evaluation?.player_id ||
          evaluation?.athlete_id ||
          candidate?.id ||
          effectivePlayerId,

        name: candidateName,

        team_ids:
          evaluation?.team_ids ||
          candidate?.team_ids ||
          [],
      };
    }
  }

  return null;
}, [
  isAthleteMode,
  evaluations,
  effectivePlayerId,
]);

const athleteDisplayName =
  evaluatedPlayerData?.name ||
  matchedAthleteProfile?.player_name ||
  matchedAthleteProfile?.athlete_name ||
  matchedAthleteProfile?.display_name ||
  matchedAthleteProfile?.full_name ||
  matchedAthleteProfile?.name ||
  matchedAthleteProfile?.player?.name ||
  matchedAthleteProfile?.player?.full_name ||
  athleteProfile?.player_name ||
  athleteProfile?.athlete_name ||
  athleteProfile?.display_name ||
  athleteProfile?.full_name ||
  athleteProfile?.name ||
  athleteProfile?.player?.name ||
  athleteProfile?.player?.full_name ||
  athleteProfile?.profile?.name ||
  athleteProfile?.profile?.full_name ||
  viewingAs?.player_name ||
  viewingAs?.athlete_name ||
  viewingAs?.display_name ||
  viewingAs?.full_name ||
  viewingAs?.name ||
  activeProfile?.player_name ||
  activeProfile?.athlete_name ||
  activeProfile?.display_name ||
  activeProfile?.full_name ||
  activeProfile?.name ||
  'Atleta';

const selectedPlayer =
  isAthleteMode
    ? {
        id:
          evaluatedPlayerData?.id ||
          effectivePlayerId,

        name: athleteDisplayName,
        full_name: athleteDisplayName,
        display_name: athleteDisplayName,

        team_ids:
          evaluatedPlayerData?.team_ids ||
          matchedAthleteProfile?.team_ids ||
          athleteProfile?.team_ids ||
          athleteProfile?.player?.team_ids ||
          viewingAs?.team_ids ||
          activeProfile?.team_ids ||
          [],
      }
    : players.find(
        (player) =>
          String(player.id) ===
          String(selectedPlayerId)
      );
  const athleteTeamNames = useMemo(() => {
    if (!isAthleteMode) {
      return [];
    }
  
    const teamNames = [
      ...(Array.isArray(athleteProfile?.teams)
        ? athleteProfile.teams
        : []),
      ...(Array.isArray(athleteProfile?.team_names)
        ? athleteProfile.team_names
        : []),
    ]
      .map((team) =>
        typeof team === 'string'
          ? team
          : team?.name ||
            team?.display_name ||
            null
      )
      .map((name) =>
        typeof name === 'string'
          ? name.trim()
          : null
      )
      .filter(Boolean);
  
    /*
     * Preferir a designação mais específica.
     * Exemplo:
     * "Escolares" é removido quando também existe "Escolares A".
     */
    return [
      ...new Set(
        teamNames.filter((name, index, names) => {
          const normalizedName =
            name.toLocaleLowerCase('pt-PT');
  
          return !names.some((otherName, otherIndex) => {
            if (index === otherIndex) {
              return false;
            }
  
            const normalizedOther =
              otherName.toLocaleLowerCase('pt-PT');
  
            return (
              normalizedOther !== normalizedName &&
              normalizedOther.startsWith(
                `${normalizedName} `
              )
            );
          });
        })
      ),
    ];
  }, [
    isAthleteMode,
    athleteProfile,
  ]);
  
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
          getCriteriaEntries(evaluation).some(
            (criterion) => criterion.category === categoryFilter
          );

        if (!hasCategory) return false;
      }

      if (normalizedQuery) {
        const haystack = [
          getEvaluationPlanName(evaluation),
          evaluation?.period_label,
          evaluation?.comments,
          evaluation?.general_comment,
          evaluation?.event_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(normalizedQuery)) return false;
      }

      return true;
    });
  }, [evaluations, categoryFilter, dateFilter, query]);

  const filteredTeamEvaluations = useMemo(() => {
    const now = new Date();
  
    const matchesCurrentFilters = (evaluation) => {
      const evaluationDate = getEvaluationDate(evaluation);
      const date = evaluationDate
        ? new Date(evaluationDate)
        : null;
  
      if (
        dateFilter !== ALL_VALUE &&
        date &&
        !Number.isNaN(date.getTime())
      ) {
        const limit = new Date(now);
  
        if (dateFilter === '30') {
          limit.setDate(now.getDate() - 30);
        }
  
        if (dateFilter === '90') {
          limit.setDate(now.getDate() - 90);
        }
  
        if (dateFilter === '365') {
          limit.setFullYear(now.getFullYear() - 1);
        }
  
        if (date < limit) {
          return false;
        }
      }
  
      if (categoryFilter !== ALL_VALUE) {
        const matchesEvaluationCategory =
          evaluation?.category === categoryFilter;
  
        const matchesCriterionCategory =
          getCriteriaEntries(evaluation).some(
            (criterion) =>
              criterion.category === categoryFilter
          );
  
        if (
          !matchesEvaluationCategory &&
          !matchesCriterionCategory
        ) {
          return false;
        }
      }
  
      return true;
    };
  
    return teamEvaluationRecords
      .filter((record) => {
        const recordPlayerId =
          record?.playerId ||
          record?.player_id ||
          record?.athleteId ||
          record?.athlete_id ||
          null;
  
        return (
          !selectedPlayerId ||
          String(recordPlayerId) !==
            String(selectedPlayerId)
        );
      })
      .flatMap((record) =>
        (
          Array.isArray(record?.evaluations)
            ? record.evaluations
            : []
        ).filter(matchesCurrentFilters)
      );
  }, [
    teamEvaluationRecords,
    selectedPlayerId,
    categoryFilter,
    dateFilter,
  ]);

  const developmentEngine = useMemo(
    () =>
      buildPlayerTeamDevelopmentTree({
        playerEvaluations:
          filteredEvaluations,
  
        teamEvaluations:
          isAthleteMode
            ? []
            : filteredTeamEvaluations,
  
        includeEmptyDomains: false,
        includeUnresolvedCriteria: true,
      }),
    [
      filteredEvaluations,
      filteredTeamEvaluations,
      isAthleteMode,
    ]
  );

  const developmentDomains =
    developmentEngine?.domains || [];
  
  const developmentMetrics =
    developmentEngine?.metrics || {};
  
  const developmentRadar =
    developmentEngine?.radar || [];
  
  const developmentStrengths =
    developmentEngine?.strengths || [];
  
  const developmentPriorities =
    developmentEngine?.priorities || [];
  
  const developmentLatestComparison =
    developmentEngine?.latestComparison || [];
  
  const developmentTeamComparison =
    developmentEngine?.teamComparison || [];

  const engineRadarData = developmentRadar.map((item) => ({
    key: item.id,
    label:
      item.domainLabel ||
      item.subject ||
      item.id,
  
    value:
      Number(item.value) || 0,
  
    comparison:
      item.comparison !== undefined
        ? Number(item.comparison) || 0
        : undefined,
  }));
  
  const criterionEvolution = useMemo(() => {
    const historyByCriterion = new Map();

    const chronological = [...filteredEvaluations].sort((a, b) => {
      const aDate = new Date(getEvaluationDate(a) || 0).getTime();
      const bDate = new Date(getEvaluationDate(b) || 0).getTime();
      return aDate - bDate;
    });

    chronological.forEach((evaluation) => {
      const evaluationDate = getEvaluationDate(evaluation);

      getCriteriaEntries(evaluation).forEach((criterion) => {
        if (!Number.isFinite(criterion.score)) return;

        const key = criterion.id || criterion.name;

        if (!historyByCriterion.has(key)) {
          historyByCriterion.set(key, {
            id: key,
            name: criterion.name,
            category: criterion.category || 'other',
            domainLabel: criterion.domainLabel || null,
            subdomainLabel: criterion.subdomainLabel || null,
            entries: [],
          });
        }

        historyByCriterion.get(key).entries.push({
          score: criterion.score,
          date: evaluationDate,
          evaluationId: evaluation?.id || null,
        });
      });
    });

    return Array.from(historyByCriterion.values())
      .map((criterion) => {
        const latest =
          criterion.entries.length > 0
            ? criterion.entries[criterion.entries.length - 1]
            : null;

        const previous =
          criterion.entries.length > 1
            ? criterion.entries[criterion.entries.length - 2]
            : null;

        return {
          ...criterion,
          latest,
          previous,
          difference:
            latest && previous
              ? latest.score - previous.score
              : null,
        };
      })
      .filter((criterion) => criterion.latest)
      .sort((a, b) => {
        const aDate = new Date(a.latest?.date || 0).getTime();
        const bDate = new Date(b.latest?.date || 0).getTime();

        if (aDate !== bDate) return bDate - aDate;
        return a.name.localeCompare(b.name, 'pt-PT');
      });
  }, [filteredEvaluations]);

  const dashboard = useMemo(() => {
    const chronological = [...filteredEvaluations].sort((a, b) => {
      const aDate = new Date(getEvaluationDate(a) || 0).getTime();
      const bDate = new Date(getEvaluationDate(b) || 0).getTime();
      return aDate - bDate;
    });

    const validChronological = chronological
      .map((evaluation) => ({
        evaluation,
        value: getEvaluationAverage(evaluation),
        date: getEvaluationDate(evaluation),
      }))
      .filter((item) => item.value !== null);

    const averages = validChronological.map((item) => item.value);
    const overallAverage =
      averages.length > 0
        ? averages.reduce((sum, value) => sum + value, 0) / averages.length
        : null;

    const latestAverage = averages.length > 0 ? averages[averages.length - 1] : null;
    const previousAverage = averages.length > 1 ? averages[averages.length - 2] : null;
    const evolution =
      latestAverage !== null && previousAverage !== null
        ? latestAverage - previousAverage
        : null;

    const firstAverage = averages.length > 0 ? averages[0] : null;
    const seasonEvolution =
      latestAverage !== null && firstAverage !== null
        ? latestAverage - firstAverage
        : null;

    const criteriaMap = new Map();
    const categoryMap = new Map();

    filteredEvaluations.forEach((evaluation) => {
      getCriteriaEntries(evaluation).forEach((criterion) => {
        if (!Number.isFinite(criterion.score)) return;

        const criterionKey = criterion.id || criterion.name;
        if (!criteriaMap.has(criterionKey)) {
          criteriaMap.set(criterionKey, {
            id: criterionKey,
            name: criterion.name,
            category: criterion.category || 'other',
            scores: [],
          });
        }
        criteriaMap.get(criterionKey).scores.push(criterion.score);

        const categoryKey = criterion.category || 'other';
        if (!categoryMap.has(categoryKey)) categoryMap.set(categoryKey, []);
        categoryMap.get(categoryKey).push(criterion.score);
      });
    });

    const criteria = Array.from(criteriaMap.values())
      .map((criterion) => ({
        ...criterion,
        average:
          criterion.scores.reduce((sum, value) => sum + value, 0) /
          criterion.scores.length,
      }))
      .sort((a, b) => b.average - a.average);

    const categoryAverages = Array.from(categoryMap.entries())
      .map(([key, scores]) => ({
        key,
        label: CATEGORY_CONFIG[key]?.label || key,
        value: scores.reduce((sum, value) => sum + value, 0) / scores.length,
      }))
      .sort((a, b) => b.value - a.value);

    const trendPoints = validChronological.slice(-8).map((item) => ({
      date: item.date,
      label: formatShortDate(item.date),
      value: item.value,
      title: getEvaluationPlanName(item.evaluation),
    }));

    return {
      total: filteredEvaluations.length,
      overallAverage,
      evolution,
      seasonEvolution,
      criteria,
      categoryAverages,
      trendPoints,
      strongest: criteria.slice(0, 3),
      priorities: [...criteria].sort((a, b) => a.average - b.average).slice(0, 3),
    };
  }, [filteredEvaluations]);

  const teamComparison = useMemo(() => {
    const now = new Date();

    const filterForBenchmark = (evaluation) => {
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
          getCriteriaEntries(evaluation).some(
            (criterion) => criterion.category === categoryFilter
          );
        if (!hasCategory) return false;
      }

      return true;
    };

    const benchmarkRecords = teamEvaluationRecords.filter(
      (record) =>
        String(record.playerId) !==
        String(selectedPlayerId)
    );

    const teamEvaluations = benchmarkRecords.flatMap((record) =>
      record.evaluations.filter(filterForBenchmark)
    );

    const teamEvaluationAverages = teamEvaluations
      .map(getEvaluationAverage)
      .filter((value) => value !== null && Number.isFinite(value));

    const teamAverage =
      teamEvaluationAverages.length > 0
        ? teamEvaluationAverages.reduce((sum, value) => sum + value, 0) /
          teamEvaluationAverages.length
        : null;

    const teamCriteriaMap = new Map();

    teamEvaluations.forEach((evaluation) => {
      getCriteriaEntries(evaluation).forEach((criterion) => {
        if (!Number.isFinite(criterion.score)) return;
        const key = criterion.id || criterion.name;
        if (!teamCriteriaMap.has(key)) {
          teamCriteriaMap.set(key, {
            id: key,
            name: criterion.name,
            category: criterion.category || 'other',
            scores: [],
          });
        }
        teamCriteriaMap.get(key).scores.push(criterion.score);
      });
    });

    const athleteCriteriaMap = new Map(
      dashboard.criteria.map((criterion) => [criterion.id, criterion])
    );

    const criteriaComparison = Array.from(teamCriteriaMap.values())
      .map((criterion) => {
        const teamCriterionAverage =
          criterion.scores.reduce((sum, value) => sum + value, 0) /
          criterion.scores.length;
        const athleteCriterion = athleteCriteriaMap.get(criterion.id);
        const athleteAverage = athleteCriterion?.average ?? null;

        return {
          id: criterion.id,
          name: criterion.name,
          category: criterion.category,
          athleteAverage,
          teamAverage: teamCriterionAverage,
          difference:
            athleteAverage !== null
              ? athleteAverage - teamCriterionAverage
              : null,
        };
      })
      .filter((item) => item.athleteAverage !== null)
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

    const evaluatedPlayers = benchmarkRecords.filter((record) =>
      record.evaluations.some(filterForBenchmark)
    ).length;

    return {
      teamAverage,
      difference:
        dashboard.overallAverage !== null && teamAverage !== null
          ? dashboard.overallAverage - teamAverage
          : null,
      evaluationsCount: teamEvaluations.length,
      evaluatedPlayers,
      criteriaComparison,
      aboveTeam: criteriaComparison.filter((item) => item.difference > 0.05),
      belowTeam: criteriaComparison.filter((item) => item.difference < -0.05),
    };
  }, [
    teamEvaluationRecords,
    dashboard.criteria,
    dashboard.overallAverage,
    dateFilter,
    categoryFilter,
    selectedPlayerId,
  ]);

  const effectiveTeamDifference =
    developmentMetrics?.difference !== null &&
    developmentMetrics?.difference !== undefined
      ? Number(developmentMetrics.difference)
      : teamComparison?.difference !== null &&
          teamComparison?.difference !== undefined
        ? Number(teamComparison.difference)
        : null;
  
  if (!canViewHistory) {
    return (
      <div className="space-y-4 pb-20 lg:pb-0">
        <Card className="border border-amber-100 bg-amber-50">
          <CardContent className="p-6">
            <p className="font-semibold text-amber-800">
              {tr(
                'evaluations.noHistoryPermission',
                'Sem permissão para consultar o histórico de avaliações.'
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="space-y-5 pb-20 pt-1 lg:pb-0"
      data-testid="evaluation-history-page"
    >
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
              {tr(
                'evaluations.longitudinalTracking',
                'Dashboard evolutivo do atleta'
              )}
            </Badge>

            <h1 className="font-heading text-3xl tracking-tight sm:text-5xl">
              {tr('evaluations.historyTitle', 'Histórico de Avaliações')}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              {isAthleteMode
                ? tr(
                    'evaluations.athleteHistorySubtitle',
                    'Consulta a tua evolução, radar de competências, pontos fortes e prioridades de desenvolvimento.'
                  )
                : tr(
                    'evaluations.historySubtitle',
                    'Analise tendências, radar de competências e compare o desempenho do atleta com a média da equipa.'
                  )}
            </p>
          </div>

          {canManageHistory && (
            <Button
              asChild
              className="h-11 rounded-full bg-cyan-500 px-5 text-white hover:bg-cyan-600"
            >
              <Link to="/evaluations/new">
                <ClipboardCheck className="mr-2 h-4 w-4" />
          
                {tr(
                  'evaluations.newEvaluation',
                  'Nova avaliação'
                )}
              </Link>
            </Button>
          )}
        </div>
      </section>

      {!isAthleteMode && (
      <Card className="border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-600" />
            {tr('evaluations.choosePlayer', 'Selecionar atleta')}
          </CardTitle>
          <CardDescription>
            {tr(
              'evaluations.choosePlayerHelp',
              'Escolha primeiro a equipa e depois o atleta cujo percurso pretende analisar.'
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 lg:grid-cols-2">
            <Select
              value={selectedTeamId}
              onValueChange={setSelectedTeamId}
              disabled={loadingTeams}
            >
              <SelectTrigger className="h-12 rounded-2xl">
                <SelectValue
                  placeholder={
                    loadingTeams
                      ? tr('common.loading', 'A carregar...')
                      : tr('common.selectTeam', 'Selecionar equipa')
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
              disabled={!selectedTeamId || loadingPlayers}
            >
              <SelectTrigger className="h-12 rounded-2xl">
                <SelectValue
                  placeholder={
                    loadingPlayers
                      ? tr('common.loading', 'A carregar...')
                      : tr('evaluations.selectPlayer', 'Selecionar atleta')
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
          </div>
        </CardContent>
      </Card>
      )}

      {!selectedPlayerId ? (
        <Card className="border border-dashed border-slate-200 bg-slate-50">
          <CardContent className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
            <UserRound className="mb-3 h-14 w-14 text-slate-300" />
            <p className="font-heading text-xl text-slate-950">
              {tr('evaluations.noPlayerSelected', 'Nenhum atleta selecionado')}
            </p>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              {tr(
                'evaluations.noPlayerSelectedHelp',
                'Selecione uma equipa e um atleta para consultar o respetivo dashboard evolutivo.'
              )}
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
                      {selectedTeam?.name ||
                        athleteTeamNames.join(', ') ||
                        tr('common.team', 'Equipa')}
                    </p>
                    <h2 className="font-heading text-2xl sm:text-3xl">
                      {getPlayerName(selectedPlayer)}
                    </h2>
                  </div>
                </div>

                <Badge className="w-fit border border-white/15 bg-white/10 text-white">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {dashboard.total}{' '}
                  {dashboard.total === 1 ? 'avaliação' : 'avaliações'}
                </Badge>
              </div>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label={tr('evaluations.totalEvaluations', 'Avaliações')}
              value={dashboard.total}
              helper={tr('evaluations.filteredPeriod', 'No período filtrado')}
              icon={ClipboardCheck}
              accent="cyan"
            />

            <MetricCard
              label={tr('evaluations.average', 'Média global')}
              value={
                dashboard.overallAverage !== null
                  ? dashboard.overallAverage.toFixed(1)
                  : '-'
              }
              helper={tr('evaluations.scaleOneToFive', 'Escala 1–5')}
              icon={BarChart3}
              accent="emerald"
            />

            <MetricCard
              label={tr('evaluations.evolution', 'Última evolução')}
              value={
                dashboard.evolution !== null
                  ? `${dashboard.evolution >= 0 ? '+' : ''}${dashboard.evolution.toFixed(1)}`
                  : '-'
              }
              helper={tr(
                'evaluations.lastTwoEvaluations',
                'Entre as duas últimas avaliações'
              )}
              icon={TrendingUp}
              accent="purple"
            />

            <MetricCard
              label={tr('evaluations.seasonEvolution', 'Evolução na época')}
              value={
                dashboard.seasonEvolution !== null
                  ? `${dashboard.seasonEvolution >= 0 ? '+' : ''}${dashboard.seasonEvolution.toFixed(1)}`
                  : '-'
              }
              helper={tr(
                'evaluations.firstToLatest',
                'Da primeira à última avaliação'
              )}
              icon={Target}
              accent="amber"
            />
          </div>

          {canManageHistory && (
          <Card className="overflow-hidden border border-violet-100 bg-white shadow-xl shadow-slate-200/60">
            <CardHeader className="border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-cyan-50">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-violet-600" />
                    {tr('evaluations.teamComparison', 'Comparação com a equipa')}
                  </CardTitle>
                  <CardDescription>
                    {tr(
                      'evaluations.teamComparisonHelp',
                      'Compare o desempenho médio do atleta com os restantes dados disponíveis da equipa no mesmo período.'
                    )}
                  </CardDescription>
                </div>

                {loadingTeamComparison ? (
                  <Badge variant="outline" className="w-fit rounded-full bg-white">
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    {tr('common.loading', 'A carregar...')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="w-fit rounded-full border-violet-200 bg-violet-50 text-violet-700">
                    {teamComparison.evaluatedPlayers} {tr('evaluations.evaluatedPlayers', 'atletas com avaliações')}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-5">
              {loadingTeamComparison ? (
                <div className="flex min-h-[180px] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                </div>
              ) :
                teamComparison.teamAverage === null ||
                dashboard.overallAverage === null ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <Users className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                  <p className="font-semibold text-slate-800">
                    {tr('evaluations.noTeamComparisonData', 'Ainda não existem dados suficientes para comparar com a equipa')}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {tr('evaluations.noTeamComparisonDataHelp', 'Crie avaliações para vários atletas da mesma equipa para ativar esta análise.')}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-3xl border border-cyan-100 bg-cyan-50/70 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">
                        {tr('evaluations.athleteAverage', 'Média do atleta')}
                      </p>
                      <p className="mt-2 font-heading text-4xl text-slate-950">
                        {developmentMetrics.average !== null &&
                        developmentMetrics.average !== undefined
                          ? Number(developmentMetrics.average).toFixed(1)
                          : dashboard.overallAverage?.toFixed(1) || '-'}
                      </p>
                    </div>

                    <div className="rounded-3xl border border-violet-100 bg-violet-50/70 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                        {tr('evaluations.teamAverage', 'Média da equipa')}
                      </p>
                      <p className="mt-2 font-heading text-4xl text-slate-950">
                        {developmentMetrics.comparisonAverage !== null &&
                        developmentMetrics.comparisonAverage !== undefined
                          ? Number(developmentMetrics.comparisonAverage).toFixed(1)
                          : teamComparison.teamAverage.toFixed(1)}
                      </p>
                    </div>

                    <div
                      className={`rounded-3xl border p-4 ${
                        effectiveTeamDifference === null ||
                        effectiveTeamDifference === undefined
                          ? 'border-slate-200 bg-slate-50/70'
                          : effectiveTeamDifference >= 0
                            ? 'border-emerald-100 bg-emerald-50/70'
                            : 'border-amber-100 bg-amber-50/70'
                      }`}
                    >
                      <p
                        className={`text-xs font-bold uppercase tracking-wide ${
                          effectiveTeamDifference === null ||
                          effectiveTeamDifference === undefined
                            ? 'text-slate-600'
                            : effectiveTeamDifference >= 0
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                        }`}
                      >
                        {tr(
                          'evaluations.differenceToTeam',
                          'Diferença para a equipa'
                        )}
                      </p>
                    
                      <p
                        className={`mt-2 font-heading text-4xl ${
                          effectiveTeamDifference === null ||
                          effectiveTeamDifference === undefined
                            ? 'text-slate-500'
                            : effectiveTeamDifference >= 0
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                        }`}
                      >
                        {effectiveTeamDifference === null ||
                        effectiveTeamDifference === undefined
                          ? '—'
                          : `${effectiveTeamDifference >= 0 ? '+' : ''}${effectiveTeamDifference.toFixed(
                              1
                            )}`}
                      </p>
                    </div>
                  </div>

                  <DevelopmentComparisonTree
                    domains={developmentDomains}
                  />
                  {tr(
                      'evaluations.teamBenchmarkNote',
                      'A referência da equipa é calculada com as avaliações disponíveis para os atletas selecionados no mesmo período e categoria.'
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

          <Card className="border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-cyan-600" />
                    {tr('common.filters', 'Filtros')}
                  </CardTitle>
                  <CardDescription>
                    {tr(
                      'evaluations.historyFiltersHelp',
                      'Filtre o dashboard por texto, categoria e período.'
                    )}
                  </CardDescription>
                </div>

                <div className="grid gap-2 sm:grid-cols-3 lg:w-[660px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className="rounded-full pl-9"
                      placeholder={tr('common.search', 'Pesquisar...')}
                    />
                  </div>

                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="rounded-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value={ALL_VALUE}>
                        {tr('evaluations.allCategories', 'Todas as categorias')}
                      </SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {CATEGORY_CONFIG[category]?.label || category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="rounded-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value={ALL_VALUE}>
                        {tr('evaluations.allPeriods', 'Todo o período')}
                      </SelectItem>
                      <SelectItem value="30">
                        {tr('evaluations.last30Days', 'Últimos 30 dias')}
                      </SelectItem>
                      <SelectItem value="90">
                        {tr('evaluations.last90Days', 'Últimos 90 dias')}
                      </SelectItem>
                      <SelectItem value="365">
                        {tr('evaluations.lastYear', 'Último ano')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <Card className="border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-cyan-600" />
                  Evolução temporal
                </CardTitle>
                <CardDescription>
                  Média das últimas avaliações, organizada cronologicamente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EvolutionLineChart points={dashboard.trendPoints} />
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Radar de competências
                </CardTitle>
                <CardDescription>
                  Perfil médio por domínio de desenvolvimento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadarChart
                  data={
                    engineRadarData.length >= 3
                      ? engineRadarData
                      : dashboard.categoryAverages
                  }
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <InsightList
              title="Pontos fortes"
              description="Critérios com melhor desempenho médio no período selecionado."
              items={
                developmentStrengths.length > 0
                  ? developmentStrengths.slice(0, 3)
                  : dashboard.strongest
              }
              tone="positive"
            />
            <InsightList
              title="Prioridades de melhoria"
              description="Critérios com menor resultado médio e maior potencial de desenvolvimento."
              items={
                developmentPriorities.length > 0
                  ? developmentPriorities.slice(0, 3)
                  : dashboard.priorities
              }
              tone="priority"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-cyan-600" />
                  Evolução por critério
                </CardTitle>
                <CardDescription>
                  Compara a nota mais recente de cada critério com a avaliação anterior em que esse mesmo critério foi avaliado.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {criterionEvolution.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <BarChart3 className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                    <p className="font-semibold text-slate-800">Sem dados</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {criterionEvolution.slice(0, 12).map((criterion) => {
                      const latestWidth = Math.max(
                        0,
                        Math.min(100, (criterion.latest.score / SCORE_MAX) * 100)
                      );

                      const previousWidth = criterion.previous
                        ? Math.max(
                            0,
                            Math.min(100, (criterion.previous.score / SCORE_MAX) * 100)
                          )
                        : 0;

                      const category =
                        CATEGORY_CONFIG[criterion.category] || CATEGORY_CONFIG.other;
                    
                      return (
                        <div
                          key={criterion.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900">
                                {criterion.name}
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge
                                  variant="outline"
                                  className={category.className}
                                >
                                  {category.label}
                                </Badge>

                                {criterion.subdomainLabel && (
                                  <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                                    {criterion.subdomainLabel}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <CriterionTrendBadge difference={criterion.difference} />
                          </div>

                          <div className="space-y-3">
                            <div className="grid grid-cols-[108px_1fr_42px] items-center gap-3 text-sm">
                              <span className="font-medium text-cyan-700">
                                {tr('evaluations.latestEvaluation', 'Última')}
                              </span>

                              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-cyan-500 transition-all"
                                  style={{ width: `${latestWidth}%` }}
                                />
                              </div>

                              <span className="text-right font-bold text-slate-900">
                                {criterion.latest.score.toFixed(1)}
                              </span>
                            </div>

                            <div className="grid grid-cols-[108px_1fr_42px] items-center gap-3 text-sm">
                              <span className="font-medium text-violet-700">
                                {tr('evaluations.previousEvaluation', 'Anterior')}
                              </span>

                              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-violet-500 transition-all"
                                  style={{ width: `${previousWidth}%` }}
                                />
                              </div>

                              <span className="text-right font-bold text-slate-900">
                                {criterion.previous
                                  ? criterion.previous.score.toFixed(1)
                                  : '—'}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                            <span>
                              {formatDate(criterion.latest.date)}
                            </span>

                            {criterion.previous && (
                              <span>
                                Comparação com {formatDate(criterion.previous.date)}
                              </span>
                            )}
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
                  Linha temporal
                </CardTitle>
                <CardDescription>Percurso recente do atleta.</CardDescription>
              </CardHeader>

              <CardContent>
                {filteredEvaluations.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <ClipboardCheck className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                    <p className="font-semibold text-slate-800">
                      Ainda não existem avaliações
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredEvaluations.slice(0, 8).map((evaluation, index) => {
                      const average = getEvaluationAverage(evaluation);
                      const previousAverage =
                        index < filteredEvaluations.length - 1
                          ? getEvaluationAverage(filteredEvaluations[index + 1])
                          : null;
                      const trend =
                        average !== null && previousAverage !== null
                          ? average - previousAverage
                          : null;

                      return (
                        <div
                          key={
                            evaluation.id ||
                            `${getEvaluationDate(evaluation)}-${index}`
                          }
                          className="rounded-3xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                {formatDate(getEvaluationDate(evaluation))}
                              </p>
                              <h3 className="mt-1 truncate font-heading text-lg text-slate-950">
                                {getEvaluationPlanName(evaluation)}
                              </h3>
                              {evaluation?.period_label && (
                                <p className="mt-1 text-sm text-slate-500">
                                  {evaluation.period_label}
                                </p>
                              )}
                            </div>

                            <div className="text-right">
                              <p className="font-heading text-2xl text-slate-950">
                                {average !== null ? average.toFixed(1) : '-'}
                              </p>
                              <TrendIndicator value={trend} />
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                            <span className="text-xs text-slate-400">
                              {getCriteriaEntries(evaluation).length} critérios
                            </span>

                            {evaluation?.id && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="rounded-full"
                                onClick={() => navigate(`/evaluations/${evaluation.id}`)}
                              >
                                Ver detalhes
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
