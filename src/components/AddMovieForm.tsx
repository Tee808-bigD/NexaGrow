import React, { useState } from "react";
import { PlusCircle, X, Film, Calendar, DollarSign, Eye, Flame, Loader2 } from "lucide-react";

interface AddMovieFormProps {
  isOpen: boolean;
  onClose: () => void;
  onMovieAdded: () => void;
}

export default function AddMovieForm({ isOpen, onClose, onMovieAdded }: AddMovieFormProps) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("Sci-Fi");
  const [customGenre, setCustomGenre] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [budget, setBudget] = useState("");
  const [boxOfficeDomestic, setBoxOfficeDomestic] = useState("");
  const [boxOfficeInternational, setBoxOfficeInternational] = useState("");
  const [streamingViews, setStreamingViews] = useState("");
  const [sentimentScore, setSentimentScore] = useState("0.80");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (!title.trim() || !releaseDate) {
      setError("Title and Release Date are required.");
      setSubmitting(false);
      return;
    }

    const finalGenre = genre === "Custom" ? (customGenre.trim() || "Independent") : genre;

    try {
      const payload = {
        title: title.trim(),
        genre: finalGenre,
        release_date: releaseDate,
        budget: Number(budget) || 0,
        box_office_domestic: Number(boxOfficeDomestic) || 0,
        box_office_international: Number(boxOfficeInternational) || 0,
        streaming_views: Number(streamingViews) || 0,
        sentiment_score: Number(sentimentScore) || 0.0,
      };

      const res = await fetch("/api/clickhouse/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Reset form
        setTitle("");
        setGenre("Sci-Fi");
        setCustomGenre("");
        setReleaseDate("");
        setBudget("");
        setBoxOfficeDomestic("");
        setBoxOfficeInternational("");
        setStreamingViews("");
        setSentimentScore("0.80");
        
        onMovieAdded();
        onClose();
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to save film performance record.");
      }
    } catch (err: any) {
      setError(`Network error: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div id="add-movie-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all">
      <div id="add-movie-modal" className="w-full max-w-xl bg-[#0A0A0A] border border-white/5 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-300 font-body">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4 bg-black/40 font-display">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-[#C8FF00]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Load New Production Record</h3>
          </div>
          <button id="close-add-movie-btn" onClick={onClose} className="p-1 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/20 text-rose-400 text-xs leading-relaxed font-body">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 font-display">
                Movie Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Midnight Quantum"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-black/40 border border-white/10 focus:bg-black/60 focus:border-[#C8FF00] focus:ring-1 focus:ring-[#C8FF00]/20 rounded-xl py-2.5 px-3 text-sm text-white transition-all outline-none placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 font-display">
                Film Genre
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-black/40 border border-white/10 focus:bg-black/60 focus:border-[#C8FF00] focus:ring-1 focus:ring-[#C8FF00]/20 rounded-xl py-2.5 px-3 text-sm text-white transition-all outline-none cursor-pointer"
              >
                <option value="Sci-Fi" className="bg-[#0A0A0A] text-white">Sci-Fi</option>
                <option value="Drama" className="bg-[#0A0A0A] text-white">Drama</option>
                <option value="Action" className="bg-[#0A0A0A] text-white">Action</option>
                <option value="Comedy" className="bg-[#0A0A0A] text-white">Comedy</option>
                <option value="Horror" className="bg-[#0A0A0A] text-white">Horror</option>
                <option value="Custom" className="bg-[#0A0A0A] text-white">Custom / Indep...</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 font-display">
                Release Date
              </label>
              <input
                type="date"
                required
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                className="w-full bg-black/40 border border-white/10 focus:bg-black/60 focus:border-[#C8FF00] focus:ring-1 focus:ring-[#C8FF00]/20 rounded-xl py-2.5 px-3 text-sm text-white transition-all outline-none"
              />
            </div>

            {genre === "Custom" && (
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 font-display">
                  Custom Genre Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Documentary, Thriller"
                  value={customGenre}
                  onChange={(e) => setCustomGenre(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:bg-black/60 focus:border-[#C8FF00] focus:ring-1 focus:ring-[#C8FF00]/20 rounded-xl py-2.5 px-3 text-sm text-white transition-all outline-none placeholder:text-slate-600"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 font-display">
                Production Budget (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-semibold">$</span>
                <input
                  type="number"
                  placeholder="e.g., 45000000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:bg-black/60 focus:border-[#C8FF00] focus:ring-1 focus:ring-[#C8FF00]/20 rounded-xl py-2.5 pl-7 pr-3 text-sm text-white transition-all outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 font-display">
                Streaming Views
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-semibold">#</span>
                <input
                  type="number"
                  placeholder="e.g., 12000000"
                  value={streamingViews}
                  onChange={(e) => setStreamingViews(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:bg-black/60 focus:border-[#C8FF00] focus:ring-1 focus:ring-[#C8FF00]/20 rounded-xl py-2.5 pl-7 pr-3 text-sm text-white transition-all outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 font-display">
                Domestic Box Office (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-semibold">$</span>
                <input
                  type="number"
                  placeholder="e.g., 65000000"
                  value={boxOfficeDomestic}
                  onChange={(e) => setBoxOfficeDomestic(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:bg-black/60 focus:border-[#C8FF00] focus:ring-1 focus:ring-[#C8FF00]/20 rounded-xl py-2.5 pl-7 pr-3 text-sm text-white transition-all outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 font-display">
                International Box Office (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-semibold">$</span>
                <input
                  type="number"
                  placeholder="e.g., 85000000"
                  value={boxOfficeInternational}
                  onChange={(e) => setBoxOfficeInternational(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:bg-black/60 focus:border-[#C8FF00] focus:ring-1 focus:ring-[#C8FF00]/20 rounded-xl py-2.5 pl-7 pr-3 text-sm text-white transition-all outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-1.5 font-display">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Audience Sentiment Score
                </label>
                <span className="text-xs font-bold text-[#C8FF00]">{(Number(sentimentScore) * 100).toFixed(0)}% Sentiment</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={sentimentScore}
                onChange={(e) => setSentimentScore(e.target.value)}
                className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[#C8FF00] focus:outline-none"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 font-semibold">
                <span>0% Critical Flop</span>
                <span>50% Mixed</span>
                <span>100% Acclaimed Masterpiece</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-5 mt-6 font-display">
            <button
              id="cancel-add-movie-btn"
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="py-2.5 px-5 bg-transparent hover:bg-white/5 border border-white/10 font-bold text-xs uppercase tracking-wider rounded-full active:scale-[0.98] transition-all text-slate-300 cursor-pointer shadow-md"
            >
              Cancel
            </button>
            <button
              id="submit-add-movie-btn"
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 py-2.5 px-6 bg-[#C8FF00] text-[#0A0A0A] disabled:bg-white/5 disabled:text-slate-500 disabled:cursor-not-allowed font-extrabold text-xs uppercase tracking-wider rounded-full shadow-lg active:scale-[0.98] transition-all cursor-pointer border border-[#C8FF00]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  Load to Engine
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
