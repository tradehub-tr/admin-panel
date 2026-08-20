import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { before, test } from "node:test";

/**
 * Contract testleri (T-084'ün panel ayağı) — CANLI konteynere karşı,
 * sözleşmedeki (`openapi-http.yaml`) yanıt ŞEKLİNİ doğrular: alan varlığı ve
 * tip, DEĞER değil. Değerler ortama göre değişir (kaç klasör var, bayrak açık
 * mı); şekil sözleşmenin kendisidir.
 *
 *   ÖLÇÜLÜR  — misafir uçları her koşuda (backend ayaktaysa):
 *              get_manifest, get_manifest_batch, rum.collect, ayrıca
 *              oturumsuz manifest_batch'in 403 reddi.
 *              Oturumlu uçlar `ISTOC_CONTRACT=1` ile (bench'te sid basılır —
 *              `tests/e2e/global-setup.ts` deseni): manifest_batch,
 *              list_folders, list_orphans, find_in_my_library, get_my_summary.
 *   ÖLÇÜLMEZ — crop üçlüsü (sahip olunan `Media Asset` kimliği ister),
 *              get_signed_url (private dosya ister), klasör yazma döngüsü
 *              (create/rename/move/delete — her test koşusunda veri yazmamak
 *              için; 2026-08-20 elle ölçümü sözleşmenin `x-measurement`
 *              alanlarında). Backend kapalıysa HİÇBİRİ ölçülmez ve testler
 *              "geçti" değil "atlandı" der.
 *
 * Beklenen alan listeleri ELLE YAZILMAZ: sözleşme YAML'ından okunur
 * (`requiredOf`). Sözleşmede bir alan adı değişirse bu test canlı gövdede o
 * alanı bulamaz ve KIRMIZI yanar — tip dosyasıyla aynı doğruluk kaynağı.
 */

/** Node globalleri — tarayıcı lint profili `process`i tanımaz, `globalThis` ES yerleşiği. */
const { env } = globalThis.process;

const HERE = fileURLToPath(new URL(".", import.meta.url));
/** src/lib/api/__tests__ → …/istoc/tradehub_core */
const SPEC = join(HERE, "../../../../../../tradehub_core/docs/api/openapi-http.yaml");
const BASE = env.ISTOC_HTTP_BASE || "http://istoc.localhost";
const API = `${BASE}/api/method`;
const CONTAINER = env.E2E_BACKEND_CONTAINER || "istoc-dev-backend-1";
const SITE = env.E2E_SITE || "istoc.localhost";
const SELLER_USER = env.E2E_SELLER_USER || "ali.bal@turksab.com";
/** Oturumlu ölçüm bench'te sid basar (~10 sn) — her `npm test`i yavaşlatmasın. */
const SESSION_ISTENDI = env.ISTOC_CONTRACT === "1" || !!env.E2E_SID;

const specText = existsSync(SPEC) ? readFileSync(SPEC, "utf8") : null;

/**
 * Sözleşmedeki bir şemanın üst düzey `required` listesi. Üretilmiş YAML'ın
 * bilinen alt kümesini okur (tüm anahtarlar çift tırnaklı, girinti 2'şer):
 * şema `    "Ad":` satırında başlar, ilk `      "required":` bloğunun
 * `        - "alan"` satırları toplanır.
 */
