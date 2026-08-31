// İade mock'unun backend DAVRANIŞINI taklit ettiğini kilitler (15-FE).
//
// Ölçülen şey "veri dönüyor mu" değil, **iş akışı kapanıyor mu**: karar
// veriliyor mu, kontrol kaydediliyor mu, tutar kalem kararlarından TÜRÜYOR
// mu, kapılar tutuyor mu, hatalar tetiklenebiliyor mu
// (docs/lojistik/FE-MOCK-DISIPLINI.md §5).
//
// Mock kaldırıldığında bu dosya da silinir.

import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";

const store = new Map();
const session = new Map();
const shim = (m) => ({
  getItem: (k) => (m.has(k) ? m.get(k) : null),
  setItem: (k, v) => m.set(k, String(v)),
  removeItem: (k) => m.delete(k),
});
globalThis.localStorage = shim(store);
globalThis.sessionStorage = shim(session);

const { returnsMock, resetMockData, setFault, clearFault, FAULT_CODES } =
  await import("../returnsMock.js");

/** Karar bekleyen talep — satıcı akışının başlangıcı. */
const KARAR_BEKLEYEN = "RET-2026-00006";
/** Karara bağlanmış, kontrol bekleyen talep. */
const KONTROL_BEKLEYEN = "RET-2026-00007";
/** Kapanmış talep — hiçbir yazma kabul etmemeli. */
const KAPALI = "RET-2026-00003";

beforeEach(() => {
  resetMockData();
  clearFault();
});

// ── kuyruk ───────────────────────────────────────────────────────────

test("sayaçlar TÜM kapsamdan sayılıyor, süzülmüş listeden değil", async () => {
  // Aksi hâlde "Talep edildi 1"e tıklayınca diğer durumların sayısı sıfırlanır
  // ve kullanıcı kuyrukta ne kaldığını göremez (14-FE'de ölçülen tuzak).
  const suzulmus = await returnsMock.listReturnRequests({ status: "requested" });
  assert.equal(suzulmus.items.length, 1);
  assert.equal(suzulmus.status_counts.closed, 1, "süzgeç diğer sayaçları düşürmemeli");
  assert.equal(suzulmus.status_counts.inspecting, 1);
});

test("liste satırı DETAIL alanı taşımıyor (karar K-6)", async () => {
  // `refund_amount` sözleşmede DETAIL alanı; liste satırında çizmek hiç
  // çalışmayan bir dal üretiyordu (analiz §3.6).
  const { items } = await returnsMock.listReturnRequests({});
  for (const satir of items) {
    assert.ok(!("refund_amount" in satir), `${satir.name} liste satırında refund_amount var`);
    assert.ok(!("items" in satir), `${satir.name} liste satırında kalemler var`);
  }
});

test("satıcı yalnız KENDİ satışlarının iadesini görüyor", async () => {
  const hepsi = await returnsMock.listReturnRequests({});
  const satici = await returnsMock.listReturnRequests({ asSeller: true });
  assert.ok(satici.items.length < hepsi.items.length, "tenant süzgeci hiç daraltmamış");
  assert.ok(satici.items.every((r) => r.seller_profile === "SEL-00001"));
});

test("satıcı başkasının kaydını AÇAMIYOR", async () => {
  await assert.rejects(
    () => returnsMock.getReturnRequest(KARAR_BEKLEYEN, { asSeller: true }),
    (e) => e.code === "PERMISSION_DENIED"
  );
});

// ── karar (I2) ───────────────────────────────────────────────────────

test("onay ters sevkiyat ve etiket üretiyor — aynı çağrıda", async () => {
  // Ayrı bir uç gerekseydi akış ikiye bölünür, ekran sonucu gösteremezdi (K9).
  const sonuc = await returnsMock.decideReturnRequest({
    name: KARAR_BEKLEYEN,
    decision: "approved",
  });
  assert.equal(sonuc.status, "approved");
  assert.ok(sonuc.decided_at, "karar zamanı yazılmamış");
  assert.match(sonuc.return_shipment, /^SHP-2026-\d{5}$/);
  assert.ok(sonuc.return_label_url, "etiket üretilmemiş");
});

