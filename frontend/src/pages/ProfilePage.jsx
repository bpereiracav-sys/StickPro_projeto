import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersApi, unavailabilitiesApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
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
import { toast } from 'sonner';
import { 
  User,
  Users,
  Scale,
  Shirt,
  Trophy,
  Save,
  Loader2,
  Plus,
  Trash2,
  Camera,
  Mail,
  Phone,
  Calendar,
  Hash,
  Ruler,
  CalendarOff,
  Edit,
  Briefcase,
  GraduationCap,
  Stethoscope,
  Palmtree,
  AlertCircle
} from 'lucide-react';
import { getInitials, getRoleName, formatDate } from '../lib/utils';
import { ImageUpload } from '../components/ImageUpload';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('identity');
  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false);
  const [newFamilyMember, setNewFamilyMember] = useState({
    first_name: '',
    surname: '',
    email: '',
    phone: '',
    relationship: 'pai'
  });

  // Unavailability state
  const [unavailabilities, setUnavailabilities] = useState([]);
  const [loadingUnavailabilities, setLoadingUnavailabilities] = useState(false);
  const [showAddUnavailabilityModal, setShowAddUnavailabilityModal] = useState(false);
  const [editingUnavailability, setEditingUnavailability] = useState(null);
  const [savingUnavailability, setSavingUnavailability] = useState(false);
  const [deletingUnavailability, setDeletingUnavailability] = useState(null);
  const [unavailabilityForm, setUnavailabilityForm] = useState({
    start_date: '',
    end_date: '',
    reason: 'ferias',
    notes: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    // Identity
    photo_url: user?.profile?.photo_url || user?.avatar_url || '',
    first_name: user?.profile?.first_name || user?.name?.split(' ')[0] || '',
    surname: user?.profile?.surname || user?.name?.split(' ').slice(1).join(' ') || '',
    nickname: user?.profile?.nickname || '',
    birth_date: user?.profile?.birth_date || '',
    gender: user?.profile?.gender || '',
    fpp_license: user?.profile?.fpp_license || '',
    
    // Family
    family_members: user?.profile?.family_members || [],
    
    // Biometric
    weight: user?.profile?.weight || '',
    height: user?.profile?.height || '',
    shoe_size: user?.profile?.shoe_size || '',
    
    // Sports info
    year_joined_club: user?.profile?.year_joined_club || '',
    fpp_number: user?.profile?.fpp_number || '',
    function: user?.profile?.function || user?.role || 'jogador',
    position: user?.profile?.position || '',
    jersey_number: user?.profile?.jersey_number || '',
    
    // Equipment
    training_kit_size: user?.profile?.training_kit_size || '',
    tracksuit_size: user?.profile?.tracksuit_size || '',
    polo_size: user?.profile?.polo_size || '',
    training_sock_size: user?.profile?.training_sock_size || ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await usersApi.updateProfile(user.id, formData);
      updateUser({ 
        profile: formData,
        name: `${formData.first_name} ${formData.surname}`.trim() || user.name,
        avatar_url: formData.photo_url || user.avatar_url
      });
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFamilyMember = () => {
    if (!newFamilyMember.first_name || !newFamilyMember.surname) {
      toast.error('Nome e apelido são obrigatórios');
      return;
    }

    const member = {
      id: Date.now().toString(),
      ...newFamilyMember
    };

    setFormData(prev => ({
      ...prev,
      family_members: [...prev.family_members, member]
    }));

    setNewFamilyMember({
      first_name: '',
      surname: '',
      email: '',
      phone: '',
      relationship: 'pai'
    });
    setShowAddFamilyModal(false);
    toast.success('Familiar adicionado');
  };

  const handleRemoveFamilyMember = (memberId) => {
    setFormData(prev => ({
      ...prev,
      family_members: prev.family_members.filter(m => m.id !== memberId)
    }));
    toast.success('Familiar removido');
  };

  // Fetch unavailabilities
  const fetchUnavailabilities = async () => {
    setLoadingUnavailabilities(true);
    try {
      const res = await unavailabilitiesApi.getMy();
      setUnavailabilities(res.data || []);
    } catch (error) {
      console.error('Error fetching unavailabilities:', error);
    } finally {
      setLoadingUnavailabilities(false);
    }
  };

  // Load unavailabilities when tab changes
  useEffect(() => {
    if (activeTab === 'unavailability') {
      fetchUnavailabilities();
    }
  }, [activeTab]);

  // Handle create/update unavailability
  const handleSaveUnavailability = async () => {
    if (!unavailabilityForm.start_date || !unavailabilityForm.end_date) {
      toast.error('Data de início e fim são obrigatórias');
      return;
    }

    const startDate = new Date(unavailabilityForm.start_date);
    const endDate = new Date(unavailabilityForm.end_date);
    
    if (startDate >= endDate) {
      toast.error('A data de início deve ser anterior à data de fim');
      return;
    }

    setSavingUnavailability(true);
    try {
      const payload = {
        start_date: new Date(unavailabilityForm.start_date).toISOString(),
        end_date: new Date(unavailabilityForm.end_date).toISOString(),
        reason: unavailabilityForm.reason,
        notes: unavailabilityForm.notes || null
      };

      if (editingUnavailability) {
        await unavailabilitiesApi.update(editingUnavailability.id, payload);
        toast.success('Indisponibilidade atualizada!');
      } else {
        await unavailabilitiesApi.create(payload);
        toast.success('Indisponibilidade criada! O treinador foi notificado.');
      }

      setShowAddUnavailabilityModal(false);
      setEditingUnavailability(null);
      resetUnavailabilityForm();
      fetchUnavailabilities();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao guardar indisponibilidade');
    } finally {
      setSavingUnavailability(false);
    }
  };

  // Handle delete unavailability
  const handleDeleteUnavailability = async (unavId) => {
    if (!confirm('Tem a certeza que quer eliminar esta indisponibilidade?')) return;
    
    setDeletingUnavailability(unavId);
    try {
      await unavailabilitiesApi.delete(unavId);
      toast.success('Indisponibilidade eliminada!');
      fetchUnavailabilities();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao eliminar indisponibilidade');
    } finally {
      setDeletingUnavailability(null);
    }
  };

  // Open edit dialog
  const openEditUnavailability = (unav) => {
    setEditingUnavailability(unav);
    setUnavailabilityForm({
      start_date: unav.start_date?.split('T')[0] || '',
      end_date: unav.end_date?.split('T')[0] || '',
      reason: unav.reason || 'outro',
      notes: unav.notes || ''
    });
    setShowAddUnavailabilityModal(true);
  };

  // Reset unavailability form
  const resetUnavailabilityForm = () => {
    setUnavailabilityForm({
      start_date: '',
      end_date: '',
      reason: 'ferias',
      notes: ''
    });
  };

  // Get reason label and icon
  const getReasonInfo = (reason) => {
    const reasons = {
      'ferias': { label: 'Férias', icon: Palmtree, color: 'text-amber-600 bg-amber-50' },
      'doenca': { label: 'Doença/Consulta Médica', icon: Stethoscope, color: 'text-red-600 bg-red-50' },
      'escola': { label: 'Atividades Escolares', icon: GraduationCap, color: 'text-blue-600 bg-blue-50' },
      'outro': { label: 'Outro Motivo', icon: AlertCircle, color: 'text-gray-600 bg-gray-50' }
    };
    return reasons[reason] || reasons['outro'];
  };

  // Check if unavailability is active (current or future)
  const isActiveUnavailability = (unav) => {
    const now = new Date();
    const endDate = new Date(unav.end_date);
    return endDate >= now;
  };

  const getRelationshipLabel = (rel) => {
    const labels = {
      'pai': 'Pai',
      'mae': 'Mãe',
      'outro': 'Outro Familiar'
    };
    return labels[rel] || rel;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-2 sm:px-0" data-testid="profile-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Avatar className="w-14 h-14 sm:w-20 sm:h-20 border-4 border-primary flex-shrink-0">
            <AvatarImage src={formData.photo_url} />
            <AvatarFallback className="bg-primary text-white text-lg sm:text-2xl font-heading">
              {getInitials(formData.first_name || user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-xl sm:text-2xl lg:text-3xl text-foreground tracking-tight">
              Meu Perfil
            </h1>
            <p className="text-muted-foreground text-sm truncate">
              {user?.email} - {getRoleName(user?.role)}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto" data-testid="save-profile-btn">
          {loading ? (
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
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full h-auto">
          <TabsTrigger value="identity" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3">
            <User className="w-4 h-4" />
            <span className="text-[10px] sm:text-sm">Identidade</span>
          </TabsTrigger>
          <TabsTrigger value="family" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3">
            <Users className="w-4 h-4" />
            <span className="text-[10px] sm:text-sm">Familiares</span>
          </TabsTrigger>
          <TabsTrigger value="biometric" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3">
            <Scale className="w-4 h-4" />
            <span className="text-[10px] sm:text-sm">Biométricos</span>
          </TabsTrigger>
          <TabsTrigger value="sports" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3">
            <Trophy className="w-4 h-4" />
            <span className="text-[10px] sm:text-sm">Desportivo</span>
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3">
            <Shirt className="w-4 h-4" />
            <span className="text-[10px] sm:text-sm">Equipamento</span>
          </TabsTrigger>
          <TabsTrigger value="unavailability" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3" data-testid="unavailability-tab">
            <CalendarOff className="w-4 h-4" />
            <span className="text-[10px] sm:text-sm">Ausências</span>
          </TabsTrigger>
        </TabsList>

        {/* Identity Tab */}
        <TabsContent value="identity">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg sm:text-xl tracking-tight flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Identidade
              </CardTitle>
              <CardDescription>Informações pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <ImageUpload
                  currentUrl={formData.photo_url}
                  onUpload={(url) => handleChange('photo_url', url)}
                  fallback={getInitials(formData.first_name)}
                  size="lg"
                  label="Carregar foto"
                />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    Carregue uma foto de perfil. Formatos aceites: JPEG, PNG, GIF, WebP. Tamanho máximo: 5MB.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    placeholder="João"
                    data-testid="profile-firstname-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Apelido</Label>
                  <Input
                    value={formData.surname}
                    onChange={(e) => handleChange('surname', e.target.value)}
                    placeholder="Silva"
                    data-testid="profile-surname-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Alcunha</Label>
                  <Input
                    value={formData.nickname}
                    onChange={(e) => handleChange('nickname', e.target.value)}
                    placeholder="Opcional"
                    data-testid="profile-nickname-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email da Conta</Label>
                  <Input
                    value={user?.email}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => handleChange('birth_date', e.target.value)}
                    data-testid="profile-birthdate-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sexo</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => handleChange('gender', value)}
                  >
                    <SelectTrigger data-testid="profile-gender-select">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Licença FPP</Label>
                  <Input
                    value={formData.fpp_license}
                    onChange={(e) => handleChange('fpp_license', e.target.value)}
                    placeholder="Nº da licença"
                    data-testid="profile-fpp-license-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Family Tab */}
        <TabsContent value="family">
          <Card className="border border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Familiares
                  </CardTitle>
                  <CardDescription>Contactos dos responsáveis/familiares</CardDescription>
                </div>
                <Button onClick={() => setShowAddFamilyModal(true)} data-testid="add-family-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {formData.family_members.length === 0 ? (
                <div className="text-center py-8 bg-muted/30 rounded-sm">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum familiar adicionado</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowAddFamilyModal(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Familiar
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.family_members.map((member, index) => (
                    <div 
                      key={member.id || index}
                      className="flex items-center justify-between p-4 border border-border rounded-sm"
                      data-testid={`family-member-${index}`}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(`${member.first_name} ${member.surname}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">
                            {member.first_name} {member.surname}
                          </p>
                          <Badge variant="outline" className="mt-1">
                            {getRelationshipLabel(member.relationship)}
                          </Badge>
                          {member.email && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Mail className="w-3 h-3" />
                              {member.email}
                            </p>
                          )}
                          {member.phone && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {member.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveFamilyMember(member.id)}
                        data-testid={`remove-family-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Biometric Tab */}
        <TabsContent value="biometric">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                DADOS Biométricos
              </CardTitle>
              <CardDescription>Informações físicas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Peso (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => handleChange('weight', parseFloat(e.target.value) || '')}
                    placeholder="Ex: 70.5"
                    data-testid="profile-weight-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Altura (cm)</Label>
                  <Input
                    type="number"
                    value={formData.height}
                    onChange={(e) => handleChange('height', parseFloat(e.target.value) || '')}
                    placeholder="Ex: 175"
                    data-testid="profile-height-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tamanho do Calçado</Label>
                  <Input
                    value={formData.shoe_size}
                    onChange={(e) => handleChange('shoe_size', e.target.value)}
                    placeholder="Ex: 42 ou 8.5"
                    data-testid="profile-shoe-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sports Tab */}
        <TabsContent value="sports">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                INFORMAÇÃO DESPORTIVA
              </CardTitle>
              <CardDescription>Dados da carreira desportiva</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ano de Chegada ao Clube</Label>
                  <Input
                    type="number"
                    value={formData.year_joined_club}
                    onChange={(e) => handleChange('year_joined_club', parseInt(e.target.value) || '')}
                    placeholder="Ex: 2020"
                    data-testid="profile-year-joined-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nº da FPP</Label>
                  <Input
                    value={formData.fpp_number}
                    onChange={(e) => handleChange('fpp_number', e.target.value)}
                    placeholder="Nº de federado"
                    data-testid="profile-fpp-number-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Select 
                    value={formData.function} 
                    onValueChange={(v) => handleChange('function', v)}
                  >
                    <SelectTrigger data-testid="profile-function-select">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="jogador">Jogador</SelectItem>
                      <SelectItem value="treinador">Treinador</SelectItem>
                      <SelectItem value="treinador_adjunto">Treinador Adjunto</SelectItem>
                      <SelectItem value="delegado">Delegado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Posição</Label>
                  <Select 
                    value={formData.position} 
                    onValueChange={(v) => handleChange('position', v)}
                  >
                    <SelectTrigger data-testid="profile-position-select">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="GR">Guarda-Redes (GR)</SelectItem>
                      <SelectItem value="JC">Jogador de Campo (JC)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nº da Camisola</Label>
                  <Input
                    type="number"
                    value={formData.jersey_number}
                    onChange={(e) => handleChange('jersey_number', parseInt(e.target.value) || '')}
                    placeholder="Ex: 10"
                    data-testid="profile-jersey-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Equipment Tab */}
        <TabsContent value="equipment">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
                <Shirt className="w-5 h-5 text-primary" />
                Equipamento
              </CardTitle>
              <CardDescription>Tamanhos de roupa e equipamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tamanho Kit de Treino</Label>
                  <Input
                    value={formData.training_kit_size}
                    onChange={(e) => handleChange('training_kit_size', e.target.value)}
                    placeholder="Ex: M ou 12"
                    data-testid="profile-training-kit-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tamanho Fato de Treino</Label>
                  <Input
                    value={formData.tracksuit_size}
                    onChange={(e) => handleChange('tracksuit_size', e.target.value)}
                    placeholder="Ex: L ou 14"
                    data-testid="profile-tracksuit-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tamanho Polo de Saída</Label>
                  <Input
                    value={formData.polo_size}
                    onChange={(e) => handleChange('polo_size', e.target.value)}
                    placeholder="Ex: M ou 12"
                    data-testid="profile-polo-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tamanho Meia de Treino</Label>
                  <Input
                    value={formData.training_sock_size}
                    onChange={(e) => handleChange('training_sock_size', e.target.value)}
                    placeholder="Ex: 39-42"
                    data-testid="profile-sock-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unavailability Tab */}
        <TabsContent value="unavailability">
          <Card className="border border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
                    <CalendarOff className="w-5 h-5 text-primary" />
                    Indisponibilidades
                  </CardTitle>
                  <CardDescription>
                    Períodos em que não estarei disponível para treinos/jogos
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => {
                    resetUnavailabilityForm();
                    setEditingUnavailability(null);
                    setShowAddUnavailabilityModal(true);
                  }}
                  data-testid="add-unavailability-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingUnavailabilities ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : unavailabilities.length === 0 ? (
                <div className="text-center py-8 bg-muted/30 rounded-sm">
                  <CalendarOff className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma indisponibilidade registada</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Registe períodos de férias, doença ou outras ausências
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      resetUnavailabilityForm();
                      setShowAddUnavailabilityModal(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Período
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Active/Upcoming Unavailabilities */}
                  {unavailabilities.filter(isActiveUnavailability).length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                        Ativas / Futuras
                      </h3>
                      {unavailabilities.filter(isActiveUnavailability).map((unav) => {
                        const reasonInfo = getReasonInfo(unav.reason);
                        const ReasonIcon = reasonInfo.icon;
                        return (
                          <div 
                            key={unav.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-border rounded-lg bg-white gap-3"
                            data-testid={`unavailability-${unav.id}`}
                          >
                            <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${reasonInfo.color}`}>
                                <ReasonIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="secondary" className={`${reasonInfo.color} text-xs`}>
                                    {reasonInfo.label}
                                  </Badge>
                                  {new Date(unav.start_date) <= new Date() && new Date(unav.end_date) >= new Date() && (
                                    <Badge variant="destructive" className="text-xs">Agora</Badge>
                                  )}
                                </div>
                                <p className="font-semibold mt-1 text-sm sm:text-base">
                                  {formatDate(unav.start_date)} → {formatDate(unav.end_date)}
                                </p>
                                {unav.notes && (
                                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">{unav.notes}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 self-end sm:self-center flex-shrink-0">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditUnavailability(unav)}
                                data-testid={`edit-unavailability-${unav.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteUnavailability(unav.id)}
                                disabled={deletingUnavailability === unav.id}
                                data-testid={`delete-unavailability-${unav.id}`}
                              >
                                {deletingUnavailability === unav.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Past Unavailabilities */}
                  {unavailabilities.filter(u => !isActiveUnavailability(u)).length > 0 && (
                    <div className="space-y-3 mt-6">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                        Histórico
                      </h3>
                      {unavailabilities.filter(u => !isActiveUnavailability(u)).slice(0, 5).map((unav) => {
                        const reasonInfo = getReasonInfo(unav.reason);
                        const ReasonIcon = reasonInfo.icon;
                        return (
                          <div 
                            key={unav.id}
                            className="flex items-center justify-between p-3 border border-border rounded-sm bg-muted/30 opacity-70"
                            data-testid={`unavailability-past-${unav.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <ReasonIcon className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">
                                  {reasonInfo.label}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(unav.start_date)} → {formatDate(unav.end_date)}
                                </p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteUnavailability(unav.id)}
                              disabled={deletingUnavailability === unav.id}
                            >
                              {deletingUnavailability === unav.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Info box */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Como funciona?</p>
                    <ul className="mt-1 space-y-1 text-blue-700">
                      <li>• As indisponibilidades aparecem no calendário da equipa</li>
                      <li>• O treinador é notificado quando criar uma nova ausência</li>
                      <li>• Não poderá ser convocado durante estes períodos</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Family Member Modal */}
      <Dialog open={showAddFamilyModal} onOpenChange={setShowAddFamilyModal}>
        <DialogContent className="bg-white" data-testid="add-family-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">
              Adicionar Familiar
            </DialogTitle>
            <DialogDescription>
              Adicione os dados de um responsável ou familiar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Relação</Label>
              <Select 
                value={newFamilyMember.relationship} 
                onValueChange={(v) => setNewFamilyMember(prev => ({ ...prev, relationship: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="pai">Pai / Responsável 1</SelectItem>
                  <SelectItem value="mae">Mãe / Responsável 2</SelectItem>
                  <SelectItem value="outro">Outro Familiar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={newFamilyMember.first_name}
                  onChange={(e) => setNewFamilyMember(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Nome"
                  data-testid="family-firstname-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Apelido *</Label>
                <Input
                  value={newFamilyMember.surname}
                  onChange={(e) => setNewFamilyMember(prev => ({ ...prev, surname: e.target.value }))}
                  placeholder="Apelido"
                  data-testid="family-surname-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newFamilyMember.email}
                onChange={(e) => setNewFamilyMember(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
                data-testid="family-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={newFamilyMember.phone}
                onChange={(e) => setNewFamilyMember(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+351 900 000 000"
                data-testid="family-phone-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFamilyModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddFamilyMember} data-testid="confirm-add-family-btn">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Unavailability Modal */}
      <Dialog open={showAddUnavailabilityModal} onOpenChange={(open) => {
        setShowAddUnavailabilityModal(open);
        if (!open) {
          setEditingUnavailability(null);
          resetUnavailabilityForm();
        }
      }}>
        <DialogContent className="bg-white" data-testid="unavailability-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
              <CalendarOff className="w-5 h-5 text-primary" />
              {editingUnavailability ? 'Editar Indisponibilidade' : 'Adicionar Indisponibilidade'}
            </DialogTitle>
            <DialogDescription>
              {editingUnavailability 
                ? 'Altere os dados da indisponibilidade' 
                : 'Registe um período em que não estará disponível'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Início *</Label>
                <Input
                  type="date"
                  value={unavailabilityForm.start_date}
                  onChange={(e) => setUnavailabilityForm(prev => ({ ...prev, start_date: e.target.value }))}
                  data-testid="unavailability-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Fim *</Label>
                <Input
                  type="date"
                  value={unavailabilityForm.end_date}
                  onChange={(e) => setUnavailabilityForm(prev => ({ ...prev, end_date: e.target.value }))}
                  data-testid="unavailability-end-date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Select 
                value={unavailabilityForm.reason} 
                onValueChange={(v) => setUnavailabilityForm(prev => ({ ...prev, reason: v }))}
              >
                <SelectTrigger data-testid="unavailability-reason-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="ferias">
                    <div className="flex items-center gap-2">
                      <Palmtree className="w-4 h-4 text-amber-600" />
                      Férias
                    </div>
                  </SelectItem>
                  <SelectItem value="doenca">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-red-600" />
                      Doença / Consulta Médica
                    </div>
                  </SelectItem>
                  <SelectItem value="escola">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                      Atividades Escolares
                    </div>
                  </SelectItem>
                  <SelectItem value="outro">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-gray-600" />
                      Outro Motivo
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notas adicionais (opcional)</Label>
              <Textarea
                value={unavailabilityForm.notes}
                onChange={(e) => setUnavailabilityForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Adicione detalhes sobre esta ausência..."
                rows={3}
                data-testid="unavailability-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddUnavailabilityModal(false);
                setEditingUnavailability(null);
                resetUnavailabilityForm();
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveUnavailability} 
              disabled={savingUnavailability}
              data-testid="save-unavailability-btn"
            >
              {savingUnavailability ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingUnavailability ? 'Guardar' : 'Adicionar'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
