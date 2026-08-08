import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { usePermissions } from '../context/PermissionsContext';
import { useLanguage } from '../context/LanguageContext';
import {
  eventsApi,
  teamsApi,
  usersApi,
  unavailabilitiesApi,
  evaluationsApi,
} from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Calendar } from '../components/ui/calendar';
import { Skeleton } from '../components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Checkbox } from '../components/ui/checkbox';
import { Switch } from '../components/ui/switch';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import UnavailabilityDialog from '../components/UnavailabilityDialog';
import CalendarHeader from '../components/calendar/CalendarHeader';
import CalendarViewControls from '../components/calendar/CalendarViewControls';
import CalendarAgenda from '../components/calendar/CalendarAgenda';
import EventCard from '../components/calendar/EventCard';
import {
  PageShell,
  PageSection,
} from '../components/layout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  CalendarDays,
  Download,
  Printer,
  Edit,
  Trash2,
  Users,
  Send,
  Eye,
  EyeOff,
  MoreVertical,
  XCircle,
  PauseCircle,
  Trophy,
  Dumbbell,
  Swords,
  Flag,
  HelpCircle,
  ClipboardCheck,
  CheckCircle,
  AlertCircle,
  Repeat,
  CalendarOff,
  AlertTriangle
} from 'lucide-react';
import { getInitials } from '../lib/utils';
import {
  format,
  isSameDay,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  isToday,
  isSameMonth
} from 'date-fns';
import { pt } from 'date-fns/locale';

const BirthdayIcon = ({ className = '' }) => (
  <span className={className} aria-hidden="true">🎂</span>
);

// Event Types with icons and colors
const EVENT_TYPES = {
  treino: { label: 'Treino', icon: Dumbbell, color: 'bg-blue-500', textColor: 'text-blue-600' },
  jogo_campeonato: { label: 'Jogo Campeonato', icon: Trophy, color: 'bg-amber-500', textColor: 'text-amber-600' },
  jogo_amigavel: { label: 'Jogo Amigável', icon: Swords, color: 'bg-green-500', textColor: 'text-green-600' },
  torneio: { label: 'Torneio', icon: Flag, color: 'bg-purple-500', textColor: 'text-purple-600' },
  outro: { label: 'Outro', icon: HelpCircle, color: 'bg-gray-500', textColor: 'text-gray-600' },
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
};

const VIEW_MODES = {
  agenda: { label: 'Agenda', icon: List },
  day: { label: 'Dia', icon: CalendarIcon },
  week: { label: 'Semana', icon: CalendarDays },
  month: { label: 'Mês', icon: LayoutGrid }
};

