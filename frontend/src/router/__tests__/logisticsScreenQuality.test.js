// Lojistik ekranlarının EKSİKSİZLİK denetimi.
//
// NEDEN VAR:
//   13-FE teslim edildikten sonra dokuz eksik, kullanıcının tek tek sorması
//   üzerine ortaya çıktı: palet ekranına giden buton yoktu, satıcı menüsünde
//   ekran hiç görünmüyordu, bir seçim listesinin kaynağı yoktu, boş durum
//   yanlış cümle kuruyordu. Hiçbiri build'i veya mevcut testleri kırmıyordu —
//   çünkü hepsi "dosya yazıldı mı" değil "ekran kullanılabilir mi" sorusuna
//   aitti.
//
//   Bu dosya o soruyu OTOMATİK sorar. Yeni bir ekran manifeste girdiği anda
//   kendiliğinden kapsanır; kimsenin kontrol listesi işletmesi gerekmez.
//
// NE DEĞİL:
//   Tasarım denetimi değil. "Buton doğru yerde mi" sorusunu sormaz, "buton
//   var mı, çalışır mı, kime görünür mü" sorar.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { LOGISTICS_SCREENS } from "../logisticsScreens.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const VIEWS = join(HERE, "../../views/logistics");

/** `views/logistics` altındaki tüm .vue dosyaları (alt dizinler dahil). */
function vueFiles(dir = VIEWS, prefix = "") {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? vueFiles(join(dir, e.name), `${prefix}${e.name}/`)
      : e.name.endsWith(".vue")
        ? [{ rel: `${prefix}${e.name}`, abs: join(dir, e.name) }]
        : []
  );
}

const COMPONENTS = join(HERE, "../../components/logistics");

/**
 * Bir ekranın TÜM kaynağı: container + devrettiği sunum bileşenleri.
 *
 * Container'lar ince: veriyi store'dan alıp `…Screen.vue`'ye veriyor ve boş /
 * hata durumunu ORASI çiziyor. Yalnız container'a bakan bir denetim
 * "M1 boş durum sunmuyor" der — oysa sunuyor, bir katman altta.
 */
function screenSource(entryAbs) {
  const seen = new Set();
  const parts = [];

  const visit = (abs) => {
    if (!abs || seen.has(abs)) return;
    seen.add(abs);
    let text;
    try {
      text = readFileSync(abs, "utf8");
    } catch {
      return; // proje dışı import — atla
    }
    parts.push(text);
    for (const m of text.matchAll(/from\s+"(@\/components\/logistics\/[\w/]+\.vue|\.[\w./]+\.vue)"/g)) {
      const spec = m[1];
      visit(
        spec.startsWith("@/components/logistics/")
          ? join(COMPONENTS, spec.replace("@/components/logistics/", ""))
          : join(dirname(abs), spec)
      );
    }
  };

  visit(entryAbs);
  return parts.join("\n");
}

/** Manifestteki hazır ekranlar — container dosyası + birleşik kaynağı. */
function readyScreenFiles() {
  const files = vueFiles();
  const manifest = readFileSync(join(HERE, "../logisticsScreens.js"), "utf8");
  return LOGISTICS_SCREENS.filter((s) => s.ready).map((screen) => {
    const block = manifest.slice(manifest.indexOf(`key: "${screen.key}"`));
    const match = block.match(/views\/logistics\/([\w/]+\.vue)/);
    assert.ok(match, `${screen.key} için component yolu okunamadı`);
    const file = files.find((f) => f.rel === match[1]);
    assert.ok(file, `${screen.key} → ${match[1]} dosyası yok`);
    return { screen, ...file, source: screenSource(file.abs) };
  });
}

// ── 1. Yükleniyor / boş / hata durumları ─────────────────────────────

test("her hazır ekran YÜKLENİYOR durumunu gösteriyor", () => {
  // Veri gelene kadar boş ekran göstermek, kullanıcıya "hiç kayıt yok"
  // dedirtiyor. Skeleton ya da aria-busy zorunlu.
  for (const { screen, rel, source } of readyScreenFiles()) {
    const hasLoading = /Skeleton|aria-busy|loading/i.test(source);
    assert.ok(hasLoading, `${screen.key} (${rel}) yükleniyor durumu sunmuyor`);
  }
});

test("her hazır ekran HATA durumunu gösteriyor", () => {
  // Hata yutulursa ekran sessizce boş kalır ve kullanıcı yetkisi mi yok,
  // veri mi yok anlayamaz.
  for (const { screen, rel, source } of readyScreenFiles()) {
    const hasError = /ErrorState|error/i.test(source);
    assert.ok(hasError, `${screen.key} (${rel}) hata durumu sunmuyor`);
  }
});

