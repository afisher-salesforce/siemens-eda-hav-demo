import React from 'react';
import { BarChart3, Database, MessageSquare, Bot, FileX, Calculator } from 'lucide-react';
import VignetteTemplate from './VignetteTemplate';

function ProjectionFormulaSection() {
  return (
    <div className="space-y-5">
      {/* Equation */}
      <div className="bg-surface-bg border border-surface-border rounded-lg px-6 py-5 overflow-x-auto">
        <p className="text-xs text-th-muted mb-3">The core projection equation for any given time bucket <span className="italic">t</span> is calculated as:</p>
        <div className="text-center py-3">
          <span className="text-lg text-th-primary font-serif italic tracking-wide">
            C<sub className="text-[10px] not-italic">projected</sub>(t) = C<sub className="text-[10px] not-italic">base</sub>
            {' + '}&#931;(S<sub className="text-[10px] not-italic">pipeline</sub> &middot; P<sub className="text-[10px] not-italic">win</sub>)
            {' − '}&#931;(A<sub className="text-[10px] not-italic">expiring</sub> &middot; (1 − P<sub className="text-[10px] not-italic">renew</sub>))
            {' − '}&#931;RMA<sub className="text-[10px] not-italic">out</sub>(t)
            {' + '}&#931;RMA<sub className="text-[10px] not-italic">in</sub>(t)
          </span>
        </div>
      </div>

      {/* Variable definitions */}
      <div className="space-y-2.5 text-xs text-th-muted leading-relaxed pl-1">
        <div className="flex gap-3 items-start">
          <span className="font-serif italic text-th-secondary shrink-0 w-36">C<sub className="text-[9px] not-italic">base</sub></span>
          <span>= Current active deployed capacity.</span>
        </div>
        <div className="flex gap-3 items-start">
          <span className="font-serif italic text-th-secondary shrink-0 w-36">S<sub className="text-[9px] not-italic">pipeline</sub> &middot; P<sub className="text-[9px] not-italic">win</sub></span>
          <span>= New sales weighted pipeline capacity additions.</span>
        </div>
        <div className="flex gap-3 items-start">
          <span className="font-serif italic text-th-secondary shrink-0 w-36">A<sub className="text-[9px] not-italic">expiring</sub> &middot; (1 − P<sub className="text-[9px] not-italic">renew</sub>)</span>
          <span>= Non-renewed expiring asset capacity freed up.</span>
        </div>
        <div className="flex gap-3 items-start">
          <span className="font-serif italic text-th-secondary shrink-0 w-36">RMA<sub className="text-[9px] not-italic">out</sub>(t)</span>
          <span>= Capacity temporarily lost due to hardware sent to manufacturer for repair.</span>
        </div>
        <div className="flex gap-3 items-start">
          <span className="font-serif italic text-th-secondary shrink-0 w-36">RMA<sub className="text-[9px] not-italic">in</sub>(t)</span>
          <span>= Capacity restored as repaired hardware returns from the OEM.</span>
        </div>
      </div>

      {/* Mapping to interactive controls */}
      <div className="bg-surface-bg border border-surface-border rounded-lg p-4">
        <p className="text-[10px] text-th-muted uppercase tracking-wider font-semibold mb-2.5">Interactive Levers → Formula Variables</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-th-muted">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span><strong className="text-th-secondary">Pipeline Confidence</strong> controls P<sub className="font-serif italic text-th-muted text-[9px]">win</sub></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
            <span><strong className="text-th-secondary">Renewal Rate</strong> controls P<sub className="font-serif italic text-th-muted text-[9px]">renew</sub></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <span><strong className="text-th-secondary">OEM Repair Lag</strong> scales RMA<sub className="font-serif italic text-th-muted text-[9px]">in</sub>(t) recovery</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
            <span><strong className="text-th-secondary">Decom Buffer</strong> extends expiry detection window</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Vignette2() {
  return (
    <VignetteTemplate
      number={2}
      title="The Capacity Nobody Could See"
      subtitle="How connected asset intelligence and pipeline signals replace the monster spreadsheet with real-time capacity planning."
      icon={BarChart3}
      iconColor="#6366f1"
      challenge={[
        "The operations team manages colocation facilities filled with emulation hardware worth millions. Which rack positions are allocated to which customers? When does a commitment end? What capacity becomes available next month? The answers live in a master spreadsheet — manually updated, version-controlled by heroics, and disconnected from the sales pipeline.",
        "When a sales rep wins a new emulation-as-a-service deal, operations has no advance signal. They discover demand when it arrives. If capacity isn't available, the customer goes to Cadence Palladium. If too much sits idle, the investment doesn't earn its return.",
        "Physical inventory counts take two days of barcode scanning per colocation facility. The spreadsheet is already out of date by the time it's complete. Every capacity decision is made on stale data.",
        "The blind spot extends to hardware that isn't deployed at all. Four HAV towers sit Available in the Munich spare pool and proFPGA units wait on the shelf — deployable capacity and idle capital that never appear on the same page as the racks they could fill. So a customer waits for a build-out while the asset that would satisfy them sits uncounted in a spare-pool spreadsheet nobody cross-references."
      ]}
      outcomes={[
        { metric: "Real-Time", label: "Capacity utilization visibility" },
        { metric: "What-If", label: "6-segment waterfall with 4 interactive scenario levers" },
        { metric: "Months Earlier", label: "Expansion decision lead time" },
        { metric: "Auto-Surfaced", label: "OEM repair lifecycle, spare pool, and idle capital" }
      ]}
      whySalesforce={[
        {
          icon: Database,
          title: "One System for the Sales Process",
          description: "The opportunity pipeline feeds directly into capacity planning — when a deal moves through the funnel, the system already knows whether hardware exists to fulfill it."
        },
        {
          icon: MessageSquare,
          title: "Collaborate in Slack",
          description: "When capacity hits a threshold, alerts notify operations and sales leadership in Slack — no more discovering shortages after the customer is committed."
        },
        {
          icon: Bot,
          title: "Digital Labor with Agentforce",
          description: "An AI agent continuously monitors capacity utilization and proactively alerts when action is needed — idle hardware, approaching limits, or mismatched demand."
        },
        {
          icon: FileX,
          title: "End the Spreadsheet Era",
          description: "The master capacity spreadsheet is replaced by a live scenario-planning engine with a 6-segment waterfall chart, four interactive levers (pipeline confidence, renewal rate, OEM repair lag, decommission buffer), facility drill-down modals, and bilateral write-back — all connected to actual asset records, contract dates, work orders, and pipeline signals."
        }
      ]}
      capabilities={[
        { name: "Demand Planning", description: "Match pipeline demand signals against physical capacity to forecast gaps and surplus months in advance. A 6-segment waterfall (Base → +Pipeline → −Expiring → −OEM Repair Out → +RMA Return → Projected) with four interactive levers — pipeline confidence, renewal rate, OEM repair lag, and decommission buffer — lets planners model any scenario in real time. Time-horizon selection and account/region filters narrow the view." },
        { name: "Asset Lifecycle Management", description: "Every emulator tracked in a physical hierarchy — Facility → Rack → Blade — with serial number, customer allocation, and contract dates. Drill from a colocation facility down to individual blades via the facility drill-down modal, which also shows active work orders with bilateral write-back to complete repairs and return blades to the rack." },
        { name: "Proactive Insights", description: "Automated analysis surfacing capacity trends, utilization patterns, and expansion timing recommendations." },
        { name: "Unified Customer Profile", description: "Customer commitment history, usage patterns, and renewal timelines in a single view." },
        { name: "Predictive AI Scoring", description: "Machine learning models predicting future capacity demand based on pipeline, seasonality, and customer growth." },
        { name: "Spare Pool & Inventory Visibility", description: "Not-yet-deployed hardware — Available spares, Shipped and Purchased units, OEM/RMA blades — tracked in the same connected asset model as deployed racks. Idle capital and deployable spares surface alongside live capacity, so a spare in the Munich pool is one query away from the customer it could serve rather than buried in a separate inventory sheet." }
      ]}
      extraSections={[
        {
          title: 'Projection Formula',
          icon: Calculator,
          content: <ProjectionFormulaSection />,
        },
      ]}
      agentPrompts={[
        { agent: 'hav', label: '"What is the rack utilization at Santa Clara HSC1?"', prompt: 'What is the rack utilization at Santa Clara HSC1?' },
        { agent: 'hav', label: '"Run a scenario: 60% pipeline confidence, 80% renewal rate — what capacity do we need?"', prompt: 'Run a scenario: 60% pipeline confidence, 80% renewal rate — what capacity do we need?' },
        { agent: 'hav', label: '"Which facilities have OEM repair work orders that will free up blades this quarter?"', prompt: 'Which facilities have OEM repair work orders that will free up blades this quarter?' },
      ]}
    />
  );
}
