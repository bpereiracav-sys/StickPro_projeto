import { Link } from 'react-router-dom';
import {
  Calendar,
  Edit,
  FileSpreadsheet,
  Home,
  LayoutGrid,
  Loader2,
  MapPin,
  Plane,
  Plus,
  Target,
  Trash2,
  Trophy,
} from 'lucide-react';
import { TabsContent } from '../ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { formatDate, formatTime } from '../../lib/utils';

function getLocationIcon(location) {
  if (location === 'casa') {
    return <Home className="h-4 w-4 text-secondary" />;
  }

  if (location === 'fora') {
    return <Plane className="h-4 w-4 text-primary" />;
  }

  return <Target className="h-4 w-4 text-muted-foreground" />;
}

function getLocationLabel(location) {
  if (location === 'casa') return 'Casa';
  if (location === 'fora') return 'Fora';
  return 'Neutro';
}

function getMatchTeams(match, team, championship) {
  const fallbackClubName =
    team?.name || championship?.team_name || 'Equipa';

  const clubSide =
    match.club_side ||
    (match.location === 'casa'
      ? 'home'
      : match.location === 'fora'
        ? 'away'
        : 'neutral');

  const homeTeam =
    match.home_team ||
    (clubSide === 'home'
      ? fallbackClubName
      : match.opponent_team);

  const awayTeam =
    match.away_team ||
    (clubSide === 'away'
      ? fallbackClubName
      : match.opponent_team);

  return { homeTeam, awayTeam };
}

function getMatchScore(match) {
  if (!match?.is_completed) return null;

  return `${match.home_score ?? 0}–${match.away_score ?? 0}`;
}

