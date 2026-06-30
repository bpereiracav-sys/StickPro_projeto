import { Calendar as CalendarIcon, CalendarOff, Download, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import CalendarFilters from './CalendarFilters';

/**
 * CalendarHeader
 *
 * Cabeçalho e filtros do calendário.
 *
 * Nota:
 * - Este componente foi criado para substituir, num passo seguinte,
 *   o bloco "Header Premium / Mobile controls" do Calendar.jsx.
 * - Ainda não altera nada sozinho até ser importado/usado no Calendar.jsx.
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
    <div className="shrink-0 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-cyan-50/95 p-3 shadow-xl shadow-slate-200/70 backdrop-blur md:rounded-3xl md:p-4">
      <div className="mb-3 flex items-center justify-between gap-3 md:mb-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <CalendarIcon className="h-4 w-4" />
          {t('calendar.title', 'Calendário')}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenUnavailability}
            data-testid="create-unavailability-btn"
            className="h-9 rounded-2xl bg-white px-3 md:px-4"
            title={t('calendar.unavailability', 'Indisponibilidade')}
          >
            <CalendarOff className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">
              {t('calendar.unavailability', 'Indisponibilidade')}
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExportPDF}
            data-testid="export-pdf-btn"
            className="hidden h-9 rounded-2xl bg-white md:inline-flex"
          >
            <Download className="mr-2 h-4 w-4" />
            {t('common.export', 'Exportar')}
          </Button>

          {canManageEvents && (
            <Button
              onClick={onCreateEvent}
              data-testid="create-event-btn"
              className="h-9 rounded-2xl px-3 shadow-lg shadow-primary/20 md:px-4"
              title={t('calendar.newEvent', 'Novo Evento')}
            >
              <Plus className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">
                {t('calendar.newEvent', 'Novo Evento')}
              </span>
            </Button>
          )}
        </div>
      </div>

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
    </div>
  );
}
