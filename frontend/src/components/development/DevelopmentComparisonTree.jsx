import { useMemo, useState } from 'react';

import {
  ChevronsDown,
  ChevronsUp,
  ChevronDown,
  ChevronRight,
  CircleDot,
  FolderTree,
  Layers,
  Target,
  TrendingDown,
  TrendingUp,
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

function CriterionRow({ criterion }) {
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

          <div className="mt-2 flex flex-wrap gap-2 pl-5">
            {criterion?.code && (
              <Badge
                variant="outline"
                className="border-slate-200 bg-slate-50 text-slate-600"
              >
                {criterion.code}
              </Badge>
            )}

            {criterion?.competencyLabel && (
              <Badge
                variant="outline"
                className="border-blue-200 bg-blue-50 text-blue-700"
              >
                {criterion.competencyLabel}
              </Badge>
            )}
          </div>
        </div>

        <DifferenceBadge
          difference={difference}
          showLabel
        />
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
              Heat Map de desenvolvimento
            </p>

            <p className="text-xs leading-5 text-slate-500">
              As cores permitem identificar rapidamente áreas fortes, equilibradas e prioritárias.
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
            />
          );
        }
      )}
    </div>
  );
}

export default DevelopmentComparisonTree;
