import React, { useState, useEffect } from 'react';
import { X, User, Phone, FileText, Truck, Hash, Factory } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { supabase } from '../../supabaseClient';

const DriverModal = ({ isOpen, onClose, driver = null, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        dni: '',
        license: '',
        phone: '',
        role: 'driver'
    });

    useEffect(() => {
        if (driver) {
            setFormData({
                full_name: driver.full_name || '',
                dni: driver.dni || '',
                license: driver.license || '',
                phone: driver.phone || '',
                role: 'driver'
            });
        } else {
            setFormData({
                full_name: '',
                dni: '',
                license: '',
                phone: '',
                role: 'driver'
            });
        }
    }, [driver, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (driver) {
                // Update
                const { error } = await supabase
                    .from('profiles')
                    .update(formData)
                    .eq('id', driver.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('profiles')
                    .insert([{ ...formData }]);

                if (error) throw error;
            }
            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving driver:', error);
            alert(`Error al guardar conductor: ${error.message || 'Error desconocido'}`);
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
                        {driver ? 'Editar Conductor' : 'Nuevo Conductor'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Nombre Completo"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        icon={<User size={18} />}
                        required
                    />
                    <Input
                        label="Teléfono"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        icon={<Phone size={18} />}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="DNI"
                            name="dni"
                            value={formData.dni}
                            onChange={handleChange}
                            icon={<FileText size={18} />}
                        />
                        <Input
                            label="Licencia"
                            name="license"
                            value={formData.license}
                            onChange={handleChange}
                            icon={<FileText size={18} />}
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" variant="primary" disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Conductor'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Helper icon component
const HashtagIcon = () => <Hash size={18} />;

export default DriverModal;
