import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Link2,
  RefreshCw,
} from 'lucide-react';

const STATUS_CONFIG = {
  manual: {
    label: 'Manual',
    icon: Link2,
    className:
      'border-slate-200 bg-slate-50 text-slate-600',
  },

  pending: {
    label: 'A aguardar',
    icon: Clock3,
    className:
      'border-amber-200 bg-amber-50 text-amber-700',
  },

  syncing: {
    label: 'A sincronizar',
    icon: RefreshCw,
    className:
      'border-cyan-200 bg-cyan-50 text-cyan-700',
  },

  synced: {
    label: 'Oficial',
    icon: CheckCircle2,
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
  },

  error: {
    label: 'Erro',
    icon: AlertTriangle,
    className:
      'border-red-200 bg-red-50 text-red-700',
  },
};

const SOURCE_LABELS = {
  manual: 'Manual',
  apl: 'APL',
  fpp: 'FPP',
  fpp_live: 'FPP',
  official: 'Oficial',
};

export default function MatchSyncBadge({
  status = 'manual',
  source = 'manual',
  className = '',
}) {
  const config =
    STATUS_CONFIG[status] ||
    STATUS_CONFIG.manual;

  const Icon = config.icon;

  const sourceLabel =
    SOURCE_LABELS[source] ||
    String(source || 'Manual').toUpperCase();

  return (
    <span
      className={[
        'inline-flex h-7 shrink-0 items-center gap-1.5',
        'rounded-lg border px-2 text-[11px] font-medium',
        'whitespace-nowrap',
        config.className,
        className,
      ].join(' ')}
      data-testid="match-sync-badge"
      title={`Estado da ficha: ${config.label} · Origem: ${sourceLabel}`}
    >
      <Icon
        className={[
          'h-3.5 w-3.5',
          status === 'syncing'
            ? 'animate-spin'
            : '',
        ].join(' ')}
      />

      <span>{config.label}</span>

      {source !== 'manual' && (
        <>
          <span
            aria-hidden="true"
            className="opacity-40"
          >
            ·
          </span>

          <span>{sourceLabel}</span>
        </>
      )}
    </span>
  );
}
