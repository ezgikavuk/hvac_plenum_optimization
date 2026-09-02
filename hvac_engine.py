"""
HVAC Karar Destek Sistemi - Çekirdek Motoru (Core Engine) v6.0
Özellikler: Sanity Check, Risk Analizi, Dinamik PDF Raporlama ve AKILLI DXF OKUYUCU (Spatial Proximity)
"""

import math
import datetime
import json
import logging
import os
import sys
import re

try:
    import ezdxf
except ImportError:
    pass

try:
    from fpdf import FPDF
except ImportError:
    pass

# Loglama Ayarları
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("HVAC_Engine")

# ==========================================
# MODÜL 1: AKILLI DXF OKUYUCU (SPATIAL PROXIMITY)
# ==========================================
class DXFScanner:
    """AutoCAD çizimlerini okuyup koordinat bazlı (Spatial) eşleştirme yapar."""
    
    @staticmethod
    def extract_diffusers(dxf_path):
        if not os.path.exists(dxf_path):
            logger.warning(f"DXF dosyası bulunamadı: {dxf_path}. Simülasyon verileri döndürülüyor...")
            # Dosya yoksa simülasyon verisi döndür
            return {"count": 4, "total_flow": 2000, "details": [{"id": 1, "flow": 500}, {"id": 2, "flow": 500}, {"id": 3, "flow": 500}, {"id": 4, "flow": 500}]}
            
        try:
            doc = ezdxf.readfile(dxf_path)
            msp = doc.modelspace()
            
            diffuser_coords = []
            flow_coords = []
            
            # Tüm metinleri (TEXT ve MTEXT) tara
            for e in msp.query('TEXT MTEXT'):
                text = e.dxf.text.lower()
                # Insert point koordinatları (X, Y)
                if e.dxftype() == 'TEXT':
                    x, y, _ = e.dxf.insert
                else: # MTEXT
                    x, y, _ = e.dxf.insert
                
                # 1. Menfez Kelimelerini Ara
                if any(kw in text for kw in ["menfez", "diffuser", "grille", "anemostad"]):
                    diffuser_coords.append((x, y))
                
                # 2. Debi (m3/h) Kelimelerini Ara (Regex ile sayıyı çek)
                flow_match = re.search(r'(\d+)\s*(?:m3/h|m\^3/h|m³/h)', text)
                if flow_match:
                    flow_value = int(flow_match.group(1))
                    flow_coords.append((x, y, flow_value))

            # 3. SPATIAL PROXIMITY (Koordinat Yakınlığı ile Eşleştirme)
            matched_diffusers = []
            total_system_flow = 0
            
            for (dx, dy) in diffuser_coords:
                closest_flow = 0
                min_distance = float('inf')
                
                for (fx, fy, f_val) in flow_coords:
                    # Öklid Uzaklığı (Pisagor): sqrt((x2-x1)^2 + (y2-y1)^2)
                    dist = math.hypot(fx - dx, fy - dy)
                    if dist < min_distance:
                        min_distance = dist
                        closest_flow = f_val
                
                matched_diffusers.append({"x": dx, "y": dy, "flow": closest_flow})
                total_system_flow += closest_flow
                
            return {
                "count": len(matched_diffusers),
                "total_flow": total_system_flow,
                "details": matched_diffusers
            }

        except Exception as e:
            logger.error(f"DXF Okuma Hatası: {e}")
            return {"count": 0, "total_flow": 0, "details": []}

# ==========================================
# MODÜL 2: BİRİM VE MANTIKSAL SINIR KONTROLÜ (SANITY CHECK)
# ==========================================
class InputValidator:
    """Verilerin fiziksel olarak mümkün olup olmadığını kontrol eder."""
    @staticmethod
    def sanity_check(velocity, pressure_drop):
        if velocity > 15.0 or pressure_drop > 1000:
            logger.critical("⚠️ GİRDİ BİRİMİ HATASI VEYA AŞIRI KRİTİK AKIŞ TESPİT EDİLDİ!")
            logger.critical(f"Hesaplanan Hız: {velocity:.1f} m/s | Hesaplanan Basınç Kaybı: {pressure_drop:.1f} Pa")
            logger.critical("Lütfen DXF veya manuel girdilerdeki birimleri (mm yerine metre girilmiş olabilir) kontrol edin.")
            return False
        return True

