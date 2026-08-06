import {
  resolveAndCompareExpectedLevel,
} from './expectedLevelResolver';

// ============================================================
// StickPro Development Recommendations
// Sprint C3.5B.1A
// ============================================================

const DEFAULT_SCALE_MIN = 1;
const DEFAULT_SCALE_MAX = 5;

const PRIORITY_ORDER = {
  critical: 0,
  high: 1,
  moderate: 2,
  consolidation: 3,
  strength: 4,
};

export const DEVELOPMENT_PRIORITY_CONFIG = {
  critical: {
    id: 'critical',
    label: 'Prioridade crítica',
    shortLabel: 'Crítica',
    tone: 'red',
    className:
      'border-red-200 bg-red-50 text-red-700',
  },

  high: {
    id: 'high',
    label: 'Prioridade elevada',
    shortLabel: 'Elevada',
    tone: 'orange',
    className:
      'border-orange-200 bg-orange-50 text-orange-700',
  },

  moderate: {
    id: 'moderate',
    label: 'Prioridade moderada',
    shortLabel: 'Moderada',
    tone: 'amber',
    className:
      'border-amber-200 bg-amber-50 text-amber-700',
  },

  consolidation: {
    id: 'consolidation',
    label: 'Consolidação',
    shortLabel: 'Consolidar',
    tone: 'cyan',
    className:
      'border-cyan-200 bg-cyan-50 text-cyan-700',
  },

  strength: {
    id: 'strength',
    label: 'Ponto forte',
    shortLabel: 'Ponto forte',
    tone: 'emerald',
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
};

const normalizeText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const asFiniteNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};

const roundValue = (
  value,
  decimals = 2
) => {
  const number = asFiniteNumber(value);

  if (number === null) {
    return null;
  }

  const multiplier =
    10 ** decimals;

  return (
    Math.round(
      number * multiplier
    ) / multiplier
  );
};

const getCriterionId = (
  entry = {}
) =>
  entry?.criterion_id ||
  entry?.criterionId ||
  entry?.criterion?.id ||
  entry?.id ||
  null;

const getCriterionCode = (
  entry = {}
) =>
  entry?.criterion_code ||
  entry?.criterionCode ||
  entry?.code ||
  entry?.source_code ||
  entry?.criterion?.code ||
  entry?.criterion?.source_code ||
  null;

const getCriterionName = (
  entry = {}
) =>
  entry?.criterion_name ||
  entry?.criterionName ||
  entry?.name ||
  entry?.label ||
  entry?.criterion?.name ||
  entry?.criterion?.label ||
  getCriterionCode(entry) ||
  getCriterionId(entry) ||
  'Critério';

const getCriterionDescription = (
  entry = {}
) =>
  entry?.description ||
  entry?.criterion_description ||
  entry?.criterion?.description ||
  null;

const getDomainId = (
  entry = {}
) =>
  entry?.domain ||
  entry?.domain_id ||
  entry?.domainId ||
  entry?.criterion?.domain ||
  entry?.criterion?.domain_id ||
  'other';

const getDomainLabel = (
  entry = {}
) =>
  entry?.domain_label ||
  entry?.domainLabel ||
  entry?.criterion?.domain_label ||
  entry?.criterion?.domainLabel ||
  getDomainId(entry) ||
  'Outro';

const getSubdomainId = (
  entry = {}
) =>
  entry?.subdomain ||
  entry?.subdomain_id ||
  entry?.subdomainId ||
  entry?.criterion?.subdomain ||
  entry?.criterion?.subdomain_id ||
  'general';

const getSubdomainLabel = (
  entry = {}
) =>
  entry?.subdomain_label ||
  entry?.subdomainLabel ||
  entry?.criterion?.subdomain_label ||
  entry?.criterion?.subdomainLabel ||
  getSubdomainId(entry) ||
  'Geral';

const getScaleMin = (
  entry = {}
) =>
  asFiniteNumber(
    entry?.scale_min ??
      entry?.scaleMin ??
      entry?.criterion?.scale_min ??
      entry?.criterion?.scaleMin
  ) ??
  DEFAULT_SCALE_MIN;

const getScaleMax = (
  entry = {}
) =>
  asFiniteNumber(
    entry?.scale_max ??
      entry?.scaleMax ??
      entry?.criterion?.scale_max ??
      entry?.criterion?.scaleMax
  ) ??
  DEFAULT_SCALE_MAX;

const getScoreValue = (
  entry = {}
) =>
  asFiniteNumber(
    entry?.score ??
      entry?.value ??
      entry?.rating ??
      entry?.score_value
  );

const normalizeScorePercentage = ({
  score,
  scaleMin,
  scaleMax,
}) => {
  if (
    score === null ||
    scaleMax <= scaleMin
  ) {
    return null;
  }

  const rawPercentage =
    ((score - scaleMin) /
      (scaleMax - scaleMin)) *
    100;

  return Math.max(
    0,
    Math.min(
      100,
      roundValue(
        rawPercentage,
        1
      )
    )
  );
};

