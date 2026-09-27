import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Bot, Gauge, MapPin, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Access Monitor — Monitoramento de requisições HTTP" },
      {
        name: "description",
        content:
          "Rastreie cada requisição: IP, bot, dispositivo, rede bloqueada e geolocalização, com painel de análise em tempo real.",
      },
      { property: "og:title", content: "Access Monitor — Monitoramento de requisições HTTP" },
      {
        property: "og:description",
        content:
          "Rastreie cada requisição: IP, bot, dispositivo, rede bloqueada e geolocalização, com painel de análise em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Bot, title: "Detecção de bots", text: "Assinaturas editáveis no painel, sem mexer em código." },
  { icon: ShieldAlert, title: "Redes bloqueadas", text: "Clouds e datacenters identificados por ISP, organização e ASN." },
  { icon: MapPin, title: "Geolocalização", text: "País, cidade e provedor com cache por IP." },
  { icon: Gauge, title: "Alto volume", text: "Índices e agregações preparados para muitos registros." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="hero-gradient border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-20">
          <div className="flex items-center gap-2 text-sm text-primary">
            <Activity className="size-4" /> Access Monitor
          </div>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
            Monitore e classifique cada requisição que chega à sua aplicação
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            O endpoint identifica IP, User-Agent, dispositivo, bots e redes bloqueadas, grava tudo e
            devolve um JSON simples. A decisão do que fazer continua sendo da sua aplicação.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/painel">Abrir painel</Link>
            </Button>
            <Button asChild variant="secondary">
              <a href="/api/public/status" target="_blank" rel="noreferrer">
                Ver status da API
              </a>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 py-14 md:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="surface-panel p-6">
            <f.icon className="mb-3 size-5 text-primary" />
            <h2 className="font-medium">{f.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="mb-3 text-lg font-medium">Como usar</h2>
        <pre className="surface-panel overflow-x-auto p-6 text-xs leading-relaxed text-muted-foreground">
{`GET /api/public/check

{
  "is": true,
  "ip": "191.0.0.1",
  "is_bot": false,
  "is_network_blocked": false,
  "device": "desktop"
}`}
        </pre>
      </section>
    </div>
  );
}
