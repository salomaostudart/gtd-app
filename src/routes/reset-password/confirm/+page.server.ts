// reset-password/confirm/+page.server.ts — Atualiza senha apos email confirmation link
import { fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url, locals: { supabase } }) => {
  const code = url.searchParams.get("code");
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
  return {};
};

const confirmSchema = z
  .object({
    password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
    confirm: z.string().min(8, "Confirmacao deve ter pelo menos 8 caracteres"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "As senhas nao coincidem",
    path: ["confirm"],
  });

export const actions: Actions = {
  update: async ({ request, locals }) => {
    const formData = await request.formData();
    const raw = {
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    };

    const parsed = confirmSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(400, {
        error: parsed.error.errors[0]?.message ?? "Dados invalidos",
      });
    }

    const { error } = await locals.supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      return fail(400, {
        error: "Nao foi possivel atualizar a senha. Tente novamente.",
      });
    }

    throw redirect(303, "/login?message=password_updated");
  },
};
