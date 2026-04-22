import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../store/slices/uiSlice';
import { useActiveProject } from '../../hooks/useActiveProject';
import { StatCard } from '../../components/common/Card';
import Button from '../../components/common/Button';
import api from '../../services/api';
import { FiHome, FiMaximize, FiGrid, FiDollarSign, FiBarChart2, FiClock, FiLayout, FiTrello, FiCalendar, FiDownload, FiLoader, FiPlay, FiZap, FiBox } from 'react-icons/fi';
import './ProjectDetail.css';

export default function ProjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { setProject: setActiveProject } = useActiveProject();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        loadProject();
    }, [id]);

    const loadProject = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/projects/${id}`);
            setProject(res.data);
            setActiveProject(res.data); // Share with all viewer pages
            console.log('[ProjectDetail] Loaded:', res.data.id, 'building:', !!res.data.building);
        } catch (err) {
            dispatch(addNotification({ type: 'error', title: 'Error', message: 'Failed to load project' }));
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleExportBIM = () => {
        if (!project) return;
        const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${project.name.replace(/\s+/g, '_')}_BIM.json`;
        a.click(); URL.revokeObjectURL(url);
        dispatch(addNotification({ type: 'success', title: 'Exported', message: 'BIM data downloaded' }));
    };

    const handleRunFullPipeline = async () => {
        console.log('[ProjectDetail] Run Pipeline clicked for:', id);
        setGenerating(true);
        try {
            dispatch(addNotification({ type: 'info', title: 'Pipeline Started', message: 'AI is generating all BIM plans...' }));
            const res = await api.post(`/projects/${id}/generate`);
            console.log('[ProjectDetail] Pipeline complete. Keys:', Object.keys(res.data));
            console.log('[ProjectDetail] Building floors:', res.data.building ? Object.keys(res.data.building) : 'null');
            setProject(res.data);
            setActiveProject(res.data); // Update shared context
            dispatch(addNotification({ type: 'success', title: 'Complete!', message: 'All BIM stages finished — view your plans!' }));
        } catch (err) {
            console.error('[ProjectDetail] Pipeline error:', err);
            dispatch(addNotification({ type: 'error', title: 'Pipeline Failed', message: err.response?.data?.error || err.message }));
        } finally {
            setGenerating(false);
        }
    };

    if (loading || !project) {
        return (
            <div className="project-detail fade-in" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:400}}>
                <FiLoader size={32} className="spin" style={{color:'var(--color-primary)'}} />
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: <FiBarChart2 size={16} /> },
        { id: 'floorplan', label: 'Floor Plan', icon: <FiLayout size={16} /> },
        { id: 'structural', label: 'Structural', icon: <FiTrello size={16} /> },
        { id: 'schedule', label: 'Schedule', icon: <FiCalendar size={16} /> },
        { id: 'cost', label: 'Cost', icon: <FiDollarSign size={16} /> },
    ];

    const pipelineStages = [
        { key: 'nlp', label: 'Requirement Analysis' },
        { key: 'constraints', label: 'Constraint Validation' },
        { key: 'floorPlan', label: 'Floor Plan Generation' },
        { key: 'structural', label: 'Structural Design' },
        { key: 'mep', label: 'MEP Layout' },
        { key: 'tasks', label: 'Task Generation' },
        { key: 'schedule', label: 'Schedule Planning' },
        { key: 'cost', label: 'Cost Estimation' },
    ];

    // Helper: handle both snake_case (from AI) and camelCase (legacy) cost keys
    const getCost = (key, fallbackKey) => {
        if (!project.cost) return 0;
        return project.cost[key] || project.cost[fallbackKey] || 0;
    };

    const formatBudget = (v) => {
        if (!v) return '—';
        if (v >= 100000) return `₹${(v/100000).toFixed(1)}L`;
        return `₹${v?.toLocaleString('en-IN') || 0}`;
    };

    const grandTotal = getCost('grand_total', 'totalBudget');
    const totalTasks = project.tasks?.length || 0;

    return (
        <div className="project-detail animate-in">
            <div className="pd-header animate-slide-down">
                <div className="pd-header-info">
                    <div className="pd-breadcrumb">
                        <Link to="/dashboard" className="pd-breadcrumb-link">Projects</Link>
                        <span className="pd-breadcrumb-sep">/</span>
                        <span>{project.name}</span>
                    </div>
                    <h1 className="pd-title">{project.name}</h1>
                    <div className="pd-meta">
                        <span className={`pd-status-badge ${project.status}`}>{project.status}</span>
                        <span className="pd-meta-item"><FiHome className="pd-icon" />{project.buildingType}</span>
                        <span className="pd-meta-item"><FiMaximize className="pd-icon" />{project.plotWidth} × {project.plotLength} ft</span>
                        <span className="pd-meta-item"><FiGrid className="pd-icon" />{project.floors} Floor{project.floors > 1 ? 's' : ''}</span>
                    </div>
                </div>
                <div className="pd-header-actions">
                    <Button variant="secondary" icon={<FiDownload />} onClick={handleExportBIM}>Export BIM</Button>
                    <Link to="/3d-viewer"><Button variant="secondary" icon={<FiBox color="var(--color-primary-light)" />}>3D View</Button></Link>
                    {project.building ? (
                        <Link to="/floor-plans"><Button variant="primary">View Design &rarr;</Button></Link>
                    ) : (
                        <Button variant="primary" icon={<FiZap />} onClick={handleRunFullPipeline} disabled={generating}>
                            {generating ? '⟳ Generating...' : '🚀 Generate AI Layouts'}
                        </Button>
                    )}
                </div>
            </div>

            <div className="pd-stats animate-slide-up">
                <StatCard icon={<FiLayout />} label="Total Area" value={`${project.plotWidth * project.plotLength} sq ft`} />
                <StatCard icon={<FiDollarSign />} label="Budget" value={formatBudget(project.budget)} />
                <StatCard icon={<FiBarChart2 />} label="Est. Cost" value={grandTotal ? formatBudget(grandTotal) : '—'} />
                <StatCard icon={<FiClock />} label="AI Build Status" value={project.building ? 'Constructed' : 'Drafting'} color={project.building ? 'var(--color-success)' : 'var(--color-warning)'} />
            </div>

            <div className="pd-tabs-container">
                <div className="pd-tabs glass">
                    {tabs.map(t => (
                        <button key={t.id} className={`pd-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                            <span className="pd-tab-icon">{t.icon}</span> {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="pd-content animate-fade-in">
                {activeTab === 'overview' && (
                    <div className="pd-overview">
                        <div className="pd-section">
                            <h3 className="pd-section-title">AI Pipeline Progress</h3>
                            <div className="pd-timeline">
                                {pipelineStages.map((s, i) => {
                                    const status = project.pipelineStatus?.[s.key] || 'pending';
                                    return (
                                        <div key={i} className={`pd-timeline-item ${status}`}>
                                            <div className="pd-timeline-dot" />
                                            <div className="pd-timeline-content">
                                                <span className="pd-timeline-phase">{s.label}</span>
                                                <span className="pd-timeline-date">{status === 'done' ? '✓' : status === 'running' ? '⟳' : '○'}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <Button variant="primary" icon={<FiPlay size={16} />} onClick={handleRunFullPipeline} disabled={generating} style={{marginTop:16}}>
                                {generating ? '⟳ Generating...' : project.status === 'completed' ? '🔄 Regenerate' : '🚀 Run Full Pipeline'}
                            </Button>
                        </div>
                        <div className="pd-info-grid">
                            <div className="pd-section">
                                <h3 className="pd-section-title">Room Configuration</h3>
                                <div className="pd-room-list">
                                    {Object.entries(project.rooms || {}).filter(([,v]) => v > 0).map(([name, count]) => (
                                        <div key={name} className="pd-room-row"><span>{name}</span><span className="pd-room-count">{count}</span></div>
                                    ))}
                                </div>
                            </div>
                            <div className="pd-section">
                                <h3 className="pd-section-title">Features</h3>
                                <div className="pd-feature-tags">
                                    {(project.features || []).map(f => (<span key={f} className="pd-feature-tag">{f}</span>))}
                                    {(!project.features || project.features.length === 0) && <span style={{color:'var(--text-muted)'}}>None</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'floorplan' && (
                    <div className="pd-section pd-floorplan-placeholder">
                        <div className="pd-placeholder-content">
                            {project.building ? (
                                <>
                                    <span className="pd-placeholder-icon" style={{color:'#10b981'}}>✓</span>
                                    <h3>Floor Plan Generated</h3>
                                    <p>{Object.keys(project.building).length} floors with room layouts</p>
                                    <Link to="/floor-plans"><Button variant="primary">Open Full Viewer →</Button></Link>
                                </>
                            ) : (
                                <>
                                    <span className="pd-placeholder-icon"><FiLayout size={48} /></span>
                                    <h3>No Floor Plan Yet</h3>
                                    <p>Run the pipeline to generate floor plans</p>
                                    <Button variant="primary" onClick={handleRunFullPipeline} disabled={generating}>
                                        {generating ? 'Generating...' : 'Generate Now'}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'structural' && (
                    <div className="pd-section pd-floorplan-placeholder">
                        <div className="pd-placeholder-content">
                            {project.structural ? (
                                <>
                                    <span className="pd-placeholder-icon" style={{color:'#10b981'}}>✓</span>
                                    <h3>Structural Grid Ready</h3>
                                    <p>Columns, beams, and slabs designed by AI</p>
                                    <Link to="/floor-plans"><Button variant="primary">View in Floor Plan →</Button></Link>
                                </>
                            ) : (
                                <>
                                    <span className="pd-placeholder-icon"><FiTrello size={48} /></span>
                                    <h3>Structural Layout</h3>
                                    <p>Run the full pipeline to generate structural design</p>
                                    <Button variant="primary" onClick={handleRunFullPipeline} disabled={generating}>
                                        {generating ? 'Generating...' : 'Generate Now'}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'schedule' && (
                    <div className="pd-section">
                        <h3 className="pd-section-title">Construction Schedule</h3>
                        {totalTasks > 0 ? (
                            <div className="pd-gantt">
                                <div className="pd-gantt-header">
                                    <div className="pd-gantt-col-task">Task</div>
                                    <div className="pd-gantt-col">Duration</div>
                                    <div className="pd-gantt-col">Crew</div>
                                    <div className="pd-gantt-col-bar">Gantt</div>
                                </div>
                                {project.tasks.slice(0, 12).map((task, i) => {
                                    const name = task.task ? task.task.replace(/_/g, ' ') : task.name || `Task ${i+1}`;
                                    const dur = task.duration_days || task.durationDays || 0;
                                    return (
                                        <div key={i} className="pd-gantt-row">
                                            <div className="pd-gantt-col-task"><span className="pd-gantt-task-id">T{i+1}</span>{name}</div>
                                            <div className="pd-gantt-col">{dur}d</div>
                                            <div className="pd-gantt-col">{task.crew || '—'}</div>
                                            <div className="pd-gantt-col-bar">
                                                <div className="pd-gantt-bar" style={{ marginLeft: `${(task.es || i * 3) * 0.3}%`, width: `${Math.max(12, dur * 1.5)}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>
                                <p>No schedule data yet. Run the pipeline to generate.</p>
                                <Button variant="primary" onClick={handleRunFullPipeline} disabled={generating} style={{marginTop:12}}>
                                    {generating ? 'Generating...' : 'Generate Schedule'}
                                </Button>
                            </div>
                        )}
                        {totalTasks > 0 && (
                            <Link to="/scheduler" style={{display:'block',marginTop:16}}>
                                <Button variant="secondary">View Full Gantt Chart →</Button>
                            </Link>
                        )}
                    </div>
                )}

                {activeTab === 'cost' && (
                    <div className="pd-section pd-floorplan-placeholder">
                        <div className="pd-placeholder-content">
                            {project.cost ? (
                                <>
                                    <span className="pd-placeholder-icon" style={{color:'#10b981'}}>✓</span>
                                    <h3>Cost Estimation Ready</h3>
                                    <p>Total: {formatBudget(grandTotal)} | Cost/m²: ${getCost('cost_per_m2', 'costPerSqFt')?.toLocaleString() || '—'}</p>
                                    <Link to="/cost-estimator"><Button variant="primary">View Cost Breakdown →</Button></Link>
                                </>
                            ) : (
                                <>
                                    <span className="pd-placeholder-icon"><FiDollarSign size={48} /></span>
                                    <h3>Cost Estimation</h3>
                                    <p>AI-powered cost prediction with material breakdown</p>
                                    <Button variant="primary" onClick={handleRunFullPipeline} disabled={generating}>
                                        {generating ? 'Generating...' : 'Generate Cost Estimate'}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
