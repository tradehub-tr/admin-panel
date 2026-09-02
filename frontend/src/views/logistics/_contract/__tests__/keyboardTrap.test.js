// KLAVYE TUZAĞI KİLİDİ — WCAG 2.1.2 (No Keyboard Trap).
//
// NEDEN BU TEST VAR:
//   `ScanInput.vue` barkod okuyucuyu yakalamak için `document` üzerine
//   `keydown` dinleyicisi kuruyor ve Tab'ı `preventDefault` ediyordu. Muafiyet
//   yalnız INPUT/TEXTAREA/SELECT içindi, yani odak bir BUTONA geçtiği an Tab
//   yutuluyordu; `shiftKey` dalı hiç yoktu, geri yön de kapalıydı. Sonuç:
//   paketleme çalışma alanından FARE OLMADAN çıkılamıyordu ve aynı ekranda
//   yaşayan `ConfirmDialog`un kendi Tab döngüsü de ölüyordu (ölçüldü
//   2026-08-28). Düzeltme iki parçalı: (1) Tab hiç yakalanmıyor, sıradaki koli
//   F3'e taşındı; (2) dinleyici `document`tan çalışma alanının kabına indi.
//
// NEDEN KAYNAK DÜZEYİNDE:
//   Projede jsdom YOK (`node:test` + `node:assert`, `CLAUDE.md` §1.2) ve
//   `.vue` tek dosya bileşenleri node tarafından import EDİLEMİYOR. Davranışı
//   saf bir fonksiyona çıkarmak daha güçlü bir iddia olurdu ama bu tur yeni
//   kaynak modülü açmıyor; onun yerine tuzağı ÜRETEN mekanizmalar
//   (belge düzeyinde dinleyici + Tab dalı) kaynakta yasaklanıyor. İddia dar
//   ama yanılmaz: bu iki mekanizma olmadan global bir Tab tuzağı kurulamaz.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const ROOTS = ["views/logistics", "components/logistics"];

const SCAN_INPUT = "views/logistics/packages/components/ScanInput.vue";
const WORKSPACE = "views/logistics/packages/PackingWorkspaceView.vue";
const REPRINT_DIALOG = "views/logistics/labels/components/ReprintReasonDialog.vue";

function vueFilesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return vueFilesUnder(full);
    return entry.name.endsWith(".vue") ? [full] : [];
  });
}

function read(rel) {
  return readFileSync(join(SRC_DIR, rel), "utf8");
}

/** Yorumlar denetim dışı — tarihçe anlatan yorum yasak deseni geçirebiliyor. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(?<!:)\/\/[^\n]*/g, "");
}

/** `<script>` gövdesi, yorumlar temizlenmiş. Template denetim dışı. */
function scriptOf(source) {
  const bloklar = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
  return stripComments(bloklar.map((m) => m[1]).join("\n"));
}

