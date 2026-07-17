import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, destination = "/brands/champion") {
  await page.goto(destination);
  await expect(page).toHaveURL(/\/access\?/);
  await page.getByLabel("Customer password").fill("champ1");
  await page.getByRole("button", { name: "Open resource library" }).click();
  await expect(page).toHaveURL(destination);
}

async function expectNoSeriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

test("customer access protects and restores the requested brand page", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { level: 1, name: "Champion" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Brand navigation" })).toBeVisible();
});

test("brand navigation and sign-out complete the customer journey", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("link", { name: "Inline catalogs" })).toHaveAttribute("aria-current", "location");
  await page.getByRole("link", { name: "Art library" }).click();
  await expect(page.getByRole("link", { name: "Art library" })).toHaveAttribute("aria-current", "location");
  await page.getByRole("link", { name: "Under Armour" }).click();
  await expect(page).toHaveURL("/brands/under-armour");
  await expect(page.getByRole("heading", { level: 1, name: "Under Armour" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Account Application" })).toHaveAttribute(
    "href",
    "/documents/account/account-application-2025.pdf",
  );
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/access/);
});

test("access and authenticated pages have no serious automated accessibility violations", async ({ page }) => {
  await page.goto("/brands/champion");
  await expect(page.getByRole("heading", { name: "Everything you need, kept in one place." })).toBeVisible();
  await expectNoSeriousA11yViolations(page);

  await page.getByLabel("Customer password").fill("champ1");
  await page.getByRole("button", { name: "Open resource library" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Champion" })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("administrator APIs reject anonymous requests", async ({ request }) => {
  const response = await request.get("/api/admin/catalogs");
  expect([401, 503]).toContain(response.status());
});

test("managed account documents remain behind customer access", async ({ request }) => {
  const response = await request.get("/documents/account/account-application-2025.pdf", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toContain("/access?next=");
});