test("gerekçesiz RED reddediliyor, onay serbest", async () => {
  await assert.rejects(
    () => returnsMock.decideReturnRequest({ name: KARAR_BEKLEYEN, decision: "rejected" }),
    (e) => e.code === "DECISION_NOTE_REQUIRED"
  );
  const kisa = returnsMock.decideReturnRequest({
    name: KARAR_BEKLEYEN,
    decision: "rejected",
    decision_note: "kısa",
  });
  await assert.rejects(kisa, (e) => e.code === "DECISION_NOTE_REQUIRED");

  // Onayda not zorunlu değil.
  const ok = await returnsMock.decideReturnRequest({
    name: KARAR_BEKLEYEN,
    decision: "approved",
  });
  assert.equal(ok.status, "approved");
});

test("ikinci karar reddediliyor — kod kapanmıştan AYRI", async () => {
  // Ekran ikisinde farklı kutu çiziyor; tek koda indirilse hangisini
  // göstereceğini bilemezdi (sözleşme §3).
  await returnsMock.decideReturnRequest({ name: KARAR_BEKLEYEN, decision: "approved" });
  await assert.rejects(
    () => returnsMock.decideReturnRequest({ name: KARAR_BEKLEYEN, decision: "approved" }),
    (e) => e.code === "RETURN_ALREADY_DECIDED"
  );
  await assert.rejects(
    () => returnsMock.decideReturnRequest({ name: KAPALI, decision: "approved" }),
    (e) => e.code === "RETURN_CLOSED"
  );
});

// ── depo kontrolü (I3) ───────────────────────────────────────────────

test("iade tutarı kalem kararlarından TÜRÜYOR — istemci göndermiyor", async () => {
  const sonuc = await returnsMock.saveReturnInspection({
    name: KONTROL_BEKLEYEN,
    items: [
      { item: "LST-00121", received_qty: 6, accepted_qty: 4, inspection_result: "ok" },
      { item: "LST-00133", received_qty: 2, accepted_qty: 0, inspection_result: "ok" },
    ],
  });
  // 4 × 620 + 0 × 0
  assert.equal(sonuc.refund_amount, 2480);
});

test("kabul edilen ulaşandan fazla olamaz", async () => {
  // Sessiz geçilirse OLMAYAN mal için para iadesi ödenir.
  await assert.rejects(
    () =>
      returnsMock.saveReturnInspection({
        name: KONTROL_BEKLEYEN,
        items: [{ item: "LST-00121", received_qty: 2, accepted_qty: 5 }],
      }),
    (e) => e.code === "ACCEPTED_EXCEEDS_RECEIVED"
  );
});

test("sorunlu kalemde not zorunlu", async () => {
  // Not BOŞ gönderiliyor: fixture kaleminin zaten bir notu var ve alan
  // gönderilmediğinde eskisi korunuyor — kısmi kaydetmede doğru davranış bu
  // (operatör yalnız miktarı düzeltiyor olabilir). Kapı, notun SİLİNMESİNE
  // karşı: "hasarlı" deyip gerekçeyi boşaltmak tutarı sebepsiz düşürürdü.
  await assert.rejects(
    () =>
      returnsMock.saveReturnInspection({
        name: KONTROL_BEKLEYEN,
        items: [
          {
            item: "LST-00121",
            received_qty: 6,
            accepted_qty: 4,
            inspection_result: "damaged",
            inspection_note: "",
          },
        ],
      }),
    (e) => e.code === "VALIDATION_ERROR"
  );

  // Notu olan kalem kısmi güncellemede geçiyor — not korunuyor.
  const ok = await returnsMock.saveReturnInspection({
    name: KONTROL_BEKLEYEN,
    items: [{ item: "LST-00121", received_qty: 6, accepted_qty: 3 }],
  });
  assert.equal(ok.items.find((k) => k.item === "LST-00121").accepted_qty, 3);
});

