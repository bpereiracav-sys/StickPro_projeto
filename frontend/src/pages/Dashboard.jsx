import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardApi, eventsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
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
  Trophy,
  TrendingUp
} from 'lucide-react';
import { formatDate, formatTime, getEventTypeName, getInitials } from '../lib/utils';
import { format, isToday, isTomorrow, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await dashboardApi.get();
      setData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventDateLabel = (date) => {
    const d = new Date(date);
    if (isToday(d)) return 'HOJE';
    if (isTomorrow(d)) return 'AMANHÃ';
    return format(d, "EEE, d MMM", { locale: pt }).toUpperCase();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const nextEvent = data?.upcoming_events?.[0];
  const pendingCount = data?.pending_convocations?.length || 0;

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl text-foreground tracking-wide">
            BOM DIA, {user?.name?.split(' ')[0]?.toUpperCase()}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: pt })}
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-amber-500 text-white px-3 py-1.5 text-sm">
            {pendingCount} convocatória{pendingCount > 1 ? 's' : ''} pendente{pendingCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Next Event Highlight */}
      {nextEvent && (
        <Card className="border-2 border-primary bg-primary/5 overflow-hidden" data-testid="next-event-card">
          <div className="flex flex-col lg:flex-row">
            <div className={`lg:w-32 p-4 flex flex-col items-center justify-center text-white ${nextEvent.event_type === 'jogo' ? 'bg-primary' : 'bg-secondary'}`}>
              <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
                {getEventDateLabel(nextEvent.start_time)}
              </span>
              <span className="font-heading text-4xl mt-1">
                {format(new Date(nextEvent.start_time), 'd')}
              </span>
              <span className="text-sm opacity-80">
                {format(new Date(nextEvent.start_time), 'MMM', { locale: pt }).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant={nextEvent.event_type === 'jogo' ? 'default' : 'secondary'} className="mb-2">
                    {getEventTypeName(nextEvent.event_type)}
                  </Badge>
                  <h2 className="font-heading text-2xl text-foreground tracking-wide">
                    {nextEvent.title}
                  </h2>
                  {nextEvent.opponent && (
                    <p className="text-lg text-muted-foreground mt-1">vs {nextEvent.opponent}</p>
                  )}
                </div>
                <Button asChild data-testid="view-event-btn">
                  <Link to="/calendar">
                    Ver Detalhes
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-6 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {formatTime(nextEvent.start_time)}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {nextEvent.location}
                </span>
                {nextEvent.team?.name && (
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {nextEvent.team.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <Card className="lg:col-span-2 border border-border" data-testid="upcoming-events-section">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-heading text-xl tracking-wide flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              PRÓXIMOS EVENTOS
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/calendar">Ver Calendário</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data?.upcoming_events?.length > 0 ? (
              <div className="space-y-3">
                {data.upcoming_events.slice(0, 5).map((event, index) => (
                  <div 
                    key={event.id} 
                    className="flex items-center gap-4 p-3 border border-border rounded-sm hover:border-primary transition-colors"
                    data-testid={`event-row-${event.id}`}
                  >
                    <div className={`w-1.5 h-12 rounded-full ${event.event_type === 'jogo' ? 'bg-primary' : 'bg-secondary'}`} />
                    <div className="w-14 text-center">
                      <p className="text-xs text-muted-foreground uppercase">
                        {format(new Date(event.start_time), 'EEE', { locale: pt })}
                      </p>
                      <p className="font-heading text-xl">{format(new Date(event.start_time), 'd')}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{event.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {formatTime(event.start_time)} • {event.location}
                      </p>
                    </div>
                    <Badge variant="outline" className="hidden sm:flex">
                      {getEventTypeName(event.event_type)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Sem eventos agendados</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link to="/calendar">Criar Evento</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Convocations */}
        <Card className="border border-border" data-testid="convocations-section">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-heading text-xl tracking-wide flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-amber-500" />
              CONVOCATÓRIAS
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/convocations">Ver Todas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data?.pending_convocations?.length > 0 ? (
              <div className="space-y-3">
                {data.pending_convocations.slice(0, 4).map((item) => (
                  <div 
                    key={item.attendance.id}
                    className="p-3 border border-amber-200 bg-amber-50 rounded-sm"
                    data-testid={`convocation-item-${item.attendance.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-amber-500 text-white text-xs">
                        <HelpCircle className="w-3 h-3 mr-1" />
                        Pendente
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.event?.start_time), "d MMM", { locale: pt })}
                      </span>
                    </div>
                    <p className="font-semibold text-sm">{item.event?.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(item.event?.start_time)} • {item.event?.location}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" className="flex-1 h-8 bg-secondary hover:bg-secondary/90">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Presente
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-destructive border-destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        Ausente
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-secondary mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Todas as convocatórias respondidas!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-sm flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-heading">{data?.teams_count || 0}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Equipas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-secondary/10 rounded-sm flex items-center justify-center">
              <Calendar className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-heading">{data?.upcoming_events?.length || 0}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Eventos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-sm flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-heading">{pendingCount}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-sm flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-heading">{data?.recent_messages?.length || 0}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Mensagens</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
