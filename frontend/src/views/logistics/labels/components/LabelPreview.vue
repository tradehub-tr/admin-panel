<template>
  <section class="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
    <div class="flex items-center justify-between">
      <h2 class="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
        {{ t("logistics.label.preview") }}
      </h2>
      <span
        class="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      >
        {{ pkg.sequence_label }}
      </span>
    </div>

    <!-- Barkod GÖRSELİ gösteriliyor, PDF gömülmüyor: iframe hem ağır hem
         tarayıcı eklentileriyle güvenilmez. Etiket dosyası yeni sekmede. -->
    <div
      class="flex h-28 items-center justify-center rounded border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
    >
      <img
        v-if="pkg.label?.barcode_url && !broken"
        :src="pkg.label.barcode_url"
        :alt="t('logistics.label.barcodeAlt', { code: pkg.package_code })"
        class="max-h-24 max-w-full object-contain"
        @error="broken = true"
      />
      <!-- Kırık-resim ikonu "barkod yok" ile "barkod yüklenemedi"yi ayırt
           ettirmez; yükleme hatasında yer tutucuya düşülüyor. -->
      <span v-else class="text-xs text-slate-600 dark:text-slate-400">
        {{
          pkg.label?.barcode_url
            ? t("logistics.label.barcodeUnavailable")
            : t("logistics.label.noBarcode")
        }}
      </span>
    </div>

    <dl class="space-y-1 text-xs">
      <div class="flex justify-between gap-2">
        <dt class="text-slate-600 dark:text-slate-400">{{ t("logistics.package.dimensions") }}</dt>
        <dd class="tabular-nums">{{ pkg.length_cm }}×{{ pkg.width_cm }}×{{ pkg.height_cm }} cm</dd>
      </div>
      <div class="flex justify-between gap-2">
        <dt class="text-slate-600 dark:text-slate-400">{{ t("logistics.package.weight") }}</dt>
        <dd class="tabular-nums">{{ pkg.weight_kg }} kg</dd>
      </div>
      <div
        class="flex justify-between gap-2"
        :class="pkg.is_desi_dominant ? 'font-semibold text-amber-700 dark:text-amber-400' : ''"
      >
        <dt :class="pkg.is_desi_dominant ? '' : 'text-slate-600 dark:text-slate-400'">
          {{ t("logistics.package.desi") }}
        </dt>
        <dd class="tabular-nums">{{ pkg.desi }}</dd>
      </div>
      <!-- Takip no YOKKEN de satır duruyor. Alanı gizlemek "böyle bir bilgi
           yok" gibi okunuyordu; oysa taşıyıcı entegrasyonu numarayı sonra
           veriyor. Eksikliğin görünür olması "neden yok" sorusunu önlüyor. -->
      <div class="flex justify-between gap-2">
        <dt class="text-slate-600 dark:text-slate-400">{{ t("logistics.shipment.tracking") }}</dt>
        <dd v-if="pkg.label?.carrier_tracking" class="font-mono">
          {{ pkg.label.carrier_tracking }}
        </dd>
        <dd v-else class="italic text-slate-600 dark:text-slate-400">
          {{ t("logistics.label.trackingPending") }}
        </dd>
      </div>
    </dl>

    <div class="border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800">
      <p v-if="pkg.label?.printed_at" class="text-slate-600 dark:text-slate-400">
        {{ t("logistics.package.printedAt") }}: {{ pkg.label.printed_at }}
      </p>
      <p v-else class="text-amber-700 dark:text-amber-400">
        {{ t("logistics.label.neverPrinted") }}
      </p>
      <!-- Yeniden basım sayısı GÖRÜNÜR: ikinci baskı kargo şubesinde çift
           kayıt riski, sessiz geçilecek bir bilgi değil. -->
      <p v-if="(pkg.label?.print_count ?? 0) > 1" class="mt-0.5 text-amber-700 dark:text-amber-400">
        {{ t("logistics.label.reprinted", { count: pkg.label.print_count }) }}
      </p>
    </div>

    <div class="flex flex-wrap gap-2">
      <a
        v-if="safeLabelUrl"
        :href="safeLabelUrl"
        target="_blank"
        rel="noopener"
        class="th-btn-outline text-xs"
      >
        {{ t("logistics.label.open") }}
      </a>
      <button
        v-if="canWrite && !pkg.label?.url"
        type="button"
        class="th-btn-dark text-xs"
        @click="$emit('generate')"
      >
        {{ t("logistics.package.generateLabel") }}
      </button>
      <button
        v-if="canVoid && pkg.label?.url"
        type="button"
        class="th-btn-outline text-xs"
        @click="$emit('void')"
      >
        {{ t("logistics.label.void") }}
      </button>
    </div>
  </section>
</template>

<script setup>
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import { safeDocumentUrl } from "@/utils/sanitize";

  /**
   * C2 düzeninin yan önizlemesi — tabloda seçili koliyi gösterir.
   *
   * Tek seferde bir koli: göz doğrulaması sırayla yapılıyor ama 20+ kolide
   * kart ızgarasının (C1) kaydırma maliyeti yok.
   */
  const props = defineProps({
    /** `decoratePackages` çıktısındaki satır. */
    pkg: { type: Object, required: true },
    canWrite: { type: Boolean, default: false },
    /** `shipment.label.void` — satıcıya kapalı, taşıyıcıya geri alınamaz istek. */
    canVoid: { type: Boolean, default: false },
  });

  defineEmits(["generate", "void"]);
  const { t } = useI18n();

  const broken = ref(false);
  // Başka koliye geçilince kırık-görsel işareti sıfırlanmalı, yoksa yeni
  // kolinin sağlam barkodu da "yüklenemedi" görünür.
  watch(
    () => props.pkg?.package_code,
    () => (broken.value = false)
  );

  // `:href` süzgeci (tam denetim 2026-08-20): backend'in Data alanında
  // sakladığı URL şema denetiminden geçmeden bağlanmaz (api-security.md §3,
  // ShipmentPackagesTab'daki desenle aynı). Süzgeç null dönerse bağlantı HİÇ
  // çizilmez — güvensiz URL'i tıklanabilir yapmaktan iyidir; "etiket
  // üret/iptal" butonları ham `label.url` varlığına bakmaya devam ediyor,
  // çünkü etiketin VAR olduğu bilgisi süzgeçten bağımsız.
  //
  // Süzgeç `safeExternalUrl` DEĞİL `safeDocumentUrl`: etiket belgesi
  // tarayıcıda üretiliyor ve adresi `blob:`. Beyaz listede olmadığı için
  // bağlantı hiç çizilmiyordu — etiket üretilebiliyor ama AÇILAMIYORDU
  // (ölçüldü 2026-08-21). Gerekçe ve güvenlik dayanağı: `utils/sanitize.js`.
  const safeLabelUrl = computed(() => safeDocumentUrl(props.pkg?.label?.url));
</script>
