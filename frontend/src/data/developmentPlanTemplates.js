export const DEVELOPMENT_PLAN_TEMPLATES = [
  {
    id: 'initial_field',
    label: 'Avaliação inicial — Jogadores de campo',
    description: 'Diagnóstico equilibrado para início de época.',
    config: { player_type: 'field', season_moment: 'initial', objective: 'initial' },
  },
  {
    id: 'technical_field',
    label: 'Desenvolvimento técnico',
    description: 'Foco na patinagem, domínio de bola e execução técnica.',
    config: { player_type: 'field', season_moment: 'intermediate', objective: 'technical' },
  },
  {
    id: 'tactical_field',
    label: 'Desenvolvimento tático',
    description: 'Foco na perceção, decisão e jogo coletivo.',
    config: { player_type: 'field', season_moment: 'intermediate', objective: 'tactical' },
  },
  {
    id: 'individual_development',
    label: 'Desenvolvimento individual',
    description: 'Plano transversal para orientar objetivos individuais.',
    config: { player_type: 'field', season_moment: 'intermediate', objective: 'individual' },
  },
  {
    id: 'goalkeeper',
    label: 'Avaliação de guarda-redes',
    description: 'Competências específicas da posição de guarda-redes.',
    config: { player_type: 'goalkeeper', season_moment: 'intermediate', objective: 'goalkeeper' },
  },
  {
    id: 'final_field',
    label: 'Avaliação final — Jogadores de campo',
    description: 'Balanço global do desenvolvimento no final da época.',
    config: { player_type: 'field', season_moment: 'final', objective: 'final' },
  },
];

export const DEVELOPMENT_AGE_GROUPS = [
  { value: 'initiation', label: 'Iniciação' },
  { value: 'benjamins', label: 'Benjamins' },
  { value: 'school', label: 'Escolares' },
  { value: 'sub13', label: 'Sub-13' },
  { value: 'sub15', label: 'Sub-15' },
  { value: 'sub17', label: 'Sub-17' },
  { value: 'sub19', label: 'Sub-19' },
  { value: 'senior', label: 'Seniores' },
];

export const DEVELOPMENT_PLAYER_TYPES = [
  { value: 'all', label: 'Todos os atletas' },
  { value: 'field', label: 'Jogadores de campo' },
  { value: 'goalkeeper', label: 'Guarda-redes' },
];

export const DEVELOPMENT_SEASON_MOMENTS = [
  { value: 'preseason', label: 'Pré-época' },
  { value: 'initial', label: 'Início da época' },
  { value: 'intermediate', label: 'Avaliação intermédia' },
  { value: 'final', label: 'Final da época' },
  { value: 'extraordinary', label: 'Extraordinária' },
];

export const DEVELOPMENT_EVALUATION_OBJECTIVES = [
  { value: 'initial', label: 'Avaliação inicial' },
  { value: 'diagnostic', label: 'Avaliação diagnóstica' },
  { value: 'intermediate', label: 'Avaliação intermédia' },
  { value: 'final', label: 'Avaliação final' },
  { value: 'technical', label: 'Desenvolvimento técnico' },
  { value: 'tactical', label: 'Desenvolvimento tático' },
  { value: 'individual', label: 'Desenvolvimento individual' },
  { value: 'goalkeeper', label: 'Avaliação de guarda-redes' },
];

const OBJECTIVE_CATEGORY_PRIORITY = {
  initial: ['technical', 'tactical', 'physical', 'psychological', 'attitude', 'other'],
  diagnostic: ['technical', 'tactical', 'physical', 'psychological', 'attitude', 'other'],
  intermediate: ['technical', 'tactical', 'attitude', 'psychological', 'physical', 'other'],
  final: ['technical', 'tactical', 'attitude', 'psychological', 'physical', 'other'],
  technical: ['technical', 'other'],
  tactical: ['tactical', 'other'],
  individual: ['technical', 'tactical', 'psychological', 'attitude', 'other'],
  goalkeeper: ['technical', 'tactical', 'psychological', 'attitude', 'other'],
};

const OBJECTIVE_DOMAIN_TOKENS = {
  technical: ['patinagem', 'skating', 'tecnica', 'técnica', 'bola', 'remate', 'passe', 'rececao', 'receção'],
  tactical: ['percecao', 'perceção', 'decisao', 'decisão', 'coletivo', 'collective', 'tatico', 'tático'],
  individual: ['comportamento', 'behavior', 'percecao', 'perceção', 'decisao', 'decisão', 'tecnica', 'técnica'],
  goalkeeper: ['guarda-redes', 'guarda redes', 'goalkeeper', 'gr'],
};

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function criterionSearchText(criterion) {
  return normalizeText([
    criterion.name,
    criterion.description,
    criterion.category,
    criterion.domain,
    criterion.domain_label,
    criterion.domainLabel,
    criterion.subdomain,
    criterion.subdomain_label,
    criterion.subdomainLabel,
    criterion.source_code,
    criterion.sourceCode,
    criterion.code,
  ].join(' '));
}

