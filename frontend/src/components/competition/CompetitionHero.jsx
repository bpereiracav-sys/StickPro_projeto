import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  CalendarDays,
  Medal,
  Plus,
  Target,
  Trophy,
  Upload,
} from 'lucide-react';

function getClubStanding(standings = [], teamName = '') {
  if (!teamName || standings.length === 0) {
    return {
      position: '—',
      points: 0,
    };
  }

  const index = standings.findIndex((row) => row.team === teamName);
  const row = index >= 0 ? standings[index] : null;

  return {
    position: index >= 0 ? `${index + 1}.º` : '—',
    points: row?.points ?? 0,
  };
}

function getClubResult(match, teamName = '') {
  if (!match?.is_completed) return null;

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

  const homeTeam = match.home_team || '';
  const awayTeam = match.away_team || '';

  if (teamName && homeTeam === teamName) {
    if (homeScore > awayScore) return 'win';
    if (homeScore < awayScore) return 'loss';
    return 'draw';
  }

  if (teamName && awayTeam === teamName) {
    if (awayScore > homeScore) return 'win';
    if (awayScore < homeScore) return 'loss';
    return 'draw';
  }

  return null;
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
  const teamName = team?.name || championship?.team_name || 'Equipa';

  const completedClubMatches = matches.filter(
    (match) => match.is_completed && match.is_club_match !== false
  );

  const wins = completedClubMatches.filter(
    (match) => getClubResult(match, teamName) === 'win'
  ).length;

  const { position, points } = getClubStanding(standings, teamName);

  const metricItems = [
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
  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-5 text-white shadow-xl shadow-slate-200/70 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Badge className="mb-3 border-white/20 bg-white/10 text-white hover:bg-white/10">
            Centro de Gestão Competitiva
          </Badge>

          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            {championship.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-cyan-50/90">
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

          {championship.description && (
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-200">
              {championship.description}
            </p>
          )}
        </div>

        {canCreateGames && (
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
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

      <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metricItems.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="group rounded-2xl border border-white/20 bg-white/[0.13] p-4 shadow-inner shadow-white/5 backdrop-blur-md transition-colors hover:bg-white/[0.17]"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-cyan-100/80">
                {label}
              </p>

              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-cyan-100">
                <Icon className="h-4 w-4" />
              </span>
            </div>

            <p className="mt-2 text-2xl font-bold text-white">
              {value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

