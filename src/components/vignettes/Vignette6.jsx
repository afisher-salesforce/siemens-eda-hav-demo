import React from 'react';
import { Zap, Database, MessageSquare, Bot, FileX } from 'lucide-react';
import VignetteTemplate from './VignetteTemplate';

export default function Vignette6() {
  return (
    <VignetteTemplate
      number={6}
      title="From Heroic Manual Efforts to Closed-Loop Automation"
      subtitle="How real-time telemetry, automated field service, and closed-loop financial tracking replace the 'hear about it days later' operating model."
      icon={Zap}
      iconColor="#8b5cf6"
      challenge={[
        "A blade card fails in a colocation facility at 2 AM. In today's world, the operations team doesn't learn about it until IT opens a service request — often days later. A technician then walks the colo floor scanning barcodes for two days to identify affected hardware — they can't even tell which rack or facility the blade belongs to without cross-referencing a spreadsheet. The repair gets tracked in a disconnected system. Costs are manually entered into SAP weeks after the fact.",
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
      ]}
      agentPrompts={[
        { agent: 'hav', label: '"Are there any critical alerts or errors across the fleet?"', prompt: 'Are there any critical alerts or errors across the fleet?' },
        { agent: 'hav', label: '"Which assets have the highest error rates in the last 24 hours?"', prompt: 'Which assets have the highest error rates in the last 24 hours?' },
      ]}
    />
  );
}
