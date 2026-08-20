import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { createServer } from "vite";

import { cropShortcut, isTyping } from "../../lib/media/crop/cropShortcuts.js";
import { fromServerSuggestion } from "../../lib/media/crop/focusSuggest.js";
import {
  cropWindow,
  focalFromWindow,
  rect,
  roundWindow,
  zoomBase,
} from "../../lib/media/crop/geometry.js";

/**
 * Crop Studio durum makinesi — jest, geçmiş ve kalıcılaştırma birlikte.
 *
 *   ÖLÇÜLÜR  — pencerenin `crop_geometry` zincirinin ta kendisi olduğu
 *              (vektör dosyasındaki beklentiyle karşılaştırılarak),
 *              geri al/yinele'nin DOĞRU duruma dönmesi, jest başına tek adım,
 *              kaydetme ucunun yokluğunun dürüstçe ilan edilmesi ve
 *              `useMediaShortcuts` ile kısayol çakışmasının kapatılması.
 *   ÖLÇÜLMEZ — tarayıcıdaki gerçek olay sırası ve `pointermove` akışı.
 */

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));
const VECTORS = JSON.parse(
  readFileSync(new URL("../../lib/media/crop/vendor/crop_vectors.json", import.meta.url), "utf8")
);

let server;
let useCropStudio;
let validateIntentPayload;
let INTENT_METHODS;

before(async () => {
  // `@/` alias'ı için Vite; composable uygulama yollarını kullanıyor.
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    resolve: { alias: { "@": `${frontendRoot}/src` } },
    server: { middlewareMode: true },
    appType: "custom",
  });
  ({ useCropStudio, validateIntentPayload, INTENT_METHODS } = await server.ssrLoadModule(
    "/src/composables/useCropStudio.js"
  ));
});

after(async () => {
  await server?.close();
});

const SOURCE = { width: 4000, height: 3000, url: "/files/x.jpg" };
const COVER = "company.cover_image";
/** 1000/563 — ETİKETTEN değil, profil boyutundan. */
const AR = 1000 / 563;

function clock(start = 0) {
  let t = start;
  return { now: () => t, ilerle: (ms) => (t += ms) };
}

const make = (over = {}) => useCropStudio({ source: SOURCE, slotKey: COVER, ...over });

// ── Geometri zinciri ──────────────────────────────────────────────

test("başlangıç penceresi crop_geometry zincirinin ta kendisi", () => {
  const s = make();
  assert.equal(s.lockedAR.value, AR, "oran profil boyutundan gelmeli");

  const base = zoomBase(4000, 3000, 1, 0.5, 0.5);
  const beklenen = cropWindow(4000, 3000, base, AR, 0.5, 0.5);
  assert.deepEqual({ ...s.base.value }, { ...base });
  assert.deepEqual({ ...s.win.value }, { ...beklenen });
  assert.deepEqual(s.pixelBox.value, roundWindow(beklenen, 4000, 3000));
});

test("vektör dosyasındaki cropWindow beklentisi stüdyoda birebir çıkıyor", () => {
  // Kare kaynakta, 16:9 hedefte, merkez odakta — vektör V0004/V0253 ailesi.
  const s = useCropStudio({ source: { width: 1120, height: 1120 }, slotKey: COVER });
  s.setRatio(16 / 9);

  const v = VECTORS.vectors.find(
    (x) => x.fn === "cropWindow" && x.case === "cropWindow/tam/kare-p50/16:9/merkez"
  );
  if (v) {
    assert.equal(s.win.value.x, v.out.x);
    assert.equal(s.win.value.y, v.out.y);
    assert.equal(s.win.value.w, v.out.w);
    assert.equal(s.win.value.h, v.out.h);
  } else {
    // Vektör adı değişmişse bile referans hesabı yine vektör dosyasından gelen
    // fonksiyonla yapılır; kendi matematiğimizi yazmıyoruz.
    const beklenen = cropWindow(1120, 1120, rect(0, 0, 1120, 1120), 16 / 9, 0.5, 0.5);
    assert.deepEqual({ ...s.win.value }, { ...beklenen });
  }
  assert.equal(s.win.value.w, 1120);
  assert.equal(s.win.value.h, 630, "V0004: ratioFit(1120,1120,16:9,inside) = 1120×630");
});

