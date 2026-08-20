<template>
  <MediaModal
    v-model:open="isOpen"
    :title="t('cropStudio.title')"
    :close-label="t('cropStudio.close')"
    width="64rem"
    @close="emit('close')"
  >
    <template #head>
      <!-- Kabuk slot seçimini taşır: aynı dosya farklı slotlarda farklı
           orana kırpılır ve slot değişince geçmiş sıfırlanır. -->
      <label class="cstudio__slot">
        <span class="cstudio__slot-label">{{ t("cropStudio.slot") }}</span>
        <select v-model="activeSlot" class="cstudio__slot-select">
          <option v-for="s in SLOTS" :key="s.slotKey" :value="s.slotKey">{{ s.title }}</option>
        </select>
      </label>
    </template>

    <div v-if="!studio.usable" class="cstudio__empty">
      {{ t("cropStudio.canvas.noSource") }}
    </div>

    <div v-else class="cstudio">
      <CropToolbar
        :options="studio.options"
        :locked-ratio="studio.lockedAR.value"
        :zoom="studio.zoom.value"
        :can-undo="studio.canUndo.value"
        :can-redo="studio.canRedo.value"
        :suggestion="studio.suggestion.value"
        :approved-by-user="studio.approvedByUser.value"
        :suggesting="suggesting"
        :threshold="studio.CONFIDENCE_THRESHOLD"
        @ratio="studio.setRatio"
        @zoom="studio.setZoom"
        @commit="studio.endGesture"
        @undo="studio.undo"
        @redo="studio.redo"
        @reset="studio.reset"
        @suggest="runSuggest"
      />

      <!-- T-105 — AÇIK ayarlama kipi seçici. "Otomatik" odak önerisini
           uygular (smartcrop), "Manuel" kullanıcıyı serbest bırakır. Mantık
           zaten vardı (`focusSuggest` + `CropHandles`), eksik olan görünür
           toggle idi. -->
      <CropModeToggle :mode="studio.mode.value" :busy="suggesting" @change="onModeChange" />

      <CropCanvas
        :src="source.url"
        :source-w="studio.sourceW"
        :source-h="studio.sourceH"
        :base="studio.base.value"
        :win="studio.win.value"
        @scale="onScale"
        @bitmap="onBitmap"
      >
        <CropHandles
          v-if="studio.win.value && studio.base.value"
          :win="studio.win.value"
          :base="studio.base.value"
          :source-w="studio.sourceW"
          :source-h="studio.sourceH"
          :focal-x="studio.focalX.value"
          :focal-y="studio.focalY.value"
          :scale="scale"
          @drag="onDrag"
          @drag-end="onDragEnd"
          @nudge="studio.nudge"
        />
      </CropCanvas>

      <!-- T-105 — ÖNCE / SONRA. Kullanıcının çizdiği kadraj ile sunucunun
           üreteceği oran-uyumlu kadrajı KAYDETMEDEN önce yan yana gösterir.
           Serbest kırpmada ikisi ayrışır; kullanıcı oran zorlamasını önceden
           görür (rapor 65 C/E sapması). -->
      <CropBeforeAfter
        :bitmap="bitmap"
        :source-w="studio.sourceW"
        :source-h="studio.sourceH"
        :before-win="studio.win.value"
        :after-win="studio.afterWin.value"
        :before-px="studio.pixelBox.value"
        :after-px="studio.afterPixelBox.value"
        :ratio-forced="studio.ratioForced.value"
        :target-label="afterTargetLabel"
      />

      <CropPreviewStrip
        ref="stripEl"
        :profiles="profiles"
        :bitmap="bitmap"
        :win="studio.win.value"
        :source-w="studio.sourceW"
        :source-h="studio.sourceH"
        :renditions="renditions"
        :band="band"
      />

      <CropPolicyNotice :warnings="studio.warnings.value" :pixel-box="studio.pixelBox.value" />

      <!-- T-114 — önizleme kapısı. Kırpma niyetinin sahibi bu ekran olduğu
           için kapı BURADA duruyor: onaylanan yerleşimler ayrı bir çağrıyla
           değil, Uygula'nın gönderdiği aynı `save_intent` gövdesinde gider
           (`useCropStudio.save(ek)`). Ayrı çağrı, gönderilmeyen alanları
           `None` yazacağı için odak noktasını silerdi. -->
      <SimApprovalGate
        :asset="asset"
        :source-width="studio.sourceW || 0"
        @approve="onGateApprove"
        @goto="onGateGoto"
      />

      <!-- Kaydetme ucu artık VAR (`tradehub_core.api.media_crop.save_intent`).
           Ayrıntı katlanır kalır: gönderilen yükün ne olduğu görünür olsun. -->
      <p v-if="studio.saveError.value" class="cstudio__saveerr" role="alert">
        {{ t("cropStudio.save.failed", { reason: studio.saveError.value }) }}
      </p>
      <p v-else-if="studio.savedAt.value" class="cstudio__saveok" role="status">
        {{ t("cropStudio.save.done") }}
      </p>

      <!-- Öneri ölçülemedi ya da sunucu yerine tarayıcı yolu kullanıldı.
           Hangisi olduğu saklanmaz — sayının nereden geldiği kullanıcının
           bilmesi gereken şeydir. -->
      <p v-if="suggestNote" class="cstudio__saveerr" role="status">{{ suggestNote }}</p>

      <!-- Kaydet neden kapalı: sebep GÖRÜNÜR olmalı. "Çalışmıyor" ile
           "odak 1,4 gönderiyorsun" arasındaki fark, kullanıcının sorunu
           çözebilmesidir. -->
      <p v-if="studio.payloadIssues.value.length" class="cstudio__saveerr" role="status">
        {{ t("cropStudio.save.contract", { issues: studio.payloadIssues.value.join(" · ") }) }}
      </p>

      <details class="cstudio__nosave">
        <summary>{{ t("cropStudio.save.payloadTitle") }}</summary>
        <dl>
          <dt>{{ t("cropStudio.save.needDoctype") }}</dt>
          <dd>{{ studio.endpoint.doctype }}</dd>
          <dt>{{ t("cropStudio.save.needMethod") }}</dt>
          <dd>
            <code>{{ studio.endpoint.method }}</code>
          </dd>
          <dt>{{ t("cropStudio.save.needFields") }}</dt>
          <dd>
            <ul role="list">
              <li v-for="f in studio.endpoint.fields" :key="f">{{ f }}</li>
            </ul>
          </dd>
        </dl>
        <pre class="cstudio__payload">{{ payloadText }}</pre>
      </details>
    </div>

    <template #footer>
      <span class="cstudio__hint">{{ t("cropStudio.hint") }}</span>
      <button type="button" class="cstudio__btn" @click="isOpen = false">
        {{ t("cropStudio.cancel") }}
      </button>
      <button
        type="button"
        class="cstudio__btn cstudio__btn--primary"
        :disabled="!studio.saveAvailable.value || studio.saving.value"
        :title="studio.saveAvailable.value ? '' : t('cropStudio.save.unavailable')"
        @click="onApply"
      >
        {{ studio.saving.value ? t("cropStudio.save.saving") : t("cropStudio.apply") }}
      </button>
    </template>
  </MediaModal>
