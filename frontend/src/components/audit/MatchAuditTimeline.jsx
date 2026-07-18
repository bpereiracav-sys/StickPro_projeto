import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  History,
  Loader2,
  Pencil,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

const ACTION_CONFIG = {
  conflict_detected: {
    label: 'Conflito detetado',
    description:
      'Foi encontrada uma diferença entre o resultado atual e a fonte oficial.',
    icon: AlertTriangle,
    iconClassName:
      'bg-amber-100 text-amber-700',
    badgeClassName:
      'border-amber-200 bg-amber-50 text-amber-700',
  },

  result_manual_update: {
    label: 'Resultado alterado manualmente',
    description:
      'O resultado do jogo foi atualizado manualmente.',
    icon: Pencil,
    iconClassName:
      'bg-blue-100 text-blue-700',
    badgeClassName:
      'border-blue-200 bg-blue-50 text-blue-700',
  },

  official_result_applied: {
    label: 'Resultado oficial aplicado',
    description:
      'O resultado da fonte oficial foi confirmado e aplicado.',
    icon: ShieldCheck,
    iconClassName:
      'bg-emerald-100 text-emerald-700',
    badgeClassName:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
  },

  conflict_resolved: {
    label: 'Conflito resolvido',
    description:
      'O conflito entre os resultados foi resolvido.',
    icon: CheckCircle2,
    iconClassName:
      'bg-emerald-100 text-emerald-700',
    badgeClassName:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
  },

  gamesheet_imported: {
    label: 'Ficha oficial importada',
    description:
      'A ficha eletrónica oficial foi importada.',
    icon: FileCheck2,
    iconClassName:
      'bg-cyan-100 text-cyan-700',
    badgeClassName:
      'border-cyan-200 bg-cyan-50 text-cyan-700',
  },

  gamesheet_synced: {
    label: 'Ficha oficial sincronizada',
    description:
      'Os dados da ficha oficial foram sincronizados.',
    icon: FileCheck2,
    iconClassName:
      'bg-cyan-100 text-cyan-700',
    badgeClassName:
      'border-cyan-200 bg-cyan-50 text-cyan-700',
  },

  imported: {
    label: 'Dados oficiais importados',
    description:
      'Foram importados novos dados da fonte oficial.',
    icon: FileCheck2,
    iconClassName:
      'bg-cyan-100 text-cyan-700',
    badgeClassName:
      'border-cyan-200 bg-cyan-50 text-cyan-700',
  },

  gamesheet_updated: {
    label: 'Ficha oficial atualizada',
    description:
      'A ficha eletrónica oficial foi novamente atualizada.',
    icon: RefreshCw,
    iconClassName:
      'bg-violet-100 text-violet-700',
    badgeClassName:
      'border-violet-200 bg-violet-50 text-violet-700',
  },

  sync_updated: {
    label: 'Sincronização atualizada',
    description:
      'Os dados sincronizados foram atualizados.',
    icon: RefreshCw,
    iconClassName:
      'bg-violet-100 text-violet-700',
    badgeClassName:
      'border-violet-200 bg-violet-50 text-violet-700',
  },

  timeline_synced: {
    label: 'Timeline sincronizada',
    description:
      'O resultado e as estatísticas foram atualizados a partir da timeline.',
    icon: RefreshCw,
    iconClassName:
      'bg-emerald-100 text-emerald-700',
    badgeClassName:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
};

export function getAuditAction(entry) {
  return (
    entry?.action ||
    entry?.event_type ||
    entry?.type ||
    'unknown'
  );
}

export function getAuditConfig(entry) {
  const action = getAuditAction(entry);

  return (
    ACTION_CONFIG[action] || {
      label:
        entry?.title ||
        entry?.label ||
        entry?.summary ||
        'Alteração registada',
      description:
        entry?.description ||
        entry?.message ||
        entry?.details ||
        'Foi registada uma alteração nos dados do jogo.',
      icon: History,
      iconClassName:
        'bg-slate-100 text-slate-700',
      badgeClassName:
        'border-slate-200 bg-slate-50 text-slate-700',
    }
  );
}

export function getAuditDate(entry) {
  return (
    entry?.created_at ||
    entry?.timestamp ||
    entry?.date ||
    entry?.updated_at ||
    null
  );
}

export function normalizeAuditEntries(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) {
    return data.items;
  }
  if (Array.isArray(data?.history)) {
    return data.history;
  }
  if (Array.isArray(data?.audit_entries)) {
    return data.audit_entries;
  }
  if (Array.isArray(data?.entries)) {
    return data.entries;
  }

  return [];
}

