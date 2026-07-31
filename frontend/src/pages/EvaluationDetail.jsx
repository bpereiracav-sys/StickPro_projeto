import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  MessageSquareText,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

import { evaluationsApi } from '../services/api';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';

const CATEGORY_CONFIG = {
  technical: {
    label: 'Técnica',
    className:
      'border-cyan-200 bg-cyan-50 text-cyan-700',
  },
  tactical: {
    label: 'Tática',
    className:
      'border-blue-200 bg-blue-50 text-blue-700',
  },
  physical: {
    label: 'Física',
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  psychological: {
    label: 'Psicológica',
    className:
      'border-purple-200 bg-purple-50 text-purple-700',
  },
  attitude: {
    label: 'Atitude',
    className:
      'border-amber-200 bg-amber-50 text-amber-700',
  },
  other: {
    label: 'Outro',
    className:
      'border-slate-200 bg-slate-50 text-slate-700',
  },
};

function formatDate(value) {
  if (!value) {
    return 'Sem data';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sem data';
  }

  return date.toLocaleDateString(
    'pt-PT',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }
  );
}

function getEvaluationTitle(evaluation) {
  return (
    evaluation?.plan_name ||
    evaluation?.plan?.name ||
    evaluation?.template_name ||
    evaluation?.title ||
    evaluation?.period_label ||
    'Avaliação individual'
  );
}

function getScores(evaluation) {
  const raw =
    evaluation?.scores ||
    evaluation?.criteria_scores ||
    evaluation?.results ||
    [];

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item, index) => {
      const criterion =
        item?.criterion || {};

      const score = Number(
        item?.score ??
          item?.value
      );

      return {
        id:
          item?.criterion_id ||
          item?.id ||
          `${evaluation?.id || 'evaluation'}-${index}`,

        name:
          item?.criterion_name ||
          item?.name ||
          criterion?.name ||
          criterion?.observableAction ||
          `Critério ${index + 1}`,

        description:
          criterion?.description ||
          item?.description ||
          null,

        category:
          item?.category ||
          criterion?.category ||
          'other',

        domainLabel:
          item?.domainLabel ||
          item?.domain_label ||
          criterion?.domainLabel ||
          criterion?.domain_label ||
          null,

        subdomainLabel:
          item?.subdomainLabel ||
          item?.subdomain_label ||
          criterion?.subdomainLabel ||
          criterion?.subdomain_label ||
          null,

        scaleMin: Number(
          item?.scale_min ??
            criterion?.scale_min ??
            1
        ),

        scaleMax: Number(
          item?.scale_max ??
            criterion?.scale_max ??
            5
        ),

        score,
      };
    })
    .filter((item) =>
      Number.isFinite(item.score)
    );
}

function getOverallScore(
  evaluation,
  scores
) {
  const direct = Number(
    evaluation?.overall_score ??
      evaluation?.average_score
  );

  if (Number.isFinite(direct)) {
    return direct;
  }

  if (!scores.length) {
    return null;
  }

  return (
    scores.reduce(
      (total, item) =>
        total + item.score,
      0
    ) / scores.length
  );
}

