import assert from "node:assert/strict";
import { test } from "node:test";

import {
  HANDLES,
  applyRatioKeepingCenter,
  arrowDelta,
  heightForWidth,
  isCorner,
  moveWindow,
  resizeWindow,
  widthForHeight,
} from "../cropHandles.js";
import { MIN_EDGE_PX, rect, rectBottom, rectRight, rectRatio } from "../geometry.js";

/**
 * Jest → geometri eşlemesi.
 *
 *   ÖLÇÜLÜR  — 8 tutamağın hangi kenarı taşıdığı, sabit köşenin yerinde
 *              kalması, oran kilidinin korunması ve pencerenin HİÇBİR jestte
 *              taban bölgeden taşmaması (500 rastgele jest dizisi).
 *   ÖLÇÜLMEZ — gerçek fare/dokunma olayları ve DPR ≥ 2'de tutamak isabeti;
 *              bunlar tarayıcı gerektirir, bu görevde tarayıcı doğrulaması
 *              YAPILMADI.
 */

const BASE = rect(0, 0, 1000, 800);
const WIN = rect(200, 150, 400, 300);
const AR = 1000 / 563; // company.cover_image · cover_16x9_1000 — etiketten değil, boyuttan

test("8 tutamak var, 4'ü köşe", () => {
  assert.equal(HANDLES.length, 8);
  assert.equal(HANDLES.filter(isCorner).length, 4);
  assert.deepEqual(HANDLES.filter(isCorner), ["nw", "ne", "se", "sw"]);
});

test("gövde sürüklemesi pencereyi kaydırır, boyutu değiştirmez", () => {
  const moved = moveWindow({ win: WIN, base: BASE, dx: 50, dy: -30 });
  assert.equal(moved.w, WIN.w);
  assert.equal(moved.h, WIN.h);
  assert.equal(moved.x, 250);
  assert.equal(moved.y, 120);
});

test("gövde sürüklemesi sınıra dayanınca KAYAR, küçülmez", () => {
  const moved = moveWindow({ win: WIN, base: BASE, dx: 100000, dy: 100000 });
  assert.equal(moved.w, WIN.w, "genişlik korunmalı");
  assert.equal(moved.h, WIN.h, "yükseklik korunmalı");
  assert.equal(rectRight(moved), BASE.w);
  assert.equal(rectBottom(moved), BASE.h);
});

// ── Sabit köşe ────────────────────────────────────────────────────

test("se tutamağı çekilince sol üst köşe yerinde kalır", () => {
  const r = resizeWindow({ win: WIN, base: BASE, handle: "se", dx: 60, dy: 40 });
  assert.equal(r.x, WIN.x);
  assert.equal(r.y, WIN.y);
  assert.equal(r.w, 460);
  assert.equal(r.h, 340);
});

test("nw tutamağı çekilince sağ alt köşe yerinde kalır", () => {
  const r = resizeWindow({ win: WIN, base: BASE, handle: "nw", dx: 50, dy: 25 });
  assert.equal(rectRight(r), rectRight(WIN));
  assert.equal(rectBottom(r), rectBottom(WIN));
  assert.equal(r.w, 350);
  assert.equal(r.h, 275);
});

test("kenar tutamağı tek ekseni değiştirir, diğerinde merkez korunur", () => {
  const r = resizeWindow({ win: WIN, base: BASE, handle: "e", dx: 80 });
  assert.equal(r.h, WIN.h);
  assert.equal(r.y, WIN.y);
  assert.equal(r.w, 480);
  assert.equal(r.x, WIN.x);
});

// ── Oran kilidi ───────────────────────────────────────────────────

test("kilitli köşe çekmesinde oran sapması ≤ %0,5", () => {
  // crop.py::RATIO_TOLERANCE eşiği.
  for (const h of ["nw", "ne", "se", "sw"]) {
    for (const [dx, dy] of [
      [120, 10],
      [-90, 200],
      [300, -40],
      [-200, -180],
    ]) {
      const r = resizeWindow({ win: WIN, base: BASE, handle: h, dx, dy, targetAR: AR });
      const sapma = Math.abs(rectRatio(r) - AR) / AR;
      assert.ok(sapma <= 0.005, `${h} ${dx},${dy} → oran sapması ${sapma}`);
    }
  }
});

