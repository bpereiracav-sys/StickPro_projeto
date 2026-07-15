import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { useLanguage } from '../context/LanguageContext';
import { championshipsApi, teamsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent } from '../components/ui/tabs';
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
  ArrowLeft, Trophy, Plus, Loader2, Calendar, MapPin,
  Edit, Check, Trash2, Users, Zap, FileSpreadsheet, Download, ExternalLink,
  BarChart3, Building, Upload, Palette
} from 'lucide-react';
import CompetitionHero from '../components/competition/CompetitionHero';
import CompetitionNavigation from '../components/competition/CompetitionNavigation';
import CompetitionOverview from '../components/competition/CompetitionOverview';
import CompetitionMatches from '../components/competition/CompetitionMatches';
import CompetitionTeams from '../components/competition/CompetitionTeams';
import { CompetitionStandings } from '../components/competition/CompetitionStandings';
import CompetitionStatistics from '../components/competition/CompetitionStatistics';
import CompetitionImports from '../components/competition/CompetitionImports';
import CompetitionSettings from '../components/competition/CompetitionSettings';


const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ChampionshipDetail() {
  const { championshipId } = useParams();
  const { token } = useAuth();
  const { canManageEvents, canManageStats, canManageLineups, canImportData, canAccessTeam, isAdmin } = usePermissions();
  const { t } = useLanguage();
  const [championship, setChampionship] = useState(null);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [editMatchDialogOpen, setEditMatchDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [importing, setImporting] = useState(false);
  const [gamesheetUrl, setGamesheetUrl] = useState('');
  const [aplImportDialogOpen, setAplImportDialogOpen] = useState(false);
  const [aplCalendarUrl, setAplCalendarUrl] = useState('');
  const [importingApl, setImportingApl] = useState(false);
  const [matchImportDialogOpen, setMatchImportDialogOpen] = useState(false);
  const [importingMatches, setImportingMatches] = useState(false);
  const [matchImportResults, setMatchImportResults] = useState(null);
  const [fixingHomeAway, setFixingHomeAway] = useState(false);
  
  // Competition Teams state
  const [competitionTeams, setCompetitionTeams] = useState([]);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editTeamDialogOpen, setEditTeamDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamImportDialogOpen, setTeamImportDialogOpen] = useState(false);
  const [importingTeams, setImportingTeams] = useState(false);
  const [teamForm, setTeamForm] = useState({
    name: '',
    pavilion_name: '',
    pavilion_address: '',
    field_player_kit: {
      primary_shirt: '',
      secondary_shirt: '',
      primary_shorts: '',
      secondary_shorts: '',
      primary_socks: '',
      secondary_socks: ''
    },
    goalkeeper_kit: {
      primary_shirt: '',
      secondary_shirt: '',
      primary_shorts: '',
      secondary_shorts: '',
      primary_socks: '',
      secondary_socks: ''
    }
  });
  
  // Matches grouped by round - sorted by date and time
  const matchesByRound = useMemo(() => {
    const grouped = {};
    matches.forEach(match => {
      const round = match.matchday || t('championships.noRound');
      if (!grouped[round]) grouped[round] = [];
      grouped[round].push(match);
    });
    // Sort matches within each round by date AND time
    Object.keys(grouped).forEach(round => {
      grouped[round].sort((a, b) => {
        const dateA = new Date(a.match_date);
        const dateB = new Date(b.match_date);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA - dateB;
        }
        // If same date, sort by match_time if available
        const timeA = a.match_time || '00:00';
        const timeB = b.match_time || '00:00';
        return timeA.localeCompare(timeB);
      });
    });
    return grouped;
  }, [matches, t]);
  
  // Get sorted round keys
  const sortedRounds = useMemo(() => {
    return Object.keys(matchesByRound).sort((a, b) => {
      const noRoundLabel = t('championships.noRound');
      if (a === noRoundLabel) return 1;
      if (b === noRoundLabel) return -1;
      return parseInt(a) - parseInt(b);
    });
  }, [matchesByRound, t]);
  

  const completedMatches = useMemo(
    () => matches.filter((match) => match.is_completed).length,
    [matches]
  );

  const pendingMatches = useMemo(
    () => matches.filter((match) => !match.is_completed).length,
    [matches]
  );

  const nextMatch = useMemo(() => {
    const now = new Date();
    return [...matches]
      .filter((match) => !match.is_completed && new Date(match.match_date) >= now)
      .sort((a, b) => new Date(a.match_date) - new Date(b.match_date))[0] || null;
  }, [matches]);

  const lastCompletedMatch = useMemo(() => {
    return [...matches]
      .filter((match) => match.is_completed)
      .sort((a, b) => new Date(b.match_date) - new Date(a.match_date))[0] || null;
  }, [matches]);

  const championshipPermissions = championship?.permissions || {};
  const fallbackCanManageCompetition =
    canManageEvents && (isAdmin || canAccessTeam(championship?.team_id));
  
  const canEditCompetition =
    championshipPermissions.can_edit ?? fallbackCanManageCompetition;
  
  const canCreateGames =
    championshipPermissions.can_create_games ?? fallbackCanManageCompetition;
  
  const canEditGames =
    championshipPermissions.can_edit_games ?? fallbackCanManageCompetition;
  
  const canEditResults =
    championshipPermissions.can_edit_results ?? canManageStats;
  
  const canImportGamesheet =
    championshipPermissions.can_import_gamesheet ?? canImportData;
  
  const canEditStatistics =
    championshipPermissions.can_edit_statistics ?? canManageStats;
  
  const canEditStandings =
    championshipPermissions.can_edit_standings ?? isAdmin;

  const [matchForm, setMatchForm] = useState({
    home_team_id: '',
    home_team: '',
    opponent_team_id: '',
    opponent_team: '',
    match_date: '',
    match_time: '',
    location: 'casa',
    venue: '',
    is_club_match: true,
    bonus_points: 0,
    penalty_points: 0,
    matchday: 1
  });
  
  const [resultForm, setResultForm] = useState({
    home_score: 0,
    away_score: 0,
    bonus_points: 0,
    penalty_points: 0
  });

  useEffect(() => {
    fetchData();
  }, [championshipId]);

  const fetchData = async () => {
    try {
      const [champRes, matchesRes, standingsRes] = await Promise.all([
        championshipsApi.getOne(championshipId),
        championshipsApi.getMatches(championshipId),
        championshipsApi.getStandings(championshipId)
      ]);
      
      setChampionship(champRes.data);
      setMatches(matchesRes.data);
      setStandings(standingsRes.data);
      
      // Get team info
      const teamRes = await teamsApi.getOne(champRes.data.team_id);
      setTeam(teamRes.data);
      
      // Fetch competition teams
      try {
        const teamsRes = await championshipsApi.getCompetitionTeams(championshipId);
        setCompetitionTeams(teamsRes.data || []);
      } catch (e) {
        console.log('No competition teams yet');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleFixHomeAway = async () => {
    const confirmed = window.confirm(
      'Pretende corrigir automaticamente a identificação das equipas da casa e visitantes nos jogos já existentes desta competição?'
    );
  
    if (!confirmed) return;
  
    setFixingHomeAway(true);
  
    try {
      const response = await championshipsApi.fixMatchesHomeAway(
        championshipId
      );
  
      const result = response.data;
  
      toast.success(
        `Migração concluída: ${result.fixed || 0} jogo(s) corrigido(s) e ${
          result.unchanged || 0
        } sem alterações.`
      );
  
      await fetchData();
    } catch (error) {
      console.error('Erro ao corrigir casa/fora:', error);
  
      toast.error(
        error.response?.data?.detail ||
          'Não foi possível corrigir os jogos existentes.'
      );
    } finally {
      setFixingHomeAway(false);
    }
  };
  
  const handleCreateMatch = async (e) => {
    e.preventDefault();
  
    const isClubMatch = Boolean(
      matchForm.is_club_match
    );
  
    const externalHomeTeam = (
      matchForm.home_team || ''
    ).trim();
  
    const externalAwayTeam = (
      matchForm.opponent_team || ''
    ).trim();
  
    if (!matchForm.match_date) {
      toast.error('Indique a data e a hora do jogo');
      return;
    }
  
    if (!isClubMatch) {
      if (!externalHomeTeam || !externalAwayTeam) {
        toast.error(
          'Indique a equipa da casa e a equipa visitante'
        );
        return;
      }
  
      if (
        externalHomeTeam.toLowerCase() ===
        externalAwayTeam.toLowerCase()
      ) {
        toast.error(
          t('championships.sameTeamError')
        );
        return;
      }
    }
  
    setCreating(true);
  
    try {
      let clubSide = 'neutral';
      let homeTeam = '';
      let awayTeam = '';
      let opponentTeam = '';
      let location = matchForm.location;
  
      if (isClubMatch) {
        const clubTeamName = (
          team?.name || ''
        ).trim();
  
        opponentTeam = externalAwayTeam;
  
        if (!clubTeamName) {
          toast.error(
            'Não foi possível identificar a equipa do clube'
          );
          return;
        }
  
        if (!opponentTeam) {
          toast.error(
            'Indique a equipa adversária'
          );
          return;
        }
  
        if (
          opponentTeam.toLowerCase() ===
          clubTeamName.toLowerCase()
        ) {
          toast.error(
            'A equipa adversária não pode ser igual à equipa do clube'
          );
          return;
        }
  
        if (matchForm.location === 'fora') {
          clubSide = 'away';
          homeTeam = opponentTeam;
          awayTeam = clubTeamName;
          location = 'fora';
        } else if (
          matchForm.location === 'neutro'
        ) {
          clubSide = 'neutral';
          homeTeam = clubTeamName;
          awayTeam = opponentTeam;
          location = 'neutro';
        } else {
          clubSide = 'home';
          homeTeam = clubTeamName;
          awayTeam = opponentTeam;
          location = 'casa';
        }
      } else {
        clubSide = 'neutral';
        location = 'neutro';
        homeTeam = externalHomeTeam;
        awayTeam = externalAwayTeam;
  
        // Compatibilidade com o modelo atual do backend.
        opponentTeam = externalAwayTeam;
      }
  
      const matchData = {
        championship_id: championshipId,
  
        match_date: new Date(
          matchForm.match_date
        ).toISOString(),
  
        location,
        venue: (
          matchForm.venue || ''
        ).trim() || null,
  
        is_club_match: isClubMatch,
        club_side: clubSide,
  
        home_team: homeTeam,
        away_team: awayTeam,
        opponent_team: opponentTeam,
  
        official_match_url: (
          matchForm.official_match_url || ''
        ).trim() || null,
  
        bonus_points: Number(
          matchForm.bonus_points || 0
        ),
  
        penalty_points: Number(
          matchForm.penalty_points || 0
        ),
  
        matchday: Number(
          matchForm.matchday || 1
        ),
      };
  
      if (matchForm.match_time) {
        matchData.match_time =
          matchForm.match_time;
      }
  
      await championshipsApi.createMatch(
        championshipId,
        matchData
      );
  
      toast.success(
        t('championships.matchCreated')
      );
  
      setMatchDialogOpen(false);
  
      setMatchForm({
        home_team_id: '',
        home_team: '',
        away_team: '',
        opponent_team_id: '',
        opponent_team: '',
        match_date: '',
        match_time: '',
        location: 'casa',
        venue: '',
        official_match_url: '',
        is_club_match: true,
        club_side: 'home',
        bonus_points: 0,
        penalty_points: 0,
        matchday: 1,
      });
  
      await fetchData();
    } catch (error) {
      console.error(
        'Erro completo ao criar jogo:',
        error?.response?.data || error
      );
  
      const detail =
        error?.response?.data?.detail;
  
      let message =
        'Erro ao adicionar jogo';
  
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail
          .map((item) => {
            const locationPath =
              Array.isArray(item?.loc)
                ? item.loc.join(' → ')
                : '';
  
            const errorMessage =
              typeof item?.msg === 'string'
                ? item.msg
                : 'Valor inválido';
  
            return locationPath
              ? `${locationPath}: ${errorMessage}`
              : errorMessage;
          })
          .join(' | ');
      } else if (
        detail &&
        typeof detail === 'object'
      ) {
        message = String(
          detail.message ||
          detail.msg ||
          'Os dados enviados não são válidos'
        );
      }
  
      toast.error(String(message));
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateResult = async (e) => {
    e.preventDefault();
    if (!selectedMatch) return;
    setCreating(true);

    try {
      // Validate scores
      const homeScore = parseInt(resultForm.home_score, 10);
      const awayScore = parseInt(resultForm.away_score, 10);
      
      if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
        toast.error('Os resultados devem ser números positivos');
        return;
      }
      
      await championshipsApi.updateMatchResult(selectedMatch.id, {
        ...resultForm,
        home_score: homeScore,
        away_score: awayScore
      });
      toast.success(t('championships.resultUpdated'));
      setResultDialogOpen(false);
      setSelectedMatch(null);
      fetchData(); // Auto-refresh
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setCreating(false);
    }
  };

  const openResultDialog = (match) => {
    setSelectedMatch(match);
    setResultForm({
      home_score: match.home_score || 0,
      away_score: match.away_score || 0,
      bonus_points: match.bonus_points || 0,
      penalty_points: match.penalty_points || 0
    });
    setResultDialogOpen(true);
  };

  const openEditMatchDialog = (match) => {
    setSelectedMatch(match);
  
    const matchDate = new Date(match.match_date);
    const localDatetime = matchDate.toISOString().slice(0, 16);
  
    setMatchForm({
      home_team_id: '',
      home_team: match.home_team || '',
      opponent_team_id: '',
      opponent_team:
        match.is_club_match === false
          ? match.away_team || ''
          : match.opponent_team || '',
      away_team: match.away_team || '',
      match_date: localDatetime,
      match_time: match.match_time || '',
      location: match.location || 'casa',
      venue: match.venue || '',
      is_club_match: match.is_club_match !== false,
      club_side:
        match.club_side ||
        (
          match.location === 'fora'
            ? 'away'
            : match.location === 'neutro'
              ? 'neutral'
              : 'home'
        ),
      official_match_url:
        match.official_match_url ||
        match.gamesheet_url ||
        '',
      bonus_points: match.bonus_points || 0,
      penalty_points: match.penalty_points || 0,
      matchday: match.matchday || 1,
    });
  
    setEditMatchDialogOpen(true);
  };

  const handleSwapExternalTeams = () => {
    setMatchForm((current) => ({
      ...current,
      home_team:
        current.away_team ||
        current.opponent_team ||
        '',
      away_team: current.home_team || '',
      opponent_team: current.home_team || '',
    }));
  };
  
  const handleUpdateMatch = async (e) => {
    e.preventDefault();
  
    if (!selectedMatch) return;
  
    const isExternalMatch =
      selectedMatch.is_club_match === false ||
      matchForm.is_club_match === false;
  
    setCreating(true);
  
    try {
      let updateData;
  
      if (isExternalMatch) {
        const homeTeam = (
          matchForm.home_team || ''
        ).trim();
  
        const awayTeam = (
          matchForm.away_team ||
          matchForm.opponent_team ||
          ''
        ).trim();
  
        if (!homeTeam || !awayTeam) {
          toast.error(
            'Indique a equipa da casa e a equipa visitante'
          );
          return;
        }
  
        if (
          homeTeam.toLowerCase() ===
          awayTeam.toLowerCase()
        ) {
          toast.error(
            'As equipas não podem ser iguais'
          );
          return;
        }
  
        updateData = {
          home_team: homeTeam,
          away_team: awayTeam,
  
          // Compatibilidade com o modelo atual do backend.
          opponent_team: awayTeam,
  
          is_club_match: false,
          club_side: 'neutral',
          location: 'neutro',
  
          match_date: new Date(
            matchForm.match_date
          ).toISOString(),
  
          venue: matchForm.venue || null,
          official_match_url:
            matchForm.official_match_url?.trim() ||
            null,
  
          bonus_points: Number(
            matchForm.bonus_points || 0
          ),
  
          penalty_points: Number(
            matchForm.penalty_points || 0
          ),
  
          matchday: Number(
            matchForm.matchday || 1
          ),
        };
      } else {
        updateData = {
          opponent_team: (
            matchForm.opponent_team || ''
          ).trim(),
  
          location: matchForm.location,
          club_side:
            matchForm.location === 'fora'
              ? 'away'
              : matchForm.location === 'neutro'
                ? 'neutral'
                : 'home',
  
          match_date: new Date(
            matchForm.match_date
          ).toISOString(),
  
          venue: matchForm.venue || null,
          official_match_url:
            matchForm.official_match_url?.trim() ||
            null,
  
          bonus_points: Number(
            matchForm.bonus_points || 0
          ),
  
          penalty_points: Number(
            matchForm.penalty_points || 0
          ),
  
          matchday: Number(
            matchForm.matchday || 1
          ),
        };
      }
  
      await championshipsApi.updateMatch(
        selectedMatch.id,
        updateData
      );
  
      toast.success(
        'Jogo e ficha oficial atualizados!'
      );
  
      setEditMatchDialogOpen(false);
      setSelectedMatch(null);
  
      await fetchData();
    } catch (error) {
      const detail = error?.response?.data?.detail;
  
      toast.error(
        typeof detail === 'string'
          ? detail
          : 'Erro ao atualizar jogo'
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteMatch = async (matchId) => {
    if (!confirm("Pretende arquivar este jogo? Poderá restaurá-lo posteriormente.")) return;
    setDeleting(matchId);

    try {
      await championshipsApi.archiveMatch(matchId);
      toast.success("Jogo arquivado!");
      fetchData();
    } catch (error) {
      toast.error('Erro ao eliminar jogo');
    } finally {
      setDeleting(null);
    }
  };

  const openImportDialog = (match) => {
    setSelectedMatch(match);
    setGamesheetUrl(match.gamesheet_url || '');
    setImportDialogOpen(true);
  };

  const handleImportGamesheet = async () => {
    if (!gamesheetUrl || !selectedMatch) {
      toast.error('Insira o link da ficha de jogo');
      return;
    }
    setImporting(true);

    try {
      const response = await fetch(`${API_URL}/api/championships/matches/import-gamesheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          url: gamesheetUrl,
          match_id: selectedMatch.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao importar');
      }

      const data = await response.json();
      toast.success(`Importado! Resultado: ${data.result} | ${data.stats_updated} jogadores atualizados`);
      setImportDialogOpen(false);
      setSelectedMatch(null);
      setGamesheetUrl('');
      fetchData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setImporting(false);
    }
  };

  const handleImportAplCalendar = async () => {
    if (!aplCalendarUrl) {
      toast.error('Insira o URL do calendário APL');
      return;
    }
    setImportingApl(true);

    try {
      const response = await fetch(`${API_URL}/api/championships/import-apl-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          url: aplCalendarUrl,
          championship_id: championshipId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao importar calendário');
      }

      const data = await response.json();
      toast.success(`${data.message}: ${data.matches_imported} jogos importados`);
      setAplImportDialogOpen(false);
      setAplCalendarUrl('');
      fetchData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setImportingApl(false);
    }
  };

  // Import matches from Excel/CSV
  const handleImportMatches = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportingMatches(true);
    setMatchImportResults(null);
    
    try {
      const response = await championshipsApi.importMatches(championshipId, file);
      setMatchImportResults(response.data);
      
      if (response.data.success > 0) {
        toast.success(`${response.data.success} ${t('championships.importSuccess')}`);
        fetchData(); // Auto-refresh
      }
      
      if (response.data.errors?.length > 0) {
        toast.error(`${response.data.errors.length} erros`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setImportingMatches(false);
    }
  };

  // Competition Team functions
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setCreating(true);
    
    try {
      await championshipsApi.createCompetitionTeam(championshipId, teamForm);
      toast.success(t('championships.teamCreated'));
      setTeamDialogOpen(false);
      resetTeamForm();
      fetchData(); // Auto-refresh
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    if (!selectedTeam) return;
    setCreating(true);
    
    try {
      await championshipsApi.updateCompetitionTeam(selectedTeam.id, teamForm);
      toast.success(t('championships.teamUpdated'));
      setEditTeamDialogOpen(false);
      setSelectedTeam(null);
      resetTeamForm();
      fetchData(); // Auto-refresh
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!confirm('Tem a certeza que quer eliminar esta equipa?')) return;
    setDeleting(teamId);
    
    try {
      await championshipsApi.deleteCompetitionTeam(teamId);
      toast.success('Equipa eliminada!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao eliminar equipa');
    } finally {
      setDeleting(null);
    }
  };

  const handleImportTeams = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportingTeams(true);
    try {
      const result = await championshipsApi.importCompetitionTeams(championshipId, file);
      toast.success(result.data.message);
      if (result.data.errors?.length > 0) {
        result.data.errors.forEach(err => toast.warning(err));
      }
      setTeamImportDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao importar equipas');
    } finally {
      setImportingTeams(false);
      e.target.value = '';
    }
  };

  const openEditTeamDialog = (teamData) => {
    setSelectedTeam(teamData);
    setTeamForm({
      name: teamData.name || '',
      pavilion_name: teamData.pavilion_name || '',
      pavilion_address: teamData.pavilion_address || '',
      field_player_kit: teamData.field_player_kit || {
        primary_shirt: '',
        secondary_shirt: '',
        primary_shorts: '',
        secondary_shorts: '',
        primary_socks: '',
        secondary_socks: ''
      },
      goalkeeper_kit: teamData.goalkeeper_kit || {
        primary_shirt: '',
        secondary_shirt: '',
        primary_shorts: '',
        secondary_shorts: '',
        primary_socks: '',
        secondary_socks: ''
      }
    });
    setEditTeamDialogOpen(true);
  };

  const resetTeamForm = () => {
    setTeamForm({
      name: '',
      pavilion_name: '',
      pavilion_address: '',
      field_player_kit: {
        primary_shirt: '',
        secondary_shirt: '',
        primary_shorts: '',
        secondary_shorts: '',
        primary_socks: '',
        secondary_socks: ''
      },
      goalkeeper_kit: {
        primary_shirt: '',
        secondary_shirt: '',
        primary_shorts: '',
        secondary_shorts: '',
        primary_socks: '',
        secondary_socks: ''
      }
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!championship) {
    return (
      <div className="text-center py-16">
        <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Campeonato não encontrado</p>
        <Button asChild className="mt-4">
          <Link to="/championships">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="championship-detail-page">
      {/* Back Button */}
      <Button asChild variant="ghost" className="w-fit -ml-2 text-muted-foreground hover:text-foreground">
        <Link to="/championships" className="inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar às Competições
        </Link>
      </Button>

      <CompetitionHero
        championship={championship}
        team={team}
        matches={matches}
        standings={standings}
        nextMatch={nextMatch}
        canCreateGames={canCreateGames}
        onAddMatch={() => setMatchDialogOpen(true)}
        onImportMatches={() => setMatchImportDialogOpen(true)}
        addMatchLabel={t('championships.addGame') || 'Adicionar Jogo'}
        importMatchesLabel={t('championships.importMatches') || 'Importar Jogos'}
      />

      {/* Tabs */}
      <Tabs defaultValue="summary" className="space-y-6">
        <CompetitionNavigation />
      
        <CompetitionOverview
          nextMatch={nextMatch}
          lastCompletedMatch={lastCompletedMatch}
          team={team}
          pendingMatches={pendingMatches}
          matches={matches}
          competitionTeams={competitionTeams}
          standings={standings}
          canEditGames={canEditGames}
          canEditResults={canEditResults}
          canImportGamesheet={canImportGamesheet}
          canCreateGames={canCreateGames}
          onAddMatch={() => setMatchDialogOpen(true)}
          onImportMatches={() => setMatchImportDialogOpen(true)}
          onImportCalendar={() => setAplImportDialogOpen(true)}
        />

        <CompetitionMatches
          championshipId={championshipId}
          championship={championship}
          team={team}
          matches={matches}
          matchesByRound={matchesByRound}
          sortedRounds={sortedRounds}
          canCreateGames={canCreateGames}
          canEditGames={canEditGames}
          canEditResults={canEditResults}
          canImportGamesheet={canImportGamesheet}
          deleting={deleting}
          onAddMatch={() => setMatchDialogOpen(true)}
          onEditMatch={openEditMatchDialog}
          onEditResult={openResultDialog}
          onImportGamesheet={openImportDialog}
          onDeleteMatch={handleDeleteMatch}
        />

        <CompetitionTeams
          teams={competitionTeams}
          canManageTeams={canCreateGames}
          canImportTeams={canImportGamesheet}
          deletingId={deleting}
          onAddTeam={() => {
            resetTeamForm();
            setTeamDialogOpen(true);
          }}
          onEditTeam={openEditTeamDialog}
          onDeleteTeam={handleDeleteTeam}
          onImportTeams={() => setTeamImportDialogOpen(true)}
        />

        {/* Standings Tab */}
        <TabsContent value="standings" className="space-y-4">
          <CompetitionStandings
            standings={standings}
            clubTeamName={team?.name || championship?.team_name || ''}
          />
        </TabsContent>


        {/* Statistics Tab */}
        <CompetitionStatistics
          matches={matches}
          teamName={team?.name || championship?.team_name || ''}
          competitionTeamsCount={competitionTeams.length}
          importedGamesheets={
            matches.filter((match) => match.gamesheet_url).length
          }
        />

        <CompetitionImports
          canCreateGames={canCreateGames}
          canImportGamesheet={canImportGamesheet}
          onImportMatches={() => setMatchImportDialogOpen(true)}
          onImportTeams={() => setTeamImportDialogOpen(true)}
          onImportCalendar={() => setAplImportDialogOpen(true)}
          matchesCount={matches.length}
          teamsCount={competitionTeams.length}
          importedGamesheets={
            matches.filter((match) => match.gamesheet_url).length
          }
        />

        <CompetitionSettings
          championship={championship}
          team={team}
          canEditCompetition={canEditCompetition}
          isAdmin={isAdmin}
          fixingHomeAway={fixingHomeAway}
          onFixHomeAway={handleFixHomeAway}
        />
      </Tabs>

      {/* Import APL/FPP Calendar Dialog */}
      <Dialog open={aplImportDialogOpen} onOpenChange={setAplImportDialogOpen}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Importar calendário APL/FPP
            </DialogTitle>
            <DialogDescription>
              Cole o URL da página de calendário ou ficha oficial para criar jogos na competição.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>URL APL/FPP</Label>
              <Input
                placeholder="https://aplisboa.assyssoftware.es/..."
                value={aplCalendarUrl}
                onChange={(e) => setAplCalendarUrl(e.target.value)}
              />
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              A importação deve ser sempre validada antes de ser usada para estatísticas oficiais.
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAplImportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImportAplCalendar} disabled={importingApl || !aplCalendarUrl}>
              {importingApl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Match Dialog */}
      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">Adicionar Jogo</DialogTitle>
            <DialogDescription>
              Agendar um novo jogo na competição
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateMatch}>
            <div className="space-y-4 py-4">
              {/* Tipo de Jogo */}
              <div className="space-y-2">
                <Label>Tipo de Jogo</Label>
                <Select
                  value={matchForm.is_club_match ? 'clube' : 'outros'}
                  onValueChange={(v) => setMatchForm({ ...matchForm, is_club_match: v === 'clube' })}
                >
                  <SelectTrigger data-testid="match-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="clube">Jogo da nossa equipa</SelectItem>
                    <SelectItem value="outros">Jogo entre outras equipas (classificação)</SelectItem>
                  </SelectContent>
                </Select>
                {!matchForm.is_club_match && (
                  <p className="text-xs text-muted-foreground">
                    Útil para registar jogos de outras equipas para manter a classificação correta.
                  </p>
                )}
              </div>

              {/* Jornada */}
              <div className="space-y-2">
                <Label>Jornada</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Número da jornada"
                  value={matchForm.matchday}
                  onChange={(e) => setMatchForm({ ...matchForm, matchday: parseInt(e.target.value) || 1 })}
                  required
                  data-testid="match-matchday-input"
                />
              </div>

              {/* Equipa da Casa (só se for jogo entre outras equipas) */}
              {!matchForm.is_club_match && (
                <div className="space-y-2">
                  <Label>Equipa da Casa</Label>
                  <Input
                    placeholder="Nome da equipa"
                    value={matchForm.home_team}
                    onChange={(e) => setMatchForm({ ...matchForm, home_team: e.target.value })}
                    required
                    data-testid="match-home-team-input"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>{matchForm.is_club_match ? 'Equipa Adversária' : 'Equipa Visitante'}</Label>
                <Input
                  placeholder="Nome da equipa"
                  value={matchForm.opponent_team}
                  onChange={(e) => setMatchForm({ ...matchForm, opponent_team: e.target.value })}
                  required
                  data-testid="match-opponent-input"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data e Hora</Label>
                  <Input
                    type="datetime-local"
                    value={matchForm.match_date}
                    onChange={(e) => setMatchForm({ ...matchForm, match_date: e.target.value })}
                    required
                    data-testid="match-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Local</Label>
                  <Select
                    value={
                      matchForm.is_club_match
                        ? matchForm.location
                        : 'neutro'
                    }
                    disabled={!matchForm.is_club_match}
                    onValueChange={(value) =>
                      setMatchForm((current) => ({
                        ...current,
                        location: value,
                      }))
                    }
                  >
                    <SelectTrigger data-testid="match-location-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="casa">Casa</SelectItem>
                      <SelectItem value="fora">Fora</SelectItem>
                      <SelectItem value="neutro">Campo Neutro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Pavilhão/Recinto (opcional)</Label>
                <Input
                  placeholder="Ex: Pavilhão Municipal"
                  value={matchForm.venue}
                  onChange={(e) => setMatchForm({ ...matchForm, venue: e.target.value })}
                  data-testid="match-venue-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-official-match-url">
                  Link da ficha eletrónica oficial
                </Label>
              
                <Input
                  id="create-official-match-url"
                  type="url"
                  placeholder="https://..."
                  value={
                    matchForm.official_match_url || ''
                  }
                  onChange={(event) =>
                    setMatchForm((current) => ({
                      ...current,
                      official_match_url:
                        event.target.value,
                    }))
                  }
                  data-testid="match-official-url-input"
                />
              
                <p className="text-xs leading-5 text-muted-foreground">
                  Pode ser preenchido agora ou mais tarde.
                  Será utilizado para importar o resultado oficial.
                </p>
              </div>
              
              {/* Penalizações/Bonificações */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bonificação (pontos)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={matchForm.bonus_points}
                    onChange={(e) => setMatchForm({ ...matchForm, bonus_points: parseInt(e.target.value) || 0 })}
                    data-testid="match-bonus-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Penalização (pontos)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={matchForm.penalty_points}
                    onChange={(e) => setMatchForm({ ...matchForm, penalty_points: parseInt(e.target.value) || 0 })}
                    data-testid="match-penalty-input"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMatchDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating} data-testid="submit-match-btn">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Result Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">Resultado do Jogo</DialogTitle>
            <DialogDescription>
              {selectedMatch &&
                `${selectedMatch.home_team || 'Casa'} vs ${
                  selectedMatch.away_team || 'Visitante'
                }`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateResult}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    {selectedMatch?.home_team || 'Equipa da Casa'}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={resultForm.home_score}
                    onChange={(e) => setResultForm({ ...resultForm, home_score: parseInt(e.target.value) || 0 })}
                    data-testid="home-score-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {selectedMatch?.away_team || 'Equipa Visitante'}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={resultForm.away_score}
                    onChange={(e) => setResultForm({ ...resultForm, away_score: parseInt(e.target.value) || 0 })}
                    data-testid="away-score-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pontos Bónus</Label>
                  <Input
                    type="number"
                    min="0"
                    value={resultForm.bonus_points}
                    onChange={(e) => setResultForm({ ...resultForm, bonus_points: parseInt(e.target.value) || 0 })}
                    data-testid="bonus-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pontos Penalização</Label>
                  <Input
                    type="number"
                    min="0"
                    value={resultForm.penalty_points}
                    onChange={(e) => setResultForm({ ...resultForm, penalty_points: parseInt(e.target.value) || 0 })}
                    data-testid="penalty-input"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResultDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating} data-testid="submit-result-btn">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Match Dialog */}
      <Dialog
        open={editMatchDialogOpen}
        onOpenChange={(open) => {
          setEditMatchDialogOpen(open);
      
          if (!open) {
            setSelectedMatch(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">
              Editar Jogo
            </DialogTitle>
      
            <DialogDescription>
              Atualizar equipas, data, recinto e ficha oficial
            </DialogDescription>
          </DialogHeader>
      
          <form onSubmit={handleUpdateMatch}>
            <div className="space-y-5 py-4">
              {selectedMatch?.is_club_match === false ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-3">
                    <p className="text-sm font-medium text-cyan-900">
                      Jogo entre equipas externas
                    </p>
      
                    <p className="mt-1 text-xs leading-5 text-cyan-700">
                      Pode corrigir a ordem Casa/Visitante sem associar
                      nenhuma das equipas ao clube.
                    </p>
                  </div>
      
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-home-team">
                        Equipa da Casa
                      </Label>
      
                      <Input
                        id="edit-home-team"
                        value={
                          matchForm.home_team || ''
                        }
                        onChange={(event) =>
                          setMatchForm((current) => ({
                            ...current,
                            home_team:
                              event.target.value,
                          }))
                        }
                        placeholder="Equipa da casa"
                        required
                        data-testid="edit-match-home-team-input"
                      />
                    </div>
      
                    <div className="space-y-2">
                      <Label htmlFor="edit-away-team">
                        Equipa Visitante
                      </Label>
      
                      <Input
                        id="edit-away-team"
                        value={
                          matchForm.away_team ||
                          matchForm.opponent_team ||
                          ''
                        }
                        onChange={(event) =>
                          setMatchForm((current) => ({
                            ...current,
                            away_team:
                              event.target.value,
                            opponent_team:
                              event.target.value,
                          }))
                        }
                        placeholder="Equipa visitante"
                        required
                        data-testid="edit-match-away-team-input"
                      />
                    </div>
                  </div>
      
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleSwapExternalTeams}
                    data-testid="swap-external-teams-btn"
                  >
                    ⇄ Trocar equipa da casa e visitante
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="edit-opponent-team">
                    Equipa adversária
                  </Label>
      
                  <Input
                    id="edit-opponent-team"
                    value={
                      matchForm.opponent_team || ''
                    }
                    onChange={(event) =>
                      setMatchForm((current) => ({
                        ...current,
                        opponent_team:
                          event.target.value,
                      }))
                    }
                    placeholder="Equipa adversária"
                    required
                    data-testid="edit-match-opponent-input"
                  />
                </div>
              )}
      
              <div className="space-y-2">
                <Label htmlFor="edit-match-date">
                  Data e Hora
                </Label>
      
                <Input
                  id="edit-match-date"
                  type="datetime-local"
                  value={
                    matchForm.match_date || ''
                  }
                  onChange={(event) =>
                    setMatchForm((current) => ({
                      ...current,
                      match_date:
                        event.target.value,
                    }))
                  }
                  required
                  data-testid="edit-match-date-input"
                />
              </div>
      
              {selectedMatch?.is_club_match !== false && (
                <div className="space-y-2">
                  <Label>Local</Label>
      
                  <Select
                    value={
                      matchForm.location || 'casa'
                    }
                    onValueChange={(value) =>
                      setMatchForm((current) => ({
                        ...current,
                        location: value,
                        club_side:
                          value === 'fora'
                            ? 'away'
                            : value === 'neutro'
                              ? 'neutral'
                              : 'home',
                      }))
                    }
                  >
                    <SelectTrigger data-testid="edit-match-location-select">
                      <SelectValue />
                    </SelectTrigger>
      
                    <SelectContent className="bg-white">
                      <SelectItem value="casa">
                        Casa
                      </SelectItem>
      
                      <SelectItem value="fora">
                        Fora
                      </SelectItem>
      
                      <SelectItem value="neutro">
                        Campo Neutro
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
      
              {selectedMatch?.is_club_match === false && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm text-slate-600">
                    Este jogo permanece identificado como
                    <strong className="ml-1 text-slate-900">
                      campo neutro
                    </strong>
                    , por não envolver a equipa do clube.
                  </p>
                </div>
              )}
      
              <div className="space-y-2">
                <Label htmlFor="edit-match-venue">
                  Pavilhão/Recinto
                </Label>
      
                <Input
                  id="edit-match-venue"
                  placeholder="Ex.: Pavilhão Municipal"
                  value={
                    matchForm.venue || ''
                  }
                  onChange={(event) =>
                    setMatchForm((current) => ({
                      ...current,
                      venue: event.target.value,
                    }))
                  }
                  data-testid="edit-match-venue-input"
                />
              </div>
      
              <div className="space-y-2">
                <Label htmlFor="edit-official-match-url">
                  Link da ficha eletrónica oficial
                </Label>
      
                <Input
                  id="edit-official-match-url"
                  type="url"
                  value={
                    matchForm.official_match_url || ''
                  }
                  onChange={(event) =>
                    setMatchForm((current) => ({
                      ...current,
                      official_match_url:
                        event.target.value,
                    }))
                  }
                  placeholder="https://..."
                  data-testid="edit-match-official-url-input"
                />
      
                <p className="text-xs leading-5 text-muted-foreground">
                  O link será utilizado para consultar e importar
                  o resultado oficial do jogo.
                </p>
              </div>
      
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-matchday">
                    Jornada
                  </Label>
      
                  <Input
                    id="edit-matchday"
                    type="number"
                    min="1"
                    value={
                      matchForm.matchday || 1
                    }
                    onChange={(event) =>
                      setMatchForm((current) => ({
                        ...current,
                        matchday:
                          parseInt(
                            event.target.value,
                            10
                          ) || 1,
                      }))
                    }
                  />
                </div>
      
                <div className="space-y-2">
                  <Label htmlFor="edit-bonus-points">
                    Bonificação
                  </Label>
      
                  <Input
                    id="edit-bonus-points"
                    type="number"
                    min="0"
                    value={
                      matchForm.bonus_points || 0
                    }
                    onChange={(event) =>
                      setMatchForm((current) => ({
                        ...current,
                        bonus_points:
                          parseInt(
                            event.target.value,
                            10
                          ) || 0,
                      }))
                    }
                  />
                </div>
      
                <div className="space-y-2">
                  <Label htmlFor="edit-penalty-points">
                    Penalização
                  </Label>
      
                  <Input
                    id="edit-penalty-points"
                    type="number"
                    min="0"
                    value={
                      matchForm.penalty_points || 0
                    }
                    onChange={(event) =>
                      setMatchForm((current) => ({
                        ...current,
                        penalty_points:
                          parseInt(
                            event.target.value,
                            10
                          ) || 0,
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
                onClick={() =>
                  setEditMatchDialogOpen(false)
                }
              >
                Cancelar
              </Button>
      
              <Button
                type="submit"
                disabled={creating}
                data-testid="submit-edit-match-btn"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A guardar
                  </>
                ) : (
                  'Guardar alterações'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Gamesheet Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-primary" />
              IMPORTAR FICHA DE JOGO
            </DialogTitle>
            <DialogDescription>
              Introduza o link da ficha de jogo oficial para importar automaticamente o resultado e estatísticas dos jogadores.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedMatch && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="font-medium">{team?.name} vs {selectedMatch.opponent_team}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedMatch.match_date && new Date(selectedMatch.match_date).toLocaleDateString('pt-PT')}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="gamesheet-url">Link da Ficha de Jogo</Label>
              <Input
                id="gamesheet-url"
                placeholder="https://aplisboa.assyssoftware.es/intranet/web/partido2.asp?id=..."
                value={gamesheetUrl}
                onChange={(e) => setGamesheetUrl(e.target.value)}
                data-testid="gamesheet-url-input"
              />
              <p className="text-xs text-muted-foreground">
                Cole o link completo da ficha de jogo da Associação de Patinagem
              </p>
            </div>

            {selectedMatch?.gamesheet_url && (
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-muted-foreground">Ficha já importada</span>
                <a 
                  href={selectedMatch.gamesheet_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  Ver <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>O que será importado:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-1 space-y-0.5">
                <li>• Resultado final do jogo</li>
                <li>• Golos e assistências de cada jogador</li>
                <li>• Cartões (amarelos, azuis, vermelhos)</li>
                <li>• Local e árbitros</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImportGamesheet} disabled={importing || !gamesheetUrl}>
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  A importar...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Importar Dados
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Matches Dialog */}
      <Dialog open={matchImportDialogOpen} onOpenChange={setMatchImportDialogOpen}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-xl tracking-tight">
              <Upload className="w-5 h-5 text-primary" />
              {t('championships.importMatches')}
            </DialogTitle>
            <DialogDescription>
              {t('championships.subtitle')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Download Template Button */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Modelo Excel</p>
                  <p className="text-xs text-muted-foreground">Descarregue o modelo com as colunas corretas</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const url = championshipsApi.downloadMatchesTemplate();
                  window.open(url, '_blank');
                }}
                data-testid="download-template-btn"
              >
                <Download className="w-4 h-4 mr-1" />
                Descarregar
              </Button>
            </div>

            <div className="p-4 border-2 border-dashed border-border rounded-lg text-center">
              <FileSpreadsheet className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Arraste um ficheiro .xlsx ou .csv ou clique para selecionar
              </p>
              <Input 
                type="file" 
                accept=".xlsx,.csv"
                onChange={handleImportMatches}
                disabled={importingMatches}
                data-testid="import-matches-file"
                className="cursor-pointer"
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">{t('championships.expectedColumns')}:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block">
                {t('championships.homeTeam')}, {t('championships.opponent')}, {t('championships.date')}, {t('championships.time')}, {t('championships.venue')}, {t('championships.round')}
              </code>
              <p className="text-xs mt-2">
                Os cabeçalhos podem estar em PT, ES, FR, IT ou EN
              </p>
            </div>

            {importingMatches && (
              <div className="flex items-center justify-center gap-2 text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                A importar...
              </div>
            )}

            {matchImportResults && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default">{matchImportResults.success} importados</Badge>
                  {matchImportResults.errors?.length > 0 && (
                    <Badge variant="destructive">{matchImportResults.errors.length} erros</Badge>
                  )}
                </div>
                {matchImportResults.imported?.length > 0 && (
                  <div className="max-h-40 overflow-y-auto text-sm border rounded p-2">
                    <p className="font-medium mb-1">Jogos importados:</p>
                    {matchImportResults.imported.map((m, i) => (
                      <p key={i} className="text-muted-foreground">
                        {m.home_team || '?'} vs {m.opponent_team} - {m.match_date}
                      </p>
                    ))}
                  </div>
                )}
                {matchImportResults.errors?.length > 0 && (
                  <div className="max-h-32 overflow-y-auto text-sm text-destructive border border-destructive/20 rounded p-2">
                    <p className="font-medium mb-1">Erros:</p>
                    {matchImportResults.errors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setMatchImportDialogOpen(false);
              setMatchImportResults(null);
            }}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Competition Team Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">Adicionar Equipa</DialogTitle>
            <DialogDescription>
              Registar uma equipa participante na competição
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTeam}>
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Equipa *</Label>
                  <Input
                    placeholder="Ex: SL Benfica"
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    required
                    data-testid="team-name-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Pavilhão</Label>
                    <Input
                      placeholder="Ex: Pavilhão da Luz"
                      value={teamForm.pavilion_name}
                      onChange={(e) => setTeamForm({ ...teamForm, pavilion_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Morada do Pavilhão</Label>
                    <Input
                      placeholder="Ex: Av. Eusébio da Silva Ferreira"
                      value={teamForm.pavilion_address}
                      onChange={(e) => setTeamForm({ ...teamForm, pavilion_address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Field Player Kit Colors */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <Label className="font-semibold">Equipamento Jogador de Campo</Label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Camisola 1ª</Label>
                    <Input
                      type="color"
                      value={teamForm.field_player_kit.primary_shirt || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        field_player_kit: { ...teamForm.field_player_kit, primary_shirt: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Camisola 2ª</Label>
                    <Input
                      type="color"
                      value={teamForm.field_player_kit.secondary_shirt || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        field_player_kit: { ...teamForm.field_player_kit, secondary_shirt: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Calções 1ª</Label>
                    <Input
                      type="color"
                      value={teamForm.field_player_kit.primary_shorts || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        field_player_kit: { ...teamForm.field_player_kit, primary_shorts: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Calções 2ª</Label>
                    <Input
                      type="color"
                      value={teamForm.field_player_kit.secondary_shorts || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        field_player_kit: { ...teamForm.field_player_kit, secondary_shorts: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Meias 1ª</Label>
                    <Input
                      type="color"
                      value={teamForm.field_player_kit.primary_socks || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        field_player_kit: { ...teamForm.field_player_kit, primary_socks: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Meias 2ª</Label>
                    <Input
                      type="color"
                      value={teamForm.field_player_kit.secondary_socks || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        field_player_kit: { ...teamForm.field_player_kit, secondary_socks: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                </div>
              </div>

              {/* Goalkeeper Kit Colors */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-blue-500" />
                  <Label className="font-semibold">Equipamento Guarda-Redes</Label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Camisola 1ª</Label>
                    <Input
                      type="color"
                      value={teamForm.goalkeeper_kit.primary_shirt || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        goalkeeper_kit: { ...teamForm.goalkeeper_kit, primary_shirt: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Camisola 2ª</Label>
                    <Input
                      type="color"
                      value={teamForm.goalkeeper_kit.secondary_shirt || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        goalkeeper_kit: { ...teamForm.goalkeeper_kit, secondary_shirt: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Calções 1ª</Label>
                    <Input
                      type="color"
                      value={teamForm.goalkeeper_kit.primary_shorts || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        goalkeeper_kit: { ...teamForm.goalkeeper_kit, primary_shorts: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Calções 2ª</Label>
                    <Input
                      type="color"
                      value={teamForm.goalkeeper_kit.secondary_shorts || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        goalkeeper_kit: { ...teamForm.goalkeeper_kit, secondary_shorts: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Meias 1ª</Label>
                    <Input
                      type="color"
                      value={teamForm.goalkeeper_kit.primary_socks || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        goalkeeper_kit: { ...teamForm.goalkeeper_kit, primary_socks: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Meias 2ª</Label>
                    <Input
                      type="color"
                      value={teamForm.goalkeeper_kit.secondary_socks || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        goalkeeper_kit: { ...teamForm.goalkeeper_kit, secondary_socks: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTeamDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating} data-testid="submit-team-btn">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Competition Team Dialog */}
      <Dialog open={editTeamDialogOpen} onOpenChange={setEditTeamDialogOpen}>
        <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">Editar Equipa</DialogTitle>
            <DialogDescription>
              Alterar dados da equipa
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateTeam}>
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Equipa *</Label>
                  <Input
                    placeholder="Ex: SL Benfica"
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Pavilhão</Label>
                    <Input
                      placeholder="Ex: Pavilhão da Luz"
                      value={teamForm.pavilion_name}
                      onChange={(e) => setTeamForm({ ...teamForm, pavilion_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Morada do Pavilhão</Label>
                    <Input
                      placeholder="Ex: Av. Eusébio da Silva Ferreira"
                      value={teamForm.pavilion_address}
                      onChange={(e) => setTeamForm({ ...teamForm, pavilion_address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Field Player Kit Colors */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <Label className="font-semibold">Equipamento Jogador de Campo</Label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Camisola 1ª</Label>
                    <Input
                      type="color"
                      value={teamForm.field_player_kit?.primary_shirt || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        field_player_kit: { ...teamForm.field_player_kit, primary_shirt: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Camisola 2ª</Label>
                    <Input
                      type="color"
                      value={teamForm.field_player_kit?.secondary_shirt || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        field_player_kit: { ...teamForm.field_player_kit, secondary_shirt: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Calções 1ª</Label>
                    <Input
                      type="color"
                      value={teamForm.field_player_kit?.primary_shorts || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        field_player_kit: { ...teamForm.field_player_kit, primary_shorts: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Calções 2ª</Label>
                    <Input
                      type="color"
                      value={teamForm.field_player_kit?.secondary_shorts || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        field_player_kit: { ...teamForm.field_player_kit, secondary_shorts: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Meias 1ª</Label>
                    <Input
                      type="color"
                      value={teamForm.field_player_kit?.primary_socks || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        field_player_kit: { ...teamForm.field_player_kit, primary_socks: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Meias 2ª</Label>
                    <Input
                      type="color"
                      value={teamForm.field_player_kit?.secondary_socks || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        field_player_kit: { ...teamForm.field_player_kit, secondary_socks: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                </div>
              </div>

              {/* Goalkeeper Kit Colors */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-blue-500" />
                  <Label className="font-semibold">Equipamento Guarda-Redes</Label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Camisola 1ª</Label>
                    <Input
                      type="color"
                      value={teamForm.goalkeeper_kit?.primary_shirt || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        goalkeeper_kit: { ...teamForm.goalkeeper_kit, primary_shirt: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Camisola 2ª</Label>
                    <Input
                      type="color"
                      value={teamForm.goalkeeper_kit?.secondary_shirt || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        goalkeeper_kit: { ...teamForm.goalkeeper_kit, secondary_shirt: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Calções 1ª</Label>
                    <Input
                      type="color"
                      value={teamForm.goalkeeper_kit?.primary_shorts || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        goalkeeper_kit: { ...teamForm.goalkeeper_kit, primary_shorts: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Calções 2ª</Label>
                    <Input
                      type="color"
                      value={teamForm.goalkeeper_kit?.secondary_shorts || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        goalkeeper_kit: { ...teamForm.goalkeeper_kit, secondary_shorts: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Meias 1ª</Label>
                    <Input
                      type="color"
                      value={teamForm.goalkeeper_kit?.primary_socks || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        goalkeeper_kit: { ...teamForm.goalkeeper_kit, primary_socks: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Meias 2ª</Label>
                    <Input
                      type="color"
                      value={teamForm.goalkeeper_kit?.secondary_socks || '#ffffff'}
                      onChange={(e) => setTeamForm({
                        ...teamForm,
                        goalkeeper_kit: { ...teamForm.goalkeeper_kit, secondary_socks: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTeamDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Teams Dialog */}
      <Dialog open={teamImportDialogOpen} onOpenChange={setTeamImportDialogOpen}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
              <Upload className="w-6 h-6 text-primary" />
              IMPORTAR EQUIPAS
            </DialogTitle>
            <DialogDescription>
              Importe equipas a partir de um ficheiro Excel ou CSV
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium mb-2">Formato esperado:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Nome</strong> ou <strong>Equipa</strong> - Nome da equipa (obrigatório)</li>
                <li>• <strong>Pavilhão</strong> ou <strong>Recinto</strong> - Nome do pavilhão</li>
                <li>• <strong>Morada</strong> ou <strong>Endereço</strong> - Morada do pavilhão</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teams-file">Selecionar Ficheiro</Label>
              <Input
                id="teams-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportTeams}
                disabled={importingTeams}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Ficheiros suportados: .xlsx, .xls, .csv
              </p>
            </div>

            {importingTeams && (
              <div className="flex items-center gap-2 text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>A importar equipas...</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamImportDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
