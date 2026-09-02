import numpy as np
from stl import mesh
import math

def generate_transition_plenum(diameter_mm, rect_w, rect_h, length, output_filename="Plenum_Transition.stl"):
    """
    Yuvarlaktan (D) dikdörtgene (WxH) geçiş yapan 3 boyutlu (STL) plenum parçasını üretir.
    """
    segments = 36  # Yuvarlak kısmın çözünürlüğü (ne kadar çokgen olacağı)
    
    # 1. Yuvarlak kısımdaki noktaları oluştur (Z = 0)
    radius = diameter_mm / 2.0
    circle_pts = []
    for i in range(segments):
        angle = 2 * math.pi * i / segments
        x = radius * math.cos(angle)
        y = radius * math.sin(angle)
        circle_pts.append([x, y, 0])
        
    # 2. Dikdörtgen kısımdaki noktaları oluştur (Z = length)
    hw = rect_w / 2.0
    hh = rect_h / 2.0
    
    # Dikdörtgenin 4 köşesi:
    corner1 = [hw, hh, length]
    corner2 = [-hw, hh, length]
    corner3 = [-hw, -hh, length]
    corner4 = [hw, -hh, length]
    
    faces = []
    q = segments // 4
    corners = [corner1, corner2, corner3, corner4]
    
    # Yüzeyleri (Mesh) matematiksel olarak ör
    for i in range(segments):
        p1 = circle_pts[i]
        p2 = circle_pts[(i + 1) % segments]
        
        c_idx = (i + (q//2)) // q
        c_idx = c_idx % 4
        c_point = corners[c_idx]
        
        next_c_idx = ((i + 1) + (q//2)) // q
        next_c_idx = next_c_idx % 4
        next_c_point = corners[next_c_idx]
        
        # Ana üçgen (Yuvarlak iki nokta + Köşe)
        faces.append([p1, p2, c_point])
        
        # Dikdörtgenin düz kenarları için üçgen
        if c_idx != next_c_idx:
            faces.append([p2, c_point, next_c_point])

    faces_np = np.array(faces)
    
    # STL dosyasını oluştur
    plenum_mesh = mesh.Mesh(np.zeros(faces_np.shape[0], dtype=mesh.Mesh.dtype))
    for i, f in enumerate(faces):
        for j in range(3):
            plenum_mesh.vectors[i][j] = faces_np[i][j]
            
    plenum_mesh.save(output_filename)
    print(f"\n[BAŞARILI] 3 Boyutlu Tasarım '{output_filename}' adıyla üretildi!")
    print("Bu dosyayı Mac'te çift tıklayarak veya direkt boşluk (Space) tuşuna basarak 3 boyutlu izleyebilirsin.")

if __name__ == "__main__":
    # Sistemin hesapladığı çap: Ø300 mm
    # Kullanıcının AutoCAD'den seçtiği Menfez: 825x125 mm
    # Sac uzunluğu: 400 mm
    generate_transition_plenum(diameter_mm=300, rect_w=825, rect_h=125, length=400)
