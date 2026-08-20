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
  recordProofOfDelivery,
} from "@/api/pod";
// Tek sözleşme (tam denetim 2026-08-20): olay akışı `api/pod.js`'teki ikinci
// adapterden değil, B6 takip sekmesinin de kullandığı ortak istemciden okunur
// — iki ekran aynı olay verisini göstersin.
import { listShipmentEvents } from "@/api/shipmentEvents";
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

  /**
   * Oturumdaki satıcının adı — mock'un tenant süzgeci buna bakıyor.
   *
   * Sabit bir ada bağlıyken satıcı rolüyle bakan herkes BOŞ ekran görüyordu:
   * tohum "Kaya Hırdavat" adına yazılmış, gerçek hesap başkasıydı. Gerçek uçta
   * bu alan HİÇ gönderilmiyor (sunucu oturumdan okuyor) — `api/pod.js` onu
   * yalnız mock dalında geçiriyor.
   */
  // Admin rolünde NULL: mock tohumu satıcı adına göre etiketliyor ve
  // "Administrator" ile tohumlamak admin görünümündeki satıcı sütununu
  // bozardı. Süzgeç zaten yalnız `asSeller` iken uygulanıyor.
  const sellerName = computed(() => (asSeller.value ? (auth.user?.full_name ?? null) : null));

  // ── ortak ──────────────────────────────────────────────────────────

  /** Sunucudan gelen "şu an" — bekleme süreleri buna göre (sözleşme §4.2). */
  const serverTime = ref(null);

  /**
   * Yetki bilgisini bir kez yükler.
   *
   * ÖLÇÜLDÜ (E2E, 2026-08-19): POD ekranları `logistics.fetchPermissions()`
   * çağırmıyordu; `capabilities` boş kaldığı için `can.amend` hep false
   * dönüyor ve DÜZELTME DÜĞMESİ HİÇ ÇİZİLMİYORDU. Panelin diğer lojistik
   * ekranları bu çağrıyı tek tek yapıyor (CatalogListView, ShipmentDetailView…);
   * burada tek yerde toplandı ki yeni bir POD ekranı eklerken unutulmasın.
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
        sellerName: sellerName.value,
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
      const data = await getProofOfDelivery(shipment, { canViewMedia: can.value.viewMedia, asSeller: asSeller.value, sellerName: sellerName.value });
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
      const data = await recordProofOfDelivery({ ...payload, asSeller: asSeller.value, sellerName: sellerName.value });
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
        sellerName: sellerName.value,
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
      // `shipmentEvents` sözleşmesi { items, tracking_url } döner (eski pod
      // adapteri { events, server_time } dönüyordu — tam denetim 2026-08-20).
      // Bu yanıt server_time TAŞIMAZ; istasyon bekleme süresi diğer POD
      // yüzeylerinden gelen serverTime ile hesaplanmaya devam eder.
      eventsState.value.events = data.items ?? [];
      eventsState.value.loaded = true;
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

  /**
   * Akış başına İSTEK SIRA NUMARASI (tam denetim Tur-3, 2026-08-20).
   *
   * Hızlı filtre değişiminde iki fetchFlow uçuşta olabiliyor; önce atılan
   * istek SONRA dönerse eski satırlar yeni sonucu ezerdi. Çağrı girişinde
   * numara alınır, yanıt işlenmeden önce "hâlâ en son ben miyim" diye
   * bakılır — değilse yanıt ATILIR. AbortController BİLEREK kullanılmadı:
   * api katmanı (`utils/api.js`) signal parametresi taşımıyor; sıra
   * numarası aynı yarışı taşıma katmanına dokunmadan kapatıyor.
   */
  const flowSeq = { seller_delivery: 0, buyer_pickup: 0 };

  /**
   * Son fetchFlow çağrısının filtre parametreleri (akış başına) —
   * handOver başarı yolunda liste AYNI filtrelerle tazelensin diye.
   * Filtresiz tazelemek kullanıcının süzdüğü görünümü (arama/durum/randevu)
   * sessizce sıfırlıyordu.
   */
  const lastFlowParams = { seller_delivery: {}, buyer_pickup: {} };

  async function fetchFlow(flowType, options = {}) {
    const yuzey = flows.value[flowType];
    const seq = ++flowSeq[flowType];
    lastFlowParams[flowType] = options;
    yuzey.loading = true;
    yuzey.error = null;
    try {
      const data = await listDeliveryFlows(flowType, { ...options, asSeller: asSeller.value, sellerName: sellerName.value });
      if (seq !== flowSeq[flowType]) return; // bayat yanıt — daha yeni istek var, ezme
      yuzey.rows = data.rows ?? [];
      yuzey.total = data.total ?? 0;
      yuzey.unfilteredTotal = data.unfiltered_total ?? data.total ?? 0;
      yuzey.loaded = true;
      serverTime.value = data.server_time ?? serverTime.value;
    } catch (e) {
      if (seq !== flowSeq[flowType]) return; // bayat isteğin hatası da gösterilmez
      yuzey.error = e;
      yuzey.rows = [];
    } finally {
      // Yükleme durumunu yalnız EN SON istek kapatır — bayat isteğin
      // finally'si yeni isteğin göstergesini söndürmesin.
      if (seq === flowSeq[flowType]) yuzey.loading = false;
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
    const data = await handOverShipment({ ...payload, asSeller: asSeller.value, sellerName: sellerName.value });
    await Promise.all([
      // Aktif filtrelerle tazele (tam denetim Tur-3, 2026-08-20): filtresiz
      // fetchFlow, kullanıcının süzdüğü görünümü teslim sonrası sıfırlıyordu.
      fetchFlow("buyer_pickup", lastFlowParams.buyer_pickup),
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
    lastFlowParams.seller_delivery = {};
    lastFlowParams.buyer_pickup = {};
    audit.value = [];
  }

  return {
    // state
    queue, filters, detail, audit, eventsState, flows, exceptionCodes, branches, serverTime,
    // getters
    can, asSeller, sellerName, queueEmptyReason, hasPod, isPartial, missingPackages, stations, locationUnavailable,
    // actions
    ensurePermissions, fetchQueue, setBucket, fetchPod, recordPod, amendPod, fetchAudit,
    fetchEvents, fetchFlow, handOver, loadExceptionCodes, loadBranch, $resetSurfaces,
  };
});
