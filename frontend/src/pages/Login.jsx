import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Globe } from 'lucide-react';
import ProfileSelectionModal from '../components/profile/ProfileSelectionModal';

// Custom Logo Component - Green transparent logo that adapts to themes
const CUSTOM_LOGO_URL = "https://customer-assets.emergentagent.com/job_roller-hockey-hub-1/artifacts/6xtd360b_logoVerdTransp.png";

// Roller Hockey Images for the carousel
const ROLLER_HOCKEY_IMAGES = [
  "https://cdn.record.pt/images/2023-07/img_920x518uu2023-07-19-18-35-12-2152416.jpg",
  "https://livesport-ott-images.ssl.cdn.cra.cz/r900xfq60/aaf3ecca-22c0-44d2-b20e-b36b9703ff0d.avif",
  "https://livesport-ott-images.ssl.cdn.cra.cz/r900xfq60/8aa89ff4-8251-472a-a81d-38ed67667d1e.avif",
  "https://cdn.cmjornal.pt/images/2025-09/img_1500x1000uu2025-09-01-23-30-36-2232752.jpg",
  "https://www.zerozero.pt/img/galerias/041/1339041_med_wse_euro_women_2025_portugal_x_inglaterra_quartos_de_final_.jpg.jpg",
  "https://www.zerozero.pt/img/noticias/366/imgS300I916366T20250912205951.jpg",
  "https://thumbs.web.sapo.io/?H=960&W=1920&crop=center&delay_optim=1&epic=V2%3AT9zqVHlKlfbUbr0T7kTlZehT4ibqTN8fsWJx8vO0%2Fk98XxpDjcjt7nxTUTVY0UZElnfn5Uh%2FHMmgv5gnromvL%2FKuTXYVEST9zl2fQWdUQ57iWpNk%2BJNeMxTrY%2Bpf%2FaRUuB6SKkz29vRlo%2BBL99rhXg%3D%3D&webp=1&Q=50&tv=1"
];

const StickProLogo = ({ size = 'md' }) => {
  const sizes = {
    sm: { box: 'w-16 h-16' },
    md: { box: 'w-20 h-20' },
    lg: { box: 'w-24 h-24' }
  };
  const s = sizes[size] || sizes.md;
  
  return (
    <img 
      src={CUSTOM_LOGO_URL} 
      alt="Logo" 
      className={`${s.box} object-contain`}
      data-testid="stick-pro-logo"
    />
  );
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loginResult, setLoginResult] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { login, switchProfile, isAuthenticated, loading: authLoading } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const navigate = useNavigate();

  // Image carousel effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % ROLLER_HOCKEY_IMAGES.length
      );
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const languages = [
    { code: 'pt', label: 'Português', flag: '🇵🇹' },
    { code: 'en', label: 'English', flag: '🇬🇧' }
  ];

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
      {/* Language Selector - Fixed Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-white" data-testid="language-selector">
              <Globe className="w-4 h-4" />
              {languages.find(l => l.code === language)?.flag || '🇵🇹'}
              {languages.find(l => l.code === language)?.label || 'Português'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white">
            {languages.map(lang => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`gap-2 cursor-pointer ${language === lang.code ? 'bg-primary/10' : ''}`}
                data-testid={`lang-${lang.code}`}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-12 bg-white">
        <div className="mx-auto w-full max-w-sm">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
            data-testid="back-to-home"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('auth.backToHome') || 'Voltar ao início'}
          </Link>

          <div className="flex items-center gap-2 mb-8">
            <StickProLogo size="md" />
            <span className="font-heading text-2xl text-foreground tracking-wide">
              STICK PRO
            </span>
          </div>

          <h1 className="font-heading text-4xl text-foreground tracking-wide mb-2">
            {t('auth.login') || 'ENTRAR'}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t('auth.loginSubtitle') || 'Aceda à sua conta para gerir a equipa'}
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

      {/* Right Panel - Image Carousel */}
      <div className="hidden lg:block lg:flex-1 relative overflow-hidden">
        {/* Image layers for smooth transition */}
        {ROLLER_HOCKEY_IMAGES.map((img, index) => (
          <div
            key={index}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
            style={{
              backgroundImage: `url(${img})`,
              opacity: index === currentImageIndex ? 1 : 0
            }}
          />
        ))}
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/30" />
        
        {/* Image indicators */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
          {ROLLER_HOCKEY_IMAGES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentImageIndex 
                  ? 'bg-white w-6' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Ver imagem ${index + 1}`}
            />
          ))}
        </div>
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
