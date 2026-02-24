import React, { useRef, useState, useEffect } from 'react';
import { X, Zap, RotateCcw } from 'lucide-react';

const CameraCapture = ({ onCapture, onClose, overlayText = "Encuadre el objetivo" }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [flashOn, setFlashOn] = useState(false);
    const [cameraError, setCameraError] = useState(false);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error('Camera error:', err);
            setCameraError(true);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const capture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            // Don't stop camera here, parent might want to keep it open? 
            // Actually, we usually close after capture.
            // But let's verify if onCapture is async or not.
            // For now, stop camera inside this component is fine.
            stopCamera();
            onCapture(imageData);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'black', overflow: 'hidden', zIndex: 100 }}>
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Header Overlay */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                padding: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                zIndex: 20
            }}>
                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none', borderRadius: '50%',
                        width: '44px', height: '44px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', cursor: 'pointer',
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    <X size={24} />
                </button>
                <button
                    onClick={() => setFlashOn(!flashOn)}
                    style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none', borderRadius: '50%',
                        width: '44px', height: '44px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: flashOn ? '#FDBA74' : 'white',
                        cursor: 'pointer',
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    <Zap size={24} fill={flashOn ? "#FDBA74" : "none"} />
                </button>
            </div>

            {/* Camera View */}
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                {cameraError ? (
                    <div style={{
                        width: '100%', height: '100%',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        color: 'rgba(255,255,255,0.6)', gap: '1rem',
                        background: '#1a1a1a'
                    }}>
                        <p style={{ fontSize: '0.9rem' }}>Cámara no disponible</p>
                        <button onClick={onClose} style={{ color: 'var(--primary-red)' }}>Cerrar</button>
                    </div>
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                )}

                {/* Framing Overlay */}
                <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -55%)',
                    width: '85%', maxWidth: '360px',
                    aspectRatio: '3/4',
                    pointerEvents: 'none',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '24px',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                    zIndex: 10
                }}>
                    {/* Orange Corners */}
                    {[
                        { top: '-2px', left: '-2px', borderTop: '4px solid var(--primary-red)', borderLeft: '4px solid var(--primary-red)', borderTopLeftRadius: '24px' },
                        { top: '-2px', right: '-2px', borderTop: '4px solid var(--primary-red)', borderRight: '4px solid var(--primary-red)', borderTopRightRadius: '24px' },
                        { bottom: '-2px', left: '-2px', borderBottom: '4px solid var(--primary-red)', borderLeft: '4px solid var(--primary-red)', borderBottomLeftRadius: '24px' },
                        { bottom: '-2px', right: '-2px', borderBottom: '4px solid var(--primary-red)', borderRight: '4px solid var(--primary-red)', borderBottomRightRadius: '24px' },
                    ].map((style, i) => (
                        <div key={i} style={{ position: 'absolute', width: '32px', height: '32px', ...style }} />
                    ))}

                    {/* Instruction Capsule */}
                    <div style={{
                        position: 'absolute',
                        top: '20px', left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.6)',
                        padding: '0.5rem 1rem',
                        borderRadius: '999px',
                        color: 'white',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        {overlayText}
                    </div>
                </div>
            </div>

            {/* Bottom Controls */}
            <div style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                height: '180px',
                background: 'linear-gradient(to top, black 50%, transparent 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 20
            }}>
                <button
                    onClick={capture}
                    style={{
                        width: '76px', height: '76px',
                        background: 'white', borderRadius: '50%',
                        border: '4px solid rgba(255,255,255,0.3)',
                        cursor: 'pointer',
                        boxShadow: '0 0 20px rgba(0,0,0,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                />
            </div>
        </div>
    );
};

export default CameraCapture;
