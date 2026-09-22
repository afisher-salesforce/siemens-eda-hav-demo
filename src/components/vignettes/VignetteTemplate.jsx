import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronRight, Sparkles, Shield, Zap } from 'lucide-react';
import { AgentChatContext } from '../Layout';

const VIGNETTES = [
  { path: '/vignettes/order-close', title: 'The Order That Almost Didn\'t Close' },
  { path: '/vignettes/capacity', title: 'The Capacity Nobody Could See' },
  { path: '/vignettes/finance', title: 'The Spreadsheet That Owns the Quarter Close' },
  { path: '/vignettes/traveler', title: 'The Traveler That Traveled by Email' },
  { path: '/vignettes/platform', title: 'The Platform That Connects It All' },
  { path: '/vignettes/automation', title: 'From Heroic Manual Efforts to Closed-Loop Automation' },
];

function OutcomeCard({ metric, label, color }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-surface-border bg-surface-card p-5">
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-10 blur-2xl"
        style={{ backgroundColor: color }}
      />
      <div className="relative">
        <div className="text-2xl font-bold text-white mb-1">{metric}</div>
        <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

function CapabilityTag({ name, description }) {
  return (
    <div className="rounded-lg border border-surface-border bg-[#0d1321] p-4 hover:border-siemens-teal/30 transition-colors">
      <div className="text-sm font-semibold text-siemens-accent mb-1">{name}</div>
      <div className="text-xs text-gray-500 leading-relaxed">{description}</div>
    </div>
  );
}

export default function VignetteTemplate({
  number,
  title,
  subtitle,
  icon: Icon,
  iconColor,
  challenge,
  outcomes,
  whySalesforce,
  capabilities,
  agentPrompts,
}) {
  const currentIndex = number - 1;
  const prev = currentIndex > 0 ? VIGNETTES[currentIndex - 1] : null;
  const next = currentIndex < VIGNETTES.length - 1 ? VIGNETTES[currentIndex + 1] : null;
  const openAgentChat = useContext(AgentChatContext);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl border border-surface-border bg-surface-card">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            background: `radial-gradient(ellipse at 30% 50%, ${iconColor}, transparent 70%)`,
          }}
        />
        <div className="relative px-8 py-10">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
            <Link to="/vignettes" className="hover:text-siemens-accent transition-colors">
              Vignettes
            </Link>
            <ChevronRight size={12} />
            <span className="text-gray-400">Story {number} of 6</span>
          </div>
          <div className="flex items-start gap-5">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${iconColor}15`, border: `1px solid ${iconColor}30` }}
            >
              <Icon size={28} style={{ color: iconColor }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
              <p className="text-sm text-gray-400 leading-relaxed max-w-2xl">{subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: The Business Challenge */}
      <div className="section-card">
        <div className="section-card-header">
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
            The Business Challenge
          </h2>
        </div>
        <div className="section-card-body">
          <div className="text-sm text-gray-300 leading-relaxed space-y-4">
            {challenge.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Section 2: The Outcome */}
      <div className="section-card">
        <div className="section-card-header">
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
            Potential Business Outcomes
          </h2>
        </div>
        <div className="section-card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {outcomes.map((outcome, i) => (
              <OutcomeCard
                key={i}
                metric={outcome.metric}
                label={outcome.label}
                color={iconColor}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Section 3: Why Salesforce, Why Now */}
      <div className="section-card">
        <div className="section-card-header">
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
            Why Salesforce · Why Now
          </h2>
        </div>
        <div className="section-card-body space-y-5">
          {whySalesforce.map((item, i) => (
            <div key={i} className="flex gap-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: `${iconColor}15`, border: `1px solid ${iconColor}25` }}
              >
                <item.icon size={16} style={{ color: iconColor }} />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-200 mb-1">{item.title}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{item.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Salesforce Capabilities */}
      <div className="section-card">
        <div className="section-card-header">
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
            Salesforce Capabilities Powering This Solution
          </h2>
        </div>
        <div className="section-card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {capabilities.map((cap, i) => (
              <CapabilityTag key={i} name={cap.name} description={cap.description} />
            ))}
          </div>
        </div>
      </div>

      {/* Try It With the Agent */}
      {agentPrompts && agentPrompts.length > 0 && openAgentChat && (
        <div className="section-card overflow-hidden">
          <div className="section-card-header">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
              Try It With the Agent
            </h2>
            <div className="flex items-center gap-1.5">
              <Sparkles size={11} className="text-siemens-accent" />
              <span className="text-[10px] text-siemens-accent font-medium uppercase tracking-wider">Live Demo</span>
            </div>
          </div>
          <div className="section-card-body">
            <p className="text-xs text-gray-500 mb-4">
              Ask the Agentforce agent a question related to this story — it will query live Salesforce data and respond in real time.
            </p>
            <div className="flex flex-wrap gap-2">
              {agentPrompts.map((ap, i) => {
                const isTradeAgent = ap.agent === 'trade';
                return (
                  <button
                    key={i}
                    onClick={() => openAgentChat(ap.agent, ap.prompt)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-lg border transition-all cursor-pointer group ${
                      isTradeAgent
                        ? 'border-amber-500/20 text-amber-300/80 bg-amber-500/5 hover:bg-amber-500/15 hover:border-amber-500/40'
                        : 'border-siemens-teal/20 text-siemens-accent/80 bg-siemens-teal/5 hover:bg-siemens-teal/15 hover:border-siemens-teal/40'
                    }`}
                  >
                    {isTradeAgent ? (
                      <Shield size={12} className="text-amber-400 shrink-0" />
                    ) : (
                      <Zap size={12} className="text-siemens-accent shrink-0" />
                    )}
                    <span className="text-left">{ap.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between py-4">
        {prev ? (
          <Link
            to={prev.path}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-siemens-accent transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span className="max-w-[200px] truncate">{prev.title}</span>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            to={next.path}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-siemens-accent transition-colors group"
          >
            <span className="max-w-[200px] truncate">{next.title}</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        ) : (
          <Link
            to="/vignettes"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-siemens-accent transition-colors"
          >
            Back to all vignettes
          </Link>
        )}
      </div>
    </div>
  );
}
