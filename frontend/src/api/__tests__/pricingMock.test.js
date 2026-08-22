// Fiyat mock'unun HESAP ÇEKİRDEĞİ testleri.
//
// NEDEN VAR: mock "çalışan taklit" olmak zorunda (FE-MOCK-DISIPLINI §2.3) —
// sabit fixture döndürmüyor, gerçekten hesaplıyor. Hesap sözleşmeden saparsa
// ekran doğru görünür ama gerçek uca bağlanınca fiyat değişir ve bunu kimse
// fark etmez. Bu dosya sapmayı yakalar.
//
// Beklenen tutarlar `docs/lojistik/20-FE-VERI-SOZLESMESI.md` §5.3'teki
// doğrulanmış tablodan alındı — testin kendi hesabından değil.

import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";

// `localStorage`/`sessionStorage` node'da yok; mock kalıcılığı onlara yazıyor.
// Sahte olmadan modül import anında değil, ilk çağrıda patlardı.
function installStorage() {
  const make = () => {
    const map = new Map();
    return {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: (k) => map.delete(k),
      clear: () => map.clear(),
    };
  };
  globalThis.localStorage = make();
  globalThis.sessionStorage = make();
}
installStorage();

const {
  applySurcharges,
  calculateDesi,
  chargeableWeight,
  evaluateRules,
  pricingMock,
  quoteFromRule,
  resetMockData,
  setFault,
  tierFor,
  tierProblems,
  round2,
  deriveRule,
} = await import("../pricingMock.js");
const { SEED_RULES } = await import("../pricingSeed.js");

const SELLER = "SEL-00001";

beforeEach(() => {
  installStorage();
  resetMockData(SELLER);
});

// ── desi ─────────────────────────────────────────────────────────────

test("desi YUKARI yuvarlanır — 10,2 desilik paket 11 desiden ücretlenir", () => {
  // 30×30×34 / 3000 = 10,2
  assert.equal(calculateDesi({ length_cm: 30, width_cm: 30, height_cm: 34 }), 11);
});

test("ücretlendirilebilir ağırlık PARSEL BAŞINA max(fiili, desi) topluyor", () => {
  // Ağır-küçük (20 kg, 1 desi) + hafif-hacimli (1 kg, 20 desi):
  // doğru cevap 20 + 20 = 40. Toplamlar üzerinden max alınsaydı
  // max(21 kg, 21 desi) = 21 çıkardı ve ücret EKSİK hesaplanırdı.
  const toplam = chargeableWeight([
    { length_cm: 10, width_cm: 10, height_cm: 30, weight_kg: 20, qty: 1 }, // 1 desi
    { length_cm: 60, width_cm: 50, height_cm: 20, weight_kg: 1, qty: 1 }, // 20 desi
  ]);
  assert.equal(toplam, 40);
});

// ── kademe ───────────────────────────────────────────────────────────

test("kademe aralığı YARI AÇIK — sınır değeri ÜST kademeye düşer", () => {
  const rule = {
    tiers: [
      { min_desi: 0, max_desi: 10 },
      { min_desi: 10, max_desi: 30 },
    ],
  };
  // Kapalı aralık olsaydı 10 desi İKİ kademeye birden düşer, iki farklı
  // fiyat çıkardı. Sözleşme §1.1: min dahil, max HARİÇ.
  assert.equal(tierFor(rule, 9.9).max_desi, 10);
  assert.equal(tierFor(rule, 10).max_desi, 30);
});

test("kademe doğrulaması çakışmayı, boşluğu ve boş tabloyu ayırt ediyor", () => {
  assert.equal(tierProblems([])[0].code, "VALIDATION_ERROR");
  assert.equal(
    tierProblems([
      { min_desi: 0, max_desi: 30 },
      { min_desi: 25, max_desi: 50 },
    ])[0].code,
    "TIER_RANGE_OVERLAP"
  );
  assert.equal(
    tierProblems([
      { min_desi: 0, max_desi: 30 },
      { min_desi: 40, max_desi: 50 },
    ])[0].code,
    "TIER_RANGE_GAP"
  );
  assert.deepEqual(
    tierProblems([
      { min_desi: 0, max_desi: 30 },
      { min_desi: 30, max_desi: null },
    ]),
    []
  );
});

// ── ek ücret ─────────────────────────────────────────────────────────