const resolvePriority = ({
  idiScore,
  expectedComparison,
  recommendationIndex,
}) => {
  /*
   * Novo motor StickPro.
   *
   * Sempre que existir IDI, este passa a ser
   * a única fonte de verdade.
   */

  if (Number.isFinite(idiScore)) {
    if (idiScore < 35) {
      return 'critical';
    }

    if (idiScore < 55) {
      return 'high';
    }

    if (idiScore < 75) {
      return 'moderate';
    }

    if (idiScore < 90) {
      return 'consolidation';
    }

    return 'strength';
  }

  /*
   * Compatibilidade.
   *
   * Critérios antigos que ainda não possuem IDI.
   */

  if (
    expectedComparison?.status ===
    'below_expected'
  ) {
    return 'high';
  }

  if (
    expectedComparison?.status ===
    'within_expected'
  ) {
    return 'consolidation';
  }

  if (
    expectedComparison?.status ===
    'above_expected'
  ) {
    return 'strength';
  }

  if (
    recommendationIndex == null
  ) {
    return null;
  }

  if (
    recommendationIndex < 30
  ) {
    return 'critical';
  }

  if (
    recommendationIndex < 50
  ) {
    return 'high';
  }

  if (
    recommendationIndex < 70
  ) {
    return 'moderate';
  }

  if (
    recommendationIndex < 85
  ) {
    return 'consolidation';
  }

  return 'strength';
};

const buildObjectiveText = ({
  criterionName,
  priority,
}) => {
  switch (priority) {
    case 'critical':
      return (
        `Desenvolver as bases de ${criterionName}, ` +
        'garantindo execução técnica segura, consistente e progressiva.'
      );

    case 'high':
      return (
        `Melhorar ${criterionName}, aumentando a qualidade, ` +
        'a regularidade e a aplicação em contexto de treino.'
      );

    case 'moderate':
      return (
        `Consolidar ${criterionName} e transferir a competência ` +
        'para situações progressivamente mais exigentes.'
      );

    case 'consolidation':
      return (
        `Estabilizar o desempenho em ${criterionName} e aumentar ` +
        'a consistência sob pressão e em contexto competitivo.'
      );

    case 'strength':
      return (
        `Manter ${criterionName} como ponto forte e utilizar esta ` +
        'competência para apoiar o desenvolvimento global do atleta.'
      );

    default:
      return (
        `Promover a evolução em ${criterionName}.`
      );
  }
};

const buildTrainingFocus = ({
  criterionName,
  priority,
}) => {
  switch (priority) {
    case 'critical':
      return [
        `Trabalhar ${criterionName} em contexto analítico e sem oposição.`,
        'Utilizar repetições curtas, com feedback imediato.',
        'Aumentar a dificuldade apenas após execução estável.',
      ];

    case 'high':
      return [
        `Reforçar ${criterionName} com tarefas simples e progressivas.`,
        'Introduzir oposição condicionada depois da estabilização técnica.',
        'Registar a evolução em ciclos curtos de treino.',
      ];

    case 'moderate':
      return [
        `Integrar ${criterionName} em exercícios com tomada de decisão.`,
        'Variar velocidade, espaço disponível e nível de oposição.',
        'Avaliar novamente após um bloco específico de treino.',
      ];

    case 'consolidation':
      return [
        `Aplicar ${criterionName} em situações próximas do jogo.`,
        'Criar tarefas com pressão temporal e adversários ativos.',
        'Monitorizar a consistência entre treino e competição.',
      ];

    case 'strength':
      return [
        `Manter estímulos regulares de ${criterionName}.`,
        'Utilizar esta competência em tarefas de maior complexidade.',
        'Explorar o atleta como referência positiva dentro da equipa.',
      ];

    default:
      return [];
  }
};

const buildCoachMessage = ({
  criterionName,
  priority,
}) => {
  switch (priority) {
    case 'critical':
      return (
        `${criterionName} necessita de intervenção prioritária. ` +
        'Começar por tarefas simples, observáveis e repetíveis.'
      );

    case 'high':
      return (
        `${criterionName} deverá integrar os próximos microciclos ` +
        'como objetivo principal de desenvolvimento.'
      );

    case 'moderate':
      return (
        `${criterionName} apresenta base funcional, mas ainda necessita ` +
        'de maior consistência e transferência para o jogo.'
      );

    case 'consolidation':
      return (
        `${criterionName} encontra-se em bom nível. O foco deverá ser ` +
        'a estabilidade perante contextos mais exigentes.'
      );

    case 'strength':
      return (
        `${criterionName} constitui um ponto forte atual e deverá ser ` +
        'mantido, valorizado e utilizado em tarefas avançadas.'
      );

    default:
      return null;
  }
};

const getCriterionExpectedLevels = (
  entry = {}
) => {
  const candidates = [
    entry?.expected_levels,
    entry?.expectedLevels,

    entry?.criterion
      ?.expected_levels,

    entry?.criterion
      ?.expectedLevels,
  ];

  const expectedLevels =
    candidates.find(
      Array.isArray
    );

  return Array.isArray(
    expectedLevels
  )
    ? expectedLevels
    : [];
};


const getEntryTeamId = (
  entry = {},
  evaluation = {}
) =>
  entry?.team_id ||
  entry?.teamId ||
  entry?.criterion?.team_id ||
  entry?.criterion?.teamId ||
  evaluation?.team_id ||
  evaluation?.teamId ||
  null;


const getEntryAgeGroup = (
  entry = {},
  evaluation = {}
) =>
  entry?.age_group ||
  entry?.ageGroup ||
  entry?.criterion?.age_group ||
  entry?.criterion?.ageGroup ||
  evaluation?.age_group ||
  evaluation?.ageGroup ||
  evaluation?.team_age_group ||
  evaluation?.teamAgeGroup ||
  null;


const getEntryPlayerType = (
  entry = {},
  evaluation = {}
) =>
  entry?.player_type ||
  entry?.playerType ||
  entry?.criterion?.player_type ||
  entry?.criterion?.playerType ||
  evaluation?.player_type ||
  evaluation?.playerType ||
  null;


