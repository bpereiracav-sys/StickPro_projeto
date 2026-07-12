import { MoreVertical } from 'lucide-react';

import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export default function CardActionMenu({
  actions = [],
  align = 'end',
  label = 'Ações',
  className = '',
}) {
  const visibleActions = Array.isArray(actions)
    ? actions.filter(
        (action) =>
          action &&
          action.label &&
          action.hidden !== true
      )
    : [];

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={[
            'h-8 w-8 shrink-0 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label={label}
          title={label}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        className="min-w-48 bg-white"
      >
        {visibleActions.map((action, index) => {
          const Icon = action.icon;

          return (
            <div key={action.id || action.label || index}>
              {action.separatorBefore && index > 0 && (
                <DropdownMenuSeparator />
              )}

              <DropdownMenuItem
                disabled={action.disabled}
                className={[
                  'cursor-pointer',
                  action.destructive
                    ? 'text-destructive focus:text-destructive'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onSelect={(event) => {
                  if (action.preventDefault !== false) {
                    event.preventDefault();
                  }

                  if (
                    !action.disabled &&
                    typeof action.onClick === 'function'
                  ) {
                    action.onClick();
                  }
                }}
              >
                {Icon && (
                  <Icon className="mr-2 h-4 w-4" />
                )}

                {action.label}
              </DropdownMenuItem>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
