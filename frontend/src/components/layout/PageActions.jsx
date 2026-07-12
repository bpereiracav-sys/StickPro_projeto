/**
 * Barra reutilizável de ações, filtros ou controlos de uma página.
 */
export default function PageActions({
  children,
  align = 'between',
  wrap = true,
  sticky = false,
  className = '',
  testId,
}) {
  const alignmentClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={[
        'flex items-center gap-2 rounded-2xl border border-white/70 bg-white/90 p-3 shadow-sm shadow-slate-200/70 backdrop-blur-xl sm:p-4',
        alignmentClasses[align] || alignmentClasses.between,
        wrap ? 'flex-wrap' : '',
        sticky ? 'sticky top-2 z-30' : '',
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
