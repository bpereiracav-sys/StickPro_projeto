import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Link2,
  RefreshCw,
  ShieldAlert,
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

  conflict: {
    label: 'Conflito',
    icon: ShieldAlert,
    className:
      'border-orange-200 bg-orange-50 text-orange-700',
  },

  manual_override: {
    label: 'Alterado',
    icon: ShieldAlert,
    className:
      'border-violet-200 bg-violet-50 text-violet-700',
  },

  error: {
    label: 'Erro',
    icon: AlertTriangle,
    className:
      'border-red-200 bg-red-50 text-red-700',
  },

  // Compatibilidade com estados antigos.
  imported: {
    label: 'Importado',
    icon: CheckCircle2,
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
};

const SOURCE_LABELS = {
  manual: 'Manual',
  apl: 'APL',
  fpp: 'FPP',
  fpp_live: 'FPP',
  official: 'Oficial',
};

function parseDate(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatRelativeTime(value) {
  const date = parseDate(value);

  if (!date) return null;

  const now = new Date();
  const differenceMs = now.getTime() - date.getTime();
  const differenceSeconds = Math.max(
    0,
    Math.floor(differenceMs / 1000)
  );

  if (differenceSeconds < 30) {
    return 'agora';
  }

  if (differenceSeconds < 60) {
    return `há ${differenceSeconds} s`;
  }

  const differenceMinutes = Math.floor(
    differenceSeconds / 60
  );

  if (differenceMinutes < 60) {
    return `há ${differenceMinutes} min`;
  }

  const differenceHours = Math.floor(
    differenceMinutes / 60
  );

  if (differenceHours < 24) {
    return `há ${differenceHours} h`;
  }

  const differenceDays = Math.floor(
    differenceHours / 24
  );

  if (differenceDays === 1) {
    return 'ontem';
  }

  if (differenceDays < 7) {
    return `há ${differenceDays} dias`;
  }

  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function formatExactDate(value) {
  const date = parseDate(value);

  if (!date) return null;

  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export default function MatchSyncBadge({
  status = 'manual',
  source = 'manual',
  lastSyncedAt = null,
  lastSyncError = null,
  showTime = true,
  className = '',
}) {
  const config =
    STATUS_CONFIG[status] ||
    STATUS_CONFIG.manual;

  const Icon = config.icon;

  const sourceLabel =
    SOURCE_LABELS[source] ||
    String(source || 'Manual').toUpperCase();

  const relativeTime =
    showTime && status !== 'manual'
      ? formatRelativeTime(lastSyncedAt)
      : null;

  const exactTime = formatExactDate(
    lastSyncedAt
  );

  const tooltipParts = [
    `Estado: ${config.label}`,
    `Origem: ${sourceLabel}`,
  ];

  if (exactTime) {
    tooltipParts.push(
      `Última sincronização: ${exactTime}`
    );
  }

  if (lastSyncError) {
    tooltipParts.push(
      `Erro: ${lastSyncError}`
    );
  }

  return (
    <span
      className={[
        'inline-flex min-h-7 shrink-0 items-center gap-1.5',
        'rounded-lg border px-2 py-1 text-[11px] font-medium',
        'whitespace-nowrap',
        config.className,
        className,
      ].join(' ')}
      data-testid="match-sync-badge"
      title={tooltipParts.join(' · ')}
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

      {relativeTime && (
        <>
          <span
            aria-hidden="true"
            className="opacity-40"
          >
            ·
          </span>

          <span className="font-normal opacity-80">
            {relativeTime}
          </span>
        </>
      )}
    </span>
  );
}