function formatAuditDate(value) {
  if (!value) return 'Data não disponível';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    'pt-PT',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  ).format(date);
}

function getSourceLabel(source) {
  if (!source) return 'StickPro';

  const normalized =
    String(source).toLowerCase();

  const labels = {
    manual: 'Manual',
    apl: 'APL',
    fpp: 'FPP',
    system: 'Sistema',
    stickpro: 'StickPro',
    timeline: 'Timeline',
    official: 'Oficial',
    gamesheet: 'Ficha oficial',
  };

  return (
    labels[normalized] ||
    String(source).toUpperCase()
  );
}

function getResolutionConfig(resolution) {
  if (!resolution) return null;

  const normalized =
    String(resolution).toLowerCase();

  const resolutions = {
    pending: {
      label: 'Resolução pendente',
      className:
        'border-amber-200 bg-amber-50 text-amber-800',
    },

    official_applied: {
      label: 'Resultado oficial aplicado',
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-800',
    },

    manual_kept: {
      label: 'Resultado atual mantido',
      className:
        'border-blue-200 bg-blue-50 text-blue-800',
    },

    resolved: {
      label: 'Conflito resolvido',
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-800',
    },
  };

  return (
    resolutions[normalized] || {
      label: String(resolution),
      className:
        'border-slate-200 bg-slate-50 text-slate-700',
    }
  );
}

function formatScore(home, away) {
  const hasHome =
    home !== undefined &&
    home !== null &&
    home !== '';

  const hasAway =
    away !== undefined &&
    away !== null &&
    away !== '';

  if (!hasHome && !hasAway) {
    return null;
  }

  return `${hasHome ? home : '—'} – ${
    hasAway ? away : '—'
  }`;
}

function getScore(data) {
  if (!data) return null;

  if (typeof data === 'string') {
    return data;
  }

  if (
    data.result !== undefined &&
    data.result !== null
  ) {
    return String(data.result);
  }

  return formatScore(
    data.home_score ??
      data.score_home ??
      data.homeScore,
    data.away_score ??
      data.score_away ??
      data.awayScore
  );
}

function getPreviousScore(entry) {
  return (
    entry?.previous_result ||
    entry?.old_result ||
    getScore(entry?.previous_data) ||
    getScore(entry?.old_data) ||
    getScore(entry?.before) ||
    formatScore(
      entry?.previous_home_score ??
        entry?.old_home_score,
      entry?.previous_away_score ??
        entry?.old_away_score
    )
  );
}

function getNewScore(entry) {
  return (
    entry?.new_result ||
    entry?.result ||
    getScore(entry?.new_data) ||
    getScore(entry?.updated_data) ||
    getScore(entry?.after) ||
    getScore(entry?.official) ||
    formatScore(
      entry?.new_home_score ??
        entry?.home_score,
      entry?.new_away_score ??
        entry?.away_score
    )
  );
}

function getUserName(entry) {
  return (
    entry?.user_name ||
    entry?.created_by_name ||
    entry?.actor_name ||
    entry?.performed_by ||
    entry?.user?.name ||
    entry?.metadata?.user_name ||
    (entry?.user_id
      ? 'Utilizador StickPro'
      : 'Sistema StickPro')
  );
}

function getSource(entry) {
  return (
    entry?.source ||
    entry?.origin ||
    entry?.provider ||
    entry?.metadata?.source ||
    'system'
  );
}

function ScoreChange({
  previousScore,
  newScore,
  isConflict = false,
}) {
  if (!previousScore && !newScore) {
    return null;
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {isConflict
            ? 'Resultado atual'
            : 'Anterior'}
        </p>

        <p className="mt-1 font-heading text-2xl font-bold text-slate-950">
          {previousScore || '—'}
        </p>
      </div>

      <div className="hidden text-slate-300 sm:block">
        →
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
          {isConflict
            ? 'Resultado oficial'
            : 'Novo'}
        </p>

        <p className="mt-1 font-heading text-2xl font-bold text-emerald-950">
          {newScore || '—'}
        </p>
      </div>
    </div>
  );
}

