import { ref } from "vue";

/**
 * BAYAT-YANIT KORUMASI — yalnız SON isteğin sonucu uygulanır.
 *
 * NEDEN COMPOSABLE (SOLID denetimi, 2026-08-24):
 *   Aynı sıra-numarası deseni üç container'da (A2 `PendingQueueView`,
 *   A3 `ExceptionQueueView`, L1 `ReportCenterView`) yorum bloklarına kadar
 *   birebir kopyalanmıştı — projenin "3. kopyada composable" eşiği. Riski en
 *   yüksek olan L1'di: orada aynı denetim ÜÇ dala ayrı ayrı serpilmişti ve
 *   yeni bir panel eklerken birinin unutulması sessiz bir hata olurdu
 *   (kullanıcı eski panelin raporunu yeni panelin başlığı altında görürdü).
 *
 * NEDEN AbortController YOK:
 *   `logisticsClient` `signal` parametresi almıyor; istek gerçekten iptal
 *   edilemiyor, yalnız SONUCU görmezden gelinebiliyor. İstemci signal
 *   destekleyecek şekilde genişletildiği gün burası `onWatcherCleanup` +
 *   `AbortController` desenine geçer (`vue-reactivity.md` §4) ve çağıranlar
 *   değişmez — asıl kazanç bu.
 *
 * LOADING KURALI:
 *   `finally` içinde `loading` YALNIZ son istek tarafından kapatılır. Aksi
 *   hâlde geç dönen eski istek, hâlâ süren yeni isteğin iskeletini erkenden
 *   söndürür ve ekran bir an "veri yok" gösterir.
 *
 * @param {object} [options]
 * @param {(error: unknown) => unknown} [options.mapError]
 *   Hata nesnesini ekranın anladığı biçime çevirir (lojistikte
 *   `api/logisticsEnvelope.toScreenError`). Varsayılan: olduğu gibi bırakır.
 * @returns {{ loading: import("vue").Ref<boolean>,
 *             error: import("vue").Ref<unknown>,
 *             run: (task: () => Promise<any>, handlers?: object) => Promise<boolean> }}
 */
export function useLatestRequest({ mapError = (error) => error } = {}) {
  const loading = ref(false);
  const error = ref(null);

  /**
   * Kaçıncı isteğin "güncel" sayıldığı. Modül düzeyinde DEĞİL fonksiyon
   * içinde: iki farklı liste aynı sayacı paylaşsaydı biri diğerinin yanıtını
   * bayat sayıp sessizce düşürürdü.
   */
  let latestSeq = 0;

  /**
   * İsteği çalıştırır; sonucu YALNIZ bu istek hâlâ sonuncuysa uygular.
   *
   * @param {() => Promise<any>} task İsteği başlatan fonksiyon.
   * @param {object} [handlers]
   * @param {(data: any) => void} [handlers.apply] Taze yanıtla çağrılır.
   * @param {(error: unknown) => void} [handlers.onError]
   *   Taze hatada ek temizlik (ör. listeyi boşaltmak). `error` ref'i zaten
   *   burada dolduruluyor — bu kanca yalnız çağırana özel iş içindir.
   * @returns {Promise<boolean>} Sonuç uygulandıysa `true`, bayat düşürüldüyse
   *   `false` (test ve çağıran-tarafı dallanma için).
   */
  async function run(task, { apply, onError } = {}) {
    const seq = ++latestSeq;
    loading.value = true;
    error.value = null;
    try {
      const data = await task();
      if (seq !== latestSeq) return false;
      apply?.(data);
      return true;
    } catch (e) {
      if (seq !== latestSeq) return false;
      error.value = mapError(e);
      onError?.(e);
      return true;
    } finally {
      if (seq === latestSeq) loading.value = false;
    }
  }

  return { loading, error, run };
}
