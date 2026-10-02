/** SSR testinde `document` yok — kaydırma kilidi burada etkisiz. */
export function useScrollLock() {
  return { set() {} };
}
