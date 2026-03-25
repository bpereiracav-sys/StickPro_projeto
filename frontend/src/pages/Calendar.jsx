import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { eventsApi, teamsApi, usersApi } from '../services/api';
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
  HelpCircle
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
  const { canManageEvents, user } = useAuth();
  const [events, setEvents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [eventsRes, teamsRes] = await Promise.all([
        eventsApi.getAll(),
        teamsApi.getAll()
      ]);
      setEvents(eventsRes.data);
      setTeams(teamsRes.data);
      if (teamsRes.data.length > 0 && !formData.team_id) {
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
      setTeamMembers(response.data.players || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
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
  };

  const handleCreateEvent = async () => {
    if (!formData.team_id || !formData.title || !formData.date) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setCreating(true);
    try {
      const eventData = {
        ...formData,
        start_time: `${formData.date}T${formData.start_time}:00`,
        end_time: `${formData.date}T${formData.end_time}:00`
      };
      
      const response = await eventsApi.create(eventData);
      setEvents(prev => [...prev, response.data]);
      setCreateDialogOpen(false);
      resetForm();
      toast.success('Evento criado com sucesso!');
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

  const handlePostponeEvent = async () => {
    if (!selectedEvent) return;
    
    try {
      await eventsApi.update(selectedEvent.id, { status: 'postponed' });
      setEvents(prev => prev.map(e => e.id === selectedEvent.id ? { ...e, status: 'postponed' } : e));
      toast.success('Evento adiado!');
    } catch (error) {
      toast.error('Erro ao adiar evento');
    }
  };

  const handleCancelEvent = async () => {
    if (!selectedEvent) return;
    
    try {
      await eventsApi.update(selectedEvent.id, { status: 'cancelled' });
      setEvents(prev => prev.map(e => e.id === selectedEvent.id ? { ...e, status: 'cancelled' } : e));
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

  const openConvocationDialog = (event) => {
    setSelectedEvent(event);
    fetchTeamMembers(event.team_id);
    setSelectedPlayers([]);
    setConvocationVisible(true);
    setConvocationMessage('');
    setConvocationDialogOpen(true);
  };

  const handleCreateConvocation = async () => {
    if (!selectedEvent || selectedPlayers.length === 0) {
      toast.error('Selecione pelo menos um jogador');
      return;
    }

    try {
      // Create convocation (simplified - would need proper backend endpoint)
      toast.success(`Convocatória criada para ${selectedPlayers.length} jogadores!`);
      setConvocationDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao criar convocatória');
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
    setSelectedPlayers(teamMembers.map(m => m.id));
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

  // Get events for current view
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
      const eventDate = parseISO(event.start_time);
      return eventDate >= start && eventDate <= end;
    });
  };

  const getEventsForDay = (date) => {
    return events.filter(event => {
      if (!event.start_time) return false;
      return isSameDay(parseISO(event.start_time), date);
    });
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
              <p className={`font-medium text-sm truncate ${eventType.textColor}`}>
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
          
          {canManageEvents && (
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
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openConvocationDialog(event); }}>
                  <Users className="w-4 h-4 mr-2" />
                  Convocatória
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
                    return (
                      <div
                        key={event.id}
                        className={`text-xs truncate px-1 py-0.5 rounded-sm ${eventType.color} text-white`}
                        onClick={(e) => { e.stopPropagation(); openEditDialog(event); }}
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
          <h1 className="font-heading text-3xl lg:text-4xl text-foreground tracking-wide flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-primary" />
            CALENDÁRIO
          </h1>
          <p className="text-muted-foreground mt-1">Eventos e atividades</p>
        </div>

        <div className="flex items-center gap-2">
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
          <h2 className="font-heading text-xl tracking-wide ml-4 capitalize">
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

      {/* Calendar View */}
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}

      {/* Create Event Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-white max-w-lg" data-testid="create-event-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-wide">
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
            <DialogTitle className="font-heading text-xl tracking-wide">
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
            <DialogTitle className="font-heading text-xl tracking-wide flex items-center gap-2">
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
                  {teamMembers.map(member => (
                    <div
                      key={member.id}
                      className={`
                        flex items-center gap-3 p-2 rounded-sm cursor-pointer transition-colors
                        ${selectedPlayers.includes(member.id) ? 'bg-primary/10' : 'hover:bg-muted'}
                      `}
                      onClick={() => togglePlayerSelection(member.id)}
                    >
                      <Checkbox
                        checked={selectedPlayers.includes(member.id)}
                        onCheckedChange={() => togglePlayerSelection(member.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{member.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="flex items-center justify-between p-3 bg-muted rounded-sm">
              <div className="flex items-center gap-2">
                {convocationVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span className="text-sm">Visível para a equipa</span>
              </div>
              <Switch
                checked={convocationVisible}
                onCheckedChange={setConvocationVisible}
              />
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
    </div>
  );
}
