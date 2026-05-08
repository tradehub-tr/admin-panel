## [Belgelenmemiş Özellikler — Geliştirme Süreci Özeti] - 2026-05-08

Bu bölüm, geliştirme sürecinde koda eklenmiş ancak önceki sürüm changelog'larında
tek satırlık özet biçiminde geçen veya hiç belgelenmemiş özellikleri **patrona
sunulmak üzere** detaylı şekilde yeniden listeler. Her madde; etkilediği
sayfa/komponent, ne yaptığı, neden yapıldığı ve teknik kapsamı ile birlikte
yazılmıştır. Sürüm bölümlerine bu liste paralel okunmalıdır.

### Eklendi (Belgelenmemiş Detaylar)

- feat(doctype-form): **KYB review/preview/reject modal** — `frontend/src/views/doctype/DocTypeFormView.vue` üzerine, Frappe DocType form'u admin tarafında açıldığında "KYB Verification" tipi başvurular için inceleme modalı eklendi. Admin başvuruyu modal içinde görüntüleyip yüklenen belgeleri (vergi levhası, imza sirküleri vb.) önizleyebilir; gerekçe yazarak reject edebilir veya `tradehub_core.api.v1.kyb.review_kyb` endpoint'i üzerinden state-machine + audit log ile onaylayabilir. (@aliiball)
- feat(doctype-form): **Column Break grid layout** — DocType form render'ında `Column Break` fieldtype'ı tespit edilirse section iki sütunluk CSS grid'e dönüştürülür; Column Break yoksa tek sütun (flex-col). Uzun KYB / profil formları artık kâğıt formu gibi okunaklı dizilim alıyor. (@aliiball)
- feat(doctype-form): **Permlevel filtresi** — Field render'ı sırasında kullanıcının role'lerine göre maksimum erişebileceği `permlevel` hesaplanır; permlevel'i bu seviyenin üstünde olan field'lar hiç render edilmez. `read_only + permlevel > 0` alanlar audit/sistem alanı (verified_by, verified_at) sayılır; admin olmayan submit'lerinde bu alanlar payload'dan da düşülür. (@aliiball)
- feat(doctype-form): **Child table inline file upload** — Child table satırlarında "Attach"/"Attach Image" alanları artık satır içinde tıklanır upload butonu ve önizleme thumb'ı ile çalışır; `uploadRowFile` ile dosya `tradehub_core` upload endpoint'ine atılır, `file_url` aynı satıra yazılır. Ayrıca image-only child table'lar (örn. ürün galerisi) `Görsel Ekle` çoklu yükleme galerisi olarak render edilir. (@Bora)
- feat(profile/IconRail): **Rail avatar upload** — Sol kenar rail'inde kullanıcı avatarı doğrudan tıklanabilir hale geldi; gizli `<input type="file">` üzerinden seçilen görsel `auth` store'a push edilip backend'e yüklenir, anında frame'de güncellenir. Ayrı bir profil sayfasına gitmeden hızlı avatar değişikliği. (@aliiball)
- feat(seller-trust): **"Onaylanmış Satıcı" rozetinin KYB Verified ile birleştirilmesi** — Eskiden ayrı yönetilen `is_verified_seller` ve `kyb_status` artık tek doğruluk kaynağına bağlandı. `auth` store'a `kybStatus` computed eklendi, `SellerKybBanner.vue` (yeni) bayrağı 6 durumda (Verified / Under Review / Pending / Draft / Rejected / Expired) renkli banner ile gösteriyor. (@aliiball)
- feat(seller-trust): **3 katmanlı sipariş gate'i** — `SellerListingsView` ve `SellerOverview` içinde KYB durumuna göre üç kademeli kapı: (1) Verified satıcı tüm aksiyonlara açık; (2) Under Review/Pending satıcı listing oluşturabilir ama yayınlanmaz; (3) Rejected/Expired satıcının sipariş alımı kilitli, yönlendirici banner CTA'sı KYB başvurusuna götürür. (@aliiball)
- feat(crm): **Permission-aware doctype count routing** — `frontend/src/utils/api.js` içine eklenen `getCount(doctype, filters)` artık çağrıyı `/api/method/tradehub_core.api.v1.crm_overrides.crm_get_count` üzerine yönlendirir; bu endpoint kullanıcı rolüne göre filtreyi hard-enforce eder, satıcılar başkasının deal/lead sayısını görmez. Önceki `frappe.client.get_count` doğrudan çağrısı satıcı izolasyonunu kıramayan bir kapı bırakıyordu. (@ahmeetseker)
- feat(crm): **Organization dropdown + contact child-table sync + Görev Kanban** — `DealDetailView`/`LeadDetailView` içinde organization alanı artık aratılabilir dropdown'a dönüştü; kontak seçildiğinde child-table satırı tek yönlü senkron olarak güncellenir. `TasksListView` Kanban moduna geçirildi (To Do / In Progress / Done sütunları, drag-drop ile statü güncelleme). `crmContacts` ve `crmMeta` store'ları paralel update'lere göre genişletildi. (@ahmeetseker)
- feat(notifications): **action_url whitelist (defansif guard)** — `NotificationPanel.vue` ve `NotificationsView.vue` içine `isSafeActionUrl()` eklendi; backend zaten `_sanitize_action_url` uyguluyor olsa da frontend `javascript:`, `data:`, protokol-rölatif `//` gibi şüpheli URL'leri yine de bloke eder ve `https://` veya `/` ile başlayan URL'leri kabul eder. Eski/migrate edilmiş kayıtlar için ek savunma katmanı. (@Bora)
- feat(notifications): **Polling recovery** — `stores/notification.js`'de network kesintisi sonrası polling kilitlenmesini önleyen `recoveryTimerId` mekanizması; başarısız fetch'te exponential geri çekilmeyle otomatik yeniden bağlanır, sayfa yenilemeden sayaç kendine geliyor. Çift interval guard'ı da eklendi (start çağrıları idempotent). (@Bora)
- feat(listing-form): **Varyant matrisinde eksen değişiminde değer koruma** — Satıcı varyant ekseni eklediğinde/çıkardığında eski matris hücrelerindeki fiyat/stok değerleri kaybolmuyor; `axes` değişiminde yeni matris key'lerine eski değerler best-effort merge ediliyor. (@Bora)

### Duzeltildi (Belgelenmemiş Detaylar)

- fix(nginx): **Backend domain'i envsubst template'i ile parametrize** — `frontend/nginx.conf` artık `nginx.conf.template` olarak yeniden adlandırıldı; `${BACKEND_DOMAIN}` ve `${FRONTEND_DOMAIN}` runtime'da nginx:alpine'in entrypoint'i tarafından doldurulur. Aynı image beta/RC/prod'da farklı backend'e yönlenebiliyor (BETA → betaistoc.cronbi.com, RC → rcistoc.cronbi.com, PROD → istoc.cronbi.com); compose override yeterli, image yeniden build gerekmez. `NGINX_ENVSUBST_FILTER` ile sadece bu iki değişken substitute edilir, `$remote_addr` gibi nginx kendi değişkenleri korunur. (@ahmeetseker)
- fix(notifications): **action_url routing tutarlılığı** — `/panel/` prefix'iyle başlayan action_url'ler internal router.push'a, `/seller/`, `/seller-`, `/dashboard` prefix'leri internal routing'e, harici `https://...` URL'ler `window.open` ile yeni sekmeye açılır; boş `action_url` early-return ile no-op. (@ahmeetseker)
- fix(doctype-form): **Lint hatalarının toplu düzeltilmesi** — `DocTypeFormView.vue` 678 satırlık refactor turunda Vue/ESLint uyarıları (kullanılmayan import, prop tipi, async hata yakalama) giderildi; davranış değişmedi. (@aliiball)

