<script setup>
  import { computed, onBeforeUnmount, onMounted, nextTick, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import {
    ALL_REGIONS,
    DEFAULT_SOURCE_WIDTH,
    DEVICES,
    renditionsFor,
    simulate,
  } from "@/lib/media/simulator";
  import {
    DWELL_MS,
    VISIBILITY_RATIO,
    useSimulatorApproval,
  } from "@/composables/useSimulatorApproval";

  /**
   * T-114 — onay kapısı.
   *
   * Kullanıcı, varlığın **zorunlu yerleşimlerini** (LCP adayı bölgeler ×
   * cihaz sınıfları) görmeden "Onayla ve yayınla" düğmesine ulaşamaz.
   * Görülme, satırın kendi kutusunun ekranda `%50` ve `1 sn` durmasıyla
   * sayılır — eşik `useSimulatorApproval`'da tanımlı, burada tekrar yazılmaz.
   *
   * **Bu bileşen ağ isteği ATMAZ.** Onay verildiğinde `approve` olayıyla
   * `previewed_placements` gövdesini ve denetim kaydını yukarı verir; kaydı
   * `save_intent`'e yazmak, kırpma niyetinin geri kalan alanlarına (odak
   * noktası, güvenli alan) sahip olan ekranın işidir. Yalnız
   * `previewed_placements` göndermek, uç gönderilmeyen alanları `None`
   * yazdığı için kayıtlı odak noktasını SİLERDİ.
   *
   * **Sunucu tarafı kapı VAR** (2026-08-20, T-114): kanıtsız onay uçta 417
   * `MEDIA_PREVIEW_REQUIRED` ile reddediliyor — ölçüm ve sınırları composable
   * başlığında. İstemci kapısı yine de kalkmaz: sunucu yalnız kanıt gövdesini
   * zorlayabilir; kullanıcıya yerleşimleri fiilen GÖSTEREN taraf burasıdır.
   * Ekran bunu gizlemez, altta yazar: bu kapı bugün yalnız istemcide durur.
   */
  const props = defineProps({
    /** Kapının tarayacağı cihazlar. */
    devices: { type: Array, default: () => DEVICES },
    /** Kapının tarayacağı bölgeler — zorunlular `lcp_candidate`'lerdir. */
    regions: { type: Array, default: () => ALL_REGIONS },
    /** Kaynak görselin genişliği (FR-028 upscale yasağı). */
    sourceWidth: { type: Number, default: DEFAULT_SOURCE_WIDTH },
    /** `Media Asset` adı. Boşsa kapı açılsa bile kayıt gönderilemez. */
    asset: { type: String, default: "" },
  });

  const emit = defineEmits(["goto", "approve"]);

  const { t } = useI18n();

  const gate = useSimulatorApproval({
    devices: () => props.devices,
    regions: () => props.regions,
    sourceWidth: () => props.sourceWidth,
  });

  const {
    requirements,
    progress,
    seen,
    observe,
    warningCodes,
    acknowledge,
    blockers,
    canPublish,
    previewedPlacements,
    auditRecord,
  } = gate;

  /** Satırın temsilci cihazı ve o cihazdaki seçim — satır bir ÖNİZLEME kutusudur. */
  const rows = computed(() =>
    requirements.value.map((req) => {
      const device = req.devices[0];
      const ladder = renditionsFor(req.region.slotKey, props.sourceWidth);
      return {
        ...req,
        device,
        selection: device ? simulate(device, req.region, ladder) : null,
        seen: seen[req.id] || null,
      };
    })
  );

  // ── Görünürlük takibi ────────────────────────────────────────────
  // Gözlemciler her render'da değil, gereklilik listesi DEĞİŞİNCE kurulur:
  // her render'da yeniden kurmak, bir satır "görüldü" olduğunda listeyi
  // yeniden çizip diğer satırların 1 sn sayaçlarını sıfırlardı.
  const rowEls = ref([]);
  const stops = new Map();

  function stopAll() {
    for (const stop of stops.values()) stop();
    stops.clear();
  }

  async function setupObservers() {
    stopAll();
    await nextTick();
    rows.value.forEach((row, i) => {
      const el = rowEls.value[i];
      if (!el || !row.device) return;
      stops.set(row.id, observe(el, { region: row.region, device: row.device }));
    });
  }

  onMounted(setupObservers);
  onBeforeUnmount(stopAll);
  watch(() => requirements.value.map((r) => r.id).join("|"), setupObservers);

  /**
   * Çeviri gelene kadarki varsayılan metinler.
   *
   * `i18n/locales/*.js` bu görevde başka bir elin lanesinde; anahtar henüz
   * yokken `t()` anahtar YOLUNU basardı. `vue-i18n`'in üçüncü argümanı
   * (varsayılan mesaj) bunu önler ve anahtar eklendiğinde devre dışı kalır.
   */
  const CLASS_FALLBACK = Object.freeze({
    phone: "Telefon",
    tablet: "Tablet",
    laptop: "Dizüstü",
    desktop: "Masaüstü",
  });

  const BLOCKER_FALLBACK = Object.freeze({
    gereklilik_yok: "Bu kümede zorunlu yerleşim tanımlı değil — kapı vakumda açılmaz.",
    yerlesim_gorulmedi: "{n} yerleşim sınıfı henüz görülmedi.",
    uyari_kabul_edilmedi: "{n} uyarı henüz açıkça kabul edilmedi.",
  });

  const blockerText = computed(() =>
    blockers.value.map((b) =>
      t(`mediaSimulator.gate.blocker.${b.code}`, { n: b.count }, BLOCKER_FALLBACK[b.code] || b.code)
    )
  );

  /** Kapı açık ama varlık verilmemişse kayıt gönderilemez — sebebi yazılır. */
  const assetMissing = computed(() => !props.asset);

  function approve() {
    if (!canPublish.value || assetMissing.value) return;
    emit("approve", {
      asset: props.asset,
      previewed_placements: previewedPlacements.value,
      audit: auditRecord.value,
    });
  }
</script>

<template>
  <section class="simgate" :aria-label="t('mediaSimulator.gate.title', {}, 'Onay kapısı')">
    <h3 class="simgate__title">
      <AppIcon name="shield-check" :size="16" />
      {{ t("mediaSimulator.gate.title", {}, "Onay kapısı") }}
    </h3>
    <p class="simgate__lead">
      {{
        t(
          "mediaSimulator.gate.lead",
          {},
          "Yayımlamadan önce zorunlu yerleşimler (LCP adayı bölgeler) her cihaz sınıfında en az bir kez görülmelidir."
        )
      }}
    </p>
    <p class="simgate__lead">
      {{
        t(
          "mediaSimulator.gate.threshold",
          { pct: VISIBILITY_RATIO * 100, ms: DWELL_MS },
          "Bir yerleşim, kutusunun %{pct} kadarı ekranda ve {ms} ms boyunca kaldığında 'görüldü' sayılır."
        )
      }}
    </p>

    <div
      class="simgate__progress"
      role="progressbar"
      :aria-valuenow="progress.done"
      :aria-valuemin="0"
      :aria-valuemax="progress.total"
      :aria-label="t('mediaSimulator.gate.title', {}, 'Onay kapısı')"
    >
      <div
        class="simgate__bar"
        :style="{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : '0%' }"
      />
    </div>
    <p class="simgate__count" aria-live="polite" role="status">
      {{
        t(
          "mediaSimulator.gate.progress",
          { done: progress.done, total: progress.total },
          "{done}/{total} yerleşim sınıfı görüldü"
        )
      }}
    </p>

    <ul class="simgate__list">
      <li
        v-for="(row, i) in rows"
        :key="row.id"
        :ref="(el) => (rowEls[i] = el)"
        class="simgate__row"
        :class="{ 'is-seen': !!row.seen }"
      >
        <div class="simgate__rowHead">
          <AppIcon :name="row.seen ? 'check' : 'eye'" :size="14" />
          <span class="simgate__rowTitle">{{ row.region.title }}</span>
          <span class="simgate__class">{{
            t(
              `mediaSimulator.gate.class.${row.deviceClass}`,
              {},
              CLASS_FALLBACK[row.deviceClass] || row.deviceClass
            )
          }}</span>
          <span v-if="row.seen" class="simgate__ok">{{
            t("mediaSimulator.gate.seen", {}, "görüldü")
          }}</span>
          <span v-else class="simgate__pending">{{
            t("mediaSimulator.gate.notSeen", {}, "görülmedi")
          }}</span>
        </div>
        <p v-if="row.selection" class="simgate__rowInfo">
          {{ row.device.label }} · {{ Math.round(row.selection.cssBoxPx) }} px ×
          {{ row.selection.dpr }} = {{ row.selection.requiredPx }} px →
          {{
            row.selection.chosen
              ? `${row.selection.chosen.name} (${row.selection.chosen.width} px)`
              : t("mediaSimulator.result.none")
          }}
        </p>
        <ul v-if="row.selection && row.selection.warnings.length" class="simgate__rowWarns">
          <li v-for="code in row.selection.warnings" :key="code">
            <AppIcon name="triangle-alert" :size="12" />
            {{ t(`mediaSimulator.warnShort.${code}`) }}
          </li>
        </ul>
        <button type="button" class="simgate__goto" @click="emit('goto', row)">
          {{ t("mediaSimulator.gate.goto", {}, "Bu yerleşime git") }}
        </button>
      </li>
    </ul>

    <template v-if="warningCodes.length">
      <h4 class="simgate__sub">
        {{ t("mediaSimulator.gate.warningsTitle", {}, "Uyarılı yerleşimler — açık kabul gerekir") }}
      </h4>
      <label v-for="w in warningCodes" :key="w.code" class="simgate__ack">
        <input
          type="checkbox"
          :checked="w.acknowledged"
          @change="acknowledge(w.code, $event.target.checked)"
        />
        <span>
          {{
            t(
              "mediaSimulator.gate.ackLabel",
              { warning: t(`mediaSimulator.warnShort.${w.code}`), n: w.count },
              "{warning}: {n} kombinasyonda çıkıyor. Gördüm ve kabul ediyorum."
            )
          }}
        </span>
      </label>
    </template>

    <!-- Düğme neden kapalı: aynı metin hem görünür hem ekran okuyucuya bağlı. -->
    <p v-if="blockerText.length" id="simgate-blockers" class="simgate__blockers" aria-live="polite">
      {{ blockerText.join(" · ") }}
    </p>
    <p v-if="assetMissing" class="simgate__blockers">
      {{
        t(
          "mediaSimulator.gate.noAsset",
          {},
          "Varlık seçilmedi — kapı açılsa da kayıt gönderilecek bir varlık yok."
        )
      }}
    </p>

    <button
      type="button"
      class="simgate__publish"
      :disabled="!canPublish || assetMissing"
      :aria-describedby="blockerText.length ? 'simgate-blockers' : undefined"
      @click="approve"
    >
      {{ t("mediaSimulator.gate.publish", {}, "Onayla ve yayınla") }}
    </button>

    <p class="simgate__gap">
      <AppIcon name="triangle-alert" :size="14" />
      <span>{{
        t(
          "mediaSimulator.gate.serverGap",
          {},
          "Onay kanıtı artık sunucuda da zorlanıyor: kanıtsız gelen onayı `save_intent` 417 `MEDIA_PREVIEW_REQUIRED` ile reddeder. Sunucunun DOĞRULAYAMADIĞI şu: görünürlük süresi istemci beyanıdır — bu kapı yerleşimleri gerçekten göstererek o beyanı dürüst kılar."
        )
      }}</span>
    </p>

    <details class="simgate__payload">
      <summary>{{ t("mediaSimulator.gate.payloadTitle", {}, "Sunucuya gidecek kayıt") }}</summary>
      <pre class="simgate__code">{{ JSON.stringify(auditRecord, null, 2) }}</pre>
    </details>
  </section>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .simgate {
    @include media.surface("soft");
    padding: media.$s-4;
    border-radius: media.$r-lg;
  }

  .simgate__title {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: 0 0 media.$s-2;
    @include media.text("body");
    font-weight: 700;
    @include media.heading;
  }

  .simgate__sub {
    margin: media.$s-4 0 media.$s-2;
    @include media.text("xs");
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-weight: 700;
    @include media.muted(1);
  }

  .simgate__lead {
    margin: 0 0 media.$s-2;
    @include media.text("sm");
    @include media.muted(1);
  }

  .simgate__progress {
    height: 6px;
    border-radius: media.$r-pill;
    background: $l-bg-muted;
    overflow: hidden;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .simgate__bar {
    height: 100%;
    background: $brand;
  }

  .simgate__count {
    margin: media.$s-1 0 media.$s-3;
    @include media.text("sm");
    font-weight: 600;
    @include media.numeric;
  }

  .simgate__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: media.$s-2;
  }

  .simgate__row {
    padding: media.$s-2 media.$s-3;
    border-radius: media.$r-md;
    background: $l-bg-muted;
    border-inline-start: 3px solid $c-warning;

    @include dark {
      background: $d-bg-elevated;
    }

    &.is-seen {
      border-inline-start-color: $c-success;
    }
  }

  .simgate__rowHead {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: media.$s-2;
    @include media.text("sm");
  }

  .simgate__rowTitle {
    font-weight: 700;
  }

  .simgate__class {
    @include media.chip("neutral");
  }

  .simgate__ok {
    @include media.chip("success");
  }

  .simgate__pending {
    @include media.chip("warning");
  }

  .simgate__rowInfo {
    margin: media.$s-1 0 0;
    @include media.text("xs");
    @include media.muted(1);
    @include media.numeric;
  }

  .simgate__rowWarns {
    list-style: none;
    margin: media.$s-1 0 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: media.$s-2;
    @include media.text("xs");
    color: $c-warning;

    li {
      display: inline-flex;
      align-items: center;
      gap: media.$s-1;
    }
  }

  .simgate__goto {
    margin-top: media.$s-1;
    padding: 0;
    border: 0;
    background: none;
    color: $brand-ink;
    cursor: pointer;
    text-decoration: underline;
    @include media.text("xs");
    @include media.focus-ring;

    @include dark {
      color: $d-text;
    }
  }

  .simgate__ack {
    display: flex;
    align-items: flex-start;
    gap: media.$s-2;
    margin-bottom: media.$s-2;
    @include media.text("sm");
    cursor: pointer;
  }

  .simgate__blockers {
    margin: media.$s-3 0 media.$s-2;
    @include media.text("sm");
    color: $c-warning;
  }

  .simgate__publish {
    @include media.button("primary");
    height: 2.5rem;
  }

  .simgate__gap {
    display: flex;
    align-items: flex-start;
    gap: media.$s-2;
    margin: media.$s-3 0 media.$s-2;
    padding: media.$s-2;
    border-radius: media.$r-md;
    border-inline-start: 3px solid $brand;
    @include media.text("xs");
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .simgate__payload {
    @include media.text("xs");

    summary {
      cursor: pointer;
      font-weight: 700;
      @include media.focus-ring;
    }
  }

  .simgate__code {
    margin: media.$s-2 0 0;
    padding: media.$s-2;
    border-radius: media.$r-md;
    background: $l-bg-muted;
    overflow-x: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;

    @include dark {
      background: $d-bg-elevated;
    }
  }
</style>
