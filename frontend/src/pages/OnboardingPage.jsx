import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useOnboardingState } from '../hooks/useOnboardingState';
import { WizardShell } from '../components/onboarding/WizardShell';
import { ClubStep } from '../components/onboarding/ClubStep';
import { SeasonStep } from '../components/onboarding/SeasonStep';
import { TeamsStep } from '../components/onboarding/TeamsStep';
import { MembersStep } from '../components/onboarding/MembersStep';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';

// Step order is kept stable across O1..O4 so onboarding_state.current_step
// indexes mean the same thing in every phase.
const ONBOARDING_STEPS = [
  { key: 'welcome' },  // 0
  { key: 'club' },     // 1
  { key: 'season' },   // 2
  { key: 'teams' },    // 3
  { key: 'members' },  // 4
  { key: 'summary' },  // 5
];

const STEP_INDEX = ONBOARDING_STEPS.reduce((acc, s, i) => {
  acc[s.key] = i;
  return acc;
}, {});

// Steps that own their primary CTA (form submit). Shell hides Next/Finish
// on these so users only see a single forward action.
const STEPS_WITH_OWN_CTA = new Set(['club', 'season', 'teams', 'members']);

// Steps where Skip must be disabled (mandatory). Teams is the only one
// in O3; the rest still allow skip → finish.
const NON_SKIPPABLE_STEPS = new Set(['teams']);

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

  const currentStepKey = ONBOARDING_STEPS[state.currentStep]?.key;
  const completedSet = new Set(state.completedSteps);

  const stepOwnsPrimaryCta = STEPS_WITH_OWN_CTA.has(currentStepKey);
  const skipDisabled = NON_SKIPPABLE_STEPS.has(currentStepKey);

  // ---------- Club ----------
  const handleClubCreated = async (club) => {
    try {
      await state.patchState({
        completed_step: 'club',
        current_step: STEP_INDEX.season,
        club_id: club.id,
      });
    } catch (err) {
      toast.error(t('onboarding.steps.club.errorToast'));
    }
  };
  const handleClubContinue = async () => {
    try {
      await state.patchState({ current_step: STEP_INDEX.season });
    } catch (err) {
      state.goNext();
    }
  };

  // ---------- Season ----------
  const handleSeasonCreated = async (season) => {
    try {
      await state.patchState({
        completed_step: 'season',
        current_step: STEP_INDEX.teams,
        season_id: season.id,
      });
    } catch (err) {
      toast.error(t('onboarding.steps.season.errorToast'));
    }
  };
  const handleSeasonContinue = async () => {
    try {
      await state.patchState({ current_step: STEP_INDEX.teams });
    } catch (err) {
      state.goNext();
    }
  };

  // ---------- Teams ----------
  const handleTeamsSaveAndContinue = async () => {
    try {
      await state.patchState({
        completed_step: 'teams',
        current_step: STEP_INDEX.members,
      });
    } catch (err) {
      toast.error(t('onboarding.steps.teams.errorToast'));
    }
  };
  const handleTeamsContinue = async () => {
    try {
      await state.patchState({ current_step: STEP_INDEX.members });
    } catch (err) {
      state.goNext();
    }
  };

  // ---------- Members ----------
  const handleMembersSaveAndContinue = async () => {
    try {
      await state.patchState({
        completed_step: 'members',
        current_step: STEP_INDEX.summary,
      });
    } catch (err) {
      toast.error(t('onboarding.steps.members.errorToast'));
    }
  };
  const handleMembersContinue = async () => {
    try {
      await state.patchState({ current_step: STEP_INDEX.summary });
    } catch (err) {
      state.goNext();
    }
  };

  // ---------- Finish / Skip / Next / Back ----------
  const handleFinish = async () => {
    try {
      const data = await state.complete();
      if (user) {
        updateUser({ onboarding_completed_at: data.completed_at });
      }
      toast.success(t('onboarding.completedToast'));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(t('onboarding.errorToast'));
    }
  };
  const handleSkip = handleFinish;

  const handleNext = async () => {
    const target = Math.min(state.currentStep + 1, ONBOARDING_STEPS.length - 1);
    try {
      await state.patchState({ current_step: target });
    } catch (err) {
      state.goNext();
    }
  };
  const handleBack = async () => {
    const target = Math.max(state.currentStep - 1, 0);
    try {
      await state.patchState({ current_step: target });
    } catch (err) {
      state.goBack();
    }
  };

  const renderStepBody = () => {
    switch (currentStepKey) {
      case 'club':
        return (
          <ClubStep
            existingClubId={state.clubId}
            onContinue={handleClubContinue}
            onCreated={handleClubCreated}
          />
        );
      case 'season':
        return (
          <SeasonStep
            clubId={state.clubId}
            existingSeasonId={state.seasonId}
            onContinue={handleSeasonContinue}
            onCreated={handleSeasonCreated}
          />
        );
      case 'teams':
        return (
          <TeamsStep
            clubId={state.clubId}
            stepCompleted={completedSet.has('teams')}
            onContinue={handleTeamsContinue}
            onSaveAndContinue={handleTeamsSaveAndContinue}
          />
        );
      case 'members':
        return (
          <MembersStep
            clubId={state.clubId}
            stepCompleted={completedSet.has('members')}
            onContinue={handleMembersContinue}
            onSaveAndContinue={handleMembersSaveAndContinue}
          />
        );
      default:
        return null; // Shell renders its "Coming soon" placeholder.
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-12 sm:py-16">
      <WizardShell
        steps={ONBOARDING_STEPS}
        currentStep={state.currentStep}
        completedSteps={state.completedSteps}
        onNext={handleNext}
        onBack={handleBack}
        onSkip={handleSkip}
        onFinish={handleFinish}
        hideForwardButton={stepOwnsPrimaryCta}
        skipDisabled={skipDisabled}
        completing={state.completing}
      >
        {renderStepBody()}
      </WizardShell>
    </div>
  );
}
