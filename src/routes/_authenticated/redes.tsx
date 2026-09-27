import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { SignatureManager } from "@/components/SignatureManager";

export const Route = createFileRoute("/_authenticated/redes")({
  head: () => ({
    meta: [
      { title: "Redes bloqueadas | Access Monitor" },
      { name: "description", content: "Cadastro de assinaturas de redes e datacenters bloqueados." },
      { property: "og:title", content: "Redes bloqueadas | Access Monitor" },
      { property: "og:description", content: "Cadastro de assinaturas de redes e datacenters bloqueados." },
    ],
  }),
  component: () => (
    <AdminLayout
      title="Redes bloqueadas"
      description="Comparadas com ISP, organização, ASN e User-Agent de cada acesso"
    >
      <SignatureManager table="blocked_networks" action="NETWORK" />
    </AdminLayout>
  ),
});
