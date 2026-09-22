import { BarChart3, Database, MessageSquare, Bot, FileX } from 'lucide-react';
import VignetteTemplate from './VignetteTemplate';

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
        "Physical inventory counts take two days of barcode scanning per colocation facility. The spreadsheet is already out of date by the time it's complete. Every capacity decision is made on stale data."
      ]}
      outcomes={[
        { metric: "Real-Time", label: "Capacity utilization visibility" },
        { metric: "Months Earlier", label: "Expansion decision lead time" },
        { metric: "Auto-Surfaced", label: "Idle capacity identification" }
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
          description: "The master capacity spreadsheet is replaced by a live dashboard connected to actual asset records, contract dates, and pipeline signals."
        }
      ]}
      capabilities={[
        { name: "Demand Planning", description: "Match pipeline demand signals against physical capacity to forecast gaps and surplus months in advance." },
        { name: "Asset Lifecycle Management", description: "Every emulator tracked with serial number, software version, customer allocation, and contract dates." },
        { name: "Proactive Insights", description: "Automated analysis surfacing capacity trends, utilization patterns, and expansion timing recommendations." },
        { name: "Unified Customer Profile", description: "Customer commitment history, usage patterns, and renewal timelines in a single view." },
        { name: "Predictive AI Scoring", description: "Machine learning models predicting future capacity demand based on pipeline, seasonality, and customer growth." }
      ]}
      agentPrompts={[
        { agent: 'hav', label: '"What is the rack utilization at Santa Clara HSC1?"', prompt: 'What is the rack utilization at Santa Clara HSC1?' },
        { agent: 'hav', label: '"Show me the capacity forecast for the next quarter."', prompt: 'Show me the capacity forecast for the next quarter.' },
      ]}
    />
  );
}
