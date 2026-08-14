<template>
  <aside class="detail" :class="{ 'detail--sheet': sheet }" aria-labelledby="media-detail-title">
    <header class="detail__head">
      <h2 id="media-detail-title" class="detail__title">{{ t("media.detail.title") }}</h2>
      <button
        type="button"
        class="detail__close"
        :aria-label="t('media.detail.close')"
        @click="emit('close')"
      >
        <AppIcon name="x" :size="18" />
      </button>
    </header>

    <div class="detail__scroll">
      <MediaThumb :item="item" ratio="wide" :icon-size="40" class="detail__preview" />

      <p v-if="!editable" class="detail__notice">
        <AppIcon name="lock" :size="14" />
        {{ t("media.detail.sharedReadonly") }}
      </p>

      <div class="detail__field">
        <label :for="`name-${item.id}`">{{ t("media.detail.fileName") }}</label>
        <div class="detail__inline">
          <input
            :id="`name-${item.id}`"
            v-model="draft.fileName"
            type="text"
            :disabled="!editable"
          />
          <button
            type="button"
            class="detail__mini"
            :title="t('media.actions.copyLink')"
            :aria-label="t('media.actions.copyLink')"
            @click="emit('action', 'copyLink')"
          >
            <AppIcon name="copy" :size="15" />
          </button>
        </div>
      </div>

      <dl class="detail__facts">
        <div class="detail__fact">
          <dt>{{ t("media.detail.size") }}</dt>
          <dd>{{ formatBytes(item.bytes) }}</dd>
        </div>
        <div class="detail__fact">
          <dt>{{ t("media.detail.dimensions") }}</dt>
          <dd>{{ formatDimensions(item) }}</dd>
        </div>
        <div class="detail__fact">
          <dt>{{ t("media.detail.uploadedAt") }}</dt>
          <dd>{{ formatDate(item.uploadedAt, locale) }}</dd>
        </div>
        <div v-if="item.kind === 'video' && item.videoStatus" class="detail__fact">
          <dt>{{ t("media.detail.videoStatus") }}</dt>
          <dd>{{ t(`media.video.${item.videoStatus}`) }}</dd>
        </div>
      </dl>

      <div class="detail__field">
        <label :for="`title-${item.id}`">{{ t("media.detail.mediaTitle") }}</label>
        <input :id="`title-${item.id}`" v-model="draft.title" type="text" :disabled="!editable" />
      </div>

      <div class="detail__field">
        <label :for="`alt-${item.id}`">{{ t("media.detail.alt") }}</label>
        <input :id="`alt-${item.id}`" v-model="draft.alt" type="text" :disabled="!editable" />
      </div>

      <div class="detail__field">
        <label :for="`desc-${item.id}`">{{ t("media.detail.description") }}</label>
        <textarea
          :id="`desc-${item.id}`"
          v-model="draft.description"
          rows="3"
          :disabled="!editable"
        />
      </div>

      <div class="detail__field">
        <label :for="`tag-${item.id}`">{{ t("media.detail.tags") }}</label>
        <ul class="detail__tags">
          <li v-for="tag in draft.tags" :key="tag" class="detail__tag">
            {{ tag }}
            <button
              v-if="editable"
              type="button"
              :aria-label="t('media.detail.removeTag', { tag })"
              @click="removeTag(tag)"
            >
              <AppIcon name="x" :size="12" />
            </button>
          </li>
          <li v-if="!draft.tags.length" class="detail__tag-empty">
            {{ t("media.detail.noTags") }}
          </li>
        </ul>
        <input
          :id="`tag-${item.id}`"
          v-model="tagInput"
          type="text"
          :placeholder="t('media.detail.tagPlaceholder')"
          :disabled="!editable"
          @keydown.enter.prevent="addTag"
        />
      </div>

      <div v-if="editable" class="detail__field">
        <span class="detail__label">{{ t("media.actions.replace") }}</span>
        <label class="detail__replace">
          <AppIcon name="refresh-cw" :size="15" />
          {{ t("media.detail.replaceHint") }}
          <input type="file" :accept="ACCEPT" @change="onReplace" />
        </label>
      </div>

      <!--
        Üç durum ayrı tutuluyor: doğrulanmadı / kullanılıyor / kullanılmıyor.
        Eskiden yalnız ikisi vardı ve doğrulanmamış hâl "kullanılmıyor" diye
        gösteriliyordu. Silme kararını besleyen bir ekranda en tehlikeli hata
        budur: bilinmeyeni "boş" saymak. Bilinmiyorsa bilinmiyor yazar.
      -->
      <div class="detail__field">
        <span class="detail__label">{{ t("media.detail.usedIn") }}</span>
        <p v-if="!Array.isArray(item.usageDetail)" class="detail__usage-unknown">
          <AppIcon name="circle-alert" :size="14" />
          {{ t("media.detail.usageUnknown") }}
        </p>
        <ul v-else-if="item.usageDetail.length" class="detail__usage">
          <li v-for="use in item.usageDetail" :key="use.id">
            <AppIcon name="package" :size="14" />
            <span>{{ use.label }}</span>
            <code>{{ use.id }}</code>
          </li>
        </ul>
        <p v-else class="detail__usage-empty">{{ t("media.detail.notUsed") }}</p>
      </div>
    </div>

    <footer class="detail__foot">
      <button
        type="button"
        class="detail__btn detail__btn--primary"
        :disabled="!editable || !dirty"
        @click="save"
      >
        {{ t("media.detail.save") }}
      </button>
      <button type="button" class="detail__btn" @click="emit('action', 'download')">
        <AppIcon name="download" :size="15" />
        {{ t("media.actions.download") }}
      </button>
      <button
        type="button"
        class="detail__btn"
        :disabled="!editable"
        @click="emit('action', 'archive')"
      >
        <AppIcon :name="item.archived ? 'archive-restore' : 'archive'" :size="15" />
        {{ item.archived ? t("media.actions.unarchive") : t("media.actions.archive") }}
      </button>
      <!--
        Ürününde kullanılan dosya silinemez. Düğme açık kalsaydı basılınca
        arka taraf reddeder, kullanıcı da sebebini göremezdi.
      -->
      <button
        type="button"
        class="detail__btn detail__btn--danger"
        :disabled="!editable || inUse"
        :title="inUse ? t('media.actions.deleteBlocked') : t('media.actions.purge')"
        @click="emit('action', 'delete')"
      >
        <AppIcon name="trash-2" :size="15" />
        {{ t("media.actions.purge") }}
      </button>
    </footer>
  </aside>
