import { execFileSync } from "node:child_process";

import { expect, request as apiRequest, test } from "@playwright/test";

import { e2eName, makePng, toBase64 } from "./helpers";

const BACKEND_CONTAINER = process.env.E2E_BACKEND_CONTAINER || "istoc-dev-backend-1";
const API_ORIGIN = "http://istoc.localhost";
const STORAGE_RESOURCE = "/api/resource/Media%20Storage%20Settings/Media%20Storage%20Settings";
const MIRROR_STATUS = "tradehub_core.api.media_mirror.get_mirror_status";
const SELLER_UPLOAD = "tradehub_core.api.seller_media.upload_media";

function ensureMinioBucket(): void {
  const code = [
    "import boto3",
    "from botocore.config import Config",
    "c=boto3.client('s3', endpoint_url='http://minio:9000', region_name='us-east-1', aws_access_key_id='minioadmin', aws_secret_access_key='minioadmin', config=Config(s3={'addressing_style':'path'}))",
    "b='istoc-medya-test'",
    "exists=True",
    "try:",
    " c.head_bucket(Bucket=b)",
    "except Exception:",
    " exists=False",
    "if not exists:",
    " c.create_bucket(Bucket=b)",
  ].join("\n");
  execFileSync(
    "docker",
    ["exec", "-w", "/home/frappe/frappe-bench", BACKEND_CONTAINER, "env/bin/python", "-c", code],
    { timeout: 30_000, stdio: "pipe" }
  );
}

async function csrf(request: Awaited<ReturnType<typeof apiRequest.newContext>>): Promise<string> {
  const response = await request.get("/api/method/tradehub_core.api.v1.auth.get_session_user");
  const body = await response.json();
  const token = body?.message?.csrf_token;
  if (!token) throw new Error(`CSRF token yok: ${JSON.stringify(body).slice(0, 250)}`);
  return token;
}

async function updateSettings(
  request: Awaited<ReturnType<typeof apiRequest.newContext>>,
  payload: Record<string, unknown>
): Promise<void> {
  const response = await request.put(STORAGE_RESOURCE, {
    headers: { "X-Frappe-CSRF-Token": await csrf(request) },
    data: payload,
    failOnStatusCode: false,
  });
  expect(response.status(), await response.text()).toBe(200);
}

/**
 * T-141 — S11b (superadmin S3 aynalama) + oturum/erişim dumanı.
 *
 * Bu dosya CANLI panele TARAYICIYLA gider (storageState satıcı oturumu):
 * altyapının gerçekten uçtan uca kurulduğunu (auth + SPA yönlendirme)
 * kanıtlar ve S11b'nin neden bu oturumla koşamadığını ÖLÇEREK gösterir.
 */

test.describe("T-141 · satıcı medya konsolu — erişim (canlı UI)", () => {
  // Oturum dumanı: storageState gerçekten satıcıyı içeri alıyor mu.
  test("altyapı dumanı — satıcı oturumu paneli açar ve medya kütüphanesine gider", async ({
    page,
  }) => {
    // baseURL `.../panel/` — göreli yol (baştaki `/` YOK) ki `/panel/` düşmesin.
    await page.goto("media-library", { waitUntil: "networkidle" });
    // Login'e atılmadı (guard geçildi): URL panelde kaldı.
    await expect(page).toHaveURL(/\/panel\/media-library/);
    // SPA mount oldu — login formu DEĞİL uygulama kabuğu göründü.
    await expect(page.locator("#app")).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
  });

  // ── Senaryo 11b ────────────────────────────────────────────────────────
  // "Superadmin S3'ü açar → yeni yüklemeler aynalanır."
  //
  // Negatif rol kapısı satıcı oturumuyla; pozitif ayna senaryosu aşağıdaki
  // ayrı describe'da Administrator storageState'iyle koşar.
  test("S11b — satıcı Depolama Ayarları ekranına giremez (superadmin kapısı)", async ({ page }) => {
    await page.goto("media-storage-settings", { waitUntil: "networkidle" });
    // Guard satıcıyı dashboard'a düşürür — superadmin ekranı açılmaz.
    await expect(page).toHaveURL(/\/panel\/dashboard/);
  });
});

