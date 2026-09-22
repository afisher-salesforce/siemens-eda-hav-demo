import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for fetching data from Salesforce API endpoints.
 *
 * Uses a ref for fetchFn so callers can pass inline arrow functions
 * without causing infinite re-render loops.
 *
 * @param {Function} fetchFn - The API function to call (from salesforce.js)
 * @param {Array} deps - Dependency array for re-fetching
 * @param {Object} options - { immediate: boolean, onError: Function }
 * @returns {{ data, loading, error, refetch }}
 */
export function useSalesforceData(fetchFn, deps = [], options = {}) {
  const { immediate = true, onError } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  // Store fetchFn in a ref so it's always current without triggering effects
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFnRef.current();
      setData(result);
      return result;
    } catch (err) {
      const message = err.message || 'An unexpected error occurred';
      setError(message);
      if (onError) onError(message);
      return null;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (immediate) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);

  return { data, loading, error, refetch };
}

export default useSalesforceData;
