import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
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

const FIELD_LABELS = {
  goals: 'Golos',
  assists: 'Assistências',
  saves: 'Defesas',
  penalties_scored: 'Penáltis convertidos',
  penalties_missed: 'Penáltis falhados',
  free_kicks_scored: 'Livres diretos convertidos',
  free_kicks_missed: 'Livres diretos falhados',
  yellow_cards: 'Cartões amarelos',
  blue_cards: 'Cartões azuis',
  red_cards: 'Cartões vermelhos',
};

export default function TimelineSyncPanel({
  matchId,
  canEdit = false,
  refreshKey = 0,
  onSynced,
}) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadPreview = async () => {
    if (!matchId) return;

    setLoading(true);

    try {
      const response =
        await championshipsApi.getMatchTimelineSyncPreview(
          matchId
        );

      setPreview(response.data);
    } catch (error) {
      console.error('Timeline sync preview error:', error);
      toast.error(
        error.response?.data?.detail
        || 'Erro ao analisar a sincronização'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, refreshKey]);

  const applySync = async () => {
    setSyncing(true);

    try {
      await championshipsApi.applyMatchTimelineSync(matchId);

      toast.success(
        'Resultado e estatísticas sincronizados'
      );

      await loadPreview();

      if (onSynced) {
        await onSynced();
      }
    } catch (error) {
      console.error('Timeline sync error:', error);
      toast.error(
        error.response?.data?.detail
        || 'Erro ao sincronizar a timeline'
      );
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card className="rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <CardContent className="flex min-h-[140px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!preview) {
    return null;
  }

  const hasChanges =
    preview.score_has_changes
    || preview.players_with_changes > 0;

  const changedPlayers = (
    preview.player_changes || []
  ).filter((item) => item.has_changes);

  return (
    <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-cyan-50/50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 font-heading text-xl font-semibold tracking-tight">
              <RefreshCw className="h-5 w-5 text-primary" />
              Sincronização da Timeline
            </CardTitle>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Compare os dados atuais com os acontecimentos
              registados antes de aplicar alterações.
            </p>
          </div>

          <Badge
            variant="outline"
            className={
              hasChanges
                ? 'w-fit border-amber-200 bg-amber-50 text-amber-700'
                : 'w-fit border-emerald-200 bg-emerald-50 text-emerald-700'
            }
          >
            {hasChanges ? (
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            )}

            {hasChanges
              ? 'Alterações encontradas'
              : 'Dados alinhados'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Acontecimentos
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-950">
              {preview.timeline_events_count}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Resultado atual
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-950">
              {preview.current_score.home}
              {' - '}
              {preview.current_score.away}
            </p>
          </div>

          <div className="rounded-2xl bg-cyan-50 p-4">
            <p className="text-xs uppercase tracking-wide text-cyan-700">
              Resultado da timeline
            </p>

            <p className="mt-1 text-2xl font-bold text-cyan-950">
              {preview.timeline_score.home}
              {' - '}
              {preview.timeline_score.away}
            </p>
          </div>
        </div>

        {changedPlayers.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />

              <h3 className="font-semibold text-slate-950">
                Alterações por atleta
              </h3>
            </div>

            <div className="space-y-3">
              {changedPlayers.map((item) => (
                <div
                  key={item.player_id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                >
                  <p className="font-semibold text-slate-950">
                    {item.player_name}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(item.changes).map(
                      ([field, values]) => (
                        <Badge
                          key={field}
                          variant="outline"
                          className="border-slate-200 bg-white text-slate-700"
                        >
                          {FIELD_LABELS[field] || field}
                          {': '}
                          {values.current}
                          {' → '}
                          {values.timeline}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {preview.warnings?.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-800">
              Verificações necessárias
            </p>

            <ul className="mt-2 space-y-1 text-sm text-amber-700">
              {preview.warnings.map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

            <p className="text-sm leading-6 text-cyan-950">
              A sincronização substitui apenas os campos
              calculáveis pela timeline. A seleção do cinco
              inicial e os restantes dados manuais são preservados.
            </p>
          </div>

          {canEdit && (
            <Button
              type="button"
              className="shrink-0 rounded-xl"
              disabled={
                syncing
                || preview.timeline_events_count === 0
                || !hasChanges
              }
              onClick={applySync}
            >
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}

              Sincronizar dados
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
