import axeCore from "axe-core";
import { expect, test, type Page } from "@playwright/test";

/**
 * Lojistik ekranlarının gerçek Chromium'da WCAG taraması.
 *
 * NEDEN VAR: lojistik FE'si on altı ekrana ulaştı ve hiçbirinde otomatik
 * erişilebilirlik denetimi yoktu. Medya tarafında karşılığı var
 * (`tests/e2e/media-accessibility.spec.ts`, T-095) ve orada kontrast/hidrasyon
 * sonrası DOM hataları ancak gerçek tarayıcıda yakalanmıştı — jsdom ölçemiyor.
 *
 * KAPI YALNIZ `critical` VE `serious`: kardeş spec ile aynı eşik. Daha düşük
 * etkili bulgular raporda görünür ama koşumu kırmaz — yoksa denetim ilk günde
 * kapatılırdı.
 *
 * İKİ TEMA: kontrast ihlalleri temaya bağlı. Açıkta geçen bir ekran koyuda
 * düşebiliyor (medya tarafında ölçüldü).
 *
 * NE DEĞİL: klavye akışı denetimi değil — o `verify-0904.spec.ts` M3'te.
 * Burası duran ekranın statik denetimi.
 */

type AxeNode = { target?: unknown; failureSummary?: string; html?: string };
type AxeViolation = { id: string; impact?: string | null; help: string; nodes: AxeNode[] };

/** Menüden ölçülen on altı lojistik ekranı (7 Eyl 2026, admin oturumu). */
const EKRANLAR = [
  "pano",
  "bekleyen-isler",
  "istisnalar",
  "raporlar",
  "sevkiyatlar",
  "sevkiyatlar/yeni",
  "paketleme",
  "teslim-kaniti",
  "satici-teslimati",
  "alici-teslim-alma",
  "iadeler",
  "tarifeler",
  "fiyat-kurallari",
  "fiyat-simulasyonu",
  "durum-eslemesi",
  "ayarlar",
] as const;

async function ekraniAc(page: Page, yol: string): Promise<void> {
  await page.goto(`/panel/lojistik/${yol}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#app")).toBeVisible();
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });
}

async function engelleyenIhlaller(page: Page): Promise<AxeViolation[]> {
  await page.addScriptTag({ content: axeCore.source });
  const ihlaller = await page.evaluate(async () => {
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
    const sonuc = await axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      },
    });
    return sonuc.violations;
  });
  return ihlaller.filter((v) => v.impact === "critical" || v.impact === "serious");
}

function ayrinti(ihlaller: AxeViolation[]): string {
  return ihlaller
    .map(
      (v) =>
        `${v.impact} ${v.id}: ${v.help}\n${v.nodes
          .map((n) => `  ${JSON.stringify(n.target)} — ${n.failureSummary || n.html || ""}`)
          .join("\n")}`
    )
    .join("\n\n");
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("th-lang", "tr");
    // Rehberli tur `fixed inset-0 z-[9999]` katmanı taramayı da kirletir.
    localStorage.setItem(
      "panel_tour_seen_v5",
      JSON.stringify([
        "dashboard",
        "orders",
        "catalog",
        "products",
        "commerce",
        "store",
        "system",
        "messaging",
        "crm",
        "helpdesk",
        "management",
        "logistics",
      ])
    );
  });
});

for (const tema of ["light", "dark"] as const) {
  test.describe(`WCAG · ${tema} tema`, () => {
    for (const yol of EKRANLAR) {
      test(`${yol}: critical/serious axe bulgusu yok`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem("th-theme", t), tema);
        await ekraniAc(page, yol);
        const ihlaller = await engelleyenIhlaller(page);
        expect(ihlaller.length, `${yol} (${tema}):\n${ayrinti(ihlaller)}`).toBe(0);
      });
    }
  });
}
