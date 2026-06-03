import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Rectangle, useMap, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { useGPS } from '../hooks/useGPS';
import api from '../utils/api';
import {
  getCellBounds,
  formatDistance,
  formatDuration,
  formatPace,
} from '../utils/grid';

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component to pan map to position
function MapController({ position, shouldFollow }) {
  const map = useMap();
  useEffect(() => {
    if (position && shouldFollow) {
      map.setView([position.lat, position.lng], map.getZoom() < 16 ? 16 : map.getZoom());
    }
  }, [position, shouldFollow, map]);
  return null;
}

// Custom live location marker
function LiveLocationMarker({ position }) {
  if (!position) return null;
  return (
    <>
      <Circle
        center={[position.lat, position.lng]}
        radius={position.accuracy || 10}
        pathOptions={{ color: '#4499ff', fillColor: '#4499ff', fillOpacity: 0.1, weight: 1 }}
      />
      <Circle
        center={[position.lat, position.lng]}
        radius={5}
        pathOptions={{ color: '#ffffff', fillColor: '#4499ff', fillOpacity: 1, weight: 2 }}
      />
    </>
  );
}

// Territory cell component
function TerritoryCell({ territory, onClick }) {
  const bounds = getCellBounds(territory.lat, territory.lng);
  const isDecaying = territory.decayState === 'decaying';

  return (
    <Rectangle
      bounds={bounds}
      pathOptions={{
        color: territory.color || '#888',
        fillColor: territory.color || '#888',
        fillOpacity: isDecaying ? 0.25 : 0.45,
        weight: 1,
        opacity: isDecaying ? 0.5 : 0.8,
      }}
      eventHandlers={{
        click: () => onClick?.(territory),
      }}
    />
  );
}

