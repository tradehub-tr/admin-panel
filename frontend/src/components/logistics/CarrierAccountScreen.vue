<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-lg font-semibold">{{ t("logistics.carrierAccount.title") }}</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ t("logistics.carrierAccount.subtitle") }}
        </p>
      </div>
      <button
        v-if="can.manage"
        type="button"
        class="ms-auto th-btn-primary text-sm"
        @click="$emit('create')"
      >
        {{ t("logistics.carrierAccount.new") }}
      </button>
    </header>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />
    <div v-else-if="loading" class="space-y-2" :aria-busy="true">
      <Skeleton v-for="i in 3" :key="i" variant="rect" height="128px" />
    </div>

    <EmptyState
      v-else-if="!rows.length"
      :filtered="false"
      :entity="t('logistics.carrierAccount.entity')"
    />

    <ul v-else class="space-y-3">
      <li v-for="row in rows" :key="row.name" class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-medium">{{ row.account_name }}</span>
          <StatusBadge
            :status="row.is_active ? 'active' : 'passive'"
            :tone="row.is_active ? 'success' : 'neutral'"
            :label="row.is_active ? t('logistics.catalog.active') : t('logistics.catalog.passive')"
            :show-dot="false"
          />
          <!-- Sandbox/production ayrımı gözden kaçarsa test siparişi
               gerçek kargoya düşer. Bu yüzden rozet, dipnot değil. -->
          <StatusBadge
            :status="row.environment"
            :tone="row.environment === 'production' ? 'warning' : 'info'"
            :label="t(`logistics.environment.${row.environment}`)"
            :show-dot="false"
          />
          <span v-if="row.is_default" class="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
            {{ t("logistics.carrierAccount.default") }}
          </span>
          <span class="text-xs text-slate-500">
            {{ row.is_platform_account ? t("logistics.carrierAccount.platform") : row.seller_profile }}
          </span>
        </div>

        <p v-if="row.base_url" class="mt-1 font-mono text-xs text-slate-500">{{ row.base_url }}</p>

        <!-- KİMLİK BİLGİSİ SINIRI: yanıt gizli DEĞER taşımıyor, yalnız
             "tanımlı mı" bayrağı. Maskeli bir değer bile yanıt gövdesinde,
             tarayıcı geçmişinde ve ara sunucu loglarında dolaşırdı. -->
        <div class="mt-3 flex flex-wrap gap-2">
          <div
            v-for="secret in SECRET_FIELDS"
            :key="secret"
            class="flex items-center gap-2 rounded border px-2 py-1 text-xs"
            :class="row[`has_${secret}`]
              ? 'border-slate-200 dark:border-slate-700'
              : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'"
          >
            <code>{{ secret }}</code>
            <span v-if="row[`has_${secret}`]" class="font-mono tracking-widest">•••••</span>
            <span v-else class="text-amber-700 dark:text-amber-400">{{ t("logistics.carrierAccount.notSet") }}</span>

            <!-- Değeri görmek AYRI bir eylem, ayrı bir yetki ve denetim
                 kaydı bırakıyor (reveal_carrier_secret). -->
            <button
              v-if="row[`has_${secret}`] && can.viewSecret"
              type="button"
              class="underline underline-offset-2"
              @click="$emit('reveal', { name: row.name, field: secret })"
            >
              {{ t("logistics.carrierAccount.reveal") }}
            </button>
          </div>
        </div>

        <p v-if="row.token_expiry" class="mt-2 text-xs" :class="tokenExpiryClass(row)">
          {{ t("logistics.carrierAccount.tokenExpiry", { at: row.token_expiry }) }}
        </p>

        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" class="th-btn-outline text-xs" @click="$emit('test', row)">
            {{ t("logistics.carrierAccount.test") }}
          </button>
          <button v-if="can.manage" type="button" class="th-btn-outline text-xs" @click="$emit('edit', row)">
            {{ t("logistics.legOps.edit") }}
          </button>
        </div>
      </li>
    </ul>

    <p class="text-xs text-slate-500 dark:text-slate-400">
      {{ t("logistics.carrierAccount.auditNote") }}
    </p>
  </div>
</template>

<script setup>
  import { useI18n } from "vue-i18n";

  import Skeleton from "@/components/common/Skeleton.vue";

  import EmptyState from "./EmptyState.vue";
  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";

  /**
   * **F1 · Taşıyıcı hesapları** (TUR-110, TUR-111).
   *
   * Faz B'de yazılan gizli bilgi sözleşmesinin görünen yüzü: liste ve detay
   * yanıtları gizli DEĞER taşımaz, yalnız `has_<alan>` bayrağı taşır. Ekran
   * "••••• (tanımlı)" gösterip üzerine yazmayı teklif eder; okumak isteyen
   * ayrı bir eylemle, `view.carrier_secret` yetkisiyle ve denetim kaydı
   * bırakarak ister.
   */
  const props = defineProps({
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    /** `manage` = carrier_credential.manage, `viewSecret` = view.carrier_secret */
    can: { type: Object, default: () => ({ read: true, manage: false, viewSecret: false }) },
    /** "Şu an" — token süresi kontrolü için (test edilebilirlik). */
    now: { type: String, default: "" },
  });

  defineEmits(["create", "edit", "test", "reveal", "retry"]);

  const { t } = useI18n();

  /** `logistics_admin.py` SECRET_FIELDS ile aynı sıra ve içerik. */
  const SECRET_FIELDS = ["api_key", "api_secret", "webhook_secret", "access_token"];

  function tokenExpiryClass(row) {
    if (!props.now || !row.token_expiry) return "text-slate-500";
    return row.token_expiry < props.now
      ? "font-medium text-red-600 dark:text-red-400"
      : "text-slate-500";
  }
</script>
