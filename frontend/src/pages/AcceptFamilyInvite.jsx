import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { usersApi } from '../services/api';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, Users } from 'lucide-react';

const relationshipLabels = {
  pai: 'Pai',
  mae: 'Mãe',
  avo: 'Avô',
  ava: 'Avó',
  tutor: 'Tutor',
  outro: 'Familiar',
};

export default function AcceptFamilyInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [invite, setInvite] = useState(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const loadInvite = async () => {
      if (!token) {
        setLoadingInvite(false);
        toast.error('Convite inválido');
        return;
      }

      try {
        const response = await usersApi.getFamilyInvite(token);
        setInvite(response.data);
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Convite inválido ou expirado');
      } finally {
        setLoadingInvite(false);
      }
    };

    loadInvite();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error('Convite inválido');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Indique o seu nome completo');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('A palavra-passe deve ter pelo menos 6 caracteres');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('As palavras-passe não coincidem');
      return;
    }

    try {
      setSubmitting(true);

      const response = await usersApi.acceptFamilyInvite({
        token,
        name: formData.name.trim(),
        password: formData.password,
      });

      localStorage.setItem('token', response.data.token);

      toast.success(response.data.message || 'Convite aceite com sucesso');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao aceitar convite');
    } finally {
      setSubmitting(false);
    }
  };

  const relationshipLabel =
    relationshipLabels[invite?.relationship] || invite?.relationship || 'Familiar';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg overflow-hidden border-0 bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-950 px-8 py-8 text-center text-white">
          <img
            src="/stickpro-logo.png"
            alt="StickPro"
            className="mx-auto mb-5 h-16 w-auto object-contain"
          />

          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
            <Users className="h-6 w-6" />
          </div>

          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Convite StickPro
          </h1>

          <p className="mt-2 text-sm text-emerald-50">
            Foi convidado para acompanhar um atleta na plataforma.
          </p>
        </div>

        <CardContent className="space-y-6 p-8">
          {loadingInvite ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
            </div>
          ) : (
            <>
              {invite && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-emerald-100 p-2 text-emerald-700">
                      <ShieldCheck className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="font-semibold text-slate-950">
                        Está a associar-se à conta de {invite.player_name}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Função familiar: <strong>{relationshipLabel}</strong>
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        Este acesso é gratuito e permite acompanhar calendário,
                        convocatórias, presenças, avaliações e comunicações
                        associadas ao atleta.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome completo</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Palavra-passe</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, password: e.target.value }))
                    }
                    placeholder="Defina a sua palavra-passe"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Confirmar palavra-passe</Label>
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="Confirme a palavra-passe"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-emerald-700 hover:bg-emerald-800"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Criar conta gratuita'
                  )}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
