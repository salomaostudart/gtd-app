import { test, expect } from "@playwright/test";

test("pagina de login carrega e tem campos corretos", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator(".auth-logo")).toContainText("GTD");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

test("rota raiz redireciona para /app ou /login", async ({ page }) => {
  await page.goto("/");
  // Sem autenticacao deve cair em /login
  await expect(page).toHaveURL(/\/(login|app)/);
});