### Degistirildi (Belgelenmemiş Detaylar)

- refactor(crm): **`close_date` → `closed_date` ve `lead_source` → `source_name` rename** — Frappe CRM tarafındaki standart field isimleriyle hizalama. `stores/crm.js`, `stores/crmMeta.js`, `DealDetailView.vue`, `DealsListView.vue` üzerinde tutarlı rename; backend tarafında zaten yeni isimle dönüş geliyor, frontend uyumlandı. Aksi halde "Kapanış Tarihi" sütunu boş gözüküyordu. (@ahmeetseker)
- refactor(ui): **UI kod sıkılaştırması + lint workflow concurrency** — Birçok view'de tekrarlayan markup azaltıldı, store mantığı sadeleştirildi. `.github/workflows/lint.yml`'e `concurrency: { group: lint-${{ github.ref }}, cancel-in-progress: true }` eklendi; aynı branch'e ardışık push'larda eski lint job'ları otomatik iptal, CI sırası tıkanmıyor. JSON ve CSS dosyaları lint pattern'ından çıkarıldı (gereksiz auto-fix gürültüsü). (@ahmeetseker)
- refactor(crm): **CrmContacts store paralel update fix** — `crmContacts.js` içinde aynı kontağa ardışık iki update geldiğinde state'in flicker'lamaması için kuyruklu update yaklaşımına geçildi. (@ahmeetseker)

---
## [v1.1.7-beta.9] - 2026-05-08 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat: route CRM doctype count requests to permission-aware tradehub_core endpoint (@ahmeetseker)
- feat(doctype-form,profile): KYB review/preview/reject modal + Column Break grid + permlevel filtre; rail avatar upload (@aliiball)
- feat(seller-trust): "Onaylanmış Satıcı" rozetini KYB Verified ile birleştir + 3-katmanlı sipariş gate (@aliiball)

### Duzeltildi
- fix(nginx): parametrize backend domain via envsubst template (@ahmeetseker)

### Degistirildi
- refactor: condense UI code, optimize linting workflow with concurrency control, and clean up store logic (@ahmeetseker)
- refactor: rename close_date to closed_date and lead_source to source_name in CRM stores and components (@ahmeetseker)

---
## [v1.1.7-beta.8] - 2026-05-08 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat: route CRM doctype count requests to permission-aware tradehub_core endpoint (@ahmeetseker)
- feat(doctype-form,profile): KYB review/preview/reject modal + Column Break grid + permlevel filtre; rail avatar upload (@aliiball)
- feat(seller-trust): "Onaylanmış Satıcı" rozetini KYB Verified ile birleştir + 3-katmanlı sipariş gate (@aliiball)

### Duzeltildi
- fix(nginx): parametrize backend domain via envsubst template (@ahmeetseker)

### Degistirildi
- refactor: condense UI code, optimize linting workflow with concurrency control, and clean up store logic (@ahmeetseker)
- refactor: rename close_date to closed_date and lead_source to source_name in CRM stores and components (@ahmeetseker)

---
## [v1.1.7-beta.7] - 2026-05-08 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat: route CRM doctype count requests to permission-aware tradehub_core endpoint (@ahmeetseker)
- feat(doctype-form,profile): KYB review/preview/reject modal + Column Break grid + permlevel filtre; rail avatar upload (@aliiball)

### Duzeltildi
- fix(nginx): parametrize backend domain via envsubst template (@ahmeetseker)

### Degistirildi
- refactor: condense UI code, optimize linting workflow with concurrency control, and clean up store logic (@ahmeetseker)
- refactor: rename close_date to closed_date and lead_source to source_name in CRM stores and components (@ahmeetseker)

---
## [v1.1.7-beta.6] - 2026-05-07 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat: route CRM doctype count requests to permission-aware tradehub_core endpoint (@ahmeetseker)
- feat(doctype-form,profile): KYB review/preview/reject modal + Column Break grid + permlevel filtre; rail avatar upload (@aliiball)

### Duzeltildi
- fix(nginx): parametrize backend domain via envsubst template (@ahmeetseker)

### Degistirildi
- refactor: condense UI code, optimize linting workflow with concurrency control, and clean up store logic (@ahmeetseker)

---
## [v1.1.7-beta.5] - 2026-05-06 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat: route CRM doctype count requests to permission-aware tradehub_core endpoint (@ahmeetseker)
- feat(doctype-form,profile): KYB review/preview/reject modal + Column Break grid + permlevel filtre; rail avatar upload (@aliiball)

### Degistirildi
- refactor: condense UI code, optimize linting workflow with concurrency control, and clean up store logic (@ahmeetseker)

---
## [v1.1.7-beta.4] - 2026-05-06 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat: route CRM doctype count requests to permission-aware tradehub_core endpoint (@ahmeetseker)

### Degistirildi
- refactor: condense UI code, optimize linting workflow with concurrency control, and clean up store logic (@ahmeetseker)

---
## [v1.1.7-beta.3] - 2026-05-06 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

### Eklendi
- feat: route CRM doctype count requests to permission-aware tradehub_core endpoint (@ahmeetseker)

---
## [v1.1.7-beta.2] - 2026-05-06 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

---
## [v1.1.7-beta.1] - 2026-05-05 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

---
## [v1.1.7] - 2026-04-30 PROD

Bu surum istoc.com/panel'de yayindadir.

---
## [v1.1.6-rc.1] - 2026-04-30 RC

Bu surum rc.istoc.com/panel'de onay asamasindadir.

---
## [v1.1.6-beta.1] - 2026-04-30 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

---
## [v1.1.6] - 2026-04-30 PROD

Bu surum istoc.com/panel'de yayindadir.

---
## [v1.1.5-rc.2] - 2026-04-30 RC

Bu surum rc.istoc.com/panel'de onay asamasindadir.

---
## [v1.1.5-beta.2] - 2026-04-30 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

---
## [v1.1.5-beta.1] - 2026-04-30 BETA

Bu surum beta.istoc.com/panel'de test asamasindadir.

---
## [v1.1.5-rc.1] - 2026-04-29 RC

Bu surum rc.istoc.com'da test asamasindadir.

---
## [v1.1.5] - 2026-04-29 PROD

Bu surum istoc.com'da yayindadir.

### Eklendi
- feat(helpdesk): yönetim ekranları + bulk actions + Seller CRM modülü   Body:   - TicketsList: 4 KPI kartı, ?tab/?scope URL desteği, bulk action toolbar,     Görünümler dropdown (saved filters)   - TicketDetail: şablon dropdown (canned response), ilişkili kayıtlar paneli,     renkli etiket chip'leri   - Yeni yönetim ekranları: Talep Tipleri, Ajanlar, Ekipler, Hazır Yanıtlar,     Mağaza Soruları (liste + detay)   - Sidebar: Helpdesk → Yapılandırma alt menüsü + Mağaza Soruları   - Seller CRM rail (Anlaşmalar, Lead'ler, Görevler, Notlar, Aramalar,     Kişiler, Kurumlar) + Mağaza Sorusu → CRM Lead dönüşüm butonu (@ahmeetseker)
- feat: add image upload functionality for categories and implement delete confirmation (@Bora)
- feat(crm): tam CRM modulu - dashboard, deals, tasks, notes, calls, contacts, organizations +   ayarlar (@ahmeetseker)
- feat(currency): Para birimi yönetimi ve TCMB kurları admin entegrasyonu yapıldı. (@aliiball)
- feat(dashboard): Dinamik widget render, admin CRUD arayüzü ve satıcı görünümü eklendi. (@aliiball)
- feat(helpdesk): TicketsList + TicketDetail dark mode tutarlı, helpdesk.scss aktif (@ahmeetseker)
- feat: add helpdesk component styling and design tokens for editorial operations UI (@ahmeetseker)

