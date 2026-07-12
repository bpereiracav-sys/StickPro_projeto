import { Badge } from '../ui/badge';

const STATUS_STYLES = {
  active: {
    label: 'Ativa',
    dotClassName: 'bg-emerald-500',
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
  },

  ongoing: {
    label: 'Em curso',
    dotClassName: 'bg-emerald-500',
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
  },

  upcoming: {
    label: 'Por iniciar',
    dotClassName: 'bg-amber-500',
    className:
      'border-amber-200 bg-amber-50 text-amber-700',
  },

  completed: {
    label: 'Terminada',
    dotClassName: 'bg-slate-400',
    className:
      'border-slate-200 bg-slate-100 text-slate-600',
  },

  archived: {
    label: 'Arquivada',
    dotClassName: 'bg-slate-300',
    className:
      'border-slate-200 bg-slate-50 text-slate-500',
  },

  cancelled: {
    label: 'Cancelada',
    dotClassName: 'bg-red-500',
    className:
      'border-red-200 bg-red-50 text-red-700',
  },

  postponed: {
    label: 'Adiada',
    dotClassName: 'bg-amber-500',
    className:
      'border-amber-200 bg-amber-50 text-amber-700',
  },

  draft: {
    label: 'Rascunho',
    dotClassName: 'bg-slate-400',
    className:
      'border-slate-200 bg-white text-slate-600',
  },
};

export default function StatusBadge({
  status = 'active',
  label,
  showDot = true,
  className = '',
}) {
  const statusMeta =
    STATUS_STYLES[status] ||
    STATUS_STYLES.active;

  return (
    <Badge
      variant="outline"
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
        statusMeta.className,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showDot && (
        <span
          className={[
            'h-1.5 w-1.5 rounded-full',
            statusMeta.dotClassName,
          ].join(' ')}
          aria-hidden="true"
        />
      )}

      {label || statusMeta.label}
    </Badge>
  );
}
