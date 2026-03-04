import React, { useState, useEffect } from 'react';
import { X, Droplet, Wrench, Gauge, Calendar, User, FileText, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const formatDate = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const VehicleHistoryModal = ({ isOpen, onClose, vehicle }) => {
    const [activeTab, setActiveTab] = useState('fuel'); // 'fuel', 'maintenance', 'mileage'
    const [loading, setLoading] = useState(false);

    const [fuelData, setFuelData] = useState([]);
    const [maintenanceData, setMaintenanceData] = useState([]);
    const [mileageData, setMileageData] = useState([]);

    useEffect(() => {
        if (isOpen && vehicle) {
            fetchHistoryData();
        }
    }, [isOpen, vehicle]);

    const fetchHistoryData = async () => {
        setLoading(true);
        try {
            const plate = vehicle.plate;

            // Fetch Fuel
            const { data: fuel } = await supabase
                .from('fuel_records')
                .select('*, profiles!fuel_records_driver_id_fkey(full_name)')
                .eq('vehicle_plate', plate)
                .order('created_at', { ascending: false });
            setFuelData(fuel || []);

            // Fetch Maintenance
            const { data: maint } = await supabase
                .from('driver_activities')
                .select('*, profiles(full_name)')
                .eq('type', 'mantenimiento')
                .eq('vehicle_plate', plate)
                .order('start_time', { ascending: false });
            setMaintenanceData(maint || []);

            // Fetch Mileage
            const { data: mileage } = await supabase
                .from('vehicle_mileage_logs')
                .select('*, profiles(full_name)')
                .eq('vehicle_plate', plate)
                .order('created_at', { ascending: false });
            setMileageData(mileage || []);

        } catch (error) {
            console.error('Error fetching vehicle history:', error);
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
            zIndex: 50,
            padding: '1rem'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '700px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'var(--text-dark)' }}>
                            Historial del Vehículo
                        </h2>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-medium)', fontWeight: '600', textTransform: 'uppercase' }}>
                            {vehicle?.plate} - {vehicle?.brand} {vehicle?.model}
                        </span>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                    <button
                        onClick={() => setActiveTab('fuel')}
                        style={{
                            flex: 1, padding: '1rem', border: 'none', background: 'none', cursor: 'pointer',
                            borderBottom: activeTab === 'fuel' ? '3px solid var(--primary-red)' : '3px solid transparent',
                            color: activeTab === 'fuel' ? 'var(--primary-red)' : 'var(--text-medium)',
                            fontWeight: '700', fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                    >
                        <Droplet size={18} /> Abastecimiento
                    </button>
                    <button
                        onClick={() => setActiveTab('maintenance')}
                        style={{
                            flex: 1, padding: '1rem', border: 'none', background: 'none', cursor: 'pointer',
                            borderBottom: activeTab === 'maintenance' ? '3px solid #0EA5E9' : '3px solid transparent',
                            color: activeTab === 'maintenance' ? '#0369A1' : 'var(--text-medium)',
                            fontWeight: '700', fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                    >
                        <Wrench size={18} /> Mantenimiento
                    </button>
                    <button
                        onClick={() => setActiveTab('mileage')}
                        style={{
                            flex: 1, padding: '1rem', border: 'none', background: 'none', cursor: 'pointer',
                            borderBottom: activeTab === 'mileage' ? '3px solid #10B981' : '3px solid transparent',
                            color: activeTab === 'mileage' ? '#047857' : 'var(--text-medium)',
                            fontWeight: '700', fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                    >
                        <Gauge size={18} /> Kilometraje
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-medium)' }}>
                            Cargando historial...
                        </div>
                    ) : (
                        <>
                            {/* TAB: ABATASTECIMIENTO */}
                            {activeTab === 'fuel' && (
                                <div className="space-y-4">
                                    {fuelData.length === 0 ? (
                                        <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>No hay registros de abastecimiento.</p>
                                    ) : (
                                        fuelData.map(record => (
                                            <div key={record.id} style={{ border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-medium)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        <Calendar size={14} /> {formatDate(record.created_at)}
                                                    </span>
                                                </div>
                                                <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                                    <User size={16} color="var(--text-light)" />
                                                    <strong>Conductor:</strong> {record.profiles?.full_name || 'Desconocido'}
                                                </div>
                                                <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                                    <Gauge size={16} color="var(--primary-red)" />
                                                    <strong>Kilometraje:</strong> {record.mileage ? `${record.mileage} KM` : 'No registrado'}
                                                </div>

                                                {record.photo_url && (
                                                    <div style={{ marginTop: '0.75rem' }}>
                                                        <a href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/trip-photos/${record.photo_url}`}
                                                            target="_blank" rel="noopener noreferrer"
                                                            style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                                                color: '#2563EB', fontSize: '0.8rem', fontWeight: '600', textDecoration: 'none'
                                                            }}>
                                                            <ImageIcon size={14} /> Ver comprobante
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* TAB: MANTENIMIENTO */}
                            {activeTab === 'maintenance' && (
                                <div className="space-y-4">
                                    {maintenanceData.length === 0 ? (
                                        <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>No hay reportes de mantenimiento.</p>
                                    ) : (
                                        maintenanceData.map(record => (
                                            <div key={record.id} style={{ border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1rem', borderLeft: '4px solid #0EA5E9' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.85rem', color: '#0369A1', fontWeight: '700', textTransform: 'uppercase' }}>
                                                        Reporte
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-medium)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        <Calendar size={14} /> {formatDate(record.start_time)}
                                                    </span>
                                                </div>
                                                <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                                    <User size={16} color="var(--text-light)" />
                                                    <strong>Conductor:</strong> {record.profiles?.full_name || 'Desconocido'}
                                                </div>
                                                <div style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', fontSize: '0.9rem' }}>
                                                    <FileText size={16} color="var(--text-light)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                                    <span><strong>Motivo:</strong> {record.reason || 'Sin detalles'}</span>
                                                </div>
                                                {record.mileage && (
                                                    <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                                        <Gauge size={16} color="var(--text-light)" />
                                                        <strong>Kilometraje:</strong> {record.mileage} KM
                                                    </div>
                                                )}

                                                {record.photo_url && (
                                                    <div style={{ marginTop: '0.75rem' }}>
                                                        <a href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/trip-photos/${record.photo_url}`}
                                                            target="_blank" rel="noopener noreferrer"
                                                            style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                                                color: '#2563EB', fontSize: '0.8rem', fontWeight: '600', textDecoration: 'none'
                                                            }}>
                                                            <ImageIcon size={14} /> Ver foto
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* TAB: KILOMETRAJE */}
                            {activeTab === 'mileage' && (
                                <div>
                                    {mileageData.length === 0 ? (
                                        <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>No hay registros de kilometraje.</p>
                                    ) : (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', minWidth: '500px', borderCollapse: 'collapse', textAlign: 'left' }}>
                                                <thead>
                                                    <tr style={{ background: '#F3F4F6', color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                                        <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB' }}>Fecha</th>
                                                        <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB' }}>Kilometraje</th>
                                                        <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB' }}>Evento</th>
                                                        <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB' }}>Conductor</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {mileageData.map(log => {
                                                        const eventMap = {
                                                            'trip_start': { label: 'Inicio de Viaje', color: '#3B82F6' },
                                                            'trip_end': { label: 'Fin de Viaje', color: '#8B5CF6' },
                                                            'relay': { label: 'Relevo', color: '#F59E0B' },
                                                            'fuel': { label: 'Abastecimiento', color: '#EF4444' },
                                                            'maintenance': { label: 'Mantenimiento', color: '#0EA5E9' },
                                                        };
                                                        const eventInfo = eventMap[log.event_type] || { label: log.event_type, color: '#6B7280' };

                                                        return (
                                                            <tr key={log.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                                                <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-medium)' }}>
                                                                    {formatDate(log.created_at)}
                                                                </td>
                                                                <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-dark)' }}>
                                                                    {log.mileage} KM
                                                                </td>
                                                                <td style={{ padding: '0.75rem 1rem' }}>
                                                                    <span style={{
                                                                        fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase',
                                                                        padding: '0.2rem 0.6rem', borderRadius: '4px',
                                                                        background: `${eventInfo.color}15`, color: eventInfo.color
                                                                    }}>
                                                                        {eventInfo.label}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                                                                    {log.profiles?.full_name || '—'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VehicleHistoryModal;
