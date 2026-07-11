export function PageShell({
  children,
  className = '',
  contentClassName = '',
  compact = false,
  testId,
}) {
  return (
    <div
      className={[
        'w-full min-w-0',
        compact
          ? 'space-y-3 sm:space-y-4'
          : 'space-y-4 lg:space-y-6',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={testId}
    >
      <div
        className={[
          'w-full min-w-0',
          contentClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </div>
  );
}

export function PageSection({
  children,
  className = '',
  compact = false,
}) {
  return (
    <section
      className={[
        compact
          ? 'space-y-3'
          : 'space-y-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </section>
  );
}

export default PageShell;
