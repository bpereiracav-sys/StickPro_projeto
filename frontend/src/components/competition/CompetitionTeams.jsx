import { TabsContent } from '../ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import {
  Building,
  Edit,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function KitPreview({ kit, label }) {
  if (!kit?.primary_shirt && !kit?.secondary_shirt) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
      {kit.primary_shirt && (
        <span
          className="h-5 w-5 rounded-md border border-black/10 shadow-sm"
          style={{ backgroundColor: kit.primary_shirt }}
          title={`${label} principal`}
        />
      )}

      {kit.secondary_shirt && (
        <span
          className="h-5 w-5 rounded-md border border-black/10 shadow-sm"
          style={{ backgroundColor: kit.secondary_shirt }}
          title={`${label} secundário`}
        />
      )}

      <span className="text-xs font-medium text-slate-500">
        {label}
      </span>
    </div>
  );
}

export default function CompetitionTeams({
  teams = [],
  canManageTeams = false,
  canImportTeams = false,
  deletingId = null,
  onAddTeam,
  onEditTeam,
  onDeleteTeam,
  onImportTeams,
}) {
  return (
    <TabsContent value="teams" className="space-y-4">
      {canManageTeams && (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onAddTeam}
            className="rounded-xl"
            data-testid="add-team-btn"
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Equipa
          </Button>

          {canImportTeams && (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={onImportTeams}
            >
              <Upload className="mr-2 h-4 w-4" />
              Importar Excel
            </Button>
          )}
        </div>
      )}

      {teams.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((competitionTeam) => (
            <Card
              key={competitionTeam.id}
              className="group overflow-hidden border-white/80 bg-white/95 shadow-sm shadow-slate-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/80"
              data-testid={`team-${competitionTeam.id}`}
            >
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-100 font-heading text-sm font-bold text-primary">
                      {getInitials(competitionTeam.name) || 'EQ'}
                    </div>

                    <div className="min-w-0">
                      <CardTitle className="truncate text-lg text-slate-950">
                        {competitionTeam.name}
                      </CardTitle>

                      {competitionTeam.pavilion_name && (
                        <CardDescription className="mt-1 flex items-center gap-1">
                          <Building className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {competitionTeam.pavilion_name}
                          </span>
                        </CardDescription>
                      )}
                    </div>
                  </div>

                  {canManageTeams && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl"
                        aria-label={`Editar ${competitionTeam.name}`}
                        onClick={() => onEditTeam?.(competitionTeam)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl text-destructive hover:bg-red-50 hover:text-destructive"
                        aria-label={`Eliminar ${competitionTeam.name}`}
                        onClick={() => onDeleteTeam?.(competitionTeam.id)}
                        disabled={deletingId === competitionTeam.id}
                      >
                        {deletingId === competitionTeam.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 p-5">
                {competitionTeam.pavilion_address && (
                  <p className="flex items-start gap-2 text-sm text-slate-500">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{competitionTeam.pavilion_address}</span>
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <KitPreview
                    kit={competitionTeam.field_player_kit}
                    label="Jogador"
                  />

                  <KitPreview
                    kit={competitionTeam.goalkeeper_kit}
                    label="GR"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border border-dashed border-slate-200 bg-white/90">
          <CardContent className="py-14 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-7 w-7" />
            </div>

            <h3 className="font-heading text-lg text-slate-950">
              Nenhuma equipa registada
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Adicione as equipas participantes para criar jogos e
              manter a classificação atualizada.
            </p>

            {canManageTeams && (
              <Button
                className="mt-5 rounded-xl"
                onClick={onAddTeam}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Equipa
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}
