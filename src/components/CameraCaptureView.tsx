import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, Image as ImageIcon, Sparkles, RefreshCw, X, AlertCircle } from 'lucide-react';
import { SAMPLE_LANDMARKS } from '../data/sampleLandmarks';
import { SampleLandmark } from '../types';

interface CameraCaptureViewProps {
  onCaptureImage: (imageBase64: string, mimeType: string, metadata?: { nameHint?: string }) => void;
  isAnalyzing: boolean;
}

export const CameraCaptureView: React.FC<CameraCaptureViewProps> = ({
  onCaptureImage,
  isAnalyzing,
}) => {
  const [mode, setMode] = useState<'sample' | 'camera' | 'upload'>('sample');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream when mode changes
  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [mode]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access device camera. Please check permissions or upload a photo.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    stopCamera();
    onCaptureImage(dataUrl, 'image/jpeg');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        onCaptureImage(result, file.type || 'image/jpeg');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = async (sample: SampleLandmark) => {
    try {
      // Fetch sample image and convert to base64
      const response = await fetch(sample.imageUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        onCaptureImage(base64Data, blob.type || 'image/jpeg', { nameHint: sample.name });
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Failed to load sample image:', err);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Mode Navigation Tabs */}
      <div className="flex items-center justify-center">
        <div className="inline-flex bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-cyan-500/30 shadow-xl">
          <button
            onClick={() => setMode('sample')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
              mode === 'sample'
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Iconic Gallery</span>
          </button>

          <button
            onClick={() => setMode('camera')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
              mode === 'camera'
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Live Camera AR</span>
          </button>

          <button
            onClick={() => setMode('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
              mode === 'upload'
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Photo</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="w-full">
        {mode === 'camera' && (
          <div className="relative w-full aspect-[4/3] max-w-2xl mx-auto rounded-3xl overflow-hidden bg-slate-950 border-2 border-cyan-500/40 shadow-2xl shadow-cyan-950/40">
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-300">
                <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
                <p className="text-sm font-semibold">{cameraError}</p>
                <button
                  onClick={() => setMode('upload')}
                  className="mt-4 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold"
                >
                  Upload Photo Instead
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Viewfinder AR Reticle Overlay */}
                <div className="absolute inset-6 pointer-events-none border border-cyan-400/30 rounded-2xl flex flex-col justify-between p-4">
                  <div className="flex justify-between items-center text-[10px] font-mono text-cyan-400">
                    <span>FRAME // 4K OPTICAL</span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      REC VIEW
                    </span>
                  </div>

                  <div className="self-center w-24 h-24 border border-dashed border-cyan-400/50 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono text-cyan-400">
                    <span>GPS 41.8902° N, 12.4922° E</span>
                    <span>AI LANDMARK SCAN READY</span>
                  </div>
                </div>

                {/* Shutter Button */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
                  <button
                    onClick={handleSnapPhoto}
                    disabled={isAnalyzing}
                    className="w-16 h-16 rounded-full bg-white/90 p-1.5 shadow-2xl shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
                  >
                    <div className="w-full h-full rounded-full border-2 border-slate-900 flex items-center justify-center group-hover:bg-cyan-500 transition-colors">
                      <Camera className="w-6 h-6 text-slate-950" />
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {mode === 'upload' && (
          <div className="max-w-xl mx-auto">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 bg-slate-900/60 hover:bg-slate-900/90 rounded-3xl p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-900 transition-all">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Click or drag a city photo here</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Snap any famous monument, cathedral, skyscraper, or bridge to trigger recognition with Gemini
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/30">
                Supports JPG, PNG, WebP up to 25MB
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        )}

        {mode === 'sample' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant Testing Gallery • Pick an iconic landmark</span>
              </span>
              <span className="text-[11px] font-mono text-cyan-400">
                1-Click Recognize &amp; Narrate
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {SAMPLE_LANDMARKS.map((landmark) => (
                <div
                  key={landmark.id}
                  onClick={() => handleSelectSample(landmark)}
                  className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-900 border border-slate-800 hover:border-cyan-400 cursor-pointer shadow-lg hover:shadow-cyan-900/50 hover:scale-[1.02] transition-all duration-300"
                >
                  <img
                    src={landmark.imageUrl}
                    alt={landmark.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-3 text-left">
                    <span className="text-[10px] font-mono text-amber-400 font-semibold uppercase tracking-wider">
                      {landmark.city}, {landmark.country}
                    </span>
                    <h5 className="text-xs sm:text-sm font-bold text-white leading-tight">
                      {landmark.name}
                    </h5>
                  </div>
                  {/* Hover Scan Indicator */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-cyan-500 text-slate-950 text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow">
                    SCAN
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
