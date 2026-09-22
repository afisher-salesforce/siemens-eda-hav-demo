import React, { useState, useCallback, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  BarChart3,
  Activity,
  DollarSign,
  Wrench,
  ShoppingCart,
  Sparkles,
  ChevronDown,
  Calendar,
  FileSpreadsheet,
  FileText,
  Shield,
  Package,
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCcw,
  Factory,
  BookOpen,
  Zap,
  Layers,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  {
    to: '/assets',
    icon: Server,
    label: 'Asset Fleet',
    children: [
      { to: '/assets/loaners', icon: RefreshCcw, label: 'Loaners' },
    ],
  },
  {
    to: '/capacity',
    icon: BarChart3,
    label: 'Capacity',
    children: [
      { to: '/capacity/allocations', icon: Calendar, label: 'Allocations' },
    ],
  },
  { to: '/telemetry', icon: Activity, label: 'Telemetry' },
  {
    to: '/financials',
    icon: DollarSign,
    label: 'Financials',
    children: [
      { to: '/financials/cogs', icon: FileSpreadsheet, label: 'COGS Recon' },
    ],
  },
  {
    to: '/workorders',
    icon: Wrench,
    label: 'Work Orders',
    children: [
      { to: '/workorders/manufacturer', icon: Factory, label: 'Manufacturer' },
      { to: '/workorders/failures', icon: AlertTriangle, label: 'Failures' },
      { to: '/workorders/spares', icon: Package, label: 'Spare Parts' },
    ],
  },
  {
    to: '/orders',
    icon: ShoppingCart,
    label: 'Orders',
    children: [
      { to: '/orders/travelers', icon: FileText, label: 'Travelers' },
      { to: '/orders/compliance', icon: Shield, label: 'Compliance' },
    ],
  },
  {
    to: '/vignettes',
    icon: BookOpen,
    label: 'Vignettes',
    children: [
      { to: '/vignettes/order-close', icon: ShoppingCart, label: 'Order Close' },
      { to: '/vignettes/capacity', icon: BarChart3, label: 'Capacity' },
      { to: '/vignettes/finance', icon: DollarSign, label: 'Finance' },
      { to: '/vignettes/traveler', icon: FileText, label: 'Traveler' },
      { to: '/vignettes/platform', icon: Layers, label: 'Platform' },
      { to: '/vignettes/automation', icon: Zap, label: 'Automation' },
    ],
  },
];

