import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { X } from 'lucide-react';

export default function StlViewer({ onClose }) {
  const mountRef = useRef(null);

  useEffect(() => {
    // Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a'); // Ana tema rengi (Slate 900)

    // Camera
    const camera = new THREE.PerspectiveCamera(45, (window.innerWidth * 0.8) / (window.innerHeight * 0.7), 0.1, 5000);
    camera.position.set(200, 200, 400);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth * 0.8, window.innerHeight * 0.7);
    renderer.setPixelRatio(window.devicePixelRatio);
    if (mountRef.current) {
        mountRef.current.appendChild(renderer.domElement);
    }

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(100, 200, 100);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight2.position.set(-100, -200, -100);
    scene.add(dirLight2);

    // Load STL Model
    const loader = new STLLoader();
    loader.load('/Plenum_Transition.stl', (geometry) => {
      // Modeli merkeze oturt
      geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      geometry.boundingBox.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);

      // Malzeme (Aerodinamik Metalik Mavi)
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x0ea5e9, 
        metalness: 0.6,
        roughness: 0.2,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      // Modeli kameraya sığması için küçült
      mesh.scale.set(0.3, 0.3, 0.3);
      mesh.rotation.x = -Math.PI / 2; // Y eksenini yukarı al
      scene.add(mesh);
    }, undefined, (error) => {
      console.error("STL Yükleme Hatası:", error);
    });

    // Handle Window Resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const width = window.innerWidth * 0.8;
      const height = window.innerHeight * 0.7;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="stl-modal-overlay">
      <div className="stl-modal-content">
        <div className="stl-modal-header">
          <h2>Aerodinamik Plenum 3D Model Önizleme</h2>
          <button onClick={onClose} className="close-btn" aria-label="Kapat"><X size={24} /></button>
        </div>
        <div ref={mountRef} className="stl-canvas-container" />
        <div className="stl-modal-footer">
          <p>💡 Farenin <strong>Sol Tuşu</strong> ile modeli döndürebilir, <strong>Tekerlek</strong> ile yakınlaştırıp uzaklaştırabilir, <strong>Sağ Tuş</strong> ile modeli kaydırabilirsiniz.</p>
        </div>
      </div>
    </div>
  );
}
