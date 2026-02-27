import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Search, Trash2, Edit2, Link } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import AdminLayout from '../layouts/AdminLayout';
import { supabase } from '../supabaseClient';

const AdminRoutes = () => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);

    const [newLocation, setNewLocation] = useState({ name: '', type: 'origen_destino', address: '', coordinates_link: '' });
    const [editingLocation, setEditingLocation] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

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
                        Gestione puntos de ruta y ubicaciones guardadas.
                    </p>
                </header>

                {/* ===== TAB: Locations ===== */}

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
            </div>
        </AdminLayout >
    );
};

export default AdminRoutes;
