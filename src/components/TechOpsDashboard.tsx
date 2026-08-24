import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Globe, ShieldCheck, CheckSquare, Zap, Copy, ExternalLink, Server, 
  Code, Gauge, Clock, ArrowRight, AlertCircle, CheckCircle2, RefreshCw, Layers, Plus, Trash2,
  ShieldAlert, Activity, Wifi
} from "lucide-react";

// Predefined ACF & Gutenberg Reusable Blocks for Senior Web Developers
const REUSABLE_BLOCKS = [
  {
    id: "acf-testimonial-block",
    name: "Astra-Premium Testimonial Carousel",
    type: "Gutenberg + ACF Pro",
    description: "Fully customizable custom-post-type carousel with visual slider controls and responsive viewport triggers.",
    code: `<?php
/**
 * Block Name: Astra-Premium Testimonial Carousel
 * Category: formatting
 * Icon: format-quote
 */
$testimonials = get_field('client_testimonials');
if ($testimonials): ?>
<div className="acf-testimonial-carousel" data-autoplay="true">
  <?php foreach ($testimonials as $t): ?>
    <blockquote className="testimonial-item">
      <p class="quote-text"><?php echo esc_html($t['quote']); ?></p>
      <cite class="author"><?php echo esc_html($t['author']); ?></cite>
    </blockquote>
  <?php endforeach; ?>
</div>
<?php endif; ?>`
  },
  {
    id: "nextjs-dynamic-hero",
    name: "Headless Next.js Ripple Hero Container",
    type: "React / Tailwind",
    description: "A gorgeous, high-contrast display header with warm/cool neutral highlights and spring transitions.",
    code: `import { motion } from "motion/react";
export default function RippleHero() {
  return (
    <div className="relative overflow-hidden bg-slate-950 py-24 text-white text-center">
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-5xl font-extrabold tracking-tight"
      >
        Experience the future of finance
      </motion.h1>
      <p className="mt-4 text-slate-400">Save time, cut costs, empower your teams.</p>
    </div>
  );
}`
  },
  {
    id: "gutenberg-flex-grid",
    name: "Semantic Core Web Vitals Row",
    type: "HTML / Tailwind / SEO",
    description: "Semantic Grid element fully optimized for core web vitals and accessible screen readers.",
    code: `<section id="ripple-trust-bar" class="bg-slate-900 py-12" aria-label="Trusted Partners">
  <div class="max-w-7xl mx-auto px-6">
    <p class="text-xs font-bold text-slate-400 text-center uppercase tracking-widest mb-6">Trusted by 200+ businesses</p>
    <div class="grid grid-cols-2 md:grid-cols-6 gap-8 items-center justify-items-center opacity-70">
      <img src="/logos/swiss.svg" alt="Swiss Brand Partners" class="h-6" loading="lazy" />
    </div>
  </div>
</section>`
  }
];

interface TechOpsDashboardProps {
  apiErrors?: Array<{
    id: string;
    endpoint: string;
    statusCode: number;
    message: string;
    timestamp: string;
    remediation: string;
  }>;
  onClearErrors?: () => void;
}

