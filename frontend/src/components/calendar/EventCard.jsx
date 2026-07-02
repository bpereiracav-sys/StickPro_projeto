import {
  Calendar as CalendarIcon,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Dumbbell,
  Edit,
  Flag,
  HelpCircle,
  MapPin,
  MessageSquare,
  MoreVertical,
  PauseCircle,
  Swords,
  Trash2,
  Trophy,
  Users,
  Award,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { convocationsApi } from '../../services/api';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const BirthdayIcon = ({ className = '' }) => (
  <span className={className} aria-hidden="true">
    🎂
  </span>
);

export const DEFAULT_EVENT_TYPES = {
  treino: {
    label: 'Treino',
    icon: Dumbbell,
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
  },
  jogo_campeonato: {
    label: 'Jogo Campeonato',
    icon: Trophy,
    color: 'bg-amber-500',
    textColor: 'text-amber-600',
  },
  jogo_amigavel: {
    label: 'Jogo Amigável',
    icon: Swords,
    color: 'bg-green-500',
    textColor: 'text-green-600',
  },
  torneio: {
    label: 'Torneio',
    icon: Flag,
    color: 'bg-purple-500',
    textColor: 'text-purple-600',
  },
  birthday: {
    label: 'Aniversário',
    icon: BirthdayIcon,
    color: 'bg-pink-500',
    textColor: 'text-pink-600',
  },
  outro: {
    label: 'Outro',
    icon: CalendarIcon,
    color: 'bg-slate-500',
    textColor: 'text-slate-600',
  },
};

const safeTranslate = (t, key, fallback) => {
  const value = typeof t === 'function' ? t(key) : null;
  return value && value !== key ? value : fallback;
};

function isGameEvent(event) {
  return ['jogo_campeonato', 'jogo_amigavel', 'torneio', 'jogo', 'game'].includes(
    event?.event_type
  );
}

function getTeamName(event, teams, t) {
  if (event?.team?.name) return event.team.name;
  const team = teams.find((item) => item.id === event?.team_id);
  return team?.name || safeTranslate(t, 'common.selectTeam', 'Equipa');
}

function getCompetitionName(event) {
  return (
    event?.championship?.name ||
    event?.championship_name ||
    event?.competition_name ||
    null
  );
}

function getEventScore(event) {
  const home =
    event?.home_score ??
    event?.result?.home_score ??
    event?.match_result?.home_score ??
    null;
  const away =
    event?.away_score ??
    event?.result?.away_score ??
    event?.match_result?.away_score ??
    null;

  if (home === null || away === null) return null;
  return `${home} - ${away}`;
}

function getInitialAttendanceStatus(event) {
  return (
    event?.optimistic_status ||
    event?.my_attendance_status ||
    event?.attendance_status ||
    event?.my_attendance?.status ||
    event?.attendance?.status ||
    null
  );
}

function getAttendanceId(event) {
  return (
    event?.my_attendance_id ||
    event?.attendance_id ||
    event?.my_attendance?.id ||
    event?.attendance?.id ||
    null
  );
}

function isPrivateConvocation(event) {
  return (
    event?.is_private_convocation ||
    event?.convocation?.is_private ||
    event?.convocation_visibility === 'private' ||
    event?.convocation_status === 'private'
  );
}

function hasConvocation(event) {
  return Boolean(
    event?.has_convocation ||
      event?.convocation ||
      event?.convocation_id ||
      event?.convocation_status ||
      event?.convocation_lifecycle_status
  );
}

function getConvocationStatusConfig(status, t, event) {
  if (isPrivateConvocation(event)) {
    return {
      label: safeTranslate(t, 'convocations.private', 'Privado'),
      className: 'border-violet-200 bg-violet-50 text-violet-700',
      icon: ClipboardCheck,
      tone: 'violet',
    };
  }

  if (status === 'confirmado') {
    return {
      label: safeTranslate(t, 'attendance.confirmed', 'Confirmou presença'),
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      icon: CheckCircle,
      tone: 'emerald',
    };
  }

  if (status === 'ausente' || status === 'faltou_sem_aviso') {
    return {
      label: safeTranslate(t, 'attendance.absent', 'Ausente'),
      className: 'border-red-200 bg-red-50 text-red-700',
      icon: XCircle,
      tone: 'red',
    };
  }

  if (status === 'pendente') {
    return {
      label: safeTranslate(t, 'attendance.pending', 'Pendente'),
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      icon: HelpCircle,
      tone: 'amber',
    };
  }

  if (
    status === 'lancada' ||
    status === 'launched' ||
    status === 'published' ||
    status === 'closed'
  ) {
    return {
      label: safeTranslate(t, 'convocations.launched', 'Convocatória efetuada'),
      className: 'border-cyan-200 bg-cyan-50 text-cyan-700',
      icon: ClipboardCheck,
      tone: 'cyan',
    };
  }

  if (status === 'draft') {
    return {
      label: safeTranslate(t, 'convocations.draft', 'Rascunho'),
      className: 'border-slate-200 bg-slate-50 text-slate-600',
      icon: ClipboardCheck,
      tone: 'slate',
    };
  }

  return {
    label: safeTranslate(t, 'convocations.notLaunched', 'Convocatória não lançada'),
    className: 'border-slate-200 bg-slate-50 text-slate-500',
    icon: ClipboardCheck,
    tone: 'slate',
  };
}

function getOperationalSummary(event, visibleAttendanceStatus, eventHasConvocation, t) {
  if (event?.event_type === 'birthday') {
    return safeTranslate(t, 'calendar.birthday', 'Aniversário');
  }

  if (!eventHasConvocation) {
    return safeTranslate(
      t,
      'calendar.eventCenterNoConvocation',
      'Evento criado, convocatória ainda não lançada.'
    );
  }

  if (visibleAttendanceStatus === 'confirmado') {
    return safeTranslate(
      t,
      'calendar.eventCenterConfirmed',
      'Presença confirmada para este evento.'
    );
  }

  if (visibleAttendanceStatus === 'ausente') {
    return safeTranslate(
      t,
      'calendar.eventCenterAbsent',
      'Ausência registada para este evento.'
    );
  }

  if (visibleAttendanceStatus === 'pendente') {
    return safeTranslate(
      t,
      'calendar.eventCenterPending',
      'Existe uma convocatória pendente de resposta.'
    );
  }

  return safeTranslate(
    t,
    'calendar.eventCenterReady',
    'Evento pronto para consulta e acompanhamento.'
  );
}


function getOperationalState(event, visibleAttendanceStatus, eventHasConvocation, eventPassed, t) {
  if (event?.status === 'cancelled') {
    return {
      label: safeTranslate(t, 'calendar.operationalCancelled', 'Evento cancelado'),
      description: safeTranslate(
        t,
        'calendar.operationalCancelledHelp',
        'Este evento foi cancelado e não requer novas ações.'
      ),
      className: 'border-red-200 bg-red-50 text-red-700',
      icon: XCircle,
    };
  }

  if (event?.status === 'postponed') {
    return {
      label: safeTranslate(t, 'calendar.operationalPostponed', 'Evento adiado'),
      description: safeTranslate(
        t,
        'calendar.operationalPostponedHelp',
        'Este evento está adiado. Confirme a nova data antes de avançar.'
      ),
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      icon: PauseCircle,
    };
  }

  if (!eventHasConvocation) {
    return {
      label: safeTranslate(t, 'calendar.operationalAwaitingConvocation', 'Aguarda convocatória'),
      description: safeTranslate(
        t,
        'calendar.operationalAwaitingConvocationHelp',
        'O evento está criado, mas ainda não existe convocatória associada.'
      ),
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      icon: HelpCircle,
    };
  }

  if (visibleAttendanceStatus === 'pendente') {
    return {
      label: safeTranslate(t, 'calendar.operationalPendingResponse', 'Resposta pendente'),
      description: safeTranslate(
        t,
        'calendar.operationalPendingResponseHelp',
        'Existe uma convocatória pendente de resposta.'
      ),
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      icon: HelpCircle,
    };
  }

  if (eventPassed) {
    return {
      label: safeTranslate(t, 'calendar.operationalCompleted', 'Evento realizado'),
      description: safeTranslate(
        t,
        'calendar.operationalCompletedHelp',
        'Evento concluído. Consulte presenças, feedback e estatísticas.'
      ),
      className: 'border-slate-200 bg-slate-50 text-slate-700',
      icon: CheckCircle,
    };
  }

  return {
    label: safeTranslate(t, 'calendar.operationalActive', 'Evento operacional'),
    description: safeTranslate(
      t,
      'calendar.operationalActiveHelp',
      'Evento pronto para acompanhamento operacional.'
    ),
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: CheckCircle,
  };
}

function getAttendanceSummary(event, visibleAttendanceStatus, t) {
  const present =
    event?.attendance_summary?.present ??
    event?.attendance_summary?.confirmed ??
    event?.present_count ??
    event?.confirmed_count ??
    event?.convocation_status_summary?.present ??
    null;

  const pending =
    event?.attendance_summary?.pending ??
    event?.pending_count ??
    event?.convocation_status_summary?.pending ??
    null;

  const total =
    event?.attendance_summary?.total ??
    event?.total_convoked ??
    event?.convocation_total ??
    event?.convocation?.player_ids?.length ??
    null;

  if (total !== null && present !== null) {
    const pendingText =
      pending !== null
        ? ` · ${pending} ${safeTranslate(t, 'attendance.pendingShort', 'pendentes')}`
        : '';

    return `${present}/${total} ${safeTranslate(t, 'attendance.confirmedShort', 'confirmados')}${pendingText}`;
  }

  if (visibleAttendanceStatus) {
    return safeTranslate(t, 'calendar.myStatus', 'O meu estado') + `: ${visibleAttendanceStatus}`;
  }

  return safeTranslate(t, 'attendance.noSummaryYet', 'Sem resumo disponível');
}

function getTimelineSteps(eventHasConvocation, visibleAttendanceStatus, eventPassed, event, t) {
  const statusDone = ['confirmado', 'ausente', 'faltou_sem_aviso'].includes(visibleAttendanceStatus);

  return [
    {
      key: 'created',
      label: safeTranslate(t, 'calendar.timelineCreated', 'Evento criado'),
      done: true,
    },
    {
      key: 'convocation',
      label: safeTranslate(t, 'calendar.timelineConvocation', 'Convocatória'),
      done: eventHasConvocation,
      muted: !eventHasConvocation,
    },
    {
      key: 'attendance',
      label: safeTranslate(t, 'calendar.timelineAttendance', 'Presenças'),
      done: statusDone || eventPassed,
      muted: !eventHasConvocation,
    },
    {
      key: 'completed',
      label: safeTranslate(t, 'calendar.timelineCompleted', 'Realizado'),
      done: eventPassed,
      muted: event?.status === 'cancelled',
    },
  ];
}

function TimelineStep({ step, isLast }) {
  return (
    <div className="flex min-w-0 flex-1 items-center">
      <div className="flex min-w-0 flex-col items-center">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold ${
            step.done
              ? 'border-cyan-200 bg-cyan-500 text-white'
              : step.muted
                ? 'border-slate-200 bg-slate-100 text-slate-400'
                : 'border-amber-200 bg-amber-50 text-amber-600'
          }`}
        >
          {step.done ? '✓' : '•'}
        </span>
        <span className="mt-1 max-w-[80px] truncate text-center text-[10px] font-medium text-slate-500">
          {step.label}
        </span>
      </div>

      {!isLast && (
        <div
          className={`mx-2 h-0.5 flex-1 rounded-full ${
            step.done ? 'bg-cyan-200' : 'bg-slate-200'
          }`}
        />
      )}
    </div>
  );
}

function EventCenterActionCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = 'slate',
  actionLabel,
  onClick,
  disabled = false,
}) {
  const tones = {
    cyan: 'border-cyan-100 bg-cyan-50/70 text-cyan-700',
    emerald: 'border-emerald-100 bg-emerald-50/70 text-emerald-700',
    purple: 'border-purple-100 bg-purple-50/70 text-purple-700',
    amber: 'border-amber-100 bg-amber-50/70 text-amber-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
  };

  return (
    <div className={`rounded-2xl border p-3 ${tones[tone] || tones.slate}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide">{title}</p>
        {Icon && <Icon className="h-4 w-4" />}
      </div>

      <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-950">
        {value}
      </p>

      {helper && (
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
          {helper}
        </p>
      )}

      {actionLabel && onClick && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 h-8 rounded-full px-0 hover:bg-transparent"
          onClick={onClick}
          disabled={disabled}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}


export default function EventCard({
  event,
  teams = [],
  eventTypes = DEFAULT_EVENT_TYPES,
  t,
  canManageEvents = false,
  canCreateConvocations = false,
  isAdmin = false,
  canAccessTeam = () => false,
  openConvocationStatusDialog,
  openConvocationDialog,
  openEditDialog,
  openPostponeDialog,
  handleCancelEvent,
  handleRestoreEvent,
  setSelectedEvent,
  setDeleteDialogOpen,
  onConvocationStatusUpdated,
}) {
  const navigate = useNavigate();
  const [localAttendanceStatus, setLocalAttendanceStatus] = useState(
    getInitialAttendanceStatus(event)
  );
  const [updatingAttendance, setUpdatingAttendance] = useState(false);

  if (!event) return null;

  const eventType = eventTypes[event.event_type] || eventTypes.outro;
  const Icon = eventType.icon || CalendarIcon;
  const isBirthday = event.event_type === 'birthday';
  const isGame = isGameEvent(event);
  const isPostponed = event.status === 'postponed';
  const isCancelled = event.status === 'cancelled';
  const start = event.start_time ? parseISO(event.start_time) : null;
  const end = event.end_time ? parseISO(event.end_time) : null;
  const canManageThisEvent =
    canManageEvents && (isAdmin || canAccessTeam(event.team_id));
  const competitionName = getCompetitionName(event);
  const score = getEventScore(event);
  const attendanceId = getAttendanceId(event);
  const eventHasConvocation = hasConvocation(event);
  const visibleAttendanceStatus =
    localAttendanceStatus || getInitialAttendanceStatus(event);
  const convocationStatusConfig = getConvocationStatusConfig(
    eventHasConvocation
      ? visibleAttendanceStatus || event.convocation_lifecycle_status || 'lancada'
      : null,
    t,
    event
  );
  const ConvocationStatusIcon = convocationStatusConfig.icon;
  const eventEnd = end || start;
  const eventPassed = eventEnd ? eventEnd < new Date() : false;
  const canUpdateOwnConvocation =
    attendanceId && (!eventPassed || canManageThisEvent);
  const operationalState = getOperationalState(
    event,
    visibleAttendanceStatus,
    eventHasConvocation,
    eventPassed,
    t
  );
  const OperationalStateIcon = operationalState.icon;
  const attendanceSummary = getAttendanceSummary(event, visibleAttendanceStatus, t);
  const timelineSteps = getTimelineSteps(
    eventHasConvocation,
    visibleAttendanceStatus,
    eventPassed,
    event,
    t
  );

  const getEventDayUrl = () => {
    if (!event?.id || !event?.start_time) return '/calendar';
    return `/calendar?view=day&date=${format(
      parseISO(event.start_time),
      'yyyy-MM-dd'
    )}&eventId=${event.id}`;
  };

  const openEventDay = () => {
    navigate(getEventDayUrl());
  };

  const stop = (clickEvent) => clickEvent?.stopPropagation?.();

  const handleShowConvocationStatus = (clickEvent = null) => {
    stop(clickEvent);
    if (typeof openConvocationStatusDialog === 'function') {
      openConvocationStatusDialog(event);
    }
  };

  const handleOpenConvocation = (clickEvent = null) => {
    stop(clickEvent);
    if (typeof openConvocationDialog === 'function') {
      openConvocationDialog(event);
    }
  };

  const handleEdit = (clickEvent = null) => {
    stop(clickEvent);
    if (typeof openEditDialog === 'function') {
      openEditDialog(event);
    }
  };

  const handlePostpone = (clickEvent = null) => {
    stop(clickEvent);
    if (typeof openPostponeDialog === 'function') {
      openPostponeDialog(event);
    }
  };

  const handleCancel = (clickEvent = null) => {
    stop(clickEvent);
    if (typeof handleCancelEvent === 'function') {
      handleCancelEvent(event);
    }
  };

  const handleRestore = (clickEvent = null) => {
    stop(clickEvent);
    if (typeof handleRestoreEvent === 'function') {
      handleRestoreEvent(event);
    }
  };

  const handleDelete = (clickEvent = null) => {
    stop(clickEvent);
    if (typeof setSelectedEvent === 'function') {
      setSelectedEvent(event);
    }

    if (typeof setDeleteDialogOpen === 'function') {
      setDeleteDialogOpen(true);
    }
  };

  const handleUpdateOwnConvocation = async (status, clickEvent = null) => {
    stop(clickEvent);
    if (!attendanceId || updatingAttendance) return;

    setUpdatingAttendance(true);

    try {
      await convocationsApi.updateAttendance(attendanceId, {
        status,
        reason:
          status === 'ausente'
            ? safeTranslate(t, 'attendance.unavailable', 'Indisponível')
            : null,
      });

      setLocalAttendanceStatus(status);

      window.dispatchEvent(
        new CustomEvent('stickpro:convocation-updated', {
          detail: {
            eventId: event.id,
            attendanceId,
            status,
          },
        })
      );

      if (typeof onConvocationStatusUpdated === 'function') {
        onConvocationStatusUpdated({ eventId: event.id, attendanceId, status });
      }

      toast.success(
        status === 'confirmado'
          ? safeTranslate(t, 'attendance.presenceConfirmed', 'Presença confirmada')
          : safeTranslate(t, 'attendance.absenceRegistered', 'Ausência registada')
      );
    } catch (error) {
      console.error('Error updating event convocation:', error);
      toast.error(
        safeTranslate(t, 'attendance.updateError', 'Erro ao atualizar presença')
      );
    } finally {
      setUpdatingAttendance(false);
    }
  };

  const openAttendance = (clickEvent = null) => {
    stop(clickEvent);
    navigate(`/attendance?event_id=${event.id}`);
  };

  const openMessages = (clickEvent = null) => {
    stop(clickEvent);
    const query = new URLSearchParams();
    if (event.team_id) query.set('team_id', event.team_id);
    if (event.id) query.set('event_id', event.id);
    navigate(`/messages?${query.toString()}`);
  };

  const operationalSummary = getOperationalSummary(
    event,
    visibleAttendanceStatus,
    eventHasConvocation,
    t
  );

  if (isBirthday) {
    return (
      <div className="rounded-3xl border border-pink-100 bg-gradient-to-br from-white via-pink-50 to-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-pink-100 text-3xl">
            🎂
          </div>
          <div>
            <Badge variant="outline" className="border-pink-200 bg-pink-50 text-pink-700">
              {eventType.label}
            </Badge>
            <h3 className="mt-1 font-heading text-xl text-slate-950">{event.title}</h3>
            <p className="text-sm text-slate-500">
              {event.age
                ? safeTranslate(t, 'calendar.turnsAge', `${event.age} anos`)
                : safeTranslate(t, 'calendar.birthday', 'Aniversário')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={openEventDay}
      onKeyDown={(keyEvent) => {
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          keyEvent.preventDefault();
          openEventDay();
        }
      }}
      className={`group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99] ${
        isCancelled ? 'opacity-55' : isPostponed ? 'opacity-80' : ''
      }`}
      data-testid={`event-center-card-${event.id}`}
    >
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-4 text-white sm:p-5">
        <div className="flex items-start gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${eventType.color} text-white shadow-lg`}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className={`${eventType.color} border-0 text-white`}>
                <Icon className="mr-1 h-3 w-3" />
                {eventType.label}
              </Badge>

              <Badge variant="outline" className={`${convocationStatusConfig.className} rounded-full border`}>
                <ConvocationStatusIcon className="mr-1 h-3 w-3" />
                {convocationStatusConfig.label}
              </Badge>

              {isGame && competitionName && (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                  <Trophy className="mr-1 h-3 w-3" />
                  {competitionName}
                </Badge>
              )}

              {score && (
                <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
                  {safeTranslate(t, 'calendar.result', 'Resultado')}: {score}
                </Badge>
              )}

              {isCancelled && (
                <Badge variant="outline" className="border-red-300 bg-red-500/15 text-red-100">
                  {safeTranslate(t, 'calendar.statusCancelled', 'Cancelado')}
                </Badge>
              )}

              {isPostponed && (
                <Badge variant="outline" className="border-amber-300 bg-amber-500/15 text-amber-100">
                  {safeTranslate(t, 'calendar.statusPostponed', 'Adiado')}
                </Badge>
              )}
            </div>

            <h3 className={`truncate font-heading text-2xl tracking-tight sm:text-3xl ${isCancelled ? 'line-through' : ''}`}>
              {event.title || safeTranslate(t, 'calendar.event', 'Evento')}
            </h3>

            <p className="mt-1 line-clamp-2 text-sm text-cyan-50/80">
              {operationalSummary}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
                onClick={(clickEvent) => clickEvent.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="bg-white">
              <DropdownMenuItem onClick={handleShowConvocationStatus}>
                <ClipboardCheck className="mr-2 h-4 w-4" />
                {safeTranslate(t, 'convocations.viewStatus', 'Ver estado')}
              </DropdownMenuItem>

              <DropdownMenuItem onClick={openMessages}>
                <MessageSquare className="mr-2 h-4 w-4" />
                {safeTranslate(t, 'messages.title', 'Mensagens')}
              </DropdownMenuItem>

              {canManageThisEvent && (
                <>
                  <DropdownMenuSeparator />

                  {canCreateConvocations && (
                    <DropdownMenuItem onClick={handleOpenConvocation}>
                      <Users className="mr-2 h-4 w-4" />
                      {eventHasConvocation
                        ? safeTranslate(t, 'convocations.editConvocation', 'Editar convocatória')
                        : safeTranslate(t, 'convocations.callPlayers', 'Convocar')}
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem onClick={openAttendance}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {safeTranslate(t, 'attendance.title', 'Presenças')}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    {safeTranslate(t, 'common.edit', 'Editar')}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={handlePostpone}>
                    <PauseCircle className="mr-2 h-4 w-4" />
                    {safeTranslate(t, 'calendar.postpone', 'Adiar')}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={handleCancel}>
                    <XCircle className="mr-2 h-4 w-4" />
                    {safeTranslate(t, 'calendar.cancelEvent', 'Cancelar')}
                  </DropdownMenuItem>

                  {(event.status === 'cancelled' || event.status === 'postponed') && (
                    <DropdownMenuItem onClick={handleRestore}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {event.status === 'postponed'
                        ? safeTranslate(t, 'calendar.undoPostpone', 'Anular adiamento')
                        : safeTranslate(t, 'calendar.restoreEvent', 'Reativar evento')}
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {safeTranslate(t, 'common.delete', 'Eliminar')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <Clock className="mb-2 h-4 w-4 text-cyan-600" />
            <p className="font-semibold text-slate-950">
              {start ? format(start, 'HH:mm') : '--'}
              {end ? ` - ${format(end, 'HH:mm')}` : ''}
            </p>
            <p className="text-xs text-slate-400">
              {safeTranslate(t, 'championships.time', 'Hora')}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <MapPin className="mb-2 h-4 w-4 text-cyan-600" />
            <p className="truncate font-semibold text-slate-950">
              {event.location || safeTranslate(t, 'calendar.toDefine', 'A definir')}
            </p>
            <p className="text-xs text-slate-400">
              {safeTranslate(t, 'championships.venue', 'Local')}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <Users className="mb-2 h-4 w-4 text-cyan-600" />
            <p className="truncate font-semibold text-slate-950">
              {getTeamName(event, teams, t)}
            </p>
            <p className="text-xs text-slate-400">
              {safeTranslate(t, 'dashboard.group', 'Grupo')}
            </p>
          </div>
        </div>

        {isGame && event.opponent && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3 text-sm text-amber-800">
            <div className="flex items-center gap-2 font-semibold">
              <Swords className="h-4 w-4" />
              {safeTranslate(t, 'calendar.opponent', 'Adversário')}: {event.opponent}
            </div>
          </div>
        )}

        <div className={`rounded-3xl border p-4 ${operationalState.className}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
                <OperationalStateIcon className="h-5 w-5" />
              </div>

              <div>
                <p className="font-heading text-lg text-slate-950">
                  {operationalState.label}
                </p>
                <p className="mt-1 text-sm leading-5 text-slate-600">
                  {operationalState.description}
                </p>
              </div>
            </div>

            <Badge variant="outline" className={`${convocationStatusConfig.className} w-fit rounded-full`}>
              <ConvocationStatusIcon className="mr-1 h-3 w-3" />
              {convocationStatusConfig.label}
            </Badge>
          </div>

          <div className="mt-4 flex items-center">
            {timelineSteps.map((step, index) => (
              <TimelineStep
                key={step.key}
                step={step}
                isLast={index === timelineSteps.length - 1}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-5">
          <EventCenterActionCard
            title={safeTranslate(t, 'dashboard.convocations', 'Convocatória')}
            value={convocationStatusConfig.label}
            helper={
              eventHasConvocation
                ? safeTranslate(t, 'calendar.convocationAvailable', 'Disponível para consulta')
                : safeTranslate(t, 'calendar.convocationMissing', 'Ainda não lançada')
            }
            icon={ClipboardCheck}
            tone="cyan"
            actionLabel={safeTranslate(t, 'common.consult', 'Consultar')}
            onClick={handleShowConvocationStatus}
          />

          <EventCenterActionCard
            title={safeTranslate(t, 'attendance.title', 'Presenças')}
            value={attendanceSummary}
            helper={safeTranslate(t, 'calendar.attendanceCenterHelp', 'Acompanhe confirmações e ausências')}
            icon={CheckCircle}
            tone="emerald"
            actionLabel={safeTranslate(t, 'common.open', 'Abrir')}
            onClick={openAttendance}
          />

          <EventCenterActionCard
            title={safeTranslate(t, 'messages.title', 'Mensagens')}
            value={safeTranslate(t, 'calendar.eventMessages', 'Comunicação do evento')}
            helper={safeTranslate(t, 'calendar.eventMessagesHelp', 'Conversas associadas à equipa/evento')}
            icon={MessageSquare}
            tone="purple"
            actionLabel={safeTranslate(t, 'messages.open', 'Abrir mensagens')}
            onClick={openMessages}
          />

          <EventCenterActionCard
            title={
              isGame
                ? safeTranslate(t, 'statistics.title', 'Estatísticas')
                : safeTranslate(t, 'trainingFeedback.title', 'Feedback')
            }
            value={
              isGame
                ? safeTranslate(t, 'statistics.matchStats', 'Dados do jogo')
                : safeTranslate(t, 'trainingFeedback.title', 'Feedback')
            }
            helper={safeTranslate(t, 'calendar.eventCenterFuture', 'Preparado para a próxima fase')}
            icon={isGame ? Trophy : HelpCircle}
            tone="amber"
            actionLabel={safeTranslate(t, 'common.soon', 'Em breve')}
            disabled
          />

          <EventCenterActionCard
            title={safeTranslate(t, 'evaluations.title', 'Avaliação')}
            value={safeTranslate(t, 'evaluations.playerDevelopment', 'Desenvolvimento')}
            helper={safeTranslate(t, 'calendar.evaluationFutureHelp', 'Critérios e evolução temporal dos atletas')}
            icon={Award}
            tone="slate"
            actionLabel={safeTranslate(t, 'common.soon', 'Em breve')}
            disabled
          />
        </div>

        {canManageThisEvent ? (
          <div className="grid gap-2 rounded-3xl border border-slate-100 bg-slate-50 p-2 text-xs sm:grid-cols-4">
            <button
              type="button"
              className="rounded-2xl bg-white px-3 py-2 font-semibold text-slate-700 shadow-sm transition hover:text-primary"
              onClick={handleShowConvocationStatus}
            >
              <ClipboardCheck className="mx-auto mb-1 h-4 w-4 text-primary" />
              {safeTranslate(t, 'common.consult', 'Consultar')}
            </button>

            {canCreateConvocations && (
              <button
                type="button"
                className="rounded-2xl bg-white px-3 py-2 font-semibold text-slate-700 shadow-sm transition hover:text-primary"
                onClick={handleOpenConvocation}
              >
                <Users className="mx-auto mb-1 h-4 w-4 text-cyan-600" />
                {eventHasConvocation
                  ? safeTranslate(t, 'convocations.editConvocation', 'Editar convocatória')
                  : safeTranslate(t, 'convocations.callPlayers', 'Convocar')}
              </button>
            )}

            <button
              type="button"
              className="rounded-2xl bg-white px-3 py-2 font-semibold text-slate-700 shadow-sm transition hover:text-primary"
              onClick={openAttendance}
            >
              <CheckCircle className="mx-auto mb-1 h-4 w-4 text-emerald-600" />
              {safeTranslate(t, 'attendance.title', 'Presenças')}
            </button>

            <button
              type="button"
              className="rounded-2xl bg-white px-3 py-2 font-semibold text-slate-700 shadow-sm transition hover:text-primary"
              onClick={handleEdit}
            >
              <Edit className="mx-auto mb-1 h-4 w-4 text-slate-600" />
              {safeTranslate(t, 'common.edit', 'Editar')}
            </button>
          </div>
        ) : (
          <div className="space-y-2 rounded-3xl border border-slate-100 bg-slate-50 p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl bg-white"
                onClick={handleShowConvocationStatus}
              >
                <ClipboardCheck className="mr-2 h-4 w-4" />
                {safeTranslate(t, 'common.consult', 'Consultar')}
              </Button>

              {canUpdateOwnConvocation && visibleAttendanceStatus !== 'confirmado' && (
                <Button
                  size="sm"
                  className="rounded-2xl bg-secondary hover:bg-secondary/90"
                  onClick={(clickEvent) =>
                    handleUpdateOwnConvocation('confirmado', clickEvent)
                  }
                  disabled={updatingAttendance}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {safeTranslate(t, 'common.confirm', 'Confirmar')}
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl bg-white"
                onClick={openMessages}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                {safeTranslate(t, 'messages.sendToCoach', 'Enviar mensagem')}
              </Button>
            </div>

            {canUpdateOwnConvocation && visibleAttendanceStatus !== 'ausente' && (
              <Button
                size="sm"
                variant="outline"
                className="w-full rounded-2xl border-red-200 bg-white text-red-600 hover:bg-red-50"
                onClick={(clickEvent) =>
                  handleUpdateOwnConvocation('ausente', clickEvent)
                }
                disabled={updatingAttendance}
              >
                <XCircle className="mr-2 h-4 w-4" />
                {safeTranslate(t, 'attendance.unavailable', 'Indisponível')}
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}


