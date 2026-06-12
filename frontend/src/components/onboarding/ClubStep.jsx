import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';

import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

/**
 * Phase O2 — Club step.
 *
 * If the wizard already created a club (clubId persisted in
 * onboarding_state), shows a confirmation card with a "Continue" button.
 * Otherwise renders a minimal form (name, acronym, city, country,
 * optional logo URL) that calls POST /api/clubs and then persists the
 * resulting id via patchState.
 */
export function ClubStep({ existingClubId, onContinue, onCreated }) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [acronym, setAcronym] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Portugal');
  const [logoUrl, setLogoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (existingClubId) {
    return (
      <div
        className="rounded-md border border-border bg-muted/20 px-4 py-6 flex items-start gap-3"
        data-testid="onboarding-club-already-created"
      >
        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground mb-1">
            {t('onboarding.alreadyCreatedTitle')}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {t('onboarding.steps.club.alreadyCreatedDescription')}
          </p>
          <Button
            type="button"
            onClick={onContinue}
            data-testid="onboarding-club-continue-btn"
          >
            {t('onboarding.continueButton')}
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API_URL}/clubs`, {
        name: name.trim(),
        acronym: acronym.trim() || null,
        city: city.trim() || null,
        country: country.trim() || 'Portugal',
        logo_url: logoUrl.trim() || null,
      });
      toast.success(t('onboarding.steps.club.createdToast'));
      await onCreated(data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(
        typeof detail === 'string'
          ? detail
          : t('onboarding.steps.club.errorToast')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      data-testid="onboarding-club-form"
    >
      <div className="space-y-2">
        <Label htmlFor="club-name">
          {t('onboarding.steps.club.nameLabel')}
        </Label>
        <Input
          id="club-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('onboarding.steps.club.namePlaceholder')}
          data-testid="onboarding-club-name-input"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="club-acronym">
            {t('onboarding.steps.club.acronymLabel')}
          </Label>
          <Input
            id="club-acronym"
            value={acronym}
            onChange={(e) => setAcronym(e.target.value)}
            placeholder={t('onboarding.steps.club.acronymPlaceholder')}
            data-testid="onboarding-club-acronym-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="club-city">
            {t('onboarding.steps.club.cityLabel')}
          </Label>
          <Input
            id="club-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t('onboarding.steps.club.cityPlaceholder')}
            data-testid="onboarding-club-city-input"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="club-country">
          {t('onboarding.steps.club.countryLabel')}
        </Label>
        <Input
          id="club-country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder={t('onboarding.steps.club.countryPlaceholder')}
          data-testid="onboarding-club-country-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="club-logo">
          {t('onboarding.steps.club.logoUrlLabel')}
        </Label>
        <Input
          id="club-logo"
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder={t('onboarding.steps.club.logoUrlPlaceholder')}
          data-testid="onboarding-club-logo-input"
        />
      </div>

      <div className="pt-2 flex justify-end">
        <Button
          type="submit"
          disabled={submitting || !name.trim()}
          data-testid="onboarding-club-submit-btn"
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

export default ClubStep;
