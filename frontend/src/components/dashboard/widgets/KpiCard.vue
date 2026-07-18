<template>
  <div class="th-widget kpi-card" :class="sizeClass">
    <div class="kpi-top flex items-center justify-between">
      <div class="flex-1 min-w-0">
        <p
          class="kpi-title text-xs font-medium uppercase tracking-wide"
          style="color: var(--th-neutral)"
        >
          {{ title }}
        </p>
        <p
          v-if="masked"
          class="th-kpi-value mt-1 select-none"
          style="filter: blur(6px); opacity: 0.4"
        >
          {{ value }}
        </p>
        <p v-else class="th-kpi-value mt-1">{{ formattedValue }}</p>
      </div>
      <div
        v-if="icon"
        class="kpi-icon w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        :class="iconBgClass"
      >
        <i :class="[icon, iconColorClass, 'text-lg']"></i>
      </div>
    </div>

    <!-- Footer — E-1 sabit iskelet: delta / link / boş fark etmeksizin her kartta
         yer tutar; kartlar satır ve grid genelinde eşit yükseklikte kalır. -->
    <div
      class="kpi-foot flex items-center gap-2 mt-3 pt-3 border-t"
      style="border-color: var(--th-surface-border)"
    >
      <template v-if="hasChange">
        <span class="th-kpi-change" :class="changeClass">
          <i :class="changeIcon" class="text-[8px]"></i>
          {{ changeDisplay }}
        </span>
        <span class="kpi-change-label text-[11px]" style="color: var(--th-neutral)">{{
          changeLabel || t("kpiCard.defaultChangeLabel")
        }}</span>
      </template>
      <slot name="sparkline" />
    </div>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  const { t } = useI18n();

  const props = defineProps({
    /** KPI title */
    title: { type: String, required: true },
    /** KPI raw value */
    value: { type: [String, Number], required: true },
    /** Font Awesome icon class */
    icon: { type: String, default: "" },
    /** Icon background Tailwind class */
    iconBg: { type: String, default: "bg-brand-50" },
    /** Icon color Tailwind class */
    iconColor: { type: String, default: "text-brand-700" },
    /** Change value (percentage or absolute) */
    change: { type: [String, Number], default: null },
    /** Whether change is positive */
    changePositive: { type: Boolean, default: true },
    /** Change label suffix */
    changeLabel: { type: String, default: "" },
    /** Format value as currency (TRY) */
    currency: { type: Boolean, default: false },
    /** Widget grid size */
    size: { type: String, default: "sm" },
    /** Whether the value is masked (insufficient permissions) */
    masked: { type: Boolean, default: false },
  });

  const formattedValue = computed(() => {
    if (typeof props.value === "string") return props.value;
    if (props.currency) {
      return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(props.value);
    }
    return new Intl.NumberFormat("tr-TR").format(props.value);
  });

  const hasChange = computed(() => props.change !== null && props.change !== undefined);

  const changeDisplay = computed(() => {
    if (typeof props.change === "string") return props.change;
    return `${props.change}%`;
  });

  const changeClass = computed(() => (props.changePositive ? "positive" : "negative"));

  const changeIcon = computed(() =>
    props.changePositive ? "fas fa-arrow-up" : "fas fa-arrow-down"
  );

  const iconBgClass = computed(() => props.iconBg);
  const iconColorClass = computed(() => props.iconColor);

  const sizeClass = computed(() => {
    const map = {
      sm: "th-widget-sm",
      md: "th-widget-md",
      lg: "th-widget-lg",
    };
    return map[props.size] || "th-widget-sm";
  });
</script>
