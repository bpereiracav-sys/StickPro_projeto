import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Minus,
  Plane,
  Trophy,
  XCircle,
} from 'lucide-react';

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

  const clubTeamName =
    team?.name ||
    match.club_team ||
    'Equipa';

  const clubSide =
    match.club_side ||
    (match.location === 'fora'
      ? 'away'
      : match.location === 'neutro'
        ? 'neutral'
        : 'home');

  let homeTeamName;
  let awayTeamName;

  if (match.is_club_match === false) {
    homeTeamName =
      match.home_team ||
      'Equipa da casa';

    awayTeamName =
      match.away_team ||
      match.opponent_team ||
      'Equipa visitante';
  } else if (clubSide === 'away') {
    homeTeamName =
      match.home_team ||
      match.opponent_team ||
      'Adversário';

    awayTeamName =
      match.away_team ||
      clubTeamName;
  } else if (clubSide === 'neutral') {
    homeTeamName =
      match.home_team ||
      clubTeamName;

    awayTeamName =
      match.away_team ||
      match.opponent_team ||
      'Adversário';
  } else {
    homeTeamName =
      match.home_team ||
      clubTeamName;

    awayTeamName =
      match.away_team ||
      match.opponent_team ||
      'Adversário';
  }

  const parsedHomeScore = Number.parseInt(homeScore, 10);
  const parsedAwayScore = Number.parseInt(awayScore, 10);

  const hasValidScore =
    Number.isFinite(parsedHomeScore) &&
    Number.isFinite(parsedAwayScore);

  const getClubResult = () => {
    if (
      match.is_club_match === false ||
      !match.is_completed ||
      !hasValidScore
    ) {
      return null;
    }

    const clubScore =
      clubSide === 'away'
        ? parsedAwayScore
        : parsedHomeScore;

    const opponentScore =
      clubSide === 'away'
        ? parsedHomeScore
        : parsedAwayScore;

    if (clubScore > opponentScore) {
      return {
        label: 'Vitória',
        icon: CheckCircle2,
        className:
          'border-emerald-300 bg-emerald-400 text-slate-950 hover:bg-emerald-400',
      };
    }

    if (clubScore < opponentScore) {
      return {
        label: 'Derrota',
        icon: XCircle,
        className:
          'border-red-300 bg-red-400 text-slate-950 hover:bg-red-400',
      };
    }

    return {
      label: 'Empate',
      icon: Minus,
      className:
        'border-amber-300 bg-amber-300 text-slate-950 hover:bg-amber-300',
    };
  };

  const clubResult = getClubResult();
  const ResultIcon = clubResult?.icon;

  return (
    <div className="space-y-4">
      <Button
        asChild
        variant="ghost"
        className="-ml-2 w-fit text-muted-foreground"
      >
        <Link
          to={`/championships/${championshipId}`}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar à Competição
        </Link>
      </Button>

      <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-5 text-white shadow-xl shadow-slate-200/70 sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" />

        <div className="relative z-10">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
              Centro do Jogo
            </Badge>

            <div className="flex flex-wrap items-center gap-2">
              {match.is_completed ? (
                <Badge
                  variant="outline"
                  className="border-white/25 bg-white/10 text-white"
                >
                  Terminado
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-amber-300/50 bg-amber-300/10 text-amber-100"
                >
                  Por jogar
                </Badge>
              )}

              {clubResult && (
                <Badge className={clubResult.className}>
                  {ResultIcon && (
                    <ResultIcon className="mr-1 h-3.5 w-3.5" />
                  )}
                  {clubResult.label}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-cyan-100/80">
                Equipa da casa
              </p>

              <h1 className="mt-1 truncate font-heading text-2xl tracking-tight sm:text-3xl">
                {homeTeamName}
              </h1>

              {clubSide === 'home' && match.is_club_match !== false && (
                <Badge
                  variant="outline"
                  className="mt-2 border-white/20 bg-white/10 text-white"
                >
                  Nossa equipa
                </Badge>
              )}
            </div>

            <div className="text-left lg:text-center">
              {canManageEvents ? (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 p-3 shadow-inner shadow-black/10">
                  <Input
                    type="number"
                    min="0"
                    aria-label={`Golos de ${homeTeamName}`}
                    className="h-12 w-16 border-white/20 bg-white/15 text-center text-2xl font-bold text-white placeholder:text-white/50"
                    value={homeScore}
                    onChange={(event) => setHomeScore(event.target.value)}
                  />

                  <span className="text-2xl font-bold text-white/80">
                    ×
                  </span>

                  <Input
                    type="number"
                    min="0"
                    aria-label={`Golos de ${awayTeamName}`}
                    className="h-12 w-16 border-white/20 bg-white/15 text-center text-2xl font-bold text-white placeholder:text-white/50"
                    value={awayScore}
                    onChange={(event) => setAwayScore(event.target.value)}
                  />
                </div>
              ) : match.is_completed ? (
                <div className="rounded-2xl border border-white/15 bg-white/10 px-6 py-3 font-heading text-4xl font-bold shadow-inner shadow-black/10">
                  {match.home_score ?? 0}
                  <span className="mx-3 text-white/60">×</span>
                  {match.away_score ?? 0}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/15 bg-white/10 px-6 py-3">
                  <p className="text-xs uppercase tracking-wide text-white/60">
                    Resultado
                  </p>
                  <p className="mt-1 font-semibold text-white">
                    Ainda não disponível
                  </p>
                </div>
              )}
            </div>

            <div className="min-w-0 lg:text-right">
              <p className="text-xs uppercase tracking-wide text-cyan-100/80">
                Equipa visitante
              </p>

              <h2 className="mt-1 truncate font-heading text-2xl tracking-tight sm:text-3xl">
                {awayTeamName}
              </h2>

              {clubSide === 'away' && match.is_club_match !== false && (
                <Badge
                  variant="outline"
                  className="mt-2 border-white/20 bg-white/10 text-white"
                >
                  Nossa equipa
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            {match.matchday && (
              <Badge
                variant="outline"
                className="border-white/25 bg-white/10 text-white"
              >
                <Trophy className="mr-1 h-3.5 w-3.5" />
                Jornada {match.matchday}
              </Badge>
            )}

            <Badge
              variant="outline"
              className="border-white/25 bg-white/10 text-white"
            >
              <Calendar className="mr-1 h-3.5 w-3.5" />
              {formatDate(match.match_date)}
            </Badge>

            <Badge
              variant="outline"
              className="border-white/25 bg-white/10 text-white"
            >
              <Clock className="mr-1 h-3.5 w-3.5" />
              {formatTime(match.match_date)}
            </Badge>

            {match.location === 'fora' && (
              <Badge
                variant="outline"
                className="border-white/25 bg-white/10 text-white"
              >
                <Plane className="mr-1 h-3.5 w-3.5" />
                Fora
              </Badge>
            )}

            {match.venue && (
              <Badge
                variant="outline"
                className="max-w-full border-white/25 bg-white/10 text-white"
              >
                <MapPin className="mr-1 h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{match.venue}</span>
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
