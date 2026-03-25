import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../services/api';
import { Layout } from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Save, User } from 'lucide-react';
import { getInitials, getRoleName, getRoleColor } from '../lib/utils';

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    avatar_url: user?.avatar_url || ''
  });

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

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="settings-page">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-4xl text-foreground tracking-wide">DEFINIÇÕES</h1>
          <p className="text-muted-foreground mt-1">Gerir o seu perfil e preferências</p>
        </div>

        {/* Profile Card */}
        <Card className="border border-border mb-6">
          <CardHeader>
            <CardTitle className="font-heading text-2xl tracking-wide">PERFIL</CardTitle>
            <CardDescription>Informações da sua conta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 mb-8">
              <Avatar className="w-20 h-20 border-4 border-primary">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-heading">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div>
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
                    A guardar...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Alterações
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="font-heading text-2xl tracking-wide">CONTA</CardTitle>
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
      </div>
    </Layout>
  );
}
