import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowRight, Info } from 'lucide-react';
import { supabase } from '../supabaseClient';

const TripCompleted = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const tripData = location.state || {};

    const { tripId, origin, destination, elapsed } = tripData;
    const [trip, setTrip] = useState(null);

    useEffect(() => {
        if (tripId) {
            supabase.from('trips').select('*').eq('id', parseInt(tripId)).single()
                .then(({ data }) => setTrip(data));
        }
    }, [tripId]);

    // Clean up weighing flag for this trip
    useEffect(() => {
        if (tripId) {
            sessionStorage.removeItem(`weighing_done_${tripId}`);
        }
    }, [tripId]);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-light)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1.5rem'
        }}>
            {/* Success Icon */}
            <div style={{
                width: '96px', height: '96px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1.5rem',
                boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)',
                animation: 'bounceIn 0.6s ease-out'
            }}>
                <CheckCircle size={48} color="white" strokeWidth={2.5} />
            </div>

            {/* Title */}
            <h1 style={{
                fontSize: '1.75rem',
                fontWeight: '800',
                color: 'var(--text-dark)',
                textAlign: 'center',
                marginBottom: '2rem',
                lineHeight: '1.3'
            }}>
                ¡Viaje Finalizado<br />Exitosamente!
            </h1>

            {/* Summary Card */}
            <div style={{
                width: '100%',
                maxWidth: '380px',
                background: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                marginBottom: '1.5rem'
            }}>
                <div style={{
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    color: 'var(--text-light)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: '1rem'
                }}>
                    RESUMEN DEL VIAJE
                </div>

                {/* ID */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'var(--text-medium)', fontSize: '0.9rem' }}>ID de Viaje</span>
                    <span style={{ fontWeight: '700', color: 'var(--text-dark)', fontSize: '0.9rem' }}>
                        TRK-{tripId ? tripId.toString().slice(-5) : '00000'}
                    </span>
                </div>

                {/* Route */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'var(--text-medium)', fontSize: '0.9rem' }}>Ruta</span>
                    <span style={{ fontWeight: '700', color: 'var(--text-dark)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {origin || 'APMT'}
                        <ArrowRight size={14} color="var(--primary-red)" />
                        {destination || 'Principal'}
                    </span>
                </div>

                {/* Time */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: trip?.km_start != null ? '1px solid var(--border-light)' : 'none' }}>
                    <span style={{ color: 'var(--text-medium)', fontSize: '0.9rem' }}>Tiempo Total</span>
                    <span style={{ fontWeight: '700', color: 'var(--primary-red)', fontSize: '0.9rem' }}>
                        {elapsed || '00:00:00'}
                    </span>
                </div>

                {/* Distance */}
                {trip?.km_start != null && trip?.km_end != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0' }}>
                        <span style={{ color: 'var(--text-medium)', fontSize: '0.9rem' }}>Distancia</span>
                        <span style={{ fontWeight: '700', color: '#16A34A', fontSize: '0.9rem' }}>
                            {(trip.km_end - trip.km_start).toLocaleString('es-PE')} km
                        </span>
                    </div>
                )}
            </div>

            {/* Info Banner */}
            <div style={{
                width: '100%',
                maxWidth: '380px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '2rem',
                padding: '0 0.25rem'
            }}>
                <Info size={16} color="var(--primary-red)" />
                <span style={{ color: 'var(--text-medium)', fontSize: '0.8rem' }}>
                    El registro ha sido enviado a la central.
                </span>
            </div>

            {/* CTA */}
            <button
                onClick={() => navigate('/driver')}
                style={{
                    width: '100%',
                    maxWidth: '380px',
                    background: 'var(--primary-gradient)',
                    color: 'white',
                    border: 'none',
                    padding: '1rem',
                    borderRadius: '12px',
                    fontWeight: '800',
                    fontSize: '1.05rem',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-red)'
                }}
            >
                Volver al Inicio
            </button>

            {/* Bounce-in animation */}
            <style>{`
                @keyframes bounceIn {
                    0% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1.15); }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default TripCompleted;
