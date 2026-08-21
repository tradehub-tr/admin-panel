// Fiyatlandırma — ÇALIŞAN TAKLİT (20-FE mock).
//
// Bu dosya sahte veri döndüren bir stub DEĞİL; backend'in yerine geçen bir
// taklittir (docs/lojistik/FE-MOCK-DISIPLINI.md). Dört zorunluluk:
//   · Kalıcılık        → localStorage; yazılan kural yenilemede durur, sıfırlama yolu var
//   · Durum geçişleri  → TEK doğruluk kaynağı kural listesi; katmanlar, sayaçlar,
//                        çakışma/gölgeleme uyarıları ve teklifler ondan TÜRETİLİR
//   · Gerçek çıktı     → simülasyon GERÇEKTEN hesaplıyor (sözleşme §5 sırası birebir),
//                        sabit fixture döndürmüyor
//   · Tetiklenebilir hata → sözleşme §4'teki her kod denenebilir
//
// Sözleşme: docs/lojistik/20-FE-VERI-SOZLESMESI.md — alan adları BİREBİR.
// Uydurulan alan gerçek uca bağlanınca ekranı bozar.
//
// KAPATMA: uçlar yazıldıkça `api/logisticsPricing.js` içindeki `MOCK` haritasının
// ilgili satırı `false` yapılır; ekranlarda ve store'da hiçbir değişiklik gerekmez.

import {
  DESI_DIVISOR,
  MOCK_NOW,
  SEED_ACCOUNTS,
  SEED_RULES,
  SEED_ZONES,
  SELLER_LABELS,
  SELLER_ME,
} from "./pricingSeed.js";

const STORAGE_KEY = "logistics.mock.pricing.v1";

/**
 * Hata tetikleyicisi `sessionStorage`'da: 13-FE'de `localStorage`'a yazılmıştı
 * ve sekme kapansa bile kalıyordu — ertesi gün "panel bozuk" diye dönüldü.
 */
const FAULT_KEY = "logistics.mock.pricing.fault";
const faultStore = () => (typeof sessionStorage !== "undefined" ? sessionStorage : localStorage);

// ═══════════════════════════════════════════════════════════════════════
//  SAF HESAP ÇEKİRDEĞİ
//  Tarayıcı API'si YOK — `node --test` bunları doğrudan çağırıyor.
//  Sözleşme §5'in birebir karşılığı; sapma gerçek uca bağlanınca fiyat farkı üretir.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Kuruşa yuvarlama.
 *
 * `Number.EPSILON` eklenmesi şart: `Math.round(1.005 * 100) / 100` JavaScript'te
 * 1 döndürüyor çünkü 1.005 ikili tabanda 1.00499999… olarak saklanıyor.
 */
export const round2 = (v) => (v == null ? null : Math.round((v + Number.EPSILON) * 100) / 100);

/**
 * Desi — `tradehub_core/logistics/services/desi.py::calculate_desi` portu.
 *
 * Yukarı yuvarlama (`ceil`) taşıyıcı standardı: 10,2 desilik paket 11 desiden
 * ücretlendirilir.
 */
export function calculateDesi({ length_cm, width_cm, height_cm, divisor = DESI_DIVISOR }) {
  if (length_cm < 0 || width_cm < 0 || height_cm < 0) throw new Error("Boyut negatif olamaz");
  if (divisor <= 0) throw new Error("Bölen sıfır veya negatif olamaz");
  return Math.ceil((length_cm * width_cm * height_cm) / divisor);
}

/**
 * Ücretlendirilebilir ağırlık — `desi.py::calculate_shipment_totals` portu.
 *
 * PARSEL BAŞINA `max(fiili, desi)` toplanıyor. Toplamlar üzerinden `max` almak,
 * ağır-küçük + hafif-hacimli karışık yüklerde ücreti EKSİK hesaplar; bu kural
 * Python tarafında yazılı ve değiştirilmiyor.
 */
export function chargeableWeight(items, divisor = DESI_DIVISOR) {
  return items.reduce((toplam, item) => {
    const adet = Number(item.qty ?? 1);
    const desi = calculateDesi({ ...item, divisor: item.divisor ?? divisor });
    return toplam + Math.max(Number(item.weight_kg ?? 0), desi) * adet;
  }, 0);
}

/**
 * Gönderinin düştüğü kademe.
 *
 * Aralık YARI AÇIK: `min_desi <= desi < max_desi`. Kapalı olsaydı 10 desilik
 * gönderi hem 0–10 hem 10–30 kademesine düşer ve İKİ farklı fiyat çıkardı.
 */
export function tierFor(rule, desi) {
  return (
    (rule.tiers ?? []).find(
      (t) => desi >= Number(t.min_desi ?? 0) && (t.max_desi == null || desi < Number(t.max_desi))
    ) ?? null
  );
}

/** Kademe aralıklarının sağlığı — sözleşme §2.3 doğrulama sırası. */
export function tierProblems(tiers) {
  const sirali = [...(tiers ?? [])].sort(
    (a, b) => Number(a.min_desi ?? 0) - Number(b.min_desi ?? 0)
  );
  if (!sirali.length)
    return [{ code: "VALIDATION_ERROR", field: "tiers", message: "En az bir kademe gerekli." }];

  for (const t of sirali) {
    if (t.max_desi != null && Number(t.max_desi) <= Number(t.min_desi ?? 0)) {
      return [
        {
          code: "VALIDATION_ERROR",
          field: "tiers",
          message: "Kademe üst sınırı alt sınırdan büyük olmalı.",
        },
      ];
    }
  }
  for (let i = 1; i < sirali.length; i++) {
    const onceki = sirali[i - 1];
    const simdiki = sirali[i];
    if (onceki.max_desi == null) {
      return [
        {
          code: "TIER_RANGE_OVERLAP",
          field: "tiers",
          message: "Üst sınırsız kademeden sonra başka kademe olamaz.",
        },
      ];
    }
    const bitis = Number(onceki.max_desi);
    const baslangic = Number(simdiki.min_desi ?? 0);
    if (baslangic < bitis) {
      return [
        {
          code: "TIER_RANGE_OVERLAP",
          field: "tiers",
          message: `${baslangic}–${bitis} arası iki kademede birden; aynı desi iki farklı fiyat verir.`,
        },
      ];
    }
    if (baslangic > bitis) {
      return [
        {
          code: "TIER_RANGE_GAP",
          field: "tiers",
          message: `${bitis} ile ${baslangic} desi arası hiçbir kademeye girmiyor; o aralıkta fiyat çıkmaz.`,
        },
      ];
    }
  }
  return [];
}

