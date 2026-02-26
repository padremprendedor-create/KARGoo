import React from 'react';
import { CheckCircle, Camera, Check, ImageOff } from 'lucide-react';

/**
 * Reusable photo confirmation overlay.
 * Shows the captured photo full-screen with "Confirmar" and "Tomar de nuevo" buttons.
 *
 * Props:
 *   photoSrc  - data URL or blob URL of the captured photo
 *   title     - e.g. "Foto del Contenedor"
 *   subtitle  - e.g. "Verifique que el código sea legible"
 *   confirmLabel - button text, default "Confirmar Foto"
 *   onConfirm - called when user accepts the photo
 *   onRetake  - called when user wants to retake
 */
const PhotoConfirmModal = ({ photoSrc, title, subtitle, confirmLabel = 'Confirmar Foto', onConfirm, onRetake }) => {
    if (!photoSrc) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'var(--bg-light)',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Header */}
            <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border-light)',
                background: 'var(--bg-card)',
            }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-dark)' }}>
                    {title || 'Confirmar Foto'}
                </h2>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                    {subtitle || 'Verifique que la foto sea legible antes de confirmar.'}
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
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    flexShrink: 0,
                }}>
                    <img
                        src={photoSrc}
                        alt="Foto capturada"
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
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: 'auto' }}>
                    <button
                        onClick={onConfirm}
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
                            cursor: 'pointer',
                            boxShadow: 'var(--shadow-red)'
                        }}
                    >
                        <Check size={20} />
                        {confirmLabel}
                    </button>

                    <button
                        onClick={onRetake}
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

export default PhotoConfirmModal;
