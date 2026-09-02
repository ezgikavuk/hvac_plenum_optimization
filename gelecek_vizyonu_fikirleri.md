# Staj Projesi: Gelecek Vizyonu ve Makine Mühendisliği Asistanı Fikirleri

Bu belge, staj projemizin gelecekte bulut (Cloud) tabanlı tam teşekküllü bir asistana dönüştürülmesi durumunda eklenebilecek özellikler için yaptığımız sohbetin ve beyin fırtınasının notlarını içermektedir. Bu fikirler staj raporunda "Gelecek Vizyonu" veya "Projeyi Geliştirme Önerileri" başlığı altında kullanılabilir.

---

## 1. Proje Ofisi: Revizyon ve Çizim Takipçisi
Proje ofislerinde yaşanan karmaşayı çözmek için otonom bir asistan:
- **Nasıl Çalışır:** Veritabanında projelerin son güncellenme tarihleri ve onay durumları tutulur. Asistan her sabah bu tarihleri tarar.
- **Örnek Bildirim (08:00):** 📐 "Zemin Kat Havalandırma Projesi (Rev-03) 4 gündür onayınızı bekliyor. Bugün göz atmayı unutmayın."

## 2. Tasarım ve Hata (Sanity Check) Raporlayıcısı
Geliştirdiğimiz HVAC Karar Destek Sistemi'nin arka planda çalışan bulut versiyonu:
- **Nasıl Çalışır:** Ofisteki diğer mühendislerin sisteme girdiği hesaplamalar (debi, kanal ebatları) gün sonunda taranır. Hızı 10 m/s'yi geçen hava kanalları veya basınç kaybı yüksek noktalar otomatik olarak tespit edilir.
- **Örnek Bildirim (18:00):** ⚠️ "Bugün ofiste yapılan 3 farklı havalandırma hesabında hava hızı limitlerin (10 m/s) üzerinde tespit edildi. Riskli tasarımları kontrol ediniz."

## 3. Otomatik Keşif (BOQ) Hatırlatıcısı
- **Nasıl Çalışır:** Durumu "Tasarım Bitti" olarak işaretlenmiş ama metraj/keşif listesi henüz sisteme yüklenmemiş projeleri bulur.
- **Örnek Bildirim (13:00):** 📋 "AVM Yangın Tesisatı projesi tamamlandı ancak metraj listesi henüz yüklenmedi. Proje tesliminden önce metrajı tamamlayınız."

## 4. Şantiye/Saha İlerleme Raporcusu (Hakediş Takibi)
Şantiyede çalışan ustaların ve mühendislerin günlük iş ilerlemesini girmelerini hatırlatan sistem:
- **Örnek Bildirim (17:30):** 🏗️ "Mesai bitmek üzere. Lütfen bugün montajı yapılan hava kanalı metrajını (m²) ve harcanan adam-saat bilgisini sisteme giriniz."

## 5. Kestirimci/Periyodik Bakım Asistanı (Preventative Maintenance)
- **Nasıl Çalışır:** Makinelerin (Pompalar, Klima Santralleri, Chiller) çalışma saatlerini veritabanından çeker ve bakım limiti dolduğunda uyarır.
- **Örnek Bildirim (09:00):** ⚙️ "AHU-2 Klima Santralinin filtre değişim vakti geldi (10.000 saat). Lütfen bakım ekibini yönlendirin."
