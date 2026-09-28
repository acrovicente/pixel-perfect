/**
 * Núcleo do Access Monitor: identifica IP, bot, dispositivo, rede bloqueada,
 * consulta geolocalização (com cache por IP) e grava o acesso.
 * Executa apenas no servidor.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type Device = "desktop" | "mobile" | "tablet" | "bot" | "unknown";

export interface Geo {
  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  isp: string | null;
  org: string | null;
  asn: string | null;
  latitude: number | null;
  longitude: number | null;
}

const EMPTY_GEO: Geo = {
  country: null,
  country_code: null,
  region: null,
  city: null,
  isp: null,
  org: null,
  asn: null,
  latitude: null,
  longitude: null,
};

const GEO_CACHE_DAYS = 30;

function isPrivateIp(ip: string): boolean {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith("fc") ||
    ip.startsWith("fd")
  );
}

/** Extrai o IP do visitante sem confiar cegamente em cabeçalhos do cliente. */
export function getClientIp(request: Request): string {
  const trustProxy = (process.env["TRUST_PROXY"] ?? "true") !== "false";
  const cf = request.headers.get("cf-connecting-ip");
  if (trustProxy && cf) return cf.trim();
  const xff = request.headers.get("x-forwarded-for");
  if (trustProxy && xff) {
    const first = xff.split(",")[0];
    if (first) return first.trim();
  }
  return (
    request.headers.get("x-real-ip")?.trim() ??
    request.headers.get("x-client-ip")?.trim() ??
    "0.0.0.0"
  );
}

/** Anonimiza o IP quando ANONYMIZE_IP=true (último octeto / bloco final). */
export function anonymizeIp(ip: string): string {
  if (ip.includes(":")) return ip.split(":").slice(0, 4).join(":") + "::";
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  return ip;
}

export function detectDevice(userAgent: string, isBot: boolean) {
  const ua = userAgent.toLowerCase();
  let type: Device = "unknown";
  if (isBot) {
    type = "bot";
  } else if (/ipad|tablet|playbook|silk|kindle|(android(?!.*mobile))/.test(ua)) {
    type = "tablet";
  } else if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini/.test(ua)) {
    type = "mobile";
  } else if (/windows nt|macintosh|x11|linux|cros/.test(ua)) {
    type = "desktop";
  }
  return {
    type,
    is_mobile: type === "mobile",
    is_tablet: type === "tablet",
    is_desktop: type === "desktop",
    is_bot: type === "bot",
    ua: userAgent,
  };
}

/** Classificação heurística: baseada apenas no User-Agent. */
export function detectBot(userAgent: string, signatures: string[]) {
  const ua = userAgent.toLowerCase();
  for (const signature of signatures) {
    const s = signature.toLowerCase().trim();
    if (s && ua.includes(s)) return { is_bot: true, signature: s };
  }
  if (/bot|crawler|spider|crawl|http-client|curl|wget|python-requests|okhttp/.test(ua)) {
    return { is_bot: true, signature: "generic" };
  }
  return { is_bot: false, signature: null as string | null };
}

export function detectBlockedNetwork(userAgent: string, geo: Geo, signatures: string[]) {
  const haystack = [geo.org, geo.isp, geo.asn, userAgent]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  for (const signature of signatures) {
    const s = signature.toLowerCase().trim();
    if (s && haystack.includes(s)) return { blocked: true, signature: s };
  }
  return { blocked: false, signature: null as string | null };
}

async function loadSignatures(table: "bot_signatures" | "blocked_networks"): Promise<string[]> {
  const { data } = await supabaseAdmin.from(table).select("signature").eq("active", true);
  return (data ?? []).map((row) => row.signature as string);
}

/** Geolocalização com cache por IP para não estourar limites da API externa. */
async function lookupGeo(ip: string): Promise<Geo> {
  if (!ip || ip === "0.0.0.0" || isPrivateIp(ip)) return EMPTY_GEO;

  const { data: cached } = await supabaseAdmin
    .from("ip_geo_cache")
    .select("*")
    .eq("ip", ip)
    .maybeSingle();

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at as string).getTime();
    if (age < GEO_CACHE_DAYS * 86400000) {
      return {
        country: cached.country,
        country_code: cached.country_code,
        region: cached.region,
        city: cached.city,
        isp: cached.isp,
        org: cached.org,
        asn: cached.asn,
        latitude: cached.latitude,
        longitude: cached.longitude,
      };
    }
  }

  const base = process.env["GEOIP_URL"] ?? "https://ipwho.is/";
  let geo = EMPTY_GEO;
  try {
    const res = await fetch(`${base}${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const j = (await res.json()) as any;
      if (j.success !== false) {
        geo = {
          country: j.country ?? null,
          country_code: j.country_code ?? null,
          region: j.region ?? null,
          city: j.city ?? null,
          isp: j.connection?.isp ?? null,
          org: j.connection?.org ?? null,
          asn: j.connection?.asn ? `AS${j.connection.asn}` : null,
          latitude: typeof j.latitude === "number" ? j.latitude : null,
          longitude: typeof j.longitude === "number" ? j.longitude : null,
        };
        await supabaseAdmin
          .from("ip_geo_cache")
          .upsert({ ip, ...geo, fetched_at: new Date().toISOString() });
      }
    }
  } catch {
    // Falha na geolocalização nunca deve derrubar o rastreamento.
  }
  return geo;
}

export interface TrackResult {
  ip: string;
  user_agent: string;
  device: Device;
  is_bot: boolean;
  bot_signature: string | null;
  is_network_blocked: boolean;
  network_signature: string | null;
  geo: Geo;
  is: boolean;
}

/** Classifica e registra a requisição. Nunca redireciona. */
export async function trackRequest(request: Request): Promise<TrackResult> {
  const userAgent = request.headers.get("user-agent") ?? "";
  const rawIp = getClientIp(request);
  const anonymize = (process.env["ANONYMIZE_IP"] ?? "false") === "true";

  const [botSigs, netSigs] = await Promise.all([
    loadSignatures("bot_signatures"),
    loadSignatures("blocked_networks"),
  ]);

  const bot = detectBot(userAgent, botSigs);
  const device = detectDevice(userAgent, bot.is_bot);
  const geo = await lookupGeo(rawIp);
  const network = detectBlockedNetwork(userAgent, geo, netSigs);

  const storedIp = anonymize ? anonymizeIp(rawIp) : rawIp;
  const url = new URL(request.url);
  const is = !bot.is_bot && !network.blocked;

  await supabaseAdmin.from("access_logs").insert({
    ip: storedIp,
    user_agent: userAgent,
    method: request.method,
    request_uri: url.pathname + url.search,
    referer: request.headers.get("referer"),
    host: request.headers.get("host") ?? url.host,
    accept_language: request.headers.get("accept-language"),
    device_type: device.type,
    is_bot: bot.is_bot,
    bot_signature: bot.signature,
    is_network_blocked: network.blocked,
    network_signature: network.signature,
    ...geo,
    response_is: is,
  });

  return {
    ip: storedIp,
    user_agent: userAgent,
    device: device.type,
    is_bot: bot.is_bot,
    bot_signature: bot.signature,
    is_network_blocked: network.blocked,
    network_signature: network.signature,
    geo,
    is,
  };
}
