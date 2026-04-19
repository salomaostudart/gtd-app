// +layout.server.ts — Root layout — disponibiliza user para todas as rotas
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  return { user };
};
