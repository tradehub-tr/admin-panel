import BaseSwitch from "./BaseSwitch.vue";

/**
 * İki durumlu anahtar. `v-model` ile bağlanır; açık/kapalı değerleri
 * `onValue` / `offValue` ile özelleştirilebilir (Frappe Check alanları 0/1
 * tamsayı döndürdüğü için bu gerekli).
 */
export default {
  title: "Ortak/BaseSwitch",
  component: BaseSwitch,
  tags: ["autodocs"],
  argTypes: {
    modelValue: { control: false },
    disabled: { control: "boolean" },
    label: { control: "text" },
    description: { control: "text" },
  },
};

/** Story'lerin ortak gövdesi — v-model'i yerel state'e bağlar. */
const Template = (args) => ({
  components: { BaseSwitch },
  setup: () => ({ args }),
  data: () => ({ value: args.modelValue ?? false }),
  template: `<BaseSwitch v-bind="args" v-model="value" />`,
});

export const Default = {
  render: Template,
  args: { label: "Aktif", modelValue: false },
};

export const Checked = {
  name: "Açık",
  render: Template,
  args: { label: "Aktif", modelValue: true },
};

export const WithDescription = {
  name: "Açıklamalı",
  render: Template,
  args: {
    label: "Otomatik takip",
    description: "Kargo durumu belirli aralıklarla taşıyıcıdan sorgulanır.",
    modelValue: true,
  },
};

export const Disabled = {
  name: "Devre dışı",
  render: Template,
  args: { label: "Değiştirilemez", modelValue: true, disabled: true },
};

/**
 * Frappe Check alanları boolean değil **0/1 tamsayı** döndürür. Lojistik
 * kataloglarındaki `is_active` alanı bu biçimdedir; anahtar bu değerlerle de
 * çalışmalı.
 */
export const IntegerValues = {
  name: "Tamsayı değerler (0/1)",
  render: Template,
  args: { label: "is_active", onValue: 1, offValue: 0, modelValue: 1 },
};
