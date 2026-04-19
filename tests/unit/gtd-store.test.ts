// tests/unit/gtd-store.test.ts — Smoke tests para o GTD store
// Nao usa Svelte runes (sem DOM) — testa helpers puros

import { describe, it, expect } from "vitest";

describe("GTD helpers", () => {
  it("genId gera IDs unicos", async () => {
    const { genId } = await import("../../src/lib/gtd/store.svelte");
    const id1 = genId();
    const id2 = genId();
    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe("string");
  });

  it("DEFAULT_CONTEXTS tem 7 contextos", async () => {
    const { DEFAULT_CONTEXTS } = await import("../../src/lib/gtd/store.svelte");
    expect(DEFAULT_CONTEXTS).toHaveLength(7);
    expect(DEFAULT_CONTEXTS[0]).toBe("@Escritório");
  });
});
