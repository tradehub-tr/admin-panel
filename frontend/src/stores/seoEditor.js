import { defineStore } from "pinia";
import { checkSlugUnique, getSeoFields, saveSeoFields } from "@/api/seo";

const EMPTY_FIELDS = {
  slug: "",
  url_slug: "",
  meta_title: "",
  meta_description: "",
  focus_keyword: "",
  noindex: 0,
  og_image: "",
  og_title_override: "",
  og_description_override: "",
  canonical_url_override: "",
  robots_directive_override: "",
  // Listing için ana görsel alt metni (Faz 4b sonrası)
  primary_image_alt: "",
  // Faz 7 — EN fields
  slug_en: "",
  url_slug_en: "",
  meta_title_en: "",
  meta_description_en: "",
  og_title_override_en: "",
  og_description_override_en: "",
};

export const useSeoEditorStore = defineStore("seoEditor", {
  state: () => ({
    doctype: "",
    recordName: "",
    fields: { ...EMPTY_FIELDS },
    initialFields: { ...EMPTY_FIELDS },
    loading: false,
    saving: false,
    slugStatus: "idle", // 'idle' | 'checking' | 'unique' | 'duplicate'
    slugSuggestion: null,
    error: null,
    currentLang: "tr", // Faz 7 — 'tr' | 'en'
  }),

  getters: {
    dirty(state) {
      return JSON.stringify(state.fields) !== JSON.stringify(state.initialFields);
    },
    metaTitleOverLimit(state) {
      return (state.fields.meta_title || "").length > 70;
    },
    metaDescOverLimit(state) {
      return (state.fields.meta_description || "").length > 160;
    },
  },

  actions: {
    async load(doctype, recordName) {
      this.doctype = doctype;
      this.recordName = recordName;
      this.loading = true;
      this.error = null;
      try {
        const response = await getSeoFields({ doctype, name: recordName });
        this.fields = { ...EMPTY_FIELDS, ...response };
        this.initialFields = { ...this.fields };
      } catch (e) {
        this.error = e.message || "SEO veri yüklenemedi";
      } finally {
        this.loading = false;
      }
    },

    async checkSlug(slug) {
      if (!slug) {
        this.slugStatus = "idle";
        this.slugSuggestion = null;
        return;
      }
      this.slugStatus = "checking";
      try {
        const result = await checkSlugUnique({
          doctype: this.doctype,
          slug,
          excludeName: this.recordName,
        });
        this.slugStatus = result.unique ? "unique" : "duplicate";
        this.slugSuggestion = result.suggestion;
      } catch (e) {
        this.slugStatus = "idle";
        this.error = e.message;
      }
    },

    async save() {
      this.saving = true;
      this.error = null;
      try {
        await saveSeoFields({
          doctype: this.doctype,
          name: this.recordName,
          fields: this.fields,
        });
        this.initialFields = { ...this.fields };
        return { ok: true };
      } catch (e) {
        this.error = e.message;
        return { ok: false, error: e.message };
      } finally {
        this.saving = false;
      }
    },

    reset() {
      this.fields = { ...this.initialFields };
    },
  },
});
