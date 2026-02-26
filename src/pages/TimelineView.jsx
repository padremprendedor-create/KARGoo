import React, { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout';
import { supabase } from '../supabaseClient';

// ── Constants ──────────────────────────────────────────────────────
const COLORS = {
    viaje: '#22C55E',
    inactivo: '#D1D5DB',
    mantenimiento: '#F97316',
    inicio: '#3B82F6',
    fin: '#3B82F6',
};

// ── Helpers ────────────────────────────────────────────────────────
const getShiftConfig = (shift) => {
    if (shift === 'afternoon') {
        return { startHour: 18, endHour: 30, rangeHours: 12, isAfternoon: true };
    }
    return { startHour: 6, endHour: 18, rangeHours: 12, isAfternoon: false };
};

const getHoursArray = (startHour, rangeHours) => {
    return Array.from({ length: rangeHours + 1 }, (_, i) => {
        let h = startHour + i;
        if (h >= 24) h -= 24;
        return `${String(h).padStart(2, '0')}:00`;
    });
};

const timeToDecimal = (t, isAfternoon) => {
    const [h, m] = t.split(':').map(Number);
    let decimal = h + m / 60;
    if (isAfternoon && decimal < 18) {
        decimal += 24;
    }
    return decimal;
};

const pct = (decimal, startHour, rangeHours) => ((decimal - startHour) / rangeHours) * 100;
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

const formatDec = (dec) => {
    let h = Math.floor(dec);
    if (h >= 24) h -= 24; // Handle 30 -> 06
    const m = Math.round((dec - Math.floor(dec)) * 60);
    let finalH = h;
    let finalM = m;
    if (m === 60) {
        finalH = (h + 1) % 24;
        finalM = 0;
    }
    return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
};

/**
 * Convert a UTC timestamp to a local HH:MM string
 */
const timestampToLocal = (ts) => {
    const d = new Date(ts);
    const h = d.getHours();
    const m = d.getMinutes();
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Build activity segments for a single driver from their trips and maintenance logs.
 */
const buildDriverTimeline = (trips, activities, shiftConfig) => {
    const segments = [];

    // Add trip segments (viaje)
    trips.forEach((trip) => {
        if (!trip.start_time) return;
        const startLocal = timestampToLocal(trip.start_time);
        const endLocal = trip.end_time ? timestampToLocal(trip.end_time) : null;

        segments.push({
            type: 'viaje',
            start: startLocal,
            end: endLocal || formatDec(shiftConfig.endHour), // if still in progress, extend to range end
            tripStatus: trip.status,
            origin: trip.origin,
            destination: trip.destination,
        });
    });

    // Add maintenance / inactivo segments
    activities.forEach((act) => {
        if (!act.start_time) return;
        const startLocal = timestampToLocal(act.start_time);
        const endLocal = act.end_time ? timestampToLocal(act.end_time) : null;

        segments.push({
            type: act.type,
            start: startLocal,
            end: endLocal || formatDec(shiftConfig.endHour), // still active
            reason: act.reason || '',
        });
    });

    // Sort by start time relative to shift
    segments.sort((a, b) => timeToDecimal(a.start, shiftConfig.isAfternoon) - timeToDecimal(b.start, shiftConfig.isAfternoon));

    return segments;
};

// ── Sub-components ──────────────────────────────────────────────────

const MaintenancePopup = ({ activity }) => (
    <div
        style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1F2937',
            color: '#fff',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
            zIndex: 20,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}
    >
        <div style={{ fontWeight: 600 }}>Mantenimiento: {activity.reason || 'Sin motivo'}</div>
        <div style={{ color: '#D1D5DB', marginTop: '2px' }}>
            Hora: {activity.start} – {activity.end}
        </div>
        <div
            style={{
                position: 'absolute',
                bottom: '-5px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '6px solid #1F2937',
            }}
        />
    </div>
);

const ActivityBlock = ({ activity, shiftConfig }) => {
    const [hover, setHover] = useState(false);

    const startDec = clamp(timeToDecimal(activity.start, shiftConfig.isAfternoon), shiftConfig.startHour, shiftConfig.endHour);
    const endDec = clamp(timeToDecimal(activity.end, shiftConfig.isAfternoon), shiftConfig.startHour, shiftConfig.endHour);
    const leftPct = pct(startDec, shiftConfig.startHour, shiftConfig.rangeHours);
    let widthPct = pct(endDec, shiftConfig.startHour, shiftConfig.rangeHours) - leftPct;

    if (widthPct <= 0) return null;

    const isMaint = activity.type === 'mantenimiento';

    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            title={
                isMaint
                    ? `Mantenimiento: ${activity.reason || 'Sin motivo'} | ${activity.start} - ${activity.end}`
                    : `${activity.type === 'viaje' ? 'En Viaje' : 'Inactivo'}: ${activity.start} - ${activity.end}`
            }
            style={{
                position: 'absolute',
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                minWidth: '4px',
                height: '100%',
                background: COLORS[activity.type] || '#D1D5DB',
                borderRadius: '4px',
                cursor: isMaint ? 'pointer' : 'default',
                transition: 'filter 0.15s ease',
                filter: hover && isMaint ? 'brightness(1.1)' : 'none',
                zIndex: isMaint ? 3 : 1,
            }}
        >
            {isMaint && hover && <MaintenancePopup activity={activity} />}
        </div>
    );
};

