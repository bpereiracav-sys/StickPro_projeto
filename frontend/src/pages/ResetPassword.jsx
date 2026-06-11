import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

const MIN_PASSWORD_LEN = 8;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = (searchParams.get('token') || '').trim();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Token presence is a hard precondition.
  const tokenMissing = !token;

  const strength = useMemo(() => {
    if (!password) return null;
    let score = 0;
    if (password.length >= MIN_PASSWORD_LEN) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  useEffect(() => {
    if (tokenMissing) {
      setError('Link inválido ou em falta.');
    }
  }, [tokenMissing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || tokenMissing) return;
    setError('');

    if (!password || password.length < MIN_PASSWORD_LEN) {
      setError(`A palavra-passe deve ter pelo menos ${MIN_PASSWORD_LEN} caracteres.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('As palavras-passe não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSubmitted(true);
      // Auto-redirect after a short pause so the user sees the success state.
      setTimeout(() => navigate('/login'), 2200);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 400) {
        setError(
          err?.response?.data?.detail ||
            'Este link já não é válido. Pede um novo email de recuperação.'
        );
      } else if (status === 422) {
        setError(`A palavra-passe deve ter pelo menos ${MIN_PASSWORD_LEN} caracteres.`);
      } else {
        setError('Não foi possível contactar o servidor. Tenta novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-10"
      data-testid="reset-password-page"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6"
          data-testid="reset-back-to-login"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao login
        </button>

        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 mb-6">
          {submitted ? (
            <CheckCircle2 className="w-6 h-6 text-white" />
          ) : (
            <KeyRound className="w-6 h-6 text-white" />
          )}
        </div>

        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          {submitted ? 'Palavra-passe atualizada' : 'Definir nova palavra-passe'}
        </h1>

        {submitted ? (
          <div data-testid="reset-success-state">
            <p className="text-sm text-slate-700 leading-relaxed mb-6">
              A tua palavra-passe foi atualizada com sucesso. Vais ser
              redirecionado para o login...
            </p>
            <Link
              to="/login"
              className="text-sm font-medium text-slate-900 hover:underline"
              data-testid="reset-go-login-link"
            >
              Ir para o login
            </Link>
          </div>
        ) : tokenMissing ? (
          <div data-testid="reset-missing-token-state">
            <p className="text-sm text-red-600 mb-6">
              O link de recuperação está em falta ou é inválido.
            </p>
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-slate-900 hover:underline"
              data-testid="reset-request-new-link"
            >
              Pedir novo link
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Escolhe uma nova palavra-passe para a tua conta Stick Pro.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password" className="text-slate-700">
                  Nova palavra-passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="mt-1.5"
                  disabled={loading}
                  data-testid="reset-password-input"
                />
                {strength !== null ? (
                  <div
                    className="mt-2 flex gap-1"
                    aria-hidden="true"
                    data-testid="reset-password-strength"
                  >
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={`h-1 flex-1 rounded ${
                          i < strength ? 'bg-slate-900' : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              <div>
                <Label htmlFor="confirm-password" className="text-slate-700">
                  Confirmar palavra-passe
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repete a palavra-passe"
                  className="mt-1.5"
                  disabled={loading}
                  data-testid="reset-confirm-password-input"
                />
              </div>

              {error ? (
                <p
                  className="text-sm text-red-600"
                  data-testid="reset-error-message"
                >
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="w-full"
                data-testid="reset-submit-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A atualizar...
                  </>
                ) : (
                  'Atualizar palavra-passe'
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
