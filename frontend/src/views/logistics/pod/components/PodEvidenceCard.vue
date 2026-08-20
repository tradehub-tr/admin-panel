<template>
  <div class="space-y-4">
    <!-- TUTARSIZLIK ŞERİDİ EN ÜSTTE: alta gizlenen uyarı görülmüyor.
         B2B'de asıl vaka bu — 40 kolinin 38'i geldiğinde ekranın ilk
         söylediği şey bu olmalı. -->
    <div
      v-if="pod.has_discrepancy"
      class="card !p-3 border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10"
    >
      <div class="flex items-start gap-2">
        <AppIcon name="triangle-alert" :size="15" class="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
        <div class="min-w-0">
          <p class="text-[13px] font-semibold text-red-700 dark:text-red-300">
            {{ exceptionLabel }}
          </p>
          <p v-if="pod.discrepancy_note" class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            {{ pod.discrepancy_note }}
          </p>
        </div>
      </div>
    </div>

    <div class="card !p-4">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div class="min-w-0">
          <p class="text-xs text-gray-600 dark:text-gray-400">{{ t("logistics.pod.fields.deliveredAt") }}</p>
          <p class="text-[15px] font-bold text-gray-900 dark:text-gray-100">{{ pod.delivered_at || "—" }}</p>
        </div>
        <!-- Kaydın kaynağı damgalı: satıcı beyanı ile taşıyıcı kaydı
             ihtilafta aynı ağırlıkta değil. -->
        <span :class="sourceClass">{{ t(`logistics.pod.source.${pod.source}`) }}</span>
      </div>

      <dl class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt class="text-xs text-gray-600 dark:text-gray-400">{{ t("logistics.pod.fields.receivedBy") }}</dt>
          <dd class="text-[13px] text-gray-900 dark:text-gray-100">
            {{ pod.received_by || "—" }}
            <span v-if="pod.received_by_title" class="text-gray-600 dark:text-gray-400">
              · {{ pod.received_by_title }}
            </span>
          </dd>
        </div>
        <div>
          <dt class="text-xs text-gray-600 dark:text-gray-400">{{ t("logistics.pod.fields.deliveredPackages") }}</dt>
          <dd class="text-[13px]" :class="isPartial ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-900 dark:text-gray-100'">
            {{ pod.delivered_package_count }} / {{ pod.total_package_count }}
            <span v-if="isPartial" class="text-xs">
              · {{ t("logistics.pod.detail.missingPackages", { count: missing }) }}
            </span>
          </dd>
        </div>
        <div v-if="hasPallets">
          <dt class="text-xs text-gray-600 dark:text-gray-400">{{ t("logistics.pod.detail.palletExchange") }}</dt>
          <dd class="text-[13px] text-gray-900 dark:text-gray-100">
            {{ dash(pod.delivered_pallet_count) }} / {{ dash(pod.returned_pallet_count) }}
          </dd>
        </div>
        <div v-if="pod.waybill_number">
          <dt class="text-xs text-gray-600 dark:text-gray-400">{{ t("logistics.pod.fields.waybill") }}</dt>
          <dd class="text-[13px] font-mono text-gray-900 dark:text-gray-100">{{ pod.waybill_number }}</dd>
        </div>
        <div v-if="pod.location_source">
          <dt class="text-xs text-gray-600 dark:text-gray-400">{{ t("logistics.pod.fields.locationSource") }}</dt>
          <dd class="text-[13px] text-gray-900 dark:text-gray-100">
            {{ t(`logistics.pod.locationSource.${pod.location_source}`) }}
          </dd>
        </div>
        <!-- Konum kaydı teslim saatinden AYRI gösteriliyor: aradaki fark
             ihtilafta anlamlı (araç depodan çıkarken mi damgalanmış?). -->
        <div v-if="pod.location_recorded_at">
          <dt class="text-xs text-gray-600 dark:text-gray-400">{{ t("logistics.pod.detail.locationRecordedAt") }}</dt>
          <dd class="text-[13px] text-gray-900 dark:text-gray-100">{{ pod.location_recorded_at }}</dd>
        </div>
      </dl>

      <p class="mt-4 text-xs text-gray-600 dark:text-gray-400">
        {{ t("logistics.pod.detail.recordedBy") }}: {{ pod.recorded_by }} · {{ pod.recorded_at }}
      </p>
    </div>

    <!-- GÖRSEL KANIT -->
    <div class="card !p-4">
      <h2 class="text-[13px] font-semibold text-gray-900 dark:text-gray-100 mb-3">
        {{ t("logistics.pod.detail.evidence") }}
      </h2>

      <!-- VERİ MİNİMİZASYONU: yetki yoksa dosya HİÇ İSTENMEDİ. Bulanık
           önizleme göstermek veriyi yine tarayıcıya indirirdi. -->
      <div v-if="!mediaVisible" class="flex items-start gap-2 text-[13px]">
        <AppIcon name="lock" :size="14" class="mt-0.5 shrink-0 text-gray-600 dark:text-gray-400" />
        <div>
          <p class="text-gray-700 dark:text-gray-300">{{ t("logistics.pod.detail.mediaHidden") }}</p>
          <p class="text-xs text-gray-600 dark:text-gray-400">{{ t("logistics.pod.detail.mediaHiddenHint") }}</p>
        </div>
      </div>

      <div v-else class="grid gap-3 sm:grid-cols-3">
        <figure v-for="m in mediaSlots" :key="m.key" class="min-w-0">
          <figcaption class="text-xs text-gray-600 dark:text-gray-400 mb-1">{{ m.label }}</figcaption>
          <div
            class="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 h-32 flex items-center justify-center overflow-hidden"
          >
            <!-- Kırık resim ikonu YERİNE açık mesaj: "sunulmadı" ile
                 "yüklenemedi" ihtilafta çok farklı iki durum. -->
            <p v-if="!m.url" class="text-xs text-gray-600 dark:text-gray-400 px-2 text-center">—</p>
            <p v-else-if="failed[m.key]" class="text-xs text-gray-600 dark:text-gray-400 px-2 text-center">
              {{ t("logistics.pod.detail.mediaFailed") }}
            </p>
            <img
              v-else
              :src="m.url"
              :alt="m.label"
              class="max-h-32 w-full object-contain"
              @error="failed[m.key] = true"
            />
          </div>
        </figure>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed, reactive } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";

  const props = defineProps({
    /** Sözleşme §2.2 yükü. */
    pod: { type: Object, required: true },
    /** Yanıtta medya alanları var mı — yoksa hiç istenmedi (§6.2). */
    mediaVisible: { type: Boolean, default: true },
    /** Katalogdan gelen istisna kodları — etiket buradan çözülüyor (§5.1). */
    exceptionCodes: { type: Array, default: () => [] },
  });

  const { t } = useI18n();

  /** Yüklenemeyen görseli kırık ikonla değil mesajla anlatmak için. */
  const failed = reactive({});

  const isPartial = computed(
    () => Number(props.pod.delivered_package_count) < Number(props.pod.total_package_count)
  );
  const missing = computed(() =>
    Math.max(0, Number(props.pod.total_package_count) - Number(props.pod.delivered_package_count))
  );

  const hasPallets = computed(
    () => props.pod.delivered_pallet_count != null || props.pod.returned_pallet_count != null
  );

  /** Metrik yoksa "0" DEĞİL "—": sıfır bir ölçüm, veri yokluğu değil. */
  const dash = (v) => (v == null ? "—" : v);

  const exceptionLabel = computed(() => {
    const kod = props.exceptionCodes.find((c) => c.code === props.pod.exception_code);
    return kod?.label ?? props.pod.exception_code ?? "";
  });

  const SOURCE_CLASS = {
    seller: "px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    carrier: "px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
    operator: "px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
  };
  const sourceClass = computed(() => SOURCE_CLASS[props.pod.source] ?? SOURCE_CLASS.operator);

  const mediaSlots = computed(() => [
    { key: "signature", label: t("logistics.pod.detail.signature"), url: props.pod.signature_url },
    { key: "photo", label: t("logistics.pod.detail.photo"), url: props.pod.photo_url },
    { key: "document", label: t("logistics.pod.detail.document"), url: props.pod.document_url },
  ]);
</script>
