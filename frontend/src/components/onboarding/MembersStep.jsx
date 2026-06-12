import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, Loader2, UserPlus } from 'lucide-react';

import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const ROLE_OPTIONS = [
  { value: 'treinador', labelKey: 'onboarding.steps.members.roleCoach' },
  { value: 'treinador_adjunto', labelKey: 'onboarding.steps.members.roleAssistantCoach' },
  { value: 'delegado', labelKey: 'onboarding.steps.members.roleDelegate' },
  { value: 'jogador', labelKey: 'onboarding.steps.members.rolePlayer' },
];

/**
 * Phase O3 — Members step.
 *
 * Reuses POST /api/members with suppress_invite=true so the activation
 * email is deferred to the Invitations step (O4). Lets the admin add
 * multiple members (coaches + players) before advancing.
 *
 * Per the spec the Members step is skippable; skip is wired in
 * OnboardingPage by reusing the shell's Skip button.
 */
export function MembersStep({
  clubId,
  stepCompleted,
  onContinue,
  onSaveAndContinue,
}) {
  const { t } = useLanguage();

  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('treinador');
  const [teamId, setTeamId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const teamsRes = await axios.get(`${API_URL}/teams`);
        if (cancelled) return;
        const clubTeams = (teamsRes.data || []).filter(
          (tm) => tm.club_id === clubId
        );
        setTeams(clubTeams);
        if (clubTeams.length > 0 && !teamId) {
          setTeamId(clubTeams[0].id);
        }
      } catch (err) {
        // Soft-fail.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  if (stepCompleted) {
    return (
      <div
        className="rounded-md border border-border bg-muted/20 px-4 py-6 flex items-start gap-3"
        data-testid="onboarding-members-already-created"
      >
        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground mb-1">
            {t('onboarding.alreadyCreatedTitle')}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {t('onboarding.steps.members.alreadyAddedDescription')}
          </p>
          <Button
            type="button"
            onClick={onContinue}
            data-testid="onboarding-members-continue-btn"
          >
            {t('onboarding.continueButton')}
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <p
        className="text-sm text-destructive"
        data-testid="onboarding-members-missing-team"
      >
        {t('onboarding.steps.members.missingTeamError')}
      </p>
    );
  }

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API_URL}/members`, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        team_id: teamId || null,
        club_id: clubId || null,
        suppress_invite: true,
      });
      setMembers((prev) => [
        ...prev,
        { ...data.user, _team_id: teamId },
      ]);
      setName('');
      setEmail('');
      toast.success(t('onboarding.steps.members.createdToast'));
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(
        typeof detail === 'string'
          ? detail
          : t('onboarding.steps.members.errorToast')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAndContinue = async () => {
    setAdvancing(true);
    try {
      await onSaveAndContinue();
    } finally {
      setAdvancing(false);
    }
  };

  const teamLabelFor = (tid) => {
    const tm = teams.find((t) => t.id === tid);
    return tm ? tm.name : '';
  };

  return (
    <div className="space-y-6" data-testid="onboarding-members-step">
      <div
        className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-900 dark:text-amber-200"
        data-testid="onboarding-members-invite-warning"
      >
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{t('onboarding.steps.members.inviteWarning')}</span>
      </div>

      <form
        onSubmit={handleAddMember}
        className="space-y-4"
        data-testid="onboarding-members-form"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="member-name">
              {t('onboarding.steps.members.nameLabel')}
            </Label>
            <Input
              id="member-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('onboarding.steps.members.namePlaceholder')}
              data-testid="onboarding-member-name-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-email">
              {t('onboarding.steps.members.emailLabel')}
            </Label>
            <Input
              id="member-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('onboarding.steps.members.emailPlaceholder')}
              data-testid="onboarding-member-email-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="member-role">
              {t('onboarding.steps.members.roleLabel')}
            </Label>
            <select
              id="member-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              data-testid="onboarding-member-role-select"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="member-team">
              {t('onboarding.steps.members.teamLabel')}
            </Label>
            <select
              id="member-team"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              data-testid="onboarding-member-team-select"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">
                {t('onboarding.steps.members.teamPlaceholderNone')}
              </option>
              {teams.map((tm) => (
                <option key={tm.id} value={tm.id}>
                  {tm.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="outline"
            disabled={submitting || !name.trim() || !email.trim()}
            data-testid="onboarding-member-add-btn"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('onboarding.steps.members.adding')}
              </>
            ) : (
              t('onboarding.steps.members.addMemberButton')
            )}
          </Button>
        </div>
      </form>

      {members.length > 0 && (
        <div className="space-y-2" data-testid="onboarding-members-list">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('onboarding.steps.members.createdListTitle')}
          </p>
          <ul className="space-y-2">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2"
                data-testid={`onboarding-members-list-item-${m.id}`}
              >
                <UserPlus className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {m.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {m.email} • {m.role}
                    {m._team_id ? ` • ${teamLabelFor(m._team_id)}` : ''}
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
          disabled={advancing}
          data-testid="onboarding-members-save-continue-btn"
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

export default MembersStep;
