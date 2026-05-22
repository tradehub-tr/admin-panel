/**
 * Tab Extension Registry
 * ──────────────────────
 * DocTypeFormView'da belirli (doctype, tab id) kombinasyonu için
 * özel bir Vue component render eder. Anahtar bulunursa o tab'ın
 * default section/childTable rendering'i atlanır ve component
 * `:doc-name="docName"` prop'u ile mount edilir.
 *
 * Anahtar formatı: `${doctype}::${tabId}` — tabId DocTypeFormView'un
 * `formTabs` computed'unda `tab-${field.fieldname}` olarak üretilir.
 */

import { defineAsyncComponent, h } from "vue";

const SellerAddressesPanel = defineAsyncComponent(
  () => import("@/components/seller/SellerAddressesPanel.vue")
);
const SeoTab = defineAsyncComponent(() => import("@/components/seo/SeoTab.vue"));

// Tab extension contract'ı sadece `docName` veriyor.
// SeoTab ise `doctype` + `recordName` istiyor. Bu factory closure ile
// doctype'ı bind eder, doc-name'i record-name'e mapler.
// `new` mode'da (henüz kaydedilmemiş kayıt) SeoTab mount edilmez —
// önce kayıt oluşturma uyarısı gösterilir, çünkü SEO ayarları kayıt
// adı/slug üzerinden persist edilir.
function seoTabFor(doctype) {
  return {
    name: `SeoTabFor${doctype.replace(/\s+/g, "")}`,
    props: { docName: { type: String, required: true } },
    render() {
      const isNew = !this.docName || this.docName === "new" || this.docName.startsWith("new-");
      if (isNew) {
        return h(
          "div",
          { class: "p-6 text-center text-sm text-gray-500" },
          "SEO ayarlarını düzenlemek için önce kaydı oluşturun. Kayıt oluştuktan sonra bu sekmede meta başlık, açıklama, OG görsel, EN versiyon, SEO skoru ve URL slug yönetimi açılır."
        );
      }
      return h(SeoTab, { doctype, recordName: this.docName });
    },
  };
}

// Sprint 2: Seller Profile deprecated (hidden); Admin Seller Profile (mağaza) kalır
const TAB_EXTENSIONS = {
  "Admin Seller Profile::tab-tab_addresses": SellerAddressesPanel,
  // SEO tab extension — DocTypeFormView'in 4 ana doctype'ı için.
  // Tab id formatı `tab-<fieldname>`:
  //   Listing.seo_tab           → tab-seo_tab
  //   Product Category.tab_seo  → tab-tab_seo
  //   Brand.tab_seo             → tab-tab_seo
  //   Admin Seller Profile.seo_tab → tab-seo_tab
  "Listing::tab-seo_tab": seoTabFor("Listing"),
  "Product Category::tab-tab_seo": seoTabFor("Product Category"),
  "Brand::tab-tab_seo": seoTabFor("Brand"),
  "Admin Seller Profile::tab-seo_tab": seoTabFor("Admin Seller Profile"),
};

export function getTabExtension(doctype, tabId) {
  return TAB_EXTENSIONS[`${doctype}::${tabId}`] || null;
}
