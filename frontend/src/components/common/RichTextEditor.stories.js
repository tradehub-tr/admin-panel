import RichTextEditor from "./RichTextEditor.vue";

/**
 * TipTap tabanlı zengin metin editörü. Görsel yükleme backend'e gider —
 * Storybook'ta mock sahte bir `file_url` döndürür.
 */
export default {
  title: "Ortak/RichTextEditor",
  component: RichTextEditor,
  tags: ["autodocs"],
  argTypes: {
    modelValue: { control: false },
    dir: { control: "select", options: ["ltr", "rtl"] },
    compact: { control: "boolean" },
  },
};

const Template = (args) => ({
  components: { RichTextEditor },
  setup: () => ({ args }),
  data: () => ({ value: args.modelValue ?? "" }),
  template: `<div class="max-w-2xl"><RichTextEditor v-bind="args" v-model="value" /></div>`,
});

export const Default = {
  name: "Boş",
  render: Template,
  args: { placeholder: "Açıklama yazın…" },
};

export const Prefilled = {
  name: "İçerikli",
  render: Template,
  args: {
    modelValue:
      "<p><strong>Teslimat koşulları:</strong> Kargo 2-4 iş günü içinde teslim edilir.</p>",
  },
};

export const Compact = { name: "Dar", render: Template, args: { compact: true } };

/** Sağdan sola yazım — Arapça içerik. */
export const Rtl = {
  name: "RTL",
  render: Template,
  args: { dir: "rtl", modelValue: "<p>شروط التسليم</p>" },
};
