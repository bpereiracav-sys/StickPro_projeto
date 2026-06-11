import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError(t('auth.activationTokenMissing') || 'Token de ativação em falta.');
      return;
    }

    if (!password || password.length < 6) {
      setError(
        (t('auth.passwordTooShortReset') || 'A palavra-passe deve ter pelo menos {n} caracteres.').replace('{n}', 6)
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch') || 'As palavras-passe não coincidem.');
      return;
    }

    try {
      setLoading(true);

      await api.post('/auth/activate', {
        token,
        password,
      });

      setMessage(t('auth.activationSuccess') || 'Conta ativada com sucesso. Vais ser redirecionado para o login.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          t('auth.activationError') ||
          'Não foi possível ativar a conta.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page} data-testid="activate-account-page">
      <div style={styles.card}>
        <h1 style={styles.title}>{t('auth.activateButton') || 'Ativar conta'}</h1>
        <p style={styles.subtitle}>
          {t('auth.resetPasswordDescription') || 'Define a tua palavra-passe para concluir o registo.'}
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>{t('auth.password') || 'Password'}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            placeholder={(t('auth.minCharactersPlaceholder') || 'Mínimo {n} caracteres').replace('{n}', 6)}
            data-testid="activate-password-input"
          />

          <label style={styles.label}>{t('auth.confirmPasswordLabel') || 'Confirmar palavra-passe'}</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.input}
            placeholder={t('auth.repeatPasswordPlaceholder') || 'Repete a palavra-passe'}
            data-testid="activate-confirm-password-input"
          />

          {error ? <div style={styles.error} data-testid="activate-error-message">{error}</div> : null}
          {message ? <div style={styles.success} data-testid="activate-success-message">{message}</div> : null}

          <button type="submit" style={styles.button} disabled={loading} data-testid="activate-submit-button">
            {loading
              ? (t('auth.activating') || 'A ativar...')
              : (t('auth.activateButton') || 'Ativar conta')}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f7fb',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#fff',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
  },
  title: {
    margin: 0,
    marginBottom: '8px',
    fontSize: '28px',
  },
  subtitle: {
    marginTop: 0,
    marginBottom: '24px',
    color: '#666',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
  },
  input: {
    height: '44px',
    borderRadius: '10px',
    border: '1px solid #d0d7e2',
    padding: '0 12px',
    fontSize: '14px',
  },
  button: {
    marginTop: '8px',
    height: '46px',
    border: 'none',
    borderRadius: '10px',
    background: '#111827',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    color: '#b91c1c',
    background: '#fee2e2',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '14px',
  },
  success: {
    color: '#166534',
    background: '#dcfce7',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '14px',
  },
};