test("kilitli kenar çekmesinde diğer eksen ratioFit'ten türer", () => {
  const r = resizeWindow({ win: WIN, base: BASE, handle: "e", dx: 100, targetAR: AR });
  assert.equal(r.w, 500);
  assert.equal(r.h, heightForWidth(500, AR));
  assert.equal(r.h, 500 / AR, "yükseklik ratioFit'in ürettiği sayının ta kendisi");
});

test("heightForWidth / widthForHeight ratioFit'e devreder — 1'in iki yanında da", () => {
  for (const ar of [0.25, 0.5, 1, 4 / 3, 16 / 9, 1000 / 563, 4]) {
    assert.equal(heightForWidth(640, ar), 640 / ar, `ar=${ar}`);
    assert.equal(widthForHeight(480, ar), 480 * ar, `ar=${ar}`);
  }
});

test("kilit kapanırken pencere sıçramaz — merkez korunur", () => {
  const fitted = applyRatioKeepingCenter(WIN, BASE, AR);
  const eskiCx = WIN.x + WIN.w / 2;
  const eskiCy = WIN.y + WIN.h / 2;
  assert.ok(Math.abs(fitted.x + fitted.w / 2 - eskiCx) < 1e-9);
  assert.ok(Math.abs(fitted.y + fitted.h / 2 - eskiCy) < 1e-9);
  assert.ok(Math.abs(rectRatio(fitted) - AR) / AR <= 0.005);
  // `inside`: yeni kutu eskisinin İÇİNE sığar.
  assert.ok(fitted.w <= WIN.w + 1e-9 && fitted.h <= WIN.h + 1e-9);
});

// ── Tek sınır kapısı: fuzz ────────────────────────────────────────

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test("500 rastgele jest dizisinde pencere taban bölgeden ASLA taşmıyor", () => {
  const rnd = lcg(20260819);
  let jest = 0;
  for (let seri = 0; seri < 500; seri += 1) {
    const targetAR = seri % 3 === 0 ? null : seri % 3 === 1 ? AR : 1;
    // Seri, kilidin dayattığı orana UYAN bir pencereyle başlar; gövde
    // sürüklemesi oranı düzeltmez, korur.
    let win =
      targetAR === null
        ? rect(200, 150, 400, 300)
        : applyRatioKeepingCenter(rect(200, 150, 400, 300), BASE, targetAR);
    for (let adim = 0; adim < 12; adim += 1) {
      const dx = (rnd() - 0.5) * 3000;
      const dy = (rnd() - 0.5) * 3000;
      const which = Math.floor(rnd() * 9);
      win =
        which === 8
          ? moveWindow({ win, base: BASE, dx, dy })
          : resizeWindow({ win, base: BASE, handle: HANDLES[which], dx, dy, targetAR });
      jest += 1;

      assert.ok(win.x >= BASE.x - 1e-9, `x=${win.x}`);
      assert.ok(win.y >= BASE.y - 1e-9, `y=${win.y}`);
      assert.ok(rectRight(win) <= BASE.x + BASE.w + 1e-9, `right=${rectRight(win)}`);
      assert.ok(rectBottom(win) <= BASE.y + BASE.h + 1e-9, `bottom=${rectBottom(win)}`);
      assert.ok(win.w >= MIN_EDGE_PX - 1e-9 && win.h >= MIN_EDGE_PX - 1e-9);
      if (targetAR !== null) {
        assert.ok(
          Math.abs(rectRatio(win) - targetAR) / targetAR <= 0.005,
          `oran ${rectRatio(win)}`
        );
      }
    }
  }
  assert.equal(jest, 6000);
});

/**
 * İkinci fuzz: **küçük ve aşırı** taban bölgeler.
 *
 * Yukarıdaki dizi sabit 1000×800 taban kullanıyor; oran kilidinin TÜREYEN
 * kenarı 1 px'in altına düşürmesi (`cropHandles.js` §2b) orada kolay kolay
 * tetiklenmez — kenar hep bol boşluk buluyor. Kutu birkaç piksel olduğunda
 * durum tersine döner: 3×2 bir kaynakta 16:9 kilidi, 1 px genişliğe 0,563 px
 * yükseklik dayatır ve `roundWindow` onu 1 px'e yuvarlayıp oranı bozardı.
 *
 * Ayrıca: bu depoda geometri artık `vendor/crop_geometry.js` (tipleri silinmiş
 * ikiz) üzerinden geliyor. Aynı değişmezlerin türetilmiş dosyada da geçerli
 * olduğu burada ölçülüyor — 6.000 jest, dört değişmez.
 */