test("gövde sürüklemesi ODAĞI günceller — saklanan pencere değil odaktır", () => {
  const s = make();
  const once = { ...s.win.value };
  s.dragBody(300, 200);
  const sonra = s.win.value;

  assert.equal(sonra.w, once.w, "gövde sürüklemesi boyut değiştirmez");
  assert.equal(sonra.h, once.h);
  const f = focalFromWindow(sonra, 4000, 3000);
  assert.ok(Math.abs(s.focalX.value - f.x) < 1e-12);
  assert.ok(Math.abs(s.focalY.value - f.y) < 1e-12);
  assert.equal(s.overrideRect.value, null, "kilitliyken override gerekmez");
});

test("odak → pencere → odak gidiş dönüşü ≤ 0,5 px", () => {
  const s = make();
  for (const [fx, fy] of [
    [0.1, 0.1],
    [0.5, 0.5],
    [0.9, 0.2],
    [0.33, 0.87],
  ]) {
    s.dragFocal(fx, fy);
    const win = s.win.value;
    const geri = focalFromWindow(win, 4000, 3000);
    s.dragFocal(geri.x, geri.y);
    const win2 = s.win.value;
    assert.ok(Math.abs(win2.x - win.x) <= 0.5, `x ${win2.x} ≠ ${win.x}`);
    assert.ok(Math.abs(win2.y - win.y) <= 0.5, `y ${win2.y} ≠ ${win.y}`);
  }
});

test("kilitli tutamak çekmesi ZOOM'a yazılır, override açılmaz", () => {
  const s = make();
  const once = s.win.value.w;
  s.dragHandle("se", -600, -400);
  assert.ok(s.win.value.w < once, "pencere küçülmeli");
  assert.ok(s.zoom.value > 1, "küçültmek = yakınlaştırmak");
  assert.equal(s.overrideRect.value, null);
  // Oran korunmalı — crop.py::RATIO_TOLERANCE %0,5.
  const sapma = Math.abs(s.win.value.w / s.win.value.h - AR) / AR;
  assert.ok(sapma <= 0.005, `oran sapması ${sapma}`);
});

test("serbest tutamak çekmesi OVERRIDE açar — crop.py 1. seviyesi", () => {
  const s = make();
  s.setRatio(null);
  s.dragHandle("se", -500, 100);
  const o = s.overrideRect.value;
  assert.ok(o, "elle çizilen kadraj odakla ifade edilemez");
  // Normalize saklanır: küçültülmüş bir kopyada da aynı yere düşsün.
  assert.ok(o.x >= 0 && o.x <= 1 && o.w > 0 && o.w <= 1);
  // `Media Crop Override.profile` bir Link'tir (→ Media Profile); slot bir
  // profil DEĞİLDİR. Panel eskiden buraya `slot_key` yazıyordu ve sunucu o
  // yükü reddederdi (`pipeline/api/crop.py::_parse_overrides`).
  const satir = s.savePayload.value.overrides[0];
  assert.ok(satir.profile, "override satırı profil adı taşımalı");
  assert.equal(satir.slot_key, undefined, "slot_key artık gönderilmiyor");
  assert.ok(s.overrideProfiles.value.includes(satir.profile));
});

test("oran kilidi geri gelince override düşer, pencere sıçramaz", () => {
  const s = make();
  s.setRatio(null);
  s.dragHandle("se", -900, 300);
  assert.ok(s.overrideRect.value);
  s.setRatio(AR);
  assert.equal(s.overrideRect.value, null);
  const sapma = Math.abs(s.win.value.w / s.win.value.h - AR) / AR;
  assert.ok(sapma <= 0.005);
});

test("pencere HİÇBİR jestte taban bölgeden taşmıyor", () => {
  const s = make();
  const jestler = [
    () => s.dragBody(9999, 9999),
    () => s.dragBody(-9999, -9999),
    () => s.dragHandle("nw", -9999, -9999),
    () => s.dragHandle("se", 9999, 9999),
    () => s.setZoom(16),
    () => s.dragFocal(0, 0),
    () => s.dragFocal(1, 1),
    () => s.pan(9999, 9999),
    () => s.setZoom(1),
  ];
  for (const jest of jestler) {
    jest();
    const b = s.base.value;
    const w = s.win.value;
    assert.ok(w.x >= b.x - 1e-9 && w.y >= b.y - 1e-9);
    assert.ok(w.x + w.w <= b.x + b.w + 1e-9);
    assert.ok(w.y + w.h <= b.y + b.h + 1e-9);
  }
});

test("zoom 1…16 arasında sıkışır", () => {
  const s = make();
  s.setZoom(999);
  assert.equal(s.zoom.value, 16);
  s.setZoom(-5);
  assert.equal(s.zoom.value, 1);
});

