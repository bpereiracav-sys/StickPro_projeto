import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  CalendarClock,
  CircleAlert,
  Loader2,
  Target,
  TrendingUp,
} from 'lucide-react';

import { evaluationsApi } from '../../services/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';

const collection = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const evaluationDate = (evaluation) =>
  evaluation?.evaluation_date ||
  evaluation?.created_at ||
  evaluation?.date ||
  evaluation?.updated_at ||
  null;

const criterionScores = (evaluation) => {
  const raw =
    evaluation?.criteria_scores ||
    evaluation?.scores ||
    evaluation?.results ||
    evaluation?.criteria ||
    [];

  if (Array.isArray(raw)) {
    return raw.map((item, index) => ({
      id:
        item?.criterion_id ||
        item?.id ||
        item?.code ||
        `${evaluation?.id || 'evaluation'}-${index}`,
      score: Number(item?.score ?? item?.value),
    }));
  }

  return Object.entries(raw || {}).map(([id, value]) => ({
    id,
    score: Number(value?.score ?? value?.value ?? value),
  }));
};

const formatDate = (value) => {
  if (!value) return 'Sem prazo';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Sem prazo';

  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getObjectiveState = (objective) => {
  if (objective.status === 'completed' || objective.progress >= 100) {
    return {
      label: 'Objetivo atingido',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      Icon: Award,
    };
  }

  if (
    objective.target_date &&
    new Date(objective.target_date) < new Date()
  ) {
    return {
      label: 'Prazo ultrapassado',
      className: 'border-red-200 bg-red-50 text-red-700',
      Icon: CircleAlert,
    };
  }

  if (objective.progress >= 70) {
    return {
      label: 'Boa evolução',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      Icon: TrendingUp,
    };
  }

  return {
    label: 'Em desenvolvimento',
    className: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    Icon: Target,
  };
};

function ObjectivePreview({ objective }) {
  const state = getObjectiveState(objective);
  const StateIcon = state.Icon;
  const progress = Math.max(
    0,
    Math.min(100, Number(objective.progress) || 0)
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">
            {objective.title || objective.criterion_name || 'Objetivo'}
          </p>
          <p className="mt-1 truncate text-sm text-slate-500">
            {objective.criterion_name || 'Competência individual'}
          </p>
        </div>

        <Badge variant="outline" className={state.className}>
          <StateIcon className="mr-1.5 h-3.5 w-3.5" />
          {state.label}
        </Badge>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Progresso
          </span>
          <span className="font-heading text-lg text-cyan-700">
            {Math.round(progress)}%
          </span>
        </div>

        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          Atual:{' '}
          {Number.isFinite(objective.currentValue)
            ? objective.currentValue.toFixed(1)
            : '—'}
        </span>
        <span>
          Meta:{' '}
          {Number.isFinite(Number(objective.target_value))
            ? Number(objective.target_value).toFixed(1)
            : '—'}
        </span>
        <span className="flex items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5" />
          {formatDate(objective.target_date)}
        </span>
      </div>
    </div>
  );
}

export default function AthletePIDCard({
  playerId,
  enabled = true,
  tr = (_key, fallback) => fallback,
}) {
  const [objectives, setObjectives] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!enabled || !playerId) {
      setObjectives([]);
      setEvaluations([]);
      setUnavailable(false);
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setUnavailable(false);

      try {
        const [objectivesResponse, evaluationsResponse] = await Promise.all([
          evaluationsApi.getPlayerObjectives(playerId),
          evaluationsApi.getPlayerEvaluations(playerId),
        ]);

        if (!active) return;

        setObjectives(collection(objectivesResponse?.data));
        setEvaluations(collection(evaluationsResponse?.data));
      } catch (error) {
        console.error('Error loading athlete PID:', error);

        if (!active) return;

        setObjectives([]);
        setEvaluations([]);
        setUnavailable(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [enabled, playerId]);

  const latestScores = useMemo(() => {
    const values = new Map();

    [...evaluations]
      .sort(
        (a, b) =>
          new Date(evaluationDate(b) || 0) -
          new Date(evaluationDate(a) || 0)
      )
      .forEach((evaluation) => {
        criterionScores(evaluation).forEach((entry) => {
          if (!Number.isFinite(entry.score) || values.has(entry.id)) return;
          values.set(entry.id, entry.score);
        });
      });

    return values;
  }, [evaluations]);

  const enriched = useMemo(() => {
    return objectives.map((objective) => {
      const currentValue = latestScores.get(objective.criterion_id);
      const target = Number(objective.target_value);
      const baseline = Number(objective.baseline_value ?? 1);

      let progress = 0;

      if (Number.isFinite(currentValue) && Number.isFinite(target)) {
        progress =
          target <= baseline
            ? currentValue >= target
              ? 100
              : 0
            : ((currentValue - baseline) / (target - baseline)) * 100;
      }

      return {
        ...objective,
        currentValue,
        progress: Math.max(0, Math.min(100, progress)),
      };
    });
  }, [objectives, latestScores]);

  const activeObjectives = useMemo(
    () =>
      enriched
        .filter((objective) => objective.status === 'active')
        .sort((a, b) => {
          const aRisk =
            a.target_date && new Date(a.target_date) < new Date() ? 1 : 0;
          const bRisk =
            b.target_date && new Date(b.target_date) < new Date() ? 1 : 0;

          if (aRisk !== bRisk) return bRisk - aRisk;
          return b.progress - a.progress;
        }),
    [enriched]
  );

  const completed = enriched.filter(
    (objective) =>
      objective.status === 'completed' || objective.progress >= 100
  ).length;

  const averageProgress = activeObjectives.length
    ? activeObjectives.reduce(
        (sum, objective) => sum + objective.progress,
        0
      ) / activeObjectives.length
    : 0;

  const attention = activeObjectives.filter(
    (objective) =>
      objective.target_date &&
      new Date(objective.target_date) < new Date() &&
      objective.progress < 100
  ).length;

  if (!enabled || !playerId) return null;

  return (
    <Card
      className="overflow-hidden border border-cyan-100 bg-gradient-to-br from-white via-cyan-50/50 to-blue-50/40 shadow-xl shadow-slate-200/60"
      data-testid="athlete-pid-dashboard-card"
    >
      <CardHeader className="border-b border-cyan-100/80">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge className="border border-cyan-200 bg-cyan-100 text-cyan-800 hover:bg-cyan-100">
                <Target className="mr-1.5 h-3.5 w-3.5" />
                {tr('objectives.pid', 'Plano Individual de Desenvolvimento')}
              </Badge>
            </div>

            <CardTitle className="text-2xl text-slate-950">
              {tr('objectives.myDevelopment', 'O meu desenvolvimento')}
            </CardTitle>

            <CardDescription className="mt-1">
              {tr(
                'objectives.dashboardHelp',
                'Acompanha as metas definidas pela equipa técnica e a tua evolução.'
              )}
            </CardDescription>
          </div>

          <Button asChild variant="outline" className="rounded-full bg-white">
            <Link to="/evaluations/objectives">
              {tr('objectives.viewPlan', 'Ver plano completo')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {loading ? (
          <div className="flex min-h-[180px] items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-cyan-600" />
          </div>
        ) : unavailable ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-center">
            <p className="font-semibold text-slate-700">
              {tr(
                'objectives.temporarilyUnavailable',
                'Não foi possível carregar o plano individual.'
              )}
            </p>
          </div>
        ) : enriched.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cyan-200 bg-white/70 p-6 text-center">
            <Target className="mx-auto h-10 w-10 text-cyan-300" />
            <p className="mt-3 font-semibold text-slate-800">
              {tr(
                'objectives.noObjectivesYet',
                'Ainda não tens objetivos individuais definidos.'
              )}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {tr(
                'objectives.noObjectivesHelp',
                'Quando a equipa técnica definir o teu plano, ele aparecerá aqui.'
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white bg-white/80 p-3">
                <p className="text-xs text-slate-500">
                  {tr('objectives.active', 'Em curso')}
                </p>
                <p className="font-heading text-2xl text-cyan-700">
                  {activeObjectives.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white bg-white/80 p-3">
                <p className="text-xs text-slate-500">
                  {tr('objectives.progress', 'Progresso')}
                </p>
                <p className="font-heading text-2xl text-slate-950">
                  {Math.round(averageProgress)}%
                </p>
              </div>

              <div className="rounded-2xl border border-white bg-white/80 p-3">
                <p className="text-xs text-slate-500">
                  {tr('objectives.completed', 'Concluídos')}
                </p>
                <p className="font-heading text-2xl text-emerald-700">
                  {completed}
                </p>
              </div>

              <div className="rounded-2xl border border-white bg-white/80 p-3">
                <p className="text-xs text-slate-500">
                  {tr('objectives.attention', 'Atenção')}
                </p>
                <p className="font-heading text-2xl text-amber-700">
                  {attention}
                </p>
              </div>
            </div>

            {activeObjectives.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {activeObjectives.slice(0, 2).map((objective) => (
                  <ObjectivePreview
                    key={objective.id}
                    objective={objective}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="font-semibold text-emerald-800">
                  {tr(
                    'objectives.noActiveObjectives',
                    'Não existem objetivos ativos neste momento.'
                  )}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
