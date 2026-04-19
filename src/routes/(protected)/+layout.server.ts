// (protected)/+layout.server.ts — Guard: exige usuario autenticado
// Qualquer rota dentro de (protected)/ redireciona para /login se nao autenticado
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  if (!user) redirect(303, "/login");
  return { user };
};
