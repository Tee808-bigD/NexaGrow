import React, { useState, useEffect } from "react";
import { Database, Wifi, WifiOff, ShieldCheck, Key, Settings, X, Loader2 } from "lucide-react";
import { ConfigState, DbStatus } from "../types";

interface ClickHouseConfigProps {
  isOpen: boolean;
  onClose: () => void;
  status: DbStatus;
  onStatusChange: (status: DbStatus) => void;
}

export default function ClickHouseConfig({ isOpen, onClose, status, onStatusChange }: ClickHouseConfigProps) {
  const [config, setConfig] = useState<ConfigState>({
    host: "",
    port: 8443,
    username: "default",
    database: "default",
    useRemote: false,
    passwordMasked: "",
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | null; text: string }>({ type: null, text: "" });

  // Fetch current credentials when opening
  useEffect(() => {
    if (isOpen) {
      fetch("/api/db/config")
        .then((res) => res.json())
        .then((data) => {
          setConfig(data);
          setPasswordInput("");
          setMessage({ type: null, text: "" });
        })
        .catch((err) => console.error("Error loading db config:", err));
    }
  }, [isOpen]);

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setMessage({ type: null, text: "" });

    try {
      const payload: any = {
        host: config.host,
        port: config.port,
        username: config.username,
        database: config.database,
        useRemote: true,
      };

      // Only send password if changed
      if (passwordInput) {
        payload.password = passwordInput;
      }

      const res = await fetch("/api/db/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage({
          type: "success",
          text: data.message || "Connected to ClickHouse Cloud!",
        });
        
        // Refresh status
        const statusRes = await fetch("/api/db/status");
        const statusData = await statusRes.json();
        onStatusChange(statusData);
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to connect. Check credentials.",
        });
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: `Network error: ${err.message || err}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    setTesting(true);
    setMessage({ type: null, text: "" });

    try {
      const res = await fetch("/api/db/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useRemote: false }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: "success",
          text: "Successfully disconnected from ClickHouse Cloud. Running in Local Simulator mode.",
        });
        
        // Refresh status
        const statusRes = await fetch("/api/db/status");
        const statusData = await statusRes.json();
        onStatusChange(statusData);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: `Error: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div id="clickhouse-config-overlay" className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-md transition-all">
      <div id="clickhouse-config-panel" className="h-full w-full max-w-lg bg-[#0A0A0A] border-l border-white/5 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto text-slate-300 font-body">
        <div>
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <Database className="h-6 w-6 text-[#C8FF00] animate-pulse" />
              <h2 className="text-xl font-bold tracking-tight text-white font-display uppercase tracking-wider">ClickHouse Settings</h2>
            </div>
            <button id="close-config-btn" onClick={onClose} className="p-1 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="bg-[#1A1A1A] border border-white/5 p-4 rounded-2xl mb-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              {status.useRemote ? (
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#C8FF00]/10 text-[#C8FF00] border border-[#C8FF00]/20">
                  <Wifi className="h-4 w-4" />
                </div>
              ) : (
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <WifiOff className="h-4 w-4" />
                </div>
              )}
              <div>
                <div className="text-[10px] text-[#C8FF00] font-bold uppercase tracking-wider font-display">Current Pipeline Engine</div>
                <div className="font-bold text-sm text-white font-display uppercase tracking-wide">
                  {status.useRemote ? "Remote ClickHouse Cloud Active" : "Local ClickHouse Simulator (Alasql)"}
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {status.useRemote
                ? `Running analytics directly against database instance at "${status.host}".`
                : "Using a high-fidelity local in-memory SQL execution engine. Provide ClickHouse Cloud credentials below to link your live production databases."}
            </p>
          </div>

          <form id="db-config-form" onSubmit={handleSaveAndTest} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 font-display">
                ClickHouse Host URL / Endpoint
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g., xxx.europe-west2.gcp.clickhouse.cloud"
                  value={config.host}
                  onChange={(e) => setConfig({ ...config, host: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 focus:bg-black/60 focus:border-[#C8FF00] focus:ring-1 focus:ring-[#C8FF00]/20 rounded-xl py-2.5 px-3 text-sm text-white transition-all outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1.5 block">
                Do not include raw https:// protocols unless required. Default secure connections will be enforced.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 font-display">
                  HTTPS Port
                </label>
                <input
                  type="number"
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 8443 })}
                  className="w-full bg-black/40 border border-white/10 focus:bg-black/60 focus:border-[#C8FF00] focus:ring-1 focus:ring-[#C8FF00]/20 rounded-xl py-2.5 px-3 text-sm text-white transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 font-display">
                  Database Name
                </label>
                <input
                  type="text"
                  value={config.database}
                  onChange={(e) => setConfig({ ...config, database: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 focus:bg-black/60 focus:border-[#C8FF00] focus:ring-1 focus:ring-[#C8FF00]/20 rounded-xl py-2.5 px-3 text-sm text-white transition-all outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 font-display">
                  Username
                </label>
                <input
                  type="text"
                  value={config.username}
                  onChange={(e) => setConfig({ ...config, username: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 focus:bg-black/60 focus:border-[#C8FF00] focus:ring-1 focus:ring-[#C8FF00]/20 rounded-xl py-2.5 px-3 text-sm text-white transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 font-display">
                  Password
                </label>
                <input
                  type="password"
                  placeholder={config.passwordMasked ? "••••••••••••" : "Enter Password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:bg-black/60 focus:border-[#C8FF00] focus:ring-1 focus:ring-[#C8FF00]/20 rounded-xl py-2.5 px-3 text-sm text-white transition-all outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            {message.text && (
              <div
                className={`p-3 rounded-xl text-xs leading-relaxed flex items-start gap-2 border ${
                  message.type === "success"
                    ? "bg-[#C8FF00]/10 border-[#C8FF00]/20 text-[#C8FF00]"
                    : "bg-rose-950/20 border-rose-900/20 text-rose-400"
                }`}
              >
                <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{message.text}</span>
              </div>
            )}

            <button
              id="test-save-db-btn"
              type="submit"
              disabled={testing || !config.host}
              className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#C8FF00] text-[#0A0A0A] disabled:bg-white/5 disabled:text-slate-500 disabled:cursor-not-allowed font-extrabold text-xs rounded-full shadow-lg hover:shadow-[#C8FF00]/10 active:scale-[0.98] transition-all cursor-pointer font-display uppercase tracking-widest"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                "Save & Verify Connection"
              )}
            </button>
          </form>
        </div>

        <div className="border-t border-white/5 pt-4 mt-8 flex flex-col gap-2">
          {status.useRemote && (
            <button
              id="disconnect-db-btn"
              onClick={handleDisconnect}
              disabled={testing}
              className="w-full py-2.5 px-4 bg-transparent hover:bg-white/5 active:scale-[0.98] transition-all text-slate-300 rounded-full text-xs font-bold border border-white/10 cursor-pointer shadow-md font-display uppercase tracking-wider"
            >
              Disconnect & Return to Local Simulator
            </button>
          )}
          <div className="text-[9px] text-slate-500 text-center flex items-center justify-center gap-1.5 mt-2 font-medium">
            <Key className="h-3 w-3 text-slate-600" />
            Your credentials are kept securely server-side and never exposed to the client.
          </div>
        </div>
      </div>
    </div>
  );
}
