import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Check,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Gauge,
  Library,
  Loader2,
  Route,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserRoundCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePermissions } from '../context/PermissionsContext';
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

const MANAGEMENT_MODULES = [
  {
    id: 'criteria',
    eyebrow: 'Metodologia',
    title: 'Biblioteca e critérios',
    description:
      'Explore a Biblioteca Oficial StickPro, importe competências e organize os critérios técnicos do clube.',
    path: '/evaluation-criteria',
    icon: Library,
    action: 'Gerir metodologia',
    tone: 'bg-cyan-50 text-cyan-700',
  },
  {
    id: 'plans',
    eyebrow: 'Planeamento',
    title: 'Planos de avaliação',
    description:
      'Estruture avaliações por equipa, grupo, atleta, período da época ou objetivo de desenvolvimento.',
    path: '/evaluation-plans',
    icon: FileText,
    action: 'Gerir planos',
    tone: 'bg-blue-50 text-blue-700',
  },
  {
    id: 'new',
    eyebrow: 'Execução',
    title: 'Nova avaliação',
    description:
      'Avalie o desempenho individual a partir de um plano previamente configurado.',
    path: '/evaluations/new',
    icon: ClipboardCheck,
    action: 'Iniciar avaliação',
    tone: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 'development',
    eyebrow: 'Acompanhamento',
    title: 'Desenvolvimento do atleta',
    description:
      'Consulte evolução, competências, histórico e comparação com a equipa.',
    path: '/evaluations/history',
    icon: TrendingUp,
    action: 'Consultar desenvolvimento',
    tone: 'bg-violet-50 text-violet-700',
  },
  {
    id: 'objectives',
    eyebrow: 'Plano individual',
    title: 'Objetivos individuais',
    description:
      'Defina metas por competência e acompanhe o progresso de cada atleta.',
    path: '/evaluations/objectives',
    icon: Target,
    action: 'Gerir objetivos',
    tone: 'bg-amber-50 text-amber-700',
  },
];

const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const getEvaluationDate = (evaluation) =>
  evaluation?.evaluation_date ||
  evaluation?.created_at ||
  evaluation?.date ||
  evaluation?.updated_at ||
  null;

const getEvaluationAverage = (evaluation) => {
  const direct =
    evaluation?.overall_score ??
    evaluation?.average_score ??
    evaluation?.average ??
    evaluation?.score;

  if (direct !== null && direct !== undefined && direct !== '') {
    const value = Number(direct);
    if (Number.isFinite(value)) return value;
  }

  const scores =
    evaluation?.scores ||
    evaluation?.criteria_scores ||
    evaluation?.results ||
    [];

  const values = Array.isArray(scores)
    ? scores
        .map((item) => Number(item?.score ?? item?.value))
        .filter(Number.isFinite)
    : [];

  if (!values.length) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const getCriterionScores = (evaluation) => {
  const raw =
    evaluation?.scores ||
    evaluation?.criteria_scores ||
    evaluation?.results ||
    [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index) => ({
      id:
        item?.criterion_id ||
        item?.id ||
        item?.code ||
        `${evaluation?.id || 'evaluation'}-${index}`,
      name:
        item?.criterion_name ||
        item?.name ||
        item?.criterion?.name ||
        item?.criterion?.observableAction ||
        `Critério ${index + 1}`,
      score: Number(item?.score ?? item?.value),
    }))
    .filter((item) => Number.isFinite(item.score));
};

