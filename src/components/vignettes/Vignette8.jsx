import React from 'react';
import { Repeat, Database, GitMerge, Receipt, Layers } from 'lucide-react';
import VignetteTemplate from './VignetteTemplate';
import FutureStateTag from '../FutureStateTag';

export default function Vignette8() {
  return (
    <VignetteTemplate
      number={8}
      title="The Loaner That Became a Sale, in One Click"
      subtitle="How a loan-to-sale conversion moves from a quarter-end, multi-team fire drill to a single all-or-nothing transaction — drivable from a Salesforce record page or from this operations app."
      icon={Repeat}
      iconColor="#14b8a6"
      challenge={[
        "A customer has had an emulator on an evaluation loan and is ready to buy it. Converting that loaner to a sale today means reconciling serial numbers across email threads, booking a return and a reissue in SAP by hand, and routing a shared Excel traveler between several teams.",
        "The return is a 'green return' — the hardware never physically moves, the customer keeps the box — but finance still needs it booked for the books to balance. It is easy to miss, and it is exactly the kind of step that gets missed at quarter end.",
        "If one handoff slips, the revenue slips with it — sometimes by a full quarter. And afterwards, nobody can easily trace which sale came from which loan.",
      ]}
      outcomes={[
        { metric: '1 Click', label: 'Loan-to-sale conversion' },
        { metric: 'All-or-Nothing', label: 'No half-converted orders' },
        { metric: 'Loan → Return → Sale', label: 'Permanent order lineage' },
      ]}
      whySalesforce={[
        {
          icon: Database,
          title: 'One Transaction, One Source of Truth',
          description:
            'The conversion creates the Return and Sale orders, re-points the asset, and updates its lease type and loaner status in a single transaction that rolls back completely if any step fails.',
        },
        {
          icon: GitMerge,
          title: 'Lineage You Can Walk',
          description:
            'Every Sale order links back to the Loan order it came from, so finance and compliance can trace Loan → Return → Sale on any converted asset.',
        },
        {
          icon: Receipt,
          title: 'The Integration Hook Already Fires',
          description:
            'Each conversion publishes the two reconciliation events SAP needs — a return and a reissue — so the posting no longer depends on someone remembering it.',
        },
        {
          icon: Layers,
          title: 'Two Surfaces, Same Engine',
          description:
            'The sales coordinator converts from the Order record in Salesforce; operations converts from the Loaners board here. Both call the same service.',
        },
      ]}
      capabilities={[
        {
          name: 'Order Management with Record Types',
          description:
            'Standard Orders with Loan, Return, and Sale record types — no custom order object to maintain.',
        },
        {
          name: 'Guided Conversion Flow',
          description:
            'A Convert to Sale quick action on the Loan order launches a screen flow that calls one invocable Apex service.',
        },
        {
          name: 'Headless Conversion API',
          description:
            'The same service is exposed over REST, which is how the Convert to Sale button in this app runs it.',
        },
        {
          name: 'Order Lineage',
          description:
            'A self-lookup from Sale to the original Loan order, rendered here as the Order Lineage strip on the asset detail page.',
        },
        {
          name: 'SAP Reconciliation Events (stub)',
          description:
            'Platform events publish on every conversion. A live MuleSoft → SAP consumer is the integration step, not part of this demo.',
        },
      ]}
      extraSections={[
        {
          icon: Receipt,
          title: 'What Is Live and What Is Stubbed',
          content: (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <FutureStateTag
                  label="SAP Stub"
                  note="Reconciliation events are published on every conversion, but no live SAP endpoint consumes them yet."
                />
              </div>
              <p className="text-th-secondary" style={{ lineHeight: 1.6 }}>
                The conversion itself is live against the org: real Return and Sale orders, the asset re-pointed,
                and lineage recorded. Try it from the <strong>Loaners</strong> board, then open the converted asset
                to see the Loan → Return → Sale strip.
              </p>
            </div>
          ),
        },
      ]}
      agentPrompts={[
        { agent: 'hav', label: '"What’s the loan-to-sale status for the TSMC Veloce Strato?"', prompt: "What's the loan-to-sale status for the TSMC Veloce Strato?" },
        { agent: 'hav', label: '"Give me a summary of revenue by lease type."', prompt: 'Give me a summary of revenue by lease type.' },
      ]}
    />
  );
}
