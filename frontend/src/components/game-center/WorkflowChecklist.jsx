import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileCheck2,
  Flag,
  MessageSquareText,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react';

import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const STAGE_INDEX = {
  draft: 0,
  convocation: 1,
  lineup: 2,
  ready: 3,
  live: 4,
  finished: 5,
  stats: 6,
  assistant: 7,
  evaluation: 8,
  feedback: 9,
  closed: 10,
};

const ITEMS = [
  {
    key: 'convocation',
    smartKey: 'convocation',
    label: 'Convocatória',
    requiredStage: 'convocation',
    icon: Users,
  },
  {
    key: 'lineup',
    smartKey: 'lineup',
    label: 'Cinco inicial',
    requiredStage: 'lineup',
    icon: ShieldCheck,
  },
  {
    key: 'result',
    smartKey: 'result',
    label: 'Resultado',
    requiredStage: 'finished',
    icon: Flag,
  },
  {
    key: 'stats',
    smartKey: 'statistics',
    label: 'Estatísticas',
    requiredStage: 'stats',
    icon: ClipboardCheck,
  },
  {
    key: 'assistant',
    smartKey: 'assistant',
    label: 'Assistente Técnico',
    requiredStage: 'assistant',
    icon: Bot,
  },
  {
    key: 'evaluation',
    smartKey: 'evaluations',
    label: 'Avaliações',
    requiredStage: 'evaluation',
    icon: Star,
  },
  {
    key: 'feedback',
    smartKey: 'feedback',
    label: 'Feedback',
    requiredStage: 'feedback',
    icon: MessageSquareText,
  },
  {
    key: 'closed',
    smartKey: 'closed',
    label: 'Jogo encerrado',
    requiredStage: 'closed',
    icon: FileCheck2,
  },
];

export default function WorkflowChecklist({
  workflow,
  smartWorkflow,
}) {
  const stage = workflow?.stage || 'draft';

  const currentIndex =
    STAGE_INDEX[stage] ?? 0;

  const hasSmartWorkflow = Boolean(
    smartWorkflow?.checks
  );

  const completedCount = hasSmartWorkflow
    ? Object.values(
        smartWorkflow.checks
      ).filter(
        (item) =>
          item.available !== false &&
          item.completed
      ).length
    : ITEMS.filter(
        (item) =>
          currentIndex >=
          STAGE_INDEX[item.requiredStage]
      ).length;

  const totalCount = hasSmartWorkflow
    ? Object.values(
        smartWorkflow.checks
      ).filter(
        (item) => item.available !== false
      ).length
    : ITEMS.length;

  return (
    <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-heading text-xl font-semibold tracking-tight text-slate-950">
            Checklist operacional
          </CardTitle>

          <Badge
            variant="outline"
            className="border-slate-200 bg-slate-50 text-slate-700"
          >
            {completedCount}/{totalCount}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
        {ITEMS.map((item) => {
          const Icon = item.icon;

          let completed;

          if (hasSmartWorkflow) {
            completed =
              smartWorkflow.checks?.[
                item.smartKey
              ]?.completed ?? false;
          } else {
            completed =
              currentIndex >=
              STAGE_INDEX[item.requiredStage];
          }

          const attention =
            hasSmartWorkflow &&
            smartWorkflow.primary_action?.destination ===
              item.key;

          return (
            <div
              key={item.key}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                completed
                  ? 'border-emerald-100 bg-emerald-50/70'
                  : attention
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-slate-100 bg-slate-50/70'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  completed
                    ? 'bg-emerald-100 text-emerald-700'
                    : attention
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-white text-slate-400'
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm font-semibold ${
                    completed
                      ? 'text-emerald-900'
                      : attention
                      ? 'text-amber-900'
                      : 'text-slate-700'
                  }`}
                >
                  {item.label}
                </p>

                {attention && (
                  <p className="mt-0.5 text-xs text-amber-700">
                    Requer atenção
                  </p>
                )}
              </div>

              {completed ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : attention ? (
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-slate-300" />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
