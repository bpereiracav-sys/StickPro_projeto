import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { championshipsApi } from '../services/api';
import { Card, CardContent } from '../components/ui/card';
import {
  CardWithStripe,
  CardStripeHeader,
  CardStripeTitle,
  CardStripeContent,
} from '../components/ui/card-stripe';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
  Plus,
  Trophy,
  ChevronRight,
  Loader2,
  Users,
  Zap,
  ArrowLeft,
  Search,
  Filter,
  Archive,
  ShieldCheck,
  Eye,
  CalendarDays,
  BarChart3,
  ListChecks,
  Settings,
  Sparkles,
} from 'lucide-react';

const seasons = ['2023/2024', '2024/2025', '2025/2026', '2026/2027'];

const formats = [
  { value: '5x5', label: '5x5 (Campo Inteiro)' },
  { value: '3x3', label: '3x3 (Meio Campo)' },
];

const convocationTypes = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatica', label: 'Automática' },
];

const AGE_GROUPS = [
  { value: 'sub-7', label: 'Sub-7 (Bambis)' },
  { value: 'sub-9', label: 'Sub-9 (Mini)' },
  { value: 'sub-11', label: 'Sub-11 (Benjamins)' },
  { value: 'sub-13', label: 'Sub-13 (Infantis)' },
  { value: 'sub-15', label: 'Sub-15 (Iniciados)' },
  { value: 'sub-17', label: 'Sub-17 (Juvenis)' },
  { value: 'sub-20', label: 'Sub-20 (Juniores)' },
  { value: 'seniores', label: 'Seniores' },
  { value: 'veteranos', label: 'Veteranos' },
];

const COMPETITION_TYPES = [
  { value: 'campeonato_distrital', label: 'Campeonato Distrital' },
  { value: 'campeonato_nacional', label: 'Campeonato Nacional' },
  { value: 'taca', label: 'Taça' },
  { value: 'supertaca', label: 'Supertaça' },
  { value: 'torneio', label: 'Torneio' },
  { value: 'outro', label: 'Outro' },
];

const GAME_FORMAT_OPTIONS = [
  {
    value: 'normal',
    label: 'Jogo Normal',
    description: '2 partes. O treinador gere substituições livremente.',
  },
  {
    value: 'rtp',
    label: 'Regulamento Técnico-Pedagógico',
    description: '4 semi-partes. Todos os atletas devem participar conforme RTP.',
  },
  {
    value: 'apl_cup',
    label: 'Taça APL Lisboa',
    description: '3 segmentos. Todos participam na 1.ª parte; 2.ª parte livre.',
  },
  {
    value: 'custom',
    label: 'Personalizado',
    description: 'Define manualmente número de segmentos e regras.',
  },
];

function buildCompetitionRules(gameFormat) {
  if (gameFormat === 'rtp') {
    return {
      game_format: 'rtp',
      segments_count: 4,
      players_per_segment: 5,
      mandatory_participation: true,
      mandatory_segments: [1, 2, 3, 4],
      free_segments: [],
      automatic_validation: true,
    };
  }

  if (gameFormat === 'apl_cup') {
    return {
      game_format: 'apl_cup',
      segments_count: 3,
      players_per_segment: 5,
      mandatory_participation: true,
      mandatory_segments: [1, 2],
      free_segments: [3],
      automatic_validation: true,
    };
  }

  return {
    game_format: 'normal',
    segments_count: 2,
    players_per_segment: 5,
    mandatory_participation: false,
    mandatory_segments: [],
    free_segments: [1, 2],
    automatic_validation: true,
  };
}
const getCurrentSeason = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (month >= 8) {
    return `${year}/${year + 1}`;
  }

  return `${year - 1}/${year}`;
};

const CURRENT_SEASON = getCurrentSeason();

const DEFAULT_FORM_DATA = {
  name: '',
  season: CURRENT_SEASON,
  format: '5x5',
  convocation_type: 'manual',
  age_group: '',
  competition_type: 'campeonato_distrital',
  description: '',
  team_id: '',
  game_format: 'normal',
};

function getLabel(options, value, fallback = '') {
  return options.find((option) => option.value === value)?.label || fallback || value || '—';
}

