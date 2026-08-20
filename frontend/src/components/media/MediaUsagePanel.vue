<script setup>
  import { computed, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { useMediaUsage } from "@/composables/useMediaUsage";

  /**
   * Detay çekmecesinin KULLANIM sekmesi — "bunu silersem ne kırılır".
   *
   * Üç ayrı derinlik gösterilir çünkü üçü farklı karar doğurur:
   *
   *   CANLI    → vitrinde duruyor. Silinirse sayfa bozulur.
   *   SİPARİŞ  → geçmiş siparişin kopyası. Vitrin bozulmaz ama delil kaybolur.
   *   GEÇMİŞ   → yalnız iz (sürüm, yorum, log). Silinmesi bir şey bozmaz.
   *
   * Ekranın dürüstlük borcu: arka taraf kalıcı bir kullanım dizini TUTMUYOR,
   * istek anında sabit bir kaynak listesini tarıyor. Bu yüzden boş sonuç
   * "hiçbir yerde kullanılmıyor" diye değil, "taranan kaynaklarda bulunamadı"
   * diye yazılır ve sınır notu her zaman görünür — tam liste varmış gibi
   * davranmak, satıcının kendi vitrinini silmesine yol açar.
   */
  const props = defineProps({
    /** Dosya ADRESİ (`/files/...`). Boşsa hiç istek atılmaz. */
    fileUrl: { type: String, default: "" },
    /** Bölüm başlığının id'si — çağıran `aria-labelledby` kurabilsin. */
    headingId: { type: String, default: "" },
    /**
     * Kullanım dökümünü getiren fonksiyon: `(fileUrl) => Promise<rapor>`.
     * Verilmezse satıcı ucu kullanılır; yönetici ekranı kendi ucunu geçer.
     */
    fetcher: { type: Function, default: null },
  });

  const { t } = useI18n();
  const { report, loading, emptyReason, error, denied, load } = useMediaUsage(props.fetcher);

  watch(
    () => props.fileUrl,
    (url) => load(url),
    { immediate: true }
  );

  /**
   * Boş/arıza durumlarının TEK metni — şablonda dallanma çoğalmasın.
   *
   * `report` hâlâ `null` ve hiçbir bayrak yanmamışsa cevap HENÜZ GELMEDİ;
   * o hâl "kullanılmıyor" diye gösterilemez, "bilinmiyor" diye gösterilir.
   */
  const notice = computed(() => {
    if (loading.value) return { icon: "loader", text: t("media.usage.loading") };
    if (denied.value) return { icon: "lock", text: t("media.usage.denied") };
    if (error.value) return { icon: "circle-alert", text: t("media.usage.failed") };
    if (emptyReason.value === "noFile")
      return { icon: "circle-alert", text: t("media.usage.noFile") };
    if (emptyReason.value === "notUsed")
      return { icon: "trash-2", text: t("media.usage.notFound") };
    if (!report.value) return { icon: "circle-alert", text: t("media.usage.unknown") };
    return null;
  });

  const groups = computed(() => report.value?.groups || []);
  const orders = computed(() => report.value?.orders || []);
  const history = computed(() => report.value?.history || []);
  const records = computed(() => report.value?.records || []);

  const verdictTone = computed(
    () =>
      ({ in_use: "ok", order_only: "warn", history_only: "warn", unused: "danger" })[
        report.value?.verdict
      ] || "muted"
  );

  /**
   * "Bağlı olduğu" boş ama dosya kullanılıyorsa ekranda çelişki gibi durur:
   * `attached_to` Frappe'nin YÜKLEME bağı, kullanım ise adresin bir alanda
   * geçmesi. Toplu içe aktarımla gelen dosyalarda ilki her zaman boştur.
   */
  const attachedMismatch = computed(
    () => groups.value.length > 0 && records.value.every((r) => !r.attachedTo)
  );

  /** Alan etiketi: galeri sırası ve varyant kimliği kaybolmasın. */
  function fieldLabel(f) {
    if (f.variant) {
      const parts = [f.field, f.variant];
      if (f.variantSku) parts.push(f.variantSku);
      return parts.join(" · ");
    }
    if (f.position) return `${f.field} #${f.position}`;
    return f.field;
  }
</script>

<template>
  <section class="musage" :aria-busy="loading">
    <h3 :id="headingId || undefined" class="musage__title">
      <AppIcon name="package" :size="14" />
      {{ t("media.usage.title") }}
      <span v-if="groups.length" class="musage__count">
        {{ t("media.usage.count", { n: groups.length }) }}
      </span>
    </h3>

    <!-- Karar şeridi: "silinebilir mi" sorusunun tek cümlelik cevabı. Arka
         tarafın kararı olduğu gibi taşınır, ekran yeniden hesaplamaz. -->
    <p
      v-if="report"
      class="musage__verdict"
      :class="`musage__verdict--${verdictTone}`"
      data-test="usage-verdict"
    >
      <AppIcon name="info" :size="14" />
      {{ t(`media.usage.verdict.${report.verdict}`) }}
    </p>

    <p v-if="notice" class="musage__notice" data-test="usage-notice">
      <AppIcon :name="notice.icon" :size="14" />
      {{ notice.text }}
    </p>

    <template v-else>
      <!-- Canlı kullanım — hangi kayıtta, hangi alanda, hangi sayfada -->
      <section v-if="groups.length" class="musage__block">
        <h4 class="musage__block-title">{{ t("media.usage.liveTitle") }}</h4>
        <ul class="musage__list">
          <li v-for="g in groups" :key="g.key" class="musage__use">
            <div class="musage__use-head">
              <span class="musage__label">{{ g.label }}</span>
              <span v-if="g.status" class="musage__status">{{ g.status }}</span>
            </div>
            <ul class="musage__fields">
              <li v-for="(f, i) in g.fields" :key="`${g.key}-${f.kind}-${i}`">
                {{ fieldLabel(f) }}
              </li>
            </ul>
            <!-- Yol boşsa kayıt yayında değil: uydurma adres yerine düz metin. -->
            <a
              v-if="g.pageUrl"
              class="musage__link"
              :href="g.pageUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              <AppIcon name="external-link" :size="13" />
              {{ t("media.usage.openPage") }}
            </a>
            <span v-else class="musage__hint">{{ t("media.usage.unpublished") }}</span>
          </li>
        </ul>
      </section>

      <!-- Sipariş kopyaları — vitrin değil, geçmişin delili -->
      <section v-if="orders.length" class="musage__block">
        <h4 class="musage__block-title">{{ t("media.usage.ordersTitle") }}</h4>
        <ul class="musage__list">
          <li v-for="(o, i) in orders" :key="`${o.kind}-${o.name}-${i}`" class="musage__row">
            <AppIcon name="shopping-cart" :size="13" />
            <span>{{ o.field }}</span>
            <code>{{ o.name }}</code>
          </li>
        </ul>
      </section>

      <!-- Geçmiş izleri — sayı yeter, tek tek kayıt gürültü olurdu -->
      <section v-if="history.length" class="musage__block">
        <h4 class="musage__block-title">{{ t("media.usage.historyTitle") }}</h4>
        <ul class="musage__list">
          <li v-for="h in history" :key="h.kind" class="musage__row">
            <AppIcon name="history" :size="13" />
            <span>{{ h.label }}</span>
            <code>{{ t("media.usage.historyCount", { n: h.count }) }}</code>
          </li>
        </ul>
      </section>

      <!-- Aynı adrese işaret eden File kayıtları — temizlik adayı sayısı -->
      <section v-if="records.length" class="musage__block">
        <h4 class="musage__block-title">{{ t("media.usage.recordsTitle") }}</h4>
        <ul class="musage__list">
          <li v-for="r in records" :key="r.name" class="musage__row">
            <AppIcon name="file-text" :size="13" />
            <span>{{ r.attachedTo || t("media.usage.noAttachment") }}</span>
            <!-- Frappe soft-delete YAPMAZ: "yok" demek gerçekten silinmiş demek. -->
            <code v-if="r.targetExists === false">{{ t("media.usage.targetMissing") }}</code>
          </li>
        </ul>
        <p v-if="report.redundantRecords > 0" class="musage__hint">
          {{ t("media.usage.redundant", { n: report.redundantRecords }) }}
        </p>
        <p v-if="attachedMismatch" class="musage__hint">
          {{ t("media.usage.attachedMismatch") }}
        </p>
      </section>
    </template>

    <!--
      SINIR NOTU — her durumda görünür, boş sonuçta da.
      Arka taraf kalıcı kullanım dizini tutmuyor; istek anında sabit bir kaynak
      listesi taranıyor. Listede olmayan bir alanda geçen adres burada
      görünmez. Bunu gizlemek, satıcıya "tam liste" izlenimi verirdi.
    -->
    <p class="musage__scope" data-test="usage-scope">
      <AppIcon name="info" :size="13" />
      {{ t("media.usage.scanNote") }}
    </p>
  </section>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .musage {
    display: grid;
    gap: media.$s-3;
  }

  .musage__title {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: 0;
    @include media.text("sm");
    font-weight: 700;
    @include media.heading;
  }

  .musage__count {
    @include media.text("xs");
    @include media.muted(1);
    font-weight: 600;
  }

  .musage__verdict {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: 0;
    padding: media.$s-2 media.$s-3;
    border-radius: media.$r-md;
    @include media.text("sm");
    font-weight: 600;
    color: $l-text-900;
    background: $l-bg-muted;

    @include dark {
      color: $d-text;
      background: $d-bg-elevated;
    }
  }

  .musage__verdict--ok {
    color: $c-success;
  }

  .musage__verdict--warn {
    color: $c-warning;
  }

  .musage__verdict--danger {
    color: $c-error;
  }

  // Boş/arıza metni tek başına ekranda kalabilir; rengi kasıtlı `muted` DEĞİL,
  // okunabilirliği kontrast oranına bağlı (bkz. mediaAccessibility testi).
  .musage__notice {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: 0;
    padding: media.$s-3;
    border-radius: media.$r-md;
    @include media.text("sm");
    color: $l-text-900;
    background: $l-bg-muted;

    @include dark {
      color: $d-text;
      background: $d-bg-elevated;
    }
  }

  .musage__block {
    display: grid;
    gap: media.$s-2;
  }

  .musage__block-title {
    margin: 0;
    @include media.text("xs");
    @include media.muted(1);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-weight: 700;
  }

  .musage__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: media.$s-2;
  }

  .musage__use {
    display: grid;
    gap: media.$s-1;
    padding: media.$s-2;
    border-radius: media.$r-md;
    @include media.surface("soft");
  }

  .musage__use-head {
    display: flex;
    align-items: center;
    gap: media.$s-2;
  }

  .musage__label {
    @include media.text("sm");
    font-weight: 600;
    @include media.truncate;
  }

  .musage__status {
    margin-inline-start: auto;
    @include media.chip("neutral");
  }

  .musage__fields {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: media.$s-05;

    li {
      @include media.text("xs");
      @include media.muted(1);
    }
  }

  .musage__row {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    @include media.text("xs");
    color: $l-text-700;

    @include dark {
      color: $d-text;
    }

    code {
      margin-inline-start: auto;
      @include media.text("xs");
      @include media.muted(2);
    }
  }

  .musage__link {
    display: inline-flex;
    align-items: center;
    gap: media.$s-1;
    @include media.text("xs");
    // Marka sarısı ($brand) açık zeminde metin olarak kontrastı geçmiyor;
    // bağlantı olduğu RENKLE değil altı çizgiyle bildiriliyor.
    color: $l-text-900;
    text-decoration: underline;
    // Dokunma hedefi: satır içi bağlantı da parmakla açılabilmeli.
    @include media.tap-target;
    align-self: start;
    @include media.focus-ring;

    @include dark {
      color: $d-text-hi;
    }
  }

  .musage__hint,
  .musage__scope {
    display: flex;
    align-items: flex-start;
    gap: media.$s-1;
    margin: 0;
    @include media.text("xs");
    @include media.muted(1);
  }

  .musage__scope {
    padding-top: media.$s-2;
    @include media.divider(top);
  }
</style>
