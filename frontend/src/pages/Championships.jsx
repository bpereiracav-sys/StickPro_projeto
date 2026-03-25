import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

const seasons = ['2023/2024', '2024/2025', '2025/2026'];
const formats = [
  { value: '5x5', label: '5x5 (Campo Inteiro)' },
  { value: '3x3', label: '3x3 (Meio Campo)' }
];
const convocationTypes = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatica', label: 'Automática' }
];

export default function Championships() {
  const { canManageEvents } = useAuth();
  const [teams, setTeams] = useState([]);
  const [championships, setChampionships] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('2024/2025');
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    season: '2024/2025',
    format: '5x5',
    convocation_type: 'manual',
    description: ''
  });

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      fetchChampionships();
    }
  }, [selectedTeamId, selectedSeason]);

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
      toast.success('Campeonato criado com sucesso!');
      setCreateDialogOpen(false);
      setFormData({ name: '', season: '2024/2025', format: '5x5', convocation_type: 'manual', description: '' });
      fetchChampionships();
    } catch (error) {
      toast.error('Erro ao criar campeonato');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem a certeza que quer eliminar este campeonato?')) return;
    
    try {
      await championshipsApi.delete(id);
      toast.success('Campeonato eliminado');
      fetchChampionships();
    } catch (error) {
      toast.error('Erro ao eliminar campeonato');
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
          <h1 className="font-heading text-3xl lg:text-4xl text-foreground tracking-wide flex items-center gap-3">
            <Trophy className="w-8 h-8 text-primary" />
            CAMPEONATOS
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
              Novo Campeonato
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
                    <CardTitle className="font-heading text-xl tracking-wide">{champ.name}</CardTitle>
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
            <h3 className="font-heading text-xl mb-2">SEM CAMPEONATOS</h3>
            <p className="text-muted-foreground mb-4">
              Nenhum campeonato registado para esta época
            </p>
            {canManageEvents && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Campeonato
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl tracking-wide">NOVO CAMPEONATO</DialogTitle>
            <DialogDescription>
              Criar um novo campeonato para a equipa
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Campeonato</Label>
                <Input
                  placeholder="Ex: Campeonato Nacional Sub-15"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="championship-name-input"
                />
              </div>
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
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  placeholder="Detalhes do campeonato..."
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
