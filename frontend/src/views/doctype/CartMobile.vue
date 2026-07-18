<template>
  <div class="cm">
    <!-- Durum + sahip kartı -->
    <div class="cm-card cm-head">
      <div class="cm-head-top">
        <span class="cm-status" :class="`is-${statusTone}`">{{ statusLabel }}</span>
        <span class="cm-date">{{ fmtDateTime(docData.modified) }}</span>
      </div>
      <div class="cm-owner">
        <span class="cm-owner-ic"><AppIcon name="user" :size="16" /></span>
        <span class="cm-owner-main">
          <span>{{ t("cartMobile.owner") }}</span>
          <b>{{ docData.buyer || "—" }}</b>
        </span>
      </div>
      <p class="cm-hint">{{ t("cartMobile.hint") }}</p>
    </div>

    <!-- Ürün kalemleri -->
    <div class="cm-items-head">
      <p class="cm-sec-title">{{ t("cartMobile.items") }}</p>
      <span class="cm-count">{{ items.length }}</span>
    </div>
    <div v-if="!items.length" class="cm-card cm-empty">
      {{ t("cartMobile.emptyItems") }}
    </div>
    <div v-for="(item, idx) in items" :key="item.name || idx" class="cm-card cm-item">
      <img
        v-if="safeUrl(item.snapshot_image)"
        :src="safeUrl(item.snapshot_image)"
        alt=""
        class="cm-item-img"
      />
      <span v-else class="cm-item-ph"><AppIcon name="package" :size="18" /></span>
      <span class="cm-item-main">
        <b>{{ item.snapshot_title || item.listing || "—" }}</b>
        <span v-if="itemVariant(item)" class="cm-item-var">{{ itemVariant(item) }}</span>
        <span v-if="item.seller" class="cm-item-seller">{{ item.seller }}</span>
        <span v-if="item.is_sample" class="cm-chip">{{ t("cartMobile.sample") }}</span>
      </span>
      <span class="cm-item-price">
        <span v-if="canEdit" class="cm-qty">
          <button
            type="button"
            class="cm-qty-btn"
            :disabled="(item.quantity || 0) <= 1"
            :aria-label="t('cartMobile.decreaseQty')"
            @click="emit('update-qty', idx, (item.quantity || 1) - 1)"
          >
            <AppIcon name="minus" :size="12" />
          </button>
          <b>{{ item.quantity || 0 }}</b>
          <button
            type="button"
            class="cm-qty-btn"
            :aria-label="t('cartMobile.increaseQty')"
            @click="emit('update-qty', idx, (item.quantity || 0) + 1)"
          >
            <AppIcon name="plus" :size="12" />
          </button>
        </span>
        <span v-else>{{ item.quantity || 0 }} {{ t("cartMobile.qtyUnit") }}</span>
        <b v-if="item.snapshot_price">{{
          fmtMoney(item.snapshot_price, item.snapshot_currency)
        }}</b>
      </span>
      <button
        v-if="canEdit"
        type="button"
        class="cm-item-del"
        :aria-label="t('docTypeForm.deleteRow')"
        @click="emit('remove-item', idx)"
      >
        <AppIcon name="trash-2" :size="14" />
      </button>
    </div>
    <p v-if="canEdit && items.length" class="cm-save-hint">{{ t("cartMobile.saveHint") }}</p>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";

  const props = defineProps({
    formData: { type: Object, required: true },
    docData: { type: Object, required: true },
    // Parent'ın childTableData.items dizisi — düzenlemeler oradan kaydedilir
    items: { type: Array, default: () => [] },
    canEdit: { type: Boolean, default: false },
  });

  const emit = defineEmits(["update-qty", "remove-item"]);

  const { t } = useI18n();

  const status = computed(() => props.docData.status || props.formData.status || "");
  const statusTone = computed(() => (status.value === "Active" ? "ok" : "neutral"));
  const statusLabel = computed(() =>
    status.value === "Active"
      ? t("docTypeList.statusActive")
      : status.value === "Archived"
        ? t("docTypeList.statusArchived")
        : status.value || "—"
  );

  // Yalnızca site-içi veya https görselleri kabul et (JS/data URI injection koruması)
  function safeUrl(v) {
    const u = String(v || "");
    return /^(https?:\/\/|\/)/.test(u) && !u.startsWith("//") ? u : "";
  }

  function itemVariant(item) {
    return [item.variant_label || item.listing_variant, item.color_variant]
      .filter(Boolean)
      .join(" · ");
  }

  function fmtMoney(v, currency) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "";
    return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || "TRY"}`;
  }

  function fmtDateTime(dt) {
    if (!dt) return "";
    return new Date(dt).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .cm {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .cm-card {
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 12px;
    padding: 14px;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  .cm-head-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .cm-status {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 999px;

    &.is-ok {
      color: $c-success;
      background: rgba($c-success, 0.12);
    }

    &.is-neutral {
      color: $l-text-500;
      background: rgba($l-text-500, 0.12);

      @include dark {
        color: $d-text-muted;
        background: rgba(255, 255, 255, 0.08);
      }
    }
  }

  .cm-date {
    font-size: 11px;
    color: $l-text-400;

    @include dark {
      color: $d-text-faint;
    }
  }

  .cm-owner {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .cm-owner-ic {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: $brand;
    background: rgba($brand, 0.1);
  }

  .cm-owner-main {
    display: flex;
    flex-direction: column;
    min-width: 0;

    span {
      font-size: 11px;
      color: $l-text-400;

      @include dark {
        color: $d-text-faint;
      }
    }

    b {
      font-size: 13px;
      font-weight: 700;
      color: $l-text-900;
      overflow-wrap: anywhere;

      @include dark {
        color: $d-text-hi;
      }
    }
  }

  .cm-hint {
    margin-top: 10px;
    font-size: 11px;
    line-height: 1.5;
    color: $l-text-400;

    @include dark {
      color: $d-text-faint;
    }
  }

  .cm-items-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }

  .cm-sec-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  .cm-count {
    font-size: 11px;
    font-weight: 700;
    padding: 1px 8px;
    border-radius: 999px;
    color: $brand;
    background: rgba($brand, 0.1);
  }

  .cm-empty {
    text-align: center;
    font-size: 12px;
    color: $l-text-400;

    @include dark {
      color: $d-text-faint;
    }
  }

  .cm-item {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .cm-item-img,
  .cm-item-ph {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    flex-shrink: 0;
    object-fit: cover;
  }

  .cm-item-ph {
    display: flex;
    align-items: center;
    justify-content: center;
    color: $l-text-400;
    background: $l-bg-muted;

    @include dark {
      color: $d-text-faint;
      background: $d-bg-elevated;
    }
  }

  .cm-item-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;

    b {
      font-size: 13px;
      font-weight: 700;
      color: $l-text-900;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      @include dark {
        color: $d-text-hi;
      }
    }
  }

  .cm-item-var,
  .cm-item-seller {
    font-size: 11px;
    color: $l-text-400;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @include dark {
      color: $d-text-faint;
    }
  }

  .cm-chip {
    align-self: flex-start;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 7px;
    border-radius: 999px;
    color: $c-warning;
    background: rgba($c-warning, 0.12);
  }

  .cm-qty {
    display: flex;
    align-items: center;
    gap: 6px;

    b {
      min-width: 22px;
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      color: $l-text-900;

      @include dark {
        color: $d-text-hi;
      }
    }
  }

  .cm-qty-btn {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: $l-text-700;
    background: $l-bg-muted;
    border: 1px solid $l-border;
    transition: background $t-fast;

    &:disabled {
      opacity: 0.35;
    }

    @include dark {
      color: $d-text;
      background: $d-bg-elevated;
      border-color: $d-border;
    }
  }

  .cm-item-del {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: $c-error;
    background: rgba($c-error, 0.1);
    transition: background $t-fast;
  }

  .cm-save-hint {
    font-size: 11px;
    line-height: 1.5;
    text-align: center;
    color: $l-text-400;

    @include dark {
      color: $d-text-faint;
    }
  }

  .cm-item-price {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    flex-shrink: 0;

    span {
      font-size: 11px;
      color: $l-text-400;

      @include dark {
        color: $d-text-faint;
      }
    }

    b {
      font-size: 13px;
      font-weight: 700;
      color: $l-text-900;

      @include dark {
        color: $d-text-hi;
      }
    }
  }
</style>
