import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useApi(endpoint, options = { immediate: true }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(options.immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    if (!endpoint) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.get(endpoint);
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (options.immediate && endpoint) {
      execute();
    }
  }, [execute, options.immediate, endpoint]);

  return { data, loading, error, refetch: execute };
}
