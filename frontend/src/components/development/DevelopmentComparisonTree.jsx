import { useMemo, useState } from 'react';

import {
  ChevronsDown,
  ChevronsUp,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  CircleDot,
  ClipboardList,
  FolderTree,
  Layers,
  MessageSquareText,
  Target,
  TrendingDown,
  TrendingUp,
  UserRound,
  X,
} from 'lucide-react';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

const SCORE_MAX = 5;
const DIFFERENCE_TOLERANCE = 0.05;
const STRONG_DIFFERENCE = 0.75;

const DOMAIN_COLORS = {
  PAT: {
    badge: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    icon: 'text-cyan-600',
  },
  TEC: {
    badge: 'border-blue-200 bg-blue-50 text-blue-700',
    icon: 'text-blue-600',
  },
  TAC: {
    badge: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    icon: 'text-indigo-600',
  },
  FIS: {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: 'text-emerald-600',
  },
  PSI: {
    badge: 'border-purple-200 bg-purple-50 text-purple-700',
    icon: 'text-purple-600',
  },
  ATT: {
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: 'text-amber-600',
  },
  other: {
    badge: 'border-slate-200 bg-slate-50 text-slate-700',
    icon: 'text-slate-600',
  },
};

const HEAT_STATUS = {
  excellent: {
    key: 'excellent',
    label: 'Muito acima da equipa',
    shortLabel: 'Excelente',
    icon: TrendingUp,
    badge:
      'border-emerald-300 bg-emerald-100 text-emerald-800',
    border: 'border-emerald-200',
    side: 'border-l-4 border-l-emerald-500',
    header:
      'bg-gradient-to-r from-emerald-50/90 via-white to-emerald-50/40',
    body: 'bg-emerald-50/25',
    dot: 'bg-emerald-500',
  },
  above: {
    key: 'above',
    label: 'Acima da equipa',
    shortLabel: 'Bom',
    icon: TrendingUp,
    badge:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
    border: 'border-emerald-100',
    side: 'border-l-4 border-l-emerald-400',
    header:
      'bg-gradient-to-r from-emerald-50/60 via-white to-white',
    body: 'bg-emerald-50/15',
    dot: 'bg-emerald-400',
  },
  balanced: {
    key: 'balanced',
    label: 'Sem diferença relevante',
    shortLabel: 'Equilibrado',
    icon: CircleDot,
    badge:
      'border-slate-200 bg-white text-slate-600',
    border: 'border-slate-200',
    side: 'border-l-4 border-l-slate-300',
    header:
      'bg-gradient-to-r from-slate-50 via-white to-white',
    body: 'bg-slate-50/50',
    dot: 'bg-slate-400',
  },
  attention: {
    key: 'attention',
    label: 'Necessita atenção',
    shortLabel: 'Atenção',
    icon: TrendingDown,
    badge:
      'border-amber-200 bg-amber-50 text-amber-700',
    border: 'border-amber-200',
    side: 'border-l-4 border-l-amber-400',
    header:
      'bg-gradient-to-r from-amber-50/70 via-white to-white',
    body: 'bg-amber-50/20',
    dot: 'bg-amber-400',
  },
  priority: {
    key: 'priority',
    label: 'Prioridade de desenvolvimento',
    shortLabel: 'Prioritário',
    icon: TrendingDown,
    badge:
      'border-red-200 bg-red-50 text-red-700',
    border: 'border-red-200',
    side: 'border-l-4 border-l-red-500',
    header:
      'bg-gradient-to-r from-red-50/80 via-white to-white',
    body: 'bg-red-50/20',
    dot: 'bg-red-500',
  },
  no_reference: {
    key: 'no_reference',
    label: 'Sem referência',
    shortLabel: 'Sem referência',
    icon: CircleDot,
    badge:
      'border-slate-200 bg-slate-50 text-slate-500',
    border: 'border-slate-200',
    side: 'border-l-4 border-l-slate-300',
    header:
      'bg-gradient-to-r from-slate-50 via-white to-white',
    body: 'bg-white',
    dot: 'bg-slate-300',
  },
};

function normalizeDomainCode(value) {
  if (!value) {
    return 'other';
  }

  const normalized = String(value).trim().toUpperCase();

  if (DOMAIN_COLORS[normalized]) {
    return normalized;
  }

  const aliases = {
    PATINAGEM: 'PAT',
    SKATING: 'PAT',
    TECHNICAL: 'TEC',
    TECNICA: 'TEC',
    TÉCNICA: 'TEC',
    TECNICA_INDIVIDUAL: 'TEC',
    TACTICAL: 'TAC',
    TATICA: 'TAC',
    TÁTICA: 'TAC',
    DECISAO: 'TAC',
    DECISÃO: 'TAC',
    JOGO_COLETIVO: 'TAC',
    PHYSICAL: 'FIS',
    FISICA: 'FIS',
    FÍSICA: 'FIS',
    PSYCHOLOGICAL: 'PSI',
    PSICOLOGICA: 'PSI',
    PSICOLÓGICA: 'PSI',
    ATTITUDE: 'ATT',
    ATITUDE: 'ATT',
  };

  return aliases[normalized] || 'other';
}

function getDomainStyle(domain) {
  const code = normalizeDomainCode(
    domain?.code ||
      domain?.id ||
      domain?.label
  );

  return (
    DOMAIN_COLORS[code] ||
    DOMAIN_COLORS.other
  );
}

function normalizeIdentifier(value, fallback) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return fallback;
  }

  return String(value);
}

function scoreWidth(score) {
  if (
    score === null ||
    score === undefined ||
    !Number.isFinite(Number(score))
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      (Number(score) / SCORE_MAX) * 100
    )
  );
}

function formatScore(value) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return '—';
  }

  return Number(value).toFixed(1);
}

function formatDifference(value) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return '—';
  }

  const number = Number(value);

  return `${number >= 0 ? '+' : ''}${number.toFixed(
    1
  )}`;
}

