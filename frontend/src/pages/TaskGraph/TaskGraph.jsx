import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useActiveProject } from '../../hooks/useActiveProject';
import api from '../../services/api';
import { FiAlertCircle } from 'react-icons/fi';
import Button from '../../components/common/Button';
import './TaskGraph.css';

const catColors = {
    prep: '#ef4444', foundation: '#f59e0b', structure: '#eab308',
    masonry: '#a855f7', mep: '#22c55e', finishing: '#ec4899', completion: '#f97316',
    civil: '#3b82f6', structural: '#eab308', electrical: '#f59e0b',
};

function classifyCat(taskName, crew) {
    const n = (taskName || '').toLowerCase();
    const c = (crew || '').toLowerCase();
    if (n.includes('site') || n.includes('survey')) return 'prep';
    if (n.includes('foundation') || n.includes('excavat') || n.includes('waterproof')) return 'foundation';
    if (n.includes('column') || n.includes('beam') || n.includes('slab') || n.includes('stair') || n.includes('elevator') || n.includes('roof') || c === 'structural') return 'structure';
    if (n.includes('wall') || n.includes('masonry') || n.includes('plaster')) return 'masonry';
    if (n.includes('plumb') || n.includes('elec') || n.includes('hvac') || n.includes('mep') || n.includes('sewer') || c === 'mep' || c === 'electrical') return 'mep';
    if (n.includes('floor') || n.includes('paint') || n.includes('door') || n.includes('window') || n.includes('ceil') || n.includes('kitchen') || n.includes('bath') || n.includes('landscap') || c === 'finishing') return 'finishing';
    if (n.includes('handover') || n.includes('inspect') || n.includes('final') || n.includes('testing')) return 'completion';
    return 'finishing';
}

