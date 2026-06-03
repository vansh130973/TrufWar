import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';

export default function Layout() {
  const { user, logout } = useAuth();
  const { on } = useSocket() || {};
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notification count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await api.get('/notifications');
        setUnreadCount(res.data.unreadCount || 0);
      } catch {}
    };
    fetchUnread();
  }, []);

  // Listen for real-time notifications
  useEffect(() => {
    if (!on) return;
    const unsub = on('notification', (data) => {
      setUnreadCount(prev => prev + 1);
      addToast(data.notification?.message || 'New notification', 'warning');
    });
    const unsubd = on('territory-decayed', (data) => {
      setUnreadCount(prev => prev + 1);
      addToast(data.notification?.message || 'Territory decaying!', 'warning');
    });
    return () => {
      unsub?.();
      unsubd?.();
    };
  }, [on, addToast]);

  const navItems = [
    { to: '/map', icon: '🗺️', label: 'Map' },
    { to: '/leaderboard', icon: '🏆', label: 'Ranks' },
    { to: '/stats', icon: '📊', label: 'Stats' },
    { to: '/notifications', icon: '🔔', label: 'Alerts', badge: unreadCount },
  ];

  return (
    <div className="h-full flex flex-col bg-turf-bg">
      {/* Main content */}
      <div className="flex-1 overflow-hidden relative">
        <Outlet />
      </div>

      {/* Bottom navigation */}
      <nav className="flex-shrink-0 bg-turf-surface border-t border-turf-border safe-area-bottom">
        <div className="flex">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-3 gap-0.5 relative transition-colors ${
                  isActive ? 'text-turf-accent' : 'text-turf-muted hover:text-turf-text'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="text-xl leading-none">{item.icon}</span>
                  <span className={`text-[10px] font-display font-semibold tracking-wider uppercase ${isActive ? 'text-turf-accent' : ''}`}>
                    {item.label}
                  </span>
                  {item.badge > 0 && (
                    <span className="absolute top-2 right-1/4 w-4 h-4 bg-turf-danger rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-turf-accent rounded-full" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