function getHeatStatus(difference) {
  if (
    difference === null ||
    difference === undefined ||
    !Number.isFinite(Number(difference))
  ) {
    return HEAT_STATUS.no_reference;
  }

  const value = Number(difference);

  if (value >= STRONG_DIFFERENCE) {
    return HEAT_STATUS.excellent;
  }

  if (value > DIFFERENCE_TOLERANCE) {
    return HEAT_STATUS.above;
  }

  if (value <= -STRONG_DIFFERENCE) {
    return HEAT_STATUS.priority;
  }

  if (value < -DIFFERENCE_TOLERANCE) {
    return HEAT_STATUS.attention;
  }

  return HEAT_STATUS.balanced;
}

function DifferenceBadge({
  difference,
  showLabel = false,
}) {
  const status = getHeatStatus(
    difference
  );

  const Icon = status.icon;

  return (
    <Badge
      variant="outline"
      className={status.badge}
    >
      <Icon className="mr-1 h-3.5 w-3.5" />

      {showLabel
        ? `${status.shortLabel} · `
        : ''}

      {formatDifference(
        difference
      )}
    </Badge>
  );
}

function AverageBadge({
  label,
  value,
  tone,
}) {
  const className =
    tone === 'team'
      ? 'border-violet-200 bg-violet-50 text-violet-700'
      : 'border-cyan-200 bg-cyan-50 text-cyan-700';

  return (
    <Badge
      variant="outline"
      className={className}
    >
      {label}&nbsp;
      {formatScore(value)}
    </Badge>
  );
}

