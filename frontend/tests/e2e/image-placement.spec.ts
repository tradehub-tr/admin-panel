import axeCore from "axe-core";
import { expect, test, type Page } from "@playwright/test";

/**
 * Görsel önizleme + odak noktası — uçtan uca (spec 2026-10-01 §9).
 *
 *   E2E_SELLER_USER=ozgenplastik@istoc.com npx playwright test tests/e2e/image-placement.spec.ts
 *
 * Özgen Plastik banner'ı (2000 × 408) telefonda 390 × 180 vitrin bandında %44
 * görünür; odak %78 / %45 kaydedilince yazının bulunduğu sağ taraf görünmeli ve
 * önizlemedeki kırpım vitrindekiyle aynı olmalı.
 *
 * E2E_STORE_URL: aynı banner'ın kopyası başka bir (yerel test) mağazaya
 * yüklendiyse o mağazanın dükkân adresi (vars: Özgen, sel-00020).
 */
const BANNER = "/files/c2/c2e69ef450fc51205bc78d6d9707ca8e.webp";
const STORE = process.env.E2E_STORE_URL || "http://istoc.localhost/magaza/sel-00020/dukkan";
const OUT = "test-results/image-placement";

// Pencere metinleri Türkçe; panel dili tarayıcı dilinden seçiliyor.
test.use({ locale: "tr-TR" });

type AxeViolation = {
  id: string;
  impact?: string | null;
  help: string;
  nodes: { target?: unknown }[];
};

async function axe(page: Page, include: string): Promise<AxeViolation[]> {
  await page.addScriptTag({ content: axeCore.source });
  return page.evaluate(async (sel) => {
    const a = (
      globalThis as unknown as {
        axe: { run: (c: unknown, o: unknown) => Promise<{ violations: AxeViolation[] }> };
      }
    ).axe;
    const r = await a.run(
      { include: [sel] },
      {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag2aaa", "wcag21a", "wcag21aa", "wcag22aa"],
        },
      }
    );
    return r.violations;
  }, include);
}

async function openWindow(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("storefront-layout", { waitUntil: "networkidle" });
  const button = page.locator(`[data-placement-url="${BANNER}"] .ipb__btn`).first();
  await button.waitFor({ state: "attached" });
  // Yeni bağlamda sayfa turu, ardından bölüm turu (localStorage'da "görüldü" yok) kendiliğinden
  // açılır ve tıklamaları keser; her biri Esc ile geçilir.
  const tour = page.getByRole("button", { name: /Turu atla/ });
  for (let i = 0; i < 3; i++) {
    if (
      !(await tour.waitFor({ state: "visible", timeout: 2500 }).then(
        () => true,
        () => false
      ))
    )
      break;
    await page.keyboard.press("Escape");
    await expect(tour).toBeHidden();
  }
  if (!(await button.isVisible().catch(() => false))) {
    // Vitrin bandı kartı kapalıysa aç — tuvaldeki kart başlığı (soldaki bölüm paleti değil).
    await page
      .locator('[data-tour="sle-canvas"]')
      .getByText(/hero|banner/i)
      .first()
      .click();
  }
  await expect(button).toBeVisible();
  await expect(page.locator(`[data-placement-url="${BANNER}"] .ipb__badge`)).toContainText(
    "yerde kenarlar kesiliyor"
  );
  await button.click();
  const dialog = page.getByRole("dialog", { name: "Görseliniz nerelerde görünecek?" });
  await expect(dialog).toBeVisible();
  // Hedef yüklenince pencere cihazı/yeri baştan kuruyor (ImagePlacementModal `load()`): daha önce
  // yapılan "Telefon" seçimi geri alınır. Yükleme bitti işareti: odak işareti etkin.
  await expect(dialog.locator(".fe__handle")).toBeEnabled();
  return dialog;
}

