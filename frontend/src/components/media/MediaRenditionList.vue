<script setup>
  import { computed, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { useMediaRenditions } from "@/composables/useMediaRenditions";
  import { formatBytes } from "@/utils/mediaFormat";

  /**
   * Bir dosyanın türev listesi — boru hattı bu dosyadan ne üretti.
   *
   * Boş durum BİRİNCİ SINIF: `Media Rendition` tablosu şu an boş (bayraklar
   * kapalı, hiçbir türev üretilmedi). Ekran bunu bir arıza gibi göstermez;
   * "henüz üretilmedi" der ve sebebi yazar. Bayrak açılıp boru hattı
   * çalıştığında aynı bileşen doldurur — ikinci bir ekran gerekmeyecek.
   *
   * Tablo semantiği bilinçli: kolonlu sayısal veri liste değil tablodur,
   * ekran okuyucu "genişlik sütunu, 384" diye okuyabilsin.
   */
  const props = defineProps({
    /** `File` docname. Boşsa hiç istek atılmaz. */
    fileName: { type: String, default: "" },
    /** Bölüm başlığının id'si — çağıran `aria-labelledby` kurabilsin. */
    headingId: { type: String, default: "" },
  });

  const { t } = useI18n();
  // Composable ref döndürüyor; destructure reaktifliği bozmaz (kural 4'ün
  // hedefi `reactive()` nesneleri).
  const { rows, loading, emptyReason, error, denied, load } = useMediaRenditions();

  watch(
    () => props.fileName,
    (name) => load(name),
    { immediate: true }
  );

  const totalBytes = computed(() => rows.value.reduce((sum, row) => sum + row.bytes, 0));

  /** Boş/arıza durumlarının TEK metni — şablonda dallanma çoğalmasın. */
  const notice = computed(() => {
    if (loading.value) return { icon: "loader", text: t("media.renditions.loading") };
    if (denied.value) return { icon: "lock", text: t("media.renditions.denied") };
    if (error.value) return { icon: "circle-alert", text: t("media.renditions.failed") };
    if (!rows.value.length) {
      return {
        icon: "clock",
        text:
          emptyReason.value === "noAsset"
            ? t("media.renditions.notInPipeline")
            : t("media.renditions.notGenerated"),
      };
    }
    return null;
  });
</script>

<template>
  <section class="mrend" :aria-busy="loading">
    <h3 :id="headingId || undefined" class="mrend__title">
      <AppIcon name="layers" :size="14" />
      {{ t("media.renditions.title") }}
      <span v-if="rows.length" class="mrend__count">
        {{ t("media.renditions.count", { n: rows.length }) }}
      </span>
    </h3>

    <p v-if="notice" class="mrend__notice">
      <AppIcon :name="notice.icon" :size="14" />
      {{ notice.text }}
    </p>

    <table v-else class="mrend__table">
      <caption class="mrend__caption">
        {{
          t("media.renditions.caption", { bytes: formatBytes(totalBytes) })
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">{{ t("media.renditions.col.profile") }}</th>
          <th scope="col">{{ t("media.renditions.col.size") }}</th>
          <th scope="col">{{ t("media.renditions.col.format") }}</th>
          <th scope="col" class="mrend__num">{{ t("media.renditions.col.bytes") }}</th>
          <th scope="col" class="mrend__num">{{ t("media.renditions.col.ssim") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <th scope="row" class="mrend__profile">{{ row.profile || "—" }}</th>
          <td>{{ row.width && row.height ? `${row.width} × ${row.height}` : "—" }}</td>
          <td>{{ row.format || "—" }}</td>
          <td class="mrend__num">{{ formatBytes(row.bytes) }}</td>
          <!-- SSIM ölçülmemişse 0 gelir; "0,00" yazmak ölçüm eksikliğini
               kalite sorunu gibi gösterirdi. -->
          <td class="mrend__num">{{ row.ssim ? row.ssim.toFixed(3) : "—" }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .mrend {
    margin-top: media.$s-4;
  }

  .mrend__title {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: 0 0 media.$s-2;
    @include media.text("sm");
    font-weight: 700;
    @include media.heading;
  }

  .mrend__count {
    @include media.text("xs");
    @include media.muted(1);
    font-weight: 600;
  }

  .mrend__notice {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: 0;
    padding: media.$s-3;
    border-radius: media.$r-md;
    @include media.text("sm");
    // Metin rengi bilinçli olarak `muted(1)` DEĞİL: bu satır ekranın tek
    // bilgisi olduğunda okunabilirliği kontrast oranına bağlı (bkz.
    // mediaAccessibility testi).
    color: $l-text-900;
    background: $l-bg-muted;

    @include dark {
      color: $d-text;
      background: $d-bg-elevated;
    }
  }

  .mrend__table {
    width: 100%;
    border-collapse: collapse;
    @include media.text("sm");
  }

  .mrend__caption {
    @include media.text("xs");
    @include media.muted(1);
    text-align: start;
    padding-bottom: media.$s-1;
  }

  .mrend__table th,
  .mrend__table td {
    padding: media.$s-1 media.$s-2;
    text-align: start;
    @include media.divider(bottom);
  }

  .mrend__table thead th {
    @include media.text("xs");
    @include media.muted(1);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-weight: 700;
  }

  .mrend__profile {
    font-weight: 600;
    color: $brand-ink;

    @include dark {
      color: $d-text;
    }
  }

  .mrend__num {
    text-align: end;
    @include media.numeric;
  }
</style>
