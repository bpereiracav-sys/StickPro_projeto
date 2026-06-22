import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { usersApi } from '../services/api';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, Users } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const inviteTranslations = {
  pt: {
    title: 'Convite StickPro',
    subtitle: 'Foi convidado para acompanhar um atleta na plataforma.',
    associatingWith: 'Está a associar-se à conta de',
    familyRole: 'Função familiar',
    freeAccessText:
      'Este acesso é gratuito e permite acompanhar calendário, convocatórias, presenças, avaliações e comunicações associadas ao atleta.',
    fullName: 'Nome completo',
    password: 'Palavra-passe',
    confirmPassword: 'Confirmar palavra-passe',
    createFreeAccount: 'Criar conta gratuita',
    invalidInvite: 'Convite inválido',
    invalidOrExpired: 'Convite inválido ou expirado',
    requiredName: 'Indique o seu nome completo',
    passwordMin: 'A palavra-passe deve ter pelo menos 6 caracteres',
    passwordMismatch: 'As palavras-passe não coincidem',
    acceptError: 'Erro ao aceitar convite',
    success: 'Convite aceite com sucesso',
    relationship: {
      pai: 'Pai',
      mae: 'Mãe',
      avo: 'Avô',
      ava: 'Avó',
      tutor: 'Tutor',
      outro: 'Familiar',
    },
  },
  en: {
    title: 'StickPro Invitation',
    subtitle: 'You have been invited to follow an athlete on the platform.',
    associatingWith: 'You are linking your account to',
    familyRole: 'Family role',
    freeAccessText:
      'This access is free and allows you to follow the calendar, call-ups, attendance, evaluations and communications related to the athlete.',
    fullName: 'Full name',
    password: 'Password',
    confirmPassword: 'Confirm password',
    createFreeAccount: 'Create free account',
    invalidInvite: 'Invalid invitation',
    invalidOrExpired: 'Invalid or expired invitation',
    requiredName: 'Please enter your full name',
    passwordMin: 'The password must be at least 6 characters long',
    passwordMismatch: 'Passwords do not match',
    acceptError: 'Error accepting invitation',
    success: 'Invitation accepted successfully',
    relationship: {
      pai: 'Father',
      mae: 'Mother',
      avo: 'Grandfather',
      ava: 'Grandmother',
      tutor: 'Guardian',
      outro: 'Family member',
    },
  },
  es: {
    title: 'Invitación StickPro',
    subtitle: 'Ha sido invitado a seguir a un atleta en la plataforma.',
    associatingWith: 'Se está asociando a la cuenta de',
    familyRole: 'Función familiar',
    freeAccessText:
      'Este acceso es gratuito y permite seguir el calendario, convocatorias, asistencias, evaluaciones y comunicaciones relacionadas con el atleta.',
    fullName: 'Nombre completo',
    password: 'Contraseña',
    confirmPassword: 'Confirmar contraseña',
    createFreeAccount: 'Crear cuenta gratuita',
    invalidInvite: 'Invitación inválida',
    invalidOrExpired: 'Invitación inválida o caducada',
    requiredName: 'Indique su nombre completo',
    passwordMin: 'La contraseña debe tener al menos 6 caracteres',
    passwordMismatch: 'Las contraseñas no coinciden',
    acceptError: 'Error al aceptar la invitación',
    success: 'Invitación aceptada correctamente',
    relationship: {
      pai: 'Padre',
      mae: 'Madre',
      avo: 'Abuelo',
      ava: 'Abuela',
      tutor: 'Tutor',
      outro: 'Familiar',
    },
  },
  fr: {
    title: 'Invitation StickPro',
    subtitle: 'Vous avez été invité à suivre un athlète sur la plateforme.',
    associatingWith: 'Vous associez votre compte à celui de',
    familyRole: 'Rôle familial',
    freeAccessText:
      'Cet accès est gratuit et permet de suivre le calendrier, les convocations, les présences, les évaluations et les communications liées à l’athlète.',
    fullName: 'Nom complet',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    createFreeAccount: 'Créer un compte gratuit',
    invalidInvite: 'Invitation invalide',
    invalidOrExpired: 'Invitation invalide ou expirée',
    requiredName: 'Veuillez indiquer votre nom complet',
    passwordMin: 'Le mot de passe doit contenir au moins 6 caractères',
    passwordMismatch: 'Les mots de passe ne correspondent pas',
    acceptError: 'Erreur lors de l’acceptation de l’invitation',
    success: 'Invitation acceptée avec succès',
    relationship: {
      pai: 'Père',
      mae: 'Mère',
      avo: 'Grand-père',
      ava: 'Grand-mère',
      tutor: 'Tuteur',
      outro: 'Membre de la famille',
    },
  },
  it: {
    title: 'Invito StickPro',
    subtitle: 'Sei stato invitato a seguire un atleta sulla piattaforma.',
    associatingWith: 'Stai associando il tuo account a',
    familyRole: 'Ruolo familiare',
    freeAccessText:
      'Questo accesso è gratuito e consente di seguire calendario, convocazioni, presenze, valutazioni e comunicazioni relative all’atleta.',
    fullName: 'Nome completo',
    password: 'Password',
    confirmPassword: 'Conferma password',
    createFreeAccount: 'Crea account gratuito',
    invalidInvite: 'Invito non valido',
    invalidOrExpired: 'Invito non valido o scaduto',
    requiredName: 'Inserisci il tuo nome completo',
    passwordMin: 'La password deve contenere almeno 6 caratteri',
    passwordMismatch: 'Le password non coincidono',
    acceptError: 'Errore durante l’accettazione dell’invito',
    success: 'Invito accettato con successo',
    relationship: {
      pai: 'Padre',
      mae: 'Madre',
      avo: 'Nonno',
      ava: 'Nonna',
      tutor: 'Tutore',
      outro: 'Familiare',
    },
  },
};

export default function AcceptFamilyInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const { t } = useLanguage();

  const inviteLanguage = invite?.language || 'pt';
  const inviteText = inviteTranslations[inviteLanguage] || inviteTranslations.pt;
  
  const tr = (key, fallback) => {
    const parts = key.replace('familyInvite.', '').split('.');
    let value = inviteText;
  
    for (const part of parts) {
      value = value?.[part];
    }
  
    if (typeof value === 'string') return value;
  
    const globalValue = t(key);
    return globalValue && globalValue !== key ? globalValue : fallback;
  };
  
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

  const relationshipLabel = invite?.relationship
    ? tr(
        `familyInvite.relationship.${invite.relationship}`,
        invite.relationship
      )
    : tr('familyInvite.relationship.outro', 'Familiar');

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
                    tr('familyInvite.createFreeAccount', 'Criar conta gratuita')
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
