import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, MapPin, Truck, Camera, CheckCircle, HelpCircle, Gauge, X, Image, Plus, Package } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, Autocomplete } from '@react-google-maps/api';
import Card from '../components/ui/Card';
import PhotoConfirmModal from '../components/PhotoConfirmModal';
import { supabase } from '../supabaseClient';

const mapContainerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '16px'
};

const defaultCenter = {
    lat: -11.865, // Puente Piedra, Lima
    lng: -77.075
};

const libraries = ['places', 'geometry'];

const ActiveTrip = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [trip, setTrip] = useState(null);
    const [destinationCoords, setDestinationCoords] = useState(null);
    const [loading, setLoading] = useState(true);
    const [finishing, setFinishing] = useState(false);
    const [showFinishModal, setShowFinishModal] = useState(false);
    const [kmEnd, setKmEnd] = useState('');

    // Sustento photos (1-3)
    const [sustentoPhotos, setSustentoPhotos] = useState([]);
    const [uploadingSustento, setUploadingSustento] = useState(false);
    const sustentoFileRef = useRef(null);
    const [pendingSustentoPhoto, setPendingSustentoPhoto] = useState(null); // data URL for confirmation

    // --- Google Maps Navigation & Tracking ---
    const [currentLocation, setCurrentLocation] = useState(defaultCenter);
    const [routePolyline, setRoutePolyline] = useState(null); // Array of {lat, lng} points
    const [autocomplete, setAutocomplete] = useState(null);

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    useEffect(() => {
        let watchId;
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    setCurrentLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => console.error("Error obteniendo ubicación: ", error),
                { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
            );
        }
        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, []);

    const [routeCalculated, setRouteCalculated] = useState(false);

    const calculateRoute = useCallback(async () => {
        if (!window.google || !trip?.destination || !currentLocation || routeCalculated) return;

        // Build destination: if we have coords use them, else use the name string
        const origin = `${currentLocation.lat},${currentLocation.lng}`;
        let destination;
        if (destinationCoords) {
            destination = `${destinationCoords.lat},${destinationCoords.lng}`;
        } else {
            destination = trip.destination;
        }

        console.log("📍 Trazando ruta (Routes API) hacia:", destination);

        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
        try {
            const res = await fetch(
                `https://routes.googleapis.com/directions/v2:computeRoutes`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': apiKey,
                        'X-Goog-FieldMask': 'routes.polyline.encodedPolyline'
                    },
                    body: JSON.stringify({
                        origin: { location: { latLng: { latitude: currentLocation.lat, longitude: currentLocation.lng } } },
                        destination: destinationCoords
                            ? { location: { latLng: { latitude: destinationCoords.lat, longitude: destinationCoords.lng } } }
                            : { address: trip.destination },
                        travelMode: 'DRIVE',
                        routingPreference: 'TRAFFIC_AWARE'
                    })
                }
            );
            const data = await res.json();
            const encoded = data?.routes?.[0]?.polyline?.encodedPolyline;
            if (encoded) {
                // Decode the polyline using the google maps geometry library
                const path = window.google.maps.geometry.encoding.decodePath(encoded);
                const points = path.map(p => ({ lat: p.lat(), lng: p.lng() }));
                setRoutePolyline(points);
                setRouteCalculated(true);
                console.log("✅ Ruta trazada con", points.length, "puntos");
            } else {
                console.warn("⚠️ Routes API no devolvió polilínea:", data);
            }
        } catch (error) {
            console.error("❌ Error al trazar ruta:", error);
        }
    }, [trip?.destination, destinationCoords, currentLocation, routeCalculated]);

    useEffect(() => {
        if (isLoaded && trip?.destination && currentLocation && !routeCalculated) {
            calculateRoute();
        }
    }, [isLoaded, trip?.destination, currentLocation, routeCalculated, calculateRoute]);
    // ----------------------------------------

    useEffect(() => {
        fetchTrip();
    }, [id]);



    const fetchTrip = async () => {
        const { data } = await supabase
            .from('trips')
            .select('*, trip_containers(*), trip_photos(*)')
            .eq('id', id)
            .single();

        setTrip(data);

        if (data?.trip_photos) {
            const loadedSustento = data.trip_photos
                .filter(p => p.photo_type === 'sustento')
                .map(p => ({
                    id: p.id,
                    filePath: p.photo_url,
                    previewUrl: null
                }));
            setSustentoPhotos(loadedSustento);
        }

        // Fetch coordinates of destination
        if (data && data.destination) {
            console.log("🔍 Buscando coordenadas en BD para:", data.destination);
            const { data: locData, error: locError } = await supabase
                .from('locations')
                .select('name, latitude, longitude')
                .ilike('name', `%${data.destination.trim()}%`)
                .limit(1)
                .maybeSingle();

            if (locError) {
                console.error("❌ Error buscando coordenadas:", locError);
            } else if (locData) {
                console.log("✅ Coordenadas encontradas en BD:", locData);
                if (locData.latitude && locData.longitude) {
                    setDestinationCoords({ lat: locData.latitude, lng: locData.longitude });
                } else {
                    console.warn("⚠️ La ubicación existe pero no tiene coordenadas guardadas.");
                }
            } else {
                console.warn("⚠️ No se encontró la ubicación en la base de datos.");
            }
        }

        setLoading(false);
    };

    // --- Sustento photo handlers ---
    // Step 1: File selected → show confirmation
    const handleSustentoFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (sustentoPhotos.length >= 3) {
            alert('Máximo 3 fotos de sustento');
            return;
        }
        // Convert to data URL for preview
        const reader = new FileReader();
        reader.onload = () => setPendingSustentoPhoto(reader.result);
        reader.readAsDataURL(file);
        if (sustentoFileRef.current) sustentoFileRef.current.value = '';
    };

    // Step 2: User confirmed → upload to Supabase
    const handleSustentoConfirm = async () => {
        if (!pendingSustentoPhoto) return;
        setUploadingSustento(true);

        try {
            // Convert data URL to blob
            const response = await fetch(pendingSustentoPhoto);
            const blob = await response.blob();

            const fileName = `trip_${id}_sustento_${Date.now()}.jpg`;
            const filePath = `sustento/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('trip-photos')
                .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

            if (uploadError) throw uploadError;

            const { data: insertData, error: dbError } = await supabase
                .from('trip_photos')
                .insert({
                    trip_id: parseInt(id),
                    photo_url: filePath,
                    photo_type: 'sustento'
                })
                .select()
                .single();

            if (dbError) throw dbError;

            setSustentoPhotos(prev => [...prev, {
                id: insertData.id,
                filePath,
                previewUrl: pendingSustentoPhoto
            }]);
        } catch (err) {
            console.error('Error uploading sustento photo:', err);
            alert('Error al subir foto: ' + err.message);
        } finally {
            setUploadingSustento(false);
            setPendingSustentoPhoto(null);
        }
    };

    const handleSustentoRemove = async (index) => {
        const photo = sustentoPhotos[index];
        try {
            await supabase.storage.from('trip-photos').remove([photo.filePath]);
            await supabase.from('trip_photos').delete().eq('id', photo.id);
            if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
            setSustentoPhotos(prev => prev.filter((_, i) => i !== index));
        } catch (err) {
            console.error('Error removing sustento photo:', err);
            alert('Error al eliminar foto');
        }
    };

    const handleFinishTrip = async () => {
        const kmEndVal = parseFloat(kmEnd);
        if (!kmEnd || isNaN(kmEndVal)) {
            alert('Ingrese el kilometraje final');
            return;
        }
        if (trip.km_start != null && kmEndVal < trip.km_start) {
            alert('El kilometraje final no puede ser menor al inicial');
            return;
        }
        if (sustentoPhotos.length === 0) {
            alert('Debe subir al menos 1 foto de sustento (ticket de almacén o puerto)');
            return;
        }
        setFinishing(true);
        const { data, error } = await supabase
            .from('trips')
            .update({
                status: 'completed',
                end_time: new Date().toISOString(),
                km_end: kmEndVal,
            })
            .eq('id', parseInt(id))
            .select();

        if (error) {
            console.error('Error ending trip:', error);
            alert(`Error al finalizar: ${error.message}`);
            setFinishing(false);
            return;
        }

        if (!data || data.length === 0) {
            console.error('No rows updated. ID mismatch?', id);
            alert('Error: No se pudo actualizar el viaje.');
            setFinishing(false);
            return;
        }

        setShowFinishModal(false);

        // Compute elapsed time from start_time
        const start = new Date(trip.start_time).getTime();
        const diff = Math.max(0, Date.now() - start);
        const hrs = String(Math.floor(diff / 3600000)).padStart(2, '0');
        const mins = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
        const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');

        navigate(`/driver/trip/${id}/completed`, {
            state: {
                tripId: id,
                origin: trip.origin,
                destination: trip.destination,
                elapsed: `${hrs}:${mins}:${secs}`
            }
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-orange-500 font-medium">Cargando viaje...</div>
            </div>
        );
    }

    if (!trip) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">Viaje no encontrado</p>
                    <button
                        onClick={() => navigate('/driver')}
                        className="bg-orange-500 text-white px-4 py-2 rounded-lg"
                    >
                        Volver al inicio
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div style={{ minHeight: '100vh', background: 'var(--bg-light)', paddingBottom: '20px' }}>
                {/* Header */}
                <div style={{
                    background: 'var(--primary-red)',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: 'white',
                    position: 'sticky',
                    top: 0,
                    zIndex: 40
                }}>
                    <button
                        onClick={() => navigate('/driver')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}
                    >
                        <ChevronLeft size={28} />
                    </button>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Viaje en Progreso</h1>
                    <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}
                    >
                        <HelpCircle size={24} />
                    </button>
                </div>

                <div className="container" style={{ paddingTop: '1.5rem' }}>
                    {/* Info Card */}
                    <Card variant="flat" style={{
                        borderRadius: '16px',
                        padding: '1.25rem',
                        background: 'var(--bg-card)',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        marginBottom: '1rem'
                    }}>
                        {/* Status & ID */}
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <span className="animate-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                                    <span style={{ color: '#EF4444', fontWeight: '700', fontSize: '0.75rem', letterSpacing: '0.05em' }}>LIVE</span>
                                </div>
                            </div>
                            <span style={{ color: 'var(--text-light)', fontSize: '0.75rem', fontWeight: '600' }}>
                                ID: TRK-{trip.id.toString().slice(-5)}
                            </span>
                        </div>

                        {/* Route */}
                        <div className="mb-2">
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {trip.origin}
                                <span style={{ color: 'var(--primary-red)' }}>→</span>
                                {trip.destination}
                            </h2>
                        </div>

                        {/* Badges: Service Type & Cargo Type */}
                        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                            {trip.service_type && (
                                <span style={{
                                    background: '#F3F4F6', color: '#4B5563', padding: '0.4rem 1rem',
                                    borderRadius: '10px', fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase',
                                    border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                    Servicio: {trip.service_type}
                                </span>
                            )}
                            {trip.cargo_type && (
                                <span style={{
                                    background: trip.cargo_type === 'imo' ? '#FEE2E2' : trip.cargo_type === 'iqbf' ? '#F3E8FF' : '#E0F2FE',
                                    color: trip.cargo_type === 'imo' ? '#DC2626' : trip.cargo_type === 'iqbf' ? '#9333EA' : '#0284C7',
                                    border: `1px solid ${trip.cargo_type === 'imo' ? '#FECACA' : trip.cargo_type === 'iqbf' ? '#E9D5FF' : '#BAE6FD'}`,
                                    padding: '0.4rem 1rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '900', textTransform: 'uppercase',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                    Carga: {trip.cargo_type}
                                </span>
                            )}
                        </div>

                        {/* Container Info Block */}
                        <div className="mb-6">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <Package size={16} color="var(--text-light)" />
                                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Contenedores ({trip.trip_containers?.length || 0})
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {trip.trip_containers && trip.trip_containers.length > 0 ? (
                                    trip.trip_containers.map((c, i) => (
                                        <div key={i} style={{
                                            background: '#F3F4F6',
                                            border: '1px solid #E5E7EB',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            minWidth: '120px',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                        }}>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--text-dark)', fontWeight: '800', letterSpacing: '0.01em' }}>
                                                {c.container_number}
                                            </span>
                                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.1rem' }}>
                                                <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-medium)', opacity: 0.8 }}>
                                                    {c.dimension}'
                                                </span>
                                                <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-medium)', opacity: 0.8 }}>
                                                    {c.condition}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <span style={{ color: 'var(--text-medium)', fontSize: '0.9rem', fontStyle: 'italic' }}>Sin contenedores</span>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Map Card */}
                    <Card variant="flat" style={{
                        padding: 0,
                        borderRadius: '16px',
                        height: '420px',
                        marginBottom: '1rem',
                        position: 'relative',
                        background: 'var(--info-light)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {isLoaded ? (
                            <>
                                {/* Buscador de lugares predictivo */}
                                <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', zIndex: 10 }}>
                                    <Autocomplete
                                        onLoad={(auto) => setAutocomplete(auto)}
                                        onPlaceChanged={() => {
                                            if (autocomplete !== null) {
                                                const place = autocomplete.getPlace();
                                                if (place.geometry) {
                                                    setCurrentLocation({
                                                        lat: place.geometry.location.lat(),
                                                        lng: place.geometry.location.lng()
                                                    });
                                                }
                                            }
                                        }}
                                    >
                                        <input
                                            type="text"
                                            placeholder="Buscar un lugar o centro..."
                                            style={{
                                                boxSizing: `border-box`,
                                                border: `1px solid transparent`,
                                                width: `100%`,
                                                height: `45px`,
                                                padding: `0 16px`,
                                                borderRadius: `12px`,
                                                boxShadow: `rgba(0, 0, 0, 0.1) 0px 4px 12px`,
                                                fontSize: `14px`,
                                                outline: `none`,
                                                textOverflow: `ellipses`,
                                                fontWeight: '500'
                                            }}
                                        />
                                    </Autocomplete>
                                </div>

                                <GoogleMap
                                    mapContainerStyle={mapContainerStyle}
                                    center={currentLocation}
                                    zoom={15}
                                    options={{
                                        disableDefaultUI: true,
                                        zoomControl: true,
                                        mapTypeControl: false,
                                        streetViewControl: false,
                                    }}
                                >
                                    {/* Marcador del conductor */}
                                    <Marker position={currentLocation} icon={{
                                        path: window.google.maps.SymbolPath.CIRCLE,
                                        scale: 9,
                                        fillColor: "#EF4444",
                                        fillOpacity: 1,
                                        strokeWeight: 3,
                                        strokeColor: "#ffffff",
                                    }} />

                                    {/* Ruta trazada si existe destino */}
                                    {routePolyline && (
                                        <Polyline
                                            path={routePolyline}
                                            options={{
                                                strokeColor: "#EF4444",
                                                strokeOpacity: 1,
                                                strokeWeight: 5
                                            }}
                                        />
                                    )}
                                </GoogleMap>
                            </>
                        ) : loadError ? (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ color: 'var(--primary-red)', fontWeight: '600' }}>Error al cargar mapa</span>
                            </div>
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ color: 'var(--text-medium)', fontWeight: '600' }}>Cargando mapa...</span>
                            </div>
                        )}

                        {/* Location Bar */}
                        <div style={{
                            position: 'absolute',
                            bottom: '1rem', left: '1rem', right: '1rem',
                            background: 'var(--bg-card)',
                            borderRadius: '12px',
                            padding: '0.75rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                            <MapPin size={20} color="var(--primary-red)" fill="var(--primary-red)" />
                            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                Av. Gambetta, Callao - 1.2km de destino
                            </span>
                        </div>
                    </Card>

                    {/* ===== Fotos de Sustento Section ===== */}
                    <Card variant="flat" style={{
                        borderRadius: '16px',
                        padding: '1.25rem',
                        background: 'var(--bg-card)',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        marginBottom: '1rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-light)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                    FOTOS DE SUSTENTO
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-medium)', marginTop: '0.25rem' }}>
                                    Tickets de almacén y puerto ({sustentoPhotos.length}/3)
                                </div>
                            </div>
                            {sustentoPhotos.length > 0 && (
                                <div style={{
                                    background: '#DCFCE7', color: '#16A34A',
                                    padding: '0.25rem 0.6rem', borderRadius: '8px',
                                    fontSize: '0.7rem', fontWeight: '700'
                                }}>
                                    {sustentoPhotos.length} foto{sustentoPhotos.length > 1 ? 's' : ''}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: sustentoPhotos.length < 3 ? '1.25rem' : '0' }}>
                            {sustentoPhotos.map((photo, idx) => (
                                <div key={photo.id || idx} style={{
                                    display: 'flex', alignItems: 'center',
                                    gap: '0.65rem', background: '#F0FDF4', padding: '0.75rem 1rem',
                                    borderRadius: '12px', border: '1px solid #BBF7D0',
                                    boxShadow: '0 1px 2px rgba(22, 163, 74, 0.05)'
                                }}>
                                    <CheckCircle size={14} color="#16A34A" />
                                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#15803D', flex: 1 }}>
                                        Foto sustentada {idx + 1}
                                    </span>
                                    <button
                                        onClick={() => handleSustentoRemove(idx)}
                                        style={{
                                            background: '#BBF7D0', border: 'none', cursor: 'pointer',
                                            color: '#15803D', padding: '4px', borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = '#86EFAC'}
                                        onMouseOut={(e) => e.currentTarget.style.background = '#BBF7D0'}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add photo button */}
                        {sustentoPhotos.length < 3 && (
                            <>
                                <input
                                    ref={sustentoFileRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleSustentoFileSelect}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    onClick={() => sustentoFileRef.current?.click()}
                                    disabled={uploadingSustento}
                                    style={{
                                        width: '100%',
                                        padding: '0.85rem',
                                        border: '2px dashed var(--border-light)',
                                        borderRadius: '12px',
                                        background: 'var(--bg-light)',
                                        color: 'var(--text-medium)',
                                        fontWeight: '700',
                                        fontSize: '0.9rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        cursor: uploadingSustento ? 'not-allowed' : 'pointer',
                                        opacity: uploadingSustento ? 0.7 : 1,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {uploadingSustento ? (
                                        'Subiendo...'
                                    ) : (
                                        <>
                                            <Plus size={18} /> Agregar foto de sustento
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </Card>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => navigate(`/driver/trip/${id}/weighing`)}
                            style={{
                                background: 'var(--bg-card)',
                                color: 'var(--primary-red)',
                                border: '2px solid var(--primary-red)',
                                padding: '1rem',
                                borderRadius: '12px',
                                fontWeight: '800',
                                fontSize: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}>
                            <Camera size={22} /> Registrar Ticket
                        </button>
                        <button
                            onClick={() => setShowFinishModal(true)}
                            disabled={finishing}
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
                                cursor: finishing ? 'not-allowed' : 'pointer',
                                opacity: finishing ? 0.8 : 1,
                                boxShadow: 'var(--shadow-red)'
                            }}
                        >
                            <CheckCircle size={22} />
                            {finishing ? 'FINALIZANDO...' : 'FINALIZAR VIAJE'}
                        </button>
                    </div>
                </div>

                {/* Kilometraje Final Modal */}
                {showFinishModal && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '1.5rem'
                    }}>
                        <div style={{
                            background: 'var(--bg-card)', borderRadius: '24px',
                            padding: '2rem', width: '100%', maxWidth: '400px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-dark)' }}>Finalizar Viaje</h3>
                                <button onClick={() => setShowFinishModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                Ingrese el kilometraje actual del vehículo para calcular la distancia recorrida.
                            </p>

                            {/* Sustento photos summary */}
                            <div style={{
                                background: sustentoPhotos.length > 0 ? '#F0FDF4' : '#FEF2F2',
                                borderRadius: '12px',
                                padding: '0.75rem 1rem',
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                border: `1px solid ${sustentoPhotos.length > 0 ? '#BBF7D0' : '#FECACA'}`
                            }}>
                                {sustentoPhotos.length > 0 ? (
                                    <>
                                        <CheckCircle size={16} color="#16A34A" />
                                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#166534' }}>
                                            {sustentoPhotos.length} foto{sustentoPhotos.length > 1 ? 's' : ''} de sustento adjunta{sustentoPhotos.length > 1 ? 's' : ''}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Camera size={16} color="#DC2626" />
                                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#991B1B' }}>
                                            Debe subir al menos 1 foto de sustento
                                        </span>
                                    </>
                                )}
                            </div>

                            <label style={{
                                display: 'block', fontSize: '0.75rem', fontWeight: '700',
                                color: 'var(--text-light)', textTransform: 'uppercase',
                                letterSpacing: '0.05em', marginBottom: '0.75rem'
                            }}>
                                KILOMETRAJE FINAL
                            </label>
                            <div style={{
                                background: 'var(--bg-light)', borderRadius: '16px',
                                padding: '1rem 1.25rem', display: 'flex',
                                alignItems: 'center', border: '2px solid var(--border-light)',
                                marginBottom: '1.5rem'
                            }}>
                                <div style={{ paddingRight: '0.75rem', color: '#9CA3AF' }}>
                                    <Gauge size={28} />
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    value={kmEnd}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '' || parseFloat(val) >= 0) {
                                            setKmEnd(val);
                                        }
                                    }}
                                    placeholder="0"
                                    autoFocus
                                    style={{
                                        border: 'none', outline: 'none',
                                        fontSize: '1.75rem', fontWeight: '700',
                                        color: 'var(--text-dark)', width: '100%',
                                        background: 'transparent',
                                        letterSpacing: '0.05em'
                                    }}
                                />
                                <span style={{ color: 'var(--primary-red)', fontWeight: '700', fontSize: '1rem', whiteSpace: 'nowrap' }}>KM</span>
                            </div>

                            {trip?.km_start != null && kmEnd && parseFloat(kmEnd) >= trip.km_start && (
                                <div style={{
                                    background: '#FFF7ED', borderRadius: '12px',
                                    padding: '0.75rem 1rem', marginBottom: '1.5rem',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <span style={{ color: '#92400E', fontWeight: '600', fontSize: '0.85rem' }}>Distancia recorrida</span>
                                    <span style={{ color: 'var(--primary-red)', fontWeight: '800', fontSize: '1.1rem' }}>
                                        {(parseFloat(kmEnd) - trip.km_start).toLocaleString('es-PE')} km
                                    </span>
                                </div>
                            )}

                            <button
                                onClick={handleFinishTrip}
                                disabled={finishing || !kmEnd.trim() || sustentoPhotos.length === 0}
                                style={{
                                    width: '100%',
                                    background: (kmEnd.trim() && !finishing && sustentoPhotos.length > 0) ? 'var(--primary-gradient)' : '#E5E7EB',
                                    color: (kmEnd.trim() && !finishing && sustentoPhotos.length > 0) ? 'white' : '#9CA3AF',
                                    border: 'none', padding: '1rem',
                                    borderRadius: '16px', fontWeight: '800',
                                    fontSize: '1rem', cursor: (kmEnd.trim() && !finishing && sustentoPhotos.length > 0) ? 'pointer' : 'not-allowed',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    boxShadow: (kmEnd.trim() && sustentoPhotos.length > 0) ? 'var(--shadow-red)' : 'none'
                                }}
                            >
                                <CheckCircle size={22} />
                                {finishing ? 'FINALIZANDO...' : 'CONFIRMAR Y FINALIZAR'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Sustento Photo Confirmation */}
            {
                pendingSustentoPhoto && (
                    <PhotoConfirmModal
                        photoSrc={pendingSustentoPhoto}
                        title="Foto de Sustento"
                        subtitle="Verifique que la foto sea legible antes de confirmar."
                        confirmLabel={uploadingSustento ? 'Subiendo...' : 'Confirmar Foto'}
                        onConfirm={handleSustentoConfirm}
                        onRetake={() => { setPendingSustentoPhoto(null); sustentoFileRef.current?.click(); }}
                    />
                )
            }
        </>
    );
};

export default ActiveTrip;
