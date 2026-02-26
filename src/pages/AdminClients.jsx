import React, { useState, useEffect } from 'react';
import { Building2, Plus, X, Trash2, Search } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout';
import { supabase } from '../supabaseClient';

const AdminClients = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        const { data } = await supabase
            .from('clients')
            .select('*')
            .order('name');
        setClients(data || []);
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        const { error } = await supabase
            .from('clients')
            .insert({ name: newName.trim() });

        if (error) {
            alert(error.message.includes('unique') ? 'Ese cliente ya existe.' : 'Error al crear cliente: ' + error.message);
        } else {
            setNewName('');
            setShowAddForm(false);
            await fetchClients();
        }
        setSaving(false);
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`¿Eliminar al cliente "${name}"? Los viajes asociados NO se eliminarán.`)) return;
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Error al eliminar: ' + error.message);
        } else {
            await fetchClients();
        }
    };

    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout>
            <div style={{ padding: '2rem', maxWidth: '800px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-dark)', margin: 0 }}>
                            Clientes / Almacenes
                        </h1>
                        <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                            {clients.length} registrados
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        style={{
                            background: showAddForm ? 'var(--bg-light)' : 'var(--primary-red)',
                            color: showAddForm ? 'var(--text-medium)' : 'white',
                            border: 'none',
                            padding: '0.6rem 1.25rem',
                            borderRadius: '12px',
                            fontWeight: '700',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: showAddForm ? 'none' : '0 4px 12px rgba(211, 47, 47, 0.3)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {showAddForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Nuevo Cliente</>}
                    </button>
                </div>

                {/* Add Form */}
                {showAddForm && (
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '1.25rem',
                        marginBottom: '1.5rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        border: '2px solid var(--primary-red)',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'center'
                    }}>
                        <Building2 size={20} color="var(--primary-red)" />
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Nombre del cliente o almacén"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            style={{
                                flex: 1,
                                border: 'none',
                                outline: 'none',
                                fontSize: '1rem',
                                fontWeight: '600',
                                color: 'var(--text-dark)',
                                background: 'transparent'
                            }}
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!newName.trim() || saving}
                            style={{
                                background: newName.trim() ? 'var(--primary-red)' : '#E5E7EB',
                                color: newName.trim() ? 'white' : '#9CA3AF',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                borderRadius: '10px',
                                fontWeight: '700',
                                fontSize: '0.85rem',
                                cursor: newName.trim() ? 'pointer' : 'not-allowed',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                )}

                {/* Search */}
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    border: '1px solid #E5E7EB'
                }}>
                    <Search size={18} color="#9CA3AF" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar cliente..."
                        style={{
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            fontSize: '0.9rem',
                            color: 'var(--text-dark)',
                            background: 'transparent'
                        }}
                    />
                </div>

                {/* List */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-medium)' }}>Cargando...</div>
                ) : filtered.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '3rem',
                        background: 'white', borderRadius: '16px',
                        border: '2px dashed #E5E7EB'
                    }}>
                        <Building2 size={40} color="#9CA3AF" style={{ margin: '0 auto 1rem' }} />
                        <p style={{ fontWeight: '700', color: 'var(--text-dark)', marginBottom: '0.25rem' }}>
                            {searchTerm ? 'Sin resultados' : 'Sin clientes registrados'}
                        </p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                            {searchTerm ? 'Intente con otro término' : 'Agregue su primer cliente'}
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {filtered.map(client => (
                            <div key={client.id} style={{
                                background: 'white',
                                borderRadius: '12px',
                                padding: '1rem 1.25rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                border: '1px solid #E5E7EB',
                                transition: 'all 0.2s'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        width: '38px', height: '38px',
                                        borderRadius: '10px',
                                        background: '#FFF7ED',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Building2 size={18} color="var(--primary-red)" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-dark)' }}>
                                            {client.name}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                                            Registrado: {new Date(client.created_at).toLocaleDateString('es-PE')}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(client.id, client.name)}
                                    style={{
                                        background: 'none', border: 'none',
                                        cursor: 'pointer', color: '#9CA3AF',
                                        padding: '0.5rem', borderRadius: '8px',
                                        transition: 'color 0.2s'
                                    }}
                                    title="Eliminar cliente"
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default AdminClients;
