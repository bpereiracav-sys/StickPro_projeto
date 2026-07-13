import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  CalendarDays,
  Flame,
  Home,
  Medal,
  Plane,
  Plus,
  Target,
  Trophy,
  Upload,
} from 'lucide-react';
import { formatDate } from '../../lib/utils';

function getClubStanding(standings = [], teamName = '') {
  const index = standings.findIndex((row) => row.team === teamName);
  const row = index >= 0 ? standings[index] : null;

  return {
    position: index >= 0 ? `${index + 1}.º` : '—',
    points: row?.points ?? 0,
  };
}

function getClubResult(match, teamName = '') {
  if (!match?.is_completed || match.is_club_match === false) return null;

  const clubSide =
    match.club_side ||
    (match.location === 'fora' ? 'away' : 'home');

  const homeScore = Number(match.home_score ?? 0);
  const awayScore = Number(match.away_score ?? 0);

  if (clubSide === 'home') {
    if (homeScore > awayScore) return 'win';
    if (homeScore < awayScore) return 'loss';
    return 'draw';
  }

  if (clubSide === 'away') {
    if (awayScore > homeScore) return 'win';
    if (awayScore < homeScore) return 'loss';
    return 'draw';
  }

  if (match.home_team === teamName) {
    if (homeScore > awayScore) return 'win';
    if (homeScore < awayScore) return 'loss';
    return 'draw';
  }

  if (match.away_team === teamName) {
    if (awayScore > homeScore) return 'win';
    if (awayScore < homeScore) return 'loss';
    return 'draw';
  }

  return null;
}

function getCurrentStreak(matches = [], teamName = '') {
  const completed = [...matches]
    .filter(
      (match) =>
        match.is_completed &&
        match.is_club_match !== false
    )
    .sort(
      (a, b) =>
        new Date(b.match_date) - new Date(a.match_date)
    );

  if (completed.length === 0) {
    return {
      label: 'Sem série ativa',
      tone: 'neutral',
    };
  }

  const firstResult = getClubResult(completed[0], teamName);

  if (!firstResult) {
    return {
      label: 'Sem série ativa',
      tone: 'neutral',
    };
  }

  let count = 0;

  for (const match of completed) {
    if (getClubResult(match, teamName) === firstResult) {
      count += 1;
    } else {
      break;
    }
  }

  const labels = {
    win:
      count === 1
        ? '1 vitória consecutiva'
        : `${count} vitórias consecutivas`,
    draw:
      count === 1
        ? '1 empate consecutivo'
        : `${count} empates consecutivos`,
    loss:
      count === 1
        ? '1 derrota consecutiva'
        : `${count} derrotas consecutivas`,
  };

  return {
    label: labels[firstResult],
    tone: firstResult,
  };
}

function getNextOpponent(nextMatch, teamName) {
  if (!nextMatch) return 'Sem jogo agendado';

  const clubSide =
    nextMatch.club_side ||
    (nextMatch.location === 'fora' ? 'away' : 'home');

  if (clubSide === 'home') {
    return (
      nextMatch.away_team ||
      nextMatch.opponent_team ||
      'Adversário'
    );
  }

  if (clubSide === 'away') {
    return (
      nextMatch.home_team ||
      nextMatch.opponent_team ||
      'Adversário'
    );
  }

  if (nextMatch.home_team === teamName) {
    return (
      nextMatch.away_team ||
      nextMatch.opponent_team ||
      'Adversário'
    );
  }

  return (
    nextMatch.home_team ||
    nextMatch.opponent_team ||
    'Adversário'
  );
}

