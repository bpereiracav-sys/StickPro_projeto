/**
 * Secção reutilizável de uma página.
 *
 * Permite manter o mesmo espaçamento entre título, descrição,
 * ações e conteúdo em todas as áreas da aplicação.
 */
export default function PageSection({
  children,
  title,
  description,
  actions,
  icon: Icon,
  compact = false,
  className = '',
  contentClassName = '',
  testId,
}) {
  const hasHeader = title || description || actions;

  return (
    <section
      className={[
        compact ? 'space-y-3' : 'space-y-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={testId}
    >
      {hasHeader && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title && (
              <div className="flex items-center gap-2">
                {Icon && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                )}

                <h2 className="font-heading text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                  {title}
                </h2>
              </div>
            )}

            {description && (
              <p
                className={[
                  title ? 'mt-1.5' : '',
                  'max-w-3xl text-sm leading-6 text-slate-500',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {description}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}

      <div
        className={[
          'min-w-0',
          contentClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </section>
  );
}
