/**************************************************************************
 *
 * StickPro Intelligent Development Plan
 *
 * Sprint C3.6.1 — Estrutura base
 * Sprint C3.6.2 — Motor Automático do PID
 *
 * Responsabilidade:
 * - transformar uma recomendação inteligente num plano de desenvolvimento;
 * - definir duração, frequência e reavaliação;
 * - criar fases progressivas;
 * - definir objetivos e critérios de conclusão;
 * - reutilizar os focos de treino produzidos pelo motor de recomendações;
 *
 * IMPORTANTE:
 * Este motor NÃO grava dados.
 * Apenas produz uma estrutura de plano.
 *
 **************************************************************************/


// ============================================================
// Configuração geral
// ============================================================

const DEFAULT_REVIEW_DAYS = 28;

const DEFAULT_PLAN_WEEKS = 5;

const DEFAULT_SESSIONS_PER_WEEK = 2;


// ============================================================
// Prioridades
// ============================================================

export const PLAN_PRIORITY = {
  critical: {
    label: 'Prioridade crítica',

    weeks: 7,

    sessionsPerWeek: 3,

    reviewDays: 14,

    intensity: 'high',

    interventionLabel:
      'Intervenção prioritária',
  },

  attention: {
    label: 'Prioridade elevada',

    weeks: 6,

    sessionsPerWeek: 3,

    reviewDays: 21,

    intensity: 'high',

    interventionLabel:
      'Intervenção necessária',
  },

  progressing: {
    label: 'Em desenvolvimento',

    weeks: 5,

    sessionsPerWeek: 2,

    reviewDays: 28,

    intensity: 'moderate',

    interventionLabel:
      'Desenvolvimento progressivo',
  },

  expected: {
    label: 'Dentro do esperado',

    weeks: 4,

    sessionsPerWeek: 1,

    reviewDays: 35,

    intensity: 'maintenance',

    interventionLabel:
      'Consolidação',
  },

  advanced: {
    label: 'Desempenho avançado',

    weeks: 3,

    sessionsPerWeek: 1,

    reviewDays: 42,

    intensity: 'maintenance',

    interventionLabel:
      'Manutenção e desafio',
  },
};


// ============================================================
// Fases base
// ============================================================

export const PLAN_PHASES = [
  {
    id: 'foundation',

    label: 'Fundamentação',

    description:
      'Estabilizar os comportamentos técnicos e criar uma base consistente de execução.',
  },

  {
    id: 'development',

    label: 'Desenvolvimento',

    description:
      'Aumentar progressivamente a exigência, variabilidade e aplicação da competência.',
  },

  {
    id: 'consolidation',

    label: 'Consolidação',

    description:
      'Transferir a competência para situações próximas do jogo e verificar consistência.',
  },
];


// ============================================================
// Helpers
// ============================================================

const clamp = (
  value,
  minimum,
  maximum
) =>
  Math.min(
    maximum,
    Math.max(
      minimum,
      value
    )
  );


const asFiniteNumber = (
  value,
  fallback = null
) => {
  const numeric =
    Number(value);

  return Number.isFinite(
    numeric
  )
    ? numeric
    : fallback;
};


const normalizeText = (
  value,
  fallback = ''
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return fallback;
  }

  const text =
    String(value).trim();

  return (
    text ||
    fallback
  );
};


const normalizeList = (
  value
) =>
  Array.isArray(value)
    ? value
        .map(
          (item) =>
            normalizeText(
              item
            )
        )
        .filter(Boolean)
    : [];


const addDays = (
  date,
  days
) => {
  const result =
    new Date(date);

  result.setDate(
    result.getDate() +
      Number(days || 0)
  );

  return result;
};


