# Admin Panel Micro-Animasyon Denetim Raporu

**Tarih:** 2026-07-18
**Ürün:** TradeHub istoc — B2B Admin Paneli (Vue 3 + SCSS)
**Kapsam:** 233 Vue dosyasının tamamı, 31 kod dilimine bölünerek incelendi; ayrıca 6 çapraz lens (toast sistemi, modal/dialog/popover envanteri, skeleton & chart yükleme, sayfa geçişi & liste girişi, mobil/tablet dokunma katmanı, erişilebilirlik & performans) uygulandı.
**Metodoloji:** Her dosya, Emil Kowalski'nin arayüz hareketi ilkeleriyle denetlendi — animasyonun *ne zaman* mesru olduğu (ani durum değişimini yumuşatma, durum göstergesi, mekânsal tutarlılık), *ne zaman* fazlalık olduğu (gösteriş, uzun süre, gereksiz stagger), doğru *property* seçimi (yalnız `transform`/`opacity`), doğru *süre* (UI < 300ms), doğru *easing* (`ease-out` girişte, `ease-in` yasak), ve erişilebilirlik (`prefers-reduced-motion`). Bulgular P1 (kritik), P2 (önemli), P3 (cila) olarak önceliklendirildi.

---

## Yönetici Özeti

Denetim, kod tabanında **519 bulgu** ortaya çıkardı: **75 P1**, **214 P2**, **230 P3**. Ancak bu sayıların dağılımından çok daha önemli olan tek bir yapısal gerçek var: **projenin animasyon problemi neredeyse tamamen "eksiklik" yönünde.** 31 dilimin tamamında, aşırı/gösterişli animasyon (bounce, uzun keyframe, gereksiz sayfa süsü, count-up sayaçlar) fiilen bulunmadı. Bu, B2B kalibrasyonu açısından son derece değerli bir başlangıç noktasıdır: panel *sakin*, ama *ölü*. Sorun, hareketin yanlış olması değil, mikro geri bildirim katmanının ve temel enter/exit geçişlerinin büyük ölçüde hiç yazılmamış olması.

Kategori dağılımı bu tabloyu doğruluyor. En büyük yığınlar sırasıyla: **button-feedback (87)**, **transition-property (74)**, **popup-modal (63)**, **skeleton-loading (63)**, **form-feedback (38)** ve **hover (35)**. Yani en yaygın beş sorun sınıfının hepsi ya "olması gereken geri bildirim yok" ya da "yanlış property anime ediliyor" temasına ait. Buna karşılık gösteriş kategorileri neredeyse boş: **page-enter yalnızca 3**, **list-stagger 9**, **easing 6**, **duration 8**. Panel süslenmeye değil, hayat bulmaya ihtiyaç duyuyor.

Dört sistemik tema, bulguların büyük çoğunluğunu tek başına açıklıyor:

1. **Modal/dialog ailesinin sessizliği (P1'lerin çoğunluğu).** Merkez modal ailesi — `ConfirmDialog` başta olmak üzere tüm `*EditModal`'lar ve yaklaşık 28 inline view modalı — çıplak `v-if` ile mount ediliyor; ne backdrop fade'i, ne panel enter animasyonu, ne de exit animasyonu var. Modal ve yarı-saydam siyah backdrop tek karede belirip tek karede kayboluyor. Projede `animations.scss`'te hazır `fade` ve `dropdown` Transition kalıpları dururken bunlar bağlanmamış. Bu, hem en yaygın hem en görünür animasyon eksiği.

2. **`:active` press feedback'in tümüyle yokluğu (button-feedback: 87).** Kod tabanında hiçbir tıklanabilir elemanda basma geri bildirimi yok. Buton, tab, chip, kanban kartı, checkbox — hiçbiri basıldığında "UI dinliyor" hissi vermiyor. Bu özellikle mobilde kritik, çünkü orada dokunma feedback'i tek geri bildirim kanalı.

3. **Skeleton'un tamamen yokluğu (skeleton-loading: 63).** Kod tabanında **hiçbir** skeleton yok. Tüm veri-yoğun liste, detay ve dashboard ekranları yalnızca ortalanmış dönen spinner gösteriyor; üstelik her filtre/sekme/arama değişiminde içeriği DOM'dan söküp spinner'a dönüyor — büyük layout shift, scroll sıfırlanması ve "sayfa çöktü" hissi.

4. **`transition: all` salgını ve `prefers-reduced-motion` kill-switch'inin olmaması (transition-property: 74, reduced-motion: 15).** Proje genelinde ~147 `transition: all` kullanımı 70 dosyaya yayılmış; bunlar renk geçişi isterken layout property'lerini de anime edip reflow tetikliyor. Global bir `prefers-reduced-motion` bloğu ise hiç yok — hareket duyarlılığı olan kullanıcı korunmuyor.

Bunlara ek olarak iki nokta ölçek-dışı etki taşıyor: **ECharts default 1000ms animasyonu** (chart: 10) her period/filtre değişiminde sıfırdan tekrar oynuyor — tek noktadan (`useChart.js`) düzeltilebilir; ve **toast sistemi** (toast: 11) Sonner ilkelerinden birden çok noktada sapıyor (çift animasyon tanımı, tanımsız `.toast-move`, ölü `removing` bayrağı).

**Genel değerlendirme:** Panelin animasyon kişiliği doğru hedefe *çok yakın* — kısa süreler, sade geçişler, gösterişsizlik. Eksik olan, o kişiliği somutlaştıran temel katman. İyi haber şu ki bulguların büyük bölümü birkaç merkezi düzeltmeyle (ortak modal Transition kalıbı, global `:active` press kuralı, tek bir skeleton bileşeni, `useChart` animasyon config'i, global `prefers-reduced-motion` bloğu) topluca çözülebilir. Bu bir yeniden-tasarım değil, bir *tamamlama* çalışmasıdır.

---

## B2B Animasyon Felsefesi

Bu projede animasyonun amacı asla dikkat çekmek değildir. Bir B2B admin panelinde kullanıcı, günde yüzlerce kez aynı ekranları açar: sipariş onaylar, ilan moderasyonu yapar, CRM kayıtları günceller, dashboard filtreler. Bu bağlamda gösterişli bir animasyon ilk gün "hoş", üçüncü gün "yavaş", birinci hafta "engel" hâline gelir. Emil Kowalski'nin çerçevesinde animasyon, yalnızca üç meşru amaçtan birine hizmet ettiğinde eklenmelidir: **(1) ani bir durum değişimini yumuşatmak** (bir modal aniden var olmaktan çok, belirmeli), **(2) bir durum göstergesi olmak** (toggle açıldı, buton basıldı, dropdown bu tetikleyiciden açıldı), **(3) mekânsal tutarlılık kurmak** (sağdan giren panel sağdan çıkar, master-detail geçişi yön tutar). Bu üç amacın dışındaki her hareket, veri-yoğun bir arayüzde gürültüdür.

Premium his, paradoksal biçimde, animasyonun *görünmez* olmasından doğar. Bir toggle switch'in topuzu 150ms'de kaydığında kullanıcı animasyonu fark etmez; sadece arayüzün "sağlam" olduğunu hisseder. Ama o topuz `left` property'siyle animasyonsuz zıplarsa (bkz. `LayoutSectionCard.vue:37`), kullanıcı yine animasyonu fark etmez — sadece arayüzün "ucuz" olduğunu hisseder. Premium his, doğru anların doğru şekilde yumuşatılmasından ve yanlış anlarda hiç hareket olmamasından oluşur. Bu yüzden bu denetimin en sık verdiği reçete "animasyon ekle" değil, "*doğru* animasyonu, *doğru* property ile, *doğru* sü rede ekle"dir.

Süre ve easing bu felsefenin omurgasıdır. UI animasyonları 300ms'nin altında kalmalıdır; veri-yoğun ekranlarda bu sınır daha da aşağı iner (150–200ms). Bir dashboard grafiğinin 1000ms boyunca büyümesi (ECharts default'u) "oyuncak" hissi verir; aynı grafik 200–300ms'de çizilirse profesyonel durur. Easing tarafında giriş animasyonları `ease-out` (veya `cubic-bezier(0.23, 1, 0.32, 1)`) olmalı — hareket hızlı başlayıp yumuşak durur, bu "yerine oturma" hissini verir. `ease-in` bir UI elemanının girişinde asla kullanılmaz (elemanı yavaş başlatıp aniden bitirir, sürüklenmiş hissi verir); denetimde `ease-in`'in hiç kullanılmamış olması projenin bu konuda temiz olduğunu gösteriyor. Çıkış animasyonları girişten *hızlı* olmalı (örn. giriş 200ms, çıkış 150ms) — kullanıcı bir şeyi kapatmaya karar verdiğinde, onu beklemek istemez.

Property seçimi hem performans hem his meselesidir. Yalnızca `transform` ve `opacity` GPU'da, compositor thread'inde çalışır ve layout tetiklemez. `left`, `width`, `height`, `max-height`, `top`, `padding` gibi property'ler ise her frame'de reflow tetikleyerek main thread'i meşgul eder — veri-yoğun bir tabloda bu, doğrudan frame düşmesi demektir. Bu yüzden `transition: all` yasaktır: renk geçişi isterken farkında olmadan layout property'lerini de anime eder ve niyeti belirsizleştirir. Bu projede en çok tekrarlanan iki teknik hata tam da bunlar: layout property'si animasyonu (`BaseSegmented`'in `left`/`width` thumb'ı, sidebar accordion'un `max-height`'ı, onlarca progress bar'ın `width`'i) ve `transition: all` (70 dosya). İkisi de tek tek, açık property listeleriyle düzeltilmelidir.

Sıklık, animasyon kararının en önemli girdisidir. Günde onlarca kez tetiklenen bir etkileşim (inline hücre düzenleme, CRM sekme değişimi, arama sonucu güncelleme) animasyonsuz olmalıdır — çünkü animasyon, tekrar eden bir eylemde gecikme olarak algılanır. Denetimde bu ilkenin doğru uygulandığı örnekler var (`EditableCell` mod geçişi animasyonsuz, `GlobalSearch` sonuç listesi stagger'sız, `DataTable` satır render'ı sade) ve bunlar korunmalıdır. Buna karşılık ara sıra görülen yüzeyler (modal, drawer, toast, dropdown) standart enter/exit animasyonunu hak eder — bunlar günde birkaç kez görülür ve yumuşak bir geçiş burada gürültü değil, cila olur. Projenin en büyük tutarsızlığı da burada: aynı sınıftan elemanlar (ekran-ortası dialoglar) çok farklı animasyon dilleri konuşuyor — bazıları gerçek Vue Transition kullanıyor (`SlideOverPanel`), çoğu hiçbir dil konuşmuyor.

Son olarak, erişilebilirlik bu felsefenin pazarlık konusu olmayan parçasıdır. `prefers-reduced-motion` tercihini belirten kullanıcı, vestibüler rahatsızlık nedeniyle bunu yapar; onun için hareket bir konfor değil, sağlık meselesidir. Bu tercih aktifken tüm `translate`/`scale` hareketleri kaldırılmalı, yalnızca `opacity` ve renk geçişleri korunmalıdır. Projede bu tercihin yalnızca 15 dosyada tutarsız biçimde ele alınması ve merkezi 4 Vue Transition kalıbının hiçbirinin muaf tutulmaması, tek bir global media query ile kapatılması gereken kritik bir açıktır. İyi tasarlanmış bir B2B panel, hareketi olan kullanıcı için sakin, hareketi olmayan kullanıcı için de tamamen erişilebilir olmalıdır.

---

## En Kritik 20 Bulgu

Aşağıdaki 20 bulgu, 75 P1 içinden **görünürlük × etki** sırasıyla seçildi: kaç kullanıcının kaç kez karşılaştığı, kaç dosyayı temsil ettiği ve tek düzeltmeyle kaç yeri iyileştireceği. Merkezi/tekrar eden bulgular birleştirildi.

| # | Bulgu | Dosya:Satır | Etki |
|---|-------|-------------|------|
| 1 | Merkez modal ailesi tamamen animasyonsuz (ConfirmDialog + tüm EditModal'lar + ~28 inline modal) | `components/common/ConfirmDialog.vue:4` | ~30 dosya, en görünür eksik |
| 2 | Hiçbir tıklanabilirde `:active` press feedback yok | `assets/scss/crm.scss:378` + global | Tüm proje |
| 3 | Kod tabanında hiç skeleton yok — her yükleme spinner + full swap | `views/seller/SellerListingsView.vue:197` | ~40 liste/detay view |
| 4 | Global `prefers-reduced-motion` kill-switch yok | `assets/scss/animations.scss:60` | Tüm hareket |
| 5 | ECharts default 1000ms + her filtrede sıfırdan yeniden çizim | `composables/dashboard/useChart.js:50` | 7 dashboard × 4 widget |
| 6 | Toast: çift animasyon + tanımsız `.toast-move` + ölü `removing` bayrağı | `assets/scss/animations.scss:88` | Uygulama geneli geri bildirim |
| 7 | `transition: all` salgını (~147 kullanım, 70 dosya) | `assets/scss/header.scss:49` | Performans, tüm proje |
| 8 | `BaseSegmented` thumb'ı `left`/`width` (layout) anime ediyor | `components/common/BaseSegmented.vue:116` | Tüm segmented control'ler |
| 9 | CRM Commission butonları tanımsız `.th-btn-*` — stilsiz, feedback'siz | `views/crm/CommissionAdminView.vue:50` | 3 view, kritik eylemler |
| 10 | Helpdesk: 7 modal animasyonsuz + `transition: all` + press yok | `assets/scss/helpdesk.scss:156` | 8 helpdesk view |
| 11 | CRM liste view'larında her filtrede full spinner swap | `views/crm/DealsListView.vue:60` | 5 liste view |
| 12 | `LayoutSectionCard` toggle topuzu `left` ile animasyonsuz zıplıyor | `components/seller/LayoutSectionCard.vue:37` | Bozuk mikro-etkileşim |
| 13 | Dashboard widget'ları spinner → ani pop-in, KPI hover lift geçişsiz | `assets/scss/cards.scss:32` | Tüm dashboard'lar |
| 14 | Mobil sheet'ler yalnız giriş keyframe'i — çıkışta ani yok oluyor | `views/doctype/OrderMobile.vue:108` | Mobil, tüm custom sheet'ler |
| 15 | Mobil `.m-item` gezinme satırlarında dokunma feedback'i yok | `assets/scss/mobile-nav.scss:255` | En sık dokunulan mobil eleman |
| 16 | Mobil master-detail sohbet overlay'i animasyonsuz açılıyor | `views/messaging/BuyerMessagesView.vue:341` | Günde onlarca kez |
| 17 | `TasksListView` checkbox optimistic değil, hatayı sessizce yutuyor | `views/crm/TasksListView.vue:453` | Kritik geri bildirim boşluğu |
| 18 | `ContactDetailView`: her Kaydet sonrası tüm sayfa spinner'a dönüyor | `views/crm/ContactDetailView.vue:252` | "Sayfa çöktü" hissi |
| 19 | İki farklı drawer implementasyonu (400ms Vue Transition vs 250ms class-toggle) | `components/dashboard/layout/SlideOverPanel.vue` | Kalıp tutarsızlığı |
| 20 | `base.scss:196` `focus-visible` dâhil `outline: none` — klavye erişilebilirliği silinmiş | `assets/scss/base.scss:196` | WCAG 2.4.7 ihlali |

### 1. Merkez modal ailesinin tümüyle animasyonsuz olması

Bu, denetimin en yaygın ve en görünür bulgusu. `ConfirmDialog` ve tüm kardeşleri çıplak `v-if` ile mount ediliyor; modal ve backdrop tek karede beliriyor, tek karede kayboluyor. Silme onayı gibi kritik anlarda dialog "pat" diye açılıyor.

| | Değer |
|---|---|
| **Önce** | `<div v-if="open" class="fixed inset-0 bg-black/50 ...">` — hiçbir `<Transition>` yok, exit animasyonu sıfır |
| **Sonra** | `<Transition name="modal">` ile sar; backdrop `opacity 0→1` 200ms `ease`; panel `transform: scale(0.96)→scale(1)` + `opacity`, giriş 200ms `cubic-bezier(0.23, 1, 0.32, 1)`, çıkış 150ms |
| **Neden** | Modal "ara sıra görülen" bir yüzey — standart enter/exit hak eder. Ani pop/kaybolma mekânsal bağlamı koparır, premium hissi kırar. `transform-origin: center` kalır (modal istisnası), `scale(0.96)`'dan başlar — asla `scale(0)`'dan |

Bu kalıp `animations.scss`'e tek sefer eklenip ~30 modalın hepsine uygulanmalı.

### 2. `:active` press feedback'in tümüyle yokluğu

Kod tabanında hiçbir tıklanabilir elemanda basma geri bildirimi yok. Buton, tab, chip, kanban kartı — hiçbiri basıldığında tepki vermiyor.

| | Değer |
|---|---|
| **Önce** | Yalnızca `:hover` renk değişimi; `:active` kuralı hiçbir yerde yok |
| **Sonra** | `&:active:not(:disabled) { transform: scale(0.97); }` + `transition: transform 120ms cubic-bezier(0.23, 1, 0.32, 1)` |
| **Neden** | "UI dinliyor" hissi. Emil kuralı: her tıklanabilir eleman basıldığında 100–160ms'lik anlık scale almalı. Mobilde bu tek geri bildirim kanalı olduğu için öncelikli |

### 3. Skeleton'un tamamen yokluğu

| | Değer |
|---|---|
| **Önce** | `<div v-if="loading" class="card text-center py-12"><AppIcon name="loader" class="animate-spin" /></div>` |
| **Sonra** | Gerçek satır/kart yüksekliğinde skeleton bloklar; `animate-pulse` (opacity 1↔.4, ~1.5s `ease-in-out`) veya `transform: translateX` shimmer. İlk yüklemede skeleton, refetch'te eski içeriği `opacity: 0.55; pointer-events: none` ile koru |
| **Neden** | Spinner belirsiz bekleme hissi verir; skeleton gelecek içeriğin şeklini gösterip algılanan hızı artırır ve layout'u önceden rezerve eder. `background-position` shimmer YERİNE `opacity`/`transform` kullan — layout/paint tetiklemez |

### 5. ECharts default 1000ms animasyonu

| | Değer |
|---|---|
| **Önce** | `setOption(option, { notMerge: true })` — animation config yok, ECharts default `animationDuration: 1000ms`; `notMerge: true` her filtrede sıfırdan yeniden çiziyor |
| **Sonra** | Base config merge et: `{ animationDuration: 300, animationEasing: 'cubicOut', animationDurationUpdate: 200, animationEasingUpdate: 'cubicOut' }`; veri güncellemelerinde `notMerge: false` (diff/merge) |
| **Neden** | UI animasyonu < 300ms. 1sn'lik bar/pie/gauge büyümesi "oyuncak" hissi verir; `notMerge` her period değişiminde 1sn'lik ilk-çizimi baştan oynatır — "her filtrede yeniden animasyon" ihlali. Tek noktadan 4 chart tipi birden düzelir |

### 8. `BaseSegmented` thumb'ının layout property animasyonu

| | Değer |
|---|---|
| **Önce** | `.seg-thumb { transition: left $t-spring, width $t-spring, opacity $t-base; }` — `left`/`width` her frame reflow tetikler |
| **Sonra** | Sabit genişlik + `transform: translateX(calc(${idx*100}% + ${idx*2}px))`; `transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)` |
| **Neden** | Yalnız `transform`/`opacity` GPU'da çalışır. Etkileşim anında (tab kaydırma) `left`/`width` frame düşürür. Easing zaten doğru, sorun property |

### 12. `LayoutSectionCard` toggle topuzu

| | Değer |
|---|---|
| **Önce** | `class="... transition-transform"` ama durum `:class` ile `left-[18px]` / `left-0.5` arası değişiyor — `transition-transform` `left`'i kapsamaz, topuz **animasyonsuz zıplar** |
| **Sonra** | `left-0.5` sabit, durum `translate-x-[14px]` / `translate-x-0` ile; `transition-transform duration-150 ease-out` |
| **Neden** | Toggle switch animasyonun en meşru olduğu yer (durum göstergesi + geri bildirim). `left` zaten layout tetikler; `transform` hem doğru hem GPU-dostu |

### 20. `focus-visible` dâhil `outline: none`

| | Değer |
|---|---|
| **Önce** | `base.scss:196`: `outline: none` `focus-visible` dâhil tüm focus halkasını siliyor |
| **Sonra** | `:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }` — klavye focus halkasını geri getir, `:focus` (fare) için gizle |
| **Neden** | WCAG 2.4.7 (Focus Visible) ihlali; klavye kullanıcısı nerede olduğunu göremiyor. Aynı silme `SourceBadge` ve moderasyon sekmelerinde de var |

Kalan kritik bulgular (6, 7, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19) yukarıdaki dört sistemik tema altında toplanıyor ve "Sistemik Temalar" bölümünde reçetelendiriliyor.

---

## Mevcut Güçlü Yanlar

Denetim, korunması ve *çoğaltılması* gereken sağlam kararlar da buldu. Bunlar, projenin animasyon kişiliğinin doğru hedefe yakın olduğunun kanıtı:

- **`BaseSwitch.vue`** — Thumb hareketi `transform: translateX(20px)` ile (GPU-dostu, layout tetiklemiyor); keyframes değil `transition` kullanıldığı için hızlı tekrar tıklamada kesintisiz retarget ediyor. Emil'in toggle kuralına birebir uygun. `LayoutSectionCard`'ın ulaşması gereken çıta budur.
- **`AppSelect.vue`** — Global `dropdown` Transition'ı asimetrik (giriş 0.15s / çıkış 0.1s — çıkış girişten hızlı, doğru); chevron 180° dönüşü `$t-fast` ile net durum göstergesi; panel viewport'a sığmayınca `align-right` ile x-scroll'u önlüyor.
- **`KanbanBoard.vue`** — Drag-over feedback'i `transition: border-color, background` (açık property listesi, `all` değil); `.dragging` opacity düşüşü kasıtlı olarak anlık — sürükleme başında gecikme hissettirmiyor.
- **`MobileTabBar` m-sheet** — Projenin en iyi animasyonu: transform-only giriş/çıkış, iOS eğrisi `cubic-bezier(0.32, 0.72, 0.35, 1)`, backdrop için ayrı fade ve `mobile-nav.scss:411`'de `prefers-reduced-motion` desteği. Tüm custom sheet'lerin bu kalıba geçmesi gerek.
- **`WidgetPreview` yenileme deseni** — Veri tazelenirken eski içerik ekranda kalıyor, spinner başlıkta non-blocking, 500ms debounce. Skeleton'suz "stale-content" kalıbının örnek uygulaması.
- **`useChart` mimarisi** — ECharts instance `shallowRef`'te (Proxy overhead yok), `IntersectionObserver` ile lazy init, `ResizeObserver` ile responsive, temiz dispose. Yalnızca animasyon config'i eksik.
- **`EditableCell`** — Mod geçişi bilinçli olarak animasyonsuz (günde onlarca kez tetiklenen inline edit için doğru karar); `nextTick` ile anında focus. Sıklık kuralının doğru uygulanması.
- **`GlobalSearch`** — Sonuç listesi filtrelenirken stagger/yeniden-animasyon yok — arama sonuçları anında güncellenmeli, doğru karar.
- **`IconRail` avatar upload akışı** — Progress bar + %100'de 350ms hold + fade ile ✓ + toast. Kullanıcı hiçbir aşamada belirsiz kalmıyor.
- **Global dropdown kalıbı** — Asimetrik (giriş 0.15s / çıkış 0.1s), `AppHeader`'daki iki menüde tutarlı. Bu kalıp zaten var; sorun onu kullanmayan yerler.
- **Genel B2B kalibrasyonu** — Hiçbir dilimde aşırı/gösterişli animasyon yok; `ease-in` hiç kullanılmamış; `will-change` suistimali yok; `scale(0)` tuzağına düşülmemiş. "Fazlalık" tarafı temiz.

---

## Sistemik Temalar

Aşağıdaki her tema, tek bir merkezi düzeltmeyle onlarca dosyayı iyileştirir. Öncelik sırası bu temalara göre kurulmalı.

### Tema 1 — Ortak modal/dialog Transition kalıbı

**Kapsam:** ~30 modal (ConfirmDialog, tüm EditModal'lar, ~28 inline view modalı), 63 popup-modal bulgusunun çoğu.

Aynı görsel konsept (ekran-ortası dialog + backdrop) tek bir dil konuşmalı. `animations.scss`'e tek kalıp:

```scss
.modal-enter-active, .modal-leave-active { transition: opacity 200ms ease; }
.modal-enter-active .modal-box, .modal-leave-active .modal-box {
  transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms ease;
}
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-box, .modal-leave-to .modal-box { opacity: 0; transform: scale(0.96); }
```

Çıkış 160ms'e kısaltılabilir. Mobilde bottom-sheet olan modallarda (`RegexPatternsView`, `SellerOrdersView`) `@media (max-width: 767px)` içinde `transform: scale` yerine `translateY(100%)` + iOS eğrisi `cubic-bezier(0.32, 0.72, 0, 1)` kullanılmalı.

**Önerilen Standart:** Tüm ekran-ortası dialoglar `<Teleport> + <Transition name="modal">` ile sarılır; backdrop `opacity` fade (180–200ms `ease`), panel `scale(0.96)→1` (200ms giriş / 150ms çıkış, `cubic-bezier(0.23, 1, 0.32, 1)`); `transform-origin: center` (modal istisnası); `prefers-reduced-motion`'da `transform` kaldırılır, `opacity` korunur.

### Tema 2 — Global `:active` press feedback

**Kapsam:** 87 button-feedback bulgusunun tamamı, tüm proje.

Her tıklanabilir sınıfa (buton, tab, chip, kart, checkbox) ortak kural. Merkezi partial'larda (`header.scss`, `crm.scss`, `helpdesk.scss`, `forms.scss`) tanımlanır:

```scss
&:active:not(:disabled) { transform: scale(0.97); }
transition: /* mevcut renk geçişleri */, transform 120ms cubic-bezier(0.23, 1, 0.32, 1);
```

Küçük ikon butonlarda `scale(0.94)`. `prefers-reduced-motion`'da `transition-duration: 0.01ms`.

**Önerilen Standart:** Basma geri bildirimi 100–160ms bandında `scale(0.97)` (ikonlarda `0.94`); `transform` her tıklanabilirin transition listesine eklenir; hover kuralları `@media (hover: hover) and (pointer: fine)` arkasına alınarak dokunmatikte sticky hover önlenir.

### Tema 3 — Skeleton yükleme + stale-content

**Kapsam:** 63 skeleton-loading bulgusu, ~40 liste/detay/dashboard view.

Tek bir `Skeleton` bileşeni: gerçek satır/kart yüksekliğinde placeholder, `opacity`/`transform` tabanlı shimmer (asla `background-position` — layout tetikler). İki katmanlı strateji:

1. **İlk yükleme:** `v-if="loading && !items.length"` → skeleton bloklar.
2. **Refetch (filtre/sekme/arama):** İçeriği sökme; mevcut listeye `:class="{ 'is-refreshing': loading }"` → `.is-refreshing { opacity: 0.55; pointer-events: none; transition: opacity 150ms ease; }`.

`ContactDetailView` gibi save-sonrası reload'larda `loadDoc(silent = true)` ile form yerinde tutulur.

**Önerilen Standart:** Spinner-only yalnızca <200ms sürecek atomik işlemlerde. Veri-yoğun liste/tablo/dashboard'da ilk yükleme skeleton, sonraki yüklemeler stale-content dim'i. Skeleton yüksekliği gerçek içerikle bire bir eşit (layout shift sıfır); shimmer `prefers-reduced-motion`'da statik gri.

### Tema 4 — `transition: all` temizliği + doğru property

**Kapsam:** 74 transition-property bulgusu, ~147 kullanım, 70 dosya.

Her `transition: all` açık property listesiyle değiştirilir. Layout property'si anime eden yerler (`BaseSegmented` `left`/`width`, sidebar `max-height`, ~10 progress bar `width`) `transform`'a taşınır. En yoğun 4 dosyayla başla: `header.scss` (10), `helpdesk.scss` (7), `PlansTab.vue` (7), `PermissionConsoleView.vue` (5).

**Önerilen Standart:** `transition: all` yasak. Renk geçişi için `transition: background-color, color, border-color 120ms ease`; hareket için yalnız `transform`/`opacity`. Progress bar'lar `transform: scaleX()` ile (`width` değil); linear easing (progress doğrusaldır).

### Tema 5 — Global `prefers-reduced-motion` kill-switch

**Kapsam:** 15 reduced-motion bulgusu, tüm hareket.

`animations.scss` sonuna tek blok:

```scss
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Opacity geçişleri 0.01ms'de anında tamamlanır; hareket kaybolur. Ek olarak ECharts için `matchMedia('(prefers-reduced-motion: reduce)')` ile `animation: false`.

**Önerilen Standart:** Tek global media query tüm CSS animasyon/transition'ları etkisizleştirir; canvas (ECharts) ayrıca JS ile muaf tutulur; yeni eklenen her hareket bu bloğun kapsamında doğrulanır.

### Tema 6 — Toast sistemi Sonner uyumu

**Kapsam:** 11 toast bulgusu, uygulama geneli geri bildirim.

Üç düzeltme birlikte: (1) `forms.scss:189`'daki çift `animation: toastIn` sil, keyframes yerine `transition` kullan; (2) `useToast.remove()`'daki ölü `removing` bayrağı + 300ms manuel gecikmeyi kaldır, çıkışı tamamen `TransitionGroup`'a bırak; (3) `.toast-move { transition: transform 240ms cubic-bezier(0.23,1,0.32,1); }` tanımla ve `.toast-leave-active { position: absolute; }` ekle. Mobilde `bottom: calc(64px + env(safe-area-inset-bottom))` ile tab bar üstüne taşı.

**Önerilen Standart:** Toast giriş/çıkış `transition` tabanlı (keyframes değil, retarget için); çıkış basışla anında başlar (~240ms); stack `.toast-move` ile mekânsal tutarlı; mobilde safe-area + tab bar offset'i.

### Tema 7 — Tek drawer dili

**Kapsam:** SlideOverPanel (400ms Vue Transition) vs QuickCreateDrawer (250ms class-toggle) + `dt-drawer`.

Tek token: `$t-drawer: 320ms cubic-bezier(0.32, 0.72, 0, 1)` (`variables.scss`), tüm sağdan-açılan drawer'larda kullanılır. Mekanizma birleştirilir (tercihen class-toggle + `transition`, retarget için).

**Önerilen Standart:** Sağdan giren tüm drawer'lar aynı iOS eğrisi + 300–360ms süre; giriş ve çıkış aynı yönden (mekânsal tutarlılık); yalnız `transform`/`opacity`; body scroll-lock + focus-trap + Escape.

---

## Global Animasyon Altyapısı

Bu bölüm, tek tek bileşenlerden önce **motion sisteminin kendisini** denetler: token seti, merkezi Transition kalıpları, global `:active`/`:hover`/`:focus` davranışı ve `prefers-reduced-motion` kapsaması. Buradaki sorunların çoğu **sistemik**tir — yani tek bir dosyada değil, tokenların ve global SCSS'in tanımlandığı yerde düzeltilince onlarca ekranda birden çözülür. Uygulama planında bu bölüm **her şeyden önce** ele alınmalı; alt bölümlerdeki (buton, modal, toast…) reçeteler buradaki token setini varsayar.

### Mevcut durumun haritası

| Konu | Bulunan durum | Dosya |
| --- | --- | --- |
| Transition tokenları | 5 adet, süre+easing birleşik: `$t-fast: 0.12s ease`, `$t-base: 0.15s ease`, `$t-slow: 0.2s ease`, `$t-panel: 0.18s ease`, `$t-spring: 0.25s cubic-bezier(0.4,0,0.2,1)` | `assets/scss/variables.scss:51-56` |
| Ayrı easing/süre tokenı | **Yok** — `$t-spring` hariç tüm easing jenerik `ease`; giriş/çıkış için ayrı eğri yok | — |
| Merkezi Transition kalıpları | `fade` (opacity 0.2s), `dropdown` (0.15s/0.1s + translateY(-4px)), `m-sheet` (transform 0.26s cubic-bezier(0.32,0.72,0.35,1)) | `assets/scss/animations.scss`, `mobile-nav.scss` |
| Global `:active` press feedback | **Yok** — tek istisna `.hdr-icon-btn` background değişimi | `base.scss` |
| `:focus-visible` halkası | `button:focus-visible { outline: none }` ile **tamamen silinmiş** | `base.scss` |
| Sayfa geçişi | `.page-enter-active` **ölü kod**, hiç kullanılmıyor; route değişimi animasyonsuz | `animations.scss` |
| `prefers-reduced-motion` | Global destek **yok**; yalnızca 2 SCSS noktası + birkaç view lokal ele alıyor | `sidebar.scss:55`, `mobile-nav.scss:411` |
| Tema kill-switch | `html.no-transitions` tüm süreleri 0'a çeker — **sağlam** | `base.scss` |

### Sorun 1 — `transition: all` salgını (P1, sistemik)

En yaygın ve en görünür performans sorunu. **37 dosyada 91+ kullanım.** `transition: all`, yalnızca renk geçişi istenirken tarayıcıyı her animasyonlanabilir özelliği (transform, box-shadow, hatta layout) izlemeye zorlar; hover anında layout property'si değişirse reflow tetiklenir. Emil ilkesi net: **`transition: all` YASAK, özellik tek tek yazılır.**

| | Önce | Sonra |
| --- | --- | --- |
| `.hdr-btn`, `.hdr-icon-btn` (`header.scss`) | `transition: all $t-fast` | `transition: background-color $t-fast, color $t-fast, border-color $t-fast` |
| `.kpi-card` (`cards.scss`) | `transition: all $t-slow` | `transition: box-shadow $t-slow, transform $t-slow` |
| `.form-input` (`forms.scss`) | `transition: all $t-base` | `transition: border-color $t-base, box-shadow $t-base` |
| `.list-pagination-btn`, `.view-mode-btn` (`tables.scss`) | `transition: all 0.15s` | `transition: background-color .15s, color .15s` |

**Neden:** `all` ile yazılan bir geçiş, bileşene sonradan eklenen her yeni property'yi de sessizce animasyonlar; bu hem öngörülemez sıçramalara hem de gereksiz GPU/main-thread yüküne yol açar. B2B'de "akıcı his" tam olarak buradan kaybediliyor — ekran ağır hissettiriyor.

### Sorun 2 — Token bypass'ı: hardcoded `0.15s`/`0.2s` (P2, sistemik)

En az 10 yerde (`.hdr-search-input`, `.hdr-btn-outlined`, `.inline-row-btn`, `.rail-icon`, `.panel-item`, `.list-grid-card`, `.kanban-card`…) tokenlar bypass edilip süre elle yazılmış. Bu, token setinin tek noktadan ayarlanma avantajını yok eder. **Reçete:** tüm hardcoded süreleri tokenlara geri bağla; token dışı süre kalmayacak.

### Sorun 3 — Jenerik `ease`, giriş/çıkış ayrımı yok (P2)

`$t-spring` dışındaki her token jenerik `ease` kullanıyor. Emil çerçevesi giren elemana güçlü `ease-out`, ekranda hareket edene `ease-in-out`, UI'da asla `ease-in` der. Şu an sistem bu ayrımı yapamıyor. **Önerilen token seti (`variables.scss`):**

```scss
// Easing eğrileri
$ease-out: cubic-bezier(0.23, 1, 0.32, 1);       // giren/beliren eleman
$ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);   // ekranda morph/hareket
$ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);    // sheet/drawer (iOS)

// Süre kademeleri (yalnızca süre)
$d-press: 130ms;   // buton :active feedback
$d-fast: 150ms;    // hover, küçük geçiş
$d-pop: 200ms;     // dropdown, popover, tooltip
$d-modal: 240ms;   // modal, drawer
$d-sheet: 320ms;   // bottom sheet

// Geriye dönük uyum: birleşik tokenlar yeni eğrilere bağlanır
$t-fast: $d-fast $ease-out;
$t-base: $d-fast $ease-out;
$t-slow: $d-pop $ease-out;
```

Bu, mevcut `$t-*` kullanımlarını kırmadan doğru easing'i sisteme sokar.

### Sorun 4 — Global press feedback ve focus halkası yok (P1)

Hiçbir tıklanabilir eleman basıldığında tepki vermiyor ("UI dinliyor" hissi yok) ve `focus-visible` outline silinmiş (erişilebilirlik açığı). **Reçete — `base.scss`'e global kural:**

```scss
@media (hover: hover) and (pointer: fine) {
  button:not(:disabled):active,
  [role="button"]:not(.is-disabled):active {
    transform: scale(0.97);
    transition: transform $d-press $ease-out;
  }
}
button:focus-visible {
  outline: 2px solid var(--brand-focus, #3b82f6);
  outline-offset: 2px;
}
```

`scale(0.97)` + `$d-press` (130ms) tüm panelde tek satırda "premium tık" hissi kazandırır. Dokunmatikte hover sızmasını önlemek için `@media (hover: hover)` şart.

### Sorun 5 — Sayfa geçişi ölü kod (P2)

`.page-enter-active` tanımlı ama hiç `<Transition name="page">` yok; route değişimi tamamen animasyonsuz. B2B'de büyük slide geçişi **istenmiyor**; ölü kodu temizleyip route-view'a çok hafif bir fade koymak yeterli (opsiyonel):

```scss
.route-enter-active { transition: opacity 120ms $ease-out; }
.route-enter-from { opacity: 0; }
```

Süre 120ms bilinçli düşük — sık tekrarlayan geçişte gecikme hissi vermemeli. İstenmezse hiç koymamak da geçerli; kritik olan **ölü kodun temizlenmesi**.

### Sorun 6 — `prefers-reduced-motion` kapsayıcı değil (P1, erişilebilirlik)

Toast, dropdown, fade, KPI stagger — hiçbiri reduced-motion'dan muaf değil. **Reçete — tek global kill-switch (`base.scss`):**

```scss
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Not: Emil ilkesine göre hareketi (transform/translate) kaldırıp opacity/renk geçişini korumak idealdir; ama tek satırlık bu global kill-switch, mevcut sıfır kapsamaya kıyasla çok daha güvenli bir başlangıç. İnce ayar bileşen bazında yapılır.

### Sorun 7 — Toast altyapısı çift tanım + reflow (P2)

`.toast` animasyonu hem `TransitionGroup` sınıflarında hem `forms.scss:189`'da iki kez tanımlı; `.toast-move` sınıfı **tanımsız** olduğu için bir toast silinince kalanlar animasyonsuz zıplıyor, `leave-active`'e `position: absolute` verilmediği için çıkan eleman yer kaplamaya devam ediyor. Detay ve tam reçete **04 — Toast ve Bildirim Sistemi** bölümünde.

### Önerilen Standart (bu alan için tek tip reçete)

1. **`variables.scss`'e ayrı easing + süre token seti ekle** (Sorun 3'teki blok). Birleşik `$t-*` tokenları yeni eğrilere bağla — hiçbir çağrı kırılmaz.
2. **`transition: all` avını yap:** 37 dosyadaki 91 kullanımı tek tek özellik listesine çevir. Bu tek iş, panelin "ağırlık" hissini en çok azaltacak müdahale.
3. **Global press + focus kuralını `base.scss`'e koy:** `:active { transform: scale(0.97) }` + `focus-visible` outline. Bir kez yaz, 233 dosyada çalışır.
4. **Global `prefers-reduced-motion` kill-switch'i ekle.**
5. **Ölü `page-*` kodunu temizle;** route geçişi istenirse ≤120ms fade.
6. **Hardcoded süreleri tokenlara geri bağla** — token dışı süre bırakma.
7. **`$t-spring-slow` tutarsızlığını gider:** ya `variables.scss`'e ekle ya `.claude/rules/scss.md`'den kaldır.

Bu 7 madde tamamlandığında, alt bölümlerdeki bileşen-özel reçeteler ortak bir zemine oturur; aynı easing dili tüm panelde konuşulur.

---

## Buton ve Etkileşim Geri Bildirimi

Bu bölüm, panelin tıklanabilir yüzeylerinin (butonlar, filtre pill'leri, sekmeler, toggle'lar, satır aksiyonları, FAB'ler, sürükleme affordance'ları) basma/hover/durum-değişimi anlarında verdiği geri bildirimi denetler. Emil Kowalski'nin temel ilkesi burada tek cümleyle özetlenebilir: **her tıklanabilir eleman basıldığında "UI seni dinliyor" hissi vermeli** — yani `:active` durumunda 100–160ms bandında bir `scale` tepkisi, hover/renk geçişlerinde kısa bir `ease`, durum değişimlerinde (toggle, seçili sekme, checkbox) yumuşatılmış bir geçiş. B2B bağlamında bu his gösterişli değil, *crisp* olmalı: küçük ölçek (0.94–0.99), hızlı süre (100–150ms), güçlü ease-out (`cubic-bezier(0.23, 1, 0.32, 1)`).

Denetimin bu bölümündeki bulgular üç kategoriye ayrılıyor:

- **`button-feedback` (press eksikliği):** Basma anında hiçbir `:active` tepkisi olmayan yüzeyler. En yaygın ve en yüksek etkili sorun — panelin neredeyse tamamında `:active { transform: scale(...) }` kuralı yok.
- **`hover` (geçiş ve dokunmatik koruması):** `transition: all` kullanımı, transition'sız ani renk sıçramaları, ve `@media (hover: hover)` koruması olmadığı için dokunmatikte yapışıp kalan (sticky) hover durumları.
- **`form-feedback` (durum/sonuç geçişleri):** Async sonuçların, hata mesajlarının, focus halkalarının, kaydet onaylarının ani belirmesi; native `alert()`/`confirm()`/`prompt()` kullanımı; optimistic update eksikliği.

Toplam tablo: bu bölümde **~90 bulgu** raporlandı — 1 adet P1 kritik (aslında birden fazla P1 dosya, aşağıda birleştirilmiş), çok sayıda P2 ve P3. Aşağıda dosya/eleman bazında birleştirilerek, en yüksek önceliklilerden başlanarak sunulmuştur.

---

### Genel tablo: sistemik eksik nedir?

Baseline'da **global bir `:active` press kuralı yok**. Bu, tek bir kök nedenin 40'tan fazla dosyaya yansıması demek. `hdr-btn-primary`, `hdr-btn-outlined`, `btn-primary`, `status-pill`, `crm-tab`, `hd-*`, `th-btn-*` gibi paylaşılan sınıfların hiçbiri basma geri bildirimi tanımlamıyor. Sonuç: kullanıcı bir butona bastığında tek "kanıt" async toast'ın gelmesi — arada ölü bir boşluk kalıyor ve arayüz "dinlemiyor" gibi hissettiriyor.

İkinci sistemik sorun **`transition: all`** kullanımı. `crm.scss`, `helpdesk.scss`, `IconRail.vue` (`.rail-icon`), `AuthorizationSimulatorView.vue`, `SellerKpiList.vue`/`SellerScoreList.vue` (`.status-pill`), `ColorPresetField.vue` gibi çok sayıda yerde `transition: all` var. Bu hem token'ları bypass ediyor hem de `border`, `padding`, `box-shadow` gibi layout/paint-ağır özellikleri gereksizce animasyonluyor. İlke: yalnızca `transform`, `opacity` ve renk özellikleri (`background-color`, `border-color`, `color`) açık liste ile hedeflenmeli.

Üçüncü sistemik sorun **dokunmatik sticky hover**: `@media (hover: hover) and (pointer: fine)` koruması olmayan hover kuralları, mobil/tablet'te tap sonrası yapışıp kalıyor — özellikle mobil-only bileşenlerde (`mobile-nav.scss`, `MobileTabBar`, `CategoryManagementView` mobil sheet) hover'ın hiçbir anlamı olmadığı halde tanımlı.

---

### P1 — Kritik: hiç geri bildirim vermeyen çekirdek yüzeyler

Bu bulgular ya en sık kullanılan etkileşim yüzeylerini kapsıyor ya da butonu "buton gibi bile durmayan" bir noktaya getiriyor. Global sınıf düzeyinde çözülmeleri gerekiyor.

#### CRM & Helpdesk paylaşılan sınıfları (`crm.scss:378`, `helpdesk.scss:156`, `views/crm/DealsListView.vue:12`, `views/crm/CommissionAdminView.vue:50`)

CRM ve helpdesk dilimlerinin **tüm** tıklanabilirleri (`.crm-tab`, `.kanban-card`, `.status-pill`, `hdr-btn-primary/outlined`, `hd-action`, `hd-btn-primary`, `hd-quick`, `hd-kpi`, `hd-tab`, `hd-scope`, `hd-prio`, `hd-composer-tab`) basıldığında sıfır fiziksel tepki veriyor. Helpdesk tarafında ayrıca hepsi `transition: all $t-base` taşıyor. `CommissionAdminView`/`CommissionTeamView`/`CommissionSettingsView`'daki `.th-btn-primary/.th-btn-outline/.th-btn-dark` sınıfları ise **hiçbir stylesheet'te tanımlı bile değil** — Tailwind preflight reset'iyle çıplak metin gibi görünüyorlar; onay/red/ödeme gibi kritik para eylemleri buton bile gibi durmuyor.

| | Değer |
|---|---|
| **Önce** | `.crm-tab, .kanban-card, .status-pill { transition: color $t-slow; }` — `:active` yok; helpdesk: `transition: all $t-base;`; `.th-btn-*` tanımsız |
| **Sonra** | `transition: color .12s ease, border-color .12s ease, transform .12s ease-out;` + `&:active:not(:disabled) { transform: scale(0.97); }` (küçük ikon butonlarda `0.94`) |
| **Neden** | En sık kullanılan çekirdek etkileşimler (tab değiştir, kart aç, yorum gönder, ticket aksiyonu); basma anında tepki olmaması arayüzü "ölü" hissettiriyor. `transition: all` ise gereksiz property'leri animasyonluyor |

`.th-btn-*` için önerilen çözüm: bu aileyi `forms.scss`/`header.scss`'te tanımlamak yerine mevcut `.hdr-btn-primary`/`.hdr-btn-outlined` sınıflarına geçirmek — tek fix noktası.

#### ECA kural sihirbazı (`views/eca/EcaRuleFormView.vue:2473`)

Projenin en etkileşim-yoğun formu (kural oluşturma sihirbazı). `btn-primary`, `btn-outline`, `back-btn`, `.seg`, `.tpl` (şablon kartı), `.act` (eylem kartı), `.add-cond`, `.cond-remove` — 8+ sınıfın hiçbirinde `:active` yok (satır 1397, 1501, 1623, 1671, 1693, 1785, 2443, 2473). Sihirbaz boyunca hiçbir tıklama tepki vermiyor.

| | Değer |
|---|---|
| **Önce** | Yalnızca hover background/border-color geçişi; `:active` kuralı yok |
| **Sonra** | Ortak blok: `transition: transform 140ms cubic-bezier(0.23, 1, 0.32, 1), background 150ms ease; &:active { transform: scale(0.97); }` — `.cond-remove` gibi küçük ikon butonlarda `scale(0.94)` |
| **Neden** | Emil: her tıklanabilir eleman basıldığında `scale(0.97)` almalı; en etkileşimli formda premium his tamamen eksik |

#### Toggle switch layout zıplaması (`components/seller/LayoutSectionCard.vue:37`)

Bölüm aç/kapa toggle'ının beyaz topuzu `transition-transform` sınıfı taşıyor ama animate edilen şey `left` (`left-[18px]` ↔ `left-0.5`). `transition-transform` yalnızca `transform`'u kapsadığı için topuz **hiç animasyonsuz zıplıyor**. Toggle, animasyonun en meşru olduğu yerlerden biri (durum göstergesi + geri bildirim); üstelik `left` animasyonu layout tetikler.

| | Değer |
|---|---|
| **Önce** | `class="transition-transform"` + durum `:class` ile `left-[18px]` / `left-0.5` arasında zıplar |
| **Sonra** | `left-0.5` sabit, durum transform ile: `:class="section.enabled ? 'translate-x-[14px]' : 'translate-x-0'"` + `transition: transform 0.15s cubic-bezier(0.23, 1, 0.32, 1)` |
| **Neden** | Animate edilen property (`left`) transition listesinde değil; transform GPU-dostu ve layout tetiklemez |

#### KPI kartı hover — kırık cascade (`assets/scss/cards.scss:32`)

Tüm dashboard'lardaki 4'lü KPI satırı. `.kpi-card { transition: all $t-slow } + &:hover { transform: translateY(-1px) }`, ama `KpiCard.vue` kökü `th-widget kpi-card` sınıflarını birlikte taşıyor ve `dashboard.scss` (main.scss:14) `cards.scss`'ten (main.scss:10) sonra yüklendiği için `dashboard.scss:342 .th-widget { transition: box-shadow ... }` aynı specificity ile kazanıyor. Etkin transition yalnız `box-shadow` olduğundan hover'daki `translateY(-1px)` **geçişsiz zıplıyor** (hem giriş hem çıkış).

| | Değer |
|---|---|
| **Önce** | `.kpi-card { transition: all $t-slow } &:hover { transform: translateY(-1px) }` — transform transition listesinde yok, hover guard'sız |
| **Sonra** | `.th-widget.kpi-card { transition: transform .2s cubic-bezier(0.23,1,0.32,1), box-shadow .2s ease; }` + hover'ı `@media (hover: hover) and (pointer: fine)` içine al. **B2B için önerilen: tıklanamayan karttan `translateY` lift'ini tamamen kaldır**, yalnız `box-shadow` bırak |
| **Neden** | İki SCSS'in aynı kartı stillemesi kırılgan cascade yarışı; tıklanamayan karta lift vermek yanlış affordance; dokunmatikte sticky hover |

#### Yeni Slide birincil CTA'sı (`views/system/HeroSliderView.vue:650`)

`.hs-btn-primary` — `cursor: pointer` dışında hiçbir şey yok: hover yok, `:active` yok, transition yok. Sayfanın birincil CTA'sı tamamen ölü.

| | Değer |
|---|---|
| **Önce** | Yalnız `cursor: pointer` |
| **Sonra** | `transition: background $t-base, transform 120ms cubic-bezier(0.23,1,0.32,1); &:hover { background: $brand-light; } &:active { transform: scale(0.97); }` |
| **Neden** | "Hiç feedback vermeyen buton = eksik" ilkesinin en net ihlali; aynı sayfadaki diğer elemanlar en azından hover değiştiriyor |

#### Optimistic update eksikliği (`views/crm/TasksListView.vue:453`)

Görev tamamlama checkbox'ı: `await store.setStatus(...)` bitene kadar UI'da **hiçbir** değişiklik yok, hata `catch { /* yoksay */ }` ile sessizce yutuluyor. Yavaş bağlantıda "çalışmıyor" hissi; başarısızlıkta ne toast ne geri alma var. Aynı dosyadaki `onKanbanStatusChange` (satır 487) doğru optimistic kalıbı zaten kullanıyor — tutarsız.

| | Değer |
|---|---|
| **Önce** | `await store.setStatus(...)` → UI donuk; `catch {}` sessiz |
| **Sonra** | `const prev = t.status; t.status = newStatus; try { await store.setStatus(...) } catch (e) { t.status = prev; toast.error(...) }` |
| **Neden** | Optimistic update: çizgi-üstü ve yeşil dolgu basıldığı anda görünür; hata görünür ve geri alınabilir |

---

### P2 — Yüksek etki: sık kullanılan aksiyon yüzeyleri

Aşağıdaki bulgular tek tek P2; ortak kök neden aynı olduğu için desen bazında birleştirildi.

#### Filtre pill'leri ve segment kontrolleri

`status-pill` ve segment butonları liste sayfalarında günde onlarca kez tıklanan birincil filtre yüzeyi — press feedback'in en çok hissedileceği yer.

| Dosya:satır | Sorun |
|---|---|
| `components/common/StatusFilterPills.vue:74` | `:active` yok, sadece hover renk |
| `components/common/BaseSegmented.vue:84` | `.seg-btn` sadece `transition: color $t-slow`, `:active` yok |
| `views/seller/SellerKpiList.vue:542`, `views/seller/SellerScoreList.vue:497` | `transition: all 0.15s` (token bypass) + `:active` yok + hover guard'sız; birbirinin kopyası |
| `views/crm/CallsListView.vue:19` (`crm.scss:144`) | `transition: all $t-fast` + `:active` yok |
| `components/system/ModuleMatrixTab.vue:1524` | `.seg-btn` hiç transition yok, `.on` durumu anlık zıplıyor |

**Reçete:** `transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.12s ease-out;` + `&:active { transform: scale(0.96); }` (küçük pill'de 0.97). Hover'ı `@media (hover: hover) and (pointer: fine)` arkasına al. `SellerKpiList`/`SellerScoreList` kopyaları ortak SCSS'e taşınmalı.

#### Toolbar ve datatable tıklanabilirleri (`components/common/datatable/DataTableToolbar.vue:67`)

Sütunlar, Filtreler, arama temizle, çip kapatma, drawer kapat, Tüm filtreleri temizle — 7 tıklanabilirin **hiçbirinde** `:active` yok. Ana butonlara `&:active { transform: scale(0.97); }` + `transition: transform 140ms cubic-bezier(0.23,1,0.32,1)`; küçük ikon butonlarda (çip x, arama x) scale yerine renk değişimi yeterli. İdeali `.hdr-btn-outlined` global seviyesinde çözmek.

#### Modal footer / aksiyon butonları

Yıkıcı veya sonuçlu eylemlerin son adımı — basma geri bildirimi tam burada güven verir.

| Dosya:satır | Eleman |
|---|---|
| `components/common/ConfirmDialog.vue:28` | Vazgeç/Onayla — `transition` yok, `:active` yok |
| `components/system/RoleProfileEditModal.vue:428` | `.btn/.btn.primary/.icon-btn` — transition'sız hover + `:active` yok |
| `components/system/HeroSlideEditModal.vue:643` | `hs-btn-primary/ghost/icon-btn/tab/seg__item` — 5 sınıf, sıfır geçiş |
| `components/system/CapabilityMatrixTab.vue:816` | `.btn/.plan-toggle/.close-btn/.modal-close/.bulk-btn` — `:active` yok |
| `components/system/ShowcaseTileEditModal.vue:356` | tabs/chip-group/icon-btn/color-reset — `.active` geçişsiz + `:active` yok |
| `components/system/NoticeEditModal.vue:255` | dil sekmeleri/icon-btn/color-reset — transition yok |

**Reçete:** `transition: background-color 0.12s ease, color 0.12s ease, transform 120ms cubic-bezier(0.23,1,0.32,1); &:active:not(:disabled) { transform: scale(0.97); }` — küçük ikon butonlarda `scale(0.94–0.96)`.

#### Navigasyon: rail, tab bar, mobil yüzeyler

| Dosya:satır | Sorun & Reçete |
|---|---|
| `components/layout/IconRail.vue:11` | `.rail-icon { transition: all 0.2s }` → `transition: background $t-base, color $t-base, transform 0.12s cubic-bezier(0.23,1,0.32,1); &:active { transform: scale(0.94); }` |
| `components/layout/MobileTabBar.vue:7` | `.m-tab-icon`'a `transform` transition + `.m-tab:active .m-tab-icon { transform: scale(0.92); }`; `.m-item/.m-sec-card`'a `&:active { transform: scale(0.98); }` (mobilde hover yok, `:active` tek kanal) |
| `views/products/CategoryManagementView.vue:2546` | `.cat-m-sh/.cat-m-more/.cat-m-addbar` — dokunuşta sıfır tepki; `transition: background-color 120ms ease, transform 140ms ease-out; &:active { transform: scale(0.98); background: $l-border; }` (addbar `0.99`) |
| `views/seller/SellerListingsView.vue:1529` | `.sl-fab` — FAB birincil mobil aksiyon; `transition: transform 120ms ease-out, box-shadow 120ms ease-out; &:active { transform: scale(0.96); box-shadow: ...; }` |

#### Mobil doctype ekranları (`CartMobile`, `OrderMobile`, `UserProfileMobile`)

Mobil bağlamda `:active` **tek** geri bildirim kanalı; bu ekranlarda buton sınıflarının çoğu yalnız `cursor: pointer` taşıyor.

| Dosya:satır | Sınıflar |
|---|---|
| `views/doctype/CartMobile.vue:389` | `.cm-qty-btn`, `.cm-item-del` — `transition` var ama geçireceği state yok |
| `views/doctype/OrderMobile.vue:560` | `.om-qa-btn`, `.om-sh-x`, `.om-btn-ghost`, `.om-btn-solid` |
| `views/doctype/UserProfileMobile.vue:624` | `.upm-qa-btn`, `.upm-sh-x`, `.upm-btn-ghost`, `.upm-btn-solid`, `.upm-mini-btn` (IBAN göster/gizle toggle) |

**Reçete:** `transition: transform 130ms ease-out, background 150ms ease; &:active:not(:disabled) { transform: scale(0.97); }` — solid butonlarda ek olarak `&:active { background: color.adjust($brand, $lightness: -6%); }`. Dokunmatik hedefte `:hover` eklenmemeli veya `@media (hover: hover)` arkasına alınmalı.

#### Checkbox durum geçişi (`views/crm/tabs/TasksTab.vue:41`, `views/crm/TasksListView.vue:142`)

Görev tamamlama: `bg-emerald-500 border-emerald-500` ↔ `border-gray-300` transition'sız zıplıyor; check ikonu `v-if` ile aniden beliriyor. En sık basılan mikro-eleman.

| | Değer |
|---|---|
| **Önce** | Sınıf swap'ı anlık; check `v-if` ile pat diye |
| **Sonra** | `.task-check { transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.1s cubic-bezier(0.23,1,0.32,1); &:active { transform: scale(0.9); } }` — check ikonu için enter: `opacity 0 + scale(0.5)` → 0.15s (asla `scale(0)`'dan değil) |
| **Neden** | Done/undone klasik bir geri bildirim anı; ani renk sıçraması durum değişimini yumuşatma amacını karşılamıyor |

#### Diğer P2 press eksiklikleri (birleştirilmiş)

| Dosya:satır | Eleman | Reçete özeti |
|---|---|---|
| `components/crm/UserPicker.vue:3` | tetikleyici + seçenek satırları | tetikleyici `scale(0.98)`; liste satırlarında scale yerine `:active { background }` |
| `components/dashboard/dynamic/DynamicQuickLinks.vue:11` | `.ql-item` kart-link | `transition: background-color .15s ease, transform .12s cubic-bezier(0.23,1,0.32,1); &:active { transform: scale(0.98); }` (transition-colors kaldır) |
| `components/dashboard/filters/GlobalFilterBar.vue:21` | preset/modül tab/retry (6 yüzey) | `.th-tab-btn:active, .th-module-tab:active, .th-retry-btn:active { transform: scale(0.97); }`; ikon butonlarda `scale(0.92)` |
| `views/dashboard/DynamicDashboard.vue:26` | dönem seçici + retry | `.period-btn:active { transform: scale(0.97); }`; hover'ı theme-aware yap (light temada `hover:bg-white/5` görünmez) |
| `components/system/PermissionOverviewTab.vue:437` | `.kpi/.btn.ghost/.banner-cta` | `.kpi` transition'ında `transform $t-fast` **ölü kod** — `&:active { transform: scale(0.98); }` ekle (küçük butonlarda 0.97) |
| `components/seo/GoogleSerpPreview.vue:40` | önizleme sekmeleri | sıfır hover/active/transition → `.seo-tab-btn { transition: ...; &:active { transform: scale(0.97); } }` |
| `components/seo/OgImageUpload.vue:63`, `LangToggle.vue:20`, `SeoTab.vue:180` | değiştir/kaldır, dil segment, kaydet/sıfırla | `transition-colors 150ms` + `&:active { transform: scale(0.97); }`; LangToggle'da `box-shadow`'u da transition'a ekle (seçili pill gölgesi pop ediyor) |
| `views/auth/LoginView.vue:64` | Giriş yap | `active:scale-[0.98]` + `transition-[background-color,transform] duration-150` |
| `views/billing/SubscriptionGateView.vue:687` | `.btn` (ödeme/trial CTA) | transition'a `transform 120ms ease-out` + `&:active:not(:disabled) { transform: scale(0.98); }` |
| `views/admin/CertVerificationView.vue:121`, `SellerVerificationQueueView.vue:142` | onayla/reddet/görüntüle (~10 yer) | `transition-colors duration-150 active:scale-[0.97]` |
| `views/buyer/BuyerTeamManagementView.vue:1090` | `.btn-primary` (mobil davet çubuğu dahil) | `transition: background $t-fast, transform 120ms ease-out; &:active:not(:disabled) { transform: scale(0.97); }` |
| `views/permission/PlansTab.vue:1401` (7 dosya) | tüm buton sınıfları | `@mixin pressable` ile `&:active:not(:disabled) { transform: scale(0.97); }` |
| `views/eca/EcaRulesView.vue:341`, `MyEcaRulesView.vue:237` | `.btn-primary/.btn-link/.ec-btn/.rule-body/.rule-delete` | `&:active { transform: scale(0.96–0.97); }`; koca tıklanabilir `.rule-body` için `:active { opacity: 0.7 }` |
| `views/messaging/BuyerMessagesView.vue:730`, `AvailabilityView.vue:643` | composer ikon + ikincil butonlar | `transform $t-fast` + `&:active:not(:disabled) { transform: scale(0.94–0.97); }` (AvailabilityView'da `.avl__primary` zaten `translateY(1px)` yapıyor — tutarsızlık) |
| `views/seller/MyVerificationsView.vue:21` | `active:scale-[0.97]` var ama `transition-colors` — transform geçişe dahil değil | `transition-[transform,background-color] duration-150 ease-out` |
| `views/seller/ListingFormView.vue:105`, `ListingReviewModerationView.vue:1327` | Kaydet + sheet butonları | `&:active { transform: scale(0.97); }` + `transform 120ms cubic-bezier(0.23,1,0.32,1)` |
| `views/seller/SubUserManagementView.vue:453` | `.btn-primary/secondary/ghost` | `&:active:not(:disabled) { transform: scale(0.97); }` |
| `views/system/AuthorizationSimulatorView.vue:370`, `ComplianceMaskMatrixView.vue:532`, `AnomalyDashboardView.vue:308`, `OwnerTransferView.vue:339` | `.btn-primary/secondary/link` | `transition: all` kaldır (Simulator); `$t-spring` (0.25s) çok yavaş, `120ms` yap (Compliance — transform transition'ı ölü kod); `&:active { transform: scale(0.97); }`; `.btn-link` için `:active { opacity: 0.7 }` |
| `views/permission/PlanComparisonTab.vue:111` | `.cmp-refresh` — hiç hover/active/transition | tam set ekle |

---

### P3 — Cilalama: press + geçiş rötuşları

P3 bulgular tek başına kritik değil ama toplamda "premium his" farkını yaratıyor. Desen bazında:

**Press eklenmesi gereken küçük/seyrek yüzeyler:** `SellerKybBanner.vue:180` (CTA — hover'ı `@media (hover: hover)` arkasına al, mobilde tam satır), `AppSelect.vue:159` (focus halkasını transition'a ekle + `:active { scale(0.98) }`), `KanbanBoard.vue:187` (`cursor: grab/grabbing` affordance'ı yok), `ListPagination.vue:14` (`scale(0.95)`), `IconPickerField.vue:77`, `CoreDocTypePicker.vue:107`, `GuidedTour.vue:163` (progress bar `transition-all` → `transition: width`), `SeoScoreBar.vue:51` (`scale(0.99)` — tam genişlik), `NoticeRow.vue:191` (`.slider` 0.15s hardcoded → `$t-base`), `LayoutPresetPicker.vue:94`, `ShowcaseTileRow.vue:206`, `ConditionBuilder.vue:367` (`.cb-add/.cb-remove` `scale(0.94)`), `AppLayout.vue:146` (`.th-goto-storefront-btn` 0.15s hardcoded), `views/bulk-import/BulkProductImportView.vue:1584` (`.tpl-btn`), `XmlMappingView.vue:802` (`.xc-new-*`), `views/buyer/procurement/ApprovedSuppliersView.vue:508` + `CostCenterTreeView.vue:352` (birebir kopya `.btn-primary/.btn-link` → ortak partial), `SubscriptionPaymentsView.vue:353` (`.btn--confirm/reject`), `views/seller/StorefrontEdit.vue:377` (yıkıcı X butonu + grid `<TransitionGroup>` move), `views/system/HeroSliderView.vue:607` (durum rozeti toggle), `RecommendationsSettingsView.vue:513` (yerel `.hdr-btn-*` kopyaları token bypass), `views/eca/EcaRuleFormView.vue` (küçük butonlar), `views/messaging/NotificationsView.vue:273` (satır `scale(0.995)`, load-more `0.97`).

**Layout shift / width zıplaması:** `components/seller/VariantWizard.vue:297` — check ikonu `v-if` ile eklendiğinde çip genişliği değişip komşuları itiyor; ikonu her zaman render edip `opacity` ile yönet (`w-3` sabit kalır).

---

### Hover geçişleri ve dokunmatik koruması

#### `transition: all` ve transition'sız hover'lar

| Dosya:satır | Sorun | Fix |
|---|---|---|
| `components/form-fields/ColorPresetField.vue:8` | `transition-all hover:scale-110` — 3 sorun: all yasak, `scale(1.10)` B2B'de fazla gösterişli (komşu swatch'lara taşar), `:active` yok | `transition: transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease;` + hover `scale(1.05)` `@media (hover: hover)` içinde + `:active { scale(0.97) }` |
| `views/crm/CrmDashboardView.vue:26` (`crm.scss:16`) | `.crm-kpi { transition: all $t-fast } &:hover { translateY(-1px) }` | `transition: transform 120ms cubic-bezier(0.23,1,0.32,1), box-shadow 120ms ease;` hover'ı guard'a al; `&:active { transform: translateY(0) scale(0.98); }` |
| `components/common/datatable/CategoryTreePicker.vue:84` | 5+ transition'sız Tailwind hover | `transition-colors` (150ms, yalnız renk) |
| `components/seller/LayoutSectionCard.vue:103` | ~6 transition'sız hover | `transition-colors duration-150` |
| `components/seller/SellerAddressesPanel.vue:86` | `transition-all hover:shadow-md`, kart tıklanabilir değil | all kaldır, `hover:shadow-md` kaldır (yanlış affordance) |
| `views/crm/settings/AssignmentRulesSettings.vue:48` (6+ yer) | `text-gray-400 hover:text-brand-700` transition'sız | `.crm-icon-btn { transition: color 0.12s ease, transform 0.1s cubic-bezier(0.23,1,0.32,1); &:active { transform: scale(0.92); } }` |

#### Sticky hover — `@media (hover: hover) and (pointer: fine)` eksik

Dokunmatikte tap sonrası yapışan hover durumları. Özellikle mobil-only bileşenlerde hover'ın hiçbir anlamı yok.

| Dosya:satır | Not |
|---|---|
| `assets/scss/mobile-nav.scss:272` | `.m-item/.m-sec-card` — **mobil-only** bileşende hover; sar |
| `components/dashboard/dynamic/DynamicQuickLinks.vue:15`, `SellerPicker` | Tailwind `hover:` → scoped SCSS + guard |
| `components/dashboard/widgets/KpiCard.vue:2` (`cards.scss:36`) | legacy `.kpi-card:hover translateY` cascade'de eziliyor → transform geçişsiz zıplar; legacy satırı kaldır |
| `assets/scss/dashboard.scss:346` | `.th-widget:hover` box-shadow guard'sız |
| `components/system/CapabilityMatrixTab.vue:973`, `PermissionOverviewTab.vue:445` | `.cell/tr` ve `.kpi` hover — matris toggle ana mobil etkileşim |
| `views/eca/MyEcaRulesView.vue:343` (dilim geneli), `views/permission/PlansTab.vue:1278` (7 dosya), `views/messaging/AvailabilityView.vue:849` (6+ yer) | `.rule-card/.plan-card/.avl__*` hover blokları sar; `:active` guard **dışında** kalmalı |
| `components/SellerTrialBanner.vue:59` | hover underline + arrow `translateX(2px)` yapışıyor; sar + `:active { scale(0.99) }` |

**Ortak çözüm:** `@mixin hover { @media (hover: hover) and (pointer: fine) { &:hover { @content; } } }` mixin'i ile tüm hover blokları sarılmalı.

#### Satır ve tablo hover'ları (tutarsızlık)

`views/seo/Seo404ReportView.vue:108`, `SeoPagesView.vue:302` (aynı view'da list modu yumuşak/tablo modu anlık), `SeoRedirectListView.vue:170`, `views/orders/ApprovalQueueView.vue:497`, `views/crm/CommissionAdminView.vue:42`, `views/bulk-import/XmlMappingView.vue:478`, `views/products/CategoryTranslationsView.vue:354` — global `.tbl-row` `background $t-fast` kullanırken bu sayfalar çıplak Tailwind hover kullanıyor. **Fix:** `transition-colors duration-100` (kısa tut — tabloda gezinirken kuyruklanmasın) + hover'ı guard'a al.

#### Hover-only görünürlük (dokunmatikte erişilemez)

`views/doctype/DocTypeFormView.vue:706` (galeri silme), `views/products/CategoryManagementView.vue:608` (kart düzenle/sil) — `opacity-0 group-hover:opacity-100` dokunmatikte butonu erişilemez kılıyor. **Fix:** `@media (hover: none) { opacity: 1 }` + `group-focus-within:opacity-100` (klavye).

#### Hover feedback'i hiç olmayan CTA'lar

`views/permission/FeatureCatalogTab.vue:860`, `PlanFeatureEditor.vue:572`, `UsersTab.vue:782` — `fc/pe/ue-btn-primary` yalnız `transition: opacity`, `:hover` yok. **Fix:** `&:hover:not(:disabled) { background: color-mix(in srgb, $brand 88%, #000); }`. Üç dosyadaki aynı kalıp ortak mixin'e işaret ediyor. Ayrıca `views/system/CategoryShowcaseView.vue:402` (`.hdr-btn-ghost` transition düşmüş — `HeaderNoticesView:285`'te doğru), `HeroSliderView.vue:625` (`.row-icon` transition yok).

---

### Form ve durum geri bildirimi

#### Native dialog kullanımı → toast

Panelde merkezi `useToast` (TransitionGroup'lu) sistemi varken native `alert()`/`confirm()`/`prompt()` kullanımı akışı bloklar, animasyonsuzdur ve premium hissi kırar.

| Dosya:satır | Fix |
|---|---|
| `views/orders/ApprovalQueueView.vue:287` | `prompt`→modal (fade + textarea), `alert`→`toast`; onay sonrası satır `TransitionGroup` leave |
| `views/sales/RfqDetail.vue:720` | `alert/confirm`→`toast` + modal-pop |
| `views/system/RecommendationsSettingsView.vue:373` | `useToast`; başarı `toast.success`, hata `toast.error` (referans: `SocialProofSettingsView`) |
| `views/system/ThemeManagerView.vue:1122` | `alert`→`toast` |

#### Focus halkası geçişleri

Focus ring'in ani belirmesi Tab ile gezinirken sert his verir; kısa `box-shadow` geçişi form gezinmesini yumuşatır.

| Dosya:satır | Fix |
|---|---|
| `components/seo/RedirectForm.vue:53` (5 alan) | `transition-shadow duration-150` |
| `components/seo/SeoFormFields.vue:48` | `transition-colors duration-150` (hata border'ı anlık; `SlugInput` doğru yapıyor) |
| `components/system/ShowcaseTileEditModal.vue:428` | focus tanımı **yok** → `&:focus { border-color: $brand; box-shadow: 0 0 0 2px rgba($brand,0.15); }` (`RoleProfileEditModal:313` kalıbı) |
| `views/doctype/OrderMobile.vue:1090`, `UserProfileMobile.vue:1026` | `transition: border-color 150ms ease, box-shadow 150ms ease` |
| `views/system/TrackingSettingsView.vue:334` | `transition: border-color $t-fast, box-shadow $t-fast` (halka senkronsuz çakılıyor) |
| `views/products/CategoryTranslationsView.vue:354` | inline düzenlenebilir hücre — `transition-[border-color,box-shadow,background-color] duration-150` |
| `views/buyer/BuyerTeamManagementView.vue:535` | `.org-search__field { transition: border-color 0.15s ease; }` |
| `views/system/RecommendationsSettingsView.vue:428` | 21 sayı alanı + Σ rozeti focus anlık — `transition-colors duration-150` |

#### Async sonuç / mesaj belirmesi (`<Transition>` ile yumuşat)

Büyük sonuç blokları ve hata/başarı mesajları `v-if` ile ani belirip layout'u zıplatıyor. Kalıp: enter `opacity: 0; transform: translateY(4px)` → `180–250ms cubic-bezier(0.23,1,0.32,1)`, çıkış kısa opacity.

| Dosya:satır | Eleman |
|---|---|
| `views/auth/LoginView.vue:22`, `layouts/AuthLayout.vue:26` | hata/alert kutuları |
| `views/bulk-import/SellerFeedView.vue:344`, `XmlMappingView.vue:519` | sonuç blokları, satır-içi form |
| `views/eca/EcaRuleFormView.vue:523` | dry-run/test/çakışma blokları (ortak `<Transition name="result">`) |
| `views/eca/EcaRuleFormView.vue:1717` | canlı eşleşme sayacı yeşil↔kırmızı — `transition: background-color 200ms ease` (keyframes değil, hızlı retarget) |
| `views/seller/SellerQuestionsView.vue:144` | inline yanıt formu açılımı |
| `views/seller/SuggestCertificationView.vue:46` | form→başarı geçişi `scale(0.97)` enter |
| `views/helpdesk/TicketDetailView.vue:214` | bekleyen dosya satırları `<TransitionGroup>` enter/leave/move |
| `views/products/CategoryTranslationsView.vue:374` | bayat çeviri uyarısı + 800ms yeşil check |

#### Kaydet onayı / dirty durumu

| Dosya:satır | Sorun | Fix |
|---|---|---|
| `views/crm/CommissionSettingsView.vue:76` | 'Kaydedildi.' ani belirir + **hiç kaybolmaz** | `<Transition name="fade">` + `setTimeout(2500)` veya `toast.success` |
| `views/system/CategoryShowcaseView.vue:16`, `HeaderNoticesView.vue:16` | dirty aksiyon çubuğu ani belirir/zıplar | `<Transition name="fade">` |
| `views/system/OwnerTransferView.vue:91`, `TrackingSettingsView.vue:77` | hata inline + kalıcı/çift kanal | `toast` veya `<Transition name="fade">` |
| `views/doctype/DocTypeFormView.vue:3274` | mobil kaydet çubuğu + `.dirty` renk/font-weight geçişsiz | `transition: color 150ms ease` (font-weight animate edilemez — sadece renkle ayırt et); `@starting-style` ile giriş |
| `views/permission/PlanFeatureEditor.vue:398` | `.pe-row.dirty` sarısı anlık | `transition: background-color 150ms ease` |
| `views/dashboard/DynamicDashboard.vue:78` | widget grid yenilemesi sessiz | `.grid-refreshing { opacity: 0.6; pointer-events: none; }` + `transition: opacity 150ms ease` |
| `views/crm/settings/IntegrationsSettings.vue:167` | loading state yok, değerler pat diye dolar | spinner/skeleton + `opacity 0→1 0.15s` |
| `views/seller/StorefrontLayoutEditor.vue:327` | 'Kaydediliyor/Kaydedildi' anlık swap | `<Transition name="fade" mode="out-in">` |

#### Loading / spinner tutarsızlıkları

`views/orders/ApprovalQueueView.vue:10` ve `views/permission/AuditLogTab.vue:60`: Yenile butonu `:disabled` bağlanmamış, ikon dönmüyor — çift tıklama riski. **Fix:** `:disabled="loading"` + ikona `class="spinning"` + `@keyframes { to { transform: rotate(360deg) } }` (sabit hareket → `linear`), `prefers-reduced-motion`'da `animation: none`. `AvailabilityView` doğru yapıyor — tutarsızlık.

#### Hücre / mikro geri bildirim

`components/common/datatable/EditableCell.vue:65` — commit sonrası hücre seviyesinde sinyal yok. **Fix:** tek seferlik `.cell-flash { animation: cellFlash 600ms ease-out; }` (`from { background: rgba(16,185,129,0.12) } to { background: transparent }`), `animationend`'de sınıf kaldır. `components/crm/CommentBox.vue:13` (buton genişliği zıplar → `min-width` + spinner), `components/seo/CharCounter.vue:23` + `SlugInput.vue:81` (`transition-colors duration-150` / fade + border-spinner), `components/upload/ProfileImageDropzone.vue:55` (uploading overlay `<Transition name="fade">` — success zaten fade alıyor, tutarsız).

---

### İyi örnekler (referans olarak korunmalı)

Denetim boyunca doğru yapılmış kalıplar da bulundu — bunlar standart için referans:

- **`views/messaging/AvailabilityView.vue`** — `.avl__primary` `:active { translateY(1px) }` press feedback'i var (ekranın diğer butonlarına yayılmalı); Yenile butonu doğru `disabled + avl__spin` yapıyor.
- **`views/seller/MyVerificationsView.vue`** — dilimde `active:scale-[0.97]` niyetini gösteren **tek** dosya (yalnız transition'a transform eklemek kalıyor).
- **`components/seo/SlugInput.vue`** — `transition-colors` ile hata/focus border'ını doğru yumuşatıyor (`SeoFormFields` bunu kaçırıyor).
- **`components/system/RoleProfileEditModal.vue:313`** — input focus'unda `border-color + box-shadow` ringi (`ShowcaseTileEditModal` bu kalıbı kaçırıyor).
- **`views/crm/TasksListView.vue:487`** (`onKanbanStatusChange`) — doğru optimistic update (aynı dosyanın checkbox'ı bunu kaçırıyor).
- **`components/upload/ProfileImageDropzone.vue`** success overlay ve **global `fade`** transition (`animations.scss`, `opacity 0.2s ease`) — hazır altyapı, çokça kullanılmalı.
- **`SocialProofSettingsView`** `handleSave` deseni — toast tabanlı kaydet geri bildiriminin referansı.

---

### Önerilen Standart

Bu bölümün tek tip reçetesi. Amaç: tek noktadan (global partial + mixin) çözülüp 40+ dosyadaki tekrarı kaldırmak.

**1. Token'lar (`variables.scss`):**
```scss
$ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1); // Emil ease-out
$t-press: 120ms;   // buton basma (100–160ms bandı)
$t-color: 150ms;   // hover/renk geçişi
```

**2. Press mixin (her tıklanabilir eleman):**
```scss
@mixin pressable($scale: 0.97) {
  transition: transform $t-press $ease-out-strong,
              background-color $t-color ease,
              border-color $t-color ease,
              color $t-color ease;
  &:active:not(:disabled) { transform: scale($scale); }
  @media (prefers-reduced-motion: reduce) {
    transition-duration: 0.01ms;
    &:active:not(:disabled) { transform: none; }
  }
}
```

**3. Hover-güvenli mixin (dokunmatik sticky hover'a karşı):**
```scss
@mixin hover {
  @media (hover: hover) and (pointer: fine) { &:hover { @content; } }
}
```

**4. Ölçek eşikleri (yüzey boyutuna göre):**

| Yüzey | `scale` |
|---|---|
| Küçük ikon butonu (32px, çip x, satır aksiyonu) | `0.92–0.94` |
| Standart buton / pill / sekme | `0.96–0.97` |
| Büyük yüzey (KPI kartı, tam-genişlik banner/satır, FAB) | `0.98–0.99` |
| Checkbox / toggle mikro-eleman | `0.90` |

**5. Kesin kurallar:**
- **`transition: all` yasak** — her zaman açık property listesi (`transform`, `opacity`, `background-color`, `border-color`, `color`, `box-shadow`).
- **UI etkileşimleri < 300ms**; press 100–160ms, renk/hover 120–200ms, sonuç enter 180–250ms.
- Giriş animasyonu **asla `scale(0)`'dan değil** — `scale(0.95)` + `opacity`'den başlat.
- Tüm `:hover` blokları `@include hover { ... }` ile sarılmalı; `:active` blokları guard **dışında** (dokunmatikte asıl feedback onlar).
- Hover-only görünürlük `@media (hover: none)` fallback'i ve `:focus-visible` eşleniği taşımalı.
- Layout tetikleyen özellik (`left`, `top`, `width`, `height`) animate edilmez → `transform` kullan.
- Native `alert()`/`confirm()`/`prompt()` yerine `useToast` + modal-pop; kaydet onayı geçici görünmeli (fade + 2.5s timeout ya da toast).
- Async aksiyonlar optimistic güncellenmeli; hata görünür ve geri alınabilir olmalı.
- Sabit dönüş hareketi (spinner) `linear`; UI geçişleri `ease-out`; `prefers-reduced-motion`'da transform kaldırılıp opacity korunmalı.

**6. Global uygulama noktaları (tek fix ile en geniş kapsam):**
- `header.scss` → `.hdr-btn-primary`, `.hdr-btn-outlined`, `.hdr-icon-btn` → `@include pressable;`
- `crm.scss` → `.crm-tab`, `.kanban-card`, `.status-pill`, `.crm-icon-btn`
- `helpdesk.scss` → `.hd-action`, `.hd-btn-primary`, `.hd-quick`, `.hd-kpi`, `.hd-tab`, `.hd-scope`, `.hd-prio`, `.hd-composer-tab` (+ `transition: all` kaldır)
- `tables.scss` → `.list-pagination-btn`, `.tbl-row`
- `buttons`/`forms` partial → `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.th-btn-*` (tanımsız aileyi tanımla veya `hdr-btn-*`'a geçir)
- `sidebar.scss` → `.rail-icon` (`transition: all 0.2s` kaldır)
- `mobile-nav.scss` → `.m-tab-icon`, `.m-item`, `.m-sec-card` + hover'ları guard'a al

---

## Modal, Popup, Dropdown ve Sheet Animasyonlari

Bu bolum panelin en yaygin ve en gorunur mikro-animasyon acigini kapsiyor: ekran ortasi diyaloglar (modal), tetikleyiciden acilan popover/dropdown menuleri, kenardan gelen drawer/slide-over yuzeyleri ve mobil bottom sheet'ler. Emil Kowalski'nin karar cercevesinde bu yuzeyler "ara sira gorulen UI" sinifina girer ve **standart bir enter/exit animasyonu hak eder** — cunku ani bir durum degisimini (ekranin yarisini karartmak, ortaya buyuk bir panel basmak) yumusatmak animasyonun en mesru kullanim amaclarindan biridir. B2B baglaminda bile bu gecisler "yavas ve gosterisli" olmak zorunda degil; tam tersine crisp, hizli (<300ms) ve gozle zar zor secilecek kadar zarif olmali. Ama **hic olmamalari** kabul edilemez: v-if ile aninda mount/unmount, ozellikle exit tarafinda "yok olma" hissi yaratir ve mekansal baglami koparir.

Denetimde bu alanda toplam **81 bulgu** tespit edildi. Dagilim carpici: modal ailesinin buyuk cogunlugu (yaklasik 28 inline modal + tum EditModal bilesenleri + merkezi `ConfirmDialog`) **sifir animasyonla** calisiyor. Buna karsin projede zaten hazir, dogru tasarlanmis kaliplar mevcut — `animations.scss`'teki global `fade` ve `dropdown` Vue Transition'lari, mobilde `m-sheet` iOS-egrili sheet kalibi, `SidePanel.vue`/`SlideOverPanel.vue`'nin backdrop fade'i. Yani sorun "nasil yapilacaginin bilinmemesi" degil, **mevcut kaliplarin tutarsiz uygulanmasi**. Ayni tip bilesenler ayni hareket dilini konusmali; su an aile icinde yarisi konusuyor, yarisi susuyor.

---

### 1. Merkezi sorun: Animasyonsuz modal ailesi (P1)

En kritik ve en tekrar eden bulgu. Ekran ortasi diyaloglarin ezici cogunlugu su desende:

```html
<div v-if="open" class="fixed inset-0 bg-black/50 ...">
  <div class="modal-card">...</div>
</div>
```

Cevresinde hicbir `<Transition>` yok. Backdrop aninda %100 opaklikta basiyor (siyah flas), panel aninda beliriyor, kapatirken ikisi de tek karede DOM'dan siliniyor — **exit animasyonu sifir**. Bu tam olarak Emil'in "premium his kirar" dedigi durum: yari-saydam siyah katmanin aniden gelmesi goz yorucu bir yanip sonme, panelin pat diye kaybolmasi ise "UI dinlemiyor" hissi verir.

Bu desen su dosyalarda birebir tekrarliyor (temsili liste; ayni kalip ~28 yerde):

| Dosya : Satir | Element |
|---|---|
| `components/common/ConfirmDialog.vue:4` | Merkezi onay diyalogu (20+ view kullaniyor) |
| `components/form-fields/CoreDocTypePicker.vue:54` | Veri kaynagi degisikligi onayi |
| `components/form-fields/IconPickerField.vue:53` | Ikon secim modali (54'lu grid) |
| `components/seller/SellerAddressesPanel.vue:326` | Adres silme onayi (yikici aksiyon) |
| `components/system/HeroSlideEditModal.vue:3` | Slide duzenleme (860px panel) |
| `components/system/NoticeEditModal.vue:2` | Duyuru duzenleme |
| `components/system/RoleProfileEditModal.vue:3` | Rol profili (backdrop-filter: blur(2px)) |
| `components/system/ShowcaseTileEditModal.vue:2` | Vitrin karosu (560px form) |
| `views/admin/CertVerificationView.vue:289` | Reddetme modali |
| `views/admin/SellerVerificationQueueView.vue:209,276,321` | Reject / Schedule / Edit (3 modal) |
| `views/admin/VerificationSourceView.vue:196` | Ekle/Duzenle |
| `views/buyer/BuyerTeamManagementView.vue:172` | Davet modali |
| `views/buyer/procurement/ApprovedSuppliersView.vue:103` | Liste duzenleme (blur(2px)) |
| `views/buyer/procurement/CostCenterTreeView.vue:49` | Masraf merkezi duzenleme |
| `views/doctype/DocTypeFormView.vue:1160,1281` | Reject + Preview modallari |
| `views/orders/ApprovalQueueView.vue:167` | Onay detay modali |
| `views/products/CategoryManagementView.vue:733,965,1000,1042,1093` | Ekle/Duzenle + 4 modal |
| `views/products/CategoryModerationView.vue:304` | Red gerekcesi modali |
| `views/products/ListingModerationView.vue:362,496` | Ilan detay + red gerekcesi |
| `views/regex/MyRegexPatternsView.vue:431,507` | Sutun/deger eslestirme |
| `views/regex/RegexPatternsView.vue:938,1001,1079,1241` | 4 Teleport modali (mobilde sheet) |
| `views/sales/RfqDetail.vue:262` | Ek dosya onizleme (tam ekran bg-black/85) |
| `views/seller/MyCertificationsView.vue:700,879,978,1047,1108,1242` | 6 modal |
| `views/seller/ListingFormView.vue:2596,2854` | Kategori secici + tamlik modali |
| `views/seller/SellerCategoriesView.vue:341,470` | Kategori ekle/duzenle |
| `views/seller/SellerOrdersView.vue:486,532,664` | Ship / Refund / Confirm (3 modal, mobilde sheet) |
| `views/seller/SellerListingsView.vue:654` | Inline duzenleme onayi |
| `views/seller/SubUserManagementView.vue:86` | Davet modali |
| `views/system/ComplianceMaskMatrixView.vue:176` | Politika duzenleme |
| `views/system/DelegationManagerView.vue:71` | Yetki devri modali |
| `views/system/OwnerTransferView.vue:59` | Devir talebi modali |
| `views/system/ThemeManagerView.vue:769,844` | Scale generator + reset onayi |
| `views/system/CapabilityMatrixTab.vue:644` | Bulk islem onayi (P2) |
| `views/system/ModuleMatrixTab.vue:617` | Korumali modul bilgisi (P2) |
| `views/helpdesk/*` (5 dosya, 7 modal) | AgentsView:178, CannedResponsesView:183, TeamsView:157/189, TicketTypesView:127, TicketsListView:80 |

**Emil review formati — Once / Sonra / Neden:**

| | Once | Sonra |
|---|---|---|
| **Backdrop** | `v-if` ile aninda `bg-black/50` (siyah flas) | `opacity: 0 → 1`, `200ms ease` (backdrop hafif once biter) |
| **Panel giris** | Aninda belirir | `opacity: 0 + scale(0.96) → 1`, `200ms cubic-bezier(0.23, 1, 0.32, 1)` |
| **Panel cikis** | Aninda yok olur (exit yok) | `opacity + scale`, `150ms ease-out` (girisden hizli) |
| **transform-origin** | — | `center` (modal istisnasi — ekran ortasi dialog merkezden buyur) |

**Neden:** Ani durum degisimini yumusatmak animasyonun mesru amaci. `scale(0.96)`'dan baslamak paneli "tetikleyiciden dogdu" degil "yerine oturdu" hissettirir — modal merkezde oldugu icin `transform-origin: center` istisnasi gecerli. **Asla `scale(0)`'dan baslatma** (balon gibi patlar, ucuz durur). Cikisin girisden hizli olmasi (150ms vs 200ms) Emil'in asimetri ilkesi: kullanici zaten "bitir" kararini verdi, cikisi bekletme.

**Onerilen ortak recete** — `animations.scss`'e tek sefer eklenip tum merkez dialoglarda kullanilmali:

```scss
.modal-enter-active, .modal-leave-active { transition: opacity 200ms ease; }
.modal-enter-active .modal-box,
.modal-leave-active .modal-box {
  transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms ease;
}
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-box,
.modal-leave-to .modal-box { opacity: 0; transform: scale(0.96); }
.modal-leave-active .modal-box { transition-duration: 150ms; } /* cikis hizli */

@media (prefers-reduced-motion: reduce) {
  .modal-enter-from .modal-box, .modal-leave-to .modal-box { transform: none; }
}
```

En kalici cozum: `SellerVerificationQueueView` (3 modal), `CategoryManagementView` (5 modal), `MyCertificationsView` (6 modal) gibi ayni markup'i tekrarlayan dosyalarda ortak bir **`BaseModal`** bileseni cikarmak. `reduced-motion`'da transform'u kaldir, opacity gecisini koru.

**Native diyalog istisnasi:** Bazi view'lar animasyon eksigini `window.confirm()`/`prompt()`/`alert()` ile daha da agirlastiriyor — bunlar stillenemeyen, thread'i bloklayan, tema disi (dark mode uyumsuz) tarayici diyaloglari, sifir marka gecisi tasir:

- `views/billing/SubscriptionPaymentsView.vue:58` — confirm + prompt (P3)
- `views/crm/CommissionAdminView.vue:115` ve `CommissionTeamView.vue:109` — `prompt("Red sebebi:")` (P2)
- `views/system/AnomalyDashboardView.vue:164` — prompt + alert, 4 yerde (P2)
- `views/seller/SubUserManagementView.vue:173,211,222,227,244` — prompt/confirm/alert, 5 yerde (P3)

Cozum: mevcut `ConfirmDialog` + `askConfirm` Promise kalibina (`CertVerificationView` ornegi) veya sebep girisi gereken akislarda `QuickCreateDrawer`/textarea'li modal varyantina tasi.

---

### 2. Drawer ve slide-over: katman senkron sorunu (P2)

CRM `QuickCreateDrawer` ailesinde kalip **var ama katmanlar senkron degil**. Backdrop panelden ~2 kat hizli bitiyor: `crm.scss`'te overlay `transition: opacity $t-fast` (0.12s) iken drawer `transition: transform $t-spring` (0.25s cubic-bezier(0.4, 0, 0.2, 1)). Sonuc: acilista karartma panel yerine oturmadan tamamlanir, kapanista backdrop yok olduktan sonra panel 130ms daha scrim'siz kayar. **Mekansal butunluk kopar.**

Etkilenen yuzeyler: `assets/scss/crm.scss:671,685,689` (overlay + drawer), `components/crm/QuickCreateDrawer.vue:41`, `views/crm/DealDetailView.vue:191` (Kaybedildi diyalogu), DealsListView "Yeni Firsat", TaxonomySettings olusturma/duzenleme.

| | Once | Sonra |
|---|---|---|
| **Overlay** | `opacity 0.12s ease` | `opacity 0.25s ease` (panelle ayni pencere) |
| **Drawer easing** | `0.25s cubic-bezier(0.4, 0, 0.2, 1)` (Material, ease-in agirlikli baslar) | `0.3s cubic-bezier(0.32, 0.72, 0, 1)` (iOS egrisi) |
| **reduced-motion** | Guard yok (92vw slide zorla oynuyor) | `transform: none; opacity fade` varyanti |

**Neden:** Iliskili elemanlarin sureleri hizali olmali. Emil drawer/sheet icin generic Material curve yerine iOS egrisi (`cubic-bezier(0.32, 0.72, 0, 1)`) onerir — girip cikarken hantal baslamaz. Ek olarak `QuickCreateDrawer.vue:41`'de **body scroll lock yok** (P3): drawer acikken arka plan kayabiliyor, dokunmatikte overlay uzerinde swipe sayfayi kaydiriyor. `watch(modelValue, open => document.documentElement.style.overflow = open ? 'hidden' : '')` + `onUnmounted` sifirlama gerekli.

**Cift animasyon mekanizmasi** (`components/dashboard/layout/SlideOverPanel.vue:3`, P2): Hem `<Transition name="slide-over">` scoped siniflari hem `:class="{ visible }"` ile `dashboard.scss`'teki global `.th-slide-*.visible` kurallari **ayni elemani** anime ediyor. Iki bagimsiz kaynak ayni opacity/transform'u yonetince ozgullukte yarisir; su an calissa da sure/easing tek yerden degistirilemez, ileride sessizce kirilir. Cozum: `:class="{ visible }"` binding'lerini (satir 7, 10) ve `.visible` SCSS bloklarini sil, animasyonu yalniz Vue Transition'a birak.

---

### 3. Bottom sheet: keyframe → transition ve exit eksigi (P1)

Mobil bottom sheet'lerde tipik anti-kalip: **giris `@keyframes` ile animasyonlu, cikis animasyonsuz** (`v-if` ani unmount). Keyframe'in iki sorunu var — (1) exit animasyonunu imkansiz kilar, (2) hizli ac/kapa'da kesintiye ugrayinca **retarget edemez**, bastan oynar (Sonner ilkesi: hizli tetiklenen UI'da `transition` kullan, keyframe degil).

| Dosya : Satir | Once | Sorun |
|---|---|---|
| `views/doctype/OrderMobile.vue:108` | `om-slide-up 0.26s cubic-bezier(0.16,1,0.3,1)` giris, cikis yok | Giris/cikis asimetrisi tamamen bozuk |
| `views/doctype/UserProfileMobile.vue:80` | `upm-slide-up 0.26s` giris, cikis yok | OrderMobile ile birebir ayni |
| `views/permission/FeatureCatalogTab.vue:1260` | `fc-slide-up 0.26s cubic-bezier(0.16,1,0.3,1)` | Kapanis ani, retarget yok |
| `views/products/CategoryManagementView.vue:2492` | `catMSheetIn 0.25s cubic-bezier(0.3,0.9,0.3,1)` | 3. ad-hoc egri turetilmis, m-sheet varken |
| `views/permission/PlansTab.vue:203` | Sheet 260ms, backdrop `v-if` 0ms | Backdrop aninda karariyor, sheet kayarken |

**Sonra (ortak recete):** `v-if`'i `<Transition name="m-sheet">` ile sar, keyframe'leri sil:

```scss
.m-sheet-enter-active, .m-sheet-leave-active {
  transition: transform 260ms cubic-bezier(0.32, 0.72, 0, 1);
}
.m-sheet-enter-from, .m-sheet-leave-to { transform: translateY(100%); }
.m-sheet-leave-active { transition-duration: 200ms; } /* cikis biraz hizli */
```

Backdrop ayri `<Transition name="fade">` (opacity 180ms enter / 150ms leave). Projede zaten dogru `m-sheet` kalibi (transform 0.26s `cubic-bezier(0.32, 0.72, 0, 1)`, translateY(105%)) mevcut — `CategoryManagementView` ucuncu bir egri turetmek yerine bunu kullanmali. `reduced-motion`'da `transition: none` yerine `transition-duration: 0.01ms` (Transition'in leave-end event'i tetiklensin diye).

**Neden:** Sheet "ayni yonden girer ve cikar" (mekansal tutarlilik). Alttan yukselen bir yuzeyin aniden yok olmasi metaforu bozar. `FeatureCatalogTab` ve `PlansTab` icin iyi haber: ayni dosyada dogru `panes-host` kalibi zaten var — kopyalanmasi yeterli.

---

### 4. Dropdown ve popover: hazir kalip kullanilmiyor (P1/P2)

Projede `animations.scss`'te tanimli global **`dropdown`** Vue Transition (enter 0.15s / leave 0.1s, `opacity + translateY(-4px)`) var ve `AppSelect`, `NotificationPanel`, `LanguageSwitcher` bunu dogru kullaniyor. Ama ayni tur yuzey pek cok yerde **`v-if` ile ciplak** acilip kapaniyor — ayni sayfada bir menu animasyonlu, digeri degil (tutarsizlik).

| Dosya : Satir | Element | Oncelik |
|---|---|---|
| `components/common/datatable/DataTableToolbar.vue:41` | Sutunlar dropdown menusu | P1 |
| `components/crm/UserPicker.vue:15` | Kullanici secim paneli | P1 |
| `views/buyer/BuyerTeamManagementView.vue:121` | Satir ⋯ menusu (.menu-pop) | P1 |
| `components/common/LinkInput.vue:27` | Link arama dropdown (Teleport) | P2 |
| `components/common/LinkTreePicker.vue:222` | .ltp-pop agac/arama secici (240-360px) | P2 |
| `components/common/datatable/DataTable.vue:113` | Sutun filtre popover'i | P2 |
| `components/dashboard/SellerPicker.vue:63` | Satici arama dropdown (w-72) | P2 |
| `components/form-fields/CoreDocTypePicker.vue:27` | DocType arama sonucu | P2 |
| `views/doctype/DocTypeFormView.vue:365` | Link alani autocomplete | P2 |
| `views/seller/SellerListingsView.vue:28` | Masaustu 'Disa Aktar' menusu | P2 |
| `views/helpdesk/TicketDetailView.vue:49,301` + `TicketsListView:20` | agent/hazir yanit/filtre dropdownlari | P2 |
| `components/layout/AppHeader.vue:68` | GlobalSearch sonuc paneli | P2/P3 |

**Ozel not — TicketDetailView:** `.hd-dropdown { animation: hdSlideDown 0.16s ease both }` (helpdesk.scss:1028) — giris keyframe'li **ama cikis animasyonsuz** (280-320px panel aniden yok oluyor). Keyframe retarget edemez. Cozum: `animation` satirini kaldir, `<Transition name="dropdown">` ile sar, keyframe'i sil.

| | Once | Sonra |
|---|---|---|
| **Giris** | `v-if` aninda | `opacity: 0 + translateY(-4px) → 0`, `150ms cubic-bezier(0.23, 1, 0.32, 1)` |
| **Cikis** | Aninda / yok | `100ms ease` (girisden hizli) |
| **transform-origin** | tanimsiz (center) | Sag-hizali panel `top right`, sol `top left` |

**Neden:** Popover/dropdown tetikleyiciden "buyuyormus" gibi hissettirmeli — bu yuzden `transform-origin` **center degil, tetikleyici kenarindan** olmali. `UserPicker.vue:13`'te ek bir dusuk maliyetli firsat var (P3): chevron ikonu acik/kapali durumda donmuyor. `:class="[..., open ? 'rotate-180' : '']"` + `transition-transform duration-200` ile durum tetikleyiciden okunur hale gelir.

**GlobalSearch ozel durumu:** `AppHeader.vue:68` panel ilk acilista dropdown gecisini almali, **ama ic sonuc listesi (v-for) yazarken animasyonsuz kalmali** — yuksek frekansli guncellemede retarget/kesinti yasanmaz, bu dogru davranis, dokunulmaz.

---

### 5. transform-origin ilke acigi ve yon celiskisi (P2/P3)

Iki yapisal bulgu:

**(a) Global dropdown origin merkezden** (`assets/scss/animations.scss`, P2): Tum dropdownlar `translateY(-4px)` jenerik nudge ile aciliyor, `transform-origin` hicbirinde tanimsiz (default center), scale yok. Kalip tutarli ama ilke acisindan eksik — tetikleyiciyle mekansal bag yok. Oneri: `transform: translateY(-4px) scale(0.98)` + panel CSS'inde `transform-origin: top center` (sag-hizalida `top right`).

**(b) Yukari acilan popover asagi yonlu animasyon** (`components/navigation/QuickLinksDropdown.vue:2` + `UserMenuDropdown.vue:2`, P3): Bu paneller sol rail'in **ustunde** (bottom-[160px] left-[78px]) aciliyor ama global `dropdown` transition'i `translateY(-4px)` yani **yukaridan asagi** kayma varsayar. Yani panel tetikleyiciden **uzaklasan** yonden geliyor — mekansal tutarlilik ilkesine dogrudan aykiri.

| | Once | Sonra |
|---|---|---|
| **Yon** | `translateY(-4px)` (tepeden asagi) | `translateY(4px)` (alttan, tetikleyici yonunden) |
| **origin** | center | `bottom left` |

Lokal override: `name="popup-up"`, `.popup-up-enter-from { opacity: 0; transform: translateY(4px) scale(0.98); }`, `transform-origin: bottom left`, 150ms ease-out.

**NotificationPanel mobil** (`components/layout/NotificationPanel.vue:2`, P2): ≤767px'te panel `inset:0` tam ekran sheet'e donusuyor ama hala `dropdown` animasyonuyla (4px nudge) aciliyor — tam ekran yuzeyin dropdown gecisiyle belirmesi mekansal olarak yanlis. Cozum: `<Transition :name="isMobile ? 'fade' : 'dropdown'">` (useBreakpoint mevcut) veya m-sheet tarzi `translateY(16px)`.

**AppHeader arama paleti** (`components/layout/AppHeader.vue:231`, P3): `hdr-search-sheet` simetrik 0.2s fade — komut paleti tarzi sik acilan yuzeyde algilanan hiz kritik, cikis girisden hizli olmali. `.palette-enter-active { opacity 0.15s }` / `.palette-leave-active { opacity 0.1s }` veya (100+/gun kullanimda) animasyonu tamamen kaldirmak da gecerli.

**GuidedTour** (`components/layout/GuidedTour.vue:127`, P3): Ekranin %62'sini karartan tam ekran overlay + coach karti animasyonsuz beliriyor. Nadir/ilk-kez yuzey oldugu icin global `fade` yeterli; coach kartina `scale(0.95) + opacity` girisi eklenebilir.

---

### Onerilen Standart

Bu alan icin tek tip recete. Uc yuzey sinifi, uc kalip:

**1. Modal (ekran ortasi dialog) — istisna: transform-origin center**
```scss
/* animations.scss — tum merkez dialoglar (BaseModal) */
.modal-enter-active, .modal-leave-active { transition: opacity 200ms ease; }
.modal-enter-active .modal-box, .modal-leave-active .modal-box {
  transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms ease;
}
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-box, .modal-leave-to .modal-box { opacity: 0; transform: scale(0.96); }
.modal-leave-active .modal-box { transition-duration: 150ms; }
```
- Backdrop opacity 200ms ease (hafif once biter), panel `scale(0.96) → 1` — **asla scale(0)**.
- Cikis girisden hizli (150ms). `transform-origin: center` (modal istisnasi).
- Native `confirm/prompt/alert` **yasak** — hepsi bu kaliba tasinir.

**2. Drawer / Slide-over — iOS egrisi**
```scss
.crm-drawer { transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
.crm-drawer-overlay { transition: opacity 0.25s ease; } /* panelle hizali pencere */
```
- Body scroll lock zorunlu. Tek animasyon kaynagi (Vue Transition VEYA class binding, ikisi birden degil).

**3. Bottom sheet (mobil) — keyframe yasak, transition zorunlu**
```scss
.m-sheet-enter-active, .m-sheet-leave-active { transition: transform 260ms cubic-bezier(0.32, 0.72, 0, 1); }
.m-sheet-enter-from, .m-sheet-leave-to { transform: translateY(100%); }
.m-sheet-leave-active { transition-duration: 200ms; }
```
- Backdrop ayri `fade`. Ayni yonden girer/cikar. Kesintiye ugrayinca retarget edebilmeli.

**4. Dropdown / Popover — origin tetikleyiciden**
```scss
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px) scale(0.98); }
.dropdown-enter-active { transition: opacity 150ms ease, transform 150ms cubic-bezier(0.23, 1, 0.32, 1); }
.dropdown-leave-active { transition: opacity 100ms ease, transform 100ms ease; }
```
- `transform-origin`: asagi acilan `top` (sag-hizali `top right`), yukari acilan `bottom` — **asla center**.
- Yukari acilan paneller icin `popup-up` varyanti (`translateY(4px)`, `bottom left`).
- Yuksek frekansli ic icerik (arama sonuclari) animasyonsuz kalir.

**5. Genel kurallar**
- Tum UI gecisleri <300ms. Giris 150-260ms, cikis girisden %25-40 hizli.
- Ease-out egrisi: UI icin `cubic-bezier(0.23, 1, 0.32, 1)`, drawer/sheet icin iOS `cubic-bezier(0.32, 0.72, 0, 1)`. Generic Material `cubic-bezier(0.4, 0, 0.2, 1)` kullanma.
- `transition: all` **yasak** — yalniz `opacity` ve `transform` (GPU dostu).
- Her yuzeyde `@media (prefers-reduced-motion: reduce)`: transform'u kaldir, opacity fade'i koru.
- B2B = crisp/hizli/gosterissiz; ani degisim yumusatilir ama abartilmaz.

---

## 4. Toast ve Bildirim Sistemi

Toast katmani, bu panelin en gorunur ve en sik tetiklenen geri bildirim yuzeyidir. Bir kayit kaydedildiginde, bir izin degistiginde, toplu bir islem tamamlandiginda kullaniciya "sistem seni duydu" hissini veren tek yer burasidir. Emil Kowalski'nin defalarca vurguladigi gibi, bir toast sistemi teknik olarak "calisiyor" olabilir ama yine de ucuz hissettirebilir. Fark; girisin nereden geldigi, cikisin ne kadar hizli oldugu, stack'in bir eleman silindiginde nasil toparlandigi ve kullanicinin toast'i okumaya vaktinin olup olmadigi gibi gorunmez detaylarda gizlidir. Sonner (Emil'in kendi toast kutuphanesi) tam olarak bu detaylari standartlastirmak icin dogdu: transition tabanli giris/cikis, mekansal olarak tutarli stack hareketi, hover'da duraklayan timer, sekme gizlenince donan zaman, ve girdigi yonden kaydirilarak atilabilme.

Yaptigimiz denetimde toast sisteminin **mimari iskeletinin dogru** oldugunu gorduk: merkezi bir `useToast` composable var, tek bir `ToastContainer` global olarak monte edilmis, giris/cikis yonu (sagdan gir, saga cik) tutarli kurgulanmis. Ancak uygulamanin detayinda **Sonner ilkelerinin neredeyse tamami kirik**: stack reflow animasyonu hic tanimli degil, giris/cikis keyframe ile yapilmis (transition degil), ayni animasyon iki kez tanimlanmis, kapatma iki asamali ve ~600ms suruyor, timer ne hover'da ne sekme gizlendiginde duruyor, gorunur toast sayisinda ust sinir yok. Bunlarin toplami; hizli ardisik toast geldiginde ziplayan, X'e basildiginda 300ms donmus kalan, kullanici okurken kaybolan bir yuzey uretiyor.

Ayrica merkezi sistemin **disinda** iki ayri yerde el yapimi toast/inline-durum mesaji tespit ettik (`DashboardManagerView.vue` ve `PermissionConsoleView.vue`) — biri hic animasyonsuz, digeri `transition: all` kullaniyor. Bunlarin ikisi de ya merkezi `useToast`'a devredilmeli ya da ayni receteyle hizalanmali.

Toplam 11 bulgunun 4'u P1 (kritik, sistemin cekirdegini bozuyor), 4'u P2, 3'u P3. Asagida once cekirdek `useToast` + `ToastContainer` + `animations.scss` uclusunu, sonra merkez disi iki yuzeyi, en sonda Sonner-seviyesi olgunluk ozelliklerini (hover pause, visibility pause, swipe, max-visible) ele aliyoruz.

---

### 4.1 Cekirdek: Stack reflow animasyonu hic yok (P1)

**Dosyalar:** `assets/scss/animations.scss:92`, `components/layout/ToastContainer.vue:3`

Bu bolumun en agir bulgusu. `ToastContainer.vue` bir `<TransitionGroup name="toast">` kullaniyor, ama `TransitionGroup`'un can alici sinifi olan `.toast-move` **hicbir SCSS dosyasinda tanimli degil**. Ayrica cikan elemana `position: absolute` verilmemis. Bu iki eksigin birlesimi su davranisi uretiyor:

1. Bir toast kapatilinca, cikan eleman `.toast-leave-active` boyunca (0.3s) hala layout akisinda **yer kaplamaya devam ediyor**.
2. Cikis animasyonu bitip eleman DOM'dan gercekten dusünce, altindaki toast'lar bir tek karede **animasyonsuz yukari zipliyor**.

`.toast-move` sinifi olmadan `TransitionGroup` kalan elemanlarin pozisyon degisimini yumusatamaz; bu yuzden stack her silme isleminde sarsiliyor. Emil'in Sonner ilkesinde stack **mekansal olarak tutarli** hareket etmeli: bir eleman cikinca kalanlar akici sekilde yukari kaymali, ziplamamali.

| | Deger |
|---|---|
| **Sorun** | `.toast-move` tanimsiz + cikan elemana `position:absolute` yok → stack silmede ziplar |
| **Once** | `.toast-move { /* yok */ }` · `.toast-leave-active { /* absolute degil */ }` |
| **Sonra** | `.toast-leave-active { position: absolute; right: 0; width: 100%; }`<br>`.toast-move { transition: transform 240ms cubic-bezier(0.23, 1, 0.32, 1); }` |
| **Neden** | Cikan eleman `absolute` ile layout akisindan cikinca kalan toast'lar aninda degil, `.toast-move` transition'i ile yumusakca yukari toparlanir. Konteyner zaten `flex-col`; mekansal tutarlilik saglanir. Toast'larin `min-width: 280px` sabiti oldugu icin absolute konumda genislik korunur. |

---

### 4.2 Cekirdek: Giris/cikis keyframe ile yapilmis + cift tanim (P1)

**Dosyalar:** `assets/scss/animations.scss:88`, `assets/scss/forms.scss:189`, `components/layout/ToastContainer.vue:4`

Toast giris/cikisi su an **keyframe animasyonu** ile calisiyor:

```scss
.toast-enter-active { animation: toastIn 0.3s ease; }
.toast-leave-active { animation: toastOut 0.3s ease forwards; }
```

Bunun ustune `forms.scss:189`'da `.toast` base sinifi da ayni `animation: toastIn 0.3s ease`i **ikinci kez** tasiyor. Yani bir toast girdiginde animasyon **iki kez tanimli** — hem base `.toast`'ta hem `.toast-enter-active`'te. Bu, hafif bir titreme/cift oynama yaratiyor ve olu koddur.

Asil ilke ihlali ise keyframe kullaniminda: Emil'in kurali, **hizli tetiklenen UI'da keyframe degil transition kullanilmali**. Sebebi somut: keyframe kesintiye ugrayinca **bastan baslar, retarget edemez**. Toplu islem sonrasi ust uste 3-4 toast geldiginde, henuz giris keyframe'i bitmeden yeni eleman eklenirse animasyon takilir/ziplar. Transition ise mevcut degerden hedefe akici sekilde retarget eder.

Ek olarak giris ve cikis **simetrik 0.3s jenerik ease** — Sonner ilkesine gore cikis, girise gore **biraz daha hizli** olmali (kullanici zaten kapatmaya karar vermis, beklemesin).

| | Deger |
|---|---|
| **Sorun** | Keyframe (retarget edemez) + cift tanim (base + enter-active) + simetrik jenerik ease |
| **Once** | `.toast-enter-active { animation: toastIn 0.3s ease; }`<br>`.toast-leave-active { animation: toastOut 0.3s ease forwards; }`<br>`.toast { animation: toastIn 0.3s ease; }` (forms.scss:189, fazladan) |
| **Sonra** | `forms.scss:189`'daki `animation: toastIn 0.3s ease;` **silinir** (base'te animasyon olmamali).<br>`.toast-enter-active, .toast-leave-active { transition: transform 240ms cubic-bezier(0.23, 1, 0.32, 1), opacity 240ms cubic-bezier(0.23, 1, 0.32, 1); }`<br>`.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(24px); }`<br>Cikisi biraz hizlandirmak icin (opsiyonel ama onerilir): `.toast-leave-active { transition: transform 180ms ease, opacity 180ms ease; }` |
| **Neden** | Transition, kesintili eklemede retarget olur — ziplama gider. Cift tanim silinince titreme kalkar. `translateX(24px)` giris yonu (sagdan) `.toast-move` ve olasi swipe yonuyle tutarlidir. |

> Not: `toastIn`/`toastOut` keyframe'leri baska hicbir yerde kullanilmiyorsa `animations.scss`'ten tamamen silinebilir (olu kod temizligi).

---

### 4.3 Cekirdek: Kapatma iki asamali ve ~600ms surüyor (P1)

**Dosya:** `composables/useToast.js:21`

`remove(id)` fonksiyonu su an iki asamali calisiyor:

1. Once `toasts.value[idx].removing = true` set ediyor.
2. Sonra `setTimeout(300ms)` ile diziden `filter`liyor.
3. Diziden cikinca `TransitionGroup` `.toast-leave-active` ayrica `toastOut 0.3s` oynatiyor.

Iki kritik problem var. Birincisi, `removing` bayragi **ne template'te ne CSS'te okunuyor** — tamamen olu state. Ikincisi ve daha kotusu, cikis **iki asamali ve toplam ~600ms** suruyor: kullanici X'e bastiktan sonra ilk 300ms boyunca toast **gorsel olarak DONMUS** kaliyor (kimse `removing`i okumadigi icin hicbir sey olmuyor), sonra diziden cikinca ikinci 300ms'de gercek cikis oynuyor. Kullanici acisindan bu, "X'e bastim ama UI beni dinlemiyor" hissidir — Emil'in en cok karsi durdugu duygu.

Sonner ilkesi net: cikis **basisla ayni anda** baslar, tek asamalidir ve girise gore biraz hizlidir.

| | Deger |
|---|---|
| **Sorun** | Manuel 300ms gecikme + olu `removing` state → basisla cikis arasi ~300ms donma, toplam ~600ms |
| **Once** | `function remove(id){ const idx = ...; toasts.value[idx].removing = true; setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, 300); }` |
| **Sonra** | `function remove(id){ toasts.value = toasts.value.filter(t => t.id !== id); }` |
| **Neden** | Cikis animasyonunu tamamen `TransitionGroup`'a birak — `.toast-leave-active` zaten (4.2 sonrasi ~180-240ms) cikisi oynatir. Basisla ayni anda, tek asama. Olu `removing` state ve manuel timer temizlenir. |

---

### 4.4 Merkez disi: DashboardManagerView inline durum mesaji animasyonsuz (P3)

**Dosya:** `views/system/DashboardManagerView.vue:243`

"Siralama kaydedildi" durum mesaji (`reorderStatus`) merkezi toast sistemini **kullanmiyor**; el yapimi bir inline toast-benzeri geri bildirim. `v-if` ile ani beliriyor, `setTimeout(2500)` ile ani kayboluyor. Hem giriste hem cikista animasyon yok; 2.5 saniye sonra metin aniden yok olunca **layout shift** oluyor (yerlesim toparlaniyor).

| | Deger |
|---|---|
| **Sorun** | Inline durum mesaji animasyonsuz belirip kayboluyor + kaybolunca layout shift |
| **Once** | `<span v-if="reorderStatus">...</span>` + `setTimeout(2500)` |
| **Sonra (tercih edilen)** | Bu mesaji tamamen sil, mevcut `useToast` composable'ini cagir — global toast zaten (recete sonrasi) animasyonlu ve tutarli. |
| **Sonra (alternatif)** | `<Transition name="fade">` ile sar; kapsayiciya `min-height` verip layout shift'i engelle. |
| **Neden** | Tek bir toast standardi olmali. Ayni panelde bir yerde animasyonlu global toast, baska yerde animasyonsuz inline mesaj olmasi tutarsizlik uretir; `useToast`'a devretmek en temiz cozumdur. |

---

### 4.5 Merkez disi: PermissionConsoleView hata toast'i `transition: all` kullaniyor (P2)

**Dosya:** `views/system/PermissionConsoleView.vue:884`

Bu ekran kendi hata toast'ini kendi Vue `Transition`'i ile yonetiyor ve `transition: all $t-spring` (`0.25s cubic-bezier(0.4, 0, 0.2, 1)`) kullaniyor. Iki sorun:

- **`transition: all` yasak.** `opacity` ve `transform` disindaki her property'yi de dinletiyor (renk, gölge, boyut...) — beklenmedik animasyonlar ve gereksiz reflow maliyeti dogurur. Emil kurali: sadece animasyonu istedigin property'leri acikca yaz.
- Giris/cikis **simetrik** — cikis girisden biraz hizli olmali.

Iyi olan kisim: yon tutarliligi dogru kurgulanmis (alt kenardan girip alta cikiyor, `translateY(8px)`). Bu korunmali.

| | Deger |
|---|---|
| **Sorun** | `transition: all` (opacity/transform disini de dinliyor) + simetrik sure |
| **Once** | `.toast-enter-active, .toast-leave-active { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }` |
| **Sonra** | `.toast-enter-active { transition: transform 250ms cubic-bezier(0.23, 1, 0.32, 1), opacity 250ms cubic-bezier(0.23, 1, 0.32, 1); }`<br>`.toast-leave-active { transition: transform 180ms ease, opacity 180ms ease; }` |
| **Neden** | Sadece `transform`+`opacity` animasyonu — layout/paint sürprizi kalmaz, GPU dostu. Mevcut `enter-from`/`leave-to` (`opacity: 0; translateY(8px)`) ve alttan giris yonu oldugu gibi kalabilir. |

---

### 4.6 Olgunluk: Timer hover'da durmuyor (P2)

**Dosya:** `composables/useToast.js:16`

`show()` icinde sabit `setTimeout(() => remove(id), 3500)` var. Kullanici toast'in uzerine geldiginde/okurken timer **durmuyor** — 3.5 saniye dolunca toast kayboluyor. Uzun mesajli bir hata toast'ini kullanici tam okurken veya iceriginden bir ID kopyalarken ekrandan siliniyor. B2B'de bu **veri kaybi hissi** yaratir. Sonner'in temel ilkelerinden biri: kullanici toast uzerindeyken timer durur.

| | Deger |
|---|---|
| **Sorun** | Sabit 3500ms timer; hover'da duraklama yok, okuma/kopyalama firsati kaybolur |
| **Once** | `setTimeout(() => remove(id), 3500)` (durdurulamaz) |
| **Sonra** | Store'da `id -> { timer, remaining, startedAt }` map tut. `pause(id)`: `clearTimeout` + kalan sureyi hesapla (`remaining = duration - (now - startedAt)`). `resume(id)`: kalan sureyle yeniden `setTimeout`. `ToastContainer`'da `<div class="toast" @mouseenter="pause(t.id)" @mouseleave="resume(t.id)">`. |
| **Neden** | Kullanici okurken toast durur, mouse cekilince kalan sureden devam eder. `@media (hover: hover)` arkasina alinarak dokunmatik cihazlarda devre disi kalir (touch'ta yanlislikla pause olmasin). |

---

### 4.7 Olgunluk: Timer sekme gizlenince durmuyor (P2)

**Dosya:** `composables/useToast.js:16`

`setTimeout`, sekme arka plana alininca da (throttle'lansa bile) calismaya devam eder; kullanici baska sekmeye gecip geri donunce toast'in suresi coktan dolmus olur ve **hic gormeden** kaybeder. Bildirimin tum amaci (durum gostergesi) bosa gider. `document.visibilitychange` dinleyicisi yok.

| | Deger |
|---|---|
| **Sorun** | Sekme gizliyken timer islemeye devam eder; geri gelindiginde toast gorulmeden dusmustur |
| **Once** | `visibilitychange` dinleyicisi yok |
| **Sonra** | Global bir `visibilitychange` dinleyicisi: `document.hidden` olunca tum aktif timer'lari `pause`, gorunur olunca `resume`. Hover pause/resume altyapisiyla **ayni map** kullanilir. Composable modul-level oldugu icin dinleyici bir kez baglanir ve `onScopeDispose` ile temizlenir. |
| **Neden** | 4.6'daki pause/resume altyapisi hazir oldugunda bu, ayni mekanizmanin visibility'ye baglanmasidir — dusuk maliyet, buyuk kazanim. Kullanici sekmeye donunce toast'lar hala oradadir. |

---

### 4.8 Olgunluk: Swipe-to-dismiss yok (mobil) (P3)

**Dosya:** `components/layout/ToastContainer.vue:4`

Toast'i kapatmanin tek yolu kucuk `.toast-close` (X) butonu. Mobilde bu kucuk hedef zahmetli. Sonner ilkesi: toast **girdigi yonden** (sagdan) kaydirilarak atilabilmeli — giris/cikis zaten `translateX(24px)` (sag) oldugu icin swipe yonu sezgisel olarak tutarli olur.

| | Deger |
|---|---|
| **Sorun** | Kapatma yalnizca X butonuyla; mobilde swipe-to-dismiss yok |
| **Once** | Sadece `<button class="toast-close">` |
| **Sonra** | Pointer/touch surukleme ekle: saga suruklerken `transform: translateX(<takip>)`, esik (`>80px` veya hizli fling) asilinca `remove(id)`. Esik altinda `translateX(0)`'a geri yayla: `transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1)`. `touch-action: pan-y` ile dikey scroll korunur. |
| **Neden** | Swipe yonu (sag) giris/cikis ve `.toast-move` yonuyle mekansal olarak tutarli — sezgisel his. Mobilde kucuk X hedefi yerine dogal jest. |

---

### 4.9 Olgunluk: Gorunur toast ust siniri yok (P3)

**Dosya:** `composables/useToast.js:14`

`toasts.value.push(...)` — hicbir ust sinir yok. Toplu islem sonrasi (ornegin 20 kayit icin 20 basari toast'i) dizi sinirsiz buyur, ekrani doldurup arkadaki icerigi kapatir. Sonner: gorunur toast sayisi sinirlanir (tipik 3), fazlasi eskiden dusürulur.

| | Deger |
|---|---|
| **Sorun** | Sinirsiz stack; toplu islemde ekran toast ile dolar |
| **Once** | `toasts.value.push(newToast)` (sinir yok) |
| **Sonra** | `push` sonrasi kirp: `if (toasts.value.length > 3) toasts.value.splice(0, toasts.value.length - 3);` — veya en eskiyi `remove(id)` ile **animasyonlu** dusur (daha zarif). |
| **Neden** | 3 gorunur toast B2B icin makul bir tavan. Opsiyonel iyilestirme: ayni `message`+`type` tekrarinda de-dupe et (yeni toast eklemek yerine mevcut olanin timer'ini resetle) — spam onlenir. |

---

### Onerilen Standart — Toast Sistemi Tek Tip Recete

Asagidaki recete tum panelde tek dogru toast davranisini tanimlar. Merkez disi tum el yapimi toast/durum mesajlari (4.4, 4.5) ya `useToast`'a devredilir ya da bu receteyle birebir hizalanir.

**1. Giris/cikis — daima transition, asla keyframe:**

```scss
/* animations.scss — TransitionGroup name="toast" */
.toast-enter-active {
  transition: transform 240ms cubic-bezier(0.23, 1, 0.32, 1),
              opacity   240ms cubic-bezier(0.23, 1, 0.32, 1);
}
.toast-leave-active {
  position: absolute;          /* stack reflow icin sart */
  right: 0;
  width: 100%;
  transition: transform 180ms ease, opacity 180ms ease;  /* cikis girisden hizli */
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(24px);  /* sagdan gir, saga cik — swipe yonuyle tutarli */
}
.toast-move {
  transition: transform 240ms cubic-bezier(0.23, 1, 0.32, 1);  /* kalanlar akici toparlanir */
}
```

**2. `transition: all` kesinlikle yasak** — yalnizca `transform` ve `opacity` yazilir.

**3. Kapatma tek asamali** — manuel gecikme ve olu state yok, cikis basisla ayni anda baslar:

```js
function remove(id) {
  toasts.value = toasts.value.filter(t => t.id !== id);
}
```

**4. Timer akilli** — hover'da ve sekme gizliyken durur (`pause`/`resume` ile kalan sure korunur), tek bir `id -> timer` map'i uzerinden. Hover `@media (hover: hover)` arkasinda.

**5. Gorunur tavan 3 toast** — fazlasi en eskiden animasyonlu dusürulur; ayni mesaj tekrarinda de-dupe.

**6. Mobilde swipe-to-dismiss** — sagdan (giris yonu) surukleme, esik `>80px` veya fling, esik alti `translateX(0)`'a `200ms cubic-bezier(0.23, 1, 0.32, 1)` ile geri yaylar.

**7. Cift tanim yasak** — base `.toast` sinifinda animasyon/transition olmaz (`forms.scss:189` temizlenir); tum hareket yalnizca `TransitionGroup` siniflarinda tanimlanir.

**Ozet sure/easing tablosu:**

| Faz | Sure | Easing | Transform |
|---|---|---|---|
| Giris | 240ms | `cubic-bezier(0.23, 1, 0.32, 1)` | `translateX(24px) → 0`, `opacity 0 → 1` |
| Cikis | 180ms | `ease` | `translateX(0 → 24px)`, `opacity 1 → 0` |
| Stack reflow (move) | 240ms | `cubic-bezier(0.23, 1, 0.32, 1)` | kalanlarin `translateY` toparlanmasi |
| Swipe geri yay | 200ms | `cubic-bezier(0.23, 1, 0.32, 1)` | `translateX → 0` |
| Otomatik kapanma | 3500ms | — | hover + tab-hidden'da pause |

---

## 5. Sayfa Geçişleri, Liste Girişleri ve Stagger

Bu bölüm, panelde "bağlam değişimini yumuşatan" tüm hareketleri kapsar: route (sayfa) geçişleri, wizard adım takasları, boş durum/veri takasları, liste elemanlarının giriş/çıkış/yeniden akış (move) geçişleri ve dashboard stagger'ı. Emil Kowalski çerçevesinde bu kategorinin kalibrasyonu nettir: **B2B panelinde "ani değişimi yumuşatma" geçerli bir animasyon amacıdır, ancak slide/kayma abartısı yasaktır**. Kullanıcı bu ekranlarda günde onlarca kez gezinir; her geçiş 100–200ms aralığında, `cubic-bezier(0.23, 1, 0.32, 1)` (güçlü ease-out) ile crisp olmalı, tekrar tekrar oynayan "oyuncak" hissi vermemelidir.

Alanın genel durumu iki uçlu:

- **İyi taraf:** Stagger fikri zaten mevcut ve *doğru yerde sınırlandırılmış* — dashboard KPI kartlarında `nth-child` ile yalnızca 4 karta uygulanmış, `DynamicDashboard` widget'ları `:key=widget.name` ile mount kaldığından period yenilemede gereksiz yeniden stagger *oynamıyor*. Bu, "stagger'ı sadece ilk anlamlı yüklemede göster" ilkesine uygun bir tasarım kararı. Ayrıca `draggable animation="200"` gibi kütüphane kaynaklı reorder hareketleri yerinde çalışıyor.
- **Zayıf taraf:** Tanımlı ama hiç kullanılmayan bir route geçiş kaydı (ölü kod) var; onlarca liste `v-for` düz render ile eleman silindiğinde komşuları animasyonsuz "zıplatıyor" (spatial takip kopuyor); ve tek fiili stagger'ın süresi (`0.35s`, generic `ease`) hem 300ms sınırını aşıyor hem de her modül sekmesi geçişinde yeniden oynuyor.

Bulgular üç alt başlıkta toplandı: **(5.1) Sayfa/adım/durum geçişleri**, **(5.2) KPI stagger ve giriş**, **(5.3) Liste move/exit geçişleri ve seçim layout shift'i**.

---

### 5.1 Sayfa, Adım ve Durum Geçişleri (page-enter / empty-state)

#### 5.1.1 Route geçişi tanımlı ama bağlı değil — ölü kod + sıfır feedback (P2)

`assets/scss/animations.scss:45` içinde `.page-enter-active` / `.page-leave-active` + `.page-enter-from` / `.page-leave-to` kuralları eksiksiz tanımlı, **ancak hiçbir yerde `<Transition name="page">` kullanılmıyor.** `App.vue:2` ve `AppLayout.vue:16`'daki `<router-view />` çıplak. Fiili sonuç: `<main class="page-content">` `AppLayout` içinde persist ettiğinden `fadeUp` animasyonu yalnızca layout'un **ilk mount'unda bir kez** oynar; route değişiminde ekran hiçbir geçiş olmadan sıçrar. Route değişimi B2B'de günde onlarca kez olur — kullanıcı bağlam değiştiğini yumuşak algılayamıyor.

| | Değer |
|---|---|
| **Sorun** | `router-view` çıplak; `.page-*` kuralları tanımlı ama bağlanmamış (ölü kod). Route değişiminde 0 geçiş; ekran anında sıçrıyor. |
| **Önce** | `AppLayout.vue:16` → `<router-view />` · `animations.scss:45` → kullanılmayan `.page-enter-*` blokları · `.page-content` `fadeUp` yalnız 1 kez oynuyor |
| **Sonra** | `AppLayout.vue` main içinde: `<router-view v-slot="{ Component }"><Transition name="page" mode="out-in"><component :is="Component" :key="route.path" /></Transition></router-view>` · `.page-content`'ten `fadeUp` kaldırılır (artık Transition yönetir) · `.page-enter-active { transition: opacity 120ms cubic-bezier(0.23, 1, 0.32, 1); }` `.page-enter-from { opacity: 0; }` (slide/translateY YOK — yalnız opacity) |
| **Neden** | Çok hafif (100–150ms) bir opacity geçişi B2B'de bile premium bağlam-değişimi hissi katar; büyük slide yasak olduğundan `translateY` çıkarılır. `mode="out-in"` iki sayfanın üst üste binmesini engeller. Alternatif tercih route animasyonu istenmiyorsa: ölü `.page-*` kuralları `animations.scss:45-59`'dan tamamen silinmeli — tanımlı-ama-kullanılmayan kod yanıltıcıdır. |

> Not: `translateY` içeren `fadeUp` route geçişinde kullanılmamalı; sayfa gövdesinin dikeyde kayması B2B kalibrasyonunda "gösterişli" sayılır. Yalnız opacity yeterli ve daha crisp.

#### 5.1.2 Wizard adım geçişleri anlık takas (P3)

`views/bulk-import/BulkProductImportView.vue:641` — içe aktarma sihirbazının adımları (`ADIM 1 → 1.5 → 2 → 2.5 → 3 → 4 → 99`) `v-if/v-else-if` zinciriyle yönetiliyor; büyük içerik blokları arasında geçiş anlık, animasyonsuz.

| | Değer |
|---|---|
| **Sorun** | Büyük adım kartları arasında ani takas; kullanıcı ilerlediğini/geri gittiğini hissetmiyor. |
| **Önce** | `<div v-if="step === 1">…</div><div v-else-if="step === 2">…</div>` — geçiş yok |
| **Sonra** | Adım kartlarını `<Transition name="fade" mode="out-in">` (global fade: `opacity 0.2s ease`) içine al · **Alternatif (yalnız giriş):** her adım kartına `animation: stepIn 150ms ease-out;` `@keyframes stepIn { from { opacity: 0; transform: translateY(4px); } }` |
| **Neden** | Uzun/sallanan slide istenmez (B2B); `out-in` fade adım değişimini yumuşatır. `translateY(4px)` çok küçük tutularak "kayma" değil "yerine oturma" hissi verilir. |

#### 5.1.3 Kanban geçişinde filtre satırının aniden yok olması (P3, masaüstü)

`views/crm/TasksListView.vue:31` — `v-if="activeView !== 'kanban'"` ile status çip satırı DOM'dan anında kalkıyor; kanban'a geçişte toolbar ve içerik yukarı zıplıyor.

| | Değer |
|---|---|
| **Sorun** | Görünüm değişiminde çip satırı aniden yok olup layout yukarı zıplıyor (layout shift). |
| **Önce** | `<div v-if="activeView !== 'kanban'" class="filter-row">…</div>` |
| **Sonra** | Satırı `<Transition name="fade">` (mevcut global fade: `opacity 0.2s ease`, süre 150ms'e çekilebilir) ile sar |
| **Neden** | Görünüm değişimi ara sıra yapılan bir işlem; kısa bir fade abartısız ve yeterli. Layout zıplaması kritik değilse `grid-template-rows: 1fr → 0fr` tekniğine gerek yok — düz fade yeter. |

#### 5.1.4 Önizleme ve widget boş durum takasları (P3)

İki bulgu aynı kalıba düşüyor: form önizlemesi ve dashboard widget'ının boş/dolu/hata durumları arasındaki **sert takas + yükseklik sıçraması**.

- `components/form-fields/WidgetPreview.vue:25` — `v-if/v-else-if` zinciri; boş metin ↔ tam chart arası yükseklik farkı büyük, form alanı doldukça önizleme kutusu ani içerik + yükseklik sıçraması yapıyor.
- `components/dashboard/layout/WidgetWrapper.vue:32` — `.th-widget-empty` `v-else-if` ile anında görünüyor; `fa-inbox` ikonu ve metin animasyonsuz belirip kayboluyor.

| | Değer |
|---|---|
| **Sorun** | Boş/hata/dolu durumları sert takas ediliyor; farklı yükseklikler layout shift yaratıyor (özellikle filtre sonucu boş↔dolu). |
| **Önce** | `<div v-if="empty">…</div><div v-else-if="error">…</div><div v-else><Chart/></div>` — geçiş + min-height yok |
| **Sonra** | Durum bloklarını `<Transition name="fade" mode="out-in">` (global fade `opacity 0.2s ease`) içine al · dış kutuya `min-height: 72px` ver (boş/hata yüksekliği sabitlenir) · `WidgetWrapper` için aynı sarmalayıcı boş durumu da kapsar, ayrı iş gerekmez |
| **Neden** | 150–200ms opacity, veri-yoğun önizlemede sıçramayı ehlileştirir; `min-height` yükseklik farkını kilitler. **Preflight tuzağı (memory notu):** boş durum ikonunu ortalarken `text-align: center` çalışmaz (Tailwind CDN preflight `svg`'yi `display: block` yapar) — `flex` / `margin: auto` kullan. Chart'ın ilk çizim animasyonu bu dosyaların dışında (registry widget bileşenleri); orada kısa tutulmalı. |

---

### 5.2 KPI Kartı Girişi ve Stagger (list-stagger)

> Bu tek konu, kod tabanında **üç ayrı yerde** görüldü ve burada birleştirildi: `assets/scss/cards.scss:34` (kaynak keyframe + `nth-child` stagger), `components/dashboard/widgets/KpiCard.vue:2` (kuralı miras alan kart) ve aynı `cards.scss:34`'ün tekrar tespiti. Hepsi aynı davranışı tarif ediyor.

**Mevcut durum:** `.kpi-card { animation: fadeUp 0.35s ease both; }` + `&:nth-child(1..4)` için `0.06s` adımlı stagger. `fadeUp`, `translateY(6px) → 0` + opacity.

Üç ayrı problem katmanı var:

1. **Süre 300ms sınırının üstünde.** `0.35s` + `nth-child` gecikmesiyle son kartta toplam pencere `~0.53s`'e çıkıyor. Emil kuralı: UI animasyonu 300ms altında kalmalı.
2. **Generic `ease` yanlış eğri.** Giren eleman için custom **ease-out** (`cubic-bezier(0.23, 1, 0.32, 1)`) daha crisp hissettirir.
3. **Her sekme geçişinde yeniden oynuyor.** Dashboard modül sekmeleri (Genel / Siparişler / Ödemeler…) arası her geçiş view'i remount ettiğinden KPI kartları her sekmede yeniden fade-up + stagger oynuyor — günde onlarca kez tekrarlanan gezinmede "oyuncak" hissi.
4. **Stagger kırılgan indeksleme.** `nth-child` grid'in *tüm* çocuklarına göre indekslendiğinden, KPI kartı 5. sırada olan bir dashboard'da gecikme hiç uygulanmıyor.

| | Değer |
|---|---|
| **Sorun** | `0.35s` (>300ms) + generic `ease` + her sekme geçişinde yeniden oynayan stagger + `nth-child` kırılgan indeksleme. |
| **Önce** | `.kpi-card { animation: fadeUp 0.35s ease both; } .kpi-card:nth-child(1){} … :nth-child(4){ animation-delay: 0.18s; }` |
| **Sonra** | `.kpi-card { animation: fadeUp 0.25s cubic-bezier(0.23, 1, 0.32, 1) both; }` · stagger'ı `nth-child` yerine `nth-of-type`'a taşı **veya tercihen tamamen kaldır** · stagger korunacaksa adım `0.06s → 0.04–0.05s`'e çekilir (4 kart → son kart `~0.12–0.15s`'de başlar) · **tek sefere indir:** animasyonu yalnız dashboard layout'un ilk mount'una bağla — parent'a `.first-load` class'ı verip `.first-load .kpi-card { animation: … }` · `@media (prefers-reduced-motion: reduce) { .kpi-card { animation: none; } }` ekle |
| **Neden** | `0.25s` + ease-out eğrisi 300ms kuralına uyar ve girişi crisp yapar. `.first-load` bağı, sekmeler arası her gezinmede tekrar oynamayı keser — stagger'ın "ilk anlamlı yüklemede bir kez" ilkesi. `nth-of-type` KPI kartlarını grid içindeki diğer çocuklardan bağımsız indeksler, 5. sıra kırılganlığını çözer. `prefers-reduced-motion` erişilebilirlik zorunluluğu. |

> Doğru olan korundu: 4 karta sınırlama ve `DynamicDashboard`'un `:key=widget.name` ile mount kalması (period yenilemede yeniden stagger *olmaması*) isabetli — bu davranış değiştirilmemeli.

---

### 5.3 Liste Move / Exit Geçişleri ve Seçim Layout Shift'i

Bu grup, panelin en yaygın "ani zıplama" kaynağı: bir eleman silinince kalan satırların animasyonsuz yukarı sıçraması. Emil çerçevesinde bu **klasik "ani değişimi yumuşatma" vakası** — yıkıcı bir eylemin (silme) sonucu görsel olarak takip edilebilmeli. Ortak reçete: `TransitionGroup` ile **yalnız `move` + `leave`** geçişi; **enter (giriş/stagger) animasyonu eklenmez** (filtre/yükleme sonrası liste her açılışta yeniden oynamamalı). Yükseklik animasyonu (`height`) kullanılmaz — yalnız `transform` ve `opacity`.

#### 5.3.1 Ortak kalıp — beş liste

| Dosya:Satır | Element | Öncelik | Not |
|---|---|---|---|
| `components/form-fields/FilterBuilder.vue:53` | Filtre satırları (ekle/sil) | P3 | **Ayrıca `:key="idx"` hatası** — index kararlı kimlik değil, TransitionGroup'u bozar (yanlış eleman animasyonlanır). Önce `push` sırasında üretilen `uid` verilmeli. |
| `views/crm/tabs/NotesTab.vue:37` | Not listesi (sil/ekle) | P3 | Aynı kalıp `views/crm/tabs/TasksTab.vue:35`'te de var. |
| `views/eca/MyEcaRulesView.vue:32` | `ul.rule-cards` kural kartları | P3 | Silme sonrası yeniden akış. |
| `views/messaging/AvailabilityView.vue:322` | `ul.avl__rows` slot silme/rezervasyon iptali | P3 | Yıkıcı eylem — exit satırın hangisi olduğunu netleştirmeli. |
| `views/seller/StorefrontLayoutEditor.vue:339` | Canvas'a bölüm ekleme (tap/drop) | P3 | Burada **enter** faydalı (yeni eklenen kart), aşağıda ayrı ele alınıyor. |

**Ortak "Önce / Sonra":**

| | Değer |
|---|---|
| **Sorun** | Düz `v-for`; eleman silinince kalan satırlar animasyonsuz zıplayarak yukarı kayıyor — spatial takip kopuyor. (`FilterBuilder`'da ek olarak `:key="idx"` bug'ı.) |
| **Önce** | `<div v-for="row in rows" :key="idx">…</div>` — silme `filter` ile anında çıkarıyor |
| **Sonra** | Kararlı `id` ver (`uid`), sonra `<TransitionGroup name="row" tag="div">`: `.row-move { transition: transform 150ms cubic-bezier(0.23, 1, 0.32, 1); }` · `.row-leave-active { position: absolute; transition: opacity 120ms ease; }` · `.row-leave-to { opacity: 0; }` · **`.row-enter-*` TANIMLANMAZ** |
| **Neden** | `.row-move` kalan satırların yeni konumlarına akmasını yumuşatır; `.row-leave-active { position: absolute }` çıkan elemanı akıştan çıkarıp kalanların "boşluğu doldurma" hareketini pürüzsüz kılar. Enter atlanır ki filtre/yeniden yükleme her seferinde animasyon başlatmasın. `height` yerine `transform` — reflow ucuz, hareket 60fps. |

**Element bazlı ince ayarlar (yıkıcı eylemlerde biraz daha belirgin exit):**

- `AvailabilityView.vue:322` — silme yıkıcı olduğundan exit'e küçük scale eklenebilir: `.avl-row-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; position: absolute; }` `.avl-row-leave-to { opacity: 0; transform: scale(0.98); }` `.avl-row-move { transition: transform 0.2s cubic-bezier(0.23, 1, 0.32, 1); }`
- `MyEcaRulesView.vue:32` — `ul` → `<TransitionGroup name="rules" tag="ul">`, `move` biraz uzun tutulabilir (`200ms`) çünkü kartlar büyük: `.rules-move { transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1); }` `.rules-leave-active { position: absolute; transition: opacity 120ms ease; }` `.rules-leave-to { opacity: 0; }`

#### 5.3.2 Bölüm ekleme — burada giriş animasyonu *doğru* (P3)

`views/seller/StorefrontLayoutEditor.vue:339` — `addSection` push'uyla yeni `LayoutSectionCard` animasyonsuz beliriyor; `draggable animation="200"` yalnız yeniden sıralamayı kapsıyor, yeni öğe girişini kapsamıyor. Mobilde "Bölüm Ekle" sekmesinden dokunup "Sayfam"a dönünce yeni kartın hangisi olduğu algılanamıyor.

| | Değer |
|---|---|
| **Sorun** | Yeni eklenen kart listede aniden var oluyor; kullanıcı hangi kartın eklendiğini göremiyor. |
| **Önce** | `sections.push(newSection)` → kart animasyonsuz DOM'a giriyor |
| **Sonra** | `LayoutSectionCard` köküne `@starting-style` kalıbı: `.sec-card { transition: opacity 180ms cubic-bezier(0.23, 1, 0.32, 1), transform 180ms cubic-bezier(0.23, 1, 0.32, 1); } @starting-style { .sec-card { opacity: 0; transform: translateY(4px); } }` — tek seferlik, stagger'sız, etkileşimi bloklamaz |
| **Neden** | Burada giriş bir *durum göstergesi* işlevi görüyor (5.3.1'in aksine — çünkü kullanıcı bilinçli olarak *ekliyor*). `@starting-style` yalnızca ilk mount'ta oynar, listeyi her açılışta yeniden animasyonlamaz; `draggable`'ın reorder animasyonuyla çakışmaz. |

#### 5.3.3 Inbox seçim vurgusu — border ile layout shift (P2, masaüstü)

`components/seller/UserProfileMessagesPanel.vue:169` — aktif konuşma satırına `:class` ile `border-l-4 border-l-brand-500` ekleniyor; pasif satırda sol border *yok*. Seçimde 4px'lik border sıfırdan eklendiğinden avatar ve metin her seçimde sağa zıplıyor (layout shift). `transition-colors` border *genişliğini* animasyonlayamaz — sık kullanılan bir yüzeyde her tıklamada görünür sıçrama.

| | Değer |
|---|---|
| **Sorun** | Aktif satırın sol border'ı `0 → 4px` genişlediğinden içerik sağa zıplıyor (layout shift); `transition-colors` genişliği yumuşatamaz. |
| **Önce** | pasif: `border-l-0` · aktif: `:class="{ 'border-l-4 border-l-brand-500': isActive }"` |
| **Sonra** | Tüm satırlara sabit `border-l-4 border-l-transparent`; aktifte *yalnız rengi* değiştir → `border-l-brand-500`. Mevcut `transition-colors duration-150` bu renk geçişini pürüzsüz yapar |
| **Neden** | Border genişliği hep 4px kalır (yalnız renk `transparent → brand`), yani hiç reflow yok — layout shift biter. Renk `transition-colors` ile animasyonlanabilir (genişlik animasyonlanamaz), bu yüzden değişkeni genişlikten renge taşımak hem shift'i hem pürüzsüzlüğü aynı anda çözer. Klasik "reserve the space" kalıbı. |

---

### Önerilen Standart — Sayfa/Liste/Stagger Reçetesi

Bu alan için tek tip, kopyalanabilir standart:

**1. Route geçişi (tek yer, `AppLayout`):**
```
<router-view v-slot="{ Component }">
  <Transition name="page" mode="out-in">
    <component :is="Component" :key="route.path" />
  </Transition>
</router-view>
```
```scss
.page-enter-active { transition: opacity 120ms cubic-bezier(0.23, 1, 0.32, 1); }
.page-enter-from   { opacity: 0; }   // slide/translateY YOK
```

**2. İçerik/adım/durum takası (wizard, önizleme, boş durum):** `<Transition name="fade" mode="out-in">` + global fade (`opacity 150–200ms`). Farklı yükseklikli durumlarda dış kutuya `min-height` ver. İkon ortalaması `flex`/`margin:auto` ile (asla `text-align:center` — preflight `svg` block tuzağı).

**3. Liste move/exit (silme-ağırlıklı listeler):** Kararlı `id` (asla `:key="idx"`) + `TransitionGroup`, **yalnız `move` + `leave`, enter YOK**:
```scss
.row-move       { transition: transform 150ms cubic-bezier(0.23, 1, 0.32, 1); }
.row-leave-active { position: absolute; transition: opacity 120ms ease; }
.row-leave-to     { opacity: 0; }
```
Yıkıcı eylemde exit'e `transform: scale(0.98)` eklenebilir. `height` animasyonu asla.

**4. Bilinçli ekleme (kullanıcı öğe ekler):** Tek seferlik giriş `@starting-style` ile — `opacity 0→1` + `translateY(4px)→0`, `180ms`, stagger'sız, etkileşimi bloklamaz.

**5. Stagger:** Yalnız ilk anlamlı yüklemede (`.first-load` gate), 4–6 elemanla sınırlı, `nth-of-type` ile indeksli, adım `≤0.05s`, süre `≤0.28s`, `cubic-bezier(0.23, 1, 0.32, 1)`. Sekme/route remount'unda yeniden oynatma.

**6. Seçim vurgusu:** Yer her zaman rezerve edilir (`border-l-4 border-l-transparent`), yalnız *renk* değişir. Layout shift üreten hiçbir `0 → Npx` geçişi kullanılmaz.

**7. Ortak zorunluluklar:** Tüm eğriler `cubic-bezier(0.23, 1, 0.32, 1)` (ease-out); süreler 120–200ms (stagger dahil ≤280ms); yalnız `transform` + `opacity` (asla `height`/`width`/`all`); her animasyon bloğunda `@media (prefers-reduced-motion: reduce) { animation: none; transition: none; }`.

---

## Yükleme Durumları: Skeleton ve Chart Animasyonları

Bu bölüm panelin en çok görülen ama en az cilalanmış yüzeyini denetliyor: veri gelene kadar geçen o birkaç yüz milisaniye. Emil Kowalski'nin çerçevesinde bu süre "ölü zaman" değildir — kullanıcının panele dair hız algısını burada kurarsınız. İki temel ilke bu bölümün tamamına hükmediyor:

1. **Algılanan hız gerçek hız kadar önemlidir.** Boş bir kutuda dönen bir spinner, kullanıcıya "sistem düşünüyor, sonucun ne olacağını bilmiyorum" der. Gelecek içeriğin iskeletini (skeleton) çizen bir placeholder ise "sonuç şu şekle sahip olacak, neredeyse geldi" der. İkinci mesaj aynı ağ süresini daha kısa hissettirir.
2. **Durum değişimi layout shift üretmemelidir.** Yükleme bloğu ile gelen içerik farklı yükseklikteyse, veri geldiği anda sayfa zıplar. Bu sıçrama premium hissi anında yok eder; skeleton'ın birincil görevi nihai layout'u önceden işgal etmektir.

Denetimin en çarpıcı bulgusu şu: **kod tabanında hiçbir yerde skeleton yok** (`components/dashboard/charts/BaseChart.vue:23` civarında tanımlı `loading` prop'u bile ölü kod, hiç bağlanmamış). Yaklaşık 40 liste ve detay ekranı tek tip bir kalıbı tekrarlıyor:

```html
<div v-if="loading" class="card text-center py-12">
  <AppIcon name="loader" class="animate-spin" />
</div>
```

Bu kalıp iki suçu birden işliyor: (a) spinner içerik iskeletini temsil etmiyor, (b) `py-12`'lik ~120px'lik spinner kartı, gelen 800-1500px'lik tabloya/grid'e sıçrayarak büyük bir cumulative layout shift üretiyor. Temsili bulgu `views/seller/SellerListingsView.vue:197`'de kayıtlı ama sorun sistemik.

İkinci büyük eksen chart tarafında: **hiçbir ECharts option'ında animasyon konfigürasyonu yok**, yani ECharts default'u (`animationDuration: 1000ms`) her yerde devrede. B2B kalibrasyonu UI animasyonlarını 300ms altında ister; 1 saniyelik çizim animasyonu paneli "oyuncak" gibi hissettiriyor. Dahası `composables/dashboard/useChart.js:81`'de `setOption(newOption, { notMerge: true })` kullanıldığı için her filtre/period değişiminde grafik sıfırdan, tam giriş animasyonuyla yeniden çiziliyor.

Bulgular üç öbekte toplanıyor: (A) Spinner→içerik ani geçişleri ve skeleton eksikliği, (B) Sık etkileşimlerde içeriğin komple sökülüp yeniden yüklenmesi (stale-while-loading eksikliği), (C) ECharts animasyon süresi ve `notMerge` kaynaklı yeniden çizim.

---

### A. Spinner / düz metin → içerik: skeleton eksikliği ve layout shift

Bu öbek P1 önceliğinin merkezi. Her dashboard açılışında 8+ widget aynı anda spinner gösterdiği için en görünür eksik burada.

#### A.1 Dashboard widget'ları — `components/dashboard/layout/WidgetWrapper.vue:15` (P1)

Tüm dashboard widget'larının ortak sarmalayıcısı. `fa-spinner fa-spin` + "Yükleniyor" metni (`min-height: 200px`), `v-if`/`v-else` swap ile geçişsiz içeriğe dönüyor.

| | Önce | Sonra | Neden |
|---|---|---|---|
| Yükleme gösterimi | `fa-spinner fa-spin` + metin, `min-height: 200px` | Widget tipine uygun shimmer skeleton bloklar | Skeleton gelecek içeriğin şeklini gösterip algılanan hızı artırır |
| İçerik girişi | `v-if`/`v-else` ani swap, geçiş yok | `<Transition name="fade">` veya `animation: fadeIn 150ms cubic-bezier(0.23, 1, 0.32, 1)` | Ani pop-in yumuşatılmalı |
| Shimmer tekniği | — | Pseudo-element + `transform: translateX(-100%)` → `translateX(100%)`, `1.4s linear infinite` | GPU-dostu; `background-position` layout/paint tetiklemez |

Shimmer'ın transform tabanlı olması kritik: `background-position` animasyonu paint tetikler, `transform` compositor katmanında kalır. Sabit hız hareketi olduğu için `linear` doğru easing (ease-out shimmer'da yanlış olurdu).

```scss
.th-skeleton {
  background: var(--th-surface-elevated);
  border-radius: 6px;
  position: relative;
  overflow: hidden;
}
.th-skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
  transform: translateX(-100%);
  animation: shimmer 1.4s linear infinite;
}
@keyframes shimmer { to { transform: translateX(100%); } }
```

**Kritik bağlı bulgu — `assets/scss/dashboard.scss:444` (P2):** `.th-widget-loading` ve `.th-widget-empty` `min-height: 200px` iken BaseChart'lar `height: 280px` (line/bar) veya `350px` (sankey) ile render ediliyor. Yani skeleton doğru shimmer'la yapılsa bile, 200px yükleme → 280-350px grafik geçişinde kart aniden uzayıp altındaki tüm grid'i aşağı itiyor. **Skeleton yüksekliği gerçek grafik yüksekliğine eşitlenmeli:** WidgetWrapper'a grafik yüksekliğini prop olarak verip loading/empty/content konteynerlerine aynı `min-height` uygulanmalı. Bu düzeltilmeden skeleton eklemek layout shift'i çözmez.

#### A.2 Dashboard ilk yükleme — `views/dashboard/DynamicDashboard.vue:62` (P1)

PlatformOverview ve SellerOverview bunu kullanıyor; günde en sık görülen ekran. 200px'lik spinner bloğu, çok daha uzun bir grid'e sıçrıyor.

| | Önce | Sonra | Neden |
|---|---|---|---|
| Yükleme | 200px `fa-spinner fa-spin` bloğu | Gerçek grid boyutunda 4 KPI + 2-4 widget skeleton kartı (`th-widget` ile aynı radius/padding) | En sık görülen ekranda algılanan hız kaybı en yüksek |
| Geçiş | `v-else-if` zinciri, geçişsiz | Grid'e tek seferlik `opacity: 0→1`, `200ms cubic-bezier(0.23, 1, 0.32, 1)` | Ani belirmeyi yumuşatır |

#### A.3 Grafik yükleme durumu — `components/dashboard/charts/BaseChart.vue:23` (P2)

`loading: { type: Boolean, default: false }` tanımlı ama template'te de `useChart`'ta da hiç kullanılmıyor — **ölü prop, yanıltıcı API.** Yükleme sırasında chart alanı bomboş, veri gelince grafik `notMerge:true` yüzünden 1000ms animasyonla aniden beliriyor.

İki geçerli çözüm: (1) prop'u sil, ya da (2) bağla. Bağlamak için `useChart`'a geçirip ECharts native `showLoading()`/`hideLoading()` çağır:

```js
watch(() => props.loading, v => {
  const c = chart.value; if (!c) return;
  v ? c.showLoading('default', { text: '', maskColor: 'transparent', spinnerRadius: 8 })
    : c.hideLoading();
});
```

Alternatif olarak template'e chart yüksekliğiyle aynı boyutta skeleton div (`background: var(--th-surface-elevated)`, `border-radius: 8px`, transform-shimmer). Skeleton→chart geçişi `opacity 200ms cubic-bezier(0.23, 1, 0.32, 1)`; aynı yükseklik sayesinde layout shift sıfır.

#### A.4 Veri-yoğun liste/tablo ekranları — sistemik (P1/P2)

Aynı spinner-only veya düz-metin kalıbı onlarca view'da tekrarlıyor. Öncelik, ekranın günlük ziyaret sıklığıyla belirleniyor:

**P1 — `views/crm/DealsListView.vue:60` (5 view: DealsListView, LeadsListView:61, NotesListView:27, OrganizationsListView:40, TasksListView:61):** `v-if="loading"` tüm listeyi kaldırıp `py-12` spinner basıyor. Her status chip / arama / sıralama / sayfalama değişiminde içerik yok olup spinner'a dönüşüyor → büyük layout shift, scroll sıfırlanması, düşük algılanan hız.

**P1 — `views/helpdesk/TicketsListView.vue:297` (6 dosya: AgentsView:28, CannedResponsesView:35, SellerInquiriesListView:37, TeamsView:19, TicketTypesView:19):** `hd.loadingTickets` tüm içeriği DOM'dan söküp 56px padding'li spinner basıyor. Tab/filtre/scope değişimi ve her toggle/save reload'u aynı yoldan geçiyor.

**P2 grubu** (ilk yükleme skeleton + refetch'te stale-content):
- `views/crm/CommissionAdminView.vue:36` (+CommissionTeamView:36) — `store.loading` iken tbody tek "Yükleniyor…" hücresine çöküyor
- `views/crm/CallsListView.vue:38` (+ContactsListView:38, 3 görünüm modu)
- `views/crm/CrmDashboardView.vue:48` — pipeline + son aktivite kartları
- `views/doctype/DocTypeListView.vue:115`
- `views/eca/EcaRulesView.vue:51`, `EcaRuleLogView.vue:40`, `MyEcaRulesView.vue:19`
- `views/feed/AdminFeedsView.vue:135`
- `views/admin/CertVerificationView.vue:31` (+SellerVerificationQueueView:46, VerificationSourceView:29, SubscriptionGateView:304, SubscriptionPaymentsView:131)
- `views/permission/AuditLogTab.vue:82` (+UsersTab:27, FeatureCatalogTab:284)
- `views/system/CapabilityMatrixTab.vue:385`, `ModuleMatrixTab.vue:364`
- `views/bulk-import/BulkImportHistoryView.vue:302`, `BulkImportDetailView.vue:390`
- `views/seller/SellerListingsView.vue:197`, `SellerOrdersView.vue:34`, `SellerCategoriesView.vue:49`, `KpiTemplateList.vue:73`, `StorefrontEdit.vue:32`
- `views/seo/SeoTab.vue:125`, `SeoPagesView.vue:274`
- `views/system/DelegationManagerView.vue:153` (loading state hiç yok — yüklenirken yanlış "Kayıt yok" empty state gösteriyor)

**P3 grubu** (daha az ziyaret edilen ya da hafif etkili):
- `components/crm/ActivityTimeline.vue:3`, `components/seller/SellerAddressesPanel.vue:69`, `SubscriptionPlanCard.vue:80`, `UserProfileMessagesPanel.vue:152`
- `views/orders/ApprovalQueueView.vue:17`, `views/messaging/BuyerMessagesView.vue:264`, `AvailabilityView.vue:295`
- `views/crm/MyCommissionsView.vue:40` (çıplak `<td>Yükleniyor…</td>` — CRM'in genel spinner kalıbıyla bile tutarsız), `LeadDetailView.vue:3` (+OrganizationDetailView:3), `settings/AssignmentRulesSettings.vue:15` (8 dosya)
- `views/eca/EcaRuleFormView.vue:18`
- `views/seller/MyCertificationsView.vue:44` (+MyVerificationsView:47), `SuggestCertificationView.vue:120`
- `views/system/DashboardManagerView.vue:17`, `HeaderNoticesView.vue:45` (+CategoryShowcaseView:88, HeroSliderView:25), `AnomalyDashboardView.vue:48`, `ThemeManagerView.vue:69`, `RecommendationsSettingsView.vue:65`, `PermissionConsoleView.vue:60`
- `views/products/CategoryManagementView.vue:172`
- `components/seo/OgImageUpload.vue:88`

Bu kadar tekrar, sorunun tek tek değil bir ortak component ile çözülmesi gerektiğini söylüyor (bkz. Önerilen Standart).

**Temsili Önce/Sonra — DealsListView / tablo iskeleti:**

| | Önce | Sonra | Neden |
|---|---|---|---|
| İlk yükleme | Tüm liste yok, `py-12` merkezi spinner | Tablo yüksekliğinde 6-8 skeleton satır, `1.4s linear infinite` shimmer | Yapı korunur, sıçrama olmaz |
| Refetch (filtre/sayfa) | İçerik sökülüp spinner, sonra geri | Liste DOM'da kalır: `:class="{ 'is-refreshing': loading }"` | Sık etkileşimde flash yok |
| Refresh dim | — | `.is-refreshing { opacity: 0.55; pointer-events: none; transition: opacity 150ms ease; }` | Retarget edilebilir durum korunur |

```scss
.skl-row {
  height: 44px; border-radius: 8px;
  background: linear-gradient(90deg,
    rgba(148,163,184,.12) 25%, rgba(148,163,184,.24) 50%, rgba(148,163,184,.12) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}
@keyframes shimmer { to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .skl-row { animation: none; } }
```

---

### B. Sık etkileşimlerde içeriğin komple sökülmesi (stale-while-loading eksikliği)

Bu öbek skeleton'dan ayrı bir sorun: içerik zaten ekrandayken bir tuş vuruşu / filtre tıklaması / kaydet işlemi onu tamamen söküp yeniden yüklüyor. Doğru kalıp **stale-while-loading**: eski içeriği ekranda tut, üstüne dim uygula, yeni veri gelince yerinde değiştir. Ani boyut değişimi ve flicker böylece ortadan kalkar.

#### B.1 Arama sırasında dropdown flicker'ı

- **`components/common/LinkInput.vue:137`**, **`components/dashboard/SellerPicker.vue:209`**, **`components/common/datatable/CategoryTreePicker.vue:71`**: Her tuş vuruşunda `loading=true` anında set edilip sonuç listesi spinner satırıyla değiştiriliyor. Liste → spinner → liste çakması, ayrıca dropdown yüksekliği tek satıra düşüp geri büyüyor (dropdown zıplıyor).

| | Önce | Sonra | Neden |
|---|---|---|---|
| Loading gösterimi | Sonuç listesi silinip spinner satırı | Eski sonuçlar kalır, `opacity: 0.5` + `transition: opacity 0.15s ease` | Yazarken sakin geçiş |
| Spinner konumu | Listenin yerinde tam satır | SellerPicker: input içindeki `fa-search` → `fa-spinner fa-spin` | Dropdown yüksekliği sabit kalır |
| Tam spinner koşulu | `loading` iken | Yalnız `results` boşken (ilk açılış) | Retarget edilebilir durum korunur |

#### B.2 Kaydet sonrası tam sayfa çökmesi — `views/crm/ContactDetailView.vue:252` (P1)

`save()` başarılı update sonrası `loadDoc()` çağırıyor; `loadDoc` `loading.value = true` set ettiği için tüm `CrmEntityLayout` DOM'dan sökülüp spinner kartı gösteriliyor, sonra form geri geliyor. **Her Kaydet basışında sayfa "çöktü" gibi hissettiriyor** — bağlam kayboluyor.

Çözüm silent parametre:
```js
async function loadDoc(silent = false) {
  if (!silent) loading.value = true;
  // ...
}
// save() içinde:
await loadDoc(true); // form yerinde kalır, değerler tazelenir
```
İstenirse tazelenme sırasında forma `opacity: 0.6; transition: opacity 150ms ease`.

#### B.3 Moderasyon aksiyonu sonrası liste yenileme — `views/products/CategoryModerationView.vue:425`, `ListingModerationView.vue:629` (P2)

Her onay/red'de `loading=true` tüm listeyi spinner'a çeviriyor. Tek satırlık işlemde koca ekranın yanıp sönmesi flicker + layout shift. **Optimistic çıkarma** doğru kalıp:
```js
categories.value = categories.value.filter(c => c.name !== cat.name);
loadCategories(true); // silent, arka planda
```
İstenirse `tbody`'yi `<TransitionGroup>` yapıp satır çıkışına `150ms ease-out opacity` (tablo satırında `position: absolute` gerekmez, sadece opacity yeterli).

#### B.4 Gereksiz refetch + filtre flicker'ı

- **`views/sales/MyQuotesList.vue:34` (P2):** Filtreleme zaten client-side (`all.filter`) ama her pill tıklamasında `loadData()` tüm veriyi yeniden çekip spinner gösteriyor. Ham listeyi `allItems` ref'inde tut, `items`'ı `computed` yap — pill değişiminde ağ çağrısı ve spinner tamamen kalkar.
- **`views/sales/RfqList.vue:93` (P3):** 400ms debounce'lu aramada tüm kart+tablo spinner'a dönüyor. Liste görünür kalsın: `:class="{ 'opacity-60': loading && items.length }"` + `transition: opacity 150ms ease`; tam spinner yalnız `items` boşken.
- **`views/system/SocialProofSettingsView.vue:101` (P2):** Her eşik değişiminde (600ms debounce) `.preview-cards` DOM'dan kalkıp tek satır metin geliyor. `v-if` yerine `.preview-cards.is-refreshing { opacity: 0.55; pointer-events: none; transition: opacity 150ms ease; }`.
- **`views/eca/EcaRuleLogView.vue:40`, `views/seo/SeoPagesView.vue:274`, `views/billing/SubscriptionPaymentsView.vue:131`, `views/seller/ListingReviewModerationView.vue:111`, `views/seller/SellerOrdersView.vue:34`:** Aynı desen — sekme/filtre değişiminde mevcut içeriği söKMEK yerine dim'le.

---

### C. Chart animasyonları: ECharts süresi ve `notMerge` yeniden çizimi

B2B kalibrasyonu chart ilk çizim animasyonunu kısa/kapalı ister ve veri güncellemesinde grafiği sıfırdan animasyonlamaz. Kod tabanı ikisini de ihlal ediyor. Bu öbekteki bulguların hepsi **tek noktadan** çözülebiliyor: `composables/dashboard/useChart.js` ve/veya tema tanımı.

#### C.1 1000ms default çizim animasyonu — `composables/dashboard/useChart.js:50` + `BaseChart.vue:44` (P1)

Hiçbir option'da/temada `animation` ayarı yok; ECharts default `animationDuration: 1000ms` devrede. Gauge'larda `valueAnimation` ~1000ms sayaç (`ComplianceDashboard.vue:265`, `LogisticsDashboard.vue:255`, `PaymentsDashboard.vue:271`). Lazy IntersectionObserver init ile scroll ettikçe her grafik tek tek 1 saniye "dans ediyor".

| | Önce | Sonra | Neden |
|---|---|---|---|
| İlk çizim | `animationDuration: 1000` (ECharts default) | `animationDuration: 300` (veya `400`), `animationEasing: 'cubicOut'` | UI animasyonu 300ms altında kalmalı |
| Güncelleme | `1000ms` sıfırdan | `animationDurationUpdate: 200`, `animationEasingUpdate: 'cubicOut'` | Filtre değişimi kısa, crisp update |
| Reduced-motion | Canvas etkilenmiyor | `rm.matches` ise `animation: false` | Canvas `prefers-reduced-motion` otomatik dinlemez |

Tek noktadan çözüm — 4 chart tipi birden düzelir:
```js
const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
const BASE_ANIM = rm.matches
  ? { animation: false }
  : { animationDuration: 300, animationEasing: 'cubicOut',
      animationDurationUpdate: 200, animationEasingUpdate: 'cubicOut' };
instance.setOption({ ...BASE_ANIM, ...optionRef.value }, { notMerge: true });
```
En sade B2B çözümü tamamen `animation: false` de kabul edilebilir — veri-yoğun panelde giriş animasyonu tümüyle atılabilir.

#### C.2 `notMerge: true` → her filtrede sıfırdan çizim — `useChart.js:81` (P1)

`setOption(newOption, { notMerge: true })` ECharts'a diff yapma, grafiği baştan kur diyor. GlobalFilterBar'da her period/satıcı değişiminde tüm dashboard chart'ları 1000ms boyunca sıfırdan büyüyerek yeniden çiziliyor. **Çözüm:** veri güncellemelerinde `notMerge: false` (merge) kullan ki ECharts diff yapıp enter yerine kısa update animasyonu oynatsın. C.1'deki `animationDurationUpdate` ile birlikte, güncellemeler 200-300ms crisp geçişe iner.

#### C.3 Computed içinde `Math.random` — deterministik olmayan yeniden çizim — `views/dashboard/ComplianceDashboard.vue:165` (P2)

`riskScatterOption` computed'i `genData` ile her yeniden hesaplamada rastgele veri üretiyor (aynı desen `LogisticsDashboard.vue:124` heatmap, `OrdersDashboard.vue:229` trend line). Tema/dil değişimi computed'i tetikliyor → veri komple değişiyor → `notMerge:true` ile tam giriş animasyonuyla yeniden çiziliyor. Ayrıca computed determinizmini bozan side-effect. **Çözüm:** rastgele veriyi modül seviyesinde bir kez üret (`const riskData = {...}`), computed yalnız renk/etiketleri temaya göre türetsin.

#### C.4 Maskeli placeholder gereksiz animasyon — `DynamicLineChart.vue:14` / `:68` (P3)

`widget.masked` durumunda `blur(4px)` + `opacity: 0.3` altında gerçek bir BaseChart render ediliyor; bu görünmeyen grafik 1000ms çizim animasyonunu perde arkasında oynatıyor — boşa GPU/main-thread işi + `filter: blur` ile birlikte gereksiz paint maliyeti. `placeholderChart` option'ına `animation: false` ekle (C.1 global fix bunu zaten kapsayacaksa da explicit false doğru). İdeali: maskeli durumda ECharts yerine statik SVG/CSS placeholder.

#### C.5 Bar chart konteyner yüksekliği zıplaması — `DynamicBarChart.vue:27` (P3)

`chartHeight = rows.length * 34 + 56` — satır sayısı değişince inline height aniden değişiyor, widget zıplıyor. **`height` transition EKLEME** (layout property, reflow tetikler, doktrine aykırı); onun yerine yüksekliği kademelere yuvarla: `rows <= 3 → 160px`, `<= 6 → 220px`, üstü → `280px`. Küçük veri değişimlerinde sıçrama olmaz, BaseChart'ın ResizeObserver'ı yeterli.

#### C.6 Pipeline segment `flex` transition'ı — `views/crm/CrmDashboardView.vue:61` (P3)

`crm.scss:534-547` — `.crm-pipeline-seg` üzerinde `transition: flex 0.25s` + `&:hover { filter: brightness(1.06) }` (filter transition listesinde değil, anında snap). **`flex` bir layout property'si** — her segment genişlemesi reflow tetikliyor; Emil ilkesi yalnız `transform`/`opacity`. Ayrıca genişlik animasyonlu ama hover snap — tutarsız. Çözüm: `transition: flex 0.25s`'i kaldır (veri değişimi animasyonsuz otursun) veya bilinçliyse yalnız ilk yüklemede çalıştır; hover için `transition: filter 120ms ease` ekle ya da brightness hover'ını tümden kaldır (title tooltip zaten bilgi veriyor).

---

### Skeleton içinde easing seçimi: shimmer neden `linear`?

Bu bölümde tekrar eden ince bir nokta: skeleton shimmer animasyonu `linear` easing kullanır, `cubic-bezier(0.23, 1, 0.32, 1)` değil. Sebep, doktrinin altında yatan gerekçeye dayanıyor. Güçlü ease-out, bir hareketin **başı ile sonu olan** durumlar içindir — bir element bir yere varır ve durur (giriş, buton feedback, panel açılışı). Shimmer ise **sonsuz, sabit hızlı** bir döngüdür; başı-sonu yoktur. Ease-out uygulanırsa her döngüde hızlanıp yavaşlayan, "nefes alan" rahatsız edici bir ritim oluşur. Sabit hareket = `linear`. Aynı mantıkla skeleton→içerik **geçişi** (bu bir varış anıdır) `cubic-bezier(0.23, 1, 0.32, 1)` ease-out kullanır. İki animasyon, iki farklı easing — bilinçli ayrım.

---

### Önerilen Standart

Bu alan için tek tip reçete. Amaç: 40+ ekrandaki spinner-only kalıbı iki paylaşılan primitife indirmek.

**1. Ortak `<SkeletonRows>` / `<SkeletonCards>` component'i.** Satır/kart yüksekliği ve adedi prop; tüm liste ve dashboard ekranları bunu kullanır. Böylece `HeaderNoticesView`/`CategoryShowcaseView`/`HeroSliderView` gibi aynı yapıyı tekrarlayan üçlüler tek yerden beslenir.

**2. Skeleton görsel tanımı (tek CSS bloğu):**
```scss
.skl {
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  background: var(--th-surface-elevated);
}
.skl::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
  transform: translateX(-100%);
  animation: skl-shimmer 1.4s linear infinite; /* sabit hareket → linear */
}
@keyframes skl-shimmer { to { transform: translateX(100%); } }
@media (prefers-reduced-motion: reduce) {
  .skl::after { animation: none; }
  .skl { background: var(--th-surface-muted); } /* statik soluk blok */
}
```
Not: `transform` tabanlı shimmer birinci tercih (GPU, layout/paint tetiklemez). `background-position` shimmer'a yalnız gradient tekniği gereken yerde ve `linear` ile başvur. Sadece-opacity `pulse` (`@keyframes { 50% { opacity: 0.55; } }`, `1.2-1.5s ease-in-out`) KPI değeri gibi tekil küçük placeholder'lar için kabul edilebilir hafif alternatif.

**3. İki katmanlı yükleme kuralı:**
- **İlk yükleme (içerik boş):** skeleton göster. Skeleton yüksekliği = gerçek içerik yüksekliği (layout shift sıfır).
- **Refetch (içerik zaten var):** skeleton'a DÖNME. Mevcut içeriği DOM'da tut, dim uygula:
```scss
.is-refreshing { opacity: 0.55; pointer-events: none; transition: opacity 150ms ease; }
```
Koşul kalıbı: `v-if="loading && !items.length"` (skeleton) vs `:class="{ 'is-refreshing': loading }"` (dim).

**4. İçerik girişi:** skeleton→içerik veya boş→içerik geçişi `<Transition name="fade">` veya `animation: fadeIn 150-200ms cubic-bezier(0.23, 1, 0.32, 1)`. Süre 200ms'i geçmez (B2B crisp).

**5. Kaydet/aksiyon sonrası:** `loadDoc(silent = true)` veya optimistic update ile sayfayı çökertme; gerekiyorsa yerinde `opacity: 0.6` tazelenme.

**6. Chart animasyon reçetesi (tek nokta, `useChart.js`):**
```js
const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
const BASE_ANIM = rm.matches ? { animation: false } : {
  animationDuration: 300,       animationEasing: 'cubicOut',
  animationDurationUpdate: 200, animationEasingUpdate: 'cubicOut',
};
// İlk çizim: setOption({ ...BASE_ANIM, ...option }, { notMerge: true })
// Güncelleme: setOption(newOption, { notMerge: false })  // merge → diff → kısa update
```
Placeholder/maskeli chart'lara her koşulda `animation: false`. Konteyner yükseklikleri kademeli (`transition: height` asla). Chart yükleme durumu ECharts native `showLoading`/`hideLoading` ile `loading` prop'una bağlı (ölü prop kaldırılmalı ya da bağlanmalı).

**Öncelik özeti:** WidgetWrapper/DynamicDashboard/DealsListView-ailesi/TicketsListView-ailesi/ContactDetailView + `useChart.js` chart baseline **P1** — en görünür, en sık, tek noktadan en geniş etki. Matris/tablo/detay skeleton'ları **P2**. Dropzone/mesaj/ayar placeholder'ları ve maskeli chart **P3**.

---

## 7. Mobil ve Tablet

Bu bolum panelin dokunmatik yuzeylerini (`<768px` telefon, `768-1024px` tablet) Emil Kowalski'nin etkilesim ilkeleri acisindan denetler. Masaustunun aksine mobilde `:hover` bir geri bildirim kanali degildir; parmakla dokunan kullanici icin `:active` ve giris/cikis gecisleri **tek** "UI dinliyor" sinyalidir. Denetimin ana bulgusu net: proje mobilde olgun bir bottom sheet dili (`.m-sheet`, iOS egrisi `translateY(105%)`) benimsemis, MobileTabBar + bolum sheet gezinme kalibini kurmus; ancak bu dil dosyalar arasinda **tutarsiz** uygulanmis. Bazi yuzeyler sheet'e donusturulmus ama animasyonsuz "pop-in" yapiyor, bazi cekmeceler hala masaustu yan-drawer'i olarak aciliyor, cok sayida dokunma yuzeyi hicbir `:active` tepkisi vermiyor ve tum kod tabaninda **tek bir `@media (hover: hover)` korumasi yok** (grep: 0) — yani her hover efekti dokunmatikte "yapiskan hover" (sticky hover) riski tasiyor.

Toplam 31 bulgu tespit edildi. Dagilim: **3 adet P1** (mobil deneyimi acikca kiran), **11 adet P2**, **17 adet P3**. Bulgular dort tekrar eden kalibi izliyor; bolumu bu kaliplara gore grupladik:

1. Bottom sheet / drawer kalip tutarsizliklari (giris-cikis animasyonu, egri, yon)
2. Dokunma `:active` geri bildiriminin yoklugu
3. `@media (hover: hover)` korumasiz hover'lar (sticky hover / hover-gated affordance)
4. Tam-ekran gecis ve konumlandirma (master-detail, toast, tablet kirilimi)

---

### 7.1 Bottom sheet ve drawer kalibi: yarim uygulanmis hareket dili

Proje `.m-sheet` global kalibiyla dogru bir temel kurmus (`assets/scss/mobile-nav.scss:401`): `translateY(105%)` baslangic, `cubic-bezier(0.32, 0.72, 0.35, 1)` iOS-tarzi egri. Sorun, bu kalibin uc farkli sekilde **eksik** uygulanmasi: (a) sheet gorunumu var ama gecis yok, (b) sheet olmasi gerekirken hala yan-drawer, (c) global egrinin kendisi ideal degil.

#### 7.1.a Sheet'e donusmus ama animasyonsuz "pop-in" yapan yuzeyler

En yaygin ve en gorunur kusur. Bu yuzeyler mobilde alta sabitlenmis (`border-radius: 16px 16px 0 0`, `align-items: flex-end`) ama `v-if` ile **aninda** beliriyor/kayboluyor — yani "alttan gelip alta gider" sezgisi kirik. Emil/Sonner ilkesi: bir eleman geldigi yonden girmeli, ayni yonden cikmali (mekansal tutarlilik).

`views/seller/SellerOrdersView.vue:1314` — siparis modallari mobilde bottom sheet gorunumune sokulmus ama dosyada hic `<Transition>` yok; `v-if` ile pop-in.

`views/doctype/OrderMobile.vue:937` ve `views/doctype/UserProfileMobile.vue:873` — birebir ayni sorunu tekrarlayan iki dosya. Keyframe yalnizca `translateY(24px)` yukseliyor: bu bir drawer kaymasi degil, "belirip hafif zipliyor" (fade+nudge) hissi. Ustelik giris animasyonlu ama cikis **tamamen yok** (backdrop da fade-out yapmiyor).

`views/products/CategoryManagementView.vue:2492` — girisi dogru (`catMSheetIn`, `from: translateY(100%)`) ama `<Transition>` sarmalayicisi olmadigi icin cikis animasyonsuz; backdrop `bg-black/50` fade'siz sert kesme yapiyor.

`components/layout/NotificationPanel.vue` — mobilde (`@media(max-width:767px)`, satir 609) tam-ekran sheet oluyor ama masaustu `dropdown` gecisini koruyor: yani tam-ekran katman `translateY(-4px)` ile minik bir zipliyor. Buyuk yuzey icin 4px nudge anlamsiz ve ucuz durur.

| Sorun | Once | Sonra | Neden |
|---|---|---|---|
| Sheet gorunumu var, gecis yok (`SellerOrdersView.vue:1314`) | `v-if` ile pop-in, `<Transition>` yok | `<Transition name="m-sheet">` ile sar; global `translateY(105%)` kurali alttan kaydirir | Bottom sheet'in temel sezgisi "alttan gelip alta gider"dir |
| Yetersiz nudge + cikis yok (`OrderMobile.vue:937`, `UserProfileMobile.vue:873`) | `from { transform: translateY(24px); opacity: 0 }`, cikis animasyonsuz | `from { transform: translateY(100%) }`; kapanis icin `<Transition name="om-sheet">` + `leave-to { transform: translateY(100%) }`, `0.22s` | 24px itis "kayma" degil "zipla" hissi verir; cikisin yoklugu mekansal tutarsizlik |
| Giris var, cikis + backdrop fade yok (`CategoryManagementView.vue:2492`) | `catMSheetIn` giris dogru, `v-if` cikis yok, backdrop fade'siz | `<Transition name="cat-m-sheet">`: `enter/leave-active { transition: transform 0.28s cubic-bezier(0.32,0.72,0,1) }`; backdrop ayri `<Transition name="fade">` | Giren eleman ciarken de kaymali; sert backdrop kesmesi ucuz durur |
| Tam-ekran sheet mikro-nudge koruyor (`NotificationPanel.vue`) | mobilde `dropdown` gecisi: `translateY(-4px)` | mobil media'da override: `enter-from/leave-to { opacity:0; transform:translateY(100%) }`, `transform 240ms cubic-bezier(0.32,0.72,0,1)` | Tam-ekran yuzey ya fade ya alttan sheet gibi girmeli; 4px kayma buyuk yuzeyde anlamsiz |

#### 7.1.b Mobilde hala yan-drawer olarak acilan cekmeceler

Bu yuzeyler `<768px`'te bile masaustu davranisini (sagdan kayan dikey drawer, `~92vw` genislik) koruyor. Hem hareket dili hem basparmak ergonomisi projenin geri kalanindan ayrisiyor; asagi-swipe kapatma beklentisi karsilanmiyor.

`components/common/datatable/DataTableToolbar.vue:117` — filtre cekmecesi her ekranda `w-[380px] max-w-[92vw]` sag drawer. `assets/scss/crm.scss:684` ve `components/crm/QuickCreateDrawer.vue:4` — CRM/TaxonomySettings hizli olusturma cekmeceleri mobilde `min(460px, 92vw)` yan panel. `components/form-fields/IconPickerField.vue:54` — 54 ikonluk secim yuzeyi telefonda ortalanmis kucuk modal (hem kalip disi hem animasyonsuz).

| Sorun | Once | Sonra | Neden |
|---|---|---|---|
| Filtre cekmecesi mobilde sag drawer (`DataTableToolbar.vue:117`) | `w-[380px] max-w-[92vw]` her ekranda ayni | `@media (max-width:767px)`: `bottom-0 inset-x-0 h-auto max-h-[85vh] rounded-t-2xl`, `translateY(105%)` baslangic, `transform 260ms cubic-bezier(0.32,0.72,0,1)` | Onayli kalip `<768px`'te bottom sheet; drawer hem hareket dili hem etkilesim kalibi disina cikiyor |
| CRM/Taxonomy drawer mobilde yandan (`crm.scss:684`, `QuickCreateDrawer.vue:4`) | `width: min(460px, 92vw)`, sagdan dikey | `@media (max-width:767px)`: `top:auto; inset-x:0; width:100%; max-height:85dvh; border-radius:16px 16px 0 0; translateY(105%)`, `transform 0.26s cubic-bezier(0.32,0.72,0.35,1)` | Mevcut `.m-sheet` degerleriyle birebir; basparmak erisimi ve swipe-down beklentisi |
| Ikon modali mobilde ortalanmis (`IconPickerField.vue:54`) | `fixed inset-0 + p-4 max-h-[80vh]` ortalanmis modal | `<768px`'te alt kenara sabitle + `.m-sheet` gecisi; `>=768px`'te `modal-pop` kalir | 54 ikonluk yuzey telefonda sheet olmali; mevcut hali hem kalip disi hem animasyonsuz |

#### 7.1.c Global `.m-sheet` egrisinin kendisi (`mobile-nav.scss:401`)

Kalibin temeli saglam ama iki ince sapma var. **(1)** Egrinin 3. parametresi `0.35`; ideal iOS drawer egrisi `cubic-bezier(0.32,0.72,0,1)`'de bu `0`'dir — `0.35` sonu yumusatip "snap" hissini azaltir. **(2)** Giris ve cikis simetrik (`0.26s` her ikisi) ve tam-yukseklik bir sheet icin `0.26s` kisa (iOS ideali `300-400ms`); Emil ilkesi cikisin girisden biraz daha hizli olmasini ister.

| Sorun | Once | Sonra | Neden |
|---|---|---|---|
| Egri ve simetri (`mobile-nav.scss:401`) | enter=leave: `transform 0.26s cubic-bezier(0.32,0.72,0.35,1)` | enter: `transform 0.34s cubic-bezier(0.32,0.72,0,1)`; leave: `transform 0.24s cubic-bezier(0.32,0.72,0,1)` | `0` bitis snap hissi verir; giris guclensin, cikis hizlansin (asimetri ilkesi); `translateY(105%)` golge payi icin korunur |

#### 7.1.d Swipe-to-close eksikligi ve yaniltici grab handle (`MobileTabBar.vue:24`)

Tum sheet'lerde grab handle (`.m-sheet-grab`, `cat-m-grab`, `upm-grab`, `om-grab`) tamamen **dekoratif**; hicbir sheet'te `touchstart/pointerdown` dinleyicisi yok (grep: 0). Handle iOS'ta "asagi surukle-kapat" affordance'idir — kullanici surukler, tepki alamaz (affordance/islev uyumsuzlugu). Sheet yalniz backdrop tik, X, veya Escape ile kapaniyor. Kapsamli bir is oldugu icin **P3**: `pointerdown/pointermove` ile `translateY` takip et, esigi (`>120px` veya hiz) asinca kapat, altinda birakirsa `cubic-bezier(0.32,0.72,0,1)` ile geri yasla; transform'u JS'te ayarlarken transition'i gecici kapat. En azindan handle'a hafif `:active` tepki verilmeli.

---

### 7.2 Dokunma `:active` geri bildiriminin yoklugu

Mobilde tiklanabilir bir eleman basildigini `:active` ile hissettirmek zorundadir — hover kanali yok. Bu bulgular ayni dilim icinde tutarsizlik da barindiriyor: ornegin `PlansTab.vue`'de `fc-card`/`u-card` `:active` verirken `m-secrow` vermiyor. En kritik olani mobil gezinmenin en sik dokunulan elemani.

`assets/scss/mobile-nav.scss:255` (**P1**) — bolum sheet menu satirlari `.m-item`: yalniz `&:hover` tanimli, `:active` ve `transition` yok. Bu her sayfa gecisinin gectigi eleman; su an tap aninda hicbir gorsel tepki yok, hover ise dokunmatikte yapisip kaliyor.

`assets/scss/mobile-nav.scss:37` (**P2**) — alt tab bar sekmeleri `.m-tab-icon`: yalnizca `.active` class'inda arka plan degisiyor; tap'in kendisinde press feedback yok, gosterge navigasyon sonrasi geliyor (gecikmeli teyit).

`assets/scss/mobile-nav.scss:357` (**P2**) — "Daha" bolum kartlari `.m-sec-card`: `&:hover, &.active` birlikte tanimli, guard yok, `:active` yok (sticky hover + press yok).

`components/system/ComplianceMaskMatrixView.vue:790` (**P2**) — `.m-prow` politika satirlari: mobildeki tek etkilesim yuzeyi (sheet aciyor) ama `hover`, `:active`, `transition` tamamen yok.

`components/crm/ListingReviewModerationView.vue` → `views/seller/ListingReviewModerationView.vue:1327` (**P2**) — bottom sheet onay/red butonlari `.rvm-sheet-btn`: renk Tailwind `hover:bg-*` utility'lerinden geliyor, `:active` yok; kritik eylemler "tepkisiz" hissettiriyor.

`views/crm/ContactsListView.vue:51` (**P3**), `views/permission/PlansTab.vue:2451` (**P3**, `m-secrow`), `views/seller/SellerListingsView.vue:1392` (**P3**, `.sl-mrow`) — kart/satir yuzeyleri: hover var, dokunma tepkisi yok.

| Sorun | Once | Sonra | Neden |
|---|---|---|---|
| Bolum menu satiri, hicbir tap tepkisi (`mobile-nav.scss:255`) **P1** | yalniz `&:hover { background: $l-bg-soft }` | `transition: background $t-fast, transform 120ms cubic-bezier(0.23,1,0.32,1)`; `&:active { background: $l-bg-soft; transform: scale(0.985) }`; hover'i `@media (hover:hover) and (pointer:fine)` arkasina al | Mobil gezinmenin en sik dokunulan elemani; su an dokundugunu goremiyor |
| Tab bar sekmesi press yok (`mobile-nav.scss:37`) **P2** | yalniz `.active` arka plani, `transition: background $t-base` | `transition`'a `transform 120ms cubic-bezier(0.23,1,0.32,1)` ekle; `.m-tab:active .m-tab-icon { transform: scale(0.9) }`. Aktif `::before` gostergesi kasitli animasyonsuz (100+/gun toggle) | iOS tab bar'da dokunma aninda hafif scale beklenir; teyit gecikmeli olmamali |
| Daha kartlari sticky hover + press yok (`mobile-nav.scss:357`) **P2** | `&:hover, &.active { border-color:$brand; background:rgba($brand,0.1) }` | hover'i `@media (hover:hover) and (pointer:fine)` icine al; `&.active` bagimsiz; `transition`'a `transform $t-fast`, `&:active { transform: scale(0.97) }` | Dokunmatikte hover "secili gibi" marka cercevesi birakir; gercek press yok |
| Politika satiri tam sessiz (`ComplianceMaskMatrixView.vue:790`) **P2** | `cursor:pointer` var; hover/`:active`/transition yok | `&:active { background: $l-bg-soft; transform: scale(0.99) }`, dark: `$d-item-hover`; `transition: background 100ms ease-out, transform 100ms ease-out` | Mobildeki tek etkilesim yuzeyi; "UI dinliyor" hissi sifir |
| Sheet onay/red butonu press yok (`ListingReviewModerationView.vue:1327`) **P2** | Tailwind `hover:bg-*`, `:active` yok | `transition`'a `transform 120ms cubic-bezier(0.23,1,0.32,1)`; `&:active { transform: scale(0.98) }`; hover'i `@media (hover:hover)` arkasina al | Kritik eylemler dokunmatikte tepkisiz + yapiskan hover birakir |
| Kart/satir dokunma tepkisi (`ContactsListView.vue:51`, `PlansTab.vue:2451`, `SellerListingsView.vue:1392`) **P3** | `cursor:pointer` + hover; `:active` yok | `active:bg-gray-100 dark:active:bg-white/10` veya `.sl-mrow:active { background: $l-bg-muted }`; kartlara `&:active { transform: scale(0.99); transition: transform 120ms cubic-bezier(0.23,1,0.32,1) }` | Karta dokununca gorsel tepki olmadan route degisiyor; `:active` tek kanal |

---

### 7.3 `@media (hover: hover)` korumasi olmayan hover'lar

Kod tabaninda **tek bir** `@media (hover: hover)` yok (grep: 0). Bunun iki sonucu var: **(1) sticky hover** — dokunmatikte tap sonrasi hover state yapisip kalir (`translateY(-1px)` kalkik takilir, marka arka plani "secili gibi" gorunur); **(2) hover-gated affordance** — yalnizca hover'da gorunen kontroller (kalem ikonu, galeri aksiyonlari) dokunmatikte hic gorunmez veya iki-dokunuslu (ilk dokunus hover simule eder, ikincisi tiklar) hale gelir. Tailwind CDN'de `hover:` varyanti media-gate'lenemedigi icin bu yuzeyler icin **scoped SCSS** dogru aractir.

`components/common/datatable/EditableCell.vue:27` (**P2**) — kalem ikonu `opacity-0 group-hover:opacity-60`: dokunmatikte `group-hover` tetiklenmez, hucrenin duzenlenebilir oldugu **hic** anlasilmaz. Burada ogreti tersine cevrilir — hover yoksa ikon kalici gorunmeli.

`views/seller/ListingFormView.vue:1079` (satir 1104, 1832 dahil, **P3**) — galeri gorseli degistir/sil aksiyonlari ve alt yazi inputu `opacity-0 group-hover:opacity-100`: dokunmatikte erisimsiz/guvenilmez.

`components/crm/UserPicker.vue:36` (**P3**), `components/dashboard/filters/GlobalFilterBar.vue:155` (**P3**), `assets/scss/helpdesk.scss:528` (**P3**) — secenek satiri / modul sekmesi / `hd-row` `hd-kpi` lift efektleri: guard yok, sticky hover. Ozellikle `UserPicker`'da secili satir vurgusu (`bg-brand-50`) hover rengiyle ayni oldugu icin yanlis secim algisi yaratabilir; `GlobalFilterBar`'da yatay kaydirilabilir seride kullanici baska sekmeye gecince eski sekme hover renginde takili kalir.

| Sorun | Once | Sonra | Neden |
|---|---|---|---|
| Kalem ikonu mobilde hic gorunmez (`EditableCell.vue:27`) **P2** | `opacity-0 group-hover:opacity-60 transition-opacity` | `.edit-icon { opacity:0.45; transition: opacity 150ms ease }`; `@media (hover:hover) and (pointer:fine) { .edit-icon { opacity:0 } .group:hover .edit-icon { opacity:0.6 } }` | Hover yoksa affordance kalici gorunmeli; aksi halde hucre "duzenlenebilir" oldugunu gizler |
| Galeri hover aksiyonlari erisimsiz (`ListingFormView.vue:1079/1104/1832`) **P3** | `opacity-0 group-hover:opacity-100 transition-opacity` | `@media (hover:none) and (pointer:coarse) { .group [class*='group-hover:opacity-100'] { opacity:1 } }`; hover transition'i `@media (hover:hover) and (pointer:fine)` icine al | Hover-gated kontrol dokunmatikte iki-dokunuslu / guvenilmez |
| Sticky hover lift/bg (`UserPicker.vue:36`, `GlobalFilterBar.vue:155`, `helpdesk.scss:528`) **P3** | media korumasiz `:hover` (lift `translateY(-1px)`, `bg-brand-50` vb.) | Transform/bg iceren hover bloklarini `@media (hover:hover) and (pointer:fine)` ile sar (dark varyant dahil) | Dokunmatikte kalkik/secili state yapisip kalir; yanlis secim algisi + ozensiz his |

---

### 7.4 Tam-ekran gecis, konumlandirma ve dokunmatik yetenek

#### 7.4.a Mobil master-detail gecisi animasyonsuz (`views/messaging/BuyerMessagesView.vue:341`) **P1**

Konusma acma/kapama gunde onlarca kez yapilan, tum ekrani degistiren bir gecis. Su an `activeConversationId` class binding'i ile `fixed inset-0 z-[60]` **aninda** uygulaniyor — hicbir enter/exit yok. Ani pop mekansal baglami koparir. iOS master-detail'de detay sagdan kayarak gelir, geri basinca ayni yonden cikar.

| Sorun | Once | Sonra | Neden |
|---|---|---|---|
| Master-detail ani pop (`BuyerMessagesView.vue:341`) **P1** | class binding ile `fixed inset-0 z-[60] flex` aninda | `<768px`'te `<Transition name="bms-thread">` + `v-if`; `enter-active { transition: transform 0.25s cubic-bezier(0.32,0.72,0,1) }`, `leave-active { ...0.2s }`, `enter-from/leave-to { transform: translateX(100%) }`; `prefers-reduced-motion`'da `opacity 0.15s ease` | Detay geldigi yonden girip ayni yonden cikmali (mekansal tutarlilik); yalniz transform → GPU; cikis girisden hizli |

#### 7.4.b Toast konumu ve safe-area (`components/layout/ToastContainer.vue:2`) **P1**

Konteyner `fixed bottom-6 right-6 z-[100]`, her kirilimda ayni. `<768px`'te altta MobileTabBar (`~56-64px` + safe-area) var; `bottom-6` (24px) toast'i tam tab bar'in **uzerine** bindiriyor ve `z-100` ile tab bar'i ortuyor. iPhone home-indicator alanina da girebiliyor. `.toast` `min-width: 280px` (`forms.scss:188`) 320px ekranda `right-6` ile dar kaliyor. B2B'de kritik aksiyon toast'i tab bar'in ardinda kaybolur. (Not: Tailwind screens bu projede kaydirilmis — `md=640` — o yuzden `md:` varyanti degil, 767 esikli scoped SCSS guvenli.)

| Sorun | Once | Sonra | Neden |
|---|---|---|---|
| Toast tab bar'i ortuyor + safe-area (`ToastContainer.vue:2`) **P1** | `fixed bottom-6 right-6 z-[100]`, `min-width:280px` | Konteynere `.toast-wrap` sinifi ver, konumu SCSS'ten yonet: `@media (max-width:767px) { .toast-wrap { left:12px; right:12px; bottom: calc(64px + env(safe-area-inset-bottom, 0px)) } .toast { min-width:0; width:100% } }` | Alt tab bar + home-indicator ustune tasinmali; kritik toast tab bar ardinda kaybolmamali |

#### 7.4.c Kanban surukle-birak dokunmatikte olu (`components/common/KanbanBoard.vue:28`) **P2**

HTML5 native drag API (`draggable` + `dragstart/dragover/drop`) dokunmatik cihazlarda tetiklenmez — mobil/tablette kartlar suruklenemiyor, status degistirme akisi tamamen olu. Projede `vuedraggable 4` (sortablejs tabanli, touch destekli) zaten bagimlilik olarak var; native API tercihi gereksiz yetenek kaybi. Cozum: kart listesini `vuedraggable 4` ile degistir; veya `<768px`'te kart tiklamasinda `.m-sheet` bottom sheet ile "Duruma tasi" secenekleri sun. Kisa vade minimum: dokunmatikte `draggable=false` + sheet fallback.

#### 7.4.d Akordeon govdesi chevron ile senkronsuz (`components/system/ModuleMatrixTab.vue:434`) **P3**

Chevron `.head-arrow` `transform $t-panel` ile ~180ms animasyonlu donerken govde `v-if` ile 0ms'de beliriyor — ayni etkilesimin iki parcasi farkli hizda. Cozum: grid teknigi — govdeyi `.acc { display:grid; grid-template-rows:0fr; transition: grid-template-rows 180ms ease-out }` > `overflow:hidden` icine al, acikken `1fr`. Ucuz alternatif: `<Transition>` ile `opacity 0→1 + translateY(-4px)→0`, 150ms ease-out, cikis 100ms.

#### 7.4.e Sabit kaydet cubugu animasyonsuz beliriyor (`views/seller/StorefrontLayoutEditor.vue:394`) **P3**

`.sle-mobile-save-bar` `v-if="!loading && sellerCode"` — yukleme bitince cubuk pat diye beliriyor. Alttan sabitlenen yuzey alttan kaymali. Cozum: `<Transition name="savebar">`, `enter-from { transform: translateY(100%) }`, `enter-active { transition: transform 260ms cubic-bezier(0.32,0.72,0,1) }` (yalniz enter); `prefers-reduced-motion`'da `transition: none`.

#### 7.4.f Tablet kirilimi: dokunmatik iPad'de hover'a bagimli masaustu (`composables/useBreakpoint.js:5`) **P2 / tablet**

`isLg = min-width 768px`. `AppLayout`'ta IconRail/SidePanel `v-if='isLg'`, MobileTabBar `v-if='!isLg'`. Yani iPad portre (768-834px) dokunmatik olmasina ragmen masaustu rail+panel'i aliyor: `.rail-icon`, `.panel-item`, `.sub-menu` `translateX` hover-acilir etkilesimleri dokunmatikte ya tetiklenmiyor ya yapisiyor. Sonuc: tablette "yarim calisan masaustu". Bu, bolumun **altyapisal** bulgusudur ve 7.3'teki tum sticky-hover bulgularini kapsar.

| Sorun | Once | Sonra | Neden |
|---|---|---|---|
| Tablette hover-bagimli rail/panel (`useBreakpoint.js:5`) **P2/tablet** | `isLg = min-width 768px`; hic `@media (hover:hover)` yok (grep:0) | Tum hover animasyon/stillerini `@media (hover:hover) and (pointer:fine)` arkasina alacak genel SCSS kalibi (ozellikle `.rail-icon`, `.panel-item`, `.sub-menu`, `.m-sec-card`, `.rvm-sheet-btn`); dokunma icin `:active` ekle. Opsiyonel: `pointer:coarse` tabletlerde tab bar'i 1024'e kadar surdur | 768-1024 dokunmatik tabletler hover'a dayali etkilesimleri "yarim" aliyor |

---

### Onerilen Standart

Bu alanin tek-tip recetesi. Yeni her mobil/tablet yuzeyi asagidaki kurallara uymali; mevcut bulgular bu recete uygulanarak kapatilir.

**1. Bottom sheet (tum mobil overlay'ler icin tek kalip).** Merkezi modal, yan-drawer veya ozel keyframe yerine `<768px`'te daima `.m-sheet` global kalibini kullan:
```scss
// enter guclu, exit hizli — asimetri ilkesi; snap icin bitis parametresi 0
.m-sheet-enter-active { transition: transform 0.34s cubic-bezier(0.32, 0.72, 0, 1); }
.m-sheet-leave-active { transition: transform 0.24s cubic-bezier(0.32, 0.72, 0, 1); }
.m-sheet-enter-from, .m-sheet-leave-to { transform: translateY(105%); } // 105% = golge payi
```
Sheet daima `<Transition>` ile sarilir (asla ciplak `v-if` + keyframe degil), backdrop ayri `<Transition name="fade">` ile es zamanli girip cikar. Yuzey `border-radius: 16px 16px 0 0`, `max-height: 85dvh`. Ideal olarak grab handle'a `pointerdown/pointermove` swipe-to-close baglanir (esik `>120px` veya hiz); baglanamiyorsa handle en azindan `:active` tepki vermeli.

**2. Dokunma geri bildirimi zorunlu.** Her tiklanabilir mobil yuzey (satir, kart, buton, tab, menu ogesi) `:active` vermeli — hover mobilde yok:
```scss
transition: background-color 120ms ease, transform 120ms cubic-bezier(0.23, 1, 0.32, 1);
&:active { background: $l-bg-soft; transform: scale(0.98); } // satir/kart 0.99, buton 0.97-0.98, tab-icon 0.9
```
Dark tema icin ayni kalip `$d-item-hover` / `rgba(255,255,255,0.05)` ile. Yuksek-frekansli durum gostergeleri (aktif tab `::before`) kasitli animasyonsuz kalir.

**3. Her hover `@media (hover: hover) and (pointer: fine)` arkasinda.** Istisnasiz. Transform/box-shadow/marka-bg iceren hover'lar sticky-hover birakir; hover-gated affordance'lar (kalem ikonu, galeri aksiyonlari) dokunmatikte kalici/gorunur olmali. Tailwind `hover:` CDN'de media-gate'lenemedigi icin bu yuzeyler scoped SCSS'e tasinir:
```scss
.el { opacity: 0.45; } // dokunmatikte kalici
@media (hover: hover) and (pointer: fine) {
  .el { opacity: 0; }
  .group:hover .el { opacity: 0.6; }
}
```

**4. Tam-ekran gecisler mekansal.** Master-detail yatay (`translateX(100%)`, 0.25s enter / 0.2s leave), alttan yuzeyler dikey (`translateY`). Yon giris = cikis. Yalniz `transform`/`opacity` (GPU). `prefers-reduced-motion`'da tum transform gecisleri `opacity 0.15s ease` veya `none`.

**5. Konumlandirma safe-area ve tab bar farkinda.** Alt-sabit yuzeyler (toast, FAB, kaydet cubugu) `<768px`'te `bottom: calc(64px + env(safe-area-inset-bottom, 0px))` ile MobileTabBar ve home-indicator ustune tasinir. Kenar payi `left/right: 12px`, tam genislik (`min-width: 0; width: 100%`).

**6. Tablet dokunmatik = mobil etkilesim modeli.** `768-1024px` dokunmatik cihazlar hover'a dayali masaustu etkilesimlerini almamali; hover kurallari `@media (hover: hover)` arkasinda oldugundan bu kirilimda otomatik devre disi kalir ve `:active` devreye girer. Opsiyonel: `pointer: coarse` tabletlerde tab bar'i 1024'e kadar surdur.

**Iyi ornekler (referans alinacak).** `PlansTab.vue`'deki `fc-card`/`u-card` `:active` kalibi (satir seviyesinde dogru dokunma feedback'i), `CategoryManagementView.vue`'nin `catMSheetIn` girisi (`from: translateY(100%)` dogru yon) ve global `.m-sheet` kalibinin varligi bu alanin dogru yonde ilerledigini gosteriyor — eksik olan **tutarli uygulama**, temel dil degil.

---

## Erişilebilirlik ve Performans

Micro-animasyon denetiminin bu bölümü, animasyonların *nasıl göründüğüyle* değil, iki temel soruyla ilgilenir: **hareket hassasiyeti olan bir kullanıcı bu paneli kullanabiliyor mu?** ve **bu animasyonlar 60fps'i düşürmeden çalışıyor mu?** Emil Kowalski'nin sık tekrarladığı ilke burada iki maddeye iner:

> **1. Hareket bir tercih meselesidir.** `prefers-reduced-motion: reduce` diyen kullanıcı, translate/scale/rotate gibi *konumsal* hareketleri görmek istemiyor demektir. Doğru cevap animasyonu tamamen "öldürmek" değil; hareketi kaldırıp **opacity/renk geçişlerini kısaltarak korumaktır**. Arayüz hâlâ yumuşak hissettirmeli, sadece kaymamalı.
>
> **2. Sadece `transform` ve `opacity` anime edilir.** Bu iki property compositor thread'de, GPU'da çalışır; main thread'i bloklamaz, layout/reflow tetiklemez. `width`, `height`, `left`, `top`, `margin` animasyonları her frame'de layout+paint zorlar — özellikle etkileşim anında (thumb kayması, panel açılması) frame düşürür. `transition: all` ise bu ihlalleri gizleyen bir şemsiyedir: renk, border, box-shadow dahil her şeyi animasyona sokar.

B2B bağlamında bu iki ilke lüks değil, **temel kalite eşiğidir**. Panel gün boyu açık kalan, onlarca kez aynı yüzeyleri açıp kapatan operasyon kullanıcıları içindir; en sık tetiklenen animasyon en ucuz olmalı, ve vestibüler rahatsızlığı olan bir kullanıcı paneli baş dönmesi yaşamadan kullanabilmeli.

Denetimde bu iki başlık altında toplam **27 bulgu** tespit edildi. Bunların büyük kısmı tekil hatalar değil, **iki sistemik boşluğun** tekrar tekrar yüzeye çıkması:

1. **Global `prefers-reduced-motion` altyapısı yok.** `assets/scss/animations.scss` içindeki 4 merkezi Vue Transition kalıbının (fade / dropdown / toast / m-sheet) hiçbiri global olarak muaf tutulmuyor. Reduced-motion desteği yalnızca ~15 dosyada *lokal ve tutarsız* olarak var (`sidebar.scss:55`, `mobile-nav.scss:411`, `ListingFormView`, `PermissionConsoleView`, `SocialProofSettingsView` vb.). Paylaşılan bileşenler (drawer, slide-over, chart, marquee) kapsam dışında.
2. **`width` animasyonu ve `transition: all` yaygın bir kalıp.** Progress bar'lar, segmented thumb, yan panel, spotlight, KPI noktaları — hepsi layout-tetikleyen property'lerle anime ediliyor. Aynı görsel `transform: scaleX/translateX` ile GPU'da bedavaya elde edilebilir.

---

### Bölüm 1 — Erişilebilirlik: `prefers-reduced-motion` (15 bulgu)

#### 1.1 [P1] Global reduced-motion kill-switch yok — `assets/scss/animations.scss:60`

Bu bölümün **kök bulgusu**. Diğer reduced-motion bulgularının çoğu, bu global bloğun eksikliğinin farklı yüzeylerdeki tezahürü. Şu an vestibüler rahatsızlığı olan bir kullanıcı; toast kayması (`translateX 30px`), KPI kartı `fadeUp` (`translateY`), dropdown `translateY`, marquee sonsuz kayması ve tüm spinner dönmelerine **hiçbir kaçış olmadan** maruz kalıyor. Lokal çözümler tutarsız ve kapsayıcı değil.

| | Değer |
|---|---|
| **Önce** | `animations.scss`'te global `@media (prefers-reduced-motion)` yok. Merkezi 4 Transition kalıbı muaf değil. |
| **Sonra** | `animations.scss` sonuna güvenli global blok |
| **Neden** | Tek bir merkezi guard, tüm sayfadaki keyframe ve transition sürelerini `0.01ms`'ye indirir; hareket kaybolur, opacity geçişleri zaten anında tamamlanacağı için "sert kesme" hissi vermez. |

```scss
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Uyarı:** Bu blok spinner'ları da durdurur; yükleme göstergeleri anlamını kaybetmemeli. Spinner'lar için istisna bırak (bkz. 1.2). İdeal olan, ilkedeki "opacity'yi koru" nüansını da eklemek: aşağıdaki alt bulgular (1.3–1.5) opacity fade'i açıkça korur; global blok bir **taban güvenlik ağı**, alt bulgular ise **rafine kalıptır**. İkisi birlikte uygulanmalı — global blok her şeyi yakalar, spesifik bloklar kritik yüzeylerde yumuşak fade'i geri getirir.

#### 1.2 [P3] Marquee ve spinner'lar — `HeaderNoticePreview.vue:188`, `PermissionConsoleView.vue:473`, `AvailabilityView.vue:493`

Sonsuz (`infinite`) hareket, reduced-motion'ın **en kritik hedefidir** — vestibüler rahatsızlık için en riskli kalıp. `HeaderNoticePreview` içindeki `animation: preview-scroll 22s linear infinite`, sayfa açık kaldığı sürece **durmaksızın hareket eden tek öğe**; net bir erişilebilirlik ihlali.

| | Değer |
|---|---|
| **Önce** | `preview-scroll 22s linear infinite`, `pc-spin 0.8s linear infinite`, `avl-spin 0.8s linear infinite` — hiçbiri guardlı değil |
| **Sonra** | Marquee: `animation: none` + tam metni statik göster. Spinner: yavaşlat, öldürme |
| **Neden** | Marquee anlamını kaybetmeden statik kalabilir; spinner ise dönmezse "yükleniyor" bilgisini yitirir — bu yüzden yavaşlatılır, durdurulmaz. |

```scss
@media (prefers-reduced-motion: reduce) {
  .preview-track,
  .preview-track:hover { animation: none; }
  .preview-slide-item { transition: opacity 0.2s ease; transform: none; }
  /* spinner istisnası: dur değil, yavaşla */
  .pc-spin, .avl-spin { animation-duration: 1.2s !important; }
}
```

#### 1.3 [P2] Toast giriş/çıkış — `assets/scss/animations.scss:88`

Toast'lar `translateX` ile kayarak giriyor. Hareket duyarlı kullanıcıda bu kayma rahatsızlık verir; ama toast'ın *bildirim* değeri korunmalı — bu yüzden hareketi kaldırıp sade bir fade bırakıyoruz (sıfır değil).

| | Değer |
|---|---|
| **Önce** | `toastIn`/`toastOut` `translateX` — reduced-motion'dan muaf |
| **Sonra** | Hareket → `transform: none`; opacity fade `150ms` korunur |
| **Neden** | Toast görünmelidir; sadece *nasıl* göründüğü değişir — kayma yerine belirginleşme. |

```scss
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active, .toast-leave-active { transition: opacity 150ms ease; }
  .toast-enter-from, .toast-leave-to { opacity: 0; transform: none; }
  .toast-move { transition: none; }
}
```

#### 1.4 [P2] Giriş/stagger animasyonları — `assets/scss/animations.scss:41` + `cards.scss:34`

`.page-content` `fadeUp` (satır 41), `.kpi-card` `fadeUp`+stagger (`cards.scss:34`), `.page-*` sayfa geçişleri — hepsi `translateY` tabanlı. Reduced-motion muafiyeti yok. Sayfa girişi ve KPI stagger'ı, en sık tetiklenen giriş hareketi olduğu için vestibüler yük yaratır.

| | Değer |
|---|---|
| **Önce** | `translateY` tabanlı giriş + stagger, muafiyet yok |
| **Sonra** | Transform → `none`; opacity geçişi `100ms linear` korunur |
| **Neden** | Kart ve sayfa yine belirir (opacity), ama aşağıdan yukarı *kaymaz* — stagger'ın ritmi gider, içerik hızlıca oturur. |

```scss
@media (prefers-reduced-motion: reduce) {
  .page-content, .kpi-card { animation: none !important; }
  .kpi-card:hover { transform: none; }
  .page-enter-from, .page-leave-to { transform: none !important; }
  .page-enter-active, .page-leave-active { transition: opacity 100ms linear; }
}
```

#### 1.5 [P2] Modal / dropdown / slide-over ailesi — `SlideOverPanel.vue` + `animations.scss`

Merkezi overlay kalıplarının hiçbiri guardlı değil. `SlideOverPanel` scoped stilinde `400ms` transform geçişi var; dropdown/modal transition'ları da muaf değil. Sadece `m-sheet` (`mobile-nav.scss:410`) ve sidebar guardlı — yani mobil kısmen korunmuş, masaüstü drawer ailesi korunmamış.

| | Değer |
|---|---|
| **Önce** | Drawer `translateX(100%)` `400ms`, dropdown `translateY` — muaf değil |
| **Sonra** | Büyük transform hareketleri kaldırılır; opacity fade korunur |
| **Neden** | Tam genişlik `translateX(100%)` kayması bu dilimin en büyük tek hareketi; hassas kullanıcıda en rahatsız edici olan bu. |

```scss
/* animations.scss */
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active .modal-box, .modal-leave-active .modal-box,
  .dropdown-enter-active, .dropdown-leave-active {
    transition-duration: 1ms !important;
    transform: none !important;
  }
}
/* SlideOverPanel.vue scoped */
@media (prefers-reduced-motion: reduce) {
  .slide-over-enter-active .th-slide-panel,
  .slide-over-leave-active .th-slide-panel { transition: opacity 150ms ease; }
  .slide-over-enter-from .th-slide-panel,
  .slide-over-leave-to .th-slide-panel { transform: none; opacity: 0; }
}
```
Ayrıca `cards.scss`'e `@media (prefers-reduced-motion: reduce) { .kpi-card { animation: none; } }` eklenmeli (SlideOverPanel açılırken tetiklenen KPI `fadeUp`'ı için).

#### 1.6 [P2] ECharts + KPI stagger — `composables/dashboard/useChart.js:31` & `:44`

Grafik animasyonları JS tarafında kurulduğu için CSS media query'sinden kaçar; `1000ms` büyüme/çizim animasyonu reduced-motion'da bile tam oynar. Çözüm SCSS değil, **JS içinde matchMedia** tespiti olmalı.

| | Değer |
|---|---|
| **Önce** | `setOption` sabit `animationDuration`, reduced-motion kontrolü yok |
| **Sonra** | `matchMedia` ile animasyonu tamamen kapat |
| **Neden** | Büyüyen bar/pie/gauge büyük bir hareket; veri statik olarak da tam okunur, animasyon olmadan bilgi kaybı yok. |

```js
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const anim = reduce
  ? { animation: false }
  : { animationDuration: 400, animationEasing: 'cubicOut', animationDurationUpdate: 300 };
instance.setOption({ ...anim, /* ...option */ });
```
Bu tespit hem ilk `initChart`'ta hem tema yeniden-init noktasında yapılmalı. İlgili KPI kartı stagger'ı için `cards.scss` bloğu (1.4) yeterlidir.

#### 1.7 [P2] Tüm helpdesk animasyonları — `assets/scss/helpdesk.scss:1028`

`helpdesk.scss`'te **tek bir** reduced-motion bloğu yok: `hdSlideDown`, `hd-row`/`hd-kpi` hover `translateY`, `hd-bulk` translate girişi, `animate-spin` loader — hepsi muaf. Hareket hassasiyeti olan kullanıcı için helpdesk ekranında hiçbir kaçış yok.

| | Değer |
|---|---|
| **Önce** | Dosyada hiç `@media (prefers-reduced-motion)` yok |
| **Sonra** | Transform/keyframe hareketi kapatılır; opacity/renk geçişleri korunur |
| **Neden** | Hover `translateY` mikro-feedback'i mesru ama hassas kullanıcıda gereksiz; renk feedback'i yeterli bilgi verir. |

```scss
@media (prefers-reduced-motion: reduce) {
  .hd-row:hover, .hd-kpi:hover { transform: none; }
  .hd-dropdown { animation-duration: 0.01ms; }
  .hd-bulk-enter-from, .hd-bulk-leave-to { transform: none; }
  .hd-row::before { transition: none; }
}
```

#### 1.8 [P2] CRM drawer — `assets/scss/crm.scss:664` & `:679`

`crm.scss`'te hiç reduced-motion bloğu yok; `460px`'lik `translateX` drawer kayması her koşulda oynuyor. KPI hover `transform`'u da muaf.

| | Değer |
|---|---|
| **Önce** | `.crm-drawer` `translateX` `460px`, guard yok |
| **Sonra** | Drawer transform kaldırılır, opacity ile açılır; overlay zaten opacity-only |
| **Neden** | 460px'lik uzun mesafeli kayma büyük bir hareket; opacity fade aynı "açıldı" bilgisini verir. |

```scss
@media (prefers-reduced-motion: reduce) {
  .crm-drawer { transition: opacity 0.15s ease; transform: none; opacity: 0; }
  .crm-drawer.open { opacity: 1; }
  .crm-kpi:hover { transform: none; }
  /* .crm-drawer-overlay zaten opacity-only — dokunma */
}
```

#### 1.9 [P3] DataTableToolbar drawer — `components/common/datatable/DataTableToolbar.vue:213`

Paylaşılan bir bileşen: `dt-drawer` `translateX(100%)` her durumda oynuyor. Bazı view'lar bunu lokal çözüyor ama bu ortak bileşen çözmüyor — yani filtre çekmecesi kullanan **tüm** ekranlar etkileniyor.

| | Değer |
|---|---|
| **Önce** | `translateX(100%)` kayma, reduced-motion ele alınmamış |
| **Sonra** | Enter/leave transition `none`, transform `none`; opacity fade kalır |

```scss
@media (prefers-reduced-motion: reduce) {
  .dt-drawer-enter-active aside, .dt-drawer-leave-active aside { transition: none; }
  .dt-drawer-enter-from aside, .dt-drawer-leave-to aside { transform: none; }
}
```

#### 1.10 [P3] Segmented + Switch thumb — `components/common/BaseSegmented.vue:116`, `BaseSwitch.vue`

Thumb her seçimde `0.25s` kayıyor; reduced-motion muafiyeti yok. Bu, form kontrolleri dilimindeki en güçlü tekil hareket. (Not: aynı bileşenin *performans* boyutu 2.1'de ayrıca ele alınır — thumb hem yanlış property ile anime ediliyor hem reduced-motion'da muaf.)

| | Değer |
|---|---|
| **Önce** | Thumb `transition` konumu her seçimde `0.25s` kaydırıyor |
| **Sonra** | Konum anında değişir, opacity yumuşak kalır |

```scss
@media (prefers-reduced-motion: reduce) {
  .seg-thumb { transition: opacity $t-base; }   /* konum anlık, opacity yumuşak */
  .switch-thumb { transition: none; }
}
```

#### 1.11 [P3] `scrollIntoView` smooth — `views/products/CategoryTranslationsView.vue:202`

`el.scrollIntoView({ behavior: "smooth", block: "center" })` koşulsuz smooth. Tarayıcı bunu reduced-motion'da otomatik kapatmaz — CSS `scroll-behavior` guard'ı JS `behavior: "smooth"`'u etkilemez.

| | Değer |
|---|---|
| **Önce** | `behavior: "smooth"` her zaman |
| **Sonra** | `matchMedia` ile koşullu |

```js
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
```

---

### Bölüm 2 — Performans: layout-tetikleyen animasyonlar (12 bulgu)

#### 2.1 [P1] Segmented thumb `left`/`width` ile anime ediliyor — `components/common/BaseSegmented.vue:116`

Bölümün en yüksek öncelikli performans bulgusu. Thumb konumu `left`, genişliği `width` ile — **ikisi de layout property'si**. Her seçim değişiminde (tam etkileşim anında) reflow+paint zorlanıyor, main thread'de çalışıyor, düşük cihazlarda frame düşürüyor. Easing ve süre (`$t-spring = 0.25s cubic-bezier`) doğru; yanlış olan property seçimi.

| | Değer |
|---|---|
| **Önce** | `transition: left $t-spring, width $t-spring, opacity $t-base;` + inline `left`/`width` calc(%) |
| **Sonra** | Sabit genişlik + `transform: translateX` |
| **Neden** | `transform` compositor'da, GPU'da çalışır; layout tetiklemez. Thumb kaydığı an frame düşmez. |

```js
// thumbStyle computed
{
  width: `calc(100% / ${count} - 4px)`,
  left: '2px',
  transform: `translateX(calc(${idx * 100}% + ${idx * 2}px))`
}
```
```scss
.seg-thumb {
  left: 2px;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity $t-base;
  will-change: transform;
}
```
Seçenek sayısı çalışma anında değişmiyorsa `width` transition'ı tamamen kaldırılabilir.

#### 2.2 [P2] Yan panel `width` + `transition-all` — `components/layout/SidePanel.vue:14`

En pahalı animasyon en sık yerde. Panel günde onlarca kez açılıp kapanıyor; her toggle `width` animasyonu **tüm sayfayı** (main, tablolar, chart'lar) reflow ediyor. Üstelik `transition-all` border ve padding dahil her property'yi anime ediyor.

| | Değer |
|---|---|
| **Önce** | `class="… transition-all duration-200 …"` + `:style="{ width: visible ? '220px' : '0px' }"` |
| **Sonra** | Overlay (mobil): sabit `220px` + `translateX(-100%)`. Masaüstü in-flow: en azından tek property `width` |
| **Neden** | Overlay modunda içerik zaten panelin altında; `transform` ile kaydırmak sayfayı reflow etmez. `transition-all` her zaman tek-property ile değiştirilmeli. |

```scss
/* overlay / mobil */
.side-panel { transition: transform 0.2s cubic-bezier(0.23, 1, 0.32, 1); }
.side-panel.collapsed { transform: translateX(-100%); }
/* masaüstü in-flow — width kaçınılmazsa en azından tek property */
.side-panel--inflow { transition: width 0.2s cubic-bezier(0.77, 0, 0.175, 1); }
```

#### 2.3 [P2] GuidedTour spotlight `transition-all` + `top/left/width/height` — `components/layout/GuidedTour.vue:132`

Spotlight kutusu ve coach balonu `top/left/width/height` inline px değerleriyle, `transition-all duration-300` ile anime ediliyor. Adımdan adıma pozisyon+boyut aynı anda değiştiği için düşük cihazlarda takılıyor. Onboarding nadir kullanıldığı için animasyonun *kendisi* meşru — ama layout property'leriyle değil transform'la yapılmalı.

| | Değer |
|---|---|
| **Önce** | `class="… transition-all duration-300"` + `spotStyle` top/left/width/height |
| **Sonra** | `transform: translate(x,y)` + scale; `transition-[transform]` |
| **Neden** | Pozisyon ve boyut GPU compositor'da kalırsa adım geçişleri düşük cihazda da akıcı olur. |

En azından `transition-all` → `transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)`; konumu `translate`, boyutu `transform-origin` + `scale` ile ver.

#### 2.4 [P2] Ticket detayına `location.assign` (full page reload) — `views/helpdesk/TicketsListView.vue:758`

Bu, dilimin **algılanan hız açısından en pahalı** bulgusu. Ekranın ana eylemi (günde onlarca kez) her tıklamada **tüm SPA'yı baştan boot ediyor**: beyaz ekran, tüm store'lar yeniden yükleniyor, layout `fadeUp` animasyonu yeniden oynuyor. Bir animasyon *fazlalığı* değil, animasyonun *yanlış yerde* oynaması — istenmeyen bir yeniden-boot animasyonu. `SellerInquiriesListView` aynı işi `router.push` ile doğru yapıyor.

| | Değer |
|---|---|
| **Önce** | `location.assign('/panel/helpdesk/tickets/…')` — full reload |
| **Sonra** | `router.push('/helpdesk/tickets/${encodeURIComponent(tk.name)}')` |
| **Neden** | Route zaten mevcut; SPA içi geçiş anlık olur, hiçbir yeniden-boot animasyonu oynamaz. |

```js
import { useRouter } from 'vue-router';
const router = useRouter();
// goToTicket:
router.push(`/helpdesk/tickets/${encodeURIComponent(tk.name)}`);
```

#### 2.5 [P2] Dropdown `transition: all` — `assets/scss/animations.scss`

Global altyapı anti-pattern'i merkezi dropdown kalıbında da var. `all`; renk/border/box-shadow gibi paint ve layout property'lerini de animasyona sokar — gereksiz reflow/paint riski.

| | Değer |
|---|---|
| **Önce** | `.dropdown-enter-active { transition: all 0.15s ease } .dropdown-leave-active { transition: all 0.1s ease }` |
| **Sonra** | Property-belirli transform + opacity |
| **Neden** | Yalnızca `transform` ve `opacity` GPU'da; `all` gizli reflow kaynağı. |

```scss
.dropdown-enter-active { transition: transform 150ms ease-out, opacity 150ms ease-out; }
.dropdown-leave-active { transition: transform 100ms ease-in-out, opacity 100ms ease-in-out; }
```
`SlideOverPanel`'deki property-belirli transition bu kalıbın referansı — diğer merkezi transition'lar buna taşınmalı.

#### 2.6 [P2] Sahte ilerleme çubuğu — JS `setInterval` + `width` tick — `components/layout/IconRail.vue:203`

Yaygın bir kalıp: `window.setInterval(() => tickPct(), 100)` her 100ms'de reaktif değeri artırıp bir `width` transition'ını sürüyor. **Aynı kalıp:** `ProfileImageDropzone`, `LayoutSectionCard.vue:532`, `lib/upload-ui/uploader.ts:97`, `SlotDropzone.ts:289`, `file-list.ts:175`. Yükleme sırasında — yani tam da sayfanın en yoğun anında — main thread'de her 100ms style değiştirip bunu `width` transition'ına bağlamak frame düşürür.

| | Değer |
|---|---|
| **Önce** | `setInterval(tickPct, 100)` → reaktif `width` + çoğu yerde `transition-all duration-300` |
| **Sonra** | CSS keyframe indeterminate bar; zorunluysa `transform: scaleX` |
| **Neden** | CSS animasyon main thread dışında çalışır; JS tick + width en pahalı kombinasyon. |

Sahte ilerleme için tek seferlik başlatılan CSS `translateX` tabanlı belirsiz (indeterminate) animasyon tercih edilmeli. Gerçek değer sürülüyorsa `transition: transform 150ms linear` ile `scaleX`'e bağla; en azından `transition-all` → `transition-transform`.

#### 2.7 [P3] Progress bar'lar `width` → `scaleX` (bileşen ailesi)

Aynı ihlalin dört yüzeyi. Hepsi sabit hızda dolan çubuklar; `transform: scaleX` ile GPU'da bedavaya aynı görsel elde edilir. `transform-origin: left` **şart** — yoksa çubuk ortadan büyür.

| Dosya | Önce | Sonra |
|---|---|---|
| `components/seller/LayoutSectionCard.vue:179` | `transition-all duration-300` + `width %` | `transform: scaleX(p/100)` + `transition-transform duration-150 ease-linear` |
| `components/upload/ProfileImageDropzone.vue:60` | `transition-[width] duration-300 ease-out` + `width %` | `w-full` + `transform: scaleX(max(0.06, p/100))` + `origin-left transition-transform duration-300 ease-out` |
| `assets/scss/helpdesk.scss:523` | `transition: width $t-spring` (0→dolar) | `transform: scaleX(0→1)`, `transform-origin: left`, `transition: transform 0.25s cubic-bezier(0.4,0,0.2,1)`; konteyner `overflow: hidden` |

Genel reçete:
```html
<div class="track"><!-- overflow:hidden, w-full -->
  <div class="fill origin-left transition-transform duration-150 ease-linear"
       :style="{ transform: `scaleX(${Math.max(0.06, pct/100)})` }"></div>
</div>
```

#### 2.8 [P3] KPI karüsel noktaları `width` ile anime — `views/system/PermissionConsoleView.vue:587` (mobile)

`.kpi-dots span` aktif olunca `width: 5px → 16px`, `transition: all $t-base`. Küçük eleman ama scroll handler'ıyla senkron çalıştığından kaydırma sırasında **her tick'te** layout tetikliyor.

| | Değer |
|---|---|
| **Önce** | `width: 5px→16px`, `transition: all $t-base` |
| **Sonra** | Sabit `16px` + `transform: scaleX` |

```scss
.kpi-dots span {
  width: 16px; transform: scaleX(0.31); transform-origin: center;
  transition: transform 0.15s ease, background-color 0.15s ease;
}
.kpi-dots span.is-on { transform: scaleX(1); }
```

#### 2.9 [P3] Slide timer sekme gizliyken durmuyor — `components/system/HeaderNoticePreview.vue:98`

`setInterval(5000)` sekme gizlendiğinde durmuyor; geri dönüldüğünde slide'lar arka planda dönmüş oluyor. Etki sınırlı (küçük önizleme) ama arka planda boşuna çalışan animasyon zamanlayıcısı hem tutarlılık hem batarya/performans pürüzü. Sonner ilkesi: sekme gizlenince timer durmalı.

| | Değer |
|---|---|
| **Önce** | `visibilitychange` yok; interval arka planda çalışır |
| **Sonra** | `document.hidden` → `stopSlide()`, görünür → `startSlide()` |

```js
const onVis = () => (document.hidden ? stopSlide() : startSlide());
document.addEventListener('visibilitychange', onVis);
onUnmounted(() => document.removeEventListener('visibilitychange', onVis));
```

---

### İyi Örnekler

Denetim yalnızca ihlalleri değil, projenin *zaten doğru yaptığı* kalıpları da not ediyor — reçete bunları standarda taşımaktan ibaret:

- **`SlideOverPanel.vue`** — transition'ları property-belirli (`transform`/`opacity`), `transition: all` kullanmıyor. Diğer merkezi transition'lar için referans kalıp (2.5).
- **`SellerInquiriesListView`** — detay geçişini `router.push` ile yapıyor; `TicketsListView`'ın (2.4) düzeltilmesi gereken doğru hâli.
- **`sidebar.scss:55` ve `mobile-nav.scss:411`** — `prefers-reduced-motion` guard'ı zaten var; mobil sheet ve sidebar korunmuş. Eksik olan, bu disiplinin paylaşılan bileşenlere (drawer, slide-over, chart, marquee) genişletilmemesi.
- **`ListingFormView`, `PermissionConsoleView`, `SocialProofSettingsView`** — lokal reduced-motion çözümleri mevcut; sorun kapsamın tutarsız olması, niyetin yokluğu değil.

Yani proje ilkeleri *biliyor*; boşluk **merkezileştirme** boşluğu. Global bir guard ve tek-property disiplini, 27 bulgunun büyük çoğunluğunu üç-dört dosyada kapatıyor.

---

### Önerilen Standart

Bu alan için tek tip reçete — her yeni animasyon bu iki kurala uymalı:

**A. Reduced-motion (merkezi + rafine, iki katman)**

1. **Taban güvenlik ağı** — `assets/scss/animations.scss` sonuna global blok (1.1). Her keyframe/transition süresini `0.01ms`'ye indirir, hiçbir yüzeyi kaçırmaz.
2. **Rafine katman** — kritik yüzeylerde (toast, drawer, slide-over, KPI kartları) hareketi kaldırıp **opacity fade'i koru** (sıfırlama, `150ms` bırak). İlke: *"reduce" = hareketsiz, ama hissiz değil.*
3. **İstisnalar** — spinner'lar durdurulmaz, yavaşlatılır (`animation-duration: 1.2s`); marquee statik metne düşer.
4. **JS animasyonları** (ECharts, `scrollIntoView`) CSS media query'sinden kaçar — her birinde `window.matchMedia('(prefers-reduced-motion: reduce)').matches` ile ayrı guard.

**B. Performans (yalnızca compositor property'leri)**

1. **Sadece `transform` ve `opacity` anime edilir.** `width`/`height`/`left`/`top`/`margin` animasyonu **yasak** — layout tetikler.
   - Konum → `transform: translateX/Y`
   - Boyut/progress → `transform: scaleX` + `transform-origin: left`
   - Genişleyen nokta/thumb → sabit boyut + `transform: scale`
2. **`transition: all` yasak** (Tailwind `transition-all` dahil). Her zaman property-belirli: `transition: transform 200ms …, opacity 200ms …`.
3. **JS `setInterval` + style yasak** ilerleme göstergelerinde — CSS keyframe indeterminate bar, ya da `transform: scaleX`'e bağlı tek transition.
4. **Timer disiplini** — `setInterval`/animasyon zamanlayıcıları `visibilitychange` ile sekme gizliyken durur, `onUnmounted`'da temizlenir.
5. **SPA içi navigasyon `router.push`** ile — asla `location.assign`; full reload istenmeyen bir "yeniden-boot animasyonu"dur.

**Standart easing/süre** (Emil, B2B — crisp/hızlı):
- Giriş: `transform: scale(0.95)` + `opacity: 0` → `cubic-bezier(0.23, 1, 0.32, 1)`, `160–200ms`
- Progress/linear: `ease-linear`, `150ms`
- Buton `:active`: `scale(0.97)`, `~80ms`
- UI transition üst sınırı: **< 300ms** (drawer `200ms`, dropdown `150ms`, toast `150ms`)

---

## Dosya Envanteri: views (admin – helpdesk)

Bu bölüm `views/` ağacının ilk yarısını (admin, auth, billing, bulk-import, buyer, crm, dashboard, doctype, eca, feed, helpdesk) dosya dosya tarar. Toplam **119 bulgu** kayıt altına alındı. Baskın üç örüntü net: (1) `v-if` ile açılan modal/sheet/dropdown'larda **enter/exit Transition eksikliği**, (2) tıklanabilir elemanlarda **`:active` press feedback yokluğu**, (3) liste/tablo yüklemelerinde **skeleton yerine spinner/düz metin** kullanımı ve buna bağlı layout shift. Bunlara `transition: all` disiplin ihlalleri ve dokunmatikte yapışan (sticky) hover'lar eşlik ediyor.

### En Sorunlu 5 Dosya (öncelikli müdahale)

| # | Dosya | Neden kritik |
|---|-------|--------------|
| 1 | `views/eca/EcaRuleFormView.vue` | Projenin en etkileşim-yoğun formu (kural sihirbazı); 8+ tıklanabilir sınıfın **hiçbirinde** `:active` feedback yok (P1), `transition: all`, üç büyük sonuç bloğu animasyonsuz, yükleme düz metin. 6 ayrı bulgu tek dosyada yığılıyor. |
| 2 | `views/doctype/DocTypeFormView.vue` | İki tam ekran modal çıplak `v-if` (P1), link autocomplete dropdown animasyonsuz, iki yerde `transition: all`, mobil accordion ve sabit kaydet çubuğu ani. En sık kullanılan form yüzeyi. |
| 3 | `views/helpdesk/TicketsListView.vue` | İki P1 aynı anda: 6 dosyaya yayılan skeleton-yok kalıbı ve 7 modallı `hd-modal` animasyon eksikliği; üstüne `goToTicket` **`location.assign` ile full page reload** yapıyor (dilimin en pahalı algılanan-hız sorunu). |
| 4 | `views/crm/CommissionAdminView.vue` | Onay/red/ödeme butonlarının CSS sınıfları **hiçbir stylesheet'te tanımlı değil** (P1) — butonlar Tailwind reset'iyle çıplak metin gibi; hover/active/disabled/transition sıfır. Aynı sorun 2 kardeş dosyada tekrar. |
| 5 | `views/doctype/OrderMobile.vue` + `UserProfileMobile.vue` | Bottom sheet'lerde **çıkış animasyonu tamamen yok** (P1); giriş keyframe'li, kapanış anında kesiliyor. Keyframes retarget edemediği için hızlı aç/kapa bozuluyor; 24px nudge gerçek drawer hissi vermiyor. İki dosyada birebir tekrar. |

---

### views/admin/CertVerificationView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Reddetme modalı (backdrop + panel) — satır 289 | `v-if="showRejectModal"`, Transition yok; enter/exit ve backdrop fade yok, anında yapışıp anında kayboluyor | `<Transition name="fade">` ile sar (backdrop opacity `0.2s ease`). Panel: `.fade-enter-from` içinde `transform: scale(0.96)`, panel `transition: transform 200ms cubic-bezier(0.23,1,0.32,1), opacity 200ms`; çıkış `150ms ease`. transform-origin center (modal istisnası). Asla `scale(0)`. |
| P2 | Onayla/Reddet/Görüntüle/Yenile butonları (~10 yer: tablo/grid/list + modal) — satır 121 | `hover:bg-*` `transition-colors`'suz renk sıçraması; hiçbir butonda `:active` press yok | `transition-[background-color,transform] duration-150 active:scale-[0.97]`; ya da scoped `transition: background-color 150ms ease, transform 120ms ease-out; &:active { transform: scale(0.97); }` |
| P2 | Liste ilk yükleme durumu — satır 31 | Düz metin "Yükleniyor…"; skeleton yok, metin→tablo geçişinde büyük layout shift | 4–6 placeholder satırlık tablo iskeleti; shimmer `linear-gradient(90deg, transparent, rgba(0,0,0,0.05), transparent)`, `background-size: 200% 100%; animation: shimmer 1.2s linear infinite`; `prefers-reduced-motion`'da `animation: none; opacity: 0.6` |

### views/admin/SellerVerificationQueueView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Reject / Schedule / Edit modalları (3 adet) — satır 209, 276, 321 | Üçü de `v-if`, Transition yok; backdrop fade ve panel enter/exit yok, aynı sorun tek dosyada 3 kez | Her üçünü `<Transition name="fade">` ile sar; panel `transform: scale(0.96)→1`, `transition: transform 200ms cubic-bezier(0.23,1,0.32,1)`, leave `150ms ease`. Kalıcı çözüm: ortak `BaseModal` bileşenine çıkar (üç markup aynı). |
| P2 | Satır aksiyon butonları (Planla/Belge Yükle/Onayla/Reddet/Düzenle) + modal butonları (~10 yer) — satır 142 | `hover:bg-*` transition'sız, `:active` yok; admin'in günde onlarca kez bastığı yüzey | `transition: background-color 150ms ease, transform 120ms ease-out; &:active { transform: scale(0.97); }` (Tailwind: `transition-colors duration-150 active:scale-[0.97]`) |
| P2 | Sekme geçişinde tablo yeniden yükleme (satır 46 yükleme) | Sekme geçişinde içerik komple DOM'dan sökülüp "Yükleniyor…" basılıyor, flash | İlk yüklemede skeleton; sonraki sekme geçişlerinde mevcut tabloyu DOM'da tut + `opacity: 0.5; pointer-events: none; transition: opacity 150ms ease` |

### views/admin/VerificationSourceView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Ekle/Düzenle modalı — satır 196 | `v-if="showModal"`, Transition yok; backdrop bile fade almıyor, kapanışta exit tamamen unutulmuş | `<Transition name="fade">`; panel enter `opacity 0 + scale(0.96)→1`, `200ms cubic-bezier(0.23,1,0.32,1)`, leave `150ms ease`. Dosyadaki scoped `.fade-*` sınıflarını modal için de kullan, süreyi `0.2s`'e çek. |
| P3 | Mobil ikon butonlar (kalem/çöp) + masaüstü satır butonları (6 yer) — satır 89 | `hover:bg-*` transition'sız, `:active` yok; 32px dokunma hedeflerinde dokunuş belirsiz | `transition: background-color 150ms ease, transform 120ms ease-out; &:active { transform: scale(0.94); }` (küçük ikonda daha belirgin scale kabul). Hover'ı `@media (hover: hover)` arkasına al. |
| P3 | İkon yükleme progress barı — satır 260 | `transition-all duration-300` ile width % anime; `all` yasak + sabit hızlı bar için easing yanlış | `transition-[width] duration-300 ease-linear`; istenirse `transform: scaleX + transform-origin: left` ile GPU'ya taşı |
| P3 | Scoped `.fade-*` transition sınıfları — satır 546 | `.fade-enter-active { transition: opacity 0.3s }` — global fade `0.2s` iken lokal kopya `0.3s`, specificity ile kazanıp fade'i yavaşlatıyor | Scoped `.fade-*` bloklarını sil, global `fade`'e (opacity `0.2s ease`) bırak; gerçekten farklı süre gerekiyorsa ayrı ad (`name="fade-slow"`) |

### views/auth/LoginView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | E-posta/şifre inputları focus ring — satır 36, 48 | `transition-all`; focus'ta yalnız border-color + box-shadow değişirken tüm property'ler transition kapsamında | `transition-[border-color,box-shadow] duration-150`; ya da `transition: border-color 150ms ease, box-shadow 150ms ease` |
| P2 | Giriş yap butonu — satır 64 | `transition-colors` var, `:active` press yok; uygulamaya giriş birincil butonu | `active:scale-[0.98]` + `transition-[background-color,transform] duration-150` (transform ideal `120ms ease-out`) |
| P3 | Hata mesajı kutusu — satır 22 | `v-if="error"` animasyonsuz beliriyor | `<Transition>`: enter `opacity 0 + translateY(-4px)` → `200ms cubic-bezier(0.23,1,0.32,1)`, leave `150ms ease` |

### views/auth/AcceptInviteView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Form inputları ve `.btn-primary` — satır 346, 391 | `input { transition: all $t-base }` + `.btn-primary { transition: all $t-base }` + hover `translateY(-1px)` lift; `all` deler, hover lift dokunmatikte false-positive, `:active` yok | input: `transition: border-color $t-base, box-shadow $t-base`. `.btn-primary`: `transition: background $t-base, box-shadow $t-base, transform 120ms ease-out`; hover'ı `@media (hover: hover) and (pointer: fine)` içine al; `&:active:not(:disabled) { transform: translateY(0) scale(0.98); }` |

### views/billing/SubscriptionGateView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | `.btn` (tüm ödeme/trial CTA'ları, mobil sabit çubuk) — satır 687 | Property listesi doğru (`background/border-color/filter/opacity $t-base`) ama `:active` yok; mobil "Havale/EFT ile öde" basınca tepkisiz | Listeye `transform 120ms ease-out` ekle + `&:active:not(:disabled) { transform: scale(0.98); }`. `filter: brightness` hover'ını `@media (hover: hover)` arkasına al. |
| P3 | Mobil plan satırı genişleyen özellik bölümü (`.plan-m__ext`) — satır 361 | `v-if` ile animasyonsuz açılıyor; seçilen radio altı ani büyüyor, alt satırlar zıplıyor | grid tekniği: `.plan-m__ext-wrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 200ms cubic-bezier(0.23,1,0.32,1); }` `.plan-m--on & { grid-template-rows: 1fr; }` iç eleman `overflow: hidden; min-height: 0`. reduced-motion'da `transition: none`. |

### views/billing/SubscriptionPaymentsView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Filtre değişiminde tablo yeniden yükleme — satır 131 | Her filtre tıklamasında rows yerine `v-if` "Yükleniyor…", tablo DOM'dan tamamen sökülüyor, her tıklamada flash | Yükleme sırasında tabloyu DOM'da tut: `.table-wrap.is-loading { opacity: 0.5; pointer-events: none; transition: opacity 150ms ease; }`. "Yükleniyor" metnini yalnız ilk yükleme (rows boşken). |
| P3 | Onayla/Reddet onay akışı — satır 58 | `window.confirm()` + `window.prompt()` native diyaloglar; kardeş admin görünümleri animasyonlu ConfirmDialog kullanırken burada marka geçişi taşımayan native | `ConfirmDialog.vue` + `askConfirm` Promise kalıbını (CertVerificationView'daki) taşı; ret sebebi için textarea'lı reject-modal kalıbı |
| P3 | `.btn--confirm` / `.btn--reject` — satır 353 | `transition: filter/background $t-base`; para onaylayan kritik butonlarda `:active` yok | Listeye `transform 120ms ease-out`; `&:active:not(:disabled) { transform: scale(0.97); }` |

### views/bulk-import/BulkProductImportView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | İçe aktarma ilerleme çubuğu — satır 1403 | `transition-all duration-500` + `:style width %`; `all` yasak, width layout tetikler, Tailwind default easing sabit ilerleme için yanlış | `transition: transform 500ms linear; transform: scaleX(var(--pct)); transform-origin: left` (GPU dostu). Min müdahale: `[transition-property:width] + ease-linear`. |
| P3 | Şablon indir / dosya seç butonları (`.tpl-btn`, ~10 buton) — satır 1584 | `transition: border-color $t-base, color $t-base`; `:active` yok, mobilde tamamen sessiz | Listeye `transform 120ms ease-out` + `&:active:not(:disabled) { transform: scale(0.97); }` |
| P3 | Wizard adım geçişleri (ADIM 1→1.5→2→2.5→3→4→99) — satır 641 | `v-if/v-else-if` zinciri, adım kartları anında değişiyor | `<Transition name="fade" mode="out-in">` (opacity `0.2s ease`). Alternatif: her karta `animation: stepIn 150ms ease-out`, `@keyframes stepIn { from { opacity: 0; transform: translateY(4px); } }` |

### views/bulk-import/BulkImportHistoryView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | İş geçmişi listesi yükleme — satır 302 | Tek spinner'lı kart tüm içeriği değiştiriyor; skeleton yok, spinner→tablo büyük layout shift | 5–6 sabit yükseklikli skeleton satır: `.skl-row { height: 44px; border-radius: 8px; background: linear-gradient(90deg, $l-bg-muted 25%, $l-bg-soft 50%, $l-bg-muted 75%); background-size: 200% 100%; animation: shimmer 1.2s linear infinite; }` `@keyframes shimmer { to { background-position: -200% 0; } }`; reduced-motion'da düz gri |

### views/bulk-import/BulkImportDetailView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Job detay sayfası yükleme — satır 390 | Spinner'lı kart; içerik gelince info-grid + 5 stat kartı + tablo aniden beliriyor | Gerçek yerleşimi taklit eden skeleton: 4'lü info-grid + 5'li stat grid gri placeholder, shimmer `1.2s linear infinite` (BulkImportHistory `.skl-*` sınıflarını paylaş), reduced-motion'da statik |

### views/bulk-import/SellerFeedView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Sına/Önizleme/Kuru çalıştırma sonuç blokları — satır 344 | `v-if="testResult/preview/dryRun"`; büyük kartlar aniden beliriyor, göz nereye bakacağını kaçırıyor | Her bloğu `<Transition>`: enter `opacity 0 + translateY(4px)` → `180ms cubic-bezier(0.23,1,0.32,1)`. Exit gerekmez. |
| P3 | Yükleme durumları (sayfa + çalıştırma geçmişi) — satır 199, 414 | İki yerde salt spinner; skeleton yok | Form ve tablo bölgesine sabit yükseklikli shimmer bloklar (`linear-gradient 200%` + `1.2s linear infinite`), reduced-motion'da statik gri |

### views/bulk-import/XmlMappingView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Satır içi "yeni özellik oluştur" formu — satır 519 (mobil 419) | `v-if="newAttrTag===tag.path"`; form anında açılıp kapanıyor, satır yüksekliği zıplıyor | `<Transition>`: enter `opacity 0 + translateY(-2px) scale(0.99)` → `150ms cubic-bezier(0.23,1,0.32,1)`. Blok küçük, grid-rows animasyonu gereksiz. |
| P3 | Desktop eşleştirme tablosu satır hover'ı — satır 478 | `hover:bg-gray-50` transition sınıfı yok, arka plan ani; `.tbl-row` kalıbı `$t-fast` kullanırken burada tutarsız | `tbody tr { transition: background-color 0.12s ease; }` (Tailwind: `transition-colors duration-100`) |
| P3 | Mobil yeni özellik butonları (`.xc-new-create/.xc-new-cancel`) — satır 802 | `transition: background $t-fast`; `:active` scale yok, mobilde tek geri bildirim kanalı boş | `transition: background $t-fast, transform 120ms ease-out; &:active:not(:disabled) { transform: scale(0.97); }` |

### views/buyer/BuyerTeamManagementView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Davet modalı (modal-backdrop + modal) — satır 172 | `v-if="showInviteModal"` düz div, Transition yok; backdrop + panel anında belirip kayboluyor, exit unutulmuş | `<Transition name="fade">` veya scoped: backdrop `transition: opacity 200ms ease`; panel `transition: transform 200ms cubic-bezier(0.23,1,0.32,1), opacity 200ms`; enter-from `opacity: 0; transform: scale(0.97)`; leave `150ms`. transform-origin center. |
| P1 | Satır ⋯ menüsü (`.menu-pop`) — satır 121 | `v-if="menuFor===row.key"`; enter/exit yok, transform-origin tanımsız; hazır "dropdown" transition kullanılmamış | `<Transition name="dropdown">` + `.menu-pop { transform-origin: 100% 0; }` (buton sağ üstte). Enter `opacity 0 + translateY(-4px) + scale(0.98)` → `150ms`; leave `100ms ease`. |
| P2 | Birincil butonlar (`.btn-primary` — davet gönder/yükle/mobil çubuk) — satır 1090 | Yalnız hover `background $t-fast`; `:active` yok, mobil sabit davet çubuğu tepkisiz | `.btn-primary { transition: background $t-fast, transform 120ms ease-out; &:active:not(:disabled) { transform: scale(0.97); } }` |
| P3 | Organizasyon arama alanı (`.org-search__field`) — satır 535 | `&:focus-within { border-color: $brand }` transition tanımsız, renk ani; diğer inputlar yumuşak | `.org-search__field { transition: border-color 0.15s ease; }` |
| P3 | Pasife alma / davet iptal / hata akışları — satır 379, 418, 435, 451 | `window.prompt/confirm/alert` native; animasyonsuz, tarayıcı görünümlü, panel diliyle uyumsuz | Modal kalıbı + fade Transition ile onay/sebep girişi; sonuç bildirimleri için `useToast` (`toast.error/success`) |

### views/buyer/procurement/ApprovedSuppliersView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Liste düzenleme modalı (modal-overlay + modal-card) — satır 103 | `v-if="editing"` düz div, Transition yok; `backdrop-filter: blur(2px)` da anında devreye giriyor, sert "pat" | `<Transition name="fade">`; ideal: `.modal-overlay { transition: opacity 200ms ease; }` + `.modal-card { transition: transform 200ms cubic-bezier(0.23,1,0.32,1), opacity 200ms; }` enter-from `opacity: 0; transform: scale(0.97)`; leave `150ms` |
| P2 | Input/buton geçişleri (`.edit-suppliers input`, `.btn-secondary`, `.field input`) — satır 492, 528, 629 | `transition: all $t-base` (3 yer); border/renk isterken layout property'leri de anime | Inputlar: `transition: border-color $t-base, box-shadow $t-base`. `.btn-secondary`: `transition: border-color $t-base, color $t-base, background $t-base` |
| P3 | Butonlar (`.btn-primary`, `.btn-link`) — satır 508 | Hover var (`background $t-base`); `:active` press yok | Listeye `transform 120ms ease-out` + `&:active { transform: scale(0.97); }` |

### views/buyer/procurement/CostCenterTreeView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Masraf merkezi düzenleme modalı (modal-overlay + modal-card) — satır 49 | `v-if="editing"` düz div, Transition yok; `blur(2px)` ani (ApprovedSuppliers ile aynı kalıp) | `<Transition name="fade">`; backdrop `opacity 200ms ease` + panel `transform: scale(0.97)→1 & opacity 200ms cubic-bezier(0.23,1,0.32,1)`, leave `150ms` |
| P2 | Input/select ve buton geçişleri (`.btn-secondary`, `.field input/select`) — satır 372, 472 | `transition: all $t-base` (2 yer) | Inputlar/select: `transition: border-color $t-base, box-shadow $t-base`; `.btn-secondary`: `transition: border-color $t-base, color $t-base` |
| P3 | Butonlar (`.btn-primary`, `.btn-link`) — satır 352 | Hover var; `:active` yok (ApprovedSuppliers ile birebir aynı CSS) | `transition: background $t-base, transform 120ms ease-out; &:active { transform: scale(0.97); }` — iki view ortak `.scss` partial'ına taşınabilir |

> **Not (buyer dilimi):** ApprovedSuppliersView ve CostCenterTreeView modal + input + buton CSS'ini birebir paylaşıyor. Ortak bir `procurement-forms.scss` partial'ı tüm bu tekrarları tek noktadan çözer. Ayrıca CostCenterTreeView `askSpend`'te de native `window.*` kullanımı var (BuyerTeamManagement ile aynı sınıf sorun).

### views/crm/CommissionAdminView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Onayla/Reddet/Ödendi butonları (`.th-btn-primary/.th-btn-outline/.th-btn-dark`) — satır 50 | Sınıflar **hiçbir stylesheet'te tanımlı değil** (grep: yalnız template kullanımı); Tailwind reset'iyle çıplak metin gibi — hover/`:active`/disabled/transition sıfır. CommissionTeamView:50-53 ve CommissionSettingsView:73'te tekrar | Global partial'da (`assets/scss/forms.scss`) aileyi tanımla: `padding: 6px 12px; border-radius: 8px; transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, transform 120ms cubic-bezier(0.23,1,0.32,1); &:active { transform: scale(0.97); } &:disabled { opacity: 0.5; cursor: not-allowed; }`. Alternatif: mevcut `.hdr-btn-primary/.hdr-btn-outlined`'a geçir. |
| P2 | Tablo yükleme durumu — satır 36 | `store.loading` iken tbody tek "Yükleniyor…" hücresine çöküyor; her approve/reject/pay reload'unda satırlar tek satıra iniyor. CommissionTeamView:36-38'de tekrar | thead'i koru, 4–5 skeleton satır: `.skel { height: 12px; border-radius: 6px; background: linear-gradient(90deg, rgba(0,0,0,0.06) 25%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.06) 75%); background-size: 200% 100%; animation: shimmer 1.4s linear infinite; }`. Reload'da: eski satırları tut + tbody `opacity: 0.5; transition: opacity 150ms ease`. |
| P2 | Red sebebi girişi — satır 115 | `window.prompt("Red sebebi:")` — animasyonsuz, stillenemeyen, thread bloklayan native. CommissionTeamView:109'da aynı | Mevcut `QuickCreateDrawer`'ı kullan (DealDetailView:191 kalıbı): `v-model` ile aç, textarea koy. Drawer zaten `translateX` + `$t-spring` geçişi alıyor; ek CSS gerekmez. |
| P3 | Hakediş tablosu satırları — satır 42 | Hover feedback yok; global `.tbl-row` (background `$t-fast` hover) kullanılmamış. CommissionTeamView:42'de aynı | `tbody tr { transition: background-color 120ms ease; &:hover { background: $l-bg-soft; @include dark { background: $d-bg-hover; } } }` — `@media (hover: hover) and (pointer: fine)` içinde |

### views/crm/CommissionSettingsView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Kaydet sonrası "Kaydedildi." mesajı — satır 76 | `savedMsg` `v-if` ile aniden beliriyor, transition yok ve **hiç kaybolmuyor** (timeout yok); sayfa terk edilene kadar kalıyor | `<Transition name="fade">` (opacity `0.2s ease`) + `save()` içinde `setTimeout(() => (savedMsg.value = ""), 2500)`. Daha tutarlısı: `toast.success("Kaydedildi")`. |

### views/crm/ContactDetailView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Kaydet sonrası tam sayfa spinner — satır 252 | `save()` → `loadDoc()` → `loading=true`; `v-if/v-else` (satır 3-7) tüm CrmEntityLayout'u söküp ortalanmış spinner gösteriyor, sonra formu geri getiriyor. Her kayıtta sayfa "çöktü" gibi | `loadDoc(silent=false)`: `if (!silent) loading.value = true`. `save()` içinde `await loadDoc(true)` — form yerinde kalır, yalnız değerler tazelenir. İstenirse forma `opacity: 0.6 + transition: opacity 150ms ease`. |
| P3 | Bağlı anlaşma kartı hover'ı — satır 101 | `hover:border-brand-300 transition-all`; yalnız border-color değişirken `all` tanımlı | `transition-all` → `transition-colors` (150ms ease). Dosyadaki diğer linkler zaten `transition-colors`. |

### views/crm/CallsListView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Liste yükleme durumu — satır 38 | `store.loading` iken tüm tablo `v-if` ile sökülüp `py-12` `animate-spin` kartı; her sayfa/filtre/yenile swap'ı. ContactsListView:38-40'ta (3 mod için) tekrar | İlk yüklemede thead + 6–8 skeleton satır (shimmer `1.4s linear infinite`). Sonraki fetch'lerde `v-if="store.loading && !store.calls.length"`, doluyken tabloya `opacity: 0.6 + transition: opacity 150ms ease`. |
| P3 | Tür filtre chipleri (`.status-pill`) — satır 19 (crm.scss:144) | `transition: all $t-fast`; `:active` yok; günde onlarca kez tıklanan chip | crm.scss:144: `transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms cubic-bezier(0.23,1,0.32,1); &:active { transform: scale(0.96); }` — tüm CRM/helpdesk chip'leri tek noktadan düzelir |

### views/crm/CrmDashboardView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Pipeline + son aktivite kartları yenileme — satır 48 | `load()` iki kartı da (`loadingPipeline/loadingRecent`) `py-8` spinner'a çeviriyor; KPI değerleri geçişsiz zıplıyor, kart yükseklikleri değişiyor | Spinner koşulunu ilk yüklemeye sınırla: `v-if="loadingPipeline && !pipeline.length"`. Yenilemede karta `opacity: 0.6; transition: opacity 150ms ease`. KPI'ya sayaç animasyonu **EKLEME** (B2B — sade). |
| P2 | KPI kartları hover lift (`.crm-kpi`) — satır 26 (crm.scss:16-21) | `transition: all $t-fast; &:hover { transform: translateY(-1px); box-shadow }`; `:active` yok, hover gating yok, dokunmatikte sticky hover | crm.scss:16: `transition: transform 120ms cubic-bezier(0.23,1,0.32,1), box-shadow 120ms ease`; hover'ı `@media (hover: hover) and (pointer: fine)` içine al; `&:active { transform: translateY(0) scale(0.98); }` |
| P3 | Satış hunisi segmentleri (`.crm-pipeline-seg`) — satır 61 (crm.scss:534-547) | `transition: flex $t-spring` (layout property, reflow tetikler) + hover `filter: brightness(1.06)` transition listesinde yok (ani snap) | `transition: flex`'i kaldır (veri değişimi animasyonsuz otursun — B2B doğru) ya da yalnız ilk yükleme. Hover için `transition: filter 120ms ease` ekle veya brightness'ı kaldır (title tooltip zaten var). |

### views/crm/DealDetailView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Kaybedildi diyaloğu (QuickCreateDrawer / `.crm-drawer`) — satır 191 (crm.scss:664-696) | overlay `transition: opacity $t-fast (0.12s)`, panel `transform $t-spring (0.25s cubic-bezier(0.4,0,0.2,1))`; overlay panelden 2x hızlı, Material eğrisi girişte ease-in ağırlıklı, reduced-motion guard yok | crm.scss: `.crm-drawer-overlay { transition: opacity 200ms ease; }` `.crm-drawer { transition: transform 300ms cubic-bezier(0.32,0.72,0,1); }` + `@media (prefers-reduced-motion: reduce) { .crm-drawer { transition: opacity 150ms ease; transform: none; opacity: 0; &.open { opacity: 1; } } }` |
| P3 | Detay sekme (tab) içerik değişimi — satır 92-146 | `v-if/v-else-if` ile ani takas; sekme değişince sert takas. (OrganizationDetail/ContactDetail/LeadDetail'da aynı) | İsteğe bağlı cila: gövdeyi `<Transition name="fade" mode="out-in">` ile sar (opacity `0.2s`), tab konteynerine `min-height`. B2B'de ani takas kabul edilebilir — yalnız akıcılık isteniyorsa uygula. |

### views/crm/DealsListView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Liste yükleme durumu (spinner tam takas) — satır 60 | `v-if="loading"` tüm listeyi kaldırıp `py-12` spinner; 5 liste view'inde tekrar (DealsList:60, LeadsList:61, NotesList:27, OrganizationsList:40, TasksList:61). Her chip/arama/sıralama/sayfalamada büyük layout shift + scroll sıfırlanması | İlk yüklemede skeleton, sonrakinde stale-content: spinner koşulu `v-if="loading && !deals.length"`; açıkken `:class="{ 'is-refreshing': loading }"` + `.is-refreshing { opacity: 0.55; pointer-events: none; transition: opacity 150ms ease; }`. İlk yükleme: 6–8 skeleton satır, shimmer `1.4s linear infinite`, reduced-motion'da statik gri. |
| P1 | Tüm butonlar/tıklanabilirler (`hdr-btn-primary`, `hdr-btn-outlined`, `status-pill`, kart/satır) — satır 12 | `:active`'de scale/press **hiçbir elemanda yok**; 8 dosyanın tümünde ve global sınıflarda tekrar. Baseline'da global press kuralı olmadığı doğrulandı | crm.scss'e ortak: `.hdr-btn-primary, .hdr-btn-outlined, .status-pill { transition: transform 120ms cubic-bezier(0.23,1,0.32,1), background 0.12s ease, border-color 0.12s ease, color 0.12s ease; &:active:not(:disabled) { transform: scale(0.97); } }`. reduced-motion'da `transition-duration: 0.01ms`. |

### views/crm/TasksListView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Görev tamamlama checkbox'ı (`toggleDone`) — satır 453 | `await store.setStatus(...)` bitene kadar UI'da sıfır değişiklik; hata `catch { /* yoksay */ }` ile sessizce yutuluyor. `onKanbanStatusChange`:487 doğru optimistic kalıbı zaten kullanıyor — tutarsız | Optimistic: `const prev = t.status; t.status = newStatus;` sonra `try { await store.setStatus(...) } catch (e) { t.status = prev; toast.error(e.message || t('tasksList.statusUpdateFailed')); }`. Line-through ve yeşil dolgu basıldığı an görünür. |
| P2 | Checkbox görsel durum geçişi (list + table) — satır 142, 202 | `bg-emerald-500 border-emerald-500` anında flip; transition + `:active` yok (en sık tıklanan mikro-eleman) | `transition: background-color 120ms ease, border-color 120ms ease, transform 120ms cubic-bezier(0.23,1,0.32,1); &:active { transform: scale(0.9); }`. Check ikonu `opacity 100ms ease` yeterli — `scale(0)`'dan başlatma. |
| P3 | Status filtre satırının kanban geçişinde kaybolması — satır 31 | `v-if="activeView !== 'kanban'"`; satır DOM'dan anında kalkıyor, toolbar/içerik yukarı zıplıyor | `<Transition name="fade">` (opacity `0.2s`, süre `150ms`'e çekilebilir) |

### views/crm/MyCommissionsView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Hakediş KPI kartları (`.kpi-card` sınıf çakışması) — satır 8 | Scoped `.kpi-card` var ama global cards.scss:27 `.kpi-card` da uygulanıyor: `animation: fadeUp 0.35s ease both` + nth-child stagger + `transition: all $t-slow` + hover lift. Statik kartlar tıklanamaz hover lift ve giriş stagger'ı miras alıyor (yanlış affordance); fadeUp reduced-motion'dan muaf | Sınıfı `.mc-kpi` olarak yeniden adlandır; ya da scoped nötralize: `.kpi-card { animation: none; transition: none; &:hover { transform: none; box-shadow: none; } }` |
| P3 | Tablo yükleme durumu — satır 40 | `<td colspan="7">Yükleniyor…</td>` düz metin; diğer CRM sayfaları spinner kullanırken tutarsız, layout shift | 3–4 skeleton satır (her td'de `height: 12px; border-radius: 6px` shimmer `1.4s linear infinite`). En azından ortak `animate-spin` kalıbına geç. |

### views/crm/LeadDetailView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Detay sayfası ilk yükleme (tam sayfa spinner) — satır 3 | `v-if="loading"` tüm CrmEntityLayout yerine `py-12` spinner; OrganizationDetailView:3'te de aynı. Üç kolonlu layout pop-in, büyük layout shift | CrmEntityLayout iskeleti: sol/orta/sağ kolonlarda sabit yükseklikli skeleton bloklar (`border-radius: 8px` + shimmer `1.4s linear infinite`). Min: spinner kartına `min-height: 60vh` + `opacity 150ms ease` geçiş. |

### views/crm/LeadsListView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Arama input'u focus geçişi — satır 49 | Tailwind `transition-all` (`all 150ms cubic-bezier(0.4,0,0.2,1)`); CrmListToolbar.vue:14'te de aynı (Deals/Notes/Organizations/Tasks bu toolbar'ı kullanır) | `transition-[border-color,box-shadow,background-color] duration-150`; ya da `transition: border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease` |

### views/crm/NotesListView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Not kartı hover geçişi (grid) — satır 43 | `hover:border-brand-300 transition-all`; OrganizationDetailView:116 ve 144'teki router-link'lerde de aynı. Diğer liste kartları `transition-colors` kullanıyor — tutarsız | `transition-all` → `transition-colors` (150ms ease). OrganizationDetailView'daki iki link'te de aynı. |

### views/crm/settings/GeneralSettings.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Kaydet butonu (`.hdr-btn-primary`) — dilimdeki tüm primary/outlined butonlar — satır 52 | Global `.hdr-btn-primary: transition: all $t-base`, `:active` yok. Aynı sınıf GeneralSettings, IntegrationsSettings (3 kaydet), NotesTab, TasksTab, TaxonomySettings, AssignmentRulesSettings, EmailAccountsSettings, SlaSettings, QuickCreateDrawer'da 12+ butonda; hiçbirinde press yok | Global header.scss (tek nokta): `.hdr-btn-primary, .hdr-btn-outlined { transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.12s cubic-bezier(0.23,1,0.32,1); &:active:not(:disabled) { transform: scale(0.97); } }` |

### views/crm/tabs/TasksTab.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Görev tamamlama checkbox butonu (`toggleDone`) — satır 41 | `bg-emerald-500 border-emerald-500 ↔ border-gray-300` transition'sız atlıyor; `:active` yok; check ikonu `v-if` ile aniden. Tab'ın en sık basılan kontrolü | `.task-check { transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.1s cubic-bezier(0.23,1,0.32,1); &:active { transform: scale(0.9); } }`. Check ikonu enter: `opacity 0 + scale(0.5)` → `0.15s cubic-bezier(0.23,1,0.32,1)` (asla `scale(0)`). |

### views/crm/settings/EmailAccountsSettings.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Hesap satırı kartı (router-link) — satır 30 | `transition-all` + `hover:border-brand-300`; SlaSettings:30 ve TasksTab:39'da da (3 dosya). `all` yasak; hover gating yok, dokunmatikte border yapışıp kalıyor | `transition-all`'ı kaldır: `@media (hover: hover) and (pointer: fine) { .account-row { transition: border-color 0.15s ease; &:hover { ... } } }` ya da `transition-colors duration-150`; SlaSettings ve TasksTab'da aynı |

### views/crm/settings/AssignmentRulesSettings.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | İkon aksiyon butonları (kopyala/düzenle) — satır 48 | `text-gray-400 hover:text-brand-700`, transition yok, renk anlık; `:active` yok. TaxonomySettings'te 6 yer (45-57, 97-110, 137-150), NotesTab:49, TasksTab:87, CallsTab:44'te tekrar | crm.scss'e paylaşılan sınıf: `.crm-icon-btn { transition: color 0.12s ease, transform 0.1s cubic-bezier(0.23,1,0.32,1); &:active { transform: scale(0.92); } }`; hover'ı `@media (hover: hover) and (pointer: fine)` arkasına al |
| P3 | Yükleme durumu (loader spinner) — dilim geneli — satır 15 | `animate-spin` + `v-else` anlık takas; EmailAccounts/General/Sla/Taxonomy/CallsTab/NotesTab/TasksTab'da (8 dosya). Spinner (~68px) ile liste yüksekliği farkı → layout shift | Min cila: `.list-fade { animation: fadein 0.15s ease-out; } @keyframes fadein { from { opacity: 0; } }`. İdeal: satır yüksekliğinde 2–3 skeleton satır (`$l-bg-muted`, `opacity 0.6↔1 pulse 1.2s ease-in-out infinite`). |

### views/crm/settings/IntegrationsSettings.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | `loadAll` — form alanlarının doldurulması — satır 167 | loading state hiç yok; inputlar boş render edilip fetch çözülünce değerler (SID, key, enabled pill) aniden içeri doluyor, kullanıcı boş forma yazabilir | Kardeş kalıbı uygula: `loading` ref + `v-if` spinner (veya 3 kart iskeleti); içerik hazır olunca `opacity 0→1, 0.15s ease-out` |

### views/crm/tabs/NotesTab.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Not listesi — silme/ekleme sonrası satır hareketi — satır 37 | Düz `v-for`; `removeNote` filter ile elemanı anında çıkarıyor, kalanlar animasyonsuz zıplıyor. TasksTab:35'te aynı | `<TransitionGroup name="row" tag="div">` + `.row-move { transition: transform 0.15s ease; }` `.row-leave-active { transition: opacity 0.12s ease; position: absolute; }` `.row-leave-to { opacity: 0; }` — **enter animasyonu tanımlama** (filtre/yükleme sonrası yeniden oynamasın) |

### views/crm/settings/TaxonomySettings.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Liste sürükleme tutamacı (`.crm-taxo-handle`) — satır 30 (crm.scss:574) | `cursor: grab` + grip ikonu var ama dosyada drag mantığı yok — tutamaç işlevsiz; hover rengi transition'sız. Yanlış affordance, "bozuk" hissi | Ya `vuedraggable` bağlayıp sürüklemede `.crm-taxo-row`'a `box-shadow + cursor: grabbing` (kanban-card kalıbı), ya da tutamacı ve `cursor: grab`'i tamamen kaldır |

### views/dashboard/DynamicDashboard.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | İlk yükleme durumu (Platform/Seller Overview kullanır) — satır 62 | `fa-spinner fa-spin` 200px'lik blok; widget'lar gelince `v-else-if` zinciriyle grid geçişsiz. 200px → uzun grid'e sıçrama, günde en sık görülen ekran | Gerçek grid boyutunda skeleton kartlar (4 KPI + 2–4 widget placeholder, `th-widget` radius/padding). Shimmer transform ile: `.sk-shimmer::after { animation: sk 1.2s linear infinite; background: linear-gradient(90deg, transparent, rgba(0,0,0,0.05), transparent); transform: translateX(-100%); } @keyframes sk { to { transform: translateX(100%); } }`. İçerik gelince grid'e tek seferlik `opacity 0→1, 200ms cubic-bezier(0.23,1,0.32,1)`. |
| P2 | Dönem seçici (7g/30g/90g/365g) + retry butonu — satır 26 | `transition-colors` var, `:active` yok; inaktif hover `hover:bg-white/5` (light temada görünmez); `th-retry-btn` (dashboard.scss:471) yalnız background | `.period-btn { transition: background-color 150ms ease, color 150ms ease, transform 120ms ease-out; } .period-btn:active { transform: scale(0.97); }`. Hover'ı theme-aware yap (`var(--th-surface-elevated)`). `th-retry-btn`'e de `:active { transform: scale(0.97) }`. |
| P3 | Dönem/satıcı değişiminde widget grid yenilenmesi — satır 78 | `watch(period, loadLayout)` `loading=true` ama spinner yalnız `loading && !widgets.length`; eski widget'lar kalıp yeni veri geçişsiz sessizce değişiyor, tıklama işlendiği belirsiz | `<DashboardGrid :class="{ 'grid-refreshing': loading && widgets.length }">` + `.grid-refreshing { opacity: 0.6; pointer-events: none; } .th-dashboard-grid { transition: opacity 150ms ease; }` |
| P3 | Impersonation banner'ı — satır 41 | `v-if` animasyonsuz girip çıkıyor; kaybolunca alt grid yukarı zıplıyor | `<Transition name="banner">`: enter `opacity 0 + translateY(-4px)` → `200ms cubic-bezier(0.23,1,0.32,1)`, leave `150ms ease`; height animasyonundan kaçın |

### views/dashboard/ComplianceDashboard.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Risk scatter chart verisi (computed içinde `Math.random`) — satır 165 | `riskScatterOption` computed'i her yeniden hesaplamada rastgele veri üretiyor; LogisticsDashboard:124 (heatmap) ve OrdersDashboard:229 (trend) de aynı. Tema/dil değişimi computed'i tetikleyip veriyi komple değiştiriyor → chart `notMerge:true` ile tam giriş animasyonuyla yeniden çiziliyor ("her renderda oynayan kart") | Rastgele veriyi bir kez üret: modül seviyesinde `const riskData = { low: genData(40,5,12), medium: genData(15,8,15), high: genData(5,10,20) }`; computed yalnız renk/etiketleri temaya göre üretsin. Logistics ve Orders'da da veri üretimini computed dışına çıkar. |

### views/doctype/OrderMobile.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Bölüm bottom sheet + backdrop (`om-sheet`/`om-backdrop`) — satır 108 | `v-if="sheet"` + keyframes `om-fade 0.18s` (backdrop), `om-slide-up 0.26s cubic-bezier(0.16,1,0.3,1)` (sheet). **Kapanışta hiç animasyon yok** — sheet ve backdrop anında yok oluyor. Keyframes retarget edemez | `v-if`'i `<Transition name="om-sheet">` ile sar, keyframes'i sil. Enter: `.om-sheet { transition: transform 260ms cubic-bezier(0.32,0.72,0,1); }` from `translateY(100%)`. Leave: `translateY(100%) 200ms ease-out`. Backdrop ayrı `<Transition name="fade">` opacity `180ms/150ms`. reduced-motion'da `transition-duration: 0.01ms`. |
| P2 | Sheet ve `.om-sheet` yetersiz slayt — satır 937 | Keyframe from `translateY(24px)+opacity:0` — yalnız 24px yükselir ("belirip zıplama"), çıkış animasyonsuz | Keyframe'i gerçek drawer yap: from `translateY(100%)`; kapanış için `<Transition name="om-sheet">` + leave-to `translateY(100%)` `0.22s`; backdrop'u da Transition/fade ile çıkar; süre `0.30s`'e çıkarılabilir |
| P2 | Hızlı işlem butonları (`.om-qa-btn/.om-sh-x/.om-btn-ghost/.om-btn-solid`) — satır 560 | 4 sınıfta da transition ve `:active/:hover` yok; yalnız `cursor: pointer`. "Kaydet" dahil hiçbir buton tepki vermiyor | Ortak: `transition: transform 130ms ease-out, opacity 130ms ease; &:active:not(:disabled) { transform: scale(0.97); }`. `.om-btn-solid`'e `&:active { background: color.adjust($brand, $lightness: -6%); }` (`background 150ms ease` ekle). |
| P3 | Sheet form input/select/textarea focus — satır 1090 | `&:focus { border-color: $brand; box-shadow: 0 0 0 3px rgba($brand,0.15); }` geçişsiz, halka aniden. UserProfileMobile:1026'da aynı | `transition: border-color 150ms ease, box-shadow 150ms ease` (her iki dosyada) |

### views/doctype/UserProfileMobile.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Bölüm bottom sheet + backdrop (`upm-sheet`/`upm-backdrop`) — satır 80 | OrderMobile ile birebir: `v-if` + `upm-fade 0.18s`/`upm-slide-up 0.26s` keyframes, çıkış animasyonu yok; hızlı aç/kapa'da baştan oynuyor | OrderMobile ile aynı: `<Transition>` + transition tabanlı. Enter `translateY(100%)→0, 260ms cubic-bezier(0.32,0.72,0,1)`; leave `translateY(100%) 200ms ease-out`. Backdrop opacity `180ms/150ms`. İki dosya için ortak `.m-sheet` Transition sınıfı animations.scss'e alınabilir. |
| P2 | `.upm-sheet` yetersiz slayt — satır 873 | Keyframe from `translateY(24px)+opacity:0`, çıkış yok; drawer hissi zayıf | Keyframe from `translateY(100%)`; `<Transition name="upm-sheet">` + leave-to `translateY(100%) ~0.22s`; backdrop'u da Transition/fade ile |
| P2 | Buton sınıfları (`.upm-qa-btn/.upm-sh-x/.upm-btn-ghost/.upm-btn-solid/.upm-mini-btn`) — satır 624 | 5 sınıfta da transition ve `:active` yok (IBAN göster/gizle mini toggle dahil) | `transition: transform 130ms ease-out, background 150ms ease; &:active:not(:disabled) { transform: scale(0.97); }`. `.upm-btn-solid` background ~%6 koyulaş. |

### views/doctype/DocTypeFormView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Reject modalı + Preview modalı — satır 1160, 1281 | İkisi de çıplak `v-if`; backdrop dahil enter/exit yok, anında beliriyor/kayboluyor. Global "fade" kalıbı atlanmış | Her ikisini `<Transition name="fade">` (opacity `0.2s ease`). Cila: iç panel enter-from `opacity: 0; transform: scale(0.97)` → `transition: transform 200ms cubic-bezier(0.23,1,0.32,1), opacity 200ms ease-out`; leave `150ms`. transform-origin center. Asla `scale(0)`. |
| P2 | Link alanı autocomplete dropdown — satır 365 | `v-if="linkDropdowns[field.fieldname]?.show"`; animasyonsuz. Merkezi "dropdown" transition kullanılmamış, AppSelect/AppHeader ile tutarsız | `<Transition name="dropdown">` (enter `150ms`, leave `100ms`, opacity + `translateY(-4px)`); panele `transform-origin: top center` |
| P2 | Desktop tab navigasyon butonları — satır 148 | `border-b-2 transition-all`; fiilen sadece renk + border rengi değişiyor, `all` gereksiz | `transition-all` → `transition-colors` (150ms ease); border-bottom-color da kapsamda |
| P2 | Liste yükleme durumu — DocTypeListView:115 (aynı görünüm ailesi) | — | Aşağıdaki DocTypeListView satırına bakınız |
| P3 | Mobil accordion bölüm gövdesi (V4) — satır 213 | `v-show` ile anında aç/kapa; chevron `$t-base` dönüyor ama gövde tek frame'de beliriyor — tutarsız | Grid wrapper: `.dtf-sec-collapse { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 220ms cubic-bezier(0.23,1,0.32,1); } &.open { grid-template-rows: 1fr; }` iç div `overflow: hidden`. Ya da `v-if` + `@starting-style` opacity `0→1 + translateY(-4px), 180ms`. reduced-motion'da transition kaldır. |
| P3 | Mobil sabit kaydet çubuğu + kirli-durum ipucu — satır 3274 | Çubuk `v-if` ile anında; `.dtf-mobile-save-bar__hint .dirty` renk+font-weight geçişsiz değişiyor (her tuş vuruşunda ani koyulaşma) | `.dtf-mobile-save-bar__hint { transition: color 150ms ease; }` (font-weight animasyonlanamaz — kalın/normal farkını kaldır, yalnız renkle ayır). Çubuk girişi: `@starting-style { opacity: 0; transform: translateY(8px); } + transition: transform 200ms cubic-bezier(0.23,1,0.32,1), opacity 200ms ease-out`. |
| P3 | Görsel galerisi silme butonu — satır 706 | `opacity-0 group-hover:opacity-100 transition-opacity`; hover'a bağlı görünürlük dokunmatikte güvenilmez, buton erişilmez olabilir | `.gal-del { opacity: 1; transition: opacity 150ms ease; } @media (hover: hover) and (pointer: fine) { .group .gal-del { opacity: 0; } .group:hover .gal-del, .gal-del:focus-visible { opacity: 1; } }` |

### views/doctype/CartMobile.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Adet ± butonları (`.cm-qty-btn`) + satır silme (`.cm-item-del`) — satır 389 | `transition: background $t-fast` var ama iki sınıfta da `:hover/:active` yok — transition'ın geçireceği bir şey yok; `:disabled opacity: 0.35` de geçişsiz. Günde onlarca basılan kontrol | `transition: transform 120ms ease-out, background 120ms ease, opacity 120ms ease; &:active:not(:disabled) { transform: scale(0.92); background: $l-border; }` (dark'ta `$d-bg-hover`). `:hover` eklenmesin ya da `@media (hover: hover)` arkasına. |
| P3 | Sepet kalemi kartları — silmede liste davranışı — satır 27 | Düz `v-for`; `remove-item` ile satır silinince kalanlar animasyonsuz yukarı zıplıyor | `<TransitionGroup name="cm-item" tag="div">`: `.cm-item-leave-active { position: absolute; transition: opacity 150ms ease-out, transform 150ms ease-out; }` `.cm-item-leave-to { opacity: 0; transform: scale(0.98); }` `.cm-item-move { transition: transform 200ms cubic-bezier(0.23,1,0.32,1); }`. **Giriş animasyonu ekleme.** |

### views/doctype/DocTypeListView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Arama input'u (filtre çubuğu) — satır 78 | `transition-all`; focus'ta ring + border-color'ı `all` ile geçiriyor | `transition-colors` ya da `transition: border-color $t-base, box-shadow $t-base` |
| P2 | Liste yükleme durumu — satır 115 | `v-if="loading"` tüm içeriği `py-12` spinner ile değiştiriyor; her filtre/durum/sıralama/sayfada tablo→kart→tablo iki kez layout shift | İlk yüklemede 8 satır tablo iskeleti (shimmer `linear-gradient(90deg, $l-bg-muted 25%, $l-bg 50%, $l-bg-muted 75%); background-size: 200% 100%; animation: shimmer 1.4s linear infinite`), reduced-motion'da `animation: none`. Sonraki değişimlerde listeyi DOM'da tut + `opacity: 0.5; pointer-events: none; transition: opacity 150ms ease`. |
| P3 | Satır sonu ⋯ butonları (tablo 254, kompakt 331) | `hover:text-gray-600` transition sınıfı yok, renk anında (2 yer) | Her ikisine `transition-colors` (150ms ease) |

### views/eca/EcaRuleFormView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Sihirbazdaki tüm tıklanabilirler (`btn-primary/btn-outline/back-btn/.seg/.tpl/.act/.add-cond/.cond-remove`) — satır 2473 (ayrıca 1397,1501,1623,1671,1693,1785,2443) | Yalnız hover geçişi; `:active` **hiçbirinde yok** (8+ sınıf). Projenin en etkileşim-yoğun formu basma anında hiç tepki vermiyor | Ortak kural: `.btn-primary, .btn-outline, .back-btn, .seg, .tpl, .act, .add-cond, .cond-remove { transition: transform 140ms cubic-bezier(0.23,1,0.32,1), background 150ms ease; &:active { transform: scale(0.97); } }` — küçük ikon (`.cond-remove`) `scale(0.94)` |
| P2 | `.seg` (Tümü/Herhangi biri toggle) — satır 1632 | `transition: all $t-base`; padding/border-radius de anime, retarget'ta beklenmeyen geçiş | `transition: background 150ms ease, color 150ms ease, border-color 150ms ease` (istenirse `transform 140ms cubic-bezier(0.23,1,0.32,1)`) |
| P2 | Dry-run / SKU test / çakışma uyarısı sonuç blokları — satır 523, 576, 634 | `v-if` animasyonsuz; sonuç tablosu açılınca sayfa aniden uzuyor, göz kaçırıyor | Ortak `<Transition name="result">`: `.result-enter-from { opacity: 0; transform: translateY(4px); } .result-enter-active { transition: opacity 200ms cubic-bezier(0.23,1,0.32,1), transform 200ms cubic-bezier(0.23,1,0.32,1); }` — çıkış `120ms`, yalnız opacity |
| P3 | Düzenleme modu yükleme (`loadingDoc`) — satır 18 | Düz metin "Yükleniyor…" (`.eca-loading`), sonra tüm sihirbaz kartı pat diye render | `wiz-card` iskeleti (başlık çubuğu + 2 stepbox dikdörtgeni), shimmer transform tabanlı: `.sk::after { transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); animation: sk-shimmer 1.2s linear infinite; } @keyframes sk-shimmer { to { transform: translateX(100%); } }`; reduced-motion'da `animation: none` |
| P3 | Gelişmiş bölümler / versiyon geçmişi (`<details class="adv">`) — satır 210, 609, 652 | Native `<details>`; içerik animasyonsuz aniden açılıyor | İçeriği div'e sar + `@starting-style`: `.adv[open] .adv-body { opacity: 1; transform: translateY(0); transition: opacity 180ms cubic-bezier(0.23,1,0.32,1), transform 180ms cubic-bezier(0.23,1,0.32,1); @starting-style { opacity: 0; transform: translateY(-3px); } }` — height/max-height animasyonundan kaçın |
| P3 | Canlı eşleşme sayacı (`.preview`) başarı↔hata geçişi — satır 1717 | `background/border-color` `.is-error` ile geçişsiz; "Sayılıyor…" her debounce'ta ani takas | `.preview { transition: background-color 200ms ease, border-color 200ms ease; }` — süre `200ms`'i geçmesin, hareket ekleme |

### views/eca/EcaRulesView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Butonlar (`.btn-primary`, `.btn-link` 502, mobil `.ec-btn` 665) — satır 341 | `.btn-primary/.btn-link` yalnız hover; `.ec-btn`'de `:active` background var ama scale yok | `.btn-primary, .btn-link, .ec-btn { transition: transform 140ms cubic-bezier(0.23,1,0.32,1), background 150ms ease; &:active { transform: scale(0.97); } }` (`.ec-btn` mevcut `:active` background korunur) |
| P2 | Kural listesi yükleme — satır 51 | Düz metin "Yükleniyor…" (`.eca-loading`); tablo/kartlar animasyonsuz pop-in, büyük layout shift | Tablo satırı yüksekliğinde 5–6 skeleton (mobilde `.eca-card` boyutunda 3–4 blok). Shimmer transform tabanlı (`1.2s linear infinite`); içerik gelince `150ms opacity` fade. reduced-motion'da statik gri. |

### views/eca/EcaRuleLogView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Log listesi yükleme — satır 40 | Düz metin "Yükleniyor…" (`.log-loading`); "Yenile"ye her basışta tüm liste kaybolup metne dönüyor | İlk yüklemede tablo-satırı skeleton'ları (transform shimmer `1.2s linear`); yenilemede içeriği sökmek yerine `opacity: 0.5; pointer-events: none; transition: opacity 150ms ease` |
| P3 | Log detay genişletme (masaüstü `.detail-row`, mobil `.erl-detail` 76) — satır 135 | `v-if` animasyonsuz; snapshot `pre` blokları async yüklendiği için boş→dolu ikinci zıplama | Detayı `<Transition>`: enter opacity `0→1, 150ms cubic-bezier(0.23,1,0.32,1)`, çıkış `100ms ease`. `pre` bloklarına `min-height: 60px`. height/max-height anime etme. |
| P3 | Filtre select'leri (`.log-select`) — satır 351 | transition tanımı yok; `:focus border-color` ani (EcaRulesView `.eca-select`'te transition var) — kardeş ekranla tutarsız | `.log-select { transition: border-color 150ms ease; }` (`.eca-select` ile birebir aynı değer) |

### views/eca/MyEcaRulesView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Butonlar (`.btn-primary`, `.rule-body`, `.rule-delete`) — satır 237 | Yalnız hover; `:active` üçünde de yok. `.rule-body` koca tıklanabilir alan olduğu halde basma hissi sıfır | `.btn-primary, .rule-delete { transition: transform 140ms cubic-bezier(0.23,1,0.32,1), background 150ms ease, color 150ms ease; &:active { transform: scale(0.96); } }`; kart için `&:has(.rule-body:active) { transform: scale(0.99); }` veya `.rule-body:active { opacity: 0.7; transition: opacity 120ms ease; }` |
| P2 | Kural listesi yükleme — satır 19 | Düz metin "Yükleniyor…" (`.my-eca-loading`), kartlar pop-in; satıcının açılış ekranı | 3–4 `.rule-card` boyutunda skeleton (36px ikon dairesi + 2 metin çubuğu), shimmer transform (`translateX(-100%)→100%, 1.2s linear infinite`); reduced-motion'da statik |
| P3 | Kural kartı listesi (`ul.rule-cards`) — silme sonrası yeniden akış — satır 32 | Düz `v-for`; kart silinince kalanlar animasyonsuz zıplıyor | `<TransitionGroup name="rules" tag="ul">`: `.rules-move { transition: transform 200ms cubic-bezier(0.23,1,0.32,1); }` `.rules-leave-active { position: absolute; transition: opacity 120ms ease; }` `.rules-leave-to { opacity: 0; }` — **enter animasyonu ekleme** |
| P3 | Hover stilleri (`.rule-card:hover`, `.rule-delete:hover`) — dilim geneli — satır 343 | `@media (hover: hover)` koruması yok (EcaRulesView, EcaRuleFormView, EcaRuleLogView, ConditionBuilder'da da); dokunmatikte sticky hover | `@media (hover: hover) and (pointer: fine) { .rule-card:hover { border-color: $brand; } .rule-delete:hover { ... } }` — `:active` kuralları media dışında kalmalı |

### views/eca/ConditionBuilder.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Koşul yapıcı butonları (`.cb-remove`, `.cb-add`) + ConditionRow.vue `.cb-remove` (139) — satır 367 | `transition: background $t-base` yalnız hover; `:active` yok (3 sınıf) | `.cb-remove, .cb-add { transition: background 150ms ease, transform 120ms cubic-bezier(0.23,1,0.32,1); &:active { transform: scale(0.94); } }` — ConditionRow.vue `.cb-remove`'a da |

### views/feed/AdminFeedsView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Feed tablosu yükleme — satır 135 | Ortalanmış `animate-spin` tek kartta; sonra tablo pop-in, spinner-kartı→tam-tablo büyük layout shift | thead + 5 satırlık skeleton tablo (hücrelerde `.sk` çubukları `h-3, rounded`, shimmer transform `1.2s linear infinite`). İçerik gelince `150ms opacity` fade. reduced-motion'da shimmer kapalı. |

### views/helpdesk/AgentsView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Oluşturma/düzenleme modalları (`hd-modal-backdrop` + `hd-modal`) — satır 178 | Çıplak `v-if`, Transition yok; **5 dosyada 7 modalda tekrar**: AgentsView:178, CannedResponsesView:183, TeamsView:157/189, TicketTypesView:127, TicketsListView:80. helpdesk.scss `.hd-modal-backdrop/.hd-modal`'da animation/transition tanımsız; blur'lu backdrop + panel aynı frame'de ani, exit unutulmuş | Yedi modali ortak `<Transition name="hd-modal">` (v-if korunur), helpdesk.scss'e: `.hd-modal-enter-active { transition: opacity 0.2s ease; .hd-modal { transition: transform 0.2s cubic-bezier(0.23,1,0.32,1), opacity 0.2s ease; } } .hd-modal-leave-active { transition: opacity 0.15s ease; .hd-modal { transition: transform 0.15s ease, opacity 0.15s ease; } } .hd-modal-enter-from, .hd-modal-leave-to { opacity: 0; .hd-modal { opacity: 0; transform: scale(0.96); } }` — `scale(0.96)`'dan başla, transform-origin center, çıkış girişten hızlı |

### views/helpdesk/TicketsListView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Yükleme durumu — tüm liste view'larında — satır 297 | `v-if="hd.loadingTickets"` tüm içeriği söküp 56px padding'li `hd-empty` + `animate-spin`; **6 dosyada tekrar** (AgentsView:28, CannedResponsesView:35, SellerInquiriesListView:37, TeamsView:19, TicketTypesView:19). Tab/filtre/scope + her toggle/save reload'u aynı yoldan; KPI altındaki liste yok olup spinner'a dönüşüyor | İki katman: (1) İlk yüklemede 5–6 iskelet satır: `.hd-skel { height: 64px; border-radius: $hd-radius; background: linear-gradient(90deg, $l-bg-soft 25%, $l-bg-muted 37%, $l-bg-soft 63%); background-size: 400% 100%; animation: hdShimmer 1.4s linear infinite; } @keyframes hdShimmer { from { background-position: 100% 0; } to { background-position: 0 0; } }` (reduced-motion `animation: none`). (2) Refetch'lerde içeriği sökme; `opacity: 0.55; pointer-events: none; transition: opacity 0.15s ease`. |
| P2 | Ticket detayına geçiş (`goToTicket`) — satır 758 | `location.assign('/panel/helpdesk/tickets/...')` — SPA içinde **full page reload**; her ticket tıklamasında (ana eylem) tüm SPA baştan boot: beyaz ekran, layout fadeUp, store'lar yeniden yükleniyor. SellerInquiriesListView `router.push` ile doğru yapıyor | `router.push('/helpdesk/tickets/${encodeURIComponent(tk.name)}')` (`useRouter` import). Route mevcut; geçiş anlık, yeniden-boot animasyonu oynamaz. **Dilimin en pahalı algılanan-hız sorunu.** |
| P2 | Bulk aksiyon çubuğu girişi (`<Transition name="hd-bulk">`) — satır 252 (helpdesk.scss:1558) | `.hd-bulk-enter-active/leave-active { transition: all 0.2s }` — easing belirtilmemiş (default ease), `all`; bar normal flow'da olduğu için belirince alttaki liste aniden aşağı zıplıyor | `.hd-bulk-enter-active { transition: transform 0.2s cubic-bezier(0.23,1,0.32,1), opacity 0.2s ease; } .hd-bulk-leave-active { transition: transform 0.15s ease, opacity 0.15s ease; }` (enter-from/leave-to `opacity:0 + translateY(-8px)` kalsın). İtilme için barı `display: grid` sarmalayıcıya al, `grid-template-rows: 0fr→1fr`'i `0.2s` aynı eğriyle anime et. |

### views/helpdesk/TicketDetailView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Dropdown'lar: agent atama (49), hazır yanıt (301), TicketsListView kayıtlı filtreler (20) — satır 49 | `v-if` + global `.hd-dropdown { animation: hdSlideDown 0.16s ease both }` (helpdesk.scss:1028) — giriş keyframe'li, **çıkış animasyonsuz** (280–320px panel aniden yok). Keyframe kesintiye uğrayamaz; doğru kalıp (animations.scss "dropdown") kullanılmamış | `.hd-dropdown`'dan `animation: hdSlideDown` satırını kaldır; üç dropdown'ı `<Transition name="dropdown">` (enter `0.15s` opacity + `translateY(-4px)`, leave `0.1s`). `hdSlideDown` başka kullanıcısı kalmazsa sil. |
| P3 | Dosya upload progress çubuğu — satır 275 | `h-full bg-brand-500 transition-all duration-300 ease-out`; simüle progress için `ease-out` her tick'te yavaşlayıp hızlanma, `all` gereksiz | `transition: width 200ms linear` (veya `transition-[width] duration-200 ease-linear`). Başka property anime edilmesin. |
| P3 | Bekleyen dosya satırları (`pendingFiles`) ekleme/kaldırma — satır 214 | Düz `v-for`; satır eklenince/× ile kaldırılınca animasyonsuz, alttakiler zıplar | `<TransitionGroup tag="div" name="hd-file" class="mt-2 space-y-1.5">`: `.hd-file-enter-from { opacity: 0; transform: translateY(-4px); } .hd-file-enter-active { transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.23,1,0.32,1); } .hd-file-leave-active { transition: opacity 0.12s ease; position: absolute; } .hd-file-leave-to { opacity: 0; } .hd-file-move { transition: transform 0.18s ease; }` |

---

### Önerilen Standart (views admin–helpdesk için tek tip reçete)

Bu dilimdeki 119 bulgunun ezici çoğunluğu altı örüntüye indirgeniyor. Her biri için **tek** kanonik reçete — mümkün olduğunda global bir noktaya (animations.scss / helpdesk.scss / crm.scss / header.scss) taşınmalı ki dosya dosya tekrar etmesin.

**1. Modal (backdrop + panel) — `popup-modal`**
```scss
// Vue: <Transition name="fade"> ile sar, v-if korunur
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
// İç panel:
.modal-panel { transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms ease; }
.fade-enter-from .modal-panel { opacity: 0; transform: scale(0.96); }
// Çıkış girişten hızlı (~150ms). transform-origin: center (modal istisnası). ASLA scale(0).
```
Etkilenen: CertVerification, SellerVerificationQueue, VerificationSource, BuyerTeamManagement, ApprovedSuppliers, CostCenterTree, DocTypeFormView (2), helpdesk 7 modal.

**2. Dropdown / popover — `dropdown`**
```scss
// Vue: <Transition name="dropdown"> — enter 150ms / leave 100ms, opacity + translateY(-4px)
// Panele transform-origin: tetikleyici köşesi (input altı → top center; sağ üst → 100% 0)
```
Etkilenen: BuyerTeamManagement `.menu-pop`, DocTypeFormView link autocomplete, helpdesk `.hd-dropdown` (keyframe'i sil, transition'a geç).

**3. Buton press feedback — `button-feedback`** (dilimin en yaygın eksiği)
```scss
.btn, .hdr-btn-primary, .hdr-btn-outlined, .status-pill /* vb. */ {
  transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease,
              transform 120ms cubic-bezier(0.23, 1, 0.32, 1);
  &:active:not(:disabled) { transform: scale(0.97); } // küçük ikon butonlarda 0.92–0.94
}
@media (prefers-reduced-motion: reduce) { transition-duration: 0.01ms; }
```
Kritik: CommissionAdmin/Team `.th-btn-*` sınıfları **hiç tanımlı değil** — önce sınıfları oluştur.

**4. Skeleton yükleme — `skeleton-loading`**
```scss
.skel { background: linear-gradient(90deg, $l-bg-muted 25%, $l-bg-soft 50%, $l-bg-muted 75%);
        background-size: 200% 100%; animation: shimmer 1.4s linear infinite; }
@keyframes shimmer { to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .skel { animation: none; opacity: 0.6; } }
```
Kural: **İlk yükleme** = gerçek yapıyı taklit eden skeleton. **Refetch/filtre/sekme** = mevcut içeriği DOM'da tut + `opacity: 0.5–0.6; pointer-events: none; transition: opacity 150ms ease`. Spinner ve "Yükleniyor…" düz metni kaldır. Detay/tam-sayfa spinner'ları (`ContactDetail save`, `LeadDetail`) `silent` reload ile yerinde bırak.

**5. Bottom sheet (mobil) — `mobile`**
```scss
// Keyframes DEĞİL Vue <Transition> (retarget için). from: translateY(100%) — 24px nudge değil
.m-sheet { transition: transform 260ms cubic-bezier(0.32, 0.72, 0, 1); }
// leave: translateY(100%) 200ms ease-out. Backdrop ayrı fade (opacity 180ms/150ms).
@media (prefers-reduced-motion: reduce) { transition-duration: 0.01ms; }
```
Etkilenen: OrderMobile, UserProfileMobile — ortak partial'a al.

**6. `transition: all` yasağı + hover gating — `transition-property` / `hover`**
- `transition-all` → daima açık property listesi (`transition-colors`, `transition-[border-color,box-shadow]`).
- Progress barları: `transition: width/transform Nms **linear**` (asla ease).
- Tüm `:hover` (özellikle lift/border) → `@media (hover: hover) and (pointer: fine)` içine; `:active` media dışında (dokunmatikte tek geri bildirim kanalı).
- Liste move geçişleri: `<TransitionGroup>` + `.x-move { transition: transform 200ms cubic-bezier(0.23,1,0.32,1); }`, silme `position: absolute` + opacity — **enter animasyonu tanımlama** (filtre sonrası yeniden oynamasın).

**Öncelik dağılımı (bu dilim):** P1 = modal/sheet/dropdown Transition eksikleri, kritik yükleme çökmeleri, tanımsız buton sınıfları, full-page reload; P2 = press feedback, `transition: all`, refetch stale-content; P3 = mikro cila (focus geçişi, list move, hover gating, easing düzeltmeleri).

---

## Dosya Envanteri: views (messaging → system)

Bu bölüm `views/` ağacının ikinci yarısını (mesajlaşma, sipariş/onay, izin yönetimi, ürün/kategori moderasyonu, regex, satış, satıcı paneli, SEO ve sistem ayarları) kapsar. Toplam **170 bulgu**, **~60 dosyaya** dağılmıştır. Baskın anti-kalıplar dört başlıkta toplanıyor:

1. **Animasyonsuz modal/sheet** — `v-if` ile ani mount/unmount, hiçbir enter/exit yumuşatması yok (`popup-modal`, dilimin en kalabalık kategorisi).
2. **`transition: all` kullanımı** — renk geçişi istenirken layout property'leri de dinleniyor; `$t-base`/`$t-fast` token'ları bypass ediliyor (`transition-property`).
3. **Eksik `:active` press feedback** — tıklanabilir elemanların çoğu basılınca hiçbir görsel tepki vermiyor (`button-feedback`).
4. **Spinner-only yükleme** — kod tabanında hiç skeleton yok; her filtre/sekme değişiminde içerik → spinner → içerik flicker'ı (`skeleton-loading`).

### En Sorunlu 5 Dosya

| Sıra | Dosya | Bulgu | En ağır sorun |
|------|-------|-------|---------------|
| 1 | `views/seller/SellerListingsView.vue` | 8 | Inline onay modalı + export dropdown + FAB + progress bar + mobil satır, hepsi animasyonsuz; spinner-only yükleme (P1). |
| 2 | `views/products/CategoryManagementView.vue` | 7 | 5 modal + mobil sheet tamamen `v-if` animasyonsuz; sheet çıkışı yok; ilk yükleme spinner-only (P1×2). |
| 3 | `views/permission/PlansTab.vue` | 7 | 2 modal + mobil sheet backdrop animasyonsuz; 7 yerde `transition: all`; hiçbir buton `:active` vermiyor (P1). |
| 4 | `views/orders/ApprovalQueueView.vue` | 6 | Onay modalı + tüm birincil butonlar + `prompt()/alert()` akışı; sayfanın çekirdek eylemi tepkisiz (P1). |
| 5 | `views/messaging/BuyerMessagesView.vue` | 5 | Mobil tam-ekran sohbet overlay'i animasyonsuz pop; aktif konuşma border-width layout zıplaması (P1). |

---

### views/orders/ApprovalQueueView.vue

Sayfanın çekirdek eylemi (Onayla/Reddet) baştan sona geri bildirimsiz: modal ani basıyor, butonlar `:active` vermiyor, akış native `prompt()/alert()`'e düşüyor. Tek dosyada 6 bulgu ile dilimin en yoğun sayfalarından.

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Onay detay modalı (backdrop + panel) — `:167` | `v-if="selectedDetail"`, Transition yok; backdrop ve `.modal` pat diye belirip kayboluyor | `<Transition name="apq-modal">` ile sar: `.apq-modal-enter-active { transition: opacity 0.2s ease-out }`, panel `transition: opacity/transform 0.2s cubic-bezier(0.23, 1, 0.32, 1)`, enter-from `.modal { opacity: 0; transform: scale(0.96) }`, leave 0.15s ease. Center-origin korunur. |
| P1 | Tüm aksiyon butonları (`.btn-primary/.btn-success/.btn-danger/.btn-secondary/.btn-ghost`) — `:540` | transition yok; hover renk geçişsiz atlıyor; hiçbir butonda `:active` yok | Ortak bloğa `transition: background 0.15s ease, transform 0.12s ease-out` + `&:active:not(:disabled) { transform: scale(0.97) }`. 120ms press / 150ms renk. |
| P2 | Onay/red akışı (`askApprove/askReject/hata`) — `:287` | `window.prompt()` + `window.alert()` — 5 yerde; başarıda geri bildirim yok | `prompt` → modal deseni (fade + textarea); hata/başarı `useToast()`. Onaylanan satır için `TransitionGroup` leave `opacity/transform translateX(8px) 0.15s ease`. |
| P2 | Yenile butonu (header) — `:10` | `:disabled` bağlı değil; `RefreshCw` dönmüyor; loading yalnız liste boşken metinle belli | `:disabled="loading"` + ikona `:class="{ spinning: loading }"`; `@keyframes apq-spin { to { transform: rotate(360deg) } }` 0.8s linear. reduced-motion'da `animation: none`. |
| P3 | Tablo/liste satır hover (`.table-row/.list-row:hover`) — `:497` | `background: #f9fafb` geçişsiz | `transition: background 0.12s ease` + hover kuralını `@media (hover: hover) and (pointer: fine)` arkasına al. |
| P3 | Yükleme durumu — `:17` | Yalnız ortalanmış metin `.state`; skeleton yok | 3-4 `.skel-row` (44px, `linear-gradient` shimmer 1.4s ease infinite); reduced-motion'da düz `#f3f4f6`. |

---

### views/messaging/BuyerMessagesView.vue

Mobil master-detail mesajlaşmanın en görünür eksiği burada: tam-ekran sohbet geçişi animasyonsuz pop yapıyor, aktif konuşma göstergesi 4px border-width layout zıplaması üretiyor.

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Mobil tam-ekran sohbet overlay'i — `:341` | `activeConversationId` class binding ile `fixed inset-0` anında; enter/exit yok | Class binding yerine `<Transition name="bms-thread">` + `v-if` (yalnız <768px). Enter `transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)`, leave 0.2s; enter-from/leave-to `translateX(100%)`. reduced-motion'da `opacity 0.15s ease`. |
| P2 | Aktif konuşma göstergesi (inbox satırı) — `:294` | `border-l-4 border-l-brand-500` seçimde içeriği 4px sağa itiyor, geçiş yok | Border yerine `box-shadow: inset 3px 0 0 0 $brand`; satıra `transition: background 0.15s ease, box-shadow 0.15s ease`. Layout kayması sıfırlanır. |
| P2 | Composer ikon butonları (`.bms-icon-btn`) — `:730` | hover transition var, `:active` yok | transition listesine `transform $t-fast` + `&:active:not(:disabled) { transform: scale(0.94) }`. Mevcut reduced-motion bloğu kapsar. |
| P3 | Mesaj balonu girişi — `:402` | `threadItems` v-for, Transition yok; yeni mesaj ani beliriyor | `<TransitionGroup name="bms-msg">`: enter `opacity/transform translateY(4px)` 0.15s; leave yok. Konuşma değişiminde `suppress` bayrağı ile ilk yüklemeyi atla, polling'de yalnız yeni öğe animasyonlansın. |
| P3 | Inbox + mesaj yükleme durumları — `:264` | İki yerde de yalnız metin; skeleton yok | 5-6 skeleton satır (40px yuvarlak + iki bar), `linear-gradient(rgba(0,0,0,.05→.09→.05))` shimmer 1.4s; reduced-motion'da düz renk. |

---

### views/messaging/AvailabilityView.vue

`:active` feedback yalnız primary butonda var; ghost/sil/yenile tutarsız. Hover kuralları media-guard'sız (dokunmatik sticky-hover riski dilimdeki tüm dosyalarda, en yoğun burada).

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | İkincil butonlar (`.avl__ghost/.avl__refresh/.avl__del`) — `:643` | `:active` yalnız `.avl__primary`'de (`translateY(1px)`) | Üç sınıfa `transform $t-fast` + `&:active:not(:disabled) { transform: scale(0.97) }`. |
| P3 | Satır ve tab hover kuralları — `:849` | Hover'lar media-guard'sız, 6+ yerde | Hover bloklarını `@media (hover: hover) and (pointer: fine)` içine taşı; transition tanımları dışarıda kalabilir. |
| P3 | Slot/rezervasyon silme sonrası liste — `:322` | `ul.avl__rows` düz v-for; silinen satır ani kaybolur, kalanlar zıplar | `<TransitionGroup tag="ul" name="avl-row">`: leave `opacity/transform scale(0.98) 0.15s` + `position: absolute`; move `transform 0.2s cubic-bezier(0.23, 1, 0.32, 1)`. Enter ekleme (filtre değişiminde yeniden animasyon olmasın). |
| P3 | Slot/rezervasyon yükleme durumu — `:295` | Yalnız metin `.avl__loading` | 3-4 skeleton (46px, radius 10px), `linear-gradient($l-bg-muted→$l-border→$l-bg-muted)` shimmer 1.4s; reduced-motion'da düz. |

---

### views/messaging/NotificationsView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Kategori sekmeleri + "Daha fazla yükle" — `:249` | `transition: all 0.15s` 2 yerde; token bypass + jenerik `all` | `.notif-page-tab { transition: color 0.15s ease, border-bottom-color 0.15s ease }`; `.load-more-btn { transition: background/border-color/color 0.15s ease }`. |
| P3 | Tıklanabilir bildirim satırları + sekme + load-more — `:273` | `:active` hiçbirinde yok; satır yalnız `cursor: pointer` | `.load-more-btn:active:not(:disabled) { transform: scale(0.97) }`; `action_url` olan satıra `:active { transform: scale(0.995); transition: transform 0.12s ease-out }`. |

---

### views/permission/PlansTab.vue

Dilimin en çok `transition: all` içeren dosyası (7 yer) ve hiçbir buton `:active` vermiyor. Modal + mobil sheet backdrop asimetrisi de burada.

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Yeni Plan modalı + silme onayı (`pln-modal-backdrop`) — `:545`/`:653` | `v-if`, backdrop fade yok, dialog enter/exit yok; blur pat diye geliyor | `<Transition name="pln-modal">`: backdrop opacity; dialog enter `opacity 0 + scale(0.96)` 200ms cubic-bezier(0.23, 1, 0.32, 1), leave 150ms scale(0.98). |
| P2 | Tüm tıklanabilir butonlar (`btn-primary/secondary/danger/plan-new-btn/tab/plan-card`) — `:1401` | `:active` hiçbir yerde yok | `&:active:not(:disabled) { transform: scale(0.97) }` + transition'a `transform 120ms cubic-bezier(0.23, 1, 0.32, 1)`. İdeali `@mixin pressable`. |
| P2 | `transition: all` kullanımı — `:1276` | `all $t-base/$t-fast` 7 yerde (1276, 1409, 1426, 1458, 1496, 1987, 2002) | Her sınıfta gerçek property: `.plan-card` → `border-color/background-color 150ms ease`; `.btn-primary` → `background-color 150ms + transform 120ms`. |
| P2 | Mobil bölüm sheet backdrop'u (`m-sheet-backdrop`) — `:203` | `v-if` ani; sheet 260ms kayarken backdrop 0ms | `<Transition name="fade">` (opacity 0.2s ease) veya her-zaman-DOM'da `opacity 0→1, transition: opacity 200ms ease, pointer-events: none`. |
| P3 | Trial ayarları mobil accordion — `:31` | Chevron `$t-panel` dönerken içerik `v-show` ani | `.trial-collapse { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 200ms cubic-bezier(0.23, 1, 0.32, 1) }` açıkken `1fr`; iç `overflow: hidden; min-height: 0`. height/max-height KULLANMA. |
| P3 | Mobil bölüm satırları (`m-secrow`) — `:2451` | Dokunmada `:active` yok, transition yok | `&:active { background: rgba($brand, 0.04); border-color: rgba($brand, 0.5) }` + `transition: border-color/background-color 120ms ease` (fc-card ile birebir). |
| P3 | Hover dokunmatik koruması — `:1278` | Hiçbir `:hover` media-guard'lı değil (7 dosyada geçerli) | Hover bloklarını `@media (hover: hover) and (pointer: fine)` içine; kritik `.plan-card/.role-item/.fc-preset-item`. Ortak `@mixin hover` önerilir. |

---

### views/permission/FeatureCatalogTab.vue

Giriş/çıkış asimetrisi belirgin: mobil `fc-slide-up` keyframe'i yalnız giriş, çıkış her yerde ani. Keyframe yerine Vue Transition şart.

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Özellik modalı + silme onayı (`fc-backdrop/fc-modal/fc-confirm`) — `:391` | Desktop animasyonsuz; mobil `fc-slide-up` yalnız giriş; çıkış ani | `v-if` → `<Transition name="fc-modal">`, keyframes sil. Desktop enter `opacity 0 + scale(0.96)` 200ms cubic-bezier(0.23, 1, 0.32, 1); mobil `translateY(24px)` enter 260ms cubic-bezier(0.32, 0.72, 0, 1). reduced-motion bloğu Transition sınıflarına taşı. |
| P1 | Mobil işlem bottom sheet (`fc-sheet`) — `:1260` | `animation: fc-slide-up 0.26s` keyframe, yalnız giriş; kapanış ani | PlansTab panes-host kalıbı: `translateY(105%)→0, transition: transform 260ms cubic-bezier(0.32, 0.72, 0, 1)`, kapanış 200ms. Backdrop opacity 200ms. Keyframes sil. |
| P2 | Birincil buton (`fc-btn-primary`) — `:860` | `transition: opacity $t-fast`; `:hover` yok | `&:hover:not(:disabled) { background: color-mix(in srgb, $brand 88%, #000) }` + `transition: background-color 150ms, opacity 120ms, transform 120ms`. Secondary → `$l-bg-soft`. |

---

### views/permission/UsersTab.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Kullanıcı düzenleme modalı (`ue-backdrop/ue-modal`) — `:107` | Desktop animasyonsuz; mobil `ue-slide-up` yalnız giriş; backdrop fade yok | `<Transition name="ue-modal">` + backdrop opacity 200ms. Desktop `scale(0.96)` enter 200ms, mobil `translateY(24px)` 260ms. `@keyframes ue-slide-up` sil. |
| P3 | `transition: all` (`filter-input/select`, `btn-primary`) — `:298` | `all $t-base` 2 blokta (298, 332) | `.filter-input/.filter-select` → `border-color/box-shadow 150ms ease`; `.btn-primary` → `background-color 150ms + transform 120ms`. |
| P3 | Modal butonları (`ue-btn-primary/secondary`) — `:782` | `transition: opacity $t-fast`; `:hover` yok | `&:hover:not(:disabled) { background: color-mix(in srgb, $brand 88%, #000) }` (secondary `$l-bg-soft`) + `transition: background-color 150ms, opacity 120ms`. fc-btn/pe-btn ile ortak mixin. |

---

### views/permission/RolesTab.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Rol profili silme onayı (`rt-confirm-backdrop`) — `:182` | `v-if`, enter/exit yok; `blur(2px)` anında | `<Transition name="rt-confirm">`: backdrop opacity 200ms; dialog `opacity 0 + scale(0.96)` 200ms cubic-bezier(0.23, 1, 0.32, 1) enter, 150ms leave. |
| P3 | `transition: all` (`btn`, `role-item`) — `:400` | `all $t-fast` (400) + `all $t-base` (584) | `.btn` → `background-color/border-color 120ms`; `.role-item` → `background-color/border-color/color 150ms`. font-weight değişimini ideali kaldır (layout shift). |

---

### views/permission/PlanComparisonTab.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Yenile butonu (`cmp-refresh`) — `:111` | transition/`:hover`/`:active` yok; `:disabled opacity 0.5` ani | `&:hover:not(:disabled) { background: $l-bg-soft; border-color: rgba($brand, 0.4) }`, `&:active:not(:disabled) { transform: scale(0.97) }`, `transition: background-color/border-color/opacity 150ms + transform 120ms`. |

---

### views/permission/AuditLogTab.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Yenile butonu + filtre yükleme geri bildirimi — `:60` | `reload()` sırasında buton disabled değil, spinner yok | `:disabled="loading"` + `:aria-busy`; ikona `.spin { animation: spin 0.8s linear infinite }`. reduced-motion'da 1.6s'e düşür veya opacity pulse. |
| P3 | `transition: all` (`log-type-btn`, `preset-btn`, `filter-select`) — `:412` | `all $t-base/$t-fast` 3 yerde (412, 483, 541) | Butonlar → `background-color/border-color/color 150ms`; `.filter-select` → `border-color/box-shadow 150ms`. |
| P3 | Yükleme durumu — `:82` | Düz metin; skeleton yok (UsersTab:27, FeatureCatalogTab:284 aynı) | 5-6 `.skel-row` (40px, `linear-gradient` 4-stop shimmer 1.4s); reduced-motion'da `animation: none`. |

---

### views/permission/PlanFeatureEditor.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Kaydet/İptal butonları (`pe-btn-primary/secondary`) — `:572` | `transition: opacity $t-fast`; `:hover` yok | `&:hover:not(:disabled) { background: color-mix(in srgb, $brand 88%, #000) }` (secondary `$l-bg-soft`) + `transition: background-color 150ms, opacity 120ms`. |
| P3 | Dirty satır vurgusu (`pe-row.dirty`) — `:398` | `background: rgba($c-warning, 0.07)` transition yok, ani yanar | `.pe-row { transition: background-color 150ms ease }`; carded accent için `box-shadow 150ms ease` de eklenebilir. |

---

### views/products/CategoryManagementView.vue

Veri-yoğun ana kategori ekranı: 5 modal + mobil sheet tamamen animasyonsuz, hover-gated aksiyonlar dokunmatikte erişilemez, ilk yükleme spinner-only. İki P1 bulgu.

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Ekle/Düzenle + 4 modal (sil 965, toplu 1000, tümü 1042, import 1093) — `:733` | `v-if` ani mount/unmount; Transition yok; global `fade` bile yok | Backdrop `<Transition name="fade">`; panel ortak `modal-pop`: enter `opacity/transform scale(0.96)` 200ms cubic-bezier(0.23, 1, 0.32, 1), leave 150ms ease-out. `scale(0)`'dan başlatma. |
| P1 | Mobil eylem sheet'i (`.cat-m-sheet`) + backdrop — `:2492` | Giriş `catMSheetIn 0.25s` keyframe; çıkış yok; backdrop fade'siz | Keyframe sil; `<Transition name="cat-m-sheet">`: enter/leave `transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)`, enter-from/leave-to `translateY(100%)`, leave-active biraz hızlı. Backdrop `<Transition name="fade">`. |
| P2 | Mobil sheet eylem butonları (`.cat-m-sh/.cat-m-more/.cat-m-addbar`) — `:2546` | 3 sınıfta transition + `:active` yok | `.cat-m-sh { transition: background-color 120ms, transform 140ms ease-out; &:active { transform: scale(0.98); background: $l-border } }`; addbar `scale(0.99)`. |
| P3 | Görsel/import progress barı — `:877` (import 1180) | `transition-all duration-300`, easing default ease | `transition-[width] duration-300 ease-linear` (iki barda); ideali `transform: scaleX() + origin-left`. |
| P3 | Kart modu düzenle/sil butonları (`opacity-0 group-hover`) — `:608` | Yalnız hover'da görünür; media-guard yok, focus'ta görünmez | `group-focus-within:opacity-100` + `@media (hover: none) { .cat-card .absolute { opacity: 1 } }`. Mevcut `transition-opacity` korunur. |
| P3 | İlk yükleme durumu — `:172` | Tam-kart merkezi spinner; skeleton yok | 5-6 `.skl-row` (40px, `linear-gradient($l-bg-muted→$l-bg-soft→$l-bg-muted)` shimmer 1.4s linear); reduced-motion'da düz gri. |

---

### views/products/CategoryModerationView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Red gerekçesi modalı + backdrop — `:304` | `v-if` ani mount/unmount, Transition yok | Backdrop `<Transition name="fade">`; panel `modal-pop` `opacity + scale(0.96)→1` enter 200ms cubic-bezier(0.23, 1, 0.32, 1), leave 150ms. |
| P2 | Onay/red sonrası liste yenileme — `:425` | Her aksiyonda `loading=true` → tam-kart spinner → yeniden render | Optimistic çıkarma: `categories.value.filter(...)` + silent arka plan refresh. `<TransitionGroup>` ile satır leave `opacity 150ms ease-out`. |

---

### views/products/ListingModerationView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | İlan detay + red gerekçesi modalları (`:496`) + backdrop — `:362` | İkisi de `v-if` ani, Transition yok; 600px panel ani beliriyor | Backdrop `<Transition name="fade">`; panel `modal-pop` enter `opacity/scale(0.96)` 200ms cubic-bezier(0.23, 1, 0.32, 1), leave 150ms ease-out. |
| P2 | Onay/red sonrası liste yenileme — `:629` | Her aksiyonda `loading=true` → tam-kart spinner | Optimistic `listings.value.filter(...)` + silent refresh; spinner yalnız ilk yüklemede. Satır leave `opacity 150ms` (TransitionGroup). |

---

### views/products/CategoryTranslationsView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Satır-içi dil hücresi inputları — `:354` | `hover:border/focus:border/ring` var ama transition utility yok | `transition-[border-color,box-shadow,background-color] duration-150` (veya scoped `border-color/box-shadow/background-color $t-base`). |
| P3 | Bayat çeviri uyarısı + otomatik kayıt onayı — `:374` | `isStale` div `v-if` ani, hücre yüksekliğini itiyor; kayıt onayı sessiz | Uyarı `<Transition name="fade">` veya `grid-template-rows: 0fr→1fr 150ms`; kayıt onayı için aynı slotta 800ms yeşil check (`opacity 150ms fade`). |
| P3 | Sıradaki eksiğe atla (scrollIntoView) — `:202` | `behavior: "smooth"` koşulsuz | `const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; behavior: reduce ? "auto" : "smooth"`. |

---

### views/regex/MyRegexPatternsView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Sütun/değer eşleştirme modalları (Teleport) — `:431`/`:507` | `v-if` ani; `.modal-backdrop rgba(0,0,0,0.45)` tek karede | Teleport içinde `<Transition name="fade">` (backdrop) + `.modal-wrap` `modal-pop` enter 200ms cubic-bezier(0.23, 1, 0.32, 1) `scale(0.96→1)`, leave 150ms. |
| P2 | Sekme butonları + `.add-row-btn` focus stili — `:789` | `&:focus { outline: none }`, görünür focus yok (RegexPatternsView:1420 de aynı) | `:focus-visible { outline: none; box-shadow: 0 0 0 3px $brand-glow; border-radius: 6px }`. |

---

### views/regex/RegexPatternsView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | 4 Teleport modalı (sütun 938, değer 1001, gelişmiş 1079, ham regex 1241) — `:938` | `v-if` ani; mobilde bottom sheet ama slide yok | Backdrop `<Transition name="fade">`; panel `modal-pop` (`scale(0.96)` 200ms); `@media (max-width: 767px)` içinde enter-from/leave-to `translateY(100%)`, `transform 260ms cubic-bezier(0.32, 0.72, 0, 1)`. |

---

### views/sales/RfqDetail.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Ek dosya önizleme modalı (tam ekran `bg-black/85`) — `:262` | `v-if` ani; en sert ani parlaklık değişimi | `<Transition name="fade">` (opacity 0.2s ease); leave 150ms ease-out. Lightbox standardı. |
| P2 | Önizleme modalında Escape kapatma — `:264` | `@keydown.escape` focusable olmayan div'de; tabindex yok, focus taşınmıyor | Kök `tabindex="-1"` + açılışta `nextTick(() => modalEl.value?.focus())`. Alternatif: window keydown listener. |
| P3 | Teklif gönderme + durum değiştirme geri bildirimi — `:720` | `alert()/confirm()` 5 yerde (629, 622, 706, 720, 724) | `useToast()` → `toast.success/toast.error`; confirm'ler `modal-pop`'lu onay modalı. |
| P3 | Stepper adım dairesi (`.stepper-circle`) — `:760` | `transition: all 0.2s` | `transition: background-color/border-color/color/box-shadow 200ms ease`. |

---

### views/sales/RfqList.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Durum filtre pill'leri (`.status-pill`) — `:526` | `transition: all 0.15s`, easing yok | `transition: background-color/color/border-color 150ms ease`. |
| P3 | Arama inputu (`transition-all`) — `:57` | `transition-all` — padding/genişlik dahil | `transition-[border-color,box-shadow] duration-150` veya scoped `border-color/box-shadow $t-base`. |
| P3 | Arama yazarken yükleme — `:93` | 400ms debounce sonrası her aramada tam spinner | Liste görünür kalsın: `:class="{ 'opacity-60': loading && items.length }"` + `transition: opacity 150ms ease`; tam spinner yalnız boşken. |

---

### views/sales/MyQuotesList.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Durum filtresi yükleme durumu — `:34` | Her pill'de `loadData()` + `v-if="loading"` tam spinner (filtreleme zaten client-side) | Ham listeyi `allItems` ref'te tut, `items`'ı `computed` yap; pill değişiminde ağ çağrısı + spinner kalkar. `loadData` yalnız mount + yenile. |

---

### views/seller/MyCertificationsView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | 6 modal (mağaza sert., listing atama/düzenleme, öneri, toplu atama/kaldırma) — `:700` (879, 978, 1047, 1108, 1242) | `v-if` Transition'sız; aynı sayfadaki upload overlay Transition kullanıyor | Her modal `<Transition name="fade">`; içerik kartına enter `opacity 0 + scale(0.97)` 200ms cubic-bezier(0.23, 1, 0.32, 1), leave 150ms. Backdrop yalnız opacity. |
| P3 | Düzenle/Sil/toplu aksiyon butonları — `:188` (194, 266, 272, 317, 323, 421, 427) | `hover:bg-gray-50` var, `transition-colors` yok — ~10 buton | Hepsine `transition-colors` + `active:scale-[0.97]` `transition-[transform,background-color] duration-150`. |
| P3 | Belge upload progress barları — `:797` | `transition-all duration-300` (MyVerifications:331, SellerCategories:394/525 aynı) | `transition-[width] duration-300 ease-linear` (ListingFormView:440 emsal). |
| P3 | İlk yükleme durumu — `:44` | Yalnız "Yükleniyor..." metni (MyVerifications:47 aynı) | Sekme çubuğu + 3-4 kart skeleton; `linear-gradient` shimmer 1.2s linear; reduced-motion'da statik. |

---

### views/seller/ListingFormView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Kategori seçici + tamlık modalları — `:2596` (2854) | Teleport'ta `v-if` Transition yok; aynı dosyada upload `fade` kullanıyor | Backdrop `<Transition name="fade">`; gövde `scale(0.97) + opacity 0` enter 200ms cubic-bezier(0.23, 1, 0.32, 1), leave 150ms. |
| P2 | Accordion bölüm gövdeleri (9 bölüm) — `:533` | `v-show`; gövde ani, `.lfv-chev` 0.2s dönüyor (yarım his) | `.lfv-sec-wrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 220ms cubic-bezier(0.23, 1, 0.32, 1) }` açıkken `1fr`; iç `overflow: hidden`. max-height KULLANMA. |
| P2 | Kaydet butonları (header + mobil çubuk) — `:105` (mobil 2581) | `:active` scale yok (`hdr-btn-primary` global da yok) | `.lfv-hdr-save`, `.lfv-mobile-save-bar__btn` → `&:active { transform: scale(0.97) }` + `transition: transform 120ms cubic-bezier(0.23, 1, 0.32, 1)`. |
| P3 | Kategori seçici "Seç" butonları + tamlık bar — `:2739` (2800, 2809, bar 2880) | `opacity-0 group-hover + transition-all` | Butonlar `transition-opacity duration-150`; bar `transition-[width] duration-300 ease-out`; `@media (hover: none) { .opacity-0 { opacity: 1 } }`. |
| P3 | Galeri görseli hover aksiyonları + alt yazı — `:1079` (1104, 1832) | `opacity-0 group-hover transition-opacity` — dokunmatikte erişimsiz | `@media (hover: none) and (pointer: coarse) { [class*='group-hover:opacity-100'] { opacity: 1 } }`; hover transition'ı `@media (hover: hover)` içine. |

---

### views/seller/SellerCategoriesView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Kategori düzenleme + ekleme modalları — `:341`/`:470` | `v-if` Transition'sız; backdrop + kart ani | Her ikisi `<Transition name="fade">`; içerik `scale(0.97)` enter `transform/opacity 200ms cubic-bezier(0.23, 1, 0.32, 1)`, leave 150ms. |
| P2 | Liste yükleme durumu — `:49` | `v-if="loading"` tüm grid → spinner; her toggle/sil `loading=true` | İlk yüklemede skeleton; yenilemede listeyi koru veya `opacity: 0.6 + pointer-events: none, 150ms ease`. Satır bazında `togglingId` spinner'ı zaten var. |
| P3 | Progress barlar — `:394` | `transition-all duration-300` | Ortak `<ProgressBar>` bileşenine çıkar; `transform: scaleX() + origin-left + transition: transform 240ms cubic-bezier(0.23, 1, 0.32, 1)`. |

---

### views/seller/ListingReviewModerationView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Reddetme gerekçesi overlay modalı — `:646` | `v-if` overlay, Transition yok; aynı dosyada sheet doğru animate | Backdrop `<Transition name="fade">`; kart `opacity 0 + scale(0.97)` enter 200ms cubic-bezier(0.23, 1, 0.32, 1), leave 150ms. |
| P2 | Bottom sheet aksiyon butonları (`.rvm-sheet-btn`) — `:1327` | `transition: background $t-fast`; `:active` yok; Tailwind `hover:` dokunmatiğe sızıyor | `transition`'a `transform 120ms cubic-bezier(0.23, 1, 0.32, 1)` + `&:active { transform: scale(0.98) }`; hover'ı `@media (hover: hover)` arkasına. Kart üstü `w-8 h-8` ikonlar `active:scale-95`. |
| P3 | Yorum kuyruğu yükleme durumu — `:111` | `v-if="loading"` tüm listeyi değiştiriyor | Sekme/filtre geçişinde `opacity 0.6, transition: opacity 150ms ease`; spinner yalnız ilk mount. |
| P3 | Şikayet (abuse) detay paneli açılışı — `:324` | `v-if` ani, kartı aşağı itiyor | `grid-template-rows: 0fr→1fr, 200ms cubic-bezier(0.23, 1, 0.32, 1)` (max-height KULLANMA); reduced-motion'da devre dışı. |

---

### views/seller/MyVerificationsView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Header + modal submit butonları — `:21` (29, 414) | `active:scale-[0.97]` var ama `transition-colors` — transform geçişe dahil değil, ani zıplıyor | `transition-[transform,background-color] duration-150 ease-out` (CSS: `transform 120ms cubic-bezier(0.23, 1, 0.32, 1), background-color 150ms`). |
| P3 | Modal içeriği (fade) — `:246` | `Transition name="fade"` yalnız `opacity 0.15s`; scale yok | Scoped fade genişlet: kart `opacity 0 + scale(0.97)`, `transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms`, leave 150ms. Dilimde referans dosya. |

---

### views/seller/SellerKpiDetail.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Hedef vs Gerçek bar dolumu — `:232` | `transition-all duration-700` + `:style width` (SellerScoreDetail:196, BulkProductImportView:1403 aynı) | `transform: scaleX + origin-left`, `transition: transform 240ms cubic-bezier(0.23, 1, 0.32, 1)`; 300ms altı. `duration-700` kaldır. |
| P3 | `.stepper-circle` + `.detail-tab` — `:729` (762) | `transition: all 0.2s` 2 yerde | `.stepper-circle` → `background-color/border-color/color 0.15s ease`; `.detail-tab` → `color/border-color 0.15s ease`. |

---

### views/seller/KpiTemplateDetail.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | `.detail-tab` geçişi — `:353` | `transition: all 0.2s` (SellerKpiDetail kopyası) | `transition: color 0.15s ease, border-color 0.15s ease`. |

---

### views/seller/KpiTemplateList.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Liste yükleme durumu — `:73` | `v-if="loading"` spinner; her pill/sort/arama `loading=true` | İlk yüklemede 8-10 skeleton (`h-10`, shimmer 1.2s linear); filtre değişiminde eski veri + `opacity .6 / 150ms ease`. |
| P3 | `.status-pill` — `:417` | `transition: all 0.15s` | `transition: background-color/border-color/color 0.15s ease`. |

---

### views/seller/SellerOrdersView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Ship/Refund/Confirm modalleri (3) — `:486` (532, 664) | `v-if` Transition'sız; mobilde bottom-sheet ama kaymıyor; grep Transition = 0 | Her modal `<Transition name="so-modal">`: enter/leave opacity; panel `scale(0.96) translateY(8px)` 200ms cubic-bezier(0.23, 1, 0.32, 1). Mobil media query'de panel `translateY(100%)`, 260ms cubic-bezier(0.32, 0.72, 0, 1). |
| P2 | Sipariş modalları mobil bottom-sheet — `:1314` | `@media(max-width:767px)` sheet layout var ama `<Transition>` hiç yok | Kök `<Transition name="m-sheet">` (global) alttan kaydırır; desktop `fade`; `isLg`'ye göre transition adı. |
| P2 | Yükleme durumu — `:34` | `v-if="loading"` spinner; her durum pill'inde tüm liste kaybolur | Sekme değişiminde `.card-list-loading { opacity: 0.5; pointer-events: none; transition: opacity 150ms ease }`; ilk yüklemede 6-8 satır shimmer. |

---

### views/seller/SellerListingsView.vue

Dilimin en kalabalık dosyası (8 bulgu): inline onay modalı, export dropdown, FAB, mobil satır, iki progress bar ve spinner-only yükleme — mobil ve masaüstü etkileşim dilinin tamamı eksik.

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Inline düzenleme onay popup'ı (Teleport) — `:654` | `v-if="editConfirm"` Transition yok; `bg-black/40` + panel ani | `<Transition name="fade">` (global); panel `.fade-enter-from .relative { transform: scale(0.97) }` `transition: transform 180ms cubic-bezier(0.23, 1, 0.32, 1)`; leave 120ms ease. |
| P1 | Tam sayfa yükleme durumu (spinner-only) — `:197` | `card + animate-spin`; kod tabanında HİÇ skeleton yok (~40 view temsili) | Liste/tablo + dashboard için skeleton: gerçek satır yüksekliğinde `animate-pulse` (opacity 1↔.4, ~1.5s ease-in-out). shimmer yerine opacity/transform (layout tetiklemez). |
| P2 | Masaüstü "Dışa Aktar" dropdown — `:28` | `<template v-if>` Transition'sız; mobil ⋯ menüsü (116) `dropdown` kullanıyor | Overlay + menü `<Transition name="dropdown">` (enter 0.15s / leave 0.1s, `opacity + translateY(-4px)`); `transform-origin: top right`. |
| P2 | Mobil "Yeni Ekle" FAB (`.sl-fab`) — `:1529` | transition/`:active` yok | `.sl-fab { transition: transform 120ms ease-out, box-shadow 120ms ease-out } .sl-fab:active { transform: scale(0.96); box-shadow: 0 3px 8px rgba(0,0,0,0.22) }`. |
| P2 | Yükleme durumu (liste/tablo) — `:197` | Tek spinner kartı; 20 satır veri layout shift | 8-10 `.skl-row` (44px, `linear-gradient` shimmer 1.2s linear); reduced-motion'da `none`. Alt: filtre değişiminde `opacity: 0.5`. |
| P3 | Tamamlanma skoru progress barı — `:391` (580; list kopya 519 transition'sız) | `transition-all` 2 yerde, davranış tutarsız | İki yerden `transition-all` kaldır (519 ile tutarlı); istenirse `transition: width 200ms ease-out`. |
| P3 | Mobil veri-yoğun satır (`.sl-mrow`) — `:1392` | `cursor: pointer` var, `:active`/transition yok | `.sl-mrow { transition: background-color 0.12s ease } .sl-mrow:active { background: $l-bg-muted }`; dark'ta `rgba(255,255,255,0.05)`. |
| P3 | Kategori hücresi hover folder ikonu — `:341` | `opacity-0 group-hover:opacity-60` transition yok | İkona `transition-opacity duration-150`. |

---

### views/seller/SellerScoreDetail.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Kategori skor progress barı — `:196` | `transition-all duration-700` + `:style width` | `transition-all/duration-700` kaldır (bar dolu çizilsin); istenirse `transition: width 250ms cubic-bezier(0.23, 1, 0.32, 1)`. |
| P3 | `.detail-tab` + `.stepper-circle` — `:685` (652) | İkisi de `transition: all 0.2s` | `.detail-tab` → `color/border-bottom-color 0.15s`; `.stepper-circle` → `background-color/border-color/color 0.2s ease`. |

---

### views/seller/SellerKpiList.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Durum filtre pill'leri (`.status-pill`) — `:542` | `transition: all 0.15s`; `:active` yok; hover guard'sız | `transition: background-color/border-color/color 0.15s + transform 0.12s ease-out`; `:active { transform: scale(0.97) }`; hover `@media (hover: hover) and (pointer: fine)`. |
| P3 | Arama input'u — `:56` | Tailwind `transition-all` | scoped `transition: border-color 0.15s ease, box-shadow 0.15s ease`. |

---

### views/seller/SellerScoreList.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Durum filtre pill'leri (`.status-pill`) — `:497` (502) | SellerKpiList kopyası: `transition: all` + `:active` yok + guard yok | Aynı düzeltme; iki dosyadaki `.status-pill`'i ortak SCSS'e taşı. |
| P3 | Arama input'u — `:55` | `transition-all` (üçüncü kopya) | scoped `transition: border-color 0.15s ease, box-shadow 0.15s ease`. |

---

### views/seller/SellerMetricsDetail.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Detay sekmeleri (`.detail-tab`) — `:390` | `transition: all 0.2s`; font-weight 500→600 `all` altında titriyor | `transition: color 0.15s ease, border-bottom-color 0.15s ease`. |

---

### views/seller/SellerMetricsList.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Arama input'u — `:37` | `transition-all` (SellerKpiList kalıbı) | scoped `transition: border-color 0.15s ease, box-shadow 0.15s ease`. |

---

### views/seller/SellerQuestionsView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Inline yanıt formu (Yanıtla → textarea) — `:144` | `v-if/v-else` ani takas; kart yüksekliği zıplar | Form `<Transition>`: enter `opacity/transform translateY(-4px)` 150ms cubic-bezier(0.23, 1, 0.32, 1). Çıkış animasyonsuz kalabilir. |

---

### views/seller/SubUserManagementView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Davet modalı — `:86` | `v-if` Transition'sız; `0.55` siyah backdrop ani; global `fade` bile yok | Backdrop `<Transition name="fade">`; panel `modal-pop` `scale(0.96)` enter 200ms cubic-bezier(0.23, 1, 0.32, 1), leave 150ms `scale(0.98)`. |
| P2 | Buton/input transition tanımları — `:465` (585 `.form-input`) | `transition: all $t-base`; `.btn-primary:hover translateY(-1px) + box-shadow` (B2B için fazla gösterişli) | Butonlar `background-color/border-color/color/box-shadow 0.15s + transform 0.12s`; `translateY(-1px)` kaldır. `.form-input` → `border-color/box-shadow/background-color 0.15s`. Hover `@media (hover: hover)`. |
| P2 | Yerel buton seti (`.btn-primary/secondary/ghost`) `:active` — `:453` | `:active` tanımsız | `&:active:not(:disabled) { transform: scale(0.97) }` (transform transition önceki bulguyla eklenmiş olacak). |
| P3 | Deaktive/aktive/iptal onayları — `:211` (173, 222, 227, 244) | `prompt/confirm/alert` native — 5 yerde | `.modal-backdrop/.modal` kalıbını onay modalına genelle (P1 transition'larıyla); sebep gereken akışta tek input'lu varyant. |

---

### views/seller/StorefrontLayoutEditor.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Mağaza Başlığı accordion — `:231` | `v-show` ani; ok metin swap `▲/▼` | `.acc { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 200ms cubic-bezier(0.23, 1, 0.32, 1) } .acc.open { 1fr }`; iç `overflow: hidden`. Tek `▼` + `.chev { transition: transform 160ms ease-out } .open .chev { rotate(180deg) }`. |
| P3 | Palet bölüm öğesi (sürüklenebilir) — `:134` | Tailwind `transition-all`; drag transform'unu da dinleyip gecikme | `transition-colors` (border/background/color 150ms). `active:bg-brand-50` korunur. |
| P3 | Canvas'a bölüm ekleme — `:339` | `addSection` push, yeni kart ani belirir; draggable `animation="200"` yalnız sıralama | `.sec-card { transition: opacity/transform translateY(4px) 180ms cubic-bezier(0.23, 1, 0.32, 1) }` + `@starting-style { opacity: 0; transform: translateY(4px) }`. Tek seferlik, stagger'sız. |
| P3 | "Kaydediliyor…/Kaydedildi" durum metni — `:327` | `v-if/v-else-if` ani swap | `<Transition name="fade" mode="out-in">` (global fade); ek CSS gerekmez. |
| P3 | Mobil sabit kaydet çubuğu (`.sle-mobile-save-bar`) — `:394` | `v-if="!loading && sellerCode"` ani belirir | `<Transition name="savebar">`: enter-from `translateY(100%)`, `transform 260ms cubic-bezier(0.32, 0.72, 0, 1)`. Yalnız enter. reduced-motion'da `none`. |

---

### views/seller/StorefrontEdit.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Sayfa ilk yükleme durumu — `:32` | `fa-spinner` + metin; içerik gelince tüm layout ani değişir | Sekme şeridi + 2 kart iskeleti; `.sk { linear-gradient(#f3f4f6→#e5e7eb→#f3f4f6) shimmer 1.4s linear }`; reduced-motion'da düz gri. |
| P3 | `.detail-tab` geçişi — `:1224` | `transition: all 0.2s`, token/easing yok | `transition: color 0.15s ease, border-bottom-color 0.15s ease`; SCSS'e çevrilirse `$t-base`. |
| P3 | Upload progress barları (logo + banner) — `:90` (265; StorefrontLayoutEditor:258 aynı) | `transition-all duration-300` | `transform: scaleX() + origin-left + transition-transform duration-300 ease-linear`. |
| P3 | Slider/fabrika görseli silme (kırmızı X) — `:377` (471) | `bg-red-500` statik; hover/active/transition yok; splice ile ani kaybolur, grid zıplar | `hover:bg-red-600 active:scale-95 transition-[background-color,transform] duration-150`. Grid `<TransitionGroup>` `.list-move { transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1) }`. |

---

### views/seller/SuggestCertificationView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Form → başarı ekranı geçişi + hata mesajı — `:46` (92) | `v-if="success"/v-else` iki büyük blok ani yer değiştirir | Başarı bloğu `<Transition>`: enter `opacity 0 + scale(0.97)` 250ms cubic-bezier(0.23, 1, 0.32, 1) (mode yok). Hata için `opacity/translateY(-2px)` 150ms. reduced-motion'da yalnız opacity. |
| P3 | "Önerilerim" listesi — `:120` | `v-if="length > 0"` koca bölüm ani pop; yükleme placeholder'ı yok | `@starting-style { opacity: 0; transform: translateY(6px) }` + `transition 200ms cubic-bezier(0.23, 1, 0.32, 1)`; ideali `loading` ref + 2-3 satır skeleton. |

---

### views/seo/SeoRedirectListView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Yeni/düzenle inline form — `:115` | `v-if="showForm"` transition yok; tablo aniden aşağı itilir | `<Transition name="panel-in">`: enter `opacity/transform translateY(-4px)` 200ms cubic-bezier(0.23, 1, 0.32, 1), leave 120ms opacity (asimetri). |
| P3 | Tablo/liste satır hover'ları — `:170` (230) | `hover:bg-gray-50` transition'sız | `transition-colors duration-100` (`background-color 100ms ease`). |

---

### views/seo/SeoPagesView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Tablo yükleme durumu — `:274` | `v-if="loading"` tüm tabloyu "Yükleniyor" metniyle değiştirir; her sekme/filtre çöker | Satırları koru: `.tbl-loading { opacity: 0.45; pointer-events: none; transition: opacity 0.15s ease }`; ilk yüklemede 5-6 shimmer satır (`py-3` yükseklik). |
| P3 | Tablo satır hover'ı — `:302` | `hover:bg-gray-50` transition'sız (tablo); list modu (430) `transition-colors` var — tutarsız | `<tr>`'ye `transition-colors duration-100`. |

---

### views/seo/Seo404ReportView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Satır hover + "Yönlendir" butonu — `:108` (132, 153, 169) | `hover:bg-gray-50`/`hover:bg-blue-700` transition'sız — 4 yerde; global `.tbl-row` `$t-fast` kullanırken tutarsız | İlgili satır/butonlara `transition-colors duration-100` (`background-color 100ms ease`). |

---

### views/system/HeroSliderView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Yeni Slide birincil butonu (`.hs-btn-primary`) — `:650` | `cursor: pointer` dışında hiçbir şey yok — hover/active/transition yok | `&:hover { background: $brand-light } &:active { transform: scale(0.97) }` + `transition: background $t-base, transform 120ms cubic-bezier(0.23, 1, 0.32, 1)`. |
| P3 | Düzenle/Sil ikon butonları (`.row-icon`) — `:625` | `:hover` renk/bg değişiyor, transition yok | `transition: background $t-base, color $t-base`; dokunmatik `&:active { transform: scale(0.94) }` + `transform 100ms ease-out`. |
| P3 | Aktif/Pasif rozeti (`.badge`) — `:607` | Tıklanabilir toggle; renk swap transition'sız, `:active` yok | `transition: background $t-base, color $t-base` + `&:active { transform: scale(0.95) }` `transform 100ms ease-out`. |

---

### views/system/ComplianceMaskMatrixView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Politika düzenleme modalı (`.modal-overlay/.modal-card`) — `:176` | `v-if="editingPolicy"` Transition yok; aynı dosyadaki mobil `pii-sheet` doğru animate | Overlay `<Transition name="fade">`; kart enter 200ms cubic-bezier(0.23, 1, 0.32, 1) `scale(0.96)`, leave 150ms. reduced-motion'da transform'u kaldır, opacity koru. |
| P2 | Yeni Politika butonu (`.btn-primary`) — `:532` | `transition: background $t-base, transform $t-spring` ama hiçbir state transform set etmiyor (ölü kod); `$t-spring` çok yavaş | `&:active { transform: scale(0.97) }` + `transition: background $t-base, transform 120ms cubic-bezier(0.23, 1, 0.32, 1)`. |
| P2 | Mobil politika satırları (`.m-prow`) — `:790` | `cursor: pointer` var; hover/`:active`/transition yok | `&:active { background: $l-bg-soft; transform: scale(0.99) }` (dark `$d-item-hover`) + `transition: background/transform 100ms ease-out`. |

---

### views/system/DelegationManagerView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Yeni yetki devri modalı (`.modal-overlay/.modal-card`) — `:71` | `v-if="creating"` Transition yok | Backdrop `<Transition name="fade">`; kart enter `opacity 0 + scale(0.96)→1` 200ms cubic-bezier(0.23, 1, 0.32, 1), leave 150ms. Ortak BaseModal önerilir. |
| P2 | Sayfa ilk yükleme durumu — `:153` | `loading` state yok; veri gelene kadar "Kayıt yok" gösteriyor sonra ani swap | `loading` ref + kart yüksekliğinde (~64px) 2-3 skeleton (`radius 8px, $l-bg-subtle, opacity pulse 1.5s ease-in-out infinite`). |

---

### views/system/CategoryShowcaseView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | İptal/ghost butonu (`.hdr-btn-ghost`) — `:402` | `:hover` var ama transition tanımlı DEĞİL; HeaderNoticesView:285'te doğru | HeaderNoticesView tanımını uygula: `transition: background $t-base, border-color $t-base, color $t-base` + `&:active { transform: scale(0.97) }` `transform 120ms cubic-bezier(0.23, 1, 0.32, 1)`. |
| P3 | Kaydedilmemiş değişiklik çubuğu (`.settings-actions`) — `:16` | `v-if="isSettingsDirty"` transition yok, başlığı zıplatır | `<Transition name="fade">` (opacity 0.2s ease). HeaderNoticesView:16 `.mode-actions` ile aynı. |

---

### views/system/AuthorizationSimulatorView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Form input/select (`.field input/select`) — `:303` | `transition: all $t-base`; aynı dosyada doğru yazım da var | `transition: border-color $t-base, box-shadow $t-base, background $t-base`. |
| P2 | Simüle Et butonu (`.btn-primary`) — `:370` | `transition: all`; hover `translateY(-1px)` + box-shadow, `:active` yok (asimetri ters) | `transition: background $t-base, transform 120ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow $t-base` + `&:active:not(:disabled) { transform: scale(0.97); box-shadow: none }`. |
| P3 | Simülasyon sonucu kutusu (`.result-box`) — `:402` | `animation: fadeUp 0.3s ease both`; jenerik ease, reduced-motion muafiyeti yok | `animation: fadeUp 0.25s cubic-bezier(0.23, 1, 0.32, 1) both` + `@media (prefers-reduced-motion: reduce) { animation: none }`. |
| P3 | Gelişmiş bağlam accordion (`<details>`) — `:52` | Native details, açılış ani | `.advanced[open] .form-grid { animation: fadeUp 0.18s cubic-bezier(0.23, 1, 0.32, 1) both }`; reduced-motion'da kapat. |
| P3 | Lokal `@keyframes fadeUp` tekrarı — `:580` | Global `animations.scss:4` ile birebir aynı, iki yerde (DRY ihlali) | Lokal `@keyframes fadeUp` bloğunu sil; global scoped içinde çözülür. Yalnız `animation-delay`/stagger view'da kalsın. |

---

### views/system/DashboardManagerView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Widget satırı kartı (draggable) — `:137` | Tailwind `transition-all`; yalnız `opacity` değişiyor ama border/padding da dinleniyor | `transition-opacity duration-150`. |
| P3 | Sıralama kaydedildi mesajı (`reorderStatus`) — `:243` | `v-if` ani, `setTimeout(2500)` ani kaybolur | `<Transition name="fade">` + kapsayıcıya `min-height`; ideali `useToast`. |
| P3 | Dashboard/widget listesi yükleme — `:17` | `fa-spinner` + metin (2 yerde) | 3-4 satır skeleton (gerçek satır yüksekliği, `var(--th-surface-elevated)`, `opacity 0.5→1 pulse 1.5s ease-in-out infinite`). |

---

### views/system/AnomalyDashboardView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Buton sınıfları (`.btn-primary/secondary/link`) — `:308` | Yalnız background/color transition; `:active` yok | `.btn-primary/secondary` → `&:active { transform: scale(0.97) }` + `transform 120ms cubic-bezier(0.23, 1, 0.32, 1)`; `.btn-link` → `&:active { opacity: 0.7 }`. |
| P2 | Acknowledge/Resolve/Detay/Tarama akışları — `:164` | `prompt/alert` native — 4 yerde | `.modal-overlay` + `fade` Transition (backdrop opacity 0.2s, kart `scale 0.96→1` 200ms cubic-bezier(0.23, 1, 0.32, 1)); not/detay uygulama içi modala. |
| P3 | Alert listesi yükleme durumu — `:48` | Düz "Yükleniyor" paragrafı | 2-3 `.alert-card` boyutunda (~100px) skeleton, `opacity 0.5↔1 pulse 1.5s ease-in-out infinite`; filtre değişiminde liste yerinde. |

---

### views/system/HeaderNoticesView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Görünüm modu dirty aksiyonları (`.mode-actions`) — `:16` | `v-if="isModeDirty"` transition yok, header'ı zıplatır | `<Transition name="fade">` (opacity 0.2s ease). CategoryShowcaseView ile aynı kalıp. |
| P3 | Duyuru listesi yükleme durumu — `:45` | Düz "Yükleniyor" (CategoryShowcase:88, HeroSlider:25 aynı) | 3 skeleton blok + `opacity pulse 1.5s ease-in-out infinite`; ortak `SkeletonRows` bileşeni. |

---

### views/system/OwnerTransferView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Yeni devir talebi modalı (`.modal-overlay/.modal-card`) — `:59` | `v-if="creating"` animasyonsuz; global `fade` kullanılmamış | `<Transition name="modal">`: enter opacity 200ms cubic-bezier(0.23, 1, 0.32, 1), `.modal-card transform/opacity 200ms scale(0.96)`, leave 150ms. |
| P2 | Tüm tıklanabilirler (`.btn-primary/secondary/link`) — `:339` | `:active` hiçbirinde yok | Üçüne `&:active { transform: scale(0.97) }` + `transform 120ms ease-out`. |
| P3 | Sayfa altı hata mesajı (`.error-message`) — `:91` | `v-if` ani, kalıcı (kapatma/otomatik yok) | `useToast().error(...)`; inline kalacaksa `<Transition name="fade">`. |

---

### views/system/ThemeManagerView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P1 | Scale generator + reset onay modalları (2) — `:769` (844) | İkisi de `v-if` animasyonsuz; `bg-black/40` fade'siz | Her ikisi `<Transition name="fade">`; kart `scale(0.96) + opacity 0` enter 200ms cubic-bezier(0.23, 1, 0.32, 1), leave 150ms. |
| P2 | Canlı önizleme elemanları (`.preview-btn/.th-preview-input/.pc-preview`) — `:1264` (1322, 1439) | `transition: all 0.15s ease`; slider sürüklerken layout property'ler animate olup "lastikli" tepki | `transition: background-color/color/border-color/box-shadow 0.15s ease`; boyutsal token'lar transition'sız anında. |
| P2 | Kaydetme hatası geri bildirimi — `:1122` | `alert()` native; başarıda geri bildirim yok | `useToast` → hata `toast.error(e.message)`, başarı `toast.success(...)`. |
| P3 | Sayfa yükleme durumu — `:69` | `fa-spinner` → dev iki kolonlu editör ani | Sekme çubuğu + sol kart iskeletleri + sağ sticky önizleme placeholder; `opacity pulse 1.2s ease-in-out infinite`, reduced-motion'da `none`. |

---

### views/system/PermissionConsoleView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Hata toast Transition'ı (`.toast-enter/leave-active`) — `:884` | `transition: all $t-spring`; giriş/çıkış simetrik | `.toast-enter-active { transition: transform/opacity 250ms cubic-bezier(0.23, 1, 0.32, 1) } .toast-leave-active { transition: transform/opacity 180ms ease }`. Yön kurgusu doğru. |
| P2 | Sekme/chip/refresh/karusel noktaları — `:674` (462, 587, 793) | `transition: all $t-base` 4 yerde; `:active` yok | `transition: background/color/border-color 0.15s + transform 120ms ease-out` + `.tab-btn/.chip/.btn-refresh:active { transform: scale(0.97) }`. |
| P3 | KPI karusel noktaları (`.kpi-dots span`) — `:587` | `.is-on` width 5px→16px, `transition: all` (layout, scroll handler ile) | Sabit 16px + `transform: scaleX(0.31)`; `.is-on { scaleX(1) }`, `transition: transform/background-color 0.15s ease`. |
| P3 | KPI kartları yükleme durumu — `:60` | Değerler "—", `aria-busy` var ama skeleton yok | `.kpi-value.is-loading` placeholder (`width: 3ch; $l-border; radius 4px; opacity pulse 1.2s`); reduced-motion'da `none`. |

---

### views/system/SocialProofSettingsView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Canlı önizleme yenilemesi (`previewLoading`) — `:101` | Her eşik değişiminde `.preview-cards` DOM'dan kalkıp "yükleniyor" metni; büyük layout shift | `v-if` yerine kartları koru: `.preview-cards.is-refreshing { opacity: 0.55; pointer-events: none; transition: opacity 150ms ease }`; ilk yüklemede metin kalabilir. |
| P3 | Dönen storefront rozeti (`badge-fade`) — `:791` | `opacity 300ms + mode="out-in"` → ~600ms | `.badge-fade-enter-active { transition: opacity 180ms ease } .badge-fade-leave-active { 140ms ease }` → ~320ms. |

---

### views/system/RecommendationsSettingsView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Kaydet/rebuild hata-başarı geri bildirimi — `:373` (381, 386, 394) | `alert()/confirm()` native; başarıda geri bildirim yok | `useToast` → `toast.success/error`; `rebuildConfirm` destructive kalabilir. SocialProof `handleSave` referans. |
| P2 | Sayfa yükleme durumu — `:65` | `fa-spinner` (~100px) → ~1500px içerik ani | Sayfa yapısını taklit eden skeleton (kart + grid); `.skeleton { #e5e7eb; animation: pulse 1.2s ease-in-out infinite }`; reduced-motion'da `none`. |
| P3 | Yerel buton sınıfları (`.hdr-btn-outlined/primary`) — `:513` | `transition: background 0.15s` hardcoded; `:active` yok; renkler hardcoded | `<style scoped lang="scss">` + `@use variables`; `transition: background $t-base, transform 120ms ease-out` + `&:active:not(:disabled) { transform: scale(0.97) }`. |
| P3 | FieldNumber/WeightCard sayı inputları — `:428` | `focus:border-amber-400` var, transition yok; Σ rozeti renk zıplar (21 alan) | Input + Σ rozetine `transition-colors duration-150`. |

---

### views/system/TrackingSettingsView.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Takip kimliği input'u (`.field-input` focus) — `:334` | `transition: border-color $t-fast`; `box-shadow` focus halkası transition'sız | `transition: border-color $t-fast, box-shadow $t-fast` (SocialProof:543 deseni). |
| P3 | Kaydetme hatası satırı (`.save-error`) — `:77` | `v-if` animasyonsuz (toast zaten atılıyor, ikinci kanal) | `<Transition name="fade">` veya inline bloğu tamamen kaldır. |

---

### Önerilen Standart

Bu alandaki (messaging → system) tekrarlayan sorunlar tek tip reçeteyle çözülür. Aşağıdaki altı kalıp, dilimdeki 170 bulgunun ~%90'ını kapatır:

**1. Modal / Dialog (merkezi) — ortak `modal-pop`**
```scss
.modal-pop-enter-active { transition: opacity 200ms cubic-bezier(0.23, 1, 0.32, 1), transform 200ms cubic-bezier(0.23, 1, 0.32, 1); }
.modal-pop-leave-active { transition: opacity 150ms ease-out, transform 150ms ease-out; }
.modal-pop-enter-from, .modal-pop-leave-to { opacity: 0; transform: scale(0.96); }
/* backdrop ayrı: <Transition name="fade"> (global opacity 0.2s ease) */
```
Modal `transform-origin: center` kalır (tek istisna). `scale(0)`'dan asla başlatma. Enter 200ms / leave 150ms (asimetri). reduced-motion'da transform'u kaldır, opacity'yi koru.

**2. Bottom sheet (mobil) — global `m-sheet`**
```scss
.m-sheet-enter-active, .m-sheet-leave-active { transition: transform 260ms cubic-bezier(0.32, 0.72, 0, 1); }
.m-sheet-enter-from, .m-sheet-leave-to { transform: translateY(100%); }
```
Giren yüzey aynı yönden (alttan) çıkar. Keyframe (`fc-slide-up`, `catMSheetIn`, `ue-slide-up`) yerine daima Vue `<Transition>` — kesintiye uğrayıp retarget edebilmesi için. Backdrop ayrı `fade`.

**3. Buton press feedback — `@mixin pressable`**
```scss
@mixin pressable {
  transition: background-color 150ms ease, transform 120ms cubic-bezier(0.23, 1, 0.32, 1);
  &:active:not(:disabled) { transform: scale(0.97); }  /* FAB/ikon: 0.94-0.96, büyük satır: 0.995 */
}
```
Her tıklanabilir eleman press feedback almalı. 100–160ms bandı.

**4. `transition: all` yasağı** — daima property listesi: renk için `background-color/border-color/color`, focus için `box-shadow`. `$t-base`/`$t-fast` token'larını kullan, hardcoded süre yazma.

**5. Hover dokunmatik koruması — `@mixin hover`**
```scss
@mixin hover { @media (hover: hover) and (pointer: fine) { &:hover { @content; } } }
```
Tüm `:hover` kuralları (özellikle tıklanabilir kartlar, hover-gated aksiyonlar) bu guard arkasında. Hover-gated butonlar dokunmatikte `@media (hover: none)` ile kalıcı görünür.

**6. Yükleme durumu — spinner yerine skeleton**
```scss
.skeleton { animation: pulse 1.4s ease-in-out infinite; }  /* opacity 1↔0.4, GPU-dostu */
@keyframes pulse { 50% { opacity: 0.4; } }
@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
```
Skeleton yüksekliği gerçek içerikle aynı (layout shift önlemi). Filtre/sekme yenilemelerinde tam spinner yerine mevcut listeyi `opacity: 0.5–0.6 + pointer-events: none, transition: opacity 150ms ease` ile soluklaştır; tam spinner/skeleton yalnız ilk mount'ta. **Progress barları** için ortak `<ProgressBar>` bileşeni: `transform: scaleX() + transform-origin: left + transition: transform 240ms cubic-bezier(0.23, 1, 0.32, 1)` — asla `transition-all + width`, 300ms altı.

**Genişleyen bölüm (accordion)** için height/max-height animasyonu KULLANMA; `display: grid; grid-template-rows: 0fr → 1fr, 200ms cubic-bezier(0.23, 1, 0.32, 1)` + iç `overflow: hidden`. **Native `prompt/confirm/alert`** her yerde `useToast()` + `modal-pop`'lu onay modaline taşınmalı.

---

## Dosya Envanteri: components (common - layout)

Bu bölüm `components/` ağacının paylaşılan bileşen katmanını (common, common/datatable, crm, dashboard, form-fields, layout ve iki kök banner) dosya-dosya inceler. Toplam 110 bulgu 45 dosyaya dağılıyor. Bu bileşenler tek noktadan onlarca view'ı beslediği için buradaki her düzeltme çarpan etkisiyle tüm uygulamaya yayılır; tersine, buradaki her eksik de her yerde görünür. Bulguların ezici çoğunluğu üç kök nedende toplanıyor: (1) merkezi Transition kalıpları (`dropdown`, `fade`, `modal`) hazır olmasına rağmen bileşenlerin yarısında hiç sarılmamış olması, (2) `transition: all` ve layout-tetikleyen property (`left`, `width`, `top`) animasyonlarının yaygınlığı, (3) `:active` basma geri bildirimi ve `@media (hover: hover)` korumasının sistematik yokluğu.

### En Sorunlu 5 Dosya

Aşağıdaki beş dosya hem bulgu yoğunluğu hem de görünürlük/kritiklik açısından önceliklidir; bu alanın çürük kalbi buralarda:

1. **`components/common/ConfirmDialog.vue` (+ merkez modal ailesi)** — Projenin en yaygın ve en görünür animasyon eksiği. Modal + backdrop hiçbir Transition olmadan `v-if` ile anında belirip anında yok oluyor (exit sıfır); aynı boşluk ~28 inline view modalında ve tüm EditModal'larda tekrarlıyor. Silme onayı gibi kritik anlarda diyalog "pat" diye açılıyor, yarı-saydam siyah backdrop flaş gibi vuruyor. Ayrıca Escape ile kapatma ve focus yönetimi de yok.
2. **`components/layout/ToastContainer.vue`** — İki ayrı P1: (a) `TransitionGroup` kullanılmış ama `.toast-move` sınıfı ve `.toast-leave-active { position: absolute }` tanımsız — bir toast kapanınca kalanlar zıplıyor (Sonner mekansal tutarlılığı tümden kırık); (b) mobilde `bottom-6` toast'ı MobileTabBar'ın üzerine bindiriyor, kritik aksiyon toast'ı tab bar ardında kayboluyor. Uygulamanın en görünür geri bildirim yüzeyi.
3. **`components/dashboard/charts/BaseChart.vue`** — Tek P1 dört chart tipini birden düzeltir. ECharts default 1000ms çizim animasyonu devrede ve `notMerge: true` yüzünden her filtre değişiminde baştan oynuyor; dashboard "oyuncak" hissi veriyor. Üstüne `loading` prop'u ölü kod — yükleme geri bildirimi hiç yok.
4. **`components/dashboard/layout/SlideOverPanel.vue`** — Aynı görsel konsept (sağdan drawer) iki ayrı mekanizma/süre/eğri konuşuyor (bu bileşen 400ms Vue Transition, QuickCreateDrawer 250ms class-toggle). Ayrıca çift animasyon mekanizması (`:class="visible"` + Vue Transition) aynı elemanı yönetip cascade yarışına giriyor; 400ms simetrik ease-in-out hantal.
5. **`components/common/datatable/DataTableToolbar.vue`** — 6 bulgu: Sütunlar dropdown'u animasyonsuz (P1), drawer Material eğrisiyle iOS standardından kopuk, 7 tıklanabilirde `:active` yok, mobilde bottom-sheet yerine sağ drawer, çipler animasyonsuz, reduced-motion yok.

---

### components/SellerKybBanner.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P3 | KYB banner CTA butonu (satır 180) | `transition: opacity 0.15s;` (token'sız, easing'siz), hover'da `opacity: 0.85`, `:active` yok | `transition: opacity $t-base, transform 0.12s ease-out;` + `&:active { transform: scale(0.97); }`. Hover'ı `@media (hover: hover) and (pointer: fine)` bloğuna al (mobilde CTA tam satır, dokunmatik false-positive riski yüksek) |

**Neden:** Hardcoded `0.15s` `$t-base` token setini bypass ediyor, easing belirtilmediği için tarayıcı default'una düşüyor; basılınca hiçbir geri bildirim yok ("UI dinliyor" hissi eksik).

### components/SellerTrialBanner.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P3 | Trial banner linki hover mikro-etkileşimi (satır 59) | `&:hover { underline + arrow translateX(2px) }` — hover media query koruması ve `:active` yok | `&:hover` bloğunu `@media (hover: hover) and (pointer: fine)` içine taşı; `&:active { transform: scale(0.99); transition: transform 0.12s ease-out; }` (geniş eleman, 0.97 yerine 0.99 yeterli) |

**Neden:** Dokunmatikte tap sonrası hover state yapışıp kalıyor (sticky underline + kaymış ok).

### components/common/ConfirmDialog.vue

Bu dosya tek başına projenin en yaygın modal ailesinin temsilcisi. Buradaki dört bulgunun üçü doğrudan ConfirmDialog'a, biri (aile bulguları) tüm merkez modallara yayılır.

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P1 | Onay diyaloğu modal + backdrop (satır 4) | `Teleport` içinde çıplak `v-if="open"` — hiçbir Transition yok; modal ve backdrop anında belirip anında kayboluyor | İçeriği `<Transition name="confirm">` ile sar. `.confirm-enter-active { transition: opacity 200ms cubic-bezier(0.23,1,0.32,1); } .confirm-leave-active { transition: opacity 150ms ease; } .confirm-enter-from,.confirm-leave-to { opacity: 0; }`. İç panel: `.confirm-enter-active .modal-card { transition: transform 200ms cubic-bezier(0.23,1,0.32,1); } .confirm-enter-from .modal-card { transform: scale(0.97); }` (modal olduğu için transform-origin center; scale(0)'dan DEĞİL 0.97'den başla) |
| P1 | **[Aile bulgusu]** Merkez modal ailesi giriş/çıkış animasyonu (ConfirmDialog + tüm EditModal + ~28 inline view modalı) | `<div v-if="open" class="fixed inset-0 bg-black/50 ...">` çevresinde hiçbir Transition yok. Aynı durum HeroSlideEditModal.vue:3, NoticeEditModal.vue:2, ShowcaseTileEditModal.vue:2, RoleProfileEditModal.vue:3 ve SellerCategoriesView/MyCertificationsView/SellerVerificationQueueView'da tekrarlıyor | `animations.scss`'e ortak kalıp: `.modal-enter-active,.modal-leave-active{transition:opacity 200ms ease} .modal-enter-active .modal-box,.modal-leave-active .modal-box{transition:transform 200ms cubic-bezier(0.23,1,0.32,1),opacity 200ms ease} .modal-enter-from,.modal-leave-to{opacity:0} .modal-enter-from .modal-box,.modal-leave-to .modal-box{opacity:0;transform:scale(0.96)}`. Çıkış 160ms'e düşürülebilir |
| P1 | **[Aile bulgusu]** Modal backdrop'ları fade olmadan anında beliriyor (siyah flaş) | `bg-black/50` `v-if` ile anında %100 opaklıkta. HeroSlideEditModal.vue:310, NoticeEditModal.vue:176, ShowcaseTileEditModal.vue:285, RoleProfileEditModal.vue:211 hepsi aynı. Karşıt örnek: SidePanel.vue:3 backdrop'u `<Transition name="fade">` ile yumuşuyor | Ortak modal Transition kalıbının `.modal-enter-active{transition:opacity 200ms ease}` + `.modal-enter-from{opacity:0}` kısmı backdrop'u da kapsar. Tüm merkez modallar Teleport + `<Transition name="modal">` ile sarılmalı; backdrop 180-200ms ease fade almalı |
| P2 | Diyalog klavye davranışı — Escape ile kapama (satır 2) | Escape handler ve focus yönetimi yok; kapatma yalnız backdrop tık veya Vazgeç butonu; açılışta odak taşınmıyor, arka plan Tab ile gezilebilir | `watch(() => props.open, ...)` ile açıkken document'a `keydown` ekle: `e.key === 'Escape' → cancel()`; `onUnmounted`'ta kaldır. Açılışta `nextTick` ile iptal butonuna `.focus()` (yıkıcı aksiyonda güvenli varsayılan) |
| P3 | Aksiyon butonları Vazgeç / Onayla (satır 28) | Tailwind `hover:bg-*` var ama transition sınıfı yok, renk değişimi anlık; `:active` yok (2 butonda tekrar) | Her iki butona `transition-colors duration-150 active:scale-[0.97]` ekle; veya scoped: `transition: background-color 150ms ease, transform 120ms ease-out` |

**Emil formatı — modal enter/exit (aile geneli):**

| Önce | Sonra | Neden |
|---|---|---|
| `v-if` ile anında pop, exit sıfır | `<Transition name="modal">` + `opacity 200ms` (backdrop) + `transform: scale(0.96)→1, 200ms cubic-bezier(0.23,1,0.32,1)` (panel), çıkış 160ms | Aynı tip bileşenler aynı animasyon dilini konuşmalı; ani pop/kayboluş premium hissi kırar ve mekansal bağlamı koparır. Modal "ara sıra" görülen eleman — standart enter/exit hak eder |

### components/common/AppSelect.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P3 | Dropdown klavye navigasyonunda aktif seçeneğin görünürlüğü (satır 111) | `openAndMove()` activeIndex'i değiştiriyor ama `scrollIntoView` yok; panel `max-height: 280px` + `overflow-y: auto` — uzun listede aktif seçenek görünmez alanda kalıyor | `openAndMove()` sonunda `nextTick(() => panelEl.value?.children[activeIndex.value]?.scrollIntoView({ block: 'nearest' }))`. `'nearest'` ani zıplama yapmaz; `smooth` verme (hızlı tuş tekrarında gecikme) |
| P3 | Select tetikleyici butonu (satır 159) | `transition: border-color $t-fast;` — focus-visible box-shadow (0 0 0 3px halka) transition listesinde değil, sıçrayarak açılıyor; `:active` yok | `transition: border-color $t-fast, box-shadow $t-fast;` + `&:active { transform: scale(0.98); transition: border-color $t-fast, box-shadow $t-fast, transform 0.12s ease-out; }`. Chevron `rotate($t-fast)` mevcut ve doğru — dokunma |

### components/common/BaseSegmented.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P1 | Segmented aktif thumb kaydırma (satır 116) | `.seg-thumb { transition: left $t-spring, width $t-spring, opacity $t-base; }` — thumb konumu `left` ve `width` (inline calc %) ile anime ediliyor | Thumb'ı `transform` ile kaydır: sabit genişlik ver, `translateX` kullan. `thumbStyle → { width: calc(100%/count - 4px), transform: translateX(calc(${idx*100}% + ${idx*2}px)), left: 2px }`. CSS: `.seg-thumb { left: 2px; transition: transform 0.25s cubic-bezier(0.4,0,0.2,1), opacity $t-base; will-change: transform; }` |
| P3 | Segment butonları press feedback (satır 84) | `.seg-btn`'de `transition: color $t-slow;`, `:active` yok | `&:active { transform: scale(0.97); }` + `transition: color $t-slow, transform 0.12s ease-out;` (thumb zaten seçimi gösteriyor, ekstra gerekmez) |
| P3 | Thumb kayması için reduced-motion (satır 116) | `prefers-reduced-motion` bloğu yok; thumb her seçimde 0.25s kayıyor (BaseSwitch thumb'ı için de aynı) | `@media (prefers-reduced-motion: reduce) { .seg-thumb { transition: opacity $t-base; } }` — konum anında değişir, opacity yumuşak kalır. BaseSwitch'te `.switch-thumb { transition: none; }` |

**Emil formatı — thumb performansı (satır 116):**

| Önce | Sonra | Neden |
|---|---|---|
| `transition: left, width` (layout property'ler, main thread reflow) | `transition: transform, opacity` (sabit genişlik + translateX, GPU compositor) | Emil kuralı: sadece transform ve opacity anime et. `left`/`width` her frame'de layout+paint zorlar; tab thumb kaydığı anda (etkileşim anında) frame düşme riski. Easing/süre doğru, sorun property seçimi |

### components/common/BaseSwitch.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P3 | Switch track glow geçişi (satır 85) | `transition: background $t-slow;` — `&.on`'daki `box-shadow: 0 0 14px $brand-glow` transition dışı, anında yanıp sönüyor | `transition: background $t-slow, box-shadow $t-slow;`. Alternatif: B2B sadeliği için glow'u kaldırmak (BaseSegmented thumb'ında da aynı `$brand-glow` var; karar ikisinde ortak verilmeli) |

### components/common/ChildTable.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | Satır listesi v-for anahtarı (satır 24) | `<tr v-for="(row, idx) in modelValue" :key="idx">` | `addRow()`'da kalıcı kimlik: `row.__key = crypto.randomUUID()` (backend satırında `row.name` varsa onu kullan); `:key="row.name || row.__key"` |

**Neden:** Index key proje mutlak kuralını (kararlı kimlik) ihlal ediyor; ortadan satır silinince Vue satırları yanlış eşleyip yeniden kullanıyor (input focus/state kayması) ve ileride TransitionGroup eklemeyi imkânsız kılar. Animasyon eklenmese bile kimlik düzeltilmeli.

### components/common/KanbanBoard.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | Kanban kart sürükle-bırak — dokunmatik (satır 28) | HTML5 native drag API (`draggable` + dragstart/dragover/drop) — dokunmatikte tetiklenmez; mobil/tablette status değiştirme akışı ölü | Kart listesini mevcut `vuedraggable 4` (sortablejs, touch destekli) ile değiştir; ya da `<768px`'te kart tıklamasında `.m-sheet` bottom sheet ile "Duruma taşı". Kısa vade: dokunmatikte `draggable=false` + sheet fallback |
| P3 | Kart sürükleme affordance'ı (satır 187) | `cursor: pointer;` — grab/grabbing cursor'ı ve press feedback yok; `.dragging { opacity: 0.5 }` var ama tutma ipucu yok | `:class="{ 'is-draggable': draggable }"` + `&.is-draggable { cursor: grab; &:active { cursor: grabbing; } }`. Opacity düşüşü transition'sız/anlık kalmalı (sürükleme başında gecikme hissettirmemek için) |
| P3 | Kart sürükleme (dragging) durumu (satır 188) | `transition: border-color $t-fast, box-shadow $t-fast;` — `.dragging { opacity: 0.5 }` transition listesinde opacity yok, aniden yarı saydam | `transition: border-color 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease-out;` |

### components/common/GlobalSearch.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | Arama sonuçlarında klavye navigasyonu (satır 18) | Sonuç seçimi yalnız `@mousedown`; ok tuşları/Enter ile gezinme yok (input'ta sadece Escape) | `activeIndex` ref ekle; parent input'tan `keydown.down/.up/.enter`'ı emit köprüsüyle panele ilet (AppSelect'in `openAndMove/onEnter` deseni). Aktif satır: `.active { background: $l-bg-subtle; }` (transition'sız — hızlı gezinen listede anlık geçiş doğru); `activeIndex` değişiminde `el.scrollIntoView({ block: 'nearest' })` |

**Neden:** Global arama günde onlarca kez kullanılan, klavye-ağırlıklı yüzey; yazıp ok tuşuyla inip Enter'la gitmek temel beklenti. Elin fareye gitme zorunluluğu algılanan hızı düşürüyor.

### components/common/LinkInput.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | Link arama dropdown'u — Teleport (satır 27) | animasyon yok — `v-if="show"` ile anında belirir/kaybolur | Teleport içindeki div'i `<Transition name="dropdown">` ile sar. Input altına açıldığı için `transform-origin: top left`. Global yoksa scoped: enter 150ms cubic-bezier(0.23,1,0.32,1) / leave 100ms ease, opacity 0 + translateY(-4px)'ten |
| P3 | Arama sırasında dropdown içeriği (satır 137) | Her tuşta `loading=true` set edilip liste spinner satırıyla değiştiriliyor (debounce 300ms + istek boyunca) — liste→spinner→liste flicker, dropdown boyu zıplıyor | `loading=true` iken `results` temizleme; eski sonuçları göster, listeye `opacity: 0.5 + transition: opacity 0.15s ease`; spinner'ı yalnız `results` boşken tam satır göster |

### components/common/LinkTreePicker.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | `.ltp-pop` dropdown paneli (satır 222) | animasyon yok — `v-if="open"` ile anında; 240-360px yüksekliğinde büyük panel anında belirip kayboluyor | `<div v-if="open" class="ltp-pop">`'u `<Transition name="dropdown">` ile sar. `openUp` durumunda `:style` ile koşullu `transform-origin` (aşağı: `top left`, yukarı: `bottom left`); enter 150ms cubic-bezier(0.23,1,0.32,1), leave 100ms ease, opacity + translateY(∓4px) |
| P3 | Ağaç düğümü genişletme chevron'u (satır 290) | `chevron-right` ↔ `chevron-down` iki ayrı ikon anında swap | Tek `<AppIcon name="chevron-right">` kullanıp döndür: `.ltp-chev-icon { transition: transform 0.15s ease; } .expanded & { transform: rotate(90deg); }` |

### components/common/StatusFilterPills.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | `.status-pill` transition property'si (satır 69) | `transition: all 0.15s;` + scoped blok global `.status-pill`'i (crm.scss:134) hardcoded sarı paletle (`#f5b800`, `#ffd54d`, `var(--th-surface-card, #1e1e2e)`) gölgeliyor | `transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease`. Orta vade: scoped bloğu silip global `.status-pill`'e (`$t-fast` token'lı) devret veya sarı paleti token'a bağla |
| P3 | Pill'lere basma geri bildirimi (satır 74) | `:active` kuralı yok, sadece hover renk | `&:active { transform: scale(0.97); }` + transition listesine `transform 0.12s ease-out` |

**Neden:** `transition: all` yasağı ihlali + `$t-fast` token bypass'ı. Ayrıca scoped tanım marka moru (`$brand`) kullanan global `.status-pill` ile aynı adı taşıyıp farklı (sarı) tema uyguluyor — hover/active geçişleri sayfadan sayfaya farklı kişilikte davranıyor.

### components/common/SourceBadge.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | Feed rozeti focus durumu (satır 71) | `&:focus { outline: none; }` — hiçbir görsel focus geri bildirimi yok | `&:focus { outline: none; }` sil, yerine `&:focus-visible { outline: 2px solid rgba($brand, 0.5); outline-offset: 1px; }` (fare tıklamasında halka çıkmaz, klavyede çıkar) |

**Neden:** Klavye kullanıcısı rozete Tab ile geldiğinde hiçbir gösterge yok — erişilebilirlik açığı. Global `button:focus-visible { outline: none }` sorununun component düzeyinde tekrarı.

### components/common/ListPagination.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P3 | Sayfalama butonları (satır 14) | `:active` press feedback yok (global `.list-pagination-btn` yalnız hover + disabled) | `tables.scss` `.list-pagination-btn`: `&:active:not(:disabled) { transform: scale(0.95); }` + `transform 0.12s ease-out` (32px butonda 0.95 okunur kısılma) |

### components/common/datatable/DataTable.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | Sütun filtre popover'ı (satır 113) | animasyon yok — `<template v-if="openCol">` ile panel ve overlay anında belirir; `w-64` panel için transform-origin yok | Panel div'ini `<Transition name="dropdown">` ile sar (overlay ayrı `<Transition name="fade">`). `transform-origin`: `col.align === 'right'` ise `top right`, değilse `top left`. enter 150ms cubic-bezier(0.23,1,0.32,1) opacity + scale(0.98), leave 100ms ease |

**Neden:** Popover kategorisi 125-200ms enter ister; panel anında belirince "nereden geldiği" mekansal bilgisi kayboluyor.

### components/common/datatable/CategoryTreePicker.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P3 | Kategori seçim modalı enter/exit (satır 223) | `.dt-modal transition: opacity $t-base` (0.15s ease) — panel ve backdrop düz fade, scale hissi yok | Panel div'ine `.dt-panel` ver: `.dt-modal-enter-active .dt-panel { transition: transform 0.2s cubic-bezier(0.23,1,0.32,1); } .dt-modal-leave-active .dt-panel { transition: transform 0.12s ease; } .dt-modal-enter-from .dt-panel,.dt-modal-leave-to .dt-panel { transform: scale(0.97); }`. Backdrop fade leave süresini 0.12s'e indir |
| P3 | Ağaçta gezinirken yükleme durumu (satır 71) | Her drill-down/breadcrumb tıklamasında liste tümden silinip ortada spinner (loading/searching → tüm içerik yer değiştirir) — flicker | Yüklenirken eski listeyi DOM'da tut, dim uygula: `:class="{ 'is-loading': loading }"` + `.is-loading { opacity: 0.45; pointer-events: none; transition: opacity 0.15s ease; }`. Spinner'ı yalnız `items` boşken göster |
| P3 | Modal içi liste satırları, breadcrumb, kapat butonu hover'ları (satır 84) | `hover:bg-gray-50` / `hover:text-*` Tailwind sınıfları transition'sız — 5+ yerde (satır 20, 33, 44, 84, 103) | İlgili button'lara Tailwind `transition-colors` (150ms ease, yalnız renk property'leri — `transition: all` riski yok) |

### components/common/datatable/DataTableToolbar.vue

En sorunlu 5 dosyadan biri. Altı bulgu — dropdown, drawer, press feedback, mobil kalıp, çip ve reduced-motion.

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P1 | Sütunlar dropdown menüsü (satır 41) | animasyon yok — `v-if`/template ile anında açılıp kapanıyor (satır 39-63), Transition sarmalayıcı yok | Paneli `<Transition name="dropdown">` ile sar (global kalıp `animations.scss`'te hazır). Sağa hizalı olduğu için `transform-origin: top right`; scale varyantı: `enter-from { opacity: 0; transform: translateY(-4px) scale(0.97); } transition: transform 150ms cubic-bezier(0.23,1,0.32,1), opacity 150ms ease-out; leave 100ms` |
| P2 | Filtre çekmecesi (dt-drawer) kayma (satır 217) | `aside { transition: transform $t-spring; }` → 0.25s cubic-bezier(0.4,0,0.2,1), giriş/çıkış simetrik (Material) | `.dt-drawer-enter-active aside { transition: transform 300ms cubic-bezier(0.32,0.72,0,1); } .dt-drawer-leave-active aside { transition: transform 220ms cubic-bezier(0.32,0.72,0,1); }` (iOS curve, m-sheet ile hizalı, çıkış hızlı). Backdrop opacity `$t-base` kalabilir |
| P2 | Toolbar'daki tüm tıklanabilirler (satır 67) | `:active` scale hiçbirinde yok — 7 yerde (Sütunlar, Filtreler, arama temizle, çip kapatma, drawer kapat, Tüm filtreleri temizle) | Ana butonlara `&:active { transform: scale(0.97); }` + `transition: transform 140ms cubic-bezier(0.23,1,0.32,1)` (ideali global `.hdr-btn-outlined` seviyesinde). Küçük ikon butonlarda (çip x, arama x) scale yerine renk değişimi yeterli |
| P3 | Filtre çekmecesi — mobil davranış (satır 117) | Mobilde de sağdan kayan drawer: `w-[380px] max-w-[92vw]`, her ekranda aynı | `<768px`'te alta al: `bottom-0 inset-x-0 h-auto max-h-[85vh] rounded-t-2xl` + `transform: translateY(105%)` başlangıç; `transition: transform 260ms cubic-bezier(0.32,0.72,0,1)`. Alternatif: `.m-sheet` transition adını mobilde koşullu kullan |
| P3 | Aktif filtre çipleri (satır 90) | animasyon yok — `v-for` span'lar filtre değişince anında belirir/kaybolur, çip kalkınca komşular zıplar | `TransitionGroup name="chip"` + `.chip-enter-from/.chip-leave-to { opacity: 0; transform: scale(0.95); } .chip-enter-active { transition: opacity 120ms ease-out, transform 120ms ease-out; } .chip-leave-active { transition: opacity 100ms, transform 100ms; position: absolute; } .chip-move { transition: transform 150ms ease; }` |
| P3 | dt-drawer reduced-motion (satır 213) | `prefers-reduced-motion` yok; `translateX(100%)` kayma her durumda | `@media (prefers-reduced-motion: reduce) { .dt-drawer-enter-active aside,.dt-drawer-leave-active aside { transition: none; } .dt-drawer-enter-from aside,.dt-drawer-leave-to aside { transform: none; } }` — opacity fade kalır |

### components/common/datatable/EditableCell.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | Kalem ikonu — düzenleme affordance'ı (satır 27) | `opacity-0 group-hover:opacity-60 transition-opacity` — yalnız hover'da görünür; dokunmatikte `group-hover` tetiklenmez, mobilde kalem hiç görünmez | Scoped: `.edit-icon { opacity: 0.45; transition: opacity 150ms ease; } @media (hover: hover) and (pointer: fine) { .edit-icon { opacity: 0; } .group:hover .edit-icon { opacity: 0.6; } }` — dokunmatikte ikon hafif görünür kalır |
| P3 | Hücre commit geri bildirimi (satır 65) | `commit()` sonrası görsel geri bildirim yok — input kapanır, değer sessizce değişir | Tek seferlik sınıf: `.cell-flash { animation: cellFlash 600ms ease-out; } @keyframes cellFlash { from { background: rgba(16,185,129,0.12); } to { background: transparent; } }`; `animationend`'de kaldır. Hata dönerse `$c-error` ile aynı kalıp |

### components/crm/ActivityTimeline.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | Aktivite zaman çizelgesi yükleme (satır 3) | Ortada tek spinner (`AppIcon loader animate-spin`, `py-6`); yüklenince timeline aniden belirir, yükseklik ~40px'ten tam listeye zıplar (layout shift) | 3 skeleton satırı render et (daire 22px + 2 metin çubuğu) timeline geometrisiyle aynı padding'de. Shimmer: `background: linear-gradient(90deg, rgba(0,0,0,0.05) 25%, rgba(0,0,0,0.09) 50%, rgba(0,0,0,0.05) 75%); background-size: 200% 100%; animation: shimmer 1.4s linear infinite; @keyframes shimmer { to { background-position: -200% 0; } }` (sabit hareket, linear doğru) |

### components/crm/CrmListToolbar.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | Arama input'u focus geçişi (satır 14) | `transition-all` (transition: all 150ms cubic-bezier(0.4,0,0.2,1)) — focus'ta yalnız border-color ve box-shadow değişiyor ama `all` layout property'lerini de kapsar | `transition-all` kaldır, `transition-[border-color,box-shadow] duration-150`; ya da scoped: `input { transition: border-color 0.15s ease, box-shadow 0.15s ease; }` |

### components/crm/QuickCreateDrawer.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | Drawer klavye etkileşimi — Escape (satır 2) | Escape handler yok; kapatma yalnız overlay tık ve X/İptal; focus trap yok, Tab arka plana kaçar | `watch(() => props.modelValue, open => { open ? document.addEventListener('keydown', onKey) : document.removeEventListener('keydown', onKey) })` + `onUnmounted` temizliği; `onKey: e.key === 'Escape' && close()`. Açılışta drawer içine focus taşı |
| P3 | Drawer açıkken arka plan scroll kilidi (satır 41) | Body scroll lock yok; overlay açıkken sayfa arkada kayabiliyor | `watch(() => props.modelValue, open => { document.documentElement.style.overflow = open ? 'hidden' : ''; })` + `onUnmounted`'ta sıfırla |
| P3 | Mobil davranış — TaxonomySettings drawer'ı (satır 4) | Mobilde de sağdan kayan `min(460px, 92vw)` drawer; `<768px` için `.m-sheet` kullanılmıyor | `<768px`'te `.crm-drawer`'ı alt sheet'e çevir: `top: auto; bottom: 0; left: 0; right: 0; width: 100%; max-height: 85dvh; transform: translateY(105%); transition: transform 0.26s cubic-bezier(0.32,0.72,0.35,1); border-radius: 16px 16px 0 0;` — m-sheet değerleriyle birebir |

### components/crm/CommentBox.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P3 | Yorum gönder butonu saving durumu (satır 13) | Metin "Ekle" → "Gönderiliyor..." aniden değişiyor; spinner yok, buton genişliği metinle zıplar (yanındaki mention ipucunu iter) | `send` ikonunu saving'de `loader` (class="animate-spin") ile değiştir + butona `min-width: 120px`; metin geçişini yumuşatmak için span'a `transition: opacity 0.15s ease` + `:key`. Büyük animasyon gerekmez |

### components/crm/UserPicker.vue

Beş bulgu; dropdown ailesinin tutarsızlık örneği.

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P1 | Kullanıcı seçim dropdown paneli (satır 15) | `v-if="open"` ile animasyonsuz mount/unmount; hiçbir Transition yok. AppSelect/AppHeader global `dropdown` kalıbını kullanırken UserPicker kullanmıyor | Paneli global kalıpla sar: `<Transition name="dropdown"><div v-if="open" ...></div></Transition>` (enter opacity 0→1 + translateY(-4px)→0, 0.15s; leave 0.1s). Panel absolute olduğu için ek transform-origin gerekmez; scale eklenirse `transform-origin: top` (asla center) |
| P2 | Tetikleyici buton transition property (satır 5) | `class="... hover:border-brand-300 transition-all"` — hover'da yalnız border rengi değişirken tüm property'ler animasyona bağlı; Tailwind CDN default 150ms cubic-bezier(0.4,0,0.2,1) token'larla hizalı değil | `transition-all` kaldır, scoped: `transition: border-color 0.15s ease, background-color 0.15s ease;`. Tailwind'de kalınacaksa `transition-colors duration-150` |
| P2 | Tetikleyici + seçenek satırları basma geri bildirimi (satır 3) | animasyon yok — `:active`'de scale/background feedback yok (3 yerde) | Tetikleyici: `&:active { transform: scale(0.98); }` + `transform 0.12s ease-out`. Liste satırlarında scale yerine `active:bg-gray-100 dark:active:bg-white/10` (satır scale'i listede taşma yapar) |
| P3 | Tetikleyicideki chevron-down (satır 13) | animasyon yok — ikon açık/kapalı sabit | `:class="['text-gray-400 transition-transform duration-200', open ? 'rotate-180' : '']"`; SCSS tercihinde `transition: transform 0.2s cubic-bezier(0.23,1,0.32,1)` |
| P3 | Seçenek satırları hover — dokunmatik (satır 36) | `hover:bg-brand-50`/`hover:bg-gray-50`, `(hover: hover)` koruması yok (2 yerde); seçili satır vurgusuyla aynı renk olduğu için yanlış seçim algısı | Hover'ı scoped SCSS'e taşı: `@media (hover: hover) and (pointer: fine) { .picker-option:hover { background: rgba($brand, 0.06); } }` (Tailwind CDN hover varyantı media-gate'lenemez) |

### components/dashboard/charts/BaseChart.vue

En sorunlu 5 dosyadan biri. Tek P1 dört chart tipini birden düzeltir.

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P1 | Tüm dashboard grafikleri ilk çizim + filtre animasyonu (satır 44) | Hiçbir option'da `animation`/`animationDuration` yok; ECharts default devrede (animation: true, 1000ms). `useChart` her değişimde `setOption(newOption, { notMerge: true })` çağırıyor — filtre değişiminde 1000ms baştan oynuyor; lazy IntersectionObserver ile her grafik scroll'da tek tek 1sn dans ediyor | Her option'a merge et: `{ animationDuration: 200, animationEasing: "cubicOut", animationDurationUpdate: 200, animationEasingUpdate: "cubicOut", ...props.option }`. Reduced-motion: `const rm = window.matchMedia("(prefers-reduced-motion: reduce)"); rm.matches → animation: false`. En sade: `animation: false` (B2B için kabul edilebilir) |
| P2 | Grafik yükleme durumu / ölü `loading` prop (satır 23) | `loading: { type: Boolean, default: false }` tanımlı ama template'te ve useChart'ta hiç kullanılmıyor — ölü prop; yükleme sırasında alan boş, veri gelince aniden belirir | Ya prop'u sil ya da bağla. Skeleton: `v-if="loading"` ile chart yüksekliğiyle aynı boyutta shimmer div (`background-position` keyframe 1.2s linear); skeleton→chart geçişi `opacity 200ms cubic-bezier(0.23,1,0.32,1)`. Alternatif: ECharts native `showLoading`'i `watch(() => props.loading, ...)` ile bağla (marka renkli hafif spinner) |

**Emil formatı — chart animasyonu (satır 44):**

| Önce | Sonra | Neden |
|---|---|---|
| ECharts default 1000ms + her filtrede `notMerge: true` ile baştan | `animationDuration: 200 + animationDurationUpdate: 200 + cubicOut`, reduced-motion'da `false` | B2B kalibrasyonu: chart ilk çizim kısa/kapalı olmalı; 1sn UI kuralının (300ms altı) çok üstünde. "Tablo/chart her filtrede yeniden animasyonlanmamalı" ilkesinin doğrudan ihlali; dashboard "oyuncak" hissi veriyor. Canvas ayrıca reduced-motion'dan etkilenmiyor |

### components/dashboard/SellerPicker.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | Satıcı arama dropdown'ı (satır 63) | `v-if` ile anında mount/unmount; hazır global `dropdown` kalıbı kullanılmamış; `w-72, max-h-72` geniş panel, transform-origin yok | `<Transition name="dropdown">` ile sar + `.seller-picker-dropdown { transform-origin: top right; }` (right-0 hizalı). İsteğe bağlı enter easing `cubic-bezier(0.23,1,0.32,1)` |
| P3 | Satıcı chip'i + tetikleyici + seçenek butonları basma feedback (satır 4) | `:active` hiçbir butonda yok; yalnız `transition-colors` + hover bg (4 buton tipinde) | `.seller-picker > button { transition: background-color 0.15s ease, transform 0.12s cubic-bezier(0.23,1,0.32,1); &:active { transform: scale(0.97); } }`. Liste satırlarına scale gerekmez |
| P3 | Arama sırasında dropdown yükleme (satır 209) | `loading=true` debounce'tan (250ms) ÖNCE set; sonuç listesi `v-else` ile DOM'dan kalkıp spinner satırı geliyor — her tuşta liste zıplıyor (layout shift + flicker) | Spinner'ı listenin yerine değil input içindeki search ikonunun yerine koy: `loading ? 'fa-spinner fa-spin' : 'fa-search'`. Mevcut sonuçlar fetch dönene kadar kalsın (stale-while-loading), istenirse `opacity: 0.6 + transition: opacity 0.15s ease`; loading dalı yalnız "ilk açılış + henüz sonuç yok"ta |

### components/dashboard/dynamic/DynamicQuickLinks.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | Hızlı erişim kart-linkleri (satır 11) | `:active` yok; sadece `transition-colors` + `hover:bg-gray-50`. Mobilde 2'li grid'de birincil dokunma yüzeyi | `.ql-item { transition: background-color 0.15s ease, transform 0.12s cubic-bezier(0.23,1,0.32,1); &:active { transform: scale(0.98); } }` — `transition-colors` sınıfı kaldırılıp transition tek yerden yönetilmeli |
| P3 | Kart-link hover stilleri (satır 15) | `hover:bg-gray-50 dark:hover:bg-white/5` media koruması yok; dokunmatikte sticky hover | `@media (hover: hover) and (pointer: fine) { .ql-item:hover { background: rgba(0,0,0,0.03); } html.dark .ql-item:hover { background: rgba(255,255,255,0.05); } }` |

### components/dashboard/dynamic/DynamicLineChart.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P3 | Masked (yetkisiz) placeholder line chart (satır 14 / 68) | `placeholderChart` option'ında `animation` yok — `blur(4px)` + `opacity 0.3` arkasında sahte veri ECharts default 1000ms ile çiziliyor; görünmeyen grafiği canvas animasyonu + `filter: blur` ile çizmek boşa GPU/paint | `placeholderChart` option'ına `animation: false` ekle. İdeali: maskeli durumda ECharts yerine hafif statik SVG/CSS placeholder |

### components/dashboard/dynamic/DynamicBarChart.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P3 | Bar chart konteyner yüksekliği (satır 27) | `chartHeight = rows.length * 34 + 56` (140-280px) — filtre değişiminde satır sayısı değişince inline height anında değişip altındaki grid'i kaydırıyor (layout shift) | Yüksekliği kademelere yuvarla: `rows <= 3 → 160px`, `<= 6 → 220px`, üstü `280px`. Height transition EKLEME (`transition: height` layout tetikler); kademeleme + ResizeObserver yeterli |

### components/dashboard/filters/GlobalFilterBar.vue

Altı bulgu; dashboard'ın en sık kullanılan gezinme yüzeyi (7 statik dashboard'un tamamında üstte).

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | Modül sekmeleri + tarih preset butonları transition property (satır 152) | `.th-module-tab { transition: all 150ms cubic-bezier(0.4,0,0.2,1) }` + `.th-tab-btn` (dashboard.scss:518) `transition: all var(--th-duration-fast)` — 2 yerde; `:active` yok | Her ikisinde: `transition: background-color 150ms ease, color 150ms ease, box-shadow 150ms ease` + `&:active { transform: scale(0.97); }` + `transform 120ms ease-out`. `font-weight`/`padding` transition dışı kalmalı (active'de 500→600 jitter riski) |
| P2 | Cross-filter chip'leri (satır 33) | `v-if="crossFilterStore.hasFilters"` + `v-for` animasyonsuz; chip silinince komşular geçişsiz kayar | `<TransitionGroup name="chip" tag="div">`: `.chip-enter-active { transition: opacity 150ms cubic-bezier(0.23,1,0.32,1), transform 150ms cubic-bezier(0.23,1,0.32,1); } .chip-leave-active { transition: opacity 100ms ease, transform 100ms ease; position: absolute; } .chip-enter-from,.chip-leave-to { opacity: 0; transform: scale(0.95); } .chip-move { transition: transform 150ms cubic-bezier(0.23,1,0.32,1); }` (asla scale(0)'dan) |
| P2 | Tıklanabilirlerde `:active` (dilim geneli) (satır 21) | Hiçbir tıklanabilirde `:active` scale yok: preset (21), modül sekme (5), chip kapatma (41), tümünü temizle (48), SlideOverPanel kapat (24), WidgetWrapper retry (26) — 6 yüzeyde | Ortak kural (dashboard.scss): `.th-tab-btn:active,.th-module-tab:active,.th-retry-btn:active { transform: scale(0.97); }` + `transform 120ms cubic-bezier(0.23,1,0.32,1)`. Küçük ikon butonlar (chip/panel kapat) için `scale(0.92)` |
| P3 | Modül sekmesi hover — dokunmatik (satır 155) | `.th-module-tab:hover { color: #374151; background: rgba(108,93,211,0.04) }` media koruması yok; şerit mobilde `overflow-x: auto`, sticky hover | `@media (hover: hover) and (pointer: fine) { .th-module-tab:hover { ... } }` (dark dahil; `.th-tab-btn:hover` için de) |

### components/dashboard/layout/WidgetWrapper.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P1 | Widget yükleme durumu — tüm dashboard widget'ları (satır 15) | `fa-spinner fa-spin` + "Yükleniyor" (`th-widget-loading`, min-height 200px); loading→content ani `v-if/v-else` swap. Her açılışta 8+ widget aynı anda spinner | Spinner yerine widget tipine uygun skeleton: `.th-skeleton { background: var(--th-surface-elevated); border-radius: 6px; position: relative; overflow: hidden; }` + `::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent); transform: translateX(-100%); animation: shimmer 1.4s linear infinite; } @keyframes shimmer { to { transform: translateX(100%); } }`. İçerik gelişini `<Transition name="fade">` veya `fadeIn 150ms cubic-bezier(0.23,1,0.32,1)` ile yumuşat |
| P2 | Yükleme → içerik geçişi (satır 15) | loading/error/empty/content `v-if`/`v-else-if` ile animasyonsuz takas; spinner→boş an→büyüyerek gelen grafik (üç aşamalı dikkat dağıtıcı) | Durum konteynerlerini `<Transition name="fade" mode="out-in">` ile sar (mevcut fade `opacity 0.2s ease`). Grafik animasyonu 200ms'e çekilince toplam geçiş akıcı. Reduced-motion'da fade korunur |
| P3 | Boş durum (empty state) — sert takas (satır 32) | `.th-widget-empty` `v-else-if` ile anında; `fa-inbox` ikonu ve metin animasyonsuz | Yukarıdaki `<Transition name="fade" mode="out-in">` boş durumu da kapsar. Empty ikonu için Tailwind preflight `svg { display:block }` tuzağı — ortalama `text-align:center` ile değil flex/margin-auto ile |

### components/dashboard/widgets/KpiCard.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | Hover davranışı — class çarpışması (satır 2) | `cards.scss:36-38` legacy `.kpi-card:hover { transform: translateY(-1px); box-shadow: 0 4px 20px }`; `dashboard.scss:342` sonra yüklendiği için transition listesi `box-shadow` ile ezilmiş — `transform` listede YOK, gölge 250ms yumuşarken kart 1px anında zıplar | `cards.scss`'teki legacy `transform: translateY(-1px)` satırını kaldır (th-widget sistemi zaten box-shadow hover'i veriyor). Lift kesin isteniyorsa `dashboard.scss:342`'ye açıkça ekle: `transition: box-shadow 250ms cubic-bezier(0.4,0,0.2,1), transform 150ms cubic-bezier(0.23,1,0.32,1)`. B2B için önerilen: transform'u tümden kaldır |
| P2 | Giriş animasyonu — fadeUp + nth-child stagger (satır 2) | `animation: fadeUp 0.35s ease both` + `nth-child(1..4)` 0.06s stagger — modül sekmeleri arası her geçiş view'i remount ettiği için KPI kartları her sekme değişiminde yeniden fade-up oynar; 0.35s 300ms üstünde; nth-child grid'in TÜM çocuklarına göre indeksli (kırılgan) | Süreyi kısalt + tek sefere indir: `fadeUp 0.25s cubic-bezier(0.23,1,0.32,1) both`; stagger'ı `nth-of-type`'a çevir ya da kaldır; yalnız ilk mount'a bağla (`.first-load .kpi-card { animation: ... }`) veya keyframe'i sil. `prefers-reduced-motion: reduce`'da `animation: none` |

### components/dashboard/layout/SlideOverPanel.vue

En sorunlu 5 dosyadan biri. Çift mekanizma, iki farklı drawer dili, reduced-motion yok.

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P1 | **[Aile]** İki farklı slide-over drawer ayrı mekanizma/süre/eğri | SlideOverPanel: `<Transition name="slide-over">` + scoped, transform 400ms (`--th-duration-slow`) `var(--th-ease-standard)`. QuickCreateDrawer (crm.scss:689): class-toggle `.crm-drawer{transition:transform $t-spring}` = 0.25s cubic-bezier(0.4,0,0.2,1). İkisi de sağdan panel ama biri Vue Transition biri class toggle, biri 400ms biri 250ms | Tek drawer dili: `$t-drawer: 320ms cubic-bezier(0.32,0.72,0,1)` token'ı `variables.scss`'e ekle (m-sheet eğrisiyle uyumlu), her iki drawer'da kullan |
| P2 | Çift animasyon mekanizması (satır 3) | Hem `<Transition name="slide-over">` scoped sınıfları (79-94) hem `:class="{ visible }"` + global `.th-slide-overlay/.th-slide-panel .visible` (dashboard.scss:548-586) aynı elemanı anime ediyor — aynı özgüllükte cascade yarışı | `:class="{ visible }"` binding'lerini (satır 7, 10) kaldır, `.visible` bloklarını sil; yalnız Vue Transition yönetsin. Base `.th-slide-overlay { opacity: 0 }` / `.th-slide-panel { transform: translateX(100%) }` başlangıç değerlerini kaldırıp normal duruma `opacity: 1 / translateX(0)` bırak |
| P2 | Panel süre/easing (satır 85) | `transition: transform var(--th-duration-slow) var(--th-ease-standard)` = 400ms cubic-bezier(0.4,0,0.2,1); giriş/çıkış simetrik, ease-in-out (yavaş kalkış) | Giriş: `transform 320ms cubic-bezier(0.32,0.72,0,1)`; çıkış: `.slide-over-leave-active .th-slide-panel { transition: transform 240ms cubic-bezier(0.32,0.72,0,1); }`. Backdrop leave 200ms'e düşür |
| P2 | **[Aile]** Modal/drawer ailesi reduced-motion kapsamında değil (satır 80) | SlideOverPanel 400ms transform, guard yok; global dropdown/fade/modal de muaf; yalnız m-sheet ve sidebar guard'lı | `animations.scss` sonu: `@media(prefers-reduced-motion:reduce){.modal-enter-active .modal-box,...,.dropdown-enter-active,.dropdown-leave-active{transition-duration:1ms!important;transform:none!important}}`. SlideOverPanel scoped: `@media(prefers-reduced-motion:reduce){.slide-over-enter-active .th-slide-panel,...{transition:none;transform:none}}` (opacity korunur) |
| P3 | prefers-reduced-motion (panel slide + KPI fadeUp) (satır 80) | Ne slide-over ne `.kpi-card` fadeUp reduced-motion'da kapatılıyor | `@media(prefers-reduced-motion:reduce){.slide-over-enter-active .th-slide-panel,.slide-over-leave-active .th-slide-panel{transition:opacity 150ms ease}.slide-over-enter-from .th-slide-panel,.slide-over-leave-to .th-slide-panel{transform:none;opacity:0}}` + `cards.scss` `.kpi-card { animation: none; }` |

### components/form-fields/CoreDocTypePicker.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P1 | Veri kaynağı değişikliği onay modalı (satır 54) | `v-if="modal.open"` ile animasyonsuz — Transition yok, backdrop fade yok, exit yok | Overlay'i `<Transition name="modal-pop">` ile sar. `.modal-pop-enter-active,.modal-pop-leave-active { transition: opacity 200ms cubic-bezier(0.23,1,0.32,1); } .modal-pop-enter-active > div,.modal-pop-leave-active > div { transition: transform 200ms cubic-bezier(0.23,1,0.32,1), opacity 200ms; } .modal-pop-enter-from,.modal-pop-leave-to { opacity: 0; } .modal-pop-enter-from > div,.modal-pop-leave-to > div { transform: scale(0.96); }`. Çıkış 150ms; transform-origin center; reduced-motion'da transform kaldır |
| P2 | DocType arama sonuç dropdown'ı (satır 27) | `v-if="show"` ile animasyonsuz | Sonuç panelini `<Transition name="dropdown">` ile sar (mevcut global kalıp, ek CSS gerekmez; translateY(-4px) origin'i sağlar) |
| P3 | Modal footer butonları (Vazgeç / Devam) + kapatma (satır 107) | `hover:bg-white/5`, `hover:bg-brand-600` var ama transition property yok — renk anlık; `:active` yok | İkisine `transition-colors` (150ms ease) + `&:active { transform: scale(0.97); transition: transform 120ms ease-out; }` |

### components/form-fields/IconPickerField.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P1 | İkon seçim modalı (satır 53) | `v-if="isOpen"` ile animasyonsuz — Transition yok, backdrop fade yok, exit yok; büyük modal (`max-w-2xl`, 54 ikonluk grid) | CoreDocTypePicker ile aynı `modal-pop` kalıbı: overlay `opacity 200ms cubic-bezier(0.23,1,0.32,1)`, panel `scale(0.96)→scale(1)` + opacity, leave 150ms. Kalıp `animations.scss`'e tek sefer eklenip iki dosyada paylaşılabilir |
| P2 | Modal içi ikon grid butonları — 54 adet (satır 132) | `class="... transition-all hover:scale-105"` — `:active` yok, hover media guard yok | `transition: transform 150ms ease, background-color 150ms ease, border-color 150ms ease;` hover scale'i `@media (hover: hover) and (pointer: fine)` arkasına al; `:active { transform: scale(0.97); transition-duration: 120ms; }` |
| P3 | Modal kapatma (x) butonu + transition'sız hover'lar (satır 77) | close butonu `hover:bg-white/10` transition yok (kategori chip'lerinde `transition-colors` var) — aynı modalda tutarsız | Close butonuna `transition-colors` (150ms ease) + `:active { transform: scale(0.95); }` 120ms ease-out |
| P3 | Modalın mobil davranışı (satır 54) | Tüm kırılımlarda ortalanmış modal (`fixed inset-0 + p-4, max-h-[80vh]`); `.m-sheet` kullanılmıyor | `<768px` için modal gövdesini alt kenara sabitle + m-sheet transition: `transform 260ms cubic-bezier(0.32,0.72,0,1)`, enter-from/leave-to `translateY(105%)`; `>=768px`'te modal-pop kalır |

### components/form-fields/ColorPresetField.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | Renk preset swatch butonları — 10'lu grid (satır 8) | `class="... transition-all hover:scale-110"` — (1) `transition-all` yasak, (2) `scale(1.10)` B2B için fazla gösterişli, grid içinde komşulara taşıyor, (3) `:active` yok, hover scale dokunmatikte false-positive | `.preset-swatch { transition: transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease; } @media (hover: hover) and (pointer: fine) { .preset-swatch:hover { transform: scale(1.05); } } .preset-swatch:active { transform: scale(0.97); transition-duration: 120ms; }`. Reduced-motion'da transform geçişini kaldır |

### components/form-fields/FilterBuilder.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P3 | Filtre satırları (ekleme/silme) (satır 53) | `v-for` düz render, `:key="idx"`; satır ekleme/silme animasyonsuz, kalan satırlar anında zıplar | Önce kararlı id ver (push'ta üretilen uid), sonra `<TransitionGroup name="frow" tag="div" class="space-y-2">`. `.frow-enter-active { transition: opacity 150ms cubic-bezier(0.23,1,0.32,1), transform 150ms cubic-bezier(0.23,1,0.32,1); } .frow-enter-from { opacity: 0; transform: translateY(-4px); } .frow-leave-active { position: absolute; transition: opacity 120ms ease; } .frow-leave-to { opacity: 0; } .frow-move { transition: transform 150ms ease; }`. Height animasyonu KULLANMA |

### components/form-fields/WidgetPreview.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P3 | Önizleme durum geçişleri (satır 25) | `v-if / v-else-if` zinciri, geçiş yok; durumlar arası yükseklik farkı büyük (kısa metin vs tam chart) — form doldurdukça ani içerik + yükseklik sıçraması | Durum bloklarını `<Transition name="fade" mode="out-in">` (global fade, opacity 0.2s ease) içine al + dış kutuya `min-height: 72px`. Chart'ın kendi ilk çizim animasyonu bu dosya dışında (registry widget'ları) — orada kısa tutulmalı |

### components/layout/ToastContainer.vue

En sorunlu 5 dosyadan biri. İki P1 (toast-move eksik, mobil konum) + toast animasyon + swipe.

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P1 | Toast stack'i — TransitionGroup (satır 3) | `TransitionGroup name="toast"` var ama `.toast-move` hiçbir SCSS'te tanımsız; `.toast-leave-active`'e `position:absolute` verilmemiş — bir toast kapanınca çıkan eleman 0.3s yer kaplar, kalanlar animasyonsuz zıplar | `animations.scss`: `.toast-move { transition: transform 0.25s cubic-bezier(0.23,1,0.32,1); }` + `.toast-leave-active { position: absolute; right: 0; }` (toast `min-width: 280px` sabiti olduğu için absolute'ta genişlik korunur) |
| P1 | Mobil toast konumu ve safe-area (satır 2) | `fixed bottom-6 right-6 z-[100]`, `.toast min-width: 280px` (forms.scss:188). Safe-area yok, MobileTabBar (<768px) offset yok — toast tab bar'ın üzerine binip z-100 ile onu örtüyor; kritik aksiyon toast'ı tab bar ardında kaybolur | Konteynere `.toast-wrap` sınıfı ver, konumu SCSS'ten yönet: `@media (max-width: 767px){ .toast-wrap{ left: 12px; right: 12px; bottom: calc(64px + env(safe-area-inset-bottom, 0px)); } .toast{ min-width: 0; width: 100%; } }` (64px MobileTabBar yüksekliği) |
| P2 | Toast giriş/çıkış animasyonu (satır 4) | `animations.scss`: `.toast-enter-active { animation: toastIn 0.3s ease }` / `.toast-leave-active { animation: toastOut 0.3s ease forwards }`; `forms.scss:189` `.toast` aynı `toastIn`'i ikinci kez taşır (çift tanım); simetrik 0.3s | Keyframe'leri sil, transition'a geçir: `.toast-enter-active { transition: transform 0.25s cubic-bezier(0.23,1,0.32,1), opacity 0.25s cubic-bezier(0.23,1,0.32,1); } .toast-leave-active { transition: transform 0.18s ease, opacity 0.18s ease; } .toast-enter-from,.toast-leave-to { opacity: 0; transform: translateX(30px); }`. `forms.scss:189` satırını kaldır |
| P3 | Swipe-to-dismiss — mobil (satır 4) | Kapatmanın tek yolu X butonu; kaydırarak kapatma yok | Pointer/touch sürükleme: sağa sürükleyince `translateX` takip, eşiği (>80px veya fling) aşınca `remove(id)`, altında `translateX(0)`'a yayla (`transition 200ms cubic-bezier(0.23,1,0.32,1)`). Giriş/çıkış zaten sağ `translateX(24px)` — swipe yönü tutarlı; `touch-action: pan-y` ile dikey scroll korunur |

**Emil formatı — toast-move eksik (satır 3):**

| Önce | Sonra | Neden |
|---|---|---|
| `TransitionGroup` var, `.toast-move` yok, leave `position` yok | `.toast-move { transition: transform 0.25s cubic-bezier(0.23,1,0.32,1); }` + `.toast-leave-active { position: absolute; right: 0; }` | Toast sistemi uygulamanın en görünür geri bildirim yüzeyi; Sonner mekansal tutarlılığı tamamen kırık — çıkan eleman yer kaplamaya devam edip kalanlar zıplıyor |

### components/layout/SidePanel.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | Yan panel aç/kapa genişlik animasyonu (satır 14) | `class="... transition-all duration-200"` + `:style="{ width: sidebar.panelVisible ? '220px' : '0px' }"` — `width` animasyonu her toggle'da main/tablolar/chartları reflow ediyor; `transition-all` border/padding dahil her şeyi | Overlay modunda (mobil) genişlik sabit 220px, `transform: translateX(-100%)` ile gir/çık: `transition: transform 0.2s cubic-bezier(0.23,1,0.32,1)`. Masaüstü in-flow modda en azından tek property: scoped `transition: width 0.2s cubic-bezier(0.77,0,0.175,1)` (`transition-all` sil) |

**Neden:** Panel günde onlarca kez açılıp kapanan yüzey — en pahalı animasyon en sık yerde.

### components/layout/NotificationPanel.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | Mobil tam ekran açılışı (satır 2) | Tek `<Transition name="dropdown">` (opacity + translateY(-4px), enter 0.15s) — `≤767px`'te panel `inset:0` tam ekran sheet olur ama aynı dropdown animasyonuyla; tam ekran yüzey 4px'lik nudge'la beliriyor | Transition adını breakpoint'e göre seç: `<Transition :name="isMobile ? 'fade' : 'dropdown'">` (useBreakpoint mevcut). Mobilde global fade yeterli; ya da alt media override: `@media(max-width:767px){.dropdown-enter-active,.dropdown-leave-active{transition:opacity 200ms ease,transform 240ms cubic-bezier(0.32,0.72,0,1)}.dropdown-enter-from,.dropdown-leave-to{opacity:0;transform:translateY(100%)}}` (m-sheet diliyle) |
| P3 | Kategori sekmeleri + "daha fazla yükle" (satır 319) | `transition: all $t-fast` — 2 yerde (`.notif-tab` satır 319, `.notif-load-more` satır 518); active'de `font-weight 500→600` `all` yüzünden tuhaf ara-frame | `.notif-tab: transition: color $t-fast, border-color $t-fast;`; `.notif-load-more button: transition: color $t-fast, background $t-fast;` |

### components/layout/MobileTabBar.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | Alt tab bar butonları (satır 7) | `:active`/press feedback yok; yalnız `.active`'de ikon pill background `$t-base` (mobile-nav.scss:37-94). Mobilde hover yok, tek anlık feedback `:active` olabilir | `.m-tab .m-tab-icon { transition: background $t-base, transform 0.12s cubic-bezier(0.23,1,0.32,1); } .m-tab:active .m-tab-icon { transform: scale(0.92); }`. Aynı kalıbı `.m-item` ve `.m-sec-card`'a: `&:active { transform: scale(0.98); }` |
| P3 | Bottom sheet'lerde swipe-to-close yok; grab handle yanıltıcı (satır 24) | `.m-sheet-grab` (ve cat-m-grab, upm-grab, om-grab) tamamen dekoratif; sheet yalnız backdrop/X/Escape ile kapanıyor, hiçbir sheet'te touchstart/pointerdown yok (grep: 0) | Pointerdown/pointermove ile `translateY` takip, eşiği (>120px veya hız) aşınca kapat, altında bırakınca `cubic-bezier(0.32,0.72,0,1)` ile geri yaslan (transform'u JS ayarlarken transition'ı geçici kapat). En azından grab handle'a hafif `:active` tepki |

**Neden:** Tab bar günün en sık dokunulan yüzeyi; basıldığında tepki vermemesi "UI dinlemiyor". Grab handle iOS'ta "aşağı sürükle kapat" affordance'ı — kullanıcı sürüklemeyi dener, tepki alamaz (affordance/işlev uyumsuzluğu).

### components/layout/IconRail.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | Rail bölüm + yardım/link butonları (satır 11) | `:active` yok; global `.rail-icon` `transition: all 0.2s` (sidebar.scss) yalnız hover background/renk değiştiriyor | `.rail-icon: transition: background $t-base, color $t-base, transform 0.12s cubic-bezier(0.23,1,0.32,1);` + `&:active { transform: scale(0.94); }`. Aynı `:active` kalıbı `.hdr-icon-btn/.hdr-btn-outlined` için header.scss'e de |
| P2 | Avatar sahte ilerleme çubuğu — setInterval width tick (satır 203) | `window.setInterval(() => tickPct(), 100)` her 100ms `uploadProgress` reaktifini artırıp width-transition sürüyor. Aynı kalıp: ProfileImageDropzone, LayoutSectionCard.vue:532, lib/upload-ui/uploader.ts:97, SlotDropzone.ts:289, file-list.ts:175 | JS tick yerine CSS keyframe/transition ile "indeterminate" bar (`transform: translateX` tabanlı); zorunluysa değeri `transform: scaleX`'e bağla (`transition: transform 150ms linear`, compositor'da kalır). En azından `transition-all → transition-transform` |
| P3 | Avatar ring hover + upload progress bar transition property (satır 45) | Satır 45 `transition-all` (ring hover); satır 68 progress `transition-all duration-300` + width % | Avatar: `transition-shadow duration-150`. Progress dolgusu: `transition: width 0.1s linear` (tick 100ms olduğu için 100ms linear kesintisiz akar) |

### components/layout/GuidedTour.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 | Spotlight kutusu + coach balonu (satır 132) | İki elemanda `transition-all duration-300` + inline `top/left/width/height`; spotlight ayrıca 9999px yayılan box-shadow — layout+paint her frame; adım geçişinde takılma | `transition-all` kaldır, `transition: transform 0.3s cubic-bezier(0.23,1,0.32,1)`; konumu `transform: translate(x,y)` ile ver, `transition-[transform]`. box-shadow'u transition dışında tut |
| P3 | Tur overlay'i açılış/kapanış (satır 127) | `v-if="tour.active && tour.current"` — Transition yok, %62 karartma ani | Kök div'i `<Transition name="fade">` ile sar (opacity 0.2s ease). Coach kartına istenirse `scale(0.95) + opacity`: `transition: transform 0.2s cubic-bezier(0.23,1,0.32,1), opacity 0.2s ease` |
| P3 | Geri/İleri butonları + ilerleme çubuğu (satır 163) | Butonlarda transition yok (`hover:bg-brand-600` ani), `:active` yok; progress bar `transition-all duration-300` width | Butonlara `transition-colors duration-150` + `&:active { transform: scale(0.97); transition: transform 0.12s cubic-bezier(0.23,1,0.32,1); }`. Progress: `transition: width 0.3s cubic-bezier(0.77,0,0.175,1)` (veya transform-origin: left + scaleX) |

### components/layout/AppHeader.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---|---|---|---|
| P2 / P3 | Global arama sonuç paneli (masaüstü) (satır 68) | `<GlobalSearch v-if="showSearchResults && searchQuery.length >= 2" />` — Transition sarmalayıcı yok; GlobalSearch içinde de transition yok. Aynı header'daki quick links ve ⋯ menüsü global `dropdown` kalıbıyla açılırken arama paneli "pat" | `<Transition name="dropdown">` ile sar (enter 0.15s / leave 0.1s, opacity + translateY(-4px)). GlobalSearch panelinde `transform-origin: top left`. İç sonuç listesi (v-for) animasyonsuz kalmalı — yazarken retarget/kesinti olmaz (doğru davranış) |
| P3 | Mobil tam ekran arama paleti — hdr-search-sheet (satır 231) | `<Transition name="fade">` — giriş/çıkış simetrik 0.2s opacity; komut paleti tarzı sık açılan yüzeyde açılış klavye odağına geçişi yavaş hissettirir | Asimetrik: `.palette-enter-active { transition: opacity 0.15s ease; } .palette-leave-active { transition: opacity 0.1s ease; }`. Çok sık kullanım gözleniyorsa animasyonu tümden kaldırmak da geçerli (100+/gün kuralı) |

---

### Önerilen Standart

Bu bileşen dilimi için tek tip reçete. Yeni bir common/layout bileşeni yazarken veya mevcut birini elden geçirirken aşağıdaki kontrol listesi uygulanmalı:

**1. Katman türüne göre merkezi Transition kullan (kendi CSS'ini yazma):**

| Yüzey türü | Transition adı | Enter | Leave | Origin |
|---|---|---|---|---|
| Dropdown / popover / select paneli | `dropdown` | 150ms cubic-bezier(0.23,1,0.32,1), opacity + translateY(-4px) | 100ms ease | tetikleyiciden (`top left`/`top right`) |
| Merkez modal / dialog | `modal` | 200ms, backdrop opacity + panel `scale(0.96)→1` | 160ms | center (modal istisnası; **asla scale(0)**) |
| Sağdan drawer | `$t-drawer` = 320ms cubic-bezier(0.32,0.72,0,1) | translateX(100%)→0 | 240-260ms (girişten hızlı) | — |
| Bottom sheet (<768px) | `.m-sheet` | 260ms cubic-bezier(0.32,0.72,0.35,1), translateY(105%)→0 | girişten hızlı | — |
| Durum takası (loading/empty/content) | `fade mode="out-in"` | opacity 0.2s ease | — | — |
| Liste giriş/çıkış (çip, satır) | `TransitionGroup` + `.*-move` | 120-150ms, opacity + scale(0.95) | 100-120ms, `position: absolute` | — |

**2. Animasyon property'si — mutlak kural:** Yalnız `transform` ve `opacity` anime et. `left`, `width`, `top`, `height` ve `transition: all` yasak; renk için açık liste (`transition: background-color … , color … , border-color …`). Layout property'siyle konumlama gereken yerde `transform: translate()`/`scaleX`'e taşı.

**3. Her tıklanabilir eleman `:active`'de scale alır:** Standart butonlar `scale(0.97)`, geniş elemanlar `scale(0.99)`, küçük ikon butonlar/tab ikonları `scale(0.92-0.94)`; süre `120ms ease-out` veya `cubic-bezier(0.23,1,0.32,1)`. Liste satırlarında scale yerine `active:bg-*` (taşma yapmaz).

**4. Hover her zaman media-gate'li:** `@media (hover: hover) and (pointer: fine) { ... }`. Tailwind `hover:` CDN'de gate'lenemediği için dokunma-hassas yüzeylerde hover stilleri scoped SCSS'e taşınır. Focus için `:focus { outline: none }` yasak; `:focus-visible { outline: 2px solid rgba($brand,0.5); outline-offset: 1px }`.

**5. Yükleme durumu spinner değil skeleton:** Nihai layout'u işgal eden, aynı yükseklikte, `transform: translateX` tabanlı shimmer (`animation: shimmer 1.4s linear infinite`). Arama/filtre gibi yüksek frekanslı yüzeylerde stale-while-loading (eski sonuçları `opacity: 0.5` ile tut, spinner'ı input ikonuna koy, listeyi silme).

**6. Klavye + focus yönetimi:** Modal/drawer açılışta içeriğe focus taşır, Escape ile kapanır (`watch` + `onUnmounted` temizliği), body scroll lock uygular. Dropdown'lar ok tuşu + Enter navigasyonu ve `scrollIntoView({ block: 'nearest' })` sağlar.

**7. `prefers-reduced-motion: reduce` her hareketli bileşende:** Konum/scale hareketleri kaldırılır (`transition: none` veya `transform: none`), opacity/renk geçişi korunur; chart'larda `animation: false`. Bu, `animations.scss`'e tek bir kapsayıcı blokla merkezileştirilmeli.

**8. Kararlı `:key`:** `v-for`'da asla index değil; `row.name || crypto.randomUUID()`. TransitionGroup'un çalışması ve input focus/state korunması bu kimliğe bağlı.

---

## Dosya Envanteri: components (navigation - widgets) + layouts

Bu bölüm `components/navigation`, `components/seller`, `components/seo`, `components/system`, `components/upload` ve `layouts` altındaki 31 dosyada tespit edilen **66 mikro-animasyon bulgusunu** dosya-dosya işler. Dilimin karakteri iki uçta toplanıyor: bir yanda çıplak Teleport ile mount edilen, hiçbir `<Transition>` sarmalayıcısı olmayan **animasyonsuz modal salgını** (6 ayrı dosyada P1), diğer yanda `transition: all`, `width` animasyonu ve eksik `:active` press feedback gibi baseline'da defalarca tekrarlayan **sistemik ihlaller**. B2B admin paneli kalibrasyonunda beklenti abartı değil pürüzsüzlük; ancak burada sorun çoğu yerde "fazla animasyon" değil, **animasyonun tamamen yokluğu** ve yanlış property üzerinden çalışan geçişlerin ürettiği görünür layout shift'ler.

### En Sorunlu 5 Dosya (Bölüm Özeti)

| # | Dosya | Bulgu | En Ağır Sorun |
|---|-------|-------|----------------|
| 1 | `components/seller/LayoutSectionCard.vue` | 5 | **P1** — Toggle switch topuzu `left` üzerinden `transition-transform` ile animasyonlanmaya çalışılıyor, sonuç: topuz hiç animasyonsuz ZIPLAR. Ayrıca panel açılışı, progress barı, kök `transition-all` |
| 2 | `components/seller/SellerAddressesPanel.vue` | 5 | **P1** — Yıkıcı adres silme onay modalı `<Transition>` olmadan aniden basıp aniden kayboluyor; exit animasyonu tamamen unutulmuş |
| 3 | `components/system/CapabilityMatrixTab.vue` | 5 | **P2 küme** — Bulk onay modalı animasyonsuz + tüm butonlarda press feedback yok + veri-yoğun matris skeleton'suz "Yükleniyor…" metni |
| 4 | `components/system/HeaderNoticePreview.vue` | 4 | **P2** — Sonsuz kayan marquee için `prefers-reduced-motion` yok (vestibüler risk); slide geçişi 400ms + mekansal yön çelişkisi; sekme gizliyken timer durmuyor |
| 5 | `components/system/HeroSlideEditModal.vue` | 2 | **P1** — 860px'lik modal ve içindeki 5 buton sınıfının hiçbirinde animasyon/press feedback yok; global `fade` kalıbı mevcutken hiç kullanılmamış |

**Çapraz kesen tema — Animasyonsuz Modal Salgını:** `SellerAddressesPanel`, `HeroSlideEditModal`, `NoticeEditModal`, `CapabilityMatrixTab`, `ModuleMatrixTab`, `RoleProfileEditModal` ve `ShowcaseTileEditModal` — yani dilimin **7 dosyası** — modal/onay diyaloğunu çıplak `v-if` ile mount ediyor, `<Transition>` yok. Projede 20+ view'ın kullandığı hazır global `fade` kalıbı varken bu dosyalarda uygulanmamış. Bu tek başına en yaygın P1/P2 kümesi.

---

### components/navigation/UserMenuDropdown.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Tema (aydınlık/karanlık) toggle butonları — `:53` ve `:64` | `class="… transition-all"` her iki butonda | `transition: all` yasak; niyet yalnız `background-color`/`box-shadow`/`color`. `transition-[background-color,color,box-shadow] duration-150` (arbitrary) veya scoped `transition: background-color $t-base, color $t-base, box-shadow $t-base` |

**Emil formatı:**

| Öğe | Önce | Sonra | Neden |
|-----|------|-------|-------|
| Tema toggle (`UserMenuDropdown.vue:53`) | `transition: all` | `transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease` | `all`, layout property'lerini de animasyonlanabilir kılar; niyeti belirsizleştirir. Sık kullanılan mikro-etkileşimde kesin property listesi şart |

---

### components/navigation/QuickLinksDropdown.vue

Bu dosya için iki bulgu aynı kök soruna (yön çelişkisi) işaret ettiğinden **birleştirildi**. `UserMenuDropdown.vue:2` de aynı global `dropdown` transition'ını miras aldığı için etkileniyor.

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Yukarı açılan popover (`:2`) | Global `dropdown` transition: enter'da `opacity` + `translateY(-4px)` — yani panel tepeden aşağı kayarak girer | Panel `bottom-[160px] left-[78px]` ile rail'in ÜSTÜNDE, yukarı doğru açılıyor; `-4px` girişi paneli tetikleyiciden UZAKLAŞAN yönden getirir. Lokal override: `name="popup-up"`, `enter-from { opacity: 0; transform: translateY(4px) scale(0.98); }`, `transform-origin: bottom left`, 150ms ease-out |

**Emil formatı:**

| Öğe | Önce | Sonra | Neden |
|-----|------|-------|-------|
| Popover girişi (`QuickLinksDropdown.vue:2`) | `translateY(-4px)` (tepeden) | `translateY(4px)` + `transform-origin: bottom left` (alttan/tetikleyiciden) | Mekansal tutarlılık: giren eleman geldiği yönden büyümeli. Rail üstünde yukarı açılan menü tetikleyiciden doğmalı, tepeden düşmemeli |

---

### components/seller/LayoutSectionCard.vue

Dilimin en sorunlu dosyası: 5 bulgu, biri P1 zıplama. Kök element, toggle switch, açılan panel, progress barı ve hover butonlarının tamamında ayrı ayrı sorun var.

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| **P1** | Bölüm aç/kapa toggle topuzu (`:37`) | `class="… transition-transform"` ama durum `:class` ile `left-[18px]` / `left-0.5` arasında değişiyor | `transition-transform` yalnız `transform`'u kapsar, animate edilen ise `left` → topuz **animasyonsuz ZIPLAR**. `left-0.5` sabit kalsın, durum transform ile değişsin: `:class="section.enabled ? 'translate-x-[14px]' : 'translate-x-0'"` + `transition-transform duration-150 ease-out` (veya `transition: transform 0.15s cubic-bezier(0.23, 1, 0.32, 1)`) |
| P2 | Bölüm ayarları paneli (`:59`) | `v-show="expanded"` — geçişsiz; büyük içerik bloğu (slayt editörü) aniden belirip alttaki kartları zıplatıyor | Height animasyonu yerine grid tekniği: sarmalayıcı `display: grid`, kapalı `grid-template-rows: 0fr`, açık `1fr`; iç div `min-height: 0; overflow: hidden`; `transition: grid-template-rows 200ms cubic-bezier(0.23, 1, 0.32, 1)`. `prefers-reduced-motion`'da `transition: none` |
| P3 | Kök element enabled/disabled geçişi (`:3`) | `class="border rounded-lg transition-all"` | `transition: all` yasak; drag sıralamada layout property'lerini de animasyonlar → sıçrama. `transition-[background-color,border-color,opacity] duration-150` |
| P3 | Slayt görseli upload progress barı (`:179`) | `class="h-full bg-white rounded-full transition-all duration-300"` + `:style` width % | İki ihlal: `transition-all` + `width` layout tetikler. `transform: scaleX(${p/100})` + `transform-origin: left` + `transition-transform duration-150 ease-linear` (bar kökü `w-full`) |
| P3 | Hover'lı küçük butonlar (`:103, :132, :141, :149, :203, :217, :421`) | `hover:bg-*` / `hover:text-*` var ama `transition` sınıfı yok — ~6 yerde geçişsiz zıplayan hover | Her birine `transition-colors duration-150` ekle (Tailwind default ease yeterli); dosya içi diğer butonlarla tutarlılık sağlar |

**Emil formatı (P1 vurgusu):**

| Öğe | Önce | Sonra | Neden |
|-----|------|-------|-------|
| Toggle topuzu (`LayoutSectionCard.vue:37`) | `transition-transform` + `left-[18px]`/`left-0.5` | `translate-x-[14px]`/`translate-x-0` + `transition-transform duration-150 ease-out` | Property/animasyon uyumsuzluğu: transform geçişi left değişimini yakalayamaz → tam da animasyonun en meşru olduğu yerde (durum göstergesi + geri bildirim) topuz zıplıyor. Ayrıca `left` layout tetikler, transform GPU'da kalır |
| Ayarlar paneli (`LayoutSectionCard.vue:59`) | `v-show` (0ms) | `grid-template-rows: 0fr → 1fr`, 200ms | Ani layout değişimini yumuşatmak animasyonun geçerli amacı; `height` yerine `grid-template-rows` reflow'u sınırlar |

---

### components/seller/SellerAddressesPanel.vue

5 bulgu; başı P1 animasyonsuz onay modalı çekiyor. Ayrıca dilimin tamamına yayılan **global `:active` press feedback eksikliği** ilk kez burada raporlanmış — düzeltmesi global buttons partial'ında.

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| **P1** | Adres silme onay modalı (`:326`) | `v-if="deleteConfirmAddr"` — hiçbir `<Transition>` yok, enter/exit animasyonu yok | Yıkıcı aksiyon modalı aniden basıp aniden kayboluyor. Dialog'u `<Transition name="fade">` ile sar; daha iyisi backdrop fade + panel `opacity + scale(0.97)→1`, enter 200ms `cubic-bezier(0.23, 1, 0.32, 1)`, leave 150ms ease (çıkış girişten hızlı). `transform-origin: center` kalabilir (modal istisnası); asla `scale(0)`'dan başlama |
| P2 | Tüm tıklanabilir butonlar — 9 dosyanın tamamında (`:312` referans) | Hiçbir butonda `:active` transform feedback'i yok; global altyapıda `:active scale` tanımsız | **Dosya-bazlı değil, dilimin tamamında tekrar eden eksik.** Global çözüm (buttons partial): `.hdr-btn-primary, .hdr-btn-outlined, .sp-btn` vb. için `&:active { transform: scale(0.97); }` + `transition: transform 120ms cubic-bezier(0.23, 1, 0.32, 1)`. `prefers-reduced-motion`'da transform kaldır |
| P3 | Adres kartı hover'ı (`:86`) | `class="card … transition-all hover:shadow-md"` | `transition-all` yasak + kart tıklanabilir değil → shadow yükselmesi yanlış affordance. `transition-all` ve `hover:shadow-md` kaldır; gölge istenirse `transition-shadow duration-200` + `@media (hover: hover)` arkasında |
| P3 | Adres listesi yükleme durumu (`:69`) | Ortalı spinner + metin; sonra grid kartlar aniden basıyor (layout shift) | 2-4 skeleton kart bas (gerçek kart boyutunda `div` + `animate-pulse` veya SCSS shimmer). Gerçek kartlar aynı grid'e oturur, shift olmaz |
| P3 | Liste ↔ inline form geçişi (`:158`) | `v-if="showForm"` / `v-else-if` — geçişsiz büyük içerik takası | `<Transition name="fade" mode="out-in">` (global 0.2s) ile sar. Lokal alternatif: enter 150ms ease-out `opacity + translateY(4px)`, leave 100ms ease |

**Emil formatı (P1 vurgusu):**

| Öğe | Önce | Sonra | Neden |
|-----|------|-------|-------|
| Silme onay modalı (`SellerAddressesPanel.vue:326`) | `v-if` (0ms, exit yok) | backdrop fade + panel `scale(0.97)→1` 200ms, leave 150ms | Ani değişimi yumuşatma animasyonun temel amacı; hazır `fade` kalıbı varken kullanılmamış, exit tamamen unutulmuş. Yıkıcı aksiyonda ani pop premium his kırar |

---

### components/seller/UserProfileMessagesPanel.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Inbox'ta aktif konuşma vurgusu (`:169`) | Aktif satıra `:class` ile `border-l-4 border-l-brand-500` ekleniyor; pasif satırda sol border yok | Border sıfırdan eklendiği için avatar+metin her seçimde **sağa zıplar** (layout shift); `transition-colors` border genişliğini animasyonlayamaz. Tüm satırlara sabit `border-l-4 border-l-transparent`, aktifte sadece `border-l-brand-500`; mevcut `transition-colors duration-150` rengi pürüzsüz geçirir, shift biter |
| P3 | Inbox + thread yükleme durumları (`:152, :234`) | Sadece "Yükleniyor" metni; shimmer/skeleton yok | Yapısı bilinen liste için skeleton algılanan hızı artırır. Inbox: 4-5 skeleton satır (`w-8 h-8 rounded-full` daire + iki çubuk, `animate-pulse`); thread: 2-3 balon iskeleti. Tailwind `animate-pulse` yeterli |

---

### components/seller/SubscriptionPlanCard.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Kartın ilk görünümü (`:80`) | `v-if="!loading && isSeller"` — yükleme sırasında hiçbir şey render edilmiyor, kart sonradan aniden beliriyor | Kart mount edilince altındaki formu aşağı iterek pat diye beliriyor (layout shift). `loading`'de aynı yükseklikte skeleton blok (`border + animate-pulse`, `min-height ~72px`); içeriğe geçiş `<Transition name="fade">` (0.2s). Yer önceden rezerve olur, shift biter |

---

### components/seller/VariantWizard.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Değer çipi seçim durumu — check ikonu (`:297`) | `AppIcon name="check"` `v-if` ile seçimde ekleniyor/kaldırılıyor; çip `transition-colors` taşıyor | Check ikonu sıfırdan eklendiği için çip genişliği değişiyor, flex-wrap'taki komşu çipler her toggle'da yer değiştiriyor (sürekli layout shift). İkonu her zaman render et, görünürlüğü opacity ile yönet: `:class="… ? 'opacity-100' : 'opacity-0'"` + `transition-opacity duration-150` (`w-3` sabit) |

---

### components/seo/GoogleSerpPreview.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Desktop/Mobile önizleme sekme butonları (`:38-53`) | `class="px-2 py-1 text-xs rounded"` — transition/hover/`:active` yok; aktif sınıf (`bg-blue-100`) aniden takas | Tıklanabilir eleman hiçbir geri bildirim vermiyor. `seo-tab-btn` sınıfı + inaktife `text-gray-500 hover:text-gray-700 hover:bg-gray-100`. Scoped: `.seo-tab-btn { transition: background-color 0.15s ease, color 0.15s ease, transform 0.12s ease; &:active { transform: scale(0.97); } }`; hover'ı `@media (hover: hover) and (pointer: fine)` arkasına al |

---

### components/seo/OgImageUpload.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Değiştir / Kaldır butonları (`:61-74`) | `hover:bg-gray-50` var ama transition yok → renk aniden zıplar; `:active` feedback yok | Kaldır yıkıcı eylem olduğu halde dokunsal his vermiyor. Her ikisine `transition-colors duration-150`; press için ortak `.og-action-btn { transition: background-color 0.15s ease, transform 0.12s ease; &:active { transform: scale(0.97); } }` |
| P3 | Yükleme/durum geçişleri — dropzone ↔ görsel ↔ hata (`:54, :79, :88, :98`) | `uploading`'de yalnız "Yükleniyor…" metni; `v-if/v-else` takasları animasyonsuz ani DOM değişimi | (1) Spinner ekle: `<span class="inline-block h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin">`; (2) durum takaslarını `<Transition name="fade" mode="out-in">`; (3) hata paragrafını da fade ile sar. Dropzone (`p-6`) ile görsel (`aspect-[1.91/1]`) yükseklik farkı da yumuşar |

---

### components/seo/LangToggle.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | TR/EN/AR/RU dil segment butonları (`:20`) | `transition-colors` var ama `:active` press yok; seçili durumun `shadow-sm`'i transition kapsamında değil, aniden beliriyor | 4 dilli SEO formunda günde onlarca kez tıklanıyor — mikro geri bildirimin en çok hissedileceği yer. `.lang-btn { transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.12s ease; &:active { transform: scale(0.97); } }`. `hover:text-gray-900` → `@media (hover: hover) and (pointer: fine)` arkasına (dokunmatik false-positive) |

**Emil formatı:**

| Öğe | Önce | Sonra | Neden |
|-----|------|-------|-------|
| Dil pill'i (`LangToggle.vue:20`) | `box-shadow` transition dışı (sert pop) | `box-shadow 0.15s ease` transition'a dahil | Renk yumuşak ama gölge sert → tutarsız his. Süre 120-150ms Emil'in buton basma penceresinde (100-160ms) |

---

### components/seo/CharCounter.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Karakter sayacı renk eşiği + limit uyarısı (`:23`) | `:class="colorClass"` geçişsiz takas (gri→turuncu→kırmızı); "limit aşıldı" span `v-if` ile aniden beliriyor | Kök div'e `transition-colors duration-150`. Uyarı span'ına animasyon EKLEME — `v-if` kalsın; yazma sırasında hızlı tetiklenen uyarıya keyframe koymak B2B kalibrasyonunda gereksiz |

---

### components/seo/RedirectForm.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Kaydet / İptal butonları (`:122`) | Global `.hdr-btn-primary` (`transition: all $t-base`) / `.hdr-btn-outlined` (`transition: all 0.15s` token'sız); `:active` scale yok | **Düzeltme global sınıfta yapılmalı, bu dosya sadece tüketici.** `header.scss`'te: `transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.12s ease + &:active { transform: scale(0.97); }` |
| P3 | Input/select/textarea focus halkası (`:53, :65, :77, :90, :116`) | `focus:ring-2 focus:ring-blue-200` — transition yok, halka aniden beliriyor | Klavye kullanıcıları alan alan gezer; ortak input sınıflarına `transition-shadow duration-150` (veya `transition: box-shadow 0.15s ease, border-color 0.15s ease` açık listeyle) |

---

### components/seo/SeoCheckItem.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | SEO kontrol satırı durum rengi — pass/warn/fail (`:42`) | `:class="colorClass"` — analiz yeniden çalışınca `fail→pass` renk dahil aniden takas | İkon span'ına ve etiket div'ine `transition-colors duration-200`. Veri-yoğun liste olduğu için stagger/ikon animasyonu gereksiz — sadece renk geçişi durum değişimini algılanabilir kılar |

---

### components/seo/SeoScoreBar.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | SEO skor progress çubuğu (`:69`) | `class="h-full transition-all duration-300"` + `:style width` | `transition: all` + `width` layout tetikler; skor her tuşta değiştiği için sürekli reflow. `transform: scaleX(${total/100})` + `width: 100%; transform-origin: left; transition: transform 250ms cubic-bezier(0.23, 1, 0.32, 1)`. `prefers-reduced-motion`'da `transition-duration: 0.01ms` |
| P2 | Skor detay checklist paneli (`:81`) | `v-if="expanded"` — enter/exit yok, anlık açılıp kapanıyor | `<Transition>`: `enter-active` `opacity + transform 200ms cubic-bezier(0.23, 1, 0.32, 1)`, `enter-from { opacity: 0; transform: translateY(-4px); }`, leave 120ms ease sadece opacity. Height ANIME ETME; reduced-motion'da yalnız opacity |
| P3 | Skor pill başlık butonu (`:51`) | `hover:bg-gray-50 transition-colors` var; `:active` feedback yok | `.score-toggle { transition: background-color 150ms ease, transform 120ms cubic-bezier(0.23, 1, 0.32, 1); &:active { transform: scale(0.99); } }`; hover'ı `@media (hover: hover) and (pointer: fine)` arkasına. Tam genişlik satır → `0.99` yeterli, `0.97` abartı |

---

### components/seo/SeoTab.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | SEO sekmesi yükleme durumu (`:125`) | `v-if="store.loading"` → ortalı düz "loading" metni; içerik gelince ani swap + layout shift | Nihai layout'u taklit eden skeleton: skor barı `h-12 rounded-lg`, sol/sağ kolon 2× `h-64 rounded-lg`, `bg-gray-100` + `animation: skeleton-pulse 1.5s ease-in-out infinite` (`@keyframes { 50% { opacity: 0.55; } }`). İçeriğe `<Transition name="fade">`; reduced-motion'da `animation: none` |
| P2 | Kaydet / Sıfırla butonları (`:180`) | `.hdr-btn-primary` / `.hdr-btn-outlined` (global `transition: all`), `:active` yok | Global düzeyde: `transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, opacity 150ms ease, transform 120ms cubic-bezier(0.23, 1, 0.32, 1); &:active:not(:disabled) { transform: scale(0.97); }`. `transition: all` kaldırılsın |

---

### components/seo/SeoFormFields.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | "Gelişmiş ayarları göster" açılır bölümü (`:119`) | `v-if="showAdvanced"` — 4 alanlık blok animasyonsuz aniden beliriyor | `<Transition name="advanced">`: `enter-active opacity + transform 200ms cubic-bezier(0.23, 1, 0.32, 1)`, `enter-from { opacity: 0; transform: translateY(-4px); }`, leave 120ms ease. `max-height`/`height` KULLANMA |
| P3 | Meta title / description input'ları — hata border + focus (`:45-51, :61-67`) | Border `:class` ile `border-red-300 ↔ border-gray-200` anlık; transition yok | Aynı dosyadaki `SlugInput` bunu `transition-colors` ile doğru yapıyor (tutarsızlık). Her iki input'a `transition-colors duration-150`; focus için scoped `transition: border-color 150ms ease, box-shadow 150ms ease` |

---

### components/seo/SlugInput.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Slug uniqueness durum ikonu (…/✓/✗) + duplicate mesajı (`:81, :97`) | İkon metni ve `v-if`'li hata mesajı anlık swap; "checking" statik üç nokta (Not: mevcut kullanımda component disabled, enabled API açık) | İkonu `<Transition name="fade" mode="out-in">` + `:key="store.slugStatus"` ile sar. "checking" için 12px border-spinner: `border: 2px solid #e5e7eb; border-top-color: #9ca3af; border-radius: 50%; animation: spin 0.6s linear infinite` (linear doğru). Duplicate mesajı aynı fade |

---

### components/system/HeroSlideEditModal.vue

Animasyonsuz modal salgınının ağır örneklerinden; hem 860px'lik panelde hem içindeki 5 buton sınıfında sıfır animasyon.

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| **P1** | Slide düzenleme modalı — `hs-overlay + hs-modal` (`:3`) | Teleport içinde çıplak div, `<Transition>` yok; backdrop ve panel aniden belirip aniden kayboluyor | Overlay'i `<Transition name="hs-modal">` ile sar. `.hs-modal-enter-active { transition: opacity 200ms cubic-bezier(0.23, 1, 0.32, 1); .hs-modal { transition: transform 200ms …, opacity 200ms …; } }`, `enter-from { opacity: 0; .hs-modal { transform: scale(0.97); opacity: 0; } }`, `leave-active` 150ms ease. Center-origin (modal istisnası); asla `scale(0)` |
| P2 | Modal butonları/sekmeler — `hs-btn-primary`, `hs-btn-ghost`, `hs-icon-btn`, `hs-tab`, `hs-seg__item` (`:643`) | 5 sınıfta transition ve `:active` yok; `hs-tab.active`/`hs-seg__item.active` (background + box-shadow) anlık | Ortak: `transition: background 150ms ease, color 150ms ease, box-shadow 150ms ease, transform 120ms ease-out`. Btn'lere `&:active:not(:disabled) { transform: scale(0.97); }`, tab/seg'e `&:active { transform: scale(0.96); }`. Hover renk değişimleri bile transition'sız — ucuz his |

---

### components/system/NoticeEditModal.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| **P1** | Duyuru düzenleme modalı — `modal-backdrop + modal` (`:2`) | Parent'ta koşullu `v-if`, `<Transition>` yok; backdrop fade + panel enter/exit tamamen eksik | Root'u `<Transition name="fade">` ile sar (minimum). Daha iyisi: backdrop `opacity 200ms ease` + `.modal { scale(0.97) → 1; opacity 0 → 1 }` 200ms `cubic-bezier(0.23, 1, 0.32, 1)`; çıkış yalnız `opacity 150ms ease` |
| P3 | Dil sekmeleri (`.tabs button`), `.icon-btn`, `.color-reset` (`:255`) | Üç sınıfta transition yok; hover ve `.active` (renk, `border-bottom-color`, background) anlık | `.tabs button { transition: color $t-fast, border-color $t-fast; }`. `.icon-btn`, `.color-reset { transition: background $t-fast, color $t-fast, transform 120ms ease-out; &:active { transform: scale(0.96); } }` |

---

### components/system/CapabilityMatrixTab.vue

Veri-yoğun matris; 5 bulgu modal + buton + skeleton + yan panel + hover eksenlerini kapsıyor. Bir sonraki dosya `ModuleMatrixTab` bu kalıpların birçoğunu kopyalamış — düzeltmeler paylaşılabilir.

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Bulk işlem onay modalı — `bulk-modal-backdrop` (`:644`) | Teleport + `v-if`, `<Transition>` yok; backdrop ve modal anlık | `<Transition name="fade">` (global 0.2s) veya backdrop `opacity 180ms ease` + `.bulk-modal { scale(0.97) → 1; opacity 0 → 1 }` 200ms `cubic-bezier(0.23, 1, 0.32, 1)`, çıkış 140ms |
| P2 | Tüm butonlar — `.btn`, `.plan-toggle`, `.close-btn`, `.modal-close`, `.bulk-btn` (`:816`) | `:active` press yok; transition yalnız background/opacity — 5+ sınıfta tekrar | `.btn`/`.plan-toggle` transition'ına `transform 120ms ease-out` ekle + `&:active:not(:disabled) { transform: scale(0.97); }`. `.close-btn`/`.modal-close` küçük hedef → `scale(0.94)` |
| P2 | Matris yükleme durumu (`:385`) | Yalnız "Yükleniyor…" metni (`.state-msg`); skeleton yok | 6-8 satır shimmer iskeleti: `.skeleton-row { height: 40px; border-radius: 6px; background: linear-gradient(90deg, $l-bg-muted 25%, $l-bg-soft 50%, $l-bg-muted 75%); background-size: 200% 100%; animation: shimmer 1.4s linear infinite; }`. Reduced-motion'da `animation: none` |
| P3 | Capability detay yan paneli — `aside.detail` (`:466`) | `v-if="selectedCap"` — 320px panel animasyonsuz aniden açılıp matrisi anlık itiyor | `<Transition>`: enter 180ms `opacity 0→1 + translateX(12px)→0` `cubic-bezier(0.23, 1, 0.32, 1)`, leave 120ms yalnız opacity. Width'i ANIME ETME (layout). Aynı fix `ModuleMatrixTab.vue:566`'daki eş panele de |
| P3 | Matris hücre/satır hover'ları — `.cell:hover`, `tbody tr:hover` (`:973`) | Hover stilleri media query korumasız → dokunmatikte sticky hover | `@media (hover: hover) and (pointer: fine)` içine taşı; mevcut `transition: background $t-fast` korunur. `ModuleMatrixTab` eş selektörlerinde de aynı |

---

### components/system/ModuleMatrixTab.vue

`CapabilityMatrixTab` ile kardeş dosya; modal, skeleton ve hover kalıpları birebir kopyalanmış ve ikisinde de eksik. Mobil segmented kontrol ve kart akordeonu ek olarak var.

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Korumalı modül bilgi modalı — `protected-modal-backdrop` (`:617`) | Teleport + `v-if`, `<Transition>` yok — `CapabilityMatrixTab` bulk modalıyla birebir aynı eksik | `<Transition name="fade">` veya backdrop `opacity 180ms ease` + panel `scale(0.97→1)/opacity` 200ms `cubic-bezier(0.23, 1, 0.32, 1)`, çıkış 140ms |
| P2 | Mobil segmented kontrol `.seg-btn` + topbar `.btn` (`:1524`) | `.seg-btn`'de hiç transition yok — `.on` durumunda background + box-shadow anlık atlıyor; `:active` yok (`.btn`, `.tree-toggle`, `.head-main` ~6 sınıf) | `.seg-btn { transition: background 150ms ease, color 150ms ease, box-shadow 150ms ease, transform 120ms ease-out; &:active { transform: scale(0.95); } }`. Topbar `.btn` için Capability ile aynı fix (`transform 120ms ease-out` + `:active scale(0.97)`). iOS-tarzı segmented seçim geçişi yumuşamalı |
| P2 | Modül ağacı yükleme durumu (`:364`) | Yalnız "Yükleniyor…" metni; panel select (seller↔admin) her değişimde fetch → boş metin ekranı sık | Aynı shimmer skeleton: girintili 8-10 satır (`height: 34px`), section satırları koyu/geniş; mobilde kart yüksekliğinde (`44px, border-radius: 11px`) skeleton kartlar |
| P3 | Mobil kart akordeon gövdesi `.mod-card-body` (`:434`) | `v-if="expandedCards.has(m.key)"` — gövde anlık; oysa `.head-arrow` chevron `transform $t-panel` ile animasyonlu dönüyor | Chevron 180ms dönerken içerik 0ms — tutarsız. Grid tekniği: `<div class="acc">` `display: grid; grid-template-rows: 0fr; transition: grid-template-rows 180ms ease-out;` > `overflow: hidden`, açıkken `1fr`. Ucuz alternatif: `<Transition>` `opacity + translateY(-4px)` 150ms ease-out |

---

### components/system/HeaderNoticePreview.vue

4 bulgu; iki tanesi doğrudan **erişilebilirlik** (reduced-motion) — dilimin en kritik a11y noktası. Reduced-motion bulguları aynı elementte (`:188`) birleştirildi.

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Slide modu duyuru geçişi `.preview-slide-item` (`:172`) | `transition: opacity 0.4s ease, transform 0.4s ease`; pasif öğeler `translateY(100%)`'de — çıkan öğe girdiği noktaya (aşağı) geri iniyor | İki ihlal: (1) 400ms, 300ms altı kuralını aşıyor + giren öğe için `ease` yerine `ease-out` olmalı; (2) mekansal çelişki — yeni öğe alttan girerken eski öğe de alta iniyor. Süreyi **280ms**, easing `cubic-bezier(0.23, 1, 0.32, 1)`; `.leaving { opacity: 0; transform: translateY(-100%); }` (çıkan öğe yukarı devam). Basit alternatif: çıkışta yalnız `opacity 200ms ease` |
| P2 | Marquee sonsuz kayan şerit + slide transition (`:188`) | `animation: preview-scroll 22s linear infinite`; `prefers-reduced-motion` desteği yok. Ayrıca spinnerlar (`PermissionConsoleView.vue:473`, `AvailabilityView.vue:493`) da guardsız | Sonsuz hareket reduced-motion'ın en kritik hedefi (vestibüler risk). `@media (prefers-reduced-motion: reduce) { .preview-track { animation: none; } .preview-slide-item { transition: opacity 0.2s ease; transform: none; } }`. Spinnerları istisna tut (yükleme anlamını korusun): `.pc-spin, .avl-spin { animation-duration: 1.2s !important; }` (yavaşlat) ya da statik ilerleme metni |
| P3 | Slide rotasyon zamanlayıcısı — `setInterval 5000ms` (`:98`) | Sekme gizlendiğinde interval durmuyor; geri dönünce slide'lar arka planda dönmüş | `visibilitychange` ile `document.hidden` iken `stopSlide()`, görünürken `startSlide()`; listener'ı `onUnmounted`'da kaldır. Arka planda gereksiz çalışan timer hem tutarlılık hem performans pürüzü |

**Emil formatı (P2 vurgusu):**

| Öğe | Önce | Sonra | Neden |
|-----|------|-------|-------|
| Slide geçişi (`HeaderNoticePreview.vue:172`) | `0.4s ease`, çıkan öğe aşağı iniyor | `280ms cubic-bezier(0.23, 1, 0.32, 1)`, `.leaving` yukarı | 400ms UI için uzun; sürekli akış hissinde çıkan öğe girenle aynı yöne gidemez |
| Marquee (`HeaderNoticePreview.vue:188`) | `animation … infinite`, guard yok | reduced-motion'da `animation: none` | Sonsuz hareket vestibüler rahatsızlık tetikleyebilir; sayfa boyunca durmayan tek öğe |

---

### components/system/NoticeRow.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Satır aksiyon butonları `.icon-btn` + toggle switch (`:191`) | `.icon-btn`'de transition yok — hover anlık; `:active` yok. `.slider`'da `0.15s` hardcoded (token bypass) | `.icon-btn { transition: background $t-fast, color $t-fast, transform 120ms ease-out; &:active { transform: scale(0.94); } }`. `.slider` ve `.slider::before`'da `0.15s → $t-base` (baseline'daki token bypass'lara iki ekleme daha) |

---

### components/system/LayoutPresetPicker.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Preset kartı butonları `.preset-card` (`:94`) | Hover `border-color $t-base` var; `:active` press yok | Preset uygulamak anında layout'u değiştiren aksiyon — basma onayı yoksa kullanıcı tıklamanın alındığından emin olamaz. `transition: border-color $t-base, transform 120ms ease-out; &:active { transform: scale(0.97); }` |

---

### components/system/RoleProfileEditModal.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| **P1** | Rol profili modalı — `backdrop + dialog` (`:3`) | `v-if="open"` ile blur'lu backdrop ve dialog aniden belirip kayboluyor; `<Transition>` yok | `backdrop-filter: blur(2px)`'in animasyonsuz pop'u özellikle sert. Backdrop'u `<Transition name="fade">` ile sar; `.rp-modal { transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms …; }`, `enter-from { opacity: 0; transform: scale(0.97); }`, leave 150ms. `transform-origin: center` (modal istisnası) |
| P2 | Footer butonları `.btn`, `.btn.primary` + kapat `.icon-btn` (`:428`) | 3 yerde transition tanımsız; hover (`background`, `filter: brightness(1.06)`, `color`) anlık; `:active` yok | `.btn`/`.icon-btn { transition: background-color 0.12s ease, color 0.12s ease, filter 0.12s ease, transform 120ms cubic-bezier(0.23, 1, 0.32, 1); &:active:not(:disabled) { transform: scale(0.97); } }`. Kaydet modalın en sık dokunulan noktası, sessiz kalmamalı |
| P3 | Rol seçim çipleri `.rp-role-chip` (`:366`) | `transition: all $t-fast` | `transition: all` yasak; yalnız background/color değişiyor. `transition: background-color 0.12s ease, color 0.12s ease` |

---

### components/system/ShowcaseTileEditModal.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| **P1** | Vitrin karosu modalı — `backdrop + dialog` (`:2`) | `.modal-backdrop` parent'ta `v-if` ile mount, `<Transition>` yok, exit yok | 560px form dialog'unun animasyonsuz pop'u panelin dropdown/m-sheet diliyle tutarsız. Kökü `<Transition name="fade" appear>` ile sar; `.modal { transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms …; }` giriş `scale(0.97)+opacity:0 → 1`, çıkış 150ms |
| P2 | Dil sekmeleri/tip çipleri/kapat/renk sıfırla — `.tabs button`, `.chip-group button`, `.icon-btn`, `.color-reset` (`:356`) | `.active` geçişi (background/border-color/color) transition'sız; `.tabs`/`.chip-group`/`.color-reset` hover'ı yok; `:active` yok | Ortak: `transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 120ms cubic-bezier(0.23, 1, 0.32, 1); @media (hover: hover) and (pointer: fine) { &:hover:not(.active) { background: $l-bg-subtle; } } &:active { transform: scale(0.97); }`. Hover eksikliği tıklanabilirliği belirsizleştiriyor (eksiklik de hata) |
| P2 | Form input'ları (text, datetime-local, color-text) (`:428`) | `:focus` tanımı ve transition yok — odakta yalnız tarayıcı default outline'ı (silinmiş olabilir) | Kardeş `RoleProfileEditModal` focus'ta ring verirken bu modal hiçbir odak geri bildirimi vermiyor (a11y ihlali). `transition: border-color 0.15s ease, box-shadow 0.15s ease; &:focus { outline: none; border-color: $brand; box-shadow: 0 0 0 2px rgba($brand, 0.15); }` (`RoleProfileEditModal:313-317` kalıbı) |

---

### components/system/ShowcaseTileRow.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Satır eylem butonları `.icon-btn` (düzenle/sil) (`:206`) | Hover background+color anlık (transition yok); `:active` yok | Günde onlarca kez hover edilen ikon butonları — ani renk sıçraması yerine kısa ease. Sil yıkıcı eylemde press onayı eksik. `transition: background-color 0.12s ease, color 0.12s ease, transform 120ms cubic-bezier(0.23, 1, 0.32, 1); &:active { transform: scale(0.94); }` (küçük ikon eşiği) |

---

### components/system/PermissionOverviewTab.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | KPI kartları `button.kpi` + `.btn.ghost` + `.banner-cta` (`:437`) | `.kpi` transition'ında `transform $t-fast` var ama transform'u değiştiren kural yok (yarım kalmış niyet); 3 buton tipinde `:active` yok | KPI'lar tıklanabilir buton (sekmeye götürüyor). `.kpi`/`.btn`/`.banner-cta`'ya `&:active { transform: scale(0.98); }` (kart büyük → 0.98, küçük buton → 0.97). `transform $t-fast → transform 120ms cubic-bezier(0.23, 1, 0.32, 1)`; `.banner-cta` transition'ına transform ekle |
| P3 | Audit timeline yükleme durumu (`:336`) | `.empty` içinde düz "Yükleniyor…"; KPI'lar "—" gösteriyor, skeleton yok | 4 paralel API bitince metin → 20 satırlık liste (layout shift). 5-6 sahte `.audit-item`: `.skeleton-line { background: $l-bg-muted; border-radius: 4px; animation: pulse 1.2s ease-in-out infinite; } @keyframes pulse { 50% { opacity: 0.5; } }`, yükseklik gerçek satırla aynı. Reduced-motion'da `animation: none` |
| P3 | KPI kartı hover durumu (`:445`) | `&:hover { border-color: $brand; … }` doğrudan, media query yok | Mobilde 2×2 grid birincil dokunma hedefi → sticky hover false positive. `@media (hover: hover) and (pointer: fine) { &:hover { border-color: $brand; … } }` içine al |

---

### components/upload/ProfileImageDropzone.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | Upload progress overlay `bg-black/85` (`:55`) | `v-if="… === 'uploading'"` Transition'sız — siyah %85 katman aniden beliriyor; hemen altındaki success overlay `<Transition name="fade">` ile sarılı | Dosya bırakılınca ekranın parçası animasyonsuz siyaha dönüyor; success fade alırken uploading almaması tutarsız. Uploading overlay'ini de `<Transition name="fade">` (global 0.2s) ile sar — aynı dil |
| P3 | Progress bar dolgusu (`:60`) | `class="transition-[width] duration-300 ease-out"` + `:style width` | `width` layout tetikler. Dolgu `w-full`, `:style="{ transform: 'scaleX(' + Math.max(0.06, progress/100) + ')' }"` + `class="origin-left transition-transform duration-300 ease-out"`. `transform-origin: left` şart (yoksa ortadan büyür); sabit hız için linear da olur |

---

### layouts/AuthLayout.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P2 | success/error/warning alert kutuları (`:26`) | Üç alert de `v-if` ile animasyonsuz | Auth akışının geri bildirim yüzeyi; mesajlar ani belirip kayboluyor. Her alert'i `<Transition>`: enter `opacity 0 + translateY(-4px) → 200ms cubic-bezier(0.23, 1, 0.32, 1)`, leave `opacity 150ms ease`. Yalnız opacity/transform → reduced-motion'da opacity korumak yeterli |

---

### layouts/AppLayout.vue

| Öncelik | Eleman | Mevcut | Öneri |
|---------|--------|--------|-------|
| P3 | Yüzen "Mağazaya git" butonu `.th-goto-storefront-btn` (`:146`) | `transition: background 0.15s ease` (hardcoded, token değil); `:active` yok | Kalıcı ekran öğesi buton basma onayı vermiyor. `@use "@/assets/scss/variables" as *` + `transition: background $t-base, transform 0.12s ease-out; &:active { transform: scale(0.97); }` |

---

### Önerilen Standart (components + layouts)

Bu dilim tek tip bir reçeteyle temizlenebilir; sorunlar dört kovaya düşüyor:

**1. Modal/Diyalog — animasyonsuz mount yasak.** Her Teleport/`v-if` modal (`SellerAddressesPanel:326`, `HeroSlideEditModal:3`, `NoticeEditModal:2`, `CapabilityMatrixTab:644`, `ModuleMatrixTab:617`, `RoleProfileEditModal:3`, `ShowcaseTileEditModal:2`) ortak kalıbı almalı:
```scss
/* backdrop */ transition: opacity 200ms cubic-bezier(0.23, 1, 0.32, 1);   /* enter-from { opacity: 0 } */
/* panel   */ transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms cubic-bezier(0.23, 1, 0.32, 1);
              /* enter-from { transform: scale(0.97); opacity: 0 }  — asla scale(0) */
/* leave   */ transition: opacity 150ms ease;   /* çıkış girişten hızlı */
```
`transform-origin: center` modallarda serbesttir (istisna). Minimum çözüm her yerde global `<Transition name="fade">` (opacity 0.2s).

**2. Buton press feedback — global, tek yerden.** `:active { transform: scale(0.97); }` (küçük ikon hedefleri `0.94`, tam-genişlik/büyük kart `0.98-0.99`) + `transition: … , transform 120ms cubic-bezier(0.23, 1, 0.32, 1)`. Global buton sınıflarında (`hdr-btn-primary/outlined`, `.btn`, `.icon-btn`, `.plan-toggle`, `.seg-btn`, `.kpi`) uygulandığında `RedirectForm`, `SeoTab`, `CapabilityMatrixTab`, `RoleProfileEditModal` gibi tüketiciler otomatik düzelir. `prefers-reduced-motion`'da transform kaldır.

**3. `transition: all` ve layout property animasyonu yasak.** `transition: all`'ı açık property listesiyle değiştir (`UserMenuDropdown:53`, `LayoutSectionCard:3`, `RoleProfileEditModal:366`, `SeoScoreBar:69`, `SeoTab:180`). `width`/`left`/`height` animasyonlarını GPU dostu karşılıklarına çevir: `width → transform: scaleX() + transform-origin: left` (progress barları: `LayoutSectionCard:179`, `SeoScoreBar:69`, `ProfileImageDropzone:60`); `left → translate-x` (`LayoutSectionCard:37`); `height → grid-template-rows: 0fr↔1fr` (`LayoutSectionCard:59`, `ModuleMatrixTab:434`).

**4. Skeleton + geçiş + a11y.** Her "Yükleniyor…" metni veri-yoğun yüzeylerde nihai layout'u taklit eden skeleton'a dönüşmeli (`SellerAddressesPanel:69`, `UserProfileMessagesPanel:152`, `SubscriptionPlanCard:80`, `CapabilityMatrixTab:385`, `ModuleMatrixTab:364`, `SeoTab:125`, `PermissionOverviewTab:336`), gerçek boyutta bloklar + `animate-pulse`/shimmer. Sonsuz hareket ve tüm animasyonlar `@media (prefers-reduced-motion: reduce)` altında durdurulmalı (kritik: `HeaderNoticePreview:188` marquee); spinnerlar istisna (yavaşlat, tamamen durdurma). Hover kuralları dokunmatik false-positive için `@media (hover: hover) and (pointer: fine)` arkasına (`CapabilityMatrixTab:973`, `PermissionOverviewTab:445`, `SellerAddressesPanel:86` vd.). Süre penceresi: hover/renk 120-200ms `ease`, giriş 180-280ms `cubic-bezier(0.23, 1, 0.32, 1)`, çıkış girişten hızlı — hiçbir UI animasyonu 300ms'i aşmamalı (`HeaderNoticePreview:172`'deki 400ms tek istisna, düşürülmeli).

---

