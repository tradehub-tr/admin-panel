// POD mock'unun backend DAVRANIŞINI taklit ettiğini kilitler.
//
// Ölçülen şey "veri dönüyor mu" değil, **iş akışı kapanıyor mu**:
// kaydedilen kalıyor mu, kaydedince kova değişiyor mu, kapılar tutuyor mu,
// hatalar tetiklenebiliyor mu (docs/lojistik/FE-MOCK-DISIPLINI.md §5).
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

const { podMock, resetMockData, setFault, clearFault } = await import("../podMock.js");

/** Teslim edilmiş, kanıtı OLMAYAN sevkiyat — kayıt akışının başlangıcı. */
const BEKLEYEN = "SHP-2026-00041";
/** Kanıtı tam olan sevkiyat. */
const TAM = "SHP-2026-00033";
/** Alıcı teslim alma akışında, ödemesi yapılmamış sevkiyat. */
const ODEMESIZ = "SHP-2026-00049";

beforeEach(() => {
  store.clear();
  session.clear();
  resetMockData();
});

const gecerliKayit = (shipment, ek = {}) => ({
  shipment,
  delivered_at: "2026-08-19 10:00",
  received_by: "Ayşe Korkmaz",
  received_by_title: "Depo sorumlusu",
  delivered_package_count: 4,
  total_package_count: 4,
  ...ek,
});

// ── tohum tutarlılığı ────────────────────────────────────────────────

test("kuyruk tohumu: kovalar sevkiyattan TÜRETİLİYOR, ayrı dizi değil", async () => {
  const q = await podMock.getPodQueue({});
  const sayac = Object.fromEntries(q.buckets.map((b) => [b.key, b.count]));

  // Her satırın kovası, o satırın POD durumuyla tutarlı olmalı.
  for (const r of q.rows) {
    if (!r.pod_source) assert.equal(r.bucket, "awaiting", `${r.shipment} kanıtsız ama kovası ${r.bucket}`);
    else if (r.exception_code) assert.equal(r.bucket, "discrepancy");
  }
  assert.equal(
    Object.values(sayac).reduce((a, b) => a + b, 0),
    q.total,
    "kova sayaçlarının toplamı liste toplamını tutmuyor"
  );
});

test("kova sayaçları TÜM kapsamdan sayılıyor, süzülmüş listeden değil", async () => {
  const hepsi = await podMock.getPodQueue({});
  const suzulmus = await podMock.getPodQueue({ bucket: "awaiting" });

  assert.ok(suzulmus.rows.length < hepsi.rows.length, "filtre listeyi kısaltmadı");
  assert.deepEqual(
    suzulmus.buckets.map((b) => b.count),
    hepsi.buckets.map((b) => b.count),
    "filtre uygulanınca kova sayaçları değişti — kullanıcı diğer kovalarda ne kaldığını göremez"
  );
});

// ── kalıcılık ────────────────────────────────────────────────────────

test("kaydedilen kanıt yeniden okumada DURUYOR", async () => {
  await podMock.recordProofOfDelivery(gecerliKayit(BEKLEYEN));
  const okuma = await podMock.getProofOfDelivery(BEKLEYEN);
  assert.equal(okuma.proof_of_delivery.received_by, "Ayşe Korkmaz");
});

test("sıfırlama tohuma döndürüyor", async () => {
  await podMock.recordProofOfDelivery(gecerliKayit(BEKLEYEN));
  resetMockData();
  const okuma = await podMock.getProofOfDelivery(BEKLEYEN);
  assert.equal(okuma.proof_of_delivery, null, "sıfırlamadan sonra kayıt kaldı");
});

// ── durum geçişi ─────────────────────────────────────────────────────

test("kanıt kaydedilince sevkiyat KOVA DEĞİŞTİRİYOR", async () => {
  const once = await podMock.getPodQueue({});
  const bekleyenOnce = once.buckets.find((b) => b.key === "awaiting").count;
  const tamamOnce = once.buckets.find((b) => b.key === "done").count;

  await podMock.recordProofOfDelivery(gecerliKayit(BEKLEYEN));

  const sonra = await podMock.getPodQueue({});
  assert.equal(sonra.buckets.find((b) => b.key === "awaiting").count, bekleyenOnce - 1);
  assert.equal(sonra.buckets.find((b) => b.key === "done").count, tamamOnce + 1);
});

