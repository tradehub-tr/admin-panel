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

import { defineAsyncComponent } from "vue";

const SellerAddressesPanel = defineAsyncComponent(
  () => import("@/components/seller/SellerAddressesPanel.vue")
);

const TAB_EXTENSIONS = {
  "Seller Profile::tab-tab_addresses": SellerAddressesPanel,
  "Admin Seller Profile::tab-tab_addresses": SellerAddressesPanel,
};

export function getTabExtension(doctype, tabId) {
  return TAB_EXTENSIONS[`${doctype}::${tabId}`] || null;
}
