// Yazdırılabilir etiket ve irsaliye belgeleri — FE fazı.
//
// NEDEN GERÇEK BELGE ÜRETİLİYOR:
//   `#etiket-01` gibi yer tutucu bir bağlantı, "Yazdır" düğmesinin çalışıp
//   çalışmadığını gizler. Operatör basar, hiçbir şey açılmaz ve akış orada
//   kopar (FE mock disiplini §2.3).
//
//   Burada üretilen HTML yeni sekmede açılıyor ve `Ctrl+P` gerçekten çalışıyor;
//   sayfa boyutu `@page` ile formata göre ayarlanıyor. 13-BE geldiğinde yerini
//   sunucu tarafı PDF alacak, ekranlar değişmeyecek — ikisi de bir URL veriyor.

// `@/` alias node:test tarafından çözülmüyor; mock akışı testten
// koşturulabilsin diye relative (api/shipmentEnvelope.js deseni).
import { barcodeSvg } from "../../../utils/barcode.js";

/** Format → yazdırma sayfası ölçüsü. */
const PAGE = {
  a4_single: { size: "A4", labelW: "180mm", labelH: "120mm", perPage: 1 },
  a4_quad: { size: "A4", labelW: "95mm", labelH: "130mm", perPage: 4 },
  thermal_100x150: { size: "100mm 150mm", labelW: "96mm", labelH: "146mm", perPage: 1 },
  zpl: { size: "100mm 150mm", labelW: "96mm", labelH: "146mm", perPage: 1 },
};

