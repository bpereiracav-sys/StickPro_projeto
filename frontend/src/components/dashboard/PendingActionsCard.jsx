import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  HelpCircle,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  CardWithStripe,
  CardStripeHeader,
  CardStripeTitle,
  CardStripeContent,
} from '../ui/card-stripe';

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
  return (
    <CardWithStripe
      stripeColor="amber"
      className="overflow-hidden border border-amber-100 bg-white shadow-xl shadow-slate-200/70"
      data-testid="convocations-section"
    >
      <CardStripeHeader className="flex flex-row items-center justify-between pb-2">
        <CardStripeTitle className="flex items-center gap-2 text-base sm:text-lg">
          <ClipboardCheck className="h-5 w-5 text-amber-500" />
          {tr('dashboard.pendingActions', 'Pendentes')}
        </CardStripeTitle>

        <Button asChild variant="ghost" size="sm" className="rounded-full">
          <Link to="/calendar?view=agenda">
            {tr('calendar.openCalendar', 'Abrir calendário')}
          </Link>
        </Button>
      </CardStripeHeader>

      <CardStripeContent>
        {pendingConvocations.length > 0 ? (
          <div className="space-y-3">
            {pendingConvocations.slice(0, 4).map((item) => (
              <div
                key={item.attendance?.id || item.event?.id}
                className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-3 shadow-sm"
                data-testid={`convocation-item-${item.attendance?.id || item.event?.id}`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge className="bg-amber-500 text-xs text-white">
                    <HelpCircle className="mr-1 h-3 w-3" />
                    {t('attendance.pending')}
                  </Badge>

                  <span className="text-xs text-slate-500">
                    {item.event?.start_time
                      ? format(new Date(item.event.start_time), 'd MMM', {
                          locale: dateLocale,
                        })
                      : ''}
                  </span>
                </div>

                <Link
                  to={getEventDayLink(item.event)}
                  className="block text-sm font-semibold text-slate-950 transition hover:text-primary"
                >
                  {item.event?.title || tr('calendar.event', 'Evento')}
                </Link>

                <p className="mt-1 text-xs text-slate-500">
                  {formatTime(item.event?.start_time)}
                  {item.event?.location ? ` • ${item.event.location}` : ''}
                </p>

                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 flex-1 rounded-full bg-secondary hover:bg-secondary/90"
                    onClick={() => onUpdateConvocation(item.attendance?.id, 'confirmado')}
                    disabled={updatingConvocation === item.attendance?.id}
                  >
                    {updatingConvocation === item.attendance?.id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-1 h-3 w-3" />
                    )}
                    {tr('common.confirm', 'Confirmar')}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 flex-1 rounded-full border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => onUpdateConvocation(item.attendance?.id, 'ausente')}
                    disabled={updatingConvocation === item.attendance?.id}
                  >
                    {updatingConvocation === item.attendance?.id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <XCircle className="mr-1 h-3 w-3" />
                    )}
                    {tr('attendance.unavailable', 'Indisponível')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[230px] flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-50 to-white px-6 py-10 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100">
              <CheckCircle className="h-9 w-9 text-emerald-500" />
            </div>

            <Badge className="mb-3 bg-emerald-500 text-white">
              0 {tr('dashboard.pending', 'Pendentes')}
            </Badge>

            <p className="font-heading text-lg text-slate-950">
              {tr('common.greatJob', 'Bom trabalho!')}
            </p>

            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
              {t('dashboard.allConvocationsAnswered')}
            </p>
          </div>
        )}
      </CardStripeContent>
    </CardWithStripe>
  );
}
