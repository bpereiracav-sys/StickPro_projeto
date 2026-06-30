import { format, isToday, isSameDay, addDays, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import EventCard from './EventCard';

/**
 * CalendarAgenda
 *
 * Vista corrida/agenda do calendário.
 *
 * Nota:
 * - Este componente replica a lógica da agenda que está atualmente dentro de Calendar.jsx.
 * - Será ligado ao Calendar.jsx no passo seguinte.
 */
export default function CalendarAgenda({
  t,
  events = [],
  teams = [],
  eventTypes = {},
  canManageEvents = false,
  canCreateConvocations = false,
  isAdmin = false,
  canAccessTeam = () => false,
  onOpenEdit,
  onOpenConvocation,
  onOpenConvocationStatus,
  onOpenPostpone,
  onCancelEvent,
  onRestoreEvent,
  onDeleteEvent,
}) {
  const getAgendaDayLabel = (date) => {
    if (isToday(date)) return t('calendar.today', 'Hoje');
    if (isSameDay(date, addDays(new Date(), 1))) {
      return t('calendar.tomorrow', 'Amanhã');
    }
    return format(date, "EEEE, d 'de' MMMM", { locale: pt });
  };

  if (!events.length) {
    return (
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8 text-center text-muted-foreground">
          <CalendarIcon className="mx-auto mb-3 h-12 w-12 opacity-50" />
          <p>{t('calendar.noEvents', 'Não existem eventos para apresentar')}</p>
        </CardContent>
      </Card>
    );
  }

  let lastDayKey = '';

  return (
    <div className="space-y-5 pb-24 md:pb-0">
      {events.map((event) => {
        const eventDate = parseISO(event.start_time);
        const dayKey = format(eventDate, 'yyyy-MM-dd');
        const showHeader = dayKey !== lastDayKey;
        lastDayKey = dayKey;

        return (
          <div key={event.id} className="space-y-3">
            {showHeader && (
              <div className="sticky top-0 z-10 -mx-1 rounded-2xl bg-slate-50/95 px-3 py-2 backdrop-blur md:static md:bg-transparent md:px-0">
                <p className="text-sm font-bold capitalize text-slate-950">
                  {getAgendaDayLabel(eventDate)}
                </p>
                <p className="text-xs text-slate-500">
                  {format(eventDate, "d 'de' MMMM 'de' yyyy", { locale: pt })}
                </p>
              </div>
            )}

            <EventCard
              event={event}
              t={t}
              teams={teams}
              eventTypes={eventTypes}
              canManageEvents={canManageEvents}
              canCreateConvocations={canCreateConvocations}
              isAdmin={isAdmin}
              canAccessTeam={canAccessTeam}
              onOpenEdit={onOpenEdit}
              onOpenConvocation={onOpenConvocation}
              onOpenConvocationStatus={onOpenConvocationStatus}
              onOpenPostpone={onOpenPostpone}
              onCancelEvent={onCancelEvent}
              onRestoreEvent={onRestoreEvent}
              onDeleteEvent={onDeleteEvent}
            />
          </div>
        );
      })}
    </div>
  );
}
