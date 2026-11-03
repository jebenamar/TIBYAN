import { expect, test } from "@playwright/test";

/** Parcours D — download, go offline, read and search ONLY what was downloaded. */
test.describe("Parcours D — hors connexion", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "service worker test runs on Chromium");

  test("télécharger Al-Fatiha (Muyassar), couper le réseau, lire et chercher", async ({ page, context }) => {
    await page.goto("/hors-ligne");
    // Wait for the service worker to install and control the page.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

    const card = page.locator("li").filter({ hasText: "التفسير الميسر" }).first();
    await card.getByRole("button", { name: "السور المختارة" }).click();
    await page.getByRole("checkbox").first().check(); // surah 1
    await page.getByRole("button", { name: /^تنزيل/ }).click();
    await expect(card).toContainText("١ / ١١٤");

    // Make sure the verse page shell and assets are cached once while online.
    await page.goto("/hors-ligne/lire?s=1&a=1");
    await expect(page.locator(".tafsir-prose")).toBeVisible();

    await context.setOffline(true);

    // A verse page that was never visited → redirected to the IndexedDB reader.
    await page.goto("/tafsir/1/2?source=muyassar");
    await expect(page).toHaveURL(/\/hors-ligne\/lire\?s=1&a=2&source=muyassar/);
    await expect.poll(async () => (await page.locator(".quran-text").innerText()).replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, "")).toContain("حمد");
    await expect(page.locator(".tafsir-prose")).not.toBeEmpty();

    // Data not downloaded → explicitly reported, never invented.
    await page.goto("/hors-ligne/lire?s=2&a=255&source=muyassar");
    await expect(page.getByRole("status").filter({ hasText: "غير منزّلة" })).toBeVisible();

    // Local search runs on downloaded data only.
    await page.goto("/hors-ligne");
    await page.getByPlaceholder("سورة، آية، كلمة…").fill("الحمد");
    await page.getByPlaceholder("سورة، آية، كلمة…").press("Enter");
    await expect(page.locator("mark").first()).toBeVisible();

    await context.setOffline(false);
  });
});
