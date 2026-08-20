<template>
  <div class="mrail__inner">
    <div class="mrail__mobile-head">
      <h2 class="mrail__heading">{{ t("media.filters.title") }}</h2>
      <button
        type="button"
        class="mrail__close"
        :aria-label="t('media.filters.close')"
        @click="emit('close')"
      >
        <AppIcon name="x" :size="18" />
      </button>
    </div>

    <!-- Depolama kullanımı -->
    <section class="mrail__storage" :aria-label="t('media.storage.title')">
      <p class="mrail__storage-top">
        <span :id="storageLabelId">{{ t("media.storage.title") }}</span>
        <span class="mrail__storage-pct">%{{ storagePercent }}</span>
      </p>
      <!-- `progressbar` KENDİ adını taşımak zorunda: saran `<section>`'ın
           `aria-label`'ı da `aria-valuenow` da ad yerine geçmiyor (axe
           `aria-progressbar-name`, WCAG 4.1.2). Adı yukarıdaki mevcut
           başlıktan alıyoruz — yeni çeviri anahtarı gerekmiyor. -->
      <div
        class="mrail__storage-bar"
        role="progressbar"
        :aria-labelledby="storageLabelId"
        :aria-valuenow="storagePercent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span
          class="mrail__storage-fill"
          :class="storageTone"
          :style="{ width: `${storagePercent}%` }"
        />
      </div>
      <p class="mrail__storage-sub">
        {{ t("media.storage.used", { used: usedLabel, quota: quotaLabel }) }}
      </p>
    </section>

    <!-- Öksüz dosyalar (T-043) — depolamanın hemen altında, çünkü ikisi aynı
         soruyu tamamlıyor: "yerim neye gidiyor?" Bu bir GÖRÜNÜRLÜK raporu,
         silme listesi değil; satırlar yalnız bilgi, işlem düğmesi yok. -->
    <section class="mrail__orphans" :aria-label="t('media.orphans.title', {}, 'Öksüz dosyalar')">
      <h3 class="mrail__group-head">
        <button
          type="button"
          class="mrail__toggle"
          :aria-expanded="isOpen('orphans')"
          aria-controls="mrail-orphans"
          @click="toggle('orphans')"
        >
          <AppIcon
            name="chevron-down"
            :size="14"
            class="mrail__chevron"
            :class="{ 'mrail__chevron--open': isOpen('orphans') }"
          />
          <span class="mrail__group-label">{{ t("media.orphans.title", {}, "Öksüz dosyalar") }}</span>
          <!-- Cevap gelmeden sayı YOK: "0" göstermek "öksüz yok" iddiasıdır. -->
          <span class="mrail__count">{{ orphanCountLabel }}</span>
        </button>
      </h3>

      <div v-show="isOpen('orphans')" id="mrail-orphans" class="mrail__orphan-body">
        <label class="mrail__orphan-days">
          <span>{{ t("media.orphans.threshold", {}, "Yaş eşiği") }}</span>
          <select :value="orphanDays" @change="onOrphanDays($event.target.value)">
            <option v-for="d in ORPHAN_DAY_OPTIONS" :key="d" :value="d">
              {{ t("media.orphans.days", { n: d }, "{n} gün") }}
            </option>
          </select>
        </label>

        <p v-if="orphansLoading && !orphanItems.length" class="mrail__orphan-state">
          {{ t("media.orphans.loading", {}, "Taranıyor…") }}
        </p>
        <p v-else-if="orphansDenied" class="mrail__orphan-state">
          {{ t("media.orphans.denied", {}, "Bu raporu görme yetkiniz yok.") }}
        </p>
        <template v-else-if="orphansError">
          <p class="mrail__orphan-state">
            {{ t("media.orphans.failed", {}, "Öksüz taraması alınamadı.") }}
          </p>
          <button type="button" class="mrail__orphan-more" @click="loadOrphans()">
            {{ t("media.orphans.retry", {}, "Yeniden dene") }}
          </button>
        </template>
        <p v-else-if="orphanTotal === null" class="mrail__orphan-state">
          {{ t("media.orphans.notScanned", {}, "Henüz taranmadı.") }}
        </p>
        <p v-else-if="orphansEmpty" class="mrail__orphan-state">
          {{
            t(
              "media.orphans.empty",
              { days: orphanDays },
              "Taranan kaynaklara göre {days} gündür kullanılmayan dosya yok."
            )
          }}
        </p>
        <template v-else>
          <ul class="mrail__orphan-list">
            <li v-for="o in orphanItems" :key="o.fileUrl" class="mrail__orphan-row">
              <span class="mrail__orphan-name" :title="o.fileName">{{ o.fileName }}</span>
              <span class="mrail__orphan-meta">
                {{ formatBytes(o.bytes) }} ·
                {{ t("media.orphans.uploadedAt", { date: formatDay(o.uploadedAt) }, "{date} yüklendi") }}
              </span>
            </li>
          </ul>
          <button
            v-if="orphanHasMore"
            type="button"
            class="mrail__orphan-more"
            :disabled="orphansLoading"
            @click="loadMoreOrphans()"
          >
            {{
              t(
                "media.orphans.more",
                { shown: orphanItems.length, total: orphanTotal },
                "Daha fazla göster ({shown}/{total})"
              )
            }}
          </button>
        </template>

        <!-- Tarama sınırı notu ZORUNLU (useMediaUsage scanNote deseni):
             kullanım taraması hangi alanı görmüyorsa öksüz kararı da onu
             görmüyor — bilinmeyeni "öksüz" saymak silmeye giden yolda en
             pahalı hata (rapor 57). -->
        <p class="mrail__orphan-note">{{ orphanScanNote }}</p>
      </div>
    </section>

    <!-- Hızlı görünümler: tek tıkla açılıp kapanan kısayollar.
         Satırlarda ikon yerine solda kutu var: 9 grup × ikon filtre listesini
         okunması zor bir simge duvarına çeviriyordu, kutu ise doğrudan
         "seçili mi" sorusunu cevaplıyor. -->
    <nav class="mrail__quick" :aria-label="t('media.filters.quick')">
      <button
        v-for="q in quickViews"
        :key="q.id"
        type="button"
        class="mrail__item"
        :class="{ 'mrail__item--on': q.active }"
        :aria-pressed="q.active"
        @click="q.toggle()"
      >
        <span class="mrail__box" aria-hidden="true">
          <AppIcon name="check" :size="12" :stroke-width="3.5" />
        </span>
        <span class="mrail__label">{{ q.label }}</span>
        <span class="mrail__count">{{ q.count }}</span>
      </button>
    </nav>

    <!-- Katlanabilir filtre grupları — 9 grup açık durursa ray metrelerce uzuyor -->
    <section v-for="group in groups" :key="group.id" class="mrail__group">
      <h3 class="mrail__group-head">
        <button
          type="button"
          class="mrail__toggle"
          :aria-expanded="isOpen(group.id)"
          :aria-controls="`mrail-${group.id}`"
          @click="toggle(group.id)"
        >
          <AppIcon
            name="chevron-down"
            :size="14"
            class="mrail__chevron"
            :class="{ 'mrail__chevron--open': isOpen(group.id) }"
          />
          <span class="mrail__group-label">{{ group.label }}</span>
          <!-- Kapalıyken seçili değer başlıkta görünür -->
          <span v-if="!isOpen(group.id) && activeLabel(group)" class="mrail__group-active">
            {{ activeLabel(group) }}
          </span>
        </button>
      </h3>

      <div v-show="isOpen(group.id)" :id="`mrail-${group.id}`" class="mrail__options">
        <button
          v-for="opt in group.options"
          :key="opt.id"
          type="button"
          class="mrail__item"
          :class="{ 'mrail__item--on': group.value === opt.id }"
          :aria-pressed="group.value === opt.id"
          @click="group.set(opt.id)"
        >
          <span class="mrail__box" aria-hidden="true">
            <AppIcon name="check" :size="12" :stroke-width="3.5" />
          </span>
          <span class="mrail__label">{{ opt.label }}</span>
          <span v-if="opt.count !== undefined" class="mrail__count">{{ opt.count }}</span>
        </button>

        <!-- Serbest aralık — kovaların altında. Tarih/boyut gibi alanlarda
             "son 30 gün" yetmediğinde tam aralık burada girilir; tablo sütun
             hunisiyle AYNI state'e yazar. -->
        <div v-if="group.range" class="mrail__range">
          <label class="mrail__range-field">
            <span>{{ group.range.fromLabel }}</span>
            <input
              :type="group.range.type"
              :value="group.range.from"
              @change="group.range.set('from', $event.target.value)"
            />
          </label>
          <label class="mrail__range-field">
            <span>{{ group.range.toLabel }}</span>
            <input
              :type="group.range.type"
              :value="group.range.to"
              @change="group.range.set('to', $event.target.value)"
            />
          </label>
        </div>
      </div>
    </section>

    <!-- Etiketler -->
    <section v-if="tags.length" class="mrail__group">
      <h3 class="mrail__group-head">
        <button
          type="button"
          class="mrail__toggle"
          :aria-expanded="isOpen('tags')"
          aria-controls="mrail-tags"
          @click="toggle('tags')"
        >
          <AppIcon
            name="chevron-down"
            :size="14"
            class="mrail__chevron"
            :class="{ 'mrail__chevron--open': isOpen('tags') }"
          />
          <span class="mrail__group-label">{{ t("media.filters.tags") }}</span>
          <span v-if="!isOpen('tags') && activeTags.length" class="mrail__group-active">
            {{ activeTags.length }}
          </span>
        </button>
      </h3>
      <div v-show="isOpen('tags')" id="mrail-tags" class="mrail__tags">
        <button
          v-for="{ tag, count } in tags"
          :key="tag"
          type="button"
          class="mrail__tag"
          :class="{ 'mrail__tag--on': activeTags.includes(tag) }"
          :aria-pressed="activeTags.includes(tag)"
          @click="emit('toggle-tag', tag)"
        >
          {{ tag }}
          <span class="mrail__count">{{ count }}</span>
        </button>
      </div>
    </section>

    <!-- Arşiv anahtarı da diğer filtre satırlarıyla aynı kalıpta: ham
         `<input type="checkbox">` tek başına farklı bir dil konuşuyordu. -->
    <button
      v-if="showArchived"
      type="button"
      class="mrail__item"
      :class="{ 'mrail__item--on': archived }"
      :aria-pressed="archived"
      @click="emit('update:archived', !archived)"
    >
      <span class="mrail__box" aria-hidden="true">
        <AppIcon name="check" :size="12" :stroke-width="3.5" />
      </span>
      <span class="mrail__label">{{ t("media.filters.archived") }}</span>
      <span class="mrail__count">{{ archivedCount }}</span>
    </button>

    <div class="mrail__foot">
      <button type="button" class="mrail__ghost" @click="setAll(false)">
        {{ t("media.filters.collapseAll") }}
      </button>
      <button v-if="hasActiveFilter" type="button" class="mrail__reset" @click="emit('reset')">
        <AppIcon name="rotate-ccw" :size="14" />
        {{ t("media.filters.reset") }}
      </button>
    </div>
  </div>
