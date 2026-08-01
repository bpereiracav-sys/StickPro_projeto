/**
 * ============================================================
 * StickPro Development Engine
 * ------------------------------------------------------------
 * Criteria Tree
 *
 * Sprint C3.4H.2.2 — Bloco A
 *
 * Responsabilidades deste bloco:
 * - importar a Biblioteca Oficial StickPro;
 * - normalizar identificadores;
 * - resolver critérios por código, ID ou nome;
 * - normalizar pontuações;
 * - definir a ordenação oficial;
 * - criar a estrutura base dos nós da árvore.
 * ============================================================
 */

import {
  DEVELOPMENT_CRITERIA_CATALOG,
  DEVELOPMENT_CRITERIA_BY_CODE,
  DEVELOPMENT_DOMAINS,
  DEVELOPMENT_DOMAIN_BY_ID,
  DEVELOPMENT_SUBDOMAINS,
  DEVELOPMENT_SUBDOMAIN_BY_ID,
  normalizeDevelopmentSearchText,
} from '../../data/developmentCriteriaCatalog';

/**
 * Valor mínimo e máximo da escala universal StickPro.
 */
export const DEVELOPMENT_SCORE_MIN = 1;
export const DEVELOPMENT_SCORE_MAX = 5;

/**
 * Identificadores utilizados quando um critério histórico
 * não pode ser associado à Biblioteca Oficial.
 */
export const UNKNOWN_DOMAIN_ID = 'other';
export const UNKNOWN_SUBDOMAIN_ID = 'other';

/**
 * Remove espaços e converte qualquer valor num identificador textual.
 */
export const normalizeDevelopmentIdentifier = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  return String(value).trim();
};

/**
 * Normaliza códigos oficiais de critérios.
 *
 * Exemplo:
 * " tec-bal-002 " -> "TEC-BAL-002"
 */
export const normalizeCriterionCode = (value) =>
  normalizeDevelopmentIdentifier(value).toUpperCase();

/**
 * Converte um valor numa pontuação numérica válida.
 *
 * Devolve null quando:
 * - o valor não é numérico;
 * - está fora da escala;
 * - não existe.
 */
export const normalizeDevelopmentScore = (
  value,
  {
    min = DEVELOPMENT_SCORE_MIN,
    max = DEVELOPMENT_SCORE_MAX,
    clamp = false,
  } = {}
) => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  if (clamp) {
    return Math.min(
      max,
      Math.max(min, numericValue)
    );
  }

  if (
    numericValue < min ||
    numericValue > max
  ) {
    return null;
  }

  return numericValue;
};

/**
 * Calcula a média de uma lista de valores numéricos.
 */
export const calculateDevelopmentAverage = (values = []) => {
  const validValues = values
    .map((value) => Number(value))
    .filter(Number.isFinite);

  if (validValues.length === 0) {
    return null;
  }

  return (
    validValues.reduce(
      (sum, value) => sum + value,
      0
    ) / validValues.length
  );
};

/**
 * Arredonda uma métrica, mantendo null quando não existem dados.
 */
export const roundDevelopmentMetric = (
  value,
  decimals = 2
) => {
  if (
    value === undefined ||
    value === null ||
    !Number.isFinite(Number(value))
  ) {
    return null;
  }

  const factor = 10 ** decimals;

  return (
    Math.round(
      Number(value) * factor
    ) / factor
  );
};

/**
 * Índice da ordem oficial dos critérios no catálogo.
 *
 * Permite preservar a sequência original da Biblioteca StickPro.
 */
export const DEVELOPMENT_CRITERION_ORDER_BY_CODE =
  DEVELOPMENT_CRITERIA_CATALOG.reduce(
    (accumulator, criterion, index) => {
      accumulator[criterion.code] = index + 1;
      return accumulator;
    },
    {}
  );

/**
 * Obtém todos os possíveis identificadores de um score.
 *
 * Os dados históricos podem utilizar campos diferentes:
 * - criterion_id
 * - criterionId
 * - criterion_code
 * - code
 * - id
 */
export const getCriterionIdentifiers = (entry = {}) => {
  const nestedCriterion =
    entry?.criterion &&
    typeof entry.criterion === 'object'
      ? entry.criterion
      : {};

  return {
    id:
      entry?.criterion_id ||
      entry?.criterionId ||
      entry?.id ||
      nestedCriterion?.id ||
      null,

    code: normalizeCriterionCode(
      entry?.criterion_code ||
        entry?.criterionCode ||
        entry?.code ||
        entry?.source_code ||
        entry?.sourceCode ||
        nestedCriterion?.code ||
        nestedCriterion?.source_code
    ),

    name:
      entry?.criterion_name ||
      entry?.criterionName ||
      entry?.name ||
      nestedCriterion?.name ||
      nestedCriterion?.observableAction ||
      null,
  };
};

/**
 * Procura um critério no catálogo pelo nome.
 *
 * Esta pesquisa é utilizada apenas como fallback para dados históricos
 * que não possuem código oficial.
 */
export const findDevelopmentCriterionByName = (name) => {
  const normalizedName =
    normalizeDevelopmentSearchText(name);

  if (!normalizedName) {
    return null;
  }

  return (
    DEVELOPMENT_CRITERIA_CATALOG.find(
      (criterion) =>
        normalizeDevelopmentSearchText(
          criterion.name
        ) === normalizedName ||
        normalizeDevelopmentSearchText(
          criterion.observableAction
        ) === normalizedName
    ) || null
  );
};

/**
 * Resolve um critério da Biblioteca Oficial.
 *
 * Prioridade:
 * 1. código oficial;
 * 2. identificador que corresponda ao código;
 * 3. nome oficial;
 * 4. null.
 */
export const resolveDevelopmentCriterion = (entry = {}) => {
  const identifiers =
    getCriterionIdentifiers(entry);

  if (
    identifiers.code &&
    DEVELOPMENT_CRITERIA_BY_CODE[
      identifiers.code
    ]
  ) {
    return DEVELOPMENT_CRITERIA_BY_CODE[
      identifiers.code
    ];
  }

  const normalizedId =
    normalizeCriterionCode(
      identifiers.id
    );

  if (
    normalizedId &&
    DEVELOPMENT_CRITERIA_BY_CODE[
      normalizedId
    ]
  ) {
    return DEVELOPMENT_CRITERIA_BY_CODE[
      normalizedId
    ];
  }

  if (identifiers.name) {
    return findDevelopmentCriterionByName(
      identifiers.name
    );
  }

  return null;
};

/**
 * Resolve a pontuação de uma entrada de avaliação.
 */
export const getCriterionEntryScore = (entry = {}) =>
  normalizeDevelopmentScore(
    entry?.score ??
      entry?.value ??
      entry?.rating ??
      entry?.result ??
      entry?.average_score ??
      entry?.averageScore
  );

/**
 * Resolve o peso associado a uma entrada.
 */
export const getCriterionEntryWeight = (
  entry = {},
  criterion = null
) => {
  const weight = Number(
    entry?.weight ??
      entry?.criterion_weight ??
      entry?.criterionWeight ??
      criterion?.defaultWeight ??
      1
  );

  return Number.isFinite(weight) && weight > 0
    ? weight
    : 1;
};

/**
 * Obtém a ordem oficial de um domínio.
 */
export const getDevelopmentDomainOrder = (domainId) =>
  DEVELOPMENT_DOMAIN_BY_ID[domainId]?.order ??
  Number.MAX_SAFE_INTEGER;

/**
 * Obtém a ordem oficial de um subdomínio.
 */
export const getDevelopmentSubdomainOrder = (
  subdomainId
) =>
  DEVELOPMENT_SUBDOMAIN_BY_ID[
    subdomainId
  ]?.order ?? Number.MAX_SAFE_INTEGER;

/**
 * Obtém a ordem oficial de um critério.
 */
export const getDevelopmentCriterionOrder = (
  criterionCode
) =>
  DEVELOPMENT_CRITERION_ORDER_BY_CODE[
    criterionCode
  ] ?? Number.MAX_SAFE_INTEGER;

/**
 * Compara dois domínios pela ordem oficial.
 */
export const compareDevelopmentDomains = (
  first,
  second
) =>
  getDevelopmentDomainOrder(
    first?.id || first?.domain
  ) -
  getDevelopmentDomainOrder(
    second?.id || second?.domain
  );

/**
 * Compara dois subdomínios pela ordem oficial.
 */
export const compareDevelopmentSubdomains = (
  first,
  second
) =>
  getDevelopmentSubdomainOrder(
    first?.id || first?.subdomain
  ) -
  getDevelopmentSubdomainOrder(
    second?.id || second?.subdomain
  );

/**
 * Compara dois critérios pela ordem oficial.
 */
