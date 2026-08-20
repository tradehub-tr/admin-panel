# 106-D3 — Crop Studio: Önce/Sonra + Otomatik/Manuel kip + gerçek görsel

**Tarih:** 2026-08-20
**Kapsam:** `src/components/media/crop/**`, `src/composables/useCropStudio.js`,
kendi testleri. Vendor (`crop_geometry`), simülatör, backend, `docker/`,
`SimApprovalGate` mantığına DOKUNULMADI.
**Karar (T-105):** Kırpma oranı kare/oran-kilitli KALIR (ürün kararı); panel
kullanıcıya gerçek sonucu KAYDETMEDEN önce gösterir.

---

## 1. before/after karşılaştırma — **YAPILDI**

### Ölçülen eksik

Rapor 65'in "C/E sapması" doğrulandı: serbest kırpmada kullanıcı istediği
dikdörtgeni çizer, sunucu ise profilin oranına ZORLAR
(`pipeline/api/crop.py::_fit_ratio_keeping_center`, T-041). Panel yalnız serbest
kutuyu gösteriyordu; oran-uyumlu sonuç ancak KAYDETTİKTEN sonra görünüyordu.
`CropPreviewStrip` rendition kartları "after"ın bir biçimiydi ama serbest kutu ≠
sunucu sonucu net karşılaştırması YOKTU.

### Yapılan

- **`useCropStudio.js`** — dört türetilmiş alan eklendi, hepsi `crop_geometry`
  vendor'ını ÇAĞIRARAK (yeni matematik yok):
  - `effectiveTargetAR` — sunucunun dayatacağı oran (kilitliyse o, serbestse
    slotun ilk kırpılabilir profilinin oranı).
  - `afterWin` — `applyRatioKeepingCenter(win, base, ar)` ile oran-zorlanmış
    kadraj. Bu fonksiyon yalnız `ratioFit`/`clampWindow` (vendor) çağırır; adı
    ve davranışı sunucunun `_fit_ratio_keeping_center` adımının ikizidir.
  - `afterPixelBox` — `roundWindow(afterWin)`, sunucunun keseceği tam piksel.
  - `ratioForced` — önce/sonra 1 kaynak pikselinden fazla ayrışıyor mu.
- **`CropBeforeAfter.vue`** (yeni) — "Önce (senin seçimin)" ve
  "Sonra (kaydedilecek)" iki tuvali yan yana, aynı gerçek bitmap'ten çizilir.
  Oran zorlanıyorsa KAYDETMEDEN önce sarı uyarı + hedef oran etiketi; uyumluysa
  "sonra = önce" der, yanlış uyarı basmaz.
- **`CropStudioModal.vue`** — bileşen kadrajın hemen altına, `afterTargetLabel`
  ile bağlandı (etiket sayıdan değil, eşleşen oran seçeneğinden).

### Doğrulama

- `cropBeforeAfterMode.test.js` (composable): kilitli kipte `afterPixelBox ==
  pixelBox`; serbest kipte ayrışıyor, genişlik korunup yükseklik daralıyor,
  `after.w/after.h ≈ 1000/563` (hedef oran).
- **Vacuity ÖLÇÜLDÜ:** `afterWin`'i `win`'e bozunca (before=after) iki test
  kırmızıya döndü ("önce ≠ sonra" ve "hedef orana uyuyor"), sonra geri alındı.
- SSR: iki tuval + iki etiket basılıyor, oran zorlanınca uyarı + "16:9", uyumlu
  durumda "sonra = önce", dört dilde ham anahtar düşmüyor.

---

## 2. auto/manuel mod toggle — **YAPILDI**

### Ölçülen eksik

İki modun mantığı vardı (`focusSuggest` odak önerisi + `CropHandles` elle ayar)
ama AÇIK bir seçici yoktu — otomatik öneri "sihirli değnek" düğmesinin arkasında
gizliydi, kullanıcı hangi kipte olduğunu görmüyordu.

### Yapılan

