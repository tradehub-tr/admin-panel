<script setup>
  import { onMounted, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import { useMediaSecurity } from "@/composables/useMediaSecurity";
  import { useToast } from "@/composables/useToast";
  import { formatDateTime } from "@/utils/dateFormat";
  import { formatSize } from "@/utils/mediaFormat";

  /** Dosya adının uzantısı — çapadaki monogram. Yoksa "?" (adsız/uzantısız). */
  function uzanti(ad) {
    const x = /\.([a-z0-9]+)$/i.exec(ad || "");
    return x ? x[1].toUpperCase() : "?";
  }

  const { t, locale } = useI18n();
  const toast = useToast();
  const s = useMediaSecurity();

  // Karantinadan çıkarma geri alınamaz bir güven kararı: sistemin ZARARLI
  // dediği dosyayı erişime açıyor. Tek tıkla olmamalı.
  const confirming = ref(null);

  onMounted(() => s.loadAll());

  async function doRelease(row) {
    confirming.value = null;
    try {
      await s.release(row.file_url);
      toast.success(t("mediaQuarantine.toast.released"));
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function doRetry(row) {
    try {
      await s.retry(row.file_url);
      toast.success(t("mediaQuarantine.toast.retried"));
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function doSweep() {
    try {
      const r = await s.sweep();
      toast.success(t("mediaQuarantine.toast.swept", { n: r?.requeued ?? 0 }));
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function doBackfill() {
    try {
      const r = await s.backfill(500);
      toast.success(t("mediaQuarantine.toast.backfilled", { n: r?.queued ?? 0 }));
    } catch (e) {
      toast.error(e.message);
    }
  }
</script>

<template>
  <section class="mq">
    <header class="mq__head">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("mediaQuarantine.title") }}
        </h1>
        <p class="text-xs text-gray-400 dark:text-gray-500">{{ t("mediaQuarantine.subtitle") }}</p>
      </div>
      <div class="mq__head-actions">
        <button
          type="button"
          class="hdr-btn-outlined"
          :disabled="!!s.acting.value"
          @click="doSweep"
        >
          <AppIcon name="refresh-cw" :size="14" />
          {{ t("mediaQuarantine.action.sweep") }}
        </button>
        <button
          type="button"
          class="hdr-btn-outlined"
          :disabled="!!s.acting.value"
          @click="doBackfill"
        >
          <AppIcon name="scan-line" :size="14" />
          {{ t("mediaQuarantine.action.backfill") }}
        </button>
      </div>
    </header>

    <!-- Politika bandı. Tarayıcı yoksa bunu SESSİZ geçmek, hiç çalışmayan bir
         güvenlik özelliğini çalışıyor gibi göstermek olurdu. -->
    <div
      class="card mq__policy"
      :class="s.scanningOff.value ? 'mq__policy--off' : 'mq__policy--on'"
    >
      <AppIcon :name="s.scanningOff.value ? 'shield-off' : 'shield-check'" :size="18" />
      <div class="mq__policy-text">
        <strong>{{
          s.scanningOff.value ? t("mediaQuarantine.policy.off") : t("mediaQuarantine.policy.on")
        }}</strong>
        <span v-if="s.scanningOff.value">{{ t("mediaQuarantine.policy.offHint") }}</span>
        <span v-else>
          {{ t("mediaQuarantine.policy.scanner", { name: s.policy.value.scanner }) }}
          ·
          {{
            s.policy.value.hold_until_clean
              ? t("mediaQuarantine.policy.holdOn")
              : t("mediaQuarantine.policy.holdOff")
          }}
          ·
          {{
            s.policy.value.fail_closed
              ? t("mediaQuarantine.policy.failClosed")
              : t("mediaQuarantine.policy.failOpen")
          }}
        </span>
      </div>
    </div>

    <div class="mq__stats">
      <div class="card mq__stat mq__stat--danger">
        <strong>{{ s.counts.value.infected ?? 0 }}</strong>
        <span>{{ t("mediaQuarantine.stat.infected") }}</span>
      </div>
      <div class="card mq__stat mq__stat--warn">
        <strong>{{ s.counts.value.failed ?? 0 }}</strong>
        <span>{{ t("mediaQuarantine.stat.failed") }}</span>
      </div>
      <div class="card mq__stat">
        <strong>{{ s.counts.value.pending ?? 0 }}</strong>
        <span>{{ t("mediaQuarantine.stat.pending") }}</span>
      </div>
      <div class="card mq__stat">
        <strong>{{ s.counts.value.clean ?? 0 }}</strong>
        <span>{{ t("mediaQuarantine.stat.clean") }}</span>
      </div>
      <div class="card mq__stat mq__stat--muted">
        <strong>{{ s.counts.value.unscanned ?? 0 }}</strong>
        <span>{{ t("mediaQuarantine.stat.unscanned") }}</span>
      </div>
    </div>

    <nav class="mq__tabs" role="tablist">
      <button
        v-for="k in ['quarantine', 'hold']"
        :key="k"
        type="button"
        role="tab"
        class="mq__tab"
        :class="{ 'mq__tab--active': s.tab.value === k }"
        :aria-selected="s.tab.value === k"
        @click="s.setTab(k)"
      >
        {{ t(`mediaQuarantine.tab.${k}`) }}
      </button>
    </nav>

    <p class="mq__hint">{{ t(`mediaQuarantine.hint.${s.tab.value}`) }}</p>

    <div v-if="s.loading.value" class="mq__empty">{{ t("common.loading") }}</div>
    <div v-else-if="s.error.value" class="mq__empty mq__empty--err">{{ s.error.value }}</div>
    <div v-else-if="!s.items.value.length" class="mq__empty">
      {{ t(`mediaQuarantine.empty.${s.tab.value}`) }}
    </div>

    <!-- Tablo KENDİ kabında kayar: 5 sütun 375px'e sıkışınca dosya adı kelime
         kelime bölünüyor, tarih dört satıra iniyordu (ölçüldü). Sayfa gövdesi
         yatay kaymıyor — kaydırma bu kabın içinde kalıyor. -->
    <div v-else class="mq__table-wrap">
      <table class="mq__table">
        <thead>
          <tr>
            <th>{{ t("mediaQuarantine.col.file") }}</th>
            <th>{{ t("mediaQuarantine.col.size") }}</th>
            <th>{{ t("mediaQuarantine.col.status") }}</th>
            <th>{{ t("mediaQuarantine.col.when") }}</th>
            <th class="mq__col-actions">{{ t("mediaQuarantine.col.actions") }}</th>
            <!-- Çapa sütunu EN SONA eklendi, başa değil: dokunmatik yerleşim
                 hücreleri `nth-child` ile yerleştiriyor, başa eklemek beş
                 seçicinin hepsini kaydırırdı. Görsel yeri ızgarada
                 belirleniyor (1. sütun), belge sırasında değil. -->
            <th class="mq__col-thumb"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in s.items.value" :key="row.name">
            <td>
              <span class="mq__file">{{ row.file_name }}</span>
              <code class="mq__url" :title="row.file_url">{{ row.file_url }}</code>
            </td>
            <td>{{ formatSize(row.file_size) }}</td>
            <td>
              <span v-if="s.tab.value === 'hold'" class="mq__badge">
                {{ t("media.scanStatus.pending") }}
              </span>
              <span
                v-else
                class="mq__badge"
                :class="row.scan_status === 'infected' ? 'mq__badge--danger' : 'mq__badge--warn'"
              >
                {{ t(`media.scanStatus.${row.scan_status}`) }}
              </span>
              <!-- Dosya diskte gerçekten kapalı mı: damga ile fiziksel durumun
                 ayrışması sessiz bir kusur olurdu, açıkça gösteriliyor. -->
              <span
                v-if="s.tab.value === 'hold' ? !row.in_hold : !row.in_quarantine"
                class="mq__badge mq__badge--warn"
                :title="t('mediaQuarantine.notIsolatedHint')"
              >
                {{ t("mediaQuarantine.notIsolated") }}
              </span>
            </td>
            <td>{{ formatDateTime(row.started_at || row.creation, locale) }}</td>
            <td class="mq__col-actions">
              <template v-if="s.tab.value === 'quarantine'">
                <button
                  v-if="row.scan_status === 'failed'"
                  type="button"
                  class="mq__link"
                  :disabled="s.acting.value === row.file_url"
                  @click="doRetry(row)"
                >
                  {{ t("mediaQuarantine.action.retry") }}
                </button>
                <template v-if="confirming === row.name">
                  <button type="button" class="mq__link mq__link--danger" @click="doRelease(row)">
                    {{ t("mediaQuarantine.action.releaseConfirm") }}
                  </button>
                  <button type="button" class="mq__link" @click="confirming = null">
                    {{ t("common.cancel") }}
                  </button>
                </template>
                <button
                  v-else
                  type="button"
                  class="mq__link"
                  :disabled="s.acting.value === row.file_url"
                  @click="confirming = row.name"
                >
                  {{ t("mediaQuarantine.action.release") }}
                </button>
              </template>
              <span v-else class="mq__muted">{{ t("mediaQuarantine.action.waiting") }}</span>
            </td>
            <!-- Karantinadaki dosya public ağaçtan çıkmıştır, önizlemesi
                 yoktur — çapa uzantı monogramı. `media-optimize`teki
                 önizlemesiz karo ile aynı dil. -->
            <td class="mq__col-thumb" aria-hidden="true">
              <span class="mq__thumb">{{ uzanti(row.file_name) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ListPagination
      v-if="s.pageCount.value > 1"
      :page="s.page.value"
      :page-count="s.pageCount.value"
      @update:page="s.goPage"
    />
  </section>
</template>

<style scoped lang="scss">
  /* Tipografi `media.text()` ölçeğinden geliyor (body 14 / sm 13 / xs 12 px),
     elle rem yazılmıyor. Sebebi yalnız tutarlılık değil: mixin MOBİL karşılığı
     da veriyor (16/14/13 px). Elle yazılan boyutlar telefonda küçük kalıyordu
     ve bir değer (11px) ölçeğin en küçüğünün bile altındaydı.

     Düğme/kutu/başlık panel standardından geliyor (`hdr-btn-*`, `card`,
     tipografi sınıfları) — bkz. `.claude/rules/scss.md` §8. Burada yalnız bu
     ekrana ÖZEL olan şeyler var: politika bandının durum renkleri, sayaç
     ızgarası, sekmeler ve tablo. Panel iki stil ailesi biriktirmişti; ikinci
     bir aile daha açmıyoruz. */
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .mq {
    padding: media.$s-4;
    display: flex;
    flex-direction: column;
    gap: media.$s-4;
  }

  .mq__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: media.$s-4;
    flex-wrap: wrap;
  }

  .mq__head-actions {
    display: flex;
    gap: media.$s-2;
  }

  .mq__policy {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    padding: media.$s-3 media.$s-4;
    border-radius: media.$r-lg;
    border: 1px solid transparent;

    &--on {
      background: media.$tint-success;
      border-color: media.$tint-success;
      color: $c-success;
    }
    &--off {
      background: media.$tint-warning;
      border-color: media.$tint-warning;
      color: $c-warning;
    }
  }

  .mq__policy-text {
    display: flex;
    flex-direction: column;
    gap: media.$s-05;
    @include media.text("sm");

    span {
      color: $l-text-600;
      @include dark {
        color: $d-text-muted;
      }
    }
  }

  .mq__stats {
    display: flex;
    gap: media.$s-3;
    flex-wrap: wrap;
  }

  .mq__stat {
    flex: 1 1 7rem;
    padding: media.$s-2 media.$s-3;
    border: 1px solid $l-border;
    border-radius: media.$r-lg;
    background: $l-bg;
    display: flex;
    flex-direction: column;

    strong {
      // Ölçek dışı tek değer ve bilerek: sayaç rakamı bir "başlık"tır,
      // gövde metniyle aynı boyda olursa göz onu sayı olarak seçemiyor.
      // Komşu ekranlarla (MediaAudit/MediaOptimize) AYNI ölçü.
      @include media.text("display");
      font-weight: 700;
    }
    span {
      @include media.text("xs");
      color: $l-text-500;
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      span {
        color: $d-text-muted;
      }
    }

    &--danger strong {
      color: $c-error;
    }
    &--warn strong {
      color: $c-warning;
    }
    &--muted strong {
      color: $l-text-400;
      @include dark {
        color: $d-text-faint;
      }
    }
  }

  .mq__tabs {
    display: flex;
    gap: media.$s-1;
    border-bottom: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
  }

  .mq__tab {
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
      &.mq__tab--active {
        color: $brand-light;
      }
    }
  }

  .mq__hint {
    @include media.text("sm");
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }

  .mq__empty {
    padding: media.$s-6;
    text-align: center;
    color: $l-text-400;
    @include media.text("body");

    &--err {
      color: $c-error;
    }
    @include dark {
      color: $d-text-faint;
    }
  }

  // ── Genel koyu tema kurallarının bu ekrandaki etkisini kaldır ────────
  //
  // `scss/tables.scss` içindeki `html.dark tbody tr td` her hücreyi opak
  // `$d-bg-card` ile boyuyor, `scss/base.scss` içindeki `html.dark header`
  // aynısını sayfa başlığına yapıyor. İkisi de sınıfsız etiket seçicisi ve
  // ikisi de `!important` — yani bu ekran onları istemese de alıyor.
  //
  // Sonucu ölçüldü: dokunmatikte hücreler alt alta dizildiği için her hücre
  // ayrı bir açık gri BANT olarak boyanıyor ve kart yatay şeritlere bölünmüş
  // görünüyordu; başlık da sayfadan kopuk gri bir kutuya dönüyordu.
  //
  // KURALLAR SİLİNMİYOR, BU EKRANDA ETKİSİZLEŞTİRİLİYOR: ikisi de panelin
  // sınıfsız eski tablolarını okunur tutmak için var. Global silmek bu
  // ekranın sorununu çözmek için tüm paneli riske atmak olurdu.
  //
  // `!important` şart: karşı taraf da `!important` yazıyor, normal bildirim
  // onu yenemez. Özgüllük scoped `[data-v]` eki sayesinde zaten daha yüksek.
  // `@include dark` burada kullanılamıyor: mixin `html.dark &` üretiyor ve
  // `&` en üst düzeyde geçersiz. Seçici açık yazıldı — sonuç aynı.
  html.dark .mq__head,
  html.dark .mq__table td {
    background-color: transparent !important;
  }

  .mq__table-wrap {
    max-width: 100%;
    overflow-x: auto;
  }

  // Çapa sütunu YALNIZ dokunmatikte var. Masaüstünde `display: none` — tablo
  // beş sütunlu kalıyor, mevcut yerleşim hiç değişmiyor.
  .mq__col-thumb {
    display: none;
  }

  .mq__table {
    width: 100%;
    // Altında sütunlar ezilmeye başlıyor; bu genişliğin altında kap kaydırır.
    min-width: 40rem;
    border-collapse: collapse;
    @include media.text("sm");

    th,
    td {
      padding: media.$s-2 media.$s-2;
      text-align: start;
      border-bottom: 1px solid $l-border;
      vertical-align: top;
    }
    // Sütunlar: 1 dosya · 2 boyut · 3 durum · 4 zaman · 5 işlem.
    //
    // Yalnız ATOMİK değerler kırılmaz — boyut ve zaman ("17 Ağu 2026 14:53"
    // dört satıra bölünüyordu). Durum bir cümle, kırılabilir: ona da `nowrap`
    // verilince sütun şişip dosya sütununu 60px'e sıkıştırdı ve adres dokuz
    // satıra indi (ölçüldü — ilk denemenin hatası).
    th:nth-child(2),
    td:nth-child(2),
    th:nth-child(4),
    td:nth-child(4) {
      white-space: nowrap;
    }

    // Dosya sütunu adı ve adresi taşıyor; payını önden alır.
    th:first-child,
    td:first-child {
      min-width: 13rem;
    }
    th {
      color: $l-text-500;
      font-weight: 600;
    }
    @include dark {
      th,
      td {
        border-color: $d-border;
      }
      th {
        color: $d-text-muted;
      }
    }
  }

  .mq__file {
    display: block;
    font-weight: 600;
  }

  .mq__url {
    display: block;
    @include media.text("xs");
    color: $l-text-400;
    word-break: break-all;
    @include dark {
      color: $d-text-faint;
    }
  }

  // Ortak `chip()` mixin'ine bağlandı. ÖNCEKİ HÂLİ KOYU TEMADA BOZUKTU:
  // `@include dark` kural gövdesinde `&--danger`/`&--warn`'dan SONRA geliyordu
  // ve `html.dark .mq__badge` özgüllük olarak (0,2,0) ton değiştiricilerini
  // (0,1,0) eziyordu. Sonuç ölçüldü: koyu temada "zararlı" rozetinin arka
  // planı `rgb(33,32,29)`, metni `rgb(237,235,230)` — yani kırmızı tamamen
  // kayboluyor, "zararlı" ile "taranıyor" AYNI gri görünüyordu. Ciddiyet
  // koyu temada okunmuyordu; bu yalnız bir görünüm sorunu değildi.
  //
  // `chip()` her tonun koyu tema karşılığını kendi içinde taşıyor. Mixin'in
  // kendi yorumu bu ekranı zaten işaret ediyor: "dört medya ekranı kendi
  // kırmızısını uydurmuştu" — burası onlardan biriydi.
  //
  // Yan etki masaüstünde de görünür: rozet köşeli kutudan hap biçimine
  // geçiyor. Bilinçli — diğer dört medya ekranındaki rozet zaten hap ve
  // koyu zeminde köşeli kutu satırı yatay bantlara bölüyordu.
  .mq__badge {
    @include media.chip("neutral");
    margin-inline-end: 0.25rem;

    // TONUN KOYU TEMADA TEKRAR EDİLMESİ ŞART: `chip("neutral")`ın koyu
    // bloğu `html.dark .mq__badge` seçicisini üretiyor (0-2-1) ve ton
    // değiştiricisinin düz kuralını (0-1-0) eziyor. `chip("danger")` koyu
    // temada yalnız `color` yazdığı için metin kırmızıya dönüyor ama arka
    // plan nötr gri kalıyordu — ölçüldü. Arka planı burada aynı özgüllükte
    // tekrar yazmak tek doğru çözüm; mixin'i bozmadan.
    &--danger {
      @include media.chip("danger");

      @include dark {
        background: media.$tint-danger;
      }
    }

    &--warn {
      @include media.chip("warning");

      @include dark {
        background: media.$tint-warning;
      }
    }
  }

  .mq__col-actions {
    text-align: end;
    white-space: nowrap;
  }

  .mq__link {
    background: none;
    border: 0;
    color: $brand;
    cursor: pointer;
    @include media.text("xs");
    padding: media.$s-05 media.$s-1;

    &--danger {
      color: $c-error;
      font-weight: 600;
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .mq__muted {
    color: $l-text-400;
    @include media.text("xs");
    @include dark {
      color: $d-text-faint;
    }
  }

  // ── MOGEM-625 · dokunmatikte tablo KART olur ───────────────────────
  //
  // Beş sütun 375px'e sığmıyor. İlk çözüm yatay kaydırmaydı; gözle bakınca
  // yanlış olduğu görüldü — telefonda kimse tabloyu yana kaydırmıyor, dosya
  // adının yanındaki durumu göremiyor. Referans `media-audit`: orada satırlar
  // DİKEY yığılıyor ve her satır kendi kartı gibi okunuyor.
  //
  // Markup TEK: `<table>` olduğu gibi kalıyor, yalnız görüntüleme kutusu
  // değişiyor. İkinci bir liste şablonu yazmak aynı eylem mantığını
  // (yeniden dene / serbest bırak / onay) iki yerde tutmak demekti.
  @media (max-width: media.$m-bp-rail) {
    // Kaydırma kabı devre dışı: artık kaydıracak bir şey yok.
    .mq__table-wrap {
      overflow-x: visible;
    }

    .mq__table {
      min-width: 0;
      display: block;
    }

    // Başlık satırı kartta anlamsız — her değer kendi bağlamında okunuyor.
    .mq__table thead {
      @include media.sr-only;
    }

    .mq__table tbody,
    .mq__table tr,
    .mq__table td {
      display: block;
    }

    // Kart ızgaraya geçti: `media-optimize` ile aynı kalıp — sol sütunda
    // satır boyu uzanan çapa, sağdaki metinlerin hepsi TEK dikey çizgide.
    // Esnek + `order` ile bu yapılamıyordu; sarılan satırın başlangıcı
    // çapanın genişliğine elle hesaplanmış bir girintiyle bağlanırdı ve o
    // hesap `media-optimize`te 7px şaşmıştı. Izgarada hücreler AYNI sütuna
    // konuyor, hizasızlık matematiğe değil yapıya bağlı.
    .mq__table tr {
      display: grid;
      grid-template-columns: auto auto minmax(0, 1fr);
      align-items: center;
      column-gap: media.$s-3;
      row-gap: media.$s-1;
      padding: media.$s-3 0;
      @include media.divider(bottom);

      &:last-child {
        border-bottom: 0;
      }
    }

    .mq__table td {
      padding: 0;
      border: 0;
      white-space: normal;
      min-width: 0;
    }

    // Çapa: 1. sütun, dört satırın tamamı boyunca. Dört satır HER ZAMAN var
    // (dosya, durum, boyut+zaman, eylem) — eylem hücresi boşken bile
    // "bekleniyor" metnini taşıyor, yani `span 4` boş satır üretmiyor.
    // Çapa 1. sütunda, dört satırın hizasında ORTALANIYOR — uzatılmıyor.
    //
    // UZATMA DENENDİ VE BIRAKILDI: karantina satırı dört metin satırı
    // taşıyor (ad+yol, durum, boyut·zaman, eylem) ve çapa 56×163'lük boş bir
    // kutuya dönüşüyordu; kart "bölünmüş" görünüyordu. `media-optimize`te
    // uzatma doğru çünkü orada içi dolu bir FOTOĞRAF var. Burada içerik yok
    // (karantinadaki dosya public ağaçtan çıkmıştır, önizlemesi olamaz), o
    // yüzden referans `media-audit`in kalıbı doğru olan: küçük kare rozet,
    // metin bloğuna göre ortalanmış.
    .mq__table td.mq__col-thumb {
      display: block;
      grid-column: 1;
      grid-row: 1 / span 4;
      align-self: center;
    }

    .mq__thumb {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: media.$r-sm;
      background: $l-bg-muted;
      font-weight: 600;
      @include media.text("xs");
      @include media.muted(2);

      @include dark {
        background: $d-bg-elevated;
      }
    }

    // Yol tek satıra iniyor: iki satıra sarınca kart gereksiz uzuyor ve
    // dosya adının altında ikinci bir metin bloğu gibi duruyordu. Tam yol
    // `title` ile duruyor, bilgi kaybı yok.
    .mq__url {
      display: block;
      @include media.truncate;
    }

    // Sıra: 1 dosya · 2 durum · 3 boyut+zaman · 4 eylemler. Belge sırası
    // dosya/boyut/durum/zaman/eylem/çapa olduğu için konumlar açık yazılıyor.
    .mq__table td:nth-child(1) {
      grid-column: 2 / -1;
      grid-row: 1;
      min-width: 0;
    }

    .mq__table td:nth-child(3) {
      grid-column: 2 / -1;
      grid-row: 2;
    }

    // Boyut ve zaman yan yana, ince meta satırı.
    .mq__table td:nth-child(2),
    .mq__table td:nth-child(4) {
      grid-row: 3;
      @include media.text("xs");
      @include media.muted(2);
    }

    .mq__table td:nth-child(2) {
      grid-column: 2;
    }

    .mq__table td:nth-child(4) {
      grid-column: 3;
      justify-self: start;
    }

    // Aralarına ayraç: "0 KB · 17 Ağu 2026 14:53"
    .mq__table td:nth-child(4)::before {
      content: "·";
      margin-inline-end: media.$s-2;
    }

    .mq__table td:nth-child(5) {
      grid-column: 2 / -1;
      grid-row: 4;
      text-align: start;
      display: flex;
      flex-wrap: wrap;
      gap: media.$s-2;
      margin-top: media.$s-1;
    }

    // Eylemler kartta gerçek düğme gibi görünmeli — satır içi bağlantı
    // dokunmatikte 44px hedefi karşılamıyordu.
    //
    // HAP BİÇİMİ, KÖŞELİ KUTU DEĞİL: köşeli rozet ve köşeli düğme koyu
    // zeminde açık renkli yatay BANTLAR gibi okunuyordu ve kart üst üste
    // dizilmiş şeritlere bölünmüş görünüyordu. Hap, aynı bilgiyi taşırken
    // satırın içinde bir nesne olarak duruyor — `media-optimize`teki rozet
    // ve çiplerle de aynı dil.
    .mq__link {
      @include media.tap-target;
      padding-inline: media.$s-3;
      border: 1px solid $l-border;
      border-radius: 999px;

      @include dark {
        border-color: $d-border;
      }
    }

    .mq__url {
      @include media.text("xs");
    }
  }

  // Sayaç kartları — beş kart, ikişerli ızgara.
  //
  // `flex-wrap` ile beşinci kart satır sonunda yarım genişlikte tek başına
  // kalıyordu. `auto-fit` denendi, telefonda tek sütuna düştü — daha kötü.
  // Çözüm bilinçli: dördü ikişerli, beşinci TAM SATIR. Zaten farklı bir
  // kategori ("Hiç taranmadı" tarama sonucu değil, kapsam dışı), tam satır
  // onu ayrı okutuyor.
  .mq__stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mq__stat--muted {
    grid-column: 1 / -1;
  }

  @media (min-width: 1280px) {
    .mq__stats {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }

    .mq__stat--muted {
      grid-column: auto;
    }
  }
</style>
