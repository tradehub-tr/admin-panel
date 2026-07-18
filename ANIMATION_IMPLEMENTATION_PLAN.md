# Admin Panel Micro-Animasyon Uygulama Yol Haritası

**Tarih:** 2026-07-18
**Kaynak:** `ANIMATION_AUDIT.md` (529 dedup bulgu — 77 P1, 217 P2, 235 P3)
**Yaklaşım:** Sistemik temeller önce → merkezi kalıplar → alan alan uygulama → cila. Aşağıdaki fazlar **sıralı** ilerler; her faz bir öncekinin token/kalıp setini varsayar.
**Kişilik hedefi:** B2B — crisp, hızlı, gösterişsiz. Her animasyon `transform`/`opacity` üzerinde, UI süreleri < 300ms, giriş `ease-out`, çıkış girişten hızlı. Fazlalık da eksiklik kadar geri alınır.

---

## Stratejik Mantık

Bulguların dağılımı yol haritasının şeklini belirliyor. 529 bulgunun **409'u `screen: all`** — yani belirli bir dosyaya değil, tüm panele yayılan tekrar eden kalıplar. Bu, işin büyük kısmının **tek noktadan** çözülebileceği anlamına gelir:

- **87 button-feedback** → tek global `:active` kuralı
- **75 transition-property** (`transition: all`) → mekanik ama toplu düzeltme
- **63 skeleton** → tek `Skeleton` bileşeni + kullanım
- **63 popup-modal** → tek `modal` Transition kalıbı
- **17 reduced-motion** → tek global media query
- **10 chart** → tek `useChart.js` config

Bu yüzden **Faz 0–2 (temeller + merkezi kalıplar) tüm bulguların ~%60'ını** kapatır. Kalan fazlar dosya-özel işçiliktir. Her faz sonunda `npm run build` ile derleme doğrulanır (macOS'ta `dist` **silinmez**, sadece build; bozulursa gateway+backend container restart — [[dist-rm-rf-breaks-docker-mount]]).

---

## FAZ 0 — Token Seti ve Global Temeller *(temel, her şeyden önce)*

**Hedef:** Motion sisteminin sözlüğünü kur. Bu faz olmadan sonraki fazların reçeteleri tutarsız kalır.
**Dosyalar:** `assets/scss/variables.scss`, `assets/scss/base.scss`, `assets/scss/animations.scss`
**Kapsadığı bulgu:** easing (6), duration (10), transform-origin (2), reduced-motion (17), performance kısmı, button-feedback global kuralı

### 0.1 — Easing + süre tokenları (`variables.scss`)

```scss
// Easing eğrileri
$ease-out: cubic-bezier(0.23, 1, 0.32, 1);       // giren/beliren eleman
$ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);   // ekranda morph/hareket
$ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);    // sheet/drawer (iOS)

// Süre kademeleri (yalnız süre)
$d-press: 130ms;  $d-fast: 150ms;  $d-pop: 200ms;  $d-modal: 240ms;  $d-sheet: 320ms;

// Geriye dönük uyum — mevcut $t-* çağrıları kırılmadan yeni eğrilere bağlanır
$t-fast: $d-fast $ease-out;
$t-base: $d-fast $ease-out;
$t-slow: $d-pop $ease-out;
$t-panel: 180ms $ease-out;
$t-spring: 250ms cubic-bezier(0.4, 0, 0.2, 1);
$t-spring-slow: 320ms cubic-bezier(0.4, 0, 0.2, 1);  // rules'ta geçen ama tanımsız olan token
```

### 0.2 — Global `:active` press + `:focus-visible` (`base.scss`)

```scss
@media (hover: hover) and (pointer: fine) {
  button:not(:disabled):active,
  [role="button"]:not(.is-disabled):active,
  a.btn:active {
    transform: scale(0.97);
    transition: transform $d-press $ease-out;
  }
}
button:focus-visible, [role="button"]:focus-visible {
  outline: 2px solid var(--brand-focus, #3b82f6);
  outline-offset: 2px;
}
```
> `base.scss:196`'daki `outline: none` (WCAG 2.4.7 ihlali) kaldırılacak.

