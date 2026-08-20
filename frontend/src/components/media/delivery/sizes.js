import { sizesAttribute } from "@/lib/media/simulator/select.js";

/**
 * T-121 — panelin `sizes` değerleri **gerçek düzenden türetilir**.
 *
 * ## Neden elle yazılmıyor
 *
 * Elle yazılmış bir `sizes` dizgesi, kırılım noktası ya da sütun sayısı
 * değiştiği gün sessizce yanlışa döner: tarayıcı yanlış basamağı seçer,
 * kimse fark etmez, görsel ya bulanık gelir ya da gereğinden büyük iner.
 * Bu modülde tek bir `sizes` dizgesi YAZILI DEĞİL — hepsi aşağıdaki
 * ölçülmüş CSS sabitlerinden üretilir.
 *
 * ## Türetme motoru burada DEĞİL
 *
 * Kutu kuralını CSS `sizes` sözdizimine çeviren algoritma
 * `@/lib/media/simulator/select.js::sizesAttribute`'tur ve o dosya
 * `tradehub_core/media/pipeline/simulator/srcset.py` ile parite testine
 * bağlıdır (`lib/media/simulator/__tests__/srcsetParity.test.js`).
 * Burada ikinci bir hesap YAZILMADI; yalnız panelin kendi kapsayıcı ve
 * kutu tanımları veri olarak verilip aynı motor çağrıldı.
 *
 * `sizesAttribute(region, ctx)` imzası bunun için zaten parametrik: ctx
 * `{containers, flatten}` alır, yani kapsayıcı kümesi dışarıdan gelir.
 * Motorun kendi `flattenContainer`'ı modül düzeyindeki simülatör
 * kapsayıcılarına bağlı olduğu için (`layout.js`, oraya YAZAMIYORUZ) aynı
 * çözümleme paneldeki kapsayıcı haritası üzerinde `flatten()` ile
 * yürütülür. İkisinin AYNI sonucu verdiği ölçülüyor:
 * `__tests__/panelSizes.test.js` → "flatten simülatörün çözümlemesiyle
 * birebir aynı".
 *
 * ## Sayılar nereden geldi (hepsi kaynak dosyada okunabilir)
 *
 * | Değer | Kaynak |
 * |---|---|
 * | Ray 60px | `components/layout/IconRail.vue:3` → `w-[60px]` |
 * | Yan panel 220px | `components/layout/SidePanel.vue:16` → `width: '220px'` |
 * | Ray+panel yalnız ≥768px | `layouts/AppLayout.vue:6-7` `v-if="isLg"`, `composables/useBreakpoint.js` `lg: (min-width: 768px)` |
 * | main iç boşluk 16→24px | `layouts/AppLayout.vue:14` `p-4 xl:p-6`; `assets/tailwind.css` `--breakpoint-xl: 1024px` |
 * | `.mpage` yan boşluk 16px | `views/seller/MediaLibraryView.vue:1874` `padding: $s-5 $s-4 $s-10`; `assets/scss/media.scss` `$s-4: 1rem` |
 * | Detay sütunu 19rem / 21rem | `MediaLibraryView.vue:1948,1954` `minmax(0,1fr) 19rem` (≥1280) / `21rem` (≥1536) |
 * | Sütun arası 16px | aynı grid'in `gap: $s-4` |
 * | Izgara boşluğu 12px | `MediaLibraryView.vue:2326` `gap: $s-3`; `$s-3: 0.75rem` |
 * | Sütun sayısı kuralı | `MediaLibraryView.vue:1181` `detailDocked ? density : min(density, 4)` |
 * | `detailDocked` = ≥1280px | `MediaLibraryView.vue:1161` `is2xl`; `useBreakpoint.js` `2xl: (min-width: 1280px)` |
 * | Satır küçük resmi 40px | `MediaLibraryView.vue:2409` `.mrow__thumb { width: 2.5rem }` |
 * | Tablo/kanban küçük resmi 36px | `:2560`, `:2721` → `2.25rem` |
 * | Detay sheet'i min(416px,100vw) | `MediaDetailPanel.vue:458` `width: min(26rem, 100%)` |
 *
 * ## ÖLÇÜLMEYEN
 *
 * Kabul kriterinin "seçilen rendition ile gerçek kutu farkı ≤ %25" maddesi
 * `currentSrc` ile `getBoundingClientRect()` karşılaştırması ister; bunun
 * için canlı tarayıcı gerekir. **Bu görevde tarayıcı doğrulaması
 * YAPILMADI** — burada ölçülen, üretilen `sizes` dizgesinin CSS
 * kaynağıyla tutarlılığıdır, tarayıcının o dizgeyi nasıl çözdüğü değil.
 */

