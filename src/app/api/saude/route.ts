import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    servico: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    resend: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
    criptografia: Boolean(process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 16),
    cron: Boolean(process.env.CRON_SECRET && process.env.CRON_SECRET.length >= 16),
  });
}