// ── Geri al / yinele ──────────────────────────────────────────────

test("geri al DOĞRU kadraja döner, yinele geri getirir", () => {
  const c = clock();
  const s = useCropStudio({ source: SOURCE, slotKey: COVER, now: c.now });

  const w0 = { ...s.win.value };
  c.ilerle(1000);
  s.dragBody(400, 250);
  s.endGesture("drag:body");
  const w1 = { ...s.win.value };

  c.ilerle(1000);
  s.dragHandle("se", -800, -450);
  s.endGesture("drag:se");
  const w2 = { ...s.win.value };

  assert.notDeepEqual(w1, w0);
  assert.notDeepEqual(w2, w1);
  assert.equal(s.canUndo.value, true);

  s.undo();
  assert.deepEqual({ ...s.win.value }, w1, "birinci geri al ikinci jesti geri almalı");
  s.undo();
  assert.deepEqual({ ...s.win.value }, w0, "ikinci geri al başlangıca dönmeli");
  assert.equal(s.canUndo.value, false);

  s.redo();
  assert.deepEqual({ ...s.win.value }, w1);
  s.redo();
  assert.deepEqual({ ...s.win.value }, w2);
  assert.equal(s.canRedo.value, false);
});

test("bir sürükleme jesti = tam olarak 1 geçmiş adımı", () => {
  const c = clock();
  const s = useCropStudio({ source: SOURCE, slotKey: COVER, now: c.now });
  const once = s.historyDepth.value;

  // 40 `pointermove` — yığın bunlardan haberdar olmamalı.
  for (let i = 0; i < 40; i += 1) s.dragBody(3, 2);
  assert.equal(s.historyDepth.value, once, "sürükleme sırasında yığına yazılmaz");

  s.endGesture("drag:body"); // pointerup
  assert.equal(s.historyDepth.value, once + 1);
});

// NOT: `company.cover_image` hedef oranı (1,776) kaynağın oranından (4:3)
// geniş olduğu için pencere taban bölgeyi YATAYDA daima doldurur — yatayda
// oynatacak boşluk yoktur, bu geometrinin doğru davranışı. İnce ayar bu
// profilde dikeyde ölçülür.
test("ok tuşu ince ayarı 1 px oynatır ve tek adımda birleşir", () => {
  const c = clock();
  const s = useCropStudio({ source: SOURCE, slotKey: COVER, now: c.now });
  const once = { ...s.win.value };
  const derinlik = s.historyDepth.value;
  assert.ok(once.h < s.base.value.h, "dikeyde oynatacak boşluk olmalı");

  for (let i = 0; i < 10; i += 1) {
    c.ilerle(30);
    assert.equal(s.nudge("body", "ArrowDown"), true);
  }
  assert.ok(Math.abs(s.win.value.y - (once.y + 10)) < 1e-6, "10 basış = 10 px");
  assert.equal(s.historyDepth.value, derinlik + 1, "birleşmiş tek adım");

  s.undo();
  assert.deepEqual({ ...s.win.value }, once, "tek geri al hepsini geri almalı");
});

test("Shift ile ok tuşu 10 px", () => {
  const s = make();
  const once = s.win.value.y;
  s.nudge("body", "ArrowDown", true);
  assert.ok(Math.abs(s.win.value.y - (once + 10)) < 1e-6);
});

test("yatayda boşluk yoksa ok tuşu kadrajı taban bölgenin DIŞINA itmez", () => {
  const s = make();
  const once = { ...s.win.value };
  s.nudge("body", "ArrowRight", true);
  assert.deepEqual({ ...s.win.value }, once, "sıkışmış eksende jest sessizce durur");
});

test("ok olmayan tuş tüketilmez", () => {
  const s = make();
  assert.equal(s.nudge("body", "Enter"), false);
});

test("sıfırlama geçmişi ve durumu başa alır", () => {
  const c = clock();
  const s = useCropStudio({ source: SOURCE, slotKey: COVER, now: c.now });
  c.ilerle(1000);
  s.setZoom(8);
  s.endGesture("zoom");
  s.reset();
  assert.equal(s.zoom.value, 1);
  assert.equal(s.canUndo.value, false);
  assert.equal(s.historyDepth.value, 1);
});

// ── Öneri ─────────────────────────────────────────────────────────

