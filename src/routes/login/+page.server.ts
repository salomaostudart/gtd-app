// login/+page.server.ts — Auth: login com email + senha
import { fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  if (user) redirect(303, "/app");
  return {};
};

const loginSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export const actions: Actions = {
  login: async ({ request, locals }) => {
    const formData = await request.formData();
    const raw = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(400, {
        error: parsed.error.errors[0]?.message ?? "Dados invalidos",
        email: String(raw.email ?? ""),
      });
    }

    const { email, password } = parsed.data;
    const { error } = await locals.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return fail(400, { error: "Email ou senha incorretos.", email });
    }

    redirect(303, "/app");
  },
};