# ==========================================
# MODÜL 3: MÜHENDİSLİK RİSK VE SEVİYE ANALİZİ
# ==========================================
class RiskEvaluator:
    """Hız ve basınca göre dinamik risk metni oluşturur."""
    @staticmethod
    def evaluate_risk(velocity):
        if velocity < 4.5:
            return {
                "level": "DUSUK",
                "message": "Optimum Konfor Seviyesi - Akustik Risk Yok.",
                "consequences": ["Hava akisi sessiz.", "Filtre ve fan omru maksimize edildi.", "Basinc kayiplari minimumda."],
                "action": "Mevcut kanal capi onaylandi, uretime gecilebilir."
            }
        elif 4.5 <= velocity <= 6.0:
            return {
                "level": "ORTA",
                "message": "Sinir Deger / Orta Risk - Menfez ses yalitimi gerekebilir.",
                "consequences": ["Kismi hava sesi (ugultu) duyulabilir.", "Dirseklerde ufak turbulanslar olusabilir."],
                "action": "Kanal ici akustik izolasyon veya bir ust standart cap degerlendirilmelidir."
            }
        else:
            return {
                "level": "YUKSEK (KRITIK)",
                "message": "Kritik Akustik ve Mekanik Risk - Siddetli turbulans, islik sesi ve fan arizasi!",
                "consequences": [
                    "Kabul edilemez seviyede mekanik gurultu ve titresim.",
                    "Artan basinc kayiplari sebebiyle fan motoruna asiri yuk binmesi.",
                    "Kanal birlesim yerlerinde hava kacaklari ve enerji israfi."
                ],
                "action": "Sistem ACILEN daha genis bir standart cap kullanilarak (Orn: Uretici Kutuphanesi Onerisi) yeniden boyutlandirilmalidir."
            }

# ==========================================
# MODÜL 4: HVAC MÜHENDİSLİK HESAPLAMALARI
# ==========================================
class HVACCalculator:
    AIR_DENSITY = 1.204 # kg/m3 
    FRICTION_FACTOR = 0.02 # Galvaniz f
    
    @staticmethod
    def calculate_velocity(flow_m3h, diameter_mm):
        flow_m3s = flow_m3h / 3600
        area = math.pi * ((diameter_mm / 1000) / 2) ** 2
        return flow_m3s / area if area > 0 else 0

    @classmethod
    def calculate_pressure_drop(cls, velocity, diameter_mm, length_m, elbows=0):
        d_m = diameter_mm / 1000
        dynamic_pressure = (cls.AIR_DENSITY * (velocity ** 2)) / 2
        friction_loss = cls.FRICTION_FACTOR * (length_m / d_m) * dynamic_pressure
        minor_loss = elbows * 0.3 * dynamic_pressure
        return friction_loss + minor_loss

