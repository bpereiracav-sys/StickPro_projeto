import {
  DEVELOPMENT_DOMAINS,
} from '../../data/developmentCriteriaCatalog';

/**
 * Constrói uma árvore:
 *
 * Domínio
 *    └── Subdomínio
 *            └── Critérios
 *
 * A árvore já fica preparada para:
 *
 * - seleção parcial
 * - seleção total
 * - pesquisa
 * - contadores
 * - filtros por tipo de atleta
 */

export function buildCriteriaTree(
  criteria = [],
  playerType = 'field_player'
) {
  const domains = new Map();

  criteria.forEach((criterion) => {
    const criterionPlayerType =
      criterion?.playerType ||
      criterion?.player_type ||
      criterion?.criterion?.playerType ||
      criterion?.criterion?.player_type ||
      null;
    
    const criterionDomain =
      criterion?.domain ||
      criterion?.criterion?.domain ||
      null;
    
    const criterionCode = String(
      criterion?.code ||
      criterion?.source_code ||
      criterion?.sourceCode ||
      criterion?.criterion?.code ||
      ''
    ).toUpperCase();
    
    const isGoalkeeperCriterion =
      criterionPlayerType === 'goalkeeper' ||
      criterionDomain === 'goalkeeper' ||
      criterionCode.startsWith('GK-');
    
    if (
      playerType === 'field_player' &&
      isGoalkeeperCriterion
    ) {
      return;
    }

    const domainId =
      criterion.domain || 'other';

    const domainDefinition =
      DEVELOPMENT_DOMAINS.find(
        (domain) =>
          domain.id === domainId
      );

    if (!domainDefinition) {
      return;
    }

    if (!domains.has(domainId)) {
      domains.set(domainId, {
        id: domainDefinition.id,
        label: domainDefinition.label,
        icon: domainDefinition.icon,
        color: domainDefinition.color,

        expanded: true,

        criteriaCount: 0,

        selectedCount: 0,

        subdomains: new Map(),
      });
    }

    const domain =
      domains.get(domainId);

    const subdomainId =
      criterion.subdomain ||
      'general';

    const subdomainLabel =
      criterion.subdomainLabel ||
      criterion.subdomain ||
      'Geral';

    if (
      !domain.subdomains.has(
        subdomainId
      )
    ) {
      domain.subdomains.set(
        subdomainId,
        {
          id: subdomainId,

          label:
            subdomainLabel,

          expanded: true,

          criteriaCount: 0,

          selectedCount: 0,

          criteria: [],
        }
      );
    }

    const subdomain =
      domain.subdomains.get(
        subdomainId
      );

    subdomain.criteria.push({
      ...criterion,

      checked: false,
    });

    subdomain.criteriaCount += 1;

    domain.criteriaCount += 1;
  });

  return Array.from(
    domains.values()
  ).map((domain) => ({
    ...domain,

    subdomains: Array.from(
      domain.subdomains.values()
    ),
  }));
}
