import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usersApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Loader2, Users } from 'lucide-react';

export function AcceptFamilyInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAcceptInvite = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error('Convite inválido');
      return;
    }

    if (!name || !password || !confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As palavras-passe não coincidem');
      return;
    }

    setLoading(true);

    try {
      const response = await usersApi.acceptFamilyInvite({
        token,
        name,
        password,
      });

      localStorage.setItem('token', response.data.token);

      toast.success(response.data.message || 'Convite aceite com sucesso');

      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao aceitar convite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-emerald-100 shadow-xl">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Users className="h-7 w-7" />
          </div>

          <CardTitle className="font-heading text-2xl">
            Aceitar convite familiar
          </CardTitle>

          <CardDescription>
            Crie a sua conta gratuita para acompanhar o atleta no StickPro.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleAcceptInvite} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label>Palavra-passe</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Defina a sua palavra-passe"
              />
            </div>

            <div className="space-y-2">
              <Label>Confirmar palavra-passe</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a palavra-passe"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Criar conta gratuita'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
