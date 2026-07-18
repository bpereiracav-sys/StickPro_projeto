import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';

import { championshipsApi } from '../../services/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';

const ACTION_CONFIG = {
  conflict_detected: {
    label: 'Conflito detetado',
    description:
      'Foi encontrada uma diferença entre o resultado registado e a fonte oficial.',
    icon: AlertTriangle,
    badgeClass:
      'border-amber-200 bg-amber-50 text-amber-700',
    iconClass: 'bg-amber-100 text-amber-700',
  },

  result_manual_update: {
    label: 'Resultado alterado manualmente',
    description:
      'O resultado do jogo foi atualizado manualmente.',
    icon: UserRound,
    badgeClass:
      'border-blue-200 bg-blue-50 text-blue-700',
    iconClass: 'bg-blue-100 text-blue-700',
  },

  official_result_applied: {
    label: 'Resultado oficial aplicado',
    description:
      'O resultado da ficha oficial foi confirmado e aplicado.',
    icon: ShieldCheck,
    badgeClass:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
    iconClass: 'bg-emerald-100 text-emerald-700',
  },

  gamesheet_imported: {
    label: 'Ficha oficial importada',
    description:
      'A ficha eletrónica oficial foi importada.',
    icon: FileCheck2,
    badgeClass:
      'border-cyan-200 bg-cyan-50 text-cyan-700',
    iconClass: 'bg-cyan-100 text-cyan-700',
  },

  gamesheet_updated: {
    label: 'Ficha oficial atualizada',
    description:
      'Os dados da ficha eletrónica foram novamente sincronizados.',
    icon: RefreshCw,
    badgeClass:
      'border-violet-200 bg-violet-50 text-violet-700',
    iconClass: 'bg-violet-100 text-violet-700',
  },

  timeline_synced: {
    label: 'Timeline sincronizada',
    description:
      'O resultado e as estatísticas foram atualizados a partir da timeline.',
    icon: RefreshCw,
    badgeClass:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
    iconClass: 'bg-emerald-100 text-emerald-700',
  },
};

function normalizeEntries(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.history)) return data.history;
  if (Array.isArray(data?.audit_entries)) {
    return data.audit_entries;
  }
  if (Array.isArray(data?.entries)) return data.entries;

  return [];
}

function getEntryDate(entry) {
  return (
    entry?.created_at ||
    entry?.timestamp ||
    entry?.date ||
    entry?.updated_at ||
    null
  );
}

function formatAuditDate(value) {
  if (!value) return 'Data não disponível';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Data não disponível';
  }

  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatScore(home, away) {
  const hasHome =
    home !== null &&
    home !== undefined &&
    home !== '';

  const hasAway =
    away !== null &&
    away !== undefined &&
    away !== '';

  if (!hasHome && !hasAway) {
    return null;
  }

  return `${hasHome ? home : '—'} – ${hasAway ? away : '—'}`;
}

function getPreviousScore(entry) {
  return (
    entry?.previous_result ||
    entry?.old_result ||
    entry?.before?.result ||
    formatScore(
      entry?.previous_home_score ??
        entry?.old_home_score ??
        entry?.before?.home_score,
      entry?.previous_away_score ??
        entry?.old_away_score ??
        entry?.before?.away_score
    )
  );
}

function getNewScore(entry) {
  return (
    entry?.new_result ||
    entry?.result ||
    entry?.after?.result ||
    entry?.official?.result ||
    formatScore(
      entry?.new_home_score ??
        entry?.home_score ??
        entry?.after?.home_score ??
        entry?.official?.home_score,
      entry?.new_away_score ??
        entry?.away_score ??
        entry?.after?.away_score ??
        entry?.official?.away_score
    )
  );
}

function getUserLabel(entry) {
  return (
    entry?.user_name ||
    entry?.created_by_name ||
    entry?.actor_name ||
    entry?.performed_by ||
    entry?.user?.name ||
    'Sistema StickPro'
  );
}

function getSourceLabel(entry) {
  const source =
    entry?.source ||
    entry?.origin ||
    entry?.provider ||
    entry?.metadata?.source;

  if (!source) return null;

  return String(source).toUpperCase();
}