test("ek ücretler SIRAYLA uygulanıyor; yüzde BİRİKMİŞ tutar üzerinden", () => {
  // Sözleşme §5.3: ücra bölge (sabit 35) önce, yakıt (%6) onun üzerine.
  const { total } = applySurcharges(
    385.2,
    [
      { surcharge_type: "Ücra bölge", calc_method: "fixed", value: 35, applies_to: "both" },
      { surcharge_type: "Yakıt farkı", calc_method: "percent", value: 6, applies_to: "both" },
    ],
    "charge"
  );
  assert.equal(round2(total), 445.41);

  // Sıra TERS olsaydı 443,31 çıkardı — sözleşmede bu fark yazılı.
  const ters = applySurcharges(
    385.2,
    [
      { surcharge_type: "Yakıt farkı", calc_method: "percent", value: 6, applies_to: "both" },
      { surcharge_type: "Ücra bölge", calc_method: "fixed", value: 35, applies_to: "both" },
    ],
    "charge"
  );
  assert.equal(round2(ters.total), 443.31);
});

test("applies_to alanı tarafı ayırıyor — `charge` ek ücreti alışa binmiyor", () => {
  const s = [{ surcharge_type: "Sigorta", calc_method: "fixed", value: 50, applies_to: "charge" }];
  assert.equal(applySurcharges(100, s, "charge").total, 150);
  assert.equal(applySurcharges(100, s, "cost").total, 100);
});

// ── sözleşmedeki doğrulanmış tutarlar ────────────────────────────────

test("sözleşme §5.3 tablosundaki üç tutar birebir çıkıyor", () => {
  const senaryolar = [
    {
      ad: "Aras",
      rule: {
        tax_rate: 20,
        surcharges: [{ calc_method: "percent", value: 7, applies_to: "both" }],
      },
      tier: { min_desi: 30, max_desi: 50, base_cost: 245, base_charge: 320, per_desi_charge: 1.4 },
      beklenen: {
        customer_charge: 360.38,
        carrier_cost: 262.15,
        margin: 98.23,
        tax_amount: 72.08,
        total_with_tax: 432.46,
      },
    },
    {
      ad: "MNG",
      rule: { tax_rate: 20, surcharges: [] },
      tier: { min_desi: 30, max_desi: 50, base_cost: 291, base_charge: 380, per_desi_charge: 1.6 },
      beklenen: {
        customer_charge: 399.2,
        carrier_cost: 291,
        margin: 108.2,
        tax_amount: 79.84,
        total_with_tax: 479.04,
      },
    },
    {
      ad: "Yurtiçi",
      rule: {
        tax_rate: 20,
        surcharges: [
          { calc_method: "fixed", value: 35, applies_to: "both" },
          { calc_method: "percent", value: 6, applies_to: "both" },
        ],
      },
      tier: { min_desi: 30, max_desi: 50, base_cost: 260, base_charge: 360, per_desi_charge: 2.1 },
      beklenen: {
        customer_charge: 445.41,
        carrier_cost: 312.7,
        margin: 132.71,
        tax_amount: 89.08,
        total_with_tax: 534.49,
      },
    },
  ];

  for (const { ad, rule, tier, beklenen } of senaryolar) {
    const q = quoteFromRule(rule, tier, { desi: 42 });
    for (const [alan, deger] of Object.entries(beklenen)) {
      assert.equal(q[alan], deger, `${ad} · ${alan}: ${q[alan]} ≠ ${deger}`);
    }
  }
});

test("asgari ücret tabanı yükseltiyor", () => {
  const q = quoteFromRule(
    { tax_rate: 0, surcharges: [] },
    { min_desi: 0, max_desi: 10, base_charge: 40, min_charge: 165 },
    { desi: 2 }
  );
  assert.equal(q.customer_charge, 165);
});

// ── katmanlı değerlendirme ───────────────────────────────────────────

const derive = (rules) => rules.map((r) => deriveRule(r, { allRules: rules }));

test("satıcı kuralı platform kuralını yener, platform katmanına İNİLMEZ", () => {
  const ctx = {
    desi: 42,
    weight_kg: 38.5,
    zone: "TR-DOGU",
    order_total: 4200,
    seller_profile: SELLER,
  };
  const { winner, evaluations } = evaluateRules(derive(SEED_RULES), ctx);

  assert.equal(winner.rule.name, "PR-ALI-ARAS-DOGU");
  assert.equal(winner.rule.layer, "seller");

  const platformIzi = evaluations.find((e) => e.rule === "PR-EAST-YK");
  assert.equal(platformIzi.reason_code, "SELLER_LAYER_MATCHED");
});