function requiredOf(schemaName) {
  assert.ok(specText, "sözleşme dosyası okunamadı");
  const lines = specText.split("\n");
  const bas = lines.findIndex((l) => l === `    "${schemaName}":`);
  assert.notEqual(bas, -1, `sözleşmede şema yok: ${schemaName}`);
  const alanlar = [];
  let inRequired = false;
  for (let i = bas + 1; i < lines.length; i += 1) {
    const l = lines[i];
    if (/^ {4}"\S/.test(l)) break; // sıradaki şema
    if (l === '      "required":') {
      inRequired = true;
      continue;
    }
    if (inRequired) {
      const m = l.match(/^ {8}- "(.+)"$/);
      if (m) alanlar.push(m[1]);
      else break; // required bloğu bitti
    }
  }
  assert.ok(alanlar.length > 0, `şemanın required listesi boş: ${schemaName}`);
  return alanlar;
}

function assertShape(body, schemaName, ekstraTipler = {}) {
  for (const alan of requiredOf(schemaName)) {
    assert.ok(alan in body, `'${alan}' alanı yok (şema: ${schemaName})`);
  }
  for (const [alan, tip] of Object.entries(ekstraTipler)) {
    assert.equal(typeof body[alan], tip, `'${alan}' tipi ${tip} değil (şema: ${schemaName})`);
  }
}

async function httpJson(url, options = {}) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000), ...options });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

// ── Ortam keşfi — ölçemeyeceksek ATLA, uydurma ─────────────────────────

let canli = false;
let sid = "";
let csrf = "";
let oturumNedeni = "ISTOC_CONTRACT=1 verilmedi (bench'te sid basmak her koşuyu yavaşlatırdı)";

before(async () => {
  if (!specText) return;
  try {
    const probe = await fetch(`${API}/tradehub_core.api.media_manifest.get_manifest?listing=X`, {
      signal: AbortSignal.timeout(2500),
    });
    canli = probe.status === 200;
  } catch {
    canli = false;
  }
  if (!canli || !SESSION_ISTENDI) return;

  try {
    sid = env.E2E_SID || mintSid();
    const { body } = await httpJson(`${API}/tradehub_core.api.v1.auth.get_session_user`, {
      headers: { Cookie: `sid=${sid}` },
    });
    csrf = body?.message?.csrf_token || "";
    if (!csrf) {
      sid = "";
      oturumNedeni = "sid üretildi ama CSRF alınamadı";
    }
  } catch (e) {
    sid = "";
    oturumNedeni = `oturum basılamadı: ${String(e).slice(0, 120)}`;
  }
});

/** `tests/e2e/global-setup.ts` ile aynı desen — bench console'da satıcı sid'i. */
function mintSid() {
  const py = [
    "import frappe",
    "from frappe.sessions import Session",
    `user = ${JSON.stringify(SELLER_USER)}`,
    "frappe.set_user(user)",
    'frappe.form_dict["sid"] = "Guest"',
    "s = Session(user=user, resume=False, full_name=frappe.utils.get_fullname(user), user_type=frappe.db.get_value('User', user, 'user_type'))",
    "frappe.db.commit()",
    'print("E2E_SID=" + s.sid)',
  ].join("\n");
  const out = execFileSync(
    "docker",
    ["exec", "-i", CONTAINER, "bash", "-lc", `cd /home/frappe/frappe-bench && bench --site ${SITE} console`],
    { input: py, encoding: "utf8", timeout: 120000 }
  );
  const m = out.match(/E2E_SID=([0-9a-f]{16,})/);
  if (!m) throw new Error("bench console sid üretmedi");
  return m[1];
}

const misafir = (ad, fn) =>
  test(ad, async (t) => {
    if (!specText) return t.skip("ÖLÇÜLMEDİ — tradehub_core deposu ortamda yok");
    if (!canli) return t.skip(`ÖLÇÜLMEDİ — backend erişilemez (${BASE})`);
    await fn(t);
  });

const oturumlu = (ad, fn) =>
  test(ad, async (t) => {
    if (!specText) return t.skip("ÖLÇÜLMEDİ — tradehub_core deposu ortamda yok");
    if (!canli) return t.skip(`ÖLÇÜLMEDİ — backend erişilemez (${BASE})`);
    if (!sid) return t.skip(`ÖLÇÜLMEDİ — ${oturumNedeni}`);
    await fn(t);
  });

