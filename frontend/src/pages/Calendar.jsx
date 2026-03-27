import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { usePermissions } from '../context/PermissionsContext';
import { eventsApi, teamsApi, usersApi, unavailabilitiesApi } from '../services/api';
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

// Event Types with icons and colors
const EVENT_TYPES = {
  treino: { label: 'Treino', icon: Dumbbell, color: 'bg-blue-500', textColor: 'text-blue-600' },
  jogo_campeonato: { label: 'Jogo Campeonato', icon: Trophy, color: 'bg-amber-500', textColor: 'text-amber-600' },
  jogo_amigavel: { label: 'Jogo Amigável', icon: Swords, color: 'bg-green-500', textColor: 'text-green-600' },
  torneio: { label: 'Torneio', icon: Flag, color: 'bg-purple-500', textColor: 'text-purple-600' },
  outro: { label: 'Outro', icon: HelpCircle, color: 'bg-gray-500', textColor: 'text-gray-600' }
};

const VIEW_MODES = {
  day: { label: 'Dia', icon: CalendarIcon },
  week: { label: 'Semana', icon: CalendarDays },
  month: { label: 'Mês', icon: LayoutGrid }
};

export default function CalendarPage() {
  const { user } = useAuth();
  const { selectedTeam, teams: contextTeams, isAllTeamsSelected } = useTeam();
  const { canManageEvents, canCreateConvocations, canAccessTeam, isAdmin } = usePermissions();
  const [events, setEvents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [visibleEventTypes, setVisibleEventTypes] = useState(['treino', 'jogo_campeonato', 'jogo_amigavel', 'torneio', 'outro']);
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
  const [convocationStatus, setConvocationStatus] = useState({ attendances: [], summary: {} });
  
  // Unavailability state
  const [unavailabilities, setUnavailabilities] = useState([]);
  const [unavailabilityDialogOpen, setUnavailabilityDialogOpen] = useState(false);
  const [showUnavailabilities, setShowUnavailabilities] = useState(true);
  
  // Convocation visibility setting
  const [convocationVisibility, setConvocationVisibility] = useState('all'); // players, delegates, all
  
  const [formData, setFormData] = useState({
    team_id: '',
    event_type: 'treino',
    title: '',
    description: '',
    location: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '18:00',
    end_time: '20:00',
    opponent: '',
    status: 'scheduled' // scheduled, postponed, cancelled
  });

  // Recurring event state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState([]); // 0=Dom, 1=Seg, 2=Ter, etc.
  const [recurringEndDate, setRecurringEndDate] = useState('');

  const WEEKDAYS = [
    { value: 1, label: 'Seg', fullLabel: 'Segunda' },
    { value: 2, label: 'Ter', fullLabel: 'Terça' },
    { value: 3, label: 'Qua', fullLabel: 'Quarta' },
    { value: 4, label: 'Qui', fullLabel: 'Quinta' },
    { value: 5, label: 'Sex', fullLabel: 'Sexta' },
    { value: 6, label: 'Sáb', fullLabel: 'Sábado' },
    { value: 0, label: 'Dom', fullLabel: 'Domingo' }
  ];

  // Fetch events when selected team changes
  useEffect(() => {
    fetchData();
  }, [selectedTeam]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventsRes, teamsRes, unavailRes] = await Promise.all([
        eventsApi.getAll(),
        teamsApi.getAll(),
        unavailabilitiesApi.getMy().catch(() => ({ data: [] }))
      ]);
      
      // Filter events by selected team
      let filteredEvents = eventsRes.data;
      if (selectedTeam) {
        filteredEvents = eventsRes.data.filter(e => e.team_id === selectedTeam.id);
      }
      
      setEvents(filteredEvents);
      setTeams(teamsRes.data);
      setUnavailabilities(unavailRes.data || []);
      
      // Set default team for form
      if (selectedTeam) {
        setFormData(prev => ({ ...prev, team_id: selectedTeam.id }));
      } else if (teamsRes.data.length > 0 && !formData.team_id) {
        setFormData(prev => ({ ...prev, team_id: teamsRes.data[0].id }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
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
    if (!formData.team_id || !formData.title || !formData.date) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Validate recurring events
    if (isRecurring) {
      if (recurringDays.length === 0) {
        toast.error('Selecione pelo menos um dia da semana');
        return;
      }
      if (!recurringEndDate) {
        toast.error('Selecione a data de fim do período');
        return;
      }
    }

    setCreating(true);
    try {
      if (isRecurring && recurringDays.length > 0 && recurringEndDate) {
        // Generate all dates for recurring events
        const dates = generateRecurringDates(formData.date, recurringEndDate, recurringDays);
        
        if (dates.length === 0) {
          toast.error('Nenhuma data encontrada para os dias selecionados');
          setCreating(false);
          return;
        }

        if (dates.length > 100) {
          toast.error(`Demasiados eventos (${dates.length}). Limite máximo: 100`);
          setCreating(false);
          return;
        }

        // Create events for all dates
        const createdEvents = [];
        for (const date of dates) {
          const eventData = {
            ...formData,
            date: date,
            start_time: `${date}T${formData.start_time}:00`,
            end_time: `${date}T${formData.end_time}:00`
          };
          
          const response = await eventsApi.create(eventData);
          createdEvents.push(response.data);
        }
        
        setEvents(prev => [...prev, ...createdEvents]);
        toast.success(`${createdEvents.length} eventos criados com sucesso!`);
      } else {
        // Single event
        const eventData = {
          ...formData,
          start_time: `${formData.date}T${formData.start_time}:00`,
          end_time: `${formData.date}T${formData.end_time}:00`
        };
        
        const response = await eventsApi.create(eventData);
        setEvents(prev => [...prev, response.data]);
        toast.success('Evento criado com sucesso!');
      }
      
      setCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      const message = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : 'Erro ao criar evento';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;

    setUpdating(true);
    try {
      const eventData = {
        ...formData,
        start_time: `${formData.date}T${formData.start_time}:00`,
        end_time: `${formData.date}T${formData.end_time}:00`
      };
      
      await eventsApi.update(selectedEvent.id, eventData);
      setEvents(prev => prev.map(e => e.id === selectedEvent.id ? { ...e, ...eventData } : e));
      setEditDialogOpen(false);
      setSelectedEvent(null);
      toast.success('Evento atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar evento');
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
        visibility: convocationVisibility
      });
      
      // Check if any players were skipped due to unavailability
      const skipped = response.data?.skipped_unavailable_players || [];
      if (skipped.length > 0) {
        toast.warning(`${skipped.length} jogador(es) indisponível(is) foram excluídos da convocatória`);
      }
      
      toast.success(`Convocatória criada para ${selectedPlayers.length - skipped.length} jogadores!`);
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
    try {
      const response = await eventsApi.getEventAttendance(event.id);
      setConvocationStatus({
        attendances: response.data?.attendances || [],
        summary: response.data?.summary || { total: 0, confirmado: 0, ausente: 0, pendente: 0 }
      });
      setConvocationStatusDialogOpen(true);
    } catch (error) {
      // No attendance records for this event
      setConvocationStatus({ attendances: [], summary: { total: 0, confirmado: 0, ausente: 0, pendente: 0 } });
      setConvocationStatusDialogOpen(true);
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
    if (viewMode === 'day') setSelectedDate(prev => subDays(prev, 1));
    else if (viewMode === 'week') setSelectedDate(prev => subWeeks(prev, 1));
    else setSelectedDate(prev => subMonths(prev, 1));
  };

  const navigateNext = () => {
    if (viewMode === 'day') setSelectedDate(prev => addDays(prev, 1));
    else if (viewMode === 'week') setSelectedDate(prev => addWeeks(prev, 1));
    else setSelectedDate(prev => addMonths(prev, 1));
  };

  const navigateToday = () => {
    setSelectedDate(new Date());
  };

  // Get events for current view (filtered by visible types)
  const getViewEvents = () => {
    let start, end;
    if (viewMode === 'day') {
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
      if (!event.start_time) return false;
      if (!visibleEventTypes.includes(event.event_type)) return false;
      const eventDate = parseISO(event.start_time);
      return eventDate >= start && eventDate <= end;
    });
  };

  const getEventsForDay = (date) => {
    return events.filter(event => {
      if (!event.start_time) return false;
      if (!visibleEventTypes.includes(event.event_type)) return false;
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
          group relative p-2 rounded-sm border-l-4 ${eventType.color} bg-white border border-border
          ${isPostponed ? 'opacity-60' : ''} ${isCancelled ? 'opacity-40 line-through' : ''}
          hover:shadow-md transition-shadow cursor-pointer
        `}
        onClick={() => openEditDialog(event)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <Icon className={`w-4 h-4 mt-0.5 ${eventType.textColor} shrink-0`} />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate text-foreground">
                {event.title}
              </p>
              {!compact && (
                <>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {event.start_time && format(parseISO(event.start_time), 'HH:mm')}
                    {event.end_time && ` - ${format(parseISO(event.end_time), 'HH:mm')}`}
                  </p>
                  {event.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {event.location}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Show action menu only if user can manage events AND has access to this event's team */}
          {canManageEvents && (isAdmin || canAccessTeam(event.team_id)) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white" align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(event); }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                {canCreateConvocations && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openConvocationDialog(event); }}>
                    <Users className="w-4 h-4 mr-2" />
                    Convocar Jogadores
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openConvocationStatusDialog(event); }}>
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  Ver Estado Convocatória
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); handlePostponeEvent(); }}>
                  <PauseCircle className="w-4 h-4 mr-2" />
                  Adiar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); handleCancelEvent(); }}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setDeleteDialogOpen(true); }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {(isPostponed || isCancelled) && (
          <Badge variant="outline" className={`mt-1 text-xs ${isCancelled ? 'border-destructive text-destructive' : 'border-amber-500 text-amber-500'}`}>
            {isCancelled ? 'Cancelado' : 'Adiado'}
          </Badge>
        )}
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const dayEvents = getEventsForDay(selectedDate);
    
    return (
      <Card className="border border-border">
        <CardContent className="p-4">
          {dayEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum evento neste dia</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dayEvents.map(event => renderEventCard(event))}
            </div>
          )}
        </CardContent>
      </Card>
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
                  <p className="text-xs text-muted-foreground text-center">
                    +{dayEvents.length - 3} mais
                  </p>
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
      <div className="border border-border rounded-sm overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 bg-muted">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
            <div key={day} className="py-2 text-center text-sm font-medium text-muted-foreground">
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
                  min-h-[100px] p-1 border-t border-r border-border
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
                  {dayEvents.slice(0, 2).map(event => {
                    const eventType = EVENT_TYPES[event.event_type] || EVENT_TYPES.outro;
                    const canManageThisEvent = canManageEvents && (isAdmin || canAccessTeam(event.team_id));
                    
                    return canManageThisEvent ? (
                      <DropdownMenu key={event.id}>
                        <DropdownMenuTrigger asChild>
                          <div
                            className={`text-xs truncate px-1 py-0.5 rounded-sm ${eventType.color} text-white cursor-pointer hover:opacity-90`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {event.title}
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-white" align="start">
                          <DropdownMenuItem onClick={() => openEditDialog(event)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {canCreateConvocations && (
                            <DropdownMenuItem onClick={() => openConvocationDialog(event)}>
                              <Users className="w-4 h-4 mr-2" />
                              Convocar Jogadores
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => openConvocationStatusDialog(event)}>
                            <ClipboardCheck className="w-4 h-4 mr-2" />
                            Ver Estado Convocatória
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handlePostponeEvent(event)}>
                            <PauseCircle className="w-4 h-4 mr-2" />
                            Adiar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCancelEvent(event)}>
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancelar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => { setSelectedEvent(event); setDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <div
                        key={event.id}
                        className={`text-xs truncate px-1 py-0.5 rounded-sm ${eventType.color} text-white`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {event.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <p className="text-xs text-muted-foreground px-1">
                      +{dayEvents.length - 2}
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="calendar-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-primary" />
            Calendário
          </h1>
          <p className="text-muted-foreground mt-1">Eventos e atividades</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Unavailability */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setUnavailabilityDialogOpen(true)} 
            data-testid="create-unavailability-btn"
          >
            <CalendarOff className="w-4 h-4 mr-2" />
            Indisponibilidade
          </Button>
          
          {/* Export/Print */}
          <Button variant="outline" size="sm" onClick={handleExportPDF} data-testid="export-pdf-btn">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          
          {/* Create Event */}
          {canManageEvents && (
            <Button onClick={() => setCreateDialogOpen(true)} data-testid="create-event-btn">
              <Plus className="w-4 h-4 mr-2" />
              Novo Evento
            </Button>
          )}
        </div>
      </div>

      {/* View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navigatePrevious}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={navigateToday}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <h2 className="font-heading text-xl tracking-tight ml-4 capitalize">
            {getViewTitle()}
          </h2>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center border border-border rounded-sm">
          {Object.entries(VIEW_MODES).map(([key, mode]) => {
            const Icon = mode.icon;
            return (
              <Button
                key={key}
                variant={viewMode === key ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none first:rounded-l-sm last:rounded-r-sm"
                onClick={() => setViewMode(key)}
                data-testid={`view-${key}-btn`}
              >
                <Icon className="w-4 h-4 mr-1" />
                {mode.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Event Type Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground mr-2">Filtrar:</span>
        {Object.entries(EVENT_TYPES).map(([key, type]) => {
          const Icon = type.icon;
          const isActive = visibleEventTypes.includes(key);
          return (
            <Button
              key={key}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className={`gap-2 ${isActive ? type.color : ''}`}
              onClick={() => toggleEventType(key)}
              data-testid={`filter-${key}`}
            >
              <Icon className="w-4 h-4" />
              {type.label}
            </Button>
          );
        })}
      </div>

      {/* Calendar View */}
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}

      {/* Create Event Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-white max-w-lg" data-testid="create-event-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">
              CRIAR EVENTO
            </DialogTitle>
            <DialogDescription>
              Adicione um novo evento ao calendário
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Equipa *</Label>
                <Select value={formData.team_id} onValueChange={(v) => setFormData(prev => ({ ...prev, team_id: v }))}>
                  <SelectTrigger data-testid="event-team-select">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Evento *</Label>
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
                    onCheckedChange={setIsRecurring}
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

          <div className="space-y-4 py-4">
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
              <Label>Visibilidade da Convocatória</Label>
              <Select value={convocationVisibility} onValueChange={setConvocationVisibility}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">Todos (Jogadores e Delegados)</SelectItem>
                  <SelectItem value="players">Apenas Jogadores</SelectItem>
                  <SelectItem value="delegates">Apenas Delegados</SelectItem>
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
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              ESTADO DA CONVOCATÓRIA
            </DialogTitle>
            <DialogDescription>
              {selectedEvent?.title} - {selectedEvent?.start_time && format(parseISO(selectedEvent.start_time), "d 'de' MMMM", { locale: pt })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-sm p-3 text-center">
                <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700">{convocationStatus.summary.confirmado || 0}</p>
                <p className="text-xs text-green-600">Presentes</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-sm p-3 text-center">
                <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-700">{convocationStatus.summary.ausente || 0}</p>
                <p className="text-xs text-red-600">Ausentes</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-sm p-3 text-center">
                <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-amber-700">{convocationStatus.summary.pendente || 0}</p>
                <p className="text-xs text-amber-600">Pendentes</p>
              </div>
            </div>

            {/* Player List */}
            <ScrollArea className="h-[250px] border border-border rounded-sm">
              {convocationStatus.attendances.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma convocatória criada para este evento</p>
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
                    Criar Convocatória
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {convocationStatus.attendances.map((att, index) => (
                    <div key={att.id || index} className="flex items-center justify-between p-3 hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={att.player?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {getInitials(att.player?.name || 'NN')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{att.player?.name || 'Nome não disponível'}</p>
                          <p className="text-xs text-muted-foreground">
                            {att.player?.jersey_number ? `#${att.player.jersey_number}` : ''}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant="outline"
                        className={`
                          ${att.status === 'confirmado' ? 'bg-green-100 text-green-700 border-green-200' : ''}
                          ${att.status === 'ausente' ? 'bg-red-100 text-red-700 border-red-200' : ''}
                          ${att.status === 'pendente' ? 'bg-amber-100 text-amber-700 border-amber-200' : ''}
                        `}
                      >
                        {att.status === 'confirmado' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {att.status === 'ausente' && <XCircle className="w-3 h-3 mr-1" />}
                        {att.status === 'pendente' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {att.status === 'confirmado' ? 'Presente' : att.status === 'ausente' ? 'Ausente' : 'Pendente'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConvocationStatusDialogOpen(false)}>
              Fechar
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
        onSuccess={fetchData}
      />
    </div>
  );
}
