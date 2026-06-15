import { useState, useEffect, useRef, useCallback } from 'react';

export function useGPS({ onPosition, interval = 5000, enabled = false }) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const watchIdRef = useRef(null);
  const lastSampleRef = useRef(0);
  const onPositionRef = useRef(onPosition);

  // Keep callback ref up to date — fixes stale closure bug
  useEffect(() => {
    onPositionRef.current = onPosition;
  }, [onPosition]);

  useEffect(() => {
    if (!enabled) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser');
      return;
    }

    setError(null);

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
        setError(null);

        if (now - lastSampleRef.current >= interval) {
          lastSampleRef.current = now;
          onPositionRef.current?.(coords);
        }
      },
      (err) => {
        if (err.code === 1) {
          setError('Location access denied. Enable GPS permission for this site.');
        } else if (err.code === 2) {
          setError('Location unavailable. Move to open sky.');
        } else {
          setError('GPS searching... keep the app open.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 5000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, interval]);

  const getPosition = useCallback(() => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        reject,
        { enableHighAccuracy: true, timeout: 30000 }
      );
    });
  }, []);

  return { position, error, getPosition };
}