test("öneri uygulanınca rozet açılır, kullanıcı dokununca düşer", () => {
  const s = make();
  s.applySuggestion({ x: 0.3, y: 0.7, confidence: 0.42, method: "edge_energy_v1" });
  assert.equal(s.approvedByUser.value, false);
  assert.equal(s.savePayload.value.approved_by_user, 0);
  // Algoritma etiketi `method`e YAZILMAZ: spec'in Select'i yalnız
  // manual/smartcrop/center tanır, algoritmanın kimliği ayrı iki alandadır.
  assert.equal(s.savePayload.value.method, "smartcrop");
  assert.equal(s.savePayload.value.algorithm, "edge_energy");
  assert.equal(s.savePayload.value.algorithm_version, "v1");
  assert.equal(s.savePayload.value.confidence, 0.42);

  s.dragBody(10, 10);
  assert.equal(s.approvedByUser.value, true, "kadraja dokunmak onaydır");
  assert.equal(s.savePayload.value.approved_by_user, 1);
});

test("elle çizilen kadrajda method manual, güven 1", () => {
  const s = make();
  s.dragBody(50, 50);
  assert.equal(s.savePayload.value.method, "manual");
  assert.equal(s.savePayload.value.confidence, 1);
  assert.equal(s.savePayload.value.approved_by_user, 1);
});

// ── Kaydetme ──────────────────────────────────────────────────────

test("varlık verilmeden kaydetme kapalıdır", () => {
  const s = make();
  assert.equal(s.saveAvailable.value, false, "asset yokken kaydedilecek hedef yok");
  assert.equal(s.endpoint.doctype, "Media Crop Intent");
  assert.equal(s.endpoint.method, "tradehub_core.api.media_crop.save_intent");
});

test("varlık verilince kaydetme açılır ve uca gerçek yük gider", async () => {
  const gonderilen = [];
  const s = useCropStudio({
    source: { width: 3000, height: 2000 },
    slotKey: COVER,
    asset: "ASSET-1",
    saveIntent: async (p) => {
      gonderilen.push(p);
      return { exists: true, intent: { focal_x: p.focal_x } };
    },
  });
  assert.equal(s.saveAvailable.value, true);

  s.dragBody(50, 50);
  const sonuc = await s.save();

  assert.equal(gonderilen.length, 1, "uç tam bir kez çağrılmalı");
  assert.equal(gonderilen[0].asset, "ASSET-1");
  assert.equal(gonderilen[0].method, "manual");
  assert.ok(sonuc.exists);
  assert.equal(s.saveError.value, null);
  assert.ok(s.savedAt.value > 0);
});

test("kaydetme hatası YUTULMAZ — sebep saveError'da kalır", async () => {
  const s = useCropStudio({
    source: { width: 3000, height: 2000 },
    slotKey: COVER,
    asset: "ASSET-1",
    saveIntent: async () => {
      throw new Error("focal_x 0 ile 1 arasında olmalı");
    },
  });
  await assert.rejects(() => s.save());
  assert.match(s.saveError.value, /0 ile 1/);
  assert.equal(s.savedAt.value, null, "başarısız kayıt zaman damgası yazmamalı");
});

test("politika engeli varken kaydetme kapalı kalır", () => {
  const s = useCropStudio({
    source: { width: 500, height: 400 },
    slotKey: COVER,
    asset: "ASSET-1",
  });
  assert.equal(s.blocked.value, true);
  assert.equal(s.saveAvailable.value, false, "engelli kadraj kalıcılaştırılmamalı");
});

test("kaydetme yükü Media Crop Intent alanlarından ibaret — yeni alan icat YOK", () => {
  const s = make();
  assert.deepEqual(Object.keys(s.savePayload.value).sort(), [
    "algorithm",
    "algorithm_version",
    "approved_by_user",
    // Zoom üçlüsü DocType'ta artık VAR (zoom, center_x, center_y —
    // T-105/T-114 zinciri): kadrajın niyeti odakla birlikte bunlardır,
    // safe_area onlardan türetilen kutudur. Alan icat edilmedi, şemaya
    // eklendi (media_crop_intent.json + save_intent parametreleri).
    "center_x",
    "center_y",
    "confidence",
    "focal_x",
    "focal_y",
    "method",
    "overrides",
    // Uç parametresi bir KUTU; DocType kolonları safe_x/y/w/h.
    // `safe_top/right/bottom/left` diye bir alan YOK.
    "safe_area",
    "zoom",
  ]);
});

test("engelleyici uyarı varken kadraj yine hesaplanır — kilitlenme yok", () => {
  const s = useCropStudio({ source: { width: 500, height: 400 }, slotKey: COVER });
  assert.equal(s.blocked.value, true, "500 px kaynak 1000 px profili besleyemez");
  assert.ok(s.win.value, "yine de kadraj gösterilir");
});

