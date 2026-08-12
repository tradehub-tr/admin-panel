import GlobalSearch from "./GlobalSearch.vue";

/** Global arama kutusu. Router kullanır — Storybook'ta bellek router'ı devrede. */
export default {
  title: "Ortak/GlobalSearch",
  component: GlobalSearch,
  tags: ["autodocs"],
};

export const Default = { name: "Boş", args: { query: "" } };
export const WithQuery = { name: "Aramalı", args: { query: "kargo" } };
