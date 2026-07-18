import {
  History,
  Loader2,
  RefreshCw,
} from 'lucide-react';

import MatchAuditTimeline from '../audit/MatchAuditTimeline';
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
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
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
          ) : (
            <MatchAuditTimeline
              entries={entries}
              compact
            />
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
