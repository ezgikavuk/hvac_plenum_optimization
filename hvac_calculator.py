import math
import datetime
from fpdf import FPDF

# Standart yuvarlak kanal çapları (mm)
STANDARD_DIAMETERS = [200, 250, 315, 355, 400, 450, 500, 560, 630, 710, 800, 900, 1000]

def calculate_volume(width, length, height):
    """Kantin (veya mahal) hacmini hesaplar (m³)"""
    return width * length * height

def calculate_flow_rate(volume, air_change_rate):
    """Gerekli debiyi (m³/h) hesaplar"""
    return volume * air_change_rate

def get_standard_diameter(calculated_diameter_mm):
    """Hesaplanan çapa en yakın, bir üst standart çapı döndürür."""
    for d in STANDARD_DIAMETERS:
        if d >= calculated_diameter_mm:
            return d
    return STANDARD_DIAMETERS[-1]

def calculate_velocity_round(flow_rate_m3h, diameter_mm):
    """Yuvarlak kanal içindeki hava hızını (m/s) hesaplar"""
    flow_rate_m3s = flow_rate_m3h / 3600
    diameter_m = diameter_mm / 1000
    area = math.pi * (diameter_m / 2) ** 2
    return flow_rate_m3s / area

def calculate_velocity_rectangular(flow_rate_m3h, width_mm, height_mm):
    """Dikdörtgen kanal içindeki hava hızını (m/s) hesaplar"""
    flow_rate_m3s = flow_rate_m3h / 3600
    area = (width_mm / 1000) * (height_mm / 1000)
    return flow_rate_m3s / area

def generate_pdf_report(data):
    """Hesaplama sonuçlarını PDF olarak dışa aktarır."""
    pdf = FPDF()
    pdf.add_page()
    
    # Türkçe karakter sorununu çözmek için Arial veya default fonla devam edip ASCII benzeri çıktı almak
    # Bu basitlikte standart font kullanıyoruz.
    pdf.set_font("Arial", size=12)
    
    # Başlık
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, txt="HVAC Karar Destek Sistemi - Analiz Raporu", ln=1, align='C')
    pdf.ln(10)
    
    pdf.set_font("Arial", size=12)
    pdf.cell(200, 10, txt=f"Tarih: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}", ln=1)
    pdf.ln(5)
    
    for key, value in data.items():
        pdf.cell(200, 10, txt=f"{key}: {value}", ln=1)
        
    pdf.output("hvac_rapor.pdf")
    print("\n[BİLGİ] 'hvac_rapor.pdf' dosyası başarıyla oluşturuldu.")

def evaluate_system(width, length, height, air_change_rate, duct_type="yuvarlak", duct_dim1=300, duct_dim2=None):
    """Sistemi değerlendirir, sonuçları ekrana yazdırır ve PDF raporu üretir."""
    volume = calculate_volume(width, length, height)
    flow_rate = calculate_flow_rate(volume, air_change_rate)
    
    if duct_type == "yuvarlak":
        velocity = calculate_velocity_round(flow_rate, duct_dim1)
        duct_desc = f"Yuvarlak Q{duct_dim1} mm"
    else:
        velocity = calculate_velocity_rectangular(flow_rate, duct_dim1, duct_dim2)
        duct_desc = f"Dikdortgen {duct_dim1}x{duct_dim2} mm"
    
    print("-" * 50)
    print("HVAC HAVA HIZI VE KANAL CAPI ANALIZI")
    print("-" * 50)
    print(f"Mahal Hacmi        : {volume:.2f} m3")
    print(f"Gerekli Debi (Q)   : {flow_rate:.2f} m3/h")
    print(f"Kanal Tipi/Olcusu  : {duct_desc}")
    print(f"Kanal Ici Hava Hizi: {velocity:.2f} m/s")
    print("-" * 50)
    
    status = ""
    ideal_d_standard = None
    
    # 3 Kademeli Durum Göstergesi Mantığı
    if velocity < 4.5:
        status = "YESIL (Optimum Konfor)"
        print(f"[DURUM: {status}] Hava hizi ideal sinirlar icinde.")
    elif 4.5 <= velocity <= 5.0:
        status = "TURUNCU (Sinir Deger)"
        print(f"[DURUM: {status}] Hava hizi sinirda. Ses yapma potansiyeli var, dikkat edilmeli.")
    else:
        status = "KIRMIZI (Kritik - Akustik Risk)"
        print(f"[DURUM: {status}] Hava hizi 5.0 m/s uzerinde! Turbulans ve gurultu riski cok yuksek.")
        
        # İdeal çapı 4.5 m/s'ye göre bulup standart çapa yuvarlama
        ideal_velocity = 4.49
        flow_rate_m3s = flow_rate / 3600
        ideal_area = flow_rate_m3s / ideal_velocity
        ideal_diameter_m = 2 * math.sqrt(ideal_area / math.pi)
        ideal_diameter_mm = ideal_diameter_m * 1000
        
        ideal_d_standard = get_standard_diameter(ideal_diameter_mm)
        print(f"[ONERI] Hizi dusurmek icin standart cap en az Q{ideal_d_standard} mm secilmelidir.")
    
    print("-" * 50)
    
    # Rapor verisi hazırlama
    report_data = {
        "Mahal Hacmi": f"{volume:.2f} m3",
        "Gerekli Debi": f"{flow_rate:.2f} m3/h",
        "Secilen Kanal": duct_desc,
        "Hesaplanan Hiz": f"{velocity:.2f} m/s",
        "Sistem Durumu": status
    }
    if ideal_d_standard:
        report_data["Onerilen Standart Cap"] = f"Yuvarlak Q{ideal_d_standard} mm"
        
    generate_pdf_report(report_data)

if __name__ == "__main__":
    print("--- SENARYO 1: YUVARLAK KANAL ---")
    evaluate_system(width=15, length=10, height=3.5, air_change_rate=6, duct_type="yuvarlak", duct_dim1=300)
    
    print("\n\n--- SENARYO 2: DIKDORTGEN KANAL ---")
    evaluate_system(width=15, length=10, height=3.5, air_change_rate=6, duct_type="dikdortgen", duct_dim1=400, duct_dim2=200)
