<script setup>
  import { computed, onMounted, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import { useBreakpoint } from "@/composables/useBreakpoint";
  import { useMediaBackup } from "@/composables/useMediaBackup";
  import { formatSize } from "@/utils/mediaFormat";

  /**
   * Medya yedekleme ve geri yükleme (TUR-131).
   *
   * Düzen `MediaAuditView` ile aynı iskeleti paylaşıyor: `mpage` başlık, dört
   * kutuluk durum şeridi, panel yüzeyleri, aynı düğme ölçüleri. İki sayfa da
   * sistem bölümünde yan yana duruyor; ayrı görünmeleri kullanıcıya iki farklı
   * ürün karşısındaymış gibi gelirdi.
   *
   * Scoped stil paylaşılmadığı için kurallar buraya TAŞINDI — sınıf adını
   * kopyalamak yetmiyor.
   *
   * Ekranın kendi tasarım kararı tek bir riskten türedi: geri yükleme yanlış
   * çalışırsa bugünkü veriyi dünkiyle ezer. Bu yüzden akış üç adım ve sıra
   * atlanamıyor — yedek seç, planı gör, sonra uygula.
   */
  const { t, locale } = useI18n();
  const { isXl: isDesktop } = useBreakpoint();
  const b = useMediaBackup();

  const overwrite = ref(false);
  const silinecek = ref(null);
  const silConfirm = ref(false);

  onMounted(async () => {
    await b.load();
    if (b.selected.value) {
      b.buildPlan();
      b.refreshExport();
    }
  });

  function tarih(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(locale.value, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function sec(s) {
    b.selected.value = s.set_id;
    b.plan.value = null;
    b.verifyResult.value = null;
    b.exportState.value = null;
    b.buildPlan();
    b.refreshExport();
  }

  function askDelete(s) {
    silinecek.value = s;
    silConfirm.value = true;
  }

  async function runDelete() {
    if (silinecek.value) await b.deleteSet(silinecek.value.set_id);
    silinecek.value = null;
  }

  /**
   * Dışa aktarmanın tek kelimelik hâli — şablon dört ayrı koşul yerine buna bakar.
   *
   * "Takıldı" ayrı bir hâl: kuyruk durursa durum sonsuza kadar "hazırlanıyor"
   * kalır ve kullanıcı bekler durur. Sunucu bunu bayat sayıyor, ekran da
   * yeniden başlatılabilir göstermeli.
   */
  const disaDurum = computed(() => {
    const s = b.exportState.value;
    if (!s?.state) return "";
    if (s.state === "hazirlaniyor") return s.stale ? "takildi" : "hazirlaniyor";
    return s.state;
  });

  /** Yedek alındığındaki veritabanı yapısı ile bugünkünün karşılaştırması. */
  const yapi = computed(() => b.plan.value?.schema || null);

  /**
   * Yalnız VERİ KAYBI riski taşıyan farklar.
   *
   * "Yedekten sonra eklenmiş sütun" listelenmiyor: o alanlar boş gelir ama
   * hiçbir şey kaybolmaz. İkisini aynı listede göstermek gerçek uyarıyı
   * gürültüye gömerdi.
   */
  const yapiSorunlari = computed(() => {
    const y = yapi.value;
    if (!y?.known || y.ok) return [];
    return [
      { key: "missingColumns", items: y.missing_columns || [] },
      { key: "missingTables", items: y.missing_tables || [] },
      { key: "brokenLinks", items: y.broken_links || [] },
      { key: "missingPatches", items: y.missing_patches || [] },
    ].filter((s) => s.items.length);
  });

  /** Plan satırları — sayı, etiket ve açıklama bir arada; şablon sade kalsın. */
  const planRows = computed(() => {
    const p = b.plan.value;
    if (!p) return [];
    return [
      { key: "ok", n: p.ok, tone: "good" },
      { key: "missingFile", n: p.missing_file_count, tone: p.missing_file_count ? "warn" : "" },
      {
        key: "missingRecord",
        n: p.missing_record_count,
        tone: p.missing_record_count ? "warn" : "",
      },
      { key: "conflict", n: p.conflict_count, tone: p.conflict_count ? "danger" : "" },
      { key: "extra", n: p.extra_count, tone: "" },
    ];
  });
</script>

<template>
  <div class="mpage">
    <header class="mpage__head">
      <div>
        <h1 class="mpage__title">
          <AppIcon name="save" :size="16" class="mpage__title-icon" />
          {{ t("mediaBackup.title") }}
        </h1>
        <p class="mpage__subtitle">{{ t("mediaBackup.subtitle") }}</p>
      </div>

      <div class="mpage__actions">
        <button type="button" class="mbk__btn" :disabled="Boolean(b.busy.value)" @click="b.prune()">
          <AppIcon name="trash-2" :size="14" />
          {{ t("mediaBackup.prune") }}
        </button>
        <button
          type="button"
          class="mbk__btn mbk__btn--primary"
          :disabled="Boolean(b.busy.value)"
          @click="b.createBackup()"
        >
          <AppIcon name="save" :size="14" />
          {{ b.busy.value === "create" ? t("mediaBackup.creating") : t("mediaBackup.create") }}
        </button>
      </div>
    </header>

    <!-- Durum şeridi: deponun gerçek maliyeti. Saklama sınırı burada yazıyor ki
         "neden bu kadar yedek var" sorusu ekrandan cevaplansın. -->
    <div class="mbk__stats">
      <div class="mbk__stat">
        <span class="mbk__stat-label">{{ t("mediaBackup.stat.sets") }}</span>
        <strong>{{ b.usage.value.sets }}</strong>
      </div>
      <div class="mbk__stat">
        <span class="mbk__stat-label">{{ t("mediaBackup.stat.size") }}</span>
        <strong>{{ formatSize(b.usage.value.bytes) }}</strong>
      </div>
      <div class="mbk__stat">
        <span class="mbk__stat-label">{{ t("mediaBackup.stat.keep") }}</span>
        <strong>{{ b.keep.value }}</strong>
      </div>
      <div class="mbk__stat mbk__stat--good">
        <span class="mbk__stat-label">{{ t("mediaBackup.stat.schedule") }}</span>
        <strong>{{ t("mediaBackup.daily") }}</strong>
      </div>
    </div>

    <div class="mbk__layout">
      <!-- ── Yedek listesi ── -->
      <section class="mbk__panel">
        <header class="mbk__panelhead">
          <h2>{{ t("mediaBackup.list") }}</h2>
          <span v-if="b.sets.value.length" class="mbk__count">{{ b.sets.value.length }}</span>
        </header>

        <p v-if="b.loading.value" class="mbk__empty">{{ t("mediaBackup.loading") }}</p>
        <p v-else-if="!b.sets.value.length" class="mbk__empty">{{ t("mediaBackup.none") }}</p>

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
                {{ t("mediaBackup.setMeta", { files: s.file_count, records: s.record_count }) }}
              </span>
              <span v-if="s.label" class="mbk__setlabel">{{ s.label }}</span>
            </button>
            <!-- Silme ayrı düğme: satıra tıklamak seçer, silmez. Yıkıcı işlem
                 gezinme hareketiyle aynı tıklamayı paylaşmamalı. -->
            <button
              type="button"
              class="mbk__del"
              :disabled="Boolean(b.busy.value) || b.sets.value.length < 2"
              :title="
                b.sets.value.length < 2 ? t('mediaBackup.lastSet') : t('mediaBackup.deleteSet')
              "
              :aria-label="t('mediaBackup.deleteSet')"
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
            <button
              type="button"
              class="mbk__mini"
              :disabled="Boolean(b.busy.value)"
              @click="b.verify(false)"
            >
              <AppIcon name="shield-check" :size="13" />
              {{ t("mediaBackup.verify") }}
            </button>
            <button
              type="button"
              class="mbk__mini"
              :disabled="Boolean(b.busy.value)"
              :title="t('mediaBackup.verifyDeepHint')"
              @click="b.verify(true)"
            >
              {{
                b.busy.value === "verifyDeep"
                  ? t("mediaBackup.verifying")
                  : t("mediaBackup.verifyDeep")
              }}
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
            {{
              t("mediaBackup.verifyOk", {
                files: b.verifyResult.value.files,
                records: b.verifyResult.value.records,
              })
            }}
            <template v-if="b.verifyResult.value.deep"> · {{ t("mediaBackup.deepDone") }}</template>
          </span>
          <span v-else>
            {{
              t("mediaBackup.verifyBad", {
                missing: b.verifyResult.value.missing_count,
                corrupt: b.verifyResult.value.corrupt_count,
              })
            }}
          </span>
        </p>

        <!-- ── Geri yükleme planı ── -->
        <div class="mbk__block">
          <div class="mbk__blockhead">
            <h3>{{ t("mediaBackup.plan") }}</h3>
            <button
              type="button"
              class="mbk__mini"
              :disabled="Boolean(b.busy.value)"
              @click="b.buildPlan()"
            >
              <AppIcon name="refresh-cw" :size="13" />
              {{ b.busy.value === "plan" ? t("mediaBackup.planning") : t("mediaBackup.replan") }}
            </button>
          </div>
          <p class="mbk__hint">{{ t("mediaBackup.planHint") }}</p>

          <ul v-if="b.plan.value" class="mbk__plan">
            <li v-for="r in planRows" :key="r.key" :class="`mbk__prow mbk__prow--${r.tone}`">
              <strong>{{ r.n }}</strong>
              <span>{{ t(`mediaBackup.row.${r.key}`) }}</span>
              <em v-if="isDesktop">{{ t(`mediaBackup.rowHint.${r.key}`) }}</em>
            </li>
          </ul>
          <p v-else class="mbk__empty">{{ t("mediaBackup.noPlan") }}</p>

          <!-- Yapı karşılaştırması.
               Dosya sayıları tutsa bile veritabanı yapısı ayrışmışsa geri
               yükleme sessizce eksik çalışır: kayıtlar yedeğin alındığı andaki
               sütunlara göre yazıldı, bugün o sütun yoksa alan hiç yazılmaz.
               Uyarı "Uygula" düğmesinden ÖNCE görünmeli. -->
          <template v-if="yapi">
            <p
              class="mbk__verify mbk__verify--flush"
              :class="
                yapi.ok === true
                  ? 'mbk__verify--ok'
                  : yapi.known
                    ? 'mbk__verify--bad'
                    : 'mbk__verify--idle'
              "
            >
              <AppIcon :name="yapi.ok === true ? 'circle-check' : 'circle-alert'" :size="14" />
              <span v-if="!yapi.known">{{ t("mediaBackup.schemaUnknown") }}</span>
              <span v-else-if="yapi.ok">
                {{ t("mediaBackup.schemaOk", { then: yapi.app_version_then || "—" }) }}
              </span>
              <span v-else>{{ t("mediaBackup.schemaBad") }}</span>
            </p>

            <ul v-if="yapiSorunlari.length" class="mbk__schema">
              <li v-for="s in yapiSorunlari" :key="s.key">
                <strong>{{ s.items.length }}</strong>
                <span>{{ t(`mediaBackup.schema.${s.key}`) }}</span>
                <em>{{ s.items.slice(0, 4).join(", ") }}</em>
              </li>
            </ul>
          </template>
        </div>

        <!-- ── Uygulama ── -->
        <div v-if="b.plan.value" class="mbk__block">
          <h3>{{ t("mediaBackup.apply") }}</h3>

          <label class="mbk__check">
            <input v-model="overwrite" type="checkbox" />
            <span>
              <strong>{{ t("mediaBackup.overwrite") }}</strong>
              <em>{{ t("mediaBackup.overwriteHint") }}</em>
            </span>
          </label>

          <p v-if="overwrite && b.plan.value.conflict_count" class="mbk__warn">
            <AppIcon name="triangle-alert" :size="14" />
            {{ t("mediaBackup.overwriteWarn", { n: b.plan.value.conflict_count }) }}
          </p>

          <div class="mbk__foot">
            <button
              type="button"
              class="mbk__btn"
              :disabled="Boolean(b.busy.value) || !b.plan.value.missing_file_count"
              @click="b.repairMissing()"
            >
              <AppIcon name="wand" :size="14" />
              {{ t("mediaBackup.repair", { n: b.plan.value.missing_file_count }) }}
            </button>
            <button
              type="button"
              class="mbk__btn mbk__btn--danger"
              :disabled="Boolean(b.busy.value) || (!b.hasWork.value && !overwrite)"
              @click="b.applyRestore({ overwrite })"
            >
              <AppIcon name="history" :size="14" />
              {{ b.busy.value === "apply" ? t("mediaBackup.applying") : t("mediaBackup.applyNow") }}
            </button>
          </div>

          <p class="mbk__safe">
            <AppIcon name="shield-check" :size="13" />
            {{ t("mediaBackup.neverDeletes") }}
          </p>
        </div>

        <!-- ── Dışa aktarma ──
             Yedek koruduğu medyayla aynı diskte duruyor; paketi indirmek onu
             gerçekten ikinci bir yere taşımanın tek yolu. Hazırlık arkada
             sürdüğü için ekran üç hâl gösteriyor: yok / hazırlanıyor / hazır. -->
        <div class="mbk__block">
          <h3>{{ t("mediaBackup.export") }}</h3>
          <p class="mbk__hint">{{ t("mediaBackup.exportHint") }}</p>

          <!-- Hazırlanıyor -->
          <template v-if="disaDurum === 'hazirlaniyor'">
            <div
              class="mbk__progress"
              role="progressbar"
              :aria-valuenow="b.exportProgress.value"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <span :style="{ width: `${b.exportProgress.value}%` }" />
            </div>
            <p class="mbk__hint">
              {{
                t("mediaBackup.exportWorking", {
                  done: b.exportState.value?.done || 0,
                  total: b.exportState.value?.total || 0,
                  pct: b.exportProgress.value,
                })
              }}
            </p>
          </template>

          <!-- Hazır -->
          <template v-else-if="disaDurum === 'hazir'">
            <p class="mbk__verify mbk__verify--ok mbk__verify--flush">
              <AppIcon name="circle-check" :size="14" />
              <span>
                {{
                  t("mediaBackup.exportReady", {
                    size: formatSize(b.exportState.value?.bytes || 0),
                    files: b.exportState.value?.files || 0,
                    records: b.exportState.value?.records || 0,
                  })
                }}
              </span>
            </p>
            <p v-if="b.exportState.value?.skipped" class="mbk__warn">
              <AppIcon name="triangle-alert" :size="14" />
              {{ t("mediaBackup.exportSkipped", { n: b.exportState.value.skipped }) }}
            </p>
          </template>

          <!-- Hata / takıldı -->
          <p v-else-if="disaDurum === 'hata'" class="mbk__verify mbk__verify--bad mbk__verify--flush">
            <AppIcon name="circle-alert" :size="14" />
            <span>{{ b.exportState.value?.error || t("mediaBackup.exportFailed") }}</span>
          </p>
          <p v-else-if="disaDurum === 'takildi'" class="mbk__warn">
            <AppIcon name="triangle-alert" :size="14" />
            {{ t("mediaBackup.exportStale") }}
          </p>

          <div class="mbk__foot">
            <a
              v-if="disaDurum === 'hazir'"
              class="mbk__btn mbk__btn--primary"
              :href="b.exportUrl.value"
              download
            >
              <AppIcon name="download" :size="14" />
              {{ t("mediaBackup.exportDownload") }}
            </a>
            <button
              v-else
              type="button"
              class="mbk__btn mbk__btn--primary"
              :disabled="Boolean(b.busy.value) || disaDurum === 'hazirlaniyor'"
              @click="b.startExport()"
            >
              <AppIcon name="package" :size="14" />
              {{
                disaDurum === "hazirlaniyor"
                  ? t("mediaBackup.exportPreparing")
                  : t("mediaBackup.exportStart")
              }}
            </button>
            <button
              v-if="disaDurum === 'hazir'"
              type="button"
              class="mbk__btn"
              :disabled="Boolean(b.busy.value)"
              @click="b.discardExport()"
            >
              <AppIcon name="trash-2" :size="14" />
              {{ t("mediaBackup.exportDiscard") }}
            </button>
          </div>

          <!-- Paket özel belgeleri de içeriyor; uyarı indirmeden ÖNCE görünmeli. -->
          <p class="mbk__caution">
            <AppIcon name="shield-alert" :size="13" />
            {{ t("mediaBackup.exportPrivacy") }}
          </p>
        </div>
      </section>
    </div>

    <ConfirmDialog
      v-model:open="silConfirm"
      :title="t('mediaBackup.deleteTitle')"
      :message="t('mediaBackup.deleteBody', { date: tarih(silinecek?.created) })"
      :confirm-label="t('mediaBackup.deleteSet')"
      tone="danger"
      @confirm="runDelete"
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

  .mbk__foot {
    display: flex;
    gap: media.$s-2;
    flex-wrap: wrap;
    margin-top: media.$s-3;
  }

  .mbk__safe {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin: media.$s-2 0 0;
    color: $c-success;
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

  .mbk__schema {
    list-style: none;
    margin: media.$s-2 0 0;
    padding: 0;

    li {
      display: grid;
      grid-template-columns: 2.5rem minmax(6rem, auto);
      align-items: baseline;
      gap: media.$s-2;
      padding: media.$s-1 0;

      @media (min-width: 1024px) {
        grid-template-columns: 2.5rem minmax(9rem, auto) minmax(0, 1fr);
      }

      & + li {
        @include media.divider(top);
      }
    }

    strong {
      text-align: right;
      font-weight: 700;
      color: $c-error;
      @include media.text("sm");
      @include media.numeric;
    }

    span {
      @include media.text("sm");
    }

    em {
      font-style: normal;
      @include media.text("xs");
      @include media.muted(2);
      @include media.truncate;
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
</style>