</template>

<script setup>
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import MediaThumb from "@/components/media/MediaThumb.vue";
  import { formatBytes, formatDate, formatDimensions } from "@/utils/mediaFormat";

  const props = defineProps({
    item: { type: Object, required: true },
    editable: { type: Boolean, default: true },
    /** Sütun olarak değil, ekrana sabit sheet olarak açıl (<1280px). */
    sheet: { type: Boolean, default: false },
  });
  const emit = defineEmits(["save", "action", "replace", "close"]);

  /** Kendi ürünlerinde kullanılıyor mu — silme buna göre kapanır. */
  const inUse = computed(() => (props.item.liveUsage || 0) > 0);

  const { t, locale } = useI18n();

  const draft = ref(blank());
  const tagInput = ref("");

  const ACCEPT = "image/*,video/*,.pdf";

  function blank() {
    return { fileName: "", title: "", alt: "", description: "", tags: [] };
  }

  function onReplace(event) {
    const [file] = event.target.files || [];
    if (file) emit("replace", file);
    event.target.value = "";
  }

  const dirty = computed(
    () =>
      draft.value.fileName !== props.item.fileName ||
      draft.value.title !== props.item.title ||
      draft.value.alt !== props.item.alt ||
      draft.value.description !== props.item.description ||
      draft.value.tags.join("|") !== props.item.tags.join("|")
  );

  function addTag() {
    const value = tagInput.value.trim();
    if (!value || draft.value.tags.includes(value)) return;
    draft.value.tags = [...draft.value.tags, value];
    tagInput.value = "";
  }

  function removeTag(tag) {
    draft.value.tags = draft.value.tags.filter((x) => x !== tag);
  }

  function save() {
    emit("save", { ...draft.value, tags: [...draft.value.tags] });
  }

  // Seçili medya değişince taslağı tazele — kaydedilmemiş düzenleme taşınmasın.
  watch(
    () => props.item.id,
    () => {
      draft.value = {
        fileName: props.item.fileName,
        title: props.item.title,
        alt: props.item.alt,
        description: props.item.description,
        tags: [...props.item.tags],
      };
      tagInput.value = "";
    },
    { immediate: true }
  );
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .detail {
    display: flex;
    flex-direction: column;
    border: 1px solid $l-border;
    border-radius: media.$r-lg;
    background: $l-bg-soft;
    overflow: hidden;
    // Sticky sütun: header (56px) + sayfa payı kadar aşağıdan başlıyor.
    max-height: calc(100vh - #{media.$m-header-h} - 3rem);

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  // Sütun olarak sığmayan genişliklerde sheet:
  //   768–1279px → sağa yaslı yan sheet
  //   ≤767px     → tam ekran (medya.md §Responsive)
  .detail--sheet {
    position: fixed;
    inset: 0 0 0 auto;
    z-index: 60;
    width: min(26rem, 100%);
    max-height: none;
    height: 100dvh;
    border-radius: 0;
    border: 0;
    border-inline-start: 1px solid $l-border;
    box-shadow: -12px 0 40px rgb(0 0 0 / 18%);

    @include dark {
      border-color: $d-border;
    }

    @media (max-width: media.$m-bp-md) {
      inset: 0;
      width: auto;
      border-inline-start: 0;
    }
  }

  .detail__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: media.$s-3 media.$s-4;
    border-bottom: 1px solid $l-border;

    @include dark {
      border-color: $d-border;
    }
  }

  .detail__title {
    margin: 0;
    @include media.text;
    font-weight: 620;
    color: $l-text-900;

    @include dark {
      color: $d-text-hi;
    }
  }

  .detail__close {
    width: 2.75rem;
    height: 2.75rem;
    display: grid;
    place-items: center;
    border: 0;
    background: none;
    color: $l-text-500;
    cursor: pointer;
    border-radius: media.$r-md;
    @include media.press(0.94);

    @include dark {
      color: $d-text-muted;
    }
  }

  // Normal blok akışı — grid/flex DEĞİL: oran kutusu (MediaThumb) yüzde padding
  // kullanıyor, yüzde padding grid/flex intrinsic satır ölçümünde 0 sayılıyor ve
  // önizleme 2px'e çöküp altındaki içeriğin üstüne biniyor.
  .detail__scroll {
    flex: 1;
    overflow-y: auto;
    padding: media.$s-4;
  }

  .detail__scroll > * + * {
    margin-top: media.$s-4;
  }

  .detail__preview {
    border-radius: media.$r-md;
    border: 1px solid $l-border-alt;

    @include dark {
      border-color: $d-border-inner;
    }
  }

  .detail__notice {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: 0;
    padding: media.$s-2 media.$s-3;
    border-radius: media.$r-md;
    @include media.text;
    color: $c-info;
    background: rgb(59 130 246 / 12%);
  }

  .detail__facts {
    margin: 0;
    display: grid;
    gap: 0;
  }

  .detail__fact {
    display: flex;
    justify-content: space-between;
    gap: media.$s-3;
    padding: media.$s-2 0;
    border-bottom: 1px solid $l-border-alt;
    @include media.text;

    @include dark {
      border-color: $d-border-inner;
    }

    &:last-child {
      border-bottom: 0;
    }

    dt {
      color: $l-text-500;

      @include dark {
        color: $d-text-muted;
      }
    }

    dd {
      margin: 0;
      font-weight: 550;
      color: $l-text-900;
      text-align: end;
      font-variant-numeric: tabular-nums;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 60%;

      @include dark {
        color: $d-text-hi;
      }
    }
  }

  .detail__field {
    display: grid;
    gap: media.$s-2;

    label,
    .detail__label {
      @include media.text;
      font-weight: 560;
      color: $l-text-600;

      @include dark {
        color: $d-text-muted;
      }
    }

    input,
    textarea {
      width: 100%;
      min-height: 2.75rem;
      padding: media.$s-2 media.$s-3;
      border: 1px solid $l-border;
      border-radius: media.$r-md;
      background: $l-bg;
      color: $l-text-900;
      font: inherit;
      @include media.text;

      @include dark {
        background: $d-bg;
        border-color: $d-border;
        color: $d-text;
      }

      &:focus {
        outline: 0;
        border-color: $brand;
        box-shadow: 0 0 0 3px $brand-glow;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    textarea {
      resize: vertical;
    }
  }

  .detail__inline {
    display: flex;
    gap: media.$s-2;

    input {
      flex: 1;
      min-width: 0;
    }
  }

  .detail__mini {
    @include media.button;
    @include media.focus-ring;

    flex-shrink: 0;
    width: 2.75rem;
    padding: 0;
    justify-content: center;
  }

  .detail__replace {
    @include media.button;
    @include media.focus-ring;

    justify-content: center;
    border-style: dashed;

    input {
      display: none;
    }
  }

  .detail__tags {
    display: flex;
    flex-wrap: wrap;
    gap: media.$s-2;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .detail__tag {
    display: inline-flex;
    align-items: center;
    gap: media.$s-1;
    padding: media.$s-1 media.$s-2;
    border-radius: media.$r-pill;
    background: $l-bg-muted;
    color: $l-text-700;
    @include media.text("sm");

    @include dark {
      background: $d-bg-elevated;
      color: $d-text;
    }

    button {
      display: grid;
      place-items: center;
      border: 0;
      background: none;
      color: inherit;
      cursor: pointer;
      opacity: 0.65;
    }
  }

  .detail__tag-empty,
  .detail__usage-empty {
    margin: 0;
    @include media.text("xs");
    color: $l-text-400;

    @include dark {
      color: $d-text-faint;
    }
  }

  .detail__usage {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: media.$s-2;

    li {
      display: flex;
      align-items: center;
      gap: media.$s-2;
      @include media.text("xs");
      color: $l-text-700;

      @include dark {
        color: $d-text;
      }
    }

    code {
      margin-inline-start: auto;
      @include media.text("xs");
      color: $l-text-400;

      @include dark {
        color: $d-text-faint;
      }
    }
  }

  .detail__foot {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: media.$s-2;
    padding: media.$s-4;
    border-top: 1px solid $l-border;

    @include dark {
      border-color: $d-border;
    }
  }

  // Sheet ekranın en altına dayanıyor: butonlar home indicator'ın altında kalmasın.
  .detail--sheet .detail__foot {
    padding-bottom: calc(#{media.$s-4} + env(safe-area-inset-bottom));
  }

  .detail__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: media.$s-2;
    min-height: 2.75rem;
    padding: 0 media.$s-3;
    border: 1px solid $l-border;
    border-radius: media.$r-md;
    background: $l-bg;
    color: $l-text-700;
    @include media.text;
    font-weight: 540;
    cursor: pointer;
    transition:
      background $t-fast,
      transform $d-press $ease-out;

    // Panelin ana eylemleri (Kaydet/İndir/Arşivle/Sil) — dokunma tepkisi şart.
    &:active:not(:disabled) {
      transform: scale(0.97);
    }

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      color: $d-text;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .detail__btn--primary {
    grid-column: span 2;
    background: $brand;
    border-color: transparent;
    color: $brand-ink;
    font-weight: 620;
  }

  .detail__btn--danger {
    color: $c-error;
  }
</style>
