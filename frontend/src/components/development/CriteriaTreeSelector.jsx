import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Search,
} from 'lucide-react';

import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';

import {
  buildCriteriaTree,
} from './criteriaTreeBuilder';

const normalizeText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getCriterionId = (criterion) =>
  criterion?.id ||
  criterion?.criterion_id ||
  criterion?.code ||
  null;

const getSelectedCriterionIds = (
  selectedCriteria = []
) =>
  new Set(
    selectedCriteria
      .map((item) =>
        String(
          item?.criterion_id ||
            item?.id ||
            ''
        )
      )
      .filter(Boolean)
  );

const getSelectionState = (
  criterionIds,
  selectedIds
) => {
  const validIds = criterionIds
    .map((id) => String(id || ''))
    .filter(Boolean);

  const selectedCount = validIds.filter(
    (id) => selectedIds.has(id)
  ).length;

  if (
    validIds.length > 0 &&
    selectedCount === validIds.length
  ) {
    return true;
  }

  if (selectedCount > 0) {
    return 'indeterminate';
  }

  return false;
};

export default function CriteriaTreeSelector({
  criteria = [],
  selectedCriteria = [],
  playerType = 'field_player',
  onToggleCriterion,
  onSelectCriteria,
  onRemoveCriteria,
  renderCriterionExtra,
  searchPlaceholder = 'Pesquisar critério...',
  emptyMessage = 'Não existem critérios disponíveis para este tipo de atleta.',
}) {
  const [query, setQuery] = useState('');

  const [expandedDomains, setExpandedDomains] =
    useState(() => new Set());

  const [
    expandedSubdomains,
    setExpandedSubdomains,
  ] = useState(() => new Set());

  const selectedIds = useMemo(
    () =>
      getSelectedCriterionIds(
        selectedCriteria
      ),
    [selectedCriteria]
  );

  const criteriaTree = useMemo(
    () =>
      buildCriteriaTree(
        criteria,
        playerType
      ),
    [
      criteria,
      playerType,
    ]
  );

  useEffect(() => {
    setExpandedDomains(
      new Set(
        criteriaTree.map(
          (domain) => domain.id
        )
      )
    );

    setExpandedSubdomains(
      new Set(
        criteriaTree.flatMap(
          (domain) =>
            domain.subdomains.map(
              (subdomain) =>
                `${domain.id}:${subdomain.id}`
            )
        )
      )
    );
  }, [
    playerType,
    criteriaTree,
  ]);

  const filteredTree = useMemo(() => {
    const normalizedQuery =
      normalizeText(query);

    if (!normalizedQuery) {
      return criteriaTree;
    }

    return criteriaTree
      .map((domain) => {
        const domainMatches =
          normalizeText(
            domain.label
          ).includes(
            normalizedQuery
          );

        const subdomains =
          domain.subdomains
            .map((subdomain) => {
              const subdomainMatches =
                normalizeText(
                  subdomain.label
                ).includes(
                  normalizedQuery
                );

              const matchingCriteria =
                subdomain.criteria.filter(
                  (criterion) => {
                    const searchable =
                      normalizeText(
                        [
                          criterion?.code,
                          criterion?.name,
                          criterion?.description,
                          criterion?.domainLabel,
                          criterion?.subdomainLabel,
                        ]
                          .filter(Boolean)
                          .join(' ')
                      );

                    return searchable.includes(
                      normalizedQuery
                    );
                  }
                );

              if (
                domainMatches ||
                subdomainMatches
              ) {
                return subdomain;
              }

              if (
                matchingCriteria.length > 0
              ) {
                return {
                  ...subdomain,
                  criteria:
                    matchingCriteria,
                };
              }

              return null;
            })
            .filter(Boolean);

        if (
          domainMatches ||
          subdomains.length > 0
        ) {
          return {
            ...domain,
            subdomains:
              domainMatches
                ? domain.subdomains
                : subdomains,
          };
        }

        return null;
      })
      .filter(Boolean);
  }, [
    criteriaTree,
    query,
  ]);

  const allVisibleCriterionIds =
    useMemo(
      () =>
        filteredTree.flatMap(
          (domain) =>
            domain.subdomains.flatMap(
              (subdomain) =>
                subdomain.criteria
                  .map(
                    getCriterionId
                  )
                  .filter(Boolean)
            )
        ),
      [filteredTree]
    );

  const visibleSelectedCount =
    allVisibleCriterionIds.filter(
      (id) =>
        selectedIds.has(
          String(id)
        )
    ).length;

  const toggleDomainExpanded = (
    domainId
  ) => {
    setExpandedDomains(
      (current) => {
        const next = new Set(
          current
        );

        if (next.has(domainId)) {
          next.delete(domainId);
        } else {
          next.add(domainId);
        }

        return next;
      }
    );
  };

  const toggleSubdomainExpanded = (
    domainId,
    subdomainId
  ) => {
    const key =
      `${domainId}:${subdomainId}`;

    setExpandedSubdomains(
      (current) => {
        const next = new Set(
          current
        );

        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }

        return next;
      }
    );
  };

  const updateGroupSelection = (
    criterionIds
  ) => {
    const ids = criterionIds
      .map((id) => String(id || ''))
      .filter(Boolean);

    const allSelected =
      ids.length > 0 &&
      ids.every((id) =>
        selectedIds.has(id)
      );

    if (allSelected) {
      onRemoveCriteria?.(ids);
      return;
    }

    const missingIds =
      ids.filter(
        (id) =>
          !selectedIds.has(id)
      );

    onSelectCriteria?.(
      missingIds
    );
  };

  if (
    criteriaTree.length === 0
  ) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <Input
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value
              )
            }
            placeholder={
              searchPlaceholder
            }
            className="rounded-full pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-full border-cyan-200 bg-cyan-50 text-cyan-700"
          >
            {selectedCriteria.length}{' '}
            selecionados
          </Badge>

          {query && (
            <Badge
              variant="outline"
              className="rounded-full"
            >
              {visibleSelectedCount}/
              {
                allVisibleCriterionIds.length
              }{' '}
              visíveis
            </Badge>
          )}
        </div>
      </div>

      {filteredTree.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Search className="mx-auto h-9 w-9 text-slate-300" />

          <p className="mt-3 font-semibold text-slate-700">
            Nenhum critério encontrado
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Experimenta pesquisar por outro termo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTree.map(
            (domain) => {
              const domainExpanded =
                expandedDomains.has(
                  domain.id
                ) ||
                Boolean(query);

              const domainCriterionIds =
                domain.subdomains.flatMap(
                  (subdomain) =>
                    subdomain.criteria
                      .map(
                        getCriterionId
                      )
                      .filter(Boolean)
                );

              const domainState =
                getSelectionState(
                  domainCriterionIds,
                  selectedIds
                );

              const domainSelectedCount =
                domainCriterionIds.filter(
                  (id) =>
                    selectedIds.has(
                      String(id)
                    )
                ).length;

              return (
                <div
                  key={domain.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex items-center gap-3 bg-gradient-to-r from-slate-50 via-white to-cyan-50 px-4 py-4">
                    <button
                      type="button"
                      onClick={() =>
                        toggleDomainExpanded(
                          domain.id
                        )
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white hover:text-slate-800"
                      aria-label={
                        domainExpanded
                          ? `Fechar ${domain.label}`
                          : `Abrir ${domain.label}`
                      }
                    >
                      {domainExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>

                    <Checkbox
                      checked={
                        domainState
                      }
                      onCheckedChange={() =>
                        updateGroupSelection(
                          domainCriterionIds
                        )
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        toggleDomainExpanded(
                          domain.id
                        )
                      }
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="font-heading text-lg font-semibold text-slate-950">
                        {domain.label}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {
                          domainCriterionIds.length
                        }{' '}
                        critérios ·{' '}
                        {
                          domainSelectedCount
                        }{' '}
                        selecionados
                      </p>
                    </button>

                    <Badge
                      variant="outline"
                      className="shrink-0 rounded-full bg-white"
                    >
                      {
                        domainSelectedCount
                      }
                      /
                      {
                        domainCriterionIds.length
                      }
                    </Badge>
                  </div>

                  {domainExpanded && (
                    <div className="space-y-3 border-t border-slate-100 p-3 sm:p-4">
                      {domain.subdomains.map(
                        (subdomain) => {
                          const subdomainKey =
                            `${domain.id}:${subdomain.id}`;

                          const subdomainExpanded =
                            expandedSubdomains.has(
                              subdomainKey
                            ) ||
                            Boolean(query);

                          const criterionIds =
                            subdomain.criteria
                              .map(
                                getCriterionId
                              )
                              .filter(
                                Boolean
                              );

                          const subdomainState =
                            getSelectionState(
                              criterionIds,
                              selectedIds
                            );

                          const selectedCount =
                            criterionIds.filter(
                              (id) =>
                                selectedIds.has(
                                  String(id)
                                )
                            ).length;

                          return (
                            <div
                              key={
                                subdomainKey
                              }
                              className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60"
                            >
                              <div className="flex items-center gap-3 px-3 py-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleSubdomainExpanded(
                                      domain.id,
                                      subdomain.id
                                    )
                                  }
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-800"
                                >
                                  {subdomainExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>

                                <Checkbox
                                  checked={
                                    subdomainState
                                  }
                                  onCheckedChange={() =>
                                    updateGroupSelection(
                                      criterionIds
                                    )
                                  }
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleSubdomainExpanded(
                                      domain.id,
                                      subdomain.id
                                    )
                                  }
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <p className="font-semibold text-slate-900">
                                    {
                                      subdomain.label
                                    }
                                  </p>

                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {
                                      criterionIds.length
                                    }{' '}
                                    critérios ·{' '}
                                    {
                                      selectedCount
                                    }{' '}
                                    selecionados
                                  </p>
                                </button>
                              </div>

                              {subdomainExpanded && (
                                <div className="grid gap-2 border-t border-slate-200 bg-white p-3 md:grid-cols-2">
                                  {subdomain.criteria.map(
                                    (
                                      criterion
                                    ) => {
                                      const criterionId =
                                        getCriterionId(
                                          criterion
                                        );

                                      const selected =
                                        criterionId
                                          ? selectedIds.has(
                                              String(
                                                criterionId
                                              )
                                            )
                                          : false;

                                      return (
                                        <div
                                          key={
                                            criterionId ||
                                            criterion.code ||
                                            criterion.name
                                          }
                                          className={`rounded-2xl border p-3 transition ${
                                            selected
                                              ? 'border-cyan-300 bg-cyan-50/50 ring-2 ring-cyan-100'
                                              : 'border-slate-200 bg-white hover:border-cyan-200'
                                          }`}
                                        >
                                          <div className="flex items-start gap-3">
                                            <Checkbox
                                              checked={
                                                selected
                                              }
                                              onCheckedChange={() =>
                                                onToggleCriterion?.(
                                                  criterionId
                                                )
                                              }
                                              className="mt-1"
                                            />

                                            <div className="min-w-0 flex-1">
                                              <div className="flex flex-wrap items-start justify-between gap-2">
                                                <p className="font-semibold text-slate-950">
                                                  {
                                                    criterion.name
                                                  }
                                                </p>

                                                {criterion.code && (
                                                  <Badge
                                                    variant="outline"
                                                    className="rounded-full text-[10px]"
                                                  >
                                                    {
                                                      criterion.code
                                                    }
                                                  </Badge>
                                                )}
                                              </div>

                                              {criterion.description && (
                                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                                  {
                                                    criterion.description
                                                  }
                                                </p>
                                              )}

                                              {renderCriterionExtra?.({
                                                criterion,
                                                selected,
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
