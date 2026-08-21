/* Fiyatlandırma tohum verisi — ÜRETİLMİŞ sözleşme fixture'larından MAKİNEYLE
   çıkarıldı, elle yazılmadı.
   Kaynak: tradehub_core/docs/generated/fixtures/{pricing_rule,shipping_zone,carrier_account}.json
   Sözleşme: docs/lojistik/20-FE-VERI-SOZLESMESI.md

   TÜRETİLEN ALANLAR BURADA YOK. `layer`, `owner_label`, `zone_label`,
   `tier_count`, `min/max_base_*`, `has_negative_margin`, `surcharge_count`,
   `priority_conflict_with`, `shadowed_by` — hepsi `pricingMock.js` içinde
   HESAPLANIYOR. Tohuma yazılsalardı kural düzenlenince bayatlarlardı: 13-FE'de
   kuyruk ayrı bir sabit diziydi ve paketleme bitince kova değişmiyordu.

   TAŞIYICI HESAPLARI da burada: gerçek uçta (`list_carrier_accounts`) canlı
   geliyor, ama mock döneminde kuralların atıf yaptığı hesapların var olması
   gerekiyor. Uç açılınca bu dizi silinir, hesaplar canlıdan okunur. */

/** Oturumdaki satıcı — tohumdaki "kendi" kayıtları buna etiketleniyor. */
export const SELLER_ME = "SEL-00001";
export const SELLER_ME_LABEL = "Demir Tekstil";

/**
 * Satıcı profili → okunabilir ad.
 *
 * MOCK'A ÖZGÜ: gerçek uçta `owner_label` yanıtla birlikte geliyor. Hesabı
 * olmayan satıcı (SEL-00002) için hesap kayıtlarından ad türetilemiyordu ve
 * ekranda ham kimlik görünüyordu (Storybook turu, 2026-08-21). Uç canlıya
 * alınınca bu tablo silinir.
 */
export const SELLER_LABELS = {
  "SEL-00001": "Demir Tekstil",
  "SEL-00002": "Yıldız Nalbur",
};

/** Mock evreninde "şimdi" — geçerlilik tarihleri buna göre değerlendirilir. */
export const MOCK_NOW = "2026-08-21";

/** Sevkiyat başına varsayılan desi böleni (Logistics Settings.default_desi_divisor). */
export const DESI_DIVISOR = 3000;

/** Kargo bölgesi kataloğu (K3) — 20-BE'de DocType olunca katalog ucundan gelecek. */
export const SEED_ZONES = [
  {
    name: "TR-MARMARA",
    zone_code: "TR-MARMARA",
    zone_name: "Marmara",
    is_active: 1,
    cities: [
      {
        city: "İstanbul",
      },
      {
        city: "Bursa",
      },
      {
        city: "Kocaeli",
      },
      {
        city: "Tekirdağ",
      },
      {
        city: "Balıkesir",
      },
      {
        city: "Çanakkale",
      },
      {
        city: "Edirne",
      },
      {
        city: "Kırklareli",
      },
      {
        city: "Sakarya",
      },
      {
        city: "Yalova",
      },
      {
        city: "Bilecik",
      },
    ],
  },
  {
    name: "TR-IC",
    zone_code: "TR-IC",
    zone_name: "İç Anadolu",
    is_active: 1,
    cities: [
      {
        city: "Ankara",
      },
      {
        city: "Konya",
      },
      {
        city: "Kayseri",
      },
      {
        city: "Sivas",
      },
      {
        city: "Eskişehir",
      },
      {
        city: "Kırıkkale",
      },
      {
        city: "Aksaray",
      },
      {
        city: "Niğde",
      },
      {
        city: "Nevşehir",
      },
      {
        city: "Kırşehir",
      },
      {
        city: "Yozgat",
      },
      {
        city: "Çankırı",
      },
      {
        city: "Karaman",
      },
    ],
  },
  {
    name: "TR-DOGU",
    zone_code: "TR-DOGU",
    zone_name: "Doğu Anadolu",
    is_active: 1,
    cities: [
      {
        city: "Van",
      },
      {
        city: "Erzurum",
      },
      {
        city: "Malatya",
      },
      {
        city: "Elazığ",
      },
      {
        city: "Ağrı",
      },
      {
        city: "Kars",
      },
      {
        city: "Muş",
      },
      {
        city: "Bitlis",
      },
      {
        city: "Hakkari",
      },
      {
        city: "Erzincan",
      },
      {
        city: "Bingöl",
      },
      {
        city: "Tunceli",
      },
      {
        city: "Ardahan",
      },
      {
        city: "Iğdır",
      },
    ],
  },
  {
    name: "TR-ADA",
    zone_code: "TR-ADA",
    zone_name: "Ada ve uzak yol",
    is_active: 0,
    cities: [
      {
        city: "Gökçeada",
      },
      {
        city: "Bozcaada",
      },
    ],
  },
];

