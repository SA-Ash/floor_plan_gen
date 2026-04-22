import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../store/slices/uiSlice';
import Button from '../../components/common/Button';
import api from '../../services/api';
import { FiCheck, FiRefreshCw, FiPaperclip, FiAlertTriangle, FiClock, FiCheckCircle, FiLoader } from 'react-icons/fi';
import './WorkerGuidance.css';

const defaultPhases = [
    {
        id: 1, name: 'Foundation', status: 'completed', progress: 100,
        steps: [
            { id: 's1', text: 'Excavate trenches to 1.5m depth as per layout plan', done: true },
            { id: 's2', text: 'Lay PCC (1:4:8) of 150mm thickness in foundation trenches', done: true },
            { id: 's3', text: 'Place steel reinforcement cage as per structural drawing F-01', done: true },
            { id: 's4', text: 'Pour M25 grade concrete for footings, vibrate thoroughly', done: true },
            { id: 's5', text: 'Cure footings for minimum 7 days', done: true },
        ]
    },
    {
        id: 2, name: 'Column Erection', status: 'in_progress', progress: 60,
        steps: [
            { id: 's6', text: 'Install column reinforcement at grid points: A1, A4, B1, B4, C1, C4, D1, D4', done: true, coordinates: 'See drawing S-02' },
            { id: 's7', text: 'Fix column formwork (230\u00d7300mm) and check plumb with spirit level', done: true },
            { id: 's8', text: 'Pour M25 concrete in columns up to plinth level', done: true },
            { id: 's9', text: 'Remove formwork after 24 hours, begin curing', done: false, current: true },
            { id: 's10', text: 'Erect columns from plinth to first floor (3m height)', done: false },
        ]
    },
    {
        id: 3, name: 'Beam & Slab', status: 'pending', progress: 0,
        steps: [
            { id: 's11', text: 'Install beam formwork at all grid lines (refer drawing S-03)', done: false },
            { id: 's12', text: 'Place beam reinforcement \u2014 main bars 4\u00d716mm, stirrups 8mm@150mm', done: false },
            { id: 's13', text: 'Layout slab reinforcement mesh \u2014 10mm@150mm both ways', done: false },
            { id: 's14', text: 'Embed electrical conduits and plumbing sleeves before pour', done: false },
            { id: 's15', text: 'Pour M25 concrete for slab (125mm thick), level and finish', done: false },
        ]
    },
    {
        id: 4, name: 'Masonry & Walls', status: 'pending', progress: 0,
        steps: [
            { id: 's16', text: 'Lay first course of bricks in cement mortar (1:6) over DPC', done: false },
            { id: 's17', text: 'Build walls in English bond pattern to window sill level (900mm)', done: false },
            { id: 's18', text: 'Install window frames and continue walls to lintel level', done: false },
            { id: 's19', text: 'Cast lintel beams (150\u00d7230mm) above all openings', done: false },
            { id: 's20', text: 'Complete walls up to roof level with proper bonding', done: false },
        ]
    },
    {
        id: 5, name: 'MEP Installation', status: 'pending', progress: 0,
        steps: [
            { id: 's21', text: 'Run electrical conduits in walls and ceiling as per drawing E-01', done: false },
            { id: 's22', text: 'Install distribution board and pull wiring through conduits', done: false },
            { id: 's23', text: 'Execute plumbing rough-in \u2014 supply and drainage pipes per P-01', done: false },
            { id: 's24', text: 'Install HVAC ducting if applicable (refer M-01)', done: false },
            { id: 's25', text: 'Pressure test all plumbing lines at 6 kg/cm\u00b2', done: false },
        ]
    },
    {
        id: 6, name: 'Finishing', status: 'pending', progress: 0,
        steps: [
            { id: 's26', text: 'Apply internal plaster (12mm cement plaster 1:6)', done: false },
            { id: 's27', text: 'Install flooring tiles \u2014 vitrified tiles 600\u00d7600mm', done: false },
            { id: 's28', text: 'Fix doors, windows, and hardware', done: false },
            { id: 's29', text: 'Prime and paint all surfaces (2 coats primer + 2 coats emulsion)', done: false },
            { id: 's30', text: 'Install sanitary fittings, switches, and fix electrical fixtures', done: false },
        ]
    },
];

