import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Oturum düzeneği — bir kez satıcı oturumu açıp `storageState`e yazar.
 *
 * ── Neden form login DEĞİL de sunucu tarafı oturum enjeksiyonu ──────────
 * Panel yalnız satıcı/admin oturumuna açık; satıcı fixture kullanıcılarının
 * (`ali.bal@turksab.com` vb.) dev parolası YOK ve `Administrator`'ın mağazası
 * yok (satıcı medya uçları 403 döner — `ownership.current_store` ölçüldü).
 * Bu yüzden oturum, backend konteynerinde `frappe.sessions.Session` ile bir
 * kez üretilip `sid` cookie'si `storageState`e yazılıyor. Bu, Playwright'ın
 * "bir kez giriş yap, storageState sakla" desenidir; yalnız giriş adımı form
 * yerine sunucu tarafı. Üretilen tek iz kısa ömürlü bir `Sessions` satırıdır.
 *
 * Ortam değişkenleriyle geçersiz kılınabilir:
 *   E2E_BACKEND_CONTAINER (vars: istoc-dev-backend-1)
 *   E2E_SITE              (vars: istoc.localhost)
 *   E2E_SELLER_USER       (vars: ali.bal@turksab.com — mağaza SEL-00003)
 */
const CONTAINER = process.env.E2E_BACKEND_CONTAINER || "istoc-dev-backend-1";
const SITE = process.env.E2E_SITE || "istoc.localhost";
const SELLER_USER = process.env.E2E_SELLER_USER || "ali.bal@turksab.com";
const STORAGE_STATE = "playwright/.auth/seller.json";

/** Backend konteynerinde bir oturum üretir, `sid` döndürür. */
function mintSellerSid(): string {
  const py = [
    "import frappe",
    "from frappe.sessions import Session",
    `user = ${JSON.stringify(SELLER_USER)}`,
    "frappe.set_user(user)",
    // `Session.__init__` istek dışı bağlamda `frappe.request.cookies`i okuyor;
    // form_dict'e sid yazmak bu yolu susturuyor (ölçülmüş workaround).
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
  if (!m) {
    throw new Error(
      `Satıcı oturumu üretilemedi. Konteyner (${CONTAINER}) / site (${SITE}) / kullanıcı (${SELLER_USER}) doğru mu?\nÇıktı:\n${out}`
    );
  }
  return m[1];
}

export default async function globalSetup(): Promise<void> {
  const sid = mintSellerSid();

  // Panel `istoc.localhost` üzerinden servis ediliyor; cookie SameSite=None;Secure.
  const state = {
    cookies: [
      {
        name: "sid",
        value: sid,
        domain: "istoc.localhost",
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: true,
        sameSite: "None" as const,
      },
    ],
    origins: [],
  };

  mkdirSync(dirname(STORAGE_STATE), { recursive: true });
  writeFileSync(STORAGE_STATE, JSON.stringify(state, null, 2));

  // Testlerin request-context'i CSRF alabilsin diye sid'i ortama da koy.
  process.env.E2E_SID = sid;
}
