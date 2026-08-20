<template>
  <div class="bulk" role="region" :aria-label="t('media.bulk.title')" :aria-busy="busy">
    <p class="bulk__count">{{ t("media.bulk.selected", { count }) }}</p>

    <!-- ── Klasöre taşı (T-094) ──
         Yalnız `folders` verildiğinde çizilir: klasör kavramı olmayan ekran
         (kütüphane bugün klasör listesi geçirmiyor) bu kontrolü hiç görmez.
         Hedef listesi ekrandan gelir — çubuk uç bilmez, seçimi yukarı verir. -->
    <div v-if="folders" class="bulk__movebox">
      <select
        v-model="moveTarget"
        :aria-label="t('media.bulk.moveTarget', {}, 'Hedef klasör')"
        :disabled="busy"
      >
        <option value="">{{ t("media.bulk.moveRoot", {}, "Kök — klasörsüz") }}</option>
        <option v-for="f in folders" :key="f.name" :value="f.name">
          {{ f.label || f.folder_name }}
        </option>
      </select>
      <button type="button" class="bulk__btn" :disabled="busy" @click="emit('move', moveTarget)">
        <AppIcon name="folder-open" :size="15" />
        {{ t("media.bulk.move", {}, "Taşı") }}
      </button>
    </div>

    <div v-if="!moveOnly" class="bulk__tagbox">
      <input
        v-model="tag"
        type="text"
        :placeholder="t('media.bulk.tagPlaceholder')"
        :aria-label="t('media.bulk.tagPlaceholder')"
        :disabled="busy"
        @keydown.enter.prevent="applyTag"
      />
      <button type="button" class="bulk__btn" :disabled="busy || !tag.trim()" @click="applyTag">
        <AppIcon name="tag" :size="15" />
        {{ t("media.bulk.tag") }}
      </button>
    </div>

    <button
      v-if="!moveOnly"
      type="button"
      class="bulk__btn"
      :disabled="busy"
      @click="emit('download')"
    >
      <AppIcon name="download" :size="15" />
      {{ t("media.bulk.download") }}
    </button>
    <!-- Arşiv görünümünde bu düğme geri ALIR; etiketi de öyle demeli. Sabit
         "Arşivle" yazıyordu, yani arşivdeki dosyada yanlış işi vaat ediyordu. -->
    <button
      v-if="!moveOnly"
      type="button"
      class="bulk__btn"
      :disabled="busy"
      @click="emit('archive')"
    >
      <AppIcon :name="archived ? 'archive-restore' : 'archive'" :size="15" />
      {{ archived ? t("media.bulk.unarchive") : t("media.bulk.archive") }}
    </button>
    <button
      v-if="!moveOnly"
      type="button"
      class="bulk__btn bulk__btn--danger"
      :disabled="busy"
      @click="emit('delete')"
    >
      <AppIcon name="trash-2" :size="15" />
      {{ t("media.bulk.delete") }}
    </button>
    <button type="button" class="bulk__btn" :disabled="busy" @click="emit('clear')">
      {{ t("media.bulk.clear") }}
    </button>

    <!-- İşlem sürüyor. Yüzde YOK: uçlar listenin tamamını tek istekte işleyip
         tek yanıt döndürüyor, aradan ölçülecek bir ilerleme gelmiyor. Uydurma
         çubuk çizmektense süregeldiğini söylemek doğru. -->
    <p v-if="busy" class="bulk__status" role="status">
      <AppIcon name="loader-circle" :size="14" class="bulk__spin" />
      {{ t("media.bulk.running") }}
    </p>

    <!--
      KISMİ SONUÇ — T-094'ün "48 başarılı, 2 başarısız" şartı.

      Önceden bu bilgi hiç ekrana gelmiyordu: arka taraf `failed` ve `skipped`
      döndürüyor, ekran yalnız başarı sayacını okuyordu. 50 dosyadan 2'si hata
      verdiğinde kullanıcı "48 medya arşivlendi" görüp işlemin bittiğini
      sanıyordu.

      `role="alert"`: kısmi sonuç kullanıcının müdahale etmesi gereken bir
      durum, sessizce geçilecek bir bildirim değil.
    -->
    <div v-if="report" class="bulk__report" role="alert">
      <p class="bulk__report-head">
        <AppIcon name="triangle-alert" :size="14" />
        {{
          t("media.bulk.partial", {
            ok: report.ok,
            failed: report.failed.length,
            skipped: report.skipped,
          })
        }}
      </p>

      <!-- Hangi dosya olduğu söylenmezse kullanıcı 50 dosyayı tek tek
           deneyerek bulmak zorunda kalır. İlk birkaçı yazılır, gerisi sayı. -->
      <ul v-if="report.failed.length" class="bulk__report-list">
        <li v-for="row in shownFailures" :key="row.id">
          <b>{{ nameOf(row.id) }}</b>
          <span>{{ row.error || t("media.bulk.failedUnknown") }}</span>
        </li>
        <li v-if="report.failed.length > shownFailures.length">
          {{ t("media.bulk.failedMore", { count: report.failed.length - shownFailures.length }) }}
        </li>
      </ul>

      <!-- Atlananın sebebi tek: dosya bu mağazanın değil. Arka taraf hangisi
           olduğunu bilerek söylemiyor (sahibi olunmayan bir adresin varlığını
           doğrulamak keşif kapısı açar), o yüzden burada da yalnız sayı var. -->
      <p v-if="report.skipped" class="bulk__report-note">
        {{ t("media.bulk.skippedNote", { count: report.skipped }) }}
      </p>

      <button type="button" class="bulk__report-close" @click="emit('dismiss-report')">
        {{ t("media.bulk.dismissReport") }}
      </button>
    </div>
  </div>
