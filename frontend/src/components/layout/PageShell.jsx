/**
 * Contentor principal comum das páginas autenticadas.
 *
 * O espaçamento em relação à TopNavBar é controlado pelo AppLayout.
 * Este componente controla apenas o ritmo vertical interno da página.
 */
export default function PageShell({
  children,
  className = '',
  compact = false,
  fullHeight = false,
  scrollable = false,
  testId,
}) {
  const spacingClass = compact
    ? 'space-y-3 sm:space-y-4'
    : 'space-y-4 lg:space-y-6';

  return (
    <div
      className={[
        'w-full min-w-0',
        spacingClass,
        fullHeight ? 'min-h-0 flex-1' : '',
        scrollable ? 'overflow-y-auto overscroll-contain' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
