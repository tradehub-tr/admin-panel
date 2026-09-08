<script setup>
  import { computed, nextTick, reactive, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { isVideoFile, LANGS } from "@/composables/useMediaSeo";
  import { canRenderThumb } from "@/utils/mediaFormat";
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
    "generate",
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

  const dirty = computed(() => Object.keys(changed.value).length > 0);

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

  /** Başlıktaki küçük önizleme — türev varsa onu, yoksa çizilebilir orijinali. */
  const thumbFailed = ref(false);
  watch(
    () => props.row?.file_url,
    () => {
      thumbFailed.value = false;
    }
  );
  const headThumb = computed(() => {
    if (thumbFailed.value) return "";
    const r = props.row;
    if (!r) return "";
    return r.thumb_url || (canRenderThumb(r.file_url) ? r.file_url : "");
  });
  const ext = computed(() => {
    const m = /\.([a-z0-9]{2,5})(\?|$)/i.exec(props.row?.file_url || "");
    return m ? m[1].toUpperCase() : "";
  });

  function fieldKey(base) {
    // Çok dilli alanlar `alt_tr`, `alt_en`… olarak saklanıyor; tek dilliler
    // düz adla. Aynı bileşen ikisini de yönetiyor.
    return `${base}_${lang.value}`;
  }

  /* ── Görev listesi (öneri 02) ────────────────────────────────────────────
   * Bulgular pasif uyarı bandı değil, işaretlenen görevler: alanın taslağı
   * dolunca satırın üstü çizilir. `field` hangi taslak anahtarına bakılacağını,
   * `section` hangi katlanır bölümün açılacağını söyler. `check: false` olan
   * bulgular boş/dolu ile ölçülemez (şüpheli metin, çelişki, yinelenme) —
   * onlar yalnız "git" hedefi taşır, kendiliğinden işaretlenmez. */
  const TASK_MAP = {
    missing_alt: { field: "alt", perLang: true },
    missing_localized_alt: { field: "alt", perLang: true },
    suspicious_alt: { field: "alt", perLang: true, check: false },
    keyword_stuffed_alt: { field: "alt", perLang: true, check: false },
    missing_title: { field: "title", perLang: true },
    missing_caption: { field: "caption", perLang: true },
    missing_license: { field: "license_url", section: "rights" },
    expired_rights: { field: "rights_expires_on", section: "rights", check: false },
    used_but_noindex: { section: "index", check: false },
    visibility_conflict: { section: "index", check: false },
    missing_watch_slug: { field: "slug", section: "video", check: false },
  };

  const tasks = computed(() =>
    (props.row?.findings || []).map((f) => {
      const map = TASK_MAP[f.code] || null;
      const key = map?.perLang ? `${map.field}_${lang.value}` : map?.field;
      const value = key ? draft.value[key] : "";
      const done = !!map && map.check !== false && !!String(value ?? "").trim();
      return { ...f, map, key, done };
    })
  );
  const doneCount = computed(() => tasks.value.filter((g) => g.done).length);
  const leftCount = computed(() => tasks.value.length - doneCount.value);
  const progressPct = computed(() =>
    tasks.value.length ? Math.round((doneCount.value / tasks.value.length) * 100) : 0
  );

  /** Katlanır bölümler — video düzenlemenin ana yüzeyi olduğu için açık başlar. */
  const sections = reactive({ index: false, rights: false, video: true, usages: false });

  async function goTo(task) {
    if (!task.map) return;
    if (task.map.section) sections[task.map.section] = true;
    await nextTick();
    const el = document.getElementById(
      task.key ? `msd-f-${task.key}` : `msd-s-${task.map.section}`
    );
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus?.({ preventScroll: true });
  }

  const RIGHTS_FIELDS = [
    "creator",
    "creator_type",
    "credit_text",
    "copyright_notice",
    "license_url",
    "acquire_license_url",
    "usage_rights",
    "rights_expires_on",
  ];
  const rightsEmpty = computed(
    () => RIGHTS_FIELDS.filter((k) => !String(draft.value[k] ?? "").trim()).length
  );

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
  const rowBusy = computed(() => !!props.row && props.acting === props.row.file_url);

  function regeneratePoster() {
    if (rowBusy.value) return;
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
    if (!deger || rowBusy.value || deger === (props.fields?.slug || "")) return;
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
      <span class="msd__thumb">
        <img
          v-if="headThumb"
          :src="headThumb"
          :alt="row.file_name || ''"
          loading="lazy"
          @error="thumbFailed = true"
        />
        <em v-else>{{ ext || "?" }}</em>
      </span>
      <div class="msd__title" :title="row.file_url">
        <strong>{{ row.file_name || "—" }}</strong>
        <small
          >{{ fields?.width || "?" }}×{{ fields?.height || "?" }}
          <template v-if="ext">· {{ ext }}</template></small
        >
      </div>
      <button
        type="button"
        class="msd__close"
        :aria-label="t('common.close')"
        @click="emit('close')"
      >
        <AppIcon name="x" :size="16" />
      </button>
    </header>

    <div v-if="!fields" class="msd__loading">{{ t("common.loading") }}</div>

    <template v-else>
      <div class="msd__scroll">
        <!-- Görev listesi: operatör buraya "neyi düzelteceğim" diye geliyor;
             alan dolunca satırın üstü çizilir, ilerleme çubuğu tempo verir. -->
        <section v-if="tasks.length" class="msd__todo-wrap">
          <div class="msd__prog">
            <b class="msd__prog-n">{{ doneCount }}/{{ tasks.length }}</b>
            <span class="msd__prog-track" aria-hidden="true">
              <i :style="{ width: `${progressPct}%` }"></i>
            </span>
            <b class="msd__prog-left">
              {{
                leftCount
                  ? t("mediaSeo.drawer.left", { n: leftCount })
                  : t("mediaSeo.drawer.allDone")
              }}
            </b>
          </div>
          <ul class="msd__todo">
            <li
              v-for="task in tasks"
              :key="task.code + (task.detail || '')"
              class="msd__task"
              :class="{
                'msd__task--done': task.done,
                'msd__task--error': task.severity === 'error',
              }"
            >
              <span class="msd__task-cb" aria-hidden="true"></span>
              <span class="msd__task-text">
                <s v-if="task.done">{{ t(`mediaSeo.finding.${task.code}`) }}</s>
                <template v-else>{{ t(`mediaSeo.finding.${task.code}`) }}</template>
                <small v-if="task.detail && !task.done">{{ task.detail }}</small>
              </span>
              <button
                v-if="task.map && !task.done"
                type="button"
                class="msd__task-go"
                @click="goTo(task)"
              >
                {{ t("mediaSeo.drawer.go") }} →
              </button>
            </li>
          </ul>
        </section>

        <div class="msd__langbar">
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
          <button type="button" class="msd__gen" :disabled="rowBusy" @click="emit('generate', row)">
            <AppIcon name="sparkles" :size="13" />
            {{ rowBusy ? t("common.loading") : t("mediaSeo.action.generate") }}
          </button>
        </div>

        <div class="msd__form">
          <label class="form-label" :for="`msd-f-${fieldKey('alt')}`">
            {{ t("mediaSeo.field.alt") }}
            <span class="msd__source">{{ sourceLabel }}</span>
            <span class="msd__info" :title="t('mediaSeo.hint.alt')" aria-hidden="true">i</span>
          </label>
          <textarea
            :id="`msd-f-${fieldKey('alt')}`"
            v-model="draft[fieldKey('alt')]"
            class="form-input"
            rows="2"
          ></textarea>

          <label class="form-label" :for="`msd-f-${fieldKey('title')}`">
            {{ t("mediaSeo.field.title") }}
          </label>
          <input
            :id="`msd-f-${fieldKey('title')}`"
            v-model="draft[fieldKey('title')]"
            class="form-input"
            type="text"
          />

          <label class="form-label" :for="`msd-f-${fieldKey('caption')}`">
            {{ t("mediaSeo.field.caption") }}
            <span class="msd__info" :title="t('mediaSeo.hint.caption')" aria-hidden="true">i</span>
          </label>
          <textarea
            :id="`msd-f-${fieldKey('caption')}`"
            v-model="draft[fieldKey('caption')]"
            class="form-input"
            rows="2"
          ></textarea>

          <!-- Endeksleme -->
          <section class="msd__sect">
            <button
              id="msd-s-index"
              type="button"
              class="msd__sect-h"
              :aria-expanded="sections.index"
              aria-controls="msd-sect-index"
              @click="sections.index = !sections.index"
            >
              {{ t("mediaSeo.section.indexability") }}
              <AppIcon :name="sections.index ? 'chevron-up' : 'chevron-down'" :size="14" />
            </button>
            <div v-show="sections.index" id="msd-sect-index" class="msd__sect-b">
              <label class="form-label" for="msd-f-visibility">
                {{ t("mediaSeo.field.visibility") }}
              </label>
              <select
                id="msd-f-visibility"
                class="form-input"
                :value="fields.indexability?.visibility || 'Public'"
                @change="emit('set-indexability', $event.target.value)"
              >
                <option
                  v-for="v in [
                    'Public',
                    'Unlisted',
                    'Protected',
                    'Temporary',
                    'Expired',
                    'Archived',
                    'Deleted',
                  ]"
                  :key="v"
                  :value="v"
                >
                  {{ v }}
                </option>
              </select>
              <code class="msd__robots">{{ fields.indexability?.robots || "—" }}</code>
            </div>
          </section>

          <!-- Haklar ve telif — tek dilli alanlar: dış yüzde render edilmiyorlar
               (panel içi arama ve hak yönetimi), dil sekmesinden etkilenmezler. -->
          <section class="msd__sect">
            <button
              id="msd-s-rights"
              type="button"
              class="msd__sect-h"
              :aria-expanded="sections.rights"
              aria-controls="msd-sect-rights"
              @click="sections.rights = !sections.rights"
            >
              {{ t("mediaSeo.section.rights") }}
              <span v-if="rightsEmpty" class="msd__sect-n">
                {{ t("mediaSeo.drawer.emptyN", { n: rightsEmpty }) }}
              </span>
              <AppIcon :name="sections.rights ? 'chevron-up' : 'chevron-down'" :size="14" />
            </button>
            <div v-show="sections.rights" id="msd-sect-rights" class="msd__sect-b">
              <label class="form-label" for="msd-f-creator">{{
                t("mediaSeo.field.creator")
              }}</label>
              <input id="msd-f-creator" v-model="draft.creator" class="form-input" type="text" />

              <label class="form-label" for="msd-f-creator_type">{{
                t("mediaSeo.field.creator_type")
              }}</label>
              <select id="msd-f-creator_type" v-model="draft.creator_type" class="form-input">
                <option value="">{{ t("mediaSeo.field.creatorTypeNone") }}</option>
                <option value="Person">Person</option>
                <option value="Organization">Organization</option>
              </select>

              <label class="form-label" for="msd-f-credit_text">{{
                t("mediaSeo.field.credit_text")
              }}</label>
              <input
                id="msd-f-credit_text"
                v-model="draft.credit_text"
                class="form-input"
                type="text"
              />

              <label class="form-label" for="msd-f-copyright_notice">{{
                t("mediaSeo.field.copyright_notice")
              }}</label>
              <input
                id="msd-f-copyright_notice"
                v-model="draft.copyright_notice"
                class="form-input"
                type="text"
              />

              <label class="form-label" for="msd-f-license_url">{{
                t("mediaSeo.field.license_url")
              }}</label>
              <input
                id="msd-f-license_url"
                v-model="draft.license_url"
                class="form-input"
                type="url"
              />

              <label class="form-label" for="msd-f-acquire_license_url">{{
                t("mediaSeo.field.acquire_license_url")
              }}</label>
              <input
                id="msd-f-acquire_license_url"
                v-model="draft.acquire_license_url"
                class="form-input"
                type="url"
              />

              <label class="form-label" for="msd-f-usage_rights">{{
                t("mediaSeo.field.usage_rights")
              }}</label>
              <textarea
                id="msd-f-usage_rights"
                v-model="draft.usage_rights"
                class="form-input"
                rows="2"
              ></textarea>

              <label class="form-label" for="msd-f-rights_expires_on">
                {{ t("mediaSeo.field.rights_expires_on") }}
                <span class="msd__info" :title="t('mediaSeo.hint.expires')" aria-hidden="true"
                  >i</span
                >
              </label>
              <input
                id="msd-f-rights_expires_on"
                v-model="draft.rights_expires_on"
                class="form-input"
                type="date"
              />
            </div>
          </section>

          <!-- Video -->
          <section v-if="isVideo" class="msd__sect">
            <button
              id="msd-s-video"
              type="button"
              class="msd__sect-h"
              :aria-expanded="sections.video"
              aria-controls="msd-sect-video"
              @click="sections.video = !sections.video"
            >
              {{ t("mediaSeo.section.video") }}
              <AppIcon :name="sections.video ? 'chevron-up' : 'chevron-down'" :size="14" />
            </button>
            <div v-show="sections.video" id="msd-sect-video" class="msd__sect-b">
              <span class="form-label">{{ t("mediaSeo.video.poster") }}</span>
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
                :disabled="rowBusy"
                @click="regeneratePoster"
              >
                {{ t("mediaSeo.video.regenerate") }}
              </button>

              <label class="form-label" for="msd-f-slug">
                {{ t("mediaSeo.video.watchSlug") }}
                <span class="msd__info" :title="t('mediaSeo.video.slugHint')" aria-hidden="true"
                  >i</span
                >
              </label>
              <div class="msd__slug-row">
                <input
                  id="msd-f-slug"
                  v-model="slugDraft"
                  class="form-input"
                  type="text"
                  :disabled="rowBusy"
                  :placeholder="t('mediaSeo.field.slug')"
                />
                <button
                  type="button"
                  class="hdr-btn-outlined"
                  :disabled="
                    rowBusy || !slugDraft.trim() || slugDraft.trim() === (fields.slug || '')
                  "
                  @click="saveSlug"
                >
                  {{ t("mediaSeo.video.saveSlug") }}
                </button>
              </div>
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

              <label class="form-label" for="msd-f-transcript">{{
                t("mediaSeo.field.transcript")
              }}</label>
              <textarea
                id="msd-f-transcript"
                v-model="draft.transcript"
                class="form-input"
                rows="4"
              ></textarea>

              <label class="form-label" for="msd-f-captions">{{
                t("mediaSeo.field.captions")
              }}</label>
              <input
                id="msd-f-captions"
                type="file"
                accept=".vtt"
                :disabled="rowBusy"
                @change="onCaptionsFile"
              />
              <code v-if="fields.captions_url" class="msd__robots">{{ fields.captions_url }}</code>
            </div>
          </section>

          <!-- Kullanım bazlı metadata -->
          <section class="msd__sect">
            <button
              type="button"
              class="msd__sect-h"
              :aria-expanded="sections.usages"
              aria-controls="msd-sect-usages"
              @click="sections.usages = !sections.usages"
            >
              {{ t("mediaSeo.section.usages") }}
              <span v-if="(fields.usages || []).length" class="msd__sect-n">
                {{ (fields.usages || []).length }}
              </span>
              <AppIcon :name="sections.usages ? 'chevron-up' : 'chevron-down'" :size="14" />
            </button>
            <div v-show="sections.usages" id="msd-sect-usages" class="msd__sect-b">
              <p v-if="!(fields.usages || []).length" class="msd__hint">
                {{ t("mediaSeo.usage.none") }}
              </p>
              <article
                v-for="usage in fields.usages || []"
                :key="`${usage.ref_doctype}:${usage.ref_name}:${usage.ref_field}`"
                class="msd__usage"
              >
                <strong>{{ usage.label }}</strong>
                <small
                  >{{ usage.page_path }} · {{ usage.ref_doctype }} / {{ usage.ref_field }}</small
                >
                <label class="form-label">
                  {{ t("mediaSeo.usage.altFor", { lang: lang.toUpperCase() }) }}
                </label>
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
                >
                  {{ t("mediaSeo.usage.clearOverride") }}
                </button>
              </article>
            </div>
          </section>
        </div>
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

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }

    // MOGEM-625 · D — dokunmatikte alttan gelen sheet.
    //
    // Bu çekmecenin MOBİL SORGUSU HİÇ YOKTU: telefonda da 26rem'lik sağ
    // drawer olarak açılıyordu (ANIMATION_AUDIT §7.1.b'nin tarif ettiği
    // kusur). Sınır 1024px — panelin katlandığı, FAB'ın çıktığı, yani
    // ekranın "dokunmatik" saydığı aynı sınır.
    @media (max-width: media.$m-bp-rail) {
      @include media.touch-sheet;

      &::before {
        @include media.touch-sheet-grab;
      }
    }
  }

  // Giriş/çıkış — bu bileşende HİÇ geçiş yoktu, `v-if` ile anında beliriyordu.
  // Masaüstünde sağdan, dokunmatikte alttan: eleman geldiği yönden girer,
  // aynı yönden çıkar (mekansal tutarlılık).
  //
  // Süreler ASİMETRİK: giriş 320ms, çıkış 240ms — çıkış girişten hızlı olmalı
  // (ANIMATION_AUDIT §7.1.c).
  .msd-enter-active {
    transition:
      transform $d-sheet $ease-drawer,
      opacity $d-fast ease-out;
  }

  .msd-leave-active {
    transition:
      transform $d-modal $ease-drawer,
      opacity $d-fast ease-out;
  }

  .msd-enter-from,
  .msd-leave-to {
    opacity: 0;
    transform: translateX(100%);
  }

  @media (max-width: media.$m-bp-rail) {
    // %105: gölge payı da ekran dışında kalsın.
    .msd-enter-from,
    .msd-leave-to {
      opacity: 1;
      transform: translateY(105%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .msd-enter-active,
    .msd-leave-active {
      transition: opacity $d-fast ease-out;
    }

    .msd-enter-from,
    .msd-leave-to {
      opacity: 0;
      transform: none;
    }
  }

  .msd__scroll {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .msd__head {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    padding: media.$s-3 media.$s-4;
    border-bottom: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
  }

  .msd__thumb {
    width: 2.25rem;
    height: 2.25rem;
    flex: none;
    border-radius: media.$r-sm;
    border: 1px solid $l-border;
    background: $l-bg-muted;
    overflow: hidden;
    display: grid;
    place-items: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    em {
      font-style: normal;
      font-size: 0.5625rem;
      font-weight: 700;
      color: $l-text-500;
    }
    @include dark {
      border-color: $d-border;
      background: $d-bg-elevated;
      em {
        color: $d-text-muted;
      }
    }
  }

  .msd__title {
    flex: 1;
    min-width: 0;
    strong {
      display: block;
      @include media.text("body");
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    small {
      @include media.text("xs");
      color: $l-text-500;
      font-variant-numeric: tabular-nums;
      @include dark {
        color: $d-text-muted;
      }
    }
  }

  .msd__close {
    background: none;
    border: 0;
    cursor: pointer;
    color: $l-text-500;
    flex: none;
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

  /* ── Görev listesi ── */
  .msd__todo-wrap {
    padding: media.$s-3 media.$s-4 0;
  }

  .msd__prog {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin-block-end: media.$s-2;

    b {
      @include media.text("xs");
      font-variant-numeric: tabular-nums;
    }
  }

  .msd__prog-left {
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }

  .msd__prog-track {
    flex: 1;
    height: 0.375rem;
    border-radius: 999px;
    background: $l-bg-muted;
    overflow: hidden;

    i {
      display: block;
      height: 100%;
      background: $brand;
      border-radius: inherit;
      transition: width $t-base;
    }
    @include dark {
      background: $d-bg-elevated;
    }
  }

  .msd__todo {
    list-style: none;
    margin: 0;
    padding: 0;
    border: 1px solid $l-border;
    border-radius: media.$r-md;
    overflow: hidden;
    @include dark {
      border-color: $d-border;
    }
  }

  .msd__task {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    padding: media.$s-2 media.$s-3;
    @include media.text("xs");

    + .msd__task {
      border-top: 1px solid $l-border-alt;
      @include dark {
        border-color: $d-border-inner;
      }
    }
  }

  .msd__task-cb {
    width: 0.9375rem;
    height: 0.9375rem;
    flex: none;
    border-radius: 50%;
    border: 2px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
  }

  .msd__task--error:not(.msd__task--done) .msd__task-cb {
    border-color: $c-error;
  }

  .msd__task--done {
    color: $l-text-400;

    .msd__task-cb {
      border-color: $c-success;
      background: $c-success;
    }
    @include dark {
      color: $d-text-faint;
    }
  }

  .msd__task-text {
    flex: 1;
    min-width: 0;

    small {
      display: block;
      color: $l-text-400;
      @include dark {
        color: $d-text-faint;
      }
    }
  }

  .msd__task-go {
    flex: none;
    border: 0;
    background: none;
    cursor: pointer;
    @include media.text("xs");
    font-weight: 700;
    color: $brand;
    padding: media.$s-1;
    @include dark {
      color: $brand-light;
    }
  }

  /* ── Dil sekmesi — segmented ── */
  .msd__langbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: media.$s-2;
    margin: media.$s-3 media.$s-4 0;
  }

  .msd__langs {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    border-radius: media.$r-sm;
    background: $l-bg-muted;
    @include dark {
      background: $d-bg-elevated;
    }
  }

  .msd__gen {
    display: inline-flex;
    align-items: center;
    gap: media.$s-1;
    padding: media.$s-1 media.$s-2;
    border: 1px solid $l-border;
    border-radius: media.$r-sm;
    background: $l-bg;
    color: $l-text-700;
    @include media.text("xs");
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;

    &:hover:not(:disabled) {
      border-color: $brand;
    }
    &:disabled {
      opacity: 0.55;
      cursor: default;
    }
    @include dark {
      border-color: $d-border;
      background: $d-bg-card;
      color: $d-text;
    }
  }

  .msd__lang {
    padding: media.$s-1 media.$s-3;
    border: 0;
    border-radius: calc(media.$r-sm - 2px);
    background: none;
    color: $l-text-500;
    @include media.text("xs");
    font-weight: 700;
    cursor: pointer;

    &--active {
      background: $l-bg;
      color: $l-text-900;
      box-shadow: 0 1px 2px rgb(0 0 0 / 8%);
    }
    @include dark {
      color: $d-text-muted;
      &.msd__lang--active {
        background: $d-bg-card;
        color: $d-text-hi;
      }
    }
  }

  .msd__form {
    display: flex;
    flex-direction: column;
    gap: media.$s-1;
    padding: media.$s-3 media.$s-4 media.$s-4;
  }

  /* ── Katlanır bölümler ── */
  .msd__sect {
    border: 1px solid $l-border;
    border-radius: media.$r-md;
    margin-block-start: media.$s-2;
    overflow: hidden;
    @include dark {
      border-color: $d-border;
    }
  }

  .msd__sect-h {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    width: 100%;
    padding: media.$s-2 media.$s-3;
    border: 0;
    background: $l-bg-soft;
    cursor: pointer;
    @include media.text("sm");
    font-weight: 700;
    color: $l-text-700;
    text-align: start;

    > svg {
      margin-inline-start: auto;
      color: $l-text-400;
    }
    @include dark {
      background: $d-bg-elevated;
      color: $d-text;
      > svg {
        color: $d-text-faint;
      }
    }
  }

  .msd__sect-n {
    @include media.text("xs");
    font-weight: 700;
    padding: 0 media.$s-2;
    border-radius: 999px;
    background: media.$tint-warning;
    color: $c-warning;
  }

  .msd__sect-b {
    display: flex;
    flex-direction: column;
    gap: media.$s-1;
    padding: media.$s-2 media.$s-3 media.$s-3;
  }

  .msd__robots {
    @include media.text("xs");
    color: $l-text-500;
    background: $l-bg-muted;
    border-radius: media.$r-sm;
    padding: media.$s-1 media.$s-2;
    word-break: break-all;
    @include dark {
      color: $d-text-muted;
      background: $d-bg-elevated;
    }
  }

  .msd__info {
    display: inline-grid;
    place-items: center;
    width: 0.875rem;
    height: 0.875rem;
    border-radius: 50%;
    background: $l-bg-muted;
    color: $l-text-500;
    font-size: 0.5625rem;
    font-weight: 700;
    font-style: normal;
    margin-inline-start: media.$s-1;
    cursor: help;
    @include dark {
      background: $d-bg-elevated;
      color: $d-text-muted;
    }
  }

  .msd__usage {
    display: grid;
    gap: media.$s-2;
    padding: media.$s-3;
    border: 1px solid $l-border;
    border-radius: media.$r-sm;
    small {
      color: $l-text-400;
      word-break: break-all;
    }
    @include dark {
      border-color: $d-border;
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
    padding: media.$s-3 media.$s-4;
    border-top: 1px solid $l-border;
    background: inherit;
    @include dark {
      border-color: $d-border;
    }
  }

  .msd__dims {
    @include media.text("xs");
    color: $l-text-400;
    font-variant-numeric: tabular-nums;
  }

  .msd__foot-actions {
    display: flex;
    gap: media.$s-2;
  }
</style>
