import React, { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  FileSpreadsheet,
  FileText,
  Shield,
  Package,
  AlertTriangle,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  {
    to: '/assets',
    icon: Server,
    label: 'Asset Fleet',
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
];

export default function Sidebar({ collapsed, onToggle, onOpenChat }) {
  const location = useLocation();
  const [expandedParent, setExpandedParent] = useState(null);

  // Auto-expand if we're on a child route
  const currentParent = navItems.find(
    (item) =>
      item.children &&
      (location.pathname === item.to ||
        item.children.some((c) => location.pathname === c.to))
  );

  const effectiveExpanded = expandedParent || (currentParent ? currentParent.to : null);

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-[#080c14] text-white flex flex-col z-30 transition-all duration-300 border-r border-surface-border ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-surface-border shrink-0">
        <div className="w-8 h-8 rounded bg-siemens-teal flex items-center justify-center font-bold text-sm shrink-0">
          S
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden whitespace-nowrap">
            <div className="text-sm font-bold leading-tight">Siemens EDA</div>
            <div className="text-[10px] text-siemens-accent leading-tight tracking-wide">
              HAV OPERATIONS
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, children }) => {
          const hasChildren = children && children.length > 0;
          const isActive =
            location.pathname === to ||
            (hasChildren && children.some((c) => location.pathname === c.to));
          const isExpanded = !collapsed && effectiveExpanded === to;

          return (
            <div key={to}>
              <div className="flex items-center mx-2">
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
                  {!collapsed && <span className="ml-3 whitespace-nowrap">{label}</span>}
                </NavLink>
                {hasChildren && !collapsed && (
                  <button
                    onClick={() =>
                      setExpandedParent(isExpanded ? null : to)
                    }
                    className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                    />
                  </button>
                )}
              </div>

              {/* Sub-items */}
              {hasChildren && isExpanded && (
                <div className="ml-6 mt-0.5 mb-1 space-y-0.5">
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
              )}
            </div>
          );
        })}
      </nav>

      {/* Agent Chat Button */}
      <div className="px-2 pb-2">
        <button
          onClick={onOpenChat}
          className={`flex items-center w-full h-10 px-3 rounded-md text-sm transition-all duration-150 group ${
            collapsed ? 'justify-center' : ''
          } bg-siemens-teal/10 text-siemens-accent border border-siemens-teal/20
            hover:bg-siemens-teal/20 hover:border-siemens-teal/40`}
        >
          <Sparkles size={18} className="shrink-0 group-hover:animate-pulse" />
          {!collapsed && (
            <span className="ml-3 whitespace-nowrap font-medium">Agent Chat</span>
          )}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-10 border-t border-surface-border text-gray-500 hover:text-gray-300 transition-colors shrink-0"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
