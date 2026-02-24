import React, { useEffect, useState } from 'react';
import { X, Scale, Image as ImageIcon, AlertCircle, CheckCircle, FileText, ZoomIn } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const VerifyWeighingModal = ({ isOpen, onClose, tripId, onVerify }) => {
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [photoUrl, setPhotoUrl] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [observations, setObservations] = useState('');
    const [additionalDocs, setAdditionalDocs] = useState([]);
    const [additionalPhotoUrls, setAdditionalPhotoUrls] = useState({});
    const [enlargedImage, setEnlargedImage] = useState(null);

    useEffect(() => {
        if (isOpen && tripId) {
            fetchTripDetails();
        } else {
            setTrip(null);
            setPhotoUrl(null);
            setProcessing(false);
            setObservations('');
            setAdditionalDocs([]);
            setAdditionalPhotoUrls({});
            setEnlargedImage(null);
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
            setObservations(data.observations || '');
            const ticketPhoto = data.trip_photos?.find(p => p.photo_type === 'ticket');
            if (ticketPhoto?.photo_url) {
                downloadPhoto(ticketPhoto.photo_url);
            }
            // Load additional documents
            const docs = data.trip_photos?.filter(p => p.photo_type === 'additional') || [];
            setAdditionalDocs(docs);
            if (docs.length > 0) {
                downloadAdditionalPhotos(docs);
            }
        }
        setLoading(false);
    };

    const downloadPhoto = async (filePath) => {
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

    const downloadAdditionalPhotos = async (docs) => {
        const urls = {};
        for (const doc of docs) {
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
        setAdditionalPhotoUrls(urls);
    };

    const handleVerify = async (status) => {
        if (status === 'rejected' && !observations.trim()) {
            alert('Por favor, ingrese las observaciones antes de rechazar.');
            return;
        }
        setProcessing(true);
        try {
            const updateData = { status };
            if (status === 'rejected') {
                updateData.observations = observations.trim();
            } else {
                updateData.observations = observations.trim() || null;
            }
            const { error } = await supabase
                .from('trips')
                .update(updateData)
                .eq('id', tripId);

            if (error) throw error;
            if (onVerify) onVerify();
            onClose();
        } catch (error) {
            console.error('Error updating trip status:', error);
            alert('Error al actualizar el estado del viaje.');
        } finally {
            setProcessing(false);
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '---';
        return new Date(dateString).toLocaleDateString('es-PE', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (!isOpen) return null;

    return (
        /* Backdrop */
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60,
            backdropFilter: 'blur(4px)',
        }}>
            {/* Modal Container */}
            <div style={{
                background: 'white',
                borderRadius: '20px',
                width: '95%',
                maxWidth: '960px',
                height: 'auto',
                maxHeight: '85vh',
                boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'fadeInScale 0.25s ease-out',
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.25rem 1.75rem',
                    borderBottom: '1px solid #E5E7EB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
                    flexShrink: 0,
                }}>
                    <h2 style={{
                        fontSize: '1.15rem',
                        fontWeight: '800',
                        color: '#111827',
                        letterSpacing: '-0.02em',
                    }}>
                        Verificar Pesaje — Viaje #{tripId}
                    </h2>
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
                        {/* ===== LEFT: Photo Area (60%) ===== */}
                        <div style={{
                            width: '58%',
                            background: '#F1F5F9',
                            display: 'flex',
                            flexDirection: 'column',
                            overflowY: 'auto',
                            borderRight: '1px solid #E2E8F0',
                        }}>
                            {/* Ticket Photo */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: '2rem', position: 'relative', minHeight: '300px',
                            }}>
                                {photoUrl ? (
                                    <>
                                        <img
                                            src={photoUrl}
                                            alt="Ticket de Pesaje"
                                            style={{
                                                maxWidth: '100%', maxHeight: '45vh',
                                                objectFit: 'contain', borderRadius: '12px',
                                                boxShadow: '0 10px 30px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)',
                                                border: '6px solid white',
                                            }}
                                        />
                                        <div style={{
                                            position: 'absolute', bottom: '1.25rem', left: '1.25rem',
                                            background: 'rgba(15,23,42,0.75)', color: 'white',
                                            padding: '6px 14px', borderRadius: '20px',
                                            fontSize: '0.7rem', fontWeight: '600',
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            backdropFilter: 'blur(8px)', letterSpacing: '0.02em',
                                        }}>
                                            <ImageIcon size={13} /> FOTO DEL TICKET
                                        </div>
                                    </>
                                ) : (
                                    <div style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        justifyContent: 'center', gap: '16px', color: '#94A3B8', textAlign: 'center',
                                    }}>
                                        <div style={{
                                            width: '80px', height: '80px', borderRadius: '50%',
                                            background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <ImageIcon size={36} strokeWidth={1.5} />
                                        </div>
                                        <p style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                                            No se encontró foto de ticket<br />para este viaje.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Additional Documents Gallery */}
                            {additionalDocs.length > 0 && (
                                <div style={{ padding: '0 1.5rem 1.5rem' }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        marginBottom: '0.75rem',
                                    }}>
                                        <FileText size={14} color="#64748B" />
                                        <span style={{
                                            fontSize: '0.7rem', fontWeight: '700', color: '#64748B',
                                            textTransform: 'uppercase', letterSpacing: '0.08em',
                                        }}>
                                            Documentos Adicionales ({additionalDocs.length})
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {additionalDocs.map(doc => (
                                            <div key={doc.id} style={{
                                                background: 'white', borderRadius: '10px',
                                                overflow: 'hidden', border: '1px solid #E2E8F0',
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                                            }}>
                                                {additionalPhotoUrls[doc.id] && (
                                                    <div
                                                        onClick={() => setEnlargedImage(additionalPhotoUrls[doc.id])}
                                                        style={{
                                                            width: '100%', aspectRatio: '16/9',
                                                            cursor: 'pointer', position: 'relative', overflow: 'hidden',
                                                        }}
                                                    >
                                                        <img
                                                            src={additionalPhotoUrls[doc.id]}
                                                            alt={doc.description || 'Documento'}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                        <div style={{
                                                            position: 'absolute', inset: 0,
                                                            background: 'rgba(0,0,0,0.05)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            opacity: 0, transition: 'opacity 0.2s',
                                                        }}
                                                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                                            onMouseLeave={e => e.currentTarget.style.opacity = 0}
                                                        >
                                                            <ZoomIn size={24} color="white" />
                                                        </div>
                                                    </div>
                                                )}
                                                <div style={{ padding: '8px 12px' }}>
                                                    <p style={{
                                                        fontSize: '0.8rem', fontWeight: '600',
                                                        color: '#1F2937', margin: 0,
                                                    }}>
                                                        {doc.description || 'Sin descripción'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ===== RIGHT: Details & Actions (42%) ===== */}
                        <div style={{
                            width: '42%',
                            display: 'flex',
                            flexDirection: 'column',
                            background: 'white',
                        }}>
                            {/* Scrollable Details */}
                            <div style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: '2rem 1.75rem',
                                textAlign: 'center',
                            }}>
                                <div style={{
                                    fontSize: '0.65rem',
                                    fontWeight: '800',
                                    color: '#9CA3AF',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.15em',
                                    marginBottom: '1.75rem',
                                }}>
                                    Detalles del Registro
                                </div>

                                {/* Detail Items */}
                                {[
                                    { label: 'Conductor', value: trip.profiles?.full_name || 'Sin asignar' },
                                    { label: 'Placa', value: trip.vehicle_plate },
                                    ...((trip.trip_containers && trip.trip_containers.length > 0)
                                        ? trip.trip_containers.map((c, i) => {
                                            const details = [c.dimension ? `${c.dimension}'` : '', c.condition || ''].filter(Boolean).join(' - ');
                                            const val = c.container_number + (details ? ` (${details})` : '');
                                            return { label: `Contenedor ${trip.trip_containers.length > 1 ? i + 1 : ''}`.trim(), value: val };
                                        })
                                        : [{ label: 'Contenedor', value: '---' }]),
                                    { label: 'Fecha / Hora Fin', value: formatDateTime(trip.end_time || trip.created_at) },
                                ].map((item, i, arr) => (
                                    <div key={i} style={{
                                        marginBottom: '1.25rem',
                                        paddingBottom: i === arr.length - 1 ? '1.25rem' : '0',
                                        borderBottom: i === arr.length - 1 ? '1px solid #F3F4F6' : 'none',
                                    }}>
                                        <div style={{
                                            fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '4px',
                                            fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em',
                                        }}>
                                            {item.label}
                                        </div>
                                        <div style={{
                                            fontSize: '0.95rem', fontWeight: '700', color: '#1F2937',
                                        }}>
                                            {item.value}
                                        </div>
                                    </div>
                                ))}

                                {/* Weight - Highlighted */}
                                <div style={{
                                    marginTop: '0.5rem',
                                    padding: '1.25rem',
                                    background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFBEB 100%)',
                                    borderRadius: '14px',
                                    border: '1px solid #FDE68A',
                                }}>
                                    <div style={{
                                        fontSize: '0.65rem', color: '#92400E', marginBottom: '6px',
                                        fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                                    }}>
                                        <Scale size={13} /> Peso Declarado
                                    </div>
                                    <div style={{
                                        fontSize: '2rem', fontWeight: '900', color: '#92400E',
                                        letterSpacing: '-0.03em', lineHeight: 1.1,
                                    }}>
                                        {trip.weight ? Number(trip.weight).toLocaleString('es-PE') : '---'}
                                        <span style={{ fontSize: '0.85rem', fontWeight: '500', marginLeft: '6px', color: '#B45309' }}>KG</span>
                                    </div>
                                </div>

                                {/* Info Note */}
                                <div style={{
                                    marginTop: '1.25rem',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '8px',
                                    background: '#F8FAFC',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid #E2E8F0',
                                    textAlign: 'left',
                                }}>
                                    <AlertCircle size={15} style={{ color: '#64748B', flexShrink: 0, marginTop: '1px' }} />
                                    <p style={{ fontSize: '0.72rem', color: '#64748B', lineHeight: '1.45', margin: 0 }}>
                                        <strong>Nota:</strong> Verifique que el peso en la imagen coincida con el valor declarado.
                                    </p>
                                </div>

                                {/* Previous rejection banner */}
                                {trip.status === 'rejected' && trip.observations && (
                                    <div style={{
                                        marginTop: '1rem',
                                        padding: '10px 12px',
                                        background: '#FFF1F2',
                                        borderRadius: '10px',
                                        border: '1px solid #FECDD3',
                                        textAlign: 'left',
                                    }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#E11D48', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                            Observación anterior
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: '#9F1239', lineHeight: '1.45', margin: 0 }}>
                                            {trip.observations}
                                        </p>
                                    </div>
                                )}

                                {/* Observations textarea */}
                                <div style={{ marginTop: '1rem', textAlign: 'left' }}>
                                    <label style={{
                                        fontSize: '0.7rem', fontWeight: '700', color: '#6B7280',
                                        textTransform: 'uppercase', letterSpacing: '0.05em',
                                        display: 'block', marginBottom: '6px',
                                    }}>
                                        Observaciones
                                    </label>
                                    <textarea
                                        value={observations}
                                        onChange={(e) => setObservations(e.target.value)}
                                        placeholder="Escriba observaciones (obligatorio para rechazar)..."
                                        rows={3}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: '10px',
                                            border: '1px solid #E2E8F0',
                                            fontSize: '0.85rem',
                                            color: '#1F2937',
                                            resize: 'vertical',
                                            outline: 'none',
                                            fontFamily: 'inherit',
                                            transition: 'border-color 0.2s',
                                            boxSizing: 'border-box',
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#93C5FD'}
                                        onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                                    />
                                </div>
                            </div>

                            {/* ===== Action Buttons (sticky bottom) ===== */}
                            <div style={{ flexShrink: 0 }}>
                                <button
                                    onClick={() => handleVerify('approved')}
                                    disabled={processing}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        background: '#10B981',
                                        color: 'white',
                                        border: 'none',
                                        borderTop: '1px solid #E5E7EB',
                                        fontSize: '0.9rem',
                                        fontWeight: '700',
                                        cursor: processing ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        transition: 'background 0.2s',
                                        opacity: processing ? 0.7 : 1,
                                    }}
                                    onMouseEnter={e => { if (!processing) e.currentTarget.style.background = '#059669'; }}
                                    onMouseLeave={e => { if (!processing) e.currentTarget.style.background = '#10B981'; }}
                                >
                                    {processing ? 'Procesando...' : <><CheckCircle size={18} /> Aprobar Foto</>}
                                </button>

                                <button
                                    onClick={() => handleVerify('rejected')}
                                    disabled={processing}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        background: '#EF4444',
                                        color: 'white',
                                        border: 'none',
                                        borderTop: '1px solid rgba(0,0,0,0.08)',
                                        fontSize: '0.9rem',
                                        fontWeight: '700',
                                        cursor: processing ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        transition: 'background 0.2s',
                                        opacity: processing ? 0.7 : 1,
                                        borderBottomRightRadius: '20px',
                                    }}
                                    onMouseEnter={e => { if (!processing) e.currentTarget.style.background = '#DC2626'; }}
                                    onMouseLeave={e => { if (!processing) e.currentTarget.style.background = '#EF4444'; }}
                                >
                                    {processing ? 'Procesando...' : <><X size={18} /> Rechazar Foto</>}
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
                        alt="Documento ampliado"
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

export default VerifyWeighingModal;
