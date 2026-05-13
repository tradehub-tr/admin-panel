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
