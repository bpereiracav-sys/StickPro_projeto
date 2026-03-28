import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Globe } from 'lucide-react';

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

const roles = [
  { value: 'jogador', label: 'Jogador' },
  { value: 'treinador', label: 'Treinador' },
  { value: 'delegado', label: 'Delegado' },
  { value: 'responsavel', label: 'Responsável/Pai' },
  { value: 'admin', label: 'Administrador de Clube' },
];

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'jogador',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { register } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const navigate = useNavigate();

  // Image carousel effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % ROLLER_HOCKEY_IMAGES.length
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const languages = [
    { code: 'pt', label: 'Português', flag: '🇵🇹' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹' },
    { code: 'en', label: 'English', flag: '🇬🇧' }
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error(t('auth.passwordMismatch') || 'As passwords não coincidem');
      return;
    }

    if (formData.password.length < 6) {
      toast.error(t('auth.passwordTooShort') || 'A password deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone || undefined
      });
      toast.success(t('auth.registerSuccess') || 'Conta criada com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || t('auth.registerError') || 'Erro ao criar conta';
      toast.error(message);
    } finally {
      setLoading(false);
    }
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

      {/* Left Panel - Image Carousel */}
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
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/40" />
        
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

      {/* Right Panel - Form */}
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
            <span className="font-heading text-2xl text-foreground tracking-tight">
              Stick<span className="text-primary">Pro</span>
            </span>
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl text-foreground tracking-tight mb-2">
            {t('auth.createAccount') || 'Criar Conta'}
          </h1>
          <p className="text-muted-foreground mb-8 text-sm sm:text-base">
            {t('auth.registerSubtitle') || 'Junte-se à plataforma de gestão de hóquei em patins'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">{t('auth.fullName') || 'Nome Completo'}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t('auth.namePlaceholder') || 'O seu nome'}
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                className="h-12"
                data-testid="register-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email') || 'Email'}</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                className="h-12"
                data-testid="register-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">{t('auth.role') || 'Função'}</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => handleChange('role', value)}
              >
                <SelectTrigger className="h-12" data-testid="register-role-select">
                  <SelectValue placeholder={t('auth.selectRole') || 'Selecione a sua função'} />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {roles.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('auth.phone') || 'Telefone'} ({t('common.optional') || 'opcional'})</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+351 900 000 000"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="h-12"
                data-testid="register-phone-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password') || 'Password'}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
                className="h-12"
                data-testid="register-password-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.confirmPassword') || 'Confirmar Password'}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                required
                className="h-12"
                data-testid="register-confirm-password-input"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 rounded-lg font-semibold transition-all duration-200 hover:scale-[1.02]"
              disabled={loading}
              data-testid="register-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.creatingAccount') || 'A criar conta...'}
                </>
              ) : (
                t('auth.createAccount') || 'Criar Conta'
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-muted-foreground">
            {t('auth.hasAccount') || 'Já tem conta?'}{' '}
            <Link 
              to="/login" 
              className="text-primary font-semibold hover:underline"
              data-testid="login-link"
            >
              {t('auth.loginHere') || 'Entrar'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
