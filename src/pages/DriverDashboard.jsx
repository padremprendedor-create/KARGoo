import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, Truck, Clock, ChevronRight, Menu, Bell, Camera, CheckCircle, BarChart3 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import SidebarDrawer from '../components/SidebarDrawer';
import { supabase } from '../supabaseClient';

const DriverDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [activeTrip, setActiveTrip] = useState(null);
    const [nextTrips, setNextTrips] = useState([]);
    const [weighingDone, setWeighingDone] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/');

        const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
        setProfile(profileData);

        const { data: trips } = await supabase
            .from('trips')
            .select('*, trip_containers(*), trip_photos(*)')
            .eq('driver_id', user.id)
            .eq('status', 'in_progress')
            .limit(1);

        if (trips && trips.length > 0) {
            const trip = trips[0];
            setActiveTrip(trip);

            // Validation: Must have weight > 0 AND a ticket photo
            const hasWeight = trip.weight > 0;
            const hasTicketPhoto = trip.trip_photos?.some(p => p.photo_type === 'ticket');
            setWeighingDone(hasWeight && hasTicketPhoto);
        } else {
            setActiveTrip(null);
            setWeighingDone(false);
        }

        const { data: next } = await supabase
            .from('trips')
            .select('*')
            .eq('driver_id', user.id)
            .eq('status', 'created')
            .order('start_time', { ascending: true });

        setNextTrips(next || []);
        setLoading(false);
    };

    // Fetch fresh data on mount and whenever the page regains visibility
    useEffect(() => {
        fetchData();
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') fetchData();
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    const today = new Date();
    const dateStr = today.toLocaleDateString('es-PE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
    // Capitalize first letter of date
    const formattedDateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    const firstName = profile?.full_name?.split(' ')[0] || 'Conductor';

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-orange-500 font-medium">Cargando...</div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-light)', paddingBottom: '20px' }}>
            <SidebarDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            {/* Top Bar */}
            <div style={{
                background: 'var(--primary-red)',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'white',
                position: 'sticky',
                top: 0,
                zIndex: 40
            }}>
                <button
                    onClick={() => setSidebarOpen(true)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}
                >
                    <Menu size={24} />
                </button>
                <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>
                    KARGoo Driver
                </span>
                <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}
                >
                    <Bell size={24} />
                </button>
            </div>

            {/* Greeting */}
            <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '1.5rem' }}>
                <h1 style={{
                    fontSize: '1.75rem',
                    fontWeight: '800',
                    color: 'var(--text-dark)',
                    margin: '0 0 0.5rem',
                }}>
                    Hola, {firstName}
                </h1>
                <p style={{
                    fontSize: '1rem',
                    color: 'var(--text-medium)',
                    margin: 0,
                }}>
                    {formattedDateStr}
                </p>
            </div>

            <div className="container">
                {/* Active Trip */}
                <section className="mb-10">
                    <div className="flex justify-between items-center mb-4">
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-dark)' }}>
                            Viaje Actual
                        </h3>
                        {activeTrip && (
                            <div className="flex items-center">
                                <span style={{
                                    background: '#FFEDD5',
                                    color: '#C2410C',
                                    fontSize: '0.7rem',
                                    fontWeight: '700',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '999px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>
                                    EN CURSO
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: '600', marginLeft: '0.5rem' }}>
                                    TRK-{activeTrip.id.toString().slice(-5)}
                                </span>
                            </div>
                        )}
                    </div>

                    {activeTrip ? (
                        <Card variant="flat" style={{
                            padding: '1.25rem',
                            borderRadius: '16px',
                            background: 'var(--bg-card)',
                            boxShadow: 'var(--shadow-md)',
                            border: 'none'
                        }}>
                            {/* Trip Header info */}
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Truck size={16} color="var(--primary-red)" />
                                    <span style={{
                                        color: 'var(--primary-red)',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        RUTA DE CARGA
                                    </span>
                                </div>
                                <h2 style={{
                                    fontSize: '1.25rem',
                                    fontWeight: '800',
                                    color: 'var(--text-dark)',
                                    marginBottom: '0.25rem'
                                }}>
                                    {activeTrip.origin} → {activeTrip.destination}
                                </h2>
                                <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem' }}>
                                    <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                        {activeTrip.trip_containers && activeTrip.trip_containers.length > 0 ? (
                                            activeTrip.trip_containers.map((c, i) => (
                                                <span key={i} style={{ fontSize: '0.8rem', color: 'var(--text-light)', background: '#F3F4F6', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>
                                                    {c.container_number}
                                                </span>
                                            ))
                                        ) : (
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Sin contenedor</span>
                                        )}
                                    </div>
                                </p>
                            </div>

                            {/* Map Placeholder */}
                            <div
                                onClick={() => navigate(`/driver/trip/${activeTrip.id}`)}
                                style={{
                                    width: '100%',
                                    height: '180px',
                                    background: '#E0F2FE', // Keep as light blue for map feel
                                    borderRadius: '12px',
                                    marginBottom: '1.25rem',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(255,255,255,0.4) 10%, transparent 20%), radial-gradient(circle at 90% 80%, rgba(255,255,255,0.4) 10%, transparent 20%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {/* Mock Map Elements */}
                                <div style={{
                                    position: 'absolute',
                                    top: '50%', left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: '160px', height: '160px',
                                    border: '2px solid rgba(255,255,255,0.5)',
                                    borderRadius: '50%',
                                    opacity: 0.5
                                }} />
                                <div style={{
                                    width: '48px', height: '48px',
                                    background: 'var(--primary-red)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(211, 47, 47, 0.4)',
                                    zIndex: 10
                                }}>
                                    <MapPin size={24} color="white" fill="white" />
                                </div>
                                <div style={{
                                    position: 'absolute',
                                    bottom: '10px',
                                    background: 'rgba(255,255,255,0.9)',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.65rem',
                                    color: '#6B7280',
                                    fontWeight: '500'
                                }}>
                                    Google Maps Preview
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => navigate(`/driver/trip/${activeTrip.id}/weighing`)}
                                    style={{
                                        background: 'var(--primary-red)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        fontWeight: '700',
                                        fontSize: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 6px -1px rgba(211, 47, 47, 0.2)'
                                    }}>
                                    <Camera size={20} /> {weighingDone ? '✓ Pesaje Registrado' : 'Registrar Pesaje'}
                                </button>
                                <button
                                    onClick={() => {
                                        if (weighingDone) navigate(`/driver/trip/${activeTrip.id}`);
                                    }}
                                    disabled={!weighingDone}
                                    style={{
                                        background: weighingDone ? 'var(--bg-card)' : 'var(--bg-light)',
                                        color: weighingDone ? 'var(--primary-red)' : 'var(--text-light)',
                                        border: weighingDone ? '2px solid var(--primary-red)' : '2px solid var(--border-light)',
                                        padding: '0.875rem',
                                        borderRadius: '12px',
                                        fontWeight: '700',
                                        fontSize: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        cursor: weighingDone ? 'pointer' : 'not-allowed',
                                        opacity: weighingDone ? 1 : 0.6
                                    }}>
                                    <CheckCircle size={20} /> Finalizar Viaje
                                </button>
                                {!weighingDone && (
                                    <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-light)', margin: 0 }}>
                                        Registre el pesaje antes de finalizar el viaje
                                    </p>
                                )}
                            </div>
                        </Card>
                    ) : (
                        <Card variant="flat" style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', borderRadius: '24px', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                            <div style={{
                                width: '80px', height: '80px',
                                background: '#FFF7ED',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1.5rem',
                            }}>
                                <Truck size={40} color="#9CA3AF" strokeWidth={1.5} />
                            </div>
                            <h3 style={{ fontWeight: '800', fontSize: '1.25rem', color: 'var(--text-dark)', marginBottom: '0.75rem' }}>
                                No tienes viajes en curso
                            </h3>
                            <p style={{ fontSize: '0.95rem', color: 'var(--text-medium)', maxWidth: '280px', margin: '0 auto 2rem', lineHeight: '1.6' }}>
                                Inicia un nuevo viaje para comenzar tu jornada de hoy.
                            </p>
                            <button
                                onClick={() => navigate('/driver/new-trip')}
                                style={{
                                    background: 'var(--primary-red)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '1rem 2rem',
                                    borderRadius: '16px',
                                    fontWeight: '800',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)',
                                    width: '100%',
                                    justifyContent: 'center',
                                    transition: 'transform 0.1s'
                                }}
                            >
                                <Plus size={24} strokeWidth={3} /> NUEVO VIAJE
                            </button>

                            {/* Reports Quick Access */}
                            <button
                                onClick={() => navigate('/driver/reports')}
                                style={{
                                    marginTop: '1rem',
                                    background: 'transparent',
                                    color: 'var(--text-light)',
                                    border: '1px solid var(--border-light)',
                                    padding: '0.75rem 2rem',
                                    borderRadius: '16px',
                                    fontWeight: '600',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    width: '100%',
                                    justifyContent: 'center',
                                }}
                            >
                                <BarChart3 size={20} /> Mis Reportes
                            </button>
                        </Card>
                    )}
                </section>

                {/* Next Trips */}
                <section className="mb-24">
                    <div className="flex justify-between items-center mb-4">
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-dark)' }}>
                            Próximos Viajes
                        </h3>
                    </div>

                    <div className="flex flex-col gap-3">
                        {nextTrips.length > 0 ? nextTrips.map(trip => (
                            <div key={trip.id} onClick={() => navigate(`/driver/new-trip?tripId=${trip.id}`)} style={{
                                background: 'var(--bg-card)',
                                borderRadius: '12px',
                                padding: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                border: '1px solid var(--border-light)',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}>
                                <div style={{
                                    width: '40px', height: '40px',
                                    background: 'var(--bg-light)',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-light)'
                                }}>
                                    <Clock size={20} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '0.125rem' }}>
                                        {trip.origin} → {trip.destination}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-muted" style={{ color: 'var(--text-light)' }}>
                                        <span>{new Date(trip.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span>•</span>
                                        <span>Ref: {trip.id.toString().slice(-5)}</span>
                                    </div>
                                </div>
                                <ChevronRight size={20} color="var(--text-light)" />
                            </div>
                        )) : (
                            <div className="p-4 text-center text-muted text-sm rounded-xl border border-dashed border-gray-200" style={{ color: 'var(--text-light)', borderColor: 'var(--border-light)', background: 'var(--bg-card)' }}>
                                No tienes viajes pendientes.
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default DriverDashboard;
