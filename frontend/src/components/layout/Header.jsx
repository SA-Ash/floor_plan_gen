import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import './Header.css';

export default function Header({ onToggleSidebar }) {
    const location = useLocation();
    const isLanding = location.pathname === '/';
    const [showNotifs, setShowNotifs] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!isLanding) loadNotifications();
        const interval = setInterval(() => { if (!isLanding) loadNotifications(); }, 15000);
        return () => clearInterval(interval);
    }, [isLanding]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowNotifs(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadNotifications = async () => {
        try {
            const res = await api.get('/dashboard/notifications');
            setNotifications(res.data.notifications || []);
            setUnreadCount(res.data.unreadCount || 0);
        } catch (e) { /* ignore */ }
    };

    const markRead = async (id) => {
        try {
            await api.put(`/dashboard/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (e) { /* ignore */ }
    };

    const markAllRead = async () => {
        try {
            await api.put('/dashboard/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (e) { /* ignore */ }
    };

    const timeAgo = (dateStr) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    const notifColors = { success: '#10b981', warning: '#f59e0b', info: '#3b82f6', error: '#ef4444' };

    return (
        <header className={`header glass ${isLanding ? 'header-landing' : ''}`}>
            <div className="header-inner">
                <div className="header-left">
                    {!isLanding && (
                        <button className="header-menu-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                            </svg>
                        </button>
                    )}
                    <Link to={isLanding ? "/" : "/dashboard"} className="header-logo">
                        <div className="header-logo-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M3 21V9l9-7 9 7v12a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z" fill="url(#grad)" />
                                <defs>
                                    <linearGradient id="grad" x1="3" y1="2" x2="21" y2="22">
                                        <stop stopColor="#3b82f6" /><stop offset="1" stopColor="#06d6a0" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <span className="header-logo-text">
                            Build<span className="gradient-text">My</span>Home
                        </span>
                    </Link>
                </div>

                {isLanding && (
                    <nav className="header-nav">
                        <a href="#features" className="header-nav-link">Features</a>
                        <a href="#how-it-works" className="header-nav-link">How It Works</a>
                        <a href="#pricing" className="header-nav-link">Pricing</a>
                    </nav>
                )}

                <div className="header-right">
                    {isLanding ? (
                        <>
                            <Link to="/dashboard" className="header-nav-link">Sign In</Link>
                            <Link to="/projects/new" className="header-cta">
                                Start Building →
                            </Link>
                        </>
                    ) : (
                        <>
                            <div className="header-notif-wrap" ref={dropdownRef}>
                                <button className="header-icon-btn" aria-label="Notifications" onClick={() => setShowNotifs(!showNotifs)}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
                                    </svg>
                                    {unreadCount > 0 && <span className="header-notification-dot">{unreadCount}</span>}
                                </button>

                                {showNotifs && (
                                    <div className="header-notif-dropdown glass">
                                        <div className="header-notif-header">
                                            <span className="header-notif-title">Notifications</span>
                                            {unreadCount > 0 && (
                                                <button className="header-notif-mark-all" onClick={markAllRead}>
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>
                                        <div className="header-notif-list">
                                            {notifications.length === 0 && (
                                                <div className="header-notif-empty">No notifications</div>
                                            )}
                                            {notifications.slice(0, 8).map(n => (
                                                <div
                                                    key={n.id}
                                                    className={`header-notif-item ${n.read ? 'read' : 'unread'}`}
                                                    onClick={() => markRead(n.id)}
                                                >
                                                    <div className="header-notif-dot" style={{ background: notifColors[n.type] || '#64748b' }} />
                                                    <div className="header-notif-content">
                                                        <div className="header-notif-item-title">{n.title}</div>
                                                        <div className="header-notif-item-msg">{n.message}</div>
                                                        <div className="header-notif-item-time">{timeAgo(n.createdAt)}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="header-avatar">
                                <span>D</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