const buildCriteriaMap = (
  criteria = []
) => {
  const map = new Map();

  (
    Array.isArray(criteria)
      ? criteria
      : []
  ).forEach(
    (criterion) => {
      const criterionId =
        criterion?.id ||
        criterion?.criterion_id ||
        criterion?.criterionId ||
        null;

      const criterionCode =
        criterion?.code ||
        criterion?.sourceCode ||
        criterion?.source_code ||
        null;

      if (criterionId) {
        map.set(
          String(criterionId),
          criterion
        );
      }

      if (criterionCode) {
        map.set(
          String(criterionCode),
          criterion
        );
      }
    }
  );

  return map;
};


const normalizeEvaluationScores = ({
  evaluations = [],
  criteria = [],
  teamId = null,
  ageGroup = null,
  playerType = null,
} = {}) => {
  const normalized = [];

  const criteriaMap =
    buildCriteriaMap(
      criteria
    );

  evaluations.forEach(
    (evaluation) => {
      const evaluationDate =
        evaluation?.evaluation_date ||
        evaluation?.created_at ||
        evaluation?.updated_at ||
        null;

      const evaluationId =
        evaluation?.id ||
        evaluation?.evaluation_id ||
        null;

      const planId =
        evaluation?.plan_id ||
        null;

      const scores = Array.isArray(
        evaluation?.scores
      )
        ? evaluation.scores
        : [];

      scores.forEach(
        (scoreEntry) => {
          const score =
            getScoreValue(
              scoreEntry
            );

          if (score === null) {
            return;
          }

          const criterionId =
            getCriterionId(
              scoreEntry
            );

          const criterionCode =
            getCriterionCode(
              scoreEntry
            );

          const criterionKey =
            criterionId ||
            criterionCode;

          if (!criterionKey) {
            return;
          }

          const externalCriterion =
            criteriaMap.get(
              String(criterionId)
            ) ||
            criteriaMap.get(
              String(criterionCode)
            ) ||
            null;

          /*
           * Alguns endpoints já devolvem o critério
           * dentro de scoreEntry.criterion.
           *
           * Quando isso não acontece, utilizamos a
           * lista de critérios fornecida à função principal.
           */
          const enrichedScoreEntry = {
            ...(externalCriterion || {}),
            ...scoreEntry,

            criterion: {
              ...(externalCriterion || {}),
              ...(scoreEntry?.criterion || {}),
            },
          };

          const scaleMin =
            getScaleMin(
              enrichedScoreEntry
            );

          const scaleMax =
            getScaleMax(
              enrichedScoreEntry
            );

          const normalizedPercentage =
            normalizeScorePercentage({
              score,
              scaleMin,
              scaleMax,
            });

          const resolvedTeamId =
            getEntryTeamId(
              enrichedScoreEntry,
              evaluation
            ) ||
            teamId ||
            null;

          const resolvedAgeGroup =
            getEntryAgeGroup(
              enrichedScoreEntry,
              evaluation
            ) ||
            ageGroup ||
            null;

          const resolvedPlayerType =
            getEntryPlayerType(
              enrichedScoreEntry,
              evaluation
            ) ||
            playerType ||
            null;

          const expectedLevels =
            getCriterionExpectedLevels(
              enrichedScoreEntry
            );

          normalized.push({
            evaluationId,
            planId,
            evaluationDate,

            criterionKey,
            criterionId,
            criterionCode,

            criterionName:
              getCriterionName(
                enrichedScoreEntry
              ),

            criterionDescription:
              getCriterionDescription(
                enrichedScoreEntry
              ),

            domainId:
              getDomainId(
                enrichedScoreEntry
              ),

            domainLabel:
              getDomainLabel(
                enrichedScoreEntry
              ),

            subdomainId:
              getSubdomainId(
                enrichedScoreEntry
              ),

            subdomainLabel:
              getSubdomainLabel(
                enrichedScoreEntry
              ),

            expectedLevels,

            teamId:
              resolvedTeamId,

            ageGroup:
              resolvedAgeGroup,

            playerType:
              resolvedPlayerType,

            score,
            scaleMin,
            scaleMax,
            normalizedPercentage,
          });
        }
      );
    }
  );

  return normalized;
};

