// ÜRETİLMİŞ DOSYA — elle düzenleme. Kaynak: vendor/crop_geometry.ts (tipleri silinmiş hâli).
// Yeniden üret: npm run sync:crop · Doğrula: npm run parity:crop
const EPS = 1e-9;
const PARITY_TOLERANCE_PX = 0.5;
const ZOOM_MIN = 1;
const ZOOM_MAX = 16;
const MIN_EDGE_PX = 1;
const FIT_INSIDE = "inside";
const FIT_OUTSIDE = "outside";
const FIT_MODES = [FIT_INSIDE, FIT_OUTSIDE];
class CropGeometryError extends Error {
  constructor(message) {
    super(message);
    this.name = "CropGeometryError";
  }
}
function clamp(value, low, high) {
  if (high < low) {
    return low;
  }
  if (value < low) {
    return low;
  }
  if (value > high) {
    return high;
  }
  return value;
}
function roundHalfUp(value) {
  return Math.floor(value + 0.5);
}
function requireFinite(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new CropGeometryError(`${name} sonlu bir say\u0131 olmal\u0131: ${String(value)}`);
  }
  return value;
}
function requirePositive(value, name) {
  const out = requireFinite(value, name);
  if (out <= 0) {
    throw new CropGeometryError(`${name} pozitif olmal\u0131: ${String(out)}`);
  }
  return out;
}
function rect(x, y, w, h) {
  requireFinite(x, "Rect.x");
  requireFinite(y, "Rect.y");
  requireFinite(w, "Rect.w");
  requireFinite(h, "Rect.h");
  if (w <= 0 || h <= 0) {
    throw new CropGeometryError(`Dikd\xF6rtgenin eni ve boyu pozitif olmal\u0131: w=${w} h=${h}`);
  }
  return { x, y, w, h };
}
function rectRight(r) {
  return r.x + r.w;
}
function rectBottom(r) {
  return r.y + r.h;
}
function rectCenterX(r) {
  return r.x + r.w / 2;
}
function rectCenterY(r) {
  return r.y + r.h / 2;
}
function rectRatio(r) {
  return r.w / r.h;
}
function ratioFit(w, h, targetAR, mode = FIT_INSIDE) {
  const bw = requirePositive(w, "w");
  const bh = requirePositive(h, "h");
  if (targetAR === null || targetAR === void 0) {
    return [bw, bh];
  }
  const ar = requirePositive(targetAR, "target_ar");
  if (mode !== FIT_INSIDE && mode !== FIT_OUTSIDE) {
    throw new CropGeometryError(`Bilinmeyen fit kipi: ${String(mode)} (beklenen: inside, outside)`);
  }
  let outW;
  let outH;
  if (mode === FIT_INSIDE) {
    if (bw / bh > ar) {
      outH = bh;
      outW = outH * ar;
    } else {
      outW = bw;
      outH = outW / ar;
    }
    if (outW > bw) {
      outW = bw;
    }
    if (outH > bh) {
      outH = bh;
    }
    return [outW, outH];
  }
  if (bw / bh > ar) {
    outW = bw;
    outH = outW / ar;
  } else {
    outH = bh;
    outW = outH * ar;
  }
  if (outW < bw) {
    outW = bw;
  }
  if (outH < bh) {
    outH = bh;
  }
  return [outW, outH];
}
function clampWindow(win, bounds, keepRatio = false) {
  let w = win.w;
  let h = win.h;
  if (keepRatio) {
    let scale = 1;
    if (w > bounds.w) {
      scale = bounds.w / w;
    }
    if (h > bounds.h) {
      const other = bounds.h / h;
      if (other < scale) {
        scale = other;
      }
    }
    if (scale < 1) {
      w = w * scale;
      h = h * scale;
      if (w > bounds.w) {
        w = bounds.w;
      }
      if (h > bounds.h) {
        h = bounds.h;
      }
    }
  } else {
    if (w > bounds.w) {
      w = bounds.w;
    }
    if (h > bounds.h) {
      h = bounds.h;
    }
  }
  const x = clamp(win.x, bounds.x, bounds.x + bounds.w - w);
  const y = clamp(win.y, bounds.y, bounds.y + bounds.h - h);
  return rect(x, y, w, h);
}
function zoomBase(sourceW, sourceH, zoom, centerX, centerY) {
  const sw = requirePositive(sourceW, "source_w");
  const sh = requirePositive(sourceH, "source_h");
  const z = clamp(requireFinite(zoom, "zoom"), ZOOM_MIN, ZOOM_MAX);
  let bw = sw / z;
  let bh = sh / z;
  const minW = sw > MIN_EDGE_PX ? MIN_EDGE_PX : sw;
  const minH = sh > MIN_EDGE_PX ? MIN_EDGE_PX : sh;
  if (bw < minW) {
    bw = minW;
  }
  if (bh < minH) {
    bh = minH;
  }
  if (bw > sw) {
    bw = sw;
  }
  if (bh > sh) {
    bh = sh;
  }
  const cx = clamp(requireFinite(centerX, "center_x"), 0, 1) * sw;
  const cy = clamp(requireFinite(centerY, "center_y"), 0, 1) * sh;
  const x = clamp(cx - bw / 2, 0, sw - bw);
  const y = clamp(cy - bh / 2, 0, sh - bh);
  return rect(x, y, bw, bh);
}
function zoomFromBase(sourceW, sourceH, base) {
  const sw = requirePositive(sourceW, "source_w");
  requirePositive(sourceH, "source_h");
  return clamp(sw / base.w, ZOOM_MIN, ZOOM_MAX);
}
function cropWindow(sourceW, sourceH, base, targetAR, focalX, focalY) {
  const sw = requirePositive(sourceW, "source_w");
  const sh = requirePositive(sourceH, "source_h");
  const region = clampWindow(base, rect(0, 0, sw, sh));
  if (targetAR === null || targetAR === void 0) {
    return region;
  }
  const ar = requirePositive(targetAR, "target_ar");
  const fitted = ratioFit(region.w, region.h, ar, FIT_INSIDE);
  const w = fitted[0];
  const h = fitted[1];
  const fx = clamp(requireFinite(focalX, "focal_x"), 0, 1) * sw;
  const fy = clamp(requireFinite(focalY, "focal_y"), 0, 1) * sh;
  const x = clamp(fx - w / 2, region.x, region.x + region.w - w);
  const y = clamp(fy - h / 2, region.y, region.y + region.h - h);
  return rect(x, y, w, h);
}
function focalFromWindow(win, sourceW, sourceH) {
  const sw = requirePositive(sourceW, "source_w");
  const sh = requirePositive(sourceH, "source_h");
  return {
    x: clamp(rectCenterX(win) / sw, 0, 1),
    y: clamp(rectCenterY(win) / sh, 0, 1)
  };
}
function roundWindow(win, sourceW = null, sourceH = null) {
  let left = roundHalfUp(win.x);
  let top = roundHalfUp(win.y);
  let w = roundHalfUp(win.w);
  let h = roundHalfUp(win.h);
  if (w < 1) {
    w = 1;
  }
  if (h < 1) {
    h = 1;
  }
  if (sourceW !== null && sourceW !== void 0 && sourceH !== null && sourceH !== void 0) {
    const sw = roundHalfUp(requirePositive(sourceW, "source_w"));
    const sh = roundHalfUp(requirePositive(sourceH, "source_h"));
    if (w > sw) {
      w = sw;
    }
    if (h > sh) {
      h = sh;
    }
    if (left > sw - w) {
      left = sw - w;
    }
    if (top > sh - h) {
      top = sh - h;
    }
  }
  if (left < 0) {
    left = 0;
  }
  if (top < 0) {
    top = 0;
  }
  return [left, top, w, h];
}
export {
  CropGeometryError,
  EPS,
  FIT_INSIDE,
  FIT_MODES,
  FIT_OUTSIDE,
  MIN_EDGE_PX,
  PARITY_TOLERANCE_PX,
  ZOOM_MAX,
  ZOOM_MIN,
  clamp,
  clampWindow,
  cropWindow,
  focalFromWindow,
  ratioFit,
  rect,
  rectBottom,
  rectCenterX,
  rectCenterY,
  rectRatio,
  rectRight,
  roundWindow,
  zoomBase,
  zoomFromBase
};
