import { Brain, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';

import { getPlayerName, isGoalkeeper } from './lineupUtils';

function AssistantItem({ type = 'info', text }) {
  const Icon =
    type === 'success'
      ? CheckCircle2
      : type === 'warning'
        ? AlertTriangle
        : Info;

  const className =
    type === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : type === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-cyan-200 bg-cyan-50 text-cyan-800';

  return (
    <div className={`flex gap-2 rounded-xl border p-3 text-sm ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

export default function GamePlanAssistant({
  startingFive,
  bench,
  captainId,
  viceCaptainId,
  goalkeeperStartingId,
  goalkeeperBenchId,
  penaltyMainId,
  freeKickMainId,
  ballCenterId,
  lastFreeKickId,
  timeoutLeaderId,
  rotationPlan,
  selectedPlayers,
}) {
  const messages = [];

  const captain = selectedPlayers.find((player) => player.id === captainId);
  const viceCaptain = selectedPlayers.find((player) => player.id === viceCaptainId);
  const goalkeeperStarting = selectedPlayers.find((player) => player.id === goalkeeperStartingId);
  const goalkeeperBench = selectedPlayers.find((player) => player.id === goalkeeperBenchId);

  const penaltyMain = selectedPlayers.find((player) => player.id === penaltyMainId);
  const freeKickMain = selectedPlayers.find((player) => player.id === freeKickMainId);
  const ballCenter = selectedPlayers.find((player) => player.id === ballCenterId);
  const lastFreeKick = selectedPlayers.find((player) => player.id === lastFreeKickId);
  const timeoutLeader = selectedPlayers.find((player) => player.id === timeoutLeaderId);

  if (startingFive.length === 5) {
    messages.push({ type: 'success', text: '5 inicial completo.' });
  } else {
    messages.push({
      type: 'warning',
      text: `O 5 inicial ainda não está completo (${startingFive.length}/5).`,
    });
  }

  if (goalkeeperStarting) {
    messages.push({
      type: 'success',
      text: `GR titular definido: ${getPlayerName(goalkeeperStarting)}.`,
    });
  } else {
    messages.push({
      type: 'warning',
      text: 'Ainda não existe GR titular definido.',
    });
  }

  if (!goalkeeperBench) {
    messages.push({
      type: 'warning',
      text: 'GR suplente ainda não definido.',
    });
  }

  if (captain) {
    messages.push({
      type: 'success',
      text: `Capitão definido: ${getPlayerName(captain)}.`,
    });
  } else {
    messages.push({
      type: 'warning',
      text: 'Capitão ainda não definido.',
    });
  }

  if (!viceCaptain) {
    messages.push({
      type: 'warning',
      text: 'Sub-capitão ainda não definido.',
    });
  }

  if (!penaltyMain) {
    messages.push({
      type: 'warning',
      text: 'Penálti principal ainda não definido.',
    });
  }

  if (!freeKickMain) {
    messages.push({
      type: 'warning',
      text: 'Livre direto principal ainda não definido.',
    });
  }

  if (!ballCenter) {
    messages.push({
      type: 'info',
      text: 'Bola ao centro ainda não definida.',
    });
  }

  if (!lastFreeKick) {
    messages.push({
      type: 'info',
      text: 'Responsável pelo último livre ainda não definido.',
    });
  }

  if (!timeoutLeader) {
    messages.push({
      type: 'info',
      text: 'Responsável pelo time-out ainda não definido.',
    });
  }

  const playersWithoutRotation = selectedPlayers.filter((player) => {
    return !rotationPlan.some((segment) =>
      Array.isArray(segment.players) && segment.players.includes(player.id)
    );
  });

  if (playersWithoutRotation.length > 0) {
    messages.push({
      type: 'warning',
      text: `${playersWithoutRotation.length} atleta(s) ainda não aparecem no plano das 4 partes.`,
    });
  } else if (selectedPlayers.length > 0) {
    messages.push({
      type: 'success',
      text: 'Todos os atletas selecionados aparecem no plano das 4 partes.',
    });
  }

  const fieldSpecialists = [
    penaltyMain,
    freeKickMain,
    ballCenter,
    lastFreeKick,
  ].filter(Boolean);

  const goalkeeperAsFieldSpecialist = fieldSpecialists.find(isGoalkeeper);

  if (goalkeeperAsFieldSpecialist) {
    messages.push({
      type: 'warning',
      text: `${getPlayerName(goalkeeperAsFieldSpecialist)} é GR e foi definido como especialista de campo.`,
    });
  }

  if (bench.length < 2 && startingFive.length === 5) {
    messages.push({
      type: 'info',
      text: 'Banco curto: existem menos de 2 suplentes definidos.',
    });
  }

  return (
    <Card className="border-cyan-100 bg-gradient-to-br from-white via-cyan-50/50 to-white shadow-lg shadow-slate-200/70">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 font-heading text-xl">
            <Brain className="h-5 w-5 text-cyan-600" />
            Assistente do Plano
          </CardTitle>

          <Badge className="bg-cyan-500">
            Inteligente
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {messages.map((message, index) => (
          <AssistantItem
            key={index}
            type={message.type}
            text={message.text}
          />
        ))}
      </CardContent>
    </Card>
  );
}
