import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { 
  Users, 
  Calendar, 
  BarChart3, 
  MessageSquare, 
  ClipboardCheck,
  ChevronRight,
  Shield,
  Zap
} from 'lucide-react';

// Custom Logo Component - Green transparent logo that adapts to themes
const CUSTOM_LOGO_URL = "https://customer-assets.emergentagent.com/job_roller-hockey-hub-1/artifacts/6xtd360b_logoVerdTransp.png";

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

const features = [
  {
    icon: Users,
    title: 'GESTÃO DE EQUIPAS',
    description: 'Organize jogadores, treinadores e delegados. Controle total do plantel.'
  },
  {
    icon: Calendar,
    title: 'CALENDÁRIO',
    description: 'Jogos e treinos num só lugar. Sincronize com a sua equipa.'
  },
  {
    icon: ClipboardCheck,
    title: 'CONVOCATÓRIAS',
    description: 'Convoque jogadores e receba confirmações em tempo real.'
  },
  {
    icon: BarChart3,
    title: 'ESTATÍSTICAS',
    description: 'Golos, assistências, cartões. Acompanhe o desempenho da equipa.'
  },
  {
    icon: MessageSquare,
    title: 'COMUNICAÇÃO',
    description: 'Chat integrado para coordenar treinos e jogos com toda a equipa.'
  },
  {
    icon: Shield,
    title: 'CONTROLO DE ACESSO',
    description: 'Diferentes permissões para admins, treinadores, delegados e jogadores.'
  }
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[90vh] min-h-[600px] flex items-center">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images.pexels.com/photos/9708237/pexels-photo-9708237.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)'
          }}
        />
        <div className="hero-overlay absolute inset-0" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-3xl">
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl text-white tracking-wide leading-none mb-6 animate-fade-in-up">
              A PLATAFORMA DE GESTÃO PARA HÓQUEI EM PATINS
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 mb-8 max-w-xl animate-fade-in-up stagger-1">
              Simplifique a gestão da sua equipa. Calendário, convocatórias, estatísticas e comunicação num único lugar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up stagger-2">
              <Button 
                asChild 
                size="lg" 
                className="btn-hover text-lg px-8 py-6 rounded-sm"
                data-testid="hero-get-started-btn"
              >
                <Link to="/register">
                  COMEÇAR AGORA
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button 
                asChild 
                variant="outline" 
                size="lg"
                className="btn-hover text-lg px-8 py-6 rounded-sm border-white text-white hover:bg-white hover:text-slate-900"
                data-testid="hero-login-btn"
              >
                <Link to="/login">
                  JÁ TENHO CONTA
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-8 h-12 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-white/70 rounded-full" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-surface tactical-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading text-4xl sm:text-5xl text-foreground tracking-wide mb-4">
              TUDO O QUE PRECISA
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ferramentas profissionais para gerir a sua equipa de hóquei em patins
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={feature.title}
                  className={`bg-white border border-border p-8 card-hover animate-fade-in-up stagger-${index + 1}`}
                  data-testid={`feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-sm flex items-center justify-center mb-6">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-heading text-2xl text-foreground tracking-wide mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Zap className="w-16 h-16 text-white/80 mx-auto mb-6" />
          <h2 className="font-heading text-4xl sm:text-5xl text-white tracking-wide mb-6">
            PRONTO PARA COMEÇAR?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Registe a sua equipa gratuitamente e comece a gerir tudo num único lugar.
          </p>
          <Button 
            asChild 
            size="lg"
            variant="secondary"
            className="btn-hover text-lg px-10 py-6 rounded-sm bg-white text-primary hover:bg-slate-100"
            data-testid="cta-register-btn"
          >
            <Link to="/register">
              CRIAR CONTA GRÁTIS
              <ChevronRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <StickProLogo size="sm" />
              <span className="font-heading text-xl text-white tracking-wide">
                STICK PRO
              </span>
            </div>
            <p className="text-sm">
              © 2025 Stick Pro. Feito para equipas de hóquei em patins.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
