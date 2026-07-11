import {
  Calendar as CalendarIcon,
  CalendarOff,
  Download,
  Plus,
} from 'lucide-react';

import PageHero from '../common/PageHero.jsx';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import CalendarFilters from './CalendarFilters';

/**
 * CalendarHeader
 *
 * Cabeçalho normalizado pelo Design System 1.0.
 *
 * Estrutura:
 * - PageHero comum
 * - ações principais
 * - filtros num card compacto separado
 *
 * Responsivo:
 * - Mobile: ações apenas com ícones, sem sobreposição com a TopNavBar
 * - Desktop: ações completas com texto
 */
export default function CalendarHeader({
  t,
  teams = [],
  eventTypes = {},
  visibleEventTypes = [],
  selectedTeamFilter = 'all',
  selectedStatusFilter = 'all',
  canManageEvents = false,
  onTeamChange,
  onStatusChange,
  onEventTypeChange,
  onOpenUnavailability,
  onExportPDF,
  onCreateEvent,
}) {
  return (
    <div className="shrink-0 space-y-3 sm:space-y-4">
      <PageHero
        badge={t('calendar.operationalCenter', 'Centro Operacional')}
        badgeIcon={CalendarIcon}
        title={t('calendar.title', 'Calendário')}
        description={t(
          'calendar.heroDescription',
          'Organize treinos, jogos, convocatórias, indisponibilidades e eventos de todas as equipas.'
        )}
        tone="cyan"
        compact
        testId="calendar-page-hero"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenUnavailability}
              data-testid="create-unavailability-btn"
              className="h-9 rounded-2xl border-white/20 bg-white/10 px-3 text-white hover:bg-white/20 hover:text-white sm:px-4"
              title={t(
                'calendar.unavailability',
                'Indisponibilidade'
              )}
            >
              <CalendarOff className="h-4 w-4 sm:mr-2" />

              <span className="hidden sm:inline">
                {t(
                  'calendar.unavailability',
                  'Indisponibilidade'
                )}
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExportPDF}
              data-testid="export-pdf-btn"
              className="hidden h-9 rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:inline-flex"
            >
              <Download className="mr-2 h-4 w-4" />
              {t('common.export', 'Exportar')}
            </Button>

            {canManageEvents && (
              <Button
                type="button"
                size="sm"
                onClick={onCreateEvent}
                data-testid="create-event-btn"
                className="h-9 rounded-2xl bg-white px-3 text-slate-950 shadow-lg shadow-black/10 hover:bg-white/90 sm:px-4"
                title={t(
                  'calendar.newEvent',
                  'Novo Evento'
                )}
              >
                <Plus className="h-4 w-4 sm:mr-2" />

                <span className="hidden sm:inline">
                  {t(
                    'calendar.newEvent',
                    'Novo Evento'
                  )}
                </span>
              </Button>
            )}
          </>
        }
      />

      <Card className="border-white/70 bg-white/90 shadow-sm shadow-slate-200/70 backdrop-blur-xl">
        <CardContent className="p-3 sm:p-4">
          <CalendarFilters
            t={t}
            teams={teams}
            eventTypes={eventTypes}
            visibleEventTypes={visibleEventTypes}
            selectedTeamFilter={selectedTeamFilter}
            selectedStatusFilter={selectedStatusFilter}
            onTeamChange={onTeamChange}
            onStatusChange={onStatusChange}
            onEventTypeChange={onEventTypeChange}
            showEventTypeFilter
          />
        </CardContent>
      </Card>
    </div>
  );
}