function AuditEntry({
  entry,
  isLast,
  compact = false,
  onResolveConflict,
  resolvingConflictId,
}) {
  const config = getAuditConfig(entry);
  const Icon = config.icon;

  const action = getAuditAction(entry);

  const previousScore =
    getPreviousScore(entry);

  const newScore = getNewScore(entry);

  const resolutionValue =
    entry?.metadata?.resolution ||
    entry?.resolution;

  const resolution =
    getResolutionConfig(resolutionValue);

  const isPendingConflict =
    action === 'conflict_detected' &&
    (!resolutionValue ||
      resolutionValue === 'pending');

  const auditId =
    entry?.id || entry?._id;

  const isResolving =
    resolvingConflictId === auditId;

  const officialUrl =
    entry?.metadata?.official_match_url ||
    entry?.official_match_url;

  const description =
    entry?.description ||
    entry?.message ||
    entry?.details ||
    config.description;

  return (
    <div className="relative flex gap-3 sm:gap-4">
      {!isLast && (
        <span className="absolute left-[21px] top-11 h-[calc(100%-20px)] w-px bg-slate-200" />
      )}

      <div
        className={[
          'relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
          config.iconClassName,
        ].join(' ')}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div
        className={[
          'min-w-0 flex-1 pb-5',
          compact
            ? 'sm:pb-5'
            : 'sm:pb-6',
        ].join(' ')}
      >
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="font-heading text-base font-semibold text-slate-950">
                {entry?.summary ||
                  config.label}
              </h3>

              {description && (
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {description}
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Badge
                variant="outline"
                className={
                  config.badgeClassName
                }
              >
                {config.label}
              </Badge>

              <Badge
                variant="outline"
                className="border-slate-200 bg-slate-50 text-slate-600"
              >
                {getSourceLabel(
                  getSource(entry)
                )}
              </Badge>
            </div>
          </div>

          <ScoreChange
            previousScore={previousScore}
            newScore={newScore}
            isConflict={
              action ===
              'conflict_detected'
            }
          />

          {resolution && (
            <div
              className={[
                'mt-3 rounded-xl border px-3 py-2 text-sm',
                resolution.className,
              ].join(' ')}
            >
              {resolution.label}
            </div>
          )}

          {isPendingConflict &&
            onResolveConflict &&
            auditId && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                  <div>
                    <p className="text-sm font-semibold text-amber-950">
                      Decisão necessária
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      Confirme qual dos
                      resultados deverá
                      prevalecer. A decisão
                      ficará registada no
                      histórico.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 rounded-xl border-blue-200 bg-white text-blue-800 hover:bg-blue-50"
                    disabled={isResolving}
                    onClick={() =>
                      onResolveConflict(
                        entry,
                        'current'
                      )
                    }
                  >
                    {isResolving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}

                    Manter resultado atual
                  </Button>

                  <Button
                    type="button"
                    className="min-h-11 rounded-xl"
                    disabled={isResolving}
                    onClick={() =>
                      onResolveConflict(
                        entry,
                        'official'
                      )
                    }
                  >
                    {isResolving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-2 h-4 w-4" />
                    )}

                    Aplicar resultado oficial
                  </Button>
                </div>
              </div>
            )}

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />

              {formatAuditDate(
                getAuditDate(entry)
              )}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5" />

              {getUserName(entry)}
            </span>
          </div>

          {officialUrl && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-500">
                Fonte oficial
              </p>

              <a
                href={officialUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex break-all text-xs font-medium text-primary hover:underline"
              >
                Abrir ficha oficial
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MatchAuditTimeline({
  entries = [],
  compact = false,
  emptyTitle = 'Ainda não existem registos',
  emptyDescription = 'As importações oficiais, alterações manuais e conflitos deste jogo aparecerão aqui.',
  onResolveConflict,
  resolvingConflictId = null,
}) {
  if (!entries.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
          <History className="h-7 w-7" />
        </div>

        <h3 className="mt-4 font-heading text-lg font-semibold text-slate-950">
          {emptyTitle}
        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div>
      {entries.map((entry, index) => (
        <AuditEntry
          key={
            entry?.id ||
            entry?._id ||
            `${getAuditAction(
              entry
            )}-${getAuditDate(
              entry
            )}-${index}`
          }
          entry={entry}
          compact={compact}
          isLast={
            index === entries.length - 1
          }
          onResolveConflict={
            onResolveConflict
          }
          resolvingConflictId={
            resolvingConflictId
          }
        />
      ))}
    </div>
  );
}
