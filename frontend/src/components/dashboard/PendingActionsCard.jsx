import { Link } from 'react-router-dom';
import {
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

function PendingConvocationItem({
  item,
  updatingConvocation,
  onUpdateConvocation,
  getEventDayLink,
  formatTime,
  format,
  dateLocale,
  tr,
}) {
  const attendanceId =
    item?.attendance_id ||
    item?.attendance?.id ||
    item?.id;

  const event =
    item?.event ||
    item?.convocation?.event ||
    item;

  const eventDate = event?.start_time
    ? new Date(event.start_time)
    : null;

  const isUpdating = updatingConvocation === attendanceId;

  const eventLink =
    typeof getEventDayLink === 'function'
      ? getEventDayLink(event)
      : '/calendar?view=agenda';

  const eventTitle =
    event?.title ||
    tr('calendar.event', 'Evento');

  const dateLabel = eventDate
    ? format(eventDate, 'EEE, d MMM', {
        locale: dateLocale,
      })
    : tr(
        'dashboard.dateUnavailable',
        'Data por definir'
      );

  const timeLabel = event?.start_time
    ? formatTime(event.start_time)
    : tr(
        'dashboard.timeUnavailable',
        'Horário por definir'
      );

  return (
    <article
      className={cn(
        'group rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5',
        'transition duration-200',
        'hover:border-amber-200 hover:bg-white hover:shadow-md hover:shadow-slate-200/60'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <CalendarClock
            className="h-5 w-5"
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-950">
                {eventTitle}
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                {dateLabel} · {timeLabel}
              </p>
            </div>

            <span className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              {tr(
                'dashboard.awaitingResponseShort',
                'Pendente'
              )}
            </span>
          </div>

          {event?.location && (
            <p className="mt-2 truncate text-xs text-slate-500">
              {event.location}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          size="sm"
          disabled={isUpdating || !attendanceId}
          onClick={() =>
            onUpdateConvocation(
              attendanceId,
              'confirmado'
            )
          }
          className="h-9 flex-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {isUpdating ? (
            <Clock3 className="mr-2 h-4 w-4 animate-pulse" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}

          {tr(
            'attendance.available',
            'Estou disponível'
          )}
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isUpdating || !attendanceId}
          onClick={() =>
            onUpdateConvocation(
              attendanceId,
              'ausente'
            )
          }
          className="h-9 flex-1 rounded-xl border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
        >
          {isUpdating ? (
            <Clock3 className="mr-2 h-4 w-4 animate-pulse" />
          ) : (
            <X className="mr-2 h-4 w-4" />
          )}

          {tr(
            'attendance.unavailable',
            'Não estou disponível'
          )}
        </Button>
      </div>

      <Link
        to={eventLink}
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-primary"
      >
        {tr(
          'dashboard.viewEventDetails',
          'Ver detalhes do evento'
        )}

        <ChevronRight
          className="h-3.5 w-3.5"
          aria-hidden="true"
        />
      </Link>
    </article>
  );
}

function EmptyPendingState({ tr }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        <CheckCircle2
          className="h-7 w-7"
          aria-hidden="true"
        />
      </div>

      <h3 className="mt-4 font-heading text-base font-bold text-slate-950">
        {tr(
          'dashboard.noPendingActions',
          'Não existem ações pendentes'
        )}
      </h3>

      <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
        {tr(
          'dashboard.noPendingActionsDescription',
          'Todas as respostas e confirmações estão atualizadas.'
        )}
      </p>
    </div>
  );
}

export default function PendingActionsCard({
  pendingConvocations = [],
  updatingConvocation,
  onUpdateConvocation,
  getEventDayLink,
  formatTime,
  format,
  dateLocale,
  t,
  tr,
}) {
  const items = Array.isArray(pendingConvocations)
    ? pendingConvocations
    : [];

  const visibleItems = items.slice(0, 4);
  const remainingCount = Math.max(
    items.length - visibleItems.length,
    0
  );

  return (
    <section
      className="rounded-[1.5rem] border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-200/70 sm:p-5"
      aria-labelledby="dashboard-pending-actions-title"
      data-testid="dashboard-pending-actions"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
            {tr(
              'dashboard.priority',
              'Prioridade'
            )}
          </p>

          <h2
            id="dashboard-pending-actions-title"
            className="mt-1 font-heading text-xl font-bold tracking-tight text-slate-950"
          >
            {tr(
              'dashboard.pendingActions',
              'Ações pendentes'
            )}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {tr(
              'dashboard.pendingActionsSubtitle',
              'Confirmações que ainda necessitam da sua resposta.'
            )}
          </p>
        </div>

        {items.length > 0 && (
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            {items.length}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyPendingState tr={tr} />
      ) : (
        <>
          <div className="space-y-3">
            {visibleItems.map((item, index) => (
              <PendingConvocationItem
                key={
                  item?.attendance_id ||
                  item?.attendance?.id ||
                  item?.id ||
                  `${item?.event?.id || 'pending'}-${index}`
                }
                item={item}
                updatingConvocation={updatingConvocation}
                onUpdateConvocation={onUpdateConvocation}
                getEventDayLink={getEventDayLink}
                formatTime={formatTime}
                format={format}
                dateLocale={dateLocale}
                tr={tr}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {items.length > 0 ? (
                <UserCheck className="h-4 w-4 text-amber-600" />
              ) : (
                <UserX className="h-4 w-4" />
              )}

              <span>
                {remainingCount > 0
                  ? tr(
                      'dashboard.morePendingActions',
                      `Mais ${remainingCount} ações pendentes`
                    ).replace(
                      '{count}',
                      remainingCount
                    )
                  : tr(
                      'dashboard.pendingActionsUpToDate',
                      'Lista de pendências atualizada'
                    )}
              </span>
            </div>

            <Link
              to="/calendar?view=agenda"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition hover:text-primary/80"
            >
              {tr(
                'dashboard.viewAllPendingActions',
                'Ver todas'
              )}

              <ChevronRight
                className="h-4 w-4"
                aria-hidden="true"
              />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
