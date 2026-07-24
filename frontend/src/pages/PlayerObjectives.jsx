import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Edit3, Loader2, Plus, Save, Target, Trash2, TrendingUp, UserRound, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import { usePermissions } from '../context/PermissionsContext';
import { evaluationsApi, teamsApi } from '../services/api';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const EMPTY_FORM = { criterion_id: '', title: '', description: '', target_value: '4', target_date: '', status: 'active' };
const collection = (p) => Array.isArray(p) ? p : Array.isArray(p?.items) ? p.items : Array.isArray(p?.data) ? p.data : Array.isArray(p?.results) ? p.results : [];
const playerName = (p) => p?.name || p?.full_name || p?.display_name || [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Atleta';
const evaluationDate = (e) => e?.evaluation_date || e?.created_at || e?.date || e?.updated_at || null;
const formatDate = (value) => {
  if (!value) return 'Sem prazo';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sem prazo' : date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
};
const criterionScores = (evaluation) => {
  const raw = evaluation?.criteria_scores || evaluation?.scores || evaluation?.results || evaluation?.criteria || [];
  if (Array.isArray(raw)) return raw.map((item, index) => ({
    id: item?.criterion_id || item?.id || item?.code || `${evaluation?.id || 'evaluation'}-${index}`,
    name: item?.criterion_name || item?.name || item?.criterion?.name || `Critério ${index + 1}`,
    score: Number(item?.score ?? item?.value),
  }));
  return Object.entries(raw || {}).map(([id, value]) => ({ id, name: value?.name || id, score: Number(value?.score ?? value?.value ?? value) }));
};
const statusInfo = (status) => ({
  completed: ['Concluído', 'border-emerald-200 bg-emerald-50 text-emerald-700'],
  paused: ['Pausado', 'border-amber-200 bg-amber-50 text-amber-700'],
  cancelled: ['Cancelado', 'border-slate-200 bg-slate-100 text-slate-600'],
  active: ['Em curso', 'border-cyan-200 bg-cyan-50 text-cyan-700'],
}[status] || ['Em curso', 'border-cyan-200 bg-cyan-50 text-cyan-700']);

function ObjectiveCard({ item, canManage, onEdit, onDelete, onComplete }) {
  const [statusLabel, statusClass] = statusInfo(item.status);
  const overdue = item.status === 'active' && item.target_date && new Date(item.target_date) < new Date();
  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant="outline" className={statusClass}>{statusLabel}</Badge>
              {overdue && <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Prazo ultrapassado</Badge>}
            </div>
            <h3 className="font-heading text-xl text-slate-950">{item.title}</h3>
            <p className="mt-1 text-sm font-medium text-cyan-700">{item.criterion?.name || item.criterion_name || 'Critério'}</p>
            {item.description && <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>}
          </div>
          {canManage && <div className="flex gap-2">
            <Button size="icon" variant="outline" className="h-9 w-9 rounded-xl" onClick={() => onEdit(item)}><Edit3 className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" className="h-9 w-9 rounded-xl text-red-600" onClick={() => onDelete(item)}><Trash2 className="h-4 w-4" /></Button>
          </div>}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs uppercase text-slate-400">Valor atual</p><p className="font-heading text-2xl">{Number.isFinite(item.currentValue) ? item.currentValue.toFixed(1) : '—'}</p></div>
          <div className="rounded-2xl bg-cyan-50 p-3"><p className="text-xs uppercase text-cyan-600">Meta</p><p className="font-heading text-2xl">{Number(item.target_value).toFixed(1)}</p></div>
          <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs uppercase text-slate-400">Prazo</p><p className="font-semibold">{formatDate(item.target_date)}</p></div>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-sm"><span className="font-semibold text-slate-700">Progresso</span><span className="font-heading text-xl text-cyan-700">{Math.round(item.progress)}%</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${item.progress}%` }} /></div>
        </div>
        {canManage && item.status === 'active' && item.progress >= 100 && <Button variant="outline" className="mt-4 rounded-full border-emerald-200 bg-emerald-50 text-emerald-700" onClick={() => onComplete(item)}><CheckCircle2 className="mr-2 h-4 w-4" />Marcar como concluído</Button>}
      </CardContent>
    </Card>
  );
}

export default function PlayerObjectives() {
  const { t } = useLanguage();
  const permissions = usePermissions();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]), [players, setPlayers] = useState([]), [criteria, setCriteria] = useState([]), [evaluations, setEvaluations] = useState([]), [objectives, setObjectives] = useState([]);
  const [teamId, setTeamId] = useState(''), [playerId, setPlayerId] = useState(''), [statusFilter, setStatusFilter] = useState('all');
  const [loadingTeams, setLoadingTeams] = useState(true), [loadingPlayers, setLoadingPlayers] = useState(false), [loadingData, setLoadingData] = useState(false), [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false), [editingId, setEditingId] = useState(''), [form, setForm] = useState(EMPTY_FORM);
  const tr = (key, fallback) => { const value = t(key); return value && value !== key ? value : fallback; };
  const canView = permissions?.isAdmin || permissions?.isStaff || permissions?.canManageTeam || permissions?.canCreateEvaluations || permissions?.hasPermission?.('create_evaluations');
  const canManage = canView;

  useEffect(() => { (async () => { try { setTeams(collection((await teamsApi.getAll())?.data)); } catch (e) { toast.error(e.response?.data?.detail || 'Erro ao carregar equipas'); } finally { setLoadingTeams(false); } })(); }, []);
  useEffect(() => {
    if (!teamId) { setPlayers([]); setCriteria([]); setPlayerId(''); return; }
    (async () => { setLoadingPlayers(true); setPlayerId(''); try {
      const [p, c] = await Promise.all([evaluationsApi.getTeamPlayers(teamId), evaluationsApi.getCriteria({ team_id: teamId })]);
      setPlayers(collection(p?.data)); setCriteria(collection(c?.data).filter((x) => x?.is_active !== false));
    } catch (e) { toast.error(e.response?.data?.detail || 'Erro ao carregar atletas e critérios'); } finally { setLoadingPlayers(false); } })();
  }, [teamId]);

  const loadPlayer = async (id) => {
    setLoadingData(true);
    try {
      const [e, o] = await Promise.all([evaluationsApi.getPlayerEvaluations(id), evaluationsApi.getPlayerObjectives(id)]);
      setEvaluations(collection(e?.data)); setObjectives(collection(o?.data));
    } catch (err) { toast.error(err.response?.data?.detail || 'Erro ao carregar objetivos'); setEvaluations([]); setObjectives([]); }
    finally { setLoadingData(false); }
  };
  useEffect(() => { if (playerId) loadPlayer(playerId); else { setEvaluations([]); setObjectives([]); } }, [playerId]);

  const criteriaMap = useMemo(() => new Map(criteria.map((c) => [c.id, c])), [criteria]);
  const latest = useMemo(() => {
    const map = new Map();
    [...evaluations].sort((a,b) => new Date(evaluationDate(b)||0) - new Date(evaluationDate(a)||0)).forEach((e) => criterionScores(e).forEach((s) => { if (Number.isFinite(s.score) && !map.has(s.id)) map.set(s.id, s.score); }));
    return map;
  }, [evaluations]);
  const enriched = useMemo(() => objectives.map((o) => {
    const criterion = criteriaMap.get(o.criterion_id), currentValue = latest.get(o.criterion_id), target = Number(o.target_value), baseline = Number(o.baseline_value ?? criterion?.scale_min ?? 1);
    let progress = 0; if (Number.isFinite(currentValue) && Number.isFinite(target)) progress = target <= baseline ? (currentValue >= target ? 100 : 0) : ((currentValue - baseline)/(target-baseline))*100;
    return { ...o, criterion, currentValue, progress: Math.max(0, Math.min(100, progress)) };
  }), [objectives, criteriaMap, latest]);
  const visible = statusFilter === 'all' ? enriched : enriched.filter((o) => o.status === statusFilter);
  const stats = useMemo(() => { const active = enriched.filter((o) => o.status === 'active'), completed = enriched.filter((o) => o.status === 'completed'); return { total: enriched.length, active: active.length, completed: completed.length, progress: active.length ? active.reduce((s,o)=>s+o.progress,0)/active.length : 0 }; }, [enriched]);
  const selectedPlayer = players.find((p) => p.id === playerId), selectedTeam = teams.find((t) => t.id === teamId);

  const closeForm = () => { setFormOpen(false); setEditingId(''); setForm(EMPTY_FORM); };
  const createForm = () => { setEditingId(''); setForm(EMPTY_FORM); setFormOpen(true); };
  const editForm = (o) => { setEditingId(o.id); setForm({ criterion_id:o.criterion_id||'', title:o.title||'', description:o.description||'', target_value:String(o.target_value??4), target_date:o.target_date?String(o.target_date).slice(0,10):'', status:o.status||'active' }); setFormOpen(true); };
  const save = async () => {
    if (!form.criterion_id) return toast.error('Seleciona um critério.');
    const criterion = criteriaMap.get(form.criterion_id), target = Number(form.target_value), min = Number(criterion?.scale_min ?? 1), max = Number(criterion?.scale_max ?? 5);
    if (!Number.isFinite(target) || target < min || target > max) return toast.error(`A meta deve estar entre ${min} e ${max}.`);
    const payload = { player_id:playerId, team_id:teamId, criterion_id:form.criterion_id, title:form.title.trim() || `Desenvolver ${criterion?.name || 'competência'}`, description:form.description.trim() || null, target_value:target, baseline_value:Number.isFinite(latest.get(form.criterion_id)) ? latest.get(form.criterion_id) : min, target_date:form.target_date || null, status:form.status };
    setSaving(true); try { editingId ? await evaluationsApi.updateObjective(editingId,payload) : await evaluationsApi.createObjective(payload); toast.success(editingId?'Objetivo atualizado.':'Objetivo criado.'); closeForm(); await loadPlayer(playerId); } catch(e) { toast.error(e.response?.data?.detail || 'Erro ao guardar objetivo'); } finally { setSaving(false); }
  };
  const remove = async (o) => { if (!window.confirm(`Eliminar o objetivo "${o.title}"?`)) return; try { await evaluationsApi.deleteObjective(o.id); toast.success('Objetivo eliminado.'); await loadPlayer(playerId); } catch(e) { toast.error(e.response?.data?.detail || 'Erro ao eliminar objetivo'); } };
  const complete = async (o) => { try { await evaluationsApi.updateObjective(o.id,{status:'completed'}); toast.success('Objetivo concluído.'); await loadPlayer(playerId); } catch(e) { toast.error(e.response?.data?.detail || 'Erro ao concluir objetivo'); } };

  if (!canView) return <Card className="border-amber-100 bg-amber-50"><CardContent className="p-6 text-amber-800">Sem permissão para consultar objetivos.</CardContent></Card>;
  return <div className="space-y-5 pb-20 pt-1 lg:-mt-12 lg:pb-0" data-testid="player-objectives-page">
    <section className="overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-slate-950 p-5 text-white shadow-xl sm:p-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/development-center')} className="mb-4 -ml-2 text-slate-300 hover:bg-white/10 hover:text-white"><ArrowLeft className="mr-2 h-4 w-4" />{tr('developmentCenter.title','Centro de Desenvolvimento')}</Button>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><Badge className="mb-3 border-white/15 bg-white/10 text-white"><Target className="mr-1.5 h-3.5 w-3.5" />Plano Individual de Desenvolvimento</Badge><h1 className="font-heading text-3xl sm:text-5xl">Objetivos Individuais</h1><p className="mt-2 max-w-2xl text-slate-300">Define metas por competência e acompanha automaticamente o progresso de cada atleta.</p></div><div className="flex gap-2"><Button asChild variant="outline" className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"><Link to="/evaluations/history"><TrendingUp className="mr-2 h-4 w-4" />Histórico</Link></Button>{canManage&&playerId&&<Button onClick={createForm} className="rounded-full bg-cyan-500 hover:bg-cyan-600"><Plus className="mr-2 h-4 w-4" />Novo objetivo</Button>}</div></div>
    </section>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-cyan-600" />Selecionar atleta</CardTitle><CardDescription>Escolhe a equipa e o atleta.</CardDescription></CardHeader><CardContent className="grid gap-3 lg:grid-cols-2"><Select value={teamId} onValueChange={setTeamId} disabled={loadingTeams}><SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder="Selecionar equipa" /></SelectTrigger><SelectContent className="bg-white">{teams.map((x)=><SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select><Select value={playerId} onValueChange={setPlayerId} disabled={!teamId||loadingPlayers}><SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder={loadingPlayers?'A carregar...':'Selecionar atleta'} /></SelectTrigger><SelectContent className="bg-white">{players.map((x)=><SelectItem key={x.id} value={x.id}>{playerName(x)}</SelectItem>)}</SelectContent></Select></CardContent></Card>
    {playerId&&<><Card className="border-cyan-100 bg-gradient-to-br from-white via-cyan-50/60 to-slate-50"><CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-3"><div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-cyan-600 text-white"><UserRound /></div><div><p className="text-sm text-cyan-700">{selectedTeam?.name}</p><h2 className="font-heading text-2xl">{playerName(selectedPlayer)}</h2></div></div><div className="grid grid-cols-4 gap-2 text-center">{[['Total',stats.total],['Em curso',stats.active],['Concluídos',stats.completed],['Progresso',`${Math.round(stats.progress)}%`]].map(([l,v])=><div key={l} className="rounded-2xl bg-white/80 p-3"><p className="text-xs text-slate-500">{l}</p><p className="font-heading text-2xl">{v}</p></div>)}</div></CardContent></Card>
    {formOpen&&<Card className="border-cyan-200"><CardHeader><div className="flex justify-between"><div><CardTitle>{editingId?'Editar objetivo':'Novo objetivo'}</CardTitle><CardDescription>Associa a meta a um critério de avaliação.</CardDescription></div><Button size="icon" variant="ghost" onClick={closeForm}><X /></Button></div></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 lg:grid-cols-2"><div><Label>Critério</Label><Select value={form.criterion_id} onValueChange={(v)=>setForm({...form,criterion_id:v})}><SelectTrigger className="mt-2 h-12 rounded-2xl"><SelectValue placeholder="Selecionar critério" /></SelectTrigger><SelectContent className="bg-white">{criteria.map((c)=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Título</Label><Input className="mt-2 h-12 rounded-2xl" value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} /></div></div><div><Label>Descrição</Label><Textarea className="mt-2 rounded-2xl" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} /></div><div className="grid gap-4 sm:grid-cols-3"><div><Label>Meta</Label><Input type="number" step="0.1" className="mt-2 h-12 rounded-2xl" value={form.target_value} onChange={(e)=>setForm({...form,target_value:e.target.value})} /></div><div><Label>Prazo</Label><Input type="date" className="mt-2 h-12 rounded-2xl" value={form.target_date} onChange={(e)=>setForm({...form,target_date:e.target.value})} /></div><div><Label>Estado</Label><Select value={form.status} onValueChange={(v)=>setForm({...form,status:v})}><SelectTrigger className="mt-2 h-12 rounded-2xl"><SelectValue /></SelectTrigger><SelectContent className="bg-white"><SelectItem value="active">Em curso</SelectItem><SelectItem value="paused">Pausado</SelectItem><SelectItem value="completed">Concluído</SelectItem><SelectItem value="cancelled">Cancelado</SelectItem></SelectContent></Select></div></div><div className="flex justify-end gap-3"><Button variant="outline" className="rounded-full" onClick={closeForm}>Cancelar</Button><Button className="rounded-full bg-cyan-600" onClick={save} disabled={saving}>{saving?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Save className="mr-2 h-4 w-4"/>}Guardar</Button></div></CardContent></Card>}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-heading text-2xl">Plano individual</h2><p className="text-sm text-slate-500">Progresso calculado pela avaliação mais recente.</p></div><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[180px] rounded-full bg-white"><SelectValue /></SelectTrigger><SelectContent className="bg-white"><SelectItem value="all">Todos</SelectItem><SelectItem value="active">Em curso</SelectItem><SelectItem value="completed">Concluídos</SelectItem><SelectItem value="paused">Pausados</SelectItem><SelectItem value="cancelled">Cancelados</SelectItem></SelectContent></Select></div>
    {loadingData?<div className="flex min-h-[260px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-600"/></div>:visible.length===0?<Card className="border-dashed bg-slate-50"><CardContent className="flex min-h-[260px] flex-col items-center justify-center text-center"><Target className="mb-3 h-14 w-14 text-slate-300"/><h3 className="font-heading text-2xl">Ainda não existem objetivos</h3>{canManage&&<Button className="mt-4 rounded-full bg-cyan-600" onClick={createForm}><Plus className="mr-2 h-4 w-4"/>Criar objetivo</Button>}</CardContent></Card>:<div className="grid gap-4 xl:grid-cols-2">{visible.map((o)=><ObjectiveCard key={o.id} item={o} canManage={canManage} onEdit={editForm} onDelete={remove} onComplete={complete}/>)}</div>}</>}
  </div>;
}