const esc = (s) =>
  String(s ?? "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]);

/**
 * Tek koli etiketi (HTML parçası).
 *
 * İçerik gerçek sevkiyat verisinden geliyor: alıcı, koli sırası, ağırlık,
 * desi, taşıyıcı. Etiketin okunabilirliği ancak gerçek uzunluktaki adlarla
 * değerlendirilebiliyor.
 */
function labelBlock(pkg, shipment, format) {
  const page = PAGE[format] ?? PAGE.thermal_100x150;
  return `
<div class="label" style="width:${page.labelW};height:${page.labelH}">
  <div class="lh">
    <div>
      <div class="brand">İSTOÇ B2B</div>
      <div class="mono sm">${esc(shipment.shipment)}</div>
    </div>
    <div class="seq">${pkg.sequence}/${shipment.packages.length}</div>
  </div>

  <div class="row">
    <div class="col">
      <div class="lbl">ALICI</div>
      <div class="strong">${esc(shipment.buyer_name)}</div>
      <div class="sm">İkitelli OSB, Başakşehir<br/>İstanbul / 34490</div>
    </div>
    <div class="col right">
      <div class="lbl">TAŞIYICI</div>
      <div class="strong">${esc(shipment.carrier ?? "—")}</div>
      <div class="sm">${esc(pkg.package_type ?? "")}</div>
    </div>
  </div>

  <div class="metrics">
    <span><b>${pkg.weight_kg}</b> kg</span>
    <span>desi <b>${pkg.desi}</b></span>
    <span>ücret <b>${pkg.chargeable_kg}</b> kg</span>
  </div>

  <div class="barcode">${barcodeSvg(pkg.barcode || pkg.package_code, { width: 300, height: 64 })}</div>

  ${pkg.label?.carrier_tracking ? `<div class="track mono">TAKİP: ${esc(pkg.label.carrier_tracking)}</div>` : ""}
  ${format === "zpl" ? `<div class="note">ZPL çıktısı — gerçek yazıcıda ham komut olarak gider</div>` : ""}
</div>`;
}

const STYLE = (format) => {
  const page = PAGE[format] ?? PAGE.thermal_100x150;
  return `
@page { size: ${page.size}; margin: 4mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "DM Sans", -apple-system, Segoe UI, Roboto, sans-serif; color: #111; background: #f4f3f0; }
.sheet { display: flex; flex-wrap: wrap; gap: 4mm; padding: 4mm; }
.label { background: #fff; border: 1px solid #111; padding: 4mm; display: flex; flex-direction: column; gap: 3mm; page-break-inside: avoid; }
.lh { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #111; padding-bottom: 2mm; }
.brand { font-weight: 800; font-size: 13px; letter-spacing: .5px; }
.seq { font-size: 26px; font-weight: 800; line-height: 1; }
.row { display: flex; gap: 4mm; }
.col { flex: 1; min-width: 0; }
.col.right { text-align: right; }
.lbl { font-size: 8px; font-weight: 700; letter-spacing: .8px; color: #555; }
.strong { font-size: 12px; font-weight: 700; }
.sm { font-size: 9.5px; line-height: 1.35; }
.mono { font-family: ui-monospace, Menlo, monospace; }
.metrics { display: flex; justify-content: space-between; border-top: 1px dashed #999; border-bottom: 1px dashed #999; padding: 1.5mm 0; font-size: 10px; }
.barcode { text-align: center; margin-top: auto; }
.barcode svg { max-width: 100%; height: auto; }
.track { font-size: 9px; text-align: center; letter-spacing: .5px; }
.note { font-size: 8px; color: #777; text-align: center; }
.toolbar { position: sticky; top: 0; background: #1d1c19; color: #fff; padding: 8px 14px; display: flex; gap: 10px; align-items: center; font-size: 13px; }
.toolbar button { font: inherit; font-weight: 600; padding: 5px 12px; border-radius: 7px; border: 0; background: #f5b800; color: #1a1a1a; cursor: pointer; }
.toolbar .hint { opacity: .7; font-size: 12px; }
@media print { .toolbar { display: none; } body { background: #fff; } .sheet { padding: 0; gap: 0; } }
`;
};

function docShell(title, style, body) {
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"/><title>${esc(title)}</title><style>${style}</style></head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Yazdır</button>
    <span class="hint">FE fazı önizlemesi — gerçek PDF 13-BE'de üretilecek</span>
  </div>
  ${body}
</body></html>`;
}

/**
 * Blob URL üretir. Çağıran `window.open` ile açar.
 *
 * `revokeObjectURL` bilinçli olarak çağrılmıyor: sekme kapanınca tarayıcı
 * zaten serbest bırakıyor, erken iptal etmek açılan sekmeyi boş bırakır.
 */
function toBlobUrl(html) {
  return URL.createObjectURL(new Blob([html], { type: "text/html" }));
}

/** Seçili kolilerin etiket sayfası. */
export function buildLabelDocument(shipment, packages, format = "thermal_100x150") {
  const body = `<div class="sheet">${packages.map((p) => labelBlock(p, shipment, format)).join("")}</div>`;
  return toBlobUrl(docShell(`Etiket · ${shipment.shipment}`, STYLE(format), body));
}

/**
 * İrsaliye (paket listesi) — etiketten AYRI belge.
 *
 * Etiket kargo firması için, irsaliye kutunun içine giriyor: hangi koliden
 * ne çıkacağının dökümü.
 */
export function buildPackingSlipDocument(shipment, packages) {
  const rows = packages
    .map((pkg) => {
      const lines = (pkg.contents ?? [])
        .map((c) => {
          const item = shipment.items.find((i) => i.row_id === c.shipment_item);
          return `<tr>
            <td>${esc(item?.item_name ?? c.shipment_item)}</td>
            <td class="sm">${esc(item?.variation ?? "")}</td>
            <td class="num">${c.qty} ${esc(item?.uom ?? "")}</td>
          </tr>`;
        })
        .join("");
      return `
<section class="pkg">
  <h2>Koli ${pkg.sequence}/${packages.length} <span class="mono sm">${esc(pkg.package_code ?? "")}</span></h2>
  <div class="meta">${pkg.length_cm}×${pkg.width_cm}×${pkg.height_cm} cm · ${pkg.weight_kg} kg · desi ${pkg.desi}</div>
  <table>
    <thead><tr><th>Ürün</th><th>Varyasyon</th><th class="num">Miktar</th></tr></thead>
    <tbody>${lines || `<tr><td colspan="3" class="sm">İçerik atanmamış</td></tr>`}</tbody>
  </table>
</section>`;
    })
    .join("");

  const style = `
@page { size: A4; margin: 14mm; }
body { margin: 0; font-family: "DM Sans", -apple-system, Segoe UI, Roboto, sans-serif; color: #111; background: #f4f3f0; }
.doc { background: #fff; padding: 14mm; max-width: 210mm; margin: 6mm auto; }
h1 { font-size: 19px; margin: 0 0 2px; }
.head-meta { font-size: 12px; color: #555; margin-bottom: 14px; }
.pkg { margin-bottom: 16px; page-break-inside: avoid; }
.pkg h2 { font-size: 13px; margin: 0 0 2px; border-bottom: 1px solid #111; padding-bottom: 3px; }
.meta { font-size: 10.5px; color: #555; margin-bottom: 6px; }
table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
th { text-align: left; font-size: 9px; letter-spacing: .6px; text-transform: uppercase; color: #666; border-bottom: 1px solid #ccc; padding: 4px 0; }
td { padding: 4px 0; border-bottom: 1px solid #eee; }
.num { text-align: right; font-variant-numeric: tabular-nums; }
.sm { font-size: 10px; color: #666; }
.mono { font-family: ui-monospace, Menlo, monospace; font-weight: 400; }
.toolbar { position: sticky; top: 0; background: #1d1c19; color: #fff; padding: 8px 14px; display: flex; gap: 10px; align-items: center; font-size: 13px; }
.toolbar button { font: inherit; font-weight: 600; padding: 5px 12px; border-radius: 7px; border: 0; background: #f5b800; color: #1a1a1a; cursor: pointer; }
.toolbar .hint { opacity: .7; font-size: 12px; }
@media print { .toolbar { display: none; } body { background: #fff; } .doc { margin: 0; padding: 0; } }
`;

  const body = `<div class="doc">
    <h1>Paket listesi</h1>
    <div class="head-meta">
      ${esc(shipment.shipment)} · ${esc(shipment.buyer_name)} · Sipariş ${esc(shipment.order)}<br/>
      ${packages.length} koli · toplam ${packages.reduce((s, p) => s + Number(p.weight_kg || 0), 0).toFixed(1)} kg
    </div>
    ${rows}
  </div>`;

  return toBlobUrl(docShell(`Paket listesi · ${shipment.shipment}`, style, body));
}
