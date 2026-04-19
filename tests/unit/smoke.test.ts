import { describe, expect, it } from 'vitest';

// Smoke test — verifica que o ambiente de testes funciona
describe('smoke', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });

  it('should do basic math', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle string operations', () => {
    const appName = 'GTD - Getting Things Done';
    expect(appName).toContain('GTD');
  });
});