export const compareDevelopmentCriteria = (
  first,
  second
) => {
  const firstOrder =
    getDevelopmentCriterionOrder(
      first?.code
    );

  const secondOrder =
    getDevelopmentCriterionOrder(
      second?.code
    );

  if (firstOrder !== secondOrder) {
    return firstOrder - secondOrder;
  }

  return String(
    first?.name || ''
  ).localeCompare(
    String(second?.name || ''),
    'pt-PT'
  );
};

/**
 * Cria um nó base de domínio.
 */
export const createDevelopmentDomainNode = (
  domainId
) => {
  const domain =
    DEVELOPMENT_DOMAIN_BY_ID[domainId];

  return {
    type: 'domain',
    id:
      domain?.id ||
      domainId ||
      UNKNOWN_DOMAIN_ID,
    code:
      domain?.code ||
      'OTHER',
    label:
      domain?.label ||
      'Outros critérios',
    order:
      domain?.order ??
      Number.MAX_SAFE_INTEGER,
    playerType:
      domain?.playerType ||
      'all',

    subdomains: [],

    metrics: {
      average: null,
      comparisonAverage: null,
      difference: null,
      scoreCount: 0,
      criterionCount: 0,
      evaluationCount: 0,
    },
  };
};

/**
 * Cria um nó base de subdomínio.
 */
export const createDevelopmentSubdomainNode = (
  subdomainId,
  domainId
) => {
  const subdomain =
    DEVELOPMENT_SUBDOMAIN_BY_ID[
      subdomainId
    ];

  return {
    type: 'subdomain',
    id:
      subdomain?.id ||
      subdomainId ||
      UNKNOWN_SUBDOMAIN_ID,
    label:
      subdomain?.label ||
      'Outros critérios',
    domain:
      subdomain?.domain ||
      domainId ||
      UNKNOWN_DOMAIN_ID,
    order:
      subdomain?.order ??
      Number.MAX_SAFE_INTEGER,

    criteria: [],

    metrics: {
      average: null,
      comparisonAverage: null,
      difference: null,
      scoreCount: 0,
      criterionCount: 0,
      evaluationCount: 0,
    },
  };
};

/**
 * Cria um nó base de critério.
 *
 * A estrutura já fica preparada para:
 * - atleta × equipa;
 * - última × anterior;
 * - histórico longitudinal;
 * - objetivos;
 * - futuro nível intermédio "competência".
 */
export const createDevelopmentCriterionNode = ({
  criterion,
  fallback = {},
} = {}) => {
  const resolvedCriterion =
    criterion || {};

  const code =
    normalizeCriterionCode(
      resolvedCriterion?.code ||
        fallback?.code
    );

  return {
    type: 'criterion',

    id:
      resolvedCriterion?.id ||
      fallback?.id ||
      code ||
      null,

    code,

    name:
      resolvedCriterion?.name ||
      fallback?.name ||
      'Critério sem identificação',

    observableAction:
      resolvedCriterion?.observableAction ||
      resolvedCriterion?.name ||
      fallback?.name ||
      'Critério sem identificação',

    description:
      resolvedCriterion?.description ||
      fallback?.description ||
      '',

    domain:
      resolvedCriterion?.domain ||
      fallback?.domain ||
      UNKNOWN_DOMAIN_ID,

    domainLabel:
      resolvedCriterion?.domainLabel ||
      DEVELOPMENT_DOMAIN_BY_ID[
        resolvedCriterion?.domain
      ]?.label ||
      fallback?.domainLabel ||
      'Outros critérios',

    subdomain:
      resolvedCriterion?.subdomain ||
      fallback?.subdomain ||
      UNKNOWN_SUBDOMAIN_ID,

    subdomainLabel:
      resolvedCriterion?.subdomainLabel ||
      DEVELOPMENT_SUBDOMAIN_BY_ID[
        resolvedCriterion?.subdomain
      ]?.label ||
      fallback?.subdomainLabel ||
      'Outros critérios',

    playerType:
      resolvedCriterion?.playerType ||
      fallback?.playerType ||
      'all',

    contexts:
      Array.isArray(
        resolvedCriterion?.contexts
      )
        ? resolvedCriterion.contexts
        : [],

    order:
      getDevelopmentCriterionOrder(code),

    /**
     * Campo reservado para o futuro nível:
     *
     * Domínio → Subdomínio → Competência → Critério
     */
    competency:
      resolvedCriterion?.competency ||
      fallback?.competency ||
      null,

    competencyLabel:
      resolvedCriterion?.competencyLabel ||
      fallback?.competencyLabel ||
      null,

    scores: [],
    comparisonScores: [],
    evaluations: [],

    metrics: {
      average: null,
      latestScore: null,
      previousScore: null,
      evolution: null,

      comparisonAverage: null,
      difference: null,

      scoreCount: 0,
      evaluationCount: 0,

      minimum: null,
      maximum: null,
    },
  };
};
/**
 * ============================================================
 * Sprint C3.4H.2.2 — Bloco B
 * ------------------------------------------------------------
 * Construção da árvore:
 *
 * Domínio
 *   → Subdomínio
 *       → Critério
 *
 * Este bloco:
 * - normaliza avaliações e respetivos scores;
 * - resolve os nomes através da Biblioteca Oficial;
 * - cria a árvore hierárquica;
 * - suporta dados principais e dados de comparação;
 * - preserva metadados para evolução, equipa, PID e dashboard.
 * ============================================================
 */

/**
 * Obtém o identificador de uma avaliação.
 */
export const getDevelopmentEvaluationId = (
  evaluation = {},
  fallbackIndex = null
) =>
  normalizeDevelopmentIdentifier(
    evaluation?.id ||
      evaluation?.evaluation_id ||
      evaluation?.evaluationId ||
      evaluation?._id ||
      (
        fallbackIndex !== null
          ? `evaluation-${fallbackIndex}`
          : ''
      )
  );

/**
 * Obtém a data principal de uma avaliação.
 */
export const getDevelopmentEvaluationDate = (
  evaluation = {}
) =>
  evaluation?.evaluation_date ||
  evaluation?.evaluationDate ||
  evaluation?.created_at ||
  evaluation?.createdAt ||
  evaluation?.date ||
  evaluation?.updated_at ||
  evaluation?.updatedAt ||
  null;

/**
 * Converte uma data num valor temporal seguro para ordenação.
 */
export const getDevelopmentEvaluationTimestamp = (
  evaluation = {}
) => {
  const rawDate =
    typeof evaluation === 'string'
      ? evaluation
      : getDevelopmentEvaluationDate(
          evaluation
        );

  if (!rawDate) {
    return 0;
  }

  const timestamp =
    new Date(rawDate).getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
};

/**
 * Obtém a lista de scores de uma avaliação.
 *
 * Suporta diferentes estruturas históricas:
 * - scores
 * - criteria_scores
 * - criterion_scores
 * - results
 * - values
 */
export const getDevelopmentEvaluationScores = (
  evaluation = {}
) => {
  const candidates = [
    evaluation?.scores,
    evaluation?.criteria_scores,
    evaluation?.criteriaScores,
    evaluation?.criterion_scores,
    evaluation?.criterionScores,
    evaluation?.results,
    evaluation?.values,
  ];

  const arrayCandidate =
    candidates.find(Array.isArray);

  if (arrayCandidate) {
    return arrayCandidate;
  }

  const objectCandidate =
    candidates.find(
      (candidate) =>
        candidate &&
        typeof candidate === 'object' &&
        !Array.isArray(candidate)
    );

  if (!objectCandidate) {
    return [];
  }

  return Object.entries(
    objectCandidate
  ).map(([key, value]) => {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      return {
        criterion_id:
          value?.criterion_id ||
          value?.criterionId ||
          value?.id ||
          key,

        criterion_code:
          value?.criterion_code ||
          value?.criterionCode ||
          value?.code ||
          key,

        ...value,
      };
    }

    return {
      criterion_id: key,
      criterion_code: key,
      score: value,
    };
  });
};

/**
 * Obtém os metadados relevantes de uma avaliação.
 *
 * Estes dados ficam associados a cada observação e serão usados
 * nos próximos blocos para evolução e comparações.
 */
export const getDevelopmentEvaluationMetadata = (
  evaluation = {},
  fallbackIndex = null
) => ({
  id:
    getDevelopmentEvaluationId(
      evaluation,
      fallbackIndex
    ),

  date:
    getDevelopmentEvaluationDate(
      evaluation
    ),

  timestamp:
    getDevelopmentEvaluationTimestamp(
      evaluation
    ),

  playerId:
    evaluation?.player_id ||
    evaluation?.playerId ||
    evaluation?.athlete_id ||
    evaluation?.athleteId ||
    null,

  teamId:
    evaluation?.team_id ||
    evaluation?.teamId ||
    null,

  planId:
    evaluation?.plan_id ||
    evaluation?.planId ||
    null,

  eventId:
    evaluation?.event_id ||
    evaluation?.eventId ||
    null,

  periodLabel:
    evaluation?.period_label ||
    evaluation?.periodLabel ||
    null,

  createdBy:
    evaluation?.created_by ||
    evaluation?.createdBy ||
    null,

  source:
    evaluation?.source ||
    null,

  visibility:
    evaluation?.visibility ||
    null,
});

