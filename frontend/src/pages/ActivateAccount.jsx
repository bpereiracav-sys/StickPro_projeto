import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

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
      setError('Token de ativação em falta.');
      return;
    }

    if (!password || password.length < 6) {
      setError('A password deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As passwords não coincidem.');
      return;
    }

    try {
      setLoading(true);

      await api.post('/auth/activate', {
        token,
        password,
      });

      setMessage('Conta ativada com sucesso. Vais ser redirecionado para o login.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          'Não foi possível ativar a conta.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Ativar conta</h1>
        <p style={styles.subtitle}>
          Define a tua password para concluir o registo na StickPro.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            placeholder="Introduz a password"
          />

          <label style={styles.label}>Confirmar password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.input}
            placeholder="Confirma a password"
          />

          {error ? <div style={styles.error}>{error}</div> : null}
          {message ? <div style={styles.success}>{message}</div> : null}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'A ativar...' : 'Ativar conta'}
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
