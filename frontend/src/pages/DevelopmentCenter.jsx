import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Library,
  Lock,
  Route,
  Sparkles,
  Target,
  TrendingUp,
  UserRoundCheck,
  Users,
} from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';
import { usePermissions } from '../context/PermissionsContext';

import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const ACTIVE_MODULES = [
  {
    id: 'criteria',
    eyebrow: 'Metodologia',
    title: 'Biblioteca e critérios',
    description:
      'Explore a Biblioteca Oficial StickPro, importe competências e organize os critérios técnicos do clube.',
    path: '/evaluation-criteria',
    icon: Library,
    actionLabel: 'Gerir metodologia',
    permission: 'create_evaluations',
    accentClass:
      'border-cyan-100 from-cyan-500/15 via-cyan-50/80 to-white',
    iconClass:
      'bg-cyan-600 text-white shadow-cyan-200',
    number: '01',
  },
  {
    id: 'plans',
    eyebrow: 'Planeamento',
    title: 'Planos de avaliação',
    description:
      'Estruture avaliações por equipa, grupo, atleta, período da época ou objetivo de desenvolvimento.',
    path: '/evaluation-plans',
    icon: FileText,
    actionLabel: 'Gerir planos',
    permission: 'create_evaluations',
    accentClass:
      'border-blue-100 from-blue-500/15 via-blue-50/80 to-white',
    iconClass:
      'bg-blue-600 text-white shadow-blue-200',
    number: '02',
  },
  {
    id: 'new-evaluation',
    eyebrow: 'Execução',
    title: 'Nova avaliação',
    description:
      'Avalie o desempenho individual a partir de um plano previamente configurado e estruturado.',
    path: '/evaluations/new',
    icon: ClipboardCheck,
    actionLabel: 'Iniciar avaliação',
    permission: 'create_evaluations',
    accentClass:
      'border-emerald-100 from-emerald-500/15 via-emerald-50/80 to-white',
    iconClass:
      'bg-emerald-600 text-white shadow-emerald-200',
    number: '03',
  },
];

const WORKFLOW_STEPS = [
  {
    id: 'methodology',
    number: '01',
    title: 'Definir',
    subtitle: 'Metodologia',
    description:
      'Selecionar competências e organizar os critérios de avaliação.',
    path: '/evaluation-criteria',
    icon: ClipboardList,
    permission: 'create_evaluations',
  },
  {
    id: 'planning',
    number: '02',
    title: 'Planear',
    subtitle: 'Planos',
    description:
      'Construir modelos consistentes para equipas e atletas.',
    path: '/evaluation-plans',
    icon: FileText,
    permission: 'create_evaluations',
  },
  {
    id: 'evaluation',
    number: '03',
    title: 'Avaliar',
    subtitle: 'Desempenho',
    description:
      'Registar observações e classificar o desempenho individual.',
    path: '/evaluations/new',
    icon: ClipboardCheck,
    permission: 'create_evaluations',
  },
  {
    id: 'evolution',
    number: '04',
    title: 'Evoluir',
    subtitle: 'Acompanhamento',
    description:
      'Interpretar resultados e acompanhar o progresso ao longo da época.',
    icon: TrendingUp,
    future: true,
  },
];