test.describe("T-141 · S11b — superadmin canlı S3 aynalama", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("superadmin S3'ü açar → satıcı yüklemesi yerel + MinIO'da oluşur", async ({ page }) => {
    test.setTimeout(90_000);
    ensureMinioBucket();
    const admin = page.request;
    const initialResponse = await admin.get(STORAGE_RESOURCE);
    expect(initialResponse.status()).toBe(200);
    const initial = (await initialResponse.json()).data || {};

    // Bu test yalnız izole yerel kabul ortamında ayar değiştirir. Var olan
    // gerçek kimliği okuyamayız; üstüne yazıp geri döndürüyormuş gibi yapma.
    expect(initial.storage_mode || "local").toBe("local");
    expect(initial.s3_bucket || "").toBe("");
    expect(initial.s3_secret_key || "").toBe("");
    expect(initial.s3_secret_access_key || "").toBe("");

    const seller = await apiRequest.newContext({
      baseURL: API_ORIGIN,
      storageState: "playwright/.auth/seller.json",
    });
    let fileUrl = "";
    try {
      await page.addInitScript(() =>
        localStorage.setItem("panel_tour_seen_v5", JSON.stringify(["system"]))
      );
      await page.goto("media-storage-settings", { waitUntil: "networkidle" });
      await expect(page).toHaveURL(/\/panel\/media-storage-settings/);

      // İlk Administrator oturumunda açılan ürün turu sayfadaki alanların
      // üstünü örter. Kabul senaryosu turu değil depolama akışını sınar.
      const tourClose = page.locator(".z-\\[9999\\] button", { hasText: "✕" });
      if (await tourClose.isVisible().catch(() => false)) await tourClose.click();

      await page.getByTestId("storage-mode").selectOption("mirror");
      await page.getByTestId("s3-enabled").check();
      await page.getByTestId("s3-path-style").check();
      await page.getByTestId("s3-upload-originals").check();
      await page.getByTestId("s3-upload-renditions").check();
      await page.getByTestId("s3-endpoint").fill("http://minio:9000");
      await page.getByTestId("s3-region").fill("us-east-1");
      await page.getByTestId("s3-bucket").fill("istoc-medya-test");
      await page.getByTestId("s3-access-key").fill("minioadmin");
      await page.getByTestId("s3-secret-key").fill("minioadmin");

      const saved = page.waitForResponse(
        (response) =>
          response.request().method() === "PUT" &&
          response.url().includes("/api/resource/Media%20Storage%20Settings/")
      );
      await page.getByTestId("media-storage-save").click();
      expect((await saved).status()).toBe(200);
      await expect(page.locator(".status-grid")).toContainText("mirror");

      await page.getByTestId("s3-test-connection").click();
      await expect(page.locator(".test-result.is-ok")).toBeVisible({ timeout: 20_000 });

      const sellerCsrf = await csrf(seller);
      const seed = Date.now();
      const content = makePng(96, 96, [seed % 251, (seed >> 3) % 251, (seed >> 7) % 251]);
      const upload = await seller.post(`/api/method/${SELLER_UPLOAD}`, {
        headers: { "X-Frappe-CSRF-Token": sellerCsrf },
        data: { file_name: e2eName("s3-mirror", "png"), content: toBase64(content) },
        failOnStatusCode: false,
      });
      const uploadBody = await upload.json();
      expect(upload.status(), JSON.stringify(uploadBody).slice(0, 500)).toBe(200);
      fileUrl = uploadBody?.message?.file_url || "";
      expect(fileUrl).toMatch(/^\/files\/[0-9a-f]{2}\/[0-9a-f]{32}\.webp$/);

      await expect
        .poll(
          async () => {
            const status = await admin.get(
              `/api/method/${MIRROR_STATUS}?file_url=${encodeURIComponent(fileUrl)}`
            );
            if (status.status() !== 200) return false;
            return Boolean((await status.json())?.message?.replicated);
          },
          { timeout: 30_000, intervals: [250, 500, 1_000] }
        )
        .toBe(true);
    } finally {
      await seller.dispose();
      // Ayarı her hata dalında güvenli varsayılana döndür. Dev MinIO
      // kimliği de temizlenir; test kalıcı S3 etkinleştirmez.
      await updateSettings(admin, {
        storage_mode: "local",
        backend: "local",
        s3_enabled: 0,
        blocker_ack: 0,
        s3_endpoint_url: "",
        s3_endpoint: "",
        s3_region: "",
        s3_bucket: "",
        s3_access_key_id: "",
        s3_access_key: "",
        s3_secret_access_key: "",
        s3_secret_key: "",
        s3_path_style: 0,
        s3_upload_originals: 0,
        s3_upload_renditions: 0,
        change_reason: "T-141 S11b yerel kabul ortamı temizliği",
      });
    }
  });
});
