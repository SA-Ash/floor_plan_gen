import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Grid, Float, PerspectiveCamera, AccumulativeShadows, RandomizedLight } from '@react-three/drei';
import api from '../../services/api';
import { FiLoader, FiLayers, FiAlertCircle, FiMaximize, FiBox, FiSun, FiMoon } from 'react-icons/fi';
import { useActiveProject } from '../../hooks/useActiveProject';
import './Viewer3D.css';

const SCALE = 0.05;
const FLOOR_HEIGHT = 2.5;
const WALL_THICKNESS = 0.2;

// ── Realistic Room Component ───────────────────────────────────────
function Room({ room, floorY, isVisible }) {
    const width = room.w * SCALE;
    const depth = room.h * SCALE;
    const x = room.x * SCALE + width / 2;
    const z = room.y * SCALE + depth / 2;
    
    // Choose material based on room type
    const isWater = room.name.toLowerCase().includes('bath');
    const isAction = room.name.toLowerCase().includes('kitchen');
    const wallColor = '#f8fafc';
    const floorColor = isWater ? '#94a3b8' : isAction ? '#cbd5e1' : '#e2e8f0';

    if (!isVisible) return null;

    return (
        <group position={[x, floorY, z]}>
            {/* Floor Slab with texture feel */}
            <mesh position={[0, 0.05, 0]} receiveShadow>
                <boxGeometry args={[width - 0.02, 0.1, depth - 0.02]} />
                <meshStandardMaterial color={floorColor} roughness={0.7} metalness={0.1} />
            </mesh>

            {/* Translucent Walls with thickness */}
            <group>
                {/* Back Wall */}
                <mesh position={[0, FLOOR_HEIGHT / 2, -depth / 2 + WALL_THICKNESS / 2]} castShadow>
                    <boxGeometry args={[width, FLOOR_HEIGHT, WALL_THICKNESS]} />
                    <meshPhysicalMaterial color={wallColor} transparent opacity={0.9} roughness={0.3} />
                </mesh>
                {/* Front Wall (with cutout concept) */}
                <mesh position={[0, FLOOR_HEIGHT / 2, depth / 2 - WALL_THICKNESS / 2]} castShadow>
                    <boxGeometry args={[width * 0.7, FLOOR_HEIGHT, WALL_THICKNESS]} />
                    <meshPhysicalMaterial color={wallColor} transparent opacity={0.6} roughness={0.3} />
                </mesh>
                {/* Left Wall */}
                <mesh position={[-width / 2 + WALL_THICKNESS / 2, FLOOR_HEIGHT / 2, 0]} castShadow>
                    <boxGeometry args={[WALL_THICKNESS, FLOOR_HEIGHT, depth]} />
                    <meshPhysicalMaterial color={wallColor} transparent opacity={0.9} roughness={0.3} />
                </mesh>
                {/* Right Wall */}
                <mesh position={[width / 2 - WALL_THICKNESS / 2, FLOOR_HEIGHT / 2, 0]} castShadow>
                    <boxGeometry args={[WALL_THICKNESS, FLOOR_HEIGHT, depth]} />
                    <meshPhysicalMaterial color={wallColor} transparent opacity={0.9} roughness={0.3} />
                </mesh>
            </group>

            {/* Ceiling (Optional) */}
            <mesh position={[0, FLOOR_HEIGHT, 0]} receiveShadow>
                <boxGeometry args={[width, 0.05, depth]} />
                <meshStandardMaterial color={wallColor} transparent opacity={0.2} />
            </mesh>
        </group>
    );
}

function BuildingModel({ floors, visibleFloors }) {
    if (!floors || floors.length === 0) return null;

    // Use memoized center to avoid jumps
    const bounds = useMemo(() => {
        let minX = 0, minZ = 0, maxX = 0, maxZ = 0;
        floors.forEach(f => f.rooms.forEach(r => {
            maxX = Math.max(maxX, (r.x + r.w) * SCALE);
            maxZ = Math.max(maxZ, (r.y + r.h) * SCALE);
        }));
        return { x: maxX / 2, z: maxZ / 2 };
    }, [floors]);

    return (
        <group position={[-bounds.x, 0, -bounds.z]}>
            {floors.map((floor, floorIndex) => {
                const isVisible = visibleFloors >= floorIndex;
                if (!isVisible) return null;

                return (
                    <group key={floorIndex} position={[0, floorIndex * FLOOR_HEIGHT, 0]}>
                        {/* Structure: Rooms */}
                        {floor.rooms.map((room, i) => (
                            <Room key={i} room={room} floorY={0} isVisible={isVisible} />
                        ))}

                        {/* Structure: Columns */}
                        {floor.columns?.map((col, i) => (
                            <mesh key={`col-${i}`} position={[col.x * SCALE, FLOOR_HEIGHT / 2, col.y * SCALE]} castShadow>
                                <boxGeometry args={[0.4, FLOOR_HEIGHT, 0.4]} />
                                <meshPhysicalMaterial color="#475569" roughness={0.2} metalness={0.8} clearcoat={1} />
                            </mesh>
                        ))}
                    </group>
                );
            })}
        </group>
    );
}

