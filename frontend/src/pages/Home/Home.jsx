import React from 'react';
import { Link } from 'react-router-dom';
import { FiCpu, FiLayout, FiTrello, FiZap, FiBarChart2, FiUsers } from 'react-icons/fi';
import './Home.css';

const features = [
    {
        icon: <FiCpu size={28} />,
        title: 'AI Requirement Analysis',
        desc: 'Convert natural language descriptions into precise building constraints automatically.'
    },
    {
        icon: <FiLayout size={28} />,
        title: 'Smart Floor Plans',
        desc: 'Generate optimized layouts using reinforcement learning agents in seconds.'
    },
    {
        icon: <FiTrello size={28} />,
        title: 'Structural Design',
        desc: 'Auto-generate columns, beams, and slabs with code-compliant structural grids.'
    },
    {
        icon: <FiZap size={28} />,
        title: 'MEP Routing',
        desc: 'Intelligent electrical, plumbing, and HVAC routing with clash detection.'
    },
    {
        icon: <FiBarChart2 size={28} />,
        title: 'Cost Estimation',
        desc: 'Machine learning-powered cost prediction with risk analysis and material breakdown.'
    },
    {
        icon: <FiUsers size={28} />,
        title: 'Worker Guidance',
        desc: 'Step-by-step execution instructions for on-site construction teams.'
    }
];

const steps = [
    { num: '01', title: 'Describe Your Vision', desc: 'Tell us what you want to build in plain English — rooms, floors, budget, and special requirements.' },
    { num: '02', title: 'AI Generates Plans', desc: 'Our AI engine generates optimized floor plans, structural layouts, and MEP routing instantly.' },
    { num: '03', title: 'Review & Customize', desc: 'Explore your plans in 2D and 3D, adjust rooms, review costs, and fine-tune every detail.' },
    { num: '04', title: 'Build with Confidence', desc: 'Get construction schedules, task breakdowns, and on-site worker guidance for flawless execution.' }
];

const stats = [
    { value: '10x', label: 'Faster Design' },
    { value: '40%', label: 'Cost Reduction' },
    { value: '95%', label: 'Accuracy Rate' },
    { value: '500+', label: 'Buildings Planned' }
];

