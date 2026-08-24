import React, { useState } from "react";
import { Terminal, Play, HelpCircle, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

interface SqlSandboxProps {
  onRefreshData: () => void;
}

const PRESET_QUERIES = [
  {
    name: "Standard Table Scan",
    description: "Scan all films ordered by release chronological order",
    sql: "SELECT movie_id, title, genre, release_date, budget FROM default.movie_performance ORDER BY release_date DESC"
  },
  {
    name: "ROI Analysis by Genre",
    description: "Aggregate production costs and compute ROI by film category",
    sql: `SELECT 
  genre, 
  count(*) as total_films, 
  sum(budget) as total_budget,
  sum(box_office_domestic + box_office_international) as total_global_box_office,
  (sum(box_office_domestic + box_office_international) - sum(budget)) / sum(budget) as category_roi
FROM default.movie_performance 
GROUP BY genre 
ORDER BY category_roi DESC`
  },
  {
    name: "Audience Favourites with Views",
    description: "Locate movies with high sentiment (>= 80%) sorted by streaming views",
    sql: "SELECT title, genre, sentiment_score, streaming_views FROM default.movie_performance WHERE sentiment_score >= 0.8 ORDER BY streaming_views DESC"
  },
  {
    name: "Budget Efficiency Multipliers",
    description: "Compare total box office revenues to budget (earnings multiplier)",
    sql: "SELECT title, budget, (box_office_domestic + box_office_international) as box_office, (box_office_domestic + box_office_international) / budget as multiplier FROM default.movie_performance ORDER BY multiplier DESC"
  }
];

export default function SqlSandbox({ onRefreshData }: SqlSandboxProps) {
  const [query, setQuery] = useState(PRESET_QUERIES[0].sql);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<{
    rows: any[];
    source: string;
    executionTimeMs: number;
    columns: string[];
  } | null>(null);

  const handleRunQuery = async (sqlToRun = query) => {
    setExecuting(true);
    setError("");
    setResults(null);

    try {
      const res = await fetch("/api/clickhouse/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sqlToRun }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Extract columns dynamically from rows
        const rows = data.rows || [];
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        
        setResults({
          rows,
          source: data.source,
          executionTimeMs: data.executionTimeMs,
          columns
        });

        // Trigger parent data refresh in case they inserted or updated anything
        onRefreshData();
      } else {
        const errMsg = data.error || "Query failed to execute. Check your SQL syntax.";
        setError(errMsg);
        window.dispatchEvent(new CustomEvent("api-error", {
          detail: { endpoint: "/api/clickhouse/query", status: res.status, message: errMsg }
        }));
      }
    } catch (err: any) {
      const errMsg = `Network error: ${err.message || err}`;
      setError(errMsg);
      window.dispatchEvent(new CustomEvent("api-error", {
        detail: { endpoint: "/api/clickhouse/query", status: 503, message: errMsg }
      }));
    } finally {
      setExecuting(false);
    }
  };

  const handleLoadPreset = (sql: string) => {
    setQuery(sql);
    setError("");
    setResults(null);
  };

  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") {
      if (key.toLowerCase().includes("budget") || key.toLowerCase().includes("box_office") || key.toLowerCase().includes("revenue")) {
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
      }
      if (key.toLowerCase().includes("roi") || key.toLowerCase().includes("multiplier")) {
        return `${(value * 100).toFixed(1)}%`;
      }
      if (key.toLowerCase().includes("score") || key.toLowerCase().includes("sentiment")) {
        return `${(value * 100).toFixed(0)}%`;
      }
      if (key.toLowerCase().includes("views") || key.toLowerCase().includes("films") || key.toLowerCase().includes("count")) {
        return new Intl.NumberFormat("en-US").format(value);
      }
      return value.toString();
    }
    return value.toString();
  };

  return (
    <div id="sql-sandbox" className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-[#1A1A1A] p-6 rounded-2xl border border-white/5 shadow-2xl">
      
      {/* Code Console & Presets */}
      <div className="lg:col-span-1 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="h-5 w-5 text-[#C8FF00]" />
            <h3 className="font-bold text-white font-display uppercase tracking-wider">Analytical SQL Console</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-body">
            Write or run ClickHouse SQL statements directly against the movie performance database.
          </p>
        </div>

        {/* Quickstart Presets with Hover Micro-interactions */}
        <div className="space-y-2.5">
          <span className="text-[10px] font-extrabold text-[#C8FF00] uppercase tracking-widest block font-display">
            ClickHouse Quickstart Presets
          </span>
          <div className="grid grid-cols-1 gap-2.5">
            {PRESET_QUERIES.map((p, idx) => (
              <motion.button
                key={idx}
                id={`preset-query-btn-${idx}`}
                onClick={() => handleLoadPreset(p.sql)}
                whileHover={{ x: 2, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`text-left p-3 rounded-xl border text-xs transition-all flex flex-col justify-between cursor-pointer font-body ${
                  query === p.sql
                    ? "bg-[#C8FF00]/10 border-[#C8FF00]/30 text-[#C8FF00] shadow-xs font-bold"
                    : "bg-black/30 border-white/5 hover:bg-white/5 hover:border-white/10 text-slate-300"
                }`}
              >
                <span className="font-bold block text-white font-display">{p.name}</span>
                <span className="text-[10px] text-slate-400 mt-1 line-clamp-1 font-normal">{p.description}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Editor & Results Panel with Premium Shadows */}
      <div className="lg:col-span-2 space-y-4 flex flex-col h-full">
        <div className="relative shadow-xl rounded-2xl overflow-hidden border border-white/10">
          <textarea
            id="sql-query-textarea"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SELECT * FROM default.movie_performance..."
            rows={6}
            className="w-full bg-black/60 border-0 rounded-2xl p-4 text-xs font-mono text-[#C8FF00] focus:outline-none focus:ring-1 focus:ring-[#C8FF00] shadow-inner resize-none block leading-relaxed"
          />
          <motion.button
            id="run-sql-query-btn"
            onClick={() => handleRunQuery()}
            disabled={executing || !query.trim()}
            whileHover={executing || !query.trim() ? {} : { scale: 1.04 }}
            whileTap={executing || !query.trim() ? {} : { scale: 0.96 }}
            className="absolute right-4 bottom-4 flex items-center gap-1.5 py-2 px-5 bg-[#C8FF00] disabled:bg-[#1A1A1A] disabled:text-slate-600 disabled:border-white/5 disabled:cursor-not-allowed text-xs font-bold font-display uppercase tracking-wider rounded-full shadow-lg text-[#0A0A0A] transition-all cursor-pointer border border-[#C8FF00]"
          >
            {executing ? (
              <span className="h-3 w-3 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-[#0A0A0A]" />
            )}
            Run Query
          </motion.button>
        </div>

        {/* Display Status & Results */}
        <div id="query-results-area" className="flex-1 min-h-[180px] bg-black/40 border border-white/5 rounded-2xl overflow-hidden flex flex-col text-slate-300 shadow-2xl">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/5 text-xs font-display">
            <span className="font-bold tracking-wider text-[#C8FF00] uppercase">
              SQL Engine ResultSet
            </span>
            {results && (
              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                <span className="flex items-center gap-1 text-[#C8FF00] font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#C8FF00]" />
                  {results.source}
                </span>
                <span>•</span>
                <span>Returned {results.rows.length} rows</span>
                <span>•</span>
                <span>{results.executionTimeMs}ms</span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto max-h-[250px] p-2 text-xs font-body">
            {error && (
              <div className="p-4 flex items-start gap-2.5 text-rose-400 bg-rose-950/20 rounded-xl border border-rose-900/20">
                <AlertCircle className="h-4.5 w-4.5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-rose-300 font-display uppercase tracking-wider">SQL Compilation Error</div>
                  <pre className="font-mono text-[10px] whitespace-pre-wrap">{error}</pre>
                </div>
              </div>
            )}

            {!results && !error && !executing && (
              <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-slate-500 text-center p-4">
                <HelpCircle className="h-8 w-8 text-slate-600 mb-2 animate-pulse" />
                <p className="font-bold text-slate-300 text-xs font-display uppercase tracking-wider">Console is awaiting instructions</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-md">
                  Choose a ClickHouse Quickstart preset above or write your own custom SQL. Only SELECT operations are allowed.
                </p>
              </div>
            )}

            {executing && (
              <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-slate-400 text-center p-4">
                <div className="h-6 w-6 border-2 border-[#C8FF00] border-t-transparent rounded-full animate-spin mb-3" />
                <p className="font-bold text-white text-xs font-display uppercase tracking-wider">Querying ClickHouse DB Pipeline...</p>
                <span className="text-[10px] text-[#C8FF00] mt-1 animate-pulse">Calculating analytic cubes, ROI indexes, and performance metrics</span>
              </div>
            )}

            {results && results.rows.length === 0 && (
              <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-slate-400 text-center p-4">
                <Terminal className="h-6 w-6 text-[#C8FF00] mb-2 animate-pulse" />
                <p className="font-bold text-white font-display">Empty Result Set</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  The query ran successfully, but returned no matching rows. Try relaxing your filters.
                </p>
              </div>
            )}

            {results && results.rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-slate-300 font-mono text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider text-[9px] bg-white/5 font-bold">
                      {results.columns.map((col, i) => (
                        <th key={i} className="py-2.5 px-3 font-bold">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        {results.columns.map((col, cIdx) => (
                          <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-white font-medium">
                            {formatValue(col, row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
