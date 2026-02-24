import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Search, Map, CheckCircle, Clock, Activity, Trash2, Edit2, Link } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import AdminLayout from '../layouts/AdminLayout';
import { supabase } from '../supabaseClient';

const AdminRoutes = () => {
    const [activeTab, setActiveTab] = useState('locations');
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);

    const [newLocation, setNewLocation] = useState({ name: '', type: 'origen_destino', address: '', coordinates_link: '' });
    const [editingLocation, setEditingLocation] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const performanceData = [
        { id: 101, driverName: 'Carlos Ruíz', routesCompleted: 45, avgTime: '2h 15m', onTimeRate: 92, status: 'active' },
        { id: 102, driverName: 'Miguel Sánchez', routesCompleted: 38, avgTime: '2h 30m', onTimeRate: 88, status: 'active' },
        { id: 103, driverName: 'Jorge Mendoza', routesCompleted: 52, avgTime: '1h 50m', onTimeRate: 96, status: 'active' },
    ];

    const fetchLocations = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('locations').select('*').order('name');
        if (error) console.error('Error fetching locations:', error);
        else setLocations(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    const extractCoordinates = (linkStr) => {
        if (!linkStr) return { lat: null, lng: null };
        try {
            const atMatch = linkStr.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

            const directMatch = linkStr.match(/(-?\d+\.\d+)[\s,]+(-?\d+\.\d+)/);
            if (directMatch) return { lat: parseFloat(directMatch[1]), lng: parseFloat(directMatch[2]) };
        } catch (e) {
            console.log("Could not extract coordinates");
        }
        return { lat: null, lng: null };
    };

    const handleSaveLocation = async (e) => {
        e.preventDefault();
        const locData = editingLocation || newLocation;
        if (locData.name && locData.address) {
            const { lat, lng } = extractCoordinates(locData.coordinates_link);
            const payload = {
                name: locData.name,
                type: locData.type,
                address: locData.address,
                coordinates_link: locData.coordinates_link,
                latitude: lat,
                longitude: lng
            };

            if (editingLocation) {
                const { error } = await supabase.from('locations').update(payload).eq('id', locData.id);
                if (error) alert('Error al actualizar');
                else { setEditingLocation(null); fetchLocations(); }
            } else {
                const { error } = await supabase.from('locations').insert([payload]);
                if (error) alert('Error al guardar');
                else { setNewLocation({ name: '', type: 'origen_destino', address: '', coordinates_link: '' }); fetchLocations(); }
            }
        }
    };

    const handleDeleteLocation = async (id) => {
        if (!window.confirm('¿ELIMINAR ESTA UBICACIÓN?')) return;
        const { error } = await supabase.from('locations').delete().eq('id', id);
        if (error) alert('Error al eliminar');
        else fetchLocations();
    };

    const getBadgeStyle = (type) => {
        switch (type) {
            case 'origen_destino': return { bg: '#DBEAFE', color: '#1D4ED8', label: 'Origen / Destino' };
            case 'grifo': return { bg: '#FEF3C7', color: '#B45309', label: 'Grifo' };
            default: return { bg: '#F3E8FF', color: '#7C3AED', label: 'Referencia' };
        }
    };

    const filteredLocations = locations.filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                {/* Header */}
                <header style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: '700', color: 'var(--text-dark)' }}>
                        Rutas y Ubicaciones
                    </h1>
                    <p style={{ color: 'var(--text-light)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                        Gestione puntos de ruta y analice el desempeño en las rutas asignadas.
                    </p>
                </header>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #E5E7EB', marginBottom: '2rem' }}>
                    <button onClick={() => setActiveTab('locations')} style={tabStyle(activeTab === 'locations')}>
                        <MapPin size={18} />
                        Ubicaciones Guardadas
                    </button>
                    <button onClick={() => setActiveTab('performance')} style={tabStyle(activeTab === 'performance')}>
                        <Activity size={18} />
                        Desempeño de Conductores
                    </button>
                </div>

                {/* ===== TAB: Locations ===== */}
                {activeTab === 'locations' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                        {/* Form */}
                        <Card style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                                    {editingLocation ? <Edit2 size={18} color="var(--primary-red)" /> : <Plus size={18} color="var(--primary-red)" />}
                                    {editingLocation ? 'Editar Ubicación' : 'Añadir Ubicación'}
                                </h2>
                                {editingLocation && (
                                    <button onClick={() => setEditingLocation(null)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        Cancelar
                                    </button>
                                )}
                            </div>
                            <form onSubmit={handleSaveLocation}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <Input
                                        label="Nombre del Punto"
                                        placeholder="Ej. Almacén Central"
                                        value={editingLocation ? editingLocation.name : newLocation.name}
                                        onChange={(e) => editingLocation ? setEditingLocation({ ...editingLocation, name: e.target.value }) : setNewLocation({ ...newLocation, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-dark)', marginBottom: '0.35rem' }}>
                                        Tipo de Ubicación
                                    </label>
                                    <select
                                        value={editingLocation ? editingLocation.type : newLocation.type}
                                        onChange={(e) => editingLocation ? setEditingLocation({ ...editingLocation, type: e.target.value }) : setNewLocation({ ...newLocation, type: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.7rem 1rem',
                                            borderRadius: '12px',
                                            border: '1px solid #E5E7EB',
                                            outline: 'none',
                                            fontSize: '0.9rem',
                                            background: 'white',
                                            cursor: 'pointer',
                                            color: 'var(--text-dark)',
                                        }}
                                    >
                                        <option value="origen_destino">Origen / Destino</option>
                                        <option value="grifo">Grifo / Estación</option>
                                        <option value="reference">Punto de Referencia</option>
                                    </select>
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <Input
                                        label="Dirección o Descripción"
                                        placeholder="Ej. Av. Principal 123"
                                        value={editingLocation ? editingLocation.address : newLocation.address}
                                        onChange={(e) => editingLocation ? setEditingLocation({ ...editingLocation, address: e.target.value }) : setNewLocation({ ...newLocation, address: e.target.value })}
                                        required
                                    />
                                </div>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <Input
                                        label="Google Maps Link o Coordenadas (Opcional)"
                                        placeholder="Ej. https://maps.app.goo.gl/..."
                                        value={editingLocation ? (editingLocation.coordinates_link || '') : newLocation.coordinates_link}
                                        onChange={(e) => editingLocation ? setEditingLocation({ ...editingLocation, coordinates_link: e.target.value }) : setNewLocation({ ...newLocation, coordinates_link: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <Button type="submit" variant="primary" style={{ width: '100%', maxWidth: '280px' }}>
                                        {editingLocation ? 'Guardar Cambios' : 'Guardar Ubicación'}
                                    </Button>
                                </div>
                            </form>
                        </Card>

                        {/* Location List */}
                        <Card style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{
                                padding: '1rem 1.5rem',
                                borderBottom: '1px solid #E5E7EB',
                                background: '#F9FAFB',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <h3 style={{ margin: 0, fontWeight: '600', color: 'var(--text-dark)', fontSize: '0.95rem' }}>
                                    Directorio de Puntos
                                </h3>
                                <div style={{ position: 'relative', maxWidth: '240px', width: '100%' }}>
                                    <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} size={16} />
                                    <input
                                        type="text"
                                        placeholder="Buscar ubicaciones..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                                            borderRadius: '10px',
                                            border: '1px solid #E5E7EB',
                                            outline: 'none',
                                            fontSize: '0.85rem',
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ padding: '0.75rem 1rem' }}>
                                {loading ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-light)' }}>
                                        Cargando ubicaciones...
                                    </div>
                                ) : filteredLocations.length === 0 ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-light)' }}>
                                        No se encontraron ubicaciones.
                                    </div>
                                ) : (
                                    filteredLocations.map((loc) => {
                                        const badge = getBadgeStyle(loc.type);
                                        return (
                                            <div key={loc.id} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '0.875rem 1rem',
                                                borderRadius: '12px',
                                                border: '1px solid #F3F4F6',
                                                marginBottom: '0.5rem',
                                                transition: 'all 0.15s ease',
                                                cursor: 'default',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '10px',
                                                        background: badge.bg,
                                                        color: badge.color,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}>
                                                        <MapPin size={16} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '600', color: 'var(--text-dark)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            {loc.name}
                                                            {loc.latitude && loc.longitude && (
                                                                <a href={loc.coordinates_link || `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`} target="_blank" rel="noreferrer" title="Ver en Mapa" style={{ color: '#3B82F6', display: 'flex' }}>
                                                                    <Link size={14} />
                                                                </a>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{loc.address}</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <span style={{
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '999px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: '700',
                                                        letterSpacing: '0.03em',
                                                        textTransform: 'uppercase',
                                                        background: badge.bg,
                                                        color: badge.color,
                                                    }}>
                                                        {badge.label}
                                                    </span>
                                                    <button
                                                        onClick={() => setEditingLocation(loc)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#9CA3AF',
                                                            cursor: 'pointer',
                                                            padding: '0.25rem',
                                                            transition: 'color 0.15s ease',
                                                        }}
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteLocation(loc.id)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#D1D5DB',
                                                            cursor: 'pointer',
                                                            padding: '0.25rem',
                                                            borderRadius: '6px',
                                                            transition: 'color 0.15s ease',
                                                        }}
                                                        title="Eliminar ubicación"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </Card>
                    </div>
                )}

                {/* ===== TAB: Performance ===== */}
                {activeTab === 'performance' && (
                    <div>
                        {/* KPI Cards */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <Card style={{ flex: 1, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.75rem', background: '#DBEAFE', borderRadius: '12px', color: '#2563EB' }}>
                                    <Map size={22} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: '500' }}>Rutas Filtradas</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-dark)' }}>Todas</div>
                                </div>
                            </Card>
                            <Card style={{ flex: 1, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.75rem', background: '#D1FAE5', borderRadius: '12px', color: '#059669' }}>
                                    <CheckCircle size={22} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: '500' }}>Completadas (Mes)</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-dark)' }}>135</div>
                                </div>
                            </Card>
                            <Card style={{ flex: 1, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.75rem', background: '#FEF3C7', borderRadius: '12px', color: '#D97706' }}>
                                    <Clock size={22} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: '500' }}>Tiempo Promedio</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-dark)' }}>2h 05m</div>
                                </div>
                            </Card>
                        </div>

                        {/* Performance table */}
                        <Card style={{ padding: 0, overflow: 'hidden', borderRadius: '16px' }}>
                            <div style={{
                                padding: '1rem 1.5rem',
                                borderBottom: '1px solid #E5E7EB',
                                background: '#F9FAFB',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <h3 style={{ margin: 0, fontWeight: '600', color: 'var(--text-dark)', fontSize: '0.95rem' }}>
                                    Rendimiento por Conductor
                                </h3>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <select style={{
                                        padding: '0.5rem 1.25rem 0.5rem 0.75rem',
                                        borderRadius: '10px',
                                        border: '1px solid #E5E7EB',
                                        fontSize: '0.85rem',
                                        background: 'white',
                                        cursor: 'pointer',
                                        outline: 'none',
                                        color: 'var(--text-dark)',
                                    }}>
                                        <option>Todas las rutas</option>
                                        <option>Almacén Central → Planta Sur</option>
                                        <option>Base Callao → Planta Norte</option>
                                    </select>
                                </div>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead style={{ background: 'white', borderBottom: '1px solid #E5E7EB' }}>
                                    <tr>
                                        {['Conductor', 'Rutas Completadas', 'Tiempo Promedio', 'Puntualidad', 'Estado'].map((h) => (
                                            <th key={h} style={{
                                                padding: '1rem 1.5rem',
                                                textAlign: 'left',
                                                fontWeight: '600',
                                                color: 'var(--text-light)',
                                                fontSize: '0.75rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                            }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {performanceData.map((row) => (
                                        <tr key={row.id} style={{ borderBottom: '1px solid #F3F4F6', background: 'white' }}>
                                            <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-dark)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: '50%',
                                                        background: '#FEE2E2',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.7rem',
                                                        fontWeight: '700',
                                                        color: '#DC2626',
                                                    }}>
                                                        {row.driverName.charAt(0)}
                                                    </div>
                                                    {row.driverName}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', color: 'var(--text-medium)' }}>
                                                {row.routesCompleted}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', color: 'var(--text-medium)' }}>
                                                {row.avgTime}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.6rem',
                                                    borderRadius: '999px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '700',
                                                    background: row.onTimeRate >= 90 ? '#D1FAE5' : '#FEF3C7',
                                                    color: row.onTimeRate >= 90 ? '#047857' : '#B45309',
                                                }}>
                                                    {row.onTimeRate}%
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.6rem',
                                                    borderRadius: '999px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '700',
                                                    background: '#DBEAFE',
                                                    color: '#1D4ED8',
                                                }}>
                                                    En ruta
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    </div>
                )}
            </div>
        </AdminLayout >
    );
};

export default AdminRoutes;
