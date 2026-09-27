import React from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus,
  Filter,
  UserCheck,
  Building2,
  Target,
  FileText,
  FileSignature,
  Package,
  Boxes,
  Receipt,
  Wrench,
  Activity,
  BarChart3,
  MessagesSquare,
  Bot,
  Cable,
  Snowflake,
  ArrowRight,
  ArrowUpRight,
} from 'lucide-react';

/**
 * LeadToCashMap — a single graphic that grounds the audience in the end-to-end
 * lead-to-cash process before they dive into the seven vignettes.
 *
 * The message: this solution EXTENDS Siemens EDA's existing Salesforce sales-CRM
 * investment (Lead → Quote/Contract, already live in their org) with the
 * downstream operate/serve layers, and wires the whole thing into a connected
 * system — data flows automatically in and out of Salesforce and Slack, so no
 * one hunts across systems.
 *
 * Three node states (no default "future state" — pre-quote CRM is real, existing):
 *   - existing : pre-quote CRM the customer already runs (the investment we extend)
 *   - solution : capabilities this HAV solution adds (link to the live view / vignette)
 *   - external : connected systems of record outside Salesforce (SAP)
 */

// ── Staged pipeline (systems of record, left → right, three phases) ──────────
const PHASES = [
  { id: 'sell', label: 'Demand → Sell', sub: 'Your existing Salesforce CRM' },
  { id: 'fulfill', label: 'Fulfill → Provision', sub: 'This solution' },
  { id: 'serve', label: 'Operate → Serve', sub: 'This solution' },
];

const STAGES = [
  // Demand → Sell (existing Salesforce CRM investment)
  { n: 1, label: 'Lead', icon: UserPlus, phase: 'sell', status: 'existing' },
  { n: 2, label: 'Lead Qualification', icon: Filter, phase: 'sell', status: 'existing' },
  { n: 3, label: 'Lead-to-Account Conversion', icon: UserCheck, phase: 'sell', status: 'existing' },
  { n: 4, label: 'Account Management', icon: Building2, phase: 'sell', status: 'existing', to: '/vignettes/accounts' },
  { n: 5, label: 'Opportunity Management', icon: Target, phase: 'sell', status: 'existing', to: '/vignettes/capacity' },
  { n: 6, label: 'Quote Management', icon: FileText, phase: 'sell', status: 'existing' },
  { n: 7, label: 'Contract Management', icon: FileSignature, phase: 'sell', status: 'existing', note: 'incl. Entitlements' },
  // Fulfill → Provision (this solution + the cash step)
  { n: 8, label: 'Order Management', icon: Package, phase: 'fulfill', status: 'solution', to: '/orders', note: 'Order decomposition → asset mapping' },
  { n: 9, label: 'Asset Management', icon: Boxes, phase: 'fulfill', status: 'solution', to: '/assets', note: 'Linked to Accounts, Contracts, Orders, Quotes, Opps, Cases, Work Orders' },
  { n: 'SAP', label: 'SAP — Billing & Invoicing', icon: Receipt, phase: 'fulfill', status: 'external', note: 'Revenue + COGS — the cash step' },
  // Operate → Serve (this solution)
  { n: 11, label: 'Work Order Management', icon: Wrench, phase: 'serve', status: 'solution', to: '/workorders', note: 'Deployment + failure management' },
];

// ── Cross-cutting fabric (spans every stage, rendered beneath the flow) ──────
const BANDS = [
  {
    id: 'data',
    label: 'Data & Integration Fabric',
    caption: 'Data flows in and out automatically — no manual lookup, no re-keying.',
    items: [
      { icon: Cable, label: 'MuleSoft', note: 'API-led integration to SAP & vendor systems' },
      { icon: Snowflake, label: 'Zero Copy — Snowflake', note: 'No-ETL data federation' },
      { icon: Activity, label: 'Data 360 / Telemetry', note: 'Streaming + unstructured data, unified', to: '/telemetry' },
    ],
  },
  {
    id: 'intel',
    label: 'Intelligence & Collaboration',
    caption: 'Insight and action on the same connected data — in Salesforce and in Slack.',
    items: [
      { icon: BarChart3, label: 'Analytics', note: 'e.g. Capacity Forecasting', to: '/capacity/forecast' },
      { icon: MessagesSquare, label: 'Slack + Slack Connect', note: 'Internal swarming + cross-company channels', to: '/vignettes/automation' },
      { icon: Bot, label: 'Agentforce', note: 'HAV Ops Agent + Trade Compliance Agent', to: '/vignettes/automation' },
    ],
  },
];

