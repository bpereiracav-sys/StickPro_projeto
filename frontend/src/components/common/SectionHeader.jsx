import { cn } from '../../lib/utils';

export function SectionHeader({
  title,
  subtitle,
  actions,
  icon: Icon,
  className = '',
}) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Icon className="h-4 w-4" />
            </div>
          )}

          <h2 className="font-heading text-lg font-bold tracking-tight text-slate-950 sm:text-xl">
            {title}
          </h2>
        </div>

        {subtitle && (
          <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

export default SectionHeader;