test("Özgen banner'ı: %78/%45 kaydedilir, telefonda vitrin önizlemeyle aynı kırpılır", async ({
  page,
  browser,
}) => {
  const dialog = await openWindow(page);
  await dialog.getByRole("button", { name: "Telefon" }).click();
  await dialog.getByRole("button", { name: /Mağaza sayfası başlığı/ }).click();
  await dialog.getByLabel("Yatay (%)").fill("78");
  await dialog.getByLabel("Yatay (%)").press("Tab");
  await dialog.getByLabel("Dikey (%)").fill("45");
  await dialog.getByLabel("Dikey (%)").press("Tab");
  await expect(dialog.getByRole("status")).toContainText("Odak noktası: yatay %78, dikey %45");

  const preview = dialog.locator(".ipm__stagewrap .ctx-band .ctx-img");
  await expect(preview).toHaveCSS("object-position", "78% 45%");
  const pBox = await preview.boundingBox();
  expect(Math.round(pBox!.width)).toBe(390);
  expect(Math.round(pBox!.height)).toBe(180);
  const previewShot = await preview.screenshot({ path: `${OUT}/preview.png` });

  const violations = await axe(page, ".ipm");
  expect(violations, violations.map((v) => `${v.id}: ${v.help}`).join("\n")).toEqual([]);

  await dialog.getByRole("button", { name: "Kaydet" }).click();
  await expect(dialog).toBeHidden();

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    storageState: undefined,
  });
  const store = await ctx.newPage();
  await store.goto(STORE, { waitUntil: "networkidle" });
  const hero = store.locator('[data-section="hero_banner"] img').first();
  await expect(hero).toBeVisible();
  await expect(hero).toHaveCSS("object-position", "78% 45%");
  const sBox = await hero.boundingBox();
  expect(Math.round(sBox!.width)).toBe(390);
  expect(Math.round(sBox!.height)).toBe(180);
  const storeShot = await hero.screenshot({ path: `${OUT}/storefront.png` });

  const cmp = await ctx.newPage();
  await cmp.setContent("<!doctype html><title>cmp</title>");
  const meanDiff = await cmp.evaluate(
    async ([a, b]) => {
      const load = (b64: string) =>
        new Promise<HTMLImageElement>((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = `data:image/png;base64,${b64}`;
        });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const w = 195;
      const h = 90;
      const px = (img: HTMLImageElement) => {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const g = c.getContext("2d")!;
        g.drawImage(img, 0, 0, w, h);
        return g.getImageData(0, 0, w, h).data;
      };
      const da = px(ia);
      const db = px(ib);
      let sum = 0;
      for (let i = 0; i < da.length; i += 4)
        sum +=
          (Math.abs(da[i] - db[i]) +
            Math.abs(da[i + 1] - db[i + 1]) +
            Math.abs(da[i + 2] - db[i + 2])) /
          3;
      return sum / (w * h);
    },
    [previewShot.toString("base64"), storeShot.toString("base64")] as const
  );
  // Önizleme master WebP'yi, vitrin srcset türevini çiziyor: küçük fark doğal; kırpım farkı ≫ 20.
  console.log(`IMAGE_PLACEMENT_MEAN_DIFF=${meanDiff.toFixed(2)}`);
  expect(meanDiff).toBeLessThan(20);
  await ctx.close();
});

test("klavyeyle baştan sona: cihaz → yerler → odak işareti → kaydet; Esc onay ister", async ({
  page,
}) => {
  const dialog = await openWindow(page);
  await expect(dialog.getByRole("button", { name: "Bilgisayar" })).toBeFocused();
  const handle = dialog.locator(".fe__handle");
  // Odak işareti hedef/niyet yüklenene kadar `disabled`; devre dışı düğmeye focus() sessizce düşer.
  await expect(handle).toBeEnabled();
  await handle.focus();
  await expect(handle).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Shift+ArrowLeft");
  await expect(dialog.getByRole("status")).toContainText("yatay %");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Kaydetmeden kapat" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(`[data-placement-url="${BANNER}"] .ipb__btn`).first()).toBeFocused();
});

test("hareketi azalt açıkken geçişler kapalı", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const dialog = await openWindow(page);
  // Panelin genel kuralı (assets/scss/base.scss) azaltılmış harekette `transition-duration: 0.01ms !important`
  // basıyor; hesaplanan değer "1e-05s". Etkisi "kapalı" ile aynı — ≤ 0.01 ms kabul.
  const sure = async (sel: string) =>
    parseFloat(
      await dialog
        .locator(sel)
        .first()
        .evaluate((e) => getComputedStyle(e).transitionDuration)
    );
  expect(await sure(".ctx-img")).toBeLessThanOrEqual(0.00001);
  expect(await sure(".fe__layer")).toBeLessThanOrEqual(0.00001);
});
