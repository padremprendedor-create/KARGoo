import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import {
    ChevronLeft,
    Phone,
    CreditCard,
    FileText,
    Truck,
    Factory,
    Hash,
    LogOut,
    User
} from 'lucide-react';

const Profile = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/');

        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        setProfile(data);
        setLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-light)' }}>
                <div className="text-orange-500 font-medium">Cargando perfil...</div>
            </div>
        );
    }

    // Mock data for display to match the design request
    const mockData = {
        dni: '45678912',
        license: 'AIII-C Profesional',
        phone: '+51 987 654 321',
        plate: 'ABC-123',
        model: 'FH16 750',
        brand: 'Volvo'
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-light)', paddingBottom: '2rem' }}>
            {/* Header */}
            <div style={{
                background: 'var(--primary-red)',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'white'
            }}>
                <button
                    onClick={() => navigate('/driver')}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                    <ChevronLeft size={28} />
                </button>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Mi Perfil</h1>
                <div style={{ width: '28px' }} />
            </div>

            <div className="container pb-6">
                {/* Profile Header */}
                <div className="flex flex-col items-center justify-center pt-6 pb-6">
                    <div style={{
                        position: 'relative',
                        marginBottom: '1rem'
                    }}>
                        <div style={{
                            width: '96px',
                            height: '96px',
                            borderRadius: '50%',
                            background: 'var(--bg-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '4px solid white',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }}>
                            <User size={48} color="#ADB5BD" />
                        </div>
                        <div style={{
                            position: 'absolute',
                            bottom: '4px',
                            right: '4px',
                            width: '20px',
                            height: '20px',
                            background: '#22C55E',
                            borderRadius: '50%',
                            border: '4px solid var(--bg-card)',
                            boxShadow: 'var(--shadow-sm)'
                        }} />
                    </div>

                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: '800',
                        color: 'var(--text-dark)',
                        marginBottom: '0.25rem'
                    }}>
                        {profile?.full_name || 'Víctor Solís'}
                    </h2>
                    <span style={{
                        color: 'var(--primary-red)',
                        fontWeight: '600',
                        fontSize: '0.9rem'
                    }}>
                        {profile?.role === 'driver' ? 'Conductor Profesional' : profile?.role}
                    </span>
                </div>

                {/* Personal Info Section */}
                <div className="mb-2 px-1">
                    <h3 style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: 'var(--text-light)',
                        marginBottom: '0.75rem',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase'
                    }}>
                        INFORMACIÓN PERSONAL
                    </h3>
                </div>

                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    padding: '0.5rem 1.25rem',
                    marginBottom: '1.5rem',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <InfoRow
                        icon={<CreditCard size={20} color="var(--primary-red)" />}
                        bg="rgba(211, 47, 47, 0.1)"
                        label="DNI"
                        value={mockData.dni}
                    />
                    <InfoRow
                        icon={<FileText size={20} color="var(--primary-red)" />}
                        bg="rgba(211, 47, 47, 0.1)"
                        label="Licencia"
                        value={mockData.license}
                    />
                    <InfoRow
                        icon={<Phone size={20} color="var(--primary-red)" />}
                        bg="rgba(211, 47, 47, 0.1)"
                        label="Teléfono"
                        value={mockData.phone}
                        isLast
                    />
                </div>

                {/* Vehicle Info Section */}
                <div className="mb-2 px-1">
                    <h3 style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: 'var(--text-light)',
                        marginBottom: '0.75rem',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase'
                    }}>
                        INFORMACIÓN DEL VEHÍCULO
                    </h3>
                </div>

                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    padding: '0.5rem 1.25rem',
                    marginBottom: '2rem',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <InfoRow
                        icon={<Hash size={20} color="#3B82F6" />}
                        bg="rgba(59, 130, 246, 0.1)"
                        label="Placa"
                        value={mockData.plate}
                    />
                    <InfoRow
                        icon={<Truck size={20} color="#3B82F6" />}
                        bg="rgba(59, 130, 246, 0.1)"
                        label="Modelo"
                        value={mockData.model}
                    />
                    <InfoRow
                        icon={<Factory size={20} color="#3B82F6" />}
                        bg="rgba(59, 130, 246, 0.1)"
                        label="Marca"
                        value={mockData.brand}
                        isLast
                    />
                </div>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        padding: '1rem',
                        background: 'none',
                        border: 'none',
                        color: '#EF4444',
                        fontWeight: '600',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        marginBottom: '2rem'
                    }}
                >
                    <LogOut size={22} />
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
};

const InfoRow = ({ icon, bg, label, value, isLast }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '1rem 0',
        borderBottom: isLast ? 'none' : '1px solid var(--border-light)'
    }}>
        <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '1rem'
        }}>
            {icon}
        </div>
        <div className="flex flex-col">
            <span style={{
                fontSize: '0.75rem',
                color: 'var(--text-light)',
                marginBottom: '0.125rem'
            }}>
                {label}
            </span>
            <span style={{
                fontSize: '0.95rem',
                fontWeight: '700',
                color: 'var(--text-dark)'
            }}>
                {value}
            </span>
        </div>
    </div>
);

export default Profile;
