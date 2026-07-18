import {
  useCallback,
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

import MatchAuditTimeline from '../audit/MatchAuditTimeline';
import { championshipsApi } from '../../services/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

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

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

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

export default function MatchAuditHistoryDialog({
  open,
  onOpenChange,
  match,
  entries = [],
  loading = false,
  onRefresh,
}) {
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

  const matchId =
    match?.id ||
    match?._id ||
    match?.match_id ||
    null;

  const homeTeam =
    match?.home_team ||
    match?.team_name ||
    'Equipa da casa';

  const awayTeam =
    match?.away_team ||
    match?.opponent_team ||
    'Equipa visitante';

  const pendingConflicts = useMemo(
    () =>
      entries.filter((entry) => {
        const action =
          entry?.action ||
          entry?.event_type ||
          entry?.type;

        const resolution =
          entry?.metadata?.resolution ||
          entry?.resolution;

        return (
          action === 'conflict_detected' &&
          (!resolution ||
            resolution === 'pending')
        );
      }).length,
    [entries]
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

  const isResolving =
    Boolean(resolvingConflictId);

  const applyingOfficial =
    selectedDecision === 'official';

  const openResolutionDialog =
    useCallback((entry, decision) => {
      setSelectedConflict(entry);
      setSelectedDecision(decision);
    }, []);

  const closeResolutionDialog =
    useCallback(() => {
      if (isResolving) {
        return;
      }

      setSelectedConflict(null);
      setSelectedDecision(null);
    }, [isResolving]);

  const handleResolveConflict =
    useCallback(async () => {
      if (
        !matchId ||
        !selectedConflictId ||
        !selectedDecision
      ) {
        toast.error(
          'Não foi possível identificar o jogo ou o conflito.'
        );
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

        if (onRefresh) {
          await onRefresh();
        }
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
          error?.response?.status === 409 &&
          onRefresh
        ) {
          setSelectedConflict(null);
          setSelectedDecision(null);

          await onRefresh();
        }
      } finally {
        setResolvingConflictId(null);
      }
    }, [
      matchId,
      onRefresh,
      selectedConflictId,
      selectedDecision,
    ]);

  const handleMainDialogChange =
    useCallback(
      (nextOpen) => {
        if (
          !nextOpen &&
          isResolving
        ) {
          return;
        }

        if (!nextOpen) {
          setSelectedConflict(null);
          setSelectedDecision(null);
        }

        onOpenChange(nextOpen);
      },
      [
        isResolving,
        onOpenChange,
      ]
    );

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={
          handleMainDialogChange
        }
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl bg-white sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 pr-8">
              <div>
                <DialogTitle className="flex items-center gap-2 font-heading text-xl tracking-tight">
                  <History className="h-5 w-5 text-primary" />

                  Histórico de sincronizações
                </DialogTitle>

                <DialogDescription className="mt-1">
                  {homeTeam} vs {awayTeam}
                </DialogDescription>
              </div>

              {!loading &&
                entries.length > 0 && (
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge
                      variant="outline"
                      className="border-cyan-200 bg-cyan-50 text-cyan-700"
                    >
                      {entries.length}{' '}
                      {entries.length === 1
                        ? 'registo'
                        : 'registos'}
                    </Badge>

                    {pendingConflicts >
                      0 && (
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50 text-amber-700"
                      >
                        {
                          pendingConflicts
                        }{' '}
                        {pendingConflicts ===
                        1
                          ? 'pendente'
                          : 'pendentes'}
                      </Badge>
                    )}
                  </div>
                )}
            </div>
          </DialogHeader>

          <div className="py-4">
            {loading ? (
              <div className="flex min-h-56 flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />

                <p className="text-sm text-slate-500">
                  A carregar histórico…
                </p>
              </div>
            ) : (
              <MatchAuditTimeline
                entries={entries}
                compact
                onResolveConflict={
                  openResolutionDialog
                }
                resolvingConflictId={
                  resolvingConflictId
                }
              />
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onRefresh}
              disabled={
                loading ||
                isResolving ||
                !onRefresh
              }
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}

              Atualizar
            </Button>

            <Button
              type="button"
              onClick={() =>
                handleMainDialogChange(
                  false
                )
              }
              disabled={isResolving}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(
          selectedConflict &&
            selectedDecision
        )}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
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
              Esta decisão ficará
              permanentemente registada no
              histórico de auditoria do jogo.
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
                  : 'O resultado atual será mantido e o resultado oficial continuará disponível como referência no histórico.'}
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