test("ZORUNLU platform kuralı satıcı kuralını EZİYOR ve iz bunu söylüyor", () => {
  // 6.000 ₺ sipariş → ücretsiz kargo kampanyası devreye giriyor.
  const ctx = {
    desi: 42,
    weight_kg: 38.5,
    zone: "TR-DOGU",
    order_total: 6000,
    seller_profile: SELLER,
  };
  const { winner, evaluations } = evaluateRules(derive(SEED_RULES), ctx);

  assert.equal(winner.rule.name, "PR-FREE-5000");
  const ezilen = evaluations.find((e) => e.rule === "PR-ALI-ARAS-DOGU");
  assert.equal(ezilen.reason_code, "OVERRIDDEN_BY_MANDATORY");
  // Sessizce kaybolmuyor: kural izde DURUYOR, sebebiyle.
  assert.match(ezilen.reason, /zorunlu/i);
});

test("elenen her kuralın SEBEBİ var — 'eşleşmedi' tek başına yetmiyor", () => {
  const ctx = {
    desi: 42,
    weight_kg: 38.5,
    zone: "TR-DOGU",
    order_total: 4200,
    seller_profile: SELLER,
  };
  const { evaluations } = evaluateRules(derive(SEED_RULES), ctx);
  const sebepsiz = evaluations.filter((e) => !e.matched && (!e.reason_code || !e.reason));
  assert.deepEqual(sebepsiz, []);
});

// ── türetilmiş alanlar ───────────────────────────────────────────────

test("çakışan öncelik ve gölgeleme TÜRETİLİYOR, tohumda yazılı değil", () => {
  const turetilmis = derive(SEED_RULES);
  const a = turetilmis.find((r) => r.name === "PR-STD-YK");
  assert.deepEqual(a.priority_conflict_with, ["PR-STD-YK-ESKI"]);

  // Tohumda bu alan hiç yok — hesaplanıyor.
  assert.equal("priority_conflict_with" in SEED_RULES.find((r) => r.name === "PR-STD-YK"), false);
});

test("negatif marj türetiliyor — satıcı kendi aracıyla ücretsiz taşıyor", () => {
  const kural = derive(SEED_RULES).find((r) => r.name === "PR-ALI-SELF-IST");
  assert.equal(kural.has_negative_margin, 1);
});

// ── maskeleme (sözleşme §7.2) ────────────────────────────────────────

test("platform, SATICININ alış maliyetini GÖRMÜYOR", async () => {
  const { items } = await pricingMock.listPricingRules({ asSeller: false });
  const saticiKurali = items.find((r) => r.name === "PR-ALI-ARAS-DOGU");
  assert.equal("min_base_cost" in saticiKurali, false, "alış alanı yanıtta HİÇ bulunmamalı");
  assert.equal("has_negative_margin" in saticiKurali, false);
  // Satış tarafı görünür kalıyor.
  assert.equal(typeof saticiKurali.min_base_charge, "number");
});

test("satıcı KENDİ maliyetini görüyor, platformunkini görmüyor", async () => {
  const { items } = await pricingMock.listPricingRules({ asSeller: true, sellerName: SELLER });
  const kendi = items.find((r) => r.name === "PR-ALI-ARAS-DOGU");
  const platform = items.find((r) => r.name === "PR-EAST-YK");
  assert.equal(typeof kendi.min_base_cost, "number");
  assert.equal("min_base_cost" in platform, false);
});

test("satıcı BAŞKA satıcının kuralını hiç görmüyor", async () => {
  const { items } = await pricingMock.listPricingRules({ asSeller: true, sellerName: SELLER });
  assert.equal(
    items.some((r) => r.seller_profile === "SEL-00002"),
    false
  );
});

// ── uçlar ────────────────────────────────────────────────────────────

test("liste yanıtı KATMAN SAYAÇLARINI aynı yanıtta taşıyor", async () => {
  const data = await pricingMock.listPricingRules({});
  assert.equal(
    data.layers.platform_mandatory + data.layers.seller + data.layers.platform,
    data.total
  );
});

test("liste ucu alt tabloları GETİRMİYOR, detay ucu getiriyor", async () => {
  const { items } = await pricingMock.listPricingRules({});
  assert.equal("tiers" in items[0], false);
  const detay = await pricingMock.getPricingRule("PR-ALI-ARAS-DOGU");
  assert.equal(detay.tiers.length, 4);
});