/**
 * Normaliza uma entrada individual de score.
 *
 * O resultado já contém:
 * - código e nome oficial;
 * - domínio e subdomínio;
 * - pontuação;
 * - peso;
 * - metadados da avaliação.
 */
export const normalizeDevelopmentCriterionEntry = ({
  entry = {},
  evaluation = {},
  evaluationIndex = null,
  comparison = false,
} = {}) => {
  const officialCriterion =
    resolveDevelopmentCriterion(entry);

  const identifiers =
    getCriterionIdentifiers(entry);

  const score =
    getCriterionEntryScore(entry);

  if (score === null) {
    return null;
  }

  const fallbackDomain =
    entry?.domain ||
    entry?.category ||
    officialCriterion?.domain ||
    UNKNOWN_DOMAIN_ID;

  const fallbackSubdomain =
    entry?.subdomain ||
    entry?.subcategory ||
    officialCriterion?.subdomain ||
    UNKNOWN_SUBDOMAIN_ID;

  const fallback = {
    id:
      identifiers.id ||
      identifiers.code ||
      null,

    code:
      identifiers.code ||
      normalizeCriterionCode(
        identifiers.id
      ),

    name:
      identifiers.name ||
      null,

    description:
      entry?.description ||
      '',

    domain:
      fallbackDomain,

    domainLabel:
      entry?.domain_label ||
      entry?.domainLabel ||
      entry?.category_label ||
      entry?.categoryLabel ||
      DEVELOPMENT_DOMAIN_BY_ID[
        fallbackDomain
      ]?.label ||
      null,

    subdomain:
      fallbackSubdomain,

    subdomainLabel:
      entry?.subdomain_label ||
      entry?.subdomainLabel ||
      entry?.subcategory_label ||
      entry?.subcategoryLabel ||
      DEVELOPMENT_SUBDOMAIN_BY_ID[
        fallbackSubdomain
      ]?.label ||
      null,

    competency:
      entry?.competency ||
      entry?.competency_id ||
      entry?.competencyId ||
      null,

    competencyLabel:
      entry?.competency_label ||
      entry?.competencyLabel ||
      null,

    playerType:
      entry?.player_type ||
      entry?.playerType ||
      'all',
  };

  const criterionNode =
    createDevelopmentCriterionNode({
      criterion:
        officialCriterion,
      fallback,
    });

  return {
    ...criterionNode,

    score,

    weight:
      getCriterionEntryWeight(
        entry,
        officialCriterion
      ),

    comparison:
      Boolean(comparison),

    evaluation:
      getDevelopmentEvaluationMetadata(
        evaluation,
        evaluationIndex
      ),

    rawEntry:
      entry,

    isOfficial:
      Boolean(
        officialCriterion
      ),
  };
};

/**
 * Normaliza todos os scores de uma avaliação.
 */
export const normalizeDevelopmentEvaluation = ({
  evaluation = {},
  evaluationIndex = null,
  comparison = false,
} = {}) =>
  getDevelopmentEvaluationScores(
    evaluation
  )
    .map((entry) =>
      normalizeDevelopmentCriterionEntry({
        entry,
        evaluation,
        evaluationIndex,
        comparison,
      })
    )
    .filter(Boolean);

/**
 * ============================================================
 * Sprint C3.4H.3
 * ------------------------------------------------------------
 * Índice de metadados dos critérios
 *
 * Permite reutilizar os nomes e a hierarquia das avaliações
 * principais quando as avaliações de comparação contêm apenas
 * criterion_id, id ou code.
 * ============================================================
 */

/**
 * Devolve todas as chaves possíveis para identificar um critério.
 */
export const getDevelopmentCriterionLookupKeys = (
  entry = {}
) => {
  const identifiers =
    getCriterionIdentifiers(entry);

  const keys = new Set();

  const addKey = (prefix, value) => {
    const normalizedValue =
      normalizeDevelopmentIdentifier(value);

    if (!normalizedValue) {
      return;
    }

    keys.add(
      `${prefix}:${normalizedValue}`
    );
  };

  addKey(
    'id',
    identifiers.id
  );

  addKey(
    'code',
    normalizeCriterionCode(
      identifiers.code
    )
  );

  addKey(
    'name',
    normalizeDevelopmentSearchText(
      identifiers.name
    )
  );

  addKey(
    'source',
    entry?.source_code ||
      entry?.sourceCode
  );

  addKey(
    'criterion',
    entry?.criterion_id ||
      entry?.criterionId
  );

  return Array.from(keys);
};

/**
 * Cria um objeto de metadados reutilizável.
 */
export const createDevelopmentCriterionMetadata = (
  normalizedEntry = {}
) => ({
  id:
    normalizedEntry?.id ||
    null,

  criterion_id:
    normalizedEntry?.id ||
    null,

  criterionId:
    normalizedEntry?.id ||
    null,

  code:
    normalizedEntry?.code ||
    null,

  criterion_code:
    normalizedEntry?.code ||
    null,

  criterionCode:
    normalizedEntry?.code ||
    null,

  source_code:
    normalizedEntry?.code ||
    null,

  sourceCode:
    normalizedEntry?.code ||
    null,

  name:
    normalizedEntry?.name ||
    null,

  criterion_name:
    normalizedEntry?.name ||
    null,

  criterionName:
    normalizedEntry?.name ||
    null,

  observableAction:
    normalizedEntry?.observableAction ||
    normalizedEntry?.name ||
    null,

  description:
    normalizedEntry?.description ||
    '',

  domain:
    normalizedEntry?.domain ||
    UNKNOWN_DOMAIN_ID,

  domainLabel:
    normalizedEntry?.domainLabel ||
    'Outros critérios',

  domain_label:
    normalizedEntry?.domainLabel ||
    'Outros critérios',

  subdomain:
    normalizedEntry?.subdomain ||
    UNKNOWN_SUBDOMAIN_ID,

  subdomainLabel:
    normalizedEntry?.subdomainLabel ||
    'Outros critérios',

  subdomain_label:
    normalizedEntry?.subdomainLabel ||
    'Outros critérios',

  competency:
    normalizedEntry?.competency ||
    null,

  competencyLabel:
    normalizedEntry?.competencyLabel ||
    null,

  competency_label:
    normalizedEntry?.competencyLabel ||
    null,

  playerType:
    normalizedEntry?.playerType ||
    'all',

  player_type:
    normalizedEntry?.playerType ||
    'all',
});

/**
 * Constrói um índice a partir das avaliações principais.
 *
 * Exemplo:
 *
 * criterion_id: abc123
 *      ↓
 * {
 *   name: "Conduz a bola com a direita",
 *   domain: "technical",
 *   subdomain: "ball-control"
 * }
 */
export const buildDevelopmentCriterionMetadataIndex = (
  evaluations = []
) => {
  const index =
    new Map();

  const safeEvaluations =
    Array.isArray(evaluations)
      ? evaluations
      : [];

  safeEvaluations.forEach(
    (evaluation, evaluationIndex) => {
      const rawEntries =
        getDevelopmentEvaluationScores(
          evaluation
        );

      rawEntries.forEach((rawEntry) => {
        const normalizedEntry =
          normalizeDevelopmentCriterionEntry({
            entry: rawEntry,
            evaluation,
            evaluationIndex,
            comparison: false,
          });

        if (!normalizedEntry) {
          return;
        }

        const metadata =
          createDevelopmentCriterionMetadata(
            normalizedEntry
          );

        const keys = new Set([
          ...getDevelopmentCriterionLookupKeys(
            rawEntry
          ),

          ...getDevelopmentCriterionLookupKeys(
            metadata
          ),
        ]);

        keys.forEach((key) => {
          if (!key) {
            return;
          }

          const existing =
            index.get(key);

          /*
           * Preferir sempre metadados que tenham:
           * - nome oficial;
           * - código oficial;
           * - domínio reconhecido.
           */
          const existingQuality =
            (
              existing?.criterion_name
                ? 2
                : 0
            ) +
            (
              existing?.criterion_code
                ? 2
                : 0
            ) +
            (
              existing?.domain &&
              existing.domain !==
                UNKNOWN_DOMAIN_ID
                ? 1
                : 0
            );

          const newQuality =
            (
              metadata?.criterion_name
                ? 2
                : 0
            ) +
            (
              metadata?.criterion_code
                ? 2
                : 0
            ) +
            (
              metadata?.domain &&
              metadata.domain !==
                UNKNOWN_DOMAIN_ID
                ? 1
                : 0
            );

          if (
            !existing ||
            newQuality >
              existingQuality
          ) {
            index.set(
              key,
              metadata
            );
          }
        });
      });
    }
  );

  return index;
};

/**
 * Procura metadados conhecidos para um critério.
 */