export default function MapPage() {
  const { user, refreshUser } = useAuth();
  const { on, emit } = useSocket() || {};
  const { addToast } = useToast();

  // Run state
  const [isRunning, setIsRunning] = useState(false);
  const [runId, setRunId] = useState(null);
  const [path, setPath] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const distanceRef = useRef(0);

  // Map state
  const [territories, setTerritories] = useState({});
  const [followUser, setFollowUser] = useState(true);
  const [selectedTerritory, setSelectedTerritory] = useState(null);
  const [loadingTerritories, setLoadingTerritories] = useState(true);
  const [startingRun, setStartingRun] = useState(false);
  const [stoppingRun, setStoppingRun] = useState(false);
  const [captureResult, setCaptureResult] = useState(null);

  // GPS tracking
  const pathRef = useRef([]);

  const handleNewPosition = useCallback((coords) => {
    pathRef.current = [...pathRef.current, coords];
    setPath([...pathRef.current]);

    // Update distance
    if (pathRef.current.length >= 2) {
      const prev = pathRef.current[pathRef.current.length - 2];
      const curr = pathRef.current[pathRef.current.length - 1];
      const R = 6371000;
      const dLat = ((curr.lat - prev.lat) * Math.PI) / 180;
      const dLng = ((curr.lng - prev.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((prev.lat * Math.PI) / 180) *
          Math.cos((curr.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distanceRef.current += dist;
      setDistance(distanceRef.current);
    }

    // Emit location to other runners
    if (isRunning) {
      emit?.('location-update', {
        userId: user._id,
        username: user.username,
        color: user.color,
        location: coords,
      });
    }
  }, [isRunning, emit, user]);

  const { position, error: gpsError } = useGPS({
    enabled: true,
    interval: 5000,
    onPosition: isRunning ? handleNewPosition : undefined,
  });

  // Load territories on mount
  useEffect(() => {
    const loadTerritories = async () => {
      try {
        const res = await api.get('/territory/all');
        const terMap = {};
        res.data.territories.forEach(t => { terMap[t.gridKey] = t; });
        setTerritories(terMap);
      } catch (err) {
        addToast('Failed to load territories', 'error');
      } finally {
        setLoadingTerritories(false);
      }
    };
    loadTerritories();
  }, []);

  // Real-time territory updates
  useEffect(() => {
    if (!on) return;
    const unsub = on('territory-captured', (data) => {
      if (data.territory) {
        setTerritories(prev => ({
          ...prev,
          [data.territory.gridKey]: data.territory,
        }));
      }
    });
    const unsub2 = on('territory-update', (data) => {
      if (data.territory) {
        setTerritories(prev => ({
          ...prev,
          [data.territory.gridKey]: data.territory,
        }));
      }
    });
    return () => { unsub?.(); unsub2?.(); };
  }, [on]);

  // Timer
  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  const startRun = async () => {
    if (!position) {
      addToast('Waiting for GPS signal...', 'warning');
      return;
    }
    setStartingRun(true);
    try {
      const res = await api.post('/runs/start');
      setRunId(res.data.run._id);
      pathRef.current = [position];
      setPath([position]);
      distanceRef.current = 0;
      setDistance(0);
      setElapsed(0);
      setIsRunning(true);
      setFollowUser(true);
      emit?.('run-started', {
        userId: user._id,
        username: user.username,
        color: user.color,
        location: position,
      });
      addToast('Run started! Claim those streets! 🏃', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to start run', 'error');
    } finally {
      setStartingRun(false);
    }
  };

  const stopRun = async () => {
    if (pathRef.current.length < 2) {
      addToast('Run too short to save (need more GPS points)', 'warning');
      setIsRunning(false);
      return;
    }
    setStoppingRun(true);
    try {
      const res = await api.post('/runs/stop', {
        runId,
        coordinates: pathRef.current,
      });

      // Update local territory map with captured territories
      const reloadRes = await api.get('/territory/all');
      const terMap = {};
      reloadRes.data.territories.forEach(t => { terMap[t.gridKey] = t; });
      setTerritories(terMap);

      setIsRunning(false);
      emit?.('run-stopped', { userId: user._id });

      const result = res.data.captureResults;
      setCaptureResult(result);
      setTimeout(() => setCaptureResult(null), 5000);

      addToast(
        `Run complete! ${result.newlyCaptured} territories captured 🏴`,
        'success',
        5000
      );
      refreshUser();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save run', 'error');
      setIsRunning(false);
    } finally {
      setStoppingRun(false);
    }
  };

  const defaultCenter = position
    ? [position.lat, position.lng]
    : [28.6139, 77.2090]; // Delhi fallback

  const polylinePoints = path.map(p => [p.lat, p.lng]);

  return (
    <div className="h-full relative">
      {/* Map */}
      <MapContainer
        center={defaultCenter}
        zoom={16}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />

        <MapController position={position} shouldFollow={followUser} />

        {/* All territories */}
        {Object.values(territories).map(territory => (
          <TerritoryCell
            key={territory.gridKey}
            territory={territory}
            onClick={setSelectedTerritory}
          />
        ))}

        {/* Run path */}
        {polylinePoints.length > 1 && (
          <Polyline
            positions={polylinePoints}
            pathOptions={{ color: user.color, weight: 4, opacity: 0.9, dashArray: isRunning ? '8,4' : null }}
          />
        )}

        {/* Live location */}
        <LiveLocationMarker position={position} />
      </MapContainer>

      {/* Top HUD */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-start justify-between pointer-events-none">
        {/* User badge */}
        <div className="bg-turf-surface/90 backdrop-blur-sm border border-turf-border rounded-xl px-3 py-2 pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: user.color }} />
            <span className="font-display font-bold text-sm text-turf-text">{user.username}</span>
            <span className="text-turf-muted text-xs">·</span>
            <span className="text-turf-accent text-xs font-mono font-semibold">{user.territoriesOwned || 0} cells</span>
          </div>
        </div>

        {/* GPS status */}
        <div className="bg-turf-surface/90 backdrop-blur-sm border border-turf-border rounded-xl px-3 py-2 pointer-events-auto">
          {position ? (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-turf-accent" />
              <span className="text-turf-accent text-xs font-mono font-semibold">GPS</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-turf-warning animate-pulse" />
              <span className="text-turf-warning text-xs font-mono font-semibold">SEARCHING</span>
            </div>
          )}
        </div>
      </div>

      {/* Run HUD - shown while running */}
      {isRunning && (
        <div className="absolute top-16 left-3 right-3 z-[1000] animate-slide-up">
          <div className="bg-turf-surface/95 backdrop-blur-sm border border-turf-accent/30 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-turf-danger rec-pulse" />
              <span className="text-turf-danger text-xs font-display font-bold uppercase tracking-widest">Recording</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-turf-accent font-mono font-bold text-lg leading-none">{formatDistance(distance)}</p>
                <p className="text-turf-muted text-[10px] uppercase tracking-wider mt-0.5">Distance</p>
              </div>
              <div className="text-center border-x border-turf-border">
                <p className="text-white font-mono font-bold text-lg leading-none">{formatDuration(elapsed)}</p>
                <p className="text-turf-muted text-[10px] uppercase tracking-wider mt-0.5">Time</p>
              </div>
              <div className="text-center">
                <p className="text-white font-mono font-bold text-lg leading-none">{formatPace(distance, elapsed)}</p>
                <p className="text-turf-muted text-[10px] uppercase tracking-wider mt-0.5">Pace/km</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Capture result popup */}
      {captureResult && captureResult.newlyCaptured > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1001] animate-slide-up pointer-events-none">
          <div className="bg-turf-surface border-2 border-turf-accent rounded-2xl px-6 py-4 text-center shadow-2xl">
            <p className="text-4xl mb-1">🏴</p>
            <p className="font-display font-black text-2xl text-turf-accent">+{captureResult.newlyCaptured}</p>
            <p className="text-turf-muted text-sm">territories claimed</p>
          </div>
        </div>
      )}

      {/* Territory popup */}
      {selectedTerritory && (
        <div className="absolute bottom-24 left-3 right-3 z-[1000] animate-slide-up">
          <div className="bg-turf-surface border border-turf-border rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: selectedTerritory.color }} />
                  <span className="font-display font-bold text-sm">
                    {selectedTerritory.ownerId?.username || selectedTerritory.ownerId || 'Unknown'}
                  </span>
                  {selectedTerritory.decayState === 'decaying' && (
                    <span className="text-turf-warning text-xs">⚠️ Decaying</span>
                  )}
                </div>
                <p className="text-turf-muted text-xs">
                  Captured {selectedTerritory.capturedAt
                    ? new Date(selectedTerritory.capturedAt).toLocaleDateString()
                    : 'Unknown'}
                </p>
                <p className="text-turf-muted/60 text-[10px] font-mono mt-0.5">{selectedTerritory.gridKey}</p>
              </div>
              <button
                onClick={() => setSelectedTerritory(null)}
                className="text-turf-muted hover:text-turf-text text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GPS error */}
      {gpsError && (
        <div className="absolute top-16 left-3 right-3 z-[1000]">
          <div className="bg-red-900/80 border border-red-500/50 rounded-xl px-4 py-3">
            <p className="text-red-200 text-sm">⚠️ {gpsError}</p>
          </div>
        </div>
      )}

      {/* Follow toggle */}
      <button
        onClick={() => setFollowUser(f => !f)}
        className={`absolute right-3 z-[1000] w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${
          isRunning ? 'bottom-32' : 'bottom-24'
        } ${followUser ? 'bg-turf-accent/20 border-turf-accent text-turf-accent' : 'bg-turf-surface/90 border-turf-border text-turf-muted'}`}
      >
        <span className="text-lg">🎯</span>
      </button>

      {/* Start/Stop Run Button */}
      <div className="absolute bottom-3 left-0 right-0 z-[1000] flex justify-center px-6">
        <button
          onClick={isRunning ? stopRun : startRun}
          disabled={startingRun || stoppingRun || (!position && !isRunning)}
          className={`
            w-full max-w-xs py-4 rounded-2xl font-display font-black text-lg tracking-wide
            transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2 shadow-2xl
            ${isRunning
              ? 'bg-turf-danger text-white border-2 border-red-400/50'
              : 'bg-turf-accent text-black border-2 border-turf-accent/50 animate-pulse-glow'}
          `}
        >
          {startingRun || stoppingRun ? (
            <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isRunning ? (
            <>⏹ Stop Run</>
          ) : (
            <>▶ Start Run</>
          )}
        </button>
      </div>
    </div>
  );
}
