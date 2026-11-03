import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { VisualFocalPoint, HistoricalEra } from '../types';
import { Compass, Sparkles, Eye, Info, Clock, Volume2 } from 'lucide-react';

interface AROverlayViewProps {
  imageSrc: string;
  landmarkName: string;
  category: string;
  focalPoints: VisualFocalPoint[];
  eras?: HistoricalEra[];
  isPlayingAudio: boolean;
  audioAnalyser?: AnalyserNode | null;
  activeEraIndex: number;
  onSelectEra: (index: number) => void;
  onPinClick?: (pin: VisualFocalPoint) => void;
}

export const AROverlayView: React.FC<AROverlayViewProps> = ({
  imageSrc,
  landmarkName,
  category,
  focalPoints,
  eras = [],
  isPlayingAudio,
  audioAnalyser,
  activeEraIndex,
  onSelectEra,
  onPinClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPin, setSelectedPin] = useState<VisualFocalPoint | null>(null);
  const [hudMode, setHudMode] = useState<'hologram' | 'blueprint' | 'thermal'>('hologram');
  const [azimuth, setAzimuth] = useState<number>(142);
  const [elevation, setElevation] = useState<number>(16.5);

  // Three.js scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const wireframeGroupRef = useRef<THREE.Group | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Parallax tracking
  const mousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Create Architectural Wireframe Model based on landmark category
    const wireframeGroup = new THREE.Group();
    wireframeGroupRef.current = wireframeGroup;
    scene.add(wireframeGroup);

    // Procedural landmark wireframe representation
    const wireframeColor = eras[activeEraIndex]?.wireframeThemeColor || '#06b6d4';
    const lineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(wireframeColor),
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });

    // Outer architectural rings & dome / arches
    const cylinderGeo = new THREE.CylinderGeometry(1.6, 2.0, 2.2, 16, 6, true);
    const cylinderEdges = new THREE.EdgesGeometry(cylinderGeo);
    const cylinderLine = new THREE.LineSegments(cylinderEdges, lineMaterial);
    cylinderLine.position.y = -0.4;
    wireframeGroup.add(cylinderLine);

    // Dome / Spire on top
    const sphereGeo = new THREE.SphereGeometry(1.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const sphereEdges = new THREE.EdgesGeometry(sphereGeo);
    const sphereLine = new THREE.LineSegments(sphereEdges, lineMaterial);
    sphereLine.position.y = 0.7;
    wireframeGroup.add(sphereLine);

    // Ground target compass grid
    const gridHelper = new THREE.PolarGridHelper(3.2, 8, 4, 32, 0x06b6d4, 0x0369a1);
    gridHelper.position.y = -1.5;
    wireframeGroup.add(gridHelper);

    // Spatial LiDAR particle field
    const particleCount = 280;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const baseColor = new THREE.Color(wireframeColor);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 8;
      positions[i + 1] = (Math.random() - 0.5) * 6;
      positions[i + 2] = (Math.random() - 0.5) * 5;

      colors[i] = baseColor.r * (0.6 + Math.random() * 0.4);
      colors[i + 1] = baseColor.g * (0.6 + Math.random() * 0.4);
      colors[i + 2] = baseColor.b * (0.6 + Math.random() * 0.4);
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particlesRef.current = particles;
    scene.add(particles);

    // Mouse movement parallax
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mousePos.current = { x, y };

      // Update HUD telemetry
      setAzimuth(Math.round(140 + x * 20));
      setElevation(Number((16 + y * 6).toFixed(1)));
    };

    const container = containerRef.current;
    container.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (wireframeGroupRef.current) {
        wireframeGroupRef.current.rotation.y = elapsedTime * 0.18 + mousePos.current.x * 0.4;
        wireframeGroupRef.current.rotation.x = 0.15 + mousePos.current.y * 0.2;

        // Reactive audio pulse on wireframe scale
        if (isPlayingAudio) {
          const pulse = Math.sin(elapsedTime * 6) * 0.03;
          wireframeGroupRef.current.scale.set(1 + pulse, 1 + pulse, 1 + pulse);
        } else {
          wireframeGroupRef.current.scale.set(1, 1, 1);
        }
      }

      if (particlesRef.current) {
        particlesRef.current.rotation.y = elapsedTime * 0.05;
      }

      camera.position.x = THREE.MathUtils.lerp(camera.position.x, mousePos.current.x * 0.8, 0.05);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, mousePos.current.y * 0.5, 0.05);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      container.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update wireframe theme color when active era changes
  useEffect(() => {
    if (!wireframeGroupRef.current) return;
    const colorHex = eras[activeEraIndex]?.wireframeThemeColor || '#06b6d4';
    const newColor = new THREE.Color(colorHex);

    wireframeGroupRef.current.traverse((child) => {
      if (child instanceof THREE.LineSegments && child.material instanceof THREE.LineBasicMaterial) {
        child.material.color = newColor;
      }
    });

    if (particlesRef.current && particlesRef.current.material instanceof THREE.PointsMaterial) {
      particlesRef.current.material.color = newColor;
    }
  }, [activeEraIndex, eras]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[460px] md:min-h-[560px] rounded-2xl overflow-hidden select-none bg-slate-950 border border-cyan-500/30 shadow-2xl shadow-cyan-950/50 group"
    >
      {/* Background Photo */}
      <img
        src={imageSrc}
        alt={landmarkName}
        className={`w-full h-full object-cover transition-all duration-700 ${
          hudMode === 'blueprint'
            ? 'filter contrast-150 saturate-50 invert hue-rotate-180 brightness-75'
            : hudMode === 'thermal'
            ? 'filter hue-rotate-90 saturate-200 contrast-125'
            : 'brightness-90 contrast-105'
        }`}
      />

      {/* Subtle Scanline Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40 z-10" />

      {/* Holographic Three.js Canvas Layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
      />

      {/* AR HUD Reticles & Framing Brackets */}
      <div className="absolute inset-4 pointer-events-none z-30 flex flex-col justify-between">
        {/* Top Header Telemetry */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-cyan-500/40 text-xs font-mono text-cyan-300">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold tracking-wider">AR LOCK // ACTIVE</span>
            <span className="text-slate-400">|</span>
            <span>{category}</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/40 text-xs font-mono text-cyan-400">
            <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin [animation-duration:12s]" />
            <span>AZ {azimuth}°</span>
            <span className="text-slate-500">•</span>
            <span>ELEV +{elevation}°</span>
          </div>
        </div>

        {/* Center Target Crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-cyan-400/25 rounded-full pointer-events-none flex items-center justify-center">
          <div className="w-36 h-36 border border-dashed border-cyan-400/40 rounded-full animate-spin [animation-duration:24s]" />
          <div className="w-3 h-3 bg-cyan-400/40 rounded-full" />
          {/* Tick lines */}
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
          <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent" />
        </div>

        {/* Spatial Focal Point Pins */}
        <div className="absolute inset-0 pointer-events-auto">
          {focalPoints.map((pin) => {
            const isSelected = selectedPin?.id === pin.id;
            return (
              <div
                key={pin.id}
                style={{
                  left: `${pin.xPercent}%`,
                  top: `${pin.yPercent}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-40 transition-transform duration-300 hover:scale-125"
                onClick={() => {
                  setSelectedPin(isSelected ? null : pin);
                  if (onPinClick) onPinClick(pin);
                }}
              >
                {/* Pulse Ring */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-8 h-8 rounded-full border border-amber-400/80 animate-ping [animation-duration:2s]" />
                  <div className="w-5 h-5 rounded-full bg-slate-950/90 border-2 border-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                  </div>
                  {/* Pin label badge */}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/90 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono tracking-wider font-semibold text-amber-300 border border-amber-400/40 shadow-md">
                    {pin.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Pin Details Overlay Card */}
        {selectedPin && (
          <div className="absolute bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-xs bg-slate-900/95 backdrop-blur-xl border border-amber-500/50 rounded-xl p-4 shadow-2xl z-50 text-slate-100 pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-mono font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AR Focal Point</span>
              </div>
              <button
                onClick={() => setSelectedPin(null)}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono px-1 py-0.5 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
            <h4 className="font-bold text-sm text-amber-100">{selectedPin.label}</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{selectedPin.description}</p>
          </div>
        )}

        {/* Bottom AR Controls & Time Travel Slider */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-auto z-40 bg-slate-950/85 backdrop-blur-xl p-3 rounded-xl border border-cyan-500/40">
          {/* Era Time Travel */}
          {eras.length > 0 ? (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs font-mono text-cyan-300 font-semibold uppercase tracking-wider shrink-0">
                Era:
              </span>
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
                {eras.map((era, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectEra(idx)}
                    className={`px-2.5 py-1 rounded text-xs font-mono tracking-wide transition-all shrink-0 ${
                      activeEraIndex === idx
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/40 scale-105'
                        : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-cyan-200 border border-slate-700/60'
                    }`}
                  >
                    {era.eraName}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs font-mono text-cyan-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Holographic Spatial Projection Active</span>
            </div>
          )}

          {/* HUD Optical Modes */}
          <div className="flex items-center gap-1.5 self-end md:self-auto">
            <span className="text-[11px] font-mono text-slate-400 mr-1">OPTICS:</span>
            {(['hologram', 'blueprint', 'thermal'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setHudMode(mode)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase transition-all ${
                  hudMode === mode
                    ? 'bg-amber-400 text-slate-950 font-bold shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
