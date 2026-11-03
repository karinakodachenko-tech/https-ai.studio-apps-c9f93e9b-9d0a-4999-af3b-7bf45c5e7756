import React, { useState } from 'react';
import { LandmarkHistoryData, GroundingSource } from '../types';
import {
  Search,
  ExternalLink,
  BookOpen,
  Calendar,
  ShieldCheck,
  Send,
  Sparkles,
  HelpCircle,
  Clock,
  Compass,
} from 'lucide-react';

interface SearchGroundedHistoryProps {
  historyData: LandmarkHistoryData | null;
  isLoading: boolean;
  landmarkName: string;
}

export const SearchGroundedHistory: React.FC<SearchGroundedHistoryProps> = ({
  historyData,
  isLoading,
  landmarkName,
}) => {
  const [activeTab, setActiveTab] = useState<'dossier' | 'qa'>('dossier');
  const [userQuestion, setUserQuestion] = useState('');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState<
    Array<{ question: string; answer: string; sources?: GroundingSource[] }>
  >([]);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim() || qaLoading) return;

    const question = userQuestion.trim();
    setUserQuestion('');
    setQaLoading(true);

    try {
      const response = await fetch('/api/landmark/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landmarkName,
          question,
          historyContext: historyData?.historyReport || '',
        }),
      });

      const resJson = await response.json();
      if (resJson.success) {
        setQaHistory((prev) => [
          ...prev,
          {
            question,
            answer: resJson.answer,
            sources: resJson.sources,
          },
        ]);
      } else {
        setQaHistory((prev) => [
          ...prev,
          {
            question,
            answer: `Could not retrieve answer: ${resJson.error || 'Unknown error'}`,
          },
        ]);
      }
    } catch (err: any) {
      setQaHistory((prev) => [
        ...prev,
        {
          question,
          answer: `Network error: ${err.message}`,
        },
      ]);
    } finally {
      setQaLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 text-slate-300">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin flex items-center justify-center">
          <Search className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h4 className="text-base font-bold text-white">Fetching Live History via Google Search</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Grounding historical dates, recent excavations, and architectural revelations using <span className="text-cyan-300 font-mono">gemini-3.8-flash</span>
          </p>
        </div>
      </div>
    );
  }

  if (!historyData) {
    return null;
  }

  return (
    <div className="bg-slate-900/85 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-2xl text-slate-200">
      {/* Header with Search Grounding Badge */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white tracking-wide">Historical Intelligence Dossier</h3>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Google Search Grounded</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified data pulled in real-time by <span className="font-mono text-cyan-300">gemini-3.8-flash</span>
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('dossier')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'dossier'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            History Dossier
          </button>
          <button
            onClick={() => setActiveTab('qa')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'qa'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Ask Guide</span>
            {qaHistory.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-cyan-900 text-cyan-200 text-[10px] flex items-center justify-center">
                {qaHistory.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-5">
        {activeTab === 'dossier' ? (
          <div className="flex flex-col gap-6">
            {/* Grounding Citations Pills */}
            {historyData.sources.length > 0 && (
              <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Grounding Sources & Citations ({historyData.sources.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {historyData.sources.map((src, idx) => (
                    <a
                      key={idx}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 border border-cyan-500/25 transition-all truncate max-w-xs group"
                    >
                      <span className="truncate">{src.title}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Markdown/Formatted Report */}
            <div className="prose prose-invert max-w-none text-sm text-slate-300 leading-relaxed space-y-4">
              {historyData.historyReport.split('\n\n').map((paragraph, pIdx) => {
                if (paragraph.startsWith('# ')) {
                  return (
                    <h2 key={pIdx} className="text-lg font-bold text-cyan-300 border-b border-slate-800 pb-1 mt-4">
                      {paragraph.replace('# ', '')}
                    </h2>
                  );
                }
                if (paragraph.startsWith('## ') || paragraph.startsWith('### ')) {
                  return (
                    <h3 key={pIdx} className="text-base font-semibold text-white mt-3">
                      {paragraph.replace(/^#{2,3}\s+/, '')}
                    </h3>
                  );
                }
                if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                  return (
                    <ul key={pIdx} className="list-disc pl-5 space-y-1">
                      {paragraph.split('\n').map((li, liIdx) => (
                        <li key={liIdx}>{li.replace(/^[-*]\s+/, '')}</li>
                      ))}
                    </ul>
                  );
                }
                return <p key={pIdx}>{paragraph}</p>;
              })}
            </div>
          </div>
        ) : (
          /* Q&A Tab */
          <div className="flex flex-col gap-4">
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Ask any question about {landmarkName}. Responses will be fetched live with Google Search grounding.
              </span>
            </div>

            {/* Q&A History */}
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {qaHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No questions asked yet. Try asking about hidden secrets, visiting tickets, or engineering challenges!
                </div>
              ) : (
                qaHistory.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-2 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
                    <div className="text-xs font-mono font-semibold text-cyan-400 flex items-center gap-1.5">
                      <span>Q: {item.question}</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">{item.answer}</p>
                    {item.sources && item.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-800/60 flex flex-wrap gap-1.5">
                        <span className="text-[10px] font-mono text-slate-500">Sources:</span>
                        {item.sources.map((s, sIdx) => (
                          <a
                            key={sIdx}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <span>{s.title}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Question Input Form */}
            <form onSubmit={handleAskQuestion} className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder={`Ask anything about ${landmarkName}... (e.g. "Can visitors enter the underground chambers?")`}
                disabled={qaLoading}
                className="flex-1 bg-slate-950 text-xs text-slate-200 px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500 placeholder-slate-500"
              />
              <button
                type="submit"
                disabled={qaLoading || !userQuestion.trim()}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40"
              >
                {qaLoading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="hidden sm:inline">Ask</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