### Duzeltildi
- fix: add error parameter to catch blocks in loadMeta and loadData functions (@Bora)
- fix(notifications): action_url routing iyileştirildi ve /panel/ prefix desteği eklendi   - NotificationPanel.vue & NotificationsView.vue: action_url "/panel/" ile     başlıyorsa prefix çıkarılarak router.push yapılır   - /seller/, /seller-, /dashboard prefiksleri için internal routing korundu   - Early return ile n.action_url boş ise no-op; okunabilirlik artırıldı. (@ahmeetseker)
- fix: apply important flags to helpdesk input and select styles to ensure consistent rendering (@ahmeetseker)

### Degistirildi
- refactor: perform comprehensive UI/UX overhaul and theme migration across frontend components and dashboard modules (@ahmeetseker)
- refactor: update replyViaAgent to use tradehub_core endpoint and simplify arguments (@ahmeetseker)
- refactor: simplify helpdesk UI styles and migrate communication fetching to a backend API method (@ahmeetseker)

---
## [v1.1.4-rc.22] - 2026-04-29 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: add helpdesk component styling and design tokens for editorial operations UI (@ahmeetseker)
- feat(helpdesk): TicketsList + TicketDetail dark mode tutarlı, helpdesk.scss aktif (@ahmeetseker)
- feat(dashboard): Dinamik widget render, admin CRUD arayüzü ve satıcı görünümü eklendi. (@aliiball)
- feat(currency): Para birimi yönetimi ve TCMB kurları admin entegrasyonu yapıldı. (@aliiball)
- feat(crm): tam CRM modulu - dashboard, deals, tasks, notes, calls, contacts, organizations + (@ahmeetseker)
- feat: add image upload functionality for categories and implement delete confirmation (@boraydeger32)
- feat(helpdesk): yönetim ekranları + bulk actions + Seller CRM modülü (@ahmeetseker)

### Duzeltildi
- fix: apply important flags to helpdesk input and select styles to ensure consistent rendering (@ahmeetseker)
- fix(notifications): action_url routing iyileştirildi ve /panel/ prefix desteği eklendi (@ahmeetseker)
- fix: add error parameter to catch blocks in loadMeta and loadData functions (@boraydeger32)

### Degistirildi
- refactor: simplify helpdesk UI styles and migrate communication fetching to a backend API method (@ahmeetseker)
- refactor: update replyViaAgent to use tradehub_core endpoint and simplify arguments (@ahmeetseker)
- refactor: perform comprehensive UI/UX overhaul and theme migration across frontend components and dashboard modules (@ahmeetseker)

---
## [v1.1.4-rc.21] - 2026-04-29 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: add helpdesk component styling and design tokens for editorial operations UI (@ahmeetseker)
- feat(helpdesk): TicketsList + TicketDetail dark mode tutarlı, helpdesk.scss aktif (@ahmeetseker)
- feat(dashboard): Dinamik widget render, admin CRUD arayüzü ve satıcı görünümü eklendi. (@aliiball)
- feat(currency): Para birimi yönetimi ve TCMB kurları admin entegrasyonu yapıldı. (@aliiball)
- feat(crm): tam CRM modulu - dashboard, deals, tasks, notes, calls, contacts, organizations + (@ahmeetseker)
- feat: add image upload functionality for categories and implement delete confirmation (@boraydeger32)
- feat(helpdesk): yönetim ekranları + bulk actions + Seller CRM modülü (@ahmeetseker)

### Duzeltildi
- fix: apply important flags to helpdesk input and select styles to ensure consistent rendering (@ahmeetseker)
- fix(notifications): action_url routing iyileştirildi ve /panel/ prefix desteği eklendi (@ahmeetseker)
- fix: add error parameter to catch blocks in loadMeta and loadData functions (@boraydeger32)

### Degistirildi
- refactor: simplify helpdesk UI styles and migrate communication fetching to a backend API method (@ahmeetseker)
- refactor: update replyViaAgent to use tradehub_core endpoint and simplify arguments (@ahmeetseker)
- refactor: perform comprehensive UI/UX overhaul and theme migration across frontend components and dashboard modules (@ahmeetseker)

---
## [v1.1.4-rc.20] - 2026-04-29 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: add helpdesk component styling and design tokens for editorial operations UI (@ahmeetseker)
- feat(helpdesk): TicketsList + TicketDetail dark mode tutarlı, helpdesk.scss aktif (@ahmeetseker)
- feat(dashboard): Dinamik widget render, admin CRUD arayüzü ve satıcı görünümü eklendi. (@aliiball)
- feat(currency): Para birimi yönetimi ve TCMB kurları admin entegrasyonu yapıldı. (@aliiball)
- feat(crm): tam CRM modulu - dashboard, deals, tasks, notes, calls, contacts, organizations + (@ahmeetseker)
- feat: add image upload functionality for categories and implement delete confirmation (@boraydeger32)
- feat(helpdesk): yönetim ekranları + bulk actions + Seller CRM modülü (@ahmeetseker)

### Duzeltildi
- fix: apply important flags to helpdesk input and select styles to ensure consistent rendering (@ahmeetseker)
- fix(notifications): action_url routing iyileştirildi ve /panel/ prefix desteği eklendi (@ahmeetseker)
- fix: add error parameter to catch blocks in loadMeta and loadData functions (@boraydeger32)

### Degistirildi
- refactor: simplify helpdesk UI styles and migrate communication fetching to a backend API method (@ahmeetseker)
- refactor: update replyViaAgent to use tradehub_core endpoint and simplify arguments (@ahmeetseker)
- refactor: perform comprehensive UI/UX overhaul and theme migration across frontend components and dashboard modules (@ahmeetseker)

---
## [v1.1.4-rc.19] - 2026-04-27 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: add helpdesk component styling and design tokens for editorial operations UI (@ahmeetseker)
- feat(helpdesk): TicketsList + TicketDetail dark mode tutarlı, helpdesk.scss aktif (@ahmeetseker)
- feat(dashboard): Dinamik widget render, admin CRUD arayüzü ve satıcı görünümü eklendi. (@aliiball)
- feat(currency): Para birimi yönetimi ve TCMB kurları admin entegrasyonu yapıldı. (@aliiball)
- feat(crm): tam CRM modulu - dashboard, deals, tasks, notes, calls, contacts, organizations + (@ahmeetseker)
- feat: add image upload functionality for categories and implement delete confirmation (@boraydeger32)

### Duzeltildi
- fix: apply important flags to helpdesk input and select styles to ensure consistent rendering (@ahmeetseker)
- fix(notifications): action_url routing iyileştirildi ve /panel/ prefix desteği eklendi (@ahmeetseker)
- fix: add error parameter to catch blocks in loadMeta and loadData functions (@boraydeger32)

### Degistirildi
- refactor: simplify helpdesk UI styles and migrate communication fetching to a backend API method (@ahmeetseker)
- refactor: update replyViaAgent to use tradehub_core endpoint and simplify arguments (@ahmeetseker)
- refactor: perform comprehensive UI/UX overhaul and theme migration across frontend components and dashboard modules (@ahmeetseker)

---
## [v1.1.4-rc.18] - 2026-04-22 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: add helpdesk component styling and design tokens for editorial operations UI (@ahmeetseker)
- feat(helpdesk): TicketsList + TicketDetail dark mode tutarlı, helpdesk.scss aktif (@ahmeetseker)
- feat(dashboard): Dinamik widget render, admin CRUD arayüzü ve satıcı görünümü eklendi. (@aliiball)
- feat(currency): Para birimi yönetimi ve TCMB kurları admin entegrasyonu yapıldı. (@aliiball)
- feat(crm): tam CRM modulu - dashboard, deals, tasks, notes, calls, contacts, organizations + (@ahmeetseker)
- feat: add image upload functionality for categories and implement delete confirmation (@boraydeger32)

