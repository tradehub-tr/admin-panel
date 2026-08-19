// Teslim kanıtı / teslimat akışları store'u (14-FE).
//
// Sözleşme: docs/lojistik/14-FE-VERI-SOZLESMESI.md
// Kararlar:  docs/lojistik/14-FE-pod-teslimat-ANALIZ.md (K-A…K-O)
//
// AYRI STORE, `stores/logistics.js`'e EKLENMEDİ: o dosya ortak yüzey ve
// sevkiyat/katalog durumunu taşıyor; POD durumunu oraya yazmak her PR'da
// çakışma üretirdi (LOGISTICS-TASK-SPLIT §3). Yetki bilgisi ondan OKUNUYOR.

import { defineStore } from "pinia";
import { computed, ref } from "vue";

import {
  amendProofOfDelivery,
  getCarrierBranch,
  getExceptionCodes,
  getPodAudit,
  getPodQueue,
  getProofOfDelivery,
  handOverShipment,
  listDeliveryFlows,
  listShipmentEvents,
  recordProofOfDelivery,
} from "@/api/pod";
import { hasLocationData, toStations } from "@/utils/stationTimeline";
import { useAuthStore } from "@/stores/auth";
import { useLogisticsStore } from "@/stores/logistics";

/** Her yüzey KENDİ yükleniyor/hata durumunu taşır. */
const bosYuzey = () => ({ loading: false, error: null, loaded: false });

