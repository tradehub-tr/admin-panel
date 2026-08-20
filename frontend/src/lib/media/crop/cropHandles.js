import {
  clamp,
  clampWindow,
  FIT_INSIDE,
  FIT_OUTSIDE,
  MIN_EDGE_PX,
  ratioFit,
  rect,
  rectBottom,
  rectRight,
} from "./geometry.js";

/**
 * Jest → geometri eşlemesi. **Saf**: DOM yok, ref yok, kaynak pikseli girer,
 * kaynak pikseli çıkar.
 *
 * ### Neden burada da matematik yok
 *
 * Bu dosya tek bir şey yapar: tutamağın hangi kenarı taşıdığını ve hangi
 * köşenin sabit kaldığını bilir. Boyut kararlarının tamamı
 * `ratioFit`/`clampWindow`/`cropWindow`'a devredilir — yani
 * `crop_geometry.ts`'e, yani `crop_geometry.py`'nin ikizine.
 *
 * `faz10-crop-studio.md §3`: *"Tutamak mantığında ayrıca sınır kontrolü
 * YAZILMAZ — iki yerde sınır kontrolü, ikisinin ayrışması demektir."* Her
 * jest tam olarak bir kez `clampWindow`'dan geçer; bu dosyada `if (x < 0)`
 * biçiminde bir sınır kontrolü YOKTUR.
 */

/** 8 tutamak — saat yönünde, sol üstten. Sıra Tab sırasıdır. */
export const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

/** Tutamak → hangi kenarlar hareket eder. */
const EDGES = {
  nw: { left: true, top: true },
  n: { top: true },
  ne: { right: true, top: true },
  e: { right: true },
  se: { right: true, bottom: true },
  s: { bottom: true },
  sw: { left: true, bottom: true },
  w: { left: true },
};

export const isCorner = (handle) => {
  const e = EDGES[handle];
  return Boolean(e && (e.left || e.right) && (e.top || e.bottom));
};

/**
 * Verilen genişlik için oran kilidinin dayattığı yükseklik.
 *
 * `ratioFit`'e KARE bir kutu verilir; `inside`/`outside` seçimi oranın 1'in
 * hangi tarafında olduğuna göre yapılır ki sonuç daima `[w, w / ar]` olsun.
 * Bölmeyi burada elle yazmıyoruz — aynı ifadenin ikinci bir kopyası, bir gün
 * yalnız birinin düzeltilmesi demek.
 */
export function heightForWidth(w, targetAR) {
  return ratioFit(w, w, targetAR, targetAR >= 1 ? FIT_INSIDE : FIT_OUTSIDE)[1];
}

/** Verilen yükseklik için oran kilidinin dayattığı genişlik. */
export function widthForHeight(h, targetAR) {
  return ratioFit(h, h, targetAR, targetAR >= 1 ? FIT_OUTSIDE : FIT_INSIDE)[0];
}

/**
 * Gövde sürüklemesi: pencere kayar, boyutu değişmez.
 *
 * @param {{win:object, base:object, dx:number, dy:number}} p Kaynak pikseli.
 */
export function moveWindow({ win, base, dx, dy }) {
  return clampWindow(rect(win.x + dx, win.y + dy, win.w, win.h), base);
}

/**
 * Tutamak çekmesi.
 *
 * @param {object}      p
 * @param {object}      p.win       Mevcut pencere (kaynak pikseli).
 * @param {object}      p.base      Taban bölge — sınır burası, kaynağın tamamı değil.
 * @param {string}      p.handle    `HANDLES` üyesi.
 * @param {number}      p.dx        Yatay ötelemenin kaynak pikseli karşılığı.
 * @param {number}      p.dy        Dikey öteleme.
 * @param {number|null} p.targetAR  Oran kilidi; `null` serbest.
 * @returns {object} Yeni pencere. Taban bölgenin dışına ASLA taşmaz.
 */