const ShiftMarker = ({ label, timeDec, isOvertime, shiftConfig, isStaggered }) => {
    if (isOvertime) {
        return (
            <div
                style={{
                    position: 'absolute',
                    right: 0,
                    top: '-22px',
                    background: '#1F2937',
                    color: '#fff',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                }}
            >
                Fin: {formatDec(timeDec)}
            </div>
        );
    }

    const leftPct = pct(clamp(timeDec, shiftConfig.startHour, shiftConfig.endHour), shiftConfig.startHour, shiftConfig.rangeHours);
    return (
        <div
            style={{
                position: 'absolute',
                left: `${leftPct}%`,
                top: isStaggered ? '-48px' : '-24px',
                transform: 'translateX(-50%)',
                background: COLORS.inicio,
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 10px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
                zIndex: 10,
            }}
        >
            {label}
        </div>
    );
};

const DriverRow = ({ driver, segments, shiftConfig }) => {
    const getShiftBounds = (segs) => {
        if (segs.length === 0) return null;
        const starts = segs.map((s) => timeToDecimal(s.start, shiftConfig.isAfternoon));
        const ends = segs.map((s) => timeToDecimal(s.end, shiftConfig.isAfternoon));
        return {
            shiftStartDec: Math.min(...starts),
            shiftEndDec: Math.max(...ends),
        };
    };

    const bounds = getShiftBounds(segments);
    const HOURS = getHoursArray(shiftConfig.startHour, shiftConfig.rangeHours);

    if (!bounds) {
        // No activity
        return (
            <div style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                        style={{
                            width: '80px',
                            flexShrink: 0,
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            color: '#1F2937',
                            textAlign: 'right',
                        }}
                    >
                        {driver.full_name}
                    </div>
                    <div style={{ flex: 1, position: 'relative', paddingTop: '28px' }}>
                        <div
                            style={{
                                position: 'relative',
                                width: '100%',
                                height: '32px',
                                background: '#F3F4F6',
                                borderRadius: '6px',
                            }}
                        />
                        {/* Time axis */}
                        <div style={{ position: 'relative', width: '100%', height: '20px', marginTop: '4px' }}>
                            {HOURS.map((label, i) => (
                                <span
                                    key={label}
                                    style={{
                                        position: 'absolute',
                                        left: `${(i / shiftConfig.rangeHours) * 100}%`,
                                        transform: 'translateX(-50%)',
                                        fontSize: '0.65rem',
                                        color: '#9CA3AF',
                                        userSelect: 'none',
                                    }}
                                >
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const { shiftStartDec, shiftEndDec } = bounds;
    const isOvertime = shiftEndDec > shiftConfig.endHour;

    return (
        <div style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div
                    style={{
                        width: '80px',
                        flexShrink: 0,
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: '#1F2937',
                        textAlign: 'right',
                    }}
                >
                    {driver.full_name}
                </div>

                <div style={{ flex: 1, position: 'relative', paddingTop: '28px' }}>
                    <ShiftMarker label="Inicio" timeDec={shiftStartDec} shiftConfig={shiftConfig} />
                    <ShiftMarker
                        label="Fin"
                        timeDec={shiftEndDec}
                        isOvertime={isOvertime}
                        shiftConfig={shiftConfig}
                        isStaggered={!isOvertime && (shiftEndDec - shiftStartDec) < 0.5}
                    />

                    <div
                        style={{
                            position: 'relative',
                            width: '100%',
                            height: '32px',
                            background: '#F3F4F6',
                            borderRadius: '6px',
                            overflow: 'visible',
                        }}
                    >
                        {segments.map((act, i) => (
                            <ActivityBlock key={i} activity={act} shiftConfig={shiftConfig} />
                        ))}

                        {/* Blue line at shift start */}
                        <div
                            style={{
                                position: 'absolute',
                                left: `${pct(clamp(shiftStartDec, shiftConfig.startHour, shiftConfig.endHour), shiftConfig.startHour, shiftConfig.rangeHours)}%`,
                                top: 0,
                                width: '4px',
                                height: '100%',
                                background: COLORS.inicio,
                                borderRadius: '2px',
                                zIndex: 5,
                            }}
                        />
                        {/* Blue line at shift end */}
                        {!isOvertime ? (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: `${pct(clamp(shiftEndDec, shiftConfig.startHour, shiftConfig.endHour), shiftConfig.startHour, shiftConfig.rangeHours)}%`,
                                    top: 0,
                                    width: '4px',
                                    height: '100%',
                                    background: COLORS.fin,
                                    borderRadius: '2px',
                                    zIndex: 5,
                                    transform: 'translateX(-4px)',
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 0,
                                    width: '4px',
                                    height: '100%',
                                    background: COLORS.fin,
                                    borderRadius: '2px',
                                    zIndex: 5,
                                }}
                            />
                        )}
                    </div>

                    {/* Time axis */}
                    <div style={{ position: 'relative', width: '100%', height: '20px', marginTop: '4px' }}>
                        {HOURS.map((label, i) => (
                            <span
                                key={label}
                                style={{
                                    position: 'absolute',
                                    left: `${(i / shiftConfig.rangeHours) * 100}%`,
                                    transform: 'translateX(-50%)',
                                    fontSize: '0.65rem',
                                    color: '#9CA3AF',
                                    userSelect: 'none',
                                }}
                            >
                                {label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const LegendItem = ({ color, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <span
            style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '3px',
                background: color,
            }}
        />
        <span style={{ fontSize: '0.8rem', color: '#4B5563', fontWeight: 500 }}>{label}</span>
    </div>
);

// ── Main Component ──────────────────────────────────────────────────
const TimelineView = () => {
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);
    const [selectedShift, setSelectedShift] = useState('morning');
    const [drivers, setDrivers] = useState([]);
    const [tripsMap, setTripsMap] = useState({});
    const [activitiesMap, setActivitiesMap] = useState({});
    const [loading, setLoading] = useState(true);

    const shiftConfig = getShiftConfig(selectedShift);

    const getDateRange = useCallback(() => {
        const dStart = new Date(`${selectedDate}T00:00:00`);

        // For morning: today 06:00 to 18:00
        // For afternoon: today 18:00 to next day 06:00
        const dayStart = new Date(dStart.getTime());
        dayStart.setHours(shiftConfig.startHour, 0, 0, 0);

        const dayEnd = new Date(dStart.getTime());
        dayEnd.setHours(shiftConfig.endHour, 0, 0, 0);

        return { dayStart: dayStart.toISOString(), dayEnd: dayEnd.toISOString() };
    }, [selectedDate, shiftConfig.startHour, shiftConfig.endHour]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { dayStart, dayEnd } = getDateRange();

        const { data: driverData } = await supabase
            .from('profiles')
            .select('id, full_name, username')
            .eq('role', 'driver')
            .order('full_name');

        setDrivers(driverData || []);

        const { data: tripData } = await supabase
            .from('trips')
            .select('id, driver_id, status, start_time, end_time, origin, destination')
            .lt('start_time', dayEnd)
            .or(`end_time.gt.${dayStart},end_time.is.null`)
            .in('status', ['in_progress', 'completed', 'approved']);

        const tMap = {};
        (tripData || []).forEach((t) => {
            if (!tMap[t.driver_id]) tMap[t.driver_id] = [];
            tMap[t.driver_id].push(t);
        });
        setTripsMap(tMap);

        const { data: actData } = await supabase
            .from('driver_activities')
            .select('id, driver_id, type, reason, start_time, end_time')
            .lt('start_time', dayEnd)
            .or(`end_time.gt.${dayStart},end_time.is.null`);

        const aMap = {};
        (actData || []).forEach((a) => {
            if (!aMap[a.driver_id]) aMap[a.driver_id] = [];
            aMap[a.driver_id].push(a);
        });
        setActivitiesMap(aMap);

        setLoading(false);
    }, [getDateRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const channel = supabase
            .channel('timeline-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_activities' }, () => fetchData())
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [fetchData]);

    return (
        <AdminLayout>
            <div style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 700, color: 'var(--text-dark)' }}>Timeline</h1>
                        <p style={{ color: 'var(--text-light)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>Visualiza el estado y actividad de los conductores en tiempo real.</p>
                    </div>
                    <button
                        onClick={() => window.location.href = '/admin/drivers'}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.25rem', background: 'var(--primary-red)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', boxShadow: 'var(--shadow-md)' }}
                    >
                        <Plus size={18} /> Nuevo Conductor
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-dark)', whiteSpace: 'nowrap' }}>Filtrar por Turno:</label>
                        <select
                            value={selectedShift}
                            onChange={(e) => setSelectedShift(e.target.value)}
                            style={{ padding: '0.55rem 2rem 0.55rem 0.85rem', borderRadius: '10px', border: '1px solid #E5E7EB', background: 'white', fontSize: '0.85rem', cursor: 'pointer', outline: 'none', color: 'var(--text-dark)', fontWeight: 500 }}
                        >
                            <option value="morning">Mañana (6:00 - 18:00)</option>
                            <option value="afternoon">Tarde (18:00 - 06:00)</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-dark)', whiteSpace: 'nowrap' }}>Fecha:</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{ padding: '0.55rem 0.85rem', borderRadius: '10px', border: '1px solid #E5E7EB', background: 'white', fontSize: '0.85rem', cursor: 'pointer', outline: 'none', color: 'var(--text-dark)', fontWeight: 500 }}
                        />
                    </div>

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <LegendItem color={COLORS.inicio} label="Inicio/Fin Jornada" />
                        <LegendItem color={COLORS.viaje} label="En Viaje" />
                        <LegendItem color={COLORS.inactivo} label="Inactivo" />
                        <LegendItem color={COLORS.mantenimiento} label="Mantenimiento" />
                    </div>
                </div>

                <div style={{ background: 'white', borderRadius: '16px', boxShadow: 'var(--shadow-md)', padding: '1.75rem 2rem 1.25rem', overflowX: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-light)' }}>Cargando datos del timeline...</div>
                    ) : drivers.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-light)' }}>No hay conductores registrados.</div>
                    ) : (
                        <div style={{ minWidth: '700px' }}>
                            {drivers.map((driver) => {
                                const driverTrips = tripsMap[driver.id] || [];
                                const driverActs = activitiesMap[driver.id] || [];
                                const segments = buildDriverTimeline(driverTrips, driverActs, shiftConfig);
                                return <DriverRow key={driver.id} driver={driver} segments={segments} shiftConfig={shiftConfig} />;
                            })}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default TimelineView;