// ── Status marker chips (existing app badge idiom) ───────────────────────────
const STATUS = {
  existing: { cls: 'badge badge-gray', label: 'Existing Salesforce' },
  solution: { cls: 'badge badge-teal', label: 'HAV Solution' },
  external: { cls: 'badge badge-blue', label: 'Connected · External' },
};

function StatusChip({ status }) {
  const s = STATUS[status];
  if (!s) return null;
  return <span className={`${s.cls} text-[9px] uppercase tracking-wider`}>{s.label}</span>;
}

function StageCard({ stage }) {
  const Icon = stage.icon;
  const accent =
    stage.status === 'solution' ? '#009999' : stage.status === 'external' ? '#3b82f6' : '#64748b';
  const inner = (
    <div
      className="section-card h-full w-44 shrink-0 px-3 py-3 flex flex-col gap-2"
      style={{ borderColor: `${accent}30` }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accent}15`, border: `1px solid ${accent}30` }}
        >
          <Icon size={16} style={{ color: accent }} />
        </div>
        <div className="flex items-center gap-1 text-th-faint">
          <span className="text-[9px] uppercase tracking-wider">{`Step ${stage.n}`}</span>
          {stage.to && <ArrowUpRight size={11} className="group-hover:text-siemens-accent" />}
        </div>
      </div>
      <div className="text-xs font-semibold text-th-secondary leading-snug">{stage.label}</div>
      {stage.note && <div className="text-[10px] text-th-muted leading-snug">{stage.note}</div>}
      <div className="mt-auto pt-1">
        <StatusChip status={stage.status} />
      </div>
    </div>
  );
  return stage.to ? (
    <Link to={stage.to} className="group block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export default function LeadToCashMap() {
  return (
    <div className="section-card">
      <div className="px-6 py-6 space-y-5">
        {/* Heading + legend */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-th-primary">The Lead-to-Cash Motion</h2>
            <p className="text-xs text-th-muted leading-relaxed max-w-2xl mt-1">
              One connected process — this solution <strong>extends</strong> Siemens EDA's existing
              Salesforce sales CRM into fulfillment, provisioning, and service, and wires it into a
              single system where data flows automatically in and out of Salesforce and Slack. No one
              hunts across systems. Each capability links to the story or live view that shows it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <StatusChip status="existing" />
            <StatusChip status="solution" />
            <StatusChip status="external" />
          </div>
        </div>

        {/* Staged pipeline (horizontal, scrolls on narrow widths) */}
        <div className="overflow-x-auto pb-2">
          <div className="flex items-stretch gap-4 min-w-max">
            {PHASES.map((phase, pi) => {
              const stages = STAGES.filter((s) => s.phase === phase.id);
              return (
                <React.Fragment key={phase.id}>
                  <div className="flex flex-col gap-2">
                    <div className="px-1">
                      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-siemens-accent">
                        {phase.label}
                      </div>
                      <div className="text-[10px] text-th-faint">{phase.sub}</div>
                    </div>
                    <div className="flex items-stretch gap-2">
                      {stages.map((stage, si) => (
                        <React.Fragment key={stage.n}>
                          <StageCard stage={stage} />
                          {si < stages.length - 1 && (
                            <div className="flex items-center text-th-faint">
                              <ArrowRight size={16} />
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  {pi < PHASES.length - 1 && (
                    <div className="flex items-center text-siemens-accent/60 pt-6">
                      <ArrowRight size={20} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Cross-cutting fabric bands (span every stage) */}
        <div className="space-y-3">
          {BANDS.map((band) => (
            <div
              key={band.id}
              className="rounded-lg border border-siemens-teal/20 bg-siemens-teal/[0.04] px-4 py-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-siemens-accent">
                    {band.label}
                  </div>
                  <div className="text-[10px] text-th-muted">{band.caption}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {band.items.map((item) => {
                    const Icon = item.icon;
                    const chip = (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-card px-2.5 py-1 text-[10px] text-th-secondary"
                        title={item.note}
                      >
                        <Icon size={12} className="text-siemens-accent shrink-0" />
                        {item.label}
                        {item.to && <ArrowUpRight size={10} className="text-th-faint" />}
                      </span>
                    );
                    return item.to ? (
                      <Link key={item.label} to={item.to} className="hover:opacity-80 transition-opacity">
                        {chip}
                      </Link>
                    ) : (
                      <span key={item.label}>{chip}</span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
