<template>
  <Teleport to="body">
    <div class="hs-overlay" @click.self="emit('close')">
      <div class="hs-modal" role="dialog" aria-modal="true">
        <header class="hs-modal__head">
          <h2>{{ form.name ? "Slide Düzenle" : "Yeni Slide" }}</h2>
          <button type="button" class="hs-icon-btn" aria-label="Kapat" @click="emit('close')">
            <X :size="18" />
          </button>
        </header>

        <div class="hs-modal__body">
          <div class="hs-grid">
            <!-- FORM -->
            <div class="hs-form">
              <!-- Dil sekmeleri -->
              <div class="hs-tabs" role="tablist">
                <button
                  v-for="l in langs"
                  :key="l.code"
                  type="button"
                  :class="['hs-tab', { active: lang === l.code }]"
                  @click="lang = l.code"
                >
                  {{ l.label }}
                </button>
              </div>

              <label class="hs-field">
                <span>Etiket ({{ lang.toUpperCase() }})</span>
                <input
                  v-model="form[`label_${lang}`]"
                  type="text"
                  placeholder="örn. TREND UYARISI"
                />
              </label>
              <label class="hs-field">
                <span>Başlık ({{ lang.toUpperCase() }}) *</span>
                <input v-model="form[`title_${lang}`]" type="text" placeholder="Büyük başlık" />
              </label>
              <label class="hs-field">
                <span>Açıklama ({{ lang.toUpperCase() }})</span>
                <textarea
                  v-model="form[`description_${lang}`]"
                  rows="2"
                  placeholder="Kısa açıklama"
                ></textarea>
              </label>
              <label class="hs-field">
                <span>Buton Metni ({{ lang.toUpperCase() }})</span>
                <input
                  v-model="form[`button_text_${lang}`]"
                  type="text"
                  placeholder="örn. Şimdi keşfet"
                />
              </label>

              <label class="hs-field">
                <span>Buton Linki</span>
                <input v-model="form.button_href" type="text" placeholder="/cok-satanlar" />
              </label>

              <hr class="hs-sep" />

              <!-- Arka plan -->
              <div class="hs-field">
                <span>Arka Plan Türü</span>
                <div class="hs-seg">
                  <button
                    v-for="bt in bgTypes"
                    :key="bt.value"
                    type="button"
                    :class="['hs-seg__item', { active: form.background_type === bt.value }]"
                    @click="form.background_type = bt.value"
                  >
                    {{ bt.label }}
                  </button>
                </div>
              </div>

              <div v-if="form.background_type === 'image'" class="hs-field">
                <span>Arka Plan Görseli</span>
                <div class="hs-upload">
                  <img
                    v-if="form.background_image"
                    :src="form.background_image"
                    alt=""
                    class="hs-upload__preview"
                  />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    @change="onPickImage"
                  />
                  <button
                    v-if="form.background_image"
                    type="button"
                    class="hs-link-btn"
                    @click="form.background_image = ''"
                  >
                    Görseli kaldır
                  </button>
                  <span v-if="uploading" class="hs-hint">Yükleniyor…</span>
                </div>
              </div>

              <div
                v-if="form.background_type === 'color' || form.background_type === 'gradient'"
                class="hs-row"
              >
                <label class="hs-field hs-field--color">
                  <span>{{
                    form.background_type === "gradient" ? "Başlangıç Rengi" : "Renk"
                  }}</span>
                  <input v-model="form.background_color" type="color" />
                </label>
                <label v-if="form.background_type === 'gradient'" class="hs-field hs-field--color">
                  <span>Bitiş Rengi</span>
                  <input v-model="form.background_color_2" type="color" />
                </label>
                <label v-if="form.background_type === 'gradient'" class="hs-field hs-field--angle">
                  <span>Açı (°)</span>
                  <input v-model.number="form.gradient_angle" type="number" min="0" max="360" />
                </label>
              </div>

              <hr class="hs-sep" />

              <!-- Görünüm -->
              <div class="hs-row">
                <label class="hs-field hs-field--color">
                  <span>Yazı Rengi</span>
                  <input v-model="form.text_color" type="color" />
                </label>
                <label class="hs-field">
                  <span>İçerik Konumu</span>
                  <select v-model="form.content_align">
                    <option value="center">Orta</option>
                    <option value="left">Sol</option>
                    <option value="right">Sağ</option>
                  </select>
                </label>
                <label class="hs-check">
                  <input v-model="overlayBool" type="checkbox" />
                  <span>Görsel üzerine koyu katman</span>
                </label>
              </div>

              <hr class="hs-sep" />

              <!-- Meta -->
              <div class="hs-row">
                <label class="hs-check">
                  <input v-model="activeBool" type="checkbox" />
                  <span>Aktif</span>
                </label>
              </div>
              <div class="hs-row">
                <label class="hs-field">
                  <span>Başlangıç (ops.)</span>
                  <input
                    :value="toLocal(form.start_at)"
                    type="datetime-local"
                    @input="form.start_at = fromLocal($event.target.value)"
                  />
                </label>
                <label class="hs-field">
                  <span>Bitiş (ops.)</span>
                  <input
                    :value="toLocal(form.end_at)"
                    type="datetime-local"
                    @input="form.end_at = fromLocal($event.target.value)"
                  />
                </label>
              </div>
            </div>

            <!-- CANLI ÖNİZLEME -->
            <div class="hs-preview">
              <span class="hs-preview__label">Canlı Önizleme</span>
              <div class="hs-preview__frame">
                <div class="hs-preview__bg" :style="{ background: previewBg }"></div>
                <div v-if="overlayBool" class="hs-preview__overlay"></div>
                <div
                  class="hs-preview__content"
                  :style="{
                    color: form.text_color,
                    alignItems: alignItems,
                    textAlign: form.content_align,
                  }"
                >
                  <span v-if="form[`label_${lang}`]" class="hs-preview__pill">{{
                    form[`label_${lang}`]
                  }}</span>
                  <strong class="hs-preview__title">{{ form[`title_${lang}`] || "Başlık" }}</strong>
                  <span v-if="form[`description_${lang}`]" class="hs-preview__desc">{{
                    form[`description_${lang}`]
                  }}</span>
                  <span v-if="form[`button_text_${lang}`]" class="hs-preview__btn">{{
                    form[`button_text_${lang}`]
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="hs-modal__foot">
          <button type="button" class="hs-btn-ghost" @click="emit('close')">İptal</button>
          <button
            type="button"
            class="hs-btn-primary"
            :disabled="saving || !canSave"
            @click="onSave"
          >
            {{ saving ? "Kaydediliyor…" : "Kaydet" }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
  import { computed, reactive, ref } from "vue";
  import { X } from "lucide-vue-next";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";

  const props = defineProps({
    slide: { type: Object, required: true },
  });
  const emit = defineEmits(["save", "close"]);

  const toast = useToast();
  const lang = ref("tr");
  const saving = ref(false);
  const uploading = ref(false);

  const langs = [
    { code: "tr", label: "Türkçe" },
    { code: "en", label: "English" },
  ];
  const bgTypes = [
    { value: "gradient", label: "Gradient" },
    { value: "color", label: "Düz Renk" },
    { value: "image", label: "Görsel" },
  ];

  const form = reactive({ ...props.slide });

  const activeBool = computed({
    get: () => Boolean(form.is_active),
    set: (v) => (form.is_active = v ? 1 : 0),
  });
  const overlayBool = computed({
    get: () => Boolean(form.overlay),
    set: (v) => (form.overlay = v ? 1 : 0),
  });

  const canSave = computed(() => Boolean((form.title_tr || "").trim()));

  const alignItems = computed(
    () =>
      ({ center: "center", left: "flex-start", right: "flex-end" })[form.content_align] || "center"
  );

  const previewBg = computed(() => {
    if (form.background_type === "image" && form.background_image) {
      return `url('${form.background_image}') center/cover no-repeat`;
    }
    if (form.background_type === "color") return form.background_color || "#1f5fae";
    return `linear-gradient(${form.gradient_angle || 120}deg, ${form.background_color || "#1f5fae"} 0%, ${form.background_color_2 || "#0c2e61"} 100%)`;
  });

  function toLocal(val) {
    return val ? String(val).slice(0, 16).replace(" ", "T") : "";
  }
  function fromLocal(val) {
    return val ? val.replace("T", " ") + ":00" : null;
  }

  async function onPickImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploading.value = true;
    try {
      form.background_image = await api.uploadFile(file);
    } catch (err) {
      toast.error(err.message || "Görsel yüklenemedi");
    } finally {
      uploading.value = false;
    }
  }

  async function onSave() {
    if (!canSave.value) return;
    saving.value = true;
    try {
      await emit("save", { ...form });
    } finally {
      saving.value = false;
    }
  }
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .hs-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(#000, 0.45);
    backdrop-filter: blur(2px);
  }

  .hs-modal {
    width: 100%;
    max-width: 860px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    background: $l-bg;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(#000, 0.25);
    @include dark {
      background: $d-bg-card;
    }
  }

  .hs-modal__head,
  .hs-modal__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid $l-border-alt;
    @include dark {
      border-color: $d-border;
    }
    h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: $l-text-900;
      @include dark {
        color: $d-text;
      }
    }
  }
  .hs-modal__foot {
    border-bottom: none;
    border-top: 1px solid $l-border-alt;
    gap: 8px;
    justify-content: flex-end;
    @include dark {
      border-color: $d-border;
    }
  }
  .hs-modal__body {
    padding: 20px;
    overflow-y: auto;
  }

  .hs-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    @media (min-width: 768px) {
      grid-template-columns: 1fr 320px;
    }
  }

  .hs-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .hs-tabs {
    display: inline-flex;
    gap: 4px;
    padding: 3px;
    background: $l-bg-muted;
    border-radius: 8px;
    width: fit-content;
    @include dark {
      background: $d-bg;
    }
  }
  .hs-tab {
    appearance: none;
    border: none;
    background: transparent;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    color: $l-text-500;
    &.active {
      background: $l-bg;
      color: $brand;
      box-shadow: 0 1px 2px rgba(#000, 0.08);
    }
    @include dark {
      color: $d-text-muted;
      &.active {
        background: $d-bg-card;
        color: $brand-light;
      }
    }
  }

  .hs-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    > span {
      font-size: 12px;
      font-weight: 500;
      color: $l-text-700;
      @include dark {
        color: $d-text-muted;
      }
    }
    input[type="text"],
    input[type="number"],
    input[type="datetime-local"],
    textarea,
    select {
      width: 100%;
      padding: 8px 10px;
      font-size: 13px;
      font-family: inherit;
      color: $l-text-900;
      background: $l-bg;
      border: 1px solid $l-border-alt;
      border-radius: 8px;
      &:focus {
        outline: none;
        border-color: $brand;
      }
      @include dark {
        color: $d-text;
        background: $d-bg;
        border-color: $d-border;
      }
    }
    input[type="color"] {
      width: 100%;
      height: 36px;
      padding: 2px;
      border: 1px solid $l-border-alt;
      border-radius: 8px;
      background: $l-bg;
      cursor: pointer;
      @include dark {
        background: $d-bg;
        border-color: $d-border;
      }
    }
  }
  .hs-field--color {
    max-width: 120px;
  }
  .hs-field--angle {
    max-width: 90px;
  }

  .hs-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-end;
  }

  .hs-check {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: $l-text-700;
    cursor: pointer;
    @include dark {
      color: $d-text-muted;
    }
    input {
      width: 16px;
      height: 16px;
      accent-color: $brand;
    }
  }

  .hs-seg {
    display: inline-flex;
    gap: 4px;
    padding: 3px;
    background: $l-bg-muted;
    border-radius: 8px;
    @include dark {
      background: $d-bg;
    }
  }
  .hs-seg__item {
    appearance: none;
    border: none;
    background: transparent;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    color: $l-text-500;
    &.active {
      background: $l-bg;
      color: $brand;
      box-shadow: 0 1px 2px rgba(#000, 0.08);
    }
    @include dark {
      color: $d-text-muted;
      &.active {
        background: $d-bg-card;
        color: $brand-light;
      }
    }
  }

  .hs-upload {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
    input[type="file"] {
      font-size: 12px;
    }
  }
  .hs-upload__preview {
    width: 100%;
    max-height: 120px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid $l-border-alt;
  }
  .hs-link-btn {
    appearance: none;
    border: none;
    background: none;
    color: $c-error;
    font-size: 12px;
    cursor: pointer;
    padding: 0;
  }
  .hs-hint {
    font-size: 12px;
    color: $l-text-500;
  }

  .hs-sep {
    border: none;
    border-top: 1px solid $l-border-alt;
    margin: 4px 0;
    @include dark {
      border-color: $d-border;
    }
  }

  // Önizleme
  .hs-preview__label {
    display: block;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: $l-text-500;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .hs-preview__frame {
    position: relative;
    height: 220px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid $l-border-alt;
  }
  .hs-preview__bg {
    position: absolute;
    inset: 0;
  }
  .hs-preview__overlay {
    position: absolute;
    inset: 0;
    background: rgba(#000, 0.35);
  }
  .hs-preview__content {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
    padding: 20px;
  }
  .hs-preview__pill {
    align-self: inherit;
    background: #fff;
    color: #1f5fae;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 3px 8px;
    border-radius: 999px;
    width: fit-content;
  }
  .hs-preview__title {
    font-size: 22px;
    font-weight: 800;
    line-height: 1.15;
  }
  .hs-preview__desc {
    font-size: 12px;
    opacity: 0.9;
    max-width: 220px;
  }
  .hs-preview__btn {
    margin-top: 4px;
    background: #fff;
    color: #0c2e61;
    font-size: 12px;
    font-weight: 600;
    padding: 8px 18px;
    border-radius: 999px;
    width: fit-content;
  }

  // Butonlar
  .hs-btn-primary {
    appearance: none;
    border: none;
    background: $brand;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    padding: 8px 18px;
    border-radius: 8px;
    cursor: pointer;
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
  .hs-btn-ghost {
    appearance: none;
    background: transparent;
    border: 1px solid $l-border-alt;
    color: $l-text-700;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    @include dark {
      color: $d-text-muted;
      border-color: $d-border;
    }
  }
  .hs-icon-btn {
    appearance: none;
    background: transparent;
    border: none;
    color: $l-text-500;
    cursor: pointer;
    display: inline-flex;
    padding: 4px;
    border-radius: 6px;
    &:hover {
      color: $l-text-900;
    }
    @include dark {
      color: $d-text-muted;
      &:hover {
        color: $d-text;
      }
    }
  }
</style>
