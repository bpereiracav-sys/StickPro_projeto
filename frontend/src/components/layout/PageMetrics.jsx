function MetricItem({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'primary',
}) {
  const toneClasses = {
    primary: 'bg-primary/10 text-primary',
    cyan: 'bg-cyan-50 text-cyan-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    violet: 'bg-violet-50 text-violet-700',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div
            className={[
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              toneClasses[tone] || toneClasses.primary,
            ].join(' ')}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}

        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-0.5 truncate text-xl font-bold text-slate-950 sm:text-2xl">
            {value}
          </p>

          {helper && (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
              {helper}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Grelha comum de indicadores.
 */
export default function PageMetrics({
  metrics = [],
  columns = 4,
  className = '',
  testId,
}) {
  const visibleMetrics = Array.isArray(metrics)
    ? metrics.filter(
        (metric) =>
          metric &&
          metric.label &&
          metric.value !== undefined &&
          metric.value !== null
      )
    : [];

  if (visibleMetrics.length === 0) {
    return null;
  }

  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-2 xl:grid-cols-4',
    5: 'grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5',
    6: 'grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6',
  };

  return (
    <div
      className={[
        'grid gap-3 sm:gap-4',
        columnClasses[columns] || columnClasses[4],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={testId}
    >
      {visibleMetrics.map((metric, index) => (
        <MetricItem
          key={metric.id || metric.label || index}
          label={metric.label}
          value={metric.value}
          helper={metric.helper}
          icon={metric.icon}
          tone={metric.tone}
        />
      ))}
    </div>
  );
}
