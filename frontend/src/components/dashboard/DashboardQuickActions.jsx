import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export function DashboardQuickActions({ actions = [], className = '' }) {
  if (!actions.length) return null;

  return (
    <div className={cn('grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6', className)}>
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <Link
            key={action.to || action.label}
            to={action.to}
            className="group rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {Icon && <Icon className="h-5 w-5" />}
              </div>

              <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-primary" />
            </div>

            <p className="mt-3 truncate text-sm font-bold text-slate-950">
              {action.label}
            </p>

            {action.description && (
              <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-500">
                {action.description}
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export default DashboardQuickActions;
