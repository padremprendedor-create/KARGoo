import React, { useState, useEffect } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Search, Plus, Edit2, Trash2, User, Phone, FileText } from 'lucide-react';
import { supabase } from '../supabaseClient';
import DriverModal from '../components/modals/DriverModal';

const AdminDrivers = () => {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDriver, setCurrentDriver] = useState(null);

    const fetchDrivers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'driver');

        if (error) console.error('Error fetching drivers:', error);
        else setDrivers(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchDrivers();
    }, []);

    const handleEdit = (driver) => {
        setCurrentDriver(driver);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setCurrentDriver(null);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (confirm('¿Está seguro de eliminar este conductor?')) {
            const { error } = await supabase.from('profiles').delete().eq('id', id);
            if (error) alert('Error al eliminar');
            else fetchDrivers();
        }
    };

    const filteredDrivers = drivers.filter(d =>
        d.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.dni?.includes(searchTerm) ||
        d.phone?.includes(searchTerm)
    );

    return (
        <AdminLayout>
            <div style={{ padding: '2rem' }}>
                <header className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: '700', color: 'var(--text-dark)' }}>Conductores</h1>
                        <p style={{ color: 'var(--text-light)', margin: 0 }}>Gestiona la flota de conductores</p>
                    </div>
                    <Button variant="primary" onClick={handleCreate}>
                        <Plus size={20} className="mr-2" />
                        Nuevo Conductor
                    </Button>
                </header>

                {/* Search */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ position: 'relative', maxWidth: '400px' }}>
                        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} size={20} />
                        <input
                            type="text"
                            placeholder="Buscar conductor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 0.75rem 0.75rem 3rem',
                                borderRadius: '12px',
                                border: '1px solid #E5E7EB',
                                outline: 'none',
                                fontSize: '0.95rem'
                            }}
                        />
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div>Cargando...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDrivers.map(driver => (
                            <Card key={driver.id} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div style={{
                                            width: '48px', height: '48px',
                                            borderRadius: '50%',
                                            background: '#FFF7ED',
                                            color: 'var(--primary-red)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontWeight: '700', color: 'var(--text-dark)' }}>{driver.full_name}</h3>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{driver.phone || 'Sin teléfono'}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(driver)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', color: 'var(--text-medium)' }}>
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(driver.id)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #FECACA', background: '#FEF2F2', cursor: 'pointer', color: '#DC2626' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <FileText size={16} /> DNI: {driver.dni || '---'}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <FileText size={16} /> Licencia: {driver.license || '---'}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                <DriverModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    driver={currentDriver}
                    onSave={fetchDrivers}
                />
            </div>
        </AdminLayout>
    );
};

export default AdminDrivers;