/**
 * Ek ücretleri SIRAYLA uygular.
 *
 * `percent` o ana kadar BİRİKMİŞ tutar üzerinden hesaplanıyor (sözleşme §5.3).
 * Doğu bölgesi örneğinde ücra bölge bedeli önce ekleniyor, yakıt farkı onun da
 * üzerine biniyor — taşıyıcıların gerçek uygulaması bu. Sıra ters olsaydı
 * 445,41 ₺ yerine 443,31 ₺ çıkardı.
 *
 * @returns {{total: number, lines: Array}} Toplam ve kalem kalem döküm.
 */
export function applySurcharges(amount, surcharges, side) {
  const lines = [];
  let tutar = amount;
  for (const s of surcharges ?? []) {
    const uygular = s.applies_to === "both" || s.applies_to === side;
    if (!uygular) continue;
    const ek = s.calc_method === "percent" ? (tutar * Number(s.value)) / 100 : Number(s.value);
    tutar += ek;
    lines.push({
      surcharge_type: s.surcharge_type,
      amount: round2(ek),
      basis: s.calc_method,
      value: Number(s.value),
    });
  }
  return { total: tutar, lines };
}

/**
 * Tek kuralın ölçütleri bu gönderiye uyuyor mu?
 *
 * Kontrol SIRASI anlamlı: en açıklayıcı sebebi döndürmek için önce kaydın kendi
 * durumu (pasif / süresi geçmiş), sonra kapsam, sonra ölçütler bakılıyor.
 * "Eşleşmedi" tek başına yöneticinin kuralı düzeltmesine yaramaz (§3).
 */
export function matchRule(rule, ctx) {
  const red = (reason_code, reason) => ({ matched: false, reason_code, reason });

  if (!rule.is_active) return red("RULE_INACTIVE", "Kural pasif");
  const bugun = ctx.now ?? MOCK_NOW;
  if (rule.valid_from && bugun < rule.valid_from)
    return red("RULE_EXPIRED", `Kural ${rule.valid_from} tarihinde yürürlüğe giriyor`);
  if (rule.valid_until && bugun > rule.valid_until)
    return red("RULE_EXPIRED", `Kuralın geçerliliği ${rule.valid_until} tarihinde bitti`);

  if (rule.seller_profile && rule.seller_profile !== ctx.seller_profile)
    return red("SELLER_SCOPE_MISMATCH", "Kural başka satıcıya ait");

  if (rule.carrier_account && ctx.carrier_account && rule.carrier_account !== ctx.carrier_account)
    return red("CARRIER_MISMATCH", "Kural başka bir taşıyıcı hesabı için yazılmış");
  if (rule.carrier && ctx.carrier && rule.carrier !== ctx.carrier)
    return red("CARRIER_MISMATCH", `Kural ${rule.carrier} için yazılmış`);
  if (rule.carrier_service && ctx.carrier_service && rule.carrier_service !== ctx.carrier_service)
    return red("CARRIER_MISMATCH", "Hizmet tutmuyor");
  if (rule.shipping_method && ctx.shipping_method && rule.shipping_method !== ctx.shipping_method)
    return red("CARRIER_MISMATCH", `Kural "${rule.shipping_method}" yöntemi için yazılmış`);

  if (rule.zone && rule.zone !== ctx.zone)
    return red(
      "ZONE_MISMATCH",
      `Varış bölgesi ${ctx.zone_label ?? ctx.zone ?? "—"}, kural ${rule.zone_label ?? rule.zone} için yazılmış`
    );

  if (rule.origin_city && ctx.origin_city && rule.origin_city !== ctx.origin_city)
    return red("CITY_MISMATCH", `Kural ${rule.origin_city} çıkışlı gönderiler için`);
  if (
    rule.destination_city &&
    ctx.destination_city &&
    rule.destination_city !== ctx.destination_city
  )
    return red("CITY_MISMATCH", `Kural ${rule.destination_city} varışlı gönderiler için`);

  const kg = Number(ctx.weight_kg ?? 0);
  if (rule.min_weight_kg != null && kg < Number(rule.min_weight_kg))
    return red(
      "WEIGHT_OUT_OF_RANGE",
      `Gönderi ${kg} kg, kural ${rule.min_weight_kg} kg ve üzeri için`
    );
  if (rule.max_weight_kg != null && kg > Number(rule.max_weight_kg))
    return red(
      "WEIGHT_OUT_OF_RANGE",
      `Gönderi ${kg} kg, kural en fazla ${rule.max_weight_kg} kg için`
    );

  if (rule.min_order_total != null && Number(ctx.order_total ?? 0) < Number(rule.min_order_total))
    return red(
      "ORDER_TOTAL_BELOW_MIN",
      `Sipariş tutarı ${money(ctx.order_total)} — eşik ${money(rule.min_order_total)}`
    );

  const tier = tierFor(rule, Number(ctx.desi ?? 0));
  if (!tier)
    return red(
      "DESI_OUT_OF_RANGE",
      `Gönderi ${ctx.desi} desi, kuralın kademeleri bu değeri kapsamıyor`
    );

  return { matched: true, reason_code: null, tier };
}