const sellerGet = (fn, params) =>
  httpJson(`${API}/tradehub_core.api.seller_media.${fn}?${new URLSearchParams(params)}`, {
    headers: { Cookie: `sid=${sid}` },
  });

// ── Misafir uçları ─────────────────────────────────────────────────────

misafir("get_manifest: Manifest şeklini tutuyor (misafir)", async () => {
  const { status, body } = await httpJson(
    `${API}/tradehub_core.api.media_manifest.get_manifest?listing=LST-00560`
  );
  assert.equal(status, 200);
  assertShape(body.message, "Manifest", { enabled: "boolean", etag: "string" });
  assert.ok(Array.isArray(body.message.renditions), "renditions dizi değil");
});

misafir("get_manifest_batch: ManifestBatch şeklini tutuyor; missing DAİMA boş", async () => {
  const { status, body } = await httpJson(
    `${API}/tradehub_core.api.media_manifest.get_manifest_batch?listings=${encodeURIComponent(
      JSON.stringify(["LST-00560", "LST-YOK-9999"])
    )}`
  );
  assert.equal(status, 200);
  assertShape(body.message, "ManifestBatch", {
    requested: "number",
    returned: "number",
    truncated: "boolean",
  });
  assert.deepEqual(body.message.missing, [], "missing boş değil — numaralandırma sızıntısı?");
});

misafir("rum.collect: text/plain gövdeyle 200 + RumAck", async () => {
  const { status, body } = await httpJson(`${API}/tradehub_core.api.rum.collect`, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({ samples: [] }),
  });
  assert.equal(status, 200);
  assertShape(body.message, "RumAck", { ok: "boolean" });
});

misafir("manifest_batch (dosya bazlı): misafire KAPALI — 403", async () => {
  const { status } = await httpJson(`${API}/tradehub_core.api.media_manifest.manifest_batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_urls: [] }),
  });
  assert.equal(status, 403);
});

// ── Oturumlu uçlar (ISTOC_CONTRACT=1) ──────────────────────────────────

oturumlu("manifest_batch: FileManifestBatch şekli; olmayan adres null", async () => {
  const { status, body } = await httpJson(
    `${API}/tradehub_core.api.media_manifest.manifest_batch`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sid=${sid}`,
        "X-Frappe-CSRF-Token": csrf,
      },
      body: JSON.stringify({ file_urls: ["/files/w6-contract-olmayan.png"] }),
    }
  );
  assert.equal(status, 200);
  assertShape(body.message, "FileManifestBatch", { requested: "number", max_batch: "number" });
  assert.equal(body.message.manifests["/files/w6-contract-olmayan.png"], null);
});

oturumlu("list_folders: FolderList şekli", async () => {
  const { status, body } = await sellerGet("list_folders", {});
  assert.equal(status, 200);
  assertShape(body.message, "FolderList", { max_depth: "number" });
  assert.ok(Array.isArray(body.message.folders));
});

oturumlu("list_orphans: OrphanList şekli + scan sınır bildirimi", async () => {
  const { status, body } = await sellerGet("list_orphans", {
    days_unused: "30",
    page_length: "5",
  });
  assert.equal(status, 200);
  assertShape(body.message, "OrphanList", { total: "number", days_unused: "number" });
  assert.equal(typeof body.message.scan.history_scanned, "boolean");
  assert.ok(Array.isArray(body.message.scan.failed_sources));
});

oturumlu("find_in_my_library: LibraryMatch şekli (eşleşmeyen hash)", async () => {
  const { status, body } = await sellerGet("find_in_my_library", { sha256: "a".repeat(64) });
  assert.equal(status, 200);
  assertShape(body.message, "LibraryMatch", { found: "boolean" });
  assert.equal(body.message.file, null);
});

oturumlu("get_my_summary: SellerSummary şekli", async () => {
  const { status, body } = await sellerGet("get_my_summary", {});
  assert.equal(status, 200);
  assertShape(body.message, "SellerSummary", { active: "number", bytes: "number" });
});
