import React, { useState, useEffect } from 'react';
import { X, Truck, MapPin, Calendar, User } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { supabase } from '../../supabaseClient';

const TripModal = ({ isOpen, onClose, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [locations, setLocations] = useState([]);
    const [formData, setFormData] = useState({
        driver_id: '',
        vehicle_plate: '',
        origin: '',
        destination: '',
        status: 'created', // Pending
    });

    useEffect(() => {
        if (isOpen) {
            fetchDrivers();
            fetchVehicles();
            fetchLocations();
            setFormData({
                driver_id: '',
                vehicle_plate: '',
                origin: '',
                destination: '',
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
            const { error } = await supabase
                .from('trips')
                .insert([{
                    ...formData,
                    start_time: null, // Will be set when driver starts trip
                    created_at: new Date().toISOString()
                }]);

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
                padding: '2rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>Nuevo Viaje</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>
                            Conductor
                        </label>
                        <div style={{ position: 'relative' }}>
                            <select
                                name="driver_id"
                                value={formData.driver_id}
                                onChange={handleDriverChange}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                    borderRadius: '12px',
                                    border: '1px solid #E5E7EB',
                                    outline: 'none',
                                    fontSize: '0.95rem',
                                    appearance: 'none',
                                    background: 'white'
                                }}
                            >
                                <option value="">Seleccione conductor</option>
                                {drivers.map(d => (
                                    <option key={d.id} value={d.id}>{d.full_name}</option>
                                ))}
                            </select>
                            <User size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>
                            Vehículo
                        </label>
                        <div style={{ position: 'relative' }}>
                            <select
                                name="vehicle_plate"
                                value={formData.vehicle_plate}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                    borderRadius: '12px',
                                    border: '1px solid #E5E7EB',
                                    outline: 'none',
                                    fontSize: '0.95rem',
                                    appearance: 'none',
                                    background: 'white'
                                }}
                            >
                                <option value="">No especificado</option>
                                {vehicles.map(v => (
                                    <option key={v.plate} value={v.plate}>
                                        {v.plate} - {v.brand} {v.model}
                                    </option>
                                ))}
                            </select>
                            <Truck size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>
                                Origen
                            </label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    name="origin"
                                    value={formData.origin}
                                    onChange={handleChange}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                        borderRadius: '12px',
                                        border: '1px solid #E5E7EB',
                                        outline: 'none',
                                        fontSize: '0.95rem',
                                        appearance: 'none',
                                        background: 'white'
                                    }}
                                >
                                    <option value="">Seleccionar</option>
                                    {locations.map(loc => (
                                        <option key={loc} value={loc}>{loc}</option>
                                    ))}
                                </select>
                                <MapPin size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>
                                Destino
                            </label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    name="destination"
                                    value={formData.destination}
                                    onChange={handleChange}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                        borderRadius: '12px',
                                        border: '1px solid #E5E7EB',
                                        outline: 'none',
                                        fontSize: '0.95rem',
                                        appearance: 'none',
                                        background: 'white'
                                    }}
                                >
                                    <option value="">Seleccionar</option>
                                    {locations.map(loc => (
                                        <option key={loc} value={loc}>{loc}</option>
                                    ))}
                                </select>
                                <MapPin size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
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
