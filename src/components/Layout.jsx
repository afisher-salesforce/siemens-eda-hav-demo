import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Bell, RefreshCw, Sparkles, Search, AlertTriangle, Activity, X } from 'lucide-react';
import Sidebar from './Sidebar';
import AgentChat from './AgentChat';
import TradeAgentChat from './TradeAgentChat';
import GlobalSearch from './GlobalSearch';
import ThemeToggle from './ThemeToggle';
import { getTelemetry } from '../api/salesforce';
import { useSalesforceData } from '../hooks/useSalesforceData';

// Context to let child pages (e.g. vignettes) open an agent chat with a pre-filled prompt
export const AgentChatContext = createContext(null);

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
  '/orders/travelers': 'Order Travelers',
  '/orders/compliance': 'Trade Compliance',
  '/workorders/failures': 'Failure Timeline',
  '/workorders/spares': 'Spare Parts Inventory',
  '/capacity/allocations': 'Allocation Timeline',
  '/capacity/forecast': 'Capacity Forecast',
  '/financials/cogs': 'COGS Reconciliation',
  '/vignettes': 'Solution Vignettes',
  '/vignettes/order-close': 'The Order That Almost Didn\'t Close',
  '/vignettes/capacity': 'The Capacity Nobody Could See',
  '/vignettes/finance': 'The Spreadsheet That Owns the Quarter Close',
  '/vignettes/traveler': 'The Traveler That Traveled by Email',
  '/vignettes/platform': 'The Platform That Connects It All',
  '/vignettes/accounts': 'The Renewal That Nobody Saw Coming',
  '/vignettes/automation': 'From Heroic Manual Efforts to Closed-Loop Automation',
};

export default function Layout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPeeking, setSidebarPeeking] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [tradeChatOpen, setTradeChatOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [agentPrefill, setAgentPrefill] = useState(null); // { agent: 'hav'|'trade', prompt: string }
  const location = useLocation();
  const peekTimerRef = useRef(null);
  const notifRef = useRef(null);

  const pageTitle = pageTitles[location.pathname] || 'HAV Operations';

  // Fetch telemetry alerts for notification bell
  const { data: telemetryAlerts } = useSalesforceData(() => getTelemetry(null, 50));

  const alerts = (telemetryAlerts || [])
    .filter((t) => t.status === 'Error' || t.status === 'Warning')
    .slice(0, 8);

  const alertCount = alerts.length;

  // Close notifications on click outside
  useEffect(() => {
    if (!notificationsOpen) return;
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotificationsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notificationsOpen]);

  // Agent pre-fill handler — opens the right chat with a prompt
  const openAgentWithPrompt = useCallback((agent, prompt) => {
    setAgentPrefill({ agent, prompt });
    if (agent === 'trade') {
      setChatOpen(false);
      setTradeChatOpen(true);
    } else {
      setTradeChatOpen(false);
      setChatOpen(true);
    }
  }, []);

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
        <header className="sticky top-0 z-20 h-14 bg-[var(--table-header-bg)]/80 backdrop-blur-xl border-b border-surface-border flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-th-secondary tracking-wide">
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
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-th-muted hover:text-siemens-accent hover:bg-surface-card-hover transition-colors border border-transparent hover:border-surface-border group"
              title="Search (⌘K)"
            >
              <Search size={14} />
              <span className="text-xs text-th-faint group-hover:text-th-muted hidden sm:inline">Search</span>
              <kbd className="px-1.5 py-0.5 rounded bg-surface-card-hover border border-surface-border text-[10px] text-th-faint font-mono hidden sm:inline">
                ⌘K
              </kbd>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="p-2 rounded-md text-th-faint hover:text-siemens-accent hover:bg-surface-card-hover transition-colors"
              title="Refresh data"
            >
              <RefreshCw size={16} />
            </button>
            <ThemeToggle />
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-md text-th-muted hover:text-siemens-accent hover:bg-surface-card-hover transition-colors relative"
                title="Notifications"
              >
                <Bell size={16} />
                {alertCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[14px] h-[14px] flex items-center justify-center bg-red-500 rounded-full text-[8px] text-white font-bold px-0.5">
                    {alertCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--table-header-bg)] border border-surface-border rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
                    <span className="text-xs font-semibold text-th-secondary uppercase tracking-wider">Fleet Alerts</span>
                    <button onClick={() => setNotificationsOpen(false)} className="p-0.5 text-th-muted hover:text-th-secondary">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {alerts.length > 0 ? (
                      alerts.map((a, i) => (
                        <Link
                          key={i}
                          to="/telemetry"
                          onClick={() => setNotificationsOpen(false)}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--overlay-hover)] transition-colors border-b border-surface-border last:border-b-0"
                        >
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                            a.status === 'Error' ? 'bg-red-500/15 border border-red-500/25' : 'bg-amber-500/15 border border-amber-500/25'
                          }`}>
                            {a.status === 'Error' ? (
                              <AlertTriangle size={12} className="text-red-400" />
                            ) : (
                              <Activity size={12} className="text-amber-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-th-secondary truncate">{a.assetName || 'Unknown Asset'}</div>
                            <div className="text-[10px] text-th-muted mt-0.5">
                              {a.status === 'Error'
                                ? `${a.errors || 0} errors — CPU ${a.cpuPercent || 0}%, Temp ${a.temperature != null ? a.temperature.toFixed(0) : '--'}°C`
                                : `High temp ${a.temperature != null ? a.temperature.toFixed(0) : '--'}°C — CPU ${a.cpuPercent || 0}%`}
                            </div>
                            {a.timestamp && (
                              <div className="text-[9px] text-th-faint mt-0.5 font-mono">{new Date(a.timestamp).toLocaleString()}</div>
                            )}
                          </div>
                          <span className={`badge text-[9px] shrink-0 ${a.status === 'Error' ? 'badge-red' : 'badge-yellow'}`}>{a.status}</span>
                        </Link>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Activity size={20} className="text-th-faint mb-2" />
                        <span className="text-xs text-th-faint">No active alerts</span>
                      </div>
                    )}
                  </div>
                  {alerts.length > 0 && (
                    <Link
                      to="/telemetry"
                      onClick={() => setNotificationsOpen(false)}
                      className="block text-center text-[10px] text-siemens-accent hover:text-th-primary font-medium uppercase tracking-wider py-2.5 border-t border-surface-border hover:bg-[var(--overlay-hover)] transition-colors"
                    >
                      View All Telemetry →
                    </Link>
                  )}
                </div>
              )}
            </div>
            <div className="w-px h-6 bg-surface-border mx-1" />
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full bg-siemens-teal text-white flex items-center justify-center"
                title="Siemens"
              >
                <span className="text-[5px] font-bold tracking-tight leading-none">SIEMENS</span>
              </div>
              <span className="text-sm text-th-muted hidden sm:inline">Admin</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <AgentChatContext.Provider value={openAgentWithPrompt}>
            {children}
          </AgentChatContext.Provider>
        </main>
      </div>

      {/* Global Search Overlay */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Agent Chat Panels */}
      <AgentChat
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        prefill={agentPrefill?.agent === 'hav' ? agentPrefill.prompt : null}
        onPrefillConsumed={() => setAgentPrefill(null)}
      />
      <TradeAgentChat
        open={tradeChatOpen}
        onClose={() => setTradeChatOpen(false)}
        prefill={agentPrefill?.agent === 'trade' ? agentPrefill.prompt : null}
        onPrefillConsumed={() => setAgentPrefill(null)}
      />
    </div>
  );
}