### Duzeltildi
- fix: apply important flags to helpdesk input and select styles to ensure consistent rendering (@ahmeetseker)
- fix(notifications): action_url routing iyileştirildi ve /panel/ prefix desteği eklendi (@ahmeetseker)
- fix: add error parameter to catch blocks in loadMeta and loadData functions (@boraydeger32)

### Degistirildi
- refactor: simplify helpdesk UI styles and migrate communication fetching to a backend API method (@ahmeetseker)
- refactor: update replyViaAgent to use tradehub_core endpoint and simplify arguments (@ahmeetseker)
- refactor: perform comprehensive UI/UX overhaul and theme migration across frontend components and dashboard modules (@ahmeetseker)

---
## [v1.1.4-rc.17] - 2026-04-21 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: add helpdesk component styling and design tokens for editorial operations UI (@ahmeetseker)
- feat(helpdesk): TicketsList + TicketDetail dark mode tutarlı, helpdesk.scss aktif (@ahmeetseker)
- feat(dashboard): Dinamik widget render, admin CRUD arayüzü ve satıcı görünümü eklendi. (@aliiball)
- feat(currency): Para birimi yönetimi ve TCMB kurları admin entegrasyonu yapıldı. (@aliiball)
- feat(crm): tam CRM modulu - dashboard, deals, tasks, notes, calls, contacts, organizations + (@ahmeetseker)
- feat(helpdesk): TicketsList üstüne 4 KPI kartı (Açık / Yanıtlandı / Bana Atanan Açık / Son 7 Gün Çözülen) — tıklanınca filtre uygular (@ahmeetseker)
- feat(helpdesk): TicketsList ?tab= ve ?scope= URL paramı destegi — dashboard widget linklerinden doğrudan filtreli açılış (@ahmeetseker)
- feat(helpdesk): Talep Tipleri yönetim ekranı (HD Ticket Type CRUD modal) (@ahmeetseker)
- feat(helpdesk): Ajan yönetim ekranı (HD Agent CRUD + aktif/pasif toggle) (@ahmeetseker)
- feat(helpdesk): Ekip yönetim ekranı (HD Team + üye ekleme/çıkarma modal) (@ahmeetseker)
- feat(helpdesk): Hazır Yanıtlar yönetim ekranı (Helpdesk Canned Response CRUD, kategori + scope) (@ahmeetseker)
- feat(helpdesk): TicketDetail composer'a "Şablon" dropdown — placeholder substitution ile şablon ekleme (@ahmeetseker)
- feat(helpdesk): TicketsList bulk action toolbar (toplu durum/öncelik/kapama, çoklu seçim ile) (@ahmeetseker)
- feat(helpdesk): Mağaza Soruları yönetim ekranı (Seller Inquiry liste + detay + cevapla) (@ahmeetseker)
- feat(helpdesk): TicketDetail sidebar'da İlişkili Kayıtlar paneli (related_order/rfq/listing) (@ahmeetseker)
- feat(helpdesk): TicketDetail sidebar'da renkli etiket chip'leri + ekleme/çıkarma (@ahmeetseker)
- feat(helpdesk): TicketsList Görünümler dropdown — kişisel + ekiple paylaşılan saved filter'lar, sabitleme + silme (@ahmeetseker)
- feat(navigation): helpdesk sidebar'a Yapılandırma bölümü (Tipler / Hazır Yanıtlar / Ajanlar / Ekipler) + Mağaza Soruları (@ahmeetseker)
- feat(seller-crm): satıcı paneline tam CRM modülü — sellerRailSections'a CRM rail + sellerPanelSections.crm (Anlaşmalarım, Lead'lerim, Görevlerim, Notlar, Aramalar, Kişiler, Kurumlar) (@ahmeetseker)
- feat(seller-crm): SellerInquiryDetailView'a "CRM Lead'e Dönüştür" butonu — Mağaza Sorusu'nu tek tıkla lead pipeline'ına aktarır (@ahmeetseker)

### Duzeltildi
- fix: apply important flags to helpdesk input and select styles to ensure consistent rendering (@ahmeetseker)
- fix(notifications): action_url routing iyileştirildi ve /panel/ prefix desteği eklendi (@ahmeetseker)
- fix: add error parameter to catch blocks in loadMeta and loadData functions (@boraydeger32)

### Degistirildi
- refactor: simplify helpdesk UI styles and migrate communication fetching to a backend API method (@ahmeetseker)
- refactor: update replyViaAgent to use tradehub_core endpoint and simplify arguments (@ahmeetseker)
- refactor: perform comprehensive UI/UX overhaul and theme migration across frontend components and dashboard modules (@ahmeetseker)

---
## [v1.1.4-rc.16] - 2026-04-21 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: add helpdesk component styling and design tokens for editorial operations UI (@ahmeetseker)
- feat(helpdesk): TicketsList + TicketDetail dark mode tutarlı, helpdesk.scss aktif (@ahmeetseker)
- feat(dashboard): Dinamik widget render, admin CRUD arayüzü ve satıcı görünümü eklendi. (@aliiball)
- feat(currency): Para birimi yönetimi ve TCMB kurları admin entegrasyonu yapıldı. (@aliiball)
- feat(crm): tam CRM modulu - dashboard, deals, tasks, notes, calls, contacts, organizations + (@ahmeetseker)

### Duzeltildi
- fix: apply important flags to helpdesk input and select styles to ensure consistent rendering (@ahmeetseker)
- fix(notifications): action_url routing iyileştirildi ve /panel/ prefix desteği eklendi (@ahmeetseker)
- fix: add error parameter to catch blocks in loadMeta and loadData functions (@boraydeger32)

### Degistirildi
- refactor: simplify helpdesk UI styles and migrate communication fetching to a backend API method (@ahmeetseker)
- refactor: update replyViaAgent to use tradehub_core endpoint and simplify arguments (@ahmeetseker)
- refactor: perform comprehensive UI/UX overhaul and theme migration across frontend components and dashboard modules (@ahmeetseker)

---
## [v1.1.4-rc.15] - 2026-04-17 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: add helpdesk component styling and design tokens for editorial operations UI (@ahmeetseker)
- feat(helpdesk): TicketsList + TicketDetail dark mode tutarlı, helpdesk.scss aktif (@ahmeetseker)
- feat(dashboard): Dinamik widget render, admin CRUD arayüzü ve satıcı görünümü eklendi. (@aliiball)
- feat(currency): Para birimi yönetimi ve TCMB kurları admin entegrasyonu yapıldı. (@aliiball)
- feat(crm): tam CRM modulu - dashboard, deals, tasks, notes, calls, contacts, organizations + (@ahmeetseker)

### Duzeltildi
- fix: apply important flags to helpdesk input and select styles to ensure consistent rendering (@ahmeetseker)
- fix(notifications): action_url routing iyileştirildi ve /panel/ prefix desteği eklendi (@ahmeetseker)
- fix: add error parameter to catch blocks in loadMeta and loadData functions (@boraydeger32)

### Degistirildi
- refactor: simplify helpdesk UI styles and migrate communication fetching to a backend API method (@ahmeetseker)
- refactor: update replyViaAgent to use tradehub_core endpoint and simplify arguments (@ahmeetseker)

---
## [v1.1.4-rc.14] - 2026-04-16 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: add helpdesk component styling and design tokens for editorial operations UI (@ahmeetseker)
- feat(helpdesk): TicketsList + TicketDetail dark mode tutarlı, helpdesk.scss aktif (@ahmeetseker)
- feat(dashboard): Dinamik widget render, admin CRUD arayüzü ve satıcı görünümü eklendi. (@aliiball)
- feat(currency): Para birimi yönetimi ve TCMB kurları admin entegrasyonu yapıldı. (@aliiball)

