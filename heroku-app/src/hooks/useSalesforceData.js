import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for fetching data from Salesforce API endpoints.
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

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
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
  }, [fetchFn]);

  useEffect(() => {
    if (immediate) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refetch]);

  return { data, loading, error, refetch };
}

export default useSalesforceData;
