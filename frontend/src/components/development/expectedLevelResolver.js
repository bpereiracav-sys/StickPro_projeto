// ============================================================
// StickPro Expected Level Resolver
// Sprint C3.5B.2C.1
// ============================================================

const CONTEXT_WEIGHTS = {
  team_id: 4,
  age_group: 2,
  player_type: 1,
};


const asFiniteNumber = (
  value
) => {
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


const normalizeAgeGroup = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const normalized = String(value)
    .trim()
    .toLowerCase();

  if (!normalized) {
    return null;
  }

  const aliases = {
    'sub 7': 'sub7',
    'sub-7': 'sub7',

    'sub 9': 'sub9',
    'sub-9': 'sub9',

    'sub 11': 'sub11',
    'sub-11': 'sub11',

    'sub 13': 'sub13',
    'sub-13': 'sub13',

    'sub 15': 'sub15',
    'sub-15': 'sub15',

    'sub 17': 'sub17',
    'sub-17': 'sub17',

    'sub 19': 'sub19',
    'sub-19': 'sub19',

    senior: 'senior',
    sénior: 'senior',
    seniores: 'senior',
  };

  return (
    aliases[normalized] ||
    normalized
      .replace(/\s+/g, '')
      .replace(/-/g, '')
  );
};


const normalizePlayerType = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const normalized = String(value)
    .trim()
    .toLowerCase();

  if (!normalized) {
    return null;
  }

  if (
    [
      'goalkeeper',
      'goalie',
      'gk',
      'gr',
      'guarda-redes',
      'guarda_redes',
      'guarda redes',
    ].includes(normalized)
  ) {
    return 'goalkeeper';
  }

  if (
    [
      'field_player',
      'field player',
      'field',
      'player',
      'jc',
      'jogador',
      'jogador de campo',
    ].includes(normalized)
  ) {
    return 'field_player';
  }

  return normalized;
};


const normalizeTeamId = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const normalized = String(value)
    .trim();

  return normalized || null;
};


const normalizeExpectedLevel = (
  level
) => {
  if (
    !level ||
    typeof level !== 'object'
  ) {
    return null;
  }

  const minimum = asFiniteNumber(
    level.minimum ??
      level.expected_min ??
      level.min
  );

  const maximum = asFiniteNumber(
    level.maximum ??
      level.expected_max ??
      level.max
  );

  if (
    minimum === null ||
    maximum === null ||
    minimum >= maximum
  ) {
    return null;
  }

  return {
    age_group:
      normalizeAgeGroup(
        level.age_group ??
          level.ageGroup
      ),

    player_type:
      normalizePlayerType(
        level.player_type ??
          level.playerType
      ),

    team_id:
      normalizeTeamId(
        level.team_id ??
          level.teamId
      ),

    minimum,
    maximum,
  };
};


const normalizeExpectedLevels = (
  expectedLevels
) => {
  if (
    !Array.isArray(
      expectedLevels
    )
  ) {
    return [];
  }

  return expectedLevels
    .map(
      normalizeExpectedLevel
    )
    .filter(Boolean);
};


const contextMatches = (
  configuredValue,
  currentValue
) => {
  if (
    configuredValue === null
  ) {
    return true;
  }

  if (
    currentValue === null
  ) {
    return false;
  }

  return (
    String(configuredValue) ===
    String(currentValue)
  );
};


const calculateSpecificityScore = (
  level
) => {
  let score = 0;

  if (level.team_id) {
    score += CONTEXT_WEIGHTS.team_id;
  }

  if (level.age_group) {
    score += CONTEXT_WEIGHTS.age_group;
  }

  if (level.player_type) {
    score += CONTEXT_WEIGHTS.player_type;
  }

  return score;
};


const getContextKey = (
  level
) =>
  [
    level.team_id || '*',
    level.age_group || '*',
    level.player_type || '*',
  ].join('|');


const getContextLabel = (
  level
) => {
  const parts = [];

  if (level.team_id) {
    parts.push('Equipa');
  }

  if (level.age_group) {
    parts.push(level.age_group);
  }

  if (level.player_type) {
    parts.push(
      level.player_type ===
        'goalkeeper'
        ? 'Guarda-redes'
        : 'Jogador de campo'
    );
  }

  if (parts.length === 0) {
    return 'Padrão geral';
  }

  return parts.join(' · ');
};


/**
 * Resolve o intervalo esperado mais específico aplicável.
 *
 * Ordem prática:
 *
 * 1. equipa + escalão + tipo
 * 2. equipa + escalão
 * 3. equipa + tipo
 * 4. equipa
 * 5. escalão + tipo
 * 6. escalão
 * 7. tipo
 * 8. geral
 */
