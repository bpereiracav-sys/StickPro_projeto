import { Link } from 'react-router-dom';
import {
  Calendar,
  ClipboardCheck,
  MessageSquare,
  Target,
  Trophy,
  ChevronRight,
} from 'lucide-react';

export default function DashboardTodayPanel({
  title = 'Hoje',
  nextEvent,
  pendingCount = 0,
  messagesCount = 0,
  role = 'jogador',
  getEventDayLink,
  formatTime,
  tr,
}) {
  const isStaff = [
    'admin',
    'gestor_desportivo',
    'treinador',
    'treinador_adjunto',
    'delegado',
  ].includes(role);

  const items = [
    nextEvent && {
      icon: Calendar,
      label: nextEvent.title || tr('calendar.event', 'Evento'),
      helper: formatTime(nextEvent.start_time),
      to: getEventDayLink(nextEvent),
    },
    isStaff && {
      icon: ClipboardCheck,
      label: tr('dashboard.pendingActions', 'Pendentes'),
      helper: `${pendingCount} ${tr('dashboard.awaitingResponse', 'a aguardar resposta')}`,
      to: '/calendar?view=agenda',
    },
    {
      icon: MessageSquare,
      label: tr('messages.title', 'Mensagens'),
      helper: `${messagesCount} ${tr('dashboard.recentCommunication', 'comunicações recentes')}`,
      to: '/messages',
    },
    !isStaff && {
      icon: Target,
      label: tr('nav.myDevelopment', 'O Meu Desenvolvimento'),
      helper: tr('dashboard.quickActions.myDevelopment', 'Ver evolução, objetivos e feedback'),
      to: '/development-center',
    },
    isStaff && {
      icon: Trophy,
      label: tr('nav.developmentCenter', 'Centro Desenvolvimento'),
      helper: tr('dashboard.quickActions.developmentCenter', 'Avaliar e acompanhar atletas'),
      to: '/development-center',
    },
  ].filter(Boolean);

  if (!items.length) return null;

  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            {title}
          </p>
          <h2 className="mt-1 font-heading text-xl font-bold text-slate-950">
            {tr('dashboard.whatToDoToday', 'O que fazer hoje')}
          </h2>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.slice(0, 4).map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={`${item.label}-${item.to}`}
              to={item.to}
              className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-primary/30 hover:bg-white hover:shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-950">
                  {item.label}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {item.helper}
                </p>
              </div>

              <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-primary" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
