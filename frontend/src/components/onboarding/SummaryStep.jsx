import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  Send,
} from 'lucide-react';

import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

/**
 * Phase O4 — Summary step.
 *
 * Renders the onboarding outcome (state of each previous step) plus a
 * preview table of pending members so the admin can confirm or unselect
 * before triggering POST /api/onboarding/send-invites. After the invites
 * are dispatched (or skipped if nobody is selected), the "Complete
 * onboarding" CTA calls POST /api/onboarding/complete and the parent
 * page redirects to the dashboard.
 */
function StateRow({ done, label, testId }) {
  return (
    <li
      className="flex items-center gap-2 text-sm"
      data-testid={testId}
    >
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
      ) : (
        <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
      )}
      <span className={done ? 'text-foreground' : 'text-muted-foreground'}>
        {label}
      </span>
    </li>
  );
}

export function SummaryStep({
  completedSteps = [],
  onComplete,
  completing = false,
}) {
  const { t } = useLanguage();
  const completedSet = useMemo(() => new Set(completedSteps), [completedSteps]);

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [dryRun, setDryRun] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get(`${API_URL}/onboarding/invite-preview`);
        if (cancelled) return;
        const list = data?.members || [];
        setMembers(list);
        setSelected(new Set(list.map((m) => m.id)));
        setDryRun(!!data?.dry_run);
      } catch (err) {
        // Soft-fail — Summary still renders without preview.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(members.map((m) => m.id)));
  const selectNone = () => setSelected(new Set());

  const handleSendInvites = async () => {
    if (selected.size === 0) return;
    setSending(true);
    try {
      const { data } = await axios.post(`${API_URL}/onboarding/send-invites`, {
        member_ids: Array.from(selected),
      });
      const msg = t('onboarding.steps.summary.invitesSentToast')
        .replace('{{sent}}', String(data.sent_count))
        .replace('{{skipped}}', String(data.skipped_count))
        .replace('{{failed}}', String(data.failed_count));
      toast.success(msg);
      // Re-pull preview so already-invited members can drop off if backend
      // ever flips them to activated (no-op in current flow but defensive).
      try {
        const { data: refreshed } = await axios.get(
          `${API_URL}/onboarding/invite-preview`
        );
        setMembers(refreshed?.members || []);
      } catch (_) { /* ignore */ }
    } catch (err) {
      toast.error(t('onboarding.steps.summary.invitesErrorToast'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="onboarding-summary-step">
      {/* State checklist */}
      <ul className="space-y-2" data-testid="onboarding-summary-state-list">
        <StateRow
          done={completedSet.has('club')}
          label={t('onboarding.steps.summary.stateClub')}
          testId="onboarding-summary-state-club"
        />
        <StateRow
          done={completedSet.has('season')}
          label={t('onboarding.steps.summary.stateSeason')}
          testId="onboarding-summary-state-season"
        />
        <StateRow
          done={completedSet.has('teams')}
          label={t('onboarding.steps.summary.stateTeams')}
          testId="onboarding-summary-state-teams"
        />
        <StateRow
          done={completedSet.has('members')}
          label={t('onboarding.steps.summary.stateMembers')}
          testId="onboarding-summary-state-members"
        />
        <StateRow
          done={false}
          label={t('onboarding.steps.summary.stateInvitations')}
          testId="onboarding-summary-state-invitations"
        />
      </ul>

      {/* Invitation preview */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t('onboarding.steps.summary.invitationsTitle')}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t('onboarding.steps.summary.invitationsHint')}
          </p>
        </div>

        {dryRun && (
          <div
            className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-900 dark:text-amber-200"
            data-testid="onboarding-summary-dry-run-warning"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{t('onboarding.steps.summary.dryRunWarning')}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <p
            className="text-sm text-muted-foreground italic"
            data-testid="onboarding-summary-no-members"
          >
            {t('onboarding.steps.summary.noPendingMembers')}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={selectAll}
                className="text-primary hover:underline"
                data-testid="onboarding-summary-select-all"
              >
                {t('onboarding.steps.summary.selectAll')}
              </button>
              <span className="text-muted-foreground">•</span>
              <button
                type="button"
                onClick={selectNone}
                className="text-muted-foreground hover:underline"
                data-testid="onboarding-summary-select-none"
              >
                {t('onboarding.steps.summary.selectNone')}
              </button>
            </div>

            <div
              className="rounded-md border border-border overflow-hidden"
              data-testid="onboarding-summary-invite-table"
            >
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-3 py-2 w-10">
                      {t('onboarding.steps.summary.tableSelected')}
                    </th>
                    <th className="px-3 py-2">
                      {t('onboarding.steps.summary.tableName')}
                    </th>
                    <th className="px-3 py-2">
                      {t('onboarding.steps.summary.tableEmail')}
                    </th>
                    <th className="px-3 py-2">
                      {t('onboarding.steps.summary.tableRole')}
                    </th>
                    <th className="px-3 py-2">
                      {t('onboarding.steps.summary.tableTeam')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr
                      key={m.id}
                      className="border-t border-border"
                      data-testid={`onboarding-summary-row-${m.id}`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(m.id)}
                          onChange={() => toggle(m.id)}
                          data-testid={`onboarding-summary-checkbox-${m.id}`}
                          aria-label={m.name}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-foreground">
                        {m.name}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]">
                        {m.email}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {m.role}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {m.team_name || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleSendInvites}
                disabled={sending || selected.size === 0}
                data-testid="onboarding-summary-send-invites-btn"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('onboarding.steps.summary.sendingInvites')}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {t('onboarding.steps.summary.sendInvitesButton')}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Complete CTA */}
      <div className="pt-2 flex justify-end">
        <Button
          type="button"
          onClick={onComplete}
          disabled={completing}
          data-testid="onboarding-summary-complete-btn"
        >
          {completing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('onboarding.finishing')}
            </>
          ) : (
            t('onboarding.steps.summary.completeButton')
          )}
        </Button>
      </div>
    </div>
  );
}

export default SummaryStep;
