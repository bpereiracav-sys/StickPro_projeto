import { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '../ui/button';

export function CardActionMenu({
  items = [],
  ariaLabel = 'Mais ações',
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const visibleItems = items.filter((item) => !item.hidden);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div ref={menuRef} className="relative shrink-0">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={ariaLabel}
        aria-expanded={open}
        className="h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-950"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((previous) => !previous);
        }}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-30 min-w-[190px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/80"
        >
          {visibleItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.key || item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={[
                  'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors',
                  item.destructive
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950',
                  item.disabled ? 'cursor-not-allowed opacity-50' : '',
                ].join(' ')}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  if (item.disabled) return;

                  setOpen(false);
                  item.onClick?.();
                }}
              >
                {Icon && <Icon className="h-4 w-4 shrink-0" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CardActionMenu;
