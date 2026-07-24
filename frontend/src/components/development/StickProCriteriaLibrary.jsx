import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Filter,
  Layers3,
  Search,
  Shield,
  Sparkles,
  UserRound,
  X,
  Loader2,
} from 'lucide-react';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

import {
  DEVELOPMENT_CONTEXTS,
  DEVELOPMENT_CRITERIA_CATALOG,
  DEVELOPMENT_DOMAINS,
  DEVELOPMENT_PLAYER_TYPES,
  DEVELOPMENT_SCALE,
  DEVELOPMENT_SUBDOMAINS,
  getDevelopmentCatalogStats,
  searchDevelopmentCriteria,
} from '../../data/developmentCriteriaCatalog';

const ALL_VALUE = 'all';

const DOMAIN_STYLES = {
  skating: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  individual_technique: 'border-blue-200 bg-blue-50 text-blue-800',
  perception: 'border-violet-200 bg-violet-50 text-violet-800',
  decision: 'border-amber-200 bg-amber-50 text-amber-800',
  collective_play: 'border-rose-200 bg-rose-50 text-rose-800',
  behavior: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  goalkeeper: 'border-purple-200 bg-purple-50 text-purple-800',
};

function makeGroupKey(domain, subdomain) {
  return `${domain}:${subdomain}`;
}

