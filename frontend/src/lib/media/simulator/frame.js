import { slotProfiles } from "../crop/slotProfiles.js";

import { boxWidth, CONTAINERS, matchingStep, SimulatorDataError } from "./layout.js";

/**
 * T-111 — cihaz çerçevesi ve sayfa şablonu **render motoru**.
 *
 * ## Kabul ölçütü (kaynak: `tradehub_core/docs/ui/faz11-simulator.md` §2)
 *
 *   · sayfa **gerçek CSS genişliğinde** kurulur, sonra `transform: scale()`
 *     ile ekrana sığdırılır — **reflow olmadan**,
 *   · ölçek yüzdesi kullanıcıya görünür,
 *   · sayfa şablonu **gerçek grid mantığını** taklit eder,
 *   · 13 × 5 = 65 kombinasyonun tamamı hatasız render olur.
 *
 * ## Reflow yasağı burada nasıl korunuyor
 *
 * Bu modül `scale` sayısını üretir ama **kutuyu daraltmaz**: `deviceFrame()`
 * her zaman `cssWidth`/`cssHeight`'i olduğu gibi döndürür, ölçek ayrı bir
 * alandır. Bileşen sahneyi `width: 390px` verip `transform: scale(0.6)` ile
 * küçültür. Kapsayıcıyı 234px'e daraltmak ya da CSS `zoom` kullanmak,
 * 390px'lik cihazın gerçek kırılımı yerine 234px'lik SAHTE bir kırılımı
 * simüle ederdi — o yüzden ölçek geometriden ayrı tutulur.
 *
 * ## Hesap DEĞİŞMEZ, yalnız görselleşir
 *
 * Kutu genişliği tek yerden gelir: `layout.js::boxWidth`. Bu modül onu
 * yeniden hesaplamaz, `regionLayout().boxPx` alanında **aynen** taşır ve
 * yanına yalnız yerleşimi çizmek için gereken şeyleri (kaçıncı bant kazandı,
 * kaç sütun, kaç px boşluk, kenarda kaç px rezerve ray) ekler. Sapma
 * `__tests__/frameRender.test.js`'te 195 kombinasyonda ölçülür ve
 * `srcsetParity.test.js` bozulmadan durur.
 *
 * ## Ölçülmedi
 *
 * Bu modül bir **tasarım hesabıdır**. Çerçevenin tarayıcıda kaç ms'de
 * boyandığı, ölçeklenmiş sahnenin gerçek pikselde nasıl göründüğü ve
 * `placements.json`'daki kutu değerlerinin gerçek sayfayla uyuşup uyuşmadığı
 * BU GÖREVDE ÖLÇÜLMEDİ (T-115'in işi). Sayfa şablonu storefront'un
 * ekran görüntüsü değildir; `placements.json`'daki ızgara kuralının şemasıdır.
 */

/** Ölçeğin inebileceği en düşük değer — altında çerçeve okunmaz olur. */
export const MIN_SCALE = 0.05;

/** Çerçeveyi büyütmek yok: 1'in üstü, olmayan bir çözünürlük uydurmak olurdu. */
export const MAX_SCALE = 1;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Kullanılabilir genişliğe sığdıran ölçek.
 *
 * @param {number} cssWidth Cihazın GERÇEK CSS genişliği (asla daraltılmaz).
 * @param {number} availableWidth Çerçeveye ayrılan ekran genişliği (px).
 * @returns {{scale: number, scalePct: number}} `scalePct` kullanıcıya yazılır.
 */
export function frameScale(cssWidth, availableWidth, { max = MAX_SCALE } = {}) {
  const w = Number(cssWidth);
  const avail = Number(availableWidth);
  if (!(w > 0)) throw new SimulatorDataError(`geçersiz cihaz genişliği: ${cssWidth}`);
  if (!(avail > 0)) return { scale: max, scalePct: Math.round(max * 100) };
  const scale = clamp(avail / w, MIN_SCALE, max);
  return { scale, scalePct: Math.round(scale * 100) };
}

