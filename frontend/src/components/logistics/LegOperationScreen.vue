<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("logistics.legOps.title") }}
        </h1>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          {{ t("logistics.legOps.subtitle", { shipment: shipmentName }) }}
        </p>
      </div>
      <button
        v-if="can.write"
        type="button"
        class="ms-auto hdr-btn-outlined text-sm"
        @click="$emit('add-leg')"
      >
        {{ t("logistics.legOps.addLeg") }}
      </button>
    </header>

    <!-- Zincir bütünlüğü: bir bacağın varışı sonrakinin çıkışı olmalı.
         Kopukluk operasyonda "paket nerede kayboldu" sorusunun cevabı. -->
    <div
      v-if="chainBreaks.length"
      class="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
      role="alert"
    >
      {{ t("logistics.legOps.chainBreak", { sequences: chainBreaks.join(", ") }) }}
    </div>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <p
      v-else-if="!ordered.length"
      class="rounded-lg border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500 dark:border-gray-600"
    >
      {{ t("logistics.leg.empty") }}
    </p>

    <ol v-else class="space-y-3">
      <li
        v-for="leg in ordered"
        :key="leg.sequence"
        class="rounded-lg border p-4"
        :class="
          leg.status === 'Cancelled'
            ? 'border-gray-200 opacity-60 dark:border-gray-700'
            : 'border-gray-200 dark:border-gray-700'
        "
      >
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold dark:bg-gray-700">
            {{ leg.sequence }}
          </span>
          <span class="text-sm font-medium">{{ legTypeLabel(leg.leg_type) }}</span>
          <StatusBadge :status="leg.status" kind="leg" :show-dot="false" />
          <span v-if="leg.carrier" class="text-xs text-gray-500 dark:text-gray-400">{{
            leg.carrier
          }}</span>
          <span v-if="leg.vehicle_type" class="text-xs text-gray-500 dark:text-gray-400"
            >· {{ leg.vehicle_type }}</span
          >

          <div v-if="can.write" class="ms-auto flex gap-2">
            <button type="button" class="hdr-btn-outlined text-xs" @click="$emit('edit-leg', leg)">
              {{ t("logistics.legOps.edit") }}
            </button>
            <button
              v-if="leg.status === 'Planned' || leg.status === 'In Progress'"
              type="button"
              class="hdr-btn-primary text-xs"
              @click="$emit('advance-leg', leg)"
            >
              {{ t("logistics.legOps.advance") }}
            </button>
          </div>
        </div>

        <div class="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div class="rounded border border-gray-100 p-2 dark:border-gray-800">
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ t("logistics.leg.origin") }}</p>
            <p :class="leg.origin_branch ? '' : 'text-gray-500 dark:text-gray-400'">
              {{ leg.origin_branch || t("logistics.legOps.notSet") }}
            </p>
          </div>
          <div class="rounded border border-gray-100 p-2 dark:border-gray-800">
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ t("logistics.leg.destination") }}
            </p>
            <p :class="leg.destination_branch ? '' : 'text-gray-500 dark:text-gray-400'">
              {{ leg.destination_branch || t("logistics.legOps.notSet") }}
            </p>
          </div>
        </div>

        <!-- TUR-109: "devir noktası ve sorumluluk geçişi kayıt altındadır."
             Kargoya devir yapılmış ama kanıtı yoksa bu bir boşluk. -->
        <div
          v-if="leg.handover_point"
          class="mt-3 rounded px-3 py-2 text-sm"
          :class="
            leg.handover_proof
              ? 'bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300'
              : 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
          "
        >
          <span class="font-medium">{{ t("logistics.leg.handover") }}:</span>
          {{ leg.handover_point }}
          <a
            v-if="leg.safeHandoverProof"
            :href="leg.safeHandoverProof"
            class="ms-2 underline"
            target="_blank"
            rel="noopener"
          >
            {{ t("logistics.leg.proof") }}
          </a>
          <span v-else class="ms-2">— {{ t("logistics.legOps.proofMissing") }}</span>
        </div>

        <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span v-if="leg.started_at"
            >{{ t("logistics.legOps.started") }}: {{ leg.started_at }}</span
          >
          <span v-if="leg.completed_at"
            >{{ t("logistics.legOps.completed") }}: {{ leg.completed_at }}</span
          >
          <!-- G0/K1 maliyet kapısı: B7/B8'de kapatılmıştı, burada AÇIK
               kalmıştı — yetkisiz operatör bacak maliyetini ve toplamı
               görüyordu (güvenlik denetimi 2026-08-24). -->
          <span v-if="can.viewCost && leg.cost != null" class="ms-auto tabular-nums">
            {{ formatTry(leg.cost) }}
          </span>
        </div>
      </li>
    </ol>

    <p v-if="ordered.length && can.viewCost" class="text-end text-sm">
      <span class="text-gray-500 dark:text-gray-400">{{ t("logistics.legOps.totalCost") }}: </span>
      <strong class="tabular-nums">{{ formatTry(totalCost) }}</strong>
    </p>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";
  import { formatTry } from "@/utils/format";
  import { safeExternalUrl } from "@/utils/sanitize";

  /**
   * **E1 · Bacak operasyon ekranı** (TUR-109).
   *
   * Detay sayfasındaki bacak SEKMESİNDEN farkı: bu ekran bacakları
   * DÜZENLEMEK için. Zincir bütünlüğünü de denetliyor — bir bacağın varış
   * şubesi sonrakinin çıkışı değilse operasyon bunu görmeli; aksi hâlde
   * "paket nerede" sorusu ancak müşteri arayınca sorulur.
   *
   * 2026-08-25: prototip olmasına rağmen panel diline çevrildi (`slate-*` →
   * `gray-*`, `th-btn-*` → `hdr-btn-*`, panel başlık hiyerarşisi).
   * `base.scss`in Tailwind dark override'ları yalnız `gray-*` ölçeğini
   * kapsıyor — `slate-*` kapsam dışıydı ve `text-slate-400` (beyazda 2.61:1)
   * ile dark karşılığı olmayan `text-slate-500` okunmaz kalıyordu
   * (WCAG 1.4.3). `styleLanguage.test.js` LEGACY listesinden düşürüldü.
   */
  const props = defineProps({
    shipmentName: { type: String, required: true },
    legs: { type: Array, default: () => [] },
    error: { type: Object, default: null },
    /**
     * `viewCost` FAIL-CLOSED: varsayılanda kapalı. Maliyet asimetrisi
     * (G0/K1) yalnız yetkili gözde açılır; varsayılanı `true` yapmak
     * container yeni bayrağı geçirmeyi unuttuğunda sızıntı üretirdi.
     */
    can: { type: Object, default: () => ({ read: true, write: false, viewCost: false }) },
  });

  defineEmits(["add-leg", "edit-leg", "advance-leg", "retry"]);

  const { t, te } = useI18n();

  // Şema denetimi TEK yerde: `v-if` ile `:href` aynı değeri okusun
  // (ShipmentLegsTab/ShipmentDocumentsTab emsali) ve template'ten fonksiyon
  // çağrısı kalksın (vue-reactivity.md §2).
  const ordered = computed(() =>
    [...props.legs]
      .sort((a, b) => a.sequence - b.sequence)
      .map((leg) => ({ ...leg, safeHandoverProof: safeExternalUrl(leg.handover_proof) }))
  );

  /**
   * İptal edilmiş bacaklar zincirden çıkarılıyor — iptal edilmiş bir
   * aktarma zinciri kırmaz, atlanır.
   */
  const chainBreaks = computed(() => {
    const active = ordered.value.filter((leg) => leg.status !== "Cancelled");
    const breaks = [];
    for (let i = 1; i < active.length; i += 1) {
      const previous = active[i - 1];
      const current = active[i];
      if (!previous.destination_branch || !current.origin_branch) continue;
      if (previous.destination_branch !== current.origin_branch) breaks.push(current.sequence);
    }
    return breaks;
  });

  /**
   * Toplam, EKSİK veriyle hesaplanmıyor.
   *
   * `Number(leg.cost ?? 0)` maskelenmiş (null) bacağı 0 sayıyor ve gerçek
   * olmayan bir toplam üretiyordu — operasyon onu "toplam maliyet" diye
   * okuyordu. En az bir bacağın maliyeti bilinmiyorsa toplam da bilinmiyor:
   * `null` dönüyor, `formatTry` onu "—" basıyor.
   */
  const totalCost = computed(() => {
    if (ordered.value.some((leg) => leg.cost == null)) return null;
    return ordered.value.reduce((sum, leg) => sum + Number(leg.cost ?? 0), 0);
  });

  function legTypeLabel(type) {
    const key = `logistics.legType.${type}`;
    return te(key) ? t(key) : type;
  }
</script>
