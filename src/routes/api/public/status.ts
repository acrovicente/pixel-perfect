import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/status")({
  server: {
    handlers: {
      GET: async () => {
        let database = false;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin
            .from("bot_signatures")
            .select("id", { count: "exact", head: true });
          database = !error;
        } catch (error) {
          console.error("[status] database check failed", error);
        }
        return Response.json({
          status: database ? "ok" : "degraded",
          server_time: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
          database,
          tracker: database,
        });
      },
    },
  },
});
