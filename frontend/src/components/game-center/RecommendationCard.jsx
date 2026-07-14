import {
  ArrowRight,
  CircleAlert,
  Info,
  TriangleAlert,
} from 'lucide-react';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

const PRIORITY_CONFIG = {
  high: {
    label: 'Alta',
    icon: CircleAlert,
    badgeClass: 'border-red-200 bg-red-50 text-red-700',
    iconClass: 'bg-red-100 text-red-700',
  },
  medium: {
    label: 'Média',
    icon: TriangleAlert,
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
    iconClass: 'bg-amber-100 text-amber-700',
  },
  info: {
    label: 'Informação',
    icon: Info,
    badgeClass: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    iconClass: 'bg-cyan-100 text-cyan-700',
  },
};

export default function RecommendationCard({
  recommendation,
  onExecute,
}) {
  const priority =
    PRIORITY_CONFIG[recommendation.priority] ||
    PRIORITY_CONFIG.info;

  const PriorityIcon = priority.icon;
  const Icon = recommendation.icon;

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md">
      <div className="flex items-start gap-3">
        <span
          className={[
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
            priority.iconClass,
          ].join(' ')}
        >
          {Icon ? (
            <Icon className="h-5 w-5" />
          ) : (
            <PriorityIcon className="h-5 w-5" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-950">
              {recommendation.title}
            </h3>

            <Badge
              variant="outline"
              className={priority.badgeClass}
            >
              <PriorityIcon className="mr-1 h-3.5 w-3.5" />
              {priority.label}
            </Badge>
          </div>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            {recommendation.description}
          </p>

          {recommendation.actionLabel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 rounded-xl"
              onClick={() =>
                onExecute?.(recommendation.destinationTab)
              }
              data-testid={`smart-recommendation-${recommendation.id}`}
            >
              {recommendation.actionLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
