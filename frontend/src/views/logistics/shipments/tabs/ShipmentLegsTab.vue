<template>
  <ol v-if="legs.length" class="space-y-3">
    <li
      v-for="leg in ordered"
      :key="leg.sequence"
      class="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium dark:bg-gray-700">
          {{ leg.sequence }}
        </span>
        <span class="text-sm font-medium">{{ legTypeLabel(leg.leg_type) }}</span>
        <StatusBadge :status="leg.status" kind="leg" :show-dot="false" />
        <span v-if="leg.carrier" class="text-xs text-gray-500">{{ leg.carrier }}</span>
        <!-- Bacak maliyeti bağımsız görülebilmeli (TUR-109 kabul kriteri) -->
        <span
          v-if="leg.cost != null"
          class="ms-auto text-xs tabular-nums text-gray-600 dark:text-gray-300"
        >
          {{ money(leg.cost) }}
        </span>
      </div>

      <div
        class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400"
      >
        <span
          >{{ leg.origin_branch || t("logistics.leg.origin") }} →
          {{ leg.destination_branch || t("logistics.leg.destination") }}</span
        >
        <span v-if="leg.started_at">{{ leg.started_at }}</span>
        <span v-if="leg.completed_at">— {{ leg.completed_at }}</span>
      </div>

      <!-- Sorumluluk geçişi: TUR-109 "devir noktası ve sorumluluk geçişi
           kayıt altındadır" kriterinin görünen yüzü -->
      <p
        v-if="leg.handover_point"
        class="mt-2 rounded bg-sky-50 px-2 py-1 text-xs text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
      >
        {{ t("logistics.leg.handover") }}: {{ leg.handover_point }}
        <a
          v-if="leg.safeHandoverProof"
          :href="leg.safeHandoverProof"
          class="underline"
          target="_blank"
          rel="noopener"
        >
          {{ t("logistics.leg.proof") }}
        </a>
      </p>
    </li>
  </ol>
  <p v-else class="py-6 text-center text-sm text-gray-500">{{ t("logistics.leg.empty") }}</p>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import StatusBadge from "@/components/logistics/StatusBadge.vue";
  import { safeExternalUrl } from "@/utils/sanitize";

  /**
   * **B7 · Bacaklar sekmesi** (TUR-109) — her bacağın durumu ve maliyeti bağımsız.
   *
   * `handover_proof` backend'de serbest metin (`Data`) ve devir noktasındaki
   * personel/entegrasyon yazıyor; kanıtı açan yönetici için şema denetimi
   * şart (`safeExternalUrl`).
   */
  const props = defineProps({ legs: { type: Array, default: () => [] } });
  const { t, te } = useI18n();

  /**
   * Sıralama VE şema denetimi tek computed'de — template'te fonksiyon
   * çağrısı kalmıyor (`vue-reactivity.md` §2) ve `v-if` ile `:href` aynı
   * değeri paylaşıyor (bkz. ShipmentDocumentsTab'daki TOCTOU gerekçesi).
   */
  const ordered = computed(() =>
    [...props.legs]
      .sort((a, b) => a.sequence - b.sequence)
      .map((leg) => ({ ...leg, safeHandoverProof: safeExternalUrl(leg.handover_proof) }))
  );

  function legTypeLabel(type) {
    const key = `logistics.legType.${type}`;
    return te(key) ? t(key) : type;
  }
  const money = (v) => Number(v).toLocaleString(undefined, { style: "currency", currency: "TRY" });
</script>