function HeatSummary({
  excellent = 0,
  above = 0,
  balanced = 0,
  attention = 0,
  priority = 0,
}) {
  const items = [
    {
      key: 'excellent',
      count: excellent,
      label: 'muito acima',
      dot: HEAT_STATUS.excellent.dot,
    },
    {
      key: 'above',
      count: above,
      label: 'acima',
      dot: HEAT_STATUS.above.dot,
    },
    {
      key: 'balanced',
      count: balanced,
      label: 'equilibrados',
      dot: HEAT_STATUS.balanced.dot,
    },
    {
      key: 'attention',
      count: attention,
      label: 'atenção',
      dot: HEAT_STATUS.attention.dot,
    },
    {
      key: 'priority',
      count: priority,
      label: 'prioritários',
      dot: HEAT_STATUS.priority.dot,
    },
  ];

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {items.map((item) => (
        <span
          key={item.key}
          className="inline-flex items-center gap-1.5 text-xs text-slate-600"
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${item.dot}`}
          />

          {item.count} {item.label}
        </span>
      ))}
    </div>
  );
}


function getObservationTimestamp(observation = {}) {
  const directTimestamp = Number(observation?.timestamp);

  if (Number.isFinite(directTimestamp) && directTimestamp > 0) {
    return directTimestamp;
  }

  const rawDate =
    observation?.date ||
    observation?.evaluationDate ||
    observation?.created_at ||
    observation?.createdAt ||
    null;

  if (!rawDate) {
    return 0;
  }

  const parsed = new Date(rawDate).getTime();

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}


function firstNonEmpty(...values) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ''
    ) {
      return value;
    }
  }

  return null;
}

function getObservationEvaluatorName(observation = {}) {
  return firstNonEmpty(
    observation?.evaluatorName,
    observation?.evaluator_name,
    observation?.coachName,
    observation?.coach_name,
    observation?.trainerName,
    observation?.trainer_name,
    observation?.createdByName,
    observation?.created_by_name,
    observation?.evaluator?.display_name,
    observation?.evaluator?.full_name,
    observation?.evaluator?.name,
    observation?.coach?.display_name,
    observation?.coach?.full_name,
    observation?.coach?.name,
    observation?.trainer?.display_name,
    observation?.trainer?.full_name,
    observation?.trainer?.name,
    observation?.created_by?.display_name,
    observation?.created_by?.full_name,
    observation?.created_by?.name
  );
}

function getObservationComment(observation = {}) {
  return firstNonEmpty(
    observation?.comment,
    observation?.comments,
    observation?.note,
    observation?.notes,
    observation?.observation,
    observation?.observations,
    observation?.feedback,
    observation?.evaluatorComment,
    observation?.evaluator_comment,
    observation?.coachComment,
    observation?.coach_comment
  );
}

function getObservationEvaluationTitle(observation = {}) {
  return firstNonEmpty(
    observation?.evaluationTitle,
    observation?.evaluation_title,
    observation?.evaluationName,
    observation?.evaluation_name,
    observation?.planName,
    observation?.plan_name,
    observation?.title,
    observation?.evaluation?.title,
    observation?.evaluation?.name,
    observation?.evaluation?.plan_name
  );
}

function uniqueNonEmpty(values = []) {
  return [
    ...new Set(
      values
        .filter(
          (value) =>
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ''
        )
        .map((value) =>
          String(value).trim()
        )
    ),
  ];
}

function createObservationMetadata(observation = {}) {
  return {
    evaluationId:
      observation?.evaluationId ||
      observation?.evaluation_id ||
      observation?.evaluation?.id ||
      null,

    evaluationTitle:
      getObservationEvaluationTitle(
        observation
      ),

    evaluatorName:
      getObservationEvaluatorName(
        observation
      ),

    comment:
      getObservationComment(
        observation
      ),
  };
}

function buildObservationTrend(observations = [], limit = 8) {
  const groups = new Map();

  (Array.isArray(observations) ? observations : []).forEach(
    (observation, index) => {
      const score = Number(observation?.score);

      if (!Number.isFinite(score)) {
        return;
      }

      const timestamp =
        getObservationTimestamp(observation);

      const metadata =
        createObservationMetadata(
          observation
        );

      const identity =
        metadata.evaluationId ||
        (timestamp > 0
          ? `timestamp-${timestamp}`
          : `observation-${index}`);

      if (!groups.has(identity)) {
        groups.set(identity, {
          timestamp,
          date:
            observation?.date ||
            observation?.evaluationDate ||
            observation?.created_at ||
            observation?.createdAt ||
            null,
          evaluationId:
            metadata.evaluationId,
          evaluationTitles: [],
          evaluatorNames: [],
          comments: [],
          values: [],
          observationCount: 0,
        });
      }

      const group =
        groups.get(identity);

      group.values.push(score);
      group.observationCount += 1;

      if (metadata.evaluationTitle) {
        group.evaluationTitles.push(
          metadata.evaluationTitle
        );
      }

      if (metadata.evaluatorName) {
        group.evaluatorNames.push(
          metadata.evaluatorName
        );
      }

      if (metadata.comment) {
        group.comments.push(
          metadata.comment
        );
      }
    }
  );

  return Array.from(groups.values())
    .map((group) => {
      const evaluationTitles =
        uniqueNonEmpty(
          group.evaluationTitles
        );

      const evaluatorNames =
        uniqueNonEmpty(
          group.evaluatorNames
        );

      const comments =
        uniqueNonEmpty(
          group.comments
        );

      return {
        timestamp: group.timestamp,
        date: group.date,
        evaluationId:
          group.evaluationId,
        evaluationTitle:
          evaluationTitles[0] ||
          null,
        evaluatorName:
          evaluatorNames[0] ||
          null,
        evaluatorNames,
        comment:
          comments[0] ||
          null,
        comments,
        observationCount:
          group.observationCount,
        value:
          group.values.reduce(
            (sum, value) =>
              sum + value,
            0
          ) / group.values.length,
      };
    })
    .sort((first, second) => {
      if (first.timestamp !== second.timestamp) {
        return first.timestamp - second.timestamp;
      }

      return 0;
    })
    .slice(-limit);
}

function buildCriteriaTrend(criteria = [], limit = 8) {
  const criteriaList =
    Array.isArray(criteria)
      ? criteria
      : [];

  const groups = new Map();

  criteriaList.forEach(
    (criterion, criterionIndex) => {
      const criterionName =
        criterion?.name ||
        criterion?.observableAction ||
        `Critério ${criterionIndex + 1}`;

      const observations =
        Array.isArray(
          criterion?.scores
        )
          ? criterion.scores
          : [];

      observations.forEach(
        (observation, observationIndex) => {
          const score =
            Number(
              observation?.score
            );

          if (
            !Number.isFinite(score)
          ) {
            return;
          }

          const timestamp =
            getObservationTimestamp(
              observation
            );

          const metadata =
            createObservationMetadata(
              observation
            );

          const identity =
            metadata.evaluationId ||
            (timestamp > 0
              ? `timestamp-${timestamp}`
              : `criterion-${criterionIndex}-observation-${observationIndex}`);

          if (!groups.has(identity)) {
            groups.set(identity, {
              timestamp,
              date:
                observation?.date ||
                observation?.evaluationDate ||
                observation?.created_at ||
                observation?.createdAt ||
                null,
              evaluationId:
                metadata.evaluationId,
              evaluationTitles: [],
              evaluatorNames: [],
              comments: [],
              criteriaNames: [],
              values: [],
              observationCount: 0,
            });
          }

          const group =
            groups.get(identity);

          group.values.push(score);
          group.criteriaNames.push(
            criterionName
          );
          group.observationCount += 1;

          if (
            metadata.evaluationTitle
          ) {
            group.evaluationTitles.push(
              metadata.evaluationTitle
            );
          }

          if (
            metadata.evaluatorName
          ) {
            group.evaluatorNames.push(
              metadata.evaluatorName
            );
          }

          if (metadata.comment) {
            group.comments.push(
              metadata.comment
            );
          }
        }
      );
    }
  );

  return Array.from(groups.values())
    .map((group) => {
      const evaluationTitles =
        uniqueNonEmpty(
          group.evaluationTitles
        );

      const evaluatorNames =
        uniqueNonEmpty(
          group.evaluatorNames
        );

      const comments =
        uniqueNonEmpty(
          group.comments
        );

      const criteriaNames =
        uniqueNonEmpty(
          group.criteriaNames
        );

      return {
        timestamp: group.timestamp,
        date: group.date,
        evaluationId:
          group.evaluationId,
        evaluationTitle:
          evaluationTitles[0] ||
          null,
        evaluatorName:
          evaluatorNames[0] ||
          null,
        evaluatorNames,
        comment:
          comments[0] ||
          null,
        comments,
        criteriaNames,
        criteriaCount:
          criteriaNames.length,
        observationCount:
          group.observationCount,
        value:
          group.values.reduce(
            (sum, value) =>
              sum + value,
            0
          ) / group.values.length,
      };
    })
    .sort((first, second) => {
      if (first.timestamp !== second.timestamp) {
        return first.timestamp - second.timestamp;
      }

      return 0;
    })
    .slice(-limit);
}

function getTrendDelta(points = []) {
  if (!Array.isArray(points) || points.length < 2) {
    return null;
  }

  const first = Number(points[0]?.value);
  const latest = Number(
    points[points.length - 1]?.value
  );

  if (
    !Number.isFinite(first) ||
    !Number.isFinite(latest)
  ) {
    return null;
  }

  return latest - first;
}

function getTrendStatus(delta) {
  if (
    delta === null ||
    delta === undefined ||
    !Number.isFinite(Number(delta))
  ) {
    return {
      label: 'Sem tendência',
      className:
        'border-slate-200 bg-slate-50 text-slate-500',
      stroke: 'rgb(148 163 184)',
      fill: 'rgb(241 245 249)',
      icon: CircleDot,
    };
  }

  const value = Number(delta);

  if (value > DIFFERENCE_TOLERANCE) {
    return {
      label: 'Em evolução',
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-700',
      stroke: 'rgb(16 185 129)',
      fill: 'rgb(209 250 229)',
      icon: TrendingUp,
    };
  }

  if (value < -DIFFERENCE_TOLERANCE) {
    return {
      label: 'Em regressão',
      className:
        'border-red-200 bg-red-50 text-red-700',
      stroke: 'rgb(239 68 68)',
      fill: 'rgb(254 226 226)',
      icon: TrendingDown,
    };
  }

  return {
    label: 'Estável',
    className:
      'border-amber-200 bg-amber-50 text-amber-700',
    stroke: 'rgb(245 158 11)',
    fill: 'rgb(254 243 199)',
    icon: CircleDot,
  };
}

function TrendBadge({ points = [], compact = false }) {
  const delta = getTrendDelta(points);
  const status = getTrendStatus(delta);
  const Icon = status.icon;

  if (points.length < 2) {
    return (
      <Badge
        variant="outline"
        className="border-slate-200 bg-slate-50 text-slate-500"
      >
        <CircleDot className="mr-1 h-3.5 w-3.5" />
        Sem histórico
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={status.className}
    >
      <Icon className="mr-1 h-3.5 w-3.5" />

      {!compact && `${status.label} · `}

      {formatDifference(delta)}
    </Badge>
  );
}


function formatTrendDate(value) {
  if (!value) {
    return 'Sem data';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sem data';
  }

  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function LargeTrendChart({
  points = [],
  title = 'Evolução temporal',
}) {
  const safePoints =
    (Array.isArray(points) ? points : [])
      .map((point) => ({
        ...point,
        value: Number(point?.value),
      }))
      .filter((point) =>
        Number.isFinite(point.value)
      );

  if (safePoints.length < 2) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <CircleDot className="mb-3 h-10 w-10 text-slate-300" />
        <p className="font-semibold text-slate-700">
          Histórico insuficiente
        </p>
        <p className="mt-1 text-sm text-slate-500">
          São necessárias pelo menos duas avaliações para apresentar a tendência.
        </p>
      </div>
    );
  }

  const width = 760;
  const height = 300;
  const padding = {
    top: 28,
    right: 28,
    bottom: 58,
    left: 44,
  };

  const innerWidth =
    width - padding.left - padding.right;

  const innerHeight =
    height - padding.top - padding.bottom;

  const xFor = (index) =>
    padding.left +
    (index /
      Math.max(
        safePoints.length - 1,
        1
      )) *
      innerWidth;

  const yFor = (value) =>
    padding.top +
    innerHeight -
    (Math.max(
      0,
      Math.min(SCORE_MAX, value)
    ) /
      SCORE_MAX) *
      innerHeight;

  const linePoints =
    safePoints
      .map(
        (point, index) =>
          `${xFor(index)},${yFor(point.value)}`
      )
      .join(' ');

  const areaPoints = [
    `${xFor(0)},${padding.top + innerHeight}`,
    linePoints,
    `${xFor(
      safePoints.length - 1
    )},${padding.top + innerHeight}`,
  ].join(' ');

  const status =
    getTrendStatus(
      getTrendDelta(safePoints)
    );

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[660px] w-full"
        role="img"
        aria-label={title}
      >
        <title>{title}</title>

        {[1, 2, 3, 4, 5].map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={yFor(tick)}
              y2={yFor(tick)}
              stroke="rgb(226 232 240)"
              strokeDasharray="4 5"
            />

            <text
              x={padding.left - 12}
              y={yFor(tick) + 4}
              textAnchor="end"
              fontSize="12"
              fill="rgb(100 116 139)"
            >
              {tick}
            </text>
          </g>
        ))}

        <polygon
          points={areaPoints}
          fill={status.fill}
          opacity="0.9"
        />

        <polyline
          points={linePoints}
          fill="none"
          stroke={status.stroke}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {safePoints.map((point, index) => (
          <g
            key={`${point.timestamp || point.date || index}-${index}`}
          >
            <circle
              cx={xFor(index)}
              cy={yFor(point.value)}
              r="5"
              fill="white"
              stroke={status.stroke}
              strokeWidth="3"
            />

            <text
              x={xFor(index)}
              y={yFor(point.value) - 14}
              textAnchor="middle"
              fontSize="12"
              fontWeight="700"
              fill="rgb(15 23 42)"
            >
              {formatScore(point.value)}
            </text>

            <text
              x={xFor(index)}
              y={height - 22}
              textAnchor="middle"
              fontSize="11"
              fill="rgb(100 116 139)"
            >
              {point?.date
                ? formatTrendDate(point.date).replace(
                    ` ${new Date(point.date).getFullYear()}`,
                    ''
                  )
                : `#${index + 1}`}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}


function TimelineEntry({
  point,
  index,
  previousPoint,
}) {
  const pointDifference =
    previousPoint &&
    Number.isFinite(
      Number(previousPoint?.value)
    )
      ? Number(point?.value) -
        Number(previousPoint.value)
      : null;

  const pointTrend =
    getTrendStatus(
      pointDifference
    );

  const PointTrendIcon =
    pointTrend.icon;

  const evaluatorNames =
    uniqueNonEmpty([
      ...(Array.isArray(
        point?.evaluatorNames
      )
        ? point.evaluatorNames
        : []),
      point?.evaluatorName,
    ]);

  const comments =
    uniqueNonEmpty([
      ...(Array.isArray(
        point?.comments
      )
        ? point.comments
        : []),
      point?.comment,
    ]);

  const criteriaNames =
    uniqueNonEmpty(
      Array.isArray(
        point?.criteriaNames
      )
        ? point.criteriaNames
        : []
    );

  return (
    <div className="relative pl-9">
      <span className="absolute left-[9px] top-0 h-full w-px bg-slate-200" />

      <span className="absolute left-0 top-5 flex h-5 w-5 items-center justify-center rounded-full border-4 border-white bg-cyan-500 shadow-sm" />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-semibold text-slate-900">
              {point?.evaluationTitle ||
                `Avaliação ${index + 1}`}
            </p>

            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <CalendarDays className="h-4 w-4" />
              {formatTrendDate(
                point?.date
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {pointDifference !== null && (
              <Badge
                variant="outline"
                className={
                  pointTrend.className
                }
              >
                <PointTrendIcon className="mr-1 h-3.5 w-3.5" />
                {formatDifference(
                  pointDifference
                )}
              </Badge>
            )}

            <span className="font-heading text-3xl text-slate-950">
              {formatScore(
                point?.value
              )}
            </span>
          </div>
        </div>

        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-cyan-500"
            style={{
              width: `${scoreWidth(
                point?.value
              )}%`,
            }}
          />
        </div>

        {(evaluatorNames.length > 0 ||
          comments.length > 0 ||
          criteriaNames.length > 0 ||
          point?.evaluationId) && (
          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4">
            {evaluatorNames.length > 0 && (
              <div className="flex items-start gap-3">
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Avaliador
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {evaluatorNames.join(
                      ', '
                    )}
                  </p>
                </div>
              </div>
            )}

            {comments.length > 0 && (
              <div className="flex items-start gap-3">
                <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Observações
                  </p>

                  <div className="mt-1 space-y-1">
                    {comments.map(
                      (comment) => (
                        <p
                          key={comment}
                          className="text-sm leading-6 text-slate-700"
                        >
                          {comment}
                        </p>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {criteriaNames.length > 0 && (
              <div className="flex items-start gap-3">
                <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Critérios incluídos
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {criteriaNames
                      .slice(0, 8)
                      .map(
                        (criterionName) => (
                          <Badge
                            key={
                              criterionName
                            }
                            variant="outline"
                            className="border-slate-200 bg-slate-50 text-slate-600"
                          >
                            {criterionName}
                          </Badge>
                        )
                      )}

                    {criteriaNames.length >
                      8 && (
                      <Badge
                        variant="outline"
                        className="border-slate-200 bg-white text-slate-500"
                      >
                        +
                        {criteriaNames.length -
                          8}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {point?.evaluationId && (
              <p className="text-xs text-slate-400">
                Referência da avaliação:{' '}
                {point.evaluationId}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TemporalDrilldownModal({
  detail,
  onClose,
}) {
  if (!detail) {
    return null;
  }

  const points =
    Array.isArray(detail.points)
      ? detail.points
      : [];

  const delta =
    getTrendDelta(points);

  const trendStatus =
    getTrendStatus(delta);

  const TrendIcon =
    trendStatus.icon;

  const latestPoint =
    points.length > 0
      ? points[points.length - 1]
      : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="temporal-drilldown-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] border border-slate-200 bg-white shadow-2xl sm:max-w-4xl sm:rounded-[2rem]">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Badge
                variant="outline"
                className="mb-2 border-cyan-200 bg-cyan-50 text-cyan-700"
              >
                <CalendarDays className="mr-1 h-3.5 w-3.5" />
                {detail.levelLabel || 'Evolução temporal'}
              </Badge>

              <h2
                id="temporal-drilldown-title"
                className="font-heading text-2xl text-slate-950 sm:text-3xl"
              >
                {detail.title}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Evolução, contexto das avaliações, avaliadores e observações disponíveis.
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full"
              onClick={onClose}
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">
                Valor atual
              </p>
              <p className="mt-2 font-heading text-3xl text-slate-950">
                {formatScore(
                  latestPoint?.value ??
                  detail.athleteAverage
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                Média da equipa
              </p>
              <p className="mt-2 font-heading text-3xl text-slate-950">
                {formatScore(
                  detail.teamAverage
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                Avaliações
              </p>
              <p className="mt-2 font-heading text-3xl text-slate-950">
                {points.length}
              </p>
            </div>

            <div className={`rounded-2xl border p-4 ${trendStatus.className}`}>
              <p className="text-xs font-bold uppercase tracking-wide">
                Tendência
              </p>

              <div className="mt-2 flex items-center gap-2">
                <TrendIcon className="h-5 w-5" />
                <p className="font-heading text-2xl">
                  {formatDifference(delta)}
                </p>
              </div>

              <p className="mt-1 text-xs">
                {trendStatus.label}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6">
            <LargeTrendChart
              points={points}
              title={`Evolução temporal de ${detail.title}`}
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/60">
            <div className="border-b border-slate-200 bg-white px-5 py-4">
              <h3 className="font-semibold text-slate-900">
                Timeline inteligente
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Consulte a sequência das avaliações, respetivos valores e informação contextual disponível.
              </p>
            </div>

            {points.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Não existem observações disponíveis.
              </div>
            ) : (
              <div className="space-y-4 p-5">
                {[...points]
                  .reverse()
                  .map(
                    (
                      point,
                      reverseIndex,
                      reversedPoints
                    ) => {
                      const chronologicalIndex =
                        points.length -
                        1 -
                        reverseIndex;

                      const previousPoint =
                        chronologicalIndex > 0
                          ? points[
                              chronologicalIndex -
                                1
                            ]
                          : null;

                      return (
                        <TimelineEntry
                          key={`${point.timestamp || point.date || reverseIndex}-${reverseIndex}`}
                          point={point}
                          index={
                            chronologicalIndex
                          }
                          previousPoint={
                            previousPoint
                          }
                        />
                      );
                    }
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Sparkline({
  points = [],
  width = 116,
  height = 36,
  label = 'Evolução recente',
  onOpen,
}) {
  const safePoints =
    (Array.isArray(points) ? points : [])
      .map((point) => ({
        ...point,
        value: Number(point?.value),
      }))
      .filter((point) =>
        Number.isFinite(point.value)
      );

  if (safePoints.length < 2) {
    return (
      <div
        className="flex h-9 min-w-[116px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/70 px-3 text-[11px] text-slate-400"
        title="São necessárias pelo menos duas avaliações."
      >
        Sem histórico
      </div>
    );
  }

  const padding = 4;
  const drawableWidth =
    width - padding * 2;
  const drawableHeight =
    height - padding * 2;

  const xFor = (index) =>
    padding +
    (index /
      Math.max(
        safePoints.length - 1,
        1
      )) *
      drawableWidth;

  const yFor = (value) =>
    padding +
    drawableHeight -
    (Math.max(
      0,
      Math.min(SCORE_MAX, value)
    ) /
      SCORE_MAX) *
      drawableHeight;

  const linePoints =
    safePoints
      .map(
        (point, index) =>
          `${xFor(index)},${yFor(point.value)}`
      )
      .join(' ');

  const areaPoints = [
    `${xFor(0)},${height - padding}`,
    linePoints,
    `${xFor(
      safePoints.length - 1
    )},${height - padding}`,
  ].join(' ');

  const status =
    getTrendStatus(
      getTrendDelta(safePoints)
    );

  const firstValue =
    safePoints[0]?.value;

  const latestValue =
    safePoints[
      safePoints.length - 1
    ]?.value;

  const title = `${label}: ${formatScore(
    firstValue
  )} → ${formatScore(latestValue)} (${
    safePoints.length
  } avaliações)`;

  const chart = (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-9 w-[116px] shrink-0 overflow-visible"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>

      <polygon
        points={areaPoints}
        fill={status.fill}
        opacity="0.8"
      />

      <polyline
        points={linePoints}
        fill="none"
        stroke={status.stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {safePoints.map((point, index) => (
        <circle
          key={`${point.timestamp || point.date || index}-${index}`}
          cx={xFor(index)}
          cy={yFor(point.value)}
          r={
            index === safePoints.length - 1
              ? 3
              : 1.8
          }
          fill="white"
          stroke={status.stroke}
          strokeWidth="1.8"
        />
      ))}
    </svg>
  );

  if (!onOpen) {
    return chart;
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      className="rounded-xl outline-none transition hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
      title={`${title}. Clique para ver o histórico completo.`}
      aria-label={`${title}. Abrir histórico completo.`}
    >
      {chart}
    </button>
  );
}

function CriterionRow({ criterion, onOpenTrend }) {
  const metrics =
    criterion?.metrics || {};

  const athleteAverage =
    metrics.average ?? null;

  const teamAverage =
    metrics.comparisonAverage ??
    null;

  const difference =
    metrics.difference ?? null;

  const athleteWidth =
    scoreWidth(athleteAverage);

  const teamWidth =
    scoreWidth(teamAverage);

  const heat =
    getHeatStatus(difference);

  const trendPoints =
    buildObservationTrend(
      criterion?.scores
    );

  return (
    <div
      className={`rounded-2xl border bg-white p-4 transition-all hover:shadow-sm ${heat.border} ${heat.side}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${heat.dot}`}
              aria-hidden="true"
            />

            <p className="font-semibold text-slate-900">
              {criterion?.name ||
                criterion?.observableAction ||
                'Critério sem identificação'}
            </p>
          </div>

          {criterion?.competencyLabel && (
            <div className="mt-2 flex flex-wrap gap-2 pl-5">
              <Badge
                variant="outline"
                className="border-blue-200 bg-blue-50 text-blue-700"
              >
                {criterion.competencyLabel}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Sparkline
            points={trendPoints}
            label={`Evolução de ${
              criterion?.name ||
              criterion?.observableAction ||
              'critério'
            }`}
            onOpen={() =>
              onOpenTrend?.({
                title:
                  criterion?.name ||
                  criterion?.observableAction ||
                  'Critério',
                levelLabel: 'Critério',
                points: trendPoints,
                athleteAverage,
                teamAverage,
                difference,
              })
            }
          />

          <TrendBadge
            points={trendPoints}
          />

          <DifferenceBadge
            difference={difference}
            showLabel
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-[76px_1fr_42px] items-center gap-3 sm:grid-cols-[90px_1fr_42px]">
          <span className="text-sm font-medium text-cyan-700">
            Atleta
          </span>

          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all duration-300"
              style={{
                width: `${athleteWidth}%`,
              }}
            />
          </div>

          <span className="text-right text-sm font-bold text-slate-800">
            {formatScore(
              athleteAverage
            )}
          </span>
        </div>

        <div className="grid grid-cols-[76px_1fr_42px] items-center gap-3 sm:grid-cols-[90px_1fr_42px]">
          <span className="text-sm font-medium text-violet-700">
            Equipa
          </span>

          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-300"
              style={{
                width: `${teamWidth}%`,
              }}
            />
          </div>

          <span className="text-right text-sm font-bold text-slate-800">
            {formatScore(
              teamAverage
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

function SubdomainAccordion({
  subdomain,
  domainId,
  open,
  onToggle,
  onOpenTrend,
}) {
  const metrics =
    subdomain?.metrics || {};

  const criteria = useMemo(
    () =>
      [
        ...(subdomain?.criteria || []),
      ].sort((first, second) => {
        const firstDifference =
          Number(
            first?.metrics
              ?.difference
          );

        const secondDifference =
          Number(
            second?.metrics
              ?.difference
          );

        const firstValid =
          Number.isFinite(
            firstDifference
          );

        const secondValid =
          Number.isFinite(
            secondDifference
          );

        if (
          firstValid &&
          secondValid &&
          firstDifference !==
            secondDifference
        ) {
          return (
            secondDifference -
            firstDifference
          );
        }

        if (firstValid) {
          return -1;
        }

        if (secondValid) {
          return 1;
        }

        return String(
          first?.name || ''
        ).localeCompare(
          String(
            second?.name || ''
          ),
          'pt-PT'
        );
      }),
    [subdomain]
  );

  const subdomainId =
    normalizeIdentifier(
      subdomain?.id,
      `${domainId}-subdomain`
    );

  const contentId =
    `subdomain-content-${domainId}-${subdomainId}`;

  const heat =
    getHeatStatus(
      metrics.difference
    );

  const HeatIcon =
    heat.icon;

  const trendPoints =
    buildCriteriaTrend(
      criteria
    );

  return (
    <Card
      className={`overflow-hidden border shadow-sm ${heat.border} ${heat.side}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={contentId}
        className={`flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors sm:flex-row sm:items-center sm:justify-between sm:px-5 ${heat.header}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-600" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
          )}

          <Layers className="h-4 w-4 shrink-0 text-cyan-600" />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-slate-900">
                {subdomain?.label ||
                  'Subdomínio'}
              </p>

              <Badge
                variant="outline"
                className="border-slate-200 bg-white/80 text-slate-600"
              >
                {criteria.length}{' '}
                {criteria.length === 1
                  ? 'critério'
                  : 'critérios'}
              </Badge>
            </div>

            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
              <HeatIcon className="h-3.5 w-3.5" />

              {heat.label}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pl-7 sm:justify-end sm:pl-0">
          <Sparkline
            points={trendPoints}
            label={`Evolução de ${
              subdomain?.label ||
              'subdomínio'
            }`}
            onOpen={() =>
              onOpenTrend?.({
                title:
                  subdomain?.label ||
                  'Subdomínio',
                levelLabel: 'Subdomínio',
                points: trendPoints,
                athleteAverage:
                  metrics.average,
                teamAverage:
                  metrics.comparisonAverage,
                difference:
                  metrics.difference,
              })
            }
          />

          <TrendBadge
            points={trendPoints}
            compact
          />

          <AverageBadge
            label="Atleta"
            value={
              metrics.average
            }
            tone="athlete"
          />

          <AverageBadge
            label="Equipa"
            value={
              metrics.comparisonAverage
            }
            tone="team"
          />

          <DifferenceBadge
            difference={
              metrics.difference
            }
          />
        </div>
      </button>

      {open && (
        <div
          id={contentId}
          className={`space-y-3 border-t border-slate-200 p-4 ${heat.body}`}
        >
          {criteria.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              Não existem critérios neste subdomínio.
            </div>
          ) : (
            criteria.map(
              (
                criterion,
                criterionIndex
              ) => (
                <CriterionRow
                  key={
                    criterion?.code ||
                    criterion?.id ||
                    `${subdomainId}-criterion-${criterionIndex}`
                  }
                  criterion={
                    criterion
                  }
                  onOpenTrend={
                    onOpenTrend
                  }
                />
              )
            )
          )}
        </div>
      )}
    </Card>
  );
}

function DomainAccordion({
  domain,
  open,
  onToggle,
  openSubdomains,
  onToggleSubdomain,
  onOpenTrend,
}) {
  const metrics =
    domain?.metrics || {};

  const domainId =
    normalizeIdentifier(
      domain?.id,
      'domain'
    );

  const contentId =
    `domain-content-${domainId}`;

  const subdomains = useMemo(
    () =>
      [
        ...(domain?.subdomains || []),
      ].sort((first, second) => {
        const firstOrder =
          Number(
            first?.order ??
              Number.MAX_SAFE_INTEGER
          );

        const secondOrder =
          Number(
            second?.order ??
              Number.MAX_SAFE_INTEGER
          );

        if (
          firstOrder !== secondOrder
        ) {
          return (
            firstOrder -
            secondOrder
          );
        }

        return String(
          first?.label || ''
        ).localeCompare(
          String(
            second?.label || ''
          ),
          'pt-PT'
        );
      }),
    [domain]
  );

  const criteria =
    useMemo(
      () =>
        subdomains.flatMap(
          (subdomain) =>
            Array.isArray(
              subdomain?.criteria
            )
              ? subdomain.criteria
              : []
        ),
      [subdomains]
    );

  const heatCounts =
    useMemo(
      () => {
        const counts = {
          excellent: 0,
          above: 0,
          balanced: 0,
          attention: 0,
          priority: 0,
        };

        criteria.forEach(
          (criterion) => {
            const status =
              getHeatStatus(
                criterion?.metrics
                  ?.difference
              );

            if (
              Object.prototype.hasOwnProperty.call(
                counts,
                status.key
              )
            ) {
              counts[status.key] += 1;
            }
          }
        );

        return counts;
      },
      [criteria]
    );

  const domainStyle =
    getDomainStyle(domain);

  const heat =
    getHeatStatus(
      metrics.difference
    );

  const HeatIcon =
    heat.icon;

  const trendPoints =
    buildCriteriaTrend(
      criteria
    );

  return (
    <Card
      className={`overflow-hidden border shadow-md ${heat.border} ${heat.side}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={contentId}
        className={`flex w-full flex-col gap-4 px-5 py-5 text-left transition-colors sm:px-6 lg:flex-row lg:items-center lg:justify-between ${heat.header}`}
      >
        <div className="flex min-w-0 items-center gap-4">
          {open ? (
            <ChevronDown className="h-5 w-5 shrink-0 text-slate-600" />
          ) : (
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-600" />
          )}

          <FolderTree
            className={`h-5 w-5 shrink-0 ${domainStyle.icon}`}
          />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-lg font-semibold text-slate-900">
                {domain?.label ||
                  'Domínio'}
              </h3>

              <Badge
                variant="outline"
                className={
                  domainStyle.badge
                }
              >
                {criteria.length}{' '}
                {criteria.length === 1
                  ? 'critério'
                  : 'critérios'}
              </Badge>

              <Badge
                variant="outline"
                className={
                  heat.badge
                }
              >
                <HeatIcon className="mr-1 h-3.5 w-3.5" />

                {heat.shortLabel}
              </Badge>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              {subdomains.length}{' '}
              {subdomains.length === 1
                ? 'subdomínio'
                : 'subdomínios'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pl-9 lg:justify-end lg:pl-0">
          <Sparkline
            points={trendPoints}
            label={`Evolução de ${
              domain?.label ||
              'domínio'
            }`}
            onOpen={() =>
              onOpenTrend?.({
                title:
                  domain?.label ||
                  'Domínio',
                levelLabel: 'Domínio',
                points: trendPoints,
                athleteAverage:
                  metrics.average,
                teamAverage:
                  metrics.comparisonAverage,
                difference:
                  metrics.difference,
              })
            }
          />

          <TrendBadge
            points={trendPoints}
            compact
          />

          <AverageBadge
            label="Atleta"
            value={
              metrics.average
            }
            tone="athlete"
          />

          <AverageBadge
            label="Equipa"
            value={
              metrics.comparisonAverage
            }
            tone="team"
          />

          <DifferenceBadge
            difference={
              metrics.difference
            }
          />
        </div>
      </button>

      {open && (
        <div
          id={contentId}
          className={`border-t border-slate-200 ${heat.body}`}
        >
          <div className="border-b border-slate-200 bg-white/90 px-5 py-3 sm:px-6">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm font-medium text-slate-700">
                {criteria.length}{' '}
                {criteria.length === 1
                  ? 'critério avaliado'
                  : 'critérios avaliados'}
              </p>

              <HeatSummary
                excellent={
                  heatCounts.excellent
                }
                above={
                  heatCounts.above
                }
                balanced={
                  heatCounts.balanced
                }
                attention={
                  heatCounts.attention
                }
                priority={
                  heatCounts.priority
                }
              />
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            {subdomains.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                Não existem subdomínios para este domínio.
              </div>
            ) : (
              subdomains.map(
                (
                  subdomain,
                  subdomainIndex
                ) => {
                  const subdomainId =
                    normalizeIdentifier(
                      subdomain?.id,
                      `${domainId}-subdomain-${subdomainIndex}`
                    );

                  return (
                    <SubdomainAccordion
                      key={
                        subdomainId
                      }
                      domainId={
                        domainId
                      }
                      subdomain={
                        subdomain
                      }
                      open={openSubdomains.has(
                        subdomainId
                      )}
                      onToggle={() =>
                        onToggleSubdomain(
                          subdomainId
                        )
                      }
                      onOpenTrend={
                        onOpenTrend
                      }
                    />
                  );
                }
              )
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function DevelopmentComparisonTree({
  domains = [],
}) {
  const orderedDomains = useMemo(
    () =>
      [
        ...(Array.isArray(domains)
          ? domains
          : []),
      ].sort((first, second) => {
        const firstOrder =
          Number(
            first?.order ??
              Number.MAX_SAFE_INTEGER
          );

        const secondOrder =
          Number(
            second?.order ??
              Number.MAX_SAFE_INTEGER
          );

        if (
          firstOrder !== secondOrder
        ) {
          return (
            firstOrder -
            secondOrder
          );
        }

        return String(
          first?.label || ''
        ).localeCompare(
          String(
            second?.label || ''
          ),
          'pt-PT'
        );
      }),
    [domains]
  );

  const initialDomainId =
    orderedDomains.length > 0
      ? normalizeIdentifier(
          orderedDomains[0]?.id,
          'domain-0'
        )
      : null;

  const [openDomains, setOpenDomains] =
    useState(() =>
      initialDomainId
        ? new Set([
            initialDomainId,
          ])
        : new Set()
    );

  const [
    openSubdomains,
    setOpenSubdomains,
  ] = useState(new Set());

  const [
    temporalDetail,
    setTemporalDetail,
  ] = useState(null);

  const toggleDomain = (
    domainId
  ) => {
    setOpenDomains(
      (current) => {
        const next =
          new Set(current);

        if (
          next.has(domainId)
        ) {
          next.delete(
            domainId
          );
        } else {
          next.add(domainId);
        }

        return next;
      }
    );
  };

  const toggleSubdomain = (
    subdomainId
  ) => {
    setOpenSubdomains(
      (current) => {
        const next =
          new Set(current);

        if (
          next.has(
            subdomainId
          )
        ) {
          next.delete(
            subdomainId
          );
        } else {
          next.add(
            subdomainId
          );
        }

        return next;
      }
    );
  };

  const expandAll = () => {
    const domainIds =
      new Set();

    const subdomainIds =
      new Set();

    orderedDomains.forEach(
      (
        domain,
        domainIndex
      ) => {
        const domainId =
          normalizeIdentifier(
            domain?.id,
            `domain-${domainIndex}`
          );

        domainIds.add(
          domainId
        );

        (
          domain?.subdomains ||
          []
        ).forEach(
          (
            subdomain,
            subdomainIndex
          ) => {
            subdomainIds.add(
              normalizeIdentifier(
                subdomain?.id,
                `${domainId}-subdomain-${subdomainIndex}`
              )
            );
          }
        );
      }
    );

    setOpenDomains(
      domainIds
    );

    setOpenSubdomains(
      subdomainIds
    );
  };

  const collapseAll = () => {
    setOpenDomains(
      new Set()
    );

    setOpenSubdomains(
      new Set()
    );
  };

  if (
    orderedDomains.length === 0
  ) {
    return (
      <Card className="border border-dashed border-slate-300 bg-slate-50">
        <div className="flex flex-col items-center justify-center px-8 py-16">
          <Target className="mb-4 h-12 w-12 text-slate-300" />

          <h3 className="text-lg font-semibold text-slate-700">
            Ainda não existem dados suficientes
          </h3>

          <p className="mt-2 max-w-xl text-center text-sm leading-6 text-slate-500">
            Quando existirem avaliações suficientes será apresentada aqui a árvore completa de desenvolvimento, organizada por domínio, subdomínio e critérios.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-semibold text-slate-800">
              Heat Map e timeline inteligente
            </p>

            <p className="text-xs leading-5 text-slate-500">
              As cores identificam prioridades; clique numa sparkline para consultar a timeline detalhada.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full bg-white"
              onClick={
                expandAll
              }
            >
              <ChevronsDown className="mr-1.5 h-4 w-4" />
              Expandir tudo
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full bg-white"
              onClick={
                collapseAll
              }
            >
              <ChevronsUp className="mr-1.5 h-4 w-4" />
              Recolher tudo
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-200 pt-3 text-xs text-slate-600">
          {[
            HEAT_STATUS.excellent,
            HEAT_STATUS.above,
            HEAT_STATUS.balanced,
            HEAT_STATUS.attention,
            HEAT_STATUS.priority,
          ].map((status) => (
            <span
              key={
                status.key
              }
              className="inline-flex items-center gap-1.5"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${status.dot}`}
              />

              {status.shortLabel}
            </span>
          ))}
        </div>
      </div>

      {orderedDomains.map(
        (
          domain,
          domainIndex
        ) => {
          const domainId =
            normalizeIdentifier(
              domain?.id,
              `domain-${domainIndex}`
            );

          return (
            <DomainAccordion
              key={
                domainId
              }
              domain={
                domain
              }
              open={openDomains.has(
                domainId
              )}
              onToggle={() =>
                toggleDomain(
                  domainId
                )
              }
              openSubdomains={
                openSubdomains
              }
              onToggleSubdomain={
                toggleSubdomain
              }
              onOpenTrend={
                setTemporalDetail
              }
            />
          );
        }
      )}

      <TemporalDrilldownModal
        detail={temporalDetail}
        onClose={() =>
          setTemporalDetail(null)
        }
      />
    </div>
  );
}

export default DevelopmentComparisonTree;
