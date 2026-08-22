<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import { DIMENSIONS } from "@/composables/useMediaSeo";

  const props = defineProps({
    score: { type: Object, default: () => ({}) },
    total: { type: Number, default: 0 },
  });

  const { t } = useI18n();

  /** Tek not yerine kırılım: "81/100" hangi tarafın zayıf olduğunu söylemiyor.
   *  Backend ağırlıkları EŞİT tutuyor (henüz ölçüm yok); burada da eşit
   *  gösteriliyor — sıralama uydurma bir öncelik ima etmesin diye sabit. */
  const bars = computed(() =>
    DIMENSIONS.map((key) => ({
      key,
      value: Number(props.score?.[key] ?? 0),
    }))
  );

  const overall = computed(() => Number(props.score?.overall ?? 0));

  function tone(v) {
    if (v >= 85) return "good";
    if (v >= 60) return "mid";
    return "bad";
  }
</script>

<template>
  <div class="card msc">
    <div class="msc__overall" :class="`msc__overall--${tone(overall)}`">
      <strong>{{ overall }}</strong>
      <span>{{ t("mediaSeo.score.overall") }}</span>
      <small>{{ t("mediaSeo.score.scanned", { n: total }) }}</small>
    </div>

    <div class="msc__bars">
      <div v-for="b in bars" :key="b.key" class="msc__bar">
        <div class="msc__bar-head">
          <span>{{ t(`mediaSeo.score.${b.key}`) }}</span>
          <strong :class="`msc__val--${tone(b.value)}`">{{ b.value }}</strong>
        </div>
        <!-- Çubuk `aria-hidden`: sayı zaten yanında yazıyor, ekran okuyucu
             aynı bilgiyi iki kez okumasın. -->
        <div class="msc__track" aria-hidden="true">
          <div class="msc__fill" :class="`msc__fill--${tone(b.value)}`" :style="{ width: `${b.value}%` }" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .msc {
    display: flex;
    gap: media.$s-5;
    align-items: center;
    padding: media.$s-4;
    flex-wrap: wrap;
  }

  .msc__overall {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 7rem;

    strong {
      @include media.text("display");
      font-weight: 800;
      line-height: 1;
    }
    span {
      @include media.text("sm");
      color: $l-text-600;
    }
    small {
      @include media.text("xs");
      color: $l-text-400;
    }
    &--good strong {
      color: $c-success;
    }
    &--mid strong {
      color: $c-warning;
    }
    &--bad strong {
      color: $c-error;
    }
    @include dark {
      span {
        color: $d-text-muted;
      }
      small {
        color: $d-text-faint;
      }
    }
  }

  .msc__bars {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: media.$s-3;
    flex: 1 1 20rem;
  }

  .msc__bar-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: media.$s-1;
    @include media.text("xs");
    color: $l-text-600;
    @include dark {
      color: $d-text-muted;
    }
  }

  .msc__val--good {
    color: $c-success;
  }
  .msc__val--mid {
    color: $c-warning;
  }
  .msc__val--bad {
    color: $c-error;
  }

  .msc__track {
    height: 6px;
    border-radius: 3px;
    background: $l-bg-muted;
    overflow: hidden;
    margin-top: media.$s-05;
    @include dark {
      background: $d-bg-elevated;
    }
  }

  .msc__fill {
    height: 100%;
    transition: width $t-base;
    &--good {
      background: $c-success;
    }
    &--mid {
      background: $c-warning;
    }
    &--bad {
      background: $c-error;
    }
  }
</style>
