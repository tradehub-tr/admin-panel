<script setup>
  import { computed, onMounted, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import { useSellerBackup } from "@/composables/useSellerBackup";
  import { formatDateTime } from "@/utils/dateFormat";
  import { formatSize } from "@/utils/mediaFormat";

  /**
   * Satıcının kendi medya yedeği (TUR-131).
   *
   * Görünüm yönetimdeki `system/MediaBackupView` ile BİREBİR aynı iskeleti
   * kullanıyor — aynı `mpage`/`mbk__` sınıfları, aynı durum şeridi, aynı iki
   * panelli düzen. İki ekran aynı işi iki farklı kullanıcı için yapıyor;
   * ayrı görünmeleri "bunlar farklı ürünler" izlenimi verirdi. Scoped stil
   * paylaşılmadığı için kurallar buraya kopyalandı (aynı gerekçe orada da
   * yazılı).
   *
   * KAPSAM farkı yönetimdekinden şu şekilde ayrılıyor ve bilerek dar:
   *   - platform çapında budama (`prune`) YOK — saklama sınırı otomatik
   *   - veritabanı yapı künyesi karşılaştırması YOK — satıcının işi değil
   *   - "fazla" dosyalar yalnız bilgi olarak sayılıyor, listelenmiyor
   *
   * Akış üç adım ve sıra atlanamıyor: yedek seç → planı gör → uygula. Geri
   * yükleme yanlış çalışırsa bugünkü veriyi dünkiyle ezer; tek tıkla
   * ulaşılabilir olmamalı.
   */
  const { t } = useI18n();
  const b = useSellerBackup();

  const label = ref("");
  const overwrite = ref(false);
  const withRecords = ref(true);
  const silinecek = ref(null);
  const silConfirm = ref(false);
  const geriYukleConfirm = ref(false);

  onMounted(async () => {
    await b.load();
    if (b.selected.value) await b.loadPlan();
  });

  const tarih = (d) => formatDateTime(d);

  const kotaDolu = computed(() => (b.usage.sets || 0) >= (b.usage.max_sets || 5));

  /** Geri yüklenecek bir şey var mı — yoksa düğme anlamsız. */
  const yapilacakIsVar = computed(() => {
    const p = b.plan.value;
    if (!p) return false;
    return (
      (p.missing_file_count || 0) > 0 ||
      (p.missing_record_count || 0) > 0 ||
      (overwrite.value && (p.conflict_count || 0) > 0)
    );
  });

  const paketHazir = computed(() => b.exportState.state === "hazir");
  const paketHazirlaniyor = computed(() => b.exportState.state === "hazirlaniyor");

  async function yedekAl() {
    const r = await b.create(label.value);
    if (r) {
      label.value = "";
      await b.loadPlan();
    }
  }

  async function sec(s) {
    await b.select(s.set_id);
    await b.loadPlan();
  }

  function askDelete(s) {
    silinecek.value = s.set_id;
    silConfirm.value = true;
  }

  async function silmeyiOnayla() {
    silConfirm.value = false;
    if (silinecek.value) await b.remove(silinecek.value);
    silinecek.value = null;
  }

  async function geriYukleOnayla() {
    geriYukleConfirm.value = false;
    await b.applyRestore({ withRecords: withRecords.value, overwrite: overwrite.value });
  }
</script>

<template>
  <div class="mpage">
    <header class="mpage__head">
      <div>
        <h1 class="mpage__title">
          <AppIcon name="save" :size="16" class="mpage__title-icon" />
          {{ t("sellerBackup.title") }}
        </h1>
        <p class="mpage__subtitle">{{ t("sellerBackup.subtitle") }}</p>
      </div>

      <div class="mpage__actions">
        <input
          v-model="label"
          class="mbk__label"
          type="text"
          maxlength="60"
          :placeholder="t('sellerBackup.labelPlaceholder')"
        />
        <button
          type="button"
          class="mbk__btn mbk__btn--primary"
          :disabled="b.busy.value"
          @click="yedekAl"
        >
          <AppIcon name="save" :size="14" />
          {{ t("sellerBackup.action.create") }}
        </button>
      </div>
    </header>

    <!-- Durum şeridi: yönetimdekiyle aynı ölçüler. Saklama sınırı burada
         yazıyor ki "eski yedeğim nereye gitti" sorusu ekrandan cevaplansın. -->
    <div class="mbk__stats">
      <div class="mbk__stat">
        <span class="mbk__stat-label">{{ t("sellerBackup.stat.sets") }}</span>
        <strong>{{ b.usage.sets }} / {{ b.usage.max_sets }}</strong>
      </div>
      <div class="mbk__stat">
        <span class="mbk__stat-label">{{ t("sellerBackup.stat.size") }}</span>
        <strong>{{ formatSize(b.usage.bytes) }}</strong>
      </div>
      <div class="mbk__stat">
        <span class="mbk__stat-label">{{ t("sellerBackup.stat.lastFiles") }}</span>
        <strong>{{ b.selectedSet.value?.file_count ?? "—" }}</strong>
      </div>
      <div class="mbk__stat" :class="{ 'mbk__stat--good': !kotaDolu }">
        <span class="mbk__stat-label">{{ t("sellerBackup.stat.retention") }}</span>
        <strong>{{ t("sellerBackup.retentionValue", { n: b.usage.max_sets }) }}</strong>
      </div>
    </div>

    <p v-if="kotaDolu" class="mbk__warn mbk__warn--standalone">
      <AppIcon name="triangle-alert" :size="14" />
      {{ t("sellerBackup.quotaFull", { n: b.usage.max_sets }) }}
    </p>

    <div class="mbk__layout">
      <!-- ── Yedek listesi ── -->
      <section class="mbk__panel">
        <header class="mbk__panelhead">
          <h2>{{ t("sellerBackup.section.sets") }}</h2>
          <span v-if="b.sets.value.length" class="mbk__count">{{ b.sets.value.length }}</span>
        </header>

        <p v-if="b.loading.value" class="mbk__empty">{{ t("sellerBackup.loading") }}</p>
        <p v-else-if="!b.sets.value.length" class="mbk__empty">{{ t("sellerBackup.empty") }}</p>

        <ul v-else class="mbk__sets">
          <li v-for="s in b.sets.value" :key="s.set_id">
            <button
              type="button"
              class="mbk__set"
              :class="{ 'mbk__set--on': s.set_id === b.selected.value }"
              @click="sec(s)"
            >
              <span class="mbk__setdate">{{ tarih(s.created) }}</span>
              <span class="mbk__setmeta">
                {{ t("sellerBackup.item.meta", { files: s.file_count, size: formatSize(s.total_bytes) }) }}
              </span>
              <span v-if="s.label" class="mbk__setlabel">{{ s.label }}</span>
            </button>
            <!-- Silme ayrı düğme: satıra tıklamak seçer, silmez. Yıkıcı işlem
                 gezinme hareketiyle aynı tıklamayı paylaşmamalı. -->
            <button
              type="button"
              class="mbk__del"
              :disabled="b.busy.value || b.sets.value.length < 2"
              :title="b.sets.value.length < 2 ? t('sellerBackup.lastSet') : t('sellerBackup.action.delete')"
              :aria-label="t('sellerBackup.action.delete')"
              @click="askDelete(s)"
            >
              <AppIcon name="trash-2" :size="14" />
            </button>
          </li>
        </ul>
      </section>

      <!-- ── Seçili yedek ── -->
      <section v-if="b.selectedSet.value" class="mbk__panel">
        <header class="mbk__panelhead">
          <h2>{{ tarih(b.selectedSet.value.created) }}</h2>
          <div class="mbk__row-actions">
            <button type="button" class="mbk__mini" :disabled="b.busy.value" @click="b.verify(false)">
              <AppIcon name="shield-check" :size="13" />
              {{ t("sellerBackup.action.verify") }}
            </button>
            <button
              type="button"
              class="mbk__mini"
              :disabled="b.busy.value"
              :title="t('sellerBackup.verifyDeepHint')"
              @click="b.verify(true)"
            >
              {{ t("sellerBackup.action.verifyDeep") }}
            </button>
          </div>
        </header>

        <p
          v-if="b.verifyResult.value"
          class="mbk__verify"
          :class="b.verifyResult.value.ok ? 'mbk__verify--ok' : 'mbk__verify--bad'"
        >
          <AppIcon :name="b.verifyResult.value.ok ? 'circle-check' : 'circle-alert'" :size="14" />
          <span v-if="b.verifyResult.value.ok">
            {{ t("sellerBackup.verify.ok", { files: b.verifyResult.value.files }) }}
          </span>
          <span v-else>
            {{ t("sellerBackup.verify.bad", {
              missing: b.verifyResult.value.missing_count,
              corrupt: b.verifyResult.value.corrupt_count,
            }) }}
          </span>
        </p>
        <p v-else class="mbk__verify mbk__verify--idle">
          <AppIcon name="shield-check" :size="14" />
          {{ t("sellerBackup.verifyIdle") }}
        </p>

        <!-- ── Geri yükleme planı ── -->
        <div class="mbk__block">
          <header class="mbk__blockhead">
            <h3>{{ t("sellerBackup.section.plan") }}</h3>
          </header>
          <p class="mbk__hint">{{ t("sellerBackup.planHint") }}</p>

          <template v-if="b.plan.value">
            <ul class="mbk__plan">
              <li class="mbk__prow" :class="{ 'mbk__prow--good': b.plan.value.ok }">
                <span>{{ t("sellerBackup.plan.ok") }}</span><strong>{{ b.plan.value.ok }}</strong>
              </li>
              <li class="mbk__prow" :class="{ 'mbk__prow--warn': b.plan.value.missing_file_count }">
                <span>{{ t("sellerBackup.plan.missingFile") }}</span>
                <strong>{{ b.plan.value.missing_file_count }}</strong>
              </li>
              <li class="mbk__prow" :class="{ 'mbk__prow--warn': b.plan.value.missing_record_count }">
                <span>{{ t("sellerBackup.plan.missingRecord") }}</span>
                <strong>{{ b.plan.value.missing_record_count }}</strong>
              </li>
              <li class="mbk__prow" :class="{ 'mbk__prow--danger': b.plan.value.conflict_count }">
                <span>{{ t("sellerBackup.plan.conflict") }}</span>
                <strong>{{ b.plan.value.conflict_count }}</strong>
              </li>
              <li class="mbk__prow">
                <span>{{ t("sellerBackup.plan.extra") }}</span>
                <strong>{{ b.plan.value.extra_count }}</strong>
              </li>
              <!-- Başka mağazanın yüklediği, bu mağazanın yalnız KULLANDIĞI
                   dosyalar. Geri yükleme onlara dokunmuyor; plan bunu
                   söylemezse ekran uygulamanın yapmayacağı şeyi vaat eder. -->
              <li v-if="b.plan.value.not_owned_count" class="mbk__prow">
                <span>{{ t("sellerBackup.plan.notOwned") }}</span>
                <strong>{{ b.plan.value.not_owned_count }}</strong>
              </li>
            </ul>

            <!-- "Fazla" dosyalar hiçbir zaman silinmiyor; kullanıcı bunu bilmeli,
                 yoksa geri yüklemeye basmaktan çekinir. -->
            <p class="mbk__hint">{{ t("sellerBackup.neverDeletes") }}</p>
            <p v-if="b.plan.value.not_owned_count" class="mbk__hint">
              {{ t("sellerBackup.notOwnedHint", { n: b.plan.value.not_owned_count }) }}
            </p>

            <label class="mbk__check">
              <input v-model="withRecords" type="checkbox" />
              <span>{{ t("sellerBackup.opt.records") }}</span>
            </label>
            <label class="mbk__check">
              <input v-model="overwrite" type="checkbox" />
              <span>{{ t("sellerBackup.opt.overwrite") }}</span>
            </label>
            <p v-if="overwrite" class="mbk__caution">
              <AppIcon name="triangle-alert" :size="14" />
              {{ t("sellerBackup.opt.overwriteWarn") }}
            </p>

            <div class="mbk__foot">
              <button
                type="button"
                class="mbk__btn"
                :class="overwrite ? 'mbk__btn--danger' : 'mbk__btn--primary'"
                :disabled="b.busy.value || !yapilacakIsVar"
                @click="geriYukleConfirm = true"
              >
                <AppIcon name="refresh-cw" :size="14" />
                {{ t("sellerBackup.action.restore") }}
              </button>
            </div>
            <p v-if="!yapilacakIsVar" class="mbk__hint">{{ t("sellerBackup.nothingToDo") }}</p>
          </template>
        </div>

        <!-- ── İndirilebilir paket ── -->
        <div class="mbk__block">
          <header class="mbk__blockhead">
            <h3>{{ t("sellerBackup.section.download") }}</h3>
          </header>
          <p class="mbk__hint">{{ t("sellerBackup.downloadHint") }}</p>

          <div class="mbk__foot">
            <button
              v-if="!paketHazir"
              type="button"
              class="mbk__btn"
              :disabled="b.busy.value || paketHazirlaniyor"
              @click="b.startExport"
            >
              <AppIcon name="package" :size="14" />
              {{ paketHazirlaniyor ? t("sellerBackup.export.working") : t("sellerBackup.action.pack") }}
            </button>

            <template v-else>
              <a class="mbk__btn mbk__btn--primary" :href="b.downloadUrl()" download>
                <AppIcon name="download" :size="14" />
                {{ t("sellerBackup.action.download", { size: formatSize(b.exportState.bytes) }) }}
              </a>
              <button type="button" class="mbk__btn" :disabled="b.busy.value" @click="b.discardExport">
                {{ t("sellerBackup.action.discard") }}
              </button>
            </template>
          </div>

          <p v-if="paketHazirlaniyor && b.exportState.total" class="mbk__progress">
            {{ b.exportState.done }} / {{ b.exportState.total }}
          </p>
        </div>
      </section>
    </div>

    <ConfirmDialog
      v-model="silConfirm"
      :title="t('sellerBackup.confirm.deleteTitle')"
      :message="t('sellerBackup.confirm.deleteBody')"
      danger
      @confirm="silmeyiOnayla"
    />
    <ConfirmDialog
      v-model="geriYukleConfirm"
      :title="t('sellerBackup.confirm.restoreTitle')"
      :message="overwrite ? t('sellerBackup.confirm.restoreOverwrite') : t('sellerBackup.confirm.restoreBody')"
      :danger="overwrite"
      @confirm="geriYukleOnayla"
    />
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  // ── Sayfa iskeleti: MediaAuditView ile birebir aynı ölçüler ─────────
  .mpage {
    margin: 0 auto;
    padding: media.$s-5 media.$s-4 media.$s-10;

    @media (max-width: 1023px) {
      padding-bottom: calc(#{media.$m-float-bottom} + 56px);
    }
  }

  .mpage__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: media.$s-4;
    flex-wrap: wrap;
    margin-bottom: media.$s-5;

    // base.scss'teki global `html.dark header` kuralı buraya kart zemini basıyor.
    @include dark {
      background-color: transparent !important;
    }
  }

  .mpage__title {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    @include media.heading;
  }

  .mpage__title-icon {
    color: $brand;
  }

  .mpage__subtitle {
    margin: 2px 0 0;
    font-size: 12px;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .mpage__actions {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    flex-wrap: wrap;
  }

  // ── Durum şeridi ────────────────────────────────────────────────────
  .mbk__stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: media.$s-2;
    margin-bottom: media.$s-4;

    @media (min-width: 1024px) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  .mbk__stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding: media.$s-2 media.$s-3;
    border-radius: media.$r-lg;
    @include media.surface("soft");

    strong {
      font-size: 0.95rem;
      font-weight: 700;
      @include media.numeric;
    }
  }

  .mbk__stat--good strong {
    color: $c-success;
  }

  .mbk__stat-label {
    @include media.text("xs");
    @include media.muted(1);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  // ── Yerleşim ────────────────────────────────────────────────────────
  .mbk__foot {
    display: flex;
    gap: media.$s-2;
    flex-wrap: wrap;
    margin-top: media.$s-3;
  }

  .mbk__layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: media.$s-3;
    align-items: start;

    @media (min-width: 1024px) {
      grid-template-columns: minmax(0, 19rem) minmax(0, 1fr);
    }
  }

  .mbk__panel {
    border-radius: media.$r-lg;
    overflow: hidden;
    @include media.surface("raised");
  }

  .mbk__panelhead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: media.$s-2;
    padding: media.$s-3;
    @include media.divider(bottom);

    h2 {
      margin: 0;
      @include media.text("sm");
      font-weight: 700;
      @include media.truncate;
    }
  }

  .mbk__count {
    @include media.chip("neutral");
  }

  .mbk__row-actions {
    display: flex;
    gap: media.$s-1;
    flex-wrap: wrap;
  }

  // ── Yedek listesi ───────────────────────────────────────────────────
  .mbk__sets {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 24rem;
    overflow-y: auto;

    li {
      display: flex;
      align-items: stretch;

      & + li {
        @include media.divider(top);
      }
    }
  }

  .mbk__set {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: media.$s-2 media.$s-3;
    border: 0;
    background: none;
    text-align: left;
    cursor: pointer;
    @include media.focus-ring;

    @include media.hoverable {
      &:hover {
        background: $l-bg-soft;

        @include dark {
          background: $d-bg-hover;
        }
      }
    }
  }

  .mbk__set--on {
    background: $brand-glow;
    box-shadow: inset 3px 0 0 $brand;

    @include dark {
      background: rgb(124 58 237 / 16%);
    }
  }

  .mbk__setdate {
    @include media.text("sm");
    font-weight: 600;
    @include media.truncate;
  }

  .mbk__setmeta {
    @include media.text("xs");
    @include media.muted(1);
    @include media.numeric;
  }

  .mbk__setlabel {
    @include media.chip("brand");
    align-self: flex-start;
    margin-top: 2px;
  }

  .mbk__del {
    flex: 0 0 auto;
    padding: 0 media.$s-3;
    border: 0;
    background: none;
    cursor: pointer;
    color: $c-error;
    @include media.focus-ring;

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    @include media.hoverable {
      &:not(:disabled):hover {
        background: rgb(239 68 68 / 12%);
      }
    }
  }

  // ── Doğrulama şeridi ────────────────────────────────────────────────
  .mbk__verify {
    display: flex;
    align-items: center;
    gap: media.$s-1;
    margin: media.$s-3 media.$s-3 0;
    padding: media.$s-2 media.$s-3;
    border-radius: media.$r-md;
    @include media.text("xs");
  }

  .mbk__verify--ok {
    color: $c-success;
    background: rgb(16 185 129 / 12%);
  }

  .mbk__verify--bad {
    color: $c-error;
    background: rgb(239 68 68 / 12%);
  }

  // ── Bloklar ─────────────────────────────────────────────────────────
  .mbk__block {
    padding: media.$s-3;

    & + .mbk__block {
      @include media.divider(top);
    }

    h3 {
      margin: 0 0 2px;
      @include media.text("sm");
      font-weight: 700;
    }
  }

  .mbk__blockhead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: media.$s-2;
  }

  .mbk__hint {
    margin: 0 0 media.$s-2;
    @include media.text("xs");
    @include media.muted(1);
  }

  .mbk__plan {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .mbk__prow {
    display: grid;
    grid-template-columns: 3rem minmax(6rem, auto);
    align-items: baseline;
    gap: media.$s-2;
    padding: media.$s-1 0;

    @media (min-width: 1024px) {
      grid-template-columns: 3rem minmax(7rem, auto) minmax(0, 1fr);
    }

    & + .mbk__prow {
      @include media.divider(top);
    }

    strong {
      @include media.text("body");
      font-weight: 700;
      text-align: right;
      @include media.numeric;
    }

    span {
      @include media.text("sm");
    }

    em {
      @include media.text("xs");
      @include media.muted(2);
      font-style: normal;
    }
  }

  .mbk__prow--good strong {
    color: $c-success;
  }

  .mbk__prow--warn strong {
    color: $c-warning;
  }

  .mbk__prow--danger strong {
    color: $c-error;
  }

  // ── Uygulama ────────────────────────────────────────────────────────
  .mbk__check {
    display: flex;
    align-items: flex-start;
    gap: media.$s-2;
    margin-top: media.$s-2;
    cursor: pointer;

    span {
      display: flex;
      flex-direction: column;
    }

    strong {
      @include media.text("sm");
      font-weight: 600;
    }

    em {
      @include media.text("xs");
      @include media.muted(1);
      font-style: normal;
    }
  }

  .mbk__warn--standalone {
    margin-bottom: media.$s-4;
  }

  .mbk__warn {
    display: flex;
    align-items: center;
    gap: media.$s-1;
    margin: media.$s-2 0 0;
    padding: media.$s-2 media.$s-3;
    border-radius: media.$r-md;
    color: $c-warning;
    background: rgb(245 158 11 / 12%);
    @include media.text("xs");
  }



  // ── Dışa aktarma ────────────────────────────────────────────────────
  // Doğrulama şeridi blok içinde de kullanılıyor; oradaki kenar boşluğu
  // panel kenarına göre ayarlıydı, burada bloğun kendi dolgusu var.
  .mbk__verify--flush {
    margin: media.$s-2 0 0;
  }

  // Künyesi olmayan eski yedek: ne "sağlam" ne "bozuk" — bilinmiyor.
  // Yeşil göstermek bilmediğimiz bir şeye güven vermek olurdu.
  .mbk__verify--idle {
    @include media.muted(1);
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-hover;
    }
  }


  .mbk__progress {
    height: 6px;
    margin-top: media.$s-2;
    border-radius: media.$r-sm;
    overflow: hidden;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-hover;
    }

    span {
      display: block;
      height: 100%;
      background: $brand;
      transition: width $t-base;
    }
  }

  .mbk__caution {
    display: flex;
    align-items: flex-start;
    gap: 0.3rem;
    margin: media.$s-2 0 0;
    color: $c-warning;
    @include media.text("xs");
  }

  // Bağlantı düğme gibi görünüyor: indirme gerçek bir gezinme, `button` ile
  // taklit etmek "kaydet" ile aynı öğe tipini paylaşmak olurdu.
  a.mbk__btn {
    text-decoration: none;
  }

  // ── Düğmeler: denetim sayfasının ölçüleriyle ────────────────────────
  .mbk__btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 0.7rem;
    border-radius: media.$r-md;
    border: 1px solid $l-border;
    background: none;
    color: inherit;
    cursor: pointer;
    @include media.text("xs");
    @include media.hoverable;

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    @include dark {
      border-color: $d-border;
    }
  }

  .mbk__btn--primary {
    border-color: $brand;
    background: $brand;
    color: #fff;
  }

  .mbk__btn--danger {
    border-color: $c-error;
    color: $c-error;
  }

  .mbk__mini {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.1rem 0.4rem;
    border-radius: media.$r-sm;
    border: 1px solid $l-border;
    background: none;
    cursor: pointer;
    color: inherit;
    @include media.text("xs");
    @include media.hoverable;

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    @include dark {
      border-color: $d-border;
    }
  }

  .mbk__empty {
    padding: media.$s-6 media.$s-3;
    text-align: center;
    @include media.muted(2);
    @include media.text("sm");
  }

  // Etiket alanı yönetimdeki ekranda yok (orası etiketi ayrı soruyor); satıcı
  // için başlık şeridine giriyor ve düğme yüksekliğiyle hizalanıyor.
  .mbk__label {
    width: 190px;
    height: 34px;
    padding: 0 media.$s-3;
    border: 1px solid $l-border;
    border-radius: media.$r-md;
    background: $l-bg;
    color: $l-text-900;
    font: inherit;
    font-size: 12.5px;

    &::placeholder {
      color: $l-text-300;
    }

    @include media.focus-ring;

    @include dark {
      border-color: $d-border;
      background: $d-bg-elevated;
      color: $d-text;
    }
  }

  // Başlıktaki düğme, yanındaki alanla aynı yükseklikte olmalı; `mbk__btn`
  // panel içi küçük ölçüde kalıyor, şeritte kısa görünüyordu.
  .mpage__actions .mbk__btn {
    height: 34px;
    padding: 0 media.$s-4;
    font-size: 12.5px;
  }
</style>
