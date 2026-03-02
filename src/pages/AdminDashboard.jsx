import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Search, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../supabaseClient';
import AdminLayout from '../layouts/AdminLayout';
import VerifyWeighingModal from '../components/modals/VerifyWeighingModal';

const AdminDashboard = () => {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ inProgress: 0, completed: 0, pending: 0 });
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [verifyModalOpen, setVerifyModalOpen] = useState(false);
    const [selectedVerifyTripId, setSelectedVerifyTripId] = useState(null);

    const fetchTrips = async () => {
        const { data, error } = await supabase
            .from('trips')
            .select('*, profiles(full_name)')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching trips:', error);
        else {
            setTrips(data);
            const inProgress = data.filter(t => t.status === 'in_progress').length;
            const pendingVerify = data.filter(t => t.status === 'completed' || t.status === 'rejected').length;
            const approved = data.filter(t => t.status === 'approved').length;
            setStats({ inProgress, completed: approved, pending: pendingVerify });
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTrips();

        const subscription = supabase
            .channel('trips_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
                fetchTrips();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const filteredTrips = trips.filter(t => {
        const matchesSearch = t.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.id.toString().includes(searchTerm);

        if (statusFilter === 'pending') return matchesSearch && (t.status === 'created' || t.status === 'pending');

        return matchesSearch && (statusFilter === 'all' || t.status === statusFilter);
    });

    const openVerifyModal = (tripId) => {
        setSelectedVerifyTripId(tripId);
        setVerifyModalOpen(true);
    };

    const handleVerifyCompleted = () => {
        fetchTrips();
    };

    const getStatusStyles = (status) => {
        switch (status) {
            case 'in_progress':
                return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', label: 'EN CURSO' };
            case 'completed':
                return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', label: 'COMPLETADO' };
            case 'approved':
                return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', label: 'APROBADO' };
            case 'rejected':
                return { bg: '#FFF1F2', text: '#E11D48', border: '#FECDD3', label: 'RECHAZADO' };
            default: // pending/created
                return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A', label: 'PENDIENTE' };
        }
    }

    return (
        <AdminLayout>
            <div style={{ padding: '2rem' }}>
                <header className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: '700', color: 'var(--text-dark)' }}>Control de Viajes</h1>
                </header>

                {/* KPI Cards */}
                <div className="flex gap-4" style={{ marginBottom: '2rem' }}>
                    <Card className="w-full flex items-center justify-between" style={{ padding: '1.5rem' }}>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>En Curso</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-red)' }}>{stats.inProgress}</div>
                        </div>
                        <Clock size={32} color="var(--primary-red)" opacity={0.5} />
                    </Card>
                    <Card className="w-full flex items-center justify-between" style={{ padding: '1.5rem' }}>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Pendientes Verificar</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#EF4444' }}>{stats.pending}</div>
                        </div>
                        <AlertCircle size={32} color="#EF4444" opacity={0.5} />
                    </Card>
                    <Card className="w-full flex items-center justify-between" style={{ padding: '1.5rem' }}>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Completados Hoy</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10B981' }}>{stats.completed}</div>
                        </div>
                        <CheckCircle size={32} color="#10B981" opacity={0.5} />
                    </Card>
                </div>

                {/* Search & Filter */}
                <div className="flex gap-4" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por placa, conductor o ID..."
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
                        style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid #E5E7EB', background: 'white', outline: 'none', cursor: 'pointer' }}
                    >
                        <option value="all">Todos los estados</option>
                        <option value="in_progress">En Curso</option>
                        <option value="pending">Pendientes</option>
                        <option value="completed">Completados</option>
                        <option value="approved">Aprobados</option>
                        <option value="rejected">Rechazados</option>
                    </select>
                </div>

                {/* Table */}
                <Card style={{ padding: 0, overflow: 'hidden', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                            <tr>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-light)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-light)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fecha</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-light)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-light)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conductor</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-light)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipo de Carga</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-light)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ruta</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-light)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '600', color: 'var(--text-light)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTrips.length > 0 ? (
                                filteredTrips.map((trip) => (
                                    <tr key={trip.id} style={{ borderBottom: '1px solid #F3F4F6', background: 'white' }}>
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-dark)' }}>#TR-{trip.id}</td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-medium)' }}>{new Date(trip.created_at).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-dark)', fontFamily: 'monospace' }}>{trip.vehicle_plate}</td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-medium)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#9CA3AF' }}>
                                                    {trip.profiles?.full_name?.charAt(0) || 'U'}
                                                </div>
                                                {trip.profiles?.full_name || 'Desconocido'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <span style={{
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '6px',
                                                fontSize: '0.65rem',
                                                fontWeight: '800',
                                                color: trip.cargo_type === 'imo' ? '#DC2626' : trip.cargo_type === 'iqbf' ? '#9333EA' : '#0284C7',
                                                background: trip.cargo_type === 'imo' ? '#FEE2E2' : trip.cargo_type === 'iqbf' ? '#F3E8FF' : '#E0F2FE',
                                                border: `1px solid ${trip.cargo_type === 'imo' ? '#FECACA' : trip.cargo_type === 'iqbf' ? '#E9D5FF' : '#BAE6FD'}`,
                                                textTransform: 'uppercase'
                                            }}>
                                                {trip.cargo_type === 'general' || !trip.cargo_type ? 'Carga General' : `Carga ${trip.cargo_type}`}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-medium)' }}>{trip.origin} → {trip.destination}</td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            {(() => {
                                                const styles = getStatusStyles(trip.status);
                                                return (
                                                    <span style={{
                                                        background: styles.bg,
                                                        color: styles.text,
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '999px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: '700',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em',
                                                        border: `1px solid ${styles.border}`
                                                    }}>
                                                        {styles.label}
                                                    </span>
                                                )
                                            })()}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                            {(trip.status === 'completed' || trip.status === 'rejected') ? (
                                                <Button variant="secondary" onClick={() => openVerifyModal(trip.id)} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', backgroundColor: trip.status === 'rejected' ? '#FFF1F2' : '#EFF6FF', color: trip.status === 'rejected' ? '#E11D48' : '#2563EB', borderColor: trip.status === 'rejected' ? '#FECDD3' : '#BFDBFE' }}>
                                                    {trip.status === 'rejected' ? 'Re-verificar' : 'Verificar'}
                                                </Button>
                                            ) : (
                                                <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>---</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-light)' }}>
                                        No hay viajes registrados aún.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </Card>

                <VerifyWeighingModal
                    isOpen={verifyModalOpen}
                    onClose={() => setVerifyModalOpen(false)}
                    tripId={selectedVerifyTripId}
                    onVerify={handleVerifyCompleted}
                />
            </div>
        </AdminLayout>
    );
};

export default AdminDashboard;
