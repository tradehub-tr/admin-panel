<template>
  <div
    class="rte rounded-lg border border-gray-200 bg-white transition-colors focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/20 dark:border-gray-600 dark:bg-gray-900"
  >
    <!-- Toolbar -->
    <div
      v-if="editor"
      class="flex flex-wrap items-center gap-0.5 border-b border-gray-100 px-1.5 py-1 dark:border-gray-700"
    >
      <template v-for="btn in toolbarButtons" :key="btn.key">
        <span
          v-if="btn.divider"
          class="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700"
          aria-hidden="true"
        ></span>
        <button
          v-else
          type="button"
          class="rte-btn"
          :class="{ active: btn.isActive?.() }"
          :title="btn.title"
          :aria-label="btn.title"
          :disabled="btn.isDisabled?.()"
          @click="btn.run()"
        >
          <AppIcon
            :name="btn.loading?.() ? 'loader' : btn.icon"
            :size="15"
            :class="btn.loading?.() ? 'animate-spin' : ''"
          />
        </button>
      </template>

      <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onImagePicked" />
    </div>

    <!-- İçerik -->
    <EditorContent :editor="editor" :dir="dir" class="rte-content" :class="{ compact }" />
  </div>
</template>

<script setup>
  /**
   * RichTextEditor — Tiptap tabanlı WYSIWYG (headless; görünüm panel diline ait).
   *
   * Çıktı düz HTML: Frappe `Text Editor` alanına aynen kaydedilir; sunucu tarafı
   * sanitize (frappe.utils.sanitize_html) + storefront DOMPurify zinciri korunur.
   * Görsel yükleme ürün görselleriyle aynı kanalı kullanır (api.uploadFile →
   * /api/method/upload_file).
   */
  import { ref, watch, computed } from "vue";
  import { useEditor, EditorContent } from "@tiptap/vue-3";
  import StarterKit from "@tiptap/starter-kit";
  import ImageExt from "@tiptap/extension-image";
  import { Placeholder } from "@tiptap/extensions";
  import { useI18n } from "vue-i18n";
  import { useToast } from "@/composables/useToast";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";

  const props = defineProps({
    modelValue: { type: String, default: "" },
    placeholder: { type: String, default: "" },
    dir: { type: String, default: "ltr" },
    /** Kısa alanlar için alçak içerik yüksekliği (Kısa Açıklama gibi). */
    compact: { type: Boolean, default: false },
  });
  const emit = defineEmits(["update:modelValue"]);

  const { t } = useI18n();
  const toast = useToast();
  const fileInput = ref(null);
  const uploadingImage = ref(false);

  const editor = useEditor({
    content: props.modelValue || "",
    extensions: [
      // StarterKit v3 Link + Underline içerir; link'i yeni sekmede açtır.
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer nofollow" } },
      }),
      ImageExt,
      Placeholder.configure({ placeholder: () => props.placeholder }),
    ],
    onUpdate: ({ editor: ed }) => {
      // Boş editör "<p></p>" üretir — alanı gerçekten boş kaydet.
      emit("update:modelValue", ed.isEmpty ? "" : ed.getHTML());
    },
  });

  // Dış değişimler (dil sekmesi değişimi, "kaynaktan kopyala") editöre yansısın.
  watch(
    () => props.modelValue,
    (val) => {
      const ed = editor.value;
      if (ed && (val || "") !== ed.getHTML() && !(ed.isEmpty && !val)) {
        // emitUpdate:false şart — programatik senkron (dil sekmesi değişimi)
        // onUpdate'i tetiklerse normalize HTML v-model'e geri yazılır ve form
        // kullanıcı hiçbir şey yapmadan "dirty" olur.
        ed.commands.setContent(val || "", { emitUpdate: false });
      }
    }
  );

  const toolbarButtons = computed(() => {
    const ed = editor.value;
    if (!ed) return [];
    return [
      { key: "bold", icon: "bold", title: t("richText.bold"), isActive: () => ed.isActive("bold"), run: () => ed.chain().focus().toggleBold().run() },
      { key: "italic", icon: "italic", title: t("richText.italic"), isActive: () => ed.isActive("italic"), run: () => ed.chain().focus().toggleItalic().run() },
      { key: "underline", icon: "underline", title: t("richText.underline"), isActive: () => ed.isActive("underline"), run: () => ed.chain().focus().toggleUnderline().run() },
      { key: "strike", icon: "strikethrough", title: t("richText.strike"), isActive: () => ed.isActive("strike"), run: () => ed.chain().focus().toggleStrike().run() },
      { key: "h2", icon: "heading-2", title: t("richText.heading"), isActive: () => ed.isActive("heading", { level: 2 }), run: () => ed.chain().focus().toggleHeading({ level: 2 }).run() },
      { key: "h3", icon: "heading-3", title: t("richText.subheading"), isActive: () => ed.isActive("heading", { level: 3 }), run: () => ed.chain().focus().toggleHeading({ level: 3 }).run() },
      { key: "ul", icon: "list", title: t("richText.bulletList"), isActive: () => ed.isActive("bulletList"), run: () => ed.chain().focus().toggleBulletList().run() },
      { key: "ol", icon: "list-ordered", title: t("richText.orderedList"), isActive: () => ed.isActive("orderedList"), run: () => ed.chain().focus().toggleOrderedList().run() },
      { key: "clear", icon: "remove-formatting", title: t("richText.clearFormat"), run: () => ed.chain().focus().clearNodes().unsetAllMarks().run() },
      { key: "div1", divider: true },
      { key: "link", icon: "link", title: t("richText.link"), isActive: () => ed.isActive("link"), run: setLink },
      { key: "image", icon: "image", title: t("richText.image"), isDisabled: () => uploadingImage.value, loading: () => uploadingImage.value, run: () => fileInput.value?.click() },
      { key: "div2", divider: true },
      { key: "undo", icon: "undo-2", title: t("richText.undo"), isDisabled: () => !ed.can().undo(), run: () => ed.chain().focus().undo().run() },
      { key: "redo", icon: "redo-2", title: t("richText.redo"), isDisabled: () => !ed.can().redo(), run: () => ed.chain().focus().redo().run() },
    ];
  });

  function setLink() {
    const ed = editor.value;
    if (!ed) return;
    const prev = ed.getAttributes("link").href || "";
    const url = window.prompt(t("richText.linkPrompt"), prev);
    if (url === null) return;
    if (url === "") {
      ed.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    ed.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  async function onImagePicked(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor.value) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("richText.imageTooLarge"));
      return;
    }
    uploadingImage.value = true;
    try {
      const url = await api.uploadFile(file);
      if (url) editor.value.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (e) {
      toast.error(e?.message || t("richText.imageUploadFailed"));
    } finally {
      uploadingImage.value = false;
    }
  }
