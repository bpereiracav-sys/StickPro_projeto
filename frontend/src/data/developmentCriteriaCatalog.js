export const DEVELOPMENT_CONTEXTS = [
  { id: 'technical_training', label: 'Treino técnico' },
  { id: 'functional_training', label: 'Treino funcional' },
  { id: 'game', label: 'Jogo' },
  { id: 'official_competition', label: 'Competição oficial' },
];

export const DEVELOPMENT_PLAYER_TYPES = [
  { id: 'field_player', label: 'Jogador de campo' },
  { id: 'goalkeeper', label: 'Guarda-redes' },
  { id: 'all', label: 'Todos' },
];

export const DEVELOPMENT_SCALE = [
  {
    value: 1,
    label: 'Não executa',
    description:
      'Não consegue realizar a ação, mesmo em contexto facilitado.',
  },
  {
    value: 2,
    label: 'Executa com dificuldade',
    description:
      'Realiza parcialmente, com erros frequentes ou necessidade de apoio.',
  },
  {
    value: 3,
    label: 'Executa sem pressão',
    description:
      'Realiza corretamente em contexto controlado ou sem oposição relevante.',
  },
  {
    value: 4,
    label: 'Executa sob pressão',
    description:
      'Realiza corretamente com oposição, velocidade ou exigência contextual.',
  },
  {
    value: 5,
    label: 'Executa e cria vantagem',
    description:
      'Realiza de forma consistente e usa a ação para criar vantagem no jogo.',
  },
];

const createCriterion = ({
  code,
  name,
  domain,
  domainLabel,
  subdomain,
  subdomainLabel,
  description,
  playerType = 'field_player',
  contexts = [],
}) => ({
  code,
  name,
  domain,
  domainLabel,
  subdomain,
  subdomainLabel,
  description,
  observableAction: name,
  playerType,
  contexts,
  recommendedAgeGroups: [],
  scale: {
    min: 1,
    max: 5,
    type: 'universal_development_scale',
  },
  defaultWeight: 1,
  isSystem: true,
  isActive: true,
  exercises: [],
  videos: [],
});

