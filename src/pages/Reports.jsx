import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, Gauge, Star, TrendingUp } from 'lucide-react';
import { supabase } from '../supabaseClient';

const MONTH_NAMES = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

const Reports = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [trips, setTrips] = useState([]);
    const [currentMonth] = useState(new Date().getMonth());
    const [currentYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchMonthTrips();
    }, []);

    const fetchMonthTrips = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/');

        const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

        const { data } = await supabase
            .from('trips')
            .select('*')
            .eq('driver_id', user.id)
            .eq('status', 'completed')
            .gte('end_time', startOfMonth)
            .lte('end_time', endOfMonth)
            .order('end_time', { ascending: true });

        setTrips(data || []);
        setLoading(false);
    };

    // === Computed Stats ===
    const totalTrips = trips.length;

    const totalKm = trips.reduce((sum, t) => {
        if (t.km_start != null && t.km_end != null) {
            return sum + (t.km_end - t.km_start);
        }
        return sum;
    }, 0);

    // Trips per week (S1-S4)
    const weeksData = [0, 0, 0, 0];
    trips.forEach(t => {
        const day = new Date(t.end_time).getDate();
        const week = Math.min(3, Math.floor((day - 1) / 7));
        weeksData[week]++;
    });
    const maxWeekTrips = Math.max(...weeksData, 1);

    // Route distribution
    const routeCounts = {};
    trips.forEach(t => {
        const route = `${t.origin} → ${t.destination}`;
        routeCounts[route] = (routeCounts[route] || 0) + 1;
    });
    const routeEntries = Object.entries(routeCounts).sort((a, b) => b[1] - a[1]);
    const topRoute = routeEntries[0];
    const topRoutePercent = totalTrips > 0 && topRoute ? Math.round((topRoute[1] / totalTrips) * 100) : 0;
    const otherPercent = 100 - topRoutePercent;

    // Average travel time
    const tripsWithTime = trips.filter(t => t.start_time && t.end_time);
    const avgTimeMs = tripsWithTime.length > 0
        ? tripsWithTime.reduce((sum, t) => sum + (new Date(t.end_time) - new Date(t.start_time)), 0) / tripsWithTime.length
        : 0;
    const avgHours = Math.floor(avgTimeMs / 3600000);
    const avgMins = Math.floor((avgTimeMs % 3600000) / 60000);

    // Average speed
    const tripsWithKmAndTime = trips.filter(t => t.km_start != null && t.km_end != null && t.start_time && t.end_time);
    const avgSpeed = tripsWithKmAndTime.length > 0
        ? tripsWithKmAndTime.reduce((sum, t) => {
            const km = t.km_end - t.km_start;
            const hours = (new Date(t.end_time) - new Date(t.start_time)) / 3600000;
            return sum + (hours > 0 ? km / hours : 0);
        }, 0) / tripsWithKmAndTime.length
        : 0;

    // Donut gradient
    const donutGradient = totalTrips > 0
        ? `conic-gradient(var(--primary-red) 0deg ${topRoutePercent * 3.6}deg, #E5E7EB ${topRoutePercent * 3.6}deg 360deg)`
        : 'conic-gradient(#E5E7EB 0deg 360deg)';

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-light)' }}>
                <div className="text-orange-500 font-medium">Cargando reportes...</div>
            </div>
        );
    }

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
                zIndex: 100,
                boxShadow: '0 2px 8px rgba(211, 47, 47, 0.3)'
            }}>
                <button
                    onClick={() => navigate('/driver')}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                    <ChevronLeft size={28} strokeWidth={2.5} />
                </button>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>Mis Reportes</h1>
            </div>

            <div style={{ padding: '1rem 1rem 0' }}>

                {/* === This Month Card === */}
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    boxShadow: 'var(--shadow-sm)',
                    marginBottom: '1rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-dark)', margin: 0 }}>Este Mes</h2>
                        <span style={{
                            background: 'var(--primary-red-light)',
                            color: 'var(--primary-red)',
                            padding: '0.3rem 0.75rem',
                            borderRadius: '999px',
                            fontSize: '0.65rem',
                            fontWeight: '800',
                            letterSpacing: '0.05em'
                        }}>
                            {MONTH_NAMES[currentMonth]}
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                                Total Viajes
                            </div>
                            <div style={{ fontSize: '2.25rem', fontWeight: '900', color: 'var(--text-dark)', lineHeight: 1 }}>
                                {totalTrips}
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                                Kms Recorridos
                            </div>
                            <div style={{ fontSize: '2.25rem', fontWeight: '900', color: 'var(--primary-red)', lineHeight: 1 }}>
                                {totalKm.toLocaleString('es-PE')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* === Trips per Week Chart === */}
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    boxShadow: 'var(--shadow-sm)',
                    marginBottom: '1rem'
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '1.25rem', margin: '0 0 1.25rem' }}>
                        Viajes por Semana
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', height: '120px' }}>
                        {weeksData.map((count, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '0.25rem' }}>
                                    {count}
                                </span>
                                <div style={{
                                    width: '100%',
                                    height: `${Math.max(8, (count / maxWeekTrips) * 100)}%`,
                                    background: i === 2
                                        ? 'var(--primary-gradient)'
                                        : 'var(--bg-light)',
                                    borderRadius: '8px',
                                    transition: 'height 0.5s ease'
                                }} />
                                <span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-light)', marginTop: '0.5rem' }}>
                                    S{i + 1}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* === Route Distribution === */}
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    boxShadow: 'var(--shadow-sm)',
                    marginBottom: '1rem'
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-dark)', margin: '0 0 1.25rem' }}>
                        Distribución de Rutas
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        {/* Donut */}
                        <div style={{
                            width: '110px',
                            height: '110px',
                            borderRadius: '50%',
                            background: donutGradient,
                            position: 'relative',
                            flexShrink: 0
                        }}>
                            <div style={{
                                position: 'absolute',
                                inset: '25%',
                                borderRadius: '50%',
                                background: 'var(--bg-card)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column'
                            }}>
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-light)', fontWeight: '600' }}>
                                    {topRoute ? topRoute[0].split('→')[0].trim().slice(0, 6) : '—'}
                                </span>
                            </div>
                        </div>

                        {/* Legend */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {topRoute && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--primary-red)' }} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-medium)' }}>
                                        {topRoute[0]} ({topRoutePercent}%)
                                    </span>
                                </div>
                            )}
                            {otherPercent > 0 && routeEntries.length > 1 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--bg-light)' }} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-medium)' }}>
                                        Otras Rutas ({otherPercent}%)
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* === Quick Stats === */}
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    boxShadow: 'var(--shadow-sm)',
                    marginBottom: '1rem'
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-dark)', margin: '0 0 1rem' }}>
                        Estadísticas Rápidas
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Avg Travel Time */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '36px', height: '36px',
                                    borderRadius: '10px',
                                    background: 'var(--bg-light)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Clock size={18} color="var(--text-light)" />
                                </div>
                                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-medium)' }}>Tiempo prom. viaje</span>
                            </div>
                            <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-dark)' }}>
                                {avgHours > 0 ? `${avgHours}h ` : ''}{avgMins}m
                            </span>
                        </div>

                        {/* Avg Speed */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '36px', height: '36px',
                                    borderRadius: '10px',
                                    background: 'var(--bg-light)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Gauge size={18} color="var(--text-light)" />
                                </div>
                                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-medium)' }}>Velocidad media</span>
                            </div>
                            <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-dark)' }}>
                                {Math.round(avgSpeed)} km/h
                            </span>
                        </div>

                        {/* Rating placeholder */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '36px', height: '36px',
                                    borderRadius: '10px',
                                    background: 'var(--bg-light)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Star size={18} color="var(--text-light)" />
                                </div>
                                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-medium)' }}>Calificación mes</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-dark)' }}>4.9</span>
                                <Star size={16} color="var(--primary-red)" fill="var(--primary-red)" />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Reports;