/** Kural + kademe → tutarlar. Sözleşme §5.3'ün birebir uygulaması. */
export function quoteFromRule(rule, tier, ctx) {
  const desi = Number(ctx.desi ?? 0);
  const asan = Math.max(0, desi - Number(tier.min_desi ?? 0));

  let satis = Number(tier.base_charge ?? 0) + Number(tier.per_desi_charge ?? 0) * asan;
  if (tier.min_charge != null) satis = Math.max(satis, Number(tier.min_charge));
  const satisEk = applySurcharges(satis, rule.surcharges, "charge");
  satis = satisEk.total;

  // Alışın desi başı bileşeni YOK (`per_desi_cost` sözleşmede bilinçli eksik):
  // taşıyıcı tarifeleri bandın içinde sabit fiyat veriyor.
  let alis = tier.base_cost == null ? null : Number(tier.base_cost);
  if (alis != null) alis = applySurcharges(alis, rule.surcharges, "cost").total;

  const oran = Number(rule.tax_rate ?? 0);
  const satisYuvarli = round2(satis);
  const kdv = round2((satis * oran) / 100);
  const alisYuvarli = round2(alis);

  return {
    customer_charge: satisYuvarli,
    carrier_cost: alisYuvarli,
    margin: alisYuvarli == null ? null : round2(satisYuvarli - alisYuvarli),
    surcharge_total: round2(satisEk.lines.reduce((t, l) => t + l.amount, 0)),
    surcharges: satisEk.lines,
    tax_rate: oran,
    tax_amount: kdv,
    total_with_tax: round2(satisYuvarli + kdv),
    applied_tier_label: tierLabel(tier),
  };
}

/**
 * Katmanlı değerlendirme — sözleşme §5.2.
 *
 * Bir katmanda eşleşme bulunursa aşağı İNİLMEZ. Kazanandan sonraki kurallar
 * kendi ölçütlerine bakılmadan katman gerekçesiyle işaretleniyor: ölçüte
 * bakmak "bu kural da uyuyordu" izlenimi verirdi, oysa sıra ona hiç gelmedi.
 */
export function evaluateRules(rules, ctx) {
  const sirali = [...rules].sort(
    (a, b) =>
      LAYER_ORDER[a.layer] - LAYER_ORDER[b.layer] ||
      Number(a.priority) - Number(b.priority) ||
      String(a.name).localeCompare(String(b.name))
  );

  const evaluations = [];
  let winner = null;

  for (const rule of sirali) {
    const ortak = {
      rule: rule.name,
      rule_name: rule.rule_name,
      layer: rule.layer,
      owner: rule.seller_profile ?? null,
    };

    if (winner) {
      evaluations.push({ ...ortak, matched: 0, ...afterWinnerReason(rule, winner) });
      continue;
    }

    const sonuc = matchRule(rule, ctx);
    if (sonuc.matched) {
      winner = { rule, tier: sonuc.tier };
      evaluations.push({
        ...ortak,
        matched: 1,
        reason_code: null,
        reason: `${tierLabel(sonuc.tier)} · ${rule.zone_label ?? "tüm bölgeler"} — UYGULANDI`,
      });
    } else {
      evaluations.push({
        ...ortak,
        matched: 0,
        reason_code: sonuc.reason_code,
        reason: sonuc.reason,
      });
    }
  }

  return { winner, evaluations };
}

const LAYER_ORDER = { platform_mandatory: 0, seller: 1, platform: 2 };

/** Kazanandan sonraki kuralın elenme gerekçesi — katman ilişkisine göre. */
function afterWinnerReason(rule, winner) {
  if (winner.rule.layer === "platform_mandatory" && rule.layer !== "platform_mandatory") {
    return {
      reason_code: "OVERRIDDEN_BY_MANDATORY",
      reason: "Zorunlu platform kuralı ezdi",
    };
  }
  if (rule.layer === winner.rule.layer) {
    return {
      reason_code: "HIGHER_PRIORITY_WON",
      reason: `Aynı katmanda #${winner.rule.priority} öncelikli kural önce eşleşti (bu kural #${rule.priority})`,
    };
  }
  if (winner.rule.layer === "seller" && rule.layer === "platform") {
    return {
      reason_code: "SELLER_LAYER_MATCHED",
      reason: "Satıcı katmanında eşleşme bulundu — platform katmanına inilmedi",
    };
  }
  return { reason_code: "HIGHER_PRIORITY_WON", reason: "Daha öncelikli bir kural uygulandı" };
}

// ── küçük yardımcılar (saf) ──────────────────────────────────────────