test("tutarsızlıkla kaydedilen kanıt 'tutarsızlık' kovasına düşüyor", async () => {
  await podMock.recordProofOfDelivery(
    gecerliKayit(BEKLEYEN, {
      delivered_package_count: 2,
      has_discrepancy: 1,
      exception_code: "SHORT_DELIVERY",
      discrepancy_note: "2 koli eksik geldi",
    })
  );
  const q = await podMock.getPodQueue({ bucket: "discrepancy" });
  assert.ok(q.rows.some((r) => r.shipment === BEKLEYEN));
});

test("satıcının kaydı 'satıcı beyanı' kovasına düşüyor", async () => {
  await podMock.recordProofOfDelivery(gecerliKayit(BEKLEYEN, { asSeller: true }));
  const q = await podMock.getPodQueue({ bucket: "seller_claim" });
  assert.ok(q.rows.some((r) => r.shipment === BEKLEYEN));
});

// ── damga sunucuda ───────────────────────────────────────────────────

test("source damgasını SUNUCU koyuyor — istemci beyanı geçmiyor", async () => {
  const sonuc = await podMock.recordProofOfDelivery(
    gecerliKayit(BEKLEYEN, { asSeller: true, source: "operator" })
  );
  assert.equal(sonuc.proof_of_delivery.source, "seller", "istemci damgası kabul edildi");
});

// ── doğrulama ────────────────────────────────────────────────────────

test("kısmi teslimde tutarsızlık ZORUNLU", async () => {
  await assert.rejects(
    () => podMock.recordProofOfDelivery(gecerliKayit(BEKLEYEN, { delivered_package_count: 2 })),
    (e) => e.code === "VALIDATION_ERROR" && !!e.fields.has_discrepancy
  );
});

test("tutarsızlıkta istisna kodu ZORUNLU", async () => {
  await assert.rejects(
    () => podMock.recordProofOfDelivery(gecerliKayit(BEKLEYEN, { delivered_package_count: 2, has_discrepancy: 1 })),
    (e) => e.code === "VALIDATION_ERROR" && !!e.fields.exception_code
  );
});

test("doğrulama hatası ALAN BAZINDA — tek genel mesaj değil", async () => {
  await assert.rejects(
    () => podMock.recordProofOfDelivery({ shipment: BEKLEYEN, delivered_package_count: 1, total_package_count: 4 }),
    (e) => {
      assert.equal(e.code, "VALIDATION_ERROR");
      assert.ok(Object.keys(e.fields).length >= 3, "birden çok alan hatası tek mesaja çöktü");
      return true;
    }
  );
});

test("teslim edilmemiş sevkiyata kanıt kaydedilemiyor", async () => {
  await assert.rejects(
    () => podMock.recordProofOfDelivery(gecerliKayit(ODEMESIZ)),
    (e) => e.code === "INVALID_STATUS"
  );
});

test("aynı sevkiyata ikinci kanıt yazılamıyor", async () => {
  await assert.rejects(() => podMock.recordProofOfDelivery(gecerliKayit(TAM)), (e) => e.code === "POD_ALREADY_RECORDED");
});

// ── düzeltme ─────────────────────────────────────────────────────────

test("düzeltmede gerekçe ZORUNLU", async () => {
  await assert.rejects(
    () => podMock.amendProofOfDelivery(gecerliKayit(TAM, { delivered_package_count: 8, total_package_count: 8 })),
    (e) => e.code === "VALIDATION_ERROR" && !!e.fields.reason
  );
});

test("satıcı düzeltme YAPAMIYOR", async () => {
  await assert.rejects(
    () => podMock.amendProofOfDelivery(gecerliKayit(TAM, { asSeller: true, reason: "yanlış girdim" })),
    (e) => e.code === "CAPABILITY_REQUIRED"
  );
});

test("düzeltme İZ BIRAKIYOR — kayıt silinmiyor", async () => {
  await podMock.amendProofOfDelivery(
    gecerliKayit(TAM, { delivered_package_count: 8, total_package_count: 8, reason: "koli sayısı yanlış girilmiş" })
  );
  const { entries } = await podMock.getPodAudit(TAM);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].action, "amend");
  assert.equal(entries[0].reason, "koli sayısı yanlış girilmiş");
});

test("düzeltme kaydın KAYNAĞINI değiştirmiyor", async () => {
  await podMock.recordProofOfDelivery(gecerliKayit(BEKLEYEN, { asSeller: true }));
  const sonuc = await podMock.amendProofOfDelivery(
    gecerliKayit(BEKLEYEN, { reason: "operasyon doğruladı" })
  );
  assert.equal(sonuc.proof_of_delivery.source, "seller", "satıcı beyanı olduğu bilgisi kayboldu");
});

