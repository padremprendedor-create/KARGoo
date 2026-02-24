import React from 'react';

const cardStyles = {
    default: {
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border-light)',
    },
    elevated: {
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        border: 'none',
    },
    selectable: {
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        border: '2px solid var(--border-light)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    active: {
        backgroundColor: 'var(--primary-red-light)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        border: '2px solid var(--primary-red)',
    },
    flat: {
        backgroundColor: 'var(--bg-light)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'none',
        border: 'none',
    },
};

const Card = ({ children, variant = 'default', className = '', onClick, ...props }) => {
    const v = cardStyles[variant] || cardStyles.default;

    return (
        <div
            className={className}
            onClick={onClick}
            style={{
                ...v,
                padding: '1.25rem',
                ...props.style,
            }}
            onMouseEnter={(e) => {
                if (variant === 'selectable') {
                    e.currentTarget.style.borderColor = 'var(--primary-red)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                }
            }}
            onMouseLeave={(e) => {
                if (variant === 'selectable') {
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    e.currentTarget.style.transform = 'translateY(0)';
                }
            }}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
