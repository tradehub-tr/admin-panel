// GÖRÜNÜM MODU DEĞİŞMEZLERİ — lojistik ekranları.
//
// NEDEN BU TEST VAR:
//   Görünüm modu üç ayrı yerde bozulabiliyor ve üçü de build'i kırmıyor,
//   testleri kırmıyor, yalnız kullanıcı görüyor:
//     1. Toggle'a bir mod eklenir ama o modun render dalı yazılmaz →
//        düğme basılır, ekran değişmez (ÖLÜ DÜĞME).
//     2. Kanban'a sürükle-bırak eklenir → kart bırakıldığı yerde durmaz,
//        bir sonraki yüklemede eski kovasına döner (kova sevkiyatın
//        verisinden hesaplanıyor, sürüklemek onu değiştirmiyor).
//     3. Kanban penceresine sığmayan kayıtlar sessizce düşer → kullanıcı
//        panoyu "hepsi bu" diye okur.
//
// OPT-IN:
//   Kurallar YALNIZ `ViewModeToggle` kullanan dosyalara uygulanıyor. Toggle'ı
//   olmayan ekran bu testten etkilenmiyor — yani henüz mod eklenmemiş
//   ekranlar (Bora'nın 24 ekranı dahil) ilk günden kırmızı başlamıyor.
//   Mod eklendiği anda kurallar kendiliğinden devreye giriyor.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ROOTS = ["views/logistics", "components/logistics"];

function vueFilesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return vueFilesUnder(full);
    return entry.name.endsWith(".vue") ? [full] : [];
  });
}

/** Toggle kullanan lojistik ekranları — testin tüm kapsamı bu. */
function toggleKullananlar() {
  const files = ROOTS.flatMap((root) => vueFilesUnder(join(SRC, root)));
  return files
    .map((abs) => ({ rel: relative(SRC, abs), source: readFileSync(abs, "utf8") }))
    .filter(({ source }) => /<ViewModeToggle/.test(source));
}

