<script setup>
  import { computed, nextTick, onMounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import { useMediaSecurity } from "@/composables/useMediaSecurity";
  import { useToast } from "@/composables/useToast";
  import { formatDateTime } from "@/utils/dateFormat";
  import { formatSize } from "@/utils/mediaFormat";

  /** Dosya adının uzantısı — tür çipindeki monogram. Yoksa "?" (adsız/uzantısız). */
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

  // Mobilde politika ayrıntısı kapalı başlar; masaüstünde her zaman açık
  // (CSS ile). Tek durum, iki görünüm — ikinci bir bayrak tutulmuyor.
  const policyOpen = ref(false);

  // Tarayıcı yolu değil adı: "/usr/bin/clamdscan" rozette yer kaplıyordu,
  // bilgi olarak da yalnız son parça anlamlı.
  const scannerName = computed(() => {
    const yol = s.policy.value.scanner || "";
    return yol.split("/").filter(Boolean).pop() || yol;
  });

  // Temiz oranı: sonucu OLAN taramalar üzerinden. `pending` sonuç değil,
  // `unscanned` kapsam dışı; ikisi paydaya girmez. Tarama hiç yoksa halka
  // çizilmez (0/0'ı %100 diye göstermek yalan olurdu).
  const scanned = computed(() => {
    const c = s.counts.value || {};
    return (c.clean ?? 0) + (c.infected ?? 0) + (c.failed ?? 0);
  });
  const cleanRatio = computed(() =>
    scanned.value ? ((s.counts.value.clean ?? 0) / scanned.value) * 100 : 0,
  );
  const ratioLabel = computed(() =>
    new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }).format(cleanRatio.value),
  );
  const fmtInt = (n) => new Intl.NumberFormat(locale.value).format(n ?? 0);

  // Halka: r=22 → çevre 2π·22 ≈ 138.23. İlk boyamada boş (offset tam),
  // sayaçlar gelince hedefe iner; CSS transition aradaki yolu çizer.
  // "Sunum değerinden hedefe" — hedef değerden başlatılsaydı halka
  // sıçrayarak belirirdi, çizilmezdi.
  const CEVRE = 138.23;
  const ringOffset = ref(CEVRE);
  watch(cleanRatio, async (oran) => {
    await nextTick();
    ringOffset.value = CEVRE * (1 - oran / 100);
  });

  const quarantineCount = computed(
    () => (s.counts.value.infected ?? 0) + (s.counts.value.failed ?? 0),
  );
  const holdCount = computed(() => s.counts.value.pending ?? 0);

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
    <!-- ── Başlık: ad + durum rozeti + politika rozetleri + eylemler ──── -->
    <header class="mq__head mq-in" style="--i: 0">
      <div class="mq__head-text">
        <div class="mq__title-row">
          <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
            {{ t("mediaQuarantine.title") }}
          </h1>
          <!-- Durum rozeti: tarama açıkken nabız atan nokta. Kapalıyken nabız
               YOK — hareket "canlı" demek, kapalı bir şeyi canlı göstermek
               yanlış sinyal olurdu. -->
          <span
            class="mq__status"
            :class="s.scanningOff.value ? 'mq__status--off' : 'mq__status--on'"
          >
            <span class="mq__status-dot" aria-hidden="true"></span>
            {{ s.scanningOff.value ? t("mediaQuarantine.policy.off") : t("mediaQuarantine.policy.on") }}
          </span>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ t("mediaQuarantine.subtitle") }}</p>

        <!-- Politika. Tarayıcı yoksa bunu SESSİZ geçmek, hiç çalışmayan bir
             güvenlik özelliğini çalışıyor gibi göstermek olurdu. Mobilde
             açılır-kapanır, masaüstünde her zaman açık. -->
        <p v-if="s.scanningOff.value" class="mq__policy-off">
          {{ t("mediaQuarantine.policy.offHint") }}
        </p>
        <template v-else>
          <button
            type="button"
            class="mq__policy-toggle"
            :aria-expanded="policyOpen"
            aria-controls="mq-policy-facts"
            @click="policyOpen = !policyOpen"
          >
            {{ t("mediaQuarantine.policy.details") }}
            <AppIcon :name="policyOpen ? 'chevron-up' : 'chevron-down'" :size="14" />
          </button>
          <Transition name="mq-collapse">
            <ul
              v-show="policyOpen"
              id="mq-policy-facts"
              class="mq__facts"
            >
              <li class="mq__fact">
                <AppIcon name="shield-check" :size="14" />
                {{ t("mediaQuarantine.policy.scanner", { name: scannerName }) }}
              </li>
              <li class="mq__fact">
                <AppIcon name="lock" :size="14" />
                {{
                  s.policy.value.hold_until_clean
                    ? t("mediaQuarantine.policy.holdOn")
                    : t("mediaQuarantine.policy.holdOff")
                }}
              </li>
              <li class="mq__fact">
                <AppIcon name="triangle-alert" :size="14" />
                {{
                  s.policy.value.fail_closed
                    ? t("mediaQuarantine.policy.failClosed")
                    : t("mediaQuarantine.policy.failOpen")
                }}
              </li>
            </ul>
          </Transition>
        </template>
      </div>

      <!-- Mobilde bu grup ekranın altına sabitlenir (alt işlem çubuğu),
           masaüstünde başlığın sağında durur. Aynı iki düğme, iki yer değil. -->
      <div class="mq__head-actions">
        <button
          type="button"
          class="hdr-btn-outlined mq__btn"
          :disabled="!!s.acting.value"
          @click="doSweep"
        >
          <AppIcon name="refresh-cw" :size="14" />
          {{ t("mediaQuarantine.action.sweep") }}
        </button>
        <button
          type="button"
          class="hdr-btn-primary mq__btn"
          :disabled="!!s.acting.value"
          @click="doBackfill"
        >
          <AppIcon name="history" :size="14" />
          {{ t("mediaQuarantine.action.backfill") }}
        </button>
      </div>
    </header>

    <!-- ── Sayaçlar ─────────────────────────────────────────────────────── -->
    <div class="mq__stats">
      <div class="card mq__stat mq__stat--danger mq-in" style="--i: 1">
        <strong>{{ fmtInt(s.counts.value.infected) }}</strong>
        <span>{{ t("mediaQuarantine.stat.infected") }}</span>
      </div>
      <div class="card mq__stat mq__stat--warn mq-in" style="--i: 2">
        <strong>{{ fmtInt(s.counts.value.failed) }}</strong>
        <span>{{ t("mediaQuarantine.stat.failed") }}</span>
      </div>
      <div class="card mq__stat mq__stat--info mq-in" style="--i: 3">
        <strong>{{ fmtInt(s.counts.value.pending) }}</strong>
        <span>{{ t("mediaQuarantine.stat.pending") }}</span>
      </div>
      <div class="card mq__stat mq__stat--ok mq-in" style="--i: 4">
        <strong>{{ fmtInt(s.counts.value.clean) }}</strong>
        <span>{{ t("mediaQuarantine.stat.clean") }}</span>
      </div>
      <div class="card mq__stat mq__stat--muted mq-in" style="--i: 5">
        <strong>{{ fmtInt(s.counts.value.unscanned) }}</strong>
        <span>{{ t("mediaQuarantine.stat.unscanned") }}</span>
      </div>
      <!-- Sağlık halkası: sonucu olan taramalar içinde temiz payı. -->
      <div v-if="scanned > 0" class="card mq__stat mq__ring mq-in" style="--i: 6">
        <svg class="mq__ring-svg" viewBox="0 0 56 56" aria-hidden="true">
          <circle class="mq__ring-track" cx="28" cy="28" r="22" />
          <circle
            class="mq__ring-arc"
            cx="28"
            cy="28"
            r="22"
            :stroke-dasharray="CEVRE"
            :stroke-dashoffset="ringOffset"
            transform="rotate(-90 28 28)"
          />
          <text class="mq__ring-label" x="28" y="31.5" text-anchor="middle">%{{ ratioLabel }}</text>
        </svg>
        <div class="mq__ring-text">
          <strong>{{ t("mediaQuarantine.stat.cleanRatio") }}</strong>
          <span>{{
            t("mediaQuarantine.stat.scannedOf", {
              clean: fmtInt(s.counts.value.clean),
              total: fmtInt(scanned),
            })
          }}</span>
        </div>
      </div>
    </div>

    <!-- ── Sekmeler (segmentli, sayaçlı) ────────────────────────────────── -->
    <nav class="mq__tabs mq-in" style="--i: 7" role="tablist">
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
        <span
          class="mq__tab-count"
          :class="{ 'mq__tab-count--danger': k === 'quarantine' && quarantineCount > 0 }"
        >
          {{ fmtInt(k === "quarantine" ? quarantineCount : holdCount) }}
        </span>
      </button>
    </nav>
    <p class="mq__hint mq-in" style="--i: 7">{{ t(`mediaQuarantine.hint.${s.tab.value}`) }}</p>

    <!-- ── Liste ────────────────────────────────────────────────────────── -->
    <div v-if="s.loading.value" class="card mq__empty">{{ t("common.loading") }}</div>
    <div v-else-if="s.error.value" class="card mq__empty mq__empty--err">{{ s.error.value }}</div>
    <div v-else-if="!s.items.value.length" class="card mq__empty mq-in" style="--i: 8">
      <span class="mq__empty-icon" aria-hidden="true">
        <AppIcon :name="s.tab.value === 'hold' ? 'inbox' : 'shield-check'" :size="26" />
      </span>
      <strong>{{ t(`mediaQuarantine.empty.${s.tab.value}`) }}</strong>
      <span>{{ t(`mediaQuarantine.hint.${s.tab.value}`) }}</span>
    </div>
    <!-- Masaüstünde tablo (sabit sütun düzeni: hiçbir hücre alt satıra
         kaymaz, dosya adı/yol taşarsa "…"), dokunmatikte aynı markup KART
         olur (aşağıdaki @media). İkinci bir liste şablonu yazmak aynı eylem
         mantığını iki yerde tutmak demekti. -->
    <div v-else class="card mq__table-wrap mq-in" style="--i: 8">
      <table class="mq__table">
        <thead>
          <tr>
            <th class="mq__col-file">{{ t("mediaQuarantine.col.file") }}</th>
            <th class="mq__col-size">{{ t("mediaQuarantine.col.size") }}</th>
            <th class="mq__col-status">{{ t("mediaQuarantine.col.status") }}</th>
            <th class="mq__col-when">{{ t("mediaQuarantine.col.when") }}</th>
            <th class="mq__col-actions">{{ t("mediaQuarantine.col.actions") }}</th>
          </tr>
        </thead>
        <!-- Satır giriş/çıkışı: karantinadan çıkan satır solup gidiyor,
             liste "yerinden fırlamıyor". Süre kısa, eğri ease-out — UI'da
             ease-in yasak (variables.scss). -->
        <TransitionGroup tag="tbody" name="mq-row">
          <tr v-for="row in s.items.value" :key="row.name" class="mq__row">
            <td class="mq__col-file">
              <div class="mq__file-cell">
                <!-- Karantinadaki dosya public ağaçtan çıkmıştır, önizlemesi
                     yoktur — tür çipi uzantı monogramı taşır. -->
                <span
                  class="mq__type"
                  :class="row.scan_status === 'infected' ? 'mq__type--danger' : 'mq__type--warn'"
                  aria-hidden="true"
                >
                  <AppIcon name="file-text" :size="16" />
                  <code>{{ uzanti(row.file_name) }}</code>
                </span>
                <div class="mq__file-text">
                  <span class="mq__file" :title="row.file_name">{{ row.file_name }}</span>
                  <code class="mq__url" :title="row.file_url">{{ row.file_url }}</code>
                </div>
              </div>
            </td>
            <td class="mq__col-size">{{ formatSize(row.file_size) }}</td>
            <td class="mq__col-status">
              <div class="mq__status-cell">
                <span v-if="s.tab.value === 'hold'" class="mq__badge mq__badge--info">
                  {{ t("media.scanStatus.pending") }}
                </span>
                <span
                  v-else
                  class="mq__badge"
                  :class="row.scan_status === 'infected' ? 'mq__badge--danger' : 'mq__badge--warn'"
                >
                  <AppIcon
                    :name="row.scan_status === 'infected' ? 'triangle-alert' : 'circle-help'"
                    :size="12"
                  />
                  {{ t(`media.scanStatus.${row.scan_status}`) }}
                </span>
                <!-- Dosya diskte gerçekten kapalı mı: damga ile fiziksel
                     durumun ayrışması sessiz bir kusur olurdu, açıkça
                     gösteriliyor — ikon + başlık, metin sütunu şişirmiyor. -->
                <span
                  v-if="s.tab.value === 'hold' ? row.in_hold : row.in_quarantine"
                  class="mq__isolated mq__isolated--ok"
                  :title="t('mediaQuarantine.isolated')"
                  :aria-label="t('mediaQuarantine.isolated')"
                  role="img"
                >
                  <AppIcon name="check" :size="12" />
                </span>
                <span
                  v-else
                  class="mq__isolated mq__isolated--warn"
                  :title="t('mediaQuarantine.notIsolatedHint')"
                  :aria-label="t('mediaQuarantine.notIsolated')"
                  role="img"
                >
                  <AppIcon name="triangle-alert" :size="12" />
                </span>
              </div>
            </td>
            <td class="mq__col-when">{{ formatDateTime(row.started_at || row.creation, locale) }}</td>
            <td class="mq__col-actions">
              <template v-if="s.tab.value === 'quarantine'">
                <!-- Onay adımı: çıkarma düğmesinin yerinde açılır, kaynağından
                     büyür (transform-origin sağ). Apple: "bir şey nereden
                     çıktıysa oraya döner". -->
                <Transition name="mq-pop" mode="out-in">
                  <div v-if="confirming === row.name" key="confirm" class="mq__confirm">
                    <p class="mq__confirm-text">{{ t("mediaQuarantine.action.confirmHint") }}</p>
                    <div class="mq__confirm-actions">
                      <button
                        type="button"
                        class="hdr-btn-danger mq__btn mq__btn--sm"
                        @click="doRelease(row)"
                      >
                        {{ t("mediaQuarantine.action.releaseConfirm") }}
                      </button>
                      <button
                        type="button"
                        class="hdr-btn-outlined mq__btn mq__btn--sm"
                        @click="confirming = null"
                      >
                        {{ t("common.cancel") }}
                      </button>
                    </div>
                  </div>
                  <div v-else key="actions" class="mq__row-actions">
                    <button
                      v-if="row.scan_status === 'failed'"
                      type="button"
                      class="hdr-btn-outlined mq__btn mq__btn--sm"
                      :disabled="s.acting.value === row.file_url"
                      @click="doRetry(row)"
                    >
                      <AppIcon name="refresh-cw" :size="14" />
                      {{ t("mediaQuarantine.action.retry") }}
                    </button>
                    <button
                      type="button"
                      class="hdr-btn-outlined mq__btn mq__btn--sm mq__btn--danger"
                      :disabled="s.acting.value === row.file_url"
                      @click="confirming = row.name"
                    >
                      {{ t("mediaQuarantine.action.release") }}
                    </button>
                  </div>
                </Transition>
              </template>
              <span v-else class="mq__muted">{{ t("mediaQuarantine.action.waiting") }}</span>
            </td>
          </tr>
        </TransitionGroup>
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
     elle rem yazılmıyor — mixin MOBİL karşılığını da veriyor. Düğme/kutu/
     başlık panel standardından (`hdr-btn-*`, `card`, tipografi sınıfları) —
     bkz. `.claude/rules/scss.md` §8. Burada yalnız bu ekrana ÖZEL olan şeyler
     var: durum rozeti, politika rozetleri, sayaç ızgarası, sağlık halkası,
     segmentli sekmeler, tablo ve dokunmatik kart düzeni.

     HAREKET (Apple "fluid interfaces" ilkeleri, CSS ile):
     • Basılma geri bildirimi pointer-DOWN anında (`:active`), release'te değil.
     • Giriş: 6px yukarıdan, opaklıkla, `$ease-out` — aşım yok (kritik sönümlü).
     • Halka sunum değerinden hedefe çizilir; hedeften başlatılsaydı sıçrardı.
     • Onay paneli tetikleyicisinin yerinden büyür (`transform-origin`).
     • Yalnız `transform`/`opacity` animasyonu (compositor); layout animasyonu yok.
     • `prefers-reduced-motion`: kayma ve nabız kapanır, yalnız opaklık kalır. */
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  // ── Giriş hareketi: kademeli belirme (--i = sıra) ────────────────────
  @keyframes mq-fade-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  @keyframes mq-pulse {
    0% {
      box-shadow: 0 0 0 0 rgba($c-success, 0.4);
    }
    70% {
      box-shadow: 0 0 0 7px rgba($c-success, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba($c-success, 0);
    }
  }
  .mq-in {
    animation: mq-fade-in 0.4s $ease-out both;
    animation-delay: calc(var(--i, 0) * 50ms);
  }

  .mq {
    padding: media.$s-4;
    display: flex;
    flex-direction: column;
    gap: media.$s-4;
  }

  // ── Başlık ───────────────────────────────────────────────────────────
  .mq__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: media.$s-4;
  }
  .mq__head-text {
    display: flex;
    flex-direction: column;
    gap: media.$s-2;
    min-width: 0;
  }
  .mq__title-row {
    display: flex;
    align-items: center;
    gap: media.$s-3;
    flex-wrap: wrap;
  }
  .mq__head-actions {
    display: flex;
    gap: media.$s-2;
    flex: 0 0 auto;
  }
  // Ortak düğme sınıfları basılma tepkisi vermiyor; burada ekleniyor.
  .mq__btn {
    white-space: nowrap;
    @include media.press(0.97);
    @include media.focus-ring;
    &--sm {
      min-height: 2.25rem;
      padding-inline: media.$s-3;
    }
    &--danger {
      color: $c-error-text;
      border-color: rgba($c-error, 0.45);
      @include dark {
        color: $c-error;
      }
    }
  }

  // Durum rozeti + nabız
  .mq__status {
    @include media.chip("neutral");
    gap: media.$s-2;
    padding-inline-start: media.$s-2;
    &--on {
      color: $c-success-text;
      background: media.$tint-success;
      @include dark {
        color: $c-success;
        background: media.$tint-success;
      }
      .mq__status-dot {
        background: $c-success;
        animation: mq-pulse 2.4s ease-out infinite;
      }
    }
    &--off {
      color: $c-warning-text;
      background: media.$tint-warning;
      @include dark {
        color: $c-warning;
        background: media.$tint-warning;
      }
      .mq__status-dot {
        background: $c-warning;
      }
    }
  }
  .mq__status-dot {
    width: 7px;
    height: 7px;
    border-radius: media.$r-pill;
    flex: 0 0 auto;
  }
  .mq__policy-off {
    @include media.text("sm");
    color: $c-warning-text;
    @include dark {
      color: $c-warning;
    }
  }
  // Politika rozetleri: masaüstünde her zaman görünür, geçiş düğmesi gizli.
  .mq__policy-toggle {
    display: none;
    align-items: center;
    gap: media.$s-1;
    padding: 0;
    border: 0;
    background: none;
    color: $l-text-600;
    @include media.text("xs");
    font-weight: 600;
    cursor: pointer;
    @include media.tap-target;
    @include media.focus-ring;
    @include dark {
      color: $d-text-muted;
    }
  }
  .mq__facts {
    display: flex !important; // v-show masaüstünde etkisiz — her zaman açık
    flex-wrap: wrap;
    gap: media.$s-2;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .mq__fact {
    @include media.chip("neutral");
    font-weight: 500;
    background: $l-bg;
    border: 1px solid $l-border;
    color: $l-text-700;
    :deep(svg) {
      color: $l-text-500;
    }
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text;
    }
  }

  // ── Sayaçlar ─────────────────────────────────────────────────────────
  .mq__stats {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: media.$s-3;
  }
  .mq__stat {
    display: flex;
    flex-direction: column;
    gap: media.$s-1;
    padding: media.$s-3 media.$s-4;
    min-width: 0;
    strong {
      // Ölçek dışı tek değer ve bilerek: sayaç rakamı bir "başlık"tır.
      @include media.text("display");
      @include media.numeric;
      font-size: 1.5rem;
      line-height: 1.1;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    span {
      @include media.text("xs");
      @include media.truncate;
      color: $l-text-500;
      @include dark {
        color: $d-text-muted;
      }
    }
    &--danger strong {
      color: $c-error-text;
      @include dark {
        color: $c-error;
      }
    }
    &--warn strong {
      color: $c-warning-text;
      @include dark {
        color: $c-warning;
      }
    }
    &--info strong {
      color: $c-info-text;
      @include dark {
        color: $c-info;
      }
    }
    &--ok strong {
      color: $c-success-text;
      @include dark {
        color: $c-success;
      }
    }
    &--muted strong {
      color: $l-text-500;
      @include dark {
        color: $d-text-faint;
      }
    }
  }
  // Sağlık halkası
  .mq__ring {
    flex-direction: row;
    align-items: center;
    gap: media.$s-3;
  }
  .mq__ring-svg {
    width: 3.5rem;
    height: 3.5rem;
    flex: 0 0 auto;
  }
  .mq__ring-track {
    fill: none;
    stroke: $l-bg-muted;
    stroke-width: 5;
    @include dark {
      stroke: $d-bg-elevated;
    }
  }
  .mq__ring-arc {
    fill: none;
    stroke: $c-success;
    stroke-width: 5;
    stroke-linecap: round;
    // Çizim: 1.2s, ease-out. Sayaç güncellenince (yeniden tarama sonrası)
    // aynı geçişle yeni değere kayar — sıfırdan baştan çizmez.
    transition: stroke-dashoffset 1.2s $ease-out;
  }
  .mq__ring-label {
    font-size: 10.5px;
    font-weight: 700;
    fill: $l-text-900;
    @include media.numeric;
    @include dark {
      fill: $d-text-hi;
    }
  }
  .mq__ring-text {
    display: flex;
    flex-direction: column;
    gap: media.$s-05;
    min-width: 0;
    strong {
      @include media.text("sm");
      font-weight: 600;
      @include media.truncate;
    }
    span {
      @include media.text("xs");
      @include media.numeric;
      color: $l-text-500;
      @include media.truncate;
      @include dark {
        color: $d-text-muted;
      }
    }
  }

  // ── Sekmeler: segmentli kontrol ───────────────────────────────────────
  .mq__tabs {
    display: flex;
    gap: media.$s-1;
    padding: media.$s-1;
    width: fit-content;
    border-radius: media.$r-lg;
    background: $l-bg-muted;
    @include dark {
      background: $d-bg-elevated;
    }
  }
  .mq__tab {
    display: inline-flex;
    align-items: center;
    gap: media.$s-2;
    padding: 0 media.$s-3;
    min-height: 2.25rem;
    border: 0;
    border-radius: media.$r-md;
    background: none;
    color: $l-text-600;
    @include media.text("sm");
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background $t-fast,
      color $t-fast,
      box-shadow $t-fast;
    @include media.press(0.98);
    @include media.focus-ring;
    &--active {
      background: $l-bg;
      color: $l-text-900;
      box-shadow: 0 1px 2px rgb(0 0 0 / 8%);
    }
    @include dark {
      color: $d-text-muted;
      &.mq__tab--active {
        background: $d-bg-card;
        color: $d-text-hi;
      }
    }
  }
  .mq__tab-count {
    @include media.chip("neutral");
    padding-inline: media.$s-2;
    min-width: 1.25rem;
    justify-content: center;
    @include media.numeric;
    &--danger {
      @include media.chip("danger");
      @include dark {
        background: media.$tint-danger;
      }
    }
  }
  .mq__hint {
    @include media.text("sm");
    color: $l-text-500;
    margin-top: calc(-1 * #{media.$s-2});
    @include dark {
      color: $d-text-muted;
    }
  }

  // ── Boş / yükleniyor ─────────────────────────────────────────────────
  .mq__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: media.$s-2;
    padding: media.$s-8 media.$s-4;
    text-align: center;
    color: $l-text-500;
    @include media.text("body");
    border-style: dashed;
    strong {
      color: $l-text-900;
      font-weight: 600;
      @include dark {
        color: $d-text-hi;
      }
    }
    span {
      @include media.text("sm");
      max-width: 34rem;
    }
    &--err {
      color: $c-error;
      border-style: solid;
    }
    @include dark {
      color: $d-text-muted;
    }
  }
  .mq__empty-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3.5rem;
    height: 3.5rem;
    border-radius: media.$r-lg;
    background: media.$tint-info;
    color: $c-info-text;
    @include dark {
      color: $c-info;
    }
  }

  // ── Genel koyu tema kurallarının bu ekrandaki etkisini kaldır ────────
  // `scss/tables.scss` içindeki `html.dark tbody tr td` her hücreyi opak
  // `$d-bg-card` ile boyuyor, `scss/base.scss` içindeki `html.dark header`
  // aynısını sayfa başlığına yapıyor; ikisi de sınıfsız etiket seçicisi ve
  // `!important`. Kurallar silinmiyor, bu ekranda etkisizleştiriliyor.
  html.dark .mq__head,
  html.dark .mq__table td {
    background-color: transparent !important;
  }

  // ── Tablo (masaüstü) ─────────────────────────────────────────────────
  .mq__table-wrap {
    padding: 0;
    overflow: hidden;
  }
  .mq__table {
    width: 100%;
    // Sabit düzen: sütun genişlikleri başlıktan gelir, hücre içeriği
    // sütunu genişletemez → hiçbir hücre alt satıra kaymaz, uzun dosya
    // adı/yol "…" ile kısalır (`truncate`).
    table-layout: fixed;
    border-collapse: collapse;
    @include media.text("sm");
    th,
    td {
      padding: media.$s-3 media.$s-4;
      text-align: start;
      border-bottom: 1px solid $l-border;
      vertical-align: middle;
      white-space: nowrap;
      overflow: hidden;
    }
    thead th {
      @include media.text("xs");
      color: $l-text-500;
      font-weight: 600;
      background: $l-bg-soft;
    }
    tbody tr:last-child td {
      border-bottom: 0;
    }
    @include dark {
      th,
      td {
        border-color: $d-border;
      }
      thead th {
        color: $d-text-muted;
        background: $d-bg-elevated;
      }
    }
  }
  .mq__col-size {
    width: 5.5rem;
  }
  .mq__col-status {
    width: 15rem;
  }
  .mq__col-when {
    width: 10rem;
  }
  .mq__col-actions {
    width: 17rem;
    text-align: end;
  }
  .mq__row {
    transition: background $t-fast;
    @include media.hoverable {
      &:hover td {
        background: $l-bg-soft;
        @include dark {
          background: $d-bg-hover;
        }
      }
    }
  }
  .mq__file-cell {
    display: flex;
    align-items: center;
    gap: media.$s-3;
    min-width: 0;
  }
  .mq__type {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    width: 2.5rem;
    height: 2.5rem;
    flex: 0 0 auto;
    border-radius: media.$r-md;
    code {
      font-size: 9px;
      font-weight: 500;
      letter-spacing: 0.04em;
    }
    &--danger {
      background: media.$tint-danger;
      color: $c-error-text;
      @include dark {
        color: $c-error;
      }
    }
    &--warn {
      background: media.$tint-warning;
      color: $c-warning-text;
      @include dark {
        color: $c-warning;
      }
    }
  }
  .mq__file-text {
    display: flex;
    flex-direction: column;
    gap: media.$s-05;
    min-width: 0;
  }
  .mq__file {
    display: block;
    font-weight: 600;
    @include media.truncate;
  }
  .mq__url {
    display: block;
    @include media.text("xs");
    @include media.truncate;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .mq__status-cell {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    min-width: 0;
  }
  // Rozet: ortak `chip()` mixin'i. Koyu temada tonun tekrar yazılması ŞART —
  // mixin'in koyu bloğu (0-2-1) ton değiştiricisini (0-1-0) eziyor (ölçüldü).
  .mq__badge {
    @include media.chip("neutral");
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
    &--info {
      @include media.chip("info");
      @include dark {
        background: media.$tint-info;
      }
    }
  }
  .mq__isolated {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: media.$r-pill;
    flex: 0 0 auto;
    &--ok {
      background: media.$tint-success;
      color: $c-success-text;
      @include dark {
        color: $c-success;
      }
    }
    &--warn {
      background: media.$tint-warning;
      color: $c-warning-text;
      @include dark {
        color: $c-warning;
      }
    }
  }
  .mq__row-actions {
    display: inline-flex;
    justify-content: flex-end;
    gap: media.$s-2;
  }
  .mq__muted {
    color: $l-text-500;
    @include media.text("xs");
    @include dark {
      color: $d-text-muted;
    }
  }
  // Onay paneli: tetikleyicinin (sağdaki düğme) yerinden büyür.
  .mq__confirm {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-end;
    gap: media.$s-2;
    padding: media.$s-2 media.$s-3;
    border-radius: media.$r-md;
    background: media.$tint-danger;
    transform-origin: right center;
    white-space: normal;
    text-align: end;
  }
  .mq__confirm-text {
    @include media.text("xs");
    color: $c-error-text;
    margin: 0;
    max-width: 16rem;
    @include dark {
      color: $c-error;
    }
  }
  .mq__confirm-actions {
    display: flex;
    gap: media.$s-2;
  }

  // ── Geçişler ─────────────────────────────────────────────────────────
  // Onay: kaynağından ölçekle + opaklık, kritik sönümlü (aşım yok).
  .mq-pop-enter-active {
    transition:
      opacity $d-pop $ease-out,
      transform $d-pop $ease-out;
  }
  .mq-pop-leave-active {
    transition:
      opacity $d-fast $ease-out,
      transform $d-fast $ease-out;
  }
  .mq-pop-enter-from,
  .mq-pop-leave-to {
    opacity: 0;
    transform: scale(0.96);
  }
  // Satır çıkışı: solup 6px kayar; giriş aynı yolun tersi.
  .mq-row-enter-active,
  .mq-row-leave-active {
    transition:
      opacity $d-pop $ease-out,
      transform $d-pop $ease-out;
  }
  .mq-row-enter-from,
  .mq-row-leave-to {
    opacity: 0;
    transform: translateY(-6px);
  }
  // Politika ayrıntısı (yalnız mobilde anlamlı): kısa opaklık geçişi.
  .mq-collapse-enter-active,
  .mq-collapse-leave-active {
    transition: opacity $d-fast $ease-out;
  }
  .mq-collapse-enter-from,
  .mq-collapse-leave-to {
    opacity: 0;
  }

  // ── Laptop (≤1279): sayaçlar 3+3 ─────────────────────────────────────
  @media (max-width: media.$m-bp-detail) {
    .mq__stats {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .mq__col-status {
      width: 13rem;
    }
    .mq__col-actions {
      width: 15rem;
    }
  }

  // ── Dokunmatik (≤1023): tablo KART olur ──────────────────────────────
  // Markup TEK: `<table>` kalıyor, yalnız görüntüleme kutusu değişiyor.
  @media (max-width: media.$m-bp-rail) {
    .mq__table {
      display: block;
    }
    .mq__table thead {
      @include media.sr-only;
    }
    .mq__table tbody,
    .mq__table tr,
    .mq__table td {
      display: block;
    }
    .mq__table tr {
      display: flex;
      flex-direction: column;
      gap: media.$s-2;
      padding: media.$s-3 media.$s-4;
      @include media.divider(bottom);
      &:last-child {
        border-bottom: 0;
      }
    }
    .mq__table td {
      padding: 0;
      border: 0;
      overflow: visible;
    }
    .mq__col-size,
    .mq__col-status,
    .mq__col-when,
    .mq__col-actions {
      width: auto;
    }
    // Sıra: dosya · durum · (boyut · zaman) · eylem. Belge sırası
    // dosya/boyut/durum/zaman/eylem olduğu için boyut ve zaman `order` ile
    // tek meta satırında yan yana getiriliyor.
    .mq__col-status {
      order: 2;
    }
    .mq__col-size,
    .mq__col-when {
      order: 3;
      @include media.text("xs");
      color: $l-text-500;
      @include dark {
        color: $d-text-muted;
      }
    }
    .mq__table tr {
      flex-wrap: wrap;
    }
    .mq__col-size::after {
      content: "·";
      margin-inline: media.$s-2;
    }
    .mq__col-size {
      flex: 0 0 auto;
    }
    .mq__col-when {
      flex: 1 1 auto;
    }
    .mq__col-actions {
      order: 4;
      width: 100%;
      text-align: start;
    }
    .mq__row-actions,
    .mq__confirm {
      display: flex;
      width: 100%;
      flex-direction: column;
      align-items: stretch;
    }
    .mq__confirm {
      transform-origin: center top;
      text-align: start;
    }
    .mq__confirm-text {
      max-width: none;
    }
    .mq__confirm-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    // Eylemler kartta gerçek düğme: 44px hedef, tam genişlik.
    .mq__btn--sm {
      @include media.tap-target;
      width: 100%;
      justify-content: center;
    }
    .mq__stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .mq__ring {
      grid-column: 1 / -1;
    }
    .mq__tabs {
      width: 100%;
    }
    .mq__tab {
      flex: 1 1 0;
      justify-content: center;
      @include media.tap-target;
    }
  }

  // ── Telefon (≤767): politika katlanır, eylemler alt çubuğa iner ───────
  @media (max-width: media.$m-bp-md) {
    .mq {
      // Alt işlem çubuğunun kapladığı yer.
      padding-bottom: calc(#{media.$m-float-bottom} + 3.5rem);
    }
    .mq__head {
      flex-direction: column;
    }
    .mq__policy-toggle {
      display: inline-flex;
    }
    .mq__facts {
      display: flex !important;
    }
    // v-show'un display:none'ı `!important` ile ezilmesin: masaüstü kuralı
    // burada geri alınıyor, geçiş/v-show mobilde kendi işini yapıyor.
    .mq__facts[style*="display: none"] {
      display: none !important;
    }
    .mq__head-actions {
      position: fixed;
      left: 0;
      right: 0;
      bottom: calc(#{media.$m-tabbar-h} + env(safe-area-inset-bottom));
      z-index: 20;
      padding: media.$s-2 media.$s-4;
      background: rgba($l-bg, 0.92);
      backdrop-filter: blur(12px) saturate(160%);
      border-top: 1px solid $l-border;
      @include dark {
        background: rgba($d-bg-card, 0.92);
        border-top-color: $d-border;
      }
    }
    .mq__head-actions .mq__btn {
      flex: 1 1 0;
      justify-content: center;
      @include media.tap-target;
    }
    .mq__title-row {
      gap: media.$s-2;
    }
  }

  // ── Erişilebilirlik: hareket azaltma / saydamlık azaltma ─────────────
  @media (prefers-reduced-motion: reduce) {
    .mq-in {
      animation-duration: 0.01ms;
      animation-delay: 0ms;
    }
    .mq__status-dot {
      animation: none !important;
    }
    .mq__ring-arc {
      transition: none;
    }
    .mq-pop-enter-from,
    .mq-pop-leave-to,
    .mq-row-enter-from,
    .mq-row-leave-to {
      transform: none;
    }
    .mq__btn,
    .mq__tab {
      transition: none;
      &:active {
        transform: none;
      }
    }
  }
  @media (prefers-reduced-transparency: reduce) {
    .mq__head-actions {
      background: $l-bg;
      backdrop-filter: none;
      @include dark {
        background: $d-bg-card;
      }
    }
  }
</style>