function canCreateFromRole(user, canManageEvents) {
  const role = user?.role;

  if (['admin', 'gestor_desportivo'].includes(role)) return true;
  if (canManageEvents && ['treinador', 'treinador_adjunto', 'delegado'].includes(role)) return true;

  return false;
}

function getCompetitionStatus(championship) {
  if (championship?.is_archived) {
    return { label: 'Arquivada', className: 'border-slate-200 bg-slate-100 text-slate-600' };
  }

  return { label: 'Em curso', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
}

function getGameFormatMeta(championship) {
  const rules = championship?.competition_rules || {};
  const gameFormat = rules.game_format || 'normal';

  if (gameFormat === 'rtp') {
    return {
      label: 'Regulamento Técnico-Pedagógico',
      shortLabel: 'RTP',
      description: 'Participação obrigatória nas quatro semi-partes.',
      badgeClassName:
        'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }

  if (gameFormat === 'apl_cup') {
    return {
      label: 'Taça APL Lisboa',
      shortLabel: 'Taça APL',
      description:
        'Primeira parte com participação obrigatória e segunda parte livre.',
      badgeClassName:
        'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  if (gameFormat === 'custom') {
    return {
      label: 'Formato Personalizado',
      shortLabel: 'Personalizado',
      description: 'Regras configuradas especificamente para esta competição.',
      badgeClassName:
        'border-violet-200 bg-violet-50 text-violet-700',
    };
  }

  return {
    label: 'Jogo Normal',
    shortLabel: 'Normal',
    description: 'Gestão livre da utilização e substituição dos atletas.',
    badgeClassName:
      'border-cyan-200 bg-cyan-50 text-cyan-700',
  };
}

function CompetitionInfo({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function Championships() {
  const navigate = useNavigate();
  const { user, canManageEvents } = useAuth();
  const { selectedTeam, teams: contextTeams } = useTeam();

  const [teams, setTeams] = useState([]);
  const [championships, setChampionships] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('all');
  const [selectedSeason, setSelectedSeason] = useState(CURRENT_SEASON);
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

  const userCanTryCreate = canCreateFromRole(user, canManageEvents);
  const isSingleTeamSelected = selectedTeamId && selectedTeamId !== 'all';

  useEffect(() => {
    const availableTeams = contextTeams || [];
    setTeams(availableTeams);

    if (selectedTeam?.id) {
      setSelectedTeamId(selectedTeam.id);
    } else if (availableTeams.length === 1) {
      setSelectedTeamId(availableTeams[0].id);
    } else if (!selectedTeamId) {
      setSelectedTeamId('all');
    }
  }, [selectedTeam, contextTeams]);

  useEffect(() => {
    fetchChampionships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId, selectedSeason, selectedStatus]);

  useEffect(() => {
    if (isSingleTeamSelected) {
      setFormData((previous) => ({ ...previous, team_id: selectedTeamId }));
    }
  }, [isSingleTeamSelected, selectedTeamId]);

  const fetchChampionships = async () => {
    setLoading(true);

    try {
      const params = {
        season: selectedSeason,
        include_archived: selectedStatus !== 'active',
      };

      if (selectedTeamId && selectedTeamId !== 'all') {
        params.team_id = selectedTeamId;
      }

      const response = await championshipsApi.getAll(params);
      setChampionships(response.data || []);
    } catch (error) {
      console.error('Error fetching championships:', error);
      toast.error('Erro ao carregar competições');
      setChampionships([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredChampionships = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return championships.filter((championship) => {
      if (selectedStatus === 'active' && championship.is_archived) return false;
      if (selectedStatus === 'archived' && !championship.is_archived) return false;

      if (selectedType !== 'all' && championship.competition_type !== selectedType) return false;
      if (selectedAgeGroup !== 'all' && championship.age_group !== selectedAgeGroup) return false;

      if (normalizedSearch) {
        const haystack = [
          championship.name,
          championship.description,
          championship.team_name,
          championship.team_category,
          championship.season,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(normalizedSearch)) return false;
      }

      return true;
    });
  }, [championships, selectedStatus, selectedType, selectedAgeGroup, searchTerm]);

  const summary = useMemo(() => {
    const active = championships.filter((item) => !item.is_archived).length;
    const archived = championships.filter((item) => item.is_archived).length;
    const teamsRepresented = new Set(championships.map((item) => item.team_id).filter(Boolean)).size;

    return {
      total: championships.length,
      active,
      archived,
      teamsRepresented,
    };
  }, [championships]);

  const handleOpenCreate = () => {
    const initialTeamId = isSingleTeamSelected ? selectedTeamId : teams[0]?.id || '';

    setFormData({
      ...DEFAULT_FORM_DATA,
      season: selectedSeason || CURRENT_SEASON,
      team_id: initialTeamId,
    });
    setCreateDialogOpen(true);
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    const targetTeamId = isSingleTeamSelected ? selectedTeamId : formData.team_id;

    if (!targetTeamId) {
      toast.error('Seleciona uma equipa para criar a competição');
      return;
    }

    setCreating(true);

    try {
      await championshipsApi.create({
        name: formData.name,
        season: formData.season,
        format: formData.format,
        convocation_type: formData.convocation_type,
        age_group: formData.age_group || null,
        competition_type: formData.competition_type,
        competition_rules: buildCompetitionRules(formData.game_format),
        description: formData.description,
        team_id: targetTeamId,
      });

      toast.success('Competição criada com sucesso!');
      setCreateDialogOpen(false);
      fetchChampionships();
    } catch (error) {
      const message = error?.response?.data?.detail || 'Erro ao criar competição';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleArchive = async (championship) => {
    if (!championship?.id) return;

    const confirmed = window.confirm(
      `Pretendes arquivar a competição "${championship.name}"? Os dados históricos serão mantidos.`
    );

    if (!confirmed) return;

    try {
      await championshipsApi.delete(championship.id);
      toast.success('Competição arquivada');
      fetchChampionships();
    } catch (error) {
      const message = error?.response?.data?.detail || 'Erro ao arquivar competição';
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-32 rounded-[2rem]" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-56 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="championships-page">
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className="rounded-full text-slate-600 hover:text-slate-950"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-primary/90 p-5 text-white shadow-xl shadow-slate-200/70 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge className="mb-3 border-white/20 bg-white/10 text-white hover:bg-white/10">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Centro de Gestão Competitiva
            </Badge>
            <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Competições
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/75 sm:text-base">
              Gere campeonatos, jornadas, resultados, classificações e estatísticas com dados ligados ao calendário, dashboard e evolução dos atletas.
            </p>
          </div>

          {userCanTryCreate && (
            <Button
              onClick={handleOpenCreate}
              className="rounded-2xl bg-white text-slate-950 shadow-lg shadow-black/10 hover:bg-white/90"
              data-testid="create-championship-btn"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Competição
            </Button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-xs font-medium uppercase tracking-wide text-white/60">Total</p>
            <p className="mt-1 text-2xl font-bold">{summary.total}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-xs font-medium uppercase tracking-wide text-white/60">Em curso</p>
            <p className="mt-1 text-2xl font-bold">{summary.active}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-xs font-medium uppercase tracking-wide text-white/60">Equipas</p>
            <p className="mt-1 text-2xl font-bold">{summary.teamsRepresented}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-xs font-medium uppercase tracking-wide text-white/60">Arquivadas</p>
            <p className="mt-1 text-2xl font-bold">{summary.archived}</p>
          </div>
        </div>
      </section>

      <Card className="border-white/70 bg-white/85 shadow-sm shadow-slate-200/70 backdrop-blur-xl">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Filter className="h-4 w-4 text-primary" />
            Filtros
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Pesquisar competição..."
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger data-testid="team-filter">
                <SelectValue placeholder="Equipa" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {teams.length > 1 && <SelectItem value="all">Todas as equipas</SelectItem>}
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSeason} onValueChange={setSelectedSeason}>
              <SelectTrigger data-testid="season-filter">
                <SelectValue placeholder="Época" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {seasons.map((season) => (
                  <SelectItem key={season} value={season}>
                    {season}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="active">Em curso</SelectItem>
                <SelectItem value="archived">Arquivadas</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">Todos os tipos</SelectItem>
                {COMPETITION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <Select value={selectedAgeGroup} onValueChange={setSelectedAgeGroup}>
              <SelectTrigger>
                <SelectValue placeholder="Escalão" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">Todos os escalões</SelectItem>
                {AGE_GROUPS.map((ageGroup) => (
                  <SelectItem key={ageGroup.value} value={ageGroup.value}>
                    {ageGroup.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredChampionships.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredChampionships.map((championship) => {
            const status = getCompetitionStatus(championship);
            const permissions = championship.permissions || {};
            const canArchive = Boolean(permissions.can_archive);
            const teamName = championship.team_name || championship.team?.name || 'Equipa não identificada';
            const rules = championship.competition_rules || {};
            const formatMeta = getGameFormatMeta(championship);
          
            const segmentsCount =
              rules.segments_count ||
              (rules.game_format === 'rtp'
                ? 4
                : rules.game_format === 'apl_cup'
                  ? 3
                  : 2);
          
            const segmentsLabel =
              segmentsCount === 1
                ? '1 parte'
                : `${segmentsCount} partes`;
          
            const participationLabel = rules.mandatory_participation
              ? 'Participação obrigatória'
              : 'Gestão livre';
          
            const validationLabel =
              rules.automatic_validation === false
                ? 'Validação manual'
                : 'Validação automática';
          
            return (
              <CardWithStripe
                key={championship.id}
                className="group overflow-hidden border-white/70 bg-white/95 shadow-sm shadow-slate-200/70 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80"
                stripeClassName="from-primary via-cyan-400 to-sky-500"
                data-testid={`championship-card-${championship.id}`}
              >
                <CardStripeHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Badge
                          className={status.className}
                          variant="outline"
                        >
                          {status.label}
                        </Badge>
              
                        <Badge
                          variant="outline"
                          className="border-slate-200 bg-white text-slate-600"
                        >
                          {championship.season}
                        </Badge>
                      </div>
              
                      <CardStripeTitle className="line-clamp-2 text-xl leading-tight text-slate-950">
                        {championship.name}
                      </CardStripeTitle>
              
                      <p className="mt-2 flex min-w-0 items-center gap-1.5 text-sm font-medium text-slate-500">
                        <Users className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">{teamName}</span>
                      </p>
                    </div>
              
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-100 text-primary shadow-sm">
                      <Trophy className="h-6 w-6" />
                    </div>
                  </div>
                </CardStripeHeader>
              
                <CardStripeContent className="space-y-4 p-5 pt-2">
                  {championship.description && (
                    <p className="line-clamp-2 text-sm leading-6 text-slate-500">
                      {championship.description}
                    </p>
                  )}
              
                  {/* Modelo e regras da competição */}
                  <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Modelo de jogo
                        </p>
              
                        <p className="mt-1 font-heading text-lg font-semibold text-slate-950">
                          {formatMeta.label}
                        </p>
              
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {formatMeta.description}
                        </p>
                      </div>
              
                      <Badge
                        variant="outline"
                        className={formatMeta.badgeClassName}
                      >
                        {formatMeta.shortLabel}
                      </Badge>
                    </div>
              
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className="border-slate-200 bg-white text-slate-600"
                      >
                        {segmentsLabel}
                      </Badge>
              
                      <Badge
                        variant="outline"
                        className="border-slate-200 bg-white text-slate-600"
                      >
                        {rules.players_per_segment || 5} jogadores
                      </Badge>
              
                      <Badge
                        variant="outline"
                        className={
                          rules.mandatory_participation
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-600'
                        }
                      >
                        {participationLabel}
                      </Badge>
                    </div>
                  </div>
              
                  {/* Informação compacta */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <CompetitionInfo
                      icon={ListChecks}
                      label="Formato"
                      value={championship.format || '5x5'}
                    />
              
                    <CompetitionInfo
                      icon={Zap}
                      label="Convocatória"
                      value={
                        championship.convocation_type === 'automatica'
                          ? 'Automática'
                          : 'Manual'
                      }
                    />
              
                    <CompetitionInfo
                      icon={ShieldCheck}
                      label="Validação"
                      value={validationLabel}
                    />
              
                    <CompetitionInfo
                      icon={Settings}
                      label="Tipo"
                      value={getLabel(
                        COMPETITION_TYPES,
                        championship.competition_type,
                        'Competição'
                      )}
                    />
                  </div>
              
                  {/* Escalão e equipas */}
                  <div className="flex flex-wrap gap-2">
                    {championship.age_group && (
                      <Badge
                        variant="secondary"
                        className="bg-slate-100 text-slate-700"
                      >
                        {getLabel(AGE_GROUPS, championship.age_group)}
                      </Badge>
                    )}
              
                    {championship.participating_teams?.length > 0 && (
                      <Badge
                        variant="outline"
                        className="border-slate-200 text-slate-500"
                      >
                        <Users className="mr-1 h-3.5 w-3.5" />
                        {championship.participating_teams.length} equipas
                      </Badge>
                    )}
                  </div>
              
                  {/* Áreas disponíveis */}
                  <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                      <CalendarDays className="h-3.5 w-3.5 text-primary" />
                      Jornadas e jogos
                    </div>
              
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                      <BarChart3 className="h-3.5 w-3.5 text-primary" />
                      Estatísticas
                    </div>
                  </div>
              
                  {/* Ações */}
                  <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                    <Button
                      asChild
                      className="flex-1 rounded-2xl"
                      data-testid={`view-championship-${championship.id}`}
                    >
                      <Link to={`/championships/${championship.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Abrir Competição
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
              
                    {canArchive && !championship.is_archived && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Arquivar competição"
                        aria-label="Arquivar competição"
                        className="h-10 w-full rounded-2xl border-amber-200 text-amber-700 hover:bg-amber-50 sm:w-10"
                        onClick={() => handleArchive(championship)}
                      >
                        <Archive className="h-4 w-4" />
                        <span className="ml-2 sm:hidden">Arquivar</span>
                      </Button>
                    )}
                  </div>
                </CardStripeContent>
              </CardWithStripe>
            );
          })}
        </div>
      ) : (
        <Card className="border-white/70 bg-white/90 shadow-sm shadow-slate-200/70">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
              <Trophy className="h-8 w-8" />
            </div>
            <h3 className="font-heading text-xl text-slate-950">Sem competições</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Não existem competições para os filtros selecionados. Ajusta a equipa, época ou estado para consultar outros registos.
            </p>
            {userCanTryCreate && (
              <Button onClick={handleOpenCreate} className="mt-5 rounded-2xl">
                <Plus className="mr-2 h-4 w-4" />
                Criar Competição
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">Nova Competição</DialogTitle>
            <DialogDescription>
              Cria uma nova competição associada a uma equipa do clube.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              {!isSingleTeamSelected && (
                <div className="space-y-2">
                  <Label>Equipa</Label>
                  <Select
                    value={formData.team_id}
                    onValueChange={(value) => setFormData({ ...formData, team_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar equipa" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Nome da Competição</Label>
                <Input
                  placeholder="Ex: Campeonato Distrital Sub-15"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  required
                  data-testid="championship-name-input"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Época</Label>
                  <Select
                    value={formData.season}
                    onValueChange={(value) => setFormData({ ...formData, season: value })}
                  >
                    <SelectTrigger data-testid="championship-season-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {seasons.map((season) => (
                        <SelectItem key={season} value={season}>
                          {season}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Escalão</Label>
                  <Select
                    value={formData.age_group}
                    onValueChange={(value) => setFormData({ ...formData, age_group: value })}
                  >
                    <SelectTrigger data-testid="championship-age-group-select">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {AGE_GROUPS.map((ageGroup) => (
                        <SelectItem key={ageGroup.value} value={ageGroup.value}>
                          {ageGroup.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo de Competição</Label>
                  <Select
                    value={formData.competition_type}
                    onValueChange={(value) => setFormData({ ...formData, competition_type: value })}
                  >
                    <SelectTrigger data-testid="championship-competition-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {COMPETITION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select
                    value={formData.format}
                    onValueChange={(value) => setFormData({ ...formData, format: value })}
                  >
                    <SelectTrigger data-testid="championship-format-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {formats.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Convocatória</Label>
                <Select
                  value={formData.convocation_type}
                  onValueChange={(value) => setFormData({ ...formData, convocation_type: value })}
                >
                  <SelectTrigger data-testid="championship-convocation-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {convocationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  placeholder="Detalhes da competição..."
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  rows={3}
                  data-testid="championship-description-input"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating} data-testid="submit-championship-btn">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

