import { TabsContent } from '../ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
import {
  Activity,
  BarChart3,
  Goal,
  Shield,
  Sparkles,
  Target,
  Trophy,
  TrendingUp,
} from 'lucide-react';

function getClubSide(match, teamName) {
  if (match.club_side) {
    return match.club_side;
  }

  if (match.location === 'casa') {
    return 'home';
  }

  if (match.location === 'fora') {
    return 'away';
  }

  if (match.home_team === teamName) {
    return 'home';
  }

  if (match.away_team === teamName) {
    return 'away';
  }

  return null;
}

function calculateStatistics(matches = [], teamName = '') {
  const clubMatches = matches.filter(
    (match) =>
      match.is_completed &&
      match.is_club_match !== false
  );

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let cleanSheets = 0;
  let biggestWin = null;

  clubMatches.forEach((match) => {
    const side = getClubSide(match, teamName);

    const homeScore = Number(match.home_score ?? 0);
    const awayScore = Number(match.away_score ?? 0);

    const clubScore =
      side === 'away' ? awayScore : homeScore;

    const opponentScore =
      side === 'away' ? homeScore : awayScore;

    goalsFor += clubScore;
    goalsAgainst += opponentScore;

    if (opponentScore === 0) {
      cleanSheets += 1;
    }

    if (clubScore > opponentScore) {
      wins += 1;

      const margin = clubScore - opponentScore;

      if (!biggestWin || margin > biggestWin.margin) {
        biggestWin = {
          score: `${clubScore}–${opponentScore}`,
          margin,
        };
      }
    } else if (clubScore < opponentScore) {
      losses += 1;
    } else {
      draws += 1;
    }
  });

  const played = clubMatches.length;

  return {
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    cleanSheets,
    goalDifference: goalsFor - goalsAgainst,
    goalsPerGame:
      played > 0
        ? (goalsFor / played).toFixed(1)
        : '0.0',
    winRate:
      played > 0
        ? Math.round((wins / played) * 100)
        : 0,
    biggestWin: biggestWin?.score || '—',
  };
}

function MetricCard({
  label,
  value,
  icon: Icon,
  helper,
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
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

        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

export default function CompetitionStatistics({
  matches = [],
  teamName = '',
  competitionTeamsCount = 0,
  importedGamesheets = 0,
}) {
  const stats = calculateStatistics(
    matches,
    teamName
  );

  return (
    <TabsContent
      value="stats"
      className="space-y-6"
    >
      <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-md">
        <CardHeader className="border-b border-slate-100 p-5 sm:p-6">
          <CardTitle className="flex items-center gap-2 font-heading text-xl font-semibold tracking-tight">
            <BarChart3 className="h-5 w-5 text-primary" />
            Estatísticas da Competição
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Jogos realizados"
              value={stats.played}
              icon={Activity}
            />

            <MetricCard
              label="Vitórias"
              value={stats.wins}
              icon={Trophy}
            />

            <MetricCard
              label="Taxa de vitória"
              value={`${stats.winRate}%`}
              icon={TrendingUp}
            />

            <MetricCard
              label="Golos por jogo"
              value={stats.goalsPerGame}
              icon={Goal}
            />

            <MetricCard
              label="Golos marcados"
              value={stats.goalsFor}
              icon={Target}
            />

            <MetricCard
              label="Golos sofridos"
              value={stats.goalsAgainst}
              icon={Shield}
            />

            <MetricCard
              label="Diferença de golos"
              value={
                stats.goalDifference > 0
                  ? `+${stats.goalDifference}`
                  : stats.goalDifference
              }
              icon={Sparkles}
            />

            <MetricCard
              label="Maior vitória"
              value={stats.biggestWin}
              icon={Trophy}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-emerald-50 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-emerald-700">
                Vitórias
              </p>

              <p className="mt-1 text-xl font-bold text-emerald-800">
                {stats.wins}
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-amber-700">
                Empates
              </p>

              <p className="mt-1 text-xl font-bold text-amber-800">
                {stats.draws}
              </p>
            </div>

            <div className="rounded-2xl bg-red-50 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-red-700">
                Derrotas
              </p>

              <p className="mt-1 text-xl font-bold text-red-800">
                {stats.losses}
              </p>
            </div>

            <div className="rounded-2xl bg-cyan-50 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-cyan-700">
                Clean sheets
              </p>

              <p className="mt-1 text-xl font-bold text-cyan-800">
                {stats.cleanSheets}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1.5">
              {competitionTeamsCount} equipas registadas
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1.5">
              {importedGamesheets} boletins importados
            </span>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
