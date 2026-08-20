// ÜRETİLMİŞ DOSYA — elle düzenleme. Kaynak: tradehub_core/docs/api/openapi-http.yaml
// Kaynak sha256: f70daec447069d9daa7ca37b948ac5505b4e9c547489084ead63806919f3f4e0
// Üretici: openapi-typescript@7.13.0 (scripts/sync-api-types.mjs)
// Yeniden üret: npm run sync:api · Doğrula: npm run sync:api:check
export interface paths {
    "/api/method/tradehub_core.api.media_manifest.get_manifest": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Tek ilanın teslim manifesti.
         * @description Tek ilanın teslim manifesti. `Media Engine Settings.manifest_api_enabled` bayrağı KAPALIYKEN de 200 döner: `enabled=false`, `renditions=[]` ve `fallback` alanında ham `file_url`. Uç hiçbir durumda istisna fırlatmaz — bir manifest hatası vitrini kırmamalıdır. Bulunamayan ilan ile yayınlanmamış ilan AYIRT EDİLMEZ (yayın takvimi sızmasın).
         */
        get: operations["media_manifest_get_manifest"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_manifest.get_manifest_batch": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Çok ilan, tek istek — listeleme sayfası için.
         * @description Çok ilan tek istek. `listings` JSON dizisi ya da virgüllü liste kabul eder (GET üzerinden geldiği için dizge). `max_batch` (50) üstü REDDEDİLMEZ, kırpılır ve kırpılanlar `skipped` içinde geri verilir. `missing` DAİMA boştur: misafire hangi kimliğin gerçek olduğunu söylemek numaralandırma kehanetidir.
         */
        get: operations["media_manifest_get_manifest_batch"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_manifest.get_signed_url": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Private bir medya dosyası için süreli, imzalı adres.
         * @description `media_access.get_signed_url`e devreder ve yanıta `cache_control: private, no-store` ekler. Kripto burada yazılmaz. Guest çağıramaz; whitelist bayrağı gevşetilse bile gövdede ikinci bir oturum kontrolü var.
         */
        get: operations["media_manifest_get_signed_url"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_manifest.manifest_batch": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** N dosya adresi → `{adres: manifest}` haritası — panelin türev tablosu için. */
        get: operations["media_manifest_manifest_batch"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_access.get_signed_url": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Çağıranın read yetkisi olan bir private dosya için imzalı süreli link üret.
         * @description Süreli imzalı indirme adresi üretir (`frappe.utils.verified_command`, site secret + HMAC-SHA512). İmzaya `file`, `exp` ve — satırın `content_hash`'i varsa — `blob` girer. Yetkisiz kullanıcı için imza ÜRETİLMEZ: `File.has_permission("read")` ve `blob_matches_row` kapılarının ikisi de geçilmelidir; her ret denetime yazılır.
         */
        get: operations["media_access_get_signed_url"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_access.download": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * İmzalı süreli link ile private dosya indir — oturum GEREKMEZ.
         * @description İmzalı adresle private dosya indirir — OTURUM GEREKMEZ. Parametreler gövdeden değil `frappe.form_dict`ten okunur (`file`, `exp`, `blob`, `_signature`). Sıra: imza → yol → süre → yol (2. kez) → blob bağı → servis. Her ret denetime yazılır. BAŞARIDA gövde JSON DEĞİLDİR: dosyanın kendisi döner. REDDE Frappe'nin HTML hata sayfası döner, JSON zarf değil.
         */
        get: operations["media_access_download"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_crop.get_intent": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Kırpma niyetini ve her profil için çözülmüş pencereleri döndür. */
        get: operations["media_crop_get_intent"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_crop.save_intent": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Kırpma niyetini kaydet. **İdempotent** — ikinci çağrı yeni satır açmaz. */
        get: operations["media_crop_save_intent"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_crop.suggest_focal": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Odak noktası öner. **Yazmaz** — öneri kullanıcı onayına sunulur. */
        get: operations["media_crop_suggest_focal"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.get_my_media": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Satıcının kendi dosyaları — sayfalı liste. */
        get: operations["seller_media_get_my_media"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.browse_my_media": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Satıcının KENDİ medyası — sanal klasör ağacında bir seviye.
         * @description Satıcının KENDİ medyası, sanal klasör ağacında tek seviye. `store` parametresi YOKTUR ve eklenmeyecektir: mağaza her çağrıda oturumdan türetilir. Bulunamayan kategori/ilan için hata değil BOŞ sonuç döner — "yok" ile "senin değil" ayrımı başka mağazanın kimliklerini keşfe kapı açardı. Dönüş şekli seviyeye göre değişir: kök ve kategori seviyeleri `{folders:[…]}`, dosya seviyeleri `{items:[…], total:n}`.
         */
        get: operations["seller_media_browse_my_media"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.get_my_usage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Bu dosyayı KENDİ hangi ürünlerimde kullanıyorum. */
        get: operations["seller_media_get_my_usage"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.list_orphans": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** ÖKSÜZ dosyalarım — hiçbir taranan kaynak alanda geçmeyen ve */
        get: operations["seller_media_list_orphans"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.preview_release": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Bırakmadan önce özet — onay ekranı uyarıyı buna göre kurar. */
        get: operations["seller_media_preview_release"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.archive_media": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Seçili dosyaları ARŞİVLE — geri alınabilir. */
        get: operations["seller_media_archive_media"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.unarchive_media": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Arşivden çıkar — dosya aktif listeye döner. */
        get: operations["seller_media_unarchive_media"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.purge_media": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** KALICI SİL — geri alınamaz. */
        get: operations["seller_media_purge_media"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.get_my_summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Üst şerit — dosya adedi, gerçek depolama kullanımı, bırakılan adedi. */
        get: operations["seller_media_get_my_summary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.upload_media": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Satıcı kütüphanesine dosya yükle. */
        get: operations["seller_media_upload_media"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.upload_limits": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Sunucunun uyguladığı sınırlar — istemci aynısını uygulasın diye. */
        get: operations["seller_media_upload_limits"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.upload_begin": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Parçalı yükleme oturumu aç. */
        post: operations["seller_media_upload_begin"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.upload_chunk": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Tek parçayı gönder. Parçalar sırasız gelebilir. */
        post: operations["seller_media_upload_chunk"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.upload_finish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Parçaları birleştir ve dosyayı kaydet. */
        post: operations["seller_media_upload_finish"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.upload_abort": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Yarıda bırakılan yüklemeyi temizle — iptal gerçekten iptal olsun. */
        post: operations["seller_media_upload_abort"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.upload_status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Oturumun durumu — kopan yükleme kaldığı yerden sürebilsin. */
        get: operations["seller_media_upload_status"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.update_media": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Başlık, alternatif metin, açıklama, etiket, favori güncelle. */
        get: operations["seller_media_update_media"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.toggle_favorite": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Favoriyi ters çevir. Favori mağaza bazında — paylaşılan dosyada */
        get: operations["seller_media_toggle_favorite"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.add_tag": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Seçili dosyalara etiket ekle. */
        get: operations["seller_media_add_tag"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.get_dimensions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Gerçek çözünürlük — ilk soruluşta diskten okunup saklanır. */
        get: operations["seller_media_get_dimensions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.retry_video": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Başarısız (dead-letter) video işlemesini yeniden başlat (TUR-296). */
        post: operations["seller_media_retry_video"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.rename_media": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Görünen adı değiştir. Dosyanın YOLU değişmez — değişseydi onu gösteren */
        get: operations["seller_media_rename_media"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.duplicate_media": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Dosyanın gerçek bir kopyasını üret. */
        get: operations["seller_media_duplicate_media"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.replace_media": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Dosyanın içeriğini değiştir — yolu ve tüm bağları korunur. */
        get: operations["seller_media_replace_media"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.create_backup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Mağazanın medyasının anlık görüntüsünü al. */
        post: operations["seller_media_create_backup"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.list_backups": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Mağazanın yedekleri + disk kullanımı. */
        get: operations["seller_media_list_backups"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.verify_backup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Yedek geri yüklenebilir mi — hiçbir şeye dokunmadan kontrol. */
        get: operations["seller_media_verify_backup"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.plan_backup_restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Geri yükleme yapılsa ne olurdu — rapor, uygulama değil. */
        get: operations["seller_media_plan_backup_restore"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.apply_backup_restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Geri yüklemeyi uygula. */
        post: operations["seller_media_apply_backup_restore"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.delete_backup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Bir yedeği sil. Son yedek silinemez (kural `seller_backup`te). */
        post: operations["seller_media_delete_backup"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.start_backup_export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Yedeği indirilebilir pakete dönüştürmeyi başlat (arkada çalışır). */
        post: operations["seller_media_start_backup_export"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.backup_export_status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Paket hazır mı — ekran bunu yokluyor. */
        get: operations["seller_media_backup_export_status"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.discard_backup_export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Paketi sunucudan kaldır. Yedeğin kendisine dokunulmaz. */
        post: operations["seller_media_discard_backup_export"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.download_backup_export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Paketi indir. */
        get: operations["seller_media_download_backup_export"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.list_folders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Mağazanın TÜM klasörleri (düz liste, `parent_folder` ile ağaç kurulur) */
        get: operations["seller_media_list_folders"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.create_folder": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Klasör aç. Ad/derinlik/benzersizlik kuralları DocType'ta */
        post: operations["seller_media_create_folder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.rename_folder": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Klasörün adını değiştir. Kimlik (`name`) değişmez — değişseydi alt */
        post: operations["seller_media_rename_folder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.delete_folder": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Klasörü sil. DOLU klasör reddedilir (alt klasör ya da dosya varsa) — */
        post: operations["seller_media_delete_folder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.move_media": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Seçili dosyaları klasöre taşı — `folder` boşsa köke (bağ silinir). */
        post: operations["seller_media_move_media"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.list_folder_media": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Bir klasördeki dosyalar — `get_my_media` satırlarıyla aynı biçimde, */
        get: operations["seller_media_list_folder_media"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.seller_media.find_in_my_library": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Yükleme ön kontrolü için tekilleştirme araması (T-042). */
        get: operations["seller_media_find_in_my_library"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.get_image_inventory": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Tekilleştirilmiş public dosya listesi + üst şerit özeti. */
        get: operations["media_admin_get_image_inventory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.preview_trash": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Seçimin kullanım kırılımı — onay ekranı uyarıyı buna göre kurar. */
        get: operations["media_admin_preview_trash"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.get_file_usage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Tek dosyanın tam kullanım dökümü — detay penceresi. */
        get: operations["media_admin_get_file_usage"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.get_optimization_status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Redis'teki ilerleme. Kayıt yoksa {"state": "not_found"}. */
        get: operations["media_admin_get_optimization_status"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.start_image_optimization": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Optimizasyonu kuyruğa al ve takip anahtarı dön. */
        post: operations["media_admin_start_image_optimization"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.restore_image": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Optimize edilmiş TEK görseli arşivdeki orijinaliyle geri al (senkron). */
        post: operations["media_admin_restore_image"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.retry_transcode": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Dead-letter'daki videoyu yönetici eliyle yeniden kuyruğa koy (TUR-296). */
        post: operations["media_admin_retry_transcode"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.start_restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Toplu geri alma — optimizasyonla aynı kuyruk ve ilerleme mekanizması. */
        post: operations["media_admin_start_restore"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.trash_files": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Seçili dosyaları çöp kutusuna taşı — 30 gün sonra kalıcı silinir. */
        post: operations["media_admin_trash_files"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.restore_from_trash": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Çöpten geri al. */
        post: operations["media_admin_restore_from_trash"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.delete_trashed": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Çöpteki seçili dosyaları KALICI sil. Yalnız System Manager. */
        post: operations["media_admin_delete_trashed"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.purge_trash": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Çöptekileri KALICI sil. Yalnız System Manager. */
        post: operations["media_admin_purge_trash"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.purge_archive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Arşivdeki orijinalleri sil — kazanılan alanı kalıcı hâle getirir. */
        post: operations["media_admin_purge_archive"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.get_restorable_count": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Filtreye uyan kaç dosya geri alınabilir — onay ekranı için. */
        get: operations["media_admin_get_restorable_count"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.get_pending_count": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Mevcut filtrelerle kaç dosyanın işleneceği — onay ekranı bunu gösterir. */
        get: operations["media_admin_get_pending_count"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.get_media_audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Medya denetim kayıtları — "kim ne zaman ne yaptı" görünümü (TUR-140). */
        get: operations["media_admin_get_media_audit"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.get_file_references": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Bu dosyayı gösteren TÜM satırlar — silmeden önce etki listesi. */
        get: operations["media_admin_get_file_references"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.set_access_level": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Dosyanın erişim seviyesini public↔private çevir (TUR-126 §4). */
        post: operations["media_admin_set_access_level"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.get_private_files": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Özel (private) dosya envanteri — panel "Özel dosyalar" görünümü (TUR-126 §4.2). */
        get: operations["media_admin_get_private_files"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.browse_media": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Medya Gezgini — sanal klasör ağacında bir seviye (TUR-126 devamı). */
        get: operations["media_admin_browse_media"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.get_record_media": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Ters arama — bir ürünün/mağazanın kullandığı tüm medya (TUR-136). */
        get: operations["media_admin_get_record_media"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.get_dangling_references": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Hedefi olmayan referanslar — geçmişte bozulmuş bağların raporu. */
        get: operations["media_admin_get_dangling_references"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.repair_dangling_references": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Kırık referansları temizle. Varsayılan kuru çalışma — yıkıcı iş sessizce */
        post: operations["media_admin_repair_dangling_references"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.get_media_audit_facets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Filtre rayı sayaçları — hangi olaydan kaç tane, kaç reddedilen istek. */
        get: operations["media_admin_get_media_audit_facets"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.get_media_audit_actors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Denetimde geçen kullanıcı/satıcı listesi — filtre açılır kutusu için. */
        get: operations["media_admin_get_media_audit_actors"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.get_media_audit_report": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Tek denetim kaydının tam raporu — dosya künyesi, kullanım, etki, geçmiş. */
        get: operations["media_admin_get_media_audit_report"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.get_media_audit_targets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** En çok olay üreten dosyalar. */
        get: operations["media_admin_get_media_audit_targets"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.export_media_audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Filtreye uyan kayıtları CSV olarak döndür. */
        get: operations["media_admin_export_media_audit"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.list_media_backups": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Alınmış yedekler + deponun kapladığı yer. */
        get: operations["media_admin_list_media_backups"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.create_media_backup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Elle yedek al. Zamanlanmış görev bunu günlük çalıştırıyor. */
        post: operations["media_admin_create_media_backup"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.verify_media_backup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Yedek geri yüklenebilir mi — dokunmadan kontrol. */
        get: operations["media_admin_verify_media_backup"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.plan_media_restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Geri yüklersem ne olur — HİÇBİR ŞEYE DOKUNMAZ. */
        get: operations["media_admin_plan_media_restore"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.apply_media_restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Geri yüklemeyi uygula. */
        post: operations["media_admin_apply_media_restore"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.repair_missing_media": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Kaydı olup dosyası kaybolanları en yeni yedekten geri getir. */
        post: operations["media_admin_repair_missing_media"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.prune_media_backups": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Eski yedekleri ve artık kimsenin göstermediği içerikleri temizle. */
        post: operations["media_admin_prune_media_backups"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.delete_media_backup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Tek bir yedeği sil. */
        post: operations["media_admin_delete_media_backup"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.start_media_backup_export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Paketlemeyi başlat — hazırlık arkada sürer, bu uç beklemez. */
        post: operations["media_admin_start_media_backup_export"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.media_backup_export_status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Paket ne durumda — ekran bunu düzenli aralıkla sorar. */
        get: operations["media_admin_media_backup_export_status"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.discard_media_backup_export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Hazır paketi sunucudan kaldır. */
        post: operations["media_admin_discard_media_backup_export"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.download_media_backup_export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Paketi indir. */
        get: operations["media_admin_download_media_backup_export"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.scan_overview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Tarama politikasının ve envanterin özeti — panel üst bandı. */
        get: operations["media_admin_scan_overview"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.list_scan_hold": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Taraması bitmemiş, bu yüzden erişime kapalı bekleyen dosyalar. */
        get: operations["media_admin_list_scan_hold"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.sweep_scans": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Süpürücüyü elle tetikle — takılı kalmış taramaları topla. */
        post: operations["media_admin_sweep_scans"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.list_quarantine": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Karantinadaki dosyalar — envanter listesinden AYRI uç. */
        get: operations["media_admin_list_quarantine"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.retry_scan": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Taranamamış (`failed`) dosyayı yeniden kuyruğa koy. */
        post: operations["media_admin_retry_scan"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.release_quarantine": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Yanlış pozitifi karantinadan çıkar — dosyayı yerine koy. */
        post: operations["media_admin_release_quarantine"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.media_admin.scan_backfill": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Hiç taranmamış mevcut dosyaları parça parça kuyruğa al. */
        post: operations["media_admin_scan_backfill"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.api.rum.collect": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * RUM örneklem gövdesini kabul et — `POST /api/method/tradehub_core.api.rum.collect`.
         * @description RUM (gerçek kullanıcı ölçümü) beacon'ı. GÖVDE SORGU PARAMETRESİ DEĞİLDİR: `Content-Type: text/plain;charset=UTF-8` + JSON `{"samples": [...]}` — `sendBeacon` başlık gönderemediği ve `application/json` CORS ön-kontrolü tetiklediği için (rapor 60 §5.2). Geçersiz örnek de 200 alır; ret sebebi istemciye SIZDIRILMAZ. Oran sınırı aşımı 429. CSRF muafiyeti framework'ün doğal davranışı (misafir oturumunda kayıtlı token yok) — `ignore_csrf` AÇILMADI; gerekçe `api/rum.py` modül başlığında.
         */
        post: operations["rum_collect"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.tradehub_core.doctype.media_storage_settings.media_storage_settings.get_storage_status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Ayardan kurulan gerçek depo planını döndür. SIR İÇERMEZ.
         * @description Ayardan kurulan gerçek depo planını döndürür (sır İÇERMEZ: anahtar, parola, imza gizi yok — yalnız kip, backend sınıfı ve engelleyiciler). `docs/reports/32-faz8-api-kapanis.md` §5 bu ucu HTTP 500 `ImportError` ile UYUŞMAZ işaretlemişti; DocType satırı veritabanına girdikten sonra 2026-08-19'da yeniden ölçüldü ve 200 döndü.
         */
        get: operations["media_storage_settings_get_storage_status"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/method/tradehub_core.tradehub_core.doctype.media_storage_settings.media_storage_settings.test_connection": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Yapılandırılmış hedefe GERÇEK bir bağlantı dene.
         * @description Yapılandırılmış hedefe gerçek bağlantı denemesi (`s3` | `cdn` | `imgproxy`). Hedef tanımsızsa istisna FIRLATMAZ: `ok: false` ve `steps[].detail` ile söyler. Bu uç da 32 numaralı raporda UYUŞMAZ işaretliydi; bugün 200 dönüyor.
         */
        get: operations["media_storage_settings_test_connection"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** @description Frappe her `@frappe.whitelist()` dönüşünü `message` altına sarar. Bu belgedeki her yanıt şeması `message`in İÇERİĞİDİR. */
        FrappeEnvelope: {
            message: unknown;
        };
        /** @description `get_storage_status` gövdesi — 2026-08-19'da ÖLÇÜLDÜ. Sır taşımaz. */
        StorageStatus: {
            plan: {
                /**
                 * @example local
                 * @example s3
                 * @example tiered
                 */
                mode: string;
                requested_mode: string;
                /** @description İstenen kipe düşülemediyse true. */
                degraded: boolean;
                downgraded_from?: string;
                reasons?: string[];
                signer_available: boolean;
                /** @example LocalDiskStorage */
                backend: string;
            };
            /** @description Kipi güvenle açmayı engelleyen bilinen kusurlar (`B-02` gibi kodlu). */
            blockers: string[];
        };
        /** @description `test_connection` gövdesi — ÖLÇÜLDÜ. Başarısızlık istisna DEĞİL, `ok: false`. */
        ConnectionTest: {
            /**
             * @example s3
             * @example cdn
             * @example imgproxy
             */
            target: string;
            ok: boolean;
            steps: {
                step: string;
                ok: boolean;
                ms?: number;
                detail?: string;
            }[];
            ms?: number;
        };
        /** @description `get_intent` / `save_intent` gövdesi — ÖLÇÜLDÜ. Niyet hiç yazılmamışsa da 200 döner: `exists: false` ve örtük (merkez) pencereler. */
        CropIntentView: {
            asset: string;
            /** @example product.image */
            slot_key: string;
            exists: boolean;
            intent: components["schemas"]["CropIntentBody"];
            source: {
                width: number;
                height: number;
                source_ratio: number;
            };
            windows: components["schemas"]["CropWindow"][];
            /** @description Tırnaklı. Gövdede taşınır, BAŞLIKTA değil. */
            etag: string;
            /** @description Kütüphanenin niyet ettiği durum; HTTP durumu DEĞİL. */
            status?: number;
        };
        /** @description Kaydedilmiş niyet. Yazılmamışsa tüm koordinatlar `null`. */
        CropIntentBody: {
            /** @description 0-1 normalize. */
            focal_x: number | null;
            focal_y: number | null;
            safe_x?: number | null;
            safe_y?: number | null;
            safe_w?: number | null;
            safe_h?: number | null;
            /** @description Stüdyonun zoom çarpanı, 1-16. `center_x`/`center_y` ile BİRLİKTE. */
            zoom?: number | null;
            /** @description Pan merkezi, 0-1 normalize. */
            center_x?: number | null;
            center_y?: number | null;
            /**
             * @example manual
             * @example smartcrop
             * @example center
             */
            method: string;
            confidence?: number | null;
            approved_by_user: boolean;
            /** @description ÖLÇÜM: bu dizi bugün YAZILAMIYOR — `x-mismatch`e bakın. */
            overrides: Record<string, never>[];
            /** @description ÖLÇÜMDE kayıt yazıldıktan sonra da `null` geldi. */
            updated_at?: string | null;
        };
        /** @description Tek profil için çözülmüş pencere — ÖLÇÜLDÜ (7 profil: w96…w1920). */
        CropWindow: {
            x: number;
            y: number;
            w: number;
            h: number;
            /**
             * @example focal
             * @example center
             * @example override
             * @example safe_focal
             * @example smartcrop
             */
            method: string;
            priority?: number;
            /**
             * @description SLOT İÇİ kısa ad. `Media Profile` DocType'ındaki kayıt adı `product.image:w384` biçimindedir — İKİSİ AYNI DEĞİL.
             * @example w384
             */
            profile: string;
            target_ratio?: number | null;
            source_ratio?: number;
            confidence?: number | null;
            approved_by_user?: boolean;
            is_suggestion?: boolean;
            width: number;
            /**
             * @example pad
             * @example cover
             */
            fit: string;
            pixels: {
                left: number;
                top: number;
                width: number;
                height: number;
            };
        };
        /** @description `suggest_focal` gövdesi — ÖLÇÜLDÜ. YAZMAZ (`applied: false`). */
        FocalSuggestion: {
            asset: string;
            slot_key: string;
            /** @description DAİMA false — öneri onaya sunulur. */
            applied: boolean;
            suggestion: {
                /** @description DAİMA 0-1. */
                focal_x: number;
                focal_y: number;
                confidence: number;
                /** @description false ise merkez döndü, hata DEĞİL. */
                measured: boolean;
                /** @example measured */
                reason: string;
                grid?: number;
                threshold?: number;
                /** @description ÖLÇÜMDE false — eşik kalibre EDİLMEMİŞ, yanıt bunu söylüyor. */
                threshold_calibrated?: boolean;
                above_threshold?: boolean;
                method: string;
            };
            windows: components["schemas"]["CropWindow"][];
            status?: number;
        };
        /** @description `get_intent` + eşleşen `if_none_match` gövdesi — ÖLÇÜLDÜ. HTTP durumu **200**'dür. DİKKAT: manifest ucunun `{not_modified: true}` bayrağıyla AYNI DEĞİL; bu katmanda İKİ ayrı 'değişmedi' sözleşmesi var. */
        CropNotModified: {
            etag: string;
            /**
             * @description Gövdedeki sayı; HTTP durumu 200.
             * @example 304
             */
            status: number;
        };
        /** @description Frappe'nin istisna zarfı. `pipeline/api/envelope.py`nin `{error_code, retryable, …}` gövdesi ile AYNI DEĞİLDİR: whitelist katmanı o zarfı kullanmaz. */
        FrappeError: {
            exception?: string;
            exc_type?: string;
            /** @description JSON dizisi olarak traceback. */
            exc?: string;
            _server_messages?: string;
        };
        /** @description Düz türev satırı — `renditions` dizisinin elemanı. */
        RenditionRow: {
            /** @description Ham `file_url`. */
            source: string;
            asset: string;
            /**
             * @example w384
             * @example w768
             */
            profile: string;
            /** @description `Media Rendition.file_url` — DİSKTEKİ adres. */
            url: string;
            width: number;
            height: number;
            /**
             * @example avif
             * @example webp
             */
            format: string;
            bytes: number;
        };
        ManifestImage: {
            file_url: string;
            alt_text: string;
            primary: boolean;
            /** @description `Media Asset` adı; yoksa boş dizge. */
            asset: string;
            /** @description `RenderManifest.to_dict()` + yalnız üretilmiş `variants`. Türev yoksa `null` — istemci ham `file_url`a düşer. */
            manifest: Record<string, never> | null;
        };
        /** @description `get_manifest` gövdesi (`message` içeriği). */
        Manifest: {
            listing: string;
            /** @default product.image */
            slot: string;
            /** @description `manifest_api_enabled` bayrağı. Kapalıyken de 200 döner. */
            enabled: boolean;
            /** @description Ham `file_url`; türev varsa merdivenin orta basamağı. */
            fallback: string;
            renditions: components["schemas"]["RenditionRow"][];
            images: components["schemas"]["ManifestImage"][];
            /** @description `benefit_gate_passed=0` olduğu için elenen türev sayısı. */
            suppressed: number;
            /** @description İçerik adresli; tırnaklı. */
            etag: string;
            /** @example public, max-age=60, must-revalidate */
            cache_control: string;
        };
        /** @description `if_none_match` (ya da `If-None-Match` başlığı) tuttuğunda dönen gövde. HTTP durumu YİNE 200'dür — Frappe whitelist katmanı 304 üretmez, gövdesizlik `not_modified` bayrağıyla bildirilir. */
        NotModified: {
            /** @constant */
            not_modified: true;
            etag: string;
            cache_control: string;
        };
        ManifestBatch: {
            slot: string;
            enabled: boolean;
            /** @description İlan adı → manifest. Alt gövdelerde `etag`/`cache_control` YOKTUR. */
            manifests: {
                [key: string]: components["schemas"]["Manifest"];
            };
            /** @description DAİMA boş — bilinçli. Numaralandırma kehaneti olmasın diye. */
            missing: string[];
            requested: number;
            returned: number;
            truncated: boolean;
            /** @constant */
            max_batch: 50;
            /** @description Tavanı aşıp kırpılan kimlikler — çağıranın kendi girdisinin yankısı. */
            skipped: string[];
            etag: string;
            cache_control: string;
        };
        SignedUrl: {
            /** @description `/api/method/tradehub_core.api.media_access.download?file=…&exp=…&blob=…&_signature=…` */
            url: string;
            /** @description Unix zaman damgası. */
            exp: number;
            /** @description Clamp'lenmiş süre (60…86400). */
            ttl_seconds: number;
        };
        SignedUrlCached: components["schemas"]["SignedUrl"] & {
            /** @constant */
            cache_control: "private, no-store";
        };
        BrowseFolder: {
            id: string;
            label?: string;
            count: number;
        };
        /** @description Seviyeye göre klasör listesi VEYA dosya listesi. */
        BrowseLevel: {
            folders: components["schemas"]["BrowseFolder"][];
        } | {
            items: Record<string, never>[];
            total: number;
        };
        SellerSummary: {
            store: string;
            active: number;
            trashed: number;
            bytes: number;
            quota_bytes?: number | null;
            tags?: string[];
        };
        PagedFiles: {
            items: Record<string, never>[];
            total?: number;
            page?: number;
            page_size?: number;
        };
        /** @description `manifest_batch` gövdesi — DOSYA bazlı panel envanteri. `get_manifest_batch` (İLAN bazlı, guest) ile karıştırmayın. */
        FileManifestBatch: {
            /** @description İstenen adres → manifest. Erişilemeyen adres `null` — 'yok', 'silinmiş' ve 'başka satıcının özel dosyası' AYIRT EDİLMEZ. */
            manifests: {
                [key: string]: components["schemas"]["FileManifest"] | null;
            };
            requested: number;
            returned: number;
            /** @constant */
            max_batch: 100;
        };
        FileManifest: {
            /** @description `File` docname. */
            file: string;
            file_url: string;
            assets: string[];
            /** @description HAM üretim envanteri — fayda kapısını geçmeyenler dâhil. */
            renditions: components["schemas"]["RenditionRow"][];
            /** @description T-061 sürüm zenginleştirmesi (`version_enrichment_for_assets`). Türev üretilmemiş dosyada `null` — ÖLÇÜLDÜ. */
            version: Record<string, never> | null;
        };
        FolderList: {
            folders: {
                name: string;
                folder_name: string;
                /** @description Boş dizge = kök. */
                parent_folder: string;
                file_count: number;
            }[];
            /** @constant */
            max_depth: 5;
        };
        FolderCreated: {
            name: string;
            folder_name: string;
            parent_folder: string;
        };
        FolderRenamed: {
            /** @description DEĞİŞMEZ — kimlik kararlı. */
            name: string;
            folder_name: string;
        };
        FolderDeleted: {
            /** @description Silinen klasörün `name`i. */
            deleted: string;
        };
        MoveResult: {
            moved: number;
            failed: {
                file_url: string;
                error: string;
            }[];
            /** @description Sahip olunmayan adres sayısı — HANGİSİ olduğu dönmez. */
            skipped: number;
        };
        OrphanList: {
            items: Record<string, never>[];
            total: number;
            start: number;
            page_length: number;
            days_unused: number;
            scanned_at: string;
            /** @description Taramanın neyi GÖRMEDİĞİ — ekran göstermek ZORUNDA (T-043). */
            scan: {
                live_fields: number;
                order_fields: number;
                /** @constant */
                history_scanned: false;
                failed_sources: string[];
            };
        };
        /** @description `find_in_my_library` gövdesi. Eşleşmeme ile 'başka mağazada var' AYNI yanıttır. */
        LibraryMatch: {
            found: boolean;
            /** @description Bilinçli üç alan — sahip/kullanım bilgisi bu uca taşınmaz. */
            file: {
                file_url: string;
                file_name: string;
                uploaded_at: string;
            } | null;
        };
        /** @description `rum.collect` gövdesi — BİLİNÇLİ boşa yakın: `sendBeacon` yanıtı okuyamaz ve ret ayrıntısı şema keşfine yarardı. */
        RumAck: {
            /** @constant */
            ok: true;
        };
    };
    responses: {
        /** @description Yetki reddi (`frappe.PermissionError`). Misafir de, yetkisiz oturum da bunu alır. */
        Denied: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["FrappeError"];
            };
        };
        /** @description `frappe.ValidationError` — Frappe bunu 417 ile döner, 400 ile değil. */
        Validation: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["FrappeError"];
            };
        };
        /** @description `@rate_limit` kovası doldu — `TooManyRequestsError`. ÖLÇÜLDÜ: `media_crop.suggest_focal` 60 sn'lik pencerede 29 çağrıya izin verdi, 30.'yu 429 ile reddetti (`max_calls=30`). */
        RateLimited: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["FrappeError"];
            };
        };
        /** @description ÖLÇÜLDÜ: bu katmandaki TEK 400. Oturum çerezli bir POST `X-Frappe-CSRF-Token` başlığı olmadan gelirse Frappe `CSRFTokenError` ile 400 döner. İş mantığı hatası 400 ÜRETMEZ — o 417'dir. */
        BadRequest: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["FrappeError"];
            };
        };
        /** @description Beklenmeyen sunucu hatası. */
        ServerError: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["FrappeError"];
            };
        };
    };
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    media_manifest_get_manifest: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                listing: string;
                /** @description Python tipi `str`, varsayılan `DEFAULT_SLOT` */
                slot?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                if_none_match?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["Manifest"] | components["schemas"]["NotModified"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_manifest_get_manifest_batch: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                listings: string;
                /** @description Python tipi `str`, varsayılan `DEFAULT_SLOT` */
                slot?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                if_none_match?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["ManifestBatch"] | components["schemas"]["NotModified"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_manifest_get_signed_url: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                file_url: string;
                /** @description Python tipi `int`, varsayılan `media_access.DEFAULT_TTL_SECONDS` */
                ttl_seconds?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["SignedUrlCached"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_manifest_manifest_batch: {
        parameters: {
            query?: {
                /** @description Python tipi `list | str | None`, varsayılan `None` */
                file_urls?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["FileManifestBatch"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_access_get_signed_url: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                file_url: string;
                /** @description Python tipi `int`, varsayılan `DEFAULT_TTL_SECONDS` */
                ttl_seconds?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["SignedUrl"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_access_download: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_crop_get_intent: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                asset: string;
                /** @description Python tipi `str`, varsayılan `''` */
                if_none_match?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["CropIntentView"] | components["schemas"]["CropNotModified"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_crop_save_intent: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                asset: string;
                /** @description Python tipi `Any`, varsayılan `None` */
                focal_x?: string;
                /** @description Python tipi `Any`, varsayılan `None` */
                focal_y?: string;
                /** @description Python tipi `Any`, varsayılan `None` */
                safe_area?: string;
                /** @description Python tipi `Any`, varsayılan `None` */
                zoom?: string;
                /** @description Python tipi `Any`, varsayılan `None` */
                center_x?: string;
                /** @description Python tipi `Any`, varsayılan `None` */
                center_y?: string;
                /** @description Python tipi `Any`, varsayılan `None` */
                overrides?: string;
                /** @description Python tipi `Any`, varsayılan `0` */
                approved_by_user?: string;
                /** @description Python tipi `Any`, varsayılan `None` */
                confidence?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                method?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                algorithm?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                algorithm_version?: string;
                /** @description Python tipi `Any`, varsayılan `None` */
                previewed_placements?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                if_match?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["CropIntentView"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_crop_suggest_focal: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                asset: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["FocalSuggestion"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            429: components["responses"]["RateLimited"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_get_my_media: {
        parameters: {
            query?: {
                /** @description Python tipi `int`, varsayılan `1` */
                page?: number;
                /** @description Python tipi `int`, varsayılan `50` */
                page_size?: number;
                /** @description Python tipi `str`, varsayılan `''` */
                search?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                state?: string;
                /** @description Python tipi `str`, varsayılan `'date'` */
                sort_by?: string;
                /** @description Python tipi `str`, varsayılan `'desc'` */
                sort_dir?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                usage_state?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["PagedFiles"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_browse_my_media: {
        parameters: {
            query?: {
                /** @description Python tipi `str`, varsayılan `''` */
                scope?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                category?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                listing?: string;
                /** @description Python tipi `int`, varsayılan `1` */
                page?: number;
                /** @description Python tipi `int`, varsayılan `50` */
                page_size?: number;
                /** @description Python tipi `str`, varsayılan `''` */
                search?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["BrowseLevel"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_get_my_usage: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                file_url: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_list_orphans: {
        parameters: {
            query?: {
                /** @description Python tipi `int`, varsayılan `30` */
                days_unused?: number;
                /** @description Python tipi `int`, varsayılan `0` */
                start?: number;
                /** @description Python tipi `int`, varsayılan `50` */
                page_length?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["OrphanList"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_preview_release: {
        parameters: {
            query?: {
                /** @description Python tipi `str | list[str] | None`, varsayılan `None` */
                file_urls?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_archive_media: {
        parameters: {
            query?: {
                /** @description Python tipi `str | list[str] | None`, varsayılan `None` */
                file_urls?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_unarchive_media: {
        parameters: {
            query?: {
                /** @description Python tipi `str | list[str] | None`, varsayılan `None` */
                file_urls?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_purge_media: {
        parameters: {
            query?: {
                /** @description Python tipi `str | list[str] | None`, varsayılan `None` */
                file_urls?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_get_my_summary: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["SellerSummary"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_upload_media: {
        parameters: {
            query?: {
                /** @description Python tipi `str`, varsayılan `''` */
                file_name?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                content?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_upload_limits: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_upload_begin: {
        parameters: {
            query?: {
                /** @description Python tipi `str`, varsayılan `''` */
                file_name?: string;
                /** @description Python tipi `int`, varsayılan `0` */
                total_bytes?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_upload_chunk: {
        parameters: {
            query?: {
                /** @description Python tipi `str`, varsayılan `''` */
                upload_id?: string;
                /** @description Python tipi `int`, varsayılan `0` */
                index?: number;
                /** @description Python tipi `str`, varsayılan `''` */
                content?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_upload_finish: {
        parameters: {
            query?: {
                /** @description Python tipi `str`, varsayılan `''` */
                upload_id?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_upload_abort: {
        parameters: {
            query?: {
                /** @description Python tipi `str`, varsayılan `''` */
                upload_id?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_upload_status: {
        parameters: {
            query?: {
                /** @description Python tipi `str`, varsayılan `''` */
                upload_id?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_update_media: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                file_url: string;
                /** @description Python tipi `str | dict | None`, varsayılan `None` */
                patch?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_toggle_favorite: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                file_url: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_add_tag: {
        parameters: {
            query?: {
                /** @description Python tipi `str | list[str] | None`, varsayılan `None` */
                file_urls?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                tag?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_get_dimensions: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                file_url: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_retry_video: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                file_url: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_rename_media: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                file_url: string;
                /** @description Python tipi `str`, ZORUNLU */
                new_name: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_duplicate_media: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                file_url: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_replace_media: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                file_url: string;
                /** @description Python tipi `str`, varsayılan `''` */
                content?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                file_name?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_create_backup: {
        parameters: {
            query?: {
                /** @description Python tipi `str`, varsayılan `''` */
                label?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_list_backups: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_verify_backup: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                set_id: string;
                /** @description Python tipi `int`, varsayılan `0` */
                deep?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_plan_backup_restore: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                set_id: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_apply_backup_restore: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                set_id: string;
                /** @description Python tipi `int`, varsayılan `1` */
                with_files?: number;
                /** @description Python tipi `int`, varsayılan `1` */
                with_records?: number;
                /** @description Python tipi `int`, varsayılan `0` */
                overwrite?: number;
                /** @description Python tipi `str | list[str] | None`, varsayılan `None` */
                only?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_delete_backup: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                set_id: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_start_backup_export: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                set_id: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_backup_export_status: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                set_id: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_discard_backup_export: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                set_id: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_download_backup_export: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                set_id: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_list_folders: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["FolderList"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_create_folder: {
        parameters: {
            query?: {
                /** @description Python tipi `str`, varsayılan `''` */
                folder_name?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                parent_folder?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["FolderCreated"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_rename_folder: {
        parameters: {
            query?: {
                /** @description Python tipi `str`, varsayılan `''` */
                folder?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                new_name?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["FolderRenamed"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_delete_folder: {
        parameters: {
            query?: {
                /** @description Python tipi `str`, varsayılan `''` */
                folder?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["FolderDeleted"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_move_media: {
        parameters: {
            query?: {
                /** @description Python tipi `str | list[str] | None`, varsayılan `None` */
                file_urls?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                folder?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["MoveResult"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_list_folder_media: {
        parameters: {
            query?: {
                /** @description Python tipi `str`, varsayılan `''` */
                folder?: string;
                /** @description Python tipi `int`, varsayılan `1` */
                page?: number;
                /** @description Python tipi `int`, varsayılan `50` */
                page_size?: number;
                /** @description Python tipi `str`, varsayılan `''` */
                search?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["PagedFiles"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    seller_media_find_in_my_library: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                sha256: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["LibraryMatch"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_get_image_inventory: {
        parameters: {
            query?: {
                /** @description Python tipi `int`, varsayılan `1` */
                page?: number;
                /** @description Python tipi `int`, varsayılan `50` */
                page_size?: number;
                /** @description Python tipi `str`, varsayılan `''` */
                search?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                state?: string;
                /** @description Python tipi `str`, varsayılan `'size'` */
                sort_by?: string;
                /** @description Python tipi `str`, varsayılan `'desc'` */
                sort_dir?: string;
                /** @description Python tipi `int`, varsayılan `0` */
                only_optimizable?: number;
                /** @description Python tipi `int`, varsayılan `0` */
                min_bytes?: number;
                /** @description Python tipi `str`, varsayılan `''` */
                usage?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                usage_state?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["PagedFiles"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_preview_trash: {
        parameters: {
            query?: {
                /** @description Python tipi `str | list[str] | None`, varsayılan `None` */
                file_urls?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_get_file_usage: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                file_url: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_get_optimization_status: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                job_key: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_start_image_optimization: {
        parameters: {
            query?: {
                /** @description Python tipi `str | list[str] | None`, varsayılan `None` */
                file_names?: string;
                /** @description Python tipi `str`, varsayılan `presets.DEFAULT_PRESET` */
                preset?: string;
                /** @description Python tipi `str`, varsayılan `'selected'` */
                scope?: string;
                /** @description Python tipi `int`, varsayılan `0` */
                limit?: number;
                /** @description Python tipi `int`, varsayılan `0` */
                dry_run?: number;
                /** @description Python tipi `str`, varsayılan `''` */
                search?: string;
                /** @description Python tipi `int`, varsayılan `0` */
                only_optimizable?: number;
                /** @description Python tipi `int`, varsayılan `0` */
                min_bytes?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_restore_image: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                file_name: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_retry_transcode: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                file_url: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_start_restore: {
        parameters: {
            query?: {
                /** @description Python tipi `str | list[str] | None`, varsayılan `None` */
                file_names?: string;
                /** @description Python tipi `str`, varsayılan `'selected'` */
                scope?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                search?: string;
                /** @description Python tipi `int`, varsayılan `0` */
                min_bytes?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_trash_files: {
        parameters: {
            query?: {
                /** @description Python tipi `str | list[str] | None`, varsayılan `None` */
                file_urls?: string;
                /** @description Python tipi `int`, varsayılan `0` */
                force?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_restore_from_trash: {
        parameters: {
            query?: {
                /** @description Python tipi `str | list[str] | None`, varsayılan `None` */
                file_urls?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_delete_trashed: {
        parameters: {
            query?: {
                /** @description Python tipi `str | list[str] | None`, varsayılan `None` */
                file_urls?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_purge_trash: {
        parameters: {
            query?: {
                /** @description Python tipi `int`, varsayılan `-1` */
                older_than_days?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_purge_archive: {
        parameters: {
            query?: {
                /** @description Python tipi `int`, varsayılan `-1` */
                older_than_days?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_get_restorable_count: {
        parameters: {
            query?: {
                /** @description Python tipi `str`, varsayılan `''` */
                search?: string;
                /** @description Python tipi `int`, varsayılan `0` */
                min_bytes?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_get_pending_count: {
        parameters: {
            query?: {
                /** @description Python tipi `str`, varsayılan `''` */
                search?: string;
                /** @description Python tipi `int`, varsayılan `0` */
                only_optimizable?: number;
                /** @description Python tipi `int`, varsayılan `0` */
                min_bytes?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_get_media_audit: {
        parameters: {
            query?: {
                /** @description Python tipi `int`, varsayılan `1` */
                page?: number;
                /** @description Python tipi `int`, varsayılan `50` */
                page_size?: number;
                /** @description Python tipi `str`, varsayılan `''` */
                action?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                severity?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                decision?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                actor?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                tenant?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                file_url?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                search?: string;
                /** @description Python tipi `int`, varsayılan `0` */
                days?: number;
                /** @description Python tipi `str`, varsayılan `'timestamp'` */
                sort_by?: string;
                /** @description Python tipi `str`, varsayılan `'desc'` */
                sort_dir?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_get_file_references: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                file_url: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_set_access_level: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                file_url: string;
                /** @description Python tipi `int`, varsayılan `0` */
                make_private?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_get_private_files: {
        parameters: {
            query?: {
                /** @description Python tipi `int`, varsayılan `1` */
                page?: number;
                /** @description Python tipi `int`, varsayılan `50` */
                page_size?: number;
                /** @description Python tipi `str`, varsayılan `''` */
                search?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_browse_media: {
        parameters: {
            query?: {
                /** @description Python tipi `str`, varsayılan `''` */
                scope?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                store?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                category?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                group?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                sub?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                doc_field?: string;
                /** @description Python tipi `int`, varsayılan `1` */
                page?: number;
                /** @description Python tipi `int`, varsayılan `50` */
                page_size?: number;
                /** @description Python tipi `str`, varsayılan `''` */
                search?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_get_record_media: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                doctype: string;
                /** @description Python tipi `str`, ZORUNLU */
                name: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_get_dangling_references: {
        parameters: {
            query?: {
                /** @description Python tipi `int`, varsayılan `500` */
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_repair_dangling_references: {
        parameters: {
            query?: {
                /** @description Python tipi `int`, varsayılan `1` */
                dry_run?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_get_media_audit_facets: {
        parameters: {
            query?: {
                /** @description Python tipi `int`, varsayılan `0` */
                days?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_get_media_audit_actors: {
        parameters: {
            query?: {
                /** @description Python tipi `int`, varsayılan `50` */
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_get_media_audit_report: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                name: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_get_media_audit_targets: {
        parameters: {
            query?: {
                /** @description Python tipi `int`, varsayılan `10` */
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_export_media_audit: {
        parameters: {
            query?: {
                /** @description Python tipi `str`, varsayılan `''` */
                action?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                severity?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                decision?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                actor?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                tenant?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                file_url?: string;
                /** @description Python tipi `str`, varsayılan `''` */
                search?: string;
                /** @description Python tipi `int`, varsayılan `0` */
                days?: number;
                /** @description Python tipi `int`, varsayılan `5000` */
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_list_media_backups: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_create_media_backup: {
        parameters: {
            query?: {
                /** @description Python tipi `str`, varsayılan `''` */
                label?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_verify_media_backup: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                set_id: string;
                /** @description Python tipi `int`, varsayılan `0` */
                deep?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_plan_media_restore: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                set_id: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_apply_media_restore: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                set_id: string;
                /** @description Python tipi `int`, varsayılan `1` */
                files?: number;
                /** @description Python tipi `int`, varsayılan `1` */
                records?: number;
                /** @description Python tipi `int`, varsayılan `0` */
                overwrite?: number;
                /** @description Python tipi `str | list[str] | None`, varsayılan `None` */
                only?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_repair_missing_media: {
        parameters: {
            query?: {
                /** @description Python tipi `str`, varsayılan `''` */
                set_id?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_prune_media_backups: {
        parameters: {
            query?: {
                /** @description Python tipi `int`, varsayılan `0` */
                keep?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_delete_media_backup: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                set_id: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_start_media_backup_export: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                set_id: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_media_backup_export_status: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                set_id: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_discard_media_backup_export: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                set_id: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_download_media_backup_export: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                set_id: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_scan_overview: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_list_scan_hold: {
        parameters: {
            query?: {
                /** @description Python tipi `int`, varsayılan `1` */
                page?: number;
                /** @description Python tipi `int`, varsayılan `50` */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_sweep_scans: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_list_quarantine: {
        parameters: {
            query?: {
                /** @description Python tipi `int`, varsayılan `1` */
                page?: number;
                /** @description Python tipi `int`, varsayılan `50` */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_retry_scan: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                file_url: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_release_quarantine: {
        parameters: {
            query: {
                /** @description Python tipi `str`, ZORUNLU */
                file_url: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_admin_scan_backfill: {
        parameters: {
            query?: {
                /** @description Python tipi `int`, varsayılan `500` */
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Şema belgelenmedi — uç HTTP ile doğrulanmadı ya da ikili gövde döner. */
                        message: unknown;
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    rum_collect: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["RumAck"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_storage_settings_get_storage_status: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["StorageStatus"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
    media_storage_settings_test_connection: {
        parameters: {
            query?: {
                /** @description Python tipi `str`, varsayılan `'s3'` */
                target?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Başarılı. Gövde Frappe zarfıyla `message` altındadır. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["ConnectionTest"];
                    };
                };
            };
            403: components["responses"]["Denied"];
            417: components["responses"]["Validation"];
            500: components["responses"]["ServerError"];
        };
    };
}
