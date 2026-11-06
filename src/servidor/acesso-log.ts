import "server-only";
import { headers } from "next/headers";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export async function registrarAcesso(acao: string, recurso?: string) {
  try {
    const cabecalhos = await headers();
    const caminho = recurso ?? cabecalhos.get("x-caminho") ?? "/";
    const ip = (cabecalhos.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ?? "";
    const agente = cabecalhos.get("user-agent") ?? "";
    const supabase = await criarClienteServidor();
    await supabase.rpc("registrar_acesso", {
      p_acao: acao,
      p_recurso: caminho,
      p_ip: ip,
      p_agente: agente,
    });
  } catch {
    // A página segue mesmo se o log falhar.
  }
}
