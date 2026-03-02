import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, CloudUpload, Camera, ImageOff, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

const ConfirmWeighing = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [photo, setPhoto] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const saved = sessionStorage.getItem('weighing_photo');
        if (saved) setPhoto(saved);
    }, []);

    const handleConfirm = async () => {
        if (!photo) {
            alert('Debe tomar una foto del ticket obligatoriamente.');
            return;
        }

        setUploading(true);

        try {
            // Upload photo to Supabase Storage
            const response = await fetch(photo);
            const blob = await response.blob();

            const fileName = `trip_${id}_ticket_${Date.now()}.jpg`;
            const filePath = `tickets/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('trip-photos')
                .upload(filePath, blob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (uploadError) {
                console.error('Error uploading photo:', uploadError);
                alert('Error al subir la foto: ' + uploadError.message);
                setUploading(false);
                return;
            }

            // Save the file path to trip_photos table
            const { error: photoDbError } = await supabase
                .from('trip_photos')
                .insert({
                    trip_id: parseInt(id),
                    photo_url: filePath,
                    photo_type: 'ticket'
                });

            if (photoDbError) {
                console.error('Error saving photo reference:', photoDbError);
                alert('Error al guardar referencia de foto: ' + photoDbError.message);
                setUploading(false);
                return;
            }

            // Clean up sessionStorage
            sessionStorage.setItem(`weighing_done_${id}`, 'true');
            sessionStorage.removeItem('weighing_photo');

            // Log interaction
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('driver_interactions').insert({
                    driver_id: user.id,
                    interaction_type: 'photo',
                    description: 'Registró pesaje de balanza'
                });
            }

            alert('Ticket registrado correctamente');
            navigate(`/driver/trip/${id}`);
        } catch (err) {
            console.error('Unexpected error:', err);
            alert('Error inesperado. Intente de nuevo.');
            setUploading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-light)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                background: 'var(--bg-card)',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                borderBottom: '1px solid var(--border-light)',
                position: 'sticky',
                top: 0, zIndex: 20
            }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-medium)' }}
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-dark)' }}>
                    Subir Ticket
                </h1>
            </div>

            {/* Content */}
            <div className="container" style={{ flex: 1, paddingTop: '1.5rem', paddingBottom: '2rem', display: 'flex', flexDirection: 'column' }}>

                <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                    Verifique que la foto del ticket sea legible antes de confirmar.
                </p>

                {/* Image Preview */}
                <div style={{
                    width: '100%',
                    aspectRatio: '4/5',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    marginBottom: '1.5rem',
                    position: 'relative',
                    background: '#1F2937',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                    {photo ? (
                        <>
                            <img
                                src={photo}
                                alt="Ticket"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div style={{
                                position: 'absolute', bottom: '0.75rem', right: '0.75rem',
                                background: 'rgba(34, 197, 94, 0.9)',
                                borderRadius: '10px', padding: '0.4rem 0.75rem',
                                display: 'flex', alignItems: 'center', gap: '0.35rem',
                                color: 'white', fontWeight: '700', fontSize: '0.75rem'
                            }}>
                                <CheckCircle size={14} /> Foto lista
                            </div>
                        </>
                    ) : (
                        <div style={{
                            width: '100%', height: '100%',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            color: 'rgba(255,255,255,0.4)', gap: '0.75rem'
                        }}>
                            <ImageOff size={48} />
                            <span style={{ fontSize: '0.85rem' }}>Imagen no disponible</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: 'auto' }}>
                    <button
                        onClick={handleConfirm}
                        disabled={uploading || !photo}
                        style={{
                            background: (photo && !uploading) ? 'var(--primary-gradient)' : '#E5E7EB',
                            color: (photo && !uploading) ? 'white' : '#9CA3AF',
                            border: 'none',
                            padding: '1rem',
                            borderRadius: '12px',
                            fontWeight: '800',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            cursor: (photo && !uploading) ? 'pointer' : 'not-allowed',
                            opacity: uploading ? 0.7 : 1,
                            boxShadow: photo ? 'var(--shadow-red)' : 'none'
                        }}
                    >
                        <CloudUpload size={20} />
                        {uploading ? 'Subiendo...' : 'Confirmar Ticket'}
                    </button>

                    <button
                        onClick={() => navigate(-1)}
                        disabled={uploading}
                        style={{
                            background: 'var(--bg-light)',
                            color: 'var(--text-dark)',
                            border: 'none',
                            padding: '1rem',
                            borderRadius: '12px',
                            fontWeight: '700',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer'
                        }}
                    >
                        <Camera size={20} />
                        Tomar de nuevo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmWeighing;