// ── Ölçülmüş CSS sabitleri ────────────────────────────────────────────

/** Sol ikon rayı + yan panel; yalnız `lg` (≥768px) kırılımından itibaren. */
export const RAIL_PX = 60;
export const SIDE_PANEL_PX = 220;
export const SHELL_BREAKPOINT = 768;

/** `main` iç boşluğu (iki yan toplamı): `p-4` → 32, `xl:p-6` → 48. */
export const MAIN_PAD_PX = 32;
export const MAIN_PAD_XL_PX = 48;
export const XL_BREAKPOINT = 1024;

/** `.mpage` yan boşluğu (iki yan toplamı). */
export const PAGE_PAD_PX = 32;

/** Detay sütunu + grid boşluğu; `detailDocked` kırılımından itibaren. */
export const DETAIL_COL_PX = 304; // 19rem
export const DETAIL_COL_WIDE_PX = 336; // 21rem
export const LAYOUT_GAP_PX = 16;
export const DETAIL_DOCKED_BREAKPOINT = 1280;
export const DETAIL_WIDE_BREAKPOINT = 1536;

/** `.mgrid` sütun arası. */
export const GRID_GAP_PX = 12;

/** Detay paneli sheet modunda: `min(26rem, 100%)`. */
export const DETAIL_SHEET_PX = 416;

/** Sabit ölçülü küçük resimler — CSS'te tek bir `width` kuralı. */
export const ROW_THUMB_PX = 40;
export const CELL_THUMB_PX = 36;

/** Yoğunluk seçicisinin ürettiği sütun sayısı (`MediaLibraryView.vue:1181`). */
export function gridColumnsAt(density, viewportPx) {
  const d = Math.max(1, Math.trunc(Number(density) || 1));
  return viewportPx >= DETAIL_DOCKED_BREAKPOINT ? d : Math.min(d, 4);
}

// ── Kapsayıcı haritası ────────────────────────────────────────────────

/**
 * `sizesAttribute`'un beklediği kapsayıcı şekli — `placements.json`'daki
 * kapsayıcılarla BİREBİR aynı alan adları (`base`, `max_width`, `padding`,
 * `subtract`), çünkü aynı motor okuyor.
 *
 * @param {boolean} detailOpen Detay paneli açık mı — açıkken ≥1280px'te
 *   ızgara sütunu daralır. Kapalıyken daralma YOK; ikisini tek dizgeye
 *   sıkıştırmak yanlış olurdu.
 */
export function panelContainers(detailOpen = false) {
  const detailSubtract = detailOpen
    ? [
        { min_vw: 0, px: 0 },
        { min_vw: DETAIL_DOCKED_BREAKPOINT, px: DETAIL_COL_PX + LAYOUT_GAP_PX },
        { min_vw: DETAIL_WIDE_BREAKPOINT, px: DETAIL_COL_WIDE_PX + LAYOUT_GAP_PX },
      ]
    : [{ min_vw: 0, px: 0 }];

  return Object.freeze({
    viewport: {},
    // Uygulama kabuğu: ≥768px'te sol ray + yan panel akıştan çıkar.
    panel_shell: {
      subtract: [
        { min_vw: 0, px: 0 },
        { min_vw: SHELL_BREAKPOINT, px: RAIL_PX + SIDE_PANEL_PX },
      ],
    },
    // `main` iç boşluğu.
    panel_main: {
      base: "panel_shell",
      padding: [
        { min_vw: 0, px: MAIN_PAD_PX },
        { min_vw: XL_BREAKPOINT, px: MAIN_PAD_XL_PX },
      ],
    },
    // `.mpage` iç boşluğu.
    media_page: {
      base: "panel_main",
      padding: [{ min_vw: 0, px: PAGE_PAD_PX }],
    },
    // Izgaranın oturduğu sütun — detay panelinin sütunu düşülmüş.
    media_col: {
      base: "media_page",
      subtract: detailSubtract,
    },
    // Detay paneli sheet modunda viewport'a yaslı, kabuktan bağımsız.
    detail_sheet: {
      max_width: DETAIL_SHEET_PX,
    },
  });
}