export const findDevelopmentCriterionMetadata = (
  entry = {},
  metadataIndex = new Map()
) => {
  if (
    !(metadataIndex instanceof Map) ||
    metadataIndex.size === 0
  ) {
    return null;
  }

  const keys =
    getDevelopmentCriterionLookupKeys(
      entry
    );

  for (const key of keys) {
    const metadata =
      metadataIndex.get(key);

    if (metadata) {
      return metadata;
    }
  }

  return null;
};

/**
 * Enriquece um score de comparação com os metadados conhecidos.
 *
 * Os valores originais do score têm prioridade apenas para:
 * - score;
 * - weight;
 * - comentários;
 * - campos específicos da avaliação.
 *
 * Os nomes e a hierarquia conhecidos completam os campos em falta.
 */
export const enrichDevelopmentComparisonEntry = (
  entry = {},
  metadataIndex = new Map()
) => {
  const metadata =
    findDevelopmentCriterionMetadata(
      entry,
      metadataIndex
    );

  if (!metadata) {
    return entry;
  }

  const nestedCriterion =
    entry?.criterion &&
    typeof entry.criterion === 'object'
      ? entry.criterion
      : {};

  return {
    ...metadata,
    ...entry,

    criterion_id:
      entry?.criterion_id ||
      entry?.criterionId ||
      entry?.id ||
      metadata?.criterion_id ||
      metadata?.id ||
      null,

    criterion_code:
      entry?.criterion_code ||
      entry?.criterionCode ||
      entry?.code ||
      entry?.source_code ||
      entry?.sourceCode ||
      metadata?.criterion_code ||
      metadata?.code ||
      null,

    criterion_name:
      entry?.criterion_name ||
      entry?.criterionName ||
      entry?.name ||
      nestedCriterion?.name ||
      metadata?.criterion_name ||
      metadata?.name ||
      null,

    domain:
      entry?.domain ||
      nestedCriterion?.domain ||
      metadata?.domain ||
      UNKNOWN_DOMAIN_ID,

    domainLabel:
      entry?.domainLabel ||
      entry?.domain_label ||
      nestedCriterion?.domainLabel ||
      nestedCriterion?.domain_label ||
      metadata?.domainLabel ||
      metadata?.domain_label ||
      'Outros critérios',

    subdomain:
      entry?.subdomain ||
      nestedCriterion?.subdomain ||
      metadata?.subdomain ||
      UNKNOWN_SUBDOMAIN_ID,

    subdomainLabel:
      entry?.subdomainLabel ||
      entry?.subdomain_label ||
      nestedCriterion?.subdomainLabel ||
      nestedCriterion?.subdomain_label ||
      metadata?.subdomainLabel ||
      metadata?.subdomain_label ||
      'Outros critérios',

    criterion: {
      ...metadata,
      ...nestedCriterion,

      id:
        nestedCriterion?.id ||
        entry?.criterion_id ||
        entry?.criterionId ||
        metadata?.id ||
        null,

      code:
        nestedCriterion?.code ||
        entry?.criterion_code ||
        entry?.criterionCode ||
        entry?.code ||
        metadata?.code ||
        null,

      name:
        nestedCriterion?.name ||
        entry?.criterion_name ||
        entry?.criterionName ||
        entry?.name ||
        metadata?.name ||
        null,
    },
  };
};

/**
 * Normaliza uma avaliação de comparação utilizando o índice
 * criado a partir das avaliações principais.
 */
export const normalizeDevelopmentComparisonEvaluation = ({
  evaluation = {},
  evaluationIndex = null,
  metadataIndex = new Map(),
} = {}) =>
  getDevelopmentEvaluationScores(
    evaluation
  )
    .map((entry) =>
      enrichDevelopmentComparisonEntry(
        entry,
        metadataIndex
      )
    )
    .map((entry) =>
      normalizeDevelopmentCriterionEntry({
        entry,
        evaluation,
        evaluationIndex,
        comparison: true,
      })
    )
    .filter(Boolean);

/**
 * Cria um mapa de domínios vazio.
 *
 * Quando includeEmptyDomains é false, os domínios serão criados
 * apenas quando existirem critérios com pontuação.
 */
export const createDevelopmentDomainMap = ({
  includeEmptyDomains = false,
} = {}) => {
  const domainMap =
    new Map();

  if (includeEmptyDomains) {
    DEVELOPMENT_DOMAINS.forEach(
      (domain) => {
        domainMap.set(
          domain.id,
          createDevelopmentDomainNode(
            domain.id
          )
        );
      }
    );
  }

  return domainMap;
};

/**
 * Garante que um domínio existe no mapa.
 */
export const ensureDevelopmentDomainNode = (
  domainMap,
  domainId
) => {
  const normalizedDomainId =
    normalizeDevelopmentIdentifier(
      domainId
    ) ||
    UNKNOWN_DOMAIN_ID;

  if (
    !domainMap.has(
      normalizedDomainId
    )
  ) {
    domainMap.set(
      normalizedDomainId,
      createDevelopmentDomainNode(
        normalizedDomainId
      )
    );
  }

  return domainMap.get(
    normalizedDomainId
  );
};

/**
 * Garante que um subdomínio existe dentro do domínio.
 */
export const ensureDevelopmentSubdomainNode = (
  domainNode,
  subdomainId
) => {
  const normalizedSubdomainId =
    normalizeDevelopmentIdentifier(
      subdomainId
    ) ||
    UNKNOWN_SUBDOMAIN_ID;

  let subdomainNode =
    domainNode.subdomains.find(
      (item) =>
        item.id ===
        normalizedSubdomainId
    );

  if (!subdomainNode) {
    subdomainNode =
      createDevelopmentSubdomainNode(
        normalizedSubdomainId,
        domainNode.id
      );

    domainNode.subdomains.push(
      subdomainNode
    );
  }

  return subdomainNode;
};

/**
 * Garante que um critério existe dentro do subdomínio.
 */
export const ensureDevelopmentCriterionNode = (
  subdomainNode,
  normalizedEntry
) => {
  const identity =
    normalizedEntry?.code ||
    normalizedEntry?.id ||
    normalizeDevelopmentSearchText(
      normalizedEntry?.name
    );

  let criterionNode =
    subdomainNode.criteria.find(
      (item) =>
        (
          item.code &&
          normalizedEntry?.code &&
          item.code ===
            normalizedEntry.code
        ) ||
        (
          item.id &&
          normalizedEntry?.id &&
          String(item.id) ===
            String(
              normalizedEntry.id
            )
        ) ||
        (
          !item.code &&
          !normalizedEntry?.code &&
          normalizeDevelopmentSearchText(
            item.name
          ) ===
            normalizeDevelopmentSearchText(
              normalizedEntry?.name
            )
        )
    );

  if (!criterionNode) {
    criterionNode = {
      ...createDevelopmentCriterionNode({
        criterion:
          normalizedEntry?.isOfficial
            ? resolveDevelopmentCriterion(
                normalizedEntry
              )
            : null,

        fallback:
          normalizedEntry,
      }),

      treeIdentity:
        identity ||
        `criterion-${subdomainNode.criteria.length + 1}`,
    };

    subdomainNode.criteria.push(
      criterionNode
    );
  }

  return criterionNode;
};

/**
 * Acrescenta uma observação ao respetivo critério.
 */
export const appendDevelopmentCriterionObservation = (
  criterionNode,
  normalizedEntry
) => {
  const observation = {
    score:
      normalizedEntry.score,

    weight:
      normalizedEntry.weight,

    evaluationId:
      normalizedEntry
        ?.evaluation
        ?.id ||
      null,

    date:
      normalizedEntry
        ?.evaluation
        ?.date ||
      null,

    timestamp:
      normalizedEntry
        ?.evaluation
        ?.timestamp ||
      0,

    playerId:
      normalizedEntry
        ?.evaluation
        ?.playerId ||
      null,

    teamId:
      normalizedEntry
        ?.evaluation
        ?.teamId ||
      null,

    planId:
      normalizedEntry
        ?.evaluation
        ?.planId ||
      null,

    eventId:
      normalizedEntry
        ?.evaluation
        ?.eventId ||
      null,

    periodLabel:
      normalizedEntry
        ?.evaluation
        ?.periodLabel ||
      null,

    source:
      normalizedEntry
        ?.evaluation
        ?.source ||
      null,

    rawEntry:
      normalizedEntry.rawEntry,
  };

  if (
    normalizedEntry.comparison
  ) {
    criterionNode
      .comparisonScores
      .push(observation);
  } else {
    criterionNode
      .scores
      .push(observation);
  }

  const evaluationAlreadyExists =
    criterionNode.evaluations.some(
      (evaluation) =>
        evaluation.id &&
        observation.evaluationId &&
        evaluation.id ===
          observation.evaluationId
    );

  if (
    !evaluationAlreadyExists
  ) {
    criterionNode.evaluations.push({
      ...normalizedEntry.evaluation,
      comparison:
        normalizedEntry.comparison,
    });
  }

  return criterionNode;
};

/**
 * Adiciona uma entrada normalizada à árvore.
 */