- **`useCropStudio.js`** — `mode` durumu (`"auto" | "manual"`, varsayılan
  `manual`) + `setMode`. Öneri uygulanınca (`applySuggestion`) kip "auto"ya,
  herhangi bir elle jest (`touched`) "manual"e çekilir; `reset` "manual"e döner.
  `savePayload.method` türetmesi (öneri varlığına bağlı) BOZULMADI — kip ondan
  bağımsız, yalnız seçicinin durumunu tutar.
- **`CropModeToggle.vue`** (yeni) — `role="radiogroup"` içinde iki radyo
  düğmesi: "Otomatik" (öneri uygulanır) / "Manuel" (kullanıcı serbest). Seçili
  kip `aria-checked` taşır; kip ne yaptığını satır olarak yazar ("otomatik
  öneri — yüz/nesne tespiti DEĞİL").
- **`CropStudioModal.vue`** — `onModeChange`: "auto" → `setMode("auto")` +
  `runSuggest()`; "manual" → `setMode("manual")`. Öneri hesabı kabukta kalır
  (sunucu ucu + bitmap orada).

### Doğrulama

- Composable: varsayılan "manual"; `setMode` iki durumu değiştiriyor, geçersiz
  değeri yok sayıyor; öneri → "auto"; elle jest → "manual" (otomatik seçiliyken
  bile); reset → "manual".
- SSR: iki `role="radio"`, seçili olan tek `aria-checked="true"`, "Otomatik" ve
  "Manuel" görünüyor, öneri iddiası pozitif "yüz bulundu" DEMİYOR.

---

## 3. gerçek ürün görselleri — **ZATEN** (yeni iş gerekmedi)

### Ölçüm

Crop Studio zaten GERÇEK asset ile açılıyor, placeholder değil:

- `MediaLibraryView.vue:1450` — `cropSource = { url: store.fileUrl(cropItem), width, height }`.
- `stores/media.js:723` — `fileUrl(item) => item?.fileUrl || item?.id` — gerçek
  `/files/...` adresi (ör. `/files/aa/urun.webp`).
- `CropCanvas.vue:137` — `fetch(props.src)` + `createImageBitmap(blob)`; kadraj,
  önizleme şeridi ve yeni önce/sonra tuvali hep bu gerçek bitmap'ten çizilir.
- Sentezlenmiş/placeholder görsel YOK; adres boşsa "Kaynak görsel okunamadı"
  denir (sahte görsel üretilmez).

Önce/sonra bileşeni de aynı `bitmap` prop'unu kullandığı için karşılaştırma
gerçek ürün görseli üzerinde çalışır.

---

## Taban korundu

- `npm test`: **927 test, 922 pass, 0 fail, 5 skip** (taban 910 → +17 yeni;
  hiçbiri kırılmadı).
- `eslint` değişen 6 dosyada **0 hata**.
- `npm run build`: **0** (8.19 s).

## Ölçülmeyen

- **Gerçek tarayıcı etkileşimi ÖLÇÜLMEDİ.** Toggle ve önce/sonra DOM'da yapısal
  olarak kanıtlı (SSR çıktısı), ama tıklama/canvas çizimi/görsel karşılaştırma
  canlı tarayıcı ister. `docker/` bu görevde yasak alan olduğundan panel imajı
  rebuild + canlı 200 YAPILMADI.
- Öneri eşiği (`0.5`) kalibrasyonu — T-041'den devralınan not aynen geçerli,
  kapsam dışı.

## i18n

Yeni anahtarlar bileşen-yerel `useI18n({ messages })` kapsamında, DÖRT dilde
(tr/en/ru/ar) parite ile tanımlandı — `src/i18n/locales/*` (başka ajanın
dosyaları) DEĞİŞTİRİLMEDİ, mevcut komşu bileşenlerin (CropPreviewStrip,
CropStudioModal) deseni sürdürüldü:

- `cropStudio.beforeAfter.*` — title, before, after, beforeAlt, afterAlt,
  forced, forcedTo, same.
- `cropStudio.mode.*` — title, auto, manual, autoHint, manualHint.
