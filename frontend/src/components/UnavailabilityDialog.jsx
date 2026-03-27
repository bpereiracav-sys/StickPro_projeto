import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { unavailabilitiesApi } from '../services/api';
import { toast } from 'sonner';

const UNAVAILABILITY_REASONS = [
  { value: 'ferias', label: 'Férias' },
  { value: 'lesao', label: 'Lesão' },
  { value: 'trabalho', label: 'Trabalho' },
  { value: 'pessoal', label: 'Pessoal' },
  { value: 'outro', label: 'Outro' }
];

export default function UnavailabilityDialog({ open, onOpenChange, onSuccess, editData }) {
  const [startDate, setStartDate] = useState(editData?.start_date ? new Date(editData.start_date) : null);
  const [endDate, setEndDate] = useState(editData?.end_date ? new Date(editData.end_date) : null);
  const [reason, setReason] = useState(editData?.reason || '');
  const [notes, setNotes] = useState(editData?.notes || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!startDate || !endDate) {
      toast.error('Por favor seleciona as datas de início e fim');
      return;
    }
    
    if (!reason) {
      toast.error('Por favor seleciona um motivo');
      return;
    }
    
    if (startDate >= endDate) {
      toast.error('A data de início deve ser anterior à data de fim');
      return;
    }
    
    setLoading(true);
    try {
      const data = {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        reason,
        notes: notes || null
      };
      
      if (editData?.id) {
        await unavailabilitiesApi.update(editData.id, data);
        toast.success('Indisponibilidade atualizada');
      } else {
        await unavailabilitiesApi.create(data);
        toast.success('Indisponibilidade criada. Os treinadores foram notificados.');
      }
      
      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setStartDate(null);
      setEndDate(null);
      setReason('');
      setNotes('');
    } catch (error) {
      console.error('Error creating unavailability:', error);
      toast.error(error.response?.data?.detail || 'Erro ao criar indisponibilidade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {editData ? 'Editar Indisponibilidade' : 'Nova Indisponibilidade'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy", { locale: pt }) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    locale={pt}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy", { locale: pt }) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    locale={pt}
                    disabled={(date) => date < (startDate || new Date(new Date().setHours(0, 0, 0, 0)))}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Reason */}
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar motivo" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {UNAVAILABILITY_REASONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações adicionais..."
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editData ? 'Guardar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
