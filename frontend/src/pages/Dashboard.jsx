import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  dashboardApi,
  paymentsApi,
  commitmentApi,
  trainingFeedbackApi,
  convocationsApi,
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
  Loader2,
} from 'lucide-react';
import { formatTime, getEventTypeName } from '../lib/utils';
import { format, isToday, isTomorrow, differenceInCalendarDays } from 'date-fns';
import { pt, es, fr, it, enUS } from 'date-fns/locale';
import { toast } from 'sonner';

const locales = { pt, es, fr, it, en: enUS };

const StickIconBase = ({ children, className = '' }) => (
  <svg
    viewBox="0 0 64 64"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const StickTeamIcon = ({ className = '' }) => (
  <StickIconBase className={className}>
    <circle cx="22" cy="21" r="8" stroke="currentColor" strokeWidth="4" />
    <circle cx="43" cy="22" r="7" stroke="currentColor" strokeWidth="4" />
    <path d="M10 52c2.5-10 9-16 18-16s15.5 6 18 16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    <path d="M35 39c4.5 1.5 8 5.5 10.5 12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
    <path d="M16 57h31" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </StickIconBase>
);

const StickCalendarIcon = ({ className = '' }) => (
  <StickIconBase className={className}>
    <rect x="12" y="15" width="40" height="37" rx="8" stroke="currentColor" strokeWidth="4" />
    <path d="M20 10v11M44 10v11M13 28h38" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    <path d="M23 39h4M37 39h4M23 47h4M37 47h4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </StickIconBase>
);

const StickConvocationIcon = ({ className = '' }) => (
  <StickIconBase className={className}>
    <rect x="14" y="9" width="36" height="46" rx="7" stroke="currentColor" strokeWidth="4" />
    <path d="M23 23h18M23 34h18M23 45h10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    <path d="M20 23l2 2 4-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </StickIconBase>
);

const StickMessageIcon = ({ className = '' }) => (
  <StickIconBase className={className}>
    <path d="M13 17h38v26H29L18 53V43h-5V17Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
    <path d="M23 28h18M23 36h11" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </StickIconBase>
);

const StickSkateIcon = ({ className = '' }) => (
  <StickIconBase className={className}>
    <path d="M18 15c6 2 14 2 22 0l5 22H17l1-22Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
    <path d="M17 37h32c3 0 5 2 5 5v3H13v-3c0-3 2-5 4-5Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
    <circle cx="23" cy="51" r="5" stroke="currentColor" strokeWidth="4" />
    <circle cx="43" cy="51" r="5" stroke="currentColor" strokeWidth="4" />
    <path d="M25 22h14M26 29h12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </StickIconBase>
);

const StickGoalIcon = ({ className = '' }) => (
  <StickIconBase className={className}>
    <path d="M10 50V18h36l8 32" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
    <path d="M10 18h36M17 18v32M24 18v32M31 18v32M38 18v32M10 28h39M10 38h42" stroke="currentColor" strokeWidth="2.5" opacity="0.65" />
    <path d="M10 18h36" stroke="#f97316" strokeWidth="5" strokeLinecap="round" />
    <path d="M10 18v32" stroke="#f97316" strokeWidth="5" strokeLinecap="round" />
  </StickIconBase>
);

const StickTrophyIcon = ({ className = '' }) => (
  <StickIconBase className={className}>
    <path d="M22 12h20v11c0 9-4 16-10 16S22 32 22 23V12Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
    <path d="M22 17H12v5c0 7 5 11 11 11M42 17h10v5c0 7-5 11-11 11" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M32 39v9M23 53h18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </StickIconBase>
);


export default function Dashboard() {
  const { user, activeProfile } = useAuth();
  const { t, language } = useLanguage();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [commitment, setCommitment] = useState(null);
  const [pendingFeedback, setPendingFeedback] = useState([]);
  const [feedbackRating, setFeedbackRating] = useState('');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [updatingConvocation, setUpdatingConvocation] = useState(null);

  const dateLocale = locales[language] || pt;

  const displayName =
  activeProfile?.user_name ||
  activeProfile?.label ||
  user?.name ||
  '';
  
  const tr = (key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };


  const getEventDayLink = (event) => {
    if (!event?.id || !event?.start_time) return '/calendar';

    const date = format(new Date(event.start_time), 'yyyy-MM-dd');
    return `/calendar?view=day&date=${date}&eventId=${event.id}`;
  };

  const getMessageLink = () => {
    const message = recentMessages?.[0];

    if (!message) return '/messages';

    const query = new URLSearchParams();

    if (message.thread_id) query.set('thread_id', message.thread_id);
    if (message.id) query.set('message_id', message.id);
    if (message.team_id) query.set('team_id', message.team_id);

    const queryString = query.toString();

    return queryString ? `/messages?${queryString}` : '/messages';
  };

  const handleUpdateDashboardConvocation = async (attendanceId, status) => {
    if (!attendanceId) return;

    setUpdatingConvocation(attendanceId);

    try {
      await convocationsApi.updateAttendance(attendanceId, {
        status,
        reason: status === 'ausente' ? tr('attendance.unavailable', 'Indisponível') : null,
      });

      window.dispatchEvent(
        new CustomEvent('stickpro:convocation-updated', {
          detail: { attendanceId, status },
        })
      );

      toast.success(
        status === 'confirmado'
          ? tr('attendance.presenceConfirmed', 'Presença confirmada')
          : tr('attendance.absenceRegistered', 'Ausência registada')
      );

      await Promise.all([fetchDashboard(), fetchCommitment()]);
    } catch (error) {
      console.error('Error updating dashboard convocation:', error);
      toast.error(tr('attendance.updateError', 'Erro ao atualizar presença'));
    } finally {
      setUpdatingConvocation(null);
    }
  };

  useEffect(() => {
    const handleConvocationUpdated = () => {
      fetchDashboard();
      fetchCommitment();
    };

    window.addEventListener('stickpro:convocation-updated', handleConvocationUpdated);

    return () => {
      window.removeEventListener('stickpro:convocation-updated', handleConvocationUpdated);
    };
  }, [activeProfile]);

  useEffect(() => {
    fetchDashboard();
    fetchPaymentStatus();
    fetchCommitment();
    fetchPendingFeedback();
  }, [activeProfile]);

const fetchDashboard = async () => {
  try {
    setLoading(true);
    const response = await dashboardApi.get(activeProfile);
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

      <CardContent className="relative p-3 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className={`rounded-xl bg-gradient-to-br p-2.5 shadow-lg sm:rounded-2xl sm:p-3 ${currentTone.icon}`}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>

          {to && (
            <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-700" />
          )}
        </div>

       <div className="mt-3 sm:mt-5">
          <p className="font-heading text-3xl leading-none tracking-tight text-slate-950 sm:text-6xl">
            {value}
          </p>
        
          <p className="mt-1 truncate text-xs font-semibold text-slate-700 sm:text-sm">
            {label}
          </p>
        
          {helper && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5">
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
      <Link to="/attendance" className="block">
        <section className="relative overflow-hidden rounded-[1.5rem] border border-amber-200/70 bg-slate-950 px-4 py-3 text-white shadow-xl shadow-amber-100/60 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-amber-100/70 sm:px-5 lg:rounded-[1.75rem]">
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
        
            <h2 className="font-heading text-xl font-bold text-white sm:text-2xl">
              {t('commitment.myCommitment')}
            </h2>
        
            <p className="mt-1 line-clamp-2 text-xs text-white/70 sm:text-sm lg:line-clamp-none">
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
      </Link>
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
    <div className="space-y-4 pb-20 pt-1 lg:space-y-6 lg:-mt-12 lg:pb-0" data-testid="dashboard-page">
      <section className="relative overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-slate-950 p-4 text-white shadow-xl shadow-slate-200/70 sm:p-6 lg:rounded-[2rem] lg:p-6">
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

            <h1 className="font-heading text-2xl leading-tight tracking-tight sm:text-5xl">
              {getGreeting()}, {displayName?.split(' ')?.[0] || tr('common.user', 'Utilizador')}.
            </h1>

            <p className="mt-2 line-clamp-2 max-w-2xl text-xs leading-5 text-slate-300 sm:text-base lg:line-clamp-none">
              {t('dashboard.heroSubtitle')}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300 sm:text-sm">
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


        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          icon={StickTeamIcon}
          value={data?.teams_count || 0}
          label={t('dashboard.teams')}
          helper={tr('dashboard.activeSportsStructure', 'Estrutura desportiva ativa')}
          tone="primary"
          to="/my-teams"
        />

        <MetricCard
          icon={StickCalendarIcon}
          value={upcomingEvents.length}
          label={t('dashboard.events')}
          helper={tr('dashboard.upcomingTrainingAndGames', 'Próximos treinos e jogos')}
          tone="secondary"
          to="/calendar"
        />

        <MetricCard
          icon={StickConvocationIcon}
          value={pendingCount}
          label={t('dashboard.convocations')}
          helper={tr('dashboard.awaitingResponse', 'A aguardar resposta')}
          tone="amber"
          to="/convocations"
        />

        <MetricCard
          icon={StickMessageIcon}
          value={recentMessages.length}
          label={tr('messages.title', 'Mensagens')}
          helper={tr('dashboard.recentCommunication', 'Comunicação recente')}
          tone="purple"
          to={getMessageLink()}
        />
      </div>

      {nextEvent && (
        <Card
          className="overflow-hidden border-2 border-primary/25 bg-white shadow-xl shadow-slate-200/80 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
          data-testid="next-event-card"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[170px_1fr]">
            <div
              className={`relative flex min-h-[120px] flex-row items-center justify-between gap-3 overflow-hidden p-4 text-white lg:min-h-[170px] lg:flex-col lg:items-stretch lg:p-5 ${
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
                  <span className="font-heading text-3xl leading-none lg:text-5xl">
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

                  <h2 className="font-heading text-xl tracking-tight text-slate-950 sm:text-3xl">
                    {nextEvent.title || tr('calendar.event', 'Evento')}
                  </h2>

                  {nextEvent.opponent && (
                    <p className="mt-2 text-lg text-slate-500">vs {nextEvent.opponent}</p>
                  )}
                </div>

                <Button asChild className="shrink-0 rounded-full" data-testid="view-event-btn">
                  <Link to={getEventDayLink(nextEvent)}>
                    {tr('common.seeDetails', 'Ver Detalhes')}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3 sm:gap-3">
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
                        onClick={() => handleUpdateDashboardConvocation(item.attendance?.id, 'confirmado')}
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
                        onClick={() => handleUpdateDashboardConvocation(item.attendance?.id, 'ausente')}
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
      </div>
    </div>
  );
}
