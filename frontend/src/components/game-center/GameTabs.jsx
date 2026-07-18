import {
  Activity,
  BarChart3,
  ClipboardCheck,
  FileText,
  History,
  LayoutDashboard,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';
import MatchCenterPlaceholder from './MatchCenterPlaceholder';

const STAGE_INDEX = {
  draft: 0,
  convocation: 1,
  lineup: 2,
  ready: 3,
  live: 4,
  finished: 5,
  stats: 6,
  assistant: 7,
  evaluation: 8,
  feedback: 9,
  closed: 10,
};

const tabItems = [
  {
    value: 'summary',
    label: 'Resumo',
    icon: LayoutDashboard,
    staffOnly: false,
    minimumStage: 'draft',
  },
  {
    value: 'convocation',
    label: 'Convocatória',
    icon: Users,
    staffOnly: true,
    minimumStage: 'draft',
  },
  {
    value: 'lineup',
    label: 'Line-up',
    icon: ShieldCheck,
    staffOnly: true,
    minimumStage: 'convocation',
  },
  {
    value: 'live',
    label: 'Live',
    icon: Activity,
    staffOnly: true,
    minimumStage: 'ready',
  },
  {
    value: 'statistics',
    label: 'Estatísticas',
    icon: BarChart3,
    staffOnly: false,
    minimumStage: 'finished',
  },
  {
    value: 'gamesheet',
    label: 'Boletim',
    icon: ClipboardCheck,
    staffOnly: true,
    minimumStage: 'finished',
  },
  {
    value: 'assistant',
    label: 'Assistente',
    icon: Sparkles,
    staffOnly: true,
    minimumStage: 'stats',
  },
  {
    value: 'evaluation',
    label: 'Avaliação',
    icon: Star,
    staffOnly: true,
    minimumStage: 'assistant',
  },
  {
    value: 'feedback',
    label: 'Feedback',
    icon: MessageSquareText,
    staffOnly: false,
    minimumStage: 'evaluation',
  },
  {
    value: 'documents',
    label: 'Documentos',
    icon: FileText,
    staffOnly: true,
    minimumStage: 'draft',
  },
  {
    value: 'history',
    label: 'Histórico',
    icon: History,
    staffOnly: true,
  },  
];

const STAGE_LABELS = {
  draft: 'Pré-convocatória',
  convocation: 'Convocatória',
  lineup: 'Line-up',
  ready: 'Pronto para iniciar',
  live: 'Ao vivo',
  finished: 'Jogo terminado',
  stats: 'Estatísticas validadas',
  assistant: 'Assistente atualizado',
  evaluation: 'Avaliações concluídas',
  feedback: 'Feedback concluído',
  closed: 'Jogo encerrado',
};

function isTabLocked(item, currentStage) {
  const currentIndex = STAGE_INDEX[currentStage] ?? 0;
  const minimumIndex = STAGE_INDEX[item.minimumStage] ?? 0;

  return currentIndex < minimumIndex;
}

function getLockMessage(item) {
  return `Disponível após: ${
    STAGE_LABELS[item.minimumStage] || item.minimumStage
  }`;
}

export default function GameTabs({
  canSeeStaffTabs = false,
  activeTab = 'summary',
  onTabChange,
  workflow,
  summaryContent,
  lineupContent,
  liveContent,
  gamesheetContent,
  statisticsContent,
  assistantContent,
  historyContent,
}) {
  const currentStage = workflow?.stage || 'draft';

  const visibleItems = tabItems.filter(
    (item) => !item.staffOnly || canSeeStaffTabs
  );

  const handleTabChange = (value) => {
    const item = visibleItems.find(
      (tabItem) => tabItem.value === value
    );

    if (!item || isTabLocked(item, currentStage)) {
      return;
    }

    if (onTabChange) {
      onTabChange(value);
    }
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="space-y-6"
      data-testid="match-center-tabs"
    >
      <TabsList className="flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto rounded-3xl border border-slate-200/80 bg-slate-100/90 p-1.5 shadow-sm">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const locked = isTabLocked(item, currentStage);
          const lockMessage = getLockMessage(item);

          return (
            <TabsTrigger
              key={item.value}
              value={item.value}
              disabled={locked}
              title={locked ? lockMessage : item.label}
              aria-label={
                locked
                  ? `${item.label}. ${lockMessage}`
                  : item.label
              }
              className={[
                'relative shrink-0 rounded-2xl px-3 py-2.5 transition-all duration-200',
                'after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5',
                'after:scale-x-0 after:rounded-full after:bg-primary',
                'after:transition-transform',
                'data-[state=active]:bg-white',
                'data-[state=active]:text-slate-950',
                'data-[state=active]:shadow-sm',
                'data-[state=active]:after:scale-x-100',
                locked
                  ? 'cursor-not-allowed text-slate-400 opacity-65'
                  : 'text-slate-500 hover:-translate-y-0.5 hover:text-slate-800',
              ].join(' ')}
              data-testid={`match-center-tab-${item.value}`}
            >
              {locked ? (
                <LockKeyhole className="mr-2 h-3.5 w-3.5" />
              ) : (
                <Icon className="mr-2 h-4 w-4" />
              )}

              {item.label}
            </TabsTrigger>
          );
        })}
      </TabsList>

      <TabsContent value="summary" className="space-y-6">
        {summaryContent}
      </TabsContent>

      {canSeeStaffTabs && (
        <TabsContent
          value="convocation"
          className="space-y-6"
        >
          <MatchCenterPlaceholder
            icon={Users}
            title="Convocatória"
            description="A gestão completa da convocatória será integrada nesta área sem retirar o utilizador do Centro do Jogo."
            features={[
              'Atletas convocados',
              'Disponibilidade e confirmações',
              'Ausências e respetivos motivos',
              'Estado e fecho da convocatória',
            ]}
            nextSprint="Sprint 2.5B"
          />
        </TabsContent>
      )}

      {canSeeStaffTabs && (
        <TabsContent value="lineup" className="space-y-6">
          {lineupContent}
        </TabsContent>
      )}

      {canSeeStaffTabs && (
        <TabsContent value="live" className="space-y-6">
          {liveContent}
        </TabsContent>
      )}

      <TabsContent
        value="statistics"
        className="space-y-6"
      >
        {statisticsContent}
      </TabsContent>

      {canSeeStaffTabs && (
        <TabsContent
          value="gamesheet"
          className="space-y-6"
        >
          {gamesheetContent}
        </TabsContent>
      )}

      {canSeeStaffTabs && (
        <TabsContent
          value="assistant"
          className="space-y-6"
        >
          {assistantContent}
        </TabsContent>
      )}

      {canSeeStaffTabs && (
        <TabsContent
          value="evaluation"
          className="space-y-6"
        >
          <MatchCenterPlaceholder
            icon={Star}
            title="Avaliação pós-jogo"
            description="Ligação direta ao Centro de Desenvolvimento para avaliar o desempenho individual dos atletas."
            features={[
              'Critérios definidos pelo treinador',
              'Observações individuais',
              'Partilha por níveis de visibilidade',
              'Atualização do histórico de evolução',
            ]}
            nextSprint="Sprint 2.5C"
          />
        </TabsContent>
      )}

      <TabsContent value="feedback" className="space-y-6">
        <MatchCenterPlaceholder
          icon={MessageSquareText}
          title="Feedback do atleta"
          description="Área dedicada à perceção do atleta sobre o jogo e sobre o seu próprio desempenho."
          features={[
            'Perceção individual do desempenho',
            'Estado emocional após o jogo',
            'Avaliação da experiência coletiva',
            'Comentários opcionais',
          ]}
          nextSprint="Sprint 2.5C"
        />
      </TabsContent>

      {canSeeStaffTabs && (
        <TabsContent
          value="documents"
          className="space-y-6"
        >
          <MatchCenterPlaceholder
            icon={FileText}
            title="Centro documental"
            description="Documentos e conteúdos do jogo reunidos num único local."
            features={[
              'Boletim oficial',
              'Relatórios técnicos',
              'Fotografias e vídeos',
              'Outros anexos',
            ]}
            nextSprint="Sprint 2.5D"
          />
        </TabsContent>
      )}
    </Tabs>
  );
}
