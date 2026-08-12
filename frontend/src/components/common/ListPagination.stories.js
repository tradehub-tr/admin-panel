import ListPagination from "./ListPagination.vue";

/**
 * Sayfalama. Lojistik katalog API'si `{items, total, page, page_size}`
 * döndürüyor — bu bileşen o sözleşmeye doğrudan bağlanacak.
 */
export default {
  title: "Ortak/ListPagination",
  component: ListPagination,
  tags: ["autodocs"],
  argTypes: { modelValue: { control: false } },
};

const Template = (args) => ({
  components: { ListPagination },
  setup: () => ({ args }),
  data: () => ({ page: args.modelValue ?? 1, size: args.pageSize ?? 20 }),
  template: `
    <div>
      <ListPagination v-bind="args" v-model="page" v-model:pageSize="size" />
      <p class="mt-3 text-xs text-slate-500">Sayfa {{ page }} · boyut {{ size }}</p>
    </div>
  `,
});

export const Default = {
  render: Template,
  args: { modelValue: 1, total: 137, pageSize: 20 },
};

export const MiddlePage = {
  name: "Orta sayfa",
  render: Template,
  args: { modelValue: 4, total: 137, pageSize: 20 },
};

/** Tek sayfalık sonuç — sayfalama gizlenmeli ya da sade görünmeli. */
export const SinglePage = {
  name: "Tek sayfa",
  render: Template,
  args: { modelValue: 1, total: 8, pageSize: 20 },
};

export const Empty = {
  name: "Sonuç yok",
  render: Template,
  args: { modelValue: 1, total: 0, pageSize: 20 },
};
