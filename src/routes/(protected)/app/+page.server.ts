// app/+page.server.ts — Carrega dados GTD do Supabase (user_data JSONB com RLS)
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();

  // Busca dados do usuario da tabela user_data (JSONB com RLS)
  const { data, error } = await locals.supabase
    .from("user_data")
    .select("data")
    .eq("user_id", user!.id)
    .maybeSingle();

  return {
    user,
    cloudData: error ? null : (data?.data ?? null),
  };
};

export const actions: Actions = {
  // Logout server-side (invalida cookie HttpOnly — mais seguro que client-side signOut)
  logout: async ({ locals }) => {
    await locals.supabase.auth.signOut();
    throw redirect(303, "/login");
  },
};
