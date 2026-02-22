import { useState, useCallback } from 'react';

/**
 * Custom hook for geolocation.
 * @param {Object} options - { timeoutMs: number }
 */
export function useGeolocation(options = {}) {
  const { timeoutMs = 8000 } = options;
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getLocation = useCallback(() => {
    return new Promise((resolve) => {
      setLoading(true);
      setError(null);

      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        const err = { ok: false, error: 'Geolocation not supported' };
        setError(err.error);
        setLoading(false);
        resolve(err);
        return;
      }

      const timer = setTimeout(() => {
        const err = { ok: false, error: 'Timeout getting location' };
        setError(err.error);
        setLoading(false);
        resolve(err);
      }, timeoutMs);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          const result = {
            ok: true,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            ts: new Date().toISOString(),
          };
          setLocation(result);
          setLoading(false);
          resolve(result);
        },
        (err) => {
          clearTimeout(timer);
          const result = { ok: false, error: err.message };
          setError(result.error);
          setLoading(false);
          resolve(result);
        },
        { enableHighAccuracy: true, timeout: timeoutMs }
      );
    });
  }, [timeoutMs]);

  return { location, loading, error, getLocation };
}
