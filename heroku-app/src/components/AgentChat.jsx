import React from 'react';
import { X, Sparkles, Send, Zap } from 'lucide-react';

export default function AgentChat({ open, onClose }) {
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
            <div className="w-8 h-8 rounded-lg bg-siemens-teal/20 border border-siemens-teal/30 flex items-center justify-center">
              <Sparkles size={16} className="text-siemens-accent" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-200">HAV Operations Agent</div>
              <div className="text-[10px] text-siemens-accent uppercase tracking-[0.12em] font-medium">
                Powered by Agentforce
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </div>

        {/* Chat Body — Stub */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-siemens-teal/10 border border-siemens-teal/20 flex items-center justify-center mb-5">
            <Sparkles size={28} className="text-siemens-accent" />
          </div>
          <h3 className="text-lg font-semibold text-gray-200 mb-2">
            HAV Operations Agent
          </h3>
          <p className="text-sm text-siemens-accent mb-1 font-medium">Coming Soon</p>
          <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
            This AI-powered assistant will help you manage emulator fleet operations,
            troubleshoot issues, and optimize capacity planning.
          </p>

          {/* Suggested actions — like the pill buttons in Claudeforce */}
          <div className="flex flex-wrap gap-2 mt-6 justify-center">
            {['Fleet Status', 'Capacity Forecast', 'Open Alerts', 'Revenue Summary'].map((label) => (
              <span key={label} className="pill-btn cursor-default opacity-50">
                <Zap size={10} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Input — Disabled Stub */}
        <div className="p-4 border-t border-surface-border shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              disabled
              placeholder="Ask the HAV Agent..."
              className="flex-1 px-4 py-2.5 rounded-lg border border-surface-border bg-surface-card text-sm text-gray-500 cursor-not-allowed placeholder:text-gray-600"
            />
            <button
              disabled
              className="p-2.5 rounded-lg bg-surface-card border border-surface-border text-gray-600 cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
