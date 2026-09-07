<template>
  <ExceptionQueueScreen
    :rows="rows"
    :severity-counts="counts"
    :severity="severity"
    :loading="loading"
    :error="error"
    :can="store.can"
    @retry="load"
    @resolve="openResolve"
    @open-shipment="openShipment"
    @filter-severity="selectSeverity"
  />

  <ResolveDialog
    :open="resolveOpen"
    :exception="resolving"
    :saving="resolveSaving"
    @confirm="confirmResolve"
    @cancel="resolveOpen = false"
  />
</template>

<script setup>
  import { computed, onMounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";

  import ExceptionQueueScreen from "@/components/logistics/ExceptionQueueScreen.vue";
  import { listShipmentExceptions, resolveShipmentException } from "@/api/exceptions";
  import { toScreenError } from "@/api/logisticsEnvelope";
  import { useLatestRequest } from "@/composables/useLatestRequest";
  import { useToast } from "@/composables/useToast";
  import { useLogisticsStore } from "@/stores/logistics";

  import ResolveDialog from "./components/ResolveDialog.vue";

  /**
   * **A3 container** — istisna kuyruğu (TUR-113/118).
   *
   * Veri `api/exceptions.js` üzerinden (şimdilik MOCK — 16-BE sözleşmesi
   * orada). Önem filtresi URL'de yaşıyor (`?severity=Critical`): "kritikler"
   * linki paylaşılabilir (A2 `?bucket=` deseniyle birebir).
   *
   * Çözüm akışı: kart "Çözümle" → notu toplayan diyalog (TUR-113: not
   * zorunlu) → uç → liste tazelenir; çözülen kayıt soluk olarak kalır.
   */
  const route = useRoute();
  const router = useRouter();
  const store = useLogisticsStore();
  const toast = useToast();
  const { t } = useI18n();

  const severity = computed(() => String(route.query.severity || ""));

  const rows = ref([]);
  const counts = ref({});

  const resolveOpen = ref(false);
  const resolving = ref(null);
  const resolveSaving = ref(false);

  // Bayat-yanıt koruması: önem filtresi hızlı değişince geç dönen ESKİ
  // filtrenin satırları basılabiliyordu. Desen `useLatestRequest`te (SOLID
  // denetimi 2026-08-24) — gerekçeler ve AbortController kararı orada.
  const { loading, error, run } = useLatestRequest({ mapError: toScreenError });

  function load() {
    return run(() => listShipmentExceptions({ severity: severity.value }), {
      apply: (data) => {
        rows.value = data?.items ?? [];
        counts.value = data?.severity_counts ?? {};
      },
      onError: () => {
        rows.value = [];
        // Sayaçlar da sıfırlanmalı (denetim 2026-09-07): yoksa StatusFilterPills
        // hata durumunda ÖNCEKİ koşumun sayılarını göstermeye devam ediyordu.
        counts.value = {};
      },
    });
  }

  function selectSeverity(next) {
    router.replace({ query: { ...route.query, severity: next || undefined } });
  }

  function openShipment(name) {
    router.push({ name: "LogisticsShipmentDetail", params: { name } });
  }

  function openResolve(row) {
    resolving.value = row;
    resolveOpen.value = true;
  }

  async function confirmResolve(note) {
    // Yeniden-giriş kilidi (C1 ManualShipmentView emsali, denetim 2026-09-04):
    // `saving` disabled'ı DOM'a inmeden aynı karede gelen ikinci tıklama
    // ikinci çözüm isteğini başlatabiliyordu.
    if (resolveSaving.value) return;
    resolveSaving.value = true;
    try {
      await resolveShipmentException(resolving.value.name, note);
      resolveOpen.value = false;
      toast.success(t("logistics.exception.resolved", { name: resolving.value.name }));
      await load();
    } catch (e) {
      // Diyalog açık kalıyor — not kaybolmasın, kullanıcı düzeltip yeniden
      // denesin. Hata toast'la görünür (backend VALIDATION_FAILED dahil).
      toast.error(e?.message || t("logistics.exception.resolveFailed"));
    } finally {
      resolveSaving.value = false;
    }
  }

  onMounted(async () => {
    // Yetkiler doğrudan URL girişinde de dolu olsun — yoksa can.write boş
    // kalıyor ve "Çözümle" butonu yetkili kullanıcıda hiç çizilmiyordu
    // (C1'deki canlı bulgunun sessiz eşi). Liste beklemeden yüklenir.
    load();
    await store.fetchPermissions();
  });
  // Rota-çıkış guard'ı (denetim 2026-09-04): rotadan ayrılırken query boşalıp
  // computed son kez değişiyor ve watch ölü bir yükleme tetikliyordu.
  watch(severity, () => {
    if (route.name === "LogisticsExceptionQueue") load();
  });
</script>
