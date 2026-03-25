import { useState, useEffect } from 'react';
import { championshipsApi, teamsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  Save, 
  Loader2,
  Users,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Hockey rink positions
const POSITIONS = [
  { id: 'guarda_redes', name: 'Guarda-Redes', shortName: 'GR', x: 50, y: 85 },
  { id: 'defesa_esquerda', name: 'Defesa Esquerda', shortName: 'DE', x: 25, y: 60 },
  { id: 'defesa_direita', name: 'Defesa Direita', shortName: 'DD', x: 75, y: 60 },
  { id: 'avancado_esquerda', name: 'Avançado Esquerda', shortName: 'AE', x: 25, y: 30 },
  { id: 'avancado_direita', name: 'Avançado Direita', shortName: 'AD', x: 75, y: 30 },
];

// Hockey Rink SVG Component
function HockeyRink({ positions, players, onPositionClick, selectedPosition }) {
  return (
    <div className="relative w-full aspect-[2/3] max-w-md mx-auto">
      {/* Rink background */}
      <svg viewBox="0 0 100 150" className="w-full h-full">
        {/* Outer rink */}
        <rect x="2" y="2" width="96" height="146" rx="20" ry="20" 
          fill="#f0e6d3" stroke="#8B4513" strokeWidth="2"/>
        
        {/* Center line */}
        <line x1="2" y1="75" x2="98" y2="75" stroke="#dc2626" strokeWidth="1"/>
        
        {/* Center circle */}
        <circle cx="50" cy="75" r="15" fill="none" stroke="#dc2626" strokeWidth="1"/>
        <circle cx="50" cy="75" r="2" fill="#dc2626"/>
        
        {/* Goal areas */}
        <rect x="35" y="135" width="30" height="12" fill="none" stroke="#1e40af" strokeWidth="1"/>
        <rect x="35" y="3" width="30" height="12" fill="none" stroke="#1e40af" strokeWidth="1"/>
        
        {/* Goals */}
        <rect x="40" y="145" width="20" height="4" fill="#dc2626" rx="1"/>
        <rect x="40" y="1" width="20" height="4" fill="#dc2626" rx="1"/>
        
        {/* Face-off circles */}
        <circle cx="25" cy="30" r="8" fill="none" stroke="#1e40af" strokeWidth="0.5"/>
        <circle cx="75" cy="30" r="8" fill="none" stroke="#1e40af" strokeWidth="0.5"/>
        <circle cx="25" cy="120" r="8" fill="none" stroke="#1e40af" strokeWidth="0.5"/>
        <circle cx="75" cy="120" r="8" fill="none" stroke="#1e40af" strokeWidth="0.5"/>
      </svg>
      
      {/* Player positions */}
      {POSITIONS.map((pos) => {
        const player = positions.find(p => p.position === pos.id);
        const isSelected = selectedPosition === pos.id;
        
        return (
          <button
            key={pos.id}
            onClick={() => onPositionClick(pos.id)}
            className={`
              absolute transform -translate-x-1/2 -translate-y-1/2
              w-12 h-12 rounded-full flex flex-col items-center justify-center
              transition-all duration-200 border-2
              ${player?.player_id 
                ? 'bg-primary text-primary-foreground border-primary shadow-lg' 
                : 'bg-white/80 text-muted-foreground border-dashed border-muted-foreground hover:border-primary'}
              ${isSelected ? 'ring-4 ring-primary/50 scale-110' : 'hover:scale-105'}
            `}
            style={{ 
              left: `${pos.x}%`, 
              top: `${(pos.y / 150) * 100}%` 
            }}
            title={pos.name}
          >
            <span className="text-xs font-bold">{pos.shortName}</span>
            {player?.player_name && (
              <span className="text-[8px] truncate max-w-[40px]">
                {player.player_name.split(' ')[0]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function MatchLineupEditor({ matchId, teamId, onClose }) {
  const [lineup, setLineup] = useState({ periods: [] });
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPeriodIndex, setCurrentPeriodIndex] = useState(0);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState('');

  useEffect(() => {
    fetchData();
  }, [matchId, teamId]);

  const fetchData = async () => {
    try {
      // Fetch lineup
      const lineupRes = await championshipsApi.getMatchLineup(matchId);
      if (lineupRes.data.periods && lineupRes.data.periods.length > 0) {
        setLineup(lineupRes.data);
      } else {
        // Create default periods
        setLineup({
          match_id: matchId,
          periods: [
            { id: crypto.randomUUID(), name: '1ª Parte', order: 1, positions: [], notes: '' },
            { id: crypto.randomUUID(), name: '2ª Parte', order: 2, positions: [], notes: '' }
          ]
        });
      }

      // Fetch team players
      if (teamId) {
        const membersRes = await teamsApi.getMembers(teamId);
        const playersList = membersRes.data.filter(m => m.role === 'jogador');
        setPlayers(playersList);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const currentPeriod = lineup.periods[currentPeriodIndex];

  const handlePositionClick = (positionId) => {
    setSelectedPosition(positionId === selectedPosition ? null : positionId);
  };

  const handlePlayerSelect = (playerId) => {
    if (!selectedPosition || !currentPeriod) return;

    const player = players.find(p => p.id === playerId);
    
    setLineup(prev => {
      const newPeriods = [...prev.periods];
      const periodIndex = currentPeriodIndex;
      const positions = [...(newPeriods[periodIndex].positions || [])];
      
      // Remove player from other positions in this period
      const existingPlayerIndex = positions.findIndex(p => p.player_id === playerId);
      if (existingPlayerIndex >= 0) {
        positions.splice(existingPlayerIndex, 1);
      }
      
      // Update or add position
      const posIndex = positions.findIndex(p => p.position === selectedPosition);
      if (posIndex >= 0) {
        positions[posIndex] = {
          position: selectedPosition,
          player_id: playerId,
          player_name: player?.name || ''
        };
      } else {
        positions.push({
          position: selectedPosition,
          player_id: playerId,
          player_name: player?.name || ''
        });
      }
      
      newPeriods[periodIndex] = { ...newPeriods[periodIndex], positions };
      return { ...prev, periods: newPeriods };
    });
    
    setSelectedPosition(null);
  };

  const handleClearPosition = () => {
    if (!selectedPosition || !currentPeriod) return;

    setLineup(prev => {
      const newPeriods = [...prev.periods];
      const positions = (newPeriods[currentPeriodIndex].positions || [])
        .filter(p => p.position !== selectedPosition);
      newPeriods[currentPeriodIndex] = { ...newPeriods[currentPeriodIndex], positions };
      return { ...prev, periods: newPeriods };
    });
    
    setSelectedPosition(null);
  };

  const handleAddPeriod = () => {
    if (!newPeriodName.trim()) return;
    
    setLineup(prev => ({
      ...prev,
      periods: [
        ...prev.periods,
        {
          id: crypto.randomUUID(),
          name: newPeriodName.trim(),
          order: prev.periods.length + 1,
          positions: [],
          notes: ''
        }
      ]
    }));
    
    setNewPeriodName('');
    setShowAddPeriod(false);
    setCurrentPeriodIndex(lineup.periods.length);
  };

  const handleDeletePeriod = () => {
    if (lineup.periods.length <= 1) {
      toast.error('Deve existir pelo menos um período');
      return;
    }
    
    setLineup(prev => ({
      ...prev,
      periods: prev.periods.filter((_, i) => i !== currentPeriodIndex)
    }));
    
    setCurrentPeriodIndex(Math.max(0, currentPeriodIndex - 1));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await championshipsApi.saveMatchLineup(matchId, { periods: lineup.periods });
      toast.success('Line-up guardado!');
      onClose?.();
    } catch (error) {
      console.error('Error saving lineup:', error);
      toast.error('Erro ao guardar line-up');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPeriodIndex(Math.max(0, currentPeriodIndex - 1))}
            disabled={currentPeriodIndex === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            {lineup.periods.map((period, index) => (
              <Button
                key={period.id}
                variant={index === currentPeriodIndex ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPeriodIndex(index)}
              >
                {period.name}
              </Button>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPeriodIndex(Math.min(lineup.periods.length - 1, currentPeriodIndex + 1))}
            disabled={currentPeriodIndex >= lineup.periods.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddPeriod(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Período
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-destructive"
            onClick={handleDeletePeriod}
            disabled={lineup.periods.length <= 1}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hockey Rink */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              {currentPeriod?.name || 'Período'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HockeyRink
              positions={currentPeriod?.positions || []}
              players={players}
              onPositionClick={handlePositionClick}
              selectedPosition={selectedPosition}
            />
            
            {selectedPosition && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">
                  Seleciona jogador para: {POSITIONS.find(p => p.id === selectedPosition)?.name}
                </p>
                <div className="flex flex-wrap gap-2">
                  {players.map(player => {
                    const isInPosition = currentPeriod?.positions?.some(
                      p => p.player_id === player.id
                    );
                    return (
                      <Button
                        key={player.id}
                        variant={isInPosition ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => handlePlayerSelect(player.id)}
                        className="text-xs"
                      >
                        {player.name}
                        {isInPosition && (
                          <Badge variant="secondary" className="ml-1 text-[10px]">
                            {POSITIONS.find(p => 
                              currentPeriod?.positions?.find(
                                pos => pos.player_id === player.id && pos.position === p.id
                              )
                            )?.shortName}
                          </Badge>
                        )}
                      </Button>
                    );
                  })}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2 text-destructive"
                  onClick={handleClearPosition}
                >
                  Limpar posição
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Players List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Jogadores Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {players.length > 0 ? (
                players.map(player => {
                  const position = currentPeriod?.positions?.find(p => p.player_id === player.id);
                  return (
                    <div 
                      key={player.id}
                      className={`
                        flex items-center justify-between p-2 rounded-lg border
                        ${position ? 'bg-primary/10 border-primary' : 'bg-background border-border'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {player.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="text-sm font-medium">{player.name}</span>
                      </div>
                      {position && (
                        <Badge variant="default">
                          {POSITIONS.find(p => p.id === position.position)?.shortName}
                        </Badge>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sem jogadores na equipa
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              A guardar...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Line-up
            </>
          )}
        </Button>
      </div>

      {/* Add Period Dialog */}
      <Dialog open={showAddPeriod} onOpenChange={setShowAddPeriod}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Adicionar Período</DialogTitle>
            <DialogDescription>
              Cria um novo período para o jogo (ex: Prolongamento, Penáltis)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Nome do Período</Label>
            <Input
              value={newPeriodName}
              onChange={(e) => setNewPeriodName(e.target.value)}
              placeholder="Ex: Prolongamento"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPeriod(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddPeriod} disabled={!newPeriodName.trim()}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MatchLineupEditor;
