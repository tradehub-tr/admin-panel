<template>
  <div class="space-y-4">
    <header>
      <h1 class="text-lg font-semibold">{{ t("logistics.notifyPref.title") }}</h1>
      <p class="text-xs text-slate-500 dark:text-slate-400">{{ t("logistics.notifyPref.subtitle") }}</p>
    </header>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <template v-else>
      <p v-if="mandatoryCount" class="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {{ t("logistics.notifyPref.mandatoryNote", { count: mandatoryCount }) }}
      </p>

      <section v-for="group in grouped" :key="group.role" class="space-y-2">
        <h2 class="text-sm font-semibold">{{ t(`logistics.recipient.${group.role}`) }}</h2>

        <ul class="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          <li v-for="pref in group.items" :key="`${pref.template}`" class="flex flex-wrap items-center gap-3 p-3">
            <div class="min-w-0 grow">
              <p class="text-sm font-medium">{{ eventLabel(pref.event) }}</p>
              <p class="text-xs text-slate-500">{{ t(`logistics.channel.${pref.channel}`) }}</p>
              <!-- Kilidin GEREKÇESİ gösteriliyor. Devre dışı bir anahtar,
                   nedeni yazmazsa "bozuk" görünür. -->
              <p v-if="pref.is_mandatory" class="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                {{ pref.locked_reason || t("logistics.notifyPref.lockedDefault") }}
              </p>
            </div>

            <!-- TUR-113 kabul kriteri: zorunlu operasyon bildirimleri
                 kullanıcı tercihiyle KAPATILAMAZ. Anahtar devre dışı ve
                 daima açık — `enabled` değeri gönderilmiyor bile. -->
            <BaseSwitch
              :model-value="pref.is_mandatory ? 1 : pref.enabled ? 1 : 0"
              :on-value="1"
              :off-value="0"
              :disabled="pref.is_mandatory || !can.write"
              :aria-describedby="pref.is_mandatory ? `locked-${pref.template}` : undefined"
              @update:model-value="onToggle(pref, $event)"
            />
            <span v-if="pref.is_mandatory" :id="`locked-${pref.template}`" class="sr-only">
              {{ t("logistics.notifyPref.lockedSr") }}
            </span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import BaseSwitch from "@/components/common/BaseSwitch.vue";

  import ErrorState from "./ErrorState.vue";

  /**
   * **J2 · Bildirim tercihi yönetimi** (TUR-113).
   *
   * TUR-113 kabul kriteri: *"Zorunlu operasyon bildirimleri kullanıcı
   * tercihiyle kapatılamaz."* Bu bir arayüz nezaketi değil, veri kısıtı —
   * zorunlu satırda anahtar devre dışı ve `toggle` olayı hiç yayılmıyor.
   * Backend de aynı kısıtı uygulamalı; iki taraf birden korumazsa API'ye
   * doğrudan istek atan biri kapatabilir.
   */
  const props = defineProps({
    /** `notification_preference` sözleşmesindeki satırlar. */
    rows: { type: Array, default: () => [] },
    error: { type: Object, default: null },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  const emit = defineEmits(["toggle", "retry"]);

  const { t, te } = useI18n();

  const ROLE_ORDER = ["operations", "seller", "buyer"];

  const grouped = computed(() =>
    ROLE_ORDER.map((role) => ({
      role,
      items: props.rows.filter((row) => row.recipient_role === role),
    })).filter((group) => group.items.length)
  );

  const mandatoryCount = computed(() => props.rows.filter((row) => row.is_mandatory).length);

  function onToggle(pref, value) {
    // Zorunlu tercih değiştirilemez — olay hiç yayılmıyor ki container
    // yanlışlıkla bir istek göndermesin.
    if (pref.is_mandatory) return;
    emit("toggle", { template: pref.template, enabled: Boolean(value) });
  }

  function eventLabel(event) {
    const key = `logistics.notifyEvent.${event}`;
    return te(key) ? t(key) : event;
  }
</script>
