import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { usersApi, unavailabilitiesApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import { Skeleton } from '../components/ui/skeleton';
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
  ArrowLeft,
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
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { getInitials, getRoleName, formatDate } from '../lib/utils';
import { ImageUpload } from '../components/ImageUpload';

export default function MemberProfilePage() {
  const { memberId } = useParams();
  const { user: currentUser } = useAuth();
  const { isAdmin, canManageTeam } = usePermissions();
  const navigate = useNavigate();
  
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('identity');
  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false);
  const [newFamilyMember, setNewFamilyMember] = useState({
    first_name: '',
    surname: '',
    email: '',
    phone: '',
    relationship: 'pai'
  });

  // Check if current user can edit this member
  const canEdit = isAdmin || canManageTeam;

  // Form state
  const [formData, setFormData] = useState({
    // Identity
    photo_url: '',
    first_name: '',
    surname: '',
    nickname: '',
    birth_date: '',
    gender: '',
    nationality: '',
    fpp_license: '',
    
    // Family
    family_members: [],
    
    // Biometric
    weight: '',
    height: '',
    shoe_size: '',
    
    // Sports info
    year_joined_club: '',
    fpp_number: '',
    function: 'jogador',
    position: '',
    jersey_number: '',
    
    // Equipment
    training_kit_size: '',
    tracksuit_size: '',
    polo_size: '',
    training_sock_size: ''
  });

  useEffect(() => {
    fetchMemberData();
  }, [memberId]);

  const fetchMemberData = async () => {
    try {
      const response = await usersApi.getOne(memberId);
      const memberData = response.data;
      setMember(memberData);
      
      // Populate form with member's profile data
      const profile = memberData.profile || {};
      setFormData({
        photo_url: profile.photo_url || memberData.avatar_url || '',
        first_name: profile.first_name || memberData.name?.split(' ')[0] || '',
        surname: profile.surname || memberData.name?.split(' ').slice(1).join(' ') || '',
        nickname: profile.nickname || '',
        birth_date: profile.birth_date || profile.identity?.birth_date || '',
        gender: profile.gender || profile.identity?.gender || '',
        nationality: profile.nationality || profile.identity?.nationality || '',
        fpp_license: profile.fpp_license || profile.identity?.fpp_license || '',
        family_members: profile.family_members || profile.family?.members || [],
        weight: profile.weight || profile.biometrics?.weight || '',
        height: profile.height || profile.biometrics?.height || '',
        shoe_size: profile.shoe_size || profile.biometrics?.shoe_size || '',
        year_joined_club: profile.year_joined_club || profile.sports_info?.year_joined_club || '',
        fpp_number: profile.fpp_number || profile.sports_info?.fpp_number || '',
        function: profile.function || memberData.role || 'jogador',
        position: profile.position || profile.sports_info?.position || '',
        jersey_number: profile.jersey_number || profile.sports_info?.jersey_number || '',
        training_kit_size: profile.training_kit_size || profile.equipment?.training_kit_size || '',
        tracksuit_size: profile.tracksuit_size || profile.equipment?.tracksuit_size || '',
        polo_size: profile.polo_size || profile.equipment?.polo_size || '',
        training_sock_size: profile.training_sock_size || profile.equipment?.training_sock_size || ''
      });
    } catch (error) {
      console.error('Error fetching member:', error);
      toast.error('Erro ao carregar dados do membro');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!canEdit) {
      toast.error('Sem permissão para editar este perfil');
      return;
    }
    
    setSaving(true);
    try {
      await usersApi.updateProfile(memberId, formData);
      toast.success('Perfil atualizado com sucesso!');
      fetchMemberData(); // Refresh data
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleAddFamilyMember = () => {
    if (!newFamilyMember.first_name || !newFamilyMember.surname) {
      toast.error('Nome e apelido são obrigatórios');
      return;
    }

    const newMember = {
      id: Date.now().toString(),
      ...newFamilyMember
    };

    setFormData(prev => ({
      ...prev,
      family_members: [...prev.family_members, newMember]
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

  const handleRemoveFamilyMember = (familyMemberId) => {
    setFormData(prev => ({
      ...prev,
      family_members: prev.family_members.filter(m => m.id !== familyMemberId)
    }));
    toast.success('Familiar removido');
  };

  const getRelationshipLabel = (rel) => {
    const labels = {
      'pai': 'Pai',
      'mae': 'Mãe',
      'outro': 'Outro Familiar'
    };
    return labels[rel] || rel;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold">Membro não encontrado</h2>
        <p className="text-muted-foreground mt-2">O membro solicitado não existe ou foi removido.</p>
        <Button onClick={() => navigate('/members')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar aos Membros
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-2 sm:px-0" data-testid="member-profile-page">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => navigate('/members')}
        className="mb-2"
        data-testid="back-to-members-btn"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar aos Membros
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Avatar className="w-14 h-14 sm:w-20 sm:h-20 border-4 border-primary flex-shrink-0">
            <AvatarImage src={formData.photo_url} />
            <AvatarFallback className="bg-primary text-white text-lg sm:text-2xl font-heading">
              {getInitials(formData.first_name || member?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-xl sm:text-2xl lg:text-3xl text-foreground tracking-tight">
              {member?.name}
            </h1>
            <p className="text-muted-foreground text-sm truncate">
              {member?.email} - {getRoleName(member?.role)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/players/${memberId}`)}
            data-testid="view-stats-btn"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Ver Estatísticas
          </Button>
          {canEdit && (
            <Button onClick={handleSave} disabled={saving} data-testid="save-member-profile-btn">
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
          )}
        </div>
      </div>

      {!canEdit && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-3 px-4">
            <p className="text-sm text-amber-700">
              Modo de visualização. Apenas administradores e treinadores podem editar este perfil.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full h-auto">
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
              {canEdit && (
                <>
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
                </>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    placeholder="João"
                    disabled={!canEdit}
                    data-testid="member-firstname-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Apelido</Label>
                  <Input
                    value={formData.surname}
                    onChange={(e) => handleChange('surname', e.target.value)}
                    placeholder="Silva"
                    disabled={!canEdit}
                    data-testid="member-surname-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Alcunha</Label>
                  <Input
                    value={formData.nickname}
                    onChange={(e) => handleChange('nickname', e.target.value)}
                    placeholder="Alcunha (opcional)"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => handleChange('birth_date', e.target.value)}
                    disabled={!canEdit}
                    data-testid="member-birthdate-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Género</Label>
                  <Select 
                    value={formData.gender} 
                    onValueChange={(v) => handleChange('gender', v)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nacionalidade</Label>
                  <Input
                    value={formData.nationality}
                    onChange={(e) => handleChange('nationality', e.target.value)}
                    placeholder="Portuguesa"
                    disabled={!canEdit}
                    data-testid="member-nationality-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nº Licença FPP</Label>
                <Input
                  value={formData.fpp_license}
                  onChange={(e) => handleChange('fpp_license', e.target.value)}
                  placeholder="Nº da licença FPP"
                  disabled={!canEdit}
                />
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
                  <CardTitle className="font-heading text-lg sm:text-xl tracking-tight flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Familiares
                  </CardTitle>
                  <CardDescription>Contactos de familiares/responsáveis</CardDescription>
                </div>
                {canEdit && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowAddFamilyModal(true)}
                    data-testid="add-family-member-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {formData.family_members.length === 0 ? (
                <div className="text-center py-8 bg-muted/30 rounded-lg">
                  <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Sem familiares registados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.family_members.map((fm, index) => (
                    <div 
                      key={fm.id || index}
                      className="flex items-center justify-between p-4 border border-border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-secondary text-secondary-foreground">
                            {getInitials(`${fm.first_name} ${fm.surname}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{fm.first_name} {fm.surname}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {getRelationshipLabel(fm.relationship)}
                            </Badge>
                            {fm.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {fm.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveFamilyMember(fm.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
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
              <CardTitle className="font-heading text-lg sm:text-xl tracking-tight flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                Dados Biométricos
              </CardTitle>
              <CardDescription>Informações físicas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Peso (kg)</Label>
                  <Input
                    type="number"
                    value={formData.weight}
                    onChange={(e) => handleChange('weight', e.target.value)}
                    placeholder="70"
                    disabled={!canEdit}
                    data-testid="member-weight-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Altura (cm)</Label>
                  <Input
                    type="number"
                    value={formData.height}
                    onChange={(e) => handleChange('height', e.target.value)}
                    placeholder="175"
                    disabled={!canEdit}
                    data-testid="member-height-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tamanho do Calçado</Label>
                  <Input
                    value={formData.shoe_size}
                    onChange={(e) => handleChange('shoe_size', e.target.value)}
                    placeholder="42"
                    disabled={!canEdit}
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
              <CardTitle className="font-heading text-lg sm:text-xl tracking-tight flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Informação Desportiva
              </CardTitle>
              <CardDescription>Dados do jogador/atleta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ano de Entrada no Clube</Label>
                  <Input
                    type="number"
                    value={formData.year_joined_club}
                    onChange={(e) => handleChange('year_joined_club', e.target.value)}
                    placeholder="2020"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nº FPP</Label>
                  <Input
                    value={formData.fpp_number}
                    onChange={(e) => handleChange('fpp_number', e.target.value)}
                    placeholder="Número de federado"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Select 
                    value={formData.function} 
                    onValueChange={(v) => handleChange('function', v)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
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
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="GR">Guarda-Redes</SelectItem>
                      <SelectItem value="JC">Jogador de Campo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Número da Camisola</Label>
                  <Input
                    value={formData.jersey_number}
                    onChange={(e) => handleChange('jersey_number', e.target.value)}
                    placeholder="10"
                    disabled={!canEdit}
                    data-testid="member-jersey-input"
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
              <CardTitle className="font-heading text-lg sm:text-xl tracking-tight flex items-center gap-2">
                <Shirt className="w-5 h-5 text-primary" />
                Equipamento
              </CardTitle>
              <CardDescription>Tamanhos de equipamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tamanho Kit Treino</Label>
                  <Select 
                    value={formData.training_kit_size} 
                    onValueChange={(v) => handleChange('training_kit_size', v)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="XS">XS</SelectItem>
                      <SelectItem value="S">S</SelectItem>
                      <SelectItem value="M">M</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="XL">XL</SelectItem>
                      <SelectItem value="XXL">XXL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tamanho Fato Treino</Label>
                  <Select 
                    value={formData.tracksuit_size} 
                    onValueChange={(v) => handleChange('tracksuit_size', v)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="XS">XS</SelectItem>
                      <SelectItem value="S">S</SelectItem>
                      <SelectItem value="M">M</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="XL">XL</SelectItem>
                      <SelectItem value="XXL">XXL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tamanho Polo</Label>
                  <Select 
                    value={formData.polo_size} 
                    onValueChange={(v) => handleChange('polo_size', v)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="XS">XS</SelectItem>
                      <SelectItem value="S">S</SelectItem>
                      <SelectItem value="M">M</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="XL">XL</SelectItem>
                      <SelectItem value="XXL">XXL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tamanho Meias Treino</Label>
                  <Select 
                    value={formData.training_sock_size} 
                    onValueChange={(v) => handleChange('training_sock_size', v)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="35-38">35-38</SelectItem>
                      <SelectItem value="39-42">39-42</SelectItem>
                      <SelectItem value="43-46">43-46</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Family Member Modal */}
      <Dialog open={showAddFamilyModal} onOpenChange={setShowAddFamilyModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">Adicionar Familiar</DialogTitle>
            <DialogDescription>Adicionar contacto de familiar ou responsável</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={newFamilyMember.first_name}
                  onChange={(e) => setNewFamilyMember({ ...newFamilyMember, first_name: e.target.value })}
                  placeholder="Maria"
                />
              </div>
              <div className="space-y-2">
                <Label>Apelido *</Label>
                <Input
                  value={newFamilyMember.surname}
                  onChange={(e) => setNewFamilyMember({ ...newFamilyMember, surname: e.target.value })}
                  placeholder="Silva"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Parentesco</Label>
              <Select 
                value={newFamilyMember.relationship} 
                onValueChange={(v) => setNewFamilyMember({ ...newFamilyMember, relationship: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="pai">Pai</SelectItem>
                  <SelectItem value="mae">Mãe</SelectItem>
                  <SelectItem value="outro">Outro Familiar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newFamilyMember.email}
                  onChange={(e) => setNewFamilyMember({ ...newFamilyMember, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={newFamilyMember.phone}
                  onChange={(e) => setNewFamilyMember({ ...newFamilyMember, phone: e.target.value })}
                  placeholder="+351 912 345 678"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFamilyModal(false)}>Cancelar</Button>
            <Button onClick={handleAddFamilyMember}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