# ==========================================
# MODÜL 5: GELİŞMİŞ PDF RAPORLAMA (ZENGİNLEŞTİRİLMİŞ)
# ==========================================
class ReportGenerator:
    def __init__(self, data, risk_data, dxf_data):
        self.data = data
        self.risk = risk_data
        self.dxf_data = dxf_data
        self.timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def generate_pdf(self, filename="HVAC_Saha_Raporu_V6.pdf"):
        try:
            pdf = FPDF()
            pdf.add_page()
            
            # Başlık
            pdf.set_font("Arial", 'B', 16)
            pdf.cell(200, 10, txt="HVAC Karar Destek Sistemi - V6 Zeki Rapor", ln=1, align='C')
            pdf.ln(5)
            
            # DXF'ten Okunan Akıllı Veriler (Yeni Başlık)
            pdf.set_font("Arial", 'B', 12)
            pdf.cell(200, 10, txt="1. SISTEMDEKI MENFEZ DAGILIMI VE ADEDI (DXF TARAMASI)", ln=1)
            pdf.set_font("Arial", size=11)
            pdf.cell(200, 8, txt=f"- Tespit Edilen Toplam Menfez Adedi: {self.dxf_data['count']} Adet", ln=1)
            pdf.cell(200, 8, txt=f"- Spatial Proximity ile Okunan Toplam Debi Yuku: {self.dxf_data['total_flow']} m3/h", ln=1)
            pdf.ln(5)

            # Temel Veriler
            pdf.set_font("Arial", 'B', 12)
            pdf.cell(200, 10, txt="2. HESAPLANAN SISTEM VERILERI", ln=1)
            pdf.set_font("Arial", size=11)
            for key, value in self.data.items():
                pdf.cell(200, 8, txt=f"- {key}: {value}", ln=1)
            pdf.ln(5)

            # Risk Analizi (Kritik Bölüm)
            pdf.set_font("Arial", 'B', 12)
            pdf.cell(200, 10, txt="3. MUHENDISLIK RISK ANALIZI", ln=1)
            pdf.set_font("Arial", 'B', 11)
            pdf.cell(200, 8, txt=f"Risk Seviyesi: {self.risk['level']}", ln=1)
            pdf.set_font("Arial", size=11)
            pdf.cell(200, 8, txt=f"Durum: {self.risk['message']}", ln=1)
            
            pdf.ln(2)
            pdf.set_font("Arial", 'U', 11)
            pdf.cell(200, 8, txt="Beklenen Fiziksel Sonuclar:", ln=1)
            pdf.set_font("Arial", size=11)
            for consequence in self.risk['consequences']:
                pdf.cell(200, 8, txt=f"  * {consequence}", ln=1)
            
            pdf.ln(4)
            pdf.set_font("Arial", 'B', 11)
            pdf.cell(200, 8, txt="Mudehale Onerisi:", ln=1)
            pdf.set_font("Arial", size=11)
            pdf.multi_cell(190, 8, txt=self.risk['action'])
                
            pdf.output(filename)
            logger.info(f"Zenginleştirilmiş PDF Raporu Oluşturuldu: {filename}")
        except Exception as e:
            logger.error(f"PDF Oluşturma Hatası: {e}")

# ==========================================
# ANA ÇALIŞTIRMA (MAIN ROUTINE)
# ==========================================
def main():
    print("\n" + "=" * 65)
    print(" HVAC KARAR DESTEK SİSTEMİ (v6.0 - SPATIAL PROXIMITY EDITION)")
    print("=" * 65 + "\n")
    
    # 1. DXF Taraması (Test Dosyası)
    logger.info("AutoCAD (DXF) Dosyası Taranıyor...")
    dxf_results = DXFScanner.extract_diffusers("mimari_proje.dxf")
    
    print("\n--- DXF TARAMA SONUÇLARI ---")
    print(f"Bulunan Menfez Sayısı: {dxf_results['count']}")
    print(f"Eşleşen Toplam Sistem Debisi: {dxf_results['total_flow']} m3/h")
    print("----------------------------\n")
    
    # 2. HVAC Hesaplamaları (Taranan Debi Kullanılıyor!)
    current_duct_mm = 300 # Görselindeki Ø300 mm ana kanal
    duct_length_m = 35.0
    elbow_count = 5
    
    total_flow = dxf_results['total_flow'] if dxf_results['total_flow'] > 0 else 1500
    
    vel = HVACCalculator.calculate_velocity(total_flow, current_duct_mm)
    dp = HVACCalculator.calculate_pressure_drop(vel, current_duct_mm, duct_length_m, elbow_count)
    
    # 3. MANTIKSAL SINIR KONTROLÜ (SANITY CHECK)
    is_valid = InputValidator.sanity_check(vel, dp)
    if not is_valid:
        print("\n[HATA] Sistem olağan dışı değerler saptadı. Raporlama durduruldu.")
        sys.exit(1)
        
    risk_assessment = RiskEvaluator.evaluate_risk(vel)
    
    report_dict = {
        "Kanal Capi": f"Q{current_duct_mm} mm",
        "Kanal Ici Hava Hizi": f"{vel:.2f} m/s",
        "Toplam Basinc Kaybi": f"{dp:.1f} Pascal"
    }

    # 4. Raporlama
    reporter = ReportGenerator(report_dict, risk_assessment, dxf_results)
    reporter.generate_pdf("HVAC_Profesyonel_Rapor_V6.pdf")

if __name__ == "__main__":
    main()
