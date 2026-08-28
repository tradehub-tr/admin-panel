<script setup>
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { isVideoFile, LANGS } from "@/composables/useMediaSeo";
  import { storefrontUrl } from "@/utils/storefrontUrl";

  const props = defineProps({
    row: { type: Object, default: null },
    fields: { type: Object, default: null },
    saving: { type: Boolean, default: false },
    /** Bu dosya üzerinde süren aksiyonun `file_url`'si — poster yeniden
     *  üretme/altyazı yükleme sırasında butonu kilitlemek için. */
    acting: { type: String, default: "" },
  });
  const emit = defineEmits([
    "close",
    "save",
    "save-override",
    "clear-override",
    "set-indexability",
    "regenerate-poster",
    "upload-captions",
    "change-watch-slug",
  ]);

  const { t } = useI18n();

  const lang = ref("tr");
  // Taslak: alanlar düzenlenirken kaynağa DOKUNULMAZ; "Kaydet"e kadar hiçbir
  // şey gitmiyor ve sadece DEĞİŞEN alanlar gönderiliyor (dokunulmamış bir
  // alanı boş değerle ezmeyelim diye).
  const draft = ref({});

  watch(
    () => props.fields,
    (yeni) => {
      draft.value = yeni ? { ...yeni } : {};
    },
    { immediate: true }
  );

  const dirty = computed(() =>
    Object.keys(changed.value).length > 0
  );

  const changed = computed(() => {
    const out = {};
    if (!props.fields) return out;
    for (const [k, v] of Object.entries(draft.value)) {
      if (props.fields[k] !== v) out[k] = v;
    }
    return out;
  });

  /** Alt metnini kim yazdı — insanın yazdığını kural motoru bir daha ezmiyor,
   *  bu yüzden rozet bilgilendirici değil UYARICI: "elle değiştirirsen
   *  otomatik üretim bu dosyada durur". */
  const sourceLabel = computed(() => {
    const s = props.fields?.alt_source || "";
    return s ? t(`mediaSeo.source.${s}`) : t("mediaSeo.source.none");
  });

  function fieldKey(base) {
    // Çok dilli alanlar `alt_tr`, `alt_en`… olarak saklanıyor; tek dilliler
    // düz adla. Aynı bileşen ikisini de yönetiyor.
    return `${base}_${lang.value}`;
  }

  function save() {
    if (!dirty.value) return;
    emit("save", changed.value);
  }

  function usageValue(usage, base) {
    const key = fieldKey(base);
    return usage.values?.[key] ?? usage.effective?.[base] ?? "";
  }

  function saveUsage(usage, base, event) {
    emit("save-override", usage, { [fieldKey(base)]: event.target.value });
  }

  /** Video bölümü — yalnız video uzantılı dosyalarda görünür. */
  const isVideo = computed(() => isVideoFile(props.row?.file_url));
  const videoBusy = computed(() => !!props.row && props.acting === props.row.file_url);

  function regeneratePoster() {
    if (videoBusy.value) return;
    emit("regenerate-poster", props.row);
  }

  /** İzleme sayfası (`/medya/v/<slug>`) slug'ı — taslak diğer alanların
   *  `draft`'ından AYRI tutulur: bu bir metin alanı değil, kaydedildiğinde
   *  backend `watch_slug.change_slug`'ı (301 köprüsü + zincir çökertme dahil)
   *  tetikleyen bilinçli bir aksiyon; genel "Kaydet" düğmesiyle karışmamalı. */
  const slugDraft = ref("");
  watch(
    () => props.fields?.slug,
    (yeni) => {
      slugDraft.value = yeni || "";
    },
    { immediate: true }
  );

  /** Slug'dan üretilen tam vitrin adresi — backend yalnız YOL döner
   *  (`th_media_canonical` = `/medya/v/<slug>`), kök ortama göre değişir. */
  const watchPageUrl = computed(() => storefrontUrl(props.fields?.canonical || ""));

  function saveSlug() {
    const deger = slugDraft.value.trim();
    if (!deger || videoBusy.value || deger === (props.fields?.slug || "")) return;
    emit("change-watch-slug", props.row, deger);
  }

  /** `.vtt` dosyası seçilince metin olarak okunur ve olduğu gibi backend'e
   *  gider — burada içerik doğrulanmaz (WEBVTT başlığı, boyut, tehlikeli
   *  işaretleme) çünkü `upload_video_captions` bunu zaten reddediyor. */
  function onCaptionsFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => emit("upload-captions", props.row, String(reader.result || ""));
    reader.readAsText(file);
  }
