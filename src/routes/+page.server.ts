// +page.server.ts — Redirect server-side para /app (elimina flash "Carregando..." do client-side onMount)
import { redirect } from "@sveltejs/kit";

export const load = () => {
  throw redirect(303, "/app");
};
