import React, { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useActiveProject } from '../../hooks/useActiveProject';
import Button from '../../components/common/Button';
import api from '../../services/api';
import { FiGrid, FiZoomIn, FiZoomOut, FiRotateCw, FiLoader, FiAlertCircle } from 'react-icons/fi';
import './FloorPlanViewer.css';

const ROOM_COLORS = {
    entrance:       { fill: 'rgba(251,191,36,0.18)',  border: '#fbbf24' },
    corridor:       { fill: 'rgba(148,163,184,0.08)', border: '#475569' },
    living_room:    { fill: 'rgba(16,185,129,0.15)',  border: '#10b981' },
    living:         { fill: 'rgba(16,185,129,0.15)',  border: '#10b981' },
    kitchen:        { fill: 'rgba(245,158,11,0.15)',  border: '#f59e0b' },
    dining_room:    { fill: 'rgba(139,92,246,0.15)',  border: '#8b5cf6' },
    dining:         { fill: 'rgba(139,92,246,0.15)',  border: '#8b5cf6' },
    master_bedroom: { fill: 'rgba(59,130,246,0.18)',  border: '#3b82f6' },
    bedroom:        { fill: 'rgba(59,130,246,0.12)',  border: '#3b82f6' },
    guest_room:     { fill: 'rgba(59,130,246,0.10)',  border: '#60a5fa' },
    bathroom:       { fill: 'rgba(139,92,246,0.12)',  border: '#8b5cf6' },
    study:          { fill: 'rgba(168,85,247,0.12)',  border: '#a855f7' },
    home_office:    { fill: 'rgba(168,85,247,0.12)',  border: '#a855f7' },
    parking:        { fill: 'rgba(100,116,139,0.12)', border: '#64748b' },
    garage:         { fill: 'rgba(100,116,139,0.12)', border: '#64748b' },
    staircase:      { fill: 'rgba(245,158,11,0.10)',  border: '#f59e0b' },
    elevator:       { fill: 'rgba(234,179,8,0.10)',   border: '#eab308' },
    balcony:        { fill: 'rgba(6,214,160,0.10)',   border: '#06d6a0' },
    terrace:        { fill: 'rgba(6,214,160,0.10)',   border: '#06d6a0' },
    gym:            { fill: 'rgba(239,68,68,0.10)',   border: '#ef4444' },
    laundry:        { fill: 'rgba(148,163,184,0.12)', border: '#94a3b8' },
    storage:        { fill: 'rgba(148,163,184,0.10)', border: '#94a3b8' },
};

const DEFAULT_COLOR = { fill: 'rgba(100,116,139,0.12)', border: '#64748b' };
const SCALE = 25; // pixels per grid unit
const PAD = 40;   // canvas padding

