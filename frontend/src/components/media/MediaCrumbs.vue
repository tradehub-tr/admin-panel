<script setup>
  import AppIcon from "@/components/common/AppIcon.vue";

  /**
   * Sanal klasör gezginlerinin kırıntı şeridi.
   *
   * Yönetici ve satıcı gezgini aynı ağaç dilini konuşuyor; şerit iki ekranda
   * ayrı ayrı yazılıysa biri güncellenip diğeri unutulur. Etiketleri çağıran
   * ekran hazırlar (kapsam adları i18n'den, klasör adları sunucudan) —
   * component yalnız çizer.
   */
  defineProps({
    /** `[{ key, label }]` — sonuncusu bulunulan klasör, tıklanamaz. */
    items: { type: Array, required: true },
    ariaLabel: { type: String, default: "" },
  });

  defineEmits(["jump"]);
</script>

<template>
  <nav class="mcrumbs" :aria-label="ariaLabel">
    <!-- Sıralı liste semantiği: ekran okuyucu "3 ögeden 2." diye okur, yani
         ağaçta ne kadar derinde olunduğu duyulur. Ayraç ikonu listenin DIŞINDA
         kalamayacağı için `aria-hidden` ile ağaçtan düşürülüyor — "chevron"
         diye okunması bilgi değil gürültü. -->
    <ol class="mcrumbs__list">
      <li v-for="(c, i) in items" :key="c.key" class="mcrumbs__li">
        <button
          v-if="i < items.length - 1"
          type="button"
          class="mcrumbs__item mcrumbs__item--link"
          @click="$emit('jump', c.key)"
        >
          <AppIcon v-if="i === 0" name="folder" :size="13" />
          {{ c.label }}
        </button>
        <!-- Bulunulan klasör aria-current ile işaretlenir: tıklanamaz olduğu
             görsel olarak belliydi, ekran okuyucuda değildi. -->
        <span v-else class="mcrumbs__item mcrumbs__item--here" aria-current="page">
          {{ c.label }}
        </span>
        <AppIcon
          v-if="i < items.length - 1"
          name="chevron-right"
          :size="13"
          class="mcrumbs__sep"
          aria-hidden="true"
        />
      </li>
    </ol>
  </nav>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .mcrumbs {
    flex: 1 1 auto;
    min-width: 0;
    @include media.text("sm");
  }

  .mcrumbs__list {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .mcrumbs__li {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    min-width: 0;
  }

  .mcrumbs__item {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 2px 6px;
    border-radius: 6px;
    font-weight: 600;
  }

  .mcrumbs__item--link {
    cursor: pointer;
    @include media.muted(1);
    @include media.hoverable;
    @include media.focus-ring;
  }

  .mcrumbs__item--here {
    color: $brand;
  }

  .mcrumbs__sep {
    @include media.muted(2);
  }
</style>
