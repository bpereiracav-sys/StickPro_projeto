import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useOnboardingState } from '../hooks/useOnboardingState';
import { WizardShell } from '../components/onboarding/WizardShell';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';

// Phase O1 — shell-only step list. Real content lands in O2/O3/O4.
const ONBOARDING_STEPS = [
  { key: 'welcome' },
  { key: 'club' },
  { key: 'season' },
  { key: 'teams' },
  { key: 'members' },
  { key: 'summary' },
];

function FullScreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();

  const state = useOnboardingState({ totalSteps: ONBOARDING_STEPS.length });

  if (state.loading) {
    return <FullScreenSpinner />;
  }

  const goToDashboard = () => navigate('/dashboard', { replace: true });

  // If admin has already completed onboarding, show a friendly summary
  // instead of forcing them through the wizard again.
  if (state.completed) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-background px-4 py-12"
        data-testid="onboarding-already-completed"
      >
        <Card className="max-w-lg w-full p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl text-foreground mb-2">
            {t('onboarding.welcomeBackTitle')}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mb-6">
            {t('onboarding.welcomeBackDescription')}
          </p>
          <Button
            onClick={goToDashboard}
            data-testid="onboarding-go-dashboard-btn"
            className="w-full sm:w-auto"
          >
            {t('onboarding.goToDashboard')}
          </Button>
        </Card>
      </div>
    );
  }

  const handleFinish = async () => {
    try {
      const data = await state.complete();
      // Keep the AuthContext user in sync so the AppLayout redirect doesn't
      // immediately bounce the admin back to /onboarding.
      if (user) {
        updateUser({ onboarding_completed_at: data.completed_at });
      }
      toast.success(t('onboarding.completedToast'));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(t('onboarding.errorToast'));
    }
  };

  const handleSkip = async () => {
    // O1 treats "skip" the same as "finish": persist completion so the admin
    // is not bounced back here on the next login. Re-running the wizard is
    // still possible by navigating to /onboarding manually.
    await handleFinish();
  };

  return (
    <div className="min-h-screen bg-background px-4 py-12 sm:py-16">
      <WizardShell
        steps={ONBOARDING_STEPS}
        currentStep={state.currentStep}
        onNext={state.goNext}
        onBack={state.goBack}
        onSkip={handleSkip}
        onFinish={handleFinish}
        completing={state.completing}
      />
    </div>
  );
}
