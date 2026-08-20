import { onBeforeUnmount, onMounted, readonly, ref, toValue, watch } from "vue";

/**
 * Sayfa kaydırmasına bağlı ızgara pencereleme (virtual scrolling).
 *
 * Neden gerekli: sanal klasör ağacının klasör seviyeleri SAYFALANMIYOR.
 * `media/browse.py → seller_listings()` bir kategorideki ürün klasörlerinin
 * TAMAMINI tek yanıtta döndürür (`folders` listesinde `page`/`page_size` yok);
 * 750 dosyalık bir mağazada bu birkaç yüz karta çıkıyor ve hepsi DOM'a
 * basılıyordu. Dosya seviyesi sayfalı olduğu için sorun orada değil, klasör
 * seviyesinde.
 *
 * Kendi kaydırma kutusu AÇMAZ. Izgara sayfanın akışında kalır; pencere
 * `getBoundingClientRect().top` ile viewport'a göre hesaplanır. Kutu içine
 * alsaydık sayfa iki ayrı kaydırma çubuğu gösterirdi ve klavye gezinmesi
 * (Home/End) sayfa sonuna değil kutu sonuna giderdi.
 *
 * Yükseklik korunur: görünmeyen satırların yerine kabın `padding-top` /
 * `padding-bottom` değeri konur. Toplam yükseklik değişmediği için kaydırma
 * çubuğu zıplamaz ve pencere değiştiğinde düzen KAYMAZ — bunun şartı satır
 * yüksekliğinin sabit olması (`rowHeight`), çağıran bunu CSS'te garanti eder.
 *
 * Ölçüm yapılmadan (SSR ve ilk mount öncesi) pencere KAPALIDIR: liste tam
 * basılır. Böylece sunucu çıktısı ile ilk istemci render'ı aynı olur ve
 * hydration uyuşmazlığı çıkmaz.
 */

/**
 * Görünür pencerenin saf matematiği — DOM'suz test edilebilir.
 *
 * @param {object} p
 * @param {number} p.total          Toplam kalem.
 * @param {number} p.columns        Satır başına kalem (ölçülen sütun sayısı).
 * @param {number} p.rowHeight      Bir kartın yüksekliği (px).
 * @param {number} [p.gap]          Satır arası boşluk (px).
 * @param {number} p.gridTop        Izgaranın viewport'a göre üst kenarı (px,
 *                                  yukarı kaydırıldıkça negatifleşir).
 * @param {number} p.viewportHeight Görünür alan yüksekliği (px).
 * @param {number} [p.overscan]     Görünenin üstüne/altına eklenen satır.
 * @returns {{start:number,end:number,padTop:number,padBottom:number}}
 */
export function computeWindow({
  total,
  columns,
  rowHeight,
  gap = 0,
  gridTop,
  viewportHeight,
  overscan = 2,
}) {
  const n = Math.max(0, Math.trunc(total) || 0);
  const cols = Math.max(1, Math.trunc(columns) || 1);
  const pitch = (Number(rowHeight) || 0) + (Number(gap) || 0);

  // Ölçüm yoksa pencereleme yapılmaz: eksik veriyle tahmin etmek, sonradan
  // düzeltilecek yanlış bir yükseklik basmak demektir — tam olarak kaçınmaya
  // çalıştığımız düzen kayması.
  if (!n || pitch <= 0 || !(Number(viewportHeight) > 0)) {
    return { start: 0, end: n, padTop: 0, padBottom: 0 };
  }

  const rowCount = Math.ceil(n / cols);
  const top = Number(gridTop) || 0;
  const over = Math.max(0, Math.trunc(overscan) || 0);

  const clampRow = (r) => Math.min(rowCount - 1, Math.max(0, r));
  const firstRow = clampRow(Math.floor(-top / pitch) - over);
  const lastRow = clampRow(Math.floor((viewportHeight - top) / pitch) + over);

  return {
    start: firstRow * cols,
    end: Math.min(n, (lastRow + 1) * cols),
    padTop: firstRow * pitch,
    padBottom: (rowCount - 1 - lastRow) * pitch,
  };
}

