import {
  ArrowDown,
  ArrowUp,
  Target,
  Trash2,
  Zap,
} from 'lucide-react';

import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';

import { getJerseyNumber, getPlayerName } from './lineupUtils';

function SpecialistSelect({ label, value, players, disabled, onChange }) {
  const selectedPlayer = players.find((player) => player.id === value);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <Label className="text-sm font-semibold">{label}</Label>

      <select
        value={value || ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value || null)}
        className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">Não definido</option>
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            #{getJerseyNumber(player)} {getPlayerName(player)}
          </option>
        ))}
      </select>

      {selectedPlayer && (
        <p className="mt-2 text-xs text-muted-foreground">
          Selecionado: #{getJerseyNumber(selectedPlayer)} {getPlayerName(selectedPlayer)}
        </p>
      )}
    </div>
  );
}

function OrderEditor({ title, icon, players, order, canEdit, onAdd, onRemove, onMove }) {
  const remaining = players.filter((player) => !order.includes(player.id));

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </div>

      <div className="space-y-2">
        {order.length > 0 ? (
          order.map((playerId, index) => {
            const player = players.find((item) => item.id === playerId);
            if (!player) return null;

            return (
              <div
                key={playerId}
                className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm"
              >
                <span>
                  {index + 1}. #{getJerseyNumber(player)} {getPlayerName(player)}
                </span>

                {canEdit && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => onMove(playerId, 'up')}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>

                    <Button size="icon" variant="ghost" onClick={() => onMove(playerId, 'down')}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>

                    <Button size="icon" variant="ghost" onClick={() => onRemove(playerId)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">Sem jogadores definidos.</p>
        )}
      </div>

      {canEdit && remaining.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {remaining.map((player) => (
            <Button
              key={player.id}
              size="sm"
              variant="outline"
              onClick={() => onAdd(player.id)}
            >
              + #{getJerseyNumber(player)}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SpecialistsCard({
  selectedPlayers,
  penaltyOrder,
  freeKickOrder,
  penaltyMainId,
  freeKickMainId,
  ballCenterId,
  lastFreeKickId,
  timeoutLeaderId,
  setPenaltyMainId,
  setFreeKickMainId,
  setBallCenterId,
  setLastFreeKickId,
  setTimeoutLeaderId,
  canEdit,
  onAddToPenalty,
  onAddToFreeKick,
  onRemovePenalty,
  onRemoveFreeKick,
  onMovePenalty,
  onMoveFreeKick,
}) {
  return (
    <Card className="border-white/70 bg-white/90 shadow-lg shadow-slate-200/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-xl">
          <Target className="h-5 w-5 text-primary" />
          Especialistas
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <SpecialistSelect
          label="Penálti principal"
          value={penaltyMainId}
          players={selectedPlayers}
          disabled={!canEdit}
          onChange={setPenaltyMainId}
        />

        <SpecialistSelect
          label="Livre direto principal"
          value={freeKickMainId}
          players={selectedPlayers}
          disabled={!canEdit}
          onChange={setFreeKickMainId}
        />

        <SpecialistSelect
          label="Bola ao centro"
          value={ballCenterId}
          players={selectedPlayers}
          disabled={!canEdit}
          onChange={setBallCenterId}
        />

        <SpecialistSelect
          label="Último livre"
          value={lastFreeKickId}
          players={selectedPlayers}
          disabled={!canEdit}
          onChange={setLastFreeKickId}
        />

        <SpecialistSelect
          label="Time-out"
          value={timeoutLeaderId}
          players={selectedPlayers}
          disabled={!canEdit}
          onChange={setTimeoutLeaderId}
        />

        <OrderEditor
          title="Ordem de penáltis"
          icon={<Target className="h-4 w-4" />}
          players={selectedPlayers}
          order={penaltyOrder}
          canEdit={canEdit}
          onAdd={onAddToPenalty}
          onRemove={onRemovePenalty}
          onMove={onMovePenalty}
        />

        <OrderEditor
          title="Ordem de livres diretos"
          icon={<Zap className="h-4 w-4" />}
          players={selectedPlayers}
          order={freeKickOrder}
          canEdit={canEdit}
          onAdd={onAddToFreeKick}
          onRemove={onRemoveFreeKick}
          onMove={onMoveFreeKick}
        />
      </CardContent>
    </Card>
  );
}
