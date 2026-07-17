## [v1.11.0-alpha.2] - 2026-07-17 ALPHA

Bu surum alpha.istoc.com/panel'de gelistirme asamasindadir.

### Duzeltildi
- fix(security): Chat XSS koruması + PII reveal audit (@boraydeger32)
  - v-html sanitizeHtml() ile sarıldı (F-019) UserProfileMessagesPanel.vue, BuyerMessagesView.vue
  - DataMaskingField: PII reveal server-side audit çağrısı (F-041)

---
## [v1.11.0-alpha.1] - 2026-07-16 ALPHA

Bu surum alpha.istoc.com/panel'de gelistirme asamasindadir.

### Duzeltildi
- fix: route guard, XSS koruması, memory leak ve ölü kod temizliği (@boraydeger32)
  - requiresAdmin router guard eklendi (router/index.js)
  - v-html sanitizeHtml katmanı: ListingModeration, TicketDetail, SellerInquiryDetail, ActivityTimeline
  - sanitize.js util modülü oluşturuldu
  - window.__router production'da gizlendi (main.js)
  - Nginx güvenlik headerları: CSP, HSTS, X-Frame-Options
  - CSP'ye Google Fonts izni eklendi
  - Chart.js memory leak — onBeforeUnmount destroy (ListingFormView.vue)
  - ForgotPasswordView.vue silindi (router'da yok)
  - RegisterView.vue silindi (router'da yok)
  - $t-spring-slow kullanılmayan SCSS değişkeni silindi
  - CI/CD npm audit adımı eklendi (lint.yml)
  - Node 20 → 22 Dockerfile ile uyum (lint.yml)

---
## [v1.11.0] - 2026-07-14 PROD

Bu surum istoc.com/panel'de yayindadir.

### Eklendi
- feat(storefront): mobil PDP, chat, hero ve vitrin yenilemeleri eklendi (@ahmeetseker)
  - Mobil ürün detay sayfası Alibaba tarzında yeniden tasarlandı: MediaViewer galerisi, OptionsSheet varyant seçimi, simetrik alt aksiyon barı; "Soru sor" QAModal'a bağlandı
  - Chat: konuşma okundu işaretleme (unread rozet sıfırlama) ve mesaja gömülü ürün marker'ı eklendi; sabitlenen ürün konuşma-başına izole edildi
  - Ana sayfa hero split yapıya geçirildi: Sarı İmza slider + En İyi Fırsatlar/RFQ yan paneli (HeroSidePanel)
  - Size Özel Seçimler hero'su sahne + kanal şeridi + sparkline tasarımıyla yenilendi; Swiper/coverflow bağımlılığı ve mock veri dosyası kaldırıldı
  - Paylaşılan ListingCard ve Pagination bileşenleri eklendi; Top Fırsatlar, Top Sıralama ve kategori grid'leri zengin karta geçirildi
  - Kategori Vitrini'ne mock modu (?mock_cs=1) ve redesign uygulandı
  - Siparişler: İadeler ve Değerlendirmeler sekmeleri yeniden tasarlandı; kullanılmayan kupon modülü silindi
  - KYC, KYB ve Adresler sayfaları responsive iyileştirildi; KYB başvuru durumu Pending→Draft mantık hatası düzeltildi
  - Buyer dashboard mobil düzeni düzeltildi (KYB banner, KPI grid, eksenler)
  - Mobil menü drawer'ı TopBar'dan çıkarılıp MobileDashboardNav'a taşındı
  - Mağaza başlığı rozet satırı sadeleştirildi; Tedarikçi sekmesi yalnız ikonlu kayıt satırlarına indirildi
  - Auth sayfalarında beyaz iSTOC logosu kullanıldı
  - chatPopup, ListingCard ve Pagination için testler eklendi; 4 dil dosyası güncellendi

### Duzeltildi
- fix(admin-panel): dev backend portu 8001 + admin route guard boşlukları kapatıldı (@boraydeger32)
  - .env.development: VITE_FRAPPE_BACKEND/SOCKETIO 8000→8001 (realestate stack'i 8000'i tuttuğundan TradeHub 8001'e taşındı; login HTTP 404 çözüldü).
  - router: guard'a generic `meta.roles` (auth.canAccess ile) ve `requiresAdmin` kontrolü eklendi → menüde gizli olan compliance/procurement/approval/delegation ve cert-verification route'ları artık URL'den de erişilemez (fail-closed).
  - navigation store: module-mode fail-open davranışı dokümante edildi.

---
## [v1.10.0-rc.1] - 2026-07-14 RC

Bu surum rc.istoc.com/panel'de onay asamasindadir.

### Eklendi
- feat(storefront): mobil PDP, chat, hero ve vitrin yenilemeleri eklendi (@ahmeetseker)
  - Mobil ürün detay sayfası Alibaba tarzında yeniden tasarlandı: MediaViewer galerisi, OptionsSheet varyant seçimi, simetrik alt aksiyon barı; "Soru sor" QAModal'a bağlandı
  - Chat: konuşma okundu işaretleme (unread rozet sıfırlama) ve mesaja gömülü ürün marker'ı eklendi; sabitlenen ürün konuşma-başına izole edildi
  - Ana sayfa hero split yapıya geçirildi: Sarı İmza slider + En İyi Fırsatlar/RFQ yan paneli (HeroSidePanel)
  - Size Özel Seçimler hero'su sahne + kanal şeridi + sparkline tasarımıyla yenilendi; Swiper/coverflow bağımlılığı ve mock veri dosyası kaldırıldı
  - Paylaşılan ListingCard ve Pagination bileşenleri eklendi; Top Fırsatlar, Top Sıralama ve kategori grid'leri zengin karta geçirildi
  - Kategori Vitrini'ne mock modu (?mock_cs=1) ve redesign uygulandı
  - Siparişler: İadeler ve Değerlendirmeler sekmeleri yeniden tasarlandı; kullanılmayan kupon modülü silindi
  - KYC, KYB ve Adresler sayfaları responsive iyileştirildi; KYB başvuru durumu Pending→Draft mantık hatası düzeltildi
  - Buyer dashboard mobil düzeni düzeltildi (KYB banner, KPI grid, eksenler)
  - Mobil menü drawer'ı TopBar'dan çıkarılıp MobileDashboardNav'a taşındı
  - Mağaza başlığı rozet satırı sadeleştirildi; Tedarikçi sekmesi yalnız ikonlu kayıt satırlarına indirildi
  - Auth sayfalarında beyaz iSTOC logosu kullanıldı
  - chatPopup, ListingCard ve Pagination için testler eklendi; 4 dil dosyası güncellendi

### Duzeltildi
- fix(admin-panel): dev backend portu 8001 + admin route guard boşlukları kapatıldı (@boraydeger32)
  - .env.development: VITE_FRAPPE_BACKEND/SOCKETIO 8000→8001 (realestate stack'i 8000'i tuttuğundan TradeHub 8001'e taşındı; login HTTP 404 çözüldü).
  - router: guard'a generic `meta.roles` (auth.canAccess ile) ve `requiresAdmin` kontrolü eklendi → menüde gizli olan compliance/procurement/approval/delegation ve cert-verification route'ları artık URL'den de erişilemez (fail-closed).
  - navigation store: module-mode fail-open davranışı dokümante edildi.

---
## [v1.10.0-alpha.2] - 2026-07-10 ALPHA

Bu surum alpha.istoc.com/panel'de gelistirme asamasindadir.

### Eklendi
- feat(storefront): mobil PDP, chat, hero ve vitrin yenilemeleri eklendi (@ahmeetseker)
  - Mobil ürün detay sayfası Alibaba tarzında yeniden tasarlandı: MediaViewer galerisi, OptionsSheet varyant seçimi, simetrik alt aksiyon barı; "Soru sor" QAModal'a bağlandı
  - Chat: konuşma okundu işaretleme (unread rozet sıfırlama) ve mesaja gömülü ürün marker'ı eklendi; sabitlenen ürün konuşma-başına izole edildi
  - Ana sayfa hero split yapıya geçirildi: Sarı İmza slider + En İyi Fırsatlar/RFQ yan paneli (HeroSidePanel)
  - Size Özel Seçimler hero'su sahne + kanal şeridi + sparkline tasarımıyla yenilendi; Swiper/coverflow bağımlılığı ve mock veri dosyası kaldırıldı
  - Paylaşılan ListingCard ve Pagination bileşenleri eklendi; Top Fırsatlar, Top Sıralama ve kategori grid'leri zengin karta geçirildi
  - Kategori Vitrini'ne mock modu (?mock_cs=1) ve redesign uygulandı
  - Siparişler: İadeler ve Değerlendirmeler sekmeleri yeniden tasarlandı; kullanılmayan kupon modülü silindi
  - KYC, KYB ve Adresler sayfaları responsive iyileştirildi; KYB başvuru durumu Pending→Draft mantık hatası düzeltildi
  - Buyer dashboard mobil düzeni düzeltildi (KYB banner, KPI grid, eksenler)
  - Mobil menü drawer'ı TopBar'dan çıkarılıp MobileDashboardNav'a taşındı
  - Mağaza başlığı rozet satırı sadeleştirildi; Tedarikçi sekmesi yalnız ikonlu kayıt satırlarına indirildi
  - Auth sayfalarında beyaz iSTOC logosu kullanıldı
  - chatPopup, ListingCard ve Pagination için testler eklendi; 4 dil dosyası güncellendi

---
## [v1.10.0-alpha.1] - 2026-07-10 ALPHA

Bu surum alpha.istoc.com/panel'de gelistirme asamasindadir.

### Duzeltildi
- fix(admin-panel): dev backend portu 8001 + admin route guard boşlukları kapatıldı (@boraydeger32)
  - .env.development: VITE_FRAPPE_BACKEND/SOCKETIO 8000→8001 (realestate stack'i 8000'i tuttuğundan TradeHub 8001'e taşındı; login HTTP 404 çözüldü).
  - router: guard'a generic `meta.roles` (auth.canAccess ile) ve `requiresAdmin` kontrolü eklendi → menüde gizli olan compliance/procurement/approval/delegation ve cert-verification route'ları artık URL'den de erişilemez (fail-closed).
  - navigation store: module-mode fail-open davranışı dokümante edildi.

---
## [v1.10.0] - 2026-07-03 PROD

Bu surum istoc.com/panel'de yayindadir.

### Eklendi
- feat: video bölümlerini upload-only yap + upload UX + nav temizliği (@boraydeger32)
  - media: ürün + fabrika videosu URL input → video upload (maks 10MB, önizleme)
  - upload UX (DocTypeFormView): yükleme öncesi boyut kontrolü + net hata (413 HTML→mesaj), bozuk görselde @error gizleme, video dosyasına <video> önizleme, child-table kolonlarında depends_on'u satıra göre değerlendirme
  - i18n: video/uploadVideo/videoUploaded/videoTooLarge
  - nav: süper-admin'den "Satıcı Siparişleri" kaldırıldı (sayfa satıcıya-özel; admin "Tüm Siparişler" kullanır)
- feat(dogrulama): satıcı doğrulama yönetimi ve boş kategori gizleme eklendi (@ahmeetseker)
  - Admin doğrulama kaynakları (TSE, CE vb.) yönetim ekranı eklendi
  - Admin satıcı doğrulama kuyruğu (onay/red) ekranı eklendi
  - Satıcı doğrulama başvuru ekranı eklendi
  - İlgili route'lar ve menü öğeleri eklendi
  - Administrator için "Boş kategorileri gizle" toggle'ı ve get_category_admin_settings / set_hide_empty_categories entegrasyonu eklendi
  - 4 dil için (tr/en/ar/ru) çeviriler eklendi
- feat(verification): denetim talebi ve planlama arayüzü eklendi (@ahmeetseker)
  - satıcı: belgesiz "Denetim Talep Et" + var olan talebe belge yükleme
  - admin kuyruğu: Requested/Scheduled kayıtları listeleme + denetim planlama
  - "Doğrulamalarım" nav item'ı Sertifikalar grubundan KYB komşusuna taşındı
  - 4 dil (tr/en/ru/ar) i18n anahtarları

### Duzeltildi
- fix: teknik özellik kaydı, satıcı nav, product type ikonları ve sayfa koruma (@boraydeger32)
  - listing-form: teknik özellikler kaydedilmiyordu — taban attribute_label/value varsayılan dilden senkronlanıyor (applyAttributeBaseFromDefaultLang)
  - nav: satıcı navigasyonundan "Özellik Yönetimi" grubu kaldırıldı
  - catalog: Product Type ikonları liste satırlarında (DocTypeListView) ve tip seçicide (LinkInput iconField) gösteriliyor
  - seller-listings: düzenleyip dönünce bulunulan sayfada kal (page URL'e senkron + returnTo=route.fullPath)
- fix(auth): giriş formu otomatik doldurma uyumu düzeltildi (@ahmeetseker)
  - Alanlar <form> + submit yapısına alındı, manuel @click/@keydown kaldırıldı
  - autocomplete (username / current-password) öznitelikleri eklendi
  - email input tipi password manager uyumu için text yapıldı

### Degistirildi
- refactor(nav): Tedarikçi Profili menü öğesi kaldırıldı (@aliiball)
  - Ölü Supplier Profile DocType'ı menüden, 4 dil i18n'inden ve ADMIN_ONLY guard'larından temizlendi
- refactor(mesajlar): mesaj paneli kod formatlaması düzenlendi (@ahmeetseker)
  - UserProfileMessagesPanel uzun satırları çok satıra bölündü
- refactor(admin-nav): rozet/doğrulama öğeleri KYB grubuna taşındı (@ahmeetseker)
  - "Doğrulama Kaynakları" + "Satıcı Doğrulama Kuyruğu" Sertifika Yönetimi grubundan alınıp KYB'nin yanına (Başvuru ve Profil) taşındı — satıcı panelindeki /my-verifications ile simetrik
  - "Doğrulama Kaynakları" → "Satıcı Rozet Kaynakları" olarak yeniden adlandırıldı (nav, sayfa başlığı, breadcrumb; tr/en/ru/ar)
  - Verification Source sayfa alt başlığı rozet/otorite vurgusuyla netleştirildi

---
## [v1.9.0-rc.1] - 2026-07-03 RC

Bu surum rc.istoc.com/panel'de onay asamasindadir.

### Eklendi
- feat: video bölümlerini upload-only yap + upload UX + nav temizliği (@boraydeger32)
  - media: ürün + fabrika videosu URL input → video upload (maks 10MB, önizleme)
  - upload UX (DocTypeFormView): yükleme öncesi boyut kontrolü + net hata (413 HTML→mesaj), bozuk görselde @error gizleme, video dosyasına <video> önizleme, child-table kolonlarında depends_on'u satıra göre değerlendirme
  - i18n: video/uploadVideo/videoUploaded/videoTooLarge
  - nav: süper-admin'den "Satıcı Siparişleri" kaldırıldı (sayfa satıcıya-özel; admin "Tüm Siparişler" kullanır)
- feat(dogrulama): satıcı doğrulama yönetimi ve boş kategori gizleme eklendi (@ahmeetseker)
  - Admin doğrulama kaynakları (TSE, CE vb.) yönetim ekranı eklendi
  - Admin satıcı doğrulama kuyruğu (onay/red) ekranı eklendi
  - Satıcı doğrulama başvuru ekranı eklendi
  - İlgili route'lar ve menü öğeleri eklendi
  - Administrator için "Boş kategorileri gizle" toggle'ı ve get_category_admin_settings / set_hide_empty_categories entegrasyonu eklendi
  - 4 dil için (tr/en/ar/ru) çeviriler eklendi
- feat(verification): denetim talebi ve planlama arayüzü eklendi (@ahmeetseker)
  - satıcı: belgesiz "Denetim Talep Et" + var olan talebe belge yükleme
  - admin kuyruğu: Requested/Scheduled kayıtları listeleme + denetim planlama
  - "Doğrulamalarım" nav item'ı Sertifikalar grubundan KYB komşusuna taşındı
  - 4 dil (tr/en/ru/ar) i18n anahtarları

### Duzeltildi
- fix: teknik özellik kaydı, satıcı nav, product type ikonları ve sayfa koruma (@boraydeger32)
  - listing-form: teknik özellikler kaydedilmiyordu — taban attribute_label/value varsayılan dilden senkronlanıyor (applyAttributeBaseFromDefaultLang)
  - nav: satıcı navigasyonundan "Özellik Yönetimi" grubu kaldırıldı
  - catalog: Product Type ikonları liste satırlarında (DocTypeListView) ve tip seçicide (LinkInput iconField) gösteriliyor
  - seller-listings: düzenleyip dönünce bulunulan sayfada kal (page URL'e senkron + returnTo=route.fullPath)
- fix(auth): giriş formu otomatik doldurma uyumu düzeltildi (@ahmeetseker)
  - Alanlar <form> + submit yapısına alındı, manuel @click/@keydown kaldırıldı
  - autocomplete (username / current-password) öznitelikleri eklendi
  - email input tipi password manager uyumu için text yapıldı

### Degistirildi
- refactor(nav): Tedarikçi Profili menü öğesi kaldırıldı (@aliiball)
  - Ölü Supplier Profile DocType'ı menüden, 4 dil i18n'inden ve ADMIN_ONLY guard'larından temizlendi
- refactor(mesajlar): mesaj paneli kod formatlaması düzenlendi (@ahmeetseker)
  - UserProfileMessagesPanel uzun satırları çok satıra bölündü
- refactor(admin-nav): rozet/doğrulama öğeleri KYB grubuna taşındı (@ahmeetseker)
  - "Doğrulama Kaynakları" + "Satıcı Doğrulama Kuyruğu" Sertifika Yönetimi grubundan alınıp KYB'nin yanına (Başvuru ve Profil) taşındı — satıcı panelindeki /my-verifications ile simetrik
  - "Doğrulama Kaynakları" → "Satıcı Rozet Kaynakları" olarak yeniden adlandırıldı (nav, sayfa başlığı, breadcrumb; tr/en/ru/ar)
  - Verification Source sayfa alt başlığı rozet/otorite vurgusuyla netleştirildi

---
## [v1.9.0-alpha.5] - 2026-07-02 ALPHA

Bu surum alpha.istoc.com/panel'de gelistirme asamasindadir.

### Degistirildi
- refactor(admin-nav): rozet/doğrulama öğeleri KYB grubuna taşındı (@ahmeetseker)
  - "Doğrulama Kaynakları" + "Satıcı Doğrulama Kuyruğu" Sertifika Yönetimi grubundan alınıp KYB'nin yanına (Başvuru ve Profil) taşındı — satıcı panelindeki /my-verifications ile simetrik
  - "Doğrulama Kaynakları" → "Satıcı Rozet Kaynakları" olarak yeniden adlandırıldı (nav, sayfa başlığı, breadcrumb; tr/en/ru/ar)
  - Verification Source sayfa alt başlığı rozet/otorite vurgusuyla netleştirildi

---
## [v1.9.0-alpha.4] - 2026-07-01 ALPHA

Bu surum alpha.istoc.com/panel'de gelistirme asamasindadir.

### Eklendi
- feat(verification): denetim talebi ve planlama arayüzü eklendi (@ahmeetseker)
  - satıcı: belgesiz "Denetim Talep Et" + var olan talebe belge yükleme
  - admin kuyruğu: Requested/Scheduled kayıtları listeleme + denetim planlama
  - "Doğrulamalarım" nav item'ı Sertifikalar grubundan KYB komşusuna taşındı
  - 4 dil (tr/en/ru/ar) i18n anahtarları

---
## [v1.9.0-alpha.3] - 2026-06-30 ALPHA

Bu surum alpha.istoc.com/panel'de gelistirme asamasindadir.

### Eklendi
- feat(dogrulama): satıcı doğrulama yönetimi ve boş kategori gizleme eklendi (@ahmeetseker)
  - Admin doğrulama kaynakları (TSE, CE vb.) yönetim ekranı eklendi
  - Admin satıcı doğrulama kuyruğu (onay/red) ekranı eklendi
  - Satıcı doğrulama başvuru ekranı eklendi
  - İlgili route'lar ve menü öğeleri eklendi
  - Administrator için "Boş kategorileri gizle" toggle'ı ve get_category_admin_settings / set_hide_empty_categories entegrasyonu eklendi
  - 4 dil için (tr/en/ar/ru) çeviriler eklendi

### Duzeltildi
- fix(auth): giriş formu otomatik doldurma uyumu düzeltildi (@ahmeetseker)
  - Alanlar <form> + submit yapısına alındı, manuel @click/@keydown kaldırıldı
  - autocomplete (username / current-password) öznitelikleri eklendi
  - email input tipi password manager uyumu için text yapıldı

### Degistirildi
- refactor(mesajlar): mesaj paneli kod formatlaması düzenlendi (@ahmeetseker)
  - UserProfileMessagesPanel uzun satırları çok satıra bölündü

---
## [v1.9.0-alpha.2] - 2026-06-30 ALPHA

Bu surum alpha.istoc.com/panel'de gelistirme asamasindadir.

### Eklendi
- feat: video bölümlerini upload-only yap + upload UX + nav temizliği (@boraydeger32)
  - media: ürün + fabrika videosu URL input → video upload (maks 10MB, önizleme)
  - upload UX (DocTypeFormView): yükleme öncesi boyut kontrolü + net hata (413 HTML→mesaj), bozuk görselde @error gizleme, video dosyasına <video> önizleme, child-table kolonlarında depends_on'u satıra göre değerlendirme
  - i18n: video/uploadVideo/videoUploaded/videoTooLarge
  - nav: süper-admin'den "Satıcı Siparişleri" kaldırıldı (sayfa satıcıya-özel; admin "Tüm Siparişler" kullanır)

### Duzeltildi
- fix: teknik özellik kaydı, satıcı nav, product type ikonları ve sayfa koruma (@boraydeger32)
  - listing-form: teknik özellikler kaydedilmiyordu — taban attribute_label/value varsayılan dilden senkronlanıyor (applyAttributeBaseFromDefaultLang)
  - nav: satıcı navigasyonundan "Özellik Yönetimi" grubu kaldırıldı
  - catalog: Product Type ikonları liste satırlarında (DocTypeListView) ve tip seçicide (LinkInput iconField) gösteriliyor
  - seller-listings: düzenleyip dönünce bulunulan sayfada kal (page URL'e senkron + returnTo=route.fullPath)

---
## [v1.9.0-alpha.1] - 2026-06-30 ALPHA

Bu surum alpha.istoc.com/panel'de gelistirme asamasindadir.

### Degistirildi
- refactor(nav): Tedarikçi Profili menü öğesi kaldırıldı (@aliiball)
  - Ölü Supplier Profile DocType'ı menüden, 4 dil i18n'inden ve ADMIN_ONLY guard'larından temizlendi

---
## [v1.9.0] - 2026-06-29 PROD

Bu surum istoc.com/panel'de yayindadir.

### Eklendi
- feat(onboarding): panel genelinde sayfa-içi tur (usePageTour) ekle (@boraydeger32)
  - PermissionConsoleView: sekmeler dikey ray altında mantıksal gruplara ayrıldı (Genel/Erişim/Güvenlik/Planlar/Yönetim)
  - dokunulan dosyalarda Prettier format geçişi
- feat(common): şema-tabanlı enterprise DataTable altyapısı eklendi (@aliiball)
  - useDataTable: filtre/sıralama/sütun-görünürlük/sayfa state'i (server-side)
  - DataTable: sütun-başı funnel filtre (body'ye teleport), çoklu sıralama, sütun göster/gizle
  - DataTableToolbar: arama + Filtreler çekmecesi + aktif çipler (tüm modlarda)
  - ListPagination: sayfa başına kayıt seçici (10/20/50/100)
- feat(common): hücre-içi düzenleme ve platform kategori ağaç seçici bileşenleri eklendi (@aliiball)
  - EditableCell: tıkla-düzenle, onay popup'ı ile commit
  - CategoryTreePicker: platform kategori ağacı modal'ı (arama + breadcrumb)
- feat(seller-listings): Ürünlerim sayfası enterprise tabloya taşındı (@aliiball)
- feat(bulk-import): ürün dışa aktarma arayüzü eklendi (@aliiball)
  - Toplu Yükleme ekranı: "Mevcut ürünlerimi dışa aktar" (Excel/CSV + durum/ kategori/arama filtresi)
  - Ürünlerim toolbar: tüm ürünleri şablon formatında dışa aktar (Excel/CSV)
  - downloadFile yardımcısı (fetch+blob): boş sonuç/hatada sunucu hata sayfasına atmaz, toast gösterir

### Duzeltildi
- fix(icons): lucide Filter→Funnel alias eklendi (@aliiball)

---
## [v1.8.0-rc.1] - 2026-06-29 RC

Bu surum rc.istoc.com/panel'de onay asamasindadir.

### Eklendi
- feat(onboarding): panel genelinde sayfa-içi tur (usePageTour) ekle (@boraydeger32)
  - PermissionConsoleView: sekmeler dikey ray altında mantıksal gruplara ayrıldı (Genel/Erişim/Güvenlik/Planlar/Yönetim)
  - dokunulan dosyalarda Prettier format geçişi
- feat(common): şema-tabanlı enterprise DataTable altyapısı eklendi (@aliiball)
  - useDataTable: filtre/sıralama/sütun-görünürlük/sayfa state'i (server-side)
  - DataTable: sütun-başı funnel filtre (body'ye teleport), çoklu sıralama, sütun göster/gizle
  - DataTableToolbar: arama + Filtreler çekmecesi + aktif çipler (tüm modlarda)
  - ListPagination: sayfa başına kayıt seçici (10/20/50/100)
- feat(common): hücre-içi düzenleme ve platform kategori ağaç seçici bileşenleri eklendi (@aliiball)
  - EditableCell: tıkla-düzenle, onay popup'ı ile commit
  - CategoryTreePicker: platform kategori ağacı modal'ı (arama + breadcrumb)
- feat(seller-listings): Ürünlerim sayfası enterprise tabloya taşındı (@aliiball)
- feat(bulk-import): ürün dışa aktarma arayüzü eklendi (@aliiball)
  - Toplu Yükleme ekranı: "Mevcut ürünlerimi dışa aktar" (Excel/CSV + durum/ kategori/arama filtresi)
  - Ürünlerim toolbar: tüm ürünleri şablon formatında dışa aktar (Excel/CSV)
  - downloadFile yardımcısı (fetch+blob): boş sonuç/hatada sunucu hata sayfasına atmaz, toast gösterir

### Duzeltildi
- fix(icons): lucide Filter→Funnel alias eklendi (@aliiball)

---
## [v1.8.0-beta.2] - 2026-06-29 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(bulk-import): ürün dışa aktarma arayüzü eklendi (@aliiball)
  - Toplu Yükleme ekranı: "Mevcut ürünlerimi dışa aktar" (Excel/CSV + durum/ kategori/arama filtresi)
  - Ürünlerim toolbar: tüm ürünleri şablon formatında dışa aktar (Excel/CSV)
  - downloadFile yardımcısı (fetch+blob): boş sonuç/hatada sunucu hata sayfasına atmaz, toast gösterir

---
## [v1.8.0-alpha.3] - 2026-06-29 ALPHA

Bu surum alpha.istoc.com/panel'de gelistirme asamasindadir.

### Eklendi
- feat(bulk-import): ürün dışa aktarma arayüzü eklendi (@aliiball)
  - Toplu Yükleme ekranı: "Mevcut ürünlerimi dışa aktar" (Excel/CSV + durum/ kategori/arama filtresi)
  - Ürünlerim toolbar: tüm ürünleri şablon formatında dışa aktar (Excel/CSV)
  - downloadFile yardımcısı (fetch+blob): boş sonuç/hatada sunucu hata sayfasına atmaz, toast gösterir

---
## [v1.8.0-alpha.2] - 2026-06-29 ALPHA

Bu surum alpha.istoc.com/panel'de gelistirme asamasindadir.

### Eklendi
- feat(common): şema-tabanlı enterprise DataTable altyapısı eklendi (@aliiball)
  - useDataTable: filtre/sıralama/sütun-görünürlük/sayfa state'i (server-side)
  - DataTable: sütun-başı funnel filtre (body'ye teleport), çoklu sıralama, sütun göster/gizle
  - DataTableToolbar: arama + Filtreler çekmecesi + aktif çipler (tüm modlarda)
  - ListPagination: sayfa başına kayıt seçici (10/20/50/100)
- feat(common): hücre-içi düzenleme ve platform kategori ağaç seçici bileşenleri eklendi (@aliiball)
  - EditableCell: tıkla-düzenle, onay popup'ı ile commit
  - CategoryTreePicker: platform kategori ağacı modal'ı (arama + breadcrumb)
- feat(seller-listings): Ürünlerim sayfası enterprise tabloya taşındı (@aliiball)

### Duzeltildi
- fix(icons): lucide Filter→Funnel alias eklendi (@aliiball)

---
## [v1.8.0-alpha.1] - 2026-06-26 ALPHA

Bu surum alpha.istoc.com/panel'de gelistirme asamasindadir.

### Eklendi
- feat(onboarding): panel genelinde sayfa-içi tur (usePageTour) ekle (@boraydeger32)
  - PermissionConsoleView: sekmeler dikey ray altında mantıksal gruplara ayrıldı (Genel/Erişim/Güvenlik/Planlar/Yönetim)
  - dokunulan dosyalarda Prettier format geçişi

---
## [v1.8.0] - 2026-06-26 PROD

Bu surum istoc.com/panel'de yayindadir.

### Eklendi
- feat(seller): User Profile formuna gömülü Mesajlarım paneli (@aliturguttursab)

---
## [v1.7.3-rc.1] - 2026-06-26 RC

Bu surum rc.istoc.com/panel'de onay asamasindadir.

### Eklendi
- feat(seller): User Profile formuna gömülü Mesajlarım paneli (@aliturguttursab)

---
## [v1.7.3-alpha.1] - 2026-06-25 ALPHA

Bu surum alpha.istoc.com/panel'de gelistirme asamasindadir.

### Eklendi
- feat(seller): User Profile formuna gömülü Mesajlarım paneli (@aliturguttursab)

---
## [v1.7.1] - 2026-06-22 PROD

Bu surum istoc.com/panel'de yayindadir.

### Duzeltildi
- fix(i18n): nav.item.categoryTranslations çevirisini ekle (en/tr/ar/ru) (@aliturguttursab)

---
## [v1.7.0-rc.1] - 2026-06-22 RC

Bu surum rc.istoc.com/panel'de onay asamasindadir.

### Duzeltildi
- fix(i18n): nav.item.categoryTranslations çevirisini ekle (en/tr/ar/ru) (@aliturguttursab)

---
## [v1.7.0-beta.1] - 2026-06-18 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Duzeltildi
- fix(i18n): nav.item.categoryTranslations çevirisini ekle (en/tr/ar/ru) (@aliturguttursab)

---
## [v1.7.0] - 2026-06-17 PROD

Bu surum istoc.com/panel'de yayindadir.

### Eklendi
- feat(panel): sayfa-içi onboarding tur'larını view'lara yay (@aliturguttursab)

---
## [v1.6.4-rc.1] - 2026-06-17 RC

Bu surum rc.istoc.com/panel'de onay asamasindadir.

### Eklendi
- feat(panel): sayfa-içi onboarding tur'larını view'lara yay (@aliturguttursab)

---
## [v1.6.4-beta.1] - 2026-06-17 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(panel): sayfa-içi onboarding tur'larını view'lara yay (@aliturguttursab)

---
## [v1.6.4] - 2026-06-17 PROD

Bu surum istoc.com/panel'de yayindadir.

### Duzeltildi
- fix(navigation): Mağazam tıklamasında satıcının kendi kaydına yönlenme düzeltildi (@ahmeetseker)
  - sellerOwned doctype route hesabı tek resolver'da toplandı (navItemRoute.js); SidePanel ve navigation store artık aynı kaynağı kullanıyor
  - User Profile kayıt adı email üzerinden çözülüyor (seller_profile satıcı kodudur, kayıt adı değil)
  - DocTypeFormView: satıcı kendi sellerOwned kaydını açabiliyor, başkasının kaydına erişim kapalı kalıyor

---
## [v1.6.3-rc.1] - 2026-06-17 RC

Bu surum rc.istoc.com/panel'de onay asamasindadir.

### Duzeltildi
- fix(navigation): Mağazam tıklamasında satıcının kendi kaydına yönlenme düzeltildi (@ahmeetseker)
  - sellerOwned doctype route hesabı tek resolver'da toplandı (navItemRoute.js); SidePanel ve navigation store artık aynı kaynağı kullanıyor
  - User Profile kayıt adı email üzerinden çözülüyor (seller_profile satıcı kodudur, kayıt adı değil)
  - DocTypeFormView: satıcı kendi sellerOwned kaydını açabiliyor, başkasının kaydına erişim kapalı kalıyor

---
## [v1.6.3-beta.1] - 2026-06-17 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Duzeltildi
- fix(navigation): Mağazam tıklamasında satıcının kendi kaydına yönlenme düzeltildi (@ahmeetseker)
  - sellerOwned doctype route hesabı tek resolver'da toplandı (navItemRoute.js); SidePanel ve navigation store artık aynı kaynağı kullanıyor
  - User Profile kayıt adı email üzerinden çözülüyor (seller_profile satıcı kodudur, kayıt adı değil)
  - DocTypeFormView: satıcı kendi sellerOwned kaydını açabiliyor, başkasının kaydına erişim kapalı kalıyor

---
## [v1.6.3] - 2026-06-16 PROD

Bu surum istoc.com/panel'de yayindadir.

### Duzeltildi
- fix(navigation): dashboard linklerinde sidebar ve breadcrumb senkronizasyonu düzeltildi (@aliiball)
  - activeSection route.meta.section'dan senkronlanıyor (rail + panel URL'i takip eder)
  - breadcrumb satıcı panelinde satıcı section/başlıklarını kullanıyor
  - dynamicNav alan adları düzeltildi (label/section); çift section/sayfa metni engellendi
  - storefront-layout route'u products yerine store section'ına alındı
- fix(doctype): form yükleme hatası sessizce yutulmuyor, görünür mesaj gösteriliyor (@aliiball)
  - loadDoc getDoc başarısız olunca formu sessizce boş gösteriyordu (izin hatası gizleniyordu); artık toast.error ile mesaj (KYB panel boş-form kafa karışıklığı)

### Degistirildi
- refactor(ui): tüm emojileri Lucide AppIcon ikonlarıyla değiştir (@boraydeger32)
  - Vue template'leri: rozet/başlık/boş-durum/legend emojileri AppIcon'a çevrildi (permission console: shield/lock/id-card/siren/gem/tag dahil), gereken dosyalara AppIcon importu eklendi
  - i18n (tr/en/ru/ar): string'lerden emoji ve bayraklar temizlendi
  - <option> ve toast JS string'leri: bileşen gömülemediği için emoji silindi
  - AttachField.ts: ham HTML 📎 → inline Lucide paperclip SVG

---
## [v1.6.2-rc.1] - 2026-06-16 RC

Bu surum rc.istoc.com/panel'de onay asamasindadir.

### Duzeltildi
- fix(navigation): dashboard linklerinde sidebar ve breadcrumb senkronizasyonu düzeltildi (@aliiball)
  - activeSection route.meta.section'dan senkronlanıyor (rail + panel URL'i takip eder)
  - breadcrumb satıcı panelinde satıcı section/başlıklarını kullanıyor
  - dynamicNav alan adları düzeltildi (label/section); çift section/sayfa metni engellendi
  - storefront-layout route'u products yerine store section'ına alındı
- fix(doctype): form yükleme hatası sessizce yutulmuyor, görünür mesaj gösteriliyor (@aliiball)
  - loadDoc getDoc başarısız olunca formu sessizce boş gösteriyordu (izin hatası gizleniyordu); artık toast.error ile mesaj (KYB panel boş-form kafa karışıklığı)

### Degistirildi
- refactor(ui): tüm emojileri Lucide AppIcon ikonlarıyla değiştir (@boraydeger32)
  - Vue template'leri: rozet/başlık/boş-durum/legend emojileri AppIcon'a çevrildi (permission console: shield/lock/id-card/siren/gem/tag dahil), gereken dosyalara AppIcon importu eklendi
  - i18n (tr/en/ru/ar): string'lerden emoji ve bayraklar temizlendi
  - <option> ve toast JS string'leri: bileşen gömülemediği için emoji silindi
  - AttachField.ts: ham HTML 📎 → inline Lucide paperclip SVG

---
## [v1.6.2-beta.2] - 2026-06-16 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Duzeltildi
- fix(navigation): dashboard linklerinde sidebar ve breadcrumb senkronizasyonu düzeltildi (@aliiball)
  - activeSection route.meta.section'dan senkronlanıyor (rail + panel URL'i takip eder)
  - breadcrumb satıcı panelinde satıcı section/başlıklarını kullanıyor
  - dynamicNav alan adları düzeltildi (label/section); çift section/sayfa metni engellendi
  - storefront-layout route'u products yerine store section'ına alındı
- fix(doctype): form yükleme hatası sessizce yutulmuyor, görünür mesaj gösteriliyor (@aliiball)
  - loadDoc getDoc başarısız olunca formu sessizce boş gösteriyordu (izin hatası gizleniyordu); artık toast.error ile mesaj (KYB panel boş-form kafa karışıklığı)

---
## [v1.6.2-beta.1] - 2026-06-16 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Degistirildi
- refactor(ui): tüm emojileri Lucide AppIcon ikonlarıyla değiştir (@boraydeger32)
  - Vue template'leri: rozet/başlık/boş-durum/legend emojileri AppIcon'a çevrildi (permission console: shield/lock/id-card/siren/gem/tag dahil), gereken dosyalara AppIcon importu eklendi
  - i18n (tr/en/ru/ar): string'lerden emoji ve bayraklar temizlendi
  - <option> ve toast JS string'leri: bileşen gömülemediği için emoji silindi
  - AttachField.ts: ham HTML 📎 → inline Lucide paperclip SVG

---
## [v1.6.1] - 2026-06-12 PROD

Bu surum istoc.com/panel'de yayindadir.

### Eklendi
- feat(plans): komisyon boş bırakılınca "Özel" — commission_is_custom köprüsü (@boraydeger32)

---
## [v1.6.0-rc.1] - 2026-06-12 RC

Bu surum rc.istoc.com/panel'de onay asamasindadir.

### Eklendi
- feat(plans): komisyon boş bırakılınca "Özel" — commission_is_custom köprüsü (@boraydeger32)

---
## [v1.6.0-beta.1] - 2026-06-12 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(plans): komisyon boş bırakılınca "Özel" — commission_is_custom köprüsü (@boraydeger32)

---
## [v1.6.0] - 2026-06-12 PROD

Bu surum istoc.com/panel'de yayindadir.

### Eklendi
- feat(onboarding): panel geneli rehberli tur — bölüm + sayfa-içi turlar (@aliturguttursab)
  - stores/tour.js: nav-türevli rol-aware BÖLÜM turları (kapalı accordion gruplarını otomatik açar) + view'ların kaydettiği SAYFA turları; bağımsız "görüldü" takibi (localStorage panel_tour_seen_v4); section/page önceliği.
  - GuidedTour.vue: tek overlay — spotlight + coachmark (ilerleme, Geri/İleri/ Atla/Bitir), klavye (Esc/←/→), RTL + dark, geç-render retry, Teleport.
  - usePageTour.js: bir view data-tour anchor'ları + adımlarını kaydeder, ilk girişte otomatik başlar; Yardım(?) bağlam-duyarlı yeniden başlatır.
  - AppLayout (mount + bölüm auto-start), IconRail (data-section + Yardım=restart), SidePanel (data-tour-item anchor'ları).
- feat(bulk-import): görsel eşleştirme adımı (thumbnail'lı yetim atama) (@aliiball)

### Degistirildi
- refactor(ci): lint workflow PR tetiği kaldırıldı (@ahmeetseker)
  - pull_request trigger silindi; lint artık sadece push'ta çalışır
  - ListingModerationView'de çift import "already declared" parse hatası veriyordu, lint ve build'i kırıyordu

---
## [v1.5.1-rc.1] - 2026-06-12 RC

Bu surum rc.istoc.com/panel'de onay asamasindadir.

### Eklendi
- feat(onboarding): panel geneli rehberli tur — bölüm + sayfa-içi turlar (@aliturguttursab)
  - stores/tour.js: nav-türevli rol-aware BÖLÜM turları (kapalı accordion gruplarını otomatik açar) + view'ların kaydettiği SAYFA turları; bağımsız "görüldü" takibi (localStorage panel_tour_seen_v4); section/page önceliği.
  - GuidedTour.vue: tek overlay — spotlight + coachmark (ilerleme, Geri/İleri/ Atla/Bitir), klavye (Esc/←/→), RTL + dark, geç-render retry, Teleport.
  - usePageTour.js: bir view data-tour anchor'ları + adımlarını kaydeder, ilk girişte otomatik başlar; Yardım(?) bağlam-duyarlı yeniden başlatır.
  - AppLayout (mount + bölüm auto-start), IconRail (data-section + Yardım=restart), SidePanel (data-tour-item anchor'ları).
- feat(bulk-import): görsel eşleştirme adımı (thumbnail'lı yetim atama) (@aliiball)

### Degistirildi
- refactor(ci): lint workflow PR tetiği kaldırıldı (@ahmeetseker)
  - pull_request trigger silindi; lint artık sadece push'ta çalışır
  - ListingModerationView'de çift import "already declared" parse hatası veriyordu, lint ve build'i kırıyordu

---
## [v1.5.1-beta.2] - 2026-06-12 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(onboarding): panel geneli rehberli tur — bölüm + sayfa-içi turlar (@aliturguttursab)
  - stores/tour.js: nav-türevli rol-aware BÖLÜM turları (kapalı accordion gruplarını otomatik açar) + view'ların kaydettiği SAYFA turları; bağımsız "görüldü" takibi (localStorage panel_tour_seen_v4); section/page önceliği.
  - GuidedTour.vue: tek overlay — spotlight + coachmark (ilerleme, Geri/İleri/ Atla/Bitir), klavye (Esc/←/→), RTL + dark, geç-render retry, Teleport.
  - usePageTour.js: bir view data-tour anchor'ları + adımlarını kaydeder, ilk girişte otomatik başlar; Yardım(?) bağlam-duyarlı yeniden başlatır.
  - AppLayout (mount + bölüm auto-start), IconRail (data-section + Yardım=restart), SidePanel (data-tour-item anchor'ları).

### Degistirildi
- refactor(ci): lint workflow PR tetiği kaldırıldı (@ahmeetseker)
  - pull_request trigger silindi; lint artık sadece push'ta çalışır
  - ListingModerationView'de çift import "already declared" parse hatası veriyordu, lint ve build'i kırıyordu

---
## [v1.5.1-beta.1] - 2026-06-12 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(bulk-import): görsel eşleştirme adımı (thumbnail'lı yetim atama) (@aliiball)

---
## [v1.5.1] - 2026-06-12 PROD

Bu surum istoc.com/panel'de yayindadir.

### Duzeltildi
- fix(security): admin panel CSP/header'ları ve CSRF token sertleştirmesi (@boraydeger32)
  - nginx: /panel için X-Frame-Options DENY + CSP + nosniff + Referrer-Policy (clickjacking + XSS yüzeyi daraltma; Tailwind CDN whitelist'li)
  - api.js: CSRF token localStorage yerine yalnız bellekte (XSS token hırsızlığı)
  - npm audit fix: picomatch High CVE giderildi (build doğrulandı)

---
## [v1.5.0-rc.1] - 2026-06-12 RC

Bu surum rc.istoc.com/panel'de onay asamasindadir.

### Duzeltildi
- fix(security): admin panel CSP/header'ları ve CSRF token sertleştirmesi (@boraydeger32)
  - nginx: /panel için X-Frame-Options DENY + CSP + nosniff + Referrer-Policy (clickjacking + XSS yüzeyi daraltma; Tailwind CDN whitelist'li)
  - api.js: CSRF token localStorage yerine yalnız bellekte (XSS token hırsızlığı)
  - npm audit fix: picomatch High CVE giderildi (build doğrulandı)

---
## [v1.5.0-beta.1] - 2026-06-12 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Duzeltildi
- fix(security): admin panel CSP/header'ları ve CSRF token sertleştirmesi (@boraydeger32)
  - nginx: /panel için X-Frame-Options DENY + CSP + nosniff + Referrer-Policy (clickjacking + XSS yüzeyi daraltma; Tailwind CDN whitelist'li)
  - api.js: CSRF token localStorage yerine yalnız bellekte (XSS token hırsızlığı)
  - npm audit fix: picomatch High CVE giderildi (build doğrulandı)

---
## [v1.5.0] - 2026-06-11 PROD

Bu surum istoc.com/panel'de yayindadir.

### Eklendi
- feat(bulk-import): yükleme sihirbazı ve hata raporlama UX iyileştirildi (@aliiball)
  - Önizlemede çakışma uyarısı + fiyat sütunu eşleşmezse devam engeli
  - Sniffer başlık satırı / Excel sayfası seçici (header picker) bağlandı
  - 'Algılanan Alan' düzenlenebilir açılır menüye çevrildi + Detay Alanları grubu (stock_uom/currency/kargo vb.)
  - Hata türü yerelleştirildi (Sistem hatası/Kuralla reddedildi vb.), önem derecesine göre renk, mesajda ilgili alan ipucu
  - Görsel arşiv limiti 50 MB olarak güncellendi
- feat(eca): admin sihirbaz UI + governance + ağaç/arama kategori seçici (@aliiball)
  - Kime/Koşul/12 eylem sihirbazı; dry-run, çakışma, versiyon, örnek-test
  - create_document: kayıt türü dropdown + alan eşleyici (JSON/"DocType" yok)
  - LinkTreePicker: kategori ağaç-gezinme + arama (path'li); marka/tip arama-autocomplete
  - picker floating panel: scroll'da yapışık (rAF), yer yoksa yukarı açılır, içi scroll'lanır
  - toggle dark-state + lucide ikon alias + hizalama
- feat(i18n): admin ECA / Sistem Eşleştirme / governance / picker çevirileri (tr/en/ru/ar) (@aliiball)
- feat(category): kategori ağacına sidebar+kart görünümü ve genel özet eklendi (@aliiball)
  - cards modu sol ağaç (ilk 3 kırılım: L0-L2) + sağ panel (seçili düğüm detayı + alt kategori kartları) düzenine dönüştürüldü
  - sağ kartlardan derine gezinme (breadcrumb); L3+ yalnız sağda
  - sidebar satırı tek tıklamayla hem seçer hem aç/kapar
  - her düğüm için alt-ağaç (toplam) sayısı NSM lft/rgt'den hesaplanır
  - başlık altına genel özet: kök kategori + toplam kategori sayısı (canlı)
  - 4 dile (tr/en/ar/ru) yeni çeviri anahtarları

---
## [v1.4.2-rc.1] - 2026-06-11 RC

Bu surum rc.istoc.com/panel'de onay asamasindadir.

### Eklendi
- feat(bulk-import): yükleme sihirbazı ve hata raporlama UX iyileştirildi (@aliiball)
  - Önizlemede çakışma uyarısı + fiyat sütunu eşleşmezse devam engeli
  - Sniffer başlık satırı / Excel sayfası seçici (header picker) bağlandı
  - 'Algılanan Alan' düzenlenebilir açılır menüye çevrildi + Detay Alanları grubu (stock_uom/currency/kargo vb.)
  - Hata türü yerelleştirildi (Sistem hatası/Kuralla reddedildi vb.), önem derecesine göre renk, mesajda ilgili alan ipucu
  - Görsel arşiv limiti 50 MB olarak güncellendi
- feat(eca): admin sihirbaz UI + governance + ağaç/arama kategori seçici (@aliiball)
  - Kime/Koşul/12 eylem sihirbazı; dry-run, çakışma, versiyon, örnek-test
  - create_document: kayıt türü dropdown + alan eşleyici (JSON/"DocType" yok)
  - LinkTreePicker: kategori ağaç-gezinme + arama (path'li); marka/tip arama-autocomplete
  - picker floating panel: scroll'da yapışık (rAF), yer yoksa yukarı açılır, içi scroll'lanır
  - toggle dark-state + lucide ikon alias + hizalama
- feat(i18n): admin ECA / Sistem Eşleştirme / governance / picker çevirileri (tr/en/ru/ar) (@aliiball)
- feat(category): kategori ağacına sidebar+kart görünümü ve genel özet eklendi (@aliiball)
  - cards modu sol ağaç (ilk 3 kırılım: L0-L2) + sağ panel (seçili düğüm detayı + alt kategori kartları) düzenine dönüştürüldü
  - sağ kartlardan derine gezinme (breadcrumb); L3+ yalnız sağda
  - sidebar satırı tek tıklamayla hem seçer hem aç/kapar
  - her düğüm için alt-ağaç (toplam) sayısı NSM lft/rgt'den hesaplanır
  - başlık altına genel özet: kök kategori + toplam kategori sayısı (canlı)
  - 4 dile (tr/en/ar/ru) yeni çeviri anahtarları

---
## [v1.4.2-beta.1] - 2026-06-11 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(bulk-import): yükleme sihirbazı ve hata raporlama UX iyileştirildi (@aliiball)
  - Önizlemede çakışma uyarısı + fiyat sütunu eşleşmezse devam engeli
  - Sniffer başlık satırı / Excel sayfası seçici (header picker) bağlandı
  - 'Algılanan Alan' düzenlenebilir açılır menüye çevrildi + Detay Alanları grubu (stock_uom/currency/kargo vb.)
  - Hata türü yerelleştirildi (Sistem hatası/Kuralla reddedildi vb.), önem derecesine göre renk, mesajda ilgili alan ipucu
  - Görsel arşiv limiti 50 MB olarak güncellendi
- feat(eca): admin sihirbaz UI + governance + ağaç/arama kategori seçici (@aliiball)
  - Kime/Koşul/12 eylem sihirbazı; dry-run, çakışma, versiyon, örnek-test
  - create_document: kayıt türü dropdown + alan eşleyici (JSON/"DocType" yok)
  - LinkTreePicker: kategori ağaç-gezinme + arama (path'li); marka/tip arama-autocomplete
  - picker floating panel: scroll'da yapışık (rAF), yer yoksa yukarı açılır, içi scroll'lanır
  - toggle dark-state + lucide ikon alias + hizalama
- feat(i18n): admin ECA / Sistem Eşleştirme / governance / picker çevirileri (tr/en/ru/ar) (@aliiball)
- feat(category): kategori ağacına sidebar+kart görünümü ve genel özet eklendi (@aliiball)
  - cards modu sol ağaç (ilk 3 kırılım: L0-L2) + sağ panel (seçili düğüm detayı + alt kategori kartları) düzenine dönüştürüldü
  - sağ kartlardan derine gezinme (breadcrumb); L3+ yalnız sağda
  - sidebar satırı tek tıklamayla hem seçer hem aç/kapar
  - her düğüm için alt-ağaç (toplam) sayısı NSM lft/rgt'den hesaplanır
  - başlık altına genel özet: kök kategori + toplam kategori sayısı (canlı)
  - 4 dile (tr/en/ar/ru) yeni çeviri anahtarları

---
## [v1.4.2] - 2026-06-11 PROD

Bu surum istoc.com/panel'de yayindadir.

### Eklendi
- feat(billing): satıcı profili abonelik kartı + paywall/billing uyumları (@boraydeger32)

---
## [v1.4.1-rc.1] - 2026-06-11 RC

Bu surum rc.istoc.com/panel'de onay asamasindadir.

### Eklendi
- feat(billing): satıcı profili abonelik kartı + paywall/billing uyumları (@boraydeger32)

---
## [v1.4.1-beta.1] - 2026-06-11 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(billing): satıcı profili abonelik kartı + paywall/billing uyumları (@boraydeger32)

---
## [v1.4.0] - 2026-06-11 PROD

Bu surum istoc.com/panel'de yayindadir.

### Eklendi
- feat(eca): admin sihirbaz UI + governance + tıklama eylemler + polish (@aliiball)
  - Kime/Koşul/12 eylem sihirbazı; dry-run önizleme, çakışma, versiyon, örnek-test
  - create_document: kayıt türü dropdown + alan eşleyici (JSON/"DocType" yok)
  - link-değer dropdown okunur ad; toggle dark-state + lucide ikon alias + hizalama
- feat(bulk-import): Sistem Eşleştirme UI + parametrik SKU/XML (@aliiball)
  - sekmeli sistem eşleme (Sütun/Değer); SKU/XML parametrik (fiyat ayraç + XML etiket)
  - ham regex "uzman/gated"; kullanım istatistiği kolonu; /app kısayolu kaldırıldı
- feat(bulk-import): admin geçmişinde satıcı kolonu + filtre (@aliiball)
  - admin görünümünde Satıcı kolonu + satıcı filtresi; satıcıda gizli (regresyonsuz)
- feat(i18n): admin ECA / Sistem Eşleştirme / governance çevirileri (tr/en/ru/ar) (@aliiball)
- feat(bulk-import): yüklenen ürün görünürlüğü iyileştirildi (@aliiball)
  - Ürün listelerine Feed/Manuel kaynak rozeti eklendi (satıcı + admin moderasyon); satıcı tarafında kaynak filtresi
  - İçe aktarma hata tablosunda SKU, eşleşen mevcut ürüne linklenir (özellikle duplicate hatasında çakışan ürüne yönlendirir)
  - Kısmi/hatalı içe aktarmalar için uyarı banner'ı, satıcı feed geçmişi ve admin feed izlemede satır vurgusu eklendi (ortak eşik fonksiyonu)
  - Backend: get_seller_listings ve get_pending_listings artık created_by_bulk_job döndürür; resolve_error_skus endpoint'i eklendi
- feat(billing): satıcı abonelik paywall, trial banner ve ödeme onay ekranı (@boraydeger32)
  - Abonelik kapısı: router guard + /abonelik paywall sayfası (paket seç, havale/EFT talimatı, trial başlat) + subscription store
  - AppLayout'a trial geri sayım banner'ı
  - Admin /abonelik-odemeleri: havale onay/ret ekranı
  - Dark-mode uyumlu (admin tasarım token'ları)
- feat(onboarding): panel geneli rehberli tur — bölüm + sayfa-içi turlar (@aliturguttursab)
  - stores/tour.js: nav-türevli rol-aware BÖLÜM turları (kapalı accordion gruplarını otomatik açar) + view'ların kaydettiği SAYFA turları; bağımsız "görüldü" takibi (localStorage panel_tour_seen_v4); section/page önceliği.
  - GuidedTour.vue: tek overlay — spotlight + coachmark (ilerleme, Geri/İleri/ Atla/Bitir), klavye (Esc/←/→), RTL + dark, geç-render retry, Teleport.
  - usePageTour.js: bir view data-tour anchor'ları + adımlarını kaydeder, ilk girişte otomatik başlar; Yardım(?) bağlam-duyarlı yeniden başlatır.
  - AppLayout (mount + bölüm auto-start), IconRail (data-section + Yardım=restart), SidePanel (data-tour-item anchor'ları).
- feat(billing): abonelik sayfası — sidebar erişimi + mevcut abonelik görünümü (@boraydeger32)
  - Sidebar "Abonelik" menü item'ı (statik fallback navigation.js + nav.item.subscription i18n tr/en/ar/ru)
  - /abonelik: mevcut aboneliği göster (plan adı, Aktif/Deneme rozeti, tarih) + plan kartlarında "Mevcut" işareti + paket değiştirme/yükseltme

---
## [v1.3.1-rc.1] - 2026-06-11 RC

Bu surum rc.istoc.com/panel'de onay asamasindadir.

### Eklendi
- feat(eca): admin sihirbaz UI + governance + tıklama eylemler + polish (@aliiball)
  - Kime/Koşul/12 eylem sihirbazı; dry-run önizleme, çakışma, versiyon, örnek-test
  - create_document: kayıt türü dropdown + alan eşleyici (JSON/"DocType" yok)
  - link-değer dropdown okunur ad; toggle dark-state + lucide ikon alias + hizalama
- feat(bulk-import): Sistem Eşleştirme UI + parametrik SKU/XML (@aliiball)
  - sekmeli sistem eşleme (Sütun/Değer); SKU/XML parametrik (fiyat ayraç + XML etiket)
  - ham regex "uzman/gated"; kullanım istatistiği kolonu; /app kısayolu kaldırıldı
- feat(bulk-import): admin geçmişinde satıcı kolonu + filtre (@aliiball)
  - admin görünümünde Satıcı kolonu + satıcı filtresi; satıcıda gizli (regresyonsuz)
- feat(i18n): admin ECA / Sistem Eşleştirme / governance çevirileri (tr/en/ru/ar) (@aliiball)
- feat(bulk-import): yüklenen ürün görünürlüğü iyileştirildi (@aliiball)
  - Ürün listelerine Feed/Manuel kaynak rozeti eklendi (satıcı + admin moderasyon); satıcı tarafında kaynak filtresi
  - İçe aktarma hata tablosunda SKU, eşleşen mevcut ürüne linklenir (özellikle duplicate hatasında çakışan ürüne yönlendirir)
  - Kısmi/hatalı içe aktarmalar için uyarı banner'ı, satıcı feed geçmişi ve admin feed izlemede satır vurgusu eklendi (ortak eşik fonksiyonu)
  - Backend: get_seller_listings ve get_pending_listings artık created_by_bulk_job döndürür; resolve_error_skus endpoint'i eklendi
- feat(billing): satıcı abonelik paywall, trial banner ve ödeme onay ekranı (@boraydeger32)
  - Abonelik kapısı: router guard + /abonelik paywall sayfası (paket seç, havale/EFT talimatı, trial başlat) + subscription store
  - AppLayout'a trial geri sayım banner'ı
  - Admin /abonelik-odemeleri: havale onay/ret ekranı
  - Dark-mode uyumlu (admin tasarım token'ları)
- feat(onboarding): panel geneli rehberli tur — bölüm + sayfa-içi turlar (@aliturguttursab)
  - stores/tour.js: nav-türevli rol-aware BÖLÜM turları (kapalı accordion gruplarını otomatik açar) + view'ların kaydettiği SAYFA turları; bağımsız "görüldü" takibi (localStorage panel_tour_seen_v4); section/page önceliği.
  - GuidedTour.vue: tek overlay — spotlight + coachmark (ilerleme, Geri/İleri/ Atla/Bitir), klavye (Esc/←/→), RTL + dark, geç-render retry, Teleport.
  - usePageTour.js: bir view data-tour anchor'ları + adımlarını kaydeder, ilk girişte otomatik başlar; Yardım(?) bağlam-duyarlı yeniden başlatır.
  - AppLayout (mount + bölüm auto-start), IconRail (data-section + Yardım=restart), SidePanel (data-tour-item anchor'ları).
- feat(billing): abonelik sayfası — sidebar erişimi + mevcut abonelik görünümü (@boraydeger32)
  - Sidebar "Abonelik" menü item'ı (statik fallback navigation.js + nav.item.subscription i18n tr/en/ar/ru)
  - /abonelik: mevcut aboneliği göster (plan adı, Aktif/Deneme rozeti, tarih) + plan kartlarında "Mevcut" işareti + paket değiştirme/yükseltme

---
## [v1.3.1-beta.4] - 2026-06-11 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(billing): abonelik sayfası — sidebar erişimi + mevcut abonelik görünümü (@boraydeger32)
  - Sidebar "Abonelik" menü item'ı (statik fallback navigation.js + nav.item.subscription i18n tr/en/ar/ru)
  - /abonelik: mevcut aboneliği göster (plan adı, Aktif/Deneme rozeti, tarih) + plan kartlarında "Mevcut" işareti + paket değiştirme/yükseltme

---
## [v1.3.1-beta.3] - 2026-06-11 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(onboarding): panel geneli rehberli tur — bölüm + sayfa-içi turlar (@aliturguttursab)
  - stores/tour.js: nav-türevli rol-aware BÖLÜM turları (kapalı accordion gruplarını otomatik açar) + view'ların kaydettiği SAYFA turları; bağımsız "görüldü" takibi (localStorage panel_tour_seen_v4); section/page önceliği.
  - GuidedTour.vue: tek overlay — spotlight + coachmark (ilerleme, Geri/İleri/ Atla/Bitir), klavye (Esc/←/→), RTL + dark, geç-render retry, Teleport.
  - usePageTour.js: bir view data-tour anchor'ları + adımlarını kaydeder, ilk girişte otomatik başlar; Yardım(?) bağlam-duyarlı yeniden başlatır.
  - AppLayout (mount + bölüm auto-start), IconRail (data-section + Yardım=restart), SidePanel (data-tour-item anchor'ları).

---
## [v1.3.1-beta.2] - 2026-06-11 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(eca): admin sihirbaz UI + governance + tıklama eylemler + polish (@aliiball)
  - Kime/Koşul/12 eylem sihirbazı; dry-run önizleme, çakışma, versiyon, örnek-test
  - create_document: kayıt türü dropdown + alan eşleyici (JSON/"DocType" yok)
  - link-değer dropdown okunur ad; toggle dark-state + lucide ikon alias + hizalama
- feat(bulk-import): Sistem Eşleştirme UI + parametrik SKU/XML (@aliiball)
  - sekmeli sistem eşleme (Sütun/Değer); SKU/XML parametrik (fiyat ayraç + XML etiket)
  - ham regex "uzman/gated"; kullanım istatistiği kolonu; /app kısayolu kaldırıldı
- feat(bulk-import): admin geçmişinde satıcı kolonu + filtre (@aliiball)
  - admin görünümünde Satıcı kolonu + satıcı filtresi; satıcıda gizli (regresyonsuz)
- feat(i18n): admin ECA / Sistem Eşleştirme / governance çevirileri (tr/en/ru/ar) (@aliiball)
- feat(bulk-import): yüklenen ürün görünürlüğü iyileştirildi (@aliiball)
  - Ürün listelerine Feed/Manuel kaynak rozeti eklendi (satıcı + admin moderasyon); satıcı tarafında kaynak filtresi
  - İçe aktarma hata tablosunda SKU, eşleşen mevcut ürüne linklenir (özellikle duplicate hatasında çakışan ürüne yönlendirir)
  - Kısmi/hatalı içe aktarmalar için uyarı banner'ı, satıcı feed geçmişi ve admin feed izlemede satır vurgusu eklendi (ortak eşik fonksiyonu)
  - Backend: get_seller_listings ve get_pending_listings artık created_by_bulk_job döndürür; resolve_error_skus endpoint'i eklendi
- feat(billing): satıcı abonelik paywall, trial banner ve ödeme onay ekranı (@boraydeger32)
  - Abonelik kapısı: router guard + /abonelik paywall sayfası (paket seç, havale/EFT talimatı, trial başlat) + subscription store
  - AppLayout'a trial geri sayım banner'ı
  - Admin /abonelik-odemeleri: havale onay/ret ekranı
  - Dark-mode uyumlu (admin tasarım token'ları)

---
## [v1.3.1-beta.1] - 2026-06-10 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(eca): admin sihirbaz UI + governance + tıklama eylemler + polish (@aliiball)
  - Kime/Koşul/12 eylem sihirbazı; dry-run önizleme, çakışma, versiyon, örnek-test
  - create_document: kayıt türü dropdown + alan eşleyici (JSON/"DocType" yok)
  - link-değer dropdown okunur ad; toggle dark-state + lucide ikon alias + hizalama
- feat(bulk-import): Sistem Eşleştirme UI + parametrik SKU/XML (@aliiball)
  - sekmeli sistem eşleme (Sütun/Değer); SKU/XML parametrik (fiyat ayraç + XML etiket)
  - ham regex "uzman/gated"; kullanım istatistiği kolonu; /app kısayolu kaldırıldı
- feat(bulk-import): admin geçmişinde satıcı kolonu + filtre (@aliiball)
  - admin görünümünde Satıcı kolonu + satıcı filtresi; satıcıda gizli (regresyonsuz)
- feat(i18n): admin ECA / Sistem Eşleştirme / governance çevirileri (tr/en/ru/ar) (@aliiball)
- feat(bulk-import): yüklenen ürün görünürlüğü iyileştirildi (@aliiball)
  - Ürün listelerine Feed/Manuel kaynak rozeti eklendi (satıcı + admin moderasyon); satıcı tarafında kaynak filtresi
  - İçe aktarma hata tablosunda SKU, eşleşen mevcut ürüne linklenir (özellikle duplicate hatasında çakışan ürüne yönlendirir)
  - Kısmi/hatalı içe aktarmalar için uyarı banner'ı, satıcı feed geçmişi ve admin feed izlemede satır vurgusu eklendi (ortak eşik fonksiyonu)
  - Backend: get_seller_listings ve get_pending_listings artık created_by_bulk_job döndürür; resolve_error_skus endpoint'i eklendi

---
## [v1.3.1] - 2026-06-10 PROD

Bu surum istoc.com/panel'de yayindadir.

### Eklendi
- feat(billing): satıcı abonelik paywall, trial banner ve ödeme onay ekranı (@boraydeger32)
  - Abonelik kapısı: router guard + /abonelik paywall sayfası (paket seç, havale/EFT talimatı, trial başlat) + subscription store
  - AppLayout'a trial geri sayım banner'ı
  - Admin /abonelik-odemeleri: havale onay/ret ekranı
  - Dark-mode uyumlu (admin tasarım token'ları)

---
## [v1.3.0-rc.1] - 2026-06-10 RC

Bu surum rc.istoc.com/panel'de onay asamasindadir.

### Eklendi
- feat(billing): satıcı abonelik paywall, trial banner ve ödeme onay ekranı (@boraydeger32)
  - Abonelik kapısı: router guard + /abonelik paywall sayfası (paket seç, havale/EFT talimatı, trial başlat) + subscription store
  - AppLayout'a trial geri sayım banner'ı
  - Admin /abonelik-odemeleri: havale onay/ret ekranı
  - Dark-mode uyumlu (admin tasarım token'ları)

---
## [v1.3.0-beta.1] - 2026-06-10 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(billing): satıcı abonelik paywall, trial banner ve ödeme onay ekranı (@boraydeger32)
  - Abonelik kapısı: router guard + /abonelik paywall sayfası (paket seç, havale/EFT talimatı, trial başlat) + subscription store
  - AppLayout'a trial geri sayım banner'ı
  - Admin /abonelik-odemeleri: havale onay/ret ekranı
  - Dark-mode uyumlu (admin tasarım token'ları)

---
## [v1.3.0] - 2026-06-10 PROD

Bu surum istoc.com/panel'de yayindadir.

### Eklendi
- feat(i18n): panel kategori dil desteği + içerik-dil alanları (@aliturguttursab)
  - views/seller/ListingFormView.vue: platform kategori ağacı/arama/ata endpoint çağrılarına aktif dil (lang: locale.value) eklendi; panel TR dışında bir dildeyken kategori isimleri çevrili gelir.
  - composables/useLangFields.js + views/products/CategoryManagementView.vue + components/seo/LangToggle.vue: çok-dilli içerik alanı düzenleme (suffix-kolon) desteği.
  - i18n/locales/{en,tr,ar,ru}.js: ilgili anahtar güncellemeleri.
- feat(pricing-admin): plan/özellik yönetimi UI iyileştirmeleri (@boraydeger32)
  - Özellik Kataloğu: "+ Yeni Özellik" elle key girme yerine önceden tanımlı havuzdan aranabilir dropdown seç-ekle (featurePresets.js)
  - Feature Catalog'a "Yakında" toggle (storefront rozeti yönetimi)
  - Plan editörü (Paket İçeriği): belirgin "Kartta göster" seçimi, kart sayacı, boş-kart uyarısı ve "+ Yeni Özellik" kısayolu (Özellik Kataloğu'na geçiş)
  - Görüntüleme sekmesine "Fiyat Yerine Metin" alanı (price_override_label)
  - fix: "Değişiklikleri Kaydet" legacy localFeatures'ı REPLACE ile gönderip Paket İçeriği hücrelerini siliyordu → pricing_features artık yalnız matris (PlanFeatureEditor) tarafından yönetiliyor
  - i18n: plans + featureCatalog anahtarları (tr/en/ar/ru)
- feat(i18n-ux): kategori çeviri formu — 4 dil bir arada (Faz 1) (@aliturguttursab)
  - Kaynak (varsayılan) dil üstte; her dilde dolu/eksik göstergesi (●) + X/4 sayacı
  - Boş, varsayılan-olmayan dilde "Kaynaktan kopyala" butonu
  - content_default_lang artık dropdown; AR otomatik RTL
  - editLang ref + LangToggle import kaldırıldı; orderedCatLangs/filledCatLangs computed'ları eklendi
  - 4 panel locale'ine categoryManagement.copyFromSource eklendi
- feat(i18n-ux): kategori listesinde çeviri tamamlanmışlık rozeti + filtre (Faz 2) (@aliturguttursab)
  - Her kategoride X/4 rozet (table/grid/list); yeşil=tam, amber=kısmi, kırmızı=≤1 + eksik dil tooltip'i (name_langs backend'den).
  - Header'da "Eksik çeviriler" toggle → displayNodes ile sadece eksikleri gösterir.
  - 4 panel locale'ine filterUntranslated/Hint, missingLangs, allTranslated.
- feat(i18n-ux): kategori çeviri formunda bayatlama uyarısı (Faz 2 tamam) (@aliturguttursab)
- feat(i18n-ux): kategori çeviri workbench'i (Faz 3, grid) (@aliturguttursab)
  - Boş hücre vurgusu + "kaynaktan kopyala"
  - X/4 tamamlanmışlık rozeti; Tümü/Eksik/Bayat filtreleri + dil-bazlı eksik seçici
  - Bayatlama (kaynak değişti) uyarısı; "sıradaki eksiğe atla"; AR otomatik RTL
  - Route + nav (Katalog → Kategori Çevirileri) + categoryTranslations locale (4 dil)
- feat(i18n-ux): ürün formu çeviri UX'i (hafif) — dolu/eksik + kopyala + bayatlama (@aliturguttursab)
- feat(trial-admin): plan yonetimine global "Trial Ayarlari" karti (@boraydeger32)
  - PlansTab: hangi paket + kac gun + buton metni + aktif (System Manager)
  - permission store: getTrialSettings / updateTrialSettings
  - i18n tr/en trial anahtarlari; placeholder {gun} interpolation kaldirildi (vue-i18n Turkce karakterli param adini parse edemeyince tab bos render oluyordu)
- feat(pim): satıcı varyant sihirbazı + taksonomi composable eklendi (@aliiball)
  - useTaxonomy: Marka/Ürün Tipi/Aile/Özellik çekme
  - VariantWizard + ListingFormView varyant matris desteği
- feat(eca): sıfır-bilgi kural sihirbazı + düz-dil liste eklendi (@aliiball)
  - şema-güdümlü alan→operatör→değer cascade, hazır şablonlar, canlı önizleme
  - MyEcaRules teknik kolonlar yerine insan-dilli kart listesi
- feat(bulk-import): "Eşleştirmelerim" — Sütun + Değer eşleştirme sekmeleri (@aliiball)
  - regex'siz kolon-alias (Sütun) + hücre değeri normalizasyonu (Değer)
  - useValueMapping composable + gruplu hedef-alan/geçerli-değer dropdown'u
- feat(feed): XML Feed ekranı + plan-bazlı menü/erişim gate eklendi (@aliiball)
  - SellerFeedView: URL/test/dry-run/çalıştırma geçmişi/sağlık (sıfır-bilgi)
  - useEntitlement + navigation gating (feature.import.xml_feed)
  - PlansTab capability etiketleri; SidePanel kilitli/feature maddesi gösterimi
- feat(i18n): bulk/eca/feed/eşleştirme/entitlement çevirileri (tr/en/ru/ar) (@aliiball)
- feat(feature-catalog): clarify description field is the storefront tooltip (@boraydeger32)

### Duzeltildi
- fix(bulk-import): sürükle-bırak okuma + "Dosya Seç" + gruplu eşleme (@aliiball)
  - onDrop çoklu-aday bayt okuma (0-bayt tuzağı), her alana "Dosya Seç" butonu
  - indirilebilir örnek görsel arşivi (ZIP) butonu
  - Adım 2 / XML eşleme dropdown'u gruplu (Temel/mini-PIM/Özellik/Varyant)
- fix(bulk-import): hata listesi + özet polling yanıtından güncellenir (@aliiball)

### Degistirildi
- refactor: simplify lint workflow by removing auto-fix steps and adjusting permissions (@ahmeetseker)
- refactor(certifications): toplu kaldırma aria-label i18n'e taşındı ve tekrarlı etiketler temizlendi (@ahmeetseker)
- refactor(nav): XML Feed menü maddesi + "Eşleştirmelerim" + route düzenlemesi (@aliiball)
  - TOPLU YÜKLEME altına XML Feed; "Pattern'lerim" → "Eşleştirmelerim"
  - eca/feed/eşleştirme route'ları eklendi

---
## [v1.2.0-rc.1] - 2026-06-10 RC

Bu surum rc.istoc.com/panel'de onay asamasindadir.

### Eklendi
- feat(i18n): panel kategori dil desteği + içerik-dil alanları (@aliturguttursab)
  - views/seller/ListingFormView.vue: platform kategori ağacı/arama/ata endpoint çağrılarına aktif dil (lang: locale.value) eklendi; panel TR dışında bir dildeyken kategori isimleri çevrili gelir.
  - composables/useLangFields.js + views/products/CategoryManagementView.vue + components/seo/LangToggle.vue: çok-dilli içerik alanı düzenleme (suffix-kolon) desteği.
  - i18n/locales/{en,tr,ar,ru}.js: ilgili anahtar güncellemeleri.
- feat(pricing-admin): plan/özellik yönetimi UI iyileştirmeleri (@boraydeger32)
  - Özellik Kataloğu: "+ Yeni Özellik" elle key girme yerine önceden tanımlı havuzdan aranabilir dropdown seç-ekle (featurePresets.js)
  - Feature Catalog'a "Yakında" toggle (storefront rozeti yönetimi)
  - Plan editörü (Paket İçeriği): belirgin "Kartta göster" seçimi, kart sayacı, boş-kart uyarısı ve "+ Yeni Özellik" kısayolu (Özellik Kataloğu'na geçiş)
  - Görüntüleme sekmesine "Fiyat Yerine Metin" alanı (price_override_label)
  - fix: "Değişiklikleri Kaydet" legacy localFeatures'ı REPLACE ile gönderip Paket İçeriği hücrelerini siliyordu → pricing_features artık yalnız matris (PlanFeatureEditor) tarafından yönetiliyor
  - i18n: plans + featureCatalog anahtarları (tr/en/ar/ru)
- feat(i18n-ux): kategori çeviri formu — 4 dil bir arada (Faz 1) (@aliturguttursab)
  - Kaynak (varsayılan) dil üstte; her dilde dolu/eksik göstergesi (●) + X/4 sayacı
  - Boş, varsayılan-olmayan dilde "Kaynaktan kopyala" butonu
  - content_default_lang artık dropdown; AR otomatik RTL
  - editLang ref + LangToggle import kaldırıldı; orderedCatLangs/filledCatLangs computed'ları eklendi
  - 4 panel locale'ine categoryManagement.copyFromSource eklendi
- feat(i18n-ux): kategori listesinde çeviri tamamlanmışlık rozeti + filtre (Faz 2) (@aliturguttursab)
  - Her kategoride X/4 rozet (table/grid/list); yeşil=tam, amber=kısmi, kırmızı=≤1 + eksik dil tooltip'i (name_langs backend'den).
  - Header'da "Eksik çeviriler" toggle → displayNodes ile sadece eksikleri gösterir.
  - 4 panel locale'ine filterUntranslated/Hint, missingLangs, allTranslated.
- feat(i18n-ux): kategori çeviri formunda bayatlama uyarısı (Faz 2 tamam) (@aliturguttursab)
- feat(i18n-ux): kategori çeviri workbench'i (Faz 3, grid) (@aliturguttursab)
  - Boş hücre vurgusu + "kaynaktan kopyala"
  - X/4 tamamlanmışlık rozeti; Tümü/Eksik/Bayat filtreleri + dil-bazlı eksik seçici
  - Bayatlama (kaynak değişti) uyarısı; "sıradaki eksiğe atla"; AR otomatik RTL
  - Route + nav (Katalog → Kategori Çevirileri) + categoryTranslations locale (4 dil)
- feat(i18n-ux): ürün formu çeviri UX'i (hafif) — dolu/eksik + kopyala + bayatlama (@aliturguttursab)
- feat(trial-admin): plan yonetimine global "Trial Ayarlari" karti (@boraydeger32)
  - PlansTab: hangi paket + kac gun + buton metni + aktif (System Manager)
  - permission store: getTrialSettings / updateTrialSettings
  - i18n tr/en trial anahtarlari; placeholder {gun} interpolation kaldirildi (vue-i18n Turkce karakterli param adini parse edemeyince tab bos render oluyordu)
- feat(pim): satıcı varyant sihirbazı + taksonomi composable eklendi (@aliiball)
  - useTaxonomy: Marka/Ürün Tipi/Aile/Özellik çekme
  - VariantWizard + ListingFormView varyant matris desteği
- feat(eca): sıfır-bilgi kural sihirbazı + düz-dil liste eklendi (@aliiball)
  - şema-güdümlü alan→operatör→değer cascade, hazır şablonlar, canlı önizleme
  - MyEcaRules teknik kolonlar yerine insan-dilli kart listesi
- feat(bulk-import): "Eşleştirmelerim" — Sütun + Değer eşleştirme sekmeleri (@aliiball)
  - regex'siz kolon-alias (Sütun) + hücre değeri normalizasyonu (Değer)
  - useValueMapping composable + gruplu hedef-alan/geçerli-değer dropdown'u
- feat(feed): XML Feed ekranı + plan-bazlı menü/erişim gate eklendi (@aliiball)
  - SellerFeedView: URL/test/dry-run/çalıştırma geçmişi/sağlık (sıfır-bilgi)
  - useEntitlement + navigation gating (feature.import.xml_feed)
  - PlansTab capability etiketleri; SidePanel kilitli/feature maddesi gösterimi
- feat(i18n): bulk/eca/feed/eşleştirme/entitlement çevirileri (tr/en/ru/ar) (@aliiball)
- feat(feature-catalog): clarify description field is the storefront tooltip (@boraydeger32)

### Duzeltildi
- fix(bulk-import): sürükle-bırak okuma + "Dosya Seç" + gruplu eşleme (@aliiball)
  - onDrop çoklu-aday bayt okuma (0-bayt tuzağı), her alana "Dosya Seç" butonu
  - indirilebilir örnek görsel arşivi (ZIP) butonu
  - Adım 2 / XML eşleme dropdown'u gruplu (Temel/mini-PIM/Özellik/Varyant)
- fix(bulk-import): hata listesi + özet polling yanıtından güncellenir (@aliiball)

### Degistirildi
- refactor: simplify lint workflow by removing auto-fix steps and adjusting permissions (@ahmeetseker)
- refactor(certifications): toplu kaldırma aria-label i18n'e taşındı ve tekrarlı etiketler temizlendi (@ahmeetseker)
- refactor(nav): XML Feed menü maddesi + "Eşleştirmelerim" + route düzenlemesi (@aliiball)
  - TOPLU YÜKLEME altına XML Feed; "Pattern'lerim" → "Eşleştirmelerim"
  - eca/feed/eşleştirme route'ları eklendi

---
## [v1.2.0-beta.9] - 2026-06-10 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(pim): satıcı varyant sihirbazı + taksonomi composable eklendi (@aliiball)
  - useTaxonomy: Marka/Ürün Tipi/Aile/Özellik çekme
  - VariantWizard + ListingFormView varyant matris desteği
- feat(eca): sıfır-bilgi kural sihirbazı + düz-dil liste eklendi (@aliiball)
  - şema-güdümlü alan→operatör→değer cascade, hazır şablonlar, canlı önizleme
  - MyEcaRules teknik kolonlar yerine insan-dilli kart listesi
- feat(bulk-import): "Eşleştirmelerim" — Sütun + Değer eşleştirme sekmeleri (@aliiball)
  - regex'siz kolon-alias (Sütun) + hücre değeri normalizasyonu (Değer)
  - useValueMapping composable + gruplu hedef-alan/geçerli-değer dropdown'u
- feat(feed): XML Feed ekranı + plan-bazlı menü/erişim gate eklendi (@aliiball)
  - SellerFeedView: URL/test/dry-run/çalıştırma geçmişi/sağlık (sıfır-bilgi)
  - useEntitlement + navigation gating (feature.import.xml_feed)
  - PlansTab capability etiketleri; SidePanel kilitli/feature maddesi gösterimi
- feat(i18n): bulk/eca/feed/eşleştirme/entitlement çevirileri (tr/en/ru/ar) (@aliiball)
- feat(pricing-admin): plan/özellik yönetimi UI iyileştirmeleri (@boraydeger32)
  - Özellik Kataloğu: "+ Yeni Özellik" elle key girme yerine önceden tanımlı havuzdan aranabilir dropdown seç-ekle (featurePresets.js)
  - Feature Catalog'a "Yakında" toggle (storefront rozeti yönetimi)
  - Plan editörü (Paket İçeriği): belirgin "Kartta göster" seçimi, kart sayacı, boş-kart uyarısı ve "+ Yeni Özellik" kısayolu (Özellik Kataloğu'na geçiş)
  - Görüntüleme sekmesine "Fiyat Yerine Metin" alanı (price_override_label)
  - fix: "Değişiklikleri Kaydet" legacy localFeatures'ı REPLACE ile gönderip Paket İçeriği hücrelerini siliyordu → pricing_features artık yalnız matris (PlanFeatureEditor) tarafından yönetiliyor
  - i18n: plans + featureCatalog anahtarları (tr/en/ar/ru)
- feat(i18n): panel kategori dil desteği + içerik-dil alanları (@aliturguttursab)
  - views/seller/ListingFormView.vue: platform kategori ağacı/arama/ata endpoint çağrılarına aktif dil (lang: locale.value) eklendi; panel TR dışında bir dildeyken kategori isimleri çevrili gelir.
  - composables/useLangFields.js + views/products/CategoryManagementView.vue + components/seo/LangToggle.vue: çok-dilli içerik alanı düzenleme (suffix-kolon) desteği.
  - i18n/locales/{en,tr,ar,ru}.js: ilgili anahtar güncellemeleri.
- feat(trial-admin): plan yonetimine global "Trial Ayarlari" karti (@boraydeger32)
  - PlansTab: hangi paket + kac gun + buton metni + aktif (System Manager)
  - permission store: getTrialSettings / updateTrialSettings
  - i18n tr/en trial anahtarlari; placeholder {gun} interpolation kaldirildi (vue-i18n Turkce karakterli param adini parse edemeyince tab bos render oluyordu)
- feat(i18n-ux): kategori çeviri formu — 4 dil bir arada (Faz 1) (@aliturguttursab)
  - Kaynak (varsayılan) dil üstte; her dilde dolu/eksik göstergesi (●) + X/4 sayacı
  - Boş, varsayılan-olmayan dilde "Kaynaktan kopyala" butonu
  - content_default_lang artık dropdown; AR otomatik RTL
  - editLang ref + LangToggle import kaldırıldı; orderedCatLangs/filledCatLangs computed'ları eklendi
  - 4 panel locale'ine categoryManagement.copyFromSource eklendi
- feat(i18n-ux): kategori çeviri formunda bayatlama uyarısı (Faz 2 tamam) (@aliturguttursab)
- feat(feature-catalog): clarify description field is the storefront tooltip (@boraydeger32)

### Duzeltildi
- fix(bulk-import): sürükle-bırak okuma + "Dosya Seç" + gruplu eşleme (@aliiball)
  - onDrop çoklu-aday bayt okuma (0-bayt tuzağı), her alana "Dosya Seç" butonu
  - indirilebilir örnek görsel arşivi (ZIP) butonu
  - Adım 2 / XML eşleme dropdown'u gruplu (Temel/mini-PIM/Özellik/Varyant)
- fix(bulk-import): hata listesi + özet polling yanıtından güncellenir (@aliiball)

### Degistirildi
- refactor(nav): XML Feed menü maddesi + "Eşleştirmelerim" + route düzenlemesi (@aliiball)
  - TOPLU YÜKLEME altına XML Feed; "Pattern'lerim" → "Eşleştirmelerim"
  - eca/feed/eşleştirme route'ları eklendi

---
## [v1.2.0-beta.8] - 2026-06-10 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(feature-catalog): clarify description field is the storefront tooltip (@boraydeger32)

---
## [v1.2.0-beta.7] - 2026-06-10 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(pim): satıcı varyant sihirbazı + taksonomi composable eklendi (@aliiball)
  - useTaxonomy: Marka/Ürün Tipi/Aile/Özellik çekme
  - VariantWizard + ListingFormView varyant matris desteği
- feat(eca): sıfır-bilgi kural sihirbazı + düz-dil liste eklendi (@aliiball)
  - şema-güdümlü alan→operatör→değer cascade, hazır şablonlar, canlı önizleme
  - MyEcaRules teknik kolonlar yerine insan-dilli kart listesi
- feat(bulk-import): "Eşleştirmelerim" — Sütun + Değer eşleştirme sekmeleri (@aliiball)
  - regex'siz kolon-alias (Sütun) + hücre değeri normalizasyonu (Değer)
  - useValueMapping composable + gruplu hedef-alan/geçerli-değer dropdown'u
- feat(feed): XML Feed ekranı + plan-bazlı menü/erişim gate eklendi (@aliiball)
  - SellerFeedView: URL/test/dry-run/çalıştırma geçmişi/sağlık (sıfır-bilgi)
  - useEntitlement + navigation gating (feature.import.xml_feed)
  - PlansTab capability etiketleri; SidePanel kilitli/feature maddesi gösterimi
- feat(i18n): bulk/eca/feed/eşleştirme/entitlement çevirileri (tr/en/ru/ar) (@aliiball)

### Duzeltildi
- fix(bulk-import): sürükle-bırak okuma + "Dosya Seç" + gruplu eşleme (@aliiball)
  - onDrop çoklu-aday bayt okuma (0-bayt tuzağı), her alana "Dosya Seç" butonu
  - indirilebilir örnek görsel arşivi (ZIP) butonu
  - Adım 2 / XML eşleme dropdown'u gruplu (Temel/mini-PIM/Özellik/Varyant)
- fix(bulk-import): hata listesi + özet polling yanıtından güncellenir (@aliiball)

### Degistirildi
- refactor(nav): XML Feed menü maddesi + "Eşleştirmelerim" + route düzenlemesi (@aliiball)
  - TOPLU YÜKLEME altına XML Feed; "Pattern'lerim" → "Eşleştirmelerim"
  - eca/feed/eşleştirme route'ları eklendi

---
## [v1.2.0-beta.6] - 2026-06-10 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(pricing-admin): plan/özellik yönetimi UI iyileştirmeleri (@boraydeger32)
  - Özellik Kataloğu: "+ Yeni Özellik" elle key girme yerine önceden tanımlı havuzdan aranabilir dropdown seç-ekle (featurePresets.js)
  - Feature Catalog'a "Yakında" toggle (storefront rozeti yönetimi)
  - Plan editörü (Paket İçeriği): belirgin "Kartta göster" seçimi, kart sayacı, boş-kart uyarısı ve "+ Yeni Özellik" kısayolu (Özellik Kataloğu'na geçiş)
  - Görüntüleme sekmesine "Fiyat Yerine Metin" alanı (price_override_label)
  - fix: "Değişiklikleri Kaydet" legacy localFeatures'ı REPLACE ile gönderip Paket İçeriği hücrelerini siliyordu → pricing_features artık yalnız matris (PlanFeatureEditor) tarafından yönetiliyor
  - i18n: plans + featureCatalog anahtarları (tr/en/ar/ru)
- feat(i18n): panel kategori dil desteği + içerik-dil alanları (@aliturguttursab)
  - views/seller/ListingFormView.vue: platform kategori ağacı/arama/ata endpoint çağrılarına aktif dil (lang: locale.value) eklendi; panel TR dışında bir dildeyken kategori isimleri çevrili gelir.
  - composables/useLangFields.js + views/products/CategoryManagementView.vue + components/seo/LangToggle.vue: çok-dilli içerik alanı düzenleme (suffix-kolon) desteği.
  - i18n/locales/{en,tr,ar,ru}.js: ilgili anahtar güncellemeleri.
- feat(trial-admin): plan yonetimine global "Trial Ayarlari" karti (@boraydeger32)
  - PlansTab: hangi paket + kac gun + buton metni + aktif (System Manager)
  - permission store: getTrialSettings / updateTrialSettings
  - i18n tr/en trial anahtarlari; placeholder {gun} interpolation kaldirildi (vue-i18n Turkce karakterli param adini parse edemeyince tab bos render oluyordu)
- feat(i18n-ux): kategori çeviri formu — 4 dil bir arada (Faz 1) (@aliturguttursab)
  - Kaynak (varsayılan) dil üstte; her dilde dolu/eksik göstergesi (●) + X/4 sayacı
  - Boş, varsayılan-olmayan dilde "Kaynaktan kopyala" butonu
  - content_default_lang artık dropdown; AR otomatik RTL
  - editLang ref + LangToggle import kaldırıldı; orderedCatLangs/filledCatLangs computed'ları eklendi
  - 4 panel locale'ine categoryManagement.copyFromSource eklendi
- feat(i18n-ux): kategori listesinde çeviri tamamlanmışlık rozeti + filtre (Faz 2) (@aliturguttursab)
  - Her kategoride X/4 rozet (table/grid/list); yeşil=tam, amber=kısmi, kırmızı=≤1 + eksik dil tooltip'i (name_langs backend'den).
  - Header'da "Eksik çeviriler" toggle → displayNodes ile sadece eksikleri gösterir.
  - 4 panel locale'ine filterUntranslated/Hint, missingLangs, allTranslated.
- feat(i18n-ux): kategori çeviri formunda bayatlama uyarısı (Faz 2 tamam) (@aliturguttursab)
- feat(i18n-ux): kategori çeviri workbench'i (Faz 3, grid) (@aliturguttursab)
  - Boş hücre vurgusu + "kaynaktan kopyala"
  - X/4 tamamlanmışlık rozeti; Tümü/Eksik/Bayat filtreleri + dil-bazlı eksik seçici
  - Bayatlama (kaynak değişti) uyarısı; "sıradaki eksiğe atla"; AR otomatik RTL
  - Route + nav (Katalog → Kategori Çevirileri) + categoryTranslations locale (4 dil)
- feat(i18n-ux): ürün formu çeviri UX'i (hafif) — dolu/eksik + kopyala + bayatlama (@aliturguttursab)

---
## [v1.2.0-beta.5] - 2026-06-10 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(trial-admin): plan yonetimine global "Trial Ayarlari" karti (@boraydeger32)
  - PlansTab: hangi paket + kac gun + buton metni + aktif (System Manager)
  - permission store: getTrialSettings / updateTrialSettings
  - i18n tr/en trial anahtarlari; placeholder {gun} interpolation kaldirildi (vue-i18n Turkce karakterli param adini parse edemeyince tab bos render oluyordu)

---
## [v1.2.0-beta.4] - 2026-06-10 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(i18n-ux): kategori çeviri formu — 4 dil bir arada (Faz 1) (@aliturguttursab)
  - Kaynak (varsayılan) dil üstte; her dilde dolu/eksik göstergesi (●) + X/4 sayacı
  - Boş, varsayılan-olmayan dilde "Kaynaktan kopyala" butonu
  - content_default_lang artık dropdown; AR otomatik RTL
  - editLang ref + LangToggle import kaldırıldı; orderedCatLangs/filledCatLangs computed'ları eklendi
  - 4 panel locale'ine categoryManagement.copyFromSource eklendi
- feat(i18n-ux): kategori listesinde çeviri tamamlanmışlık rozeti + filtre (Faz 2) (@aliturguttursab)
  - Her kategoride X/4 rozet (table/grid/list); yeşil=tam, amber=kısmi, kırmızı=≤1 + eksik dil tooltip'i (name_langs backend'den).
  - Header'da "Eksik çeviriler" toggle → displayNodes ile sadece eksikleri gösterir.
  - 4 panel locale'ine filterUntranslated/Hint, missingLangs, allTranslated.
- feat(i18n-ux): kategori çeviri formunda bayatlama uyarısı (Faz 2 tamam) (@aliturguttursab)
- feat(i18n-ux): kategori çeviri workbench'i (Faz 3, grid) (@aliturguttursab)
  - Boş hücre vurgusu + "kaynaktan kopyala"
  - X/4 tamamlanmışlık rozeti; Tümü/Eksik/Bayat filtreleri + dil-bazlı eksik seçici
  - Bayatlama (kaynak değişti) uyarısı; "sıradaki eksiğe atla"; AR otomatik RTL
  - Route + nav (Katalog → Kategori Çevirileri) + categoryTranslations locale (4 dil)
- feat(i18n-ux): ürün formu çeviri UX'i (hafif) — dolu/eksik + kopyala + bayatlama (@aliturguttursab)

---
## [v1.2.0-beta.3] - 2026-06-09 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(pricing-admin): plan/özellik yönetimi UI iyileştirmeleri (@boraydeger32)
  - Özellik Kataloğu: "+ Yeni Özellik" elle key girme yerine önceden tanımlı havuzdan aranabilir dropdown seç-ekle (featurePresets.js)
  - Feature Catalog'a "Yakında" toggle (storefront rozeti yönetimi)
  - Plan editörü (Paket İçeriği): belirgin "Kartta göster" seçimi, kart sayacı, boş-kart uyarısı ve "+ Yeni Özellik" kısayolu (Özellik Kataloğu'na geçiş)
  - Görüntüleme sekmesine "Fiyat Yerine Metin" alanı (price_override_label)
  - fix: "Değişiklikleri Kaydet" legacy localFeatures'ı REPLACE ile gönderip Paket İçeriği hücrelerini siliyordu → pricing_features artık yalnız matris (PlanFeatureEditor) tarafından yönetiliyor
  - i18n: plans + featureCatalog anahtarları (tr/en/ar/ru)

---
## [v1.2.0-beta.2] - 2026-06-08 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(i18n): panel kategori dil desteği + içerik-dil alanları (@aliturguttursab)
  - views/seller/ListingFormView.vue: platform kategori ağacı/arama/ata endpoint çağrılarına aktif dil (lang: locale.value) eklendi; panel TR dışında bir dildeyken kategori isimleri çevrili gelir.
  - composables/useLangFields.js + views/products/CategoryManagementView.vue + components/seo/LangToggle.vue: çok-dilli içerik alanı düzenleme (suffix-kolon) desteği.
  - i18n/locales/{en,tr,ar,ru}.js: ilgili anahtar güncellemeleri.

---
## [v1.2.0-beta.1] - 2026-06-08 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Degistirildi
- refactor: simplify lint workflow by removing auto-fix steps and adjusting permissions (@ahmeetseker)
- refactor(certifications): toplu kaldırma aria-label i18n'e taşındı ve tekrarlı etiketler temizlendi (@ahmeetseker)

---
## [v1.2.0] - 2026-06-05 PROD

Bu surum istoc.com/panel'de yayindadir.

### Eklendi
- feat(changelog): v1.1.10-beta.1 için yeni özellikler eklendi (@ahmeetseker)
- feat(admin-panel): listeleme sayfalarına 4 farklı görünüm + akış iyileştirmeleri (@boraydeger32)
  - Tüm ürün/sipariş/destek/CRM listelerine 4 görünüm modu eklendi: Tablo, Kart, Kanban ve Liste. Kullanıcının seçtiği görünüm bir sonraki ziyarette de hatırlanıyor.
  - Kanban görünümünde kartlar artık kolonlar arası sürükle-bırak yapılabiliyor. Bir ürün "Onay Bekliyor"dan "Aktif"e taşındığında sistemde de durum otomatik güncelleniyor.
  - Ürün listesi düzenlendi: gereksiz "Listing Code" kolonu kaldırıldı, tablo artık ekrana sığıyor (yatay kaydırma yok), uzun başlıklar "..." ile kısaltılıyor.
  - Bir üründen geri çıkışta artık doğru listeye dönülüyor (admin Listing'e, satıcı kendi ürünlerine).
  - "Ürünlerim" sayfasında zaman zaman karşılaşılan boş ekran sorunu giderildi.
- feat(form-fields): DataMaskingField hassas alan widget'ı eklendi (@aliiball)
  - components/widgets/DataMaskingField.vue: tax_id, iban, generic mask modları
  - registry.js: User Profile (tax_id/iban/account_holder_name) + KYC Verification (tax_id) permlevel=1 alanları için renderer eşlemesi
- feat(seo): SEO Yönetimi modülü ve social proof ayarları eklendi (@ahmeetseker)
  - views/seo/ — URL Yönlendirmeleri, 404 Logları, Static Page SEO editor view'ları
  - stores/seoEditor.js + seoRedirects.js, utils/seoAnalyzer.js, turkishTextHelpers.js
  - components/seo/ paylaşılan SEO bileşenleri ve constants/seoDoctypeConfig.js
  - composables/useSlugCheck.js + useFileUpload.js eklendi
  - Social Proof Settings store + view (system bölümü altında)
  - navigation.js'e "SEO Yönetimi" section'ı, router/index.js'e SEO route'ları
  - ListingFormView SEO alanlarıyla refactor edildi
  - doctype tab-extensions yeni alanlara genişletildi
  - utils için ilk birim test seti (__tests__) eklendi
- feat(admin): yetki sistemi UI — permission console, B2B onay, compliance, (@boraydeger32)
  - /accept-invite — sub-user davet kabul akışı
  - /permission-console — Süper Admin yetki konsolu (4 tab)
  - /seller-team, /buyer-team — sub-user yönetimi
  - /approval-queue — B2B sipariş onay kuyruğu (L1/L2)
  - /authorization-simulator — yetki simülatörü (debug aracı)
  - /compliance/pii-mask-matrix — PII jurisdiction maskeleme matrisi
  - /procurement/cost-centers — cost center ağacı
  - /procurement/approved-suppliers — onaylı tedarikçi listesi
  - /compliance/anomaly-dashboard — anomali alert paneli
  - /delegation — yetki devri yönetimi
  - /owner-transfer — mağaza sahibi devri
  - auth/AcceptInviteView.vue
  - buyer/BuyerTeamManagementView.vue + buyer/procurement/* (cost center, approved suppliers)
  - orders/ApprovalQueueView.vue
  - permission/{AuditLogTab,PlansTab,RolesTab,UsersTab}.vue (Permission Console tab'ları)
  - seller/SubUserManagementView.vue
  - system/{AnomalyDashboard,AuthorizationSimulator,ComplianceMaskMatrix, DelegationManager,OwnerTransfer,PermissionConsole}View.vue
  - stores/permission.js (yeni) — Permission Console state.
  - stores/auth.js: yetki bayrakları + temporary role state.
  - stores/navigation.js + data/navigation.js: yeni rail section'ları (system tools, procurement, compliance, B2B team) ve role-bazlı görünürlük.
  - stores/tenant.js: tenant context iyileştirmeleri (delegation + owner transfer akışları için).
  - utils/api.js: helper'lar.
  - StorefrontLayoutEditor: layout state senkronizasyon iyileştirmesi.
  - SellerListingsView + SellerOrdersView: küçük UX düzeltmeleri.
- feat(bulk-import): toplu içe aktarma yönetim ekranları eklendi (@aliiball)
  - BulkProductImportView (yeni job başlatma)
  - BulkImportDetailView (job durumu, hata satırı, onay akışı)
  - BulkImportHistoryView (geçmiş job listesi)
  - XmlMappingView (XML → DocType field eşleştirme)
  - useBulkImport composable ile API entegrasyonu
  - Navigation + router girişleri
  - EcaRulesView / EcaRuleFormView / EcaRuleLogView / MyEcaRulesView
  - useEcaRule composable
  - FilterBuilder, SmartFieldDropdown, IconPickerField bileşenleri ECA condition builder için genişletildi
  - RegexPatternsView ve MyRegexPatternsView
  - useRegexPattern composable
  - src/lib/upload-ui/ (dropzone, uploader, file-list, facades)
  - ImagePickerUpload, MultiFileUpload, ProfileImageDropzone, SlotUpload bileşenleri
  - useDropzone, useImageUploadProgress(Map) composable'ları
  - ProductAddView kaldırıldı, ListingFormView ile birleştirildi
  - SellerListings (seller_sku kolonu), StorefrontEdit, MyCertifications, TicketDetailView, CategoryManagement, ListingModeration upload-ui'a taşındı
- feat(router): yetki yönetimi route'una super admin koruması ekle (@boraydeger32)
  - 'Yetki Yönetimi' route'una meta.section ve meta.requiresSuperAdmin alanları eklendi
  - ListingFormView ve SeoPagesView'da prettier formatlama düzeltmeleri
- feat: KVKK/GDPR uyumluluk navigasyonu ve tracking ayarları sayfası ekle (@ahmeetseker)
- feat(masking): rol bazlı dashboard ve sipariş veri maskeleme UI (@boraydeger32)
  - DynamicKpi.vue masked state desteği — masked_label gösterimi
  - KpiCard.vue masked prop — blur(6px) + opacity efekti ile görsel maskeleme
  - DynamicLineChart.vue masked chart — bulanık placeholder chart
  - SellerOrdersView.vue buyer_masked blur gösterimi
  - SellerOrdersView.vue amounts_masked tutar gizleme
  - Nginx config storefront ve admin-panel lokal frappe-nginx'e proxy
- feat(messaging): buyer messages + availability görünümleri, reservation/buyerMessages store'ları (@aliturguttursab)
  - BuyerMessagesView + AvailabilityView (messaging)
  - reservation ve buyerMessages Pinia store'ları
  - navigation/router girişleri + api util güncellemesi
- feat(kyc): admin panel KYC hızlı aksiyonlar ve form iyileştirmeleri (@aliiball)
  - KYC Verification için 4 hızlı aksiyon butonu eklendi (Doğrula, Reddet, Askıya Al, Yeniden İncele) — review_kyc backend endpoint'i entegre edildi
  - KYB Reddet modal'ı KYC ile paylaşımlı hale getirildi, KYB davranışı korundu
  - KYC Reddet modal'ında Re-submit/Suspended kategori seçimi zorunlu yapıldı
  - Textarea resize handle alt-ortaya taşındı (txResize plugin, MutationObserver ile sıfır template touch, tüm textarea'lar otomatik sarmalanır)
  - Yeni Duyuru ve Devir Talebi modal'larında textarea full-width yapıldı
  - Sidebar Rail 1 genişliği 96px'e ayarlandı
  - Sidebar 1 ve 2 font-weight +100 (TenantSwitcher, panel başlıkları, label'lar)
  - Lucide ikon adları yeni sürüm rename'lerine uyduruldu (grid 3x3, circle-check, triangle-alert, cloud-upload, square-check, file-exclamation-point)
  - Dashboard Banner ikonu image oldu (Header Duyuruları megaphone'dan ayrıldı)
  - KYC Doğrulama (Alıcı) ikonu id-card oldu (Satıcı Profilleri'nden ayrıldı)
- feat(rbac-ui): Faz A-H — Permission Console + master sync (@boraydeger32)
  - 7 commit fast-forward edildi
  - router/index.js: meta.module + doctype/route gating + sub-user whitelist
  - stores/navigation.js: dbSellerSections + hiddenDoctypes/Routes Set
  - stores/auth.js: login/logout sonrası navigation resetState (stale fix)
  - stores/permission.js: createRoleProfile + updateRoleProfile + delete + sync
  - Permission Console 10 tab orchestration (?tab= query persist)
  - components/system/CapabilityMatrixTab: matrix + filter + bulk grant
  - components/system/ModuleMatrixTab: 3-state cycle + protected modal
  - components/system/PermissionOverviewTab: 5 KPI + plan tutarsızlık bandı
  - components/system/RoleProfileEditModal: CRUD modal (template inheritance)
  - composables/usePermission: can/seesModule/moduleMode/isMasked/isHidden
  - views/permission/RolesTab: CRUD entegrasyonu (Yeni/Düzenle/Sil + confirm)
  - views/permission/AuditLogTab: 🔒 Maskeleme preset + masked chip
  - views/permission/PlansTab + UsersTab: detay panel
  - views/doctype/DocTypeFormView: maxWritablePermlevel computed (Owner IBAN)
  - common/AppIcon: Lucide v1+ alias map (CheckCircle→CircleCheck vs.)
- feat(plans-ui): + Yeni Plan modal + Plan sil + System Manager gating (@boraydeger32)
  - createSubscriptionPlan({plan_code, plan_name, monthly_price, ...})
  - deleteSubscriptionPlan(plan_code) — selectedPlan reset + fetchPlans
  - Backend tradehub_core.api.v1.permission_console.create/delete_subscription_plan
  - + Yeni Plan butonu (sol panel başında, canManagePlans gated)
  - canManagePlans: isAdmin || roles.includes("System Manager") — Marketplace Admin görmez (Faz F.4 financial separation ile uyum)
  - Yeni Plan modal: plan_code + plan_name + description + monthly/yearly + currency (EUR/USD/TRY) + commission + max_listings + trial_days + is_active + is_public checkbox + uyarı hint ("capability_flags boş başlar")
  - Plan detail detail-actions'a "Sil" butonu — PROTECTED_PLAN_CODES (FREE/STARTER/PRO/ENTERPRISE) disabled + tooltip — active_subscription_count > 0 disabled + "önce abonelikleri taşıyın"
  - Delete confirm dialog (kırmızı header + cascade uyarısı)
  - Modal CSS: pln-modal-backdrop + pln-modal + pln-confirm + pln-field (light/dark mode, token-based, brand button + danger button)
  - "Plan X oluşturuldu" / "Plan X silindi" / hata mesajı
- feat(i18n): migrate admin panel to vue-i18n with ar/ru and RTL (@aliturguttursab)
  - i18n: add src/i18n with createI18n (legacy:false, globalInjection), th-lang persistence + browser detection, en/tr/ar/ru locale bundles
  - direction: RTL_LANGS/isRtl() + applyDocumentDirection() set <html dir>/<html lang>; "ar" rendered RTL
  - nav: add LanguageSwitcher.vue component
  - views/components: replace hard-coded strings with $t across ~170 views and shared components
- feat(crm): saha pazarlama hakediş paneli eklendi (@ahmeetseker)
  - Hakedişlerim, Hakediş Yönetimi ve Hakediş Ayarları görünümleri
  - fieldCommissions Pinia store'u
  - Subscription plan formuna saha komisyon türü/oran/mod/süre alanları
  - "Saha Pazarlama" rolüne panel erişimi (isFieldAgent guard)
  - Hero Slider yönetim görünümü ve slide düzenleme modalı
  - Hakediş ve Hero Slider için navigasyon menüsü + route tanımları
- feat(modules): "Maskeli" legend ikonu üstü çizili göz (EyeOff) (@boraydeger32)
- feat(dashboard-manager): widget satırlarına scope alanı rozeti eklendi (@aliiball)
  - Yeşil rozet (shield icon): scope_field tanımlı, satıcılar görür
  - Kırmızı rozet (warning icon): scope_field eksik, satıcılar göremez
  - Quick links / funnel chart için rozet gösterilmiyor (veri çekmiyor)
- feat(görünüm): liste sayfalarına çoklu görünüm seçici yaygınlaştırıldı (@aliiball)
  - 27 liste sayfasına Tablo/Kart/Kanban/Liste görünüm modları eklendi
  - ViewModeToggle modes prop'u ile 2/3/4 mod yapılandırılabilir hale getirildi
  - Tekrar kullanılabilir generic KanbanBoard component'i eklendi
  - CRM görünüm seçici (CrmListToolbar) standart ViewModeToggle'a taşındı
  - Hakediş Ayarları, Hero Slider ve Sosyal Kanıt Ayarları sayfaları ortalandı
  - Kullanılmayan CRM kanban stilleri temizlendi
- feat(permission-console): plan & özellik yönetimi (katalog + matris + karşılaştırma) (@boraydeger32)
  - Özellik Kataloğu sekmesi (FeatureCatalogTab) — feature CRUD + value_type
  - Plan Feature Editör (PlanFeatureEditor) — tipine uygun kontrol (toggle/quota/enum/text) + "Kartta" kürasyonu
  - Plan Karşılaştırma sekmesi (PlanComparisonTab) — salt-okunur matris
  - PlansTab: tek "Değişiklikleri Kaydet" matrisi de kaydeder + kaydedilmemiş değişiklik guard'ları (refresh / plan değiştir / sekme değiştir)
  - permission store: plan_features + feature_catalog uçları
  - i18n (tr/en/ar/ru); RolesTab + PermissionConsoleView küçük güncellemeler
- feat(admin): kategori vitrini yönetimi ve ekip hakediş onayı eklendi (@ahmeetseker)
  - Kategori Vitrini yönetim ekranı eklendi (sürükle-bırak dizilim, layout preset, kutu düzenleme modalı)
  - Saha hakedişine 2 aşamalı onay akışı eklendi: Lider Onayı → Süperadmin Onayı
  - "Ekip Hakedişleri" görünümü ve Saha Ekip Lideri rolü eklendi
  - Plan yönetimine paket bazlı kota bonusu eşik tablosu (quotaTiers) eklendi
  - Hakediş ayarları global sabit tutardan kota dönemi seçimine geçirildi
  - Hakediş durum filtreleri ve rozetleri yeni iki aşamalı duruma göre güncellendi

### Duzeltildi
- fix(release): son tag mantığını güncelleyerek boş guard sorununu çözüldü (@ahmeetseker)
- fix(doctype-list): user.seller_profile filter user.email'e taşındı (@aliiball)
  - DocTypeListView.vue:398 Seller Profile filter User Profile'a yönlendi (User Profile.name=email autoname)
  - ADMIN_ONLY_DOCTYPES + NO_CREATE_FOR_SELLER setleri Sprint 2 isimlerine güncellendi
  - LIVE BUG
- fix(admin): DataMaskingField TS parse hatası düzeltildi (@aliiball)
  - TS interface ve defineProps<T>() çağrıları object-prop syntax'ına çevrildi
  - console.info çağrısı no-console allow listesine uygun şekilde console.warn'a çevrildi
- fix(hooks): Regex Pattern Library dict'inde eksik brace düzeltildi (@aliiball)
  - doc_events["Regex Pattern Library"] iç dict'i `},` ile kapatılmamış, sonraki tüm doctype'lar bu dict'in içine gömülüyordu
  - permission_query_conditions parse hatası giderildi
- fix(perm-console): vue-router'ı native History API ile değiştir (@boraydeger32)
  - vue-router npm paketi `useRoute`/`useRouter` export ediyor (kontrol edildi)
  - Vue SFC compiler script setup'ı doğru transform ediyor (compileScript çıktısı OK)
  - AMA Vite Rollup production build'i `useRoute`/`useRouter` referanslarını tree-shake ile drop ediyor → index bundle'da sadece RouterLink/RouterView/useLink kalıyor, PermissionConsoleView çağrıda `useRoute is not defined`
- fix(perm-console): kayıp 6 tab geri eklendi (overview, capabilities, modules, masking, simulator, anomaly) (@boraydeger32)
- fix(roles): silinen UI elementlerini geri ekle (header + protected badge + capability bölümü) (@boraydeger32)
  - Header bloğu: rol sayacı + "+ Yeni Rol Profili" butonu (openCreateModal'a bağlı)
  - 🔒 Protected badge: rol listesi item + detail header h2
  - Capability özet bölümü: toplam sayı + capability sekmesi deep-link + module group bazlı capability chip listesi + bayraklar (🛡 owner-only, 🔒 protected, 🆔 KYC, 🚨 AML, 💎 plan feature)
- fix(modules): "Maskeli" hücre ikonu matriste de uygulansın + hizalama (@boraydeger32)
  - Hücre template: masked moduna AppIcon eye-off render edilsin
  - CSS: .legend-icon + .cell-icon ortak — display:inline-block + vertical-align middle (td içinde yatay/dikey ortalama)
- fix(conflicts) : Merge master into Ali (@aliiball)
  - BulkProductImportView: master i18n tarafı (colSelect kolonu dahil)
  - EcaRuleFormView: master radio-group + i18n
  - MyCertificationsView: master label wrapper, cert-chip SCSS korundu
  - DashboardManagerView: master i18n metinler + scope rozeti birleşik
- fix(ui): merge sonrası kaybolan radio-toggle değişiklikleri geri getirildi (@aliiball)
  - ECA Kural Kapsam alanı BaseSwitch'e çevrildi
  - Toplu içe aktarma güncelleme modu BaseSwitch'e çevrildi
  - Sertifika toplu kaldırma seçimi button chip'e çevrildi
  - BaseSwitch ve BaseSegmented bileşenleri zaten mevcuttu; sadece kullanımları geri eklendi
- fix: ensure payload is processed correctly before updating pricing plan (@ahmeetseker)

### Degistirildi
- refactor(navigation): KYC + KYB ayrı 2 giriş + User Profile yönlendirmesi (@aliiball)
  - data/navigation.js: KYC Doğrulama (Alıcı) + KYB Doğrulama (Satıcı) ayrı menü item'ları
  - Satıcı/Alıcı Profilleri + Profilim → User Profile
  - SidePanel.vue SELLER_DIRECT_FORM Seller Profile → User Profile
- refactor(doctype): DocTypeFormView + tab-extensions Sprint 2 alan uyumu (@aliiball)
  - DocTypeFormView.vue + tab-extensions.js User Profile + Admin Seller Profile alan adı referansları güncellendi
- refactor(deps): origin/master merge conflict'i çözüldü, 1.1.9-beta.4 seçildi (@ahmeetseker)
- refactor(lint): kalan ESLint warning'leri sıfırlandı (@ahmeetseker)
  - LayoutSectionCard.vue defineProps → defineModel (Vue 3.5 pattern); 26 vue/no-mutating-props + 2 vue/no-side-effects-in-computed-properties giderildi
  - 30+ unused vars temizlendi: dead code silindi, catch (e) → catch {}, intentional discard'larda _ prefix
  - Debug console.log silindi veya console.warn'a çevrildi
  - v-html için Frappe backend sanitize gerekçeli eslint-disable + güvenlik yorumu eklendi (block disable multi-line için)
  - eslint.config.js: LayoutSectionCard.vue istisnası kaldırıldı; varsIgnorePattern + caughtErrorsIgnorePattern: '^_' eklendi
- refactor(ui): radio seçimleri toggle bileşenlerine dönüştürüldü (@aliiball)
  - BaseSwitch ve BaseSegmented ortak bileşenleri eklendi
  - ECA kural kapsam seçimi switch'e çevrildi
  - toplu içe aktarma güncelleme modu switch, başlık satırı select'e çevrildi
  - header duyuru gösterim modu segmented'e çevrildi
  - sertifika toplu kaldırma chip grubuna çevrildi
- refactor(i18n): DocType terimi UI'da Modül olarak değiştirildi (@aliiball)
  - ECA Kural formu, Dashboard Widget, Compliance Mask Matrix, Core DocType Picker, Smart Field Dropdown, Fee Rules ve ECA Rule Log ekranlarında "DocType" → "Modül" çevrildi
  - 4 dilde (tr, en, ar, ru) toplam 56 metin güncellendi
  - ECA Kapsam switch'i için scopeSwitchLabel ve scopeSwitchDesc key'leri eklendi
  - Bulk import güncelleme modu switch'i için modeSwitchDesc key'i eklendi
  - Frappe iç API field adları (reference_doctype vb.) ve Link field options ("DocType") korundu

---
## [v1.1.9-rc.2] - 2026-06-05 RC

Bu surum rc.istoc.com/panel'de onay asamasindadir.

### Eklendi
- feat(changelog): v1.1.10-beta.1 için yeni özellikler eklendi (@ahmeetseker)
- feat(admin-panel): listeleme sayfalarına 4 farklı görünüm + akış iyileştirmeleri (@boraydeger32)
  - Tüm ürün/sipariş/destek/CRM listelerine 4 görünüm modu eklendi: Tablo, Kart, Kanban ve Liste. Kullanıcının seçtiği görünüm bir sonraki ziyarette de hatırlanıyor.
  - Kanban görünümünde kartlar artık kolonlar arası sürükle-bırak yapılabiliyor. Bir ürün "Onay Bekliyor"dan "Aktif"e taşındığında sistemde de durum otomatik güncelleniyor.
  - Ürün listesi düzenlendi: gereksiz "Listing Code" kolonu kaldırıldı, tablo artık ekrana sığıyor (yatay kaydırma yok), uzun başlıklar "..." ile kısaltılıyor.
  - Bir üründen geri çıkışta artık doğru listeye dönülüyor (admin Listing'e, satıcı kendi ürünlerine).
  - "Ürünlerim" sayfasında zaman zaman karşılaşılan boş ekran sorunu giderildi.
- feat(form-fields): DataMaskingField hassas alan widget'ı eklendi (@aliiball)
  - components/widgets/DataMaskingField.vue: tax_id, iban, generic mask modları
  - registry.js: User Profile (tax_id/iban/account_holder_name) + KYC Verification (tax_id) permlevel=1 alanları için renderer eşlemesi
- feat(seo): SEO Yönetimi modülü ve social proof ayarları eklendi (@ahmeetseker)
  - views/seo/ — URL Yönlendirmeleri, 404 Logları, Static Page SEO editor view'ları
  - stores/seoEditor.js + seoRedirects.js, utils/seoAnalyzer.js, turkishTextHelpers.js
  - components/seo/ paylaşılan SEO bileşenleri ve constants/seoDoctypeConfig.js
  - composables/useSlugCheck.js + useFileUpload.js eklendi
  - Social Proof Settings store + view (system bölümü altında)
  - navigation.js'e "SEO Yönetimi" section'ı, router/index.js'e SEO route'ları
  - ListingFormView SEO alanlarıyla refactor edildi
  - doctype tab-extensions yeni alanlara genişletildi
  - utils için ilk birim test seti (__tests__) eklendi
- feat(admin): yetki sistemi UI — permission console, B2B onay, compliance, (@boraydeger32)
  - /accept-invite — sub-user davet kabul akışı
  - /permission-console — Süper Admin yetki konsolu (4 tab)
  - /seller-team, /buyer-team — sub-user yönetimi
  - /approval-queue — B2B sipariş onay kuyruğu (L1/L2)
  - /authorization-simulator — yetki simülatörü (debug aracı)
  - /compliance/pii-mask-matrix — PII jurisdiction maskeleme matrisi
  - /procurement/cost-centers — cost center ağacı
  - /procurement/approved-suppliers — onaylı tedarikçi listesi
  - /compliance/anomaly-dashboard — anomali alert paneli
  - /delegation — yetki devri yönetimi
  - /owner-transfer — mağaza sahibi devri
  - auth/AcceptInviteView.vue
  - buyer/BuyerTeamManagementView.vue + buyer/procurement/* (cost center, approved suppliers)
  - orders/ApprovalQueueView.vue
  - permission/{AuditLogTab,PlansTab,RolesTab,UsersTab}.vue (Permission Console tab'ları)
  - seller/SubUserManagementView.vue
  - system/{AnomalyDashboard,AuthorizationSimulator,ComplianceMaskMatrix, DelegationManager,OwnerTransfer,PermissionConsole}View.vue
  - stores/permission.js (yeni) — Permission Console state.
  - stores/auth.js: yetki bayrakları + temporary role state.
  - stores/navigation.js + data/navigation.js: yeni rail section'ları (system tools, procurement, compliance, B2B team) ve role-bazlı görünürlük.
  - stores/tenant.js: tenant context iyileştirmeleri (delegation + owner transfer akışları için).
  - utils/api.js: helper'lar.
  - StorefrontLayoutEditor: layout state senkronizasyon iyileştirmesi.
  - SellerListingsView + SellerOrdersView: küçük UX düzeltmeleri.
- feat(bulk-import): toplu içe aktarma yönetim ekranları eklendi (@aliiball)
  - BulkProductImportView (yeni job başlatma)
  - BulkImportDetailView (job durumu, hata satırı, onay akışı)
  - BulkImportHistoryView (geçmiş job listesi)
  - XmlMappingView (XML → DocType field eşleştirme)
  - useBulkImport composable ile API entegrasyonu
  - Navigation + router girişleri
  - EcaRulesView / EcaRuleFormView / EcaRuleLogView / MyEcaRulesView
  - useEcaRule composable
  - FilterBuilder, SmartFieldDropdown, IconPickerField bileşenleri ECA condition builder için genişletildi
  - RegexPatternsView ve MyRegexPatternsView
  - useRegexPattern composable
  - src/lib/upload-ui/ (dropzone, uploader, file-list, facades)
  - ImagePickerUpload, MultiFileUpload, ProfileImageDropzone, SlotUpload bileşenleri
  - useDropzone, useImageUploadProgress(Map) composable'ları
  - ProductAddView kaldırıldı, ListingFormView ile birleştirildi
  - SellerListings (seller_sku kolonu), StorefrontEdit, MyCertifications, TicketDetailView, CategoryManagement, ListingModeration upload-ui'a taşındı
- feat(router): yetki yönetimi route'una super admin koruması ekle (@boraydeger32)
  - 'Yetki Yönetimi' route'una meta.section ve meta.requiresSuperAdmin alanları eklendi
  - ListingFormView ve SeoPagesView'da prettier formatlama düzeltmeleri
- feat: KVKK/GDPR uyumluluk navigasyonu ve tracking ayarları sayfası ekle (@ahmeetseker)
- feat(masking): rol bazlı dashboard ve sipariş veri maskeleme UI (@boraydeger32)
  - DynamicKpi.vue masked state desteği — masked_label gösterimi
  - KpiCard.vue masked prop — blur(6px) + opacity efekti ile görsel maskeleme
  - DynamicLineChart.vue masked chart — bulanık placeholder chart
  - SellerOrdersView.vue buyer_masked blur gösterimi
  - SellerOrdersView.vue amounts_masked tutar gizleme
  - Nginx config storefront ve admin-panel lokal frappe-nginx'e proxy
- feat(messaging): buyer messages + availability görünümleri, reservation/buyerMessages store'ları (@aliturguttursab)
  - BuyerMessagesView + AvailabilityView (messaging)
  - reservation ve buyerMessages Pinia store'ları
  - navigation/router girişleri + api util güncellemesi
- feat(kyc): admin panel KYC hızlı aksiyonlar ve form iyileştirmeleri (@aliiball)
  - KYC Verification için 4 hızlı aksiyon butonu eklendi (Doğrula, Reddet, Askıya Al, Yeniden İncele) — review_kyc backend endpoint'i entegre edildi
  - KYB Reddet modal'ı KYC ile paylaşımlı hale getirildi, KYB davranışı korundu
  - KYC Reddet modal'ında Re-submit/Suspended kategori seçimi zorunlu yapıldı
  - Textarea resize handle alt-ortaya taşındı (txResize plugin, MutationObserver ile sıfır template touch, tüm textarea'lar otomatik sarmalanır)
  - Yeni Duyuru ve Devir Talebi modal'larında textarea full-width yapıldı
  - Sidebar Rail 1 genişliği 96px'e ayarlandı
  - Sidebar 1 ve 2 font-weight +100 (TenantSwitcher, panel başlıkları, label'lar)
  - Lucide ikon adları yeni sürüm rename'lerine uyduruldu (grid 3x3, circle-check, triangle-alert, cloud-upload, square-check, file-exclamation-point)
  - Dashboard Banner ikonu image oldu (Header Duyuruları megaphone'dan ayrıldı)
  - KYC Doğrulama (Alıcı) ikonu id-card oldu (Satıcı Profilleri'nden ayrıldı)
- feat(rbac-ui): Faz A-H — Permission Console + master sync (@boraydeger32)
  - 7 commit fast-forward edildi
  - router/index.js: meta.module + doctype/route gating + sub-user whitelist
  - stores/navigation.js: dbSellerSections + hiddenDoctypes/Routes Set
  - stores/auth.js: login/logout sonrası navigation resetState (stale fix)
  - stores/permission.js: createRoleProfile + updateRoleProfile + delete + sync
  - Permission Console 10 tab orchestration (?tab= query persist)
  - components/system/CapabilityMatrixTab: matrix + filter + bulk grant
  - components/system/ModuleMatrixTab: 3-state cycle + protected modal
  - components/system/PermissionOverviewTab: 5 KPI + plan tutarsızlık bandı
  - components/system/RoleProfileEditModal: CRUD modal (template inheritance)
  - composables/usePermission: can/seesModule/moduleMode/isMasked/isHidden
  - views/permission/RolesTab: CRUD entegrasyonu (Yeni/Düzenle/Sil + confirm)
  - views/permission/AuditLogTab: 🔒 Maskeleme preset + masked chip
  - views/permission/PlansTab + UsersTab: detay panel
  - views/doctype/DocTypeFormView: maxWritablePermlevel computed (Owner IBAN)
  - common/AppIcon: Lucide v1+ alias map (CheckCircle→CircleCheck vs.)
- feat(plans-ui): + Yeni Plan modal + Plan sil + System Manager gating (@boraydeger32)
  - createSubscriptionPlan({plan_code, plan_name, monthly_price, ...})
  - deleteSubscriptionPlan(plan_code) — selectedPlan reset + fetchPlans
  - Backend tradehub_core.api.v1.permission_console.create/delete_subscription_plan
  - + Yeni Plan butonu (sol panel başında, canManagePlans gated)
  - canManagePlans: isAdmin || roles.includes("System Manager") — Marketplace Admin görmez (Faz F.4 financial separation ile uyum)
  - Yeni Plan modal: plan_code + plan_name + description + monthly/yearly + currency (EUR/USD/TRY) + commission + max_listings + trial_days + is_active + is_public checkbox + uyarı hint ("capability_flags boş başlar")
  - Plan detail detail-actions'a "Sil" butonu — PROTECTED_PLAN_CODES (FREE/STARTER/PRO/ENTERPRISE) disabled + tooltip — active_subscription_count > 0 disabled + "önce abonelikleri taşıyın"
  - Delete confirm dialog (kırmızı header + cascade uyarısı)
  - Modal CSS: pln-modal-backdrop + pln-modal + pln-confirm + pln-field (light/dark mode, token-based, brand button + danger button)
  - "Plan X oluşturuldu" / "Plan X silindi" / hata mesajı
- feat(i18n): migrate admin panel to vue-i18n with ar/ru and RTL (@aliturguttursab)
  - i18n: add src/i18n with createI18n (legacy:false, globalInjection), th-lang persistence + browser detection, en/tr/ar/ru locale bundles
  - direction: RTL_LANGS/isRtl() + applyDocumentDirection() set <html dir>/<html lang>; "ar" rendered RTL
  - nav: add LanguageSwitcher.vue component
  - views/components: replace hard-coded strings with $t across ~170 views and shared components
- feat(crm): saha pazarlama hakediş paneli eklendi (@ahmeetseker)
  - Hakedişlerim, Hakediş Yönetimi ve Hakediş Ayarları görünümleri
  - fieldCommissions Pinia store'u
  - Subscription plan formuna saha komisyon türü/oran/mod/süre alanları
  - "Saha Pazarlama" rolüne panel erişimi (isFieldAgent guard)
  - Hero Slider yönetim görünümü ve slide düzenleme modalı
  - Hakediş ve Hero Slider için navigasyon menüsü + route tanımları
- feat(modules): "Maskeli" legend ikonu üstü çizili göz (EyeOff) (@boraydeger32)
- feat(dashboard-manager): widget satırlarına scope alanı rozeti eklendi (@aliiball)
  - Yeşil rozet (shield icon): scope_field tanımlı, satıcılar görür
  - Kırmızı rozet (warning icon): scope_field eksik, satıcılar göremez
  - Quick links / funnel chart için rozet gösterilmiyor (veri çekmiyor)
- feat(görünüm): liste sayfalarına çoklu görünüm seçici yaygınlaştırıldı (@aliiball)
  - 27 liste sayfasına Tablo/Kart/Kanban/Liste görünüm modları eklendi
  - ViewModeToggle modes prop'u ile 2/3/4 mod yapılandırılabilir hale getirildi
  - Tekrar kullanılabilir generic KanbanBoard component'i eklendi
  - CRM görünüm seçici (CrmListToolbar) standart ViewModeToggle'a taşındı
  - Hakediş Ayarları, Hero Slider ve Sosyal Kanıt Ayarları sayfaları ortalandı
  - Kullanılmayan CRM kanban stilleri temizlendi
- feat(permission-console): plan & özellik yönetimi (katalog + matris + karşılaştırma) (@boraydeger32)
  - Özellik Kataloğu sekmesi (FeatureCatalogTab) — feature CRUD + value_type
  - Plan Feature Editör (PlanFeatureEditor) — tipine uygun kontrol (toggle/quota/enum/text) + "Kartta" kürasyonu
  - Plan Karşılaştırma sekmesi (PlanComparisonTab) — salt-okunur matris
  - PlansTab: tek "Değişiklikleri Kaydet" matrisi de kaydeder + kaydedilmemiş değişiklik guard'ları (refresh / plan değiştir / sekme değiştir)
  - permission store: plan_features + feature_catalog uçları
  - i18n (tr/en/ar/ru); RolesTab + PermissionConsoleView küçük güncellemeler
- feat(admin): kategori vitrini yönetimi ve ekip hakediş onayı eklendi (@ahmeetseker)
  - Kategori Vitrini yönetim ekranı eklendi (sürükle-bırak dizilim, layout preset, kutu düzenleme modalı)
  - Saha hakedişine 2 aşamalı onay akışı eklendi: Lider Onayı → Süperadmin Onayı
  - "Ekip Hakedişleri" görünümü ve Saha Ekip Lideri rolü eklendi
  - Plan yönetimine paket bazlı kota bonusu eşik tablosu (quotaTiers) eklendi
  - Hakediş ayarları global sabit tutardan kota dönemi seçimine geçirildi
  - Hakediş durum filtreleri ve rozetleri yeni iki aşamalı duruma göre güncellendi

### Duzeltildi
- fix(release): son tag mantığını güncelleyerek boş guard sorununu çözüldü (@ahmeetseker)
- fix(doctype-list): user.seller_profile filter user.email'e taşındı (@aliiball)
  - DocTypeListView.vue:398 Seller Profile filter User Profile'a yönlendi (User Profile.name=email autoname)
  - ADMIN_ONLY_DOCTYPES + NO_CREATE_FOR_SELLER setleri Sprint 2 isimlerine güncellendi
  - LIVE BUG
- fix(admin): DataMaskingField TS parse hatası düzeltildi (@aliiball)
  - TS interface ve defineProps<T>() çağrıları object-prop syntax'ına çevrildi
  - console.info çağrısı no-console allow listesine uygun şekilde console.warn'a çevrildi
- fix(hooks): Regex Pattern Library dict'inde eksik brace düzeltildi (@aliiball)
  - doc_events["Regex Pattern Library"] iç dict'i `},` ile kapatılmamış, sonraki tüm doctype'lar bu dict'in içine gömülüyordu
  - permission_query_conditions parse hatası giderildi
- fix(perm-console): vue-router'ı native History API ile değiştir (@boraydeger32)
  - vue-router npm paketi `useRoute`/`useRouter` export ediyor (kontrol edildi)
  - Vue SFC compiler script setup'ı doğru transform ediyor (compileScript çıktısı OK)
  - AMA Vite Rollup production build'i `useRoute`/`useRouter` referanslarını tree-shake ile drop ediyor → index bundle'da sadece RouterLink/RouterView/useLink kalıyor, PermissionConsoleView çağrıda `useRoute is not defined`
- fix(perm-console): kayıp 6 tab geri eklendi (overview, capabilities, modules, masking, simulator, anomaly) (@boraydeger32)
- fix(roles): silinen UI elementlerini geri ekle (header + protected badge + capability bölümü) (@boraydeger32)
  - Header bloğu: rol sayacı + "+ Yeni Rol Profili" butonu (openCreateModal'a bağlı)
  - 🔒 Protected badge: rol listesi item + detail header h2
  - Capability özet bölümü: toplam sayı + capability sekmesi deep-link + module group bazlı capability chip listesi + bayraklar (🛡 owner-only, 🔒 protected, 🆔 KYC, 🚨 AML, 💎 plan feature)
- fix(modules): "Maskeli" hücre ikonu matriste de uygulansın + hizalama (@boraydeger32)
  - Hücre template: masked moduna AppIcon eye-off render edilsin
  - CSS: .legend-icon + .cell-icon ortak — display:inline-block + vertical-align middle (td içinde yatay/dikey ortalama)
- fix(conflicts) : Merge master into Ali (@aliiball)
  - BulkProductImportView: master i18n tarafı (colSelect kolonu dahil)
  - EcaRuleFormView: master radio-group + i18n
  - MyCertificationsView: master label wrapper, cert-chip SCSS korundu
  - DashboardManagerView: master i18n metinler + scope rozeti birleşik
- fix(ui): merge sonrası kaybolan radio-toggle değişiklikleri geri getirildi (@aliiball)
  - ECA Kural Kapsam alanı BaseSwitch'e çevrildi
  - Toplu içe aktarma güncelleme modu BaseSwitch'e çevrildi
  - Sertifika toplu kaldırma seçimi button chip'e çevrildi
  - BaseSwitch ve BaseSegmented bileşenleri zaten mevcuttu; sadece kullanımları geri eklendi
- fix: ensure payload is processed correctly before updating pricing plan (@ahmeetseker)

### Degistirildi
- refactor(navigation): KYC + KYB ayrı 2 giriş + User Profile yönlendirmesi (@aliiball)
  - data/navigation.js: KYC Doğrulama (Alıcı) + KYB Doğrulama (Satıcı) ayrı menü item'ları
  - Satıcı/Alıcı Profilleri + Profilim → User Profile
  - SidePanel.vue SELLER_DIRECT_FORM Seller Profile → User Profile
- refactor(doctype): DocTypeFormView + tab-extensions Sprint 2 alan uyumu (@aliiball)
  - DocTypeFormView.vue + tab-extensions.js User Profile + Admin Seller Profile alan adı referansları güncellendi
- refactor(deps): origin/master merge conflict'i çözüldü, 1.1.9-beta.4 seçildi (@ahmeetseker)
- refactor(lint): kalan ESLint warning'leri sıfırlandı (@ahmeetseker)
  - LayoutSectionCard.vue defineProps → defineModel (Vue 3.5 pattern); 26 vue/no-mutating-props + 2 vue/no-side-effects-in-computed-properties giderildi
  - 30+ unused vars temizlendi: dead code silindi, catch (e) → catch {}, intentional discard'larda _ prefix
  - Debug console.log silindi veya console.warn'a çevrildi
  - v-html için Frappe backend sanitize gerekçeli eslint-disable + güvenlik yorumu eklendi (block disable multi-line için)
  - eslint.config.js: LayoutSectionCard.vue istisnası kaldırıldı; varsIgnorePattern + caughtErrorsIgnorePattern: '^_' eklendi
- refactor(ui): radio seçimleri toggle bileşenlerine dönüştürüldü (@aliiball)
  - BaseSwitch ve BaseSegmented ortak bileşenleri eklendi
  - ECA kural kapsam seçimi switch'e çevrildi
  - toplu içe aktarma güncelleme modu switch, başlık satırı select'e çevrildi
  - header duyuru gösterim modu segmented'e çevrildi
  - sertifika toplu kaldırma chip grubuna çevrildi
- refactor(i18n): DocType terimi UI'da Modül olarak değiştirildi (@aliiball)
  - ECA Kural formu, Dashboard Widget, Compliance Mask Matrix, Core DocType Picker, Smart Field Dropdown, Fee Rules ve ECA Rule Log ekranlarında "DocType" → "Modül" çevrildi
  - 4 dilde (tr, en, ar, ru) toplam 56 metin güncellendi
  - ECA Kapsam switch'i için scopeSwitchLabel ve scopeSwitchDesc key'leri eklendi
  - Bulk import güncelleme modu switch'i için modeSwitchDesc key'i eklendi
  - Frappe iç API field adları (reference_doctype vb.) ve Link field options ("DocType") korundu

---
## [v1.1.9-beta.28] - 2026-06-05 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(masking): rol bazlı dashboard ve sipariş veri maskeleme UI (@boraydeger32)
  - DynamicKpi.vue masked state desteği — masked_label gösterimi
  - KpiCard.vue masked prop — blur(6px) + opacity efekti ile görsel maskeleme
  - DynamicLineChart.vue masked chart — bulanık placeholder chart
  - SellerOrdersView.vue buyer_masked blur gösterimi
  - SellerOrdersView.vue amounts_masked tutar gizleme
  - Nginx config storefront ve admin-panel lokal frappe-nginx'e proxy
- feat(messaging): buyer messages + availability görünümleri, reservation/buyerMessages store'ları (@aliturguttursab)
  - BuyerMessagesView + AvailabilityView (messaging)
  - reservation ve buyerMessages Pinia store'ları
  - navigation/router girişleri + api util güncellemesi
- feat(kyc): admin panel KYC hızlı aksiyonlar ve form iyileştirmeleri (@aliiball)
  - KYC Verification için 4 hızlı aksiyon butonu eklendi (Doğrula, Reddet, Askıya Al, Yeniden İncele) — review_kyc backend endpoint'i entegre edildi
  - KYB Reddet modal'ı KYC ile paylaşımlı hale getirildi, KYB davranışı korundu
  - KYC Reddet modal'ında Re-submit/Suspended kategori seçimi zorunlu yapıldı
  - Textarea resize handle alt-ortaya taşındı (txResize plugin, MutationObserver ile sıfır template touch, tüm textarea'lar otomatik sarmalanır)
  - Yeni Duyuru ve Devir Talebi modal'larında textarea full-width yapıldı
  - Sidebar Rail 1 genişliği 96px'e ayarlandı
  - Sidebar 1 ve 2 font-weight +100 (TenantSwitcher, panel başlıkları, label'lar)
  - Lucide ikon adları yeni sürüm rename'lerine uyduruldu (grid 3x3, circle-check, triangle-alert, cloud-upload, square-check, file-exclamation-point)
  - Dashboard Banner ikonu image oldu (Header Duyuruları megaphone'dan ayrıldı)
  - KYC Doğrulama (Alıcı) ikonu id-card oldu (Satıcı Profilleri'nden ayrıldı)
- feat(rbac-ui): Faz A-H — Permission Console + master sync (@boraydeger32)
  - 7 commit fast-forward edildi
  - router/index.js: meta.module + doctype/route gating + sub-user whitelist
  - stores/navigation.js: dbSellerSections + hiddenDoctypes/Routes Set
  - stores/auth.js: login/logout sonrası navigation resetState (stale fix)
  - stores/permission.js: createRoleProfile + updateRoleProfile + delete + sync
  - Permission Console 10 tab orchestration (?tab= query persist)
  - components/system/CapabilityMatrixTab: matrix + filter + bulk grant
  - components/system/ModuleMatrixTab: 3-state cycle + protected modal
  - components/system/PermissionOverviewTab: 5 KPI + plan tutarsızlık bandı
  - components/system/RoleProfileEditModal: CRUD modal (template inheritance)
  - composables/usePermission: can/seesModule/moduleMode/isMasked/isHidden
  - views/permission/RolesTab: CRUD entegrasyonu (Yeni/Düzenle/Sil + confirm)
  - views/permission/AuditLogTab: 🔒 Maskeleme preset + masked chip
  - views/permission/PlansTab + UsersTab: detay panel
  - views/doctype/DocTypeFormView: maxWritablePermlevel computed (Owner IBAN)
  - common/AppIcon: Lucide v1+ alias map (CheckCircle→CircleCheck vs.)
- feat(plans-ui): + Yeni Plan modal + Plan sil + System Manager gating (@boraydeger32)
  - createSubscriptionPlan({plan_code, plan_name, monthly_price, ...})
  - deleteSubscriptionPlan(plan_code) — selectedPlan reset + fetchPlans
  - Backend tradehub_core.api.v1.permission_console.create/delete_subscription_plan
  - + Yeni Plan butonu (sol panel başında, canManagePlans gated)
  - canManagePlans: isAdmin || roles.includes("System Manager") — Marketplace Admin görmez (Faz F.4 financial separation ile uyum)
  - Yeni Plan modal: plan_code + plan_name + description + monthly/yearly + currency (EUR/USD/TRY) + commission + max_listings + trial_days + is_active + is_public checkbox + uyarı hint ("capability_flags boş başlar")
  - Plan detail detail-actions'a "Sil" butonu — PROTECTED_PLAN_CODES (FREE/STARTER/PRO/ENTERPRISE) disabled + tooltip — active_subscription_count > 0 disabled + "önce abonelikleri taşıyın"
  - Delete confirm dialog (kırmızı header + cascade uyarısı)
  - Modal CSS: pln-modal-backdrop + pln-modal + pln-confirm + pln-field (light/dark mode, token-based, brand button + danger button)
  - "Plan X oluşturuldu" / "Plan X silindi" / hata mesajı
- feat(i18n): migrate admin panel to vue-i18n with ar/ru and RTL (@aliturguttursab)
  - i18n: add src/i18n with createI18n (legacy:false, globalInjection), th-lang persistence + browser detection, en/tr/ar/ru locale bundles
  - direction: RTL_LANGS/isRtl() + applyDocumentDirection() set <html dir>/<html lang>; "ar" rendered RTL
  - nav: add LanguageSwitcher.vue component
  - views/components: replace hard-coded strings with $t across ~170 views and shared components
- feat(crm): saha pazarlama hakediş paneli eklendi (@ahmeetseker)
  - Hakedişlerim, Hakediş Yönetimi ve Hakediş Ayarları görünümleri
  - fieldCommissions Pinia store'u
  - Subscription plan formuna saha komisyon türü/oran/mod/süre alanları
  - "Saha Pazarlama" rolüne panel erişimi (isFieldAgent guard)
  - Hero Slider yönetim görünümü ve slide düzenleme modalı
  - Hakediş ve Hero Slider için navigasyon menüsü + route tanımları
- feat(modules): "Maskeli" legend ikonu üstü çizili göz (EyeOff) (@boraydeger32)
- feat(dashboard-manager): widget satırlarına scope alanı rozeti eklendi (@aliiball)
  - Yeşil rozet (shield icon): scope_field tanımlı, satıcılar görür
  - Kırmızı rozet (warning icon): scope_field eksik, satıcılar göremez
  - Quick links / funnel chart için rozet gösterilmiyor (veri çekmiyor)
- feat(görünüm): liste sayfalarına çoklu görünüm seçici yaygınlaştırıldı (@aliiball)
  - 27 liste sayfasına Tablo/Kart/Kanban/Liste görünüm modları eklendi
  - ViewModeToggle modes prop'u ile 2/3/4 mod yapılandırılabilir hale getirildi
  - Tekrar kullanılabilir generic KanbanBoard component'i eklendi
  - CRM görünüm seçici (CrmListToolbar) standart ViewModeToggle'a taşındı
  - Hakediş Ayarları, Hero Slider ve Sosyal Kanıt Ayarları sayfaları ortalandı
  - Kullanılmayan CRM kanban stilleri temizlendi
- feat(permission-console): plan & özellik yönetimi (katalog + matris + karşılaştırma) (@boraydeger32)
  - Özellik Kataloğu sekmesi (FeatureCatalogTab) — feature CRUD + value_type
  - Plan Feature Editör (PlanFeatureEditor) — tipine uygun kontrol (toggle/quota/enum/text) + "Kartta" kürasyonu
  - Plan Karşılaştırma sekmesi (PlanComparisonTab) — salt-okunur matris
  - PlansTab: tek "Değişiklikleri Kaydet" matrisi de kaydeder + kaydedilmemiş değişiklik guard'ları (refresh / plan değiştir / sekme değiştir)
  - permission store: plan_features + feature_catalog uçları
  - i18n (tr/en/ar/ru); RolesTab + PermissionConsoleView küçük güncellemeler
- feat(admin): kategori vitrini yönetimi ve ekip hakediş onayı eklendi (@ahmeetseker)
  - Kategori Vitrini yönetim ekranı eklendi (sürükle-bırak dizilim, layout preset, kutu düzenleme modalı)
  - Saha hakedişine 2 aşamalı onay akışı eklendi: Lider Onayı → Süperadmin Onayı
  - "Ekip Hakedişleri" görünümü ve Saha Ekip Lideri rolü eklendi
  - Plan yönetimine paket bazlı kota bonusu eşik tablosu (quotaTiers) eklendi
  - Hakediş ayarları global sabit tutardan kota dönemi seçimine geçirildi
  - Hakediş durum filtreleri ve rozetleri yeni iki aşamalı duruma göre güncellendi

### Duzeltildi
- fix(perm-console): vue-router'ı native History API ile değiştir (@boraydeger32)
  - vue-router npm paketi `useRoute`/`useRouter` export ediyor (kontrol edildi)
  - Vue SFC compiler script setup'ı doğru transform ediyor (compileScript çıktısı OK)
  - AMA Vite Rollup production build'i `useRoute`/`useRouter` referanslarını tree-shake ile drop ediyor → index bundle'da sadece RouterLink/RouterView/useLink kalıyor, PermissionConsoleView çağrıda `useRoute is not defined`
- fix(perm-console): kayıp 6 tab geri eklendi (overview, capabilities, modules, masking, simulator, anomaly) (@boraydeger32)
- fix(roles): silinen UI elementlerini geri ekle (header + protected badge + capability bölümü) (@boraydeger32)
  - Header bloğu: rol sayacı + "+ Yeni Rol Profili" butonu (openCreateModal'a bağlı)
  - 🔒 Protected badge: rol listesi item + detail header h2
  - Capability özet bölümü: toplam sayı + capability sekmesi deep-link + module group bazlı capability chip listesi + bayraklar (🛡 owner-only, 🔒 protected, 🆔 KYC, 🚨 AML, 💎 plan feature)
- fix(modules): "Maskeli" hücre ikonu matriste de uygulansın + hizalama (@boraydeger32)
  - Hücre template: masked moduna AppIcon eye-off render edilsin
  - CSS: .legend-icon + .cell-icon ortak — display:inline-block + vertical-align middle (td içinde yatay/dikey ortalama)
- fix(conflicts) : Merge master into Ali (@aliiball)
  - BulkProductImportView: master i18n tarafı (colSelect kolonu dahil)
  - EcaRuleFormView: master radio-group + i18n
  - MyCertificationsView: master label wrapper, cert-chip SCSS korundu
  - DashboardManagerView: master i18n metinler + scope rozeti birleşik
- fix(ui): merge sonrası kaybolan radio-toggle değişiklikleri geri getirildi (@aliiball)
  - ECA Kural Kapsam alanı BaseSwitch'e çevrildi
  - Toplu içe aktarma güncelleme modu BaseSwitch'e çevrildi
  - Sertifika toplu kaldırma seçimi button chip'e çevrildi
  - BaseSwitch ve BaseSegmented bileşenleri zaten mevcuttu; sadece kullanımları geri eklendi
- fix: ensure payload is processed correctly before updating pricing plan (@ahmeetseker)

### Degistirildi
- refactor(ui): radio seçimleri toggle bileşenlerine dönüştürüldü (@aliiball)
  - BaseSwitch ve BaseSegmented ortak bileşenleri eklendi
  - ECA kural kapsam seçimi switch'e çevrildi
  - toplu içe aktarma güncelleme modu switch, başlık satırı select'e çevrildi
  - header duyuru gösterim modu segmented'e çevrildi
  - sertifika toplu kaldırma chip grubuna çevrildi
- refactor(i18n): DocType terimi UI'da Modül olarak değiştirildi (@aliiball)
  - ECA Kural formu, Dashboard Widget, Compliance Mask Matrix, Core DocType Picker, Smart Field Dropdown, Fee Rules ve ECA Rule Log ekranlarında "DocType" → "Modül" çevrildi
  - 4 dilde (tr, en, ar, ru) toplam 56 metin güncellendi
  - ECA Kapsam switch'i için scopeSwitchLabel ve scopeSwitchDesc key'leri eklendi
  - Bulk import güncelleme modu switch'i için modeSwitchDesc key'i eklendi
  - Frappe iç API field adları (reference_doctype vb.) ve Link field options ("DocType") korundu

---
## [v1.1.9-beta.27] - 2026-06-05 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(masking): rol bazlı dashboard ve sipariş veri maskeleme UI (@boraydeger32)
  - DynamicKpi.vue masked state desteği — masked_label gösterimi
  - KpiCard.vue masked prop — blur(6px) + opacity efekti ile görsel maskeleme
  - DynamicLineChart.vue masked chart — bulanık placeholder chart
  - SellerOrdersView.vue buyer_masked blur gösterimi
  - SellerOrdersView.vue amounts_masked tutar gizleme
  - Nginx config storefront ve admin-panel lokal frappe-nginx'e proxy
- feat(messaging): buyer messages + availability görünümleri, reservation/buyerMessages store'ları (@aliturguttursab)
  - BuyerMessagesView + AvailabilityView (messaging)
  - reservation ve buyerMessages Pinia store'ları
  - navigation/router girişleri + api util güncellemesi
- feat(kyc): admin panel KYC hızlı aksiyonlar ve form iyileştirmeleri (@aliiball)
  - KYC Verification için 4 hızlı aksiyon butonu eklendi (Doğrula, Reddet, Askıya Al, Yeniden İncele) — review_kyc backend endpoint'i entegre edildi
  - KYB Reddet modal'ı KYC ile paylaşımlı hale getirildi, KYB davranışı korundu
  - KYC Reddet modal'ında Re-submit/Suspended kategori seçimi zorunlu yapıldı
  - Textarea resize handle alt-ortaya taşındı (txResize plugin, MutationObserver ile sıfır template touch, tüm textarea'lar otomatik sarmalanır)
  - Yeni Duyuru ve Devir Talebi modal'larında textarea full-width yapıldı
  - Sidebar Rail 1 genişliği 96px'e ayarlandı
  - Sidebar 1 ve 2 font-weight +100 (TenantSwitcher, panel başlıkları, label'lar)
  - Lucide ikon adları yeni sürüm rename'lerine uyduruldu (grid 3x3, circle-check, triangle-alert, cloud-upload, square-check, file-exclamation-point)
  - Dashboard Banner ikonu image oldu (Header Duyuruları megaphone'dan ayrıldı)
  - KYC Doğrulama (Alıcı) ikonu id-card oldu (Satıcı Profilleri'nden ayrıldı)
- feat(rbac-ui): Faz A-H — Permission Console + master sync (@boraydeger32)
  - 7 commit fast-forward edildi
  - router/index.js: meta.module + doctype/route gating + sub-user whitelist
  - stores/navigation.js: dbSellerSections + hiddenDoctypes/Routes Set
  - stores/auth.js: login/logout sonrası navigation resetState (stale fix)
  - stores/permission.js: createRoleProfile + updateRoleProfile + delete + sync
  - Permission Console 10 tab orchestration (?tab= query persist)
  - components/system/CapabilityMatrixTab: matrix + filter + bulk grant
  - components/system/ModuleMatrixTab: 3-state cycle + protected modal
  - components/system/PermissionOverviewTab: 5 KPI + plan tutarsızlık bandı
  - components/system/RoleProfileEditModal: CRUD modal (template inheritance)
  - composables/usePermission: can/seesModule/moduleMode/isMasked/isHidden
  - views/permission/RolesTab: CRUD entegrasyonu (Yeni/Düzenle/Sil + confirm)
  - views/permission/AuditLogTab: 🔒 Maskeleme preset + masked chip
  - views/permission/PlansTab + UsersTab: detay panel
  - views/doctype/DocTypeFormView: maxWritablePermlevel computed (Owner IBAN)
  - common/AppIcon: Lucide v1+ alias map (CheckCircle→CircleCheck vs.)
- feat(plans-ui): + Yeni Plan modal + Plan sil + System Manager gating (@boraydeger32)
  - createSubscriptionPlan({plan_code, plan_name, monthly_price, ...})
  - deleteSubscriptionPlan(plan_code) — selectedPlan reset + fetchPlans
  - Backend tradehub_core.api.v1.permission_console.create/delete_subscription_plan
  - + Yeni Plan butonu (sol panel başında, canManagePlans gated)
  - canManagePlans: isAdmin || roles.includes("System Manager") — Marketplace Admin görmez (Faz F.4 financial separation ile uyum)
  - Yeni Plan modal: plan_code + plan_name + description + monthly/yearly + currency (EUR/USD/TRY) + commission + max_listings + trial_days + is_active + is_public checkbox + uyarı hint ("capability_flags boş başlar")
  - Plan detail detail-actions'a "Sil" butonu — PROTECTED_PLAN_CODES (FREE/STARTER/PRO/ENTERPRISE) disabled + tooltip — active_subscription_count > 0 disabled + "önce abonelikleri taşıyın"
  - Delete confirm dialog (kırmızı header + cascade uyarısı)
  - Modal CSS: pln-modal-backdrop + pln-modal + pln-confirm + pln-field (light/dark mode, token-based, brand button + danger button)
  - "Plan X oluşturuldu" / "Plan X silindi" / hata mesajı
- feat(i18n): migrate admin panel to vue-i18n with ar/ru and RTL (@aliturguttursab)
  - i18n: add src/i18n with createI18n (legacy:false, globalInjection), th-lang persistence + browser detection, en/tr/ar/ru locale bundles
  - direction: RTL_LANGS/isRtl() + applyDocumentDirection() set <html dir>/<html lang>; "ar" rendered RTL
  - nav: add LanguageSwitcher.vue component
  - views/components: replace hard-coded strings with $t across ~170 views and shared components
- feat(crm): saha pazarlama hakediş paneli eklendi (@ahmeetseker)
  - Hakedişlerim, Hakediş Yönetimi ve Hakediş Ayarları görünümleri
  - fieldCommissions Pinia store'u
  - Subscription plan formuna saha komisyon türü/oran/mod/süre alanları
  - "Saha Pazarlama" rolüne panel erişimi (isFieldAgent guard)
  - Hero Slider yönetim görünümü ve slide düzenleme modalı
  - Hakediş ve Hero Slider için navigasyon menüsü + route tanımları
- feat(modules): "Maskeli" legend ikonu üstü çizili göz (EyeOff) (@boraydeger32)
- feat(dashboard-manager): widget satırlarına scope alanı rozeti eklendi (@aliiball)
  - Yeşil rozet (shield icon): scope_field tanımlı, satıcılar görür
  - Kırmızı rozet (warning icon): scope_field eksik, satıcılar göremez
  - Quick links / funnel chart için rozet gösterilmiyor (veri çekmiyor)
- feat(görünüm): liste sayfalarına çoklu görünüm seçici yaygınlaştırıldı (@aliiball)
  - 27 liste sayfasına Tablo/Kart/Kanban/Liste görünüm modları eklendi
  - ViewModeToggle modes prop'u ile 2/3/4 mod yapılandırılabilir hale getirildi
  - Tekrar kullanılabilir generic KanbanBoard component'i eklendi
  - CRM görünüm seçici (CrmListToolbar) standart ViewModeToggle'a taşındı
  - Hakediş Ayarları, Hero Slider ve Sosyal Kanıt Ayarları sayfaları ortalandı
  - Kullanılmayan CRM kanban stilleri temizlendi
- feat(permission-console): plan & özellik yönetimi (katalog + matris + karşılaştırma) (@boraydeger32)
  - Özellik Kataloğu sekmesi (FeatureCatalogTab) — feature CRUD + value_type
  - Plan Feature Editör (PlanFeatureEditor) — tipine uygun kontrol (toggle/quota/enum/text) + "Kartta" kürasyonu
  - Plan Karşılaştırma sekmesi (PlanComparisonTab) — salt-okunur matris
  - PlansTab: tek "Değişiklikleri Kaydet" matrisi de kaydeder + kaydedilmemiş değişiklik guard'ları (refresh / plan değiştir / sekme değiştir)
  - permission store: plan_features + feature_catalog uçları
  - i18n (tr/en/ar/ru); RolesTab + PermissionConsoleView küçük güncellemeler
- feat(admin): kategori vitrini yönetimi ve ekip hakediş onayı eklendi (@ahmeetseker)
  - Kategori Vitrini yönetim ekranı eklendi (sürükle-bırak dizilim, layout preset, kutu düzenleme modalı)
  - Saha hakedişine 2 aşamalı onay akışı eklendi: Lider Onayı → Süperadmin Onayı
  - "Ekip Hakedişleri" görünümü ve Saha Ekip Lideri rolü eklendi
  - Plan yönetimine paket bazlı kota bonusu eşik tablosu (quotaTiers) eklendi
  - Hakediş ayarları global sabit tutardan kota dönemi seçimine geçirildi
  - Hakediş durum filtreleri ve rozetleri yeni iki aşamalı duruma göre güncellendi

### Duzeltildi
- fix(perm-console): vue-router'ı native History API ile değiştir (@boraydeger32)
  - vue-router npm paketi `useRoute`/`useRouter` export ediyor (kontrol edildi)
  - Vue SFC compiler script setup'ı doğru transform ediyor (compileScript çıktısı OK)
  - AMA Vite Rollup production build'i `useRoute`/`useRouter` referanslarını tree-shake ile drop ediyor → index bundle'da sadece RouterLink/RouterView/useLink kalıyor, PermissionConsoleView çağrıda `useRoute is not defined`
- fix(perm-console): kayıp 6 tab geri eklendi (overview, capabilities, modules, masking, simulator, anomaly) (@boraydeger32)
- fix(roles): silinen UI elementlerini geri ekle (header + protected badge + capability bölümü) (@boraydeger32)
  - Header bloğu: rol sayacı + "+ Yeni Rol Profili" butonu (openCreateModal'a bağlı)
  - 🔒 Protected badge: rol listesi item + detail header h2
  - Capability özet bölümü: toplam sayı + capability sekmesi deep-link + module group bazlı capability chip listesi + bayraklar (🛡 owner-only, 🔒 protected, 🆔 KYC, 🚨 AML, 💎 plan feature)
- fix(modules): "Maskeli" hücre ikonu matriste de uygulansın + hizalama (@boraydeger32)
  - Hücre template: masked moduna AppIcon eye-off render edilsin
  - CSS: .legend-icon + .cell-icon ortak — display:inline-block + vertical-align middle (td içinde yatay/dikey ortalama)
- fix(conflicts) : Merge master into Ali (@aliiball)
  - BulkProductImportView: master i18n tarafı (colSelect kolonu dahil)
  - EcaRuleFormView: master radio-group + i18n
  - MyCertificationsView: master label wrapper, cert-chip SCSS korundu
  - DashboardManagerView: master i18n metinler + scope rozeti birleşik
- fix(ui): merge sonrası kaybolan radio-toggle değişiklikleri geri getirildi (@aliiball)
  - ECA Kural Kapsam alanı BaseSwitch'e çevrildi
  - Toplu içe aktarma güncelleme modu BaseSwitch'e çevrildi
  - Sertifika toplu kaldırma seçimi button chip'e çevrildi
  - BaseSwitch ve BaseSegmented bileşenleri zaten mevcuttu; sadece kullanımları geri eklendi

### Degistirildi
- refactor(ui): radio seçimleri toggle bileşenlerine dönüştürüldü (@aliiball)
  - BaseSwitch ve BaseSegmented ortak bileşenleri eklendi
  - ECA kural kapsam seçimi switch'e çevrildi
  - toplu içe aktarma güncelleme modu switch, başlık satırı select'e çevrildi
  - header duyuru gösterim modu segmented'e çevrildi
  - sertifika toplu kaldırma chip grubuna çevrildi
- refactor(i18n): DocType terimi UI'da Modül olarak değiştirildi (@aliiball)
  - ECA Kural formu, Dashboard Widget, Compliance Mask Matrix, Core DocType Picker, Smart Field Dropdown, Fee Rules ve ECA Rule Log ekranlarında "DocType" → "Modül" çevrildi
  - 4 dilde (tr, en, ar, ru) toplam 56 metin güncellendi
  - ECA Kapsam switch'i için scopeSwitchLabel ve scopeSwitchDesc key'leri eklendi
  - Bulk import güncelleme modu switch'i için modeSwitchDesc key'i eklendi
  - Frappe iç API field adları (reference_doctype vb.) ve Link field options ("DocType") korundu

---
## [v1.1.9-beta.26] - 2026-06-05 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(masking): rol bazlı dashboard ve sipariş veri maskeleme UI (@boraydeger32)
  - DynamicKpi.vue masked state desteği — masked_label gösterimi
  - KpiCard.vue masked prop — blur(6px) + opacity efekti ile görsel maskeleme
  - DynamicLineChart.vue masked chart — bulanık placeholder chart
  - SellerOrdersView.vue buyer_masked blur gösterimi
  - SellerOrdersView.vue amounts_masked tutar gizleme
  - Nginx config storefront ve admin-panel lokal frappe-nginx'e proxy
- feat(messaging): buyer messages + availability görünümleri, reservation/buyerMessages store'ları (@aliturguttursab)
  - BuyerMessagesView + AvailabilityView (messaging)
  - reservation ve buyerMessages Pinia store'ları
  - navigation/router girişleri + api util güncellemesi
- feat(kyc): admin panel KYC hızlı aksiyonlar ve form iyileştirmeleri (@aliiball)
  - KYC Verification için 4 hızlı aksiyon butonu eklendi (Doğrula, Reddet, Askıya Al, Yeniden İncele) — review_kyc backend endpoint'i entegre edildi
  - KYB Reddet modal'ı KYC ile paylaşımlı hale getirildi, KYB davranışı korundu
  - KYC Reddet modal'ında Re-submit/Suspended kategori seçimi zorunlu yapıldı
  - Textarea resize handle alt-ortaya taşındı (txResize plugin, MutationObserver ile sıfır template touch, tüm textarea'lar otomatik sarmalanır)
  - Yeni Duyuru ve Devir Talebi modal'larında textarea full-width yapıldı
  - Sidebar Rail 1 genişliği 96px'e ayarlandı
  - Sidebar 1 ve 2 font-weight +100 (TenantSwitcher, panel başlıkları, label'lar)
  - Lucide ikon adları yeni sürüm rename'lerine uyduruldu (grid 3x3, circle-check, triangle-alert, cloud-upload, square-check, file-exclamation-point)
  - Dashboard Banner ikonu image oldu (Header Duyuruları megaphone'dan ayrıldı)
  - KYC Doğrulama (Alıcı) ikonu id-card oldu (Satıcı Profilleri'nden ayrıldı)
- feat(rbac-ui): Faz A-H — Permission Console + master sync (@boraydeger32)
  - 7 commit fast-forward edildi
  - router/index.js: meta.module + doctype/route gating + sub-user whitelist
  - stores/navigation.js: dbSellerSections + hiddenDoctypes/Routes Set
  - stores/auth.js: login/logout sonrası navigation resetState (stale fix)
  - stores/permission.js: createRoleProfile + updateRoleProfile + delete + sync
  - Permission Console 10 tab orchestration (?tab= query persist)
  - components/system/CapabilityMatrixTab: matrix + filter + bulk grant
  - components/system/ModuleMatrixTab: 3-state cycle + protected modal
  - components/system/PermissionOverviewTab: 5 KPI + plan tutarsızlık bandı
  - components/system/RoleProfileEditModal: CRUD modal (template inheritance)
  - composables/usePermission: can/seesModule/moduleMode/isMasked/isHidden
  - views/permission/RolesTab: CRUD entegrasyonu (Yeni/Düzenle/Sil + confirm)
  - views/permission/AuditLogTab: 🔒 Maskeleme preset + masked chip
  - views/permission/PlansTab + UsersTab: detay panel
  - views/doctype/DocTypeFormView: maxWritablePermlevel computed (Owner IBAN)
  - common/AppIcon: Lucide v1+ alias map (CheckCircle→CircleCheck vs.)
- feat(plans-ui): + Yeni Plan modal + Plan sil + System Manager gating (@boraydeger32)
  - createSubscriptionPlan({plan_code, plan_name, monthly_price, ...})
  - deleteSubscriptionPlan(plan_code) — selectedPlan reset + fetchPlans
  - Backend tradehub_core.api.v1.permission_console.create/delete_subscription_plan
  - + Yeni Plan butonu (sol panel başında, canManagePlans gated)
  - canManagePlans: isAdmin || roles.includes("System Manager") — Marketplace Admin görmez (Faz F.4 financial separation ile uyum)
  - Yeni Plan modal: plan_code + plan_name + description + monthly/yearly + currency (EUR/USD/TRY) + commission + max_listings + trial_days + is_active + is_public checkbox + uyarı hint ("capability_flags boş başlar")
  - Plan detail detail-actions'a "Sil" butonu — PROTECTED_PLAN_CODES (FREE/STARTER/PRO/ENTERPRISE) disabled + tooltip — active_subscription_count > 0 disabled + "önce abonelikleri taşıyın"
  - Delete confirm dialog (kırmızı header + cascade uyarısı)
  - Modal CSS: pln-modal-backdrop + pln-modal + pln-confirm + pln-field (light/dark mode, token-based, brand button + danger button)
  - "Plan X oluşturuldu" / "Plan X silindi" / hata mesajı
- feat(i18n): migrate admin panel to vue-i18n with ar/ru and RTL (@aliturguttursab)
  - i18n: add src/i18n with createI18n (legacy:false, globalInjection), th-lang persistence + browser detection, en/tr/ar/ru locale bundles
  - direction: RTL_LANGS/isRtl() + applyDocumentDirection() set <html dir>/<html lang>; "ar" rendered RTL
  - nav: add LanguageSwitcher.vue component
  - views/components: replace hard-coded strings with $t across ~170 views and shared components
- feat(crm): saha pazarlama hakediş paneli eklendi (@ahmeetseker)
  - Hakedişlerim, Hakediş Yönetimi ve Hakediş Ayarları görünümleri
  - fieldCommissions Pinia store'u
  - Subscription plan formuna saha komisyon türü/oran/mod/süre alanları
  - "Saha Pazarlama" rolüne panel erişimi (isFieldAgent guard)
  - Hero Slider yönetim görünümü ve slide düzenleme modalı
  - Hakediş ve Hero Slider için navigasyon menüsü + route tanımları
- feat(modules): "Maskeli" legend ikonu üstü çizili göz (EyeOff) (@boraydeger32)
- feat(dashboard-manager): widget satırlarına scope alanı rozeti eklendi (@aliiball)
  - Yeşil rozet (shield icon): scope_field tanımlı, satıcılar görür
  - Kırmızı rozet (warning icon): scope_field eksik, satıcılar göremez
  - Quick links / funnel chart için rozet gösterilmiyor (veri çekmiyor)
- feat(görünüm): liste sayfalarına çoklu görünüm seçici yaygınlaştırıldı (@aliiball)
  - 27 liste sayfasına Tablo/Kart/Kanban/Liste görünüm modları eklendi
  - ViewModeToggle modes prop'u ile 2/3/4 mod yapılandırılabilir hale getirildi
  - Tekrar kullanılabilir generic KanbanBoard component'i eklendi
  - CRM görünüm seçici (CrmListToolbar) standart ViewModeToggle'a taşındı
  - Hakediş Ayarları, Hero Slider ve Sosyal Kanıt Ayarları sayfaları ortalandı
  - Kullanılmayan CRM kanban stilleri temizlendi
- feat(permission-console): plan & özellik yönetimi (katalog + matris + karşılaştırma) (@boraydeger32)
  - Özellik Kataloğu sekmesi (FeatureCatalogTab) — feature CRUD + value_type
  - Plan Feature Editör (PlanFeatureEditor) — tipine uygun kontrol (toggle/quota/enum/text) + "Kartta" kürasyonu
  - Plan Karşılaştırma sekmesi (PlanComparisonTab) — salt-okunur matris
  - PlansTab: tek "Değişiklikleri Kaydet" matrisi de kaydeder + kaydedilmemiş değişiklik guard'ları (refresh / plan değiştir / sekme değiştir)
  - permission store: plan_features + feature_catalog uçları
  - i18n (tr/en/ar/ru); RolesTab + PermissionConsoleView küçük güncellemeler

### Duzeltildi
- fix(perm-console): vue-router'ı native History API ile değiştir (@boraydeger32)
  - vue-router npm paketi `useRoute`/`useRouter` export ediyor (kontrol edildi)
  - Vue SFC compiler script setup'ı doğru transform ediyor (compileScript çıktısı OK)
  - AMA Vite Rollup production build'i `useRoute`/`useRouter` referanslarını tree-shake ile drop ediyor → index bundle'da sadece RouterLink/RouterView/useLink kalıyor, PermissionConsoleView çağrıda `useRoute is not defined`
- fix(perm-console): kayıp 6 tab geri eklendi (overview, capabilities, modules, masking, simulator, anomaly) (@boraydeger32)
- fix(roles): silinen UI elementlerini geri ekle (header + protected badge + capability bölümü) (@boraydeger32)
  - Header bloğu: rol sayacı + "+ Yeni Rol Profili" butonu (openCreateModal'a bağlı)
  - 🔒 Protected badge: rol listesi item + detail header h2
  - Capability özet bölümü: toplam sayı + capability sekmesi deep-link + module group bazlı capability chip listesi + bayraklar (🛡 owner-only, 🔒 protected, 🆔 KYC, 🚨 AML, 💎 plan feature)
- fix(modules): "Maskeli" hücre ikonu matriste de uygulansın + hizalama (@boraydeger32)
  - Hücre template: masked moduna AppIcon eye-off render edilsin
  - CSS: .legend-icon + .cell-icon ortak — display:inline-block + vertical-align middle (td içinde yatay/dikey ortalama)
- fix(conflicts) : Merge master into Ali (@aliiball)
  - BulkProductImportView: master i18n tarafı (colSelect kolonu dahil)
  - EcaRuleFormView: master radio-group + i18n
  - MyCertificationsView: master label wrapper, cert-chip SCSS korundu
  - DashboardManagerView: master i18n metinler + scope rozeti birleşik
- fix(ui): merge sonrası kaybolan radio-toggle değişiklikleri geri getirildi (@aliiball)
  - ECA Kural Kapsam alanı BaseSwitch'e çevrildi
  - Toplu içe aktarma güncelleme modu BaseSwitch'e çevrildi
  - Sertifika toplu kaldırma seçimi button chip'e çevrildi
  - BaseSwitch ve BaseSegmented bileşenleri zaten mevcuttu; sadece kullanımları geri eklendi

### Degistirildi
- refactor(ui): radio seçimleri toggle bileşenlerine dönüştürüldü (@aliiball)
  - BaseSwitch ve BaseSegmented ortak bileşenleri eklendi
  - ECA kural kapsam seçimi switch'e çevrildi
  - toplu içe aktarma güncelleme modu switch, başlık satırı select'e çevrildi
  - header duyuru gösterim modu segmented'e çevrildi
  - sertifika toplu kaldırma chip grubuna çevrildi
- refactor(i18n): DocType terimi UI'da Modül olarak değiştirildi (@aliiball)
  - ECA Kural formu, Dashboard Widget, Compliance Mask Matrix, Core DocType Picker, Smart Field Dropdown, Fee Rules ve ECA Rule Log ekranlarında "DocType" → "Modül" çevrildi
  - 4 dilde (tr, en, ar, ru) toplam 56 metin güncellendi
  - ECA Kapsam switch'i için scopeSwitchLabel ve scopeSwitchDesc key'leri eklendi
  - Bulk import güncelleme modu switch'i için modeSwitchDesc key'i eklendi
  - Frappe iç API field adları (reference_doctype vb.) ve Link field options ("DocType") korundu

---
## [v1.1.9-beta.25] - 2026-06-04 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(masking): rol bazlı dashboard ve sipariş veri maskeleme UI (@boraydeger32)
  - DynamicKpi.vue masked state desteği — masked_label gösterimi
  - KpiCard.vue masked prop — blur(6px) + opacity efekti ile görsel maskeleme
  - DynamicLineChart.vue masked chart — bulanık placeholder chart
  - SellerOrdersView.vue buyer_masked blur gösterimi
  - SellerOrdersView.vue amounts_masked tutar gizleme
  - Nginx config storefront ve admin-panel lokal frappe-nginx'e proxy
- feat(messaging): buyer messages + availability görünümleri, reservation/buyerMessages store'ları (@aliturguttursab)
  - BuyerMessagesView + AvailabilityView (messaging)
  - reservation ve buyerMessages Pinia store'ları
  - navigation/router girişleri + api util güncellemesi
- feat(kyc): admin panel KYC hızlı aksiyonlar ve form iyileştirmeleri (@aliiball)
  - KYC Verification için 4 hızlı aksiyon butonu eklendi (Doğrula, Reddet, Askıya Al, Yeniden İncele) — review_kyc backend endpoint'i entegre edildi
  - KYB Reddet modal'ı KYC ile paylaşımlı hale getirildi, KYB davranışı korundu
  - KYC Reddet modal'ında Re-submit/Suspended kategori seçimi zorunlu yapıldı
  - Textarea resize handle alt-ortaya taşındı (txResize plugin, MutationObserver ile sıfır template touch, tüm textarea'lar otomatik sarmalanır)
  - Yeni Duyuru ve Devir Talebi modal'larında textarea full-width yapıldı
  - Sidebar Rail 1 genişliği 96px'e ayarlandı
  - Sidebar 1 ve 2 font-weight +100 (TenantSwitcher, panel başlıkları, label'lar)
  - Lucide ikon adları yeni sürüm rename'lerine uyduruldu (grid 3x3, circle-check, triangle-alert, cloud-upload, square-check, file-exclamation-point)
  - Dashboard Banner ikonu image oldu (Header Duyuruları megaphone'dan ayrıldı)
  - KYC Doğrulama (Alıcı) ikonu id-card oldu (Satıcı Profilleri'nden ayrıldı)
- feat(rbac-ui): Faz A-H — Permission Console + master sync (@boraydeger32)
  - 7 commit fast-forward edildi
  - router/index.js: meta.module + doctype/route gating + sub-user whitelist
  - stores/navigation.js: dbSellerSections + hiddenDoctypes/Routes Set
  - stores/auth.js: login/logout sonrası navigation resetState (stale fix)
  - stores/permission.js: createRoleProfile + updateRoleProfile + delete + sync
  - Permission Console 10 tab orchestration (?tab= query persist)
  - components/system/CapabilityMatrixTab: matrix + filter + bulk grant
  - components/system/ModuleMatrixTab: 3-state cycle + protected modal
  - components/system/PermissionOverviewTab: 5 KPI + plan tutarsızlık bandı
  - components/system/RoleProfileEditModal: CRUD modal (template inheritance)
  - composables/usePermission: can/seesModule/moduleMode/isMasked/isHidden
  - views/permission/RolesTab: CRUD entegrasyonu (Yeni/Düzenle/Sil + confirm)
  - views/permission/AuditLogTab: 🔒 Maskeleme preset + masked chip
  - views/permission/PlansTab + UsersTab: detay panel
  - views/doctype/DocTypeFormView: maxWritablePermlevel computed (Owner IBAN)
  - common/AppIcon: Lucide v1+ alias map (CheckCircle→CircleCheck vs.)
- feat(plans-ui): + Yeni Plan modal + Plan sil + System Manager gating (@boraydeger32)
  - createSubscriptionPlan({plan_code, plan_name, monthly_price, ...})
  - deleteSubscriptionPlan(plan_code) — selectedPlan reset + fetchPlans
  - Backend tradehub_core.api.v1.permission_console.create/delete_subscription_plan
  - + Yeni Plan butonu (sol panel başında, canManagePlans gated)
  - canManagePlans: isAdmin || roles.includes("System Manager") — Marketplace Admin görmez (Faz F.4 financial separation ile uyum)
  - Yeni Plan modal: plan_code + plan_name + description + monthly/yearly + currency (EUR/USD/TRY) + commission + max_listings + trial_days + is_active + is_public checkbox + uyarı hint ("capability_flags boş başlar")
  - Plan detail detail-actions'a "Sil" butonu — PROTECTED_PLAN_CODES (FREE/STARTER/PRO/ENTERPRISE) disabled + tooltip — active_subscription_count > 0 disabled + "önce abonelikleri taşıyın"
  - Delete confirm dialog (kırmızı header + cascade uyarısı)
  - Modal CSS: pln-modal-backdrop + pln-modal + pln-confirm + pln-field (light/dark mode, token-based, brand button + danger button)
  - "Plan X oluşturuldu" / "Plan X silindi" / hata mesajı
- feat(i18n): migrate admin panel to vue-i18n with ar/ru and RTL (@aliturguttursab)
  - i18n: add src/i18n with createI18n (legacy:false, globalInjection), th-lang persistence + browser detection, en/tr/ar/ru locale bundles
  - direction: RTL_LANGS/isRtl() + applyDocumentDirection() set <html dir>/<html lang>; "ar" rendered RTL
  - nav: add LanguageSwitcher.vue component
  - views/components: replace hard-coded strings with $t across ~170 views and shared components
- feat(crm): saha pazarlama hakediş paneli eklendi (@ahmeetseker)
  - Hakedişlerim, Hakediş Yönetimi ve Hakediş Ayarları görünümleri
  - fieldCommissions Pinia store'u
  - Subscription plan formuna saha komisyon türü/oran/mod/süre alanları
  - "Saha Pazarlama" rolüne panel erişimi (isFieldAgent guard)
  - Hero Slider yönetim görünümü ve slide düzenleme modalı
  - Hakediş ve Hero Slider için navigasyon menüsü + route tanımları
- feat(modules): "Maskeli" legend ikonu üstü çizili göz (EyeOff) (@boraydeger32)
- feat(dashboard-manager): widget satırlarına scope alanı rozeti eklendi (@aliiball)
  - Yeşil rozet (shield icon): scope_field tanımlı, satıcılar görür
  - Kırmızı rozet (warning icon): scope_field eksik, satıcılar göremez
  - Quick links / funnel chart için rozet gösterilmiyor (veri çekmiyor)
- feat(görünüm): liste sayfalarına çoklu görünüm seçici yaygınlaştırıldı (@aliiball)
  - 27 liste sayfasına Tablo/Kart/Kanban/Liste görünüm modları eklendi
  - ViewModeToggle modes prop'u ile 2/3/4 mod yapılandırılabilir hale getirildi
  - Tekrar kullanılabilir generic KanbanBoard component'i eklendi
  - CRM görünüm seçici (CrmListToolbar) standart ViewModeToggle'a taşındı
  - Hakediş Ayarları, Hero Slider ve Sosyal Kanıt Ayarları sayfaları ortalandı
  - Kullanılmayan CRM kanban stilleri temizlendi

### Duzeltildi
- fix(perm-console): vue-router'ı native History API ile değiştir (@boraydeger32)
  - vue-router npm paketi `useRoute`/`useRouter` export ediyor (kontrol edildi)
  - Vue SFC compiler script setup'ı doğru transform ediyor (compileScript çıktısı OK)
  - AMA Vite Rollup production build'i `useRoute`/`useRouter` referanslarını tree-shake ile drop ediyor → index bundle'da sadece RouterLink/RouterView/useLink kalıyor, PermissionConsoleView çağrıda `useRoute is not defined`
- fix(perm-console): kayıp 6 tab geri eklendi (overview, capabilities, modules, masking, simulator, anomaly) (@boraydeger32)
- fix(roles): silinen UI elementlerini geri ekle (header + protected badge + capability bölümü) (@boraydeger32)
  - Header bloğu: rol sayacı + "+ Yeni Rol Profili" butonu (openCreateModal'a bağlı)
  - 🔒 Protected badge: rol listesi item + detail header h2
  - Capability özet bölümü: toplam sayı + capability sekmesi deep-link + module group bazlı capability chip listesi + bayraklar (🛡 owner-only, 🔒 protected, 🆔 KYC, 🚨 AML, 💎 plan feature)
- fix(modules): "Maskeli" hücre ikonu matriste de uygulansın + hizalama (@boraydeger32)
  - Hücre template: masked moduna AppIcon eye-off render edilsin
  - CSS: .legend-icon + .cell-icon ortak — display:inline-block + vertical-align middle (td içinde yatay/dikey ortalama)
- fix(conflicts) : Merge master into Ali (@aliiball)
  - BulkProductImportView: master i18n tarafı (colSelect kolonu dahil)
  - EcaRuleFormView: master radio-group + i18n
  - MyCertificationsView: master label wrapper, cert-chip SCSS korundu
  - DashboardManagerView: master i18n metinler + scope rozeti birleşik
- fix(ui): merge sonrası kaybolan radio-toggle değişiklikleri geri getirildi (@aliiball)
  - ECA Kural Kapsam alanı BaseSwitch'e çevrildi
  - Toplu içe aktarma güncelleme modu BaseSwitch'e çevrildi
  - Sertifika toplu kaldırma seçimi button chip'e çevrildi
  - BaseSwitch ve BaseSegmented bileşenleri zaten mevcuttu; sadece kullanımları geri eklendi

### Degistirildi
- refactor(ui): radio seçimleri toggle bileşenlerine dönüştürüldü (@aliiball)
  - BaseSwitch ve BaseSegmented ortak bileşenleri eklendi
  - ECA kural kapsam seçimi switch'e çevrildi
  - toplu içe aktarma güncelleme modu switch, başlık satırı select'e çevrildi
  - header duyuru gösterim modu segmented'e çevrildi
  - sertifika toplu kaldırma chip grubuna çevrildi
- refactor(i18n): DocType terimi UI'da Modül olarak değiştirildi (@aliiball)
  - ECA Kural formu, Dashboard Widget, Compliance Mask Matrix, Core DocType Picker, Smart Field Dropdown, Fee Rules ve ECA Rule Log ekranlarında "DocType" → "Modül" çevrildi
  - 4 dilde (tr, en, ar, ru) toplam 56 metin güncellendi
  - ECA Kapsam switch'i için scopeSwitchLabel ve scopeSwitchDesc key'leri eklendi
  - Bulk import güncelleme modu switch'i için modeSwitchDesc key'i eklendi
  - Frappe iç API field adları (reference_doctype vb.) ve Link field options ("DocType") korundu

---
## [v1.1.9-beta.24] - 2026-06-04 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(masking): rol bazlı dashboard ve sipariş veri maskeleme UI (@boraydeger32)
  - DynamicKpi.vue masked state desteği — masked_label gösterimi
  - KpiCard.vue masked prop — blur(6px) + opacity efekti ile görsel maskeleme
  - DynamicLineChart.vue masked chart — bulanık placeholder chart
  - SellerOrdersView.vue buyer_masked blur gösterimi
  - SellerOrdersView.vue amounts_masked tutar gizleme
  - Nginx config storefront ve admin-panel lokal frappe-nginx'e proxy
- feat(messaging): buyer messages + availability görünümleri, reservation/buyerMessages store'ları (@aliturguttursab)
  - BuyerMessagesView + AvailabilityView (messaging)
  - reservation ve buyerMessages Pinia store'ları
  - navigation/router girişleri + api util güncellemesi
- feat(kyc): admin panel KYC hızlı aksiyonlar ve form iyileştirmeleri (@aliiball)
  - KYC Verification için 4 hızlı aksiyon butonu eklendi (Doğrula, Reddet, Askıya Al, Yeniden İncele) — review_kyc backend endpoint'i entegre edildi
  - KYB Reddet modal'ı KYC ile paylaşımlı hale getirildi, KYB davranışı korundu
  - KYC Reddet modal'ında Re-submit/Suspended kategori seçimi zorunlu yapıldı
  - Textarea resize handle alt-ortaya taşındı (txResize plugin, MutationObserver ile sıfır template touch, tüm textarea'lar otomatik sarmalanır)
  - Yeni Duyuru ve Devir Talebi modal'larında textarea full-width yapıldı
  - Sidebar Rail 1 genişliği 96px'e ayarlandı
  - Sidebar 1 ve 2 font-weight +100 (TenantSwitcher, panel başlıkları, label'lar)
  - Lucide ikon adları yeni sürüm rename'lerine uyduruldu (grid 3x3, circle-check, triangle-alert, cloud-upload, square-check, file-exclamation-point)
  - Dashboard Banner ikonu image oldu (Header Duyuruları megaphone'dan ayrıldı)
  - KYC Doğrulama (Alıcı) ikonu id-card oldu (Satıcı Profilleri'nden ayrıldı)
- feat(rbac-ui): Faz A-H — Permission Console + master sync (@boraydeger32)
  - 7 commit fast-forward edildi
  - router/index.js: meta.module + doctype/route gating + sub-user whitelist
  - stores/navigation.js: dbSellerSections + hiddenDoctypes/Routes Set
  - stores/auth.js: login/logout sonrası navigation resetState (stale fix)
  - stores/permission.js: createRoleProfile + updateRoleProfile + delete + sync
  - Permission Console 10 tab orchestration (?tab= query persist)
  - components/system/CapabilityMatrixTab: matrix + filter + bulk grant
  - components/system/ModuleMatrixTab: 3-state cycle + protected modal
  - components/system/PermissionOverviewTab: 5 KPI + plan tutarsızlık bandı
  - components/system/RoleProfileEditModal: CRUD modal (template inheritance)
  - composables/usePermission: can/seesModule/moduleMode/isMasked/isHidden
  - views/permission/RolesTab: CRUD entegrasyonu (Yeni/Düzenle/Sil + confirm)
  - views/permission/AuditLogTab: 🔒 Maskeleme preset + masked chip
  - views/permission/PlansTab + UsersTab: detay panel
  - views/doctype/DocTypeFormView: maxWritablePermlevel computed (Owner IBAN)
  - common/AppIcon: Lucide v1+ alias map (CheckCircle→CircleCheck vs.)
- feat(plans-ui): + Yeni Plan modal + Plan sil + System Manager gating (@boraydeger32)
  - createSubscriptionPlan({plan_code, plan_name, monthly_price, ...})
  - deleteSubscriptionPlan(plan_code) — selectedPlan reset + fetchPlans
  - Backend tradehub_core.api.v1.permission_console.create/delete_subscription_plan
  - + Yeni Plan butonu (sol panel başında, canManagePlans gated)
  - canManagePlans: isAdmin || roles.includes("System Manager") — Marketplace Admin görmez (Faz F.4 financial separation ile uyum)
  - Yeni Plan modal: plan_code + plan_name + description + monthly/yearly + currency (EUR/USD/TRY) + commission + max_listings + trial_days + is_active + is_public checkbox + uyarı hint ("capability_flags boş başlar")
  - Plan detail detail-actions'a "Sil" butonu — PROTECTED_PLAN_CODES (FREE/STARTER/PRO/ENTERPRISE) disabled + tooltip — active_subscription_count > 0 disabled + "önce abonelikleri taşıyın"
  - Delete confirm dialog (kırmızı header + cascade uyarısı)
  - Modal CSS: pln-modal-backdrop + pln-modal + pln-confirm + pln-field (light/dark mode, token-based, brand button + danger button)
  - "Plan X oluşturuldu" / "Plan X silindi" / hata mesajı
- feat(i18n): migrate admin panel to vue-i18n with ar/ru and RTL (@aliturguttursab)
  - i18n: add src/i18n with createI18n (legacy:false, globalInjection), th-lang persistence + browser detection, en/tr/ar/ru locale bundles
  - direction: RTL_LANGS/isRtl() + applyDocumentDirection() set <html dir>/<html lang>; "ar" rendered RTL
  - nav: add LanguageSwitcher.vue component
  - views/components: replace hard-coded strings with $t across ~170 views and shared components
- feat(crm): saha pazarlama hakediş paneli eklendi (@ahmeetseker)
  - Hakedişlerim, Hakediş Yönetimi ve Hakediş Ayarları görünümleri
  - fieldCommissions Pinia store'u
  - Subscription plan formuna saha komisyon türü/oran/mod/süre alanları
  - "Saha Pazarlama" rolüne panel erişimi (isFieldAgent guard)
  - Hero Slider yönetim görünümü ve slide düzenleme modalı
  - Hakediş ve Hero Slider için navigasyon menüsü + route tanımları
- feat(modules): "Maskeli" legend ikonu üstü çizili göz (EyeOff) (@boraydeger32)
- feat(dashboard-manager): widget satırlarına scope alanı rozeti eklendi (@aliiball)
  - Yeşil rozet (shield icon): scope_field tanımlı, satıcılar görür
  - Kırmızı rozet (warning icon): scope_field eksik, satıcılar göremez
  - Quick links / funnel chart için rozet gösterilmiyor (veri çekmiyor)

### Duzeltildi
- fix(perm-console): vue-router'ı native History API ile değiştir (@boraydeger32)
  - vue-router npm paketi `useRoute`/`useRouter` export ediyor (kontrol edildi)
  - Vue SFC compiler script setup'ı doğru transform ediyor (compileScript çıktısı OK)
  - AMA Vite Rollup production build'i `useRoute`/`useRouter` referanslarını tree-shake ile drop ediyor → index bundle'da sadece RouterLink/RouterView/useLink kalıyor, PermissionConsoleView çağrıda `useRoute is not defined`
- fix(perm-console): kayıp 6 tab geri eklendi (overview, capabilities, modules, masking, simulator, anomaly) (@boraydeger32)
- fix(roles): silinen UI elementlerini geri ekle (header + protected badge + capability bölümü) (@boraydeger32)
  - Header bloğu: rol sayacı + "+ Yeni Rol Profili" butonu (openCreateModal'a bağlı)
  - 🔒 Protected badge: rol listesi item + detail header h2
  - Capability özet bölümü: toplam sayı + capability sekmesi deep-link + module group bazlı capability chip listesi + bayraklar (🛡 owner-only, 🔒 protected, 🆔 KYC, 🚨 AML, 💎 plan feature)
- fix(modules): "Maskeli" hücre ikonu matriste de uygulansın + hizalama (@boraydeger32)
  - Hücre template: masked moduna AppIcon eye-off render edilsin
  - CSS: .legend-icon + .cell-icon ortak — display:inline-block + vertical-align middle (td içinde yatay/dikey ortalama)
- fix(conflicts) : Merge master into Ali (@aliiball)
  - BulkProductImportView: master i18n tarafı (colSelect kolonu dahil)
  - EcaRuleFormView: master radio-group + i18n
  - MyCertificationsView: master label wrapper, cert-chip SCSS korundu
  - DashboardManagerView: master i18n metinler + scope rozeti birleşik
- fix(ui): merge sonrası kaybolan radio-toggle değişiklikleri geri getirildi (@aliiball)
  - ECA Kural Kapsam alanı BaseSwitch'e çevrildi
  - Toplu içe aktarma güncelleme modu BaseSwitch'e çevrildi
  - Sertifika toplu kaldırma seçimi button chip'e çevrildi
  - BaseSwitch ve BaseSegmented bileşenleri zaten mevcuttu; sadece kullanımları geri eklendi

### Degistirildi
- refactor(ui): radio seçimleri toggle bileşenlerine dönüştürüldü (@aliiball)
  - BaseSwitch ve BaseSegmented ortak bileşenleri eklendi
  - ECA kural kapsam seçimi switch'e çevrildi
  - toplu içe aktarma güncelleme modu switch, başlık satırı select'e çevrildi
  - header duyuru gösterim modu segmented'e çevrildi
  - sertifika toplu kaldırma chip grubuna çevrildi
- refactor(i18n): DocType terimi UI'da Modül olarak değiştirildi (@aliiball)
  - ECA Kural formu, Dashboard Widget, Compliance Mask Matrix, Core DocType Picker, Smart Field Dropdown, Fee Rules ve ECA Rule Log ekranlarında "DocType" → "Modül" çevrildi
  - 4 dilde (tr, en, ar, ru) toplam 56 metin güncellendi
  - ECA Kapsam switch'i için scopeSwitchLabel ve scopeSwitchDesc key'leri eklendi
  - Bulk import güncelleme modu switch'i için modeSwitchDesc key'i eklendi
  - Frappe iç API field adları (reference_doctype vb.) ve Link field options ("DocType") korundu

---
## [v1.1.9-beta.23] - 2026-06-04 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(masking): rol bazlı dashboard ve sipariş veri maskeleme UI (@boraydeger32)
  - DynamicKpi.vue masked state desteği — masked_label gösterimi
  - KpiCard.vue masked prop — blur(6px) + opacity efekti ile görsel maskeleme
  - DynamicLineChart.vue masked chart — bulanık placeholder chart
  - SellerOrdersView.vue buyer_masked blur gösterimi
  - SellerOrdersView.vue amounts_masked tutar gizleme
  - Nginx config storefront ve admin-panel lokal frappe-nginx'e proxy
- feat(messaging): buyer messages + availability görünümleri, reservation/buyerMessages store'ları (@aliturguttursab)
  - BuyerMessagesView + AvailabilityView (messaging)
  - reservation ve buyerMessages Pinia store'ları
  - navigation/router girişleri + api util güncellemesi
- feat(kyc): admin panel KYC hızlı aksiyonlar ve form iyileştirmeleri (@aliiball)
  - KYC Verification için 4 hızlı aksiyon butonu eklendi (Doğrula, Reddet, Askıya Al, Yeniden İncele) — review_kyc backend endpoint'i entegre edildi
  - KYB Reddet modal'ı KYC ile paylaşımlı hale getirildi, KYB davranışı korundu
  - KYC Reddet modal'ında Re-submit/Suspended kategori seçimi zorunlu yapıldı
  - Textarea resize handle alt-ortaya taşındı (txResize plugin, MutationObserver ile sıfır template touch, tüm textarea'lar otomatik sarmalanır)
  - Yeni Duyuru ve Devir Talebi modal'larında textarea full-width yapıldı
  - Sidebar Rail 1 genişliği 96px'e ayarlandı
  - Sidebar 1 ve 2 font-weight +100 (TenantSwitcher, panel başlıkları, label'lar)
  - Lucide ikon adları yeni sürüm rename'lerine uyduruldu (grid 3x3, circle-check, triangle-alert, cloud-upload, square-check, file-exclamation-point)
  - Dashboard Banner ikonu image oldu (Header Duyuruları megaphone'dan ayrıldı)
  - KYC Doğrulama (Alıcı) ikonu id-card oldu (Satıcı Profilleri'nden ayrıldı)
- feat(rbac-ui): Faz A-H — Permission Console + master sync (@boraydeger32)
  - 7 commit fast-forward edildi
  - router/index.js: meta.module + doctype/route gating + sub-user whitelist
  - stores/navigation.js: dbSellerSections + hiddenDoctypes/Routes Set
  - stores/auth.js: login/logout sonrası navigation resetState (stale fix)
  - stores/permission.js: createRoleProfile + updateRoleProfile + delete + sync
  - Permission Console 10 tab orchestration (?tab= query persist)
  - components/system/CapabilityMatrixTab: matrix + filter + bulk grant
  - components/system/ModuleMatrixTab: 3-state cycle + protected modal
  - components/system/PermissionOverviewTab: 5 KPI + plan tutarsızlık bandı
  - components/system/RoleProfileEditModal: CRUD modal (template inheritance)
  - composables/usePermission: can/seesModule/moduleMode/isMasked/isHidden
  - views/permission/RolesTab: CRUD entegrasyonu (Yeni/Düzenle/Sil + confirm)
  - views/permission/AuditLogTab: 🔒 Maskeleme preset + masked chip
  - views/permission/PlansTab + UsersTab: detay panel
  - views/doctype/DocTypeFormView: maxWritablePermlevel computed (Owner IBAN)
  - common/AppIcon: Lucide v1+ alias map (CheckCircle→CircleCheck vs.)
- feat(plans-ui): + Yeni Plan modal + Plan sil + System Manager gating (@boraydeger32)
  - createSubscriptionPlan({plan_code, plan_name, monthly_price, ...})
  - deleteSubscriptionPlan(plan_code) — selectedPlan reset + fetchPlans
  - Backend tradehub_core.api.v1.permission_console.create/delete_subscription_plan
  - + Yeni Plan butonu (sol panel başında, canManagePlans gated)
  - canManagePlans: isAdmin || roles.includes("System Manager") — Marketplace Admin görmez (Faz F.4 financial separation ile uyum)
  - Yeni Plan modal: plan_code + plan_name + description + monthly/yearly + currency (EUR/USD/TRY) + commission + max_listings + trial_days + is_active + is_public checkbox + uyarı hint ("capability_flags boş başlar")
  - Plan detail detail-actions'a "Sil" butonu — PROTECTED_PLAN_CODES (FREE/STARTER/PRO/ENTERPRISE) disabled + tooltip — active_subscription_count > 0 disabled + "önce abonelikleri taşıyın"
  - Delete confirm dialog (kırmızı header + cascade uyarısı)
  - Modal CSS: pln-modal-backdrop + pln-modal + pln-confirm + pln-field (light/dark mode, token-based, brand button + danger button)
  - "Plan X oluşturuldu" / "Plan X silindi" / hata mesajı
- feat(i18n): migrate admin panel to vue-i18n with ar/ru and RTL (@aliturguttursab)
  - i18n: add src/i18n with createI18n (legacy:false, globalInjection), th-lang persistence + browser detection, en/tr/ar/ru locale bundles
  - direction: RTL_LANGS/isRtl() + applyDocumentDirection() set <html dir>/<html lang>; "ar" rendered RTL
  - nav: add LanguageSwitcher.vue component
  - views/components: replace hard-coded strings with $t across ~170 views and shared components
- feat(crm): saha pazarlama hakediş paneli eklendi (@ahmeetseker)
  - Hakedişlerim, Hakediş Yönetimi ve Hakediş Ayarları görünümleri
  - fieldCommissions Pinia store'u
  - Subscription plan formuna saha komisyon türü/oran/mod/süre alanları
  - "Saha Pazarlama" rolüne panel erişimi (isFieldAgent guard)
  - Hero Slider yönetim görünümü ve slide düzenleme modalı
  - Hakediş ve Hero Slider için navigasyon menüsü + route tanımları
- feat(modules): "Maskeli" legend ikonu üstü çizili göz (EyeOff) (@boraydeger32)
- feat(dashboard-manager): widget satırlarına scope alanı rozeti eklendi (@aliiball)
  - Yeşil rozet (shield icon): scope_field tanımlı, satıcılar görür
  - Kırmızı rozet (warning icon): scope_field eksik, satıcılar göremez
  - Quick links / funnel chart için rozet gösterilmiyor (veri çekmiyor)

### Duzeltildi
- fix(perm-console): vue-router'ı native History API ile değiştir (@boraydeger32)
  - vue-router npm paketi `useRoute`/`useRouter` export ediyor (kontrol edildi)
  - Vue SFC compiler script setup'ı doğru transform ediyor (compileScript çıktısı OK)
  - AMA Vite Rollup production build'i `useRoute`/`useRouter` referanslarını tree-shake ile drop ediyor → index bundle'da sadece RouterLink/RouterView/useLink kalıyor, PermissionConsoleView çağrıda `useRoute is not defined`
- fix(perm-console): kayıp 6 tab geri eklendi (overview, capabilities, modules, masking, simulator, anomaly) (@boraydeger32)
- fix(roles): silinen UI elementlerini geri ekle (header + protected badge + capability bölümü) (@boraydeger32)
  - Header bloğu: rol sayacı + "+ Yeni Rol Profili" butonu (openCreateModal'a bağlı)
  - 🔒 Protected badge: rol listesi item + detail header h2
  - Capability özet bölümü: toplam sayı + capability sekmesi deep-link + module group bazlı capability chip listesi + bayraklar (🛡 owner-only, 🔒 protected, 🆔 KYC, 🚨 AML, 💎 plan feature)
- fix(modules): "Maskeli" hücre ikonu matriste de uygulansın + hizalama (@boraydeger32)
  - Hücre template: masked moduna AppIcon eye-off render edilsin
  - CSS: .legend-icon + .cell-icon ortak — display:inline-block + vertical-align middle (td içinde yatay/dikey ortalama)
- fix(conflicts) : Merge master into Ali (@aliiball)
  - BulkProductImportView: master i18n tarafı (colSelect kolonu dahil)
  - EcaRuleFormView: master radio-group + i18n
  - MyCertificationsView: master label wrapper, cert-chip SCSS korundu
  - DashboardManagerView: master i18n metinler + scope rozeti birleşik

### Degistirildi
- refactor(ui): radio seçimleri toggle bileşenlerine dönüştürüldü (@aliiball)
  - BaseSwitch ve BaseSegmented ortak bileşenleri eklendi
  - ECA kural kapsam seçimi switch'e çevrildi
  - toplu içe aktarma güncelleme modu switch, başlık satırı select'e çevrildi
  - header duyuru gösterim modu segmented'e çevrildi
  - sertifika toplu kaldırma chip grubuna çevrildi

---
## [v1.1.9-beta.22] - 2026-06-04 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(masking): rol bazlı dashboard ve sipariş veri maskeleme UI (@boraydeger32)
  - DynamicKpi.vue masked state desteği — masked_label gösterimi
  - KpiCard.vue masked prop — blur(6px) + opacity efekti ile görsel maskeleme
  - DynamicLineChart.vue masked chart — bulanık placeholder chart
  - SellerOrdersView.vue buyer_masked blur gösterimi
  - SellerOrdersView.vue amounts_masked tutar gizleme
  - Nginx config storefront ve admin-panel lokal frappe-nginx'e proxy
- feat(messaging): buyer messages + availability görünümleri, reservation/buyerMessages store'ları (@aliturguttursab)
  - BuyerMessagesView + AvailabilityView (messaging)
  - reservation ve buyerMessages Pinia store'ları
  - navigation/router girişleri + api util güncellemesi
- feat(kyc): admin panel KYC hızlı aksiyonlar ve form iyileştirmeleri (@aliiball)
  - KYC Verification için 4 hızlı aksiyon butonu eklendi (Doğrula, Reddet, Askıya Al, Yeniden İncele) — review_kyc backend endpoint'i entegre edildi
  - KYB Reddet modal'ı KYC ile paylaşımlı hale getirildi, KYB davranışı korundu
  - KYC Reddet modal'ında Re-submit/Suspended kategori seçimi zorunlu yapıldı
  - Textarea resize handle alt-ortaya taşındı (txResize plugin, MutationObserver ile sıfır template touch, tüm textarea'lar otomatik sarmalanır)
  - Yeni Duyuru ve Devir Talebi modal'larında textarea full-width yapıldı
  - Sidebar Rail 1 genişliği 96px'e ayarlandı
  - Sidebar 1 ve 2 font-weight +100 (TenantSwitcher, panel başlıkları, label'lar)
  - Lucide ikon adları yeni sürüm rename'lerine uyduruldu (grid 3x3, circle-check, triangle-alert, cloud-upload, square-check, file-exclamation-point)
  - Dashboard Banner ikonu image oldu (Header Duyuruları megaphone'dan ayrıldı)
  - KYC Doğrulama (Alıcı) ikonu id-card oldu (Satıcı Profilleri'nden ayrıldı)
- feat(rbac-ui): Faz A-H — Permission Console + master sync (@boraydeger32)
  - 7 commit fast-forward edildi
  - router/index.js: meta.module + doctype/route gating + sub-user whitelist
  - stores/navigation.js: dbSellerSections + hiddenDoctypes/Routes Set
  - stores/auth.js: login/logout sonrası navigation resetState (stale fix)
  - stores/permission.js: createRoleProfile + updateRoleProfile + delete + sync
  - Permission Console 10 tab orchestration (?tab= query persist)
  - components/system/CapabilityMatrixTab: matrix + filter + bulk grant
  - components/system/ModuleMatrixTab: 3-state cycle + protected modal
  - components/system/PermissionOverviewTab: 5 KPI + plan tutarsızlık bandı
  - components/system/RoleProfileEditModal: CRUD modal (template inheritance)
  - composables/usePermission: can/seesModule/moduleMode/isMasked/isHidden
  - views/permission/RolesTab: CRUD entegrasyonu (Yeni/Düzenle/Sil + confirm)
  - views/permission/AuditLogTab: 🔒 Maskeleme preset + masked chip
  - views/permission/PlansTab + UsersTab: detay panel
  - views/doctype/DocTypeFormView: maxWritablePermlevel computed (Owner IBAN)
  - common/AppIcon: Lucide v1+ alias map (CheckCircle→CircleCheck vs.)
- feat(plans-ui): + Yeni Plan modal + Plan sil + System Manager gating (@boraydeger32)
  - createSubscriptionPlan({plan_code, plan_name, monthly_price, ...})
  - deleteSubscriptionPlan(plan_code) — selectedPlan reset + fetchPlans
  - Backend tradehub_core.api.v1.permission_console.create/delete_subscription_plan
  - + Yeni Plan butonu (sol panel başında, canManagePlans gated)
  - canManagePlans: isAdmin || roles.includes("System Manager") — Marketplace Admin görmez (Faz F.4 financial separation ile uyum)
  - Yeni Plan modal: plan_code + plan_name + description + monthly/yearly + currency (EUR/USD/TRY) + commission + max_listings + trial_days + is_active + is_public checkbox + uyarı hint ("capability_flags boş başlar")
  - Plan detail detail-actions'a "Sil" butonu — PROTECTED_PLAN_CODES (FREE/STARTER/PRO/ENTERPRISE) disabled + tooltip — active_subscription_count > 0 disabled + "önce abonelikleri taşıyın"
  - Delete confirm dialog (kırmızı header + cascade uyarısı)
  - Modal CSS: pln-modal-backdrop + pln-modal + pln-confirm + pln-field (light/dark mode, token-based, brand button + danger button)
  - "Plan X oluşturuldu" / "Plan X silindi" / hata mesajı
- feat(i18n): migrate admin panel to vue-i18n with ar/ru and RTL (@aliturguttursab)
  - i18n: add src/i18n with createI18n (legacy:false, globalInjection), th-lang persistence + browser detection, en/tr/ar/ru locale bundles
  - direction: RTL_LANGS/isRtl() + applyDocumentDirection() set <html dir>/<html lang>; "ar" rendered RTL
  - nav: add LanguageSwitcher.vue component
  - views/components: replace hard-coded strings with $t across ~170 views and shared components
- feat(crm): saha pazarlama hakediş paneli eklendi (@ahmeetseker)
  - Hakedişlerim, Hakediş Yönetimi ve Hakediş Ayarları görünümleri
  - fieldCommissions Pinia store'u
  - Subscription plan formuna saha komisyon türü/oran/mod/süre alanları
  - "Saha Pazarlama" rolüne panel erişimi (isFieldAgent guard)
  - Hero Slider yönetim görünümü ve slide düzenleme modalı
  - Hakediş ve Hero Slider için navigasyon menüsü + route tanımları
- feat(modules): "Maskeli" legend ikonu üstü çizili göz (EyeOff) (@boraydeger32)

### Duzeltildi
- fix(perm-console): vue-router'ı native History API ile değiştir (@boraydeger32)
  - vue-router npm paketi `useRoute`/`useRouter` export ediyor (kontrol edildi)
  - Vue SFC compiler script setup'ı doğru transform ediyor (compileScript çıktısı OK)
  - AMA Vite Rollup production build'i `useRoute`/`useRouter` referanslarını tree-shake ile drop ediyor → index bundle'da sadece RouterLink/RouterView/useLink kalıyor, PermissionConsoleView çağrıda `useRoute is not defined`
- fix(perm-console): kayıp 6 tab geri eklendi (overview, capabilities, modules, masking, simulator, anomaly) (@boraydeger32)
- fix(roles): silinen UI elementlerini geri ekle (header + protected badge + capability bölümü) (@boraydeger32)
  - Header bloğu: rol sayacı + "+ Yeni Rol Profili" butonu (openCreateModal'a bağlı)
  - 🔒 Protected badge: rol listesi item + detail header h2
  - Capability özet bölümü: toplam sayı + capability sekmesi deep-link + module group bazlı capability chip listesi + bayraklar (🛡 owner-only, 🔒 protected, 🆔 KYC, 🚨 AML, 💎 plan feature)
- fix(modules): "Maskeli" hücre ikonu matriste de uygulansın + hizalama (@boraydeger32)
  - Hücre template: masked moduna AppIcon eye-off render edilsin
  - CSS: .legend-icon + .cell-icon ortak — display:inline-block + vertical-align middle (td içinde yatay/dikey ortalama)

---
## [v1.1.9-beta.21] - 2026-06-04 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(masking): rol bazlı dashboard ve sipariş veri maskeleme UI (@boraydeger32)
  - DynamicKpi.vue masked state desteği — masked_label gösterimi
  - KpiCard.vue masked prop — blur(6px) + opacity efekti ile görsel maskeleme
  - DynamicLineChart.vue masked chart — bulanık placeholder chart
  - SellerOrdersView.vue buyer_masked blur gösterimi
  - SellerOrdersView.vue amounts_masked tutar gizleme
  - Nginx config storefront ve admin-panel lokal frappe-nginx'e proxy
- feat(messaging): buyer messages + availability görünümleri, reservation/buyerMessages store'ları (@aliturguttursab)
  - BuyerMessagesView + AvailabilityView (messaging)
  - reservation ve buyerMessages Pinia store'ları
  - navigation/router girişleri + api util güncellemesi
- feat(kyc): admin panel KYC hızlı aksiyonlar ve form iyileştirmeleri (@aliiball)
  - KYC Verification için 4 hızlı aksiyon butonu eklendi (Doğrula, Reddet, Askıya Al, Yeniden İncele) — review_kyc backend endpoint'i entegre edildi
  - KYB Reddet modal'ı KYC ile paylaşımlı hale getirildi, KYB davranışı korundu
  - KYC Reddet modal'ında Re-submit/Suspended kategori seçimi zorunlu yapıldı
  - Textarea resize handle alt-ortaya taşındı (txResize plugin, MutationObserver ile sıfır template touch, tüm textarea'lar otomatik sarmalanır)
  - Yeni Duyuru ve Devir Talebi modal'larında textarea full-width yapıldı
  - Sidebar Rail 1 genişliği 96px'e ayarlandı
  - Sidebar 1 ve 2 font-weight +100 (TenantSwitcher, panel başlıkları, label'lar)
  - Lucide ikon adları yeni sürüm rename'lerine uyduruldu (grid 3x3, circle-check, triangle-alert, cloud-upload, square-check, file-exclamation-point)
  - Dashboard Banner ikonu image oldu (Header Duyuruları megaphone'dan ayrıldı)
  - KYC Doğrulama (Alıcı) ikonu id-card oldu (Satıcı Profilleri'nden ayrıldı)
- feat(rbac-ui): Faz A-H — Permission Console + master sync (@boraydeger32)
  - 7 commit fast-forward edildi
  - router/index.js: meta.module + doctype/route gating + sub-user whitelist
  - stores/navigation.js: dbSellerSections + hiddenDoctypes/Routes Set
  - stores/auth.js: login/logout sonrası navigation resetState (stale fix)
  - stores/permission.js: createRoleProfile + updateRoleProfile + delete + sync
  - Permission Console 10 tab orchestration (?tab= query persist)
  - components/system/CapabilityMatrixTab: matrix + filter + bulk grant
  - components/system/ModuleMatrixTab: 3-state cycle + protected modal
  - components/system/PermissionOverviewTab: 5 KPI + plan tutarsızlık bandı
  - components/system/RoleProfileEditModal: CRUD modal (template inheritance)
  - composables/usePermission: can/seesModule/moduleMode/isMasked/isHidden
  - views/permission/RolesTab: CRUD entegrasyonu (Yeni/Düzenle/Sil + confirm)
  - views/permission/AuditLogTab: 🔒 Maskeleme preset + masked chip
  - views/permission/PlansTab + UsersTab: detay panel
  - views/doctype/DocTypeFormView: maxWritablePermlevel computed (Owner IBAN)
  - common/AppIcon: Lucide v1+ alias map (CheckCircle→CircleCheck vs.)
- feat(plans-ui): + Yeni Plan modal + Plan sil + System Manager gating (@boraydeger32)
  - createSubscriptionPlan({plan_code, plan_name, monthly_price, ...})
  - deleteSubscriptionPlan(plan_code) — selectedPlan reset + fetchPlans
  - Backend tradehub_core.api.v1.permission_console.create/delete_subscription_plan
  - + Yeni Plan butonu (sol panel başında, canManagePlans gated)
  - canManagePlans: isAdmin || roles.includes("System Manager") — Marketplace Admin görmez (Faz F.4 financial separation ile uyum)
  - Yeni Plan modal: plan_code + plan_name + description + monthly/yearly + currency (EUR/USD/TRY) + commission + max_listings + trial_days + is_active + is_public checkbox + uyarı hint ("capability_flags boş başlar")
  - Plan detail detail-actions'a "Sil" butonu — PROTECTED_PLAN_CODES (FREE/STARTER/PRO/ENTERPRISE) disabled + tooltip — active_subscription_count > 0 disabled + "önce abonelikleri taşıyın"
  - Delete confirm dialog (kırmızı header + cascade uyarısı)
  - Modal CSS: pln-modal-backdrop + pln-modal + pln-confirm + pln-field (light/dark mode, token-based, brand button + danger button)
  - "Plan X oluşturuldu" / "Plan X silindi" / hata mesajı
- feat(i18n): migrate admin panel to vue-i18n with ar/ru and RTL (@aliturguttursab)
  - i18n: add src/i18n with createI18n (legacy:false, globalInjection), th-lang persistence + browser detection, en/tr/ar/ru locale bundles
  - direction: RTL_LANGS/isRtl() + applyDocumentDirection() set <html dir>/<html lang>; "ar" rendered RTL
  - nav: add LanguageSwitcher.vue component
  - views/components: replace hard-coded strings with $t across ~170 views and shared components
- feat(crm): saha pazarlama hakediş paneli eklendi (@ahmeetseker)
  - Hakedişlerim, Hakediş Yönetimi ve Hakediş Ayarları görünümleri
  - fieldCommissions Pinia store'u
  - Subscription plan formuna saha komisyon türü/oran/mod/süre alanları
  - "Saha Pazarlama" rolüne panel erişimi (isFieldAgent guard)
  - Hero Slider yönetim görünümü ve slide düzenleme modalı
  - Hakediş ve Hero Slider için navigasyon menüsü + route tanımları

### Duzeltildi
- fix(perm-console): vue-router'ı native History API ile değiştir (@boraydeger32)
  - vue-router npm paketi `useRoute`/`useRouter` export ediyor (kontrol edildi)
  - Vue SFC compiler script setup'ı doğru transform ediyor (compileScript çıktısı OK)
  - AMA Vite Rollup production build'i `useRoute`/`useRouter` referanslarını tree-shake ile drop ediyor → index bundle'da sadece RouterLink/RouterView/useLink kalıyor, PermissionConsoleView çağrıda `useRoute is not defined`
- fix(perm-console): kayıp 6 tab geri eklendi (overview, capabilities, modules, masking, simulator, anomaly) (@boraydeger32)
- fix(roles): silinen UI elementlerini geri ekle (header + protected badge + capability bölümü) (@boraydeger32)
  - Header bloğu: rol sayacı + "+ Yeni Rol Profili" butonu (openCreateModal'a bağlı)
  - 🔒 Protected badge: rol listesi item + detail header h2
  - Capability özet bölümü: toplam sayı + capability sekmesi deep-link + module group bazlı capability chip listesi + bayraklar (🛡 owner-only, 🔒 protected, 🆔 KYC, 🚨 AML, 💎 plan feature)

---
## [v1.1.9-beta.20] - 2026-06-03 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(masking): rol bazlı dashboard ve sipariş veri maskeleme UI (@boraydeger32)
  - DynamicKpi.vue masked state desteği — masked_label gösterimi
  - KpiCard.vue masked prop — blur(6px) + opacity efekti ile görsel maskeleme
  - DynamicLineChart.vue masked chart — bulanık placeholder chart
  - SellerOrdersView.vue buyer_masked blur gösterimi
  - SellerOrdersView.vue amounts_masked tutar gizleme
  - Nginx config storefront ve admin-panel lokal frappe-nginx'e proxy
- feat(messaging): buyer messages + availability görünümleri, reservation/buyerMessages store'ları (@aliturguttursab)
  - BuyerMessagesView + AvailabilityView (messaging)
  - reservation ve buyerMessages Pinia store'ları
  - navigation/router girişleri + api util güncellemesi
- feat(kyc): admin panel KYC hızlı aksiyonlar ve form iyileştirmeleri (@aliiball)
  - KYC Verification için 4 hızlı aksiyon butonu eklendi (Doğrula, Reddet, Askıya Al, Yeniden İncele) — review_kyc backend endpoint'i entegre edildi
  - KYB Reddet modal'ı KYC ile paylaşımlı hale getirildi, KYB davranışı korundu
  - KYC Reddet modal'ında Re-submit/Suspended kategori seçimi zorunlu yapıldı
  - Textarea resize handle alt-ortaya taşındı (txResize plugin, MutationObserver ile sıfır template touch, tüm textarea'lar otomatik sarmalanır)
  - Yeni Duyuru ve Devir Talebi modal'larında textarea full-width yapıldı
  - Sidebar Rail 1 genişliği 96px'e ayarlandı
  - Sidebar 1 ve 2 font-weight +100 (TenantSwitcher, panel başlıkları, label'lar)
  - Lucide ikon adları yeni sürüm rename'lerine uyduruldu (grid 3x3, circle-check, triangle-alert, cloud-upload, square-check, file-exclamation-point)
  - Dashboard Banner ikonu image oldu (Header Duyuruları megaphone'dan ayrıldı)
  - KYC Doğrulama (Alıcı) ikonu id-card oldu (Satıcı Profilleri'nden ayrıldı)
- feat(rbac-ui): Faz A-H — Permission Console + master sync (@boraydeger32)
  - 7 commit fast-forward edildi
  - router/index.js: meta.module + doctype/route gating + sub-user whitelist
  - stores/navigation.js: dbSellerSections + hiddenDoctypes/Routes Set
  - stores/auth.js: login/logout sonrası navigation resetState (stale fix)
  - stores/permission.js: createRoleProfile + updateRoleProfile + delete + sync
  - Permission Console 10 tab orchestration (?tab= query persist)
  - components/system/CapabilityMatrixTab: matrix + filter + bulk grant
  - components/system/ModuleMatrixTab: 3-state cycle + protected modal
  - components/system/PermissionOverviewTab: 5 KPI + plan tutarsızlık bandı
  - components/system/RoleProfileEditModal: CRUD modal (template inheritance)
  - composables/usePermission: can/seesModule/moduleMode/isMasked/isHidden
  - views/permission/RolesTab: CRUD entegrasyonu (Yeni/Düzenle/Sil + confirm)
  - views/permission/AuditLogTab: 🔒 Maskeleme preset + masked chip
  - views/permission/PlansTab + UsersTab: detay panel
  - views/doctype/DocTypeFormView: maxWritablePermlevel computed (Owner IBAN)
  - common/AppIcon: Lucide v1+ alias map (CheckCircle→CircleCheck vs.)
- feat(plans-ui): + Yeni Plan modal + Plan sil + System Manager gating (@boraydeger32)
  - createSubscriptionPlan({plan_code, plan_name, monthly_price, ...})
  - deleteSubscriptionPlan(plan_code) — selectedPlan reset + fetchPlans
  - Backend tradehub_core.api.v1.permission_console.create/delete_subscription_plan
  - + Yeni Plan butonu (sol panel başında, canManagePlans gated)
  - canManagePlans: isAdmin || roles.includes("System Manager") — Marketplace Admin görmez (Faz F.4 financial separation ile uyum)
  - Yeni Plan modal: plan_code + plan_name + description + monthly/yearly + currency (EUR/USD/TRY) + commission + max_listings + trial_days + is_active + is_public checkbox + uyarı hint ("capability_flags boş başlar")
  - Plan detail detail-actions'a "Sil" butonu — PROTECTED_PLAN_CODES (FREE/STARTER/PRO/ENTERPRISE) disabled + tooltip — active_subscription_count > 0 disabled + "önce abonelikleri taşıyın"
  - Delete confirm dialog (kırmızı header + cascade uyarısı)
  - Modal CSS: pln-modal-backdrop + pln-modal + pln-confirm + pln-field (light/dark mode, token-based, brand button + danger button)
  - "Plan X oluşturuldu" / "Plan X silindi" / hata mesajı
- feat(i18n): migrate admin panel to vue-i18n with ar/ru and RTL (@aliturguttursab)
  - i18n: add src/i18n with createI18n (legacy:false, globalInjection), th-lang persistence + browser detection, en/tr/ar/ru locale bundles
  - direction: RTL_LANGS/isRtl() + applyDocumentDirection() set <html dir>/<html lang>; "ar" rendered RTL
  - nav: add LanguageSwitcher.vue component
  - views/components: replace hard-coded strings with $t across ~170 views and shared components
- feat(crm): saha pazarlama hakediş paneli eklendi (@ahmeetseker)
  - Hakedişlerim, Hakediş Yönetimi ve Hakediş Ayarları görünümleri
  - fieldCommissions Pinia store'u
  - Subscription plan formuna saha komisyon türü/oran/mod/süre alanları
  - "Saha Pazarlama" rolüne panel erişimi (isFieldAgent guard)
  - Hero Slider yönetim görünümü ve slide düzenleme modalı
  - Hakediş ve Hero Slider için navigasyon menüsü + route tanımları

### Duzeltildi
- fix(perm-console): vue-router'ı native History API ile değiştir (@boraydeger32)
  - vue-router npm paketi `useRoute`/`useRouter` export ediyor (kontrol edildi)
  - Vue SFC compiler script setup'ı doğru transform ediyor (compileScript çıktısı OK)
  - AMA Vite Rollup production build'i `useRoute`/`useRouter` referanslarını tree-shake ile drop ediyor → index bundle'da sadece RouterLink/RouterView/useLink kalıyor, PermissionConsoleView çağrıda `useRoute is not defined`
- fix(perm-console): kayıp 6 tab geri eklendi (overview, capabilities, modules, masking, simulator, anomaly) (@boraydeger32)
- fix(roles): silinen UI elementlerini geri ekle (header + protected badge + capability bölümü) (@boraydeger32)
  - Header bloğu: rol sayacı + "+ Yeni Rol Profili" butonu (openCreateModal'a bağlı)
  - 🔒 Protected badge: rol listesi item + detail header h2
  - Capability özet bölümü: toplam sayı + capability sekmesi deep-link + module group bazlı capability chip listesi + bayraklar (🛡 owner-only, 🔒 protected, 🆔 KYC, 🚨 AML, 💎 plan feature)

---
## [v1.1.9-beta.19] - 2026-06-03 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(masking): rol bazlı dashboard ve sipariş veri maskeleme UI (@boraydeger32)
  - DynamicKpi.vue masked state desteği — masked_label gösterimi
  - KpiCard.vue masked prop — blur(6px) + opacity efekti ile görsel maskeleme
  - DynamicLineChart.vue masked chart — bulanık placeholder chart
  - SellerOrdersView.vue buyer_masked blur gösterimi
  - SellerOrdersView.vue amounts_masked tutar gizleme
  - Nginx config storefront ve admin-panel lokal frappe-nginx'e proxy
- feat(messaging): buyer messages + availability görünümleri, reservation/buyerMessages store'ları (@aliturguttursab)
  - BuyerMessagesView + AvailabilityView (messaging)
  - reservation ve buyerMessages Pinia store'ları
  - navigation/router girişleri + api util güncellemesi
- feat(kyc): admin panel KYC hızlı aksiyonlar ve form iyileştirmeleri (@aliiball)
  - KYC Verification için 4 hızlı aksiyon butonu eklendi (Doğrula, Reddet, Askıya Al, Yeniden İncele) — review_kyc backend endpoint'i entegre edildi
  - KYB Reddet modal'ı KYC ile paylaşımlı hale getirildi, KYB davranışı korundu
  - KYC Reddet modal'ında Re-submit/Suspended kategori seçimi zorunlu yapıldı
  - Textarea resize handle alt-ortaya taşındı (txResize plugin, MutationObserver ile sıfır template touch, tüm textarea'lar otomatik sarmalanır)
  - Yeni Duyuru ve Devir Talebi modal'larında textarea full-width yapıldı
  - Sidebar Rail 1 genişliği 96px'e ayarlandı
  - Sidebar 1 ve 2 font-weight +100 (TenantSwitcher, panel başlıkları, label'lar)
  - Lucide ikon adları yeni sürüm rename'lerine uyduruldu (grid 3x3, circle-check, triangle-alert, cloud-upload, square-check, file-exclamation-point)
  - Dashboard Banner ikonu image oldu (Header Duyuruları megaphone'dan ayrıldı)
  - KYC Doğrulama (Alıcı) ikonu id-card oldu (Satıcı Profilleri'nden ayrıldı)
- feat(rbac-ui): Faz A-H — Permission Console + master sync (@boraydeger32)
  - 7 commit fast-forward edildi
  - router/index.js: meta.module + doctype/route gating + sub-user whitelist
  - stores/navigation.js: dbSellerSections + hiddenDoctypes/Routes Set
  - stores/auth.js: login/logout sonrası navigation resetState (stale fix)
  - stores/permission.js: createRoleProfile + updateRoleProfile + delete + sync
  - Permission Console 10 tab orchestration (?tab= query persist)
  - components/system/CapabilityMatrixTab: matrix + filter + bulk grant
  - components/system/ModuleMatrixTab: 3-state cycle + protected modal
  - components/system/PermissionOverviewTab: 5 KPI + plan tutarsızlık bandı
  - components/system/RoleProfileEditModal: CRUD modal (template inheritance)
  - composables/usePermission: can/seesModule/moduleMode/isMasked/isHidden
  - views/permission/RolesTab: CRUD entegrasyonu (Yeni/Düzenle/Sil + confirm)
  - views/permission/AuditLogTab: 🔒 Maskeleme preset + masked chip
  - views/permission/PlansTab + UsersTab: detay panel
  - views/doctype/DocTypeFormView: maxWritablePermlevel computed (Owner IBAN)
  - common/AppIcon: Lucide v1+ alias map (CheckCircle→CircleCheck vs.)
- feat(plans-ui): + Yeni Plan modal + Plan sil + System Manager gating (@boraydeger32)
  - createSubscriptionPlan({plan_code, plan_name, monthly_price, ...})
  - deleteSubscriptionPlan(plan_code) — selectedPlan reset + fetchPlans
  - Backend tradehub_core.api.v1.permission_console.create/delete_subscription_plan
  - + Yeni Plan butonu (sol panel başında, canManagePlans gated)
  - canManagePlans: isAdmin || roles.includes("System Manager") — Marketplace Admin görmez (Faz F.4 financial separation ile uyum)
  - Yeni Plan modal: plan_code + plan_name + description + monthly/yearly + currency (EUR/USD/TRY) + commission + max_listings + trial_days + is_active + is_public checkbox + uyarı hint ("capability_flags boş başlar")
  - Plan detail detail-actions'a "Sil" butonu — PROTECTED_PLAN_CODES (FREE/STARTER/PRO/ENTERPRISE) disabled + tooltip — active_subscription_count > 0 disabled + "önce abonelikleri taşıyın"
  - Delete confirm dialog (kırmızı header + cascade uyarısı)
  - Modal CSS: pln-modal-backdrop + pln-modal + pln-confirm + pln-field (light/dark mode, token-based, brand button + danger button)
  - "Plan X oluşturuldu" / "Plan X silindi" / hata mesajı
- feat(i18n): migrate admin panel to vue-i18n with ar/ru and RTL (@aliturguttursab)
  - i18n: add src/i18n with createI18n (legacy:false, globalInjection), th-lang persistence + browser detection, en/tr/ar/ru locale bundles
  - direction: RTL_LANGS/isRtl() + applyDocumentDirection() set <html dir>/<html lang>; "ar" rendered RTL
  - nav: add LanguageSwitcher.vue component
  - views/components: replace hard-coded strings with $t across ~170 views and shared components
- feat(crm): saha pazarlama hakediş paneli eklendi (@ahmeetseker)
  - Hakedişlerim, Hakediş Yönetimi ve Hakediş Ayarları görünümleri
  - fieldCommissions Pinia store'u
  - Subscription plan formuna saha komisyon türü/oran/mod/süre alanları
  - "Saha Pazarlama" rolüne panel erişimi (isFieldAgent guard)
  - Hero Slider yönetim görünümü ve slide düzenleme modalı
  - Hakediş ve Hero Slider için navigasyon menüsü + route tanımları

### Duzeltildi
- fix(perm-console): vue-router'ı native History API ile değiştir (@boraydeger32)
  - vue-router npm paketi `useRoute`/`useRouter` export ediyor (kontrol edildi)
  - Vue SFC compiler script setup'ı doğru transform ediyor (compileScript çıktısı OK)
  - AMA Vite Rollup production build'i `useRoute`/`useRouter` referanslarını tree-shake ile drop ediyor → index bundle'da sadece RouterLink/RouterView/useLink kalıyor, PermissionConsoleView çağrıda `useRoute is not defined`

---
## [v1.1.9-beta.17] - 2026-06-03 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(masking): rol bazlı dashboard ve sipariş veri maskeleme UI (@boraydeger32)
  - DynamicKpi.vue masked state desteği — masked_label gösterimi
  - KpiCard.vue masked prop — blur(6px) + opacity efekti ile görsel maskeleme
  - DynamicLineChart.vue masked chart — bulanık placeholder chart
  - SellerOrdersView.vue buyer_masked blur gösterimi
  - SellerOrdersView.vue amounts_masked tutar gizleme
  - Nginx config storefront ve admin-panel lokal frappe-nginx'e proxy
- feat(messaging): buyer messages + availability görünümleri, reservation/buyerMessages store'ları (@aliturguttursab)
  - BuyerMessagesView + AvailabilityView (messaging)
  - reservation ve buyerMessages Pinia store'ları
  - navigation/router girişleri + api util güncellemesi
- feat(kyc): admin panel KYC hızlı aksiyonlar ve form iyileştirmeleri (@aliiball)
  - KYC Verification için 4 hızlı aksiyon butonu eklendi (Doğrula, Reddet, Askıya Al, Yeniden İncele) — review_kyc backend endpoint'i entegre edildi
  - KYB Reddet modal'ı KYC ile paylaşımlı hale getirildi, KYB davranışı korundu
  - KYC Reddet modal'ında Re-submit/Suspended kategori seçimi zorunlu yapıldı
  - Textarea resize handle alt-ortaya taşındı (txResize plugin, MutationObserver ile sıfır template touch, tüm textarea'lar otomatik sarmalanır)
  - Yeni Duyuru ve Devir Talebi modal'larında textarea full-width yapıldı
  - Sidebar Rail 1 genişliği 96px'e ayarlandı
  - Sidebar 1 ve 2 font-weight +100 (TenantSwitcher, panel başlıkları, label'lar)
  - Lucide ikon adları yeni sürüm rename'lerine uyduruldu (grid 3x3, circle-check, triangle-alert, cloud-upload, square-check, file-exclamation-point)
  - Dashboard Banner ikonu image oldu (Header Duyuruları megaphone'dan ayrıldı)
  - KYC Doğrulama (Alıcı) ikonu id-card oldu (Satıcı Profilleri'nden ayrıldı)
- feat(rbac-ui): Faz A-H — Permission Console + master sync (@boraydeger32)
  - 7 commit fast-forward edildi
  - router/index.js: meta.module + doctype/route gating + sub-user whitelist
  - stores/navigation.js: dbSellerSections + hiddenDoctypes/Routes Set
  - stores/auth.js: login/logout sonrası navigation resetState (stale fix)
  - stores/permission.js: createRoleProfile + updateRoleProfile + delete + sync
  - Permission Console 10 tab orchestration (?tab= query persist)
  - components/system/CapabilityMatrixTab: matrix + filter + bulk grant
  - components/system/ModuleMatrixTab: 3-state cycle + protected modal
  - components/system/PermissionOverviewTab: 5 KPI + plan tutarsızlık bandı
  - components/system/RoleProfileEditModal: CRUD modal (template inheritance)
  - composables/usePermission: can/seesModule/moduleMode/isMasked/isHidden
  - views/permission/RolesTab: CRUD entegrasyonu (Yeni/Düzenle/Sil + confirm)
  - views/permission/AuditLogTab: 🔒 Maskeleme preset + masked chip
  - views/permission/PlansTab + UsersTab: detay panel
  - views/doctype/DocTypeFormView: maxWritablePermlevel computed (Owner IBAN)
  - common/AppIcon: Lucide v1+ alias map (CheckCircle→CircleCheck vs.)
- feat(plans-ui): + Yeni Plan modal + Plan sil + System Manager gating (@boraydeger32)
  - createSubscriptionPlan({plan_code, plan_name, monthly_price, ...})
  - deleteSubscriptionPlan(plan_code) — selectedPlan reset + fetchPlans
  - Backend tradehub_core.api.v1.permission_console.create/delete_subscription_plan
  - + Yeni Plan butonu (sol panel başında, canManagePlans gated)
  - canManagePlans: isAdmin || roles.includes("System Manager") — Marketplace Admin görmez (Faz F.4 financial separation ile uyum)
  - Yeni Plan modal: plan_code + plan_name + description + monthly/yearly + currency (EUR/USD/TRY) + commission + max_listings + trial_days + is_active + is_public checkbox + uyarı hint ("capability_flags boş başlar")
  - Plan detail detail-actions'a "Sil" butonu — PROTECTED_PLAN_CODES (FREE/STARTER/PRO/ENTERPRISE) disabled + tooltip — active_subscription_count > 0 disabled + "önce abonelikleri taşıyın"
  - Delete confirm dialog (kırmızı header + cascade uyarısı)
  - Modal CSS: pln-modal-backdrop + pln-modal + pln-confirm + pln-field (light/dark mode, token-based, brand button + danger button)
  - "Plan X oluşturuldu" / "Plan X silindi" / hata mesajı
- feat(i18n): migrate admin panel to vue-i18n with ar/ru and RTL (@aliturguttursab)
  - i18n: add src/i18n with createI18n (legacy:false, globalInjection), th-lang persistence + browser detection, en/tr/ar/ru locale bundles
  - direction: RTL_LANGS/isRtl() + applyDocumentDirection() set <html dir>/<html lang>; "ar" rendered RTL
  - nav: add LanguageSwitcher.vue component
  - views/components: replace hard-coded strings with $t across ~170 views and shared components

---
## [v1.1.9-beta.16] - 2026-06-03 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(masking): rol bazlı dashboard ve sipariş veri maskeleme UI (@boraydeger32)
  - DynamicKpi.vue masked state desteği — masked_label gösterimi
  - KpiCard.vue masked prop — blur(6px) + opacity efekti ile görsel maskeleme
  - DynamicLineChart.vue masked chart — bulanık placeholder chart
  - SellerOrdersView.vue buyer_masked blur gösterimi
  - SellerOrdersView.vue amounts_masked tutar gizleme
  - Nginx config storefront ve admin-panel lokal frappe-nginx'e proxy
- feat(messaging): buyer messages + availability görünümleri, reservation/buyerMessages store'ları (@aliturguttursab)
  - BuyerMessagesView + AvailabilityView (messaging)
  - reservation ve buyerMessages Pinia store'ları
  - navigation/router girişleri + api util güncellemesi
- feat(kyc): admin panel KYC hızlı aksiyonlar ve form iyileştirmeleri (@aliiball)
  - KYC Verification için 4 hızlı aksiyon butonu eklendi (Doğrula, Reddet, Askıya Al, Yeniden İncele) — review_kyc backend endpoint'i entegre edildi
  - KYB Reddet modal'ı KYC ile paylaşımlı hale getirildi, KYB davranışı korundu
  - KYC Reddet modal'ında Re-submit/Suspended kategori seçimi zorunlu yapıldı
  - Textarea resize handle alt-ortaya taşındı (txResize plugin, MutationObserver ile sıfır template touch, tüm textarea'lar otomatik sarmalanır)
  - Yeni Duyuru ve Devir Talebi modal'larında textarea full-width yapıldı
  - Sidebar Rail 1 genişliği 96px'e ayarlandı
  - Sidebar 1 ve 2 font-weight +100 (TenantSwitcher, panel başlıkları, label'lar)
  - Lucide ikon adları yeni sürüm rename'lerine uyduruldu (grid 3x3, circle-check, triangle-alert, cloud-upload, square-check, file-exclamation-point)
  - Dashboard Banner ikonu image oldu (Header Duyuruları megaphone'dan ayrıldı)
  - KYC Doğrulama (Alıcı) ikonu id-card oldu (Satıcı Profilleri'nden ayrıldı)
- feat(rbac-ui): Faz A-H — Permission Console + master sync (@boraydeger32)
  - 7 commit fast-forward edildi
  - router/index.js: meta.module + doctype/route gating + sub-user whitelist
  - stores/navigation.js: dbSellerSections + hiddenDoctypes/Routes Set
  - stores/auth.js: login/logout sonrası navigation resetState (stale fix)
  - stores/permission.js: createRoleProfile + updateRoleProfile + delete + sync
  - Permission Console 10 tab orchestration (?tab= query persist)
  - components/system/CapabilityMatrixTab: matrix + filter + bulk grant
  - components/system/ModuleMatrixTab: 3-state cycle + protected modal
  - components/system/PermissionOverviewTab: 5 KPI + plan tutarsızlık bandı
  - components/system/RoleProfileEditModal: CRUD modal (template inheritance)
  - composables/usePermission: can/seesModule/moduleMode/isMasked/isHidden
  - views/permission/RolesTab: CRUD entegrasyonu (Yeni/Düzenle/Sil + confirm)
  - views/permission/AuditLogTab: 🔒 Maskeleme preset + masked chip
  - views/permission/PlansTab + UsersTab: detay panel
  - views/doctype/DocTypeFormView: maxWritablePermlevel computed (Owner IBAN)
  - common/AppIcon: Lucide v1+ alias map (CheckCircle→CircleCheck vs.)
- feat(plans-ui): + Yeni Plan modal + Plan sil + System Manager gating (@boraydeger32)
  - createSubscriptionPlan({plan_code, plan_name, monthly_price, ...})
  - deleteSubscriptionPlan(plan_code) — selectedPlan reset + fetchPlans
  - Backend tradehub_core.api.v1.permission_console.create/delete_subscription_plan
  - + Yeni Plan butonu (sol panel başında, canManagePlans gated)
  - canManagePlans: isAdmin || roles.includes("System Manager") — Marketplace Admin görmez (Faz F.4 financial separation ile uyum)
  - Yeni Plan modal: plan_code + plan_name + description + monthly/yearly + currency (EUR/USD/TRY) + commission + max_listings + trial_days + is_active + is_public checkbox + uyarı hint ("capability_flags boş başlar")
  - Plan detail detail-actions'a "Sil" butonu — PROTECTED_PLAN_CODES (FREE/STARTER/PRO/ENTERPRISE) disabled + tooltip — active_subscription_count > 0 disabled + "önce abonelikleri taşıyın"
  - Delete confirm dialog (kırmızı header + cascade uyarısı)
  - Modal CSS: pln-modal-backdrop + pln-modal + pln-confirm + pln-field (light/dark mode, token-based, brand button + danger button)
  - "Plan X oluşturuldu" / "Plan X silindi" / hata mesajı

---
## [v1.1.9-beta.15] - 2026-06-03 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(masking): rol bazlı dashboard ve sipariş veri maskeleme UI (@boraydeger32)
  - DynamicKpi.vue masked state desteği — masked_label gösterimi
  - KpiCard.vue masked prop — blur(6px) + opacity efekti ile görsel maskeleme
  - DynamicLineChart.vue masked chart — bulanık placeholder chart
  - SellerOrdersView.vue buyer_masked blur gösterimi
  - SellerOrdersView.vue amounts_masked tutar gizleme
  - Nginx config storefront ve admin-panel lokal frappe-nginx'e proxy
- feat(messaging): buyer messages + availability görünümleri, reservation/buyerMessages store'ları (@aliturguttursab)
  - BuyerMessagesView + AvailabilityView (messaging)
  - reservation ve buyerMessages Pinia store'ları
  - navigation/router girişleri + api util güncellemesi
- feat(kyc): admin panel KYC hızlı aksiyonlar ve form iyileştirmeleri (@aliiball)
  - KYC Verification için 4 hızlı aksiyon butonu eklendi (Doğrula, Reddet, Askıya Al, Yeniden İncele) — review_kyc backend endpoint'i entegre edildi
  - KYB Reddet modal'ı KYC ile paylaşımlı hale getirildi, KYB davranışı korundu
  - KYC Reddet modal'ında Re-submit/Suspended kategori seçimi zorunlu yapıldı
  - Textarea resize handle alt-ortaya taşındı (txResize plugin, MutationObserver ile sıfır template touch, tüm textarea'lar otomatik sarmalanır)
  - Yeni Duyuru ve Devir Talebi modal'larında textarea full-width yapıldı
  - Sidebar Rail 1 genişliği 96px'e ayarlandı
  - Sidebar 1 ve 2 font-weight +100 (TenantSwitcher, panel başlıkları, label'lar)
  - Lucide ikon adları yeni sürüm rename'lerine uyduruldu (grid 3x3, circle-check, triangle-alert, cloud-upload, square-check, file-exclamation-point)
  - Dashboard Banner ikonu image oldu (Header Duyuruları megaphone'dan ayrıldı)
  - KYC Doğrulama (Alıcı) ikonu id-card oldu (Satıcı Profilleri'nden ayrıldı)
- feat(rbac-ui): Faz A-H — Permission Console + master sync (@boraydeger32)
  - 7 commit fast-forward edildi
  - router/index.js: meta.module + doctype/route gating + sub-user whitelist
  - stores/navigation.js: dbSellerSections + hiddenDoctypes/Routes Set
  - stores/auth.js: login/logout sonrası navigation resetState (stale fix)
  - stores/permission.js: createRoleProfile + updateRoleProfile + delete + sync
  - Permission Console 10 tab orchestration (?tab= query persist)
  - components/system/CapabilityMatrixTab: matrix + filter + bulk grant
  - components/system/ModuleMatrixTab: 3-state cycle + protected modal
  - components/system/PermissionOverviewTab: 5 KPI + plan tutarsızlık bandı
  - components/system/RoleProfileEditModal: CRUD modal (template inheritance)
  - composables/usePermission: can/seesModule/moduleMode/isMasked/isHidden
  - views/permission/RolesTab: CRUD entegrasyonu (Yeni/Düzenle/Sil + confirm)
  - views/permission/AuditLogTab: 🔒 Maskeleme preset + masked chip
  - views/permission/PlansTab + UsersTab: detay panel
  - views/doctype/DocTypeFormView: maxWritablePermlevel computed (Owner IBAN)
  - common/AppIcon: Lucide v1+ alias map (CheckCircle→CircleCheck vs.)

---
## [v1.1.9-beta.14] - 2026-06-02 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(masking): rol bazlı dashboard ve sipariş veri maskeleme UI (@boraydeger32)
  - DynamicKpi.vue masked state desteği — masked_label gösterimi
  - KpiCard.vue masked prop — blur(6px) + opacity efekti ile görsel maskeleme
  - DynamicLineChart.vue masked chart — bulanık placeholder chart
  - SellerOrdersView.vue buyer_masked blur gösterimi
  - SellerOrdersView.vue amounts_masked tutar gizleme
  - Nginx config storefront ve admin-panel lokal frappe-nginx'e proxy
- feat(messaging): buyer messages + availability görünümleri, reservation/buyerMessages store'ları (@aliturguttursab)
  - BuyerMessagesView + AvailabilityView (messaging)
  - reservation ve buyerMessages Pinia store'ları
  - navigation/router girişleri + api util güncellemesi
- feat(kyc): admin panel KYC hızlı aksiyonlar ve form iyileştirmeleri (@aliiball)
  - KYC Verification için 4 hızlı aksiyon butonu eklendi (Doğrula, Reddet, Askıya Al, Yeniden İncele) — review_kyc backend endpoint'i entegre edildi
  - KYB Reddet modal'ı KYC ile paylaşımlı hale getirildi, KYB davranışı korundu
  - KYC Reddet modal'ında Re-submit/Suspended kategori seçimi zorunlu yapıldı
  - Textarea resize handle alt-ortaya taşındı (txResize plugin, MutationObserver ile sıfır template touch, tüm textarea'lar otomatik sarmalanır)
  - Yeni Duyuru ve Devir Talebi modal'larında textarea full-width yapıldı
  - Sidebar Rail 1 genişliği 96px'e ayarlandı
  - Sidebar 1 ve 2 font-weight +100 (TenantSwitcher, panel başlıkları, label'lar)
  - Lucide ikon adları yeni sürüm rename'lerine uyduruldu (grid 3x3, circle-check, triangle-alert, cloud-upload, square-check, file-exclamation-point)
  - Dashboard Banner ikonu image oldu (Header Duyuruları megaphone'dan ayrıldı)
  - KYC Doğrulama (Alıcı) ikonu id-card oldu (Satıcı Profilleri'nden ayrıldı)

---
## [v1.1.9-beta.13] - 2026-06-02 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(masking): rol bazlı dashboard ve sipariş veri maskeleme UI (@boraydeger32)
  - DynamicKpi.vue masked state desteği — masked_label gösterimi
  - KpiCard.vue masked prop — blur(6px) + opacity efekti ile görsel maskeleme
  - DynamicLineChart.vue masked chart — bulanık placeholder chart
  - SellerOrdersView.vue buyer_masked blur gösterimi
  - SellerOrdersView.vue amounts_masked tutar gizleme
  - Nginx config storefront ve admin-panel lokal frappe-nginx'e proxy
- feat(messaging): buyer messages + availability görünümleri, reservation/buyerMessages store'ları (@aliturguttursab)
  - BuyerMessagesView + AvailabilityView (messaging)
  - reservation ve buyerMessages Pinia store'ları
  - navigation/router girişleri + api util güncellemesi

---
## [v1.1.9-beta.12] - 2026-05-25 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(masking): rol bazlı dashboard ve sipariş veri maskeleme UI (@boraydeger32)
  - DynamicKpi.vue masked state desteği — masked_label gösterimi
  - KpiCard.vue masked prop — blur(6px) + opacity efekti ile görsel maskeleme
  - DynamicLineChart.vue masked chart — bulanık placeholder chart
  - SellerOrdersView.vue buyer_masked blur gösterimi
  - SellerOrdersView.vue amounts_masked tutar gizleme
  - Nginx config storefront ve admin-panel lokal frappe-nginx'e proxy

---
## [v1.1.9-rc.1] - 2026-05-25 RC

Bu surum rc.istoc.com/panel'de onay asamasindadir.

### Eklendi
- feat(changelog): v1.1.10-beta.1 için yeni özellikler eklendi (@ahmeetseker)
- feat(admin-panel): listeleme sayfalarına 4 farklı görünüm + akış iyileştirmeleri (@boraydeger32)
  - Tüm ürün/sipariş/destek/CRM listelerine 4 görünüm modu eklendi: Tablo, Kart, Kanban ve Liste. Kullanıcının seçtiği görünüm bir sonraki ziyarette de hatırlanıyor.
  - Kanban görünümünde kartlar artık kolonlar arası sürükle-bırak yapılabiliyor. Bir ürün "Onay Bekliyor"dan "Aktif"e taşındığında sistemde de durum otomatik güncelleniyor.
  - Ürün listesi düzenlendi: gereksiz "Listing Code" kolonu kaldırıldı, tablo artık ekrana sığıyor (yatay kaydırma yok), uzun başlıklar "..." ile kısaltılıyor.
  - Bir üründen geri çıkışta artık doğru listeye dönülüyor (admin Listing'e, satıcı kendi ürünlerine).
  - "Ürünlerim" sayfasında zaman zaman karşılaşılan boş ekran sorunu giderildi.
- feat(form-fields): DataMaskingField hassas alan widget'ı eklendi (@aliiball)
  - components/widgets/DataMaskingField.vue: tax_id, iban, generic mask modları
  - registry.js: User Profile (tax_id/iban/account_holder_name) + KYC Verification (tax_id) permlevel=1 alanları için renderer eşlemesi
- feat(seo): SEO Yönetimi modülü ve social proof ayarları eklendi (@ahmeetseker)
  - views/seo/ — URL Yönlendirmeleri, 404 Logları, Static Page SEO editor view'ları
  - stores/seoEditor.js + seoRedirects.js, utils/seoAnalyzer.js, turkishTextHelpers.js
  - components/seo/ paylaşılan SEO bileşenleri ve constants/seoDoctypeConfig.js
  - composables/useSlugCheck.js + useFileUpload.js eklendi
  - Social Proof Settings store + view (system bölümü altında)
  - navigation.js'e "SEO Yönetimi" section'ı, router/index.js'e SEO route'ları
  - ListingFormView SEO alanlarıyla refactor edildi
  - doctype tab-extensions yeni alanlara genişletildi
  - utils için ilk birim test seti (__tests__) eklendi
- feat(admin): yetki sistemi UI — permission console, B2B onay, compliance, (@boraydeger32)
  - /accept-invite — sub-user davet kabul akışı
  - /permission-console — Süper Admin yetki konsolu (4 tab)
  - /seller-team, /buyer-team — sub-user yönetimi
  - /approval-queue — B2B sipariş onay kuyruğu (L1/L2)
  - /authorization-simulator — yetki simülatörü (debug aracı)
  - /compliance/pii-mask-matrix — PII jurisdiction maskeleme matrisi
  - /procurement/cost-centers — cost center ağacı
  - /procurement/approved-suppliers — onaylı tedarikçi listesi
  - /compliance/anomaly-dashboard — anomali alert paneli
  - /delegation — yetki devri yönetimi
  - /owner-transfer — mağaza sahibi devri
  - auth/AcceptInviteView.vue
  - buyer/BuyerTeamManagementView.vue + buyer/procurement/* (cost center, approved suppliers)
  - orders/ApprovalQueueView.vue
  - permission/{AuditLogTab,PlansTab,RolesTab,UsersTab}.vue (Permission Console tab'ları)
  - seller/SubUserManagementView.vue
  - system/{AnomalyDashboard,AuthorizationSimulator,ComplianceMaskMatrix, DelegationManager,OwnerTransfer,PermissionConsole}View.vue
  - stores/permission.js (yeni) — Permission Console state.
  - stores/auth.js: yetki bayrakları + temporary role state.
  - stores/navigation.js + data/navigation.js: yeni rail section'ları (system tools, procurement, compliance, B2B team) ve role-bazlı görünürlük.
  - stores/tenant.js: tenant context iyileştirmeleri (delegation + owner transfer akışları için).
  - utils/api.js: helper'lar.
  - StorefrontLayoutEditor: layout state senkronizasyon iyileştirmesi.
  - SellerListingsView + SellerOrdersView: küçük UX düzeltmeleri.
- feat(bulk-import): toplu içe aktarma yönetim ekranları eklendi (@aliiball)
  - BulkProductImportView (yeni job başlatma)
  - BulkImportDetailView (job durumu, hata satırı, onay akışı)
  - BulkImportHistoryView (geçmiş job listesi)
  - XmlMappingView (XML → DocType field eşleştirme)
  - useBulkImport composable ile API entegrasyonu
  - Navigation + router girişleri
  - EcaRulesView / EcaRuleFormView / EcaRuleLogView / MyEcaRulesView
  - useEcaRule composable
  - FilterBuilder, SmartFieldDropdown, IconPickerField bileşenleri ECA condition builder için genişletildi
  - RegexPatternsView ve MyRegexPatternsView
  - useRegexPattern composable
  - src/lib/upload-ui/ (dropzone, uploader, file-list, facades)
  - ImagePickerUpload, MultiFileUpload, ProfileImageDropzone, SlotUpload bileşenleri
  - useDropzone, useImageUploadProgress(Map) composable'ları
  - ProductAddView kaldırıldı, ListingFormView ile birleştirildi
  - SellerListings (seller_sku kolonu), StorefrontEdit, MyCertifications, TicketDetailView, CategoryManagement, ListingModeration upload-ui'a taşındı
- feat(router): yetki yönetimi route'una super admin koruması ekle (@boraydeger32)
  - 'Yetki Yönetimi' route'una meta.section ve meta.requiresSuperAdmin alanları eklendi
  - ListingFormView ve SeoPagesView'da prettier formatlama düzeltmeleri
- feat: KVKK/GDPR uyumluluk navigasyonu ve tracking ayarları sayfası ekle (@ahmeetseker)

### Duzeltildi
- fix(release): son tag mantığını güncelleyerek boş guard sorununu çözüldü (@ahmeetseker)
- fix(doctype-list): user.seller_profile filter user.email'e taşındı (@aliiball)
  - DocTypeListView.vue:398 Seller Profile filter User Profile'a yönlendi (User Profile.name=email autoname)
  - ADMIN_ONLY_DOCTYPES + NO_CREATE_FOR_SELLER setleri Sprint 2 isimlerine güncellendi
  - LIVE BUG
- fix(admin): DataMaskingField TS parse hatası düzeltildi (@aliiball)
  - TS interface ve defineProps<T>() çağrıları object-prop syntax'ına çevrildi
  - console.info çağrısı no-console allow listesine uygun şekilde console.warn'a çevrildi
- fix(hooks): Regex Pattern Library dict'inde eksik brace düzeltildi (@aliiball)
  - doc_events["Regex Pattern Library"] iç dict'i `},` ile kapatılmamış, sonraki tüm doctype'lar bu dict'in içine gömülüyordu
  - permission_query_conditions parse hatası giderildi

### Degistirildi
- refactor(navigation): KYC + KYB ayrı 2 giriş + User Profile yönlendirmesi (@aliiball)
  - data/navigation.js: KYC Doğrulama (Alıcı) + KYB Doğrulama (Satıcı) ayrı menü item'ları
  - Satıcı/Alıcı Profilleri + Profilim → User Profile
  - SidePanel.vue SELLER_DIRECT_FORM Seller Profile → User Profile
- refactor(doctype): DocTypeFormView + tab-extensions Sprint 2 alan uyumu (@aliiball)
  - DocTypeFormView.vue + tab-extensions.js User Profile + Admin Seller Profile alan adı referansları güncellendi
- refactor(deps): origin/master merge conflict'i çözüldü, 1.1.9-beta.4 seçildi (@ahmeetseker)
- refactor(lint): kalan ESLint warning'leri sıfırlandı (@ahmeetseker)
  - LayoutSectionCard.vue defineProps → defineModel (Vue 3.5 pattern); 26 vue/no-mutating-props + 2 vue/no-side-effects-in-computed-properties giderildi
  - 30+ unused vars temizlendi: dead code silindi, catch (e) → catch {}, intentional discard'larda _ prefix
  - Debug console.log silindi veya console.warn'a çevrildi
  - v-html için Frappe backend sanitize gerekçeli eslint-disable + güvenlik yorumu eklendi (block disable multi-line için)
  - eslint.config.js: LayoutSectionCard.vue istisnası kaldırıldı; varsIgnorePattern + caughtErrorsIgnorePattern: '^_' eklendi

---
## [v1.1.9-beta.11] - 2026-05-25 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat: KVKK/GDPR uyumluluk navigasyonu ve tracking ayarları sayfası ekle (@ahmeetseker)

---
## [v1.1.9-beta.10] - 2026-05-25 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(admin): yetki sistemi UI — permission console, B2B onay, compliance, (@boraydeger32)
  - /accept-invite — sub-user davet kabul akışı
  - /permission-console — Süper Admin yetki konsolu (4 tab)
  - /seller-team, /buyer-team — sub-user yönetimi
  - /approval-queue — B2B sipariş onay kuyruğu (L1/L2)
  - /authorization-simulator — yetki simülatörü (debug aracı)
  - /compliance/pii-mask-matrix — PII jurisdiction maskeleme matrisi
  - /procurement/cost-centers — cost center ağacı
  - /procurement/approved-suppliers — onaylı tedarikçi listesi
  - /compliance/anomaly-dashboard — anomali alert paneli
  - /delegation — yetki devri yönetimi
  - /owner-transfer — mağaza sahibi devri
  - auth/AcceptInviteView.vue
  - buyer/BuyerTeamManagementView.vue + buyer/procurement/* (cost center, approved suppliers)
  - orders/ApprovalQueueView.vue
  - permission/{AuditLogTab,PlansTab,RolesTab,UsersTab}.vue (Permission Console tab'ları)
  - seller/SubUserManagementView.vue
  - system/{AnomalyDashboard,AuthorizationSimulator,ComplianceMaskMatrix, DelegationManager,OwnerTransfer,PermissionConsole}View.vue
  - stores/permission.js (yeni) — Permission Console state.
  - stores/auth.js: yetki bayrakları + temporary role state.
  - stores/navigation.js + data/navigation.js: yeni rail section'ları (system tools, procurement, compliance, B2B team) ve role-bazlı görünürlük.
  - stores/tenant.js: tenant context iyileştirmeleri (delegation + owner transfer akışları için).
  - utils/api.js: helper'lar.
  - StorefrontLayoutEditor: layout state senkronizasyon iyileştirmesi.
  - SellerListingsView + SellerOrdersView: küçük UX düzeltmeleri.
- feat(router): yetki yönetimi route'una super admin koruması ekle (@boraydeger32)
  - 'Yetki Yönetimi' route'una meta.section ve meta.requiresSuperAdmin alanları eklendi
  - ListingFormView ve SeoPagesView'da prettier formatlama düzeltmeleri

---
## [v1.1.9-beta.9] - 2026-05-22 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(bulk-import): toplu içe aktarma yönetim ekranları eklendi (@aliiball)
  - BulkProductImportView (yeni job başlatma)
  - BulkImportDetailView (job durumu, hata satırı, onay akışı)
  - BulkImportHistoryView (geçmiş job listesi)
  - XmlMappingView (XML → DocType field eşleştirme)
  - useBulkImport composable ile API entegrasyonu
  - Navigation + router girişleri
  - EcaRulesView / EcaRuleFormView / EcaRuleLogView / MyEcaRulesView
  - useEcaRule composable
  - FilterBuilder, SmartFieldDropdown, IconPickerField bileşenleri ECA condition builder için genişletildi
  - RegexPatternsView ve MyRegexPatternsView
  - useRegexPattern composable
  - src/lib/upload-ui/ (dropzone, uploader, file-list, facades)
  - ImagePickerUpload, MultiFileUpload, ProfileImageDropzone, SlotUpload bileşenleri
  - useDropzone, useImageUploadProgress(Map) composable'ları
  - ProductAddView kaldırıldı, ListingFormView ile birleştirildi
  - SellerListings (seller_sku kolonu), StorefrontEdit, MyCertifications, TicketDetailView, CategoryManagement, ListingModeration upload-ui'a taşındı

---
## [v1.1.9-beta.8] - 2026-05-22 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Duzeltildi
- fix(hooks): Regex Pattern Library dict'inde eksik brace düzeltildi (@aliiball)
  - doc_events["Regex Pattern Library"] iç dict'i `},` ile kapatılmamış, sonraki tüm doctype'lar bu dict'in içine gömülüyordu
  - permission_query_conditions parse hatası giderildi

---
## [v1.1.9-beta.7] - 2026-05-22 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(bulk-import): toplu içe aktarma yönetim ekranları eklendi (@aliiball)
  - BulkProductImportView (yeni job başlatma)
  - BulkImportDetailView (job durumu, hata satırı, onay akışı)
  - BulkImportHistoryView (geçmiş job listesi)
  - XmlMappingView (XML → DocType field eşleştirme)
  - useBulkImport composable ile API entegrasyonu
  - Navigation + router girişleri
  - EcaRulesView / EcaRuleFormView / EcaRuleLogView / MyEcaRulesView
  - useEcaRule composable
  - FilterBuilder, SmartFieldDropdown, IconPickerField bileşenleri ECA condition builder için genişletildi
  - RegexPatternsView ve MyRegexPatternsView
  - useRegexPattern composable
  - src/lib/upload-ui/ (dropzone, uploader, file-list, facades)
  - ImagePickerUpload, MultiFileUpload, ProfileImageDropzone, SlotUpload bileşenleri
  - useDropzone, useImageUploadProgress(Map) composable'ları
  - ProductAddView kaldırıldı, ListingFormView ile birleştirildi
  - SellerListings (seller_sku kolonu), StorefrontEdit, MyCertifications, TicketDetailView, CategoryManagement, ListingModeration upload-ui'a taşındı

---
## [v1.1.9-beta.6] - 2026-05-22 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(seo): SEO Yönetimi modülü ve social proof ayarları eklendi (@ahmeetseker)
  - views/seo/ — URL Yönlendirmeleri, 404 Logları, Static Page SEO editor view'ları
  - stores/seoEditor.js + seoRedirects.js, utils/seoAnalyzer.js, turkishTextHelpers.js
  - components/seo/ paylaşılan SEO bileşenleri ve constants/seoDoctypeConfig.js
  - composables/useSlugCheck.js + useFileUpload.js eklendi
  - Social Proof Settings store + view (system bölümü altında)
  - navigation.js'e "SEO Yönetimi" section'ı, router/index.js'e SEO route'ları
  - ListingFormView SEO alanlarıyla refactor edildi
  - doctype tab-extensions yeni alanlara genişletildi
  - utils için ilk birim test seti (__tests__) eklendi

---
## [v1.1.9-beta.5] - 2026-05-18 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(admin-panel): listeleme sayfalarına 4 farklı görünüm + akış iyileştirmeleri (@boraydeger32)
  - Tüm ürün/sipariş/destek/CRM listelerine 4 görünüm modu eklendi: Tablo, Kart, Kanban ve Liste. Kullanıcının seçtiği görünüm bir sonraki ziyarette de hatırlanıyor.
  - Kanban görünümünde kartlar artık kolonlar arası sürükle-bırak yapılabiliyor. Bir ürün "Onay Bekliyor"dan "Aktif"e taşındığında sistemde de durum otomatik güncelleniyor.
  - Ürün listesi düzenlendi: gereksiz "Listing Code" kolonu kaldırıldı, tablo artık ekrana sığıyor (yatay kaydırma yok), uzun başlıklar "..." ile kısaltılıyor.
  - Bir üründen geri çıkışta artık doğru listeye dönülüyor (admin Listing'e, satıcı kendi ürünlerine).
  - "Ürünlerim" sayfasında zaman zaman karşılaşılan boş ekran sorunu giderildi.

### Degistirildi
- refactor(deps): origin/master merge conflict'i çözüldü, 1.1.9-beta.4 seçildi (@ahmeetseker)
- refactor(lint): kalan ESLint warning'leri sıfırlandı (@ahmeetseker)
  - LayoutSectionCard.vue defineProps → defineModel (Vue 3.5 pattern); 26 vue/no-mutating-props + 2 vue/no-side-effects-in-computed-properties giderildi
  - 30+ unused vars temizlendi: dead code silindi, catch (e) → catch {}, intentional discard'larda _ prefix
  - Debug console.log silindi veya console.warn'a çevrildi
  - v-html için Frappe backend sanitize gerekçeli eslint-disable + güvenlik yorumu eklendi (block disable multi-line için)
  - eslint.config.js: LayoutSectionCard.vue istisnası kaldırıldı; varsIgnorePattern + caughtErrorsIgnorePattern: '^_' eklendi

---
## [v1.1.9-beta.4] - 2026-05-18 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(form-fields): DataMaskingField hassas alan widget'ı eklendi (@aliiball)
  - components/widgets/DataMaskingField.vue: tax_id, iban, generic mask modları
  - registry.js: User Profile (tax_id/iban/account_holder_name) + KYC Verification (tax_id) permlevel=1 alanları için renderer eşlemesi

### Duzeltildi
- fix(doctype-list): user.seller_profile filter user.email'e taşındı (@aliiball)
  - DocTypeListView.vue:398 Seller Profile filter User Profile'a yönlendi (User Profile.name=email autoname)
  - ADMIN_ONLY_DOCTYPES + NO_CREATE_FOR_SELLER setleri Sprint 2 isimlerine güncellendi
  - LIVE BUG
- fix(admin): DataMaskingField TS parse hatası düzeltildi (@aliiball)
  - TS interface ve defineProps<T>() çağrıları object-prop syntax'ına çevrildi
  - console.info çağrısı no-console allow listesine uygun şekilde console.warn'a çevrildi

### Degistirildi
- refactor(navigation): KYC + KYB ayrı 2 giriş + User Profile yönlendirmesi (@aliiball)
  - data/navigation.js: KYC Doğrulama (Alıcı) + KYB Doğrulama (Satıcı) ayrı menü item'ları
  - Satıcı/Alıcı Profilleri + Profilim → User Profile
  - SidePanel.vue SELLER_DIRECT_FORM Seller Profile → User Profile
- refactor(doctype): DocTypeFormView + tab-extensions Sprint 2 alan uyumu (@aliiball)
  - DocTypeFormView.vue + tab-extensions.js User Profile + Admin Seller Profile alan adı referansları güncellendi

---
## [v1.1.9-beta.2] - 2026-05-15 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(admin-panel): listeleme sayfalarına 4 farklı görünüm + akış iyileştirmeleri (@boraydeger32)
  - Tüm ürün/sipariş/destek/CRM listelerine 4 görünüm modu eklendi: Tablo, Kart, Kanban ve Liste. Kullanıcının seçtiği görünüm bir sonraki ziyarette de hatırlanıyor.
  - Kanban görünümünde kartlar artık kolonlar arası sürükle-bırak yapılabiliyor. Bir ürün "Onay Bekliyor"dan "Aktif"e taşındığında sistemde de durum otomatik güncelleniyor.
  - Ürün listesi düzenlendi: gereksiz "Listing Code" kolonu kaldırıldı, tablo artık ekrana sığıyor (yatay kaydırma yok), uzun başlıklar "..." ile kısaltılıyor.
  - Bir üründen geri çıkışta artık doğru listeye dönülüyor (admin Listing'e, satıcı kendi ürünlerine).
  - "Ürünlerim" sayfasında zaman zaman karşılaşılan boş ekran sorunu giderildi.

---
## [v1.1.9-beta.1] - 2026-05-15 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(changelog): v1.1.10-beta.1 için yeni özellikler eklendi (@ahmeetseker)

### Duzeltildi
- fix(release): son tag mantığını güncelleyerek boş guard sorununu çözüldü (@ahmeetseker)

---
## [v1.1.10-beta.1] - 2026-05-15 BETA

> Geriye dönük belgeleme — daha önce CHANGELOG'a girmemiş admin/seller panel feature'larının kapsamı. Tüm girişler ilk ekleme commit'ine göre yazarlandırılmıştır.

### Eklendi
- feat(rfq): RFQ liste + detay view'ları, alıcı talep yönetimi (`views/sales/RfqList.vue`, `views/sales/RfqDetail.vue`) (@ahmeetseker)
- feat(quotes): My Quotes liste — satıcının verdiği teklifleri takip ekranı (`views/sales/MyQuotesList.vue`) (@aliiball)
- feat(kpi): KPI Template (list + detail) + Seller KPI (list + detail) + Seller Metrics (list + detail) + Seller Score (list + detail) — toplam 8 KPI/skor view'ı, satıcı performans yönetim modülü (@ahmeetseker)
- feat(storefront): StorefrontEdit — satıcı mağaza sayfası temel düzenleme arayüzü (`views/seller/StorefrontEdit.vue`) (@ahmeetseker)
- feat(storefront): StorefrontLayoutEditor — mağaza sayfası bölüm bazlı layout düzenleme arayüzü (`views/seller/StorefrontLayoutEditor.vue`) (@ahmeetseker)
- feat(seller): Satıcı yönetim modülü — 18 view kapsam (listings, listing form, listing review moderation, seller categories, seller orders, seller questions, certifications, suggest certification, KPI/metrics/score ekranları, storefront edit/layout) (@ahmeetseker)
- feat(dashboard): 10 dashboard view'ı (`views/dashboard/`) — PlatformOverview, SellersDashboard, CatalogDashboard, OrdersDashboard, PaymentsDashboard, MarketingDashboard, LogisticsDashboard, ComplianceDashboard + DynamicDashboard ve SellerOverview (dinamik widget render) (@ahmeetseker, @aliiball)
- feat(ui): 57 component'lik UI primitive kütüphanesi — common/ (GlobalSearch, ConfirmDialog, StatusFilterPills, ListPagination, ChildTable, LinkInput, AppIcon, ViewModeToggle), layout/ (AppHeader, AppFooter, AppBreadcrumb, IconRail, SidePanel, NotificationPanel, ToastContainer), navigation/ (TenantSwitcher, UserMenuDropdown, QuickLinksDropdown), form-fields/ (FilterBuilder, SmartFieldDropdown, ColorPresetField, IconPickerField, WidgetPreview, CoreDocTypePicker) ve admin/crm/dashboard/seller/system alt-klasörleri (@ahmeetseker)

---
## [v1.1.9] - 2026-05-15 PROD

Bu surum canliya alindi. v1.1.8 PROD'dan bu yana beta + RC asamasinda test edilen tum feat/fix dahildir.

### Eklendi
- feat(seller): kategori navigasyon temizliği + generic status filtre pill'leri + bildirim action_url (@boraydeger32)
  - Satıcı sidebar'ında duplicate "Kategorilerim" linki kaldırıldı (Mağazam → Müşteri & Sosyal). Ürünler altındaki /seller-categories tek seller kategori yönetim sayfası; /app/Seller Category satıcıya açık değil.
  - Satıcı /app/Seller Category[/<name>] URL'ine doğrudan erişirse /dashboard'a redirect (ADMIN_ONLY_DOCTYPES — DocTypeListView + DocTypeFormView).
  - DocTypeListView'da status select dropdown → StatusFilterPills. Markalar, Ürün Tipleri, Ürün Aileleri vb. status alanı olan tüm doctype list sayfalarında Ürünlerim'deki hızlı filtre butonları görünüyor; status meta'sından Türkçe label + renkli dot map'leniyor.
  - NotificationPanel.vue: dar prefix whitelist (/seller/, /dashboard, /seller-) yerine tüm relative path'leri admin-panel route olarak push ediyor. tradehub_core'daki action_url düzeltmeleriyle (Seller Category, Listing/Seller Review, Seller Application) birlikte bildirim tıklamaları artık doğru sayfaya gidiyor; eskiden /login'e düşüyordu.
- feat(header-notice): 9 değişiklik ekledi ve düzeltmeler yaptı (@ahmeetseker)
- feat(admin): review moderasyon + Q&A yönetim sayfaları + Sprint 1 (@boraydeger32)
- Status tab'ları: Pending / Approved / Rejected / Hidden / Tümü (count badge'leri ile) (@boraydeger32)
- Aksiyonlar: Approve / Reject / Hide / Unhide / Delete (ConfirmDialog Vue component'i ile native confirm() yerine) (@boraydeger32)
- Şikayet detay accordion: kim / neden / not / tarih + "Geçersiz Say" (admin_dismiss_abuse_report) (@boraydeger32)
- Search & filter bar (Sprint 1 #11): · Search (title VEYA body, 350ms debounce, X clear butonu) · Reviewer e-posta filter · Min rating dropdown (5 / 4+ / 3+ / 2+ / 1+) · "Sıfırla" butonu (sadece filter aktifken görünür) · Mobile-first: flex-col sm:flex-row, dark mode kontrast (@boraydeger32)
- Pagination (page_size 20, max 100) (@boraydeger32)
- Empty state ("Bu durumda yorum bulunamadı") (@boraydeger32)
- Tab semantic: Tümü / Bekleyenler / Yanıtladıklarım (@boraydeger32)
- Inline soru yanıtlama (submit_question_answer) (@boraydeger32)
- Çöp ikonu (sağ üst): dismiss_question_from_seller_panel — storefront'ta görünür kalır, sadece kendi panelinden gizler (@boraydeger32)
- has_my_answer badge (@boraydeger32)
- adminPanelSections + sellerPanelSections: "Satıcı Yorumları" → "Yorum Moderasyonu", "Sorularım" → "Sorularım/Satıcı Soruları" (@boraydeger32)
- Eski doctype-based linkler route-based'e geçti (@boraydeger32)
- Yeni route'lar: /review-moderation, /seller-questions (her ikisi de lazy-loaded, requiresAuth, section: "store") (@boraydeger32)
- HeaderNoticesView.vue: lint-fix.sh / Prettier reformat (saf format değişikliği, 168 insert / 168 delete) (@boraydeger32)
- feat(header-notice): 7 değişiklik (@ahmeetseker)
  - add useHeaderNotices composable
  - add admin panel preview component
  - add admin panel edit modal
  - add admin panel notice row component
  - add admin panel HeaderNoticesView
  - add admin panel route and sidebar menu item
  - add display mode selector + background color picker
- feat(api): yeni kullanıcı kayıt endpoint'i eklendi (@ahmeetseker)

### Duzeltildi
- fix(ci): release workflow printf format string bug (@boraydeger32)
- fix(security): DocTypeFormView RCE engellendi + GlobalSearch XSS + dark mode label kontrastı (@boraydeger32)
  - DocTypeFormView.vue `evaluateDependsOn` artık `new Function("doc", code)` ile arbitrary JS yürütmez; backend doctype meta'sından gelen ifade `utils/safeDependsOn.js` içindeki AST-based recursive descent parser'a yönlendirildi. İzinli gramer: `doc.<fieldname>`, string/number/bool literal, `[...].includes(doc.x)`, comparison/logical/negation/paren. Function call (.includes hariç), member access zinciri, computed access, template literal, arithmetic — hepsi reddedilir. Geçersiz ifade fail-open=true döner (alan görünür kalır). RCE 14 farklı vektör (constructor zinciri, __proto__, fetch, eval, Function ref, computed access vb.) ile test edildi; Frappe'nin yaygın `[...].includes()` pattern'i ayrıca 6 case ile doğrulandı.
  - GlobalSearch.vue `highlight()` doctype label'ını ham `v-html` ile basıyordu; backend kontrollü `item.label` içinde `<img src=x onerror=...>` admin oturumunu çalabilirdi. Artık her parça `escapeHtml` ile sarılıp aralarına `<mark>` wrap ediliyor. 5 farklı XSS payload'ı (img/script/svg/a-javascript: + no-query) Node test'iyle doğrulandı.
  - assets/scss/forms.scss `.form-label` dark mode'da `$l-text-700` (#374151) kullanıyordu — `$d-bg` (#0f0f14) üzerinde ~2:1 kontrast WCAG AA (≥4.5:1) altındaydı. `$d-text` (#e8e8f0) override ile kontrast ~15:1 (AAA). DocType form etiketleri (Applicant User, Member ID, Status) artık tüm formlarda okunabilir.
- fix(release-workflows): commit body bullet'larını subject altında nested göster (@ahmeetseker)
- fix(release-workflows): commit body bullet'larini CHANGELOG'a dahil et (@ahmeetseker)
- fix(release): commit mesajındaki boşlukları temizledi (@ahmeetseker)
- fix(header-notice): 9 değişiklik (@ahmeetseker)
  - dark mode support via SCSS tokens and @include dark mixin
  - improve dark mode input contrast and remove icon picker
  - use admin standard hdr-btn classes and brand color
  - give empty state cards visible border + shadow
  - replace semantic header/footer tags with div in page+modal
  - remove conflicting :value from color input
  - use frappe.client singleton methods for display_mode
  - admin preview reflects selected mode regardless of count
  - Duyuru gösterim modu için "Kaydet" butonu eklendi

---
## [v1.1.8-rc.1] - 2026-05-15 RC

Bu surum onay asamasindadir. v1.1.8 PROD'dan bu yana beta tag'lerinde test edilen tum feat/fix bu RC entry'sinde toplanmistir.

### Eklendi
- feat(seller): kategori navigasyon temizliği + generic status filtre pill'leri + bildirim action_url (@boraydeger32)
  - Satıcı sidebar'ında duplicate "Kategorilerim" linki kaldırıldı (Mağazam → Müşteri & Sosyal). Ürünler altındaki /seller-categories tek seller kategori yönetim sayfası; /app/Seller Category satıcıya açık değil.
  - Satıcı /app/Seller Category[/<name>] URL'ine doğrudan erişirse /dashboard'a redirect (ADMIN_ONLY_DOCTYPES — DocTypeListView + DocTypeFormView).
  - DocTypeListView'da status select dropdown → StatusFilterPills. Markalar, Ürün Tipleri, Ürün Aileleri vb. status alanı olan tüm doctype list sayfalarında Ürünlerim'deki hızlı filtre butonları görünüyor; status meta'sından Türkçe label + renkli dot map'leniyor.
  - NotificationPanel.vue: dar prefix whitelist (/seller/, /dashboard, /seller-) yerine tüm relative path'leri admin-panel route olarak push ediyor. tradehub_core'daki action_url düzeltmeleriyle (Seller Category, Listing/Seller Review, Seller Application) birlikte bildirim tıklamaları artık doğru sayfaya gidiyor; eskiden /login'e düşüyordu.
- feat(header-notice): 9 değişiklik ekledi ve düzeltmeler yaptı (@ahmeetseker)
- feat(admin): review moderasyon + Q&A yönetim sayfaları + Sprint 1 (@boraydeger32)
- Status tab'ları: Pending / Approved / Rejected / Hidden / Tümü (count badge'leri ile) (@boraydeger32)
- Aksiyonlar: Approve / Reject / Hide / Unhide / Delete (ConfirmDialog Vue component'i ile native confirm() yerine) (@boraydeger32)
- Şikayet detay accordion: kim / neden / not / tarih + "Geçersiz Say" (admin_dismiss_abuse_report) (@boraydeger32)
- Search & filter bar (Sprint 1 #11): · Search (title VEYA body, 350ms debounce, X clear butonu) · Reviewer e-posta filter · Min rating dropdown (5 / 4+ / 3+ / 2+ / 1+) · "Sıfırla" butonu (sadece filter aktifken görünür) · Mobile-first: flex-col sm:flex-row, dark mode kontrast (@boraydeger32)
- Pagination (page_size 20, max 100) (@boraydeger32)
- Empty state ("Bu durumda yorum bulunamadı") (@boraydeger32)
- Tab semantic: Tümü / Bekleyenler / Yanıtladıklarım (@boraydeger32)
- Inline soru yanıtlama (submit_question_answer) (@boraydeger32)
- Çöp ikonu (sağ üst): dismiss_question_from_seller_panel — storefront'ta görünür kalır, sadece kendi panelinden gizler (@boraydeger32)
- has_my_answer badge (@boraydeger32)
- adminPanelSections + sellerPanelSections: "Satıcı Yorumları" → "Yorum Moderasyonu", "Sorularım" → "Sorularım/Satıcı Soruları" (@boraydeger32)
- Eski doctype-based linkler route-based'e geçti (@boraydeger32)
- Yeni route'lar: /review-moderation, /seller-questions (her ikisi de lazy-loaded, requiresAuth, section: "store") (@boraydeger32)
- HeaderNoticesView.vue: lint-fix.sh / Prettier reformat (saf format değişikliği, 168 insert / 168 delete) (@boraydeger32)
- feat(header-notice): 7 değişiklik (@ahmeetseker)
  - add useHeaderNotices composable
  - add admin panel preview component
  - add admin panel edit modal
  - add admin panel notice row component
  - add admin panel HeaderNoticesView
  - add admin panel route and sidebar menu item
  - add display mode selector + background color picker
- feat(api): yeni kullanıcı kayıt endpoint'i eklendi (@ahmeetseker)

### Duzeltildi
- fix(ci): release workflow printf format string bug (@boraydeger32)
- fix(security): DocTypeFormView RCE engellendi + GlobalSearch XSS + dark mode label kontrastı (@boraydeger32)
  - DocTypeFormView.vue `evaluateDependsOn` artık `new Function("doc", code)` ile arbitrary JS yürütmez; backend doctype meta'sından gelen ifade `utils/safeDependsOn.js` içindeki AST-based recursive descent parser'a yönlendirildi. İzinli gramer: `doc.<fieldname>`, string/number/bool literal, `[...].includes(doc.x)`, comparison/logical/negation/paren. Function call (.includes hariç), member access zinciri, computed access, template literal, arithmetic — hepsi reddedilir. Geçersiz ifade fail-open=true döner (alan görünür kalır). RCE 14 farklı vektör (constructor zinciri, __proto__, fetch, eval, Function ref, computed access vb.) ile test edildi; Frappe'nin yaygın `[...].includes()` pattern'i ayrıca 6 case ile doğrulandı.
  - GlobalSearch.vue `highlight()` doctype label'ını ham `v-html` ile basıyordu; backend kontrollü `item.label` içinde `<img src=x onerror=...>` admin oturumunu çalabilirdi. Artık her parça `escapeHtml` ile sarılıp aralarına `<mark>` wrap ediliyor. 5 farklı XSS payload'ı (img/script/svg/a-javascript: + no-query) Node test'iyle doğrulandı.
  - assets/scss/forms.scss `.form-label` dark mode'da `$l-text-700` (#374151) kullanıyordu — `$d-bg` (#0f0f14) üzerinde ~2:1 kontrast WCAG AA (≥4.5:1) altındaydı. `$d-text` (#e8e8f0) override ile kontrast ~15:1 (AAA). DocType form etiketleri (Applicant User, Member ID, Status) artık tüm formlarda okunabilir.
- fix(release-workflows): commit body bullet'larını subject altında nested göster (@ahmeetseker)
- fix(release-workflows): commit body bullet'larini CHANGELOG'a dahil et (@ahmeetseker)
- fix(release): commit mesajındaki boşlukları temizledi (@ahmeetseker)
- fix(header-notice): 9 değişiklik (@ahmeetseker)
  - dark mode support via SCSS tokens and @include dark mixin
  - improve dark mode input contrast and remove icon picker
  - use admin standard hdr-btn classes and brand color
  - give empty state cards visible border + shadow
  - replace semantic header/footer tags with div in page+modal
  - remove conflicting :value from color input
  - use frappe.client singleton methods for display_mode
  - admin preview reflects selected mode regardless of count
  - Duyuru gösterim modu için "Kaydet" butonu eklendi
## [v1.1.8-beta.16] - 2026-05-15 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Duzeltildi
- fix(api): oturum süresi dolmuş hatası için kontrol eklendi (@ahmeetseker)

---
## [v1.1.8-beta.15] - 2026-05-14 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Duzeltildi
- fix(ci): release workflow printf format string bug (@boraydeger32)

---
## [v1.1.8-beta.14] - 2026-05-14 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Duzeltildi
- fix(security): DocTypeFormView RCE engellendi + GlobalSearch XSS + dark mode label kontrastı (@boraydeger32)
  - DocTypeFormView.vue `evaluateDependsOn` artık `new Function("doc", code)` ile arbitrary JS yürütmez; backend doctype meta'sından gelen ifade `utils/safeDependsOn.js` içindeki AST-based recursive descent parser'a yönlendirildi. İzinli gramer: `doc.<fieldname>`, string/number/bool literal, `[...].includes(doc.x)`, comparison/logical/negation/paren. Function call (.includes hariç), member access zinciri, computed access, template literal, arithmetic — hepsi reddedilir. Geçersiz ifade fail-open=true döner (alan görünür kalır). RCE 14 farklı vektör (constructor zinciri, __proto__, fetch, eval, Function ref, computed access vb.) ile test edildi; Frappe'nin yaygın `[...].includes()` pattern'i ayrıca 6 case ile doğrulandı.
  - GlobalSearch.vue `highlight()` doctype label'ını ham `v-html` ile basıyordu; backend kontrollü `item.label` içinde `<img src=x onerror=...>` admin oturumunu çalabilirdi. Artık her parça `escapeHtml` ile sarılıp aralarına `<mark>` wrap ediliyor. 5 farklı XSS payload'ı (img/script/svg/a-javascript: + no-query) Node test'iyle doğrulandı.
  - assets/scss/forms.scss `.form-label` dark mode'da `$l-text-700` (#374151) kullanıyordu — `$d-bg` (#0f0f14) üzerinde ~2:1 kontrast WCAG AA (≥4.5:1) altındaydı. `$d-text` (#e8e8f0) override ile kontrast ~15:1 (AAA). DocType form etiketleri (Applicant User, Member ID, Status) artık tüm formlarda okunabilir.

---
## [v1.1.8-beta.12] - 2026-05-14 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(seller): kategori navigasyon temizliği + generic status filtre pill'leri + bildirim action_url (@boraydeger32)
  - Satıcı sidebar'ında duplicate "Kategorilerim" linki kaldırıldı (Mağazam → Müşteri & Sosyal). Ürünler altındaki /seller-categories tek seller kategori yönetim sayfası; /app/Seller Category satıcıya açık değil.
  - Satıcı /app/Seller Category[/<name>] URL'ine doğrudan erişirse /dashboard'a redirect (ADMIN_ONLY_DOCTYPES — DocTypeListView + DocTypeFormView).
  - DocTypeListView'da status select dropdown → StatusFilterPills. Markalar, Ürün Tipleri, Ürün Aileleri vb. status alanı olan tüm doctype list sayfalarında Ürünlerim'deki hızlı filtre butonları görünüyor; status meta'sından Türkçe label + renkli dot map'leniyor.
  - NotificationPanel.vue: dar prefix whitelist (/seller/, /dashboard, /seller-) yerine tüm relative path'leri admin-panel route olarak push ediyor. tradehub_core'daki action_url düzeltmeleriyle (Seller Category, Listing/Seller Review, Seller Application) birlikte bildirim tıklamaları artık doğru sayfaya gidiyor; eskiden /login'e düşüyordu.

---
## [v1.1.8-beta.10] - 2026-05-13 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(seller): kategori navigasyon temizliği + generic status filtre pill'leri + bildirim action_url (@boraydeger32)
  - Satıcı sidebar'ında duplicate "Kategorilerim" linki kaldırıldı (Mağazam → Müşteri & Sosyal). Ürünler altındaki /seller-categories tek seller kategori yönetim sayfası; /app/Seller Category satıcıya açık değil.
  - Satıcı /app/Seller Category[/<name>] URL'ine doğrudan erişirse /dashboard'a redirect (ADMIN_ONLY_DOCTYPES — DocTypeListView + DocTypeFormView).
  - DocTypeListView'da status select dropdown → StatusFilterPills. Markalar, Ürün Tipleri, Ürün Aileleri vb. status alanı olan tüm doctype list sayfalarında Ürünlerim'deki hızlı filtre butonları görünüyor; status meta'sından Türkçe label + renkli dot map'leniyor.
  - NotificationPanel.vue: dar prefix whitelist (/seller/, /dashboard, /seller-) yerine tüm relative path'leri admin-panel route olarak push ediyor. tradehub_core'daki action_url düzeltmeleriyle (Seller Category, Listing/Seller Review, Seller Application) birlikte bildirim tıklamaları artık doğru sayfaya gidiyor; eskiden /login'e düşüyordu.

---
## [v1.1.8-beta.9] - 2026-05-13 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(header-notice): 9 değişiklik ekledi ve düzeltmeler yaptı (@ahmeetseker)

### Duzeltildi
- fix(release-workflows): commit body bullet'larını subject altında nested göster (@ahmeetseker)

---
## [v1.1.8-beta.8] - 2026-05-12 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(admin): review moderasyon + Q&A yönetim sayfaları + Sprint 1 (@boraydeger32)
- Status tab'ları: Pending / Approved / Rejected / Hidden / Tümü (count badge'leri ile) (@boraydeger32)
- Aksiyonlar: Approve / Reject / Hide / Unhide / Delete (ConfirmDialog Vue component'i ile native confirm() yerine) (@boraydeger32)
- Şikayet detay accordion: kim / neden / not / tarih + "Geçersiz Say" (admin_dismiss_abuse_report) (@boraydeger32)
- Search & filter bar (Sprint 1 #11): · Search (title VEYA body, 350ms debounce, X clear butonu) · Reviewer e-posta filter · Min rating dropdown (5 / 4+ / 3+ / 2+ / 1+) · "Sıfırla" butonu (sadece filter aktifken görünür) · Mobile-first: flex-col sm:flex-row, dark mode kontrast (@boraydeger32)
- Pagination (page_size 20, max 100) (@boraydeger32)
- Empty state ("Bu durumda yorum bulunamadı") (@boraydeger32)
- Tab semantic: Tümü / Bekleyenler / Yanıtladıklarım (@boraydeger32)
- Inline soru yanıtlama (submit_question_answer) (@boraydeger32)
- Çöp ikonu (sağ üst): dismiss_question_from_seller_panel — storefront'ta görünür kalır, sadece kendi panelinden gizler (@boraydeger32)
- has_my_answer badge (@boraydeger32)
- adminPanelSections + sellerPanelSections: "Satıcı Yorumları" → "Yorum Moderasyonu", "Sorularım" → "Sorularım/Satıcı Soruları" (@boraydeger32)
- Eski doctype-based linkler route-based'e geçti (@boraydeger32)
- Yeni route'lar: /review-moderation, /seller-questions (her ikisi de lazy-loaded, requiresAuth, section: "store") (@boraydeger32)
- HeaderNoticesView.vue: lint-fix.sh / Prettier reformat (saf format değişikliği, 168 insert / 168 delete) (@boraydeger32)

### Duzeltildi
- fix(release-workflows): commit body bullet'larini CHANGELOG'a dahil et (@ahmeetseker)

---
## [v1.1.8-beta.7] - 2026-05-12 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Duzeltildi
- fix(release): commit mesajındaki boşlukları temizledi (@ahmeetseker)

---
## [v1.1.8-beta.3] - 2026-05-11 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(header-notice): 7 değişiklik (@ahmeetseker)
  - add useHeaderNotices composable
  - add admin panel preview component
  - add admin panel edit modal
  - add admin panel notice row component
  - add admin panel HeaderNoticesView
  - add admin panel route and sidebar menu item
  - add display mode selector + background color picker

### Duzeltildi
- fix(header-notice): 9 değişiklik (@ahmeetseker)
  - dark mode support via SCSS tokens and @include dark mixin
  - improve dark mode input contrast and remove icon picker
  - use admin standard hdr-btn classes and brand color
  - give empty state cards visible border + shadow
  - replace semantic header/footer tags with div in page+modal
  - remove conflicting :value from color input
  - use frappe.client singleton methods for display_mode
  - admin preview reflects selected mode regardless of count
  - Duyuru gösterim modu için "Kaydet" butonu eklendi

---

## [v1.1.8-beta.1] - 2026-05-08 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(api): yeni kullanıcı kayıt endpoint'i eklendi (@ahmeetseker)

---

## [v1.1.7-beta.8] - 2026-05-08 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(seller-trust): "Onaylanmış Satıcı" rozetini KYB Verified ile birleştir + 3-katmanlı sipariş gate (@aliiball)

## [v1.1.7-beta.7] - 2026-05-08 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Degistirildi
- refactor: rename close_date to closed_date and lead_source to source_name in CRM stores and components (@ahmeetseker)

---

## [v1.1.7-beta.6] - 2026-05-07 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Duzeltildi
- fix(nginx): parametrize backend domain via envsubst template (@ahmeetseker)

## [v1.1.7-beta.5] - 2026-05-06 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat(doctype-form,profile): KYB review/preview/reject modal + Column Break grid + permlevel filtre; rail avatar upload (@aliiball)

## [v1.1.7-beta.4] - 2026-05-06 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Degistirildi
- refactor: condense UI code, optimize linting workflow with concurrency control, and clean up store logic (@ahmeetseker)

---

## [v1.1.7-beta.3] - 2026-05-06 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat: route CRM doctype count requests to permission-aware tradehub_core endpoint (@ahmeetseker)

---

## [v1.1.5] - 2026-04-29 PROD

Bu surum istoc.com'da yayindadir.

### Eklendi
- feat(helpdesk): yönetim ekranları + bulk actions + Seller CRM modülü   Body:   - TicketsList: 4 KPI kartı, ?tab/?scope URL desteği, bulk action toolbar,     Görünümler dropdown (saved filters)   - TicketDetail: şablon dropdown (canned response), ilişkili kayıtlar paneli,     renkli etiket chip'leri   - Yeni yönetim ekranları: Talep Tipleri, Ajanlar, Ekipler, Hazır Yanıtlar,     Mağaza Soruları (liste + detay)   - Sidebar: Helpdesk → Yapılandırma alt menüsü + Mağaza Soruları   - Seller CRM rail (Anlaşmalar, Lead'ler, Görevler, Notlar, Aramalar,     Kişiler, Kurumlar) + Mağaza Sorusu → CRM Lead dönüşüm butonu (@ahmeetseker)
- feat(crm): tam CRM modulu - dashboard, deals, tasks, notes, calls, contacts, organizations +   ayarlar (@ahmeetseker)

### Duzeltildi
- fix(notifications): action_url routing iyileştirildi ve /panel/ prefix desteği eklendi   - NotificationPanel.vue & NotificationsView.vue: action_url "/panel/" ile     başlıyorsa prefix çıkarılarak router.push yapılır   - /seller/, /seller-, /dashboard prefiksleri için internal routing korundu   - Early return ile n.action_url boş ise no-op; okunabilirlik artırıldı. (@ahmeetseker)

## [v1.1.4-rc.20] - 2026-04-29 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(helpdesk): yönetim ekranları + bulk actions + Seller CRM modülü (@ahmeetseker)

## [v1.1.4-rc.18] - 2026-04-22 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: add image upload functionality for categories and implement delete confirmation (@boraydeger32)

## [v1.1.4-rc.17] - 2026-04-21 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(helpdesk): 12 değişiklik (@ahmeetseker)
  - TicketsList üstüne 4 KPI kartı (Açık / Yanıtlandı / Bana Atanan Açık / Son 7 Gün Çözülen) — tıklanınca filtre uygular
  - TicketsList ?tab= ve ?scope= URL paramı destegi — dashboard widget linklerinden doğrudan filtreli açılış
  - Talep Tipleri yönetim ekranı (HD Ticket Type CRUD modal)
  - Ajan yönetim ekranı (HD Agent CRUD + aktif/pasif toggle)
  - Ekip yönetim ekranı (HD Team + üye ekleme/çıkarma modal)
  - Hazır Yanıtlar yönetim ekranı (Helpdesk Canned Response CRUD, kategori + scope)
  - TicketDetail composer'a "Şablon" dropdown — placeholder substitution ile şablon ekleme
  - TicketsList bulk action toolbar (toplu durum/öncelik/kapama, çoklu seçim ile)
  - Mağaza Soruları yönetim ekranı (Seller Inquiry liste + detay + cevapla)
  - TicketDetail sidebar'da İlişkili Kayıtlar paneli (related_order/rfq/listing)
  - TicketDetail sidebar'da renkli etiket chip'leri + ekleme/çıkarma
  - TicketsList Görünümler dropdown — kişisel + ekiple paylaşılan saved filter'lar, sabitleme + silme
- feat(navigation): helpdesk sidebar'a Yapılandırma bölümü (Tipler / Hazır Yanıtlar / Ajanlar / Ekipler) + Mağaza Soruları (@ahmeetseker)
- feat(seller-crm): 2 değişiklik (@ahmeetseker)
  - satıcı paneline tam CRM modülü — sellerRailSections'a CRM rail + sellerPanelSections.crm (Anlaşmalarım, Lead'lerim, Görevlerim, Notlar, Aramalar, Kişiler, Kurumlar)
  - SellerInquiryDetailView'a "CRM Lead'e Dönüştür" butonu — Mağaza Sorusu'nu tek tıkla lead pipeline'ına aktarır

## [v1.1.4-rc.16] - 2026-04-21 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Degistirildi
- refactor: perform comprehensive UI/UX overhaul and theme migration across frontend components and dashboard modules (@ahmeetseker)

---

## [v1.1.4-rc.15] - 2026-04-17 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(crm): tam CRM modulu - dashboard, deals, tasks, notes, calls, contacts, organizations + (@ahmeetseker)

## [v1.1.4-rc.13] - 2026-04-16 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Duzeltildi
- fix: add error parameter to catch blocks in loadMeta and loadData functions (@boraydeger32)

## [v1.1.4-rc.12] - 2026-04-16 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Duzeltildi
- fix(notifications): action_url routing iyileştirildi ve /panel/ prefix desteği eklendi (@ahmeetseker)

## [v1.1.4-rc.11] - 2026-04-16 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(currency): Para birimi yönetimi ve TCMB kurları admin entegrasyonu yapıldı. (@aliiball)

## [v1.1.4-rc.9] - 2026-04-15 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(dashboard): Dinamik widget render, admin CRUD arayüzü ve satıcı görünümü eklendi. (@aliiball)

## [v1.1.4-rc.7] - 2026-04-15 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Degistirildi
- refactor: update replyViaAgent to use tradehub_core endpoint and simplify arguments (@ahmeetseker)

---

## [v1.1.4-rc.6] - 2026-04-15 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: add helpdesk component styling and design tokens for editorial operations UI (@ahmeetseker)
- feat(helpdesk): TicketsList + TicketDetail dark mode tutarlı, helpdesk.scss aktif (@ahmeetseker)

### Duzeltildi
- fix: apply important flags to helpdesk input and select styles to ensure consistent rendering (@ahmeetseker)

### Degistirildi
- refactor: simplify helpdesk UI styles and migrate communication fetching to a backend API method (@ahmeetseker)

---

## [v1.1.4] - 2026-04-13 PROD

Bu surum istoc.com'da yayindadir.

### Eklendi
- feat: Tema yöneticisine palet, tipografi ve input token gruplarını ekle (@ahmeetseker)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@ahmeetseker)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@aliiball)

### Degistirildi
- refactor: ThemeManagerView'dan gradyan buton önizlemesini kaldır (@ahmeetseker)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@ahmeetseker)

---

## [v1.1.3-rc.16] - 2026-04-10 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(top-deals): Mağaza ön yüzüne “En İyi Fırsatlar” için arka uç iş akışı eklendi (@aliiball)

## [v1.1.3-rc.14] - 2026-04-10 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(doctype-form): tab extension registry + SellerAddressesPanel entegrasyonu (@boraydeger32)

## [v1.1.3-rc.13] - 2026-04-10 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Duzeltildi
- fix(ci): prevent silent deploy failures with set -e and git reset (@ahmeetseker)

## [v1.1.3-rc.8] - 2026-04-10 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: Tema yöneticisine palet, tipografi ve input token gruplarını ekle (@TurksabYonetim)

## [v1.1.3-rc.7] - 2026-04-09 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Degistirildi
- refactor: ThemeManagerView'dan gradyan buton önizlemesini kaldır (@TurksabYonetim)

---

## [v1.1.3-rc.4] - 2026-04-09 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)

## [v1.1.3-rc.3] - 2026-04-08 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Degistirildi
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)

---

## [v1.1.3-rc.2] - 2026-04-08 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)

---

## [v1.1.3] - 2026-04-06 PROD

Bu surum istoc.com'da yayindadir.

### Eklendi
- feat: configure VITE_API_BASE environment variable and update API utility to support absolute URLs for GitHub Pages deployment (@ahmeetseker)
- feat: enable deployment for ali and bora branches and update pages trigger condition (@ahmeetseker)

### Duzeltildi
- fix: update API upload endpoint to use BASE_URL and add 404.html fallback for SPA routing (@ahmeetseker)

### Degistirildi
- refactor: standardize API calls and CSRF token retrieval using the global api helper (@ahmeetseker)

---

## [v1.1.2-rc.3] - 2026-04-06 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Duzeltildi
- fix: update API upload endpoint to use BASE_URL and add 404.html fallback for SPA routing (@TurksabYonetim)

### Degistirildi
- refactor: standardize API calls and CSRF token retrieval using the global api helper (@TurksabYonetim)

---

## [v1.1.2-rc.2] - 2026-04-06 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: enable deployment for ali and bora branches and update pages trigger condition (@TurksabYonetim)
- feat: configure VITE_API_BASE environment variable and update API utility to support absolute URLs for GitHub Pages deployment (@TurksabYonetim)

---

## [v1.1.0] - 2026-04-04 PROD

Bu surum istoc.com'da yayindadir.

### Eklendi
- feat: CSRF token için önbellekleme yönetimi eklendi ve ürün varyantlarına görsel yükleme desteği getirildi (@boraydeger32)
- feat: Listeleme moderasyonunu; reddedilme geri bildirimleri, geliştirilmiş arayüz detayları ve tek kayıt görünümleri için otomatik yönlendirme ile iyileştir. (@boraydeger32)
- feat(layout): mağaza sayfası düzenleme arayüzü eklendi (@ahmeetseker)

### Degistirildi
- refactor: move badge count update to order loading logic in SellerOrdersView (@boraydeger32)

---

## [v1.0.2-rc.6] - 2026-04-03 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: CSRF token için önbellekleme yönetimi eklendi ve ürün varyantlarına görsel yükleme desteği getirildi (@TurksabYonetim)

### Degistirildi
- refactor: move badge count update to order loading logic in SellerOrdersView (@TurksabYonetim)

---

## [v1.0.2-rc.5] - 2026-04-03 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Duzeltildi
- fix: VITE_STOREFRONT_URL relative URL yapıldı. (@aliiball)

---

## [v1.0.2-rc.4] - 2026-04-03 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: Listeleme moderasyonunu; reddedilme geri bildirimleri, geliştirilmiş arayüz detayları ve tek kayıt görünümleri için otomatik yönlendirme ile iyileştir. (@TurksabYonetim)

---

## [v1.0.2-rc.3] - 2026-04-02 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(layout): mağaza sayfası düzenleme arayüzü eklendi (@TurksabYonetim)

---

## [v1.0.2] - 2026-04-01 PROD

Bu surum istoc.com'da yayindadir.

### Eklendi
- feat(ci): GitHub API ile CHANGELOG oluşturma sürecini güncellendi (@ahmeetseker)

---

## [v1.0.1-rc.2] - 2026-04-01 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(ci): GitHub API ile CHANGELOG oluşturma sürecini güncellendi (@TurksabYonetim)

---
