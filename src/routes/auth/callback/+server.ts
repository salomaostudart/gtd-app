// auth/callback/+server.ts — Processa email confirmation link do Supabase
import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/app";

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      throw redirect(303, next);
    }
  }

  throw redirect(303, "/login?error=auth_callback_failed");
};