test("6.000 jest · küçük ve aşırı tabanlarda oran ve MIN_EDGE_PX değişmezleri", () => {
  const rnd = lcg(0x7100c0de);
  const BASELER = [
    rect(0, 0, 3, 2), // dejenere: bir jest tüm kutuyu kat eder
    rect(0, 0, 24, 24), // UI'nın tutamak gizleme eşiği civarı
    rect(0, 0, 200, 150), // profil genişliğinin altında kalan kaynak
    rect(0, 0, 8688, 8368), // ölçülen MAX kaynak (72,71 MP)
  ];
  const ORANLAR = [null, AR, 1, 16 / 9, 4 / 3];
  let jest = 0;
  for (let seri = 0; seri < 500; seri += 1) {
    const base = BASELER[seri % BASELER.length];
    const targetAR = ORANLAR[seri % ORANLAR.length];
    const ilk = rect(0, 0, base.w, base.h);
    let win = targetAR === null ? ilk : applyRatioKeepingCenter(ilk, base, targetAR);
    for (let adim = 0; adim < 12; adim += 1) {
      const olcek = base.w + base.h;
      const dx = (rnd() - 0.5) * olcek * 2;
      const dy = (rnd() - 0.5) * olcek * 2;
      const which = Math.floor(rnd() * 9);
      win =
        which === 8
          ? moveWindow({ win, base, dx, dy })
          : resizeWindow({ win, base, handle: HANDLES[which], dx, dy, targetAR });
      jest += 1;

      assert.ok(win.w >= MIN_EDGE_PX - 1e-9, `w=${win.w} (taban ${base.w}×${base.h})`);
      assert.ok(win.h >= MIN_EDGE_PX - 1e-9, `h=${win.h} (taban ${base.w}×${base.h})`);
      assert.ok(rectRight(win) <= base.w + 1e-9, `right=${rectRight(win)}`);
      assert.ok(rectBottom(win) <= base.h + 1e-9, `bottom=${rectBottom(win)}`);
      if (targetAR !== null) {
        // Kilit, kutu tabana sığdığı sürece korunur. 3×2 tabanda 16:9 istenen
        // kutu tabandan geniştir; orada oran DEĞİL, sınır kazanır ve bu bir
        // hata değildir — `clampWindow` tek kapıdır. Ölçülen: kutu tabana
        // sığıyorsa oran sapması ≤ %0,5.
        const sigar = win.w < base.w - 1e-9 && win.h < base.h - 1e-9;
        if (sigar) {
          assert.ok(
            Math.abs(rectRatio(win) - targetAR) / targetAR <= 0.005,
            `oran ${rectRatio(win)} ≠ ${targetAR} (taban ${base.w}×${base.h})`
          );
        }
      }
    }
  }
  assert.equal(jest, 6000);
});

// ── Klavye ────────────────────────────────────────────────────────

test("ok tuşları 1 px, Shift ile 10 px — kaynak pikseli", () => {
  assert.deepEqual(arrowDelta("ArrowLeft"), { dx: -1, dy: 0 });
  assert.deepEqual(arrowDelta("ArrowRight"), { dx: 1, dy: 0 });
  assert.deepEqual(arrowDelta("ArrowUp"), { dx: 0, dy: -1 });
  assert.deepEqual(arrowDelta("ArrowDown"), { dx: 0, dy: 1 });
  assert.deepEqual(arrowDelta("ArrowDown", true), { dx: 0, dy: 10 });
  assert.equal(arrowDelta("Enter"), null);
});

test("ok tuşu bir tutamağı gerçekten 1 px oynatır", () => {
  const r = resizeWindow({ win: WIN, base: BASE, handle: "e", ...arrowDelta("ArrowRight") });
  assert.equal(r.w, WIN.w + 1);
});
