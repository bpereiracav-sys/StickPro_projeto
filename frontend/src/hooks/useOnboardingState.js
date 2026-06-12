import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

/**
 * Phase O1 + O2 — Admin onboarding state hook.
 *
 * Phase O1 owned just the wizard's UI step index plus the
 * /api/onboarding/complete call. Phase O2 adds per-step persistence
 * (current_step, completed_steps, club_id, season_id) via
 * PATCH /api/onboarding/state so admins can resume across sessions.
 */
export function useOnboardingState({ totalSteps }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [clubId, setClubId] = useState(null);
  const [seasonId, setSeasonId] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [completedAt, setCompletedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState(null);

  const applyStatus = useCallback(
    (data) => {
      setCompleted(!!data.completed);
      setCompletedAt(data.completed_at || null);
      setCompletedSteps(Array.isArray(data.completed_steps) ? data.completed_steps : []);
      setClubId(data.club_id || null);
      setSeasonId(data.season_id || null);
      const incoming = typeof data.current_step === 'number' ? data.current_step : 0;
      const clamped = Math.max(0, Math.min(incoming, Math.max(totalSteps - 1, 0)));
      setCurrentStep(clamped);
    },
    [totalSteps]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get(`${API_URL}/onboarding/status`);
        if (cancelled) return;
        applyStatus(data);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyStatus]);

  const patchState = useCallback(
    async (patch) => {
      const { data } = await axios.patch(`${API_URL}/onboarding/state`, patch);
      setCompletedSteps(Array.isArray(data.completed_steps) ? data.completed_steps : []);
      setClubId(data.club_id || null);
      setSeasonId(data.season_id || null);
      if (typeof data.current_step === 'number') {
        const clamped = Math.max(0, Math.min(data.current_step, Math.max(totalSteps - 1, 0)));
        setCurrentStep(clamped);
      }
      return data;
    },
    [totalSteps]
  );

  const goNext = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, Math.max(totalSteps - 1, 0)));
  }, [totalSteps]);

  const goBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  const goTo = useCallback(
    (step) => {
      if (typeof step !== 'number') return;
      const safe = Math.max(0, Math.min(step, Math.max(totalSteps - 1, 0)));
      setCurrentStep(safe);
    },
    [totalSteps]
  );

  const complete = useCallback(async () => {
    setCompleting(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API_URL}/onboarding/complete`);
      setCompleted(!!data.completed);
      setCompletedAt(data.completed_at || null);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setCompleting(false);
    }
  }, []);

  return {
    currentStep,
    totalSteps,
    completedSteps,
    clubId,
    seasonId,
    completed,
    completedAt,
    loading,
    completing,
    error,
    goNext,
    goBack,
    goTo,
    patchState,
    complete,
  };
}

export default useOnboardingState;
