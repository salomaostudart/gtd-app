// signup/+page.server.ts — Auth: criacao de conta
import { fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  if (user) redirect(303, "/app");
  return {};
};

const signupSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export const actions: Actions = {
  signup: async ({ request, locals, url }) => {
    const formData = await request.formData();
    const raw = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const parsed = signupSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(400, {
        error: parsed.error.errors[0]?.message ?? "Dados invalidos",
        email: String(raw.email ?? ""),
      });
    }

    const { email, password } = parsed.data;
    const { error } = await locals.supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${url.origin}/auth/callback` },
    });

    if (error) {
      return fail(400, {
        error: "Nao foi possivel criar a conta. Tente novamente.",
        email,
      });
    }

    return { success: true };
  },
};
