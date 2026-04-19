// lib/supabase.ts — Helpers para criar clientes Supabase
// server: createServerClient (SSR, cookies, sem estado compartilhado)
// browser: createBrowserClient (client-side, localStorage)

import {
  createBrowserClient,
  createServerClient,
  isBrowser,
} from "@supabase/ssr";
import {
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
} from "$env/static/public";

// Tipo exportado para uso em componentes que precisam tipar o cliente
export type TypedSupabaseClient = ReturnType<typeof createBrowserClient>;

export function createSupabaseServerClient(
  cookies: Parameters<typeof createServerClient>[2]["cookies"],
) {
  return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies,
  });
}

export function createSupabaseBrowserClient() {
  return createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    isSingleton: isBrowser(),
  });
}