export const addDevelopmentEntryToTree = (
  domainMap,
  normalizedEntry
) => {
  if (!normalizedEntry) {
    return domainMap;
  }

  const domainNode =
    ensureDevelopmentDomainNode(
      domainMap,
      normalizedEntry.domain
    );

  const subdomainNode =
    ensureDevelopmentSubdomainNode(
      domainNode,
      normalizedEntry.subdomain
    );

  const criterionNode =
    ensureDevelopmentCriterionNode(
      subdomainNode,
      normalizedEntry
    );

  appendDevelopmentCriterionObservation(
    criterionNode,
    normalizedEntry
  );

  return domainMap;
};

/**
 * Ordena a árvore pela ordem oficial da Biblioteca StickPro.
 */
export const sortDevelopmentCriteriaTree = (
  tree = []
) =>
  [...tree]
    .sort(
      compareDevelopmentDomains
    )
    .map((domain) => ({
      ...domain,

      subdomains: [
        ...(domain.subdomains || []),
      ]
        .sort(
          compareDevelopmentSubdomains
        )
        .map((subdomain) => ({
          ...subdomain,

          criteria: [
            ...(subdomain.criteria || []),
          ].sort(
            compareDevelopmentCriteria
          ),
        })),
    }));

/**
 * Constrói a árvore base Domínio → Subdomínio → Critério.
 *
 * A função ainda não calcula métricas agregadas.
 * Esse cálculo será acrescentado no Bloco C.
 */
export const buildDevelopmentCriteriaTree = ({
  evaluations = [],
  comparisonEvaluations = [],
  includeEmptyDomains = false,
  includeUnresolvedCriteria = true,
} = {}) => {
  const primaryEvaluations =
    Array.isArray(evaluations)
      ? evaluations
      : [];

  const secondaryEvaluations =
    Array.isArray(
      comparisonEvaluations
    )
      ? comparisonEvaluations
      : [];

  const domainMap =
    createDevelopmentDomainMap({
      includeEmptyDomains,
    });

  /*
   * Primeiro construímos um índice com os critérios
   * das avaliações principais do atleta.
   */
  const metadataIndex =
    buildDevelopmentCriterionMetadataIndex(
      primaryEvaluations
    );

  /*
   * Avaliações principais.
   */
  primaryEvaluations.forEach(
    (
      evaluation,
      evaluationIndex
    ) => {
      const entries =
        normalizeDevelopmentEvaluation({
          evaluation,
          evaluationIndex,
          comparison: false,
        });

      entries.forEach((entry) => {
        if (
          !includeUnresolvedCriteria &&
          !entry.isOfficial
        ) {
          return;
        }

        addDevelopmentEntryToTree(
          domainMap,
          entry
        );
      });
    }
  );

  /*
   * Avaliações de comparação.
   *
   * Antes da normalização, cada score é enriquecido com os
   * nomes, domínios e subdomínios encontrados nas avaliações
   * principais.
   */
  secondaryEvaluations.forEach(
    (
      evaluation,
      evaluationIndex
    ) => {
      const entries =
        normalizeDevelopmentComparisonEvaluation({
          evaluation,
          evaluationIndex,
          metadataIndex,
        });

      entries.forEach((entry) => {
        if (
          !includeUnresolvedCriteria &&
          !entry.isOfficial
        ) {
          return;
        }

        addDevelopmentEntryToTree(
          domainMap,
          entry
        );
      });
    }
  );

  return sortDevelopmentCriteriaTree(
    Array.from(
      domainMap.values()
    )
  );
};

  secondaryEvaluations.forEach(
    (evaluation, evaluationIndex) => {
      const entries =
        normalizeDevelopmentEvaluation({
          evaluation,
          evaluationIndex,
          comparison: true,
        });

      entries.forEach((entry) => {
        if (
          !includeUnresolvedCriteria &&
          !entry.isOfficial
        ) {
          return;
        }

        addDevelopmentEntryToTree(
          domainMap,
          entry
        );
      });
    }
  );

  return sortDevelopmentCriteriaTree(
    Array.from(
      domainMap.values()
    )
  );
};
/**
 * ============================================================
 * Sprint C3.4H.2.2 — Bloco C
 * ------------------------------------------------------------
 * Métricas da árvore:
 *
 * - média ponderada;
 * - última avaliação;
 * - avaliação anterior;
 * - evolução;
 * - média de comparação;
 * - diferença;
 * - mínimo e máximo;
 * - número de avaliações;
 * - agregação por subdomínio e domínio.
 * ============================================================
 */

/**
 * Garante que o argumento é uma lista válida de observações.
 */
export const normalizeDevelopmentObservations = (
  observations = []
) =>
  Array.isArray(observations)
    ? observations.filter(
        (observation) =>
          observation &&
          normalizeDevelopmentScore(
            observation?.score
          ) !== null
      )
    : [];

/**
 * Calcula a média ponderada de um conjunto de observações.
 *
 * Quando não existe peso válido, utiliza peso 1.
 */
export const calculateWeightedDevelopmentAverage = (
  observations = []
) => {
  const validObservations =
    normalizeDevelopmentObservations(
      observations
    );

  if (validObservations.length === 0) {
    return null;
  }

  let weightedTotal = 0;
  let totalWeight = 0;

  validObservations.forEach(
    (observation) => {
      const score =
        normalizeDevelopmentScore(
          observation?.score
        );

      const weight = Number(
        observation?.weight ?? 1
      );

      const safeWeight =
        Number.isFinite(weight) &&
        weight > 0
          ? weight
          : 1;

      weightedTotal +=
        score * safeWeight;

      totalWeight += safeWeight;
    }
  );

  if (totalWeight === 0) {
    return null;
  }

  return roundDevelopmentMetric(
    weightedTotal / totalWeight
  );
};

/**
 * Ordena observações cronologicamente.
 *
 * Observações sem data ficam no início da lista,
 * permitindo que as mais recentes permaneçam no fim.
 */
export const sortDevelopmentObservationsByDate = (
  observations = []
) =>
  [
    ...normalizeDevelopmentObservations(
      observations
    ),
  ].sort((first, second) => {
    const firstTimestamp =
      Number(first?.timestamp) ||
      getDevelopmentEvaluationTimestamp(
        first?.date
      );

    const secondTimestamp =
      Number(second?.timestamp) ||
      getDevelopmentEvaluationTimestamp(
        second?.date
      );

    if (
      firstTimestamp !==
      secondTimestamp
    ) {
      return (
        firstTimestamp -
        secondTimestamp
      );
    }

    return String(
      first?.evaluationId || ''
    ).localeCompare(
      String(
        second?.evaluationId || ''
      )
    );
  });

/**
 * Devolve a observação mais recente.
 */
export const getLatestDevelopmentObservation = (
  observations = []
) => {
  const ordered =
    sortDevelopmentObservationsByDate(
      observations
    );

  return ordered.length > 0
    ? ordered[ordered.length - 1]
    : null;
};

/**
 * Devolve a observação imediatamente anterior à mais recente.
 *
 * Quando existem vários scores na mesma avaliação,
 * procura a avaliação anterior distinta.
 */
export const getPreviousDevelopmentObservation = (
  observations = []
) => {
  const ordered =
    sortDevelopmentObservationsByDate(
      observations
    );

  if (ordered.length < 2) {
    return null;
  }

  const latest =
    ordered[ordered.length - 1];

  const latestEvaluationId =
    latest?.evaluationId || null;

  for (
    let index = ordered.length - 2;
    index >= 0;
    index -= 1
  ) {
    const candidate =
      ordered[index];

    if (
      !latestEvaluationId ||
      !candidate?.evaluationId ||
      candidate.evaluationId !==
        latestEvaluationId
    ) {
      return candidate;
    }
  }

  return ordered[
    ordered.length - 2
  ];
};

/**
 * Conta avaliações únicas através do respetivo ID.
 *
 * Quando uma observação não tem evaluationId,
 * utiliza data e timestamp como fallback.
 */
export const countUniqueDevelopmentEvaluations = (
  observations = []
) => {
  const uniqueEvaluations =
    new Set();

  normalizeDevelopmentObservations(
    observations
  ).forEach((observation, index) => {
    const identity =
      observation?.evaluationId ||
      (
        observation?.timestamp
          ? `timestamp-${observation.timestamp}`
          : null
      ) ||
      (
        observation?.date
          ? `date-${observation.date}`
          : null
      ) ||
      `observation-${index}`;

    uniqueEvaluations.add(
      String(identity)
    );
  });

  return uniqueEvaluations.size;
};

/**
 * Extrai os valores mínimo e máximo.
 */
export const getDevelopmentScoreRange = (
  observations = []
) => {
  const scores =
    normalizeDevelopmentObservations(
      observations
    )
      .map((observation) =>
        normalizeDevelopmentScore(
          observation?.score
        )
      )
      .filter(
        (score) => score !== null
      );

  if (scores.length === 0) {
    return {
      minimum: null,
      maximum: null,
    };
  }

  return {
    minimum: Math.min(...scores),
    maximum: Math.max(...scores),
  };
};

