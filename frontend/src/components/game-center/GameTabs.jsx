import {
  Activity,
  BarChart3,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import MatchCenterPlaceholder from './MatchCenterPlaceholder';

const tabItems = [
  { value: 'summary', label: 'Resumo', icon: LayoutDashboard, staffOnly: false },
  { value: 'convocation', label: 'Convocatória', icon: Users, staffOnly: true },
  { value: 'lineup', label: 'Line-up', icon: ShieldCheck, staffOnly: true },
  { value: 'live', label: 'Live', icon: Activity, staffOnly: true },
  { value: 'statistics', label: 'Estatísticas', icon: BarChart3, staffOnly: false },
  { value: 'gamesheet', label: 'Boletim', icon: ClipboardCheck, staffOnly: true },
  { value: 'assistant', label: 'Assistente', icon: Sparkles, staffOnly: true },
  { value: 'evaluation', label: 'Avaliação', icon: Star, staffOnly: true },
  { value: 'feedback', label: 'Feedback', icon: MessageSquareText, staffOnly: false },
  { value: 'documents', label: 'Documentos', icon: FileText, staffOnly: true },
];

export default function GameTabs({
  canSeeStaffTabs = false,
  summaryContent,
  lineupContent,
  gamesheetContent,
  statisticsContent,
  assistantContent,
}) {
  const visibleItems = tabItems.filter(
    (item) => !item.staffOnly || canSeeStaffTabs
  );

  return (
    <Tabs
      defaultValue="summary"
      className="space-y-6"
      data-testid="match-center-tabs"
    >
      <TabsList className="flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto rounded-3xl border border-slate-200/80 bg-slate-100/90 p-1.5 shadow-sm">
        {visibleItems.map(({ value, label, icon: Icon }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="relative shrink-0 rounded-2xl px-3 py-2.5 text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:text-slate-800 after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm data-[state=active]:after:scale-x-100"
            data-testid={`match-center-tab-${value}`}
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="summary" className="space-y-6">
        {summaryContent}
      </TabsContent>

      {canSeeStaffTabs && (
        <TabsContent value="convocation" className="space-y-6">
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
            nextSprint="Sprint 2.3D"
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
          <MatchCenterPlaceholder
            icon={Activity}
            title="Live Match"
            description="Cockpit operacional para registar os acontecimentos do jogo em tempo real."
            features={[
              'Golos e assistências',
              'Cartões e exclusões',
              'Substituições e time-outs',
              'Cronologia completa do encontro',
            ]}
            nextSprint="Sprint 2.3F"
          />
        </TabsContent>
      )}

      <TabsContent value="statistics" className="space-y-6">
        {statisticsContent}
      </TabsContent>

      {canSeeStaffTabs && (
        <TabsContent value="gamesheet" className="space-y-6">
          {gamesheetContent}
        </TabsContent>
      )}

      {canSeeStaffTabs && (
        <TabsContent value="assistant" className="space-y-6">
          {assistantContent}
        </TabsContent>
      )}

      {canSeeStaffTabs && (
        <TabsContent value="evaluation" className="space-y-6">
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
            nextSprint="Sprint 2.3G"
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
          nextSprint="Sprint 2.3G"
        />
      </TabsContent>

      {canSeeStaffTabs && (
        <TabsContent value="documents" className="space-y-6">
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
            nextSprint="Sprint 2.3G"
          />
        </TabsContent>
      )}
    </Tabs>
  );
}

