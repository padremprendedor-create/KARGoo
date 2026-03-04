import React, { useState, useEffect } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Search, Plus, Edit2, Trash2, Truck, Hash, Calendar } from 'lucide-react';
import { supabase } from '../supabaseClient';
import VehicleModal from '../components/modals/VehicleModal';
import VehicleHistoryModal from '../components/modals/VehicleHistoryModal';

const AdminVehicles = () => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentVehicle, setCurrentVehicle] = useState(null);

    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyVehicle, setHistoryVehicle] = useState(null);

    const fetchVehicles = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching vehicles:', error);
        else setVehicles(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchVehicles();
    }, []);

    const handleEdit = (vehicle) => {
        setCurrentVehicle(vehicle);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setCurrentVehicle(null);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (confirm('¿Está seguro de eliminar este vehículo?')) {
            const { error } = await supabase.from('vehicles').delete().eq('id', id);
            if (error) alert('Error al eliminar');
            else fetchVehicles();
        }
    };

    const handleHistory = (vehicle) => {
        setHistoryVehicle(vehicle);
        setIsHistoryModalOpen(true);
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'available': return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
            case 'in_use': return { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' };
            case 'maintenance': return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
            default: return { bg: '#F9FAFB', text: '#6B7280', border: '#E5E7EB' };
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'available': return 'Disponible';
            case 'in_use': return 'En Uso';
            case 'maintenance': return 'Mantenimiento';
            default: return status;
        }
    };

    const filteredVehicles = vehicles.filter(v =>
        v.plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.model?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout>
            <div style={{ padding: '2rem' }}>
                <header className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: '700', color: 'var(--text-dark)' }}>Vehículos</h1>
                        <p style={{ color: 'var(--text-light)', margin: 0 }}>Gestiona la flota de transporte</p>
                    </div>
                    <Button variant="primary" onClick={handleCreate}>
                        <Plus size={20} className="mr-2" />
                        Nuevo Vehículo
                    </Button>
                </header>

                {/* Search */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ position: 'relative', maxWidth: '400px' }}>
                        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por placa o marca..."
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
                        {filteredVehicles.map(vehicle => {
                            const statusStyle = getStatusStyle(vehicle.status);
                            return (
                                <Card key={vehicle.id} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div style={{
                                                width: '48px', height: '48px',
                                                borderRadius: '12px',
                                                background: '#F0F9FF',
                                                color: '#0284C7',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <Truck size={24} />
                                            </div>
                                            <div>
                                                <h3 style={{ margin: 0, fontWeight: '700', color: 'var(--text-dark)', fontFamily: 'monospace' }}>{vehicle.plate}</h3>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', textTransform: 'capitalize' }}>{vehicle.type}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleHistory(vehicle)} style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', color: 'var(--text-dark)', fontSize: '0.8rem', fontWeight: '700' }}>
                                                Historial
                                            </button>
                                            <button onClick={() => handleEdit(vehicle)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', color: 'var(--text-medium)' }}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(vehicle.id)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #FECACA', background: '#FEF2F2', cursor: 'pointer', color: '#DC2626' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Hash size={16} /> {vehicle.brand} {vehicle.model}
                                        </div>
                                        {vehicle.year && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Calendar size={16} /> Año: {vehicle.year}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-start' }}>
                                        <span style={{
                                            background: statusStyle.bg,
                                            color: statusStyle.text,
                                            border: `1px solid ${statusStyle.border}`,
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '999px',
                                            fontSize: '0.7rem',
                                            fontWeight: '700',
                                            textTransform: 'uppercase'
                                        }}>
                                            {getStatusText(vehicle.status)}
                                        </span>
                                    </div>
                                </Card>
                            );
                        })}
                        {filteredVehicles.length === 0 && (
                            <div className="col-span-full text-center py-10 text-gray-400">No se encontraron vehículos.</div>
                        )}
                    </div>
                )}

                <VehicleModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    vehicle={currentVehicle}
                    onSave={fetchVehicles}
                />

                <VehicleHistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={() => setIsHistoryModalOpen(false)}
                    vehicle={historyVehicle}
                />
            </div>
        </AdminLayout>
    );
};

export default AdminVehicles;
