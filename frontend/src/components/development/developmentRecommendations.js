import {
  resolveAndCompareExpectedLevel,
} from './expectedLevelResolver';

// ============================================================
// StickPro Development Recommendations
// Sprint C3.5B.1A
// ============================================================

const DEFAULT_SCALE_MIN = 1;
const DEFAULT_SCALE_MAX = 5;

/*************************************************************************
 * DISPLAY LABEL NORMALIZATION
 * Sprint C3.5.2A
 *
 * Evita usar /\b\w/g porque os limites de palavra do JavaScript
 * não tratam corretamente caracteres portugueses acentuados.
 *************************************************************************/

const formatDevelopmentLabel = (
  value
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  const text =
    String(value)
      .trim()
      .replace(
        /_/g,
        ' '
      )
      .replace(
        /\s+/g,
        ' '
      );

  if (!text) {
    return '';
  }

  return (
    text
      .charAt(0)
      .toLocaleUpperCase(
        'pt-PT'
      ) +
    text.slice(1)
  );
};

/*************************************************************************
 * DOMAIN NORMALIZATION
 * Sprint C3.5.1
 *************************************************************************/

const DOMAIN_LABELS = {
  technical: 'Técnica Individual',
  tactical: 'Tática',
  physical: 'Físico',
  psychological: 'Psicológico',
  attitude: 'Atitude',

  skating: 'Patinagem',
  technique: 'Técnica Individual',
  goalkeeper: 'Guarda-Redes',

  general: 'Competências Gerais',
  other: 'Competências Gerais',
  default: 'Competências Gerais',
  misc: 'Competências Gerais',
};

export function normalizeDomainLabel(domain) {
  if (!domain) {
    return 'Competências Gerais';
  }

  const key = String(domain)
    .trim()
    .toLowerCase();

  return (
    DOMAIN_LABELS[key] ||
    formatDevelopmentLabel(
      domain
    )
  );
}

/*************************************************************************
 * COMPETENCY NORMALIZATION
 * Sprint C3.5.2
 *************************************************************************/

const COMPETENCY_LABELS = {
  general: 'Competência Geral',
  other: 'Competência Geral',
  default: 'Competência Geral',
  misc: 'Competência Geral',
};

