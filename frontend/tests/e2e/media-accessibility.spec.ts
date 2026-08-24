import axeCore from "axe-core";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { callGet } from "./helpers";

/**
 * T-095 — gerçek Chromium'da ana medya ekranlarının WCAG taraması.
 *
 * SSR/jsdom taramasının ölçemediği renk kontrastı ve hidrasyon sonrası DOM bu
 * paketin asıl kapsamıdır. Sonuç yalnız `critical`/`serious` için kapıdır;
 * diğer bulgular raporda görünür kalır ama bu görevin ilan ettiği eşiği aşmaz.
 */

type AxeNode = { target?: unknown; failureSummary?: string; html?: string };
type AxeViolation = { id: string; impact?: string | null; help: string; nodes: AxeNode[] };

async function ready(page: Page, route: string): Promise<void> {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#app")).toBeVisible();
  await page.keyboard.press("Escape");
  const tourClose = page.locator(".z-\\[9999\\] button", { hasText: "✕" });
  if (await tourClose.isVisible().catch(() => false)) await tourClose.click();
}

async function blockingViolations(page: Page): Promise<AxeViolation[]> {
  await page.addScriptTag({ content: axeCore.source });
  const violations = await page.evaluate(async () => {
    const axe = (
      globalThis as typeof globalThis & {
        axe: {
          run: (
            root: Document,
            options: Record<string, unknown>
          ) => Promise<{ violations: AxeViolation[] }>;
        };
      }
    ).axe;
    const result = await axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      },
    });
    return result.violations;
  });
  return violations.filter((v) => v.impact === "critical" || v.impact === "serious");
}

function detail(violations: AxeViolation[]): string {
  return violations
    .map(
      (v) =>
        `${v.impact} ${v.id}: ${v.help}\n${v.nodes
          .map((n) => `  ${JSON.stringify(n.target)} — ${n.failureSummary || n.html || ""}`)
          .join("\n")}`
    )
    .join("\n\n");
}

async function expectClean(page: Page, route: string, theme: "light" | "dark"): Promise<void> {
  await page.addInitScript((nextTheme) => localStorage.setItem("th-theme", nextTheme), theme);
  await ready(page, route);
  await expect(page).toHaveURL(new RegExp(`/panel/${route}(?:[?#]|$)`));
  await expect(page.locator(".mpage__title, h1").first()).toBeVisible();
  const violations = await blockingViolations(page);
  expect(violations.length, `${route} (${theme}):\n${detail(violations)}`).toBe(0);
}

async function tabTo(page: Page, target: Locator, limit = 180): Promise<void> {
  await expect(target).toBeVisible();
  for (let i = 0; i < limit; i += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((el) => el === document.activeElement).catch(() => false)) return;
  }
  const active = await page.evaluate(() => document.activeElement?.outerHTML || "none");
  throw new Error(`Klavye hedefe ulaşamadı (${limit} Tab). Aktif öğe: ${active}`);
}

test.describe("T-095 · satıcı medya ekranları", () => {
  test.use({ storageState: "playwright/.auth/seller.json" });

  for (const route of ["media-library", "my-media-explorer"]) {
    for (const theme of ["light", "dark"] as const) {
      test(`${route} (${theme}): critical/serious axe bulgusu yok`, async ({ page }) => {
        await expectClean(page, route, theme);
      });
    }
  }

  test("yükleme → kütüphane → detay → crop yolu yalnız klavyeyle erişilebilir", async ({
    page,
    request,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem("panel_tour_seen_v5", JSON.stringify(["store", "page:media-library"]))
    );
    const list = await callGet(request, "tradehub_core.api.seller_media.get_my_media", {
      page: "1",
      page_size: "100",
    });
    const candidates =
      (list.message as { items?: { file_name: string; file_url: string }[] }).items?.filter(
        (item) => /\.(png|jpe?g|webp)$/i.test(item.file_url || "")
      ) || [];
    let candidate: { file_name: string; file_url: string } | undefined;
    for (const item of candidates) {
      const dimensions = await callGet(request, "tradehub_core.api.seller_media.get_dimensions", {
        file_url: item.file_url,
      });
      if ((dimensions.message as { width?: number })?.width) {
        candidate = item;
        break;
      }
    }
    test.skip(!candidate, "Klavye crop yolunu sürecek ölçülü bir görsel yok.");

    await ready(page, "media-library");

    const uploadButton = page.locator(".mpage__head .hdr-btn-primary");
    await tabTo(page, uploadButton);
    await page.keyboard.press("Enter");
    await expect(page.locator(".mmodal")).toBeVisible();

    const dropzone = page.locator(".mmodal .up-drop");
    await tabTo(page, dropzone);
    const chooserPromise = page.waitForEvent("filechooser");
    await page.keyboard.press("Enter");
    const chooser = await chooserPromise;
    await chooser.setFiles({
      name: "t095-invalid.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("T-095 keyboard-only preflight"),
    });
    await expect(page.locator(".mmodal .up-row")).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".mmodal [role='status'][aria-live='polite']").first()).toBeVisible();
    const uploaderViolations = await blockingViolations(page);
    expect(uploaderViolations.length, `yükleyici açık:\n${detail(uploaderViolations)}`).toBe(0);

    await page.keyboard.press("Escape");
    await expect(page.locator(".mmodal")).toBeHidden();

    const search = page.locator(".mtoolbar-wrap input[type='text']");
    await tabTo(page, search);
    await page.keyboard.type(candidate!.file_name);
    const card = page.getByRole("button", { name: candidate!.file_name, exact: true }).first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await tabTo(page, card);
    await page.keyboard.press("Enter");

    const crop = page.getByRole("button", { name: /Kırp|Crop/ }).first();
    await expect(crop).toBeEnabled({ timeout: 15000 });
    await tabTo(page, crop);
    await page.keyboard.press("Enter");
    await expect(page.locator(".cstudio")).toBeVisible({ timeout: 20000 });

    const slot = page.locator(".cstudio__slot-select");
    await tabTo(page, slot);
    await page.keyboard.press("ArrowDown");
    const modalViolations = await blockingViolations(page);
    expect(modalViolations.length, `crop modalı:\n${detail(modalViolations)}`).toBe(0);

    await page.keyboard.press("Escape");
    await expect(page.locator(".cstudio")).toBeHidden();
  });

  test("azaltılmış hareket tercihi animasyon ve geçişleri bastırır", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ready(page, "media-library");
    await expect(page.locator(".hdr-btn-primary")).toBeVisible();
    const state = await page.evaluate(() => {
      const el = document.querySelector(".hdr-btn-primary");
      const css = el ? getComputedStyle(el) : null;
      return {
        matches: matchMedia("(prefers-reduced-motion: reduce)").matches,
        animationDuration: css?.animationDuration,
        transitionDuration: css?.transitionDuration,
      };
    });
    expect(state.matches).toBe(true);
    const asMilliseconds = (value = "0s") =>
      value.endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1000;
    expect(asMilliseconds(state.animationDuration)).toBeLessThanOrEqual(0.01);
    expect(asMilliseconds(state.transitionDuration)).toBeLessThanOrEqual(0.01);
  });
});

test.describe("T-095 · yönetici medya ekranları", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  for (const route of ["media-optimize", "media-explorer", "media-audit", "media-backup"]) {
    for (const theme of ["light", "dark"] as const) {
      test(`${route} (${theme}): critical/serious axe bulgusu yok`, async ({ page }) => {
        await expectClean(page, route, theme);
      });
    }
  }
});
