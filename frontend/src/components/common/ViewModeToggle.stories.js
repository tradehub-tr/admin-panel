import ViewModeToggle from "./ViewModeToggle.vue";

/** Liste görünümü değiştirici (tablo / ızgara / kanban / liste). */
export default {
  title: "Ortak/ViewModeToggle",
  component: ViewModeToggle,
  tags: ["autodocs"],
  argTypes: { modelValue: { control: false } },
};

const Template = (args) => ({
  components: { ViewModeToggle },
  setup: () => ({ args }),
  data: () => ({ mode: args.modelValue ?? "table" }),
  template: `
    <div>
      <ViewModeToggle v-bind="args" v-model="mode" />
      <p class="mt-3 text-xs text-slate-500">Seçili: {{ mode }}</p>
    </div>
  `,
});

export const Default = { render: Template, args: { modelValue: "table" } };

/** Katalog ekranlarında yalnız tablo ve ızgara kullanılacak. */
export const CatalogModes = {
  name: "Katalog modları",
  render: Template,
  args: { modes: ["table", "grid"], modelValue: "table" },
};
