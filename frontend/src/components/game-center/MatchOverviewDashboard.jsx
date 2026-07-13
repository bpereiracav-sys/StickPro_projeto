import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';

import { Badge } from '../ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'default',
}) {
  const toneClasses = {
    default: 'bg-slate-50 text-slate-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    info: 'bg-cyan-50 text-cyan-700',
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {label}
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-950">
            {value}
          </p>

          {helper && (
            <p className="mt-1 text-xs text-slate-400">
              {helper}
            </p>
          )}
        </div>

        <span
          className={[
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
            toneClasses[tone] || toneClasses.default,
          ].join(' ')}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function getRegisteredPlayers(existingStats = []) {
  return existingStats.filter((stat) => {
    return (
      stat.started_match ||
      stat.goals > 0 ||
      stat.own_goals > 0 ||
      stat.saves > 0 ||
      stat.penalties_scored > 0 ||
      stat.penalties_missed > 0 ||
      stat.free_kicks_scored > 0 ||
      stat.free_kicks_missed > 0 ||
      stat.yellow_cards > 0 ||
      stat.blue_cards > 0 ||
      stat.red_cards > 0
    );
  }).length;
}

export default function MatchOverviewDashboard({
  match,
  members = [],
  existingStats = [],
  technicalAssistant,
  canManageEvents = false,
}) {
  const registeredPlayers = getRegisteredPlayers(existingStats);
  const totalPlayers = members.length;
  const gamesheetImported = Boolean(match?.gamesheet_url);
  const assistantAvailable = Boolean(technicalAssistant);

  const preparationItems = [
    {
      label: 'Line-up',
      completed: registeredPlayers > 0,
      helper:
        registeredPlayers > 0
          ? `${registeredPlayers} atleta(s) com dados`
          : 'Ainda sem atletas registados',
    },
    {
      label: 'Boletim oficial',
      completed: gamesheetImported,
      helper: gamesheetImported
        ? 'Boletim importado'
        : 'Importação pendente',
    },
    {
      label: 'Assistente Técnico',
      completed: assistantAvailable,
      helper: assistantAvailable
        ? 'Análise disponível'
        : 'Ainda sem análise',
    },
    {
      label: 'Resultado',
      completed: Boolean(match?.is_completed),
      helper: match?.is_completed
        ? 'Resultado validado'
        : 'Jogo ainda por disputar',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Atletas da equipa"
          value={totalPlayers}
          helper="Disponíveis no Match Center"
          icon={Users}
          tone="info"
        />

        <MetricCard
          label="Com dados registados"
          value={registeredPlayers}
          helper={
            totalPlayers > 0
              ? `${registeredPlayers}/${totalPlayers} atletas`
              : 'Sem atletas'
          }
          icon={ShieldCheck}
          tone={registeredPlayers > 0 ? 'success' : 'warning'}
        />

        <MetricCard
          label="Boletim"
          value={gamesheetImported ? 'Importado' : 'Pendente'}
          helper="APL/FPP"
          icon={FileSpreadsheet}
          tone={gamesheetImported ? 'success' : 'warning'}
        />

        <MetricCard
          label="Assistente"
          value={assistantAvailable ? 'Disponível' : 'Pendente'}
          helper="Análise técnica"
          icon={Sparkles}
          tone={assistantAvailable ? 'success' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm lg:col-span-2">
          <CardHeader className="border-b border-slate-100 p-5 sm:p-6">
            <CardTitle className="flex items-center gap-2 font-heading text-xl font-semibold tracking-tight">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Estado de preparação
            </CardTitle>
          </CardHeader>

          <CardContent className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
            {preparationItems.map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
              >
                <span
                  className={[
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    item.completed
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-amber-50 text-amber-600',
                  ].join(' ')}
                >
                  {item.completed ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                </span>

                <div>
                  <p className="font-semibold text-slate-900">
                    {item.label}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {item.helper}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-cyan-50/60 shadow-sm">
          <CardHeader className="border-b border-slate-100 p-5 sm:p-6">
            <CardTitle className="flex items-center gap-2 font-heading text-xl font-semibold tracking-tight">
              <Star className="h-5 w-5 text-primary" />
              Próximas ações
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 p-5 sm:p-6">
            <div className="rounded-2xl bg-white/85 p-4">
              <p className="font-semibold text-slate-900">
                {match?.is_completed
                  ? 'Validar dados pós-jogo'
                  : 'Preparar o encontro'}
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                {match?.is_completed
                  ? 'Confirme estatísticas, boletim e análise técnica.'
                  : 'Complete line-up, convocatória e documentação antes do jogo.'}
              </p>
            </div>

            <div className="rounded-2xl bg-white/85 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">
                  Modo de utilização
                </span>

                <Badge
                  variant="outline"
                  className={
                    canManageEvents
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }
                >
                  {canManageEvents ? 'Gestão' : 'Consulta'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
