/**
 * `@/composables/useSellerMedia` yerine geçen test sahtesi.
 *
 * `useMediaUsage` varsayılan kaynağı olarak satıcı ucunu kullanıyor. Testte
 * her zaman kendi getiricimiz enjekte ediliyor; bu sahte, gerçek modülün
 * (ve onun yükleme/sıkıştırma bağımlılıklarının) SSR'da yüklenmesini
 * engelliyor. Gövde bilerek patlıyor: varsayılan yola sessizce düşülürse
 * test bunu görmeli.
 */
export function useSellerMedia() {
  return {
    usageOf: async () => {
      throw new Error("varsayılan uç kullanıldı — testte fetcher enjekte edilmeliydi");
    },
  };
}