test("kontrol kaydı KALICI — yeniden okununca duruyor", async () => {
  await returnsMock.saveReturnInspection({
    name: KONTROL_BEKLEYEN,
    items: [{ item: "LST-00121", received_qty: 5, accepted_qty: 3, inspection_result: "ok" }],
  });
  const tekrar = await returnsMock.getReturnRequest(KONTROL_BEKLEYEN);
  const kalem = tekrar.items.find((k) => k.item === "LST-00121");
  assert.equal(kalem.received_qty, 5);
  assert.equal(kalem.accepted_qty, 3);
});

// ── kapanış (I4) ─────────────────────────────────────────────────────

test("ön koşul eksikse HANGİSİ eksik söyleniyor", async () => {
  // Tek genel mesaj ekranda hangi satırın sarı olacağını söylemezdi.
  await assert.rejects(
    () => returnsMock.closeReturnRequest({ name: KARAR_BEKLEYEN }),
    (e) => e.code === "RETURN_NOT_CLOSABLE" && e.failed_checks.includes("decided")
  );
});

test("ön koşullar tamamlanınca kapanıyor ve KİLİTLENİYOR", async () => {
  await returnsMock.decideReturnRequest({ name: KARAR_BEKLEYEN, decision: "approved" });
  await returnsMock.saveReturnInspection({
    name: KARAR_BEKLEYEN,
    items: [{ item: "LST-00121", received_qty: 4, accepted_qty: 4, inspection_result: "ok" }],
  });
  const kapali = await returnsMock.closeReturnRequest({ name: KARAR_BEKLEYEN });

  assert.equal(kapali.is_closed, 1);
  assert.ok(kapali.closed_at && kapali.closed_by);
  assert.ok(kapali.refund_triggered_at, "para iadesi tetiklenmemiş");

  // TUR-116: kapanınca DEĞİŞTİRİLEMEZ — her yazma kapısında.
  await assert.rejects(
    () => returnsMock.decideReturnRequest({ name: KARAR_BEKLEYEN, decision: "rejected" }),
    (e) => e.code === "RETURN_CLOSED"
  );
  await assert.rejects(
    () => returnsMock.saveReturnInspection({ name: KARAR_BEKLEYEN, items: [] }),
    (e) => e.code === "RETURN_CLOSED"
  );
});

test("para iadesi tetiklenmeden kapatılabiliyor", async () => {
  await returnsMock.decideReturnRequest({ name: KARAR_BEKLEYEN, decision: "approved" });
  await returnsMock.saveReturnInspection({
    name: KARAR_BEKLEYEN,
    items: [{ item: "LST-00121", received_qty: 4, accepted_qty: 4, inspection_result: "ok" }],
  });
  const kapali = await returnsMock.closeReturnRequest({
    name: KARAR_BEKLEYEN,
    trigger_refund: false,
  });
  assert.equal(kapali.refund_triggered_at, null, "tetiklenmemeliydi");
  assert.equal(kapali.is_closed, 1, "yine de kapanmalıydı");
});

// ── tetiklenebilir hatalar (§2.4) ────────────────────────────────────

test("her FAULT kodu gerçekten tetiklenebiliyor", async () => {
  // Denenemeyen bir hata senaryosu, olmayan bir senaryodur.
  const cagri = {
    read: () => returnsMock.listReturnRequests({}),
    decide: () => returnsMock.decideReturnRequest({ name: KARAR_BEKLEYEN, decision: "approved" }),
    inspect: () => returnsMock.saveReturnInspection({ name: KONTROL_BEKLEYEN, items: [] }),
    close: () => returnsMock.closeReturnRequest({ name: KONTROL_BEKLEYEN }),
    write: () => returnsMock.decideReturnRequest({ name: KARAR_BEKLEYEN, decision: "approved" }),
  };
  for (const { code, scope } of FAULT_CODES) {
    setFault(code);
    await assert.rejects(cagri[scope], (e) => e.code === code, `${code} tetiklenemedi`);
    clearFault();
  }
});

test("sıfırlama tohuma döndürüyor", async () => {
  await returnsMock.decideReturnRequest({ name: KARAR_BEKLEYEN, decision: "approved" });
  resetMockData();
  const geri = await returnsMock.getReturnRequest(KARAR_BEKLEYEN);
  assert.equal(geri.status, "requested");
  assert.equal(geri.decided_at, null);
});
