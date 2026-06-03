import { useState, useEffect, useRef, useCallback } from 'react';

export function useGPS({ onPosition, interval = 5000, enabled = false }) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [watching, setWatching] = useState(false);
  const watchIdRef = useRef(null);
  const lastSampleRef = useRef(0);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setError(null);
    setWatching(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: now,
        };
        setPosition(coords);

        // Sample at the specified interval
        if (now - lastSampleRef.current >= interval) {
          lastSampleRef.current = now;
          onPosition?.(coords);
        }
      },
      (err) => {
        setError(
          err.code === 1
            ? 'Location access denied. Please enable GPS permissions.'
            : err.code === 2
            ? 'Location unavailable. Try moving to an open area.'
            : 'Location request timed out. Retrying...'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000,
      }
    );
  }, [interval, onPosition]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setWatching(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      startWatching();
    } else {
      stopWatching();
    }
    return stopWatching;
  }, [enabled]);

  // One-shot position fetch
  const getPosition = useCallback(() => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        reject,
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  return { position, error, watching, startWatching, stopWatching, getPosition };
}
