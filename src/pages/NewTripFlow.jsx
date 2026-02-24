import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Truck, MapPin, ChevronRight, FileText, Camera, Gauge, Plus, X, Package } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import StepIndicator from '../components/ui/StepIndicator';
import CameraCapture from '../components/CameraCapture';
import { supabase } from '../supabaseClient';

const NewTripFlow = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselectedTripId = searchParams.get('tripId');

    const [step, setStep] = useState(1);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);

    // Form data
    const [vehiclePlate, setVehiclePlate] = useState('');
    const [vehicles, setVehicles] = useState([]);
    const [pendingTrips, setPendingTrips] = useState([]);
    const [selectedTripId, setSelectedTripId] = useState(preselectedTripId ? parseInt(preselectedTripId) : null);
    const [containers, setContainers] = useState([
        { number: '', dimension: '20', condition: 'LLENO' }
    ]);
    const [kmStart, setKmStart] = useState('');

    useEffect(() => {
        fetchProfile();
        fetchVehicles();
        fetchPendingTrips();
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
            .order('plate');
        setVehicles(data || []);
    };

    const fetchPendingTrips = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
            .from('trips')
            .select('*')
            .eq('driver_id', user.id)
            .eq('status', 'created')
            .order('created_at', { ascending: true });
        setPendingTrips(data || []);
    };

    const firstName = profile?.full_name?.split(' ')[0] || 'Conductor';

    const handleStartTrip = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/');

        try {
            // 1. Update the existing pending trip to in_progress
            const { error: tripError } = await supabase
                .from('trips')
                .update({
                    vehicle_plate: vehiclePlate,
                    status: 'in_progress',
                    start_time: new Date().toISOString(),
                    km_start: kmStart ? parseFloat(kmStart) : null,
                })
                .eq('id', selectedTripId);

            if (tripError) throw tripError;

            // 2. Insert containers
            const validContainers = containers.filter(c => c.number.trim());
            if (validContainers.length > 0) {
                const containerRows = validContainers.map(c => ({
                    trip_id: selectedTripId,
                    container_number: c.number.toUpperCase(),
                    size: c.dimension,
                    type: c.condition === 'LLENO' ? 'Full' : 'Empty',
                    dimension: c.dimension,
                    condition: c.condition,
                }));

                const { error: containerError } = await supabase
                    .from('trip_containers')
                    .insert(containerRows);

                if (containerError) throw containerError;
            }

            navigate(`/driver/trip/${selectedTripId}`);
        } catch (error) {
            console.error('Error starting trip:', error);
            alert('Error al iniciar viaje: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const [scanning, setScanning] = useState(false);
    const [platePhoto, setPlatePhoto] = useState(null);
    const [showCamera, setShowCamera] = useState(false);

    // Container management
    const addContainer = () => {
        if (containers.length < 3) {
            setContainers([...containers, { number: '', dimension: '20', condition: 'LLENO' }]);
        }
    };

    const removeContainer = (index) => {
        if (containers.length > 1) {
            setContainers(containers.filter((_, i) => i !== index));
        }
    };

    const updateContainer = (index, field, value) => {
        const updated = [...containers];
        updated[index] = { ...updated[index], [field]: value };
        setContainers(updated);
    };

    // Selected trip info
    const selectedTrip = pendingTrips.find(t => t.id === selectedTripId);

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

    const canProceedStep1 = vehiclePlate.trim() && kmStart.trim();
    const canProceedStep2 = selectedTripId !== null;
    const canProceedStep3 = containers.some(c => c.number.trim());

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

            {/* ===== STEP 1: Vehicle Registration ===== */}
            {step === 1 && (
                <div className="animate-fade-in-up relative z-10 text-center flex-1 flex flex-col justify-center">
                    <div style={{ marginBottom: '6rem', marginTop: '3rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
                            Registro de Vehículo
                        </h2>
                        <p style={{ color: 'var(--text-medium)', fontSize: '1.25rem' }}>
                            ¿Qué unidad conducirá hoy?
                        </p>
                    </div>

                    <div className="text-left mb-8">
                        <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            color: 'var(--text-light)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '1rem'
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
                            marginBottom: '2rem'
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
                                    fontSize: '1.5rem',
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

                    {/* Scan Button Placeholder */}
                    <button
                        onClick={() => setShowCamera(true)}
                        style={{
                            width: '100%',
                            padding: '1.25rem',
                            border: '2px dashed #D1D5DB',
                            borderRadius: '20px',
                            background: 'var(--bg-light)',
                            color: 'var(--text-medium)',
                            fontWeight: '600',
                            fontSize: '1.1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            marginBottom: 'auto',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                        {platePhoto ? (
                            <>
                                <img
                                    src={platePhoto}
                                    alt="Placa"
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        objectFit: 'cover',
                                        borderRadius: '8px',
                                        border: '2px solid white',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                />
                                <span style={{ color: 'var(--primary-red)' }}>Foto Capturada (Repetir)</span>
                            </>
                        ) : (
                            <>
                                <div style={{ background: 'var(--border-light)', padding: '0.25rem', borderRadius: '6px' }}>
                                    <Camera size={20} color="var(--text-light)" />
                                </div>
                                Escanear Placa
                            </>
                        )}
                    </button>

                    {/* Kilometraje Inicial */}
                    <div className="text-left" style={{ marginTop: '2rem' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            color: 'var(--text-light)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '1rem'
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

                    {/* Camera Overlay */}
                    {showCamera && (
                        <CameraCapture
                            onCapture={(file) => {
                                setPlatePhoto(file);
                                setShowCamera(false);
                            }}
                            onClose={() => setShowCamera(false)}
                            overlayText="Encuadre la placa del vehículo"
                        />
                    )}

                    {/* Bottom Action Button */}
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

            {/* ===== STEP 2: Select Pending Trip ===== */}
            {step === 2 && (
                <div className="animate-fade-in-up" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>
                            Seleccione su Ruta
                        </h2>
                        <p style={{ color: 'var(--text-medium)', fontSize: '1.1rem' }}>
                            Viajes asignados por administración
                        </p>
                    </div>

                    <div className="flex flex-col gap-4 mb-8">
                        {pendingTrips.length > 0 ? pendingTrips.map(trip => (
                            <Card
                                key={trip.id}
                                variant={selectedTripId === trip.id ? 'active' : 'selectable'}
                                onClick={() => setSelectedTripId(trip.id)}
                                style={{ padding: '1.25rem' }}
                            >
                                <div className="flex items-center gap-4">
                                    <div style={{
                                        width: '52px',
                                        height: '52px',
                                        borderRadius: '16px',
                                        background: selectedTripId === trip.id ? 'var(--primary-red)' : 'var(--bg-light)',
                                        color: selectedTripId === trip.id ? 'white' : 'var(--text-medium)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem',
                                        transition: 'all 0.2s',
                                        boxShadow: selectedTripId === trip.id ? '0 4px 12px rgba(211, 47, 47, 0.4)' : 'none'
                                    }}>
                                        <MapPin size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-dark)' }}>
                                            {trip.origin} → {trip.destination}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                                            Ref: TR-{trip.id} • {new Date(trip.created_at).toLocaleDateString('es-PE')}
                                        </div>
                                    </div>
                                    {selectedTripId === trip.id && <ChevronRight size={24} color="var(--primary-red)" strokeWidth={3} />}
                                </div>
                            </Card>
                        )) : (
                            <div style={{
                                textAlign: 'center',
                                padding: '3rem 1.5rem',
                                background: 'var(--bg-card)',
                                borderRadius: '16px',
                                border: '2px dashed var(--border-light)'
                            }}>
                                <MapPin size={40} color="#9CA3AF" style={{ margin: '0 auto 1rem' }} />
                                <p style={{ fontWeight: '700', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>
                                    No hay viajes pendientes
                                </p>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>
                                    La administración aún no ha asignado viajes.
                                </p>
                            </div>
                        )}
                    </div>

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
                                    {selectedTrip?.origin} → {selectedTrip?.destination}
                                </p>
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
                                    {containers.length > 1 && (
                                        <button
                                            onClick={() => removeContainer(index)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#EF4444',
                                                padding: '0.25rem'
                                            }}
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>

                                {/* Container Number */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: 'var(--bg-light)',
                                    borderRadius: '12px',
                                    padding: '0.75rem 1rem',
                                    marginBottom: '1rem'
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
                                            border: 'none',
                                            outline: 'none',
                                            fontSize: '1.1rem',
                                            fontWeight: '700',
                                            color: 'var(--text-dark)',
                                            width: '100%',
                                            letterSpacing: '0.05em',
                                            textTransform: 'uppercase',
                                            background: 'transparent'
                                        }}
                                    />
                                </div>

                                {/* Dimension Toggle */}
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                                        Dimensión
                                    </span>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {['20', '40'].map(dim => (
                                            <button
                                                key={dim}
                                                onClick={() => updateContainer(index, 'dimension', dim)}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.6rem',
                                                    borderRadius: '10px',
                                                    border: container.dimension === dim ? '2px solid var(--primary-red)' : '2px solid var(--border-light)',
                                                    background: container.dimension === dim ? '#FFF7ED' : 'transparent',
                                                    color: container.dimension === dim ? 'var(--primary-red)' : 'var(--text-medium)',
                                                    fontWeight: '800',
                                                    fontSize: '1rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {dim}'
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Condition Toggle */}
                                <div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                                        Condición
                                    </span>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {['VACÍO', 'LLENO'].map(cond => (
                                            <button
                                                key={cond}
                                                onClick={() => updateContainer(index, 'condition', cond)}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.6rem',
                                                    borderRadius: '10px',
                                                    border: container.condition === cond ? '2px solid var(--primary-red)' : '2px solid var(--border-light)',
                                                    background: container.condition === cond ? '#FFF7ED' : 'transparent',
                                                    color: container.condition === cond ? 'var(--primary-red)' : 'var(--text-medium)',
                                                    fontWeight: '700',
                                                    fontSize: '0.9rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {cond}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

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
            )}
        </div>
    );
};

export default NewTripFlow;
