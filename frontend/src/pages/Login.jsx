import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import ProfileSelectionModal from '../components/profile/ProfileSelectionModal';

// StickPro Logo URL
const STICKPRO_LOGO = "https://static.prod-images.emergentagent.com/jobs/d39c85da-551e-47cd-abe4-e0c16122ddb6/images/0327f0512a725879e3e9730c371dab74d12bc7910dd11250c0a4a7862d160c05.png";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loginResult, setLoginResult] = useState(null);
  const { login, switchProfile, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already authenticated (but not during profile selection)
  useEffect(() => {
    if (isAuthenticated && !authLoading && !showProfileModal && !loginResult) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, showProfileModal, loginResult, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(email, password);
      toast.success('Login efetuado com sucesso!');
      
      // Check if user has associated accounts (multiple profiles)
      const hasMultipleProfiles = result.availableProfiles && result.availableProfiles.length > 1;
      
      if (hasMultipleProfiles) {
        // Show profile selection modal
        setLoginResult(result);
        setShowProfileModal(true);
      } else {
        // Go directly to dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao fazer login';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSelect = async (profile) => {
    try {
      await switchProfile(profile);
      toast.success(`Perfil selecionado: ${profile.label || profile.user_name}`);
      navigate('/dashboard');
    } catch (error) {
      toast.error('Erro ao selecionar perfil');
    }
  };

  const handleSkipProfileSelection = () => {
    setShowProfileModal(false);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-12 bg-white">
        <div className="mx-auto w-full max-w-sm">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
            data-testid="back-to-home"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </Link>

          <div className="flex items-center gap-2 mb-8">
            <img 
              src={STICKPRO_LOGO} 
              alt="StickPro" 
              className="w-10 h-10 object-contain"
            />
            <span className="font-heading text-2xl text-foreground tracking-wide">
              STICKPRO
            </span>
          </div>

          <h1 className="font-heading text-4xl text-foreground tracking-wide mb-2">
            ENTRAR
          </h1>
          <p className="text-muted-foreground mb-8">
            Aceda à sua conta para gerir a equipa
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
                data-testid="login-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
                data-testid="login-password-input"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 btn-hover rounded-sm"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A entrar...
                </>
              ) : (
                'ENTRAR'
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-muted-foreground">
            Não tem conta?{' '}
            <Link 
              to="/register" 
              className="text-primary font-semibold hover:underline"
              data-testid="register-link"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </div>

      {/* Right Panel - Image */}
      <div className="hidden lg:block lg:flex-1 relative">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images.pexels.com/photos/30756235/pexels-photo-30756235.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)'
          }}
        />
        <div className="absolute inset-0 bg-primary/20" />
      </div>

      {/* Profile Selection Modal */}
      {loginResult && (
        <ProfileSelectionModal
          open={showProfileModal}
          onOpenChange={(open) => {
            setShowProfileModal(open);
            if (!open) handleSkipProfileSelection();
          }}
          profiles={loginResult.availableProfiles || []}
          onSelectProfile={handleProfileSelect}
          currentUser={loginResult.user}
        />
      )}
    </div>
  );
}
