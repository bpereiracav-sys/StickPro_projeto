import { Badge } from '../ui/badge';

const STATUS_STYLES = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  archived: 'border-slate-200 bg-slate-100 text-slate-600',
  draft: 'border-amber-200 bg-amber-50 text-amber-700',
  info: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  danger: 'border-red-200 bg-red-50 text-red-700',
};

export function StatusBadge({
  status = 'info',
  children,
  className = '',
}) {
  const statusClassName = STATUS_STYLES[status] || STATUS_STYLES.info;

  return (
    <Badge
      variant="outline"
      className={`${statusClassName} ${className}`}
    >
      {children}
    </Badge>
  );
}

export default StatusBadge;
