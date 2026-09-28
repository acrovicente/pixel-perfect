import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/acessos")({
  head: () => ({
    meta: [
      { title: "Acessos | Access Monitor" },
      { name: "description", content: "Lista filtrável de todas as requisições registradas." },
      { property: "og:title", content: "Acessos | Access Monitor" },
      { property: "og:description", content: "Lista filtrável de todas as requisições registradas." },
    ],
  }),
  component: AcessosPage,
});

const PAGE_SIZE = 25;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Log = any;

function fmt(value: string) {
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function AcessosPage() {
  const [page, setPage] = useState(0);
  const [ip, setIp] = useState("");
  const [country, setCountry] = useState("");
  const [device, setDevice] = useState("");
  const [onlyBots, setOnlyBots] = useState<"" | "1" | "0">("");
  const [onlyBlocked, setOnlyBlocked] = useState<"" | "1" | "0">("");
  const [days, setDays] = useState("7");
  const [selected, setSelected] = useState<Log | null>(null);

  const filters = { ip, country, device, onlyBots, onlyBlocked, days, page };

  const { data, isFetching } = useQuery({
    queryKey: ["acessos", filters],
    queryFn: async () => {
      let query = supabase
        .from("access_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (days) query = query.gte("created_at", new Date(Date.now() - Number(days) * 86400000).toISOString());
      if (ip) query = query.ilike("ip", `%${ip}%`);
      if (country) query = query.ilike("country", `%${country}%`);
      if (device) query = query.eq("device_type", device);
      if (onlyBots) query = query.eq("is_bot", onlyBots === "1");
      if (onlyBlocked) query = query.eq("is_network_blocked", onlyBlocked === "1");

      const { data, count, error } = await query;
      if (error) throw error;
      return { rows: (data ?? []) as Log[], count: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;

  const selectClass =
    "h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground";

  return (
    <AdminLayout title="Acessos" description={`${total.toLocaleString("pt-BR")} registros no período`}>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="w-40" placeholder="IP" value={ip} onChange={(e) => { setPage(0); setIp(e.target.value); }} />
        <Input className="w-40" placeholder="País" value={country} onChange={(e) => { setPage(0); setCountry(e.target.value); }} />
        <select className={selectClass} value={days} onChange={(e) => { setPage(0); setDays(e.target.value); }}>
          <option value="1">Últimas 24h</option>
          <option value="7">7 dias</option>
          <option value="30">30 dias</option>
          <option value="">Tudo</option>
        </select>
        <select className={selectClass} value={device} onChange={(e) => { setPage(0); setDevice(e.target.value); }}>
          <option value="">Todos dispositivos</option>
          <option value="desktop">Desktop</option>
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
          <option value="bot">Bot</option>
          <option value="unknown">Desconhecido</option>
        </select>
        <select className={selectClass} value={onlyBots} onChange={(e) => { setPage(0); setOnlyBots(e.target.value as "" | "1" | "0"); }}>
          <option value="">Bot: todos</option>
          <option value="1">Somente bots</option>
          <option value="0">Somente usuários</option>
        </select>
        <select className={selectClass} value={onlyBlocked} onChange={(e) => { setPage(0); setOnlyBlocked(e.target.value as "" | "1" | "0"); }}>
          <option value="">Rede: todas</option>
          <option value="1">Bloqueadas</option>
          <option value="0">Permitidas</option>
        </select>
      </div>

      <div className="surface-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr className="border-b border-border">
              <th className="p-3">Data/Hora</th>
              <th className="p-3">IP</th>
              <th className="p-3">País</th>
              <th className="p-3">Cidade</th>
              <th className="p-3">ISP</th>
              <th className="p-3">Dispositivo</th>
              <th className="p-3">Status</th>
              <th className="p-3">URI</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => setSelected(row)}
                className="cursor-pointer border-b border-border/60 transition-colors hover:bg-accent"
              >
                <td className="p-3 whitespace-nowrap">{fmt(row.created_at)}</td>
                <td className="p-3 font-mono text-xs">{row.ip}</td>
                <td className="p-3">{row.country ?? "—"}</td>
                <td className="p-3">{row.city ?? "—"}</td>
                <td className="p-3 max-w-40 truncate">{row.isp ?? "—"}</td>
                <td className="p-3"><Badge variant="secondary">{row.device_type}</Badge></td>
                <td className="p-3 space-x-1 whitespace-nowrap">
                  <Badge variant={row.is_bot ? "destructive" : "secondary"}>{row.is_bot ? "BOT" : "NORMAL"}</Badge>
                  <Badge variant={row.is_network_blocked ? "destructive" : "outline"}>
                    {row.is_network_blocked ? "BLOQUEADO" : "PERMITIDO"}
                  </Badge>
                </td>
                <td className="p-3 max-w-40 truncate text-muted-foreground">{row.request_uri}</td>
              </tr>
            ))}
            {!rows.length && !isFetching ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  Nenhum acesso registrado neste filtro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>Página {page + 1} de {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={(page + 1) * PAGE_SIZE >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do acesso</DialogTitle>
          </DialogHeader>
          {selected ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["IP", selected.ip],
                ["Data/Hora", fmt(selected.created_at)],
                ["Método", selected.method],
                ["Host", selected.host],
                ["URI", selected.request_uri],
                ["Referer", selected.referer],
                ["Idioma", selected.accept_language],
                ["Dispositivo", selected.device_type],
                ["Bot", selected.is_bot ? "sim" : "não"],
                ["Assinatura do bot", selected.bot_signature],
                ["Rede bloqueada", selected.is_network_blocked ? "sim" : "não"],
                ["Assinatura da rede", selected.network_signature],
                ["País", selected.country],
                ["Estado", selected.region],
                ["Cidade", selected.city],
                ["ISP", selected.isp],
                ["Organização", selected.org],
                ["ASN", selected.asn],
                ["Latitude", selected.latitude],
                ["Longitude", selected.longitude],
                ["Resultado (is)", selected.response_is ? "true" : "false"],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
                  <dd className="break-words">{value === null || value === undefined || value === "" ? "—" : String(value)}</dd>
                </div>
              ))}
              <details className="col-span-2">
                <summary className="cursor-pointer text-xs uppercase text-muted-foreground">User-Agent completo</summary>
                <p className="mt-2 break-all font-mono text-xs">{selected.user_agent || "—"}</p>
              </details>
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