function AuditEntryCard({ entry, isLast }) {
  const action =
    entry?.action ||
    entry?.event_type ||
    entry?.type ||
    'unknown';

  const config =
    ACTION_CONFIG[action] || {
      label:
        entry?.title ||
        entry?.label ||
        'Alteração registada',
      description:
        entry?.description ||
        entry?.message ||
        'Foi registada uma alteração nos dados do jogo.',
      icon: History,
      badgeClass:
        'border-slate-200 bg-slate-50 text-slate-700',
      iconClass: 'bg-slate-100 text-slate-700',
    };

  const Icon = config.icon;
  const previousScore = getPreviousScore(entry);
  const newScore = getNewScore(entry);
  const source = getSourceLabel(entry);
  const user = getUserLabel(entry);

  return (
    <div className="relative flex gap-4">
      {!isLast && (
        <div className="absolute bottom-[-20px] left-[23px] top-12 w-px bg-slate-200" />
      )}

      <div
        className={[
          'relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
          config.iconClass,
        ].join(' ')}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-base font-semibold text-slate-950">
                {config.label}
              </h3>

              <Badge
                variant="outline"
                className={config.badgeClass}
              >
                {action}
              </Badge>
            </div>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {entry?.description ||
                entry?.message ||
                config.description}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400">
            <Clock3 className="h-3.5 w-3.5" />
            {formatAuditDate(getEntryDate(entry))}
          </div>
        </div>

        {(previousScore || newScore) && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Resultado anterior
              </p>

              <p className="mt-1 font-heading text-xl font-bold text-slate-700">
                {previousScore || '—'}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                Novo resultado
              </p>

              <p className="mt-1 font-heading text-xl font-bold text-emerald-900">
                {newScore || '—'}
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5" />
            {user}
          </span>

          {source && (
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Fonte: {source}
            </span>
          )}

          {entry?.resolution && (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {entry.resolution}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MatchAuditHistoryPanel({
  matchId,
}) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(
    async ({ silent = false } = {}) => {
      if (!matchId) {
        setEntries([]);
        setLoading(false);
        return;
      }

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response =
          await championshipsApi.getMatchAuditHistory(
            matchId
          );

        const normalized =
          normalizeEntries(response.data);

        const sorted = [...normalized].sort(
          (a, b) =>
            new Date(getEntryDate(b) || 0) -
            new Date(getEntryDate(a) || 0)
        );

        setEntries(sorted);
      } catch (error) {
        console.error(
          'Erro ao carregar histórico do jogo:',
          error
        );

        setEntries([]);

        const detail =
          error?.response?.data?.detail;

        toast.error(
          typeof detail === 'string'
            ? detail
            : 'Não foi possível carregar o histórico do jogo.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [matchId]
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const summary = useMemo(() => {
    const conflicts = entries.filter(
      (entry) =>
        (entry.action ||
          entry.event_type ||
          entry.type) === 'conflict_detected'
    ).length;

    const manualChanges = entries.filter(
      (entry) =>
        (entry.action ||
          entry.event_type ||
          entry.type) === 'result_manual_update'
    ).length;

    return {
      total: entries.length,
      conflicts,
      manualChanges,
    };
  }, [entries]);

  return (
    <Card className="overflow-hidden rounded-3xl border-slate-200/80 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white via-cyan-50/40 to-emerald-50/40 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <History className="h-5 w-5" />
            </span>

            <div>
              <CardTitle className="font-heading text-xl font-semibold tracking-tight text-slate-950">
                Histórico e auditoria
              </CardTitle>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Consulte sincronizações, conflitos e alterações
                efetuadas nos dados do jogo.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-fit rounded-xl"
            onClick={() =>
              loadHistory({ silent: true })
            }
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}

            Atualizar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />

              <p className="mt-3 text-sm text-slate-500">
                A carregar histórico…
              </p>
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm">
              <History className="h-7 w-7" />
            </span>

            <h3 className="mt-4 font-heading text-lg font-semibold text-slate-950">
              Ainda não existe histórico
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              As futuras importações, conflitos e alterações
              manuais serão apresentados nesta área.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Registos
                </p>
                <p className="mt-1 font-heading text-2xl font-bold text-slate-950">
                  {summary.total}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-amber-600">
                  Conflitos
                </p>
                <p className="mt-1 font-heading text-2xl font-bold text-amber-900">
                  {summary.conflicts}
                </p>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-blue-600">
                  Alterações manuais
                </p>
                <p className="mt-1 font-heading text-2xl font-bold text-blue-900">
                  {summary.manualChanges}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {entries.map((entry, index) => (
                <AuditEntryCard
                  key={
                    entry.id ||
                    entry._id ||
                    `${getEntryDate(entry)}-${index}`
                  }
                  entry={entry}
                  isLast={index === entries.length - 1}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
