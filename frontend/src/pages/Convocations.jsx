import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { convocationsApi } from '../services/api';
import { Card, CardContent } from '../components/ui/card';
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
  Users,
  MessageSquare,
} from 'lucide-react';
import {
  formatDate,
  formatTime,
  getEventTypeName,
  getStatusColor,
  getStatusName,
} from '../lib/utils';

export default function Convocations() {
  const { user } = useAuth();
  const { isCoach, isAdmin } = usePermissions();

  const [myConvocations, setMyConvocations] = useState([]);
  const [allConvocations, setAllConvocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchConvocations();
  }, [isCoach, isAdmin]);

  const fetchConvocations = async () => {
    setLoading(true);

    try {
      const myRes = await convocationsApi.getMy();
      setMyConvocations(Array.isArray(myRes?.data) ? myRes.data : []);

      if (isCoach || isAdmin) {
        const allRes = await convocationsApi.getAll();
        setAllConvocations(Array.isArray(allRes?.data) ? allRes.data : []);
      } else {
        setAllConvocations([]);
      }
    } catch (error) {
      console.error('Error fetching convocations:', error);
      toast.error('Erro ao carregar convocatórias');
      setMyConvocations([]);
      setAllConvocations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAttendance = async (attendanceId, status, reasonText = null) => {
    if (!attendanceId) return;

    setUpdating(attendanceId);

    try {
      await convocationsApi.updateAttendance(attendanceId, {
        status,
        reason: reasonText || null,
      });

      toast.success(
        status === 'confirmado' ? 'Presença confirmada!' : 'Ausência registada'
      );

      setReasonDialogOpen(false);
      setSelectedAttendance(null);
      setReason('');
      fetchConvocations();
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Erro ao atualizar presença');
    } finally {
      setUpdating(null);
    }
  };

  const openReasonDialog = (attendance) => {
    setSelectedAttendance(attendance);
    setReason(attendance?.reason || '');
    setReasonDialogOpen(true);
  };

  const renderMyConvocations = () => {
    if (myConvocations.length === 0) {
      return (
        <div className="empty-state py-16">
          <ClipboardCheck className="empty-state-icon" />
          <h3 className="font-heading text-2xl text-foreground tracking-tight mb-2">
            SEM CONVOCATÓRIAS
          </h3>
          <p className="text-muted-foreground">
            Ainda não foi convocado para nenhum evento
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {myConvocations.map((item, index) => {
          const attendance = item?.attendance;
          const event = item?.event;
          const convocation = item?.convocation;

          return (
            <Card
              key={attendance?.id || `attendance-${index}`}
              className={`border border-border animate-fade-in-up stagger-${(index % 5) + 1}`}
              data-testid={`convocation-card-${attendance?.id}`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <Badge variant={event?.event_type === 'jogo' ? 'default' : 'secondary'}>
                        {getEventTypeName(event?.event_type)}
                      </Badge>

                      <Badge className={getStatusColor(attendance?.status)}>
                        {getStatusName(attendance?.status)}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-lg">{event?.title || 'Evento'}</h3>

                    {event?.opponent && (
                      <p className="text-muted-foreground">vs {event.opponent}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {formatDate(event?.start_time)} às {formatTime(event?.start_time)}
                      </span>

                      {event?.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </span>
                      )}
                    </div>

                    {convocation?.message && (
                      <p className="mt-3 text-sm bg-muted p-3 rounded-sm">
                        {convocation.message}
                      </p>
                    )}

                    {attendance?.reason && (
                      <p className="mt-2 text-sm text-muted-foreground italic">
                        Motivo: {attendance.reason}
                      </p>
                    )}
                  </div>

                  {attendance?.status === 'pendente' ? (
                    <div className="flex gap-2 lg:flex-col">
                      <Button
                        className="flex-1 bg-secondary hover:bg-secondary/90"
                        onClick={() => handleUpdateAttendance(attendance?.id, 'confirmado')}
                        disabled={updating === attendance?.id}
                        data-testid={`confirm-btn-${attendance?.id}`}
                      >
                        {updating === attendance?.id ? (
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
                        onClick={() => openReasonDialog(attendance)}
                        disabled={updating === attendance?.id}
                        data-testid={`decline-btn-${attendance?.id}`}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Não posso
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateAttendance(attendance?.id, 'confirmado')}
                        disabled={
                          updating === attendance?.id || attendance?.status === 'confirmado'
                        }
                        data-testid={`change-to-confirm-${attendance?.id}`}
                      >
                        <Check className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReasonDialog(attendance)}
                        disabled={updating === attendance?.id || attendance?.status === 'ausente'}
                        data-testid={`change-to-absent-${attendance?.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderAllConvocations = () => {
    if (allConvocations.length === 0) {
      return (
        <div className="empty-state py-16">
          <ClipboardCheck className="empty-state-icon" />
          <p className="text-muted-foreground">Sem convocatórias criadas</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {allConvocations.map((conv, index) => (
          <Card
            key={conv?.id || `conv-${index}`}
            className={`border border-border animate-fade-in-up stagger-${(index % 5) + 1}`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Criada em {formatDate(conv?.created_at)}
                  </p>
                </div>

                <Badge variant="outline">
                  <Users className="w-3 h-3 mr-1" />
                  {conv?.player_ids?.length || 0} convocados
                </Badge>
              </div>

              {conv?.message ? (
                <div className="flex items-start gap-2 text-sm bg-muted p-3 rounded-sm">
                  <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <p>{conv.message}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Sem mensagem associada
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="convocations-page">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight">
          Convocatórias
        </h1>
        <p className="text-muted-foreground mt-1">
          Confirme a sua presença nos eventos
        </p>
      </div>

      <Tabs defaultValue="my" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="my" data-testid="tab-my-convocations">
            As Minhas ({myConvocations.length})
          </TabsTrigger>

          {(isCoach || isAdmin) && (
            <TabsTrigger value="all" data-testid="tab-all-convocations">
              Todas ({allConvocations.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my">{renderMyConvocations()}</TabsContent>

        {(isCoach || isAdmin) && (
          <TabsContent value="all">{renderAllConvocations()}</TabsContent>
        )}
      </Tabs>

      <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">
              Motivo da Ausência
            </DialogTitle>
            <DialogDescription>
              Indique o motivo pelo qual não pode comparecer (opcional)
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              placeholder="Ex: Compromisso familiar, viagem, lesão..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              data-testid="reason-input"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReasonDialogOpen(false);
                setSelectedAttendance(null);
                setReason('');
              }}
            >
              Cancelar
            </Button>

            <Button
              variant="destructive"
              onClick={() =>
                handleUpdateAttendance(selectedAttendance?.id, 'ausente', reason)
              }
              disabled={!!updating}
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
  );
}
