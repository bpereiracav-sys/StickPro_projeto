import { Badge } from '../ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { TabsContent } from '../ui/tabs';
import { Calendar, Trophy } from 'lucide-react';
import { formatDate, formatTime } from '../../lib/utils';

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
}) {
  const missingGamesheets = matches.filter(
    (match) => !match.gamesheet_url && match.is_completed
  ).length;

  return (
    <TabsContent value="summary" className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden border-white/70 bg-white/90 shadow-lg shadow-slate-200/70 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-xl tracking-tight">
              <Calendar className="h-5 w-5 text-primary" />
              Próximo jogo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextMatch ? (
              <div className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(nextMatch.match_date)} · {formatTime(nextMatch.match_date)}
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {nextMatch.is_club_match === false
                        ? nextMatch.home_team
                        : team?.name}{' '}
                      vs {nextMatch.opponent_team}
                    </p>
                    {nextMatch.venue && (
                      <p className="mt-1 text-sm text-muted-foreground">{nextMatch.venue}</p>
                    )}
                  </div>
                  <Badge variant="outline">Jornada {nextMatch.matchday || '-'}</Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Não existem jogos futuros agendados.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-white/70 bg-white/90 shadow-lg shadow-slate-200/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-xl tracking-tight">
              <Trophy className="h-5 w-5 text-primary" />
              Último resultado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastCompletedMatch ? (
              <div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(lastCompletedMatch.match_date)}
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {lastCompletedMatch.is_club_match === false
                    ? lastCompletedMatch.home_team
                    : team?.name}{' '}
                  vs {lastCompletedMatch.opponent_team}
                </p>
                <p className="mt-2 font-heading text-3xl">
                  {lastCompletedMatch.home_score} - {lastCompletedMatch.away_score}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ainda não existem resultados registados.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-white/70 bg-gradient-to-br from-white to-cyan-50/70 shadow-md shadow-slate-200/70">
          <CardHeader>
            <CardTitle className="text-base">Pendências</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{pendingMatches} jogos por realizar.</p>
            <p>{missingGamesheets} jogos realizados sem boletim importado.</p>
            <p>
              {competitionTeams.length === 0
                ? 'Ainda não existem equipas participantes registadas.'
                : 'Equipas participantes registadas.'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-gradient-to-br from-white to-amber-50/70 shadow-md shadow-slate-200/70">
          <CardHeader>
            <CardTitle className="text-base">Classificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {standings.slice(0, 3).map((row, index) => (
              <div
                key={row.team}
                className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2"
              >
                <span>{index + 1}. {row.team}</span>
                <strong>{row.points} pts</strong>
              </div>
            ))}
            {standings.length === 0 && <p>Sem dados de classificação.</p>}
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-gradient-to-br from-white to-slate-50 shadow-md shadow-slate-200/70">
          <CardHeader>
            <CardTitle className="text-base">Permissões</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant={canEditGames ? 'default' : 'outline'}>
              {canEditGames ? 'Edita jogos' : 'Só leitura'}
            </Badge>
            <Badge variant={canEditResults ? 'default' : 'outline'}>
              {canEditResults ? 'Edita resultados' : 'Resultados bloqueados'}
            </Badge>
            <Badge variant={canImportGamesheet ? 'default' : 'outline'}>
              {canImportGamesheet ? 'Importa boletins' : 'Sem importação'}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
