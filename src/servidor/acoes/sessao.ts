"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  const jar = await cookies();
  jar.delete("cicobi_ultima_atividade");
  redirect("/login");
}
