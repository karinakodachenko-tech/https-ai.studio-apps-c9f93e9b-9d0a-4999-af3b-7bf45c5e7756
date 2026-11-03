import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  Headphones,
  Sparkles,
  Download,
  Sliders,
  Music,
} from 'lucide-react';

interface AudioNarratorPlayerProps {
  audioBase64: string | null;
  scriptText: string;
  landmarkName: string;
  voiceName: string;
  onVoiceChange: (voice: string) => void;
  isLoadingAudio: boolean;
  onRegenerateVoice: () => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

const VOICES = [
  { id: 'Kore', label: 'Kore', desc: 'Warm, captivating storyteller' },
  { id: 'Fenrir', label: 'Fenrir', desc: 'Authoritative cultural historian' },
  { id: 'Puck', label: 'Puck', desc: 'Vibrant, enthusiastic explorer' },
  { id: 'Zephyr', label: 'Zephyr', desc: 'Calm, architectural scholar' },
  { id: 'Charon', label: 'Charon', desc: 'Deep, dramatic heritage guide' },
];

export const AudioNarratorPlayer: React.FC<AudioNarratorPlayerProps> = ({
  audioBase64,
  scriptText,
  landmarkName,
  voiceName,
  onVoiceChange,
  isLoadingAudio,
  onRegenerateVoice,
  onPlayStateChange,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [ambientAudioOn, setAmbientAudioOn] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ambientOscillatorRef = useRef<OscillatorNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize or update audio element when base64 changes
  useEffect(() => {
    if (!audioBase64) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audioUrl = `data:audio/wav;base64,${audioBase64}`;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      setDuration(audio.duration || 0);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      if (onPlayStateChange) onPlayStateChange(false);
    };

    // Auto-play when clip is loaded
    audio.play().then(() => {
      setIsPlaying(true);
      if (onPlayStateChange) onPlayStateChange(true);
    }).catch(() => {
      // Browser autoplay policy might block without interaction
      setIsPlaying(false);
      if (onPlayStateChange) onPlayStateChange(false);
    });

    return () => {
      audio.pause();
    };
  }, [audioBase64]);

  // Handle ambient background audio simulation
  useEffect(() => {
    if (ambientAudioOn) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, ctx.currentTime); // Low soothing drone
        gain.gain.setValueAtTime(0.015, ctx.currentTime); // Very soft
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        ambientOscillatorRef.current = osc;
        ambientGainRef.current = gain;
      } catch (err) {
        console.error('Ambient audio error:', err);
      }
    } else {
      if (ambientOscillatorRef.current) {
        try {
          ambientOscillatorRef.current.stop();
          ambientOscillatorRef.current.disconnect();
        } catch (_) {}
      }
    }

    return () => {
      if (ambientOscillatorRef.current) {
        try {
          ambientOscillatorRef.current.stop();
        } catch (_) {}
      }
    };
  }, [ambientAudioOn]);

  // Audio wave visualizer canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const renderWave = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const numBars = 36;
      const barWidth = canvas.width / numBars;

      for (let i = 0; i < numBars; i++) {
        // Synthesize dynamic reactive height based on play state and wave phase
        let amplitude = 0.15;
        if (isPlaying) {
          amplitude = 0.3 + 0.6 * Math.abs(Math.sin(time * 2 + i * 0.35) * Math.cos(time * 1.5 + i * 0.1));
        }

        const barHeight = amplitude * canvas.height * 0.85;
        const x = i * barWidth;
        const y = (canvas.height - barHeight) / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(0.5, '#06b6d4');
        grad.addColorStop(1, '#6366f1');

        ctx.fillStyle = grad;
        ctx.fillRect(x + 2, y, barWidth - 4, barHeight);
      }

      animationFrameRef.current = requestAnimationFrame(renderWave);
    };

    renderWave();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (onPlayStateChange) onPlayStateChange(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        if (onPlayStateChange) onPlayStateChange(true);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const cycleSpeed = () => {
    const speeds = [0.9, 1.0, 1.25, 1.5];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleDownload = () => {
    if (!audioBase64) return;
    const link = document.createElement('a');
    link.href = `data:audio/wav;base64,${audioBase64}`;
    link.download = `${landmarkName.replace(/\s+/g, '_')}_AR_Tour_Clip.wav`;
    link.click();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-5 shadow-2xl shadow-cyan-950/30 text-slate-100 flex flex-col gap-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Headphones className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                AR Narrated Tour Clip
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                gemini-3.8-flash-tts
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Immersive spatial audio guide for {landmarkName}
            </p>
          </div>
        </div>

        {/* Ambient Sound Toggle & Voice Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAmbientAudioOn(!ambientAudioOn)}
            title="Toggle spatial ambient atmosphere"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              ambientAudioOn
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-400/50'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>{ambientAudioOn ? 'Atmosphere ON' : 'Atmosphere OFF'}</span>
          </button>

          {audioBase64 && (
            <button
              onClick={handleDownload}
              title="Download audio clip (.wav)"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Waveform Visualizer Canvas */}
      <div className="relative w-full h-14 bg-slate-950/80 rounded-xl overflow-hidden border border-cyan-500/20 flex items-center justify-center">
        <canvas ref={canvasRef} width={500} height={56} className="w-full h-full" />
        {isLoadingAudio && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center gap-2 text-cyan-300 text-xs font-mono">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>Synthesizing voice clip with gemini-3.8-flash-tts...</span>
          </div>
        )}
      </div>

      {/* Scrubber & Timestamps */}
      <div className="flex flex-col gap-1.5">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          disabled={!audioBase64 || isLoadingAudio}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-40"
        />
        <div className="flex justify-between text-[11px] font-mono text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Audio Playback Controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Play/Pause Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            disabled={!audioBase64 || isLoadingAudio}
            className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold flex items-center justify-center shadow-lg shadow-cyan-500/25 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
            disabled={!audioBase64 || isLoadingAudio}
            className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            title="Restart clip"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={cycleSpeed}
            disabled={!audioBase64 || isLoadingAudio}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 transition-colors border border-slate-700"
            title="Playback Speed"
          >
            {playbackSpeed}x
          </button>
        </div>

        {/* Voice Persona Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">Guide Voice:</span>
          <select
            value={voiceName}
            onChange={(e) => {
              onVoiceChange(e.target.value);
            }}
            disabled={isLoadingAudio}
            className="bg-slate-800/90 text-xs font-mono text-cyan-200 border border-cyan-500/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {VOICES.map((v) => (
              <option key={v.id} value={v.id} className="bg-slate-900 text-slate-200">
                {v.label} ({v.desc.split(',')[0]})
              </option>
            ))}
          </select>

          <button
            onClick={onRegenerateVoice}
            disabled={isLoadingAudio}
            title="Regenerate voice with current persona"
            className="px-3 py-1.5 rounded-lg bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 text-xs font-mono border border-cyan-500/40 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Voice Cast</span>
          </button>

          <button
            onClick={toggleMute}
            disabled={!audioBase64}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Subtitles / Script Card */}
      {scriptText && (
        <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono uppercase tracking-wider mb-1.5">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Spoken Narration Script</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed italic line-clamp-4 hover:line-clamp-none transition-all">
            "{scriptText}"
          </p>
        </div>
      )}
    </div>
  );
};