function TextList({
  title,
  description,
  items,
  icon: Icon,
  tone = 'cyan',
}) {
  const styles = {
    cyan: {
      card: 'border-cyan-100 bg-cyan-50/50',
      icon: 'bg-cyan-600',
    },
    emerald: {
      card:
        'border-emerald-100 bg-emerald-50/50',
      icon: 'bg-emerald-600',
    },
    amber: {
      card:
        'border-amber-100 bg-amber-50/50',
      icon: 'bg-amber-500',
    },
    purple: {
      card:
        'border-purple-100 bg-purple-50/50',
      icon: 'bg-purple-600',
    },
  };

  const style =
    styles[tone] || styles.cyan;

  return (
    <Card className={style.card}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${style.icon}`}
          >
            <Icon className="h-4 w-4" />
          </span>

          {title}
        </CardTitle>

        {description && (
          <CardDescription>
            {description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">
            Sem informação registada.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={`${index}-${item}`}
                className="flex items-start gap-2 rounded-2xl border border-white bg-white/80 p-3"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                <p className="text-sm leading-6 text-slate-700">
                  {item}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function EvaluationDetail() {
  const { evaluationId } =
    useParams();

  const navigate = useNavigate();

  const [
    evaluation,
    setEvaluation,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    if (!evaluationId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadEvaluation =
      async () => {
        setLoading(true);

        try {
          const response =
            await evaluationsApi.getEvaluation(
              evaluationId
            );

          if (!cancelled) {
            setEvaluation(
              response?.data || null
            );
          }
        } catch (error) {
          console.error(
            'Error loading evaluation:',
            error
          );

          if (!cancelled) {
            toast.error(
              error.response?.data?.detail ||
                'Erro ao carregar a avaliação'
            );

            setEvaluation(null);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

    loadEvaluation();

    return () => {
      cancelled = true;
    };
  }, [evaluationId]);

  const scores = useMemo(
    () => getScores(evaluation),
    [evaluation]
  );

  const overallScore = useMemo(
    () =>
      getOverallScore(
        evaluation,
        scores
      ),
    [evaluation, scores]
  );

  const groupedScores = useMemo(() => {
    const groups = new Map();

    scores.forEach((score) => {
      const key =
        score.domainLabel ||
        CATEGORY_CONFIG[
          score.category
        ]?.label ||
        'Outros';

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push(score);
    });

    return Array.from(
      groups.entries()
    );
  }, [scores]);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-cyan-600" />
      </div>
    );
  }

  if (!evaluation) {
    return (
      <Card className="border-dashed bg-slate-50">
        <CardContent className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
          <ClipboardCheck className="h-14 w-14 text-slate-300" />

          <h1 className="mt-4 font-heading text-2xl text-slate-950">
            Avaliação não disponível
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Não foi possível consultar esta avaliação.
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-5 rounded-full"
            onClick={() =>
              navigate(-1)
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const strengths = Array.isArray(
    evaluation?.strengths
  )
    ? evaluation.strengths
    : evaluation?.strengths
      ? [evaluation.strengths]
      : [];

  const improvementGoals =
    Array.isArray(
      evaluation?.improvement_goals
    )
      ? evaluation.improvement_goals
      : evaluation?.improvement_goals
        ? [
            evaluation.improvement_goals,
          ]
        : [];

  return (
    <div
      className="space-y-5 pb-20 pt-1 lg:pb-0"
      data-testid="evaluation-detail-page"
    >
      <section className="overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-slate-950 p-5 text-white shadow-xl sm:p-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            navigate(-1)
          }
          className="mb-4 -ml-2 text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao histórico
        </Button>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="mb-3 border border-white/15 bg-white/10 text-white">
              <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
              Detalhe da avaliação
            </Badge>

            <h1 className="font-heading text-3xl sm:text-5xl">
              {getEvaluationTitle(
                evaluation
              )}
            </h1>

            <p className="mt-2 text-slate-300">
              {formatDate(
                evaluation?.created_at
              )}
            </p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 px-6 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">
              Resultado global
            </p>

            <p className="mt-1 font-heading text-5xl">
              {overallScore !== null
                ? overallScore.toFixed(1)
                : '—'}
            </p>

            <p className="mt-1 text-xs text-slate-300">
              Escala 1–5
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-cyan-100 bg-cyan-50/50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-cyan-700">
              Critérios avaliados
            </p>

            <p className="mt-2 font-heading text-4xl text-slate-950">
              {scores.length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-purple-50/50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-purple-700">
              Momento
            </p>

            <p className="mt-2 font-heading text-xl text-slate-950">
              {evaluation?.period_label ||
                'Avaliação geral'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-emerald-50/50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-emerald-700">
              Partilha
            </p>

            <p className="mt-2 font-heading text-xl text-slate-950">
              {evaluation?.shared ||
              evaluation?.share_with_player
                ? 'Partilhada'
                : 'Equipa técnica'}
            </p>
          </CardContent>
        </Card>
      </div>

      {evaluation?.public_summary && (
        <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Resumo da avaliação
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="leading-7 text-slate-700">
              {evaluation.public_summary}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cyan-600" />
            Resultados por competência
          </CardTitle>

          <CardDescription>
            Pontuações registadas nos critérios da avaliação.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {groupedScores.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <Target className="mx-auto h-12 w-12 text-slate-300" />

              <p className="mt-3 font-semibold text-slate-800">
                Sem resultados disponíveis
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {groupedScores.map(
                ([groupName, items]) => (
                  <section
                    key={groupName}
                    className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h2 className="font-heading text-xl text-slate-950">
                        {groupName}
                      </h2>

                      <Badge variant="outline">
                        {items.length}{' '}
                        {items.length === 1
                          ? 'critério'
                          : 'critérios'}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      {items.map(
                        (item) => {
                          const category =
                            CATEGORY_CONFIG[
                              item.category
                            ] ||
                            CATEGORY_CONFIG.other;

                          const percentage =
                            item.scaleMax >
                            item.scaleMin
                              ? ((item.score -
                                  item.scaleMin) /
                                  (item.scaleMax -
                                    item.scaleMin)) *
                                100
                              : 0;

                          return (
                            <div
                              key={item.id}
                              className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-950">
                                    {item.name}
                                  </p>

                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <Badge
                                      variant="outline"
                                      className={
                                        category.className
                                      }
                                    >
                                      {
                                        category.label
                                      }
                                    </Badge>

                                    {item.subdomainLabel && (
                                      <Badge variant="outline">
                                        {
                                          item.subdomainLabel
                                        }
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right">
                                  <p className="font-heading text-3xl text-cyan-700">
                                    {item.score.toFixed(
                                      1
                                    )}
                                  </p>

                                  <p className="text-xs text-slate-400">
                                    de{' '}
                                    {item.scaleMax.toFixed(
                                      0
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600"
                                  style={{
                                    width: `${Math.max(
                                      0,
                                      Math.min(
                                        100,
                                        percentage
                                      )
                                    )}%`,
                                  }}
                                />
                              </div>

                              {item.description && (
                                <p className="mt-3 text-sm leading-6 text-slate-500">
                                  {
                                    item.description
                                  }
                                </p>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </section>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <TextList
          title="Pontos fortes"
          description="Competências destacadas pela equipa técnica."
          items={strengths}
          icon={Award}
          tone="emerald"
        />

        <TextList
          title="Prioridades de melhoria"
          description="Aspetos a desenvolver no próximo período."
          items={improvementGoals}
          icon={Target}
          tone="amber"
        />
      </div>

      {evaluation?.motivational_message && (
        <Card className="border-purple-100 bg-purple-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-purple-600" />
              Mensagem da equipa técnica
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="leading-7 text-slate-700">
              {
                evaluation.motivational_message
              }
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-start">
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={() =>
            navigate(-1)
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    </div>
  );
}
