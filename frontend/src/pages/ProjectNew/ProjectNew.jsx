import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../store/slices/uiSlice';
import { addProject as addProjectToStore } from '../../store/slices/projectSlice';
import Button from '../../components/common/Button';
import api from '../../services/api';
import { FiHome, FiLayers, FiGrid, FiCheck, FiCpu, FiEdit3, FiAlertTriangle } from 'react-icons/fi';
import './ProjectNew.css';

const BUILDING_TYPES = [
    { id: 'house', label: 'House', icon: '🏠', desc: 'Residential house' },
    { id: 'apartment', label: 'Apartment', icon: '🏢', desc: 'Multi-unit building' },
    { id: 'office', label: 'Office', icon: '🏬', desc: 'Commercial office' },
    { id: 'skyscraper', label: 'Skyscraper', icon: '🏗️', desc: 'High-rise building' },
];

const ROOM_TYPES = [
    { key: 'bedroom', label: 'Bedrooms', icon: '🛏️' },
    { key: 'bathroom', label: 'Bathrooms', icon: '🚿' },
    { key: 'kitchen', label: 'Kitchen', icon: '🍳' },
    { key: 'living', label: 'Living Room', icon: '🛋️' },
    { key: 'dining', label: 'Dining Room', icon: '🍽️' },
    { key: 'study', label: 'Study/Office', icon: '📚' },
    { key: 'garage', label: 'Garage', icon: '🚗' },
    { key: 'guest', label: 'Guest Room', icon: '🏨' },
];

const FEATURES = [
    { key: 'parking', label: 'Parking', icon: '🅿️' },
    { key: 'garden', label: 'Garden', icon: '🌿' },
    { key: 'balcony', label: 'Balcony', icon: '🏗️' },
    { key: 'terrace', label: 'Terrace', icon: '☀️' },
    { key: 'elevator', label: 'Elevator', icon: '🛗' },
    { key: 'pool', label: 'Swimming Pool', icon: '🏊' },
    { key: 'solar', label: 'Solar Panels', icon: '⚡' },
    { key: 'basement', label: 'Basement', icon: '🏚️' },
];

const NL_EXAMPLES = [
    'I want a 2 floor house with 3 bedrooms, 2 bathrooms, kitchen, living room, parking and garden on a 40x60 plot with budget 50 lakhs',
    'Modern 4BHK villa with pool, garden, and parking on a 60x80 plot',
    'Simple G+1 house, 2 bed, 1 bath, kitchen, living room, 30x40, budget 25 lakh',
];

