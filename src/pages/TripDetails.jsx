import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Calendar, MapPin, Package, Scale, Clock, X, ZoomIn, Plus, Trash2, Edit3, Check, Camera, FileText, AlertTriangle, Building2, ArrowUpFromLine, ArrowDownToLine, Repeat2, Image } from 'lucide-react';
import { supabase } from '../supabaseClient';

const TripDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showImageModal, setShowImageModal] = useState(false);
    const [modalImageUrl, setModalImageUrl] = useState(null);
    const [photoUrl, setPhotoUrl] = useState(null);

    // Additional documents state
    const [additionalDocs, setAdditionalDocs] = useState([]);
    const [docPhotoUrls, setDocPhotoUrls] = useState({});
    const [uploading, setUploading] = useState(false);
    const [editingDocId, setEditingDocId] = useState(null);
    const [editDescription, setEditDescription] = useState('');
    const [newDocDescription, setNewDocDescription] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const fileInputRef = useRef(null);

    // New fields
    const [clientName, setClientName] = useState(null);
    const [sustentoPhotos, setSustentoPhotos] = useState([]);
    const [sustentoUrls, setSustentoUrls] = useState({});

    useEffect(() => {
        fetchTrip();
    }, [id]);

    // Download ticket photo blob
    useEffect(() => {
        if (!trip) return;
        const ticketPhoto = trip.trip_photos?.find(p => p.photo_type === 'ticket');
        if (!ticketPhoto?.photo_url) return;

        const downloadPhoto = async () => {
            let filePath = ticketPhoto.photo_url;
            if (filePath.startsWith('http')) {
                const marker = '/object/public/trip-photos/';
                const idx = filePath.indexOf(marker);
                if (idx !== -1) filePath = filePath.slice(idx + marker.length);
            }
            const { data, error } = await supabase.storage
                .from('trip-photos')
                .download(filePath);
            if (!error) {
                const objectUrl = URL.createObjectURL(data);
                setPhotoUrl(objectUrl);
            }
        };
        downloadPhoto();
        return () => { if (photoUrl) URL.revokeObjectURL(photoUrl); };
    }, [trip]);

    // Download additional document photos
    useEffect(() => {
        if (additionalDocs.length === 0) return;

        const downloadAll = async () => {
            const urls = {};
            for (const doc of additionalDocs) {
                let filePath = doc.photo_url;
                if (filePath.startsWith('http')) {
                    const marker = '/object/public/trip-photos/';
                    const idx = filePath.indexOf(marker);
                    if (idx !== -1) filePath = filePath.slice(idx + marker.length);
                }
                const { data, error } = await supabase.storage
                    .from('trip-photos')
                    .download(filePath);
                if (!error) {
                    urls[doc.id] = URL.createObjectURL(data);
                }
            }
            setDocPhotoUrls(prev => {
                // Revoke old URLs
                Object.values(prev).forEach(url => URL.revokeObjectURL(url));
                return urls;
            });
        };
        downloadAll();
    }, [additionalDocs]);

    // Download sustento photos
    useEffect(() => {
        if (sustentoPhotos.length === 0) return;

        const downloadAll = async () => {
            const urls = {};
            for (const photo of sustentoPhotos) {
                let filePath = photo.photo_url;
                if (filePath.startsWith('http')) {
                    const marker = '/object/public/trip-photos/';
                    const idx = filePath.indexOf(marker);
                    if (idx !== -1) filePath = filePath.slice(idx + marker.length);
                }
                const { data, error } = await supabase.storage
                    .from('trip-photos')
                    .download(filePath);
                if (!error) {
                    urls[photo.id] = URL.createObjectURL(data);
                }
            }
            setSustentoUrls(prev => {
                Object.values(prev).forEach(url => URL.revokeObjectURL(url));
                return urls;
            });
        };
        downloadAll();
    }, [sustentoPhotos]);

    const fetchTrip = async () => {
        const { data } = await supabase
            .from('trips')
            .select('*, trip_containers(*), trip_photos(*)')
            .eq('id', id)
            .single();

        setTrip(data);
        if (data?.trip_photos) {
            setAdditionalDocs(data.trip_photos.filter(p => p.photo_type === 'additional'));
            setSustentoPhotos(data.trip_photos.filter(p => p.photo_type === 'sustento'));
        }
        // Fetch client name
        if (data?.client_id) {
            const { data: clientData } = await supabase
                .from('clients')
                .select('name')
                .eq('id', data.client_id)
                .single();
            setClientName(clientData?.name || null);
        }
        setLoading(false);
    };

    const isEditable = trip && trip.status !== 'approved';

    // --- Upload additional document ---
    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const fileName = `trip_${id}_additional_${Date.now()}.jpg`;
            const filePath = `additional/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('trip-photos')
                .upload(filePath, file, { contentType: file.type, upsert: true });

            if (uploadError) throw uploadError;

            const { error: dbError } = await supabase
                .from('trip_photos')
                .insert({
                    trip_id: parseInt(id),
                    photo_url: filePath,
                    photo_type: 'additional',
                    description: newDocDescription.trim() || null
                });

            if (dbError) throw dbError;

            setNewDocDescription('');
            setShowAddForm(false);
            await fetchTrip();
        } catch (err) {
            console.error('Error uploading document:', err);
            alert('Error al subir documento: ' + err.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // --- Delete additional document ---
    const handleDeleteDoc = async (doc) => {
        if (!confirm('¿Eliminar este documento?')) return;
        try {
            let filePath = doc.photo_url;
            if (filePath.startsWith('http')) {
                const marker = '/object/public/trip-photos/';
                const idx = filePath.indexOf(marker);
                if (idx !== -1) filePath = filePath.slice(idx + marker.length);
            }

            await supabase.storage.from('trip-photos').remove([filePath]);
            await supabase.from('trip_photos').delete().eq('id', doc.id);
            await fetchTrip();
        } catch (err) {
            console.error('Error deleting document:', err);
            alert('Error al eliminar documento');
        }
    };

    // --- Update description ---
    const handleSaveDescription = async (docId) => {
        try {
            const { error } = await supabase
                .from('trip_photos')
                .update({ description: editDescription.trim() || null })
                .eq('id', docId);
            if (error) throw error;
            setEditingDocId(null);
            await fetchTrip();
        } catch (err) {
            console.error('Error updating description:', err);
            alert('Error al actualizar descripción');
        }
    };

    // Format date
    const formatDateTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day} ${month} ${year} - ${hours}:${minutes}`;
    };

    // Calculate travel duration
    const calcDuration = () => {
        if (!trip?.start_time) return '00:00:00';
        const start = new Date(trip.start_time).getTime();
        const end = trip.end_time ? new Date(trip.end_time).getTime() : Date.now();
        const diff = Math.max(0, end - start);
        const hrs = String(Math.floor(diff / 3600000)).padStart(2, '0');
        const mins = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
        const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
        return `${hrs}:${mins}:${secs}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-orange-500 font-medium">Cargando detalle...</div>
            </div>
        );
    }

    if (!trip) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p style={{ color: 'var(--text-medium)', marginBottom: '1rem' }}>Viaje no encontrado</p>
                    <button
                        onClick={() => navigate('/driver/history')}
                        className="bg-orange-500 text-white px-4 py-2 rounded-lg"
                    >
                        Volver al historial
                    </button>
                </div>
            </div>
        );
    }

    const ticketPhoto = trip.trip_photos?.find(p => p.photo_type === 'ticket');
    const hasPhoto = ticketPhoto && photoUrl;
    const duration = calcDuration();

    const statusLabel = trip.status === 'approved' ? 'APROBADO'
        : trip.status === 'rejected' ? 'OBSERVADO'
            : trip.status === 'completed' ? 'POR REVISAR'
                : trip.status === 'in_progress' ? 'EN CURSO'
                    : 'CANCELADO';
    const statusBg = trip.status === 'approved' ? '#DCFCE7'
        : trip.status === 'rejected' ? '#FEF3C7'
            : trip.status === 'completed' ? '#EFF6FF'
                : trip.status === 'in_progress' ? '#FEF3C7'
                    : '#FEE2E2';
    const statusColor = trip.status === 'approved' ? '#16A34A'
        : trip.status === 'rejected' ? '#D97706'
            : trip.status === 'completed' ? '#2563EB'
                : trip.status === 'in_progress' ? '#D97706'
                    : '#DC2626';

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-light)', paddingBottom: '2rem' }}>
            {/* Header */}
            <div style={{
                background: 'var(--primary-red)',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                color: 'white',
                position: 'sticky',
                top: 0,
                zIndex: 40
            }}>
                <button
                    onClick={() => navigate('/driver/history')}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                    <ChevronLeft size={28} />
                </button>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Detalle de Viaje</h1>
            </div>

            {/* Content */}
            <div className="container" style={{ paddingTop: '1.5rem' }}>

                {/* ===== Observations Banner (Rejected) ===== */}
                {trip.status === 'rejected' && trip.observations && (
                    <div style={{
                        background: 'linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 100%)',
                        borderRadius: '16px',
                        padding: '1.25rem',
                        marginBottom: '1.25rem',
                        border: '1px solid #FDE68A',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start'
                    }}>
                        <div style={{
                            width: '36px', height: '36px',
                            borderRadius: '10px',
                            background: '#FEF3C7',
                            border: '1px solid #FDE68A',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <AlertTriangle size={18} color="#D97706" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontSize: '0.7rem',
                                fontWeight: '800',
                                color: '#92400E',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                marginBottom: '0.375rem'
                            }}>
                                Observación de Administración
                            </div>
                            <p style={{
                                fontSize: '0.9rem',
                                color: '#78350F',
                                lineHeight: '1.5',
                                margin: 0,
                                fontWeight: '500'
                            }}>
                                {trip.observations}
                            </p>
                            <p style={{
                                fontSize: '0.75rem',
                                color: '#B45309',
                                marginTop: '0.5rem',
                                margin: '0.5rem 0 0 0',
                                fontWeight: '600'
                            }}>
                                Puede subir documentos adicionales para corregir las observaciones.
                            </p>
                        </div>
                    </div>
                )}

                {/* ===== Main Info Card ===== */}
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    boxShadow: 'var(--shadow-sm)',
                    marginBottom: '1.25rem'
                }}>
                    {/* ID & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                            <span style={{
                                fontSize: '0.65rem', fontWeight: '700',
                                color: 'var(--primary-red)',
                                letterSpacing: '0.08em', textTransform: 'uppercase'
                            }}>
                                ID DE VIAJE
                            </span>
                            <div style={{
                                fontSize: '1.5rem', fontWeight: '800',
                                color: 'var(--text-dark)',
                                letterSpacing: '-0.01em', marginTop: '0.125rem'
                            }}>
                                TRK-{trip.id.toString().slice(-5).padStart(5, '0')}
                            </div>
                        </div>
                        <span style={{
                            background: statusBg, color: statusColor,
                            padding: '0.3rem 0.75rem', borderRadius: '999px',
                            fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.05em'
                        }}>
                            {statusLabel}
                        </span>
                    </div>

                    <div style={{ height: '1px', background: 'var(--border-light)', margin: '1rem 0' }} />

                    {/* Date & Time */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '12px',
                            background: 'var(--bg-light)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            <Calendar size={18} color="var(--primary-red)" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-light)', marginBottom: '0.125rem' }}>
                                Fecha y Hora
                            </div>
                            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-dark)' }}>
                                {formatDateTime(trip.start_time || trip.created_at)}
                            </div>
                        </div>
                    </div>

                    {/* Route */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '12px',
                            background: 'var(--bg-light)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            <MapPin size={18} color="var(--primary-red)" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-light)', marginBottom: '0.125rem' }}>
                                Ruta del Viaje
                            </div>
                            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-dark)' }}>
                                {trip.origin} → {trip.destination}
                            </div>
                        </div>
                    </div>

                    {/* Service Type & Client Row */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ flex: 1, background: '#F8FAFC', padding: '1rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                            <div style={{
                                fontSize: '0.65rem', fontWeight: '800',
                                color: 'var(--text-medium)',
                                letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem',
                                display: 'flex', alignItems: 'center', gap: '0.375rem'
                            }}>
                                {trip.service_type === 'embarque' ? <ArrowUpFromLine size={14} color="var(--primary-red)" /> : trip.service_type === 'descarga' ? <ArrowDownToLine size={14} color="var(--primary-red)" /> : <Repeat2 size={14} color="var(--primary-red)" />}
                                Tipo de Servicio
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-dark)', textTransform: 'capitalize' }}>
                                {trip.service_type || '—'}
                            </div>
                        </div>
                        <div style={{ flex: 1, background: '#F8FAFC', padding: '1rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                            <div style={{
                                fontSize: '0.65rem', fontWeight: '800',
                                color: 'var(--text-medium)',
                                letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem',
                                display: 'flex', alignItems: 'center', gap: '0.375rem'
                            }}>
                                <Building2 size={14} color="var(--primary-red)" /> Cliente
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-dark)' }}>
                                {clientName || '—'}
                            </div>
                        </div>
                    </div>

                    {/* Containers List */}
                    {trip.trip_containers && trip.trip_containers.length > 0 && (
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{
                                fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-light)',
                                letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem'
                            }}>
                                Contenedores ({trip.trip_containers.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {trip.trip_containers.map((container, idx) => (
                                    <div key={container.id || idx} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        background: '#FFF7ED', padding: '0.75rem 1rem',
                                        borderRadius: '12px', border: '1px solid #FFEDD5'
                                    }}>
                                        <div style={{
                                            background: 'white', padding: '0.375rem', borderRadius: '8px',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}>
                                            <Package size={16} color="#EA580C" />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#EA580C', textTransform: 'uppercase' }}>
                                                Contenedor {idx + 1}
                                            </div>
                                            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#9A3412', letterSpacing: '0.02em', marginBottom: '0.25rem' }}>
                                                {container.container_number}
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                {container.dimension && (
                                                    <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#B45309', background: '#FFEDD5', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                                                        {container.dimension}'
                                                    </span>
                                                )}
                                                {container.condition && (
                                                    <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#B45309', background: '#FFEDD5', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                                                        {container.condition}
                                                    </span>
                                                )}
                                                {container.cargo_type && (
                                                    <span style={{ fontSize: '0.65rem', fontWeight: '700', color: container.cargo_type === 'imo' ? '#DC2626' : container.cargo_type === 'iqbf' ? '#7C3AED' : '#0369A1', background: container.cargo_type === 'imo' ? '#FEE2E2' : container.cargo_type === 'iqbf' ? '#F3E8FF' : '#E0F2FE', padding: '0.15rem 0.4rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                                                        {container.cargo_type === 'general' ? 'Carga General' : container.cargo_type.toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Mileage Row */}
                    {trip.km_start != null && (
                        <>
                            <div style={{ height: '1px', background: 'var(--border-light)', margin: '1rem 0' }} />
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: '0.65rem', fontWeight: '700', color: 'var(--primary-red)',
                                        letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem'
                                    }}>Km Inicio</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-dark)' }}>
                                        {Number(trip.km_start).toLocaleString('es-PE')}
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: '0.65rem', fontWeight: '700', color: 'var(--primary-red)',
                                        letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem'
                                    }}>Km Final</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-dark)' }}>
                                        {trip.km_end != null ? Number(trip.km_end).toLocaleString('es-PE') : '—'}
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: '0.65rem', fontWeight: '700', color: '#16A34A',
                                        letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem'
                                    }}>Distancia</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#16A34A' }}>
                                        {trip.km_end != null ? `${(trip.km_end - trip.km_start).toLocaleString('es-PE')} km` : '—'}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* ===== Fotos de Sustento Card ===== */}
                {sustentoPhotos.length > 0 && (
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '20px',
                        padding: '1.5rem',
                        boxShadow: 'var(--shadow-sm)',
                        marginBottom: '1.25rem'
                    }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-dark)', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Image size={18} /> Fotos de Sustento ({sustentoPhotos.length})
                        </h3>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {sustentoPhotos.map((photo, idx) => {
                                const url = sustentoUrls[photo.id];
                                return (
                                    <div key={photo.id} style={{
                                        width: 'calc(33.33% - 0.5rem)', aspectRatio: '1',
                                        borderRadius: '12px', overflow: 'hidden',
                                        background: '#F3F4F6', border: '1px solid #E5E7EB',
                                        cursor: url ? 'pointer' : 'default'
                                    }}
                                        onClick={() => { if (url) { setModalImageUrl(url); setShowImageModal(true); } }}
                                    >
                                        {url ? (
                                            <img src={url} alt={`Sustento ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                                                <Image size={24} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ===== Ticket de Pesaje Card ===== */}
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    boxShadow: 'var(--shadow-sm)',
                    marginBottom: '1.25rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-dark)', margin: 0 }}>
                            Ticket de Pesaje
                        </h3>
                        {hasPhoto && (
                            <button
                                onClick={() => { setModalImageUrl(photoUrl); setShowImageModal(true); }}
                                style={{
                                    background: 'none', border: 'none',
                                    color: 'var(--primary-red)', fontWeight: '700', fontSize: '0.8rem',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
                                }}
                            >
                                <ZoomIn size={16} /> Ver Ampliado
                            </button>
                        )}
                    </div>

                    {hasPhoto ? (
                        <div
                            onClick={() => { setModalImageUrl(photoUrl); setShowImageModal(true); }}
                            style={{
                                width: '100%', aspectRatio: '4/3', borderRadius: '16px',
                                overflow: 'hidden', background: '#1F2937', cursor: 'pointer', position: 'relative'
                            }}
                        >
                            <img src={photoUrl} alt="Ticket de pesaje" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(0,0,0,0.05)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: 0, transition: 'opacity 0.2s'
                            }}
                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                onMouseLeave={e => e.currentTarget.style.opacity = 0}
                            >
                                <ZoomIn size={32} color="white" />
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            width: '100%', aspectRatio: '4/3', borderRadius: '16px',
                            background: 'var(--bg-light)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: '0.75rem', color: 'var(--text-light)'
                        }}>
                            <Scale size={40} strokeWidth={1.5} />
                            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Sin foto de ticket</span>
                        </div>
                    )}
                </div>

                {/* ===== Documentos Adicionales Card ===== */}
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    boxShadow: 'var(--shadow-sm)',
                    marginBottom: '1.25rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-dark)', margin: 0 }}>
                            <FileText size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
                            Documentos Adicionales
                        </h3>
                        {isEditable && (
                            <button
                                onClick={() => setShowAddForm(!showAddForm)}
                                style={{
                                    background: showAddForm ? 'var(--bg-light)' : 'var(--primary-red)',
                                    color: showAddForm ? 'var(--text-medium)' : 'white',
                                    border: 'none',
                                    padding: '0.4rem 0.75rem',
                                    borderRadius: '10px',
                                    fontWeight: '700',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {showAddForm ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Agregar</>}
                            </button>
                        )}
                    </div>

                    {/* Add Document Form */}
                    {showAddForm && isEditable && (
                        <div style={{
                            background: 'var(--bg-light)',
                            borderRadius: '14px',
                            padding: '1.25rem',
                            marginBottom: '1rem',
                            border: '1px dashed var(--border-light)'
                        }}>
                            <label style={{
                                fontSize: '0.75rem', fontWeight: '700',
                                color: 'var(--text-medium)',
                                letterSpacing: '0.05em', textTransform: 'uppercase',
                                display: 'block', marginBottom: '0.5rem'
                            }}>
                                Descripción del documento
                            </label>
                            <input
                                type="text"
                                value={newDocDescription}
                                onChange={(e) => setNewDocDescription(e.target.value)}
                                placeholder="Ej: Ficha de ruta, Guía de remisión..."
                                style={{
                                    width: '100%', padding: '0.75rem',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '10px', fontSize: '0.9rem',
                                    color: 'var(--text-dark)', outline: 'none',
                                    background: 'white', boxSizing: 'border-box',
                                    marginBottom: '0.75rem'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary-red)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
                            />
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: 'var(--primary-gradient)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: '700',
                                    fontSize: '0.85rem',
                                    cursor: uploading ? 'not-allowed' : 'pointer',
                                    opacity: uploading ? 0.7 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    boxShadow: 'var(--shadow-red)'
                                }}
                            >
                                <Camera size={18} />
                                {uploading ? 'Subiendo...' : 'Tomar Foto o Seleccionar'}
                            </button>
                        </div>
                    )}

                    {/* Document List */}
                    {additionalDocs.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '2rem 1rem',
                            color: 'var(--text-light)'
                        }}>
                            <FileText size={36} strokeWidth={1.5} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
                            <p style={{ fontSize: '0.85rem', fontWeight: '500', margin: 0 }}>
                                No hay documentos adicionales
                            </p>
                            {isEditable && (
                                <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--text-light)' }}>
                                    Agregue fotos de fichas, guías u otros documentos
                                </p>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {additionalDocs.map((doc) => (
                                <div key={doc.id} style={{
                                    background: 'var(--bg-light)',
                                    borderRadius: '14px',
                                    overflow: 'hidden',
                                    border: '1px solid var(--border-light)'
                                }}>
                                    {/* Document Image */}
                                    {docPhotoUrls[doc.id] && (
                                        <div
                                            onClick={() => { setModalImageUrl(docPhotoUrls[doc.id]); setShowImageModal(true); }}
                                            style={{
                                                width: '100%',
                                                aspectRatio: '16/9',
                                                cursor: 'pointer',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <img
                                                src={docPhotoUrls[doc.id]}
                                                alt={doc.description || 'Documento'}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                            <div style={{
                                                position: 'absolute', inset: 0,
                                                background: 'rgba(0,0,0,0.05)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                opacity: 0, transition: 'opacity 0.2s'
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                                onMouseLeave={e => e.currentTarget.style.opacity = 0}
                                            >
                                                <ZoomIn size={28} color="white" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Document Info & Actions */}
                                    <div style={{ padding: '0.75rem 1rem' }}>
                                        {editingDocId === doc.id ? (
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <input
                                                    type="text"
                                                    value={editDescription}
                                                    onChange={(e) => setEditDescription(e.target.value)}
                                                    style={{
                                                        flex: 1, padding: '0.5rem',
                                                        border: '1px solid var(--primary-red)',
                                                        borderRadius: '8px', fontSize: '0.85rem',
                                                        outline: 'none', background: 'white'
                                                    }}
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => handleSaveDescription(doc.id)}
                                                    style={{
                                                        background: '#10B981', color: 'white',
                                                        border: 'none', borderRadius: '8px',
                                                        width: '34px', height: '34px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer', flexShrink: 0
                                                    }}
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setEditingDocId(null)}
                                                    style={{
                                                        background: '#EF4444', color: 'white',
                                                        border: 'none', borderRadius: '8px',
                                                        width: '34px', height: '34px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer', flexShrink: 0
                                                    }}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <p style={{
                                                    fontSize: '0.85rem', fontWeight: '600',
                                                    color: 'var(--text-dark)', margin: 0,
                                                    flex: 1
                                                }}>
                                                    {doc.description || 'Sin descripción'}
                                                </p>
                                                {isEditable && (
                                                    <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                                                        <button
                                                            onClick={() => { setEditingDocId(doc.id); setEditDescription(doc.description || ''); }}
                                                            style={{
                                                                background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                                                                borderRadius: '8px', width: '32px', height: '32px',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                cursor: 'pointer', color: 'var(--text-medium)'
                                                            }}
                                                        >
                                                            <Edit3 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteDoc(doc)}
                                                            style={{
                                                                background: '#FEE2E2', border: '1px solid #FECACA',
                                                                borderRadius: '8px', width: '32px', height: '32px',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                cursor: 'pointer', color: '#DC2626'
                                                            }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Status note */}
                    {trip.status === 'approved' && additionalDocs.length > 0 && (
                        <div style={{
                            marginTop: '0.75rem',
                            padding: '0.625rem 0.75rem',
                            background: '#ECFDF5',
                            borderRadius: '10px',
                            border: '1px solid #A7F3D0',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}>
                            <Check size={14} color="#059669" />
                            <span style={{ fontSize: '0.75rem', color: '#065F46', fontWeight: '600' }}>
                                Viaje aprobado — los documentos no pueden ser editados.
                            </span>
                        </div>
                    )}
                </div>

                {/* ===== Travel Time Card ===== */}
                <div style={{
                    background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
                    borderRadius: '20px',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(211, 47, 47, 0.08)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '40px', height: '40px',
                            borderRadius: '12px', background: 'var(--primary-red)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 8px rgba(211, 47, 47, 0.3)'
                        }}>
                            <Clock size={20} color="white" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--primary-red)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                Tiempo de Viaje
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                                {duration}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/driver/history')}
                        style={{
                            background: 'var(--primary-red)', color: 'white',
                            border: 'none', padding: '0.6rem 1.25rem',
                            borderRadius: '12px', fontWeight: '700', fontSize: '0.8rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Ver Historial
                    </button>
                </div>
            </div>

            {/* ===== Full-Screen Image Modal ===== */}
            {showImageModal && modalImageUrl && (
                <div
                    onClick={() => setShowImageModal(false)}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.9)', zIndex: 100,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '1rem', animation: 'fadeIn 0.2s ease'
                    }}
                >
                    <button
                        onClick={() => setShowImageModal(false)}
                        style={{
                            position: 'absolute', top: '1rem', right: '1rem',
                            background: 'rgba(255,255,255,0.15)', border: 'none',
                            borderRadius: '50%', width: '44px', height: '44px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', zIndex: 101
                        }}
                    >
                        <X size={24} color="white" />
                    </button>
                    <img
                        src={modalImageUrl}
                        alt="Imagen ampliada"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxWidth: '100%', maxHeight: '90vh',
                            borderRadius: '12px', objectFit: 'contain',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default TripDetails;
