import assert from "node:assert/strict";
import { test } from "node:test";

import { COALESCE_MS, MAX_STEPS, snapshot, useCropHistory } from "../useCropHistory.js";

/**
 * Geri al / yinele.
 *
 *   ÖLÇÜLÜR  — yığının DOĞRU DURUMA döndüğü (yalnız "kırılmadığı" değil),
 *              jest başına tam bir adım, yinele dalının temizlenmesi, ok tuşu
 *              birleştirmesi, tavan ve sıfırlama.
 *   ÖLÇÜLMEZ — gerçek `pointermove` akışı; olay üretimi tarayıcı işi.
 */

const S = (over = {}) => ({
  zoom: 1,
  centerX: 0.5,
  centerY: 0.5,
  focalX: 0.5,
  focalY: 0.5,
  lockedAR: null,
  overrideRect: null,
  ...over,
});

/** Sahte saat — birleştirme penceresi gerçek zamana bağlı kalmasın. */
function clock(start = 0) {
  let t = start;
  return { now: () => t, ilerle: (ms) => (t += ms) };
}

test("başlangıçta geri de ileri de gidilemez", () => {
  const h = useCropHistory(S());
  assert.equal(h.canUndo.value, false);
  assert.equal(h.canRedo.value, false);
  assert.equal(h.depth.value, 1);
});

test("geri al DOĞRU duruma döner, ileri al geri getirir", () => {
  const c = clock();
  const h = useCropHistory(S(), { now: c.now });

  h.commit(S({ zoom: 2 }));
  c.ilerle(1000);
  h.commit(S({ zoom: 4, focalX: 0.2 }));
  c.ilerle(1000);
  h.commit(S({ zoom: 8, focalX: 0.2, focalY: 0.9 }));

  assert.equal(h.depth.value, 4);

  assert.equal(h.undo().zoom, 4);
  assert.equal(h.current.value.focalX, 0.2);
  assert.equal(h.current.value.focalY, 0.5, "üçüncü adımın focalY'si geri alınmalı");

  assert.equal(h.undo().zoom, 2);
  assert.equal(h.undo().zoom, 1);
  assert.equal(h.canUndo.value, false);
  assert.equal(h.undo(), null);

  assert.equal(h.redo().zoom, 2);
  assert.equal(h.redo().zoom, 4);
  assert.equal(h.redo().zoom, 8);
  assert.equal(h.redo(), null);
});

test("20 adımın ötesine geri gidilebiliyor — hedef 50", () => {
  const c = clock();
  const h = useCropHistory(S(), { now: c.now });
  for (let i = 1; i <= 30; i += 1) {
    c.ilerle(COALESCE_MS + 1);
    h.commit(S({ zoom: 1 + i * 0.1 }));
  }
  for (let i = 30; i >= 1; i -= 1) {
    assert.ok(Math.abs(h.current.value.zoom - (1 + i * 0.1)) < 1e-9, `adım ${i}`);
    h.undo();
  }
  assert.equal(h.current.value.zoom, 1);
});

test("yeni bir değişiklik yinele dalını temizler", () => {
  const c = clock();
  const h = useCropHistory(S(), { now: c.now });
  c.ilerle(1000);
  h.commit(S({ zoom: 2 }));
  c.ilerle(1000);
  h.commit(S({ zoom: 3 }));
  h.undo();
  assert.equal(h.canRedo.value, true);

  c.ilerle(1000);
  h.commit(S({ zoom: 9 }));
  assert.equal(h.canRedo.value, false, "yinele dalı ölmeli");
  assert.equal(h.depth.value, 3);
  h.undo();
  assert.equal(h.current.value.zoom, 2, "silinen dal değil, gerçek geçmiş");
});

test("bir sürükleme jesti = tam olarak 1 adım", () => {
  const c = clock();
  const h = useCropHistory(S(), { now: c.now });
  // Sürükleme sırasında yalnız canlı durum değişir; yığına yazılmaz.
  const gecici = [S({ focalX: 0.51 }), S({ focalX: 0.55 }), S({ focalX: 0.62 })];
  assert.equal(h.depth.value, 1, "ara kareler yığına girmemeli");
  // pointerup:
  c.ilerle(1000);
  h.commit(gecici[gecici.length - 1], "drag");
  assert.equal(h.depth.value, 2);
});

test("ok tuşu ince ayarı 400 ms içinde TEK adımda birleşir", () => {
  const c = clock();
  const h = useCropHistory(S(), { now: c.now });

  for (let i = 1; i <= 12; i += 1) {
    c.ilerle(30);
    h.commit(S({ focalX: 0.5 + i * 0.001 }), "nudge:e:ArrowRight");
  }
  // 12 basış, tek adım.
  assert.equal(h.depth.value, 2);
  assert.ok(Math.abs(h.current.value.focalX - 0.512) < 1e-9);

  h.undo();
  assert.equal(h.current.value.focalX, 0.5, "birleşen adım tek seferde geri alınır");
});

test("400 ms geçince ok tuşu YENİ adım açar", () => {
  const c = clock();
  const h = useCropHistory(S(), { now: c.now });
  h.commit(S({ focalX: 0.51 }), "nudge:e:ArrowRight");
  c.ilerle(COALESCE_MS + 1);
  h.commit(S({ focalX: 0.52 }), "nudge:e:ArrowRight");
  assert.equal(h.depth.value, 3);
});

test("farklı etiketli adımlar birleşmez", () => {
  const c = clock();
  const h = useCropHistory(S(), { now: c.now });
  h.commit(S({ focalX: 0.51 }), "nudge:e:ArrowRight");
  c.ilerle(10);
  h.commit(S({ focalY: 0.51 }), "nudge:s:ArrowDown");
  assert.equal(h.depth.value, 3);
});

test("değişmeyen durum yığına girmez", () => {
  const h = useCropHistory(S());
  assert.equal(h.commit(S()), false);
  assert.equal(h.depth.value, 1);
});

test("tavan aşılınca en eski adım düşer, imleç sonda kalır", () => {
  const c = clock();
  const h = useCropHistory(S({ zoom: 1 }), { now: c.now, max: 5 });
  for (let i = 2; i <= 10; i += 1) {
    c.ilerle(1000);
    h.commit(S({ zoom: i }));
  }
  assert.equal(h.depth.value, 5);
  assert.equal(h.current.value.zoom, 10);
  for (let i = 0; i < 4; i += 1) h.undo();
  assert.equal(h.current.value.zoom, 6, "yığında yalnız son 5 adım kalmalı");
  assert.equal(h.canUndo.value, false);
});

test("sıfırlama geçmişi tek adıma indirir — slot/profil değişimi", () => {
  const c = clock();
  const h = useCropHistory(S(), { now: c.now });
  c.ilerle(1000);
  h.commit(S({ zoom: 3 }));
  h.reset(S({ zoom: 1, lockedAR: 1.7761989342806395 }));
  assert.equal(h.depth.value, 1);
  assert.equal(h.canUndo.value, false);
  assert.equal(h.current.value.lockedAR, 1.7761989342806395);
});

test("anlık görüntü kopyalanır — dışarıdaki nesne yığını bozamaz", () => {
  const canli = S({ overrideRect: { x: 0.1, y: 0.1, w: 0.5, h: 0.5 } });
  const snap = snapshot(canli);
  canli.overrideRect.x = 0.9;
  assert.equal(snap.overrideRect.x, 0.1);
});

test("MAX_STEPS T-103 asgarisinin (20) üstünde", () => {
  assert.ok(MAX_STEPS >= 20);
  assert.equal(MAX_STEPS, 50);
});