const groupScoresByCriterion = (
  normalizedScores = []
) => {
  const groups = new Map();

  normalizedScores.forEach(
    (scoreEntry) => {
      const key =
        scoreEntry.criterionKey;

      if (!key) {
        return;
      }

      if (!groups.has(key)) {
        groups.set(key, {
          criterionKey: key,

          criterionId:
            scoreEntry.criterionId ||
            null,

          criterionCode:
            scoreEntry.criterionCode ||
            null,

          criterionName:
            scoreEntry.criterionName ||
            'Critério',

          criterionDescription:
            scoreEntry
              .criterionDescription ||
            null,

          domainId:
            scoreEntry.domainId ||
            'other',

          domainLabel:
            scoreEntry.domainLabel ||
            'Outro',

          subdomainId:
            scoreEntry.subdomainId ||
            'general',

          subdomainLabel:
            scoreEntry.subdomainLabel ||
            'Geral',

          expectedLevels:
            Array.isArray(
              scoreEntry.expectedLevels
            )
              ? scoreEntry.expectedLevels
              : [],

          teamId:
            scoreEntry.teamId ||
            null,

          ageGroup:
            scoreEntry.ageGroup ||
            null,

          playerType:
            scoreEntry.playerType ||
            null,

          entries: [],
        });
      }

      const group =
        groups.get(key);

      /*
       * Preserva os metadados mais completos encontrados
       * nas várias avaliações históricas do critério.
       */

      if (
        (
          !Array.isArray(
            group.expectedLevels
          ) ||
          group.expectedLevels.length === 0
        ) &&
        Array.isArray(
          scoreEntry.expectedLevels
        ) &&
        scoreEntry.expectedLevels.length > 0
      ) {
        group.expectedLevels =
          scoreEntry.expectedLevels;
      }

      if (
        !group.teamId &&
        scoreEntry.teamId
      ) {
        group.teamId =
          scoreEntry.teamId;
      }

      if (
        !group.ageGroup &&
        scoreEntry.ageGroup
      ) {
        group.ageGroup =
          scoreEntry.ageGroup;
      }

      if (
        !group.playerType &&
        scoreEntry.playerType
      ) {
        group.playerType =
          scoreEntry.playerType;
      }

      if (
        (
          !group.criterionName ||
          group.criterionName ===
            'Critério'
        ) &&
        scoreEntry.criterionName
      ) {
        group.criterionName =
          scoreEntry.criterionName;
      }

      if (
        !group.criterionDescription &&
        scoreEntry
          .criterionDescription
      ) {
        group.criterionDescription =
          scoreEntry
            .criterionDescription;
      }

      group.entries.push(
        scoreEntry
      );
    }
  );

  return Array.from(
    groups.values()
  );
};

const calculateCriterionTrend = (
  entries = []
) => {
  const ordered = [...entries].sort(
    (first, second) => {
      const firstTime =
        first.evaluationDate
          ? new Date(
              first.evaluationDate
            ).getTime()
          : 0;

      const secondTime =
        second.evaluationDate
          ? new Date(
              second.evaluationDate
            ).getTime()
          : 0;

      return (
        firstTime -
        secondTime
      );
    }
  );

  if (ordered.length < 2) {
    return {
      direction: 'stable',
      difference: 0,
    };
  }

  const latest =
    ordered[
      ordered.length - 1
    ]?.normalizedPercentage;

  const previous =
    ordered[
      ordered.length - 2
    ]?.normalizedPercentage;

  if (
    latest === null ||
    latest === undefined ||
    previous === null ||
    previous === undefined
  ) {
    return {
      direction: 'stable',
      difference: 0,
    };
  }

  const difference =
    roundValue(
      latest - previous,
      1
    );

  if (difference >= 5) {
    return {
      direction: 'improving',
      difference,
    };
  }

  if (difference <= -5) {
    return {
      direction: 'declining',
      difference,
    };
  }

  return {
    direction: 'stable',
    difference,
  };
};

// ============================================================
// Intelligent Development Index — IDI
// Sprint C3.5B.3
// ============================================================

const clampValue = (
  value,
  minimum = 0,
  maximum = 100
) =>
  Math.max(
    minimum,
    Math.min(
      maximum,
      Number(value) || 0
    )
  );


const calculateConsistency = (
  entries = []
) => {
  const recentValues =
    [...entries]
      .sort(
        (first, second) => {
          const firstTime =
            first.evaluationDate
              ? new Date(
                  first.evaluationDate
                ).getTime()
              : 0;

          const secondTime =
            second.evaluationDate
              ? new Date(
                  second.evaluationDate
                ).getTime()
              : 0;

          return (
            secondTime -
            firstTime
          );
        }
      )
      .slice(0, 5)
      .map(
        (entry) =>
          Number(
            entry.normalizedPercentage
          )
      )
      .filter(
        Number.isFinite
      );

  if (
    recentValues.length < 2
  ) {
    return {
      score: 50,
      label: 'Dados insuficientes',
      standardDeviation: null,
      sampleSize:
        recentValues.length,
    };
  }

  const average =
    recentValues.reduce(
      (sum, value) =>
        sum + value,
      0
    ) /
    recentValues.length;

  const variance =
    recentValues.reduce(
      (sum, value) =>
        sum +
        (
          value -
          average
        ) ** 2,
      0
    ) /
    recentValues.length;

  const standardDeviation =
    Math.sqrt(
      variance
    );

  /*
   * Desvio padrão:
   * 0%   → consistência 100
   * 25%+ → consistência 0
   */
  const score =
    roundValue(
      clampValue(
        100 -
        standardDeviation * 4
      ),
      1
    );

  let label =
    'Baixa';

  if (score >= 80) {
    label = 'Elevada';
  } else if (score >= 60) {
    label = 'Boa';
  } else if (score >= 40) {
    label = 'Moderada';
  }

  return {
    score,
    label,

    standardDeviation:
      roundValue(
        standardDeviation,
        1
      ),

    sampleSize:
      recentValues.length,
  };
};


const calculateTrendComponent = (
  trend = {}
) => {
  const difference =
    Number(
      trend?.difference
    );

  if (
    !Number.isFinite(
      difference
    )
  ) {
    return 50;
  }

  /*
   * Tendência neutra = 50.
   * Cada ponto percentual de evolução altera
   * o componente em dois pontos.
   */
  return roundValue(
    clampValue(
      50 +
      difference * 2
    ),
    1
  );
};


