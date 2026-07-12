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
          <Button onClick={onAddTeam} data-testid="add-team-btn">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Equipa
          </Button>

          {canImportTeams && (
            <Button variant="outline" onClick={onImportTeams}>
              <Upload className="mr-2 h-4 w-4" />
              Importar Excel
            </Button>
          )}
        </div>
      )}

      {teams.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((competitionTeam) => (
            <Card
              key={competitionTeam.id}
              className="border border-border"
              data-testid={`team-${competitionTeam.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-lg">
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

                  {canManageTeams && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Editar ${competitionTeam.name}`}
                        onClick={() => onEditTeam?.(competitionTeam)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Eliminar ${competitionTeam.name}`}
                        className="text-destructive"
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

              <CardContent className="pt-0">
                {competitionTeam.pavilion_address && (
                  <p className="mb-3 flex items-start gap-1 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>{competitionTeam.pavilion_address}</span>
                  </p>
                )}

                {(competitionTeam.field_player_kit?.primary_shirt ||
                  competitionTeam.goalkeeper_kit?.primary_shirt) && (
                  <div className="mt-2 flex flex-wrap gap-4">
                    {competitionTeam.field_player_kit?.primary_shirt && (
                      <div className="flex items-center gap-2">
                        <div
                          className="h-6 w-6 rounded border"
                          style={{
                            backgroundColor:
                              competitionTeam.field_player_kit.primary_shirt,
                          }}
                          title="Cor principal jogador"
                        />

                        {competitionTeam.field_player_kit.secondary_shirt && (
                          <div
                            className="h-6 w-6 rounded border"
                            style={{
                              backgroundColor:
                                competitionTeam.field_player_kit.secondary_shirt,
                            }}
                            title="Cor secundária jogador"
                          />
                        )}

                        <span className="text-xs text-muted-foreground">
                          Jogador
                        </span>
                      </div>
                    )}

                    {competitionTeam.goalkeeper_kit?.primary_shirt && (
                      <div className="flex items-center gap-2">
                        <div
                          className="h-6 w-6 rounded border"
                          style={{
                            backgroundColor:
                              competitionTeam.goalkeeper_kit.primary_shirt,
                          }}
                          title="Cor principal GR"
                        />

                        {competitionTeam.goalkeeper_kit.secondary_shirt && (
                          <div
                            className="h-6 w-6 rounded border"
                            style={{
                              backgroundColor:
                                competitionTeam.goalkeeper_kit.secondary_shirt,
                            }}
                            title="Cor secundária GR"
                          />
                        )}

                        <span className="text-xs text-muted-foreground">
                          GR
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border border-border">
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nenhuma equipa registada
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Adicione as equipas participantes para poder criar jogos.
            </p>

            {canManageTeams && (
              <Button className="mt-4" onClick={onAddTeam}>
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
