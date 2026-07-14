import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Flag,
  MessageSquareText,
  Play,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';

const ACTIONS = {
  draft: {
    title: 'Preparar convocatória',
    description:
      'Crie ou confirme a convocatória do jogo.',
    destination: 'Convocatória',
    destinationTab: 'convocation',
    icon: Users,
  },
  convocation: {
    title: 'Definir o cinco inicial',
    description:
      'Organize titulares, banco e funções técnicas.',
    destination: 'Line-up',
    destinationTab: 'lineup',
    icon: ShieldCheck,
  },
  lineup: {
    title: 'Confirmar preparação',
    description:
      'Reveja line-up e dados essenciais antes de iniciar.',
    destination: 'Resumo',
    destinationTab: 'summary',
    icon: CheckCircle2,
  },
  ready: {
    title: 'Iniciar o jogo',
    description:
      'Registe o início no Live Match Center.',
    destination: 'Live',
    destinationTab: 'live',
    icon: Play,
  },
  live: {
    title: 'Concluir a timeline',
    description:
      'Registe os acontecimentos e o fim do jogo.',
    destination: 'Live',
    destinationTab: 'live',
    icon: Flag,
  },
  finished: {
    title: 'Validar estatísticas',
    description:
      'Sincronize a timeline com resultado e estatísticas.',
    destination: 'Live',
    destinationTab: 'live',
    icon: ClipboardCheck,
  },
  stats: {
    title: 'Recalcular Assistente Técnico',
    description:
      'Atualize a análise técnica com os dados validados.',
    destination: 'Assistente',
    destinationTab: 'assistant',
    icon: Bot,
  },
  assistant: {
    title: 'Avaliar os atletas',
    description:
      'Registe a avaliação individual pós-jogo.',
    destination: 'Avaliação',
    destinationTab: 'evaluation',
    icon: Star,
  },
  evaluation: {
    title: 'Recolher feedback',
    description:
      'Disponibilize o questionário pós-jogo aos atletas.',
    destination: 'Feedback',
    destinationTab: 'feedback',
    icon: MessageSquareText,
  },
  feedback: {
    title: 'Encerrar o jogo',
    description:
      'Confirme documentação e feche o Match Center.',
    destination: 'Documentos',
    destinationTab: 'documents',
    icon: CheckCircle2,
  },
  closed: {
    title: 'Workflow concluído',
    description:
      'Todas as etapas principais estão concluídas.',
    destination: 'Resumo',
    destinationTab: 'summary',
    icon: CheckCircle2,
  },
};

export default function WorkflowNextAction({
  workflow,
  onContinue,
}) {
  const stage = workflow?.stage || 'draft';
  const action = ACTIONS[stage] || ACTIONS.draft;
  const Icon = action.icon;
  const completed = stage === 'closed';

  const handleContinue = () => {
    if (onContinue) {
      onContinue(action.destinationTab);
    }
  };

  return (
    <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-cyan-50/60 shadow-sm">
      <CardHeader className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-heading text-xl font-semibold tracking-tight text-slate-950">
            Próxima ação
          </CardTitle>

          <Badge
            variant="outline"
            className={
              completed
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-cyan-200 bg-cyan-50 text-cyan-700'
            }
          >
            {completed ? 'Concluído' : 'Recomendado'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span
            className={[
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
              completed
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-primary/10 text-primary',
            ].join(' ')}
          >
            <Icon className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-lg font-semibold text-slate-950">
              {action.title}
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {action.description}
            </p>

            <Button
              type="button"
              variant={completed ? 'outline' : 'default'}
              className="mt-4 rounded-xl"
              onClick={handleContinue}
              data-testid="workflow-continue-btn"
            >
              {completed ? 'Abrir resumo' : 'Continuar'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <p className="mt-2 text-xs text-slate-400">
              Destino: {action.destination}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
