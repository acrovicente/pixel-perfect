# Access Monitor

Monitor de requisições HTTP com painel administrativo.

1. **Visão geral** — classifica cada acesso (IP, User-Agent, dispositivo, bot, rede bloqueada, geolocalização) e registra. Nunca redireciona.
2. **Stack** — TanStack Start + React 19, Lovable Cloud (Postgres + Auth), Recharts.
3. **Endpoints** — `GET/POST /api/public/check` retorna `{ is, ip, is_bot, is_network_blocked, device }`; `GET /api/public/status` retorna saúde do sistema.
4. **Integração** — `fetch("https://SEU-DOMINIO/api/public/check").then(r => r.json())`.
5. **Painel** — `/painel` (dashboard), `/acessos` (filtros + detalhes), `/redes`, `/bots`.
6. **Primeiro admin** — crie a conta em `/auth` e confirme o e-mail.
7. **Detecção de bots** — heurística por User-Agent + assinaturas editáveis; nunca 100% precisa.
8. **Redes bloqueadas** — comparação com ISP/organização/ASN/User-Agent.
9. **Geolocalização** — `GEOIP_URL` (padrão ipwho.is), cache por IP de 30 dias.
10. **Privacidade** — `ANONYMIZE_IP=true` zera o último octeto; `TRUST_PROXY=false` ignora cabeçalhos de proxy.
11. **Segurança** — RLS em todas as tabelas; gravação de acessos só pelo servidor; ações de admin registradas em `admin_logs`.
