# İstoç API kataloğu

Üç repodaki API ilişkilerini tek ekranda incelemek için hazırlanmıştır. Katalog üretimi uygulama kodunu veya veritabanını değiştirmez.

- [Tüm kayıtlar](http://127.0.0.1:8877/)
- [admin-panel](http://127.0.0.1:8877/?repo=admin-panel)
- [tradehubfront](http://127.0.0.1:8877/?repo=tradehubfront)
- [tradehub_core](http://127.0.0.1:8877/?repo=tradehub_core)
- [Ön yüzlerin Frappe ve ek uygulamalara doğrudan başvuruları](http://127.0.0.1:8877/?repo=native)
- [Backend karşılığı bulunamayan başvurular](http://127.0.0.1:8877/?repo=missing)

Bir satırın **İncele** düğmesi adresi, backend dosyasını/satırını, parametreleri, kaynak açıklamasını ve ön yüzdeki çağrı yerlerini açar. **Swagger** sekmesi seçili filtredeki kayıtları OpenAPI olarak, 40 kayıttan oluşan sayfalar halinde gösterir. Alttaki Önceki/Sonraki düğmeleriyle tümüne ulaşılır. **OpenAPI indir** ve **CSV indir**, filtreye uyan tüm kayıtları sayfalama sınırı olmadan dışarı aktarır.

Swagger inceleme modundadır; API çağrısı göndermez. Bu katalog alpha sunucusuna kurulu değildir; bu bilgisayardaki yerel adresten açılır.

## Başlatma

Hazır üretilmiş kataloğu açmak için Node veya Docker gerekmez:

```sh
python3 -m http.server 8877 --bind 127.0.0.1 --directory /Users/ahmet/Desktop/istoc/docs/api-catalog
```

Ardından http://127.0.0.1:8877/ adresini açın. Terminal kapanırsa bu komutla yeniden başlatılabilir. Yalnızca katalog klasörü ve yerel bilgisayar üzerinden sunulur.

## Kaynaklar değişince yenileme

Python 3.9+, Node ve `istoc-dev-backend-1` Docker konteyneri gerekir. Tarama konteynerdeki kaynakları okur; API fonksiyonlarını çalıştırmaz, uygulama kurmaz, migration yapmaz.

```sh
cd /Users/ahmet/Desktop/istoc/tools/api-catalog
npm ci --ignore-scripts --no-audit --no-fund
python3 generate.py
```

Üç repo bu çalışma alanındaki kardeş dizinler olarak okunur. Frappe, ERPNext, CRM, Telephony ve Helpdesk kaynakları yerel Docker konteynerinden okunur. `tradehub_core` için yerel repo esas alınır. App sürümleri, commit kimlikleri ve tarama zamanı `catalog.json` içinde tutulur.

## Çıktılar

- `catalog.json`: kaynak envanteri, çağrı yerleri, belge alanları, demo/mock notları, dinamik adresler ve kapsam bilgileri.
- `openapi.json`: tüm kayıtların birleştirilmiş OpenAPI görünümü.
- `openapi-admin-panel.json`, `openapi-tradehubfront.json`, `openapi-tradehub_core.json`: repo başına görünüm.
- `media-openapi.yaml`: mevcut ayrıntılı 120 uçluk medya HTTP sözleşmesinin kopyası. Kaynağı `tradehub_core/docs/api/openapi-http.yaml`; bu çalışma mevcut sözleşmeyi değiştirmez.
- `vendor/`: yerel Swagger UI 5.32.15 dosyaları ve lisansı. Sayfa açılırken harici CDN gerekmez.

GitHub Pages yayınları:

- [admin-panel API kataloğu](https://tradehub-tr.github.io/admin-panel/)
- [tradehubfront API kataloğu](https://tradehub-tr.github.io/tradehubfront/)
- [tradehub_core API kataloğu](https://tradehub-tr.github.io/tradehub_core/)

## Sayıları ve kapsamı doğru okuma

Bir RPC adresi bir kayıt sayılır. Aynı adresin GET/POST/PUT/DELETE yöntemleri ayrı kayıt sayılmaz. Bir DocType da bir kayıttır; Swagger içinde CRUD yollarına açılır. İki repo aynı adresi kullanıyorsa her ikisinin filtresinde görünür; repo sayıları toplanmamalıdır. Kısa Frappe adresleri, import yönlendirmeleri ve override adresleri ek kayıt oluşturabilir.

**Başvuru**, kod içinde çağrı veya adres tanımı bulunduğu anlamına gelir. Canlı trafik ölçümü değildir. Demo/mock dalları, kullanılmayan kod, erişilmeyen ekranlar veya feature flag’ler aktif çağrı sayısını değiştirebilir. **Ön yüz eşleşmesi yok**, uç kullanılmıyor anlamına gelmez; başka istemciler kullanabilir. **Backend eşleşmesi yok**, yalnızca taranan kaynaklarda karşılık bulunamadığını söyler; alpha için kesin bir 404 tespiti değildir.

AST taraması JS/TS, Vue script ve HTML script bölümlerini okur. Sabitleri, importları, çözülebilen template ifadelerini, yerel yardımcı fonksiyonları ve ortak CRUD çağrılarını eşleştirir. Test, fixture ve üretilmiş tip dosyaları çağrı sayılmaz. Çözülemeyen adresler dosya/satırlarıyla **Dinamik adresler** bölümündedir. Vue/HTML şablonunun metin içindeki kodları ve tamamen çalışma anında oluşturulan adresler için Network kaydı gerekir.

Python tarafında whitelist dekoratörleri, programatik whitelist atamaları, kısa Frappe adresleri, importlar ve hook override’ları dikkate alınır. Frappe’nin whitelist varsayılanı GET/POST/PUT/DELETE’tir; fonksiyon içindeki ek kontroller bunları kısıtlayabilir. Belge sınıfı metotları doğrudan Python sınıf yolu üzerinden RPC gibi gösterilmez; belge üzerinden v2 metot yolu kullanılır.

DocType kayıtları kaynak JSON tanımlarından alınır. Alt tablolar bağımsız CRUD olarak gösterilmez. Aynı isim birden fazla uygulamada tanımlıysa bütün kaynak varyantları ayrıntıda tutulur; aktif alan şeması sitede doğrulanmalıdır. Sitedeki Custom Field, Property Setter ve Server Script API tanımları bu statik taramaya dahil değildir.

Parametreler Python imzasından, alanlar DocType JSON’undan alınır. İmza dışındaki `form_dict`, dosya ve request gövdeleri için ek alanlar olabilir. Doğrulanmamış dönüş şemaları tahmin edilmez. Ayrıntılı medya sözleşmesi ayrıca korunur; aynı dosyadaki ölçüm notları güncel alpha doğrulaması değildir. `docs/api/openapi.yaml` saf Python kütüphane sözleşmesidir ve gerçek HTTP kataloğuna eklenmez.

Bu, HTTP API kataloğudur. WebSocket olayları, CDN dosyaları ve üçüncü taraf servislerin bütün uçları bu sayımın dışındadır. Canlı alpha ile yerel kaynakların sürüm eşitliği ve çağrıların başarı/yetki durumu doğrulanmamıştır.

Başvuru: [Frappe REST API](https://docs.frappe.io/framework/user/en/api/rest), [Swagger UI yapılandırması](https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/).
