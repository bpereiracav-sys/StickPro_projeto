import { Link } from 'react-router-dom';
import { Badge } from '../ui/badge';
import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export function DashboardHero({
  title,
  subtitle,
  badge = 'StickPro Club OS',
  meta = [],
  actions,
  className = '',
}) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-slate-950 p-4 text-white shadow-xl shadow-slate-200/70 sm:p-5 lg:rounded-[2rem] lg:p-6',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.32),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.28),transparent_32%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {badge && (
            <Badge className="mb-3 border border-white/15 bg-white/10 px-3 py-1 text-white backdrop-blur">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {badge}
            </Badge>
          )}

          <h1 className="font-heading text-2xl leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-2 line-clamp-2 max-w-2xl text-xs leading-5 text-slate-300 sm:text-sm lg:line-clamp-none">
              {subtitle}
            </p>
          )}

          {meta.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300 sm:text-sm">
              {meta.map((item, index) => {
                const Icon = item.icon;
                const content = (
                  <>
                    {Icon && <Icon className={`h-4 w-4 ${item.iconClass || ''}`} />}
                    {item.text}
                  </>
                );

                if (item.to) {
                  return (
                    <Link
                      key={`${item.text}-${index}`}
                      to={item.to}
                      className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/15"
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <span
                    key={`${item.text}-${index}`}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5"
                  >
                    {content}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </section>
  );
}

export default DashboardHero;
