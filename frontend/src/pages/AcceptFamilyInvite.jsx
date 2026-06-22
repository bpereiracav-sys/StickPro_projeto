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
        toast.error(t('familyInvite.invalidInvite'));
        return;
      }

      try {
        const response = await usersApi.getFamilyInvite(token);

        setInvite(response.data);
        
        if (response.data?.guardian_name) {
          setFormData((prev) => ({
            ...prev,
            name: response.data.guardian_name,
          }));
        }
      } catch (error) {
        toast.error(error.response?.data?.detail || t('familyInvite.invalidOrExpired'));
      } finally {
        setLoadingInvite(false);
      }
    };

    loadInvite();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error(t('familyInvite.invalidInvite'));
      return;
    }

    if (!formData.name.trim()) {
      toast.error(t('familyInvite.requiredName'));
      return;
    }

    if (formData.password.length < 6) {
      toast.error(t('familyInvite.passwordMin'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error(t('familyInvite.passwordMismatch'));
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

      toast.success(response.data.message || t('familyInvite.success'));
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('familyInvite.acceptError'));
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
            {t('familyInvite.title')}
          </h1>

          <p className="mt-2 text-sm text-emerald-50">
            {t('familyInvite.subtitle')}
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
                        {t('familyInvite.associatingWith')} {invite.player_name}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {t('familyInvite.familyRole')}: <strong>{relationshipLabel}</strong>
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        {t('familyInvite.freeAccessText')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('familyInvite.fullName')}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="{t('familyInvite.fullName')}"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('familyInvite.password')}</Label>
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
                  <Label>{t('familyInvite.confirmPassword')}</Label>
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
                    {t('familyInvite.createFreeAccount')}
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
