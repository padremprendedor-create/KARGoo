import React, { useEffect, useState } from 'react';
import { X, MapPin, Calendar, Truck, User, Clock, Package, Scale, Image as ImageIcon, FileText } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import Button from '../ui/Button';

const TripDetailsModal = ({ isOpen, onClose, tripId }) => {
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [photoUrl, setPhotoUrl] = useState(null);
    const [additionalDocs, setAdditionalDocs] = useState([]);
    const [additionalPhotoUrls, setAdditionalPhotoUrls] = useState({});

    useEffect(() => {
        if (isOpen && tripId) {
            fetchTripDetails();
        } else {
            setTrip(null);
            setPhotoUrl(null);
            setAdditionalDocs([]);
            setAdditionalPhotoUrls({});
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
            // Handle photo if exists
            const ticketPhoto = data.trip_photos?.find(p => p.photo_type === 'ticket');
            if (ticketPhoto?.photo_url) {
                downloadPhoto(ticketPhoto.photo_url);
            }
            const docs = data.trip_photos?.filter(p => p.photo_type === 'additional') || [];
            setAdditionalDocs(docs);
            if (docs.length > 0) downloadAdditionalPhotos(docs);
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
            let fp = doc.photo_url;
            if (fp.startsWith('http')) {
                const marker = '/object/public/trip-photos/';
                const idx = fp.indexOf(marker);
                if (idx !== -1) fp = fp.slice(idx + marker.length);
            }
            const { data, error } = await supabase.storage.from('trip-photos').download(fp);
            if (!error) urls[doc.id] = URL.createObjectURL(data);
        }
        setAdditionalPhotoUrls(urls);
    };

    // Helper functions
    const formatDateTime = (dateString) => {
        if (!dateString) return '---';
        return new Date(dateString).toLocaleDateString('es-PE', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const calcDuration = () => {
        if (!trip?.start_time) return '---';
        const start = new Date(trip.start_time).getTime();
        const end = trip.end_time ? new Date(trip.end_time).getTime() : Date.now();
        const diff = Math.max(0, end - start);
        const hrs = String(Math.floor(diff / 3600000)).padStart(2, '0');
        const mins = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
        return `${hrs}h ${mins}m`;
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'in_progress':
                return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold uppercase">En Curso</span>;
            case 'completed':
                return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold uppercase">Completado</span>;
            default:
                return <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-bold uppercase">Pendiente</span>;
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60
        }}>
            <div style={{
                background: 'white', borderRadius: '16px', width: '100%', maxWidth: '700px',
                maxHeight: '90vh', overflowY: 'auto', padding: '0',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem', borderBottom: '1px solid #E5E7EB',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#F9FAFB', borderTopLeftRadius: '16px', borderTopRightRadius: '16px'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>
                            Detalles del Viaje #{tripId}
                        </h2>
                        {!loading && trip && (
                            <div className="mt-1">{getStatusBadge(trip.status)}</div>
                        )}
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
                        <X size={24} />
                    </button>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Cargando información...</div>
                ) : !trip ? (
                    <div className="p-8 text-center text-red-500">No se pudo cargar la información del viaje.</div>
                ) : (
                    <div style={{ padding: '2rem' }}>

                        {/* Ruta */}
                        <div className="mb-8">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Ruta</h3>
                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="flex-1">
                                    <div className="text-xs text-gray-500 mb-1">Origen</div>
                                    <div className="font-bold text-gray-900 flex items-center gap-2">
                                        <MapPin size={16} className="text-orange-500" />
                                        {trip.origin}
                                    </div>
                                </div>
                                <div className="text-gray-300">→</div>
                                <div className="flex-1">
                                    <div className="text-xs text-gray-500 mb-1">Destino</div>
                                    <div className="font-bold text-gray-900 flex items-center gap-2">
                                        <MapPin size={16} className="text-orange-500" />
                                        {trip.destination}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Info General Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

                            {/* Conductor y Vehículo */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Conductor y Vehículo</h3>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-orange-50 p-2 rounded-lg text-orange-500"><User size={20} /></div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{trip.profiles?.full_name || 'Sin asignar'}</div>
                                            <div className="text-xs text-gray-500">{trip.profiles?.phone || 'Sin teléfono'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="bg-blue-50 p-2 rounded-lg text-blue-500"><Truck size={20} /></div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{trip.vehicle_plate}</div>
                                            <div className="text-xs text-gray-500">Placa del Vehículo</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tiempos */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Tiempos</h3>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-gray-50 p-2 rounded-lg text-gray-500"><Calendar size={20} /></div>
                                        <div>
                                            <div className="text-xs text-gray-500">Creado</div>
                                            <div className="text-sm font-medium text-gray-900">{formatDateTime(trip.created_at)}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="bg-green-50 p-2 rounded-lg text-green-500"><Clock size={20} /></div>
                                        <div>
                                            <div className="text-xs text-gray-500">Inicio</div>
                                            <div className="text-sm font-medium text-gray-900">{trip.start_time ? formatDateTime(trip.start_time) : 'No iniciado'}</div>
                                        </div>
                                    </div>
                                    {trip.end_time && (
                                        <div className="flex items-start gap-3">
                                            <div className="bg-red-50 p-2 rounded-lg text-red-500"><Clock size={20} /></div>
                                            <div>
                                                <div className="text-xs text-gray-500">Fin</div>
                                                <div className="text-sm font-medium text-gray-900">{formatDateTime(trip.end_time)}</div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-start gap-3">
                                        <div className="bg-purple-50 p-2 rounded-lg text-purple-500"><Clock size={20} /></div>
                                        <div>
                                            <div className="text-xs text-gray-500">Duración</div>
                                            <div className="text-sm font-medium text-gray-900">{calcDuration()}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Carga Details */}
                        <div className="mb-8 border-t border-gray-100 pt-6">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Detalles de Carga</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-center">
                                    <div className="flex items-center gap-2 mb-2 text-gray-500">
                                        <Scale size={18} /> <span className="text-xs font-semibold tracking-wide">PESO TOTAL REGISTRADO</span>
                                    </div>
                                    <div className="font-black text-2xl text-gray-800">
                                        {trip.weight ? `${Number(trip.weight).toLocaleString('es-PE')} kg` : '—'}
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-center">
                                    <div className="flex items-center gap-2 mb-2 text-gray-500">
                                        <Truck size={18} /> <span className="text-xs font-semibold tracking-wide">DISTANCIA RECORRIDA</span>
                                    </div>
                                    <div className="font-black text-2xl text-gray-800">
                                        {trip.km_end && trip.km_start ? `${(trip.km_end - trip.km_start).toLocaleString('es-PE')} km` : '—'}
                                    </div>
                                </div>
                            </div>

                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contenedores ({trip.trip_containers?.length || 0})</h4>
                            {trip.trip_containers && trip.trip_containers.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {trip.trip_containers.map((container, idx) => (
                                        <div key={container.id || idx} className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex items-center gap-3">
                                            <div className="bg-white p-2 rounded shadow-sm text-orange-500">
                                                <Package size={18} />
                                            </div>
                                            <div>
                                                <div className="text-[0.65rem] font-bold text-orange-600 uppercase">Contenedor {idx + 1}</div>
                                                <div className="font-bold text-gray-900">{container.container_number}</div>
                                                <div className="text-[0.65rem] font-semibold text-gray-500 mt-1 flex gap-2">
                                                    {container.dimension && <span className="bg-white px-1.5 py-0.5 rounded border border-orange-100">{container.dimension}'</span>}
                                                    {container.condition && <span className="bg-white px-1.5 py-0.5 rounded border border-orange-100">{container.condition}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center text-gray-500 text-sm">
                                    No hay contenedores registrados.
                                </div>
                            )}
                        </div>

                        {photoUrl && (
                            <div className="border-t border-gray-100 pt-6">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <ImageIcon size={18} /> Ticket de Pesaje
                                </h3>
                                <div className="bg-gray-100 rounded-lg overflow-hidden border border-gray-200" style={{ maxWidth: '300px' }}>
                                    <img src={photoUrl} alt="Ticket" className="w-full h-auto object-cover" />
                                </div>
                            </div>
                        )}

                        {/* Additional Documents */}
                        {additionalDocs.length > 0 && (
                            <div className="border-t border-gray-100 pt-6 mt-6">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <FileText size={18} /> Documentos Adicionales ({additionalDocs.length})
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                    {additionalDocs.map(doc => (
                                        <div key={doc.id} style={{
                                            borderRadius: '10px', overflow: 'hidden',
                                            border: '1px solid #E5E7EB', background: '#F9FAFB'
                                        }}>
                                            {additionalPhotoUrls[doc.id] && (
                                                <img
                                                    src={additionalPhotoUrls[doc.id]}
                                                    alt={doc.description || 'Documento'}
                                                    style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }}
                                                />
                                            )}
                                            <div style={{ padding: '8px 10px' }}>
                                                <p style={{ fontSize: '0.8rem', fontWeight: '600', color: '#374151', margin: 0 }}>
                                                    {doc.description || 'Sin descripción'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
                    <Button onClick={onClose} variant="primary">Cerrar</Button>
                </div>
            </div>
        </div>
    );
};

export default TripDetailsModal;
