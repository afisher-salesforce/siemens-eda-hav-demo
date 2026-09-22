import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, RefreshCw, User, Sparkles, Search } from 'lucide-react';
import Sidebar from './Sidebar';
import AgentChat from './AgentChat';
import TradeAgentChat from './TradeAgentChat';
import GlobalSearch from './GlobalSearch';

const pageTitles = {
  '/': 'Operations Command Center',
  '/assets': 'Asset Fleet Management',
  '/assets/loaners': 'Loaner-to-Sale Conversion',
  '/capacity': 'Capacity Planning',
  '/telemetry': 'Real-Time Telemetry',
  '/financials': 'Financial Reconciliation',
  '/workorders': 'Field Service Work Orders',
  '/workorders/manufacturer': 'Contract Manufacturer Portal',
  '/orders': 'Order Orchestration',
  '/vignettes': 'Solution Vignettes',
  '/vignettes/order-close': 'The Order That Almost Didn\'t Close',
  '/vignettes/capacity': 'The Capacity Nobody Could See',
  '/vignettes/finance': 'The Spreadsheet That Owns the Quarter Close',
  '/vignettes/traveler': 'The Traveler That Traveled by Email',
  '/vignettes/platform': 'The Platform That Connects It All',
  '/vignettes/automation': 'From Heroic Manual Efforts to Closed-Loop Automation',
};

export default function Layout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPeeking, setSidebarPeeking] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [tradeChatOpen, setTradeChatOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const peekTimerRef = useRef(null);

  const pageTitle = pageTitles[location.pathname] || 'HAV Operations';

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      // Cmd+B / Ctrl+B — toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
        setSidebarPeeking(false);
      }
      // Cmd+K / Ctrl+K — open global search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Hover-to-peek: debounced enter, immediate leave
  const handlePeekEnter = useCallback(() => {
    if (!sidebarCollapsed) return;
    peekTimerRef.current = setTimeout(() => {
      setSidebarPeeking(true);
    }, 200);
  }, [sidebarCollapsed]);

  const handlePeekLeave = useCallback(() => {
    if (peekTimerRef.current) {
      clearTimeout(peekTimerRef.current);
      peekTimerRef.current = null;
    }
    setSidebarPeeking(false);
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-surface-bg">
      <Sidebar
        collapsed={sidebarCollapsed}
        peeking={sidebarPeeking}
        onToggle={() => {
          setSidebarCollapsed(!sidebarCollapsed);
          setSidebarPeeking(false);
        }}
        onOpenChat={() => { setTradeChatOpen(false); setChatOpen(true); }}
        onOpenTradeChat={() => { setChatOpen(false); setTradeChatOpen(true); }}
        onPeekEnter={handlePeekEnter}
        onPeekLeave={handlePeekLeave}
      />

      {/* Main Content — margin always tracks actual collapsed state, not peek */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-56'
        }`}
      >
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 h-14 bg-[#0d1321]/80 backdrop-blur-xl border-b border-surface-border flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-gray-200 tracking-wide">
              {pageTitle}
            </h1>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-siemens-teal/10 border border-siemens-teal/20">
              <Sparkles size={10} className="text-siemens-accent" />
              <span className="text-[9px] font-bold text-siemens-accent uppercase tracking-[0.15em]">
                AIforce
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-gray-500 hover:text-siemens-accent hover:bg-white/5 transition-colors border border-transparent hover:border-surface-border group"
              title="Search (⌘K)"
            >
              <Search size={14} />
              <span className="text-xs text-gray-600 group-hover:text-gray-400 hidden sm:inline">Search</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-gray-700 text-[10px] text-gray-600 font-mono hidden sm:inline">
                ⌘K
              </kbd>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="p-2 rounded-md text-gray-500 hover:text-siemens-accent hover:bg-white/5 transition-colors"
              title="Refresh data"
            >
              <RefreshCw size={16} />
            </button>
            <button
              className="p-2 rounded-md text-gray-500 hover:text-siemens-accent hover:bg-white/5 transition-colors relative"
              title="Notifications"
            >
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </button>
            <div className="w-px h-6 bg-surface-border mx-1" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-siemens-teal/20 border border-siemens-teal/30 text-siemens-accent flex items-center justify-center text-xs font-semibold">
                <User size={14} />
              </div>
              <span className="text-sm text-gray-400 hidden sm:inline">Admin</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>

      {/* Global Search Overlay */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Agent Chat Panels */}
      <AgentChat open={chatOpen} onClose={() => setChatOpen(false)} />
      <TradeAgentChat open={tradeChatOpen} onClose={() => setTradeChatOpen(false)} />
    </div>
  );
}
