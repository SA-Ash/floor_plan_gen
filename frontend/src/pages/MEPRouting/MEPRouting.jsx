import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useActiveProject } from '../../hooks/useActiveProject';
import api from '../../services/api';
import { FiAlertCircle, FiLoader } from 'react-icons/fi';
import Button from '../../components/common/Button';
import './MEPRouting.css';

const SCALE = 25;
const PAD = 20;

export default function MEPRouting() {
    const { project, loadProject } = useActiveProject();
    const [showPlumbing, setShowPlumbing] = useState(true);
    const [showElectrical, setShowElectrical] = useState(true);
    const [showColumns, setShowColumns] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [plumbingRoutes, setPlumbingRoutes] = useState([]);
    const [electricalRoutes, setElectricalRoutes] = useState([]);
    const [columns, setColumns] = useState([]);
    const [rooms, setRooms] = useState([]);

    // Load project if none loaded
    useEffect(() => {
        if (!project) {
            (async () => {
                try {
                    const res = await api.get('/projects');
                    const completed = res.data.filter(p => p.status === 'completed');
                    if (completed.length > 0) await loadProject(completed[completed.length - 1].id);
                    else if (res.data.length > 0) await loadProject(res.data[res.data.length - 1].id);
                } catch (e) { console.error('MEP: no projects', e); }
            })();
        }
    }, []);

    // Parse project data into MEP rendering format
    useEffect(() => {
        if (!project) return;

        const mep = project.mep;
        const building = project.building;
        const structural = project.structural;

        // Parse MEP routes
        if (mep) {
            // Handle both formats: array of path arrays OR array of route objects
            if (mep.plumbing_routes?.length) {
                setPlumbingRoutes(mep.plumbing_routes.map((route, i) => {
                    // Route can be: [{path: [[x,y],...]}] or [[[x,y],...]]]
                    let points = [];
                    if (route.path) {
                        points = route.path.map(p => [p[0] * SCALE + PAD, p[1] * SCALE + PAD]);
                    } else if (Array.isArray(route[0])) {
                        points = route.map(p => [p[0] * SCALE + PAD, p[1] * SCALE + PAD]);
                    } else if (Array.isArray(route)) {
                        points = route.map(p => [(p[0] || 0) * SCALE + PAD, (p[1] || 0) * SCALE + PAD]);
                    }
                    return {
                        id: `p${i}`,
                        name: route.label || `Plumbing ${i + 1}`,
                        type: route.type || 'plumbing',
                        color: '#06d6a0',
                        waypoints: points.length,
                        points
                    };
                }));
            }

            if (mep.electrical_routes?.length) {
                setElectricalRoutes(mep.electrical_routes.map((route, i) => {
                    let points = [];
                    if (route.path) {
                        points = route.path.map(p => [p[0] * SCALE + PAD, p[1] * SCALE + PAD]);
                    } else if (Array.isArray(route[0])) {
                        points = route.map(p => [p[0] * SCALE + PAD, p[1] * SCALE + PAD]);
                    } else if (Array.isArray(route)) {
                        points = route.map(p => [(p[0] || 0) * SCALE + PAD, (p[1] || 0) * SCALE + PAD]);
                    }
                    return {
                        id: `e${i}`,
                        name: route.label || `Circuit ${i + 1}`,
                        type: route.type || 'electrical',
                        color: '#f59e0b',
                        waypoints: points.length,
                        points
                    };
                }));
            }
        }

        // Parse rooms from building floor_1
        if (building && building['floor_1']) {
            setRooms(building['floor_1'].map(r => ({
                name: (r.room || '').replace(/_/g, ' '),
                x: (r.x || 0) * SCALE + PAD,
                y: (r.y || 0) * SCALE + PAD,
                w: (r.w || 3) * SCALE,
                h: (r.h || 3) * SCALE
            })));
        }

        // Parse columns
        if (structural && structural['floor_1']?.columns) {
            setColumns(structural['floor_1'].columns.map(c => [
                (Array.isArray(c) ? c[0] : 0) * SCALE + PAD,
                (Array.isArray(c) ? c[1] : 0) * SCALE + PAD
            ]));
        }

        console.log('[MEPRouting] Loaded from project:', project.id);
    }, [project]);

    const maxW = Math.max(540, ...rooms.map(r => r.x + r.w + 40), ...(plumbingRoutes.flatMap(r => r.points.map(p => p[0] + 40))), ...(electricalRoutes.flatMap(r => r.points.map(p => p[0] + 40))));
    const maxH = Math.max(390, ...rooms.map(r => r.y + r.h + 40), ...(plumbingRoutes.flatMap(r => r.points.map(p => p[1] + 40))), ...(electricalRoutes.flatMap(r => r.points.map(p => p[1] + 40))));

    // No project or no MEP data
    if (!project || (!project.mep && !project.building)) {
        return (
            <div className="mep-routing fade-in">
                <div className="mep-header">
                    <div><h1 className="mep-title">MEP Routing</h1></div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:400,gap:16}}>
                    <FiAlertCircle size={48} style={{color:'#f59e0b'}} />
                    <h3 style={{color:'white',margin:0}}>No MEP Data Available</h3>
                    <p style={{color:'#94a3b8',margin:0}}>Run the AI pipeline to generate MEP routing.</p>
                    <Link to="/dashboard"><Button variant="primary">Go to Dashboard</Button></Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mep-routing fade-in">
            <div className="mep-header">
                <div>
                    <h1 className="mep-title">MEP Routing</h1>
                    <p className="mep-subtitle">Mechanical, Electrical & Plumbing systems routed via Dijkstra/A* avoiding structural columns</p>
                </div>
                <div className="mep-toggles">
                    <button className={`mep-toggle-btn mep-toggle-plumbing ${showPlumbing ? 'active' : ''}`} onClick={() => setShowPlumbing(!showPlumbing)}>
                        <span className="mep-toggle-dot" style={{ background: '#06d6a0' }} /> Plumbing
                    </button>
                    <button className={`mep-toggle-btn mep-toggle-electrical ${showElectrical ? 'active' : ''}`} onClick={() => setShowElectrical(!showElectrical)}>
                        <span className="mep-toggle-dot" style={{ background: '#f59e0b' }} /> Electrical
                    </button>
                    <button className={`mep-toggle-btn mep-toggle-columns ${showColumns ? 'active' : ''}`} onClick={() => setShowColumns(!showColumns)}>
                        <span className="mep-toggle-dot" style={{ background: '#64748b' }} /> Columns
                    </button>
                </div>
            </div>

            <div className="mep-layout">
                <div className="mep-canvas glass">
                    <div className="mep-canvas-header">
                        <span className="mep-canvas-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /><line x1="10" y1="2" x2="10" y2="22" /></svg>
                            Floor 1 — MEP Overlay
                        </span>
                        <div className="mep-canvas-legend">
                            <span className="mep-legend-item"><span className="mep-legend-line" style={{ borderColor: '#06d6a0' }} /> Plumbing</span>
                            <span className="mep-legend-item"><span className="mep-legend-line" style={{ borderColor: '#f59e0b' }} /> Electrical</span>
                        </div>
                    </div>
                    <svg viewBox={`0 0 ${maxW} ${maxH}`} className="mep-svg">
                        <defs>
                            <marker id="arrow-plumb" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="#06d6a0" />
                            </marker>
                            <marker id="arrow-elec" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
                            </marker>
                        </defs>

                        <rect x="20" y="20" width={maxW - 40} height={maxH - 40} fill="none" stroke="#1e3a5f" strokeWidth="2.5" rx="3" />

                        {rooms.map((r, i) => (
                            <g key={i}>
                                <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="rgba(59,130,246,0.04)" stroke="#1e3a5f" strokeWidth="1" strokeDasharray="3" />
                                <text x={r.x + r.w / 2} y={r.y + r.h / 2} textAnchor="middle" fill="#4a6a8a" fontSize="10" fontFamily="Inter">{r.name}</text>
                            </g>
                        ))}

                        {showColumns && columns.map(([x, y], i) => (
                            <g key={i}>
                                <rect x={x - 5} y={y - 5} width={10} height={10} fill="rgba(100,116,139,0.4)" stroke="#64748b" strokeWidth="1" />
                            </g>
                        ))}

                        {showPlumbing && plumbingRoutes.map(route => route.points.length >= 2 && (
                            <g key={route.id} className={`mep-route ${selectedRoute === route.id ? 'mep-route-selected' : ''}`} onClick={() => setSelectedRoute(route.id)}>
                                <polyline
                                    points={route.points.map(p => p.join(',')).join(' ')}
                                    fill="none" stroke={route.color} strokeWidth={selectedRoute === route.id ? 3 : 2}
                                    strokeDasharray="8 4" markerEnd="url(#arrow-plumb)" opacity={selectedRoute && selectedRoute !== route.id ? 0.3 : 1}
                                />
                                {route.points.map(([x, y], i) => (
                                    <circle key={i} cx={x} cy={y} r={3} fill={route.color} opacity={selectedRoute && selectedRoute !== route.id ? 0.3 : 1} />
                                ))}
                            </g>
                        ))}

                        {showElectrical && electricalRoutes.map(route => route.points.length >= 2 && (
                            <g key={route.id} className={`mep-route ${selectedRoute === route.id ? 'mep-route-selected' : ''}`} onClick={() => setSelectedRoute(route.id)}>
                                <polyline
                                    points={route.points.map(p => p.join(',')).join(' ')}
                                    fill="none" stroke={route.color} strokeWidth={selectedRoute === route.id ? 3 : 2}
                                    strokeDasharray="4 6" markerEnd="url(#arrow-elec)" opacity={selectedRoute && selectedRoute !== route.id ? 0.3 : 1}
                                />
                                {route.points.map(([x, y], i) => (
                                    <circle key={i} cx={x} cy={y} r={3} fill={route.color} opacity={selectedRoute && selectedRoute !== route.id ? 0.3 : 1} />
                                ))}
                            </g>
                        ))}
                    </svg>
                </div>

                <aside className="mep-info">
                    <div className="mep-info-section glass">
                        <h3 className="mep-info-title">ROUTING ALGORITHM</h3>
                        <div className="mep-algo-item">
                            <span className="mep-algo-dot" style={{ background: '#06d6a0' }} />
                            <div><strong>Plumbing</strong><p>A* on weighted grid. Avoids columns, prefers wet rooms.</p></div>
                        </div>
                        <div className="mep-algo-item">
                            <span className="mep-algo-dot" style={{ background: '#f59e0b' }} />
                            <div><strong>Electrical</strong><p>Dijkstra shortest path. Minimizes wire length.</p></div>
                        </div>
                    </div>

                    <div className="mep-info-section glass">
                        <h3 className="mep-info-title"><span className="mep-info-dot" style={{ background: '#06d6a0' }} /> Plumbing ({plumbingRoutes.length})</h3>
                        {plumbingRoutes.map(r => (
                            <button key={r.id} className={`mep-route-btn ${selectedRoute === r.id ? 'active' : ''}`} onClick={() => setSelectedRoute(selectedRoute === r.id ? null : r.id)}>
                                <strong>{r.name}</strong>
                                <span>{r.waypoints} waypoints</span>
                            </button>
                        ))}
                        {plumbingRoutes.length === 0 && <p style={{color:'#94a3b8',fontSize:12}}>No plumbing routes generated</p>}
                    </div>

                    <div className="mep-info-section glass">
                        <h3 className="mep-info-title"><span className="mep-info-dot" style={{ background: '#f59e0b' }} /> Electrical ({electricalRoutes.length})</h3>
                        {electricalRoutes.map(r => (
                            <button key={r.id} className={`mep-route-btn ${selectedRoute === r.id ? 'active' : ''}`} onClick={() => setSelectedRoute(selectedRoute === r.id ? null : r.id)}>
                                <strong>{r.name}</strong>
                                <span>{r.waypoints} waypoints</span>
                            </button>
                        ))}
                        {electricalRoutes.length === 0 && <p style={{color:'#94a3b8',fontSize:12}}>No electrical routes generated</p>}
                    </div>

                    <div className="mep-info-hint">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                        Click any route on the map or list to highlight it.
                    </div>
                </aside>
            </div>
        </div>
    );
}