/**
 * Calcula a diferença entre duas métricas.
 */
export const calculateDevelopmentDifference = (
  primaryValue,
  comparisonValue
) => {
  const primary =
    Number(primaryValue);

  const comparison =
    Number(comparisonValue);

  if (
    !Number.isFinite(primary) ||
    !Number.isFinite(comparison)
  ) {
    return null;
  }

  return roundDevelopmentMetric(
    primary - comparison
  );
};

/**
 * Calcula todas as métricas de um critério.
 */
export const calculateDevelopmentCriterionMetrics = (
  criterionNode
) => {
  const primaryObservations =
    normalizeDevelopmentObservations(
      criterionNode?.scores
    );

  const comparisonObservations =
    normalizeDevelopmentObservations(
      criterionNode?.comparisonScores
    );

  const average =
    calculateWeightedDevelopmentAverage(
      primaryObservations
    );

  const comparisonAverage =
    calculateWeightedDevelopmentAverage(
      comparisonObservations
    );

  const latestObservation =
    getLatestDevelopmentObservation(
      primaryObservations
    );

  const previousObservation =
    getPreviousDevelopmentObservation(
      primaryObservations
    );

  const latestScore =
    normalizeDevelopmentScore(
      latestObservation?.score
    );

  const previousScore =
    normalizeDevelopmentScore(
      previousObservation?.score
    );

  const range =
    getDevelopmentScoreRange(
      primaryObservations
    );

  return {
    average,

    latestScore,

    previousScore,

    evolution:
      calculateDevelopmentDifference(
        latestScore,
        previousScore
      ),

    comparisonAverage,

    difference:
      calculateDevelopmentDifference(
        average,
        comparisonAverage
      ),

    scoreCount:
      primaryObservations.length,

    comparisonScoreCount:
      comparisonObservations.length,

    evaluationCount:
      countUniqueDevelopmentEvaluations(
        primaryObservations
      ),

    comparisonEvaluationCount:
      countUniqueDevelopmentEvaluations(
        comparisonObservations
      ),

    minimum:
      range.minimum,

    maximum:
      range.maximum,
  };
};

/**
 * Devolve todas as observações principais dos critérios indicados.
 */
export const collectDevelopmentPrimaryObservations = (
  criteria = []
) =>
  criteria.flatMap(
    (criterion) =>
      Array.isArray(criterion?.scores)
        ? criterion.scores
        : []
  );

/**
 * Devolve todas as observações de comparação.
 */
export const collectDevelopmentComparisonObservations = (
  criteria = []
) =>
  criteria.flatMap(
    (criterion) =>
      Array.isArray(
        criterion?.comparisonScores
      )
        ? criterion.comparisonScores
        : []
  );

/**
 * Calcula métricas agregadas para um grupo de critérios.
 *
 * Utilizado por:
 * - subdomínio;
 * - domínio;
 * - futura competência.
 */
export const calculateDevelopmentGroupMetrics = (
  criteria = []
) => {
  const validCriteria =
    Array.isArray(criteria)
      ? criteria
      : [];

  const primaryObservations =
    collectDevelopmentPrimaryObservations(
      validCriteria
    );

  const comparisonObservations =
    collectDevelopmentComparisonObservations(
      validCriteria
    );

  const average =
    calculateWeightedDevelopmentAverage(
      primaryObservations
    );

  const comparisonAverage =
    calculateWeightedDevelopmentAverage(
      comparisonObservations
    );

  const latestCriterionScores =
    validCriteria
      .map(
        (criterion) =>
          criterion?.metrics
            ?.latestScore
      )
      .filter(
        (score) =>
          Number.isFinite(
            Number(score)
          )
      );

  const previousCriterionScores =
    validCriteria
      .map(
        (criterion) =>
          criterion?.metrics
            ?.previousScore
      )
      .filter(
        (score) =>
          Number.isFinite(
            Number(score)
          )
      );

  const latestScore =
    calculateDevelopmentAverage(
      latestCriterionScores
    );

  const previousScore =
    calculateDevelopmentAverage(
      previousCriterionScores
    );

  const primaryRange =
    getDevelopmentScoreRange(
      primaryObservations
    );

  return {
    average,

    latestScore:
      roundDevelopmentMetric(
        latestScore
      ),

    previousScore:
      roundDevelopmentMetric(
        previousScore
      ),

    evolution:
      calculateDevelopmentDifference(
        latestScore,
        previousScore
      ),

    comparisonAverage,

    difference:
      calculateDevelopmentDifference(
        average,
        comparisonAverage
      ),

    scoreCount:
      primaryObservations.length,

    comparisonScoreCount:
      comparisonObservations.length,

    criterionCount:
      validCriteria.filter(
        (criterion) =>
          criterion?.metrics
            ?.scoreCount > 0 ||
          criterion?.metrics
            ?.comparisonScoreCount > 0
      ).length,

    evaluationCount:
      countUniqueDevelopmentEvaluations(
        primaryObservations
      ),

    comparisonEvaluationCount:
      countUniqueDevelopmentEvaluations(
        comparisonObservations
      ),

    minimum:
      primaryRange.minimum,

    maximum:
      primaryRange.maximum,
  };
};

/**
 * Calcula as métricas de todos os critérios de um subdomínio.
 */
export const calculateDevelopmentSubdomainMetrics = (
  subdomainNode
) => {
  const criteria =
    Array.isArray(
      subdomainNode?.criteria
    )
      ? subdomainNode.criteria.map(
          (criterion) => ({
            ...criterion,

            metrics:
              calculateDevelopmentCriterionMetrics(
                criterion
              ),
          })
        )
      : [];

  return {
    ...subdomainNode,

    criteria,

    metrics:
      calculateDevelopmentGroupMetrics(
        criteria
      ),
  };
};

/**
 * Reúne todos os critérios pertencentes aos subdomínios.
 */
export const collectDevelopmentDomainCriteria = (
  subdomains = []
) =>
  subdomains.flatMap(
    (subdomain) =>
      Array.isArray(
        subdomain?.criteria
      )
        ? subdomain.criteria
        : []
  );

/**
 * Calcula as métricas de um domínio completo.
 */
export const calculateDevelopmentDomainMetrics = (
  domainNode
) => {
  const subdomains =
    Array.isArray(
      domainNode?.subdomains
    )
      ? domainNode.subdomains.map(
          (subdomain) =>
            calculateDevelopmentSubdomainMetrics(
              subdomain
            )
        )
      : [];

  const criteria =
    collectDevelopmentDomainCriteria(
      subdomains
    );

  return {
    ...domainNode,

    subdomains,

    metrics:
      calculateDevelopmentGroupMetrics(
        criteria
      ),
  };
};

/**
 * Finaliza a árvore calculando todas as métricas.
 */
export const calculateDevelopmentTreeMetrics = (
  tree = []
) =>
  sortDevelopmentCriteriaTree(
    (
      Array.isArray(tree)
        ? tree
        : []
    ).map((domain) =>
      calculateDevelopmentDomainMetrics(
        domain
      )
    )
  );

/**
 * Calcula as métricas globais da árvore.
 */
export const calculateDevelopmentOverallMetrics = (
  tree = []
) => {
  const domains =
    Array.isArray(tree)
      ? tree
      : [];

  const criteria =
    domains.flatMap((domain) =>
      collectDevelopmentDomainCriteria(
        domain?.subdomains || []
      )
    );

  return {
    ...calculateDevelopmentGroupMetrics(
      criteria
    ),

    domainCount:
      domains.filter(
        (domain) =>
          domain?.metrics
            ?.criterionCount > 0
      ).length,

    subdomainCount:
      domains.reduce(
        (total, domain) =>
          total +
          (
            domain?.subdomains ||
            []
          ).filter(
            (subdomain) =>
              subdomain?.metrics
                ?.criterionCount > 0
          ).length,
        0
      ),
  };
};

/**
 * Constrói e finaliza a árvore com todas as métricas.
 *
 * Esta será a função principal usada inicialmente pelo
 * EvaluationHistory.jsx e pelo futuro CriteriaAccordion.
 */
export const buildDevelopmentCriteriaTreeWithMetrics = (
  options = {}
) => {
  const tree =
    buildDevelopmentCriteriaTree(
      options
    );

  const domains =
    calculateDevelopmentTreeMetrics(
      tree
    );

  return {
    domains,

    metrics:
      calculateDevelopmentOverallMetrics(
        domains
      ),
  };
};
/**
 * ============================================================
 * Sprint C3.4H.2.2 — Bloco D
 * ------------------------------------------------------------
 * API pública do StickPro Development Engine:
 *
 * - flatten da árvore;
 * - pesquisa de domínio, subdomínio e critério;
 * - dados para radar;
 * - pontos fortes;
 * - prioridades de desenvolvimento;
 * - comparação última vs anterior;
 * - resumo global;
 * - export default final.
 * ============================================================
 */

