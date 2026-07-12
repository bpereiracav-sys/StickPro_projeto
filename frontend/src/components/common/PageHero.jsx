import { Badge } from '../ui/badge';

const TONE_CLASSES = {
  default:
    'from-slate-950 via-slate-900 to-cyan-950',

  primary:
    'from-slate-950 via-slate-900 to-primary/90',

  cyan:
    'from-slate-950 via-cyan-950 to-sky-950',

  emerald:
    'from-slate-950 via-emerald-950 to-teal-950',

  violet:
    'from-slate-950 via-violet-950 to-indigo-950',

  amber:
    'from-slate-950 via-amber-950 to-orange-950',
};

export default function PageHero({
  badge,
  badgeIcon: BadgeIcon,
  title,
  description,
  actions,
  metrics = [],
  tone = 'primary',
  compact = false,
  className = '',
  testId,
}) {
  const toneClass =
    TONE_CLASSES[tone] ||
    TONE_CLASSES.primary;

  const visibleMetrics = Array.isArray(metrics)
    ? metrics.filter(
        (metric) =>
          metric &&
          metric.label &&
          metric.value !== undefined &&
          metric.value !== null
      )
    : [];

  return (
    <section
      className={[
        'relative overflow-hidden border border-white/70 text-white',
        'bg-gradient-to-br shadow-xl shadow-slate-200/70',
        compact
          ? 'rounded-[1.5rem] p-4 sm:p-5'
          : 'rounded-[1.75rem] p-5 sm:p-6 lg:rounded-[2rem] lg:p-7',
        toneClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={testId}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-300/15 blur-3xl"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-white/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            {badge && (
              <Badge className="mb-3 border-white/20 bg-white/10 text-white hover:bg-white/10">
                {BadgeIcon && (
                  <BadgeIcon className="mr-1.5 h-3.5 w-3.5" />
                )}

                {badge}
              </Badge>
            )}

            <h1
              className={[
                'font-heading font-bold tracking-tight text-white',
                compact
                  ? 'text-2xl sm:text-3xl'
                  : 'text-3xl sm:text-4xl',
              ].join(' ')}
            >
              {title}
            </h1>

            {description && (
              <p
                className={[
                  'mt-2 max-w-3xl text-white/75',
                  compact
                    ? 'text-sm leading-5'
                    : 'text-sm leading-6 sm:text-base',
                ].join(' ')}
              >
                {description}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </div>

        {visibleMetrics.length > 0 && (
          <div
            className={[
              'grid gap-3',
              visibleMetrics.length === 1
                ? 'grid-cols-1'
                : visibleMetrics.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-2 lg:grid-cols-4',
              compact ? 'mt-4' : 'mt-6',
            ].join(' ')}
          >
            {visibleMetrics.map((metric, index) => {
              const MetricIcon = metric.icon;

              return (
                <div
                  key={metric.id || metric.label || index}
                  className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur sm:p-4"
                >
                  <div className="flex items-center gap-2">
                    {MetricIcon && (
                      <MetricIcon
                        className={[
                          'h-4 w-4',
                          metric.iconClassName || 'text-cyan-200',
                        ].join(' ')}
                      />
                    )}

                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60 sm:text-xs">
                      {metric.label}
                    </p>
                  </div>

                  <p className="mt-1 text-xl font-bold text-white sm:text-2xl">
                    {metric.value}
                  </p>

                  {metric.helper && (
                    <p className="mt-1 text-xs text-white/55">
                      {metric.helper}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
