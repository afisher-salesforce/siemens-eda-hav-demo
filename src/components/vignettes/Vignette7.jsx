import React from 'react';
import { Zap, Database, MessageSquare, Bot, FileX, PackageSearch, Radio, Workflow } from 'lucide-react';
import VignetteTemplate from './VignetteTemplate';
import FutureStateTag from '../FutureStateTag';

export default function Vignette6() {
  return (
    <VignetteTemplate
      number={7}
      title="From Heroic Manual Efforts to Closed-Loop Automation"
      subtitle="How real-time telemetry, automated field service, and closed-loop financial tracking replace the 'hear about it days later' operating model."
      icon={Zap}
      iconColor="#8b5cf6"
      challenge={[
        "A blade card fails in a colocation facility at 2 AM. In today's world, the operations team doesn't learn about it until IT opens a service request — often days later. A technician then walks the colo floor scanning barcodes for two days to identify affected hardware — they can't even tell which rack or facility the blade belongs to without cross-referencing a spreadsheet. The repair gets tracked in a disconnected system. Costs are manually entered into SAP weeks after the fact.",
        "Then the hunt for a replacement begins. Is there a spare blade on the shelf? At which facility? Is it allocated to another customer's expansion? The spare-pool inventory lives in yet another spreadsheet — so a fix that should take an hour waits on a phone call to find out whether the part even exists.",
        "Between the failure and the resolution, a customer's emulation capacity is degraded. No automated alert. No automated dispatch. No automated cost tracking. Every step requires a person to notice something, tell someone else, and manually record what happened.",
        "Even when the repair is complete, the financial picture isn't. Cost data from the contract manufacturer lives in a separate system. Margin impact isn't visible until the next monthly reconciliation. The business runs on lagging indicators because the systems aren't connected.",
      ]}
      outcomes={[
        { metric: 'Instant', label: 'Telemetry-triggered work orders' },
        { metric: 'Real-Time', label: 'Vendor RMA and cost tracking' },
        { metric: '2 Days \u2192 0', label: 'Manual inventory scan time' },
      ]}
      whySalesforce={[
        {
          icon: Database,
          title: 'One System for the Sales Process',
          description:
            'From failure detection through repair completion and cost write-back, every step is a connected record — the full asset lifecycle in one place.',
        },
        {
          icon: MessageSquare,
          title: 'Collaborate in Slack',
          description:
            'Incident swarming brings the right engineers, operations staff, and vendor contacts together in a Slack channel — replacing the phone tree and email escalation.',
        },
        {
          icon: Bot,
          title: 'Digital Labor with Agentforce',
          description:
            'An AI agent detects the failure, creates the work order, identifies the nearest spare part, dispatches the technician, and notifies the customer — all autonomously.',
        },
        {
          icon: FileX,
          title: 'End the Spreadsheet Era',
          description:
            'Asset tracking, repair costs, vendor RMA status, and margin impact are all live in the system — no more waiting for monthly reconciliation to see the financial picture.',
        },
      ]}
      capabilities={[
        {
          name: 'Remote Monitoring & Proactive Service',
          description:
            'Real-time telemetry streams triggering automated work orders when performance degrades or failures occur. The asset hierarchy shows exactly which facility, rack, and blade is affected.',
        },
        {
          name: 'Field Service Worker Mobility',
          description:
            'Mobile-enabled technician dispatch with asset location, repair instructions, and spare parts inventory.',
        },
        {
          name: 'RMA / Depot Repair',
          description:
            'Closed-loop return merchandise authorization with vendor tracking, cost capture, and financial reconciliation.',
        },
        {
          name: 'Slack Swarming',
          description:
            'Instant incident collaboration bringing cross-functional experts together in real-time channels.',
        },
        {
          name: 'Agentforce Autonomous Agents',
          description:
            'AI-powered automation handling failure detection, dispatch, notifications, and vendor coordination.',
        },
        {
          name: 'Revenue Intelligence',
          description:
            'Live margin impact analysis connecting repair costs to customer profitability and contract terms.',
        },
        {
          name: 'Predictive Spares & Replenishment (future state — illustrative)',
          description:
            'Par-level / reorder-point per facility plus a failure-rate-driven spare-demand forecast, so a below-par colo triggers replenishment before the shelf is empty. Builds on the min-stock / below-minimum inventory logic already on the Spares view.',
        },
        {
          name: 'Vendor Orchestration & Integration (future state — illustrative)',
          description:
            'Slack Connect channels with contract manufacturers plus autonomous outreach to third-party repair services like PagerDuty — reachable via Slack, Agentforce + Apex, or MuleSoft. Illustrative roadmap on top of the live spare-pool, telemetry, and work-order spine.',
        },
      ]}
      extraSections={[
        {
          icon: PackageSearch,
          title: 'Proactive Spares & Vendor Orchestration',
          content: (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <FutureStateTag
                  label="Future State"
                  note="Illustrative roadmap. The reorder signal is on-screen today; predictive replenishment and third-party outreach build on the live spare-pool, telemetry, and work-order data already in the platform."
                />
              </div>
              <p className="text-th-secondary" style={{ marginBottom: '1rem', lineHeight: 1.6 }}>
                The reactive closed loop above resolves a failure fast. The next layer moves
                <em> ahead of </em> the failure — turning the spare pool into a managed, self-replenishing
                inventory and reaching out to repair vendors autonomously, before capacity is ever at risk.
              </p>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div className="section-card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <PackageSearch size={18} color="#8b5cf6" />
                    <strong className="text-th-primary">Predictive replenishment</strong>
                  </div>
                  <p className="text-th-secondary" style={{ lineHeight: 1.6 }}>
                    Par-level and reorder-point per facility — the same min-stock / below-minimum logic already
                    visible on the Spares view — combined with a spare-demand forecast derived from failure rates
                    (MTBF-style). A colo that drifts below par triggers replenishment automatically, so a spare is
                    on the shelf before the next blade fails, not ordered after.
                  </p>
                </div>
                <div className="section-card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Radio size={18} color="#8b5cf6" />
                    <strong className="text-th-primary">Slack Connect to manufacturers</strong>
                  </div>
                  <p className="text-th-secondary" style={{ lineHeight: 1.6 }}>
                    Shared Slack Connect channels bridge Siemens EDA operations and the contract manufacturer or
                    repair vendor directly — extending the in-app incident-swarming pattern into a
                    <em> cross-company </em> channel, so RMA status, parts availability, and dispatch happen in one
                    thread instead of an email chain across two companies.
                  </p>
                </div>
                <div className="section-card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Workflow size={18} color="#8b5cf6" />
                    <strong className="text-th-primary">Third-party repair-service integration</strong>
                  </div>
                  <p className="text-th-secondary" style={{ marginBottom: '0.5rem', lineHeight: 1.6 }}>
                    A telemetry threshold or a below-par spare event can drive autonomous outreach to a third-party
                    repair-orchestration service like <strong>PagerDuty</strong> — reached three ways, each an
                    illustrative integration option:
                  </p>
                  <ul className="text-th-secondary" style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.7 }}>
                    <li><strong>Slack</strong> — a workflow/alert posted to a connected channel that the vendor already watches.</li>
                    <li><strong>Agentforce + Apex</strong> — an invocable Apex callout the agent fires as a tool action.</li>
                    <li><strong>MuleSoft</strong> — an integration flow to the vendor's RMA system or the PagerDuty Events API.</li>
                  </ul>
                  <p className="text-th-secondary" style={{ marginTop: '0.5rem', lineHeight: 1.6 }}>
                    The result is outreach <em>ahead of</em> failure — the vendor is engaged on a degradation or
                    replenishment signal, not after a customer's capacity has already dropped.
                  </p>
                </div>
              </div>
            </div>
          ),
        },
      ]}
      agentPrompts={[
        { agent: 'hav', label: '"Are there any critical alerts or errors across the fleet?"', prompt: 'Are there any critical alerts or errors across the fleet?' },
        { agent: 'hav', label: '"Which assets have the highest error rates in the last 24 hours?"', prompt: 'Which assets have the highest error rates in the last 24 hours?' },
        { agent: 'hav', label: '"Which spare parts are below their minimum stock and at which facilities?"', prompt: 'Which spare parts are below their minimum stock and at which facilities?' },
      ]}
    />
  );
}
