import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, Clock, MapPin, Users } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export function DashboardTodayCard({
  event,
  countdown,
  dateLabel,
  day,
  month,
  eventType,
  time,
  location,
  teamName,
  to = '/calendar',
  labels = {},
}) {
  if (!event) return null;

  return (
    <Card className="overflow-hidden border-2 border-primary/25 bg-white shadow-xl shadow-slate-200/80 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-[170px_1fr]">
        <div className="relative flex min-h-[120px] flex-row items-center justify-between gap-3 overflow-hidden bg-secondary p-4 text-white lg:min-h-[160px] lg:flex-col lg:items-stretch lg:p-5">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_38%)]"
            aria-hidden="true"
          />

          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">
              {labels.nextEvent || 'Próximo evento'}
            </p>
            <p className="mt-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              {countdown}
            </p>
          </div>

          <div className="relative z-10">
            <span className="text-xs font-semibold uppercase tracking-tight text-white/75">
              {dateLabel}
            </span>
            <div className="mt-1 flex items-end gap-2">
              <span className="font-heading text-3xl leading-none lg:text-5xl">
                {day}
              </span>
              <span className="pb-1 text-sm font-semibold uppercase text-white/80">
                {month}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Badge variant="outline" className="mb-3">
                {eventType}
              </Badge>

              <h2 className="font-heading text-xl tracking-tight text-slate-950 sm:text-3xl">
                {event.title || labels.event || 'Evento'}
              </h2>

              {event.opponent && (
                <p className="mt-2 text-lg text-slate-500">vs {event.opponent}</p>
              )}
            </div>

            <Button asChild className="shrink-0 rounded-full">
              <Link to={to}>
                {labels.seeDetails || 'Ver Detalhes'}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3 sm:gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <Clock className="mb-2 h-4 w-4 text-primary" />
              <p className="font-semibold text-slate-950">{time}</p>
              <p className="text-xs text-slate-400">{labels.time || 'Hora'}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <MapPin className="mb-2 h-4 w-4 text-primary" />
              <p className="truncate font-semibold text-slate-950">{location}</p>
              <p className="text-xs text-slate-400">{labels.location || 'Local'}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <Users className="mb-2 h-4 w-4 text-primary" />
              <p className="truncate font-semibold text-slate-950">{teamName}</p>
              <p className="text-xs text-slate-400">{labels.group || 'Grupo'}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default DashboardTodayCard;
