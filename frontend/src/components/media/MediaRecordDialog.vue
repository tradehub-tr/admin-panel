<script setup>
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { canRenderThumb, formatSize } from "@/utils/mediaFormat";
  import { storefrontUrl } from "@/utils/storefrontUrl";

  /**
   * Ters arama penceresi (TUR-136).
   *
   * `MediaUsageDialog` "bu dosya nerede kullanılıyor" der; bu pencere tersini
   * gösterir: bir ürünün ya da mağazanın kullandığı TÜM medya tek listede.
   *
   * Silme kararı için asıl gereken bilgi burada: her görselin yanında başka kaç
   * yerde kullanıldığı yazıyor. Yalnız bu üründe geçen bir görsel silinebilir,
   * paylaşılan bir görsel silinirse başka ürünler de kırılır.
   */
  const props = defineProps({
    /** `{ doctype, name, label }` — hangi kaydın medyası gösterilecek. */
    target: { type: Object, default: null },
    /** ({doctype, name}) => Promise<rapor|null> */
    fetcher: { type: Function, required: true },
  });
  const open = defineModel("open", { type: Boolean, default: false });
  const { t } = useI18n();

  const data = ref(null);
  const loading = ref(false);

  watch(
    () => [open.value, props.target?.doctype, props.target?.name],
    async ([isOpen, doctype, name]) => {
      if (!isOpen || !doctype || !name) return;
      loading.value = true;
      data.value = null;
      data.value = await props.fetcher({ doctype, name });
      loading.value = false;
    },
    { immediate: true }
  );

  // Aynı görsel bir üründe birden çok yuvada olabilir (ana görsel + galeri).
  // Dosya bazında grupla ki liste satır sayısı dosya sayısıyla uyuşsun.
  const files = computed(() => {
    const map = new Map();
    for (const s of data.value?.slots || []) {
      if (!map.has(s.file_url)) map.set(s.file_url, { ...s, slots: [] });
      map.get(s.file_url).slots.push(s.field);
    }
    return [...map.values()];
  });

  const canThumb = (f) => f.state !== "missing" && canRenderThumb(f.file_url);


  /** Kaydın vitrindeki tam adresi — kökü panel biliyor, yolu backend verir. */
  const pageUrl = computed(() => storefrontUrl(data.value?.page_path));

  const verdictTone = (v) =>
    ({ in_use: "ok", order_only: "warn", history_only: "warn", unused: "danger" })[v] || "";
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="mrd__scrim" @click.self="open = false">
      <section class="mrd" role="dialog" aria-modal="true">
        <header class="mrd__head">
          <div class="mrd__title">
            <span class="mrd__name">{{ target?.label || target?.name }}</span>
            <span class="mrd__sub">{{ target?.doctype }} · {{ target?.name }}</span>
            <a
              v-if="pageUrl"
              class="mrd__url"
              :href="pageUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              <AppIcon name="external-link" :size="11" />
              {{ pageUrl }}
            </a>
          </div>
          <button type="button" class="mrd__close" :aria-label="t('mediaRecord.close')" @click="open = false">
            <AppIcon name="x" :size="18" />
          </button>
        </header>

        <div v-if="loading" class="mrd__empty">{{ t("mediaRecord.loading") }}</div>
        <div v-else-if="!files.length" class="mrd__empty">{{ t("mediaRecord.empty") }}</div>

        <template v-else>
          <div class="mrd__stats">
            <div class="mrd__stat">
              <span>{{ t("mediaRecord.stat.files") }}</span>
              <strong>{{ data.unique_files }}</strong>
            </div>
            <div class="mrd__stat">
              <span>{{ t("mediaRecord.stat.size") }}</span>
              <strong>{{ formatSize(data.total_bytes) }}</strong>
            </div>
            <div class="mrd__stat" :class="{ 'mrd__stat--warn': data.shared.length }">
              <span>{{ t("mediaRecord.stat.shared") }}</span>
              <strong>{{ data.shared.length }}</strong>
            </div>
            <div class="mrd__stat" :class="{ 'mrd__stat--danger': data.missing.length }">
              <span>{{ t("mediaRecord.stat.missing") }}</span>
              <strong>{{ data.missing.length }}</strong>
            </div>
          </div>

          <div class="mrd__body">
            <ul class="mrd__list">
              <li v-for="f in files" :key="f.file_url" class="mrd__row">
                <img
                  v-if="canThumb(f)"
                  class="mrd__thumb"
                  :src="f.file_url"
                  :alt="f.file_name"
                  loading="lazy"
                  decoding="async"
                />
                <span v-else class="mrd__thumb mrd__thumb--ph">
                  <AppIcon :name="f.state === 'missing' ? 'circle-alert' : 'file-text'" :size="14" />
                </span>

                <div class="mrd__main">
                  <span class="mrd__file">{{ f.file_name }}</span>
                  <span class="mrd__meta">
                    {{ formatSize(f.file_size) }}
                    <template v-if="f.optimized"> · {{ t("mediaRecord.optimized") }}</template>
                    <template v-if="f.state === 'missing'">
                      · <span class="mrd__danger">{{ t("mediaRecord.missing") }}</span>
                    </template>
                  </span>
                  <div class="mrd__slots">
                    <span v-for="(s, i) in f.slots" :key="i" class="mrd__chip">{{ s }}</span>
                  </div>
                </div>

                <div class="mrd__right">
                  <span class="mrd__verdict" :class="`mrd__verdict--${verdictTone(f.verdict)}`">
                    {{ t(`mediaUsage.verdict.${f.verdict}`) }}
                  </span>
                  <span v-if="f.used_elsewhere" class="mrd__shared">
                    {{ t("mediaRecord.usedElsewhere", { n: f.used_elsewhere }) }}
                  </span>
                  <span v-else class="mrd__only">{{ t("mediaRecord.onlyHere") }}</span>
                </div>
              </li>
            </ul>
          </div>
        </template>
      </section>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .mrd__scrim {
    position: fixed;
    inset: 0;
    z-index: 85;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: media.$s-4;
    background: rgb(0 0 0 / 50%);
  }

  .mrd {
    width: min(40rem, 100%);
    max-height: 86vh;
    display: flex;
    flex-direction: column;
    border-radius: 0.8rem;
    background: $l-bg;
    box-shadow: 0 16px 56px rgb(0 0 0 / 30%);

    @include dark {
      background: $d-bg-card;
    }
  }

  .mrd__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: media.$s-3;
    padding: media.$s-4 media.$s-5;
    @include media.divider(bottom);
  }

  .mrd__title {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .mrd__name {
    font-weight: 700;
    @include media.truncate;
  }

  .mrd__sub {
    @include media.text("xs");
    @include media.muted(1);
  }

  .mrd__url {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 2px;
    color: $brand;
    text-decoration: none;
    word-break: break-all;
    @include media.text("xs");

    &:hover {
      text-decoration: underline;
    }
  }

  .mrd__close {
    @include media.icon-button;
  }

  .mrd__stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: media.$s-2;
    padding: media.$s-3 media.$s-5 0;
  }

  .mrd__stat {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: media.$s-2;
    border-radius: 0.45rem;
    text-align: center;
    @include media.surface("soft");

    span {
      @include media.text("xs");
      @include media.muted(1);
    }

    strong {
      @include media.text("sm");
      font-weight: 700;
      @include media.numeric;
    }
  }

  .mrd__stat--warn strong {
    color: $c-warning;
  }

  .mrd__stat--danger strong {
    color: $c-error;
  }

  .mrd__body {
    overflow-y: auto;
    padding: media.$s-3 media.$s-5 media.$s-4;
  }

  .mrd__list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .mrd__row {
    display: flex;
    align-items: center;
    gap: media.$s-3;
    padding: media.$s-2 0;

    & + .mrd__row {
      @include media.divider(top);
    }
  }

  .mrd__thumb {
    width: 40px;
    height: 40px;
    flex: 0 0 auto;
    object-fit: cover;
    border-radius: 0.35rem;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .mrd__thumb--ph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed $l-border;
    @include media.muted(2);

    @include dark {
      border-color: $d-border;
    }
  }

  .mrd__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .mrd__file {
    @include media.text("sm");
    @include media.truncate;
  }

  .mrd__meta {
    @include media.text("xs");
    @include media.muted(1);
  }

  .mrd__slots {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }

  .mrd__chip {
    @include media.chip("brand");
  }

  .mrd__right {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .mrd__verdict {
    @include media.chip("neutral");
  }

  .mrd__verdict--ok {
    @include media.chip("success");
  }

  .mrd__verdict--warn {
    @include media.chip("warning");
  }

  .mrd__verdict--danger {
    color: $c-error;
    background: rgb(239 68 68 / 14%);
    padding: media.$s-05 media.$s-2;
    border-radius: 999px;
    font-weight: 600;
    @include media.text("xs");
  }

  .mrd__shared {
    @include media.text("xs");
    color: $c-warning;
  }

  .mrd__only {
    @include media.text("xs");
    @include media.muted(2);
  }

  .mrd__danger {
    color: $c-error;
  }

  .mrd__empty {
    padding: 3rem;
    text-align: center;
    @include media.muted(2);
  }
</style>
