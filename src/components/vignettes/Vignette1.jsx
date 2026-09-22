import { ShoppingCart, Database, MessageSquare, Bot, FileX } from 'lucide-react';
import VignetteTemplate from './VignetteTemplate';

export default function Vignette1() {
  return (
    <VignetteTemplate
      number={1}
      title="The Order That Almost Didn't Close"
      subtitle="How automated loan-to-sale conversion replaces quarter-end scrambles with predictable, system-driven deal closure."
      icon={ShoppingCart}
      iconColor="#10b981"
      challenge={[
        "Last week of the quarter. A loan-to-sale conversion for a major semiconductor customer is in motion. The sales coordinator is chasing serial number confirmations across email threads, updating a SharePoint traveler, waiting on export compliance approval, and manually entering data into SAP — simultaneously, under time pressure.",
        "The risk: One wrong serial number, one missed email, one missed export ticket, and the deal doesn't book in time. The revenue slips to next quarter. The customer relationship suffers. The sales team scrambles.",
        "This is not an edge case — it is the standard operating procedure. Every loan-to-sale conversion follows this manual coordination pattern, with the same risks multiplied across every deal in the pipeline."
      ]}
      outcomes={[
        { metric: "Hours → Minutes", label: "Coordination time per conversion" },
        { metric: "Zero", label: "Serial number mismatches" },
        { metric: "100%", label: "Automated audit trail coverage" }
      ]}
      whySalesforce={[
        {
          icon: Database,
          title: "One System for the Sales Process",
          description: "Every quote, approval, serial number, and compliance check lives in a single record — no more chasing across email, SharePoint, and SAP."
        },
        {
          icon: MessageSquare,
          title: "Collaborate in Slack",
          description: "When a deal needs attention, the right people are instantly looped in through Slack channels — replacing the email chains that delay quarter-end closings."
        },
        {
          icon: Bot,
          title: "Digital Labor with Agentforce",
          description: "Compliance checks, serial number validation, and logistics notifications happen automatically — an AI agent handles the coordination that used to require five teams."
        },
        {
          icon: FileX,
          title: "End the Spreadsheet Era",
          description: "SharePoint travelers and Excel trackers are replaced by structured, automated workflows with built-in approvals and real-time status."
        }
      ]}
      capabilities={[
        { name: "Order Orchestration", description: "Automated end-to-end order workflows from quote creation through fulfillment, replacing manual handoffs." },
        { name: "Quote Management", description: "Centralized quote lifecycle with product configuration, pricing, and approval routing." },
        { name: "Contract Lifecycle Management", description: "Manage contract terms, renewals, and conversions with full audit history." },
        { name: "Agentforce Autonomous Agents", description: "AI agents that autonomously execute compliance checks, validate serial numbers, and trigger notifications." },
        { name: "Slack Team Collaboration", description: "Real-time deal rooms connecting sales, operations, compliance, and logistics." },
        { name: "Asset Lifecycle Management", description: "Track every asset from loan deployment through sale conversion with complete serial number lineage." }
      ]}
    />
  );
}