function NavTooltip({ label, visible }) {
  return (
    <div
      className={`absolute left-full ml-3 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap z-50
        bg-[#1e293b] text-gray-200 border border-gray-700 shadow-lg shadow-black/40
        pointer-events-none transition-all duration-150
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'}`}
    >
      {label}
      {/* Arrow */}
      <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-[#1e293b] border-l border-b border-gray-700 rotate-45" />
    </div>
  );
}

export default function Sidebar({ collapsed, peeking, onToggle, onOpenChat, onOpenTradeChat, onPeekEnter, onPeekLeave }) {
  const location = useLocation();
  const [expandedParent, setExpandedParent] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);

  // Effective width: show expanded when not collapsed or when peeking
  const isExpanded = !collapsed || peeking;

  // Auto-expand if we're on a child route
  const currentParent = navItems.find(
    (item) =>
      item.children &&
      (location.pathname === item.to ||
        item.children.some((c) => location.pathname === c.to))
  );

  const effectiveExpanded = expandedParent || (currentParent ? currentParent.to : null);

  // Show tooltips only when collapsed AND not peeking
  const showTooltips = collapsed && !peeking;

  return (
    <aside
      onMouseEnter={onPeekEnter}
      onMouseLeave={onPeekLeave}
      className={`fixed top-0 left-0 h-screen bg-[#080c14] text-white flex flex-col z-30 transition-all duration-300 ease-in-out border-r border-surface-border ${
        isExpanded ? 'w-56' : 'w-16'
      } ${peeking ? 'shadow-2xl shadow-black/50' : ''}`}
    >
      {/* Logo + Toggle */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-surface-border shrink-0">
        <div className="flex items-center min-w-0">
          <div className="w-8 h-8 rounded bg-siemens-teal flex items-center justify-center font-bold text-sm shrink-0">
            S
          </div>
          <div
            className={`ml-3 overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0'
            }`}
          >
            <div className="text-sm font-bold leading-tight whitespace-nowrap">Siemens EDA</div>
            <div className="text-[10px] text-siemens-accent leading-tight tracking-wide whitespace-nowrap">
              HAV OPERATIONS
            </div>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={`p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/10 transition-all duration-200 shrink-0 ${
            isExpanded ? '' : 'mx-auto'
          }`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
        >
          {collapsed && !peeking ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ to, icon: Icon, label, children }) => {
          const hasChildren = children && children.length > 0;
          const isActive =
            location.pathname === to ||
            (hasChildren && children.some((c) => location.pathname === c.to));
          const isChildExpanded = isExpanded && effectiveExpanded === to;

          // Calculate max-height for child container animation
          const childMaxHeight = isChildExpanded && hasChildren ? children.length * 36 + 8 : 0;

          return (
            <div key={to} className="relative">
              <div
                className="flex items-center mx-2 relative group"
                onMouseEnter={() => setHoveredItem(to)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive: linkActive }) =>
                    `flex items-center flex-1 h-10 px-3 rounded-md text-sm transition-all duration-150 ${
                      linkActive
                        ? 'bg-siemens-teal/15 text-siemens-accent border-l-2 border-siemens-teal'
                        : isActive
                        ? 'bg-white/[0.03] text-gray-300'
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  <span
                    className={`ml-3 whitespace-nowrap transition-all duration-200 ease-in-out ${
                      isExpanded
                        ? 'opacity-100 max-w-[160px] translate-x-0'
                        : 'opacity-0 max-w-0 -translate-x-1 overflow-hidden'
                    }`}
                  >
                    {label}
                  </span>
                </NavLink>
                {hasChildren && (
                  <button
                    onClick={() =>
                      setExpandedParent(isChildExpanded ? null : to)
                    }
                    className={`p-1 text-gray-500 hover:text-gray-300 transition-all duration-200 ${
                      isExpanded ? 'opacity-100 w-6' : 'opacity-0 w-0 overflow-hidden'
                    }`}
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${isChildExpanded ? 'rotate-0' : '-rotate-90'}`}
                    />
                  </button>
                )}

                {/* Tooltip when collapsed */}
                {showTooltips && (
                  <NavTooltip label={label} visible={hoveredItem === to} />
                )}
              </div>

              {/* Sub-items with slide animation */}
              {hasChildren && (
                <div
                  className="ml-6 overflow-hidden transition-all duration-250 ease-in-out"
                  style={{ maxHeight: childMaxHeight, opacity: isChildExpanded ? 1 : 0 }}
                >
                  <div className="mt-0.5 mb-1 space-y-0.5">
                    {children.map(({ to: childTo, icon: ChildIcon, label: childLabel }) => (
                      <NavLink
                        key={childTo}
                        to={childTo}
                        className={({ isActive: childActive }) =>
                          `flex items-center h-8 px-3 mx-2 rounded-md text-xs transition-all duration-150 ${
                            childActive
                              ? 'bg-siemens-teal/10 text-siemens-accent'
                              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                          }`
                        }
                      >
                        <ChildIcon size={14} className="shrink-0" />
                        <span className="ml-2.5 whitespace-nowrap">{childLabel}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Agent Chat Buttons */}
      <div className="px-2 pb-2 space-y-1.5">
        <button
          onClick={onOpenTradeChat}
          className={`flex items-center w-full h-10 px-3 rounded-md text-sm transition-all duration-150 group relative
            ${isExpanded ? '' : 'justify-center'}
            bg-amber-500/10 text-amber-400 border border-amber-500/20
            hover:bg-amber-500/20 hover:border-amber-500/40`}
          onMouseEnter={() => setHoveredItem('trade')}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <Shield size={18} className="shrink-0 group-hover:animate-pulse" />
          <span
            className={`ml-3 whitespace-nowrap font-medium transition-all duration-200 ease-in-out ${
              isExpanded
                ? 'opacity-100 max-w-[160px]'
                : 'opacity-0 max-w-0 overflow-hidden'
            }`}
          >
            Trade Compliance
          </span>
          {showTooltips && (
            <NavTooltip label="Trade Compliance" visible={hoveredItem === 'trade'} />
          )}
        </button>
        <button
          onClick={onOpenChat}
          className={`flex items-center w-full h-10 px-3 rounded-md text-sm transition-all duration-150 group relative
            ${isExpanded ? '' : 'justify-center'}
            bg-siemens-teal/10 text-siemens-accent border border-siemens-teal/20
            hover:bg-siemens-teal/20 hover:border-siemens-teal/40`}
          onMouseEnter={() => setHoveredItem('agent')}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <Sparkles size={18} className="shrink-0 group-hover:animate-pulse" />
          <span
            className={`ml-3 whitespace-nowrap font-medium transition-all duration-200 ease-in-out ${
              isExpanded
                ? 'opacity-100 max-w-[160px]'
                : 'opacity-0 max-w-0 overflow-hidden'
            }`}
          >
            HAV Agent
          </span>
          {showTooltips && (
            <NavTooltip label="HAV Agent" visible={hoveredItem === 'agent'} />
          )}
        </button>
      </div>
    </aside>
  );
}
