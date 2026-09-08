<script setup>
  import { computed, nextTick, ref, useId, watch } from "vue";
  import { storeToRefs } from "pinia";
  import { useSubscriptionStore } from "@/stores/subscription";
  import { useToast } from "@/composables/useToast";
  import { focusablesIn, restoreFocus, trapTabKey } from "@/components/common/focusTrap";

  /**
   * Abonelik iptal akışı (AD-2 / AC-10) — Amazon Seller modeli.
   *
   * İki adım: (1) ZORUNLU sebep anketi + opsiyonel not (max 500),
   * (2) onay ekranı — dönem sonuna kadar hakların sürdüğü, listing'lerin
   * silinmediği ve tek tıkla geri alınabildiği açıkça yazılır.
   * Karanlık desen YOK: vazgeç her adımda tek tık, ceza/bekletme adımı yok,
   * save-offer/retention ekranı bilinçli kapsam dışı (Faz C).
   */
  defineProps({
    // Görünen dönem sonu tarihi (view'ın fmtDate çıktısı) — onay metni
    // gerçek current_period_end ile kurulur (AC-10).
    periodEndLabel: { type: String, default: "—" },
  });

  const open = defineModel("open", { type: Boolean, default: false });
  const emit = defineEmits(["canceled"]);

  const sub = useSubscriptionStore();
  const { cancelActing } = storeToRefs(sub);
  const toast = useToast();

  // Sebep kodları — BE-2 sözleşmesindeki allowlist ile birebir.
  const REASONS = [
    { code: "fiyat", label: "Fiyat bana uygun değil" },
    { code: "kullanmiyorum", label: "Paneli kullanmıyorum" },
    { code: "ozellik_eksik", label: "İhtiyacım olan özellik eksik" },
    { code: "gecici_durgunluk", label: "İşlerim geçici olarak durgun" },
    { code: "kapaniyor", label: "Mağazamı kapatıyorum" },
    { code: "diger", label: "Diğer" },
  ];
  const NOTE_MAX = 500;

  const step = ref(1); // 1 = sebep anketi, 2 = onay
  const reason = ref("");
  const note = ref("");
  const errorMsg = ref("");

  const canContinue = computed(() => !!reason.value);

  // ── Dialog erişilebilirliği (ConfirmDialog deseni: WCAG 2.1.2/2.4.3/4.1.2) ──
  const panelRef = ref(null);
  const titleId = useId();
  let lastActive = null;

  function trapTab(e) {
    trapTabKey(e, panelRef.value);
  }

  watch(open, async (isOpen) => {
    if (isOpen) {
      step.value = 1;
      reason.value = "";
      note.value = "";
      errorMsg.value = "";
      lastActive = document.activeElement;
      await nextTick();
      focusablesIn(panelRef.value)[0]?.focus();
    } else {
      restoreFocus(lastActive);
      lastActive = null;
    }
  });

  function close() {
    if (cancelActing.value) return; // istek uçarken sessiz kapanma yok
    open.value = false;
  }

  async function toConfirm() {
    if (!canContinue.value) return;
    errorMsg.value = "";
    step.value = 2;
    await nextTick();
    focusablesIn(panelRef.value)[0]?.focus();
  }

  async function confirmCancel() {
    if (cancelActing.value) return;
    errorMsg.value = "";
    try {
      const msg = await sub.requestCancellation(reason.value, note.value.trim());
      toast.success("İptal talebiniz alındı — dönem sonuna kadar tüm haklarınız sürer.");
      open.value = false;
      emit("canceled", msg);
    } catch (e) {
      // 403/417 zarfını api.request çözer; kullanıcıya sunucu mesajı gösterilir.
      errorMsg.value = e.message || "İptal talebi işlenemedi. Lütfen tekrar deneyin.";
      toast.error(errorMsg.value);
    }
  }
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
        @click.self="close"
        @keydown.esc="close"
        @keydown.tab="trapTab"
      >
        <div
          ref="panelRef"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          class="csm-panel"
        >
          <!-- Adım 1 — zorunlu sebep anketi -->
          <template v-if="step === 1">
            <h3 :id="titleId" class="csm-title">Aboneliğinizi neden iptal ediyorsunuz?</h3>
            <p class="csm-lead">
              Sebebinizi seçmeden devam edilemez; yanıtınız hizmeti iyileştirmek için kullanılır.
            </p>

            <fieldset class="csm-reasons">
              <legend class="sr-only">İptal sebebi</legend>
              <label v-for="r in REASONS" :key="r.code" class="csm-reason">
                <input v-model="reason" type="radio" name="cancel-reason" :value="r.code" />
                <span>{{ r.label }}</span>
              </label>
            </fieldset>

            <label class="csm-note">
              <span class="csm-note__label">Eklemek istediğiniz bir not var mı? (opsiyonel)</span>
              <textarea
                v-model="note"
                :maxlength="NOTE_MAX"
                rows="3"
                class="csm-note__input"
                placeholder="Kısaca yazabilirsiniz…"
              ></textarea>
              <span class="csm-note__count">{{ note.length }}/{{ NOTE_MAX }}</span>
            </label>

            <div class="csm-actions">
              <button type="button" class="csm-btn csm-btn--ghost" @click="close">Vazgeç</button>
              <button
                type="button"
                class="csm-btn csm-btn--primary"
                :disabled="!canContinue"
                @click="toConfirm"
              >
                Devam
              </button>
            </div>
          </template>

          <!-- Adım 2 — onay: haklar dönem sonuna kadar sürer, geri alınabilir -->
          <template v-else>
            <h3 :id="titleId" class="csm-title">İptali onaylıyor musunuz?</h3>
            <p class="csm-lead">
              Aboneliğiniz hemen değil, dönem sonunda kapanır. O güne kadar hiçbir şey değişmez:
            </p>
            <ul class="csm-facts">
              <li>
                <strong>{{ periodEndLabel }}</strong> tarihine kadar tüm haklarınız aynen sürer.
              </li>
              <li>Listing'leriniz ve mağaza verileriniz silinmez.</li>
              <li>İstediğiniz an tek tıkla geri alabilirsiniz.</li>
            </ul>

            <p v-if="errorMsg" class="csm-error" role="alert">{{ errorMsg }}</p>

            <div class="csm-actions">
              <button
                type="button"
                class="csm-btn csm-btn--ghost"
                :disabled="cancelActing"
                @click="step = 1"
              >
                Geri
              </button>
              <button
                type="button"
                class="csm-btn csm-btn--ghost"
                :disabled="cancelActing"
                @click="close"
              >
                Vazgeç
              </button>
              <button
                type="button"
                class="csm-btn csm-btn--danger"
                :disabled="cancelActing"
                :aria-busy="cancelActing"
                @click="confirmCancel"
              >
                {{ cancelActing ? "İşleniyor…" : "İptali Onayla" }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .csm-panel {
    width: 100%;
    max-width: 26rem;
    margin: 0 1rem;
    padding: 1.35rem 1.4rem;
    border-radius: 12px;
    border: 1px solid $l-border-alt;
    background: $l-bg;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }
  .csm-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
  .csm-lead {
    margin: 0.4rem 0 0;
    font-size: 0.85rem;
    line-height: 1.5;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .csm-reasons {
    margin: 0.9rem 0 0;
    padding: 0;
    border: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .csm-reason {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.5rem 0.65rem;
    border: 1px solid $l-border;
    border-radius: 8px;
    font-size: 0.85rem;
    color: $l-text-700;
    cursor: pointer;
    transition: border-color $t-base;
    @include dark {
      border-color: $d-border;
      color: $d-text;
    }
    &:hover {
      border-color: rgba($brand, 0.45);
    }
    &:has(input:checked) {
      border-color: $brand;
      box-shadow: 0 0 0 1px $brand inset;
    }
    input {
      accent-color: $brand;
    }
  }
  .csm-note {
    display: block;
    margin-top: 0.9rem;
  }
  .csm-note__label {
    display: block;
    font-size: 0.78rem;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .csm-note__input {
    margin-top: 0.3rem;
    width: 100%;
    resize: vertical;
    padding: 0.5rem 0.65rem;
    border: 1px solid $l-border;
    border-radius: 8px;
    font-size: 0.85rem;
    font-family: inherit;
    background: $l-bg;
    color: $l-text-900;
    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      color: $d-text-hi;
    }
  }
  .csm-note__count {
    display: block;
    margin-top: 0.2rem;
    text-align: right;
    font-size: 0.72rem;
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }
  .csm-facts {
    margin: 0.8rem 0 0;
    padding: 0.8rem 1rem 0.8rem 2rem;
    border-radius: 8px;
    background: $l-bg-soft;
    font-size: 0.85rem;
    line-height: 1.6;
    color: $l-text-700;
    @include dark {
      background: $d-bg-elevated;
      color: $d-text;
    }
    strong {
      color: $l-text-900;
      @include dark {
        color: $d-text-max;
      }
    }
  }
  .csm-error {
    margin: 0.7rem 0 0;
    font-size: 0.82rem;
    color: $c-error;
  }
  .csm-actions {
    margin-top: 1.1rem;
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
  .csm-btn {
    padding: 0.5rem 0.95rem;
    border: 1px solid transparent;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      background $t-base,
      filter $t-base,
      opacity $t-base;
    &:disabled {
      opacity: 0.55;
      cursor: default;
    }
  }
  .csm-btn--primary {
    background: $brand;
    border-color: $brand;
    color: #fff;
    &:hover:not(:disabled) {
      filter: brightness(1.06);
    }
  }
  .csm-btn--danger {
    background: $c-error;
    border-color: $c-error;
    color: #fff;
    &:hover:not(:disabled) {
      filter: brightness(1.06);
    }
  }
  .csm-btn--ghost {
    background: transparent;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
    &:hover:not(:disabled) {
      color: $l-text-900;
      @include dark {
        color: $d-text-max;
      }
    }
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  .modal-enter-active,
  .modal-leave-active {
    transition: opacity $t-base;
  }
  .modal-enter-from,
  .modal-leave-to {
    opacity: 0;
  }
</style>
