import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, MapPin, Truck, Camera, CheckCircle, HelpCircle, Gauge, X, Image, Plus, Package, Navigation } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, Autocomplete } from '@react-google-maps/api';
import Card from '../components/ui/Card';
import PhotoConfirmModal from '../components/PhotoConfirmModal';
import CameraCapture from '../components/CameraCapture';
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

    // Relay (Relevo) state
    const [showRelayModal, setShowRelayModal] = useState(false);
    const [relayPin, setRelayPin] = useState('');
    const [relaying, setRelaying] = useState(false);

    // Sustento photos (1-3)
    const [sustentoPhotos, setSustentoPhotos] = useState([]);
    const [uploadingSustento, setUploadingSustento] = useState(false);
    const [pendingSustentoPhoto, setPendingSustentoPhoto] = useState(null); // data URL for confirmation
    const [showCamera, setShowCamera] = useState(false);

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
    // Step 1: Photo captured from in-app camera
    const handleSustentoPhotoCaptured = (imageData) => {
        if (sustentoPhotos.length >= 3) {
            alert('Máximo 3 fotos de sustento');
            setShowCamera(false);
            return;
        }
        setPendingSustentoPhoto(imageData);
        setShowCamera(false);
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

            // Log interaction
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('driver_interactions').insert({
                    driver_id: user.id,
                    interaction_type: 'photo',
                    description: 'Subió foto de sustento'
                });
            }
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

        // Get user once for both logs
        const { data: { user } } = await supabase.auth.getUser();

        // Log mileage for trip_end
        if (trip?.vehicle_plate) {
            const { error: mileageErr } = await supabase.from('vehicle_mileage_logs').insert({
                vehicle_plate: trip.vehicle_plate,
                driver_id: user?.id || null, // Fetched above
                mileage: kmEndVal,
                event_type: 'trip_end'
            });
            if (mileageErr) console.warn('Mileage log failed for trip end:', mileageErr.message);
        }

        // Log interaction
        if (user) {
            await supabase.from('driver_interactions').insert({
                driver_id: user.id,
                interaction_type: 'trip_end',
                description: 'Finalizó viaje'
            });
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

    const handleRelayTrip = async () => {
        if (!relayPin || relayPin.length !== 3 || !/^\d{3}$/.test(relayPin)) {
            alert('Ingrese una clave de seguridad válida de 3 dígitos');
            return;
        }

        setRelaying(true);
        const { error } = await supabase
            .from('trips')
            .update({
                status: 'relevado',
                relay_pin: relayPin,
            })
            .eq('id', parseInt(id));

        if (error) {
            console.error('Error in relay trip:', error);
            alert(`Error al registrar relevo: ${error.message}`);
            setRelaying(false);
            return;
        }

        // Log interaction
        const { data: { authUser } } = await supabase.auth.getUser();
        if (authUser) {
            await supabase.from('driver_interactions').insert({
                driver_id: authUser.id,
                interaction_type: 'relay',
                description: 'Entregó viaje en relevo'
            });
        }

        setShowRelayModal(false);
        navigate('/driver');
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

                        {/* Badges: Service Type & Cargo Type & Plate */}
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
                            {trip.vehicle_plate && (
                                <span style={{
                                    background: '#FEF3C7', color: '#D97706', padding: '0.4rem 1rem',
                                    borderRadius: '10px', fontSize: '0.85rem', fontWeight: '900', textTransform: 'uppercase',
                                    border: '1px solid #FDE68A', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                    Placa: {trip.vehicle_plate}
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
                                            background: 'var(--bg-light)',
                                            border: '1px solid var(--border-light)',
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
                                        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="18" fill="#EF4444" stroke="white" stroke-width="2" /><circle cx="24" cy="24" r="24" fill="#EF4444" fill-opacity="0.2" /><svg x="12" y="12" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg></svg>')}`,
                                        scaledSize: new window.google.maps.Size(48, 48),
                                        anchor: new window.google.maps.Point(24, 24)
                                    }} />

                                    {/* Ruta trazada si existe destino */}
                                    {routePolyline && (
                                        <Polyline
                                            path={routePolyline}
                                            options={{
                                                strokeColor: "#EF4444",
                                                strokeOpacity: 1,
                                                strokeWeight: 6
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
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                <MapPin size={20} color="var(--primary-red)" fill="var(--primary-red)" style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {trip?.destination || 'Destino...'}
                                </span>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (destinationCoords) {
                                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${destinationCoords.lat},${destinationCoords.lng}&travelmode=driving`, '_blank');
                                    } else if (trip?.destination) {
                                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(trip.destination)}&travelmode=driving`, '_blank');
                                    }
                                }}
                                style={{
                                    background: '#3B82F6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '0.5rem 0.75rem',
                                    fontSize: '0.75rem',
                                    fontWeight: '800',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                                }}
                            >
                                <Navigation size={14} /> Navegar
                            </button>
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
                            <button
                                onClick={() => setShowCamera(true)}
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
                        )}
                    </Card>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={() => setShowRelayModal(true)}
                                disabled={finishing || relaying}
                                style={{
                                    flex: 1,
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-dark)',
                                    border: '2px solid var(--border-light)',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    fontWeight: '800',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}>
                                <Truck size={22} /> Relevo
                            </button>
                            <button
                                onClick={() => navigate(`/driver/trip/${id}/weighing`)}
                                disabled={finishing || relaying}
                                style={{
                                    flex: 1,
                                    background: 'var(--bg-card)',
                                    color: 'var(--primary-red)',
                                    border: '2px solid var(--primary-red)',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    fontWeight: '800',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}>
                                <Camera size={22} /> Ticket
                            </button>
                        </div>
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
            {pendingSustentoPhoto && (
                <PhotoConfirmModal
                    photoSrc={pendingSustentoPhoto}
                    title="Foto de Sustento"
                    subtitle="Verifique que la foto sea legible antes de confirmar."
                    confirmLabel={uploadingSustento ? 'Subiendo...' : 'Confirmar Foto'}
                    onConfirm={handleSustentoConfirm}
                    onRetake={() => {
                        setPendingSustentoPhoto(null);
                        setShowCamera(true);
                    }}
                    onCancel={() => {
                        setPendingSustentoPhoto(null);
                    }}
                />
            )}

            {showCamera && (
                <CameraCapture
                    onCapture={handleSustentoPhotoCaptured}
                    onClose={() => setShowCamera(false)}
                    overlayText="Capture el Ticket de Sustento"
                />
            )}

            {/* Relay (Relevo) Modal */}
            {showRelayModal && (
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ background: '#F3F4F6', padding: '0.5rem', borderRadius: '10px' }}>
                                    <Truck size={24} color="#374151" />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-dark)', margin: 0 }}>Relevar Viaje</h3>
                            </div>
                            <button onClick={() => setShowRelayModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <p style={{ color: 'var(--text-medium)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                            Ingrese una <strong>clave de 3 dígitos</strong>. El conductor del siguiente turno necesitará esta clave para retomar el viaje.
                        </p>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Clave de Seguridad (3 dígitos)
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={3}
                                value={relayPin}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    if (val.length <= 3) setRelayPin(val);
                                }}
                                placeholder="***"
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    fontSize: '2rem',
                                    fontWeight: '800',
                                    textAlign: 'center',
                                    letterSpacing: '0.5rem',
                                    border: '2px solid var(--border-light)',
                                    borderRadius: '16px',
                                    outline: 'none',
                                    color: 'var(--text-dark)',
                                    background: '#F9FAFB',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--text-dark)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
                            />
                        </div>

                        <button
                            onClick={handleRelayTrip}
                            disabled={relaying || relayPin.length !== 3}
                            style={{
                                width: '100%',
                                background: relayPin.length === 3 ? 'var(--text-dark)' : '#E5E7EB',
                                color: relayPin.length === 3 ? 'white' : '#9CA3AF',
                                border: 'none', padding: '1rem',
                                borderRadius: '16px', fontWeight: '800',
                                fontSize: '1rem', cursor: relayPin.length === 3 ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                transition: 'all 0.2s',
                                boxShadow: relayPin.length === 3 ? '0 4px 12px rgba(0, 0, 0, 0.2)' : 'none'
                            }}
                        >
                            <CheckCircle size={22} />
                            {relaying ? 'PROCESANDO...' : 'CONFIRMAR RELEVO'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default ActiveTrip;