/**
 * Converte a árvore numa lista plana de critérios.
 */
export const flattenDevelopmentCriteriaTree = (
  tree = []
) =>
  (
    Array.isArray(tree)
      ? tree
      : []
  ).flatMap((domain) =>
    (
      domain?.subdomains || []
    ).flatMap((subdomain) =>
      (
        subdomain?.criteria || []
      ).map((criterion) => ({
        ...criterion,

        domainNode: {
          id: domain.id,
          code: domain.code,
          label: domain.label,
          order: domain.order,
          metrics: domain.metrics,
        },

        subdomainNode: {
          id: subdomain.id,
          label: subdomain.label,
          domain: subdomain.domain,
          order: subdomain.order,
          metrics: subdomain.metrics,
        },
      }))
    )
  );

/**
 * Converte a árvore numa lista plana de subdomínios.
 */
export const flattenDevelopmentSubdomains = (
  tree = []
) =>
  (
    Array.isArray(tree)
      ? tree
      : []
  ).flatMap((domain) =>
    (
      domain?.subdomains || []
    ).map((subdomain) => ({
      ...subdomain,

      domainNode: {
        id: domain.id,
        code: domain.code,
        label: domain.label,
        order: domain.order,
        metrics: domain.metrics,
      },
    }))
  );

/**
 * Procura um domínio na árvore.
 */
export const findDevelopmentDomainInTree = (
  tree = [],
  domainId
) => {
  const normalizedId =
    normalizeDevelopmentIdentifier(
      domainId
    );

  if (!normalizedId) {
    return null;
  }

  return (
    (
      Array.isArray(tree)
        ? tree
        : []
    ).find(
      (domain) =>
        String(domain?.id) ===
        String(normalizedId)
    ) || null
  );
};

/**
 * Procura um subdomínio na árvore.
 */
export const findDevelopmentSubdomainInTree = (
  tree = [],
  subdomainId
) => {
  const normalizedId =
    normalizeDevelopmentIdentifier(
      subdomainId
    );

  if (!normalizedId) {
    return null;
  }

  return (
    flattenDevelopmentSubdomains(
      tree
    ).find(
      (subdomain) =>
        String(subdomain?.id) ===
        String(normalizedId)
    ) || null
  );
};

/**
 * Procura um critério na árvore.
 *
 * Pode receber:
 * - código oficial;
 * - ID;
 * - nome.
 */
export const findDevelopmentCriterionInTree = (
  tree = [],
  identifier
) => {
  const normalizedIdentifier =
    normalizeDevelopmentIdentifier(
      identifier
    );

  if (!normalizedIdentifier) {
    return null;
  }

  const normalizedCode =
    normalizeCriterionCode(
      normalizedIdentifier
    );

  const normalizedName =
    normalizeDevelopmentSearchText(
      normalizedIdentifier
    );

  return (
    flattenDevelopmentCriteriaTree(
      tree
    ).find((criterion) => {
      const criterionCode =
        normalizeCriterionCode(
          criterion?.code
        );

      const criterionId =
        normalizeDevelopmentIdentifier(
          criterion?.id
        );

      const criterionName =
        normalizeDevelopmentSearchText(
          criterion?.name
        );

      return (
        criterionCode ===
          normalizedCode ||
        criterionId ===
          normalizedIdentifier ||
        criterionName ===
          normalizedName
      );
    }) || null
  );
};

/**
 * Devolve apenas os critérios com dados principais.
 */
export const getDevelopmentCriteriaWithScores = (
  tree = []
) =>
  flattenDevelopmentCriteriaTree(
    tree
  ).filter(
    (criterion) =>
      criterion?.metrics?.scoreCount > 0
  );

/**
 * Devolve apenas os critérios com dados de comparação.
 */
export const getDevelopmentCriteriaWithComparison = (
  tree = []
) =>
  flattenDevelopmentCriteriaTree(
    tree
  ).filter(
    (criterion) =>
      criterion?.metrics
        ?.comparisonScoreCount > 0
  );

/**
 * Devolve os domínios com dados avaliados.
 */
export const getDevelopmentDomainsWithScores = (
  tree = []
) =>
  (
    Array.isArray(tree)
      ? tree
      : []
  ).filter(
    (domain) =>
      domain?.metrics?.criterionCount > 0
  );

/**
 * Constrói os dados para um gráfico radar por domínio.
 */
export const buildDevelopmentDomainRadarData = (
  tree = [],
  {
    includeComparison = true,
    includeEmpty = false,
  } = {}
) =>
  (
    Array.isArray(tree)
      ? tree
      : []
  )
    .filter((domain) => {
      if (includeEmpty) {
        return true;
      }

      return (
        domain?.metrics?.average !==
          null ||
        (
          includeComparison &&
          domain?.metrics
            ?.comparisonAverage !== null
        )
      );
    })
    .map((domain) => ({
      id: domain.id,
      code: domain.code,
      subject: domain.label,
      domain: domain.id,
      domainLabel: domain.label,

      value:
        domain?.metrics?.average ??
        0,

      athlete:
        domain?.metrics?.average ??
        0,

      comparison:
        includeComparison
          ? (
              domain?.metrics
                ?.comparisonAverage ??
              0
            )
          : undefined,

      team:
        includeComparison
          ? (
              domain?.metrics
                ?.comparisonAverage ??
              0
            )
          : undefined,

      difference:
        domain?.metrics?.difference ??
        null,

      fullMark:
        DEVELOPMENT_SCORE_MAX,

      criterionCount:
        domain?.metrics
          ?.criterionCount ??
        0,
    }));

/**
 * Constrói os dados para radar por subdomínio.
 */
export const buildDevelopmentSubdomainRadarData = (
  tree = [],
  domainId = null,
  {
    includeComparison = true,
    includeEmpty = false,
  } = {}
) => {
  const source = domainId
    ? (
        findDevelopmentDomainInTree(
          tree,
          domainId
        )?.subdomains || []
      )
    : flattenDevelopmentSubdomains(
        tree
      );

  return source
    .filter((subdomain) => {
      if (includeEmpty) {
        return true;
      }

      return (
        subdomain?.metrics?.average !==
          null ||
        (
          includeComparison &&
          subdomain?.metrics
            ?.comparisonAverage !== null
        )
      );
    })
    .map((subdomain) => ({
      id: subdomain.id,
      subject: subdomain.label,
      subdomain: subdomain.id,
      subdomainLabel:
        subdomain.label,

      value:
        subdomain?.metrics?.average ??
        0,

      athlete:
        subdomain?.metrics?.average ??
        0,

      comparison:
        includeComparison
          ? (
              subdomain?.metrics
                ?.comparisonAverage ??
              0
            )
          : undefined,

      team:
        includeComparison
          ? (
              subdomain?.metrics
                ?.comparisonAverage ??
              0
            )
          : undefined,

      difference:
        subdomain?.metrics
          ?.difference ??
        null,

      fullMark:
        DEVELOPMENT_SCORE_MAX,

      criterionCount:
        subdomain?.metrics
          ?.criterionCount ??
        0,
    }));
};

/**
 * Ordena critérios do melhor para o pior.
 */
export const sortDevelopmentCriteriaByPerformance = (
  criteria = [],
  {
    metric = 'average',
    direction = 'desc',
  } = {}
) => {
  const multiplier =
    direction === 'asc'
      ? 1
      : -1;

  return [
    ...(
      Array.isArray(criteria)
        ? criteria
        : []
    ),
  ].sort((first, second) => {
    const firstValue =
      Number(
        first?.metrics?.[metric]
      );

    const secondValue =
      Number(
        second?.metrics?.[metric]
      );

    const firstValid =
      Number.isFinite(firstValue);

    const secondValid =
      Number.isFinite(secondValue);

    if (
      firstValid &&
      secondValid
    ) {
      if (
        firstValue !==
        secondValue
      ) {
        return (
          firstValue -
          secondValue
        ) * multiplier;
      }

      return compareDevelopmentCriteria(
        first,
        second
      );
    }

    if (firstValid) {
      return -1;
    }

    if (secondValid) {
      return 1;
    }

    return compareDevelopmentCriteria(
      first,
      second
    );
  });
};

/**
 * Devolve os pontos fortes do atleta.
 */
export const getDevelopmentStrengths = (
  tree = [],
  {
    limit = 5,
    minimumScore = null,
    metric = 'average',
  } = {}
) => {
  const criteria =
    getDevelopmentCriteriaWithScores(
      tree
    ).filter((criterion) => {
      const value =
        Number(
          criterion?.metrics?.[metric]
        );

      if (!Number.isFinite(value)) {
        return false;
      }

      if (
        minimumScore !== null &&
        value < minimumScore
      ) {
        return false;
      }

      return true;
    });

  return sortDevelopmentCriteriaByPerformance(
    criteria,
    {
      metric,
      direction: 'desc',
    }
  ).slice(0, limit);
};

