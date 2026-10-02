import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { createI18n } from "vue-i18n";
import { renderToString } from "@vue/server-renderer";

import tr from "../../../i18n/locales/tr.js";
import en from "../../../i18n/locales/en.js";
import ru from "../../../i18n/locales/ru.js";
import ar from "../../../i18n/locales/ar.js";
import { rect } from "../../../lib/media/crop/geometry.js";
import { slotProfiles } from "../../../lib/media/crop/slotProfiles.js";
import { cropWarnings } from "../../../lib/media/crop/cropWarnings.js";
import { jpegProfilliyken } from "../../../lib/media/crop/__tests__/jpegProfil.js";

/**
 * Crop Studio erişilebilirliği.
 *
 *   ÖLÇÜLDÜ  — sunucu çıktısındaki ARIA sözleşmesi (8 tutamağın her biri
 *              odaklanabilir ve adlandırılmış, `role`/`aria-value*` eksiksiz),
 *              klavye ince ayarının varlığı, canlı bölge, oran düğmelerinin
 *              radiogroup semantiği, dört dilde metin varlığı.
 *   ÖLÇÜLMEDİ — gerçek ekran okuyucu (NVDA/VoiceOver), görsel odak halkası,
 *              tarayıcıdaki gerçek Tab sırası, DPR ≥ 2'de tutamak isabeti.
 *              Bunlar canlı tarayıcı ister; bu görevde tarayıcı doğrulaması
 *              YAPILMADI.
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
let server;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    plugins: [vue()],
    resolve: { alias: { "@": `${frontendRoot}/src` } },
    server: { middlewareMode: true },
    appType: "custom",
  });
});

after(async () => {
  await server?.close();
});

const i18n = () =>
  createI18n({ legacy: false, locale: "tr", fallbackLocale: "tr", messages: { tr, en } });

async function render(path, props) {
  const { default: Component } = await server.ssrLoadModule(path);
  const app = createSSRApp({ render: () => h(Component, props) });
  app.use(i18n());
  return renderToString(app);
}

const HANDLES = "/src/components/media/crop/CropHandles.vue";
const TOOLBAR = "/src/components/media/crop/CropToolbar.vue";
const NOTICE = "/src/components/media/crop/CropPolicyNotice.vue";

const handleProps = {
  win: rect(200, 150, 400, 300),
  base: rect(0, 0, 1000, 800),
  sourceW: 1000,
  sourceH: 800,
  focalX: 0.4,
  focalY: 0.6,
  scale: 0.5,
};

// ── 8 tutamak ─────────────────────────────────────────────────────

test("8 tutamağın tamamı DOM'da ve klavyeyle odaklanabilir", async () => {
  const html = await render(HANDLES, handleProps);
  const grips = html.match(/tabindex="0"/g) || [];
  // 8 tutamak `tabindex="0"` taşır; gövde ve odak zaten <button> (doğal odak).
  assert.equal(grips.length, 8, "8 tutamak da Tab sırasında olmalı");
  assert.equal((html.match(/role="slider"/g) || []).length, 9, "8 tutamak + gövde");
});

test("her tutamak Türkçe erişilebilir ad taşır", async () => {
  const html = await render(HANDLES, handleProps);
  for (const label of [
    "Sol üst köşe",
    "Üst kenar",
    "Sağ üst köşe",
    "Sağ kenar",
    "Sağ alt köşe",
    "Alt kenar",
    "Sol alt köşe",
    "Sol kenar",
    "Kadrajı taşı",
    "Odak noktası",
  ]) {
    assert.ok(html.includes(label), `eksik ad: ${label}`);
  }
});

test("role=slider sözleşmesi eksiksiz — valuenow/min/max/valuetext", async () => {
  const html = await render(HANDLES, handleProps);
  const sliders = html.match(/role="slider"[^>]*/g) || [];
  assert.equal(sliders.length, 9);
  // `aria-*` nitelikleri `role`'den önce de basılabilir; tek tek etikete
  // bakmak yerine sayıları karşılaştırıyoruz — her slider'a bir tane düşmeli.
  assert.equal((html.match(/aria-valuenow="/g) || []).length, 9);
  assert.equal((html.match(/aria-valuemin="/g) || []).length, 9);
  assert.equal((html.match(/aria-valuemax="/g) || []).length, 9);
  assert.equal((html.match(/aria-valuetext="Kadraj 400 × 300 piksel"/g) || []).length, 9);
});

test("kenar tutamakları eksenini söyler", async () => {
  const html = await render(HANDLES, handleProps);
  assert.equal((html.match(/aria-orientation="vertical"/g) || []).length, 2, "n ve s");
  assert.equal((html.match(/aria-orientation="horizontal"/g) || []).length, 6);
});

test("odak tutamağı pencereden bağımsız konumlanır", async () => {
  const html = await render(HANDLES, { ...handleProps, focalX: 0.4, focalY: 0.6 });
  // 0,4×1000 = 400 kaynak px; pencerenin solu 200 → 200 kaynak px × 0,5 ölçek.
  assert.match(html, /chandles__focal[^>]*left:100px/);
});

test("kadraj ekranda daralınca tutamaklar gizlenir, gövde ve klavye kalır", async () => {
  const dar = await render(HANDLES, { ...handleProps, win: rect(0, 0, 40, 30), scale: 0.5 });
  assert.equal((dar.match(/chandles__grip--tiny/g) || []).length, 8);
  assert.ok(dar.includes("chandles__body"), "gövde her hâlde durur");
});

// ── Araç çubuğu ───────────────────────────────────────────────────

const coverOptions = [
  { id: "a", targetAR: 1000 / 563, label: "16:9", width: 1000, height: 563, labelMisleading: true },
];

test("oran düğmeleri radiogroup, seçili olan aria-checked", async () => {
  const html = await render(TOOLBAR, {
    options: coverOptions,
    lockedRatio: 1000 / 563,
    zoom: 1,
  });
  assert.match(html, /role="radiogroup"/);
  assert.equal((html.match(/role="radio"/g) || []).length, 2, "Serbest + 1 oran");
  assert.equal((html.match(/aria-checked="true"/g) || []).length, 1);
});

test("etiket ≠ gerçek oran olan düğme yıldızla işaretlenir", async () => {
  const html = await render(TOOLBAR, { options: coverOptions, lockedRatio: null, zoom: 1 });
  assert.match(html, /<sup[^>]*>\*<\/sup>/);
  assert.ok(html.includes("Profil boyutu: 1000×563"));
});

test("kırpılmayan slotta oran seçeneği yerine gerekçe gösterilir", async () => {
  const html = await render(TOOLBAR, { options: [], lockedRatio: null, zoom: 1 });
  assert.ok(html.includes("Bu slotta kırpılan profil yok."));
});

test("zoom kaydırıcısı etiketli ve sınırlı", async () => {
  const html = await render(TOOLBAR, { options: [], lockedRatio: null, zoom: 2.5 });
  assert.match(html, /type="range"/);
  assert.match(html, /min="1"/);
  assert.match(html, /max="16"/);
  assert.match(html, /aria-valuetext="2.50×"/);
});

test("geri/ileri düğmeleri boş geçmişte devre dışı", async () => {
  const html = await render(TOOLBAR, {
    options: [],
    lockedRatio: null,
    zoom: 1,
    canUndo: false,
    canRedo: false,
  });
  assert.ok(html.includes('aria-label="Geri al"'));
  assert.ok(html.includes('aria-label="Yinele"'));
  assert.equal((html.match(/disabled/g) || []).length >= 2, true);
});

test("öneri rozeti güveni GÖSTERİR ve 'yüz bulundu' DEMEZ", async () => {
  const html = await render(TOOLBAR, {
    options: [],
    lockedRatio: null,
    zoom: 1,
    suggestion: { confidence: 0.42, method: "edge_energy_v1" },
    approvedByUser: false,
    threshold: 0.5,
  });
  assert.ok(html.includes("Otomatik öneri · güven %42"));
  assert.ok(html.includes("(eşiğin altında)"));
  // HTML yorumları SSR çıktısına giriyor; iddia GÖRÜNEN metne bakmalı.
  const gorunen = html.replace(/<!--[\s\S]*?-->/g, "");
  assert.ok(!/yüz|face/i.test(gorunen), "yüz tespiti iddiası olmamalı");
});

test("kullanıcı kadraja dokununca öneri rozeti düşer", async () => {
  const html = await render(TOOLBAR, {
    options: [],
    lockedRatio: null,
    zoom: 1,
    suggestion: { confidence: 0.9, method: "edge_energy_v1" },
    approvedByUser: true,
  });
  assert.ok(!html.includes("Otomatik öneri · güven"));
});

// ── Uyarılar ve canlı bölge ───────────────────────────────────────

test("kadraj boyutu canlı bölgeden duyurulur", async () => {
  const html = await render(NOTICE, { warnings: [], pixelBox: [0, 0, 1200, 675] });
  assert.match(html, /aria-live="polite"/);
  assert.ok(html.includes("Kadraj 1200 × 675 piksel"));
  assert.ok(html.includes("Bu kadrajda politika uyarısı yok."));
});

test("engelleyici bulgu hem listede hem canlı bölgede", async () => {
  // Kırpılan profil company.cover_video/poster_1280 (1280×720); 2026-09-30'dan
  // beri company.cover_image kırpılmıyor, orada bu engel doğmaz.
  const w = cropWarnings({
    sourceW: 4000,
    sourceH: 3000,
    win: rect(0, 0, 1000, 562.5),
    slotKey: "company.cover_video",
  });
  const html = await render(NOTICE, { warnings: w, pixelBox: [0, 0, 1000, 563] });
  assert.ok(html.includes("cnotice__item--block"));
  assert.ok(html.includes("bu boyut profil için yetersiz"));
  assert.ok(html.includes("1280×720"));
});

test("bilgi uyarısı engel gibi görünmez", async () => {
  const w = cropWarnings({
    sourceW: 2000,
    sourceH: 1500,
    win: null,
    slotKey: "company.cover_image",
  });
  const html = await render(NOTICE, { warnings: w, pixelBox: null });
  assert.ok(html.includes("cnotice__item--info"));
  assert.ok(!html.includes("cnotice__item--block"));
});

// ── i18n kapsamı ──────────────────────────────────────────────────

test("cropStudio metinleri dört dilde de var", async () => {
  const langs = await Promise.all(
    ["tr", "en", "ru", "ar"].map((l) =>
      import(`../../../i18n/locales/${l}.js`).then((m) => [l, m.default])
    )
  );
  const yollar = [
    "title",
    "slot",
    "toolbar.ratio",
    "toolbar.suggest",
    "handle.nw",
    "handle.focal",
    "live.size",
    "preview.title",
    "notice.title",
    "warn.tooSmallForProfile",
    "save.unavailable",
  ];
  for (const [lang, msgs] of langs) {
    for (const yol of yollar) {
      const v = yol.split(".").reduce((o, k) => o?.[k], msgs.cropStudio);
      assert.equal(typeof v, "string", `${lang} · cropStudio.${yol}`);
      assert.ok(v.length > 0, `${lang} · cropStudio.${yol} boş`);
    }
  }
});

/** Uyarı kimliklerinin tamamı — üç fixture birleşimi. */
function tumUyarilar() {
  return [
    ...cropWarnings({
      sourceW: 8000,
      sourceH: 6000,
      win: rect(0, 0, 400, 225),
      slotKey: "company.cover_video",
      probe: { mode: "CMYK", hasAlpha: true },
      slotMismatch: true,
    }),
    ...cropWarnings({
      sourceW: 8000,
      sourceH: 6000,
      win: rect(0, 0, 1200, 300),
      slotKey: "company.cover_image",
    }),
    // alphaToJpeg: bugün katalog AVIF — JPEG profil geçici kurulur (bkz. jpegProfil.js).
    ...jpegProfilliyken("brand.logo", "og1200x630", () =>
      cropWarnings({
        sourceW: 2000,
        sourceH: 1500,
        win: null,
        slotKey: "brand.logo",
        probe: { hasAlpha: true },
      })
    ),
    ...cropWarnings({
      sourceW: 4000,
      sourceH: 3000,
      win: rect(0, 0, 1000, 563),
      slotKey: "company.cover_image",
      focal: { x: 0, y: 0.5 },
      suggestion: {
        thresholdCalibrated: false,
        threshold: 0.5,
        source: "server",
        reason: "measured",
        measured: true,
      },
    }),
  ];
}

/**
 * Metin BULUNUYOR mu — anahtarın nerede tanımlı olduğuna bakmadan.
 *
 * Yeni uyarı metinleri bileşen kapsamında duruyor (`src/i18n/locales/*.js` bu
 * görevde başka bir ajanın dosyası). Anahtarın hangi katmanda çözüldüğünü
 * ölçmek yanlış soru; ölçülmesi gereken, ekranda ham anahtarın GÖRÜNMEMESİ.
 * vue-i18n çözemediği anahtarı olduğu gibi basar, yani bu kontrol gerçek bir
 * kapıdır — eksik çeviri sessizce geçemez.
 */
test("uyarı kimliklerinin her biri dört dilde de metne çözülüyor", async () => {
  const uyarilar = tumUyarilar();
  const ids = new Set(uyarilar.map((w) => w.id));
  assert.equal(ids.size, 11, "üretilen uyarı türü sayısı");
  const { default: NoticeComponent } = await server.ssrLoadModule(NOTICE);

  for (const [dil, mesajlar] of Object.entries({ tr, en, ru, ar })) {
    const app = createSSRApp({
      render: () => h(NoticeComponent, { warnings: uyarilar, pixelBox: [0, 0, 1000, 563] }),
    });
    app.use(
      createI18n({ legacy: false, locale: dil, fallbackLocale: dil, messages: { [dil]: mesajlar } })
    );
    const html = await renderToString(app);
    assert.ok(
      !html.includes("cropStudio.warn."),
      `${dil}: ham anahtar ekrana düştü — çeviri eksik`
    );
    for (const id of ids) {
      assert.ok(!html.includes(`warn.${id}`), `${dil}: ${id} çözülmedi`);
    }
  }
});

// ── Önizleme şeridi boş durumu ────────────────────────────────────

test("önizleme şeridi türev YOKKEN de anlamlı — kaynaktan üretiliyor", async () => {
  const ortak = { bitmap: null, win: rect(0, 0, 1000, 563), sourceW: 4000, sourceH: 3000 };
  const kapak = await render("/src/components/media/crop/CropPreviewStrip.vue", {
    ...ortak,
    profiles: slotProfiles("company.cover_image"),
  });
  assert.ok(kapak.includes("Kaynaktan üretiliyor — sunucu türevi henüz yok."));
  // Mağaza kapağı 2026-09-30'dan beri oranı korur: 5 `contain` profilinin
  // HİÇBİRİ kırpılmıyor; kullanıcı bunu her kartın rozetinden görmeli.
  assert.equal((kapak.match(/kırpılmıyor/g) || []).length, 5);
  assert.ok(kapak.includes("cover_1920"));

  // Kırpılan slotta rozet YOK — "kırpılmıyor" her karta yapışmıyor.
  const video = await render("/src/components/media/crop/CropPreviewStrip.vue", {
    ...ortak,
    profiles: slotProfiles("company.cover_video"),
  });
  assert.equal((video.match(/kırpılmıyor/g) || []).length, 0);
  assert.ok(video.includes("poster_1280"));
});

test("her kart sunucu türevinin YOKLUĞUNU kendi başına ilan eder", async () => {
  const profiller = slotProfiles("company.cover_image");
  const html = await render("/src/components/media/crop/CropPreviewStrip.vue", {
    profiles: profiller,
    bitmap: null,
    win: rect(0, 0, 1000, 563),
    sourceW: 4000,
    sourceH: 3000,
    renditions: [],
  });
  // `Media Rendition` tablosu bugün BOŞ (bayraklar kapalı). Kart başına
  // söylenmesi gerekiyor: şerit başlığındaki tek cümle, hangi profilin
  // türevinin eksik olduğunu göstermiyor.
  assert.equal(
    (html.match(/sunucu türevi yok/g) || []).length,
    profiller.length,
    "her profil kartı boş durumu ayrı ayrı söylemeli"
  );
});

test("sunucu türevi VARSA kart onu söyler — boş durum yanlışlıkla yapışmaz", async () => {
  const html = await render("/src/components/media/crop/CropPreviewStrip.vue", {
    profiles: slotProfiles("company.cover_image"),
    bitmap: null,
    win: rect(0, 0, 1000, 563),
    sourceW: 4000,
    sourceH: 3000,
    renditions: [{ profile: "cover_1280", format: "webp" }],
  });
  assert.ok(html.includes("sunucu türevi · webp"));
  assert.equal((html.match(/sunucu türevi yok/g) || []).length, 4);
});

test("güvenli alan bandı yalnız kuralı OLAN slotta ve kırpılan profilde çizilir", async () => {
  const ortak = { bitmap: null, win: rect(0, 0, 1000, 563), sourceW: 4000, sourceH: 3000 };
  const band = { rule: "safe_area_center_width_fraction", fraction: 0.417, axis: "x" };
  const strip = "/src/components/media/crop/CropPreviewStrip.vue";

  // Kırpılan profiller (company.cover_video: 3/3) + bant → her kırpılan
  // profilde bir bant.
  const kirpilan = slotProfiles("company.cover_video");
  const bantli = await render(strip, { ...ortak, profiles: kirpilan, band });
  assert.equal((bantli.match(/cpreview__band/g) || []).length, kirpilan.length);
  assert.ok(bantli.includes("%42"), "yüzde ipucu metninde görünmeli (0,417 → %42)");

  // company.cover_image politikada güvenli alan kuralını HÂLÂ taşıyor
  // (`safeBandFor` → 0,417, x) ama 2026-09-30'dan beri 5 profilin tamamı
  // `contain` — kırpılmayan profilde kadraj kesilmez, bant ÇİZİLMEZ.
  const kapak = await render(strip, {
    ...ortak,
    profiles: slotProfiles("company.cover_image"),
    band,
  });
  assert.equal((kapak.match(/cpreview__band/g) || []).length, 0, "contain profilde bant yok");

  const bantsiz = await render(strip, { ...ortak, profiles: kirpilan });
  assert.equal((bantsiz.match(/cpreview__band/g) || []).length, 0, "kuralsız slotta bant çizilmez");
});

test("profilsiz slotta önizleme boş durumu birinci sınıf", async () => {
  const html = await render("/src/components/media/crop/CropPreviewStrip.vue", {
    profiles: [],
    bitmap: null,
    win: null,
    sourceW: 100,
    sourceH: 100,
  });
  assert.ok(html.includes("Bu slot için profil tanımlı değil."));
});

test("kaynak okunamazsa tuval sebebi söyler", async () => {
  const html = await render("/src/components/media/crop/CropCanvas.vue", {
    src: "",
    sourceW: 100,
    sourceH: 100,
  });
  assert.ok(html.includes("Kaynak görsel okunamadı"));
});

// ── Kaynak taraması: klavye yolu gerçekten bağlı mı ───────────────

test("tutamaklar ok tuşlarını yakalıyor ve olayı yukarı sızdırmıyor", () => {
  const src = readFileSync(new URL("../crop/CropHandles.vue", import.meta.url), "utf8");
  assert.match(src, /@keydown="onKeydown\(/);
  assert.match(src, /event\.key\.startsWith\("Arrow"\)/);
  // `useMediaShortcuts` window'da ok tuşu dinliyor; sızarsa ızgarada da gezinir.
  assert.match(src, /event\.stopPropagation\(\)/);
  assert.match(src, /emit\("nudge", handle, event\.key, event\.shiftKey\)/);
});
