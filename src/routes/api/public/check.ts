import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

async function handle({ request }: { request: Request }) {
  const { trackRequest } = await import("@/lib/tracker.server");
  try {
    const result = await trackRequest(request);
    return new Response(
      JSON.stringify({
        is: result.is,
        ip: result.ip,
        is_bot: result.is_bot,
        is_network_blocked: result.is_network_blocked,
        device: result.device,
      }),
      { headers: CORS },
    );
  } catch (error) {
    console.error("[check] tracking failed", error);
    return new Response(JSON.stringify({ is: true, error: "tracking_unavailable" }), {
      status: 200,
      headers: CORS,
    });
  }
}

export const Route = createFileRoute("/api/public/check")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
    },
  },
});