test("hiçbir lojistik ekranı Tab tuşunu betikte yakalamıyor", () => {
  // Tab, tarayıcının odak gezinme sözleşmesidir. Bir ekranın onu KENDİ
  // anlamına çevirmesi, o anlamı bilmeyen herkesi ekrana kilitler. Tab'ı
  // meşru biçimde ele alan tek yer modal odak tuzağıdır ve o da template'te
  // `@keydown.tab` ile KAPSAMLI bir kaba bağlanıp ortak `trapTabKey`e
  // devredilir — betikte elle `event.key === "Tab"` dalı açılmaz.
  for (const root of ROOTS) {
    for (const file of vueFilesUnder(join(SRC_DIR, root))) {
      const rel = relative(SRC_DIR, file);
      const script = scriptOf(readFileSync(file, "utf8"));
      assert.ok(
        !/["']Tab["']/.test(script),
        `${rel}: betikte Tab tuşu ele alınıyor — klavye tuzağı riski (WCAG 2.1.2). ` +
          `Sıradaki-öge kısayolu için çakışmayan bir tuş kullan (ScanInput: F3); ` +
          `modal odak döngüsü için @keydown.tab + trapTabKey (ResolveDialog deseni).`
      );
    }
  }
});

test("ScanInput tuşları belgede değil, çalışma alanının kabında dinliyor", () => {
  const script = scriptOf(read(SCAN_INPUT));

  assert.ok(
    !/(document|window)\s*\.\s*addEventListener\(\s*["']key/.test(script),
    "ScanInput belge/pencere düzeyinde tuş dinliyor — sayfadaki HER katmanın " +
      "tuşlarını görür (teleport edilen diyaloglar dahil). Dinleyici kaba bağlanmalı."
  );
  assert.match(
    script,
    /scopeEl\?\.addEventListener\(\s*"keydown"/,
    "ScanInput dinleyicisi çözümlenen kaba (`scopeEl`) bağlanmalı"
  );
  assert.match(
    script,
    /closest\(\s*"\[data-scan-scope\]"\s*\)/,
    "Kap `data-scan-scope` işaretiyle bulunmalı"
  );
  assert.match(
    script,
    /scopeEl\?\.contains\(\s*event\.target\s*\)/,
    "Kap dışından gelen olay hiç işlenmemeli — `contains` koruması şart"
  );
  assert.match(
    read(WORKSPACE),
    /data-scan-scope/,
    "Çalışma alanı kökü `data-scan-scope` ile işaretlenmeli, yoksa kap bileşenin " +
      "kendi kutusuna daralır ve okutma yalnız kutu odaktayken çalışır"
  );
});

test("ScanInput yalnız F2 / F3 / Enter tuşlarını sahipleniyor", () => {
  // Sahiplenilen tuşların TAM kümesi kilitleniyor: yeni bir tuş eklemek
  // (özellikle Tab, Escape, ok tuşları) bilinçli bir karar olmalı, kopyala-
  // yapıştırla sızmamalı.
  const script = scriptOf(read(SCAN_INPUT));
  const keys = [...script.matchAll(/event\.key\s*===\s*"([^"]+)"/g)].map((m) => m[1]);

  assert.deepEqual(
    [...new Set(keys)].sort(),
    ["Enter", "F2", "F3"],
    "ScanInput'un sahiplendiği tuş kümesi değişmiş — Tab ve Escape gibi " +
      "tarayıcı/katman sözleşmesine ait tuşlar bu listeye giremez"
  );
});

test("barkod tamponu yalnız metin alanı DIŞINDA toplanıyor", () => {
  // Korumasız hâlde dikte, otomatik doldurma ya da hızlı yazan bir kullanıcı
  // tamponu dolduruyor ve Enter'da beklenmedik bir OKUTMA tetikleniyordu.
  const script = scriptOf(read(SCAN_INPUT));
  const guardIdx = script.indexOf("if (isTypingInField(event.target)) return;");
  const bufferIdx = script.indexOf("buffer += event.key");

  assert.ok(guardIdx > -1, "Tampon dalında `isTypingInField` koruması yok");
  assert.ok(bufferIdx > -1, "Tampon toplama satırı bulunamadı — test bayatlamış olabilir");
  assert.ok(
    guardIdx < bufferIdx,
    "`isTypingInField` koruması tampon toplamadan ÖNCE gelmeli, sonra değil"
  );
});

test("ReprintReasonDialog ortak odak tuzağı sözleşmesini uyguluyor", () => {
  // Kardeş `ResolveDialog` ile aynı desen. Bu dosyada odak yönetimi HİÇ yoktu:
  // açılışta odak arkada kalıyor, Tab arkadaki sayfayı geziyor, Esc çalışmıyor
  // ve kapanışta odak <body>'ye düşüyordu (WCAG 2.1.2 / 2.4.3 / 4.1.2).
  const source = read(REPRINT_DIALOG);

  for (const [desen, aciklama] of [
    [/role="dialog"/, 'role="dialog"'],
    [/aria-modal="true"/, 'aria-modal="true"'],
    [/:aria-labelledby="titleId"/, "aria-labelledby (görünür başlığa bağlı)"],
    [/@keydown\.esc=/, "Esc ile kapatma"],
    [/@keydown\.tab="trapTab"/, "Tab döngüsü"],
    [/trapTabKey\(e, panelRef\.value\)/, "ortak trapTabKey kullanımı"],
    [/restoreFocus\(lastActive\)/, "kapanışta odağın tetikleyiciye iadesi"],
    [/focusablesIn\(panelRef\.value\)\[0\]\?\.focus\(\)/, "açılışta ilk kontrole odak"],
  ]) {
    assert.match(source, desen, `ReprintReasonDialog: ${aciklama} eksik`);
  }

  assert.ok(
    !/aria-label="?\{?t\('logistics\.label\.reprintTitle'\)/.test(source),
    "Diyalog adı `aria-label` ile değil, GÖRÜNEN başlığa `aria-labelledby` ile bağlanmalı"
  );
});