function getMatchOutcome(match, team, championship) {
  if (!match?.is_completed || match.is_club_match === false) {
    return null;
  }

  const fallbackClubName =
    team?.name || championship?.team_name || 'Equipa';

  const clubSide =
    match.club_side ||
    (match.location === 'fora'
      ? 'away'
      : match.location === 'casa'
        ? 'home'
        : null);

  const homeScore = Number(match.home_score ?? 0);
  const awayScore = Number(match.away_score ?? 0);

  let clubScore;
  let opponentScore;

  if (clubSide === 'home') {
    clubScore = homeScore;
    opponentScore = awayScore;
  } else if (clubSide === 'away') {
    clubScore = awayScore;
    opponentScore = homeScore;
  } else if (match.home_team === fallbackClubName) {
    clubScore = homeScore;
    opponentScore = awayScore;
  } else if (match.away_team === fallbackClubName) {
    clubScore = awayScore;
    opponentScore = homeScore;
  } else {
    return null;
  }

  if (clubScore > opponentScore) {
    return {
      label: 'Vitória',
      dotClassName: 'bg-emerald-500',
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }

  if (clubScore < opponentScore) {
    return {
      label: 'Derrota',
      dotClassName: 'bg-red-500',
      className:
        'border-red-200 bg-red-50 text-red-700',
    };
  }

  return {
    label: 'Empate',
    dotClassName: 'bg-amber-500',
    className:
      'border-amber-200 bg-amber-50 text-amber-700',
  };
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  disabled = false,
  testId,
  destructive = false,
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={[
        'h-9 w-9 shrink-0 rounded-xl transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-sm',
        'focus-visible:ring-2 focus-visible:ring-primary/40',
        destructive
          ? 'border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700'
          : 'border-slate-200 bg-white text-slate-700 hover:border-primary/25 hover:bg-primary/5 hover:text-primary',
      ].join(' ')}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      title={label}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}

function MatchCenterButton({
  championshipId,
  matchId,
}) {
  const label = 'Abrir Centro do Jogo';

  return (
    <Button
      variant="default"
      size="icon"
      className="h-9 w-9 shrink-0 rounded-xl bg-primary text-primary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/40"
      asChild
      data-testid={`match-center-${matchId}`}
      title={label}
      aria-label={label}
    >
      <Link
        to={`/championships/${championshipId}/matches/${matchId}/stats`}
        aria-label={label}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="sr-only">{label}</span>
      </Link>
    </Button>
  );
}

export default function CompetitionMatches({
  championshipId,
  championship,
  team,
  matches,
  matchesByRound,
  sortedRounds,
  canCreateGames,
  canEditGames,
  canEditResults,
  canImportGamesheet,
  deleting,
  onAddMatch,
  onEditMatch,
  onEditResult,
  onImportGamesheet,
  onDeleteMatch,
}) {
  return (
    <TabsContent value="matches" className="space-y-6">
      {matches.length > 0 ? (
        <Accordion
          type="multiple"
          defaultValue={sortedRounds.map(String)}
          className="space-y-4"
        >
          {sortedRounds.map((round) => (
            <AccordionItem
              key={round}
              value={String(round)}
              className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-md"
            >
              <AccordionTrigger className="bg-slate-50/80 px-5 py-4 transition-colors hover:bg-slate-100 hover:no-underline sm:px-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="secondary" className="font-mono">
                    {round === 'Sem Jornada' ? 'S/J' : `J${round}`}
                  </Badge>

                  <span className="font-heading">
                    {round === 'Sem Jornada'
                      ? 'Sem Jornada'
                      : `Jornada ${round}`}
                  </span>

                  <Badge variant="outline" className="text-xs">
                    {matchesByRound[round].length}{' '}
                    {matchesByRound[round].length === 1
                      ? 'jogo'
                      : 'jogos'}
                  </Badge>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-0 pb-0">
                <div className="divide-y divide-slate-100/80">
                  {matchesByRound[round].map((match) => {
                    const { homeTeam, awayTeam } = getMatchTeams(
                      match,
                      team,
                      championship
                    );

                    const outcome = getMatchOutcome(
                      match,
                      team,
                      championship
                    );

                    return (
                      <div
                        key={match.id}
                        className="group p-5 transition-all duration-300 hover:bg-slate-50/70 sm:p-6"
                        data-testid={`match-${match.id}`}
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                            <div className="flex items-center gap-3 sm:gap-4">
                              <div className="min-w-[78px] text-center">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                  {formatDate(match.match_date)}
                                </p>

                                <p className="font-heading text-base sm:text-lg">
                                  {formatTime(match.match_date)}
                                </p>
                              </div>

                              <div className="flex items-center gap-1">
                                {getLocationIcon(match.location)}

                                <Badge
                                  variant="outline"
                                  className="px-1.5 text-[10px] sm:text-xs"
                                >
                                  {getLocationLabel(match.location)}
                                </Badge>
                              </div>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                <span className="max-w-[130px] truncate text-sm font-semibold text-slate-950 sm:max-w-none sm:text-base">
                                  {homeTeam}
                                </span>

                                <span className="text-sm text-muted-foreground">
                                  vs
                                </span>

                                <span className="max-w-[130px] truncate text-sm font-semibold text-slate-950 sm:max-w-none sm:text-base">
                                  {awayTeam}
                                </span>

                                {match.is_club_match === false && (
                                  <Badge
                                    variant="outline"
                                    className="border-blue-200 bg-blue-50 text-[10px] text-blue-700"
                                  >
                                    Externo
                                  </Badge>
                                )}
                              </div>

                              {match.venue && (
                                <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground sm:text-sm">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="truncate">
                                    {match.venue}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                              {match.is_completed ? (
                                <>
                                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-center shadow-sm">
                                    <span className="font-heading text-2xl font-bold text-slate-950 sm:text-3xl">
                                      {getMatchScore(match)}
                                    </span>
                                  </div>

                                  {outcome && (
                                    <Badge
                                      variant="outline"
                                      className={[
                                        outcome.className,
                                        'gap-1.5',
                                      ].join(' ')}
                                    >
                                      <span
                                        className={[
                                          'h-2 w-2 rounded-full',
                                          outcome.dotClassName,
                                        ].join(' ')}
                                      />
                                      {outcome.label}
                                    </Badge>
                                  )}

                                  {(match.bonus_points > 0 ||
                                    match.penalty_points > 0) && (
                                    <div className="text-xs">
                                      {match.bonus_points > 0 && (
                                        <span className="font-semibold text-secondary">
                                          +{match.bonus_points}
                                        </span>
                                      )}

                                      {match.penalty_points > 0 && (
                                        <span className="ml-1 font-semibold text-destructive">
                                          -{match.penalty_points}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <Badge className="w-fit border border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100">
                                  Por disputar
                                </Badge>
                              )}
                            </div>

                            {canEditGames && (
                              <div className="flex max-w-full flex-wrap items-center gap-2 sm:justify-end">
                                <ActionButton
                                  label="Editar jogo"
                                  icon={Edit}
                                  onClick={() => onEditMatch(match)}
                                  testId={`edit-match-${match.id}`}
                                />

                                {canEditResults && (
                                  <ActionButton
                                    label={
                                      match.is_completed
                                        ? 'Editar resultado'
                                        : 'Inserir resultado'
                                    }
                                    icon={Trophy}
                                    onClick={() => onEditResult(match)}
                                    testId={`edit-result-${match.id}`}
                                  />
                                )}

                                {match.is_club_match !== false && (
                                  <>
                                    <MatchCenterButton
                                      championshipId={championshipId}
                                      matchId={match.id}
                                    />

                                    {canImportGamesheet && (
                                      <ActionButton
                                        label="Importar ficha oficial"
                                        icon={FileSpreadsheet}
                                        onClick={() =>
                                          onImportGamesheet(match)
                                        }
                                        testId={`import-gamesheet-${match.id}`}
                                      />
                                    )}
                                  </>
                                )}

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0 rounded-xl border-red-200 text-red-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:text-red-700 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-red-200"
                                  onClick={() => onDeleteMatch(match.id)}
                                  disabled={deleting === match.id}
                                  data-testid={`delete-match-${match.id}`}
                                  title="Arquivar jogo"
                                  aria-label="Arquivar jogo"
                                >
                                  {deleting === match.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}

                                  <span className="sr-only">
                                    Arquivar jogo
                                  </span>
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <Card className="rounded-3xl border border-dashed border-slate-200 bg-white shadow-sm">
          <CardContent className="px-6 py-14 text-center">
            <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />

            <p className="text-muted-foreground">
              Nenhum jogo agendado
            </p>

            {canCreateGames && (
              <Button
                className="mt-4 rounded-xl"
                onClick={onAddMatch}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Jogo
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}