// ── medya yetkisi ────────────────────────────────────────────────────

test("yetki yoksa medya alanları yanıtta HİÇ BULUNMUYOR", async () => {
  const yetkili = await podMock.getProofOfDelivery(TAM, { canViewMedia: true });
  assert.ok("signature_url" in yetkili.proof_of_delivery);

  const yetkisiz = await podMock.getProofOfDelivery(TAM, { canViewMedia: false });
  assert.ok(!("signature_url" in yetkisiz.proof_of_delivery), "alan null olarak da olsa gönderildi");
  assert.ok(!("photo_url" in yetkisiz.proof_of_delivery));
  // Üst veri görünmeye DEVAM ediyor — yetkisizlik tüm kaydı gizlemek değil.
  assert.equal(yetkisiz.proof_of_delivery.received_by, yetkili.proof_of_delivery.received_by);
});

// ── kanıt yok = eksik veri, hata değil ───────────────────────────────

test("kanıtı olmayan sevkiyat HATA DEĞİL, null döndürüyor", async () => {
  const okuma = await podMock.getProofOfDelivery(BEKLEYEN);
  assert.equal(okuma.proof_of_delivery, null);
  assert.equal(okuma.shipment_status, "Delivered");
});

// ── teslimat akışları ────────────────────────────────────────────────

test("satıcı KENDİ kayıtlarını görüyor — liste kısalıyor", async () => {
  const hepsi = await podMock.listDeliveryFlows({ flowType: "seller_delivery" });
  const satici = await podMock.listDeliveryFlows({ flowType: "seller_delivery", asSeller: true });
  assert.ok(satici.rows.length < hepsi.rows.length, "satıcı süzgeci hiçbir şey süzmedi");
  assert.ok(satici.rows.every((r) => r.seller_name === "Kaya Hırdavat"));
});

test("randevusu geçmiş kayıt işaretleniyor", async () => {
  const { rows } = await podMock.listDeliveryFlows({ flowType: "seller_delivery" });
  assert.ok(rows.some((r) => r.overdue === true), "geçmiş randevu hiç işaretlenmedi");
});

// ── teslim kapıları ──────────────────────────────────────────────────

test("ödeme alınmamışsa teslim ENGELLENİYOR", async () => {
  await assert.rejects(
    () => podMock.handOverShipment({ shipment: ODEMESIZ, received_by: "X", received_by_title: "Şoför" }),
    (e) => e.code === "PAYMENT_REQUIRED"
  );
});

test("teslim kodu yanlışsa deneme sayılıyor, 3'te KİLİTLENİYOR", async () => {
  const { rows } = await podMock.listDeliveryFlows({ flowType: "buyer_pickup" });
  // Kodu HENÜZ doğrulanmamış olan: `verified` kayıtta kod hiç sorulmaz.
  const hedef = rows.find(
    (r) => r.delivery_code_required && r.delivery_code_status !== "verified" && r.payment_status !== "unpaid" && r.status !== "Delivered"
  );
  assert.ok(hedef, "kodu doğrulanmamış uygun sevkiyat tohumda yok");

  for (let i = 1; i <= 3; i++) {
    await assert.rejects(
      () => podMock.handOverShipment({ shipment: hedef.shipment, delivery_code: "0000", received_by: "X", received_by_title: "Şoför" }),
      (e) => e.code === "DELIVERY_CODE_NOT_VERIFIED"
    );
  }
  // Kilitlendikten sonra DOĞRU kod da geçmiyor.
  await assert.rejects(
    () => podMock.handOverShipment({ shipment: hedef.shipment, delivery_code: "4821", received_by: "X", received_by_title: "Şoför" }),
    (e) => e.code === "DELIVERY_CODE_NOT_VERIFIED"
  );
});

test("teslim başarılı olunca sevkiyat KUYRUĞA düşüyor", async () => {
  const { rows } = await podMock.listDeliveryFlows({ flowType: "buyer_pickup" });
  // Kapıları GEÇEBİLEN kayıt: kod ya gerekmiyor ya doğrulanmış, ödeme tamam.
  const hedef = rows.find(
    (r) =>
      r.status !== "Delivered" &&
      r.payment_status !== "unpaid" &&
      (!r.delivery_code_required || r.delivery_code_status === "verified")
  );
  assert.ok(hedef, "kapıları geçebilen sevkiyat tohumda yok");

  const sonuc = await podMock.handOverShipment({
    shipment: hedef.shipment,
    received_by: "Serkan Ay",
    received_by_title: "Satın alma sorumlusu",
  });
  assert.equal(sonuc.status, "Delivered");
  assert.equal(sonuc.pod_required, true, "teslim POD'u tetiklemiyor");

  const q = await podMock.getPodQueue({ bucket: "awaiting" });
  assert.ok(q.rows.some((r) => r.shipment === hedef.shipment), "teslim edilen sevkiyat kuyruğa girmedi");
});

