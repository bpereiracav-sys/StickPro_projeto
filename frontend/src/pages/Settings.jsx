import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usersApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
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
  Loader2, 
  Save, 
  UserPlus, 
  Users, 
  Search, 
  Trash2, 
  Shield,
  Mail,
  Globe,
  Bell
} from 'lucide-react';
import { getInitials, getRoleName, getRoleColor } from '../lib/utils';
import { ImageUpload } from '../components/ImageUpload';
import { NotificationPermission } from '../components/NotificationPermission';

export default function Settings() {
  const { user, updateUser, logout, refreshProfiles } = useAuth();
  const { language, languages, languageNames, changeLanguage, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    avatar_url: user?.avatar_url || ''
  });

  // Associated accounts state
  const [associatedAccounts, setAssociatedAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [associating, setAssociating] = useState(false);
  const [accountToRemove, setAccountToRemove] = useState(null);

  useEffect(() => {
    fetchAssociatedAccounts();
  }, []);

  const fetchAssociatedAccounts = async () => {
    try {
      const response = await usersApi.getAssociated();
      setAssociatedAccounts(response.data);
    } catch (error) {
      console.error('Error fetching associated accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await usersApi.update(user.id, formData);
      updateUser(formData);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUser = async () => {
    if (!searchEmail.trim()) {
      toast.error('Introduza um email');
      return;
    }

    setSearching(true);
    setSearchResult(null);

    try {
      const response = await usersApi.searchToAssociate(searchEmail.trim());
      setSearchResult(response.data);
    } catch (error) {
      const message = error.response?.data?.detail || 'Utilizador não encontrado';
      toast.error(message);
    } finally {
      setSearching(false);
    }
  };

  const handleAssociate = async () => {
    if (!searchResult) return;

    setAssociating(true);
    try {
      await usersApi.associate(searchResult.id, 'filho/a');
      toast.success(`Conta de ${searchResult.name} associada com sucesso!`);
      setShowAddModal(false);
      setSearchEmail('');
      setSearchResult(null);
      fetchAssociatedAccounts();
      refreshProfiles();
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao associar conta';
      toast.error(message);
    } finally {
      setAssociating(false);
    }
  };

  const handleRemoveAssociation = async () => {
    if (!accountToRemove) return;

    try {
      await usersApi.removeAssociation(accountToRemove.id);
      toast.success('Associação removida');
      setAccountToRemove(null);
      fetchAssociatedAccounts();
      refreshProfiles();
    } catch (error) {
      toast.error('Erro ao remover associação');
    }
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setSearchEmail('');
    setSearchResult(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight">Definições</h1>
        <p className="text-muted-foreground mt-1">Gerir o seu perfil e preferências</p>
      </div>

      {/* Profile Card */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="font-heading text-xl tracking-tight">Perfil</CardTitle>
          <CardDescription>Informações da sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6 mb-8">
            <ImageUpload
              currentUrl={formData.avatar_url || user?.avatar_url}
              onUpload={(url) => setFormData({ ...formData, avatar_url: url })}
              fallback={getInitials(user?.name)}
              size="lg"
              label="Alterar foto"
            />
            <div className="pt-4">
              <h3 className="text-xl font-semibold">{user?.name}</h3>
              <p className="text-muted-foreground">{user?.email}</p>
              <Badge className={`${getRoleColor(user?.role)} mt-2`}>
                {getRoleName(user?.role)}
              </Badge>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="O seu nome"
                data-testid="settings-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+351 900 000 000"
                data-testid="settings-phone-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar">URL do Avatar</Label>
              <Input
                id="avatar"
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                placeholder="https://exemplo.com/foto.jpg"
                data-testid="settings-avatar-input"
              />
            </div>

            <Button type="submit" disabled={loading} className="btn-hover" data-testid="save-settings-btn">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('common.save')}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Language Card */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />
            {t('settings.language').toUpperCase()}
          </CardTitle>
          <CardDescription>
            {language === 'pt' ? 'Selecione o idioma da aplicação' :
             language === 'es' ? 'Seleccione el idioma de la aplicación' :
             language === 'fr' ? 'Sélectionnez la langue de l\'application' :
             language === 'it' ? 'Seleziona la lingua dell\'applicazione' :
             'Select the application language'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Label>{t('settings.language')}</Label>
            <Select value={language} onValueChange={changeLanguage}>
              <SelectTrigger className="w-full sm:w-[280px]" data-testid="language-selector">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <span className="text-lg">
                      {language === 'pt' ? '🇵🇹' :
                       language === 'es' ? '🇪🇸' :
                       language === 'fr' ? '🇫🇷' :
                       language === 'it' ? '🇮🇹' : '🇬🇧'}
                    </span>
                    {languageNames[language]}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    <span className="flex items-center gap-2">
                      <span className="text-lg">
                        {lang === 'pt' ? '🇵🇹' :
                         lang === 'es' ? '🇪🇸' :
                         lang === 'fr' ? '🇫🇷' :
                         lang === 'it' ? '🇮🇹' : '🇬🇧'}
                      </span>
                      {languageNames[lang]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Card */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            NOTIFICAÇÕES
          </CardTitle>
          <CardDescription>
            Recebe alertas push quando fores convocado para eventos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Ativa as notificações para seres avisado de novas convocatórias mesmo quando a app está fechada.
              </p>
            </div>
            <NotificationPermission />
          </div>
        </CardContent>
      </Card>

      {/* Associated Accounts Card */}
      <Card className="border border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                CONTAS ASSOCIADAS
              </CardTitle>
              <CardDescription>
                Vincule contas de atletas que está a acompanhar (ex: filhos)
              </CardDescription>
            </div>
            <Button 
              onClick={() => setShowAddModal(true)}
              className="btn-hover"
              data-testid="add-associated-account-btn"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Associar Conta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingAccounts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : associatedAccounts.length === 0 ? (
            <div className="text-center py-8 bg-muted/30 rounded-sm">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma conta associada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Associe a conta de um atleta para acompanhar as suas atividades
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {associatedAccounts.map(account => (
                <div 
                  key={account.id}
                  className="flex items-center justify-between p-4 border border-border rounded-sm bg-amber-50/50"
                  data-testid={`associated-account-${account.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={account.avatar_url} />
                      <AvatarFallback className="bg-amber-500 text-white">
                        {getInitials(account.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{account.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {account.email}
                      </div>
                      <Badge variant="outline" className="mt-1">
                        {getRoleName(account.role)}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setAccountToRemove(account)}
                    data-testid={`remove-association-${account.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="font-heading text-xl tracking-tight">Conta</CardTitle>
          <CardDescription>Gerir a sua conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Terminar Sessão</p>
              <p className="text-sm text-muted-foreground">Sair da sua conta</p>
            </div>
            <Button 
              variant="outline" 
              className="border-destructive text-destructive hover:bg-destructive hover:text-white"
              onClick={logout}
              data-testid="logout-settings-btn"
            >
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Associated Account Modal */}
      <Dialog open={showAddModal} onOpenChange={handleCloseAddModal}>
        <DialogContent className="bg-white" data-testid="add-associated-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              ASSOCIAR CONTA
            </DialogTitle>
            <DialogDescription>
              Pesquise pelo email da conta que pretende associar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="email@exemplo.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                data-testid="search-email-input"
              />
              <Button 
                onClick={handleSearchUser} 
                disabled={searching}
                data-testid="search-user-btn"
              >
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>

            {searchResult && (
              <div className="p-4 border border-primary/30 bg-primary/5 rounded-sm">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={searchResult.avatar_url} />
                    <AvatarFallback className="bg-primary text-white">
                      {getInitials(searchResult.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{searchResult.name}</p>
                    <p className="text-sm text-muted-foreground">{searchResult.email}</p>
                    <Badge variant="outline" className="mt-1">
                      {getRoleName(searchResult.role)}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseAddModal}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAssociate} 
              disabled={!searchResult || associating}
              className="btn-hover"
              data-testid="confirm-associate-btn"
            >
              {associating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A associar...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Associar Conta
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Association Confirmation */}
      <AlertDialog open={!!accountToRemove} onOpenChange={() => setAccountToRemove(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Associação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende remover a associação com a conta de {accountToRemove?.name}?
              Deixará de poder acompanhar as atividades deste atleta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleRemoveAssociation}
              data-testid="confirm-remove-association-btn"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