</script>

<template>
  <aside v-if="row" class="msd" role="dialog" :aria-label="t('mediaSeo.drawer.title')">
    <header class="msd__head">
      <div class="msd__title">
        <strong>{{ row.file_name || "—" }}</strong>
        <code>{{ row.file_url }}</code>
      </div>
      <button type="button" class="msd__close" :aria-label="t('common.close')" @click="emit('close')">
        <AppIcon name="x" :size="16" />
      </button>
    </header>

    <div v-if="!fields" class="msd__loading">{{ t("common.loading") }}</div>

    <template v-else>
      <!-- Bulgular önce: operatör buraya "neyi düzelteceğim" diye geliyor. -->
      <section v-if="(row.findings || []).length" class="msd__findings">
        <div
          v-for="f in row.findings"
          :key="f.code + f.detail"
          class="msd__finding"
          :class="`msd__finding--${f.severity}`"
        >
          <strong>{{ t(`mediaSeo.finding.${f.code}`) }}</strong>
          <span v-if="f.detail">{{ f.detail }}</span>
        </div>
      </section>

      <nav class="msd__langs" role="tablist">
        <button
          v-for="l in LANGS"
          :key="l"
          type="button"
          role="tab"
          class="msd__lang"
          :class="{ 'msd__lang--active': lang === l }"
          :aria-selected="lang === l"
          @click="lang = l"
        >
          {{ l.toUpperCase() }}
        </button>
      </nav>

      <div class="msd__form">
        <h3 class="msd__section">Indexability</h3>
        <label class="form-label">Görünürlük</label>
        <select
          class="form-input"
          :value="fields.indexability?.visibility || 'Public'"
          @change="emit('set-indexability', $event.target.value)"
        >
          <option v-for="v in ['Public', 'Unlisted', 'Protected', 'Temporary', 'Expired', 'Archived', 'Deleted']" :key="v" :value="v">{{ v }}</option>
        </select>
        <code>{{ fields.indexability?.robots || '—' }}</code>

        <label class="form-label">
          {{ t("mediaSeo.field.alt") }}
          <span class="msd__source">{{ sourceLabel }}</span>
        </label>
        <textarea v-model="draft[fieldKey('alt')]" class="form-input" rows="2"></textarea>
        <p class="msd__hint">{{ t("mediaSeo.hint.alt") }}</p>

        <label class="form-label">{{ t("mediaSeo.field.title") }}</label>
        <input v-model="draft[fieldKey('title')]" class="form-input" type="text" />

        <label class="form-label">{{ t("mediaSeo.field.caption") }}</label>
        <textarea v-model="draft[fieldKey('caption')]" class="form-input" rows="2"></textarea>
        <p class="msd__hint">{{ t("mediaSeo.hint.caption") }}</p>

        <!-- Tek dilli alanlar: dış yüzde render edilmiyorlar (panel içi arama
             ve hak yönetimi), dil sekmesinden etkilenmezler. -->
        <h3 class="msd__section">{{ t("mediaSeo.section.rights") }}</h3>
        <label class="form-label">{{ t("mediaSeo.field.creator") }}</label>
        <input v-model="draft.creator" class="form-input" type="text" />
        <label class="form-label">Creator type</label>
        <select v-model="draft.creator_type" class="form-input">
          <option value="">Belirtilmemiş</option>
          <option value="Person">Person</option>
          <option value="Organization">Organization</option>
        </select>

        <label class="form-label">{{ t("mediaSeo.field.credit_text") }}</label>
        <input v-model="draft.credit_text" class="form-input" type="text" />

        <label class="form-label">{{ t("mediaSeo.field.copyright_notice") }}</label>
        <input v-model="draft.copyright_notice" class="form-input" type="text" />

        <label class="form-label">{{ t("mediaSeo.field.license_url") }}</label>
        <input v-model="draft.license_url" class="form-input" type="url" />

        <label class="form-label">{{ t("mediaSeo.field.acquire_license_url") }}</label>
        <input v-model="draft.acquire_license_url" class="form-input" type="url" />

        <label class="form-label">{{ t("mediaSeo.field.usage_rights") }}</label>
        <textarea v-model="draft.usage_rights" class="form-input" rows="2"></textarea>

        <label class="form-label">{{ t("mediaSeo.field.rights_expires_on") }}</label>
        <input v-model="draft.rights_expires_on" class="form-input" type="date" />
        <p class="msd__hint">{{ t("mediaSeo.hint.expires") }}</p>

        <template v-if="isVideo">
          <h3 class="msd__section">{{ t("mediaSeo.video.poster") }}</h3>
          <img
            v-if="fields.poster_url"
            class="msd__poster"
            :src="fields.poster_url"
            :alt="t('mediaSeo.video.poster')"
            loading="lazy"
          />
          <p v-else class="msd__hint">{{ t("mediaSeo.video.noPoster") }}</p>
          <button
            type="button"
            class="hdr-btn-outlined"
            :disabled="videoBusy"
            @click="regeneratePoster"
          >
            {{ t("mediaSeo.video.regenerate") }}
          </button>

          <h3 class="msd__section">{{ t("mediaSeo.video.watchSlug") }}</h3>
          <div class="msd__slug-row">
            <input
              v-model="slugDraft"
              class="form-input"
              type="text"
              :disabled="videoBusy"
              :placeholder="t('mediaSeo.field.slug')"
            />
            <button
              type="button"
              class="hdr-btn-outlined"
              :disabled="videoBusy || !slugDraft.trim() || slugDraft.trim() === (fields.slug || '')"
              @click="saveSlug"
            >
              {{ t("mediaSeo.video.saveSlug") }}
            </button>
          </div>
          <p class="msd__hint">{{ t("mediaSeo.video.slugHint") }}</p>
          <a
            v-if="watchPageUrl"
            class="msd__watch-link"
            :href="watchPageUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            <AppIcon name="external-link" :size="14" />
            {{ t("mediaSeo.video.viewPage") }}
          </a>
          <p v-else class="msd__hint">{{ t("mediaSeo.video.noSlug") }}</p>

          <label class="form-label">{{ t("mediaSeo.field.transcript") }}</label>
          <textarea v-model="draft.transcript" class="form-input" rows="4"></textarea>

          <label class="form-label">{{ t("mediaSeo.field.captions") }}</label>
          <input type="file" accept=".vtt" :disabled="videoBusy" @change="onCaptionsFile" />
          <code v-if="fields.captions_url">{{ fields.captions_url }}</code>
        </template>

        <h3 class="msd__section">Kullanım bazlı metadata</h3>
        <p v-if="!(fields.usages || []).length" class="msd__hint">Bu asset için katalog kullanımı bulunamadı.</p>
        <article v-for="usage in fields.usages || []" :key="`${usage.ref_doctype}:${usage.ref_name}:${usage.ref_field}`" class="msd__usage">
          <strong>{{ usage.label }}</strong>
          <small>{{ usage.page_path }} · {{ usage.ref_doctype }} / {{ usage.ref_field }}</small>
          <label class="form-label">Bu kullanımdaki ALT ({{ lang.toUpperCase() }})</label>
          <textarea
            class="form-input"
            rows="2"
            :value="usageValue(usage, 'alt')"
            @change="saveUsage(usage, 'alt', $event)"
          ></textarea>
          <button
            v-if="usage.overridden"
            type="button"
            class="hdr-btn-outlined"
            @click="emit('clear-override', usage)"
          >Override'ı kaldır</button>
        </article>
      </div>

      <footer class="msd__foot">
        <span class="msd__dims">{{ fields.width || "?" }}×{{ fields.height || "?" }}</span>
        <div class="msd__foot-actions">
          <button type="button" class="hdr-btn-outlined" @click="emit('close')">
            {{ t("common.cancel") }}
          </button>
          <button type="button" class="hdr-btn-primary" :disabled="!dirty || saving" @click="save">
            {{ saving ? t("common.saving") : t("common.save") }}
          </button>
        </div>
      </footer>
    </template>
  </aside>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .msd {
    position: fixed;
    inset-block: 0;
    inset-inline-end: 0;
    width: min(26rem, 100vw);
    background: $l-bg;
    border-inline-start: 1px solid $l-border;
    box-shadow: -8px 0 24px rgb(0 0 0 / 8%);
    display: flex;
    flex-direction: column;
    z-index: 40;
    overflow-y: auto;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  .msd__head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: media.$s-2;
    padding: media.$s-4;
    border-bottom: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
  }

  .msd__title {
    min-width: 0;
    strong {
      display: block;
      @include media.text("body");
    }
    code {
      display: block;
      @include media.text("xs");
      color: $l-text-400;
      word-break: break-all;
    }
  }

  .msd__close {
    background: none;
    border: 0;
    cursor: pointer;
    color: $l-text-500;
  }

  .msd__loading,
  .msd__hint {
    padding: media.$s-3 media.$s-4;
    @include media.text("xs");
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }

  .msd__hint {
    padding: 0 0 media.$s-2;
  }

  .msd__findings {
    display: flex;
    flex-direction: column;
    gap: media.$s-1;
    padding: media.$s-3 media.$s-4;
  }

  .msd__finding {
    display: flex;
    flex-direction: column;
    padding: media.$s-2;
    border-radius: media.$r-sm;
    @include media.text("xs");
    background: $l-bg-muted;

    &--error {
      background: media.$tint-danger;
      color: $c-error;
    }
    &--warn {
      background: media.$tint-warning;
      color: $c-warning;
    }
    @include dark {
      background: $d-bg-elevated;
    }
  }

  .msd__langs {
    display: flex;
    gap: media.$s-1;
    padding-inline: media.$s-4;
    border-bottom: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
  }

  .msd__usage {
    display: grid;
    gap: media.$s-2;
    padding: media.$s-3;
    border: 1px solid $l-border;
    border-radius: media.$r-sm;
    small { color: $l-text-400; word-break: break-all; }
  }

  .msd__lang {
    padding: media.$s-2 media.$s-3;
    border: 0;
    background: none;
    color: $l-text-500;
    @include media.text("sm");
    cursor: pointer;
    border-bottom: 2px solid transparent;

    &--active {
      color: $brand;
      border-bottom-color: $brand;
      font-weight: 600;
    }
    @include dark {
      color: $d-text-muted;
      &.msd__lang--active {
        color: $brand-light;
      }
    }
  }

  .msd__form {
    display: flex;
    flex-direction: column;
    gap: media.$s-1;
    padding: media.$s-4;
    flex: 1;
  }

  .msd__section {
    @include media.text("sm");
    font-weight: 700;
    margin-block-start: media.$s-3;
    color: $l-text-700;
    @include dark {
      color: $d-text;
    }
  }

  .msd__poster {
    display: block;
    max-width: 100%;
    max-height: 10rem;
    object-fit: contain;
    border-radius: media.$r-sm;
    background: $l-bg-muted;
    margin-block-end: media.$s-2;
    @include dark {
      background: $d-bg-elevated;
    }
  }

  .msd__slug-row {
    display: flex;
    gap: media.$s-2;
    align-items: center;

    .form-input {
      flex: 1;
      min-width: 0;
    }
  }

  .msd__watch-link {
    display: inline-flex;
    align-items: center;
    gap: media.$s-1;
    @include media.text("xs");
    color: $brand;
    margin-block-end: media.$s-2;
    @include dark {
      color: $brand-light;
    }
  }

  .msd__source {
    @include media.text("xs");
    color: $l-text-400;
    font-weight: 400;
    margin-inline-start: media.$s-1;
  }

  .msd__foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: media.$s-2;
    padding: media.$s-4;
    border-top: 1px solid $l-border;
    position: sticky;
    inset-block-end: 0;
    background: inherit;
    @include dark {
      border-color: $d-border;
    }
  }

  .msd__dims {
    @include media.text("xs");
    color: $l-text-400;
  }

  .msd__foot-actions {
    display: flex;
    gap: media.$s-2;
  }
</style>
