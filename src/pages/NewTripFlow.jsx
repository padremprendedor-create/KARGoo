import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, MapPin, ChevronRight, FileText, Camera, Gauge, Plus, X, Package, Building2, Anchor, ArrowDownToLine, ArrowUpFromLine, Repeat2, CheckCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import CameraCapture from '../components/CameraCapture';
import PhotoConfirmModal from '../components/PhotoConfirmModal';
import { supabase } from '../supabaseClient';

const NewTripFlow = () => {
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);

    // Form data
    const [vehiclePlate, setVehiclePlate] = useState('');
    const [vehicles, setVehicles] = useState([]);
    const [containers, setContainers] = useState([
        { number: '', dimension: '20', condition: 'LLENO' }
    ]);
    const [kmStart, setKmStart] = useState('');
    const [cargoType, setCargoType] = useState('general');

    // New fields
    const [serviceType, setServiceType] = useState('');
    const [clients, setClients] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState('');

    // Route selection (driver picks origin/destination)
    const [locations, setLocations] = useState([]);
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');

    useEffect(() => {
        fetchProfile();
        fetchVehicles();
        fetchClients();
        fetchLocations();
    }, []);

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/');
        const { data } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
        setProfile(data);
    };

    const fetchVehicles = async () => {
        const { data } = await supabase
            .from('vehicles')
            .select('plate, brand, model')
            .eq('status', 'available')
            .order('plate');
        setVehicles(data || []);
    };

    const fetchClients = async () => {
        const { data } = await supabase
            .from('clients')
            .select('id, name')
            .order('name');
        setClients(data || []);
    };

    const fetchLocations = async () => {
        const { data } = await supabase
            .from('locations')
            .select('name')
            .eq('type', 'origen_destino')
            .order('name');
        setLocations(data?.map(l => l.name) || []);
    };

    const handleStartTrip = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/');

        try {
            // 1. Create the trip directly (driver self-service)
            const { data: tripData, error: tripError } = await supabase
                .from('trips')
                .insert({
                    driver_id: user.id,
                    vehicle_plate: vehiclePlate,
                    origin: origin,
                    destination: destination,
                    status: 'in_progress',
                    start_time: new Date().toISOString(),
                    km_start: kmStart ? parseFloat(kmStart) : null,
                    service_type: serviceType || null,
                    client_id: selectedClientId || null,
                    cargo_type: cargoType,
                })
                .select('id')
                .single();

            const newTripId = tripData.id;

            // Log mileage
            if (kmStart) {
                const { error: mileageErr } = await supabase.from('vehicle_mileage_logs').insert({
                    vehicle_plate: vehiclePlate,
                    driver_id: user.id,
                    mileage: parseFloat(kmStart),
                    event_type: 'trip_start'
                });
                if (mileageErr) console.warn('Mileage log failed for trip start:', mileageErr.message);
            }

            // 2. Insert containers
            const validContainers = containers.filter(c => c.number.trim());
            if (validContainers.length > 0) {
                const containerRows = validContainers.map(c => ({
                    trip_id: newTripId,
                    container_number: c.number.toUpperCase(),
                    size: c.dimension,
                    type: c.condition === 'LLENO' ? 'Full' : 'Empty',
                    dimension: c.dimension,
                    condition: c.condition,
                    cargo_type: cargoType, // Associate trip-level cargo_type with each container
                }));

                const { error: containerError } = await supabase
                    .from('trip_containers')
                    .insert(containerRows);

                if (containerError) throw containerError;
            }

            // Update vehicle status to in_use
            await supabase
                .from('vehicles')
                .update({ status: 'in_use' })
                .eq('plate', vehiclePlate);

            navigate(`/driver/trip/${newTripId}`);
        } catch (error) {
            console.error('Error starting trip:', error);
            alert('Error al iniciar viaje: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const [showCamera, setShowCamera] = useState(false);
    const [platePhoto, setPlatePhoto] = useState(null);
    const [pendingPlatePhoto, setPendingPlatePhoto] = useState(null);

    // Container photo camera
    const [containerCameraIndex, setContainerCameraIndex] = useState(null);
    const [pendingContainerPhoto, setPendingContainerPhoto] = useState(null);
    const [pendingContainerIndex, setPendingContainerIndex] = useState(null);

    // Container management
    const addContainer = () => {
        if (containers.length < 3) {
            setContainers([...containers, { number: '', dimension: '20', condition: 'LLENO' }]);
        }
    };

    const removeContainer = (index) => {
        setContainers(containers.filter((_, i) => i !== index));
    };

    const updateContainer = (index, field, value) => {
        const updated = [...containers];
        updated[index] = { ...updated[index], [field]: value };
        setContainers(updated);
    };

    // Custom Stepper
    const renderStepper = () => (
        <div className="flex flex-col items-center justify-center mb-16 mt-8 w-full">
            <div className="flex items-center gap-2 mb-6">
                <span style={{
                    color: 'var(--primary-red)',
                    fontWeight: '800',
                    fontSize: '0.9rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase'
                }}>
                    PASO {step} DE 3
                </span>
            </div>
            <div className="flex items-center gap-3">
                {[1, 2, 3].map((s) => (
                    <div
                        key={s}
                        style={{
                            height: '6px',
                            width: s === step ? '48px' : '32px',
                            borderRadius: '999px',
                            background: s <= step ? 'var(--primary-red)' : '#E5E7EB',
                            transition: 'all 0.3s ease'
                        }}
                    />
                ))}
            </div>
        </div>
    );

    const canProceedStep1 = vehiclePlate.trim() && kmStart.trim() && serviceType && selectedClientId;
    const canProceedStep2 = origin && destination && origin !== destination;
    const canProceedStep3 = cargoType && (containers.length === 0 || containers.every(c => c.number.trim().length >= 4));

    // Service type config
    const serviceTypes = [
        { key: 'embarque', label: 'Embarque', icon: <ArrowUpFromLine size={22} />, desc: 'Carga al puerto' },
        { key: 'descarga', label: 'Descarga', icon: <ArrowDownToLine size={22} />, desc: 'Retiro del puerto' },
        { key: 'traslado', label: 'Traslado', icon: <Repeat2 size={22} />, desc: 'Entre almacenes' },
    ];

    // Cargo type config
    const cargoTypes = [
        { key: 'general', label: 'Carga General' },
        { key: 'imo', label: 'IMO' },
        { key: 'iqbf', label: 'IQBF' },
    ];

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-light)',
            padding: '0 1.5rem 2rem',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Back Button */}
            <button
                onClick={() => step > 1 ? setStep(step - 1) : navigate('/driver')}
                style={{
                    position: 'absolute',
                    top: '1rem',
                    left: '1rem',
                    background: 'var(--bg-card)',
                    border: 'none',
                    borderRadius: '12px',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                    zIndex: 20
                }}
            >
                <ArrowLeft size={20} color="var(--text-dark)" />
            </button>

            {renderStepper()}

            {/* ===== STEP 1: Vehicle + Service + Client ===== */}
            {step === 1 && (
                <div className="animate-fade-in-up relative z-10 text-center flex-1 flex flex-col" style={{ overflowY: 'auto', paddingBottom: '1rem' }}>
                    <div style={{ marginBottom: '2rem', marginTop: '1rem' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                            Datos del Viaje
                        </h2>
                        <p style={{ color: 'var(--text-medium)', fontSize: '1.1rem' }}>
                            Configure su unidad y tipo de servicio
                        </p>
                    </div>

                    {/* Vehicle Plate Selector */}
                    <div className="text-left mb-6">
                        <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            color: 'var(--text-light)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '0.75rem'
                        }}>
                            PLACA DEL VEHÍCULO
                        </label>
                        <div style={{
                            background: 'var(--bg-card)',
                            borderRadius: '16px',
                            padding: '1rem 1.25rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                            display: 'flex',
                            alignItems: 'center',
                            border: '2px solid transparent',
                            transition: 'all 0.2s',
                        }}>
                            <div style={{ paddingRight: '0.75rem', color: '#9CA3AF' }}>
                                <Truck size={28} />
                            </div>
                            <select
                                value={vehiclePlate}
                                onChange={(e) => setVehiclePlate(e.target.value)}
                                style={{
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '1.35rem',
                                    fontWeight: '700',
                                    color: vehiclePlate ? 'var(--text-dark)' : '#9CA3AF',
                                    width: '100%',
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    background: 'transparent',
                                    appearance: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="" disabled>Seleccionar placa</option>
                                {vehicles.map(v => (
                                    <option key={v.plate} value={v.plate}>
                                        {v.plate} — {v.brand} {v.model}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Service Type Buttons */}
                    <div className="text-left mb-6">
                        <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            color: 'var(--text-light)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '0.75rem'
                        }}>
                            TIPO DE SERVICIO
                        </label>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            {serviceTypes.map(st => (
                                <button
                                    key={st.key}
                                    onClick={() => setServiceType(st.key)}
                                    style={{
                                        flex: 1,
                                        padding: '1rem 0.5rem',
                                        borderRadius: '16px',
                                        border: serviceType === st.key ? '2px solid var(--primary-red)' : '2px solid var(--border-light)',
                                        background: serviceType === st.key ? 'linear-gradient(135deg, #FFF5F5, #FFF0F0)' : 'var(--bg-card)',
                                        color: serviceType === st.key ? 'var(--primary-red)' : 'var(--text-medium)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        transition: 'all 0.2s',
                                        boxShadow: serviceType === st.key ? '0 4px 12px rgba(211, 47, 47, 0.15)' : '0 2px 4px rgba(0,0,0,0.03)',
                                    }}
                                >
                                    <div style={{
                                        width: '44px', height: '44px',
                                        borderRadius: '12px',
                                        background: serviceType === st.key ? 'var(--primary-red)' : 'var(--bg-light)',
                                        color: serviceType === st.key ? 'white' : 'var(--text-light)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.2s'
                                    }}>
                                        {st.icon}
                                    </div>
                                    <span style={{ fontWeight: '800', fontSize: '0.8rem', letterSpacing: '0.02em' }}>
                                        {st.label}
                                    </span>
                                    <span style={{ fontSize: '0.65rem', color: serviceType === st.key ? 'var(--primary-red)' : 'var(--text-light)', fontWeight: '500' }}>
                                        {st.desc}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Client / Almacén Selector */}
                    <div className="text-left mb-6">
                        <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            color: 'var(--text-light)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '0.75rem'
                        }}>
                            CLIENTE / ALMACÉN
                        </label>
                        <div style={{
                            background: 'var(--bg-card)',
                            borderRadius: '16px',
                            padding: '1rem 1.25rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                            display: 'flex',
                            alignItems: 'center',
                            border: '2px solid transparent',
                            transition: 'all 0.2s',
                        }}>
                            <div style={{ paddingRight: '0.75rem', color: '#9CA3AF' }}>
                                <Building2 size={24} />
                            </div>
                            <select
                                value={selectedClientId}
                                onChange={(e) => setSelectedClientId(e.target.value)}
                                style={{
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '1.1rem',
                                    fontWeight: '700',
                                    color: selectedClientId ? 'var(--text-dark)' : '#9CA3AF',
                                    width: '100%',
                                    background: 'transparent',
                                    appearance: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="" disabled>Seleccionar cliente</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Kilometraje Inicial */}
                    <div className="text-left" style={{ marginBottom: '2rem' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            color: 'var(--text-light)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '0.75rem'
                        }}>
                            KILOMETRAJE INICIAL
                        </label>
                        <div style={{
                            background: 'var(--bg-card)',
                            borderRadius: '16px',
                            padding: '1rem 1.25rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                            display: 'flex',
                            alignItems: 'center',
                            border: '2px solid transparent',
                            transition: 'all 0.2s'
                        }}>
                            <div style={{ paddingRight: '0.75rem', color: '#9CA3AF' }}>
                                <Gauge size={28} />
                            </div>
                            <input
                                type="number"
                                min="0"
                                value={kmStart}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || parseFloat(val) >= 0) {
                                        setKmStart(val);
                                    }
                                }}
                                placeholder="0"
                                style={{
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '1.75rem',
                                    fontWeight: '700',
                                    color: 'var(--text-dark)',
                                    width: '100%',
                                    letterSpacing: '0.05em',
                                    background: 'transparent'
                                }}
                            />
                            <span style={{ color: 'var(--primary-red)', fontWeight: '700', fontSize: '1rem', whiteSpace: 'nowrap' }}>KM</span>
                        </div>
                    </div>

                    {/* Next Button */}
                    <div style={{ marginTop: 'auto' }}>
                        <button
                            onClick={() => setStep(2)}
                            disabled={!canProceedStep1}
                            style={{
                                width: '100%',
                                background: canProceedStep1 ? 'var(--primary-red)' : 'var(--bg-card)',
                                color: canProceedStep1 ? 'white' : 'var(--text-light)',
                                padding: '1rem',
                                borderRadius: '16px',
                                border: canProceedStep1 ? 'none' : '1px solid var(--border-light)',
                                fontSize: '1rem',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                cursor: canProceedStep1 ? 'pointer' : 'not-allowed',
                                opacity: canProceedStep1 ? 1 : 0.6,
                                boxShadow: canProceedStep1 ? '0 4px 12px rgba(211, 47, 47, 0.3)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            Siguiente <ChevronRight size={20} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            )}

            {/* ===== STEP 2: Select Route (Origin / Destination) ===== */}
            {step === 2 && (
                <div className="animate-fade-in-up" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>
                            Seleccione su Ruta
                        </h2>
                        <p style={{ color: 'var(--text-medium)', fontSize: '1.1rem' }}>
                            Elija el origen y destino del viaje
                        </p>
                    </div>

                    {/* Origin */}
                    <div className="text-left mb-6">
                        <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            color: 'var(--text-light)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '0.75rem'
                        }}>
                            📍 ORIGEN
                        </label>
                        <div style={{
                            background: 'var(--bg-card)',
                            borderRadius: '16px',
                            padding: '1rem 1.25rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            border: origin ? '2px solid var(--primary-red)' : '2px solid transparent',
                            transition: 'all 0.2s',
                        }}>
                            <div style={{ paddingRight: '0.75rem', color: origin ? 'var(--primary-red)' : '#9CA3AF' }}>
                                <MapPin size={24} />
                            </div>
                            <select
                                value={origin}
                                onChange={(e) => setOrigin(e.target.value)}
                                style={{
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '1.1rem',
                                    fontWeight: '700',
                                    color: origin ? 'var(--text-dark)' : '#9CA3AF',
                                    width: '100%',
                                    background: 'transparent',
                                    appearance: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="" disabled>Seleccionar origen</option>
                                {locations.map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div style={{ textAlign: 'center', margin: '-0.5rem 0', fontSize: '1.5rem', color: 'var(--primary-red)' }}>
                        ↓
                    </div>

                    {/* Destination */}
                    <div className="text-left mb-6" style={{ marginTop: '0.5rem' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            color: 'var(--text-light)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '0.75rem'
                        }}>
                            📍 DESTINO
                        </label>
                        <div style={{
                            background: 'var(--bg-card)',
                            borderRadius: '16px',
                            padding: '1rem 1.25rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            border: destination ? '2px solid var(--primary-red)' : '2px solid transparent',
                            transition: 'all 0.2s',
                        }}>
                            <div style={{ paddingRight: '0.75rem', color: destination ? 'var(--primary-red)' : '#9CA3AF' }}>
                                <MapPin size={24} />
                            </div>
                            <select
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                                style={{
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '1.1rem',
                                    fontWeight: '700',
                                    color: destination ? 'var(--text-dark)' : '#9CA3AF',
                                    width: '100%',
                                    background: 'transparent',
                                    appearance: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="" disabled>Seleccionar destino</option>
                                {locations.filter(loc => loc !== origin).map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Same origin/destination warning */}
                    {origin && destination && origin === destination && (
                        <div style={{
                            background: '#FEF2F2', border: '1px solid #FECACA',
                            borderRadius: '12px', padding: '0.75rem 1rem',
                            color: '#991B1B', fontSize: '0.85rem', fontWeight: '600',
                            marginBottom: '1rem', textAlign: 'center'
                        }}>
                            El origen y destino no pueden ser iguales
                        </div>
                    )}

                    {/* Route Preview */}
                    {origin && destination && origin !== destination && (
                        <div style={{
                            background: 'linear-gradient(135deg, #FFF5F5, #FFF0F0)',
                            border: '2px solid var(--primary-red)',
                            borderRadius: '16px',
                            padding: '1.25rem',
                            textAlign: 'center',
                            marginBottom: '1.5rem'
                        }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary-red)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                RUTA SELECCIONADA
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-dark)' }}>
                                {origin} <span style={{ color: 'var(--primary-red)' }}>→</span> {destination}
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: 'auto' }}>
                        <button
                            onClick={() => setStep(3)}
                            disabled={!canProceedStep2}
                            style={{
                                width: '100%',
                                background: canProceedStep2 ? 'var(--primary-red)' : 'var(--bg-card)',
                                color: canProceedStep2 ? 'white' : 'var(--text-light)',
                                padding: '1rem',
                                borderRadius: '16px',
                                border: canProceedStep2 ? 'none' : '1px solid var(--border-light)',
                                fontSize: '1rem',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                cursor: canProceedStep2 ? 'pointer' : 'not-allowed',
                                opacity: canProceedStep2 ? 1 : 0.6,
                                boxShadow: canProceedStep2 ? '0 4px 12px rgba(211, 47, 47, 0.3)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            Siguiente <ChevronRight size={20} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            )}

            {/* ===== STEP 3: Trip Summary + Containers ===== */}
            {step === 3 && (
                <div className="animate-fade-in-up" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>
                            Resumen del Viaje
                        </h2>
                        <p style={{ color: 'var(--text-medium)', fontSize: '1.1rem' }}>
                            Confirme los datos
                        </p>
                    </div>

                    {/* Trip Summary Card */}
                    <Card variant="flat" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vehículo</p>
                                <p className="text-lg font-bold text-gray-900">{vehiclePlate}</p>
                            </div>
                            <div style={{ height: '1px', background: 'var(--border-light)' }} />
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ruta</p>
                                <p className="text-lg font-bold text-gray-900">
                                    {origin} → {destination}
                                </p>
                            </div>
                            <div style={{ height: '1px', background: 'var(--border-light)' }} />
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Servicio</p>
                                    <p style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--primary-red)', textTransform: 'capitalize' }}>
                                        {serviceType || '—'}
                                    </p>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</p>
                                    <p className="text-lg font-bold text-gray-900">
                                        {clients.find(c => c.id === selectedClientId)?.name || '—'}
                                    </p>
                                </div>
                            </div>
                            <div style={{ height: '1px', background: 'var(--border-light)' }} />
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kilometraje Inicial</p>
                                <p className="text-lg font-bold text-gray-900">{kmStart} KM</p>
                            </div>
                        </div>
                    </Card>

                    {/* Containers Section */}
                    <div className="text-left mb-4">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <label style={{
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                color: 'var(--text-light)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}>
                                CONTENEDORES ({containers.length}/3)
                            </label>
                            {containers.length < 3 && (
                                <button
                                    onClick={addContainer}
                                    style={{
                                        background: 'var(--primary-red)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '0.4rem 0.75rem',
                                        fontSize: '0.8rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}
                                >
                                    <Plus size={14} strokeWidth={3} /> Añadir
                                </button>
                            )}
                        </div>

                        {/* Cargo Type (trip-level, above containers) */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.75rem' }}>
                                TIPO DE CARGA *
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {cargoTypes.map(ct => (
                                    <button key={ct.key} onClick={() => setCargoType(ct.key)} style={{
                                        flex: 1, padding: '0.75rem 0.5rem', borderRadius: '12px',
                                        border: cargoType === ct.key ? '2px solid var(--primary-red)' : '2px solid var(--border-light)',
                                        background: cargoType === ct.key ? '#FFF7ED' : 'var(--bg-card)',
                                        color: cargoType === ct.key ? 'var(--primary-red)' : 'var(--text-medium)',
                                        fontWeight: '800', fontSize: '0.9rem',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        boxShadow: cargoType === ct.key ? '0 2px 8px rgba(211, 47, 47, 0.15)' : 'none',
                                    }}>
                                        {ct.label}
                                    </button>
                                ))}
                            </div>
                        </div>


                        {containers.map((container, index) => (
                            <div key={index} style={{
                                background: 'var(--bg-card)',
                                borderRadius: '16px',
                                padding: '1.25rem',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                                marginBottom: '1rem',
                                border: '1px solid var(--border-light)'
                            }}>
                                {/* Container Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary-red)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <Package size={14} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                                        Contenedor {index + 1}
                                    </span>
                                    <button
                                        onClick={() => removeContainer(index)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '0.25rem' }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Container Number + Camera */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <div style={{
                                        flex: 1, display: 'flex', alignItems: 'center',
                                        background: 'var(--bg-light)', borderRadius: '12px', padding: '0.75rem 1rem',
                                    }}>
                                        <div style={{ paddingRight: '0.75rem', color: '#9CA3AF' }}>
                                            <FileText size={22} />
                                        </div>
                                        <input
                                            type="text"
                                            value={container.number}
                                            onChange={(e) => updateContainer(index, 'number', e.target.value.toUpperCase())}
                                            placeholder="MSKU4095838"
                                            style={{
                                                border: 'none', outline: 'none', fontSize: '1.1rem', fontWeight: '700',
                                                color: 'var(--text-dark)', width: '100%', letterSpacing: '0.05em',
                                                textTransform: 'uppercase', background: 'transparent'
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={() => setContainerCameraIndex(index)}
                                        style={{
                                            width: '48px', height: '48px', borderRadius: '12px',
                                            background: container.photo ? 'var(--primary-red)' : 'var(--bg-light)',
                                            border: container.photo ? 'none' : '2px dashed var(--border-light)',
                                            color: container.photo ? 'white' : 'var(--text-light)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s'
                                        }}
                                        title="Tomar foto del código"
                                    >
                                        <Camera size={20} />
                                    </button>
                                </div>

                                {/* Photo confirmed badge */}
                                {container.photo && (
                                    <div style={{
                                        marginBottom: '1rem', display: 'flex', alignItems: 'center',
                                        gap: '0.5rem', background: '#F0FDF4', padding: '0.6rem 1rem',
                                        borderRadius: '10px', border: '1px solid #BBF7D0'
                                    }}>
                                        <CheckCircle size={16} color="#16A34A" />
                                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#15803D', flex: 1 }}>
                                            Foto del código capturada
                                        </span>
                                        <button
                                            onClick={() => updateContainer(index, 'photo', null)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '2px' }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}

                                {/* Dimension Toggle */}
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                                        Dimensión
                                    </span>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {['20', '40'].map(dim => (
                                            <button key={dim} onClick={() => updateContainer(index, 'dimension', dim)} style={{
                                                flex: 1, padding: '0.6rem', borderRadius: '10px',
                                                border: container.dimension === dim ? '2px solid var(--primary-red)' : '2px solid var(--border-light)',
                                                background: container.dimension === dim ? '#FFF7ED' : 'transparent',
                                                color: container.dimension === dim ? 'var(--primary-red)' : 'var(--text-medium)',
                                                fontWeight: '800', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s'
                                            }}>
                                                {dim}'
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Condition Toggle */}
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                                        Condición
                                    </span>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {['VACÍO', 'LLENO'].map(cond => (
                                            <button key={cond} onClick={() => updateContainer(index, 'condition', cond)} style={{
                                                flex: 1, padding: '0.6rem', borderRadius: '10px',
                                                border: container.condition === cond ? '2px solid var(--primary-red)' : '2px solid var(--border-light)',
                                                background: container.condition === cond ? '#FFF7ED' : 'transparent',
                                                color: container.condition === cond ? 'var(--primary-red)' : 'var(--text-medium)',
                                                fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
                                            }}>
                                                {cond}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        ))}

                        {containers.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-card)', borderRadius: '16px', border: '1px dashed var(--border-light)', marginBottom: '1rem' }}>
                                <Package size={32} color="var(--text-light)" style={{ margin: '0 auto 0.5rem' }} />
                                <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem', fontWeight: '500' }}>Viaje sin contenedores asignados.</p>
                            </div>
                        )}
                    </div>

                    {containers.length < 3 && (
                        <button
                            onClick={addContainer}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                border: '2px dashed var(--border-light)',
                                borderRadius: '16px',
                                background: 'transparent',
                                color: 'var(--primary-red)',
                                fontWeight: '700',
                                fontSize: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                cursor: 'pointer',
                                marginBottom: '1.5rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Plus size={20} /> + Agregar Contenedor (Máx 3)
                        </button>
                    )}

                    <div style={{ marginTop: 'auto' }}>
                        <button
                            onClick={handleStartTrip}
                            disabled={!canProceedStep3 || loading}
                            style={{
                                width: '100%',
                                background: (!canProceedStep3 || loading) ? 'var(--bg-card)' : 'var(--primary-red)',
                                color: (!canProceedStep3 || loading) ? 'var(--text-light)' : 'white',
                                padding: '1rem',
                                borderRadius: '16px',
                                border: (!canProceedStep3 || loading) ? '1px solid var(--border-light)' : 'none',
                                fontSize: '1rem',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                cursor: (!canProceedStep3 || loading) ? 'not-allowed' : 'pointer',
                                opacity: (!canProceedStep3 || loading) ? 0.6 : 1,
                                boxShadow: (!canProceedStep3 || loading) ? 'none' : '0 4px 12px rgba(211, 47, 47, 0.3)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {loading ? 'Iniciando...' : '🚀 Iniciar Viaje'}
                        </button>
                    </div>
                </div>
            )
            }

            {/* Container Photo Camera Overlay */}
            {
                containerCameraIndex !== null && (
                    <CameraCapture
                        onCapture={(file) => {
                            setPendingContainerPhoto(file);
                            setPendingContainerIndex(containerCameraIndex);
                            setContainerCameraIndex(null);
                        }}
                        onClose={() => setContainerCameraIndex(null)}
                        overlayText="Encuadre el código del contenedor"
                    />
                )
            }

            {/* Container Photo Confirmation */}
            {
                pendingContainerPhoto && pendingContainerIndex !== null && (
                    <PhotoConfirmModal
                        photoSrc={pendingContainerPhoto}
                        title={`Foto Contenedor ${pendingContainerIndex + 1}`}
                        subtitle="Verifique que el código del contenedor sea legible."
                        confirmLabel="Confirmar Foto"
                        onConfirm={() => {
                            updateContainer(pendingContainerIndex, 'photo', pendingContainerPhoto);
                            setPendingContainerPhoto(null);
                            setPendingContainerIndex(null);
                        }}
                        onRetake={() => {
                            setPendingContainerPhoto(null);
                            setPendingContainerIndex(null);
                            setContainerCameraIndex(pendingContainerIndex);
                        }}
                    />
                )
            }
        </div >
    );
};

export default NewTripFlow;
