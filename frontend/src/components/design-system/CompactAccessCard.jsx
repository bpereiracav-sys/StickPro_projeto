import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

export function CompactAccessCard({
  status,
  title,
  subtitle,
  meta,
  icon: Icon,
  href,
  actionLabel = 'Abrir',
  actions,
  testId,
}) {
  return (
    <Card
      className="group overflow-visible border-white/80 bg-white/95 shadow-sm shadow-slate-200/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/80"
      data-testid={testId}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {status && <div className="mb-4">{status}</div>}

            <h3 className="line-clamp-2 font-heading text-xl font-semibold leading-tight text-slate-950">
              {title}
            </h3>

            {subtitle && (
              <p className="mt-2 truncate text-sm font-semibold text-slate-600">
                {subtitle}
              </p>
            )}

            {meta && (
              <p className="mt-1 text-sm text-slate-400">
                {meta}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-start gap-1">
            {Icon && (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
            )}

            {actions}
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <Button
            asChild
            className="w-full rounded-2xl sm:w-auto"
          >
            <Link to={href}>
              {actionLabel}
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default CompactAccessCard;
