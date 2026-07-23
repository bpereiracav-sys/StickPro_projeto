import { Link } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  MessageSquare,
  Target,
  Trophy,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const STAFF_ROLES = [
  'admin',
  'gestor',
  'gestor_desportivo',
  'coordenador',
  'coordenador_tecnico',
  'diretor_tecnico',
  'treinador',
  'treinador_adjunto',
  'delegado',
];

const ITEM_TONES = {
  primary: {
    icon: 'bg-primary/10 text-primary',
    border: 'hover:border-primary/30',
    arrow: 'group-hover:text-primary',
    accent: 'group-hover:bg-primary/[0.04]',
  },
  cyan: {
    icon: 'bg-cyan-50 text-cyan-700',
    border: 'hover:border-cyan-200',
    arrow: 'group-hover:text-cyan-600',
    accent: 'group-hover:bg-cyan-50/40',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-700',
    border: 'hover:border-amber-200',
    arrow: 'group-hover:text-amber-600',
    accent: 'group-hover:bg-amber-50/40',
  },
  violet: {
    icon: 'bg-violet-50 text-violet-700',
    border: 'hover:border-violet-200',
    arrow: 'group-hover:text-violet-600',
    accent: 'group-hover:bg-violet-50/40',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-700',
    border: 'hover:border-emerald-200',
    arrow: 'group-hover:text-emerald-600',
    accent: 'group-hover:bg-emerald-50/40',
  },
};

function TodayActionCard({ item }) {
  const Icon = item.icon;
  const tone = ITEM_TONES[item.tone] || ITEM_TONES.primary;

  return (
    <Link
      to={item.to}
      className={cn(
        'group relative flex min-h-[76px] items-center gap-3 overflow-hidden rounded-2xl',
        'border border-slate-200 bg-slate-50/80 p-3.5',
        'transition duration-200',
        'hover:-translate-y-0.5 hover:bg-white hover:shadow-md hover:shadow-slate-200/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'focus-visible:ring-offset-2',
        tone.border,
        tone.accent
      )}
    >
      {item.attention && (
        <span
          className="absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-500 ring-4 ring-amber-100"
          aria-label="Requer atenção"
        />
      )}

      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
          tone.icon
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-950">
          {item.label}
        </p>

        <p className="mt-0.5 truncate text-xs leading-5 text-slate-500">
          {item.helper}
        </p>
      </div>

      <ChevronRight
        className={cn(
          'h-4 w-4 shrink-0 text-slate-300 transition duration-200',
          'group-hover:translate-x-0.5',
          tone.arrow
        )}
        aria-hidden="true"
      />
    </Link>
  );
}

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
  const normalizedRole = String(role || '').toLowerCase();
  const isStaff = STAFF_ROLES.includes(normalizedRole);

  const safePendingCount = Number(pendingCount) || 0;
  const safeMessagesCount = Number(messagesCount) || 0;

  const nextEventTime = nextEvent?.start_time
    ? formatTime(nextEvent.start_time)
    : null;

  const items = [
    nextEvent
      ? {
          icon: Calendar,
          label:
            nextEvent.title ||
            tr('calendar.event', 'Próximo evento'),
          helper:
            nextEventTime ||
            tr('dashboard.eventTimeUnavailable', 'Horário por definir'),
          to:
            typeof getEventDayLink === 'function'
              ? getEventDayLink(nextEvent)
              : '/calendar',
          tone: 'cyan',
        }
      : {
          icon: CheckCircle2,
          label: tr(
            'dashboard.noEventsToday',
            'Sem eventos imediatos'
          ),
          helper: tr(
            'dashboard.checkFullCalendar',
            'Consultar o calendário completo'
          ),
          to: '/calendar',
          tone: 'emerald',
        },

    isStaff
      ? {
          icon: ClipboardCheck,
          label: tr(
            'dashboard.pendingActions',
            'Ações pendentes'
          ),
          helper:
            safePendingCount > 0
              ? `${safePendingCount} ${tr(
                  'dashboard.awaitingResponse',
                  'a aguardar resposta'
                )}`
              : tr(
                  'dashboard.noPendingActions',
                  'Não existem respostas pendentes'
                ),
          to: '/calendar?view=agenda',
          tone: safePendingCount > 0 ? 'amber' : 'emerald',
          attention: safePendingCount > 0,
        }
      : null,

    {
      icon: MessageSquare,
      label: tr('messages.title', 'Mensagens'),
      helper:
        safeMessagesCount > 0
          ? `${safeMessagesCount} ${tr(
              'dashboard.recentCommunication',
              'comunicações recentes'
            )}`
          : tr(
              'dashboard.noRecentMessages',
              'Sem comunicações recentes'
            ),
      to: '/messages',
      tone: safeMessagesCount > 0 ? 'violet' : 'primary',
      attention: safeMessagesCount > 0,
    },

    !isStaff
      ? {
          icon: Target,
          label: tr(
            'nav.myDevelopment',
            'O Meu Desenvolvimento'
          ),
          helper: tr(
            'dashboard.quickActions.myDevelopment',
            'Ver evolução, objetivos e feedback'
          ),
          to: '/development-center',
          tone: 'primary',
        }
      : {
          icon: Trophy,
          label: tr(
            'nav.developmentCenter',
            'Centro de Desenvolvimento'
          ),
          helper: tr(
            'dashboard.quickActions.developmentCenter',
            'Avaliar e acompanhar atletas'
          ),
          to: '/development-center',
          tone: 'primary',
        },
  ].filter(Boolean);

  return (
    <section
      className={cn(
        'rounded-[1.5rem] border border-slate-200/90 bg-white p-4',
        'shadow-sm shadow-slate-200/70 sm:p-5'
      )}
      aria-labelledby="dashboard-today-title"
      data-testid="dashboard-today-panel"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            {title}
          </p>

          <h2
            id="dashboard-today-title"
            className="mt-1 font-heading text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
          >
            {tr(
              'dashboard.whatToDoToday',
              'O que precisa da sua atenção'
            )}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {tr(
              'dashboard.todayPanelSubtitle',
              'Acesso rápido às principais ações do dia.'
            )}
          </p>
        </div>

        {(safePendingCount > 0 || safeMessagesCount > 0) && (
          <div className="hidden shrink-0 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 sm:flex">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            {tr('dashboard.attentionRequired', 'Atenção necessária')}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.slice(0, 4).map((item) => (
          <TodayActionCard
            key={`${item.label}-${item.to}`}
            item={item}
          />
        ))}
      </div>
    </section>
  );
}
