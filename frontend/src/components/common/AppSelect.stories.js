import AppSelect from "./AppSelect.vue";

/**
 * Markalı `<select>`. Native select DOM'da kalır (v-model, form gönderimi,
 * ekran okuyucu değişmez); `nativeSelectPicker` eklentisi desteklemeyen
 * tarayıcılarda aynı görünümde özel panel açar.
 */
export default {
  title: "Ortak/AppSelect",
  component: AppSelect,
  tags: ["autodocs"],
  argTypes: { modelValue: { control: false } },
};

const Template = (args) => ({
  components: { AppSelect },
  setup: () => ({ args }),
  data: () => ({ value: args.modelValue ?? "" }),
  template: `<div class="max-w-xs"><AppSelect v-bind="args" v-model="value" /></div>`,
});

export const Default = {
  render: Template,
  args: {
    placeholder: "Taşıyıcı seçin",
    options: [
      { value: "YK", label: "Yurtiçi Kargo" },
      { value: "AK", label: "Aras Kargo" },
      { value: "MNG", label: "MNG Kargo" },
    ],
  },
};

export const Preselected = {
  name: "Seçili değerle",
  render: Template,
  args: { ...Default.args, modelValue: "AK" },
};

/** Uzun seçenek listesi — panel kaydırma davranışı. */
export const ManyOptions = {
  name: "Çok seçenekli",
  render: Template,
  args: {
    placeholder: "İl seçin",
    options: [
      "Adana", "Ankara", "Antalya", "Bursa", "Diyarbakır", "Erzurum",
      "Gaziantep", "İstanbul", "İzmir", "Kayseri", "Konya", "Şanlıurfa",
    ].map((c) => ({ value: c, label: c })),
  },
};
