import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, User, ClipboardList, BarChart3, Settings, LogOut, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useTheme } from '../context/ThemeContext';

const menuItems = [
    { id: 'home', label: 'Inicio', icon: Home, path: '/driver' },
    { id: 'profile', label: 'Mi Perfil', icon: User, path: '/driver/profile' },
    { id: 'history', label: 'Historial de Viajes', icon: ClipboardList, path: '/driver/history' },
    { id: 'reports', label: 'Reportes', icon: BarChart3, path: '/driver/reports' },
    { id: 'settings', label: 'Configuración', icon: Settings, path: '/driver/settings' },
];

const SidebarDrawer = ({ open, onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { darkMode } = useTheme();
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
                setProfile(data);
            }
        };
        if (open) fetchProfile();
    }, [open]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const handleNav = (path) => {
        if (path) {
            navigate(path);
            onClose();
        }
    };

    const getActiveId = () => {
        const p = location.pathname;
        if (p === '/driver') return 'home';
        if (p.startsWith('/driver/profile')) return 'profile';
        if (p.startsWith('/driver/history')) return 'history';
        if (p.startsWith('/driver/reports')) return 'reports';
        return 'home';
    };

    const activeId = getActiveId();
    const firstName = profile?.full_name || 'Conductor';

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.4)',
                    zIndex: 998,
                    opacity: open ? 1 : 0,
                    pointerEvents: open ? 'auto' : 'none',
                    transition: 'opacity 0.3s ease',
                }}
            />

            {/* Drawer */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: '280px',
                maxWidth: '80vw',
                background: 'var(--bg-card)',
                zIndex: 999,
                transform: open ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: open ? '4px 0 24px rgba(0,0,0,0.15)' : 'none',
            }}>
                {/* Profile Header */}
                <div style={{
                    background: 'var(--primary-red)',
                    padding: '2.5rem 1.5rem 1.5rem',
                }}>
                    {/* Avatar */}
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'var(--bg-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem',
                        border: '3px solid rgba(255,255,255,0.3)',
                    }}>
                        <User size={32} color="#9CA3AF" />
                    </div>
                    <div style={{
                        fontSize: '1.15rem',
                        fontWeight: '800',
                        color: 'white',
                        marginBottom: '0.15rem',
                    }}>
                        {firstName}
                    </div>
                    <div style={{
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        color: 'rgba(255,255,255,0.8)',
                    }}>
                        Conductor Profesional
                    </div>
                </div>

                {/* Menu Items */}
                <div style={{ flex: 1, padding: '0.75rem 0' }}>
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeId === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleNav(item.path)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '0.85rem 1.5rem',
                                    background: isActive ? (darkMode ? 'rgba(243,112,33,0.15)' : '#FFF7ED') : 'transparent',
                                    border: 'none',
                                    borderLeft: isActive ? '3px solid var(--primary-red)' : '3px solid transparent',
                                    cursor: item.path ? 'pointer' : 'default',
                                    transition: 'background 0.15s ease',
                                    opacity: item.path ? 1 : 0.5,
                                }}
                            >
                                <Icon
                                    size={20}
                                    color={isActive ? 'var(--primary-red)' : '#6B7280'}
                                    strokeWidth={isActive ? 2.3 : 1.8}
                                />
                                <span style={{
                                    fontSize: '0.95rem',
                                    fontWeight: isActive ? '700' : '500',
                                    color: isActive ? 'var(--primary-red)' : 'var(--text-medium)',
                                }}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Logout */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)' }}>
                    <button
                        onClick={handleLogout}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.75rem 0',
                            width: '100%',
                        }}
                    >
                        <LogOut size={20} color="#EF4444" />
                        <span style={{
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            color: '#EF4444',
                        }}>
                            Cerrar Sesión
                        </span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default SidebarDrawer;