/** Kabın gerçek sütun sayısı, satır yüksekliği ve boşluğu — hesaplanmış CSS'ten. */
export function measureGrid(el) {
  if (!el || typeof window === "undefined") return null;
  const style = window.getComputedStyle(el);
  const tracks = (style.gridTemplateColumns || "").trim();
  const columns = tracks && tracks !== "none" ? tracks.split(/\s+/).length : 1;
  const gap = parseFloat(style.rowGap) || 0;
  // Satır yüksekliği ilk hücreden ölçülür: CSS değişkeni değişse (yoğunluk,
  // mobil tipografi) matematik onu takip etsin, sabit sayı tekrar edilmesin.
  const cell = el.firstElementChild;
  const rowHeight = cell ? cell.getBoundingClientRect().height : 0;
  return { columns, gap, rowHeight };
}

/**
 * @param {import("vue").Ref<HTMLElement|null>} containerRef Izgara kabı.
 * @param {object} opts
 * @param {() => number} opts.total     Toplam kalem sayısı (getter).
 * @param {() => boolean} [opts.enabled] Pencereleme açık mı (eşik kararı çağıranın).
 * @param {number} [opts.overscan]
 */
export function useVirtualGrid(containerRef, { total, enabled = () => true, overscan = 2 } = {}) {
  const start = ref(0);
  const end = ref(0);
  const padTop = ref(0);
  const padBottom = ref(0);
  /** Ölçüm yapıldı mı — yapılmadıysa liste tam basılır. */
  const active = ref(false);
  /** Klavye imlecinin bulunduğu kalem pencere dışına düşmesin. */
  const pinned = ref(-1);

  /** Ölçülen sütun sayısı — klavye gezinmesi de bunu kullanır. */
  const columns = ref(1);
  const metrics = { columns: 1, gap: 0, rowHeight: 0 };

  function reset() {
    const n = Math.max(0, toValue(total) || 0);
    start.value = 0;
    end.value = n;
    padTop.value = 0;
    padBottom.value = 0;
    active.value = false;
  }

  reset();

  function update() {
    const el = containerRef.value;
    const n = Math.max(0, toValue(total) || 0);
    if (!el || !toValue(enabled) || !n) {
      reset();
      return;
    }

    const measured = measureGrid(el);
    if (!measured || measured.rowHeight <= 0) {
      reset();
      return;
    }
    Object.assign(metrics, measured);
    columns.value = metrics.columns;

    // `padding-top` kutunun İÇİNDE: kenarlık kutusunun üstü, boşluk eklense
    // de eklenmese de aynı yerde durur. Yani `rect.top` her zaman "0. satır
    // burada başlardı" noktasıdır ve pencereden bağımsızdır — çıkarma yapmak
    // pencereyi kendi ürettiği boşluk kadar kaydırırdı.
    const rect = el.getBoundingClientRect();
    const win = computeWindow({
      total: n,
      columns: metrics.columns,
      rowHeight: metrics.rowHeight,
      gap: metrics.gap,
      gridTop: rect.top,
      viewportHeight: window.innerHeight,
      overscan,
    });

    let { start: s, end: e } = win;
    // Odaklanmış kalem pencerede değilse odak DOM'dan düşer ve klavye
    // gezinmesi sayfanın başına atar; pencereyi o kalemi kapsayacak kadar aç.
    if (pinned.value >= 0 && pinned.value < n) {
      s = Math.min(s, pinned.value);
      e = Math.max(e, pinned.value + 1);
    }

    start.value = s;
    end.value = e;
    padTop.value = win.padTop;
    padBottom.value = win.padBottom;
    active.value = true;
  }

  /** Klavye imleci — bu kalem her zaman basılsın. */
  function pin(index) {
    pinned.value = Number.isInteger(index) ? index : -1;
    update();
  }

  let frame = 0;
  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  }

  let observer = null;

  onMounted(() => {
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule, { passive: true });
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(schedule);
      if (containerRef.value) observer.observe(containerRef.value);
    }
    update();
  });

  onBeforeUnmount(() => {
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener("scroll", schedule, { capture: true });
    window.removeEventListener("resize", schedule);
    observer?.disconnect();
    observer = null;
  });

  // Kalem sayısı ya da eşik değişince pencere yeniden kurulur; aksi hâlde
  // klasör değiştirince eski pencerede kalıp boş ekran gösterirdi.
  watch([() => toValue(total), () => toValue(enabled)], () => {
    pinned.value = -1;
    reset();
    schedule();
  });

  watch(containerRef, (el) => {
    observer?.disconnect();
    if (el && observer) observer.observe(el);
    schedule();
  });

  return {
    start: readonly(start),
    end: readonly(end),
    padTop: readonly(padTop),
    padBottom: readonly(padBottom),
    active: readonly(active),
    columns: readonly(columns),
    pin,
    update,
  };
}
