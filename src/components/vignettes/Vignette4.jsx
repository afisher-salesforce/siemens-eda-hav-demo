import React from 'react';
import { FileText, Database, MessageSquare, Bot, FileX } from 'lucide-react';
import VignetteTemplate from './VignetteTemplate';

export default function Vignette4() {
  return (
    <VignetteTemplate
      number={4}
      title="The Traveler That Traveled by Email"
      subtitle="How automated order workflows replace SharePoint travelers and email chains with structured, real-time orchestration."
      icon={FileText}
      iconColor="#ef4444"
      challenge={[
        "A customer order for hardware — loan, lease, or sale — kicks off a multi-team relay race. A SharePoint Excel traveler is created, emailed to operations, updated by MED, forwarded to logistics, amended by the vendor, and eventually completed by customer operations. At each step, someone copies data from one place and enters it somewhere else.",
        "This is the \"Traveler\" — a SharePoint-based Excel document that is the de facto order management system. Emails from the process literally arrive during meetings. One missed update, one overlooked attachment, one transposition error anywhere in the chain can delay the entire order or produce incorrect shipments.",
        "The operations team has already articulated their goal — move away from Travelers entirely and shift to direct transaction automation. They know the current process doesn't scale. The question isn't whether to change, but how quickly they can.",
      ]}
      outcomes={[
        { metric: '50%+', label: 'Order cycle time reduction' },
        { metric: 'Zero', label: 'Manual data re-entry errors' },
        { metric: 'Real-Time', label: 'Order status for all stakeholders' },
      ]}
      whySalesforce={[
        {
          icon: Database,
          title: 'One System for the Sales Process',
          description:
            'Every order step — compliance, MED confirmation, SAP creation, logistics, delivery — becomes a structured task with an owner, a deadline, and an automated handoff.',
        },
        {
          icon: MessageSquare,
          title: 'Collaborate in Slack',
          description:
            'Order status updates, exception alerts, and handoff notifications flow through Slack channels — replacing the email relay that loses context and creates delays.',
        },
        {
          icon: Bot,
          title: 'Digital Labor with Agentforce',
          description:
            'Routine order steps — export screening, SAP entry validation, logistics notifications — are handled by AI agents, freeing teams for exception management.',
        },
        {
          icon: FileX,
          title: 'End the Spreadsheet Era',
          description:
            'The SharePoint Traveler is retired. Every order has a live record with complete history, every handoff is tracked, and no step requires manual data re-entry.',
        },
      ]}
      capabilities={[
        {
          name: 'Order Management',
          description:
            'End-to-end order lifecycle from creation through fulfillment with automated step sequencing and exception handling.',
        },
        {
          name: 'Work Order Management',
          description:
            'Structured task assignment and tracking for every operational step in the order fulfillment chain.',
        },
        {
          name: 'Field Service Mobility',
          description:
            'Mobile-enabled logistics and delivery confirmation replacing paper-based acknowledgment processes.',
        },
        {
          name: 'Enterprise Platform Connectors',
          description:
            'Pre-built integrations connecting Salesforce order workflows with SAP, logistics providers, and vendor systems.',
        },
        {
          name: 'Agentforce in Slack',
          description:
            'AI-assisted order management with natural language queries and automated status updates in team channels.',
        },
      ]}
      agentPrompts={[
        { agent: 'hav', label: '"Show me all work orders currently in progress."', prompt: 'Show me all work orders currently in progress.' },
        { agent: 'trade', label: '"Screen a shipment of Calibre software to India."', prompt: 'Screen a shipment of Calibre software to India.' },
      ]}
    />
  );
}