function getCriterionPlayerType(criterion) {
  const explicit = criterion.player_type || criterion.playerType || criterion.position || criterion.athlete_type;
  const normalizedExplicit = normalizeText(explicit);

  if (['goalkeeper', 'guarda-redes', 'guarda redes', 'gr'].includes(normalizedExplicit)) {
    return 'goalkeeper';
  }

  if (['all', 'todos'].includes(normalizedExplicit)) {
    return 'all';
  }

  const searchable = criterionSearchText(criterion);
  return searchable.includes('guarda-redes') || searchable.includes('guarda redes') || searchable.includes('goalkeeper')
    ? 'goalkeeper'
    : 'field';
}

function criterionMatchesPlayerType(criterion, playerType) {
  if (playerType === 'all') return true;
  const criterionType = getCriterionPlayerType(criterion);
  if (playerType === 'goalkeeper') return criterionType === 'goalkeeper' || criterionType === 'all';
  return criterionType !== 'goalkeeper';
}

function getSuggestedLimit(ageGroup, objective) {
  if (objective === 'technical' || objective === 'tactical') return 16;
  if (objective === 'goalkeeper') return 12;
  if (ageGroup === 'initiation' || ageGroup === 'benjamins') return 12;
  if (ageGroup === 'school' || ageGroup === 'sub13') return 16;
  if (ageGroup === 'sub15') return 20;
  if (ageGroup === 'sub17' || ageGroup === 'sub19') return 24;
  return 26;
}

function getCriterionScore(criterion, config, index) {
  const category = criterion.category || 'other';
  const priorities = OBJECTIVE_CATEGORY_PRIORITY[config.objective] || OBJECTIVE_CATEGORY_PRIORITY.initial;
  const categoryIndex = priorities.indexOf(category);
  const searchable = criterionSearchText(criterion);
  const domainTokens = OBJECTIVE_DOMAIN_TOKENS[config.objective] || [];

  let score = categoryIndex === -1 ? 0 : 120 - categoryIndex * 15;
  score += domainTokens.reduce((total, token) => total + (searchable.includes(normalizeText(token)) ? 18 : 0), 0);

  if (config.player_type === 'goalkeeper' && getCriterionPlayerType(criterion) === 'goalkeeper') score += 100;
  if (config.player_type === 'field' && getCriterionPlayerType(criterion) === 'field') score += 20;
  if (config.season_moment === 'preseason' && ['physical', 'technical'].includes(category)) score += 10;
  if (config.season_moment === 'final' && ['attitude', 'psychological', 'tactical'].includes(category)) score += 8;

  return score - index * 0.0001;
}

export function getDevelopmentTemplate(templateId) {
  return DEVELOPMENT_PLAN_TEMPLATES.find((template) => template.id === templateId) || null;
}

export function applyDevelopmentPlanTemplate(currentConfig, templateId) {
  const template = getDevelopmentTemplate(templateId);
  if (!template) return { ...currentConfig, template_id: 'custom' };
  return { ...currentConfig, ...template.config, template_id: template.id };
}

export function buildIntelligentEvaluationPlan(criteria, config) {
  const compatible = (Array.isArray(criteria) ? criteria : []).filter((criterion) =>
    criterionMatchesPlayerType(criterion, config.player_type)
  );

  const ranked = compatible
    .map((criterion, index) => ({ criterion, score: getCriterionScore(criterion, config, index) }))
    .sort((a, b) => b.score - a.score || String(a.criterion.name || '').localeCompare(String(b.criterion.name || ''), 'pt'));

  const limit = getSuggestedLimit(config.age_group, config.objective);
  const selected = ranked.slice(0, limit).map(({ criterion, score }, index) => ({
    criterion_id: criterion.id,
    weight: score >= 120 ? 1.5 : 1,
    required: true,
    order: index,
  }));

  const objectiveLabel = DEVELOPMENT_EVALUATION_OBJECTIVES.find((item) => item.value === config.objective)?.label || 'Avaliação';
  const ageGroupLabel = DEVELOPMENT_AGE_GROUPS.find((item) => item.value === config.age_group)?.label || '';
  const template = getDevelopmentTemplate(config.template_id);

  const category =
    config.objective === 'technical' ? 'technical' :
    config.objective === 'tactical' ? 'tactical' :
    config.player_type === 'goalkeeper' || config.objective === 'goalkeeper' ? 'goalkeeper' :
    'training';

  return {
    criteria: selected,
    name: `${objectiveLabel} — ${ageGroupLabel}`,
    description: template?.description || '',
    category,
    estimated_minutes: Math.max(5, Math.ceil(selected.length * 0.5)),
    template,
  };
}
