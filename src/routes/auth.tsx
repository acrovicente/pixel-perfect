import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | Access Monitor" },
      {
        name: "description",
        content: "Acesso restrito ao painel de monitoramento de requisições Access Monitor.",
      },
      { property: "og:title", content: "Entrar | Access Monitor" },
      {
        property: "og:description",
        content: "Acesso restrito ao painel de monitoramento de requisições Access Monitor.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel", replace: true });
    });
  }, [navigate]);

  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function translate(error: unknown): string {
    const e = error as { code?: string; message?: string };
    if (e?.code === "email_not_confirmed")
      return "Seu e-mail ainda não foi confirmado. Abra o link enviado para sua caixa de entrada (veja também o spam).";
    if (e?.code === "invalid_credentials") return "E-mail ou senha incorretos.";
    if (e?.code === "over_email_send_rate_limit")
      return "Muitas tentativas. Aguarde um minuto antes de tentar de novo.";
    if (e?.code === "user_already_exists")
      return "Esta conta já existe. Use 'Já tenho conta' para entrar.";
    return e?.message ?? "Não foi possível continuar.";
  }

  async function resend() {
    setNotice(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin + "/painel" },
    });
    setNotice(
      error
        ? { kind: "error", text: translate(error) }
        : { kind: "ok", text: "E-mail de confirmação reenviado. Verifique sua caixa de entrada." },
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/painel", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/painel" },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/painel", replace: true });
        else
          setNotice({
            kind: "ok",
            text: "Conta criada! Enviamos um link de confirmação para seu e-mail. Clique nele e depois entre aqui.",
          });
      }
    } catch (error) {
      setNotice({ kind: "error", text: translate(error) });
      toast.error(translate(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 hero-gradient">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5 surface-panel p-8">
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-primary" />
          <span className="font-semibold">Access Monitor</span>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </div>
        {notice ? (
          <div
            role="status"
            className={`rounded-md border p-3 text-sm ${
              notice.kind === "ok"
                ? "border-primary/40 bg-primary/10 text-foreground"
                : "border-destructive/50 bg-destructive/10 text-destructive"
            }`}
          >
            {notice.text}
            {email ? (
              <button type="button" onClick={resend} className="mt-2 block text-xs underline">
                Reenviar e-mail de confirmação
              </button>
            ) : null}
          </div>
        ) : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
        </Button>
        <button
          type="button"
          className="w-full text-xs text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Criar o primeiro administrador" : "Já tenho conta"}
        </button>
      </form>
    </div>
  );
}
