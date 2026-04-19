// reset-password/confirm/+page.server.ts — Atualiza senha apos email confirmation link
import { fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
  // Nao trocar o code aqui — o action faz isso para garantir sessao ativa no mesmo request
  const code = url.searchParams.get("code");
  return { code };
};

const confirmSchema = z
  .object({
    password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
    confirm: z.string().min(8, "Confirmacao deve ter pelo menos 8 caracteres"),
    code: z.string().optional(),
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
      code: formData.get("code"),
    };

    const parsed = confirmSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(400, {
        error: parsed.error.errors[0]?.message ?? "Dados invalidos",
      });
    }

    // Re-exchange code if session not yet established (Workers stateless cookies edge case)
    const code = typeof raw.code === "string" ? raw.code : null;
    if (code) {
      const { error: exchangeError } = await locals.supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        return fail(400, {
          error: "Link de recuperacao invalido ou expirado. Solicite um novo.",
        });
      }
    }

    const { error } = await locals.supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      return fail(400, {
        error: `Nao foi possivel atualizar a senha: ${error.message}`,
      });
    }

    throw redirect(303, "/login?message=password_updated");
  },
};
