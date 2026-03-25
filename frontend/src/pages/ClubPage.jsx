import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { clubApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
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
  Check
} from 'lucide-react';
import { LogoUpload } from '../components/ImageUpload';

// Predefined color palettes
const COLOR_PALETTES = [
  { name: 'Verde Clássico', primary: '#006D5B', secondary: '#FFD700', accent: '#1a1a2e' },
  { name: 'Azul Real', primary: '#1e40af', secondary: '#fbbf24', accent: '#0f172a' },
  { name: 'Vermelho Paixão', primary: '#dc2626', secondary: '#facc15', accent: '#1c1917' },
  { name: 'Verde Lima', primary: '#16a34a', secondary: '#f97316', accent: '#052e16' },
  { name: 'Roxo Elegante', primary: '#7c3aed', secondary: '#fde047', accent: '#1e1b4b' },
  { name: 'Azul Celeste', primary: '#0ea5e9', secondary: '#fcd34d', accent: '#0c4a6e' },
  { name: 'Laranja Vibrante', primary: '#ea580c', secondary: '#14b8a6', accent: '#431407' },
  { name: 'Rosa Moderno', primary: '#db2777', secondary: '#a3e635', accent: '#4a044e' },
];

export default function ClubPage() {
  const { user } = useAuth();
  const { refreshTheme } = useTheme();
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState(null);
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
    primary_color: '#006D5B',
    secondary_color: '#FFD700',
    accent_color: '#1a1a2e'
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchClub();
  }, []);

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
          primary_color: clubData.primary_color || '#006D5B',
          secondary_color: clubData.secondary_color || '#FFD700',
          accent_color: clubData.accent_color || '#1a1a2e'
        });
      }
    } catch (error) {
      console.error('Error fetching club:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClub = async () => {
    setSaving(true);
    try {
      const response = await clubApi.create(formData);
      setClub(response.data);
      toast.success('Clube criado com sucesso!');
    } catch (error) {
      const message = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : 'Erro ao criar clube';
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
      // Refresh global theme after updating colors
      refreshTheme();
      toast.success('Clube atualizado com sucesso!');
    } catch (error) {
      const message = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : 'Erro ao atualizar clube';
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
      accent_color: palette.accent
    }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
          <h1 className="font-heading text-3xl lg:text-4xl text-foreground tracking-wide">
            CRIAR CLUBE
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure as informações do seu clube
          </p>
        </div>

        <Card className="border border-border">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Clube *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Ex: Sporting Clube de Portugal"
                  data-testid="club-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Logo do Clube</Label>
                <LogoUpload
                  currentUrl={formData.logo_url}
                  onUpload={(url) => handleChange('logo_url', url)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Morada</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Rua do Clube, 123"
                />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Lisboa"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ano de Fundação</Label>
                <Input
                  type="number"
                  value={formData.founded_year}
                  onChange={(e) => handleChange('founded_year', parseInt(e.target.value) || '')}
                  placeholder="1906"
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://www.exemplo.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="geral@clube.pt"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
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
                  A criar...
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4 mr-2" />
                  Criar Clube
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

  // Show club info
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
            <h1 className="font-heading text-3xl lg:text-4xl text-foreground tracking-wide">
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
            Editar
          </Button>
        )}
      </div>

      {editing ? (
        /* Edit Form */
        <Card className="border border-border">
          <CardHeader>
            <CardTitle>Editar Informações do Clube</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Clube</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Logo do Clube</Label>
                <LogoUpload
                  currentUrl={formData.logo_url}
                  onUpload={(url) => handleChange('logo_url', url)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Morada</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ano de Fundação</Label>
                <Input
                  type="number"
                  value={formData.founded_year}
                  onChange={(e) => handleChange('founded_year', parseInt(e.target.value) || '')}
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
            </div>

            {/* Theme Color Selection */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                <Label className="text-base font-medium">Cores do Tema</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Escolha uma paleta de cores para personalizar a aparência da aplicação.
              </p>
              
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
                      data-testid={`palette-${palette.name.toLowerCase().replace(/\s/g, '-')}`}
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
                          title="Cor Principal"
                        />
                        <div 
                          className="w-6 h-6 rounded-full border border-border"
                          style={{ backgroundColor: palette.secondary }}
                          title="Cor Secundária"
                        />
                        <div 
                          className="w-6 h-6 rounded-full border border-border"
                          style={{ backgroundColor: palette.accent }}
                          title="Cor de Destaque"
                        />
                      </div>
                      <p className="text-xs font-medium truncate">{palette.name}</p>
                    </button>
                  );
                })}
              </div>

              {/* Current colors preview */}
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Cores atuais:</span>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-border shadow-sm"
                    style={{ backgroundColor: formData.primary_color }}
                    title="Principal"
                  />
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-border shadow-sm"
                    style={{ backgroundColor: formData.secondary_color }}
                    title="Secundária"
                  />
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-border shadow-sm"
                    style={{ backgroundColor: formData.accent_color }}
                    title="Destaque"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleUpdateClub} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A guardar...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Display Info */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg tracking-wide flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                LOCALIZAÇÃO
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {club.address && (
                <p className="text-foreground">{club.address}</p>
              )}
              <p className="text-muted-foreground">
                {club.city && `${club.city}, `}{club.country}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg tracking-wide flex items-center gap-2">
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
              <CardTitle className="font-heading text-lg tracking-wide flex items-center gap-2">
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
              <CardTitle className="font-heading text-lg tracking-wide flex items-center gap-2">
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
    </div>
  );
}
