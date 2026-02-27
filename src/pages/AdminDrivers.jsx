import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Search, Plus, Edit2, Trash2, User, Phone, FileText, Activity, CheckCircle, Clock, Truck, Wrench, Pause, TrendingUp } from 'lucide-react';
import { supabase } from '../supabaseClient';
import DriverModal from '../components/modals/DriverModal';

// ── Helpers ──
const fmtDuration = (ms) => {
    if (!ms || ms <= 0) return '0m';
    const totalMin = Math.round(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
};

const pctBadge = (val) => {
    const bg = val >= 70 ? '#D1FAE5' : val >= 40 ? '#FEF3C7' : '#FEE2E2';
    const color = val >= 70 ? '#047857' : val >= 40 ? '#B45309' : '#DC2626';
    return { bg, color };
};

const AdminDrivers = () => {
    const [activeTab, setActiveTab] = useState('list');
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDriver, setCurrentDriver] = useState(null);

    // Performance state
    const [perfLoading, setPerfLoading] = useState(false);
    const [perfData, setPerfData] = useState([]);
    const [perfPeriod, setPerfPeriod] = useState('month'); // month | week | all

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

    // ── Fetch Performance Data ──
    const fetchPerformance = useCallback(async () => {
        setPerfLoading(true);

        // 1. Drivers
        const { data: driverList } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'driver')
            .order('full_name');

        if (!driverList || driverList.length === 0) {
            setPerfData([]);
            setPerfLoading(false);
            return;
        }

        // 2. Date range
        let dateFilter = null;
        const now = new Date();
        if (perfPeriod === 'month') {
            dateFilter = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        } else if (perfPeriod === 'week') {
            const d = new Date(now);
            d.setDate(d.getDate() - 7);
            dateFilter = d.toISOString();
        }

        // 3. Trips (completed/approved)
        let tripsQuery = supabase
            .from('trips')
            .select('id, driver_id, start_time, end_time, status, km_start, km_end')
            .in('status', ['completed', 'approved']);
        if (dateFilter) tripsQuery = tripsQuery.gte('start_time', dateFilter);
        const { data: trips } = await tripsQuery;

        // 4. Activities (mantenimiento / inactivo)
        let actQuery = supabase
            .from('driver_activities')
            .select('id, driver_id, type, start_time, end_time');
        if (dateFilter) actQuery = actQuery.gte('start_time', dateFilter);
        const { data: activities } = await actQuery;

        // 5. Active trips (in_progress)
        const { data: activeTrips } = await supabase
            .from('trips')
            .select('driver_id')
            .eq('status', 'in_progress');

        const activeDriverIds = new Set((activeTrips || []).map(t => t.driver_id));

        // 6. Active maintenance  
        const { data: activeMaint } = await supabase
            .from('driver_activities')
            .select('driver_id')
            .eq('type', 'mantenimiento')
            .is('end_time', null);

        const maintDriverIds = new Set((activeMaint || []).map(a => a.driver_id));

        // 7. Compute per-driver stats
        const results = driverList.map(driver => {
            const dTrips = (trips || []).filter(t => t.driver_id === driver.id);
            const dActs = (activities || []).filter(a => a.driver_id === driver.id);

            const completedCount = dTrips.length;

            // Trip durations          
            let totalTripMs = 0;
            let tripCount = 0;
            let totalKm = 0;

            dTrips.forEach(t => {
                if (t.start_time && t.end_time) {
                    const dur = new Date(t.end_time) - new Date(t.start_time);
                    if (dur > 0) {
                        totalTripMs += dur;
                        tripCount++;
                    }
                }
                if (t.km_start != null && t.km_end != null) {
                    const dist = Number(t.km_end) - Number(t.km_start);
                    if (dist > 0) totalKm += dist;
                }
            });

            const avgTripMs = tripCount > 0 ? totalTripMs / tripCount : 0;

            // Maintenance duration
            let totalMaintMs = 0;
            let totalInactMs = 0;

            dActs.forEach(a => {
                if (!a.start_time) return;
                const start = new Date(a.start_time);
                const end = a.end_time ? new Date(a.end_time) : new Date();
                const dur = end - start;
                if (dur > 0) {
                    if (a.type === 'mantenimiento') totalMaintMs += dur;
                    else totalInactMs += dur;
                }
            });

            // Total tracked time = trips + maintenance + inactivo
            const totalTracked = totalTripMs + totalMaintMs + totalInactMs;
            const pctTrip = totalTracked > 0 ? Math.round((totalTripMs / totalTracked) * 100) : 0;
            const pctIdle = totalTracked > 0 ? Math.round((totalInactMs / totalTracked) * 100) : 0;
            const pctMaint = totalTracked > 0 ? Math.round((totalMaintMs / totalTracked) * 100) : 0;

            // Avg speed (km/h)
            const totalTripHours = totalTripMs / 3600000;
            const avgSpeed = totalTripHours > 0 ? Math.round(totalKm / totalTripHours) : 0;

            // Current status
            let status = 'Disponible';
            let statusColor = { bg: '#D1FAE5', color: '#047857' };
            if (activeDriverIds.has(driver.id)) {
                status = 'En ruta';
                statusColor = { bg: '#DBEAFE', color: '#1D4ED8' };
            } else if (maintDriverIds.has(driver.id)) {
                status = 'Mantenimiento';
                statusColor = { bg: '#FFF7ED', color: '#C2410C' };
            }

            return {
                id: driver.id,
                name: driver.full_name || 'Sin nombre',
                completedCount,
                avgTripMs,
                totalKm: Math.round(totalKm),
                avgSpeed,
                pctTrip,
                pctIdle,
                pctMaint,
                status,
                statusColor,
            };
        });

        setPerfData(results);
        setPerfLoading(false);
    }, [perfPeriod]);

    useEffect(() => {
        if (activeTab === 'performance') {
            fetchPerformance();
        }
    }, [activeTab, fetchPerformance]);

    // ── Handlers ──
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

    // ── Aggregated KPIs ──
    const totalCompleted = perfData.reduce((s, d) => s + d.completedCount, 0);
    const totalKmAll = perfData.reduce((s, d) => s + d.totalKm, 0);
    const avgTripAll = perfData.length > 0
        ? perfData.reduce((s, d) => s + d.avgTripMs, 0) / perfData.filter(d => d.avgTripMs > 0).length || 0
        : 0;

    const tabStyle = (isActive) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1.25rem',
        fontSize: '0.9rem',
        fontWeight: isActive ? '600' : '500',
        color: isActive ? 'var(--primary-red)' : 'var(--text-light)',
        background: 'none',
        border: 'none',
        borderBottom: isActive ? '2px solid var(--primary-red)' : '2px solid transparent',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    });

    return (
        <AdminLayout>
            <div style={{ padding: '2rem' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: '700', color: 'var(--text-dark)' }}>Conductores</h1>
                        <p style={{ color: 'var(--text-light)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>Gestiona la flota de conductores y analiza su desempeño</p>
                    </div>
                    <Button variant="primary" onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Plus size={20} />
                        Nuevo Conductor
                    </Button>
                </header>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #E5E7EB', marginBottom: '1.5rem' }}>
                    <button onClick={() => setActiveTab('list')} style={tabStyle(activeTab === 'list')}>
                        <User size={18} />
                        Lista de Conductores
                    </button>
                    <button onClick={() => setActiveTab('performance')} style={tabStyle(activeTab === 'performance')}>
                        <Activity size={18} />
                        Desempeño de Conductores
                    </button>
                </div>

                {/* ===== TAB: Driver List ===== */}
                {activeTab === 'list' && (
                    <>
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
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>Cargando...</div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                                {filteredDrivers.map(driver => (
                                    <Card key={driver.id} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => handleEdit(driver)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', color: 'var(--text-medium)' }}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(driver.id)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #FECACA', background: '#FEF2F2', cursor: 'pointer', color: '#DC2626' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6B7280' }}>
                                                <FileText size={16} /> DNI: {driver.dni || '---'}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6B7280' }}>
                                                <FileText size={16} /> Licencia: {driver.license || '---'}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ===== TAB: Performance ===== */}
                {activeTab === 'performance' && (
                    <div>
                        {/* Period Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-dark)' }}>Período:</label>
                            <select
                                value={perfPeriod}
                                onChange={(e) => setPerfPeriod(e.target.value)}
                                style={{
                                    padding: '0.55rem 1.5rem 0.55rem 0.85rem',
                                    borderRadius: '10px',
                                    border: '1px solid #E5E7EB',
                                    background: 'white',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    color: 'var(--text-dark)',
                                    fontWeight: 500,
                                }}
                            >
                                <option value="week">Últimos 7 días</option>
                                <option value="month">Este mes</option>
                                <option value="all">Todo el tiempo</option>
                            </select>
                        </div>

                        {/* KPI Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                            <Card style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.75rem', background: '#DBEAFE', borderRadius: '12px', color: '#2563EB' }}>
                                    <User size={22} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: '500' }}>Conductores</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-dark)' }}>{perfData.length}</div>
                                </div>
                            </Card>
                            <Card style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.75rem', background: '#D1FAE5', borderRadius: '12px', color: '#059669' }}>
                                    <CheckCircle size={22} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: '500' }}>Viajes Completados</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-dark)' }}>{totalCompleted}</div>
                                </div>
                            </Card>
                            <Card style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.75rem', background: '#FEF3C7', borderRadius: '12px', color: '#D97706' }}>
                                    <Clock size={22} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: '500' }}>Tiempo Prom. Viaje</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-dark)' }}>{fmtDuration(avgTripAll)}</div>
                                </div>
                            </Card>
                            <Card style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.75rem', background: '#E0E7FF', borderRadius: '12px', color: '#4338CA' }}>
                                    <TrendingUp size={22} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: '500' }}>Km Total</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-dark)' }}>{totalKmAll.toLocaleString()} km</div>
                                </div>
                            </Card>
                        </div>

                        {/* Performance Table */}
                        <Card style={{ padding: 0, overflow: 'hidden', borderRadius: '16px' }}>
                            <div style={{
                                padding: '1rem 1.5rem',
                                borderBottom: '1px solid #E5E7EB',
                                background: '#F9FAFB',
                            }}>
                                <h3 style={{ margin: 0, fontWeight: '600', color: 'var(--text-dark)', fontSize: '0.95rem' }}>
                                    Rendimiento por Conductor
                                </h3>
                            </div>
                            {perfLoading ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-light)' }}>Cargando datos de desempeño...</div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', minWidth: '900px' }}>
                                        <thead style={{ background: 'white', borderBottom: '1px solid #E5E7EB' }}>
                                            <tr>
                                                {['Conductor', 'Viajes', 'Km Total', 'Vel. Prom.', 'T. Prom. Viaje', '% En Viaje', '% Inactivo', '% Mant.', 'Estado'].map((h) => (
                                                    <th key={h} style={{
                                                        padding: '0.875rem 1rem',
                                                        textAlign: 'left',
                                                        fontWeight: '600',
                                                        color: 'var(--text-light)',
                                                        fontSize: '0.7rem',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em',
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {perfData.map((row) => {
                                                const tripBadge = pctBadge(row.pctTrip);
                                                const idleBadge = row.pctIdle <= 30
                                                    ? { bg: '#D1FAE5', color: '#047857' }
                                                    : row.pctIdle <= 60
                                                        ? { bg: '#FEF3C7', color: '#B45309' }
                                                        : { bg: '#FEE2E2', color: '#DC2626' };
                                                return (
                                                    <tr key={row.id} style={{ borderBottom: '1px solid #F3F4F6', background: 'white' }}>
                                                        <td style={{ padding: '0.875rem 1rem', fontWeight: '600', color: 'var(--text-dark)' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <div style={{
                                                                    width: '30px', height: '30px', borderRadius: '50%',
                                                                    background: '#FEE2E2', display: 'flex',
                                                                    alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: '0.7rem', fontWeight: '700', color: '#DC2626', flexShrink: 0,
                                                                }}>
                                                                    {row.name.charAt(0)}
                                                                </div>
                                                                <span style={{ whiteSpace: 'nowrap' }}>{row.name}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '0.875rem 1rem', color: 'var(--text-medium)', fontWeight: '600' }}>
                                                            {row.completedCount}
                                                        </td>
                                                        <td style={{ padding: '0.875rem 1rem', color: 'var(--text-medium)' }}>
                                                            {row.totalKm > 0 ? `${row.totalKm} km` : '—'}
                                                        </td>
                                                        <td style={{ padding: '0.875rem 1rem', color: 'var(--text-medium)' }}>
                                                            {row.avgSpeed > 0 ? `${row.avgSpeed} km/h` : '—'}
                                                        </td>
                                                        <td style={{ padding: '0.875rem 1rem', color: 'var(--text-medium)' }}>
                                                            {fmtDuration(row.avgTripMs)}
                                                        </td>
                                                        <td style={{ padding: '0.875rem 1rem' }}>
                                                            <span style={{
                                                                padding: '0.2rem 0.6rem', borderRadius: '999px',
                                                                fontSize: '0.75rem', fontWeight: '700',
                                                                background: tripBadge.bg, color: tripBadge.color,
                                                            }}>
                                                                {row.pctTrip}%
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '0.875rem 1rem' }}>
                                                            <span style={{
                                                                padding: '0.2rem 0.6rem', borderRadius: '999px',
                                                                fontSize: '0.75rem', fontWeight: '700',
                                                                background: idleBadge.bg, color: idleBadge.color,
                                                            }}>
                                                                {row.pctIdle}%
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '0.875rem 1rem' }}>
                                                            <span style={{
                                                                padding: '0.2rem 0.6rem', borderRadius: '999px',
                                                                fontSize: '0.75rem', fontWeight: '700',
                                                                background: '#FFF7ED', color: '#C2410C',
                                                            }}>
                                                                {row.pctMaint}%
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '0.875rem 1rem' }}>
                                                            <span style={{
                                                                padding: '0.2rem 0.6rem', borderRadius: '999px',
                                                                fontSize: '0.75rem', fontWeight: '700',
                                                                background: row.statusColor.bg, color: row.statusColor.color,
                                                                whiteSpace: 'nowrap',
                                                            }}>
                                                                {row.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
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