export default function TaskGraph() {
    const { project, loadProject } = useActiveProject();
    const [showCritical, setShowCritical] = useState(true);
    const [showOther, setShowOther] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [tasks, setTasks] = useState([]);

    useEffect(() => {
        if (!project) {
            (async () => {
                try {
                    const res = await api.get('/projects');
                    const completed = res.data.filter(p => p.status === 'completed');
                    if (completed.length) await loadProject(completed[completed.length - 1].id);
                    else if (res.data.length) await loadProject(res.data[res.data.length - 1].id);
                } catch (e) { console.error('TaskGraph: no projects', e); }
            })();
        }
    }, []);

    useEffect(() => {
        if (!project) return;
        const aiTasks = project.tasks || [];
        const aiSched = project.schedule?.tasks || [];

        if (aiTasks.length > 0) {
            const taskNameToIndex = {};
            aiTasks.forEach((t, i) => { taskNameToIndex[t.task] = i; });

            const mapped = aiTasks.map((t, i) => {
                const name = (t.task || '').replace(/_/g, ' ');
                const cat = classifyCat(t.task, t.crew);
                const deps = (t.depends || []).map(d => taskNameToIndex[d]).filter(idx => idx !== undefined);
                const sNode = aiSched.find(st => st.task === t.task) || {};

                // Layout: arrange in columns of 5
                const col = Math.floor(i / 5);
                const row = i % 5;

                return {
                    id: i,
                    taskName: t.task,
                    name: name.length > 18 ? name.slice(0, 16) + '…' : name,
                    cat,
                    duration: `${t.duration_days || 0}d`,
                    durationDays: t.duration_days || 0,
                    deps,
                    crew: t.crew || '',
                    workers: t.workers || 0,
                    cost: t.cost_usd || 0,
                    critical: sNode.on_critical_path || false,
                    x: 40 + col * 160,
                    y: 50 + row * 78,
                };
            });
            setTasks(mapped);
            console.log('[TaskGraph] Loaded', mapped.length, 'tasks');
        }
    }, [project]);

    const getCatColor = (catId) => catColors[catId] || '#64748b';
    const nodeW = 120, nodeH = 44;

    // Compute category counts
    const catCounts = {};
    tasks.forEach(t => { catCounts[t.cat] = (catCounts[t.cat] || 0) + 1; });

    if (!project || tasks.length === 0) {
        return (
            <div className="task-graph fade-in">
                <div className="tg-header">
                    <h1 className="tg-title">Task Dependency Graph</h1>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:400,gap:16}}>
                    <FiAlertCircle size={48} style={{color:'#f59e0b'}} />
                    <h3 style={{color:'white',margin:0}}>No Task Data</h3>
                    <p style={{color:'#94a3b8',margin:0}}>Run the AI pipeline to generate construction tasks.</p>
                    <Link to="/dashboard"><Button variant="primary">Go to Dashboard</Button></Link>
                </div>
            </div>
        );
    }

    const svgW = Math.max(800, 80 + Math.ceil(tasks.length / 5) * 160);
    const svgH = Math.max(460, 50 + 5 * 78 + 40);

    return (
        <div className="task-graph fade-in">
            <div className="tg-header">
                <h1 className="tg-title">Task Dependency Graph</h1>
                <p className="tg-subtitle">NetworkX DAG — {tasks.length} construction tasks with critical path analysis</p>
            </div>

            <div className="tg-layout">
                <div className="tg-canvas glass">
                    <div className="tg-canvas-header">
                        <span className="tg-canvas-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                            Dependency DAG — {tasks.length} Tasks
                        </span>
                        <div className="tg-canvas-toggles">
                            <label className="tg-check"><input type="checkbox" checked={showCritical} onChange={() => setShowCritical(!showCritical)} /><span className="tg-check-dot" style={{ background: '#ef4444' }} /> Critical Path</label>
                            <label className="tg-check"><input type="checkbox" checked={showOther} onChange={() => setShowOther(!showOther)} /><span className="tg-check-dot" style={{ background: '#64748b' }} /> Other Tasks</label>
                        </div>
                    </div>
                    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="tg-svg">
                        <defs>
                            <marker id="tg-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#4a6a8a" /></marker>
                            <marker id="tg-arrow-crit" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#ef4444" /></marker>
                        </defs>
                        {/* Edges */}
                        {tasks.map(task =>
                            task.deps.map(depId => {
                                const dep = tasks.find(t => t.id === depId);
                                if (!dep) return null;
                                const isCrit = task.critical && dep.critical;
                                const show = isCrit ? showCritical : showOther;
                                if (!show) return null;
                                return (
                                    <line key={`${depId}-${task.id}`} x1={dep.x + nodeW} y1={dep.y + nodeH / 2}
                                        x2={task.x} y2={task.y + nodeH / 2}
                                        stroke={isCrit ? '#ef4444' : '#2a3f5f'} strokeWidth={isCrit ? 2 : 1.5}
                                        markerEnd={isCrit ? 'url(#tg-arrow-crit)' : 'url(#tg-arrow)'}
                                        opacity={isCrit ? 1 : 0.5}
                                    />
                                );
                            })
                        )}
                        {/* Nodes */}
                        {tasks.map(task => {
                            const show = task.critical ? showCritical : showOther;
                            if (!show) return null;
                            const col = getCatColor(task.cat);
                            const isSelected = selectedTask === task.id;
                            return (
                                <g key={task.id} className="tg-node" onClick={() => setSelectedTask(isSelected ? null : task.id)} style={{ cursor: 'pointer' }}>
                                    <rect x={task.x} y={task.y} width={nodeW} height={nodeH} rx={6}
                                        fill={isSelected ? col : `${col}22`} stroke={col} strokeWidth={isSelected ? 2.5 : 1.5} />
                                    <text x={task.x + nodeW / 2} y={task.y + 17} textAnchor="middle" fill={isSelected ? '#fff' : '#e2e8f0'} fontSize="10" fontWeight="600" fontFamily="Inter">{task.name}</text>
                                    <text x={task.x + nodeW / 2} y={task.y + 33} textAnchor="middle" fill={isSelected ? 'rgba(255,255,255,0.7)' : '#64748b'} fontSize="8.5" fontFamily="Inter">{task.duration} · {task.crew}</text>
                                </g>
                            );
                        })}
                    </svg>
                </div>

                <aside className="tg-info">
                    {selectedTask !== null && (() => {
                        const t = tasks.find(tt => tt.id === selectedTask);
                        if (!t) return null;
                        return (
                            <div className="tg-info-section glass" style={{borderLeft: `3px solid ${getCatColor(t.cat)}`}}>
                                <h3 className="tg-info-title">SELECTED TASK</h3>
                                <div style={{color:'#e2e8f0',fontSize:13,marginBottom:8}}><strong>{t.name}</strong></div>
                                <div style={{color:'#94a3b8',fontSize:11,lineHeight:1.8}}>
                                    Duration: {t.duration}<br/>
                                    Crew: {t.crew}<br/>
                                    Workers: {t.workers}<br/>
                                    Cost: ${t.cost.toLocaleString()}<br/>
                                    Critical: {t.critical ? '✓ Yes' : 'No'}<br/>
                                    Dependencies: {t.deps.length}
                                </div>
                            </div>
                        );
                    })()}
                    <div className="tg-info-section glass">
                        <h3 className="tg-info-title">CATEGORIES</h3>
                        {Object.entries(catCounts).map(([cat, count]) => (
                            <div key={cat} className="tg-cat-row">
                                <span className="tg-cat-dot" style={{ background: getCatColor(cat) }} />
                                <span className="tg-cat-label">{cat}</span>
                                <span className="tg-cat-count">{count}</span>
                            </div>
                        ))}
                    </div>
                    <div className="tg-info-hint">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                        Red edges = Critical Path. Click a node for details.
                    </div>
                </aside>
            </div>
        </div>
    );
}
