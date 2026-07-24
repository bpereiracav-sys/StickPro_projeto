import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { usePermissions } from '../context/PermissionsContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  ArrowLeft,
  Award,
  Brain,
  Dumbbell,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { StickProCriteriaLibrary } from '../components/development/StickProCriteriaLibrary';

const getApiBaseUrl = () => {
  const raw = process.env.REACT_APP_BACKEND_URL || '';

  if (!raw) return '/api';
  if (raw.endsWith('/api')) return raw;

  return `${raw.replace(/\/$/, '')}/api`;
};

const getAuthToken = () => {
  const possibleKeys = [
    'token',
    'access_token',
    'authToken',
    'stickpro_token',
    'stickproToken',
  ];

  for (const key of possibleKeys) {
    const value = localStorage.getItem(key);
    if (value) return value.replace(/^"|"$/g, '');
  }

  return null;
};

const apiRequest = async (path, options = {}) => {
  const token = getAuthToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || 'Erro na operação');
  }

  return data;
};

const CATEGORY_CONFIG = {
  technical: {
    labelKey: 'evaluations.categories.technical',
    fallback: 'Técnica',
    icon: Target,
    className: 'border-cyan-100 bg-cyan-50 text-cyan-700',
  },
  tactical: {
    labelKey: 'evaluations.categories.tactical',
    fallback: 'Tática',
    icon: ShieldCheck,
    className: 'border-blue-100 bg-blue-50 text-blue-700',
  },
  physical: {
    labelKey: 'evaluations.categories.physical',
    fallback: 'Física',
    icon: Dumbbell,
    className: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  },
  psychological: {
    labelKey: 'evaluations.categories.psychological',
    fallback: 'Psicológica',
    icon: Brain,
    className: 'border-purple-100 bg-purple-50 text-purple-700',
  },
  attitude: {
    labelKey: 'evaluations.categories.attitude',
    fallback: 'Atitude',
    icon: Sparkles,
    className: 'border-amber-100 bg-amber-50 text-amber-700',
  },
  other: {
    labelKey: 'evaluations.categories.other',
    fallback: 'Outro',
    icon: Award,
    className: 'border-slate-200 bg-slate-50 text-slate-700',
  },
};

const EMPTY_FORM = {
  name: '',
  description: '',
  category: 'technical',
  scale_min: 1,
  scale_max: 5,
  weight: 1,
  team_id: 'global',
  is_active: true,
};

function StickEvaluationIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M18 14h28c3 0 5 2 5 5v32c0 3-2 5-5 5H18c-3 0-5-2-5-5V19c0-3 2-5 5-5Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M23 26h18M23 36h12M23 46h20"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M42 9v10M32 9v10M22 9v10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M43 31l3 3 6-8"
        stroke="#06b6d4"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function EvaluationCriteria() {
  const { t } = useLanguage();
  const permissions = usePermissions();
  const navigate = useNavigate();

  const [criteria, setCriteria] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  const tr = (key, fallback) => {
  const value = t(key);
  return value && value !== key ? value : fallback;
};

const canManageCriteria =
  permissions?.isAdmin === true ||
  permissions?.isStaff === true ||
  permissions?.canManageTeam === true ||
  permissions?.canCreateEvaluations === true ||
  permissions?.hasPermission?.('create_evaluations') === true;

useEffect(() => {
  fetchData();
}, []);

const fetchData = async () => {
  setLoading(true);

  try {
    const [criteriaData, teamsData] = await Promise.all([
      apiRequest('/evaluations/criteria?include_inactive=true'),
      apiRequest('/teams').catch(() => []),
    ]);

    setCriteria(Array.isArray(criteriaData) ? criteriaData : []);
    setTeams(Array.isArray(teamsData) ? teamsData : []);
  } catch (error) {
    console.error('Error loading evaluation criteria:', error);
    toast.error(
      tr(
        'evaluations.criteriaLoadError',
        'Erro ao carregar critérios'
      )
    );
  } finally {
    setLoading(false);
  }
};

  const openCreateDialog = () => {
    setEditingCriterion(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (criterion) => {
    setEditingCriterion(criterion);
    setForm({
      name: criterion.name || '',
      description: criterion.description || '',
      category: criterion.category || 'technical',
      scale_min: criterion.scale_min || 1,
      scale_max: criterion.scale_max || 5,
      weight: criterion.weight || 1,
      team_id: criterion.team_id || 'global',
      is_active: criterion.is_active !== false,
    });
    setDialogOpen(true);
  };

  const handleSaveCriterion = async () => {
    if (!form.name.trim()) {
      toast.error(tr('evaluations.criteriaNameRequired', 'Indica o nome do critério'));
      return;
    }

    if (Number(form.scale_min) >= Number(form.scale_max)) {
      toast.error(
        tr(
          'evaluations.invalidScale',
          'A escala mínima deve ser inferior à escala máxima'
        )
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description?.trim() || null,
        category: form.category,
        scale_min: Number(form.scale_min),
        scale_max: Number(form.scale_max),
        weight: Number(form.weight) || 1,
        team_id: form.team_id === 'global' ? null : form.team_id,
        is_active: Boolean(form.is_active),
      };

      if (editingCriterion?.id) {
        await apiRequest(`/evaluations/criteria/${editingCriterion.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success(tr('evaluations.criteriaUpdated', 'Critério atualizado'));
      } else {
        await apiRequest('/evaluations/criteria', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success(tr('evaluations.criteriaCreated', 'Critério criado'));
      }

      setDialogOpen(false);
      await fetchData();
    } catch (error) {
      console.error('Error saving criterion:', error);
      toast.error(error.message || tr('common.error', 'Erro'));
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveCriterion = async (criterion) => {
    if (!criterion?.id) return;

    const confirmed = window.confirm(
      tr(
        'evaluations.archiveCriterionConfirm',
        'Arquivar este critério? Poderá continuar guardado no histórico.'
      )
    );

    if (!confirmed) return;

    try {
      await apiRequest(`/evaluations/criteria/${criterion.id}`, {
        method: 'DELETE',
      });
      toast.success(tr('evaluations.criteriaArchived', 'Critério arquivado'));
      await fetchData();
    } catch (error) {
      console.error('Error archiving criterion:', error);
      toast.error(error.message || tr('common.error', 'Erro'));
    }
  };


  const importedSourceCodes = useMemo(
    () =>
      criteria
        .filter((criterion) => criterion.source === 'stickpro_library')
        .map((criterion) => criterion.sourceCode || criterion.source_code)
        .filter(Boolean),
    [criteria]
  );

  const handleImportSystemCriteria = async (selectedCriteria) => {
    if (!Array.isArray(selectedCriteria) || selectedCriteria.length === 0) {
      toast.error(
        tr(
          'evaluations.selectCriteriaToImport',
          'Seleciona pelo menos uma competência'
        )
      );
      return null;
    }
  
    try {
      const result = await apiRequest(
        '/evaluations/criteria/import-system',
        {
          method: 'POST',
          body: JSON.stringify({
            criteria: selectedCriteria,
          }),
        }
      );
  
      const imported = Number(result?.imported || 0);
      const skipped = Number(result?.skipped || 0);
  
      if (imported > 0 && skipped > 0) {
        toast.success(
          `${imported} competências importadas. ${skipped} já existiam na Biblioteca do Clube.`
        );
      } else if (imported > 0) {
        toast.success(
          `${imported} competências importadas para a Biblioteca do Clube.`
        );
      } else if (skipped > 0) {
        toast.info(
          'As competências selecionadas já existem na Biblioteca do Clube.'
        );
      } else {
        toast.info('Não foram importadas novas competências.');
      }
  
      await fetchData();
      return result;
    } catch (error) {
      console.error('Error importing StickPro criteria:', error);
  
      toast.error(
        error.message ||
          tr(
            'evaluations.criteriaImportError',
            'Erro ao importar competências'
          )
      );
  
      throw error;
    }
  };

  const filteredCriteria = useMemo(() => {
    return criteria.filter((criterion) => {
      if (selectedCategoryFilter !== 'all' && criterion.category !== selectedCategoryFilter) {
        return false;
      }

      if (selectedTeamFilter === 'global') {
        return !criterion.team_id;
      }

      if (selectedTeamFilter !== 'all' && criterion.team_id !== selectedTeamFilter) {
        return false;
      }

      return true;
    });
  }, [criteria, selectedCategoryFilter, selectedTeamFilter]);

  const groupedCriteria = useMemo(() => {
    return filteredCriteria.reduce((acc, criterion) => {
      const category = criterion.category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(criterion);
      return acc;
    }, {});
  }, [filteredCriteria]);

  const activeCount = criteria.filter((criterion) => criterion.is_active !== false).length;
  const globalCount = criteria.filter((criterion) => !criterion.team_id).length;
  const teamSpecificCount = criteria.filter((criterion) => criterion.team_id).length;

  const getTeamName = (teamId) => {
    if (!teamId) return tr('evaluations.globalCriterion', 'Global');
    return teams.find((team) => team.id === teamId)?.name || tr('common.team', 'Equipa');
  };

  if (!canManageCriteria) {
    return (
      <div className="space-y-4 pb-20 lg:pb-0">
        <Card className="border border-amber-100 bg-amber-50">
          <CardContent className="p-6">
            <p className="font-semibold text-amber-800">
              {tr(
                'evaluations.noPermission',
                'Sem permissão para gerir critérios de avaliação.'
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="space-y-5 pb-20 pt-1 lg:pb-0"
      data-testid="evaluation-criteria-page"
    >
      <section className="overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-slate-950 p-5 text-white shadow-xl shadow-slate-200/70 sm:p-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate('/development-center')}
          className="mb-4 -ml-2 text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Centro de Desenvolvimento
        </Button>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="mb-3 border border-white/15 bg-white/10 text-white">
              <Award className="mr-1.5 h-3.5 w-3.5" />
              {tr('evaluations.module', 'Avaliação dos Atletas')}
            </Badge>

            <h1 className="font-heading text-3xl tracking-tight sm:text-5xl">
              {tr('evaluations.criteriaTitle', 'Critérios de Avaliação')}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Biblioteca oficial de competências e critérios personalizados
              do clube, organizados para apoiar uma avaliação objetiva.
            </p>
          </div>

          <Button
            type="button"
            className="h-11 rounded-full bg-cyan-500 px-5 text-white hover:bg-cyan-600"
            onClick={openCreateDialog}
          >
            <Plus className="mr-2 h-4 w-4" />
            {tr('evaluations.newCriterion', 'Novo critério')}
          </Button>
        </div>
      </section>

      <StickProCriteriaLibrary
        canImport={canManageCriteria}
        importedSourceCodes={importedSourceCodes}
        onImport={handleImportSystemCriteria}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-cyan-100 bg-gradient-to-br from-white via-cyan-50/70 to-slate-50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
              {tr('evaluations.activeCriteria', 'Critérios ativos do clube')}
            </p>
            <p className="mt-2 font-heading text-4xl text-slate-950">{activeCount}</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-gradient-to-br from-white via-emerald-50/70 to-slate-50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {tr('evaluations.globalCriteria', 'Globais')}
            </p>
            <p className="mt-2 font-heading text-4xl text-slate-950">{globalCount}</p>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-gradient-to-br from-white via-purple-50/70 to-slate-50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
              {tr('evaluations.teamCriteria', 'Por equipa')}
            </p>
            <p className="mt-2 font-heading text-4xl text-slate-950">
              {teamSpecificCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <StickEvaluationIcon className="h-6 w-6 text-cyan-600" />
                Critérios do clube
              </CardTitle>
              <CardDescription>
                Critérios personalizados, globais ou específicos por equipa.
              </CardDescription>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:w-[440px]">
              <Select value={selectedTeamFilter} onValueChange={setSelectedTeamFilter}>
                <SelectTrigger className="rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">{tr('common.allTeams', 'Todas as equipas')}</SelectItem>
                  <SelectItem value="global">{tr('evaluations.globalCriterion', 'Global')}</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedCategoryFilter}
                onValueChange={setSelectedCategoryFilter}
              >
                <SelectTrigger className="rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">
                    {tr('evaluations.allCategories', 'Todas as categorias')}
                  </SelectItem>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {tr(config.labelKey, config.fallback)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
            </div>
          ) : filteredCriteria.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <Award className="mb-3 h-12 w-12 text-slate-300" />
              <p className="font-heading text-xl text-slate-950">
                Ainda não existem critérios personalizados
              </p>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Cria critérios próprios do clube ou importa competências da
                Biblioteca Oficial StickPro.
              </p>
              <Button className="mt-5 rounded-full" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                {tr('evaluations.newCriterion', 'Novo critério')}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(CATEGORY_CONFIG).map(([categoryKey, config]) => {
                const items = groupedCriteria[categoryKey] || [];
                if (items.length === 0) return null;

                const CategoryIcon = config.icon;

                return (
                  <section key={categoryKey}>
                    <div className="mb-3 flex items-center gap-2">
                      <Badge variant="outline" className={config.className}>
                        <CategoryIcon className="mr-1 h-3.5 w-3.5" />
                        {tr(config.labelKey, config.fallback)}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {items.length} {tr('evaluations.criteria', 'critérios')}
                      </span>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      {items.map((criterion) => (
                        <div
                          key={criterion.id}
                          className={`rounded-3xl border p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${
                            criterion.is_active === false
                              ? 'border-slate-200 bg-slate-50 opacity-60'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate font-heading text-lg text-slate-950">
                                  {criterion.name}
                                </h3>

                                {criterion.is_active === false && (
                                  <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-500">
                                    {tr('common.archived', 'Arquivado')}
                                  </Badge>
                                )}

                                {criterion.source === 'stickpro_library' && (
                                  <Badge
                                    variant="outline"
                                    className="border-cyan-200 bg-cyan-50 text-cyan-700"
                                  >
                                    Biblioteca StickPro
                                  </Badge>
                                )}
                              </div>

                              {criterion.description && (
                                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                                  {criterion.description}
                                </p>
                              )}
                            </div>

                            <div className="flex shrink-0 gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-full"
                                onClick={() => openEditDialog(criterion)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>

                              {criterion.is_active !== false && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                                  onClick={() => handleArchiveCriterion(criterion)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                            <div className="rounded-2xl bg-slate-50 p-3">
                              <p className="text-slate-400">{tr('evaluations.scale', 'Escala')}</p>
                              <p className="font-semibold text-slate-800">
                                {criterion.scale_min}–{criterion.scale_max}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-3">
                              <p className="text-slate-400">{tr('evaluations.weight', 'Peso')}</p>
                              <p className="font-semibold text-slate-800">
                                {criterion.weight || 1}x
                              </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-3">
                              <p className="text-slate-400">{tr('common.scope', 'Âmbito')}</p>
                              <p className="truncate font-semibold text-slate-800">
                                {getTeamName(criterion.team_id)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>
              {editingCriterion
                ? tr('evaluations.editCriterion', 'Editar critério')
                : tr('evaluations.newCriterion', 'Novo critério')}
            </DialogTitle>
            <DialogDescription>
              {tr(
                'evaluations.criterionFormHelp',
                'Define nome, categoria, escala e peso. Estes critérios serão usados nas avaliações dos atletas.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="criterion-name">{tr('common.name', 'Nome')}</Label>
              <Input
                id="criterion-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder={tr('evaluations.criterionNameExample', 'Ex.: Remate à baliza')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="criterion-description">
                {tr('common.description', 'Descrição')}
              </Label>
              <Textarea
                id="criterion-description"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder={tr(
                  'evaluations.criterionDescriptionExample',
                  'Descreve o que o treinador deve observar neste critério.'
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>{tr('evaluations.category', 'Categoria')}</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {tr(config.labelKey, config.fallback)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>{tr('common.team', 'Equipa')}</Label>
                <Select
                  value={form.team_id}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, team_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="global">
                      {tr('evaluations.globalCriterion', 'Global')}
                    </SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>{tr('evaluations.scaleMin', 'Escala mínima')}</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.scale_min}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      scale_min: Number(event.target.value),
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>{tr('evaluations.scaleMax', 'Escala máxima')}</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.scale_max}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      scale_max: Number(event.target.value),
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>{tr('evaluations.weight', 'Peso')}</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.weight}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      weight: Number(event.target.value),
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setDialogOpen(false)}
            >
              {tr('common.cancel', 'Cancelar')}
            </Button>

            <Button
              type="button"
              className="rounded-full"
              onClick={handleSaveCriterion}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tr('common.save', 'Guardar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