test("ölçüsü bilinmeyen kaynakta stüdyo çalışmadığını söyler", () => {
  const s = useCropStudio({ source: { width: 0, height: 0 }, slotKey: COVER });
  assert.equal(s.usable, false);
  assert.equal(s.win.value, null);
  assert.equal(s.savePayload.value, null);
});

// ── Kısayol çakışması ─────────────────────────────────────────────

test("Ctrl/Cmd+Z geri al, Shift'li olan yinele", () => {
  assert.deepEqual(cropShortcut({ key: "z", ctrlKey: true }), { action: "undo" });
  assert.deepEqual(cropShortcut({ key: "z", metaKey: true }), { action: "undo" });
  assert.deepEqual(cropShortcut({ key: "Z", ctrlKey: true, shiftKey: true }), { action: "redo" });
});

test("+ / - zoom, L oran kilidi, Enter uygula", () => {
  assert.deepEqual(cropShortcut({ key: "+" }), { action: "zoomIn" });
  assert.deepEqual(cropShortcut({ key: "-" }), { action: "zoomOut" });
  assert.deepEqual(cropShortcut({ key: "l" }), { action: "toggleLock" });
  assert.deepEqual(cropShortcut({ key: "Enter" }), { action: "apply" });
});

test("metin alanında yazarken kısayol tüketilmez", () => {
  assert.equal(cropShortcut({ key: "l", target: { tagName: "INPUT" } }), null);
  assert.equal(isTyping({ tagName: "TEXTAREA" }), true);
  assert.equal(isTyping({ isContentEditable: true }), true);
  assert.equal(isTyping({ tagName: "DIV" }), false);
});

test("medya gezgininin kısayolları Crop Studio'ya sızmıyor", () => {
  // `useMediaShortcuts` şunları `window`'da tüketiyor: Ctrl+Z, Ctrl+A, oklar,
  // Enter, Space, p, a, Delete, Escape, /, f. Crop Studio yalnız kendi
  // tuşlarını alır ve onları YAKALAMA evresinde durdurur.
  for (const key of ["a", "p", "/", "f", "Delete", " ", "ArrowRight"]) {
    assert.equal(cropShortcut({ key }), null, `${key} bizim değil`);
  }
  assert.deepEqual(cropShortcut({ key: "a", ctrlKey: true }), null, "Ctrl+A gezginin");

  const modal = readFileSync(
    new URL("../../components/media/crop/CropStudioModal.vue", import.meta.url),
    "utf8"
  );
  // Yakalama evresi + stopPropagation olmadan `window` dinleyicisi de ateşler.
  assert.match(modal, /addEventListener\("keydown", onKeydown, true\)/);
  assert.match(modal, /removeEventListener\("keydown", onKeydown, true\)/);
  assert.match(modal, /event\.stopPropagation\(\)/);
});

// ── Kaydetme sözleşmesi (T-104) ───────────────────────────────────
//
// Uç canlı ama bu depodan oturum açılamıyor (HTTP 403). Bu yüzden ölçülen şey
// "sunucu ne dedi" değil, **yükün sözleşmeye uyup uymadığı**: kurallar
// `pipeline/api/envelope.py::require_unit`, `pipeline/api/crop.py::
// _parse_overrides` / `_parse_safe_area` ve `api/media_crop.py::INTENT_METHODS`
// dosyalarından okundu ve `validateIntentPayload` içinde birebir yazıldı.
// `__tests__/cropSafeArea.test.js` o yazımın canlı kaynakla eşleştiğini ayrıca
// doğruluyor; kaynak deposu ortamda yoksa "geçti" demiyor, atlıyor.

test("geçerli yük sözleşmeden geçer ve uca gider", async () => {
  const gonderilen = [];
  const s = useCropStudio({
    source: { width: 3000, height: 2000 },
    slotKey: COVER,
    asset: "ASSET-1",
    saveIntent: async (p) => {
      gonderilen.push(p);
      return { exists: true };
    },
  });
  s.setZoom(2);
  s.dragBody(40, 30);

  assert.deepEqual(s.payloadIssues.value, [], "geçerli yükte bulgu olmamalı");
  assert.equal(s.saveAvailable.value, true);
  await s.save();

  assert.equal(gonderilen.length, 1);
  const yuk = gonderilen[0];
  for (const alan of ["focal_x", "focal_y"]) {
    assert.ok(yuk[alan] >= 0 && yuk[alan] <= 1, `${alan} 0-1 aralığında olmalı`);
  }
  assert.ok(["manual", "smartcrop", "center"].includes(yuk.method));
});

