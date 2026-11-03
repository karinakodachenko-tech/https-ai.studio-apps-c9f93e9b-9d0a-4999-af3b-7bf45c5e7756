import React, { useState, useEffect } from 'react';
import { CameraCaptureView } from './components/CameraCaptureView';
import { AROverlayView } from './components/AROverlayView';
import { AudioNarratorPlayer } from './components/AudioNarratorPlayer';
import { SearchGroundedHistory } from './components/SearchGroundedHistory';
import { SouvenirCard } from './components/SouvenirCard';
import {
  LandmarkRecognitionData,
  LandmarkHistoryData,
  LandmarkAudioData,
  VisualFocalPoint,
} from './types';
import {
  Compass,
  Sparkles,
  Camera,
  MapPin,
  ShieldCheck,
  BookOpen,
  Headphones,
  Award,
  Layers,
  History,
  RotateCcw,
  AlertTriangle,
  Info,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  // Application State
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');

  // Analysis / Pipeline Loading States
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [pipelineStep, setPipelineStep] = useState<string>('');
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // Landmark Data States
  const [recognitionData, setRecognitionData] = useState<LandmarkRecognitionData | null>(null);
  const [historyData, setHistoryData] = useState<LandmarkHistoryData | null>(null);
  const [audioData, setAudioData] = useState<LandmarkAudioData | null>(null);

  // AR & Playback Settings
  const [activeVoice, setActiveVoice] = useState<string>('Kore');
  const [activeEraIndex, setActiveEraIndex] = useState<number>(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [showSouvenir, setShowSouvenir] = useState<boolean>(false);

  // Tourist Passport Saved Collection
  const [passportList, setPassportList] = useState<
    Array<{
      id: string;
      landmarkName: string;
      city: string;
      country: string;
      imageSrc: string;
      date: string;
      data: LandmarkRecognitionData;
      history: LandmarkHistoryData | null;
      audio: LandmarkAudioData | null;
    }>
  >([]);

  // Execute full photo tourism pipeline:
  // 1. Analyze with gemini-4-argon
  // 2. Fetch history via Google Search grounding with gemini-3.8-flash
  // 3. Generate narrated audio guide clip via gemini-3.8-flash-tts
  const handleProcessImage = async (
    imageBase64: string,
    imgMime: string,
    metadata?: { nameHint?: string }
  ) => {
    setCurrentImage(imageBase64);
    setMimeType(imgMime);
    setPipelineError(null);
    setRecognitionData(null);
    setHistoryData(null);
    setAudioData(null);
    setActiveEraIndex(0);

    try {
      // Step 1: Vision Recognition using gemini-3.8-flash
      setIsRecognizing(true);
      setPipelineStep('Analyzing urban architecture with gemini-3.8-flash...');

      const recogResponse = await fetch('/api/landmark/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType: imgMime }),
      });

      const recogJson = await recogResponse.json();

      if (!recogJson.success || !recogJson.data) {
        throw new Error(recogJson.error || 'Failed to identify landmark with gemini-3.8-flash');
      }

      const landmarkResult: LandmarkRecognitionData = recogJson.data;

      // If user had a hint or model fallback
      if (metadata?.nameHint && !landmarkResult.landmarkName) {
        landmarkResult.landmarkName = metadata.nameHint;
      }

      setRecognitionData(landmarkResult);
      setIsRecognizing(false);

      // Trigger celebration confetti on successful recognition!
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.5 },
      });

      // Step 2 & 3: Run Google Search Grounding and TTS in parallel or sequence
      setIsLoadingHistory(true);
      setIsLoadingAudio(true);
      setPipelineStep('Grounding history with Google Search via gemini-3.8-flash...');

      // Call Search Grounding
      const historyPromise = fetch('/api/landmark/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landmarkName: landmarkResult.landmarkName,
          city: landmarkResult.city,
          country: landmarkResult.country,
        }),
      }).then(async (res) => {
        const hJson = await res.json();
        if (hJson.success) {
          const hist: LandmarkHistoryData = {
            landmarkName: landmarkResult.landmarkName,
            historyReport: hJson.historyReport,
            sources: hJson.sources,
            searchQueries: hJson.searchQueries,
            modelUsed: hJson.modelUsed,
          };
          setHistoryData(hist);
          setIsLoadingHistory(false);
          return hist;
        } else {
          setIsLoadingHistory(false);
          return null;
        }
      });

      // Prepare AR narration script for TTS
      const narrationText =
        landmarkResult.arNarrationPitch ||
        `Welcome to ${landmarkResult.landmarkName} in ${landmarkResult.city}. A wondrous marvel of ${landmarkResult.architecturalStyle} architecture standing strong since ${landmarkResult.estimatedYearOrEra}. Notice the intricate details standing before you.`;

      setPipelineStep('Synthesizing AR audio tour guide with gemini-3.8-flash-tts...');

      // Step 3: Call TTS
      const audioPromise = fetch('/api/landmark/narrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptText: narrationText,
          voiceName: activeVoice,
          speakerName: 'Aura',
          toneStyle: 'Captivating architectural historian, cinematic, atmospheric travel guide',
        }),
      }).then(async (res) => {
        const aJson = await res.json();
        if (aJson.success) {
          const aud: LandmarkAudioData = {
            audioBase64: aJson.audioBase64,
            mimeType: aJson.mimeType,
            voiceUsed: aJson.voiceUsed,
            modelUsed: aJson.modelUsed,
          };
          setAudioData(aud);
          setIsLoadingAudio(false);
          return aud;
        } else {
          setIsLoadingAudio(false);
          return null;
        }
      });

      const [resolvedHistory, resolvedAudio] = await Promise.all([historyPromise, audioPromise]);

      // Save to tourist passport collection
      setPassportList((prev) => [
        {
          id: Date.now().toString(),
          landmarkName: landmarkResult.landmarkName,
          city: landmarkResult.city,
          country: landmarkResult.country,
          imageSrc: imageBase64,
          date: new Date().toLocaleDateString(),
          data: landmarkResult,
          history: resolvedHistory,
          audio: resolvedAudio,
        },
        ...prev.filter((p) => p.landmarkName !== landmarkResult.landmarkName),
      ]);

      setPipelineStep('');
    } catch (err: any) {
      console.error('Pipeline processing error:', err);
      setPipelineError(err.message || 'An error occurred during landmark analysis');
      setIsRecognizing(false);
      setIsLoadingHistory(false);
      setIsLoadingAudio(false);
      setPipelineStep('');
    }
  };

  // Regenerate voice with newly selected voice persona
  const handleRegenerateVoice = async (newVoice?: string) => {
    if (!recognitionData) return;
    const voiceToUse = newVoice || activeVoice;
    setIsLoadingAudio(true);

    try {
      const script =
        recognitionData.arNarrationPitch ||
        `Standing before you is ${recognitionData.landmarkName} in ${recognitionData.city}. Discover its legacy through the lens of time.`;

      const res = await fetch('/api/landmark/narrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptText: script,
          voiceName: voiceToUse,
          speakerName: 'Aura',
          toneStyle: 'Captivating architectural historian, cinematic travel guide',
        }),
      });

      const aJson = await res.json();
      if (aJson.success) {
        setAudioData({
          audioBase64: aJson.audioBase64,
          mimeType: aJson.mimeType,
          voiceUsed: voiceToUse,
          modelUsed: aJson.modelUsed,
        });
      }
    } catch (err) {
      console.error('Error regenerating voice:', err);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleResetToCamera = () => {
    setCurrentImage(null);
    setRecognitionData(null);
    setHistoryData(null);
    setAudioData(null);
    setPipelineError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-cyan-500/20 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <Compass className="w-5 h-5 text-slate-950 animate-spin [animation-duration:16s]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-white">
                AuraSight <span className="text-cyan-400">AR</span>
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                Photo Tourism
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono hidden md:block">
              AI Landmark Recognition • Google Search Grounding • AR Voice Clips
            </p>
          </div>
        </div>

        {/* Model Intelligence Badges & Actions */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-2 text-[10px] font-mono">
            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              Vision: <span className="text-amber-300 font-bold">gemini-3.8-flash</span>
            </span>
            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              Search: <span className="text-emerald-300 font-bold">gemini-3.8-flash</span>
            </span>
            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              Audio: <span className="text-cyan-300 font-bold">gemini-3.8-flash-tts</span>
            </span>
          </div>

          {currentImage && (
            <button
              onClick={handleResetToCamera}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 transition-colors border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Photo</span>
            </button>
          )}

          {recognitionData && (
            <button
              onClick={() => setShowSouvenir(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-400/20 transition-all active:scale-95"
            >
              <Award className="w-3.5 h-3.5" />
              <span>AR Passport</span>
            </button>
          )}
        </div>
      </header>

      {/* Main App Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">
        {/* Pipeline Error Banner */}
        {pipelineError && (
          <div className="bg-red-950/70 border border-red-500/50 rounded-2xl p-4 flex items-start justify-between gap-3 text-red-200">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-white">Recognition Notice</h4>
                <p className="text-xs text-red-300 mt-0.5 leading-relaxed">{pipelineError}</p>
              </div>
            </div>
            <button
              onClick={() => setPipelineError(null)}
              className="text-red-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-red-900/60"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* View 1: When No Image Is Selected Yet -> Camera Capture & Gallery */}
        {!currentImage && !isRecognizing && (
          <div className="flex flex-col gap-8 py-4">
            {/* Hero Welcome Banner */}
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs font-mono">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Next-Generation Visual City Tourism</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                Point your lens at any landmark. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
                  Hear its living history.
                </span>
              </h1>
              <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
                Take a photo in any city worldwide. Gemini identifies architectural signatures, verifies accurate historical secrets via Google Search, and transports you through time with spatial AR audio.
              </p>
            </div>

            {/* Camera / Upload / Gallery Selector */}
            <CameraCaptureView
              onCaptureImage={handleProcessImage}
              isAnalyzing={isRecognizing}
            />

            {/* Previous Visited Landmarks Passport Drawer */}
            {passportList.length > 0 && (
              <div className="mt-8 border-t border-slate-800/80 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider">
                      My Scanned Travel Passport ({passportList.length})
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {passportList.map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => {
                        setCurrentImage(entry.imageSrc);
                        setRecognitionData(entry.data);
                        setHistoryData(entry.history);
                        setAudioData(entry.audio);
                      }}
                      className="group bg-slate-900 border border-slate-800 hover:border-cyan-500 rounded-xl overflow-hidden cursor-pointer shadow-md transition-all hover:scale-[1.02]"
                    >
                      <div className="aspect-[16/10] overflow-hidden relative">
                        <img
                          src={entry.imageSrc}
                          alt={entry.landmarkName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute top-1.5 right-1.5 bg-slate-950/80 text-[10px] font-mono text-cyan-300 px-2 py-0.5 rounded">
                          {entry.date}
                        </div>
                      </div>
                      <div className="p-2.5">
                        <h5 className="text-xs font-bold text-white truncate">{entry.landmarkName}</h5>
                        <p className="text-[10px] text-slate-400 truncate">{entry.city}, {entry.country}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* View 2: Analyzing Pipeline Progress Screen */}
        {isRecognizing && (
          <div className="min-h-[480px] flex flex-col items-center justify-center text-center p-8 bg-slate-900/60 rounded-3xl border border-cyan-500/30">
            <div className="relative w-28 h-28 mb-6">
              {/* Spinning AR Rings */}
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400 animate-spin [animation-duration:8s]" />
              <div className="absolute inset-2 rounded-full border border-indigo-500/50 animate-ping [animation-duration:3s]" />
              <div className="absolute inset-4 rounded-full bg-slate-900 border border-cyan-400 flex items-center justify-center shadow-2xl shadow-cyan-500/50">
                <Camera className="w-8 h-8 text-cyan-400 animate-pulse" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Analyzing Landmark with Gemini 3.8 Flash</h3>
            <p className="text-xs font-mono text-cyan-300 tracking-wider max-w-md animate-pulse">
              {pipelineStep || 'Extracting architectural orders, masonry geometry, and focal points...'}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-md text-[11px] font-mono text-slate-400">
              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>Feature Vector Extraction</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
                Urban Spatial Grounding
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
                3D Holographic Mesh Generation
              </span>
            </div>
          </div>
        )}

        {/* View 3: Loaded AR Landmark Experience & Narrator */}
        {currentImage && recognitionData && !isRecognizing && (
          <div className="flex flex-col gap-6">
            {/* Landmark Identity Header Strip */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-5 rounded-2xl border border-cyan-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0 shadow-lg">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-black text-white tracking-tight">
                      {recognitionData.landmarkName}
                    </h2>
                    {recognitionData.alternateNames && recognitionData.alternateNames.length > 0 && (
                      <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                        ({recognitionData.alternateNames[0]})
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                      {recognitionData.category}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1 font-mono">
                    <span className="text-cyan-400 font-semibold">
                      {recognitionData.city}, {recognitionData.country}
                    </span>
                    <span>•</span>
                    <span className="text-slate-400">
                      Era: <strong className="text-slate-200">{recognitionData.estimatedYearOrEra}</strong>
                    </span>
                    <span>•</span>
                    <span className="text-slate-400">
                      Style: <strong className="text-slate-200">{recognitionData.architecturalStyle}</strong>
                    </span>
                    <span>•</span>
                    <span className="text-amber-400 font-bold">
                      {(recognitionData.confidence * 100).toFixed(0)}% Confidence
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSouvenir(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-400/20 active:scale-95 transition-all"
                >
                  <Award className="w-4 h-4" />
                  <span>Tourist Stamp</span>
                </button>
              </div>
            </div>

            {/* Split Grid: Left = Three.js Holographic AR View; Right / Bottom = Audio Guide & Grounded Dossier */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Interactive 3D AR Overlay View */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs font-mono px-1">
                  <span className="text-cyan-400 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Holographic Spatial AR Viewport</span>
                  </span>
                  <span className="text-slate-400">
                    Interact with spatial pins or scrub historical eras below
                  </span>
                </div>

                {/* 3D AR Viewport */}
                <AROverlayView
                  imageSrc={currentImage}
                  landmarkName={recognitionData.landmarkName}
                  category={recognitionData.category}
                  focalPoints={recognitionData.visualFocalPoints || []}
                  eras={recognitionData.historicalEras || []}
                  isPlayingAudio={isPlayingAudio}
                  activeEraIndex={activeEraIndex}
                  onSelectEra={(idx) => setActiveEraIndex(idx)}
                />

                {/* Detected Architectural Signatures Bar */}
                {recognitionData.keyVisualFeatures && recognitionData.keyVisualFeatures.length > 0 && (
                  <div className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800 text-xs">
                    <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider block mb-1.5">
                      Identified Visual Signatures (Gemini 3.8 Flash):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {recognitionData.keyVisualFeatures.map((feat, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 text-[11px] font-mono"
                        >
                          ✓ {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Audio Narrator Player & Search Grounded History */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                {/* 1. AR Narrated Clip Player (Gemini 3.8 Flash TTS) */}
                <AudioNarratorPlayer
                  audioBase64={audioData?.audioBase64 || null}
                  scriptText={recognitionData.arNarrationPitch || ''}
                  landmarkName={recognitionData.landmarkName}
                  voiceName={activeVoice}
                  onVoiceChange={(voice) => {
                    setActiveVoice(voice);
                    handleRegenerateVoice(voice);
                  }}
                  isLoadingAudio={isLoadingAudio}
                  onRegenerateVoice={() => handleRegenerateVoice()}
                  onPlayStateChange={(isPlaying) => setIsPlayingAudio(isPlaying)}
                />

                {/* 2. Google Search Grounded History & Live Q&A */}
                <SearchGroundedHistory
                  historyData={historyData}
                  isLoading={isLoadingHistory}
                  landmarkName={recognitionData.landmarkName}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Souvenir Passport Stamp Modal */}
      {showSouvenir && recognitionData && currentImage && (
        <SouvenirCard
          landmark={recognitionData}
          imageSrc={currentImage}
          onClose={() => setShowSouvenir(false)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 px-4 text-center text-xs text-slate-500 font-mono">
        <p>
          AuraSight AR • Powered by Gemini 3.8 Flash (Vision &amp; Google Search Grounding) and Gemini 3.8 Flash TTS
        </p>
      </footer>
    </div>
  );
}