### 0.3 — Global `prefers-reduced-motion` kill-switch (`base.scss`)

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

**Doğrulama:** Build geçer; DevTools "Emulate prefers-reduced-motion" ile hareketlerin durduğu görülür; herhangi bir butona basınca scale feedback hissedilir.

---

## FAZ 1 — Merkezi Transition Kalıpları *(modal, toast, dropdown)*

**Hedef:** "Ara sıra görülen yüzeyler" için tek tip enter/exit dili. Tek yerde tanımla, onlarca yerde kullan.
**Kapsadığı bulgu:** popup-modal (63), toast (11), dropdown (16), page-enter (3)

### 1.1 — Ortak `modal` Transition (`animations.scss`)

```scss
.modal-enter-active { transition: opacity $d-modal $ease-out; }
.modal-leave-active { transition: opacity $d-fast $ease-out; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal-panel { transition: transform $d-modal $ease-out, opacity $d-modal $ease-out; }
.modal-leave-active .modal-panel { transition: transform $d-fast $ease-out, opacity $d-fast $ease-out; }
.modal-enter-from .modal-panel, .modal-leave-to .modal-panel { transform: scale(0.96); opacity: 0; }
```
> `transform-origin: center` (modal istisnası), `scale(0.96)`'dan başlar — asla `scale(0)`.
> **Uygulama:** `ConfirmDialog.vue` (referans implementasyon) + tüm `*EditModal.vue` (HeroSlideEditModal, NoticeEditModal, RoleProfileEditModal, ShowcaseTileEditModal) `<Transition name="modal">` ile sarılır. Inline view modalları Faz 3–5'te tek tek bu kalıba bağlanır.

### 1.2 — Toast sistemi düzeltmesi (`ToastContainer.vue`, `animations.scss`, `forms.scss`)

- `forms.scss:189`'daki **çift `toastIn` tanımını** kaldır (TransitionGroup sınıfları tek kaynak).
- **`.toast-move` sınıfını tanımla** → bir toast silinince kalanların yumuşak kayması:
  ```scss
  .toast-move { transition: transform $d-pop $ease-out; }
  .toast-leave-active { position: absolute; }  /* çıkan eleman yer kaplamayı bıraksın */
  ```
- Keyframe (`toastIn`/`toastOut`) yerine **transition tabanlı** enter/exit — hızlı ardışık toast'ta kesinti/retarget için (Sonner ilkesi). Giriş ve çıkış **aynı yönden** (sağdan): `transform: translateX(16px); opacity: 0`.
- Ölü `removing` bayrağını temizle.

### 1.3 — Dropdown kalıbı denetimi

Mevcut `dropdown` Transition (enter 0.15s / leave 0.1s, translateY(-4px)) sağlam — korunur. Eksik olan: `transform-origin` tetikleyiciden gelmiyor. Menü/select açılan yönüne göre `transform-origin: top` (aşağı açılan) ayarlanır. `AppSelect`, `UserMenuDropdown`, `QuickLinksDropdown`, `LanguageSwitcher`, `NotificationPanel` gözden geçirilir.

### 1.4 — Ölü sayfa geçişi kodu

`animations.scss`'teki kullanılmayan `.page-enter-active/.page-leave-active` **silinir**. Route geçişi istenmiyor (B2B); istenirse `<router-view>` için ≤120ms fade.

**Doğrulama:** `ConfirmDialog` bir silme akışında açılıp kapanırken fade+scale görülür; toast'lar üst üste eklenip silinirken kalanlar yumuşak kayar.

---

## FAZ 2 — `transition: all` Avı + Layout-Property Temizliği

**Hedef:** Performans ve "niyet netliği". Panelin "ağır" hissini en çok azaltan mekanik faz.
**Kapsadığı bulgu:** transition-property (75), performance (16), hover (36 kısmı)

### 2.1 — `transition: all` → açık property listesi (~147 kullanım, 70 dosya)

Global SCSS'ten başla (en çok kullanılanlar): `header.scss`, `tables.scss`, `cards.scss`, `forms.scss`, `crm.scss`, `helpdesk.scss`. Her `transition: all $t-x` → ilgili property'ler:
- Butonlar → `background-color, color, border-color`
- Kartlar → `box-shadow, transform`
- Input'lar → `border-color, box-shadow`

