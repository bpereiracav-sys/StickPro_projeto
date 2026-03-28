import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { usePermissions } from '../context/PermissionsContext';
import { teamsApi, championshipsApi, eventsApi, convocationsApi, unavailabilitiesApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Skeleton } from '../components/ui/skeleton';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { 
  ClipboardCheck, 
  Users,
  Calendar,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  CalendarDays,
  CalendarRange,
  Filter,
  Download,
  Search,
  AlertTriangle,
  CalendarOff,
  UserX,
  Loader2
} from 'lucide-react';
import { getInitials } from '../lib/utils';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isSameWeek, isSameMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import { toast } from 'sonner';

const months = [
  { value: 'all', label: 'Todos os meses' },
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const eventTypes = [
  { value: 'all', label: 'Todos os eventos' },
  { value: 'treino', label: 'Treinos' },
  { value: 'jogo_campeonato', label: 'Jogos Campeonato' },
  { value: 'jogo_amigavel', label: 'Jogos Amigáveis' },
  { value: 'torneio', label: 'Torneios' },
  { value: 'outro', label: 'Outros' },
];

const seasons = [
  { value: 'all', label: 'Todas as épocas' },
  { value: '2025/2026', label: '2025/2026' },
  { value: '2024/2025', label: '2024/2025' },
  { value: '2023/2024', label: '2023/2024' },
];

const viewModes = [
  { value: 'player', label: 'Por Jogador', icon: Users },
  { value: 'event', label: 'Por Evento', icon: Calendar },
  { value: 'week', label: 'Por Semana', icon: CalendarDays },
  { value: 'month', label: 'Por Mês', icon: CalendarRange },
];

export default function Attendance() {
  const { user } = useAuth();
  const { selectedTeam, teams: contextTeams } = useTeam();
  const { canManageAttendance, canAccessTeam, isAdmin, isPlayer, isFamilyMember } = usePermissions();
  const [teams, setTeams] = useState([]);
  const [championships, setChampionships] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('2025/2026');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [selectedChampionship, setSelectedChampionship] = useState('all');
  const [viewMode, setViewMode] = useState('player');
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState(null);
  const [eventAttendance, setEventAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  
  // New state for search and unavailabilities
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [unavailabilities, setUnavailabilities] = useState([]);
  const [showUnavailabilities, setShowUnavailabilities] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Set selected team from context
  useEffect(() => {
    if (selectedTeam) {
      setSelectedTeamId(selectedTeam.id);
    } else if (contextTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(contextTeams[0].id);
    }
    setTeams(contextTeams);
    if (contextTeams.length > 0) {
      setLoading(false);
    }
  }, [selectedTeam, contextTeams]);

  useEffect(() => {
    if (selectedTeamId) {
      fetchAttendance();
      fetchSummary();
      fetchChampionships();
      fetchEvents();
      fetchUnavailabilities();
    }
  }, [selectedTeamId, selectedSeason, selectedMonth, selectedEventType, selectedChampionship]);

  const fetchChampionships = async () => {
    try {
      const response = await championshipsApi.getAll({ team_id: selectedTeamId });
      setChampionships(response.data);
    } catch (error) {
      console.error('Error fetching championships:', error);
    }
  };

  const fetchUnavailabilities = async () => {
    try {
      const response = await teamsApi.getAttendanceUnavailabilities(selectedTeamId);
      setUnavailabilities(response.data || []);
    } catch (error) {
      console.error('Error fetching unavailabilities:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    
    try {
      const response = await teamsApi.searchAttendance(selectedTeamId, searchQuery);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching attendance:', error);
      toast.error('Erro na pesquisa');
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await eventsApi.getAll({ team_id: selectedTeamId });
      const eventsData = response.data;
      setEvents(eventsData);
      
      // Fetch attendance for each event
      const attendancePromises = eventsData.slice(0, 20).map(async (event) => {
        try {
          const attResponse = await eventsApi.getAttendance(event.id);
          return { eventId: event.id, data: attResponse.data };
        } catch (err) {
          return { eventId: event.id, data: { summary: { total: 0, confirmado: 0, ausente: 0, pendente: 0 } } };
        }
      });
      
      const attendanceResults = await Promise.all(attendancePromises);
      const attendanceMap = {};
      attendanceResults.forEach(({ eventId, data }) => {
        attendanceMap[eventId] = data;
      });
      setEventAttendance(attendanceMap);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchAttendance = async () => {
    try {
      const params = {};
      if (selectedMonth && selectedMonth !== 'all') params.month = parseInt(selectedMonth);
      if (selectedEventType && selectedEventType !== 'all') params.event_type = selectedEventType;
      if (selectedChampionship && selectedChampionship !== 'all') params.championship_id = selectedChampionship;

      const response = await teamsApi.getAttendance(selectedTeamId, params);
      setAttendance(response.data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await teamsApi.getAttendanceSummary(selectedTeamId);
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  // Export attendance to Excel
  const handleExportExcel = async () => {
    if (!selectedTeamId) {
      toast.error('Selecione uma equipa primeiro');
      return;
    }
    
    setExporting(true);
    try {
      // Create Excel content using CSV format that Excel can open
      const headers = ['Jogador', 'Email', 'Eventos', 'Presenças', 'Ausências', 'Pendentes', 'Taxa Presença (%)'];
      
      const rows = attendance.map(a => [
        a.player_name || '',
        a.player_email || '',
        a.total || 0,
        a.confirmado || 0,
        a.ausente || 0,
        a.pendente || 0,
        a.total > 0 ? Math.round((a.confirmado / a.total) * 100) : 0
      ]);
      
      // Add totals row
      rows.push([
        'TOTAL',
        '',
        totals.total,
        totals.confirmed,
        totals.absent,
        totals.pending,
        overallRate
      ]);
      
      // Create CSV content
      const csvContent = [
        `Relatório de Presenças - ${currentTeam?.name || 'Equipa'}`,
        `Época: ${selectedSeason}`,
        `Mês: ${selectedMonth === 'all' ? 'Todos' : months.find(m => m.value === selectedMonth)?.label}`,
        `Tipo: ${selectedEventType === 'all' ? 'Todos' : eventTypes.find(t => t.value === selectedEventType)?.label}`,
        '',
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Add BOM for Excel UTF-8 support
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `presencas_${currentTeam?.name?.replace(/\s+/g, '_') || 'equipa'}_${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Exportação concluída!');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setExporting(false);
    }
  };

  const currentTeam = teams.find(t => t.id === selectedTeamId);

  // Calculate totals
  const totals = attendance.reduce((acc, a) => ({
    total: acc.total + (a.total || 0),
    confirmed: acc.confirmed + (a.confirmado || 0),
    absent: acc.absent + (a.ausente || 0),
    pending: acc.pending + (a.pendente || 0)
  }), { total: 0, confirmed: 0, absent: 0, pending: 0 });

  const overallRate = totals.total > 0 
    ? Math.round((totals.confirmed / totals.total) * 100) 
    : 0;

  // Group events by week with attendance calculations
  const getEventsByWeek = () => {
    const now = new Date();
    const weeks = [];
    
    // Get last 8 weeks
    for (let i = 0; i < 8; i++) {
      const weekStart = startOfWeek(new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      
      const weekEvents = events.filter(e => {
        if (!e.start_time) return false;
        const eventDate = parseISO(e.start_time);
        return isSameWeek(eventDate, weekStart, { weekStartsOn: 1 });
      });
      
      // Calculate attendance for this week
      let totalRecords = 0;
      let confirmed = 0;
      weekEvents.forEach(event => {
        const att = eventAttendance[event.id];
        if (att?.summary) {
          totalRecords += att.summary.total || 0;
          confirmed += att.summary.confirmado || 0;
        }
      });
      
      const rate = totalRecords > 0 ? Math.round((confirmed / totalRecords) * 100) : 0;
      
      weeks.push({
        start: weekStart,
        end: weekEnd,
        label: `${format(weekStart, 'd MMM', { locale: pt })} - ${format(weekEnd, 'd MMM', { locale: pt })}`,
        events: weekEvents,
        total: weekEvents.length,
        totalRecords,
        confirmed,
        rate
      });
    }
    
    return weeks.reverse();
  };

  // Group events by month with attendance calculations
  const getEventsByMonth = () => {
    const monthsData = [];
    
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const monthEvents = events.filter(e => {
        if (!e.start_time) return false;
        const eventDate = parseISO(e.start_time);
        return isSameMonth(eventDate, monthStart);
      });
      
      // Calculate attendance for this month
      let totalRecords = 0;
      let confirmed = 0;
      monthEvents.forEach(event => {
        const att = eventAttendance[event.id];
        if (att?.summary) {
          totalRecords += att.summary.total || 0;
          confirmed += att.summary.confirmado || 0;
        }
      });
      
      const rate = totalRecords > 0 ? Math.round((confirmed / totalRecords) * 100) : 0;
      
      monthsData.push({
        date: monthStart,
        label: format(monthStart, 'MMMM yyyy', { locale: pt }),
        events: monthEvents,
        total: monthEvents.length,
        totalRecords,
        confirmed,
        rate
      });
    }
    
    return monthsData.reverse();
  };

  // Get event type label
  const getEventTypeLabel = (type) => {
    const typeObj = eventTypes.find(t => t.value === type);
    return typeObj?.label || type;
  };

  // Get status badge with new status
  const getStatusBadge = (status) => {
    const statusConfig = {
      confirmado: { label: 'Confirmado', variant: 'default', className: 'bg-green-500' },
      ausente: { label: 'Ausente', variant: 'destructive', className: '' },
      pendente: { label: 'Pendente', variant: 'secondary', className: '' },
      faltou_sem_aviso: { label: 'Faltou s/ aviso', variant: 'destructive', className: 'bg-red-700' }
    };
    const config = statusConfig[status] || statusConfig.pendente;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  // Get reason label for unavailability
  const getReasonLabel = (reason) => {
    const reasons = {
      ferias: 'Férias',
      lesao: 'Lesão',
      trabalho: 'Trabalho',
      pessoal: 'Pessoal',
      outro: 'Outro'
    };
    return reasons[reason] || reason;
  };

  // Filter attendance data to show
  const displayAttendance = searchResults !== null ? searchResults : attendance;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="attendance-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-primary" />
            PRESENÇAS
          </h1>
          <p className="text-muted-foreground mt-1">Acompanhamento de assiduidade</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="flex gap-2">
            <Input
              placeholder="Pesquisar jogador..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-48"
              data-testid="search-attendance-input"
            />
            <Button variant="outline" size="icon" onClick={handleSearch} data-testid="search-attendance-btn">
              <Search className="w-4 h-4" />
            </Button>
            {searchResults !== null && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchResults(null); setSearchQuery(''); }}>
                Limpar
              </Button>
            )}
          </div>
          
          {/* Toggle unavailabilities */}
          <Button 
            variant={showUnavailabilities ? "default" : "outline"} 
            size="sm"
            onClick={() => setShowUnavailabilities(!showUnavailabilities)}
            data-testid="toggle-unavailabilities-btn"
          >
            <CalendarOff className="w-4 h-4 mr-2" />
            Indisponibilidades
            {unavailabilities.length > 0 && (
              <Badge variant="secondary" className="ml-2">{unavailabilities.length}</Badge>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportExcel}
            disabled={exporting || attendance.length === 0}
            data-testid="export-attendance-btn"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A exportar...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </>
            )}
          </Button>
        </div>
      </div>

      {teams.length === 0 ? (
        <Card className="border border-border">
          <CardContent className="py-16 text-center">
            <ClipboardCheck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading text-xl mb-2">Sem Equipas</h3>
            <p className="text-muted-foreground mb-4">Crie uma equipa para ver as presenças</p>
            <Button asChild>
              <Link to="/teams">Criar Equipa</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-lg tracking-tight flex items-center gap-2">
                <Filter className="w-5 h-5" />
                FILTROS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger data-testid="team-filter">
                    <SelectValue placeholder="Equipa" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                  <SelectTrigger data-testid="season-filter">
                    <SelectValue placeholder="Época" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {seasons.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger data-testid="month-filter">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {months.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                  <SelectTrigger data-testid="event-type-filter">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {eventTypes.map(e => (
                      <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {championships.length > 0 && (
                  <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
                    <SelectTrigger data-testid="championship-filter">
                      <SelectValue placeholder="Campeonato" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">Todos</SelectItem>
                      {championships.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-heading">{totals.total}</p>
                    <p className="text-xs text-muted-foreground uppercase">Total Registos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-sm flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-heading text-green-600">{totals.confirmed}</p>
                    <p className="text-xs text-muted-foreground uppercase">Confirmados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-sm flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-heading text-red-600">{totals.absent}</p>
                    <p className="text-xs text-muted-foreground uppercase">Ausentes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-sm flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-heading text-amber-600">{overallRate}%</p>
                    <p className="text-xs text-muted-foreground uppercase">Taxa Presença</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList className="grid grid-cols-4 w-full max-w-md">
              {viewModes.map(mode => {
                const Icon = mode.icon;
                return (
                  <TabsTrigger key={mode.value} value={mode.value} className="flex items-center gap-1">
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{mode.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* By Player View */}
            <TabsContent value="player">
              {/* Unavailabilities Section */}
              {showUnavailabilities && unavailabilities.length > 0 && (
                <Card className="border border-border mb-4 bg-orange-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-heading text-lg tracking-tight flex items-center gap-2">
                      <CalendarOff className="w-5 h-5 text-orange-600" />
                      INDISPONIBILIDADES
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {unavailabilities.slice(0, 5).map(unav => (
                        <div key={unav.id} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs bg-orange-500 text-white">
                                {getInitials(unav.user_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{unav.user_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(unav.start_date), 'dd/MM/yyyy', { locale: pt })} - {format(new Date(unav.end_date), 'dd/MM/yyyy', { locale: pt })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                              {getReasonLabel(unav.reason)}
                            </Badge>
                            {unav.notes && (
                              <p className="text-xs text-muted-foreground mt-1">{unav.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {unavailabilities.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center">
                          E mais {unavailabilities.length - 5} indisponibilidade(s)...
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="font-heading text-xl tracking-tight">
                    {searchResults !== null ? 'RESULTADOS DA PESQUISA' : 'ASSIDUIDADE POR JOGADOR'}
                  </CardTitle>
                  <CardDescription>
                    {searchResults !== null 
                      ? `${searchResults.length} resultado(s) para "${searchQuery}"` 
                      : `Época ${selectedSeason}`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {displayAttendance.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Jogador</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">Confirmado</TableHead>
                            <TableHead className="text-center">Ausente</TableHead>
                            <TableHead className="text-center">S/ Aviso</TableHead>
                            <TableHead className="text-center">Pendente</TableHead>
                            <TableHead className="w-48">Taxa</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayAttendance.map((record, index) => (
                            <TableRow key={record.player?.id || index}>
                              <TableCell>
                                <Link 
                                  to={`/players/${record.player?.id}`}
                                  className="flex items-center gap-2 hover:text-primary transition-colors"
                                >
                                  <Avatar className="w-8 h-8">
                                    <AvatarImage src={record.player?.avatar_url} />
                                    <AvatarFallback className="text-xs bg-primary text-white">
                                      {getInitials(record.player?.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">{record.player?.name || 'Jogador'}</span>
                                </Link>
                              </TableCell>
                              <TableCell className="text-center font-mono">{record.total || 0}</TableCell>
                              <TableCell className="text-center font-mono text-green-600 font-semibold">
                                {record.confirmado || 0}
                              </TableCell>
                              <TableCell className="text-center font-mono text-red-600">
                                {record.ausente || 0}
                              </TableCell>
                              <TableCell className="text-center font-mono text-red-700">
                                {record.faltou_sem_aviso || 0}
                              </TableCell>
                              <TableCell className="text-center font-mono text-amber-600">
                                {record.pendente || 0}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress 
                                    value={record.attendance_rate || 0} 
                                    className="h-2 flex-1"
                                  />
                                  <span className="text-sm font-mono w-12 text-right">
                                    {record.attendance_rate || 0}%
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Sem registos de presenças</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* By Event View */}
            <TabsContent value="event">
              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="font-heading text-xl tracking-tight">
                    PRESENÇAS POR EVENTO
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {events.length > 0 ? (
                    <div className="space-y-3">
                      {events.slice(0, 15).map(event => {
                        const att = eventAttendance[event.id];
                        const summary = att?.summary || { total: 0, confirmado: 0, ausente: 0 };
                        return (
                          <div 
                            key={event.id}
                            className="flex items-center justify-between p-3 border border-border rounded-sm hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{event.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {event.start_time && format(parseISO(event.start_time), 'd MMM yyyy', { locale: pt })}
                                  {' - '}
                                  {getEventTypeLabel(event.event_type)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-center min-w-[60px]">
                                <p className="text-lg font-heading text-green-600">{summary.confirmado}</p>
                                <p className="text-xs text-muted-foreground">Confirmados</p>
                              </div>
                              <div className="text-center min-w-[60px]">
                                <p className="text-lg font-heading text-red-600">{summary.ausente}</p>
                                <p className="text-xs text-muted-foreground">Ausentes</p>
                              </div>
                              <div className="text-center min-w-[60px]">
                                <p className="text-lg font-heading text-amber-600">{summary.pendente || 0}</p>
                                <p className="text-xs text-muted-foreground">Pendentes</p>
                              </div>
                              {summary.total > 0 && (
                                <div className="flex items-center gap-2 min-w-[100px]">
                                  <Progress 
                                    value={Math.round((summary.confirmado / summary.total) * 100)} 
                                    className="w-16 h-2"
                                  />
                                  <span className="text-sm font-mono">
                                    {Math.round((summary.confirmado / summary.total) * 100)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Sem eventos registados</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* By Week View */}
            <TabsContent value="week">
              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="font-heading text-xl tracking-tight">
                    PRESENÇAS POR SEMANA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getEventsByWeek().map((week, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 border border-border rounded-sm hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-sm flex items-center justify-center">
                            <CalendarDays className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{week.label}</p>
                            <p className="text-sm text-muted-foreground">
                              {week.total} {week.total === 1 ? 'evento' : 'eventos'}
                              {week.totalRecords > 0 && ` • ${week.confirmed}/${week.totalRecords} presenças`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={week.rate} className="w-24 h-2" />
                          <span className="text-sm font-mono w-12 text-right">{week.rate}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* By Month View */}
            <TabsContent value="month">
              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="font-heading text-xl tracking-tight">
                    PRESENÇAS POR MÊS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getEventsByMonth().map((month, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 border border-border rounded-sm hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-sm flex items-center justify-center">
                            <CalendarRange className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium capitalize">{month.label}</p>
                            <p className="text-sm text-muted-foreground">
                              {month.total} {month.total === 1 ? 'evento' : 'eventos'}
                              {month.totalRecords > 0 && ` • ${month.confirmed}/${month.totalRecords} presenças`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={month.rate} className="w-24 h-2" />
                          <span className="text-sm font-mono w-12 text-right">{month.rate}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Summary by Event Type */}
          {summary && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-lg tracking-tight flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    TREINOS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-mono">{summary.by_event_type?.treino?.total || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confirmados:</span>
                      <span className="font-mono text-green-600">{summary.by_event_type?.treino?.confirmado || 0}</span>
                    </div>
                    <Progress 
                      value={
                        summary.by_event_type?.treino?.total > 0 
                          ? (summary.by_event_type?.treino?.confirmado / summary.by_event_type?.treino?.total) * 100
                          : 0
                      } 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-lg tracking-tight flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-500" />
                    JOGOS CAMPEONATO
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-mono">{summary.by_event_type?.jogo_campeonato?.total || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confirmados:</span>
                      <span className="font-mono text-green-600">{summary.by_event_type?.jogo_campeonato?.confirmado || 0}</span>
                    </div>
                    <Progress 
                      value={
                        summary.by_event_type?.jogo_campeonato?.total > 0 
                          ? (summary.by_event_type?.jogo_campeonato?.confirmado / summary.by_event_type?.jogo_campeonato?.total) * 100
                          : 0
                      } 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-lg tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-500" />
                    TORNEIOS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-mono">{summary.by_event_type?.torneio?.total || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confirmados:</span>
                      <span className="font-mono text-green-600">{summary.by_event_type?.torneio?.confirmado || 0}</span>
                    </div>
                    <Progress 
                      value={
                        summary.by_event_type?.torneio?.total > 0 
                          ? (summary.by_event_type?.torneio?.confirmado / summary.by_event_type?.torneio?.total) * 100
                          : 0
                      } 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
