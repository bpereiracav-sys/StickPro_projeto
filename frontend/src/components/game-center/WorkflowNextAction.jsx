import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
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
    description: 'Crie ou confirme a convocatória do jogo.',
    destination: 'Convocatória',
    destinationTab: 'convocation',
    icon: Users,
  },
  convocation: {
    title: 'Definir o cinco inicial',
    description: 'Organize titulares, banco e funções técnicas.',
    destination: 'Line-up',
    destinationTab: 'lineup',
    icon: ShieldCheck,
  },
  lineup: {
    title: 'Confirmar preparação',
    description: 'Reveja o line-up e os dados essenciais antes de iniciar.',
    destination: 'Resumo',
    destinationTab: 'summary',
    icon: CheckCircle2,
  },
  ready: {
    title: 'Iniciar o jogo',
    description: 'Registe o início no Live Match Center.',
    destination: 'Live',
    destinationTab: 'live',
    icon: Play,
  },
  live: {
    title: 'Concluir a timeline',
    description: 'Registe os acontecimentos e o fim do jogo.',
    destination: 'Live',
    destinationTab: 'live',
    icon: Flag,
  },
  finished: {
    title: 'Validar estatísticas',
    description: 'Sincronize a timeline com o resultado e as estatísticas.',
    destination: 'Estatísticas',
    destinationTab: 'statistics',
    icon: ClipboardCheck,
  },
  stats: {
    title: 'Recalcular Assistente Técnico',
    description: 'Atualize a análise técnica com os dados validados.',
    destination: 'Assistente',
    destinationTab: 'assistant',
    icon: Bot,
  },
  assistant: {
    title: 'Avaliar os atletas',
    description: 'Registe a avaliação individual pós-jogo.',
    destination: 'Avaliação',
    destinationTab: 'evaluation',
    icon: Star,
  },
  evaluation: {
    title: 'Recolher feedback',
    description: 'Disponibilize o questionário pós-jogo aos atletas.',
    destination: 'Feedback',
    destinationTab: 'feedback',
    icon: MessageSquareText,
  },
  feedback: {
    title: 'Encerrar o jogo',
    description: 'Confirme a documentação e feche o Match Center.',
    destination: 'Documentos',
    destinationTab: 'documents',
    icon: FileCheck2,
  },
  closed: {
    title: 'Workflow concluído',
    description: 'Todas as etapas principais estão concluídas.',
    destination: 'Resumo',
    destinationTab: 'summary',
    icon: CheckCircle2,
  },
};

const DESTINATION_CONFIG = {
  summary: {
    label: 'Resumo',
    tab: 'summary',
    icon: CheckCircle2,
  },
  convocation: {
    label: 'Convocatória',
    tab: 'convocation',
    icon: Users,
  },
  attendance: {
    label: 'Convocatória',
    tab: 'convocation',
    icon: Users,
  },
  lineup: {
    label: 'Line-up',
    tab: 'lineup',
    icon: ShieldCheck,
  },
  ready: {
    label: 'Resumo',
    tab: 'summary',
    icon: CheckCircle2,
  },
  live: {
    label: 'Live',
    tab: 'live',
    icon: Play,
  },
  timeline: {
    label: 'Live',
    tab: 'live',
    icon: Flag,
  },
  timeline_sync: {
    label: 'Live',
    tab: 'live',
    icon: Flag,
  },
  result: {
    label: 'Estatísticas',
    tab: 'statistics',
    icon: ClipboardCheck,
  },
  statistics: {
    label: 'Estatísticas',
    tab: 'statistics',
    icon: ClipboardCheck,
  },
  stats: {
    label: 'Estatísticas',
    tab: 'statistics',
    icon: ClipboardCheck,
  },
  gamesheet: {
    label: 'Boletim',
    tab: 'gamesheet',
    icon: FileCheck2,
  },
  assistant: {
    label: 'Assistente',
    tab: 'assistant',
    icon: Bot,
  },
  evaluation: {
    label: 'Avaliação',
    tab: 'evaluation',
    icon: Star,
  },
  evaluations: {
    label: 'Avaliação',
    tab: 'evaluation',
    icon: Star,
  },
  feedback: {
    label: 'Feedback',
    tab: 'feedback',
    icon: MessageSquareText,
  },
  documents: {
    label: 'Documentos',
    tab: 'documents',
    icon: FileCheck2,
  },
  history: {
    label: 'Histórico',
    tab: 'history',
    icon: FileCheck2,
  },
  closed: {
    label: 'Resumo',
    tab: 'summary',
    icon: CheckCircle2,
  },
};