### Duzeltildi
- fix: apply important flags to helpdesk input and select styles to ensure consistent rendering (@ahmeetseker)
- fix(notifications): action_url routing iyileştirildi ve /panel/ prefix desteği eklendi (@ahmeetseker)
- fix: add error parameter to catch blocks in loadMeta and loadData functions (@boraydeger32)

### Degistirildi
- refactor: simplify helpdesk UI styles and migrate communication fetching to a backend API method (@ahmeetseker)
- refactor: update replyViaAgent to use tradehub_core endpoint and simplify arguments (@ahmeetseker)

---
## [v1.1.4-rc.13] - 2026-04-16 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: add helpdesk component styling and design tokens for editorial operations UI (@ahmeetseker)
- feat(helpdesk): TicketsList + TicketDetail dark mode tutarlı, helpdesk.scss aktif (@ahmeetseker)
- feat(dashboard): Dinamik widget render, admin CRUD arayüzü ve satıcı görünümü eklendi. (@aliiball)
- feat(currency): Para birimi yönetimi ve TCMB kurları admin entegrasyonu yapıldı. (@aliiball)

### Duzeltildi
- fix: apply important flags to helpdesk input and select styles to ensure consistent rendering (@ahmeetseker)
- fix(notifications): action_url routing iyileştirildi ve /panel/ prefix desteği eklendi (@ahmeetseker)
- fix: add error parameter to catch blocks in loadMeta and loadData functions (@boraydeger32)

### Degistirildi
- refactor: simplify helpdesk UI styles and migrate communication fetching to a backend API method (@ahmeetseker)
- refactor: update replyViaAgent to use tradehub_core endpoint and simplify arguments (@ahmeetseker)

---
## [v1.1.4-rc.12] - 2026-04-16 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: add helpdesk component styling and design tokens for editorial operations UI (@ahmeetseker)
- feat(helpdesk): TicketsList + TicketDetail dark mode tutarlı, helpdesk.scss aktif (@ahmeetseker)
- feat(dashboard): Dinamik widget render, admin CRUD arayüzü ve satıcı görünümü eklendi. (@aliiball)
- feat(currency): Para birimi yönetimi ve TCMB kurları admin entegrasyonu yapıldı. (@aliiball)

### Duzeltildi
- fix: apply important flags to helpdesk input and select styles to ensure consistent rendering (@ahmeetseker)
- fix(notifications): action_url routing iyileştirildi ve /panel/ prefix desteği eklendi (@ahmeetseker)

### Degistirildi
- refactor: simplify helpdesk UI styles and migrate communication fetching to a backend API method (@ahmeetseker)
- refactor: update replyViaAgent to use tradehub_core endpoint and simplify arguments (@ahmeetseker)

---
## [v1.1.4-rc.11] - 2026-04-16 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: add helpdesk component styling and design tokens for editorial operations UI (@ahmeetseker)
- feat(helpdesk): TicketsList + TicketDetail dark mode tutarlı, helpdesk.scss aktif (@ahmeetseker)
- feat(dashboard): Dinamik widget render, admin CRUD arayüzü ve satıcı görünümü eklendi. (@aliiball)
- feat(currency): Para birimi yönetimi ve TCMB kurları admin entegrasyonu yapıldı. (@aliiball)

### Duzeltildi
- fix: apply important flags to helpdesk input and select styles to ensure consistent rendering (@ahmeetseker)

### Degistirildi
- refactor: simplify helpdesk UI styles and migrate communication fetching to a backend API method (@ahmeetseker)
- refactor: update replyViaAgent to use tradehub_core endpoint and simplify arguments (@ahmeetseker)

---
## [v1.1.4-rc.10] - 2026-04-16 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: add helpdesk component styling and design tokens for editorial operations UI (@ahmeetseker)
- feat(helpdesk): TicketsList + TicketDetail dark mode tutarlı, helpdesk.scss aktif (@ahmeetseker)
- feat(dashboard): Dinamik widget render, admin CRUD arayüzü ve satıcı görünümü eklendi. (@aliiball)

### Duzeltildi
- fix: apply important flags to helpdesk input and select styles to ensure consistent rendering (@ahmeetseker)

### Degistirildi
- refactor: simplify helpdesk UI styles and migrate communication fetching to a backend API method (@ahmeetseker)
- refactor: update replyViaAgent to use tradehub_core endpoint and simplify arguments (@ahmeetseker)

---
## [v1.1.4-rc.9] - 2026-04-15 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: add helpdesk component styling and design tokens for editorial operations UI (@ahmeetseker)
- feat(helpdesk): TicketsList + TicketDetail dark mode tutarlı, helpdesk.scss aktif (@ahmeetseker)
- feat(dashboard): Dinamik widget render, admin CRUD arayüzü ve satıcı görünümü eklendi. (@aliiball)

### Duzeltildi
- fix: apply important flags to helpdesk input and select styles to ensure consistent rendering (@ahmeetseker)

### Degistirildi
- refactor: simplify helpdesk UI styles and migrate communication fetching to a backend API method (@ahmeetseker)
- refactor: update replyViaAgent to use tradehub_core endpoint and simplify arguments (@ahmeetseker)

---
## [v1.1.4-rc.8] - 2026-04-15 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: add helpdesk component styling and design tokens for editorial operations UI (@ahmeetseker)
- feat(helpdesk): TicketsList + TicketDetail dark mode tutarlı, helpdesk.scss aktif (@ahmeetseker)

### Duzeltildi
- fix: apply important flags to helpdesk input and select styles to ensure consistent rendering (@ahmeetseker)

### Degistirildi
- refactor: simplify helpdesk UI styles and migrate communication fetching to a backend API method (@ahmeetseker)
- refactor: update replyViaAgent to use tradehub_core endpoint and simplify arguments (@ahmeetseker)

---
## [v1.1.4-rc.7] - 2026-04-15 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: add helpdesk component styling and design tokens for editorial operations UI (@ahmeetseker)
- feat(helpdesk): TicketsList + TicketDetail dark mode tutarlı, helpdesk.scss aktif (@ahmeetseker)

### Duzeltildi
- fix: apply important flags to helpdesk input and select styles to ensure consistent rendering (@ahmeetseker)

### Degistirildi
- refactor: simplify helpdesk UI styles and migrate communication fetching to a backend API method (@ahmeetseker)
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
## [v1.1.4-rc.5] - 2026-04-14 RC

Bu surum rc.istoc.com'da test asamasindadir.

---
## [v1.1.4-rc.4] - 2026-04-14 RC

Bu surum rc.istoc.com'da test asamasindadir.

---
## [v1.1.4-rc.3] - 2026-04-13 RC

Bu surum rc.istoc.com'da test asamasindadir.

---
## [v1.1.4-rc.2] - 2026-04-13 RC

Bu surum rc.istoc.com'da test asamasindadir.

---
## [v1.1.4-rc.1] - 2026-04-13 RC

Bu surum rc.istoc.com'da test asamasindadir.

---
## [v1.1.4] - 2026-04-13 PROD

Bu surum istoc.com'da yayindadir.

### Eklendi
- feat(top-deals): Mağaza ön yüzüne “En İyi Fırsatlar” için arka uç iş akışı eklendi (@aliiball)
- feat(doctype-form): tab extension registry + SellerAddressesPanel entegrasyonu (@Bora)
- feat: Tema yöneticisine palet, tipografi ve input token gruplarını ekle (@ahmet)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@ahmet)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@ahmet)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@Ali)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@Ali)
- feat: configure VITE_API_BASE environment variable and update API utility to support absolute URLs for GitHub Pages deployment (@ahmet)
- feat: enable deployment for ali and bora branches and update pages trigger condition (@ahmet)
- feat: CSRF token için önbellekleme yönetimi eklendi ve ürün varyantlarına görsel yükleme desteği getirildi (@Bora)
- feat: Listeleme moderasyonunu; reddedilme geri bildirimleri, geliştirilmiş arayüz detayları ve tek kayıt görünümleri için otomatik yönlendirme ile iyileştir. (@Bora)
- feat(layout): mağaza sayfası düzenleme arayüzü eklendi (@ahmet)

