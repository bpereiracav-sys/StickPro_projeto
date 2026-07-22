import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Lock,
  Sparkles,
  Target,
  TrendingUp,
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
    title: 'Critérios de Avaliação',
    description:
      'Defina os critérios técnicos, táticos, físicos e comportamentais utilizados nas avaliações.',
    path: '/evaluation-criteria',
    icon: ClipboardList,
    actionLabel: 'Gerir critérios',
    permission: 'create_evaluations',
    accentClass:
      'from-cyan-500/15 via-cyan-50/70 to-white border-cyan-100',
    iconClass: 'bg-cyan-500 text-white shadow-cyan-200',
  },
  {
    id: 'plans',
    title: 'Planos de Avaliação',
    description:
      'Crie modelos estruturados para avaliar equipas, grupos ou atletas ao longo da época.',
    path: '/evaluation-plans',
    icon: FileText,
    actionLabel: 'Gerir planos',
    permission: 'create_evaluations',
    accentClass:
      'from-blue-500/15 via-blue-50/70 to-white border-blue-100',
    iconClass: 'bg-blue-600 text-white shadow-blue-200',
  },
  {
    id: 'new-evaluation',
    title: 'Nova Avaliação',
    description:
      'Inicie uma avaliação individual a partir de um plano previamente configurado.',
    path: '/evaluations/new',
    icon: ClipboardCheck,
    actionLabel: 'Iniciar avaliação',
    permission: 'create_evaluations',
    accentClass:
      'from-emerald-500/15 via-emerald-50/70 to-white border-emerald-100',
    iconClass: 'bg-emerald-600 text-white shadow-emerald-200',
  },
];

const FUTURE_MODULES = [
  {
    id: 'history',
    title: 'Histórico de Avaliações',
    description:
      'Consulte a evolução longitudinal e compare resultados ao longo da época.',
    icon: TrendingUp,
  },
  {
    id: 'objectives',
    title: 'Objetivos de Desenvolvimento',
    description:
      'Defina objetivos individuais e acompanhe o progresso de cada atleta.',
    icon: Target,
  },
  {
    id: 'technical-book',
    title: 'Livro Técnico',
    description:
      'Centralize notas, observações, relatórios e informação técnica dos atletas.',
    icon: BookOpen,
  },
];

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
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/50 blur-2xl"
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
            <Icon className="h-6 w-6" strokeWidth={1.9} />
          </div>

          {canAccess ? (
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
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

        <div className="pt-4">
          <CardTitle className="text-xl text-slate-950">
            {module.title}
          </CardTitle>

          <CardDescription className="mt-2 min-h-[66px] text-sm leading-6 text-slate-600">
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
          <span>{canAccess ? module.actionLabel : 'Indisponível'}</span>

          {canAccess ? (
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
            />
          ) : (
            <Lock className="h-4 w-4" />
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
            <Icon className="h-5 w-5" strokeWidth={1.8} />
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
                Próxima fase
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
    permissions?.hasPermission?.('create_evaluations') === true;

  const visibleModules = useMemo(() => {
    return ACTIVE_MODULES.map((module) => ({
      ...module,
      canAccess:
        !module.permission ||
        permissions?.hasPermission?.(module.permission) === true ||
        (
          module.permission === 'create_evaluations' &&
          canCreateEvaluations
        ),
    }));
  }, [permissions, canCreateEvaluations]);

  const availableModulesCount = visibleModules.filter(
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

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge className="border border-cyan-300/20 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/15">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Desenvolvimento contínuo
                </Badge>

                <Badge className="border border-white/10 bg-white/10 text-slate-200 hover:bg-white/10">
                  <Award className="mr-1.5 h-3.5 w-3.5" />
                  Centro técnico
                </Badge>
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {tr(
                  'nav.developmentCenter',
                  'Centro de Desenvolvimento'
                )}
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Planeie, execute e acompanhe o desenvolvimento dos atletas
                através de critérios estruturados, planos de avaliação e
                acompanhamento longitudinal.
              </p>
            </div>

            {canCreateEvaluations && (
              <Button
                type="button"
                size="lg"
                onClick={() => navigate('/evaluations/new')}
                className="rounded-xl bg-white text-slate-950 shadow-lg hover:bg-slate-100"
              >
                <ClipboardCheck className="mr-2 h-5 w-5" />
                Nova avaliação
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Métricas */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <Award className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">
                Módulos ativos
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-950">
                {availableModulesCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <ClipboardList className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">
                Critérios
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                Configuração técnica
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Users className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">
                Atletas
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                Acompanhamento individual
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <BarChart3 className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">
                Evolução
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                Visão longitudinal
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Ferramentas disponíveis */}
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
            Ferramentas
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-950">
            Gestão da avaliação
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Configure a metodologia de avaliação e acompanhe o desempenho
            dos atletas de forma consistente ao longo da época.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleModules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              canAccess={module.canAccess}
              onOpen={() => navigate(module.path)}
            />
          ))}
        </div>
      </section>

      {/* Próximos módulos */}
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Roadmap
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-950">
            Próximas capacidades
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            A estrutura está preparada para integrar acompanhamento
            longitudinal, objetivos individuais e documentação técnica.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
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
