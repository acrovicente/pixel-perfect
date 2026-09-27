import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

type Table = "blocked_networks" | "bot_signatures";

interface Row {
  id: string;
  signature: string;
  description: string | null;
  active: boolean;
  created_at: string;
}

export function SignatureManager({ table, action }: { table: Table; action: string }) {
  const queryClient = useQueryClient();
  const [signature, setSignature] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");

  const { data } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("signature", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  async function logAction(details: string, verb: string) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.from("admin_logs").insert({
      admin_id: auth.user.id,
      action: `${verb}_${action}`,
      details,
    });
  }

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from(table)
        .insert({ signature: signature.trim().toLowerCase(), description: description.trim() || null });
      if (error) throw error;
      await logAction(signature, "ADD");
    },
    onSuccess: () => {
      setSignature("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success("Assinatura cadastrada.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggle = useMutation({
    mutationFn: async (row: Row) => {
      const { error } = await supabase.from(table).update({ active: !row.active }).eq("id", row.id);
      if (error) throw error;
      await logAction(row.signature, "UPDATE");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [table] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (row: Row) => {
      const { error } = await supabase.from(table).delete().eq("id", row.id);
      if (error) throw error;
      await logAction(row.signature, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success("Assinatura removida.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = (data ?? []).filter((row) =>
    row.signature.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (signature.trim()) add.mutate();
        }}
      >
        <Input
          className="w-52"
          placeholder="Assinatura (ex.: digitalocean)"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
        />
        <Input
          className="w-52"
          placeholder="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button type="submit" disabled={add.isPending}>
          Adicionar
        </Button>
        <Input
          className="ml-auto w-52"
          placeholder="Pesquisar"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>

      <div className="surface-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr className="border-b border-border">
              <th className="p-3">Assinatura</th>
              <th className="p-3">Descrição</th>
              <th className="p-3">Status</th>
              <th className="p-3">Criada em</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60">
                <td className="p-3 font-mono text-xs">{row.signature}</td>
                <td className="p-3 text-muted-foreground">{row.description ?? "—"}</td>
                <td className="p-3">
                  <Badge variant={row.active ? "secondary" : "outline"}>
                    {row.active ? "ATIVA" : "INATIVA"}
                  </Badge>
                </td>
                <td className="p-3 whitespace-nowrap text-muted-foreground">
                  {new Date(row.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <Switch checked={row.active} onCheckedChange={() => toggle.mutate(row)} />
                    <Button variant="ghost" size="sm" onClick={() => remove.mutate(row)}>
                      Excluir
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