export function resizeWindow({ win, base, handle, dx, dy, targetAR = null }) {
  const edge = EDGES[handle];
  if (!edge) return win;

  const right = rectRight(win);
  const bottom = rectBottom(win);

  // 1. Ham kenarlar. Kenar en fazla taban bölge kadar açılır, en az MIN_EDGE_PX.
  let x = win.x;
  let y = win.y;
  let w = win.w;
  let h = win.h;

  if (edge.left) {
    const nx = clamp(win.x + dx, right - base.w, right - MIN_EDGE_PX);
    w = right - nx;
    x = nx;
  } else if (edge.right) {
    w = clamp(win.w + dx, MIN_EDGE_PX, base.w);
  }

  if (edge.top) {
    const ny = clamp(win.y + dy, bottom - base.h, bottom - MIN_EDGE_PX);
    h = bottom - ny;
    y = ny;
  } else if (edge.bottom) {
    h = clamp(win.h + dy, MIN_EDGE_PX, base.h);
  }

  // 2. Oran kilidi. Köşede ham dikdörtgene `inside` oturtulur (kullanıcının
  //    çizdiği kutunun İÇİNE sığan en büyük doğru oranlı kutu); kenarda
  //    sürüklenen eksen belirleyicidir, diğeri ondan türer.
  if (targetAR !== null && targetAR !== undefined) {
    if (isCorner(handle)) {
      const fitted = ratioFit(w, h, targetAR, FIT_INSIDE);
      w = fitted[0];
      h = fitted[1];
    } else if (edge.left || edge.right) {
      h = heightForWidth(w, targetAR);
    } else {
      w = widthForHeight(h, targetAR);
    }

    // 2b. Oran kilidi TÜREYEN kenarı 1 px'in altına düşürebilir: 1 px genişlik
    //     × 1,776 oran → 0,563 px yükseklik, ve `rect()` bunu kabul etse bile
    //     `roundWindow` 1 px'e yuvarlayıp oranı bozardı. Taban, oranı BOZMADAN
    //     kurulabilen en küçük kutudur; ikisi de aynı primitiflerden gelir.
    const minW = Math.max(MIN_EDGE_PX, widthForHeight(MIN_EDGE_PX, targetAR));
    if (w < minW) {
      w = minW;
      h = heightForWidth(w, targetAR);
    }
  }

  // 3. Sabit köşeyi geri yerleştir. Kilit boyu küçültmüş olabilir; hareket
  //    ETMEYEN kenar yerinde kalmalı, aksi hâlde kadraj tutamağın altından kaçar.
  if (edge.left) x = right - w;
  else if (!edge.right) x = win.x + (win.w - w) / 2; // kenar tutamağı: karşı eksende merkez korunur

  if (edge.top) y = bottom - h;
  else if (!edge.bottom) y = win.y + (win.h - h) / 2;

  // 4. TEK sınır kapısı. `keepRatio` kilit açıkken zorunlu — aksi hâlde
  //    kenarlar bağımsız kırpılır ve 1:1 kilitli kullanıcı 1,03:1 kadraj alır.
  return clampWindow(rect(x, y, w, h), base, targetAR !== null && targetAR !== undefined);
}

/** Ok tuşu → kaynak pikseli cinsinden öteleme. `Shift` 10 px. */
export const NUDGE_PX = 1;
export const NUDGE_PX_FAST = 10;

const ARROWS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/**
 * @returns {{dx:number,dy:number}|null} Ok tuşu değilse `null`.
 */
export function arrowDelta(key, fast = false) {
  const dir = ARROWS[key];
  if (!dir) return null;
  const step = fast ? NUDGE_PX_FAST : NUDGE_PX;
  return { dx: dir[0] * step, dy: dir[1] * step };
}

/**
 * Kilit AÇIKKEN çizilmiş serbest bir pencere kilitlenirse ne olur.
 *
 * Pencere sıçramamalı: merkez korunarak `ratioFit` uygulanır, sonra tek
 * sınır kapısından geçirilir.
 */
export function applyRatioKeepingCenter(win, base, targetAR) {
  if (targetAR === null || targetAR === undefined) return win;
  const fitted = ratioFit(win.w, win.h, targetAR, FIT_INSIDE);
  const w = fitted[0];
  const h = fitted[1];
  return clampWindow(rect(win.x + (win.w - w) / 2, win.y + (win.h - h) / 2, w, h), base, true);
}