const money = (v) =>
  v == null
    ? "—"
    : `${Number(v).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;

export const tierLabel = (t) =>
  t == null
    ? null
    : `${Number(t.min_desi ?? 0)}–${t.max_desi == null ? "∞" : Number(t.max_desi)} desi`;

/** Kuralın TÜRETİLMİŞ alanları — tohumda yok, her okumada hesaplanıyor. */
export function deriveRule(rule, { zones = SEED_ZONES, allRules = [] } = {}) {
  const tiers = rule.tiers ?? [];
  const cost = tiers
    .map((t) => t.base_cost)
    .filter((v) => v != null)
    .map(Number);
  const charge = tiers
    .map((t) => t.base_charge)
    .filter((v) => v != null)
    .map(Number);
  const zone = zones.find((z) => z.name === rule.zone) ?? null;

  const layer = rule.seller_profile
    ? "seller"
    : rule.is_mandatory
      ? "platform_mandatory"
      : "platform";

  // Çakışma ve gölgeleme SUNUCUDA hesaplanıyor (sözleşme §1.1): arayüz
  // sayfalanmış listeden bakarsa 2. sayfadaki kuralı göremez ve yanlış söyler.
  const ayniKatman = allRules.filter(
    (r) =>
      r.name !== rule.name &&
      r.is_active &&
      layerOf(r) === layer &&
      r.seller_profile === rule.seller_profile
  );
  const conflict = rule.is_active
    ? ayniKatman.filter((r) => Number(r.priority) === Number(rule.priority)).map((r) => r.name)
    : [];
  const catchAll = ayniKatman.find(
    (r) => Number(r.priority) < Number(rule.priority) && !hasCriteria(r)
  );

  return {
    ...rule,
    layer,
    owner_label: rule.seller_profile ? sellerLabel(rule.seller_profile) : "Platform",
    zone_label: zone?.zone_name ?? null,
    tier_count: tiers.length,
    min_base_cost: cost.length ? Math.min(...cost) : null,
    max_base_cost: cost.length ? Math.max(...cost) : null,
    min_base_charge: charge.length ? Math.min(...charge) : null,
    max_base_charge: charge.length ? Math.max(...charge) : null,
    has_negative_margin: tiers.some(
      (t) =>
        t.base_cost != null && t.base_charge != null && Number(t.base_charge) < Number(t.base_cost)
    )
      ? 1
      : 0,
    surcharge_count: (rule.surcharges ?? []).length,
    priority_conflict_with: conflict,
    shadowed_by: catchAll ? catchAll.name : null,
  };
}

const layerOf = (r) =>
  r.seller_profile ? "seller" : r.is_mandatory ? "platform_mandatory" : "platform";

/** Ölçütü olmayan kural HER gönderiye uyar — altındakileri öldürür. */
function hasCriteria(rule) {
  return Boolean(
    rule.carrier_account ||
    rule.carrier ||
    rule.carrier_service ||
    rule.shipping_method ||
    rule.zone ||
    rule.origin_city ||
    rule.destination_city ||
    rule.min_weight_kg != null ||
    rule.max_weight_kg != null ||
    rule.min_order_total != null
  );
}

/**
 * Satıcı etiketi.
 *
 * Gerçek uçta satıcı adı yanıtla birlikte geliyor (`owner_label`). Mock'ta
 * hesap kayıtlarından türetiliyor — ikinci bir satıcı sözlüğü tutmak, gerçek
 * uca bağlanınca silinecek bir kaynak daha demekti.
 */
function sellerLabel(sellerProfile) {
  if (SELLER_LABELS[sellerProfile]) return SELLER_LABELS[sellerProfile];
  const hesap = SEED_ACCOUNTS.find((a) => a.seller_profile === sellerProfile);
  return hesap?.account_name?.split("—")[1]?.trim() || sellerProfile;
}

// ═══════════════════════════════════════════════════════════════════════
//  DURUM — kalıcılık ve tek doğruluk kaynağı
// ═══════════════════════════════════════════════════════════════════════

/**
 * TEK DOĞRULUK KAYNAĞI: yazılan kurallar.
 *
 * Katmanlar, sayaçlar, çakışma/gölgeleme uyarıları ve teklifler bu listeden
 * TÜRETİLİYOR — hiçbiri ayrı bir dizide tutulmuyor. 13-FE'de kuyruk ayrı bir
 * sabit diziydi: paketleme tamamlansa da sevkiyat eski kovasında kalıyordu.
 */
function seed(sellerName = SELLER_ME) {
  return {
    seller: sellerName,
    rules: JSON.parse(JSON.stringify(SEED_RULES)),
  };
}

function loadState(sellerGelen = SELLER_ME) {
  const sellerName = sellerGelen ?? SELLER_ME;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const kayitli = JSON.parse(raw);
      // Oturum satıcısı değiştiyse eski etiketlerle devam etmek yanlış olur.
      if (kayitli?.seller === sellerName) return kayitli;
    }
  } catch {
    // Bozuk/erişilemez depolama — tohuma dön, ekranı kırma.
  }
  const taze = seed(sellerName);
  saveState(taze);
  return taze;
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Kota dolu / gizli sekme — mock çalışmaya devam eder, kalıcılık kaybolur.
  }
}

/** DEMO panelinin "sıfırla" düğmesi. */
export function resetMockData(sellerName = SELLER_ME) {
  saveState(seed(sellerName));
  clearFault();
}

// ── tetiklenebilir hatalar ───────────────────────────────────────────

/** @returns {string|null} Sözleşme §4'teki hata kodlarından biri. */
export function getFault() {
  try {
    return faultStore().getItem(FAULT_KEY) || null;
  } catch {
    return null;
  }
}

export function setFault(code) {
  try {
    if (code) faultStore().setItem(FAULT_KEY, code);
    else faultStore().removeItem(FAULT_KEY);
  } catch {
    // yok sayılır
  }
}

export const clearFault = () => setFault(null);

/** DEMO panelinin sunacağı liste — sözleşme §4 ile birebir. */
export const FAULT_CODES = Object.freeze([
  { code: "PERMISSION_DENIED", scope: "read", label: "Yetki yok" },
  { code: "CAPABILITY_REQUIRED", scope: "write", label: "Yazma yetkisi yok" },
  { code: "RULE_IN_USE", scope: "delete", label: "Kural kullanımda" },
  { code: "NO_RULE_MATCHED", scope: "simulate", label: "Hiçbir kural eşleşmedi" },
  { code: "FEATURE_DISABLED", scope: "simulate", label: "Bölge fiyatlandırması kapalı" },
  { code: "INTERNAL_ERROR", scope: "read", label: "Beklenmeyen sunucu hatası" },
]);

function fail(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code;
  Object.assign(err, extra);
  return err;
}

/**
 * Tetikleyici açıksa ilgili KAPSAMDA hata fırlatır.
 *
 * `scope` ayrımı olmasaydı "silme" hatası listeyi de patlatırdı ve tetikleyici
 * açıkken hiçbir ekran açılmazdı (14-FE'de ölçülmüş tuzak).
 */
function throwIfFaulted(scope) {
  const kod = getFault();
  if (!kod) return;
  const tanim = FAULT_CODES.find((f) => f.code === kod);
  if (!tanim || tanim.scope !== scope) return;
  throw fail(kod, MESAJ[kod] ?? "Beklenmeyen bir hata oluştu.");
}

const MESAJ = {
  PERMISSION_DENIED: "Bu kaydı görüntüleme yetkiniz yok.",
  CAPABILITY_REQUIRED: "Bu işlem için `pricing_rule.write` yetkisi gerekiyor.",
  RULE_IN_USE: "Bu kural aktif sevkiyatlarda kullanılıyor; silinemez.",
  NO_RULE_MATCHED: "Bu gönderiye uyan kural bulunamadı.",
  FEATURE_DISABLED: "Bölge bazlı fiyatlandırma kapalı (shipping_zone_pricing_enabled).",
  INTERNAL_ERROR: "Beklenmeyen yanıt biçimi (sözleşme zarfı yok).",
};

// ═══════════════════════════════════════════════════════════════════════
//  MASKELEME — sözleşme §7.2, İKİ YÖNLÜ
// ═══════════════════════════════════════════════════════════════════════

/**
 * Maskelenen alan yanıtta HİÇ BULUNMAZ — `null` da gönderilmez.
 *
 * `null` "alan var ama boş" demek olurdu; ekran `—` çizerken bunu "veri yok"
 * sanardı. Oysa anlatılmak istenen "bu alanı görme yetkiniz yok".
 */
const MASKELI_ALANLAR = ["min_base_cost", "max_base_cost", "has_negative_margin"];

function seesCost(ruleOwner, viewer) {
  return viewer.asSeller ? ruleOwner === viewer.sellerName : !ruleOwner;
}

function maskRule(rule, viewer) {
  if (seesCost(rule.seller_profile ?? null, viewer)) return rule;
  const kopya = { ...rule };
  for (const alan of MASKELI_ALANLAR) delete kopya[alan];
  if (kopya.tiers) {
    kopya.tiers = kopya.tiers.map(({ base_cost: _gizli, ...kalan }) => kalan);
  }
  return kopya;
}

function maskQuote(quote, ownerOfAccount, viewer) {
  if (seesCost(ownerOfAccount, viewer)) return quote;
  const { carrier_cost: _a, margin: _b, ...kalan } = quote;
  return kalan;
}

// ═══════════════════════════════════════════════════════════════════════
//  SİMÜLE EDİLEBİLİR SEVKİYATLAR
// ═══════════════════════════════════════════════════════════════════════

/**
 * Gerçek uçta `simulate_price({shipment})` sunucuda çözülüyor: sevkiyatın
 * desisi, çıkış/varış ili ve sipariş tutarı oradan okunuyor. Mock sunucunun
 * yerine geçtiği için bu çözümlemeyi de o yapmalı.
 *
 * Değerler `docs/generated/fixtures/shipment.json`'daki GERÇEK kayıtlarla
 * hizalı (SHP-2026-00042: 42 desi, SEL-00001, Başakşehir → Yenimahalle).
 * Uç canlıya alınınca bu tablo silinir.
 */
const SIMULE_EDILEBILIR = [
  {
    shipment: "SHP-2026-00042",
    order: "ORD-2026-00871",
    seller_profile: "SEL-00001",
    desi: 42,
    weight_kg: 38.5,
    package_count: 3,
    origin_city: "İstanbul",
    destination_city: "Ankara",
    zone: "TR-IC",
    order_total: 4200,
  },
  {
    shipment: "SHP-2026-00041",
    order: "ORD-2026-00864",
    seller_profile: "SEL-00001",
    desi: 8,
    weight_kg: 6.2,
    package_count: 1,
    origin_city: "İstanbul",
    destination_city: "Van",
    zone: "TR-DOGU",
    order_total: 1850,
  },
  {
    shipment: "SHP-2026-00038",
    order: "ORD-2026-00840",
    seller_profile: "SEL-00002",
    desi: 120,
    weight_kg: 140,
    package_count: 8,
    origin_city: "İzmir",
    destination_city: "Erzurum",
    zone: "TR-DOGU",
    order_total: 900,
  },
];

// ═══════════════════════════════════════════════════════════════════════
//  UÇ TAKLİTLERİ — sözleşme §2
// ═══════════════════════════════════════════════════════════════════════

function derivedRules(state) {
  return state.rules.map((r) => deriveRule(r, { allRules: state.rules }));
}

/** Rolün göreceği kurallar. Tenant sınırı GERÇEK uçta backend'de. */
function visibleRules(rules, viewer) {
  if (!viewer.asSeller) return rules;
  return rules.filter((r) => !r.seller_profile || r.seller_profile === viewer.sellerName);
}

export const pricingMock = {
  /** §2.1 — K1 ve K2'nin kapısı. `layers` sayaçları AYNI yanıtta. */
  async listPricingRules({
    q = null,
    zone = null,
    carrierAccount = null,
    seller = null,
    isActive = null,
    start = 0,
    pageLength = 50,
    asSeller = false,
    sellerName = SELLER_ME,
  } = {}) {
    throwIfFaulted("read");
    const viewer = { asSeller, sellerName };
    const state = loadState(asSeller ? sellerName : SELLER_ME);

    let rows = visibleRules(derivedRules(state), viewer);
    if (zone) rows = rows.filter((r) => r.zone === zone);
    if (carrierAccount) rows = rows.filter((r) => r.carrier_account === carrierAccount);
    if (seller) rows = rows.filter((r) => r.seller_profile === seller);
    if (isActive != null) rows = rows.filter((r) => Boolean(r.is_active) === Boolean(isActive));
    if (q) {
      const arama = String(q).toLocaleLowerCase("tr");
      rows = rows.filter((r) =>
        [r.rule_name, r.owner_label, r.zone_label, r.carrier, r.shipping_method]
          .filter(Boolean)
          .some((v) => String(v).toLocaleLowerCase("tr").includes(arama))
      );
    }

    // Sıralama SUNUCUDA: arayüz yeniden sıralarsa sayfalama ile bozulur.
    rows.sort(
      (a, b) =>
        LAYER_ORDER[a.layer] - LAYER_ORDER[b.layer] ||
        Number(a.priority) - Number(b.priority) ||
        String(a.name).localeCompare(String(b.name))
    );

    const layers = rows.reduce((acc, r) => ({ ...acc, [r.layer]: (acc[r.layer] ?? 0) + 1 }), {
      platform_mandatory: 0,
      seller: 0,
      platform: 0,
    });

    const sayfa = rows
      .slice(start, start + pageLength)
      .map((r) => maskRule(stripDetail(r), viewer));
    return {
      items: sayfa,
      layers,
      total: rows.length,
      page: Math.floor(start / pageLength) + 1,
      page_size: pageLength,
    };
  },

  /** §2.2 — K4 formu. Alt tablolar burada geliyor. */
  async getPricingRule(name, { asSeller = false, sellerName = SELLER_ME } = {}) {
    throwIfFaulted("read");
    const viewer = { asSeller, sellerName };
    const state = loadState(asSeller ? sellerName : SELLER_ME);
    const kural = derivedRules(state).find((r) => r.name === name);
    if (!kural) throw fail("NOT_FOUND", "Kural bulunamadı.");
    if (asSeller && kural.seller_profile && kural.seller_profile !== sellerName) {
      throw fail("PERMISSION_DENIED", "Bu kuralı görüntüleme yetkiniz yok.");
    }
    return maskRule(kural, viewer);
  },

  /** §2.3 — oluştur / güncelle. Doğrulama sırası sözleşmedeki gibi. */
  async savePricingRule({
    name = null,
    values = {},
    asSeller = false,
    sellerName = SELLER_ME,
  } = {}) {
    throwIfFaulted("write");
    const state = loadState(asSeller ? sellerName : SELLER_ME);

    // 1 · Sahiplik
    const sahip = asSeller ? sellerName : (values.seller_profile ?? null);
    if (asSeller && values.seller_profile && values.seller_profile !== sellerName) {
      throw fail("PERMISSION_DENIED", "Başka satıcı adına kural yazamazsınız.");
    }
    // 2 · Zorunlu bayrağı — kapı arayüz DEĞİL, uç
    if (asSeller && values.is_mandatory) {
      throw fail("MANDATORY_NOT_ALLOWED", "Zorunlu kuralı yalnız platform tanımlayabilir.");
    }
    // 3-4 · Kademeler
    const sorunlar = tierProblems(values.tiers);
    if (sorunlar.length) {
      const s = sorunlar[0];
      throw fail(s.code, s.message, { fields: { [s.field]: s.message } });
    }

    const mevcut = name ? state.rules.find((r) => r.name === name) : null;
    if (name && !mevcut) throw fail("NOT_FOUND", "Kural bulunamadı.");
    if (asSeller && mevcut && mevcut.seller_profile !== sellerName) {
      throw fail("PERMISSION_DENIED", "Bu kuralı düzenleme yetkiniz yok.");
    }

    const kayit = {
      ...(mevcut ?? {}),
      ...values,
      name: name ?? `PR-${Date.now().toString(36).toUpperCase()}`,
      seller_profile: sahip,
      is_mandatory: asSeller ? 0 : values.is_mandatory ? 1 : 0,
      modified: new Date().toISOString().slice(0, 19).replace("T", " "),
      modified_by: asSeller ? `${sellerName}@mock` : "platform@mock",
    };

    state.rules = mevcut
      ? state.rules.map((r) => (r.name === kayit.name ? kayit : r))
      : [...state.rules, kayit];
    saveState(state);

    // 5 · Çakışma UYARI, hata değil: iki kuralı sırayla düzenlerken ara adımda
    // çakışma normaldir; kaydı reddetmek yöneticiyi kilitler.
    return deriveRule(kayit, { allRules: state.rules });
  },

  /**
   * §2.3b — SIRALAMA. Tek istek, tek katman, yalnız `priority` değişir.
   *
   * NEDEN AYRI UÇ (ölçüldü 2026-08-21):
   *   Sıralama önce `save_pricing_rule`'a tüm belgeyi geri göndererek
   *   yapılıyordu. Liste yükü alt tabloları TAŞIMIYOR (sözleşme §2.1:
   *   kademe/ek ücret yalnız detayda gelir), bu yüzden her kayıt
   *   "En az bir kademe gerekli" ile reddediliyordu — sürükleme ekranda
   *   oluyor, hiç kaydedilmiyordu. Kuralı önce detaydan çekip geri
   *   göndermek de yanlış olurdu: N kural için 2N istek ve ortada kalan
   *   bir hata öncelikleri YARIM uygulanmış bırakır.
   *
   * Öncelikler 10'ar veriliyor: araya kural eklemek için 11, 12 gibi ara
   * değerler kalıyor ve tüm liste yeniden numaralanmıyor.
   */
  async reorderPricingRules({ layer, order = [], asSeller = false, sellerName = SELLER_ME } = {}) {
    throwIfFaulted("write");
    const state = loadState(asSeller ? sellerName : SELLER_ME);

    const kurallar = order.map((name) => {
      const kural = state.rules.find((r) => r.name === name);
      if (!kural) throw fail("NOT_FOUND", `Kural bulunamadı: ${name}`);
      return kural;
    });

    // Katman DIŞINA taşıma yok: sıra katman içinde anlamlı, katmanlar arası
    // geçiş "sahiplik/zorunluluk" değiştirmek demek — o ayrı bir iş.
    const yanlisKatman = kurallar.find(
      (r) => deriveRule(r, { allRules: state.rules }).layer !== layer
    );
    if (yanlisKatman) {
      throw fail("VALIDATION_ERROR", "Kural başka bir katmana taşınamaz.", {
        fields: { layer: "Kural başka bir katmana taşınamaz." },
      });
    }

    // Satıcı YALNIZ kendi kurallarını sıralar — kapı arayüz değil, uç.
    if (asSeller) {
      const baskasi = kurallar.find((r) => r.seller_profile !== sellerName);
      if (baskasi) throw fail("PERMISSION_DENIED", "Bu kuralları sıralama yetkiniz yok.");
    }

    const damga = new Date().toISOString().slice(0, 19).replace("T", " ");
    kurallar.forEach((kural, i) => {
      const yeni = (i + 1) * 10;
      if (kural.priority === yeni) return;
      kural.priority = yeni;
      kural.modified = damga;
      kural.modified_by = asSeller ? `${sellerName}@mock` : "platform@mock";
    });
    saveState(state);

    return { layer, order, updated: kurallar.length };
  },

  /** §2.4 — kullanımdaysa silinmez. */
  async deletePricingRule(name, { asSeller = false, sellerName = SELLER_ME } = {}) {
    throwIfFaulted("delete");
    const state = loadState(asSeller ? sellerName : SELLER_ME);
    const kural = state.rules.find((r) => r.name === name);
    if (!kural) throw fail("NOT_FOUND", "Kural bulunamadı.");
    if (asSeller && kural.seller_profile !== sellerName) {
      throw fail("PERMISSION_DENIED", "Bu kuralı silme yetkiniz yok.");
    }
    const kullanan = SIMULE_EDILEBILIR.filter((s) => {
      const ctx = { ...s, zone_label: zoneLabel(s.zone), now: MOCK_NOW };
      const { winner } = evaluateRules(
        visibleRules(derivedRules(state), { asSeller: true, sellerName: s.seller_profile }),
        ctx
      );
      return winner?.rule.name === name;
    });
    if (kullanan.length) {
      throw fail("RULE_IN_USE", "Bu kural aktif sevkiyatlarda kullanılıyor; silinemez.", {
        fields: { in_use_count: kullanan.length },
      });
    }
    state.rules = state.rules.filter((r) => r.name !== name);
    saveState(state);
    return { name };
  },

  /** §2.5 — ÇOKLU teklif. K3 ve K8 aynı yanıtı tüketiyor. */
  async simulatePrice(input = {}, opts = {}) {
    throwIfFaulted("simulate");
    return simulateSync(input, opts);
  },

  /** §2.6 — bölge kataloğu. 20-BE'de gerçek katalog ucuna devredilecek. */
  async listShippingZones() {
    throwIfFaulted("read");
    return {
      items: SEED_ZONES.map((z) => ({ ...z, city_count: (z.cities ?? []).length })),
      total: SEED_ZONES.length,
    };
  },

  /** Mock döneminde hesap listesi — uç açılınca `list_carrier_accounts`'a devreder. */
  async listCarrierAccounts({ asSeller = false, sellerName = SELLER_ME } = {}) {
    throwIfFaulted("read");
    return { items: usableAccounts(asSeller ? sellerName : null), total: undefined };
  },

  /** K3'ün "Gerçek sipariş" sekmesinin beslendiği liste. */
  async listSimulatableShipments({ asSeller = false, sellerName = SELLER_ME } = {}) {
    throwIfFaulted("read");
    const rows = asSeller
      ? SIMULE_EDILEBILIR.filter((s) => s.seller_profile === sellerName)
      : SIMULE_EDILEBILIR;
    return {
      items: rows.map((s) => ({ ...s, zone_label: zoneLabel(s.zone) })),
      total: rows.length,
    };
  },
};

/**
 * Simülasyonun SENKRON çekirdeği.
 *
 * NEDEN AYRI: Storybook story'leri veriyi kurarken `await` kullanamıyor —
 * build hedefi es2020 ve top-level await derlenmiyor (ölçüldü: 2026-08-21,
 * `npm run build-storybook` dört hatayla düştü). Story kendi hesabını
 * yazsaydı motor değişince sessizce yalan söylerdi; bu yüzden AYNI kod
 * senkron olarak dışa açılıyor ve `simulatePrice` ona devrediyor.
 */
export function simulateSync(input = {}, { asSeller = false, sellerName = SELLER_ME } = {}) {
  const viewer = { asSeller, sellerName };
  const state = loadState(asSeller ? sellerName : SELLER_ME);

  const ctx = resolveInput(input, viewer);
  const kurallar = visibleRules(derivedRules(state), {
    asSeller: true,
    sellerName: ctx.seller_profile,
  });
  const hesaplar = usableAccounts(ctx.seller_profile);

  const quotes = hesaplar.map((hesap) => {
    const hesapCtx = { ...ctx, carrier_account: hesap.name, carrier: hesap.carrier };
    const { winner, evaluations } = evaluateRules(kurallar, hesapCtx);
    const taban = {
      quote_id: `Q-MOCK-${hesap.name}`,
      carrier_account: hesap.name,
      carrier: hesap.carrier,
      carrier_service: null,
      account_owner: hesap.seller_profile ? sellerLabel(hesap.seller_profile) : null,
      zone: ctx.zone,
      chargeable_weight: ctx.desi,
      currency: "TRY",
      is_snapshot: 0,
      valid_until: null,
      evaluations,
    };
    if (!winner) {
      return {
        ...taban,
        customer_charge: 0,
        carrier_cost: null,
        margin: null,
        surcharge_total: 0,
        surcharges: [],
        tax_rate: 0,
        tax_amount: 0,
        total_with_tax: 0,
        applied_rule: null,
        applied_rule_name: null,
        applied_layer: null,
        applied_tier_label: null,
        rule_priority: null,
        estimated_days_min: null,
        estimated_days_max: null,
        available: 0,
        unavailable_reason: "NO_RULE_MATCHED",
      };
    }
    return {
      ...taban,
      ...quoteFromRule(winner.rule, winner.tier, hesapCtx),
      applied_rule: winner.rule.name,
      applied_rule_name: winner.rule.rule_name,
      applied_layer: winner.rule.layer,
      rule_priority: winner.rule.priority,
      estimated_days_min: null,
      estimated_days_max: null,
      available: 1,
      unavailable_reason: null,
    };
  });

  // `recommended` SUNUCUDAN gelir; arayüz "en ucuzu" kendi seçmez. İki yerde
  // yaşasaydı paketleme ekranı ile simülasyon farklı taşıyıcı önerebilirdi.
  // Varsayılan aranırken SAHİPLİK önce bakılıyor: satıcının kendi anlaşması
  // varsa platformun `is_default` hesabı onu EZMEMELİ. Ölçüldü — sahiplik
  // ayrımı olmadan platformun Yurtiçi'si (445,41 ₺) öneriliyor ve satıcının
  // kendi Aras'ı (360,38 ₺) geride kalıyordu.
  const kullanilabilir = quotes.filter((q) => q.available);
  const kendiHesabi = (q) => accountOwner(q.carrier_account) === ctx.seller_profile;
  const oncelikli =
    ctx.seller_profile && kullanilabilir.some(kendiHesabi)
      ? kullanilabilir.filter(kendiHesabi)
      : kullanilabilir;
  const varsayilan = oncelikli.find(
    (q) => SEED_ACCOUNTS.find((a) => a.name === q.carrier_account)?.is_default
  );
  const enUcuz = oncelikli.length
    ? oncelikli.reduce((iyi, q) => (q.customer_charge < iyi.customer_charge ? q : iyi))
    : null;
  const recommended = (varsayilan ?? enUcuz)?.carrier_account ?? null;

  // İz YALNIZ önerilen (ya da istenen) hesapta dolu gelir — sözleşme §3.
  const istenen = input.account ?? recommended;
  const kirpilmis = quotes.map((q) => ({
    ...maskQuote(q, accountOwner(q.carrier_account), viewer),
    evaluations: q.carrier_account === istenen ? q.evaluations : [],
  }));

  return { input: ctx, quotes: kirpilmis, recommended };
}

// ── uç yardımcıları ──────────────────────────────────────────────────

/** Liste yanıtından alt tabloları düşürür — §1.1 "liste ucu child tablo getirmiyor". */
function stripDetail(rule) {
  const { tiers: _t, surcharges: _s, description: _d, ...kalan } = rule;
  return kalan;
}

const zoneLabel = (code) => SEED_ZONES.find((z) => z.name === code)?.zone_name ?? null;

const accountOwner = (name) => SEED_ACCOUNTS.find((a) => a.name === name)?.seller_profile ?? null;

/**
 * Kullanılabilir hesaplar: platform hesapları + O SATICININ kendi hesapları.
 *
 * Pasif hesap listeye girmiyor — kimlik bilgisi girilmemiş sandbox hesabıyla
 * gönderi çıkmaz; seçenek olarak sunmak ölü buton olurdu.
 */
function usableAccounts(sellerProfile) {
  return SEED_ACCOUNTS.filter(
    (a) => a.is_active && (!a.seller_profile || a.seller_profile === sellerProfile)
  );
}

/**
 * Girdiyi normalize eder: serbest deneme ya da gerçek sipariş.
 *
 * Gerçek uçta sevkiyatın değerleri SUNUCUDA çözülüyor; mock sunucunun yerine
 * geçtiği için burada çözülüyor. Arayüz iki biçimde de aynı `input` nesnesini
 * geri alıyor — hangi sekmede olduğunu ekranın bilmesi gerekmiyor.
 */
function resolveInput(input, viewer) {
  if (input.shipment || input.order) {
    const kayit = SIMULE_EDILEBILIR.find(
      (s) => s.shipment === input.shipment || s.order === input.order
    );
    if (!kayit) throw fail("NOT_FOUND", "Sevkiyat bulunamadı.");
    return { ...kayit, zone_label: zoneLabel(kayit.zone), now: MOCK_NOW, source: "shipment" };
  }
  return {
    desi: Number(input.desi ?? 0),
    weight_kg: Number(input.weight_kg ?? 0),
    zone: input.zone ?? null,
    zone_label: zoneLabel(input.zone),
    order_total: Number(input.order_total ?? 0),
    origin_city: input.origin_city ?? null,
    destination_city: input.destination_city ?? null,
    shipping_method: input.shipping_method ?? null,
    seller_profile: viewer.asSeller ? viewer.sellerName : (input.seller_profile ?? null),
    now: MOCK_NOW,
    source: "manual",
  };
}
