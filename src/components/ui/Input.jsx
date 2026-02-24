import React from 'react';

const Input = ({ label, icon, type = 'text', placeholder, value, onChange, name, className = '', required, rows, ...props }) => {
    const isTextarea = type === 'textarea';
    const Tag = isTextarea ? 'textarea' : 'input';

    const sharedStyles = {
        width: '100%',
        padding: icon ? '0.875rem 0.875rem 0.875rem 2.75rem' : '0.875rem',
        borderRadius: 'var(--radius-md)',
        border: '1.5px solid var(--border-light)',
        fontSize: '1rem',
        fontFamily: 'var(--font-sans)',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        backgroundColor: 'var(--white)',
        color: 'var(--text-dark)',
        ...(isTextarea ? { resize: 'vertical', minHeight: '80px' } : {}),
    };

    return (
        <div className={`flex flex-col ${className}`} style={{ marginBottom: '1rem' }}>
            {label && (
                <label style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: 'var(--text-medium)',
                    marginBottom: '0.375rem',
                }}>
                    {label}
                    {required && <span style={{ color: 'var(--danger)', marginLeft: '0.25rem' }}>*</span>}
                </label>
            )}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                {icon && (
                    <span style={{
                        position: 'absolute',
                        left: '0.875rem',
                        color: 'var(--text-light)',
                        display: 'flex',
                        alignItems: 'center',
                        pointerEvents: 'none',
                    }}>
                        {typeof icon === 'string' ? icon : icon}
                    </span>
                )}
                <Tag
                    type={isTextarea ? undefined : type}
                    name={name}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    required={required}
                    rows={rows}
                    style={sharedStyles}
                    onFocus={(e) => {
                        e.target.style.borderColor = 'var(--primary-red)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(211, 47, 47, 0.1)';
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border-light)';
                        e.target.style.boxShadow = 'none';
                    }}
                    {...props}
                />
            </div>
        </div>
    );
};

export default Input;
