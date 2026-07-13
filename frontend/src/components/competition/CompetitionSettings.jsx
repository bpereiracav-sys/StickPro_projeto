import { TabsContent } from '../ui/tabs';import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  CalendarDays,
  CheckCircle2,
  Cog,
  Database,
  Loader2,
  ShieldCheck,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

function InfoCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>

      <p className="mt-2 font-semibold text-slate-950">
        {value || '—'}
      </p>
    </div>
  );
}

export default function CompetitionSettings({
  championship,
  team,
  canEditCompetition,
  isAdmin,
  fixingHomeAway,
  onFixHomeAway,
}) {
  const rules = championship?.competition_rules || {};
  const gameFormat = rules.game_format || 'normal';

  const gameFormatLabel =
    gameFormat === 'rtp'
      ? 'Regulamento Técnico-Pedagógico'
      : gameFormat === 'apl_cup'
        ? 'Taça APL Lisboa'
        : gameFormat === 'custom'
          ? 'Personalizado'
          : 'Jogo normal';

  return (
    <TabsContent value="settings" className="space-y-6">
      <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-md">
        <CardHeader className="border-b border-slate-100 p-5 sm:p-6">
          <CardTitle className="flex items-center gap-2 font-heading text-xl font-semibold tracking-tight">
            <Cog className="h-5 w-5 text-primary" />
            Centro Técnico
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="Competição" value={championship?.name} icon={Trophy} />
            <InfoCard label="Equipa" value={team?.name || championship?.team_name} icon={Users} />
            <InfoCard label="Época" value={championship?.season} icon={CalendarDays} />
            <InfoCard label="Formato" value={championship?.format || '5x5'} icon={Database} />
            <InfoCard label="Modelo de jogo" value={gameFormatLabel} icon={ShieldCheck} />
            <InfoCard
              label="Convocatória"
              value={
                championship?.convocation_type === 'automatica'
                  ? 'Automática'
                  : 'Manual'
              }
              icon={CheckCircle2}
            />
            <InfoCard
              label="Segmentos"
              value={rules.segments_count || 2}
              icon={Zap}
            />
            <InfoCard
              label="Modo"
              value={
                canEditCompetition
                  ? 'Editável para este perfil'
                  : 'Apenas visualização'
              }
              icon={Cog}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={
                rules.mandatory_participation
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }
            >
              {rules.mandatory_participation
                ? 'Participação obrigatória'
                : 'Gestão livre'}
            </Badge>

            <Badge
              variant="outline"
              className="border-cyan-200 bg-cyan-50 text-cyan-700"
            >
              {rules.automatic_validation === false
                ? 'Validação manual'
                : 'Validação automática'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="rounded-3xl border border-amber-200 bg-gradient-to-br from-white to-amber-50/70 shadow-sm transition-all duration-300 hover:shadow-md">
          <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
            <CardTitle className="font-heading text-xl font-semibold tracking-tight">
              Manutenção da competição
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
            <Button
              type="button"
              variant="outline"
              onClick={onFixHomeAway}
              disabled={fixingHomeAway}
              className="border-amber-300 bg-white text-amber-800 hover:bg-amber-50"
            >
              {fixingHomeAway ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A corrigir jogos...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Corrigir Casa/Fora dos jogos existentes
                </>
              )}
            </Button>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              A operação preserva resultados, estatísticas, convocatórias,
              line-ups e boletins já registados.
            </p>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}

