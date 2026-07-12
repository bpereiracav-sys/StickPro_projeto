import { TabsList, TabsTrigger } from '../ui/tabs';
import {
  BarChart3,
  Settings,
  TableProperties,
  Trophy,
  Upload,
  Users,
  Volleyball,
} from 'lucide-react';

const items = [
  { value: 'summary', label: 'Resumo', icon: BarChart3 },
  { value: 'matches', label: 'Jogos', icon: Volleyball, countKey: 'matches' },
  { value: 'standings', label: 'Classificação', icon: Trophy },
  { value: 'teams', label: 'Equipas', icon: Users, countKey: 'teams' },
  { value: 'stats', label: 'Estatísticas', icon: TableProperties },
  { value: 'imports', label: 'Importações', icon: Upload },
  { value: 'settings', label: 'Configuração', icon: Settings },
];

export default function CompetitionNavigation({ matchesCount, competitionTeamsCount }) {
  const counts = {
    matches: matchesCount,
    teams: competitionTeamsCount,
  };

  return (
    <TabsList className="flex h-auto w-full flex-nowrap justify-start gap-2 overflow-x-auto rounded-2xl bg-slate-100 p-2">
      {items.map(({ value, label, icon: Icon, countKey }) => (
        <TabsTrigger
          key={value}
          value={value}
          className="shrink-0 rounded-xl px-3 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm"
        >
          <Icon className="mr-2 h-4 w-4" />
          {label}
          {countKey && <span className="ml-1">({counts[countKey]})</span>}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
