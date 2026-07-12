import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Plus, Upload } from 'lucide-react';

export default function CompetitionHero({
  championship,
  team,
  matchesCount,
  completedMatches,
  pendingMatches,
  competitionTeamsCount,
  canCreateGames,
  onAddMatch,
  onImportMatches,
  addMatchLabel,
  importMatchesLabel,
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-5 text-white shadow-xl shadow-slate-200/70 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Badge className="mb-3 border-white/20 bg-white/10 text-white hover:bg-white/10">
            Centro de Gestão Competitiva
          </Badge>

          <h1 className="font-heading text-2xl tracking-tight sm:text-3xl lg:text-4xl">
            {championship.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-cyan-50/90">
            <Badge variant="outline" className="border-white/25 bg-white/10 text-white">
              {championship.season}
            </Badge>
            <Badge variant="outline" className="border-white/25 bg-white/10 text-white">
              {team?.name || championship.team_name || 'Equipa'}
            </Badge>
            <Badge variant="outline" className="border-white/25 bg-white/10 text-white">
              {championship.format || '5x5'}
            </Badge>
            <Badge variant="outline" className="border-white/25 bg-white/10 text-white">
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
              className="bg-white text-slate-950 hover:bg-cyan-50"
            >
              <Plus className="mr-2 h-4 w-4" />
              {addMatchLabel}
            </Button>

            <Button
              variant="outline"
              onClick={onImportMatches}
              data-testid="import-matches-btn"
              className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <Upload className="mr-2 h-4 w-4" />
              {importMatchesLabel}
            </Button>
          </div>
        )}
      </div>

      <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Jogos', matchesCount],
          ['Realizados', completedMatches],
          ['Por realizar', pendingMatches],
          ['Equipas', competitionTeamsCount],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"
          >
            <p className="text-xs uppercase tracking-wide text-cyan-100/80">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
