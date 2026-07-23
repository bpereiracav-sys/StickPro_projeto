import { Link } from 'react-router-dom';
import { Badge } from '../ui/badge';
import { ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export function DashboardHero({
  title,
  subtitle,
  badge = 'StickPro Club OS',
  meta = [],
  actions,
  className = '',
}) {
  const hasActions = Boolean(actions);

  return (
    <section
      className={cn(
        'group relative overflow-hidden rounded-[1.5rem] border border-slate-800/80 bg-slate-950 text-white shadow-xl shadow-slate-200/70',
        'lg:rounded-[2rem]',
        className
      )}
      data-testid="dashboard-hero"
    >
      {/* Background */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.30),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.26),transparent_34%)]"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/10"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -right-6 -top-10 h-36 w-36 rounded-full border border-white/10"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 p-4 sm:p-5 lg:p-7">
        <div
          className={cn(
            'flex flex-col gap-5',
            hasActions && 'lg:flex-row lg:items-end lg:justify-between'
          )}
        >
          <div className="min-w-0 max-w-4xl">
            {badge && (
              <Badge className="mb-3 inline-flex border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md hover:bg-white/10">
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-cyan-300" />
                {badge}
              </Badge>
            )}

            <h1 className="max-w-4xl font-heading text-2xl font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-5xl">
              {title}
            </h1>

            {subtitle && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:mt-3 sm:text-base">
                {subtitle}
              </p>
            )}

            {meta.length > 0 && (
              <div
                className="mt-4 flex flex-wrap items-center gap-2"
                aria-label="Resumo operacional"
              >
                {meta.map((item, index) => {
                  const Icon = item.icon;
                  const key = `${item.text || 'meta'}-${index}`;

                  const content = (
                    <>
                      {Icon && (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10">
                          <Icon
                            className={cn(
                              'h-3.5 w-3.5 text-slate-200',
                              item.iconClass
                            )}
                            aria-hidden="true"
                          />
                        </span>
                      )}

                      <span className="truncate">{item.text}</span>

                      {item.to && (
                        <ArrowRight
                          className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover/meta:translate-x-0.5 group-hover/meta:text-white"
                          aria-hidden="true"
                        />
                      )}
                    </>
                  );

                  if (item.to) {
                    return (
                      <Link
                        key={key}
                        to={item.to}
                        className={cn(
                          'group/meta inline-flex min-w-0 items-center gap-2 rounded-full',
                          'border border-white/10 bg-white/[0.08] px-2.5 py-1.5',
                          'text-xs font-medium text-slate-200 backdrop-blur-md',
                          'transition duration-200 hover:border-white/20 hover:bg-white/[0.14] hover:text-white',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                          'sm:px-3 sm:text-sm'
                        )}
                      >
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={key}
                      className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-1.5 text-xs font-medium text-slate-200 backdrop-blur-md sm:px-3 sm:text-sm"
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {hasActions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
              {actions}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default DashboardHero;
