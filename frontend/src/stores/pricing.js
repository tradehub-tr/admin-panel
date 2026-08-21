// Fiyatlandırma store'u — K1 / K2 / K3 / K4 ve etiket akışındaki taşıyıcı
// seçimi (K8) aynı veriyi buradan alıyor.
//
// Sözleşme: docs/lojistik/20-FE-VERI-SOZLESMESI.md
//
// NEDEN AYRI STORE:
//   `stores/logistics.js` Bora'nın çekirdeği (katalog, taşıyıcı hesabı,
//   sevkiyat, yetki). Fiyat durumunu oraya yazmak her PR'da çakışma üretirdi
//   — `api/logisticsPricing.js` ile aynı gerekçe.

import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { useAuthStore } from "@/stores/auth";

import { listCatalog } from "@/api/logistics";
import { LogisticsApiError, toDisplayMessage } from "@/api/logisticsEnvelope";
import {
  deletePricingRule,
  getPricingRule,
  listCarrierAccounts,
  listPricingRules,
  listShippingZones,
  listSimulatableShipments,
  reorderPricingRules,
  savePricingRule,
  simulatePrice,
} from "@/api/logisticsPricing";

/**
 * Mock tohumundaki satıcı profili.
 *
 * `pricingSeed.SELLER_ME` ile aynı; buradan okumak yerine sabit yazıldı ki
 * store mock modülüne bağımlı olmasın — uç canlıya alınınca yalnız bu satır
 * ve `sellerName` computed'ı silinecek.
 */
const MOCK_SELLER_PROFILE = "SEL-00001";

/** Katman sırası — ekranlar üç bölümü bu sırayla çiziyor (sözleşme §5.2). */
export const LAYERS = Object.freeze(["platform_mandatory", "seller", "platform"]);

