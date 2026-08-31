// İade store'u — I1 / I2 / I3 / I4 aynı kaydı buradan alıyor.
//
// Sözleşme: docs/lojistik/15-FE-VERI-SOZLESMESI.md
//
// NEDEN AYRI STORE:
//   `stores/logistics.js` Bora'nın çekirdeği (katalog, taşıyıcı hesabı,
//   sevkiyat, yetki). İade durumunu oraya yazmak her PR'da çakışma üretirdi
//   — `api/returns.js` ile aynı gerekçe (LOGISTICS-TASK-SPLIT §3).
//
// NEDEN TEK STORE, DÖRT EKRAN:
//   Karar → kontrol → kapanış aynı kaydın yaşam döngüsü. Her ekran kendi
//   kopyasını tutsaydı I2'de verilen karar I1 sayacına yansımaz, I4'ün ön
//   koşulları bayat veriyle hesaplanırdı.

import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { LogisticsApiError, toDisplayMessage } from "@/api/logisticsEnvelope";
import {
  closeReturnRequest,
  decideReturnRequest,
  getReturnRequest,
  listReturnRequests,
  saveReturnInspection,
} from "@/api/returns";
import { useAuthStore } from "@/stores/auth";
import { useLogisticsStore } from "@/stores/logistics";

/**
 * Mock tohumundaki satıcı profili.
 *
 * `returnsMock.SELLER_ME` ile aynı; buradan okumak yerine sabit yazıldı ki
 * store mock modülüne bağımlı olmasın — uç canlıya alınınca yalnız bu satır
 * ve `asSeller` geçirimi silinecek (gerçek uçta tenant süzgeci oturumdan
 * okunuyor, sözleşme §6.1).
 */
const MOCK_SELLER_PROFILE = "SEL-00001";

/** Kuyruk süzgeci — sözleşme §1.1 durum kümesiyle birebir. */
export const RETURN_STATUSES = Object.freeze([
  "requested",
  "approved",
  "rejected",
  "in_transit",
  "inspecting",
  "closed",
]);

