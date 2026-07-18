import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertTriangle,
  History,
  Loader2,
  RefreshCw,
} from 'lucide-react';

import { toast } from 'sonner';

import {
  getAuditAction,
  getAuditDate,
  normalizeAuditEntries,
} from '../audit/MatchAuditTimeline';

import MatchAuditTimeline from '../audit/MatchAuditTimeline';
import { championshipsApi } from '../../services/api';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';

const FILTERS = [
  {
    value: 'all',
    label: 'Todos',
  },
  {
    value: 'conflicts',
    label: 'Conflitos',
  },
  {
    value: 'manual',
    label: 'Alterações manuais',
  },
  {
    value: 'imports',
    label: 'Importações',
  },
  {
    value: 'sync',
    label: 'Sincronizações',
  },
];

function matchesFilter(entry, filter) {
  if (filter === 'all') return true;

  const action = getAuditAction(entry);

  if (filter === 'conflicts') {
    return (
      action === 'conflict_detected' ||
      action === 'conflict_resolved'
    );
  }

  if (filter === 'manual') {
    return action === 'result_manual_update';
  }

  if (filter === 'imports') {
    return [
      'gamesheet_imported',
      'gamesheet_synced',
      'imported',
    ].includes(action);
  }

  if (filter === 'sync') {
    return [
      'gamesheet_updated',
      'sync_updated',
      'timeline_synced',
      'official_result_applied',
    ].includes(action);
  }

  return true;
}

export default function MatchAuditHistoryPanel({
  matchId,
}) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [activeFilter, setActiveFilter] =
    useState('all');

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
          normalizeAuditEntries(response.data);

        const sorted = [...normalized].sort(
          (a, b) =>
            new Date(getAuditDate(b) || 0) -
            new Date(getAuditDate(a) || 0)
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
        getAuditAction(entry) ===
        'conflict_detected'
    ).length;

    const pendingConflicts = entries.filter(
      (entry) => {
        const resolution =
          entry?.metadata?.resolution ||
          entry?.resolution;

        return (
          getAuditAction(entry) ===
            'conflict_detected' &&
          (!resolution ||
            resolution === 'pending')
        );
      }
    ).length;

    const manualChanges = entries.filter(
      (entry) =>
        getAuditAction(entry) ===
        'result_manual_update'
    ).length;

    return {
      total: entries.length,
      conflicts,
      pendingConflicts,
      manualChanges,
    };
  }, [entries]);

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) =>
        matchesFilter(entry, activeFilter)
      ),
    [entries, activeFilter]
  );

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
                Consulte sincronizações, conflitos e
                alterações efetuadas nos dados do jogo.
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
          <MatchAuditTimeline
            entries={[]}
            emptyTitle="Ainda não existe histórico"
            emptyDescription="As futuras importações, conflitos e alterações manuais serão apresentados nesta área."
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-red-600">
                  Pendentes
                </p>

                <p className="mt-1 font-heading text-2xl font-bold text-red-900">
                  {summary.pendingConflicts}
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

            {summary.pendingConflicts > 0 && (
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Existem conflitos por resolver
                  </p>

                  <p className="mt-1 text-sm leading-6 text-amber-700">
                    Consulte os resultados atual e oficial
                    antes de decidir qual deverá prevalecer.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              {FILTERS.map((filter) => {
                const active =
                  activeFilter === filter.value;

                return (
                  <Button
                    key={filter.value}
                    type="button"
                    size="sm"
                    variant={
                      active
                        ? 'default'
                        : 'outline'
                    }
                    className="rounded-xl"
                    onClick={() =>
                      setActiveFilter(filter.value)
                    }
                  >
                    {filter.label}
                  </Button>
                );
              })}
            </div>

            <div className="mt-6">
              {filteredEntries.length > 0 ? (
                <MatchAuditTimeline
                  entries={filteredEntries}
                />
              ) : (
                <MatchAuditTimeline
                  entries={[]}
                  emptyTitle="Sem registos neste filtro"
                  emptyDescription="Não existem entradas correspondentes ao tipo de histórico selecionado."
                />
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
