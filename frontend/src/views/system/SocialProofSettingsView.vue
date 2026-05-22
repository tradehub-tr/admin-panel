<template>
  <div class="social-proof-settings-page">
    <div class="page-header">
      <div>
        <h1>Sosyal Kanıt Ayarları</h1>
        <p class="subtitle">
          Ürün detay sayfasındaki dönen rozetlerin eşiklerini ve davranışını yönet. Değişiklik
          canlıya {{ cacheTtlMinutes }} dakika içinde yansır.
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

    <div v-else-if="settings" class="content-grid">
      <!-- Sol kolon: Form -->
      <section class="form-column">
        <div class="form-section">
          <label class="toggle-row">
            <input type="checkbox" :checked="settings.enabled" @change="onEnabledToggle" />
            <span>Etkin</span>
          </label>
        </div>

        <fieldset class="form-section">
          <legend>Eşikler</legend>
          <div v-for="field in thresholdFields" :key="field.key" class="form-row">
            <label :for="`threshold-${field.key}`">{{ field.label }}</label>
            <input
              :id="`threshold-${field.key}`"
              type="number"
              :min="THRESHOLD_MIN"
              :max="THRESHOLD_MAX"
              :value="settings.thresholds[field.key]"
              :class="{ invalid: fieldErrors[field.key] }"
              @input="onThresholdInput(field.key, $event)"
            />
            <p v-if="fieldErrors[field.key]" class="field-error">
              {{ fieldErrors[field.key] }}
            </p>
          </div>
        </fieldset>

        <fieldset class="form-section">
          <legend>Önbellek</legend>
          <div class="form-row">
            <label for="cache-ttl">Cache TTL (sn)</label>
            <input
              id="cache-ttl"
              type="number"
              :min="TTL_MIN"
              :max="TTL_MAX"
              :value="settings.cache_ttl_seconds"
              :class="{ invalid: fieldErrors.cache_ttl_seconds }"
              @input="onTtlInput('cache_ttl_seconds', $event)"
            />
            <p v-if="fieldErrors.cache_ttl_seconds" class="field-error">
              {{ fieldErrors.cache_ttl_seconds }}
            </p>
          </div>
          <div class="form-row">
            <label for="view-dedup">View dedup (sn)</label>
            <input
              id="view-dedup"
              type="number"
              :min="TTL_MIN"
              :max="TTL_MAX"
              :value="settings.view_dedup_seconds"
              :class="{ invalid: fieldErrors.view_dedup_seconds }"
              @input="onTtlInput('view_dedup_seconds', $event)"
            />
            <p v-if="fieldErrors.view_dedup_seconds" class="field-error">
              {{ fieldErrors.view_dedup_seconds }}
            </p>
          </div>
        </fieldset>
      </section>

      <!-- Sağ kolon: Canlı önizleme -->
      <section class="preview-column">
        <h2 class="preview-title">Canlı Önizleme</h2>

        <div v-if="previewLoading" class="preview-loading">Yükleniyor...</div>

        <div v-else-if="samples.length === 0" class="preview-empty">
          Listing eklendikten sonra önizleme burada görünecek.
        </div>

        <div v-else class="preview-cards">
          <article
            v-for="sample in samples"
            :key="sample.listing_id"
            class="sample-card"
            :class="`sample-${sample.label}`"
          >
            <header class="sample-header">
              <span class="sample-label">{{ labelText(sample.label) }}</span>
              <span class="sample-title">{{ sample.title || "(Başlıksız)" }}</span>
            </header>

            <ul v-if="sample.signals.length > 0" class="sample-signals">
              <li v-for="sig in sample.signals" :key="sig.type" class="signal-pass">
                <span class="check">✓</span>
                {{ signalMessage(sig) }}
              </li>
            </ul>

            <ul v-if="sample.filtered_out.length > 0" class="sample-filtered">
              <li v-for="f in sample.filtered_out" :key="f.type" class="signal-fail">
                <span class="cross">✗</span>
                {{ signalTypeLabel(f.type) }}: {{ f.value }} adet (eşik {{ f.threshold }})
              </li>
            </ul>

            <div
              v-if="sample.signals.length === 0 && sample.filtered_out.length === 0"
              class="sample-empty"
            >
              Hiç sinyal yok — rozet görünmeyecek
            </div>
            <div v-else-if="sample.signals.length === 0" class="sample-no-pass">
              Hiçbir sinyal eşik geçmedi — rozet görünmeyecek
            </div>

            <!-- Storefront rozet önizlemesi: 5 sn'de bir döner -->
            <div v-if="sample.signals.length > 0" class="rotating-badge">
              <span class="rotating-badge__corner">Storefront rozeti</span>
              <Transition name="badge-fade" mode="out-in">
                <span
                  :key="`${sample.listing_id}-${activeSignalIndex(sample)}`"
                  class="rotating-badge__text"
                >
                  {{ signalMessage(sample.signals[activeSignalIndex(sample)]) }}
                </span>
              </Transition>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
  import { computed, onMounted, onBeforeUnmount, ref } from "vue";
  import { onBeforeRouteLeave } from "vue-router";
  import { storeToRefs } from "pinia";
  import { useSocialProofSettingsStore } from "@/stores/socialProofSettings";
  import { useToast } from "@/composables/useToast";

  const THRESHOLD_MIN = 1;
  const THRESHOLD_MAX = 100000;
  const TTL_MIN = 60;
  const TTL_MAX = 86400;
  const PREVIEW_DEBOUNCE_MS = 600;
  const ROTATION_INTERVAL_MS = 5000;

  const thresholdFields = [
    { key: "sales", label: "Satış" },
    { key: "favorites", label: "Favori" },
    { key: "cart_now", label: "Sepet (şu an)" },
    { key: "views_24h", label: "Görüntülenme" },
    { key: "distinct_buyers", label: "Farklı alıcı" },
    { key: "seller_orders", label: "Satıcı sipariş" },
  ];

  const store = useSocialProofSettingsStore();
  const { settings, samples, loading, saving, previewLoading, dirty, error, fieldErrors } =
    storeToRefs(store);
  const toast = useToast();

  const cacheTtlMinutes = computed(() =>
    Math.round((settings.value?.cache_ttl_seconds ?? 600) / 60)
  );

  // Manual debounce — lodash yok (bkz. package.json)
  let previewTimer = null;
  function debouncedFetchPreview() {
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      store.fetchPreview();
      previewTimer = null;
    }, PREVIEW_DEBOUNCE_MS);
  }

  function onEnabledToggle(e) {
    settings.value.enabled = e.target.checked;
    store.markDirty();
    debouncedFetchPreview();
  }

  function onThresholdInput(key, e) {
    const value = parseInt(e.target.value, 10);
    if (Number.isNaN(value)) return;
    settings.value.thresholds[key] = value;
    store.markDirty();
    debouncedFetchPreview();
  }

  function onTtlInput(key, e) {
    const value = parseInt(e.target.value, 10);
    if (Number.isNaN(value)) return;
    settings.value[key] = value;
    store.markDirty();
    // TTL değişikliği preview sinyallerini etkilemez
  }

  function labelText(label) {
    const map = { hot: "Hot ürün", warm: "Warm ürün", cold: "Cold ürün" };
    return map[label] || label;
  }

  function signalTypeLabel(type) {
    const map = {
      sales: "Satış",
      favorites: "Favori",
      cart_now: "Sepet",
      views_24h: "Görüntülenme",
      distinct_buyers: "Farklı alıcı",
      seller_orders: "Satıcı sipariş",
    };
    return map[type] || type;
  }

  // Storefront rozet preview'ı için global tick — tüm sample'lar senkron döner.
  // prefers-reduced-motion: reduce'da interval kurulmaz, statik kalır.
  const currentTick = ref(0);
  let tickTimer = null;

  function activeSignalIndex(sample) {
    if (!sample.signals.length) return 0;
    return currentTick.value % sample.signals.length;
  }

  function signalMessage(sig) {
    const value = sig.value >= 1000 ? `${Math.floor(sig.value / 1000)}.000+` : String(sig.value);
    const days = sig.window_days ?? "";
    switch (sig.type) {
      case "sales":
        return `Son ${days} günde ${value} adet satıldı`;
      case "favorites":
        return `${value} işletmenin favorisi`;
      case "cart_now":
        return `${value} alıcının sepetinde`;
      case "views_24h":
        return `Son 24 saatte ${value} görüntülenme`;
      case "distinct_buyers":
        return `Son ${days} günde ${value} işletme bu üründen aldı`;
      case "seller_orders":
        return `Bu satıcıdan ${value} tamamlanmış sipariş`;
      default:
        return `${signalTypeLabel(sig.type)}: ${value}`;
    }
  }

  async function handleSave() {
    const result = await store.save();
    if (result.ok) {
      toast.success("Sosyal kanıt ayarları kaydedildi");
    } else {
      toast.error(error.value || "Kaydetme başarısız");
    }
  }

  // Beforeunload guard — sayfayı tarayıcıyla kapatma/yenileme uyarısı
  function beforeUnloadHandler(e) {
    if (dirty.value) {
      e.preventDefault();
      e.returnValue = "";
    }
  }

  onMounted(() => {
    store.load();
    window.addEventListener("beforeunload", beforeUnloadHandler);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) {
      tickTimer = setInterval(() => {
        currentTick.value++;
      }, ROTATION_INTERVAL_MS);
    }
  });

  onBeforeUnmount(() => {
    window.removeEventListener("beforeunload", beforeUnloadHandler);
    if (previewTimer) clearTimeout(previewTimer);
    if (tickTimer) clearInterval(tickTimer);
  });

  onBeforeRouteLeave((to, from, next) => {
    if (
      dirty.value &&
      !window.confirm("Kaydedilmemiş değişiklikleriniz var, çıkmak istediğinize emin misiniz?")
    ) {
      next(false);
    } else {
      next();
    }
  });
