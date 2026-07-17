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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

function getAuditConfig(action = '') {
  switch (action) {
    case 'conflict_detected':
      return {
        label: 'Conflito detetado',
        icon: AlertTriangle,
        iconClassName: 'bg-amber-100 text-amber-700',
        badgeClassName:
          'border-amber-200 bg-amber-50 text-amber-700',
      };

    case 'result_manual_update':
      return {
        label: 'Resultado alterado manualmente',
        icon: Pencil,
        iconClassName: 'bg-blue-100 text-blue-700',
        badgeClassName:
          'border-blue-200 bg-blue-50 text-blue-700',
      };

    case 'official_result_applied':
    case 'conflict_resolved':
      return {
        label: 'Resultado oficial aplicado',
        icon: ShieldCheck,
        iconClassName: 'bg-emerald-100 text-emerald-700',
        badgeClassName:
          'border-emerald-200 bg-emerald-50 text-emerald-700',
      };

    case 'gamesheet_imported':
    case 'gamesheet_synced':
    case 'imported':
      return {
        label: 'Ficha oficial sincronizada',
        icon: FileCheck2,
        iconClassName: 'bg-emerald-100 text-emerald-700',
        badgeClassName:
          'border-emerald-200 bg-emerald-50 text-emerald-700',
      };

    case 'gamesheet_updated':
    case 'sync_updated':
      return {
        label: 'Ficha oficial atualizada',
        icon: RefreshCw,
        iconClassName: 'bg-cyan-100 text-cyan-700',
        badgeClassName:
          'border-cyan-200 bg-cyan-50 text-cyan-700',
      };

    default:
      return {
        label: 'Alteração registada',
        icon: History,
        iconClassName: 'bg-slate-100 text-slate-700',
        badgeClassName:
          'border-slate-200 bg-slate-50 text-slate-700',
      };
  }
}

function getSourceLabel(source) {
  if (!source) return 'StickPro';

  const normalizedSource = String(source).toLowerCase();

  if (normalizedSource === 'manual') {
    return 'Manual';
  }

  if (normalizedSource === 'apl') {
    return 'APL';
  }

  if (normalizedSource === 'fpp') {
    return 'FPP';
  }

  if (normalizedSource === 'system') {
    return 'Sistema';
  }

  return String(source).toUpperCase();
}

function getResolutionLabel(resolution) {
  if (!resolution) return null;

  switch (resolution) {
    case 'pending':
      return 'Resolução pendente';

    case 'official_applied':
      return 'Resultado oficial aplicado';

    case 'manual_kept':
      return 'Resultado atual mantido';

    case 'resolved':
      return 'Resolvido';

    default:
      return String(resolution);
  }
}

function formatAuditDate(value) {
  if (!value) return 'Data não disponível';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getScore(data) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  if (data.result) {
    return String(data.result);
  }

  const homeScore =
    data.home_score ??
    data.score_home ??
    data.homeScore;

  const awayScore =
    data.away_score ??
    data.score_away ??
    data.awayScore;

  if (
    homeScore === undefined ||
    homeScore === null ||
    awayScore === undefined ||
    awayScore === null
  ) {
    return null;
  }

  return `${homeScore} – ${awayScore}`;
}

function getUserName(entry) {
  return (
    entry?.user_name ||
    entry?.created_by_name ||
    entry?.actor_name ||
    entry?.metadata?.user_name ||
    (entry?.user_id ? 'Utilizador StickPro' : 'Sistema')
  );
}

function ScoreChange({ previousData, newData }) {
  const previousScore = getScore(previousData);
  const newScore = getScore(newData);

  if (!previousScore && !newScore) {
    return null;
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Anterior
        </p>

        <p className="mt-1 font-heading text-2xl font-bold text-slate-950">
          {previousScore || '—'}
        </p>
      </div>

      <div className="hidden text-slate-300 sm:block">
        →
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
          Novo
        </p>

        <p className="mt-1 font-heading text-2xl font-bold text-emerald-950">
          {newScore || '—'}
        </p>
      </div>
    </div>
  );
}

function AuditEntry({ entry, isLast }) {
  const config = getAuditConfig(entry?.action);
  const Icon = config.icon;

  const previousData =
    entry?.previous_data ||
    entry?.old_data ||
    entry?.before ||
    null;

  const newData =
    entry?.new_data ||
    entry?.updated_data ||
    entry?.after ||
    null;

  const resolution = getResolutionLabel(
    entry?.metadata?.resolution ||
      entry?.resolution
  );

  const source =
    entry?.source ||
    entry?.metadata?.source ||
    'system';

  return (
    <div className="relative flex gap-4">
      {!isLast && (
        <span className="absolute left-[21px] top-11 h-[calc(100%-24px)] w-px bg-slate-200" />
      )}

      <div
        className={[
          'relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
          config.iconClassName,
        ].join(' ')}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1 pb-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="font-heading text-base font-semibold text-slate-950">
                {entry?.summary || config.label}
              </h3>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatAuditDate(
                    entry?.created_at ||
                      entry?.timestamp ||
                      entry?.date
                  )}
                </span>

                <span className="inline-flex items-center gap-1">
                  <UserRound className="h-3.5 w-3.5" />
                  {getUserName(entry)}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Badge
                variant="outline"
                className={config.badgeClassName}
              >
                {config.label}
              </Badge>

              <Badge
                variant="outline"
                className="border-slate-200 bg-slate-50 text-slate-600"
              >
                {getSourceLabel(source)}
              </Badge>
            </div>
          </div>

          <ScoreChange
            previousData={previousData}
            newData={newData}
          />

          {resolution && (
            <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2 text-sm text-amber-800">
              {resolution}
            </div>
          )}

          {entry?.metadata?.official_match_url && (
            <p className="mt-3 break-all text-xs text-slate-500">
              Fonte oficial:{' '}
              {entry.metadata.official_match_url}
            </p>
          )}

          {entry?.details && (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {entry.details}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MatchAuditHistoryDialog({
  open,
  onOpenChange,
  match,
  entries = [],
  loading = false,
  onRefresh,
}) {
  const homeTeam =
    match?.home_team ||
    match?.team_name ||
    'Equipa da casa';

  const awayTeam =
    match?.away_team ||
    match?.opponent_team ||
    'Equipa visitante';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-2xl">
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

            {!loading && entries.length > 0 && (
              <Badge
                variant="outline"
                className="shrink-0 border-cyan-200 bg-cyan-50 text-cyan-700"
              >
                {entries.length}{' '}
                {entries.length === 1
                  ? 'registo'
                  : 'registos'}
              </Badge>
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
          ) : entries.length > 0 ? (
            <div>
              {entries.map((entry, index) => (
                <AuditEntry
                  key={
                    entry.id ||
                    `${entry.action}-${entry.created_at}-${index}`
                  }
                  entry={entry}
                  isLast={index === entries.length - 1}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <History className="h-7 w-7" />
              </div>

              <h3 className="mt-4 font-heading text-lg font-semibold text-slate-950">
                Ainda não existem registos
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                As importações oficiais, alterações manuais e
                conflitos deste jogo aparecerão aqui.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onRefresh}
            disabled={loading}
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
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
