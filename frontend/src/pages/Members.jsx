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
  Building2,
  Search,
  ChevronLeft,
  Archive,
  ArchiveRestore,
  Bell,
  BarChart3,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  Shield
} from 'lucide-react';
import { getInitials, getRoleName, getRoleColor } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Country flags mapping (ISO 3166-1 alpha-2)
const FLAGS = {
  PT: '🇵🇹', ES: '🇪🇸', FR: '🇫🇷', BR: '🇧🇷', AR: '🇦🇷', 
  IT: '🇮🇹', DE: '🇩🇪', GB: '🇬🇧', US: '🇺🇸', AO: '🇦🇴',
  MZ: '🇲🇿', CV: '🇨🇻', GW: '🇬🇼', ST: '🇸🇹', NL: '🇳🇱',
  BE: '🇧🇪', CH: '🇨🇭', LU: '🇱🇺', MA: '🇲🇦', RO: '🇷🇴'
};

export default function Members() {
  const { token, user } = useAuth();
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
  
  // New state for pagination, search and archive
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedMembers, setArchivedMembers] = useState([]);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [memberDetailDialogOpen, setMemberDetailDialogOpen] = useState(false);
  const [memberDetail, setMemberDetail] = useState(null);
  const [exporting, setExporting] = useState(false);
  const perPage = 20;

  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    role: 'jogador',
    jersey_number: '',
    position: '',
    phone: '',
    nationality: '',
    nationalities: []
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
    setCurrentPage(1); // Reset to first page on team change
    if (isAllTeamsSelected && club) {
      fetchClubMembers();
    } else if (selectedTeamId) {
      fetchTeamMembers();
    }
  }, [selectedTeamId, isAllTeamsSelected, club, searchQuery]);

  // Initial load
  useEffect(() => {
    if (contextTeams.length > 0) {
      setLoading(false);
    }
  }, [contextTeams]);

  // Fetch with pagination
  useEffect(() => {
    if (currentPage > 1) {
      if (isAllTeamsSelected && club) {
        fetchClubMembers();
      } else if (selectedTeamId) {
        fetchTeamMembers();
      }
    }
  }, [currentPage]);

  const fetchClubMembers = async () => {
    if (!club) return;
    try {
      const response = await membersApi.getAll({
        club_id: club.id,
        page: currentPage,
        per_page: perPage,
        search: searchQuery || undefined
      });
      setMembers(response.data.members || []);
      setTotalPages(response.data.total_pages || 1);
      setTotalMembers(response.data.total || 0);
      setClubMembers(response.data.members || []);
    } catch (error) {
      console.error('Error fetching club members:', error);
      // Fallback: get all users
      const usersRes = await usersApi.getAll();
      setMembers(usersRes.data.filter(u => u.role !== 'admin'));
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await membersApi.getAll({
        team_id: selectedTeamId,
        page: currentPage,
        per_page: perPage,
        search: searchQuery || undefined
      });
      setMembers(response.data.members || []);
      setTotalPages(response.data.total_pages || 1);
      setTotalMembers(response.data.total || 0);

      if (canManageTeam) {
        const usersRes = await usersApi.getAll();
        setAllUsers(usersRes.data);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  // New admin functions
  const fetchArchivedMembers = async () => {
    try {
      const response = await membersApi.getArchived({
        page: 1,
        per_page: 50,
        search: searchQuery || undefined
      });
      setArchivedMembers(response.data.members || []);
    } catch (error) {
      console.error('Error fetching archived members:', error);
    }
  };

  const handleViewMemberDetail = async (member) => {
    try {
      const response = await membersApi.getOne(member.id);
      setMemberDetail(response.data);
      setMemberDetailDialogOpen(true);
    } catch (error) {
      toast.error('Erro ao carregar detalhes do membro');
    }
  };

  const handleArchiveMember = async () => {
    if (!selectedMember) return;
    try {
      await membersApi.archive(selectedMember.id);
      toast.success('Membro arquivado. Estatísticas mantidas.');
      setArchiveDialogOpen(false);
      setSelectedMember(null);
      if (isAllTeamsSelected) {
        fetchClubMembers();
      } else {
        fetchTeamMembers();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao arquivar membro');
    }
  };

  const handleRestoreMember = async () => {
    if (!selectedMember) return;
    try {
      await membersApi.restore(selectedMember.id, selectedTeamId || null);
      toast.success('Membro restaurado com sucesso!');
      setRestoreDialogOpen(false);
      setSelectedMember(null);
      fetchArchivedMembers();
      if (isAllTeamsSelected) {
        fetchClubMembers();
      } else {
        fetchTeamMembers();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao restaurar membro');
    }
  };

  const handleSendActivationReminder = async (member) => {
    try {
      await membersApi.sendActivationReminder(member.id);
      toast.success('Lembrete enviado!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao enviar lembrete');
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    if (isAllTeamsSelected && club) {
      fetchClubMembers();
    } else if (selectedTeamId) {
      fetchTeamMembers();
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
      setNewMember({ name: '', email: '', role: 'jogador', jersey_number: '', position: '', phone: '', nationalities: [] });
      
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

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const params = {};
      if (!isAllTeamsSelected && selectedTeamId) {
        params.team_id = selectedTeamId;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      const response = await membersApi.exportExcel(params);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `membros_${currentTeam?.name?.replace(/\s+/g, '_') || 'clube'}_${timestamp}.xlsx`;
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
    const csvContent = "Nome,Apelido,Data de Nascimento,Email,Função,Número,Posição,Telefone,Nacionalidade\nJoão,Silva,2010-05-15,joao@exemplo.com,jogador,10,JC,912345678,Portuguesa\nMaria,Santos,2009-03-22,maria@exemplo.com,jogador,1,GR,923456789,Portuguesa\nPedro,Costa,2011-08-10,pedro@exemplo.com,jogador,7,AD,934567890,Brasileira";
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_membros.csv';
    link.click();
  };

  const handleToggleAdminRole = async (member) => {
    const newIsAdmin = member.role !== 'admin';
    const action = newIsAdmin ? 'conceder' : 'remover';
    
    if (!confirm(`Tem a certeza que quer ${action} role de admin a ${member.name}?`)) {
      return;
    }
    
    try {
      await usersApi.updateAdminRole(member.id, newIsAdmin);
      toast.success(newIsAdmin ? `${member.name} é agora admin` : `Role de admin removido de ${member.name}`);
      fetchTeamMembers();
    } catch (error) {
      toast.error('Erro ao alterar role de admin');
    }
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
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight flex items-center gap-3">
            <Users className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            Membros
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gestão de jogadores e staff • {totalMembers} membro(s)
          </p>
        </div>

        {canManageTeam && (
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => { setShowArchived(true); fetchArchivedMembers(); }} data-testid="view-archived-btn">
                <Archive className="w-4 h-4 mr-2" />
                Arquivados
              </Button>
            )}
            {canImportData && (
              <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)} data-testid="import-members-btn">
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </Button>
            )}
            {!isAllTeamsSelected && (
              <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)} data-testid="add-existing-btn">
                <UserPlus className="w-4 h-4 mr-2" />
                Do Clube
              </Button>
            )}
            <Button size="sm" onClick={() => setCreateDialogOpen(true)} data-testid="create-member-btn">
              <Plus className="w-4 h-4 mr-2" />
              Novo Membro
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportExcel}
              disabled={exporting || members.length === 0}
              data-testid="export-members-btn"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Exportar
            </Button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 h-10"
            data-testid="search-members-input"
          />
        </div>
        <Button variant="outline" size="icon" onClick={handleSearch} data-testid="search-members-btn">
          <Search className="w-4 h-4" />
        </Button>
        {searchQuery && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}>
            Limpar
          </Button>
        )}
      </div>

      {/* Info Banner when viewing Club */}
      {isAllTeamsSelected && (
        <Card className="border border-primary/20 bg-primary/5">
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
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-lg sm:text-xl tracking-tight flex items-center gap-2">
                {isAllTeamsSelected ? (
                  <>
                    <Building2 className="w-5 h-5 text-primary" />
                    Membros do Clube
                  </>
                ) : (
                  currentTeam?.name || 'Membros'
                )}
              </CardTitle>
              <CardDescription className="text-sm">
                {isAllTeamsSelected 
                  ? 'Todos os membros registados no clube' 
                  : `Membros associados a esta equipa`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    {isAllTeamsSelected ? 'Sem membros no clube' : 'Sem membros nesta equipa'}
                  </p>
                  {canManageTeam && (
                    <p className="text-sm text-muted-foreground/70 mt-2">
                      Use os botões acima para adicionar membros
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map(member => (
                    <div 
                      key={member.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/30 hover:border-primary/30 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar>
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback className={`${getRoleColor(member.team_role || member.role)} text-white`}>
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          {/* Activation status indicator for admin */}
                          {isAdmin && (
                            <span 
                              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                                member.is_activated ? 'bg-green-500' : 'bg-yellow-500'
                              }`}
                              title={member.is_activated ? 'Conta ativada' : 'Aguarda ativação'}
                            >
                              {member.is_activated ? (
                                <CheckCircle className="w-3 h-3 text-white" />
                              ) : (
                                <Clock className="w-3 h-3 text-white" />
                              )}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link 
                              to={`/members/${member.id}/profile`}
                              className="font-medium hover:text-primary transition-colors"
                              data-testid={`member-profile-link-${member.id}`}
                            >
                              {member.name}
                            </Link>
                            {/* Nationality flags (max 2) */}
                            {member.nationalities?.slice(0, 2).map((nat, i) => (
                              <span key={i} className="text-lg" title={nat}>
                                {FLAGS[nat] || nat}
                              </span>
                            ))}
                          </div>
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
                                <Link to={`/members/${member.id}/profile`} data-testid={`view-profile-${member.id}`}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver Perfil
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/players/${member.id}`} data-testid={`view-stats-${member.id}`}>
                                  <BarChart3 className="w-4 h-4 mr-2" />
                                  Ver Estatísticas
                                </Link>
                              </DropdownMenuItem>
                              {/* Admin actions */}
                              {isAdmin && (
                                <>
                                  {!member.is_activated && (
                                    <DropdownMenuItem onClick={() => handleSendActivationReminder(member)}>
                                      <Bell className="w-4 h-4 mr-2" />
                                      Enviar Lembrete Ativação
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
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
                              {/* Archive action for admin */}
                              {isAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  {/* Toggle Admin Role */}
                                  {member.id !== user?.id && (
                                    <DropdownMenuItem 
                                      onClick={() => handleToggleAdminRole(member)}
                                    >
                                      <Shield className="w-4 h-4 mr-2" />
                                      {member.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem 
                                    className="text-amber-600"
                                    onClick={() => { setSelectedMember(member); setArchiveDialogOpen(true); }}
                                  >
                                    <Archive className="w-4 h-4 mr-2" />
                                    Arquivar Membro
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Archived Members Dialog */}
      <Dialog open={showArchived} onOpenChange={setShowArchived}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
              <Archive className="w-5 h-5" />
              Membros Arquivados
            </DialogTitle>
            <DialogDescription>
              Membros arquivados mantêm as suas estatísticas e podem ser restaurados
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {archivedMembers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum membro arquivado
              </p>
            ) : (
              <div className="space-y-2">
                {archivedMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => { setSelectedMember(member); setRestoreDialogOpen(true); }}
                    >
                      <ArchiveRestore className="w-4 h-4 mr-2" />
                      Restaurar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Detail Dialog */}
      <Dialog open={memberDetailDialogOpen} onOpenChange={setMemberDetailDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Estatísticas do Membro
            </DialogTitle>
          </DialogHeader>
          {memberDetail && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-primary text-white text-xl">
                    {getInitials(memberDetail.member?.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{memberDetail.member?.name}</h3>
                  <p className="text-muted-foreground">{memberDetail.member?.email}</p>
                  <Badge variant="outline">{getRoleName(memberDetail.member?.role)}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold text-primary">{memberDetail.statistics?.total_events || 0}</p>
                    <p className="text-sm text-muted-foreground">Eventos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{memberDetail.statistics?.attendance_rate || 0}%</p>
                    <p className="text-sm text-muted-foreground">Assiduidade</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{memberDetail.statistics?.goals || 0}</p>
                    <p className="text-sm text-muted-foreground">Golos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold text-purple-600">{memberDetail.statistics?.assists || 0}</p>
                    <p className="text-sm text-muted-foreground">Assistências</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende arquivar <strong>{selectedMember?.name}</strong>?
              <br /><br />
              O membro será removido de todas as equipas, mas as estatísticas e histórico serão mantidos.
              Pode restaurar o membro a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedMember(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveMember} className="bg-amber-600 hover:bg-amber-700">
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Restaurar <strong>{selectedMember?.name}</strong>?
              <br /><br />
              O membro será restaurado e pode ser adicionado a uma equipa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedMember(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreMember}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Existing Member Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">Adicionar Membro</DialogTitle>
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
                  <SelectItem value="treinador">Treinador Principal</SelectItem>
                  <SelectItem value="treinador_adjunto">Treinador Adjunto</SelectItem>
                  <SelectItem value="delegado">Delegado</SelectItem>
                  <SelectItem value="familiar">Responsável/Familiar</SelectItem>
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
            <DialogTitle className="font-heading text-xl tracking-tight">Novo Membro</DialogTitle>
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
                    <SelectItem value="treinador">Treinador Principal</SelectItem>
                    <SelectItem value="treinador_adjunto">Treinador Adjunto</SelectItem>
                    <SelectItem value="delegado">Delegado</SelectItem>
                    <SelectItem value="familiar">Responsável/Familiar</SelectItem>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  placeholder="912345678"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nacionalidade</Label>
                <Input
                  placeholder="Portuguesa"
                  value={newMember.nationality || ''}
                  onChange={(e) => setNewMember({ ...newMember, nationality: e.target.value })}
                />
              </div>
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
            <DialogTitle className="font-heading text-xl tracking-tight">Importar Membros</DialogTitle>
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
            <DialogTitle className="font-heading text-xl tracking-tight">Adicionar a Equipa</DialogTitle>
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