const toISOStringSafe = (
  date
) => {
  if (
    !(date instanceof Date) ||
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
};


// ============================================================
// Resolver estado do plano
// ============================================================

const resolvePlanStatus = (
  recommendation = {}
) => {
  const status =
    recommendation.idiStatus ||
    recommendation.status ||
    recommendation.priority ||
    'progressing';

  if (
    PLAN_PRIORITY[status]
  ) {
    return status;
  }

  const priority =
    recommendation.priority;

  switch (priority) {
    case 'critical':
      return 'critical';

    case 'high':
      return 'attention';

    case 'moderate':
      return 'progressing';

    case 'consolidation':
      return 'expected';

    case 'strength':
      return 'advanced';

    default:
      return 'progressing';
  }
};


// ============================================================
// Resolver configuração
// ============================================================

const resolvePlanConfig = (
  recommendation = {}
) => {
  const status =
    resolvePlanStatus(
      recommendation
    );

  return {
    status,

    ...(
      PLAN_PRIORITY[status] ||
      {
        label:
          'Em desenvolvimento',

        weeks:
          DEFAULT_PLAN_WEEKS,

        sessionsPerWeek:
          DEFAULT_SESSIONS_PER_WEEK,

        reviewDays:
          DEFAULT_REVIEW_DAYS,

        intensity:
          'moderate',

        interventionLabel:
          'Desenvolvimento progressivo',
      }
    ),
  };
};


// ============================================================
// Distribuição das semanas
// ============================================================

const distributeWeeks = (
  totalWeeks
) => {
  const weeks =
    Math.max(
      3,
      Number(totalWeeks) ||
        DEFAULT_PLAN_WEEKS
    );

  let foundation =
    Math.max(
      1,
      Math.round(
        weeks * 0.3
      )
    );

  let consolidation =
    Math.max(
      1,
      Math.round(
        weeks * 0.25
      )
    );

  let development =
    weeks -
    foundation -
    consolidation;

  if (
    development < 1
  ) {
    development = 1;

    if (
      foundation >
      consolidation
    ) {
      foundation -= 1;
    } else {
      consolidation -= 1;
    }
  }

  return {
    foundation,

    development,

    consolidation,
  };
};


// ============================================================
// Objetivo principal
// ============================================================

const buildMainObjective = (
  recommendation = {}
) => {
  if (
    recommendation.objective
  ) {
    return normalizeText(
      recommendation.objective
    );
  }

  const competency =
    normalizeText(
      recommendation.criterionName,
      'a competência selecionada'
    );

  return (
    `Melhorar ${competency}, aumentando a qualidade, ` +
    'consistência e aplicação em contexto de treino e competição.'
  );
};


// ============================================================
// Objetivos por fase
// ============================================================

const buildPhaseObjective = ({
  phaseId,
  recommendation,
}) => {
  const competency =
    normalizeText(
      recommendation.criterionName,
      'a competência'
    );

  switch (phaseId) {
    case 'foundation':
      return (
        `Estabilizar a execução de ${competency} através de tarefas ` +
        'simples, observáveis e repetíveis.'
      );

    case 'development':
      return (
        `Desenvolver ${competency} aumentando progressivamente a ` +
        'variabilidade, velocidade, oposição e tomada de decisão.'
      );

    case 'consolidation':
      return (
        `Consolidar ${competency} em situações próximas do jogo, ` +
        'avaliando a consistência e a transferência para contexto competitivo.'
      );

    default:
      return (
        `Desenvolver ${competency} de forma progressiva e observável.`
      );
  }
};


// ============================================================
// Focos de treino
// ============================================================

const buildTrainingFocus = (
  recommendation = {}
) => {
  const existing =
    normalizeList(
      recommendation.trainingFocus
    );

  if (
    existing.length > 0
  ) {
    return existing.slice(
      0,
      5
    );
  }

  const competency =
    normalizeText(
      recommendation.criterionName,
      'a competência'
    );

  return [
    `Executar ${competency} em contexto analítico e controlado.`,

    'Introduzir progressivamente pressão temporal e oposição.',

    'Aumentar a complexidade apenas após execução estável.',

    'Aplicar a competência em situações próximas do jogo.',

    'Registar a evolução e rever a qualidade da execução.',
  ];
};


// ============================================================
// Focos por fase
// ============================================================

const buildPhaseFocus = ({
  phaseId,
  trainingFocus,
}) => {
  const focus =
    Array.isArray(
      trainingFocus
    )
      ? trainingFocus
      : [];

  if (
    phaseId ===
    'foundation'
  ) {
    return [
      focus[0],
      focus[1],
    ].filter(Boolean);
  }

  if (
    phaseId ===
    'development'
  ) {
    return [
      focus[1],
      focus[2],
      focus[3],
    ].filter(Boolean);
  }

  return [
    focus[3],
    focus[4],
  ].filter(Boolean);
};


// ============================================================
// Critérios de sucesso
// ============================================================

const buildSuccessCriteria = (
  recommendation = {}
) => {
  const idi =
    asFiniteNumber(
      recommendation.idiScore
    );

  const latestScore =
    asFiniteNumber(
      recommendation.latestScore
    );

  const scaleMax =
    asFiniteNumber(
      recommendation.scaleMax,
      5
    );

  const criteria = [];

  if (
    idi !== null
  ) {
    const targetIdi =
      clamp(
        Math.round(
          idi + 10
        ),
        0,
        100
      );

    criteria.push(
      `Atingir ou superar um IDI de ${targetIdi}/100 nesta competência.`
    );
  }

  if (
    latestScore !== null &&
    scaleMax !== null
  ) {
    const targetScore =
      clamp(
        latestScore + 1,
        1,
        scaleMax
      );

    if (
      targetScore >
      latestScore
    ) {
      criteria.push(
        `Evoluir o resultado observado de ${latestScore.toFixed(
          1
        )}/${scaleMax} para pelo menos ${targetScore.toFixed(
          1
        )}/${scaleMax}.`
      );
    }
  }

  criteria.push(
    'Demonstrar execução consistente em diferentes situações de treino.'
  );

  criteria.push(
    'Transferir a competência para situações com maior pressão e tomada de decisão.'
  );

  return criteria;
};


// ============================================================
// Critérios para reavaliação
// ============================================================

const buildReviewCriteria = (
  recommendation = {}
) => {
  const items = [
    'Comparar o novo IDI com o valor registado no início do plano.',

    'Verificar a evolução da tendência da competência.',

    'Reavaliar a consistência da execução.',
  ];

  if (
    recommendation
      ?.expectedComparison
  ) {
    items.push(
      'Comparar o resultado obtido com o nível esperado definido para o atleta.'
    );
  }

  return items;
};


// ============================================================
// Construção das fases
// ============================================================

const buildPlanPhases = ({
  recommendation,
  totalWeeks,
  sessionsPerWeek,
  trainingFocus,
}) => {
  const distribution =
    distributeWeeks(
      totalWeeks
    );

  let startWeek = 1;

  return PLAN_PHASES.map(
    (phase) => {
      const phaseWeeks =
        distribution[
          phase.id
        ];

      const endWeek =
        startWeek +
        phaseWeeks -
        1;

      const result = {
        id:
          phase.id,

        label:
          phase.label,

        description:
          phase.description,

        startWeek,

        endWeek,

        weeks:
          phaseWeeks,

        sessionsPerWeek,

        estimatedSessions:
          phaseWeeks *
          sessionsPerWeek,

        objective:
          buildPhaseObjective({
            phaseId:
              phase.id,

            recommendation,
          }),

        trainingFocus:
          buildPhaseFocus({
            phaseId:
              phase.id,

            trainingFocus,
          }),

        completed:
          false,
      };

      startWeek =
        endWeek + 1;

      return result;
    }
  );
};


// ============================================================
// Reavaliação
// ============================================================

const buildReview = ({
  recommendation,
  config,
  startDate,
}) => {
  const reviewDate =
    addDays(
      startDate,
      config.reviewDays
    );

  return {
    recommendedAfterDays:
      config.reviewDays,

    recommendedDate:
      toISOStringSafe(
        reviewDate
      ),

    reason:
      config.status ===
      'critical'
        ? 'Prioridade crítica: recomenda-se acompanhamento e reavaliação precoce.'
        : config.status ===
          'attention'
        ? 'Competência abaixo do nível desejável: recomenda-se acompanhamento próximo.'
        : config.status ===
          'advanced'
        ? 'Competência consolidada: reavaliar para confirmar manutenção do desempenho.'
        : 'Reavaliar após um período suficiente de intervenção e consolidação.',

    criteria:
      buildReviewCriteria(
        recommendation
      ),
  };
};


// ============================================================
// Motor principal
// ============================================================

export function buildDevelopmentPlan(
  recommendation = {},
  options = {}
) {
  if (
    !recommendation ||
    typeof recommendation !==
      'object'
  ) {
    return null;
  }

  const config =
    resolvePlanConfig(
      recommendation
    );

  const startDate =
    options.startDate
      ? new Date(
          options.startDate
        )
      : new Date();

  const validStartDate =
    Number.isNaN(
      startDate.getTime()
    )
      ? new Date()
      : startDate;

  const totalWeeks =
    Number(
      options.totalWeeks
    ) ||
    config.weeks ||
    DEFAULT_PLAN_WEEKS;

  const sessionsPerWeek =
    Number(
      options.sessionsPerWeek
    ) ||
    config.sessionsPerWeek ||
    DEFAULT_SESSIONS_PER_WEEK;

  const trainingFocus =
    buildTrainingFocus(
      recommendation
    );

  const phases =
    buildPlanPhases({
      recommendation,

      totalWeeks,

      sessionsPerWeek,

      trainingFocus,
    });

  const estimatedSessions =
    phases.reduce(
      (
        sum,
        phase
      ) =>
        sum +
        Number(
          phase.estimatedSessions ||
          0
        ),
      0
    );

  const endDate =
    addDays(
      validStartDate,
      totalWeeks * 7
    );

  const idiScore =
    asFiniteNumber(
      recommendation.idiScore
    );

  const recommendationIndex =
    asFiniteNumber(
      recommendation
        .recommendationIndex
    );

  return {
    // ========================================================
    // Identificação
    // ========================================================

    id:
      `pid-${
        recommendation.id ||
        recommendation.criterionId ||
        recommendation.criterionCode ||
        'development'
      }`,

    sourceRecommendationId:
      recommendation.id ||
      null,

    criterionId:
      recommendation
        .criterionId ||
      null,

    criterionCode:
      recommendation
        .criterionCode ||
      null,

    criterionName:
      normalizeText(
        recommendation
          .criterionName,
        'Competência de desenvolvimento'
      ),

    domainId:
      recommendation
        .domainId ||
      null,

    domainLabel:
      normalizeText(
        recommendation
          .domainLabel,
        'Competências Gerais'
      ),

    subdomainId:
      recommendation
        .subdomainId ||
      null,

    subdomainLabel:
      normalizeText(
        recommendation
          .subdomainLabel,
        'Competência Geral'
      ),

    // ========================================================
    // Estado inicial
    // ========================================================

    priority:
      recommendation.priority ||
      null,

    status:
      config.status,

    statusLabel:
      config.label,

    interventionLabel:
      config.interventionLabel,

    intensity:
      config.intensity,

    idiScore,

    idiStatus:
      recommendation.idiStatus ||
      recommendation.status ||
      config.status,

    idiStatusLabel:
      recommendation
        .idiStatusLabel ||
      config.label,

    recommendationIndex,

    latestScore:
      asFiniteNumber(
        recommendation.latestScore
      ),

    scaleMin:
      asFiniteNumber(
        recommendation.scaleMin,
        1
      ),

    scaleMax:
      asFiniteNumber(
        recommendation.scaleMax,
        5
      ),

    trend:
      recommendation.trend ||
      null,

    expectedLevel:
      recommendation
        .expectedLevel ||
      null,

    expectedComparison:
      recommendation
        .expectedComparison ||
      null,

    // ========================================================
    // Objetivo
    // ========================================================

    objective:
      buildMainObjective(
        recommendation
      ),

    coachGuidance:
      normalizeText(
        recommendation
          .coachMessage
      ),

    trainingFocus,

    // ========================================================
    // Planeamento temporal
    // ========================================================

    startDate:
      toISOStringSafe(
        validStartDate
      ),

    endDate:
      toISOStringSafe(
        endDate
      ),

    totalWeeks,

    sessionsPerWeek,

    estimatedSessions,

    phases,

    // ========================================================
    // Critérios de sucesso
    // ========================================================

    successCriteria:
      buildSuccessCriteria(
        recommendation
      ),

    // ========================================================
    // Reavaliação
    // ========================================================

    review:
      buildReview({
        recommendation,

        config,

        startDate:
          validStartDate,
      }),

    // ========================================================
    // Estado operacional
    // ========================================================

    planStatus:
      'suggested',

    accepted:
      false,

    started:
      false,

    completed:
      false,

    progress:
      0,

    // ========================================================
    // Metadados
    // ========================================================

    generatedAutomatically:
      true,

    engineVersion:
      'C3.6.2',

    generatedAt:
      new Date().toISOString(),
  };
}


// ============================================================
// Construção de vários planos
// ============================================================

export function buildDevelopmentPlans(
  recommendations = [],
  options = {}
) {
  if (
    !Array.isArray(
      recommendations
    )
  ) {
    return [];
  }

  return recommendations
    .map(
      (recommendation) =>
        buildDevelopmentPlan(
          recommendation,
          options
        )
    )
    .filter(Boolean);
}


// ============================================================
// Plano prioritário
// ============================================================

export function buildPrimaryDevelopmentPlan(
  recommendations = [],
  options = {}
) {
  if (
    !Array.isArray(
      recommendations
    ) ||
    recommendations.length ===
      0
  ) {
    return null;
  }

  const sorted =
    [...recommendations].sort(
      (
        first,
        second
      ) => {
        const priorityRank = {
          critical: 0,

          high: 1,

          moderate: 2,

          consolidation: 3,

          strength: 4,
        };

        const firstRank =
          priorityRank[
            first?.priority
          ] ?? 99;

        const secondRank =
          priorityRank[
            second?.priority
          ] ?? 99;

        if (
          firstRank !==
          secondRank
        ) {
          return (
            firstRank -
            secondRank
          );
        }

        const firstIdi =
          asFiniteNumber(
            first?.idiScore,
            100
          );

        const secondIdi =
          asFiniteNumber(
            second?.idiScore,
            100
          );

        return (
          firstIdi -
          secondIdi
        );
      }
    );

  return buildDevelopmentPlan(
    sorted[0],
    options
  );
}


// ============================================================
// Resumo do plano
// ============================================================

export function getDevelopmentPlanSummary(
  plan
) {
  if (!plan) {
    return null;
  }

  return {
    id:
      plan.id,

    criterionName:
      plan.criterionName,

    domainLabel:
      plan.domainLabel,

    subdomainLabel:
      plan.subdomainLabel,

    status:
      plan.status,

    statusLabel:
      plan.statusLabel,

    idiScore:
      plan.idiScore,

    totalWeeks:
      plan.totalWeeks,

    sessionsPerWeek:
      plan.sessionsPerWeek,

    estimatedSessions:
      plan.estimatedSessions,

    reviewDate:
      plan.review
        ?.recommendedDate ||
      null,

    phaseCount:
      Array.isArray(
        plan.phases
      )
        ? plan.phases.length
        : 0,
  };
}
