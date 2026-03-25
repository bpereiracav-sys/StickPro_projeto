import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { teamsApi, usersApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Skeleton } from '../components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { Users, Plus, Loader2, UserPlus, ChevronRight } from 'lucide-react';
import { getInitials, getRoleName, getRoleColor } from '../lib/utils';

export default function Members() {
  const { canManageTeam } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [members, setMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('jogador');

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      fetchMembers();
    }
  }, [selectedTeamId]);

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

  const fetchMembers = async () => {
    try {
      const response = await teamsApi.getMembers(selectedTeamId);
      setMembers(response.data);

      if (canManageTeam) {
        const usersRes = await usersApi.getAll();
        const memberIds = response.data.map(m => m.id);
        setAvailableUsers(usersRes.data.filter(u => !memberIds.includes(u.id)));
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    setAdding(true);

    try {
      await teamsApi.addMember(selectedTeamId, { user_id: selectedUserId, role: selectedRole });
      toast.success('Membro adicionado!');
      setAddDialogOpen(false);
      setSelectedUserId('');
      fetchMembers();
    } catch (error) {
      toast.error('Erro ao adicionar membro');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Tem a certeza que quer remover este membro?')) return;

    try {
      await teamsApi.removeMember(selectedTeamId, userId);
      toast.success('Membro removido');
      fetchMembers();
    } catch (error) {
      toast.error('Erro ao remover membro');
    }
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const coaches = members.filter(m => m.team_role === 'treinador');
  const delegates = members.filter(m => m.team_role === 'delegado');
  const players = members.filter(m => m.team_role === 'jogador');

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="members-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl text-foreground tracking-wide flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            MEMBROS
          </h1>
          <p className="text-muted-foreground mt-1">Plantel e staff técnico</p>
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

          {canManageTeam && (
            <Button onClick={() => setAddDialogOpen(true)} data-testid="add-member-btn">
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border border-border">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-heading text-primary">{coaches.length}</p>
            <p className="text-xs text-muted-foreground uppercase">Treinadores</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-heading text-secondary">{delegates.length}</p>
            <p className="text-xs text-muted-foreground uppercase">Delegados</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-heading">{players.length}</p>
            <p className="text-xs text-muted-foreground uppercase">Jogadores</p>
          </CardContent>
        </Card>
      </div>

      {/* Staff */}
      {(coaches.length > 0 || delegates.length > 0) && (
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
                >
                  <Link to={`/players/${member.id}`}>
                    <Avatar className="cursor-pointer hover:ring-2 hover:ring-primary">
                      <AvatarImage src={member.avatar_url} />
                      <AvatarFallback className="bg-primary text-white text-sm">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/players/${member.id}`} className="font-semibold hover:text-primary truncate block">
                      {member.name}
                    </Link>
                    <Badge className={`${getRoleColor(member.team_role)} text-xs`}>
                      {getRoleName(member.team_role)}
                    </Badge>
                  </div>
                  {canManageTeam && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Players */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="font-heading text-xl tracking-wide">JOGADORES</CardTitle>
        </CardHeader>
        <CardContent>
          {players.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map(player => (
                <Link 
                  key={player.id}
                  to={`/players/${player.id}`}
                  className="flex items-center gap-3 p-3 border border-border rounded-sm card-hover"
                >
                  <Avatar>
                    <AvatarImage src={player.avatar_url} />
                    <AvatarFallback className="bg-secondary text-white text-sm">
                      {getInitials(player.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{player.name}</p>
                    <p className="text-xs text-muted-foreground">{player.email}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Sem jogadores registados</p>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl tracking-wide">ADICIONAR MEMBRO</DialogTitle>
            <DialogDescription>
              Adicionar um utilizador existente à equipa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Utilizador</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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
              <label className="text-sm font-medium">Função</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
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
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddMember} disabled={adding || !selectedUserId}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
