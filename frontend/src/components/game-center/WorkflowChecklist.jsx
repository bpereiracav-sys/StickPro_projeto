import { Bot, CheckCircle2, Circle, ClipboardCheck, FileCheck2, Flag, MessageSquareText, ShieldCheck, Star, Users } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const STAGE_INDEX = { draft: 0, convocation: 1, lineup: 2, ready: 3, live: 4, finished: 5, stats: 6, assistant: 7, evaluation: 8, feedback: 9, closed: 10 };
const ITEMS = [
  { key: 'convocation', label: 'Convocatória', requiredStage: 'convocation', icon: Users },
  { key: 'lineup', label: 'Cinco inicial', requiredStage: 'lineup', icon: ShieldCheck },
  { key: 'result', label: 'Resultado', requiredStage: 'finished', icon: Flag },
  { key: 'stats', label: 'Estatísticas', requiredStage: 'stats', icon: ClipboardCheck },
  { key: 'assistant', label: 'Assistente Técnico', requiredStage: 'assistant', icon: Bot },
  { key: 'evaluation', label: 'Avaliações', requiredStage: 'evaluation', icon: Star },
  { key: 'feedback', label: 'Feedback', requiredStage: 'feedback', icon: MessageSquareText },
  { key: 'closed', label: 'Jogo encerrado', requiredStage: 'closed', icon: FileCheck2 },
];

export default function WorkflowChecklist({ workflow }) {
  const stage = workflow?.stage || 'draft';
  const currentIndex = STAGE_INDEX[stage] ?? 0;
  const completedCount = ITEMS.filter((item) => currentIndex >= STAGE_INDEX[item.requiredStage]).length;
  return (
    <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-heading text-xl font-semibold tracking-tight text-slate-950">Checklist operacional</CardTitle>
          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">{completedCount}/{ITEMS.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const completed = currentIndex >= STAGE_INDEX[item.requiredStage];
          return (
            <div key={item.key} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${completed ? 'border-emerald-100 bg-emerald-50/70' : 'border-slate-100 bg-slate-50/70'}`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${completed ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-400'}`}><Icon className="h-4 w-4" /></span>
              <p className={`min-w-0 flex-1 truncate text-sm font-semibold ${completed ? 'text-emerald-900' : 'text-slate-700'}`}>{item.label}</p>
              {completed ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <Circle className="h-5 w-5 shrink-0 text-slate-300" />}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
