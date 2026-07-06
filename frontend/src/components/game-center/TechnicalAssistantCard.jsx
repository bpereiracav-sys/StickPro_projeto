import { AlertTriangle, Award, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

export default function TechnicalAssistantCard({
  assistant,
  canEdit,
  onRegenerate,
  onPublish,
  loading,
}) {
  if (!assistant) return null;

  return (
    <Card className="border-cyan-100 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <Badge className="mb-2 bg-cyan-500">
            Assistente Técnico
          </Badge>

          <CardTitle className="text-xl">
            Resumo automático do jogo
          </CardTitle>

          <p className="mt-2 text-sm text-muted-foreground">
            Versão {assistant.version}
          </p>
        </div>

        <Sparkles className="h-7 w-7 text-cyan-600" />
      </CardHeader>

      <CardContent className="space-y-6">

        <div>

          <h3 className="font-semibold mb-2">
            Resumo
          </h3>

          <p className="text-sm">
            {assistant.summary?.outcome || "Resumo indisponível"}
          </p>

          {assistant.summary?.result && (
            <p className="mt-1 text-muted-foreground">
              Resultado: {assistant.summary.result}
            </p>
          )}

        </div>

        {assistant.highlights?.length > 0 && (

          <div>

            <h3 className="mb-2 flex items-center gap-2 font-semibold">

              <Award className="h-4 w-4" />

              Destaques

            </h3>

            <div className="space-y-2">

              {assistant.highlights.map((item, index) => (

                <div
                  key={index}
                  className="rounded-lg border bg-muted/30 p-3"
                >

                  <p className="font-medium">
                    {item.title}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {item.text}
                  </p>

                </div>

              ))}

            </div>

          </div>

        )}

        {assistant.alerts?.length > 0 && (

          <div>

            <h3 className="mb-2 flex items-center gap-2 font-semibold">

              <AlertTriangle className="h-4 w-4 text-amber-500" />

              Alertas

            </h3>

            <div className="space-y-2">

              {assistant.alerts.map((item, index) => (

                <div
                  key={index}
                  className="rounded-lg border border-amber-200 bg-amber-50 p-3"
                >

                  <p className="text-sm">
                    {item.text}
                  </p>

                </div>

              ))}

            </div>

          </div>

        )}

        {assistant.development_notes?.length > 0 && (

          <div>

            <h3 className="mb-2 flex items-center gap-2 font-semibold">

              <ShieldCheck className="h-4 w-4 text-emerald-500" />

              Desenvolvimento

            </h3>

            {assistant.development_notes.map((item, index) => (

              <div
                key={index}
                className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"
              >

                <p className="text-sm">
                  {item.text}
                </p>

              </div>

            ))}

          </div>

        )}

        {canEdit && (

          <div className="flex gap-3">

            <Button
              variant="outline"
              onClick={onRegenerate}
              disabled={loading}
            >

              <RefreshCw className="mr-2 h-4 w-4" />

              Recalcular

            </Button>

            <Button
              onClick={onPublish}
              disabled={loading}
            >

              Publicar

            </Button>

          </div>

        )}

      </CardContent>
    </Card>
  );
}
