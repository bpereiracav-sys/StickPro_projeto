import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, Trophy } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { formatDate, formatTime } from '../../lib/utils';

export default function GameHeader({
  championshipId,
  match,
  team,
  canManageEvents,
  homeScore,
  awayScore,
  setHomeScore,
  setAwayScore,
}) {
  if (!match) return null;

  const homeTeamName =
    match.is_club_match === false ? match.home_team : team?.name;

  const awayTeamName = match.opponent_team;

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" className="w-fit -ml-2 text-muted-foreground">
        <Link to={`/championships/${championshipId}`} className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar à Competição
        </Link>
      </Button>

      <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-5 text-white shadow-xl shadow-slate-200/70 sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" />

        <div className="relative z-10">
          <Badge className="mb-3 border-white/20 bg-white/10 text-white hover:bg-white/10">
            Centro do Jogo
          </Badge>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-wide text-cyan-100/80">Equipa</p>
              <h1 className="mt-1 font-heading text-2xl tracking-tight sm:text-3xl">
                {homeTeamName || 'Equipa'}
              </h1>
            </div>

            <div className="text-left lg:text-center">
              {canManageEvents ? (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 p-3">
                  <Input
                    type="number"
                    min="0"
                    className="h-12 w-16 border-white/20 bg-white/15 text-center text-2xl font-bold text-white placeholder:text-white/50"
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                  />
                  <span className="text-2xl font-bold">×</span>
                  <Input
                    type="number"
                    min="0"
                    className="h-12 w-16 border-white/20 bg-white/15 text-center text-2xl font-bold text-white placeholder:text-white/50"
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                  />
                </div>
              ) : match.is_completed ? (
                <div className="font-heading text-4xl font-bold">
                  {match.home_score} × {match.away_score}
                </div>
              ) : (
                <Badge variant="outline" className="border-white/25 bg-white/10 text-white">
                  Por jogar
                </Badge>
              )}
            </div>

            <div className="lg:text-right">
              <p className="text-xs uppercase tracking-wide text-cyan-100/80">Adversário</p>
              <h2 className="mt-1 font-heading text-2xl tracking-tight sm:text-3xl">
                {awayTeamName || 'Adversário'}
              </h2>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            {match.matchday && (
              <Badge variant="outline" className="border-white/25 bg-white/10 text-white">
                <Trophy className="mr-1 h-3.5 w-3.5" />
                Jornada {match.matchday}
              </Badge>
            )}

            <Badge variant="outline" className="border-white/25 bg-white/10 text-white">
              <Calendar className="mr-1 h-3.5 w-3.5" />
              {formatDate(match.match_date)}
            </Badge>

            <Badge variant="outline" className="border-white/25 bg-white/10 text-white">
              <Clock className="mr-1 h-3.5 w-3.5" />
              {formatTime(match.match_date)}
            </Badge>

            {match.venue && (
              <Badge variant="outline" className="border-white/25 bg-white/10 text-white">
                <MapPin className="mr-1 h-3.5 w-3.5" />
                {match.venue}
              </Badge>
            )}

            {match.gamesheet_url && (
              <Badge className="bg-cyan-400 text-slate-950 hover:bg-cyan-400">
                Boletim importado
              </Badge>
            )}

            {match.technical_assistant_published && (
              <Badge className="bg-emerald-400 text-slate-950 hover:bg-emerald-400">
                Assistente publicado
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