export function normalizeCompetencyLabel(
  competency
) {
  if (!competency) {
    return 'Competência Geral';
  }

  const value =
    String(competency).trim();

  const key =
    value.toLowerCase();

  return (
    COMPETENCY_LABELS[key] ||
    formatDevelopmentLabel(
      value
    )
  );
}
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
  normalizeDomainLabel(
    entry?.domain_label ||
    entry?.domainLabel ||
    entry?.criterion?.domain_label ||
    entry?.criterion?.domainLabel ||
    getDomainId(entry)
  );

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
  normalizeCompetencyLabel(
    entry?.subdomain_label ||
    entry?.subdomainLabel ||
    entry?.criterion?.subdomain_label ||
    entry?.criterion?.subdomainLabel ||
    getSubdomainId(entry)
  );

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
  ).forEach((criterion) => {
    if (!criterion) {
      return;
    }

    const criterionId =
      criterion?.id ||
      criterion?.criterion_id ||
      criterion?.criterionId ||
      null;

    const criterionCode =
      criterion?.code ||
      criterion?.criterion_code ||
      criterion?.criterionCode ||
      criterion?.sourceCode ||
      criterion?.source_code ||
      null;

    /*
     * O código StickPro é a identidade funcional/canónica
     * do critério.
     *
     * O UUID continua registado apenas para compatibilidade
     * com avaliações e registos históricos.
     */

    if (criterionCode) {
      map.set(
        String(criterionCode)
          .trim()
          .toUpperCase(),
        criterion
      );
    }

    if (criterionId) {
      map.set(
        String(criterionId)
          .trim(),
        criterion
      );
    }
  });

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
    buildCriteriaMap(criteria);

  (
    Array.isArray(evaluations)
      ? evaluations
      : []
  ).forEach((evaluation) => {
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

    const scores =
      Array.isArray(evaluation?.scores)
        ? evaluation.scores
        : [];

    scores.forEach((scoreEntry) => {
      const score =
        getScoreValue(scoreEntry);

      if (score === null) {
        return;
      }

      const rawCriterionId =
        getCriterionId(scoreEntry);

      const rawCriterionCode =
        getCriterionCode(scoreEntry);

      /*
       * Primeiro tentamos localizar o critério oficial
       * através do código StickPro.
       *
       * O UUID é apenas fallback para dados históricos.
       */

      const normalizedCode =
        rawCriterionCode
          ? String(rawCriterionCode)
              .trim()
              .toUpperCase()
          : null;

      const normalizedId =
        rawCriterionId
          ? String(rawCriterionId)
              .trim()
          : null;

      const externalCriterion =
        (
          normalizedCode
            ? criteriaMap.get(
                normalizedCode
              )
            : null
        ) ||
        (
          normalizedId
            ? criteriaMap.get(
                normalizedId
              )
            : null
        ) ||
        null;

      /*
       * Depois de localizar o critério oficial,
       * voltamos a resolver ID e código.
       *
       * Isto permite que avaliações históricas que
       * guardaram apenas UUID sejam reconciliadas com
       * o código oficial atual.
       */

      const resolvedCriterionId =
        externalCriterion?.id ||
        externalCriterion?.criterion_id ||
        externalCriterion?.criterionId ||
        rawCriterionId ||
        null;

      const resolvedCriterionCode =
        externalCriterion?.code ||
        externalCriterion?.criterion_code ||
        externalCriterion?.criterionCode ||
        externalCriterion?.sourceCode ||
        externalCriterion?.source_code ||
        rawCriterionCode ||
        null;

      const canonicalCode =
        resolvedCriterionCode
          ? String(resolvedCriterionCode)
              .trim()
              .toUpperCase()
          : null;

      /*
       * REGRA CANÓNICA:
       *
       * 1. código StickPro
       * 2. UUID apenas quando não existe código
       */

      const criterionKey =
        canonicalCode ||
        (
          resolvedCriterionId
            ? String(
                resolvedCriterionId
              ).trim()
            : null
        );

      if (!criterionKey) {
        return;
      }

      const enrichedScoreEntry = {
        ...(externalCriterion || {}),
        ...scoreEntry,

        /*
         * Forçamos os identificadores resolvidos para
         * impedir que um UUID histórico volte a dominar
         * a identidade do critério.
         */
        criterion_id:
          resolvedCriterionId,

        criterion_code:
          canonicalCode,

        code:
          canonicalCode ||
          externalCriterion?.code ||
          scoreEntry?.code ||
          null,

        criterion: {
          ...(externalCriterion || {}),
          ...(scoreEntry?.criterion || {}),

          id:
            resolvedCriterionId,

          code:
            canonicalCode ||
            externalCriterion?.code ||
            scoreEntry?.criterion?.code ||
            null,
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

        criterionId:
          resolvedCriterionId,

        criterionCode:
          canonicalCode,

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
    });
  });

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
            normalizeDomainLabel(
              scoreEntry.domainLabel ||
              scoreEntry.domain ||
              scoreEntry.category
            ),

          subdomainId:
            scoreEntry.subdomainId ||
            'general',

          subdomainLabel:
            normalizeCompetencyLabel(
              scoreEntry.subdomainLabel ||
              scoreEntry.subdomainId ||
              'general'
            ),

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

  /*
   * CLASSIFICAÇÃO DO CRITÉRIO
   *
   * 1 avaliação:
   *   utiliza diretamente o nível atual como baseline.
   *
   * 2+ avaliações:
   *   utiliza IDI, incorporando nível, tendência
   *   e consistência.
   */
  const hasLongitudinalEvidence =
    group.entries.length >= 2;
  
  let priority = null;
  
  if (!hasLongitudinalEvidence) {
    const latestScore =
      Number(
        latestEntry?.score
      );
  
    const scaleMin =
      Number(
        latestEntry?.scaleMin ??
        DEFAULT_SCALE_MIN
      );
  
    const scaleMax =
      Number(
        latestEntry?.scaleMax ??
        DEFAULT_SCALE_MAX
      );
  
    const normalizedBaseline =
      normalizeScorePercentage({
        score:
          latestScore,
  
        scaleMin,
  
        scaleMax,
      });
  
    if (
      normalizedBaseline === null
    ) {
      priority = null;
    } else if (
      normalizedBaseline < 25
    ) {
      priority = 'critical';
    } else if (
      normalizedBaseline < 50
    ) {
      priority = 'high';
    } else if (
      normalizedBaseline < 75
    ) {
      priority = 'moderate';
    } else if (
      normalizedBaseline < 100
    ) {
      priority = 'consolidation';
    } else {
      priority = 'strength';
    }
  } else {
    priority =
      resolvePriority({
        idiScore:
          intelligentDevelopmentIndex.score,
  
        expectedComparison,
  
        recommendationIndex,
      });
  }

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
      normalizeDomainLabel(
        group.domainLabel
      ),

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
// Current Transversal Development Profile
// C3.6 — Longitudinal Development Radar
//
// PRINCÍPIO:
// Para cada critério utiliza o resultado mais recente
// disponível em todo o histórico do atleta.
//
// Uma avaliação parcial ou uma reavaliação PID atualiza
// apenas os critérios efetivamente reavaliados.
// Os restantes mantêm o último resultado conhecido.
//
// Este perfil NÃO utiliza o IDI.
// Representa o estado transversal atual do atleta.
// ============================================================

export function buildCurrentDevelopmentProfile({
  evaluations = [],
  criteria = [],
  teamId = null,
  ageGroup = null,
  playerType = null,
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

  /*
   * Um único estado atual por critério:
   * o resultado cronologicamente mais recente.
   */
  const currentCriteria =
    criterionGroups
      .map((group) => {
        const orderedEntries =
          [...group.entries].sort(
            (first, second) => {
              const firstTime =
                first?.evaluationDate
                  ? new Date(
                      first.evaluationDate
                    ).getTime()
                  : 0;

              const secondTime =
                second?.evaluationDate
                  ? new Date(
                      second.evaluationDate
                    ).getTime()
                  : 0;

              return (
                secondTime -
                firstTime
              );
            }
          );

        const latestEntry =
          orderedEntries[0] ||
          null;

        if (!latestEntry) {
          return null;
        }

        const normalizedPercentage =
          asFiniteNumber(
            latestEntry
              ?.normalizedPercentage
          );

        if (
          normalizedPercentage ===
          null
        ) {
          return null;
        }

        return {
          criterionKey:
            group.criterionKey,

          criterionId:
            group.criterionId,

          criterionCode:
            group.criterionCode,

          criterionName:
            group.criterionName,

          domainId:
            group.domainId ||
            latestEntry.domainId ||
            'other',

          domainLabel:
            normalizeDomainLabel(
              group.domainLabel ||
              latestEntry.domainLabel ||
              group.domainId
            ),

          subdomainId:
            group.subdomainId ||
            latestEntry.subdomainId ||
            'general',

          subdomainLabel:
            normalizeCompetencyLabel(
              group.subdomainLabel ||
              latestEntry.subdomainLabel ||
              group.subdomainId
            ),

          score:
            latestEntry.score,

          scaleMin:
            latestEntry.scaleMin,

          scaleMax:
            latestEntry.scaleMax,

          normalizedPercentage,

          latestEvaluationDate:
            latestEntry
              .evaluationDate ||
            null,

          latestEvaluationId:
            latestEntry
              .evaluationId ||
            null,

          evaluationCount:
            group.entries.length,
        };
      })
      .filter(Boolean);

  /*
   * ----------------------------------------------------------
   * Perfil por domínio
   * ----------------------------------------------------------
   *
   * Cada domínio é calculado pela média dos últimos resultados
   * conhecidos dos critérios que pertencem a esse domínio.
   */
  const domainGroups =
    new Map();

  currentCriteria.forEach(
    (criterion) => {
      const domainId =
        criterion.domainId ||
        'other';

      if (
        !domainGroups.has(
          domainId
        )
      ) {
        domainGroups.set(
          domainId,
          {
            id: domainId,

            label:
              criterion.domainLabel ||
              normalizeDomainLabel(
                domainId
              ),

            criteria: [],
          }
        );
      }

      domainGroups
        .get(domainId)
        .criteria.push(
          criterion
        );
    }
  );

  const domains =
    Array.from(
      domainGroups.values()
    ).map((domain) => {
      const values =
        domain.criteria
          .map(
            (criterion) =>
              asFiniteNumber(
                criterion
                  .normalizedPercentage
              )
          )
          .filter(
            (value) =>
              value !== null
          );

      const value =
        values.length > 0
          ? roundValue(
              values.reduce(
                (sum, item) =>
                  sum + item,
                0
              ) /
                values.length,
              1
            )
          : null;

      return {
        id:
          domain.id,

        key:
          domain.id,

        label:
          domain.label,

        value,

        score:
          value,

        criterionCount:
          values.length,

        criteria:
          domain.criteria,
      };
    });

  /*
   * ----------------------------------------------------------
   * Perfil por subdomínio
   * ----------------------------------------------------------
   *
   * Necessário sobretudo para o Radar específico
   * dos guarda-redes.
   */
  const subdomainGroups =
    new Map();

  currentCriteria.forEach(
    (criterion) => {
      const subdomainId =
        criterion.subdomainId ||
        'general';

      if (
        !subdomainGroups.has(
          subdomainId
        )
      ) {
        subdomainGroups.set(
          subdomainId,
          {
            id:
              subdomainId,

            label:
              criterion
                .subdomainLabel ||
              normalizeCompetencyLabel(
                subdomainId
              ),

            domainId:
              criterion.domainId ||
              'other',

            criteria: [],
          }
        );
      }

      subdomainGroups
        .get(subdomainId)
        .criteria.push(
          criterion
        );
    }
  );

  const subdomains =
    Array.from(
      subdomainGroups.values()
    ).map((subdomain) => {
      const values =
        subdomain.criteria
          .map(
            (criterion) =>
              asFiniteNumber(
                criterion
                  .normalizedPercentage
              )
          )
          .filter(
            (value) =>
              value !== null
          );

      const value =
        values.length > 0
          ? roundValue(
              values.reduce(
                (sum, item) =>
                  sum + item,
                0
              ) /
                values.length,
              1
            )
          : null;

      return {
        id:
          subdomain.id,

        key:
          subdomain.id,

        label:
          subdomain.label,

        domainId:
          subdomain.domainId,

        value,

        score:
          value,

        criterionCount:
          values.length,

        criteria:
          subdomain.criteria,
      };
    });

  return {
    hasData:
      currentCriteria.length > 0,

    criterionCount:
      currentCriteria.length,

    domainCount:
      domains.length,

    subdomainCount:
      subdomains.length,

    criteria:
      currentCriteria,

    domains,

    subdomains,

    source:
      'latest_known_score_per_criterion',

    generatedAt:
      new Date().toISOString(),
  };
}

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
            normalizeCompetencyLabel(
              recommendation.subdomainLabel ||
              recommendation.subdomainId ||
              'general'
            ),
        
          domainId:
            recommendation.domainId ||
            'other',
        
          domainName:
            normalizeDomainLabel(
              recommendation.domainLabel ||
              recommendation.domainId
            ),
        
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
          normalizeDomainLabel(
            group.domainName ||
            group.domainLabel
          ),

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

// ============================================================
// Intelligent Development Index by Domain
// Sprint C3.5B.4D
// ============================================================

export function buildDomainIDI(
  competencyIDI = []
) {
  const groups = new Map();

  (
    Array.isArray(
      competencyIDI
    )
      ? competencyIDI
      : []
  ).forEach(
    (competency) => {
      const idiScore =
        Number(
          competency?.idiScore
        );

      if (
        !Number.isFinite(
          idiScore
        )
      ) {
        return;
      }

      const domainId =
        competency?.domainId ||
        'other';

      const domainName =
        normalizeDomainLabel(
          competency?.domainName ||
          competency?.domainLabel ||
          competency?.domainId
        );

      if (
        !groups.has(
          domainId
        )
      ) {
        groups.set(
          domainId,
          {
            id:
              domainId,

            name:
              domainName,

            competencies: [],
          }
        );
      }

      groups
        .get(domainId)
        .competencies
        .push(
          competency
        );
    }
  );

  return Array.from(
    groups.values()
  )
    .map((group) => {
      let weightedTotal = 0;
      let totalWeight = 0;

      let criterionCount = 0;
      let critical = 0;
      let high = 0;
      let moderate = 0;
      let consolidation = 0;
      let strengths = 0;

      group.competencies.forEach(
        (competency) => {
          const score =
            Number(
              competency.idiScore
            );

          if (
            !Number.isFinite(
              score
            )
          ) {
            return;
          }

          /*
           * A competência é ponderada pelo
           * número de critérios que contém.
           */
          const weight =
            Math.max(
              1,
              Number(
                competency
                  .recommendationCount
              ) || 0
            );

          weightedTotal +=
            score * weight;

          totalWeight +=
            weight;

          criterionCount +=
            weight;

          critical +=
            Number(
              competency.critical
            ) || 0;

          high +=
            Number(
              competency.high
            ) || 0;

          moderate +=
            Number(
              competency.moderate
            ) || 0;

          consolidation +=
            Number(
              competency
                .consolidation
            ) || 0;

          strengths +=
            Number(
              competency.strengths
            ) || 0;
        }
      );

      const idiScore =
        totalWeight > 0
          ? roundValue(
              weightedTotal /
                totalWeight,
              1
            )
          : null;

      const status =
        resolveIdiStatus(
          idiScore
        );

      const orderedCompetencies =
        [
          ...group.competencies,
        ].sort(
          (
            first,
            second
          ) => {
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

            return 0;
          }
        );

      return {
        id:
          group.id,

        name:
          group.name,

        idiScore,

        status:
          status.id,

        statusLabel:
          status.label,

        competencyCount:
          orderedCompetencies
            .length,

        criterionCount,

        critical,

        high,

        moderate,

        consolidation,

        strengths,

        priorityCompetency:
          orderedCompetencies[0] ||
          null,

        strongestCompetency:
          orderedCompetencies[
            orderedCompetencies.length -
              1
          ] ||
          null,

        competencies:
          orderedCompetencies,

        weightingMethod:
          'criterion_count',
      };
    })
    .sort(
      (
        first,
        second
      ) => {
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


// ============================================================
// Global Intelligent Development Index
// Sprint C3.5B.4D
// ============================================================

export function buildGlobalIDI(
  domainIDI = []
) {
  const validDomains =
    (
      Array.isArray(
        domainIDI
      )
        ? domainIDI
        : []
    ).filter(
      (domain) =>
        Number.isFinite(
          Number(
            domain?.idiScore
          )
        )
    );

  if (
    validDomains.length === 0
  ) {
    return {
      idiScore:
        null,

      status:
        'unknown',

      statusLabel:
        'Sem dados suficientes',

      domainCount: 0,

      competencyCount: 0,

      criterionCount: 0,

      priorityDomain:
        null,

      strongestDomain:
        null,

      domains: [],

      weightingMethod:
        'criterion_count',
    };
  }

  let weightedTotal = 0;
  let totalWeight = 0;

  let competencyCount = 0;
  let criterionCount = 0;

  validDomains.forEach(
    (domain) => {
      const score =
        Number(
          domain.idiScore
        );

      /*
       * Cada domínio é ponderado pelo total
       * de critérios válidos que representa.
       */
      const weight =
        Math.max(
          1,
          Number(
            domain.criterionCount
          ) || 0
        );

      weightedTotal +=
        score * weight;

      totalWeight +=
        weight;

      competencyCount +=
        Number(
          domain.competencyCount
        ) || 0;

      criterionCount +=
        Number(
          domain.criterionCount
        ) || 0;
    }
  );

  const idiScore =
    totalWeight > 0
      ? roundValue(
          weightedTotal /
            totalWeight,
          1
        )
      : null;

  const status =
    resolveIdiStatus(
      idiScore
    );

  const orderedDomains =
    [...validDomains].sort(
      (
        first,
        second
      ) =>
        Number(
          first.idiScore
        ) -
        Number(
          second.idiScore
        )
    );

  return {
    idiScore,

    status:
      status.id,

    statusLabel:
      status.label,

    domainCount:
      orderedDomains.length,

    competencyCount,

    criterionCount,

    priorityDomain:
      orderedDomains[0] ||
      null,

    strongestDomain:
      orderedDomains[
        orderedDomains.length -
          1
      ] ||
      null,

    domains:
      orderedDomains,

    weightingMethod:
      'criterion_count',

    generatedAt:
      new Date().toISOString(),
  };
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
  
  const domainIDI =
    buildDomainIDI(
      competencyIDI
    );
  
  const globalIDI =
    buildGlobalIDI(
      domainIDI
    );
  
  /*************************************************************************
   * OFFICIAL RADAR EXPORT
   * Sprint C3.5B.5A
   *************************************************************************/
  
  const radarData = (competencyIDI || [])
    .filter(
      (item) =>
        Number.isFinite(
          Number(item?.idiScore)
        )
    )
    .map((item) => ({
      id: item.id,
  
      competencyId: item.id,
  
      competencyName: item.name,
  
      label:
        item.shortName ||
        item.name,
  
      domainId:
        item.domainId,
  
      domainLabel:
        normalizeDomainLabel(
          item.domainName ||
          item.domainLabel ||
          item.domain ||
          item.category
        ),
  
      idiScore:
        Number(item.idiScore),
  
      value:
        Number(item.idiScore),
  
      status:
        item.status,
  
      statusLabel:
        item.statusLabel,
  
      recommendationCount:
        item.recommendationCount,
    }))
    .sort(
      (a, b) =>
        String(
          a.domainLabel || ''
        ).localeCompare(
          String(
            b.domainLabel || ''
          ),
          'pt-PT'
        ) ||
        String(
          a.label || ''
        ).localeCompare(
          String(
            b.label || ''
          ),
          'pt-PT'
        )
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
    
    domainCount:
      domainIDI.length,
    
    globalIdiScore:
      globalIDI.idiScore,
    
    globalIdiStatus:
      globalIDI.status,
    
    globalIdiStatusLabel:
      globalIDI.statusLabel,

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

    /*
     * Estrutura histórica por domínio.
     * Mantida temporariamente por compatibilidade.
     */
    domains,
    
    /*
     * Nova arquitetura oficial IDI.
     */
    competencyIDI,
    
    domainIDI,
    
    globalIDI,
    
    primaryCompetency:
      competencyIDI[0] ||
      null,
    
    strongestCompetency:
      competencyIDI.length > 0
        ? competencyIDI[
            competencyIDI.length -
              1
          ]
        : null,
    
    primaryDomain:
      globalIDI.priorityDomain,
    
    strongestDomain:
      globalIDI.strongestDomain,

    dashboard: {
      globalIDI,
      competencyIDI,
      domainIDI,
    },
    
    radarData,
    
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

// ============================================================
// Official StickPro Development Radar
// C3.6 — PID Intelligent / Radar consolidation
// ============================================================

export function buildOfficialDevelopmentRadarData({
  developmentProfile = {},
  playerType = 'field_player',
} = {}) {
  const domains =
    Array.isArray(
      developmentProfile?.domains
    )
      ? developmentProfile.domains
      : [];

  const subdomains =
    Array.isArray(
      developmentProfile?.subdomains
    )
      ? developmentProfile.subdomains
      : [];

  const normalizedPlayerType =
    String(
      playerType || 'field_player'
    )
      .trim()
      .toLowerCase();

  const isGoalkeeper =
    [
      'goalkeeper',
      'guarda-redes',
      'guarda redes',
      'guarda_redes',
      'gk',
      'gr',
    ].includes(
      normalizedPlayerType
    );

  const findDomain = (
    domainId
  ) =>
    domains.find(
      (item) =>
        String(item?.id) ===
        String(domainId)
    ) || null;

  const findSubdomain = (
    subdomainId
  ) =>
    subdomains.find(
      (item) =>
        String(item?.id) ===
        String(subdomainId)
    ) || null;

  const buildAxis = ({
    id,
    label,
    source,
    sourceId,
  }) => {
    const sourceItem =
      source === 'domain'
        ? findDomain(sourceId)
        : findSubdomain(sourceId);

    const rawValue =
      sourceItem?.value;

    const numericValue =
      rawValue === null ||
      rawValue === undefined
        ? null
        : Number(rawValue);

    const hasData =
      numericValue !== null &&
      Number.isFinite(
        numericValue
      );

    return {
      id,

      key:
        id,

      label,

      value:
        hasData
          ? numericValue
          : null,

      hasData,

      source,

      sourceId,

      criterionCount:
        Number(
          sourceItem?.criterionCount
        ) || 0,
    };
  };

  /*
   * ========================================================
   * GUARDA-REDES
   * ========================================================
   *
   * Patinagem:
   * último resultado conhecido dos critérios do domínio
   * skating.
   *
   * Restantes dimensões:
   * último resultado conhecido dos critérios dos quatro
   * subdomínios específicos de guarda-redes.
   */
  if (isGoalkeeper) {
    return [
      buildAxis({
        id:
          'skating',

        label:
          'Patinagem',

        source:
          'domain',

        sourceId:
          'skating',
      }),

      buildAxis({
        id:
          'goalkeeper_positioning',

        label:
          'Posicionamento',

        source:
          'subdomain',

        sourceId:
          'goalkeeper_positioning',
      }),

      buildAxis({
        id:
          'goalkeeper_saving',

        label:
          'Defesa',

        source:
          'subdomain',

        sourceId:
          'goalkeeper_saving',
      }),

      buildAxis({
        id:
          'goalkeeper_movement',

        label:
          'Deslocamento',

        source:
          'subdomain',

        sourceId:
          'goalkeeper_movement',
      }),

      buildAxis({
        id:
          'goalkeeper_distribution',

        label:
          'Reposição e Construção',

        source:
          'subdomain',

        sourceId:
          'goalkeeper_distribution',
      }),
    ];
  }

  /*
   * ========================================================
   * JOGADOR DE CAMPO
   * ========================================================
   *
   * Cada eixo representa o estado transversal atual de um
   * domínio oficial StickPro.
   *
   * O valor de cada domínio resulta da média do último
   * resultado conhecido de cada critério desse domínio.
   */
  return [
    buildAxis({
      id:
        'skating',

      label:
        'Patinagem',

      source:
        'domain',

      sourceId:
        'skating',
    }),

    buildAxis({
      id:
        'individual_technique',

      label:
        'Técnica Individual',

      source:
        'domain',

      sourceId:
        'individual_technique',
    }),

    buildAxis({
      id:
        'perception',

      label:
        'Perceção de Jogo',

      source:
        'domain',

      sourceId:
        'perception',
    }),

    buildAxis({
      id:
        'decision',

      label:
        'Capacidade de Decisão',

      source:
        'domain',

      sourceId:
        'decision',
    }),

    buildAxis({
      id:
        'collective_play',

      label:
        'Jogo Coletivo',

      source:
        'domain',

      sourceId:
        'collective_play',
    }),

    buildAxis({
      id:
        'behavior',

      label:
        'Comportamento',

      source:
        'domain',

      sourceId:
        'behavior',
    }),
  ];
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
