import { expect, test, type Page } from "@playwright/test";

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 1024;
/** Compare Arabic text ignoring harakat / Quranic marks (Unicode mark order may differ). */
const bare = (s: string) => s.replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, "");

test.describe("Parcours A — recherche directe", () => {
  test("2:255 → verset + tafsir préféré, puis changement de tafsir", async ({ page }) => {
    await page.goto("/");
    const search = page.getByRole("combobox").first();
    await search.fill("2:255");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/tafsir\/2\/255\?source=muyassar$/);
    expect(bare(await page.locator(".quran-text").innerText())).toContain("قيوم");
    await expect(page.locator(".tafsir-prose")).toContainText("الله");

    await page.getByRole("link", { name: "تفسير ابن كثير" }).click();
    await expect(page).toHaveURL(/source=ibn-kathir/);
    await expect(page.locator(".tafsir-prose")).toContainText("هذه آية الكرسي");
  });

  test("un numéro de verset hors limites est signalé", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("combobox").first().fill("1:8");
    await expect(page.getByRole("listbox")).toContainText("7");
  });

  test("l'URL partageable charge directement le contenu", async ({ page }) => {
    const res = await page.goto("/tafsir/18/10?source=jalalayn");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("الكهف");
    await expect(page.locator(".tafsir-prose")).not.toBeEmpty();
  });
});

test.describe("Parcours B — navigation par sourate", () => {
  test("البقرة → sourate → verset → tafsir", async ({ page }) => {
    await page.goto("/");
    const search = page.getByRole("combobox").first();
    await search.fill("البقرة");
    await expect(page.getByLabel("جارٍ البحث…")).toHaveCount(0); // suggestions settled
    await page.getByRole("option").filter({ hasText: "البقرة" }).first().click();
    await expect(page).toHaveURL(/\/sourate\/2$/);
    await page.locator("#a255 a").click();
    await expect(page).toHaveURL(/\/tafsir\/2\/255/);
    await expect(page.locator(".tafsir-prose")).toBeVisible();
  });

  test("navigation verset suivant / précédent, y compris entre sourates", async ({ page }) => {
    await page.goto("/tafsir/1/7?source=muyassar");
    await page.getByRole("link", { name: "الآية التالية" }).click();
    await expect(page).toHaveURL(/\/tafsir\/2\/1\?source=muyassar/);
    await page.getByRole("link", { name: "الآية السابقة" }).click();
    await expect(page).toHaveURL(/\/tafsir\/1\/7\?source=muyassar/);
  });

  test("une route de verset invalide renvoie 404", async ({ page }) => {
    const res = await page.goto("/tafsir/2/287");
    expect(res?.status()).toBe(404);
  });
});

test.describe("Parcours C — comparaison", () => {
  test("Ibn Kathir et As-Sa'di côte à côte (desktop) ou en onglets (mobile)", async ({ page }) => {
    await page.goto("/tafsir/2/255?source=ibn-kathir");
    await page.getByRole("link", { name: "قارن التفاسير" }).click();
    await expect(page).toHaveURL(/\/comparer\/2\/255\?sources=ibn-kathir,/);

    await page.goto("/comparer/2/255?sources=ibn-kathir,saadi");
    const panels = page.locator("[role=tabpanel]");
    await expect(panels).toHaveCount(2);
    if (isMobile(page)) {
      await expect(page.getByRole("tablist")).toBeVisible();
      await expect(panels.nth(0)).toBeVisible();
      await expect(panels.nth(1)).toBeHidden();
      await page.getByRole("tab", { name: "تفسير السعدي" }).click();
      await expect(panels.nth(1)).toBeVisible();
      await expect(panels.nth(0)).toBeHidden();
    } else {
      await expect(panels.nth(0)).toBeVisible();
      await expect(panels.nth(1)).toBeVisible();
      const [a, b] = await Promise.all([panels.nth(0).boundingBox(), panels.nth(1).boundingBox()]);
      expect(Math.abs((a?.y ?? 0) - (b?.y ?? 0))).toBeLessThan(4); // same row
    }
    await expect(panels.nth(0)).toContainText("هذه آية الكرسي");
  });

  test("retirer une interprétation met à jour l'URL", async ({ page }) => {
    await page.goto("/comparer/2/255?sources=ibn-kathir,saadi,muyassar");
    if (isMobile(page)) await page.getByRole("tab", { name: "تفسير السعدي" }).click();
    await page.getByRole("button", { name: /إزالة تفسير السعدي/ }).click();
    await expect(page).toHaveURL(/sources=ibn-kathir,muyassar$/);
  });
});

test.describe("Recherche textuelle", () => {
  test("résultats surlignés dans le Coran et les tafsirs", async ({ page }) => {
    await page.goto("/recherche?q=الصبر");
    await expect(page.locator("mark").first()).toBeVisible();
    await expect(page.locator("#r-quran")).toBeVisible();
    await expect(page.locator("#r-tafsir")).toBeVisible();
  });

  test("filtre par auteur", async ({ page }) => {
    await page.goto("/recherche?q=الصبر&scope=tafsir&source=saadi");
    const items = page.locator("section[aria-labelledby=r-tafsir] li");
    await expect(items.first()).toBeVisible();
    for (const text of await items.allInnerTexts()) expect(text).toContain("تفسير السعدي");
  });
});

test.describe("Intégrité & RTL", () => {
  test("un texte absent est signalé, jamais remplacé", async ({ page }) => {
    await page.goto("/tafsir/4/61?source=saadi");
    await expect(page.getByRole("status").filter({ hasText: "لا يتوفر نص" })).toBeVisible();
  });

  test("RTL par défaut, LTR après passage en français", async ({ page }) => {
    await page.goto("/reglages");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.getByRole("radio", { name: "Français" }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Réglages");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });

  test("favoris et notes restent locaux et séparés du texte", async ({ page }) => {
    await page.goto("/tafsir/1/1?source=muyassar");
    await page.getByPlaceholder("اكتب ملاحظة").fill("ملاحظة تجريبية");
    await page.getByRole("button", { name: "حفظ الملاحظة" }).click();
    await expect(page.locator(".tafsir-prose")).not.toContainText("ملاحظة تجريبية");
    await page.goto("/bibliotheque");
    await page.getByRole("tab", { name: /الملاحظات/ }).click();
    await expect(page.getByText("ملاحظة تجريبية")).toBeVisible();
  });
});
