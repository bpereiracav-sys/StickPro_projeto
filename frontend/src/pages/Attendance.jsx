import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { teamsApi, championshipsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Skeleton } from '../components/ui/skeleton';
import { Progress } from '../components/ui/progress';
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
  Clock
} from 'lucide-react';
import { getInitials } from '../lib/utils';

const months = [
  { value: 'all', label: 'Todos os meses' },
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Marco' },
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
  { value: 'jogo', label: 'Jogos' },
  { value: 'campeonato', label: 'Campeonatos' },
];

export default function Attendance() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [championships, setChampionships] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [selectedChampionship, setSelectedChampionship] = useState('all');
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      fetchAttendance();
      fetchSummary();
      fetchChampionships();
    }
  }, [selectedTeamId, selectedMonth, selectedEventType, selectedChampionship]);

  const fetchTeams = async () => {
    try {
      const response = await teamsApi.getAll();
      setTeams(response.data);
      if (response.data.length > 0) {
        setSelectedTeamId(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChampionships = async () => {
    try {
      const response = await championshipsApi.getAll({ team_id: selectedTeamId });
      setChampionships(response.data);
    } catch (error) {
      console.error('Error fetching championships:', error);
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

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

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
          <h1 className="font-heading text-3xl lg:text-4xl text-foreground tracking-wide flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-primary" />
            PRESENÇAS
          </h1>
          <p className="text-muted-foreground mt-1">Acompanhamento de assiduidade</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-48" data-testid="team-filter">
              <SelectValue placeholder="Equipa" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {teams.map(team => (
                <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <div className="flex flex-wrap gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40" data-testid="month-filter">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedEventType} onValueChange={setSelectedEventType}>
              <SelectTrigger className="w-40" data-testid="event-type-filter">
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
                <SelectTrigger className="w-48" data-testid="championship-filter">
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

            <Card className="border border-border bg-secondary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary/20 rounded-sm flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-2xl font-heading text-secondary">{totals.confirmed}</p>
                    <p className="text-xs text-muted-foreground uppercase">Confirmados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-destructive/10 rounded-sm flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-heading text-destructive">{totals.absent}</p>
                    <p className="text-xs text-muted-foreground uppercase">Ausentes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-sm flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-heading">{overallRate}%</p>
                    <p className="text-xs text-muted-foreground uppercase">Taxa Presença</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Table */}
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="font-heading text-xl tracking-wide">
                ASSIDUIDADE POR JOGADOR
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attendance.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jogador</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Confirmado</TableHead>
                        <TableHead className="text-center">Ausente</TableHead>
                        <TableHead className="text-center">Pendente</TableHead>
                        <TableHead className="w-48">Taxa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.map((record, index) => (
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
                          <TableCell className="text-center font-mono text-secondary font-semibold">
                            {record.confirmado || 0}
                          </TableCell>
                          <TableCell className="text-center font-mono text-destructive">
                            {record.ausente || 0}
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
                  <p className="text-sm text-muted-foreground mt-1">
                    Os registos aparecem quando são criadas convocatórias
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary by Event Type */}
          {summary && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-lg tracking-wide flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
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
                      <span className="font-mono text-secondary">{summary.by_event_type?.treino?.confirmado || 0}</span>
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
                  <CardTitle className="font-heading text-lg tracking-wide flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    JOGOS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-mono">{summary.by_event_type?.jogo?.total || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confirmados:</span>
                      <span className="font-mono text-secondary">{summary.by_event_type?.jogo?.confirmado || 0}</span>
                    </div>
                    <Progress 
                      value={
                        summary.by_event_type?.jogo?.total > 0 
                          ? (summary.by_event_type?.jogo?.confirmado / summary.by_event_type?.jogo?.total) * 100
                          : 0
                      } 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-lg tracking-wide flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    CAMPEONATOS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-mono">{summary.by_event_type?.campeonato?.total || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confirmados:</span>
                      <span className="font-mono text-secondary">{summary.by_event_type?.campeonato?.confirmado || 0}</span>
                    </div>
                    <Progress 
                      value={
                        summary.by_event_type?.campeonato?.total > 0 
                          ? (summary.by_event_type?.campeonato?.confirmado / summary.by_event_type?.campeonato?.total) * 100
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
