// Doctype-spesifik SEO konfigürasyonu (frontend tarafında sabit map).
// Backend tradehub_core/api/seo_admin.py:SEO_FIELDS_BY_DOCTYPE ile uyumlu.

export const SEO_DOCTYPE_CONFIG = {
  Listing: {
    slugField: "slug",
    urlPrefix: "/urun",
    titleField: "title",
    descriptionField: "description",
    imageField: "primary_image",
    label: "Ürün",
  },
  "Product Category": {
    slugField: "url_slug",
    urlPrefix: "/kategori",
    titleField: "category_name",
    descriptionField: "description",
    imageField: "image",
    label: "Kategori",
  },
  Brand: {
    slugField: "slug",
    urlPrefix: "/marka",
    titleField: "brand_name",
    descriptionField: "description",
    imageField: "logo",
    label: "Marka",
  },
  "Admin Seller Profile": {
    slugField: "slug",
    urlPrefix: "/magaza",
    titleField: "seller_name",
    descriptionField: "description",
    imageField: "logo",
    label: "Satıcı",
  },
  "Static Page SEO": {
    slugField: "page_path",
    urlPrefix: "",
    titleField: "page_title",
    descriptionField: "meta_description",
    imageField: "og_image",
    label: "Statik Sayfa",
  },
};

export function getConfigFor(doctype) {
  return SEO_DOCTYPE_CONFIG[doctype];
}