export default function CompetitionHero({
  championship,
  team,
  matches = [],
  standings = [],
  nextMatch = null,
  canCreateGames,
  onAddMatch,
  onImportMatches,
  addMatchLabel,
  importMatchesLabel,
}) {
  const teamName =
    team?.name || championship?.team_name || 'Equipa';

  const { position, points } = getClubStanding(
    standings,
    teamName
  );

  const streak = getCurrentStreak(matches, teamName);
  const nextOpponent = getNextOpponent(nextMatch, teamName);

  const nextLocation =
    nextMatch?.location === 'fora'
      ? 'Fora'
      : nextMatch?.location === 'casa'
        ? 'Casa'
        : nextMatch
          ? 'Neutro'
          : null;

  const completedClubMatches = matches.filter(
    (match) =>
      match.is_completed &&
      match.is_club_match !== false
  );

  const wins = completedClubMatches.filter(
    (match) => getClubResult(match, teamName) === 'win'
  ).length;

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-5 text-white shadow-xl shadow-slate-200/70 sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
              Centro de Gestão Competitiva
            </Badge>

            <Badge
              variant="outline"
              className={[
                'border-white/20 bg-white/10',
                streak.tone === 'win'
                  ? 'text-emerald-200'
                  : streak.tone === 'loss'
                    ? 'text-red-200'
                    : streak.tone === 'draw'
                      ? 'text-amber-200'
                      : 'text-white/75',
              ].join(' ')}
            >
              <Flame className="mr-1 h-3.5 w-3.5" />
              {streak.label}
            </Badge>
          </div>

          <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            {championship.name}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-white/25 bg-white/10 text-white"
            >
              {championship.season}
            </Badge>

            <Badge
              variant="outline"
              className="border-white/25 bg-white/10 text-white"
            >
              {teamName}
            </Badge>

            <Badge
              variant="outline"
              className="border-white/25 bg-white/10 text-white"
            >
              {championship.format || '5x5'}
            </Badge>

            <Badge
              variant="outline"
              className="border-white/25 bg-white/10 text-white"
            >
              {championship.convocation_type === 'automatica'
                ? 'Convocatória automática'
                : 'Convocatória manual'}
            </Badge>
          </div>

          {nextMatch && (
            <div className="mt-4 flex max-w-xl flex-col gap-2 rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-cyan-100/70">
                  Próximo adversário
                </p>

                <p className="mt-0.5 truncate text-base font-semibold text-white sm:text-lg">
                  {nextOpponent}
                </p>

                <p className="mt-0.5 text-xs text-white/65 sm:text-sm">
                  {formatDate(nextMatch.match_date)}
                  {nextMatch.matchday
                    ? ` · Jornada ${nextMatch.matchday}`
                    : ''}
                </p>
              </div>

              <Badge
                variant="outline"
                className="w-fit border-white/20 bg-white/10 text-white"
              >
                {nextLocation === 'Casa' ? (
                  <Home className="mr-1 h-3.5 w-3.5" />
                ) : nextLocation === 'Fora' ? (
                  <Plane className="mr-1 h-3.5 w-3.5" />
                ) : (
                  <Target className="mr-1 h-3.5 w-3.5" />
                )}
                {nextLocation}
              </Badge>
            </div>
          )}
        </div>

        {canCreateGames && (
          <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
            <Button
              onClick={onAddMatch}
              data-testid="add-match-btn"
              className="rounded-xl bg-white text-slate-950 shadow-lg shadow-black/10 hover:bg-cyan-50"
            >
              <Plus className="mr-2 h-4 w-4" />
              {addMatchLabel}
            </Button>

            <Button
              variant="outline"
              onClick={onImportMatches}
              data-testid="import-matches-btn"
              className="rounded-xl border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <Upload className="mr-2 h-4 w-4" />
              {importMatchesLabel}
            </Button>
          </div>
        )}
      </div>

      <div className="relative z-10 mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Posição',
            value: position,
            icon: Medal,
          },
          {
            label: 'Vitórias',
            value: wins,
            icon: Trophy,
          },
          {
            label: 'Pontos',
            value: points,
            icon: Target,
          },
          {
            label: 'Próximo jogo',
            value: nextMatch?.matchday
              ? `J${nextMatch.matchday}`
              : nextMatch
                ? 'Agendado'
                : '—',
            icon: CalendarDays,
          },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-white/20 bg-white/[0.13] px-4 py-3 shadow-inner shadow-white/5 backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.17]"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-cyan-100/80">
                {label}
              </p>

              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/10 text-cyan-100">
                <Icon className="h-3.5 w-3.5" />
              </span>
            </div>

            <p className="mt-1.5 text-xl font-bold text-white sm:text-2xl">
              {value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
