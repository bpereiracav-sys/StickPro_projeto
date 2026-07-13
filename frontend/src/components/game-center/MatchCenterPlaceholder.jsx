import { Badge } from '../ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { CheckCircle2, Clock3 } from 'lucide-react';

export default function MatchCenterPlaceholder({
  icon: Icon,
  title,
  description,
  features = [],
  nextSprint,
}) {
  return (
    <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-cyan-50/50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>

            <div>
              <CardTitle className="font-heading text-xl font-semibold tracking-tight text-slate-950">
                {title}
              </CardTitle>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                {description}
              </p>
            </div>
          </div>

          {nextSprint && (
            <Badge
              variant="outline"
              className="w-fit border-amber-200 bg-amber-50 text-amber-700"
            >
              <Clock3 className="mr-1.5 h-3.5 w-3.5" />
              {nextSprint}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </span>

              <span className="text-sm font-medium text-slate-700">
                {feature}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/50 px-4 py-4">
          <p className="text-sm leading-6 text-cyan-900">
            A arquitetura deste módulo já está integrada no Centro do Jogo.
            A funcionalidade será ativada progressivamente, preservando os
            dados e os fluxos atualmente em produção.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
