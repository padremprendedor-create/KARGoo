import React from 'react';

const variants = {
    primary: {
        background: 'var(--primary-gradient)',
        color: 'var(--white)',
        border: 'none',
        boxShadow: 'var(--shadow-red)',
    },
    secondary: {
        background: 'transparent',
        color: 'var(--secondary-grey)',
        border: '2px solid var(--border-medium)',
        boxShadow: 'none',
    },
    danger: {
        background: 'var(--danger)',
        color: 'var(--white)',
        border: 'none',
        boxShadow: 'none',
    },
    ghost: {
        background: 'transparent',
        color: 'var(--text-dark)',
        border: 'none',
        boxShadow: 'none',
    },
    dark: {
        background: 'var(--text-dark)',
        color: 'var(--white)',
        border: 'none',
        boxShadow: 'var(--shadow-md)',
    },
    'outline-primary': {
        background: 'transparent',
        color: 'var(--primary-red)',
        border: '2px solid var(--primary-red)',
        boxShadow: 'none',
    },
};

const Button = ({
    children,
    variant = 'primary',
    onClick,
    className = '',
    type = 'button',
    size = 'md',
    disabled = false,
    ...props
}) => {
    const v = variants[variant] || variants.primary;

    const sizes = {
        sm: { padding: '0.5rem 1rem', fontSize: '0.875rem' },
        md: { padding: '0.75rem 1.5rem', fontSize: '1rem' },
        lg: { padding: '1rem 2rem', fontSize: '1.125rem' },
    };

    const s = sizes[size] || sizes.md;

    return (
        <button
            type={type}
            className={className}
            disabled={disabled}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: s.padding,
                fontSize: s.fontSize,
                borderRadius: 'var(--radius-md)',
                fontWeight: '600',
                fontFamily: 'var(--font-sans)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                border: v.border,
                backgroundColor: variant === 'primary' ? 'var(--primary-red)' : v.background,
                background: disabled ? 'var(--border-medium)' : v.background,
                color: disabled ? 'var(--text-light)' : v.color,
                boxShadow: disabled ? 'none' : v.boxShadow,
                transition: 'all 0.2s ease',
                opacity: disabled ? 0.6 : 1,
                letterSpacing: '0.01em',
                ...props.style,
            }}
            onClick={onClick}
            onMouseEnter={(e) => {
                if (!disabled) e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
            }}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
