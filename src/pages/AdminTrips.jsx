import React, { useState, useEffect } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Search, Plus, MapPin, Truck, Calendar, User } from 'lucide-react';
import { supabase } from '../supabaseClient';
import TripModal from '../components/modals/TripModal';
import TripDetailsModal from '../components/modals/TripDetailsModal';

const AdminTrips = () => {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTripId, setSelectedTripId] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [cargoFilter, setCargoFilter] = useState('all');
    const [serviceFilter, setServiceFilter] = useState('all');
    const [clientFilter, setClientFilter] = useState('all');

    const handleViewDetails = (tripId) => {
        setSelectedTripId(tripId);
        setIsDetailsModalOpen(true);
    };

    const fetchTrips = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('trips')
            .select('*, profiles(full_name), clients(name)')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching trips:', error);
        else setTrips(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchTrips();

        // Real-time subscription
        const subscription = supabase
            .channel('admin_trips')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
                fetchTrips();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'in_progress': return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
            case 'completed': return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
            case 'approved': return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
            case 'rejected': return { bg: '#FFF1F2', text: '#E11D48', border: '#FECDD3' };
            default: return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'in_progress': return 'EN CURSO';
            case 'completed': return 'COMPLETADO';
            case 'approved': return 'APROBADO';
            case 'rejected': return 'RECHAZADO';
            default: return 'PENDIENTE';
        }
    };

    const uniqueClients = [...new Set(trips.map(t => t.clients?.name).filter(Boolean))].sort();

    const filteredTrips = trips.filter(t => {
        const matchesSearch = t.id.toString().includes(searchTerm) ||
            t.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());

        // Map 'created' status to 'pending' for filtering
        const normalizedStatus = t.status === 'created' ? 'pending' : t.status;
        const safeStatus = normalizedStatus || 'pending';

        const matchesStatus = statusFilter === 'all' || safeStatus === statusFilter;

        const matchesCargo = cargoFilter === 'all' || (t.cargo_type || 'general') === cargoFilter;
        const matchesService = serviceFilter === 'all' || t.service_type === serviceFilter;
        const matchesClient = clientFilter === 'all' || (t.clients?.name === clientFilter);

        return matchesSearch && matchesStatus && matchesCargo && matchesService && matchesClient;
    });

    return (
        <AdminLayout>
            <div style={{ padding: '2rem' }}>
                <header className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: '700', color: 'var(--text-dark)' }}>Gestión de Viajes</h1>
                        <p style={{ color: 'var(--text-light)', margin: 0 }}>Historial y asignación de rutas</p>
                    </div>
                    <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={20} className="mr-2" />
                        Nuevo Viaje
                    </Button>
                </header>

                {/* Search and Filter */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: '1 1 300px' }}>
                            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} size={20} />
                            <input
                                type="text"
                                placeholder="Buscar por ID, placa o conductor..."
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

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{
                                padding: '0.75rem 2rem 0.75rem 1rem',
                                borderRadius: '12px',
                                border: '1px solid #E5E7EB',
                                fontSize: '0.95rem',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                color: 'var(--text-dark)',
                                outline: 'none',
                                minWidth: '160px'
                            }}
                        >
                            <option value="all">Todos los estados</option>
                            <option value="pending">Pendiente</option>
                            <option value="in_progress">En Curso</option>
                            <option value="completed">Completado</option>
                            <option value="approved">Aprobado</option>
                            <option value="rejected">Rechazado</option>
                        </select>

                        <select
                            value={serviceFilter}
                            onChange={(e) => setServiceFilter(e.target.value)}
                            style={{
                                padding: '0.75rem 2rem 0.75rem 1rem',
                                borderRadius: '12px',
                                border: '1px solid #E5E7EB',
                                fontSize: '0.95rem',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                color: 'var(--text-dark)',
                                outline: 'none',
                                minWidth: '160px'
                            }}
                        >
                            <option value="all">Todos los servicios</option>
                            <option value="embarque">Embarque</option>
                            <option value="descarga">Descarga</option>
                            <option value="traslado">Traslado</option>
                        </select>

                        <select
                            value={cargoFilter}
                            onChange={(e) => setCargoFilter(e.target.value)}
                            style={{
                                padding: '0.75rem 2rem 0.75rem 1rem',
                                borderRadius: '12px',
                                border: '1px solid #E5E7EB',
                                fontSize: '0.95rem',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                color: 'var(--text-dark)',
                                outline: 'none',
                                minWidth: '160px'
                            }}
                        >
                            <option value="all">Tipos de Carga</option>
                            <option value="general">Carga General</option>
                            <option value="imo">Carga IMO</option>
                            <option value="iqbf">Carga IQBF</option>
                        </select>

                        <select
                            value={clientFilter}
                            onChange={(e) => setClientFilter(e.target.value)}
                            style={{
                                padding: '0.75rem 2rem 0.75rem 1rem',
                                borderRadius: '12px',
                                border: '1px solid #E5E7EB',
                                fontSize: '0.95rem',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                color: 'var(--text-dark)',
                                outline: 'none',
                                minWidth: '160px'
                            }}
                        >
                            <option value="all">Todos los Clientes</option>
                            {uniqueClients.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* List */}
                <div className="space-y-4">
                    {filteredTrips.map(trip => {
                        const style = getStatusColor(trip.status);
                        return (
                            <Card key={trip.id} style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                <div className="flex items-center gap-6">
                                    <div style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        width: '60px', padding: '0.5rem', background: '#F9FAFB', borderRadius: '8px'
                                    }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase' }}>ID</span>
                                        <span style={{ fontWeight: '700', color: 'var(--text-dark)' }}>#{trip.id}</span>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-dark)' }}>
                                                {trip.origin} <span style={{ color: 'var(--text-light)', margin: '0 0.25rem' }}>→</span> {trip.destination}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={14} /> {new Date(trip.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Truck size={14} /> {trip.vehicle_plate}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <User size={14} /> {trip.profiles?.full_name || 'Sin conductor'}
                                            </div>
                                        </div>

                                        {/* Badges */}
                                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                                            {trip.service_type && (
                                                <span style={{
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: '600',
                                                    background: '#F3F4F6',
                                                    color: '#4B5563',
                                                    border: '1px solid #E5E7EB',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {trip.service_type}
                                                </span>
                                            )}
                                            {trip.cargo_type && (
                                                <span style={{
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: '700',
                                                    color: trip.cargo_type === 'imo' ? '#DC2626' : trip.cargo_type === 'iqbf' ? '#9333EA' : '#0284C7',
                                                    background: trip.cargo_type === 'imo' ? '#FEE2E2' : trip.cargo_type === 'iqbf' ? '#F3E8FF' : '#E0F2FE',
                                                    border: `1px solid ${trip.cargo_type === 'imo' ? '#FECACA' : trip.cargo_type === 'iqbf' ? '#E9D5FF' : '#BAE6FD'}`,
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {trip.cargo_type === 'general' ? 'Carga General' : `Carga ${trip.cargo_type}`}
                                                </span>
                                            )}
                                            {trip.clients?.name && (
                                                <span style={{
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: '600',
                                                    background: '#ECFDF5',
                                                    color: '#059669',
                                                    border: '1px solid #A7F3D0',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {trip.clients.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-3">
                                    <span style={{
                                        background: style.bg,
                                        color: style.text,
                                        border: `1px solid ${style.border}`,
                                        padding: '0.35rem 0.75rem',
                                        borderRadius: '999px',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {getStatusText(trip.status)}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleViewDetails(trip.id)}
                                        className="ml-4 text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                                    >
                                        Ver Detalles
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                    {filteredTrips.length === 0 && !loading && (
                        <div className="text-center py-10 text-gray-400">No se encontraron viajes.</div>
                    )}
                </div>

                <TripModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={fetchTrips}
                />
                <TripDetailsModal
                    isOpen={isDetailsModalOpen}
                    onClose={() => setIsDetailsModalOpen(false)}
                    tripId={selectedTripId}
                />
            </div>
        </AdminLayout>
    );
};

export default AdminTrips;
