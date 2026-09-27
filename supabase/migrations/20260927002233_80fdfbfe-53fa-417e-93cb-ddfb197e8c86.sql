CREATE TABLE public.access_logs (
  id BIGSERIAL PRIMARY KEY,
  ip TEXT,
  user_agent TEXT,
  method TEXT,
  request_uri TEXT,
  referer TEXT,
  host TEXT,
  accept_language TEXT,
  device_type TEXT NOT NULL DEFAULT 'unknown',
  is_bot BOOLEAN NOT NULL DEFAULT false,
  bot_signature TEXT,
  is_network_blocked BOOLEAN NOT NULL DEFAULT false,
  network_signature TEXT,
  country TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  isp TEXT,
  org TEXT,
  asn TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  response_is BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_access_logs_ip ON public.access_logs (ip);
CREATE INDEX idx_access_logs_created_at ON public.access_logs (created_at DESC);
CREATE INDEX idx_access_logs_is_bot ON public.access_logs (is_bot);
CREATE INDEX idx_access_logs_blocked ON public.access_logs (is_network_blocked);
CREATE INDEX idx_access_logs_device ON public.access_logs (device_type);
CREATE INDEX idx_access_logs_country_code ON public.access_logs (country_code);
GRANT SELECT ON public.access_logs TO authenticated;
GRANT ALL ON public.access_logs TO service_role;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can read access logs" ON public.access_logs FOR SELECT TO authenticated USING (true);

CREATE TABLE public.blocked_networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_networks TO authenticated;
GRANT ALL ON public.blocked_networks TO service_role;
ALTER TABLE public.blocked_networks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users manage blocked networks" ON public.blocked_networks FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.bot_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_signatures TO authenticated;
GRANT ALL ON public.bot_signatures TO service_role;
ALTER TABLE public.bot_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users manage bot signatures" ON public.bot_signatures FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.ip_geo_cache (
  ip TEXT PRIMARY KEY,
  country TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  isp TEXT,
  org TEXT,
  asn TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ip_geo_cache TO authenticated;
GRANT ALL ON public.ip_geo_cache TO service_role;
ALTER TABLE public.ip_geo_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can read geo cache" ON public.ip_geo_cache FOR SELECT TO authenticated USING (true);

CREATE TABLE public.admin_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID,
  action TEXT NOT NULL,
  details TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_logs_created_at ON public.admin_logs (created_at DESC);
GRANT SELECT, INSERT ON public.admin_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.admin_logs_id_seq TO authenticated;
GRANT ALL ON public.admin_logs TO service_role;
GRANT ALL ON SEQUENCE public.admin_logs_id_seq TO service_role;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read admin logs" ON public.admin_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in users write admin logs" ON public.admin_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = admin_id);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER trg_blocked_networks_updated BEFORE UPDATE ON public.blocked_networks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_bot_signatures_updated BEFORE UPDATE ON public.bot_signatures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.bot_signatures (signature, description) VALUES
('googlebot','Google'),('bingbot','Microsoft Bing'),('slurp','Yahoo'),('duckduckbot','DuckDuckGo'),
('baiduspider','Baidu'),('yandex','Yandex'),('sogou','Sogou'),('exabot','Exalead'),('facebot','Facebook'),
('ia_archiver','Alexa/Archive'),('mj12bot','Majestic'),('healthbot','Health check'),('semrushbot','SEMrush'),
('ahrefsbot','Ahrefs'),('twitterbot','Twitter/X'),('applebot','Apple'),('petalbot','Petal'),('linkedinbot','LinkedIn');

INSERT INTO public.blocked_networks (signature, description) VALUES
('google llc','Google Cloud'),('amazon','AWS'),('microsoft','Azure/Microsoft'),('ovh','OVH'),
('digitalocean','DigitalOcean'),('hetzner','Hetzner'),('contabo','Contabo'),('linode','Linode'),
('vultr','Vultr'),('azure','Azure'),('upcloud','UpCloud'),('leaseweb','Leaseweb'),('choopa','Choopa'),
('cloudflare','Cloudflare'),('psychz networks','Psychz Networks');