test("0-1 DIŞI yük REDDEDİLİR — uca hiç gitmez, kelepçelenmez", async () => {
  let cagrildi = 0;
  const s = useCropStudio({
    source: { width: 3000, height: 2000 },
    slotKey: COVER,
    asset: "ASSET-1",
    saveIntent: async () => {
      cagrildi += 1;
      return {};
    },
  });

  // Doğrudan sözleşme kapısı: piksel gönderen bir çağıranın yükü.
  const bulgular = validateIntentPayload(
    { focal_x: 1.4, focal_y: 0.5, method: "manual", safe_area: {}, overrides: [] },
    { slotKey: COVER }
  );
  assert.equal(bulgular.length, 1);
  assert.match(bulgular[0], /focal_x 0 ile 1 arasında olmalı/);

  // Stüdyonun kendi yükü aralık dışına ÇIKAMAZ (geometri kelepçeliyor); bu
  // yüzden aralık dışı yol ayrıca ölçülüyor. Stüdyo yolu ise gönderiyor.
  await s.save();
  assert.equal(cagrildi, 1);
  assert.equal(s.payloadIssues.value.length, 0);
});

test("aralık dışı yük stüdyodan geçse bile save() UÇA GİTMEDEN durur", async () => {
  let cagrildi = 0;
  const s = useCropStudio({
    source: { width: 3000, height: 2000 },
    slotKey: COVER,
    asset: "ASSET-1",
    saveIntent: async () => {
      cagrildi += 1;
      return {};
    },
  });
  // Odak ref'ini doğrudan bozmak, "çağıran piksel gönderdi" durumunun ta
  // kendisi: 1.4 biraz taşmış bir kadraj değil, yanlış birimin kanıtıdır.
  s.focalX.value = 1.4;

  assert.equal(s.saveAvailable.value, false, "sözleşme dışı yükte kaydet kapalı");
  await assert.rejects(() => s.save(), /0 ile 1 arasında/);
  assert.equal(cagrildi, 0, "uç HİÇ çağrılmamalı");
  assert.match(s.saveError.value, /focal_x/);
});

test("overrides[].profile YANLIŞSA reddedilir — slot_key bir profil değildir", () => {
  const kutu = { x: 0.1, y: 0.1, w: 0.5, h: 0.3 };

  // Panelin eskiden gönderdiği şekil: slot anahtarı profil sanılıyordu.
  const slotAdi = validateIntentPayload(
    { focal_x: 0.5, focal_y: 0.5, overrides: [{ profile: COVER, ...kutu }] },
    { slotKey: COVER }
  );
  assert.equal(slotAdi.length, 1);
  assert.match(slotAdi[0], /bu slotta tanımlı bir profil değil/);

  // Profil adı hiç yoksa da reddedilir (`require_str`).
  const adsiz = validateIntentPayload(
    { focal_x: 0.5, focal_y: 0.5, overrides: [{ ...kutu }] },
    { slotKey: COVER }
  );
  assert.match(adsiz[0], /overrides\[\]\.profile/);

  // Aynı profil iki kez → `_parse_overrides` "iki kırpım" diye reddediyor.
  const cift = validateIntentPayload(
    {
      focal_x: 0.5,
      focal_y: 0.5,
      overrides: [
        { profile: "cover_16x9_1000", ...kutu },
        { profile: "cover_16x9_1000", ...kutu },
      ],
    },
    { slotKey: COVER }
  );
  assert.ok(cift.some((h) => /iki kırpım/.test(h)));

  // Gerçek profil adı geçer.
  assert.deepEqual(
    validateIntentPayload(
      { focal_x: 0.5, focal_y: 0.5, overrides: [{ profile: "cover_16x9_1000", ...kutu }] },
      { slotKey: COVER }
    ),
    []
  );
});

test("stüdyonun ürettiği override satırları slotun GERÇEK profilleri", () => {
  const s = make();
  s.setRatio(null);
  s.dragHandle("se", -900, 300);
  const yuk = s.savePayload.value;
  assert.ok(yuk.overrides.length > 0);
  assert.deepEqual(validateIntentPayload(yuk, { slotKey: COVER }), []);
});