### 2.2 — Layout-property animasyonları → `transform`

| Dosya | Önce | Sonra |
|---|---|---|
| `BaseSegmented.vue:116` | `left`/`width` thumb | sabit genişlik + `transform: translateX(...)` |
| `LayoutSectionCard.vue:37` | toggle topuzu `left` | `transform: translateX(...)` |
| `sidebar.scss` accordion | `max-height` | `grid-template-rows: 0fr→1fr` veya `transform` |
| ~onlarca progress bar | `width` | tercihen `transform: scaleX()` (mümkünse) |

**Doğrulama:** DevTools Performance/Rendering'de segmented/toggle etkileşiminde "Layout Shift" ve reflow tetiklenmediği görülür.

---

## FAZ 3 — Skeleton Yükleme Sistemi

**Hedef:** Spinner + full-swap kalıbını skeleton ile değiştir. Algılanan hız + layout stabilitesi.
**Kapsadığı bulgu:** skeleton-loading (63), empty-state (2)

### 3.1 — `Skeleton` bileşeni (`components/common/Skeleton.vue`)

Satır/kart/KPI varyantları; `animate-pulse` (opacity 1↔.4, ~1.5s `ease-in-out`) — `background-position` shimmer YASAK (paint tetikler). Tailwind preflight svg tuzağına dikkat ([[tailwind-preflight-svg-block-ortalama]]).

### 3.2 — İki modlu yükleme kalıbı

- **İlk yükleme:** skeleton göster.
- **Refetch (filtre/sekme/arama):** eski içeriği DOM'dan **söküp spinner'a dönme** — `opacity: 0.55; pointer-events: none` ile karart, içerik yerinde kalsın.

### 3.3 — Uygulama sırası (en görünür ekranlar önce)

1. CRM liste view'ları: `DealsListView`, `LeadsListView`, `ContactsListView`, `OrganizationsListView`, `TasksListView`
2. Seller: `SellerListingsView`, `SellerOrdersView`, `SellerQuestionsView`
3. Dashboard widget'ları (KPI + chart skeleton)
4. Helpdesk, permission, system listeleri
5. Detay view'ları (`ContactDetailView` — her Kaydet'te full spinner'a dönme sorunu, `DealDetailView`, `LeadDetailView`)

**Doğrulama:** Bir CRM listesinde filtre değiştirildiğinde scroll sıfırlanmıyor, içerik yerinde kararıp güncelleniyor.

---

## FAZ 4 — Chart ve Dashboard Animasyonları

**Hedef:** "Oyuncak" hissini gider; veri güncellemesinde sıfırdan yeniden animasyon olmasın.
**Kapsadığı bulgu:** chart (10), dashboard widget hover/pop-in

### 4.1 — `useChart.js` merkezi config (`composables/dashboard/useChart.js:50`)

```js
const baseAnim = {
  animationDuration: 300, animationEasing: 'cubicOut',
  animationDurationUpdate: 200, animationEasingUpdate: 'cubicOut',
}
// setOption(option, { notMerge: true }) → veri güncellemesinde notMerge: false (diff/merge)
```
Tek noktadan 7 dashboard × 4 widget tipi (bar/pie/line/gauge) düzelir. `BaseChart.vue` de aynı config'i alır.

### 4.2 — Dashboard widget geçişleri

`cards.scss:32` KPI hover lift'e `transition: box-shadow, transform` ekle; spinner→pop-in yerine skeleton (Faz 3'ten). `WidgetWrapper`, `DashboardGrid` gözden geçir.

**Doğrulama:** Dashboard'da period filtresi değiştirildiğinde chart 200ms'de yumuşak morph yapar, baştan büyümez.

---

## FAZ 5 — Mobil ve Tablet Dokunma Katmanı

**Hedef:** Dokunmatik feedback + sheet giriş/çıkış simetrisi.
**Kapsadığı bulgu:** mobile (30), tablet (1)

