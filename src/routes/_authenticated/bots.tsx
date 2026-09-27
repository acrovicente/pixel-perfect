import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { SignatureManager } from "@/components/SignatureManager";

export const Route = createFileRoute("/_authenticated/bots")({
  head: () => ({
    meta: [
      { title: "Bots conhecidos | Access Monitor" },
      { name: "description", content: "Cadastro de assinaturas de bots usadas na classificação." },
      { property: "og:title", content: "Bots conhecidos | Access Monitor" },
      { property: "og:description", content: "Cadastro de assinaturas de bots usadas na classificação." },
    ],
  }),
  component: () => (
    <AdminLayout
      title="Bots conhecidos"
      description="Classificação heurística baseada no User-Agent"
    >
      <SignatureManager table="bot_signatures" action="BOT" />
    </AdminLayout>
  ),
});
