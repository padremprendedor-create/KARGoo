import React, { useState, useEffect } from 'react';
import { X, Truck, MapPin, User, ArrowUpFromLine, ArrowDownToLine, Repeat2, Building2 } from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../supabaseClient';

const TripModal = ({ isOpen, onClose, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [locations, setLocations] = useState([]);
    const [clients, setClients] = useState([]);
    const [formData, setFormData] = useState({
        driver_id: '',
        vehicle_plate: '',
        origin: '',
        destination: '',
        service_type: '',
        client_id: '',
        status: 'created',
    });

    useEffect(() => {
        if (isOpen) {
            fetchDrivers();
            fetchVehicles();
            fetchLocations();
            fetchClients();
            setFormData({
                driver_id: '',
                vehicle_plate: '',
                origin: '',
                destination: '',
                service_type: '',
                client_id: '',
                status: 'created',
            });
        }
    }, [isOpen]);

    const fetchDrivers = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, current_vehicle_plate')
            .eq('role', 'driver');
        setDrivers(data || []);
    };

    const fetchVehicles = async () => {
        const { data } = await supabase
            .from('vehicles')
            .select('plate, brand, model')
            .order('plate');
        setVehicles(data || []);
    };

    const fetchLocations = async () => {
        const { data } = await supabase
            .from('locations')
            .select('name')
            .eq('type', 'origen_destino')
            .order('name');
        setLocations(data?.map(l => l.name) || []);
    };

    const fetchClients = async () => {
        const { data } = await supabase
            .from('clients')
            .select('id, name')
            .order('name');
        setClients(data || []);
    };

    const handleDriverChange = (e) => {
        const driverId = e.target.value;
        const driver = drivers.find(d => d.id === driverId);
        setFormData(prev => ({
            ...prev,
            driver_id: driverId,
            vehicle_plate: driver ? driver.current_vehicle_plate || '' : ''
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const insertData = {
                driver_id: formData.driver_id,
                vehicle_plate: formData.vehicle_plate || null,
                origin: formData.origin,
                destination: formData.destination,
                status: 'created',
                start_time: null,
                created_at: new Date().toISOString(),
                service_type: formData.service_type || null,
                client_id: formData.client_id || null,
            };

            const { error } = await supabase
                .from('trips')
                .insert([insertData]);

            if (error) throw error;
            onSave();
            onClose();
        } catch (error) {
            console.error('Error creating trip:', error);
            alert('Error al crear viaje');
        } finally {
            setLoading(false);
        }
    };

    const serviceTypes = [
        { key: 'embarque', label: 'Embarque', icon: <ArrowUpFromLine size={16} /> },
        { key: 'descarga', label: 'Descarga', icon: <ArrowDownToLine size={16} /> },
        { key: 'traslado', label: 'Traslado', icon: <Repeat2 size={16} /> },
    ];

    const selectStyle = {
        width: '100%',
        padding: '0.75rem 0.75rem 0.75rem 2.5rem',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        outline: 'none',
        fontSize: '0.95rem',
        appearance: 'none',
        background: 'white'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '600',
        color: 'var(--text-dark)',
        marginBottom: '0.5rem'
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
        }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '500px',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '2rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                <div style={{ padding: '0 0 1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>Nuevo Viaje</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
                    {/* Driver */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={labelStyle}>Conductor</label>
                        <div style={{ position: 'relative' }}>
                            <select name="driver_id" value={formData.driver_id} onChange={handleDriverChange} required style={selectStyle}>
                                <option value="">Seleccione conductor</option>
                                {drivers.map(d => (
                                    <option key={d.id} value={d.id}>{d.full_name}</option>
                                ))}
                            </select>
                            <User size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                        </div>
                    </div>

                    {/* Vehicle */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={labelStyle}>Vehículo</label>
                        <div style={{ position: 'relative' }}>
                            <select name="vehicle_plate" value={formData.vehicle_plate} onChange={handleChange} style={selectStyle}>
                                <option value="">No especificado</option>
                                {vehicles.map(v => (
                                    <option key={v.plate} value={v.plate}>{v.plate} - {v.brand} {v.model}</option>
                                ))}
                            </select>
                            <Truck size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                        </div>
                    </div>

                    {/* Service Type */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={labelStyle}>Tipo de Servicio</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {serviceTypes.map(st => (
                                <button
                                    key={st.key}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, service_type: st.key }))}
                                    style={{
                                        flex: 1,
                                        padding: '0.6rem 0.3rem',
                                        borderRadius: '10px',
                                        border: formData.service_type === st.key ? '2px solid var(--primary-red)' : '2px solid #E5E7EB',
                                        background: formData.service_type === st.key ? '#FFF5F5' : 'white',
                                        color: formData.service_type === st.key ? 'var(--primary-red)' : '#6B7280',
                                        fontWeight: '700',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.25rem',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {st.icon} {st.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Client */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={labelStyle}>Cliente / Almacén</label>
                        <div style={{ position: 'relative' }}>
                            <select name="client_id" value={formData.client_id} onChange={handleChange} style={selectStyle}>
                                <option value="">No especificado</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <Building2 size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                        </div>
                    </div>

                    {/* Origin / Destination */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={labelStyle}>Origen</label>
                            <div style={{ position: 'relative' }}>
                                <select name="origin" value={formData.origin} onChange={handleChange} required style={selectStyle}>
                                    <option value="">Seleccionar</option>
                                    {locations.map(loc => (
                                        <option key={loc} value={loc}>{loc}</option>
                                    ))}
                                </select>
                                <MapPin size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Destino</label>
                            <div style={{ position: 'relative' }}>
                                <select name="destination" value={formData.destination} onChange={handleChange} required style={selectStyle}>
                                    <option value="">Seleccionar</option>
                                    {locations.map(loc => (
                                        <option key={loc} value={loc}>{loc}</option>
                                    ))}
                                </select>
                                <MapPin size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" variant="primary" disabled={loading}>
                            {loading ? 'Creando...' : 'Crear Viaje'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TripModal;