test("`method` yalnız manual|smartcrop|center — algoritma adı buraya YAZILAMAZ", () => {
  const bulgu = validateIntentPayload({ focal_x: 0.5, focal_y: 0.5, method: "edge_energy_v1" });
  assert.equal(bulgu.length, 1);
  assert.match(bulgu[0], /bilinmeyen kırpma yöntemi/);
  assert.deepEqual(INTENT_METHODS, ["manual", "smartcrop", "center"]);
});

// ── Güvenli alan (T-103) ──────────────────────────────────────────

test("1× yakınlaştırmada güvenli alan YOK — tam kare 'belirtilmemiş' demektir", () => {
  const s = make();
  assert.equal(s.safeArea.value, null);
  assert.deepEqual(s.savePayload.value.safe_area, {}, "boş sözlük = alanı SİL");
});

test("yakınlaştırma güvenli alan olarak yazılır — kadraj artık kayıpsız geri gelir", () => {
  const s = make();
  s.setZoom(2);
  const alan = s.safeArea.value;
  assert.ok(alan, "yakınlaştırılmış tabanda güvenli alan olmalı");

  // Taban bölgenin ta kendisi: sunucunun 2. seviyesi (`safe_focal`) bu bölgeyi
  // taban alıp aynı pencereyi üretir.
  const b = s.base.value;
  assert.ok(Math.abs(alan.x - b.x / s.sourceW) < 1e-9);
  assert.ok(Math.abs(alan.w - b.w / s.sourceW) < 1e-9);

  const gonderilen = s.savePayload.value.safe_area;
  for (const k of ["x", "y", "w", "h"]) {
    assert.ok(gonderilen[k] >= 0 && gonderilen[k] <= 1, `safe_area.${k} 0-1 aralığında`);
  }
  assert.ok(gonderilen.x + gonderilen.w <= 1 + 1e-6, "yuvarlama kaynağın dışına taşırmamalı");
  assert.ok(gonderilen.y + gonderilen.h <= 1 + 1e-6);
  assert.deepEqual(validateIntentPayload(s.savePayload.value, { slotKey: COVER }), []);
});

test("her yakınlaştırma adımında güvenli alan sözleşmeye uygun kalır", () => {
  const s = make();
  for (const z of [1, 1.37, 2, 3.5, 7, 11.9, 16]) {
    s.setZoom(z);
    s.pan(137, -211);
    assert.deepEqual(
      validateIntentPayload(s.savePayload.value, { slotKey: COVER }),
      [],
      `zoom=${z} yükü sözleşmeye aykırı`
    );
  }
});

// ── Öneri: kalibrasyon gizlenmiyor (T-103) ────────────────────────

test("sunucu önerisi threshold_calibrated:false bilgisini TAŞIR ve uyarıya döner", () => {
  const s = make();
  s.applySuggestion(
    fromServerSuggestion({
      suggestion: {
        focal_x: 0.178523,
        focal_y: 0.21707,
        confidence: 0.891147,
        measured: true,
        reason: "measured",
        grid: 32,
        threshold: 0.5,
        threshold_calibrated: false,
        above_threshold: true,
      },
    })
  );

  assert.equal(s.suggestion.value.thresholdCalibrated, false);
  assert.equal(s.suggestion.value.source, "server");
  const uyari = s.warnings.value.find((w) => w.id === "suggestionUncalibrated");
  assert.ok(uyari, "kalibrasyon uyarısı kullanıcıdan gizlenemez");
  assert.equal(uyari.params.source, "server");

  // Algoritma künyesi `method`e DEĞİL, kendi alanlarına yazılır.
  assert.equal(s.savePayload.value.method, "smartcrop");
  assert.equal(s.savePayload.value.algorithm, "edge_energy_grid32");
  assert.equal(s.savePayload.value.algorithm_version, "v1");
  assert.deepEqual(validateIntentPayload(s.savePayload.value, { slotKey: COVER }), []);
});

test("ölçülemeyen öneri merkez döner ama 'öneri' DEMEZ", () => {
  const oneri = fromServerSuggestion({
    suggestion: { focal_x: 0.5, focal_y: 0.5, confidence: 0, measured: false,
      reason: "source_unavailable", grid: 32, threshold: 0.5, threshold_calibrated: false },
  });
  assert.equal(oneri.measured, false);
  assert.equal(oneri.confidence, 0, "ölçülemeyen öneride uydurulmuş güven olmaz");
  assert.equal(oneri.reason, "source_unavailable");
});

test("threshold_calibrated alanı hiç gelmezse 'kalibre değil' varsayılır", () => {
  const oneri = fromServerSuggestion({ suggestion: { focal_x: 0.2, focal_y: 0.3 } });
  assert.equal(oneri.thresholdCalibrated, false, "eksik bilgi 'kalibre edildi' diye okunamaz");
});

