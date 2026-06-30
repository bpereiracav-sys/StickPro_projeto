import { format, isSameMonth, isToday, parseISO } from 'date-fns';
import {
  Calendar as CalendarIcon,
  CheckCircle,
  ClipboardCheck,
  Edit,
  MoreVertical,
  PauseCircle,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';

import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

/**
 * CalendarMonth
 *
 * Vista mensal do calendário.
 *
 * Este componente foi extraído para reduzir o tamanho do Calendar.jsx.
 * Recebe os dias já calculados pelo Calendar.jsx e usa getEventsForDay()
 * para obter os eventos de cada dia.
 */
export default function CalendarMonth({
  t,
  days = [],
  selectedDate,
  eventTypes = {},
  teams = [],
  canManageEvents = false,
  canCreateConvocations = false,
  isAdmin = false,
  canAccessTeam = () => false,
  getEventsForDay,
  setSelectedDate,
  setViewMode,
  openEditDialog,
  openConvocationDialog,
  openConvocationStatusDialog,
  openPostponeDialog,
  handleCancelEvent,
  handleRestoreEvent,
  setSelectedEvent,
  setDeleteDialogOpen,
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
      <div className="grid grid-cols-7 bg-slate-50">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
          <div
            key={day}
            className="py-3 text-center text-sm font-semibold text-slate-500"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = typeof getEventsForDay === 'function'
            ? getEventsForDay(day)
            : [];
          const isCurrentMonth = isSameMonth(day, selectedDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={`
                min-h-[175px] cursor-pointer border-t border-r border-slate-200 p-2 transition-colors hover:bg-slate-50
                ${!isCurrentMonth ? 'bg-muted/30' : 'bg-white'}
                ${isCurrentDay ? 'ring-2 ring-primary ring-inset' : ''}
              `}
              onClick={() => {
                setSelectedDate?.(day);
                setViewMode?.('day');
              }}
            >
              <div
                className={`
                  mb-1 text-sm font-medium
                  ${!isCurrentMonth ? 'text-muted-foreground' : ''}
                  ${isCurrentDay ? 'text-primary' : ''}
                `}
              >
                {format(day, 'd')}
              </div>

              <div className="space-y-0.5">
                {dayEvents.slice(0, 5).map((event) => {
                  const eventType = eventTypes[event.event_type] || eventTypes.outro || {};
                  const EventIcon = eventType.icon || CalendarIcon;

                  const canManageThisEvent =
                    canManageEvents && (isAdmin || canAccessTeam(event.team_id));

                  const eventTeam =
                    teams.find((team) => team.id === event.team_id) ||
                    event.team ||
                    null;

                  const eventTime = event.start_time
                    ? format(
                        typeof event.start_time === 'string'
                          ? parseISO(event.start_time)
                          : event.start_time,
                        'HH:mm'
                      )
                    : '';

                  const eventCard = (
                    <div
                      className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                      onClick={(e) => e.stopPropagation()}
                      title={
                        event.status === 'postponed'
                          ? `${t('calendar.statusPostponed', 'Adiado')}${
                              event.postponed_to_start_time
                                ? ` para ${format(parseISO(event.postponed_to_start_time), 'dd/MM/yyyy HH:mm')}`
                                : ''
                            }${event.postponement_reason ? ` — ${event.postponement_reason}` : ''}`
                          : event.status === 'cancelled'
                            ? t('calendar.statusCancelled', 'Cancelado')
                            : event.title
                      }
                    >
                      <div className={`absolute left-0 top-0 h-full w-1 ${eventType.color || 'bg-gray-500'}`} />

                      <div className="flex min-w-0 items-center gap-1.5 pl-1">
                        <EventIcon className={`h-3.5 w-3.5 shrink-0 ${eventType.textColor || 'text-gray-600'}`} />

                        <p className="truncate text-[11px] font-semibold text-slate-900">
                          {event.status === 'cancelled' && '❌ '}
                          {event.status === 'postponed' && '⏳ '}
                          {event.title}
                        </p>
                      </div>

                      <div className="flex min-w-0 items-center gap-1 pl-1 text-[10px] text-slate-500">
                        {eventTime && <span>{eventTime}</span>}

                        {eventTeam?.name && (
                          <>
                            {eventTime && <span>•</span>}
                            <span className="truncate">{eventTeam.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );

                  return canManageThisEvent ? (
                    <DropdownMenu key={event.id}>
                      <DropdownMenuTrigger asChild>
                        {eventCard}
                      </DropdownMenuTrigger>

                      <DropdownMenuContent className="bg-white" align="start">
                        <DropdownMenuItem onClick={() => openEditDialog?.(event)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {t('common.edit', 'Editar')}
                        </DropdownMenuItem>

                        {canCreateConvocations && (
                          <DropdownMenuItem onClick={() => openConvocationDialog?.(event)}>
                            <Users className="mr-2 h-4 w-4" />
                            {t('convocations.callPlayers', 'Convocar Jogadores')}
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem onClick={() => openConvocationStatusDialog?.(event)}>
                          <ClipboardCheck className="mr-2 h-4 w-4" />
                          {t('convocations.viewStatus', 'Ver Estado Convocatória')}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            openPostponeDialog?.(event);
                          }}
                        >
                          <PauseCircle className="mr-2 h-4 w-4" />
                          {t('calendar.postpone', 'Adiar')}
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleCancelEvent?.(event)}>
                          <XCircle className="mr-2 h-4 w-4" />
                          {t('calendar.cancelEvent', 'Cancelar')}
                        </DropdownMenuItem>

                        {(event.status === 'cancelled' || event.status === 'postponed') && (
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              handleRestoreEvent?.(event);
                            }}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            {event.status === 'postponed'
                              ? t('calendar.undoPostpone', 'Anular adiamento')
                              : t('calendar.restoreEvent', 'Reativar evento')}
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={(e) => {
                            e.preventDefault();
                            setSelectedEvent?.(event);
                            setDeleteDialogOpen?.(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('common.delete', 'Eliminar')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div key={event.id}>{eventCard}</div>
                  );
                })}

                {dayEvents.length > 5 && (
                  <p className="mt-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                    +{dayEvents.length - 5} {t('calendar.more', 'mais')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