const STATUS_LABELS = {
  attention_required: 'Atenção necessária',
  in_progress: 'Recomendado',
  ready_to_close: 'Pronto para encerrar',
  completed: 'Concluído',
  unavailable: 'Indisponível',
};

function normalizeDestination(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function getSmartAction(smartWorkflow) {
  const primaryAction = smartWorkflow?.primary_action;

  if (!primaryAction || typeof primaryAction !== 'object') {
    return null;
  }

  const destinationKey = normalizeDestination(
    primaryAction.destination ||
      primaryAction.destination_tab ||
      primaryAction.tab ||
      primaryAction.key
  );

  const destinationConfig =
    DESTINATION_CONFIG[destinationKey] ||
    DESTINATION_CONFIG.summary;

  return {
    title:
      primaryAction.title ||
      'Continuar workflow',
    description:
      primaryAction.description ||
      'Conclua a próxima etapa recomendada para este jogo.',
    destination:
      primaryAction.destination_label ||
      destinationConfig.label,
    destinationTab:
      primaryAction.destination_tab ||
      primaryAction.tab ||
      destinationConfig.tab,
    icon: destinationConfig.icon,
    priority:
      primaryAction.priority ||
      smartWorkflow?.status ||
      'in_progress',
  };
}

export default function WorkflowNextAction({
  workflow,
  smartWorkflow,
  onContinue,
}) {
  const stage = workflow?.stage || 'draft';

  const smartAction = getSmartAction(smartWorkflow);

  const fallbackAction =
    ACTIONS[stage] ||
    ACTIONS.draft;

  const action =
    smartAction ||
    fallbackAction;

  const Icon =
    action.icon ||
    ArrowRight;

  const smartStatus =
    smartWorkflow?.status;

  const completed =
    smartStatus === 'completed' ||
    stage === 'closed';

  const requiresAttention =
    smartStatus === 'attention_required' ||
    action.priority === 'attention_required' ||
    action.priority === 'high' ||
    action.priority === 'critical';

  const statusLabel = completed
    ? 'Concluído'
    : STATUS_LABELS[smartStatus] ||
      (requiresAttention
        ? 'Atenção necessária'
        : 'Recomendado');

  const handleContinue = () => {
    if (!onContinue) {
      return;
    }

    onContinue(
      action.destinationTab ||
        'summary'
    );
  };

  return (
    <Card
      className={[
        'overflow-hidden rounded-3xl border shadow-sm',
        completed
          ? 'border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/70'
          : requiresAttention
          ? 'border-amber-200/80 bg-gradient-to-br from-white to-amber-50/70'
          : 'border-slate-200/80 bg-gradient-to-br from-white to-cyan-50/60',
      ].join(' ')}
    >
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
                : requiresAttention
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-cyan-200 bg-cyan-50 text-cyan-700'
            }
          >
            {requiresAttention && !completed && (
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
            )}

            {completed && (
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            )}

            {statusLabel}
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
                : requiresAttention
                ? 'bg-amber-100 text-amber-700'
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
              variant={
                completed
                  ? 'outline'
                  : 'default'
              }
              className="mt-4 rounded-xl"
              onClick={handleContinue}
              data-testid="workflow-continue-btn"
            >
              {completed
                ? 'Abrir resumo'
                : 'Continuar'}

              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <p className="mt-2 text-xs text-slate-400">
              Destino: {action.destination}
            </p>

            {smartAction && (
              <p className="mt-1 text-xs text-slate-400">
                Recomendação calculada automaticamente pelo Workflow Intelligence.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
