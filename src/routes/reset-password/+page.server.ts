// reset-password/+page.server.ts — Auth: reset de senha via email
import { fail } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  return {};
};

const resetSchema = z.object({
  email: z.string().email("Email invalido"),
});

export const actions: Actions = {
  reset: async ({ request, locals, url }) => {
    const formData = await request.formData();
    const raw = { email: formData.get("email") };

    const parsed = resetSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(400, {
        error: parsed.error.errors[0]?.message ?? "Email invalido",
        email: String(raw.email ?? ""),
      });
    }

    const { email } = parsed.data;
    const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${url.origin}/reset-password/confirm`,
    });

    if (error) {
      return fail(400, {
        error: "Nao foi possivel enviar o email. Tente novamente.",
        email,
      });
    }

    return { success: true };
  },
};
