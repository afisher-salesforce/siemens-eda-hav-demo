import { DollarSign, Database, MessageSquare, Bot, FileX } from 'lucide-react';
import VignetteTemplate from './VignetteTemplate';

export default function Vignette3() {
  return (
    <VignetteTemplate
      number={3}
      title="The Spreadsheet That Owns the Quarter Close"
      subtitle="How unified financial intelligence replaces manual COGS reconciliation and gives finance a live, trusted revenue picture."
      icon={DollarSign}
      iconColor="#f59e0b"
      challenge={[
        "Every month, the finance team runs a manual process to reconcile revenue and cost of goods sold. They pull SAP reports, match multi-level bills of materials to sellable part numbers, correct regional quantity anomalies, and assemble the result in Excel. Weekly reporting. Monthly close. Quarter-end packages. Audit preparation. Each cycle takes hours and produces data that's already stale.",
        "A single emulation system ships as dozens of subcomponents with different part numbers in different regions. Matching \"what shipped\" to \"what was sold\" requires deep institutional knowledge. When that knowledge lives in one person's head and their spreadsheet, the business has a single point of failure.",
        "Auditors require documented COGS reconciliation every quarter. The manual assembly process creates compounding compliance risk — each quarter's documentation is a fresh exercise built from scratch, not an automated record."
      ]}
      outcomes={[
        { metric: "Days → Click", label: "Audit preparation time" },
        { metric: "Live", label: "Revenue forecast vs. actuals — single source of truth across all views" },
        { metric: "Future State", label: "Automated BOM-to-part-number matching (illustrative — depends on Lighthouse reconciling to SAP, not yet in place)" }
      ]}
      whySalesforce={[
        {
          icon: Database,
          title: "One System for the Sales Process",
          description: "Revenue, COGS, and margin are live metrics on a unified dashboard — anchored to a single authoritative revenue source so totals match across every view. No more mismatched numbers between finance and operations reports."
        },
        {
          icon: MessageSquare,
          title: "Collaborate in Slack",
          description: "Finance anomalies trigger Slack alerts to the controller and operations team, enabling real-time resolution instead of discovery during month-end close."
        },
        {
          icon: Bot,
          title: "Digital Labor with Agentforce",
          description: "In the future state — once BOM data reconciles to SAP — an AI agent monitors BOM matching accuracy and flags reconciliation discrepancies automatically, turning the monthly assembly into a continuous, auditable process."
        },
        {
          icon: FileX,
          title: "End the Spreadsheet Era",
          description: "The 3-4 Excel workbooks combining CRM exports and SAP data are replaced by a single financial intelligence dashboard with automated data transformation."
        }
      ]}
      capabilities={[
        { name: "Embedded BI & Dashboards", description: "Live financial dashboards replacing manual Excel reporting with automated actuals-vs-plan visualization. Revenue figures are anchored to one source of truth — Financials and COGS reconciliation always agree." },
        { name: "Revenue Intelligence", description: "AI-powered revenue forecasting combining pipeline data with historical booking patterns." },
        { name: "Enterprise Integration", description: "Bi-directional SAP synchronization ensuring financial data flows automatically between transaction and intelligence systems." },
        { name: "Data Harmonization", description: "Future-state automated transformation rules matching multi-level BOMs to sellable part numbers across regions — illustrative, dependent on a BOM-to-SAP data model not yet in place." },
        { name: "Account Management", description: "Complete customer financial history — contracts, orders, revenue, and margin — in a single account record." }
      ]}
      agentPrompts={[
        { agent: 'hav', label: '"Give me a summary of revenue by product line."', prompt: 'Give me a summary of revenue by product line.' },
      ]}
    />
  );
}