export const useReturnsStore = defineStore("returns", () => {
  const auth = useAuthStore();
  const logistics = useLogisticsStore();

  /**
   * Yetki bilgisini bir kez yükler.
   *
   * ÖLÇÜLDÜ (E2E, 31 Ağu): iade ekranları `logistics.fetchPermissions()`
   * çağırmıyordu; `capabilities` boş kaldığı için `can.write` hep false
   * dönüyor ve DEPO KONTROLÜ KUTULARI HİÇ AÇILMIYORDU. Aynı kusur POD'da
   * 19 Ağustos'ta ölçülmüş ve `stores/pod.js`'te not düşülmüştü — panelin
   * her lojistik ekranı bu çağrıyı tek tek yapıyor. Burada tek yerde
   * toplandı ki yeni bir iade ekranı eklerken unutulmasın.
   *
   * Birim testi bunu göremezdi: orada store gerçek oturumla kurulmuyor.
   */
  let yetkiSozu = null;
  function ensurePermissions() {
    yetkiSozu ??= logistics.fetchPermissions().catch((e) => {
      // Yetki gelmezse ekran açılmaya devam etmeli: `can` zaten fail-secure.
      yetkiSozu = null;
      throw e;
    });
    return yetkiSozu;
  }

  /**
   * Satıcı bağlamı — sunucuya "ben satıcıyım" demek İÇİN DEĞİL.
   *
   * Gerçek uçta süzgeç oturumdan okunuyor ve bu alan hiç gönderilmiyor;
   * `api/returns.js` onu yalnız mock dalında geçiriyor.
   */
  const asSeller = computed(() => auth.isSeller && !auth.isAdmin);
  const scope = computed(() => ({ asSeller: asSeller.value }));

  const rows = ref([]);
  const total = ref(0);
  const statusCounts = ref({});
  const status = ref("");

  /** Açık kayıt — I2/I3/I4 üçü de bunu okuyor. */
  const request = ref(null);

  /**
   * Depo kontrolünde kullanıcının girdiği ama HENÜZ kaydedilmemiş değerler.
   *
   * Ekran kendi kopyasını tutmuyor (`ReturnInspectionScreen` sunum katmanı,
   * değişikliği `update` olayıyla yukarı veriyor). Taslak burada duruyor ki
   * kaydetmeden başka sekmeye geçip dönen operatör girdiğini kaybetmesin.
   */
  const inspectionDraft = ref({});

  const loading = ref(false);
  const saving = ref(false);
  const error = ref(null);

  /**
   * Kalemler = kayıt + taslak.
   *
   * Tek doğruluk kaynağı `request`; taslak onun ÜSTÜNE biniyor. İki ayrı
   * dizi tutmak, kaydettikten sonra hangisinin güncel olduğunu belirsiz
   * bırakırdı.
   */
  const inspectionItems = computed(() =>
    (request.value?.items ?? []).map((item) => ({
      ...item,
      ...(inspectionDraft.value[item.item] ?? {}),
    }))
  );

  /** Sözleşme §4.3 — tutar kalem kararlarından türer, elle girilmez. */
  const computedRefund = computed(() =>
    inspectionItems.value.reduce(
      (t, k) => t + Number(k.accepted_qty ?? 0) * Number(k.unit_refund ?? 0),
      0
    )
  );

  const hasDraft = computed(() => Object.keys(inspectionDraft.value).length > 0);

  /**
   * Hata GÖRÜNTÜLENEBİLİR şekle indirgeniyor — ham nesne kaçarsa kullanıcı
   * "[object Object]" görür.
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

  /** Alan bazlı doğrulama hatası — kalem satırının altına yazılıyor. */
  const fieldErrors = computed(() => error.value?.details?.fields ?? {});

  /**
   * Kapanış ön koşullarından HANGİSİ eksik (sözleşme §2.7).
   *
   * Sunucu `failed_checks` döndürüyor; ekran o satırı sarı gösteriyor. Tek
   * genel mesaj hangi adımın eksik olduğunu söylemezdi.
   */
  const failedChecks = computed(() => error.value?.details?.failed_checks ?? []);

  // ── eylemler ─────────────────────────────────────────────────────────

  async function fetchList({ status: durum = status.value } = {}) {
    loading.value = true;
    error.value = null;
    status.value = durum ?? "";
    try {
      await ensurePermissions().catch(() => {});
      const data = await listReturnRequests({ status: durum || null, ...scope.value });
      rows.value = data?.items ?? [];
      total.value = data?.total ?? rows.value.length;
      // Sayaçlar TÜM kapsamdan geliyor, süzülmüş listeden değil (sözleşme
      // §2.2) — aksi hâlde bir duruma süzünce diğerlerinin sayısı sıfırlanır.
      statusCounts.value = data?.status_counts ?? {};
    } catch (e) {
      capture(e);
      rows.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
  }

  async function fetchRequest(name) {
    loading.value = true;
    error.value = null;
    inspectionDraft.value = {};
    try {
      // Yetki BEKLENİYOR: gelmeden çizilen ekran kutuları kilitli gösteriyor
      // ve operatör nedenini anlamıyor.
      await ensurePermissions().catch(() => {});
      request.value = await getReturnRequest(name, scope.value);
    } catch (e) {
      capture(e);
      request.value = null;
    } finally {
      loading.value = false;
    }
  }

  /** I2 · satıcı/platform kararı. Onaylanan iadede ters sevkiyat da döner. */
  async function decide({ decision, decisionNote = null, createReturnShipment = true }) {
    if (!request.value) return false;
    saving.value = true;
    error.value = null;
    try {
      request.value = await decideReturnRequest({
        name: request.value.name,
        decision,
        decisionNote,
        createReturnShipment,
      });
      syncRow(request.value);
      return true;
    } catch (e) {
      capture(e);
      return false;
    } finally {
      saving.value = false;
    }
  }

  /** I3 · kalem taslağı — kaydetmeden önce ekranda görünen değer. */
  function updateInspection({ item, field, value }) {
    inspectionDraft.value = {
      ...inspectionDraft.value,
      [item]: { ...(inspectionDraft.value[item] ?? {}), [field]: value },
    };
  }

  /**
   * I3 · depo kontrolünü kaydeder.
   *
   * `refund_amount` GÖNDERİLMİYOR — sunucuda türetiliyor (sözleşme §4.3).
   * Dönen kayıt taslağın yerine geçiyor: sunucunun düzelttiği bir değer
   * sessizce kaybolmasın.
   */
  async function saveInspection() {
    if (!request.value) return false;
    saving.value = true;
    error.value = null;
    try {
      request.value = await saveReturnInspection({
        name: request.value.name,
        items: inspectionItems.value.map(
          ({ item, received_qty, accepted_qty, inspection_result, inspection_note }) => ({
            item,
            received_qty,
            accepted_qty,
            inspection_result,
            inspection_note,
          })
        ),
      });
      inspectionDraft.value = {};
      syncRow(request.value);
      return true;
    } catch (e) {
      capture(e);
      return false;
    } finally {
      saving.value = false;
    }
  }

  /** I4 · kapanış. Geri alınamaz; ön koşul eksikse `failedChecks` dolar. */
  async function close({ triggerRefund = true } = {}) {
    if (!request.value) return false;
    saving.value = true;
    error.value = null;
    try {
      request.value = await closeReturnRequest({ name: request.value.name, triggerRefund });
      syncRow(request.value);
      return true;
    } catch (e) {
      capture(e);
      return false;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Kuyrukta duran satırı güncel kayıtla eşitler.
   *
   * Listeyi yeniden çekmek yerine tek satır güncelleniyor: kullanıcı karar
   * verip kuyruğa döndüğünde satırın YERİNDEN OYNAMASINI beklemiyor. Sayaç
   * da buradan türüyor — ayrı bir istek atılmıyor.
   */
  function syncRow(guncel) {
    const i = rows.value.findIndex((r) => r.name === guncel.name);
    if (i < 0) return;
    const onceki = rows.value[i].status;
    rows.value[i] = { ...rows.value[i], ...listeAlanlari(guncel) };
    if (onceki !== guncel.status) {
      statusCounts.value = {
        ...statusCounts.value,
        [onceki]: Math.max(0, (statusCounts.value[onceki] ?? 1) - 1),
        [guncel.status]: (statusCounts.value[guncel.status] ?? 0) + 1,
      };
    }
  }

  /** Sözleşme §1.1 — liste satırı DETAIL alanı taşımaz (karar K-6). */
  function listeAlanlari(k) {
    return {
      status: k.status,
      decided_at: k.decided_at ?? null,
      is_closed: k.is_closed ?? 0,
    };
  }

  return {
    asSeller,
    rows,
    total,
    statusCounts,
    status,
    request,
    inspectionItems,
    inspectionDraft,
    computedRefund,
    hasDraft,
    loading,
    saving,
    error,
    fieldErrors,
    failedChecks,
    clearError,
    ensurePermissions,
    fetchList,
    fetchRequest,
    decide,
    updateInspection,
    saveInspection,
    close,
    MOCK_SELLER_PROFILE,
  };
});
