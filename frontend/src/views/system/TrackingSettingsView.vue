<template>
  <div class="tracking-settings-page">
    <div class="page-header">
      <div>
        <h1>Tracking Ayarları</h1>
        <p class="subtitle">
          Site genelinde tracking script'lerini yönetin. Değişiklikler cookie consent'e bağlıdır.
        </p>
      </div>
      <button
        type="button"
        class="hdr-btn-primary"
        :disabled="saving || !dirty"
        @click="handleSave"
      >
        {{ saving ? "Kaydediliyor…" : "Kaydet" }}
      </button>
    </div>

    <p v-if="loading" class="state">Yükleniyor…</p>

    <div v-else-if="error && !settings" class="state error">
      {{ error }}
      <button type="button" class="hdr-btn-ghost retry-btn" @click="store.load()">
        Yeniden Dene
      </button>
    </div>

    <div v-else-if="settings" class="tracker-grid">
      <article
        v-for="tracker in trackers"
        :key="tracker.idField"
        class="tracker-card"
      >
        <header class="tracker-card__header">
          <div class="tracker-card__title">
            <component :is="tracker.icon" :size="20" />
            <span>{{ tracker.label }}</span>
          </div>
          <span class="tracker-card__category" :class="tracker.categoryClass">
            {{ tracker.category }}
          </span>
        </header>

        <div class="tracker-card__body">
          <label :for="`tracking-${tracker.idField}`" class="field-label">
            {{ tracker.label }} ID
          </label>
          <input
            :id="`tracking-${tracker.idField}`"
            type="text"
            class="field-input"
            :placeholder="tracker.placeholder"
            :value="settings[tracker.idField]"
            @input="onIdInput(tracker.idField, $event)"
          />

          <label class="toggle-row">
            <input
              type="checkbox"
              :checked="settings[tracker.enabledField]"
              :disabled="!settings[tracker.idField]"
              @change="onToggle(tracker.enabledField, $event)"
            />
            <span>{{ settings[tracker.enabledField] ? "Aktif" : "Pasif" }}</span>
          </label>
        </div>
      </article>
    </div>

    <p v-if="error && settings" class="save-error">{{ error }}</p>
  </div>
</template>

<script setup>
  import { onMounted } from "vue";
  import { onBeforeRouteLeave } from "vue-router";
  import { storeToRefs } from "pinia";
  import { useTrackingSettingsStore } from "@/stores/trackingSettings";
  import { useToast } from "@/composables/useToast";
  import { BarChart2, PieChart, Share2, ShoppingBag } from "lucide-vue-next";

  const trackers = [
    {
      idField: "gtm_id",
      enabledField: "gtm_enabled",
      label: "Google Tag Manager",
      placeholder: "GTM-XXXXXXX",
      icon: BarChart2,
      category: "Analytics",
      categoryClass: "cat-analytics",
    },
    {
      idField: "metrica_id",
      enabledField: "metrica_enabled",
      label: "Yandex Metrica",
      placeholder: "12345678",
      icon: PieChart,
      category: "Analytics",
      categoryClass: "cat-analytics",
    },
    {
      idField: "fb_pixel_id",
      enabledField: "fb_pixel_enabled",
      label: "Facebook Pixel",
      placeholder: "000000000000000",
      icon: Share2,
      category: "Marketing",
      categoryClass: "cat-marketing",
    },
    {
      idField: "criteo_partner_id",
      enabledField: "criteo_enabled",
      label: "Criteo",
      placeholder: "00000",
      icon: ShoppingBag,
      category: "Marketing",
      categoryClass: "cat-marketing",
    },
  ];

  const store = useTrackingSettingsStore();
  const { settings, loading, saving, dirty, error } = storeToRefs(store);
  const toast = useToast();

  function onIdInput(field, event) {
    settings.value[field] = event.target.value.trim();
    if (!settings.value[field]) {
      const tracker = trackers.find((t) => t.idField === field);
      if (tracker) settings.value[tracker.enabledField] = 0;
    }
    store.markDirty();
  }

  function onToggle(field, event) {
    settings.value[field] = event.target.checked ? 1 : 0;
    store.markDirty();
  }

  async function handleSave() {
    const result = await store.save();
    if (result.ok) {
      toast.success("Tracking ayarları kaydedildi.");
    } else {
      toast.error(error.value || "Kayıt başarısız.");
    }
  }

  onBeforeRouteLeave((_to, _from, next) => {
    if (dirty.value) {
      const ok = window.confirm("Kaydedilmemiş değişiklikler var. Sayfadan ayrılmak istiyor musunuz?");
      next(ok);
    } else {
      next();
    }
  });

  onMounted(() => store.load());
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .tracking-settings-page {
    max-width: 960px;
    margin: 0 auto;
    padding: 24px;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
    gap: 16px;

    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: $l-text-900;
      @include dark { color: $d-text-max; }
    }

    .subtitle {
      margin-top: 4px;
      font-size: 0.875rem;
      color: $l-text-500;
      @include dark { color: $d-text-muted; }
    }
  }

  .state {
    text-align: center;
    padding: 48px 0;
    color: $l-text-500;
    @include dark { color: $d-text-muted; }

    &.error { color: $c-error; }
  }

  .retry-btn { margin-top: 12px; }

  .tracker-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  }

  .tracker-card {
    border: 1px solid $l-border;
    border-radius: 12px;
    background: $l-bg;
    overflow: hidden;
    transition: border-color $t-base;

    @include dark {
      border-color: $d-border;
      background: $d-bg-card;
    }

    &:hover {
      border-color: $brand;
    }

    &__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid $l-border;
      @include dark { border-color: $d-border-inner; }
    }

    &__title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 0.9375rem;
      color: $l-text-900;
      @include dark { color: $d-text-hi; }
    }

    &__category {
      font-size: 0.75rem;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 999px;
    }

    &__body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
  }

  .cat-analytics {
    background: rgba($c-info, 0.1);
    color: $c-info;
  }

  .cat-marketing {
    background: rgba($c-warning, 0.1);
    color: $c-warning;
  }

  .field-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: $l-text-700;
    @include dark { color: $d-text; }
  }

  .field-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid $l-border;
    border-radius: 8px;
    font-size: 0.875rem;
    font-family: "JetBrains Mono", monospace;
    background: $l-bg;
    color: $l-text-900;
    transition: border-color $t-fast;

    @include dark {
      border-color: $d-border;
      background: $d-bg-elevated;
      color: $d-text;
    }

    &:focus {
      outline: none;
      border-color: $brand;
      box-shadow: 0 0 0 3px #{$brand-glow};
    }

    &::placeholder {
      color: $l-text-300;
      @include dark { color: $d-text-faint; }
    }
  }

  .toggle-row {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 0.8125rem;
    color: $l-text-700;
    @include dark { color: $d-text; }

    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: $brand;
    }

    input:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    input:disabled + span {
      opacity: 0.4;
    }
  }

  .save-error {
    margin-top: 16px;
    padding: 12px;
    background: rgba($c-error, 0.08);
    border: 1px solid rgba($c-error, 0.2);
    border-radius: 8px;
    color: $c-error;
    font-size: 0.875rem;
  }
</style>