</script>

<style lang="scss" scoped>
  @use "sass:color";
  @use "@/assets/scss/variables" as *;

  .social-proof-settings-page {
    padding: 24px;
    max-width: 1200px;
  }

  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;

    h1 {
      font-size: 22px;
      font-weight: 600;
      margin: 0;
      color: $l-text-900;
      @include dark {
        color: $d-text;
      }
    }

    .subtitle {
      font-size: 13px;
      color: $l-text-500;
      margin: 4px 0 0;
      max-width: 640px;
      @include dark {
        color: $d-text-muted;
      }
    }
  }

  .state {
    padding: 24px;
    background: $l-bg;
    border: 1px solid $l-border-alt;
    border-radius: 12px;
    color: $l-text-500;
    text-align: center;
    font-size: 13px;
    @include dark {
      background-color: $d-bg-card;
      border-color: $d-border;
      color: $d-text-muted;
    }
    &.error {
      color: #dc2626;
      background: #fee2e2;
      @include dark {
        color: #fca5a5;
        background: rgba(239, 68, 68, 0.15);
      }
    }
  }

  .retry-btn {
    margin-top: 12px;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 24px;

    @media (max-width: 960px) {
      grid-template-columns: 1fr;
    }
  }

  .form-column {
    background: $l-bg;
    border: 1px solid $l-border-alt;
    border-radius: 12px;
    padding: 24px;

    @include dark {
      background-color: $d-bg-card;
      border-color: $d-border;
    }
  }

  .preview-column {
    background: $l-bg-soft;
    border: 1px solid $l-border-alt;
    border-radius: 12px;
    padding: 16px;
    min-height: 240px;

    @include dark {
      background-color: $d-bg-elevated;
      border-color: $d-border;
    }
  }

  .toggle-row {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-weight: 500;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }

    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: $brand;
      cursor: pointer;
    }
  }

  .form-section {
    border: none;
    margin: 0 0 24px;
    padding: 0;

    &:last-child {
      margin-bottom: 0;
    }

    legend {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: $l-text-500;
      font-weight: 600;
      margin: 0 0 12px;
      padding: 0;
      @include dark {
        color: $d-text-muted;
      }
    }
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 140px;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }

    label {
      font-size: 13px;
      color: $l-text-700;
      @include dark {
        color: $d-text-muted;
      }
    }

    input[type="number"] {
      padding: 7px 10px;
      border: 1px solid $l-border-alt;
      border-radius: 8px;
      font-family: inherit;
      font-size: 13px;
      background: $l-bg;
      color: $l-text-900;
      width: 100%;
      transition:
        border-color $t-base,
        box-shadow $t-base;

      &:focus {
        outline: none;
        border-color: $brand;
        box-shadow: 0 0 0 3px rgba($brand, 0.15);
      }

      &.invalid {
        border-color: $c-error;
        &:focus {
          box-shadow: 0 0 0 3px rgba($c-error, 0.15);
        }
      }

      @include dark {
        background: $d-bg-elevated;
        border-color: $d-border;
        color: $d-text;
      }
    }
  }

  .field-error {
    grid-column: 1 / -1;
    color: $c-error;
    font-size: 12px;
    margin: 4px 0 0;
  }

  .hdr-btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
  }

  .hdr-btn-ghost {
    appearance: none;
    display: inline-flex;
    align-items: center;
    padding: 7px 14px;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    color: $l-text-700;
    background: transparent;
    border: 1px solid $l-border-alt;
    border-radius: 8px;
    cursor: pointer;
    transition:
      background $t-base,
      border-color $t-base,
      color $t-base;

    &:hover {
      border-color: $l-text-500;
      color: $l-text-900;
    }

    @include dark {
      color: $d-text-muted;
      border-color: $d-border;

      &:hover {
        color: $d-text;
        border-color: $d-border-inner;
        background: $d-bg-hover;
      }
    }
  }

  .preview-title {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 16px 0;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .preview-loading,
  .preview-empty {
    padding: 32px 16px;
    text-align: center;
    color: $l-text-500;
    font-size: 14px;

    @include dark {
      color: $d-text-muted;
    }
  }

  .preview-cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .sample-card {
    background: $l-bg;
    border-radius: 6px;
    padding: 12px;
    box-shadow: 0 0 6px rgba(0, 0, 0, 0.04);
    border-left: 3px solid;

    &.sample-hot {
      border-left-color: $brand;
    }
    &.sample-warm {
      border-left-color: color.adjust($brand, $lightness: 15%);
    }
    &.sample-cold {
      border-left-color: $l-text-300;
    }

    @include dark {
      background: $d-bg-card;
      box-shadow: 0 0 6px rgba(0, 0, 0, 0.2);

      &.sample-cold {
        border-left-color: $d-text-faint;
      }
    }
  }

  .sample-header {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 8px;
  }

  .sample-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  .sample-title {
    font-size: 13px;
    font-weight: 500;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .sample-signals,
  .sample-filtered {
    list-style: none;
    padding: 0;
    margin: 0 0 8px 0;
    font-size: 12px;
  }

  .signal-pass {
    color: $l-text-700;
    margin-bottom: 4px;

    .check {
      color: $brand;
      font-weight: 700;
      margin-right: 4px;
    }

    @include dark {
      color: $d-text;
    }
  }

  .signal-fail {
    color: $l-text-500;
    margin-bottom: 4px;

    .cross {
      color: $c-error;
      font-weight: 700;
      margin-right: 4px;
    }

    @include dark {
      color: $d-text-muted;
    }
  }

  .sample-empty,
  .sample-no-pass {
    font-size: 11px;
    font-style: italic;
    color: $l-text-300;
    padding: 4px 0;

    @include dark {
      color: $d-text-faint;
    }
  }

  // Storefront rozet preview — ürün detay sayfasındaki gibi tek satır, dönen
  .rotating-badge {
    position: relative;
    margin-top: 10px;
    min-height: 36px;
    display: flex;
    align-items: center;
    padding: 8px 10px;
    background: $l-bg-soft;
    border-left: 3px solid #d97706;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    color: $l-text-900;
    overflow: hidden;

    @include dark {
      background: $d-bg-elevated;
      color: $d-text;
    }
  }

  .rotating-badge__corner {
    position: absolute;
    top: -7px;
    right: 6px;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    padding: 1px 5px;
    background: $brand;
    color: #fff;
    border-radius: 3px;
  }

  .rotating-badge__text {
    display: inline-block;
  }

  .badge-fade-enter-active,
  .badge-fade-leave-active {
    transition: opacity 300ms ease;
  }

  .badge-fade-enter-from,
  .badge-fade-leave-to {
    opacity: 0;
  }
</style>
