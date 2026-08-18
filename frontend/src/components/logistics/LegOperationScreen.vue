<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-lg font-semibold">{{ t("logistics.legOps.title") }}</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ t("logistics.legOps.subtitle", { shipment: shipmentName }) }}
        </p>
      </div>
      <button
        v-if="can.write"
        type="button"
        class="ms-auto th-btn-outline text-sm"
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
      class="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-600"
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
            ? 'border-slate-200 opacity-60 dark:border-slate-700'
            : 'border-slate-200 dark:border-slate-700'
        "
      >
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold dark:bg-slate-700">
            {{ leg.sequence }}
          </span>
          <span class="text-sm font-medium">{{ legTypeLabel(leg.leg_type) }}</span>
          <StatusBadge :status="leg.status" kind="leg" :show-dot="false" />
          <span v-if="leg.carrier" class="text-xs text-slate-500">{{ leg.carrier }}</span>
          <span v-if="leg.vehicle_type" class="text-xs text-slate-500"
            >· {{ leg.vehicle_type }}</span
          >

          <div v-if="can.write" class="ms-auto flex gap-2">
            <button type="button" class="th-btn-outline text-xs" @click="$emit('edit-leg', leg)">
              {{ t("logistics.legOps.edit") }}
            </button>
            <button
              v-if="leg.status === 'Planned' || leg.status === 'In Progress'"
              type="button"
              class="th-btn-dark text-xs"
              @click="$emit('advance-leg', leg)"
            >
              {{ t("logistics.legOps.advance") }}
            </button>
          </div>
        </div>

        <div class="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div class="rounded border border-slate-100 p-2 dark:border-slate-800">
            <p class="text-xs text-slate-500">{{ t("logistics.leg.origin") }}</p>
            <p :class="leg.origin_branch ? '' : 'text-slate-400'">
              {{ leg.origin_branch || t("logistics.legOps.notSet") }}
            </p>
          </div>
          <div class="rounded border border-slate-100 p-2 dark:border-slate-800">
            <p class="text-xs text-slate-500">{{ t("logistics.leg.destination") }}</p>
            <p :class="leg.destination_branch ? '' : 'text-slate-400'">
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
            v-if="safeExternalUrl(leg.handover_proof)"
            :href="safeExternalUrl(leg.handover_proof)"
            class="ms-2 underline"
            target="_blank"
            rel="noopener"
          >
            {{ t("logistics.leg.proof") }}
          </a>
          <span v-else class="ms-2">— {{ t("logistics.legOps.proofMissing") }}</span>
        </div>

        <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span v-if="leg.started_at"
            >{{ t("logistics.legOps.started") }}: {{ leg.started_at }}</span
          >
          <span v-if="leg.completed_at"
            >{{ t("logistics.legOps.completed") }}: {{ leg.completed_at }}</span
          >
          <span v-if="leg.cost != null" class="ms-auto tabular-nums">{{ money(leg.cost) }}</span>
        </div>
      </li>
    </ol>

    <p v-if="ordered.length" class="text-end text-sm">
      <span class="text-slate-500">{{ t("logistics.legOps.totalCost") }}: </span>
      <strong class="tabular-nums">{{ money(totalCost) }}</strong>
    </p>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";
  import { safeExternalUrl } from "@/utils/sanitize";

  /**
   * **E1 · Bacak operasyon ekranı** (TUR-109).
   *
   * Detay sayfasındaki bacak SEKMESİNDEN farkı: bu ekran bacakları
   * DÜZENLEMEK için. Zincir bütünlüğünü de denetliyor — bir bacağın varış
   * şubesi sonrakinin çıkışı değilse operasyon bunu görmeli; aksi hâlde
   * "paket nerede" sorusu ancak müşteri arayınca sorulur.
   */
  const props = defineProps({
    shipmentName: { type: String, required: true },
    legs: { type: Array, default: () => [] },
    error: { type: Object, default: null },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  defineEmits(["add-leg", "edit-leg", "advance-leg", "retry"]);

  const { t, te } = useI18n();

  const ordered = computed(() => [...props.legs].sort((a, b) => a.sequence - b.sequence));

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

  const totalCost = computed(() =>
    ordered.value.reduce((sum, leg) => sum + Number(leg.cost ?? 0), 0)
  );

  function legTypeLabel(type) {
    const key = `logistics.legType.${type}`;
    return te(key) ? t(key) : type;
  }

  const money = (v) => Number(v).toLocaleString(undefined, { style: "currency", currency: "TRY" });
</script>