/** `:modes="['table', 'grid', …]"` içindeki mod adları. */
function bildirilenModlar(source) {
  const m = source.match(/:modes="\[([^\]]+)\]"/);
  if (!m) return [];
  return [...m[1].matchAll(/['"](\w+)['"]/g)].map((x) => x[1]);
}

test("toggle kullanan her ekran GERÇEKTEN toggle kullanıyor (tarama çalışıyor)", () => {
  // Tarama bozulursa (dizin taşınır, bileşen adı değişir) bu dosya sessizce
  // sıfır dosya denetler ve "hepsi geçti" der. Alt sınır o yüzden var.
  assert.ok(
    toggleKullananlar().length >= 2,
    "hiç toggle kullanan lojistik ekranı bulunamadı — tarama bozulmuş olabilir"
  );
});

test("her toggle modu için bir RENDER DALI var — ölü düğme yok", () => {
  for (const { rel, source } of toggleKullananlar()) {
    const modlar = bildirilenModlar(source);
    assert.ok(modlar.length >= 2, `${rel}: \`:modes\` okunamadı`);

    // Bir mod `v-else` ile çiziliyor (varsayılan dal) ve adı geçmez.
    // Geri kalan HEPSİNİN açık bir dalı olmalı.
    const daliOlan = modlar.filter((mod) => {
      const dogrudan = new RegExp(`viewMode === ["']${mod}["']`).test(source);
      // `isKanban` gibi türetilmiş bayraklar da dal sayılır — ama bayrağın
      // kendisi moda bağlanmış olmalı, yoksa isim uydurmak testi kandırırdı.
      const takmaAd = new RegExp(
        `const is${mod[0].toUpperCase()}${mod.slice(1)} = computed\\(\\(\\) => viewMode\\.value === ["']${mod}["']`
      ).test(source);
      return dogrudan || takmaAd;
    });

    assert.ok(
      daliOlan.length >= modlar.length - 1,
      `${rel}: ${modlar.length} mod bildirilmiş ama yalnız ${daliOlan.length} tanesinin render dalı var — ` +
        `dalı olmayan: ${modlar.filter((m) => !daliOlan.includes(m)).join(", ")} (biri v-else olabilir)`
    );
  }
});

test("toggle mobilde GİZLİ — dar ekranda kompakt liste zorunlu", () => {
  // Dört modu telefonda seçtirmek yerleşimi bozuyor; panelin kuralı
  // `hidden lg:flex` (DocTypeListView / CatalogListScreen deseni).
  for (const { rel, source } of toggleKullananlar()) {
    const etiket = source.match(/<ViewModeToggle[\s\S]{0,400}?\/>/);
    assert.ok(etiket, `${rel}: ViewModeToggle etiketi okunamadı`);
    assert.match(
      etiket[0],
      /class="[^"]*hidden lg:flex/,
      `${rel}: ViewModeToggle mobilde gizlenmiyor (\`hidden lg:flex\` yok)`
    );
  }
});

test("mod bir composable'da saklanıyor — ekran kendi state'ini uydurmuyor", () => {
  // `const viewMode = ref("table")` yazmak kolay ama seçim sayfa yenilenince
  // kayboluyor ve mobil zorlaması hiç çalışmıyor.
  for (const { rel, source } of toggleKullananlar()) {
    // İMPORT DEĞİL ÇAĞRI aranıyor: composable import edilip kullanılmadan
    // `const viewMode = ref("table")` yazmak testi kandırıyordu (mutasyonla
    // ölçüldü, 2026-08-19).
    assert.match(
      source,
      /\b(useResponsiveViewMode|useListViewMode)\s*\(/,
      `${rel}: görünüm modu composable ile yönetilmeli (useResponsiveViewMode / useListViewMode)`
    );
  }
});

test("KANBAN salt-okunur — sürükle-bırak yok", () => {
  // Kova sevkiyatın verisinden hesaplanıyor (`bucketOf`: koli girilmiş mi,
  // etiket üretilmiş mi). Kartı başka sütuna sürüklemek koliyi paketlemiyor;
  // kart bir sonraki yüklemede eski kovasına döner ve kullanıcı işi yaptığını
  // sanır. Sevkiyat panosunda gerekçe de farklı ama sonuç aynı: durum
  // değişikliği gerekçe zorunlu bir formdan geçiyor, sürükleme onu atlar.
  const YASAK = [
    { ad: "draggable", desen: /\bdraggable\b/ },
    { ad: "@dragstart", desen: /@dragstart|@drop\b|@dragover/ },
    { ad: "kanban-card-draggable", desen: /kanban-card-draggable/ },
    { ad: "vuedraggable", desen: /vuedraggable|<draggable/i },
  ];

  for (const { rel, source } of toggleKullananlar()) {
    if (!bildirilenModlar(source).includes("kanban")) continue;
    for (const { ad, desen } of YASAK) {
      assert.ok(
        !desen.test(source),
        `${rel}: kanban salt-okunur olmalı ama "${ad}" kullanılmış`
      );
    }
  }
});

test("kanban penceresi SESSİZ kırpmıyor — sığmayan kayıt söyleniyor", () => {
  // Pano tek istekte sınırlı sayıda kayıt yüklüyor. Sınır aşıldığında ekran
  // bunu söylemezse kullanıcı panoyu tam liste sanar ve eksik iş görür.
  for (const { rel, source } of toggleKullananlar()) {
    if (!/KANBAN_PAGE_SIZE/.test(source)) continue;
    assert.match(
      source,
      /kanbanTruncated/,
      `${rel}: kanban için ayrı sayfa boyutu var ama kırpma uyarısı (\`kanbanTruncated\`) yok`
    );
  }
});

test("kanban açıkken kova pill'leri gizleniyor — iki filtre yan yana durmuyor", () => {
  // Pill bir kovayı seçerken pano dördünü birden gösteriyor; ikisi yan yana
  // durursa hangisinin geçerli olduğu okunmuyor.
  for (const { rel, source } of toggleKullananlar()) {
    if (!bildirilenModlar(source).includes("kanban")) continue;
    if (!/<StatusFilterPills/.test(source)) continue;

    const etiket = source.match(/<StatusFilterPills[\s\S]{0,300}?\/>/);
    assert.ok(etiket, `${rel}: StatusFilterPills etiketi okunamadı`);
    assert.match(
      etiket[0],
      /v-if="!isKanban"|v-if="viewMode !== ['"]kanban['"]"/,
      `${rel}: kanban modunda kova pill'leri gizlenmiyor`
    );
  }
});
