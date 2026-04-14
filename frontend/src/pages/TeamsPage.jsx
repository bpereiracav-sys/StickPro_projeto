import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTeam } from '../context/TeamContext';
import { usePermissions } from '../context/PermissionsContext';
import { teamsApi } from '../services/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { LogoUpload } from '../components/ImageUpload';

const CATEGORIES = [
  'Sub-6',
  'Sub-8',
  'Sub-10',
  'Sub-12',
  'Sub-14',
  'Sub-16',
  'Sub-18',
  'Sub-20',
  'Seniores',
  'Veteranos',
  'Feminino',
];

const getCurrentSeason = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (month >= 8) {
    return `${year}/${year + 1}`;
  }

  return `${year - 1}/${year}`;
};

export default function TeamsPage() {
  const { teams, refreshTeams, loading: teamsLoading } = useTeam();
  const { canManageTeam, canManageClub } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTeamForEdit, setSelectedTeamForEdit] = useState(null);
  const [selectedTeamForDelete, setSelectedTeamForDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    season: getCurrentSeason(),
    photo_url: '',
  });

  useEffect(() => {
    setLoading(teamsLoading);
  }, [teamsLoading]);

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      season: getCurrentSeason(),
      photo_url: '',
    });
  };

  const handleCreateTeam = async () => {
    if (!formData.name || !formData.category || !formData.season) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      await teamsApi.create(formData);
      toast.success('Equipa criada com sucesso');
      setShowCreateDialog(false);
      resetForm();
      await refreshTeams();
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao criar equipa';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditTeam = async () => {
    if (!selectedTeamForEdit) return;

    if (!formData.name || !formData.category || !formData.season) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      await teamsApi.update(selectedTeamForEdit.id, formData);
      toast.success('Equipa atualizada com sucesso');
      setShowEditDialog(false);
      setSelectedTeamForEdit(null);
      resetForm();
      await refreshTeams();
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao atualizar equipa';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeamForDelete) return;

    setSaving(true);
    try {
      await teamsApi.delete(selectedTeamForDelete.id);
      toast.success('Equipa eliminada com sucesso');
      setShowDeleteDialog(false);
      setSelectedTeamForDelete(null);
      await refreshTeams();
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao eliminar equipa';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const openEditDialog = (team) => {
    setSelectedTeamForEdit(team);
    setFormData({
      name: team.name || '',
      category: team.category || '',
      season: team.season || getCurrentSeason(),
      photo_url: team.photo_url || '',
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (team) => {
    setSelectedTeamForDelete(team);
    setShowDeleteDialog(true);
  };

  const getMemberCount = (team) => {
    return (
      (team.coach_ids?.length || 0) +
      (team.assistant_coach_ids?.length || 0) +
      (team.delegate_ids?.length || 0) +
      (team.player_ids?.length || 0)
    );
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6" data-testid="teams-page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight">
            EQUIPAS
          </h1>
          <p className="text-muted-foreground mt-1">Gerir equipas do clube</p>
        </div>

        {canManageTeam && (
          <Button onClick={openCreateDialog} data-testid="create-team-btn">
            <Plus className="w-4 h-4 mr-2" />
            Nova Equipa
          </Button>
        )}
      </div>

      {teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <Card
              key={team.id}
              className="border border-border hover:border-primary/50 transition-colors"
              data-testid={`team-card-${team.id}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {team.photo_url ? (
                    <img
                      src={team.photo_url}
                      alt={team.name}
                      className="w-16 h-16 object-cover rounded-lg border border-border"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="w-8 h-8 text-primary" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading text-lg truncate">{team.name}</h3>
                    <Badge variant="outline" className="mt-1">
                      {team.category}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {team.season}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {getMemberCount(team)} membro{getMemberCount(team) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border">
                  <Button asChild variant="outline" className="flex-1 min-w-[140px]">
                    <Link to={`/teams/${team.id}`} data-testid={`view-team-${team.id}`}>
                      Ver Detalhes
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>

                  {canManageTeam && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(team)}
                      data-testid={`edit-team-${team.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}

                  {canManageClub && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(team)}
                      data-testid={`delete-team-${team.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border border-dashed border-border">
          <CardContent className="py-16 text-center">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading text-xl mb-2">Sem Equipas</h3>
            <p className="text-muted-foreground mb-4">
              Ainda não existem equipas criadas no clube.
            </p>
            {canManageTeam && (
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Equipa
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Criar Nova Equipa</DialogTitle>
            <DialogDescription>Adicione uma nova equipa ao clube</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Fotografia da Equipa</Label>
              <LogoUpload
                currentUrl={formData.photo_url}
                onUpload={(url) => setFormData((prev) => ({ ...prev, photo_url: url }))}
                label="Carregar foto"
              />
            </div>

            <div className="space-y-2">
              <Label>Nome da Equipa *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Benjamins A"
                data-testid="team-name-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Escalão *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger data-testid="team-category-select">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Época *</Label>
                <Input
                  value={formData.season}
                  onChange={(e) => setFormData((prev) => ({ ...prev, season: e.target.value }))}
                  placeholder="2024/2025"
                  data-testid="team-season-input"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTeam} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A criar...
                </>
              ) : (
                'Criar Equipa'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) {
            setSelectedTeamForEdit(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Equipa</DialogTitle>
            <DialogDescription>Alterar informações da equipa</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Fotografia da Equipa</Label>
              <LogoUpload
                currentUrl={formData.photo_url}
                onUpload={(url) => setFormData((prev) => ({ ...prev, photo_url: url }))}
                label="Alterar foto"
              />
            </div>

            <div className="space-y-2">
              <Label>Nome da Equipa *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Benjamins A"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Escalão *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Época *</Label>
                <Input
                  value={formData.season}
                  onChange={(e) => setFormData((prev) => ({ ...prev, season: e.target.value }))}
                  placeholder="2024/2025"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditTeam} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A guardar...
                </>
              ) : (
                'Guardar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) {
            setSelectedTeamForDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Equipa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar a equipa "{selectedTeamForDelete?.name}"?
              <br />
              <br />
              <strong className="text-destructive">Esta ação é irreversível.</strong> Todos os
              eventos, campeonatos e dados associados a esta equipa serão eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeam}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A eliminar...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