export default function Home() {
    return (
        <div className="home">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-bg">
                    <div className="hero-glow hero-glow-1" />
                    <div className="hero-glow hero-glow-2" />
                    <div className="hero-grid" />
                </div>
                <div className="container hero-content">
                    <div className="hero-badge slide-up">
                        <span className="hero-badge-dot" />
                        AI-Powered Construction Intelligence
                    </div>
                    <h1 className="hero-title slide-up">
                        From <span className="gradient-text">Idea</span> to{' '}
                        <span className="gradient-text">Blueprint</span>
                        <br />in Minutes, Not Months
                    </h1>
                    <p className="hero-subtitle slide-up">
                        Build My Home transforms your building requirements into complete construction plans —
                        floor layouts, structural designs, cost estimates, and worker instructions — all powered by AI.
                    </p>
                    <div className="hero-actions slide-up">
                        <Link to="/projects/new" className="hero-btn-primary">
                            Start Building Free
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </Link>
                        <a href="#how-it-works" className="hero-btn-secondary">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
                            </svg>
                            See How It Works
                        </a>
                    </div>
                </div>

                {/* Hero Visual */}
                <div className="hero-visual slide-up">
                    <div className="hero-visual-card glass">
                        <div className="hero-visual-header">
                            <div className="hero-visual-dots">
                                <span /><span /><span />
                            </div>
                            <span className="hero-visual-title">AI Floor Plan — 3BHK Residence</span>
                        </div>
                        <div className="hero-visual-body">
                            <svg viewBox="0 0 600 400" className="hero-floorplan-svg">
                                {/* Outer walls */}
                                <rect x="20" y="20" width="560" height="360" fill="none" stroke="var(--color-primary)" strokeWidth="3" rx="4" />

                                {/* Rooms */}
                                <rect x="20" y="20" width="200" height="180" fill="rgba(59,130,246,0.08)" stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="4" />
                                <text x="120" y="115" textAnchor="middle" fill="var(--text-secondary)" fontSize="13" fontFamily="Inter">Master Bedroom</text>
                                <text x="120" y="135" textAnchor="middle" fill="var(--text-muted)" fontSize="10">14' × 12'</text>

                                <rect x="220" y="20" width="180" height="180" fill="rgba(6,214,160,0.06)" stroke="var(--color-accent)" strokeWidth="1.5" strokeDasharray="4" />
                                <text x="310" y="115" textAnchor="middle" fill="var(--text-secondary)" fontSize="13" fontFamily="Inter">Living Room</text>
                                <text x="310" y="135" textAnchor="middle" fill="var(--text-muted)" fontSize="10">16' × 12'</text>

                                <rect x="400" y="20" width="180" height="110" fill="rgba(59,130,246,0.06)" stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="4" />
                                <text x="490" y="75" textAnchor="middle" fill="var(--text-secondary)" fontSize="13" fontFamily="Inter">Bedroom 2</text>
                                <text x="490" y="95" textAnchor="middle" fill="var(--text-muted)" fontSize="10">12' × 10'</text>

                                <rect x="400" y="130" width="180" height="70" fill="rgba(245,158,11,0.06)" stroke="var(--color-warning)" strokeWidth="1.5" strokeDasharray="4" />
                                <text x="490" y="170" textAnchor="middle" fill="var(--text-secondary)" fontSize="12" fontFamily="Inter">Kitchen</text>

                                <rect x="20" y="200" width="160" height="180" fill="rgba(59,130,246,0.05)" stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="4" />
                                <text x="100" y="295" textAnchor="middle" fill="var(--text-secondary)" fontSize="13" fontFamily="Inter">Bedroom 3</text>
                                <text x="100" y="315" textAnchor="middle" fill="var(--text-muted)" fontSize="10">12' × 11'</text>

                                <rect x="180" y="200" width="120" height="90" fill="rgba(139,92,246,0.06)" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4" />
                                <text x="240" y="250" textAnchor="middle" fill="var(--text-secondary)" fontSize="11" fontFamily="Inter">Bath 1</text>

                                <rect x="300" y="200" width="100" height="90" fill="rgba(139,92,246,0.06)" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4" />
                                <text x="350" y="250" textAnchor="middle" fill="var(--text-secondary)" fontSize="11" fontFamily="Inter">Bath 2</text>

                                <rect x="180" y="290" width="220" height="90" fill="rgba(6,214,160,0.05)" stroke="var(--color-accent)" strokeWidth="1.5" strokeDasharray="4" />
                                <text x="290" y="340" textAnchor="middle" fill="var(--text-secondary)" fontSize="12" fontFamily="Inter">Dining + Passage</text>

                                <rect x="400" y="200" width="180" height="180" fill="rgba(59,130,246,0.03)" stroke="var(--border-color)" strokeWidth="1.5" strokeDasharray="4" />
                                <text x="490" y="295" textAnchor="middle" fill="var(--text-secondary)" fontSize="12" fontFamily="Inter">Parking</text>

                                {/* Dimension lines */}
                                <line x1="20" y1="395" x2="580" y2="395" stroke="var(--text-muted)" strokeWidth="0.5" strokeDasharray="2" />
                                <text x="300" y="410" textAnchor="middle" fill="var(--text-muted)" fontSize="10">40' - 0"</text>
                            </svg>

                            {/* Floating labels */}
                            <div className="hero-visual-badge badge-ai">
                                <span className="badge-pulse" />
                                AI Generating...
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="stats-section">
                <div className="container stats-grid">
                    {stats.map((s, i) => (
                        <div key={i} className="stat-item">
                            <div className="stat-value gradient-text">{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section className="features-section" id="features">
                <div className="container">
                    <div className="section-header">
                        <span className="section-tag">Features</span>
                        <h2 className="section-title">
                            Everything You Need to <span className="gradient-text">Plan & Build</span>
                        </h2>
                        <p className="section-desc">
                            From AI requirement analysis to on-site worker guidance — one platform for the entire construction lifecycle.
                        </p>
                    </div>
                    <div className="features-grid">
                        {features.map((f, i) => (
                            <div key={i} className="feature-card card-component card-hover card-pad-md" style={{ animationDelay: `${i * 0.1}s` }}>
                                <div className="feature-icon">{f.icon}</div>
                                <h3 className="feature-title">{f.title}</h3>
                                <p className="feature-desc">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="howit-section" id="how-it-works">
                <div className="container">
                    <div className="section-header">
                        <span className="section-tag">Process</span>
                        <h2 className="section-title">
                            How <span className="gradient-text">Build My Home</span> Works
                        </h2>
                    </div>
                    <div className="howit-steps">
                        {steps.map((s, i) => (
                            <div key={i} className="howit-step">
                                <div className="howit-step-num gradient-text">{s.num}</div>
                                <div className="howit-step-line" />
                                <h3 className="howit-step-title">{s.title}</h3>
                                <p className="howit-step-desc">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="cta-section">
                <div className="container">
                    <div className="cta-card glass">
                        <div className="cta-glow" />
                        <h2 className="cta-title">Ready to Build Smarter?</h2>
                        <p className="cta-desc">
                            Join hundreds of architects, engineers, and builders who trust AI to plan their next construction project.
                        </p>
                        <Link to="/projects/new" className="hero-btn-primary">
                            Create Your First Project
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