export default function ProjectNew() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [step, setStep] = useState(1);
    const [inputMode, setInputMode] = useState('form');
    const [nlText, setNlText] = useState('');
    const [nlParsing, setNlParsing] = useState(false);
    const [nlResult, setNlResult] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [genProgress, setGenProgress] = useState(0);
    const [genStage, setGenStage] = useState('');

    const [form, setForm] = useState({
        name: '', description: '', plotWidth: 40, plotLength: 60, floors: 2, budget: 5000000,
        buildingType: 'house',
        rooms: { bedroom: 3, bathroom: 2, kitchen: 1, living: 1, dining: 1, study: 0, garage: 0, guest: 0 },
        features: [],
    });

    const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
    const updateRoom = (key, delta) => setForm(prev => ({
        ...prev,
        rooms: { ...prev.rooms, [key]: Math.max(0, Math.min(10, (prev.rooms[key] || 0) + delta)) }
    }));
    const toggleFeature = (key) => setForm(prev => ({
        ...prev,
        features: prev.features.includes(key) ? prev.features.filter(f => f !== key) : [...prev.features, key]
    }));

    // ── NLP Parse via API ──────────────────────────────────────────────
    const handleNLParse = async () => {
        if (!nlText.trim()) return;
        setNlParsing(true);
        setNlResult(null);
        try {
            const res = await api.post('/ai/parse-requirements', { text: nlText });
            const r = res.data;
            setNlResult(r);
            // Apply parsed results to form
            setForm(prev => ({
                ...prev,
                plotWidth: r.plotWidth || prev.plotWidth,
                plotLength: r.plotLength || prev.plotLength,
                floors: r.floors || prev.floors,
                budget: r.budget || prev.budget,
                rooms: {
                    bedroom: r.rooms?.bedroom ?? prev.rooms.bedroom,
                    bathroom: r.rooms?.bathroom ?? prev.rooms.bathroom,
                    kitchen: r.rooms?.kitchen ?? prev.rooms.kitchen,
                    living: r.rooms?.living ?? prev.rooms.living,
                    dining: r.rooms?.dining ?? prev.rooms.dining,
                    study: r.rooms?.study ?? prev.rooms.study,
                    garage: r.rooms?.garage ?? prev.rooms.garage,
                    guest: r.rooms?.guest ?? prev.rooms.guest,
                },
                features: r.features || prev.features,
            }));
            dispatch(addNotification({ type: 'success', title: 'AI Parsed', message: 'Requirements extracted successfully!' }));
        } catch (err) {
            console.error('NLP parse error:', err);
            dispatch(addNotification({ type: 'error', title: 'Parse Failed', message: 'Could not parse requirements. Please try again.' }));
        } finally {
            setNlParsing(false);
        }
    };

    // ── Generate Project ───────────────────────────────────────────────
    const handleGenerate = async () => {
        setGenerating(true);
        setGenProgress(0);
        setGenStage('Creating project...');

        try {
            // 1. Create project
            const createRes = await api.post('/projects', {
                name: form.name || `${form.buildingType.charAt(0).toUpperCase() + form.buildingType.slice(1)} Project`,
                description: form.description,
                buildingType: form.buildingType,
                plotWidth: form.plotWidth,
                plotLength: form.plotLength,
                floors: form.floors,
                budget: form.budget,
                rooms: form.rooms,
                features: form.features,
                nlInput: nlText,
            });

            const projectId = createRes.data.id;
            dispatch(addProjectToStore(createRes.data));
            setGenProgress(10);
            setGenStage('Running AI pipeline...');

            // 2. Connect WebSocket for progress
            let ws;
            try {
                ws = new WebSocket(`ws://${window.location.hostname}:8000/ws`);
                ws.onmessage = (event) => {
                    try {
                        const msg = JSON.parse(event.data);
                        if (msg.type === 'pipeline_progress' && msg.payload.projectId === projectId) {
                            setGenProgress(msg.payload.progress);
                            setGenStage(`Stage: ${msg.payload.stage.replace(/([A-Z])/g, ' $1').trim()}...`);
                        }
                    } catch (e) { /* ignore */ }
                };
            } catch (e) { /* WS optional */ }

            // 3. Run full pipeline
            await api.post(`/projects/${projectId}/generate`);

            if (ws) ws.close();
            setGenProgress(100);
            setGenStage('Complete!');

            dispatch(addNotification({
                type: 'success', title: 'Plans Generated!',
                message: `AI has generated all plans for your ${form.buildingType}. Redirecting...`
            }));

            setTimeout(() => navigate(`/projects/${projectId}`), 1200);
        } catch (err) {
            console.error('Generate error:', err);
            dispatch(addNotification({ type: 'error', title: 'Generation Failed', message: err.response?.data?.error || 'Pipeline error' }));
            setGenerating(false);
        }
    };

    const totalRooms = Object.values(form.rooms).reduce((s, v) => s + v, 0);

    // ── Render ─────────────────────────────────────────────────────────
    return (
        <div className="project-new fade-in">
            <div className="pn-header">
                <h1 className="page-title">Create New Project</h1>
                <div className="pn-steps">
                    {['Details', 'Building Type', 'Rooms & Features', 'Review'].map((label, i) => (
                        <div key={i} className={`pn-step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>
                            <div className="pn-step-num">{step > i + 1 ? <FiCheck size={14} /> : i + 1}</div>
                            <span className="pn-step-label">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── STEP 1: Details ─────────────────────────────────── */}
            {step === 1 && (
                <div className="pn-step-content slide-up">
                    <div className="pn-mode-toggle">
                        <button className={`pn-mode-btn ${inputMode === 'form' ? 'active' : ''}`} onClick={() => setInputMode('form')}>
                            <FiEdit3 size={16} /> Manual Form
                        </button>
                        <button className={`pn-mode-btn ${inputMode === 'ai' ? 'active' : ''}`} onClick={() => setInputMode('ai')}>
                            <FiCpu size={16} /> AI Natural Language
                        </button>
                    </div>

                    {inputMode === 'ai' ? (
                        <div className="pn-ai-section">
                            <label className="pn-label">Describe your building in plain English</label>
                            <textarea
                                className="pn-textarea"
                                rows={4}
                                value={nlText}
                                onChange={(e) => setNlText(e.target.value)}
                                placeholder="E.g., I want a 2 floor house with 3 bedrooms, 2 bathrooms, kitchen, living room, parking and garden on a 40x60 plot..."
                            />
                            <div className="pn-examples">
                                {NL_EXAMPLES.map((ex, i) => (
                                    <button key={i} className="pn-example-btn" onClick={() => setNlText(ex)}>
                                        "{ex.substring(0, 50)}..."
                                    </button>
                                ))}
                            </div>
                            <Button variant="primary" onClick={handleNLParse} loading={nlParsing} disabled={!nlText.trim()}>
                                {nlParsing ? 'AI Analyzing...' : '🧠 Parse with AI'}
                            </Button>
                            {nlResult && (
                                <div className="pn-nl-result">
                                    <div className="pn-nl-result-header">
                                        <FiCheck size={16} style={{color:'#10b981'}} /> AI Extraction Complete
                                    </div>
                                    <div className="pn-nl-grid">
                                        <span>Plot: <strong>{nlResult.plotWidth}×{nlResult.plotLength}</strong></span>
                                        <span>Floors: <strong>{nlResult.floors}</strong></span>
                                        <span>Bedrooms: <strong>{nlResult.rooms?.bedroom}</strong></span>
                                        <span>Bathrooms: <strong>{nlResult.rooms?.bathroom}</strong></span>
                                        <span>Style: <strong>{nlResult.style}</strong></span>
                                        {nlResult.budget && <span>Budget: <strong>₹{(nlResult.budget/100000).toFixed(0)}L</strong></span>}
                                    </div>
                                    {nlResult.warnings?.length > 0 && (
                                        <div className="pn-nl-warnings">
                                            {nlResult.warnings.map((w, i) => (
                                                <div key={i} className="pn-nl-warning"><FiAlertTriangle size={14} /> {w}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="pn-form-grid">
                            <div className="pn-field">
                                <label className="pn-label">Project Name</label>
                                <input className="pn-input" value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="My Dream Home" />
                            </div>
                            <div className="pn-field">
                                <label className="pn-label">Description</label>
                                <input className="pn-input" value={form.description} onChange={(e) => updateForm('description', e.target.value)} placeholder="Brief description..." />
                            </div>
                            <div className="pn-field-row">
                                <div className="pn-field">
                                    <label className="pn-label">Plot Width (ft)</label>
                                    <input className="pn-input" type="number" value={form.plotWidth} onChange={(e) => updateForm('plotWidth', +e.target.value)} />
                                </div>
                                <div className="pn-field">
                                    <label className="pn-label">Plot Length (ft)</label>
                                    <input className="pn-input" type="number" value={form.plotLength} onChange={(e) => updateForm('plotLength', +e.target.value)} />
                                </div>
                            </div>
                            <div className="pn-field-row">
                                <div className="pn-field">
                                    <label className="pn-label">Number of Floors</label>
                                    <input className="pn-input" type="number" min="1" max="30" value={form.floors} onChange={(e) => updateForm('floors', +e.target.value)} />
                                </div>
                                <div className="pn-field">
                                    <label className="pn-label">Budget (₹)</label>
                                    <input className="pn-input" type="number" value={form.budget} onChange={(e) => updateForm('budget', +e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pn-nav">
                        <div />
                        <Button variant="primary" onClick={() => setStep(2)}>Next →</Button>
                    </div>
                </div>
            )}

            {/* ── STEP 2: Building Type ─────────────────────────── */}
            {step === 2 && (
                <div className="pn-step-content slide-up">
                    <h2 className="pn-section-title">Select Building Type</h2>
                    <div className="pn-type-grid">
                        {BUILDING_TYPES.map(t => (
                            <div key={t.id}
                                className={`pn-type-card ${form.buildingType === t.id ? 'selected' : ''}`}
                                onClick={() => updateForm('buildingType', t.id)}
                            >
                                <span className="pn-type-icon">{t.icon}</span>
                                <span className="pn-type-label">{t.label}</span>
                                <span className="pn-type-desc">{t.desc}</span>
                            </div>
                        ))}
                    </div>
                    <div className="pn-nav">
                        <Button variant="secondary" onClick={() => setStep(1)}>← Back</Button>
                        <Button variant="primary" onClick={() => setStep(3)}>Next →</Button>
                    </div>
                </div>
            )}

            {/* ── STEP 3: Rooms & Features ────────────────────── */}
            {step === 3 && (
                <div className="pn-step-content slide-up">
                    <h2 className="pn-section-title">Room Configuration</h2>
                    <div className="pn-room-grid">
                        {ROOM_TYPES.map(r => (
                            <div key={r.key} className="pn-room-card">
                                <span className="pn-room-icon">{r.icon}</span>
                                <span className="pn-room-label">{r.label}</span>
                                <div className="pn-room-counter">
                                    <button className="pn-counter-btn" onClick={() => updateRoom(r.key, -1)}>−</button>
                                    <span className="pn-counter-val">{form.rooms[r.key] || 0}</span>
                                    <button className="pn-counter-btn" onClick={() => updateRoom(r.key, 1)}>+</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <h2 className="pn-section-title" style={{marginTop: 32}}>Features & Amenities</h2>
                    <div className="pn-feature-grid">
                        {FEATURES.map(f => (
                            <div key={f.key}
                                className={`pn-feature-card ${form.features.includes(f.key) ? 'active' : ''}`}
                                onClick={() => toggleFeature(f.key)}
                            >
                                <span className="pn-feature-icon">{f.icon}</span>
                                <span className="pn-feature-label">{f.label}</span>
                                {form.features.includes(f.key) && <FiCheck className="pn-feature-check" size={16} />}
                            </div>
                        ))}
                    </div>

                    <div className="pn-nav">
                        <Button variant="secondary" onClick={() => setStep(2)}>← Back</Button>
                        <Button variant="primary" onClick={() => setStep(4)}>Next →</Button>
                    </div>
                </div>
            )}

            {/* ── STEP 4: Review & Generate ───────────────────── */}
            {step === 4 && (
                <div className="pn-step-content slide-up">
                    <h2 className="pn-section-title">Review & Generate</h2>
                    <div className="pn-review-grid">
                        <div className="pn-review-card">
                            <h3>📐 Plot & Layout</h3>
                            <div className="pn-review-items">
                                <div className="pn-review-item"><span>Name</span><strong>{form.name || 'Untitled'}</strong></div>
                                <div className="pn-review-item"><span>Plot</span><strong>{form.plotWidth} × {form.plotLength} ft</strong></div>
                                <div className="pn-review-item"><span>Floors</span><strong>{form.floors}</strong></div>
                                <div className="pn-review-item"><span>Type</span><strong>{form.buildingType}</strong></div>
                                <div className="pn-review-item"><span>Budget</span><strong>₹{(form.budget / 100000).toFixed(1)}L</strong></div>
                            </div>
                        </div>
                        <div className="pn-review-card">
                            <h3>🏘️ Rooms ({totalRooms})</h3>
                            <div className="pn-review-items">
                                {Object.entries(form.rooms).filter(([,v]) => v > 0).map(([k,v]) => (
                                    <div key={k} className="pn-review-item">
                                        <span>{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                                        <strong>{v}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="pn-review-card">
                            <h3>✨ Features</h3>
                            <div className="pn-review-tags">
                                {form.features.length > 0 ? form.features.map(f => (
                                    <span key={f} className="pn-review-tag">{f}</span>
                                )) : <span className="pn-review-none">No features selected</span>}
                            </div>
                        </div>
                    </div>

                    {generating && (
                        <div className="pn-generating">
                            <div className="pn-gen-bar">
                                <div className="pn-gen-fill" style={{width: `${genProgress}%`}} />
                            </div>
                            <div className="pn-gen-info">
                                <span className="pn-gen-stage">{genStage}</span>
                                <span className="pn-gen-pct">{genProgress}%</span>
                            </div>
                        </div>
                    )}

                    <div className="pn-nav">
                        <Button variant="secondary" onClick={() => setStep(3)} disabled={generating}>← Back</Button>
                        <Button variant="primary" onClick={handleGenerate} loading={generating} disabled={generating}>
                            {generating ? 'Generating...' : '🚀 Generate AI Plans'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
