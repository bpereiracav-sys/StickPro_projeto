import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Button } from '../ui/button';

const DEFAULT_VIEW_MODES = {
  agenda: { label: 'Agenda', icon: List },
  day: { label: 'Dia', icon: CalendarIcon },
  week: { label: 'Semana', icon: CalendarDays },
  month: { label: 'Mês', icon: LayoutGrid },
};

/**
 * CalendarViewControls
 *
 * Controlos de navegação e seleção de vista do calendário.
 *
 * Nota:
 * - No mobile, este componente pode ser ocultado pelo Calendar.jsx,
 *   mantendo a agenda corrida como vista principal.
 * - Será ligado ao Calendar.jsx num passo posterior.
 */
export default function CalendarViewControls({
  t,
  viewMode = 'month',
  viewTitle = '',
  isMobile = false,
  viewModes = DEFAULT_VIEW_MODES,
  onPrevious,
  onToday,
  onNext,
  onChangeView,
}) {
  const availableViews = Object.entries(viewModes).filter(
    ([key]) => !isMobile || ['agenda', 'day'].includes(key)
  );

  return (
    <div className="hidden flex-col gap-3 md:flex md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onPrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button variant="outline" onClick={onToday}>
          {t('calendar.today', 'Hoje')}
        </Button>

        <Button variant="outline" size="icon" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>

        <h2 className="ml-2 truncate font-heading text-lg font-bold capitalize tracking-tight text-slate-950 md:ml-4 md:text-2xl">
          {viewTitle}
        </h2>
      </div>

      <div className="flex items-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {availableViews.map(([key, mode]) => {
          const Icon = mode.icon;

          return (
            <Button
              key={key}
              variant={viewMode === key ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none px-4"
              onClick={() => onChangeView?.(key)}
              data-testid={`view-${key}-btn`}
            >
              <Icon className="mr-1 h-4 w-4" />
              {mode.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
