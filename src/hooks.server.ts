// hooks.server.ts — Middleware auth Supabase server-side
// Roda em TODA request antes de load functions e actions
import { createServerClient } from "@supabase/ssr";
import type { Handle } from "@sveltejs/kit";

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY ?? "";

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => event.cookies.getAll(),
      setAll: (
        cookiesToSet: Array<{
          name: string;
          value: string;
          options: Record<string, unknown>;
        }>,
      ) => {
        for (const { name, value, options } of cookiesToSet) {
          event.cookies.set(name, value, {
            ...(options as Parameters<typeof event.cookies.set>[2]),
            path: "/",
          });
        }
      },
    },
  });

  event.locals.safeGetSession = async () => {
    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession();

    if (!session) {
      return { session: null, user: null };
    }

    const {
      data: { user },
      error,
    } = await event.locals.supabase.auth.getUser();

    if (error) {
      return { session: null, user: null };
    }

    return { session, user };
  };

  const { user } = await event.locals.safeGetSession();
  event.locals.user = user;

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === "content-range" || name === "x-supabase-api-version";
    },
  });
};
