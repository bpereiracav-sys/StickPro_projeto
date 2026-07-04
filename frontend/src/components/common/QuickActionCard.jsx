import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

export function QuickActionCard({
  title,
  description,
  icon: Icon,
  href,
  onClick,
  badge,
  disabled = false,
  className = '',
}) {
  const content = (
    <div
      className={cn(
        'group flex h-full items-start gap-3 rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:p-5',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      data-testid="quick-action-card"
    >
      {Icon && (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-base font-bold text-slate-950 sm:text-lg">
            {title}
          </h3>

          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>

        {description && (
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
            {description}
          </p>
        )}

        {badge && (
          <div className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {badge}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block h-full">
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="block h-full w-full"
    >
      {content}
    </button>
  );
}

export default QuickActionCard;
