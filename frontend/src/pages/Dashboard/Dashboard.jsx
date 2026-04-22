import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../store/slices/uiSlice';
import { StatCard } from '../../components/common/Card';
import Button from '../../components/common/Button';
import api from '../../services/api';
import { FiPlus, FiHome, FiClock, FiCheckCircle, FiBarChart2, FiLayout, FiDollarSign, FiCalendar, FiActivity, FiBox } from 'react-icons/fi';
import './Dashboard.css';

export default function Dashboard() {
    const dispatch = useDispatch();
    const [stats, setStats] = useState({ totalProjects: 0, activeProjects: 0, completedProjects: 0, totalBudget: 0, avgProgress: 0 });
    const [projects, setProjects] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const [statsRes, projectsRes, activityRes] = await Promise.all([
                api.get('/dashboard/stats'),
                api.get('/projects'),
                api.get('/dashboard/activity?limit=8')
            ]);
            setStats(statsRes.data);
            setProjects(projectsRes.data);
            setActivities(activityRes.data);
        } catch (err) {
            console.error('Dashboard load error:', err);
            dispatch(addNotification({ type: 'error', title: 'Load Error', message: 'Failed to load dashboard data' }));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProject = async (id) => {
        try {
            await api.delete(`/projects/${id}`);
            setProjects(prev => prev.filter(p => p.id !== id));
            dispatch(addNotification({ type: 'success', title: 'Deleted', message: 'Project deleted successfully' }));
            // Refresh stats
            const statsRes = await api.get('/dashboard/stats');
            setStats(statsRes.data);
        } catch (err) {
            dispatch(addNotification({ type: 'error', title: 'Error', message: 'Failed to delete project' }));
        }
    };

    const formatBudget = (val) => {
        if (!val) return '₹0';
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        return `₹${val.toLocaleString('en-IN')}`;
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

    const statusColor = (s) => {
        if (s === 'completed') return '#10b981';
        if (s === 'planning' || s === 'created') return '#f59e0b';
        return '#3b82f6';
    };

    const ACTIVITY_ICONS = {
        layout: <FiLayout size={16} />, dollar: <FiDollarSign size={16} />,
        trello: <FiBarChart2 size={16} />, check: <FiCheckCircle size={16} />,
        cpu: <FiActivity size={16} />, plus: <FiPlus size={16} />,
    };

    if (loading) {
        return (
            <div className="dashboard fade-in">
                <div className="db-header">
                    <h1 className="page-title">Dashboard</h1>
                </div>
                <div className="db-stats">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="stat-card" style={{minHeight:100,opacity:0.5}}>
                            <div className="skeleton" style={{width:'60%',height:14,borderRadius:4,background:'var(--bg-tertiary)',marginBottom:8}} />
                            <div className="skeleton" style={{width:'40%',height:24,borderRadius:4,background:'var(--bg-tertiary)'}} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard animate-in">
            <div className="db-header animate-slide-down">
                <div>
                    <h1 className="db-title">Dashboard</h1>
                    <p className="db-subtitle">High-level overview of your AI-generated BIM portfolio</p>
                </div>
                <Link to="/projects/new">
                    <Button variant="primary" icon={<FiPlus />}>New Project</Button>
                </Link>
            </div>

            <div className="db-stats animate-slide-up">
                <StatCard icon={<FiHome />} label="Total Projects" value={stats.totalProjects} />
                <StatCard icon={<FiClock />} label="Active Status" value={stats.activeProjects > 0 ? 'Active' : 'Idle'} color={stats.activeProjects > 0 ? 'var(--color-primary-light)' : 'var(--text-muted)'} />
                <StatCard icon={<FiCheckCircle />} label="Completed BIM" value={stats.completedProjects} />
                <StatCard icon={<FiDollarSign />} label="Total Valuation" value={formatBudget(stats.totalBudget)} />
            </div>

            <div className="db-grid animate-fade-in">
                <div className="db-section db-projects">
                    <div className="db-section-header">
                        <h2 className="db-section-title">Active Projects</h2>
                        <Link to="/projects/new" className="db-section-link">+ Quick Create</Link>
                    </div>
                    <div className="db-project-list">
                        {projects.length === 0 && (
                            <div className="db-empty glass">
                                <FiHome size={40} style={{opacity:0.2, marginBottom:16}} />
                                <p>Initialize your first project to begin AI architecture</p>
                                <Link to="/projects/new" style={{marginTop:12}}><Button variant="outline" size="sm">Get Started</Button></Link>
                            </div>
                        )}
                        {projects.map(p => (
                            <div key={p.id} className="db-project-card glass-hover">
                                <div className="db-project-header">
                                    <div className="db-project-main">
                                        <Link to={`/projects/${p.id}`} className="db-project-name">{p.name}</Link>
                                        <div className="db-project-meta">
                                            <span>{p.buildingType}</span>
                                            <span>•</span>
                                            <span>{p.floors} Level{p.floors > 1 ? 's' : ''}</span>
                                        </div>
                                    </div>
                                    <span className={`db-project-status-tag ${p.status}`}>
                                        {p.status}
                                    </span>
                                </div>
                                <div className="db-project-progress">
                                    <div className="db-progress-bar"><div className="db-progress-fill" style={{width:`${p.progress}%`}} /></div>
                                    <span className="db-progress-label">{p.progress}%</span>
                                </div>
                                <div className="db-project-actions">
                                    <Link to={`/projects/${p.id}`}><Button variant="ghost" size="sm">Open</Button></Link>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteProject(p.id)} style={{color: 'var(--color-danger)', opacity: 0.6}}>Delete</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="db-side-panel">
                    <div className="db-section db-activity">
                        <div className="db-section-header">
                            <h2 className="db-section-title">Recent Updates</h2>
                        </div>
                        <div className="db-activity-list glass">
                            {activities.map(a => (
                                <div key={a.id} className="db-activity-item">
                                    <div className="db-activity-icon">{ACTIVITY_ICONS[a.icon] || <FiActivity />}</div>
                                    <div className="db-activity-content">
                                        <span className="db-activity-text">{a.text}</span>
                                        <span className="db-activity-time">{timeAgo(a.time)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="db-section db-quick-actions">
                        <h2 className="db-section-title">Fast Access</h2>
                        <div className="db-actions-grid">
                            <Link to="/floor-plans" className="db-action-card glass-hover">
                                <FiLayout className="db-action-icon" style={{color: '#3b82f6'}} />
                                <span className="db-action-label">Layouts</span>
                            </Link>
                            <Link to="/cost-estimator" className="db-action-card glass-hover">
                                <FiDollarSign className="db-action-icon" style={{color: '#f59e0b'}} />
                                <span className="db-action-label">Costs</span>
                            </Link>
                            <Link to="/scheduler" className="db-action-card glass-hover">
                                <FiCalendar className="db-action-icon" style={{color: '#10b981'}} />
                                <span className="db-action-label">Schedule</span>
                            </Link>
                            <Link to="/viewer-3d" className="db-action-card glass-hover">
                                <FiBox className="db-action-icon" style={{color: '#a855f7'}} />
                                <span className="db-action-label">3D Rendering</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