export default function Viewer3D() {
    const { project, loadProject } = useActiveProject();
    const [floors, setFloors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleFloors, setVisibleFloors] = useState(99);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('realistic'); // realistic, blueprint

    useEffect(() => {
        if (!project) {
            (async () => {
                try {
                    const res = await api.get('/projects');
                    const completed = res.data.filter(p => p.status === 'completed');
                    if (completed.length) await loadProject(completed[completed.length - 1].id);
                    else if (res.data.length) await loadProject(res.data[res.data.length - 1].id);
                    else setLoading(false);
                } catch (e) { console.error('Viewer3D: no projects', e); setLoading(false); }
            })();
        }
    }, [project, loadProject]);

    useEffect(() => {
        if (!project) return;
        
        (async () => {
            try {
                if (project.building) {
                    const buildingData = project.building;
                    const structuralData = project.structural;
                    const apiFloors = Object.entries(buildingData).map(([key, rooms]) => ({
                        name: key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
                        rooms: rooms.map((r, ri) => ({
                            id: `room-${ri}`,
                            name: r.room,
                            x: r.x * 25,
                            y: r.y * 25,
                            w: r.w * 25,
                            h: r.h * 25,
                            border: r.room?.includes('bath') ? '#8b5cf6' : r.room?.includes('kitchen') ? '#f59e0b' : r.room?.includes('living') ? '#10b981' : '#3b82f6'
                        })),
                        columns: (() => {
                            // Compute building bounding box from rooms
                            const maxRx = Math.max(...rooms.map(r => r.x + r.w), 0);
                            const maxRy = Math.max(...rooms.map(r => r.y + r.h), 0);
                            // Filter columns to only those within building footprint
                            return (structuralData?.[key]?.columns || [])
                                .filter(c => c[0] <= maxRx && c[1] <= maxRy)
                                .map(c => ({ x: c[0]*25, y: c[1]*25 }));
                        })()
                    }));
                    setFloors(apiFloors);
                }
            } catch (e) {
                console.error("Failed to load 3D project", e);
                setError("Using preview mode. Generate a project to see real BIM data.");
            } finally {
                setLoading(false);
            }
        })();
    }, [project]);

    if (!project || floors.length === 0) {
        return (
            <div className="viewer3d fade-in">
                <div className="v3d-header">
                    <div><h1 className="v3d-title">3D Realism Viewer</h1></div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:500,gap:16, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-2xl)'}}>
                    <FiAlertCircle size={48} style={{color:'#f59e0b'}} />
                    <h3 style={{color:'white',margin:0}}>No 3D Model Rendered</h3>
                    <p style={{color:'#94a3b8',margin:0}}>Run the AI pipeline to generate a floor plan extrusion.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="viewer3d fade-in">
            <div className="v3d-header">
                <div className="v3d-titles">
                    <h1 className="v3d-title">3D Realism Viewer</h1>
                    <p className="v3d-subtitle">Premium architectural model with physical material physics</p>
                </div>
                <div className="v3d-toolbar glass">
                    <button className={`v3d-tool ${visibleFloors === 99 ? 'active' : ''}`} onClick={() => setVisibleFloors(99)} title="Full View">
                        <FiMaximize /> <span>Full Build</span>
                    </button>
                    <button className={`v3d-tool ${visibleFloors < 99 ? 'active' : ''}`} onClick={() => setVisibleFloors(0)} title="Ground Only">
                        <FiLayers /> <span>Isolate G</span>
                    </button>
                    <div className="v3d-divider" />
                    <button className="v3d-tool" onClick={() => setViewMode(v => v === 'realistic' ? 'blueprint' : 'realistic')}>
                        {viewMode === 'realistic' ? <FiBox /> : <FiSun />} <span>{viewMode}</span>
                    </button>
                </div>
            </div>

            <div className="v3d-container glass">
                {loading ? (
                    <div className="v3d-loading">
                        <FiLoader className="spin" size={32} />
                        <p>Simulating Materials...</p>
                    </div>
                ) : (
                    <div className="v3d-canvas-wrapper">
                        {error && <div className="v3d-error-toast"><FiAlertCircle /> {error}</div>}
                        <Canvas shadows dpr={[1, 2]}>
                            <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={40} />
                            <color attach="background" args={['#0f172a']} />
                            <ambientLight intensity={0.4} />
                            <spotLight position={[10, 15, 10]} angle={0.3} penumbra={1} castShadow intensity={2} shadow-mapSize={2048} />
                            <pointLight position={[-10, -10, -10]} intensity={1} color="#3b82f6" />
                            
                            <Suspense fallback={null}>
                                <BuildingModel floors={floors} visibleFloors={visibleFloors} />
                                <Environment preset="city" />
                                <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={40} blur={2} far={10} />
                            </Suspense>

                            <Grid infiniteGrid fadeDistance={40} sectionColor="#1e293b" cellColor="#334155" />
                            <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} enableDamping dampingFactor={0.05} />
                        </Canvas>
                    </div>
                )}
            </div>
        </div>
    );
}
