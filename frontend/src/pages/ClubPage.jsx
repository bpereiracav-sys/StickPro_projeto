import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { clubApi, seasonsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Building2, 
  MapPin, 
  Globe, 
  Mail, 
  Phone,
  Calendar,
  Edit,
  Save,
  X,
  Loader2,
  Palette,
  Check,
  Clock,
  Plus,
  Trash2,
  Star,
  CalendarDays
} from 'lucide-react';
import { LogoUpload } from '../components/ImageUpload';

// Predefined color palettes
const COLOR_PALETTES = [
  { name: 'Verde Clássico', primary: '#006D5B', secondary: '#FFD700', accent: '#1a1a2e', mode: 'light' },
  { name: 'Azul Real', primary: '#1e40af', secondary: '#fbbf24', accent: '#0f172a', mode: 'light' },
  { name: 'Vermelho Paixão', primary: '#dc2626', secondary: '#facc15', accent: '#1c1917', mode: 'light' },
  { name: 'Verde Lima', primary: '#16a34a', secondary: '#f97316', accent: '#052e16', mode: 'light' },
  { name: 'Roxo Elegante', primary: '#7c3aed', secondary: '#fde047', accent: '#1e1b4b', mode: 'light' },
  { name: 'Azul Celeste', primary: '#0ea5e9', secondary: '#fcd34d', accent: '#0c4a6e', mode: 'light' },
  { name: 'Laranja Vibrante', primary: '#ea580c', secondary: '#14b8a6', accent: '#431407', mode: 'light' },
  { name: 'Rosa Moderno', primary: '#db2777', secondary: '#a3e635', accent: '#4a044e', mode: 'light' },
  { name: 'Neon Dark', primary: '#39ff14', secondary: '#00ff88', accent: '#111111', mode: 'dark' },
];

// Common timezones
const TIMEZONES = [
  { value: 'Europe/Lisbon', label: 'Lisboa (GMT+0/+1)' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1/+2)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1/+2)' },
  { value: 'Europe/London', label: 'Londres (GMT+0/+1)' },
  { value: 'Europe/Rome', label: 'Roma (GMT+1/+2)' },
  { value: 'Europe/Berlin', label: 'Berlim (GMT+1/+2)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdão (GMT+1/+2)' },
  { value: 'Europe/Brussels', label: 'Bruxelas (GMT+1/+2)' },
  { value: 'Europe/Zurich', label: 'Zurique (GMT+1/+2)' },
  { value: 'Atlantic/Azores', label: 'Açores (GMT-1/+0)' },
  { value: 'Atlantic/Madeira', label: 'Madeira (GMT+0/+1)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/New_York', label: 'Nova Iorque (GMT-5/-4)' },
  { value: 'UTC', label: 'UTC (GMT+0)' },
];

