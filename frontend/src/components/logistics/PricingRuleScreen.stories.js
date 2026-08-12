import rules from "@/mocks/logistics/pricing_rule.json";

import PricingRuleScreen from "./PricingRuleScreen.vue";

/**
 * **K2 · Kural yönetimi** (TUR-121).
 *
 * Sözleşmedeki dört örnek kural SAĞLIKLI: öncelikler benzersiz (1/10/15/20)
 * ve her kuralın en az bir ölçütü var — "Ücretsiz kargo" bile
 * `min_order_total: 5000` ile sınırlı, yani catch-all değil. Varsayılan
 * story bu yüzden uyarısız.
 *
 * Aşağıdaki iki story TUR-121'in "deterministik ve açıklanabilir" kriterinin
 * ihlal edildiği hâlleri kuruyor.
 */
export default {
  title: "Lojistik/KT3 · Fiyatlandırma/Kurallar",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt3-pricing-rules",
  component: PricingRuleScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const ROWS = rules.default.data.items;

export const Default = {
  name: "Sağlıklı yapılandırma",
  args: { rows: ROWS, can: { read: true, write: true } },
};

/**
 * Aynı önceliğe sahip iki aktif kural: hangisinin uygulanacağı BELİRSİZ.
 * Bu bir sözleşme ihlali, kozmetik sorun değil — kırmızı.
 */
export const PriorityConflict = {
  name: "Hata · öncelik çakışması",
  args: {
    rows: ROWS.map((r) => (r.name === "PR-EAST-SURCHARGE" ? { ...r, priority: 10 } : r)),
    can: { read: true, write: true },
  },
};

/**
 * Ölçütü tamamen kaldırılmış bir kural her gönderiye uyar ve altındaki
 * kuralları GÖLGELER — onlar hiç değerlendirilmez. Yönetici "tanımladım
 * ama çalışmıyor" demeden önce görmeli.
 */
export const ShadowedRules = {
  name: "Uyarı · gölgelenen kurallar",
  args: {
    rows: ROWS.map((r) =>
      r.name === "PR-FREE-5000"
        ? { ...r, rule_name: "Sabit kargo ücreti (ölçütsüz)", min_order_total: null }
        : r
    ),
    can: { read: true, write: true },
  },
};

/** Aynı anda iki sorun: çakışma kırmızı, gölgeleme sarı. */
export const BothProblems = {
  name: "Çakışma + gölgeleme",
  args: {
    rows: ROWS.map((r) => {
      if (r.name === "PR-FREE-5000") {
        return { ...r, rule_name: "Sabit kargo ücreti (ölçütsüz)", min_order_total: null };
      }
      return r.name === "PR-EAST-SURCHARGE" ? { ...r, priority: 10 } : r;
    }),
    can: { read: true, write: true },
  },
};

export const ReadOnlyRole = {
  name: "Rol · yalnız okuma",
  args: { rows: ROWS, can: { read: true, write: false } },
};

export const Empty = {
  name: "Kural yok",
  args: { rows: [], can: { read: true, write: true } },
};

export const PermissionError = {
  name: "Hata · yetki yok",
  args: { rows: [], error: rules.error.error },
};
