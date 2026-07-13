import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownUp,
  CircleStop,
  Clock3,
  Edit3,
  Flag,
  Goal,
  Loader2,
  MessageSquareText,
  Pause,
  Play,
  Plus,
  Save,
  Shield,
  Square,
  Target,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { championshipsApi } from '../../services/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';

const EVENT_TYPES = [
  { value: 'match_start', label: 'Início do jogo', icon: Play },
  { value: 'goal', label: 'Golo', icon: Goal },
  { value: 'own_goal', label: 'Autogolo', icon: Goal },
  { value: 'yellow_card', label: 'Cartão amarelo', icon: Square },
  { value: 'blue_card', label: 'Cartão azul', icon: Square },
  { value: 'red_card', label: 'Cartão vermelho', icon: Square },
  { value: 'substitution', label: 'Substituição', icon: ArrowDownUp },
  { value: 'timeout', label: 'Time-out', icon: Pause },
  { value: 'penalty_scored', label: 'Penálti convertido', icon: Target },
  { value: 'penalty_missed', label: 'Penálti falhado', icon: Target },
  { value: 'direct_free_kick_scored', label: 'Livre direto convertido', icon: Target },
  { value: 'direct_free_kick_missed', label: 'Livre direto falhado', icon: Target },
  { value: 'save', label: 'Defesa', icon: Shield },
  { value: 'halftime', label: 'Intervalo', icon: Clock3 },
  { value: 'period_start', label: 'Início de período', icon: Play },
  { value: 'period_end', label: 'Fim de período', icon: CircleStop },
  { value: 'match_end', label: 'Fim do jogo', icon: Flag },
  { value: 'technical_note', label: 'Nota técnica', icon: MessageSquareText },
];

const EMPTY_FORM = {
  event_type: 'goal',
  period: '1',
  minute: '0',
  second: '0',
  team_side: 'home',
  player_id: 'none',
  secondary_player_id: 'none',
  score_home: '',
  score_away: '',
  notes: '',
};

const PLAYER_REQUIRED_TYPES = new Set([
  'goal',
  'own_goal',
  'yellow_card',
  'blue_card',
  'red_card',
  'substitution',
  'penalty_scored',
  'penalty_missed',
  'direct_free_kick_scored',
  'direct_free_kick_missed',
  'save',
]);

const SECONDARY_PLAYER_TYPES = new Set(['goal', 'substitution']);

function getEventDefinition(eventType) {
  return EVENT_TYPES.find((item) => item.value === eventType) || EVENT_TYPES[0];
}

