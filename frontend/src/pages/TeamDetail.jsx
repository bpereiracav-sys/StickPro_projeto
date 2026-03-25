import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { teamsApi, usersApi } from '../services/api';
import { Layout } from '../components/layout/Layout';
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

      // Fetch available users for adding
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
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <Skeleton className="h-64 mb-8" />
          <Skeleton className="h-96" />
        </div>
      </Layout>
    );
  }

  if (!team) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="empty-state">
            <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
            <h2 className="font-heading text-2xl">Equipa não encontrada</h2>
            <Button asChild className="mt-4">
              <Link to="/teams">Voltar às Equipas</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const coaches = members.filter(m => m.team_role === 'treinador');
  const delegates = members.filter(m => m.team_role === 'delegado');
  const players = members.filter(m => m.team_role === 'jogador');

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="team-detail-page">
        {/* Back Button */}
        <Link 
          to="/teams" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          data-testid="back-to-teams"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar às Equipas
        </Link>

        {/* Team Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-heading text-4xl text-foreground tracking-wide">{team.name}</h1>
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
            <TabsTrigger value="squad" data-testid="tab-squad">Plantel</TabsTrigger>
            <TabsTrigger value="stats" data-testid="tab-stats">Estatísticas</TabsTrigger>
          </TabsList>

          {/* Squad Tab */}
          <TabsContent value="squad" className="space-y-6">
            {/* Staff */}
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="font-heading text-xl tracking-wide">STAFF TÉCNICO</CardTitle>
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
                <CardTitle className="font-heading text-xl tracking-wide">JOGADORES</CardTitle>
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
                        <Avatar>
                          <AvatarImage src={player.avatar_url} />
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                            {getInitials(player.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{player.name}</p>
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
                <CardTitle className="font-heading text-xl tracking-wide">ESTATÍSTICAS DA ÉPOCA</CardTitle>
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
                              <div className="flex items-center gap-2">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(stat.player?.name)}
                                  </AvatarFallback>
                                </Avatar>
                                {stat.player?.name || 'Jogador'}
                              </div>
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
        </Tabs>

        {/* Add Member Dialog */}
        <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl tracking-wide">ADICIONAR MEMBRO</DialogTitle>
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
    </Layout>
  );
}
