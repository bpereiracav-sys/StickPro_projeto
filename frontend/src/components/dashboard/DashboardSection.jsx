import { cn } from '../../lib/utils';

export function DashboardSection({ title, subtitle, icon: Icon, action, children, className = '' }) {
  return (
    <section className={cn('space-y-3', className)}>
      {(title || subtitle || action) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {Icon && (
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              )}
              {title && (
                <h2 className="font-heading text-lg font-bold text-slate-950 sm:text-xl">
                  {title}
                </h2>
              )}
            </div>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      {children}
    </section>
  );
}

export default DashboardSection;
