import {
  Calendar as CalendarIcon,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Dumbbell,
  Edit,
  Eye,
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
  evento_administrativo: {
    label: 'Evento Administrativo',
    icon: ClipboardCheck,
    color: 'bg-violet-600',
    textColor: 'text-violet-600',
  },
  birthday: {
    label: 'Aniversário',
    icon: BirthdayIcon,
    color: 'bg-pink-500',
    textColor: 'text-pink-600',
  },
  outro: {
    label: 'Outro',
    icon: HelpCircle,
    color: 'bg-gray-500',
    textColor: 'text-gray-600',
  },
};

function safeTranslate(t, key, fallback) {
  return typeof t === 'function' ? t(key, fallback) : fallback;
}

function getTeamName(event, teams, t) {
  const eventTeam =
    (teams || []).find((team) => team.id === event.team_id) ||
    event.team ||
    (Array.isArray(event.teams) ? event.teams[0] : null);

  return eventTeam?.name || safeTranslate(t, 'calendar.team', 'Equipa');
}

function isGameEvent(event) {
  return ['jogo_campeonato', 'jogo_amigavel', 'torneio'].includes(
    event?.event_type
  );
}

function getCompetitionName(event) {
  return (
    event?.championship?.name ||
    event?.championship_name ||
    event?.competition?.name ||
    event?.competition_name ||
    event?.league_name ||
    event?.tournament_name ||
    event?.championship_title ||
    ''
  );
}

function getEventScore(event) {
  const homeGoals =
    event?.home_goals ??
    event?.home_score ??
    event?.goals_for ??
    event?.team_goals ??
    event?.result?.home_goals ??
    event?.result?.home_score;

  const awayGoals =
    event?.away_goals ??
    event?.away_score ??
    event?.goals_against ??
    event?.opponent_goals ??
    event?.result?.away_goals ??
    event?.result?.away_score;

  if (
    homeGoals === undefined ||
    homeGoals === null ||
    awayGoals === undefined ||
    awayGoals === null
  ) {
    return '';
  }

  return `${homeGoals} - ${awayGoals}`;
}


function getAttendanceRecord(event) {
  return (
    event?.my_attendance ||
    event?.attendance ||
    event?.user_attendance ||
    event?.current_user_attendance ||
    null
  );
}

function getAttendanceId(event) {
  const attendance = getAttendanceRecord(event);

  return (
    attendance?.id ||
    event?.attendance_id ||
    event?.my_attendance_id ||
    event?.current_user_attendance_id ||
    null
  );
}

function getInitialAttendanceStatus(event) {
  const attendance = getAttendanceRecord(event);

  return (
    attendance?.status ||
    event?.attendance_status ||
    event?.my_attendance_status ||
    event?.convocation_status ||
    event?.my_convocation_status ||
    null
  );
}

function hasConvocation(event) {
  return Boolean(
    getAttendanceId(event) ||
      event?.convocation_id ||
      event?.has_convocation ||
      event?.convocation_created ||
      event?.convocation_status ||
      event?.attendance_status ||
      event?.my_attendance_status
  );
}

function isPrivateConvocation(event) {
  return Boolean(
    event?.convocation_visibility === 'private' ||
      event?.visibility === 'private' ||
      event?.convocation?.visibility === 'private' ||
      event?.convocation?.is_private ||
      event?.is_private_convocation
  );
}

