import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Shield, Send, Zap, Loader2, AlertCircle } from 'lucide-react';

const TRADE_AGENT_API = '/api/trade-agent';

const SUGGESTED_PROMPTS = [
  { label: 'Screen Quote', prompt: 'Screen quote Q-00001 for trade compliance — shipping to South Korea for Samsung.' },
  { label: 'Embargo Check', prompt: 'Check if North Korea (KP) is an embargoed destination.' },
  { label: 'ECCN Classify', prompt: 'Classify the dual-use products on the latest Veloce quote.' },
  { label: 'Tariff Lookup', prompt: 'What is the import tariff for HS 8542.31 from US to China?' },
  { label: 'Reg Monitor', prompt: 'Run a regulatory monitoring check for any embargo changes.' },
];

export default function TradeAgentChat({ open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  // Create a new agent session
  const createSession = useCallback(async () => {
    setInitializing(true);
    setError(null);
    try {
      const res = await fetch(`${TRADE_AGENT_API}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Session creation failed: ${res.status}`);
      }

      const data = await res.json();
      const sid = data.sessionId || data.id;
      setSessionId(sid);
      return sid;
    } catch (err) {
      console.error('Trade Agent session error:', err);
      setError(err.message);
      return null;
    } finally {
      setInitializing(false);
    }
  }, []);

  // Send a message to the agent
  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim()) return;

      // Add user message
      const userMsg = { role: 'user', content: text, timestamp: new Date() };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);
      setError(null);

      try {
        // Create session if needed
        let sid = sessionId;
        if (!sid) {
          sid = await createSession();
          if (!sid) {
            setLoading(false);
            return;
          }
        }

        const res = await fetch(`${TRADE_AGENT_API}/sessions/${sid}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 404 || res.status === 410) {
            setSessionId(null);
            throw new Error('Session expired. Please try again.');
          }
          throw new Error(errData.message || `Message failed: ${res.status}`);
        }

        const contentType = res.headers.get('content-type') || '';

        if (contentType.includes('text/event-stream')) {
          // Handle SSE stream
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let agentText = '';
          const agentMsgId = Date.now();

          setMessages((prev) => [
            ...prev,
            { role: 'agent', content: '', id: agentMsgId, timestamp: new Date() },
          ]);

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const eventData = JSON.parse(line.slice(6));
                  if (eventData.type === 'Inform' || eventData.type === 'TextChunk') {
                    agentText += eventData.text || eventData.message || '';
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === agentMsgId ? { ...m, content: agentText } : m
                      )
                    );
                  } else if (eventData.type === 'EndOfTurn' || eventData.type === 'Complete') {
                    if (eventData.text || eventData.message) {
                      agentText += eventData.text || eventData.message || '';
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === agentMsgId ? { ...m, content: agentText } : m
                        )
                      );
                    }
                  }
                } catch {
                  if (line.slice(6).trim()) {
                    agentText += line.slice(6);
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === agentMsgId ? { ...m, content: agentText } : m
                      )
                    );
                  }
                }
              }
            }
          }

          if (!agentText) {
            setMessages((prev) => prev.filter((m) => m.id !== agentMsgId));
          }
        } else {
          // Standard JSON response
          const data = await res.json();
          const agentReply =
            data.messages?.[0]?.text ||
            data.messages?.[0]?.message ||
            data.text ||
            data.message ||
            JSON.stringify(data);

          setMessages((prev) => [
            ...prev,
            { role: 'agent', content: agentReply, timestamp: new Date() },
          ]);
        }
      } catch (err) {
        console.error('Trade Agent message error:', err);
        setError(err.message);
        setMessages((prev) => [
          ...prev,
          { role: 'error', content: err.message, timestamp: new Date() },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [sessionId, createSession]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !loading) {
      sendMessage(input);
    }
  };

  const handleSuggestion = (prompt) => {
    if (!loading) {
      sendMessage(prompt);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setError(null);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-screen w-96 bg-[#0d1321] shadow-2xl z-50 flex flex-col border-l border-surface-border">
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-5 border-b border-surface-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Shield size={16} className="text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-200">Trade Compliance</div>
              <div className="text-[10px] text-amber-400 uppercase tracking-[0.12em] font-medium">
                Sentinel Agent
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={handleNewChat}
                className="px-2 py-1 rounded-md text-[10px] text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors uppercase tracking-wider font-medium"
                title="New conversation"
              >
                New Chat
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !initializing ? (
            /* Welcome state */
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
                <Shield size={28} className="text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-200 mb-2">
                Trade Compliance Sentinel
              </h3>
              <p className="text-xs text-gray-500 max-w-xs leading-relaxed mb-6">
                Screen quotes for export controls (EAR/ECCN), embargo compliance (OFAC/BIS),
                restricted party checks, and import tariff calculations.
              </p>

              {/* Suggested prompts */}
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED_PROMPTS.map(({ label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => handleSuggestion(prompt)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-full border border-amber-500/20 text-amber-300/80 bg-amber-500/5 cursor-pointer hover:bg-amber-500/15 hover:border-amber-500/40 transition-colors"
                  >
                    <Zap size={10} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message list */
            <>
              {messages.map((msg, i) => (
                <div key={msg.id || i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-amber-600 text-white rounded-br-sm'
                        : msg.role === 'error'
                        ? 'bg-red-900/30 border border-red-500/30 text-red-300 rounded-bl-sm'
                        : 'bg-surface-card border border-surface-border text-gray-300 rounded-bl-sm'
                    }`}
                  >
                    {msg.role === 'agent' && !msg.content && (
                      <div className="flex items-center gap-2 text-gray-500">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-xs">Screening...</span>
                      </div>
                    )}
                    {msg.role === 'error' && (
                      <div className="flex items-start gap-2">
                        <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                        <span>{msg.content}</span>
                      </div>
                    )}
                    {msg.role !== 'error' && msg.content && (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                </div>
              ))}

              {loading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex justify-start">
                  <div className="bg-surface-card border border-surface-border rounded-xl rounded-bl-sm px-4 py-2.5">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-xs">Sentinel is screening...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}

          {initializing && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-amber-400 mr-2" />
              <span className="text-sm text-gray-500">Starting compliance session...</span>
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-4 py-2 bg-red-900/20 border-t border-red-500/20">
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle size={12} />
              <span className="truncate">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-300"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-surface-border shrink-0">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || initializing}
              placeholder="Ask the Trade Compliance Sentinel..."
              className="flex-1 px-4 py-2.5 rounded-lg border border-surface-border bg-surface-card text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || initializing}
              className="p-2.5 rounded-lg bg-amber-600 border border-amber-600 text-white hover:bg-amber-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
