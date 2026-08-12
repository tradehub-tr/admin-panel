<template>
  <div class="space-y-4">
    <header>
      <h1 class="text-lg font-semibold">{{ t("logistics.legTimeline.title") }}</h1>
      <p class="text-xs text-slate-500 dark:text-slate-400">
        {{ t("logistics.legTimeline.subtitle") }}
      </p>
    </header>

    <p v-if="!ordered.length" class="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-600">
      {{ t("logistics.leg.empty") }}
    </p>

    <template v-else>
      <!-- Yatay şerit: bacak süreleri ORANTILI. Eşit genişlikte kutular
           "hangi bacak zaman yiyor" sorusunu gizlerdi — TUR-109'da
           sorumluluk geçişinin ne zaman olduğu asıl bilgi. -->
      <div class="overflow-x-auto">
        <div class="flex min-w-[640px] items-stretch gap-1">
          <div
            v-for="segment in segments"
            :key="segment.sequence"
            class="min-w-24 rounded-lg border p-3"
            :class="segment.tone"
            :style="{ flexGrow: segment.weight }"
          >
            <p class="text-xs font-semibold">{{ segment.label }}</p>
            <p class="mt-1 text-xs text-slate-600 dark:text-slate-300">{{ segment.route }}</p>
            <p class="mt-1 text-xs tabular-nums text-slate-500">{{ segment.durationLabel }}</p>
          </div>
        </div>
      </div>

      <!-- Sorumluluk geçiş noktaları ayrı ve açık: kim ne zaman devraldı.
           Zarar tazmininde tek referans bu. -->
      <section class="space-y-2">
        <h2 class="text-sm font-semibold">{{ t("logistics.legTimeline.handovers") }}</h2>
        <ul v-if="handovers.length" class="space-y-2">
          <li
            v-for="handover in handovers"
            :key="handover.sequence"
            class="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700"
          >
            <span class="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold dark:bg-slate-700">
              {{ handover.sequence }}
            </span>
            <span>{{ handover.from }} <span aria-hidden="true">→</span> {{ handover.to }}</span>
            <span class="text-xs text-slate-500">{{ handover.point }}</span>
            <span class="text-xs text-slate-500">{{ handover.at }}</span>
            <a
              v-if="handover.proof"
              :href="handover.proof"
              class="ms-auto th-btn-outline text-xs"
              target="_blank"
              rel="noopener"
            >
              {{ t("logistics.leg.proof") }}
            </a>
            <span v-else class="ms-auto text-xs text-amber-600 dark:text-amber-400">
              {{ t("logistics.legOps.proofMissing") }}
            </span>
          </li>
        </ul>
        <p v-else class="text-sm text-slate-500">{{ t("logistics.legTimeline.noHandover") }}</p>
      </section>
    </template>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import { LEG_STATUS_TONE, TONE_CLASSES } from "./constants";

  /**
   * **E2 · Bacak zaman çizelgesi** (TUR-109, TUR-115).
   *
   * Bacakların SÜRESİNİ orantılı gösteriyor: hangi bacağın zaman yediği
   * ancak böyle görünür. Sorumluluk geçişleri ayrı bir listede — zarar
   * tazmininde "paket kimdeyken bozuldu" sorusunun tek referansı bu.
   */
  const props = defineProps({
    legs: { type: Array, default: () => [] },
  });

  const { t, te } = useI18n();

  const ordered = computed(() => [...props.legs].sort((a, b) => a.sequence - b.sequence));

  function durationHours(leg) {
    if (!leg.started_at || !leg.completed_at) return null;
    const start = new Date(String(leg.started_at).replace(" ", "T"));
    const end = new Date(String(leg.completed_at).replace(" ", "T"));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return (end - start) / 3_600_000;
  }

  const segments = computed(() =>
    ordered.value.map((leg) => {
      const hours = durationHours(leg);
      return {
        sequence: leg.sequence,
        label: te(`logistics.legType.${leg.leg_type}`)
          ? t(`logistics.legType.${leg.leg_type}`)
          : leg.leg_type,
        route: `${leg.origin_branch || "—"} → ${leg.destination_branch || "—"}`,
        // Süresi bilinmeyen bacak da görünsün diye taban ağırlık 1;
        // tamamlanmamış bacağı çizelgeden silmek onu unutturur.
        weight: hours == null ? 1 : Math.max(1, Math.round(hours)),
        durationLabel:
          hours == null
            ? t("logistics.legTimeline.ongoing")
            : t("logistics.legTimeline.hours", { count: hours.toFixed(1) }),
        tone: TONE_CLASSES[LEG_STATUS_TONE[leg.status] ?? "neutral"].badge,
      };
    })
  );

  const handovers = computed(() =>
    ordered.value
      .filter((leg) => leg.handover_point)
      .map((leg, index, list) => ({
        sequence: leg.sequence,
        from: index === 0 ? t("logistics.legTimeline.seller") : list[index - 1].carrier || "—",
        to: leg.carrier || "—",
        point: leg.handover_point,
        at: leg.started_at || "—",
        proof: leg.handover_proof,
      }))
  );
</script>
