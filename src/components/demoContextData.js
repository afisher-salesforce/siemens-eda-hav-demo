/**
 * Demo Context Panel — page-specific persona, pain point, outcome, and handoff data.
 * Drawn from Siemens EDA customer discovery: Connected Customer Vision, Capability Assessment,
 * and the Sep 22 Markdown Spec.
 */

const PERSONAS = {
  ken: { initials: 'KS', name: 'Ken Snyder', role: 'Operations Planner', color: '#009999' },
  shari: { initials: 'SM', name: 'Shari Massihpour', role: 'Controller, HAV', color: '#f59e0b' },
  russell: { initials: 'RF', name: 'Russell Forsyth', role: 'Project Manager, Orders', color: '#6366f1' },
  miriam: { initials: 'MB', name: 'Miriam Borrelli', role: 'Head of Finance', color: '#ec4899' },
  compliance: { initials: 'EC', name: 'Export Compliance', role: 'Trade Controls', color: '#ef4444' },
  technician: { initials: 'FS', name: 'Field Service', role: 'Colo Technician', color: '#3b82f6' },
};

const CONTEXT = {
  dashboard: {
    personas: [PERSONAS.ken, PERSONAS.russell, PERSONAS.shari],
    painQuote: 'Five systems, five spreadsheets, one truth — if you can find it.',
    painPoints: [
      'Disconnected views across sales, operations, and finance',
      'No single pane of glass for cross-functional KPIs',
      'Exception handling buried in email threads and Slack DMs',
    ],
    outcomes: [
      'Unified command center with real-time KPIs from live Salesforce data',
      'Exceptions and escalations surfaced automatically, not manually reported',
      'Every stakeholder sees the same truth — no more reconciliation debates',
    ],
    handoffs: 'All Functions → Dashboard → Drill-Down Views',
  },

  assets: {
    personas: [PERSONAS.ken],
    painQuote: 'SAP knows it\'s "at the colo" — not which rack, not which blade.',
    painPoints: [
      'Monster spreadsheet tracks allocations; SAP lacks asset granularity',
      'Physical inventory takes ~2 days of barcode scanning per colo',
      'No real-time view of busy vs. free capacity by location',
    ],
    outcomes: [
      'Every emulator is a managed asset: serial, allocation, contract end, cost basis',
      'Real-time capacity visibility — busy/free/when-free — replaces weekly spreadsheet',
      'Automated asset hierarchy matching: Tower → Module → Blade → Card',
    ],
    handoffs: 'Asset Registry → Operations → Field Service → SAP',
  },

  telemetry: {
    personas: [PERSONAS.ken],
    painQuote: 'We learn about blade failures when IT opens a ticket — days later.',
    painPoints: [
      'No real-time monitoring or alerting — reactive failure detection only',
      'Manual work order creation after failures are discovered',
      'No linkage between telemetry signals and automated remediation',
    ],
    outcomes: [
      'Real-time telemetry-triggered work orders replace manual detection',
      'Predictive alerting surfaces problems before they become outages',
      'Slack incident swarming for rapid cross-team response',
    ],
    handoffs: 'Telemetry Signals → Work Orders → Field Service → Slack Swarming',
  },

  capacity: {
    personas: [PERSONAS.russell, PERSONAS.ken],
    painQuote: 'The monster spreadsheet that only I can update — and it\'s already stale.',
    painPoints: [
      'Capacity tracked in manual spreadsheet, version-controlled by heroics',
      'No connection between opportunity pipeline and capacity planning',
      'Can\'t forecast facility expansion decisions months in advance',
    ],
    outcomes: [
      'Live capacity dashboard replaces weekly spreadsheet exercise',
      'Opportunity pipeline feeds demand planning — system knows if hardware exists to fulfill deals',
      'Demand signals inform facility expansion decisions months earlier',
    ],
    handoffs: 'Sales Pipeline → Capacity Planning → Facility Expansion → Operations',
  },

  orders: {
    personas: [PERSONAS.russell],
    painQuote: 'The traveler traveled by email — and got lost at step three.',
    painPoints: [
      'SharePoint travelers: created, emailed, updated, forwarded — data re-entered at every step',
      'No single source of truth for order status; email chains obscure handoffs',
      'One missed email, one wrong serial number = deal slips to next quarter',
    ],
    outcomes: [
      'Automated order workflow replaces manual travelers — structured tasks with owners and deadlines',
      'Real-time status visibility for all stakeholders: sales, ops, logistics, finance, legal',
      'Loan-to-sale conversions close in minutes, not hours of coordination',
    ],
    handoffs: 'Sales → Compliance → Operations → Logistics → Finance → Customer',
  },

  workorders: {
    personas: [PERSONAS.ken],
    painQuote: 'Arena tracks RMAs, SAP tracks costs, email tracks everything else — nothing talks.',
    painPoints: [
      'Repair/RMA workflow in separate tool (Arena), disconnected from asset and financial systems',
      'No closed-loop vendor cost write-back — margin impact invisible until quarter-end',
      'Manual coordination between operations, vendors, and finance for every repair',
    ],
    outcomes: [
      'Unified field service with automated asset matching and dispatch',
      'Closed-loop vendor RMA with real-time cost write-back to margin dashboard',
      'Mobile app for colo technicians: pick/swap operations with barcode scanning',
    ],
    handoffs: 'Operations → Field Service → Vendor (RMA) → Finance (Cost Write-back)',
  },

  financials: {
    personas: [PERSONAS.shari, PERSONAS.miriam],
    painQuote: 'I spend two days every month matching BOMs in Excel — and it\'s already out of date.',
    painPoints: [
      'Monthly COGS reconciliation: pull SAP, match multi-level BOMs, correct anomalies — in Excel',
      'Fragmented cost data: rent, power, depreciation, cross-charges in separate spreadsheets',
      'Audit preparation takes days of manual assembly; data always slightly stale',
    ],
    outcomes: [
      'Live revenue & COGS dashboard with automated data transformation rules',
      'Automated multi-level BOM matching to sellable part numbers (future state — illustrative, depends on Lighthouse reconciling to SAP)',
      'Pre-built, timestamped audit-ready report packages generated automatically',
    ],
    handoffs: 'CRM Forecast → SAP Actuals (via MuleSoft) → Reconciliation → Auditors',
  },

  cogs: {
    personas: [PERSONAS.shari],
    painQuote: 'Pull SAP, match BOMs, correct regional anomalies — every month, rinse and repeat.',
    painPoints: [
      'Multi-level BOM matching to sellable part numbers done entirely in Excel',
      'Regional quantity anomalies require manual correction every cycle',
      'Revenue vs. COGS always slightly out of sync due to timing gaps',
    ],
    outcomes: [
      'Automated BOM matching rules eliminate manual Excel manipulation (future state — illustrative, depends on a BOM-to-SAP data model not yet in place)',
      'Real-time margin visibility with CRM forecast + SAP actuals in one view',
      'Defensible audit trail: every data source tagged with origin and timestamp',
    ],
    handoffs: 'CRM Forecast + SAP Actuals → Automated Matching → Margin Dashboard → Audit',
  },

  loaners: {
    personas: [PERSONAS.russell, { initials: 'SC', name: 'Sales Coordinator', role: 'Order Processing', color: '#10b981' }],
    painQuote: 'Every loan-to-sale conversion is a quarter-end fire drill.',
    painPoints: [
      'Hours of coordination per conversion: chasing serial numbers, compliance, logistics',
      'Manual serial number validation via email threads',
      'Risk of revenue slipping to next quarter from a single missed handoff',
    ],
    outcomes: [
      'Loan-to-sale conversions in minutes — automated serial validation, compliance, logistics',
      'Quarter-end fire drills become routine, system-driven transactions',
      '100% automated audit trail coverage on every conversion',
    ],
    handoffs: 'Sales → Serial Validation → Export Compliance → Logistics → Finance → Customer',
  },

  compliance: {
    personas: [PERSONAS.compliance],
    painQuote: 'One missed screening, one blocked shipment — and the audit trail is an email thread.',
    painPoints: [
      'Manual export compliance checks for dual-use EDA software (EAR/ECCN)',
      'No automated screening against embargo countries or restricted parties',
      'Tariff disclosure required for cross-border quotes but entirely manual',
    ],
    outcomes: [
      'Automated compliance screening on every quote — embargo, restricted party, ECCN, tariff',
      'Defensible audit trail: Compliance_Record on every assessed quote',
      'Hard stops for embargoed destinations; zero non-compliant quotes delivered',
    ],
    handoffs: 'Quote → Automated Screening → Escalation (if flagged) → Approval → Release',
  },

  manufacturer: {
    personas: [PERSONAS.ken],
    painQuote: 'Vendor performance is a quarterly Excel exercise — we find problems three months late.',
    painPoints: [
      'Contract manufacturer performance tracked in disconnected spreadsheets',
      'No visibility into vendor repair turnaround or cost patterns until quarter-end',
      'RMA process spans Arena, SAP, and email with no unified timeline',
    ],
    outcomes: [
      'Unified vendor portal with real-time performance metrics and cost tracking',
      'Closed-loop RMA: from failure detection to vendor repair to cost write-back',
      'Vendor SLA monitoring with automated escalation',
    ],
    handoffs: 'Work Order → Vendor Dispatch → Repair/RMA → Cost Write-back → Finance',
  },

  spares: {
    personas: [PERSONAS.ken, PERSONAS.technician],
    painQuote: 'Walking colo floors for two days to find the right board — that\'s our inventory system.',
    painPoints: [
      'No location-aware spares tracking — technicians walk floors to find parts',
      'Physical inventory takes ~2 days of manual barcode scanning per facility',
      'Spare parts disconnected from asset hierarchy and financial systems',
    ],
    outcomes: [
      'Location-aware spares inventory with rack-level positioning',
      'Mobile pick/swap operations with Field Service app',
      'Real-time SAP sync on every inventory movement',
    ],
    handoffs: 'Spares Inventory → Field Service Mobile → Asset Registry → SAP Sync',
  },

  failures: {
    personas: [PERSONAS.ken, PERSONAS.technician],
    painQuote: 'We only see the pattern after the third blade fails — by then it\'s a customer escalation.',
    painPoints: [
      'No failure trend analysis — each incident treated as isolated event',
      'Root cause identification delayed by disconnected tracking systems',
      'Customer impact not visible until escalation occurs',
    ],
    outcomes: [
      'Failure timeline visualization reveals patterns across assets and locations',
      'Trend analysis enables proactive replacement before customer impact',
      'Linked view: failure → work order → vendor RMA → resolution',
    ],
    handoffs: 'Failure Detection → Trend Analysis → Proactive Work Order → Vendor RMA',
  },
};

export default CONTEXT;
