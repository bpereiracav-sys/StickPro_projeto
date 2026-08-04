import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { usePermissions } from '../context/PermissionsContext';
import {
  evaluationsApi,
  teamsApi,
} from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
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
  Award,
  ClipboardCheck,
  Copy,
  Dumbbell,
  Flag,
  Goal,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import CriteriaTreeSelector from
  '../components/development/CriteriaTreeSelector';
import {
  DEVELOPMENT_AGE_GROUPS,
  DEVELOPMENT_EVALUATION_OBJECTIVES,
  DEVELOPMENT_PLAN_TEMPLATES,
  DEVELOPMENT_PLAYER_TYPES,
  DEVELOPMENT_SEASON_MOMENTS,
  applyDevelopmentPlanTemplate,
  buildIntelligentEvaluationPlan,
} from '../data/developmentPlanTemplates';

const PLAN_CATEGORIES = {
  training: {
    labelKey: 'evaluations.planCategories.training',
    fallback: 'Treino',
    icon: Dumbbell,
    className: 'border-cyan-100 bg-cyan-50 text-cyan-700',
  },
  match: {
    labelKey: 'evaluations.planCategories.match',
    fallback: 'Jogo',
    icon: Flag,
    className: 'border-amber-100 bg-amber-50 text-amber-700',
  },
  goalkeeper: {
    labelKey: 'evaluations.planCategories.goalkeeper',
    fallback: 'Guarda-redes',
    icon: Goal,
    className: 'border-violet-100 bg-violet-50 text-violet-700',
  },
  technical: {
    labelKey: 'evaluations.planCategories.technical',
    fallback: 'Técnico',
    icon: Target,
    className: 'border-blue-100 bg-blue-50 text-blue-700',
  },
  tactical: {
    labelKey: 'evaluations.planCategories.tactical',
    fallback: 'Tático',
    icon: ShieldCheck,
    className: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  },
  physical: {
    labelKey: 'evaluations.planCategories.physical',
    fallback: 'Físico',
    icon: Dumbbell,
    className: 'border-orange-100 bg-orange-50 text-orange-700',
  },
  custom: {
    labelKey: 'evaluations.planCategories.custom',
    fallback: 'Personalizado',
    icon: Award,
    className: 'border-slate-200 bg-slate-50 text-slate-700',
  },
};

const PLAN_PLAYER_TYPES = {
  field_player: {
    label: 'Jogadores de campo',
    shortLabel: 'Campo',
    icon: Target,
    className:
      'border-blue-100 bg-blue-50 text-blue-700',
  },

  goalkeeper: {
    label: 'Guarda-redes',
    shortLabel: 'Guarda-redes',
    icon: Goal,
    className:
      'border-violet-100 bg-violet-50 text-violet-700',
  },
};

const EMPTY_FORM = {
  name: '',
  description: '',
  category: 'training',

  // Tipo de atleta a quem o plano se destina.
  // Guarda-redes pode utilizar critérios gerais e específicos.
  player_type: 'field_player',

  team_id: 'global',
  estimated_minutes: 5,
  criteria: [],
  is_active: true,
};

const EMPTY_INTELLIGENT_CONFIG = {
  mode: 'intelligent',
  template_id: 'initial_field',
  age_group: 'sub15',
  player_type: 'field',
  season_moment: 'initial',
  objective: 'initial',
};

const normalizePlanPlayerType = (value) => {
  if (
    value === 'goalkeeper' ||
    value === 'goalie' ||
    value === 'gk'
  ) {
    return 'goalkeeper';
  }

  return 'field_player';
};

const toIntelligentPlayerType = (value) =>
  normalizePlanPlayerType(value) === 'goalkeeper'
    ? 'goalkeeper'
    : 'field';

const isGoalkeeperCriterion = (criterion = {}) => {
  const playerType =
    criterion?.playerType ||
    criterion?.player_type ||
    criterion?.criterion?.playerType ||
    criterion?.criterion?.player_type ||
    null;

  const domain =
    criterion?.domain ||
    criterion?.criterion?.domain ||
    null;

  const code = String(
    criterion?.code ||
    criterion?.source_code ||
    criterion?.criterion?.code ||
    ''
  ).toUpperCase();

  return (
    playerType === 'goalkeeper' ||
    domain === 'goalkeeper' ||
    code.startsWith('GK-')
  );
};

const isCriterionCompatibleWithPlayerType = (
  criterion,
  playerType
) => {
  if (
    normalizePlanPlayerType(playerType) ===
    'goalkeeper'
  ) {
    // Guarda-redes pode ser avaliado por todos os critérios.
    return true;
  }

  // Jogador de campo nunca pode receber critérios específicos de GR.
  return !isGoalkeeperCriterion(criterion);
};

function DevelopmentIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 48c8-17 17-26 32-32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M18 44h28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="22" cy="51" r="5" stroke="currentColor" strokeWidth="4" />
      <circle cx="42" cy="51" r="5" stroke="currentColor" strokeWidth="4" />
      <path d="M38 12h12v12" stroke="#06b6d4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M50 12 34 28" stroke="#06b6d4" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default function EvaluationPlans() {
  const { t } = useLanguage();
  const permissions = usePermissions();

  const [plans, setPlans] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [intelligentConfig, setIntelligentConfig] = useState(
    EMPTY_INTELLIGENT_CONFIG
  );
  const [teamFilter, setTeamFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const tr = (key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };

  const canManagePlans =
    permissions?.canCreateEvaluations === true;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
  
    try {
      const [plansResponse, criteriaResponse, teamsResponse] =
        await Promise.all([
          evaluationsApi.getPlans({
            include_inactive: true,
          }),
          evaluationsApi.getCriteria(),
          teamsApi.getAll().catch(() => ({
            data: [],
          })),
        ]);
  
      const plansData = plansResponse?.data;
      const criteriaData = criteriaResponse?.data;
      const teamsData = teamsResponse?.data;
  
      setPlans(
        Array.isArray(plansData)
          ? plansData
          : []
      );
  
      setCriteria(
        Array.isArray(criteriaData)
          ? criteriaData
          : []
      );
  
      setTeams(
        Array.isArray(teamsData)
          ? teamsData
          : []
      );
    } catch (error) {
      console.error(
        'Error loading evaluation plans:',
        error
      );
  
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          tr(
            'evaluations.plansLoadError',
            'Erro ao carregar planos de avaliação'
          )
      );
    } finally {
      setLoading(false);
    }
  };

  const getTeamName = (teamId) => {
    if (!teamId) return tr('evaluations.globalPlan', 'Global');
    return teams.find((team) => team.id === teamId)?.name || tr('common.team', 'Equipa');
  };

  const getCriterionName = (criterionId) => {
    return criteria.find((criterion) => criterion.id === criterionId)?.name || criterionId;
  };

  const openCreateDialog = () => {
    setEditingPlan(null);
  
    setForm({
      ...EMPTY_FORM,
    });
  
    setIntelligentConfig({
      ...EMPTY_INTELLIGENT_CONFIG,
    });
  
    setDialogOpen(true);
  };

  const getPlanPlayerType = (plan = {}) => {
    if (
      plan?.player_type === 'goalkeeper'
    ) {
      return 'goalkeeper';
    }
  
    if (
      plan?.player_type === 'field_player'
    ) {
      return 'field_player';
    }
  
    /*
     * Compatibilidade com planos antigos:
     * planos sem player_type são considerados GR
     * quando têm categoria ou critérios específicos.
     */
    if (
      plan?.category === 'goalkeeper'
    ) {
      return 'goalkeeper';
    }
  
    const hasGoalkeeperCriteria =
      (plan?.criteria || []).some(
        (item) =>
          isGoalkeeperCriterion(
            item?.criterion ||
            item
          )
      );
  
    return hasGoalkeeperCriteria
      ? 'goalkeeper'
      : 'field_player';
  };
  
  const openEditDialog = (plan) => {
    const planCriteria =
      Array.isArray(plan?.criteria)
        ? plan.criteria
        : [];
  
    /*
     * Compatibilidade com planos antigos:
     *
     * 1. utilizar player_type quando já existe;
     * 2. considerar categoria goalkeeper;
     * 3. detetar critérios GK guardados no plano.
     */
    const hasGoalkeeperCriteria =
      planCriteria.some((item) => {
        const criterion =
          item?.criterion ||
          criteria.find(
            (candidate) =>
              candidate.id ===
              item.criterion_id
          ) ||
          item;
  
        return isGoalkeeperCriterion(
          criterion
        );
      });
  
    const resolvedPlayerType =
      plan?.player_type
        ? normalizePlanPlayerType(
            plan.player_type
          )
        : (
            plan?.category === 'goalkeeper' ||
            hasGoalkeeperCriteria
          )
          ? 'goalkeeper'
          : 'field_player';
  
    setEditingPlan(plan);
  
    setIntelligentConfig((current) => ({
      ...current,
      mode: 'manual',
      player_type:
        toIntelligentPlayerType(
          resolvedPlayerType
        ),
    }));
  
    setForm({
      name: plan.name || '',
      description:
        plan.description || '',
      category:
        plan.category || 'training',
  
      player_type:
        resolvedPlayerType,
  
      team_id:
        plan.team_id || 'global',
  
      estimated_minutes:
        plan.estimated_minutes || 5,
  
      is_active:
        plan.is_active !== false,
  
      criteria:
        planCriteria.map(
          (item, index) => ({
            criterion_id:
              item.criterion_id,
  
            weight:
              item.weight || 1,
  
            required:
              item.required !== false,
  
            order:
              item.order ?? index,
          })
        ),
    });
  
    setDialogOpen(true);
  };

  const toggleCriterion = (criterionId) => {
    if (!criterionId) {
      return;
    }
  
    setForm((current) => {
      const exists =
        current.criteria.some(
          (item) =>
            String(
              item.criterion_id
            ) ===
            String(criterionId)
        );
  
      if (exists) {
        return {
          ...current,
  
          criteria:
            current.criteria
              .filter(
                (item) =>
                  String(
                    item.criterion_id
                  ) !==
                  String(criterionId)
              )
              .map(
                (item, index) => ({
                  ...item,
                  order: index,
                })
              ),
        };
      }
  
      const criterion =
        criteria.find(
          (candidate) =>
            String(candidate.id) ===
            String(criterionId)
        );
  
      if (
        criterion &&
        !isCriterionCompatibleWithPlayerType(
          criterion,
          current.player_type
        )
      ) {
        toast.error(
          'Este critério não é compatível com o tipo de atleta selecionado.'
        );
  
        return current;
      }
  
      return {
        ...current,
  
        criteria: [
          ...current.criteria,
          {
            criterion_id:
              criterionId,
  
            weight: 1,
            required: true,
  
            order:
              current.criteria.length,
          },
        ],
      };
    });
  };

  const selectCriteria = (
    criterionIds = []
  ) => {
    const requestedIds =
      new Set(
        criterionIds
          .filter(Boolean)
          .map(String)
      );
  
    if (requestedIds.size === 0) {
      return;
    }
  
    setForm((current) => {
      const existingIds =
        new Set(
          current.criteria.map(
            (item) =>
              String(
                item.criterion_id
              )
          )
        );
  
      const additions =
        criteria
          .filter((criterion) =>
            requestedIds.has(
              String(criterion.id)
            )
          )
          .filter((criterion) =>
            isCriterionCompatibleWithPlayerType(
              criterion,
              current.player_type
            )
          )
          .filter(
            (criterion) =>
              !existingIds.has(
                String(criterion.id)
              )
          )
          .map(
            (criterion, index) => ({
              criterion_id:
                criterion.id,
  
              weight: 1,
              required: true,
  
              order:
                current.criteria.length +
                index,
            })
          );
  
      return {
        ...current,
        criteria: [
          ...current.criteria,
          ...additions,
        ],
      };
    });
  };
  
  const removeCriteria = (
    criterionIds = []
  ) => {
    const idsToRemove =
      new Set(
        criterionIds
          .filter(Boolean)
          .map(String)
      );
  
    setForm((current) => ({
      ...current,
  
      criteria:
        current.criteria
          .filter(
            (item) =>
              !idsToRemove.has(
                String(
                  item.criterion_id
                )
              )
          )
          .map(
            (item, index) => ({
              ...item,
              order: index,
            })
          ),
    }));
  };

  const handlePlanPlayerTypeChange = (
    nextPlayerType
  ) => {
    const normalizedPlayerType =
      normalizePlanPlayerType(
        nextPlayerType
      );
  
    setForm((current) => {
      const compatibleCriteria =
        current.criteria.filter(
          (item) => {
            const criterion =
              criteria.find(
                (candidate) =>
                  String(candidate.id) ===
                  String(
                    item.criterion_id
                  )
              );
  
            if (!criterion) {
              return true;
            }
  
            return isCriterionCompatibleWithPlayerType(
              criterion,
              normalizedPlayerType
            );
          }
        );
  
      const removedCount =
        current.criteria.length -
        compatibleCriteria.length;
  
      if (removedCount > 0) {
        toast.info(
          `${removedCount} ${
            removedCount === 1
              ? 'critério específico de guarda-redes foi removido'
              : 'critérios específicos de guarda-redes foram removidos'
          } do plano.`
        );
      }
  
      return {
        ...current,
  
        player_type:
          normalizedPlayerType,
  
        /*
         * Quando se escolhe GR, a categoria pode assumir
         * automaticamente Guarda-redes.
         *
         * Ao regressar a jogador de campo, evita manter
         * uma categoria incompatível.
         */
        category:
          normalizedPlayerType ===
          'goalkeeper'
            ? (
                current.category ===
                'training'
                  ? 'goalkeeper'
                  : current.category
              )
            : (
                current.category ===
                'goalkeeper'
                  ? 'training'
                  : current.category
              ),
  
        criteria:
          compatibleCriteria.map(
            (item, index) => ({
              ...item,
              order: index,
            })
          ),
      };
    });
  
    setIntelligentConfig(
      (current) => ({
        ...current,
  
        player_type:
          toIntelligentPlayerType(
            normalizedPlayerType
          ),
  
        template_id: 'custom',
      })
    );
  };
  
  const updateCriterionWeight = (criterionId, weight) => {
    setForm((prev) => ({
      ...prev,
      criteria: prev.criteria.map((item) =>
        item.criterion_id === criterionId
          ? { ...item, weight: Number(weight) || 1 }
          : item
      ),
    }));
  };

  const updateIntelligentConfig = (field, value) => {
    setIntelligentConfig((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleTemplateChange = (
    templateId
  ) => {
    setIntelligentConfig(
      (current) => {
        const nextConfig =
          applyDevelopmentPlanTemplate(
            current,
            templateId
          );
  
        const nextPlayerType =
          normalizePlanPlayerType(
            nextConfig.player_type
          );
  
        setForm(
          (currentForm) => {
            const compatibleCriteria =
              currentForm.criteria.filter(
                (item) => {
                  const criterion =
                    criteria.find(
                      (candidate) =>
                        String(candidate.id) ===
                        String(
                          item.criterion_id
                        )
                    );
  
                  return (
                    !criterion ||
                    isCriterionCompatibleWithPlayerType(
                      criterion,
                      nextPlayerType
                    )
                  );
                }
              );
  
            return {
              ...currentForm,
  
              player_type:
                nextPlayerType,
  
              category:
                nextPlayerType ===
                'goalkeeper'
                  ? 'goalkeeper'
                  : (
                      currentForm.category ===
                      'goalkeeper'
                        ? 'training'
                        : currentForm.category
                    ),
  
              criteria:
                compatibleCriteria.map(
                  (item, index) => ({
                    ...item,
                    order: index,
                  })
                ),
            };
          }
        );
  
        return nextConfig;
      }
    );
  };

  const generateSuggestedCriteria = () => {
    if (criteria.length === 0) {
      toast.error(
        tr(
          'evaluations.createCriteriaFirst',
          'Cria primeiro critérios de avaliação para poderes construir planos.'
        )
      );
      return;
    }

    const suggestion = buildIntelligentEvaluationPlan(
      criteria,
      intelligentConfig
    );

    if (suggestion.criteria.length === 0) {
      toast.error(
        tr(
          'evaluations.noSuggestedCriteria',
          'Não foram encontrados critérios compatíveis com esta configuração.'
        )
      );
      return;
    }

    const suggestedPlayerType =
      normalizePlanPlayerType(
        intelligentConfig.player_type
      );
    
    const compatibleSuggestedCriteria =
      suggestion.criteria.filter(
        (item) => {
          const criterion =
            criteria.find(
              (candidate) =>
                String(candidate.id) ===
                String(
                  item.criterion_id
                )
            );
    
          return (
            !criterion ||
            isCriterionCompatibleWithPlayerType(
              criterion,
              suggestedPlayerType
            )
          );
        }
      );
    
    setForm((current) => ({
      ...current,
    
      name:
        current.name.trim()
          ? current.name
          : suggestion.name,
    
      description:
        current.description.trim()
          ? current.description
          : suggestion.description,
    
      player_type:
        suggestedPlayerType,
    
      category:
        suggestedPlayerType ===
        'goalkeeper'
          ? 'goalkeeper'
          : suggestion.category,
    
      estimated_minutes:
        suggestion.estimated_minutes,
    
      criteria:
        compatibleSuggestedCriteria.map(
          (item, index) => ({
            ...item,
            order: index,
          })
        ),
    }));

    toast.success(
      `${compatibleSuggestedCriteria.length} critérios sugeridos. Revê a seleção antes de guardar.`
    );
  };

  const handleSavePlan = async () => {
    if (!form.name.trim()) {
      toast.error(
        tr(
          'evaluations.planNameRequired',
          'Indica o nome do plano'
        )
      );
      return;
    }
  
    if (form.criteria.length === 0) {
      toast.error(
        tr(
          'evaluations.planCriteriaRequired',
          'Seleciona pelo menos um critério para o plano'
        )
      );
      return;
    }

  const incompatibleCriteria =
    form.criteria
      .map((item) =>
        criteria.find(
          (criterion) =>
            String(criterion.id) ===
            String(
              item.criterion_id
            )
        )
      )
      .filter(Boolean)
      .filter(
        (criterion) =>
          !isCriterionCompatibleWithPlayerType(
            criterion,
            form.player_type
          )
      );
  
  if (
    incompatibleCriteria.length > 0
  ) {
    toast.error(
      'Este plano contém critérios específicos de guarda-redes e está configurado para jogadores de campo.'
    );
  
    return;
  }
    
    setSaving(true);
  
    try {
      const payload = {
        name: form.name.trim(),
      
        description:
          form.description?.trim() ||
          null,
      
        category:
          form.category,
      
        player_type:
          normalizePlanPlayerType(
            form.player_type
          ),
      
        team_id:
          form.team_id === 'global'
            ? null
            : form.team_id,
      
        estimated_minutes:
          Number(
            form.estimated_minutes
          ) || null,
      
        is_active:
          Boolean(form.is_active),
      
        criteria:
          form.criteria.map(
            (item, index) => ({
              criterion_id:
                item.criterion_id,
      
              weight:
                Number(item.weight) ||
                1,
      
              required:
                item.required !== false,
      
              order: index,
            })
          ),
      };
  
      if (editingPlan?.id) {
        await evaluationsApi.updatePlan(
          editingPlan.id,
          payload
        );
  
        toast.success(
          tr(
            'evaluations.planUpdated',
            'Plano atualizado'
          )
        );
      } else {
        await evaluationsApi.createPlan(payload);
  
        toast.success(
          tr(
            'evaluations.planCreated',
            'Plano criado'
          )
        );
      }
  
      setDialogOpen(false);

      setEditingPlan(null);
      
      setForm({
        ...EMPTY_FORM,
      });
      
      setIntelligentConfig({
        ...EMPTY_INTELLIGENT_CONFIG,
      });
  
      await fetchData();
    } catch (error) {
      console.error(
        'Error saving evaluation plan:',
        error
      );
  
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          tr('common.error', 'Erro')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicatePlan = async (plan) => {
    if (!plan?.id) {
      return;
    }
  
    try {
      await evaluationsApi.duplicatePlan(plan.id);
  
      toast.success(
        tr(
          'evaluations.planDuplicated',
          'Plano duplicado'
        )
      );
  
      await fetchData();
    } catch (error) {
      console.error(
        'Error duplicating evaluation plan:',
        error
      );
  
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          tr('common.error', 'Erro')
      );
    }
  };

  const handleArchivePlan = async (plan) => {
    if (!plan?.id) {
      return;
    }
  
    const confirmed = window.confirm(
      tr(
        'evaluations.archivePlanConfirm',
        'Arquivar este plano? Poderá continuar guardado no histórico.'
      )
    );
  
    if (!confirmed) {
      return;
    }
  
    try {
      await evaluationsApi.archivePlan(plan.id);
  
      toast.success(
        tr(
          'evaluations.planArchived',
          'Plano arquivado'
        )
      );
  
      await fetchData();
    } catch (error) {
      console.error(
        'Error archiving evaluation plan:',
        error
      );
  
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          tr('common.error', 'Erro')
      );
    }
  };

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      if (categoryFilter !== 'all' && plan.category !== categoryFilter) return false;
      if (teamFilter === 'global') return !plan.team_id;
      if (teamFilter !== 'all' && plan.team_id !== teamFilter) return false;
      return true;
    });
  }, [plans, teamFilter, categoryFilter]);

  const activePlans = plans.filter((plan) => plan.is_active !== false).length;
  const globalPlans = plans.filter((plan) => !plan.team_id).length;
  const teamPlans = plans.filter((plan) => plan.team_id).length;

  if (!canManagePlans) {
    return (
      <div className="space-y-4 pb-20 lg:pb-0">
        <Card className="border border-amber-100 bg-amber-50">
          <CardContent className="p-6">
            <p className="font-semibold text-amber-800">
              {tr(
                'evaluations.noPermission',
                'Sem permissão para gerir planos de avaliação.'
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 pt-1 lg:-mt-12 lg:pb-0" data-testid="evaluation-plans-page">
      <section className="overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-slate-950 p-5 text-white shadow-xl shadow-slate-200/70 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="mb-3 border border-white/15 bg-white/10 text-white">
              <DevelopmentIcon className="mr-1.5 h-4 w-4" />
              {tr('developmentCenter.title', 'Centro de Desenvolvimento')}
            </Badge>

            <h1 className="font-heading text-3xl tracking-tight sm:text-5xl">
              {tr('evaluations.plansTitle', 'Planos de Avaliação')}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              {tr(
                'evaluations.plansSubtitle',
                'Cria modelos reutilizáveis para avaliar atletas de forma rápida, coerente e ajustada ao contexto do treino ou jogo.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link to="/evaluation-criteria">
                <ClipboardCheck className="mr-2 h-4 w-4" />
                {tr('evaluations.criteria', 'Critérios')}
              </Link>
            </Button>

            <Button
              type="button"
              className="h-11 rounded-full bg-cyan-500 px-5 text-white hover:bg-cyan-600"
              onClick={openCreateDialog}
            >
              <Plus className="mr-2 h-4 w-4" />
              {tr('evaluations.newPlan', 'Novo plano')}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-cyan-100 bg-gradient-to-br from-white via-cyan-50/70 to-slate-50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
              {tr('evaluations.activePlans', 'Planos ativos')}
            </p>
            <p className="mt-2 font-heading text-4xl text-slate-950">{activePlans}</p>
            <p className="mt-1 text-xs text-slate-500">
              {tr('evaluations.readyToUse', 'Prontos para avaliação')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-gradient-to-br from-white via-emerald-50/70 to-slate-50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {tr('evaluations.globalPlans', 'Globais')}
            </p>
            <p className="mt-2 font-heading text-4xl text-slate-950">{globalPlans}</p>
            <p className="mt-1 text-xs text-slate-500">
              {tr('evaluations.forClub', 'Para todo o clube')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-gradient-to-br from-white via-purple-50/70 to-slate-50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
              {tr('evaluations.teamPlans', 'Por equipa')}
            </p>
            <p className="mt-2 font-heading text-4xl text-slate-950">{teamPlans}</p>
            <p className="mt-1 text-xs text-slate-500">
              {tr('evaluations.customizedByTeam', 'Adaptados ao contexto')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-6 w-6 text-cyan-600" />
                {tr('evaluations.plansLibrary', 'Biblioteca de Planos de Avaliação')}
              </CardTitle>
              <CardDescription>
                {tr(
                  'evaluations.plansLibraryHelp',
                  'Organiza planos para treino técnico, jogo, guarda-redes, patinagem ou qualquer contexto criado pelo treinador.'
                )}
              </CardDescription>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:w-[440px]">
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">{tr('common.allTeams', 'Todas as equipas')}</SelectItem>
                  <SelectItem value="global">{tr('evaluations.globalPlan', 'Global')}</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">
                    {tr('evaluations.allPlanCategories', 'Todas as categorias')}
                  </SelectItem>
                  {Object.entries(PLAN_CATEGORIES).map(([key, config]) => (
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
          ) : filteredPlans.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <DevelopmentIcon className="mb-3 h-16 w-16 text-slate-300" />
              <p className="font-heading text-xl text-slate-950">
                {tr('evaluations.noPlans', 'Ainda não existem planos')}
              </p>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                {tr(
                  'evaluations.noPlansHelp',
                  'Começa por criar um plano simples, como Treino Técnico ou Jogo Oficial.'
                )}
              </p>
              <Button className="mt-5 rounded-full" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                {tr('evaluations.newPlan', 'Novo plano')}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredPlans.map((plan) => {
                const config = PLAN_CATEGORIES[plan.category] || PLAN_CATEGORIES.custom;
                const PlanIcon = config.icon;

                const planPlayerType =
                  getPlanPlayerType(plan);
                
                const playerTypeConfig =
                  PLAN_PLAYER_TYPES[
                    planPlayerType
                  ] ||
                  PLAN_PLAYER_TYPES.field_player;
                
                const PlayerTypeIcon =
                  playerTypeConfig.icon;
              
                return (
                  <div
                    key={plan.id}
                    className={`rounded-3xl border p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${
                      plan.is_active === false
                        ? 'border-slate-200 bg-slate-50 opacity-60'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={config.className}
                          >
                            <PlanIcon className="mr-1 h-3.5 w-3.5" />
                        
                            {tr(
                              config.labelKey,
                              config.fallback
                            )}
                          </Badge>
                        
                          <Badge
                            variant="outline"
                            className={
                              playerTypeConfig.className
                            }
                          >
                            <PlayerTypeIcon className="mr-1 h-3.5 w-3.5" />
                        
                            {playerTypeConfig.shortLabel}
                          </Badge>
                        
                          {plan.is_active === false && (
                            <Badge
                              variant="outline"
                              className="border-slate-200 bg-slate-100 text-slate-500"
                            >
                              {tr(
                                'common.archived',
                                'Arquivado'
                              )}
                            </Badge>
                          )}
                        </div>

                        <h3 className="mt-2 font-heading text-xl text-slate-950">
                          {plan.name}
                        </h3>

                        {plan.description && (
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                            {plan.description}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full"
                          onClick={() => openEditDialog(plan)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full"
                          onClick={() => handleDuplicatePlan(plan)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>

                        {plan.is_active !== false && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleArchivePlan(plan)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-slate-400">{tr('evaluations.criteria', 'Critérios')}</p>
                        <p className="font-semibold text-slate-800">
                          {plan.criteria_count ?? plan.criteria?.length ?? 0}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-slate-400">{tr('evaluations.weight', 'Peso')}</p>
                        <p className="font-semibold text-slate-800">
                          {plan.total_weight || 0}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-slate-400">{tr('evaluations.time', 'Tempo')}</p>
                        <p className="font-semibold text-slate-800">
                          {plan.estimated_minutes ? `${plan.estimated_minutes} min` : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {(plan.criteria || []).slice(0, 6).map((item) => (
                        <Badge key={item.criterion_id} variant="outline" className="rounded-full">
                          {item.criterion?.name || getCriterionName(item.criterion_id)}
                        </Badge>
                      ))}
                      {(plan.criteria || []).length > 6 && (
                        <Badge variant="outline" className="rounded-full">
                          +{(plan.criteria || []).length - 6}
                        </Badge>
                      )}
                    </div>

                    <p className="mt-3 text-xs text-slate-400">
                      {tr('common.scope', 'Âmbito')}: {getTeamName(plan.team_id)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>
              {editingPlan
                ? tr('evaluations.editPlan', 'Editar plano')
                : tr('evaluations.newPlan', 'Novo plano')}
            </DialogTitle>
            <DialogDescription>
              {tr(
                'evaluations.planFormHelp',
                'Seleciona os critérios que farão parte deste plano. Mais tarde o treinador poderá usar este plano para avaliar uma equipa inteira rapidamente.'
              )}
            </DialogDescription>
          </DialogHeader>

          {!editingPlan && (
            <div className="rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-50/80 via-white to-blue-50/60 p-4 sm:p-5">
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-cyan-600" />
                    <p className="font-heading text-lg font-semibold text-slate-950">
                      Assistente StickPro
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Escolhe como pretendes construir este plano de avaliação.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => updateIntelligentConfig('mode', 'intelligent')}
                    className={`rounded-2xl border p-4 text-left transition ${
                      intelligentConfig.mode === 'intelligent'
                        ? 'border-cyan-400 bg-white ring-2 ring-cyan-100'
                        : 'border-slate-200 bg-white/70 hover:border-cyan-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-950">
                          Plano inteligente
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          O StickPro sugere uma seleção inicial de critérios com base no contexto.
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateIntelligentConfig('mode', 'manual')}
                    className={`rounded-2xl border p-4 text-left transition ${
                      intelligentConfig.mode === 'manual'
                        ? 'border-slate-500 bg-white ring-2 ring-slate-100'
                        : 'border-slate-200 bg-white/70 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        <ClipboardCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-950">
                          Plano manual
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Mantém o processo atual e seleciona todos os critérios manualmente.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                {intelligentConfig.mode === 'intelligent' && (
                  <div className="rounded-2xl border border-cyan-100 bg-white p-4">
                    <div className="mb-4 grid gap-2">
                      <Label>Modelo StickPro</Label>
                      <Select
                        value={intelligentConfig.template_id}
                        onValueChange={handleTemplateChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar modelo" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {DEVELOPMENT_PLAN_TEMPLATES.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.label}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">Configuração personalizada</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs leading-5 text-slate-500">
                        {DEVELOPMENT_PLAN_TEMPLATES.find(
                          (template) => template.id === intelligentConfig.template_id
                        )?.description ||
                          'Ajusta livremente o escalão, posição, momento e objetivo.'}
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                      <div className="grid gap-2">
                        <Label>Escalão</Label>
                        <Select
                          value={intelligentConfig.age_group}
                          onValueChange={(value) =>
                            setIntelligentConfig((current) => ({ ...current, age_group: value, template_id: 'custom' }))
                          }
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-white">
                            {DEVELOPMENT_AGE_GROUPS.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Equipa</Label>
                        <Select
                          value={form.team_id}
                          onValueChange={(value) =>
                            setForm((current) => ({ ...current, team_id: value }))
                          }
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="global">Global</SelectItem>
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                          <Label>Posição</Label>
                      
                          <Select
                          value={
                            intelligentConfig.player_type
                          }
                          onValueChange={(value) => {
                            handlePlanPlayerTypeChange(
                              normalizePlanPlayerType(value)
                            );
                          }}
                          >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-white">
                            {DEVELOPMENT_PLAYER_TYPES.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Momento</Label>
                        <Select
                          value={intelligentConfig.season_moment}
                          onValueChange={(value) =>
                            setIntelligentConfig((current) => ({ ...current, season_moment: value, template_id: 'custom' }))
                          }
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-white">
                            {DEVELOPMENT_SEASON_MOMENTS.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Objetivo</Label>
                        <Select
                          value={intelligentConfig.objective}
                          onValueChange={(value) =>
                            setIntelligentConfig((current) => ({ ...current, objective: value, template_id: 'custom' }))
                          }
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-white">
                            {DEVELOPMENT_EVALUATION_OBJECTIVES.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs leading-5 text-slate-500">
                        A sugestão é um ponto de partida. Podes acrescentar, remover e alterar pesos antes de guardar.
                      </p>
                      <Button
                        type="button"
                        className="shrink-0 rounded-full bg-cyan-600 text-white hover:bg-cyan-700"
                        onClick={generateSuggestedCriteria}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Gerar plano
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="plan-name">{tr('common.name', 'Nome')}</Label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder={tr('evaluations.planNameExample', 'Ex.: Treino Técnico')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="plan-description">{tr('common.description', 'Descrição')}</Label>
              <Textarea
                id="plan-description"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder={tr(
                  'evaluations.planDescriptionExample',
                  'Descreve quando e como este plano deve ser usado.'
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                    {Object.entries(PLAN_CATEGORIES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {tr(config.labelKey, config.fallback)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>
                  Tipo de atleta
                </Label>
              
                <Select
                  value={form.player_type}
                  onValueChange={
                    handlePlanPlayerTypeChange
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
              
                  <SelectContent className="bg-white">
                    <SelectItem value="field_player">
                      Jogador de campo
                    </SelectItem>
              
                    <SelectItem value="goalkeeper">
                      Guarda-redes
                    </SelectItem>
                  </SelectContent>
                </Select>
              
                <p className="text-xs leading-5 text-slate-500">
                  {form.player_type ===
                  'goalkeeper'
                    ? 'Pode utilizar critérios gerais e critérios específicos de guarda-redes.'
                    : 'Os critérios específicos de guarda-redes ficam automaticamente indisponíveis.'}
                </p>
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
                      {tr('evaluations.globalPlan', 'Global')}
                    </SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>{tr('evaluations.estimatedMinutes', 'Tempo estimado')}</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.estimated_minutes}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      estimated_minutes: Number(event.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {tr(
                        'evaluations.selectCriteria',
                        'Selecionar critérios'
                      )}
                    </p>
                
                    <p className="text-sm text-slate-500">
                      {form.criteria.length}{' '}
                      {tr(
                        'evaluations.selectedCriteria',
                        'critérios selecionados'
                      )}
                    </p>
                  </div>
                
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        PLAN_PLAYER_TYPES[
                          form.player_type
                        ]?.className ||
                        PLAN_PLAYER_TYPES.field_player
                          .className
                      }
                    >
                      {form.player_type ===
                      'goalkeeper' ? (
                        <Goal className="mr-1 h-3.5 w-3.5" />
                      ) : (
                        <Target className="mr-1 h-3.5 w-3.5" />
                      )}
                
                      {PLAN_PLAYER_TYPES[
                        form.player_type
                      ]?.label ||
                        PLAN_PLAYER_TYPES.field_player
                          .label}
                    </Badge>
                
                    <Badge
                      variant="outline"
                      className="rounded-full"
                    >
                      {tr(
                        'evaluations.weight',
                        'Peso'
                      )}
                      :{' '}
                      {form.criteria.reduce(
                        (sum, item) =>
                          sum +
                          (Number(item.weight) || 1),
                        0
                      )}
                    </Badge>
                  </div>
                </div>
              
                <div>
                  <p className="font-semibold text-slate-950">
                    {tr('evaluations.selectCriteria', 'Selecionar critérios')}
                  </p>
                  <p className="text-sm text-slate-500">
                    {form.criteria.length}{' '}
                    {tr('evaluations.selectedCriteria', 'critérios selecionados')}
                  </p>
                </div>

                <Badge variant="outline" className="rounded-full">
                  {tr('evaluations.weight', 'Peso')}:{' '}
                  {form.criteria.reduce((sum, item) => sum + (Number(item.weight) || 1), 0)}
                </Badge>
              </div>

              {criteria.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
                  <p className="text-sm text-slate-500">
                    {tr(
                      'evaluations.createCriteriaFirst',
                      'Cria primeiro critérios de avaliação para poderes construir planos.'
                    )}
                  </p>
              
                  <Button
                    asChild
                    variant="outline"
                    className="mt-3 rounded-full"
                  >
                    <Link to="/evaluation-criteria">
                      {tr(
                        'evaluations.criteriaTitle',
                        'Critérios de Avaliação'
                      )}
                    </Link>
                  </Button>
                </div>
              ) : (
                <CriteriaTreeSelector
                  criteria={criteria}
                  selectedCriteria={
                    form.criteria
                  }
                  playerType={
                    form.player_type
                  }
                  onToggleCriterion={
                    toggleCriterion
                  }
                  onSelectCriteria={
                    selectCriteria
                  }
                  onRemoveCriteria={
                    removeCriteria
                  }
                  searchPlaceholder="Pesquisar por domínio, subdomínio, código ou critério..."
                  emptyMessage={
                    form.player_type ===
                    'goalkeeper'
                      ? 'Não existem critérios disponíveis para guarda-redes.'
                      : 'Não existem critérios disponíveis para jogadores de campo.'
                  }
                  renderCriterionExtra={({
                    criterion,
                    selected,
                  }) => {
                    if (!selected) {
                      return null;
                    }
              
                    const selectedCriterion =
                      form.criteria.find(
                        (item) =>
                          String(
                            item.criterion_id
                          ) ===
                          String(
                            criterion.id
                          )
                      );
              
                    if (!selectedCriterion) {
                      return null;
                    }
              
                    return (
                      <div className="mt-3 grid grid-cols-[1fr_90px] items-center gap-2 border-t border-cyan-100 pt-3">
                        <Label className="text-xs text-slate-500">
                          {tr(
                            'evaluations.weight',
                            'Peso'
                          )}
                        </Label>
              
                        <Input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={
                            selectedCriterion.weight
                          }
                          onChange={(event) =>
                            updateCriterionWeight(
                              criterion.id,
                              event.target.value
                            )
                          }
                          className="h-8 bg-white"
                        />
                      </div>
                    );
                  }}
                />
              )}
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
              onClick={handleSavePlan}
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
