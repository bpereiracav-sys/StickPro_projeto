import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Trophy } from 'lucide-react';

export function CompetitionStandings({
  standings = [],
  clubTeamName = '',
}) {
  return (
    <Card className="overflow-hidden border-white/70 bg-white/95 shadow-lg shadow-slate-200/70">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/80">
        <CardTitle className="flex items-center gap-2 font-heading text-xl tracking-tight text-slate-950">
          <Trophy className="h-5 w-5 text-primary" />
          Classificação
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {standings.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="min-w-[180px]">Equipa</TableHead>
                    <TableHead className="text-center">J</TableHead>
                    <TableHead className="text-center">V</TableHead>
                    <TableHead className="text-center">E</TableHead>
                    <TableHead className="text-center">D</TableHead>
                    <TableHead className="text-center">GM</TableHead>
                    <TableHead className="text-center">GS</TableHead>
                    <TableHead className="text-center">DG</TableHead>
                    <TableHead className="text-center">B</TableHead>
                    <TableHead className="text-center">P</TableHead>
                    <TableHead className="text-center font-bold">Pts</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {standings.map((row, index) => {
                    const isClubTeam =
                      Boolean(clubTeamName) &&
                      row.team === clubTeamName;

                    return (
                      <TableRow
                        key={`${row.team}-${index}`}
                        className={
                          isClubTeam
                            ? 'border-primary/10 bg-primary/5 hover:bg-primary/10'
                            : 'border-slate-100 hover:bg-slate-50/70'
                        }
                      >
                        <TableCell className="font-bold text-slate-700">
                          {index + 1}
                        </TableCell>

                        <TableCell className="font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            {isClubTeam && (
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Trophy className="h-3.5 w-3.5" />
                              </span>
                            )}

                            <span className="truncate">
                              {row.team}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          {row.played ?? 0}
                        </TableCell>

                        <TableCell className="text-center font-medium text-emerald-700">
                          {row.won ?? 0}
                        </TableCell>

                        <TableCell className="text-center">
                          {row.drawn ?? 0}
                        </TableCell>

                        <TableCell className="text-center font-medium text-red-600">
                          {row.lost ?? 0}
                        </TableCell>

                        <TableCell className="text-center">
                          {row.goals_for ?? 0}
                        </TableCell>

                        <TableCell className="text-center">
                          {row.goals_against ?? 0}
                        </TableCell>

                        <TableCell className="text-center font-mono">
                          {(row.goal_diff ?? 0) > 0
                            ? `+${row.goal_diff}`
                            : row.goal_diff ?? 0}
                        </TableCell>

                        <TableCell className="text-center text-emerald-700">
                          {row.bonus ?? 0}
                        </TableCell>

                        <TableCell className="text-center text-red-600">
                          {row.penalty ?? 0}
                        </TableCell>

                        <TableCell className="text-center text-lg font-bold text-slate-950">
                          {row.points ?? 0}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
              <p className="text-xs leading-5 text-slate-500">
                J = Jogos · V = Vitórias · E = Empates · D = Derrotas ·
                GM = Golos Marcados · GS = Golos Sofridos · DG = Diferença
                de Golos · B = Bónus · P = Penalização
              </p>
            </div>
          </>
        ) : (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Trophy className="h-7 w-7" />
            </div>

            <h3 className="font-heading text-lg text-slate-950">
              Sem classificação disponível
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              A classificação será apresentada quando existirem equipas e
              resultados registados nesta competição.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CompetitionStandings;
