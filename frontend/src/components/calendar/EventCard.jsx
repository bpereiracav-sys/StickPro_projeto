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
  MoreVertical,
  PauseCircle,
  Swords,
  Trash2,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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
}) {
  const navigate = useNavigate();

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
              {isBirthday ? '🎂' : <Icon className="mr-1 h-3 w-3" />}
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

      {!isBirthday && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-2xl"
            onClick={handleShowConvocationStatus}
          >
            <ClipboardCheck className="mr-2 h-4 w-4" />
            {safeTranslate(t, 'convocations.status', 'Estado')}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="rounded-2xl"
                onClick={(clickEvent) => clickEvent.stopPropagation()}
              >
                <MoreVertical className="mr-2 h-4 w-4" />
                {canManageThisEvent
                  ? safeTranslate(t, 'common.actions', 'Ações')
                  : safeTranslate(t, 'common.open', 'Abrir')}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="bg-white" align="end">
              <DropdownMenuItem onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                openEventDay();
              }}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {safeTranslate(t, 'calendar.openEvent', 'Abrir evento')}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleShowConvocationStatus}>
                <ClipboardCheck className="mr-2 h-4 w-4" />
                {safeTranslate(
                  t,
                  'convocations.viewStatus',
                  'Ver Estado Convocatória'
                )}
              </DropdownMenuItem>

              {canCreateConvocations && canManageThisEvent && (
                <DropdownMenuItem onClick={handleOpenConvocation}>
                  <Users className="mr-2 h-4 w-4" />
                  {safeTranslate(
                    t,
                    'convocations.callPlayers',
                    'Convocar Jogadores'
                  )}
                </DropdownMenuItem>
              )}

              {isGame && (
                <DropdownMenuItem
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    navigate(`/stats?event_id=${event.id}`);
                  }}
                >
                  <Trophy className="mr-2 h-4 w-4" />
                  {safeTranslate(t, 'statistics.title', 'Estatísticas')}
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  navigate(`/attendance?event_id=${event.id}`);
                }}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {safeTranslate(t, 'attendance.title', 'Presenças')}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() =>
                  toast.info(
                    safeTranslate(
                      t,
                      'calendar.forumInDevelopment',
                      'Fórum em desenvolvimento'
                    )
                  )
                }
              >
                <Eye className="mr-2 h-4 w-4" />
                {safeTranslate(t, 'calendar.forum', 'Fórum')}
              </DropdownMenuItem>

              {canManageThisEvent && (
                <>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    {safeTranslate(t, 'common.edit', 'Editar')}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onSelect={(eventSelect) => {
                      eventSelect.preventDefault();
                      handlePostpone();
                    }}
                  >
                    <PauseCircle className="mr-2 h-4 w-4" />
                    {safeTranslate(t, 'calendar.postpone', 'Adiar')}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={handleCancel}>
                    <XCircle className="mr-2 h-4 w-4" />
                    {safeTranslate(t, 'calendar.cancelEvent', 'Cancelar')}
                  </DropdownMenuItem>

                  {(event.status === 'cancelled' ||
                    event.status === 'postponed') && (
                    <DropdownMenuItem
                      onSelect={(eventSelect) => {
                        eventSelect.preventDefault();
                        handleRestore();
                      }}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {event.status === 'postponed'
                        ? safeTranslate(
                            t,
                            'calendar.undoPostpone',
                            'Anular adiamento'
                          )
                        : safeTranslate(
                            t,
                            'calendar.restoreEvent',
                            'Reativar evento'
                          )}
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={(eventSelect) => {
                      eventSelect.preventDefault();
                      handleDelete();
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {safeTranslate(t, 'common.delete', 'Eliminar')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
