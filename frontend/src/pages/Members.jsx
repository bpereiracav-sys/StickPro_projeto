import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { usePermissions } from '../context/PermissionsContext';
import { useLanguage } from '../context/LanguageContext';
import { teamsApi, usersApi, clubApi, membersApi } from '../services/api';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  CheckCircle,
  Clock,
  Shield,
  Trash2,
  UsersRound,
  Briefcase,
} from 'lucide-react';

import {
  getInitials,
  getRoleName,
  getRoleColor,
  normalizeRole,
  isStaffRole,
} from '../lib/utils';

const FLAGS = {
  PT: '🇵🇹',
  ES: '🇪🇸',
  FR: '🇫🇷',
  BR: '🇧🇷',
  AR: '🇦🇷',
  IT: '🇮🇹',
  DE: '🇩🇪',
  GB: '🇬🇧',
  US: '🇺🇸',
  AO: '🇦🇴',
  MZ: '🇲🇿',
  CV: '🇨🇻',
  GW: '🇬🇼',
  ST: '🇸🇹',
  NL: '🇳🇱',
  BE: '🇧🇪',
  CH: '🇨🇭',
  LU: '🇱🇺',
  MA: '🇲🇦',
  RO: '🇷🇴',
};

function MemberRow({
  member,
  isAdmin,
  canManageTeam,
  isAllTeamsSelected,
  teams,
  onArchive,
  onDelete,
  onAddToTeam,
  onRemoveFromTeam,
  onSendReminder,
  onToggleAdmin,
  getTranslatedRoleName,
  t,
  user,
}) {
  const memberRole = member.team_role || member.role;

  return (
    <div
      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/30 hover:border-primary/30 transition-all duration-200"
      data-testid={`member-row-${member.id}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative">
          <Avatar>
            <AvatarImage src={member.avatar_url} />
            <AvatarFallback className={`${getRoleColor(memberRole)} text-white`}>
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>

          {isAdmin && (
            <span
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                member.is_activated ? 'bg-green-500' : 'bg-yellow-500'
              }`}
              title={member.is_activated ? 'Activated' : 'Pending activation'}
            >
              {member.is_activated ? (
                <CheckCircle className="w-3 h-3 text-white" />
              ) : (
                <Clock className="w-3 h-3 text-white" />
              )}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/members/${member.id}/profile`}
              className="font-medium hover:text-primary transition-colors"
              data-testid={`member-profile-link-${member.id}`}
            >
              {member.name}
            </Link>

            {member.nationalities?.slice(0, 2).map((nat, i) => (
              <span key={i} className="text-lg" title={nat}>
                {FLAGS[nat] || nat}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {getTranslatedRoleName(memberRole)}
            </Badge>

            {member.profile?.sports_info?.jersey_number && (
              <span>#{member.profile.sports_info.jersey_number}</span>
            )}

            {member.profile?.sports_info?.position && (
              <span>{member.profile.sports_info.position}</span>
            )}

            {isAllTeamsSelected && member.team_ids?.length > 0 && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                {member.team_ids.length} {t('members.teamsCount')}
              </span>
            )}

            {isAllTeamsSelected && (!member.team_ids || member.team_ids.length === 0) && (
              <span className="text-xs text-amber-600">{t('members.noTeam')}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {member.email && (
          <a href={`mailto:${member.email}`} className="text-muted-foreground hover:text-primary">
            <Mail className="w-4 h-4" />
          </a>
        )}

        {member.profile?.identity?.phone && (
          <a
            href={`tel:${member.profile.identity.phone}`}
            className="text-muted-foreground hover:text-primary"
          >
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
                  {t('members.viewProfile')}
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link to={`/players/${member.id}`} data-testid={`view-stats-${member.id}`}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {t('members.viewStats')}
                </Link>
              </DropdownMenuItem>

              {isAdmin && !member.is_activated && (
                <DropdownMenuItem onClick={onSendReminder}>
                  <Bell className="w-4 h-4 mr-2" />
                  {t('members.sendReminder')}
                </DropdownMenuItem>
              )}

              {isAllTeamsSelected && teams.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onAddToTeam}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    {t('members.addToTeam')}
                  </DropdownMenuItem>
                </>
              )}

              {!isAllTeamsSelected && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={onRemoveFromTeam}>
                    <UserMinus className="w-4 h-4 mr-2" />
                    {t('members.removeFromTeam')}
                  </DropdownMenuItem>
                </>
              )}

              {isAdmin && (
                <>
                  <DropdownMenuSeparator />

                  {member.id !== user?.id && (
                    <DropdownMenuItem onClick={onToggleAdmin}>
                      <Shield className="w-4 h-4 mr-2" />
                      {['admin', 'gestor_desportivo'].includes(normalizeRole(member.role))
                        ? `${t('common.remove')} Admin`
                        : `${t('common.add')} Admin`}
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem className="text-amber-600" onClick={onArchive}>
                    <Archive className="w-4 h-4 mr-2" />
                    {t('common.archived')}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={onDelete}
                    data-testid={`delete-member-${member.id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('members.deleteMember')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

export default function Members() {
  const { user } = useAuth();
  const { selectedTeam, teams: contextTeams, isAllTeamsSelected } = useTeam();
  const { canManageTeam, canImportData, isAdmin } = usePermissions();
  const { t } = useLanguage();

  const [teams, setTeams] = useState([]);
  const [club, setClub] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addToTeamDialogOpen, setAddToTeamDialogOpen] = useState(false);

  const [selectedMember, setSelectedMember] = useState(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('jogador');
  const [importResults, setImportResults] = useState(null);
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState([]);

  const fileInputRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedMembers, setArchivedMembers] = useState([]);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
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
    nationalities: [],
  });

  const currentTeam = useMemo(
    () => teams.find((teamItem) => teamItem.id === selectedTeamId),
    [teams, selectedTeamId]
  );

  const groupedMembers = useMemo(
    () => ({
      staff: members
        .filter((member) => isStaffRole(member.team_role || member.role))
        .sort((a, b) => a.name.localeCompare(b.name)),
      players: members
        .filter((member) => !isStaffRole(member.team_role || member.role))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }),
    [members]
  );

  const availableUsers = useMemo(
    () => allUsers.filter((candidate) => !members.some((member) => member.id === candidate.id)),
    [allUsers, members]
  );

  useEffect(() => {
    fetchClub();
  }, []);

  useEffect(() => {
    setTeams(contextTeams);

    if (selectedTeam) {
      setSelectedTeamId(selectedTeam.id);
    } else if (!selectedTeam && !isAllTeamsSelected && contextTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(contextTeams[0].id);
    }
  }, [selectedTeam, contextTeams, isAllTeamsSelected, selectedTeamId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTeamId, isAllTeamsSelected, searchQuery]);

  useEffect(() => {
    if (isAllTeamsSelected && club) {
      fetchClubMembers();
      return;
    }

    if (!isAllTeamsSelected && selectedTeamId) {
      fetchTeamMembers();
      return;
    }

    if (!isAllTeamsSelected && contextTeams.length === 0) {
      setLoading(false);
    }
  }, [isAllTeamsSelected, club, selectedTeamId, currentPage, searchQuery, contextTeams.length]);

  const fetchClub = async () => {
    try {
      const response = await clubApi.getAll();
      if (response.data?.length > 0) {
        setClub(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching club:', error);
    }
  };

  const fetchClubMembers = useCallback(async () => {
    if (!club) return;

    setLoading(true);

    try {
      const response = await membersApi.getAll({
        club_id: club.id,
        page: currentPage,
        per_page: perPage,
        search: searchQuery || undefined,
      });

      setMembers(response.data?.members || []);
      setTotalPages(response.data?.total_pages || 1);
      setTotalMembers(response.data?.total || 0);
    } catch (error) {
      console.error('Error fetching club members:', error);

      try {
        const usersRes = await usersApi.getAll();
        const fallbackMembers = Array.isArray(usersRes.data)
          ? usersRes.data.filter((u) => normalizeRole(u.role) !== 'admin')
          : [];

        setMembers(fallbackMembers);
        setTotalPages(1);
        setTotalMembers(fallbackMembers.length);
      } catch (fallbackError) {
        console.error('Fallback error fetching users:', fallbackError);
        setMembers([]);
        setTotalPages(1);
        setTotalMembers(0);
      }
    } finally {
      setLoading(false);
    }
  }, [club, currentPage, searchQuery]);

  const fetchTeamMembers = useCallback(async () => {
    if (!selectedTeamId) return;

    setLoading(true);

    try {
      const response = await membersApi.getAll({
        team_id: selectedTeamId,
        page: currentPage,
        per_page: perPage,
        search: searchQuery || undefined,
      });

      setMembers(response.data?.members || []);
      setTotalPages(response.data?.total_pages || 1);
      setTotalMembers(response.data?.total || 0);

      if (canManageTeam) {
        const usersRes = await usersApi.getAll();
        setAllUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      } else {
        setAllUsers([]);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      setMembers([]);
      setTotalPages(1);
      setTotalMembers(0);
      setAllUsers([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId, currentPage, searchQuery, canManageTeam]);

  const refreshMembers = useCallback(() => {
    if (isAllTeamsSelected && club) {
      fetchClubMembers();
    } else if (!isAllTeamsSelected && selectedTeamId) {
      fetchTeamMembers();
    }
  }, [isAllTeamsSelected, club, selectedTeamId, fetchClubMembers, fetchTeamMembers]);

  const fetchArchivedMembers = async () => {
    try {
      const response = await membersApi.getArchived({
        page: 1,
        per_page: 50,
        search: searchQuery || undefined,
      });
      setArchivedMembers(response.data?.members || []);
    } catch (error) {
      console.error('Error fetching archived members:', error);
      toast.error('Erro ao carregar arquivados');
    }
  };

  const handleArchiveMember = async () => {
    if (!selectedMember) return;

    try {
      await membersApi.archive(selectedMember.id);
      toast.success('Membro arquivado. Estatísticas mantidas.');
      setArchiveDialogOpen(false);
      setSelectedMember(null);
      refreshMembers();
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
      refreshMembers();
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
    refreshMembers();
  };

  const handleAddExistingMember = async () => {
    if (!selectedUserId || !selectedTeamId) return;

    setAdding(true);

    try {
      await teamsApi.addMember(selectedTeamId, {
        user_id: selectedUserId,
        role: selectedRole,
      });

      toast.success('Membro adicionado à equipa!');
      setAddDialogOpen(false);
      setSelectedUserId('');
      setSelectedRole('jogador');
      fetchTeamMembers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao adicionar membro');
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
      const response = await membersApi.create({
        ...newMember,
        club_id: club?.id,
        team_id: isAllTeamsSelected ? null : selectedTeamId,
      });

      toast.success(`Membro criado! Password temporária: ${response.data.temp_password}`);

      setCreateDialogOpen(false);
      setNewMember({
        name: '',
        email: '',
        role: 'jogador',
        jersey_number: '',
        position: '',
        phone: '',
        nationality: '',
        nationalities: [],
      });

      refreshMembers();
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
      setSelectedMember(null);
      fetchTeamMembers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao adicionar membros à equipa');
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
      toast.error(error.response?.data?.detail || 'Erro ao remover membro');
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
      const response = await membersApi.import(
        file,
        club?.id,
        isAllTeamsSelected ? null : selectedTeamId
      );

      const results = response.data;
      setImportResults(results);

      if (results.success > 0) {
        toast.success(`${results.success} membros importados!`);
        refreshMembers();
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
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];

      link.href = url;
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

  const downloadTemplate = () => {
    const csvContent = `Nome,Apelido,Data de Nascimento,Email,Função,Número,Posição,Telefone,Nacionalidade,Sexo
João,Silva,2010-05-15,joao@exemplo.com,jogador,10,JC,912345678,Portuguesa,Masculino
Maria,Santos,2009-03-22,maria@exemplo.com,jogador,1,GR,923456789,Portuguesa,Feminino
Pedro,Costa,2011-08-10,pedro@exemplo.com,jogador,7,JC,934567890,Brasileira,Masculino
Carlos,Ferreira,1985-01-20,carlos@exemplo.com,treinador,,,915555555,Portuguesa,Masculino
Ana,Oliveira,1990-06-30,ana@exemplo.com,treinador adjunto,,,916666666,Portuguesa,Feminino
Manuel,Rodrigues,1975-03-12,manuel@exemplo.com,delegado,,,917777777,Portuguesa,Masculino
Teresa,Pais,1982-11-25,teresa@exemplo.com,responsavel,,,918888888,Portuguesa,Feminino`;

    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_membros.csv';
    link.click();
  };

  const handleToggleAdminRole = async (member) => {
    const normalizedRole = normalizeRole(member.role);
    const newIsAdmin = normalizedRole !== 'admin' && normalizedRole !== 'gestor_desportivo';
    const action = newIsAdmin ? 'conceder' : 'remover';

    if (!window.confirm(`Tem a certeza que quer ${action} role de admin a ${member.name}?`)) {
      return;
    }

    try {
      await usersApi.updateAdminRole(member.id, newIsAdmin);
      toast.success(
        newIsAdmin ? `${member.name} é agora admin` : `Role de admin removido de ${member.name}`
      );
      refreshMembers();
    } catch (error) {
      toast.error('Erro ao alterar role de admin');
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;

    setDeleting(true);

    try {
      await membersApi.delete(selectedMember.id);
      toast.success(t('members.memberDeleted'));
      setDeleteDialogOpen(false);
      setSelectedMember(null);
      refreshMembers();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setDeleting(false);
    }
  };

  const getTranslatedRoleName = (role) => {
    const normalizedRole = normalizeRole(role);
    const translated = t(`roles.${normalizedRole}`);
    return translated !== `roles.${normalizedRole}` ? translated : getRoleName(normalizedRole);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="members-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight flex items-center gap-3">
            <Users className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            {t('members.title')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gestão de jogadores e staff • {totalMembers} membro(s)
          </p>
        </div>

        {canManageTeam && (
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowArchived(true);
                  fetchArchivedMembers();
                }}
                data-testid="view-archived-btn"
              >
                <Archive className="w-4 h-4 mr-2" />
                Arquivados
              </Button>
            )}

            {canImportData && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportDialogOpen(true)}
                data-testid="import-members-btn"
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </Button>
            )}

            {!isAllTeamsSelected && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddDialogOpen(true)}
                data-testid="add-existing-btn"
              >
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

      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('members.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 h-10"
            data-testid="search-members-input"
          />
        </div>

        <Button variant="outline" size="icon" onClick={handleSearch} data-testid="search-members-btn">
          <Search className="w-4 h-4" />
        </Button>

        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setCurrentPage(1);
            }}
          >
            Limpar
          </Button>
        )}
      </div>

      {isAllTeamsSelected && (
        <Card className="border border-primary/20 bg-primary/5">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-sm">A visualizar todos os membros do Clube</p>
              <p className="text-xs text-muted-foreground">
                Crie membros aqui e depois adicione-os às equipas
              </p>
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
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="secondary">{members.length} membros</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-lg sm:text-xl tracking-tight flex items-center gap-2">
                {isAllTeamsSelected ? (
                  <>
                    <Building2 className="w-5 h-5 text-primary" />
                    {t('members.title')}
                  </>
                ) : (
                  currentTeam?.name || t('members.title')
                )}
              </CardTitle>

              <CardDescription className="text-sm">{t('members.subtitle')}</CardDescription>
            </CardHeader>

            <CardContent>
              {members.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    {isAllTeamsSelected ? t('members.noTeam') : t('common.noResults')}
                  </p>
                  {canManageTeam && (
                    <p className="text-sm text-muted-foreground/70 mt-2">{t('members.addMember')}</p>
                  )}
                </div>
              ) : isAllTeamsSelected ? (
                <div className="space-y-2">
                  {members
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((member) => (
                      <MemberRow
                        key={member.id}
                        member={member}
                        isAdmin={isAdmin}
                        canManageTeam={canManageTeam}
                        isAllTeamsSelected={isAllTeamsSelected}
                        teams={teams}
                        onArchive={() => {
                          setSelectedMember(member);
                          setArchiveDialogOpen(true);
                        }}
                        onDelete={() => {
                          setSelectedMember(member);
                          setDeleteDialogOpen(true);
                        }}
                        onAddToTeam={() => {
                          setSelectedMember(member);
                          setSelectedMembersToAdd([member.id]);
                          setAddToTeamDialogOpen(true);
                        }}
                        onRemoveFromTeam={() => {
                          setSelectedMember(member);
                          setRemoveDialogOpen(true);
                        }}
                        onSendReminder={() => handleSendActivationReminder(member)}
                        onToggleAdmin={() => handleToggleAdminRole(member)}
                        getTranslatedRoleName={getTranslatedRoleName}
                        t={t}
                        user={user}
                      />
                    ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedMembers.staff.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                        <Briefcase className="w-4 h-4 text-primary" />
                        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                          {t('groups.staff')} ({groupedMembers.staff.length})
                        </h3>
                      </div>

                      <div className="space-y-2">
                        {groupedMembers.staff.map((member) => (
                          <MemberRow
                            key={member.id}
                            member={member}
                            isAdmin={isAdmin}
                            canManageTeam={canManageTeam}
                            isAllTeamsSelected={isAllTeamsSelected}
                            teams={teams}
                            onArchive={() => {
                              setSelectedMember(member);
                              setArchiveDialogOpen(true);
                            }}
                            onDelete={() => {
                              setSelectedMember(member);
                              setDeleteDialogOpen(true);
                            }}
                            onAddToTeam={() => {
                              setSelectedMember(member);
                              setSelectedMembersToAdd([member.id]);
                              setAddToTeamDialogOpen(true);
                            }}
                            onRemoveFromTeam={() => {
                              setSelectedMember(member);
                              setRemoveDialogOpen(true);
                            }}
                            onSendReminder={() => handleSendActivationReminder(member)}
                            onToggleAdmin={() => handleToggleAdminRole(member)}
                            getTranslatedRoleName={getTranslatedRoleName}
                            t={t}
                            user={user}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {groupedMembers.players.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                        <UsersRound className="w-4 h-4 text-primary" />
                        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                          {t('groups.players')} ({groupedMembers.players.length})
                        </h3>
                      </div>

                      <div className="space-y-2">
                        {groupedMembers.players.map((member) => (
                          <MemberRow
                            key={member.id}
                            member={member}
                            isAdmin={isAdmin}
                            canManageTeam={canManageTeam}
                            isAllTeamsSelected={isAllTeamsSelected}
                            teams={teams}
                            onArchive={() => {
                              setSelectedMember(member);
                              setArchiveDialogOpen(true);
                            }}
                            onDelete={() => {
                              setSelectedMember(member);
                              setDeleteDialogOpen(true);
                            }}
                            onAddToTeam={() => {
                              setSelectedMember(member);
                              setSelectedMembersToAdd([member.id]);
                              setAddToTeamDialogOpen(true);
                            }}
                            onRemoveFromTeam={() => {
                              setSelectedMember(member);
                              setRemoveDialogOpen(true);
                            }}
                            onSendReminder={() => handleSendActivationReminder(member)}
                            onToggleAdmin={() => handleToggleAdminRole(member)}
                            getTranslatedRoleName={getTranslatedRoleName}
                            t={t}
                            user={user}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
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
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('members.deleteMember')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('members.deleteMemberConfirm')}
              <br />
              <br />
              <strong className="text-destructive">{t('members.deleteMemberWarning')}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedMember(null)}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              <p className="text-center text-muted-foreground py-8">Nenhum membro arquivado</p>
            ) : (
              <div className="space-y-2">
                {archivedMembers.map((member) => (
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
                      onClick={() => {
                        setSelectedMember(member);
                        setRestoreDialogOpen(true);
                      }}
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

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende arquivar <strong>{selectedMember?.name}</strong>?
              <br />
              <br />
              O membro será removido de todas as equipas, mas as estatísticas e histórico serão
              mantidos. Pode restaurar o membro a qualquer momento.
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

      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Restaurar <strong>{selectedMember?.name}</strong>?
              <br />
              <br />
              O membro será restaurado e pode ser adicionado a uma equipa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedMember(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreMember}>Restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  {availableUsers.map((availableUser) => (
                    <SelectItem key={availableUser.id} value={availableUser.id}>
                      {availableUser.name} ({availableUser.email})
                    </SelectItem>
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
                  <SelectItem value="responsavel">Responsável/Familiar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddExistingMember} disabled={adding || !selectedUserId}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <Select
                  value={newMember.role}
                  onValueChange={(value) => setNewMember({ ...newMember, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="jogador">Jogador</SelectItem>
                    <SelectItem value="treinador">Treinador Principal</SelectItem>
                    <SelectItem value="treinador_adjunto">Treinador Adjunto</SelectItem>
                    <SelectItem value="delegado">Delegado</SelectItem>
                    <SelectItem value="responsavel">Responsável/Familiar</SelectItem>
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
                <Select
                  value={newMember.position}
                  onValueChange={(value) => setNewMember({ ...newMember, position: value })}
                >
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
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateMember} disabled={adding}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Membro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  {importing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Selecionar Ficheiro
                </Button>
              </div>
            </div>

            {importResults && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default">{importResults.success} importados</Badge>

                  {importResults.warnings?.length > 0 && (
                    <Badge variant="secondary">{importResults.warnings.length} avisos</Badge>
                  )}

                  {importResults.errors?.length > 0 && (
                    <Badge variant="destructive">{importResults.errors.length} erros</Badge>
                  )}
                </div>

                {importResults.created?.length > 0 && (
                  <div className="max-h-40 overflow-y-auto text-sm border rounded p-2">
                    <p className="font-medium mb-1">Passwords temporárias:</p>
                    {importResults.created.map((createdUser, i) => (
                      <p key={i} className="text-muted-foreground">
                        {createdUser.name}:{' '}
                        <code className="bg-muted px-1">{createdUser.temp_password}</code>
                      </p>
                    ))}
                  </div>
                )}

                {importResults.warnings?.length > 0 && (
                  <div className="max-h-32 overflow-y-auto text-sm text-amber-600 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded p-2">
                    <p className="font-medium mb-1">Avisos:</p>
                    {importResults.warnings.map((warning, i) => (
                      <p key={i}>{warning}</p>
                    ))}
                  </div>
                )}

                {importResults.errors?.length > 0 && (
                  <div className="max-h-40 overflow-y-auto text-sm text-destructive border border-destructive/20 rounded p-2">
                    <p className="font-medium mb-1">Erros:</p>
                    {importResults.errors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Colunas esperadas:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block">
                Nome, Apelido, Data de Nascimento, Email, Função
              </code>
              <p className="text-xs mt-2 text-muted-foreground">
                Colunas opcionais: Número, Posição, Telefone, Nacionalidade, Sexo
              </p>
              <p className="text-xs mt-1">
                <strong>Funções válidas:</strong> jogador, treinador, treinador adjunto, delegado,
                responsavel, gestor desportivo
              </p>
              <p className="text-xs mt-1">
                <strong>Posições válidas:</strong> GR (Guarda-Redes), JC (Jogador de Campo)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false);
                setImportResults(null);
              }}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da Equipa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que quer remover <strong>{selectedMember?.name}</strong> desta equipa?
              <br />
              <br />
              As estatísticas do jogador serão preservadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMemberFromTeam}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={addToTeamDialogOpen} onOpenChange={setAddToTeamDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">
              Adicionar a Equipa
            </DialogTitle>
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
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
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
            <Button variant="outline" onClick={() => setAddToTeamDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddMembersToTeam} disabled={adding || !selectedTeamId}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