### Duzeltildi
- fix(ci): prevent silent deploy failures with set -e and git reset (@ahmeetseker)
- fix: update API upload endpoint to use BASE_URL and add 404.html fallback for SPA routing (@ahmet)
- fix: VITE_STOREFRONT_URL relative URL yapıldı. (@Ali)

### Degistirildi
- refactor: ThemeManagerView'dan gradyan buton önizlemesini kaldır (@ahmet)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@ahmet)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@ahmet)
- refactor: standardize API calls and CSRF token retrieval using the global api helper (@ahmet)
- refactor: move badge count update to order loading logic in SellerOrdersView (@Bora)

---
## [v1.1.3-rc.16] - 2026-04-10 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(layout): mağaza sayfası düzenleme arayüzü eklendi (@TurksabYonetim)
- feat: Listeleme moderasyonunu; reddedilme geri bildirimleri, geliştirilmiş arayüz detayları ve tek kayıt görünümleri için otomatik yönlendirme ile iyileştir. (@boraydeger32)
- feat: CSRF token için önbellekleme yönetimi eklendi ve ürün varyantlarına görsel yükleme desteği getirildi (@boraydeger32)
- feat: enable deployment for ali and bora branches and update pages trigger condition (@TurksabYonetim)
- feat: configure VITE_API_BASE environment variable and update API utility to support absolute URLs for GitHub Pages deployment (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)
- feat: Tema yöneticisine palet, tipografi ve input token gruplarını ekle (@TurksabYonetim)
- feat(doctype-form): tab extension registry + SellerAddressesPanel entegrasyonu (@boraydeger32)
- feat(top-deals): Mağaza ön yüzüne “En İyi Fırsatlar” için arka uç iş akışı eklendi (@aliiball)

### Duzeltildi
- fix: VITE_STOREFRONT_URL relative URL yapıldı. (@Ali)
- fix: update API upload endpoint to use BASE_URL and add 404.html fallback for SPA routing (@TurksabYonetim)
- fix(ci): prevent silent deploy failures with set -e and git reset (@ahmeetseker)

### Degistirildi
- refactor: move badge count update to order loading logic in SellerOrdersView (@boraydeger32)
- refactor: standardize API calls and CSRF token retrieval using the global api helper (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)
- refactor: ThemeManagerView'dan gradyan buton önizlemesini kaldır (@TurksabYonetim)

---
## [v1.1.3-rc.15] - 2026-04-10 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(layout): mağaza sayfası düzenleme arayüzü eklendi (@TurksabYonetim)
- feat: Listeleme moderasyonunu; reddedilme geri bildirimleri, geliştirilmiş arayüz detayları ve tek kayıt görünümleri için otomatik yönlendirme ile iyileştir. (@boraydeger32)
- feat: CSRF token için önbellekleme yönetimi eklendi ve ürün varyantlarına görsel yükleme desteği getirildi (@boraydeger32)
- feat: enable deployment for ali and bora branches and update pages trigger condition (@TurksabYonetim)
- feat: configure VITE_API_BASE environment variable and update API utility to support absolute URLs for GitHub Pages deployment (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)
- feat: Tema yöneticisine palet, tipografi ve input token gruplarını ekle (@TurksabYonetim)
- feat(doctype-form): tab extension registry + SellerAddressesPanel entegrasyonu (@boraydeger32)

### Duzeltildi
- fix: VITE_STOREFRONT_URL relative URL yapıldı. (@Ali)
- fix: update API upload endpoint to use BASE_URL and add 404.html fallback for SPA routing (@TurksabYonetim)
- fix(ci): prevent silent deploy failures with set -e and git reset (@ahmeetseker)

### Degistirildi
- refactor: move badge count update to order loading logic in SellerOrdersView (@boraydeger32)
- refactor: standardize API calls and CSRF token retrieval using the global api helper (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)
- refactor: ThemeManagerView'dan gradyan buton önizlemesini kaldır (@TurksabYonetim)

---
## [v1.1.3-rc.14] - 2026-04-10 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(layout): mağaza sayfası düzenleme arayüzü eklendi (@TurksabYonetim)
- feat: Listeleme moderasyonunu; reddedilme geri bildirimleri, geliştirilmiş arayüz detayları ve tek kayıt görünümleri için otomatik yönlendirme ile iyileştir. (@boraydeger32)
- feat: CSRF token için önbellekleme yönetimi eklendi ve ürün varyantlarına görsel yükleme desteği getirildi (@boraydeger32)
- feat: enable deployment for ali and bora branches and update pages trigger condition (@TurksabYonetim)
- feat: configure VITE_API_BASE environment variable and update API utility to support absolute URLs for GitHub Pages deployment (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)
- feat: Tema yöneticisine palet, tipografi ve input token gruplarını ekle (@TurksabYonetim)
- feat(doctype-form): tab extension registry + SellerAddressesPanel entegrasyonu (@boraydeger32)

### Duzeltildi
- fix: VITE_STOREFRONT_URL relative URL yapıldı. (@Ali)
- fix: update API upload endpoint to use BASE_URL and add 404.html fallback for SPA routing (@TurksabYonetim)
- fix(ci): prevent silent deploy failures with set -e and git reset (@ahmeetseker)

### Degistirildi
- refactor: move badge count update to order loading logic in SellerOrdersView (@boraydeger32)
- refactor: standardize API calls and CSRF token retrieval using the global api helper (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)
- refactor: ThemeManagerView'dan gradyan buton önizlemesini kaldır (@TurksabYonetim)

---
## [v1.1.3-rc.13] - 2026-04-10 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(layout): mağaza sayfası düzenleme arayüzü eklendi (@TurksabYonetim)
- feat: Listeleme moderasyonunu; reddedilme geri bildirimleri, geliştirilmiş arayüz detayları ve tek kayıt görünümleri için otomatik yönlendirme ile iyileştir. (@boraydeger32)
- feat: CSRF token için önbellekleme yönetimi eklendi ve ürün varyantlarına görsel yükleme desteği getirildi (@boraydeger32)
- feat: enable deployment for ali and bora branches and update pages trigger condition (@TurksabYonetim)
- feat: configure VITE_API_BASE environment variable and update API utility to support absolute URLs for GitHub Pages deployment (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)
- feat: Tema yöneticisine palet, tipografi ve input token gruplarını ekle (@TurksabYonetim)

### Duzeltildi
- fix: VITE_STOREFRONT_URL relative URL yapıldı. (@Ali)
- fix: update API upload endpoint to use BASE_URL and add 404.html fallback for SPA routing (@TurksabYonetim)
- fix(ci): prevent silent deploy failures with set -e and git reset (@ahmeetseker)

### Degistirildi
- refactor: move badge count update to order loading logic in SellerOrdersView (@boraydeger32)
- refactor: standardize API calls and CSRF token retrieval using the global api helper (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)
- refactor: ThemeManagerView'dan gradyan buton önizlemesini kaldır (@TurksabYonetim)

