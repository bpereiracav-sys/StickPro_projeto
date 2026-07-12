import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { TabsContent } from '../ui/tabs';
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  FileDown,
  ListChecks,
  Plus,
  ShieldCheck,
  Trophy,
  Upload,
} from 'lucide-react';
import { formatDate, formatTime } from '../../lib/utils';

function getMatchTeams(match, team) {
  const fallbackTeamName = team?.name || 'Equipa';

  const clubSide =
    match?.club_side ||
    (match?.location === 'fora' ? 'away' : 'home');

  const homeTeam =
    match?.home_team ||
    (clubSide === 'home' ? fallbackTeamName : match?.opponent_team);

  const awayTeam =
    match?.away_team ||
    (clubSide === 'away' ? fallbackTeamName : match?.opponent_team);

  return {
    homeTeam: homeTeam || fallbackTeamName,
    awayTeam: awayTeam || match?.opponent_team || 'Adversário',
  };
}

export default function CompetitionOverview({
  nextMatch,
  lastCompletedMatch,
  team,
  pendingMatches,
  matches,
  competitionTeams,
  standings,
  canEditGames,
  canEditResults,
  canImportGamesheet,
  canCreateGames = false,
  onAddMatch,
  onImportMatches,
  onImportCalendar,
}) {
  const missingGamesheets = matches.filter(
    (match) => !match.gamesheet_url && match.is_completed
  ).length;

  const nextTeams = nextMatch
    ? getMatchTeams(nextMatch, team)
    : null;

  const lastTeams = lastCompletedMatch
    ? getMatchTeams(lastCompletedMatch, team)
    : null;

  return (
    <TabsContent value="summary" className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden border-white/70 bg-white/95 shadow-lg shadow-slate-200/70 lg:col-span-2">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 font-heading text-xl tracking-tight">
              <Calendar className="h-5 w-5 text-primary" />
              Próximo jogo
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5">
            {nextMatch ? (
              <div className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50/80 to-white p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-cyan-800">
                      {formatDate(nextMatch.match_date)} ·{' '}
                      {formatTime(nextMatch.match_date)}
                    </p>

                    <p className="mt-2 truncate text-lg font-semibold text-slate-950">
                      {nextTeams.homeTeam} vs {nextTeams.awayTeam}
                    </p>

                    {nextMatch.venue && (
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {nextMatch.venue}
                      </p>
                    )}
                  </div>

                  <Badge
                    variant="outline"
                    className="w-fit border-cyan-200 bg-white text-cyan-800"
                  >
                    Jornada {nextMatch.matchday || '-'}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-700">
                  Não existem jogos futuros agendados.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-white/70 bg-white/95 shadow-lg shadow-slate-200/70">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 font-heading text-xl tracking-tight">
              <Trophy className="h-5 w-5 text-primary" />
              Último resultado
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5">
            {lastCompletedMatch ? (
              <div>
                <p className="text-sm text-slate-500">
                  {formatDate(lastCompletedMatch.match_date)}
                </p>

                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {lastTeams.homeTeam} vs {lastTeams.awayTeam}
                </p>

                <p className="mt-3 font-heading text-4xl font-bold text-slate-950">
                  {lastCompletedMatch.home_score ?? 0}
                  <span className="mx-2 text-slate-300">–</span>
                  {lastCompletedMatch.away_score ?? 0}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center">
                <Trophy className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-700">
                  Ainda não existem resultados registados.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-white/70 bg-gradient-to-br from-white to-cyan-50/70 shadow-md shadow-slate-200/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4 text-primary" />
              Pendências
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
              <span className="text-slate-500">Jogos por realizar</span>
              <strong className="text-slate-950">{pendingMatches}</strong>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
              <span className="text-slate-500">Boletins em falta</span>
              <strong className="text-slate-950">{missingGamesheets}</strong>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
              <span className="text-slate-500">Equipas registadas</span>
              <strong className="text-slate-950">
                {competitionTeams.length}
              </strong>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-gradient-to-br from-white to-amber-50/70 shadow-md shadow-slate-200/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-amber-600" />
              Classificação
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-2 text-sm">
            {standings.slice(0, 3).map((row, index) => (
              <div
                key={row.team}
                className="flex items-center justify-between rounded-xl bg-white/85 px-3 py-2"
              >
                <span className="min-w-0 truncate text-slate-700">
                  {index + 1}. {row.team}
                </span>

                <strong className="ml-3 shrink-0 text-slate-950">
                  {row.points ?? 0} pts
                </strong>
              </div>
            ))}

            {standings.length === 0 && (
              <p className="text-sm text-slate-500">
                Sem dados de classificação.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-gradient-to-br from-white to-slate-50 shadow-md shadow-slate-200/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Ações rápidas
            </CardTitle>
          </CardHeader>

          <CardContent className="grid gap-2">
            {canCreateGames && (
              <Button
                type="button"
                variant="outline"
                className="justify-start rounded-xl"
                onClick={onAddMatch}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar jogo
              </Button>
            )}

            {canCreateGames && (
              <Button
                type="button"
                variant="outline"
                className="justify-start rounded-xl"
                onClick={onImportMatches}
              >
                <Upload className="mr-2 h-4 w-4" />
                Importar jogos
              </Button>
            )}

            {canImportGamesheet && (
              <Button
                type="button"
                variant="outline"
                className="justify-start rounded-xl"
                onClick={onImportCalendar}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Importar calendário APL/FPP
              </Button>
            )}

            {!canCreateGames && !canImportGamesheet && (
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-3 text-sm text-slate-500">
                <CheckCircle2 className="h-4 w-4" />
                Perfil em modo de consulta
              </div>
            )}

            <div className="mt-1 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <Badge variant={canEditGames ? 'default' : 'outline'}>
                {canEditGames ? 'Edita jogos' : 'Só leitura'}
              </Badge>

              <Badge variant={canEditResults ? 'default' : 'outline'}>
                {canEditResults
                  ? 'Edita resultados'
                  : 'Resultados bloqueados'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
