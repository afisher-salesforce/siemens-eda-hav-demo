import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  BarChart3,
  DollarSign,
  FileText,
  Layers,
  Zap,
  ArrowUpRight,
} from 'lucide-react';

const vignettes = [
  {
    number: 1,
    path: '/vignettes/order-close',
    title: 'The Order That Almost Didn\'t Close',
    description:
      'Manual loan-to-sale conversion requiring coordination across five teams via email, SharePoint, and SAP. Quarter-end fire drills risk deals slipping.',
    icon: ShoppingCart,
    color: '#10b981',
  },
  {
    number: 2,
    path: '/vignettes/capacity',
    title: 'The Capacity Nobody Could See',
    description:
      'Monster spreadsheet for colo capacity tracking with no connection between the opportunity pipeline and physical hardware availability.',
    icon: BarChart3,
    color: '#6366f1',
  },
  {
    number: 3,
    path: '/vignettes/finance',
    title: 'The Spreadsheet That Owns the Quarter Close',
    description:
      'Monthly manual reconciliation of revenue vs. COGS — pulling SAP reports, matching multi-level BOMs, assembling Excel packages for auditors.',
    icon: DollarSign,
    color: '#f59e0b',
  },
  {
    number: 4,
    path: '/vignettes/traveler',
    title: 'The Traveler That Traveled by Email',
    description:
      'SharePoint Excel traveler emailed between operations, MED, logistics, vendor, and compliance. One missed update breaks the entire order chain.',
    icon: FileText,
    color: '#ef4444',
  },
  {
    number: 5,
    path: '/vignettes/platform',
    title: 'The Platform That Connects It All',
    description:
      'Every stakeholder works from a different system or spreadsheet. Overlapping data, conflicting versions, no shared source of truth.',
    icon: Layers,
    color: '#009999',
  },
  {
    number: 6,
    path: '/vignettes/automation',
    title: 'From Heroic Manual Efforts to Closed-Loop Automation',
    description:
      'A blade fails in a colocation facility. Today the resolution journey spans disconnected systems, manual data entry, and days of coordination.',
    icon: Zap,
    color: '#8b5cf6',
  },
];

export default function VignetteIndex() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="section-card">
        <div className="px-8 py-8">
          <h1 className="text-xl font-bold text-white mb-2">Solution Vignettes</h1>
          <p className="text-sm text-gray-400 leading-relaxed max-w-2xl">
            Six stories illustrating how Siemens EDA's Hardware-Assisted Verification business
            transforms from spreadsheet-driven coordination to connected, intelligent operations
            — all on a platform already within the Siemens Enterprise License Agreement.
          </p>
        </div>
      </div>

      {/* Vignette Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {vignettes.map((v) => (
          <Link
            key={v.number}
            to={v.path}
            className="section-card group hover:border-opacity-40 transition-all cursor-pointer"
            style={{ '--hover-color': v.color }}
          >
            <div className="relative overflow-hidden px-5 py-5">
              <div
                className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20"
                style={{ backgroundColor: v.color }}
              />
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: `${v.color}15`,
                      border: `1px solid ${v.color}30`,
                    }}
                  >
                    <v.icon size={20} style={{ color: v.color }} />
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 group-hover:text-siemens-accent transition-colors">
                    <span className="text-[10px] uppercase tracking-wider">Story {v.number}</span>
                    <ArrowUpRight size={12} />
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-gray-200 mb-2 group-hover:text-white transition-colors">
                  {v.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                  {v.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
