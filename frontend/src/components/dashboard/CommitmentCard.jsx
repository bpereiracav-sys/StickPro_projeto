import { Link } from 'react-router-dom';
import { Badge } from '../ui/badge';

export default function CommitmentCard({ commitment, t, tr }) {
  if (!commitment) return null;

  const getCommitmentMedal = (medal) => {
    if (medal === 'gold') return { icon: '🥇', color: '#D4AF37' };
    if (medal === 'silver') return { icon: '🥈', color: '#C0C0C0' };
    if (medal === 'bronze') return { icon: '🥉', color: '#CD7F32' };
    return { icon: '🏆', color: '#94A3B8' };
  };

  const trainingRate = commitment.training?.rate || 0;
  const gameRate = commitment.games?.rate || 0;
  const globalScore = Math.round((trainingRate + gameRate) / 2);

  const trainingMedal = getCommitmentMedal(commitment.training?.medal);
  const gamesMedal = getCommitmentMedal(commitment.games?.medal);
  const globalMedal = getCommitmentMedal(
    commitment.training?.medal || commitment.games?.medal || 'none'
  );

  const targetMedal = commitment.training?.next_goal?.target || 'bronze';
  const missing = commitment.training?.next_goal?.missing || 0;

  return (
    <Link to="/attendance" className="block">
      <section className="relative overflow-hidden rounded-[1.5rem] border border-amber-200/70 bg-slate-950 px-4 py-3 text-white shadow-xl shadow-amber-100/60 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-amber-100/70 sm:px-5 lg:rounded-[1.75rem]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.25),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(192,192,192,0.16),transparent_28%)]"
          aria-hidden="true"
        />

        <div className="relative z-10 grid gap-4 xl:grid-cols-[1fr_2.4fr] xl:items-center">
          <div className="flex flex-col justify-center">
            <Badge variant="outline" className="mb-3 w-fit border-white/20 bg-white/10 text-white">
              🏅 STICKPro Commitment
            </Badge>

            <h2 className="font-heading text-xl font-bold text-white sm:text-2xl">
              {t('commitment.myCommitment')}
            </h2>

            <p className="mt-1 line-clamp-2 text-xs text-white/70 sm:text-sm lg:line-clamp-none">
              {tr('commitment.description', 'Compromisso, assiduidade e participação ao longo da época.')}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-slate-300">
                  {tr('commitment.globalScore', 'Score Global')}
                </p>
                <span className="text-2xl">🛼</span>
              </div>
              <div className="mt-2 flex items-end gap-2">
                <p className="font-heading text-3xl leading-none">{globalScore}%</p>
                <span className="text-sm" style={{ color: globalMedal.color }}>
                  {globalMedal.icon}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${globalScore}%`,
                    backgroundColor: globalMedal.color,
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-300">{tr('commitment.trainings', 'Treinos')}</p>
                <span className="text-2xl">🥅</span>
              </div>
              <p className="mt-2 font-heading text-2xl leading-none">{trainingRate}%</p>
              {commitment.training?.medal !== 'none' && (
                <p className="mt-1 text-xs text-slate-300">
                  {trainingMedal.icon} {tr(`commitment.medals.${commitment.training?.medal}`, '')}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-300">{tr('commitment.games', 'Jogos')}</p>
                <span className="text-2xl">🏒</span>
              </div>
              <p className="mt-2 font-heading text-2xl leading-none">{gameRate}%</p>
              {commitment.games?.medal !== 'none' && (
                <p className="mt-1 text-xs text-slate-300">
                  {gamesMedal.icon} {tr(`commitment.medals.${commitment.games?.medal}`, '')}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-300">{tr('commitment.nextGoal', 'Próximo Objetivo')}</p>
                <span className="text-2xl">🏆</span>
              </div>
              <p className="mt-2 font-heading text-xl leading-none">
                {tr(`commitment.medals.${targetMedal}`, 'Bronze')}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                {missing === 1
                  ? `1 ${tr('commitment.attendance', 'presença')} ${tr('commitment.to', 'para')} ${tr(`commitment.medals.${targetMedal}`, 'Bronze')}`
                  : `${missing} ${tr('commitment.attendances', 'presenças')} ${tr('commitment.to', 'para')} ${tr(`commitment.medals.${targetMedal}`, 'Bronze')}`}
              </p>
            </div>
          </div>
        </div>
      </section>
    </Link>
  );
}