export default function ClubPage() {
  const { user } = useAuth();
  const { refreshTheme } = useTheme();
  const { t } = useLanguage();
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  
  // Seasons state
  const [seasons, setSeasons] = useState([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [editingSeason, setEditingSeason] = useState(null);
  const [savingSeason, setSavingSeason] = useState(false);
  const [seasonToDelete, setSeasonToDelete] = useState(null);
  const [seasonForm, setSeasonForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    is_active: false
  });

  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    address: '',
    city: '',
    country: 'Portugal',
    founded_year: '',
    website: '',
    email: '',
    phone: '',
    venue_name: '',
    venue_location: '',
    primary_color: '#006D5B',
    secondary_color: '#FFD700',
    accent_color: '#1a1a2e',
    theme_mode: 'light',
    timezone: 'Europe/Lisbon'
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'gestor_desportivo';

  useEffect(() => {
    fetchClub();
  }, []);

  useEffect(() => {
    if (club?.id) {
      fetchSeasons();
    }
  }, [club?.id]);

  const fetchClub = async () => {
    try {
      const response = await clubApi.getAll();
      if (response.data.length > 0) {
        const clubData = response.data[0];
        setClub(clubData);
        setFormData({
          name: clubData.name || '',
          logo_url: clubData.logo_url || '',
          address: clubData.address || '',
          city: clubData.city || '',
          country: clubData.country || 'Portugal',
          founded_year: clubData.founded_year || '',
          website: clubData.website || '',
          email: clubData.email || '',
          phone: clubData.phone || '',
          venue_name: clubData.venue_name || '',
          venue_location: clubData.venue_location || '',
          primary_color: clubData.primary_color || '#006D5B',
          secondary_color: clubData.secondary_color || '#FFD700',
          accent_color: clubData.accent_color || '#1a1a2e',
          theme_mode: clubData.theme_mode || 'light',
          timezone: clubData.timezone || 'Europe/Lisbon'
        });
      }
    } catch (error) {
      console.error('Error fetching club:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeasons = async () => {
    if (!club?.id) return;
    setLoadingSeasons(true);
    try {
      const response = await seasonsApi.getAll(club.id);
      setSeasons(response.data);
    } catch (error) {
      console.error('Error fetching seasons:', error);
    } finally {
      setLoadingSeasons(false);
    }
  };

  const handleCreateClub = async () => {
    setSaving(true);
    try {
      const response = await clubApi.create(formData);
      setClub(response.data);
      toast.success(t('club.createClub') + ' - ' + t('common.success'));
    } catch (error) {
      const message = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : t('common.error');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateClub = async () => {
    setSaving(true);
    try {
      await clubApi.update(club.id, formData);
      setClub({ ...club, ...formData });
      setEditing(false);
      refreshTheme();
      toast.success(t('common.success'));
    } catch (error) {
      const message = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : t('common.error');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handlePaletteSelect = (palette) => {
    setSelectedPalette(palette.name);
    setFormData(prev => ({
      ...prev,
      primary_color: palette.primary,
      secondary_color: palette.secondary,
      accent_color: palette.accent,
      theme_mode: palette.mode || 'light'
    }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Season handlers
  const openSeasonModal = (season = null) => {
    if (season) {
      setEditingSeason(season);
      setSeasonForm({
        name: season.name,
        start_date: season.start_date,
        end_date: season.end_date,
        is_active: season.is_active
      });
    } else {
      setEditingSeason(null);
      setSeasonForm({
        name: '',
        start_date: '',
        end_date: '',
        is_active: false
      });
    }
    setShowSeasonModal(true);
  };

  const handleSaveSeason = async () => {
    if (!seasonForm.name || !seasonForm.start_date || !seasonForm.end_date) {
      toast.error(t('common.required'));
      return;
    }

    setSavingSeason(true);
    try {
      if (editingSeason) {
        await seasonsApi.update(club.id, editingSeason.id, seasonForm);
        toast.success(t('club.seasonUpdated'));
      } else {
        await seasonsApi.create(club.id, seasonForm);
        toast.success(t('club.seasonCreated'));
      }
      setShowSeasonModal(false);
      fetchSeasons();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setSavingSeason(false);
    }
  };

  const handleActivateSeason = async (seasonId) => {
    try {
      await seasonsApi.activate(club.id, seasonId);
      toast.success(t('club.seasonActivated'));
      fetchSeasons();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    }
  };

  const handleDeleteSeason = async () => {
    if (!seasonToDelete) return;
    try {
      await seasonsApi.delete(club.id, seasonToDelete.id);
      toast.success(t('club.seasonDeleted'));
      setSeasonToDelete(null);
      fetchSeasons();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-PT');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  // No club exists - show create form for admins
  if (!club && isAdmin) {
    return (
      <div className="max-w-2xl mx-auto space-y-6" data-testid="club-create-page">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight">
            {t('club.createClub').toUpperCase()}
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure as informações do seu clube
          </p>
        </div>

        <Card className="border border-border">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('club.clubName')} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Ex: Sporting Clube de Portugal"
                  data-testid="club-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('club.logo')}</Label>
                <LogoUpload
                  currentUrl={formData.logo_url}
                  onUpload={(url) => handleChange('logo_url', url)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('club.address')}</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Rua do Clube, 123"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('club.city')}</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Lisboa"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('club.foundedYear')}</Label>
                <Input
                  type="number"
                  value={formData.founded_year}
                  onChange={(e) => handleChange('founded_year', parseInt(e.target.value) || '')}
                  placeholder="1906"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('club.timezone')}</Label>
                <Select value={formData.timezone} onValueChange={(v) => handleChange('timezone', v)}>
                  <SelectTrigger data-testid="timezone-select">
                    <SelectValue placeholder={t('club.selectTimezone')} />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('club.email')}</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="geral@clube.pt"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('club.phone')}</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+351 210 000 000"
                />
              </div>
            </div>

            <Button 
              onClick={handleCreateClub} 
              disabled={saving || !formData.name}
              className="w-full mt-4"
              data-testid="create-club-btn"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4 mr-2" />
                  {t('club.createClub')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No club and not admin
  if (!club) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="font-heading text-2xl mb-2">Nenhum Clube Configurado</h1>
        <p className="text-muted-foreground">
          O administrador ainda não configurou as informações do clube.
        </p>
      </div>
    );
  }

  // Show club info with tabs
  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="club-page">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {club.logo_url ? (
            <img 
              src={club.logo_url} 
              alt={club.name}
              className="w-20 h-20 object-contain rounded-lg border border-border"
              data-testid="club-logo-display"
            />
          ) : (
            <div className="w-20 h-20 bg-primary/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-10 h-10 text-primary" />
            </div>
          )}
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight">
              {club.name}
            </h1>
            {club.city && (
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {club.city}, {club.country}
              </p>
            )}
          </div>
        </div>
        
        {isAdmin && !editing && (
          <Button variant="outline" onClick={() => setEditing(true)} data-testid="edit-club-btn">
            <Edit className="w-4 h-4 mr-2" />
            {t('common.edit')}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="info" className="gap-2" data-testid="tab-info">
            <Building2 className="w-4 h-4 hidden sm:block" />
            {t('common.details')}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2" data-testid="tab-settings">
            <Clock className="w-4 h-4 hidden sm:block" />
            {t('nav.settings')}
          </TabsTrigger>
          <TabsTrigger value="seasons" className="gap-2" data-testid="tab-seasons">
            <CalendarDays className="w-4 h-4 hidden sm:block" />
            {t('club.seasons')}
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info">
          {editing ? (
            /* Edit Form */
            <Card className="border border-border">
              <CardHeader>
                <CardTitle>{t('club.editClub')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('club.clubName')}</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('club.logo')}</Label>
                    <LogoUpload
                      currentUrl={formData.logo_url}
                      onUpload={(url) => handleChange('logo_url', url)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('club.address')}</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('club.city')}</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('club.foundedYear')}</Label>
                    <Input
                      type="number"
                      value={formData.founded_year}
                      onChange={(e) => handleChange('founded_year', parseInt(e.target.value) || '')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('club.website')}</Label>
                    <Input
                      value={formData.website}
                      onChange={(e) => handleChange('website', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('club.email')}</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('club.phone')}</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
                  </div>
                </div>

                {/* Pavilhão do Clube */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    <Label className="text-base font-medium">{t('club.venue')}</Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('club.venueName')}</Label>
                      <Input
                        value={formData.venue_name}
                        onChange={(e) => handleChange('venue_name', e.target.value)}
                        placeholder="Pavilhão Municipal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('club.venueLocation')}</Label>
                      <Input
                        value={formData.venue_location}
                        onChange={(e) => handleChange('venue_location', e.target.value)}
                        placeholder="Rua do Desporto, 123, Lisboa"
                      />
                    </div>
                  </div>
                </div>

                {/* Theme Color Selection */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    <Label className="text-base font-medium">{t('club.themeColors')}</Label>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {COLOR_PALETTES.map((palette) => {
                      const isSelected = selectedPalette === palette.name || 
                        (formData.primary_color === palette.primary && 
                         formData.secondary_color === palette.secondary);
                      
                      return (
                        <button
                          key={palette.name}
                          type="button"
                          onClick={() => handlePaletteSelect(palette)}
                          className={`relative p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                            isSelected 
                              ? 'border-primary ring-2 ring-primary/20' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                          <div className="flex gap-1 mb-2">
                            <div 
                              className="w-6 h-6 rounded-full border border-border"
                              style={{ backgroundColor: palette.primary }}
                            />
                            <div 
                              className="w-6 h-6 rounded-full border border-border"
                              style={{ backgroundColor: palette.secondary }}
                            />
                            <div 
                              className="w-6 h-6 rounded-full border border-border"
                              style={{ backgroundColor: palette.accent }}
                            />
                          </div>
                          <p className="text-xs font-medium truncate">{palette.name}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Current colors preview */}
                  <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">{t('club.currentColors')}:</span>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-border shadow-sm"
                        style={{ backgroundColor: formData.primary_color }}
                      />
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-border shadow-sm"
                        style={{ backgroundColor: formData.secondary_color }}
                      />
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-border shadow-sm"
                        style={{ backgroundColor: formData.accent_color }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={handleUpdateClub} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('common.loading')}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {t('common.save')}
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    <X className="w-4 h-4 mr-2" />
                    {t('common.cancel')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Display Info */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="font-heading text-lg tracking-tight flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    LOCALIZAÇÃO
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {club.address && <p className="text-foreground">{club.address}</p>}
                  <p className="text-muted-foreground">
                    {club.city && `${club.city}, `}{club.country}
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="font-heading text-lg tracking-tight flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    {t('club.venue').toUpperCase()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {club.venue_name ? (
                    <>
                      <p className="text-lg font-semibold">{club.venue_name}</p>
                      {club.venue_location && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {club.venue_location}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">Não definido</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="font-heading text-lg tracking-tight flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    FUNDAÇÃO
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {club.founded_year ? (
                    <p className="text-2xl font-heading">{club.founded_year}</p>
                  ) : (
                    <p className="text-muted-foreground">Não definido</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="font-heading text-lg tracking-tight flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    CONTACTOS
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {club.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${club.email}`} className="text-primary hover:underline">
                        {club.email}
                      </a>
                    </p>
                  )}
                  {club.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <a href={`tel:${club.phone}`} className="text-primary hover:underline">
                        {club.phone}
                      </a>
                    </p>
                  )}
                  {!club.email && !club.phone && (
                    <p className="text-muted-foreground">Sem contactos definidos</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="font-heading text-lg tracking-tight flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    WEBSITE
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {club.website ? (
                    <a 
                      href={club.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {club.website}
                    </a>
                  ) : (
                    <p className="text-muted-foreground">Não definido</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Settings Tab (Timezone) */}
        <TabsContent value="settings">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                {t('club.timezone').toUpperCase()}
              </CardTitle>
              <CardDescription>
                {t('club.timezoneDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-md space-y-2">
                <Label>{t('club.selectTimezone')}</Label>
                <Select 
                  value={formData.timezone} 
                  onValueChange={(v) => {
                    handleChange('timezone', v);
                    // Auto-save timezone
                    clubApi.update(club.id, { ...formData, timezone: v })
                      .then(() => {
                        setClub({ ...club, timezone: v });
                        toast.success(t('common.success'));
                      })
                      .catch(() => toast.error(t('common.error')));
                  }}
                  disabled={!isAdmin}
                >
                  <SelectTrigger data-testid="timezone-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 inline mr-1" />
                  {t('club.timezone')}: <span className="font-medium text-foreground">{club.timezone || 'Europe/Lisbon'}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seasons Tab */}
        <TabsContent value="seasons">
          <Card className="border border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    {t('club.seasons').toUpperCase()}
                  </CardTitle>
                  <CardDescription>
                    {t('club.seasonsDescription')}
                  </CardDescription>
                </div>
                {isAdmin && (
                  <Button onClick={() => openSeasonModal()} data-testid="create-season-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('club.createSeason')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingSeasons ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : seasons.length === 0 ? (
                <div className="text-center py-8 bg-muted/30 rounded-lg">
                  <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">{t('club.noSeasons')}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t('club.noSeasonsHint')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {seasons.map(season => (
                    <div 
                      key={season.id}
                      className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                        season.is_active 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      data-testid={`season-${season.id}`}
                    >
                      <div className="flex items-center gap-3">
                        {season.is_active && (
                          <Star className="w-5 h-5 text-primary fill-primary" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{season.name}</p>
                            {season.is_active && (
                              <Badge className="bg-primary/10 text-primary border-0">
                                {t('club.activeSeason')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(season.start_date)} - {formatDate(season.end_date)}
                          </p>
                        </div>
                      </div>
                      
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          {!season.is_active && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleActivateSeason(season.id)}
                              data-testid={`activate-season-${season.id}`}
                            >
                              <Star className="w-4 h-4 mr-1" />
                              {t('club.setAsActive')}
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openSeasonModal(season)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setSeasonToDelete(season)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Season Modal */}
      <Dialog open={showSeasonModal} onOpenChange={setShowSeasonModal}>
        <DialogContent className="bg-white" data-testid="season-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">
              {editingSeason ? t('club.editSeason') : t('club.createSeason')}
            </DialogTitle>
            <DialogDescription>
              {t('club.seasonsDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('club.seasonName')} *</Label>
              <Input
                value={seasonForm.name}
                onChange={(e) => setSeasonForm({ ...seasonForm, name: e.target.value })}
                placeholder={t('club.seasonNamePlaceholder')}
                data-testid="season-name-input"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('club.startDate')} *</Label>
                <Input
                  type="date"
                  value={seasonForm.start_date}
                  onChange={(e) => setSeasonForm({ ...seasonForm, start_date: e.target.value })}
                  data-testid="season-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('club.endDate')} *</Label>
                <Input
                  type="date"
                  value={seasonForm.end_date}
                  onChange={(e) => setSeasonForm({ ...seasonForm, end_date: e.target.value })}
                  data-testid="season-end-date"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={seasonForm.is_active}
                onChange={(e) => setSeasonForm({ ...seasonForm, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <Label htmlFor="is_active">{t('club.setAsActive')}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSeasonModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveSeason} disabled={savingSeason}>
              {savingSeason ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {t('common.save')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Season Confirmation */}
      <AlertDialog open={!!seasonToDelete} onOpenChange={() => setSeasonToDelete(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('club.deleteSeason')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('club.deleteSeasonConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeleteSeason}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