test("kaydedilen kural KALICI — yeniden okunduğunda duruyor", async () => {
  await pricingMock.savePricingRule({
    name: "PR-ALI-ARAS-DOGU",
    values: {
      rule_name: "Doğu Anadolu · yeni ad",
      tiers: [{ min_desi: 0, max_desi: null, base_charge: 100 }],
    },
  });
  const tekrar = await pricingMock.getPricingRule("PR-ALI-ARAS-DOGU");
  assert.equal(tekrar.rule_name, "Doğu Anadolu · yeni ad");
});

test("kaydetme kademe çakışmasını REDDEDİYOR — kapı arayüz değil, uç", async () => {
  await assert.rejects(
    () =>
      pricingMock.savePricingRule({
        values: {
          rule_name: "Bozuk",
          tiers: [
            { min_desi: 0, max_desi: 30 },
            { min_desi: 25, max_desi: 50 },
          ],
        },
      }),
    (e) => e.code === "TIER_RANGE_OVERLAP"
  );
});

test("satıcı `is_mandatory` işaretleyemiyor — arayüz gizlese de uç koruyor", async () => {
  await assert.rejects(
    () =>
      pricingMock.savePricingRule({
        asSeller: true,
        sellerName: SELLER,
        values: {
          rule_name: "Zorunlu denemesi",
          is_mandatory: 1,
          tiers: [{ min_desi: 0, base_charge: 10 }],
        },
      }),
    (e) => e.code === "MANDATORY_NOT_ALLOWED"
  );
});

test("kullanımdaki kural SİLİNMİYOR", async () => {
  await assert.rejects(
    () => pricingMock.deletePricingRule("PR-ALI-ARAS-DOGU"),
    (e) => e.code === "RULE_IN_USE"
  );
});

// ── simülasyon ───────────────────────────────────────────────────────

test("simülasyon HER hesap için satır döndürüyor; fiyat üretemeyen DÜŞMÜYOR", async () => {
  const s = await pricingMock.simulatePrice({
    desi: 42,
    weight_kg: 38.5,
    zone: "TR-DOGU",
    order_total: 4200,
    seller_profile: SELLER,
  });
  const ptt = s.quotes.find((q) => q.carrier_account === "CACC-PTT-PLATFORM");
  // Boş liste "PTT neden yok?" sorusunu cevapsız bırakırdı.
  assert.equal(ptt.available, 0);
  assert.equal(ptt.unavailable_reason, "NO_RULE_MATCHED");
});

test("önerilen hesap: satıcının KENDİ anlaşması platformun varsayılanını ezmiyor", async () => {
  // Ölçülmüş hata: sahiplik ayrımı yokken platformun `is_default` Yurtiçi'si
  // (445,41 ₺) öneriliyordu ve satıcının kendi Aras'ı (360,38 ₺) geride kalıyordu.
  const s = await pricingMock.simulatePrice({
    desi: 42,
    weight_kg: 38.5,
    zone: "TR-DOGU",
    order_total: 4200,
    seller_profile: SELLER,
  });
  assert.equal(s.recommended, "CACC-AK-SEL00001");
});

test("değerlendirme izi YALNIZ önerilen hesapta dolu geliyor", async () => {
  const s = await pricingMock.simulatePrice({
    desi: 42,
    weight_kg: 38.5,
    zone: "TR-DOGU",
    order_total: 4200,
    seller_profile: SELLER,
  });
  for (const q of s.quotes) {
    const dolu = q.evaluations.length > 0;
    assert.equal(dolu, q.carrier_account === s.recommended, `${q.carrier_account} izi beklenmedik`);
  }
});

test("gerçek sevkiyat girdisi sunucuda çözülüyor — arayüz değer hesaplamıyor", async () => {
  const s = await pricingMock.simulatePrice({ shipment: "SHP-2026-00042" });
  assert.equal(s.input.desi, 42);
  assert.equal(s.input.zone, "TR-IC");
  assert.equal(s.input.source, "shipment");
});

// ── tetiklenebilir hatalar ───────────────────────────────────────────

test("hata tetikleyicisi KAPSAMA göre çalışıyor — silme hatası listeyi patlatmıyor", async () => {
  setFault("RULE_IN_USE");
  await assert.doesNotReject(() => pricingMock.listPricingRules({}));
  await assert.rejects(
    () => pricingMock.deletePricingRule("PR-HEAVY"),
    (e) => e.code === "RULE_IN_USE"
  );
});

