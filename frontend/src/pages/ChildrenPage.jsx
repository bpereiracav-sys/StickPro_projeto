import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersApi, teamsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Skeleton } from '../components/ui/skeleton';
import { 
  Users, 
  Calendar,
  Trophy,
  BarChart3,
  ChevronRight
} from 'lucide-react';
import { getInitials, getRoleName } from '../lib/utils';

export default function ChildrenPage() {
  const { user, availableProfiles, switchProfile } = useAuth();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      // Get associated accounts from available profiles
      const associatedProfiles = availableProfiles?.filter(p => p.type === 'associated') || [];
      
      // Fetch details for each associated account
      const childrenData = await Promise.all(
        associatedProfiles.map(async (profile) => {
          try {
            const userRes = await usersApi.getOne(profile.user_id);
            const userData = userRes.data;
            
            // Fetch teams for this child
            const teamsRes = await teamsApi.getAll();
            const childTeams = teamsRes.data.filter(t => 
              userData.team_ids?.includes(t.id)
            );
            
            return {
              ...userData,
              relationship: profile.relationship || 'Filho/a',
              teams: childTeams
            };
          } catch (error) {
            console.error('Error fetching child data:', error);
            return null;
          }
        })
      );
      
      setChildren(childrenData.filter(Boolean));
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAsChild = async (childId) => {
    try {
      await switchProfile('associated', childId);
    } catch (error) {
      console.error('Error switching profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="children-page">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight">
          OS MEUS FILHOS
        </h1>
        <p className="text-muted-foreground mt-1">
          Contas associadas de atletas sob sua responsabilidade
        </p>
      </div>

      {/* Children List */}
      {children.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {children.map((child) => (
            <Card 
              key={child.id} 
              className="border border-border hover:border-primary/50 transition-colors"
              data-testid={`child-card-${child.id}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={child.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {getInitials(child.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading text-xl">{child.name}</h3>
                    <Badge variant="outline" className="mt-1">
                      {child.relationship}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      {child.email}
                    </p>
                  </div>
                </div>

                {/* Teams */}
                {child.teams?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm font-medium mb-2">Equipas:</p>
                    <div className="flex flex-wrap gap-2">
                      {child.teams.map(team => (
                        <Badge key={team.id} variant="secondary">
                          <Users className="w-3 h-3 mr-1" />
                          {team.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-between"
                    onClick={() => handleViewAsChild(child.id)}
                  >
                    Ver como {child.name?.split(' ')[0]}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/calendar?child=${child.id}`}>
                        <Calendar className="w-4 h-4 mr-1" />
                        Calendário
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/stats?player=${child.id}`}>
                        <BarChart3 className="w-4 h-4 mr-1" />
                        Stats
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/attendance?player=${child.id}`}>
                        <Trophy className="w-4 h-4 mr-1" />
                        Presenças
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border border-dashed border-border">
          <CardContent className="py-16 text-center">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading text-xl mb-2">Sem Contas Associadas</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Não tem contas de filhos/atletas associadas à sua conta.
              <br />
              Para associar uma conta, o administrador pode fazer a ligação nas Definições.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">Como funcionam as contas associadas?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Como responsável, pode acompanhar as atividades dos seus filhos/atletas: 
                ver calendário, responder a convocatórias, consultar estatísticas e presenças.
                Use o botão "Ver como" para alternar entre perfis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
