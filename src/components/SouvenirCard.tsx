import React, { useRef } from 'react';
import { LandmarkRecognitionData } from '../types';
import { Award, Download, MapPin, Calendar, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SouvenirCardProps {
  landmark: LandmarkRecognitionData;
  imageSrc: string;
  onClose: () => void;
}

export const SouvenirCard: React.FC<SouvenirCardProps> = ({
  landmark,
  imageSrc,
  onClose,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const handleDownloadCard = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark sleek background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle border glow
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 12;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Header banner
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('AURASIGHT AR // CERTIFIED TRAVEL PASSPORT', 50, 75);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Draw image
      ctx.drawImage(img, 50, 110, 900, 680);

      // Card details
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText(landmark.landmarkName, 50, 850);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '28px sans-serif';
      ctx.fillText(`${landmark.city}, ${landmark.country}`, 50, 900);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '22px sans-serif';
      ctx.fillText(`Style: ${landmark.architecturalStyle} • Era: ${landmark.estimatedYearOrEra}`, 50, 940);

      // Key features
      ctx.fillStyle = '#f8fafc';
      ctx.font = '20px sans-serif';
      let yOffset = 1000;
      landmark.keyVisualFeatures.slice(0, 3).forEach((feat) => {
        ctx.fillText(`• ${feat}`, 50, yOffset);
        yOffset += 35;
      });

      // Stamp in bottom corner
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(830, 1180, 80, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('VERIFIED AR', 830, 1165);
      ctx.fillText(new Date().toLocaleDateString(), 830, 1195);
      ctx.fillText('PASSPORT', 830, 1225);

      // Trigger download
      const link = document.createElement('a');
      link.download = `${landmark.landmarkName.replace(/\s+/g, '_')}_AR_Passport.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      triggerConfetti();
    };
    img.src = imageSrc;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div
        ref={cardRef}
        className="relative w-full max-w-lg bg-slate-900 border-2 border-cyan-500/50 rounded-3xl overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Souvenir Header */}
        <div className="p-4 bg-gradient-to-r from-cyan-950 to-indigo-950 border-b border-cyan-500/30 flex items-center gap-2 text-cyan-300 text-xs font-mono">
          <Award className="w-4 h-4 text-amber-400" />
          <span className="font-bold uppercase tracking-wider">Official AR Tourist Stamp</span>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="relative rounded-2xl overflow-hidden aspect-[16/10] border border-cyan-500/30 shadow-lg">
            <img src={imageSrc} alt={landmark.landmarkName} className="w-full h-full object-cover" />
            <div className="absolute top-3 right-3 bg-amber-400/90 text-slate-950 px-2.5 py-1 rounded-full text-xs font-mono font-bold shadow">
              {(landmark.confidence * 100).toFixed(0)}% MATCH
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">{landmark.landmarkName}</h2>
            <div className="flex items-center gap-2 text-cyan-400 text-sm mt-1">
              <MapPin className="w-4 h-4" />
              <span>{landmark.city}, {landmark.country}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block mb-1">STYLE</span>
              <span className="text-slate-200 font-semibold">{landmark.architecturalStyle}</span>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block mb-1">ERA</span>
              <span className="text-slate-200 font-semibold">{landmark.estimatedYearOrEra}</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <span className="text-xs font-mono text-amber-400 block mb-2 font-bold uppercase tracking-wider">
              Identified Architectural Signatures:
            </span>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
              {landmark.keyVisualFeatures.map((feat, i) => (
                <li key={i}>{feat}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Download Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <span className="text-[11px] font-mono text-slate-400">
            Export high-res souvenir card
          </span>
          <button
            onClick={handleDownloadCard}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Save Souvenir Badge</span>
          </button>
        </div>
      </div>
    </div>
  );
};
