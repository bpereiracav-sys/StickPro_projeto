import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { championshipsApi, teamsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Skeleton } from '../components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2, User } from 'lucide-react';
import { getInitials, formatDate, formatTime } from '../lib/utils';

const statFields = [
  { key: 'position', label: 'Pos', type: 'select', options: ['GR', 'JC'] },
  { key: 'minutes_played', label: 'Min', type: 'number' },
  { key: 'goals', label: 'G', type: 'number' },
  { key: 'assists', label: 'A', type: 'number' },
  { key: 'penalties_scored', label: 'PM', type: 'number' },
  { key: 'penalties_missed', label: 'PF', type: 'number' },
  { key: 'penalties_saved', label: 'PD', type: 'number' },
  { key: 'penalties_conceded', label: 'PS', type: 'number' },
  { key: 'free_kicks_scored', label: 'LDM', type: 'number' },
  { key: 'free_kicks_missed', label: 'LDF', type: 'number' },
  { key: 'free_kicks_saved', label: 'LDD', type: 'number' },
  { key: 'free_kicks_conceded', label: 'LDS', type: 'number' },
  { key: 'saves', label: 'Def', type: 'number' },
  { key: 'blue_cards', label: 'AZ', type: 'number' },
  { key: 'yellow_cards', label: 'AM', type: 'number' },
  { key: 'white_cards', label: 'BR', type: 'number' },
  { key: 'red_cards', label: 'VM', type: 'number' },
];

export default function MatchStats() {
  const { championshipId, matchId } = useParams();
  const { canManageEvents } = useAuth();
  const [match, setMatch] = useState(null);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [playerStats, setPlayerStats] = useState({});
  const [existingStats, setExistingStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [matchId]);

  const fetchData = async () => {
    try {
      const [matchesRes, existingRes] = await Promise.all([
        championshipsApi.getMatches(championshipId),
        championshipsApi.getMatchPlayerStats(matchId)
      ]);
      
      const currentMatch = matchesRes.data.find(m => m.id === matchId);
      if (currentMatch) {
        setMatch(currentMatch);
        
        const teamRes = await teamsApi.getOne(currentMatch.team_id);
        setTeam(teamRes.data);
        
        const membersRes = await teamsApi.getMembers(currentMatch.team_id);
        setMembers(membersRes.data.filter(m => m.team_role === 'jogador'));
      }
      
      // Initialize stats from existing data
      const statsMap = {};
      existingRes.data.forEach(stat => {
        statsMap[stat.player_id] = stat;
      });
      setPlayerStats(statsMap);
      setExistingStats(existingRes.data);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleStatChange = (playerId, field, value) => {
    setPlayerStats(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: field === 'position' ? value : parseInt(value) || 0
      }
    }));
  };

  const handleSaveStats = async () => {
    setSaving(true);
    
    try {
      for (const [playerId, stats] of Object.entries(playerStats)) {
        if (Object.keys(stats).length > 0) {
          await championshipsApi.createMatchPlayerStats(matchId, {
            match_id: matchId,
            player_id: playerId,
            position: stats.position || 'JC',
            minutes_played: stats.minutes_played || 0,
            goals: stats.goals || 0,
            assists: stats.assists || 0,
            penalties_scored: stats.penalties_scored || 0,
            penalties_missed: stats.penalties_missed || 0,
            penalties_saved: stats.penalties_saved || 0,
            penalties_conceded: stats.penalties_conceded || 0,
            free_kicks_scored: stats.free_kicks_scored || 0,
            free_kicks_missed: stats.free_kicks_missed || 0,
            free_kicks_saved: stats.free_kicks_saved || 0,
            free_kicks_conceded: stats.free_kicks_conceded || 0,
            saves: stats.saves || 0,
            blue_cards: stats.blue_cards || 0,
            yellow_cards: stats.yellow_cards || 0,
            white_cards: stats.white_cards || 0,
            red_cards: stats.red_cards || 0
          });
        }
      }
      toast.success('Estatísticas guardadas!');
    } catch (error) {
      toast.error('Erro ao guardar estatísticas');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Jogo não encontrado</p>
        <Button asChild className="mt-4">
          <Link to={`/championships/${championshipId}`}>Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="match-stats-page">
      {/* Back Button */}
      <Link 
        to={`/championships/${championshipId}`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao Campeonato
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl text-foreground tracking-wide">
            ESTATÍSTICAS DO JOGO
          </h1>
          <p className="text-muted-foreground mt-1">
            {team?.name} vs {match.opponent_team}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline">{formatDate(match.match_date)}</Badge>
            <Badge variant="outline">{formatTime(match.match_date)}</Badge>
            {match.is_completed && (
              <Badge className="bg-secondary text-white">
                {match.home_score} - {match.away_score}
              </Badge>
            )}
          </div>
        </div>

        {canManageEvents && (
          <Button onClick={handleSaveStats} disabled={saving} data-testid="save-stats-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar Estatísticas
          </Button>
        )}
      </div>

      {/* Stats Table */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="font-heading text-xl tracking-wide">ESTATÍSTICAS INDIVIDUAIS</CardTitle>
          <p className="text-xs text-muted-foreground mt-2">
            Pos=Posição | Min=Minutos | G=Golos | A=Assistências | PM/PF/PD/PS=Penaltis (Marcados/Falhados/Defendidos/Sofridos) | 
            LDM/LDF/LDD/LDS=Livres Diretos | Def=Defesas | AZ=Azul | AM=Amarelo | BR=Branco | VM=Vermelho
          </p>
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="min-w-[1200px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white z-10 min-w-[150px]">Jogador</TableHead>
                    {statFields.map(field => (
                      <TableHead key={field.key} className="text-center min-w-[60px]">
                        {field.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(player => (
                    <TableRow key={player.id} data-testid={`player-row-${player.id}`}>
                      <TableCell className="sticky left-0 bg-white z-10 font-medium">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-primary text-white">
                              {getInitials(player.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate max-w-[100px]">{player.name}</span>
                        </div>
                      </TableCell>
                      {statFields.map(field => (
                        <TableCell key={field.key} className="text-center p-1">
                          {field.type === 'select' ? (
                            <Select
                              value={playerStats[player.id]?.[field.key] || 'JC'}
                              onValueChange={(v) => handleStatChange(player.id, field.key, v)}
                            >
                              <SelectTrigger className="h-8 w-16">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                {field.options.map(opt => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              type="number"
                              min="0"
                              className="h-8 w-14 text-center p-1"
                              value={playerStats[player.id]?.[field.key] || ''}
                              onChange={(e) => handleStatChange(player.id, field.key, e.target.value)}
                            />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum jogador na equipa</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
