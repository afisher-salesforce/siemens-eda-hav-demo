import React from 'react';
import { CloudCog, Gauge, Boxes, Truck, Database, Bot } from 'lucide-react';
import VignetteTemplate from './VignetteTemplate';
import FutureStateTag from '../FutureStateTag';

export default function Vignette9() {
  return (
    <VignetteTemplate
      number={9}
      title="Emulation-as-a-Service: The Consumption Model and the Ops Lifecycle"
      subtitle="How a capital hardware sale becomes a recurring consumption relationship — and how operations keeps that service billable by placing demand on free capacity, covering failures with spares, and turning repairs around fast."
      icon={CloudCog}
      iconColor="#0891b2"
      challenge={[
        "With Emulation-as-a-Service the customer doesn't buy a box — they consume emulation capacity month over month. The revenue is the renewal and the expansion, not the invoice. Today, what each customer committed to, what they pay, and how much they actually use lives in a spreadsheet exported once a quarter.",
        "Saying yes to new EaaS demand means knowing, quickly, where there is rack and power headroom. That answer is usually tribal knowledge, so new capacity gets placed where someone remembers there is room.",
        "Every idle or down unit is service you can't bill. Spares are counted by hand, and a unit sent out for repair is tracked by emailing the depot to ask where it is.",
      ]}
      outcomes={[
        { metric: 'On the Record', label: 'Rate, committed capacity, utilization' },
        { metric: 'Seconds', label: 'Where new EaaS demand fits' },
        { metric: 'No Depot Calls', label: 'RMA shipping status' },
      ]}
      whySalesforce={[
        {
          icon: Database,
          title: 'The Consumption Model Lives on the Asset',
          description:
            'Lease Type, EaaS monthly rate, start date, committed capacity, and live utilization sit on the same record — high utilization is an expansion conversation, low utilization a churn risk.',
        },
        {
          icon: Gauge,
          title: 'Capacity You Can Say Yes To',
          description:
            'Rack occupancy, power headroom, PUE, and the forecast per facility tell operations where new demand fits and which site to avoid.',
        },
        {
          icon: Boxes,
          title: 'Spares and Repairs as Service Metrics',
          description:
            'Available spare units per site and the shipping state of every RMA are live, so a failure is covered and tracked instead of chased.',
        },
        {
          icon: Bot,
          title: 'Ask the Agent',
          description:
            'The HAV Operations agent answers the EaaS questions directly — free capacity, MRR by lease type, spares below safety stock, RMA shipping status.',
        },
      ]}
      capabilities={[
        {
          name: 'EaaS Consumption Fields',
          description:
            'Monthly rate, start date, and committed capacity on the EaaS asset alongside live utilization.',
        },
        {
          name: 'Capacity Planning',
          description:
            'Per-facility rack, power, and PUE with a forward forecast — see the Capacity Forecast view.',
        },
        {
          name: 'Spare Safety Stock (threshold illustrative)',
          description:
            'Live counts of available spare units per site, flagged against a minimum. The minimum is a fixed value today, not a per-site setting.',
        },
        {
          name: 'Repair Shipping on the Work Order',
          description:
            'Carrier, tracking number, and shipment status on each RMA work order, readable by people and by the agent.',
        },
        {
          name: 'Carrier Integration (stub)',
          description:
            'A shipment event publishes when an RMA is routed. A live FedEx/UPS connection is the roadmap integration step.',
        },
      ]}
      extraSections={[
        {
          icon: Truck,
          title: 'What Is Live and What Is Illustrative',
          content: (
            <div>
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <FutureStateTag label="Illustrative threshold" note="The spare safety-stock minimum is a constant, not a stored per-site configuration." />
                <FutureStateTag label="Carrier stub" note="The shipment event publishes on every RMA; no live carrier API is called." />
              </div>
              <p className="text-th-secondary" style={{ lineHeight: 1.6 }}>
                Live: EaaS as a lease type, the consumption fields on the asset, capacity and forecast, MRR by
                lease type, spare counts, and RMA shipping state. Walk the operations side on the <strong>Daily Capacity</strong> view (Capacity → Daily Capacity):
                capacity by day from colo to blade, the expansion forecast, a live reservation gated by capacity and
                power, and chargeback. Then use the prompts below.
              </p>
            </div>
          ),
        },
      ]}
      agentPrompts={[
        { agent: 'hav', label: '"Where do we have free capacity for a new EaaS customer?"', prompt: 'Where do we have free capacity for a new EaaS customer?' },
        { agent: 'hav', label: '"What’s our revenue by lease type?"', prompt: "What's our revenue by lease type?" },
        { agent: 'hav', label: '"Are we below safety stock on spares anywhere?"', prompt: 'Are we below safety stock on spares anywhere?' },
        { agent: 'hav', label: '"What’s the shipping status of our open RMAs?"', prompt: "What's the shipping status of our open RMAs?" },
        { agent: 'hav', label: '"Can we run a 2-blade, 40 kW job in Hsinchu for 30 days starting next week?"', prompt: 'Can we run a 2-blade, 40 kW verification job in Hsinchu for 30 days starting next week?' },
        { agent: 'hav', label: '"What’s the capacity chargeback for TSMC this month?"', prompt: "What's the capacity chargeback for TSMC this month?" },
      ]}
    />
  );
}
