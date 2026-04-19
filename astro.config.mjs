// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  // Public env vars prefixed PUBLIC_ are available in client-side JS via import.meta.env
  // SUPABASE_URL and SUPABASE_ANON_KEY must be set as PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY
  // For local dev: create .env file (gitignored) with:
  //   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  //   PUBLIC_SUPABASE_ANON_KEY=your-anon-key
});
