import { ref } from "vue";

// İçerik çeviri dilleri — backend CONTENT_LANGS ile birebir.
export const CONTENT_LANGS = ["tr", "en", "ar", "ru"];

/**
 * Dil-sufix içerik alanlarını (title_tr/_en/_ar/_ru) tek bir aktif dil üzerinden
 * düzenlemek için yardımcı. Backend `{field}_{lang}` konvansiyonuyla birebir.
 *
 *   const { currentLang, fieldKeyFor } = useLangFields();
 *   <input v-model="draft[fieldKeyFor('title')]" />   // draft.title_en gibi
 *
 * @param {string} initialLang başlangıç/varsayılan dil (kaydın content_default_lang'i)
 */
export function useLangFields(initialLang = "tr") {
  const currentLang = ref(initialLang || "tr");

  function fieldKeyFor(base) {
    return `${base}_${currentLang.value}`;
  }

  return { currentLang, fieldKeyFor, CONTENT_LANGS };
}
