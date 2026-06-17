<template>
  <div class="my-eca-view">
    <header class="my-eca-header">
      <div>
        <h1 class="my-eca-title">
          <AppIcon name="zap" :size="22" />
          {{ t("myEcaRules.title") }}
        </h1>
        <p class="my-eca-subtitle">
          {{ t("myEcaRules.subtitle") }}
        </p>
      </div>
      <button type="button" class="btn-primary" data-tour="mer-new" @click="goNew">
        <AppIcon name="plus" :size="16" />
        {{ t("myEcaRules.newRule") }}
      </button>
    </header>

    <div v-if="loading" class="my-eca-loading">{{ t("myEcaRules.loading") }}</div>

    <div v-else-if="!cards.length" class="my-eca-empty">
      <AppIcon name="zap" :size="40" />
      <h3>{{ t("myEcaRules.emptyTitle") }}</h3>
      <p>{{ t("myEcaRules.emptyText") }}</p>
      <button type="button" class="btn-primary" @click="goNew">
        {{ t("myEcaRules.writeFirstRule") }}
      </button>
    </div>

    <ul v-else class="rule-cards" data-tour="mer-table">
      <li
        v-for="card in cards"
        :key="card.name"
        class="rule-card"
        :class="{ 'is-off': !card.enabled }"
      >
        <div class="rule-icon">
          <AppIcon :name="card.icon" :size="18" />
        </div>

        <button type="button" class="rule-body" @click="goEdit(card)">
          <span class="rule-title">{{ card.title }}</span>
          <span class="rule-sentence">{{ card.sentence }}</span>
          <span class="rule-meta">{{ card.meta }}</span>
        </button>

        <label class="toggle" :title="card.enabled ? t('myEcaRules.on') : t('myEcaRules.off')">
          <input
            type="checkbox"
            :checked="card.enabled"
            @change="onToggle(card, $event.target.checked)"
          />
          <span class="toggle-slider"></span>
        </label>

        <button
          type="button"
          class="rule-delete"
          :aria-label="t('myEcaRules.delete')"
          :title="t('myEcaRules.delete')"
          @click="onDelete(card)"
        >
          <AppIcon name="trash-2" :size="16" />
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
  import { computed, onMounted } from "vue";
  import { useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import { useEcaRule } from "@/composables/useEcaRule";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();
  const router = useRouter();
  const { rules, loading, fetchMyRules, toggleRule, deleteRule } = useEcaRule();

  // Sayfa-içi onboarding: yeni-kural eylemi → kural listesi.
  usePageTour("my-eca-rules", () => [
    { target: '[data-tour="mer-new"]', title: t("tourSteps.page.merNew_t"), desc: t("tourSteps.page.merNew_d") },
    { target: '[data-tour="mer-table"]', title: t("tourSteps.page.merTable_t"), desc: t("tourSteps.page.merTable_d") },
  ]);

  // action_type → düz-dil eylem cümlesi + ikon eşlemesi.
  // discount_price/markup_price backend'de field_update'e derlendiği için
  // liste seviyesinde ayırt edilemez; jenerik "fiyat/alan güncelle" gösterilir.
  const ACTION_MAP = {
    field_update: { icon: "percent", key: "actUpdateField" },
    email: { icon: "mail", key: "actEmail" },
    reject_row: { icon: "ban", key: "actReject" },
    webhook: { icon: "webhook", key: "actWebhook" },
    create_document: { icon: "file-plus", key: "actCreateDoc" },
    custom_script: { icon: "code", key: "actScript" },
  };
  const DEFAULT_ACTION = { icon: "zap", key: "actGeneric" };

  function actionLabel(actionType) {
    const a = ACTION_MAP[actionType] || DEFAULT_ACTION;
    return { icon: a.icon, phrase: t(`myEcaRules.${a.key}`) };
  }

  function lastFiredMeta(rule) {
    if (rule.last_fired_at) {
      return t("myEcaRules.metaFired", {
        n: rule.total_fired_count || 0,
        date: formatDate(rule.last_fired_at),
      });
    }
    return rule.enabled ? t("myEcaRules.metaNeverFired") : t("myEcaRules.metaOff");
  }

  // Listeyi computed ile önceden formatla — template'te her render'da
  // fonksiyon çağırmamak için (büyük liste perf kuralı).
  const cards = computed(() =>
    rules.value.map((r) => {
      const action = actionLabel(r.action_type);
      return {
        name: r.name,
        enabled: !!r.enabled,
        icon: action.icon,
        title: r.rule_name || r.name,
        sentence: t("myEcaRules.sentence", { action: action.phrase }),
        meta: lastFiredMeta(r),
        raw: r,
      };
    }),
  );

  function goNew() {
    router.push("/my-eca-rules/new");
  }

  function goEdit(card) {
    router.push(`/my-eca-rules/${encodeURIComponent(card.name)}`);
  }

  async function onToggle(card, checked) {
    await toggleRule(card.name, checked);
  }

  async function onDelete(card) {
    if (!confirm(t("myEcaRules.deleteConfirm", { name: card.title }))) return;
    try {
      await deleteRule(card.name);
    } catch {
      /* toast composable tarafından gösterildi */
    }
  }

  function formatDate(dt) {
    if (!dt) return "";
    try {
      const d = new Date(dt.replace(" ", "T"));
      if (Number.isNaN(d.getTime())) return dt;
      return d.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dt;
    }
  }

  onMounted(() => fetchMyRules());
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "sass:color";

  .my-eca-view {
    max-width: 1000px;
    margin: 0 auto;
    padding: 24px 16px;
  }

  .my-eca-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .my-eca-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 22px;
    font-weight: 700;
    margin: 0;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .my-eca-subtitle {
    font-size: 13px;
    color: $l-text-500;
    margin: 4px 0 0;
    max-width: 640px;

    @include dark {
      color: $d-text-muted;
    }
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 14px;
    background: $brand;
    color: #fff;
    border: 0;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background $t-base;

    &:hover {
      background: color.adjust($brand, $lightness: -6%);
    }
  }

  .my-eca-loading {
    padding: 48px 16px;
    text-align: center;
    color: $l-text-500;
    font-size: 14px;
  }

  .my-eca-empty {
    padding: 48px 24px;
    text-align: center;
    border: 1px dashed $l-border;
    border-radius: 12px;
    background: $l-bg-subtle;
    color: $l-text-700;

    h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 12px 0 4px;
      color: $l-text-900;
    }

    p {
      font-size: 13px;
      color: $l-text-500;
      margin: 0 auto 16px;
      max-width: 460px;
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text;

      h3 {
        color: $d-text-hi;
      }

      p {
        color: $d-text-muted;
      }
    }
  }

  .rule-cards {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .rule-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    border: 1px solid $l-border;
    border-radius: 12px;
    background: $l-bg;
    transition: border-color $t-base;

    &:hover {
      border-color: $brand;
    }

    &.is-off {
      opacity: 0.65;
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  .rule-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 10px;
    background: rgba(124, 58, 237, 0.14);
    color: $brand;

    @include dark {
      color: $brand-light;
    }
  }

  .rule-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: start;
    background: transparent;
    border: 0;
    padding: 0;
    cursor: pointer;
    font: inherit;
  }

  .rule-title {
    font-size: 13.5px;
    font-weight: 600;
    color: $l-text-900;

    @include dark {
      color: $d-text-hi;
    }
  }

  .rule-sentence {
    font-size: 12px;
    color: $l-text-700;

    @include dark {
      color: $d-text;
    }
  }

  .rule-meta {
    font-size: 11px;
    color: $l-text-400;
    margin-top: 1px;

    @include dark {
      color: $d-text-faint;
    }
  }

  .rule-delete {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    background: transparent;
    border: 0;
    border-radius: 6px;
    color: $l-text-400;
    cursor: pointer;
    transition:
      color $t-base,
      background $t-base;

    &:hover {
      color: $c-error;
      background: rgba(239, 68, 68, 0.1);
    }
  }

  .toggle {
    display: inline-flex;
    position: relative;
    width: 40px;
    height: 22px;
    flex-shrink: 0;
    cursor: pointer;

    input {
      opacity: 0;
      width: 0;
      height: 0;
    }
  }

  .toggle-slider {
    position: absolute;
    inset: 0;
    background: #cbd5e1;
    border-radius: 999px;
    transition: background $t-base;

    &::before {
      content: "";
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      background: #fff;
      border-radius: 50%;
      transition: transform $t-base;
    }
  }

  .toggle input:checked + .toggle-slider {
    background: $c-success;

    &::before {
      transform: translateX(18px);
    }
  }
</style>
