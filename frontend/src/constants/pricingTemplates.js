// Kural şablonları — K4 formunun "boş formdan başlatma" yasağının karşılığı.
//
// NEDEN AYRI DOSYA (ve neden bileşenin İÇİNDE değil):
//   `logisticsScreenQuality.test.js` bileşene gömülü seçim listesini
//   REDDEDİYOR: "yeni tip nereden eklenecek?" sorusunun cevabı hiçbir yer
//   olamaz (13-FE'nin palet tipi hatası). Şablonlar sözleşmenin parçası —
//   yeni şablon buraya bir satır, ekrana dokunmadan.
//
// Şablon SADECE ön dolgu: her alanı kullanıcı değiştirebiliyor. Kilitli bir
// sihirbaz olsaydı "şablonum yok" durumunda ekran kullanılamaz olurdu.

/** @type {ReadonlyArray<{key:string,icon:string,labelKey:string,descKey:string,values:object}>} */
export const RULE_TEMPLATES = Object.freeze([
  {
    key: "free_shipping",
    icon: "percent",
    labelKey: "logistics.pricingForm.tplFreeShipping",
    descKey: "logistics.pricingForm.tplFreeShippingDesc",
    values: {
      min_order_total: 5000,
      tiers: [
        {
          min_desi: 0,
          max_desi: null,
          base_cost: null,
          base_charge: 0,
          per_desi_charge: null,
          min_charge: null,
        },
      ],
    },
  },
  {
    key: "desi_tiers",
    icon: "package",
    labelKey: "logistics.pricingForm.tplTier",
    descKey: "logistics.pricingForm.tplTierDesc",
    values: {
      tiers: [
        {
          min_desi: 0,
          max_desi: 10,
          base_cost: null,
          base_charge: null,
          per_desi_charge: null,
          min_charge: null,
        },
        {
          min_desi: 10,
          max_desi: 30,
          base_cost: null,
          base_charge: null,
          per_desi_charge: null,
          min_charge: null,
        },
        {
          min_desi: 30,
          max_desi: null,
          base_cost: null,
          base_charge: null,
          per_desi_charge: null,
          min_charge: null,
        },
      ],
    },
  },
  {
    key: "zone_surcharge",
    icon: "map",
    labelKey: "logistics.pricingForm.tplZone",
    descKey: "logistics.pricingForm.tplZoneDesc",
    values: {
      priority: 20,
      surcharges: [
        { surcharge_type: "Ücra bölge", calc_method: "fixed", value: 35, applies_to: "both" },
      ],
      tiers: [
        {
          min_desi: 0,
          max_desi: null,
          base_cost: null,
          base_charge: null,
          per_desi_charge: null,
          min_charge: null,
        },
      ],
    },
  },
  {
    key: "own_vehicle",
    icon: "truck",
    labelKey: "logistics.pricingForm.tplSelf",
    descKey: "logistics.pricingForm.tplSelfDesc",
    values: {
      priority: 5,
      shipping_method: "Satıcı Aracı",
      tiers: [
        {
          min_desi: 0,
          max_desi: null,
          base_cost: null,
          base_charge: 0,
          per_desi_charge: null,
          min_charge: null,
        },
      ],
    },
  },
]);

/** Boş kural iskeleti — şablonsuz başlangıç da aynı şekli üretmeli. */
export function emptyRule(overrides = {}) {
  return {
    name: null,
    rule_name: "",
    seller_profile: null,
    owner_label: null,
    carrier_account: null,
    shipping_method: null,
    zone: null,
    origin_city: null,
    min_weight_kg: null,
    max_weight_kg: null,
    min_order_total: null,
    priority: 10,
    is_active: 1,
    is_mandatory: 0,
    currency: "TRY",
    tax_rate: 20,
    valid_from: new Date().toISOString().slice(0, 10),
    valid_until: null,
    tiers: [
      {
        min_desi: 0,
        max_desi: null,
        base_cost: null,
        base_charge: null,
        per_desi_charge: null,
        min_charge: null,
      },
    ],
    surcharges: [],
    ...overrides,
  };
}
