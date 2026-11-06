import "server-only";
import { redirect } from "next/navigation";
import { acessoLiberado, podeAdministrar, podeEscrever, type Papel } from "@/dominio/acesso";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { Perfil } from "@/tipos";

export async function exigirContexto(opcoes?: { papeis?: Papel[]; escrever?: boolean }) {
  if (!supabaseConfigurado()) redirect("/configuracao");
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfilBruto, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error || !perfilBruto) redirect("/acesso?motivo=perfil");
  const perfil = perfilBruto as Perfil;
  if (!acessoLiberado(perfil, new Date())) redirect("/acesso?motivo=aprovacao");
  if (opcoes?.papeis && !opcoes.papeis.includes(perfil.papel)) redirect("/");
  if (opcoes?.escrever && !podeEscrever(perfil)) redirect("/");

  return {
    supabase,
    user,
    perfil,
    podeEscrever: podeEscrever(perfil),
    podeAdministrar: podeAdministrar(perfil),
  };
}
