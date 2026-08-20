"""Parite vektörlerini `srcset.py`'nin KENDİSİNİ koşturarak üretir.

Neden bu dosya var
------------------
`tradehub_core/media/pipeline/simulator/srcset.py` Python'dur ve TypeScript
ikizi YOKTUR (`crop_geometry.ts`'in aksine). Panel o hesabı JavaScript'te
yeniden yazmak zorunda; yeniden yazılan her hesap sessizce ayrışır. Bu script
ayrışmayı ÖLÇÜLEBİLİR yapar: referans uygulamanın çıktısını dosyaya döker,
panelin testi kendi kapısından koşup birebir karşılaştırır.

Çıktı `src/lib/media/simulator/vendor/parity_vectors.json`. ELLE DÜZENLENMEZ.
Yeniden üret:  npm run sync:simulator

Kullanım:
    python3 scripts/gen_simulator_vectors.py <tradehub_core_repo_kökü> <çıktı.json>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

#: Kaynak görselin varsayılan genişliği. `docs`taki ölçüm bu değerle alındı
#: (kaynak_yetersiz=0 @2160px); parite karşılaştırması aynı varsayımla yapılır.
SOURCE_WIDTH = 2160

#: Simülasyonun slotu. `placements.json`'daki 15 bölgenin tamamı bu slotu
#: kullanıyor; sabit burada değil, aşağıda bölgeden okunuyor — bu yalnız
#: poster vekili için gereken ikinci slot.
VIDEO_SLOT = "company.cover_video"

#: Video posterinin gösterileceği bölge ÖLÇÜLMEDİ: `placements.json`'da video
#: bölgesi yok. Ürün detay ana görseli VEKİL olarak kullanılıyor — poster orada
#: `<video poster>` olarak basılacağı için kutu genişliği aynı.
POSTER_PROXY = ("product_detail", "main_image")


def main(argv: list[str]) -> int:
	if len(argv) != 3:
		print(__doc__)
		return 2
	core_root, out_path = Path(argv[1]), Path(argv[2])
	sys.path.insert(0, str(core_root))

	from tradehub_core.media.pipeline.simulator import srcset as S

	devices = S.load_devices()
	layout = S.load_layout()
	all_regions = layout.all_regions()
	primary = layout.primary_regions()
	primary_keys = [r.key for r in primary]

	ladders: dict[str, list[dict]] = {}
	for r in all_regions:
		if r.slot_key in ladders:
			continue
		ladders[r.slot_key] = [
			{
				"name": x.name,
				"width": x.width,
				"maxOvershoot": x.max_overshoot,
				"clampedFrom": x.clamped_from,
			}
			for x in S.renditions_for(r.slot_key, source_width=SOURCE_WIDTH)
		]

	def vector(sel: S.Selection) -> dict:
		d = sel.to_dict()
		# `to_dict` kutuyu 2, fazlalığı 3 haneye yuvarlıyor; parite tam çift
		# duyarlıkta ölçülmeli, yoksa yuvarlama artığı gerçek sapmayı saklar.
		d["css_box_px"] = sel.css_box_px
		d["overshoot"] = sel.overshoot
		d["key"] = f"{sel.device.id}×{sel.region.key}"
		return d

	vectors = [vector(s) for s in S.simulate_matrix(devices, all_regions, layout, source_width=SOURCE_WIDTH)]

	# ── Video posteri: TEK basamaklı merdiven, srcset yok ────────────
	poster_ladder = S.renditions_for(VIDEO_SLOT, source_width=SOURCE_WIDTH)
	poster_only = tuple(x for x in poster_ladder if x.name.startswith("poster"))
	proxy_region = layout.region_of(*POSTER_PROXY)
	poster_vectors = [
		vector(S.simulate(dev, proxy_region, layout, poster_only)) for dev in devices
	]

	doc = {
		"schema_version": "1.0.0",
		# Kaynak numarası: T-110 (cihaz VE yerleşim kataloğu, tek görev) … T-115.
		"gorev": "T-110…T-115",
		"aciklama": (
			"ÜRETİLMİŞ DOSYA — elle düzenleme. "
			"tradehub_core/media/pipeline/simulator/srcset.py koşturularak üretildi. "
			"Yeniden üret: npm run sync:simulator"
		),
		"uretici": "admin-panel/frontend/scripts/gen_simulator_vectors.py",
		"source_width": SOURCE_WIDTH,
		"tolerance_px": 0.0,
		"device_ids": [d.id for d in devices],
		"region_keys": [r.key for r in all_regions],
		"primary_region_keys": primary_keys,
		"ladders": ladders,
		"sizes": {r.key: S.sizes_attribute(r, layout) for r in all_regions},
		"srcset": {
			slot: S.srcset_attribute(S.renditions_for(slot, source_width=SOURCE_WIDTH))
			for slot in ladders
		},
		"poster": {
			"slot_key": VIDEO_SLOT,
			"proxy_region": f"{POSTER_PROXY[0]}/{POSTER_PROXY[1]}",
			"proxy_note": (
				"ÖLÇÜLMEDİ: placements.json'da video bölgesi yok. "
				"Poster ürün detay ana görsel kutusunda basılacağı varsayıldı."
			),
			"ladder": [{"name": x.name, "width": x.width} for x in poster_only],
			"vectors": poster_vectors,
		},
		"summary": {
			"primary": S.summarize([s for s in S.simulate_matrix(devices, primary, layout, source_width=SOURCE_WIDTH)]),
			"all": S.summarize(S.simulate_matrix(devices, all_regions, layout, source_width=SOURCE_WIDTH)),
		},
		"vectors": vectors,
	}

	out_path.write_text(json.dumps(doc, indent="\t", ensure_ascii=False) + "\n", encoding="utf-8")
	print(f"[gen_simulator_vectors] {len(vectors)} vektör + {len(poster_vectors)} poster → {out_path}")
	return 0


if __name__ == "__main__":
	raise SystemExit(main(sys.argv))
