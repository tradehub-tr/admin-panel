<template>
  <div
    class="up-drop"
    :class="{ 'up-drop--over': isOver, 'up-drop--disabled': disabled }"
    role="button"
    tabindex="0"
    :aria-disabled="disabled ? 'true' : 'false'"
    :aria-label="t('media.uploader.dropAria', {}, 'Dosya bırakın ya da seçmek için tıklayın')"
    @click="pick"
    @keydown.enter.prevent="pick"
    @keydown.space.prevent="pick"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <AppIcon name="upload-cloud" :size="28" class="up-drop__icon" />
    <!-- `t(k, {}, "TR")` varsayılanları duruyor: anahtarlar artık dört locale'de
         de var (W8), varsayılan yalnız sözlük gerilerse devreye girer. -->
    <p class="up-drop__title">
      {{
        isOver
          ? t("media.uploader.dropActive")
          : t("media.uploader.dropTitle", {}, "Dosyaları buraya bırakın")
      }}
    </p>
    <p class="up-drop__hint">
      {{ hint || t("media.uploader.dropHint", {}, "ya da tıklayıp seçin") }}
    </p>
    <p class="up-drop__paste">{{ t("media.uploader.pasteHint") }}</p>
  </div>

  <!-- Dosya seçici bırakma alanının DIŞINDA: `role="button"` içindeki
       odaklanabilir input axe'in `nested-interactive` (serious) ihlaliydi —
       etkileşimli öğe etkileşimli öğe içeremez, `tabindex="-1"` yetmiyor.
       `aria-label` da `label` (critical) ihlalinin düzeltmesi: görünür
       <label>'ı olmayan gizli input'un erişilebilir adı. Görsel değişiklik
       yok: input zaten `display: none`, tetikleyicisi yine bırakma alanı. -->
  <input
    ref="inputRef"
    type="file"
    class="up-drop__input"
    :multiple="multiple"
    :accept="accept"
    :aria-label="t('media.uploader.dropAria', {}, 'Dosya bırakın ya da seçmek için tıklayın')"
    tabindex="-1"
    @change="onPicked"
  />
</template>

<script setup>
  /**
   * Bırakma alanı — sürükle-bırak, klasör, yapıştırma, dosya seçici.
   *
   * **Dört giriş yolu da aynı olayı üretiyor.** T-091 dördünü de istiyor ve
   * dördü ayrı ayrı ele alınırsa üçü kuyruğa girer biri girmez. Buradaki tek
   * iş, hangi yoldan gelirse gelsin `files` olayını `File[]` ile yaymak;
   * ölçüm, politika ve gönderim kuyruğun işi.
   *
   * **Yapıştırma belgeye bağlanıyor, alana değil.** Kullanıcı ekran görüntüsü
   * alıp Ctrl+V'ye basarken önce bırakma alanına odaklanmıyor. Dinleyici
   * `document` üzerinde ve yalnız bileşen ekrandayken bağlı.
   *
   * **`dragleave` sayaçla izleniyor.** İç ögelerin üstünden geçerken tarayıcı
   * `dragleave` yolluyor; sayaç olmadan alan sürükleme sürerken sönüp yanıyor.
   */
  import { onMounted, onUnmounted, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { collectDroppedFiles, collectPastedFiles } from "@/lib/media/upload/dropFiles.js";

  const props = defineProps({
    multiple: { type: Boolean, default: true },
    accept: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
    hint: { type: String, default: "" },
    /** Yapıştırmayı dinlemesin — aynı sayfada iki yükleyici varsa gerekli. */
    listenPaste: { type: Boolean, default: true },
  });

  const emit = defineEmits(["files"]);
  const { t } = useI18n();

  const inputRef = ref(null);
  const isOver = ref(false);
  let derinlik = 0;

  function pick() {
    if (props.disabled) return;
    inputRef.value?.click();
  }

  function yay(files) {
    const liste = props.multiple ? files : files.slice(0, 1);
    if (liste.length) emit("files", liste);
  }

  function onPicked(event) {
    yay(Array.from(event.target.files || []));
    // Aynı dosya arka arkaya seçilebilsin: `change` değer değişmezse
    // tetiklenmez, seçici sıfırlanmazsa ikinci seçim sessizce yutulurdu.
    event.target.value = "";
  }

  function onDragEnter(event) {
    if (props.disabled || !event.dataTransfer?.types?.includes("Files")) return;
    derinlik += 1;
    isOver.value = true;
  }

  function onDragOver(event) {
    if (props.disabled) return;
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  }

  function onDragLeave() {
    derinlik = Math.max(0, derinlik - 1);
    if (!derinlik) isOver.value = false;
  }

  async function onDrop(event) {
    derinlik = 0;
    isOver.value = false;
    if (props.disabled) return;
    yay(await collectDroppedFiles(event.dataTransfer));
  }

  function onPaste(event) {
    if (props.disabled) return;
    const files = collectPastedFiles(event);
    if (files.length) yay(files);
  }

  onMounted(() => {
    if (props.listenPaste) document.addEventListener("paste", onPaste);
  });
  onUnmounted(() => {
    if (props.listenPaste) document.removeEventListener("paste", onPaste);
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .up-drop {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: media.$s-1;
    padding: media.$s-6 media.$s-4;
    border: 2px dashed $l-border;
    border-radius: media.$r-lg;
    text-align: center;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      background-color 0.15s ease;

    &:focus-visible {
      @include media.focus-ring;
    }
  }

  .up-drop--over {
    border-color: $brand;
    background: $brand-light;
  }

  .up-drop--disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .up-drop__icon {
    color: $brand;
  }

  .up-drop__title {
    margin: 0;
    @include media.text("body");
    @include media.heading;
  }

  .up-drop__hint,
  .up-drop__paste {
    margin: 0;
    @include media.text("xs");
    @include media.muted;
  }

  .up-drop__input {
    display: none;
  }
</style>
