import { useMemo } from 'react';
import {
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Goal,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Badge } from '../ui/badge';
import RecommendationCard from './RecommendationCard';

function getTopScorer(stats = []) {
  return stats.reduce((best, item) => {
    const goals = Number(item?.goals || 0);
    const bestGoals = Number(best?.goals || 0);

    return goals > bestGoals ? item : best;
  }, null);
}

function getTopGoalkeeper(stats = []) {
  return stats.reduce((best, item) => {
    const saves = Number(item?.saves || 0);
    const bestSaves = Number(best?.saves || 0);

    return saves > bestSaves ? item : best;
  }, null);
}

function getPlayerName(item) {
  return (
    item?.player_name ||
    item?.player?.name ||
    item?.name ||
    'Atleta'
  );
}

function buildRecommendations({
  match,
  workflow,
  existingStats,
  technicalAssistant,
}) {
  const recommendations = [];
  const stage = workflow?.stage || 'draft';

  const totalRedCards = existingStats.reduce(
    (sum, item) => sum + Number(item?.red_cards || 0),
    0
  );

  const totalBlueCards = existingStats.reduce(
    (sum, item) => sum + Number(item?.blue_cards || 0),
    0
  );

  const topScorer = getTopScorer(existingStats);
  const topGoalkeeper = getTopGoalkeeper(existingStats);

  if (
    match?.timeline_sync_status !== 'synced' &&
    ['finished', 'stats', 'assistant'].includes(stage)
  ) {
    recommendations.push({
      id: 'sync-timeline',
      priority: 'high',
      title: 'Sincronizar a timeline',
      description:
        'Existem dados pós-jogo, mas a timeline ainda não está marcada como sincronizada. Confirme o resultado e as estatísticas antes de avançar.',
      actionLabel: 'Abrir Live',
      destinationTab: 'live',
      icon: RefreshCw,
    });
  }

  if (stage === 'stats') {
    recommendations.push({
      id: 'recalculate-assistant',
      priority: 'high',
      title: 'Recalcular o Assistente Técnico',
      description:
        'As estatísticas estão validadas. Atualize agora a análise técnica para refletir os dados finais do jogo.',
      actionLabel: 'Abrir Assistente',
      destinationTab: 'assistant',
      icon: Bot,
    });
  }

  if (
    stage === 'assistant' &&
    !technicalAssistant?.published
  ) {
    recommendations.push({
      id: 'publish-assistant',
      priority: 'medium',
      title: 'Publicar o Assistente Técnico',
      description:
        'A análise foi recalculada, mas ainda não se encontra publicada. Reveja o conteúdo antes da partilha.',
      actionLabel: 'Rever Assistente',
      destinationTab: 'assistant',
      icon: Sparkles,
    });
  }

  if (stage === 'assistant') {
    recommendations.push({
      id: 'evaluate-players',
      priority: 'high',
      title: 'Avaliar os atletas',
      description:
        'O jogo e a análise técnica estão concluídos. Registe agora as avaliações individuais pós-jogo.',
      actionLabel: 'Abrir Avaliação',
      destinationTab: 'evaluation',
      icon: Star,
    });
  }

  if (stage === 'evaluation') {
    recommendations.push({
      id: 'collect-feedback',
      priority: 'medium',
      title: 'Recolher feedback dos atletas',
      description:
        'As avaliações técnicas estão concluídas. Disponibilize o questionário de perceção pós-jogo.',
      actionLabel: 'Abrir Feedback',
      destinationTab: 'feedback',
      icon: ClipboardCheck,
    });
  }

  if (topScorer && Number(topScorer.goals || 0) >= 3) {
    recommendations.push({
      id: 'highlight-top-scorer',
      priority: 'info',
      title: 'Destacar o melhor marcador',
      description: `${getPlayerName(topScorer)} marcou ${topScorer.goals} golos. Considere refletir este desempenho na avaliação individual.`,
      actionLabel: 'Abrir Avaliação',
      destinationTab: 'evaluation',
      icon: Goal,
    });
  }

  if (
    topGoalkeeper &&
    Number(topGoalkeeper.saves || 0) >= 15
  ) {
    recommendations.push({
      id: 'highlight-goalkeeper',
      priority: 'info',
      title: 'Destacar o guarda-redes',
      description: `${getPlayerName(topGoalkeeper)} registou ${topGoalkeeper.saves} defesas. Considere destacar o impacto defensivo na avaliação.`,
      actionLabel: 'Abrir Avaliação',
      destinationTab: 'evaluation',
      icon: ShieldCheck,
    });
  }

  if (totalRedCards > 0 || totalBlueCards >= 2) {
    recommendations.push({
      id: 'discipline-review',
      priority: totalRedCards > 0 ? 'high' : 'medium',
      title: 'Rever a disciplina da equipa',
      description:
        totalRedCards > 0
          ? `Foi registado ${totalRedCards} cartão vermelho. Analise o contexto disciplinar no relatório técnico.`
          : `Foram registados ${totalBlueCards} cartões azuis. Considere uma análise disciplinar com a equipa.`,
      actionLabel: 'Abrir Estatísticas',
      destinationTab: 'statistics',
      icon: ShieldAlert,
    });
  }

  if (match?.is_completed && recommendations.length === 0) {
    recommendations.push({
      id: 'workflow-aligned',
      priority: 'info',
      title: 'Fluxo do jogo alinhado',
      description:
        'Não foram identificadas ações críticas neste momento. Continue a acompanhar o workflow até ao encerramento.',
      actionLabel: 'Abrir Resumo',
      destinationTab: 'summary',
      icon: CheckCircle2,
    });
  }

  if (!match?.is_completed && recommendations.length === 0) {
    recommendations.push({
      id: 'prepare-match',
      priority: 'info',
      title: 'Preparar o encontro',
      description:
        'Complete a convocatória, o line-up e os dados essenciais antes de iniciar o Live Match Center.',
      actionLabel: 'Abrir Resumo',
      destinationTab: 'summary',
      icon: Trophy,
    });
  }

  return recommendations.slice(0, 5);
}

export default function SmartAssistantPanel({
  match,
  workflow,
  existingStats = [],
  technicalAssistant,
  onNavigate,
}) {
  const recommendations = useMemo(
    () =>
      buildRecommendations({
        match,
        workflow,
        existingStats,
        technicalAssistant,
      }),
    [match, workflow, existingStats, technicalAssistant]
  );

  const highPriorityCount = recommendations.filter(
    (item) => item.priority === 'high'
  ).length;

  return (
    <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-violet-50/60 shadow-sm">
      <CardHeader className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Bot className="h-5 w-5" />
            </span>

            <div>
              <CardTitle className="font-heading text-xl font-semibold tracking-tight text-slate-950">
                Smart Match Assistant
              </CardTitle>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Recomendações contextuais com base no workflow,
                resultado e desempenho registado.
              </p>
            </div>
          </div>

          <Badge
            variant="outline"
            className={
              highPriorityCount > 0
                ? 'w-fit border-red-200 bg-red-50 text-red-700'
                : 'w-fit border-violet-200 bg-violet-50 text-violet-700'
            }
          >
            {highPriorityCount > 0
              ? `${highPriorityCount} prioridade${highPriorityCount === 1 ? '' : 's'} alta${highPriorityCount === 1 ? '' : 's'}`
              : `${recommendations.length} sugestão${recommendations.length === 1 ? '' : 'ões'}`}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
        {recommendations.map((recommendation) => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            onExecute={onNavigate}
          />
        ))}
      </CardContent>
    </Card>
  );
}
