import React from 'react';
import './Input.css';

export default function Input({
    label,
    type = 'text',
    placeholder,
    value,
    onChange,
    error,
    hint,
    icon,
    required = false,
    disabled = false,
    fullWidth = true,
    className = '',
    id,
    ...props
}) {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
        <div className={`input-group ${fullWidth ? 'input-full' : ''} ${error ? 'input-error' : ''} ${className}`}>
            {label && (
                <label htmlFor={inputId} className="input-label">
                    {label}
                    {required && <span className="input-required">*</span>}
                </label>
            )}
            <div className="input-wrapper">
                {icon && <span className="input-icon">{icon}</span>}
                {type === 'textarea' ? (
                    <textarea
                        id={inputId}
                        className="input-field input-textarea"
                        placeholder={placeholder}
                        value={value}
                        onChange={onChange}
                        disabled={disabled}
                        {...props}
                    />
                ) : type === 'select' ? (
                    <select
                        id={inputId}
                        className="input-field input-select"
                        value={value}
                        onChange={onChange}
                        disabled={disabled}
                        {...props}
                    >
                        {props.children}
                    </select>
                ) : (
                    <input
                        id={inputId}
                        type={type}
                        className="input-field"
                        placeholder={placeholder}
                        value={value}
                        onChange={onChange}
                        disabled={disabled}
                        {...props}
                    />
                )}
            </div>
            {error && <span className="input-error-text">{error}</span>}
            {hint && !error && <span className="input-hint">{hint}</span>}
        </div>
    );
}