const calculateLevelComponent = ({
  recommendationIndex,
  expectedLevel,
  expectedComparison,
  latestScore,
  scaleMin,
  scaleMax,
}) => {
  /*
   * Sem intervalo esperado:
   * mantém-se o índice percentual anterior.
   */
  if (
    !expectedLevel ||
    expectedComparison?.status ===
      'not_configured'
  ) {
    return roundValue(
      clampValue(
        recommendationIndex
      ),
      1
    );
  }

  const numericScore =
    Number(
      latestScore
    );

  const expectedMinimum =
    Number(
      expectedLevel.minimum
    );

  const expectedMaximum =
    Number(
      expectedLevel.maximum
    );

  const numericScaleMin =
    Number(
      scaleMin
    );

  const numericScaleMax =
    Number(
      scaleMax
    );

  const scaleRange =
    numericScaleMax -
    numericScaleMin;

  if (
    !Number.isFinite(
      numericScore
    ) ||
    !Number.isFinite(
      expectedMinimum
    ) ||
    !Number.isFinite(
      expectedMaximum
    ) ||
    !Number.isFinite(
      scaleRange
    ) ||
    scaleRange <= 0
  ) {
    return roundValue(
      clampValue(
        recommendationIndex
      ),
      1
    );
  }

  if (
    expectedComparison.status ===
    'below_expected'
  ) {
    const gap =
      Math.max(
        0,
        expectedMinimum -
        numericScore
      );

    /*
     * Próximo do mínimo esperado:
     * aproxima-se de 70.
     *
     * Muito abaixo:
     * aproxima-se de 0.
     */
    return roundValue(
      clampValue(
        70 -
        (
          gap /
          scaleRange
        ) *
        100,
        0,
        69
      ),
      1
    );
  }

  if (
    expectedComparison.status ===
    'within_expected'
  ) {
    const intervalRange =
      expectedMaximum -
      expectedMinimum;

    const progress =
      intervalRange > 0
        ? (
            numericScore -
            expectedMinimum
          ) /
          intervalRange
        : 0.5;

    return roundValue(
      clampValue(
        75 +
        progress * 10,
        75,
        85
      ),
      1
    );
  }

  if (
    expectedComparison.status ===
    'above_expected'
  ) {
    const excess =
      Math.max(
        0,
        numericScore -
        expectedMaximum
      );

    return roundValue(
      clampValue(
        90 +
        (
          excess /
          scaleRange
        ) *
        10,
        90,
        100
      ),
      1
    );
  }

  return roundValue(
    clampValue(
      recommendationIndex
    ),
    1
  );
};


const resolveIdiStatus = (
  idiScore
) => {
  const score =
    Number(
      idiScore
    );

  if (
    !Number.isFinite(
      score
    )
  ) {
    return {
      id: 'unknown',
      label:
        'Sem dados suficientes',
    };
  }

  if (score < 35) {
    return {
      id: 'critical',
      label:
        'Desenvolvimento prioritário',
    };
  }

  if (score < 55) {
    return {
      id: 'attention',
      label:
        'Necessita de atenção',
    };
  }

  if (score < 75) {
    return {
      id: 'progressing',
      label:
        'Em desenvolvimento',
    };
  }

  if (score < 90) {
    return {
      id: 'expected',
      label:
        'Dentro do esperado',
    };
  }

  return {
    id: 'advanced',
    label:
      'Desempenho avançado',
  };
};


const calculateIntelligentDevelopmentIndex = ({
  recommendationIndex,
  expectedLevel,
  expectedComparison,
  latestScore,
  scaleMin,
  scaleMax,
  trend,
  entries,
}) => {
  const levelComponent =
    calculateLevelComponent({
      recommendationIndex,
      expectedLevel,
      expectedComparison,
      latestScore,
      scaleMin,
      scaleMax,
    });

  const trendComponent =
    calculateTrendComponent(
      trend
    );

  const consistency =
    calculateConsistency(
      entries
    );

  /*
   * IDI:
   * 60% nível atual
   * 25% tendência
   * 15% consistência
   */
  const score =
    roundValue(
      levelComponent * 0.6 +
      trendComponent * 0.25 +
      consistency.score * 0.15,
      1
    );

  const status =
    resolveIdiStatus(
      score
    );

  return {
    score,

    status:
      status.id,

    statusLabel:
      status.label,

    components: {
      level:
        levelComponent,

      trend:
        trendComponent,

      consistency:
        consistency.score,
    },

    consistency,

    weights: {
      level: 0.6,
      trend: 0.25,
      consistency: 0.15,
    },
  };
};