function ContextBadges({ contexts }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {contexts.map((contextId) => {
        const context = DEVELOPMENT_CONTEXTS.find(
          (item) => item.id === contextId
        );

        return (
          <Badge
            key={contextId}
            variant="outline"
            className="border-slate-200 bg-white text-[11px] font-medium text-slate-500"
          >
            {context?.label || contextId}
          </Badge>
        );
      })}
    </div>
  );
}
function SelectionCheckbox({
  checked,
  indeterminate = false,
  onChange,
  label,
  disabled = false,
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
        disabled
          ? 'cursor-not-allowed border-emerald-200 bg-emerald-100 text-emerald-600'
          : checked || indeterminate
          ? 'border-cyan-600 bg-cyan-600 text-white'
          : 'border-slate-300 bg-white text-transparent hover:border-cyan-500'
      }`}
      aria-label={label}
      aria-pressed={checked}
    >
      {disabled ? (
        <Check className="h-3.5 w-3.5" />
      ) : indeterminate ? (
        <span className="h-0.5 w-2.5 rounded bg-white" />
      ) : (
        <Check className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export function StickProCriteriaLibrary({
  canImport = false,
  importedSourceCodes = [],
  onImport,
}) {
  const stats = useMemo(() => getDevelopmentCatalogStats(), []);

  const [query, setQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState(ALL_VALUE);
  const [subdomainFilter, setSubdomainFilter] = useState(ALL_VALUE);
  const [contextFilter, setContextFilter] = useState(ALL_VALUE);
  const [playerTypeFilter, setPlayerTypeFilter] = useState(ALL_VALUE);

  const [expandedDomains, setExpandedDomains] = useState(
    () => new Set(DEVELOPMENT_DOMAINS.map((domain) => domain.id))
  );
  const [expandedSubdomains, setExpandedSubdomains] = useState(new Set());
  const [selectedCodes, setSelectedCodes] = useState(new Set());
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const importedCodesSet = useMemo(
    () => new Set(importedSourceCodes || []),
    [importedSourceCodes]
  );
  
  const importedCodesSet = useMemo(
    () => new Set(importedSourceCodes || []),
    [importedSourceCodes]
  );
  
  const availableSubdomains = useMemo(() => {
    if (domainFilter === ALL_VALUE) {
      return DEVELOPMENT_SUBDOMAINS;
    }

    return DEVELOPMENT_SUBDOMAINS.filter(
      (subdomain) => subdomain.domain === domainFilter
    );
  }, [domainFilter]);

  useEffect(() => {
    if (
      subdomainFilter !== ALL_VALUE &&
      !availableSubdomains.some((item) => item.id === subdomainFilter)
    ) {
      setSubdomainFilter(ALL_VALUE);
    }
  }, [availableSubdomains, subdomainFilter]);

  const filteredCriteria = useMemo(
    () =>
      searchDevelopmentCriteria({
        query,
        domain: domainFilter,
        subdomain: subdomainFilter,
        context: contextFilter,
        playerType: playerTypeFilter,
      }),
    [query, domainFilter, subdomainFilter, contextFilter, playerTypeFilter]
  );

  const groupedTree = useMemo(() => {
    const domainMap = new Map();

    filteredCriteria.forEach((criterion) => {
      if (!domainMap.has(criterion.domain)) {
        domainMap.set(criterion.domain, {
          id: criterion.domain,
          label: criterion.domainLabel,
          subdomains: new Map(),
        });
      }

      const domain = domainMap.get(criterion.domain);

      if (!domain.subdomains.has(criterion.subdomain)) {
        domain.subdomains.set(criterion.subdomain, {
          id: criterion.subdomain,
          label: criterion.subdomainLabel,
          criteria: [],
        });
      }

      domain.subdomains.get(criterion.subdomain).criteria.push(criterion);
    });

    return Array.from(domainMap.values()).map((domain) => ({
      ...domain,
      subdomains: Array.from(domain.subdomains.values()),
    }));
  }, [filteredCriteria]);

  useEffect(() => {
    if (!query.trim() && domainFilter === ALL_VALUE && subdomainFilter === ALL_VALUE) {
      return;
    }

    setExpandedDomains(new Set(groupedTree.map((domain) => domain.id)));
    setExpandedSubdomains(
      new Set(
        groupedTree.flatMap((domain) =>
          domain.subdomains.map((subdomain) =>
            makeGroupKey(domain.id, subdomain.id)
          )
        )
      )
    );
  }, [query, domainFilter, subdomainFilter, contextFilter, playerTypeFilter, groupedTree]);

  const importedFilteredCount = filteredCriteria.filter((criterion) =>
    importedCodesSet.has(criterion.code)
  ).length;
  
  const availableFilteredCount =
    filteredCriteria.length - importedFilteredCount;
  
  const hasActiveFilters =
    query.trim() ||
    domainFilter !== ALL_VALUE ||
    subdomainFilter !== ALL_VALUE ||
    contextFilter !== ALL_VALUE ||
    playerTypeFilter !== ALL_VALUE;

  const resetFilters = () => {
    setQuery('');
    setDomainFilter(ALL_VALUE);
    setSubdomainFilter(ALL_VALUE);
    setContextFilter(ALL_VALUE);
    setPlayerTypeFilter(ALL_VALUE);
  };

  const toggleDomain = (domainId) => {
    setExpandedDomains((current) => {
      const next = new Set(current);
      next.has(domainId) ? next.delete(domainId) : next.add(domainId);
      return next;
    });
  };

  const toggleSubdomain = (domainId, subdomainId) => {
    const key = makeGroupKey(domainId, subdomainId);

    setExpandedSubdomains((current) => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleCriterion = (code) => {
    if (importedCodesSet.has(code)) {
      return;
    }
  
    setSelectedCodes((current) => {
      const next = new Set(current);
  
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
  
      return next;
    });
  };

  const setCriteriaSelection = (criteria, shouldSelect) => {
    setSelectedCodes((current) => {
      const next = new Set(current);
  
      criteria.forEach((criterion) => {
        if (importedCodesSet.has(criterion.code)) {
          next.delete(criterion.code);
          return;
        }
  
        if (shouldSelect) {
          next.add(criterion.code);
        } else {
          next.delete(criterion.code);
        }
      });
  
      return next;
    });
  };

  const expandAll = () => {
    setExpandedDomains(new Set(groupedTree.map((domain) => domain.id)));
    setExpandedSubdomains(
      new Set(
        groupedTree.flatMap((domain) =>
          domain.subdomains.map((subdomain) =>
            makeGroupKey(domain.id, subdomain.id)
          )
        )
      )
    );
  };

  const collapseAll = () => {
  setExpandedDomains(new Set());
  setExpandedSubdomains(new Set());
};

const handleImportSelected = async () => {
  if (
    importing ||
    selectedCodes.size === 0 ||
    typeof onImport !== 'function'
  ) {
    return;
  }

  const selectedCriteria = DEVELOPMENT_CRITERIA_CATALOG.filter(
    (criterion) =>
      selectedCodes.has(criterion.code) &&
      !importedCodesSet.has(criterion.code)
  );

  if (selectedCriteria.length === 0) {
    setSelectedCodes(new Set());
    return;
  }

  setImporting(true);

  try {
    await onImport(selectedCriteria);
    setSelectedCodes(new Set());
  } catch (error) {
    console.error('Error importing selected criteria:', error);
  } finally {
    setImporting(false);
  }
};

  return (
    <>
      <Card className="overflow-hidden border border-cyan-100 bg-white shadow-xl shadow-slate-200/60">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-cyan-50/80 via-white to-blue-50/50">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge className="border border-cyan-200 bg-cyan-100 text-cyan-800 hover:bg-cyan-100">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Biblioteca oficial StickPro
                </Badge>

                <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                  {stats.criteria} ações observáveis
                </Badge>
              </div>

              <CardTitle className="flex items-center gap-2 text-2xl text-slate-950">
                <Layers3 className="h-6 w-6 text-cyan-600" />
                Biblioteca estruturada de competências
              </CardTitle>

              <CardDescription className="mt-2 max-w-2xl text-sm leading-6">
                Competências organizadas por domínio e subdomínio, baseadas em
                ações diretamente observáveis no treino e na competição.
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setScaleDialogOpen(true)}
            >
              <CircleHelp className="mr-2 h-4 w-4" />
              Consultar escala 1–5
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-cyan-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
                Domínios
              </p>
              <p className="mt-1 text-3xl font-bold text-slate-950">{stats.domains}</p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Subdomínios
              </p>
              <p className="mt-1 text-3xl font-bold text-slate-950">{stats.subdomains}</p>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                Guarda-redes
              </p>
              <p className="mt-1 text-3xl font-bold text-slate-950">
                {stats.goalkeeperCriteria}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-800">
                Pesquisa e filtros
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-5">
              <div className="relative lg:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="rounded-full bg-white pl-9"
                  placeholder="Pesquisar ação, domínio ou subdomínio..."
                />
              </div>

              <Select value={domainFilter} onValueChange={setDomainFilter}>
                <SelectTrigger className="rounded-full bg-white">
                  <SelectValue placeholder="Domínio" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value={ALL_VALUE}>Todos os domínios</SelectItem>
                  {DEVELOPMENT_DOMAINS.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      {domain.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={contextFilter} onValueChange={setContextFilter}>
                <SelectTrigger className="rounded-full bg-white">
                  <SelectValue placeholder="Contexto" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value={ALL_VALUE}>Todos os contextos</SelectItem>
                  {DEVELOPMENT_CONTEXTS.map((context) => (
                    <SelectItem key={context.id} value={context.id}>
                      {context.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={playerTypeFilter} onValueChange={setPlayerTypeFilter}>
                <SelectTrigger className="rounded-full bg-white">
                  <SelectValue placeholder="Posição" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {DEVELOPMENT_PLAYER_TYPES.map((playerType) => (
                    <SelectItem key={playerType.id} value={playerType.id}>
                      {playerType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
              <Select value={subdomainFilter} onValueChange={setSubdomainFilter}>
                <SelectTrigger className="rounded-full bg-white">
                  <SelectValue placeholder="Subdomínio" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value={ALL_VALUE}>Todos os subdomínios</SelectItem>
                  {availableSubdomains.map((subdomain) => (
                    <SelectItem
                      key={`${subdomain.domain}:${subdomain.id}`}
                      value={subdomain.id}
                    >
                      {subdomain.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={expandAll}>
                  Expandir tudo
                </Button>

                <Button type="button" variant="outline" className="rounded-full" onClick={collapseAll}>
                  Recolher tudo
                </Button>

                {hasActiveFilters && (
                  <Button type="button" variant="ghost" className="rounded-full" onClick={resetFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">
                {filteredCriteria.length} competências encontradas
              </p>
            
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="text-emerald-700">
                  {importedFilteredCount} já adicionadas ao clube
                </span>
            
                <span className="text-cyan-700">
                  {availableFilteredCount} disponíveis
                </span>
            
                <span className="text-slate-500">
                  {selectedCodes.size} selecionadas nesta sessão
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedCodes.size > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => setSelectedCodes(new Set())}
                >
                  Limpar seleção
                </Button>
              )}

              <Button
                type="button"
                className="rounded-full bg-cyan-600 text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={
                  importing ||
                  selectedCodes.size === 0 ||
                  typeof onImport !== 'function'
                }
                onClick={handleImportSelected}
              >
                {importing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                )}
              
                {importing
                  ? 'A adicionar...'
                  : `Adicionar ao clube${
                      selectedCodes.size > 0
                        ? ` (${selectedCodes.size})`
                        : ''
                    }`}
              </Button>
            </div>
          </div>

          {groupedTree.length === 0 ? (
            <div className="mt-4 flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <Search className="mb-3 h-10 w-10 text-slate-300" />
              <p className="font-semibold text-slate-900">
                Nenhuma competência encontrada
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Ajusta a pesquisa ou limpa os filtros aplicados.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {groupedTree.map((domain) => {
                const domainCriteria = domain.subdomains.flatMap(
                  (subdomain) => subdomain.criteria
                );
                
                const availableDomainCriteria = domainCriteria.filter(
                  (criterion) => !importedCodesSet.has(criterion.code)
                );
                
                const importedDomainCount =
                  domainCriteria.length - availableDomainCriteria.length;
                
                const selectedDomainCount = availableDomainCriteria.filter(
                  (criterion) => selectedCodes.has(criterion.code)
                ).length;
                
                const domainSelected =
                  availableDomainCriteria.length > 0 &&
                  selectedDomainCount === availableDomainCriteria.length;
                const domainIndeterminate =
                  selectedDomainCount > 0 && !domainSelected;
                const domainExpanded = expandedDomains.has(domain.id);

                return (
                  <section
                    key={domain.id}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white"
                  >
                    <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 p-4">
                      <SelectionCheckbox
                        checked={domainSelected}
                        disabled={alreadyImported}
                        indeterminate={domainIndeterminate}
                        onChange={() =>
                          setCriteriaSelection(domainCriteria, !domainSelected)
                        }
                        label={`Selecionar domínio ${domain.label}`}
                      />

                      <button
                        type="button"
                        onClick={() => toggleDomain(domain.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        {domainExpanded ? (
                          <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
                        )}

                        <Badge
                          variant="outline"
                          className={DOMAIN_STYLES[domain.id] || 'border-slate-200 bg-white'}
                        >
                          {domain.label}
                        </Badge>

                        <span className="text-sm text-slate-500">
                          {importedDomainCount}/{domainCriteria.length} adicionadas
                        </span>
                      </button>
                    </div>

                    {domainExpanded && (
                      <div className="space-y-2 p-3 sm:p-4">
                        {domain.subdomains.map((subdomain) => {
                          const key = makeGroupKey(domain.id, subdomain.id);
                          const subdomainExpanded = expandedSubdomains.has(key);
                          const availableSubdomainCriteria =
                            subdomain.criteria.filter(
                              (criterion) =>
                                !importedCodesSet.has(criterion.code)
                            );
                          
                          const importedSubdomainCount =
                            subdomain.criteria.length -
                            availableSubdomainCriteria.length;
                          
                          const selectedSubdomainCount =
                            availableSubdomainCriteria.filter(
                              (criterion) =>
                                selectedCodes.has(criterion.code)
                            ).length;
                          
                          const subdomainSelected =
                            availableSubdomainCriteria.length > 0 &&
                            selectedSubdomainCount ===
                              availableSubdomainCriteria.length;
                          const subdomainIndeterminate =
                            selectedSubdomainCount > 0 && !subdomainSelected;

                          return (
                            <div
                              key={key}
                              className="overflow-hidden rounded-2xl border border-slate-200"
                            >
                              <div className="flex items-center gap-3 bg-white p-3 sm:p-4">
                                <SelectionCheckbox
                                  checked={subdomainSelected}
                                  indeterminate={subdomainIndeterminate}
                                  disabled={availableDomainCriteria.length === 0}
                                  onChange={() =>
                                    setCriteriaSelection(
                                      subdomain.criteria,
                                      !subdomainSelected
                                    )
                                  }
                                  label={`Selecionar subdomínio ${subdomain.label}`}
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleSubdomain(domain.id, subdomain.id)
                                  }
                                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                >
                                  {subdomainExpanded ? (
                                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                                  )}

                                  <span className="font-semibold text-slate-900">
                                    {subdomain.label}
                                  </span>

                                  <span className="text-xs text-slate-400">
                                    {importedSubdomainCount}/{subdomain.criteria.length}
                                  </span>
                                </button>
                              </div>

                              {subdomainExpanded && (
                                <div className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/50">
                                  {subdomain.criteria.map((criterion) => {
                                    const alreadyImported = importedCodesSet.has(
                                      criterion.code
                                    );
                                  
                                    const selected =
                                      !alreadyImported &&
                                      selectedCodes.has(criterion.code);
                                  
                                    return (
                                      // conteúdo do critério
                                    );
                                  })}

                                    return (
                                      <div
                                        key={criterion.code}
                                        className={`flex gap-3 p-4 transition ${
                                          alreadyImported
                                            ? 'bg-emerald-50/60 opacity-80'
                                            : selected
                                            ? 'bg-cyan-50/70'
                                            : 'hover:bg-white'
                                        }`}
                                      >
                                        <div className="pt-0.5">
                                          <SelectionCheckbox
                                            checked={selected}
                                            onChange={() =>
                                              toggleCriterion(criterion.code)
                                            }
                                            label={`Selecionar ${criterion.name}`}
                                          />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                              <p className="font-medium text-slate-900">
                                                {criterion.name}
                                              </p>
                                          
                                              <p className="mt-1 text-sm leading-6 text-slate-500">
                                                {criterion.description}
                                              </p>
                                            </div>
                                          
                                            <div className="flex shrink-0 flex-wrap gap-2">
                                              {alreadyImported && (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                  <Check className="mr-1 h-3 w-3" />
                                                  Já adicionada
                                                </Badge>
                                              )}
                                          
                                              <Badge
                                                variant="outline"
                                                className="border-slate-200 bg-white text-[11px] text-slate-500"
                                              >
                                                {criterion.code}
                                              </Badge>
                                            </div>
                                          </div>

                                          <div className="mt-3 flex flex-wrap items-center gap-2">
                                            {criterion.playerType === 'goalkeeper' ? (
                                              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                                                <Shield className="mr-1 h-3 w-3" />
                                                Guarda-redes
                                              </Badge>
                                            ) : criterion.playerType === 'all' ? (
                                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                                                <UserRound className="mr-1 h-3 w-3" />
                                                Todos
                                              </Badge>
                                            ) : (
                                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                                <UserRound className="mr-1 h-3 w-3" />
                                                Jogador de campo
                                              </Badge>
                                            )}

                                            <ContextBadges contexts={criterion.contexts} />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={scaleDialogOpen} onOpenChange={setScaleDialogOpen}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>Escala universal de desenvolvimento</DialogTitle>
            <DialogDescription>
              A mesma lógica de avaliação é aplicada a todas as ações observáveis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {DEVELOPMENT_SCALE.map((level) => (
              <div
                key={level.value}
                className="flex gap-4 rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-lg font-bold text-white">
                  {level.value}
                </div>

                <div>
                  <p className="font-semibold text-slate-900">{level.label}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {level.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default StickProCriteriaLibrary;
