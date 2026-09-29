#!/usr/bin/env node
/**
 * Derleme çıktısında sahte (mock) veri izi var mı? — MOGEM-685 F-03.
 *
 * KURAL (29 Eyl 2026, ürün kararı): Alpha, Beta ve RC'de sahte veri OLABİLİR, PROD'da HİÇ
 * olmamalı. PROD sunucudaki ayrı Dockerfile ile `VITE_LOGISTICS_MOCK` verilmeden derleniyor
 * (Jenkins rc-to-prod #47'de ölçüldü); bu betik aynı varsayılan derlemeyi tarar. İz bulunursa çıkış 1.
 *
 * ÖLÇÜLDÜ (29 Eyl): anahtardan önce varsayılan derlemede yedi dosyada sahte kayıt vardı
 * (`podSeed`, `exceptionsMock`, `reportsMock` parçaları; `pricing`, `returns`,
 * `packaging`, `PendingQueueView` içine gömülü tohumlar). Kural yazılıydı, denetleyen yoktu.
 * Eşi: tradehubfront/scripts/check-no-mock-in-build.mjs.
 *
 *   node scripts/check-no-mock-in-build.mjs [dist]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const kok = process.argv[2] ?? "dist";

/**
 * Sahte veriye özgü içerik izleri — tohum/mock modüllerindeki kayıt kimlikleri. Gerçek
 * kodda geçmiyorlar (kaynakta tarandı: yalnız mock/seed dosyaları, story'ler ve
 * `src/mocks/logistics/*.json`).
 */
const ICERIK_IZLERI = [
  { ad: "sahte sevkiyat kimliği (SHP-2026-…)", re: /SHP-2026-0\d{4}/ },
  { ad: "sahte ilan kimliği (LST-…)", re: /LST-[0-9A-F]{8}/ },
  { ad: "sahte takip numarası (YK-34001 / MNG-35004)", re: /YK-34001|MNG-35004/ },
  { ad: "sahte taşıyıcı hesabı (CACC-YK-PLATFORM)", re: /CACC-YK-PLATFORM/ },
  { ad: "mock depolama anahtarı (logistics.mock.…)", re: /logistics\.mock\./ },
];
/** Mock/tohum modüllerinden üretilen parça adları (Vite: <modül>-<özet>.js). */
const PARCA_IZI = /(?:^|\/)[A-Za-z]*(?:Mock|Seed|mock|seed)[A-Za-z]*-[\w-]{8}\.js$/;

function* dosyalar(dizin) {
  for (const ad of readdirSync(dizin)) {
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) yield* dosyalar(yol);
    else if (/\.(js|html|json)$/.test(ad)) yield yol;
  }
}

const bulgular = [];
let taranan = 0;
for (const yol of dosyalar(kok)) {
  taranan++;
  const goreli = relative(kok, yol);
  if (PARCA_IZI.test(goreli)) bulgular.push(`${goreli} — mock/tohum parçası`);
  const icerik = readFileSync(yol, "utf8");
  for (const { ad, re } of ICERIK_IZLERI) if (re.test(icerik)) bulgular.push(`${goreli} — ${ad}`);
}

if (taranan === 0) {
  console.error(`✗ ${kok} içinde taranacak dosya yok — derleme alınmamış olabilir.`);
  process.exit(2);
}
if (bulgular.length) {
  console.error(
    `✗ Derleme çıktısında sahte veri izi (${bulgular.length}) — ${taranan} dosya tarandı:`
  );
  for (const b of bulgular) console.error(`  - ${b}`);
  console.error(
    "PROD derlemesinde sahte veri olmamalı. Mock dalını `__LOJISTIK_MOCK__ && mockCalisiyor()` kapısının arkasına alın (bkz. src/api/logisticsMockGate.js)."
  );
  process.exit(1);
}
console.log(`✓ Sahte veri izi yok — ${taranan} dosya tarandı.`);