test("liste/koleksiyon ekranları BOŞ durumu kendi nedeniyle anlatıyor", () => {
  // "Kayıt yok" ile "bu filtrede kayıt yok" farklı şeyler; ikincisinde
  // kullanıcı filtreyi temizlemek ister. Ayrıca boş durum, sonraki adımı
  // göstermeli (ör. "İlk koliyi oluştur").
  const COLLECTION_KEYS = ["M1", "B1", "G0", "G1", "G2", "G3"];
  for (const { screen, rel, source } of readyScreenFiles()) {
    if (!COLLECTION_KEYS.includes(screen.key)) continue;
    const hasEmpty = /EmptyState|empty\.|\.empty|noPackages|Empty/i.test(source);
    assert.ok(hasEmpty, `${screen.key} (${rel}) boş durum sunmuyor`);
  }
});

// ── 2. Yetki bağı ────────────────────────────────────────────────────

test("yazma eylemi olan ekran yetkiye BAĞLI", () => {
  // Yetkisiz kullanıcıya çalışmayacak buton çizmek, ona backend hatası
  // yedirmek demek. `can` üzerinden gizlenmeli.
  for (const { screen, rel, source } of readyScreenFiles()) {
    // Kaydetme/oluşturma/silme eylemi içeriyor mu?
    const writes = /@click="[^"]*(save|add|remove|generate|complete|reprint|void|markReady|assign)/i.test(source);
    if (!writes) continue;
    const guarded = /can\.|canWrite|v-if="can/.test(source);
    assert.ok(guarded, `${screen.key} (${rel}) yazma eylemi var ama yetki kontrolü yok`);
  }
});

// ── 3. i18n bütünlüğü ────────────────────────────────────────────────

test("ekranların kullandığı çeviri anahtarları tr VE en'de var", async () => {
  // Eksik anahtar ekranda ham `logistics.foo.bar` metni olarak görünüyor —
  // build'i kırmıyor, testler geçiyor, yalnız kullanıcı görüyor.
  const tr = (await import("../../i18n/locales/tr.js")).default;
  const en = (await import("../../i18n/locales/en.js")).default;
  const get = (obj, path) => path.split(".").reduce((o, p) => (o == null ? o : o[p]), obj);

  const keys = new Set();
  // Hazır ekranların birleşik kaynağı — container + sunum bileşenleri.
  for (const { source } of readyScreenFiles()) {
    for (const m of source.matchAll(/\bt\(\s*["'`]([\w.]+)["'`]/g)) keys.add(m[1]);
  }
  // Yalnız HAZIR ekranların menü etiketi — açılmamış ekranların çevirisi
  // henüz yazılmamış olabilir ve bu beklenen durumdur (manifest sözleşmesi:
  // `ready: false` = ekran yok demek, eksik çeviri değil).
  for (const screen of LOGISTICS_SCREENS) {
    if (screen.ready && screen.labelKey) keys.add(screen.labelKey);
  }

  const missing = [...keys].filter(
    (k) => typeof get(tr, k) !== "string" || typeof get(en, k) !== "string"
  );
  assert.deepEqual(missing, [], `çevirisi eksik anahtarlar: ${missing.join(", ")}`);
  assert.ok(keys.size > 50, "anahtar taraması çalışmıyor olabilir");
});

// ── 4. Seçim listelerinin kaynağı ────────────────────────────────────

test("ekrandaki seçim listeleri SABİT değil, veriden besleniyor", () => {
  // Palet tipi listesi mock'ta gömülüydü ve "yeni tip nereden eklenecek?"
  // sorusunun cevabı hiçbir yerdi. Seçenekler ya sunucudan gelmeli ya
  // sözleşmede tanımlı bir sabitten — bileşenin içine gömülmemeli.
  for (const { screen, rel, abs } of readyScreenFiles()) {
    const source = readFileSync(abs, "utf8");
    const optionBlocks = source.match(/:options="(\w+)"/g) ?? [];
    for (const block of optionBlocks) {
      const name = block.match(/:options="(\w+)"/)[1];
      // Aynı dosyada `const <name> = [ ... ]` biçiminde SABİT dizi tanımı
      // varsa, seçenekler bileşene gömülmüş demektir.
      const inlineArray = new RegExp(`const\\s+${name}\\s*=\\s*\\[`).test(source);
      assert.ok(
        !inlineArray,
        `${screen.key} (${rel}): "${name}" seçenekleri bileşene gömülü — veriden ya da paylaşılan sabitten gelmeli`
      );
    }
  }
});