</template>

<script setup>
  import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import MediaModal from "@/components/media/MediaModal.vue";
  import CropBeforeAfter from "@/components/media/crop/CropBeforeAfter.vue";
  import CropCanvas from "@/components/media/crop/CropCanvas.vue";
  import CropHandles from "@/components/media/crop/CropHandles.vue";
  import CropModeToggle from "@/components/media/crop/CropModeToggle.vue";
  import CropPolicyNotice from "@/components/media/crop/CropPolicyNotice.vue";
  import CropPreviewStrip from "@/components/media/crop/CropPreviewStrip.vue";
  import CropToolbar from "@/components/media/crop/CropToolbar.vue";
  import SimApprovalGate from "@/components/media/simulator/SimApprovalGate.vue";
  import { useCropStudio } from "@/composables/useCropStudio";
  import { ZOOM_STEP, cropShortcut } from "@/lib/media/crop/cropShortcuts";
  import { safeBandFor } from "@/lib/media/crop/cropWarnings";
  import { fromServerSuggestion, suggestFocal, toGray } from "@/lib/media/crop/focusSuggest";
  import { SLOTS, slotProfiles } from "@/lib/media/crop/slotProfiles";

  /**
   * Crop Studio kabuğu — slot bağlamı, kısayollar, kaydetme durumu.
   *
   * Kaydetme `tradehub_core.api.media_crop.save_intent` ucuna gider. Uygula
   * düğmesi yalnız `asset` verilmişse ve politika engeli yoksa etkindir;
   * gönderilen yük katlanır ayrıntıda görünür kalır.
   */
  const props = defineProps({
    open: { type: Boolean, default: false },
    /** `{ url, width, height }` — KAYNAK pikseli. */
    source: { type: Object, required: true },
    slotKey: { type: String, required: true },
    /** `Media Asset` adı — kaydetmenin hedefi. Boşsa Uygula devre dışıdır. */
    asset: { type: String, default: "" },
    /** Sunucu sondası `{ mode, hasAlpha }`; yoksa ilgili uyarılar üretilmez. */
    probe: { type: Object, default: null },
    slotMismatch: { type: Boolean, default: false },
    /**
     * Bu varlığın `Media Rendition` satırları. Bugün **boş** — hat bayrakları
     * kapalı. Boş gelmesi hata değil, önizleme kartlarının ilan ettiği durum.
     */
    renditions: { type: Array, default: () => [] },
  });

  const emit = defineEmits(["close", "apply"]);

  /** Yerel iletiler — bkz. `CropPreviewStrip.vue` içindeki gerekçe. */
  const { t } = useI18n({
    messages: {
      tr: {
        cropStudio: {
          save: { contract: "Sözleşme uyarısı: {issues}" },
          suggest: {
            unmeasured: "Öneri ölçülemedi ({reason}) — merkez gösteriliyor, bu bir öneri değil.",
            fellBack: "Sunucu önerisi alınamadı, tarayıcıda hesaplandı: {reason}",
          },
        },
      },
      en: {
        cropStudio: {
          save: { contract: "Contract issue: {issues}" },
          suggest: {
            unmeasured:
              "Suggestion could not be measured ({reason}) — showing the centre; this is not a suggestion.",
            fellBack: "Server suggestion unavailable, computed in the browser: {reason}",
          },
        },
      },
      ru: {
        cropStudio: {
          save: { contract: "Нарушение контракта: {issues}" },
          suggest: {
            unmeasured:
              "Подсказку измерить не удалось ({reason}) — показан центр, это не подсказка.",
            fellBack: "Серверная подсказка недоступна, рассчитано в браузере: {reason}",
          },
        },
      },
      ar: {
        cropStudio: {
          save: { contract: "تنبيه العقد: {issues}" },
          suggest: {
            unmeasured: "تعذّر قياس الاقتراح ({reason}) — يُعرض المركز، وهذا ليس اقتراحًا.",
            fellBack: "اقتراح الخادم غير متاح، حُسب في المتصفح: {reason}",
          },
        },
      },
    },
  });

  const isOpen = computed({
    get: () => props.open,
    set: (v) => {
      if (!v) emit("close");
    },
  });

  /**
   * Slot, kabuğun durumudur. Değiştiğinde stüdyo baştan kurulur: oran
   * seçenekleri, uyarılar ve geçmiş farklı bir kadraj bağlamına ait.
   */
  const activeSlot = ref(props.slotKey);
  watch(
    () => props.slotKey,
    (v) => {
      activeSlot.value = v;
    }
  );

  const studioRef = shallowRef(build(activeSlot.value));
  /** Şablon için sarmalayıcı: `studioRef` bir shallowRef, şablon onu açar. */
  const studio = computed(() => studioRef.value);

  function build(slotKey) {
    return useCropStudio({
      source: props.source,
      slotKey,
      probe: props.probe,
      slotMismatch: props.slotMismatch,
      asset: props.asset,
    });
  }

  // Slot değişince stüdyo baştan kurulur — geçmiş de sıfırlanmış olur.
  watch(activeSlot, (v) => {
    studioRef.value = build(v);
  });

  const profiles = computed(() => slotProfiles(activeSlot.value));
  const payloadText = computed(() => JSON.stringify(studioRef.value.savePayload.value, null, 2));

  /**
   * "Sonra" için hedef oran etiketi. Sunucunun zorlayacağı oranın kullanıcıya
   * gösterilen adı (ör. "1:1", "16:9") — sayıdan değil, eşleşen oran
   * seçeneğinin etiketinden alınır (`slotProfiles` etiket ↔ oran ayrımı).
   */
  const afterTargetLabel = computed(() => {
    const ar = studioRef.value.effectiveTargetAR.value;
    if (ar === null || ar === undefined) return "";
    const opt = studioRef.value.options.find((o) => o.targetAR === ar);
    return opt ? opt.label : "";
  });

  const scale = ref(1);
  const bitmap = shallowRef(null);
  const suggesting = ref(false);
  /** Öneri neden ölçülemedi / neden yedeğe düşüldü. Boşsa söylenecek bir şey yok. */
  const suggestNote = ref("");

  /** Politikanın güvenli alan bandı; tanımsız slotta `null` — bant çizilmez. */
  const band = computed(() => safeBandFor(activeSlot.value));

  const onScale = (v) => {
    scale.value = v;
  };
  const onBitmap = (b) => {
    bitmap.value = b;
  };

  function onDrag(handle, dx, dy) {
    if (handle === "body") studioRef.value.dragBody(dx, dy);
    else if (handle === "focal")
      studioRef.value.dragFocal(
        studioRef.value.focalX.value + dx / studioRef.value.sourceW,
        studioRef.value.focalY.value + dy / studioRef.value.sourceH
      );
    else studioRef.value.dragHandle(handle, dx, dy);
  }

  /** Geçmişe yazma jest başına BİR kez — `pointerup`'ta. */
  const onDragEnd = (handle) => studioRef.value.endGesture(`drag:${handle}`);

  /**
   * Niyeti sunucuya yazar, sonra kabuğa haber verir.
   *
   * Hata durumunda modal KAPANMAZ ve `saveError` ekranda kalır: kullanıcının
   * çizdiği kadraj hâlâ ekranda dururken "kaydedildi" diye kapanmak, kaybı
   * gizlemek olurdu. `save()` hatayı yeniden fırlattığı için burada yutulur
   * ve yalnız akış durdurulur — sebep zaten `saveError`da.
   */
  /**
   * T-114 kapısının onayı. Gövde BURADA tutulur, hemen gönderilmez: kapı
   * yalnız "hangi yerleşimler görüldü" sorusunu yanıtlıyor; kadrajın geri
   * kalanı (odak noktası, güvenli alan) Uygula ile birlikte gider.
   */
  const previewedPlacements = ref(null);
  const stripEl = ref(null);

  function onGateApprove({ previewed_placements: yerlesimler }) {
    previewedPlacements.value = yerlesimler || null;
  }

  /**
   * "Bu yerleşime git" — bu ekranda gidilecek bir simülatör yok; o
   * yerleşimin karşılığı önizleme şeridindeki karttır. Kaydırmak, olmayan
   * bir gezinmeyi taklit etmekten dürüsttür.
   */
  function onGateGoto() {
    stripEl.value?.$el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  async function onApply() {
    try {
      const sonuc = await studioRef.value.save(
        previewedPlacements.value ? { previewed_placements: previewedPlacements.value } : null
      );
      if (sonuc) emit("apply", sonuc);
    } catch {
      // Sebep `studio.saveError` içinde, şablonda gösteriliyor.
    }
  }

  /**
   * Otomatik odak önerisi — model YOK, ucuz taban öneri (kenar enerjisi).
   * Yüz/nesne tespiti DEĞİLDİR ve arayüzde öyle sunulmaz.
   *
   * **Sunucu önce.** `tradehub_core.api.media_crop.suggest_focal` aynı işi
   * EXIF rotasyonu uygulanmış 32×32 LANCZOS ızgarada yapıyor ve boru hattının
   * kullanacağı sayının ta kendisini veriyor; tarayıcıda hesaplanan sayı ona
   * eşit değildir. Uç erişilemezse (varlık kimliği yok, yetki yok, ağ)
   * tarayıcı yolu YEDEK olarak çalışır ve hangisinin kullanıldığı
   * `suggestion.source` alanında saklanır — ekranda da söylenir.
   *
   * Uç **yazmaz**: öneri kullanıcı onayına sunulur (`applied: false`).
   */
  /**
   * Kip seçici değişti. "Otomatik" seçilince öneri uygulanır (öneri
   * `applySuggestion` içinde kipi zaten "auto"ya çeker); "Manuel" seçilince
   * kullanıcı serbest bırakılır. Öneri hesabı kabuğun işidir çünkü sunucu ucu
   * ve bitmap burada.
   */
  async function onModeChange(next) {
    if (next === "auto") {
      studioRef.value.setMode("auto");
      await runSuggest();
    } else {
      studioRef.value.setMode("manual");
    }
  }

  async function runSuggest() {
    if (suggesting.value) return;
    suggesting.value = true;
    suggestNote.value = "";
    try {
      if (props.asset) {
        try {
          const { suggestCropFocal } = await import("@/lib/media/crop/cropIntentApi.js");
          const oneri = fromServerSuggestion(await suggestCropFocal(props.asset));
          if (oneri) {
            studioRef.value.applySuggestion(oneri);
            if (!oneri.measured) {
              suggestNote.value = t("cropStudio.suggest.unmeasured", { reason: oneri.reason });
            }
            return;
          }
          suggestNote.value = t("cropStudio.suggest.fellBack", { reason: "boş yanıt" });
        } catch (err) {
          // Uç 403/429/500 verdi ya da ağ düştü. Sebep GİZLENMEZ.
          suggestNote.value = t("cropStudio.suggest.fellBack", {
            reason: err?.message || String(err),
          });
        }
      }

      if (!bitmap.value) {
        studioRef.value.applySuggestion(null);
        return;
      }
      const W = 96;
      const H = Math.max(3, Math.round((W * studioRef.value.sourceH) / studioRef.value.sourceW));
      const off = new OffscreenCanvas(W, H);
      const ctx = off.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(bitmap.value, 0, 0, W, H);
      const { gray } = toGray(ctx.getImageData(0, 0, W, H));
      const yerel = suggestFocal(gray, W, H);
      studioRef.value.applySuggestion(yerel);
      if (!yerel.measured) {
        suggestNote.value = t("cropStudio.suggest.unmeasured", { reason: yerel.reason });
      }
    } catch {
      // Öneri üretilemedi: sessizce merkez kalsın, sahte bir güven yazma.
      studioRef.value.applySuggestion(null);
    } finally {
      suggesting.value = false;
    }
  }

  // ── Kısayollar — `useMediaShortcuts` ile çakışmasın diye YAKALAMA evresi ──

  function onKeydown(event) {
    if (!props.open) return;
    const hit = cropShortcut(event);
    if (!hit) return;
    event.preventDefault();
    // `window`'daki medya gezgini dinleyicisine ULAŞMASIN.
    event.stopPropagation();

    if (hit.action === "undo") studioRef.value.undo();
    else if (hit.action === "redo") studioRef.value.redo();
    else if (hit.action === "zoomIn") {
      studioRef.value.setZoom(studioRef.value.zoom.value + ZOOM_STEP);
      studioRef.value.endGesture("zoom");
    } else if (hit.action === "zoomOut") {
      studioRef.value.setZoom(studioRef.value.zoom.value - ZOOM_STEP);
      studioRef.value.endGesture("zoom");
    } else if (hit.action === "toggleLock") studioRef.value.toggleLock();
    else if (hit.action === "apply" && studioRef.value.saveAvailable.value) onApply();
  }

  onMounted(() => document.addEventListener("keydown", onKeydown, true));
  onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown, true));
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .cstudio {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .cstudio__slot {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    color: $l-text-500;
    font-size: 0.8125rem;

    @include dark {
      color: $d-text-muted;
    }
  }

  .cstudio__slot-select {
    padding: 0.15rem 0.35rem;
    border: 1px solid $l-border;
    border-radius: 0.25rem;
    background: $l-bg;
    color: $l-text-700;

    @include dark {
      border-color: $d-border;
      background: $d-bg-card;
      color: $d-text;
    }
  }

  .cstudio__empty {
    padding: 2rem;
    color: $l-text-500;
    text-align: center;
  }

  .cstudio__nosave {
    padding: 0.5rem 0.65rem;
    border: 1px dashed $l-border;
    border-radius: 0.375rem;
    color: $l-text-600;
    font-size: 0.75rem;

    summary {
      cursor: pointer;
      font-weight: 600;
    }

    dt {
      margin-top: 0.4rem;
      font-weight: 600;
    }

    dd {
      margin: 0;
    }

    @include dark {
      border-color: $d-border;
      color: $d-text-muted;
    }
  }

  .cstudio__payload {
    max-height: 12rem;
    margin: 0.5rem 0 0;
    padding: 0.5rem;
    overflow: auto;
    border-radius: 0.25rem;
    background: $l-bg-muted;
    font-size: 0.6875rem;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .cstudio__hint {
    margin-right: auto;
    color: $l-text-500;
    font-size: 0.75rem;

    @include dark {
      color: $d-text-muted;
    }
  }

  .cstudio__btn {
    padding: 0.35rem 0.8rem;
    border: 1px solid $l-border;
    border-radius: 0.375rem;
    background: $l-bg;
    color: $l-text-700;
    cursor: pointer;

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    @include dark {
      border-color: $d-border;
      background: $d-bg-card;
      color: $d-text;
    }
  }

  .cstudio__btn--primary {
    border-color: $brand;
    background: $brand;
    color: #fff;
  }
</style>