export const usePricingStore = defineStore("pricing", () => {
  const auth = useAuthStore();

  /**
   * Satıcı bağlamı — sunucuya "ben satıcıyım" demek İÇİN DEĞİL.
   *
   * Gerçek uçta tenant süzgeci oturumdan okunuyor ve bu alanlar hiç
   * gönderilmiyor; `api/logisticsPricing.js` onları yalnız mock dalında
   * geçiriyor. Ekranın kendisi de buna bakıyor: satıcı sahip sütununu ve
   * "Zorunlu" anahtarını görmüyor.
   */
  const asSeller = computed(() => auth.isSeller && !auth.isAdmin);

  /**
   * Mock'un tenant süzgecinin beklediği DEĞER bir satıcı profili kimliği
   * (`SEL-00001`), oturumun `full_name`'i değil. POD mock'u ada göre
   * etiketliyordu ve gerçek hesap başka adı taşıdığı için satıcı rolüyle
   * bakan herkes BOŞ ekran görüyordu (2026-08-19 ölçümü). Burada tohumun
   * kimliği kullanılıyor; uç canlıya alınınca bu satır silinir.
   */
  const sellerName = computed(() => (asSeller.value ? MOCK_SELLER_PROFILE : null));

  /** Rolün kapsamını uçlara taşıyan ortak parametre. */
  const scope = computed(() => ({ asSeller: asSeller.value, sellerName: sellerName.value }));

  // ── durum ────────────────────────────────────────────────────────────
  const rules = ref([]);
  const layerCounts = ref({ platform_mandatory: 0, seller: 0, platform: 0 });
  const total = ref(0);

  const rule = ref(null); // K4 formundaki kayıt
  const zones = ref([]);
  const accounts = ref([]);
  const shipments = ref([]); // K3 "gerçek sipariş" seçicisi
  const methods = ref([]); // gönderim yöntemleri — CANLI katalog ucundan

  const simulation = ref(null); // { input, quotes, recommended }

  const loading = ref(false);
  const saving = ref(false);
  const simulating = ref(false);
  const error = ref(null);

  // ── türetilmiş ───────────────────────────────────────────────────────

  /**
   * Kurallar KATMANA göre gruplu.
   *
   * Ekran gruplamayı kendisi yapmıyor: sıralama sunucudan geliyor (sayfalama
   * ile bozulmasın diye) ve burada yalnız bölünüyor.
   */
  const byLayer = computed(() =>
    LAYERS.reduce(
      (acc, layer) => ({ ...acc, [layer]: rules.value.filter((r) => r.layer === layer) }),
      {}
    )
  );

  /** Çakışma ya da gölgeleme uyarısı taşıyan kural var mı — K2 rozetleri. */
  const hasWarnings = computed(() =>
    rules.value.some((r) => (r.priority_conflict_with?.length ?? 0) > 0 || r.shadowed_by)
  );

  /** Simülasyonda önerilen teklif — K8 bunu önceden işaretliyor. */
  const recommendedQuote = computed(
    () =>
      simulation.value?.quotes?.find((q) => q.carrier_account === simulation.value.recommended) ??
      null
  );

  /**
   * Seçili teklifin değerlendirme izi.
   *
   * İz YALNIZ önerilen hesapta dolu geliyor (sözleşme §3): her hesap için tam
   * iz döndürmek yükü gereksiz büyütüyor. Başka hesabın izi istendiğinde
   * `runSimulation({ account })` ile tekrar sorulur.
   */
  const evaluations = computed(() => recommendedQuote.value?.evaluations ?? []);

  // ── hata ─────────────────────────────────────────────────────────────

  /**
   * `message` HER ZAMAN string: `ErrorState` ve toast onu doğrudan basıyor,
   * bir nesne kaçarsa kullanıcı "[object Object]" görür.
   */
  function capture(e) {
    error.value =
      e instanceof LogisticsApiError
        ? { code: e.code, message: toDisplayMessage(e.message), details: e.details }
        : { code: "INTERNAL_ERROR", message: toDisplayMessage(e?.message) };
  }

  const clearError = () => {
    error.value = null;
  };

  /** Alan bazlı doğrulama hatası — form alanının altına yazılıyor. */
  const fieldErrors = computed(() => error.value?.details?.fields ?? {});

  // ── eylemler ─────────────────────────────────────────────────────────

  async function fetchRules(params = {}) {
    loading.value = true;
    error.value = null;
    try {
      const data = await listPricingRules(params);
      rules.value = data?.items ?? [];
      layerCounts.value = data?.layers ?? { platform_mandatory: 0, seller: 0, platform: 0 };
      total.value = data?.total ?? rules.value.length;
    } catch (e) {
      capture(e);
      rules.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchRule(name, opts = {}) {
    loading.value = true;
    error.value = null;
    try {
      rule.value = await getPricingRule(name, opts);
    } catch (e) {
      capture(e);
      rule.value = null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Kaydeder ve LİSTEYİ TAZELER.
   *
   * Tazelemek şart: kaydedilen kural başka bir kuralı gölgeleyebilir ya da
   * onunla öncelik çakışabilir — bu uyarılar sunucuda tüm küme üzerinde
   * hesaplanıyor ve tek kaydın yanıtı onları taşımıyor.
   *
   * @returns {Promise<boolean>} Başarılıysa `true`.
   */
  async function save({ name = null, values, ...opts }) {
    saving.value = true;
    error.value = null;
    try {
      const kayit = await savePricingRule({ name, values, ...opts });
      rule.value = kayit;
      await fetchRules(opts);
      return true;
    } catch (e) {
      capture(e);
      return false;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Katman içi sıralama — TEK istek.
   *
   * Kural kural kaydetmek yerine ayrı uç: gerekçesi `api/logisticsPricing.js`
   * içinde yazılı (liste yükü alt tabloları taşımıyor + atomiklik).
   */
  async function reorder({ layer, order }, opts = {}) {
    saving.value = true;
    error.value = null;
    try {
      await reorderPricingRules({ layer, order, ...opts });
      await fetchRules(opts);
      return true;
    } catch (e) {
      capture(e);
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function remove(name, opts = {}) {
    saving.value = true;
    error.value = null;
    try {
      await deletePricingRule(name, opts);
      await fetchRules(opts);
      return true;
    } catch (e) {
      capture(e);
      return false;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Simülasyon — serbest girdi ya da `{ shipment }`.
   *
   * Girdi biçimini store bilmiyor; sunucu hangi biçimi aldıysa çözülmüş hâlini
   * `input` alanında geri veriyor ve ekran onu gösteriyor.
   */
  async function runSimulation(input, opts = {}) {
    simulating.value = true;
    error.value = null;
    try {
      simulation.value = await simulatePrice(input, opts);
      return true;
    } catch (e) {
      capture(e);
      simulation.value = null;
      return false;
    } finally {
      simulating.value = false;
    }
  }

  /**
   * Seçim listeleri — bir kez çekilir.
   *
   * Hata YUTULUYOR ve `error`'a yazılmıyor: bölge listesi gelmezse seçici boş
   * kalır ama ekran ayakta durur. Bunu ana hataya yazmak, kural listesi
   * sorunsuz gelmişken ekranı hata durumuna düşürürdü.
   */
  async function fetchLookups(opts = {}) {
    const [z, a, s, m] = await Promise.allSettled([
      listShippingZones(),
      listCarrierAccounts(opts),
      listSimulatableShipments(opts),
      // Gönderim yöntemi CANLI katalogdan (sözleşme §6) — mock'a taşınmadı.
      // `stores/logistics.js#fetchCatalog` KULLANILMIYOR: o `catalogRows`'u
      // paylaşıyor ve katalog ekranının durumunu ezerdi.
      listCatalog("shipping_method", { pageLength: 100 }),
    ]);
    zones.value = z.status === "fulfilled" ? (z.value?.items ?? []) : [];
    accounts.value = a.status === "fulfilled" ? (a.value?.items ?? []) : [];
    shipments.value = s.status === "fulfilled" ? (s.value?.items ?? []) : [];
    methods.value = m.status === "fulfilled" ? (m.value?.items ?? []) : [];
  }

  function resetSimulation() {
    simulation.value = null;
  }

  return {
    // durum
    rules,
    layerCounts,
    total,
    rule,
    zones,
    accounts,
    shipments,
    methods,
    simulation,
    asSeller,
    sellerName,
    scope,
    loading,
    saving,
    simulating,
    error,
    // türetilmiş
    byLayer,
    hasWarnings,
    recommendedQuote,
    evaluations,
    fieldErrors,
    // eylemler
    fetchRules,
    fetchRule,
    save,
    reorder,
    remove,
    runSimulation,
    fetchLookups,
    resetSimulation,
    clearError,
  };
});