const getPlayerName = (profile) =>
  profile?.player_name ||
  profile?.athlete_name ||
  profile?.display_name ||
  profile?.full_name ||
  profile?.name ||
  profile?.player?.name ||
  profile?.player?.full_name ||
  'Atleta';

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const formatDate = (value) => {
  if (!value) return 'Sem data';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';

  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

function MetricCard({ icon: Icon, label, value, description, tone }) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 truncate text-lg font-bold text-slate-950">
            {value}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function AccessCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  value,
  helper,
  tone,
  onOpen,
}) {
  return (
    <Card className="group rounded-[1.5rem] border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
            <Icon className="h-6 w-6" />
          </div>

          {value !== undefined && value !== null && (
            <Badge variant="outline" className="rounded-full bg-white">
              {value}
            </Badge>
          )}
        </div>

        <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          {eyebrow}
        </p>
        <h3 className="mt-1 font-heading text-xl text-slate-950">
          {title}
        </h3>
        <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-600">
          {description}
        </p>

        {helper && (
          <p className="mt-3 text-xs font-medium text-cyan-700">
            {helper}
          </p>
        )}

        <Button
          type="button"
          variant="ghost"
          className="mt-4 w-full justify-between rounded-xl"
          onClick={onOpen}
        >
          Abrir
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DevelopmentCenter() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const permissions = usePermissions();

  const {
    activeProfile,
    viewingAs,
    availableProfiles,
  } = useAuth();

  const [evaluations, setEvaluations] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [loadingAthleteData, setLoadingAthleteData] = useState(false);

  const tr = (key, fallback) => {
    const translated = t(key);
    return translated && translated !== key ? translated : fallback;
  };

  const effectivePlayerId =
    permissions?.effectivePlayerId ||
    permissions?.linkedPlayerId ||
    null;

  const isAthleteMode = Boolean(
    effectivePlayerId &&
      (
        permissions?.isPlayer === true ||
        permissions?.isViewingAsAssociated === true
      )
  );

  const canCreateEvaluations =
    permissions?.canCreateEvaluations === true ||
    permissions?.hasPermission?.('create_evaluations') === true;

  const flattenedProfiles = useMemo(() => {
    if (Array.isArray(availableProfiles)) return availableProfiles;

    if (availableProfiles && typeof availableProfiles === 'object') {
      return [
        ...(Array.isArray(availableProfiles.self)
          ? availableProfiles.self
          : []),
        ...(Array.isArray(availableProfiles.associated)
          ? availableProfiles.associated
          : []),
      ];
    }

    return [];
  }, [availableProfiles]);

  const matchedAthleteProfile = useMemo(() => {
    if (!effectivePlayerId) return null;

    return (
      flattenedProfiles.find((profile) => {
        const ids = [
          profile?.id,
          profile?.user_id,
          profile?.player_id,
          profile?.athlete_id,
          profile?.profile_id,
          profile?.player?.id,
        ]
          .filter((value) => value !== null && value !== undefined)
          .map(String);

        return ids.includes(String(effectivePlayerId));
      }) || null
    );
  }, [flattenedProfiles, effectivePlayerId]);

  const athleteProfile =
    matchedAthleteProfile ||
    viewingAs ||
    activeProfile ||
    null;

  useEffect(() => {
    if (!isAthleteMode || !effectivePlayerId) {
      setEvaluations([]);
      setObjectives([]);
      return;
    }

    let cancelled = false;

    const loadAthleteData = async () => {
      setLoadingAthleteData(true);

      try {
        const [evaluationsResult, objectivesResult] =
          await Promise.allSettled([
            evaluationsApi.getPlayerEvaluations(effectivePlayerId),
            evaluationsApi.getPlayerObjectives(effectivePlayerId),
          ]);

        if (cancelled) return;

        setEvaluations(
          evaluationsResult.status === 'fulfilled'
            ? normalizeCollection(evaluationsResult.value?.data)
            : []
        );

        setObjectives(
          objectivesResult.status === 'fulfilled'
            ? normalizeCollection(objectivesResult.value?.data)
            : []
        );
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading development center:', error);
          toast.error('Não foi possível carregar todos os dados de desenvolvimento.');
          setEvaluations([]);
          setObjectives([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingAthleteData(false);
        }
      }
    };

    loadAthleteData();

    return () => {
      cancelled = true;
    };
  }, [isAthleteMode, effectivePlayerId]);

  const athleteSummary = useMemo(() => {
    const chronological = [...evaluations].sort(
      (a, b) =>
        new Date(getEvaluationDate(a) || 0) -
        new Date(getEvaluationDate(b) || 0)
    );

    const valid = chronological
      .map((evaluation) => ({
        average: getEvaluationAverage(evaluation),
        date: getEvaluationDate(evaluation),
      }))
      .filter((item) => item.average !== null);

    const latest = valid.length ? valid[valid.length - 1] : null;
    const previous = valid.length > 1 ? valid[valid.length - 2] : null;

    const criteriaMap = new Map();

    evaluations.forEach((evaluation) => {
      getCriterionScores(evaluation).forEach((criterion) => {
        if (!criteriaMap.has(criterion.id)) {
          criteriaMap.set(criterion.id, {
            id: criterion.id,
            name: criterion.name,
            scores: [],
          });
        }

        criteriaMap.get(criterion.id).scores.push(criterion.score);
      });
    });

    const criteria = Array.from(criteriaMap.values())
      .map((criterion) => ({
        ...criterion,
        average:
          criterion.scores.reduce((sum, value) => sum + value, 0) /
          criterion.scores.length,
      }))
      .sort((a, b) => b.average - a.average);

    const activeObjectives = objectives.filter(
      (objective) => objective?.status === 'active'
    );

    const completedObjectives = objectives.filter(
      (objective) => objective?.status === 'completed'
    );

    return {
      totalEvaluations: evaluations.length,
      latestAverage: latest?.average ?? null,
      latestDate: latest?.date ?? null,
      evolution:
        latest && previous
          ? latest.average - previous.average
          : null,
      strongest: criteria[0] || null,
      priority:
        criteria.length > 0
          ? [...criteria].sort((a, b) => a.average - b.average)[0]
          : null,
      activeObjectives: activeObjectives.length,
      completedObjectives: completedObjectives.length,
    };
  }, [evaluations, objectives]);

  const athleteName = getPlayerName(athleteProfile);

  const athleteTeamNames = useMemo(() => {
    const sources = [
      ...(Array.isArray(athleteProfile?.teams)
        ? athleteProfile.teams
        : []),
      ...(Array.isArray(athleteProfile?.team_names)
        ? athleteProfile.team_names
        : []),
    ];

    const names = sources
      .map((team) =>
        typeof team === 'string'
          ? team.trim()
          : team?.name || team?.display_name
      )
      .filter(Boolean);

    return [
      ...new Set(
        names.filter((name, index, allNames) => {
          const normalized = name.toLocaleLowerCase('pt-PT');

          return !allNames.some((otherName, otherIndex) => {
            if (index === otherIndex) return false;

            const normalizedOther =
              otherName.toLocaleLowerCase('pt-PT');

            return (
              normalizedOther !== normalized &&
              normalizedOther.startsWith(`${normalized} `)
            );
          });
        })
      ),
    ];
  }, [athleteProfile]);

  if (isAthleteMode) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        <section className="relative overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-5 py-6 text-white shadow-xl shadow-slate-200/60 sm:px-7 sm:py-8 lg:px-9">
          <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />

          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="mb-5 -ml-2 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {tr('common.back', 'Voltar')}
            </Button>

            <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge className="border border-cyan-300/20 bg-cyan-400/15 text-cyan-100">
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    O meu desenvolvimento
                  </Badge>

                  <Badge className="border border-white/10 bg-white/10 text-slate-200">
                    <Award className="mr-1.5 h-3.5 w-3.5" />
                    Acompanhamento individual
                  </Badge>
                </div>

                <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  Desenvolvimento do Atleta
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Consulta o teu desempenho, acompanha os objetivos definidos pela equipa técnica e identifica as competências que deves continuar a desenvolver.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 font-bold">
                    {getInitials(athleteName)}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-heading text-xl">
                      {athleteName}
                    </p>
                    <p className="truncate text-sm text-slate-300">
                      {athleteTeamNames.join(', ') || 'Atleta'}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => navigate('/evaluations/history')}
                  className="mt-4 w-full rounded-xl bg-white text-slate-950 hover:bg-slate-100"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Ver desenvolvimento completo
                </Button>
              </div>
            </div>
          </div>
        </section>

        {loadingAthleteData ? (
          <Card>
            <CardContent className="flex min-h-[260px] items-center justify-center">
              <Loader2 className="h-9 w-9 animate-spin text-cyan-600" />
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={Gauge}
                label="Último resultado"
                value={
                  athleteSummary.latestAverage !== null
                    ? athleteSummary.latestAverage.toFixed(1)
                    : '—'
                }
                description={
                  athleteSummary.latestDate
                    ? formatDate(athleteSummary.latestDate)
                    : 'Sem avaliações partilhadas'
                }
                tone="bg-cyan-50 text-cyan-700"
              />

              <MetricCard
                icon={
                  athleteSummary.evolution !== null &&
                  athleteSummary.evolution < 0
                    ? TrendingDown
                    : TrendingUp
                }
                label="Última evolução"
                value={
                  athleteSummary.evolution !== null
                    ? `${athleteSummary.evolution >= 0 ? '+' : ''}${athleteSummary.evolution.toFixed(1)}`
                    : '—'
                }
                description="Entre as duas últimas avaliações"
                tone="bg-violet-50 text-violet-700"
              />

              <MetricCard
                icon={Target}
                label="Objetivos ativos"
                value={athleteSummary.activeObjectives}
                description={`${athleteSummary.completedObjectives} concluídos`}
                tone="bg-amber-50 text-amber-700"
              />

              <MetricCard
                icon={Award}
                label="Ponto forte"
                value={athleteSummary.strongest?.name || 'Sem dados'}
                description={
                  athleteSummary.strongest
                    ? `Média ${athleteSummary.strongest.average.toFixed(1)}`
                    : 'Aguardar avaliações'
                }
                tone="bg-emerald-50 text-emerald-700"
              />
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
                O meu percurso
              </p>
              <h2 className="mt-1 font-heading text-2xl font-bold text-slate-950">
                Acompanha o teu desenvolvimento
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Consulta os resultados partilhados, acompanha os teus objetivos e identifica as prioridades para o próximo período.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <AccessCard
                  icon={TrendingUp}
                  eyebrow="Desempenho"
                  title="A minha evolução"
                  description="Consulta evolução temporal, radar de competências e comparação com a avaliação anterior."
                  value={`${athleteSummary.totalEvaluations} avaliações`}
                  helper={
                    athleteSummary.evolution !== null
                      ? `${athleteSummary.evolution >= 0 ? '+' : ''}${athleteSummary.evolution.toFixed(1)} na última evolução`
                      : 'Sem comparação disponível'
                  }
                  tone="bg-cyan-50 text-cyan-700"
                  onOpen={() => navigate('/evaluations/history')}
                />

                <AccessCard
                  icon={Target}
                  eyebrow="Plano individual"
                  title="Objetivos e prioridades"
                  description="Acompanha as metas definidas pelo treinador e o progresso do teu Plano Individual de Desenvolvimento."
                  value={`${athleteSummary.activeObjectives} ativos`}
                  helper={
                    athleteSummary.priority
                      ? `Prioridade atual: ${athleteSummary.priority.name}`
                      : 'Sem prioridades calculadas'
                  }
                  tone="bg-amber-50 text-amber-700"
                  onOpen={() => navigate('/evaluations/objectives')}
                />

                <AccessCard
                  icon={ClipboardCheck}
                  eyebrow="Histórico"
                  title="Avaliações partilhadas"
                  description="Revê as avaliações disponibilizadas pela equipa técnica e consulta os resultados por competência."
                  value={athleteSummary.totalEvaluations}
                  helper={
                    athleteSummary.latestDate
                      ? `Última em ${formatDate(athleteSummary.latestDate)}`
                      : 'Ainda sem avaliações'
                  }
                  tone="bg-violet-50 text-violet-700"
                  onOpen={() => navigate('/evaluations/history')}
                />
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <Card className="border-emerald-100 bg-gradient-to-br from-white via-emerald-50/60 to-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-emerald-600" />
                    O que estás a fazer bem
                  </CardTitle>
                  <CardDescription>
                    Competência com melhor desempenho médio.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {athleteSummary.strongest ? (
                    <div className="rounded-2xl border border-white bg-white/80 p-4">
                      <p className="font-heading text-xl">
                        {athleteSummary.strongest.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Média atual: {athleteSummary.strongest.average.toFixed(1)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Ainda não existem dados suficientes.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-amber-100 bg-gradient-to-br from-white via-amber-50/60 to-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-amber-600" />
                    O que deves desenvolver
                  </CardTitle>
                  <CardDescription>
                    Competência com maior margem de desenvolvimento.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {athleteSummary.priority ? (
                    <div className="rounded-2xl border border-white bg-white/80 p-4">
                      <p className="font-heading text-xl">
                        {athleteSummary.priority.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Média atual: {athleteSummary.priority.average.toFixed(1)}
                      </p>

                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4 rounded-full"
                        onClick={() => navigate('/evaluations/objectives')}
                      >
                        Ver objetivos
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      A equipa técnica ainda não partilhou dados suficientes.
                    </p>
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-5 py-6 text-white shadow-xl shadow-slate-200/60 sm:px-7 sm:py-8 lg:px-9">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-5 -ml-2 text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tr('common.back', 'Voltar')}
        </Button>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge className="border border-cyan-300/20 bg-cyan-400/15 text-cyan-100">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Desenvolvimento contínuo
              </Badge>
              <Badge className="border border-white/10 bg-white/10 text-slate-200">
                <Award className="mr-1.5 h-3.5 w-3.5" />
                Gestão técnica
              </Badge>
            </div>

            <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Centro de Desenvolvimento
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Planeie, execute e acompanhe o desenvolvimento dos atletas através de critérios, planos, avaliações e objetivos.
            </p>

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
              {['Definir', 'Planear', 'Avaliar', 'Evoluir'].map((label) => (
                <div
                  key={label}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-200"
                >
                  <Check className="h-4 w-4 text-cyan-300" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-cyan-200">
              Resumo operacional
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                <p className="text-2xl font-bold">5</p>
                <p className="mt-1 text-xs text-slate-300">
                  Módulos
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                <p className="text-2xl font-bold">4</p>
                <p className="mt-1 text-xs text-slate-300">
                  Etapas
                </p>
              </div>
            </div>

            {canCreateEvaluations && (
              <Button
                type="button"
                onClick={() => navigate('/evaluations/new')}
                className="mt-4 w-full rounded-xl bg-white text-slate-950 hover:bg-slate-100"
              >
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Nova avaliação
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ClipboardList}
          label="Critérios"
          value="Configurados"
          description="Metodologia do clube"
          tone="bg-cyan-50 text-cyan-700"
        />
        <MetricCard
          icon={FileText}
          label="Planos"
          value="Disponíveis"
          description="Modelos estruturados"
          tone="bg-blue-50 text-blue-700"
        />
        <MetricCard
          icon={UserRoundCheck}
          label="Atletas"
          value="Acompanhamento"
          description="Desenvolvimento individual"
          tone="bg-emerald-50 text-emerald-700"
        />
        <MetricCard
          icon={BarChart3}
          label="Evolução"
          value="Longitudinal"
          description="Progresso na época"
          tone="bg-violet-50 text-violet-700"
        />
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50/60 p-4 shadow-sm sm:p-6">
        <div className="flex items-center gap-2 text-cyan-700">
          <Route className="h-4 w-4" />
          <p className="text-xs font-bold uppercase tracking-[0.16em]">
            Percurso de desenvolvimento
          </p>
        </div>

        <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">
          Da metodologia à evolução
        </h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['01', 'Definir', 'Critérios', ClipboardList, '/evaluation-criteria'],
            ['02', 'Planear', 'Planos', FileText, '/evaluation-plans'],
            ['03', 'Avaliar', 'Desempenho', ClipboardCheck, '/evaluations/new'],
            ['04', 'Evoluir', 'Acompanhamento', TrendingUp, '/evaluations/history'],
          ].map(([number, title, subtitle, Icon, path]) => (
            <button
              key={number}
              type="button"
              onClick={() => navigate(path)}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-black text-slate-300">
                  {number}
                </span>
              </div>
              <p className="mt-4 text-xs font-bold uppercase text-cyan-700">
                {title}
              </p>
              <h3 className="mt-1 font-heading text-lg">
                {subtitle}
              </h3>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
          Ferramentas
        </p>
        <h2 className="mt-1 font-heading text-2xl font-bold text-slate-950">
          Gestão do desenvolvimento
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MANAGEMENT_MODULES.map((module) => {
            const Icon = module.icon;

            return (
              <Card
                key={module.id}
                className="group rounded-[1.5rem] border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <CardHeader>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${module.tone}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="pt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    {module.eyebrow}
                  </p>
                  <CardTitle>{module.title}</CardTitle>
                  <CardDescription className="min-h-[72px] leading-6">
                    {module.description}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <Button
                    type="button"
                    className="w-full justify-between rounded-xl"
                    onClick={() => navigate(module.path)}
                  >
                    {module.action}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
          Em breve
        </p>
        <h2 className="mt-1 font-heading text-2xl font-bold text-slate-950">
          Próximas capacidades
        </h2>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Card className="border-dashed bg-slate-50/70 shadow-none">
            <CardContent className="flex gap-4 p-5">
              <BookOpen className="h-6 w-6 text-slate-500" />
              <div>
                <p className="font-semibold">Livro técnico</p>
                <p className="mt-1 text-sm text-slate-500">
                  Notas, observações e documentação técnica.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed bg-slate-50/70 shadow-none">
            <CardContent className="flex gap-4 p-5">
              <Sparkles className="h-6 w-6 text-slate-500" />
              <div>
                <p className="font-semibold">Assistente técnico</p>
                <p className="mt-1 text-sm text-slate-500">
                  Alertas e sugestões para apoiar decisões.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
