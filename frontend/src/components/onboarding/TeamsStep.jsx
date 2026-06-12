import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Users } from 'lucide-react';

import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

/**
 * Phase O3 — Teams step.
 *
 * Reuses POST /api/teams. Pulls the active season's name via
 * GET /api/clubs/{clubId}/seasons/active and links every team to the
 * onboarding club_id. Forces at least one team before allowing the user
 * to move to the Members step (skip is disabled by OnboardingPage).
 *
 * If the wizard already completed this step (`stepCompleted`), shows a
 * confirmation card with a Continue button.
 */
export function TeamsStep({
  clubId,
  stepCompleted,
  onContinue,
  onSaveAndContinue,
}) {
  const { t } = useLanguage();

  const [seasonName, setSeasonName] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [teams, setTeams] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!clubId) {
      setLoading(false);
      return undefined;
    }
    (async () => {
      try {
        const seasonRes = await axios.get(
          `${API_URL}/clubs/${clubId}/seasons/active`
        );
        if (!cancelled) setSeasonName(seasonRes.data?.name || '');

        // Pull existing teams for the club + active season so reload-then-
        // resume shows what was already created.
        const teamsRes = await axios.get(`${API_URL}/teams`);
        if (!cancelled) {
          const clubTeams = (teamsRes.data || []).filter(
            (tm) =>
              tm.club_id === clubId &&
              (!seasonRes.data?.name || tm.season === seasonRes.data.name)
          );
          setTeams(clubTeams);
        }
      } catch (err) {
        // Soft-fail: form still works without prefilled data.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  if (stepCompleted) {
    return (
      <div
        className="rounded-md border border-border bg-muted/20 px-4 py-6 flex items-start gap-3"
        data-testid="onboarding-teams-already-created"
      >
        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground mb-1">
            {t('onboarding.alreadyCreatedTitle')}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {t('onboarding.steps.teams.alreadyCreatedDescription')}
          </p>
          <Button
            type="button"
            onClick={onContinue}
            data-testid="onboarding-teams-continue-btn"
          >
            {t('onboarding.continueButton')}
          </Button>
        </div>
      </div>
    );
  }

  if (!clubId) {
    return (
      <p
        className="text-sm text-destructive"
        data-testid="onboarding-teams-missing-club"
      >
        {t('onboarding.steps.teams.missingClubError')}
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleAddTeam = async (e) => {
    e.preventDefault();
    if (!name.trim() || !category.trim()) return;

    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API_URL}/teams`, {
        name: name.trim(),
        category: category.trim(),
        season: seasonName || '',
        club_id: clubId,
      });
      setTeams((prev) => [...prev, data]);
      setName('');
      setCategory('');
      toast.success(t('onboarding.steps.teams.createdToast'));
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(
        typeof detail === 'string'
          ? detail
          : t('onboarding.steps.teams.errorToast')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAndContinue = async () => {
    if (teams.length === 0) {
      toast.error(t('onboarding.steps.teams.requiresOneTeam'));
      return;
    }
    setAdvancing(true);
    try {
      await onSaveAndContinue();
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="onboarding-teams-step">
      <form
        onSubmit={handleAddTeam}
        className="space-y-4"
        data-testid="onboarding-teams-form"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">
              {t('onboarding.steps.teams.nameLabel')}
            </Label>
            <Input
              id="team-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('onboarding.steps.teams.namePlaceholder')}
              data-testid="onboarding-team-name-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-category">
              {t('onboarding.steps.teams.categoryLabel')}
            </Label>
            <Input
              id="team-category"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t('onboarding.steps.teams.categoryPlaceholder')}
              data-testid="onboarding-team-category-input"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="outline"
            disabled={submitting || !name.trim() || !category.trim()}
            data-testid="onboarding-team-add-btn"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('onboarding.steps.teams.adding')}
              </>
            ) : (
              t('onboarding.steps.teams.addTeamButton')
            )}
          </Button>
        </div>
      </form>

      {teams.length > 0 && (
        <div className="space-y-2" data-testid="onboarding-teams-list">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('onboarding.steps.teams.createdListTitle')}
          </p>
          <ul className="space-y-2">
            {teams.map((tm) => (
              <li
                key={tm.id}
                className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2"
                data-testid={`onboarding-teams-list-item-${tm.id}`}
              >
                <Users className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {tm.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {tm.category}
                    {tm.season ? ` • ${tm.season}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={handleSaveAndContinue}
          disabled={advancing || teams.length === 0}
          data-testid="onboarding-teams-save-continue-btn"
        >
          {advancing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('onboarding.saving')}
            </>
          ) : (
            t('onboarding.saveAndContinue')
          )}
        </Button>
      </div>
    </div>
  );
}

export default TeamsStep;