// ── Sunucu kullanıcının GÖRDÜĞÜ pencereyi yeniden üretiyor mu ──────
//
// `safe_area` yazmanın tek gerekçesi bu. Sunucu 2. seviyede
// `core/crop.py::_cover_window(safe, target_ratio, source_ratio, focal)`
// çağırıyor; aşağıdaki fonksiyon o algoritmanın birebir yazımıdır (adım
// adım aynı sıra, aynı kelepçeleme). Karşılaştırılan şey stüdyonun ekranda
// gösterdiği pencere ile sunucunun aynı yükten çözeceği pencere.

/** `core/crop.py::_cover_window` — normalize uzayda, birebir. */
function coverWindow(base, targetRatio, sourceRatio, focal) {
  if (targetRatio === null) return base;
  const r = targetRatio / sourceRatio;
  let w;
  let h;
  if (base.w / base.h > r) {
    h = base.h;
    w = h * r;
  } else {
    w = base.w;
    h = w / r;
  }
  w = Math.min(w, base.w);
  h = Math.min(h, base.h);
  const cl = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  return {
    x: cl(focal[0] - w / 2, base.x, base.x + base.w - w),
    y: cl(focal[1] - h / 2, base.y, base.y + base.h - h),
    w,
    h,
  };
}

test("sunucunun `safe_focal` seviyesi stüdyonun penceresini AYNEN üretiyor", () => {
  const SW = 4000;
  const SH = 3000;
  const kaynakOrani = SW / SH;
  let enBuyukSapmaPx = 0;

  for (const z of [1, 1.25, 2, 3, 5.5, 9, 16]) {
    for (const [px, py] of [
      [0, 0],
      [400, 250],
      [-900, 600],
      [2500, -1800],
    ]) {
      const s = useCropStudio({ source: SOURCE, slotKey: COVER });
      s.setZoom(z);
      s.pan(px, py);
      s.dragBody(120, -80);

      const yuk = s.savePayload.value;
      // Sunucunun göreceği taban: güvenli alan varsa o, yoksa tam kare
      // (`safe_region_of` tam kadrajı "belirtilmemiş" sayıyor).
      const guvenli = yuk.safe_area;
      const taban = Object.keys(guvenli).length
        ? guvenli
        : { x: 0, y: 0, w: 1, h: 1 };

      const sunucu = coverWindow(taban, AR, kaynakOrani, [yuk.focal_x, yuk.focal_y]);
      const bizim = s.win.value;

      const sapma = Math.max(
        Math.abs(sunucu.x * SW - bizim.x),
        Math.abs(sunucu.y * SH - bizim.y),
        Math.abs(sunucu.w * SW - bizim.w),
        Math.abs(sunucu.h * SH - bizim.h)
      );
      enBuyukSapmaPx = Math.max(enBuyukSapmaPx, sapma);
    }
  }

  // T-100 parite toleransı 0,5 px; burada beklenen sapma yuvarlama artığı
  // düzeyinde olmalı çünkü iki fonksiyon cebirsel olarak aynı.
  assert.ok(
    enBuyukSapmaPx < 0.5,
    `sunucu ile stüdyo ayrışıyor: en büyük sapma ${enBuyukSapmaPx} px`
  );
});

test("safe_area GÖNDERİLMEZSE yakınlaştırma kaybolur — regresyon kapısı", () => {
  const SW = 4000;
  const SH = 3000;
  const s = useCropStudio({ source: SOURCE, slotKey: COVER });
  s.setZoom(4);
  s.dragBody(100, -60);

  const yuk = s.savePayload.value;
  const guvenliyle = coverWindow(yuk.safe_area, AR, SW / SH, [yuk.focal_x, yuk.focal_y]);
  const guvenlisiz = coverWindow({ x: 0, y: 0, w: 1, h: 1 }, AR, SW / SH, [
    yuk.focal_x,
    yuk.focal_y,
  ]);

  // Bu testin işi iddiayı ölçmek: alan gönderilmediğinde sunucu 4× büyük bir
  // kadraj çözüyor, yani kullanıcının yakınlaştırması gerçekten kayboluyordu.
  assert.ok(
    guvenlisiz.w > guvenliyle.w * 3,
    "yakınlaştırmanın kaybolduğu iddiası ölçülemedi — kurulum yanlış olabilir"
  );
  assert.ok(Math.abs(guvenliyle.w * SW - s.win.value.w) < 0.5);
});
