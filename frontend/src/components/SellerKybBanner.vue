<template>
  <div v-if="title" class="kyb-banner" :class="bannerClass">
    <div class="kyb-banner-icon-wrap">
      <AppIcon :name="iconName" :size="20" />
    </div>
    <div class="kyb-banner-text">
      <div class="kyb-banner-title">{{ title }}</div>
      <div v-if="body" class="kyb-banner-body">{{ body }}</div>
    </div>
    <button v-if="ctaUrl" type="button" class="kyb-banner-cta" @click="goCta">
      {{ ctaLabel }}
      <AppIcon name="arrow-right" :size="13" />
    </button>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import { useAuthStore } from "@/stores/auth";
  import AppIcon from "@/components/common/AppIcon.vue";

  const { t } = useI18n();
  const auth = useAuthStore();
  const kybStatus = computed(() => auth.kybStatus);

  const bannerClass = computed(() => {
    switch (kybStatus.value) {
      case "Verified":
        return "kyb-banner--verified";
      case "Under Review":
        return "kyb-banner--review";
      case "Pending":
      case "Draft":
        return "kyb-banner--pending";
      case "Rejected":
        return "kyb-banner--rejected";
      case "Expired":
        return "kyb-banner--expired";
      default:
        return "";
    }
  });

  const iconName = computed(() => {
    switch (kybStatus.value) {
      case "Verified":
        return "badge-check";
      case "Under Review":
        return "search";
      case "Pending":
        return "info";
      case "Draft":
        return "file-pen";
      case "Rejected":
        return "triangle-alert";
      case "Expired":
        return "alarm-clock";
      default:
        return "info";
    }
  });

  const title = computed(() => {
    switch (kybStatus.value) {
      case "Verified":
        return t("sellerKybBanner.titleVerified");
      case "Under Review":
        return t("sellerKybBanner.titleUnderReview");
      case "Pending":
        return t("sellerKybBanner.titlePending");
      case "Draft":
        return t("sellerKybBanner.titleDraft");
      case "Rejected":
        return t("sellerKybBanner.titleRejected");
      case "Expired":
        return t("sellerKybBanner.titleExpired");
      default:
        return "";
    }
  });

  const body = computed(() => {
    switch (kybStatus.value) {
      case "Verified":
        return t("sellerKybBanner.bodyVerified");
      case "Under Review":
        return t("sellerKybBanner.bodyUnderReview");
      case "Pending":
        return t("sellerKybBanner.bodyPending");
      case "Draft":
        return t("sellerKybBanner.bodyDraft");
      case "Rejected":
        return t("sellerKybBanner.bodyRejected");
      case "Expired":
        return t("sellerKybBanner.bodyExpired");
      default:
        return "";
    }
  });

  const ctaUrl = computed(() => {
    if (
      kybStatus.value === "Rejected" ||
      kybStatus.value === "Expired" ||
      kybStatus.value === "Draft"
    ) {
      return "/pages/dashboard/kyb.html";
    }
    return null;
  });

  const ctaLabel = computed(() => {
    switch (kybStatus.value) {
      case "Expired":
        return t("sellerKybBanner.ctaExpired");
      case "Rejected":
        return t("sellerKybBanner.ctaRejected");
      case "Draft":
        return t("sellerKybBanner.ctaDraft");
      default:
        return "";
    }
  });

  function goCta() {
    if (ctaUrl.value) window.location.href = ctaUrl.value;
  }
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .kyb-banner {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 16px;
    border: 1px solid;
  }
  .kyb-banner-icon-wrap {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.4);
  }
  .kyb-banner-text {
    flex: 1;
    min-width: 0;
  }
  .kyb-banner-title {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.3;
  }
  .kyb-banner-body {
    font-size: 12px;
    margin-top: 2px;
    line-height: 1.5;
    opacity: 0.9;
  }
  .kyb-banner-cta {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 6px;
    color: white;
    border: none;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .kyb-banner-cta:hover {
    opacity: 0.85;
  }

  /* Dar ekran: metin ikon yanında tam genişlik, CTA alta tam satır iner */
  @media (max-width: 639px) {
    .kyb-banner {
      flex-wrap: wrap;
    }
    .kyb-banner-text {
      flex: 1 1 calc(100% - 44px);
    }
    .kyb-banner-cta {
      flex: 1 1 100%;
      justify-content: center;
      padding: 9px 12px;
      font-size: 12px;
    }
  }

  /* ── Light mode ───────────────────────────────────────────── */
  .kyb-banner--verified {
    background: #f0fdf4;
    border-color: #bbf7d0;
    color: #14532d;
  }
  .kyb-banner--verified .kyb-banner-icon-wrap {
    background: #bbf7d0;
    color: #15803d;
  }
  .kyb-banner--verified .kyb-banner-cta {
    background: #16a34a;
  }

  .kyb-banner--review {
    background: #fff8e1;
    border-color: #ffe08a;
    color: #6b5200;
  }
  .kyb-banner--review .kyb-banner-icon-wrap {
    background: #fff5d6;
    color: #8a6a00;
  }
  .kyb-banner--review .kyb-banner-cta {
    background: #f5b800;
    /* Sarı zeminde beyaz metin 1.9:1 — ink zorunlu */
    color: #1a1a1a;
  }

  .kyb-banner--pending {
    background: #eff6ff;
    border-color: #bfdbfe;
    color: #1e3a8a;
  }
  .kyb-banner--pending .kyb-banner-icon-wrap {
    background: #bfdbfe;
    color: #1d4ed8;
  }
  .kyb-banner--pending .kyb-banner-cta {
    background: #2563eb;
  }

  .kyb-banner--rejected {
    background: #fef2f2;
    border-color: #fecaca;
    color: #7f1d1d;
  }
  .kyb-banner--rejected .kyb-banner-icon-wrap {
    background: #fecaca;
    color: #b91c1c;
  }
  .kyb-banner--rejected .kyb-banner-cta {
    background: #dc2626;
  }

  .kyb-banner--expired {
    background: #fff7ed;
    border-color: #fed7aa;
    color: #7c2d12;
  }
  .kyb-banner--expired .kyb-banner-icon-wrap {
    background: #fed7aa;
    color: #c2410c;
  }
  .kyb-banner--expired .kyb-banner-cta {
    background: #ea580c;
  }

  /* ── Dark mode ────────────────────────────────────────────── */
  .kyb-banner--verified {
    @include dark {
      background: rgba(20, 83, 45, 0.25);
      border-color: rgba(34, 197, 94, 0.4);
      color: #86efac;
    }
  }
  .kyb-banner--verified .kyb-banner-icon-wrap {
    @include dark {
      background: rgba(34, 197, 94, 0.2);
      color: #86efac;
    }
  }

  .kyb-banner--review {
    @include dark {
      background: rgba(107, 82, 0, 0.25);
      border-color: rgba(245, 184, 0, 0.4);
      color: #ffd54d;
    }
  }
  .kyb-banner--review .kyb-banner-icon-wrap {
    @include dark {
      background: rgba(245, 184, 0, 0.2);
      color: #ffd54d;
    }
  }

  .kyb-banner--pending {
    @include dark {
      background: rgba(30, 58, 138, 0.25);
      border-color: rgba(59, 130, 246, 0.4);
      color: #93c5fd;
    }
  }
  .kyb-banner--pending .kyb-banner-icon-wrap {
    @include dark {
      background: rgba(59, 130, 246, 0.2);
      color: #93c5fd;
    }
  }

  .kyb-banner--rejected {
    @include dark {
      background: rgba(127, 29, 29, 0.25);
      border-color: rgba(239, 68, 68, 0.4);
      color: #fca5a5;
    }
  }
  .kyb-banner--rejected .kyb-banner-icon-wrap {
    @include dark {
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
    }
  }

  .kyb-banner--expired {
    @include dark {
      background: rgba(124, 45, 18, 0.25);
      border-color: rgba(249, 115, 22, 0.4);
      color: #fdba74;
    }
  }
  .kyb-banner--expired .kyb-banner-icon-wrap {
    @include dark {
      background: rgba(249, 115, 22, 0.2);
      color: #fdba74;
    }
  }
</style>