export default function WorkerGuidance() {
    const dispatch = useDispatch();
    const [selectedPhase, setSelectedPhase] = useState(1);
    const [constructionPhases, setConstructionPhases] = useState(defaultPhases);
    const [projectId, setProjectId] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/projects');
                const proj = res.data.slice().reverse().find(p => p.status === 'completed') || res.data[res.data.length - 1];
                if (proj) {
                    setProjectId(proj.id);
                    const wgRes = await api.get(`/ai/worker-tasks/${proj.id}`);
                    if (wgRes.data?.length) setConstructionPhases(wgRes.data);
                }
            } catch (e) { /* use defaults */ }
        })();
    }, []);

    const handleToggleStep = async (stepId, done) => {
        if (!projectId) return;
        try {
            const res = await api.put(`/ai/worker-tasks/${projectId}/step/${stepId}`, { done: !done });
            if (res.data?.length) setConstructionPhases(res.data);
            dispatch(addNotification({
                type: done ? 'info' : 'success',
                title: done ? 'Step Unchecked' : 'Step Completed',
                message: done ? 'Step marked as incomplete' : 'Step marked as done! ✓'
            }));
        } catch (e) {
            dispatch(addNotification({ type: 'error', title: 'Error', message: 'Failed to update step' }));
        }
    };

    const phase = constructionPhases.find(p => p.id === selectedPhase);
    const overallProgress = Math.round(constructionPhases.reduce((sum, p) => sum + p.progress, 0) / constructionPhases.length);

    return (
        <div className="worker-guidance fade-in">
            <div className="wg-header">
                <div>
                    <h1 className="wg-title">Worker Guidance System</h1>
                    <p className="wg-subtitle">Step-by-step construction execution instructions</p>
                </div>
                <div className="wg-overall">
                    <div className="wg-overall-ring">
                        <svg viewBox="0 0 60 60">
                            <circle cx="30" cy="30" r="26" fill="none" stroke="var(--bg-tertiary)" strokeWidth="4" />
                            <circle cx="30" cy="30" r="26" fill="none" stroke="url(#progressGrad)" strokeWidth="4" strokeDasharray={`${overallProgress * 1.63} 163`} strokeLinecap="round" transform="rotate(-90 30 30)" />
                            <defs><linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#06d6a0" /></linearGradient></defs>
                        </svg>
                        <span className="wg-overall-pct">{overallProgress}%</span>
                    </div>
                    <span className="wg-overall-label">Overall Progress</span>
                </div>
            </div>
            <div className="wg-layout">
                <aside className="wg-phases glass">
                    <h3 className="wg-phases-title">Construction Phases</h3>
                    {constructionPhases.map((p) => (
                        <button key={p.id} className={`wg-phase-btn ${selectedPhase === p.id ? 'active' : ''} ${p.status}`} onClick={() => setSelectedPhase(p.id)}>
                            <div className="wg-phase-indicator">{p.status === 'completed' ? <FiCheck size={14} /> : p.status === 'in_progress' ? <FiRefreshCw size={14} /> : p.id}</div>
                            <div className="wg-phase-info">
                                <span className="wg-phase-name">{p.name}</span>
                                <div className="wg-phase-progress-bar"><div className="wg-phase-progress-fill" style={{ width: `${p.progress}%` }} /></div>
                            </div>
                            <span className="wg-phase-pct">{p.progress}%</span>
                        </button>
                    ))}
                </aside>
                <main className="wg-steps">
                    <div className="wg-steps-header glass">
                        <div>
                            <h2 className="wg-steps-title">{phase.name}</h2>
                            <div className="wg-steps-meta">
                                <span className={`wg-status-badge ${phase.status}`}>
                                    {phase.status === 'completed' ? <><FiCheckCircle size={14} style={{ marginRight: 4 }} /> Completed</> : phase.status === 'in_progress' ? <><FiLoader size={14} style={{ marginRight: 4 }} /> In Progress</> : <><FiClock size={14} style={{ marginRight: 4 }} /> Pending</>}
                                </span>
                                <span className="wg-steps-count">{phase.steps.filter(s => s.done).length}/{phase.steps.length} steps done</span>
                            </div>
                        </div>
                        <Button variant="primary" size="sm">Mark Phase Complete</Button>
                    </div>
                    <div className="wg-steps-list">
                        {phase.steps.map((step, i) => (
                            <div key={step.id} className={`wg-step ${step.done ? 'done' : ''} ${step.current ? 'current' : ''}`}>
                                <div className="wg-step-line" />
                                <div className="wg-step-dot" onClick={() => handleToggleStep(step.id, step.done)} style={{cursor:'pointer'}}>{step.done ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg> : <span>{i + 1}</span>}</div>
                                <div className="wg-step-content">
                                    <p className="wg-step-text">{step.text}</p>
                                    {step.coordinates && <span className="wg-step-ref"><FiPaperclip size={12} style={{ marginRight: 4 }} />{step.coordinates}</span>}
                                    {step.current && <div className="wg-step-current-badge"><span className="wg-step-pulse" />Current Step</div>}
                                </div>
                                {!step.done && <button className="wg-step-check-btn" onClick={() => handleToggleStep(step.id, step.done)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg></button>}
                            </div>
                        ))}
                    </div>
                    <div className="wg-safety glass">
                        <h3 className="wg-safety-title"><FiAlertTriangle size={18} style={{ marginRight: 8 }} /> Safety Reminders</h3>
                        <ul className="wg-safety-list">
                            <li>Wear PPE at all times \u2014 helmet, safety shoes, gloves, goggles</li>
                            <li>Check formwork supports and bracing before concrete pour</li>
                            <li>Ensure adequate scaffolding for work above 2 meters</li>
                            <li>Keep fire extinguishers accessible near welding areas</li>
                        </ul>
                    </div>
                </main>
            </div>
        </div>
    );
}
