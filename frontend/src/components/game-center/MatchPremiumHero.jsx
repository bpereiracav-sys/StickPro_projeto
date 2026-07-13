import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Home,
  MapPin,
  Plane,
  ShieldCheck,
  Target,
  Trophy,
} from 'lucide-react';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { formatDate, formatTime } from '../../lib/utils';

function getClubSide(match) {
  if (match?.club_side) return match.club_side;
  if (match?.location === 'casa') return 'home';
  if (match?.location === 'fora') return 'away';
  return 'neutral';
}

function getTeams(match, team) {
  const teamName = team?.name || match?.team_name || 'Equipa';
  const clubSide = getClubSide(match);

  const homeTeam =
    match?.home_team ||
    (clubSide === 'home'
      ? teamName
      : match?.opponent_team || 'Adversário');

  const awayTeam =
    match?.away_team ||
    (clubSide === 'away'
      ? teamName
      : match?.opponent_team || 'Adversário');

  return {
    homeTeam,
    awayTeam,
    clubSide,
  };
}

function getStatus(match) {
  if (match?.is_completed) {
    return {
      label: 'Terminado',
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-700',
      icon: CheckCircle2,
    };
  }

  return {
    label: 'Por disputar',
    className:
      'border-amber-200 bg-amber-50 text-amber-700',
    icon: Clock3,
  };
}

export default function MatchPremiumHero({
  championshipId,
  match,
  team,
  homeScore,
  awayScore,
}) {
  const { homeTeam, awayTeam, clubSide } = getTeams(match, team);
  const status = getStatus(match);
  const StatusIcon = status.icon;

  const locationLabel =
    clubSide === 'home'
      ? 'Casa'
      : clubSide === 'away'
        ? 'Fora'
        : 'Neutro';

  const LocationIcon =
    clubSide === 'home'
      ? Home
      : clubSide === 'away'
        ? Plane
        : Target;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-5 text-white shadow-xl shadow-slate-200/70 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl" />

      <div className="relative z-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            asChild
            variant="ghost"
            className="w-fit -ml-3 rounded-xl text-white/75 hover:bg-white/10 hover:text-white"
          >
            <Link to={`/championships/${championshipId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar à competição
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-white/20 bg-white/10 text-white"
            >
              <Trophy className="mr-1.5 h-3.5 w-3.5" />
              {match?.competition_name || 'Centro do Jogo'}
            </Badge>

            <Badge
              variant="outline"
              className={status.className}
            >
              <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
              {status.label}
            </Badge>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
          <div className="min-w-0 text-center lg:text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/65">
              Equipa da casa
            </p>

            <h1 className="mt-2 truncate font-heading text-2xl font-bold sm:text-3xl lg:text-4xl">
              {homeTeam}
            </h1>
          </div>

          <div className="mx-auto flex min-w-[150px] flex-col items-center">
            {match?.is_completed || homeScore || awayScore ? (
              <div className="rounded-3xl border border-white/20 bg-white/[0.12] px-6 py-4 shadow-inner shadow-white/5 backdrop-blur">
                <p className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
                  {homeScore || 0}
                  <span className="mx-3 text-white/35">–</span>
                  {awayScore || 0}
                </p>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/20 bg-white/[0.12] px-7 py-4 shadow-inner shadow-white/5 backdrop-blur">
                <p className="font-heading text-3xl font-bold text-white/90">
                  VS
                </p>
              </div>
            )}

            <Badge
              variant="outline"
              className="mt-3 border-white/20 bg-white/10 text-white"
            >
              <LocationIcon className="mr-1.5 h-3.5 w-3.5" />
              {locationLabel}
            </Badge>
          </div>

          <div className="min-w-0 text-center lg:text-left">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/65">
              Equipa visitante
            </p>

            <h2 className="mt-2 truncate font-heading text-2xl font-bold sm:text-3xl lg:text-4xl">
              {awayTeam}
            </h2>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/15 bg-white/[0.10] px-4 py-3 backdrop-blur">
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-cyan-100/70">
              <CalendarDays className="h-3.5 w-3.5" />
              Data
            </p>
            <p className="mt-1.5 font-semibold">
              {formatDate(match?.match_date)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/[0.10] px-4 py-3 backdrop-blur">
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-cyan-100/70">
              <Clock3 className="h-3.5 w-3.5" />
              Hora
            </p>
            <p className="mt-1.5 font-semibold">
              {formatTime(match?.match_date)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/[0.10] px-4 py-3 backdrop-blur">
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-cyan-100/70">
              <ShieldCheck className="h-3.5 w-3.5" />
              Jornada
            </p>
            <p className="mt-1.5 font-semibold">
              {match?.matchday
                ? `Jornada ${match.matchday}`
                : 'Sem jornada'}
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/[0.10] px-4 py-3 backdrop-blur">
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-cyan-100/70">
              <MapPin className="h-3.5 w-3.5" />
              Pavilhão
            </p>
            <p className="mt-1.5 truncate font-semibold">
              {match?.venue || 'Por definir'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