function getConvocationStatusConfig(status, t, event = null) {
  if (event && isPrivateConvocation(event)) {
    return {
      label: safeTranslate(t, 'convocations.private', 'Privado'),
      className: 'border-violet-200 bg-violet-50 text-violet-700',
      icon: ClipboardCheck,
    };
  }

  if (status === 'lancada' || status === 'launched') {
    return {
      label: safeTranslate(t, 'convocations.launched', 'Convocatória efetuada'),
      className: 'border-cyan-200 bg-cyan-50 text-cyan-700',
      icon: ClipboardCheck,
    };
  }

  if (status === 'confirmado') {
    return {
      label: safeTranslate(t, 'attendance.confirmed', 'Confirmou presença'),
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      icon: CheckCircle,
    };
  }

  if (status === 'ausente') {
    return {
      label: safeTranslate(t, 'attendance.absent', 'Ausente'),
      className: 'border-red-200 bg-red-50 text-red-700',
      icon: XCircle,
    };
  }

  if (status === 'pendente') {
    return {
      label: safeTranslate(t, 'attendance.pending', 'Pendente'),
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      icon: HelpCircle,
    };
  }

  return {
    label: safeTranslate(
      t,
      'convocations.notLaunched',
      'Convocatória não lançada'
    ),
    className: 'border-slate-200 bg-slate-50 text-slate-500',
    icon: ClipboardCheck,
  };
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
    eventHasConvocation ? visibleAttendanceStatus || 'lancada' : null,
    t,
    event
  );
  const ConvocationStatusIcon = convocationStatusConfig.icon;
  const eventEnd = end || start;
  const eventPassed = eventEnd ? eventEnd < new Date() : false;
  const canUpdateOwnConvocation =
    attendanceId && (!eventPassed || canManageThisEvent);


  const getEventDayUrl = () => {
    if (!event?.id || !event?.start_time) return '/calendar';
    return `/calendar?view=day&date=${format(parseISO(event.start_time), 'yyyy-MM-dd')}&eventId=${event.id}`;
  };

  const openEventDay = () => {
    navigate(getEventDayUrl());
  };

  const handleShowConvocationStatus = (clickEvent = null) => {
    clickEvent?.stopPropagation?.();
    if (typeof openConvocationStatusDialog === 'function') {
      openConvocationStatusDialog(event);
    }
  };

  const handleOpenConvocation = (clickEvent = null) => {
    clickEvent?.stopPropagation?.();
    if (typeof openConvocationDialog === 'function') {
      openConvocationDialog(event);
    }
  };

  const handleEdit = (clickEvent = null) => {
    clickEvent?.stopPropagation?.();
    if (typeof openEditDialog === 'function') {
      openEditDialog(event);
    }
  };

  const handlePostpone = (clickEvent = null) => {
    clickEvent?.stopPropagation?.();
    if (typeof openPostponeDialog === 'function') {
      openPostponeDialog(event);
    }
  };

  const handleCancel = (clickEvent = null) => {
    clickEvent?.stopPropagation?.();
    if (typeof handleCancelEvent === 'function') {
      handleCancelEvent(event);
    }
  };

  const handleRestore = (clickEvent = null) => {
    clickEvent?.stopPropagation?.();
    if (typeof handleRestoreEvent === 'function') {
      handleRestoreEvent(event);
    }
  };

  const handleDelete = (clickEvent = null) => {
    clickEvent?.stopPropagation?.();
    if (typeof setSelectedEvent === 'function') {
      setSelectedEvent(event);
    }

    if (typeof setDeleteDialogOpen === 'function') {
      setDeleteDialogOpen(true);
    }
  };


  const handleUpdateOwnConvocation = async (status) => {
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

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openEventDay}
      onKeyDown={(keyEvent) => {
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          keyEvent.preventDefault();
          openEventDay();
        }
      }}
      className={`cursor-pointer rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] ${
        isCancelled ? 'opacity-50' : isPostponed ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            isBirthday ? 'bg-pink-50 text-2xl' : `${eventType.color} text-white`
          }`}
        >
          {isBirthday ? '🎂' : <Icon className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge className={`${eventType.color} border-0 text-white`}>
              {!isBirthday && <Icon className="mr-1 h-3 w-3" />}
              {eventType.label}
            </Badge>

            {isGame && competitionName && (
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-amber-700"
              >
                <Trophy className="mr-1 h-3 w-3" />
                {competitionName}
              </Badge>
            )}

            {score && (
              <Badge
                variant="outline"
                className="border-slate-300 bg-slate-50 text-slate-700"
              >
                {safeTranslate(t, 'calendar.result', 'Resultado')}: {score}
              </Badge>
            )}

            {isCancelled && (
              <Badge
                variant="outline"
                className="border-red-500 bg-red-50 text-red-600"
              >
                {safeTranslate(t, 'calendar.statusCancelled', 'Cancelado')}
              </Badge>
            )}

            {isPostponed && (
              <Badge
                variant="outline"
                className="border-amber-500 bg-amber-50 text-amber-600"
              >
                {safeTranslate(t, 'calendar.statusPostponed', 'Adiado')}
              </Badge>
            )}
          </div>

          <h3
            className={`truncate text-base font-semibold text-slate-950 ${
              isCancelled ? 'line-through' : ''
            }`}
          >
            {event.title}
          </h3>

          {!isBirthday && (
            <div className="mt-2">
              <Badge
                variant="outline"
                className={`${convocationStatusConfig.className} rounded-full`}
              >
                <ConvocationStatusIcon className="mr-1 h-3 w-3" />
                {convocationStatusConfig.label}
              </Badge>
            </div>
          )}

          {isBirthday ? (
            <p className="mt-1 text-sm text-slate-500">
              {event.age
                ? safeTranslate(t, 'calendar.turnsAge', `${event.age} anos`)
                : safeTranslate(t, 'calendar.birthday', 'Aniversário')}
            </p>
          ) : (
            <div className="mt-2 space-y-1 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  {start ? format(start, 'HH:mm') : ''}
                  {end ? ` - ${format(end, 'HH:mm')}` : ''}
                </span>
              </div>

              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="truncate">{getTeamName(event, teams, t)}</span>
              </div>

              {isGame && event.opponent && (
                <div className="flex items-center gap-2">
                  <Swords className="h-4 w-4" />
                  <span className="truncate">
                    {safeTranslate(t, 'calendar.opponent', 'Adversário')}:{' '}
                    {event.opponent}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!isBirthday && canManageThisEvent && (
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-2 text-xs sm:grid-cols-4">
          <button
            type="button"
            className="rounded-xl bg-white px-2 py-2 font-semibold text-slate-700 shadow-sm transition hover:text-primary"
            onClick={handleShowConvocationStatus}
          >
            <ClipboardCheck className="mx-auto mb-1 h-4 w-4 text-primary" />
            {safeTranslate(t, 'common.consult', 'Consultar')}
          </button>

          {canCreateConvocations && (
            <button
              type="button"
              className="rounded-xl bg-white px-2 py-2 font-semibold text-slate-700 shadow-sm transition hover:text-primary"
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
            className="rounded-xl bg-white px-2 py-2 font-semibold text-slate-700 shadow-sm transition hover:text-primary"
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              navigate(`/attendance?event_id=${event.id}`);
            }}
          >
            <CheckCircle className="mx-auto mb-1 h-4 w-4 text-emerald-600" />
            {safeTranslate(t, 'attendance.title', 'Presenças')}
          </button>

          <button
            type="button"
            className="rounded-xl bg-white px-2 py-2 font-semibold text-slate-700 shadow-sm transition hover:text-primary"
            onClick={handleEdit}
          >
            <Edit className="mx-auto mb-1 h-4 w-4 text-slate-600" />
            {safeTranslate(t, 'common.edit', 'Editar')}
          </button>
        </div>
      )}

      {!isBirthday && !canManageThisEvent && (
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-2xl"
              onClick={handleShowConvocationStatus}
            >
              <ClipboardCheck className="mr-2 h-4 w-4" />
              {safeTranslate(t, 'common.consult', 'Consultar')}
            </Button>

            {canUpdateOwnConvocation && visibleAttendanceStatus === 'pendente' && (
              <Button
                size="sm"
                className="rounded-2xl bg-secondary hover:bg-secondary/90"
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  handleUpdateOwnConvocation('confirmado');
                }}
                disabled={updatingAttendance}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {safeTranslate(t, 'common.respond', 'Responder')}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="rounded-2xl"
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                const query = new URLSearchParams();
                if (event.team_id) query.set('team_id', event.team_id);
                if (event.id) query.set('event_id', event.id);
                navigate(`/messages?${query.toString()}`);
              }}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              {safeTranslate(t, 'messages.sendToCoach', 'Enviar mensagem')}
            </Button>
          </div>

          {canUpdateOwnConvocation && visibleAttendanceStatus === 'pendente' && (
            <Button
              size="sm"
              variant="outline"
              className="w-full rounded-2xl border-red-200 text-red-600 hover:bg-red-50"
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                handleUpdateOwnConvocation('ausente');
              }}
              disabled={updatingAttendance}
            >
              <XCircle className="mr-2 h-4 w-4" />
              {safeTranslate(t, 'attendance.unavailable', 'Indisponível')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
