import { Link } from 'react-router-dom';
import {
  Archive,
  Calendar,
  ClipboardCheck,
  Edit,
  FileSpreadsheet,
  Home,
  LayoutGrid,
  Loader2,
  MapPin,
  Plane,
  Plus,
  Target,
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
import MatchSyncBadge from './MatchSyncBadge';

function getLocationIcon(location) {
  if (location === 'casa') {
    return <Home className="h-3.5 w-3.5 text-secondary" />;
  }

  if (location === 'fora') {
    return <Plane className="h-3.5 w-3.5 text-primary" />;
  }

  return (
    <Target className="h-3.5 w-3.5 text-muted-foreground" />
  );
}

function getLocationLabel(location) {
  if (location === 'casa') return 'Casa';
  if (location === 'fora') return 'Fora';
  return 'Neutro';
}

function getCompactDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return formatDate(value);
  }

  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'short',
  })
    .format(date)
    .replace('.', '')
    .toUpperCase();
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

  const getMatchSyncStatus = (match) => {
    if (match?.sync_status) {
      return match.sync_status;
    }
  
    if (
      match?.official_match_url ||
      match?.gamesheet_url
    ) {
      return match?.is_verified
        ? 'synced'
        : 'pending';
    }
  
    return 'manual';
  };  
  
  return (
    <TabsContent value="matches" className="space-y-5">
      {matches.length > 0 ? (
        <Accordion
          type="multiple"
          defaultValue={sortedRounds.map(String)}
          className="space-y-3"
        >
          {sortedRounds.map((round) => (
            <AccordionItem
              key={round}
              value={String(round)}
              className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-md"
            >
              <AccordionTrigger className="bg-slate-50/80 px-5 py-3.5 transition-colors hover:bg-slate-100 hover:no-underline sm:px-6">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge
                    variant="secondary"
                    className="font-mono text-[11px]"
                  >
                    {round === 'Sem Jornada'
                      ? 'S/J'
                      : `J${round}`}
                  </Badge>

                  <span className="font-heading text-sm sm:text-base">
                    {round === 'Sem Jornada'
                      ? 'Sem Jornada'
                      : `Jornada ${round}`}
                  </span>

                  <Badge
                    variant="outline"
                    className="text-[10px]"
                  >
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
                        className="group px-5 py-4 transition-all duration-300 hover:bg-slate-50/70 sm:px-6"
                        data-testid={`match-${match.id}`}
                      >
                        <div className="grid gap-4 lg:grid-cols-[92px_minmax(0,1fr)_auto] lg:items-center">
                          <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-1">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                {getCompactDate(match.match_date)}
                              </p>

                              <p className="font-heading text-lg font-semibold text-slate-950">
                                {formatTime(match.match_date)}
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              {getLocationIcon(match.location)}

                              <Badge
                                variant="outline"
                                className="px-1.5 py-0 text-[10px]"
                              >
                                {getLocationLabel(match.location)}
                              </Badge>
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-sm font-semibold text-slate-950 sm:text-base">
                                {homeTeam}
                              </span>

                              <span className="text-xs text-muted-foreground">
                                vs
                              </span>

                              <span className="truncate text-sm font-semibold text-slate-950 sm:text-base">
                                {awayTeam}
                              </span>

                              {match.is_club_match === false && (
                                <Badge
                                  variant="outline"
                                  className="border-blue-200 bg-blue-50 px-1.5 py-0 text-[10px] text-blue-700"
                                >
                                  Externo
                                </Badge>
                              )}
                            </div>

                            {match.venue && (
                              <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">
                                  {match.venue}
                                </span>
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
                            <div className="flex flex-wrap items-center gap-2">
                              {match.is_completed ? (
                                <>
                                  <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-1.5 text-center shadow-sm">
                                    <span className="font-heading text-xl font-bold text-slate-950 sm:text-2xl">
                                      {getMatchScore(match)}
                                    </span>
                                  </div>

                                  {outcome && (
                                    <Badge
                                      variant="outline"
                                      className={[
                                        outcome.className,
                                        'gap-1.5 px-2 py-0.5 text-[11px]',
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
                                <Badge className="w-fit border border-amber-200 bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800 hover:bg-amber-100">
                                  Por disputar
                                </Badge>
                              )}
                              <MatchSyncBadge
                                status={getMatchSyncStatus(match)}
                                source={match.source || 'manual'}
                              />

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
                                    icon={ClipboardCheck}
                                    onClick={() => onEditResult(match)}
                                    testId={`edit-result-${match.id}`}
                                  />
                                )}

                                {match.is_club_match !== false && (
                                  <Button
                                    variant="default"
                                    size="icon"
                                    onClick={() => {
                                      // ação do Centro do Jogo
                                    }}
                                    title="Centro do Jogo"
                                  >
                                    <LayoutGrid className="h-4 w-4" />
                                  </Button>
                                )}
                                
                                {canImportGamesheet && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() =>
                                      onImportGamesheet(match)
                                    }
                                    title={
                                      match.gamesheet_url ||
                                      match.official_match_url
                                        ? 'Consultar ficha oficial'
                                        : 'Adicionar ficha oficial'
                                    }
                                    data-testid={`import-gamesheet-${match.id}`}
                                  >
                                    <FileSpreadsheet className="h-4 w-4" />
                                  </Button>
                                )}

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0 rounded-xl border-amber-200 text-amber-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-amber-200"
                                  onClick={() =>
                                    onDeleteMatch(match.id)
                                  }
                                  disabled={deleting === match.id}
                                  data-testid={`delete-match-${match.id}`}
                                  title="Arquivar jogo"
                                  aria-label="Arquivar jogo"
                                >
                                  {deleting === match.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Archive className="h-4 w-4" />
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