</template>

<script setup>
  import { computed, onMounted, ref, useId, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { useMediaOrphans } from "@/composables/useMediaOrphans";
  import { formatDay } from "@/utils/dateFormat";
  import { formatBytes } from "@/utils/mediaFormat";

  /**
   * Filtre rayı — akordiyon.
   *
   * 9 filtre grubu aynı anda açık durunca ray ekranın kat kat altına iniyordu.
   * Gruplar katlanır; açık/kapalı durum `localStorage`'da saklanır ve kapalı
   * grubun seçili değeri başlıkta görünür, böylece katlamak bilgi kaybettirmez.
   */
  const props = defineProps({
    groups: { type: Array, required: true },
    tags: { type: Array, default: () => [] },
    activeTags: { type: Array, default: () => [] },
    quickViews: { type: Array, default: () => [] },
    archived: { type: Boolean, default: false },
    archivedCount: { type: Number, default: 0 },
    // Arşiv anahtarı her rayda anlamlı değil: admin medya ekranında karşılığı
    // "Durum" grubundaki seçenekler. Kapatılabilsin diye opsiyonel.
    showArchived: { type: Boolean, default: true },
    hasActiveFilter: { type: Boolean, default: false },
    usedBytes: { type: Number, default: 0 },
    // Kota tanımsızsa (plan'da sınır yok / entitlement henüz yüklenmedi) backend
    // `null` döner (bkz. stores/media.js `quotaBytes: o.quota_bytes ?? null`).
    // `required: true` + `Number` bekleyip null alınca `usedBytes / null` NaN/Infinity
    // üretiyordu — çubuk "%NaN" gösteriyordu.
    quotaBytes: { type: Number, default: null },
  });
  const emit = defineEmits(["toggle-tag", "update:archived", "reset", "close"]);

  const { t } = useI18n();

  // Ray masaüstü sütunu ve mobil çekmece olarak aynı anda render edilebiliyor;
  // sabit bir id iki kez basılırsa `aria-labelledby` ilk eşleşmeye takılır.
  // `useId()` her örneğe kendi önekini verir.
  const storageLabelId = `mrail-storage-${useId()}`;

  const STORAGE_KEY = "media-rail-open";
  const DEFAULT_OPEN = ["kind"];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_OPEN;
    } catch {
      return DEFAULT_OPEN;
    }
  }

  const openIds = ref(load());

  watch(openIds, (v) => localStorage.setItem(STORAGE_KEY, JSON.stringify(v)), { deep: true });

  function isOpen(id) {
    return openIds.value.includes(id);
  }

  function toggle(id) {
    openIds.value = isOpen(id) ? openIds.value.filter((x) => x !== id) : [...openIds.value, id];
  }

  function setAll(open) {
    openIds.value = open ? [...props.groups.map((g) => g.id), "tags"] : [];
  }

  /** Kapalı başlıkta gösterilecek seçili değer ("Tümü" ise gösterme). */
  function activeLabel(group) {
    const range = group.range;
    if (range && (range.from || range.to)) {
      return `${range.from || "…"} → ${range.to || "…"}`;
    }
    if (group.value === "all") return "";
    return group.options.find((o) => o.id === group.value)?.label || "";
  }

  // Kota tanımsız/sınırsız (null veya 0) → yüzde anlamsız, NaN/Infinity yerine 0.
  // Çubuk boş görünür; alt metin zaten "—" (bkz. quotaLabel/formatBytes) gösterir.
  const storagePercent = computed(() => {
    if (!props.quotaBytes) return 0;
    return Math.min(100, Math.round((props.usedBytes / props.quotaBytes) * 100));
  });
  const storageTone = computed(() => {
    if (storagePercent.value >= 90) return "mrail__storage-fill--danger";
    if (storagePercent.value >= 70) return "mrail__storage-fill--warn";
    return "";
  });
  const usedLabel = computed(() => formatBytes(props.usedBytes));
  const quotaLabel = computed(() => formatBytes(props.quotaBytes));

  // ── Öksüz dosyalar (T-043) ─────────────────────────────────────────
  //
  // Bölüm kendi verisini kendisi çeker: ray, ana ekrandan (MediaLibraryView)
  // hiçbir yeni prop/emit almadan bu raporu taşıyabilmeli — rapor listenin
  // filtre durumundan bağımsız, her zaman "tüm kütüphane" üzerinden.
  // Sayaç için açılışta bir kez sorulur (ölçüm: uç 9 ms, alan başına tek
  // sorgu); liste ancak bölüm açılıp okununca anlam taşır.
  const ORPHAN_DAY_OPTIONS = [7, 30, 90, 180];
  const {
    items: orphanItems,
    total: orphanTotal,
    loading: orphansLoading,
    denied: orphansDenied,
    error: orphansError,
    daysUnused: orphanDays,
    scan: orphanScan,
    hasMore: orphanHasMore,
    isEmpty: orphansEmpty,
    load: loadOrphans,
    loadMore: loadMoreOrphans,
  } = useMediaOrphans();

  onMounted(() => {
    // Hata sayaçta "—" olarak görünür; açılışı bloklamaz.
    loadOrphans();
  });

  function onOrphanDays(value) {
    loadOrphans(Number(value) || 30);
  }

  // Cevap gelmeden sayı yok: `null` "sorulmadı" demek, 0 ise bir CEVAP.
  const orphanCountLabel = computed(() => {
    if (orphanTotal.value === null) return orphansLoading.value ? "…" : "—";
    return String(orphanTotal.value);
  });

  // Tarama sınırı notu — sabit metin + arka tarafın "şu alanları okuyamadım"
  // beyanı. Arka taraf bir alanı tarayamadıysa o alandaki kullanım görünmez
  // ve dosya yanlışlıkla öksüz çıkabilir; not bu yüzden dinamik.
  const orphanScanNote = computed(() => {
    const base = t(
      "media.orphans.scanNote",
      {},
      "Öksüz kararı kalıcı bir kullanım dizininden değil, istek anında taranan sabit bir kaynak listesinden geliyor. Kullanım taramasının görmediği bir alanda geçen dosya burada yanlışlıkla öksüz görünebilir; geçmiş izleri (sürüm, silinmiş kayıt) karara dahil değildir. Bu bir silme listesi değildir — silme, çöp akışındaki korumalardan geçer."
    );
    const failed = orphanScan.value?.failed_sources || [];
    if (!failed.length) return base;
    return `${base} ${t(
      "media.orphans.scanFailed",
      { fields: failed.join(", ") },
      "Bu taramada okunamayan alanlar: {fields}."
    )}`;
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .mrail__inner {
    display: grid;
    gap: media.$s-2;
    padding: media.$s-3;
    @include media.surface;
  }

  // ── Depolama ─────────────────────────────────────────────────────
  .mrail__storage {
    display: grid;
    gap: media.$s-2;
    padding-bottom: media.$s-3;
    @include media.divider;
  }

  .mrail__storage-top {
    display: flex;
    justify-content: space-between;
    margin: 0;
    @include media.text("sm");
    @include media.field-label;
  }

  .mrail__storage-pct {
    @include media.numeric;
  }

  .mrail__storage-bar {
    height: 0.375rem;
    border-radius: media.$r-pill;
    overflow: hidden;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .mrail__storage-fill {
    display: block;
    height: 100%;
    background: $brand;
    transition: width $t-base;

    &--warn {
      background: $c-warning;
    }

    &--danger {
      background: $c-error;
    }
  }

  .mrail__storage-sub {
    margin: 0;
    @include media.text("xs");
    @include media.muted(2);
    @include media.numeric;
  }

  // ── Öksüz dosyalar ───────────────────────────────────────────────
  .mrail__orphans {
    display: grid;
    gap: media.$s-05;
    padding-bottom: media.$s-2;
    @include media.divider;
  }

  .mrail__orphan-body {
    display: grid;
    gap: media.$s-2;
    padding: 0 media.$s-2 media.$s-1;
  }

  .mrail__orphan-days {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: media.$s-2;

    span {
      @include media.text("xs");
      @include media.muted;
    }

    select {
      min-width: 0;
      @include media.field-input;
    }
  }

  .mrail__orphan-state {
    margin: 0;
    @include media.text("xs");
    @include media.muted(2);
  }

  .mrail__orphan-list {
    display: grid;
    gap: media.$s-1;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .mrail__orphan-row {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .mrail__orphan-name {
    @include media.text("sm");
    @include media.truncate;
  }

  .mrail__orphan-meta {
    @include media.text("xs");
    @include media.muted(2);
    @include media.numeric;
  }

  .mrail__orphan-more {
    justify-content: center;
    @include media.button("ghost");
    @include media.focus-ring;
  }

  .mrail__orphan-note {
    margin: 0;
    @include media.text("xs");
    @include media.muted(2);
  }

  // ── Gruplar ──────────────────────────────────────────────────────
  .mrail__quick {
    display: grid;
    gap: media.$s-05;
    padding-bottom: media.$s-2;
    @include media.divider;
  }

  .mrail__group {
    display: grid;
    gap: media.$s-05;
  }

  .mrail__group-head {
    margin: 0;
  }

  .mrail__toggle {
    width: 100%;
    padding: 0 media.$s-2;
    text-align: start;
    @include media.button("ghost");
    @include media.focus-ring;

    min-height: 2.25rem;

    // Tam genişlik satırda ölçek büyük duruyor — tepki arka planla verilir.
    &:active {
      transform: none;
      background: $l-bg-muted;

      @include dark {
        background: $d-item-hover;
      }
    }
  }

  .mrail__chevron {
    flex-shrink: 0;
    transition: transform $t-fast;

    &--open {
      transform: rotate(180deg);
    }
  }

  .mrail__group-label {
    flex: 1;
    @include media.text;
    font-weight: 620;
  }

  .mrail__group-active {
    max-width: 7rem;
    @include media.chip("brand");
    @include media.truncate;

    @include media.text("xs");
  }

  .mrail__options {
    display: grid;
    gap: media.$s-05;
    padding-bottom: media.$s-2;
  }

  .mrail__item {
    width: 100%;
    justify-content: flex-start;
    padding: 0 media.$s-2;
    text-align: start;
    color: $l-text-700;
    @include media.button("ghost");
    @include media.focus-ring;

    min-height: 2.5rem;

    @include dark {
      color: $d-text;
    }

    // Hover dokunmatikte yapışıp seçenek "seçili" gibi görünüyordu; tap tepkisi
    // ölçek yerine arka planla veriliyor (liste içinde scale komşuları oynatır).
    @include media.hoverable {
      &:hover {
        background: $l-bg-muted;

        @include dark {
          background: $d-item-hover;
        }
      }
    }

    &:active {
      background: $l-bg-muted;
      transform: none;

      @include dark {
        background: $d-item-hover;
      }
    }

    // Seçili satır dolu marka zemini yerine marka tonu: kutu artık seçimi
    // anlatıyor, dolu zemin onu boğuyordu. Ton, listedeki seçili satırla
    // (`.mrow--selected`) aynı.
    &--on {
      background: rgba($brand, 0.14);
      color: $l-text-900;
      font-weight: 600;

      @include dark {
        background: rgba($brand, 0.14);
        color: $d-text-hi;
      }

      &:active {
        background: rgba($brand, 0.22);

        @include dark {
          background: rgba($brand, 0.22);
        }
      }

      @include media.hoverable {
        &:hover {
          background: rgba($brand, 0.2);

          @include dark {
            background: rgba($brand, 0.2);
          }
        }
      }

      .mrail__box {
        border-color: $brand;
        background: $brand;
        color: $brand-ink;
      }
    }
  }

  // Solda 18px kutu — 44px'lik satır zaten dokunma hedefi, kutu yalnız görsel
  // gösterge (`aria-pressed` butonun kendisinde).
  .mrail__box {
    display: grid;
    place-items: center;
    width: 1.125rem;
    height: 1.125rem;
    flex-shrink: 0;
    border: 1.5px solid $l-border;
    border-radius: media.$r-sm;
    color: transparent;
    transition:
      background $t-fast,
      border-color $t-fast,
      color $t-fast;

    @include dark {
      border-color: $d-border;
    }
  }

  .mrail__label {
    flex: 1;
    @include media.truncate;
  }

  .mrail__count {
    opacity: 0.7;
    @include media.numeric;
  }

  .mrail__range {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: media.$s-2;
    margin-top: media.$s-2;
    padding-top: media.$s-2;
    @include media.divider("top");
  }

  .mrail__range-field {
    display: grid;
    gap: 2px;
    min-width: 0;

    span {
      @include media.text("xs");
      @include media.muted;
    }

    input {
      width: 100%;
      min-width: 0;
      @include media.field-input;
    }
  }

  .mrail__tags {
    display: flex;
    flex-wrap: wrap;
    gap: media.$s-1;
    padding-bottom: media.$s-2;
  }

  .mrail__tag {
    border: 1px solid transparent;
    cursor: pointer;
    @include media.chip;
    @include media.focus-ring;
    @include media.press(0.94);

    @include media.hoverable {
      &:hover {
        border-color: $l-border;

        @include dark {
          border-color: $d-border;
        }
      }
    }

    &--on {
      @include media.chip("brand");
    }
  }

  .mrail__foot {
    display: grid;
    gap: media.$s-2;
    padding-top: media.$s-2;
    @include media.divider(top);
  }

  .mrail__ghost {
    justify-content: center;
    @include media.button("ghost");
    @include media.focus-ring;
  }

  .mrail__reset {
    justify-content: center;
    @include media.button;
    @include media.focus-ring;
  }

  .mrail__close {
    @include media.icon-button;
  }

  // Ray HER genişlikte çekmece (huni düğmesiyle açılır, SellerListingsView
  // kalıbı) — başlık ve kapat butonu bu yüzden koşulsuz görünür.
  .mrail__inner {
    min-height: 100%;
    border: 0;
    border-radius: 0;
    // Çekmece ekranın altına dayanıyor: son grup tab bar'ın altında kalmasın.
    padding-bottom: calc(#{media.$s-4} + env(safe-area-inset-bottom));
  }

  .mrail__mobile-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .mrail__heading {
    margin: 0;
    font-size: 1.125rem;
    @include media.heading;
  }
</style>
