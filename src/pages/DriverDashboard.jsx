import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, Truck, Clock, ChevronRight, Menu, Bell, Camera, CheckCircle, BarChart3, Wrench, X, ImageIcon, Upload, ShieldCheck, ClipboardCheck } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import SidebarDrawer from '../components/SidebarDrawer';
import CameraCapture from '../components/CameraCapture';
import PhotoConfirmModal from '../components/PhotoConfirmModal';
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
    const [maintenanceMileage, setMaintenanceMileage] = useState('');
    const [maintenancePhoto, setMaintenancePhoto] = useState(null);
    const [maintenancePhotoPreview, setMaintenancePhotoPreview] = useState(null);
    const [maintenanceSubmitting, setMaintenanceSubmitting] = useState(false);
    const maintenanceFileRef = useRef(null);

    // Relay (Tomar Relevo) state
    const [showRelayModal, setShowRelayModal] = useState(false);
    const [selectedRelayTrip, setSelectedRelayTrip] = useState(null);
    const [relayPin, setRelayPin] = useState('');
    const [relayMileage, setRelayMileage] = useState('');
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
    // Fuel Refill (Abastecimiento) state
    const [showFuelModal, setShowFuelModal] = useState(false);
    const [fuelMileage, setFuelMileage] = useState('');
    const [fuelPhoto, setFuelPhoto] = useState(null);
    const [fuelPhotoPreview, setFuelPhotoPreview] = useState(null);
    const [fuelSubmitting, setFuelSubmitting] = useState(false);
    const fuelFileRef = useRef(null);

    // Alert (Reporte/Alerta) state
    const [showAlertModal, setShowAlertModal] = useState(false);
    const [alertText, setAlertText] = useState('');
    const [alertPhoto, setAlertPhoto] = useState(null);
    const [alertPhotoPreview, setAlertPhotoPreview] = useState(null);
    const [alertSubmitting, setAlertSubmitting] = useState(false);
    const alertFileRef = useRef(null);

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

            // Check if CHEQUEO/IPERC were uploaded in the current shift
            const now = new Date();
            const currentHour = now.getHours();
            let shiftStart = new Date(now);

            if (currentHour >= 6 && currentHour < 18) {
                // Day shift: 06:00 to 18:00 today
                shiftStart.setHours(6, 0, 0, 0);
            } else {
                // Night shift: 18:00 to 06:00
                if (currentHour >= 18) {
                    shiftStart.setHours(18, 0, 0, 0);
                } else {
                    shiftStart.setDate(shiftStart.getDate() - 1);
                    shiftStart.setHours(18, 0, 0, 0);
                }
            }

            const { data: dailyChecks } = await supabase
                .from('driver_daily_checks')
                .select('check_type, uploaded_at')
                .eq('driver_id', user.id)
                .gte('uploaded_at', shiftStart.toISOString())
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
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('driver_activities')
                .update({ end_time: new Date().toISOString() })
                .eq('id', activeMaintenance.id);

            if (error) throw error;

            if (user) {
                const { error: intErr } = await supabase.from('driver_interactions').insert({
                    driver_id: user.id,
                    interaction_type: 'maintenance_end',
                    description: 'Finalizó mantenimiento'
                });
                if (intErr) console.warn('driver_interactions insert failed:', intErr.message);
            }

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
                const response = await fetch(maintenancePhoto);
                const blob = await response.blob();
                const ext = blob.type.split('/')[1] || 'jpg';
                const filePath = `maintenance/${user.id}/${Date.now()}.${ext}`;
                const { error: uploadError } = await supabase.storage
                    .from('trip-photos')
                    .upload(filePath, blob);
                if (uploadError) throw uploadError;
                photoUrl = filePath;
            }

            // Resolve vehicle plate from active trip or most recent trip
            let vehiclePlate = activeTrip?.vehicle_plate || null;
            if (!vehiclePlate) {
                const { data: recentTrip } = await supabase
                    .from('trips')
                    .select('vehicle_plate')
                    .eq('driver_id', user.id)
                    .not('vehicle_plate', 'is', null)
                    .order('start_time', { ascending: false })
                    .limit(1)
                    .single();
                vehiclePlate = recentTrip?.vehicle_plate || null;
            }

            const { error } = await supabase
                .from('driver_activities')
                .insert([{
                    driver_id: user.id,
                    type: 'mantenimiento',
                    reason: maintenanceText.trim(),
                    photo_url: photoUrl,
                    start_time: new Date().toISOString(),
                    vehicle_plate: vehiclePlate,
                    mileage: maintenanceMileage ? parseFloat(maintenanceMileage) : null
                }]);
            if (error) throw error;

            if (maintenanceMileage && vehiclePlate) {
                const { error: mileageErr } = await supabase.from('vehicle_mileage_logs').insert({
                    vehicle_plate: vehiclePlate,
                    driver_id: user.id,
                    mileage: parseFloat(maintenanceMileage),
                    event_type: 'maintenance'
                });
                if (mileageErr) console.warn('Mileage log failed:', mileageErr.message);
            }

            const { error: intErrM } = await supabase.from('driver_interactions').insert({
                driver_id: user.id,
                interaction_type: 'maintenance_start',
                description: 'Inició mantenimiento'
            });
            if (intErrM) console.warn('driver_interactions insert failed:', intErrM.message);

            alert('Reporte de mantenimiento enviado correctamente.');
            setShowMaintenance(false);
            setMaintenanceText('');
            setMaintenanceMileage('');
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

    // Daily check cameras state
    const [showCamera, setShowCamera] = useState(false);
    const [cameraType, setCameraType] = useState(null); // 'chequeo' or 'iperc'
    const [pendingPhoto, setPendingPhoto] = useState(null);

    const handlePhotoCaptured = (imageData) => {
        setPendingPhoto(imageData);
        setShowCamera(false);
    };

    const handleConfirmPhoto = async () => {
        if (!pendingPhoto || !cameraType) return;

        const type = cameraType;
        const base64Data = pendingPhoto;

        // Reset states
        setPendingPhoto(null);
        setCameraType(null);

        if (type === 'chequeo' || type === 'iperc') {
            const setter = type === 'chequeo' ? setUploadingChequeo : setUploadingIperc;
            setter(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("Usuario no autenticado");

                const response = await fetch(base64Data);
                const blob = await response.blob();
                const ext = blob.type.split('/')[1] || 'jpg';
                const todayKey = new Date().toISOString().slice(0, 10);
                const filePath = `${type}/${user.id}/${todayKey}_${Date.now()}.${ext}`;

                const { error: uploadError } = await supabase.storage
                    .from('trip-photos')
                    .upload(filePath, blob);
                if (uploadError) throw new Error(`Almacenamiento: ${uploadError.message}`);

                const now = new Date();
                const { error: dbError } = await supabase
                    .from('driver_daily_checks')
                    .insert({ driver_id: user.id, check_type: type, photo_url: filePath, uploaded_at: now.toISOString() });
                if (dbError) throw new Error(`Base de datos: ${dbError.message}`);

                // Non-blocking: log interaction but don't fail the chequeo if this errors
                const { error: intErrC } = await supabase.from('driver_interactions').insert({
                    driver_id: user.id, interaction_type: 'photo', description: `Subió foto de ${type.toUpperCase()}`
                });
                if (intErrC) console.warn('driver_interactions insert failed:', intErrC.message);

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
                alert(`Error al subir foto de ${type.toUpperCase()}:\n${err.message}`);
            } finally {
                setter(false);
            }
        } else if (type === 'maintenance') {
            setMaintenancePhoto(base64Data);
            setMaintenancePhotoPreview(base64Data);
        } else if (type === 'fuel') {
            setFuelPhoto(base64Data);
            setFuelPhotoPreview(base64Data);
        } else if (type === 'alert') {
            setAlertPhoto(base64Data);
            setAlertPhotoPreview(base64Data);
        }
    };

    const handleTakeRelayClick = (trip) => {
        setSelectedRelayTrip(trip);
        setRelayPin('');
        setRelayMileage('');
        setShowRelayModal(true);
    };

    const handleConfirmRelay = async () => {
        if (!selectedRelayTrip) return;
        if (!relayPin || relayPin.length !== 3 || !/^\d{3}$/.test(relayPin)) {
            alert('Ingrese una clave de seguridad válida de 3 dígitos');
            return;
        }
        if (!relayMileage || isNaN(relayMileage)) {
            alert('Ingrese el kilometraje actual del vehículo');
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

            const { error: intErrR } = await supabase.from('driver_interactions').insert({
                driver_id: user.id,
                interaction_type: 'relay',
                description: 'Tomó relevo de viaje'
            });
            if (intErrR) console.warn('driver_interactions insert failed:', intErrR.message);

            // Log mileage
            const { error: mileageErr } = await supabase.from('vehicle_mileage_logs').insert({
                vehicle_plate: selectedRelayTrip.vehicle_plate,
                driver_id: user.id,
                mileage: parseFloat(relayMileage),
                event_type: 'relay'
            });
            if (mileageErr) console.warn('Mileage log failed:', mileageErr.message);

            setShowRelayModal(false);
            setSelectedRelayTrip(null);
            setRelayMileage('');
            alert('Has tomado exitosamente este viaje en relevo.');
            navigate(`/driver/trip/${selectedRelayTrip.id}`);
        } catch (err) {
            console.error('Error confirming relay:', err);
            alert(`Error al tomar relevo: ${err.message}`);
        } finally {
            setRelaying(false);
        }
    };

    // --- Fuel Refill Logic ---
    const handleFuelPhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setFuelPhoto(file);
            setFuelPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleFuelSubmit = async () => {
        if (!fuelMileage || isNaN(fuelMileage)) {
            alert('Por favor, ingresa un kilometraje válido.');
            return;
        }
        if (!fuelPhoto) {
            alert('Por favor, sube una foto de la boleta o factura.');
            return;
        }

        setFuelSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No autenticado");

            // Subir foto
            const response = await fetch(fuelPhoto);
            const blob = await response.blob();
            const ext = blob.type.split('/')[1] || 'jpg';
            const filePath = `fuel_receipts/${user.id}/${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage
                .from('trip-photos')
                .upload(filePath, blob);

            if (uploadError) throw uploadError;

            // Guardar registro
            const vehiclePlate = activeTrip?.vehicle_plate || 'N/A';
            const { error: dbError } = await supabase
                .from('fuel_records')
                .insert([{
                    driver_id: user.id,
                    mileage: parseFloat(fuelMileage),
                    photo_url: filePath,
                    vehicle_plate: vehiclePlate === 'N/A' ? null : vehiclePlate
                }]);

            if (dbError) throw dbError;

            if (vehiclePlate !== 'N/A') {
                const { error: mileageErr } = await supabase.from('vehicle_mileage_logs').insert({
                    vehicle_plate: vehiclePlate,
                    driver_id: user.id,
                    mileage: parseFloat(fuelMileage),
                    event_type: 'fuel',
                    photo_url: filePath
                });
                if (mileageErr) console.warn('Mileage log failed:', mileageErr.message);
            }

            const { error: intErrF } = await supabase.from('driver_interactions').insert({
                driver_id: user.id,
                interaction_type: 'fuel',
                description: 'Registró abastecimiento'
            });
            if (intErrF) console.warn('driver_interactions insert failed:', intErrF.message);

            alert('Abastecimiento registrado correctamente.');
            setShowFuelModal(false);
            setFuelMileage('');
            setFuelPhoto(null);
            setFuelPhotoPreview(null);

        } catch (err) {
            console.error('Error submitting fuel record:', err);
            alert('Error al registrar el abastecimiento.');
        } finally {
            setFuelSubmitting(false);
        }
    };

    // --- Alert Logic ---
    const handleAlertPhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setAlertPhoto(file);
            setAlertPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleAlertSubmit = async () => {
        if (!alertText.trim()) {
            alert('Por favor, describe el inconveniente.');
            return;
        }
        if (!alertPhoto) {
            alert('Por favor, sube una foto de evidencia.');
            return;
        }

        setAlertSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No autenticado");

            // Subir foto
            const response = await fetch(alertPhoto);
            const blob = await response.blob();
            const ext = blob.type.split('/')[1] || 'jpg';
            const filePath = `alerts/${user.id}/${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage
                .from('trip-photos')
                .upload(filePath, blob);

            if (uploadError) throw uploadError;

            // Guardar registro
            const { error: dbError } = await supabase
                .from('driver_alerts')
                .insert([{
                    driver_id: user.id,
                    description: alertText.trim(),
                    photo_url: filePath
                }]);

            if (dbError) throw dbError;

            const { error: intErrA } = await supabase.from('driver_interactions').insert({
                driver_id: user.id,
                interaction_type: 'alert',
                description: 'Envió alerta o reporte'
            });
            if (intErrA) console.warn('driver_interactions insert failed:', intErrA.message);

            alert('Alerta enviada correctamente.');
            setShowAlertModal(false);
            setAlertText('');
            setAlertPhoto(null);
            setAlertPhotoPreview(null);

        } catch (err) {
            console.error('Error submitting alert:', err);
            alert('Error al enviar la alerta.');
        } finally {
            setAlertSubmitting(false);
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
                        <button
                            onClick={() => {
                                setCameraType('chequeo');
                                setShowCamera(true);
                            }}
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
                            onClick={() => {
                                setCameraType('iperc');
                                setShowCamera(true);
                            }}
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

                                    {/* Badges: Service & Cargo & Plate */}
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
                                    {activeTrip.vehicle_plate && (
                                        <span style={{
                                            background: '#FEF3C7', color: '#D97706', padding: '0.3rem 0.85rem',
                                            borderRadius: '8px', fontSize: '0.8rem', fontWeight: '900', textTransform: 'uppercase',
                                            border: '1px solid #FDE68A', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}>
                                            Placa: {activeTrip.vehicle_plate}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Map / Details Card */}
                            <div
                                onClick={() => navigate(`/driver/trip/${activeTrip.id}`)}
                                style={{
                                    width: '100%',
                                    height: '110px',
                                    background: 'linear-gradient(135deg, #1E293B, #0F172A)',
                                    borderRadius: '16px',
                                    marginBottom: '1.25rem',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0 1.25rem',
                                    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    transition: 'transform 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                {/* Background Grid Pattern */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                                    backgroundSize: '20px 20px',
                                    opacity: 0.8,
                                    zIndex: 0
                                }} />

                                {/* Map Path Graphic Placeholder */}
                                <div style={{ position: 'absolute', right: '5%', top: '20%', bottom: '20%', width: '120px', zIndex: 1, opacity: 0.5 }}>
                                    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                                        <path d="M 10 90 Q 40 40 90 10" fill="none" stroke="var(--primary-red)" strokeWidth="3" strokeDasharray="6,4" strokeLinecap="round" />
                                        <circle cx="10" cy="90" r="5" fill="var(--primary-red)" />
                                        <circle cx="90" cy="10" r="5" fill="#10B981" />
                                        <circle cx="90" cy="10" r="10" fill="rgba(16, 185, 129, 0.2)" />
                                    </svg>
                                </div>

                                {/* Content */}
                                <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                                    <div style={{
                                        width: '44px', height: '44px',
                                        background: 'rgba(255,255,255,0.1)',
                                        backdropFilter: 'blur(8px)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid rgba(255,255,255,0.2)'
                                    }}>
                                        <MapPin size={22} color="#FCA5A5" />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                        <span style={{ color: 'white', fontWeight: '800', fontSize: '1.05rem', letterSpacing: '0.01em', marginBottom: '0.15rem' }}>
                                            Ver Detalles y Mapa
                                        </span>
                                        <span style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                            Continuar progreso <ChevronRight size={14} />
                                        </span>
                                    </div>
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

                {/* Quick Actions (Fuel & Alerts) */}
                <section className="mb-10">
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={() => setShowFuelModal(true)}
                            style={{
                                flex: 1,
                                background: 'white',
                                color: '#0369A1',
                                border: '1px solid #BAE6FD',
                                padding: '1rem',
                                borderRadius: '16px',
                                fontWeight: '800',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                boxShadow: '0 4px 6px -1px rgba(14, 165, 233, 0.1)',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ background: '#E0F2FE', padding: '0.5rem', borderRadius: '50%' }}>
                                <Truck size={24} color="#0EA5E9" />
                            </div>
                            ABASTECIMIENTO
                        </button>

                        <button
                            onClick={() => setShowAlertModal(true)}
                            style={{
                                flex: 1,
                                background: '#FEF2F2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                                padding: '1rem',
                                borderRadius: '16px',
                                fontWeight: '800',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.1)',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ background: '#FEE2E2', padding: '0.5rem', borderRadius: '50%' }}>
                                <ShieldCheck size={24} color="#EF4444" />
                            </div>
                            ALERTA
                        </button>
                    </div>
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
                                rows={3}
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

                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '0.5rem', marginTop: '1rem' }}>
                                Kilometraje (Opcional)
                            </label>
                            <input
                                type="number"
                                value={maintenanceMileage}
                                onChange={(e) => setMaintenanceMileage(e.target.value)}
                                placeholder="Ej: 154300"
                                style={{
                                    width: '100%', padding: '0.875rem', borderRadius: '12px', border: '1px solid #E5E7EB',
                                    fontSize: '0.9rem', color: '#1F2937', outline: 'none', boxSizing: 'border-box',
                                    transition: 'border-color 0.2s'
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
                                    onClick={() => {
                                        setCameraType('maintenance');
                                        setShowCamera(true);
                                    }}
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

                        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    PIN
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
                                        width: '100%', padding: '1rem', fontSize: '1.5rem', fontWeight: '800', textAlign: 'center',
                                        letterSpacing: '0.5rem', border: '2px solid var(--border-light)', borderRadius: '16px',
                                        outline: 'none', color: 'var(--text-dark)', background: '#F9FAFB',
                                        transition: 'border-color 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--text-dark)'}
                                    onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Kilometraje
                                </label>
                                <input
                                    type="number"
                                    value={relayMileage}
                                    onChange={(e) => setRelayMileage(e.target.value)}
                                    placeholder="Ej: 120500"
                                    style={{
                                        width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: '700', textAlign: 'center',
                                        border: '2px solid var(--border-light)', borderRadius: '16px',
                                        outline: 'none', color: 'var(--text-dark)', background: '#F9FAFB',
                                        transition: 'border-color 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--text-dark)'}
                                    onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleConfirmRelay}
                            disabled={relaying || relayPin.length !== 3 || !relayMileage}
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

            {/* ===== Fuel Refill (Abastecimiento) Modal ===== */}
            {showFuelModal && (
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
                        <div style={{
                            padding: '1.25rem 1.5rem', borderBottom: '1px solid #E5E7EB',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: '#F0F9FF',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '12px',
                                    background: '#0284C7', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Truck size={20} color="white" />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1F2937', margin: 0 }}>
                                        Abastecimiento
                                    </h2>
                                    <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0, fontWeight: '500' }}>
                                        Registra el kilometraje y foto de boleta
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowFuelModal(false);
                                    setFuelMileage('');
                                    setFuelPhoto(null);
                                    setFuelPhotoPreview(null);
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px', borderRadius: '8px' }}
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <div style={{ padding: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '0.5rem' }}>
                                Kilometraje Actual
                            </label>
                            <input
                                type="number"
                                value={fuelMileage}
                                onChange={(e) => setFuelMileage(e.target.value)}
                                placeholder="Ej: 154300"
                                style={{
                                    width: '100%', padding: '0.875rem', borderRadius: '12px', border: '1px solid #E5E7EB',
                                    fontSize: '1rem', color: '#1F2937', outline: 'none', boxSizing: 'border-box',
                                    transition: 'border-color 0.2s', fontWeight: '600'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#0284C7'}
                                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                            />

                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '0.5rem', marginTop: '1.25rem' }}>
                                Foto de Boleta o Factura
                            </label>
                            {fuelPhotoPreview ? (
                                <div style={{ position: 'relative' }}>
                                    <img src={fuelPhotoPreview} alt="Boleta" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '12px', border: '2px solid #0284C7' }} />
                                    <button
                                        onClick={() => {
                                            setFuelPhoto(null); setFuelPhotoPreview(null);
                                        }}
                                        style={{
                                            position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', border: 'none',
                                            borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', color: 'white'
                                        }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        setCameraType('fuel');
                                        setShowCamera(true);
                                    }}
                                    style={{
                                        width: '100%', padding: '2rem', borderRadius: '12px', border: '2px dashed #CBD5E1',
                                        background: '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#0284C7'; e.currentTarget.style.background = '#F0F9FF'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F8FAFC'; }}
                                >
                                    <Camera size={32} color="#94A3B8" strokeWidth={1.5} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Tomar foto a la boleta</span>
                                </button>
                            )}
                        </div>

                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={() => {
                                    setShowFuelModal(false); setFuelMileage(''); setFuelPhoto(null); setFuelPhotoPreview(null);
                                }}
                                style={{
                                    flex: 1, padding: '0.875rem', background: 'white', color: '#64748B', border: '1px solid #E5E7EB',
                                    borderRadius: '12px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleFuelSubmit}
                                disabled={fuelSubmitting || !fuelMileage || !fuelPhoto}
                                style={{
                                    flex: 1, padding: '0.875rem', background: (fuelMileage && fuelPhoto) ? '#0284C7' : '#7DD3FC',
                                    color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '0.9rem',
                                    cursor: (fuelMileage && fuelPhoto) ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    boxShadow: (fuelMileage && fuelPhoto) ? '0 4px 12px rgba(2, 132, 199, 0.3)' : 'none', transition: 'background 0.2s',
                                }}
                            >
                                {fuelSubmitting ? 'Guardando...' : <><CheckCircle size={18} /> Registrar</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Alert/Report Modal ===== */}
            {showAlertModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60,
                    backdropFilter: 'blur(4px)', padding: '1rem',
                }}>
                    <div style={{
                        background: 'white', borderRadius: '20px', width: '100%', maxWidth: '460px',
                        boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.4)',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            padding: '1.25rem 1.5rem', borderBottom: '1px solid #FECACA',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: '#FEF2F2',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '12px',
                                    background: '#DC2626', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <ShieldCheck size={20} color="white" />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#991B1B', margin: 0 }}>
                                        Reporte o Alerta
                                    </h2>
                                    <p style={{ fontSize: '0.75rem', color: '#B91C1C', margin: 0, fontWeight: '500' }}>
                                        Informa de choques, tráfico u otros incidentes
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowAlertModal(false);
                                    setAlertText('');
                                    setAlertPhoto(null);
                                    setAlertPhotoPreview(null);
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F87171', padding: '4px', borderRadius: '8px' }}
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <div style={{ padding: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '0.5rem' }}>
                                ¿Qué sucedió? (Descripción)
                            </label>
                            <textarea
                                value={alertText}
                                onChange={(e) => setAlertText(e.target.value)}
                                placeholder="Describe el inconveniente en detalle..."
                                rows={4}
                                style={{
                                    width: '100%', padding: '0.875rem', borderRadius: '12px', border: '1px solid #E5E7EB',
                                    fontSize: '0.95rem', color: '#1F2937', outline: 'none', boxSizing: 'border-box',
                                    transition: 'border-color 0.2s', resize: 'vertical'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#DC2626'}
                                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                            />

                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '0.5rem', marginTop: '1.25rem' }}>
                                Evidencia Fotográfica
                            </label>
                            {alertPhotoPreview ? (
                                <div style={{ position: 'relative' }}>
                                    <img src={alertPhotoPreview} alt="Evidencia de Alerta" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '12px', border: '2px solid #DC2626' }} />
                                    <button
                                        onClick={() => {
                                            setAlertPhoto(null); setAlertPhotoPreview(null);
                                        }}
                                        style={{
                                            position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', border: 'none',
                                            borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', color: 'white'
                                        }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        setCameraType('alert');
                                        setShowCamera(true);
                                    }}
                                    style={{
                                        width: '100%', padding: '2rem', borderRadius: '12px', border: '2px dashed #FCA5A5',
                                        background: '#FEF2F2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#DC2626'; e.currentTarget.style.background = '#FEE2E2'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#FCA5A5'; e.currentTarget.style.background = '#FEF2F2'; }}
                                >
                                    <Camera size={32} color="#F87171" strokeWidth={1.5} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#B91C1C' }}>Tomar foto de evidencia</span>
                                </button>
                            )}
                        </div>

                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #FEE2E2', display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={() => {
                                    setShowAlertModal(false); setAlertText(''); setAlertPhoto(null); setAlertPhotoPreview(null);
                                }}
                                style={{
                                    flex: 1, padding: '0.875rem', background: 'white', color: '#991B1B', border: '1px solid #FECACA',
                                    borderRadius: '12px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAlertSubmit}
                                disabled={alertSubmitting || !alertText.trim() || !alertPhoto}
                                style={{
                                    flex: 1, padding: '0.875rem', background: (alertText.trim() && alertPhoto) ? '#DC2626' : '#FCA5A5',
                                    color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '0.9rem',
                                    cursor: (alertText.trim() && alertPhoto) ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    boxShadow: (alertText.trim() && alertPhoto) ? '0 4px 12px rgba(220, 38, 38, 0.4)' : 'none', transition: 'background 0.2s',
                                }}
                            >
                                {alertSubmitting ? 'Enviando...' : <><ShieldCheck size={18} /> Enviar Alerta</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* In-App Camera for Everything */}
            {showCamera && (
                <CameraCapture
                    onCapture={handlePhotoCaptured}
                    onClose={() => {
                        setShowCamera(false);
                        setCameraType(null);
                    }}
                    overlayText={
                        cameraType === 'chequeo' ? 'Capture Foto del Vehículo' :
                            cameraType === 'iperc' ? 'Capture Evidencia de IPERC' :
                                cameraType === 'maintenance' ? 'Capture Evidencia del Problema' :
                                    cameraType === 'fuel' ? 'Capture Boleta/Factura de Combustible' :
                                        cameraType === 'alert' ? 'Capture Evidencia del Incidente' :
                                            'Encuadre la foto'
                    }
                />
            )}

            {/* Photo Confirmation Modal */}
            {pendingPhoto && (
                <PhotoConfirmModal
                    photoSrc={pendingPhoto}
                    title={`Confirmar Foto`}
                    subtitle="Asegúrese de que todo sea visible."
                    confirmLabel="Confirmar Foto"
                    onConfirm={handleConfirmPhoto}
                    onRetake={() => {
                        setPendingPhoto(null);
                        setShowCamera(true);
                    }}
                    onCancel={() => {
                        setPendingPhoto(null);
                        setCameraType(null);
                    }}
                />
            )}
        </div>
    );
};

export default DriverDashboard;
