import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Users, Zap, Target, ArrowRight, MessageSquare } from 'lucide-react';

const STORAGE_KEY = 'demo-context-expanded';

export default function DemoContextPanel({ personas, painQuote, painPoints, outcomes, handoffs }) {
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, expanded);
    } catch {}
  }, [expanded]);

  if (!personas || personas.length === 0) return null;

  return (
    <div className="rounded-lg border border-surface-border bg-[#0a0e1a] overflow-hidden transition-all duration-300">
      {/* Collapsed Bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-4 min-w-0">
          {/* Persona Chips */}
          <div className="flex items-center gap-2 shrink-0">
            {personas.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ backgroundColor: p.color || '#009999' }}
                >
                  {p.initials}
                </div>
                <span className="text-[11px] text-gray-400 font-medium hidden sm:inline whitespace-nowrap">
                  {p.name}
                </span>
                {i < personas.length - 1 && (
                  <span className="text-gray-700 text-xs hidden sm:inline">·</span>
                )}
              </div>
            ))}
          </div>

          {/* Pain Quote */}
          {painQuote && (
            <div className="flex items-center gap-1.5 min-w-0 ml-2 border-l border-gray-800 pl-3">
              <MessageSquare size={10} className="text-gray-600 shrink-0" />
              <span className="text-[11px] text-gray-500 italic truncate">
                "{painQuote}"
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className="text-[9px] text-gray-600 uppercase tracking-wider font-semibold hidden md:inline">
            Demo Context
          </span>
          {expanded ? (
            <ChevronUp size={14} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
          ) : (
            <ChevronDown size={14} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
          )}
        </div>
      </button>

      {/* Expanded Panel */}
      <div
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          maxHeight: expanded ? '400px' : '0px',
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="border-t border-surface-border px-5 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Personas Column */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Users size={11} className="text-siemens-accent" />
                <span className="text-[9px] text-gray-500 uppercase tracking-[0.12em] font-bold">
                  Personas
                </span>
              </div>
              <div className="space-y-2">
                {personas.map((p, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ backgroundColor: p.color || '#009999' }}
                    >
                      {p.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-200 leading-tight">{p.name}</div>
                      <div className="text-[10px] text-gray-500 leading-tight">{p.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pain Points Column */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Zap size={11} className="text-amber-400" />
                <span className="text-[9px] text-gray-500 uppercase tracking-[0.12em] font-bold">
                  Pain Points
                </span>
              </div>
              <div className="space-y-2">
                {painPoints.map((point, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-amber-500/60 mt-1.5 shrink-0" />
                    <span className="text-[11px] text-gray-400 leading-relaxed">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Outcomes Column */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Target size={11} className="text-emerald-400" />
                <span className="text-[9px] text-gray-500 uppercase tracking-[0.12em] font-bold">
                  Outcomes
                </span>
              </div>
              <div className="space-y-2">
                {outcomes.map((outcome, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-emerald-500/60 mt-1.5 shrink-0" />
                    <span className="text-[11px] text-gray-400 leading-relaxed">{outcome}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Handoff Flow */}
          {handoffs && (
            <div className="mt-4 pt-3 border-t border-gray-800/60 flex items-center gap-2 flex-wrap">
              <span className="text-[9px] text-gray-600 uppercase tracking-wider font-bold shrink-0">
                Handoffs
              </span>
              {handoffs.split('→').map((step, i, arr) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">
                    {step.trim()}
                  </span>
                  {i < arr.length - 1 && (
                    <ArrowRight size={10} className="text-siemens-accent/50" />
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
