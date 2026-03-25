import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
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
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Trophy,
  AlertTriangle,
  Users,
  Mail,
  Phone,
  BarChart3,
  Shield,
  ChevronDown
} from 'lucide-react';
import { getInitials, getRoleName, getRoleColor } from '../lib/utils';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function PlayerProfile() {
  const { playerId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  const [pendingRole, setPendingRole] = useState(null);
  const [changingRole, setChangingRole] = useState(false);

  const ROLES = [
    { value: 'admin', label: 'Administrador', icon: '👑' },
    { value: 'treinador', label: 'Treinador', icon: '📋' },
    { value: 'treinador_adjunto', label: 'Treinador Adjunto', icon: '📋' },
    { value: 'delegado', label: 'Delegado', icon: '📝' },
    { value: 'jogador', label: 'Jogador', icon: '🏒' },
    { value: 'responsavel', label: 'Responsável', icon: '👨‍👩‍👧' },
  ];

  useEffect(() => {
    fetchPlayerData();
  }, [playerId]);

  const fetchPlayerData = async () => {
    try {
      const response = await axios.get(`${API_URL}/player-stats/${playerId}/consolidated`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setData(response.data);
    } catch (err) {
      console.error('Error fetching player data:', err);
      setError('Erro ao carregar dados do jogador');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (newRole) => {
    setPendingRole(newRole);
    setShowRoleConfirm(true);
  };

  const confirmRoleChange = async () => {
    if (!pendingRole) return;
    
    setChangingRole(true);
    try {
      await usersApi.updateRole(playerId, pendingRole);
      toast.success(`Permissão alterada para ${getRoleName(pendingRole)}`);
      // Update local data
      setData(prev => ({
        ...prev,
        player: { ...prev.player, role: pendingRole }
      }));
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error(error.response?.data?.detail || 'Erro ao alterar permissão');
    } finally {
      setChangingRole(false);
      setShowRoleConfirm(false);
      setPendingRole(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="empty-state">
          <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
          <h2 className="font-heading text-2xl">{error || 'Jogador não encontrado'}</h2>
          <Button asChild className="mt-4">
            <Link to="/teams">Voltar às Equipas</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { player, consolidated, per_team_stats, teams } = data;

  return (
    <div className="max-w-5xl mx-auto space-y-6" data-testid="player-profile-page">
      {/* Back Button */}
        <Link 
          to="/teams" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          data-testid="back-link"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        {/* Player Header */}
        <Card className="border border-border mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="w-24 h-24 border-4 border-primary">
                <AvatarImage src={player?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-heading">
                  {getInitials(player?.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h1 className="font-heading text-4xl text-foreground tracking-wide mb-2">
                  {player?.name?.toUpperCase()}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {/* Role Badge with Admin dropdown */}
                  {user?.role === 'admin' && player?.id !== user?.id ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={`${getRoleColor(player?.role)} gap-1`}
                          data-testid="role-dropdown-trigger"
                        >
                          <Shield className="w-3 h-3" />
                          {getRoleName(player?.role)}
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Alterar Permissão</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {ROLES.map(role => (
                          <DropdownMenuItem
                            key={role.value}
                            onClick={() => handleRoleChange(role.value)}
                            className={player?.role === role.value ? 'bg-primary/10' : ''}
                            data-testid={`role-option-${role.value}`}
                          >
                            <span className="mr-2">{role.icon}</span>
                            {role.label}
                            {player?.role === role.value && (
                              <Badge variant="secondary" className="ml-auto text-xs">Atual</Badge>
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Badge className={`${getRoleColor(player?.role)} text-sm`}>
                      {getRoleName(player?.role)}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-sm">
                    <Users className="w-3 h-3 mr-1" />
                    {teams?.length || 0} Equipa{teams?.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {player?.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-4 h-4" />
                      {player.email}
                    </span>
                  )}
                  {player?.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-4 h-4" />
                      {player.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consolidated Stats */}
        <div className="mb-8">
          <h2 className="font-heading text-2xl tracking-wide mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            ESTATÍSTICAS CONSOLIDADAS
          </h2>
          <p className="text-muted-foreground mb-6">
            Totais de todas as equipas em que o atleta participa
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
            <Card className="border border-border">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Jogos</p>
                <p className="text-3xl font-heading font-mono text-foreground">{consolidated?.games_played || 0}</p>
              </CardContent>
            </Card>
            <Card className="border border-border bg-secondary/5">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Golos</p>
                <p className="text-3xl font-heading font-mono text-secondary">{consolidated?.goals || 0}</p>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Assist.</p>
                <p className="text-3xl font-heading font-mono text-foreground">{consolidated?.assists || 0}</p>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Amarelos</p>
                <p className="text-3xl font-heading font-mono text-amber-600">{consolidated?.yellow_cards || 0}</p>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Azuis</p>
                <p className="text-3xl font-heading font-mono text-blue-600">{consolidated?.blue_cards || 0}</p>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Verm.</p>
                <p className="text-3xl font-heading font-mono text-destructive">{consolidated?.red_cards || 0}</p>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Defesas</p>
                <p className="text-3xl font-heading font-mono text-foreground">{consolidated?.saves || 0}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Per Team Stats */}
        <Tabs defaultValue="per-team" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="per-team" data-testid="tab-per-team">Por Equipa</TabsTrigger>
            <TabsTrigger value="teams" data-testid="tab-teams">Equipas</TabsTrigger>
          </TabsList>

          <TabsContent value="per-team">
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="font-heading text-xl tracking-wide">
                  ESTATÍSTICAS POR EQUIPA
                </CardTitle>
              </CardHeader>
              <CardContent>
                {per_team_stats && per_team_stats.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table className="stats-table">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Equipa</TableHead>
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
                        {per_team_stats.map((stat, index) => (
                          <TableRow key={stat.team_id || index} data-testid={`team-stat-row-${index}`}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-primary/10 rounded-sm flex items-center justify-center">
                                  <Users className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-semibold">{stat.team?.name || 'Equipa'}</p>
                                  <p className="text-xs text-muted-foreground">{stat.team?.category}</p>
                                </div>
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
                        {/* Totals Row */}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell>
                            <span className="font-heading tracking-wide">TOTAL</span>
                          </TableCell>
                          <TableCell className="text-center font-mono">{consolidated?.games_played || 0}</TableCell>
                          <TableCell className="text-center font-mono text-secondary">{consolidated?.goals || 0}</TableCell>
                          <TableCell className="text-center font-mono">{consolidated?.assists || 0}</TableCell>
                          <TableCell className="text-center font-mono text-amber-600">{consolidated?.yellow_cards || 0}</TableCell>
                          <TableCell className="text-center font-mono text-blue-600">{consolidated?.blue_cards || 0}</TableCell>
                          <TableCell className="text-center font-mono text-destructive">{consolidated?.red_cards || 0}</TableCell>
                          <TableCell className="text-center font-mono">{consolidated?.saves || 0}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Sem estatísticas registadas</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      As estatísticas serão adicionadas após os jogos
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-4">
                  J = Jogos | G = Golos | A = Assistências | AM = Amarelos | AZ = Azuis | V = Vermelhos | D = Defesas
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams">
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="font-heading text-xl tracking-wide">
                  EQUIPAS DO ATLETA
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teams && teams.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {teams.map((team, index) => (
                      <Link 
                        key={team.id}
                        to={`/teams/${team.id}`}
                        className="block"
                        data-testid={`team-link-${team.id}`}
                      >
                        <div className="flex items-center gap-4 p-4 border border-border rounded-sm card-hover">
                          <div className="w-12 h-12 bg-primary/10 rounded-sm flex items-center justify-center">
                            <Users className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{team.name}</h4>
                            <p className="text-sm text-muted-foreground">{team.category}</p>
                          </div>
                          <Badge variant="outline">{team.season}</Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Não pertence a nenhuma equipa</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Role Change Confirmation Dialog */}
        <AlertDialog open={showRoleConfirm} onOpenChange={setShowRoleConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Alterar Permissão</AlertDialogTitle>
              <AlertDialogDescription>
                Tens a certeza que queres alterar a permissão de <strong>{player?.name}</strong> para{' '}
                <strong>{ROLES.find(r => r.value === pendingRole)?.label}</strong>?
                {pendingRole === 'admin' && (
                  <span className="block mt-2 text-amber-600">
                    ⚠️ Esta ação dará acesso total de administrador a este utilizador.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={changingRole}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmRoleChange}
                disabled={changingRole}
                data-testid="confirm-role-change-btn"
              >
                {changingRole ? 'A alterar...' : 'Confirmar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
