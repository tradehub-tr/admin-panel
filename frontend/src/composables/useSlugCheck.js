import { useSeoEditorStore } from "@/stores/seoEditor";

let _debounceTimer = null;

/**
 * Slug input için 500ms debounce'lu uniqueness check.
 *
 * Kullanım:
 *   const { check, cancel } = useSlugCheck();
 *   <input @input="check($event.target.value)" />
 */
export function useSlugCheck() {
  const store = useSeoEditorStore();

  function check(slug) {
    cancel();
    _debounceTimer = setTimeout(() => {
      store.checkSlug(slug);
    }, 500);
  }

  function cancel() {
    if (_debounceTimer) {
      clearTimeout(_debounceTimer);
      _debounceTimer = null;
    }
  }

  return { check, cancel };
}
