import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useActiveProject } from '../../hooks/useActiveProject';
import api from '../../services/api';
import { FiAlertCircle } from 'react-icons/fi';
import Button from '../../components/common/Button';
import './Scheduler.css';

const phases = ['All', 'Prep', 'Foundation', 'Structure', 'Masonry', 'Mep', 'Finishing', 'Completion'];
const phaseColors = { Prep: '#ef4444', Foundation: '#f59e0b', Structure: '#eab308', Masonry: '#a855f7', Mep: '#22c55e', Finishing: '#ec4899', Completion: '#f97316' };

/** Map crew/task name to phase category */
function classifyPhase(taskName, crew) {
    const n = (taskName || '').toLowerCase();
    const c = (crew || '').toLowerCase();
    if (n.includes('site') || n.includes('survey')) return 'Prep';
    if (n.includes('foundation') || n.includes('excavat') || n.includes('waterproof')) return 'Foundation';
    if (n.includes('column') || n.includes('beam') || n.includes('slab') || n.includes('stair') || n.includes('elevator') || n.includes('roof') || c === 'structural') return 'Structure';
    if (n.includes('wall') || n.includes('masonry') || n.includes('plaster')) return 'Masonry';
    if (n.includes('plumb') || n.includes('elec') || n.includes('hvac') || n.includes('mep') || n.includes('sewer') || c === 'mep' || c === 'electrical') return 'Mep';
    if (n.includes('floor') || n.includes('paint') || n.includes('door') || n.includes('window') || n.includes('ceil') || n.includes('kitchen') || n.includes('bath') || n.includes('landscap') || n.includes('external') || c === 'finishing') return 'Finishing';
    if (n.includes('handover') || n.includes('inspect') || n.includes('final') || n.includes('testing')) return 'Completion';
    return 'Finishing';
}