// ── tetiklenebilir hatalar ───────────────────────────────────────────

test("her hata kodu TETİKLENEBİLİYOR", async () => {
  const senaryolar = [
    ["permission", () => podMock.getPodQueue({}), "CAPABILITY_REQUIRED"],
    ["internal", () => podMock.getPodQueue({}), "INTERNAL_ERROR"],
    ["conflict", () => podMock.recordProofOfDelivery(gecerliKayit(BEKLEYEN)), "CONFLICT"],
    ["recorded", () => podMock.recordProofOfDelivery(gecerliKayit(BEKLEYEN)), "POD_ALREADY_RECORDED"],
    ["payment", () => podMock.handOverShipment({ shipment: BEKLEYEN, received_by: "X", received_by_title: "Y" }), "PAYMENT_REQUIRED"],
    ["code", () => podMock.handOverShipment({ shipment: BEKLEYEN, received_by: "X", received_by_title: "Y" }), "DELIVERY_CODE_NOT_VERIFIED"],
  ];
  for (const [tetik, cagri, beklenen] of senaryolar) {
    setFault(tetik);
    await assert.rejects(cagri, (e) => e.code === beklenen, `${tetik} → ${beklenen} üretmedi`);
    clearFault();
  }
});

test("tetikleyici kapalıyken hiçbir çağrı patlamıyor", async () => {
  clearFault();
  await podMock.getPodQueue({});
  await podMock.getProofOfDelivery(TAM);
  await podMock.listShipmentEvents(TAM);
  await podMock.getExceptionCodes();
});

// ── katalog ──────────────────────────────────────────────────────────

test("istisna kodları KATALOGDAN geliyor", async () => {
  const { codes } = await podMock.getExceptionCodes();
  assert.ok(codes.length >= 5);
  assert.ok(codes.every((c) => c.code && c.label && c.severity));
});

test("teslim noktası kartı mevcut katalogdan besleniyor", async () => {
  const q = await podMock.getPodQueue({});
  const nokta = q.rows.map((r) => r.delivery_point).find(Boolean);
  const { branch } = await podMock.getCarrierBranch(nokta);
  assert.ok(branch.name && branch.branch_type && branch.operating_hours);
});

// ── bekleme süresi ───────────────────────────────────────────────────

test("bekleme süresi SUNUCUDAN geliyor ve 24 saati aşan kayıt var", async () => {
  const q = await podMock.getPodQueue({});
  assert.ok(q.server_time, "server_time yok — istemci saatine düşülür");
  assert.ok(q.rows.every((r) => r.hours_since === null || r.hours_since >= 0));
});

// ── istasyon olayları ────────────────────────────────────────────────

test("olay setleri SEVKİYATA bağlı — istasyon sekmesi boş kalmıyor", async () => {
  // ÖLÇÜLDÜ (E2E, 2026-08-19): tohumdaki olay setleri mockup'tan gelen
  // VARYANT anahtarlarıyla duruyordu (normal/stuck/…) ve hiçbir sevkiyata
  // bağlı değildi; istasyon sekmesi her sevkiyatta boş çıkıyordu. Bu test
  // eskiden yalnız "hata atmıyor" diyordu — veriyi hiç ölçmüyordu.
  const beklenen = {
    "SHP-2026-00033": { enAz: 3, konum: true },
    "SHP-2026-00038": { enAz: 3, konum: true },
    "SHP-2026-00041": { enAz: 1, konum: true },
    // Konum HİÇ taşınmayan set: ekranın "bu bilgi henüz taşınmıyor" dalını
    // görebilmek için en az bir sevkiyata bağlı olmalı.
    "SHP-2026-00045": { enAz: 1, konum: false },
  };

  for (const [shipment, { enAz, konum }] of Object.entries(beklenen)) {
    const { events } = await podMock.listShipmentEvents(shipment);
    assert.ok(events.length >= enAz, `${shipment}: ${events.length} olay, en az ${enAz} bekleniyordu`);
    assert.equal(
      events.some((e) => e.location),
      konum,
      `${shipment}: konum verisi beklentiyle uyuşmuyor`
    );
  }
});
