import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
});

test("opens the duo demo from the public homepage", async ({ page }) => {
  await expect(
    page.getByRole("heading", {
      name: "Plan your lives together without losing your own space.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore demo" }).click();
  await expect(page.getByText("Together", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Alex & Sam")).toBeVisible();
  await expect(page.locator(".duo-lane-mine")).toBeVisible();
  await expect(page.locator(".duo-lane-partner")).toBeVisible();
});

test("shows a 7am to midnight three-lane week", async ({ page }) => {
  await page.getByRole("button", { name: "Explore demo" }).click();
  await page.getByRole("button", { name: "Week", exact: true }).first().click();
  await expect(page.locator(".week-hours")).toContainText("7am");
  await expect(page.locator(".week-hours")).toContainText("12am");
  await expect(page.locator(".duo-lane-guides").first()).toContainText("You");
  await expect(page.locator(".duo-lane-guides").first()).toContainText("Together");
  await expect(page.locator(".duo-side-column").first()).toBeVisible();
});

test("keeps duo navigation and creation usable on a narrow phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Explore demo" }).click();
  await expect(page.locator(".mobile-bottom-nav")).toBeVisible();
  await expect(page.locator(".duo-mobile-segments")).toBeVisible();

  await page.getByRole("button", { name: "Add item" }).click();
  await expect(page.getByText("Who is this for?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Together" }).last()).toBeVisible();

  await page.locator(".mobile-bottom-nav").getByRole("button", { name: /Settings/ }).click();
  await expect(page.getByRole("heading", { name: "Alex & Sam" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible();
});
