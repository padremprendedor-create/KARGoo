import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Trash2, Calendar } from 'lucide-react';

const History = () => {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('trips')
            .select('*, trip_containers(*)')
            .eq('driver_id', user.id)
            .in('status', ['completed', 'cancelled', 'approved', 'rejected'])
            .order('end_time', { ascending: false });

        setTrips(data || []);
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-orange-500 font-medium">Cargando historial...</div>
            </div>
        );
    }

    // Format date like "24 MAY 2024"
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-PE', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).toUpperCase().replace('.', '');
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-light)', paddingBottom: '20px' }}>
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
                zIndex: 40
            }}>
                <button
                    onClick={() => navigate('/driver')}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                    <ChevronLeft size={28} />
                </button>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Historial de Viajes</h1>
            </div>

            {/* Content */}
            <div className="container">
                {/* Summary Bar */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1.25rem 0.5rem 0.75rem',
                }}>
                    <span style={{ color: 'var(--text-medium)', fontSize: '0.9rem', fontWeight: '500' }}>
                        Resumen de actividad
                    </span>
                    <span style={{ color: 'var(--text-dark)', fontSize: '0.9rem', fontWeight: '800' }}>
                        Total Viajes: {trips.length}
                    </span>
                </div>

                {/* Trips List */}
                {trips.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                        <div style={{
                            width: '64px', height: '64px',
                            margin: '0 auto 1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--bg-card)',
                            borderRadius: '50%',
                        }}>
                            <Calendar size={32} color="var(--text-light)" strokeWidth={1.5} />
                        </div>
                        <p style={{ color: 'var(--text-medium)', fontSize: '1rem' }}>
                            No tienes viajes completados aún.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {trips.map(trip => (
                            <div key={trip.id} style={{
                                background: 'var(--bg-card)',
                                borderRadius: '16px',
                                padding: '1rem 1.25rem',
                                boxShadow: 'var(--shadow-sm)',
                                border: '1px solid var(--border-light)'
                            }}>
                                {/* Top Row: Date & Status */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{
                                        color: 'var(--text-light)',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {formatDate(trip.end_time || trip.created_at)}
                                    </span>
                                    <span style={{
                                        background: trip.status === 'approved' ? '#DCFCE7'
                                            : trip.status === 'rejected' ? '#FEF3C7'
                                                : trip.status === 'completed' ? '#EFF6FF'
                                                    : '#FEE2E2',
                                        color: trip.status === 'approved' ? '#16A34A'
                                            : trip.status === 'rejected' ? '#D97706'
                                                : trip.status === 'completed' ? '#2563EB'
                                                    : '#DC2626',
                                        padding: '0.25rem 0.625rem',
                                        borderRadius: '999px',
                                        fontSize: '0.65rem',
                                        fontWeight: '700',
                                        letterSpacing: '0.05em',
                                        textTransform: 'uppercase'
                                    }}>
                                        {trip.status === 'approved' ? 'APROBADO'
                                            : trip.status === 'rejected' ? 'OBSERVADO'
                                                : trip.status === 'completed' ? 'POR REVISAR'
                                                    : 'CANCELADO'}
                                    </span>
                                </div>

                                {/* Route */}
                                <div style={{
                                    fontSize: '1rem',
                                    fontWeight: '800',
                                    color: 'var(--text-dark)',
                                    marginBottom: '0.5rem'
                                }}>
                                    {trip.origin} → {trip.destination}
                                </div>

                                {/* Container Info */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    color: 'var(--text-medium)',
                                    fontWeight: '600',
                                    fontSize: '0.875rem',
                                    marginBottom: '1rem'
                                }}>
                                    <Trash2 size={16} color="var(--text-light)" />
                                    <span>
                                        Contenedor: {trip.trip_containers?.[0]?.container_number || 'N/A'}
                                    </span>
                                </div>

                                {/* Distance */}
                                {trip.km_start != null && trip.km_end != null && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        color: 'var(--text-medium)',
                                        fontWeight: '600',
                                        fontSize: '0.875rem',
                                        marginBottom: '1rem'
                                    }}>
                                        <span style={{ fontSize: '16px' }}>🛣️</span>
                                        <span>
                                            Distancia: {(trip.km_end - trip.km_start).toLocaleString('es-PE')} km
                                        </span>
                                    </div>
                                )}

                                {/* Divider */}
                                <div style={{ height: '1px', background: 'var(--border-light)', marginBottom: '0.75rem' }} />

                                {/* footer */}
                                <div style={{ textAlign: 'right' }}>
                                    <button
                                        onClick={() => navigate(`/driver/history/${trip.id}`)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--primary-red)',
                                            fontSize: '0.75rem',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            letterSpacing: '0.05em',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.125rem'
                                        }}>
                                        VER DETALLES <ChevronRight size={14} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default History;
