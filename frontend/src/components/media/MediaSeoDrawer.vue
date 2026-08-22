<script setup>
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { LANGS } from "@/composables/useMediaSeo";

  const props = defineProps({
    row: { type: Object, default: null },
    fields: { type: Object, default: null },
    saving: { type: Boolean, default: false },
  });
  const emit = defineEmits(["close", "save", "save-override", "clear-override", "set-indexability"]);

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
