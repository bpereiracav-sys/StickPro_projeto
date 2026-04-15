import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { clubApi, guardianApi } from '../services/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Users,
  Building2,
  MessageCircle,
  MoreVertical,
  UserCircle,
  Calendar,
  Eye,
} from 'lucide-react';

const ROLE_NAMES = {
  jogador: 'Jogador',
  player: 'Jogador',
  treinador: 'Treinador',
  coach: 'Treinador',
  treinador_adjunto: 'Treinador Adjunto',
  assistant_coach: 'Treinador Adjunto',
  delegado: 'Delegado',
  delegate: 'Delegado',
  admin: 'Administrador',
  gestor_desportivo: 'Gestor Desportivo',
  sports_manager: 'Gestor Desportivo',
  responsavel: 'Responsável',
  guardian: 'Responsável',
};

export default function MyTeamsPage() {
  const { user, effectiveRole } = useAuth();
  const { teams: userTeams, loading: teamsLoading } = useTeam();
  const [searchParams] = useSearchParams();

  const initialTab = searchParams.get('tab') || 'teams';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState(null);

  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childTeams, setChildTeams] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [loadingChildTeams, setLoadingChildTeams] = useState(false);

  const isGuardian =
    String(effectiveRole || user?.role || '').toLowerCase() === 'responsavel' ||
    String(effectiveRole || user?.role || '').toLowerCase() === 'guardian';

  useEffect(() => {
    fetchClub();
  }, []);

  useEffect(() => {
    if (isGuardian) {
      fetchChildren();
    } else {
      setChildren([]);
      setSelectedChild(null);
      setChildTeams([]);
    }
  }, [isGuardian]);

  useEffect(() => {
    setLoading(teamsLoading);
  }, [teamsLoading]);

  useEffect(() => {
    if (selectedChild?.id) {
      fetchChildTeams(selectedChild.id);
    } else {
      setChildTeams([]);
    }
  }, [selectedChild]);

  const fetchClub = async () => {
    try {
      const response = await clubApi.getAll();
      const clubs = Array.isArray(response?.data) ? response.data : [];
      setClub(clubs.length > 0 ? clubs[0] : null);
    } catch (error) {
      console.error('Error fetching club:', error);
      setClub(null);
    }
  };

  const fetchChildren = async () => {
    setLoadingChildren(true);

    try {
      const response = await guardianApi.getChildren();
      const childrenData = Array.isArray(response?.data) ? response.data : [];

      setChildren(childrenData);

      if (childrenData.length > 0) {
        setSelectedChild((prev) => {
          if (prev) {
            const stillExists = childrenData.find((child) => child.id === prev.id);
            if (stillExists) return stillExists;
          }
          return childrenData[0];
        });
      } else {
        setSelectedChild(null);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      setChildren([]);
      setSelectedChild(null);
    } finally {
      setLoadingChildren(false);
    }
  };

  const fetchChildTeams = async (childId) => {
    if (!childId) return;

    setLoadingChildTeams(true);

    try {
      const response = await guardianApi.getChildTeams(childId);
      setChildTeams(Array.isArray(response?.data?.teams) ? response.data.teams : []);
    } catch (error) {
      console.error('Error fetching child teams:', error);
      setChildTeams([]);
    } finally {
      setLoadingChildTeams(false);
    }
  };

  const getUserRoleInTeam = (team) => {
    if (!user || !team) return 'jogador';

    if (team.coach_ids?.includes(user.id)) return 'treinador';
    if (team.assistant_coach_ids?.includes(user.id)) return 'treinador_adjunto';
    if (team.delegate_ids?.includes(user.id)) return 'delegado';
    if (team.admin_ids?.includes?.(user.id)) return 'admin';

    return 'jogador';
  };

  const getInitials = (name) => {
    if (!name) return 'A';

    return String(name)
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const safeUserTeams = useMemo(() => {
    return Array.isArray(userTeams) ? userTeams : [];
  }, [userTeams]);

  const TeamCard = ({ team, isChildTeam = false, childName = null }) => {
    const role = isChildTeam ? team?.child_role || 'jogador' : getUserRoleInTeam(team);

    const displayName =
      isChildTeam && childName ? `${team?.name} (${childName})` : team?.name || 'Equipa';

    return (
      <Card
        className="border border-border hover:border-primary/50 hover:bg-accent/20 transition-all duration-200"
        data-testid={`team-card-${team?.id}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              {team?.photo_url || club?.logo_url ? (
                <img
                  src={team?.photo_url || club?.logo_url}
                  alt={team?.name || 'Equipa'}
                  className="w-14 h-14 object-cover rounded-lg border border-border"
                />
              ) : (
                <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="w-7 h-7 text-primary" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <Badge variant="secondary" className="text-xs mb-1">
                EQUIPA DO CLUBE
              </Badge>

              <h3 className="font-heading text-base truncate">{displayName}</h3>

              <p className="text-xs text-muted-foreground mt-0.5">
                {team?.category || 'Hóquei em patins'}
                {team?.season ? ` • ${team.season}` : ''}
              </p>

              <p className="text-xs text-primary font-medium mt-1">
                {ROLE_NAMES[role] || role}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link to="/messages">
                  <MessageCircle className="w-4 h-4" />
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="bg-white">
                  <DropdownMenuItem asChild>
                    <Link to={`/teams/${team?.id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      Ver detalhes
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link to="/calendar">
                      <Calendar className="w-4 h-4 mr-2" />
                      Calendário
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ClubCard = () => {
    if (!club) return null;

    return (
      <Card
        className="border border-border hover:border-primary/50 hover:bg-accent/20 transition-all duration-200"
        data-testid="club-card"
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              {club.logo_url ? (
                <img
                  src={club.logo_url}
                  alt={club.name}
                  className="w-14 h-14 object-cover rounded-lg border border-border"
                />
              ) : (
                <div className="w-14 h-14 bg-secondary/20 rounded-lg flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-secondary" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <Badge
                variant="outline"
                className="text-xs mb-1 bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
              >
                CLUBE
              </Badge>

              <h3 className="font-heading text-base truncate">{club.name}</h3>

              <p className="text-xs text-muted-foreground mt-0.5">
                Hóquei em patins
              </p>

              <p className="text-xs text-primary font-medium mt-1">Membro</p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link to="/messages">
                  <MessageCircle className="w-4 h-4" />
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="bg-white">
                  <DropdownMenuItem asChild>
                    <Link to="/club">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver detalhes
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ChildSelector = () => {
    if (loadingChildren) {
      return (
        <div className="flex gap-3 mb-6">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-32 rounded-full" />
          ))}
        </div>
      );
    }

    if (children.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-wrap gap-3 mb-6" data-testid="children-selector">
        {children.map((child) => {
          const isSelected = selectedChild?.id === child.id;
          const firstName = child?.name?.split(' ')[0] || 'Atleta';

          return (
            <button
              key={child.id}
              type="button"
              onClick={() => setSelectedChild(child)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full transition-all
                ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                }
              `}
              data-testid={`child-selector-${child.id}`}
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={child.avatar_url} />
                <AvatarFallback
                  className={isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : ''}
                >
                  {getInitials(child.name)}
                </AvatarFallback>
              </Avatar>

              <span className="font-medium text-sm">
                {firstName} ({child.teams_count || 0})
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const EmptyChildrenState = () => (
    <Card className="border border-dashed border-border">
      <CardContent className="py-16 text-center">
        <UserCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-heading text-xl mb-2">Sem Filhos Associados</h3>
        <p className="text-muted-foreground">
          Ainda não tem filhos associados à sua conta.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Contacte o administrador do clube para associar atletas.
        </p>
      </CardContent>
    </Card>
  );

  const EmptyChildTeamsState = () => (
    <Card className="border border-dashed border-border">
      <CardContent className="py-16 text-center">
        <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-heading text-xl mb-2">Sem Equipas</h3>
        <p className="text-muted-foreground">
          Este atleta não tem equipas associadas.
        </p>
      </CardContent>
    </Card>
  );

  if (loading && !isGuardian) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6" data-testid="my-teams-page">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight">
          AS MINHAS EQUIPAS E OS MEUS CLUBES
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 mb-6">
          <TabsTrigger
            value="teams"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
            data-testid="tab-my-teams"
          >
            As minhas equipas
          </TabsTrigger>

          <TabsTrigger
            value="clubs"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
            data-testid="tab-my-clubs"
          >
            Os meus clubes
          </TabsTrigger>

          {isGuardian && (
            <TabsTrigger
              value="children"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
              data-testid="tab-my-children"
            >
              Os meus filhos
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="teams" className="mt-0">
          {safeUserTeams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {safeUserTeams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          ) : (
            <Card className="border border-dashed border-border">
              <CardContent className="py-16 text-center">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading text-xl mb-2">Sem Equipas</h3>
                <p className="text-muted-foreground">
                  Ainda não está associado a nenhuma equipa.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="clubs" className="mt-0">
          {club ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ClubCard />
            </div>
          ) : (
            <Card className="border border-dashed border-border">
              <CardContent className="py-16 text-center">
                <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading text-xl mb-2">Sem Clubes</h3>
                <p className="text-muted-foreground">
                  Ainda não está associado a nenhum clube.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {isGuardian && (
          <TabsContent value="children" className="mt-0">
            {children.length === 0 && !loadingChildren ? (
              <EmptyChildrenState />
            ) : (
              <>
                <ChildSelector />

                {loadingChildTeams ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-24" />
                    ))}
                  </div>
                ) : childTeams.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {childTeams.map((team) => (
                      <TeamCard
                        key={team.id}
                        team={team}
                        isChildTeam
                        childName={selectedChild?.name?.split(' ')[0]}
                      />
                    ))}

                    {club && <ClubCard />}
                  </div>
                ) : (
                  <EmptyChildTeamsState />
                )}
              </>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
