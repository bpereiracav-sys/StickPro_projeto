import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { teamsApi, usersApi, trainingFeedbackApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Skeleton } from '../components/ui/skeleton';
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
import { toast } from 'sonner';
import { 
  Users, 
  Plus, 
  ArrowLeft, 
  Loader2,
  Trophy,
  Target,
  AlertTriangle
} from 'lucide-react';
import { getInitials, getRoleName, getRoleColor } from '../lib/utils';

export default function TeamDetail() {
  const { teamId } = useParams();
  const { canManageTeam, user } = useAuth();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState([]);
  const [teamFeedback, setTeamFeedback] = useState([]);
  const [feedbackPeriod, setFeedbackPeriod] = useState('all');
  const [feedbackPlayer, setFeedbackPlayer] = useState('all');
  const [feedbackEvent, setFeedbackEvent] = useState('all');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('jogador');

  useEffect(() => {
    fetchTeamData();
  }, [teamId]);

  const fetchTeamData = async () => {
    try {
      const [teamRes, membersRes, statsRes] = await Promise.all([
        teamsApi.getOne(teamId),
        teamsApi.getMembers(teamId),
        teamsApi.getStats(teamId)
      ]);
  
      setTeam(teamRes.data);
      setMembers(membersRes.data);
      setStats(statsRes.data);
  
      try {
        const feedbackRes = await trainingFeedbackApi.getTeam(teamId);
        setTeamFeedback(Array.isArray(feedbackRes.data) ? feedbackRes.data : []);
      } catch (feedbackError) {
        console.error('Error fetching team feedback:', feedbackError);
        setTeamFeedback([]);
      }
  
      if (canManageTeam) {
        const usersRes = await usersApi.getAll();
        const memberIds = membersRes.data.map(m => m.id);
        setAvailableUsers(usersRes.data.filter(u => !memberIds.includes(u.id)));
      }
    } catch (error) {
      console.error('Error fetching team:', error);
      toast.error('Erro ao carregar equipa');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    setAdding(true);

    try {
      await teamsApi.addMember(teamId, { user_id: selectedUserId, role: selectedRole });
      toast.success('Membro adicionado!');
      setAddMemberDialogOpen(false);
      setSelectedUserId('');
      fetchTeamData();
    } catch (error) {
      toast.error('Erro ao adicionar membro');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Tem a certeza que quer remover este membro?')) return;

    try {
      await teamsApi.removeMember(teamId, userId);
      toast.success('Membro removido');
      fetchTeamData();
    } catch (error) {
      toast.error('Erro ao remover membro');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="space-y-6">
        <div className="empty-state">
          <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
          <h2 className="font-heading text-2xl">Equipa não encontrada</h2>
          <Button asChild className="mt-4">
            <Link to="/teams">Voltar às Equipas</Link>
          </Button>
        </div>
      </div>
    );
  }

  const coaches = members.filter(m => m.team_role === 'treinador');
  const delegates = members.filter(m => m.team_role === 'delegado');
  const players = members.filter(m => m.team_role === 'jogador');

  const feedbackTotal = teamFeedback.length;

  const positiveCount = teamFeedback.filter(f => f.rating === 'positive').length;
  const neutralCount = teamFeedback.filter(f => f.rating === 'neutral').length;
  const negativeCount = teamFeedback.filter(f => f.rating === 'negative').length;
  
  const positivePercent = feedbackTotal > 0
    ? Math.round((positiveCount / feedbackTotal) * 100)
    : 0;
  
  const neutralPercent = feedbackTotal > 0
    ? Math.round((neutralCount / feedbackTotal) * 100)
    : 0;
  
  const negativePercent = feedbackTotal > 0
    ? Math.round((negativeCount / feedbackTotal) * 100)
    : 0;  
  
  const uniqueFeedbackPlayers = Array.from(
  new Map(
    teamFeedback
      .filter(f => f.player?.id)
      .map(f => [f.player.id, f.player])
  ).values()
);

  const uniqueFeedbackEvents = Array.from(
    new Map(
      teamFeedback
        .filter(f => f.event?.id)
        .map(f => [f.event.id, f.event])
    ).values()
  );
  
  const filteredTeamFeedback = teamFeedback.filter((feedback) => {
    const createdAt = feedback.created_at ? new Date(feedback.created_at) : null;
    const now = new Date();
  
    if (feedbackPeriod !== 'all' && createdAt) {
      const diffDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
  
      if (feedbackPeriod === '7' && diffDays > 7) return false;
      if (feedbackPeriod === '30' && diffDays > 30) return false;
      if (feedbackPeriod === '90' && diffDays > 90) return false;
    }
  
    if (feedbackPlayer !== 'all' && feedback.player_id !== feedbackPlayer) {
      return false;
    }
  
    if (feedbackEvent !== 'all' && feedback.event_id !== feedbackEvent) {
      return false;
    }
  
    return true;
  }); 

  const feedbackByMonth = filteredTeamFeedback.reduce((acc, feedback) => {
  const date = feedback.created_at ? new Date(feedback.created_at) : null;
  if (!date) return acc;

  const monthKey = date.toLocaleDateString('pt-PT', {
    month: 'short',
    year: '2-digit',
  });

  if (!acc[monthKey]) {
    acc[monthKey] = {
      total: 0,
      score: 0,
    };
  }

  acc[monthKey].total += 1;

  if (feedback.rating === 'positive') acc[monthKey].score += 100;
  if (feedback.rating === 'neutral') acc[monthKey].score += 50;
  if (feedback.rating === 'negative') acc[monthKey].score += 0;

  return acc;
}, {});

const satisfactionTimeline = Object.entries(feedbackByMonth).map(
  ([month, data]) => ({
    month,
    satisfaction: data.total > 0
      ? Math.round(data.score / data.total)
      : 0,
    total: data.total,
  })
);  

const feedbackByEvent = Object.values(
  filteredTeamFeedback.reduce((acc, feedback) => {
    const eventId = feedback.event_id || 'unknown';
    const eventTitle = feedback.event?.title || 'Evento';

    if (!acc[eventId]) {
      acc[eventId] = {
        eventId,
        eventTitle,
        total: 0,
        score: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
      };
    }

    acc[eventId].total += 1;

    if (feedback.rating === 'positive') {
      acc[eventId].score += 100;
      acc[eventId].positive += 1;
    }

    if (feedback.rating === 'neutral') {
      acc[eventId].score += 50;
      acc[eventId].neutral += 1;
    }

    if (feedback.rating === 'negative') {
      acc[eventId].negative += 1;
    }

    return acc;
  }, {})
).map((event) => ({
  ...event,
  satisfaction: event.total > 0
    ? Math.round(event.score / event.total)
    : 0,
})); 

const feedbackHeatmap = feedbackByEvent
  .map((event) => {
    let level = 'low';
    let label = 'Atenção';

    if (event.satisfaction >= 85) {
      level = 'high';
      label = 'Muito positivo';
    } else if (event.satisfaction >= 60) {
      level = 'medium';
      label = 'Estável';
    }

    return {
      ...event,
      level,
      label,
    };
  })
  .sort((a, b) => b.satisfaction - a.satisfaction);  
const getFeedbackScore = (items) => {
  if (!items.length) return 0;

  const score = items.reduce((acc, feedback) => {
    if (feedback.rating === 'positive') return acc + 100;
    if (feedback.rating === 'neutral') return acc + 50;
    return acc;
  }, 0);

  return Math.round(score / items.length);
};

const nowForTrend = new Date();

const currentPeriodStart = new Date();
currentPeriodStart.setDate(nowForTrend.getDate() - 30);

const previousPeriodStart = new Date();
previousPeriodStart.setDate(nowForTrend.getDate() - 60);

const currentPeriodFeedback = teamFeedback.filter((feedback) => {
  const date = feedback.created_at
    ? new Date(feedback.created_at)
    : null;

  return (
    date &&
    date >= currentPeriodStart &&
    date <= nowForTrend
  );
});

const previousPeriodFeedback = teamFeedback.filter((feedback) => {
  const date = feedback.created_at
    ? new Date(feedback.created_at)
    : null;

  return (
    date &&
    date >= previousPeriodStart &&
    date < currentPeriodStart
  );
});

const currentScore = getFeedbackScore(currentPeriodFeedback);
const previousScore = getFeedbackScore(previousPeriodFeedback);

const trendValue =
  currentPeriodFeedback.length > 0 &&
  previousPeriodFeedback.length > 0
    ? currentScore - previousScore
    : 0;

const trendLabel =
  currentPeriodFeedback.length === 0
    ? 'Sem dados'
    : previousPeriodFeedback.length === 0
      ? 'Sem comparação'
      : trendValue > 0
        ? `+${trendValue}%`
        : `${trendValue}%`;
  
  return (
    <div className="space-y-6" data-testid="team-detail-page">
      {/* Back Button */}
      <Link 
        to="/teams" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        data-testid="back-to-teams"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar às Equipas
      </Link>

        {/* Team Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-heading text-4xl text-foreground tracking-tight">{team.name}</h1>
              <Badge variant="outline">{team.season}</Badge>
            </div>
            <p className="text-muted-foreground">{team.category}</p>
          </div>
          
          {canManageTeam && (
            <Button onClick={() => setAddMemberDialogOpen(true)} data-testid="add-member-btn">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Membro
            </Button>
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="border border-border">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-sm flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Plantel</p>
                <p className="text-2xl font-heading">{players.length} jogadores</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-secondary/10 rounded-sm flex items-center justify-center">
                <Trophy className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Golos</p>
                <p className="text-2xl font-heading font-mono">
                  {stats.reduce((acc, s) => acc + (s.goals || 0), 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-sm flex items-center justify-center">
                <Target className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Assistências</p>
                <p className="text-2xl font-heading font-mono">
                  {stats.reduce((acc, s) => acc + (s.assists || 0), 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="squad" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="squad" data-testid="tab-squad">
              Plantel
            </TabsTrigger>
          
            <TabsTrigger value="stats" data-testid="tab-stats">
              Estatísticas
            </TabsTrigger>
          
            <TabsTrigger value="feedback" data-testid="tab-feedback">
              Feedback
            </TabsTrigger>
          </TabsList>

          {/* Squad Tab */}
          <TabsContent value="squad" className="space-y-6">
            {/* Staff */}
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="font-heading text-xl tracking-tight">Staff Técnico</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...coaches, ...delegates].map(member => (
                    <div 
                      key={member.id}
                      className="flex items-center gap-3 p-3 border border-border rounded-sm"
                      data-testid={`staff-${member.id}`}
                    >
                      <Avatar>
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{member.name}</p>
                        <Badge className={`${getRoleColor(member.team_role)} text-xs`}>
                          {getRoleName(member.team_role)}
                        </Badge>
                      </div>
                      {canManageTeam && member.id !== user?.id && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                  ))}
                  {coaches.length === 0 && delegates.length === 0 && (
                    <p className="text-muted-foreground col-span-full">Sem staff técnico</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Players */}
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="font-heading text-xl tracking-tight">Jogadores</CardTitle>
              </CardHeader>
              <CardContent>
                {players.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {players.map(player => (
                      <div 
                        key={player.id}
                        className="flex items-center gap-3 p-3 border border-border rounded-sm card-hover"
                        data-testid={`player-${player.id}`}
                      >
                        <Link to={`/players/${player.id}`}>
                          <Avatar className="cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                            <AvatarImage src={player.avatar_url} />
                            <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                              {getInitials(player.name)}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link 
                            to={`/players/${player.id}`}
                            className="font-semibold truncate hover:text-primary transition-colors block"
                          >
                            {player.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{player.email}</p>
                        </div>
                        {canManageTeam && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveMember(player.id)}
                          >
                            Remover
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Sem jogadores registados</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Stats Tab */}
          <TabsContent value="stats">
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="font-heading text-xl tracking-tight">Estatísticas da Época</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table className="stats-table">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Jogador</TableHead>
                          <TableHead className="text-center">J</TableHead>
                          <TableHead className="text-center">G</TableHead>
                          <TableHead className="text-center">A</TableHead>
                          <TableHead className="text-center">AM</TableHead>
                          <TableHead className="text-center">AZ</TableHead>
                          <TableHead className="text-center">V</TableHead>
                          <TableHead className="text-center">D</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.map(stat => (
                          <TableRow key={stat.player_id} data-testid={`stat-row-${stat.player_id}`}>
                            <TableCell className="font-medium">
                              <Link 
                                to={`/players/${stat.player_id}`}
                                className="flex items-center gap-2 hover:text-primary transition-colors"
                              >
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(stat.player?.name)}
                                  </AvatarFallback>
                                </Avatar>
                                {stat.player?.name || 'Jogador'}
                              </Link>
                            </TableCell>
                            <TableCell className="text-center font-mono">{stat.games_played || 0}</TableCell>
                            <TableCell className="text-center font-mono text-secondary font-semibold">{stat.goals || 0}</TableCell>
                            <TableCell className="text-center font-mono">{stat.assists || 0}</TableCell>
                            <TableCell className="text-center font-mono text-amber-600">{stat.yellow_cards || 0}</TableCell>
                            <TableCell className="text-center font-mono text-blue-600">{stat.blue_cards || 0}</TableCell>
                            <TableCell className="text-center font-mono text-destructive">{stat.red_cards || 0}</TableCell>
                            <TableCell className="text-center font-mono">{stat.saves || 0}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Sem estatísticas registadas esta época
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-4">
                  J = Jogos | G = Golos | A = Assistências | AM = Amarelos | AZ = Azuis | V = Vermelhos | D = Defesas
                </p>
              </CardContent>
            </Card>
          </TabsContent>

      {/* Feedback Tab */}
<TabsContent value="feedback">
  <div className="space-y-6">
    <Tabs defaultValue="analytics" className="space-y-6">
      <TabsList className="bg-muted">
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="comments">Comentários</TabsTrigger>
      </TabsList>

      <TabsContent value="analytics" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">😊 Satisfação Global</p>
              <p className="text-3xl font-bold mt-2">{positivePercent}%</p>
              <p className="text-xs text-muted-foreground mt-1">baseado em feedback positivo</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">💬 Feedbacks Recebidos</p>
              <p className="text-3xl font-bold mt-2">{feedbackTotal}</p>
              <p className="text-xs text-muted-foreground mt-1">respostas recebidas</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">⚠️ Feedbacks Negativos</p>
              <p className="text-3xl font-bold mt-2">{negativeCount}</p>
              <p className="text-xs text-muted-foreground mt-1">{negativePercent}% do total</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">📈 Tendência</p>
              <p className="text-3xl font-bold mt-2">{trendLabel}</p>
              <p className="text-xs text-muted-foreground mt-1">
                últimos 30 dias vs 30 dias anteriores
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Select value={feedbackPeriod} onValueChange={setFeedbackPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>

              <Select value={feedbackPlayer} onValueChange={setFeedbackPlayer}>
                <SelectTrigger>
                  <SelectValue placeholder="Atleta" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">Todos os atletas</SelectItem>
                  {uniqueFeedbackPlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={feedbackEvent} onValueChange={setFeedbackEvent}>
                <SelectTrigger>
                  <SelectValue placeholder="Evento" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">Todos os eventos</SelectItem>
                  {uniqueFeedbackEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolução da Satisfação</CardTitle>
          </CardHeader>
          <CardContent>
            {satisfactionTimeline.length > 0 ? (
              <div className="space-y-4">
                {satisfactionTimeline.map((item) => (
                  <div key={item.month} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.month}</span>
                      <span className="text-muted-foreground">
                        {item.satisfaction}% · {item.total} feedback(s)
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${item.satisfaction}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                Ainda não existem dados suficientes para apresentar a evolução da satisfação.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feedback por Evento</CardTitle>
          </CardHeader>
          <CardContent>
            {feedbackByEvent.length > 0 ? (
              <div className="space-y-3">
                {feedbackByEvent.map((event) => (
                  <div key={event.eventId} className="rounded-2xl border border-border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold">{event.eventTitle}</p>
                        <p className="text-xs text-muted-foreground">{event.total} feedback(s)</p>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold">{event.satisfaction}%</p>
                        <p className="text-xs text-muted-foreground">
                          🙂 {event.positive} · 😐 {event.neutral} · 🙁 {event.negative}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${event.satisfaction}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                Ainda não existem dados suficientes para apresentar feedback por evento.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Heatmap dos Treinos
            </CardTitle>
          </CardHeader>

  <CardContent>
    {feedbackHeatmap.length > 0 ? (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {feedbackHeatmap.map((event) => (
          <div
            key={event.eventId}
            className={`rounded-2xl border p-4 ${
              event.level === 'high'
                ? 'border-emerald-200 bg-emerald-50'
                : event.level === 'medium'
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">
                  {event.eventTitle}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {event.total} feedback(s)
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold text-slate-950">
                  {event.satisfaction}%
                </p>

                <p className="text-xs text-slate-500">
                  {event.label}
                </p>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">
              <div
                className={`h-full rounded-full ${
                  event.level === 'high'
                    ? 'bg-emerald-500'
                    : event.level === 'medium'
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${event.satisfaction}%` }}
              />
            </div>

            <p className="mt-3 text-xs text-slate-500">
              🙂 {event.positive} positivo · 😐 {event.neutral} neutro · 🙁 {event.negative} negativo
            </p>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-muted-foreground">
        Ainda não existem dados suficientes para apresentar o heatmap dos treinos.
      </p>
    )}
  </CardContent>
</Card>

</TabsContent>

<TabsContent value="comments" className="space-y-6">
  <Card>        
          <CardHeader>
            <CardTitle>Feedback dos Atletas</CardTitle>
          </CardHeader>

          <CardContent>
            {filteredTeamFeedback.length > 0 ? (
              <div className="space-y-3">
                {filteredTeamFeedback.slice(0, 10).map((feedback) => (
                  <div key={feedback.id} className="rounded-2xl border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">
                          {user?.role === 'admin'
                            ? feedback.player?.name || 'Atleta'
                            : 'Atleta anónimo'}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {feedback.event?.title || 'Evento'}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {feedback.created_at
                            ? new Date(feedback.created_at).toLocaleDateString()
                            : ''}
                        </p>
                      </div>

                      <Badge variant="outline">
                        {feedback.rating === 'positive' && '🙂 Gostei'}
                        {feedback.rating === 'neutral' && '😐 Foi normal'}
                        {feedback.rating === 'negative' && '🙁 Não gostei'}
                      </Badge>
                    </div>

                    {feedback.comment && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        "{feedback.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                Ainda não existem feedbacks registados para esta equipa.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</TabsContent>

</Tabs>
        
        {/* Add Member Dialog */}
        <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl tracking-tight">Adicionar Membro</DialogTitle>
              <DialogDescription>
                Adicione um utilizador existente à equipa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Utilizador</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger data-testid="select-user">
                    <SelectValue placeholder="Selecione um utilizador" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {availableUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Função na Equipa</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger data-testid="select-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="jogador">Jogador</SelectItem>
                    <SelectItem value="treinador">Treinador</SelectItem>
                    <SelectItem value="delegado">Delegado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddMemberDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddMember} disabled={adding || !selectedUserId} data-testid="confirm-add-member">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}
