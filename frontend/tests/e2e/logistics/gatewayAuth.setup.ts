import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { request } from "@playwright/test";

/**
 * Lojistik E2E oturum üreteci — GATEWAY koşumu için.
 *
 * NEDEN VAR: `playwright.logistics.config.ts` `globalSetup` taşımıyor; sid'ler
 * bir kez elle backend konteynerinde üretilip `playwright/.auth/*.json`
 * dosyalarına yazılmıştı. O dosyalar yalnız üreten makinede duruyor — başka
 * bir makinede suite hiç koşmuyor, ilk `goto` login formunda ölüyor.
 * Ölçüldü 7 Eyl 2026: bu depoda `playwright/.auth/` dizini HİÇ yoktu ve
 * Bora'nın 92 testi bir kez bile koşturulamamıştı.
 *
 * Oturumu UI'dan değil `/api/method/login` ile açar (form ekranına bağımlı
 * değil), dönen `sid` çerezini iki ayrı duruma yazar. Parolalar kökteki
 * git'siz `.env.e2e`'den geliyor; `e2e.sh` onları ortama koyar.
 */

const BASE = process.env.PANEL_BASE ?? "http://tradehub.localhost";

const HESAPLAR = [
  {
    ad: "admin",
    kullanici: process.env.PANEL_USER ?? "Administrator",
    parola: process.env.PANEL_PASS ?? "",
    parolaDegiskeni: "PANEL_PASS",
    dosya: "playwright/.auth/admin-logistics.json",
  },
  {
    ad: "satıcı",
    kullanici: process.env.SELLER_USER ?? "ali.bal@turksab.com",
    parola: process.env.SELLER_PASS ?? "",
    parolaDegiskeni: "SELLER_PASS",
    dosya: "playwright/.auth/seller-logistics.json",
  },
];

export default async function globalSetup(): Promise<void> {
  for (const hesap of HESAPLAR) {
    if (!hesap.parola) {
      throw new Error(
        `${hesap.parolaDegiskeni} tanımlı değil — ${hesap.ad} oturumu açılamıyor. ` +
          `Kök dizinden \`./e2e.sh --bora\` ile koş (parolalar .env.e2e'den okunur).`
      );
    }

    const api = await request.newContext({ baseURL: BASE });
    const res = await api.post("/api/method/login", {
      form: { usr: hesap.kullanici, pwd: hesap.parola },
    });
    if (!res.ok()) {
      throw new Error(
        `${hesap.ad} girişi başarısız (${res.status()}) — kullanıcı "${hesap.kullanici}" ` +
          `ya da ${hesap.parolaDegiskeni} yanlış. Gövde: ${(await res.text()).slice(0, 200)}`
      );
    }

    mkdirSync(dirname(hesap.dosya), { recursive: true });
    await api.storageState({ path: hesap.dosya });
    await api.dispose();
  }
}
