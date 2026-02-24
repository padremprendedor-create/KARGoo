import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Moon, Bell, Scale, Info, LogOut } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useTheme } from '../context/ThemeContext';

const Toggle = ({ value, onChange }) => (
    <button
        onClick={() => onChange(!value)}
        style={{
            width: '48px',
            height: '28px',
            borderRadius: '999px',
            border: 'none',
            background: value ? 'var(--primary-red)' : '#E5E7EB',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background 0.25s ease',
            flexShrink: 0,
        }}
    >
        <div style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: 'white',
            position: 'absolute',
            top: '3px',
            left: value ? '23px' : '3px',
            transition: 'left 0.25s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }} />
    </button>
);

const Settings = () => {
    const navigate = useNavigate();
    const { darkMode, setDarkMode } = useTheme();
    const [tripAlerts, setTripAlerts] = useState(true);
    const [weighingReminders, setWeighingReminders] = useState(true);

    const d = darkMode; // shorthand

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const cardBg = d ? '#1F2937' : 'white';
    const rowBorder = d ? '#374151' : '#F3F4F6';
    const iconBg = d ? '#374151' : '#F9FAFB';
    const labelColor = d ? '#E5E7EB' : '#374151';

    const SectionTitle = ({ children }) => (
        <div style={{
            fontSize: '0.7rem',
            fontWeight: '700',
            color: '#9CA3AF',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '1.25rem 1.5rem 0.5rem',
        }}>
            {children}
        </div>
    );

    const SettingRow = ({ icon: Icon, label, right, onClick, borderBottom = true }) => (
        <button
            onClick={onClick}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 1.5rem',
                background: cardBg,
                border: 'none',
                borderBottom: borderBottom ? `1px solid ${rowBorder}` : 'none',
                cursor: onClick ? 'pointer' : 'default',
                textAlign: 'left',
            }}
        >
            <div style={{
                width: '38px', height: '38px',
                borderRadius: '10px',
                background: iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
            }}>
                <Icon size={18} color={d ? '#9CA3AF' : '#6B7280'} />
            </div>
            <span style={{ flex: 1, fontSize: '0.95rem', fontWeight: '600', color: labelColor }}>
                {label}
            </span>
            {right}
        </button>
    );

    return (
        <div style={{ minHeight: '100vh', background: d ? '#111827' : '#F8F9FA', paddingBottom: '2rem' }}>
            {/* Header */}
            <div style={{
                background: 'var(--primary-red)',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                color: 'white',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                boxShadow: '0 2px 8px rgba(211, 47, 47, 0.3)',
            }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                    <ChevronLeft size={28} strokeWidth={2.5} />
                </button>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>Configuración</h1>
            </div>

            {/* General */}
            <SectionTitle>General</SectionTitle>
            <div style={{ background: cardBg, borderRadius: '16px', margin: '0 1rem', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                <SettingRow
                    icon={Moon}
                    label="Modo Oscuro"
                    borderBottom={false}
                    right={<Toggle value={darkMode} onChange={setDarkMode} />}
                />
            </div>

            {/* Notifications */}
            <SectionTitle>Notificaciones</SectionTitle>
            <div style={{ background: cardBg, borderRadius: '16px', margin: '0 1rem', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                <SettingRow
                    icon={Bell}
                    label="Alertas de Viaje"
                    right={<Toggle value={tripAlerts} onChange={setTripAlerts} />}
                />
                <SettingRow
                    icon={Scale}
                    label="Recordatorios de Pesaje"
                    borderBottom={false}
                    right={<Toggle value={weighingReminders} onChange={setWeighingReminders} />}
                />
            </div>

            {/* About */}
            <SectionTitle>Acerca de</SectionTitle>
            <div style={{ background: cardBg, borderRadius: '16px', margin: '0 1rem', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                <SettingRow
                    icon={Info}
                    label="Versión de la App"
                    borderBottom={false}
                    right={
                        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#9CA3AF' }}>
                            1.2.0
                        </span>
                    }
                />
            </div>

            {/* Logout */}
            <div style={{ padding: '2rem 1rem 0' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        borderRadius: '16px',
                        border: '1.5px solid #FCA5A5',
                        background: cardBg,
                        color: '#EF4444',
                        fontSize: '1rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                    }}
                >
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
};

export default Settings;
