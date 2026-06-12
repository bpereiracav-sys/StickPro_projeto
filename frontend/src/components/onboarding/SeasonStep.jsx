import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';

import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

function defaultSeasonName() {
  const now = new Date();
  const year = now.getFullYear();
  // Sept onwards → "YYYY/YYYY+1", otherwise → "YYYY-1/YYYY"
  return now.getMonth() >= 8 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

function defaultStartDate() {
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-09-01`;
}

function defaultEndDate() {
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  return `${year}-06-30`;
}

/**
 * Phase O2 — Season step.
 *
 * Creates the active season for the club picked in the previous step.
 * If a season was already persisted in onboarding_state, shows the
 * confirmation card with a "Continue" button instead of the form.
 */
export function SeasonStep({ clubId, existingSeasonId, onContinue, onCreated }) {
  const { t } = useLanguage();
  const [name, setName] = useState(defaultSeasonName());
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(defaultEndDate());
  const [submitting, setSubmitting] = useState(false);

  if (existingSeasonId) {
    return (
      <div
        className="rounded-md border border-border bg-muted/20 px-4 py-6 flex items-start gap-3"
        data-testid="onboarding-season-already-created"
      >
        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground mb-1">
            {t('onboarding.alreadyCreatedTitle')}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {t('onboarding.steps.season.alreadyCreatedDescription')}
          </p>
          <Button
            type="button"
            onClick={onContinue}
            data-testid="onboarding-season-continue-btn"
          >
            {t('onboarding.continueButton')}
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!clubId) {
      toast.error(t('onboarding.steps.season.missingClubError'));
      return;
    }
    if (!name.trim() || !startDate || !endDate) return;
    if (new Date(endDate) <= new Date(startDate)) {
      toast.error(t('onboarding.steps.season.dateOrderError'));
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/clubs/${clubId}/seasons`,
        {
          name: name.trim(),
          start_date: startDate,
          end_date: endDate,
          is_active: true,
        }
      );
      toast.success(t('onboarding.steps.season.createdToast'));
      await onCreated(data.season || data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(
        typeof detail === 'string'
          ? detail
          : t('onboarding.steps.season.errorToast')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      data-testid="onboarding-season-form"
    >
      <div className="space-y-2">
        <Label htmlFor="season-name">
          {t('onboarding.steps.season.nameLabel')}
        </Label>
        <Input
          id="season-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('onboarding.steps.season.namePlaceholder')}
          data-testid="onboarding-season-name-input"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="season-start">
            {t('onboarding.steps.season.startDateLabel')}
          </Label>
          <Input
            id="season-start"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            data-testid="onboarding-season-start-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="season-end">
            {t('onboarding.steps.season.endDateLabel')}
          </Label>
          <Input
            id="season-end"
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            data-testid="onboarding-season-end-input"
          />
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <Button
          type="submit"
          disabled={submitting || !name.trim() || !clubId}
          data-testid="onboarding-season-submit-btn"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('onboarding.saving')}
            </>
          ) : (
            t('onboarding.saveAndContinue')
          )}
        </Button>
      </div>
    </form>
  );
}

export default SeasonStep;