/**
 * Bir cihazın çerçeve geometrisi.
 *
 * `cssWidth`/`cssHeight` **ölçekten bağımsızdır** — sahne bu ölçüde kurulur.
 * `renderedWidth`/`renderedHeight` yalnız çerçevenin ekranda kapladığı yeri
 * söyler; `transform: scale()` düzen akışını değiştirmediği için kapsayıcıya
 * bu ölçü elle verilmek zorundadır, yoksa çerçeve ölçeklenmemiş boyu kadar
 * yer kaplar ve sayfada boşluk bırakır.
 */
export function deviceFrame(device, availableWidth, opts = {}) {
  const { scale, scalePct } = frameScale(device.cssWidth, availableWidth, opts);
  return {
    deviceId: device.id,
    label: device.label,
    deviceClass: device.deviceClass,
    cssWidth: device.cssWidth,
    cssHeight: device.cssHeight,
    dpr: device.dpr,
    scrollbarPx: device.scrollbarPx,
    scale,
    scalePct,
    renderedWidth: device.cssWidth * scale,
    renderedHeight: device.cssHeight * scale,
  };
}

// ── Kapsayıcı parçaları ───────────────────────────────────────────────

/**
 * Kapsayıcı zincirinin **çizilebilir** parçaları.
 *
 * `flattenContainer()` padding ile `subtract`ı tek sayıda toplar; çizim için
 * ikisi ayrı gerekir: padding iki yana bölünür, `subtract` ise sağda duran
 * rezerve bir sütundur (PDP'nin sağ rayı). Zincir yürüyüşü ve adım seçimi
 * `layout.js` ile aynı fonksiyonu (`matchingStep`) kullanır; `contentPx`'in
 * `containerWidth()` ile birebir aynı olduğu testte ölçülür.
 */
export function containerParts(name, viewportPx) {
  const c = CONTAINERS[name];
  if (!c) throw new SimulatorDataError(`Tanımsız kapsayıcı: ${name}`);
  let maxWidth = null;
  let paddingPx = 0;
  let subtractPx = 0;
  const chain = [];

  if (c.base) {
    const base = containerParts(c.base, viewportPx);
    maxWidth = base.maxWidth;
    paddingPx = base.paddingPx;
    subtractPx = base.subtractPx;
    chain.push(...base.chain);
  } else {
    maxWidth = c.max_width ?? null;
  }
  if (c.max_width !== undefined && c.max_width !== null) {
    maxWidth = maxWidth === null ? c.max_width : Math.min(maxWidth, c.max_width);
  }
  paddingPx += Number(matchingStep(c.padding, viewportPx)?.px ?? 0);
  subtractPx += Number(matchingStep(c.subtract, viewportPx)?.px ?? 0);
  chain.push(name);

  const outerPx = maxWidth ? Math.min(maxWidth, viewportPx) : viewportPx;
  return {
    name,
    chain,
    maxWidth,
    outerPx,
    /** Kapsayıcının viewport içindeki sol kenar boşluğu (ortalanmış). */
    marginPx: Math.max(0, (viewportPx - outerPx) / 2),
    paddingPx,
    subtractPx,
    contentPx: Math.max(0, outerPx - paddingPx - subtractPx),
  };
}

// ── Slot en-boy oranı ─────────────────────────────────────────────────

/**
 * Karo yüksekliğini belirleyen oran — **etiketten** okunur, uydurulmaz.
 *
 * Kırpma tarafında oran daima `width/height`'ten hesaplanır
 * (`slotProfiles.js` "Bulgu 1"), ama `product.image` profillerinin
 * `height`'i `null`: politika o slotu kırpmıyor, yalnız `ratioLabel: "1:1"`
 * beyan ediyor. Çerçeve bir yükseklik vermek zorunda olduğu için etikete
 * düşülüyor ve bu bir **çizim varsayımıdır**: gerçek görselin oranı
 * değişebilir, seçim hesabına hiç girmez.
 */