const FUTURE_MODULES = [
  {
    id: 'history',
    title: 'Histórico evolutivo',
    description:
      'Consulte a evolução longitudinal por atleta, equipa e domínio de desenvolvimento.',
    icon: TrendingUp,
  },
  {
    id: 'objectives',
    title: 'Objetivos individuais',
    description:
      'Defina metas específicas e acompanhe o progresso de cada atleta.',
    icon: Target,
  },
  {
    id: 'technical-book',
    title: 'Livro técnico',
    description:
      'Centralize notas, observações, relatórios e documentação técnica.',
    icon: BookOpen,
  },
  {
    id: 'assistant',
    title: 'Assistente técnico StickPro',
    description:
      'Receba análises, alertas e sugestões inteligentes para apoiar decisões.',
    icon: Sparkles,
  },
];

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
  toneClass,
}) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm shadow-slate-200/50">
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`
            flex h-11 w-11 shrink-0 items-center justify-center
            rounded-2xl ${toneClass}
          `}
        >
          <Icon
            className="h-5 w-5"
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-400">
            {label}
          </p>

          <p className="mt-1 truncate text-lg font-bold text-slate-950">
            {value}
          </p>

          {description && (
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function WorkflowStep({
  step,
  canAccess,
  isLast,
  onOpen,
}) {
  const Icon = step.icon;
  const isFuture = step.future === true;

  return (
    <div className="relative flex min-w-0 flex-1">
      <button
        type="button"
        disabled={isFuture || !canAccess}
        onClick={onOpen}
        className={`
          group relative w-full rounded-2xl border p-4 text-left
          transition duration-200
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-primary
          focus-visible:ring-offset-2
          ${
            isFuture
              ? 'cursor-default border-dashed border-slate-200 bg-slate-50/70'
              : canAccess
                ? 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md'
                : 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-70'
          }
        `}
      >
        <div className="flex items-start justify-between gap-3">
          <div
            className={`
              flex h-10 w-10 shrink-0 items-center justify-center
              rounded-xl
              ${
                isFuture
                  ? 'bg-slate-200 text-slate-500'
                  : canAccess
                    ? 'bg-slate-950 text-white'
                    : 'bg-slate-200 text-slate-500'
              }
            `}
          >
            <Icon
              className="h-5 w-5"
              aria-hidden="true"
            />
          </div>

          <span className="text-xs font-black tracking-[0.15em] text-slate-300">
            {step.number}
          </span>
        </div>

        <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-cyan-700">
          {step.title}
        </p>

        <h3 className="mt-1 font-heading text-lg font-bold text-slate-950">
          {step.subtitle}
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {step.description}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <span
            className={`
              inline-flex items-center rounded-full px-2.5 py-1
              text-[10px] font-bold uppercase tracking-wide
              ${
                isFuture
                  ? 'bg-slate-200 text-slate-600'
                  : canAccess
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-200 text-slate-500'
              }
            `}
          >
            {isFuture
              ? 'Em breve'
              : canAccess
                ? 'Disponível'
                : 'Sem acesso'}
          </span>

          {!isFuture && canAccess && (
            <ChevronRight
              className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-cyan-700"
              aria-hidden="true"
            />
          )}
        </div>
      </button>

      {!isLast && (
        <div
          className="mx-2 hidden items-center text-slate-300 xl:flex"
          aria-hidden="true"
        >
          <ArrowRight className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}

function ModuleCard({
  module,
  canAccess,
  onOpen,
}) {
  const Icon = module.icon;

  return (
    <Card
      className={`
        group relative overflow-hidden rounded-[1.6rem]
        border bg-gradient-to-br shadow-sm
        transition-all duration-300
        ${
          canAccess
            ? `${module.accentClass} hover:-translate-y-1 hover:shadow-xl`
            : 'border-slate-200 from-slate-100 via-white to-white opacity-80'
        }
      `}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/60 blur-2xl"
        aria-hidden="true"
      />

      <CardHeader className="relative pb-3">
        <div className="flex items-start justify-between gap-4">
          <div
            className={`
              flex h-12 w-12 shrink-0 items-center justify-center
              rounded-2xl shadow-lg
              ${
                canAccess
                  ? module.iconClass
                  : 'bg-slate-200 text-slate-500 shadow-slate-100'
              }
            `}
          >
            <Icon
              className="h-6 w-6"
              strokeWidth={1.9}
              aria-hidden="true"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-[0.15em] text-slate-300">
              {module.number}
            </span>

            {canAccess ? (
              <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Disponível
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-slate-200 bg-white/80 text-slate-500"
              >
                <Lock className="mr-1 h-3.5 w-3.5" />
                Sem acesso
              </Badge>
            )}
          </div>
        </div>

        <div className="pt-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {module.eyebrow}
          </p>

          <CardTitle className="mt-1 text-xl text-slate-950">
            {module.title}
          </CardTitle>

          <CardDescription className="mt-2 min-h-[72px] text-sm leading-6 text-slate-600">
            {module.description}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="relative pt-0">
        <Button
          type="button"
          className="w-full justify-between rounded-xl"
          variant={canAccess ? 'default' : 'outline'}
          disabled={!canAccess}
          onClick={onOpen}
        >
          <span>
            {canAccess
              ? module.actionLabel
              : 'Indisponível'}
          </span>

          {canAccess ? (
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          ) : (
            <Lock
              className="h-4 w-4"
              aria-hidden="true"
            />
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function FutureModuleCard({ module }) {
  const Icon = module.icon;

  return (
    <Card className="relative overflow-hidden rounded-[1.4rem] border-dashed border-slate-200 bg-slate-50/70 shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
            <Icon
              className="h-5 w-5"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-800">
                {module.title}
              </h3>

              <Badge
                variant="outline"
                className="border-slate-200 bg-white text-slate-500"
              >
                Em breve
              </Badge>
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {module.description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DevelopmentCenter() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const permissions = usePermissions();

  const tr = (key, fallback) => {
    const translated = t(key);

    return translated && translated !== key
      ? translated
      : fallback;
  };

  const canCreateEvaluations =
    permissions?.canCreateEvaluations === true ||
    permissions?.hasPermission?.(
      'create_evaluations'
    ) === true;

  const hasModulePermission = (permission) => {
    if (!permission) return true;

    if (
      permissions?.hasPermission?.(permission) === true
    ) {
      return true;
    }

    if (
      permission === 'create_evaluations' &&
      canCreateEvaluations
    ) {
      return true;
    }

    return false;
  };

  const visibleModules = useMemo(() => {
    return ACTIVE_MODULES.map((module) => ({
      ...module,
      canAccess: hasModulePermission(
        module.permission
      ),
    }));
  }, [
    permissions,
    canCreateEvaluations,
  ]);

  const visibleWorkflow = useMemo(() => {
    return WORKFLOW_STEPS.map((step) => ({
      ...step,
      canAccess:
        step.future === true
          ? false
          : hasModulePermission(step.permission),
    }));
  }, [
    permissions,
    canCreateEvaluations,
  ]);

  const availableModulesCount =
    visibleModules.filter(
      (module) => module.canAccess
    ).length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-5 py-6 text-white shadow-xl shadow-slate-200/60 sm:px-7 sm:py-8 lg:px-9">
        <div
          className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-blue-500/15 blur-3xl"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.07),transparent_35%)]"
          aria-hidden="true"
        />

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

          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge className="border border-cyan-300/20 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/15">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {tr(
                    'developmentCenter.continuousDevelopment',
                    'Desenvolvimento contínuo'
                  )}
                </Badge>

                <Badge className="border border-white/10 bg-white/10 text-slate-200 hover:bg-white/10">
                  <Award className="mr-1.5 h-3.5 w-3.5" />
                  {tr(
                    'developmentCenter.technicalCenter',
                    'Centro técnico'
                  )}
                </Badge>
              </div>

              <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {tr(
                  'nav.developmentCenter',
                  'Centro de Desenvolvimento'
                )}
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                {tr(
                  'developmentCenter.description',
                  'Planeie, execute e acompanhe o desenvolvimento dos atletas através de critérios estruturados, planos de avaliação e acompanhamento longitudinal.'
                )}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
                {[
                  'Definir',
                  'Planear',
                  'Avaliar',
                  'Evoluir',
                ].map((label) => (
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

            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-cyan-200">
                {tr(
                  'developmentCenter.operationalSummary',
                  'Resumo operacional'
                )}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                  <p className="text-2xl font-bold text-white">
                    {availableModulesCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    Módulos disponíveis
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                  <p className="text-2xl font-bold text-white">
                    4
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    Etapas do processo
                  </p>
                </div>
              </div>

              {canCreateEvaluations && (
                <Button
                  type="button"
                  size="lg"
                  onClick={() =>
                    navigate('/evaluations/new')
                  }
                  className="mt-4 w-full rounded-xl bg-white text-slate-950 shadow-lg hover:bg-slate-100"
                >
                  <ClipboardCheck className="mr-2 h-5 w-5" />
                  {tr(
                    'developmentCenter.newEvaluation',
                    'Nova avaliação'
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Métricas */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ClipboardList}
          label={tr(
            'developmentCenter.metrics.criteria',
            'Critérios'
          )}
          value={tr(
            'developmentCenter.metrics.configured',
            'Configurados'
          )}
          description={tr(
            'developmentCenter.metrics.methodology',
            'Metodologia do clube'
          )}
          toneClass="bg-cyan-50 text-cyan-700"
        />

        <MetricCard
          icon={FileText}
          label={tr(
            'developmentCenter.metrics.plans',
            'Planos'
          )}
          value={tr(
            'developmentCenter.metrics.available',
            'Disponíveis'
          )}
          description={tr(
            'developmentCenter.metrics.structuredModels',
            'Modelos estruturados'
          )}
          toneClass="bg-blue-50 text-blue-700"
        />

        <MetricCard
          icon={UserRoundCheck}
          label={tr(
            'developmentCenter.metrics.athletes',
            'Atletas'
          )}
          value={tr(
            'developmentCenter.metrics.individualFollowup',
            'Acompanhamento'
          )}
          description={tr(
            'developmentCenter.metrics.individualDevelopment',
            'Desenvolvimento individual'
          )}
          toneClass="bg-emerald-50 text-emerald-700"
        />

        <MetricCard
          icon={BarChart3}
          label={tr(
            'developmentCenter.metrics.evolution',
            'Evolução'
          )}
          value={tr(
            'developmentCenter.metrics.longitudinal',
            'Longitudinal'
          )}
          description={tr(
            'developmentCenter.metrics.seasonProgress',
            'Progresso na época'
          )}
          toneClass="bg-violet-50 text-violet-700"
        />
      </section>

      {/* Workflow */}
      <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50/60 p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-700">
              <Route className="h-4 w-4" />

              <p className="text-xs font-bold uppercase tracking-[0.16em]">
                {tr(
                  'developmentCenter.workflow.label',
                  'Percurso de desenvolvimento'
                )}
              </p>
            </div>

            <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">
              {tr(
                'developmentCenter.workflow.title',
                'Da metodologia à evolução'
              )}
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {tr(
                'developmentCenter.workflow.description',
                'Siga um processo consistente para definir competências, planear avaliações, observar o desempenho e acompanhar a evolução.'
              )}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:items-stretch">
          {visibleWorkflow.map((step, index) => (
            <WorkflowStep
              key={step.id}
              step={step}
              canAccess={step.canAccess}
              isLast={
                index ===
                visibleWorkflow.length - 1
              }
              onOpen={() => {
                if (
                  step.path &&
                  step.canAccess &&
                  !step.future
                ) {
                  navigate(step.path);
                }
              }}
            />
          ))}
        </div>
      </section>

      {/* Ferramentas */}
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
            {tr(
              'developmentCenter.tools.label',
              'Ferramentas'
            )}
          </p>

          <h2 className="mt-1 font-heading text-2xl font-bold text-slate-950">
            {tr(
              'developmentCenter.tools.title',
              'Gestão do desenvolvimento'
            )}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {tr(
              'developmentCenter.tools.description',
              'Configure a metodologia do clube, construa planos e avalie os atletas de forma consistente ao longo da época.'
            )}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleModules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              canAccess={module.canAccess}
              onOpen={() =>
                navigate(module.path)
              }
            />
          ))}
        </div>
      </section>

      {/* Próximas capacidades */}
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
              {tr(
                'developmentCenter.roadmap.label',
                'Evolução do módulo'
              )}
            </p>

            <h2 className="mt-1 font-heading text-2xl font-bold text-slate-950">
              {tr(
                'developmentCenter.roadmap.title',
                'Próximas capacidades'
              )}
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {tr(
                'developmentCenter.roadmap.description',
                'A arquitetura está preparada para integrar acompanhamento longitudinal, objetivos individuais, documentação técnica e assistência inteligente.'
              )}
            </p>
          </div>

          <Badge
            variant="outline"
            className="w-fit border-violet-200 bg-violet-50 px-3 py-1.5 text-violet-700"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Preparado para crescer
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {FUTURE_MODULES.map((module) => (
            <FutureModuleCard
              key={module.id}
              module={module}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
