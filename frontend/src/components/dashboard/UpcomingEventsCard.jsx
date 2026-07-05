import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  CardWithStripe,
  CardStripeHeader,
  CardStripeTitle,
  CardStripeContent,
} from '../ui/card-stripe';

export default function UpcomingEventsCard({
  events = [],
  getEventDayLink,
  getTranslatedEventType,
  formatTime,
  format,
  dateLocale,
  t,
  tr,
}) {
  return (
    <CardWithStripe
      stripeColor="primary"
      className="overflow-hidden border border-slate-200 bg-white shadow-xl shadow-slate-200/70 lg:col-span-2"
      data-testid="upcoming-events-section"
    >
      <CardStripeHeader className="flex flex-row items-center justify-between pb-2">
        <CardStripeTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          {t('dashboard.upcomingEvents')}
        </CardStripeTitle>

        <Button asChild variant="ghost" size="sm" className="rounded-full">
          <Link to="/calendar">{t('dashboard.seeCalendar')}</Link>
        </Button>
      </CardStripeHeader>

      <CardStripeContent>
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.slice(0, 5).map((event) => (
              <Link
                key={event.id}
                to={getEventDayLink(event)}
                className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-3 transition-all duration-200 hover:border-primary/40 hover:shadow-md sm:gap-4"
                data-testid={`event-row-${event.id}`}
              >
                <div
                  className={`h-14 w-1.5 rounded-full ${
                    event.event_type === 'jogo' ? 'bg-primary' : 'bg-secondary'
                  }`}
                />

                <div className="w-11 shrink-0 text-center sm:w-14">
                  <p className="text-xs uppercase text-slate-400">
                    {event.start_time
                      ? format(new Date(event.start_time), 'EEE', { locale: dateLocale })
                      : '--'}
                  </p>
                  <p className="font-heading text-xl text-slate-950 sm:text-2xl">
                    {event.start_time ? format(new Date(event.start_time), 'd') : '--'}
                  </p>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-950 sm:text-base">
                    {event.title || tr('calendar.event', 'Evento')}
                  </p>
                  <p className="truncate text-xs text-slate-500 sm:text-sm">
                    {formatTime(event.start_time)}
                    {event.location ? ` • ${event.location}` : ''}
                  </p>
                </div>

                <Badge variant="outline" className="hidden shrink-0 text-xs sm:flex">
                  {getTranslatedEventType(event.event_type)}
                </Badge>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center">
            <Calendar className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="text-sm text-slate-500">{t('common.noResults')}</p>
            <Button asChild variant="outline" className="mt-4 rounded-full" size="sm">
              <Link to="/calendar">{t('calendar.newEvent')}</Link>
            </Button>
          </div>
        )}
      </CardStripeContent>
    </CardWithStripe>
  );
}
