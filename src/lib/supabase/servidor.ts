import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { lerConfigPublica } from "@/lib/supabase/config";

export async function criarClienteServidor() {
  const { url, anon } = lerConfigPublica();
  const cookieStore = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components não podem gravar cookie; o middleware renova a sessão.
        }
      },
    },
  });
}
