// reset-password/confirm/+page.server.ts — Atualiza senha apos exchange client-side
// O exchangeCodeForSession e feito no client (+page.svelte onMount) com o browser
// supabase client, que tem acesso ao code_verifier no sessionStorage.
// A sessao ja esta estabelecida quando o form action roda.
import { fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
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

    // A sessao foi estabelecida pelo client-side exchangeCodeForSession (onMount).
    // O server client le os cookies de sessao setados pelo browser client.
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
