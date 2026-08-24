import React, { useState } from "react";
import { Movie, DbStatus } from "../types";
import { motion } from "motion/react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { DollarSign, Percent, TrendingUp, Users, Calendar, Trash2, RotateCcw, Plus, SlidersHorizontal, Info } from "lucide-react";

interface AnalyticsDashboardProps {
  movies: Movie[];
  status: DbStatus;
  onRefreshData: () => void;
  onAddMovieOpen: () => void;
}

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#3b82f6"];

export default function AnalyticsDashboard({ movies, status, onRefreshData, onAddMovieOpen }: AnalyticsDashboardProps) {
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  const [sortBy, setSortBy] = useState<keyof Movie>("release_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Calculate high-level studio KPI stats
  const totalFilms = movies.length;
  
  const totalBudget = movies.reduce((acc, m) => acc + m.budget, 0);
  const totalBoxOffice = movies.reduce((acc, m) => acc + m.box_office_domestic + m.box_office_international, 0);
  const totalViews = movies.reduce((acc, m) => acc + m.streaming_views, 0);
  
  const overallRoi = totalBudget > 0 ? (totalBoxOffice - totalBudget) / totalBudget : 0;
  const avgSentiment = totalFilms > 0 ? movies.reduce((acc, m) => acc + m.sentiment_score, 0) / totalFilms : 0;

  // Format Helper for large values
  const formatCompactVal = (value: number, prefix = "$") => {
    if (value >= 1.0e9) {
      return `${prefix}${(value / 1.0e9).toFixed(1)}B`;
    }
    if (value >= 1.0e6) {
      return `${prefix}${(value / 1.0e6).toFixed(1)}M`;
    }
    if (value >= 1.0e3) {
      return `${prefix}${(value / 1.0e3).toFixed(1)}K`;
    }
    return `${prefix}${value.toFixed(0)}`;
  };

  // Prepare chart data 1: Commercial returns
  const revenueVsBudgetData = movies.map((m) => {
    const globalBoxOffice = m.box_office_domestic + m.box_office_international;
    return {
      name: m.title,
      "Production Budget": m.budget,
      "Global Box Office": globalBoxOffice,
      ROI: m.budget > 0 ? ((globalBoxOffice - m.budget) / m.budget) * 100 : 0
    };
  });

  // Prepare chart data 2: ROI vs Sentiment Correlation (Dual Line)
  const correlationData = movies.map((m) => {
    const globalBoxOffice = m.box_office_domestic + m.box_office_international;
    const roiVal = m.budget > 0 ? ((globalBoxOffice - m.budget) / m.budget) * 100 : 0;
    return {
      name: m.title,
      ROI: parseFloat(roiVal.toFixed(1)),
      "Audience Sentiment": parseFloat((m.sentiment_score * 100).toFixed(0))
    };
  }).sort((a, b) => b["Audience Sentiment"] - a["Audience Sentiment"]); // Sorted by sentiment to see trend!

  // Prepare chart data 3: Streaming views per genre
  const genreViewsMap: Record<string, number> = {};
  movies.forEach((m) => {
    genreViewsMap[m.genre] = (genreViewsMap[m.genre] || 0) + m.streaming_views;
  });
  const genrePieData = Object.entries(genreViewsMap).map(([name, value]) => ({
    name,
    value
  }));

  // Filter and Sort Table Rows
  const uniqueGenres = ["All", ...Array.from(new Set(movies.map((m) => m.genre)))];
  
  const filteredMovies = selectedGenre === "All" 
    ? movies 
    : movies.filter((m) => m.genre === selectedGenre);

  const sortedMovies = [...filteredMovies].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (typeof aVal === "string") {
      return sortOrder === "asc"
        ? (aVal as string).localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal as string);
    } else {
      return sortOrder === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    }
  });

  const toggleSort = (field: keyof Movie) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleResetData = async () => {
    if (confirm("Are you sure you want to restore the default database template? This overrides custom insertions.")) {
      try {
        const res = await fetch("/api/clickhouse/reset", { method: "POST" });
        if (res.ok) {
          onRefreshData();
        }
      } catch (err) {
        console.error("Error resetting database:", err);
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* KPI Stats Panel with Entrance & Hover Animations */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Films */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -3, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="bg-[#1A1A1A] border border-white/5 p-5 rounded-2xl flex flex-col justify-between shadow-lg hover:border-[#C8FF00]/40 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C8FF00]">Total Films</span>
            <Calendar className="h-4 w-4 text-[#C8FF00]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tracking-tight text-white">{totalFilms}</div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Active database records</p>
          </div>
        </motion.div>

        {/* Combined Box Office */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -3, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 350, damping: 25, delay: 0.05 }}
          className="bg-[#1A1A1A] border border-white/5 p-5 rounded-2xl flex flex-col justify-between shadow-lg hover:border-[#C8FF00]/40 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C8FF00]">Gross Box Office</span>
            <DollarSign className="h-4 w-4 text-[#C8FF00]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tracking-tight text-white">
              {formatCompactVal(totalBoxOffice)}
            </div>
            <p className="text-[10px] text-[#C8FF00] font-bold mt-1">
              Combined global
            </p>
          </div>
        </motion.div>

        {/* Combined Budget */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -3, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 350, damping: 25, delay: 0.1 }}
          className="bg-[#1A1A1A] border border-white/5 p-5 rounded-2xl flex flex-col justify-between shadow-lg hover:border-[#C8FF00]/40 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Production Budget</span>
            <DollarSign className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tracking-tight text-white">
              {formatCompactVal(totalBudget)}
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Cumulative capital</p>
          </div>
        </motion.div>

        {/* Overall ROI */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -3, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 350, damping: 25, delay: 0.15 }}
          className="bg-[#1A1A1A] border border-white/5 p-5 rounded-2xl flex flex-col justify-between shadow-lg hover:border-[#C8FF00]/40 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C8FF00]">Studio Net ROI</span>
            <Percent className="h-4 w-4 text-[#C8FF00]" />
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black tracking-tight ${overallRoi >= 0 ? "text-[#C8FF00]" : "text-rose-500"}`}>
              {(overallRoi * 100).toFixed(1)}%
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Average yield</p>
          </div>
        </motion.div>

        {/* Audience Rating */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -3, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 350, damping: 25, delay: 0.2 }}
          className="col-span-2 md:col-span-1 bg-[#1A1A1A] border border-white/5 p-5 rounded-2xl flex flex-col justify-between shadow-lg hover:border-[#C8FF00]/40 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C8FF00]">Avg Sentiment</span>
            <TrendingUp className="h-4 w-4 text-[#C8FF00]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tracking-tight text-white">
              {(avgSentiment * 100).toFixed(0)}%
            </div>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
              <Users className="h-3 w-3 text-[#C8FF00]" />
              <span className="font-semibold">{formatCompactVal(totalViews, "")} Views</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recharts Graphical Visualizer Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Chart 1: Revenue vs. Budget (Bar) */}
        <div className="xl:col-span-2 bg-[#1A1A1A] border border-white/5 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <div>
              <h4 className="font-bold text-white text-sm font-display uppercase tracking-wider">Commercial Returns Performance</h4>
              <p className="text-[10px] text-slate-400">Comparing production budget investments to global box office yields</p>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueVsBudgetData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="#888"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(val) => formatCompactVal(val, "$")}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#111111", borderColor: "#333333", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)" }}
                  labelStyle={{ fontWeight: "bold", fontSize: 11, color: "#ffffff" }}
                  itemStyle={{ fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar dataKey="Production Budget" fill="#444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Global Box Office" fill="#C8FF00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Streaming views by category (Donut Pie) */}
        <div className="xl:col-span-1 bg-[#1A1A1A] border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="border-b border-white/5 pb-3">
            <h4 className="font-bold text-white text-sm font-display uppercase tracking-wider">Genre Streaming</h4>
            <p className="text-[10px] text-slate-400">Digital platform views apportioned by movie genre</p>
          </div>
          <div className="h-[200px] w-full flex items-center justify-center relative my-2">
            {genrePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#111111", borderColor: "#333333", borderRadius: "12px" }}
                    itemStyle={{ fontSize: 11, color: "#ffffff" }}
                  />
                  <Pie
                    data={genrePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {genrePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-slate-400">No Viewers Data</span>
            )}
            {genrePieData.length > 0 && (
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-lg font-extrabold tracking-tight text-white">{formatCompactVal(totalViews, "")}</span>
                <span className="text-[8px] text-[#C8FF00] uppercase font-bold tracking-widest font-display">Total Views</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center text-[10px] text-slate-400 font-medium border-t border-white/5 pt-2">
            {genrePieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Dual Axis Line ROI vs Sentiment (Area/Line) */}
        <div className="xl:col-span-3 bg-[#1A1A1A] border border-white/5 rounded-2xl p-5 shadow-lg">
          <div className="border-b border-white/5 pb-3">
            <h4 className="font-bold text-white text-sm font-display uppercase tracking-wider">ROI vs. Audience Sentiment Index</h4>
            <p className="text-[10px] text-slate-400">Does audience critical acclaim correlate with production financial success? (Sorted by Sentiment Score descending)</p>
          </div>
          <div className="h-[220px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={correlationData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8FF00" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#C8FF00" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="sentimentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" stroke="#888" fontSize={9} tickLine={false} />
                <YAxis stroke="#888" fontSize={9} tickLine={false} tickFormatter={(val) => `${val}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#111111", borderColor: "#333333", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)" }}
                  labelStyle={{ fontWeight: "bold", fontSize: 11, color: "#ffffff" }}
                  itemStyle={{ fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Area type="monotone" dataKey="ROI" stroke="#C8FF00" fillOpacity={1} fill="url(#roiGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="Audience Sentiment" stroke="#38bdf8" fillOpacity={1} fill="url(#sentimentGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Interactive Data Grid Explorer */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl overflow-hidden shadow-lg">
        
        {/* Table Title and Filters */}
        <div className="p-4 bg-[#222]/30 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-white text-sm font-display uppercase tracking-wider">Interactive Film Production Dataframe</h4>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#C8FF00]/10 text-[#C8FF00] border border-[#C8FF00]/20">
                {sortedMovies.length} of {totalFilms} records shown
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Query, sort, filter, or load movie metrics directly in the engine</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-2 bg-[#1A1A1A] border border-white/10 px-3 py-1.5 rounded-xl text-xs">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-400 font-bold font-display uppercase tracking-wider text-[10px]">Genre:</span>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="bg-transparent border-0 text-[#C8FF00] font-bold focus:outline-none focus:ring-0 cursor-pointer pr-1"
              >
                {uniqueGenres.map((genre) => (
                  <option key={genre} value={genre} className="bg-[#1A1A1A] text-white">
                    {genre}
                  </option>
                ))}
              </select>
            </div>

            <motion.button
              id="open-add-movie-modal-btn"
              onClick={onAddMovieOpen}
              whileHover={{ scale: 1.03, y: -0.5 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 py-2 px-4 bg-[#C8FF00] text-[#0A0A0A] text-xs font-bold rounded-full shadow-md active:scale-95 transition-all cursor-pointer border border-[#C8FF00] font-display uppercase tracking-wider"
            >
              <Plus className="h-4 w-4" />
              Add Film Record
            </motion.button>

            <motion.button
              id="reset-db-btn"
              onClick={handleResetData}
              title="Reset Local Database to Original Mock Records"
              whileHover={{ scale: 1.05, rotate: -180 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="p-2 bg-[#1A1A1A] hover:bg-[#222] text-[#F5F4F0] border border-white/15 rounded-xl transition-all cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </motion.button>
          </div>
        </div>

        {/* Real Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-slate-300 text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-[#1A1A1A] text-slate-400 font-bold text-[10px] uppercase tracking-wider font-display">
                <th className="py-3.5 px-4 select-none cursor-pointer hover:bg-white/5" onClick={() => toggleSort("title")}>
                  Title {sortBy === "title" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-3.5 px-4 select-none cursor-pointer hover:bg-white/5" onClick={() => toggleSort("genre")}>
                  Genre {sortBy === "genre" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-3.5 px-4 select-none cursor-pointer hover:bg-white/5" onClick={() => toggleSort("release_date")}>
                  Release {sortBy === "release_date" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-3.5 px-4 text-right select-none cursor-pointer hover:bg-white/5" onClick={() => toggleSort("budget")}>
                  Budget {sortBy === "budget" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-3.5 px-4 text-right select-none cursor-pointer hover:bg-white/5" onClick={() => toggleSort("box_office_domestic")}>
                  Global Gross {sortBy === "box_office_domestic" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-3.5 px-4 text-right select-none cursor-pointer hover:bg-white/5" onClick={() => toggleSort("streaming_views")}>
                  Streaming {sortBy === "streaming_views" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-3.5 px-4 text-right select-none cursor-pointer hover:bg-white/5" onClick={() => toggleSort("sentiment_score")}>
                  Sentiment {sortBy === "sentiment_score" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-3.5 px-4 text-right">ROI Indicator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-[#1A1A1A]/40">
              {sortedMovies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500 font-medium">
                    No film performance records match current filter
                  </td>
                </tr>
              ) : (
                sortedMovies.map((m) => {
                  const globalBoxOffice = m.box_office_domestic + m.box_office_international;
                  const roi = m.budget > 0 ? (globalBoxOffice - m.budget) / m.budget : 0;
                  return (
                    <tr key={m.movie_id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{m.title}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-white/5 border border-white/10 font-semibold text-[#C8FF00]">
                          {m.genre}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{m.release_date}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300">{formatCompactVal(m.budget)}</td>
                      <td className="py-3 px-4 text-right font-mono text-white font-medium">
                        {formatCompactVal(globalBoxOffice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300">{formatCompactVal(m.streaming_views, "")}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end w-full">
                          <span className="font-bold text-white">{(m.sentiment_score * 100).toFixed(0)}%</span>
                          <span className={`h-1.5 w-1.5 rounded-full ${m.sentiment_score >= 0.8 ? "bg-[#C8FF00]" : m.sentiment_score >= 0.7 ? "bg-amber-500" : "bg-rose-500"}`} />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-block font-mono font-bold text-[10px] px-2 py-0.5 rounded border ${
                          roi >= 1.0 
                            ? "text-[#C8FF00] bg-[#C8FF00]/10 border-[#C8FF00]/20" 
                            : roi >= 0 
                              ? "text-sky-400 bg-sky-500/10 border-sky-500/20" 
                              : "text-rose-500 bg-rose-500/10 border-rose-500/20"
                        }`}>
                          {roi >= 0 ? "+" : ""}{(roi * 100).toFixed(0)}% ROI
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Info Legend Footnote */}
        <div className="p-3 bg-[#222]/10 text-[10px] text-slate-400 flex items-center gap-1.5 border-t border-white/5">
          <Info className="h-3.5 w-3.5 text-slate-500" />
          <span>Calculated Return On Investment formula strictly enforced: <strong>ROI = (Box Office Domestic + Box Office International - Budget) / Budget</strong>. Hover on box office grosses to view domestic/international allocations.</span>
        </div>
      </div>
    </div>
  );
}
