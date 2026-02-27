import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, Truck, Clock, ChevronRight, Menu, Bell, Camera, CheckCircle, BarChart3, Wrench, X, ImageIcon, Upload } from 'lucide-react';
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
    const [activeMaintenance, setActiveMaintenance] = useState(null);
    const [showMaintenance, setShowMaintenance] = useState(false);
    const [maintenanceText, setMaintenanceText] = useState('');
    const [maintenancePhoto, setMaintenancePhoto] = useState(null);
    const [maintenancePhotoPreview, setMaintenancePhotoPreview] = useState(null);
    const [maintenanceSubmitting, setMaintenanceSubmitting] = useState(false);
    const maintenanceFileRef = useRef(null);
    const navigate = useNavigate();

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/');
                return;
            }

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

            const active = trips && trips.length > 0 ? trips[0] : null;

            if (active) {
                setActiveTrip(active);
                setNextTrips([]);
                // Also check if there's any active weighing for this trip
                const { data: cw } = await supabase
                    .from('trip_pesajes')
                    .select('id')
                    .eq('trip_id', active.id)
                    .isNull('end_time')
                    .maybeSingle();
                setWeighingDone(!!cw);
            } else {
                setActiveTrip(null);
                setWeighingDone(false);
                const { data: next } = await supabase
                    .from('trips')
                    .select('*')
                    .eq('driver_id', user.id)
                    .eq('status', 'created') // Changed from 'pending' to 'created' to match original logic
                    .order('start_time', { ascending: true });
                setNextTrips(next || []);
            }

            // Check if there is an active maintenance (inactivo or mantenimiento with no end_time)
            const { data: maintenanceData } = await supabase
                .from('driver_activities')
                .select('*')
                .eq('driver_id', user.id)
                .in('type', ['mantenimiento', 'inactivo'])
                .isNull('end_time')
                .order('start_time', { ascending: false })
                .limit(1)
                .maybeSingle();

            setActiveMaintenance(maintenanceData || null);

        } catch (error) {
            console.error('Error fetching driver data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFinishMaintenance = async () => {
        if (!activeMaintenance) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('driver_activities')
                .update({ end_time: new Date().toISOString() })
                .eq('id', activeMaintenance.id);

            if (error) throw error;

            alert('Mantenimiento finalizado correctamente.');
            fetchData(); // Refresh data
        } catch (err) {
            console.error('Error finishing maintenance:', err);
            alert('Error al finalizar el mantenimiento.');
        } finally {
            setLoading(false);
        }
    };

    const handleMaintenancePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setMaintenancePhoto(file);
            setMaintenancePhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleMaintenanceSubmit = async () => {
        if (!maintenanceText.trim()) {
            alert('Por favor, describe el motivo del mantenimiento.');
            return;
        }
        setMaintenanceSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Close any existing open maintenance/inactivo records first
            await supabase
                .from('driver_activities')
                .update({ end_time: new Date().toISOString() })
                .eq('driver_id', user.id)
                .is('end_time', null);

            let photoUrl = null;
            if (maintenancePhoto) {
                const ext = maintenancePhoto.name.split('.').pop();
                const filePath = `maintenance/${user.id}/${Date.now()}.${ext}`;
                const { error: uploadError } = await supabase.storage
                    .from('trip-photos')
                    .upload(filePath, maintenancePhoto);
                if (uploadError) throw uploadError;
                photoUrl = filePath;
            }

            const { error } = await supabase
                .from('driver_activities')
                .insert([{
                    driver_id: user.id,
                    type: 'mantenimiento',
                    reason: maintenanceText.trim(),
                    photo_url: photoUrl,
                    start_time: new Date().toISOString(),
                }]);
            if (error) throw error;

            alert('Reporte de mantenimiento enviado correctamente.');
            setShowMaintenance(false);
            setMaintenanceText('');
            setMaintenancePhoto(null);
            setMaintenancePhotoPreview(null);
            fetchData(); // Refresh to show active maintenance
        } catch (err) {
            console.error('Error submitting maintenance:', err);
            alert('Error al enviar el reporte de mantenimiento.');
        } finally {
            setMaintenanceSubmitting(false);
        }
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
                            {/* Action Buttons Container */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {activeMaintenance ? (
                                    <button
                                        onClick={handleFinishMaintenance}
                                        style={{
                                            background: '#F97316',
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
                                            boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
                                            width: '100%',
                                            justifyContent: 'center',
                                            transition: 'transform 0.1s',
                                        }}
                                    >
                                        <CheckCircle size={24} strokeWidth={2.5} /> FINALIZAR MANTENIMIENTO
                                    </button>
                                ) : (
                                    <>
                                        {/* Nuevo Viaje */}
                                        <button
                                            onClick={() => navigate('/driver/new-trip')}
                                            style={{
                                                background: 'var(--primary-red)', // Changed from primary-gradient to primary-red to match original
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
                                                boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)', // Adjusted shadow color
                                                width: '100%',
                                                justifyContent: 'center',
                                                transition: 'transform 0.1s',
                                            }}
                                        >
                                            <Plus size={24} strokeWidth={3} /> NUEVO VIAJE
                                        </button>

                                        {/* Maintenance Button */}
                                        <button
                                            onClick={() => setShowMaintenance(true)}
                                            style={{
                                                background: '#F97316',
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
                                                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
                                                width: '100%',
                                                justifyContent: 'center',
                                                transition: 'transform 0.1s',
                                            }}
                                        >
                                            <Wrench size={22} strokeWidth={2.5} /> MANTENIMIENTO
                                        </button>
                                    </>
                                )}

                                {/* Reports Quick Access */}
                                <button
                                    onClick={() => navigate('/driver/reports')}
                                    style={{
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
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        width: '100%',
                                    }}
                                >
                                    <BarChart3 size={20} /> Mis Reportes
                                </button>
                            </div>
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

            {/* ===== Maintenance Modal ===== */}
            {showMaintenance && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60,
                    backdropFilter: 'blur(4px)', padding: '1rem',
                }}>
                    <div style={{
                        background: 'white', borderRadius: '20px', width: '100%', maxWidth: '460px',
                        boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.35)',
                        overflow: 'hidden',
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            borderBottom: '1px solid #E5E7EB',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: '#FFF7ED',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '12px',
                                    background: '#F97316', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Wrench size={20} color="white" />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1F2937', margin: 0 }}>
                                        Reporte de Mantenimiento
                                    </h2>
                                    <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0, fontWeight: '500' }}>
                                        Describe el motivo y adjunta evidencia
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowMaintenance(false);
                                    setMaintenanceText('');
                                    setMaintenancePhoto(null);
                                    setMaintenancePhotoPreview(null);
                                }}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: '#9CA3AF', padding: '4px', borderRadius: '8px',
                                }}
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '1.5rem' }}>
                            {/* Description */}
                            <label style={{
                                display: 'block', fontSize: '0.8rem', fontWeight: '700',
                                color: '#374151', marginBottom: '0.5rem',
                            }}>
                                Descripción del mantenimiento
                            </label>
                            <textarea
                                value={maintenanceText}
                                onChange={(e) => setMaintenanceText(e.target.value)}
                                placeholder="Ej: Cambio de aceite, revisión de frenos, llanta ponchada..."
                                rows={4}
                                style={{
                                    width: '100%', padding: '0.875rem',
                                    borderRadius: '12px', border: '1px solid #E5E7EB',
                                    fontSize: '0.9rem', color: '#1F2937',
                                    resize: 'vertical', outline: 'none',
                                    fontFamily: 'inherit', boxSizing: 'border-box',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#F97316'}
                                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                            />

                            {/* Photo Upload */}
                            <label style={{
                                display: 'block', fontSize: '0.8rem', fontWeight: '700',
                                color: '#374151', marginBottom: '0.5rem', marginTop: '1.25rem',
                            }}>
                                Foto de evidencia
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                ref={maintenanceFileRef}
                                onChange={handleMaintenancePhotoChange}
                                style={{ display: 'none' }}
                            />
                            {maintenancePhotoPreview ? (
                                <div style={{ position: 'relative' }}>
                                    <img
                                        src={maintenancePhotoPreview}
                                        alt="Evidencia"
                                        style={{
                                            width: '100%', aspectRatio: '16/10',
                                            objectFit: 'cover', borderRadius: '12px',
                                            border: '2px solid #F97316',
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            setMaintenancePhoto(null);
                                            setMaintenancePhotoPreview(null);
                                            if (maintenanceFileRef.current) maintenanceFileRef.current.value = '';
                                        }}
                                        style={{
                                            position: 'absolute', top: '8px', right: '8px',
                                            background: 'rgba(0,0,0,0.6)', border: 'none',
                                            borderRadius: '50%', width: '32px', height: '32px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', color: 'white',
                                        }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => maintenanceFileRef.current?.click()}
                                    style={{
                                        width: '100%', padding: '2rem',
                                        borderRadius: '12px',
                                        border: '2px dashed #D1D5DB',
                                        background: '#FAFAFA',
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center',
                                        gap: '0.5rem', cursor: 'pointer',
                                        transition: 'border-color 0.2s, background 0.2s',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = '#F97316';
                                        e.currentTarget.style.background = '#FFF7ED';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = '#D1D5DB';
                                        e.currentTarget.style.background = '#FAFAFA';
                                    }}
                                >
                                    <Camera size={32} color="#9CA3AF" strokeWidth={1.5} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#6B7280' }}>
                                        Tomar foto o seleccionar archivo
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                                        JPG, PNG (máximo 10MB)
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '1rem 1.5rem', borderTop: '1px solid #E5E7EB',
                            display: 'flex', gap: '0.75rem',
                        }}>
                            <button
                                onClick={() => {
                                    setShowMaintenance(false);
                                    setMaintenanceText('');
                                    setMaintenancePhoto(null);
                                    setMaintenancePhotoPreview(null);
                                }}
                                style={{
                                    flex: 1, padding: '0.875rem',
                                    background: 'white', color: '#6B7280',
                                    border: '1px solid #E5E7EB', borderRadius: '12px',
                                    fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleMaintenanceSubmit}
                                disabled={maintenanceSubmitting || !maintenanceText.trim()}
                                style={{
                                    flex: 1, padding: '0.875rem',
                                    background: maintenanceText.trim() ? '#F97316' : '#FDBA74',
                                    color: 'white', border: 'none', borderRadius: '12px',
                                    fontWeight: '700', fontSize: '0.9rem',
                                    cursor: maintenanceText.trim() ? 'pointer' : 'not-allowed',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    boxShadow: maintenanceText.trim() ? '0 4px 12px rgba(249, 115, 22, 0.3)' : 'none',
                                    transition: 'background 0.2s',
                                }}
                            >
                                {maintenanceSubmitting ? 'Enviando...' : <><Wrench size={18} /> Enviar Reporte</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverDashboard;
