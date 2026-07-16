import {
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react';

function getOfficialSource(item) {
  const source = (
    item?.source ||
    item?.gamesheet_raw_data?.source ||
    ''
  )
    .trim()
    .toLowerCase();

  if (source === 'apl') {
    return {
      shortLabel: 'APL',
      label: 'APL Lisboa',
    };
  }

  if (source === 'fpp') {
    return {
      shortLabel: 'FPP',
      label: 'Federação de Patinagem de Portugal',
    };
  }

  if (source === 'official') {
    return {
      shortLabel: 'Oficial',
      label: 'Fonte oficial',
    };
  }

  return {
    shortLabel: 'Manual',
    label: 'Registo manual',
  };
}

function getOfficialUrl(item) {
  return (
    item?.official_match_url ||
    item?.gamesheet_url ||
    item?.source_url ||
    null
  );
}

function getVenue(item) {
  return (
    item?.venue ||
    item?.gamesheet_raw_data?.venue ||
    item?.location ||
    null
  );
}

function getReferee(item) {
  return (
    item?.referee ||
    item?.gamesheet_raw_data?.referee ||
    null
  );
}

function getCompetition(item) {
  return (
    item?.championship?.name ||
    item?.championship_name ||
    item?.competition_name ||
    item?.championship_title ||
    null
  );
}

function formatLastSync(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const now = new Date();

  const differenceMs =
    now.getTime() - date.getTime();

  const minutes = Math.max(
    0,
    Math.floor(
      differenceMs / 60000
    )
  );

  if (minutes < 1) {
    return 'Sincronizado agora';
  }

  if (minutes < 60) {
    return `Sincronizado há ${minutes} min`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `Sincronizado há ${hours} h`;
  }

  const days = Math.floor(
    hours / 24
  );

  if (days === 1) {
    return 'Sincronizado ontem';
  }

  return `Sincronizado há ${days} dias`;
}

export default function OfficialMatchInfo({
  match,
  compact = false,
}) {
  if (!match) return null;

  const source = getOfficialSource(match);
  const officialUrl = getOfficialUrl(match);
  const venue = getVenue(match);
  const referee = getReferee(match);
  const competition = getCompetition(match);

  const lastSyncLabel = formatLastSync(
    match?.last_synced_at
  );

  const isOfficial = Boolean(
    officialUrl ||
    match?.is_verified ||
    match?.sync_status === 'synced'
  );

  return (
    <div
      className={[
        'rounded-2xl border',
        isOfficial
          ? 'border-emerald-100 bg-emerald-50/60'
          : 'border-slate-200 bg-slate-50',
        compact ? 'p-3' : 'p-4',
      ].join(' ')}
      data-testid="official-match-info"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={[
              'flex h-8 w-8 items-center justify-center rounded-xl',
              isOfficial
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-200 text-slate-600',
            ].join(' ')}
          >
            {isOfficial ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
          </span>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Origem do jogo
            </p>

            <p className="text-sm font-semibold text-slate-950">
              {source.label}
            </p>
          </div>
        </div>

        <span
          className={[
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
            isOfficial
              ? 'border-emerald-200 bg-white text-emerald-700'
              : 'border-slate-200 bg-white text-slate-600',
          ].join(' ')}
        >
          {isOfficial && (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}

          {source.shortLabel}
        </span>
      </div>

      {lastSyncLabel && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Clock3 className="h-3.5 w-3.5" />

          <span>
            {lastSyncLabel}
          </span>
        </div>
      )}

      <div
        className={[
          'mt-4 grid gap-3',
          compact
            ? 'sm:grid-cols-2'
            : 'sm:grid-cols-2 lg:grid-cols-3',
        ].join(' ')}
      >
        {competition && (
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Building2 className="h-3.5 w-3.5" />
              Competição
            </p>

            <p className="mt-1 truncate text-sm font-semibold text-slate-900">
              {competition}
            </p>
          </div>
        )}

        {venue && (
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              Recinto
            </p>

            <p className="mt-1 truncate text-sm font-semibold text-slate-900">
              {venue}
            </p>
          </div>
        )}

        {referee && (
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <UserRoundCheck className="h-3.5 w-3.5" />
              Arbitragem
            </p>

            <p className="mt-1 truncate text-sm font-semibold text-slate-900">
              {referee}
            </p>
          </div>
        )}
      </div>

      {officialUrl && (
        <a
          href={officialUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 transition hover:text-emerald-800"
          onClick={(event) =>
            event.stopPropagation()
          }
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Consultar ficha oficial
        </a>
      )}
    </div>
  );
}
