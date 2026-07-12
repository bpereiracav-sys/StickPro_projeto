import { ChevronRight } from 'lucide-react';

import { Button } from '../ui/button';
import StatusBadge from './StatusBadge';
import CardActionMenu from './CardActionMenu';

const TONE_STYLES = {
  active: {
    stripe: 'bg-gradient-to-b from-emerald-400 to-cyan-500',
    icon: 'bg-emerald-50 text-emerald-700',
  },

  completed: {
    stripe: 'bg-gradient-to-b from-slate-300 to-slate-400',
    icon: 'bg-slate-100 text-slate-600',
  },

  archived: {
    stripe: 'bg-slate-300',
    icon: 'bg-slate-100 text-slate-500',
  },

  upcoming: {
    stripe: 'bg-gradient-to-b from-amber-300 to-orange-400',
    icon: 'bg-amber-50 text-amber-700',
  },

  default: {
    stripe: 'bg-gradient-to-b from-primary to-cyan-500',
    icon: 'bg-primary/10 text-primary',
  },
};

export default function CompactAccessCard({
  title,
  subtitle,
  meta = [],
  status = 'active',
  statusLabel,
  icon: Icon,
  primaryActionLabel = 'Abrir',
  onPrimaryAction,
  primaryActionHref,
  renderLink,
  menuActions = [],
  className = '',
  testId,
}) {
  const tone =
    TONE_STYLES[status] ||
    TONE_STYLES.default;

  const visibleMeta = Array.isArray(meta)
    ? meta.filter(Boolean)
    : [];

  const actionContent = (
    <>
      <span>{primaryActionLabel}</span>
      <ChevronRight className="ml-1 h-4 w-4" />
    </>
  );

  return (
    <article
      className={[
        'group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/70',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={testId}
    >
      <div
        className={[
          'absolute inset-y-0 left-0 w-1',
          tone.stripe,
        ].join(' ')}
        aria-hidden="true"
      />

      <div className="flex min-h-[132px] flex-col p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <div
                className={[
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  tone.icon,
                ].join(' ')}
              >
                <Icon className="h-5 w-5" />
              </div>
            )}

            <div className="min-w-0">
              <StatusBadge
                status={status}
                label={statusLabel}
              />

              <h3 className="mt-2 line-clamp-2 font-heading text-base font-semibold leading-5 text-slate-950">
                {title}
              </h3>

              {subtitle && (
                <p className="mt-1 truncate text-sm font-medium text-slate-500">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <CardActionMenu
            actions={menuActions}
          />
        </div>

        {visibleMeta.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            {visibleMeta.map((item, index) => (
              <span
                key={`${item}-${index}`}
                className="inline-flex items-center"
              >
                {index > 0 && (
                  <span className="mr-2 text-slate-300">
                    •
                  </span>
                )}

                {item}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex justify-end pt-3">
          {primaryActionHref && renderLink ? (
            renderLink({
              href: primaryActionHref,
              children: (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-xl px-3 text-xs"
                >
                  {actionContent}
                </Button>
              ),
            })
          ) : (
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-xl px-3 text-xs"
              onClick={onPrimaryAction}
            >
              {actionContent}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
