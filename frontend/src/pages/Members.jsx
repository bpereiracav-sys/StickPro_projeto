import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { usePermissions } from '../context/PermissionsContext';
import { teamsApi, usersApi, clubApi, membersApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { 
  Users, 
  Plus, 
  Loader2, 
  UserPlus, 
  ChevronRight, 
  Upload, 
  FileSpreadsheet,
  UserMinus,
  MoreVertical,
  Download,
  Mail,
  Phone,
  Building2
} from 'lucide-react';
import { getInitials, getRoleName, getRoleColor } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Members() {
  const { token } = useAuth();
  const { selectedTeam, teams: contextTeams, isAllTeamsSelected } = useTeam();
  const { canManageTeam, canImportData, canAccessTeam, isAdmin } = usePermissions();
  const [teams, setTeams] = useState([]);
  const [club, setClub] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [members, setMembers] = useState([]);
  const [clubMembers, setClubMembers] = useState([]); // All members in club
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [addToTeamDialogOpen, setAddToTeamDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('jogador');
  const [importResults, setImportResults] = useState(null);
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState([]);
  const fileInputRef = useRef(null);

  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    role: 'jogador',
    jersey_number: '',
    position: '',
    phone: ''
  });

  // Fetch club on mount
  useEffect(() => {
    fetchClub();
  }, []);

  const fetchClub = async () => {
    try {
      const response = await clubApi.getAll();
      if (response.data.length > 0) {
        setClub(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching club:', error);
    }
  };

  // Set selected team from context
  useEffect(() => {
    if (selectedTeam) {
      setSelectedTeamId(selectedTeam.id);
    } else if (contextTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(contextTeams[0].id);
    }
    setTeams(contextTeams);
  }, [selectedTeam, contextTeams]);

  // Fetch members when team changes or when viewing club
  useEffect(() => {
    if (isAllTeamsSelected && club) {
      fetchClubMembers();
    } else if (selectedTeamId) {
      fetchTeamMembers();
    }
  }, [selectedTeamId, isAllTeamsSelected, club]);

  // Initial load
  useEffect(() => {
    if (contextTeams.length > 0) {
      setLoading(false);
    }
  }, [contextTeams]);

  const fetchClubMembers = async () => {
    if (!club) return;
    try {
      const response = await clubApi.getMembers(club.id);
      setClubMembers(response.data);
      setMembers(response.data);
    } catch (error) {
      console.error('Error fetching club members:', error);
      // Fallback: get all users
      const usersRes = await usersApi.getAll();
      setMembers(usersRes.data.filter(u => u.role !== 'admin'));
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await teamsApi.getMembers(selectedTeamId);
      setMembers(response.data);

      if (canManageTeam) {
        const usersRes = await usersApi.getAll();
        setAllUsers(usersRes.data);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleAddExistingMember = async () => {
    if (!selectedUserId) return;
    setAdding(true);

    try {
      await teamsApi.addMember(selectedTeamId, { user_id: selectedUserId, role: selectedRole });
      toast.success('Membro adicionado à equipa!');
      setAddDialogOpen(false);
      setSelectedUserId('');
      fetchTeamMembers();
    } catch (error) {
      toast.error('Erro ao adicionar membro');
    } finally {
      setAdding(false);
    }
  };

  const handleCreateMember = async () => {
    if (!newMember.name || !newMember.email) {
      toast.error('Preencha nome e email');
      return;
    }
    setAdding(true);

    try {
      // Create member at club level
      const response = await membersApi.create({
        ...newMember,
        club_id: club?.id,
        team_id: isAllTeamsSelected ? null : selectedTeamId // Only add to team if a specific team is selected
      });

      toast.success(`Membro criado! Password temporária: ${response.data.temp_password}`);
      setCreateDialogOpen(false);
      setNewMember({ name: '', email: '', role: 'jogador', jersey_number: '', position: '', phone: '' });
      
      if (isAllTeamsSelected) {
        fetchClubMembers();
      } else {
        fetchTeamMembers();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar membro');
    } finally {
      setAdding(false);
    }
  };

  const handleAddMembersToTeam = async () => {
    if (selectedMembersToAdd.length === 0 || !selectedTeamId) {
      toast.error('Selecione membros e uma equipa');
      return;
    }
    setAdding(true);

    try {
      for (const memberId of selectedMembersToAdd) {
        await membersApi.addToTeam(memberId, selectedTeamId);
      }
      toast.success(`${selectedMembersToAdd.length} membro(s) adicionado(s) à equipa!`);
      setAddToTeamDialogOpen(false);
      setSelectedMembersToAdd([]);
      fetchTeamMembers();
    } catch (error) {
      toast.error('Erro ao adicionar membros à equipa');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMemberFromTeam = async () => {
    if (!selectedMember || !selectedTeamId) return;
    setAdding(true);

    try {
      await membersApi.removeFromTeam(selectedMember.id, selectedTeamId);
      toast.success('Membro removido da equipa');
      setRemoveDialogOpen(false);
      setSelectedMember(null);
      fetchTeamMembers();
    } catch (error) {
      toast.error('Erro ao remover membro');
    } finally {
      setAdding(false);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResults(null);

    try {
      // Import to club level, optionally add to team
      const response = await membersApi.import(
        file, 
        club?.id, 
        isAllTeamsSelected ? null : selectedTeamId
      );

      const results = response.data;
      setImportResults(results);
      
      if (results.success > 0) {
        toast.success(`${results.success} membros importados!`);
        if (isAllTeamsSelected) {
          fetchClubMembers();
        } else {
          fetchTeamMembers();
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao importar');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    try {
      await teamsApi.removeMember(selectedTeamId, selectedMember.id);
      toast.success('Membro removido da equipa (estatísticas preservadas)');
      setRemoveDialogOpen(false);
      setSelectedMember(null);
      fetchTeamMembers();
    } catch (error) {
      toast.error('Erro ao remover membro');
    }
  };

  const downloadTemplate = () => {
    const csvContent = "Nome,Apelido,Data de Nascimento,Email,Função,Número,Posição,Telefone\nJoão,Silva,2010-05-15,joao@exemplo.com,jogador,10,JC,912345678\nMaria,Santos,2009-03-22,maria@exemplo.com,jogador,1,GR,923456789\nPedro,Costa,2011-08-10,pedro@exemplo.com,jogador,7,AD,934567890";
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_membros.csv';
    link.click();
  };

  const availableUsers = allUsers.filter(u => !members.find(m => m.id === u.id));
  const currentTeam = teams.find(t => t.id === selectedTeamId);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
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
          <p className="text-muted-foreground mt-1">Gestão de jogadores e staff</p>
        </div>

        {canManageTeam && (
          <div className="flex flex-wrap gap-2">
            {canImportData && (
              <Button variant="outline" onClick={() => setImportDialogOpen(true)} data-testid="import-members-btn">
                <Upload className="w-4 h-4 mr-2" />
                Importar Excel
              </Button>
            )}
            {!isAllTeamsSelected && (
              <Button variant="outline" onClick={() => setAddDialogOpen(true)} data-testid="add-existing-btn">
                <UserPlus className="w-4 h-4 mr-2" />
                Adicionar do Clube
              </Button>
            )}
            <Button onClick={() => setCreateDialogOpen(true)} data-testid="create-member-btn">
              <Plus className="w-4 h-4 mr-2" />
              Novo Membro
            </Button>
          </div>
        )}
      </div>

      {/* Info Banner when viewing Club */}
      {isAllTeamsSelected && (
        <Card className="border border-primary/30 bg-primary/5">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-sm">A visualizar todos os membros do Clube</p>
              <p className="text-xs text-muted-foreground">Crie membros aqui e depois adicione-os às equipas</p>
            </div>
          </CardContent>
        </Card>
      )}

      {teams.length === 0 && !isAllTeamsSelected ? (
        <Card className="border border-border">
          <CardContent className="py-16 text-center">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading text-xl mb-2">Sem Equipas</h3>
            <p className="text-muted-foreground mb-4">Crie uma equipa primeiro</p>
            <Button asChild>
              <Link to="/teams">Criar Equipa</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Team Selector - only show when viewing specific team */}
          {!isAllTeamsSelected && (
            <Card className="border border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Label className="whitespace-nowrap">Equipa:</Label>
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger className="max-w-xs" data-testid="team-selector">
                      <SelectValue placeholder="Selecione uma equipa" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="secondary">{members.length} membros</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Members List */}
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="font-heading text-xl tracking-wide flex items-center gap-2">
                {isAllTeamsSelected ? (
                  <>
                    <Building2 className="w-5 h-5 text-primary" />
                    Membros do Clube
                  </>
                ) : (
                  currentTeam?.name || 'Membros'
                )}
              </CardTitle>
              <CardDescription>
                {isAllTeamsSelected 
                  ? 'Todos os membros registados no clube' 
                  : `Membros associados a esta equipa`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {isAllTeamsSelected ? 'Sem membros no clube' : 'Sem membros nesta equipa'}
                  </p>
                  {canManageTeam && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Use os botões acima para adicionar membros
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map(member => (
                    <div 
                      key={member.id}
                      className="flex items-center justify-between p-3 border border-border rounded-sm hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback className={`${getRoleColor(member.team_role || member.role)} text-white`}>
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Link 
                            to={`/players/${member.id}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {member.name}
                          </Link>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {getRoleName(member.team_role || member.role)}
                            </Badge>
                            {member.profile?.sports_info?.jersey_number && (
                              <span>#{member.profile.sports_info.jersey_number}</span>
                            )}
                            {member.profile?.sports_info?.position && (
                              <span>{member.profile.sports_info.position}</span>
                            )}
                            {/* Show teams when viewing club level */}
                            {isAllTeamsSelected && member.team_ids?.length > 0 && (
                              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                {member.team_ids.length} equipa(s)
                              </span>
                            )}
                            {isAllTeamsSelected && (!member.team_ids || member.team_ids.length === 0) && (
                              <span className="text-xs text-amber-600">Sem equipa</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {member.email && (
                          <a href={`mailto:${member.email}`} className="text-muted-foreground hover:text-primary">
                            <Mail className="w-4 h-4" />
                          </a>
                        )}
                        {member.profile?.identity?.phone && (
                          <a href={`tel:${member.profile.identity.phone}`} className="text-muted-foreground hover:text-primary">
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        
                        {canManageTeam && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white">
                              <DropdownMenuItem asChild>
                                <Link to={`/players/${member.id}`}>
                                  <ChevronRight className="w-4 h-4 mr-2" />
                                  Ver Perfil
                                </Link>
                              </DropdownMenuItem>
                              {isAllTeamsSelected && teams.length > 0 && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => { 
                                      setSelectedMember(member); 
                                      setSelectedMembersToAdd([member.id]);
                                      setAddToTeamDialogOpen(true); 
                                    }}
                                  >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Adicionar a Equipa
                                  </DropdownMenuItem>
                                </>
                              )}
                              {!isAllTeamsSelected && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => { setSelectedMember(member); setRemoveDialogOpen(true); }}
                                  >
                                    <UserMinus className="w-4 h-4 mr-2" />
                                    Remover da Equipa
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Existing Member Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl tracking-wide">ADICIONAR MEMBRO</DialogTitle>
            <DialogDescription>Adicionar utilizador existente à equipa</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Utilizador</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger data-testid="select-user">
                  <SelectValue placeholder="Selecione um utilizador" />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-60">
                  {availableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.name} ({user.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Função na Equipa</Label>
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
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddExistingMember} disabled={adding || !selectedUserId}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Member Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl tracking-wide">NOVO MEMBRO</DialogTitle>
            <DialogDescription>Criar novo membro e adicionar à equipa</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  placeholder="Nome completo"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  data-testid="new-member-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  data-testid="new-member-email"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={newMember.role} onValueChange={(v) => setNewMember({ ...newMember, role: v })}>
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
              <div className="space-y-2">
                <Label>Número</Label>
                <Input
                  placeholder="10"
                  value={newMember.jersey_number}
                  onChange={(e) => setNewMember({ ...newMember, jersey_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Posição</Label>
                <Select value={newMember.position} onValueChange={(v) => setNewMember({ ...newMember, position: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="GR">Guarda-Redes</SelectItem>
                    <SelectItem value="JC">Jogador de Campo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                placeholder="912345678"
                value={newMember.phone}
                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateMember} disabled={adding}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Membro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl tracking-wide">IMPORTAR MEMBROS</DialogTitle>
            <DialogDescription>Importar membros a partir de ficheiro Excel ou CSV</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Arraste um ficheiro .xlsx ou .csv ou clique para selecionar
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportFile}
                className="hidden"
                id="file-upload"
              />
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} disabled={importing}>
                  {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  Selecionar Ficheiro
                </Button>
              </div>
            </div>

            {importResults && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default">{importResults.success} importados</Badge>
                  {importResults.errors.length > 0 && (
                    <Badge variant="destructive">{importResults.errors.length} erros</Badge>
                  )}
                </div>
                {importResults.created.length > 0 && (
                  <div className="max-h-40 overflow-y-auto text-sm border rounded p-2">
                    <p className="font-medium mb-1">Passwords temporárias:</p>
                    {importResults.created.map((u, i) => (
                      <p key={i} className="text-muted-foreground">{u.name}: <code className="bg-muted px-1">{u.temp_password}</code></p>
                    ))}
                  </div>
                )}
                {importResults.errors.length > 0 && (
                  <div className="max-h-40 overflow-y-auto text-sm text-destructive border border-destructive/20 rounded p-2">
                    {importResults.errors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Colunas esperadas:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block">Nome, Apelido, Data de Nascimento, Email, Função</code>
              <p className="text-xs mt-2 text-muted-foreground">
                Colunas opcionais: Número, Posição, Telefone
              </p>
              <p className="text-xs mt-1">
                <strong>Funções válidas:</strong> jogador, treinador, treinador adjunto, delegado, responsável
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportResults(null); }}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da Equipa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que quer remover <strong>{selectedMember?.name}</strong> desta equipa?
              <br /><br />
              As estatísticas do jogador serão preservadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMemberFromTeam} className="bg-destructive text-white hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add to Team Dialog */}
      <Dialog open={addToTeamDialogOpen} onOpenChange={setAddToTeamDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl tracking-wide">ADICIONAR A EQUIPA</DialogTitle>
            <DialogDescription>Selecione a equipa para adicionar o membro</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Equipa</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma equipa" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedMember && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedMember.name}</p>
                <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToTeamDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddMembersToTeam} disabled={adding || !selectedTeamId}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
