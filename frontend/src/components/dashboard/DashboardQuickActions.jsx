import { Link } from 'react-router-dom';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

const ACTION_TONES = [
  {
    icon: 'bg-cyan-50 text-cyan-700',
    border: 'hover:border-cyan-200',
    glow: 'group-hover:bg-cyan-100/60',
    arrow: 'group-hover:text-cyan-700',
  },
  {
    icon: 'bg-violet-50 text-violet-700',
    border: 'hover:border-violet-200',
    glow: 'group-hover:bg-violet-100/60',
    arrow: 'group-hover:text-violet-700',
  },
  {
    icon: 'bg-emerald-50 text-emerald-700',
    border: 'hover:border-emerald-200',
    glow: 'group-hover:bg-emerald-100/60',
    arrow: 'group-hover:text-emerald-700',
  },
  {
    icon: 'bg-amber-50 text-amber-700',
    border: 'hover:border-amber-200',
    glow: 'group-hover:bg-amber-100/60',
    arrow: 'group-hover:text-amber-700',
  },
  {
    icon: 'bg-blue-50 text-blue-700',
    border: 'hover:border-blue-200',
    glow: 'group-hover:bg-blue-100/60',
    arrow: 'group-hover:text-blue-700',
  },
  {
    icon: 'bg-rose-50 text-rose-700',
    border: 'hover:border-rose-200',
    glow: 'group-hover:bg-rose-100/60',
    arrow: 'group-hover:text-rose-700',
  },
];

function QuickActionCard({
  action,
  index,
  isPrimary = false,
}) {
  const Icon = action.icon;
  const tone = ACTION_TONES[index % ACTION_TONES.length];

  return (
    <Link
      to={action.to}
      className={cn(
        'group relative flex min-h-[112px] flex-col justify-between overflow-hidden rounded-2xl border p-4',
        'transition duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isPrimary
          ? [
              'border-slate-800 bg-slate-950 text-white',
              'shadow-lg shadow-slate-200/80',
              'hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-xl',
            ]
          : [
              'border-slate-200 bg-white',
              'hover:-translate-y-0.5 hover:bg-slate-50/60 hover:shadow-md hover:shadow-slate-200/70',
              tone.border,
            ]
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full transition duration-300',
          isPrimary
            ? 'bg-cyan-400/10 group-hover:bg-cyan-400/20'
            : cn('bg-transparent', tone.glow)
        )}
        aria-hidden="true"
      />

      {isPrimary && (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.17),transparent_40%)]"
          aria-hidden="true"
        />
      )}

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
            isPrimary
              ? 'bg-white/10 text-cyan-300 ring-1 ring-white/10'
              : tone.icon
          )}
        >
          {Icon ? (
            <Icon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          )}
        </div>

        <ArrowUpRight
          className={cn(
            'h-4 w-4 shrink-0 transition duration-200',
            'group-hover:-translate-y-0.5 group-hover:translate-x-0.5',
            isPrimary
              ? 'text-slate-500 group-hover:text-white'
              : cn('text-slate-300', tone.arrow)
          )}
          aria-hidden="true"
        />
      </div>

      <div className="relative z-10 mt-4 min-w-0">
        <p
          className={cn(
            'truncate text-sm font-bold',
            isPrimary ? 'text-white' : 'text-slate-950'
          )}
        >
          {action.label}
        </p>

        {action.description && (
          <p
            className={cn(
              'mt-1 line-clamp-2 text-xs leading-5',
              isPrimary ? 'text-slate-300' : 'text-slate-500'
            )}
          >
            {action.description}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function DashboardQuickActions({
  actions = [],
  title = 'Ações rápidas',
  subtitle = 'Aceda rapidamente às funcionalidades mais utilizadas.',
}) {
  const visibleActions = Array.isArray(actions)
    ? actions.filter((action) => action?.to && action?.label).slice(0, 6)
    : [];

  if (visibleActions.length === 0) return null;

  return (
    <section
      className="rounded-[1.5rem] border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-200/70 sm:p-5"
      aria-labelledby="dashboard-quick-actions-title"
      data-testid="dashboard-quick-actions"
    >
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            StickPro
          </p>

          <h2
            id="dashboard-quick-actions-title"
            className="mt-1 font-heading text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
          >
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div
        className={cn(
          'grid gap-3',
          visibleActions.length === 1 && 'grid-cols-1',
          visibleActions.length === 2 && 'grid-cols-1 sm:grid-cols-2',
          visibleActions.length >= 3 &&
            'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
        )}
      >
        {visibleActions.map((action, index) => (
          <QuickActionCard
            key={`${action.to}-${action.label}`}
            action={action}
            index={index}
            isPrimary={index === 0}
          />
        ))}
      </div>
    </section>
  );
}
