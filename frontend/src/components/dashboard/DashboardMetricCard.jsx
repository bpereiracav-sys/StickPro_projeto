import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';

const tones = {
  primary: {
    card: 'from-white via-cyan-50/70 to-slate-50 border-cyan-100',
    icon: 'from-cyan-500 to-blue-500 text-white',
  },
  secondary: {
    card: 'from-white via-emerald-50/70 to-slate-50 border-emerald-100',
    icon: 'from-emerald-500 to-teal-500 text-white',
  },
  amber: {
    card: 'from-white via-amber-50/80 to-slate-50 border-amber-100',
    icon: 'from-amber-500 to-yellow-500 text-white',
  },
  purple: {
    card: 'from-white via-purple-50/70 to-slate-50 border-purple-100',
    icon: 'from-purple-500 to-indigo-500 text-white',
  },
};

export function DashboardMetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = 'primary',
  to,
  className = '',
}) {
  const currentTone = tones[tone] || tones.primary;

  const content = (
    <Card
      className={cn(
        `group relative overflow-hidden border bg-gradient-to-br ${currentTone.card} shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80`,
        className
      )}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/80 blur-2xl"
        aria-hidden="true"
      />

      <CardContent className="relative p-3 sm:p-4 lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className={`rounded-xl bg-gradient-to-br p-2.5 shadow-lg sm:rounded-2xl sm:p-3 ${currentTone.icon}`}>
            {Icon && <Icon className="h-4 w-4 sm:h-5 sm:w-5" />}
          </div>

          {to && (
            <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-700" />
          )}
        </div>

        <div className="mt-3 sm:mt-4">
          <p className="font-heading text-3xl leading-none tracking-tight text-slate-950 sm:text-5xl">
            {value}
          </p>

          <p className="mt-1 truncate text-xs font-semibold text-slate-700 sm:text-sm">
            {label}
          </p>

          {helper && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5">
              {helper}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!to) return content;

  return (
    <Link to={to} className="block">
      {content}
    </Link>
  );
}

export default DashboardMetricCard;
