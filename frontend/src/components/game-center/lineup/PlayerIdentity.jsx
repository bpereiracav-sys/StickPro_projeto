import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { getInitials } from '../../../lib/utils';
import { getJerseyNumber, getPlayerName, isGoalkeeper } from './lineupUtils';

export default function PlayerIdentity({ player, extraBadges = null }) {
  const name = getPlayerName(player);
  const jersey = getJerseyNumber(player);
  const goalkeeper = isGoalkeeper(player);

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-primary text-xs text-primary-foreground">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-slate-950">{name}</p>
          <Badge variant="outline" className="text-xs">#{jersey}</Badge>
          {goalkeeper && (
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
              GR
            </Badge>
          )}
          {extraBadges}
        </div>
      </div>
    </div>
  );
}