// Player Status Row component for convocation status dialog
function PlayerStatusRow({ player, canEdit, onUpdateStatus, updating, t }) {
  const statusOptions = [
    { value: 'confirmado', label: t('attendance.present'), color: 'bg-green-100 text-green-700' },
    { value: 'ausente', label: t('attendance.absent'), color: 'bg-red-100 text-red-700' },
    { value: 'pendente', label: t('attendance.pending'), color: 'bg-amber-100 text-amber-700' }
  ];

  const currentStatus = statusOptions.find(s => s.value === player.status) || statusOptions[2];

  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 border border-border">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Avatar className="h-8 w-8">
          <AvatarImage src={player.avatar_url} />
          <AvatarFallback className="text-xs bg-primary/10">
            {getInitials(player.name || 'NN')}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">{player.name || 'Nome não disponível'}</p>
          {player.jersey_number && (
            <p className="text-xs text-muted-foreground">#{player.jersey_number}</p>
          )}
        </div>
      </div>

      {canEdit ? (
        <Select
          value={player.status}
          onValueChange={(value) => onUpdateStatus(player.id, value)}
          disabled={updating}
        >
          <SelectTrigger className={`w-[130px] h-8 text-xs ${currentStatus.color}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex items-center gap-2">
                  {opt.value === 'confirmado' && <CheckCircle className="w-3 h-3 text-green-600" />}
                  {opt.value === 'ausente' && <XCircle className="w-3 h-3 text-red-600" />}
                  {opt.value === 'pendente' && <AlertCircle className="w-3 h-3 text-amber-600" />}
                  {opt.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Badge variant="outline" className={currentStatus.color}>
          {player.status === 'confirmado' && <CheckCircle className="w-3 h-3 mr-1" />}
          {player.status === 'ausente' && <XCircle className="w-3 h-3 mr-1" />}
          {player.status === 'pendente' && <AlertCircle className="w-3 h-3 mr-1" />}
          {currentStatus.label}
        </Badge>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const { user, activeProfile } = useAuth();
  const { selectedTeam, teams: contextTeams, isAllTeamsSelected } = useTeam();
  const { canManageEvents, canCreateConvocations, canAccessTeam, isAdmin, isCoach } = usePermissions();
  const { t } = useLanguage();
  const dateLocale = pt;
  const location = useLocation();
  const agendaScrollRef = useRef(null);
  const agendaTodayRef = useRef(null);
  const hasAutoScrolledAgendaRef = useRef(false);
  const dayEventRefs = useRef({});
  const fetchDataRequestId = useRef(0);
  const [events, setEvents] = useState([]);
  const [
    pidReviewTasks,
    setPidReviewTasks,
  ] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState('month');
  const [visibleEventTypes, setVisibleEventTypes] = useState([
    'treino',
    'jogo_campeonato',
    'jogo_amigavel',
    'torneio',
    'evento_administrativo',
    'birthday',
    'outro'
  ]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [convocationDialogOpen, setConvocationDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [convocationVisible, setConvocationVisible] = useState(true);
  const [convocationMessage, setConvocationMessage] = useState('');
  const [convocationStatusDialogOpen, setConvocationStatusDialogOpen] = useState(false);
  const [convocationStatus, setConvocationStatus] = useState({ present: [], absent: [], pending: [], total: 0, confirmed_count: 0, event_passed: false });
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [postponeDialogOpen, setPostponeDialogOpen] = useState(false);
  const [postponingEvent, setPostponingEvent] = useState(false);
  const [postponeData, setPostponeData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '18:00',
    end_time: '20:00',
    reason: '',
  });

  // Unavailability state
  const [unavailabilities, setUnavailabilities] = useState([]);
  const [unavailabilityDialogOpen, setUnavailabilityDialogOpen] = useState(false);
  const [showUnavailabilities, setShowUnavailabilities] = useState(true);

  // Convocation visibility setting
  const [convocationVisibility, setConvocationVisibility] = useState('all'); // players, delegates, all

  const [formData, setFormData] = useState({
    team_id: selectedTeam?.id || '',
    event_type: 'treino',
    title: '',
    description: '',
    location: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '18:00',
    end_time: '20:00',
    opponent: '',
    status: 'scheduled'
  });

  // Recurring event state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState([]); // 0=Dom, 1=Seg, 2=Ter, etc.
  const [recurringEndDate, setRecurringEndDate] = useState('');

  const canEditConvocationStatuses =
    canManageEvents &&
    Boolean(
      selectedEvent &&
        (isAdmin || isCoach || canAccessTeam(selectedEvent.team_id))
    );

  const WEEKDAYS = [
    { value: 1, label: 'Seg', fullLabel: 'Segunda' },
    { value: 2, label: 'Ter', fullLabel: 'Terça' },
    { value: 3, label: 'Qua', fullLabel: 'Quarta' },
    { value: 4, label: 'Qui', fullLabel: 'Quinta' },
    { value: 5, label: 'Sex', fullLabel: 'Sexta' },
    { value: 6, label: 'Sáb', fullLabel: 'Sábado' },
    { value: 0, label: 'Dom', fullLabel: 'Domingo' }
  ];

  useEffect(() => {
    const updateIsMobile = () => {
      const mobile = window.matchMedia('(max-width: 767px)').matches;
      setIsMobile(mobile);
      if (mobile) {
        setViewMode((current) => (current === 'month' || current === 'week' ? 'agenda' : current));
      } else {
        setViewMode((current) => (current === 'agenda' ? 'month' : current));
      }
    };

    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);

    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedView = params.get('view');
    const requestedDate = params.get('date');

    if (requestedDate) {
      const parsedDate = parseISO(requestedDate);
      if (!Number.isNaN(parsedDate.getTime())) {
        setSelectedDate(parsedDate);
      }
    }

    if (requestedView && VIEW_MODES[requestedView]) {
      if (requestedView === 'agenda' && !isMobile) {
        setViewMode('day');
      } else {
        setViewMode(requestedView);
      }
    }
  }, [location.search, isMobile]);


  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const highlightedEventId = params.get('eventId');

    if (!highlightedEventId || viewMode !== 'day' || loading) return;

    window.requestAnimationFrame(() => {
      const node = dayEventRefs.current?.[highlightedEventId];

      if (node) {
        node.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    });
  }, [location.search, viewMode, loading, events.length]);


  const applyOptimisticConvocationUpdate = (detail = {}) => {
    if (!detail?.eventId) return;

    setEvents((prev) =>
      prev.map((calendarEvent) => {
        if (calendarEvent.id !== detail.eventId) return calendarEvent;

        const nextVisibility =
          detail.visibility || calendarEvent.convocation_visibility;

        const nextStatus =
          detail.status ||
          calendarEvent.my_attendance_status ||
          calendarEvent.attendance_status ||
          (nextVisibility === 'private'
            ? 'private'
            : calendarEvent.convocation_status || 'launched');

        return {
          ...calendarEvent,
          has_convocation: true,
          my_attendance_status: detail.status || calendarEvent.my_attendance_status,
          attendance_status: detail.status || calendarEvent.attendance_status,
          convocation_status:
            nextVisibility === 'private'
              ? 'private'
              : detail.convocation_status || calendarEvent.convocation_status || 'launched',
          convocation_lifecycle_status:
            detail.lifecycle_status ||
            detail.convocation_lifecycle_status ||
            calendarEvent.convocation_lifecycle_status ||
            'published',
          convocation_visibility: nextVisibility,
          is_private_convocation:
            nextVisibility === 'private' || calendarEvent.is_private_convocation,
          optimistic_status: nextStatus,
        };
      })
    );
  };

  useEffect(() => {
    const handleConvocationUpdated = (event) => {
      const detail = event?.detail || {};

      applyOptimisticConvocationUpdate(detail);
      fetchData({ silent: true });
    };

    window.addEventListener('stickpro:convocation-updated', handleConvocationUpdated);

    return () => {
      window.removeEventListener('stickpro:convocation-updated', handleConvocationUpdated);
    };
  }, [selectedTeam, activeProfile, selectedTeamFilter, selectedStatusFilter, visibleEventTypes, events.length]);

  useEffect(() => {
    if (viewMode === 'agenda') {
      hasAutoScrolledAgendaRef.current = false;
    }
  }, [selectedTeamFilter, selectedStatusFilter, visibleEventTypes, activeProfile, viewMode]);

  // Calendar V2 - refresh when team filter or profile changes
  useEffect(() => {
    fetchData({ silent: events.length > 0 });
  }, [selectedTeam, activeProfile, selectedTeamFilter, selectedStatusFilter, visibleEventTypes]);

  const fetchData = async ({ silent = false } = {}) => {
    const requestId = ++fetchDataRequestId.current;
    const hasExistingData = events.length > 0;

    if (silent || hasExistingData) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const teamFilter =
        selectedTeamFilter && selectedTeamFilter !== 'all'
          ? selectedTeamFilter
          : null;

      const calendarYear = selectedDate.getFullYear();

      const activeProfileTeamIds = [
        ...(activeProfile?.team_ids || []),
        ...(activeProfile?.teamIds || []),
        ...((activeProfile?.teams || []).map((team) => team.id)),
      ].filter(Boolean);

      const [
        eventsRes,
        birthdaysRes,
        teamsRes,
        unavailRes,
        pidReviewsRes,
      ] = await Promise.all([
        eventsApi.getAll({
          team_id: teamFilter,
          profile_type: activeProfile?.type,
          profile_user_id: activeProfile?.user_id,
          profile_role: activeProfile?.role,
        }),
        eventsApi.getBirthdays({
          year: calendarYear,
          team_id: teamFilter,
          team_ids: activeProfileTeamIds.join(','),
          profile_type: activeProfile?.type,
          profile_user_id: activeProfile?.user_id,
          profile_role: activeProfile?.role,
        }).catch(() => ({ data: [] })),
        teamsApi.getAll(),
        unavailabilitiesApi.getMy().catch(() => ({ data: [] })),
        evaluationsApi
          .getPIDReviewTasks({
            team_id:
              teamFilter || undefined,
        
            days_ahead:
              30,
          })
          .catch(
            () => ({
              data: [],
            })
          ),
      ]);

      let filteredEvents = [
        ...(eventsRes.data || []),
        ...(birthdaysRes.data || []),
      ];

      filteredEvents = filteredEvents.filter((event) => {
        if (!event?.start_time) return false;

        if (!visibleEventTypes.includes(event.event_type)) {
          return false;
        }

        if (selectedStatusFilter !== 'all') {
          const eventStatus = event.status || 'scheduled';
          if (eventStatus !== selectedStatusFilter) {
            return false;
          }
        }

        return true;
      });

      if (requestId !== fetchDataRequestId.current) return;

      setEvents(filteredEvents);

      const allTeams = teamsRes.data || [];

      const visibleTeams =
        activeProfile?.type === 'associated'
          ? allTeams.filter((team) => activeProfileTeamIds.includes(team.id))
          : allTeams;

      if (requestId !== fetchDataRequestId.current) return;

      setTeams(visibleTeams);

      if (
        activeProfile?.type === 'associated' &&
        selectedTeamFilter !== 'all' &&
        !visibleTeams.some((team) => team.id === selectedTeamFilter)
      ) {
        setSelectedTeamFilter('all');
      }

      if (requestId !== fetchDataRequestId.current) return;

      setUnavailabilities(unavailRes.data || []);

      setPidReviewTasks(
        Array.isArray(
          pidReviewsRes?.data
        )
          ? pidReviewsRes.data
          : []
      );

      // Set default team for form
        if (selectedTeamFilter && selectedTeamFilter !== 'all') {
          setFormData(prev => ({ ...prev, team_id: selectedTeamFilter }));
        } else if (selectedTeam?.id) {
          setFormData(prev => ({ ...prev, team_id: selectedTeam.id }));
        } else if (visibleTeams.length > 0 && !formData.team_id) {
          setFormData(prev => ({ ...prev, team_id: visibleTeams[0].id }));
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error(t('common.loadError', 'Erro ao carregar dados'));
      } finally {
        if (requestId === fetchDataRequestId.current) {
          setIsRefreshing(false);
          setLoading(false);
        }
      }
    };

  const fetchTeamMembers = async (teamId) => {
    try {
      const response = await teamsApi.getMembers(teamId);
      // Filter only players from the response
      const allMembers = response.data || [];
      const players = allMembers.filter(m =>
        m.role === 'jogador' ||
        m.profile?.function === 'jogador' ||
        m.profile?.sports_info?.function === 'jogador'
      );
      setTeamMembers(players);
    } catch (error) {
      console.error('Error fetching team members:', error);
      setTeamMembers([]);
    }
  };

  useEffect(() => {
    if (formData.team_id) {
      fetchTeamMembers(formData.team_id);
    }
  }, [formData.team_id]);

  const resetForm = () => {
    setFormData({
      team_id: teams.length > 0 ? teams[0].id : '',
      event_type: 'treino',
      title: '',
      description: '',
      location: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '18:00',
      end_time: '20:00',
      opponent: '',
      status: 'scheduled'
    });
    setSelectedPlayers([]);
    setConvocationVisible(true);
    setConvocationMessage('');
    setIsRecurring(false);
    setRecurringDays([]);
    setRecurringEndDate('');
  };

  // Generate dates for recurring events
  const generateRecurringDates = (startDate, endDate, selectedDays) => {
    const dates = [];
    let currentDate = parseISO(startDate);
    const lastDate = parseISO(endDate);

    while (currentDate <= lastDate) {
      const dayOfWeek = currentDate.getDay(); // 0=Sunday, 1=Monday, etc.
      if (selectedDays.includes(dayOfWeek)) {
        dates.push(format(currentDate, 'yyyy-MM-dd'));
      }
      currentDate = addDays(currentDate, 1);
    }

    return dates;
  };

  const handleCreateEvent = async () => {
    if (!formData.team_id) {
      toast.error(t('calendar.selectTeam', 'Selecione uma equipa'));
      return;
    }

    if (!formData.title) {
      toast.error(t('calendar.enterTitle', 'Introduza um título'));
      return;
    }

    if (!formData.date) {
      toast.error(t('calendar.selectDate', 'Selecione uma data'));
      return;
    }

    if (isRecurring) {
      console.log('isRecurring:', isRecurring);
      console.log('recurringDays:', recurringDays);
      console.log('recurringEndDate:', recurringEndDate);

      if (recurringDays.length === 0) {
        toast.error(t('calendar.selectWeekday', 'Selecione pelo menos um dia da semana'));
        return;
      }

      if (!recurringEndDate) {
        toast.error(t('calendar.selectEndDate', 'Selecione a data de fim do período'));
        return;
      }
    }

    try {
      const buildEventPayload = (date) => ({
        team_id: formData.team_id,
        event_type: formData.event_type,
        title: formData.title,
        description: formData.description || '',
        location: formData.location || '',
        start_time: `${date}T${formData.start_time}:00`,
        end_time: formData.end_time ? `${date}T${formData.end_time}:00` : null,
        opponent: formData.opponent || '',
        championship_id: formData.championship_id || null,
        status: formData.status || 'scheduled',
      });

      if (isRecurring && recurringDays.length > 0 && recurringEndDate) {
        const dates = generateRecurringDates(
          formData.date,
          recurringEndDate,
          recurringDays
        );

        if (dates.length === 0) {
          toast.error(t('calendar.noRecurringDates', 'Nenhuma data encontrada para os dias selecionados'));
          setCreating(false);
          return;
        }

        if (dates.length > 100) {
          toast.error(
            t(
              'calendar.tooManyEvents',
              `Demasiados eventos (${dates.length}). Limite máximo: 100`
            )
          );
          setCreating(false);
          return;
        }

        for (const date of dates) {
          await eventsApi.create(buildEventPayload(date));
        }

        toast.success(
          t(
            'calendar.eventsCreated',
            `${dates.length} eventos criados com sucesso!`
          )
        );
      } else {
        await eventsApi.create(buildEventPayload(formData.date));
        toast.success(t('calendar.eventCreated', 'Evento criado com sucesso!'));
      }

      await fetchData({ silent: true });

      setCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating event:', error);

      const message =
        typeof error.response?.data?.detail === 'string'
          ? error.response.data.detail
          : t('calendar.createError', 'Erro ao criar evento');

      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;

    if (!formData.title) {
      toast.error(t('calendar.enterTitle', 'Introduza um título'));
      return;
    }

    if (!formData.date) {
      toast.error(t('calendar.selectDate', 'Selecione uma data'));
      return;
    }

    setUpdating(true);

    try {
      const eventData = {
        event_type: formData.event_type,
        title: formData.title,
        description: formData.description || '',
        location: formData.location || '',
        start_time: `${formData.date}T${formData.start_time}:00`,
        end_time: formData.end_time
          ? `${formData.date}T${formData.end_time}:00`
          : null,
        opponent: formData.opponent || '',
        status: formData.status || 'scheduled',
      };

      await eventsApi.update(selectedEvent.id, eventData);

      setEvents((prev) =>
        prev.map((event) =>
          event.id === selectedEvent.id
            ? {
                ...event,
                ...eventData,
              }
            : event
        )
      );

      setEditDialogOpen(false);
      setSelectedEvent(null);
      toast.success(t('calendar.eventUpdated', 'Evento atualizado!'));
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error(t('calendar.updateError', 'Erro ao atualizar evento'));
    } finally {
      setUpdating(false);
    }
  };
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    try {
      await eventsApi.delete(selectedEvent.id);
      setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
      setDeleteDialogOpen(false);
      setSelectedEvent(null);
      toast.success('Evento eliminado!');
    } catch (error) {
      toast.error('Erro ao eliminar evento');
    }
  };

  const handlePostponeEvent = async (event = null) => {
    const targetEvent = event || selectedEvent;
    if (!targetEvent) return;

    try {
      await eventsApi.update(targetEvent.id, { status: 'postponed' });
      setEvents(prev => prev.map(e => e.id === targetEvent.id ? { ...e, status: 'postponed' } : e));
      toast.success('Evento adiado!');
    } catch (error) {
      toast.error('Erro ao adiar evento');
    }
  };

  const openPostponeDialog = (event) => {
    setSelectedEvent(event);

    const start = event.start_time ? parseISO(event.start_time) : new Date();
    const end = event.end_time ? parseISO(event.end_time) : null;

    setPostponeData({
      date: format(start, 'yyyy-MM-dd'),
      start_time: format(start, 'HH:mm'),
      end_time: end ? format(end, 'HH:mm') : '',
      reason: '',
    });
    setPostponeDialogOpen(true);
  };

  const handleConfirmPostpone = async () => {
    if (!selectedEvent) return;

    if (!postponeData.date || !postponeData.start_time) {
      toast.error(t('calendar.selectDate', 'Selecione uma data'));
      return;
    }

    setPostponingEvent(true);

    try {
      const postponedStart = `${postponeData.date}T${postponeData.start_time}:00`;
      const postponedEnd = postponeData.end_time
        ? `${postponeData.date}T${postponeData.end_time}:00`
        : null;

      await eventsApi.update(selectedEvent.id, {
        status: 'postponed',
        postponed_to_start_time: postponedStart,
        postponed_to_end_time: postponedEnd,
        postponement_reason: postponeData.reason || '',
      });

      await eventsApi.create({
        team_id: selectedEvent.team_id,
        event_type: selectedEvent.event_type,
        title: selectedEvent.title,
        description: selectedEvent.description || '',
        location: selectedEvent.location || '',
        start_time: postponedStart,
        end_time: postponedEnd,
        opponent: selectedEvent.opponent || '',
        championship_id: selectedEvent.championship_id || null,
        status: 'scheduled',
        original_event_id: selectedEvent.id,
      });

      setPostponeDialogOpen(false);
      setSelectedEvent(null);
      toast.success(t('calendar.eventPostponed', 'Evento adiado com sucesso'));
      fetchData({ silent: true });
    } catch (error) {
      console.error('Error postponing event:', error);
      toast.error(t('calendar.postponeError', 'Erro ao adiar evento'));
    } finally {
      setPostponingEvent(false);
    }
  };

  const handleCancelEvent = async (event = null) => {
    const targetEvent = event || selectedEvent;
    if (!targetEvent) return;

    try {
      await eventsApi.update(targetEvent.id, { status: 'cancelled' });
      setEvents(prev => prev.map(e => e.id === targetEvent.id ? { ...e, status: 'cancelled' } : e));
      toast.success('Evento cancelado!');
    } catch (error) {
      toast.error('Erro ao cancelar evento');
    }
  };

  const handleRestoreEvent = async (event = null) => {
    const targetEvent = event || selectedEvent;
    if (!targetEvent) return;

    try {
      await eventsApi.update(targetEvent.id, {
        status: 'scheduled',
        postponed_to_start_time: null,
        postponed_to_end_time: null,
        postponement_reason: '',
        remove_postponed_copy: true,
      });

      await fetchData({ silent: true });

      toast.success(t('calendar.eventRestored', 'Evento reativado com sucesso!'));
    } catch (error) {
      console.error('Error restoring event:', error);
      toast.error(t('calendar.restoreError', 'Erro ao reativar evento'));
    }
  };

  const openEditDialog = (event) => {
    const startDate = event.start_time ? parseISO(event.start_time) : new Date();
    const endDate = event.end_time ? parseISO(event.end_time) : new Date();

    setSelectedEvent(event);
    setFormData({
      team_id: event.team_id,
      event_type: event.event_type || 'treino',
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      date: format(startDate, 'yyyy-MM-dd'),
      start_time: format(startDate, 'HH:mm'),
      end_time: format(endDate, 'HH:mm'),
      opponent: event.opponent || '',
      status: event.status || 'scheduled'
    });
    setEditDialogOpen(true);
  };

  const openConvocationDialog = async (event) => {
    setSelectedEvent(event);
    fetchTeamMembers(event.team_id);
    setSelectedPlayers([]);
    setConvocationVisibility('all');
    setConvocationMessage('');

    // Fetch unavailabilities for team members
    try {
      const response = await unavailabilitiesApi.getAll({ team_id: event.team_id });
      setUnavailabilities(response.data || []);
    } catch (error) {
      console.error('Error fetching unavailabilities:', error);
    }

    setConvocationDialogOpen(true);
  };

  const handleCreateConvocation = async () => {
    if (!selectedEvent || selectedPlayers.length === 0) {
      toast.error('Selecione pelo menos um jogador');
      return;
    }

    try {
      // Create convocation via API with visibility setting
      const response = await eventsApi.createConvocation(selectedEvent.id, {
        player_ids: selectedPlayers,
        message: convocationMessage || null,
        visibility: convocationVisibility,
        is_private: convocationVisibility === 'private',
        privacy: convocationVisibility === 'private' ? 'private' : 'public',
      });

      // Check if any players were skipped due to unavailability
      const skipped = response.data?.skipped_unavailable_players || [];
      if (skipped.length > 0) {
        toast.warning(`${skipped.length} jogador(es) indisponível(is) foram excluídos da convocatória`);
      }

      const updateDetail = {
        eventId: selectedEvent.id,
        visibility: convocationVisibility,
        convocation_status: convocationVisibility === 'private' ? 'private' : 'launched',
        lifecycle_status: 'published',
      };

      applyOptimisticConvocationUpdate(updateDetail);

      window.dispatchEvent(
        new CustomEvent('stickpro:convocation-updated', {
          detail: updateDetail,
        })
      );

      await fetchData({ silent: true });

      toast.success(
        convocationVisibility === 'private'
          ? `Convocatória privada criada para ${selectedPlayers.length - skipped.length} jogadores!`
          : `Convocatória criada para ${selectedPlayers.length - skipped.length} jogadores!`
      );
      setConvocationDialogOpen(false);
      setSelectedPlayers([]);
      setConvocationMessage('');
      setConvocationVisibility('all');
    } catch (error) {
      console.error('Convocation error:', error);
      const message = error.response?.data?.detail || 'Erro ao criar convocatória';
      toast.error(typeof message === 'string' ? message : 'Erro ao criar convocatória');
    }
  };

  const openConvocationStatusDialog = async (event) => {
    setSelectedEvent(event);
    setLoadingStatus(true);
    try {
      const response = await eventsApi.getConvocationStatus(event.id);
      setConvocationStatus(response.data);
      setConvocationStatusDialogOpen(true);
    } catch (error) {
      // No attendance records for this event
      setConvocationStatus({
        present: [], absent: [], pending: [],
        total: 0, confirmed_count: 0, event_passed: false
      });
      setConvocationStatusDialogOpen(true);
    } finally {
      setLoadingStatus(false);
    }
  };

  // Update player convocation status
  const handleUpdatePlayerStatus = async (playerId, newStatus) => {
    if (!selectedEvent) return;
    setUpdatingStatus(true);
    try {
      await eventsApi.updateConvocationStatus(selectedEvent.id, playerId, newStatus);
      toast.success(t('attendance.statusUpdated'));
      // Refresh status
      const response = await eventsApi.getConvocationStatus(selectedEvent.id);
      setConvocationStatus(response.data);

      const updateDetail = {
        eventId: selectedEvent.id,
        playerId,
        status: newStatus,
      };

      applyOptimisticConvocationUpdate(updateDetail);

      window.dispatchEvent(
        new CustomEvent('stickpro:convocation-updated', {
          detail: updateDetail,
        })
      );

      fetchData({ silent: true });
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Send reminder to pending players
  const handleSendReminder = async () => {
    if (!selectedEvent) return;
    setSendingReminder(true);
    try {
      const response = await eventsApi.sendReminder(selectedEvent.id);
      toast.success(`${t('attendance.reminderSent')} (${response.data.sent_count})`);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setSendingReminder(false);
    }
  };

  // Auto-mark pending as absent
  const handleAutoMarkAbsent = async () => {
    if (!selectedEvent) return;
    setUpdatingStatus(true);
    try {
      const response = await eventsApi.autoMarkAbsent(selectedEvent.id);
      toast.success(`${response.data.updated_count} ${t('attendance.autoMarkAbsent')}`);
      // Refresh status
      const refreshResponse = await eventsApi.getConvocationStatus(selectedEvent.id);
      setConvocationStatus(refreshResponse.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const togglePlayerSelection = (playerId) => {
    setSelectedPlayers(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const selectAllPlayers = () => {
    // Exclude unavailable players when selecting all
    const eventDate = selectedEvent?.start_time ? new Date(selectedEvent.start_time) : null;
    const availablePlayers = teamMembers.filter(member => {
      if (!eventDate) return true;
      return !unavailabilities.some(u =>
        u.user_id === member.id &&
        new Date(u.start_date) <= eventDate &&
        new Date(u.end_date) >= eventDate
      );
    });
    setSelectedPlayers(availablePlayers.map(m => m.id));
  };

  const deselectAllPlayers = () => {
    setSelectedPlayers([]);
  };

  // Export to PDF (simplified - would use a library like jspdf or html2pdf)
  const handleExportPDF = () => {
    toast.info('Funcionalidade de exportação PDF em desenvolvimento');
    // In production, you would use a library like jspdf or html2pdf
    window.print();
  };

  // Navigation functions
  const navigatePrevious = () => {
    if (viewMode === 'agenda') setSelectedDate(prev => subDays(prev, 7));
    else if (viewMode === 'day') setSelectedDate(prev => subDays(prev, 1));
    else if (viewMode === 'week') setSelectedDate(prev => subWeeks(prev, 1));
    else setSelectedDate(prev => subMonths(prev, 1));
  };

  const navigateNext = () => {
    if (viewMode === 'agenda') setSelectedDate(prev => addDays(prev, 7));
    else if (viewMode === 'day') setSelectedDate(prev => addDays(prev, 1));
    else if (viewMode === 'week') setSelectedDate(prev => addWeeks(prev, 1));
    else setSelectedDate(prev => addMonths(prev, 1));
  };

  const navigateToday = () => {
    setSelectedDate(new Date());
  };

  // Get events for current view (filtered by visible types)
  const getViewEvents = () => {
    let start, end;
    if (viewMode === 'agenda') {
      start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      end = addDays(start, 90);
    } else if (viewMode === 'day') {
      start = selectedDate;
      end = selectedDate;
    } else if (viewMode === 'week') {
      start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    } else {
      start = startOfMonth(selectedDate);
      end = endOfMonth(selectedDate);
    }

    return events.filter(event => {
      if (!eventMatchesCurrentFilters(event)) return false;
      const eventDate = parseISO(event.start_time);
      return eventDate >= start && eventDate <= end;
    });
  };

  const getEventsForDay = (date) => {
    return events.filter(event => {
      if (!eventMatchesCurrentFilters(event)) return false;
      return isSameDay(parseISO(event.start_time), date);
    });
  };

  const toggleEventType = (type) => {
    setVisibleEventTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const getViewTitle = () => {
    if (viewMode === 'agenda') {
      return t('calendar.agendaTitle', 'Agenda');
    }
    if (viewMode === 'day') {
      return format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt });
    } else if (viewMode === 'week') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(start, 'd MMM', { locale: pt })} - ${format(end, "d MMM yyyy", { locale: pt })}`;
    }
    return format(selectedDate, "MMMM 'de' yyyy", { locale: pt });
  };

  const renderEventCard = (event, compact = false) => {
    const eventType = EVENT_TYPES[event.event_type] || EVENT_TYPES.outro;
    const Icon = eventType.icon;
    const isPostponed = event.status === 'postponed';
    const isCancelled = event.status === 'cancelled';

    return (
      <div
        key={event.id}
        className={`
          group relative rounded-2xl border border-slate-200 bg-white p-4
          shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5
          ${isPostponed ? 'opacity-60' : ''}
          ${isCancelled ? 'opacity-40' : ''}
        `}
        onClick={() => {
          if (event.start_time) {
            setSelectedDate(parseISO(event.start_time));
            setViewMode('day');
          }
        }}
      >
        <div className="flex items-start justify-between">

          <div className="flex-1">

            <div className="mb-3">
              <Badge
                className={`${eventType.color} text-white border-0`}
              >
                <Icon className="mr-1 h-3 w-3" />
                {eventType.label}
              </Badge>
            </div>

            <h3
              className={`
                text-base font-semibold text-slate-900
                ${isCancelled ? 'line-through' : ''}
              `}
            >
              {event.title}
            </h3>

            {!compact && (
              <Badge
                variant="outline"
                className="mt-2 rounded-full border-slate-200 bg-slate-50 text-slate-600"
              >
                <ClipboardCheck className="mr-1 h-3 w-3" />
                {event.optimistic_status ||
                  event.my_attendance_status ||
                  event.attendance_status ||
                  event.convocation_status ||
                  t('convocations.notLaunched', 'Convocatória não lançada')}
              </Badge>
            )}

            {!compact && (
              <div className="mt-2 grid grid-cols-1 gap-3 text-xs text-slate-500 md:grid-cols-[1fr_auto]">

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {event.start_time &&
                    format(parseISO(event.start_time), 'HH:mm')}
                  {event.end_time &&
                    ` - ${format(parseISO(event.end_time), 'HH:mm')}`}
                </div>

                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {event.location}
                  </div>
                )}

                {event.description && (
                  <div className="ml-auto max-w-sm rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">
                      {t('calendar.notes', 'Observações')}:
                    </span>{' '}
                    {event.description}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {teams.find(t => t.id === event.team_id)?.name || 'Equipa'}
                </div>

              </div>
            )}

            {isCancelled && (
              <Badge
                variant="outline"
                className="mt-4 border-red-500 bg-red-50 text-red-600"
              >
                ❌ {t('calendar.statusCancelled', 'Cancelado')}
              </Badge>
            )}

            {isPostponed && (
              <Badge
                variant="outline"
                className="mt-4 border-amber-500 bg-amber-50 text-amber-600"
              >
                ⏳ {t('calendar.statusPostponed', 'Adiado')}
              </Badge>
            )}
          </div>

          {canManageEvents &&
            (isAdmin || canAccessTeam(event.team_id)) && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className={
                      compact
                        ? 'h-7 w-7 rounded-full bg-white/90 text-slate-700 opacity-100 shadow-sm hover:bg-white'
                        : 'opacity-0 transition-opacity group-hover:opacity-100'
                    }
                    aria-label={compact ? t('common.edit', 'Editar') : t('common.actions', 'Ações')}
                  >
                    {compact ? <Edit className="h-3.5 w-3.5" /> : <MoreVertical className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  className="bg-white"
                  align="end"
                >
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(event);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>

                  {canCreateConvocations && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        openConvocationDialog(event);
                      }}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Convocar Jogadores
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      openConvocationStatusDialog(event);
                    }}
                  >
                    <ClipboardCheck className="w-4 h-4 mr-2" />
                    Ver Estado Convocatória
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      openPostponeDialog(event);
                    }}
                  >
                    <PauseCircle className="w-4 h-4 mr-2" />
                    {t('calendar.postpone', 'Adiar')}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      handleCancelEvent(event);
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {t('calendar.cancelEvent', 'Cancelar')}
                  </DropdownMenuItem>

                  {(event.status === 'cancelled' || event.status === 'postponed') && (
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        handleRestoreEvent(event);
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {event.status === 'postponed'
                        ? t('calendar.undoPostpone', 'Anular adiamento')
                        : t('calendar.restoreEvent', 'Reativar evento')}
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEvent(event);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          )}
        </div>
      </div>
    );
  };

  const getTeamName = (event) => {
    const eventTeam =
      teams.find((team) => team.id === event.team_id) ||
      event.team ||
      (Array.isArray(event.teams) ? event.teams[0] : null);

    return eventTeam?.name || t('calendar.team', 'Equipa');
  };

  const eventMatchesCurrentFilters = (event) => {
    if (!event?.start_time) return false;

    if (!visibleEventTypes.includes(event.event_type)) {
      return false;
    }

    if (selectedStatusFilter !== 'all') {
      const eventStatus = event.status || 'scheduled';
      if (eventStatus !== selectedStatusFilter) {
        return false;
      }
    }

    if (selectedTeamFilter && selectedTeamFilter !== 'all') {
      const eventTeamIds = [
        event.team_id,
        ...(event.team_ids || []),
      ].filter(Boolean);

      if (!eventTeamIds.includes(selectedTeamFilter)) {
        return false;
      }
    }

    return true;
  };

  const getSortedAgendaEvents = () => {
    return events
      .filter(eventMatchesCurrentFilters)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  };

  const getAgendaDayLabel = (date) => {
    if (isToday(date)) return t('calendar.today', 'Hoje');
    if (isSameDay(date, addDays(new Date(), 1))) return t('calendar.tomorrow', 'Amanhã');
    return format(date, "EEEE, d 'de' MMMM", { locale: pt });
  };

  const isGameEvent = (event) => {
    return ['jogo_campeonato', 'jogo_amigavel', 'torneio'].includes(event?.event_type);
  };

  const getCompetitionName = (event) => {
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
  };

  const getEventScore = (event) => {
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

    if (homeGoals === undefined || homeGoals === null || awayGoals === undefined || awayGoals === null) {
      return '';
    }

    return `${homeGoals} - ${awayGoals}`;
  };


  const getAgendaDateKey = (event) => {
    if (!event?.start_time) return 'unknown';

    return format(parseISO(event.start_time), 'yyyy-MM-dd');
  };

  const getAgendaConvocationStatus = (event) => {
    if (event?.is_private_convocation || event?.convocation_status === 'private') {
      return {
        label: t('convocations.private', 'Privada'),
        className: 'border-violet-200 bg-violet-50 text-violet-700',
        icon: EyeOff,
      };
    }

    const status =
      event?.my_attendance_status ||
      event?.attendance_status ||
      event?.convocation_status ||
      event?.convocation_lifecycle_status;

    if (status === 'confirmado') {
      return {
        label: t('attendance.confirmed', 'Confirmado'),
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        icon: CheckCircle,
      };
    }

    if (status === 'ausente' || status === 'faltou_sem_aviso') {
      return {
        label: t('attendance.absent', 'Ausente'),
        className: 'border-red-200 bg-red-50 text-red-700',
        icon: XCircle,
      };
    }

    if (status === 'pendente') {
      return {
        label: t('attendance.pending', 'Pendente'),
        className: 'border-amber-200 bg-amber-50 text-amber-700',
        icon: AlertCircle,
      };
    }

    if (status === 'launched' || status === 'published') {
      return {
        label: t('convocations.launched', 'Convocatória efetuada'),
        className: 'border-cyan-200 bg-cyan-50 text-cyan-700',
        icon: ClipboardCheck,
      };
    }

    if (status === 'draft') {
      return {
        label: t('convocations.draft', 'Rascunho'),
        className: 'border-slate-200 bg-slate-50 text-slate-600',
        icon: ClipboardCheck,
      };
    }

    if (status === 'closed') {
      return {
        label: t('convocations.closed', 'Fechada'),
        className: 'border-slate-200 bg-slate-100 text-slate-700',
        icon: ClipboardCheck,
      };
    }

    return {
      label: t('convocations.notLaunched', 'Convocatória não lançada'),
      className: 'border-slate-200 bg-slate-50 text-slate-500',
      icon: ClipboardCheck,
    };
  };

  const scrollAgendaToToday = () => {
    window.requestAnimationFrame(() => {
      if (!agendaScrollRef.current || !agendaTodayRef.current) return;

      const container = agendaScrollRef.current;
      const target = agendaTodayRef.current;
      const top = target.offsetTop - container.offsetTop - 8;

      container.scrollTo({
        top: Math.max(top, 0),
        behavior: 'auto',
      });
    });
  };

  useEffect(() => {
    if (viewMode !== 'agenda' || !isMobile) {
      hasAutoScrolledAgendaRef.current = false;
      return;
    }

    if (loading) return;

    if (!hasAutoScrolledAgendaRef.current) {
      hasAutoScrolledAgendaRef.current = true;
      scrollAgendaToToday();
    }
  }, [viewMode, isMobile, loading, events.length, selectedDate]);

  const groupAgendaEventsByDay = (agendaEvents) => {
    const groups = [];

    agendaEvents.forEach((event) => {
      const key = getAgendaDateKey(event);
      const existing = groups.find((group) => group.key === key);

      if (existing) {
        existing.events.push(event);
      } else {
        const date = event?.start_time ? parseISO(event.start_time) : new Date();
        groups.push({
          key,
          date,
          events: [event],
        });
      }
    });

    return groups;
  };


  const renderAgendaEventCard = (event) => {
    const eventType = EVENT_TYPES[event.event_type] || EVENT_TYPES.outro;
    const Icon = eventType.icon;
    const isBirthday = event.event_type === 'birthday';
    const isGame = isGameEvent(event);
    const isPostponed = event.status === 'postponed';
    const isCancelled = event.status === 'cancelled';
    const start = event.start_time ? parseISO(event.start_time) : null;
    const end = event.end_time ? parseISO(event.end_time) : null;
    const canManageThisEvent = canManageEvents && (isAdmin || canAccessTeam(event.team_id));
    const competitionName = getCompetitionName(event);
    const score = getEventScore(event);
    const convocationStatus = getAgendaConvocationStatus(event);
    const ConvocationStatusIcon = convocationStatus.icon;

    const openEventDay = () => {
      if (!event.start_time) return;
      setSelectedDate(parseISO(event.start_time));
      setViewMode('day');
    };

    return (
      <div
        key={event.id}
        className={`rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition active:scale-[0.99] ${
          isCancelled ? 'opacity-50' : isPostponed ? 'opacity-70' : ''
        }`}
        onClick={openEventDay}
      >
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isBirthday ? 'bg-pink-50 text-xl' : `${eventType.color} text-white`}`}>
            {isBirthday ? '🎂' : <Icon className="h-4 w-4" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex min-w-0 items-start justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <Badge className={`${eventType.color} border-0 text-[10px] text-white`}>
                  {!isBirthday && <Icon className="mr-1 h-3 w-3" />}
                  {eventType.label}
                </Badge>

                {!isBirthday && (
                  <Badge variant="outline" className={`${convocationStatus.className} text-[10px]`}>
                    <ConvocationStatusIcon className="mr-1 h-3 w-3" />
                    {convocationStatus.label}
                  </Badge>
                )}

                {isGame && competitionName && (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-700">
                    <Trophy className="mr-1 h-3 w-3" />
                    {competitionName}
                  </Badge>
                )}

                {score && (
                  <Badge variant="outline" className="border-slate-300 bg-slate-50 text-[10px] text-slate-700">
                    {score}
                  </Badge>
                )}

                {isCancelled && (
                  <Badge variant="outline" className="border-red-500 bg-red-50 text-[10px] text-red-600">
                    {t('calendar.statusCancelled', 'Cancelado')}
                  </Badge>
                )}

                {isPostponed && (
                  <Badge variant="outline" className="border-amber-500 bg-amber-50 text-[10px] text-amber-600">
                    {t('calendar.statusPostponed', 'Adiado')}
                  </Badge>
                )}
              </div>

              {!isBirthday && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100"
                      aria-label={t('common.actions', 'Ações')}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="bg-white" align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        openConvocationStatusDialog(event);
                      }}
                    >
                      <ClipboardCheck className="mr-2 h-4 w-4" />
                      {t('convocations.viewStatus', 'Ver Estado Convocatória')}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        openEventDay();
                      }}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {t('calendar.openDay', 'Abrir dia')}
                    </DropdownMenuItem>

                    {canCreateConvocations && canManageThisEvent && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          openConvocationDialog(event);
                        }}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        {event.has_convocation
                          ? t('convocations.editConvocation', 'Editar convocatória')
                          : t('convocations.callPlayers', 'Convocar Jogadores')}
                      </DropdownMenuItem>
                    )}

                    {isGame && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.info(t('statistics.inDevelopment', 'Estatísticas em desenvolvimento'));
                        }}
                      >
                        <Trophy className="mr-2 h-4 w-4" />
                        {t('statistics.title', 'Estatísticas')}
                      </DropdownMenuItem>
                    )}

                    {canManageThisEvent && (
                      <>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(event);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          {t('common.edit', 'Editar')}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            openPostponeDialog(event);
                          }}
                        >
                          <PauseCircle className="mr-2 h-4 w-4" />
                          {t('calendar.postpone', 'Adiar')}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEvent(event);
                          }}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          {t('calendar.cancelEvent', 'Cancelar')}
                        </DropdownMenuItem>

                        {(event.status === 'cancelled' || event.status === 'postponed') && (
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              handleRestoreEvent(event);
                            }}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            {event.status === 'postponed'
                              ? t('calendar.undoPostpone', 'Anular adiamento')
                              : t('calendar.restoreEvent', 'Reativar evento')}
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={(e) => {
                            e.preventDefault();
                            setSelectedEvent(event);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('common.delete', 'Eliminar')}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <h3 className={`truncate text-sm font-semibold text-slate-950 ${isCancelled ? 'line-through' : ''}`}>
              {event.title}
            </h3>

            {isBirthday ? (
              <p className="mt-1 text-xs text-slate-500">
                {event.age ? t('calendar.turnsAge', `${event.age} anos`) : t('calendar.birthday', 'Aniversário')}
              </p>
            ) : (
              <div className="mt-1.5 space-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {start ? format(start, 'HH:mm') : ''}
                    {end ? ` - ${format(end, 'HH:mm')}` : ''}
                  </span>
                </div>

                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  <span className="truncate">{getTeamName(event)}</span>
                </div>

                {isGame && event.opponent && (
                  <div className="flex items-center gap-2">
                    <Swords className="h-3.5 w-3.5" />
                    <span className="truncate">{t('calendar.opponent', 'Adversário')}: {event.opponent}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    const agendaEvents = getSortedAgendaEvents();
    const groups = groupAgendaEventsByDay(agendaEvents);
    const todayKey = format(new Date(), 'yyyy-MM-dd');

    let todayRefAssigned = false;

    return (
      <div ref={agendaScrollRef} className="h-full overflow-y-auto overscroll-contain pr-1">
        {groups.length === 0 ? (
          <Card className="border border-slate-200 bg-white">
            <CardContent className="py-12 text-center text-muted-foreground">
              <CalendarIcon className="mx-auto mb-3 h-12 w-12 opacity-50" />
              <p>{t('calendar.noEvents', 'Sem eventos na agenda')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const isCurrentGroup = group.key === todayKey;
              const startOfToday = new Date();
              startOfToday.setHours(0, 0, 0, 0);
              const assignTodayRef = !todayRefAssigned && (
                isCurrentGroup || group.date >= startOfToday
              );

              if (assignTodayRef) {
                todayRefAssigned = true;
              }

              return (
                <section
                  key={group.key}
                  ref={assignTodayRef ? agendaTodayRef : null}
                  className="scroll-mt-3"
                >
                  <div className="sticky top-0 z-10 mb-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                        {getAgendaDayLabel(group.date)}
                      </p>
                      <Badge variant="outline" className="rounded-full text-[10px]">
                        {group.events.length}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {group.events.map((event) => renderAgendaEventCard(event))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const dayEvents = getEventsForDay(selectedDate);
    const highlightedEventId = new URLSearchParams(location.search).get('eventId');

    const orderedDayEvents = highlightedEventId
      ? [
          ...dayEvents.filter((event) => event.id === highlightedEventId),
          ...dayEvents.filter((event) => event.id !== highlightedEventId),
        ]
      : dayEvents;

    return (
      <div className="space-y-4">
        <section className="overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-4 text-white shadow-xl shadow-slate-200/70 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge className="mb-3 border border-white/15 bg-white/10 text-white">
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {t('calendar.eventOperationalCenter', 'Centro operacional do evento')}
              </Badge>

              <h2 className="font-heading text-2xl tracking-tight sm:text-3xl">
                {format(selectedDate, 'EEEE, d MMMM', { locale: dateLocale })}
              </h2>

              <p className="mt-1 max-w-2xl text-sm text-cyan-50/75">
                {t(
                  'calendar.eventOperationalCenterHelp',
                  'Consulte detalhes, convocatórias, presenças e ações associadas ao evento.'
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="w-fit border-white/20 bg-white/10 text-white">
                {orderedDayEvents.length}{' '}
                {orderedDayEvents.length === 1
                  ? t('calendar.event', 'Evento')
                  : t('calendar.events', 'Eventos')}
              </Badge>

              {highlightedEventId && (
                <Badge variant="outline" className="w-fit border-cyan-200/50 bg-cyan-500/20 text-cyan-50">
                  {t('calendar.eventHighlighted', 'Evento destacado')}
                </Badge>
              )}
            </div>
          </div>
        </section>

        {orderedDayEvents.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="p-4">
              <div className="text-center py-12 text-muted-foreground">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('calendar.noEventsThisDay', 'Nenhum evento neste dia')}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orderedDayEvents.map((event) => (
              <div
                key={event.id}
                ref={(node) => {
                  if (node) {
                    dayEventRefs.current[event.id] = node;
                  } else {
                    delete dayEventRefs.current[event.id];
                  }
                }}
                className={event.id === highlightedEventId ? 'scroll-mt-24 rounded-[2rem] ring-4 ring-cyan-200/70' : 'scroll-mt-24'}
              >
                <EventCard
                  event={event}
                  t={t}
                  teams={teams}
                  eventTypes={EVENT_TYPES}
                  canManageEvents={canManageEvents}
                  canCreateConvocations={canCreateConvocations}
                  isAdmin={isAdmin}
                  canAccessTeam={canAccessTeam}
                  openEditDialog={openEditDialog}
                  openConvocationDialog={openConvocationDialog}
                  openConvocationStatusDialog={openConvocationStatusDialog}
                  openPostponeDialog={openPostponeDialog}
                  handleCancelEvent={handleCancelEvent}
                  handleRestoreEvent={handleRestoreEvent}
                  setSelectedEvent={setSelectedEvent}
                  setDeleteDialogOpen={setDeleteDialogOpen}
                  onConvocationStatusUpdated={() => fetchData({ silent: true })}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const isCurrentDay = isToday(day);

          return (
            <div key={day.toISOString()} className="min-h-[200px]">
              <div className={`
                text-center py-2 font-medium text-sm border-b border-border mb-2
                ${isCurrentDay ? 'bg-primary text-white rounded-t-sm' : ''}
              `}>
                <p className="text-xs uppercase">{format(day, 'EEE', { locale: pt })}</p>
                <p className="text-lg">{format(day, 'd')}</p>
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => renderEventCard(event, true))}
                {dayEvents.length > 3 && (
                  <button
                    type="button"
                    className="w-full rounded-lg bg-slate-100 px-2 py-1 text-center text-xs font-medium text-slate-500 transition hover:bg-slate-200"
                    onClick={() => {
                      setSelectedDate(day);
                      setViewMode('day');
                    }}
                  >
                    +{dayEvents.length - 3} {t('calendar.moreEvents', 'mais')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render month view
  const renderMonthView = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        {/* Header */}
        <div className="grid grid-cols-7 bg-slate-50">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
            <div
              key={day}
              className="py-3 text-center text-sm font-semibold text-slate-500"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7">
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, selectedDate);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`
                  min-h-[175px] cursor-pointer border-t border-r border-slate-200 p-2 transition-colors hover:bg-slate-50
                  ${!isCurrentMonth ? 'bg-muted/30' : 'bg-white'}
                  ${isCurrentDay ? 'ring-2 ring-primary ring-inset' : ''}
                `}
                onClick={() => {
                  setSelectedDate(day);
                  setViewMode('day');
                }}
              >
                <div className={`
                  text-sm font-medium mb-1
                  ${!isCurrentMonth ? 'text-muted-foreground' : ''}
                  ${isCurrentDay ? 'text-primary' : ''}
                `}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 5).map(event => {
                    const eventType = EVENT_TYPES[event.event_type] || EVENT_TYPES.outro;
                    const EventIcon = eventType.icon || CalendarIcon;
                    const canManageThisEvent =
                      canManageEvents && (isAdmin || canAccessTeam(event.team_id));

                    const eventTeam =
                      teams.find((team) => team.id === event.team_id) ||
                      event.team ||
                      null;

                    const eventTime = event.start_time
                      ? format(
                          typeof event.start_time === 'string'
                            ? parseISO(event.start_time)
                            : event.start_time,
                          'HH:mm'
                        )
                      : '';

                    const eventCard = (
                      <div
                        className={`group relative overflow-hidden rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${canManageThisEvent ? 'pr-8' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (event.start_time) {
                            setSelectedDate(parseISO(event.start_time));
                            setViewMode('day');
                          }
                        }}
                        title={
                          event.status === 'postponed'
                            ? `${t('calendar.statusPostponed', 'Adiado')}${
                                event.postponed_to_start_time
                                  ? ` para ${format(parseISO(event.postponed_to_start_time), 'dd/MM/yyyy HH:mm')}`
                                  : ''
                              }${event.postponement_reason ? ` — ${event.postponement_reason}` : ''}`
                            : event.status === 'cancelled'
                              ? t('calendar.statusCancelled', 'Cancelado')
                              : event.title
                        }
                      >
                        <div className={`absolute left-0 top-0 h-full w-1 ${eventType.color}`} />

                        <div className="flex min-w-0 items-center gap-1.5 pl-1">
                          <EventIcon className={`h-3.5 w-3.5 shrink-0 ${eventType.textColor}`} />

                          <p className="truncate text-[11px] font-semibold text-slate-900">
                            {event.status === 'cancelled' && '❌ '}
                            {event.status === 'postponed' && '⏳ '}
                            {event.title}
                          </p>
                        </div>

                        <div className="flex min-w-0 items-center gap-1 pl-1 text-[10px] text-slate-500">
                          {eventTime && <span>{eventTime}</span>}

                          {eventTeam?.name && (
                            <>
                              {eventTime && <span>•</span>}
                              <span className="truncate">{eventTeam.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );

                    return (
                      <div key={event.id} className="relative">
                        {eventCard}

                        {canManageThisEvent && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1 h-6 w-6 rounded-full bg-white/90 text-slate-700 opacity-90 shadow-sm hover:bg-white"
                                onClick={(e) => e.stopPropagation()}
                                aria-label={t('common.edit', 'Editar')}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent className="bg-white" align="start">
                              <DropdownMenuItem onClick={() => openEditDialog(event)}>
                                <Edit className="w-4 h-4 mr-2" />
                                {t('common.edit', 'Editar')}
                              </DropdownMenuItem>

                              {canCreateConvocations && (
                                <DropdownMenuItem onClick={() => openConvocationDialog(event)}>
                                  <Users className="w-4 h-4 mr-2" />
                                  {t('convocations.callPlayers', 'Convocar Jogadores')}
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem onClick={() => openConvocationStatusDialog(event)}>
                                <ClipboardCheck className="w-4 h-4 mr-2" />
                                {t('convocations.viewStatus', 'Ver Estado Convocatória')}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  openPostponeDialog(event);
                                }}
                              >
                                <PauseCircle className="w-4 h-4 mr-2" />
                                {t('calendar.postpone', 'Adiar')}
                              </DropdownMenuItem>

                              <DropdownMenuItem onClick={() => handleCancelEvent(event)}>
                                <XCircle className="w-4 h-4 mr-2" />
                                {t('calendar.cancelEvent', 'Cancelar')}
                              </DropdownMenuItem>

                              {(event.status === 'cancelled' || event.status === 'postponed') && (
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    handleRestoreEvent(event);
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  {event.status === 'postponed'
                                    ? t('calendar.undoPostpone', 'Anular adiamento')
                                    : t('calendar.restoreEvent', 'Reativar evento')}
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setSelectedEvent(event);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('common.delete', 'Eliminar')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    );
                  })}

                  {dayEvents.length > 5 && (
                    <p className="mt-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                      +{dayEvents.length - 5} mais
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading && events.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

    return (
      <PageShell
        compact
        fullHeight
        className="flex h-[calc(100dvh-92px)] flex-col overflow-hidden md:block md:h-auto md:overflow-visible"
        testId="calendar-page"
      >
        <CalendarHeader
        t={t}
        teams={teams}
        eventTypes={EVENT_TYPES}
        visibleEventTypes={visibleEventTypes}
        selectedTeamFilter={selectedTeamFilter}
        selectedStatusFilter={selectedStatusFilter}
        canManageEvents={canManageEvents}
        onTeamChange={setSelectedTeamFilter}
        onStatusChange={setSelectedStatusFilter}
        onEventTypeChange={setVisibleEventTypes}
        onOpenUnavailability={() => setUnavailabilityDialogOpen(true)}
        onExportPDF={handleExportPDF}
        onCreateEvent={() => setCreateDialogOpen(true)}
      />

      <PageSection
        compact
        testId="calendar-view-controls-section"
      >
        <CalendarViewControls
          t={t}
          viewMode={viewMode}
          viewTitle={getViewTitle()}
          isMobile={isMobile}
          viewModes={
            isMobile
              ? VIEW_MODES
              : {
                  day: VIEW_MODES.day,
                  week: VIEW_MODES.week,
                  month: VIEW_MODES.month,
                }
          }
          onPrevious={navigatePrevious}
          onToday={navigateToday}
          onNext={navigateNext}
          onChangeView={(key) => {
            setSelectedDate(new Date());
            setViewMode(key);
          }}
        />
      </PageSection>

      {isRefreshing && (
        <div className="flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700 md:w-fit">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t('common.refreshing', 'A atualizar...')}
        </div>
      )}

      {/* Calendar View */}
      <PageSection
        compact
        className="min-h-0 flex-1"
        contentClassName="h-full min-h-0"
        testId="calendar-view-section"
      >
        <div className="h-full min-h-0 overflow-y-auto overscroll-contain pb-24 pr-1 md:block md:overflow-visible md:pb-0 md:pr-0">
          {viewMode === 'agenda' && renderAgendaView()}
          {viewMode === 'day' && renderDayView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'month' && renderMonthView()}
        </div>
      </PageSection>

      {/* Create Event Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent
          className="bg-white max-w-lg max-h-[90vh] overflow-hidden"
          data-testid="create-event-dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">
              {t('calendar.createEvent', 'Criar evento')}
            </DialogTitle>
            <DialogDescription>
              {t('calendar.createEventDescription', 'Adicione um novo evento ao calendário')}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[68vh] overflow-y-auto space-y-4 py-4 pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('calendar.team', 'Equipa')} *</Label>
                <Select value={formData.team_id} onValueChange={(v) => setFormData(prev => ({ ...prev, team_id: v }))}>
                  <SelectTrigger data-testid="event-team-select">
                    <SelectValue placeholder={t('common.select', 'Selecione')} />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('calendar.eventType', 'Tipo de Evento')} *</Label>
                <Select value={formData.event_type} onValueChange={(v) => setFormData(prev => ({ ...prev, event_type: v }))}>
                  <SelectTrigger data-testid="event-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {Object.entries(EVENT_TYPES).map(([key, type]) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${type.textColor}`} />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Treino Técnico"
                data-testid="event-title-input"
              />
            </div>

            {(formData.event_type === 'jogo_campeonato' || formData.event_type === 'jogo_amigavel') && (
              <div className="space-y-2">
                <Label>Adversário</Label>
                <Input
                  value={formData.opponent}
                  onChange={(e) => setFormData(prev => ({ ...prev, opponent: e.target.value }))}
                  placeholder="Nome do adversário"
                  data-testid="event-opponent-input"
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  data-testid="event-date-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Início</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  data-testid="event-start-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                  data-testid="event-end-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Local</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Pavilhão Municipal"
                data-testid="event-location-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Notas adicionais..."
                rows={3}
              />
            </div>

            {/* Recurring Event Section - Only for Treino */}
            {formData.event_type === 'treino' && (
              <div className="space-y-4 p-4 border border-border rounded-sm bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-primary" />
                    <Label className="font-medium">Evento Periódico</Label>
                  </div>
                  <Switch
                    checked={isRecurring}
                    onCheckedChange={(checked) => {
                      setIsRecurring(checked);

                      if (checked && !recurringEndDate) {
                        setRecurringEndDate(
                          format(
                            addMonths(parseISO(formData.date), 1),
                            'yyyy-MM-dd'
                          )
                        );
                      }
                    }}
                    data-testid="recurring-switch"
                  />
                </div>

                {isRecurring && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-sm">Repetir nos dias:</Label>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAYS.map(day => (
                          <Button
                            key={day.value}
                            type="button"
                            variant={recurringDays.includes(day.value) ? "default" : "outline"}
                            size="sm"
                            className="w-10 h-10 p-0"
                            onClick={() => {
                              setRecurringDays(prev =>
                                prev.includes(day.value)
                                  ? prev.filter(d => d !== day.value)
                                  : [...prev, day.value]
                              );
                            }}
                            data-testid={`day-${day.label}`}
                          >
                            {day.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Data Início</Label>
                        <Input
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                          data-testid="recurring-start-date"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Data Fim</Label>
                        <Input
                          type="date"
                          value={recurringEndDate}
                          onChange={(e) => setRecurringEndDate(e.target.value)}
                          min={formData.date}
                          data-testid="recurring-end-date"
                        />
                      </div>
                    </div>

                    {recurringDays.length > 0 && recurringEndDate && (
                      <div className="text-sm text-muted-foreground bg-blue-50 p-2 rounded-sm">
                        <p>
                          Serão criados treinos todas as{' '}
                          <strong>
                            {recurringDays
                              .sort((a, b) => a - b)
                              .map(d => WEEKDAYS.find(w => w.value === d)?.fullLabel)
                              .join(', ')}
                          </strong>
                          {' '}de {format(parseISO(formData.date), "d 'de' MMMM", { locale: pt })} a{' '}
                          {format(parseISO(recurringEndDate), "d 'de' MMMM 'de' yyyy", { locale: pt })}.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateEvent} disabled={creating} data-testid="confirm-create-event-btn">
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A criar...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Evento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">
              EDITAR EVENTO
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[68vh] overflow-y-auto space-y-4 py-4 pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Evento</Label>
                <Select value={formData.event_type} onValueChange={(v) => setFormData(prev => ({ ...prev, event_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {Object.entries(EVENT_TYPES).map(([key, type]) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${type.textColor}`} />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="postponed">Adiado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Início</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Local</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateEvent} disabled={updating}>
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={postponeDialogOpen} onOpenChange={setPostponeDialogOpen}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('calendar.postponeEvent', 'Adiar evento')}
            </DialogTitle>
            <DialogDescription>
              {t('calendar.postponeEventDescription', 'Defina a nova data e hora do evento.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('calendar.newDate', 'Nova data')} *</Label>
              <Input
                type="date"
                value={postponeData.date}
                onChange={(e) =>
                  setPostponeData((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('calendar.startTime', 'Hora início')} *</Label>
                <Input
                  type="time"
                  value={postponeData.start_time}
                  onChange={(e) =>
                    setPostponeData((prev) => ({ ...prev, start_time: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>{t('calendar.endTime', 'Hora fim')}</Label>
                <Input
                  type="time"
                  value={postponeData.end_time}
                  onChange={(e) =>
                    setPostponeData((prev) => ({ ...prev, end_time: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('calendar.reason', 'Motivo')}</Label>
              <Textarea
                value={postponeData.reason}
                onChange={(e) =>
                  setPostponeData((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder={t('calendar.postponeReasonPlaceholder', 'Ex.: indisponibilidade do pavilhão')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPostponeDialogOpen(false)}>
              {t('common.cancel', 'Cancelar')}
            </Button>

            <Button onClick={handleConfirmPostpone} disabled={postponingEvent}>
              {postponingEvent ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.loading', 'A carregar...')}
                </>
              ) : (
                t('calendar.confirmPostpone', 'Confirmar adiamento')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convocation Dialog */}
      <Dialog open={convocationDialogOpen} onOpenChange={setConvocationDialogOpen}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              CONVOCATÓRIA
            </DialogTitle>
            <DialogDescription>
              Selecione os jogadores a convocar para este evento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedPlayers.length} selecionados</Badge>
                {convocationVisibility === 'private' && (
                  <Badge className="bg-violet-600 text-white">
                    {t('convocations.private', 'Privada')}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllPlayers}>
                  Todos
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAllPlayers}>
                  Nenhum
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[200px] border border-border rounded-sm p-2">
              {teamMembers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum membro na equipa
                </p>
              ) : (
                <div className="space-y-2">
                  {teamMembers.map(member => {
                    // Check if player is unavailable for this event
                    const eventDate = selectedEvent?.start_time ? new Date(selectedEvent.start_time) : null;
                    const isUnavailable = eventDate && unavailabilities.some(u =>
                      u.user_id === member.id &&
                      new Date(u.start_date) <= eventDate &&
                      new Date(u.end_date) >= eventDate
                    );

                    return (
                      <div
                        key={member.id}
                        className={`
                          flex items-center gap-3 p-2 rounded-sm transition-colors
                          ${isUnavailable ? 'opacity-60 bg-red-50 cursor-not-allowed' : 'cursor-pointer hover:bg-muted'}
                          ${selectedPlayers.includes(member.id) && !isUnavailable ? 'bg-primary/10' : ''}
                        `}
                        onClick={() => !isUnavailable && togglePlayerSelection(member.id)}
                      >
                        <Checkbox
                          checked={selectedPlayers.includes(member.id)}
                          onCheckedChange={() => !isUnavailable && togglePlayerSelection(member.id)}
                          disabled={isUnavailable}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="font-medium text-sm">{member.name}</span>
                          {isUnavailable && (
                            <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-200">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Indisponível
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Visibility Setting */}
            <div className="space-y-2">
              <Label>{t('convocations.visibility', 'Visibilidade da Convocatória')}</Label>
              <p className="text-xs text-muted-foreground">
                {t(
                  'convocations.visibilityHelp',
                  'Na convocatória privada, apenas convocados e equipa técnica têm acesso à lista.'
                )}
              </p>
              <Select value={convocationVisibility} onValueChange={setConvocationVisibility}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">
                    {t('convocations.visibilityAll', 'Todos (Jogadores e Delegados)')}
                  </SelectItem>
                  <SelectItem value="private">
                    {t('convocations.visibilityPrivate', 'Privada (apenas convocados e equipa técnica)')}
                  </SelectItem>
                  <SelectItem value="players">
                    {t('convocations.visibilityPlayers', 'Apenas Jogadores')}
                  </SelectItem>
                  <SelectItem value="delegates">
                    {t('convocations.visibilityDelegates', 'Apenas Delegados')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mensagem (opcional)</Label>
              <Textarea
                value={convocationMessage}
                onChange={(e) => setConvocationMessage(e.target.value)}
                placeholder="Mensagem para os convocados..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConvocationDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateConvocation} disabled={selectedPlayers.length === 0}>
              <Send className="w-4 h-4 mr-2" />
              Enviar Convocatória
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convocation Status Dialog */}
      <Dialog open={convocationStatusDialogOpen} onOpenChange={setConvocationStatusDialogOpen}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              {t('attendance.statusTitle')}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent?.title} - {selectedEvent?.start_time && format(parseISO(selectedEvent.start_time), "d 'de' MMMM", { locale: pt })}
              {(selectedEvent?.convocation_visibility === 'private' ||
                selectedEvent?.visibility === 'private' ||
                selectedEvent?.convocation?.visibility === 'private' ||
                selectedEvent?.convocation?.is_private) && (
                <Badge variant="outline" className="ml-2 border-violet-200 bg-violet-50 text-violet-700">
                  {t('convocations.private', 'Privada')}
                </Badge>
              )}
              {convocationStatus.event_passed && (
                <Badge variant="outline" className="ml-2 bg-gray-100 text-gray-600">Evento passado</Badge>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700">{convocationStatus.present?.length || 0}</p>
                <p className="text-xs text-green-600">{t('attendance.presentPlayers')}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-700">{convocationStatus.absent?.length || 0}</p>
                <p className="text-xs text-red-600">{t('attendance.absentPlayers')}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-amber-700">{convocationStatus.pending?.length || 0}</p>
                <p className="text-xs text-amber-600">{t('attendance.pendingPlayers')}</p>
              </div>
            </div>

            {/* Action buttons for pending players */}
            {canEditConvocationStatuses && convocationStatus.pending?.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendReminder}
                  disabled={sendingReminder}
                  data-testid="send-reminder-btn"
                >
                  {sendingReminder ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  {t('attendance.sendReminder')}
                </Button>
                {convocationStatus.event_passed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutoMarkAbsent}
                    disabled={updatingStatus}
                    className="text-amber-600 hover:text-amber-700"
                    data-testid="auto-mark-absent-btn"
                  >
                    {updatingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                    {t('attendance.autoMarkAbsent')}
                  </Button>
                )}
              </div>
            )}

            {/* Player Lists by Status */}
            <ScrollArea className="h-[300px] border border-border rounded-lg">
              {loadingStatus ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                </div>
              ) : convocationStatus.total === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>{t('attendance.noPlayers')}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setConvocationStatusDialogOpen(false);
                      openConvocationDialog(selectedEvent);
                    }}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {t('events.createConvocation')}
                  </Button>
                </div>
              ) : (
                <div className="p-3 space-y-4">
                  {/* Present Players */}
                  {convocationStatus.present?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {t('attendance.presentPlayers')} ({convocationStatus.present.length})
                      </h4>
                      <div className="space-y-2">
                        {convocationStatus.present.map((player) => (
                          <PlayerStatusRow
                            key={player.id}
                            player={player}
                            canEdit={canEditConvocationStatuses}
                            onUpdateStatus={handleUpdatePlayerStatus}
                            updating={updatingStatus}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Absent Players */}
                  {convocationStatus.absent?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        {t('attendance.absentPlayers')} ({convocationStatus.absent.length})
                      </h4>
                      <div className="space-y-2">
                        {convocationStatus.absent.map((player) => (
                          <PlayerStatusRow
                            key={player.id}
                            player={player}
                            canEdit={canEditConvocationStatuses}
                            onUpdateStatus={handleUpdatePlayerStatus}
                            updating={updatingStatus}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending Players */}
                  {convocationStatus.pending?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {t('attendance.pendingPlayers')} ({convocationStatus.pending.length})
                      </h4>
                      <div className="space-y-2">
                        {convocationStatus.pending.map((player) => (
                          <PlayerStatusRow
                            key={player.id}
                            player={player}
                            canEdit={canEditConvocationStatuses}
                            onUpdateStatus={handleUpdatePlayerStatus}
                            updating={updatingStatus}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConvocationStatusDialogOpen(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Evento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende eliminar este evento? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeleteEvent}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unavailability Dialog */}
      <UnavailabilityDialog
        open={unavailabilityDialogOpen}
        onOpenChange={setUnavailabilityDialogOpen}
        onSuccess={() => fetchData({ silent: true })}
      />
    </PageShell>
  );
}
