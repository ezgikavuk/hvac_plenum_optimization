"""
HVAC Karar Destek Sistemi - Otomatik DWG -> DXF Dönüştürücü Modülü
Bu modül, kapalı kutu olan AutoCAD (.dwg) formatını açık kaynaklı (.dxf) formatına çevirir.

Kurulum Gerekir: terminalde 'pip install aspose-cad' komutunu çalıştırın.
"""

import os
try:
    import aspose.cad as cad
except ImportError:
    print("Kütüphane eksik! Lütfen terminale şunu yazın: pip install aspose-cad")
    exit(1)

def convert_dwg_to_dxf(input_dwg_path, output_dxf_path):
    print(f"\n🔄 [{input_dwg_path}] dosyası AutoCAD binary formatından çözümleniyor...")
    try:
        # Kapalı format DWG dosyasını hafızaya al
        image = cad.Image.load(input_dwg_path)
        
        # Açık format DXF olarak dışarı aktar
        image.save(output_dxf_path)
        
        print(f"✅ BAŞARILI! Dosya başarıyla dönüştürüldü: {output_dxf_path}")
        print("💡 Artık bu yeni .dxf dosyasını Web sitemize veya Python motorumuza doğrudan yükleyebilirsiniz.\n")
        return True
    except Exception as e:
        print(f"❌ Dönüştürme Hatası: {e}")
        return False

if __name__ == "__main__":
    # Dönüştürülecek varsayılan DWG dosyası
    hedef_dwg = "mimari_proje.dwg"
    cikis_dxf = "mimari_proje_cozumlenmis.dxf"
    
    # Dosya klasörde var mı kontrol et
    if os.path.exists(hedef_dwg):
        convert_dwg_to_dxf(hedef_dwg, cikis_dxf)
    else:
        print(f"\n⚠️ HATA: Klasörde '{hedef_dwg}' adında bir dosya bulunamadı.")
        print("Lütfen elinizdeki herhangi bir DWG dosyasının adını 'mimari_proje.dwg' yapıp bu klasöre koyun ve kodu tekrar çalıştırın.\n")
