import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  dashboardApi,
  paymentsApi,
  commitmentApi,
  trainingFeedbackApi,
} from '../services/api';
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
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  ArrowUpRight,
} from 'lucide-react';
import { formatTime, getEventTypeName } from '../lib/utils';
import { format, isToday, isTomorrow, differenceInCalendarDays } from 'date-fns';
import { pt, es, fr, it, enUS } from 'date-fns/locale';
import { toast } from 'sonner';

const locales = { pt, es, fr, it, en: enUS };

export default function Dashboard() {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [commitment, setCommitment] = useState(null);
  const [pendingFeedback, setPendingFeedback] = useState([]);
  const [feedbackRating, setFeedbackRating] = useState('');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const dateLocale = locales[language] || pt;

  const tr = (key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };

  useEffect(() => {
    fetchDashboard();
    fetchPaymentStatus();
    fetchCommitment();
    fetchPendingFeedback();
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

  const fetchCommitment = async () => {
  try {
    const response = await commitmentApi.getMy();
    setCommitment(response?.data || null);
  } catch (error) {
    console.error('Error fetching commitment:', error);
    setCommitment(null);
  }
};

  const fetchPendingFeedback = async () => {
    try {
      const response = await trainingFeedbackApi.getMyPending();
      setPendingFeedback(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching pending training feedback:', error);
      setPendingFeedback([]);
    }
  };
  
  const handleSubmitTrainingFeedback = async () => {
    if (!feedbackRating || pendingFeedback.length === 0) return;
  
    const item = pendingFeedback[0];
    const eventId = item?.event?.id || item?.attendance?.event_id;
  
    if (!eventId) return;
  
    setSubmittingFeedback(true);
  
    try {
      await trainingFeedbackApi.create({
        event_id: eventId,
        rating: feedbackRating,
        comment: feedbackComment,
      });
  
      toast.success(t('trainingFeedback.success'));
  
      setFeedbackRating('');
      setFeedbackComment('');
  
      await fetchPendingFeedback();
    } catch (error) {
      console.error('Error submitting training feedback:', error);
      toast.error(t('trainingFeedback.error'));
    } finally {
      setSubmittingFeedback(false);
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

  const getEventCountdown = (date) => {
    if (!date) return '';
    const days = differenceInCalendarDays(new Date(date), new Date());

    if (days < 0) return tr('dashboard.eventAlreadyPassed', 'Já decorreu');
    if (days === 0) return t('time.today');
    if (days === 1) return t('time.tomorrow');

    return tr('dashboard.daysRemaining', `Faltam ${days} dias`).replace('{days}', days);
  };

  const getTranslatedEventType = (type) => {
    if (type === 'treino' || type === 'training') {
      return t('calendar.eventTypes.training');
    }

    if (type === 'jogo' || type === 'game') {
      return t('championships.newGame');
    }

    return getEventTypeName(type);
  };

  const upcomingEvents = useMemo(() => data?.upcoming_events || [], [data]);
  const pendingConvocations = useMemo(() => data?.pending_convocations || [], [data]);
  const recentMessages = useMemo(() => data?.recent_messages || [], [data]);

  const nextEvent = upcomingEvents[0] || null;
  const pendingCount = pendingConvocations.length;

  const dateFormat = language === 'pt' ? "EEEE, d 'de' MMMM" : 'EEEE, d MMMM';

  const getCommitmentMedal = (medal) => {
    if (medal === 'gold') return { icon: '🥇', color: '#D4AF37' };
    if (medal === 'silver') return { icon: '🥈', color: '#C0C0C0' };
    if (medal === 'bronze') return { icon: '🥉', color: '#CD7F32' };
    return { icon: '🏆', color: '#94A3B8' };
  };

  const getPaymentHeroStatus = () => {
    if (!paymentStatus || paymentStatus.status === 'disabled') return null;

    if (paymentStatus.status === 'overdue') {
      return {
        icon: AlertTriangle,
        text: tr('payments.statusOverdueBadge', 'Atenção'),
        iconClass: 'text-red-300',
      };
    }

    if (paymentStatus.status === 'pending') {
      return {
        icon: Clock,
        text: tr('payments.statusPendingBadge', 'Pendente'),
        iconClass: 'text-amber-300',
      };
    }

    return {
      icon: CheckCircle,
      text: tr('payments.statusPaidBadge', 'Regularizado'),
      iconClass: 'text-emerald-300',
    };
  };

  const MetricCard = ({ icon: Icon, label, value, helper, tone = 'primary', to }) => {
  const tones = {
    primary: {
      card: 'from-white via-cyan-50/70 to-slate-50 border-cyan-100',
      icon: 'from-cyan-500 to-blue-500 text-white',
    },
    secondary: {
      card: 'from-white via-emerald-50/70 to-slate-50 border-emerald-100',
      icon: 'from-emerald-500 to-teal-500 text-white',
    },
    amber: {
      card: 'from-white via-amber-50/80 to-slate-50 border-amber-100',
      icon: 'from-amber-500 to-yellow-500 text-white',
    },
    purple: {
      card: 'from-white via-purple-50/70 to-slate-50 border-purple-100',
      icon: 'from-purple-500 to-indigo-500 text-white',
    },
  };

  const currentTone = tones[tone] || tones.primary;

  const content = (
    <Card
      className={`group relative overflow-hidden border bg-gradient-to-br ${currentTone.card} shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80`}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/80 blur-2xl"
        aria-hidden="true"
      />

      <CardContent className="relative p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className={`rounded-2xl bg-gradient-to-br p-3 shadow-lg ${currentTone.icon}`}>
            <Icon className="h-5 w-5" />
          </div>

          {to && (
            <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-700" />
          )}
        </div>

       <div className="mt-5">
          <p className="font-heading text-6xl tracking-tight text-slate-950">
            {value}
          </p>
        
          <p className="mt-1 text-sm font-semibold text-slate-700">
            {label}
          </p>
        
          {helper && (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {helper}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!to) return content;

  return (
    <Link to={to} className="block">
      {content}
    </Link>
  );
};
  
  const CommitmentCard = () => {
    if (!commitment) return null;

    const trainingRate = commitment.training?.rate || 0;
    const gameRate = commitment.games?.rate || 0;
    const globalScore = Math.round((trainingRate + gameRate) / 2);

    const trainingMedal = getCommitmentMedal(commitment.training?.medal);
    const gamesMedal = getCommitmentMedal(commitment.games?.medal);
    const globalMedal = getCommitmentMedal(
      commitment.training?.medal || commitment.games?.medal || 'none'
    );

    const targetMedal = commitment.training?.next_goal?.target || 'bronze';
    const missing = commitment.training?.next_goal?.missing || 0;

    return (
      <section className="relative overflow-hidden rounded-[1.75rem] border border-amber-200/70 bg-slate-950 px-4 py-3 text-white shadow-xl shadow-amber-100/60 sm:px-5">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.25),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(192,192,192,0.16),transparent_28%)]"
          aria-hidden="true"
        />

       <div className="relative z-10 grid gap-4 xl:grid-cols-[1fr_2.4fr] xl:items-center">
          <div className="flex flex-col justify-center">
            <Badge
              variant="outline"
              className="mb-3 w-fit border-white/20 bg-white/10 text-white"
            >
              🏅 STICKPro Commitment
            </Badge>
        
            <h2 className="font-heading text-2xl font-bold text-white">
              {t('commitment.myCommitment')}
            </h2>
        
            <p className="mt-2 text-sm text-white/70">
              Compromisso, assiduidade e participação ao longo da época.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-slate-300">
                  {tr('commitment.globalScore', 'Score Global')}
                </p>
                <span className="text-2xl">🛼</span>
              </div>
              <div className="mt-2 flex items-end gap-2">
                <p className="font-heading text-3xl leading-none">{globalScore}%</p>
                <span className="text-sm" style={{ color: globalMedal.color }}>
                  {globalMedal.icon}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${globalScore}%`,
                    backgroundColor: globalMedal.color,
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-300">
                  {tr('commitment.trainings', 'Treinos')}
                </p>
                <span className="text-2xl">🥅</span>
              </div>
              <p className="mt-2 font-heading text-2xl leading-none">{trainingRate}%</p>
              {commitment.training?.medal !== 'none' && (
                <p className="mt-1 text-xs text-slate-300">
                  {trainingMedal.icon}{' '}
                  {tr(`commitment.medals.${commitment.training?.medal}`, '')}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-300">
                  {tr('commitment.games', 'Jogos')}
                </p>
                <span className="text-2xl">🏒</span>
              </div>
              <p className="mt-2 font-heading text-2xl leading-none">{gameRate}%</p>
              {commitment.games?.medal !== 'none' && (
                <p className="mt-1 text-xs text-slate-300">
                  {gamesMedal.icon}{' '}
                  {tr(`commitment.medals.${commitment.games?.medal}`, '')}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-300">
                  {tr('commitment.nextGoal', 'Próximo Objetivo')}
                </p>
                <span className="text-2xl">🏆</span>
              </div>
              <p className="mt-2 font-heading text-xl leading-none">
                {tr(`commitment.medals.${targetMedal}`, 'Bronze')}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                {missing === 1
                  ? `1 ${tr('commitment.attendance', 'presença')} ${tr('commitment.to', 'para')} ${tr(`commitment.medals.${targetMedal}`, 'Bronze')}`
                  : `${missing} ${tr('commitment.attendances', 'presenças')} ${tr('commitment.to', 'para')} ${tr(`commitment.medals.${targetMedal}`, 'Bronze')}`}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 w-full rounded-3xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-3xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </div>
    );
  }

  const paymentHeroStatus = getPaymentHeroStatus();
  const PaymentHeroIcon = paymentHeroStatus?.icon;

  return (
    <div className="space-y-6 -mt-10 lg:-mt-12" data-testid="dashboard-page">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-950 p-5 text-white shadow-xl shadow-slate-200/70 sm:p-6 lg:p-6">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.32),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.28),transparent_32%)]"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="mb-3 border border-white/15 bg-white/10 px-3 py-1 text-white backdrop-blur">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              StickPro Club OS
            </Badge>

            <h1 className="font-heading text-3xl tracking-tight sm:text-5xl">
              {getGreeting()}, {user?.name?.split(' ')?.[0] || tr('common.user', 'Utilizador')}.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              {t('dashboard.heroSubtitle')}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                <Calendar className="h-4 w-4 text-cyan-300" />
                {format(new Date(), dateFormat, { locale: dateLocale })}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                {t('dashboard.operationalActive')}
              </span>

              {paymentHeroStatus && PaymentHeroIcon && (
                <Link
                  to="/payments"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/15"
                >
                  <PaymentHeroIcon className={`h-4 w-4 ${paymentHeroStatus.iconClass}`} />
                  {paymentHeroStatus.text}
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-3xl border border-white/10 bg-white/10 p-3 backdrop-blur lg:min-w-[340px]">
            <div className="rounded-2xl bg-white/10 p-3 text-center">
              <p className="font-heading text-2xl">{data?.teams_count || 0}</p>
              <p className="text-xs text-slate-300">{t('dashboard.teams')}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-3 text-center">
              <p className="font-heading text-2xl">{upcomingEvents.length}</p>
              <p className="text-xs text-slate-300">{t('dashboard.events')}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-3 text-center">
              <p className="font-heading text-2xl">{pendingCount}</p>
              <p className="text-xs text-slate-300">{t('dashboard.pending')}</p>
            </div>
          </div>
        </div>
      </section>

      <CommitmentCard />

{pendingFeedback.length > 0 && (() => {
  const feedbackItem = pendingFeedback[0];
  const event = feedbackItem?.event || {};

  const startDate = event.start_time ? new Date(event.start_time) : null;
  const endDate = event.end_time ? new Date(event.end_time) : null;

  const eventDate = startDate
    ? startDate.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '-';

  const startHour = startDate
    ? startDate.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

  const endHour = endDate
    ? endDate.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/82 px-4 backdrop-blur-sm">
      <Card className="w-full max-w-[620px] overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-gradient-to-br from-white via-cyan-50/80 to-slate-50 shadow-2xl shadow-slate-950/40">
        <CardContent className="p-5 sm:p-6">
          <div className="text-center">
            <Badge className="mb-4 bg-cyan-500 px-4 py-1.5 text-white">
              💬 {t('trainingFeedback.title')}
            </Badge>

            <h2 className="font-heading text-3xl text-slate-950">
              {t('trainingFeedback.question')}
            </h2>

            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-500">
              {t('trainingFeedback.requiredMessage')}
            </p>
          </div>

          <div className="mt-6 rounded-3xl border border-cyan-100 bg-white/80 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">
              {t('trainingFeedback.event')}
            </p>

            <h3 className="mt-1 font-heading text-xl text-slate-950">
              {event.title || t('calendar.event')}
            </h3>

            <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-400">{t('trainingFeedback.date')}</p>
                <p className="font-semibold text-slate-800">{eventDate}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-400">{t('trainingFeedback.startTime')}</p>
                <p className="font-semibold text-slate-800">{startHour}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-400">{t('trainingFeedback.endTime')}</p>
                <p className="font-semibold text-slate-800">{endHour}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { value: 'positive', icon: '🙂', label: t('trainingFeedback.positive') },
              { value: 'neutral', icon: '😐', label: t('trainingFeedback.neutral') },
              { value: 'negative', icon: '🙁', label: t('trainingFeedback.negative') },
            ].map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={feedbackRating === option.value ? 'default' : 'outline'}
                className="h-auto rounded-3xl px-4 py-5 text-base"
                onClick={() => setFeedbackRating(option.value)}
              >
                <span className="mr-2 text-2xl">{option.icon}</span>
                {option.label}
              </Button>
            ))}
          </div>

          <div className="relative mt-4">
            <textarea
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder={t('trainingFeedback.commentPlaceholder')}
              maxLength={250}
              className="min-h-[88px] w-full resize-none rounded-3xl border border-slate-200 bg-white/95 p-4 pr-16 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            />
          
            <span className="absolute bottom-3 right-4 text-xs text-slate-400">
              {feedbackComment.length}/250
            </span>
          </div>

          <Button
            type="button"
            className="mt-5 h-12 w-full rounded-3xl bg-cyan-600 text-base font-semibold text-white hover:bg-cyan-700"
            disabled={!feedbackRating}
            onClick={handleSubmitTrainingFeedback}
          >
            💬 {t('trainingFeedback.submit')}
          </Button>

          {pendingFeedback.length > 1 && (
            <p className="mt-4 text-center text-xs text-slate-500">
              {t('trainingFeedback.morePending').replace('{count}', pendingFeedback.length - 1)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
})()}


        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          value={data?.teams_count || 0}
          label={t('dashboard.teams')}
          helper={tr('dashboard.activeSportsStructure', 'Estrutura desportiva ativa')}
          tone="primary"
          to="/teams"
        />

        <MetricCard
          icon={Calendar}
          value={upcomingEvents.length}
          label={t('dashboard.events')}
          helper={tr('dashboard.upcomingTrainingAndGames', 'Próximos treinos e jogos')}
          tone="secondary"
          to="/calendar"
        />

        <MetricCard
          icon={ClipboardCheck}
          value={pendingCount}
          label={t('dashboard.convocations')}
          helper={tr('dashboard.awaitingResponse', 'A aguardar resposta')}
          tone="amber"
          to="/convocations"
        />

        <MetricCard
          icon={MessageSquare}
          value={recentMessages.length}
          label={tr('messages.title', 'Mensagens')}
          helper={tr('dashboard.recentCommunication', 'Comunicação recente')}
          tone="purple"
          to="/messages"
        />
      </div>

      {nextEvent && (
        <Card
          className="overflow-hidden border-2 border-primary/25 bg-white shadow-xl shadow-slate-200/80 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
          data-testid="next-event-card"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[170px_1fr]">
            <div
              className={`relative flex min-h-[170px] flex-col justify-between overflow-hidden p-5 text-white ${
                nextEvent.event_type === 'jogo' ? 'bg-primary' : 'bg-secondary'
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
                  {getEventCountdown(nextEvent.start_time)}
                </p>
              </div>

              <div className="relative z-10">
                <span className="text-xs font-semibold uppercase tracking-tight text-white/75">
                  {getEventDateLabel(nextEvent.start_time)}
                </span>
                <div className="mt-1 flex items-end gap-2">
                  <span className="font-heading text-5xl leading-none">
                    {nextEvent.start_time ? format(new Date(nextEvent.start_time), 'd') : '--'}
                  </span>
                  <span className="pb-1 text-sm font-semibold uppercase text-white/80">
                    {nextEvent.start_time
                      ? format(new Date(nextEvent.start_time), 'MMM', {
                          locale: dateLocale,
                        })
                      : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <Badge variant="outline" className="mb-3">
                    {getTranslatedEventType(nextEvent.event_type)}
                  </Badge>

                  <h2 className="font-heading text-2xl tracking-tight text-slate-950 sm:text-3xl">
                    {nextEvent.title || tr('calendar.event', 'Evento')}
                  </h2>

                  {nextEvent.opponent && (
                    <p className="mt-2 text-lg text-slate-500">vs {nextEvent.opponent}</p>
                  )}
                </div>

                <Button asChild className="shrink-0 rounded-full" data-testid="view-event-btn">
                  <Link to="/calendar">
                    {tr('common.seeDetails', 'Ver Detalhes')}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <Clock className="mb-2 h-4 w-4 text-primary" />
                  <p className="font-semibold text-slate-950">
                    {formatTime(nextEvent.start_time)}
                  </p>
                  <p className="text-xs text-slate-400">{tr('championships.time', 'Hora')}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <MapPin className="mb-2 h-4 w-4 text-primary" />
                  <p className="truncate font-semibold text-slate-950">
                    {nextEvent.location || tr('calendar.toDefine', 'A definir')}
                  </p>
                  <p className="text-xs text-slate-400">{tr('championships.venue', 'Local')}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <Users className="mb-2 h-4 w-4 text-primary" />
                  <p className="truncate font-semibold text-slate-950">
                    {nextEvent.team?.name || tr('common.selectTeam', 'Equipa')}
                  </p>
                  <p className="text-xs text-slate-400">{tr('dashboard.group', 'Grupo')}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-3 transition-all duration-200 hover:border-primary/40 hover:shadow-md"
                    data-testid={`event-row-${event.id}`}
                  >
                    <div
                      className={`h-14 w-1.5 rounded-full ${
                        event.event_type === 'jogo' ? 'bg-primary' : 'bg-secondary'
                      }`}
                    />

                    <div className="w-14 shrink-0 text-center">
                      <p className="text-xs uppercase text-slate-400">
                        {event.start_time
                          ? format(new Date(event.start_time), 'EEE', { locale: dateLocale })
                          : '--'}
                      </p>
                      <p className="font-heading text-2xl text-slate-950">
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
                  </div>
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

        <CardWithStripe
          stripeColor="amber"
          className="overflow-hidden border border-amber-100 bg-white shadow-xl shadow-slate-200/70"
          data-testid="convocations-section"
        >
          <CardStripeHeader className="flex flex-row items-center justify-between pb-2">
            <CardStripeTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ClipboardCheck className="h-5 w-5 text-amber-500" />
              {t('dashboard.convocations')}
            </CardStripeTitle>

            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <Link to="/convocations">{t('dashboard.seeAll')}</Link>
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

                    <p className="text-sm font-semibold text-slate-950">
                      {item.event?.title || tr('calendar.event', 'Evento')}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatTime(item.event?.start_time)}
                      {item.event?.location ? ` • ${item.event.location}` : ''}
                    </p>

                    <div className="mt-3 flex gap-2">
                      <Button
                        asChild
                        size="sm"
                        className="h-8 flex-1 rounded-full bg-secondary hover:bg-secondary/90"
                      >
                        <Link to="/convocations">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          {tr('common.confirm', 'Confirmar')}
                        </Link>
                      </Button>

                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8 flex-1 rounded-full border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Link to="/convocations">
                          <XCircle className="mr-1 h-3 w-3" />
                          {tr('attendance.unavailable', 'Indisponível')}
                        </Link>
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
      </div>
    </div>
  );
}

