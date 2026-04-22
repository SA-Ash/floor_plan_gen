import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../store/slices/uiSlice';
import { useActiveProject } from '../../hooks/useActiveProject';
import api from '../../services/api';
import { FiAlertCircle } from 'react-icons/fi';
import Button from '../../components/common/Button';
import './CostEstimator.css';

export default function CostEstimator() {
    const dispatch = useDispatch();
    const { project, loadProject } = useActiveProject();
    const [calculating, setCalculating] = useState(false);
    const [costData, setCostData] = useState(null);
    const [phases, setPhases] = useState([]);

    // Auto-load
    useEffect(() => {
        if (!project) {
            (async () => {
                try {
                    const res = await api.get('/projects');
                    const completed = res.data.filter(p => p.status === 'completed');
                    if (completed.length) await loadProject(completed[completed.length - 1].id);
                    else if (res.data.length) await loadProject(res.data[res.data.length - 1].id);
                } catch (e) { console.error('CostEstimator: no projects', e); }
            })();
        }
    }, []);

    // Parse cost data from project
    useEffect(() => {
        if (!project?.cost) {
            setCostData(null);
            setPhases([]);
            return;
        }

        const c = project.cost;
        const gt = c.grand_total || c.totalBudget || 1;

        setCostData({
            materialCost: c.material_cost || c.materialCost || 0,
            laborCost: c.labor_cost || c.laborCost || 0,
            mepCost: c.mep_cost || 0,
            totalBudget: gt,
            contingency: c.contingency_10pct || 0,
            costPerM2: c.cost_per_m2 || 0,
        });

        // Build phase breakdown
        if (c.breakdown) {
            const matRatio = (c.material_cost || 0) / Math.max(gt, 1);
            const labRatio = (c.labor_cost || 0) / Math.max(gt, 1);
            setPhases(Object.entries(c.breakdown).map(([key, val]) => ({
                phase: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                material: val * matRatio,
                labor: val * labRatio,
                total: val,
            })));
        }

        console.log('[CostEstimator] Loaded cost from project:', project.id, 'total:', gt);
    }, [project]);

    const handleRecalculate = async () => {
        if (!project?.id) return;
        setCalculating(true);
        try {
            const res = await api.get(`/projects/${project.id}/cost-estimate`);
            // Reload full project
            await loadProject(project.id);
            dispatch(addNotification({ type: 'success', title: 'Cost Updated', message: 'Cost estimation recalculated' }));
        } catch (err) {
            dispatch(addNotification({ type: 'error', title: 'Error', message: 'Cost calculation failed' }));
        } finally {
            setCalculating(false);
        }
    };

    const formatCurrency = (v) => {
        if (!v) return '₹0';
        if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
        if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
        if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
        return `₹${v.toFixed(0)}`;
    };

    // No data
    if (!project || !costData) {
        return (
            <div className="cost-estimator fade-in">
                <div className="ce-header">
                    <div><h1 className="ce-title">Cost Estimator</h1></div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:400,gap:16}}>
                    <FiAlertCircle size={48} style={{color:'#f59e0b'}} />
                    <h3 style={{color:'white',margin:0}}>No Cost Data</h3>
                    <p style={{color:'#94a3b8',margin:0}}>Run the AI pipeline to generate cost estimation.</p>
                    <Link to="/dashboard"><Button variant="primary">Go to Dashboard</Button></Link>
                </div>
            </div>
        );
    }

    // Radar chart math
    const radarLabels = phases.slice(0, 5).map(p => p.phase);
    const maxVal = Math.max(...phases.map(p => p.total), 1);
    const cx = 120, cy = 120, r = 90;
    const getRadarPoint = (i, val) => {
        const count = Math.max(radarLabels.length, 3);
        const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
        return [cx + r * val * Math.cos(angle), cy + r * val * Math.sin(angle)];
    };
    const materialPoly = phases.slice(0, 5).map((p, i) => getRadarPoint(i, Math.min(p.material / maxVal, 1)).join(',')).join(' ');
    const laborPoly = phases.slice(0, 5).map((p, i) => getRadarPoint(i, Math.min(p.labor / maxVal, 1)).join(',')).join(' ');
    const labelPoints = radarLabels.map((_, i) => getRadarPoint(i, 1.15));

    const matPct = Math.round((costData.materialCost / costData.totalBudget) * 100);
    const labPct = Math.round((costData.laborCost / costData.totalBudget) * 100);
    const mepPct = 100 - matPct - labPct;

    return (
        <div className="cost-estimator fade-in">
            <div className="ce-header">
                <div>
                    <h1 className="ce-title">Cost Estimator</h1>
                    <p className="ce-subtitle2">AI-powered cost estimation using GradientBoosting model (scikit-learn) — Project: {project.name}</p>
                </div>
                <button
                    className="ce-calc-btn"
                    onClick={handleRecalculate}
                    disabled={calculating}
                    style={{padding:'8px 20px',borderRadius:8,background:calculating?'#334155':'linear-gradient(135deg,#3b82f6,#8b5cf6)',color:'white',border:'none',cursor:calculating?'wait':'pointer',fontWeight:600,fontSize:13}}
                >
                    {calculating ? '⏳ Recalculating...' : '🔄 Recalculate'}
                </button>
            </div>

            {/* Stats */}
            <div className="ce-stats">
                <div className="ce-stat-card glass">
                    <div className="ce-stat-icon-wrap" style={{ background: 'rgba(59,130,246,0.1)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a4 4 0 00-8 0v2" /></svg>
                    </div>
                    <div><div className="ce-stat-label2">MATERIAL COST</div><div className="ce-stat-val">{formatCurrency(costData.materialCost)}</div><div className="ce-stat-sub2">{matPct}% of total</div></div>
                </div>
                <div className="ce-stat-card glass">
                    <div className="ce-stat-icon-wrap" style={{ background: 'rgba(6,214,160,0.1)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06d6a0" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /></svg>
                    </div>
                    <div><div className="ce-stat-label2">LABOR COST</div><div className="ce-stat-val">{formatCurrency(costData.laborCost)}</div><div className="ce-stat-sub2">{labPct}% of total</div></div>
                </div>
                <div className="ce-stat-card glass">
                    <div className="ce-stat-icon-wrap" style={{ background: 'rgba(245,158,11,0.1)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
                    </div>
                    <div><div className="ce-stat-label2">GRAND TOTAL</div><div className="ce-stat-val" style={{ color: '#f59e0b' }}>{formatCurrency(costData.totalBudget)}</div><div className="ce-stat-sub2">incl. 10% contingency</div></div>
                </div>
                <div className="ce-stat-card glass">
                    <div className="ce-stat-icon-wrap" style={{ background: 'rgba(139,92,246,0.1)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                    </div>
                    <div><div className="ce-stat-label2">COST / M²</div><div className="ce-stat-val">₹{Math.round(costData.costPerM2).toLocaleString('en-IN')}</div><div className="ce-stat-sub2">MEP: {formatCurrency(costData.mepCost)}</div></div>
                </div>
            </div>

            {/* Charts */}
            <div className="ce-charts-row">
                {/* Bar Chart */}
                <div className="ce-chart-card glass">
                    <h3 className="ce-chart-title">Cost Breakdown by Component</h3>
                    <div className="ce-bar-chart">
                        <div className="ce-bar-y-axis">
                            {[100, 80, 60, 40, 20, 0].map(v => <span key={v}>{v}%</span>)}
                        </div>
                        <div className="ce-bar-area">
                            {phases.map((d) => (
                                <div key={d.phase} className="ce-bar-row">
                                    <div className="ce-bar-label">{d.phase.length > 12 ? d.phase.slice(0, 10) + '…' : d.phase}</div>
                                    <div className="ce-bar-pair">
                                        <div className="ce-bar ce-bar-material" style={{ height: `${(d.material / (d.material + d.labor + 0.01)) * 100}%` }} title={`Material: ${formatCurrency(d.material)}`} />
                                        <div className="ce-bar ce-bar-labor" style={{ height: `${(d.labor / (d.material + d.labor + 0.01)) * 100}%` }} title={`Labor: ${formatCurrency(d.labor)}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="ce-bar-legend">
                        <span><span className="ce-dot-material" /> Materials</span>
                        <span><span className="ce-dot-labor" /> Labor</span>
                    </div>
                </div>

                {/* Radar Chart */}
                {radarLabels.length >= 3 && (
                    <div className="ce-chart-card glass">
                        <h3 className="ce-chart-title">Material vs Labor Radar</h3>
                        <svg viewBox="0 0 240 240" className="ce-radar-svg">
                            {[0.25, 0.5, 0.75, 1].map(s => (
                                <polygon key={s} points={Array.from({ length: radarLabels.length }, (_, i) => getRadarPoint(i, s).join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                            ))}
                            {Array.from({ length: radarLabels.length }, (_, i) => {
                                const [px, py] = getRadarPoint(i, 1);
                                return <line key={i} x1={cx} y1={cy} x2={px} y2={py} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />;
                            })}
                            <polygon points={materialPoly} fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="1.5" />
                            <polygon points={laborPoly} fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth="1.5" />
                            {radarLabels.map((label, i) => {
                                const [lx, ly] = labelPoints[i];
                                return <text key={i} x={lx} y={ly} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="Inter">{label}</text>;
                            })}
                        </svg>
                        <div className="ce-bar-legend" style={{ justifyContent: 'center' }}>
                            <span><span className="ce-dot-material" /> Materials</span>
                            <span><span className="ce-dot-labor" /> Labor</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Donut-style summary */}
            <div className="ce-chart-card glass ce-area-card">
                <h3 className="ce-chart-title">Cost Distribution Summary</h3>
                <div style={{display:'flex',justifyContent:'space-around',alignItems:'center',padding:'24px 0',flexWrap:'wrap',gap:24}}>
                    <div style={{textAlign:'center'}}>
                        <div style={{fontSize:28,fontWeight:700,color:'#3b82f6'}}>{matPct}%</div>
                        <div style={{fontSize:12,color:'#94a3b8'}}>Materials</div>
                        <div style={{fontSize:11,color:'#64748b'}}>{formatCurrency(costData.materialCost)}</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                        <div style={{fontSize:28,fontWeight:700,color:'#06d6a0'}}>{labPct}%</div>
                        <div style={{fontSize:12,color:'#94a3b8'}}>Labor</div>
                        <div style={{fontSize:11,color:'#64748b'}}>{formatCurrency(costData.laborCost)}</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                        <div style={{fontSize:28,fontWeight:700,color:'#a855f7'}}>{mepPct}%</div>
                        <div style={{fontSize:12,color:'#94a3b8'}}>MEP</div>
                        <div style={{fontSize:11,color:'#64748b'}}>{formatCurrency(costData.mepCost)}</div>
                    </div>
                    <div style={{textAlign:'center',borderLeft:'1px solid #1e293b',paddingLeft:24}}>
                        <div style={{fontSize:28,fontWeight:700,color:'#f59e0b'}}>{formatCurrency(costData.totalBudget)}</div>
                        <div style={{fontSize:12,color:'#94a3b8'}}>Grand Total</div>
                        <div style={{fontSize:11,color:'#64748b'}}>+{formatCurrency(costData.contingency)} contingency</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
