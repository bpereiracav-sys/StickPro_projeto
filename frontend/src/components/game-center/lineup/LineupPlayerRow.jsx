import {
  ArrowDown,
  ArrowUp,
  Crown,
  Goal,
  Star,
} from 'lucide-react';

import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

import PlayerIdentity from './PlayerIdentity';
import { isGoalkeeper } from './lineupUtils';

export default function LineupPlayerRow({
  label,
  player,
  canEdit,

  captainId,
  viceCaptainId,

  goalkeeperStartingId,
  goalkeeperBenchId,

  onMoveUp,
  onMoveDown,

  onRemove,

  onSetCaptain,
  onSetViceCaptain,

  onSetGoalkeeperStarting,
  onSetGoalkeeperBench,
}) {
  const extraBadges = (
    <>
      {captainId === player.id && (
        <Badge className="bg-amber-100 text-amber-700">
          Capitão
        </Badge>
      )}

      {viceCaptainId === player.id && (
        <Badge className="bg-yellow-100 text-yellow-700">
          Sub-capitão
        </Badge>
      )}

      {goalkeeperStartingId === player.id && (
        <Badge className="bg-blue-100 text-blue-700">
          GR Titular
        </Badge>
      )}

      {goalkeeperBenchId === player.id && (
        <Badge className="bg-cyan-100 text-cyan-700">
          GR Suplente
        </Badge>
      )}
    </>
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">

      <div className="mb-2 flex items-center justify-between">

        <Badge variant="outline">
          {label}
        </Badge>

        {canEdit && (
          <div className="flex gap-1">

            <Button
              size="icon"
              variant="outline"
              onClick={onMoveUp}
            >
              <ArrowUp className="h-4 w-4"/>
            </Button>

            <Button
              size="icon"
              variant="outline"
              onClick={onMoveDown}
            >
              <ArrowDown className="h-4 w-4"/>
            </Button>

          </div>
        )}

      </div>

      <PlayerIdentity
        player={player}
        extraBadges={extraBadges}
      />

      {canEdit && (

        <div className="mt-3 flex flex-wrap gap-2">

          <Button
            size="sm"
            variant="ghost"
            onClick={onSetCaptain}
          >
            <Crown className="mr-1 h-4 w-4"/>
            Capitão
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onSetViceCaptain}
          >
            <Star className="mr-1 h-4 w-4"/>
            Sub
          </Button>

          {isGoalkeeper(player) && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={onSetGoalkeeperStarting}
              >
                <Goal className="mr-1 h-4 w-4"/>
                GR Titular
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={onSetGoalkeeperBench}
              >
                <Goal className="mr-1 h-4 w-4"/>
                GR Suplente
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={onRemove}
          >
            Remover
          </Button>

        </div>

      )}

    </div>
  );
}