- **Sheet çıkış animasyonu:** `OrderMobile`, `UserProfileMobile`, `CartMobile` + tüm custom `.m-sheet` kullanan yerler — yalnız giriş keyframe'i var, çıkışta ani yok oluyor. `$ease-drawer` ile giriş+çıkış simetrik ([[mesajlar-mobil-v3]], [[abonelik-mobil-v4-liste-secim]] kalıplarıyla uyumlu).
- **`.m-item` dokunma feedback'i** (`mobile-nav.scss:255`): en sık dokunulan eleman, `:active` background/scale.
- **Mobil master-detail overlay** (`BuyerMessagesView.vue:341`): animasyonsuz açılıyor → slide+fade.
- **Hover sızması:** dokunmatikte `:hover` efektleri `@media (hover: hover)` arkasına alınır (Faz 0.2 zaten global press'i koruyor).
- Tailwind kaydırılmış kırılımlar ([[tailwind-sm-md-varyantlari-olu]]) ve tablet ara aralığı (768–1024) kontrol.

**Doğrulama:** Gerçek/emüle mobilde bir sheet açılıp kapanırken simetrik kayar; nav satırına dokununca feedback var.

---

## FAZ 6 — Form Feedback + Kalan P2/P3 Cila

**Hedef:** Optimistic feedback boşlukları ve dosya-özel ince ayarlar.
**Kapsadığı bulgu:** form-feedback (38), list-stagger (9), keyboard (8), other (26), kalan P3'ler

- **Optimistic + hata feedback:** `TasksListView.vue:453` checkbox hatayı sessizce yutuyor; benzer form/toggle'lar toast + geri alma ile.
- **Tanımsız buton sınıfları:** `CommissionAdminView.vue:50` `.th-btn-*` stilsiz → tanımla veya standart butona çevir.
- **Kalıp tutarsızlığı:** `SlideOverPanel.vue` iki farklı drawer implementasyonu (400ms Vue Transition vs 250ms class-toggle) → tek kalıba indir.
- **Stagger:** yalnızca ilk mount'ta, ≤80ms adım, etkileşimi bloklamadan (KPI kartları zaten iyi — korunur). Filtre değişiminde yeniden stagger YASAK.
- **Klavye:** `GlobalSearch`/komut paleti animasyonsuz/hızlı kalmalı ([[mobil-header-v3-komut-paleti]]) — mevcut doğru davranış korunur.

**Doğrulama:** Task checkbox işaretlenince anında güncellenir, hata olursa geri alınır + toast.

---

## Faz Özeti ve Etki

| Faz | Konu | ~Bulgu | Dosya | Etki |
|---|---|---|---|---|
| 0 | Token + global press + reduced-motion | ~50 | 3 SCSS | Tüm panel temeli |
| 1 | Modal/toast/dropdown kalıpları | ~90 | ~10 | En görünür eksikler |
| 2 | `transition: all` + layout temizliği | ~90 | ~70 | Performans/akıcılık |
| 3 | Skeleton sistemi | ~65 | ~40 | Algılanan hız |
| 4 | Chart/dashboard | ~15 | ~15 | "Oyuncak" → profesyonel |
| 5 | Mobil/tablet dokunma | ~31 | ~20 | Dokunmatik his |
| 6 | Form feedback + cila | ~180 | dağınık | Tamamlama |

**Faz 0–2 birlikte bulguların ~%45'ini, en görünür his kazançlarının çoğunu** verir; buradan sonra ekran-özel işçilik. Her faz bağımsız olarak sevk edilebilir (incremental).

## Riskler ve Notlar

- **Build kuralı:** `dist` silme yok, `npm run build` ([[dist-rm-rf-breaks-docker-mount]]).
- **Dashboard widget renkleri DB'den** ([[dashboard-widget-renkleri-dbden-gelir]]) — animasyon işi renkleri etkilemez, ama widget dokunurken dikkat.
- **Geriye dönük uyum:** Faz 0'daki `$t-*` yeniden bağlama sayesinde mevcut ~200 çağrı kırılmadan yeni easing'e geçer — bu yüzden token faz'ı önce.
- **Kapsam disiplini:** "ne eksik ne fazla" — bu plan yeni gösterişli animasyon EKLEMİYOR; eksik mikro-feedback'i tamamlıyor ve yanlış property/süreyi düzeltiyor.