test("sözleşme §4'teki her hata kodu tetiklenebiliyor", async () => {
  const { FAULT_CODES } = await import("../pricingMock.js");
  const kapsam = {
    read: () => pricingMock.listPricingRules({}),
    write: () =>
      pricingMock.savePricingRule({ values: { rule_name: "x", tiers: [{ min_desi: 0 }] } }),
    delete: () => pricingMock.deletePricingRule("PR-HEAVY"),
    simulate: () => pricingMock.simulatePrice({ desi: 1 }),
  };
  for (const { code, scope } of FAULT_CODES) {
    setFault(code);
    await assert.rejects(kapsam[scope], (e) => e.code === code, `${code} tetiklenemedi`);
    setFault(null);
  }
});

// ── §2.3b · SIRALAMA ────────────────────────────────────────────────────
//
// Sıralama önce `savePricingRule`'a tüm belgeyi geri göndererek yapılıyordu
// ve HİÇ çalışmıyordu: liste yükü alt tabloları taşımadığı için her kayıt
// "En az bir kademe gerekli" ile reddediliyor, sürükleme sessizce
// kayboluyordu (ölçüldü 2026-08-21, E2E S2c). Bu testler o yolun
// kapandığını ve yeni ucun kapılarının yerinde olduğunu doğruluyor.

test("sıralama önceliği 10'ar veriyor ve KALICI", async () => {
  const { items } = await pricingMock.listPricingRules({});
  const platform = items.filter((r) => r.layer === "platform").map((r) => r.name);
  assert.ok(platform.length > 1, "platform katmanında iki kuraldan az var");

  const ters = [...platform].reverse();
  await pricingMock.reorderPricingRules({ layer: "platform", order: ters });

  const sonra = await pricingMock.listPricingRules({});
  const yeni = sonra.items.filter((r) => r.layer === "platform");
  assert.deepEqual(
    yeni.map((r) => r.name),
    ters,
    "sıra kaydedilmedi"
  );
  assert.deepEqual(
    yeni.map((r) => r.priority),
    ters.map((_, i) => (i + 1) * 10),
    "öncelikler 10'ar verilmedi"
  );
});

test("sıralama ALT TABLO istemiyor — kayıt yolunun tersine", async () => {
  // Aynı kuralı `savePricingRule` ile liste yüküyle kaydetmek REDDEDİLİYOR;
  // sıralama ucu ise geçiyor. İkisinin farkı bu testin konusu.
  const { items } = await pricingMock.listPricingRules({});
  const kural = items.find((r) => r.layer === "platform");
  assert.ok(kural, "platform kuralı yok");
  assert.equal(kural.tiers, undefined, "liste yükü alt tabloyu taşıyor — sözleşme §2.1 değişmiş");

  await assert.rejects(
    () => pricingMock.savePricingRule({ name: kural.name, values: { ...kural, priority: 90 } }),
    (e) => e.code === "VALIDATION_ERROR"
  );
  await assert.doesNotReject(() =>
    pricingMock.reorderPricingRules({ layer: "platform", order: [kural.name] })
  );
});

test("satıcı BAŞKASININ kuralını sıralayamıyor", async () => {
  const { items } = await pricingMock.listPricingRules({});
  const baskasi = items.find((r) => r.seller_profile && r.seller_profile !== SELLER);
  const kendi = items.find((r) => r.seller_profile === SELLER);
  assert.ok(kendi, "satıcının kendi kuralı yok");

  if (baskasi) {
    await assert.rejects(
      () =>
        pricingMock.reorderPricingRules({
          layer: "seller",
          order: [baskasi.name],
          asSeller: true,
          sellerName: SELLER,
        }),
      (e) => e.code === "PERMISSION_DENIED"
    );
  }
});

test("kural KATMAN DIŞINA taşınamıyor, olmayan kural NOT_FOUND", async () => {
  const { items } = await pricingMock.listPricingRules({});
  const satici = items.find((r) => r.layer === "seller");
  assert.ok(satici, "satıcı katmanında kural yok");

  await assert.rejects(
    () => pricingMock.reorderPricingRules({ layer: "platform", order: [satici.name] }),
    (e) => e.code === "VALIDATION_ERROR"
  );
  await assert.rejects(
    () => pricingMock.reorderPricingRules({ layer: "platform", order: ["PR-YOK-BOYLE"] }),
    (e) => e.code === "NOT_FOUND"
  );
});
