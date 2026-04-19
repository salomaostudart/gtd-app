// app.d.ts — SvelteKit global types GTD
import type { SupabaseClient, User } from "@supabase/supabase-js";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      safeGetSession: () => Promise<{
        session: import("@supabase/supabase-js").Session | null;
        user: User | null;
      }>;
      user: User | null;
    }

    interface PageData {
      user?: User | null;
    }

    interface Platform {
      env: Record<string, unknown>;
      context: {
        waitUntil(promise: Promise<unknown>): void;
      };
      caches: CacheStorage & { default: Cache };
    }

    interface Error {
      message: string;
      code?: string;
    }
  }
}
