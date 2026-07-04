import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
  className = '',
}) {
  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center',
        className
      )}
      data-testid="empty-state"
    >
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
          <Icon className="h-7 w-7" />
        </div>
      )}

      <h3 className="font-heading text-lg font-bold text-slate-950">
        {title}
      </h3>

      {description && (
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          {description}
        </p>
      )}

      {action ? (
        <div className="mt-5">{action}</div>
      ) : actionLabel && onAction ? (
        <Button type="button" onClick={onAction} className="mt-5 rounded-full">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default EmptyState;
