import React, { useState, useEffect } from 'react';
import { Swords, AlertTriangle, Skull, ShieldCheck, Bell, Inbox } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';

/**
 * Icon component + color per notification type.
 * Each entry: { Icon, color (text), bgColor (icon container bg) }
 */
const NOTIF_CONFIG = {
  territory_captured: {
    Icon: Swords,
    color: '#ff4444',
    bgColor: 'rgba(255,68,68,0.12)',
    borderColor: 'rgba(255,68,68,0.25)',
  },
  decay_warning: {
    Icon: AlertTriangle,
    color: '#ffaa00',
    bgColor: 'rgba(255,170,0,0.12)',
    borderColor: 'rgba(255,170,0,0.25)',
  },
  territory_decayed: {
    Icon: Skull,
    color: '#64748b',
    bgColor: 'rgba(100,116,139,0.12)',
    borderColor: 'rgba(100,116,139,0.25)',
  },
  territory_defended: {
    Icon: ShieldCheck,
    color: '#00cc6a',
    bgColor: 'rgba(0,204,106,0.12)',
    borderColor: 'rgba(0,204,106,0.25)',
  },
};

const FALLBACK_CONFIG = {
  Icon: Inbox,
  color: '#64748b',
  bgColor: 'rgba(100,116,139,0.10)',
  borderColor: 'rgba(100,116,139,0.20)',
};

export default function NotificationsPage() {
  const { on } = useSocket() || {};
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Real-time notifications
  useEffect(() => {
    if (!on) return;
    const unsub = on('notification', (data) => {
      if (data.notification) {
        setNotifications(prev => [data.notification, ...prev]);
      }
    });
    const unsub2 = on('territory-decayed', (data) => {
      if (data.notification) {
        setNotifications(prev => [data.notification, ...prev]);
      }
    });
    return () => { unsub?.(); unsub2?.(); };
  }, [on]);

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
    setMarkingAll(false);
  };

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="h-full flex flex-col bg-turf-bg overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-6 pb-4 border-b border-turf-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-black text-2xl text-white">Alerts</h1>
            <p className="text-turf-muted text-xs mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="text-xs font-display font-semibold text-turf-accent hover:text-turf-accentDim transition-colors disabled:opacity-50"
            >
              {markingAll ? 'Marking...' : 'Mark all read'}
            </button>
          )}
        </div>
      </div>

      {/* Notifications list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-turf-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-turf-surface border border-turf-border flex items-center justify-center mb-4">
              <Bell size={32} className="text-turf-muted" strokeWidth={1.5} />
            </div>
            <p className="font-display font-bold text-lg text-turf-text">No notifications yet</p>
            <p className="text-turf-muted text-sm mt-1">
              You'll hear when territories are captured or decaying
            </p>
          </div>
        ) : (
          <div className="divide-y divide-turf-border/30">
            {notifications.map(notif => {
              const config = NOTIF_CONFIG[notif.type] || FALLBACK_CONFIG;
              const { Icon, color, bgColor, borderColor } = config;

              return (
                <div
                  key={notif._id}
                  onClick={() => !notif.read && markRead(notif._id)}
                  className={`flex items-start gap-3 px-4 py-4 cursor-pointer transition-colors border-l-2 ${
                    !notif.read ? 'bg-turf-surface/60' : 'opacity-60'
                  }`}
                  style={{ borderLeftColor: borderColor }}
                >
                  {/* Icon container */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: bgColor }}
                  >
                    <Icon size={18} strokeWidth={2} style={{ color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display font-bold text-sm text-turf-text">{notif.title}</p>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-turf-accent flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-turf-muted text-xs mt-0.5 leading-relaxed">{notif.message}</p>
                    <p className="text-turf-muted/40 text-[10px] mt-1.5">
                      {new Date(notif.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
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