/** Taşıyıcı hesapları — uç canlıya alınınca silinir. */
export const SEED_ACCOUNTS = [
  {
    name: "CACC-YK-PLATFORM",
    account_name: "Yurtiçi Kargo — Platform",
    carrier: "YK",
    seller_profile: null,
    environment: "production",
    is_active: 1,
    is_default: 1,
    is_platform_account: true,
  },
  {
    name: "CACC-AK-SEL00001",
    account_name: "Aras Kargo — Demir Tekstil",
    carrier: "AK",
    seller_profile: "SEL-00001",
    environment: "production",
    is_active: 1,
    is_default: 0,
    is_platform_account: false,
  },
  {
    name: "CACC-MNG-SANDBOX",
    account_name: "MNG Kargo — Sandbox",
    carrier: "MNG",
    seller_profile: null,
    environment: "sandbox",
    is_active: 0,
    is_default: 0,
    is_platform_account: true,
  },
  {
    name: "CACC-MNG-SEL00001",
    account_name: "MNG Kargo — Demir Tekstil",
    carrier: "MNG",
    seller_profile: "SEL-00001",
    environment: "production",
    is_active: 1,
    is_default: 0,
    is_platform_account: false,
  },
  {
    name: "CACC-PTT-PLATFORM",
    account_name: "PTT Kargo — Platform",
    carrier: "PTT",
    seller_profile: null,
    environment: "production",
    is_active: 1,
    is_default: 0,
    is_platform_account: true,
  },
];