export function slotAspect(slotKey, fallback = 1) {
  for (const p of slotProfiles(slotKey)) {
    if (p.width > 0 && p.height > 0) return p.width / p.height;
    const [a, b] = String(p.ratioLabel || "")
      .split(":")
      .map(Number);
    if (a > 0 && b > 0) return a / b;
  }
  return fallback;
}

// ── Bölge yerleşimi ───────────────────────────────────────────────────

export const LAYOUT_GRID = "grid";
export const LAYOUT_SLIDER = "slider";
export const LAYOUT_FIXED = "fixed";
export const LAYOUT_FLUID = "fluid";
export const LAYOUT_VIEWPORT_HEIGHT = "viewport_height";

/** Sabit genişlikli rayda kaç karo çizileceğinin görsel tavanı. */
const FIXED_TILE_CAP = 12;

/**
 * Bir bölgenin bu cihazdaki **çizilebilir** yerleşimi.
 *
 * `boxPx` alanı `boxWidth()`'in döndürdüğü değerin **aynısıdır** — burada
 * yeniden hesaplanmaz, çağrılır. Geri kalan alanlar yalnız çizim içindir:
 * kaç sütun, aradaki boşluk, kenarda rezerve edilmiş ray, hangi bant kazandı.
 *
 * @returns {object} `kind` beş değerden biri (LAYOUT_*).
 */
export function regionLayout(region, device) {
  return annotate(rawRegionLayout(region, device));
}

/** Çizimde işe yarayan ama veride olmayan iki türetme. */
function annotate(out) {
  return Object.freeze({
    ...out,
    /**
     * Kutu, içinde durduğu kapsayıcının içerik genişliğinden GENİŞ mi.
     * `product_detail/lightbox_main` dar telefonlarda bunu yapar: kutu
     * yükseklikten türediği için 390px'lik viewport'ta 608px çıkar. Çerçeve
     * bunu kırpar ve rozetle söyler — sessizce sığdırmak yalan olurdu.
     */
    overflows: out.boxPx > out.container.contentPx + 0.5,
    tile: tileBox(out),
  });
}

