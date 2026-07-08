import { AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';

function InfoLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold">{value}</span>
    </div>
  );
}

export default function StatusCard({
  match,
  team,
  status,
  setStatus,
  canEdit,
  startingFive,
  bench,
  captainId,
  viceCaptainId,
  goalkeeperStartingId,
  goalkeeperBenchId,
  selectedPlayers,
  alerts,
  exists,
  updatedAt,
}) {
  const captain = selectedPlayers.find((player) => player.id === captainId);
  const viceCaptain = selectedPlayers.find((player) => player.id === viceCaptainId);
  const goalkeeperStarting = selectedPlayers.find(
    (player) => player.id === goalkeeperStartingId
  );
  const goalkeeperBench = selectedPlayers.find(
    (player) => player.id === goalkeeperBenchId
  );

  const getPlayerName = (player) => player?.name || '-';

  return (
    <Card className="border-white/70 bg-white/90 shadow-lg shadow-slate-200/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-xl">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Estado e validação
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <InfoLine label="Equipa" value={team?.name || '-'} />

        <InfoLine
          label="Jogo"
          value={`${team?.name || 'Equipa'} vs ${match?.opponent_team || 'Adversário'}`}
        />

        <InfoLine
          label="5 Inicial"
          value={`${startingFive.length}/5`}
        />

        <InfoLine
          label="Banco"
          value={bench.length}
        />

        <InfoLine
          label="Capitão"
          value={getPlayerName(captain)}
        />

        <InfoLine
          label="Sub-capitão"
          value={getPlayerName(viceCaptain)}
        />

        <InfoLine
          label="GR Titular"
          value={getPlayerName(goalkeeperStarting)}
        />

        <InfoLine
          label="GR Suplente"
          value={getPlayerName(goalkeeperBench)}
        />

        {canEdit && (
          <div className="space-y-2">
            <Label>Estado</Label>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="draft">Rascunho</option>
              <option value="prepared">Preparado</option>
              <option value="confirmed">Confirmado</option>
              <option value="official">Oficial</option>
              <option value="archived">Arquivado</option>
            </select>
          </div>
        )}

        {exists && updatedAt && (
          <p className="text-xs text-muted-foreground">
            Última gravação:{' '}
            {new Date(updatedAt).toLocaleString('pt-PT')}
          </p>
        )}

        <div className="space-y-2 pt-2">
          {alerts.length > 0 ? (
            alerts.map((alert, index) => (
              <div
                key={index}
                className={`rounded-xl border p-3 text-sm ${
                  alert.level === 'danger'
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : alert.level === 'warning'
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-cyan-200 bg-cyan-50 text-cyan-800'
                }`}
              >
                {alert.text}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Plano de Jogo válido.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