/** Fiyat kuralları — YAZILAN alanlar. Türetilenler mock'ta hesaplanıyor. */
export const SEED_RULES = [
  {
    name: "PR-FREE-5000",
    rule_name: "Ücretsiz kargo · 5.000 ₺ üzeri sipariş",
    seller_profile: null,
    is_mandatory: 1,
    carrier_account: null,
    carrier: null,
    carrier_service: null,
    shipping_method: null,
    zone: null,
    origin_city: null,
    destination_city: null,
    min_weight_kg: null,
    max_weight_kg: null,
    min_order_total: 5000.0,
    priority: 1,
    is_active: 1,
    currency: "TRY",
    tax_rate: 20.0,
    valid_from: "2026-01-01",
    valid_until: null,
    tiers: [
      {
        min_desi: 0.0,
        max_desi: null,
        base_cost: null,
        base_charge: 0.0,
        per_desi_charge: null,
        min_charge: null,
      },
    ],
    surcharges: [],
    description:
      "Kampanya. Zorunlu işaretli: satıcı kendi tarifesini yazmış olsa bile bu kural kazanır.",
    modified: "2026-08-20 14:05:00",
    modified_by: "pazarlama@istoc.com",
  },
  {
    name: "PR-ALI-SELF-IST",
    rule_name: "İstanbul içi · kendi aracım",
    seller_profile: "SEL-00001",
    is_mandatory: 0,
    carrier_account: null,
    carrier: null,
    carrier_service: null,
    shipping_method: "Satıcı Aracı",
    zone: "TR-MARMARA",
    origin_city: "İstanbul",
    destination_city: null,
    min_weight_kg: null,
    max_weight_kg: null,
    min_order_total: null,
    priority: 5,
    is_active: 1,
    currency: "TRY",
    tax_rate: 20.0,
    valid_from: "2026-03-01",
    valid_until: null,
    tiers: [
      {
        min_desi: 0.0,
        max_desi: null,
        base_cost: 80.0,
        base_charge: 0.0,
        per_desi_charge: null,
        min_charge: null,
      },
    ],
    surcharges: [],
    description:
      "Kendi kamyonumla dağıtıyorum; yakıt maliyeti bende kalıyor, alıcıdan kargo almıyorum.",
    modified: "2026-08-18 09:12:00",
    modified_by: "mehmet@demirtekstil.com",
  },
  {
    name: "PR-ALI-ARAS-DOGU",
    rule_name: "Doğu Anadolu · Aras anlaşmam",
    seller_profile: "SEL-00001",
    is_mandatory: 0,
    carrier_account: "CACC-AK-SEL00001",
    carrier: "AK",
    carrier_service: "AK-STD",
    shipping_method: "Standart Kargo",
    zone: "TR-DOGU",
    origin_city: "İstanbul",
    destination_city: null,
    min_weight_kg: null,
    max_weight_kg: null,
    min_order_total: null,
    priority: 10,
    is_active: 1,
    currency: "TRY",
    tax_rate: 20.0,
    valid_from: "2026-01-01",
    valid_until: null,
    tiers: [
      {
        min_desi: 0.0,
        max_desi: 10.0,
        base_cost: 120.0,
        base_charge: 165.0,
        per_desi_charge: null,
        min_charge: 165.0,
      },
      {
        min_desi: 10.0,
        max_desi: 30.0,
        base_cost: 185.0,
        base_charge: 245.0,
        per_desi_charge: 1.1,
        min_charge: null,
      },
      {
        min_desi: 30.0,
        max_desi: 50.0,
        base_cost: 245.0,
        base_charge: 320.0,
        per_desi_charge: 1.4,
        min_charge: null,
      },
      {
        min_desi: 50.0,
        max_desi: null,
        base_cost: 310.0,
        base_charge: 410.0,
        per_desi_charge: 2.2,
        min_charge: null,
      },
    ],
    surcharges: [
      {
        surcharge_type: "Yakıt farkı",
        calc_method: "percent",
        value: 7.0,
        applies_to: "both",
      },
    ],
    description: "Aras ile 2026 sözleşmem. Yakıt farkı sözleşmede yüzde olarak tanımlı.",
    modified: "2026-08-15 16:40:00",
    modified_by: "mehmet@demirtekstil.com",
  },
  {
    name: "PR-ALI-MNG-STD",
    rule_name: "Standart · MNG anlaşmam",
    seller_profile: "SEL-00001",
    is_mandatory: 0,
    carrier_account: "CACC-MNG-SEL00001",
    carrier: "MNG",
    carrier_service: null,
    shipping_method: "Standart Kargo",
    zone: null,
    origin_city: null,
    destination_city: null,
    min_weight_kg: null,
    max_weight_kg: null,
    min_order_total: null,
    priority: 20,
    is_active: 1,
    currency: "TRY",
    tax_rate: 20.0,
    valid_from: "2026-02-15",
    valid_until: null,
    tiers: [
      {
        min_desi: 30.0,
        max_desi: 50.0,
        base_cost: 291.0,
        base_charge: 380.0,
        per_desi_charge: 1.6,
        min_charge: null,
      },
    ],
    surcharges: [],
    description: "MNG daha hızlı ama pahalı; Aras'ın gitmediği yerlerde kullanıyorum.",
    modified: "2026-08-15 16:52:00",
    modified_by: "mehmet@demirtekstil.com",
  },
  {
    name: "PR-YLD-DOGU",
    rule_name: "Doğu Anadolu · Yıldız tarifesi",
    seller_profile: "SEL-00002",
    is_mandatory: 0,
    carrier_account: null,
    carrier: null,
    carrier_service: null,
    shipping_method: null,
    zone: "TR-DOGU",
    origin_city: null,
    destination_city: null,
    min_weight_kg: null,
    max_weight_kg: null,
    min_order_total: null,
    priority: 10,
    is_active: 1,
    currency: "TRY",
    tax_rate: 20.0,
    valid_from: "2026-01-01",
    valid_until: null,
    tiers: [
      {
        min_desi: 30.0,
        max_desi: 50.0,
        base_cost: 260.0,
        base_charge: 900.0,
        per_desi_charge: null,
        min_charge: null,
      },
    ],
    surcharges: [],
    description:
      "BAŞKA satıcının kuralı — Ali Hırdavat oturumunda GÖRÜNMEMELİ. Tenant sınırının ölçüldüğü kayıt.",
    modified: "2026-08-11 11:00:00",
    modified_by: "yildiz@yildiznalbur.com",
  },
  {
    name: "PR-STD-YK",
    rule_name: "Standart Kargo · İç Anadolu",
    seller_profile: null,
    is_mandatory: 0,
    carrier_account: "CACC-YK-PLATFORM",
    carrier: "YK",
    carrier_service: "YK-STD",
    shipping_method: "Standart Kargo",
    zone: "TR-IC",
    origin_city: null,
    destination_city: null,
    min_weight_kg: null,
    max_weight_kg: null,
    min_order_total: null,
    priority: 10,
    is_active: 1,
    currency: "TRY",
    tax_rate: 20.0,
    valid_from: "2026-01-01",
    valid_until: null,
    tiers: [
      {
        min_desi: 0.0,
        max_desi: 10.0,
        base_cost: 110.0,
        base_charge: 150.0,
        per_desi_charge: null,
        min_charge: 150.0,
      },
      {
        min_desi: 10.0,
        max_desi: 30.0,
        base_cost: 165.0,
        base_charge: 220.0,
        per_desi_charge: 1.0,
        min_charge: null,
      },
      {
        min_desi: 30.0,
        max_desi: 50.0,
        base_cost: 210.0,
        base_charge: 280.0,
        per_desi_charge: 1.4,
        min_charge: null,
      },
    ],
    surcharges: [
      {
        surcharge_type: "Yakıt farkı",
        calc_method: "percent",
        value: 6.0,
        applies_to: "both",
      },
    ],
    description: "Yurtiçi ile platform sözleşmesi, 2026 tarifesi.",
    modified: "2026-08-01 10:00:00",
    modified_by: "lojistik@istoc.com",
  },
  {
    name: "PR-STD-YK-ESKI",
    rule_name: "Standart Kargo · İç Anadolu (2025 tarifesi)",
    seller_profile: null,
    is_mandatory: 0,
    carrier_account: "CACC-YK-PLATFORM",
    carrier: "YK",
    carrier_service: "YK-STD",
    shipping_method: "Standart Kargo",
    zone: "TR-IC",
    origin_city: null,
    destination_city: null,
    min_weight_kg: null,
    max_weight_kg: null,
    min_order_total: null,
    priority: 10,
    is_active: 1,
    currency: "TRY",
    tax_rate: 20.0,
    valid_from: "2025-01-01",
    valid_until: null,
    tiers: [
      {
        min_desi: 30.0,
        max_desi: 50.0,
        base_cost: 195.0,
        base_charge: 260.0,
        per_desi_charge: 1.2,
        min_charge: null,
      },
    ],
    surcharges: [],
    description:
      "Geçen yılın tarifesi pasifleştirilmeyi unutmuş. AYNI önceliği paylaşıyor — hangisinin kazanacağı belirsiz.",
    modified: "2025-01-04 08:30:00",
    modified_by: "lojistik@istoc.com",
  },
  {
    name: "PR-EAST-YK",
    rule_name: "Doğu bölgesi ek ücreti",
    seller_profile: null,
    is_mandatory: 0,
    carrier_account: "CACC-YK-PLATFORM",
    carrier: "YK",
    carrier_service: null,
    shipping_method: null,
    zone: "TR-DOGU",
    origin_city: null,
    destination_city: null,
    min_weight_kg: null,
    max_weight_kg: null,
    min_order_total: null,
    priority: 20,
    is_active: 1,
    currency: "TRY",
    tax_rate: 20.0,
    valid_from: "2026-01-01",
    valid_until: null,
    tiers: [
      {
        min_desi: 30.0,
        max_desi: 50.0,
        base_cost: 260.0,
        base_charge: 360.0,
        per_desi_charge: 2.1,
        min_charge: null,
      },
    ],
    surcharges: [
      {
        surcharge_type: "Ücra bölge",
        calc_method: "fixed",
        value: 35.0,
        applies_to: "both",
      },
      {
        surcharge_type: "Yakıt farkı",
        calc_method: "percent",
        value: 6.0,
        applies_to: "both",
      },
    ],
    description: "Doğu illerinde taşıyıcı ücra bölge bedeli uyguluyor; yansıtılıyor.",
    modified: "2026-08-01 10:04:00",
    modified_by: "lojistik@istoc.com",
  },
  {
    name: "PR-HEAVY",
    rule_name: "Ağır yük · 100 kg üzeri",
    seller_profile: null,
    is_mandatory: 0,
    carrier_account: null,
    carrier: null,
    carrier_service: null,
    shipping_method: "Ambar Teslim",
    zone: null,
    origin_city: null,
    destination_city: null,
    min_weight_kg: 100.0,
    max_weight_kg: null,
    min_order_total: null,
    priority: 15,
    is_active: 0,
    currency: "TRY",
    tax_rate: 20.0,
    valid_from: "2026-06-01",
    valid_until: "2026-12-31",
    tiers: [
      {
        min_desi: 0.0,
        max_desi: null,
        base_cost: 850.0,
        base_charge: 1100.0,
        per_desi_charge: 0.9,
        min_charge: null,
      },
    ],
    surcharges: [],
    description: "PASİF kayıt — ekranların 'pasif' durumunu tasarlayabilmesi için kümede duruyor.",
    modified: "2026-07-30 12:00:00",
    modified_by: "lojistik@istoc.com",
  },
];
