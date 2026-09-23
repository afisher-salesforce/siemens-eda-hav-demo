import { useState, useEffect, useRef } from 'react';

/**
 * Hook that batch-checks which Slack channel names exist.
 * Returns a Set of channel names that have active Slack channels.
 *
 * @param {string[]} channelNames - Array of channel names to check
 * @returns {{ hasChannel: Set<string>, loading: boolean }}
 */
export function useSlackChannels(channelNames) {
  const [hasChannel, setHasChannel] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const prevNamesRef = useRef('');

  useEffect(() => {
    // Deduplicate and filter nulls
    const names = [...new Set(channelNames.filter(Boolean))];
    if (names.length === 0) return;

    // Avoid re-fetching if names haven't changed
    const namesKey = names.sort().join(',');
    if (namesKey === prevNamesRef.current) return;
    prevNamesRef.current = namesKey;

    let cancelled = false;
    setLoading(true);

    fetch('/api/slack/channels/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Slack check failed'))))
      .then((data) => {
        if (cancelled) return;
        const existing = new Set();
        for (const [name, exists] of Object.entries(data.channels || {})) {
          if (exists) existing.add(name);
        }
        setHasChannel(existing);
      })
      .catch((err) => {
        if (!cancelled) console.warn('[useSlackChannels]', err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [channelNames]);

  return { hasChannel, loading };
}