export const DEVELOPMENT_CRITERIA_CATALOG = [
  // 1. PATINAGEM
  createCriterion({
    code: 'SKA-MOV-001',
    name: 'Patina para a frente com controlo',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'movement',
    subdomainLabel: 'Deslocamento',
    description:
      'Avalia a capacidade de avançar com estabilidade, coordenação e controlo corporal.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'SKA-MOV-002',
    name: 'Patina para trás com controlo',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'movement',
    subdomainLabel: 'Deslocamento',
    description:
      'Avalia a capacidade de deslocação para trás mantendo equilíbrio e controlo.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'SKA-MOV-003',
    name: 'Acelera em linha reta',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'movement',
    subdomainLabel: 'Deslocamento',
    description:
      'Avalia a capacidade de aumentar rapidamente a velocidade em trajetória linear.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'SKA-MOV-004',
    name: 'Desacelera mantendo o equilíbrio',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'movement',
    subdomainLabel: 'Deslocamento',
    description:
      'Avalia a capacidade de reduzir a velocidade sem perder estabilidade corporal.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'SKA-MOV-005',
    name: 'Muda da frente para trás',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'movement',
    subdomainLabel: 'Deslocamento',
    description:
      'Avalia a transição da patinagem frontal para a patinagem de costas.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'SKA-MOV-006',
    name: 'Muda de trás para a frente',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'movement',
    subdomainLabel: 'Deslocamento',
    description:
      'Avalia a transição da patinagem de costas para a patinagem frontal.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'SKA-MOV-007',
    name: 'Desloca-se lateralmente com estabilidade',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'movement',
    subdomainLabel: 'Deslocamento',
    description:
      'Avalia o controlo e a estabilidade durante deslocamentos laterais.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),

  createCriterion({
    code: 'SKA-DIR-001',
    name: 'Muda de direção para a direita sem perder o controlo',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'direction_change',
    subdomainLabel: 'Mudança de direção',
    description:
      'Avalia a mudança de direção para a direita mantendo controlo corporal e trajetória.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'SKA-DIR-002',
    name: 'Muda de direção para a esquerda sem perder o controlo',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'direction_change',
    subdomainLabel: 'Mudança de direção',
    description:
      'Avalia a mudança de direção para a esquerda mantendo controlo corporal e trajetória.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'SKA-DIR-003',
    name: 'Muda de direção em velocidade',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'direction_change',
    subdomainLabel: 'Mudança de direção',
    description:
      'Avalia a capacidade de alterar a direção sem perda relevante de velocidade ou equilíbrio.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'SKA-DIR-004',
    name: 'Muda de direção com bola',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'direction_change',
    subdomainLabel: 'Mudança de direção',
    description:
      'Avalia a capacidade de alterar a direção mantendo controlo da bola.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'SKA-DIR-005',
    name: 'Executa curva fechada mantendo a posse de bola',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'direction_change',
    subdomainLabel: 'Mudança de direção',
    description:
      'Avalia a execução de curvas fechadas com controlo corporal e manutenção da posse.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'SKA-DIR-006',
    name: 'Roda sobre si próprio para mudar de direção',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'direction_change',
    subdomainLabel: 'Mudança de direção',
    description:
      'Avalia a rotação corporal utilizada para alterar rapidamente a orientação do deslocamento.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
    createCriterion({
    code: 'SKA-BRA-001',
    name: 'Executa travagem para a direita',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'braking',
    subdomainLabel: 'Travagens',
    description:
      'Avalia a capacidade de travar para a direita com controlo, equilíbrio e segurança.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'SKA-BRA-002',
    name: 'Executa travagem para a esquerda',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'braking',
    subdomainLabel: 'Travagens',
    description:
      'Avalia a capacidade de travar para a esquerda com controlo, equilíbrio e segurança.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'SKA-BRA-003',
    name: 'Trava em velocidade',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'braking',
    subdomainLabel: 'Travagens',
    description:
      'Avalia a capacidade de reduzir rapidamente a velocidade sem perda de equilíbrio.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'SKA-BRA-004',
    name: 'Trava com bola controlada',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'braking',
    subdomainLabel: 'Travagens',
    description:
      'Avalia a capacidade de travar mantendo a bola sob controlo.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'SKA-BRA-005',
    name: 'Trava sob pressão adversária',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'braking',
    subdomainLabel: 'Travagens',
    description:
      'Avalia a capacidade de travar corretamente quando pressionado por um adversário.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),

  createCriterion({
    code: 'SKA-BAL-001',
    name: 'Mantém equilíbrio em apoio bilateral',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'balance',
    subdomainLabel: 'Equilíbrio',
    description:
      'Avalia a estabilidade corporal com os dois patins apoiados.',
    contexts: ['technical_training', 'functional_training'],
  }),
  createCriterion({
    code: 'SKA-BAL-002',
    name: 'Mantém equilíbrio em apoio unilateral',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'balance',
    subdomainLabel: 'Equilíbrio',
    description:
      'Avalia a estabilidade corporal com apoio predominante num só patim.',
    contexts: ['technical_training', 'functional_training'],
  }),
  createCriterion({
    code: 'SKA-BAL-003',
    name: 'Mantém equilíbrio após contacto',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'balance',
    subdomainLabel: 'Equilíbrio',
    description:
      'Avalia a capacidade de conservar estabilidade após contacto físico permitido.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'SKA-BAL-004',
    name: 'Recupera o equilíbrio após desequilíbrio',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'balance',
    subdomainLabel: 'Equilíbrio',
    description:
      'Avalia a capacidade de recuperar rapidamente uma posição corporal estável.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'SKA-BAL-005',
    name: 'Protege a bola mantendo estabilidade corporal',
    domain: 'skating',
    domainLabel: 'Patinagem',
    subdomain: 'balance',
    subdomainLabel: 'Equilíbrio',
    description:
      'Avalia a utilização do corpo e do equilíbrio para proteger a posse de bola.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),

  // 2. TÉCNICA INDIVIDUAL
  createCriterion({
    code: 'TEC-BAL-001',
    name: 'Conduz a bola em linha reta',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'ball_control',
    subdomainLabel: 'Controlo de bola',
    description:
      'Avalia a condução da bola em trajetória linear com controlo e continuidade.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'TEC-BAL-002',
    name: 'Conduz a bola com a direita',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'ball_control',
    subdomainLabel: 'Controlo de bola',
    description:
      'Avalia a capacidade de conduzir a bola predominantemente pelo lado direito.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'TEC-BAL-003',
    name: 'Conduz a bola com a esquerda',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'ball_control',
    subdomainLabel: 'Controlo de bola',
    description:
      'Avalia a capacidade de conduzir a bola predominantemente pelo lado esquerdo.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'TEC-BAL-004',
    name: 'Alterna a condução entre direita e esquerda',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'ball_control',
    subdomainLabel: 'Controlo de bola',
    description:
      'Avalia a alternância de lados durante a condução, sem perder a posse.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'TEC-BAL-005',
    name: 'Conduz a bola em velocidade',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'ball_control',
    subdomainLabel: 'Controlo de bola',
    description:
      'Avalia o controlo da bola durante deslocamentos realizados a velocidade elevada.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'TEC-BAL-006',
    name: 'Conduz a bola sob pressão',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'ball_control',
    subdomainLabel: 'Controlo de bola',
    description:
      'Avalia a manutenção da posse durante a pressão direta de um adversário.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'TEC-BAL-007',
    name: 'Recebe a bola e mantém o controlo',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'ball_control',
    subdomainLabel: 'Controlo de bola',
    description:
      'Avalia a qualidade do primeiro contacto e a conservação imediata da posse.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),

  createCriterion({
    code: 'TEC-PAS-001',
    name: 'Executa passe curto com precisão',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'passing',
    subdomainLabel: 'Passe',
    description:
      'Avalia a precisão do passe a curta distância.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'TEC-PAS-002',
    name: 'Executa passe longo com precisão',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'passing',
    subdomainLabel: 'Passe',
    description:
      'Avalia a precisão e a força adequada em passes de maior distância.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'TEC-PAS-003',
    name: 'Executa passe em movimento',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'passing',
    subdomainLabel: 'Passe',
    description:
      'Avalia a capacidade de passar sem interromper o deslocamento.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'TEC-PAS-004',
    name: 'Executa passe após mudança de direção',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'passing',
    subdomainLabel: 'Passe',
    description:
      'Avalia a capacidade de realizar um passe eficaz após alteração de trajetória.',
    contexts: ['functional_training', 'game'],
  }),
  createCriterion({
    code: 'TEC-PAS-005',
    name: 'Executa passe sob pressão',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'passing',
    subdomainLabel: 'Passe',
    description:
      'Avalia a precisão e a decisão técnica do passe perante oposição direta.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'TEC-PAS-006',
    name: 'Executa passe para o espaço livre',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'passing',
    subdomainLabel: 'Passe',
    description:
      'Avalia a capacidade de colocar a bola num espaço vantajoso para o colega.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'TEC-PAS-007',
    name: 'Executa passe de primeira',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'passing',
    subdomainLabel: 'Passe',
    description:
      'Avalia a capacidade de passar a bola sem controlo prévio prolongado.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),

  createCriterion({
    code: 'TEC-REC-001',
    name: 'Recebe passe frontal',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'reception',
    subdomainLabel: 'Receção',
    description:
      'Avalia a receção de uma bola proveniente da frente.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'TEC-REC-002',
    name: 'Recebe passe lateral',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'reception',
    subdomainLabel: 'Receção',
    description:
      'Avalia a capacidade de controlar uma bola recebida lateralmente.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'TEC-REC-003',
    name: 'Recebe passe em movimento',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'reception',
    subdomainLabel: 'Receção',
    description:
      'Avalia a receção da bola sem interromper a progressão.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'TEC-REC-004',
    name: 'Orienta a receção para o espaço livre',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'reception',
    subdomainLabel: 'Receção',
    description:
      'Avalia a capacidade de utilizar o primeiro toque para orientar a jogada.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'TEC-REC-005',
    name: 'Recebe sob pressão sem perder a bola',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'reception',
    subdomainLabel: 'Receção',
    description:
      'Avalia o controlo da bola durante a receção perante pressão adversária.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),

  createCriterion({
    code: 'TEC-SHO-001',
    name: 'Executa remate frontal',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'shooting',
    subdomainLabel: 'Remate',
    description:
      'Avalia a execução técnica do remate frontal à baliza.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'TEC-SHO-002',
    name: 'Executa remate cruzado',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'shooting',
    subdomainLabel: 'Remate',
    description:
      'Avalia a execução de remate dirigido ao lado oposto da trajetória do jogador.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'TEC-SHO-003',
    name: 'Executa remate de primeira',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'shooting',
    subdomainLabel: 'Remate',
    description:
      'Avalia a capacidade de rematar sem realizar controlo prolongado da bola.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'TEC-SHO-004',
    name: 'Executa remate em movimento',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'shooting',
    subdomainLabel: 'Remate',
    description:
      'Avalia a capacidade de rematar com eficácia durante o deslocamento.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'TEC-SHO-005',
    name: 'Executa remate sob pressão',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'shooting',
    subdomainLabel: 'Remate',
    description:
      'Avalia a capacidade de finalizar perante oposição próxima.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'TEC-SHO-006',
    name: 'Coloca o remate longe do alcance do guarda-redes',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'shooting',
    subdomainLabel: 'Remate',
    description:
      'Avalia a precisão do remate para zonas de difícil defesa.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'TEC-SHO-007',
    name: 'Varia a potência do remate',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'shooting',
    subdomainLabel: 'Remate',
    description:
      'Avalia a capacidade de ajustar a força do remate à distância e ao contexto.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),

  createCriterion({
    code: 'TEC-DRI-001',
    name: 'Executa finta para a direita',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'dribbling',
    subdomainLabel: 'Finta e drible',
    description:
      'Avalia a capacidade de ultrapassar ou desequilibrar o adversário pelo lado direito.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'TEC-DRI-002',
    name: 'Executa finta para a esquerda',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'dribbling',
    subdomainLabel: 'Finta e drible',
    description:
      'Avalia a capacidade de ultrapassar ou desequilibrar o adversário pelo lado esquerdo.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
  createCriterion({
    code: 'TEC-DRI-003',
    name: 'Muda de ritmo durante o drible',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'dribbling',
    subdomainLabel: 'Finta e drible',
    description:
      'Avalia a utilização da aceleração e desaceleração para superar o adversário.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'TEC-DRI-004',
    name: 'Protege a bola durante o drible',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'dribbling',
    subdomainLabel: 'Finta e drible',
    description:
      'Avalia a capacidade de manter a posse enquanto conduz a bola perante oposição.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'TEC-DRI-005',
    name: 'Ultrapassa um adversário em situação de um contra um',
    domain: 'individual_technique',
    domainLabel: 'Técnica Individual',
    subdomain: 'dribbling',
    subdomainLabel: 'Finta e drible',
    description:
      'Avalia a eficácia técnica na superação direta de um adversário.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),

  // 3. PERCEÇÃO
  createCriterion({
    code: 'PER-VIS-001',
    name: 'Observa o espaço antes de receber a bola',
    domain: 'perception',
    domainLabel: 'Perceção',
    subdomain: 'visual_scanning',
    subdomainLabel: 'Leitura visual',
    description:
      'Avalia a procura visual de informação antes da receção da bola.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'PER-VIS-002',
    name: 'Identifica colegas livres',
    domain: 'perception',
    domainLabel: 'Perceção',
    subdomain: 'visual_scanning',
    subdomainLabel: 'Leitura visual',
    description:
      'Avalia a capacidade de reconhecer colegas disponíveis para receber passe.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'PER-VIS-003',
    name: 'Identifica adversários próximos',
    domain: 'perception',
    domainLabel: 'Perceção',
    subdomain: 'visual_scanning',
    subdomainLabel: 'Leitura visual',
    description:
      'Avalia a capacidade de reconhecer a pressão e a proximidade dos adversários.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'PER-VIS-004',
    name: 'Identifica espaços livres para progredir',
    domain: 'perception',
    domainLabel: 'Perceção',
    subdomain: 'visual_scanning',
    subdomainLabel: 'Leitura visual',
    description:
      'Avalia a leitura dos espaços disponíveis para deslocamento com ou sem bola.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'PER-VIS-005',
    name: 'Mantém atenção à bola e ao contexto envolvente',
    domain: 'perception',
    domainLabel: 'Perceção',
    subdomain: 'visual_scanning',
    subdomainLabel: 'Leitura visual',
    description:
      'Avalia a capacidade de acompanhar simultaneamente a bola e a organização do jogo.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),

  createCriterion({
    code: 'PER-ANT-001',
    name: 'Antecipa a trajetória da bola',
    domain: 'perception',
    domainLabel: 'Perceção',
    subdomain: 'anticipation',
    subdomainLabel: 'Antecipação',
    description:
      'Avalia a capacidade de prever o percurso provável da bola.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'PER-ANT-002',
    name: 'Antecipa o movimento do adversário',
    domain: 'perception',
    domainLabel: 'Perceção',
    subdomain: 'anticipation',
    subdomainLabel: 'Antecipação',
    description:
      'Avalia a capacidade de prever a ação ou o deslocamento do adversário.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'PER-ANT-003',
    name: 'Antecipa o movimento do colega',
    domain: 'perception',
    domainLabel: 'Perceção',
    subdomain: 'anticipation',
    subdomainLabel: 'Antecipação',
    description:
      'Avalia a capacidade de prever a ação ou o deslocamento de um colega.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'PER-ANT-004',
    name: 'Reconhece antecipadamente uma situação de perigo',
    domain: 'perception',
    domainLabel: 'Perceção',
    subdomain: 'anticipation',
    subdomainLabel: 'Antecipação',
    description:
      'Avalia a identificação precoce de situações que podem criar vantagem ao adversário.',
    contexts: ['game', 'official_competition'],
  }),
  createCriterion({
    code: 'PER-ANT-005',
    name: 'Reconhece antecipadamente uma oportunidade de ataque',
    domain: 'perception',
    domainLabel: 'Perceção',
    subdomain: 'anticipation',
    subdomainLabel: 'Antecipação',
    description:
      'Avalia a identificação precoce de condições favoráveis à criação de perigo.',
    contexts: ['game', 'official_competition'],
  }),
    // 4. DECISÃO
  createCriterion({
    code: 'DEC-CHO-001',
    name: 'Escolhe entre passar e conduzir',
    domain: 'decision',
    domainLabel: 'Decisão',
    subdomain: 'choice',
    subdomainLabel: 'Escolha da ação',
    description:
      'Avalia a capacidade de selecionar entre passe e condução de acordo com o contexto.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'DEC-CHO-002',
    name: 'Escolhe entre rematar e passar',
    domain: 'decision',
    domainLabel: 'Decisão',
    subdomain: 'choice',
    subdomainLabel: 'Escolha da ação',
    description:
      'Avalia a seleção entre finalização e continuidade da jogada através do passe.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'DEC-CHO-003',
    name: 'Escolhe a direção de progressão mais vantajosa',
    domain: 'decision',
    domainLabel: 'Decisão',
    subdomain: 'choice',
    subdomainLabel: 'Escolha da ação',
    description:
      'Avalia a seleção do espaço ou da trajetória que oferece maior vantagem à equipa.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'DEC-CHO-004',
    name: 'Escolhe a ação de acordo com a pressão adversária',
    domain: 'decision',
    domainLabel: 'Decisão',
    subdomain: 'choice',
    subdomainLabel: 'Escolha da ação',
    description:
      'Avalia a adaptação da decisão ao tipo e à intensidade da pressão exercida.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'DEC-CHO-005',
    name: 'Evita ações de risco desnecessário',
    domain: 'decision',
    domainLabel: 'Decisão',
    subdomain: 'choice',
    subdomainLabel: 'Escolha da ação',
    description:
      'Avalia a capacidade de reconhecer e evitar decisões com risco superior ao benefício provável.',
    contexts: ['game', 'official_competition'],
  }),

  createCriterion({
    code: 'DEC-TIM-001',
    name: 'Executa a ação no momento adequado',
    domain: 'decision',
    domainLabel: 'Decisão',
    subdomain: 'timing',
    subdomainLabel: 'Timing',
    description:
      'Avalia se a ação é realizada no momento que maximiza a sua eficácia.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'DEC-TIM-002',
    name: 'Liberta a bola antes de perder a vantagem',
    domain: 'decision',
    domainLabel: 'Decisão',
    subdomain: 'timing',
    subdomainLabel: 'Timing',
    description:
      'Avalia a capacidade de passar ou rematar antes que a pressão elimine a vantagem.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'DEC-TIM-003',
    name: 'Temporiza quando não existe solução imediata',
    domain: 'decision',
    domainLabel: 'Decisão',
    subdomain: 'timing',
    subdomainLabel: 'Timing',
    description:
      'Avalia a capacidade de manter a posse e aguardar por uma solução mais favorável.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'DEC-TIM-004',
    name: 'Acelera a jogada quando surge vantagem',
    domain: 'decision',
    domainLabel: 'Decisão',
    subdomain: 'timing',
    subdomainLabel: 'Timing',
    description:
      'Avalia a capacidade de aumentar a velocidade da ação perante uma oportunidade favorável.',
    contexts: ['game', 'official_competition'],
  }),
  createCriterion({
    code: 'DEC-TIM-005',
    name: 'Atrasa a ação para criar uma melhor solução',
    domain: 'decision',
    domainLabel: 'Decisão',
    subdomain: 'timing',
    subdomainLabel: 'Timing',
    description:
      'Avalia a capacidade de controlar o tempo da jogada para melhorar as condições de execução.',
    contexts: ['game', 'official_competition'],
  }),

  createCriterion({
    code: 'DEC-ADA-001',
    name: 'Adapta a decisão à posição dos colegas',
    domain: 'decision',
    domainLabel: 'Decisão',
    subdomain: 'adaptation',
    subdomainLabel: 'Adaptação',
    description:
      'Avalia a capacidade de ajustar a ação à localização e disponibilidade dos colegas.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'DEC-ADA-002',
    name: 'Adapta a decisão à posição dos adversários',
    domain: 'decision',
    domainLabel: 'Decisão',
    subdomain: 'adaptation',
    subdomainLabel: 'Adaptação',
    description:
      'Avalia a capacidade de ajustar a ação à organização e ao posicionamento adversário.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'DEC-ADA-003',
    name: 'Adapta a decisão ao resultado do jogo',
    domain: 'decision',
    domainLabel: 'Decisão',
    subdomain: 'adaptation',
    subdomainLabel: 'Adaptação',
    description:
      'Avalia a adequação da decisão à situação momentânea do marcador.',
    contexts: ['game', 'official_competition'],
  }),
  createCriterion({
    code: 'DEC-ADA-004',
    name: 'Adapta a decisão ao tempo disponível',
    domain: 'decision',
    domainLabel: 'Decisão',
    subdomain: 'adaptation',
    subdomainLabel: 'Adaptação',
    description:
      'Avalia a capacidade de decidir de acordo com o tempo restante ou com a urgência da jogada.',
    contexts: ['game', 'official_competition'],
  }),

  // 5. JOGO COLETIVO
  createCriterion({
    code: 'COL-OFF-001',
    name: 'Oferece linha de passe ao portador da bola',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'offensive_organization',
    subdomainLabel: 'Organização ofensiva',
    description:
      'Avalia a capacidade de criar uma solução de passe através do posicionamento e movimento.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'COL-OFF-002',
    name: 'Ocupa espaço livre em ataque',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'offensive_organization',
    subdomainLabel: 'Organização ofensiva',
    description:
      'Avalia a ocupação racional de espaços disponíveis durante a organização ofensiva.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'COL-OFF-003',
    name: 'Mantém largura ofensiva',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'offensive_organization',
    subdomainLabel: 'Organização ofensiva',
    description:
      'Avalia a capacidade de ampliar o espaço de jogo através do posicionamento lateral.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'COL-OFF-004',
    name: 'Mantém profundidade ofensiva',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'offensive_organization',
    subdomainLabel: 'Organização ofensiva',
    description:
      'Avalia a capacidade de ocupar espaços em profundidade para alongar a organização adversária.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'COL-OFF-005',
    name: 'Realiza desmarcação de apoio',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'offensive_organization',
    subdomainLabel: 'Organização ofensiva',
    description:
      'Avalia o movimento para receber a bola em apoio ao portador.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'COL-OFF-006',
    name: 'Realiza desmarcação de rutura',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'offensive_organization',
    subdomainLabel: 'Organização ofensiva',
    description:
      'Avalia o movimento destinado a explorar espaço atrás ou entre adversários.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'COL-OFF-007',
    name: 'Cria espaço para a ação de um colega',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'offensive_organization',
    subdomainLabel: 'Organização ofensiva',
    description:
      'Avalia movimentos sem bola que libertam zonas favoráveis para outro jogador.',
    contexts: ['game', 'official_competition'],
  }),

  createCriterion({
    code: 'COL-DEF-001',
    name: 'Posiciona-se entre o adversário e a baliza',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'defensive_organization',
    subdomainLabel: 'Organização defensiva',
    description:
      'Avalia o posicionamento defensivo destinado a proteger a baliza.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'COL-DEF-002',
    name: 'Fecha a linha de passe',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'defensive_organization',
    subdomainLabel: 'Organização defensiva',
    description:
      'Avalia a capacidade de impedir ou dificultar uma opção de passe adversária.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'COL-DEF-003',
    name: 'Mantém distância defensiva adequada',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'defensive_organization',
    subdomainLabel: 'Organização defensiva',
    description:
      'Avalia a gestão da distância ao adversário para controlar a sua ação.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'COL-DEF-004',
    name: 'Realiza cobertura defensiva',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'defensive_organization',
    subdomainLabel: 'Organização defensiva',
    description:
      'Avalia o posicionamento de apoio ao colega que pressiona o portador da bola.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'COL-DEF-005',
    name: 'Realiza troca defensiva com um colega',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'defensive_organization',
    subdomainLabel: 'Organização defensiva',
    description:
      'Avalia a coordenação da mudança de marcação ou responsabilidade defensiva.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'COL-DEF-006',
    name: 'Ajuda a proteger a zona central',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'defensive_organization',
    subdomainLabel: 'Organização defensiva',
    description:
      'Avalia a contribuição para impedir progressões e finalizações na zona central.',
    contexts: ['game', 'official_competition'],
  }),

  createCriterion({
    code: 'COL-TRA-001',
    name: 'Reage imediatamente após recuperar a bola',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'transition',
    subdomainLabel: 'Transição',
    description:
      'Avalia a rapidez de reação coletiva após uma recuperação de posse.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'COL-TRA-002',
    name: 'Reage imediatamente após perder a bola',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'transition',
    subdomainLabel: 'Transição',
    description:
      'Avalia a rapidez de reação defensiva após perda de posse.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'COL-TRA-003',
    name: 'Apoia a saída rápida para o ataque',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'transition',
    subdomainLabel: 'Transição',
    description:
      'Avalia a disponibilidade para participar na progressão ofensiva após recuperação.',
    contexts: ['game', 'official_competition'],
  }),
  createCriterion({
    code: 'COL-TRA-004',
    name: 'Recupera rapidamente a posição defensiva',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'transition',
    subdomainLabel: 'Transição',
    description:
      'Avalia a capacidade de regressar a uma posição defensiva útil após perda da bola.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'COL-TRA-005',
    name: 'Identifica vantagem numérica na transição',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'transition',
    subdomainLabel: 'Transição',
    description:
      'Avalia a capacidade de reconhecer situações de superioridade ou inferioridade numérica.',
    contexts: ['game', 'official_competition'],
  }),

  createCriterion({
    code: 'COL-COM-001',
    name: 'Comunica uma opção de passe',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'communication',
    subdomainLabel: 'Comunicação',
    description:
      'Avalia a utilização de comunicação verbal ou gestual para solicitar ou indicar passe.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),
  createCriterion({
    code: 'COL-COM-002',
    name: 'Alerta colegas para situações de perigo',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'communication',
    subdomainLabel: 'Comunicação',
    description:
      'Avalia a capacidade de avisar a equipa sobre pressão, marcação ou risco iminente.',
    contexts: ['game', 'official_competition'],
  }),
  createCriterion({
    code: 'COL-COM-003',
    name: 'Orienta colegas durante a organização defensiva',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'communication',
    subdomainLabel: 'Comunicação',
    description:
      'Avalia a contribuição comunicacional para ajustar posicionamentos defensivos.',
    contexts: ['game', 'official_competition'],
  }),
  createCriterion({
    code: 'COL-COM-004',
    name: 'Responde adequadamente às indicações dos colegas',
    domain: 'collective_play',
    domainLabel: 'Jogo Coletivo',
    subdomain: 'communication',
    subdomainLabel: 'Comunicação',
    description:
      'Avalia a capacidade de compreender e aplicar informação comunicada pelos colegas.',
    contexts: ['functional_training', 'game', 'official_competition'],
  }),

  // 6. COMPORTAMENTO
  createCriterion({
    code: 'BEH-COM-001',
    name: 'Mantém empenho ao longo da sessão',
    domain: 'behavior',
    domainLabel: 'Comportamento',
    subdomain: 'commitment',
    subdomainLabel: 'Compromisso',
    description:
      'Avalia a consistência do esforço e da participação durante toda a atividade.',
    contexts: [
      'technical_training',
      'functional_training',
      'game',
      'official_competition',
    ],
  }),
  createCriterion({
    code: 'BEH-COM-002',
    name: 'Cumpre as tarefas propostas',
    domain: 'behavior',
    domainLabel: 'Comportamento',
    subdomain: 'commitment',
    subdomainLabel: 'Compromisso',
    description:
      'Avalia a adesão às tarefas e aos objetivos definidos pela equipa técnica.',
    contexts: ['technical_training', 'functional_training'],
  }),
  createCriterion({
    code: 'BEH-COM-003',
    name: 'Demonstra disponibilidade para aprender',
    domain: 'behavior',
    domainLabel: 'Comportamento',
    subdomain: 'commitment',
    subdomainLabel: 'Compromisso',
    description:
      'Avalia a abertura para adquirir, experimentar e consolidar novas competências.',
    contexts: ['technical_training', 'functional_training'],
  }),
  createCriterion({
    code: 'BEH-COM-004',
    name: 'Mantém concentração na tarefa',
    domain: 'behavior',
    domainLabel: 'Comportamento',
    subdomain: 'commitment',
    subdomainLabel: 'Compromisso',
    description:
      'Avalia a capacidade de permanecer atento aos objetivos da atividade.',
    contexts: [
      'technical_training',
      'functional_training',
      'game',
      'official_competition',
    ],
  }),

  createCriterion({
    code: 'BEH-DIS-001',
    name: 'Cumpre as regras da atividade',
    domain: 'behavior',
    domainLabel: 'Comportamento',
    subdomain: 'discipline',
    subdomainLabel: 'Disciplina',
    description:
      'Avalia o respeito pelas regras definidas para o treino ou competição.',
    contexts: [
      'technical_training',
      'functional_training',
      'game',
      'official_competition',
    ],
  }),
  createCriterion({
    code: 'BEH-DIS-002',
    name: 'Respeita as decisões da equipa técnica',
    domain: 'behavior',
    domainLabel: 'Comportamento',
    subdomain: 'discipline',
    subdomainLabel: 'Disciplina',
    description:
      'Avalia a aceitação das orientações e decisões dos treinadores.',
    contexts: [
      'technical_training',
      'functional_training',
      'game',
      'official_competition',
    ],
  }),
  createCriterion({
    code: 'BEH-DIS-003',
    name: 'Respeita as decisões da arbitragem',
    domain: 'behavior',
    domainLabel: 'Comportamento',
    subdomain: 'discipline',
    subdomainLabel: 'Disciplina',
    description:
      'Avalia o comportamento perante decisões arbitrais favoráveis ou desfavoráveis.',
    contexts: ['game', 'official_competition'],
  }),
  createCriterion({
    code: 'BEH-DIS-004',
    name: 'Controla comportamentos impulsivos',
    domain: 'behavior',
    domainLabel: 'Comportamento',
    subdomain: 'discipline',
    subdomainLabel: 'Disciplina',
    description:
      'Avalia a capacidade de evitar reações inadequadas ou precipitadas.',
    contexts: [
      'technical_training',
      'functional_training',
      'game',
      'official_competition',
    ],
  }),

  createCriterion({
    code: 'BEH-RES-001',
    name: 'Mantém o esforço após cometer um erro',
    domain: 'behavior',
    domainLabel: 'Comportamento',
    subdomain: 'resilience',
    subdomainLabel: 'Resiliência',
    description:
      'Avalia a capacidade de continuar envolvido e eficaz após uma falha.',
    contexts: [
      'technical_training',
      'functional_training',
      'game',
      'official_competition',
    ],
  }),
  createCriterion({
    code: 'BEH-RES-002',
    name: 'Recupera emocionalmente após uma situação adversa',
    domain: 'behavior',
    domainLabel: 'Comportamento',
    subdomain: 'resilience',
    subdomainLabel: 'Resiliência',
    description:
      'Avalia a capacidade de recuperar estabilidade emocional após uma contrariedade.',
    contexts: ['game', 'official_competition'],
  }),
  createCriterion({
    code: 'BEH-RES-003',
    name: 'Mantém confiança perante dificuldade',
    domain: 'behavior',
    domainLabel: 'Comportamento',
    subdomain: 'resilience',
    subdomainLabel: 'Resiliência',
    description:
      'Avalia a manutenção de confiança funcional perante oposição ou insucesso.',
    contexts: [
      'functional_training',
      'game',
      'official_competition',
    ],
  }),
  createCriterion({
    code: 'BEH-RES-004',
    name: 'Aceita feedback corretivo',
    domain: 'behavior',
    domainLabel: 'Comportamento',
    subdomain: 'resilience',
    subdomainLabel: 'Resiliência',
    description:
      'Avalia a capacidade de receber correções sem desorganização comportamental.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),

  createCriterion({
    code: 'BEH-TEA-001',
    name: 'Apoia os colegas',
    domain: 'behavior',
    domainLabel: 'Comportamento',
    subdomain: 'teamwork',
    subdomainLabel: 'Trabalho de equipa',
    description:
      'Avalia a disponibilidade para ajudar e encorajar os colegas.',
    contexts: [
      'technical_training',
      'functional_training',
      'game',
      'official_competition',
    ],
  }),
  createCriterion({
    code: 'BEH-TEA-002',
    name: 'Partilha responsabilidade pelo resultado coletivo',
    domain: 'behavior',
    domainLabel: 'Comportamento',
    subdomain: 'teamwork',
    subdomainLabel: 'Trabalho de equipa',
    description:
      'Avalia a capacidade de assumir responsabilidade sem culpabilizar individualmente os colegas.',
    contexts: ['game', 'official_competition'],
  }),
  createCriterion({
    code: 'BEH-TEA-003',
    name: 'Colabora com jogadores de diferentes funções',
    domain: 'behavior',
    domainLabel: 'Comportamento',
    subdomain: 'teamwork',
    subdomainLabel: 'Trabalho de equipa',
    description:
      'Avalia a cooperação com colegas que desempenham funções distintas.',
    contexts: [
      'technical_training',
      'functional_training',
      'game',
      'official_competition',
    ],
  }),
  createCriterion({
    code: 'BEH-TEA-004',
    name: 'Prioriza a solução coletiva',
    domain: 'behavior',
    domainLabel: 'Comportamento',
    subdomain: 'teamwork',
    subdomainLabel: 'Trabalho de equipa',
    description:
      'Avalia a escolha de ações que beneficiam a equipa em vez do resultado individual.',
    contexts: ['game', 'official_competition'],
  }),

  createCriterion({
    code: 'BEH-AUT-001',
    name: 'Prepara-se autonomamente para a atividade',
    domain: 'behavior',
    domainLabel: 'Comportamento',
    subdomain: 'autonomy',
    subdomainLabel: 'Autonomia',
    description:
      'Avalia a capacidade de organizar material, equipamento e preparação sem supervisão constante.',
    contexts: [
      'technical_training',
      'functional_training',
      'game',
      'official_competition',
    ],
  }),
  createCriterion({
    code: 'BEH-AUT-002',
    name: 'Identifica aspetos pessoais a melhorar',
    domain: 'behavior',
    domainLabel: 'Comportamento',
    subdomain: 'autonomy',
    subdomainLabel: 'Autonomia',
    description:
      'Avalia a capacidade de reconhecer necessidades próprias de desenvolvimento.',
    contexts: [
      'technical_training',
      'functional_training',
      'game',
      'official_competition',
    ],
  }),
  createCriterion({
    code: 'BEH-AUT-003',
    name: 'Aplica correções sem necessidade de repetição constante',
    domain: 'behavior',
    domainLabel: 'Comportamento',
    subdomain: 'autonomy',
    subdomainLabel: 'Autonomia',
    description:
      'Avalia a capacidade de integrar feedback e ajustar o comportamento de forma autónoma.',
    contexts: ['technical_training', 'functional_training', 'game'],
  }),
    // 7. GUARDA-REDES
  createCriterion({
    code: 'GK-POS-001',
    name: 'Adota posicionamento adequado em relação à bola',
    domain: 'goalkeeper',
    domainLabel: 'Guarda-redes',
    subdomain: 'goalkeeper_positioning',
    subdomainLabel: 'Posicionamento',
    description:
      'Avalia a capacidade de ajustar a posição na baliza à localização da bola, dos adversários e dos colegas.',
    playerType: 'goalkeeper',
    contexts: [
      'technical_training',
      'functional_training',
      'game',
      'official_competition',
    ],
  }),
  createCriterion({
    code: 'GK-SAV-001',
    name: 'Defende remates dirigidos à baliza',
    domain: 'goalkeeper',
    domainLabel: 'Guarda-redes',
    subdomain: 'goalkeeper_saving',
    subdomainLabel: 'Defesa',
    description:
      'Avalia a capacidade de impedir o golo através de uma intervenção tecnicamente adequada.',
    playerType: 'goalkeeper',
    contexts: [
      'technical_training',
      'functional_training',
      'game',
      'official_competition',
    ],
  }),
  createCriterion({
    code: 'GK-MOV-001',
    name: 'Desloca-se na área mantendo equilíbrio e prontidão',
    domain: 'goalkeeper',
    domainLabel: 'Guarda-redes',
    subdomain: 'goalkeeper_movement',
    subdomainLabel: 'Deslocamento',
    description:
      'Avalia a capacidade de se deslocar de forma equilibrada, mantendo disponibilidade para intervir.',
    playerType: 'goalkeeper',
    contexts: [
      'technical_training',
      'functional_training',
      'game',
      'official_competition',
    ],
  }),
  createCriterion({
    code: 'GK-DIS-001',
    name: 'Inicia a construção ofensiva com precisão',
    domain: 'goalkeeper',
    domainLabel: 'Guarda-redes',
    subdomain: 'goalkeeper_distribution',
    subdomainLabel: 'Reposição e construção',
    description:
      'Avalia a capacidade de repor a bola e iniciar o ataque através de uma solução segura e vantajosa.',
    playerType: 'goalkeeper',
    contexts: [
      'functional_training',
      'game',
      'official_competition',
    ],
  }),
  createCriterion({
    code: 'GK-DIS-002',
    name: 'Seleciona a melhor solução após recuperar a bola',
    domain: 'goalkeeper',
    domainLabel: 'Guarda-redes',
    subdomain: 'goalkeeper_distribution',
    subdomainLabel: 'Reposição e construção',
    description:
      'Avalia a decisão entre acelerar, temporizar ou manter a posse após uma defesa ou recuperação.',
    playerType: 'goalkeeper',
    contexts: [
      'functional_training',
      'game',
      'official_competition',
    ],
  }),
];

/**
 * Lista oficial dos sete domínios da Biblioteca StickPro.
 *
 * O campo order é utilizado para manter a apresentação da árvore
 * independentemente da ordenação alfabética.
 */
export const DEVELOPMENT_DOMAINS = [
  {
    id: 'skating',
    code: 'SKA',
    label: 'Patinagem',
    order: 1,
    playerType: 'field_player',
  },
  {
    id: 'individual_technique',
    code: 'TEC',
    label: 'Técnica Individual',
    order: 2,
    playerType: 'field_player',
  },
  {
    id: 'collective_play',
    code: 'COL',
    label: 'Jogo Coletivo',
    order: 3,
    playerType: 'field_player',
  },
  {
    id: 'decision',
    code: 'DEC',
    label: 'Capacidade de Decisão',
    order: 4,
    playerType: 'field_player',
  },
  {
    id: 'perception',
    code: 'PER',
    label: 'Perceção',
    order: 5,
    playerType: 'field_player',
  },
  {
    id: 'behavior',
    code: 'BEH',
    label: 'Comportamento',
    order: 6,
    playerType: 'field_player',
  },
  {
    id: 'goalkeeper',
    code: 'GK',
    label: 'Guarda-redes',
    order: 7,
    playerType: 'goalkeeper',
  },
];

/**
 * Lista oficial dos 27 subdomínios.
 */
export const DEVELOPMENT_SUBDOMAINS = [
  {
    id: 'movement',
    label: 'Deslocamento',
    domain: 'skating',
    order: 1,
  },
  {
    id: 'direction_change',
    label: 'Mudança de direção',
    domain: 'skating',
    order: 2,
  },
  {
    id: 'braking',
    label: 'Travagens',
    domain: 'skating',
    order: 3,
  },
  {
    id: 'balance',
    label: 'Equilíbrio',
    domain: 'skating',
    order: 4,
  },

  {
    id: 'ball_control',
    label: 'Controlo de bola',
    domain: 'individual_technique',
    order: 1,
  },
  {
    id: 'passing',
    label: 'Passe',
    domain: 'individual_technique',
    order: 2,
  },
  {
    id: 'reception',
    label: 'Receção',
    domain: 'individual_technique',
    order: 3,
  },
  {
    id: 'shooting',
    label: 'Remate',
    domain: 'individual_technique',
    order: 4,
  },
  {
    id: 'dribbling',
    label: 'Finta e drible',
    domain: 'individual_technique',
    order: 5,
  },

  {
    id: 'visual_scanning',
    label: 'Leitura visual',
    domain: 'perception',
    order: 1,
  },
  {
    id: 'anticipation',
    label: 'Antecipação',
    domain: 'perception',
    order: 2,
  },

  {
    id: 'choice',
    label: 'Escolha da ação',
    domain: 'decision',
    order: 1,
  },
  {
    id: 'timing',
    label: 'Timing',
    domain: 'decision',
    order: 2,
  },
  {
    id: 'adaptation',
    label: 'Adaptação',
    domain: 'decision',
    order: 3,
  },

  {
    id: 'offensive_organization',
    label: 'Organização ofensiva',
    domain: 'collective_play',
    order: 1,
  },
  {
    id: 'defensive_organization',
    label: 'Organização defensiva',
    domain: 'collective_play',
    order: 2,
  },
  {
    id: 'transition',
    label: 'Transição',
    domain: 'collective_play',
    order: 3,
  },
  {
    id: 'communication',
    label: 'Comunicação',
    domain: 'collective_play',
    order: 4,
  },

  {
    id: 'commitment',
    label: 'Compromisso',
    domain: 'behavior',
    order: 1,
  },
  {
    id: 'discipline',
    label: 'Disciplina',
    domain: 'behavior',
    order: 2,
  },
  {
    id: 'resilience',
    label: 'Resiliência',
    domain: 'behavior',
    order: 3,
  },
  {
    id: 'teamwork',
    label: 'Trabalho de equipa',
    domain: 'behavior',
    order: 4,
  },
  {
    id: 'autonomy',
    label: 'Autonomia',
    domain: 'behavior',
    order: 5,
  },

  {
    id: 'goalkeeper_positioning',
    label: 'Posicionamento',
    domain: 'goalkeeper',
    order: 1,
  },
  {
    id: 'goalkeeper_saving',
    label: 'Defesa',
    domain: 'goalkeeper',
    order: 2,
  },
  {
    id: 'goalkeeper_movement',
    label: 'Deslocamento',
    domain: 'goalkeeper',
    order: 3,
  },
  {
    id: 'goalkeeper_distribution',
    label: 'Reposição e construção',
    domain: 'goalkeeper',
    order: 4,
  },
];

/**
 * ==========================================================
 * Índices rápidos da Biblioteca StickPro
 * ==========================================================
 */

/**
 * code -> criterion
 */
export const DEVELOPMENT_CRITERIA_BY_CODE =
  DEVELOPMENT_CRITERIA_CATALOG.reduce((acc, criterion) => {
    acc[criterion.code] = criterion;
    return acc;
  }, {});

/**
 * id -> domain
 */
export const DEVELOPMENT_DOMAIN_BY_ID =
  DEVELOPMENT_DOMAINS.reduce((acc, domain) => {
    acc[domain.id] = domain;
    return acc;
  }, {});

/**
 * id -> subdomain
 */
export const DEVELOPMENT_SUBDOMAIN_BY_ID =
  DEVELOPMENT_SUBDOMAINS.reduce((acc, subdomain) => {
    acc[subdomain.id] = subdomain;
    return acc;
  }, {});



/**
 * Normaliza texto para pesquisas independentes de maiúsculas,
 * minúsculas e acentuação.
 */
export const normalizeDevelopmentSearchText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/**
 * Devolve os critérios que correspondem aos filtros indicados.
 */
export const searchDevelopmentCriteria = ({
  query = '',
  domain = 'all',
  subdomain = 'all',
  context = 'all',
  playerType = 'all',
  systemType = 'all',
  criteria = DEVELOPMENT_CRITERIA_CATALOG,
} = {}) => {
  const normalizedQuery = normalizeDevelopmentSearchText(query);

  return criteria.filter((criterion) => {
    if (!criterion || criterion.isActive === false) {
      return false;
    }

    const matchesDomain =
      domain === 'all' || criterion.domain === domain;

    const matchesSubdomain =
      subdomain === 'all' || criterion.subdomain === subdomain;

    const matchesContext =
      context === 'all' || criterion.contexts?.includes(context);

    const matchesPlayerType =
      playerType === 'all' ||
      criterion.playerType === playerType ||
      criterion.playerType === 'all';

    const matchesSystemType =
      systemType === 'all' ||
      (systemType === 'system' && criterion.isSystem === true) ||
      (systemType === 'custom' && criterion.isSystem === false);

    const searchableText = normalizeDevelopmentSearchText(
      [
        criterion.code,
        criterion.name,
        criterion.description,
        criterion.observableAction,
        criterion.domainLabel,
        criterion.subdomainLabel,
      ]
        .filter(Boolean)
        .join(' ')
    );

    const matchesQuery =
      normalizedQuery.length === 0 ||
      searchableText.includes(normalizedQuery);

    return (
      matchesDomain &&
      matchesSubdomain &&
      matchesContext &&
      matchesPlayerType &&
      matchesSystemType &&
      matchesQuery
    );
  });
};

/**
 * Devolve os subdomínios pertencentes a um domínio.
 */
export const getDevelopmentSubdomainsByDomain = (domainId) =>
  DEVELOPMENT_SUBDOMAINS
    .filter((subdomain) => subdomain.domain === domainId)
    .sort((a, b) => a.order - b.order);

/**
 * Devolve os critérios pertencentes a um domínio.
 */
export const getDevelopmentCriteriaByDomain = (
  domainId,
  criteria = DEVELOPMENT_CRITERIA_CATALOG
) =>
  criteria.filter(
    (criterion) =>
      criterion.domain === domainId &&
      criterion.isActive !== false
  );

/**
 * Devolve os critérios pertencentes a um subdomínio.
 */
export const getDevelopmentCriteriaBySubdomain = (
  subdomainId,
  criteria = DEVELOPMENT_CRITERIA_CATALOG
) =>
  criteria.filter(
    (criterion) =>
      criterion.subdomain === subdomainId &&
      criterion.isActive !== false
  );

/**
 * Devolve um critério através do respetivo código oficial.
 */
export const getDevelopmentCriterionByCode = (criterionCode) =>
  DEVELOPMENT_CRITERIA_BY_CODE[criterionCode] || null;

/**
 * Agrupa os critérios na hierarquia Domínio > Subdomínio.
 */
export const groupDevelopmentCriteria = (
  criteria = DEVELOPMENT_CRITERIA_CATALOG
) =>
  DEVELOPMENT_DOMAINS.map((domain) => ({
    ...domain,
    subdomains: getDevelopmentSubdomainsByDomain(domain.id)
      .map((subdomain) => ({
        ...subdomain,
        criteria: criteria.filter(
          (criterion) =>
            criterion.domain === domain.id &&
            criterion.subdomain === subdomain.id &&
            criterion.isActive !== false
        ),
      }))
      .filter((subdomain) => subdomain.criteria.length > 0),
  })).filter((domain) => domain.subdomains.length > 0);

/**
 * Calcula os números apresentados no cabeçalho da biblioteca.
 */
export const getDevelopmentCatalogStats = (
  criteria = DEVELOPMENT_CRITERIA_CATALOG
) => {
  const activeCriteria = criteria.filter(
    (criterion) => criterion.isActive !== false
  );

  const activeDomainIds = new Set(
    activeCriteria.map((criterion) => criterion.domain)
  );

  const activeSubdomainIds = new Set(
    activeCriteria.map((criterion) => criterion.subdomain)
  );

  return {
    domains: activeDomainIds.size,
    subdomains: activeSubdomainIds.size,
    criteria: activeCriteria.length,
    observableActions: activeCriteria.length,
    fieldPlayerCriteria: activeCriteria.filter(
      (criterion) =>
        criterion.playerType === 'field_player' ||
        criterion.playerType === 'all'
    ).length,
    goalkeeperCriteria: activeCriteria.filter(
      (criterion) =>
        criterion.playerType === 'goalkeeper'
    ).length,
    systemCriteria: activeCriteria.filter(
      (criterion) => criterion.isSystem === true
    ).length,
    customCriteria: activeCriteria.filter(
      (criterion) => criterion.isSystem === false
    ).length,
  };
};

/**
 * Devolve a designação de um contexto.
 */
export const getDevelopmentContextLabel = (contextId) =>
  DEVELOPMENT_CONTEXTS.find(
    (context) => context.id === contextId
  )?.label || contextId;

/**
 * Devolve a designação de um tipo de jogador.
 */
export const getDevelopmentPlayerTypeLabel = (playerTypeId) =>
  DEVELOPMENT_PLAYER_TYPES.find(
    (playerType) => playerType.id === playerTypeId
  )?.label || playerTypeId;

/**
 * Devolve a designação de um domínio.
 */
export const getDevelopmentDomainLabel = (domainId) =>
  DEVELOPMENT_DOMAIN_BY_ID[domainId]?.label || domainId;

/**
 * Devolve a designação de um subdomínio.
 */
export const getDevelopmentSubdomainLabel = (subdomainId) =>
  DEVELOPMENT_SUBDOMAIN_BY_ID[subdomainId]?.label || subdomainId;

/**
 * Validação estrutural do catálogo.
 *
 * Pode ser usada temporariamente no desenvolvimento:
 *
 * console.log(validateDevelopmentCatalog());
 */
export const validateDevelopmentCatalog = (
  criteria = DEVELOPMENT_CRITERIA_CATALOG
) => {
  const codes = criteria.map((criterion) => criterion.code);
  const duplicateCodes = codes.filter(
    (code, index) => codes.indexOf(code) !== index
  );

  const invalidCriteria = criteria.filter(
    (criterion) =>
      !criterion.code ||
      !criterion.name ||
      !criterion.domain ||
      !criterion.domainLabel ||
      !criterion.subdomain ||
      !criterion.subdomainLabel ||
      !criterion.observableAction ||
      !criterion.playerType ||
      !Array.isArray(criterion.contexts)
  );

  const stats = getDevelopmentCatalogStats(criteria);

  return {
    isValid:
      duplicateCodes.length === 0 &&
      invalidCriteria.length === 0,
    duplicateCodes: [...new Set(duplicateCodes)],
    invalidCriteria,
    ...stats,
  };
};

export default DEVELOPMENT_CRITERIA_CATALOG;
