import { useMemo, useState } from 'react';

import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  Layers,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import { Badge } from '../ui/badge';
import { Card } from '../ui/card';


const SCORE_MAX = 5;

const DOMAIN_COLORS = {
  technical: {
    badge:
      'border-cyan-200 bg-cyan-50 text-cyan-700',
  },

  tactical: {
    badge:
      'border-blue-200 bg-blue-50 text-blue-700',
  },

  physical: {
    badge:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
  },

  psychological: {
    badge:
      'border-purple-200 bg-purple-50 text-purple-700',
  },

  attitude: {
    badge:
      'border-amber-200 bg-amber-50 text-amber-700',
  },

  other: {
    badge:
      'border-slate-200 bg-slate-50 text-slate-700',
  },
};

function getBadgeClass(category) {
  return (
    DOMAIN_COLORS[
      category?.toLowerCase()
    ]?.badge ||
    DOMAIN_COLORS.other.badge
  );
}

function scoreWidth(score) {
  if (
    score === null ||
    score === undefined
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

function formatDifference(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return '—';
  }

  const number = Number(value);

  return `${number >= 0 ? '+' : ''}${number.toFixed(
    1
  )}`;
}

function DifferenceBadge({
  difference,
}) {
  if (
    difference === null ||
    difference === undefined
  ) {
    return (
      <Badge
        variant="outline"
        className="border-slate-200 bg-slate-50 text-slate-500"
      >
        —
      </Badge>
    );
  }

  if (difference > 0.05) {
    return (
      <Badge
        variant="outline"
        className="border-emerald-200 bg-emerald-50 text-emerald-700"
      >
        <TrendingUp className="mr-1 h-3.5 w-3.5" />

        {formatDifference(
          difference
        )}
      </Badge>
    );
  }

  if (difference < -0.05) {
    return (
      <Badge
        variant="outline"
        className="border-amber-200 bg-amber-50 text-amber-700"
      >
        <TrendingDown className="mr-1 h-3.5 w-3.5" />

        {formatDifference(
          difference
        )}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-slate-200 bg-slate-50 text-slate-600"
    >
      0.0
    </Badge>
  );
}

function CriterionRow({ criterion }) {
  const athleteAverage =
    criterion?.metrics?.average ?? null;

  const teamAverage =
    criterion?.metrics?.comparisonAverage ??
    null;

  const difference =
    criterion?.metrics?.difference ?? null;

  const athleteWidth =
    scoreWidth(athleteAverage);

  const teamWidth =
    scoreWidth(teamAverage);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-cyan-200 hover:shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">
            {criterion.name}
          </p>

          {(criterion.code ||
            criterion.observableAction) && (
            <p className="mt-1 text-xs text-slate-500">
              {criterion.code}
            </p>
          )}
        </div>

        <DifferenceBadge
          difference={difference}
        />
      </div>

      <div className="space-y-3">

        {/* Atleta */}

        <div className="grid grid-cols-[90px_1fr_42px] items-center gap-3">

          <span className="text-sm font-medium text-cyan-700">
            Atleta
          </span>

          <div className="h-2 overflow-hidden rounded-full bg-slate-100">

            <div
              className="h-full rounded-full bg-cyan-500 transition-all"
              style={{
                width: `${athleteWidth}%`,
              }}
            />

          </div>

          <span className="text-right text-sm font-bold text-slate-800">
            {athleteAverage !== null
              ? Number(
                  athleteAverage
                ).toFixed(1)
              : '—'}
          </span>

        </div>

        {/* Equipa */}

        <div className="grid grid-cols-[90px_1fr_42px] items-center gap-3">

          <span className="text-sm font-medium text-violet-700">
            Equipa
          </span>

          <div className="h-2 overflow-hidden rounded-full bg-slate-100">

            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{
                width: `${teamWidth}%`,
              }}
            />

          </div>

          <span className="text-right text-sm font-bold text-slate-800">
            {teamAverage !== null
              ? Number(
                  teamAverage
                ).toFixed(1)
              : '—'}
          </span>

        </div>

      </div>
    </div>
  );
}

