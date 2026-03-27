import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { championshipsApi, teamsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Trophy, ChevronRight, Loader2, Calendar, Users, Zap } from 'lucide-react';

const seasons = ['2023/2024', '2024/2025', '2025/2026', '2026/2027'];
const formats = [
  { value: '5x5', label: '5x5 (Campo Inteiro)' },
  { value: '3x3', label: '3x3 (Meio Campo)' }
];
const convocationTypes = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatica', label: 'Automática' }
];

// Get current season based on current date
const getCurrentSeason = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  // Season starts in September (month 8)
  if (month >= 8) {
    return `${year}/${year + 1}`;
  }
  return `${year - 1}/${year}`;
};

const CURRENT_SEASON = getCurrentSeason();

// Escalões disponíveis
const AGE_GROUPS = [
  { value: 'sub-7', label: 'Sub-7 (Bambis)' },
  { value: 'sub-9', label: 'Sub-9 (Mini)' },
  { value: 'sub-11', label: 'Sub-11 (Benjamins)' },
  { value: 'sub-13', label: 'Sub-13 (Infantis)' },
  { value: 'sub-15', label: 'Sub-15 (Iniciados)' },
  { value: 'sub-17', label: 'Sub-17 (Juvenis)' },
  { value: 'sub-20', label: 'Sub-20 (Juniores)' },
  { value: 'seniores', label: 'Seniores' },
  { value: 'veteranos', label: 'Veteranos' },
];

// Tipos de competição
const COMPETITION_TYPES = [
  { value: 'campeonato_distrital', label: 'Campeonato Distrital' },
  { value: 'campeonato_nacional', label: 'Campeonato Nacional' },
  { value: 'taca', label: 'Taça' },
  { value: 'supertaca', label: 'Supertaça' },
  { value: 'torneio', label: 'Torneio' },
  { value: 'outro', label: 'Outro' },
];

export default function Championships() {
  const { canManageEvents } = useAuth();
  const { selectedTeam, teams: contextTeams, isAllTeamsSelected } = useTeam();
  const [teams, setTeams] = useState([]);
  const [championships, setChampionships] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedSeason, setSelectedSeason] = useState(CURRENT_SEASON);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    season: CURRENT_SEASON,
    format: '5x5',
    convocation_type: 'manual',
    age_group: '',
    competition_type: 'campeonato_distrital',
    description: ''
  });

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

  // Fetch championships when team or season changes
  useEffect(() => {
    if (selectedTeamId) {
      fetchChampionships();
    }
  }, [selectedTeamId, selectedSeason]);

  const fetchChampionships = async () => {
    try {
      const response = await championshipsApi.getAll({ team_id: selectedTeamId, season: selectedSeason });
      setChampionships(response.data);
    } catch (error) {
      console.error('Error fetching championships:', error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      await championshipsApi.create({
        ...formData,
        team_id: selectedTeamId
      });
      toast.success('Competição criada com sucesso!');
      setCreateDialogOpen(false);
      setFormData({ name: '', season: CURRENT_SEASON, format: '5x5', convocation_type: 'manual', age_group: '', competition_type: 'campeonato_distrital', description: '' });
      fetchChampionships();
    } catch (error) {
      toast.error('Erro ao criar competição');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem a certeza que quer eliminar esta competição?')) return;
    
    try {
      await championshipsApi.delete(id);
      toast.success('Competição eliminada');
      fetchChampionships();
    } catch (error) {
      toast.error('Erro ao eliminar competição');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="championships-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight flex items-center gap-3">
            <Trophy className="w-8 h-8 text-primary" />
            COMPETIÇÕES
          </h1>
          <p className="text-muted-foreground mt-1">Gerir competições e resultados</p>
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

          <Select value={selectedSeason} onValueChange={setSelectedSeason}>
            <SelectTrigger className="w-36" data-testid="season-filter">
              <SelectValue placeholder="Época" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {seasons.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canManageEvents && (
            <Button onClick={() => setCreateDialogOpen(true)} data-testid="create-championship-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nova Competição
            </Button>
          )}
        </div>
      </div>

      {/* Championships Grid */}
      {championships.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {championships.map((champ, index) => (
            <Card 
              key={champ.id} 
              className="border border-border card-hover"
              data-testid={`championship-card-${champ.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="font-heading text-xl tracking-tight">{champ.name}</CardTitle>
                    <Badge variant="outline" className="mt-2">{champ.season}</Badge>
                  </div>
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                {champ.description && (
                  <p className="text-sm text-muted-foreground mb-4">{champ.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {champ.format || '5x5'}
                  </Badge>
                  <Badge variant={champ.convocation_type === 'automatica' ? 'default' : 'outline'} className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {champ.convocation_type === 'automatica' ? 'Auto' : 'Manual'}
                  </Badge>
                  {champ.participating_teams?.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {champ.participating_teams.length} equipas
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="default" className="flex-1" data-testid={`view-championship-${champ.id}`}>
                    <Link to={`/championships/${champ.id}`}>
                      Ver Detalhes
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                  {canManageEvents && (
                    <Button 
                      variant="outline" 
                      className="text-destructive border-destructive"
                      onClick={() => handleDelete(champ.id)}
                    >
                      Eliminar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border border-border">
          <CardContent className="py-16 text-center">
            <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading text-xl mb-2">Sem Competições</h3>
            <p className="text-muted-foreground mb-4">
              Nenhuma competição registada para esta época
            </p>
            {canManageEvents && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Competição
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">Nova Competição</DialogTitle>
            <DialogDescription>
              Criar uma nova competição para a equipa
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Competição</Label>
                <Input
                  placeholder="Ex: Campeonato Distrital Sub-15"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="championship-name-input"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Época</Label>
                  <Select
                    value={formData.season}
                    onValueChange={(v) => setFormData({ ...formData, season: v })}
                  >
                    <SelectTrigger data-testid="championship-season-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {seasons.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Escalão</Label>
                  <Select
                    value={formData.age_group}
                    onValueChange={(v) => setFormData({ ...formData, age_group: v })}
                  >
                    <SelectTrigger data-testid="championship-age-group-select">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {AGE_GROUPS.map(ag => (
                        <SelectItem key={ag.value} value={ag.value}>{ag.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Competição</Label>
                  <Select
                    value={formData.competition_type}
                    onValueChange={(v) => setFormData({ ...formData, competition_type: v })}
                  >
                    <SelectTrigger data-testid="championship-competition-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {COMPETITION_TYPES.map(ct => (
                        <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select
                    value={formData.format}
                    onValueChange={(v) => setFormData({ ...formData, format: v })}
                  >
                    <SelectTrigger data-testid="championship-format-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {formats.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Convocatória</Label>
                <Select
                  value={formData.convocation_type}
                  onValueChange={(v) => setFormData({ ...formData, convocation_type: v })}
                >
                  <SelectTrigger data-testid="championship-convocation-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {convocationTypes.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  placeholder="Detalhes da competição..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  data-testid="championship-description-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating} data-testid="submit-championship-btn">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
