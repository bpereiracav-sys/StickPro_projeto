import { cn } from '../../lib/utils';
import { BackButton } from './BackButton';

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  icon: Icon,
  actions,
  showBack = false,
  backLabel = 'Voltar',
  backFallbackPath = '/dashboard',
  className = '',
}) {
  return (
    <div className={cn('mb-5 space-y-4 sm:mb-6', className)}>
      {showBack && (
        <BackButton label={backLabel} fallbackPath={backFallbackPath} />
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              {eyebrow}
            </p>
          )}

          <div className="flex min-w-0 items-center gap-3">
            {Icon && (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
                <Icon className="h-5 w-5" />
              </div>
            )}

            <div className="min-w-0">
              <h1 className="truncate font-heading text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {title}
              </h1>

              {subtitle && (
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default PageHeader;