/**
 * `sizesAttribute` ctx'inin `flatten` üyesi.
 *
 * Simülatörün `layout.js::flattenContainer`'ıyla AYNI çözümleme: `base`
 * zinciri düzleştirilir, iki `max_width` çakışırsa KÜÇÜK olan bağlar,
 * `padding` ve `subtract` adım değerleri toplanır. O fonksiyon modül
 * düzeyindeki simülatör kapsayıcılarına bağlı olduğu ve `lib/media/simulator/`
 * bu görevde SALT OKUNUR olduğu için burada kapsayıcı haritası üzerinden
 * parametrik çalışan eşdeğeri kullanılıyor; eşdeğerlik ölçülüyor
 * (`__tests__/panelSizes.test.js`).
 */
export function makeFlatten(containers) {
  function stepValue(steps, viewportPx) {
    let winner;
    for (const s of steps || []) {
      const min = Number(s.min_vw || 0);
      if (viewportPx < min) continue;
      if (!winner || min >= Number(winner.min_vw || 0)) winner = s;
    }
    return winner ? Number(winner.px || 0) : 0;
  }

  return function flatten(name, viewportPx) {
    const c = containers[name];
    if (!c) throw new Error(`Tanımsız kapsayıcı: ${name}`);
    let mw = null;
    let deduct = 0;
    if (c.base) [mw, deduct] = flatten(c.base, viewportPx);
    else mw = c.max_width ?? null;
    if (c.max_width !== undefined && c.max_width !== null) {
      mw = mw === null ? c.max_width : Math.min(mw, c.max_width);
    }
    deduct += stepValue(c.padding, viewportPx);
    deduct += stepValue(c.subtract, viewportPx);
    return [mw, deduct];
  };
}

// ── Bölgeler ──────────────────────────────────────────────────────────

/**
 * Panelin medya yüzeyleri, `placements.json` bölge şeklinde.
 *
 * Sabit ölçülü küçük resimler de buraya giriyor: 40px'lik bir kutuya
 * `sizes` yazmak gereksiz görünür ama yazılmazsa tarayıcı `100vw`
 * varsayar ve masaüstünde 40px'lik satır önizlemesi için 2048px'lik
 * basamağı indirir. Kayıp sessizdir; `sizes="40px"` onu keser.
 */
export function panelRegions(density = 3, detailOpen = false) {
  const container = "media_col";
  return Object.freeze({
    /** `.mgrid` — yoğunluk seçicisine bağlı sütunlu ızgara. */
    libraryGrid: {
      key: "panel/library_grid",
      box: [
        {
          min_vw: 0,
          grid: {
            container,
            cols: gridColumnsAt(density, 0),
            gap: GRID_GAP_PX,
          },
        },
        {
          min_vw: DETAIL_DOCKED_BREAKPOINT,
          grid: {
            container,
            cols: gridColumnsAt(density, DETAIL_DOCKED_BREAKPOINT),
            gap: GRID_GAP_PX,
          },
        },
      ],
      detailOpen,
    },
    /** `.mrow__thumb` — liste satırı küçük resmi. */
    rowThumb: { key: "panel/row_thumb", box: [{ min_vw: 0, px: ROW_THUMB_PX }] },
    /** `.mcell__thumb` — tablo hücresi küçük resmi. */
    cellThumb: { key: "panel/cell_thumb", box: [{ min_vw: 0, px: CELL_THUMB_PX }] },
    /** `.mkanban__thumb` — kanban kartı küçük resmi. */
    kanbanThumb: { key: "panel/kanban_thumb", box: [{ min_vw: 0, px: CELL_THUMB_PX }] },
    /** `.detail__preview` — detay panelindeki büyük önizleme (sheet modu). */
    detailPreview: {
      key: "panel/detail_preview",
      box: [{ min_vw: 0, vw_pct: 100, container: "detail_sheet" }],
    },
  });
}

/**
 * Bir panel bölgesinin `sizes` dizgesi.
 *
 * @param {string} regionName `panelRegions()` anahtarlarından biri.
 * @param {{density?: number, detailOpen?: boolean}} [state] Canlı arayüz
 *   durumu — sütun sayısı ve detay panelinin açıklığı `sizes`'ı GERÇEKTEN
 *   değiştirir, sabit bir dizge ikisini de yalanlar.
 * @returns {string} `sizes` özniteliği; bilinmeyen bölgede boş dizge.
 */
export function panelSizes(regionName, state = {}) {
  const density = state.density ?? 3;
  const detailOpen = state.detailOpen ?? false;
  const region = panelRegions(density, detailOpen)[regionName];
  if (!region) return "";
  const containers = panelContainers(detailOpen);
  return sizesAttribute(region, { containers, flatten: makeFlatten(containers) });
}
