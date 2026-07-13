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
    <TabsList className="flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto rounded-3xl border border-slate-200/80 bg-slate-100/90 p-1.5 shadow-sm">
      {items.map(({ value, label, icon: Icon }) => (
        <TabsTrigger
          key={value}
          value={value}
          className="relative shrink-0 rounded-2xl px-3 py-2.5 text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:text-slate-800 after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm data-[state=active]:after:scale-x-100"
        >
          <Icon className="mr-2 h-4 w-4" />
          {label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
