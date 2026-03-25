import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
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
  Ruler
} from 'lucide-react';
import { getInitials, getRoleName } from '../lib/utils';
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

  // Form state
  const [formData, setFormData] = useState({
    // Identity
    photo_url: user?.profile?.photo_url || user?.avatar_url || '',
    first_name: user?.profile?.first_name || user?.name?.split(' ')[0] || '',
    surname: user?.profile?.surname || user?.name?.split(' ').slice(1).join(' ') || '',
    nickname: user?.profile?.nickname || '',
    birth_date: user?.profile?.birth_date || '',
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

  const getRelationshipLabel = (rel) => {
    const labels = {
      'pai': 'Pai',
      'mae': 'Mãe',
      'outro': 'Outro Familiar'
    };
    return labels[rel] || rel;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="profile-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="w-20 h-20 border-4 border-primary">
            <AvatarImage src={formData.photo_url} />
            <AvatarFallback className="bg-primary text-white text-2xl font-heading">
              {getInitials(formData.first_name || user?.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-heading text-3xl lg:text-4xl text-foreground tracking-wide">
              MEU PERFIL
            </h1>
            <p className="text-muted-foreground">
              {user?.email} - {getRoleName(user?.role)}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={loading} data-testid="save-profile-btn">
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
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="identity" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Identidade</span>
          </TabsTrigger>
          <TabsTrigger value="family" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Familiares</span>
          </TabsTrigger>
          <TabsTrigger value="biometric" className="flex items-center gap-2">
            <Scale className="w-4 h-4" />
            <span className="hidden sm:inline">Biométricos</span>
          </TabsTrigger>
          <TabsTrigger value="sports" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Desportivo</span>
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-2">
            <Shirt className="w-4 h-4" />
            <span className="hidden sm:inline">Equipamento</span>
          </TabsTrigger>
        </TabsList>

        {/* Identity Tab */}
        <TabsContent value="identity">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="font-heading text-xl tracking-wide flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                IDENTIDADE
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
                  <CardTitle className="font-heading text-xl tracking-wide flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    FAMILIARES
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
              <CardTitle className="font-heading text-xl tracking-wide flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                DADOS BIOMÉTRICOS
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
              <CardTitle className="font-heading text-xl tracking-wide flex items-center gap-2">
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
              <CardTitle className="font-heading text-xl tracking-wide flex items-center gap-2">
                <Shirt className="w-5 h-5 text-primary" />
                EQUIPAMENTO
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
      </Tabs>

      {/* Add Family Member Modal */}
      <Dialog open={showAddFamilyModal} onOpenChange={setShowAddFamilyModal}>
        <DialogContent className="bg-white" data-testid="add-family-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-wide">
              ADICIONAR FAMILIAR
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
    </div>
  );
}
