import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Gauge,
  Sparkles,
} from 'lucide-react';

import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

const STAGE_LABELS = {
  draft: 'Pré-convocatória',
  convocation: 'Convocatória',
  lineup: 'Line-up definido',
  ready: 'Pronto para iniciar',
  live: 'Jogo ao vivo',
  finished: 'Jogo terminado',
  stats: 'Estatísticas validadas',
  assistant: 'Assistente atualizado',
  evaluation: 'Avaliações concluídas',
  feedback: 'Feedback concluído',
  closed: 'Jogo encerrado',
};

const STAGE_TONES = {
  draft: 'border-slate-200 bg-slate-50 text-slate-700',
  convocation: 'border-blue-200 bg-blue-50 text-blue-700',
  lineup: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  ready: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  live: 'border-red-200 bg-red-50 text-red-700',
  finished: 'border-amber-200 bg-amber-50 text-amber-700',
  stats: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  assistant: 'border-violet-200 bg-violet-50 text-violet-700',
  evaluation: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
  feedback: 'border-teal-200 bg-teal-50 text-teal-700',
  closed: 'border-yellow-200 bg-yellow-50 text-yellow-800',
};

const SMART_STATUS_LABELS = {
  attention_required: 'Atenção necessária',
  in_progress: 'Em progresso',
  ready_to_close: 'Pronto para encerrar',
  completed: 'Concluído',
  unavailable: 'Indisponível',
};

const SMART_STATUS_TONES = {
  attention_required: 'border-amber-200 bg-amber-50 text-amber-800',
  in_progress: 'border-blue-200 bg-blue-50 text-blue-700',
  ready_to_close: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  completed: 'border-green-200 bg-green-50 text-green-700',
  unavailable: 'border-slate-200 bg-slate-50 text-slate-600',
};

function formatRelativeDate(value) {
  if (!value) return 'Sem atualização registada';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Atualização registada';
  }

  const diffMinutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000)
  );

  if (diffMinutes < 1) return 'Atualizado agora';
  if (diffMinutes < 60) return `Atualizado há ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) return `Atualizado há ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);

  return `Atualizado há ${diffDays} dia${diffDays === 1 ? '' : 's'}`;
}

export default function MatchWorkflowHero({
  workflow,
  smartWorkflow,
}) {
  const stage = workflow?.stage || 'draft';

  const hasSmartWorkflow = Boolean(
    smartWorkflow &&
    smartWorkflow.status !== 'unavailable'
  );

  const progress = hasSmartWorkflow
    ? Number(smartWorkflow?.score ?? 0)
    : Number(workflow?.progress ?? 0);

  const safeProgress = Math.min(
    100,
    Math.max(0, progress)
  );

  const stageLabel =
    workflow?.label ||
    STAGE_LABELS[stage] ||
    'Pré-convocatória';

  const smartStatus = smartWorkflow?.status;
  const smartStatusLabel =
    SMART_STATUS_LABELS[smartStatus];

  const primaryAction =
    smartWorkflow?.primary_action;

  const completedChecks =
    smartWorkflow?.summary?.completed_checks;

  const totalChecks =
    smartWorkflow?.summary?.total_checks;

  const updatedAt =
    smartWorkflow?.generated_at ||
    workflow?.updated_at;

  const showAttentionIcon =
    smartStatus === 'attention_required';

  const showCompletedIcon =
    smartStatus === 'completed' ||
    stage === 'closed';

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-white via-cyan-50/50 to-emerald-50/40 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Gauge className="h-5 w-5" />
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Workflow do jogo
                </p>

                <Badge
                  variant="outline"
                  className={
                    STAGE_TONES[stage] ||
                    STAGE_TONES.draft
                  }
                >
                  {stage === 'live' ? (
                    <Activity className="mr-1.5 h-3.5 w-3.5" />
                  ) : showCompletedIcon ? (
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  ) : (
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  )}

                  {stageLabel}
                </Badge>

                {hasSmartWorkflow && smartStatusLabel && (
                  <Badge
                    variant="outline"
                    className={
                      SMART_STATUS_TONES[smartStatus] ||
                      SMART_STATUS_TONES.in_progress
                    }
                  >
                    {showAttentionIcon ? (
                      <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                    ) : showCompletedIcon ? (
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    ) : (
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    )}

                    {smartStatusLabel}
                  </Badge>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                <p className="font-heading text-3xl font-bold tracking-tight text-slate-950">
                  {safeProgress}%
                </p>

                <p className="pb-1 text-sm text-slate-500">
                  concluído
                </p>

                {hasSmartWorkflow &&
                  Number.isFinite(completedChecks) &&
                  Number.isFinite(totalChecks) && (
                    <p className="pb-1 text-sm text-slate-400">
                      {completedChecks} de {totalChecks} etapas
                    </p>
                  )}
              </div>

              {hasSmartWorkflow && primaryAction?.title && (
                <p className="mt-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">
                    Próxima ação:
                  </span>{' '}
                  {primaryAction.title}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock3 className="h-4 w-4" />
            {formatRelativeDate(updatedAt)}
          </div>
        </div>

        <div className="mt-5">
          <Progress
            value={safeProgress}
            className="h-3 bg-slate-200/80"
          />

          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Preparação</span>
            <span>Encerramento</span>
          </div>
        </div>
      </div>
    </section>
  );
}
