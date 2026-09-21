import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  BarChart3,
  Activity,
  DollarSign,
  Wrench,
  ShoppingCart,
  Bot,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/assets', icon: Server, label: 'Asset Fleet' },
  { to: '/capacity', icon: BarChart3, label: 'Capacity' },
  { to: '/telemetry', icon: Activity, label: 'Telemetry' },
  { to: '/financials', icon: DollarSign, label: 'Financials' },
  { to: '/workorders', icon: Wrench, label: 'Work Orders' },
  { to: '/orders', icon: ShoppingCart, label: 'Orders' },
];

export default function Sidebar({ collapsed, onToggle, onOpenChat }) {
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
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center h-10 mx-2 px-3 rounded-md text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-siemens-teal/15 text-siemens-accent border-l-2 border-siemens-teal'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span className="ml-3 whitespace-nowrap">{label}</span>}
          </NavLink>
        ))}
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
