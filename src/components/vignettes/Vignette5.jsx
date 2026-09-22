import React from 'react';
import { Layers, Database, MessageSquare, Bot, FileX } from 'lucide-react';
import VignetteTemplate from './VignetteTemplate';

export default function Vignette5() {
  return (
    <VignetteTemplate
      number={5}
      title="The Platform That Connects It All"
      subtitle="How a unified data model replaces siloed systems and spreadsheet intermediaries with one connected view for every stakeholder."
      icon={Layers}
      iconColor="#009999"
      challenge={[
        "A sales rep, a finance controller, a logistics coordinator, an export compliance officer, and a customer success manager each work from a different system. The sales team uses CRM. Finance uses SAP and Excel. Logistics uses email and the Traveler. Compliance checks a separate database. Customer success pieces together information from all of the above.",
        "Every cross-functional decision requires a meeting — not to decide, but to agree on the facts. \"What's the actual status of this order?\" requires consulting three systems. \"What's our margin on this customer?\" requires assembling data from five sources. The business pays a hidden tax in time, accuracy, and opportunity cost.",
        "This coordination overhead worked when the business was smaller. As EDA's emulation-as-a-service portfolio grows and complexity increases, the manual effort doesn't scale. Adding people doesn't solve a systems problem. The constraint isn't talent — it's the architecture.",
      ]}
      outcomes={[
        { metric: 'Days \u2192 Minutes', label: 'Cross-functional decision assembly' },
        { metric: 'Zero', label: 'Duplicate data entry across systems' },
        { metric: 'Scale Ready', label: 'Grow without growing manual effort' },
      ]}
      whySalesforce={[
        {
          icon: Database,
          title: 'One System for the Sales Process',
          description:
            "The sales rep's opportunity feeds the capacity planner's view. The order workflow feeds the finance dashboard. The asset lifecycle feeds service operations. One data model, every stakeholder connected.",
        },
        {
          icon: MessageSquare,
          title: 'Collaborate in Slack',
          description:
            'Cross-functional collaboration happens in context — deal rooms, incident channels, and finance alerts all flow through Slack with full record context.',
        },
        {
          icon: Bot,
          title: 'Digital Labor with Agentforce',
          description:
            'AI agents bridge the gaps between functions — automatically routing information, triggering dependent processes, and surfacing exceptions across teams.',
        },
        {
          icon: FileX,
          title: 'End the Spreadsheet Era',
          description:
            "When every system feeds the same platform, there's no need for spreadsheet intermediaries. The reconciliation meeting becomes obsolete because everyone already sees the same truth.",
        },
      ]}
      capabilities={[
        {
          name: 'Unified Customer Profile',
          description:
            'A single, authoritative customer record spanning sales, service, finance, and operations.',
        },
        {
          name: 'Enterprise Integration',
          description:
            'Bi-directional data flows between Salesforce, SAP, and operational systems — eliminating manual re-entry.',
        },
        {
          name: 'Data Harmonization',
          description:
            'Automated resolution of conflicting data across source systems into a trusted, unified view.',
        },
        {
          name: 'Account Management',
          description:
            'Complete customer lifecycle from first contact through revenue recognition in one record.',
        },
        {
          name: 'Opportunity Management',
          description:
            'Pipeline visibility that directly informs capacity planning, financial forecasting, and resource allocation.',
        },
        {
          name: 'Embedded BI & Dashboards',
          description:
            'Role-specific views of shared data — every stakeholder sees what they need without building separate reports.',
        },
      ]}
    />
  );
}
