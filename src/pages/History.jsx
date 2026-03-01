import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Trash2, Calendar, Package } from 'lucide-react';

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

                                {/* Badges: Service Type & Cargo Type */}
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                    {trip.service_type && (
                                        <span style={{
                                            background: '#F3F4F6', color: '#4B5563', padding: '0.2rem 0.6rem',
                                            borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase'
                                        }}>
                                            Servicio: {trip.service_type}
                                        </span>
                                    )}
                                    {trip.cargo_type && (
                                        <span style={{
                                            background: trip.cargo_type === 'imo' ? '#FEE2E2' : trip.cargo_type === 'iqbf' ? '#F3E8FF' : '#E0F2FE',
                                            color: trip.cargo_type === 'imo' ? '#DC2626' : trip.cargo_type === 'iqbf' ? '#9333EA' : '#0284C7',
                                            padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase'
                                        }}>
                                            Carga: {trip.cargo_type}
                                        </span>
                                    )}
                                </div>

                                {/* Container Info */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.65rem',
                                    marginBottom: '1rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Package size={16} color="var(--text-light)" />
                                        <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Contenedores ({trip.trip_containers?.length || 0})
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {trip.trip_containers && trip.trip_containers.length > 0 ? (
                                            trip.trip_containers.map((c, i) => (
                                                <div key={i} style={{
                                                    background: '#FFF7ED',
                                                    border: '1px solid #FFEDD5',
                                                    padding: '0.4rem 0.75rem',
                                                    borderRadius: '10px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    minWidth: '100px'
                                                }}>
                                                    <span style={{ fontSize: '0.85rem', color: '#9A3412', fontWeight: '800', letterSpacing: '0.02em' }}>
                                                        {c.container_number}
                                                    </span>
                                                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.1rem' }}>
                                                        <span style={{ fontSize: '0.6rem', fontWeight: '700', color: '#EA580C', opacity: 0.8 }}>
                                                            {c.dimension}'
                                                        </span>
                                                        <span style={{ fontSize: '0.6rem', fontWeight: '700', color: '#EA580C', opacity: 0.8 }}>
                                                            {c.condition}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontStyle: 'italic' }}>Sin datos de contenedor</span>
                                        )}
                                    </div>
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
