import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Activity,
  Flag,
  TrendingDown,
  Ruler,
  CalendarDays,
  Footprints,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { formatDistance, formatDuration } from '../utils/grid';

/**
 * StatCard
 * @param {React.ComponentType} Icon  — lucide-react icon component
 * @param {string} label
 * @param {string|number} value
 * @param {string} [sub]
 * @param {string} [accent]          — hex color for value + dot
 */
function StatCard({ Icon, label, value, sub, accent }) {
  return (
    <div className="bg-turf-surface border border-turf-border rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={accent ? { backgroundColor: `${accent}20` } : { backgroundColor: 'rgba(255,255,255,0.05)' }}
        >
          <Icon
            size={18}
            strokeWidth={1.75}
            style={accent ? { color: accent } : { color: '#64748b' }}
          />
        </div>
        {accent && <div className="w-2 h-2 rounded-full mt-1" style={{ backgroundColor: accent }} />}
      </div>
      <p
        className="font-display font-black text-2xl leading-none"
        style={accent ? { color: accent } : { color: '#ffffff' }}
      >
        {value}
      </p>
      <p className="text-turf-muted text-xs uppercase tracking-wider mt-1">{label}</p>
      {sub && <p className="text-turf-muted/60 text-[10px] mt-1">{sub}</p>}
    </div>
  );
}

export default function StatsPage() {
  const { user, refreshUser } = useAuth();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshUser();
    const fetchRuns = async () => {
      try {
        const res = await api.get(`/runs/history/${user._id}`);
        setRuns(res.data.runs);
      } catch {}
      setLoading(false);
    };
    fetchRuns();
  }, []);

  const distanceKm = ((user.totalDistance || 0) / 1000).toFixed(1);
  const avgDistanceKm = runs.length > 0
    ? ((runs.reduce((s, r) => s + (r.distance || 0), 0) / runs.length) / 1000).toFixed(1)
    : '0.0';

  return (
    <div className="h-full flex flex-col bg-turf-bg overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-6 pb-4 border-b border-turf-border">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl border-2 flex items-center justify-center font-display font-black text-xl"
            style={{
              backgroundColor: `${user.color}20`,
              borderColor: user.color,
              color: user.color,
            }}
          >
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <h1 className="font-display font-black text-xl text-white">{user.username}</h1>
            <p className="text-turf-muted text-xs">
              Runner since {new Date(user.createdAt || Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            Icon={MapPin}
            label="Territories Owned"
            value={user.territoriesOwned || 0}
            accent={user.color}
          />
          <StatCard
            Icon={Activity}
            label="Total Distance"
            value={`${distanceKm}km`}
            sub={`${runs.length} runs`}
          />
          <StatCard
            Icon={Flag}
            label="Territories Captured"
            value={user.territoriesCaptured || 0}
            sub="from others"
          />
          <StatCard
            Icon={TrendingDown}
            label="Territories Lost"
            value={user.territoriesLost || 0}
            sub="to others"
          />
          <StatCard
            Icon={Ruler}
            label="Avg Run Distance"
            value={`${avgDistanceKm}km`}
            sub="per run"
          />
          <StatCard
            Icon={CalendarDays}
            label="Last Run"
            value={
              user.lastRunDate
                ? new Date(user.lastRunDate).toLocaleDateString()
                : 'Never'
            }
          />
        </div>

        {/* Run history */}
        <div>
          <h2 className="font-display font-bold text-base text-turf-text mb-3">Run History</h2>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-turf-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : runs.length === 0 ? (
            <div className="bg-turf-surface border border-turf-border rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-turf-surface border border-turf-border flex items-center justify-center mx-auto mb-3">
                <Footprints size={24} className="text-turf-muted" strokeWidth={1.5} />
              </div>
              <p className="text-turf-muted text-sm">No runs yet. Hit the streets!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {runs.map(run => (
                <div key={run._id} className="bg-turf-surface border border-turf-border rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-display font-bold text-sm text-turf-text">
                        {new Date(run.startTime).toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}
                      </p>
                      <p className="text-turf-muted text-xs mt-0.5">
                        {new Date(run.startTime).toLocaleTimeString('en-US', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      {run.territoriesCaptured > 0 && (
                        <span className="text-xs bg-turf-accent/20 text-turf-accent px-2 py-0.5 rounded font-bold">
                          +{run.territoriesCaptured} cells
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-turf-border/50">
                    <div>
                      <p className="font-mono font-semibold text-sm text-white">
                        {formatDistance(run.distance || 0)}
                      </p>
                      <p className="text-turf-muted text-[10px] uppercase">Distance</p>
                    </div>
                    <div>
                      <p className="font-mono font-semibold text-sm text-white">
                        {formatDuration(run.duration || 0)}
                      </p>
                      <p className="text-turf-muted text-[10px] uppercase">Duration</p>
                    </div>
                    <div>
                      <p className="font-mono font-semibold text-sm text-white">
                        {run.distance && run.duration
                          ? `${Math.floor((run.duration / run.distance) * 1000 / 60)}:${String(
                              Math.floor(((run.duration / run.distance) * 1000) % 60)
                            ).padStart(2, '0')}`
                          : '--:--'}
                      </p>
                      <p className="text-turf-muted text-[10px] uppercase">Pace/km</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