function SubdomainAccordion({ subdomain }) {
  const [open, setOpen] = useState(false);

  const metrics = subdomain?.metrics || {};

  const criteria = useMemo(
    () =>
      [...(subdomain?.criteria || [])].sort((a, b) => {
        const first =
          Number(a?.metrics?.difference ?? -999);

        const second =
          Number(b?.metrics?.difference ?? -999);

        return second - first;
      }),
    [subdomain]
  );

  return (
    <Card className="overflow-hidden border border-slate-200 shadow-sm">

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between bg-slate-50 px-5 py-4 text-left transition-colors hover:bg-slate-100"
      >

        <div className="flex items-center gap-3">

          {open ? (
            <ChevronDown className="h-4 w-4 text-slate-600" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-600" />
          )}

          <Layers className="h-4 w-4 text-cyan-600" />

          <div>

            <p className="font-semibold text-slate-900">
              {subdomain.label}
            </p>

            <p className="text-xs text-slate-500">
              {metrics.criterionCount || 0} critérios
            </p>

          </div>

        </div>

        <div className="flex items-center gap-3">

          <Badge
            variant="outline"
            className="border-cyan-200 bg-cyan-50 text-cyan-700"
          >
            Atleta&nbsp;
            {metrics.average !== null
              ? Number(metrics.average).toFixed(1)
              : "—"}
          </Badge>

          <Badge
            variant="outline"
            className="border-violet-200 bg-violet-50 text-violet-700"
          >
            Equipa&nbsp;
            {metrics.comparisonAverage !== null
              ? Number(
                  metrics.comparisonAverage
                ).toFixed(1)
              : "—"}
          </Badge>

          <DifferenceBadge
            difference={metrics.difference}
          />

        </div>

      </button>

      {open && (

        <div className="space-y-3 border-t border-slate-200 bg-white p-4">

          {criteria.length === 0 ? (

            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Não existem critérios neste subdomínio.
            </div>

          ) : (

            criteria.map((criterion) => (
              <CriterionRow
                key={
                  criterion.code ||
                  criterion.id
                }
                criterion={criterion}
              />
            ))

          )}

        </div>

      )}

    </Card>
  );
}
function DomainAccordion({ domain }) {
  const [open, setOpen] = useState(true);

  const metrics = domain?.metrics || {};

  const subdomains = useMemo(
    () =>
      [...(domain?.subdomains || [])].sort((a, b) => {
        const first =
          Number(a?.metrics?.difference ?? -999);

        const second =
          Number(b?.metrics?.difference ?? -999);

        return second - first;
      }),
    [domain]
  );

  const athleteAverage =
    metrics.average ?? null;

  const teamAverage =
    metrics.comparisonAverage ?? null;

  const difference =
    metrics.difference ?? null;

  const criteriaCount =
    metrics.criterionCount ?? 0;

  const aboveTeam =
    subdomains.filter(
      (item) =>
        (item?.metrics?.difference ?? 0) > 0
    ).length;

  const belowTeam =
    subdomains.filter(
      (item) =>
        (item?.metrics?.difference ?? 0) < 0
    ).length;

  return (
    <Card className="overflow-hidden border border-slate-200 shadow-md">

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between bg-gradient-to-r from-slate-50 via-white to-cyan-50 px-6 py-5 text-left transition-colors hover:from-slate-100 hover:to-cyan-100"
      >

        <div className="flex items-center gap-4">

          {open ? (
            <ChevronDown className="h-5 w-5 text-slate-600" />
          ) : (
            <ChevronRight className="h-5 w-5 text-slate-600" />
          )}

          <FolderTree className="h-5 w-5 text-cyan-600" />

          <div>

            <div className="flex items-center gap-2">

              <h3 className="font-heading text-lg font-semibold text-slate-900">
                {domain.label}
              </h3>

              <Badge
                variant="outline"
                className={getBadgeClass(
                  domain.code
                )}
              >
                {criteriaCount} critérios
              </Badge>

            </div>

            <p className="mt-1 text-xs text-slate-500">
              {subdomains.length} subdomínios
            </p>

          </div>

        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">

          <Badge
            variant="outline"
            className="border-cyan-200 bg-cyan-50 text-cyan-700"
          >
            Atleta&nbsp;
            {athleteAverage !== null
              ? Number(
                  athleteAverage
                ).toFixed(1)
              : "—"}
          </Badge>

          <Badge
            variant="outline"
            className="border-violet-200 bg-violet-50 text-violet-700"
          >
            Equipa&nbsp;
            {teamAverage !== null
              ? Number(
                  teamAverage
                ).toFixed(1)
              : "—"}
          </Badge>

          <DifferenceBadge
            difference={difference}
          />

        </div>

      </button>

      {open && (

        <div className="border-t border-slate-200 bg-slate-50">

          <div className="grid gap-3 border-b border-slate-200 bg-white px-6 py-4 md:grid-cols-3">

            <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4">

              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
                Critérios avaliados
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {criteriaCount}
              </p>

            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">

              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Acima da equipa
              </p>

              <p className="mt-2 text-3xl font-bold text-emerald-700">
                {aboveTeam}
              </p>

            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">

              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                A desenvolver
              </p>

              <p className="mt-2 text-3xl font-bold text-amber-700">
                {belowTeam}
              </p>

            </div>

          </div>

          <div className="space-y-4 p-5">

            {subdomains.length === 0 ? (

              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">

                Não existem subdomínios para este domínio.

              </div>

            ) : (

              subdomains.map((subdomain) => (
                <SubdomainAccordion
                  key={subdomain.id}
                  subdomain={subdomain}
                />
              ))

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
  const orderedDomains = useMemo(() => {
    return [...domains].sort((a, b) => {
      const first =
        Number(a?.order ?? 9999);

      const second =
        Number(b?.order ?? 9999);

      return first - second;
    });
  }, [domains]);

  if (!orderedDomains.length) {
    return (
      <Card className="border border-dashed border-slate-300 bg-slate-50">
        <div className="flex flex-col items-center justify-center px-8 py-16">

          <Target className="mb-4 h-12 w-12 text-slate-300" />

          <h3 className="text-lg font-semibold text-slate-700">
            Ainda não existem dados suficientes
          </h3>

          <p className="mt-2 max-w-xl text-center text-sm leading-6 text-slate-500">
            Quando existirem avaliações suficientes será
            apresentada aqui a árvore completa de
            desenvolvimento organizada por Domínio,
            Subdomínio e Critérios.
          </p>

        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">

      {orderedDomains.map((domain) => (
        <DomainAccordion
          key={domain.id}
          domain={domain}
        />
      ))}

    </div>
  );
}

export default DevelopmentComparisonTree;
