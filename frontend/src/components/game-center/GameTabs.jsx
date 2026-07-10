import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  FileSpreadsheet,
  History,
  Home,
  LayoutGrid,
  Sparkles,
  Users,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent } from '../ui/card';

const GAME_TABS = [
  {
    id: 'summary',
    label: 'Resumo',
    icon: Home,
  },
  {
    id: 'convocation',
    label: 'Convocatória',
    icon: Users,
    staffOnly: true,
  },
  {
    id: 'lineup',
    label: 'Line-up',
    icon: LayoutGrid,
    staffOnly: true,
  },
  {
    id: 'gamesheet',
    label: 'Boletim',
    icon: FileSpreadsheet,
  },
  {
    id: 'statistics',
    label: 'Estatísticas',
    icon: ClipboardList,
  },
  {
    id: 'assistant',
    label: 'Assistente Técnico',
    icon: Sparkles,
  },
  {
    id: 'history',
    label: 'Histórico',
    icon: History,
    staffOnly: true,
  },
];

function PlaceholderTab({ title, description }) {
  return (
    <Card className="border-white/70 bg-white/90 shadow-lg shadow-slate-200/70">
      <CardContent className="py-12 text-center">
        <p className="font-heading text-xl text-slate-950">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function GameTabs({
  match,
  canSeeStaffTabs,
  summaryContent,
  gamesheetContent,
  statisticsContent,
  lineupContent,
  assistantContent,
}) {
  const initialTab = useMemo(() => {
    /*
     * Quando já existe boletim importado, a prioridade é validar
     * as estatísticas extraídas.
     */
    if (match?.gamesheet_url) {
      return 'statistics';
    }

    /*
     * Jogos terminados abrem no resumo.
     */
    if (match?.is_completed) {
      return 'summary';
    }

    /*
     * Jogos futuros abrem diretamente no Line-up para perfis
     * com acesso técnico.
     */
    if (canSeeStaffTabs) {
      return 'lineup';
    }

    return 'summary';
  }, [match?.gamesheet_url, match?.is_completed, canSeeStaffTabs]);

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, match?.id]);

  const visibleTabs = GAME_TABS.filter((tab) => {
    if (tab.staffOnly && !canSeeStaffTabs) return false;
    return true;
  });

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="space-y-6"
    >
      <TabsList className="flex h-auto flex-wrap justify-start gap-2 rounded-2xl bg-slate-100 p-2">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-xl"
            >
              <Icon className="mr-2 h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          );
        })}
      </TabsList>

      <TabsContent value="summary" className="space-y-4">
        {summaryContent}
      </TabsContent>

      {canSeeStaffTabs && (
        <TabsContent value="convocation" className="space-y-4">
          <PlaceholderTab
            title="Convocatória"
            description="Aqui serão apresentados convocados, confirmações, ausências e indisponibilidades."
          />
        </TabsContent>
      )}

      {canSeeStaffTabs && (
        <TabsContent value="lineup" className="space-y-4">
          {lineupContent || (
            <PlaceholderTab
              title="Line-up"
              description="Aqui será preparada a organização da equipa e a validação das semi-partes."
            />
          )}
        </TabsContent>
      )}

      <TabsContent value="gamesheet" className="space-y-4">
        {gamesheetContent}
      </TabsContent>

      <TabsContent value="statistics" className="space-y-4">
        {statisticsContent}
      </TabsContent>

      <TabsContent value="assistant" className="space-y-4">
        {assistantContent}
      </TabsContent>

      {canSeeStaffTabs && (
        <TabsContent value="history" className="space-y-4">
          <PlaceholderTab
            title="Histórico do jogo"
            description="Aqui ficará o registo das alterações, importações, validações e publicações."
          />
        </TabsContent>
      )}
    </Tabs>
  );
}
