import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Loader2,
  RotateCcw,
  Save,
  Shield,
  Target,
  Trash2,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { championshipsApi } from '../../services/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import PlayerCard from './lineup/PlayerCard';
import LineupPlayerRow from './lineup/LineupPlayerRow';
import EmptyBox from './lineup/EmptyBox';
import StatusCard from './lineup/StatusCard';

const DEFAULT_ROTATION_PLAN = [
  { segment: 1, label: '1.ª parte - período 1', players: [] },
  { segment: 2, label: '1.ª parte - período 2', players: [] },
  { segment: 3, label: '2.ª parte - período 1', players: [] },
  { segment: 4, label: '2.ª parte - período 2', players: [] },
];

const STATUS_LABELS = {
  draft: 'Rascunho',
  prepared: 'Preparado',
  confirmed: 'Confirmado',
  official: 'Oficial',
  archived: 'Arquivado',
};

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

function buildPlayerMap(members) {
  const map = new Map();
  members.forEach((player) => map.set(player.id, player));
  return map;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export default function MatchLineup({ match, team, members = [], canEdit }) {
  const [startingFive, setStartingFive] = useState([]);
  const [bench, setBench] = useState([]);
  const [captainId, setCaptainId] = useState(null);
  const [viceCaptainId, setViceCaptainId] = useState(null);
  const [goalkeeperStartingId, setGoalkeeperStartingId] = useState(null);
  const [goalkeeperBenchId, setGoalkeeperBenchId] = useState(null);
  const [penaltyOrder, setPenaltyOrder] = useState([]);
  const [freeKickOrder, setFreeKickOrder] = useState([]);
  const [penaltyMainId, setPenaltyMainId] = useState(null);
  const [freeKickMainId, setFreeKickMainId] = useState(null);
  const [ballCenterId, setBallCenterId] = useState(null);
  const [lastFreeKickId, setLastFreeKickId] = useState(null);
  const [timeoutLeaderId, setTimeoutLeaderId] = useState(null);
  const [rotationPlan, setRotationPlan] = useState(DEFAULT_ROTATION_PLAN);
  const [tacticalPlan, setTacticalPlan] = useState('');
  const [coachNotes, setCoachNotes] = useState('');
  const [status, setStatus] = useState('draft');
  const [version, setVersion] = useState(1);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [exists, setExists] = useState(false);

  const playerMap = useMemo(() => buildPlayerMap(members), [members]);

  useEffect(() => {
    if (match?.id) {
      loadLineup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.id, members.length]);

  const idsToPlayers = (ids) =>
    normalizeArray(ids)
      .map((id) => playerMap.get(id))
      .filter(Boolean);

  const loadLineup = async () => {
    setLoading(true);

    try {
      const response = await championshipsApi.getMatchLineup(match.id);
      const data = response.data || {};

      setStartingFive(idsToPlayers(data.starting_five));
      setBench(idsToPlayers(data.bench));
      setCaptainId(data.captain_id || null);
      setViceCaptainId(data.vice_captain_id || null);
      setGoalkeeperStartingId(data.goalkeeper_starting_id || null);
      setGoalkeeperBenchId(data.goalkeeper_bench_id || null);
      setPenaltyOrder(normalizeArray(data.penalty_order));
      setFreeKickOrder(normalizeArray(data.free_kick_order));
      setPenaltyMainId(data.penalty_main_id || null);
      setFreeKickMainId(data.free_kick_main_id || null);
      setBallCenterId(data.ball_center_id || null);
      setLastFreeKickId(data.last_free_kick_id || null);
      setTimeoutLeaderId(data.timeout_leader_id || null);
      setRotationPlan(
        Array.isArray(data.rotation_plan) && data.rotation_plan.length > 0
          ? data.rotation_plan
          : DEFAULT_ROTATION_PLAN
      );
      setTacticalPlan(data.tactical_plan || '');
      setCoachNotes(data.coach_notes || '');
      setStatus(data.status || 'draft');
      setVersion(data.version || 1);
      setUpdatedAt(data.updated_at || data.created_at || null);
      setExists(Boolean(data.exists));
    } catch (error) {
      console.error('Erro ao carregar line-up:', error);
      toast.error('Erro ao carregar Plano de Jogo');
    } finally {
      setLoading(false);
    }
  };

  const selectedIds = useMemo(() => {
    return new Set([
      ...startingFive.map((player) => player.id),
      ...bench.map((player) => player.id),
    ]);
  }, [startingFive, bench]);

  const allSelectedPlayers = useMemo(
    () => [...startingFive, ...bench],
    [startingFive, bench]
  );

  const availablePlayers = useMemo(
    () => members.filter((player) => !selectedIds.has(player.id)),
    [members, selectedIds]
  );

  const alerts = useMemo(() => {
    const result = [];

    if (startingFive.length < 5) {
      result.push({ level: 'warning', text: `Faltam ${5 - startingFive.length} jogador(es) para completar o 5 inicial.` });
    }

    if (startingFive.length > 5) {
      result.push({ level: 'danger', text: 'O 5 inicial tem mais de 5 jogadores.' });
    }

    if (!goalkeeperStartingId) {
      result.push({ level: 'warning', text: 'Ainda não foi escolhido guarda-redes titular.' });
    }

    if (!captainId) {
      result.push({ level: 'warning', text: 'Ainda não foi definido capitão.' });
    }

    if (!viceCaptainId) {
      result.push({ level: 'info', text: 'Ainda não foi definido sub-capitão.' });
    }

    const segmentsWithoutPlayers = rotationPlan.filter((segment) => !segment.players || segment.players.length === 0);
    if (segmentsWithoutPlayers.length > 0) {
      result.push({ level: 'info', text: 'Existem semi-partes sem jogadores definidos.' });
    }

    return result;
  }, [startingFive.length, goalkeeperStartingId, captainId, viceCaptainId, rotationPlan]);

  const isPlayerSelected = (playerId) => selectedIds.has(playerId);

  const addStarter = (player) => {
    if (!canEdit || isPlayerSelected(player.id)) return;

    if (startingFive.length >= 5) {
      setBench((prev) => [...prev, player]);
      return;
    }

    setStartingFive((prev) => [...prev, player]);

    if (isGoalkeeper(player) && !goalkeeperStartingId) {
      setGoalkeeperStartingId(player.id);
    }
  };

  const addBench = (player) => {
    if (!canEdit || isPlayerSelected(player.id)) return;
    setBench((prev) => [...prev, player]);

    if (isGoalkeeper(player) && !goalkeeperBenchId) {
      setGoalkeeperBenchId(player.id);
    }
  };

  const removePlayer = (playerId) => {
    if (!canEdit) return;

    setStartingFive((prev) => prev.filter((player) => player.id !== playerId));
    setBench((prev) => prev.filter((player) => player.id !== playerId));
    setPenaltyOrder((prev) => prev.filter((id) => id !== playerId));
    setFreeKickOrder((prev) => prev.filter((id) => id !== playerId));
    if (penaltyMainId === playerId) setPenaltyMainId(null);
    if (freeKickMainId === playerId) setFreeKickMainId(null);
    if (ballCenterId === playerId) setBallCenterId(null);
    if (lastFreeKickId === playerId) setLastFreeKickId(null);
    if (timeoutLeaderId === playerId) setTimeoutLeaderId(null);
    setRotationPlan((prev) =>
      prev.map((segment) => ({
        ...segment,
        players: normalizeArray(segment.players).filter((id) => id !== playerId),
      }))
    );

    if (captainId === playerId) setCaptainId(null);
    if (viceCaptainId === playerId) setViceCaptainId(null);
    if (goalkeeperStartingId === playerId) setGoalkeeperStartingId(null);
    if (goalkeeperBenchId === playerId) setGoalkeeperBenchId(null);
  };

  const movePlayer = (listName, playerId, direction) => {
    if (!canEdit) return;

    const list = listName === 'startingFive' ? startingFive : bench;
    const setter = listName === 'startingFive' ? setStartingFive : setBench;
    const index = list.findIndex((player) => player.id === playerId);

    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= list.length) return;

    const next = [...list];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setter(next);
  };

  const addToOrder = (type, playerId) => {
    if (!canEdit || !playerId) return;
    const setter = type === 'penalty' ? setPenaltyOrder : setFreeKickOrder;
    setter((prev) => (prev.includes(playerId) ? prev : [...prev, playerId]));
  };

  const removeFromOrder = (type, playerId) => {
    if (!canEdit) return;
    const setter = type === 'penalty' ? setPenaltyOrder : setFreeKickOrder;
    setter((prev) => prev.filter((id) => id !== playerId));
  };

  const moveOrder = (type, playerId, direction) => {
    if (!canEdit) return;
    const setter = type === 'penalty' ? setPenaltyOrder : setFreeKickOrder;

    setter((prev) => {
      const index = prev.indexOf(playerId);
      if (index === -1) return prev;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  };

  const toggleRotationPlayer = (segmentIndex, playerId) => {
    if (!canEdit) return;

    setRotationPlan((prev) =>
      prev.map((segment, index) => {
        if (index !== segmentIndex) return segment;

        const players = normalizeArray(segment.players);
        const nextPlayers = players.includes(playerId)
          ? players.filter((id) => id !== playerId)
          : [...players, playerId];

        return {
          ...segment,
          players: nextPlayers,
        };
      })
    );
  };

  const handleSave = async () => {
    if (!match?.id) return;
    setSaving(true);

    try {
      const payload = {
        starting_five: startingFive.map((player) => player.id),
        bench: bench.map((player) => player.id),
        captain_id: captainId,
        vice_captain_id: viceCaptainId,
        goalkeeper_starting_id: goalkeeperStartingId,
        goalkeeper_bench_id: goalkeeperBenchId,
        penalty_order: penaltyOrder,
        free_kick_order: freeKickOrder,
        penalty_main_id: penaltyMainId,
        free_kick_main_id: freeKickMainId,
        ball_center_id: ballCenterId,
        last_free_kick_id: lastFreeKickId,
        timeout_leader_id: timeoutLeaderId,
        rotation_plan: rotationPlan,
        tactical_plan: tacticalPlan,
        coach_notes: coachNotes,
        status,
      };

      const response = await championshipsApi.saveMatchLineup(match.id, payload);
      const saved = response.data || {};

      setExists(true);
      setVersion(saved.version || version + 1);
      setUpdatedAt(saved.updated_at || new Date().toISOString());
      toast.success('Plano de Jogo guardado');
    } catch (error) {
      console.error('Erro ao guardar line-up:', error);
      toast.error(error.response?.data?.detail || 'Erro ao guardar Plano de Jogo');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!match?.id || !canEdit) return;
    if (!window.confirm('Pretende apagar o Plano de Jogo deste jogo?')) return;

    setResetting(true);

    try {
      await championshipsApi.deleteMatchLineup(match.id);
      setStartingFive([]);
      setBench([]);
      setCaptainId(null);
      setViceCaptainId(null);
      setGoalkeeperStartingId(null);
      setGoalkeeperBenchId(null);
      setPenaltyOrder([]);
      setFreeKickOrder([]);
      setPenaltyMainId(null);
      setFreeKickMainId(null);
      setBallCenterId(null);
      setLastFreeKickId(null);
      setTimeoutLeaderId(null);
      setRotationPlan(DEFAULT_ROTATION_PLAN);
      setTacticalPlan('');
      setCoachNotes('');
      setStatus('draft');
      setVersion(1);
      setUpdatedAt(null);
      setExists(false);
      toast.success('Plano de Jogo apagado');
    } catch (error) {
      console.error('Erro ao apagar line-up:', error);
      toast.error('Erro ao apagar Plano de Jogo');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-white/70 bg-white/90 shadow-lg shadow-slate-200/70">
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          A carregar Plano de Jogo...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-white shadow-xl shadow-slate-200/70">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge className="mb-3 border-white/20 bg-white/10 text-white hover:bg-white/10">
              Plano de Jogo
            </Badge>
            <CardTitle className="font-heading text-2xl">Line-up Inteligente</CardTitle>
            <CardDescription className="text-cyan-100/80">
              Cinco inicial, banco, liderança, especialistas e plano de semi-partes.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className="bg-white/10 text-white hover:bg-white/10">
              {STATUS_LABELS[status] || status}
            </Badge>
            <Badge className="bg-white/10 text-white hover:bg-white/10">
              Versão {version}
            </Badge>
            {exists && updatedAt && (
              <Badge className="bg-emerald-400 text-slate-950 hover:bg-emerald-400">
                Guardado
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.25fr_0.9fr]">
        <Card className="border-white/70 bg-white/90 shadow-lg shadow-slate-200/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-xl">
              <Users className="h-5 w-5 text-primary" />
              Jogadores disponíveis
            </CardTitle>
            <CardDescription>
              Seleciona atletas para o 5 inicial ou banco.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {availablePlayers.length > 0 ? (
              availablePlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  canEdit={canEdit}
                  onAddStarter={() => addStarter(player)}
                  onAddBench={() => addBench(player)}
                />
              ))
            ) : (
              <EmptyBox text="Todos os jogadores já foram selecionados." />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-white/70 bg-gradient-to-br from-white via-cyan-50/50 to-white shadow-lg shadow-slate-200/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-xl">
                <Shield className="h-5 w-5 text-primary" />
                5 Inicial
              </CardTitle>
              <CardDescription>
                Define a equipa inicial e as funções principais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {startingFive.length > 0 ? (
                startingFive.map((player, index) => (
                  <LineupPlayerRow
                    key={player.id}
                    label={index === 0 ? 'GR / Jogador 1' : `Jogador ${index + 1}`}
                    player={player}
                    canEdit={canEdit}
                    captainId={captainId}
                    viceCaptainId={viceCaptainId}
                    goalkeeperStartingId={goalkeeperStartingId}
                    goalkeeperBenchId={goalkeeperBenchId}
                    onMoveUp={() => movePlayer('startingFive', player.id, 'up')}
                    onMoveDown={() => movePlayer('startingFive', player.id, 'down')}
                    onRemove={() => removePlayer(player.id)}
                    onSetCaptain={() => setCaptainId(player.id)}
                    onSetViceCaptain={() => setViceCaptainId(player.id)}
                    onSetGoalkeeperStarting={() => setGoalkeeperStartingId(player.id)}
                    onSetGoalkeeperBench={() => setGoalkeeperBenchId(player.id)}
                  />
                ))
              ) : (
                <EmptyBox text="Ainda não existem jogadores no 5 inicial." />
              )}
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-white/90 shadow-lg shadow-slate-200/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-xl">
                <UserPlus className="h-5 w-5 text-primary" />
                Banco
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bench.length > 0 ? (
                bench.map((player) => (
                  <LineupPlayerRow
                    key={player.id}
                    label={`Banco #${getJerseyNumber(player)}`}
                    player={player}
                    canEdit={canEdit}
                    captainId={captainId}
                    viceCaptainId={viceCaptainId}
                    goalkeeperStartingId={goalkeeperStartingId}
                    goalkeeperBenchId={goalkeeperBenchId}
                    onMoveUp={() => movePlayer('bench', player.id, 'up')}
                    onMoveDown={() => movePlayer('bench', player.id, 'down')}
                    onRemove={() => removePlayer(player.id)}
                    onSetCaptain={() => setCaptainId(player.id)}
                    onSetViceCaptain={() => setViceCaptainId(player.id)}
                    onSetGoalkeeperStarting={() => setGoalkeeperStartingId(player.id)}
                    onSetGoalkeeperBench={() => setGoalkeeperBenchId(player.id)}
                  />
                ))
              ) : (
                <EmptyBox text="Ainda não existem jogadores no banco." />
              )}
            </CardContent>
          </Card>

          <RotationPlanCard
            selectedPlayers={allSelectedPlayers}
            rotationPlan={rotationPlan}
            canEdit={canEdit}
            onTogglePlayer={toggleRotationPlayer}
          />
        </div>

        <div className="space-y-4">
          <StatusCard
            match={match}
            team={team}
            status={status}
            setStatus={setStatus}
            canEdit={canEdit}
            startingFive={startingFive}
            bench={bench}
            captainId={captainId}
            viceCaptainId={viceCaptainId}
            goalkeeperStartingId={goalkeeperStartingId}
            goalkeeperBenchId={goalkeeperBenchId}
            selectedPlayers={allSelectedPlayers}
            alerts={alerts}
            exists={exists}
            updatedAt={updatedAt}
          />

          <SpecialistsCard
            selectedPlayers={allSelectedPlayers}
            penaltyOrder={penaltyOrder}
            freeKickOrder={freeKickOrder}
            penaltyMainId={penaltyMainId}
            freeKickMainId={freeKickMainId}
            ballCenterId={ballCenterId}
            lastFreeKickId={lastFreeKickId}
            timeoutLeaderId={timeoutLeaderId}
            setPenaltyMainId={setPenaltyMainId}
            setFreeKickMainId={setFreeKickMainId}
            setBallCenterId={setBallCenterId}
            setLastFreeKickId={setLastFreeKickId}
            setTimeoutLeaderId={setTimeoutLeaderId}
            canEdit={canEdit}
            onAddToPenalty={(playerId) => addToOrder('penalty', playerId)}
            onAddToFreeKick={(playerId) => addToOrder('freeKick', playerId)}
            onRemovePenalty={(playerId) => removeFromOrder('penalty', playerId)}
            onRemoveFreeKick={(playerId) => removeFromOrder('freeKick', playerId)}
            onMovePenalty={(playerId, direction) => moveOrder('penalty', playerId, direction)}
            onMoveFreeKick={(playerId, direction) => moveOrder('freeKick', playerId, direction)}
          />

          <Card className="border-white/70 bg-white/90 shadow-lg shadow-slate-200/70">
            <CardHeader>
              <CardTitle className="font-heading text-xl">Notas do treinador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Plano tático</Label>
                <Textarea
                  value={tacticalPlan}
                  onChange={(event) => setTacticalPlan(event.target.value)}
                  disabled={!canEdit}
                  placeholder="Orientações táticas, entrada no jogo, pressão, bolas paradas..."
                />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={coachNotes}
                  onChange={(event) => setCoachNotes(event.target.value)}
                  disabled={!canEdit}
                  placeholder="Notas para treinador, adjunto ou delegado..."
                />
              </div>
            </CardContent>
          </Card>

          {canEdit && (
            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Plano de Jogo
              </Button>
              <Button onClick={handleReset} disabled={resetting} variant="outline" className="flex-1">
                {resetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Apagar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RotationPlanCard({ selectedPlayers, rotationPlan, canEdit, onTogglePlayer }) {
  return (
    <Card className="border-white/70 bg-white/90 shadow-lg shadow-slate-200/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-xl">
          <RotateCcw className="h-5 w-5 text-primary" />
          Plano das 4 partes
        </CardTitle>
        <CardDescription>
          Útil para Bambis, Benjamins e Escolares. A validação RTP será aprofundada no próximo sprint.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {rotationPlan.map((segment, index) => (
          <div key={segment.segment || index} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-3 font-semibold">{segment.label || `Segmento ${index + 1}`}</p>
            <div className="space-y-2">
              {selectedPlayers.length > 0 ? (
                selectedPlayers.map((player) => {
                  const selected = normalizeArray(segment.players).includes(player.id);
                  return (
                    <button
                      key={player.id}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => onTogglePlayer(index, player.id)}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                        selected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-slate-200 bg-white text-slate-700'
                      } ${!canEdit ? 'cursor-default opacity-80' : 'hover:border-primary/60'}`}
                    >
                      #{getJerseyNumber(player)} {getPlayerName(player)}
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">Seleciona primeiro jogadores para o 5 inicial ou banco.</p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SpecialistsCard({
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
      <div className="mb-3 flex items-center gap-2 font-semibold">{icon}{title}</div>
      <div className="space-y-2">
        {order.length > 0 ? (
          order.map((playerId, index) => {
            const player = players.find((item) => item.id === playerId);
            if (!player) return null;
            return (
              <div key={playerId} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm">
                <span>{index + 1}. #{getJerseyNumber(player)} {getPlayerName(player)}</span>
                {canEdit && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => onMove(playerId, 'up')}><ArrowUp className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => onMove(playerId, 'down')}><ArrowDown className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => onRemove(playerId)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
            <Button key={player.id} size="sm" variant="outline" onClick={() => onAdd(player.id)}>
              + #{getJerseyNumber(player)}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

  const captain = selectedPlayers.find((player) => player.id === captainId);
  const viceCaptain = selectedPlayers.find((player) => player.id === viceCaptainId);
  const goalkeeperStarting = selectedPlayers.find((player) => player.id === goalkeeperStartingId);
  const goalkeeperBench = selectedPlayers.find((player) => player.id === goalkeeperBenchId);

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
        <InfoLine label="Jogo" value={`${team?.name || 'Equipa'} vs ${match?.opponent_team || 'Adversário'}`} />
        <InfoLine label="5 inicial" value={`${startingFive.length}/5`} />
        <InfoLine label="Banco" value={bench.length} />
        <InfoLine label="Capitão" value={captain ? getPlayerName(captain) : '-'} />
        <InfoLine label="Sub-capitão" value={viceCaptain ? getPlayerName(viceCaptain) : '-'} />
        <InfoLine label="GR titular" value={goalkeeperStarting ? getPlayerName(goalkeeperStarting) : '-'} />
        <InfoLine label="GR suplente" value={goalkeeperBench ? getPlayerName(goalkeeperBench) : '-'} />

        {canEdit && (
          <div className="space-y-2">
            <Label>Estado</Label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
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
            Última gravação: {new Date(updatedAt).toLocaleString('pt-PT')}
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
