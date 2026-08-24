import React, { useState, useEffect } from "react";
import { Movie, DbStatus } from "./types";
import ClickHouseConfig from "./components/ClickHouseConfig";
import AddMovieForm from "./components/AddMovieForm";
import SqlSandbox from "./components/SqlSandbox";
import AgentChat from "./components/AgentChat";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import TechOpsDashboard from "./components/TechOpsDashboard";
import { motion, AnimatePresence } from "motion/react";
import {
  Database, BrainCircuit, Table, Terminal, RefreshCw, Layers, Sparkles, Cpu,
  Settings, Wifi, WifiOff, HelpCircle, FileJson, PlaySquare, ShieldAlert, CheckSquare
} from "lucide-react";

export default function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [status, setStatus] = useState<DbStatus>({
    useRemote: false,
    hasCredentials: false,
    host: "Loading...",
    rowCount: 0,
    schema: "default.movie_performance"
  });
  const [activeTab, setActiveTab] = useState<"dashboard" | "sandbox" | "agent" | "techops">("dashboard");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isAddMovieOpen, setIsAddMovieOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiErrors, setApiErrors] = useState<Array<{
    id: string;
    endpoint: string;
    statusCode: number;
    message: string;
    timestamp: string;
    remediation: string;
  }>>([]);

  // Load status and movies on mount
  const refreshData = async () => {
    try {
      // Get DB mode and stats
      const statusRes = await fetch("/api/db/status");
      
      if (!statusRes.ok) {
        const errText = await statusRes.text();
        window.dispatchEvent(new CustomEvent("api-error", {
          detail: { endpoint: "/api/db/status", status: statusRes.status, message: errText || "Dynamic status check failed" }
        }));
      } else {
        const statusData = await statusRes.json();
        setStatus(statusData);
      }

      // Get current movie performance dataset
      const moviesRes = await fetch("/api/clickhouse/data");
      if (!moviesRes.ok) {
        const errText = await moviesRes.text();
        window.dispatchEvent(new CustomEvent("api-error", {
          detail: { endpoint: "/api/clickhouse/data", status: moviesRes.status, message: errText || "Data pipeline read query failed" }
        }));
      } else {
        const moviesData = await moviesRes.json();
        setMovies(moviesData.data || []);
      }
    } catch (err: any) {
      console.error("Error refreshing data pipeline:", err);
      window.dispatchEvent(new CustomEvent("api-error", {
        detail: { 
          endpoint: "/api/db/status", 
          status: 503, 
          message: `Network error: ${err.message || err}. The application server or the AI Agent might be temporarily offline.` 
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();

    // Centralized event listener to catch failures globally across chat, sandbox, and config
    const handleApiError = (e: Event) => {
      const { endpoint, status, message } = (e as CustomEvent).detail;
      
      let remediation = "Please verify your application server and database connectivity.";
      if (status === 503) {
        remediation = "API rate limits reached or AI provider experiencing extremely high transient loads. NexaGrow is automatically queueing requests and managing backend failover. Please wait 10 seconds before retrying.";
      } else if (status === 500) {
        remediation = "Internal Server Error. Please inspect your GEMINI_API_KEY inside the Settings -> Secrets panel and ensure ClickHouse schema configs are valid.";
      } else if (status === 400) {
        remediation = "Bad Request. The input payload was rejected. Semicolon-stacking and DML commands are blocked by standard sandbox safety policies.";
      } else if (status === 404) {
        remediation = "Endpoint Not Found. Check if the server routes in server.ts are successfully compiling and starting up.";
      }

      setApiErrors((prev) => [
        {
          id: `err-${Date.now()}-${Math.random()}`,
          endpoint,
          statusCode: status,
          message: typeof message === "object" ? JSON.stringify(message) : String(message),
          timestamp: new Date().toLocaleTimeString(),
          remediation,
        },
        ...prev
      ].slice(0, 30));
    };

    window.addEventListener("api-error", handleApiError);
    return () => {
      window.removeEventListener("api-error", handleApiError);
    };
  }, []);

  return (
    <div id="studio-intel-app" className="min-h-screen bg-[#0A0A0A] text-[#F5F4F0] selection:bg-[#C8FF00]/20 selection:text-[#C8FF00] pb-16 font-body relative overflow-hidden">
      
      {/* Decorative High-Contrast Neon Accents */}
      <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] bg-radial-at-t from-[#C8FF00]/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-radial-at-b from-[#C8FF00]/5 via-transparent to-transparent pointer-events-none" />

      {/* Premium NexaGrow Navigation */}
      <nav className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand Title with Syne Font styling */}
          <motion.div 
            className="flex items-center gap-3 cursor-pointer"
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <img src="/src/assets/images/nexagrow_logo_1787579598825.jpg" alt="NexaGrow Logo" className="h-7 w-7 rounded-lg object-cover border border-[#C8FF00]/30" referrerPolicy="no-referrer" />
            <div className="text-xl font-extrabold tracking-tight font-display text-white">
              Nexa<span className="text-[#C8FF00]">Grow</span>
            </div>
            <span className="text-[9px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#C8FF00]/10 text-[#C8FF00] border border-[#C8FF00]/30 uppercase tracking-widest font-display">
              Analytics Hub
            </span>
          </motion.div>

          {/* Engine Mode indicators & settings */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-center md:justify-end">
            
            {/* Active Pipeline Badges */}
            <div className="flex items-center gap-2">
              {status.useRemote ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#C8FF00]/10 text-[#C8FF00] border border-[#C8FF00]/30 shadow-2xs"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C8FF00] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C8FF00]"></span>
                  </span>
                  <span className="font-display uppercase tracking-wider text-[10px]">Cloud Active</span>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#3A3A3A] text-slate-300 border border-white/10 shadow-2xs"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                  </span>
                  <span className="font-display uppercase tracking-wider text-[10px]">Local Simulator</span>
                </motion.div>
              )}
            </div>

            {/* Refresh Indicator Button */}
            <motion.button
              id="refresh-pipeline-btn"
              onClick={refreshData}
              title="Sync Database & Fetch Visual Data"
              whileHover={{ scale: 1.05, rotate: 180 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="p-2.5 bg-[#1A1A1A] hover:bg-[#222] text-[#F5F4F0] border border-white/15 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
            </motion.button>

            {/* Settings trigger */}
            <motion.button
              id="open-settings-btn"
              onClick={() => setIsConfigOpen(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 py-2 px-4 bg-[#C8FF00] text-[#0A0A0A] font-extrabold text-xs rounded-full transition-all cursor-pointer border border-[#C8FF00] font-display uppercase tracking-wider"
            >
              <Settings className="h-3.5 w-3.5 text-[#0A0A0A]" />
              Cloud Config
            </motion.button>
          </div>

        </div>
      </nav>

      {/* Agency Marketing Hero Wrapper */}
      <section className="relative overflow-hidden pt-12 pb-8 px-6 max-w-7xl mx-auto text-left">
        <span className="text-[10px] font-bold text-[#C8FF00] uppercase tracking-widest flex items-center gap-2 mb-4 font-display">
          <span className="h-px w-8 bg-[#C8FF00]" />
          Realtime Data Intelligence Pipeline
        </span>
        <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight leading-none text-white max-w-4xl">
          We build engines that <em className="text-[#C8FF00] not-italic">convert</em> & scale.
        </h1>
        <p className="text-sm md:text-base text-slate-400 mt-4 max-w-2xl leading-relaxed">
          Unlock high-performance media analytical insights via ClickHouse OLAP and Gemini intelligence models. Engineered to perform, rank, and grow.
        </p>
      </section>

      {/* NexaGrow Neon Marquee Line */}
      <div className="bg-[#C8FF00] py-3 overflow-hidden select-none my-6">
        <div className="flex gap-12 whitespace-nowrap animate-marquee">
          <div className="flex gap-12 text-[#0A0A0A] font-display font-black text-xs uppercase tracking-widest">
            <span>ClickHouse OLAP</span><span>✦</span>
            <span>Gemini AI Pipeline</span><span>✦</span>
            <span>Real-time OLAP</span><span>✦</span>
            <span>Next.js Headless</span><span>✦</span>
            <span>Tailwind Premium CSS</span><span>✦</span>
            <span>Gutenberg ACF</span><span>✦</span>
            <span>Technical SEO</span><span>✦</span>
            <span>Core Web Vitals</span><span>✦</span>
          </div>
          <div className="flex gap-12 text-[#0A0A0A] font-display font-black text-xs uppercase tracking-widest" aria-hidden="true">
            <span>ClickHouse OLAP</span><span>✦</span>
            <span>Gemini AI Pipeline</span><span>✦</span>
            <span>Real-time OLAP</span><span>✦</span>
            <span>Next.js Headless</span><span>✦</span>
            <span>Tailwind Premium CSS</span><span>✦</span>
            <span>Gutenberg ACF</span><span>✦</span>
            <span>Technical SEO</span><span>✦</span>
            <span>Core Web Vitals</span><span>✦</span>
          </div>
        </div>
      </div>

      {/* Primary Workspace Stage */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        
        {/* Connection Simulator Warning Banner */}
        {!status.useRemote && (
          <div id="local-mode-banner" className="bg-[#1A1A1A] border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-amber-400 text-xs font-display">OPERATING IN LOCAL CLICKHOUSE SIMULATOR MODE</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Queries and charts are running on a high-fidelity in-memory SQL compilation database loaded with the Hackathon default M&E dataset.
                </p>
              </div>
            </div>
            <button
              id="banner-settings-btn"
              onClick={() => setIsConfigOpen(true)}
              className="py-2 px-4 bg-[#C8FF00] hover:opacity-90 text-[#0A0A0A] rounded-full text-[10px] font-bold font-display uppercase tracking-wider active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer"
            >
              Connect Cloud Cluster
            </button>
          </div>
        )}

        {status.useRemote && (
          <div id="cloud-mode-banner" className="bg-[#1A1A1A] border border-[#C8FF00]/30 p-4 rounded-2xl flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#C8FF00]/10 text-[#C8FF00] border border-[#C8FF00]/20 flex-shrink-0">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs font-display">VERIFIED CLICKHOUSE CONNECTION ACTIVE</h4>
                <p className="text-[10px] text-slate-400">
                  Secure HTTPS tunnel established. Executing low-latency analytics against live schema <strong className="text-[#C8FF00]">{status.schema}</strong>.
                </p>
              </div>
            </div>
            <span className="text-[9px] font-bold text-[#C8FF00] uppercase tracking-widest font-display bg-[#C8FF00]/10 px-3 py-1 rounded-full border border-[#C8FF00]/20">
              Secure TLS Tunnel
            </span>
          </div>
        )}

        {/* Tab Selection Area with NexaGrow Dark Theme styling */}
        <div className="relative flex flex-wrap md:flex-nowrap border border-white/5 bg-[#1A1A1A] p-1 rounded-2xl shadow-xl overflow-hidden">
          <button
            id="tab-btn-dashboard"
            onClick={() => setActiveTab("dashboard")}
            className={`relative flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors whitespace-nowrap cursor-pointer z-10 font-display ${
              activeTab === "dashboard"
                ? "text-[#0A0A0A] font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {activeTab === "dashboard" && (
              <motion.div
                layoutId="active-tab-glow"
                className="absolute inset-0 bg-[#C8FF00] rounded-xl -z-10 shadow-md shadow-[#C8FF00]/10"
                transition={{ type: "spring", stiffness: 350, damping: 26 }}
              />
            )}
            <Table className="h-4 w-4" />
            Analytics & Dataframe
          </button>
          
          <button
            id="tab-btn-sandbox"
            onClick={() => setActiveTab("sandbox")}
            className={`relative flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors whitespace-nowrap cursor-pointer z-10 font-display ${
              activeTab === "sandbox"
                ? "text-[#0A0A0A] font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {activeTab === "sandbox" && (
              <motion.div
                layoutId="active-tab-glow"
                className="absolute inset-0 bg-[#C8FF00] rounded-xl -z-10 shadow-md shadow-[#C8FF00]/10"
                transition={{ type: "spring", stiffness: 350, damping: 26 }}
              />
            )}
            <Terminal className="h-4 w-4" />
            SQL Playroom Sandbox
          </button>
          
          <button
            id="tab-btn-agent"
            onClick={() => setActiveTab("agent")}
            className={`relative flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors whitespace-nowrap cursor-pointer z-10 font-display ${
              activeTab === "agent"
                ? "text-[#0A0A0A] font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {activeTab === "agent" && (
              <motion.div
                layoutId="active-tab-glow"
                className="absolute inset-0 bg-[#C8FF00] rounded-xl -z-10 shadow-md shadow-[#C8FF00]/10"
                transition={{ type: "spring", stiffness: 350, damping: 26 }}
              />
            )}
            <Cpu className="h-4 w-4" />
            AI Assistant
          </button>
 
          <button
            id="tab-btn-techops"
            onClick={() => setActiveTab("techops")}
            className={`relative flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors whitespace-nowrap cursor-pointer z-10 font-display ${
              activeTab === "techops"
                ? "text-[#0A0A0A] font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {activeTab === "techops" && (
              <motion.div
                layoutId="active-tab-glow"
                className="absolute inset-0 bg-[#C8FF00] rounded-xl -z-10 shadow-md shadow-[#C8FF00]/10"
                transition={{ type: "spring", stiffness: 350, damping: 26 }}
              />
            )}
            <CheckSquare className="h-4 w-4" />
            TechOps & Client Delivery
          </button>
        </div>

        {/* View Switch Loading Trigger with Animation */}
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <div className="h-8 w-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Compiling analytical dashboard modules...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="transition-all"
            >
            {activeTab === "dashboard" && (
              <AnalyticsDashboard
                movies={movies}
                status={status}
                onRefreshData={refreshData}
                onAddMovieOpen={() => setIsAddMovieOpen(true)}
              />
            )}

            {activeTab === "sandbox" && (
              <SqlSandbox onRefreshData={refreshData} />
            )}

            {activeTab === "agent" && (
              <AgentChat onRefreshData={refreshData} />
            )}

            {activeTab === "techops" && (
              <TechOpsDashboard apiErrors={apiErrors} onClearErrors={() => setApiErrors([])} />
            )}
            </motion.div>
          </AnimatePresence>
        )}

      </main>

      {/* Modals & Slide-overs */}
      <ClickHouseConfig
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        status={status}
        onStatusChange={(newStatus) => {
          setStatus(newStatus);
          refreshData();
        }}
      />

      <AddMovieForm
        isOpen={isAddMovieOpen}
        onClose={() => setIsAddMovieOpen(false)}
        onMovieAdded={refreshData}
      />

    </div>
  );
}
