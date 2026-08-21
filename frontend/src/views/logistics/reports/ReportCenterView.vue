<template>
  <ReportCenterScreen
    :panel="panel"
    :date-from="from"
    :date-to="to"
    :operations="opsData"
    :loading="loading"
    :error="error"
    :exportable="exportable"
    @panel-change="setPanel"
    @range-change="setRange"
    @preset="applyPreset"
    @export="exportCsv"
    @retry="load"
  >
    <PerformanceReportScreen
      v-if="panel === 'performance'"
      :report="perfData"
      :loading="loading"
      :error="error"
      @retry="load"
    />
    <CostReportScreen
      v-else
      :report="costData"
      :loading="loading"
      :error="error"
      :can="can"
      @retry="load"
    />
  </ReportCenterScreen>
</template>

<script setup>
  import { computed, onMounted, ref, watch } from "vue";
  import { storeToRefs } from "pinia";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";

  import CostReportScreen from "@/components/logistics/CostReportScreen.vue";
  import PerformanceReportScreen from "@/components/logistics/PerformanceReportScreen.vue";
  import ReportCenterScreen from "@/components/logistics/ReportCenterScreen.vue";
  import {
    defaultReportRange,
    getCostReport,
    getOperationsReport,
    getPerformanceReport,
  } from "@/api/reports";
  import { useLogisticsStore } from "@/stores/logistics";
  import { buildCsv } from "@/utils/csv";

  /**
   * **L1 container** — rapor merkezi (TUR-121, 17-FE).
   *
   * Veri `api/reports.js` üzerinden geliyor (şimdilik MOCK — 17-BE sözleşmesi
   * o dosyada). Aktif panel + tarih aralığı URL'de yaşıyor
   * (`?panel=&from=&to=`, A2'nin `?bucket=` deseni): operasyoncu "geçen ayın
   * maliyeti" linkini paylaşabilsin, geri/ileri tuşu seçimleri geri getirsin.
   *
   * Yalnız AKTİF panelin ucu çağrılıyor — üç raporu birden çekmek iki
   * görünmez isteği boşa atmak olurdu. Maliyet paneli `can.viewCost` yokken
   * HİÇ yüklenmez (istek bile atılmaz); ekran yetki mesajını kendisi çizer
   * (çifte kapı — sözleşme: uç `view.logistics_cost` İSTER).
   */
  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n();

  const store = useLogisticsStore();
  const { can } = storeToRefs(store);

  const PANELS = ["operations", "performance", "cost"];
  // Dosya adına giren TR karşılıklar — URL/CSV adı ASCII ve kararlı kalsın.
  const PANEL_SLUGS = { operations: "operasyon", performance: "performans", cost: "maliyet" };

  // Varsayılan aralık SÖZLEŞMEDEN (son 30 gün) — açılışta bir kez hesaplanır.
  const fallback = defaultReportRange();

  const panel = computed(() =>
    PANELS.includes(route.query.panel) ? route.query.panel : "operations"
  );

  // URL'den gelen from/to HAM GÜVENİLMEZ girdi: hem isteğe basılıyor hem CSV
  // dosya adına giriyor (`link.download`). Panel whitelist'iyle SİMETRİK
  // doğrulama: biçim + gerçek takvim günü + from<=to. Geçmeyen değer sözleşme
  // varsayılanına (son 30 gün) düşer — böylece dosya adına ham query sızmaz
  // ve ters aralıkta sıfır-satır export kapanır. Screen'deki ters-aralık
  // uyarısı YAŞIYOR: formda elle yazılan yerel giriş yine tetikler (uyarı
  // localFrom/localTo üzerinden), yalnız container'a bozuk değer inmez.
  //
  // Takvim kontrolü ISO round-trip ile: NaN kontrolü V8'de yetmiyor —
  // ölçüldü (final doğrulama, 2026-08-21): new Date("2026-02-31") NaN değil,
  // 03-03'e YUVARLANIYOR. Geri yazım orijinalle eşleşmiyorsa gün sahtedir.
  const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
  const isValidDay = (value) => {
    if (typeof value !== "string" || !DAY_RE.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };

  const range = computed(() => {
    const qFrom = isValidDay(route.query.from) ? route.query.from : fallback.from;
    const qTo = isValidDay(route.query.to) ? route.query.to : fallback.to;
    // Ters aralık: iki değer tek tek geçerli ama birlikte anlamsız — ikisi
    // birden varsayılana döner (yarısını tutmak keyfî bir aralık üretirdi).
    return qFrom <= qTo ? { from: qFrom, to: qTo } : { ...fallback };
  });
  const from = computed(() => range.value.from);
  const to = computed(() => range.value.to);

  const opsData = ref(null);
  const perfData = ref(null);
  const costData = ref(null);
  const loading = ref(false);
  const error = ref(null);

  // fetchPermissions bitmeden yüklememek C1 dersi: can.viewCost henüz false
  // görünürken maliyet isteği atlanır ya da atılırdı — açılışta MUTLAKA
  // önce yetki, sonra veri.
  const permissionsReady = ref(false);

  async function load() {
    if (!permissionsReady.value) return;
    loading.value = true;
    error.value = null;
    try {
      const range = { dateFrom: from.value, dateTo: to.value };
      if (panel.value === "operations") {
        opsData.value = await getOperationsReport(range);
      } else if (panel.value === "performance") {
        perfData.value = await getPerformanceReport(range);
      } else if (can.value.viewCost) {
        costData.value = await getCostReport(range);
      } else {
        // Yetki yok: istek atılmaz, ekran CAPABILITY_REQUIRED mesajını çizer.
        costData.value = null;
      }
    } catch (e) {
      error.value = { code: e?.code ?? "INTERNAL_ERROR", message: e?.message };
    } finally {
      loading.value = false;
    }
  }

  function setPanel(next) {
    router.replace({
      query: { ...route.query, panel: next === "operations" ? undefined : next },
    });
  }

  function setRange({ from: nextFrom, to: nextTo }) {
    router.replace({
      query: {
        ...route.query,
        from: nextFrom === fallback.from ? undefined : nextFrom,
        to: nextTo === fallback.to ? undefined : nextTo,
      },
    });
  }

  /** Kısayol: son N gün (bugün dahil) — tarih hesabı container'da. */
  function applyPreset(days) {
    const { to: end } = defaultReportRange();
    const start = new Date(`${end}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    setRange({ from: start.toISOString().slice(0, 10), to: end });
  }

  // ── CSV — istemci tarafı (mock dönemi) ────────────────────────────────
  //
  // Yüklü kırılım satırlarından üretiliyor; kolon başlıkları i18n'den.
  // CANLIDA uç `?format=csv` ile TAM veriyi döndürecek (sözleşme:
  // api/reports.js) — bu fonksiyon o gün sunucu CSV'sine geçer
  // (useMediaAudit.exportCsv deseni).

  const activeRows = computed(() => {
    if (panel.value === "operations") return opsData.value?.by_carrier ?? [];
    if (panel.value === "performance") return perfData.value?.by_carrier ?? [];
    return costData.value?.by_carrier ?? [];
  });

  const exportable = computed(() => !loading.value && !error.value && activeRows.value.length > 0);

  // Ekranla AYNI yüzde biçimi (PerformanceReportScreen.percent) — CSV ekranın
  // söylediği rakamı söylesin: "90.1%", ham 0.9012 değil (17-FE QA paritesi).
  const ratePercent = (value) => (value == null ? "—" : `${(Number(value) * 100).toFixed(1)}%`);

  function csvTable() {
    const rows = activeRows.value;
    if (panel.value === "operations") {
      return {
        headers: [
          t("logistics.reports.carrier"),
          t("logistics.reports.shipments"),
          t("logistics.reports.delivered"),
          t("logistics.reports.failed"),
        ],
        lines: rows.map((r) => [r.carrier, r.count, r.delivered, r.failed]),
      };
    }
    if (panel.value === "performance") {
      return {
        headers: [
          t("logistics.reports.carrier"),
          t("logistics.reports.shipments"),
          t("logistics.reports.avgDays"),
          t("logistics.reports.onTime"),
        ],
        lines: rows.map((r) => [r.carrier, r.shipments, r.avg_days, ratePercent(r.on_time_rate)]),
      };
    }
    return {
      headers: [
        t("logistics.reports.carrier"),
        t("logistics.reports.shipments"),
        t("logistics.cost.carrierCost"),
        t("logistics.cost.customerCharge"),
        t("logistics.cost.margin"),
        t("logistics.reports.avgCost"),
      ],
      // Sevkiyat başı maliyet EKRANLA AYNI türetme (CostReportScreen
      // avgCostLabel: cost/shipments) — CSV ekranın gösterdiği kolonu
      // atlamasın (17-FE QA paritesi). Değer ham sayı (2 ondalık): diğer
      // tutar kolonları da ham, para biçimi ekranın işi.
      lines: rows.map((r) => [
        r.carrier,
        r.shipments,
        r.cost,
        r.charge,
        r.margin,
        r.shipments ? (r.cost / r.shipments).toFixed(2) : "—",
      ]),
    };
  }

  function exportCsv() {
    if (!exportable.value) return;
    const { headers, lines } = csvTable();
    // Her hücre (başlıklar DAHİL) kaçışlı: RFC 4180 + formül-enjeksiyon
    // koruması (utils/csv.js — 17-FE denetimi, Security-major).
    const csv = buildCsv(headers, lines);
    // BOM: Excel'in Türkçe karakterleri UTF-8 olarak tanıması için
    // (useMediaAudit deseni; buildCsv bilerek BOM'suz — çağıran ekler).
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lojistik-${PANEL_SLUGS[panel.value]}-${from.value}-${to.value}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  onMounted(async () => {
    await store.fetchPermissions();
    permissionsReady.value = true;
    await load();
  });

  watch([panel, from, to], load);
</script>
