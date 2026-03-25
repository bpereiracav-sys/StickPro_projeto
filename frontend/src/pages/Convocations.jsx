import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { convocationsApi, eventsApi, teamsApi } from '../services/api';
import { Layout } from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { 
  ClipboardCheck, 
  Check, 
  X, 
  Clock, 
  MapPin,
  Loader2,
  Users
} from 'lucide-react';
import { formatDate, formatTime, getEventTypeName, getStatusColor, getStatusName } from '../lib/utils';

export default function Convocations() {
  const { user, isCoach, isAdmin } = useAuth();
  const [myConvocations, setMyConvocations] = useState([]);
  const [allConvocations, setAllConvocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchConvocations();
  }, []);

  const fetchConvocations = async () => {
    try {
      const myRes = await convocationsApi.getMy();
      setMyConvocations(myRes.data);

      if (isCoach || isAdmin) {
        const allRes = await convocationsApi.getAll();
        setAllConvocations(allRes.data);
      }
    } catch (error) {
      console.error('Error fetching convocations:', error);
      toast.error('Erro ao carregar convocatórias');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAttendance = async (attendanceId, status, reasonText = null) => {
    setUpdating(attendanceId);

    try {
      await convocationsApi.updateAttendance(attendanceId, { 
        status, 
        reason: reasonText 
      });
      toast.success(status === 'confirmado' ? 'Presença confirmada!' : 'Ausência registada');
      setReasonDialogOpen(false);
      setSelectedAttendance(null);
      setReason('');
      fetchConvocations();
    } catch (error) {
      toast.error('Erro ao atualizar presença');
    } finally {
      setUpdating(null);
    }
  };

  const openReasonDialog = (attendance) => {
    setSelectedAttendance(attendance);
    setReasonDialogOpen(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="convocations-page">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-4xl text-foreground tracking-wide">CONVOCATÓRIAS</h1>
          <p className="text-muted-foreground mt-1">Confirme a sua presença nos eventos</p>
        </div>

        <Tabs defaultValue="my" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="my" data-testid="tab-my-convocations">
              As Minhas ({myConvocations.length})
            </TabsTrigger>
            {(isCoach || isAdmin) && (
              <TabsTrigger value="all" data-testid="tab-all-convocations">
                Todas
              </TabsTrigger>
            )}
          </TabsList>

          {/* My Convocations */}
          <TabsContent value="my">
            {myConvocations.length > 0 ? (
              <div className="space-y-4">
                {myConvocations.map((item, index) => (
                  <Card 
                    key={item.attendance.id}
                    className={`border border-border animate-fade-in-up stagger-${(index % 5) + 1}`}
                    data-testid={`convocation-card-${item.attendance.id}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant={item.event?.event_type === 'jogo' ? 'default' : 'secondary'}>
                              {getEventTypeName(item.event?.event_type)}
                            </Badge>
                            <Badge className={getStatusColor(item.attendance.status)}>
                              {getStatusName(item.attendance.status)}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-lg">{item.event?.title}</h3>
                          {item.event?.opponent && (
                            <p className="text-muted-foreground">vs {item.event.opponent}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              {formatDate(item.event?.start_time)} às {formatTime(item.event?.start_time)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" />
                              {item.event?.location}
                            </span>
                          </div>
                          {item.convocation?.message && (
                            <p className="mt-3 text-sm bg-muted p-3 rounded-sm">
                              {item.convocation.message}
                            </p>
                          )}
                          {item.attendance.reason && (
                            <p className="mt-2 text-sm text-muted-foreground italic">
                              Motivo: {item.attendance.reason}
                            </p>
                          )}
                        </div>

                        {item.attendance.status === 'pendente' && (
                          <div className="flex gap-2 lg:flex-col">
                            <Button
                              className="flex-1 bg-secondary hover:bg-secondary/90"
                              onClick={() => handleUpdateAttendance(item.attendance.id, 'confirmado')}
                              disabled={updating === item.attendance.id}
                              data-testid={`confirm-btn-${item.attendance.id}`}
                            >
                              {updating === item.attendance.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Confirmar
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-white"
                              onClick={() => openReasonDialog(item.attendance)}
                              disabled={updating === item.attendance.id}
                              data-testid={`decline-btn-${item.attendance.id}`}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Não posso
                            </Button>
                          </div>
                        )}

                        {item.attendance.status !== 'pendente' && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateAttendance(item.attendance.id, 'confirmado')}
                              disabled={updating === item.attendance.id || item.attendance.status === 'confirmado'}
                              data-testid={`change-to-confirm-${item.attendance.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openReasonDialog(item.attendance)}
                              disabled={updating === item.attendance.id || item.attendance.status === 'ausente'}
                              data-testid={`change-to-absent-${item.attendance.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="empty-state py-16">
                <ClipboardCheck className="empty-state-icon" />
                <h3 className="font-heading text-2xl text-foreground tracking-wide mb-2">
                  SEM CONVOCATÓRIAS
                </h3>
                <p className="text-muted-foreground">
                  Ainda não foi convocado para nenhum evento
                </p>
              </div>
            )}
          </TabsContent>

          {/* All Convocations (for coaches/admins) */}
          {(isCoach || isAdmin) && (
            <TabsContent value="all">
              {allConvocations.length > 0 ? (
                <div className="space-y-4">
                  {allConvocations.map((conv, index) => (
                    <Card 
                      key={conv.id}
                      className={`border border-border animate-fade-in-up stagger-${(index % 5) + 1}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Criada em {formatDate(conv.created_at)}
                            </p>
                          </div>
                          <Badge variant="outline">
                            <Users className="w-3 h-3 mr-1" />
                            {conv.player_ids?.length || 0} convocados
                          </Badge>
                        </div>
                        {conv.message && (
                          <p className="text-sm bg-muted p-3 rounded-sm">
                            {conv.message}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="empty-state py-16">
                  <ClipboardCheck className="empty-state-icon" />
                  <p className="text-muted-foreground">Sem convocatórias criadas</p>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Reason Dialog */}
        <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl tracking-wide">MOTIVO DA AUSÊNCIA</DialogTitle>
              <DialogDescription>
                Indique o motivo pelo qual não pode comparecer (opcional)
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="Ex: Compromisso familiar, viagem de trabalho..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                data-testid="reason-input"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReasonDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive"
                onClick={() => handleUpdateAttendance(selectedAttendance?.id, 'ausente', reason)}
                disabled={updating}
                data-testid="confirm-absence-btn"
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Confirmar Ausência'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