const buildCriterionRecommendation = (
  group
) => {
  const percentages =
    group.entries
      .map(
        (entry) =>
          entry.normalizedPercentage
      )
      .filter(
        (value) =>
          value !== null &&
          value !== undefined
      );

  if (
    percentages.length === 0
  ) {
    return null;
  }

  const averagePercentage =
    roundValue(
      percentages.reduce(
        (sum, value) =>
          sum + value,
        0
      ) /
        percentages.length,
      1
    );

  const latestEntry =
    [...group.entries].sort(
      (first, second) => {
        const firstTime =
          first.evaluationDate
            ? new Date(
                first.evaluationDate
              ).getTime()
            : 0;

        const secondTime =
          second.evaluationDate
            ? new Date(
                second.evaluationDate
              ).getTime()
            : 0;

        return (
          secondTime -
          firstTime
        );
      }
    )[0];

  const latestPercentage =
    latestEntry
      ?.normalizedPercentage ??
    averagePercentage;

  /*
   * Índice histórico mantido apenas para:
   * - compatibilidade;
   * - critérios ainda sem nível esperado;
   * - ordenação secundária.
   */
  const recommendationIndex =
    roundValue(
      latestPercentage * 0.65 +
        averagePercentage * 0.35,
      1
    );

  const {
    expectedLevel,
    comparison:
      expectedComparison,
  } =
    resolveAndCompareExpectedLevel({
      expectedLevels:
        group.expectedLevels ||
        [],

      score:
        latestEntry?.score ??
        null,

      teamId:
        group.teamId ||
        latestEntry?.teamId ||
        null,

      ageGroup:
        group.ageGroup ||
        latestEntry?.ageGroup ||
        null,

      playerType:
        group.playerType ||
        latestEntry?.playerType ||
        null,
    });

  const trend =
    calculateCriterionTrend(
      group.entries
    );

  const intelligentDevelopmentIndex =
    calculateIntelligentDevelopmentIndex({
      recommendationIndex,

      expectedLevel,

      expectedComparison,

      latestScore:
        latestEntry?.score ??
        null,

      scaleMin:
        latestEntry?.scaleMin ??
        DEFAULT_SCALE_MIN,

      scaleMax:
        latestEntry?.scaleMax ??
        DEFAULT_SCALE_MAX,

      trend,

      entries:
        group.entries,
    });

  const priority =
    resolvePriority({
      idiScore:
        intelligentDevelopmentIndex.score,

      expectedComparison,

      recommendationIndex,
    });

  const priorityConfig =
    DEVELOPMENT_PRIORITY_CONFIG[
      priority
    ];

  return {
    id:
      `recommendation:${group.criterionKey}`,

    criterionId:
      group.criterionId,

    criterionCode:
      group.criterionCode,

    criterionName:
      group.criterionName,

    criterionDescription:
      group.criterionDescription,

    domainId:
      group.domainId,

    domainLabel:
      group.domainLabel,

    subdomainId:
      group.subdomainId,

    subdomainLabel:
      group.subdomainLabel,

    priority,

    priorityLabel:
      priorityConfig?.label ||
      priority,

    priorityClassName:
      priorityConfig?.className ||
      '',

    recommendationIndex,

    // ========================================================
    // Índice Inteligente de Desenvolvimento
    // Sprint C3.5B.3
    // ========================================================

    idi:
      intelligentDevelopmentIndex,

    idiScore:
      intelligentDevelopmentIndex.score,

    idiStatus:
      intelligentDevelopmentIndex.status,

    idiStatusLabel:
      intelligentDevelopmentIndex
        .statusLabel,

    idiLevelComponent:
      intelligentDevelopmentIndex
        .components.level,

    idiTrendComponent:
      intelligentDevelopmentIndex
        .components.trend,

    idiConsistencyComponent:
      intelligentDevelopmentIndex
        .components.consistency,

    consistency:
      intelligentDevelopmentIndex
        .consistency,

    averagePercentage,

    latestPercentage,

    latestScore:
      latestEntry?.score ??
      null,

    scaleMin:
      latestEntry?.scaleMin ??
      DEFAULT_SCALE_MIN,

    scaleMax:
      latestEntry?.scaleMax ??
      DEFAULT_SCALE_MAX,

    // ========================================================
    // Nível esperado aplicado
    // Sprint C3.5B.2C
    // ========================================================

    expectedLevel,

    expectedMinimum:
      expectedLevel?.minimum ??
      null,

    expectedMaximum:
      expectedLevel?.maximum ??
      null,

    expectedLevelContext:
      expectedLevel?.contextLabel ||
      null,

    expectedLevelSource:
      expectedLevel?.source ||
      null,

    expectedComparison,

    expectedStatus:
      expectedComparison?.status ||
      'not_configured',

    expectedStatusLabel:
      expectedComparison?.label ||
      'Sem nível esperado',

    differenceToExpectedMinimum:
      expectedComparison
        ?.differenceToMinimum ??
      null,

    differenceToExpectedMaximum:
      expectedComparison
        ?.differenceToMaximum ??
      null,

    expectedDistance:
      expectedComparison?.distance ??
      null,

    usesExpectedLevel:
      Boolean(
        expectedLevel
      ),

    teamId:
      group.teamId ||
      latestEntry?.teamId ||
      null,

    ageGroup:
      group.ageGroup ||
      latestEntry?.ageGroup ||
      null,

    playerType:
      group.playerType ||
      latestEntry?.playerType ||
      null,

    evaluationCount:
      group.entries.length,

    latestEvaluationDate:
      latestEntry
        ?.evaluationDate ||
      null,

    trend,

    objective:
      buildObjectiveText({
        criterionName:
          group.criterionName,

        priority,
      }),

    trainingFocus:
      buildTrainingFocus({
        criterionName:
          group.criterionName,

        priority,
      }),

    coachMessage:
      buildCoachMessage({
        criterionName:
          group.criterionName,

        priority,
      }),

    source:
      expectedLevel
        ? 'expected_level_rule_engine'
        : 'automatic_rule_engine',

    generatedAt:
      new Date().toISOString(),
  };
};


