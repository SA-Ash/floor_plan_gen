import React from 'react';
import './Card.css';

export default function Card({
    children,
    variant = 'default',
    hover = true,
    padding = 'md',
    className = '',
    onClick,
    ...props
}) {
    const classes = [
        'card-component',
        `card-${variant}`,
        `card-pad-${padding}`,
        hover && 'card-hover',
        onClick && 'card-clickable',
        className
    ].filter(Boolean).join(' ');

    return (
        <div className={classes} onClick={onClick} {...props}>
            {children}
        </div>
    );
}

export function CardHeader({ children, className = '' }) {
    return <div className={`card-header ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }) {
    return <div className={`card-body ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
    return <div className={`card-footer ${className}`}>{children}</div>;
}

export function StatCard({ icon, label, value, change, changeType = 'positive' }) {
    return (
        <div className="stat-card card-component card-hover">
            <div className="stat-card-header">
                <span className="stat-card-icon">{icon}</span>
                {change !== undefined && (
                    <span className={`stat-card-change ${changeType}`}>
                        {changeType === 'positive' ? '↑' : '↓'} {change}%
                    </span>
                )}
            </div>
            <div className="stat-card-value">{value}</div>
            <div className="stat-card-label">{label}</div>
        </div>
    );
}
