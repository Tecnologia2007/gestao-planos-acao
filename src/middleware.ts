import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { acessoLiberado } from "@/dominio/acesso";
import { minutosInatividade } from "@/dominio/tempo";
import { supabaseConfigurado } from "@/lib/supabase/config";

const ATIVIDADE = "cicobi_ultima_atividade";

function copiarCookies(origem: NextResponse, destino: NextResponse) {
  origem.cookies.getAll().forEach((cookie) => {
    destino.cookies.set(cookie);
  });
  return destino;
}

function marcarAtividade(resposta: NextResponse) {
  resposta.cookies.set(ATIVIDADE, String(Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return resposta;
}

export async function middleware(request: NextRequest) {
  const caminho = request.nextUrl.pathname;
  if (caminho.startsWith("/api/cron") || caminho.startsWith("/api/saude")) {
    return NextResponse.next();
  }

  if (!supabaseConfigurado()) {
    if (caminho.startsWith("/configuracao")) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/configuracao";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const pedido = new Headers(request.headers);
  pedido.set("x-caminho", caminho);
  let resposta = NextResponse.next({ request: { headers: pedido } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          resposta = NextResponse.next({ request: { headers: pedido } });
          cookiesToSet.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const irPara = (destinoPath: string, parametros?: Record<string, string>, renovar = false) => {
    const url = request.nextUrl.clone();
    url.pathname = destinoPath;
    url.search = "";
    if (parametros) {
      for (const [chave, valor] of Object.entries(parametros)) url.searchParams.set(chave, valor);
    }
    const destino = copiarCookies(resposta, NextResponse.redirect(url));
    return renovar ? marcarAtividade(destino) : destino;
  };

  if (!user) {
    if (caminho.startsWith("/login") || caminho.startsWith("/configuracao")) return resposta;
    return irPara("/login");
  }

  const limiteMs = minutosInatividade() * 60_000;
  const atividade = Number(request.cookies.get(ATIVIDADE)?.value ?? "0");
  const agora = Date.now();
  if (atividade && agora - atividade > limiteMs) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("motivo", "inatividade");
    const redirecionamento = copiarCookies(resposta, NextResponse.redirect(url));
    redirecionamento.cookies.delete(ATIVIDADE);
    return redirecionamento;
  }

  const { data: nivel } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (nivel?.currentLevel !== "aal2") {
    const { data: fatores } = await supabase.auth.mfa.listFactors();
    const destino = (fatores?.totp?.length ?? 0) > 0 ? "/mfa/verificar" : "/mfa/ativar";
    if (!caminho.startsWith(destino)) return irPara(destino, undefined, true);
    return marcarAtividade(resposta);
  }

  if (caminho.startsWith("/mfa") || caminho.startsWith("/login")) return irPara("/", undefined, true);

  const { data: perfil } = await supabase
    .from("profiles")
    .select("papel, status_acesso, acesso_expira_em")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil || !acessoLiberado(perfil, new Date())) {
    if (!caminho.startsWith("/acesso")) return irPara("/acesso", undefined, true);
    return marcarAtividade(resposta);
  }

  if (caminho.startsWith("/acesso")) return irPara("/", undefined, true);

  if ((caminho.startsWith("/usuarios") || caminho.startsWith("/acessos")) && perfil.papel !== "admin") {
    return irPara("/", undefined, true);
  }
  if (caminho.startsWith("/trilha") && perfil.papel === "auditor") return irPara("/", undefined, true);
  if (caminho.startsWith("/auditorias/nova") && perfil.papel === "auditor") return irPara("/auditorias", undefined, true);

  return marcarAtividade(resposta);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
