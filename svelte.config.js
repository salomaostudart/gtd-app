import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter(),
    // Nao pre-renderizar — app autenticado com dados dinamicos
    prerender: {
      handleMissingId: "warn",
      entries: [],
    },
  },
};

export default config;
