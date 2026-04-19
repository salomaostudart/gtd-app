// reset-password/+page.server.ts — Pagina de recuperacao de senha
// O resetPasswordForEmail e feito client-side (+page.svelte) para que
// o code_verifier PKCE seja armazenado no sessionStorage do browser.
// Server action removida — a pagina usa client-side supabase diretamente.
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  return {};
};
