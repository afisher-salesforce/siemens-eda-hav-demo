import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, ExternalLink, Hash, RefreshCw, AlertCircle } from 'lucide-react';

/**
 * SlackFeed — Reusable component that displays a Slack channel feed
 * and allows posting messages, all within the app.
 *
 * Props:
 *   channelName  — Slack channel name (without #), e.g. "hav-asset-pf-blr1-002"
 *   recordLabel  — Display name for the record, e.g. "PF-BLR1-002"
 *   recordType   — "asset" | "workorder" | "order"
 */

const SLACK_API = '/api/slack';

function timeAgo(ts) {
  const now = Date.now();
  const msgTime = parseFloat(ts) * 1000;
  const diff = now - msgTime;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatSlackText(text) {
  if (!text) return '';
  // Convert basic Slack markup to displayable text
  return text
    .replace(/<@(\w+)>/g, '@user') // user mentions
    .replace(/<#(\w+)\|([^>]+)>/g, '#$2') // channel links
    .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '$2') // named URLs
    .replace(/<(https?:\/\/[^>]+)>/g, '$1') // bare URLs
    .replace(/\*([^*]+)\*/g, '$1') // bold (strip for plain display)
    .replace(/_([^_]+)_/g, '$1') // italic (strip for plain display)
    .replace(/~([^~]+)~/g, '$1'); // strikethrough (strip)
}

function MessageBubble({ message }) {
  const user = message.user || {};
  const initials = (user.displayName || user.name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-start gap-2.5 py-2 group">
      {/* Avatar */}
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.displayName}
          className="w-7 h-7 rounded-md object-cover shrink-0 mt-0.5"
        />
      ) : (
        <div className="w-7 h-7 rounded-md bg-siemens-teal/20 text-siemens-accent flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
          {initials}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-gray-200 leading-none">
            {user.displayName || user.name || 'Unknown'}
          </span>
          <span className="text-[10px] text-gray-600 leading-none">
            {timeAgo(message.ts)}
          </span>
        </div>
        <p className="text-[13px] text-gray-400 mt-0.5 leading-snug break-words">
          {formatSlackText(message.text)}
        </p>

        {/* Thread indicator */}
        {message.replyCount > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <MessageSquare size={10} className="text-siemens-accent" />
            <span className="text-[10px] text-siemens-accent font-medium">
              {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
            </span>
          </div>
        )}

        {/* Reactions */}
        {message.reactions?.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {message.reactions.map((r) => (
              <span
                key={r.name}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-surface-border text-[10px] text-gray-400"
              >
                :{r.name}: <span className="text-gray-500">{r.count}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SlackFeed({ channelName, recordLabel, recordType }) {
  const [channelId, setChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [composing, setComposing] = useState('');
  const [sending, setSending] = useState(false);
  const [workspaceUrl, setWorkspaceUrl] = useState('');
  const feedEndRef = useRef(null);

  // Check Slack config on mount
  useEffect(() => {
    fetch(`${SLACK_API}/config`)
      .then((r) => r.json())
      .then((data) => {
        setConfigured(data.configured);
        setWorkspaceUrl(data.workspaceUrl || '');
      })
      .catch(() => setConfigured(false));
  }, []);

  // Resolve channel name → ID
  const resolveChannel = useCallback(async () => {
    if (!configured || !channelName) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const res = await fetch(`${SLACK_API}/channel/${encodeURIComponent(channelName)}`);
      if (res.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to resolve channel');
      }
      const data = await res.json();
      setChannelId(data.id);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [channelName, configured]);

  useEffect(() => {
    resolveChannel();
  }, [resolveChannel]);

  // Fetch messages once channel is resolved
  const fetchMessages = useCallback(async () => {
    if (!channelId) return;
    try {
      const res = await fetch(`${SLACK_API}/channels/${channelId}/history?limit=15`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Post a message
  const handleSend = async () => {
    if (!composing.trim() || !channelId || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${SLACK_API}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: composing.trim() }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      setComposing('');
      // Refresh messages
      await fetchMessages();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // If Slack is not configured, show a subtle placeholder
  if (!configured) {
    return (
      <div className="section-card">
        <div className="section-card-header">
          <div className="flex items-center gap-2">
            <Hash size={14} className="text-gray-500" />
            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.1em]">
              Slack
            </h2>
          </div>
        </div>
        <div className="section-card-body">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare size={24} className="text-gray-600 mb-2" />
            <p className="text-xs text-gray-600">Slack integration not configured</p>
          </div>
        </div>
      </div>
    );
  }

  const channelDisplayName = `#${channelName}`;
  const slackChannelUrl = channelId
    ? `${workspaceUrl}/archives/${channelId}`
    : null;

  return (
    <div className="section-card">
      <div className="section-card-header">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#611f69]/30 flex items-center justify-center">
            <Hash size={10} className="text-[#e01e5a]" />
          </div>
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
            Slack · {channelDisplayName}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {!loading && !notFound && (
            <button
              onClick={fetchMessages}
              className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={12} />
            </button>
          )}
          {slackChannelUrl && (
            <a
              href={slackChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-siemens-accent transition-colors"
            >
              Open in Slack
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
      <div className="section-card-body p-0">
        {/* Loading state */}
        {loading && (
          <div className="px-4 py-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="skeleton w-7 h-7 rounded-md shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton w-24 h-3" />
                  <div className="skeleton w-full h-3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="flex items-center gap-2 px-4 py-4 text-xs text-amber-400">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Channel not found */}
        {notFound && !loading && (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <Hash size={20} className="text-gray-600 mb-2" />
            <p className="text-xs text-gray-500">
              Channel {channelDisplayName} not found
            </p>
            <p className="text-[10px] text-gray-600 mt-1">
              Create this channel in Slack to enable collaboration for this {recordType}
            </p>
          </div>
        )}

        {/* Messages */}
        {!loading && !notFound && !error && (
          <>
            <div className="px-4 py-2 max-h-80 overflow-y-auto scrollbar-thin">
              {messages.length > 0 ? (
                <>
                  {messages.map((msg) => (
                    <MessageBubble key={msg.ts} message={msg} />
                  ))}
                  <div ref={feedEndRef} />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageSquare size={20} className="text-gray-600 mb-2" />
                  <p className="text-xs text-gray-500">No messages yet</p>
                  <p className="text-[10px] text-gray-600 mt-1">
                    Start the conversation about this {recordType}
                  </p>
                </div>
              )}
            </div>

            {/* Compose bar */}
            <div className="border-t border-surface-border px-3 py-2.5 flex items-center gap-2">
              <input
                type="text"
                placeholder={`Message ${channelDisplayName}...`}
                value={composing}
                onChange={(e) => setComposing(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                className="flex-1 bg-transparent text-xs text-gray-300 placeholder:text-gray-600 outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!composing.trim() || sending}
                className="p-1.5 rounded-md bg-siemens-teal/20 text-siemens-accent hover:bg-siemens-teal/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={12} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
