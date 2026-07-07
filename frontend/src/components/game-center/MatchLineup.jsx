import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Crown,
  Goal,
  Save,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react';

import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { getInitials } from '../../lib/utils';

function getPlayerName(player) {
  return player?.name || 'Jogador';
}

function getJerseyNumber(player) {
  return (
    player?.profile?.sports_info?.jersey_number ||
    player?.profile?.jersey_number ||
    '-'
  );
}

function isGoalkeeper(player) {
  const position =
    player?.profile?.sports_info?.position ||
    player?.profile?.position ||
    '';

  return (
    position.toLowerCase().includes('gr') ||
    position.toLowerCase().includes('guarda') ||
    position.toLowerCase().includes('redes')
  );
}

function PlayerCard({
  player,
  selected,
  disabled,
  onAddStarter,
  onAddBench,
  onRemove,
  onSetCaptain,
  isCaptain,
}) {
  const name = getPlayerName(player);
  const jersey = getJerseyNumber(player);
  const goalkeeper = isGoalkeeper(player);

  return (
    <div
      className={`rounded-2xl border bg-white p-3 shadow-sm transition ${
        selected ? 'border-primary/30 bg-primary/5' : 'border-slate-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary text-xs text-primary-foreground">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-slate-950">{name}</p>

            <Badge variant="outline" className="text-xs">
              #{jersey}
            </Badge>

            {goalkeeper && (
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                GR
              </Badge>
            )}

            {isCaptain && (
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                Capitão
              </Badge>
            )}
          </div>
        </div>
      </div>

      {!disabled && (
        <div className="mt-3 flex flex-wrap gap-2">
          {onAddStarter && (
            <Button size="sm" variant="outline" onClick={() => onAddStarter(player)}>
              5 Inicial
            </Button>
          )}

          {onAddBench && (
            <Button size="sm" variant="outline" onClick={() => onAddBench(player)}>
              Banco
            </Button>
          )}

          {onSetCaptain && (
            <Button size="sm" variant="ghost" onClick={() => onSetCaptain(player.id)}>
              <Crown className="mr-1 h-3.5 w-3.5" />
              Capitão
            </Button>
          )}

          {onRemove && (
            <Button size="sm" variant="ghost" onClick={() => onRemove(player.id)}>
              Remover
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function LineupSlot({ label, player, canEdit, onMoveUp, onMoveDown, onRemove, onSetCaptain, isCaptain }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge variant="outline">{label}</Badge>

        {player && isCaptain && (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
            <Crown className="mr-1 h-3.5 w-3.5" />
            Capitão
          </Badge>
        )}
      </div>

      {player ? (
        <PlayerCard
          player={player}
          selected
          disabled={!canEdit}
          onRemove={canEdit ? onRemove : undefined}
          onSetCaptain={canEdit ? onSetCaptain : undefined}
          isCaptain={isCaptain}
        />
      ) : (
        <div className="flex min-h-[86px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-muted-foreground">
          Sem jogador
        </div>
      )}

      {canEdit && player && (
        <div className="mt-2 flex justify-end gap-2">
          <Button size="icon" variant="outline" onClick={onMoveUp}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" onClick={onMoveDown}>
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function MatchLineup({ match, team, members = [], canEdit }) {
  const [starters, setStarters] = useState([]);
  const [bench, setBench] = useState([]);
  const [captainId, setCaptainId] = useState(null);
  const [saved, setSaved] = useState(false);

  const availablePlayers = useMemo(() => {
    const selectedIds = new Set([
      ...starters.map((player) => player.id),
      ...bench.map((player) => player.id),
    ]);

    return members.filter((player) => !selectedIds.has(player.id));
  }, [members, starters, bench]);

  const goalkeeperStarters = starters.filter(isGoalkeeper);
  const fieldStarters = starters.filter((player) => !isGoalkeeper(player));

  const alerts = useMemo(() => {
    const result = [];

    if (starters.length < 5) {
      result.push(`Faltam ${5 - starters.length} jogador(es) para completar o 5 inicial.`);
    }

    if (starters.length > 5) {
      result.push('O 5 inicial tem mais de 5 jogadores.');
    }

    if (goalkeeperStarters.length === 0) {
      result.push('Ainda não foi escolhido guarda-redes titular.');
    }

    if (goalkeeperStarters.length > 1) {
      result.push('Existe mais do que um guarda-redes no 5 inicial.');
    }

    if (!captainId) {
      result.push('Ainda não foi definido capitão.');
    }

    return result;
  }, [starters, goalkeeperStarters, captainId]);

  const isPlayerSelected = (playerId) =>
    starters.some((player) => player.id === playerId) ||
    bench.some((player) => player.id === playerId);

  const addStarter = (player) => {
    if (isPlayerSelected(player.id)) return;

    if (starters.length >= 5) {
      setBench((prev) => [...prev, player]);
      return;
    }

    setStarters((prev) => [...prev, player]);
    setSaved(false);
  };

  const addBench = (player) => {
    if (isPlayerSelected(player.id)) return;
    setBench((prev) => [...prev, player]);
    setSaved(false);
  };

  const removePlayer = (playerId) => {
    setStarters((prev) => prev.filter((player) => player.id !== playerId));
    setBench((prev) => prev.filter((player) => player.id !== playerId));

    if (captainId === playerId) {
      setCaptainId(null);
    }

    setSaved(false);
  };

  const movePlayer = (listName, playerId, direction) => {
    const list = listName === 'starters' ? starters : bench;
    const setter = listName === 'starters' ? setStarters : setBench;

    const index = list.findIndex((player) => player.id === playerId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= list.length) return;

    const next = [...list];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setter(next);
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
  };

  const starterSlots = [
    { label: 'GR', player: goalkeeperStarters[0] || starters[0] },
    { label: 'Jogador 2', player: starters[1] },
    { label: 'Jogador 3', player: starters[2] },
    { label: 'Jogador 4', player: starters[3] },
    { label: 'Jogador 5', player: starters[4] },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.2fr_0.85fr]">
      <Card className="border-white/70 bg-white/90 shadow-lg shadow-slate-200/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-xl">
            <Users className="h-5 w-5 text-primary" />
            Jogadores disponíveis
          </CardTitle>
          <CardDescription>
            Escolhe o 5 inicial e o banco a partir dos atletas disponíveis.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {availablePlayers.length > 0 ? (
            availablePlayers.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                disabled={!canEdit}
                onAddStarter={canEdit ? addStarter : undefined}
                onAddBench={canEdit ? addBench : undefined}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-muted-foreground">
              Todos os jogadores já foram selecionados.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/70 bg-gradient-to-br from-white via-cyan-50/50 to-white shadow-lg shadow-slate-200/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-xl">
            <Shield className="h-5 w-5 text-primary" />
            5 Inicial
          </CardTitle>
          <CardDescription>
            Define o guarda-redes e os quatro jogadores de pista.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {starterSlots.map((slot, index) => (
            <LineupSlot
              key={`${slot.label}-${slot.player?.id || index}`}
              label={slot.label}
              player={slot.player}
              canEdit={canEdit}
              onMoveUp={() => slot.player && movePlayer('starters', slot.player.id, 'up')}
              onMoveDown={() => slot.player && movePlayer('starters', slot.player.id, 'down')}
              onRemove={() => slot.player && removePlayer(slot.player.id)}
              onSetCaptain={setCaptainId}
              isCaptain={slot.player?.id === captainId}
            />
          ))}

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <UserPlus className="h-4 w-4 text-primary" />
              Banco
            </div>

            <div className="space-y-3">
              {bench.length > 0 ? (
                bench.map((player) => (
                  <LineupSlot
                    key={player.id}
                    label={`Banco #${getJerseyNumber(player)}`}
                    player={player}
                    canEdit={canEdit}
                    onMoveUp={() => movePlayer('bench', player.id, 'up')}
                    onMoveDown={() => movePlayer('bench', player.id, 'down')}
                    onRemove={() => removePlayer(player.id)}
                    onSetCaptain={setCaptainId}
                    isCaptain={player.id === captainId}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-muted-foreground">
                  Ainda não existem jogadores no banco.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-white/70 bg-white/90 shadow-lg shadow-slate-200/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-xl">
              <Goal className="h-5 w-5 text-primary" />
              Estado do Line-up
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <InfoLine label="Equipa" value={team?.name || '-'} />
            <InfoLine label="Jogo" value={`${team?.name || 'Equipa'} vs ${match?.opponent_team || 'Adversário'}`} />
            <InfoLine label="5 inicial" value={`${starters.length}/5`} />
            <InfoLine label="Banco" value={bench.length} />
            <InfoLine
              label="Capitão"
              value={captainId ? getPlayerName([...starters, ...bench].find((player) => player.id === captainId)) : '-'}
            />

            {saved && (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                Line-up guardado localmente
              </Badge>
            )}

            {canEdit && (
              <Button className="w-full" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Guardar Line-up
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/90 shadow-lg shadow-slate-200/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-xl">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Validação
            </CardTitle>
          </CardHeader>

          <CardContent>
            {alerts.length > 0 ? (
              <div className="space-y-2">
                {alerts.map((alert, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                  >
                    {alert}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Line-up válido para guardar.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold">{value}</span>
    </div>
  );
}