</script>

<style lang="scss" scoped>
  @use "@/assets/scss/variables" as *;

  .rte-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: $l-text-500;
    cursor: pointer;
    transition:
      background-color 0.12s ease,
      color 0.12s ease;

    &:hover:not(:disabled) {
      background: rgba(0, 0, 0, 0.05);
      color: $l-text-900;
    }

    &.active {
      background: rgba($brand, 0.15);
      color: #a16207;
    }

    &:disabled {
      opacity: 0.35;
      cursor: default;
    }

    @include dark {
      color: $d-text-muted;

      &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.08);
        color: $d-text;
      }

      &.active {
        background: rgba($brand, 0.18);
        color: $brand-light;
      }
    }
  }

  // ProseMirror içerik alanı — scoped style dinamik render edilen editöre
  // sızmaz, :deep şart. Tipografi storefront'takiyle aynı hiyerarşiyi verir.
  .rte-content.compact :deep(.ProseMirror) {
    min-height: 90px;
  }

  .rte-content :deep(.ProseMirror) {
    min-height: 180px;
    max-height: 480px;
    overflow-y: auto;
    padding: 10px 12px;
    font-size: 13px;
    line-height: 1.6;
    outline: none;

    p {
      margin: 0 0 8px;
    }

    h2 {
      margin: 12px 0 6px;
      font-size: 16px;
      font-weight: 700;
    }

    h3 {
      margin: 10px 0 4px;
      font-size: 14px;
      font-weight: 600;
    }

    ul,
    ol {
      margin: 0 0 8px;
      padding-inline-start: 20px;
    }

    ul {
      list-style: disc;
    }

    ol {
      list-style: decimal;
    }

    a {
      color: #2563eb;
      text-decoration: underline;
    }

    img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 8px 0;

      &.ProseMirror-selectednode {
        outline: 2px solid $brand;
      }
    }

    // Placeholder (Tiptap dokümantasyonundaki resmi CSS deseni)
    p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      height: 0;
      color: #9ca3af;
      pointer-events: none;
    }
  }
</style>