</template>

<script setup>
  import { computed, ref } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";

  /** Listede kaç hatalı dosya adı gösterilecek — gerisi "ve n tane daha". */
  const MAX_SHOWN_FAILURES = 4;

  const props = defineProps({
    count: { type: Number, required: true },
    /** Arşiv görünümünde miyiz — düğmeler tersine döner. */
    archived: { type: Boolean, default: false },
    /** Toplu işlem sürüyor — düğmeler kilitli. */
    busy: { type: Boolean, default: false },
    /**
     * Son toplu işlemin dökümü — `{ ok, failed: [{id,error}], skipped }`.
     * `null` = eksik kalan bir şey yok, gösterilecek bir şey de yok.
     */
    report: { type: Object, default: null },
    /**
     * Taşıma hedefleri — `[{ name, folder_name, label? }]` (T-094).
     * `null` = ekranda klasör kavramı yok, taşıma kontrolü hiç çizilmez.
     */
    folders: { type: Array, default: null },
    /** Yalnız taşıma: etiket/indir/arşiv/sil düğmeleri gizlenir (gezgin). */
    moveOnly: { type: Boolean, default: false },
  });
  const emit = defineEmits([
    "tag",
    "download",
    "archive",
    "delete",
    "clear",
    "dismiss-report",
    "move",
  ]);

  const { t } = useI18n();
  const tag = ref("");
  /** Seçili taşıma hedefi — "" köke taşır (klasör bağını söker). */
  const moveTarget = ref("");

  const shownFailures = computed(() => (props.report?.failed || []).slice(0, MAX_SHOWN_FAILURES));

  /**
   * Kimlik dosyanın ADRESİ (`/files/vana.webp`); kullanıcıya tam yol değil
   * dosya adı gösterilir — yol ekranda hiçbir yerde geçmiyor.
   */
  function nameOf(id) {
    return (
      String(id || "")
        .split("/")
        .pop() ||
      id ||
      "—"
    );
  }

  function applyTag() {
    const value = tag.value.trim();
    if (!value || props.busy) return;
    emit("tag", value);
    tag.value = "";
  }
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .bulk {
    position: fixed;
    inset-inline-start: 50%;
    bottom: 1.25rem;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: media.$s-2;
    max-width: calc(100vw - 2rem);
    padding: media.$s-3 media.$s-3;
    transform: translateX(-50%);
    border-radius: media.$r-lg;
    box-shadow: 0 12px 36px rgb(26 26 26 / 16%);
    @include media.surface("raised");

    // Mobilde ekranın altında 64px'lik tab bar var; çubuk onun üstünde,
    // ortalanmış dar bir ada yerine kenardan kenara bir şerit olarak durur —
    // 16px tipografiyle 6 buton ortalanınca çubuk yarım ekranı kaplıyordu.
    @media (max-width: media.$m-bp-md) {
      inset-inline: media.$s-3;
      bottom: media.$m-float-bottom;
      transform: none;
      max-width: none;
      justify-content: stretch;
    }
  }

  .bulk__count {
    margin: 0 media.$s-1 0 media.$s-2;
    @include media.text("xs");
    @include media.heading;
    @include media.numeric;

    @media (max-width: media.$m-bp-md) {
      flex: 1 1 100%;
      margin-inline: 0;
      text-align: center;
    }
  }

  .bulk__tagbox {
    display: flex;
    align-items: center;
    gap: media.$s-2;

    input {
      @include media.field-input;

      width: 9rem;
    }

    @media (max-width: media.$m-bp-md) {
      flex: 1 1 100%;

      input {
        flex: 1;
        width: auto;
        min-width: 0;
      }
    }
  }

  // Taşıma kutusu etiket kutusuyla aynı dili konuşur — iki giriş kontrolü
  // yan yana farklı görünürse çubuk iki ayrı araçtan yapılmış gibi durur.
  .bulk__movebox {
    display: flex;
    align-items: center;
    gap: media.$s-2;

    select {
      @include media.field-input;

      max-width: 12rem;
    }

    @media (max-width: media.$m-bp-md) {
      flex: 1 1 100%;

      select {
        flex: 1;
        max-width: none;
        min-width: 0;
      }
    }
  }

  // "İşlem sürüyor" satırı — çubuğun sonunda kendi satırında.
  .bulk__status {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    flex: 1 1 100%;
    margin: 0;
    @include media.text("xs");
    @include media.muted(1);
  }

  .bulk__spin {
    animation: bulk-spin 0.9s linear infinite;

    // Hareket azaltma tercihinde dönmez; ikon yine "bekleniyor" anlamını
    // taşıyor, metin zaten aynı şeyi söylüyor.
    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }

  @keyframes bulk-spin {
    to {
      transform: rotate(360deg);
    }
  }

  // ── Kısmi sonuç dökümü ───────────────────────────────────────────
  .bulk__report {
    flex: 1 1 100%;
    padding: media.$s-3;
    border: 1px solid rgba(245, 158, 11, 0.45);
    border-radius: media.$r-md;
    background: rgba(245, 158, 11, 0.1);
  }

  .bulk__report-head {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: 0;
    @include media.text("xs");
    @include media.heading;
    color: $c-warning;
  }

  .bulk__report-list {
    margin: media.$s-2 0 0;
    padding: 0;
    list-style: none;
    @include media.text("xs");

    li {
      display: flex;
      gap: media.$s-2;
      // Uzun hata metni çubuğu ekran dışına taşırmasın.
      overflow-wrap: anywhere;
    }

    b {
      flex-shrink: 0;
      font-weight: 600;
    }

    span {
      @include media.muted(1);
    }
  }

  .bulk__report-note {
    margin: media.$s-2 0 0;
    @include media.text("xs");
    @include media.muted(1);
  }

  .bulk__report-close {
    margin-top: media.$s-2;
    @include media.text("xs");
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
    @include media.focus-ring;
  }

  .bulk__btn {
    @include media.button;
    @include media.focus-ring;

    &:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    &--danger {
      @include media.button("danger");
    }

    // Mixin'den SONRA: media.button `padding` kısayolunu yeniden yazıyor.
    @media (max-width: media.$m-bp-md) {
      flex: 1 1 auto;
      justify-content: center;
      padding-inline: media.$s-3;
    }
  }
</style>