export default function FloorPlanViewer() {
    const { project, loadProject } = useActiveProject();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [floors, setFloors] = useState([]);
    const [selectedFloor, setSelectedFloor] = useState(0);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [showGrid, setShowGrid] = useState(true);
    const [showStructural, setShowStructural] = useState(false);
    const [showLabels, setShowLabels] = useState(true);
    const [viewMode, setViewMode] = useState('2d');
    const [noData, setNoData] = useState(false);
    const canvasRef = useRef(null);

    // Load project from context or URL or find latest
    useEffect(() => {
        const init = async () => {
            const paramId = searchParams.get('projectId');

            if (paramId) {
                await loadProject(paramId);
            } else if (!project) {
                // Find latest completed project
                try {
                    const res = await api.get('/projects');
                    const completed = res.data.filter(p => p.status === 'completed');
                    if (completed.length > 0) {
                        await loadProject(completed[completed.length - 1].id);
                    } else if (res.data.length > 0) {
                        await loadProject(res.data[res.data.length - 1].id);
                    } else {
                        setNoData(true);
                    }
                } catch (e) {
                    setNoData(true);
                }
            }
        };
        init();
    }, []);

    // Convert project building data to renderable floors
    useEffect(() => {
        if (!project?.building) {
            setFloors([]);
            return;
        }

        const buildingData = project.building;
        const structuralData = project.structural;

        const rendered = Object.entries(buildingData).map(([key, rooms]) => ({
            name: key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
            key,
            rooms: (rooms || []).map((r, ri) => {
                const colors = ROOM_COLORS[r.room] || DEFAULT_COLOR;
                return {
                    id: `room-${ri}`,
                    name: r.room.replace(/_/g, ' ').toUpperCase(),
                    roomType: r.room,
                    x: r.x * SCALE + PAD,
                    y: r.y * SCALE + PAD,
                    w: r.w * SCALE,
                    h: r.h * SCALE,
                    rawW: r.w,
                    rawH: r.h,
                    color: colors.fill,
                    border: colors.border,
                    structural: r.structural || false,
                };
            }),
            columns: structuralData?.[key]?.columns?.map(c => ({
                x: (Array.isArray(c) ? c[0] : c.x || 0) * SCALE + PAD,
                y: (Array.isArray(c) ? c[1] : c.y || 0) * SCALE + PAD,
            })) || []
        }));

        if (rendered.length > 0) {
            setFloors(rendered);
            setSelectedFloor(0);
            setSelectedRoom(null);
            console.log('[FloorPlanViewer] Loaded', rendered.length, 'floors from project:', project.id);
        }
    }, [project]);

    const floor = floors[selectedFloor];

    // Draw the floor plan
    useEffect(() => {
        if (!floor) return;
        drawFloorPlan();
    }, [selectedFloor, showGrid, showStructural, showLabels, selectedRoom, floors]);

    const drawFloorPlan = () => {
        const canvas = canvasRef.current;
        if (!canvas || !floor) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        // Compute dynamic canvas size from room bounds
        let maxX = 0, maxY = 0;
        floor.rooms.forEach(r => {
            if (r.x + r.w > maxX) maxX = r.x + r.w;
            if (r.y + r.h > maxY) maxY = r.y + r.h;
        });
        const canvasW = Math.max(600, maxX + PAD + 20);
        const canvasH = Math.max(380, maxY + PAD + 20);

        canvas.width = canvasW * dpr;
        canvas.height = canvasH * dpr;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, canvasW, canvasH);

        // Background grid
        if (showGrid) {
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.lineWidth = 0.5;
            for (let x = 0; x <= canvasW; x += SCALE) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasH); ctx.stroke();
            }
            for (let y = 0; y <= canvasH; y += SCALE) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasW, y); ctx.stroke();
            }
        }

        // Building boundary
        if (maxX > 0 && maxY > 0) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(PAD - 2, PAD - 2, maxX - PAD + 4, maxY - PAD + 4);
        }

        // Draw rooms
        floor.rooms.forEach(room => {
            const isSelected = selectedRoom === room.id;

            // Room fill
            ctx.fillStyle = isSelected ? room.color.replace(/[\d.]+\)$/, '0.3)') : room.color;
            ctx.fillRect(room.x, room.y, room.w, room.h);

            // Room border
            ctx.strokeStyle = isSelected ? room.border : room.border + '80';
            ctx.lineWidth = isSelected ? 2.5 : 1;
            ctx.setLineDash(isSelected ? [] : [4, 4]);
            ctx.strokeRect(room.x, room.y, room.w, room.h);
            ctx.setLineDash([]);

            // Labels
            if (showLabels && room.w > 30 && room.h > 20) {
                ctx.fillStyle = '#e2e8f0';
                ctx.font = `${Math.min(12, room.w / 6)}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const label = room.name.length > 14 ? room.name.slice(0, 12) + '…' : room.name;
                ctx.fillText(label, room.x + room.w / 2, room.y + room.h / 2 - 6);

                ctx.fillStyle = '#94a3b8';
                ctx.font = '9px Inter, sans-serif';
                ctx.fillText(`${room.rawW}×${room.rawH}`, room.x + room.w / 2, room.y + room.h / 2 + 10);
            }
        });

        // Structural columns
        if (showStructural && floor.columns) {
            floor.columns.forEach(col => {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
                ctx.fillRect(col.x - 4, col.y - 4, 8, 8);
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(col.x - 6, col.y - 6, 12, 12);
            });
        }

        // Compass
        ctx.fillStyle = '#64748b';
        ctx.font = '11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('N ↑', canvasW - 30, canvasH - 20);
    };

    const handleCanvasClick = (e) => {
        if (!floor) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / (window.devicePixelRatio || 1) / rect.width;
        const scaleY = canvasRef.current.height / (window.devicePixelRatio || 1) / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const clicked = floor.rooms.find(r =>
            x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
        );
        setSelectedRoom(clicked?.id || null);
    };

    // No data state
    if (noData || (!project && floors.length === 0)) {
        return (
            <div className="floorplan-viewer fade-in">
                <div className="fpv-header">
                    <h1 className="fpv-title">Floor Plan Viewer</h1>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:400,gap:16}}>
                    <FiAlertCircle size={48} style={{color:'#f59e0b'}} />
                    <h3 style={{color:'white',margin:0}}>No Project Data</h3>
                    <p style={{color:'#94a3b8',margin:0}}>Create a project and run the AI pipeline first.</p>
                    <Link to="/dashboard"><Button variant="primary">Go to Dashboard</Button></Link>
                </div>
            </div>
        );
    }

    if (!floor) {
        return (
            <div className="floorplan-viewer fade-in">
                <div className="fpv-header">
                    <h1 className="fpv-title">Floor Plan Viewer</h1>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:400}}>
                    <FiLoader className="spin" size={32} style={{color:'#3b82f6',marginBottom:16}} />
                    <h3 style={{color:'white'}}>Loading floor plan data...</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="floorplan-viewer fade-in">
            <div className="fpv-header">
                <h1 className="fpv-title">Floor Plan Viewer</h1>
                <div className="fpv-view-toggle">
                    <button className={`fpv-view-btn ${viewMode === '2d' ? 'active' : ''}`} onClick={() => setViewMode('2d')}>2D</button>
                    <button className={`fpv-view-btn`} onClick={() => navigate('/3d-viewer')}>3D</button>
                </div>
            </div>

            <div className="fpv-layout">
                <aside className="fpv-controls glass">
                    <div className="fpv-control-section">
                        <h3 className="fpv-control-title">Floors</h3>
                        {floors.map((f, i) => (
                            <button
                                key={i}
                                className={`fpv-floor-btn ${selectedFloor === i ? 'active' : ''}`}
                                onClick={() => { setSelectedFloor(i); setSelectedRoom(null); }}
                            >
                                <span className="fpv-floor-icon"><FiGrid size={16} /></span>
                                {f.name}
                            </button>
                        ))}
                    </div>

                    <div className="fpv-control-section">
                        <h3 className="fpv-control-title">Layers</h3>
                        <label className="fpv-toggle">
                            <input type="checkbox" checked={showGrid} onChange={() => setShowGrid(!showGrid)} />
                            <span className="fpv-toggle-slider" /> Grid
                        </label>
                        <label className="fpv-toggle">
                            <input type="checkbox" checked={showLabels} onChange={() => setShowLabels(!showLabels)} />
                            <span className="fpv-toggle-slider" /> Labels
                        </label>
                        <label className="fpv-toggle">
                            <input type="checkbox" checked={showStructural} onChange={() => setShowStructural(!showStructural)} />
                            <span className="fpv-toggle-slider" /> Structural Grid
                        </label>
                    </div>

                    {selectedRoom && (
                        <div className="fpv-control-section fpv-room-info slide-up">
                            <h3 className="fpv-control-title">Room Details</h3>
                            {(() => {
                                const room = floor.rooms.find(r => r.id === selectedRoom);
                                if (!room) return null;
                                return (
                                    <>
                                        <div className="fpv-info-row"><span>Name:</span><strong>{room.name}</strong></div>
                                        <div className="fpv-info-row"><span>Size:</span><span>{room.rawW} × {room.rawH} m</span></div>
                                        <div className="fpv-info-row"><span>Area:</span><span>{(room.rawW * room.rawH)} m²</span></div>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </aside>

                <main className="fpv-canvas-area">
                    {viewMode === '2d' ? (
                        <div className="fpv-canvas-wrapper glass">
                            <div className="fpv-canvas-toolbar">
                                <span className="fpv-floor-label">{floor.name} — {floor.rooms.filter(r => !r.structural).length} rooms</span>
                                <div className="fpv-canvas-actions">
                                    <Button variant="ghost" size="sm"><FiZoomIn size={16} /></Button>
                                    <Button variant="ghost" size="sm"><FiZoomOut size={16} /></Button>
                                    <Button variant="ghost" size="sm"><FiRotateCw size={16} /></Button>
                                </div>
                            </div>
                            <canvas
                                ref={canvasRef}
                                className="fpv-canvas"
                                onClick={handleCanvasClick}
                                style={{ width: '100%', height: 'auto', cursor: 'crosshair' }}
                            />
                            <div className="fpv-canvas-status">
                                <span>Project: {project?.name || '—'}</span>
                                <span>{project?.plotWidth}' × {project?.plotLength}'</span>
                                {selectedRoom && <span className="fpv-selected-badge">Selected: {floor.rooms.find(r => r.id === selectedRoom)?.name}</span>}
                            </div>
                        </div>
                    ) : (
                        <div className="fpv-3d-placeholder glass">
                            <div className="fpv-3d-content">
                                <div className="fpv-3d-cube">
                                    <div className="cube-face cube-front" />
                                    <div className="cube-face cube-back" />
                                    <div className="cube-face cube-left" />
                                    <div className="cube-face cube-right" />
                                    <div className="cube-face cube-top" />
                                    <div className="cube-face cube-bottom" />
                                </div>
                                <h3>3D Visualization</h3>
                                <p>Interactive Three.js 3D model viewer</p>
                            </div>
                        </div>
                    )}

                    <div className="fpv-legend">
                        {floor.rooms.filter(r => !r.structural).map(r => (
                            <button
                                key={r.id}
                                className={`fpv-legend-item ${selectedRoom === r.id ? 'active' : ''}`}
                                onClick={() => setSelectedRoom(selectedRoom === r.id ? null : r.id)}
                            >
                                <span className="fpv-legend-color" style={{ background: r.border }} />
                                {r.name}
                            </button>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}
