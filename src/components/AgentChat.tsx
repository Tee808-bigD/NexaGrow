import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Code, Terminal, Bot, User, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { ChatMessage } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface AgentChatProps {
  onRefreshData: () => void;
}

const CONVERSATION_SUGGESTIONS = [
  "Which genre has the highest average ROI?",
  "Recommend a film release strategy based on sentiment and views.",
  "Which movies are our high-budget risks vs high-profit blockbusters?",
  "Compare total box office revenues against streaming views."
];

export default function AgentChat({ onRefreshData }: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      role: "model",
      text: "Hello! I am your **Studio Intelligence Analyst**. I am fully connected to your ClickHouse movie performance database. Ask me anything about movie return-on-investments (ROI), budget efficiency, genre performance trends, or audience sentiment, and I will write ClickHouse queries to pull the raw numbers for you!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [openLogId, setOpenLogId] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleSendMessage = async (textToSend = inputValue) => {
    if (!textToSend.trim()) return;
    setInputValue("");
    setSending(true);

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);

    // Build history matching backend needs
    const history = messages.map(m => ({
      role: m.role,
      text: m.text
    }));

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: history
        })
      });

      // Securely extract response body as text to guard against HTML crash payloads
      const responseText = await res.text();
      let data: any = {};
      let isJson = false;

      try {
        data = JSON.parse(responseText);
        isJson = true;
      } catch (e) {
        isJson = false;
      }

      if (res.ok && isJson) {
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          role: "model",
          text: data.text,
          toolLogs: data.toolLogs,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages((prev) => [...prev, aiMessage]);
        
        // Auto open log if tools were executed
        if (data.toolLogs && data.toolLogs.length > 0) {
          setOpenLogId(aiMessage.id);
        }

        // Trigger parent data refresh in case agent performed inserts
        onRefreshData();
      } else {
        let errorMessage = "The AI Agent was unable to complete your request.";
        
        if (!isJson) {
          if (res.status === 503) {
            errorMessage = `Service Temporarily Unavailable (503). The Generative AI models are currently under exceptionally high demand. NexaGrow's automatic retry framework has queued your request. Please wait 10 seconds and try again.`;
          } else if (res.status === 500) {
            errorMessage = `Internal Server Error (500). Please check your GEMINI_API_KEY inside the Settings panel and ensure the ClickHouse database configuration is stable.`;
          } else {
            errorMessage = `Server Error (${res.status}): Non-JSON response received. The application server might be compiling or restarting.`;
          }
        } else {
          errorMessage = data.error || errorMessage;
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-ai-err`,
            role: "model",
            text: `⚠️ **Session Error**: ${errorMessage}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);

        // Dispatch telemetry custom event
        window.dispatchEvent(new CustomEvent("api-error", {
          detail: { endpoint: "/api/agent/chat", status: res.status, message: errorMessage }
        }));
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-ai-network-err`,
          role: "model",
          text: `❌ **Network Failure**: Could not establish connection to the AI Agent. Error: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      // Dispatch telemetry custom event
      window.dispatchEvent(new CustomEvent("api-error", {
        detail: { endpoint: "/api/agent/chat", status: 503, message: `Network/Proxy Timeout: ${err.message || err}` }
      }));
    } finally {
      setSending(false);
    }
  };

  const toggleLog = (id: string) => {
    setOpenLogId(openLogId === id ? null : id);
  };

  const formatSql = (sql: string): string => {
    if (!sql) return "";
    return sql
      .replace(/(SELECT|FROM|WHERE|GROUP BY|ORDER BY|SUM|AVG|COUNT|LIMIT|DESC|ASC|AS|AND|OR)/gi, "\n$1")
      .trim();
  };

  return (
    <div className="flex flex-col h-[580px] bg-[#1A1A1A] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3.5 bg-black/40">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-[#C8FF00] animate-pulse" />
          <span className="font-bold text-sm text-white font-display uppercase tracking-wider">Studio Intelligence Agent</span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-[#C8FF00] bg-[#C8FF00]/10 px-2.5 py-1 rounded-full font-bold border border-[#C8FF00]/20 shadow-2xs font-display">
          <Bot className="h-3 w-3 text-[#C8FF00]" />
          AUTONOMOUS ANALYST
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#0A0A0A]/40 font-body">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
              {/* Avatar */}
              <div className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full text-xs font-bold shadow-md ${
                isUser ? "bg-[#C8FF00] text-[#0A0A0A]" : "bg-[#1A1A1A] text-[#C8FF00] border border-white/10"
              }`}>
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-[#C8FF00]" />}
              </div>

              {/* Message Block */}
              <div className="space-y-2 max-w-full">
                <div className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-lg ${
                  isUser 
                    ? "bg-[#C8FF00] text-[#0A0A0A] rounded-tr-none font-medium" 
                    : "bg-black/60 text-slate-300 border border-white/5 rounded-tl-none"
                }`}>
                  {/* Simplistic markdown display for bold lines */}
                  {m.text.split("\n").map((line, lIdx) => {
                    // Check for lists or bullet markers
                    const isBullet = line.trim().startsWith("-") || line.trim().startsWith("*");
                    const bulletText = isBullet ? line.trim().substring(1).trim() : line;

                    const formattedLine = bulletText.split("**").map((part, pIdx) => {
                      if (pIdx % 2 === 1) {
                        return <strong key={pIdx} className={`font-bold ${isUser ? "text-black" : "text-[#C8FF00]"}`}>{part}</strong>;
                      }
                      return part;
                    });

                    return (
                      <p key={lIdx} className={`${isBullet ? "list-item list-disc ml-4 pl-1" : ""} ${lIdx > 0 ? "mt-1.5" : ""}`}>
                        {formattedLine}
                      </p>
                    );
                  })}
                  <span className={`block text-[9px] mt-1.5 ${isUser ? "text-neutral-700" : "text-slate-500"} text-right font-medium`}>
                    {m.timestamp}
                  </span>
                </div>

                {/* Tool Log (Accordion) */}
                {!isUser && m.toolLogs && m.toolLogs.length > 0 && (
                  <div className="border border-white/5 bg-black/40 rounded-xl overflow-hidden shadow-xl">
                    <button
                      id={`toggle-log-btn-${m.id}`}
                      onClick={() => toggleLog(m.id)}
                      className="w-full px-3 py-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white bg-white/5 border-b border-white/5 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 font-bold text-slate-300 font-display">
                        <Code className="h-3.5 w-3.5 text-[#C8FF00] animate-pulse" />
                        SQL Compiler Execution Logs ({m.toolLogs.length})
                      </span>
                      {openLogId === m.id ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                    </button>

                    {openLogId === m.id && (
                      <div className="p-3.5 bg-black space-y-3 font-mono text-[10px] text-slate-300 max-h-[220px] overflow-y-auto border-t border-white/5">
                        {m.toolLogs.map((log, idx) => (
                          <div key={idx} className="space-y-1.5 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                            <div className="flex items-center justify-between text-[9px]">
                              <span className="text-[#C8FF00] font-bold">▶ Executed tool: {log.toolName}()</span>
                              <span className="text-slate-500 font-semibold">Index {idx + 1}</span>
                            </div>

                            {log.args.query && (
                              <div className="bg-black rounded-lg p-3 text-slate-100 border border-white/5 whitespace-pre-wrap leading-relaxed text-[10px] break-all shadow-inner">
                                <span className="text-slate-500 text-[8px] font-bold block mb-1.5 uppercase tracking-wider">Formulated SQL Statement:</span>
                                <span className="text-[#C8FF00] font-mono">{formatSql(log.args.query)}</span>
                              </div>
                            )}

                            {log.result && (
                              <div className="bg-[#1A1A1A] rounded-lg p-3 border border-white/5 max-h-[140px] overflow-auto text-slate-300 leading-normal">
                                <span className="text-slate-500 text-[8px] font-bold block mb-1 uppercase tracking-wider">
                                  Pipeline Return Result ({log.result.source || "System Schema"}):
                                </span>
                                {log.result.error ? (
                                  <div className="flex items-start gap-1 text-rose-400 text-[9px]">
                                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0 text-rose-400" />
                                    <span>Error: {log.result.error}</span>
                                  </div>
                                ) : log.result.rows ? (
                                  <div className="text-[9px]">
                                    <div className="flex items-center gap-1 text-[#C8FF00] mb-1.5 font-bold">
                                      <CheckCircle2 className="h-3 w-3" />
                                      <span>Returned {log.result.rows.length} rows</span>
                                    </div>
                                    <pre className="text-slate-400 text-[9px] overflow-x-auto leading-relaxed font-mono bg-black p-2 border border-white/5 rounded">
                                      {JSON.stringify(log.result.rows.slice(0, 3), null, 2)}
                                      {log.result.rows.length > 3 && `\n... (+ ${log.result.rows.length - 3} more rows)`}
                                    </pre>
                                  </div>
                                ) : (
                                  <pre className="text-slate-400 text-[9px] overflow-x-auto whitespace-pre-wrap font-mono bg-black p-2 border border-white/5 rounded">
                                    {typeof log.result === "string" ? log.result : JSON.stringify(log.result, null, 2)}
                                  </pre>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* AI Typing Indicator */}
        {sending && (
          <div className="flex gap-3 max-w-[80%] mr-auto">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1A1A1A] border border-white/10 text-xs text-[#C8FF00] shadow-md">
              <Bot className="h-4 w-4 text-[#C8FF00] animate-spin" />
            </div>
            <div className="bg-black/60 border border-white/5 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-slate-400 flex items-center gap-2 shadow-xl">
              <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                Agent compiling analytical SQL models
                <span className="flex gap-0.5 ml-1">
                  <span className="h-1.5 w-1.5 bg-[#C8FF00] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 bg-[#C8FF00] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 bg-[#C8FF00] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </span>
            </div>
          </div>
        )}

        <div ref={messageEndRef} />
      </div>

      {/* Suggested Prompts Grid */}
      <div className="px-4 py-2.5 bg-black/40 border-t border-white/5 font-body">
        <span className="text-[9px] font-extrabold text-[#C8FF00] uppercase tracking-widest block mb-1.5 font-display">
          Recommended Analytical Prompts
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none whitespace-nowrap">
          {CONVERSATION_SUGGESTIONS.map((s, idx) => (
            <motion.button
              key={idx}
              id={`suggested-prompt-btn-${idx}`}
              onClick={() => handleSendMessage(s)}
              disabled={sending}
              whileHover={{ scale: 1.03, y: -0.5 }}
              whileTap={{ scale: 0.97 }}
              className="text-slate-300 hover:text-white bg-[#1A1A1A] hover:bg-white/5 border border-white/5 rounded-xl px-3 py-1.5 text-[10px] leading-relaxed transition-colors cursor-pointer font-bold active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-md"
            >
              {s}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Input Message Form */}
      <div className="p-4 border-t border-white/5 bg-[#1A1A1A] flex items-center gap-3">
        <input
          id="agent-chat-input"
          type="text"
          placeholder="Ask questions about movie performance metrics..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !sending) handleSendMessage();
          }}
          disabled={sending}
          className="flex-1 bg-black/40 hover:bg-black/60 focus:bg-black/80 border border-white/10 focus:border-[#C8FF00] focus:ring-1 focus:ring-[#C8FF00]/20 rounded-xl py-2.5 px-4 text-xs text-white placeholder:text-slate-500 disabled:opacity-50 transition-all outline-none font-body"
        />
        <motion.button
          id="send-agent-chat-btn"
          onClick={() => handleSendMessage()}
          disabled={sending || !inputValue.trim()}
          whileHover={sending || !inputValue.trim() ? {} : { scale: 1.05 }}
          whileTap={sending || !inputValue.trim() ? {} : { scale: 0.95 }}
          className="flex items-center justify-center p-2.5 rounded-xl bg-[#C8FF00] disabled:bg-[#1A1A1A] disabled:text-slate-600 transition-all shrink-0 shadow-lg cursor-pointer border border-[#C8FF00]"
        >
          <Send className="h-4 w-4 text-[#0A0A0A]" />
        </motion.button>
      </div>
    </div>
  );
}
