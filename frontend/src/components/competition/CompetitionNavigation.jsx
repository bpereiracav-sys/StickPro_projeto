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
  { value: 'matches', label: 'Jogos', icon: Volleyball },
  { value: 'standings', label: 'Classificação', icon: Trophy },
  { value: 'teams', label: 'Equipas', icon: Users },
  { value: 'stats', label: 'Estatísticas', icon: TableProperties },
  { value: 'imports', label: 'Importações', icon: Upload },
  { value: 'settings', label: 'Configuração', icon: Settings },
];

export default function CompetitionNavigation() {
  return (
    <TabsList className="flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto rounded-2xl border border-white/70 bg-slate-100/90 p-1.5 shadow-sm shadow-slate-200/50">
      {items.map(({ value, label, icon: Icon }) => (
        <TabsTrigger
          key={value}
          value={value}
          className="relative shrink-0 rounded-xl px-3 py-2.5 text-slate-500 transition-all after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm data-[state=active]:after:scale-x-100"
        >
          <Icon className="mr-2 h-4 w-4" />
          {label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}

