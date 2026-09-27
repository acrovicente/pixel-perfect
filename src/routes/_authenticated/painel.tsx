import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Dashboard | Access Monitor" },
      { name: "description", content: "Métricas de acessos, bots, dispositivos e países." },
      { property: "og:title", content: "Dashboard | Access Monitor" },
      { property: "og:description", content: "Métricas de acessos, bots, dispositivos e países." },
    ],
  }),
  component: Dashboard,
});

interface Row {
  created_at: string;
  ip: string | null;
  is_bot: boolean;
  is_network_blocked: boolean;
  device_type: string;
  country: string | null;
  city: string | null;
}

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-panel p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value.toLocaleString("pt-BR")}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-panel p-4">
      <h2 className="mb-4 text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("access_logs")
        .select("created_at, ip, is_bot, is_network_blocked, device_type, country, city")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    refetchInterval: 30000,
  });

  const rows = data ?? [];
  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const today = rows.filter((r) => new Date(r.created_at) >= startOfDay).length;
  const last24 = rows.filter((r) => now - new Date(r.created_at).getTime() <= 86400000).length;
  const bots = rows.filter((r) => r.is_bot).length;
  const blocked = rows.filter((r) => r.is_network_blocked).length;
  const uniqueIps = new Set(rows.map((r) => r.ip)).size;
  const byDevice = (type: string) => rows.filter((r) => r.device_type === type).length;

  const hourly = Array.from({ length: 24 }, (_, i) => {
    const hour = new Date(now - (23 - i) * 3600000);
    const label = `${hour.getHours().toString().padStart(2, "0")}h`;
    const count = rows.filter((r) => {
      const t = new Date(r.created_at);
      return t.getHours() === hour.getHours() && now - t.getTime() <= 86400000;
    }).length;
    return { label, count };
  });

  const botPie = [
    { name: "Usuários", value: rows.length - bots },
    { name: "Bots", value: bots },
  ];

  const devicePie = ["desktop", "mobile", "tablet", "bot", "unknown"]
    .map((type) => ({ name: type, value: byDevice(type) }))
    .filter((d) => d.value > 0);

  const rank = (key: "country" | "city") => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const value = r[key];
      if (value) map.set(value, (map.get(value) ?? 0) + 1);
    });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  };

  return (
    <AdminLayout title="Dashboard" description="Últimos 7 dias de requisições">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando métricas…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card label="Acessos hoje" value={today} />
            <Card label="Últimas 24h" value={last24} />
            <Card label="Últimos 7 dias" value={rows.length} />
            <Card label="IPs únicos" value={uniqueIps} />
            <Card label="Bots" value={bots} />
            <Card label="Usuários normais" value={rows.length - bots} />
            <Card label="Redes bloqueadas" value={blocked} />
            <Card label="Mobile / Desktop / Tablet" value={byDevice("mobile") + byDevice("desktop") + byDevice("tablet")} />
          </div>

          <Panel title="Acessos por hora (24h)">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={hourly}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                <Line type="monotone" dataKey="count" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Bots x usuários">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={botPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                    {botPie.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                </PieChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="Dispositivos">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={devicePie} dataKey="value" nameKey="name" outerRadius={80}>
                    {devicePie.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                </PieChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="Países">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rank("country")} layout="vertical">
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={90} stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                  <Bar dataKey="value" fill="var(--chart-2)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="Cidades">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rank("city")} layout="vertical">
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={90} stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                  <Bar dataKey="value" fill="var(--chart-3)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
