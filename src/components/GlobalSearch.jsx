import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Server,
  Wrench,
  ShoppingCart,
  X,
  Loader2,
  Command,
} from 'lucide-react';
import { searchAll } from '../api/salesforce';

function StatusBadge({ status }) {
  const styles = {
    Active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    Running: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    Installed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    New: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'In Progress': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    Open: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    Closed: 'bg-gray-500/15 text-th-muted border-gray-500/30',
    Draft: 'bg-gray-500/15 text-th-muted border-gray-500/30',
    High: 'bg-red-500/15 text-red-400 border-red-500/30',
    Critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  const cls = styles[status] || 'bg-gray-500/15 text-th-muted border-gray-500/30';
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${cls}`}>
      {status}
    </span>
  );
}

function ResultItem({ item, onSelect, isHighlighted }) {
  const typeConfig = {
    asset: { icon: Server, color: 'text-siemens-accent', path: '/assets' },
    workorder: { icon: Wrench, color: 'text-amber-400', path: '/workorders' },
    order: { icon: ShoppingCart, color: 'text-indigo-400', path: '/orders' },
  };
  const config = typeConfig[item.type] || typeConfig.asset;
  const Icon = config.icon;

  const title =
    item.type === 'asset'
      ? item.name
      : item.type === 'workorder'
      ? item.workOrderNumber
      : item.orderNumber;

  const subtitle =
    item.type === 'asset'
      ? [item.product, item.customer, item.serialNumber].filter(Boolean).join(' · ')
      : item.type === 'workorder'
      ? [item.subject, item.customer].filter(Boolean).join(' · ')
      : [item.customer].filter(Boolean).join(' · ');

  return (
    <button
      onClick={() => onSelect(item)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        isHighlighted
          ? 'bg-siemens-teal/10 text-th-primary'
          : 'text-th-secondary hover:bg-surface-card-hover'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isHighlighted ? 'bg-siemens-teal/20' : 'bg-surface-card-hover'
        }`}
      >
        <Icon size={16} className={config.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{title || '--'}</div>
        {subtitle && (
          <div className="text-xs text-th-muted truncate mt-0.5">{subtitle}</div>
        )}
      </div>
      {item.status && <StatusBadge status={item.status} />}
    </button>
  );
}

function ResultGroup({ title, icon: Icon, items, onSelect, highlightedIndex, startIndex }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2 border-b border-surface-border">
        <Icon size={12} className="text-th-muted" />
        <span className="text-[10px] font-semibold text-th-muted uppercase tracking-wider">
          {title}
        </span>
        <span className="text-[10px] text-th-faint">{items.length}</span>
      </div>
      <div>
        {items.map((item, i) => (
          <ResultItem
            key={item.id || i}
            item={item}
            onSelect={onSelect}
            isHighlighted={highlightedIndex === startIndex + i}
          />
        ))}
      </div>
    </div>
  );
}

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  // Flatten all results into a single ordered array for keyboard navigation
  const allItems = useMemo(() => {
    if (!results) return [];
    return [
      ...(results.assets || []),
      ...(results.workOrders || []),
      ...(results.orders || []),
    ];
  }, [results]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(null);
      setHighlightedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchAll(query);
        setResults(data);
        setHighlightedIndex(0);
      } catch (err) {
        console.error('Search failed:', err);
        setResults({ assets: [], workOrders: [], orders: [], totalResults: 0 });
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = useCallback(
    (item) => {
      const routes = {
        asset: `/assets/${item.id}`,
        workorder: `/workorders/${item.id}`,
        order: `/orders/${item.id}`,
      };
      navigate(routes[item.type] || '/');
      onClose();
    },
    [navigate, onClose]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, allItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && allItems[highlightedIndex]) {
        e.preventDefault();
        handleSelect(allItems[highlightedIndex]);
      }
    },
    [allItems, highlightedIndex, handleSelect, onClose]
  );

  if (!open) return null;

  const assetCount = results?.assets?.length || 0;
  const woCount = results?.workOrders?.length || 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Search Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
        <div
          className="w-full max-w-xl bg-surface-bg border border-surface-border rounded-xl shadow-2xl shadow-black/50 pointer-events-auto overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 h-14 border-b border-surface-border">
            {loading ? (
              <Loader2 size={18} className="text-siemens-accent animate-spin shrink-0" />
            ) : (
              <Search size={18} className="text-th-muted shrink-0" />
            )}
            <input
              ref={inputRef}
              type="text"
              placeholder="Search assets, work orders, orders..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-th-secondary placeholder:text-th-faint outline-none"
              autoComplete="off"
              spellCheck="false"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <kbd className="px-1.5 py-0.5 rounded bg-surface-card-hover border border-surface-border text-[10px] text-th-muted font-mono">
                esc
              </kbd>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto">
            {results && (results.totalResults || 0) > 0 ? (
              <div className="divide-y divide-surface-border">
                <ResultGroup
                  title="Assets"
                  icon={Server}
                  items={results.assets}
                  onSelect={handleSelect}
                  highlightedIndex={highlightedIndex}
                  startIndex={0}
                />
                <ResultGroup
                  title="Work Orders"
                  icon={Wrench}
                  items={results.workOrders}
                  onSelect={handleSelect}
                  highlightedIndex={highlightedIndex}
                  startIndex={assetCount}
                />
                <ResultGroup
                  title="Orders"
                  icon={ShoppingCart}
                  items={results.orders}
                  onSelect={handleSelect}
                  highlightedIndex={highlightedIndex}
                  startIndex={assetCount + woCount}
                />
              </div>
            ) : results && query.length >= 2 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search size={24} className="text-th-faint mb-3" />
                <p className="text-sm text-th-muted">No results for &ldquo;{query}&rdquo;</p>
                <p className="text-xs text-th-faint mt-1">
                  Try searching by asset name, serial number, or customer
                </p>
              </div>
            ) : !loading && query.length < 2 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-th-faint">
                  Type at least 2 characters to search
                </p>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-surface-border bg-white/[0.02]">
            <div className="flex items-center gap-3 text-[10px] text-th-faint">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-surface-card-hover border border-surface-border font-mono">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-surface-card-hover border border-surface-border font-mono">↵</kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-surface-card-hover border border-surface-border font-mono">esc</kbd>
                close
              </span>
            </div>
            {results && (
              <span className="text-[10px] text-th-faint">
                {results.totalResults} result{results.totalResults !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
