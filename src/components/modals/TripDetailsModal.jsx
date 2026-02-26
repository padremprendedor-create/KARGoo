import React, { useEffect, useState } from 'react';
import { X, MapPin, Calendar, Truck, User, Clock, Package, Scale, Image as ImageIcon, FileText, ZoomIn, ArrowUpFromLine, ArrowDownToLine, Repeat2, Building2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const TripDetailsModal = ({ isOpen, onClose, tripId }) => {
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [photoUrl, setPhotoUrl] = useState(null);
    const [additionalDocs, setAdditionalDocs] = useState([]);
    const [additionalPhotoUrls, setAdditionalPhotoUrls] = useState({});
    const [sustentoPhotos, setSustentoPhotos] = useState([]);
    const [sustentoUrls, setSustentoUrls] = useState({});
    const [enlargedImage, setEnlargedImage] = useState(null);
    const [clientName, setClientName] = useState('');

    useEffect(() => {
        if (isOpen && tripId) {
            fetchTripDetails();
        } else {
            setTrip(null);
            setPhotoUrl(null);
            setAdditionalDocs([]);
            setAdditionalPhotoUrls({});
            setSustentoPhotos([]);
            setSustentoUrls({});
            setEnlargedImage(null);
            setClientName('');
        }
    }, [isOpen, tripId]);

    const fetchTripDetails = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('trips')
            .select('*, profiles(full_name, phone, current_vehicle_plate), trip_containers(*), trip_photos(*)')
            .eq('id', tripId)
            .single();

        if (error) {
            console.error('Error fetching trip details:', error);
        } else {
            setTrip(data);

            // Download ticket photo
            const ticketPhoto = data.trip_photos?.find(p => p.photo_type === 'ticket');
            if (ticketPhoto?.photo_url) downloadPhoto(ticketPhoto.photo_url, setPhotoUrl);

            // Additional docs
            const docs = data.trip_photos?.filter(p => p.photo_type === 'additional') || [];
            setAdditionalDocs(docs);
            if (docs.length > 0) downloadBatchPhotos(docs, setAdditionalPhotoUrls);

            // Sustento photos
            const sustentos = data.trip_photos?.filter(p => p.photo_type === 'sustento') || [];
            setSustentoPhotos(sustentos);
            if (sustentos.length > 0) downloadBatchPhotos(sustentos, setSustentoUrls);

            // Client name
            if (data.client_id) {
                const { data: clientData } = await supabase
                    .from('clients')
                    .select('name')
                    .eq('id', data.client_id)
                    .single();
                if (clientData) setClientName(clientData.name);
            }
        }
        setLoading(false);
    };

    const downloadPhoto = async (filePath, setter) => {
        if (filePath.startsWith('http')) {
            const marker = '/object/public/trip-photos/';
            const idx = filePath.indexOf(marker);
            if (idx !== -1) filePath = filePath.slice(idx + marker.length);
        }
        const { data, error } = await supabase.storage.from('trip-photos').download(filePath);
        if (!error) setter(URL.createObjectURL(data));
    };

    const downloadBatchPhotos = async (docs, setter) => {
        const urls = {};
        for (const doc of docs) {
            let fp = doc.photo_url;
            if (fp.startsWith('http')) {
                const marker = '/object/public/trip-photos/';
                const idx = fp.indexOf(marker);
                if (idx !== -1) fp = fp.slice(idx + marker.length);
            }
            const { data, error } = await supabase.storage.from('trip-photos').download(fp);
            if (!error) urls[doc.id] = URL.createObjectURL(data);
        }
        setter(urls);
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day} ${month} ${year}, ${hours}:${minutes}`;
    };

    const calcDuration = () => {
        if (!trip?.start_time) return '—';
        const start = new Date(trip.start_time).getTime();
        const end = trip.end_time ? new Date(trip.end_time).getTime() : Date.now();
        const diff = Math.max(0, end - start);
        const hrs = String(Math.floor(diff / 3600000)).padStart(2, '0');
        const mins = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
        return `${hrs}h ${mins}m`;
    };

    const getPhotoLabel = (type) => {
        switch (type) {
            case 'ticket': return 'Ticket de Pesaje';
            case 'sustento': return 'Foto de Sustento';
            case 'additional': return 'Documento Adicional';
            default: return 'Foto';
        }
    };

    if (!isOpen) return null;

    // Collect all photos into a single gallery
    const allPhotos = [];
    if (photoUrl) {
        allPhotos.push({ id: 'ticket', type: 'ticket', url: photoUrl, label: 'Ticket de Pesaje' });
    }
    sustentoPhotos.forEach(p => {
        if (sustentoUrls[p.id]) {
            allPhotos.push({ id: p.id, type: 'sustento', url: sustentoUrls[p.id], label: 'Foto de Sustento' });
        }
    });
    additionalDocs.forEach(p => {
        if (additionalPhotoUrls[p.id]) {
            allPhotos.push({ id: p.id, type: 'additional', url: additionalPhotoUrls[p.id], label: p.description || 'Documento Adicional' });
        }
    });

    const statusLabel = trip?.status === 'approved' ? 'APROBADO'
        : trip?.status === 'rejected' ? 'OBSERVADO'
            : trip?.status === 'completed' ? 'COMPLETADO'
                : trip?.status === 'in_progress' ? 'EN CURSO'
                    : 'PENDIENTE';
    const statusBg = trip?.status === 'approved' ? '#DCFCE7'
        : trip?.status === 'rejected' ? '#FEF3C7'
            : trip?.status === 'completed' ? '#EFF6FF'
                : trip?.status === 'in_progress' ? '#FEF3C7'
                    : '#F3F4F6';
    const statusColor = trip?.status === 'approved' ? '#16A34A'
        : trip?.status === 'rejected' ? '#D97706'
            : trip?.status === 'completed' ? '#2563EB'
                : trip?.status === 'in_progress' ? '#D97706'
                    : '#6B7280';

    return (
        /* Backdrop */
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60,
            backdropFilter: 'blur(4px)',
        }}>
            {/* Modal Container */}
            <div style={{
                background: 'var(--bg-light, #F8FAFC)',
                borderRadius: '20px',
                width: '95%',
                maxWidth: '1060px',
                height: 'auto',
                maxHeight: '90vh',
                boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.25rem 1.75rem',
                    borderBottom: '1px solid #E5E7EB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-card, white)',
                    flexShrink: 0,
                }}>
                    <div>
                        <h2 style={{
                            fontSize: '1.15rem',
                            fontWeight: '800',
                            color: 'var(--text-dark, #111827)',
                            letterSpacing: '-0.02em',
                            margin: 0,
                        }}>
                            Detalles del Viaje #{tripId}
                        </h2>
                        {trip && (
                            <span style={{
                                background: statusBg, color: statusColor,
                                padding: '0.2rem 0.6rem', borderRadius: '999px',
                                fontSize: '0.6rem', fontWeight: '700', letterSpacing: '0.05em',
                                display: 'inline-block', marginTop: '0.375rem',
                            }}>
                                {statusLabel}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#9CA3AF', padding: '4px', borderRadius: '8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#374151'}
                        onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Body */}
                {loading ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: '#9CA3AF' }}>
                        Cargando información...
                    </div>
                ) : !trip ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: '#EF4444' }}>
                        No se pudo cargar la información del viaje.
                    </div>
                ) : (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        flex: 1,
                        overflow: 'hidden',
                        minHeight: 0,
                    }}>
                        {/* ===== LEFT: Photos Gallery ===== */}
                        <div style={{
                            width: '48%',
                            background: '#F1F5F9',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRight: '1px solid #E2E8F0',
                        }}>
                            <div style={{
                                padding: '0.875rem 1.25rem',
                                borderBottom: '1px solid #E2E8F0',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                flexShrink: 0,
                                background: 'rgba(255,255,255,0.6)',
                            }}>
                                <ImageIcon size={16} color="var(--primary-red, #DC2626)" />
                                <span style={{
                                    fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-medium, #6B7280)',
                                    textTransform: 'uppercase', letterSpacing: '0.08em',
                                }}>
                                    Fotos del Viaje ({allPhotos.length})
                                </span>
                            </div>

                            <div style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: '1.25rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                            }}>
                                {allPhotos.length === 0 ? (
                                    <div style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        justifyContent: 'center', gap: '16px', color: '#94A3B8',
                                        textAlign: 'center', padding: '4rem 2rem',
                                    }}>
                                        <div style={{
                                            width: '72px', height: '72px', borderRadius: '50%',
                                            background: '#E2E8F0', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <ImageIcon size={32} strokeWidth={1.5} />
                                        </div>
                                        <p style={{ fontSize: '0.9rem', fontWeight: '500', margin: 0 }}>
                                            No se encontraron fotos<br />para este viaje.
                                        </p>
                                    </div>
                                ) : (
                                    allPhotos.map((photo) => (
                                        <div
                                            key={photo.id}
                                            style={{
                                                background: 'white',
                                                borderRadius: '16px',
                                                overflow: 'hidden',
                                                border: '1px solid #E2E8F0',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                                transition: 'transform 0.2s, box-shadow 0.2s',
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                            }}
                                        >
                                            <div
                                                onClick={() => setEnlargedImage(photo.url)}
                                                style={{
                                                    width: '100%',
                                                    aspectRatio: '16/10',
                                                    cursor: 'pointer',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    background: '#1F2937',
                                                }}
                                            >
                                                <img src={photo.url} alt={photo.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <div style={{
                                                    position: 'absolute', inset: 0,
                                                    background: 'rgba(0,0,0,0.1)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    opacity: 0, transition: 'opacity 0.2s',
                                                }}
                                                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                                    onMouseLeave={e => e.currentTarget.style.opacity = 0}
                                                >
                                                    <div style={{
                                                        background: 'rgba(255,255,255,0.9)', borderRadius: '10px',
                                                        padding: '6px 14px', display: 'flex', alignItems: 'center',
                                                        gap: '4px', fontSize: '0.75rem', fontWeight: '700', color: '#374151',
                                                    }}>
                                                        <ZoomIn size={14} /> Ampliar
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{
                                                padding: '0.65rem 1rem',
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                            }}>
                                                <div style={{
                                                    width: '8px', height: '8px', borderRadius: '50%',
                                                    background: photo.type === 'ticket' ? '#3B82F6'
                                                        : photo.type === 'sustento' ? '#10B981'
                                                            : '#F59E0B',
                                                    flexShrink: 0,
                                                }} />
                                                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dark, #374151)' }}>
                                                    {photo.label}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* ===== RIGHT: Trip Details ===== */}
                        <div style={{
                            width: '52%',
                            display: 'flex',
                            flexDirection: 'column',
                            background: 'var(--bg-light, #F8FAFC)',
                        }}>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                                <div style={{
                                    background: 'var(--bg-card, white)',
                                    borderRadius: '20px',
                                    padding: '1.5rem',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                    marginBottom: '1rem',
                                }}>
                                    {/* Route */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '12px',
                                            background: 'var(--bg-light, #F3F4F6)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                        }}>
                                            <MapPin size={18} color="var(--primary-red, #DC2626)" />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-light, #9CA3AF)', marginBottom: '0.125rem' }}>
                                                Ruta del Viaje
                                            </div>
                                            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-dark, #1F2937)' }}>
                                                {trip.origin || '—'} → {trip.destination || '—'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Driver */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '12px',
                                            background: 'var(--bg-light, #F3F4F6)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                        }}>
                                            <User size={18} color="var(--primary-red, #DC2626)" />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-light, #9CA3AF)', marginBottom: '0.125rem' }}>
                                                Conductor
                                            </div>
                                            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-dark, #1F2937)' }}>
                                                {trip.profiles?.full_name || 'Sin asignar'}
                                            </div>
                                            {trip.profiles?.phone && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-medium, #6B7280)', marginTop: '1px' }}>
                                                    {trip.profiles.phone}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{
                                            background: 'var(--bg-light, #F3F4F6)',
                                            padding: '0.5rem 0.75rem',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border-light, #E5E7EB)',
                                        }}>
                                            <div style={{ fontSize: '0.6rem', fontWeight: '700', color: 'var(--text-light, #9CA3AF)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                                Placa
                                            </div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-dark, #1F2937)', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                                                {trip.vehicle_plate || '—'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Service Type & Client */}
                                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                                        <div style={{ flex: 1, background: '#F8FAFC', padding: '0.875rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                            <div style={{
                                                fontSize: '0.6rem', fontWeight: '800',
                                                color: 'var(--text-medium, #6B7280)',
                                                letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem',
                                                display: 'flex', alignItems: 'center', gap: '0.375rem'
                                            }}>
                                                {trip.service_type === 'embarque' ? <ArrowUpFromLine size={13} color="var(--primary-red, #DC2626)" />
                                                    : trip.service_type === 'descarga' ? <ArrowDownToLine size={13} color="var(--primary-red, #DC2626)" />
                                                        : <Repeat2 size={13} color="var(--primary-red, #DC2626)" />}
                                                Tipo de Servicio
                                            </div>
                                            <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-dark, #1F2937)', textTransform: 'capitalize' }}>
                                                {trip.service_type || '—'}
                                            </div>
                                        </div>
                                        <div style={{ flex: 1, background: '#F8FAFC', padding: '0.875rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                            <div style={{
                                                fontSize: '0.6rem', fontWeight: '800',
                                                color: 'var(--text-medium, #6B7280)',
                                                letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem',
                                                display: 'flex', alignItems: 'center', gap: '0.375rem'
                                            }}>
                                                <Building2 size={13} color="var(--primary-red, #DC2626)" /> Cliente
                                            </div>
                                            <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-dark, #1F2937)' }}>
                                                {clientName || '—'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Containers */}
                                    {trip.trip_containers && trip.trip_containers.length > 0 && (
                                        <div style={{ marginBottom: '1rem' }}>
                                            <div style={{
                                                fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-light, #9CA3AF)',
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
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: '0.6rem', fontWeight: '700', color: '#EA580C', textTransform: 'uppercase' }}>
                                                                Contenedor {idx + 1}
                                                            </div>
                                                            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#9A3412', letterSpacing: '0.02em' }}>
                                                                {container.container_number}
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                                            {container.dimension && (
                                                                <span style={{ fontSize: '0.6rem', fontWeight: '700', color: '#B45309', background: '#FFEDD5', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                                                                    {container.dimension}'
                                                                </span>
                                                            )}
                                                            {container.condition && (
                                                                <span style={{ fontSize: '0.6rem', fontWeight: '700', color: '#B45309', background: '#FFEDD5', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                                                                    {container.condition}
                                                                </span>
                                                            )}
                                                            {container.cargo_type && (
                                                                <span style={{
                                                                    fontSize: '0.6rem', fontWeight: '700', padding: '0.15rem 0.4rem',
                                                                    borderRadius: '4px', textTransform: 'uppercase',
                                                                    color: container.cargo_type === 'imo' ? '#DC2626' : container.cargo_type === 'iqbf' ? '#7C3AED' : '#0369A1',
                                                                    background: container.cargo_type === 'imo' ? '#FEE2E2' : container.cargo_type === 'iqbf' ? '#F3E8FF' : '#E0F2FE',
                                                                }}>
                                                                    {container.cargo_type === 'general' ? 'General' : container.cargo_type.toUpperCase()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ height: '1px', background: 'var(--border-light, #E5E7EB)', margin: '1rem 0' }} />

                                    {/* Times */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '10px',
                                            background: 'var(--bg-light, #F3F4F6)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                        }}>
                                            <Calendar size={16} color="var(--primary-red, #DC2626)" />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-light, #9CA3AF)' }}>Inicio</div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dark, #1F2937)' }}>
                                                {formatDateTime(trip.start_time)}
                                            </div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-light, #9CA3AF)' }}>Fin</div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dark, #1F2937)' }}>
                                                {formatDateTime(trip.end_time)}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-light, #9CA3AF)' }}>Duración</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={14} color="#16A34A" />
                                                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#16A34A' }}>
                                                    {calcDuration()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mileage Row */}
                                    {trip.km_start != null && (
                                        <>
                                            <div style={{ height: '1px', background: 'var(--border-light, #E5E7EB)', margin: '0 0 1rem 0' }} />
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{
                                                        fontSize: '0.6rem', fontWeight: '700', color: 'var(--primary-red, #DC2626)',
                                                        letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem'
                                                    }}>Km Inicio</div>
                                                    <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-dark, #1F2937)' }}>
                                                        {Number(trip.km_start).toLocaleString('es-PE')}
                                                    </div>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{
                                                        fontSize: '0.6rem', fontWeight: '700', color: 'var(--primary-red, #DC2626)',
                                                        letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem'
                                                    }}>Km Final</div>
                                                    <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-dark, #1F2937)' }}>
                                                        {trip.km_end != null ? Number(trip.km_end).toLocaleString('es-PE') : '—'}
                                                    </div>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{
                                                        fontSize: '0.6rem', fontWeight: '700', color: '#16A34A',
                                                        letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem'
                                                    }}>Distancia</div>
                                                    <div style={{ fontSize: '1rem', fontWeight: '800', color: '#16A34A' }}>
                                                        {trip.km_end != null ? `${(trip.km_end - trip.km_start).toLocaleString('es-PE')} km` : '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Rejection banner */}
                                {trip.status === 'rejected' && trip.observations && (
                                    <div style={{
                                        background: 'linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 100%)',
                                        borderRadius: '16px',
                                        padding: '1rem',
                                        marginBottom: '1rem',
                                        border: '1px solid #FDE68A',
                                    }}>
                                        <div style={{
                                            fontSize: '0.65rem', fontWeight: '800', color: '#92400E',
                                            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem'
                                        }}>
                                            Observación de Administración
                                        </div>
                                        <p style={{ fontSize: '0.85rem', color: '#78350F', lineHeight: '1.5', margin: 0, fontWeight: '500' }}>
                                            {trip.observations}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Close button */}
                            <div style={{
                                padding: '1rem 1.5rem',
                                borderTop: '1px solid #E5E7EB',
                                background: 'var(--bg-card, white)',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                flexShrink: 0,
                                borderBottomRightRadius: '20px',
                            }}>
                                <button
                                    onClick={onClose}
                                    style={{
                                        background: 'var(--primary-red, #DC2626)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.6rem 1.5rem',
                                        borderRadius: '10px',
                                        fontWeight: '700',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#B91C1C'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'var(--primary-red, #DC2626)'}
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Enlarged image overlay */}
            {enlargedImage && (
                <div
                    onClick={() => setEnlargedImage(null)}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.85)', zIndex: 200,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '1rem', cursor: 'pointer',
                    }}
                >
                    <button
                        onClick={() => setEnlargedImage(null)}
                        style={{
                            position: 'absolute', top: '1rem', right: '1rem',
                            background: 'rgba(255,255,255,0.15)', border: 'none',
                            borderRadius: '50%', width: '40px', height: '40px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', zIndex: 201,
                        }}
                    >
                        <X size={22} color="white" />
                    </button>
                    <img
                        src={enlargedImage}
                        alt="Foto ampliada"
                        onClick={e => e.stopPropagation()}
                        style={{
                            maxWidth: '95%', maxHeight: '90vh',
                            borderRadius: '10px', objectFit: 'contain',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default TripDetailsModal;