/**
 * Devolve as prioridades de desenvolvimento.
 */
export const getDevelopmentPriorities = (
  tree = [],
  {
    limit = 5,
    maximumScore = null,
    metric = 'average',
  } = {}
) => {
  const criteria =
    getDevelopmentCriteriaWithScores(
      tree
    ).filter((criterion) => {
      const value =
        Number(
          criterion?.metrics?.[metric]
        );

      if (!Number.isFinite(value)) {
        return false;
      }

      if (
        maximumScore !== null &&
        value > maximumScore
      ) {
        return false;
      }

      return true;
    });

  return sortDevelopmentCriteriaByPerformance(
    criteria,
    {
      metric,
      direction: 'asc',
    }
  ).slice(0, limit);
};

/**
 * Devolve os critérios com maior evolução positiva.
 */
export const getDevelopmentPositiveEvolution = (
  tree = [],
  {
    limit = 5,
    minimumDifference = 0,
  } = {}
) =>
  getDevelopmentCriteriaWithScores(
    tree
  )
    .filter((criterion) => {
      const evolution =
        Number(
          criterion?.metrics
            ?.evolution
        );

      return (
        Number.isFinite(evolution) &&
        evolution >
          minimumDifference
      );
    })
    .sort(
      (first, second) =>
        second.metrics.evolution -
        first.metrics.evolution
    )
    .slice(0, limit);

/**
 * Devolve os critérios com regressão.
 */
export const getDevelopmentNegativeEvolution = (
  tree = [],
  {
    limit = 5,
    maximumDifference = 0,
  } = {}
) =>
  getDevelopmentCriteriaWithScores(
    tree
  )
    .filter((criterion) => {
      const evolution =
        Number(
          criterion?.metrics
            ?.evolution
        );

      return (
        Number.isFinite(evolution) &&
        evolution <
          maximumDifference
      );
    })
    .sort(
      (first, second) =>
        first.metrics.evolution -
        second.metrics.evolution
    )
    .slice(0, limit);

/**
 * Constrói a lista comparativa:
 * última avaliação vs avaliação anterior.
 */
export const buildDevelopmentLatestComparison = (
  tree = []
) =>
  getDevelopmentCriteriaWithScores(
    tree
  )
    .filter(
      (criterion) =>
        criterion?.metrics
          ?.latestScore !== null
    )
    .map((criterion) => ({
      id: criterion.id,
      code: criterion.code,
      name: criterion.name,

      domain:
        criterion.domain,

      domainLabel:
        criterion.domainLabel,

      subdomain:
        criterion.subdomain,

      subdomainLabel:
        criterion.subdomainLabel,

      latestScore:
        criterion.metrics
          .latestScore,

      previousScore:
        criterion.metrics
          .previousScore,

      difference:
        criterion.metrics
          .evolution,

      evolution:
        criterion.metrics
          .evolution,

      status:
        criterion.metrics
          .evolution === null
          ? 'no_comparison'
          : criterion.metrics
                .evolution > 0
            ? 'improving'
            : criterion.metrics
                  .evolution < 0
              ? 'declining'
              : 'stable',
    }))
    .sort(
      compareDevelopmentCriteria
    );

/**
 * Constrói a lista comparativa:
 * atleta vs média da equipa.
 */
export const buildDevelopmentTeamComparison = (
  tree = []
) =>
  getDevelopmentCriteriaWithComparison(
    tree
  )
    .filter(
      (criterion) =>
        criterion?.metrics?.average !==
          null &&
        criterion?.metrics
          ?.comparisonAverage !== null
    )
    .map((criterion) => ({
      id: criterion.id,
      code: criterion.code,
      name: criterion.name,

      domain:
        criterion.domain,

      domainLabel:
        criterion.domainLabel,

      subdomain:
        criterion.subdomain,

      subdomainLabel:
        criterion.subdomainLabel,

      athleteAverage:
        criterion.metrics
          .average,

      teamAverage:
        criterion.metrics
          .comparisonAverage,

      difference:
        criterion.metrics
          .difference,

      status:
        criterion.metrics
          .difference === null
          ? 'no_comparison'
          : criterion.metrics
                .difference > 0
            ? 'above'
            : criterion.metrics
                  .difference < 0
              ? 'below'
              : 'equal',
    }))
    .sort(
      compareDevelopmentCriteria
    );

/**
 * Constrói um resumo global do desenvolvimento.
 */
export const buildDevelopmentSummary = (
  treeResult = {}
) => {
  const domains =
    Array.isArray(
      treeResult?.domains
    )
      ? treeResult.domains
      : Array.isArray(treeResult)
        ? treeResult
        : [];

  const metrics =
    treeResult?.metrics ||
    calculateDevelopmentOverallMetrics(
      domains
    );

  const strengths =
    getDevelopmentStrengths(
      domains,
      {
        limit: 5,
      }
    );

  const priorities =
    getDevelopmentPriorities(
      domains,
      {
        limit: 5,
      }
    );

  const positiveEvolution =
    getDevelopmentPositiveEvolution(
      domains,
      {
        limit: 5,
      }
    );

  const negativeEvolution =
    getDevelopmentNegativeEvolution(
      domains,
      {
        limit: 5,
      }
    );

  return {
    metrics,

    domains,

    radar:
      buildDevelopmentDomainRadarData(
        domains
      ),

    strengths,

    priorities,

    positiveEvolution,

    negativeEvolution,

    latestComparison:
      buildDevelopmentLatestComparison(
        domains
      ),

    teamComparison:
      buildDevelopmentTeamComparison(
        domains
      ),

    totalCriteria:
      flattenDevelopmentCriteriaTree(
        domains
      ).length,

    evaluatedCriteria:
      getDevelopmentCriteriaWithScores(
        domains
      ).length,

    comparedCriteria:
      getDevelopmentCriteriaWithComparison(
        domains
      ).length,
  };
};

/**
 * Função principal do StickPro Development Engine.
 *
 * Recebe avaliações e devolve:
 * - árvore;
 * - métricas;
 * - radar;
 * - forças;
 * - prioridades;
 * - evolução;
 * - comparação com equipa.
 */
export const buildDevelopmentEngine = (
  options = {}
) => {
  const treeResult =
    buildDevelopmentCriteriaTreeWithMetrics(
      options
    );

  return buildDevelopmentSummary(
    treeResult
  );
};

/**
 * Alias para uso no histórico individual.
 */
export const buildPlayerDevelopmentTree = (
  evaluations = [],
  options = {}
) =>
  buildDevelopmentEngine({
    ...options,
    evaluations,
  });

/**
 * Alias para comparação atleta × equipa.
 */
export const buildPlayerTeamDevelopmentTree = ({
  playerEvaluations = [],
  teamEvaluations = [],
  ...options
} = {}) =>
  buildDevelopmentEngine({
    ...options,

    evaluations:
      playerEvaluations,

    comparisonEvaluations:
      teamEvaluations,
  });

/**
 * Alias preparado para o futuro dashboard coletivo.
 */
export const buildTeamDevelopmentTree = (
  evaluations = [],
  options = {}
) =>
  buildDevelopmentEngine({
    ...options,
    evaluations,
  });

/**
 * Export default para importação simplificada.
 */
const developmentCriteriaTree = {
  DEVELOPMENT_SCORE_MIN,
  DEVELOPMENT_SCORE_MAX,

  normalizeDevelopmentIdentifier,
  normalizeCriterionCode,
  normalizeDevelopmentScore,
  calculateDevelopmentAverage,
  roundDevelopmentMetric,

  resolveDevelopmentCriterion,
  normalizeDevelopmentEvaluation,
  normalizeDevelopmentCriterionEntry,
  
  getDevelopmentCriterionLookupKeys,
  createDevelopmentCriterionMetadata,
  buildDevelopmentCriterionMetadataIndex,
  findDevelopmentCriterionMetadata,
  enrichDevelopmentComparisonEntry,
  normalizeDevelopmentComparisonEvaluation,

  buildDevelopmentCriteriaTree,
  calculateDevelopmentTreeMetrics,
  buildDevelopmentCriteriaTreeWithMetrics,

  flattenDevelopmentCriteriaTree,
  flattenDevelopmentSubdomains,

  findDevelopmentDomainInTree,
  findDevelopmentSubdomainInTree,
  findDevelopmentCriterionInTree,

  buildDevelopmentDomainRadarData,
  buildDevelopmentSubdomainRadarData,

  getDevelopmentStrengths,
  getDevelopmentPriorities,
  getDevelopmentPositiveEvolution,
  getDevelopmentNegativeEvolution,

  buildDevelopmentLatestComparison,
  buildDevelopmentTeamComparison,
  buildDevelopmentSummary,
  buildDevelopmentEngine,

  buildPlayerDevelopmentTree,
  buildPlayerTeamDevelopmentTree,
  buildTeamDevelopmentTree,
};

export default developmentCriteriaTree;
