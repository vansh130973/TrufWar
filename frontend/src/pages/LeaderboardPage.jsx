import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { on } = useSocket() || {};
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get('/leaderboard');
      setLeaderboard(res.data.leaderboard);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, []);

  // Refresh on territory capture events
  useEffect(() => {
    if (!on) return;
    const unsub = on('territory-captured', () => {
      setTimeout(fetchLeaderboard, 1000);
    });
    return unsub;
  }, [on]);

  const medals = ['🥇', '🥈', '🥉'];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-turf-bg">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-turf-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-turf-muted text-sm">Loading rankings...</p>
        </div>
      </div>
    );
  }

  const userRank = leaderboard.find(l => l.userId?.toString() === user?._id?.toString());

  return (
    <div className="h-full flex flex-col bg-turf-bg overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-6 pb-4 border-b border-turf-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-black text-2xl text-white">Rankings</h1>
            <p className="text-turf-muted text-xs mt-0.5">
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Global leaderboard'}
            </p>
          </div>
          <button
            onClick={fetchLeaderboard}
            className="w-9 h-9 rounded-xl bg-turf-surface border border-turf-border flex items-center justify-center text-turf-muted hover:text-turf-text transition-colors"
          >
            🔄
          </button>
        </div>

        {/* Your rank card */}
        {userRank && (
          <div className="mt-4 bg-turf-surface border border-turf-accent/30 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-turf-accent/10 font-display font-black text-turf-accent">
              #{userRank.rank}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm text-turf-text truncate">Your Position</p>
              <p className="text-turf-muted text-xs">{userRank.territoriesOwned} cells · {userRank.totalDistanceKm}km</p>
            </div>
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: userRank.color }} />
          </div>
        )}
      </div>

      {/* Leaderboard list */}
      <div className="flex-1 overflow-y-auto">
        {leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <span className="text-5xl mb-4">🏃</span>
            <p className="font-display font-bold text-lg text-turf-text">No runners yet</p>
            <p className="text-turf-muted text-sm mt-1">Start a run to claim the #1 spot</p>
          </div>
        ) : (
          <div className="divide-y divide-turf-border/50">
            {leaderboard.map((entry, idx) => {
              const isMe = entry.userId?.toString() === user?._id?.toString();
              return (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    isMe ? 'bg-turf-accent/5' : 'hover:bg-turf-surface/50'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center flex-shrink-0">
                    {idx < 3 ? (
                      <span className="text-xl">{medals[idx]}</span>
                    ) : (
                      <span className="font-display font-bold text-sm text-turf-muted">#{entry.rank}</span>
                    )}
                  </div>

                  {/* Color dot */}
                  <div
                    className="w-8 h-8 rounded-xl flex-shrink-0 border border-white/10"
                    style={{ backgroundColor: entry.color }}
                  />

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-display font-bold text-sm truncate ${isMe ? 'text-turf-accent' : 'text-turf-text'}`}>
                        {entry.username}
                      </span>
                      {isMe && <span className="text-[10px] bg-turf-accent/20 text-turf-accent px-1.5 py-0.5 rounded font-bold">YOU</span>}
                    </div>
                    <p className="text-turf-muted text-xs">{entry.totalDistanceKm}km run</p>
                  </div>

                  {/* Territory count */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-display font-bold text-base text-white">{entry.territoriesOwned}</p>
                    <p className="text-turf-muted text-[10px] uppercase tracking-wider">cells</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
