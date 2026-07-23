import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  dashboardApi,
  paymentsApi,
  commitmentApi,
  trainingFeedbackApi,
  convocationsApi,
} from '../services/api';
import { Skeleton } from '../components/ui/skeleton';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { formatTime, getEventTypeName } from '../lib/utils';
import { format, isToday, isTomorrow, differenceInCalendarDays } from 'date-fns';
import { pt, es, fr, it, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import DashboardHero from '../components/dashboard/DashboardHero';
import DashboardMetricCard from '../components/dashboard/DashboardMetricCard';
import CommitmentCard from '../components/dashboard/CommitmentCard';
import TrainingFeedbackModal from '../components/dashboard/TrainingFeedbackModal';
import NextEventCard from '../components/dashboard/NextEventCard';
import UpcomingEventsCard from '../components/dashboard/UpcomingEventsCard';
import PendingActionsCard from '../components/dashboard/PendingActionsCard';
import { usePermissions } from '../context/PermissionsContext';
import DashboardQuickActions from '../components/dashboard/DashboardQuickActions';
import DashboardTodayPanel from '../components/dashboard/DashboardTodayPanel';
import { getVisibleDashboardQuickActions } from '../config/navigation';
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

export default function Dashboard() {
  const { user, activeProfile } = useAuth();
  const { t, language } = useLanguage();
  const permissions = usePermissions();
  
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

  const fetchPaymentStatus = async () => {
    try {
      const response = await paymentsApi.getStatus();
      setPaymentStatus(response?.data || null);
    } catch (error) {
      console.log('Payment status not available');
      setPaymentStatus(null);
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

  const upcomingEvents = useMemo(() => data?.upcoming_events || [], [data]);
  const pendingConvocations = useMemo(() => data?.pending_convocations || [], [data]);
  const recentMessages = useMemo(() => data?.recent_messages || [], [data]);

  const nextEvent = upcomingEvents[0] || null;
  const pendingCount = pendingConvocations.length;
  const dateFormat = language === 'pt' ? "EEEE, d 'de' MMMM" : 'EEEE, d MMMM';

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

  const navigationUser = useMemo(() => {
    const profileRole =
      activeProfile?.type === 'associated'
        ? 'jogador'
        : activeProfile?.role || activeProfile?.active_role || user?.role;
  
    return {
      ...user,
      role: profileRole,
    };
  }, [user, activeProfile]);

  const activeDashboardRole = navigationUser?.role || user?.role || 'jogador';
  
  const quickActions = useMemo(() => {
    return getVisibleDashboardQuickActions(navigationUser, permissions)
      .slice(0, 6)
      .map((item) => ({
        to: item.path,
        icon: item.icon,
        label: item.labelKey
          ? tr(item.labelKey, item.fallbackLabel)
          : item.fallbackLabel,
        description: item.descriptionKey
          ? tr(item.descriptionKey, item.fallbackDescription)
          : item.fallbackDescription,
      }));
  }, [navigationUser, permissions, tr]);
  
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
    <div
      className="space-y-4 pb-20 lg:space-y-6 lg:pb-0"
      data-testid="dashboard-page"
    >
      <DashboardHero
        badge="StickPro Club OS"
        title={`${getGreeting()}, ${
          displayName?.split(' ')?.[0] || tr('common.user', 'Utilizador')
        }.`}
        subtitle={t('dashboard.heroSubtitle')}
        meta={[
          {
            icon: Calendar,
            iconClass: 'text-cyan-300',
            text: format(new Date(), dateFormat, {
              locale: dateLocale,
            }),
          },
          {
            icon: ShieldCheck,
            iconClass: 'text-emerald-300',
            text: t('dashboard.operationalActive'),
          },
          ...(paymentHeroStatus && PaymentHeroIcon
            ? [
                {
                  icon: PaymentHeroIcon,
                  iconClass: paymentHeroStatus.iconClass,
                  text: paymentHeroStatus.text,
                  to: '/payments',
                },
              ]
            : []),
        ]}
      />
      <DashboardQuickActions
        actions={quickActions}
        title={tr('dashboard.quickActionsTitle', 'Ações rápidas')}
        subtitle={tr(
          'dashboard.quickActionsSubtitle',
          'Aceda rapidamente às funcionalidades mais utilizadas.'
        )}
      />

      <DashboardTodayPanel
        nextEvent={nextEvent}
        pendingCount={pendingCount}
        messagesCount={recentMessages.length}
        role={activeDashboardRole}
        getEventDayLink={getEventDayLink}
        formatTime={formatTime}
        tr={tr}
      />      
      
      <CommitmentCard commitment={commitment} t={t} tr={tr} />

      <TrainingFeedbackModal
        pendingFeedback={pendingFeedback}
        feedbackRating={feedbackRating}
        feedbackComment={feedbackComment}
        setFeedbackRating={setFeedbackRating}
        setFeedbackComment={setFeedbackComment}
        submittingFeedback={submittingFeedback}
        onSubmit={handleSubmitTrainingFeedback}
        t={t}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <DashboardMetricCard
          icon={StickTeamIcon}
          value={data?.teams_count || 0}
          label={t('dashboard.teams')}
          helper={tr('dashboard.activeSportsStructure', 'Estrutura desportiva ativa')}
          tone="primary"
          to="/my-teams"
        />

        <DashboardMetricCard
          icon={StickCalendarIcon}
          value={upcomingEvents.length}
          label={t('dashboard.events')}
          helper={tr('dashboard.upcomingTrainingAndGames', 'Próximos treinos e jogos')}
          tone="secondary"
          to="/calendar"
        />

        <DashboardMetricCard
          icon={StickConvocationIcon}
          value={pendingCount}
          label={tr('dashboard.pendingActions', 'Pendentes')}
          helper={tr('dashboard.awaitingResponse', 'A aguardar resposta')}
          tone="amber"
          to="/calendar?view=agenda"
        />

        <DashboardMetricCard
          icon={StickMessageIcon}
          value={recentMessages.length}
          label={tr('messages.title', 'Mensagens')}
          helper={tr('dashboard.recentCommunication', 'Comunicação recente')}
          tone="purple"
          to={getMessageLink()}
        />
      </div>

      <NextEventCard
        event={nextEvent}
        getEventDayLink={getEventDayLink}
        getEventCountdown={getEventCountdown}
        getEventDateLabel={getEventDateLabel}
        getTranslatedEventType={getTranslatedEventType}
        formatTime={formatTime}
        format={format}
        dateLocale={dateLocale}
        tr={tr}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <UpcomingEventsCard
          events={upcomingEvents}
          getEventDayLink={getEventDayLink}
          getTranslatedEventType={getTranslatedEventType}
          formatTime={formatTime}
          format={format}
          dateLocale={dateLocale}
          t={t}
          tr={tr}
        />

        <PendingActionsCard
          pendingConvocations={pendingConvocations}
          updatingConvocation={updatingConvocation}
          onUpdateConvocation={handleUpdateDashboardConvocation}
          getEventDayLink={getEventDayLink}
          formatTime={formatTime}
          format={format}
          dateLocale={dateLocale}
          t={t}
          tr={tr}
        />
      </div>
    </div>
  );
}

