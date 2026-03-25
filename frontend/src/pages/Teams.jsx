import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { teamsApi, usersApi } from '../services/api';
import { Layout } from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Users, ChevronRight, Loader2 } from 'lucide-react';

export default function Teams() {
  const { canManageTeam, isAdmin } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    season: '2024/2025'
  });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await teamsApi.getAll();
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Erro ao carregar equipas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      await teamsApi.create(formData);
      toast.success('Equipa criada com sucesso!');
      setCreateDialogOpen(false);
      setFormData({ name: '', category: '', season: '2024/2025' });
      fetchTeams();
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao criar equipa';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const categories = [
    'Sub-9', 'Sub-11', 'Sub-13', 'Sub-15', 'Sub-17', 'Sub-19',
    'Seniores Masculino', 'Seniores Feminino', 'Veteranos'
  ];

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="teams-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-4xl text-foreground tracking-wide">EQUIPAS</h1>
            <p className="text-muted-foreground mt-1">Gerir as equipas do clube</p>
          </div>
          
          {canManageTeam && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="btn-hover rounded-sm" data-testid="create-team-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Equipa
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle className="font-heading text-2xl tracking-wide">CRIAR EQUIPA</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova equipa ao clube
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTeam}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome da Equipa</Label>
                      <Input
                        id="name"
                        placeholder="Ex: Juvenis A"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        data-testid="team-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Categoria</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger data-testid="team-category-select">
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="season">Época</Label>
                      <Select
                        value={formData.season}
                        onValueChange={(value) => setFormData({ ...formData, season: value })}
                      >
                        <SelectTrigger data-testid="team-season-select">
                          <SelectValue placeholder="Selecione a época" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="2024/2025">2024/2025</SelectItem>
                          <SelectItem value="2025/2026">2025/2026</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={creating} data-testid="submit-team-btn">
                      {creating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          A criar...
                        </>
                      ) : (
                        'Criar Equipa'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Teams Grid */}
        {teams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team, index) => (
              <Card 
                key={team.id} 
                className={`border border-border card-hover animate-fade-in-up stagger-${(index % 5) + 1}`}
                data-testid={`team-card-${team.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-heading text-2xl tracking-wide">{team.name}</CardTitle>
                      <p className="text-muted-foreground text-sm">{team.category}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {team.season}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 mb-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span className="font-mono">{team.player_ids?.length || 0}</span>
                      <span>jogadores</span>
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="secondary" className="role-coach">
                      {team.coach_ids?.length || 0} Treinador{team.coach_ids?.length !== 1 ? 'es' : ''}
                    </Badge>
                    <Badge variant="secondary" className="role-delegate">
                      {team.delegate_ids?.length || 0} Delegado{team.delegate_ids?.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <Button 
                    asChild 
                    variant="outline" 
                    className="w-full mt-4"
                    data-testid={`view-team-${team.id}`}
                  >
                    <Link to={`/teams/${team.id}`} className="flex items-center justify-center gap-2">
                      Ver Detalhes
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="empty-state py-16">
            <Users className="empty-state-icon" />
            <h3 className="font-heading text-2xl text-foreground tracking-wide mb-2">
              SEM EQUIPAS
            </h3>
            <p className="text-muted-foreground mb-6">
              {canManageTeam 
                ? 'Crie a primeira equipa do clube' 
                : 'Ainda não pertence a nenhuma equipa'}
            </p>
            {canManageTeam && (
              <Button onClick={() => setCreateDialogOpen(true)} data-testid="empty-create-team-btn">
                <Plus className="w-4 h-4 mr-2" />
                Criar Equipa
              </Button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
