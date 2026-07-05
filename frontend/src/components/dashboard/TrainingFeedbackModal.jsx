import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export default function TrainingFeedbackModal({
  pendingFeedback = [],
  feedbackRating,
  feedbackComment,
  setFeedbackRating,
  setFeedbackComment,
  onSubmit,
  t,
}) {
  if (!pendingFeedback.length) return null;

  const feedbackItem = pendingFeedback[0];
  const event = feedbackItem?.event || {};

  const startDate = event.start_time ? new Date(event.start_time) : null;
  const endDate = event.end_time ? new Date(event.end_time) : null;

  const eventDate = startDate
    ? startDate.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '-';

  const startHour = startDate
    ? startDate.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

  const endHour = endDate
    ? endDate.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/82 px-4 backdrop-blur-sm">
      <Card className="w-full max-w-[620px] overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-gradient-to-br from-white via-cyan-50/80 to-slate-50 shadow-2xl shadow-slate-950/40">
        <CardContent className="p-5 sm:p-6">
          <div className="text-center">
            <Badge className="mb-4 bg-cyan-500 px-4 py-1.5 text-white">
              💬 {t('trainingFeedback.title')}
            </Badge>

            <h2 className="font-heading text-3xl text-slate-950">
              {t('trainingFeedback.question')}
            </h2>

            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-500">
              {t('trainingFeedback.requiredMessage')}
            </p>
          </div>

          <div className="mt-6 rounded-3xl border border-cyan-100 bg-white/80 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">
              {t('trainingFeedback.event')}
            </p>

            <h3 className="mt-1 font-heading text-xl text-slate-950">
              {event.title || t('calendar.event')}
            </h3>

            <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-400">{t('trainingFeedback.date')}</p>
                <p className="font-semibold text-slate-800">{eventDate}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-400">{t('trainingFeedback.startTime')}</p>
                <p className="font-semibold text-slate-800">{startHour}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-400">{t('trainingFeedback.endTime')}</p>
                <p className="font-semibold text-slate-800">{endHour}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { value: 'positive', icon: '🙂', label: t('trainingFeedback.positive') },
              { value: 'neutral', icon: '😐', label: t('trainingFeedback.neutral') },
              { value: 'negative', icon: '🙁', label: t('trainingFeedback.negative') },
            ].map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={feedbackRating === option.value ? 'default' : 'outline'}
                className="h-auto rounded-3xl px-4 py-5 text-base"
                onClick={() => setFeedbackRating(option.value)}
              >
                <span className="mr-2 text-2xl">{option.icon}</span>
                {option.label}
              </Button>
            ))}
          </div>

          <div className="relative mt-4">
            <textarea
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder={t('trainingFeedback.commentPlaceholder')}
              maxLength={250}
              className="min-h-[88px] w-full resize-none rounded-3xl border border-slate-200 bg-white/95 p-4 pr-16 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            />

            <span className="absolute bottom-3 right-4 text-xs text-slate-400">
              {feedbackComment.length}/250
            </span>
          </div>

          <Button
            type="button"
            className="mt-5 h-12 w-full rounded-3xl bg-cyan-600 text-base font-semibold text-white hover:bg-cyan-700"
            disabled={!feedbackRating}
            onClick={onSubmit}
          >
            💬 {t('trainingFeedback.submit')}
          </Button>

          {pendingFeedback.length > 1 && (
            <p className="mt-4 text-center text-xs text-slate-500">
              {t('trainingFeedback.morePending').replace('{count}', pendingFeedback.length - 1)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
