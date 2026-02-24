import React, { useState, useEffect } from 'react';
import { X, Truck, Hash, Factory, Calendar, Info } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { supabase } from '../../supabaseClient';

const VehicleModal = ({ isOpen, onClose, vehicle = null, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        plate: '',
        brand: '',
        model: '',
        year: '',
        type: 'truck',
        status: 'available'
    });

    useEffect(() => {
        if (vehicle) {
            setFormData({
                plate: vehicle.plate || '',
                brand: vehicle.brand || '',
                model: vehicle.model || '',
                year: vehicle.year || '',
                type: vehicle.type || 'truck',
                status: vehicle.status || 'available'
            });
        } else {
            setFormData({
                plate: '',
                brand: '',
                model: '',
                year: '',
                type: 'truck',
                status: 'available'
            });
        }
    }, [vehicle, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (vehicle) {
                const { error } = await supabase
                    .from('vehicles')
                    .update(formData)
                    .eq('id', vehicle.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('vehicles')
                    .insert([formData]);
                if (error) throw error;
            }
            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving vehicle:', error);
            alert(`Error al guardar vehículo: ${error.message || 'Error desconocido'}`);
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
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <div className="flex justify-between items-center mb-6">
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                        {vehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Placa"
                        name="plate"
                        value={formData.plate}
                        onChange={handleChange}
                        icon={<Hash size={18} />}
                        placeholder="ABC-123"
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Marca"
                            name="brand"
                            value={formData.brand}
                            onChange={handleChange}
                            icon={<Factory size={18} />}
                            placeholder="Volvo"
                        />
                        <Input
                            label="Modelo"
                            name="model"
                            value={formData.model}
                            onChange={handleChange}
                            icon={<Truck size={18} />}
                            placeholder="FH16"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Año"
                            name="year"
                            type="number"
                            value={formData.year}
                            onChange={handleChange}
                            icon={<Calendar size={18} />}
                            placeholder="2024"
                        />
                        <div className="flex flex-col gap-1.5">
                            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-medium)' }}>
                                Tipo de Vehículo
                            </label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid #E5E7EB',
                                    outline: 'none',
                                    background: 'white',
                                    fontSize: '0.95rem'
                                }}
                            >
                                <option value="truck">Camión (Truck)</option>
                                <option value="van">Furgoneta (Van)</option>
                                <option value="sedan">Auto (Sedan)</option>
                                <option value="other">Otro</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-medium)' }}>
                            Estado
                        </label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                border: '1px solid #E5E7EB',
                                outline: 'none',
                                background: 'white',
                                fontSize: '0.95rem'
                            }}
                        >
                            <option value="available">Disponible</option>
                            <option value="in_use">En Uso</option>
                            <option value="maintenance">Mantenimiento</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" variant="primary" disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Vehículo'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VehicleModal;