function rawRegionLayout(region, device) {
  const vw = device.cssWidth;
  const step = matchingStep(region.box, vw);
  if (!step) throw new SimulatorDataError(`${region.key}: ${vw}px için adım yok`);

  const boxPx = boxWidth(region, device);
  const base = {
    regionKey: region.key,
    title: region.title,
    slotKey: region.slotKey,
    lcpCandidate: region.lcpCandidate,
    renderPoint: region.renderPoint,
    derivedFrom: region.derivedFrom,
    anomaly: region.anomaly,
    /** Kazanan bandın alt sınırı — ekranda "≥768px bandı" diye yazılır. */
    bandMinVw: Number(step.min_vw || 0),
    boxPx,
    aspect: slotAspect(region.slotKey),
    capPx: step.cap_px ?? null,
  };

  if ("grid" in step) {
    const g = step.grid;
    const c = containerParts(g.container || "viewport", vw);
    const cols = Number(g.cols);
    return {
      ...base,
      kind: LAYOUT_GRID,
      container: c,
      count: cols,
      cols,
      gapPx: Number(g.gap || 0),
      reservePx: Number(g.subtract_px || 0),
      trackPx: c.contentPx - Number(g.subtract_px || 0),
    };
  }

  if ("slider" in step) {
    const s = step.slider;
    const c = containerParts(s.container || "viewport", vw);
    const per = Number(s.per_view);
    return {
      ...base,
      kind: LAYOUT_SLIDER,
      container: c,
      // Görünen karo sayısı + 1: kaydırıldığında devamı olduğunu göstermek
      // ÇİZİM kararıdır, `per_view` hesabı değişmez.
      count: Math.ceil(per) + 1,
      perView: per,
      gapPx: Number(s.space || 0),
      reservePx: Number(s.subtract_px || 0),
      trackPx: c.contentPx - Number(s.subtract_px || 0),
    };
  }

  if ("vh_pct" in step) {
    const c = containerParts("viewport", vw);
    return {
      ...base,
      kind: LAYOUT_VIEWPORT_HEIGHT,
      container: c,
      count: 1,
      gapPx: 0,
      reservePx: 0,
      trackPx: c.contentPx,
      vhPct: Number(step.vh_pct),
      minusPx: Number(step.minus_px || 0),
    };
  }

  if ("vw_pct" in step) {
    const c = containerParts(step.container || "viewport", vw);
    return {
      ...base,
      kind: LAYOUT_FLUID,
      container: c,
      count: 1,
      vwPct: Number(step.vw_pct),
      gapPx: 0,
      reservePx: 0,
      trackPx: c.contentPx,
    };
  }

  if ("px" in step) {
    const c = containerParts("viewport", vw);
    const gapPx = 8;
    const fits = Math.floor((c.contentPx + gapPx) / (boxPx + gapPx));
    return {
      ...base,
      kind: LAYOUT_FIXED,
      container: c,
      // Sabit genişlikli ray: kaç karo SIĞAR sorusunun cevabı veride YOK,
      // çizim için sayılıyor. Seçim hesabına girmez.
      count: clamp(fits, 1, FIXED_TILE_CAP),
      gapPx,
      reservePx: 0,
      trackPx: c.contentPx,
    };
  }

  throw new SimulatorDataError(
    `${region.key}: çizilemeyen kutu adımı ${Object.keys(step).sort().join(",")}`
  );
}

/**
 * Bir sayfanın bu cihazdaki tam şablonu — bölgeler `placements.json`'daki
 * sırayla, her biri kendi ızgarasıyla.
 *
 * `layoutSwitchVw` sayfanın mobil/masaüstü yerleşim değiştirdiği noktadır
 * (`product_detail` → 1024). Şablon bunu **saklamaz**: hangi kolda olduğunu
 * `desktopLayout` alanıyla söyler, çünkü aynı bölge iki kolda bambaşka bir
 * kutu alır ve kullanıcı hangi kolu gördüğünü bilmelidir.
 */
export function pageTemplate(page, device, activeRegionKey = "") {
  const switchVw = page.layoutSwitchVw;
  return {
    page: page.page,
    title: page.title,
    url: page.url,
    device: device.id,
    viewportPx: device.cssWidth,
    layoutSwitchVw: switchVw ?? null,
    desktopLayout: switchVw === null || switchVw === undefined ? null : device.cssWidth >= switchVw,
    blocks: page.regions.map((r) => ({
      ...regionLayout(r, device),
      active: r.key === activeRegionKey,
      primary: r.region === page.primaryRegion,
    })),
  };
}

/**
 * Çizim için sayısal ölçüler — bileşen inline `style` dizgesini bundan kurar.
 * Yükseklik oranla türetilir ve bir tavana vurur: 1080px'lik bir karo
 * çerçeveyi anlamsız uzatırdı.
 */
export function tileBox(layout) {
  const w = Math.max(1, layout.boxPx);
  const h = Math.max(1, w / (layout.aspect || 1));
  return { widthPx: w, heightPx: Math.min(h, 320) };
}

/**
 * Çerçevenin toplam yüksekliği cihaz yüksekliğidir; şablon taşarsa
 * KIRPILIR — gerçek sayfada da ekranın altı görünmez, kaydırılır.
 */
export function frameStyle(frame) {
  return {
    stage: `width:${frame.cssWidth}px;height:${frame.cssHeight}px;transform:scale(${frame.scale});transform-origin:top left`,
    shell: `width:${Math.round(frame.renderedWidth)}px;height:${Math.round(frame.renderedHeight)}px`,
  };
}