const groupRecommendationsByDomain = (
  recommendations = []
) => {
  const domains = new Map();

  recommendations.forEach(
    (recommendation) => {
      const domainId =
        recommendation.domainId ||
        'other';

      if (!domains.has(domainId)) {
        domains.set(domainId, {
          id: domainId,
          label:
            recommendation.domainLabel ||
            domainId,
          recommendations: [],
        });
      }

      domains
        .get(domainId)
        .recommendations.push(
          recommendation
        );
    }
  );

  return Array.from(
    domains.values()
  )
    .map((domain) => {
      const ordered =
        [...domain.recommendations].sort(
          (first, second) => {
            const priorityDifference =
              (
                PRIORITY_ORDER[
                  first.priority
                ] ?? 99
              ) -
              (
                PRIORITY_ORDER[
                  second.priority
                ] ?? 99
              );

            if (
              priorityDifference !== 0
            ) {
              return priorityDifference;
            }

            return (
              first.recommendationIndex -
              second.recommendationIndex
            );
          }
        );

      const priorityRecommendations =
        ordered.filter(
          (item) =>
            [
              'critical',
              'high',
              'moderate',
            ].includes(
              item.priority
            )
        );

      const strengths =
        ordered.filter(
          (item) =>
            item.priority ===
            'strength'
        );

      const domainAverage =
        ordered.length > 0
          ? roundValue(
              ordered.reduce(
                (sum, item) =>
                  sum +
                  item.recommendationIndex,
                0
              ) /
                ordered.length,
              1
            )
          : null;

      return {
        ...domain,
        recommendations:
          ordered,
        priorityRecommendations,
        strengths,
        criteriaCount:
          ordered.length,
        averagePercentage:
          domainAverage,
      };
    })
    .sort(
      (first, second) =>
        (
          first.averagePercentage ??
          100
        ) -
        (
          second.averagePercentage ??
          100
        )
    );
};

/**
 * Função principal do motor.
 *
 * Recebe as avaliações completas do atleta e devolve:
 * - recomendações por critério;
 * - prioridades;
 * - pontos fortes;
 * - síntese por domínio;
 * - recomendação principal.
 */

// ============================================================
// Intelligent Development Index by Competency
// Sprint C3.5B.4A
// ============================================================

export function buildCompetencyIDI(
  recommendations = []
) {
  const groups = new Map();

  recommendations.forEach(
    (recommendation) => {
      const key =
        recommendation.subdomainId ||
        recommendation.domainId ||
        'general';

      if (!groups.has(key)) {
        groups.set(key, {
          id: key,

          name:
            recommendation.subdomainLabel ||
            recommendation.domainLabel ||
            'Competência',

          domainId:
            recommendation.domainId ||
            'other',

          domainName:
            recommendation.domainLabel ||
            'Outro',

          recommendations: [],
        });
      }

      groups
        .get(key)
        .recommendations.push(
          recommendation
        );
    }
  );

  return Array.from(
    groups.values()
  )
    .map((group) => {
      const idiScores =
        group.recommendations
          .map(
            (item) =>
              Number(
                item.idiScore
              )
          )
          .filter(
            Number.isFinite
          );

      const averageIDI =
        idiScores.length > 0
          ? roundValue(
              idiScores.reduce(
                (sum, value) =>
                  sum + value,
                0
              ) /
                idiScores.length,
              1
            )
          : null;

      const strengths =
        group.recommendations.filter(
          (item) =>
            item.priority ===
            'strength'
        ).length;

      const critical =
        group.recommendations.filter(
          (item) =>
            item.priority ===
            'critical'
        ).length;

      const high =
        group.recommendations.filter(
          (item) =>
            item.priority ===
            'high'
        ).length;

      const moderate =
        group.recommendations.filter(
          (item) =>
            item.priority ===
            'moderate'
        ).length;

      const consolidation =
        group.recommendations.filter(
          (item) =>
            item.priority ===
            'consolidation'
        ).length;

      let status =
        'unknown';

      let statusLabel =
        'Sem dados suficientes';

      if (
        Number.isFinite(
          averageIDI
        )
      ) {
        if (averageIDI < 35) {
          status =
            'critical';

          statusLabel =
            'Desenvolvimento prioritário';
        } else if (
          averageIDI < 55
        ) {
          status =
            'attention';

          statusLabel =
            'Necessita de atenção';
        } else if (
          averageIDI < 75
        ) {
          status =
            'progressing';

          statusLabel =
            'Em desenvolvimento';
        } else if (
          averageIDI < 90
        ) {
          status =
            'expected';

          statusLabel =
            'Dentro do esperado';
        } else {
          status =
            'advanced';

          statusLabel =
            'Desempenho avançado';
        }
      }

      return {
        id: group.id,

        name: group.name,

        domainId:
          group.domainId,

        domainName:
          group.domainName,

        idiScore:
          averageIDI,

        status,

        statusLabel,

        recommendationCount:
          group.recommendations
            .length,

        strengths,

        critical,

        high,

        moderate,

        consolidation,

        recommendations:
          group.recommendations,
      };
    })
    .sort(
      (first, second) => {
        const firstScore =
          Number(
            first.idiScore
          );

        const secondScore =
          Number(
            second.idiScore
          );

        if (
          Number.isFinite(
            firstScore
          ) &&
          Number.isFinite(
            secondScore
          )
        ) {
          return (
            firstScore -
            secondScore
          );
        }

        if (
          Number.isFinite(
            firstScore
          )
        ) {
          return -1;
        }

        if (
          Number.isFinite(
            secondScore
          )
        ) {
          return 1;
        }

        return first.name.localeCompare(
          second.name
        );
      }
    );
}


/**
 * Função principal do motor.
 *
 * Recebe as avaliações completas do atleta e devolve:
 * - recomendações por critério;
 * - prioridades;
 * - pontos fortes;
 * - síntese por domínio;
 * - IDI por competência;
 * - recomendação principal.
 */
