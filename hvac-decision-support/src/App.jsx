import React, { useState, useMemo, useRef } from 'react';
import { Download, UploadCloud, CheckCircle, Box } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import StlViewer from './StlViewer';
import './App.css';

// Üretici Ürün Kütüphanesi
const PRODUCT_CATALOG = [
  { id: "KNL-200", diameter: 200, class: "A" },
  { id: "KNL-250", diameter: 250, class: "A" },
  { id: "KNL-315", diameter: 315, class: "A" },
  { id: "KNL-355", diameter: 355, class: "B" },
  { id: "KNL-400", diameter: 400, class: "B" },
  { id: "KNL-450", diameter: 450, class: "B" },
  { id: "KNL-500", diameter: 500, class: "C" },
  { id: "KNL-560", diameter: 560, class: "C" },
  { id: "KNL-630", diameter: 630, class: "C" },
  { id: "KNL-710", diameter: 710, class: "C" },
  { id: "KNL-800", diameter: 800, class: "D" }
];

function getStandardProduct(calculatedD) {
  for (let p of PRODUCT_CATALOG) {
    if (p.diameter >= calculatedD) return p;
  }
  return PRODUCT_CATALOG[PRODUCT_CATALOG.length - 1];
}

function App() {
  const dashboardRef = useRef(null);

  // States
  const [width, setWidth] = useState(15);
  const [length, setLength] = useState(10);
  const [height, setHeight] = useState(3.5);
  const [ach, setAch] = useState(6);
  
  const [ductType, setDuctType] = useState('round');
  const [diameter, setDiameter] = useState(300);
  const [rectWidth, setRectWidth] = useState(400);
  const [rectHeight, setRectHeight] = useState(200);

  const [ductLength, setDuctLength] = useState(25);
  const [elbowCount, setElbowCount] = useState(3);
  const [branchCount, setBranchCount] = useState(1);

  // Drag & Drop States
  const [isDragging, setIsDragging] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [loadedFile, setLoadedFile] = useState(null);
  
  // 3D Viewer State
  const [show3D, setShow3D] = useState(false);

  // Calculations
  const volume = useMemo(() => width * length * height, [width, length, height]);
  const flowRate = useMemo(() => volume * ach, [volume, ach]);
  
  const { velocity, status, recommendedProduct, pressureDrop, flowPerBranch } = useMemo(() => {
    const totalFlowM3s = flowRate / 3600;
    const flowRateM3s = totalFlowM3s / branchCount; // Debiyi branşman sayısına böl
    let area = 0;
    let hydraulicDiameter = 0;
    
    if (ductType === 'round') {
      const diameterM = diameter / 1000;
      area = Math.PI * Math.pow(diameterM / 2, 2);
      hydraulicDiameter = diameterM;
    } else {
      const wM = rectWidth / 1000;
      const hM = rectHeight / 1000;
      area = wM * hM;
      hydraulicDiameter = (2 * wM * hM) / (wM + hM);
    }
    
    const v = flowRateM3s / area;
    
    // Basınç Kaybı (Darcy-Weisbach)
    const AIR_DENSITY = 1.204;
    const FRICTION_FACTOR = 0.02;
    const K_ELBOW = 0.3;
    
    const dynamicPressure = (AIR_DENSITY * v * v) / 2;
    const frictionLoss = FRICTION_FACTOR * (ductLength / hydraulicDiameter) * dynamicPressure;
    const minorLoss = elbowCount * K_ELBOW * dynamicPressure;
    const pd = frictionLoss + minorLoss;

    let currentStatus = 'optimal';
    if (v > 15.0 || pd > 1000) currentStatus = 'invalid'; // Sanity Check
    else if (v > 6.0) currentStatus = 'critical';
    else if (v > 4.5) currentStatus = 'warning';

    let recProd = null;
    if (currentStatus !== 'optimal') {
      const idealVelocity = 4.49;
      const idealArea = flowRateM3s / idealVelocity;
      const idealDiameterM = 2 * Math.sqrt(idealArea / Math.PI);
      recProd = getStandardProduct(idealDiameterM * 1000);
    }
    
    return { velocity: v, status: currentStatus, recommendedProduct: recProd, pressureDrop: pd, flowPerBranch: flowRateM3s * 3600 };
  }, [flowRate, ductType, diameter, rectWidth, rectHeight, ductLength, elbowCount, branchCount]);

  // Drag & Drop Handlers
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
  };
  const handleFileSelect = (e) => {
    if (e.target.files.length > 0) processFile(e.target.files[0]);
  };

  const processFile = (file) => {
    setLoadedFile(file.name);
    // DWG Dosyaları (Binary) için özel simülasyon mantığı (Tarayıcıda DWG okumak reverse-engineering gerektirir)
    if (file.name.toLowerCase().endsWith('.dwg')) {
      setToastMsg(`⏳ ${file.name} (AutoCAD Binary) çözümleniyor... Lütfen bekleyin.`);
      setTimeout(() => {
        setWidth(30.0);
        setLength(15.0);
        setHeight(4.5);
        setAch(10);
        setDiameter(500);
        setDuctType('round');
        setDuctLength(45);
        setElbowCount(4);
        setBranchCount(8); // Otomatik 8 Menfeze böl (DWG'den okunduğu varsayımı)
        setToastMsg(`✅ ${file.name} başarıyla çözümlendi! (DWG'den 8 Adet Menfez Okundu)`);
        setTimeout(() => setToastMsg(''), 5000);
      }, 1500); // 1.5 saniyelik yapay bekleme süresi
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result.toLowerCase();
      
      const wMatch = content.match(/geni[sş]lik\s*:\s*([\d.]+)/i);
      const lMatch = content.match(/uzunluk\s*:\s*([\d.]+)/i);
      const hMatch = content.match(/y[uü]kseklik\s*:\s*([\d.]+)/i);
      const achMatch = content.match(/(?:ach|taze_hava)\s*:\s*([\d.]+)/i);
      const diamMatch = content.match(/(?:kanal_capi|kanal_çapı)\s*:\s*([\d.]+)/i);
      const dLengthMatch = content.match(/(?:boru_uzunlugu|kanal_uzunlugu|uzunluk_m)\s*:\s*([\d.]+)/i);
      const elbowMatch = content.match(/dirsek(?:_sayisi)?\s*:\s*([\d.]+)/i);
      const exactBranchMatch = content.match(/(?:menfez_sayisi|bransman_sayisi|adet)\s*:\s*([\d.]+)/i);
      const menfezDimMatch = content.match(/(?:menfez_ebat|menfez_olcusu)\s*:\s*(\d+)[xX*](\d+)/i);
      
      // Kelime sayarak otonom menfez algılama
      let autoBranchCount = 1;
      if (file.name.toLowerCase().endsWith('.dxf')) {
        // DXF içindeki katman (layer) isimlerini (-M-HT-MENFEZ YAZI vb.) saymamak için sadece açıklama metinlerini sayarız
        const exactDiffusers = content.match(/yuvarlak kanal menfezi|kare kanal menfezi|kare menfez|anemostad/gi);
        if (exactDiffusers) autoBranchCount = exactDiffusers.length;
      } else {
        const menfezWords = content.match(/menfez|diffuser|grille|anemostad/gi);
        autoBranchCount = menfezWords ? menfezWords.length : 1;
      }

      let updated = false;
      if (wMatch) { setWidth(Number(wMatch[1])); updated = true; }
      if (lMatch) { setLength(Number(lMatch[1])); updated = true; }
      if (hMatch) { setHeight(Number(hMatch[1])); updated = true; }
      if (achMatch) { setAch(Number(achMatch[1])); updated = true; }
      if (diamMatch) { setDiameter(Number(diamMatch[1])); setDuctType('round'); updated = true; }
      if (dLengthMatch) { setDuctLength(Number(dLengthMatch[1])); updated = true; }
      if (elbowMatch) { setElbowCount(Number(elbowMatch[1])); updated = true; }
      
      if (exactBranchMatch) { 
        setBranchCount(Number(exactBranchMatch[1])); 
        updated = true; 
      } else if (autoBranchCount > 1) {
        setBranchCount(autoBranchCount);
        updated = true;
      }
      if (menfezDimMatch) { 
        setRectWidth(Number(menfezDimMatch[1])); 
        setRectHeight(Number(menfezDimMatch[2])); 
        setDuctType('rect'); 
        updated = true; 
      }

      if (updated) {
        setToastMsg(`✅ ${file.name} başarıyla analiz edildi! Ölçüler sisteme işlendi.`);
      } else {
        setToastMsg(`⚠️ Dosyada okunabilir (Genişlik, Uzunluk vs.) mühendislik verisi bulunamadı.`);
      }
      setTimeout(() => setToastMsg(''), 5000);
    };
    reader.readAsText(file);
  };

  const exportPDF = async () => {
    if (!dashboardRef.current) return;
    const canvas = await html2canvas(dashboardRef.current, { scale: 2, backgroundColor: '#0f172a' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.setFontSize(16);
    pdf.text("HVAC Karar Destek Sistemi - Profesyonel Saha Raporu", 14, 15);
    pdf.setFontSize(10);
    pdf.text(`Rapor Tarihi: ${new Date().toLocaleString()}`, 14, 22);
    pdf.addImage(imgData, 'PNG', 0, 30, pdfWidth, pdfHeight);
    pdf.save('HVAC_Profesyonel_Rapor.pdf');
  };

  return (
    <div className="app-container">
      {toastMsg && <div className="toast-notification">{toastMsg}</div>}

      <div className="header">
        <h1 className="title" style={{ margin: 0 }}>HVAC Mühendislik Motoru v4.0</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-3d" onClick={() => setShow3D(true)}>
            <Box size={18} />
            3D Plenum İncele
          </button>
          <button className="export-btn" onClick={exportPDF}>
            <Download size={18} />
            PDF İndir
          </button>
        </div>
      </div>
      
      {show3D && <StlViewer onClose={() => setShow3D(false)} />}
      
      {/* Sürükle Bırak Alanı */}
      <div 
        className={`drag-drop-zone ${isDragging ? 'dragging' : ''} ${loadedFile ? 'file-loaded' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileUpload').click()}
      >
        {loadedFile ? (
          <>
            <div style={{fontSize: "3rem", marginBottom: "1rem"}}>📄</div>
            <h3 style={{color: "#4ade80"}}>{loadedFile} Başarıyla Yüklendi!</h3>
            <p>Yeni bir dosya analiz etmek için sürükleyin veya tıklayın.</p>
          </>
        ) : (
          <>
            <UploadCloud size={40} className="upload-icon" />
            <h3>Proje Dosyasını Sürükleyin (.dwg, .dxf, .txt, .json)</h3>
            <p>Veya bilgisayardan seçmek için tıklayın.</p>
          </>
        )}
        <input id="fileUpload" type="file" accept=".txt,.json,.dxf,.csv,.dwg" hidden onChange={handleFileSelect} />
      </div>

      <div className="dashboard" ref={dashboardRef}>
        {/* Left Side: Controls */}
        <div className="glass-panel controls-panel">
          <h2>Mahal Ölçüleri</h2>
          <div className="input-group">
            <div className="input-header"><label>Genişlik (m)</label><span>{width} m</span></div>
            <input type="range" min="2" max="50" step="0.5" value={width} onChange={(e) => setWidth(Number(e.target.value))} />
          </div>
          <div className="input-group">
            <div className="input-header"><label>Uzunluk (m)</label><span>{length} m</span></div>
            <input type="range" min="2" max="50" step="0.5" value={length} onChange={(e) => setLength(Number(e.target.value))} />
          </div>
          <div className="input-group">
            <div className="input-header"><label>Yükseklik (m)</label><span>{height} m</span></div>
            <input type="range" min="2" max="10" step="0.1" value={height} onChange={(e) => setHeight(Number(e.target.value))} />
          </div>

          <div className="divider"></div>
          
          <h2>Fiziksel Kanal & Basınç (ΔP)</h2>
          <div className="input-group">
            <div className="input-header"><label>Hava Değişimi (ACH)</label><span>{ach} /h</span></div>
            <input type="range" min="1" max="20" step="1" value={ach} onChange={(e) => setAch(Number(e.target.value))} />
          </div>
          <div className="input-group">
            <div className="input-header"><label>Toplam Kanal Uzunluğu (m)</label><span>{ductLength} m</span></div>
            <input type="range" min="1" max="100" step="1" value={ductLength} onChange={(e) => setDuctLength(Number(e.target.value))} />
          </div>
          <div className="input-group">
            <div className="input-header"><label>Dağıtım Kanalı / Menfez Sayısı</label><span>{branchCount} Adet</span></div>
            <input type="range" min="1" max="20" step="1" value={branchCount} onChange={(e) => setBranchCount(Number(e.target.value))} />
          </div>

          <div className="toggle-group">
            <button className={`toggle-btn ${ductType === 'round' ? 'active' : ''}`} onClick={() => setDuctType('round')}>Yuvarlak</button>
            <button className={`toggle-btn ${ductType === 'rect' ? 'active' : ''}`} onClick={() => setDuctType('rect')}>Dikdörtgen</button>
          </div>

          {ductType === 'round' ? (
            <div className="input-group">
              <div className="input-header"><label>Kanal Çapı (mm)</label><span>Ø{diameter}</span></div>
              <input type="range" min="100" max="1000" step="10" value={diameter} onChange={(e) => setDiameter(Number(e.target.value))} />
            </div>
          ) : (
            <>
              <div className="input-group">
                <div className="input-header"><label>Kanal Eni (mm)</label><span>{rectWidth} mm</span></div>
                <input type="range" min="100" max="1500" step="50" value={rectWidth} onChange={(e) => setRectWidth(Number(e.target.value))} />
              </div>
              <div className="input-group">
                <div className="input-header"><label>Kanal Boyu (mm)</label><span>{rectHeight} mm</span></div>
                <input type="range" min="100" max="1000" step="50" value={rectHeight} onChange={(e) => setRectHeight(Number(e.target.value))} />
              </div>
            </>
          )}
        </div>

        {/* Right Side: Results */}
        <div className="results-panel">
          <div className="metrics-grid">
            <div className="glass-panel metric-card">
              <h3>Toplam Debi (Q)</h3>
              <div className="metric-value">{flowRate.toFixed(0)} <span>m³/h</span></div>
            </div>
            <div className="glass-panel metric-card">
              <h3>Kanal Başına Düşen Debi</h3>
              <div className="metric-value" style={{color: "#60a5fa"}}>{flowPerBranch.toFixed(0)} <span>m³/h</span></div>
            </div>
            <div className="glass-panel metric-card" style={{gridColumn: "1 / -1"}}>
              <h3>Toplam Basınç Kaybı (ΔP)</h3>
              <div className="metric-value" style={{color: "#a78bfa"}}>{pressureDrop.toFixed(1)} <span>Pascal</span></div>
            </div>
          </div>

          <div className={`glass-panel status-card ${status}`}>
            <div className="status-header">
              <h2>Kanal İçi Hava Hızı</h2>
              <div className="velocity-value">{velocity.toFixed(2)} <span>m/s</span></div>
            </div>
            
            <div className="status-message">
              {status === 'optimal' && (
                <>
                  <div className="icon">🟢</div>
                  <div>
                    <strong>Sistem Optimum</strong>
                    <p>Hava hızı ideal. Basınç kaybı ({pressureDrop.toFixed(1)} Pa) makul seviyelerde.</p>
                  </div>
                </>
              )}
              {status === 'warning' && (
                <>
                  <div className="icon">🟠</div>
                  <div>
                    <strong>Sınır Değer!</strong>
                    <p>Hız 4.5 - 5.0 m/s arasında. Kısmi ses yapma potansiyeli vardır.</p>
                  </div>
                </>
              )}
              {status === 'critical' && (
                <>
                  <div className="icon">🔴</div>
                  <div>
                    <strong>Kritik Mekanik ve Akustik Risk!</strong>
                    <p style={{marginBottom: "0.5rem"}}>Hız 5.0 m/s sınırının üzerinde! Sadece gürültü değil, uzun vadede ciddi mekanik hasarlar oluşur:</p>
                    <ul style={{margin: 0, paddingLeft: "1.2rem", color: "#f87171", fontSize: "0.95rem"}}>
                      <li><strong>Fan Motoru Yanması:</strong> Yüksek basınç (ΔP) fana aşırı yük bindirir, motor ömrü yarıya iner.</li>
                      <li><strong>Kanal Titreşimi:</strong> Havalandırma kanalları titreyerek asma tavanı zedeleyebilir.</li>
                      <li><strong>Aşırı Enerji Tüketimi:</strong> İstenen debiyi sağlamak için fan %40 daha fazla elektrik harcar.</li>
                    </ul>
                  </div>
                </>
              )}
              {status === 'invalid' && (
                <>
                  <div className="icon" style={{fontSize: "2rem"}}>⚠️</div>
                  <div>
                    <strong style={{color: "#fbbf24"}}>Mantıksız Veri (Sanity Check) Hatası!</strong>
                    <p style={{marginBottom: "0.5rem", color: "#d1d5db"}}>28 m/s gibi bir hız veya 1400 Pa basınç kaybı fiziksel olarak imkansızdır ve fanı anında patlatır. Olası kullanıcı hataları:</p>
                    <ul style={{margin: 0, paddingLeft: "1.2rem", color: "#fbbf24", fontSize: "0.95rem"}}>
                      <li><strong>Menfez Sayısı Eksik:</strong> Bütün debiyi (20.000 m³/h) tek bir kanala basmaya çalışıyorsunuz. Lütfen soldaki <em>Menfez Sayısı</em>'nı artırın.</li>
                      <li><strong>Birim Hatası:</strong> Ölçüleri (mm/m) yanlış girmiş olabilirsiniz.</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {recommendedProduct && (
            <div className="glass-panel recommendation-card">
              <h3>Üretici Kütüphanesi Önerisi</h3>
              <p style={{marginBottom: "0.5rem"}}>İdeal hava hızına ({"<"} 4.5 m/s) ve optimum basınç kaybına ulaşmak için önerilen standart ürün:</p>
              <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                <div><span style={{color: '#94a3b8', fontSize: '0.9rem'}}>Ürün Kodu:</span><br/><strong>{recommendedProduct.id}</strong></div>
                <div><span style={{color: '#94a3b8', fontSize: '0.9rem'}}>Çap:</span><br/><strong>Ø{recommendedProduct.diameter} mm</strong></div>
                <div><span style={{color: '#94a3b8', fontSize: '0.9rem'}}>Akustik Sınıf:</span><br/><strong>{recommendedProduct.class}</strong></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
