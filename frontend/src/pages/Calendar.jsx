import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { eventsApi, teamsApi } from '../services/api';
import { Layout } from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Calendar } from '../components/ui/calendar';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Calendar as CalendarIcon, Clock, MapPin, Loader2, X } from 'lucide-react';
import { formatDate, formatTime, getEventTypeName } from '../lib/utils';
import { format, isSameDay, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function CalendarPage() {
  const { canManageEvents } = useAuth();
  const [events, setEvents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    team_id: '',
    event_type: 'treino',
    title: '',
    description: '',
    location: '',
    start_time: '',
    end_time: '',
    opponent: ''
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
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const eventData = {
        ...formData,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null
      };
      
      await eventsApi.create(eventData);
      toast.success('Evento criado com sucesso!');
      setCreateDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao criar evento';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Tem a certeza que quer eliminar este evento?')) return;

    try {
      await eventsApi.delete(eventId);
      toast.success('Evento eliminado');
      fetchData();
    } catch (error) {
      toast.error('Erro ao eliminar evento');
    }
  };

  const resetForm = () => {
    setFormData({
      team_id: '',
      event_type: 'treino',
      title: '',
      description: '',
      location: '',
      start_time: '',
      end_time: '',
      opponent: ''
    });
  };

  const eventsOnSelectedDate = events.filter(event => {
    const eventDate = new Date(event.start_time);
    return isSameDay(eventDate, selectedDate);
  });

  const datesWithEvents = events.map(e => new Date(e.start_time));

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96 lg:col-span-2" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="calendar-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-4xl text-foreground tracking-wide">CALENDÁRIO</h1>
            <p className="text-muted-foreground mt-1">Jogos e treinos da equipa</p>
          </div>
          
          {canManageEvents && (
            <Button 
              onClick={() => setCreateDialogOpen(true)} 
              className="btn-hover rounded-sm"
              data-testid="create-event-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Evento
            </Button>
          )}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="border border-border">
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={pt}
                className="rounded-sm"
                modifiers={{
                  hasEvent: datesWithEvents
                }}
                modifiersStyles={{
                  hasEvent: {
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                    textDecorationColor: 'hsl(var(--primary))'
                  }
                }}
                data-testid="calendar-widget"
              />
            </CardContent>
          </Card>

          {/* Events List */}
          <Card className="border border-border lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-heading text-2xl tracking-wide">
                {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: pt }).toUpperCase()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventsOnSelectedDate.length > 0 ? (
                <div className="space-y-4">
                  {eventsOnSelectedDate.map((event, index) => (
                    <div 
                      key={event.id}
                      className={`flex items-start gap-4 p-4 border border-border rounded-sm animate-fade-in-up stagger-${index + 1}`}
                      data-testid={`event-item-${event.id}`}
                    >
                      <div className={`w-2 h-full min-h-[80px] rounded-sm ${event.event_type === 'jogo' ? 'bg-primary' : 'bg-secondary'}`} />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={event.event_type === 'jogo' ? 'default' : 'secondary'}>
                                {getEventTypeName(event.event_type)}
                              </Badge>
                              {teams.find(t => t.id === event.team_id)?.name && (
                                <span className="text-xs text-muted-foreground">
                                  {teams.find(t => t.id === event.team_id)?.name}
                                </span>
                              )}
                            </div>
                            <h4 className="font-semibold text-lg text-foreground">{event.title}</h4>
                            {event.opponent && (
                              <p className="text-muted-foreground">vs {event.opponent}</p>
                            )}
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                            )}
                          </div>
                          {canManageEvents && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteEvent(event.id)}
                              data-testid={`delete-event-${event.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {formatTime(event.start_time)}
                            {event.end_time && ` - ${formatTime(event.end_time)}`}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state py-12">
                  <CalendarIcon className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Sem eventos neste dia</p>
                  {canManageEvents && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      Criar Evento
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events */}
        <Card className="border border-border mt-6">
          <CardHeader>
            <CardTitle className="font-heading text-2xl tracking-wide">PRÓXIMOS EVENTOS</CardTitle>
          </CardHeader>
          <CardContent>
            {events.filter(e => new Date(e.start_time) >= new Date()).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events
                  .filter(e => new Date(e.start_time) >= new Date())
                  .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                  .slice(0, 6)
                  .map((event, index) => (
                    <div 
                      key={event.id}
                      className={`p-4 border border-border rounded-sm card-hover animate-fade-in-up stagger-${(index % 5) + 1}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={event.event_type === 'jogo' ? 'default' : 'secondary'} className="text-xs">
                          {getEventTypeName(event.event_type)}
                        </Badge>
                      </div>
                      <h4 className="font-semibold">{event.title}</h4>
                      {event.opponent && (
                        <p className="text-sm text-muted-foreground">vs {event.opponent}</p>
                      )}
                      <div className="mt-2 text-xs text-muted-foreground">
                        <p>{formatDate(event.start_time)} às {formatTime(event.start_time)}</p>
                        <p>{event.location}</p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Sem eventos agendados</p>
            )}
          </CardContent>
        </Card>

        {/* Create Event Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="bg-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl tracking-wide">CRIAR EVENTO</DialogTitle>
              <DialogDescription>
                Adicione um novo jogo ou treino ao calendário
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateEvent}>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Equipa</Label>
                    <Select
                      value={formData.team_id}
                      onValueChange={(value) => setFormData({ ...formData, team_id: value })}
                    >
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
                    <Label>Tipo</Label>
                    <Select
                      value={formData.event_type}
                      onValueChange={(value) => setFormData({ ...formData, event_type: value })}
                    >
                      <SelectTrigger data-testid="event-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="treino">Treino</SelectItem>
                        <SelectItem value="jogo">Jogo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    placeholder="Ex: Treino Técnico"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    data-testid="event-title-input"
                  />
                </div>

                {formData.event_type === 'jogo' && (
                  <div className="space-y-2">
                    <Label>Adversário</Label>
                    <Input
                      placeholder="Nome da equipa adversária"
                      value={formData.opponent}
                      onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
                      data-testid="event-opponent-input"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Local</Label>
                  <Input
                    placeholder="Ex: Pavilhão Municipal"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                    data-testid="event-location-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início</Label>
                    <Input
                      type="datetime-local"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      required
                      data-testid="event-start-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim (opcional)</Label>
                    <Input
                      type="datetime-local"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      data-testid="event-end-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Textarea
                    placeholder="Notas adicionais..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    data-testid="event-description-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={creating} data-testid="submit-event-btn">
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      A criar...
                    </>
                  ) : (
                    'Criar Evento'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
