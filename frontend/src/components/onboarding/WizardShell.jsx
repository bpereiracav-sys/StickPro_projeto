import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

/**
 * Phase O1 + O2 — Wizard shell.
 *
 * Renders the stepper, the current step's body (caller-provided) and a
 * navigation footer. Callers can either:
 *   - leave `children` empty → default "Coming soon" placeholder is used
 *     and the footer's Next/Finish button is shown (O1 behaviour);
 *   - render real step content via `children` and set
 *     `hideForwardButton` so the step owns its own primary CTA.
 */
export function WizardShell({
  steps,
  currentStep,
  completedSteps = [],
  onNext,
  onBack,
  onSkip,
  onFinish,
  hideForwardButton = false,
  completing = false,
  children,
}) {
  const { t } = useLanguage();

  if (!Array.isArray(steps) || steps.length === 0) {
    return null;
  }

  const total = steps.length;
  const safeIndex = Math.max(0, Math.min(currentStep, total - 1));
  const step = steps[safeIndex];
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === total - 1;
  const completedSet = new Set(completedSteps);

  return (
    <div className="w-full max-w-3xl mx-auto" data-testid="onboarding-wizard">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="font-heading text-3xl sm:text-4xl text-foreground tracking-tight mb-2"
          data-testid="onboarding-title"
        >
          {t('onboarding.title')}
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          {t('onboarding.subtitle')}
        </p>
      </div>

      {/* Stepper */}
      <ol
        className="flex items-center justify-between gap-2 mb-8 overflow-x-auto"
        data-testid="onboarding-stepper"
      >
        {steps.map((s, idx) => {
          const isActive = idx === safeIndex;
          // A step is shown as "done" if its key was persisted by the
          // backend OR if it sits before the current step (O1 behaviour).
          const isDone = completedSet.has(s.key) || idx < safeIndex;
          return (
            <li
              key={s.key}
              className="flex flex-col items-center min-w-[80px] flex-1"
              data-testid={`onboarding-step-indicator-${s.key}`}
              aria-current={isActive ? 'step' : undefined}
            >
              <div
                className={[
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isDone
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground',
                ].join(' ')}
              >
                {isDone && !isActive ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span
                className={[
                  'mt-2 text-xs text-center max-w-[100px] truncate',
                  isActive ? 'text-foreground font-medium' : 'text-muted-foreground',
                ].join(' ')}
              >
                {t(`onboarding.steps.${s.key}.title`)}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Step content */}
      <Card
        className="p-6 sm:p-8 mb-6"
        data-testid={`onboarding-step-content-${step.key}`}
      >
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          {t('onboarding.stepLabel')} {safeIndex + 1} {t('onboarding.ofLabel')}{' '}
          {total}
        </p>
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-3">
          {t(`onboarding.steps.${step.key}.title`)}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mb-6">
          {t(`onboarding.steps.${step.key}.description`)}
        </p>

        {children || (
          <div
            className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-8 text-center"
            data-testid="onboarding-step-placeholder"
          >
            <p className="text-sm font-medium text-foreground mb-1">
              {t('onboarding.placeholderTitle')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('onboarding.placeholderDescription')}
            </p>
          </div>
        )}
      </Card>

      {/* Footer / navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onSkip}
          disabled={completing}
          data-testid="onboarding-skip-btn"
        >
          {t('onboarding.skip')}
        </Button>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isFirst || completing}
            data-testid="onboarding-back-btn"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {t('onboarding.back')}
          </Button>

          {!hideForwardButton && (isLast ? (
            <Button
              type="button"
              onClick={onFinish}
              disabled={completing}
              data-testid="onboarding-finish-btn"
            >
              {completing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('onboarding.finishing')}
                </>
              ) : (
                t('onboarding.finish')
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onNext}
              disabled={completing}
              data-testid="onboarding-next-btn"
            >
              {t('onboarding.next')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WizardShell;
