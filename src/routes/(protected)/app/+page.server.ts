// app/+page.server.ts — Carrega dados GTD do Supabase (user_data JSONB com RLS)
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
  // Salvar dados GTD no Supabase (upsert)
  sync: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return { error: "Nao autenticado" };

    const formData = await request.formData();
    const raw = formData.get("data");
    if (!raw) return { error: "Dados ausentes" };

    let parsed: unknown;
    try {
      parsed = JSON.parse(String(raw));
    } catch {
      return { error: "JSON invalido" };
    }

    const { error } = await locals.supabase
      .from("user_data")
      .upsert(
        {
          user_id: user.id,
          data: parsed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (error) return { error: error.message };
    return { success: true };
  },

  // Logout server-side
  logout: async ({ locals }) => {
    await locals.supabase.auth.signOut();
    return { success: true };
  },
};