---
## [v1.1.3-rc.12] - 2026-04-10 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(layout): mağaza sayfası düzenleme arayüzü eklendi (@TurksabYonetim)
- feat: Listeleme moderasyonunu; reddedilme geri bildirimleri, geliştirilmiş arayüz detayları ve tek kayıt görünümleri için otomatik yönlendirme ile iyileştir. (@boraydeger32)
- feat: CSRF token için önbellekleme yönetimi eklendi ve ürün varyantlarına görsel yükleme desteği getirildi (@boraydeger32)
- feat: enable deployment for ali and bora branches and update pages trigger condition (@TurksabYonetim)
- feat: configure VITE_API_BASE environment variable and update API utility to support absolute URLs for GitHub Pages deployment (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)
- feat: Tema yöneticisine palet, tipografi ve input token gruplarını ekle (@TurksabYonetim)

### Duzeltildi
- fix: VITE_STOREFRONT_URL relative URL yapıldı. (@Ali)
- fix: update API upload endpoint to use BASE_URL and add 404.html fallback for SPA routing (@TurksabYonetim)

### Degistirildi
- refactor: move badge count update to order loading logic in SellerOrdersView (@boraydeger32)
- refactor: standardize API calls and CSRF token retrieval using the global api helper (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)
- refactor: ThemeManagerView'dan gradyan buton önizlemesini kaldır (@TurksabYonetim)

---
## [v1.1.3-rc.11] - 2026-04-10 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(layout): mağaza sayfası düzenleme arayüzü eklendi (@TurksabYonetim)
- feat: Listeleme moderasyonunu; reddedilme geri bildirimleri, geliştirilmiş arayüz detayları ve tek kayıt görünümleri için otomatik yönlendirme ile iyileştir. (@boraydeger32)
- feat: CSRF token için önbellekleme yönetimi eklendi ve ürün varyantlarına görsel yükleme desteği getirildi (@boraydeger32)
- feat: enable deployment for ali and bora branches and update pages trigger condition (@TurksabYonetim)
- feat: configure VITE_API_BASE environment variable and update API utility to support absolute URLs for GitHub Pages deployment (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)
- feat: Tema yöneticisine palet, tipografi ve input token gruplarını ekle (@TurksabYonetim)

### Duzeltildi
- fix: VITE_STOREFRONT_URL relative URL yapıldı. (@Ali)
- fix: update API upload endpoint to use BASE_URL and add 404.html fallback for SPA routing (@TurksabYonetim)

### Degistirildi
- refactor: move badge count update to order loading logic in SellerOrdersView (@boraydeger32)
- refactor: standardize API calls and CSRF token retrieval using the global api helper (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)
- refactor: ThemeManagerView'dan gradyan buton önizlemesini kaldır (@TurksabYonetim)

---
## [v1.1.3-rc.10] - 2026-04-10 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(layout): mağaza sayfası düzenleme arayüzü eklendi (@TurksabYonetim)
- feat: Listeleme moderasyonunu; reddedilme geri bildirimleri, geliştirilmiş arayüz detayları ve tek kayıt görünümleri için otomatik yönlendirme ile iyileştir. (@boraydeger32)
- feat: CSRF token için önbellekleme yönetimi eklendi ve ürün varyantlarına görsel yükleme desteği getirildi (@boraydeger32)
- feat: enable deployment for ali and bora branches and update pages trigger condition (@TurksabYonetim)
- feat: configure VITE_API_BASE environment variable and update API utility to support absolute URLs for GitHub Pages deployment (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)
- feat: Tema yöneticisine palet, tipografi ve input token gruplarını ekle (@TurksabYonetim)

### Duzeltildi
- fix: VITE_STOREFRONT_URL relative URL yapıldı. (@Ali)
- fix: update API upload endpoint to use BASE_URL and add 404.html fallback for SPA routing (@TurksabYonetim)

### Degistirildi
- refactor: move badge count update to order loading logic in SellerOrdersView (@boraydeger32)
- refactor: standardize API calls and CSRF token retrieval using the global api helper (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)
- refactor: ThemeManagerView'dan gradyan buton önizlemesini kaldır (@TurksabYonetim)

---
## [v1.1.3-rc.9] - 2026-04-10 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(layout): mağaza sayfası düzenleme arayüzü eklendi (@TurksabYonetim)
- feat: Listeleme moderasyonunu; reddedilme geri bildirimleri, geliştirilmiş arayüz detayları ve tek kayıt görünümleri için otomatik yönlendirme ile iyileştir. (@boraydeger32)
- feat: CSRF token için önbellekleme yönetimi eklendi ve ürün varyantlarına görsel yükleme desteği getirildi (@boraydeger32)
- feat: enable deployment for ali and bora branches and update pages trigger condition (@TurksabYonetim)
- feat: configure VITE_API_BASE environment variable and update API utility to support absolute URLs for GitHub Pages deployment (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)
- feat: Tema yöneticisine palet, tipografi ve input token gruplarını ekle (@TurksabYonetim)

### Duzeltildi
- fix: VITE_STOREFRONT_URL relative URL yapıldı. (@Ali)
- fix: update API upload endpoint to use BASE_URL and add 404.html fallback for SPA routing (@TurksabYonetim)

### Degistirildi
- refactor: move badge count update to order loading logic in SellerOrdersView (@boraydeger32)
- refactor: standardize API calls and CSRF token retrieval using the global api helper (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)
- refactor: ThemeManagerView'dan gradyan buton önizlemesini kaldır (@TurksabYonetim)

---
## [v1.1.3-rc.8] - 2026-04-10 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(layout): mağaza sayfası düzenleme arayüzü eklendi (@TurksabYonetim)
- feat: Listeleme moderasyonunu; reddedilme geri bildirimleri, geliştirilmiş arayüz detayları ve tek kayıt görünümleri için otomatik yönlendirme ile iyileştir. (@boraydeger32)
- feat: CSRF token için önbellekleme yönetimi eklendi ve ürün varyantlarına görsel yükleme desteği getirildi (@boraydeger32)
- feat: enable deployment for ali and bora branches and update pages trigger condition (@TurksabYonetim)
- feat: configure VITE_API_BASE environment variable and update API utility to support absolute URLs for GitHub Pages deployment (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)
- feat: Tema yöneticisine palet, tipografi ve input token gruplarını ekle (@TurksabYonetim)

### Duzeltildi
- fix: VITE_STOREFRONT_URL relative URL yapıldı. (@Ali)
- fix: update API upload endpoint to use BASE_URL and add 404.html fallback for SPA routing (@TurksabYonetim)

### Degistirildi
- refactor: move badge count update to order loading logic in SellerOrdersView (@boraydeger32)
- refactor: standardize API calls and CSRF token retrieval using the global api helper (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)
- refactor: ThemeManagerView'dan gradyan buton önizlemesini kaldır (@TurksabYonetim)

---
## [v1.1.3-rc.7] - 2026-04-09 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(layout): mağaza sayfası düzenleme arayüzü eklendi (@TurksabYonetim)
- feat: Listeleme moderasyonunu; reddedilme geri bildirimleri, geliştirilmiş arayüz detayları ve tek kayıt görünümleri için otomatik yönlendirme ile iyileştir. (@boraydeger32)
- feat: CSRF token için önbellekleme yönetimi eklendi ve ürün varyantlarına görsel yükleme desteği getirildi (@boraydeger32)
- feat: enable deployment for ali and bora branches and update pages trigger condition (@TurksabYonetim)
- feat: configure VITE_API_BASE environment variable and update API utility to support absolute URLs for GitHub Pages deployment (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)

### Duzeltildi
- fix: VITE_STOREFRONT_URL relative URL yapıldı. (@Ali)
- fix: update API upload endpoint to use BASE_URL and add 404.html fallback for SPA routing (@TurksabYonetim)

### Degistirildi
- refactor: move badge count update to order loading logic in SellerOrdersView (@boraydeger32)
- refactor: standardize API calls and CSRF token retrieval using the global api helper (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)
- refactor: ThemeManagerView'dan gradyan buton önizlemesini kaldır (@TurksabYonetim)

