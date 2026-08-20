#!/usr/bin/env python3
"""UI ↔ sunucu **piksel** paritesi — 2. adım: sunucunun keseceği kutuyu üret.

1. adım (`gen-crop-pixel-cases.mjs`) panelin GERÇEK `useCropStudio`'sunu
koşturup üç şeyi kaydetti: jest dizisi, sunucuya gidecek yük (`savePayload`) ve
kullanıcının gördüğü kutu (`pixelBox`). Bu script o yükü `core/crop.py`'nin
öncelik zincirine verir ve sunucunun ÜRETECEĞİ piksel kutusunu yazar.
3. adım `__tests__/cropPixelParity.test.js` ikisini karşılaştırır.

NEDEN `crop_geometry.py` DEĞİL `crop.py`
---------------------------------------
`crop_geometry` paritesi (592 vektör, 0 px) iki dilin aynı FONKSİYONU aynı
yazdığını gösterir. Kullanıcının gördüğü kutuyu sunucu o fonksiyonla değil,
`core/crop.py`'nin 5 seviyeli zinciriyle (override → güvenli alan+odak → odak →
smartcrop → merkez) yeniden kurar; üstelik yuvarlaması BAŞKA bir uzayda ve
başka bir ifadeyle yapılır:

    panel   roundWindow : kaynak pikselinde  floor(v + 0.5)   (yarım YUKARI)
    sunucu  to_pixels   : normalize uzayda   int(round(v))    (yarım ÇİFTE)

Bu iki ifade tam yarım noktasında farklı sayı verir. Vektörler bunu ölçer.

`tradehub_core`'a DOKUNULMAZ
----------------------------
Script o depodan yalnız OKUR: `core/crop.py` dosyayı yolundan yükler (paket
kurulumu, frappe, bench gerekmez — modül saf Python'dur). Kaynağın sha256'sı
çıktıya yazılır; test onu canlı kaynakla karşılaştırır, tutmuyorsa "geçti"
demez, yeniden üretim ister.

Kullanım:
    node scripts/gen-crop-pixel-cases.mjs      # 1. adım (önce bu)
    python3 scripts/gen_crop_pixel_vectors.py  # 2. adım
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import platform
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
FRONTEND = os.path.dirname(HERE)
VENDOR = os.path.join(FRONTEND, "src", "lib", "media", "crop", "vendor")
CASES = os.path.join(VENDOR, "crop_pixel_cases.json")
OUT = os.path.join(VENDOR, "crop_pixel_vectors.json")

CORE = os.path.abspath(
    os.path.join(FRONTEND, "..", "..", "tradehub_core", "tradehub_core")
)
CROP_PY = os.path.join(CORE, "media", "pipeline", "core", "crop.py")
CROP_REL = "tradehub_core/tradehub_core/media/pipeline/core/crop.py"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def payload_to_intent(payload: dict) -> dict:
    """`savePayload` yükünü, ucun DEPOLADIĞI niyet biçimine çevir.

    Uç `safe_area` kutusunu `safe_x/safe_y/safe_w/safe_h` kolonlarına açar
    (`pipeline/api/crop.py::_parse_safe_area` → `api/media_crop.py::
    _FrappeCropIntents.save`); `resolve_crop` ise yalnız o kolon adlarını okur
    (`core/crop.py::safe_region_of`). Yükü çevirmeden vermek, sunucunun HİÇ
    görmeyeceği bir dünyayı ölçmekti: `safe_area` anahtarı zincirde okunmaz,
    taban bölge kaybolur ve B sınıfı "sapıyor" görünürdü — sapmanın bir kısmı
    üretimdeki kayıp (zoom alanı yoktu), bir kısmı bu çevirinin yokluğuydu.
    Artık ikisi de kapalı: alanlar (zoom/center_x/center_y dahil) uçtaki
    yazımla birebir taşınır.

    Boş `safe_area` ({}) "alanı SİL" demektir → kolonlar yazılmaz.
    """
    intent = {k: v for k, v in payload.items() if k != "safe_area"}
    kutu = payload.get("safe_area")
    if isinstance(kutu, dict) and kutu:
        intent["safe_x"] = kutu["x"]
        intent["safe_y"] = kutu["y"]
        intent["safe_w"] = kutu["w"]
        intent["safe_h"] = kutu["h"]
    return intent


def load_crop_core():
    """`core/crop.py`'yi paket kurulumu olmadan yükle.

    `spec_from_file_location` + `sys.modules` kaydı: kayıt olmadan
    `dataclasses` sınıfın modülünü çözemez ve `Rect` tanımında düşer.
    """
    spec = importlib.util.spec_from_file_location("th_crop_core", CROP_PY)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["th_crop_core"] = mod
    spec.loader.exec_module(mod)
    return mod


def main() -> int:
    if not os.path.exists(CROP_PY):
        print(f"[gen_crop_pixel_vectors] kaynak yok: {CROP_PY}", file=sys.stderr)
        print("[gen_crop_pixel_vectors] ÖLÇÜLMEDİ — vektör dosyası ELLENMEDİ.", file=sys.stderr)
        return 1

    with open(CASES, "rb") as fh:
        cases_raw = fh.read()
    cases_doc = json.loads(cases_raw.decode("utf8"))

    with open(CROP_PY, "rb") as fh:
        crop_raw = fh.read()

    crop = load_crop_core()

    vectors = []
    for case in cases_doc["cases"]:
        src = case["source"]
        prof = case["profile"]
        asset = {"width": src["width"], "height": src["height"]}
        profile = {
            "profile_key": prof["profile_key"],
            # Bulgu 1 — sayı; "16:9" etiketi zinciri farklı yere götürür.
            "aspect_ratio_value": prof["aspect_ratio_value"],
            "fit": prof["fit"],
        }
        try:
            win = crop.resolve_crop(asset, profile, intent=payload_to_intent(case["payload"]))
            box = list(win.to_pixels(src["width"], src["height"]))
            vectors.append(
                {
                    "id": case["id"],
                    "server_box": box,
                    "method": win.method,
                    "target_ratio": win.target_ratio,
                    "norm": [win.x, win.y, win.w, win.h],
                }
            )
        except crop.CropError as exc:  # zincirin reddettiği vaka da bir sonuçtur
            vectors.append({"id": case["id"], "error": str(exc)})

    head = {
        "schema_version": "1.0.0",
        "gorev": "T-105 · UI ↔ sunucu piksel paritesi (2/3)",
        "uretici": "admin-panel/frontend/scripts/gen_crop_pixel_vectors.py",
        "aciklama": (
            "ÜRETİLMİŞ DOSYA — elle düzenleme. tradehub_core/core/crop.py'nin ZİNCİRİ "
            "koşturularak üretildi. Yeniden üret: node scripts/gen-crop-pixel-cases.mjs "
            "&& python3 scripts/gen_crop_pixel_vectors.py"
        ),
        "kaynak": CROP_REL,
        "kaynak_sha256": sha256(crop_raw),
        "cases_dosyasi": "src/lib/media/crop/vendor/crop_pixel_cases.json",
        "cases_sha256": sha256(cases_raw),
        "python": platform.python_version(),
        "uretim_tarihi": date.today().isoformat(),
        "adet": len(vectors),
    }

    govde = ",\n".join("\t\t" + json.dumps(v, ensure_ascii=False) for v in vectors)
    bas = json.dumps(head, ensure_ascii=False, indent="\t")[:-2]
    metin = bas + ",\n\t\"vectors\": [\n" + govde + "\n\t]\n}\n"
    with open(OUT, "w", encoding="utf8") as fh:
        fh.write(metin)

    print(f"[gen_crop_pixel_vectors] {len(vectors)} vektör → {OUT}")
    print(f"[gen_crop_pixel_vectors] crop.py sha256 = {head['kaynak_sha256']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
