import React from 'react';
import { HeartHandshake, Database, MessageSquare, Bot, FileX } from 'lucide-react';
import VignetteTemplate from './VignetteTemplate';

export default function Vignette6() {
  return (
    <VignetteTemplate
      number={6}
      title="The Renewal That Nobody Saw Coming"
      subtitle="How a connected account 360 turns renewal risk and idle-capacity upsell into proactive moves the account team makes months ahead — instead of surprises the customer discovers first."
      icon={HeartHandshake}
      iconColor="#0ea5e9"
      challenge={[
        "Emulation-as-a-Service is a relationship business. The revenue isn't the sale — it's the renewal, the expansion, and the multi-year commitment. Yet the signals that protect that revenue are scattered. Contract dates live in one system, utilization in the capacity spreadsheet, support history in cases, and margin in finance's month-end reconciliation. No one owns the whole picture of an account.",
        "So the Pinnacle Chip Design EaaS agreement drifts toward its expiration date, and the account team learns it's at risk when Pinnacle mentions they're evaluating alternatives — not months earlier when a proactive conversation could have secured the renewal and shaped an expansion.",
        "The mirror image hurts just as much. Accounts running well below the capacity they're paying for are prime expansion candidates — or churn risks if they conclude they're over-provisioned. But under-utilization only shows up if someone manually cross-references usage against contract terms, account by account. The expansion that was sitting in plain sight goes unsold; the churn risk goes unseen until it's a lost deal.",
        "Every account review is a fire drill of pulling reports from four systems into a slide the day before the meeting. The account team spends its time assembling the picture instead of acting on it.",
      ]}
      outcomes={[
        { metric: 'Months Earlier', label: 'Renewal risk surfaced before the customer raises it' },
        { metric: 'Proactive', label: 'Expansion signals from idle capacity, not manual cross-referencing' },
        { metric: 'One View', label: 'Usage, contract, support, and margin per account' },
      ]}
      whySalesforce={[
        {
          icon: Database,
          title: 'One System for the Sales Process',
          description:
            'Contracts, assets, utilization, cases, and margin roll up to a single account record. The renewal date, the capacity a customer actually uses, and the profitability of the relationship live in one place — the account team acts on one picture, not four exports.',
        },
        {
          icon: MessageSquare,
          title: 'Collaborate in Slack',
          description:
            'When an account crosses a renewal-risk or expansion-opportunity threshold, the account executive, ops lead, and finance partner are pulled into a Slack channel with the context attached — the save happens as a conversation, not a quarterly report.',
        },
        {
          icon: Bot,
          title: 'Digital Labor with Agentforce',
          description:
            'An AI agent watches every account continuously — flagging renewals approaching expiration, accounts running below contracted capacity, and margin drift — and drafts the account team’s next move before anyone opens a spreadsheet.',
        },
        {
          icon: FileX,
          title: 'End the Spreadsheet Era',
          description:
            'The pre-meeting scramble to assemble an account picture from four systems is gone. The account 360 is always current, so the review starts from insight instead of from data assembly.',
        },
      ]}
      capabilities={[
        {
          name: 'Unified Customer Profile',
          description:
            'One account view spanning contracts, deployed and spare assets, utilization, support cases, and margin — the full EaaS relationship for NVIDIA, Samsung, Apex, Pinnacle, and every account in one record.',
        },
        {
          name: 'Revenue Intelligence',
          description:
            'Renewal and expansion forecasting that connects contract expiration dates to actual usage and profitability, so recurring-revenue risk and upside are quantified per account, not estimated at quarter close.',
        },
        {
          name: 'Proactive Insights',
          description:
            'Agentforce continuously scores accounts for renewal risk and idle-capacity-to-upsell, surfacing the Pinnacle-style expiring agreement and the under-utilized fleet as actions on a dashboard rather than discoveries in a hallway.',
        },
        {
          name: 'Account & Opportunity Management',
          description:
            'Renewal and expansion opportunities generated from the same signals that raised the flag, with the account team’s next steps, owners, and close dates tracked against the relationship — not a disconnected note.',
        },
        {
          name: 'Slack-First Account Swarming',
          description:
            'Cross-functional saves and expansions run in real-time Slack channels — AE, operations, and finance on the same thread with the account context attached.',
        },
      ]}
      agentPrompts={[
        { agent: 'hav', label: '"List all contract renewals expiring in the next 30 days."', prompt: 'List all contract renewals expiring in the next 30 days.' },
        { agent: 'hav', label: '"Which customers have the lowest utilization on their installed fleet?"', prompt: 'Which customers have the lowest utilization on their installed fleet?' },
      ]}
    />
  );
}