---
## [v1.1.3-rc.6] - 2026-04-09 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(layout): mağaza sayfası düzenleme arayüzü eklendi (@TurksabYonetim)
- feat: Listeleme moderasyonunu; reddedilme geri bildirimleri, geliştirilmiş arayüz detayları ve tek kayıt görünümleri için otomatik yönlendirme ile iyileştir. (@boraydeger32)
- feat: CSRF token için önbellekleme yönetimi eklendi ve ürün varyantlarına görsel yükleme desteği getirildi (@boraydeger32)
- feat: enable deployment for ali and bora branches and update pages trigger condition (@TurksabYonetim)
- feat: configure VITE_API_BASE environment variable and update API utility to support absolute URLs for GitHub Pages deployment (@TurksabYonetim)
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)

### Duzeltildi
- fix: VITE_STOREFRONT_URL relative URL yapıldı. (@Ali)
- fix: update API upload endpoint to use BASE_URL and add 404.html fallback for SPA routing (@TurksabYonetim)

### Degistirildi
- refactor: move badge count update to order loading logic in SellerOrdersView (@boraydeger32)
- refactor: standardize API calls and CSRF token retrieval using the global api helper (@TurksabYonetim)
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)

---
## [v1.1.3-rc.4] - 2026-04-09 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)
- feat: Token yapılandırması ve canlı önizleme desteğiyle birlikte sitenin temasını dinamik olarak yönetmeyi sağlayan ThemeManagerView bileşeni hayata geçirildi. (@TurksabYonetim)

### Degistirildi
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)

---
## [v1.1.3-rc.3] - 2026-04-08 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)

### Degistirildi
- refactor: düzen tutarlılığı için sidebar genişliği ve öğe stilleri güncellendi (@TurksabYonetim)

---
## [v1.1.3-rc.2] - 2026-04-08 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(Certification): Sertifika yönetimi admin panel entegrasyonu + satıcı izolasyonu yapıldı (@TurksabYonetim)

---
## [v1.1.3-rc.1] - 2026-04-06 RC

Bu surum rc.istoc.com'da test asamasindadir.

---
## [v1.1.3] - 2026-04-06 PROD

Bu surum istoc.com'da yayindadir.

### Eklendi
- feat: configure VITE_API_BASE environment variable and update API utility to support absolute URLs for GitHub Pages deployment (@ahmet)
- feat: enable deployment for ali and bora branches and update pages trigger condition (@ahmet)

### Duzeltildi
- fix: update API upload endpoint to use BASE_URL and add 404.html fallback for SPA routing (@ahmet)

### Degistirildi
- refactor: standardize API calls and CSRF token retrieval using the global api helper (@ahmet)

---
## [v1.1.2-rc.3] - 2026-04-06 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat: enable deployment for ali and bora branches and update pages trigger condition (@TurksabYonetim)
- feat: configure VITE_API_BASE environment variable and update API utility to support absolute URLs for GitHub Pages deployment (@TurksabYonetim)

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
## [v1.1.2-rc.1] - 2026-04-06 RC

Bu surum rc.istoc.com'da test asamasindadir.

---
## [v1.1.2] - 2026-04-06 PROD

Bu surum istoc.com'da yayindadir.

---
## [v1.1.1-rc.1] - 2026-04-06 RC

Bu surum rc.istoc.com'da test asamasindadir.

---
## [v1.1.1] - 2026-04-06 PROD

Bu surum istoc.com'da yayindadir.

---
## [v1.1.0-rc.2] - 2026-04-06 RC

Bu surum rc.istoc.com'da test asamasindadir.

---
## [v1.1.0-rc.1] - 2026-04-04 RC

Bu surum rc.istoc.com'da test asamasindadir.

---
## [v1.1.0] - 2026-04-04 PROD

Bu surum istoc.com'da yayindadir.

### Eklendi
- feat: CSRF token için önbellekleme yönetimi eklendi ve ürün varyantlarına görsel yükleme desteği getirildi (@Bora)
- feat: Listeleme moderasyonunu; reddedilme geri bildirimleri, geliştirilmiş arayüz detayları ve tek kayıt görünümleri için otomatik yönlendirme ile iyileştir. (@Bora)
- feat(layout): mağaza sayfası düzenleme arayüzü eklendi (@ahmet)

### Duzeltildi
- fix: VITE_STOREFRONT_URL relative URL yapıldı. (@Ali)

### Degistirildi
- refactor: move badge count update to order loading logic in SellerOrdersView (@Bora)

---
## [v1.0.2-rc.6] - 2026-04-03 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(layout): mağaza sayfası düzenleme arayüzü eklendi (@TurksabYonetim)
- feat: Listeleme moderasyonunu; reddedilme geri bildirimleri, geliştirilmiş arayüz detayları ve tek kayıt görünümleri için otomatik yönlendirme ile iyileştir. (@TurksabYonetim)
- feat: CSRF token için önbellekleme yönetimi eklendi ve ürün varyantlarına görsel yükleme desteği getirildi (@TurksabYonetim)

### Duzeltildi
- fix: VITE_STOREFRONT_URL relative URL yapıldı. (@Ali)

### Degistirildi
- refactor: move badge count update to order loading logic in SellerOrdersView (@TurksabYonetim)

---
## [v1.0.2-rc.5] - 2026-04-03 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(layout): mağaza sayfası düzenleme arayüzü eklendi (@TurksabYonetim)
- feat: Listeleme moderasyonunu; reddedilme geri bildirimleri, geliştirilmiş arayüz detayları ve tek kayıt görünümleri için otomatik yönlendirme ile iyileştir. (@TurksabYonetim)

### Duzeltildi
- fix: VITE_STOREFRONT_URL relative URL yapıldı. (@Ali)

---
## [v1.0.2-rc.4] - 2026-04-03 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(layout): mağaza sayfası düzenleme arayüzü eklendi (@TurksabYonetim)
- feat: Listeleme moderasyonunu; reddedilme geri bildirimleri, geliştirilmiş arayüz detayları ve tek kayıt görünümleri için otomatik yönlendirme ile iyileştir. (@TurksabYonetim)

---
## [v1.0.2-rc.3] - 2026-04-02 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(layout): mağaza sayfası düzenleme arayüzü eklendi (@TurksabYonetim)

---
## [v1.0.2-rc.2] - 2026-04-01 RC

Bu surum rc.istoc.com'da test asamasindadir.

---
## [v1.0.2-rc.1] - 2026-04-01 RC

Bu surum rc.istoc.com'da test asamasindadir.

---
## [v1.0.2] - 2026-04-01 PROD

Bu surum istoc.com'da yayindadir.

### Eklendi
- feat(ci): GitHub API ile CHANGELOG oluşturma sürecini güncellendi (@ahmet)

---
## [v1.0.1-rc.2] - 2026-04-01 RC

Bu surum rc.istoc.com'da test asamasindadir.

### Eklendi
- feat(ci): GitHub API ile CHANGELOG oluşturma sürecini güncellendi (@TurksabYonetim)

---
## [v1.0.1-rc.1] - 2026-04-01 RC

Bu surum rc.istoc.com'da test asamasindadir.

---
## [v1.0.1] - 2026-04-01 PROD

Bu surum istoc.com'da yayindadir.

---
## [v2.0.0-rc.1] - 2026-03-31 RC

Bu surum rc.istoc.com'da test asamasindadir.

---
## [v2.0.0] - 2026-03-31 PROD

Bu surum istoc.com'da yayindadir.

---
## [v1.0.0-rc.1] - 2026-03-31 RC

Bu surum rc.istoc.com'da test asamasindadir.

---
# admin-panel Changelog

Tüm önemli değişiklikler bu dosyada belgelenir.
Format: [SemVer](https://semver.org/) standardına göre.

---