export const usePodStore = defineStore("pod", () => {
  const auth = useAuthStore();
  const logistics = useLogisticsStore();

  // ── yetki ──────────────────────────────────────────────────────────

  /**
   * POD yetkileri `logistics.js`'e EKLENMEDİ — o dosya ortak.
   * `capabilities` Set'i oradan okunup burada türetiliyor.
   *
   * KÖPRÜ: `view.pod_media` ve `pod.amend` capability'leri 14-BE'de
   * eklenecek (sözleşme §6). O güne kadar sunucu bu adları hiç bildirmiyor;
   * yalnız onlara bakmak medyayı ve düzeltmeyi KALICI olarak kapatırdı ve
   * ekranlar mock üzerinde gözden geçirilemezdi.
   */
  const can = computed(() => {
    const has = (n) => logistics.capabilities?.has?.(n) ?? false;
    const satici = auth.isSeller && !auth.isAdmin;
    return {
      // Satıcı kendi teslimatının kanıtını KAYDEDEBİLİR (K-B), damgası
      // `source: seller` olur — damgayı sunucu koyar, istemci değil.
      record: true,
      // Düzeltme satıcıda YOK: kendi beyanını sessizce değiştirebilirdi.
      amend: !satici && (has("pod.amend") || has("shipment.write")),
      // Teslim aksiyonu (D2) — ödeme ve kod kapıları sunucuda da var.
      handOver: has("shipment.write") || satici,
      viewMedia: has("view.pod_media") || has("shipment.write") || satici,
    };
  });

  /** Sunucuya "ben satıcıyım" demek için değil — mock'un damgayı doğru
   *  seçmesi ve tenant süzgecini taklit etmesi için. Gerçek uçta oturumdan. */
  const asSeller = computed(() => auth.isSeller && !auth.isAdmin);

  // ── ortak ──────────────────────────────────────────────────────────

  /** Sunucudan gelen "şu an" — bekleme süreleri buna göre (sözleşme §4.2). */
  const serverTime = ref(null);

  // ── kuyruk ─────────────────────────────────────────────────────────

  const queue = ref({ buckets: [], rows: [], total: 0, unfilteredTotal: 0, ...bosYuzey() });
  const filters = ref({ bucket: null, search: "", carrier: null, seller: null });

  /** Filtre yüzünden mi boş, hiç kayıt yok diye mi? İki ayrı cümle kurulur. */
  const queueEmptyReason = computed(() => {
    if (queue.value.rows.length) return null;
    return queue.value.unfilteredTotal > 0 ? "filtered" : "none";
  });

  async function fetchQueue({ reset = false } = {}) {
    if (reset) filters.value = { bucket: null, search: "", carrier: null, seller: null };
    queue.value.loading = true;
    queue.value.error = null;
    try {
      const data = await getPodQueue({
        bucket: filters.value.bucket,
        search: filters.value.search || null,
        carrier: filters.value.carrier,
        seller: filters.value.seller,
        asSeller: asSeller.value,
      });
      queue.value.buckets = data.buckets ?? [];
      queue.value.rows = data.rows ?? [];
      queue.value.total = data.total ?? 0;
      queue.value.unfilteredTotal = data.unfiltered_total ?? data.total ?? 0;
      queue.value.loaded = true;
      serverTime.value = data.server_time ?? serverTime.value;
    } catch (e) {
      queue.value.error = e;
      queue.value.rows = [];
    } finally {
      queue.value.loading = false;
    }
  }

  function setBucket(bucket) {
    filters.value.bucket = filters.value.bucket === bucket ? null : bucket;
    return fetchQueue();
  }

  // ── kanıt detayı ───────────────────────────────────────────────────

  const detail = ref({ shipment: null, pod: null, shipmentStatus: null, mediaVisible: true, saving: false, ...bosYuzey() });
  const audit = ref([]);

  /** POD yok = eksik veri, HATA DEĞİL. Ekran sorun olarak gösterir. */
  const hasPod = computed(() => !!detail.value.pod);

  const isPartial = computed(() => {
    const p = detail.value.pod;
    if (!p) return false;
    return Number(p.delivered_package_count) < Number(p.total_package_count);
  });

  const missingPackages = computed(() => {
    const p = detail.value.pod;
    if (!p) return null;
    return Math.max(0, Number(p.total_package_count) - Number(p.delivered_package_count));
  });

  async function fetchPod(shipment) {
    detail.value.loading = true;
    detail.value.error = null;
    detail.value.shipment = shipment;
    try {
      const data = await getProofOfDelivery(shipment, { canViewMedia: can.value.viewMedia, asSeller: asSeller.value });
      detail.value.pod = data.proof_of_delivery ?? null;
      detail.value.shipmentStatus = data.shipment_status ?? null;
      detail.value.mediaVisible = data.media_visible ?? true;
      detail.value.loaded = true;
      serverTime.value = data.server_time ?? serverTime.value;
    } catch (e) {
      detail.value.error = e;
      detail.value.pod = null;
    } finally {
      detail.value.loading = false;
    }
  }

  /**
   * Kanıt kaydeder. Başarıda kuyruk YENİDEN OKUNUR.
   *
   * Kova sayaçlarını istemcide artırıp azaltmak iki doğruluk kaynağı üretir;
   * 13-FE'de tam bu yüzden tamamlanan sevkiyat eski kovasında kalmıştı.
   */
  async function recordPod(payload) {
    detail.value.saving = true;
    detail.value.error = null;
    try {
      const data = await recordProofOfDelivery({ ...payload, asSeller: asSeller.value });
      detail.value.pod = data.proof_of_delivery;
      if (queue.value.loaded) await fetchQueue();
      return data;
    } catch (e) {
      detail.value.error = e;
      throw e;
    } finally {
      detail.value.saving = false;
    }
  }

  async function amendPod(payload) {
    detail.value.saving = true;
    detail.value.error = null;
    try {
      const data = await amendProofOfDelivery({
        ...payload,
        asSeller: asSeller.value,
        modified: detail.value.pod?.recorded_at ?? null,
      });
      detail.value.pod = data.proof_of_delivery;
      audit.value = (await getPodAudit(detail.value.shipment)).entries ?? [];
      if (queue.value.loaded) await fetchQueue();
      return data;
    } catch (e) {
      detail.value.error = e;
      throw e;
    } finally {
      detail.value.saving = false;
    }
  }

  async function fetchAudit(shipment) {
    audit.value = (await getPodAudit(shipment)).entries ?? [];
  }

  // ── istasyonlar ────────────────────────────────────────────────────

  const eventsState = ref({ shipment: null, events: [], ...bosYuzey() });

  /** İndirgeme FE'de (sözleşme §7) — sunucudan ham olay listesi yeterli. */
  const stations = computed(() => toStations(eventsState.value.events, serverTime.value));

  /**
   * Konum hiç taşınmıyorsa sekme "bu bilgi henüz taşınmıyor" der.
   * Boş çizelge çizmek operasyona "hiç hareket yok" der — yalan olur.
   */
  const locationUnavailable = computed(
    () => eventsState.value.loaded && eventsState.value.events.length > 0 && !hasLocationData(eventsState.value.events)
  );

  async function fetchEvents(shipment) {
    eventsState.value.loading = true;
    eventsState.value.error = null;
    eventsState.value.shipment = shipment;
    try {
      const data = await listShipmentEvents(shipment);
      eventsState.value.events = data.events ?? [];
      eventsState.value.loaded = true;
      serverTime.value = data.server_time ?? serverTime.value;
    } catch (e) {
      eventsState.value.error = e;
      eventsState.value.events = [];
    } finally {
      eventsState.value.loading = false;
    }
  }

  // ── teslimat akışları (D1 / D2) ────────────────────────────────────

  const flows = ref({
    seller_delivery: { rows: [], total: 0, unfilteredTotal: 0, ...bosYuzey() },
    buyer_pickup: { rows: [], total: 0, unfilteredTotal: 0, ...bosYuzey() },
  });

  async function fetchFlow(flowType, options = {}) {
    const yuzey = flows.value[flowType];
    yuzey.loading = true;
    yuzey.error = null;
    try {
      const data = await listDeliveryFlows(flowType, { ...options, asSeller: asSeller.value });
      yuzey.rows = data.rows ?? [];
      yuzey.total = data.total ?? 0;
      yuzey.unfilteredTotal = data.unfiltered_total ?? data.total ?? 0;
      yuzey.loaded = true;
      serverTime.value = data.server_time ?? serverTime.value;
    } catch (e) {
      yuzey.error = e;
      yuzey.rows = [];
    } finally {
      yuzey.loading = false;
    }
  }

  /**
   * D2 · Teslim et. Buton ödeme alınmamışsa hiç ÇİZİLMEZ (K-K) — ama kapı
   * sunucuda da var, bu yüzden hata yine yakalanıyor.
   *
   * Başarıda sevkiyat `Delivered` olur ve POD kaydı BEKLENİR (`pod_required`):
   * teslim aksiyonu POD'u doğurur, iki iş ayrılamaz (K-F).
   */
  async function handOver(payload) {
    const data = await handOverShipment({ ...payload, asSeller: asSeller.value });
    await Promise.all([
      fetchFlow("buyer_pickup"),
      queue.value.loaded ? fetchQueue() : Promise.resolve(),
    ]);
    return data;
  }

  // ── katalog ────────────────────────────────────────────────────────

  const exceptionCodes = ref([]);

  /** Katalogdan gelir, bileşene gömülmez (sözleşme §5.1). Bir kez yüklenir. */
  async function loadExceptionCodes() {
    if (exceptionCodes.value.length) return exceptionCodes.value;
    exceptionCodes.value = (await getExceptionCodes()).codes ?? [];
    return exceptionCodes.value;
  }

  const branches = ref({});

  /** K-C: teslim noktası için ayrı ekran yok; kart bu kayıttan besleniyor. */
  async function loadBranch(name) {
    if (!name) return null;
    if (branches.value[name]) return branches.value[name];
    const { branch } = await getCarrierBranch(name);
    branches.value[name] = branch;
    return branch;
  }

  function $resetSurfaces() {
    queue.value = { buckets: [], rows: [], total: 0, unfilteredTotal: 0, ...bosYuzey() };
    detail.value = { shipment: null, pod: null, shipmentStatus: null, mediaVisible: true, saving: false, ...bosYuzey() };
    eventsState.value = { shipment: null, events: [], ...bosYuzey() };
    flows.value = {
      seller_delivery: { rows: [], total: 0, unfilteredTotal: 0, ...bosYuzey() },
      buyer_pickup: { rows: [], total: 0, unfilteredTotal: 0, ...bosYuzey() },
    };
    audit.value = [];
  }

  return {
    // state
    queue, filters, detail, audit, eventsState, flows, exceptionCodes, branches, serverTime,
    // getters
    can, asSeller, queueEmptyReason, hasPod, isPartial, missingPackages, stations, locationUnavailable,
    // actions
    fetchQueue, setBucket, fetchPod, recordPod, amendPod, fetchAudit,
    fetchEvents, fetchFlow, handOver, loadExceptionCodes, loadBranch, $resetSurfaces,
  };
});