export function resolveExpectedLevel({
  expectedLevels = [],
  teamId = null,
  ageGroup = null,
  playerType = null,
} = {}) {
  const normalizedTeamId =
    normalizeTeamId(
      teamId
    );

  const normalizedAgeGroup =
    normalizeAgeGroup(
      ageGroup
    );

  const normalizedPlayerType =
    normalizePlayerType(
      playerType
    );

  const normalizedLevels =
    normalizeExpectedLevels(
      expectedLevels
    );

  const applicableLevels =
    normalizedLevels.filter(
      (level) =>
        contextMatches(
          level.team_id,
          normalizedTeamId
        ) &&
        contextMatches(
          level.age_group,
          normalizedAgeGroup
        ) &&
        contextMatches(
          level.player_type,
          normalizedPlayerType
        )
    );

  if (
    applicableLevels.length === 0
  ) {
    return null;
  }

  const orderedLevels =
    [...applicableLevels].sort(
      (
        first,
        second
      ) => {
        const specificityDifference =
          calculateSpecificityScore(
            second
          ) -
          calculateSpecificityScore(
            first
          );

        if (
          specificityDifference !==
          0
        ) {
          return specificityDifference;
        }

        /*
         * Critério de desempate:
         * preferir o intervalo mais exigente,
         * isto é, com mínimo superior.
         */
        const minimumDifference =
          second.minimum -
          first.minimum;

        if (
          minimumDifference !== 0
        ) {
          return minimumDifference;
        }

        return (
          second.maximum -
          first.maximum
        );
      }
    );

  const selected =
    orderedLevels[0];

  return {
    minimum:
      selected.minimum,

    maximum:
      selected.maximum,

    ageGroup:
      selected.age_group,

    playerType:
      selected.player_type,

    teamId:
      selected.team_id,

    specificityScore:
      calculateSpecificityScore(
        selected
      ),

    contextKey:
      getContextKey(
        selected
      ),

    contextLabel:
      getContextLabel(
        selected
      ),

    source:
      'criterion_expected_levels',
  };
}


/**
 * Compara um valor atual com o intervalo esperado.
 */
export function compareScoreWithExpectedLevel({
  score,
  expectedLevel,
} = {}) {
  const numericScore =
    asFiniteNumber(
      score
    );

  if (
    numericScore === null ||
    !expectedLevel
  ) {
    return {
      status:
        'not_configured',

      label:
        'Sem nível esperado',

      differenceToMinimum:
        null,

      differenceToMaximum:
        null,

      distance:
        null,
    };
  }

  const minimum =
    asFiniteNumber(
      expectedLevel.minimum
    );

  const maximum =
    asFiniteNumber(
      expectedLevel.maximum
    );

  if (
    minimum === null ||
    maximum === null ||
    minimum >= maximum
  ) {
    return {
      status:
        'not_configured',

      label:
        'Sem nível esperado',

      differenceToMinimum:
        null,

      differenceToMaximum:
        null,

      distance:
        null,
    };
  }

  const differenceToMinimum =
    Number(
      (
        numericScore -
        minimum
      ).toFixed(2)
    );

  const differenceToMaximum =
    Number(
      (
        numericScore -
        maximum
      ).toFixed(2)
    );

  if (
    numericScore <
    minimum
  ) {
    return {
      status:
        'below_expected',

      label:
        'Abaixo do esperado',

      differenceToMinimum,

      differenceToMaximum,

      distance:
        Math.abs(
          differenceToMinimum
        ),
    };
  }

  if (
    numericScore >
    maximum
  ) {
    return {
      status:
        'above_expected',

      label:
        'Acima do esperado',

      differenceToMinimum,

      differenceToMaximum,

      distance:
        Math.abs(
          differenceToMaximum
        ),
    };
  }

  return {
    status:
      'within_expected',

    label:
      'Dentro do esperado',

    differenceToMinimum,

    differenceToMaximum,

    distance: 0,
  };
}


/**
 * Resolve e compara numa única chamada.
 */
export function resolveAndCompareExpectedLevel({
  expectedLevels = [],
  score,
  teamId = null,
  ageGroup = null,
  playerType = null,
} = {}) {
  const expectedLevel =
    resolveExpectedLevel({
      expectedLevels,
      teamId,
      ageGroup,
      playerType,
    });

  const comparison =
    compareScoreWithExpectedLevel({
      score,
      expectedLevel,
    });

  return {
    expectedLevel,
    comparison,
  };
}


/**
 * Devolve a descrição curta do intervalo.
 */
export function formatExpectedLevel(
  expectedLevel,
  decimals = 1
) {
  if (!expectedLevel) {
    return 'Sem nível esperado';
  }

  const minimum =
    asFiniteNumber(
      expectedLevel.minimum
    );

  const maximum =
    asFiniteNumber(
      expectedLevel.maximum
    );

  if (
    minimum === null ||
    maximum === null
  ) {
    return 'Sem nível esperado';
  }

  return (
    `${minimum.toFixed(decimals)}` +
    '–' +
    `${maximum.toFixed(decimals)}`
  );
}


/**
 * Expõe normalizadores para utilização controlada
 * noutros módulos do Centro de Desenvolvimento.
 */
export const expectedLevelResolverUtils = {
  normalizeAgeGroup,
  normalizePlayerType,
  normalizeTeamId,
  normalizeExpectedLevel,
  normalizeExpectedLevels,
};
