import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

/**
 * CalendarFilters
 *
 * Componente reutilizável para filtros do calendário.
 *
 * Nota:
 * - Este ficheiro ainda não altera o Calendar.jsx por si só.
 * - Será ligado ao Calendar.jsx no passo seguinte, depois de confirmado que compila.
 */
export default function CalendarFilters({
  t,
  teams = [],
  eventTypes = {},
  selectedTeamFilter = 'all',
  selectedStatusFilter = 'all',
  visibleEventTypes = [],
  onTeamChange,
  onStatusChange,
  onEventTypeChange,
  showEventTypeFilter = true,
}) {
  const allEventTypeKeys = Object.keys(eventTypes);

  const eventTypeValue =
    visibleEventTypes.length === allEventTypeKeys.length
      ? 'all'
      : visibleEventTypes[0] || 'all';

  const handleEventTypeChange = (value) => {
    if (!onEventTypeChange) return;

    if (value === 'all') {
      onEventTypeChange(allEventTypeKeys);
    } else {
      onEventTypeChange([value]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:items-center md:gap-3">
      <Select value={selectedTeamFilter} onValueChange={onTeamChange}>
        <SelectTrigger className="h-9 w-full rounded-2xl bg-white text-xs shadow-sm md:text-sm">
          <SelectValue placeholder={t('calendar.allTeams', 'Todas as equipas')} />
        </SelectTrigger>

        <SelectContent className="bg-white">
          <SelectItem value="all">
            {t('calendar.allTeams', 'Todas as equipas')}
          </SelectItem>

          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedStatusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="h-9 w-full rounded-2xl bg-white text-xs shadow-sm md:text-sm">
          <SelectValue placeholder={t('calendar.allStatuses', 'Todos os estados')} />
        </SelectTrigger>

        <SelectContent className="bg-white">
          <SelectItem value="all">
            {t('calendar.allStatuses', 'Todos os estados')}
          </SelectItem>

          <SelectItem value="scheduled">
            {t('calendar.statusScheduled', 'Agendado')}
          </SelectItem>

          <SelectItem value="postponed">
            {t('calendar.statusPostponed', 'Adiado')}
          </SelectItem>

          <SelectItem value="cancelled">
            {t('calendar.statusCancelled', 'Cancelado')}
          </SelectItem>
        </SelectContent>
      </Select>

      {showEventTypeFilter && (
        <Select value={eventTypeValue} onValueChange={handleEventTypeChange}>
          <SelectTrigger className="hidden h-9 w-full rounded-2xl bg-white text-xs shadow-sm md:flex md:text-sm">
            <SelectValue placeholder={t('calendar.allEventTypes', 'Todos os tipos')} />
          </SelectTrigger>

          <SelectContent className="bg-white">
            <SelectItem value="all">
              {t('calendar.allEventTypes', 'Todos os tipos')}
            </SelectItem>

            {allEventTypeKeys.map((key) => {
              const type = eventTypes[key];
              const Icon = type?.icon;

              return (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className={`h-4 w-4 ${type.textColor || ''}`} />}
                    {type?.label || key}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
