import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

import PlayerIdentity from './PlayerIdentity';
import { isGoalkeeper } from './lineupUtils';

export default function PlayerCard({
  player,
  canEdit,
  onAddStarter,
  onAddBench,
}) {
  const goalkeeper = isGoalkeeper(player);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <PlayerIdentity player={player} />

      {canEdit && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onAddStarter}
          >
            5 Inicial
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onAddBench}
          >
            Banco
          </Button>

          {goalkeeper && (
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
              GR disponível
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