export default function Scheduler() {
    const { project, loadProject } = useActiveProject();
    const [activePhase, setActivePhase] = useState('All');
    const [scheduleTasks, setScheduleTasks] = useState([]);
    const [scheduleStats, setScheduleStats] = useState({});

    // Auto-load if no project
    useEffect(() => {
        if (!project) {
            (async () => {
                try {
                    const res = await api.get('/projects');
                    const completed = res.data.filter(p => p.status === 'completed');
                    if (completed.length) await loadProject(completed[completed.length - 1].id);
                    else if (res.data.length) await loadProject(res.data[res.data.length - 1].id);
                } catch (e) { console.error('Scheduler: no projects', e); }
            })();
        }
    }, []);

    // Parse schedule data from project
    useEffect(() => {
        if (!project) return;
        const aiSched = project.schedule;

        if (aiSched?.tasks?.length) {
            const parsed = aiSched.tasks.map((t, i) => {
                const name = (t.task || t.name || `Task ${i}`).replace(/_/g, ' ');
                return {
                    id: t.task || i,
                    name: name.length > 25 ? name.slice(0, 22) + '…' : name,
                    phase: classifyPhase(t.task || t.name, t.crew),
                    start: t.es || 0,
                    end: t.ef || (t.es || 0) + (t.duration_days || 0),
                    duration: t.duration_days || 0,
                    critical: t.on_critical_path || false,
                    crew: t.crew || '',
                    workers: t.workers || 0,
                };
            });
            setScheduleTasks(parsed);
            setScheduleStats({
                totalDuration: aiSched.project_duration_days || 0,
                pertP50: aiSched.pert_p50_days || 0,
                pertP90: aiSched.pert_p90_days || 0,
                peakWorkers: aiSched.worker_peak || 0,
                totalCost: aiSched.total_cost_usd || 0,
            });
            console.log('[Scheduler] Loaded', parsed.length, 'tasks from project:', project.id);
        }
    }, [project]);

    // No data view
    if (!project || scheduleTasks.length === 0) {
        return (
            <div className="scheduler fade-in">
                <div className="sch-header">
                    <div><h1 className="sch-title">Project Scheduler</h1></div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:400,gap:16}}>
                    <FiAlertCircle size={48} style={{color:'#f59e0b'}} />
                    <h3 style={{color:'white',margin:0}}>No Schedule Data</h3>
                    <p style={{color:'#94a3b8',margin:0}}>Run the AI pipeline to generate a construction schedule.</p>
                    <Link to="/dashboard"><Button variant="primary">Go to Dashboard</Button></Link>
                </div>
            </div>
        );
    }

    const totalDuration = Math.max(1, scheduleTasks.reduce((max, t) => Math.max(max, t.end || 0), 0));
    const criticalTasks = scheduleTasks.filter(t => t.critical);
    const filteredTasks = activePhase === 'All' ? scheduleTasks : scheduleTasks.filter(t => t.phase === activePhase);
    const dayMarkers = Array.from({ length: 11 }, (_, i) => Math.round((i / 10) * totalDuration));
    const phaseTotals = phases.slice(1).map(p => ({
        phase: p,
        total: scheduleTasks.filter(t => t.phase === p).reduce((s, t) => s + t.duration, 0) + 'd'
    }));

    return (
        <div className="scheduler fade-in">
            <div className="sch-header">
                <div>
                    <h1 className="sch-title">Project Scheduler</h1>
                    <p className="sch-subtitle">CPM/PERT · Duration: {totalDuration} days · {scheduleTasks.length} tasks</p>
                </div>
                <div className="sch-phase-filters">
                    {phases.map(p => (
                        <button key={p} className={`sch-phase-btn ${activePhase === p ? 'active' : ''}`}
                            style={activePhase === p && p !== 'All' ? { background: phaseColors[p] + '22', borderColor: phaseColors[p], color: phaseColors[p] } : {}}
                            onClick={() => setActivePhase(p)}>{p}</button>
                    ))}
                </div>
            </div>

            <div className="sch-stats">
                <div className="sch-stat glass"><div className="sch-stat-label">TOTAL DURATION</div><div className="sch-stat-value" style={{ color: '#06d6a0' }}>{totalDuration} days</div></div>
                <div className="sch-stat glass"><div className="sch-stat-label">CRITICAL TASKS</div><div className="sch-stat-value">{criticalTasks.length}</div></div>
                <div className="sch-stat glass"><div className="sch-stat-label">TOTAL TASKS</div><div className="sch-stat-value">{scheduleTasks.length}</div></div>
                <div className="sch-stat glass"><div className="sch-stat-label">PEAK WORKERS</div><div className="sch-stat-value" style={{ color: '#a855f7' }}>{scheduleStats.peakWorkers || '—'}</div></div>
            </div>

            <div className="sch-layout">
                <div className="sch-gantt glass">
                    <div className="sch-gantt-header-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                        Gantt Chart — {filteredTasks.length} tasks
                    </div>
                    <div className="sch-gantt-scroll">
                        <div className="sch-gantt-table">
                            <div className="sch-gantt-row sch-gantt-row-header">
                                <div className="sch-gantt-task-col">Task</div>
                                <div className="sch-gantt-bar-col">
                                    {dayMarkers.map(d => (
                                        <span key={d} className="sch-day-label" style={{ left: `${(d / totalDuration) * 100}%` }}>Day {d}</span>
                                    ))}
                                </div>
                            </div>
                            {filteredTasks.map(task => (
                                <div key={task.id} className={`sch-gantt-row ${task.critical ? 'sch-gantt-row-critical' : ''}`}>
                                    <div className="sch-gantt-task-col">
                                        {task.critical && <span className="sch-crit-dot" />}
                                        {task.name}
                                    </div>
                                    <div className="sch-gantt-bar-col">
                                        <div className="sch-gantt-bar"
                                            style={{
                                                left: `${(task.start / totalDuration) * 100}%`,
                                                width: `${Math.max(1, (task.duration / totalDuration) * 100)}%`,
                                                background: phaseColors[task.phase] || '#64748b',
                                            }}>
                                            <span className="sch-gantt-bar-label">{task.duration}d</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <aside className="sch-sidebar">
                    <div className="sch-sidebar-section glass">
                        <h3 className="sch-sidebar-title"><span className="sch-sidebar-dot" style={{ background: '#ef4444' }} /> Critical Path</h3>
                        {criticalTasks.map((t, i) => (
                            <div key={t.id} className="sch-cp-item">
                                <span className="sch-cp-num">{i + 1}</span>
                                <span className="sch-cp-name">{t.name}</span>
                                <span className="sch-cp-arrow">›</span>
                            </div>
                        ))}
                        {criticalTasks.length === 0 && <p style={{color:'#94a3b8',fontSize:12}}>No critical path tasks</p>}
                    </div>
                    <div className="sch-sidebar-section glass">
                        <h3 className="sch-sidebar-title">PHASE LEGEND</h3>
                        {phaseTotals.map(p => (
                            <div key={p.phase} className="sch-legend-row">
                                <span className="sch-legend-dot" style={{ background: phaseColors[p.phase] }} />
                                <span className="sch-legend-label">{p.phase}</span>
                                <span className="sch-legend-total">{p.total}</span>
                            </div>
                        ))}
                    </div>
                    <div className="sch-sidebar-section glass">
                        <h3 className="sch-sidebar-title">CPM SUMMARY</h3>
                        <div className="sch-cpm-row"><span>Duration</span><strong style={{ color: '#06d6a0' }}>{totalDuration} days</strong></div>
                        <div className="sch-cpm-row"><span>PERT P50</span><strong>{scheduleStats.pertP50 || '—'} days</strong></div>
                        <div className="sch-cpm-row"><span>PERT P90</span><strong style={{ color: '#f59e0b' }}>{scheduleStats.pertP90 || '—'} days</strong></div>
                        <div className="sch-cpm-row"><span>Total Cost</span><strong>${(scheduleStats.totalCost || 0).toLocaleString()}</strong></div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
