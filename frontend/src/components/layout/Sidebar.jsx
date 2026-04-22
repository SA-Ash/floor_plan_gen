import React from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { useActiveProject } from '../../hooks/useActiveProject';
import './Sidebar.css';

const navItems = [
    {
        label: 'Dashboard',
        path: '/dashboard',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
        )
    },
    {
        label: 'Floor Plan',
        path: '/floor-plans',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="2" y="2" width="20" height="20" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
                <line x1="10" y1="2" x2="10" y2="22" />
            </svg>
        )
    },
    {
        label: '3D Viewer',
        path: '/3d-viewer',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
        )
    },
    {
        label: 'MEP Routing',
        path: '/mep-routing',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
        )
    },
    {
        label: 'Task Graph',
        path: '/task-graph',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
        )
    },
    {
        label: 'Scheduler',
        path: '/scheduler',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
        )
    },
    {
        label: 'Cost Estimator',
        path: '/cost-estimator',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
        )
    }
];

const bottomItems = [
    {
        label: 'Settings',
        path: '/settings',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
        )
    }
];

export default function Sidebar({ isOpen, collapsed, onClose, onToggleCollapse }) {
    const location = useLocation();
    const { project } = useActiveProject();

    return (
        <>
            {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
            <aside className={`sidebar glass ${isOpen ? 'sidebar-open' : ''} ${collapsed ? 'sidebar-collapsed' : ''}`}>
                <nav className="sidebar-nav">
                    <div className="sidebar-section">
                        <span className="sidebar-section-label">Main Navigation</span>
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path + (project ? `?projectId=${project.id}` : '')}
                                className={({ isActive }) =>
                                    `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                                }
                                onClick={onClose}
                                title={collapsed ? item.label : undefined}
                            >
                                <span className="sidebar-link-icon">{item.icon}</span>
                                <span className="sidebar-link-text">{item.label}</span>
                            </NavLink>
                        ))}
                    </div>

                    <div className="sidebar-section sidebar-section-bottom">
                        {bottomItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                                }
                                onClick={onClose}
                                title={collapsed ? item.label : undefined}
                            >
                                <span className="sidebar-link-icon">{item.icon}</span>
                                <span className="sidebar-link-text">{item.label}</span>
                            </NavLink>
                        ))}

                        {/* Active Project Card */}
                        {project ? (
                            <Link to={`/projects/${project.id}`} className="sidebar-project-card">
                                <span className="sidebar-project-label">ACTIVE PROJECT</span>
                                <span className="sidebar-project-name">{project.name}</span>
                                <div className="sidebar-project-progress">
                                    <div className="sidebar-project-bar">
                                        <div className="sidebar-project-fill" style={{ width: `${project.progress || 0}%` }} />
                                    </div>
                                    <span className="sidebar-project-pct">{project.progress || 0}% Complete</span>
                                </div>
                            </Link>
                        ) : (
                            <div className="sidebar-project-card" style={{opacity: 0.5}}>
                                <span className="sidebar-project-label">NO ACTIVE PROJECT</span>
                                <span className="sidebar-project-name">Create or select one</span>
                            </div>
                        )}
                    </div>
                </nav>
            </aside>
        </>
    );
}
