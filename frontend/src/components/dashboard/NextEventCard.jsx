import { Link } from 'react-router-dom';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ChevronRight, Clock, MapPin, Users } from 'lucide-react';

export default function NextEventCard({
  event,
  getEventDayLink,
  getEventCountdown,
  getEventDateLabel,
  getTranslatedEventType,
  formatTime,
  format,
  dateLocale,
  tr,
}) {
  if (!event) return null;

  return (
    <Card
      className="overflow-hidden border-2 border-primary/25 bg-white shadow-xl shadow-slate-200/80 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
      data-testid="next-event-card"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[170px_1fr]">
        <div
          className={`relative flex min-h-[120px] flex-row items-center justify-between gap-3 overflow-hidden p-4 text-white lg:min-h-[170px] lg:flex-col lg:items-stretch lg:p-5 ${
            event.event_type === 'jogo' ? 'bg-primary' : 'bg-secondary'
          }`}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_38%)]"
            aria-hidden="true"
          />

          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">
              {tr('dashboard.nextEvent', 'Próximo evento')}
            </p>
            <p className="mt-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              {getEventCountdown(event.start_time)}
            </p>
          </div>

          <div className="relative z-10">
            <span className="text-xs font-semibold uppercase tracking-tight text-white/75">
              {getEventDateLabel(event.start_time)}
            </span>
            <div className="mt-1 flex items-end gap-2">
              <span className="font-heading text-3xl leading-none lg:text-5xl">
                {event.start_time ? format(new Date(event.start_time), 'd') : '--'}
              </span>
              <span className="pb-1 text-sm font-semibold uppercase text-white/80">
                {event.start_time
                  ? format(new Date(event.start_time), 'MMM', { locale: dateLocale })
                  : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Badge variant="outline" className="mb-3">
                {getTranslatedEventType(event.event_type)}
              </Badge>

              <h2 className="font-heading text-xl tracking-tight text-slate-950 sm:text-3xl">
                {event.title || tr('calendar.event', 'Evento')}
              </h2>

              {event.opponent && (
                <p className="mt-2 text-lg text-slate-500">vs {event.opponent}</p>
              )}
            </div>

            <Button asChild className="shrink-0 rounded-full" data-testid="view-event-btn">
              <Link to={getEventDayLink(event)}>
                {tr('common.seeDetails', 'Ver Detalhes')}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3 sm:gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <Clock className="mb-2 h-4 w-4 text-primary" />
              <p className="font-semibold text-slate-950">
                {formatTime(event.start_time)}
              </p>
              <p className="text-xs text-slate-400">{tr('championships.time', 'Hora')}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <MapPin className="mb-2 h-4 w-4 text-primary" />
              <p className="truncate font-semibold text-slate-950">
                {event.location || tr('calendar.toDefine', 'A definir')}
              </p>
              <p className="text-xs text-slate-400">{tr('championships.venue', 'Local')}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <Users className="mb-2 h-4 w-4 text-primary" />
              <p className="truncate font-semibold text-slate-950">
                {event.team?.name || tr('common.selectTeam', 'Equipa')}
              </p>
              <p className="text-xs text-slate-400">{tr('dashboard.group', 'Grupo')}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
