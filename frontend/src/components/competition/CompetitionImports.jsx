import { TabsContent } from '../ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react';

function SyncCard({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  disabled = false,
  statusLabel,
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>

        <Badge
          variant="outline"
          className="border-emerald-200 bg-emerald-50 text-emerald-700"
        >
          {statusLabel}
        </Badge>
      </div>

      <h3 className="mt-4 font-heading text-lg font-semibold text-slate-950">
        {title}
      </h3>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <Button
        type="button"
        variant="outline"
        className="mt-4 w-full justify-start rounded-xl"
        onClick={onAction}
        disabled={disabled}
      >
        {actionLabel}
      </Button>
    </div>
  );
}

export default function CompetitionImports({
  canCreateGames = false,
  canImportGamesheet = false,
  onImportMatches,
  onImportTeams,
  onImportCalendar,
  matchesCount = 0,
  teamsCount = 0,
  importedGamesheets = 0,
}) {
  return (
    <TabsContent
      value="imports"
      className="space-y-6"
    >
      <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-md">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-cyan-50/50 p-5 sm:p-6">
          <CardTitle className="flex items-center gap-2 font-heading text-xl font-semibold tracking-tight">
            <RefreshCw className="h-5 w-5 text-primary" />
            Centro de Sincronização
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Jogos
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-950">
                {matchesCount}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Equipas
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-950">
                {teamsCount}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Boletins
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-950">
                {importedGamesheets}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <SyncCard
              title="Jogos por ficheiro"
              description="Importa jornadas e jogos através de Excel ou CSV."
              icon={FileSpreadsheet}
              actionLabel="Importar jogos"
              onAction={onImportMatches}
              disabled={!canCreateGames}
              statusLabel="Disponível"
            />

            <SyncCard
              title="Equipas participantes"
              description="Importa equipas, pavilhões e informação base."
              icon={Users}
              actionLabel="Importar equipas"
              onAction={onImportTeams}
              disabled={!canImportGamesheet}
              statusLabel="Disponível"
            />

            <SyncCard
              title="Calendário APL/FPP"
              description="Prepara a importação inteligente através do URL oficial."
              icon={Upload}
              actionLabel="Importar calendário APL/FPP"
              onAction={onImportCalendar}
              disabled={!canImportGamesheet}
              statusLabel="Assistido"
            />
          </div>

          <div className="mt-5 grid gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4 sm:grid-cols-3">
            <div className="flex items-center gap-2 text-sm text-cyan-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Validação antes de gravar
            </div>

            <div className="flex items-center gap-2 text-sm text-cyan-900">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Dados preservados
            </div>

            <div className="flex items-center gap-2 text-sm text-cyan-900">
              <Clock3 className="h-4 w-4 text-amber-600" />
              Sincronização automática: próxima fase
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
