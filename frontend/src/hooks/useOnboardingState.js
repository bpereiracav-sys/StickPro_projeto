import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

/**
 * Phase O1 — Admin onboarding shell hook.
 *
 * Owns the wizard's transient UI state (current step) and persistence via the
 * `/api/onboarding/status` and `/api/onboarding/complete` endpoints. Later
 * phases (O2..O4) will layer per-step form state on top of this.
 */
export function useOnboardingState({ totalSteps }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [completedAt, setCompletedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_URL}/onboarding/status`);
      setCompleted(!!data.completed);
      setCompletedAt(data.completed_at || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get(`${API_URL}/onboarding/status`);
        if (cancelled) return;
        setCompleted(!!data.completed);
        setCompletedAt(data.completed_at || null);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    completed,
    completedAt,
    loading,
    completing,
    error,
    goNext,
    goBack,
    goTo,
    complete,
    refresh,
  };
}

export default useOnboardingState;
