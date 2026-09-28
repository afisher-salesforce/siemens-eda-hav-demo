import { DollarSign, Database, MessageSquare, Bot, FileX, Ruler, Layers, GitMerge } from 'lucide-react';
import VignetteTemplate from './VignetteTemplate';
import FutureStateTag from '../FutureStateTag';

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
        { name: "Data 360 Semantic Layer (future state — illustrative)", description: "Revenue, COGS, and margin defined once as governed metric definitions (Calculated Insights) instead of per-report Excel formulas — so every surface that reads a metric computes the same number the same way. Illustrative: depends on the Data 360 model being stood up." },
        { name: "Account Management", description: "Complete customer financial history — contracts, orders, revenue, and margin — in a single account record." }
      ]}
      extraSections={[
        {
          icon: Ruler,
          title: 'One Definition of Revenue & COGS — the Data 360 Semantic Layer',
          content: (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <FutureStateTag
                  label="Future State"
                  note="Illustrative. Requires the Data 360 semantic model (governed metric definitions / Calculated Insights) to be stood up over the harmonized CRM + SAP data. The single-source-of-truth revenue figure shown on the dashboards today is real; governing the definition centrally is the roadmap layer."
                />
              </div>
              <p className="text-th-secondary" style={{ marginBottom: '1rem', lineHeight: 1.6 }}>
                When finance and operations quote two different revenue numbers, the problem usually
                isn&apos;t stale data — it&apos;s that each team carries its own <em>definition</em> of the metric:
                which bookings count, when revenue is recognized, how COGS rolls up. Today those rules
                live in one analyst&apos;s spreadsheet formulas. <strong>Data 360</strong> moves the definition
                itself into the platform: revenue, COGS, and margin are defined <em>once</em> as governed,
                reusable metrics over the harmonized CRM + SAP data — so the number is standardized before
                anyone charts it.
              </p>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div className="section-card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Ruler size={18} color="#f59e0b" />
                    <strong className="text-th-primary">Standardized metric definitions</strong>
                  </div>
                  <p className="text-th-secondary" style={{ lineHeight: 1.6 }}>
                    Revenue, COGS, and margin become governed metric definitions (Calculated Insights) — the
                    formula, the filters, and the grain live in one place, versioned and owned by finance,
                    not re-derived in a workbook every close. Change the definition once and it changes
                    everywhere.
                  </p>
                </div>
                <div className="section-card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Layers size={18} color="#f59e0b" />
                    <strong className="text-th-primary">Every surface reads the same number</strong>
                  </div>
                  <p className="text-th-secondary" style={{ lineHeight: 1.6 }}>
                    The finance dashboard, the Agentforce agent, a Slack anomaly alert, and the Revenue
                    Intelligence charts all resolve the <em>same</em> definition — so &ldquo;what was our Q3
                    emulation revenue?&rdquo; returns one answer regardless of who asks or where. Finance and
                    operations stop reconciling two different truths.
                  </p>
                </div>
                <div className="section-card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <GitMerge size={18} color="#f59e0b" />
                    <strong className="text-th-primary">Harmonized across sources</strong>
                  </div>
                  <p className="text-th-secondary" style={{ lineHeight: 1.6 }}>
                    The metric spans systems: CRM pipeline and bookings, SAP actuals, and — via Zero Copy —
                    data federated from Snowflake, all mapped to one data model. The definition computes
                    across sources without a copy-and-ETL step, so the standardized number is also a
                    connected one.
                  </p>
                </div>
              </div>
            </div>
          ),
        },
      ]}
      agentPrompts={[
        { agent: 'hav', label: '"Give me a summary of revenue by product line."', prompt: 'Give me a summary of revenue by product line.' },
      ]}
    />
  );
}