export function buildAutomaticDevelopmentRecommendations({
  evaluations = [],
  criteria = [],
  teamId = null,
  ageGroup = null,
  playerType = null,
  maximumRecommendations = 12,
} = {}) {
  const normalizedScores =
    normalizeEvaluationScores({
      evaluations,
      criteria,
      teamId,
      ageGroup,
      playerType,
    });

  const criterionGroups =
    groupScoresByCriterion(
      normalizedScores
    );

  const allRecommendations =
    criterionGroups
      .map(
        buildCriterionRecommendation
      )
      .filter(Boolean)
      .sort(
        (first, second) => {
          const priorityDifference =
            (
              PRIORITY_ORDER[
                first.priority
              ] ?? 99
            ) -
            (
              PRIORITY_ORDER[
                second.priority
              ] ?? 99
            );

          if (
            priorityDifference !== 0
          ) {
            return priorityDifference;
          }

          if (
            first.usesExpectedLevel &&
            second.usesExpectedLevel
          ) {
            const firstDistance =
              first.expectedStatus ===
              'below_expected'
                ? Number(
                    first.expectedDistance
                  ) || 0
                : 0;

            const secondDistance =
              second.expectedStatus ===
              'below_expected'
                ? Number(
                    second.expectedDistance
                  ) || 0
                : 0;

            if (
              firstDistance !==
              secondDistance
            ) {
              return (
                secondDistance -
                firstDistance
              );
            }
          }

          const firstIdi =
            Number(
              first.idiScore
            );

          const secondIdi =
            Number(
              second.idiScore
            );

          if (
            Number.isFinite(
              firstIdi
            ) &&
            Number.isFinite(
              secondIdi
            ) &&
            firstIdi !==
              secondIdi
          ) {
            return (
              firstIdi -
              secondIdi
            );
          }

          return (
            first.recommendationIndex -
            second.recommendationIndex
          );
        }
      );

  const priorities =
    allRecommendations.filter(
      (recommendation) =>
        [
          'critical',
          'high',
          'moderate',
        ].includes(
          recommendation.priority
        )
    );

  const consolidation =
    allRecommendations.filter(
      (recommendation) =>
        recommendation.priority ===
        'consolidation'
    );

  const strengths =
    allRecommendations.filter(
      (recommendation) =>
        recommendation.priority ===
        'strength'
    );

  const recommendationsWithExpectedLevel =
    allRecommendations.filter(
      (recommendation) =>
        recommendation
          .usesExpectedLevel ===
        true
    );

  const recommendationsBelowExpected =
    allRecommendations.filter(
      (recommendation) =>
        recommendation
          .expectedStatus ===
        'below_expected'
    );

  const recommendationsWithinExpected =
    allRecommendations.filter(
      (recommendation) =>
        recommendation
          .expectedStatus ===
        'within_expected'
    );

  const recommendationsAboveExpected =
    allRecommendations.filter(
      (recommendation) =>
        recommendation
          .expectedStatus ===
        'above_expected'
    );

  const visibleRecommendations =
    allRecommendations.slice(
      0,
      Math.max(
        1,
        Number(
          maximumRecommendations
        ) || 12
      )
    );

  const domains =
    groupRecommendationsByDomain(
      allRecommendations
    );

  const competencyIDI =
    buildCompetencyIDI(
      allRecommendations
    );

  return {
    hasData:
      allRecommendations.length > 0,

    generatedAt:
      new Date().toISOString(),

    source:
      recommendationsWithExpectedLevel
        .length > 0
        ? 'expected_level_rule_engine'
        : 'automatic_rule_engine',

    evaluationCount:
      evaluations.length,

    scoredEntryCount:
      normalizedScores.length,

    recommendationCount:
      allRecommendations.length,

    priorityCount:
      priorities.length,

    strengthCount:
      strengths.length,

    expectedLevelCount:
      recommendationsWithExpectedLevel
        .length,

    belowExpectedCount:
      recommendationsBelowExpected
        .length,

    withinExpectedCount:
      recommendationsWithinExpected
        .length,

    aboveExpectedCount:
      recommendationsAboveExpected
        .length,

    competencyCount:
      competencyIDI.length,

    recommendations:
      visibleRecommendations,

    allRecommendations,

    priorities,

    consolidation,

    strengths,

    recommendationsWithExpectedLevel,

    recommendationsBelowExpected,

    recommendationsWithinExpected,

    recommendationsAboveExpected,

    domains,

    competencyIDI,

    primaryRecommendation:
      priorities[0] ||
      recommendationsBelowExpected[0] ||
      consolidation[0] ||
      strengths[0] ||
      null,
  };
}

export function getDevelopmentPriorityConfig(
  priority
) {
  return (
    DEVELOPMENT_PRIORITY_CONFIG[
      priority
    ] ||
    DEVELOPMENT_PRIORITY_CONFIG
      .moderate
  );
}

export function formatRecommendationTrend(
  trend = {}
) {
  if (
    trend.direction ===
    'improving'
  ) {
    return `A melhorar +${Math.abs(
      trend.difference || 0
    ).toFixed(1)}%`;
  }

  if (
    trend.direction ===
    'declining'
  ) {
    return `Em redução -${Math.abs(
      trend.difference || 0
    ).toFixed(1)}%`;
  }

  return 'Tendência estável';
}

export function searchDevelopmentRecommendations(
  recommendations = [],
  query = ''
) {
  const normalizedQuery =
    normalizeText(query);

  if (!normalizedQuery) {
    return recommendations;
  }

  return recommendations.filter(
    (recommendation) =>
      normalizeText(
        [
          recommendation
            .criterionName,
          recommendation
            .criterionCode,
          recommendation
            .domainLabel,
          recommendation
            .subdomainLabel,
          recommendation
            .objective,
          recommendation
            .coachMessage,
        ]
          .filter(Boolean)
          .join(' ')
      ).includes(
        normalizedQuery
      )
  );
}
