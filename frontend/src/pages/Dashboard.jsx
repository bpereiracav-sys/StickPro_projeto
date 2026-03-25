import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardApi, teamsApi } from '../services/api';
import { Layout } from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { 
  Calendar, 
  Users, 
  ClipboardCheck, 
  MessageSquare,
  ChevronRight,
  MapPin,
  Clock
} from 'lucide-react';
import { formatDate, formatTime, getEventTypeName, getStatusColor, getStatusName } from '../lib/utils';

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

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="dashboard-page">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="font-heading text-4xl text-foreground tracking-wide">
            OLÁ, {user?.name?.split(' ')[0]?.toUpperCase()}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo ao painel de controlo
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border border-border card-hover" data-testid="stat-teams">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Equipas</p>
                  <p className="text-3xl font-heading tracking-wide">{data?.teams_count || 0}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-sm flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border card-hover" data-testid="stat-events">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Próximos Eventos</p>
                  <p className="text-3xl font-heading tracking-wide">{data?.upcoming_events?.length || 0}</p>
                </div>
                <div className="w-12 h-12 bg-secondary/10 rounded-sm flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border card-hover" data-testid="stat-convocations">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Convocatórias Pendentes</p>
                  <p className="text-3xl font-heading tracking-wide">{data?.pending_convocations?.length || 0}</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-sm flex items-center justify-center">
                  <ClipboardCheck className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border card-hover" data-testid="stat-messages">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Mensagens Recentes</p>
                  <p className="text-3xl font-heading tracking-wide">{data?.recent_messages?.length || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-sm flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Events */}
          <Card className="lg:col-span-2 border border-border" data-testid="upcoming-events-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-heading text-2xl tracking-wide">PRÓXIMOS EVENTOS</CardTitle>
              <Button asChild variant="ghost" size="sm" data-testid="view-calendar-btn">
                <Link to="/calendar" className="flex items-center gap-1">
                  Ver todos <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {data?.upcoming_events?.length > 0 ? (
                <div className="space-y-4">
                  {data.upcoming_events.map((event, index) => (
                    <div 
                      key={event.id} 
                      className={`flex items-start gap-4 p-4 border border-border rounded-sm animate-fade-in-up stagger-${index + 1}`}
                      data-testid={`event-${event.id}`}
                    >
                      <div className={`w-2 h-full min-h-[60px] rounded-sm ${event.event_type === 'jogo' ? 'bg-primary' : 'bg-secondary'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={event.event_type === 'jogo' ? 'default' : 'secondary'} className="text-xs">
                            {getEventTypeName(event.event_type)}
                          </Badge>
                          {event.team?.name && (
                            <span className="text-xs text-muted-foreground">{event.team.name}</span>
                          )}
                        </div>
                        <h4 className="font-semibold text-foreground">{event.title}</h4>
                        {event.opponent && (
                          <p className="text-sm text-muted-foreground">vs {event.opponent}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(event.start_time)} às {formatTime(event.start_time)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {event.location}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state py-12">
                  <Calendar className="empty-state-icon" />
                  <p className="text-muted-foreground">Nenhum evento agendado</p>
                  <Button asChild variant="outline" className="mt-4" data-testid="create-event-btn">
                    <Link to="/calendar">Criar Evento</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Convocations */}
          <Card className="border border-border" data-testid="pending-convocations-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-heading text-2xl tracking-wide">CONVOCATÓRIAS</CardTitle>
              <Button asChild variant="ghost" size="sm" data-testid="view-convocations-btn">
                <Link to="/convocations" className="flex items-center gap-1">
                  Ver todas <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {data?.pending_convocations?.length > 0 ? (
                <div className="space-y-4">
                  {data.pending_convocations.map((item, index) => (
                    <div 
                      key={item.attendance.id}
                      className={`p-4 border border-border rounded-sm animate-fade-in-up stagger-${index + 1}`}
                      data-testid={`convocation-${item.attendance.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={getStatusColor(item.attendance.status)}>
                          {getStatusName(item.attendance.status)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.event?.start_time)}
                        </span>
                      </div>
                      <h4 className="font-semibold text-foreground text-sm">{item.event?.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(item.event?.start_time)} - {item.event?.location}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button 
                          size="sm" 
                          variant="default"
                          className="flex-1 h-8 text-xs"
                          asChild
                        >
                          <Link to="/convocations">Responder</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state py-8">
                  <ClipboardCheck className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-sm">Sem convocatórias pendentes</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
