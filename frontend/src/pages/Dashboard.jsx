import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { dashboardApi, paymentsApi } from '../services/api';
import { Card, CardContent } from '../components/ui/card';
import {
  CardWithStripe,
  CardStripeHeader,
  CardStripeTitle,
  CardStripeContent,
} from '../components/ui/card-stripe';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Calendar,
  Users,
  ClipboardCheck,
  ChevronRight,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { formatTime, getEventTypeName } from '../lib/utils';
import { format, isToday, isTomorrow } from 'date-fns';
import { pt, es, fr, it, enUS } from 'date-fns/locale';

const locales = { pt, es, fr, it, en: enUS };

export default function Dashboard() {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);

  const dateLocale = locales[language] || pt;

  useEffect(() => {
    fetchDashboard();
    fetchPaymentStatus();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await dashboardApi.get();
      setData(response?.data || {});
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      setData({});
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentStatus = async () => {
    try {
      const response = await paymentsApi.getStatus();
      setPaymentStatus(response?.data || null);
    } catch (error) {
      console.log('Payment status not available');
      setPaymentStatus(null);
    }
  };

  const getEventDateLabel = (date) => {
    if (!date) return '';
    const parsedDate = new Date(date);

    if (isToday(parsedDate)) return t('time.today').toUpperCase();
    if (isTomorrow(parsedDate)) return t('time.tomorrow').toUpperCase();

    return format(parsedDate, 'EEE, d MMM', { locale: dateLocale }).toUpperCase();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.goodMorning');
    if (hour < 18) return t('dashboard.goodAfternoon');
    return t('dashboard.goodEvening');
  };

  const upcomingEvents = useMemo(() => data?.upcoming_events || [], [data]);
  const pendingConvocations = useMemo(() => data?.pending_convocations || [], [data]);
  const recentMessages = useMemo(() => data?.recent_messages || [], [data]);

  const nextEvent = upcomingEvents[0] || null;
  const pendingCount = pendingConvocations.length;

  const PaymentStatusCard = () => {
    if (!paymentStatus || paymentStatus.status === 'disabled') return null;

    const statusConfig = {
      paid: {
        color: 'bg-green-50 border-green-200',
        iconColor: 'text-green-600',
        icon: CheckCircle,
        title: 'Pagamentos em Dia',
        message: 'Todos os pagamentos estão regularizados',
      },
      pending: {
        color: 'bg-yellow-50 border-yellow-200',
        iconColor: 'text-yellow-600',
        icon: Clock,
        title: 'Pagamentos Pendentes',
        message: `${paymentStatus.pending_count || 0} pagamento(s) por liquidar`,
      },
      overdue: {
        color: 'bg-red-50 border-red-200',
        iconColor: 'text-red-600',
        icon: AlertTriangle,
        title: 'Pagamentos em Atraso',
        message: `${paymentStatus.overdue_count || 0} pagamento(s) em atraso`,
      },
    };

    const config = statusConfig[paymentStatus.status] || statusConfig.paid;
    const StatusIcon = config.icon;

    return (
      <Link to="/payments" className="block">
        <Card
          className={`border ${config.color} hover:shadow-md transition-shadow cursor-pointer`}
          data-testid="payment-status-card"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${config.color}`}
              >
                <StatusIcon className={`w-5 h-5 ${config.iconColor}`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{config.title}</p>
                <p className="text-xs text-muted-foreground">{config.message}</p>
              </div>

              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </div>

            {paymentStatus.status === 'overdue' &&
              Number(paymentStatus.total_overdue || 0) > 0 && (
                <div className="mt-2 pt-2 border-t border-red-200">
                  <p className="text-sm font-mono text-red-700">
                    Total em atraso: €{Number(paymentStatus.total_overdue || 0).toFixed(2)}
                  </p>
                </div>
              )}
          </CardContent>
        </Card>
      </Link>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight">
            {getGreeting()}, {user?.name?.split(' ')?.[0] || 'Utilizador'}!
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: dateLocale })}
          </p>
        </div>

        {pendingCount > 0 && (
          <Badge className="bg-amber-500 text-white px-3 py-1.5 text-sm">
            {pendingCount} {t('dashboard.convocations').toLowerCase()}
          </Badge>
        )}
      </div>

      <PaymentStatusCard />

      {nextEvent && (
        <Card
          className="border border-primary/30 bg-gradient-to-r from-primary/5 to-transparent overflow-hidden card-hover"
          data-testid="next-event-card"
        >
          <div className="flex flex-col lg:flex-row">
            <div
              className={`lg:w-32 p-4 flex flex-col items-center justify-center text-white ${
                nextEvent.event_type === 'jogo' ? 'bg-primary' : 'bg-secondary'
              }`}
            >
              <span className="text-xs font-semibold tracking-tight opacity-80">
                {getEventDateLabel(nextEvent.start_time)}
              </span>
              <span className="font-heading text-4xl mt-1">
                {nextEvent.start_time ? format(new Date(nextEvent.start_time), 'd') : '--'}
              </span>
              <span className="text-sm opacity-80">
                {nextEvent.start_time
                  ? format(new Date(nextEvent.start_time), 'MMM', {
                      locale: dateLocale,
                    }).toUpperCase()
                  : ''}
              </span>
            </div>

            <div className="flex-1 p-5 sm:p-6">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <Badge
                    variant={nextEvent.event_type === 'jogo' ? 'default' : 'secondary'}
                    className="mb-2"
                  >
                    {getEventTypeName(nextEvent.event_type)}
                  </Badge>

                  <h2 className="font-heading text-xl sm:text-2xl text-foreground tracking-tight">
                    {nextEvent.title || 'Evento'}
                  </h2>

                  {nextEvent.opponent && (
                    <p className="text-base sm:text-lg text-muted-foreground mt-1">
                      vs {nextEvent.opponent}
                    </p>
                  )}
                </div>

                <Button asChild className="shrink-0" data-testid="view-event-btn">
                  <Link to="/calendar">
                    Ver Detalhes
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {formatTime(nextEvent.start_time)}
                </span>

                {nextEvent.location && (
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {nextEvent.location}
                  </span>
                )}

                {nextEvent.team?.name && (
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {nextEvent.team.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardWithStripe
          stripeColor="primary"
          className="lg:col-span-2 card-hover"
          data-testid="upcoming-events-section"
        >
          <CardStripeHeader className="flex flex-row items-center justify-between pb-2">
            <CardStripeTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="w-5 h-5 text-primary" />
              {t('dashboard.upcomingEvents')}
            </CardStripeTitle>

            <Button asChild variant="ghost" size="sm">
              <Link to="/calendar">{t('dashboard.seeCalendar')}</Link>
            </Button>
          </CardStripeHeader>

          <CardStripeContent>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-4 p-3 border border-border rounded-lg hover:border-primary/50 hover:bg-accent/30 transition-all duration-200"
                    data-testid={`event-row-${event.id}`}
                  >
                    <div
                      className={`w-1.5 h-12 rounded-full ${
                        event.event_type === 'jogo' ? 'bg-primary' : 'bg-secondary'
                      }`}
                    />

                    <div className="w-14 text-center shrink-0">
                      <p className="text-xs text-muted-foreground uppercase">
                        {event.start_time
                          ? format(new Date(event.start_time), 'EEE', { locale: dateLocale })
                          : '--'}
                      </p>
                      <p className="font-heading text-xl">
                        {event.start_time ? format(new Date(event.start_time), 'd') : '--'}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate">
                        {event.title || 'Evento'}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {formatTime(event.start_time)}
                        {event.location ? ` • ${event.location}` : ''}
                      </p>
                    </div>

                    <Badge variant="outline" className="hidden sm:flex text-xs shrink-0">
                      {getEventTypeName(event.event_type)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">{t('common.noResults')}</p>
                <Button asChild variant="outline" className="mt-4" size="sm">
                  <Link to="/calendar">{t('calendar.newEvent')}</Link>
                </Button>
              </div>
            )}
          </CardStripeContent>
        </CardWithStripe>

        <CardWithStripe
          stripeColor="amber"
          className="card-hover"
          data-testid="convocations-section"
        >
          <CardStripeHeader className="flex flex-row items-center justify-between pb-2">
            <CardStripeTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ClipboardCheck className="w-5 h-5 text-amber-500" />
              {t('dashboard.convocations')}
            </CardStripeTitle>

            <Button asChild variant="ghost" size="sm">
              <Link to="/convocations">{t('dashboard.seeAll')}</Link>
            </Button>
          </CardStripeHeader>

          <CardStripeContent>
            {pendingConvocations.length > 0 ? (
              <div className="space-y-3">
                {pendingConvocations.slice(0, 4).map((item) => (
                  <div
                    key={item.attendance?.id || item.event?.id}
                    className="p-3 border border-amber-200 bg-amber-50 rounded-lg"
                    data-testid={`convocation-item-${item.attendance?.id || item.event?.id}`}
                  >
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <Badge className="bg-amber-500 text-white text-xs">
                        <HelpCircle className="w-3 h-3 mr-1" />
                        {t('attendance.pending')}
                      </Badge>

                      <span className="text-xs text-muted-foreground">
                        {item.event?.start_time
                          ? format(new Date(item.event.start_time), 'd MMM', {
                              locale: dateLocale,
                            })
                          : ''}
                      </span>
                    </div>

                    <p className="font-semibold text-sm">{item.event?.title || 'Evento'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(item.event?.start_time)}
                      {item.event?.location ? ` • ${item.event.location}` : ''}
                    </p>

                    <div className="flex gap-2 mt-3">
                      <Button
                        asChild
                        size="sm"
                        className="flex-1 h-8 bg-secondary hover:bg-secondary/90"
                      >
                        <Link to="/convocations">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {t('attendance.present')}
                        </Link>
                      </Button>

                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-destructive border-destructive hover:bg-destructive/10"
                      >
                        <Link to="/convocations">
                          <XCircle className="w-3 h-3 mr-1" />
                          {t('attendance.absent')}
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-secondary/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  {t('dashboard.allConvocationsAnswered')}
                </p>
              </div>
            )}
          </CardStripeContent>
        </CardWithStripe>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CardWithStripe stripeColor="primary" className="card-hover">
          <CardStripeContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-heading">{data?.teams_count || 0}</p>
              <p className="text-xs text-muted-foreground">Equipas</p>
            </div>
          </CardStripeContent>
        </CardWithStripe>

        <CardWithStripe stripeColor="secondary" className="card-hover">
          <CardStripeContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-heading">{upcomingEvents.length}</p>
              <p className="text-xs text-muted-foreground">Eventos</p>
            </div>
          </CardStripeContent>
        </CardWithStripe>

        <CardWithStripe stripeColor="amber" className="card-hover">
          <CardStripeContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-heading">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardStripeContent>
        </CardWithStripe>

        <CardWithStripe stripeColor="purple" className="card-hover">
          <CardStripeContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-heading">{recentMessages.length}</p>
              <p className="text-xs text-muted-foreground">Mensagens</p>
            </div>
          </CardStripeContent>
        </CardWithStripe>
      </div>
    </div>
  );
}