export default function TechOpsDashboard({ apiErrors = [], onClearErrors }: TechOpsDashboardProps) {
  // States for DNS Records Simulator
  const [dnsRecords, setDnsRecords] = useState([
    { type: "A", name: "@", value: "76.76.21.21 (Vercel Core)", ttl: "3600", status: "propagated" },
    { type: "CNAME", name: "www", value: "cname.vercel-dns.com", ttl: "3600", status: "propagated" },
    { type: "TXT", name: "google-site-verification", value: "goog-942979450406-v1", ttl: "14400", status: "propagated" },
    { type: "CNAME", name: "staging", value: "staging-cluster.europe-west2.run.app", ttl: "600", status: "pending" }
  ]);
  const [newDnsType, setNewDnsType] = useState("A");
  const [newDnsName, setNewDnsName] = useState("");
  const [newDnsValue, setNewDnsValue] = useState("");
  
  // States for QA Checklist
  const [qaTasks, setQaTasks] = useState([
    { id: 1, text: "Verify Figma pixel-perfection across viewports (Mobile, Tablet, Desktop)", checked: true, category: "Design" },
    { id: 2, text: "Run local Lighthouse audit and ensure Core Web Vitals are >90", checked: true, category: "Performance" },
    { id: 3, text: "Check alt attributes, ARIA landmarks, and keyboard accessibility (WCAG AA)", checked: false, category: "Accessibility" },
    { id: 4, text: "Audit technical SEO: sitemap xml, robots.txt, schema structure, meta descriptions", checked: false, category: "SEO" },
    { id: 5, text: "Test SSL handshake protocols & clean staging log outputs", checked: false, category: "Infrastructure" }
  ]);

  // States for Site Audit Tool Simulator
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditScores, setAuditScores] = useState({
    performance: 92,
    accessibility: 88,
    seo: 95,
    figmaMatch: 98
  });

  // State for showing block code details
  const [activeCodeBlockId, setActiveCodeBlockId] = useState<string | null>(null);
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);

  // DNS records action
  const handleAddDns = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDnsValue.trim()) return;
    setDnsRecords([
      ...dnsRecords,
      {
        type: newDnsType,
        name: newDnsName || "@",
        value: newDnsValue,
        ttl: "3600",
        status: "pending"
      }
    ]);
    setNewDnsName("");
    setNewDnsValue("");
  };

  const handleDeleteDns = (index: number) => {
    setDnsRecords(dnsRecords.filter((_, idx) => idx !== index));
  };

  const handleToggleTask = (id: number) => {
    setQaTasks(qaTasks.map(t => t.id === id ? { ...t, checked: !t.checked } : t));
  };

  const handleRunAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setAuditScores({
        performance: Math.floor(Math.random() * 8) + 93, // 93-100
        accessibility: Math.floor(Math.random() * 10) + 90, // 90-100
        seo: Math.floor(Math.random() * 5) + 95, // 95-100
        figmaMatch: Math.floor(Math.random() * 5) + 96 // 96-100
      });
      setIsAuditing(false);
    }, 1500);
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedBlockId(id);
    setTimeout(() => setCopiedBlockId(null), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Section Introduction Card following Ripple premium styling */}
      <div className="relative overflow-hidden bg-[#1A1A1A] text-white rounded-3xl p-8 shadow-xl border border-white/5">
        <div className="absolute inset-0 bg-radial-at-t from-[#C8FF00]/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C8FF00] bg-[#C8FF00]/10 border border-[#C8FF00]/30 px-3 py-1 rounded-full font-display">
            Technical Operations Command
          </span>
          <h2 className="text-3xl font-black tracking-tight mt-4 text-white font-display">
            Delivery & Launch Control Panel
          </h2>
          <p className="text-sm text-slate-400 mt-2.5 leading-relaxed font-body">
            Monitor live DNS propagation cycles, verify Figma-to-code fidelity reviews, execute automated Core Web Vitals audits, and manage your reusable Gutenberg custom components.
          </p>
        </div>
      </div>

      {/* NEW: API System Diagnostics & Telemetry Dashboard Section */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-radial-at-tr from-[#C8FF00]/5 to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-5 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#C8FF00]/10 border border-[#C8FF00]/20 text-[#C8FF00]">
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white font-display uppercase tracking-wider">API Diagnostics & Telemetry Console</h3>
              <p className="text-xs text-slate-400 font-medium font-body">Monitor live endpoints, active Google GenAI rate limits, and failure mitigations</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-[#C8FF00]/10 text-[#C8FF00] border border-[#C8FF00]/20 font-display uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C8FF00] animate-ping" />
              Gateway Online
            </div>
            {apiErrors.length > 0 && onClearErrors && (
              <button
                onClick={onClearErrors}
                className="py-1 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-bold font-display uppercase tracking-wider rounded-full transition-all cursor-pointer"
              >
                Clear Incident Logs
              </button>
            )}
          </div>
        </div>

        {/* Diagnostic Metrics Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          
          {/* Box 1: API Gateway Live Status */}
          <div className="border border-white/5 p-4 rounded-xl bg-black/40 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-[10px] font-extrabold mb-2.5 font-display uppercase tracking-widest">
                <Wifi className="h-3.5 w-3.5 text-[#C8FF00]" />
                API Gateway Health
              </div>
              <div className="text-xl font-black text-white font-display">REST SECURE PROXY</div>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-body">
                Express server gateway routes and proxies client requests to Google Gemini and ClickHouse Cloud over TLS 1.3.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex justify-between text-[9px] font-bold font-display uppercase text-slate-500">
              <span>Latency: ~140ms</span>
              <span className="text-[#C8FF00]">Status: Healthy</span>
            </div>
          </div>

          {/* Box 2: Google Gemini Rate Limits */}
          <div className="border border-white/5 p-4 rounded-xl bg-black/40 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-[10px] font-extrabold mb-2.5 font-display uppercase tracking-widest">
                <Gauge className="h-3.5 w-3.5 text-[#C8FF00]" />
                Gemini API Rate Limits
              </div>
              <div className="text-xl font-black text-[#C8FF00] font-display">15 RPM / 1.5K RPD</div>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-body">
                Active Tier: Gemini Flash. Limits: 15 Requests/Min, 1,000,000 Tokens/Min (TPM), 1,500 Requests/Day (RPD).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex justify-between text-[9px] font-bold font-display uppercase text-slate-500">
              <span>Automatic Failover: ENABLED</span>
              <span className="text-[#C8FF00]">Status: Standard</span>
            </div>
          </div>

          {/* Box 3: ClickHouse Server Status */}
          <div className="border border-white/5 p-4 rounded-xl bg-black/40 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-[10px] font-extrabold mb-2.5 font-display uppercase tracking-widest">
                <Server className="h-3.5 w-3.5 text-[#C8FF00]" />
                ClickHouse Cloud OLAP Capacity
              </div>
              <div className="text-xl font-black text-white font-display">100 CONCURRENT OPS</div>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-body">
                OLAP server scales to handle up to 100 simultaneous movie performance calculations. In-memory fallback available.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex justify-between text-[9px] font-bold font-display uppercase text-slate-500">
              <span>Edge Buffers: ACTIVE</span>
              <span className="text-[#C8FF00]">Status: Standby</span>
            </div>
          </div>

        </div>

        {/* Telemetry Log View */}
        <div className="border border-white/5 rounded-xl bg-black/60 overflow-hidden font-body">
          <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C8FF00] font-display">Live Incident Telemetry Logs</span>
            <span className="text-[10px] font-bold text-slate-400">Total Logs in Session: {apiErrors.length}</span>
          </div>

          <div className="p-4">
            <AnimatePresence mode="popLayout">
              {apiErrors.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-8 text-center"
                >
                  <div className="p-3 bg-[#C8FF00]/10 border border-[#C8FF00]/20 rounded-full text-[#C8FF00] mb-3">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h4 className="text-white text-xs font-bold uppercase tracking-wider font-display">All Systems Operational</h4>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-md leading-relaxed">
                    No API outages, connection anomalies, or 503 high-demand rate limit constraints have been reported in this session.
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {apiErrors.map((err) => (
                    <motion.div
                      key={err.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="border border-white/5 bg-black/40 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-rose-500/30 transition-all"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                            err.statusCode === 503 
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          } font-display`}>
                            {err.statusCode} {err.statusCode === 503 ? "Service Unavailable" : "System Error"}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">{err.endpoint}</span>
                          <span className="text-[9px] text-slate-500 font-mono font-medium ml-auto md:ml-0">{err.timestamp}</span>
                        </div>
                        
                        <p className="text-[11px] text-slate-300 font-medium leading-relaxed bg-black/40 p-2 rounded-lg border border-white/5 max-h-16 overflow-y-auto font-mono">
                          {err.message}
                        </p>
                        
                        <div className="flex items-start gap-1.5 bg-[#C8FF00]/5 border border-[#C8FF00]/10 p-2.5 rounded-lg">
                          <ShieldAlert className="h-3.5 w-3.5 text-[#C8FF00] shrink-0 mt-0.5" />
                          <div className="text-[10px] text-slate-300 leading-relaxed font-body">
                            <strong className="text-[#C8FF00] uppercase font-display tracking-wider text-[9px] block mb-0.5">Recommended Remediation:</strong>
                            {err.remediation}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: DNS & Hosting Infrastructure Manager */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#C8FF00]/10 border border-[#C8FF00]/20 text-[#C8FF00]">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white font-display uppercase tracking-wider">Hosting & DNS Operations</h3>
                  <p className="text-xs text-slate-400 font-medium font-body">Virtual Zone File records and CNAME propagation checker</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-300 bg-white/5 px-2.5 py-1 rounded-full border border-white/10 font-display uppercase">Cloudflare CDN Edge</span>
            </div>

            {/* List DNS Records */}
            <div className="overflow-x-auto rounded-xl border border-white/5 mb-6 bg-black/40">
              <table className="w-full text-left border-collapse text-xs font-body">
                <thead>
                  <tr className="bg-white/5 text-slate-400 font-bold border-b border-white/5">
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4">Value</th>
                    <th className="py-2.5 px-4">TTL</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {dnsRecords.map((rec, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-extrabold text-[#C8FF00]">{rec.type}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{rec.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-200 max-w-xs truncate" title={rec.value}>{rec.value}</td>
                      <td className="py-3 px-4 text-slate-500">{rec.ttl}</td>
                      <td className="py-3 px-4">
                        {rec.status === "propagated" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[#C8FF00]/10 text-[#C8FF00] border border-[#C8FF00]/20 font-display uppercase">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse font-display uppercase">
                            Syncing
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteDns(idx)}
                          className="text-slate-500 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Form to insert new DNS Record */}
            <form onSubmit={handleAddDns} className="space-y-3.5 border-t border-white/5 pt-5">
              <span className="text-[10px] font-extrabold text-[#C8FF00] uppercase tracking-widest block font-display">Add Custom Entry</span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <select
                    value={newDnsType}
                    onChange={(e) => setNewDnsType(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white font-bold focus:border-[#C8FF00] outline-none cursor-pointer"
                  >
                    <option value="A" className="bg-[#1A1A1A]">A Record</option>
                    <option value="CNAME" className="bg-[#1A1A1A]">CNAME</option>
                    <option value="TXT" className="bg-[#1A1A1A]">TXT</option>
                    <option value="MX" className="bg-[#1A1A1A]">MX</option>
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Host (e.g., staging)"
                    value={newDnsName}
                    onChange={(e) => setNewDnsName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-[#C8FF00] outline-none"
                  />
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Points to value"
                    value={newDnsValue}
                    onChange={(e) => setNewDnsValue(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-[#C8FF00] outline-none flex-1"
                  />
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="py-2 px-4 bg-[#C8FF00] text-[#0A0A0A] rounded-full text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Record
                  </motion.button>
                </div>
              </div>
            </form>
          </div>

          {/* SSL and CDN Operations Widget */}
          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 shadow-xl">
            <h4 className="text-sm font-extrabold text-white mb-4 font-display uppercase tracking-wider">SSL & Content Delivery Network Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-white/5 p-4 rounded-xl bg-black/40">
                <div className="flex items-center gap-2 text-slate-300 text-xs font-bold mb-2 font-display uppercase">
                  <ShieldCheck className="h-4 w-4 text-[#C8FF00]" />
                  SSL Certificate Autoshield
                </div>
                <div className="text-lg font-black text-white">Valid: 279 Days Remaining</div>
                <p className="text-[10px] text-slate-500 mt-1 font-body">Let's Encrypt TLS 1.3 - Auto renewal is enabled.</p>
              </div>

              <div className="border border-white/5 p-4 rounded-xl bg-black/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-slate-300 text-xs font-bold mb-2 font-display uppercase">
                    <Zap className="h-4 w-4 text-[#C8FF00]" />
                    Bypass Cache (Purge Assets)
                  </div>
                  <p className="text-[10px] text-slate-500 font-body">Flush WordPress assets and CDN cache from Edge servers immediately.</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => alert("CDN Cache completely purged successfully.")}
                  className="mt-3.5 w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold font-display uppercase tracking-wider rounded-lg transition-colors cursor-pointer text-center"
                >
                  Purge Edge Cache
                </motion.button>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Quality Assurance Staging Review */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-xl bg-[#C8FF00]/10 border border-[#C8FF00]/20 text-[#C8FF00]">
                <CheckSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white font-display uppercase tracking-wider font-bold">Staging Review Checklist</h3>
                <p className="text-xs text-slate-400 font-medium font-body">Verify agency standards before launch</p>
              </div>
            </div>

            {/* Interactive Tasks checklist */}
            <div className="space-y-3">
              {qaTasks.map((t) => (
                <div 
                  key={t.id} 
                  onClick={() => handleToggleTask(t.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    t.checked 
                      ? "bg-[#C8FF00]/10 border-[#C8FF00]/20 text-[#C8FF00]" 
                      : "bg-[#1A1A1A] border-white/5 text-slate-400 hover:bg-white/5"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={t.checked}
                    readOnly
                    className="mt-0.5 accent-[#C8FF00] rounded"
                  />
                  <div>
                    <span className="text-xs font-bold block text-white">{t.text}</span>
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-[#C8FF00] font-display">{t.category} Category</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Core Web Vitals Auditor */}
            <div className="border-t border-white/5 pt-5 mt-5">
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-xs font-bold text-white font-display uppercase tracking-wider">Core Web Vitals & Figma Audit</span>
                <motion.button
                  onClick={handleRunAudit}
                  disabled={isAuditing}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1 py-1.5 px-3 bg-[#C8FF00] text-[#0A0A0A] rounded-full text-xs font-bold font-display uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${isAuditing ? "animate-spin" : ""}`} />
                  {isAuditing ? "Analyzing..." : "Trigger Audit"}
                </motion.button>
              </div>

              <div className="grid grid-cols-2 gap-3 font-body">
                <div className="bg-black/40 border border-white/5 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-display">Performance</div>
                  <div className="text-xl font-black text-[#C8FF00] mt-1">{auditScores.performance}%</div>
                </div>
                <div className="bg-black/40 border border-white/5 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-display">Accessibility</div>
                  <div className="text-xl font-black text-[#C8FF00] mt-1">{auditScores.accessibility}%</div>
                </div>
                <div className="bg-black/40 border border-white/5 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-display">Figma Match</div>
                  <div className="text-xl font-black text-[#C8FF00] mt-1">{auditScores.figmaMatch}%</div>
                </div>
                <div className="bg-black/40 border border-white/5 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-display">Technical SEO</div>
                  <div className="text-xl font-black text-[#C8FF00] mt-1">{auditScores.seo}%</div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* REUSABLE GUNTENBERG & MODERN FRAMEWORKS COMPONENT SHELF */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#C8FF00]/10 border border-[#C8FF00]/20 text-[#C8FF00]">
              <Code className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white font-display uppercase tracking-wider">Agency Component Shelf</h3>
              <p className="text-xs text-slate-400 font-medium font-body">Reusable code snippets matching professional WordPress & Gutenberg specifications</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {REUSABLE_BLOCKS.map((b) => {
            const isOpen = activeCodeBlockId === b.id;
            return (
              <div 
                key={b.id} 
                className="border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:border-[#C8FF00]/30 hover:shadow-lg transition-all bg-black/40"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#C8FF00]/10 text-[#C8FF00] border border-[#C8FF00]/20 font-display">
                      {b.type}
                    </span>
                    <button
                      onClick={() => handleCopyCode(b.id, b.code)}
                      className="text-slate-400 hover:text-[#C8FF00] p-1 cursor-pointer transition-colors animate-pulse"
                      title="Copy Code"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-2.5 font-display">{b.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-body">{b.description}</p>
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => setActiveCodeBlockId(isOpen ? null : b.id)}
                    className="w-full text-center py-2 bg-[#1A1A1A] border border-white/5 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 font-display uppercase tracking-wider text-[10px]"
                  >
                    {isOpen ? "Hide Blueprint" : "Show Blueprint Source"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Active Code Block Drawer inside component */}
        <AnimatePresence>
          {activeCodeBlockId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 border-t border-white/5 pt-5 overflow-hidden font-body"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white font-display uppercase tracking-wider">
                  Gutenberg / ACF Flexible Layout Engine
                </span>
                <span className="text-[10px] text-[#C8FF00] font-bold bg-[#C8FF00]/10 px-2.5 py-0.5 rounded-full border border-[#C8FF00]/20">
                  {copiedBlockId === activeCodeBlockId ? "Copied!" : "Ready to copy"}
                </span>
              </div>
              <pre className="p-4 bg-black text-slate-200 text-xs font-mono rounded-xl overflow-x-auto leading-relaxed shadow-inner border border-white/5">
                {REUSABLE_BLOCKS.find((b) => b.id === activeCodeBlockId)?.code}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
