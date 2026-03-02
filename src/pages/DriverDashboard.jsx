import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, Truck, Clock, ChevronRight, Menu, Bell, Camera, CheckCircle, BarChart3, Wrench, X, ImageIcon, Upload, ShieldCheck, ClipboardCheck } from 'lucide-react';
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

    // Relay (Tomar Relevo) state
    const [showRelayModal, setShowRelayModal] = useState(false);
    const [selectedRelayTrip, setSelectedRelayTrip] = useState(null);
    const [relayPin, setRelayPin] = useState('');
    const [relaying, setRelaying] = useState(false);
    // CHEQUEO / IPERC
    const [chequeoDoneToday, setChequeoDoneToday] = useState(false);
    const [ipercDoneToday, setIpercDoneToday] = useState(false);
    const [chequeoTime, setChequeoTime] = useState(null);
    const [ipercTime, setIpercTime] = useState(null);
    const [uploadingChequeo, setUploadingChequeo] = useState(false);
    const [uploadingIperc, setUploadingIperc] = useState(false);
    const chequeoFileRef = useRef(null);
    const ipercFileRef = useRef(null);
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
                // Check if a ticket photo has been uploaded for this trip
                const hasTicket = active.trip_photos?.some(p => p.photo_type === 'ticket');
                setWeighingDone(!!hasTicket);
            } else {
                setActiveTrip(null);
                setWeighingDone(false);
                const { data: next } = await supabase
                    .from('trips')
                    .select('*')
                    .eq('driver_id', user.id)
                    .eq('status', 'relevado') // Changed: Fetch trips waiting for relay
                    .order('start_time', { ascending: true });
                setNextTrips(next || []);
            }

            // Check if there is an active maintenance (inactivo or mantenimiento with no end_time)
            const { data: maintenanceData } = await supabase
                .from('driver_activities')
                .select('*')
                .eq('driver_id', user.id)
                .in('type', ['mantenimiento', 'inactivo'])
                .is('end_time', null)
                .order('start_time', { ascending: false })
                .limit(1)
                .maybeSingle();

            setActiveMaintenance(maintenanceData || null);

            // Check if CHEQUEO/IPERC were uploaded today (from DB)
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const { data: dailyChecks } = await supabase
                .from('driver_daily_checks')
                .select('check_type, uploaded_at')
                .eq('driver_id', user.id)
                .gte('uploaded_at', todayStart.toISOString())
                .order('uploaded_at', { ascending: false });

            const chequeoCheck = dailyChecks?.find(c => c.check_type === 'chequeo');
            const ipercCheck = dailyChecks?.find(c => c.check_type === 'iperc');
            setChequeoDoneToday(!!chequeoCheck);
            setIpercDoneToday(!!ipercCheck);
            setChequeoTime(chequeoCheck ? new Date(chequeoCheck.uploaded_at) : null);
            setIpercTime(ipercCheck ? new Date(ipercCheck.uploaded_at) : null);

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

    // Upload CHEQUEO or IPERC photo
    const handleDailyPhotoUpload = async (type) => {
        const setter = type === 'chequeo' ? setUploadingChequeo : setUploadingIperc;
        setter(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const fileRef = type === 'chequeo' ? chequeoFileRef : ipercFileRef;
            const file = fileRef.current?.files?.[0];
            if (!file) return;

            const ext = file.name.split('.').pop();
            const todayKey = new Date().toISOString().slice(0, 10);
            const filePath = `${type}/${user.id}/${todayKey}_${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage
                .from('trip-photos')
                .upload(filePath, file);
            if (uploadError) throw uploadError;

            // Save record to DB with timestamp
            const now = new Date();
            const { error: dbError } = await supabase
                .from('driver_daily_checks')
                .insert({
                    driver_id: user.id,
                    check_type: type,
                    photo_url: filePath,
                    uploaded_at: now.toISOString()
                });
            if (dbError) console.error('Error saving daily check:', dbError);

            if (type === 'chequeo') {
                setChequeoDoneToday(true);
                setChequeoTime(now);
            } else {
                setIpercDoneToday(true);
                setIpercTime(now);
            }

            alert(`Foto de ${type.toUpperCase()} subida correctamente.`);
        } catch (err) {
            console.error(`Error uploading ${type}:`, err);
            alert(`Error al subir foto de ${type.toUpperCase()}.`);
        } finally {
            setter(false);
        }
    };

    const handleTakeRelayClick = (trip) => {
        setSelectedRelayTrip(trip);
        setRelayPin('');
        setShowRelayModal(true);
    };

    const handleConfirmRelay = async () => {
        if (!selectedRelayTrip) return;
        if (!relayPin || relayPin.length !== 3 || !/^\d{3}$/.test(relayPin)) {
            alert('Ingrese una clave de seguridad válida de 3 dígitos');
            return;
        }

        setRelaying(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No autenticado");

            // Verify PIN against the trip record
            const { data: tripData, error: fetchError } = await supabase
                .from('trips')
                .select('relay_pin')
                .eq('id', selectedRelayTrip.id)
                .single();

            if (fetchError) throw fetchError;

            if (tripData.relay_pin !== relayPin) {
                alert('Clave incorrecta. Intente nuevamente.');
                setRelaying(false);
                return;
            }

            // Valid PIN -> Update trip
            const { error: updateError } = await supabase
                .from('trips')
                .update({
                    status: 'in_progress',
                    driver_id: user.id,
                    relay_pin: null
                })
                .eq('id', selectedRelayTrip.id);

            if (updateError) throw updateError;

            setShowRelayModal(false);
            setSelectedRelayTrip(null);
            alert('Has tomado exitosamente este viaje en relevo.');
            navigate(`/driver/trip/${selectedRelayTrip.id}`);
        } catch (err) {
            console.error('Error confirming relay:', err);
            alert(`Error al tomar relevo: ${err.message}`);
        } finally {
            setRelaying(false);
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: '800',
                        color: 'var(--text-dark)',
                        margin: 0,
                    }}>
                        Hola, {firstName}
                    </h1>
                    {/* CHEQUEO / IPERC buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {/* Hidden file inputs */}
                        <input type="file" accept="image/*" capture="environment" ref={chequeoFileRef} style={{ display: 'none' }} onChange={() => handleDailyPhotoUpload('chequeo')} />
                        <input type="file" accept="image/*" capture="environment" ref={ipercFileRef} style={{ display: 'none' }} onChange={() => handleDailyPhotoUpload('iperc')} />

                        <button
                            onClick={() => chequeoFileRef.current?.click()}
                            disabled={uploadingChequeo || chequeoDoneToday}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.35rem',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '999px',
                                border: chequeoDoneToday ? '1.5px solid #16A34A' : '1.5px solid var(--primary-red)',
                                background: chequeoDoneToday ? '#F0FDF4' : '#FFF5F5',
                                color: chequeoDoneToday ? '#16A34A' : 'var(--primary-red)',
                                fontSize: '0.7rem',
                                fontWeight: '800',
                                cursor: chequeoDoneToday ? 'default' : 'pointer',
                                opacity: uploadingChequeo ? 0.6 : 1,
                                letterSpacing: '0.03em',
                                transition: 'all 0.2s',
                            }}
                        >
                            {chequeoDoneToday ? <CheckCircle size={14} /> : <ClipboardCheck size={14} />}
                            {uploadingChequeo ? '...' : chequeoDoneToday && chequeoTime ? `CHEQUEO ${chequeoTime.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}` : 'CHEQUEO'}
                        </button>

                        <button
                            onClick={() => ipercFileRef.current?.click()}
                            disabled={uploadingIperc || ipercDoneToday}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.35rem',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '999px',
                                border: ipercDoneToday ? '1.5px solid #16A34A' : '1.5px solid #7C3AED',
                                background: ipercDoneToday ? '#F0FDF4' : '#F5F3FF',
                                color: ipercDoneToday ? '#16A34A' : '#7C3AED',
                                fontSize: '0.7rem',
                                fontWeight: '800',
                                cursor: ipercDoneToday ? 'default' : 'pointer',
                                opacity: uploadingIperc ? 0.6 : 1,
                                letterSpacing: '0.03em',
                                transition: 'all 0.2s',
                            }}
                        >
                            {ipercDoneToday ? <CheckCircle size={14} /> : <ShieldCheck size={14} />}
                            {uploadingIperc ? '...' : ipercDoneToday && ipercTime ? `IPERC ${ipercTime.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}` : 'IPERC'}
                        </button>
                    </div>
                </div>
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
                                <div style={{ color: 'var(--text-medium)', fontSize: '0.9rem', marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                                    {activeTrip.trip_containers && activeTrip.trip_containers.length > 0 ? (
                                        activeTrip.trip_containers.map((c, i) => (
                                            <span key={i} style={{ fontSize: '0.75rem', color: 'var(--text-dark)', fontWeight: '600', background: 'var(--bg-light)', border: '1px solid var(--border-light)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                                                {c.container_number}
                                            </span>
                                        ))
                                    ) : (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Sin contenedor</span>
                                    )}

                                    {/* Badges: Service & Cargo */}
                                    {activeTrip.service_type && (
                                        <span style={{
                                            background: '#F3F4F6', color: '#4B5563', padding: '0.3rem 0.85rem',
                                            borderRadius: '8px', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase',
                                            border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}>
                                            Servicio: {activeTrip.service_type}
                                        </span>
                                    )}
                                    {activeTrip.cargo_type && (
                                        <span style={{
                                            background: activeTrip.cargo_type === 'imo' ? '#FEE2E2' : activeTrip.cargo_type === 'iqbf' ? '#F3E8FF' : '#E0F2FE',
                                            color: activeTrip.cargo_type === 'imo' ? '#DC2626' : activeTrip.cargo_type === 'iqbf' ? '#9333EA' : '#0284C7',
                                            border: `1px solid ${activeTrip.cargo_type === 'imo' ? '#FECACA' : activeTrip.cargo_type === 'iqbf' ? '#E9D5FF' : '#BAE6FD'}`,
                                            padding: '0.3rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '900', textTransform: 'uppercase',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}>
                                            Carga: {activeTrip.cargo_type}
                                        </span>
                                    )}
                                </div>
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
                                            onClick={() => chequeoDoneToday && navigate('/driver/new-trip')}
                                            disabled={!chequeoDoneToday}
                                            style={{
                                                background: chequeoDoneToday ? 'var(--primary-red)' : '#E5E7EB',
                                                color: chequeoDoneToday ? 'white' : '#9CA3AF',
                                                border: 'none',
                                                padding: '1rem 2rem',
                                                borderRadius: '16px',
                                                fontWeight: '800',
                                                fontSize: '1rem',
                                                cursor: chequeoDoneToday ? 'pointer' : 'not-allowed',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                boxShadow: chequeoDoneToday ? '0 4px 12px rgba(211, 47, 47, 0.3)' : 'none',
                                                width: '100%',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s',
                                                opacity: chequeoDoneToday ? 1 : 0.7,
                                            }}
                                        >
                                            <Plus size={24} strokeWidth={3} /> NUEVO VIAJE
                                        </button>
                                        {!chequeoDoneToday && (
                                            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#EF4444', margin: '0.25rem 0 0', fontWeight: '600' }}>
                                                Suba foto de CHEQUEO para iniciar un viaje
                                            </p>
                                        )}

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

                {/* Next Trips (Tomar Relevo) */}
                <section className="mb-24">
                    <div className="flex justify-between items-center mb-4">
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-dark)' }}>
                            Tomar Relevo
                        </h3>
                    </div>

                    <div className="flex flex-col gap-3">
                        {nextTrips.length > 0 ? nextTrips.map(trip => (
                            <div key={trip.id} onClick={() => handleTakeRelayClick(trip)} style={{
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
                                    color: 'var(--text-dark)'
                                }}>
                                    <Truck size={20} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '0.125rem' }}>
                                        Unidad {trip.vehicle_plate}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-muted" style={{ color: 'var(--text-light)' }}>
                                        <span>{trip.origin} → {trip.destination}</span>
                                        <span>•</span>
                                        <span>Ref: {trip.id.toString().slice(-5)}</span>
                                    </div>
                                </div>
                                <ChevronRight size={20} color="var(--text-light)" />
                            </div>
                        )) : (
                            <div className="p-4 text-center text-muted text-sm rounded-xl border border-dashed border-gray-200" style={{ color: 'var(--text-light)', borderColor: 'var(--border-light)', background: 'var(--bg-card)' }}>
                                No hay viajes disponibles para tomar relevo.
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

            {/* Tomar Relevo PIN Modal */}
            {showRelayModal && selectedRelayTrip && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1.5rem'
                }}>
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: '24px',
                        padding: '2rem', width: '100%', maxWidth: '400px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ background: '#F3F4F6', padding: '0.5rem', borderRadius: '10px' }}>
                                    <Truck size={24} color="#374151" />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-dark)', margin: 0 }}>Tomar Relevo</h3>
                            </div>
                            <button onClick={() => setShowRelayModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <p style={{ color: 'var(--text-medium)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                            Ingrese la <strong>clave de 3 dígitos</strong> proporcionada por el conductor anterior para continuar con el viaje de la unidad <strong>{selectedRelayTrip.vehicle_plate}</strong>.
                        </p>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Clave de Seguridad (3 dígitos)
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={3}
                                value={relayPin}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    if (val.length <= 3) setRelayPin(val);
                                }}
                                placeholder="***"
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    fontSize: '2rem',
                                    fontWeight: '800',
                                    textAlign: 'center',
                                    letterSpacing: '0.5rem',
                                    border: '2px solid var(--border-light)',
                                    borderRadius: '16px',
                                    outline: 'none',
                                    color: 'var(--text-dark)',
                                    background: '#F9FAFB',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--text-dark)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
                            />
                        </div>

                        <button
                            onClick={handleConfirmRelay}
                            disabled={relaying || relayPin.length !== 3}
                            style={{
                                width: '100%',
                                background: relayPin.length === 3 ? 'var(--text-dark)' : '#E5E7EB',
                                color: relayPin.length === 3 ? 'white' : '#9CA3AF',
                                border: 'none', padding: '1rem',
                                borderRadius: '16px', fontWeight: '800',
                                fontSize: '1rem', cursor: relayPin.length === 3 ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                transition: 'all 0.2s',
                                boxShadow: relayPin.length === 3 ? '0 4px 12px rgba(0, 0, 0, 0.2)' : 'none'
                            }}
                        >
                            <CheckCircle size={22} />
                            {relaying ? 'VERIFICANDO...' : 'CONFIRMAR Y TOMAR'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverDashboard;
