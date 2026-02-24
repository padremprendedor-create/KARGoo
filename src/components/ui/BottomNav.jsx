import React from 'react';
import { Home, ClipboardList, BarChart3, User } from 'lucide-react';

const navItems = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'history', label: 'Historial', icon: ClipboardList },
    { id: 'reports', label: 'Reportes', icon: BarChart3 },
    { id: 'profile', label: 'Perfil', icon: User },
];

const BottomNav = ({ active = 'home', onNavigate }) => {
    return (
        <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 'var(--bottom-nav-height)',
            background: 'var(--white)',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            zIndex: 50,
            boxShadow: '0 -2px 10px rgba(0,0,0,0.04)',
        }}>
            {navItems.map((item) => {
                const isActive = active === item.id;
                const Icon = item.icon;
                return (
                    <button
                        key={item.id}
                        onClick={() => onNavigate?.(item.id)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.2rem',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.5rem 1rem',
                            color: isActive ? 'var(--primary-red)' : 'var(--text-light)',
                            transition: 'color 0.2s ease',
                            fontFamily: 'var(--font-sans)',
                        }}
                    >
                        <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                        <span style={{
                            fontSize: '0.65rem',
                            fontWeight: isActive ? '600' : '400',
                            letterSpacing: '0.02em',
                        }}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
};

export default BottomNav;
