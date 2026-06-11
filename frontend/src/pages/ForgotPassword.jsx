import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = (email || '').trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(t('auth.invalidEmail') || 'Introduz um email válido.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: trimmed });
      setSubmitted(true);
    } catch (err) {
      // Backend returns 200 even for unknown emails, so any error here is
      // network-level. Show a friendly message and keep the form usable.
      setError(t('auth.serverError') || 'Não foi possível contactar o servidor. Tenta novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-10"
      data-testid="forgot-password-page"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6"
          data-testid="forgot-back-to-login"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('auth.backToLogin') || 'Voltar ao login'}
        </button>

        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 mb-6">
          <Mail className="w-6 h-6 text-white" />
        </div>

        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          {t('auth.forgotPasswordTitle') || 'Recuperar palavra-passe'}
        </h1>

        {!submitted ? (
          <>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              {t('auth.forgotPasswordDescription') || 'Introduz o email associado à tua conta Stick Pro. Vamos enviar-te um link para definires uma nova palavra-passe.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-slate-700">{t('auth.email') || 'Email'}</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@clube.pt"
                  className="mt-1.5"
                  disabled={loading}
                  data-testid="forgot-email-input"
                />
              </div>

              {error ? (
                <p
                  className="text-sm text-red-600"
                  data-testid="forgot-error-message"
                >
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
                data-testid="forgot-submit-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('auth.sending') || 'A enviar...'}
                  </>
                ) : (
                  t('auth.sendResetLink') || 'Enviar link de recuperação'
                )}
              </Button>
            </form>
          </>
        ) : (
          <div data-testid="forgot-success-state">
            <p className="text-sm text-slate-700 leading-relaxed mb-4">
              {(t('auth.forgotPasswordSuccess') || 'Se existir uma conta associada a {email}, enviámos um link para redefinir a palavra-passe.').replace('{email}', email)}
            </p>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              {t('auth.checkSpam') || 'Verifica também a pasta de spam. O link expira em 1 hora.'}
            </p>
            <Link
              to="/login"
              className="text-sm font-medium text-slate-900 hover:underline"
              data-testid="forgot-back-link"
            >
              {t('auth.backToLogin') || 'Voltar ao login'}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