function getEventStyle(eventType) {
  if (['goal', 'penalty_scored', 'direct_free_kick_scored'].includes(eventType)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (eventType === 'yellow_card') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (eventType === 'blue_card') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (eventType === 'red_card') return 'border-red-200 bg-red-50 text-red-700';
  if (['match_start', 'period_start', 'match_end'].includes(eventType)) {
    return 'border-cyan-200 bg-cyan-50 text-cyan-700';
  }
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function getPlayerName(member) {
  return (
    member?.name ||
    [member?.profile?.first_name, member?.profile?.surname].filter(Boolean).join(' ') ||
    'Atleta'
  );
}

function formatMoment(event) {
  const minute = Number(event.minute || 0);
  const second = Number(event.second || 0);
  return second > 0 ? `${minute}:${String(second).padStart(2, '0')}` : `${minute}'`;
}

function getPeriodLabel(period) {
  const value = String(period);
  if (value === '1') return '1.ª parte';
  if (value === '2') return '2.ª parte';
  if (value === '3') return 'Prolongamento 1';
  return 'Prolongamento 2';
}

export default function MatchTimeline({
  match,
  members = [],
  canEdit = false,
  onTimelineChange,
}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const matchId = match?.id;
  const homeTeam = match?.home_team || 'Equipa da casa';
  const awayTeam = match?.away_team || match?.opponent_team || 'Equipa visitante';

  const loadTimeline = async () => {
    if (!matchId) return;
    setLoading(true);
    try {
      const response = await championshipsApi.getMatchTimeline(matchId);
      setEvents(response.data?.events || []);
    } catch (error) {
      console.error('Timeline load error:', error);
      toast.error('Erro ao carregar a timeline do jogo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const groupedEvents = useMemo(() => {
    return events.reduce((groups, event) => {
      const key = String(event.period || 1);
      if (!groups[key]) groups[key] = [];
      groups[key].push(event);
      return groups;
    }, {});
  }, [events]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingEventId(null);
    setFormOpen(false);
  };

  const openCreateForm = () => {
    setForm(EMPTY_FORM);
    setEditingEventId(null);
    setFormOpen(true);
  };

  const openEditForm = (event) => {
    setForm({
      event_type: event.event_type || 'technical_note',
      period: String(event.period || 1),
      minute: String(event.minute || 0),
      second: String(event.second || 0),
      team_side: event.team_side || 'neutral',
      player_id: event.player_id || 'none',
      secondary_player_id: event.secondary_player_id || 'none',
      score_home: event.score_home == null ? '' : String(event.score_home),
      score_away: event.score_away == null ? '' : String(event.score_away),
      notes: event.notes || '',
    });
    setEditingEventId(event.id);
    setFormOpen(true);
  };

  const submitEvent = async () => {
    if (PLAYER_REQUIRED_TYPES.has(form.event_type) && form.player_id === 'none') {
      toast.error('Selecione o atleta associado ao acontecimento');
      return;
    }

    const payload = {
      event_type: form.event_type,
      period: Number(form.period),
      minute: Number(form.minute),
      second: Number(form.second),
      team_side: form.team_side,
      player_id: form.player_id === 'none' ? null : form.player_id,
      secondary_player_id:
        form.secondary_player_id === 'none' ? null : form.secondary_player_id,
      score_home: form.score_home === '' ? null : Number(form.score_home),
      score_away: form.score_away === '' ? null : Number(form.score_away),
      notes: form.notes.trim() || null,
      source: 'manual',
    };

    setSaving(true);
    try {
      if (editingEventId) {
        await championshipsApi.updateMatchTimelineEvent(matchId, editingEventId, payload);
        toast.success('Acontecimento atualizado');
      } else {
        await championshipsApi.createMatchTimelineEvent(matchId, payload);
        toast.success('Acontecimento registado');
      }
      resetForm();
      await loadTimeline();
      onTimelineChange?.();
    } catch (error) {
      console.error('Timeline save error:', error);
      toast.error(error.response?.data?.detail || 'Erro ao guardar o acontecimento');
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (eventId) => {
    setDeletingId(eventId);
    try {
      await championshipsApi.deleteMatchTimelineEvent(matchId, eventId);
      toast.success('Acontecimento eliminado');
      await loadTimeline();
      onTimelineChange?.();
    } catch (error) {
      console.error('Timeline delete error:', error);
      toast.error(error.response?.data?.detail || 'Erro ao eliminar o acontecimento');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-white/70 bg-white/95 shadow-lg shadow-slate-200/70">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white via-cyan-50/40 to-emerald-50/40 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Play className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-heading text-xl font-semibold tracking-tight text-slate-950">
                  Live Match Center
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Registo cronológico dos acontecimentos do jogo.
                </p>
              </div>
            </div>

            {canEdit && (
              <Button
                type="button"
                onClick={formOpen ? resetForm : openCreateForm}
                className="rounded-xl"
              >
                {formOpen ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {formOpen ? 'Fechar' : 'Novo acontecimento'}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Casa</p>
              <p className="mt-1 truncate font-semibold text-slate-950">{homeTeam}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-950 p-4 text-white">
              <p className="text-xs uppercase tracking-wide text-slate-400">Resultado oficial</p>
              <p className="mt-1 text-2xl font-bold">
                {match?.is_completed
                  ? `${match.home_score ?? 0} - ${match.away_score ?? 0}`
                  : 'VS'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Visitante</p>
              <p className="mt-1 truncate font-semibold text-slate-950">{awayTeam}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/50 px-4 py-3">
            <p className="text-sm leading-6 text-cyan-900">
              Nesta fase, a timeline preserva o resultado oficial e as estatísticas existentes.
              A sincronização automática será ativada no Sprint 2.3D.
            </p>
          </div>
        </CardContent>
      </Card>

      {formOpen && canEdit && (
        <Card className="border-primary/20 bg-white shadow-lg shadow-slate-200/70">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-heading text-lg font-semibold text-slate-950">
                  {editingEventId ? 'Editar acontecimento' : 'Registar acontecimento'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Defina o momento, equipa e atletas envolvidos.
                </p>
              </div>
              {editingEventId && <Badge variant="outline">Edição</Badge>}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Tipo</Label>
                <Select
                  value={form.event_type}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, event_type: value }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    {EVENT_TYPES.map((eventType) => (
                      <SelectItem key={eventType.value} value={eventType.value}>
                        {eventType.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Período</Label>
                <Select
                  value={form.period}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, period: value }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="1">1.ª parte</SelectItem>
                    <SelectItem value="2">2.ª parte</SelectItem>
                    <SelectItem value="3">Prolongamento 1</SelectItem>
                    <SelectItem value="4">Prolongamento 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Equipa</Label>
                <Select
                  value={form.team_side}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, team_side: value }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="home">{homeTeam}</SelectItem>
                    <SelectItem value="away">{awayTeam}</SelectItem>
                    <SelectItem value="neutral">Sem equipa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Minuto</Label>
                <Input
                  type="number"
                  min="0"
                  max="120"
                  value={form.minute}
                  onChange={(event) => setForm((prev) => ({ ...prev, minute: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Segundo</Label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={form.second}
                  onChange={(event) => setForm((prev) => ({ ...prev, second: event.target.value }))}
                />
              </div>

              {PLAYER_REQUIRED_TYPES.has(form.event_type) && (
                <div className="space-y-2 md:col-span-2">
                  <Label>{form.event_type === 'substitution' ? 'Atleta que sai' : 'Atleta'}</Label>
                  <Select
                    value={form.player_id}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, player_id: value }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecionar atleta" /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="none">Selecionar atleta</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {getPlayerName(member)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {SECONDARY_PLAYER_TYPES.has(form.event_type) && (
                <div className="space-y-2 md:col-span-2">
                  <Label>{form.event_type === 'substitution' ? 'Atleta que entra' : 'Assistência'}</Label>
                  <Select
                    value={form.secondary_player_id}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, secondary_player_id: value }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecionar atleta" /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="none">Sem atleta associado</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {getPlayerName(member)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Marcador Casa</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.score_home}
                  placeholder="Opcional"
                  onChange={(event) => setForm((prev) => ({ ...prev, score_home: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Marcador Visitante</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.score_away}
                  placeholder="Opcional"
                  onChange={(event) => setForm((prev) => ({ ...prev, score_away: event.target.value }))}
                />
              </div>

              <div className="space-y-2 md:col-span-2 xl:col-span-4">
                <Label>Notas</Label>
                <Textarea
                  rows={3}
                  value={form.notes}
                  placeholder="Observação opcional..."
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button type="button" onClick={submitEvent} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {editingEventId ? 'Guardar alterações' : 'Registar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-white/70 bg-white/95 shadow-lg shadow-slate-200/70">
        <CardContent className="p-5 sm:p-6">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-12 text-center">
              <Clock3 className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-4 font-heading text-lg font-semibold text-slate-950">
                Timeline ainda sem acontecimentos
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                Registe o início do jogo, golos, cartões, substituições, time-outs e os restantes momentos importantes.
              </p>
              {canEdit && (
                <Button type="button" className="mt-5" onClick={openCreateForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Primeiro acontecimento
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-7">
              {Object.entries(groupedEvents).map(([period, periodEvents]) => (
                <section key={period}>
                  <div className="mb-4 flex items-center gap-3">
                    <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-700">
                      {getPeriodLabel(period)}
                    </Badge>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <div className="relative space-y-3 before:absolute before:bottom-3 before:left-[19px] before:top-3 before:w-px before:bg-slate-200 sm:before:left-[25px]">
                    {periodEvents.map((event) => {
                      const definition = getEventDefinition(event.event_type);
                      const Icon = definition.icon;

                      return (
                        <article key={event.id} className="relative flex gap-3 sm:gap-4">
                          <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border sm:h-[52px] sm:w-[52px] ${getEventStyle(event.event_type)}`}>
                            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                          </span>

                          <div className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-slate-200 hover:bg-white">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-sm font-bold text-slate-950">
                                    {formatMoment(event)}
                                  </span>
                                  <Badge variant="outline" className={getEventStyle(event.event_type)}>
                                    {definition.label}
                                  </Badge>
                                  {event.team_side === 'home' && <Badge variant="outline">Casa</Badge>}
                                  {event.team_side === 'away' && <Badge variant="outline">Visitante</Badge>}
                                  {event.score_home != null && event.score_away != null && (
                                    <Badge className="bg-slate-950 text-white">
                                      {event.score_home} - {event.score_away}
                                    </Badge>
                                  )}
                                </div>

                                {event.player_name && (
                                  <p className="mt-2 flex items-center gap-2 font-semibold text-slate-950">
                                    <UserRound className="h-4 w-4 text-primary" />
                                    {event.player_name}
                                  </p>
                                )}

                                {event.secondary_player_name && (
                                  <p className="mt-1 text-sm text-slate-600">
                                    {event.event_type === 'substitution' ? 'Entra: ' : 'Assistência: '}
                                    <strong>{event.secondary_player_name}</strong>
                                  </p>
                                )}

                                {event.notes && (
                                  <p className="mt-2 text-sm leading-6 text-slate-600">{event.notes}</p>
                                )}
                              </div>

                              {canEdit && (
                                <div className="flex shrink-0 gap-2">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    className="h-9 w-9 rounded-xl"
                                    onClick={() => openEditForm(event)}
                                    aria-label="Editar acontecimento"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    className="h-9 w-9 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                                    disabled={deletingId === event.id}
                                    onClick={() => deleteEvent(event.id)}
                                    aria-label="Eliminar acontecimento"
                                  >
                                    {deletingId === event.id
                                      ? <Loader2 className="h-4 w-4 animate-spin" />
                                      : <Trash2 className="h-4 w-4" />}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-sm leading-6">
          A eliminação de um acontecimento não altera ainda o resultado oficial nem as estatísticas individuais.
        </p>
      </div>
    </div>
  );
}
