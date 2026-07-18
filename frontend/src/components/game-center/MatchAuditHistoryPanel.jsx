import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertTriangle,
  CheckCircle2,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
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

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

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
    return (
      action === 'result_manual_update'
    );
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

function formatScore(data) {
  const home =
    data?.home_score ??
    data?.score_home ??
    data?.homeScore;

  const away =
    data?.away_score ??
    data?.score_away ??
    data?.awayScore;

  const hasHome =
    home !== undefined &&
    home !== null &&
    home !== '';

  const hasAway =
    away !== undefined &&
    away !== null &&
    away !== '';

  if (!hasHome && !hasAway) {
    return '—';
  }

  return `${hasHome ? home : '—'} – ${
    hasAway ? away : '—'
  }`;
}

export default function MatchAuditHistoryPanel({
  matchId,
}) {
  const [entries, setEntries] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [activeFilter, setActiveFilter] =
    useState('all');

  const [
    selectedConflict,
    setSelectedConflict,
  ] = useState(null);

  const [
    selectedDecision,
    setSelectedDecision,
  ] = useState(null);

  const [
    resolvingConflictId,
    setResolvingConflictId,
  ] = useState(null);

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
          normalizeAuditEntries(
            response.data
          );

        const sorted = [
          ...normalized,
        ].sort(
          (a, b) =>
            new Date(
              getAuditDate(b) || 0
            ) -
            new Date(
              getAuditDate(a) || 0
            )
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

    const pendingConflicts =
      entries.filter((entry) => {
        const resolution =
          entry?.metadata?.resolution ||
          entry?.resolution;

        return (
          getAuditAction(entry) ===
            'conflict_detected' &&
          (!resolution ||
            resolution === 'pending')
        );
      }).length;

    const manualChanges =
      entries.filter(
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
        matchesFilter(
          entry,
          activeFilter
        )
      ),
    [entries, activeFilter]
  );

  const selectedConflictId =
    selectedConflict?.id ||
    selectedConflict?._id ||
    null;

  const currentScore = formatScore(
    selectedConflict?.previous_data
  );

  const officialScore = formatScore(
    selectedConflict?.new_data
  );

  const openResolutionDialog =
    useCallback((entry, decision) => {
      setSelectedConflict(entry);
      setSelectedDecision(decision);
    }, []);

  const closeResolutionDialog =
    useCallback(() => {
      if (resolvingConflictId) {
        return;
      }

      setSelectedConflict(null);
      setSelectedDecision(null);
    }, [resolvingConflictId]);

  const handleResolveConflict =
    useCallback(async () => {
      if (
        !matchId ||
        !selectedConflictId ||
        !selectedDecision
      ) {
        return;
      }

      setResolvingConflictId(
        selectedConflictId
      );

      try {
        const response =
          await championshipsApi.resolveMatchAuditConflict(
            matchId,
            selectedConflictId,
            selectedDecision
          );

        const message =
          response?.data?.message;

        toast.success(
          message ||
            (selectedDecision ===
            'official'
              ? 'Resultado oficial aplicado com sucesso.'
              : 'Resultado atual mantido com sucesso.')
        );

        setSelectedConflict(null);
        setSelectedDecision(null);

        await loadHistory({
          silent: true,
        });
      } catch (error) {
        console.error(
          'Erro ao resolver conflito:',
          error
        );

        const detail =
          error?.response?.data?.detail;

        if (
          detail &&
          typeof detail === 'object'
        ) {
          toast.error(
            detail.message ||
              detail.detail ||
              'Não foi possível resolver o conflito.'
          );
        } else {
          toast.error(
            typeof detail === 'string'
              ? detail
              : 'Não foi possível resolver o conflito.'
          );
        }

        if (
          error?.response?.status === 409
        ) {
          setSelectedConflict(null);
          setSelectedDecision(null);

          await loadHistory({
            silent: true,
          });
        }
      } finally {
        setResolvingConflictId(null);
      }
    }, [
      loadHistory,
      matchId,
      selectedConflictId,
      selectedDecision,
    ]);

  const isResolving =
    Boolean(resolvingConflictId);

  const applyingOfficial =
    selectedDecision === 'official';

  return (
    <>
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
                  Consulte sincronizações,
                  conflitos e alterações
                  efetuadas nos dados do jogo.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-fit rounded-xl"
              onClick={() =>
                loadHistory({
                  silent: true,
                })
              }
              disabled={
                refreshing || isResolving
              }
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
                    {
                      summary.pendingConflicts
                    }
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

              {summary.pendingConflicts >
                0 && (
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      Existem conflitos por
                      resolver
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-700">
                      Consulte os resultados
                      atual e oficial antes de
                      decidir qual deverá
                      prevalecer.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                {FILTERS.map(
                  (filter) => {
                    const active =
                      activeFilter ===
                      filter.value;

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
                          setActiveFilter(
                            filter.value
                          )
                        }
                      >
                        {filter.label}
                      </Button>
                    );
                  }
                )}
              </div>

              <div className="mt-6">
                {filteredEntries.length >
                0 ? (
                  <MatchAuditTimeline
                    entries={
                      filteredEntries
                    }
                    onResolveConflict={
                      openResolutionDialog
                    }
                    resolvingConflictId={
                      resolvingConflictId
                    }
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

      <AlertDialog
        open={Boolean(
          selectedConflict &&
            selectedDecision
        )}
        onOpenChange={(open) => {
          if (!open) {
            closeResolutionDialog();
          }
        }}
      >
        <AlertDialogContent className="max-w-lg rounded-3xl bg-white">
          <AlertDialogHeader>
            <div
              className={[
                'mb-2 flex h-12 w-12 items-center justify-center rounded-2xl',
                applyingOfficial
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-blue-100 text-blue-700',
              ].join(' ')}
            >
              {applyingOfficial ? (
                <ShieldCheck className="h-6 w-6" />
              ) : (
                <CheckCircle2 className="h-6 w-6" />
              )}
            </div>

            <AlertDialogTitle className="font-heading text-xl text-slate-950">
              {applyingOfficial
                ? 'Aplicar resultado oficial?'
                : 'Manter resultado atual?'}
            </AlertDialogTitle>

            <AlertDialogDescription className="text-sm leading-6 text-slate-600">
              Esta decisão ficará registada
              permanentemente no histórico de
              auditoria do jogo.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div
              className={[
                'rounded-2xl border px-4 py-3',
                !applyingOfficial
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-slate-200 bg-slate-50',
              ].join(' ')}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Resultado atual
              </p>

              <p className="mt-1 font-heading text-2xl font-bold text-slate-950">
                {currentScore}
              </p>
            </div>

            <div
              className={[
                'rounded-2xl border px-4 py-3',
                applyingOfficial
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-slate-200 bg-slate-50',
              ].join(' ')}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Resultado oficial
              </p>

              <p className="mt-1 font-heading text-2xl font-bold text-slate-950">
                {officialScore}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

              <p className="text-sm leading-6 text-amber-900">
                {applyingOfficial
                  ? 'O resultado oficial será aplicado ao jogo e poderá atualizar o calendário, a classificação e os restantes dados associados.'
                  : 'O resultado atual será mantido e o resultado oficial ficará registado apenas como referência no histórico.'}
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isResolving}
              className="rounded-xl"
            >
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              type="button"
              disabled={isResolving}
              onClick={(event) => {
                event.preventDefault();
                handleResolveConflict();
              }}
              className="rounded-xl"
            >
              {isResolving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A processar…
                </>
              ) : applyingOfficial ? (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Aplicar resultado oficial
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Manter resultado atual
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
