import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, CloudUpload, Camera, ImageOff } from 'lucide-react';
import { supabase } from '../supabaseClient';

const ConfirmWeighing = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [weight, setWeight] = useState('');
    const [photo, setPhoto] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const saved = sessionStorage.getItem('weighing_photo');
        if (saved) setPhoto(saved);
    }, []);

    const handleConfirm = async () => {
        if (!weight) {
            alert('Ingrese el peso del ticket');
            return;
        }

        setUploading(true);

        try {
            // 1. Save weight to trips table
            const { error: weightError } = await supabase
                .from('trips')
                .update({ weight: parseFloat(weight) })
                .eq('id', parseInt(id));

            if (weightError) {
                console.error('Error saving weight:', weightError);
                alert('Error al guardar el peso: ' + weightError.message);
                setUploading(false);
                return;
            }

            // 2. Upload photo to Supabase Storage if available
            if (photo) {
                try {
                    // Convert base64 data URL to blob
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
                        return; // Stop here, don't navigate
                    }

                    // Save the file path (not URL) to trip_photos table
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
                        return; // Stop here
                    }

                } catch (photoErr) {
                    console.error('Photo upload failed:', photoErr);
                    alert('Error inesperado subiendo foto: ' + photoErr.message);
                    setUploading(false);
                    return;
                }
            } else {
                alert('Debe tomar una foto del ticket obligatoriamente.');
                setUploading(false);
                return;
            }

            // Clean up sessionStorage
            sessionStorage.setItem(`weighing_done_${id}`, weight);
            sessionStorage.removeItem('weighing_photo');

            alert(`Peso registrado: ${weight} KG`);
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
                    Confirmar Pesaje
                </h1>
            </div>

            {/* Content */}
            <div className="container" style={{ flex: 1, paddingTop: '1.5rem', paddingBottom: '2rem', display: 'flex', flexDirection: 'column' }}>

                <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                    Verifique que la foto sea legible e ingrese el peso total mostrado en el ticket.
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
                        <img
                            src={photo}
                            alt="Ticket de pesaje"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
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

                {/* Weight Input */}
                <div style={{ marginBottom: '2rem' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: 'var(--text-medium)',
                        marginBottom: '0.5rem',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase'
                    }}>
                        PESO (KG)
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={weight}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || parseFloat(val) >= 0) {
                                    setWeight(val);
                                }
                            }}
                            placeholder="0.00"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                paddingRight: '3.5rem',
                                fontSize: '1.25rem',
                                fontWeight: '600',
                                color: 'var(--text-dark)',
                                border: '1px solid var(--border-light)',
                                borderRadius: '12px',
                                outline: 'none',
                                background: 'var(--bg-card)',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-red)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
                        />
                        <span style={{
                            position: 'absolute',
                            right: '1rem', top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--primary-red)',
                            fontWeight: '700',
                            fontSize: '0.9rem'
                        }}>
                            KG
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: 'auto' }}>
                    <button
                        onClick={handleConfirm}
                        disabled={uploading}
                        style={{
                            background: 'var(--primary-gradient)',
                            color: 'white',
                            border: 'none',
                            padding: '1rem',
                            borderRadius: '12px',
                            fontWeight: '800',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            cursor: uploading ? 'not-allowed' : 'pointer',
                            opacity: uploading ? 0.7 : 1,
                            boxShadow: 'var(--shadow-red)'
                        }}
                    >
                        <CloudUpload size={20} />
                        {uploading ? 'Subiendo...' : 'Subir Pesaje'}
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
