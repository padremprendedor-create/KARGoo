import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, RefreshCw, Sun, Moon } from 'lucide-react';
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

// ── Night shift mock data (for validation) ─────────────────────────
const USE_MOCK = false;
const NIGHT_MOCK_DATA = [
    {
        id: 1, name: 'Junior', shiftStart: '18:00', shiftEnd: '05:00',
        activities: [
            { type: 'inactivo', start: '18:00', end: '18:30' },
            { type: 'viaje', start: '18:30', end: '22:00' },
            { type: 'mantenimiento', start: '22:00', end: '23:00', detail: 'Revisión de luces' },
            { type: 'viaje', start: '23:00', end: '05:00' },
        ],
    },
    {
        id: 2, name: 'Brian', shiftStart: '19:00', shiftEnd: '06:30',
        activities: [
            { type: 'viaje', start: '19:00', end: '01:00' },
            { type: 'inactivo', start: '01:00', end: '02:00' },
            { type: 'viaje', start: '02:00', end: '06:30' },
        ],
    },
];

// ── Helpers ────────────────────────────────────────────────────────
const getShiftConfig = (shift) => {
    if (shift === 'afternoon') {
        return { startHour: 18, endHour: 30, rangeHours: 12, isAfternoon: true, shiftStartStr: '18:00' };
    }
    return { startHour: 6, endHour: 18, rangeHours: 12, isAfternoon: false, shiftStartStr: '06:00' };
};

const getHoursArray = (startHour, rangeHours) => {
    return Array.from({ length: rangeHours + 1 }, (_, i) => {
        let h = startHour + i;
        if (h >= 24) h -= 24;
        return `${String(h).padStart(2, '0')}:00`;
    });
};

const timeToDecimal = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
};

const calculatePosition = (timeStr, shiftStartStr) => {
    let time = timeToDecimal(timeStr);
    let start = timeToDecimal(shiftStartStr);
    if (time < start) time += 24;
    return ((time - start) / 12) * 100;
};

const getActivityStyles = (activityStart, activityEnd, shiftStart) => {
    const leftPosition = calculatePosition(activityStart, shiftStart);
    const endPosition = calculatePosition(activityEnd, shiftStart);
    const widthPercentage = endPosition - leftPosition;
    return {
        left: `${Math.max(0, leftPosition)}%`,
        width: `${Math.min(100 - leftPosition, widthPercentage)}%`,
    };
};

// Legacy helpers (still used by some sub-components)
const timeToDecimalLegacy = (t, isAfternoon) => {
    const [h, m] = t.split(':').map(Number);
    let decimal = h + m / 60;
    if (isAfternoon && decimal < 18) decimal += 24;
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
 * Convert a UTC timestamp to a local HH:MM string in America/Lima
 */
const timestampToLocal = (ts) => {
    const d = typeof ts === 'string' ? new Date(ts) : ts;
    const options = { timeZone: 'America/Lima', hour12: false, hour: '2-digit', minute: '2-digit' };
    let timeStr = new Intl.DateTimeFormat('es-PE', options).format(d);
    // Node / some browsers might return "24:xx" instead of "00:xx"
    const parts = timeStr.split(':');
    if (parts[0] === '24') {
        timeStr = `00:${parts[1]}`;
    }
    return timeStr;
};

/**
 * Build activity segments for a single driver from their trips and maintenance logs.
 */
const buildDriverTimeline = (trips, activities, shiftConfig, dayStartStr, dayEndStr) => {
    const segments = [];
    const shiftStart = new Date(dayStartStr);
    const shiftEnd = new Date(dayEndStr);
    const now = new Date();

    // Add trip segments (viaje)
    trips.forEach((trip) => {
        if (!trip.start_time) return;
        const startObj = new Date(trip.start_time);
        const endObj = trip.end_time ? new Date(trip.end_time) : now;

        const effectiveStart = startObj < shiftStart ? shiftStart : startObj;
        const effectiveEnd = endObj > shiftEnd ? shiftEnd : endObj;

        // Skip if effectively out of bounds
        if (effectiveStart >= shiftEnd || effectiveEnd <= shiftStart) return;

        segments.push({
            type: 'viaje',
            start: timestampToLocal(effectiveStart),
            end: timestampToLocal(effectiveEnd),
            tripStatus: trip.status,
            origin: trip.origin,
            destination: trip.destination,
            rawStart: startObj,
            rawEnd: endObj
        });
    });

    // Add maintenance / inactivo segments
    activities.forEach((act) => {
        if (!act.start_time) return;
        const startObj = new Date(act.start_time);
        const endObj = act.end_time ? new Date(act.end_time) : now;

        const effectiveStart = startObj < shiftStart ? shiftStart : startObj;
        const effectiveEnd = endObj > shiftEnd ? shiftEnd : endObj;

        // Skip if effectively out of bounds
        if (effectiveStart >= shiftEnd || effectiveEnd <= shiftStart) return;

        segments.push({
            type: act.type,
            start: timestampToLocal(effectiveStart),
            end: timestampToLocal(effectiveEnd),
            reason: act.reason || '',
            photo_url: act.photo_url || null,
            rawStart: startObj,
            rawEnd: endObj
        });
    });

    // Sort by start time relative to shift
    segments.sort((a, b) => timeToDecimalLegacy(a.start, shiftConfig.isAfternoon) - timeToDecimalLegacy(b.start, shiftConfig.isAfternoon));

    return segments;
};

// ── Sub-components ──────────────────────────────────────────────────

const MaintenancePopup = ({ activity }) => {
    const [imgUrl, setImgUrl] = useState(null);

    useEffect(() => {
        if (activity.photo_url) {
            let isMounted = true;
            const fetchPhoto = async () => {
                try {
                    let fp = activity.photo_url;
                    if (fp.startsWith('http')) {
                        const marker = '/object/public/trip-photos/';
                        const idx = fp.indexOf(marker);
                        if (idx !== -1) fp = fp.slice(idx + marker.length);
                    }
                    const { data, error } = await supabase.storage.from('trip-photos').download(fp);
                    if (!error && isMounted) {
                        setImgUrl(URL.createObjectURL(data));
                    }
                } catch (e) {
                    console.error('Error downloading maintenance photo', e);
                }
            };
            fetchPhoto();
            return () => { isMounted = false; };
        }
    }, [activity.photo_url]);

    return (
        <div
            style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#1F2937',
                color: '#fff',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                zIndex: 50, // Higher z-index to stay above everything
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                minWidth: '150px'
            }}
        >
            <div style={{ fontWeight: 600, color: '#F97316' }}>Mantenimiento</div>
            <div style={{ fontWeight: 500, whiteSpace: 'pre-wrap', maxWidth: '200px' }}>{activity.reason || 'Sin motivo'}</div>
            <div style={{ color: '#9CA3AF', fontSize: '0.7rem', marginTop: '2px' }}>
                {activity.start} – {activity.end}
            </div>

            {imgUrl && (
                <div style={{ marginTop: '0.5rem', width: '200px', height: '140px', borderRadius: '4px', overflow: 'hidden', background: '#374151' }}>
                    <img src={imgUrl} alt="Evidencia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
            )}

            <div
                style={{
                    position: 'absolute',
                    bottom: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '7px solid transparent',
                    borderRight: '7px solid transparent',
                    borderTop: '7px solid #1F2937',
                }}
            />
        </div>
    );
};

const ActivityBlock = ({ activity, shiftConfig }) => {
    const [hover, setHover] = useState(false);

    const styles = getActivityStyles(activity.start, activity.end, shiftConfig.shiftStartStr);

    // Parse width percentage to hide effectively 0 blocks
    const widthPct = parseFloat(styles.width);
    if (widthPct <= 0) return null;

    const isMaint = activity.type === 'mantenimiento';

    // Calculate duration
    let durationStr = '';
    if (activity.rawStart && activity.rawEnd) {
        const diffMs = activity.rawEnd.getTime() - activity.rawStart.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        durationStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    }

    return (
        <>
            <div
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                title={
                    isMaint
                        ? `Mantenimiento: ${activity.reason || 'Sin motivo'} | ${activity.start} - ${activity.end} (${durationStr})`
                        : `${activity.type === 'viaje' ? 'En Viaje' : 'Inactivo'}: ${activity.start} - ${activity.end} (${durationStr})`
                }
                style={{
                    position: 'absolute',
                    left: styles.left,
                    width: styles.width,
                    minWidth: '4px',
                    height: '100%',
                    background: COLORS[activity.type] || '#D1D5DB',
                    borderRadius: '4px',
                    cursor: isMaint ? 'pointer' : 'default',
                    transition: 'filter 0.15s ease',
                    filter: hover && isMaint ? 'brightness(1.1)' : 'none',
                    zIndex: activity.type === 'viaje' ? 10 : isMaint ? 3 : 1,
                }}
            >
                {isMaint && hover && <MaintenancePopup activity={activity} />}
            </div>

            {/* Explicit duration text */}
            {widthPct >= 5 && durationStr && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: `${parseFloat(styles.left) + widthPct / 2}%`,
                    transform: 'translate(-50%, -50%)',
                    color: activity.type === 'inactivo' ? '#6B7280' : '#fff',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    textShadow: activity.type === 'inactivo' ? 'none' : '0 1px 3px rgba(0,0,0,0.5)',
                    opacity: 0.95,
                    zIndex: 12
                }}>
                    {durationStr}
                </div>
            )}
        </>
    );
};

const InteractionMark = ({ interaction, shiftConfig }) => {
    const [hover, setHover] = useState(false);
    const localTime = timestampToLocal(interaction.timestamp);
    const leftPct = calculatePosition(localTime, shiftConfig.shiftStartStr);

    if (leftPct < 0 || leftPct > 100) return null;

    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                position: 'absolute',
                left: `${leftPct}%`,
                top: 0,
                width: '3px',
                height: '100%',
                background: '#EF4444',
                zIndex: 11,
                transform: 'translateX(-50%)',
                cursor: 'pointer'
            }}
        >
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '-4px', width: '11px' }} />

            {hover && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 6px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#1F2937',
                        color: '#fff',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                        zIndex: 50,
                        pointerEvents: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.2rem'
                    }}
                >
                    <div style={{ fontWeight: 600, color: '#FCA5A5' }}>{interaction.description}</div>
                    <div style={{ color: '#9CA3AF', fontSize: '0.65rem' }}>{localTime}</div>
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
            )}
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
                    bottom: '-38px',
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
                bottom: isStaggered ? '-58px' : '-38px',
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

const DriverRow = ({ driver, segments, interactions, shiftConfig }) => {
    const getShiftBounds = (segs, ints) => {
        if (segs.length === 0 && (!ints || ints.length === 0)) return null;
        let starts = segs.map((s) => timeToDecimalLegacy(s.start, shiftConfig.isAfternoon));
        let ends = segs.map((s) => timeToDecimalLegacy(s.end, shiftConfig.isAfternoon));

        if (ints && ints.length > 0) {
            const intTimes = ints.map(i => timeToDecimalLegacy(timestampToLocal(i.timestamp), shiftConfig.isAfternoon));
            starts = starts.concat(intTimes);
            ends = ends.concat(intTimes);
        }

        return {
            shiftStartDec: Math.min(...starts),
            shiftEndDec: Math.max(...ends),
        };
    };

    const bounds = getShiftBounds(segments, interactions);
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
                    <div style={{ flex: 1, position: 'relative' }}>
                        <div
                            style={{
                                position: 'relative',
                                width: '100%',
                                height: '32px',
                                background: '#F3F4F6',
                                borderRadius: '6px',
                                overflow: 'hidden',
                            }}
                        >
                            {/* 15-minute guide lines */}
                            {Array.from({ length: 48 }, (_, i) => (
                                <div
                                    key={`guide-empty-${i}`}
                                    style={{
                                        position: 'absolute',
                                        left: `${(i / 48) * 100}%`,
                                        top: 0,
                                        height: '100%',
                                        borderLeft: i > 0 ? '1px solid rgba(209,213,219,0.3)' : 'none',
                                        zIndex: 0,
                                        pointerEvents: 'none',
                                    }}
                                />
                            ))}
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

                <div style={{ flex: 1, position: 'relative', paddingBottom: '44px' }}>

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
                        {/* 15-minute guide lines */}
                        {Array.from({ length: 48 }, (_, i) => (
                            <div
                                key={`guide-${i}`}
                                style={{
                                    position: 'absolute',
                                    left: `${(i / 48) * 100}%`,
                                    top: 0,
                                    height: '100%',
                                    borderLeft: i > 0 ? '1px solid rgba(209,213,219,0.3)' : 'none',
                                    zIndex: 0,
                                    pointerEvents: 'none',
                                }}
                            />
                        ))}

                        {segments.map((act, i) => (
                            <ActivityBlock key={i} activity={act} shiftConfig={shiftConfig} />
                        ))}

                        {(interactions || []).map((int, i) => (
                            <InteractionMark key={`int-${i}`} interaction={int} shiftConfig={shiftConfig} />
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

                        {/* Shift markers (below the track) */}
                        <ShiftMarker label="Inicio" timeDec={shiftStartDec} shiftConfig={shiftConfig} />
                        <ShiftMarker
                            label="Fin"
                            timeDec={shiftEndDec}
                            isOvertime={isOvertime}
                            shiftConfig={shiftConfig}
                            isStaggered={!isOvertime && (shiftEndDec - shiftStartDec) < 0.5}
                        />
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
    // Get today's date in Lima timezone (UTC-5)
    const getLimaDate = () => {
        const now = new Date();
        const limaStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(now); // YYYY-MM-DD
        return limaStr;
    };
    const [selectedDate, setSelectedDate] = useState(getLimaDate);
    const [selectedShift, setSelectedShift] = useState('morning');
    const [drivers, setDrivers] = useState([]);
    const [tripsMap, setTripsMap] = useState({});
    const [activitiesMap, setActivitiesMap] = useState({});
    const [interactionsMap, setInteractionsMap] = useState({});
    const [loading, setLoading] = useState(true);

    const shiftConfig = getShiftConfig(selectedShift);
    const isDark = selectedShift === 'afternoon';

    const handlePrevDay = () => {
        const d = new Date(selectedDate + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const handleNextDay = () => {
        const d = new Date(selectedDate + 'T12:00:00');
        d.setDate(d.getDate() + 1);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const handleToday = () => {
        setSelectedDate(getLimaDate());
        // Detect shift from current Lima hour
        const now = new Date();
        const limaHour = parseInt(
            new Intl.DateTimeFormat('en-US', { timeZone: 'America/Lima', hour12: false, hour: '2-digit' }).format(now),
            10
        );
        setSelectedShift(limaHour >= 6 && limaHour < 18 ? 'morning' : 'afternoon');
    };

    const getDateRange = useCallback(() => {
        // Lima is UTC-5.  Build ISO strings explicitly.
        // selectedDate is YYYY-MM-DD in Lima.
        const LIMA_OFFSET = 5; // hours behind UTC

        let startHour = shiftConfig.startHour; // 6 or 18
        let endHour = shiftConfig.endHour;       // 18 or 30

        // Convert Lima hours to UTC hours
        const startUtcH = startHour + LIMA_OFFSET;
        const endUtcH = endHour + LIMA_OFFSET;

        // Build dayStart in UTC
        const [y, m, d] = selectedDate.split('-').map(Number);
        const dayStart = new Date(Date.UTC(y, m - 1, d, startUtcH, 0, 0, 0));
        const dayEnd = new Date(Date.UTC(y, m - 1, d, endUtcH, 0, 0, 0));

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
            .select('id, driver_id, type, reason, photo_url, start_time, end_time')
            .lt('start_time', dayEnd)
            .or(`end_time.gt.${dayStart},end_time.is.null`);

        const aMap = {};
        (actData || []).forEach((a) => {
            if (!aMap[a.driver_id]) aMap[a.driver_id] = [];
            aMap[a.driver_id].push(a);
        });
        setActivitiesMap(aMap);

        const { data: interactionData } = await supabase
            .from('driver_interactions')
            .select('id, driver_id, interaction_type, description, timestamp')
            .gte('timestamp', dayStart)
            .lt('timestamp', dayEnd);

        const iMap = {};
        (interactionData || []).forEach((i) => {
            if (!iMap[i.driver_id]) iMap[i.driver_id] = [];
            iMap[i.driver_id].push(i);
        });
        setInteractionsMap(iMap);

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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_interactions' }, () => fetchData())
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
                    {/* Sun/Moon Toggle Switch */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                            onClick={() => setSelectedShift(selectedShift === 'morning' ? 'afternoon' : 'morning')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                position: 'relative',
                                width: '64px',
                                height: '32px',
                                borderRadius: '9999px',
                                cursor: 'pointer',
                                background: isDark ? '#334155' : '#E0E7FF',
                                transition: 'background 0.3s ease',
                                padding: '4px',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            title={isDark ? "Cambiar a Turno Mañana" : "Cambiar a Turno Noche"}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: isDark ? '#1E293B' : '#FFFFFF',
                                    position: 'absolute',
                                    left: isDark ? '36px' : '4px',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                }}
                            >
                                {isDark ? (
                                    <Moon size={14} color="#60A5FA" />
                                ) : (
                                    <Sun size={14} color="#F59E0B" />
                                )}
                            </div>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                            {isDark ? 'Turno Noche (18:00 - 06:00)' : 'Turno Mañana (06:00 - 18:00)'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-dark)', whiteSpace: 'nowrap' }}>Fecha:</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <button
                                onClick={handlePrevDay}
                                style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', transition: 'background 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                title="Día Anterior"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                style={{ padding: '0.55rem 0.85rem', borderRadius: '10px', border: '1px solid #E5E7EB', background: 'white', fontSize: '0.85rem', cursor: 'pointer', outline: 'none', color: 'var(--text-dark)', fontWeight: 500 }}
                            />
                            <button
                                onClick={handleNextDay}
                                style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', transition: 'background 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                title="Día Siguiente"
                            >
                                <ChevronRight size={20} />
                            </button>
                            <button
                                onClick={handleToday}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    padding: '0.45rem 0.85rem',
                                    borderRadius: '20px',
                                    border: '1px solid #E5E7EB',
                                    background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '0.8rem',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 6px rgba(59,130,246,0.35)',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.45)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(59,130,246,0.35)'; }}
                                title="Ir al día de hoy y detectar turno automáticamente"
                            >
                                <RefreshCw size={14} />
                                HOY
                            </button>
                        </div>
                    </div>

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <LegendItem color={COLORS.inicio} label="Inicio/Fin Jornada" />
                        <LegendItem color={COLORS.viaje} label="En Viaje" />
                        <LegendItem color={COLORS.inactivo} label="Inactivo" />
                        <LegendItem color={COLORS.mantenimiento} label="Mantenimiento" />
                    </div>
                </div>

                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: 'var(--shadow-md)',
                    padding: '1.75rem 2rem 1.25rem',
                    overflowX: 'auto',
                    transition: 'background 0.3s ease'
                }}>
                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-light)' }}>Cargando datos del timeline...</div>
                    ) : drivers.length === 0 && !USE_MOCK ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-light)' }}>No hay conductores registrados.</div>
                    ) : (
                        <div style={{ minWidth: '700px' }}>
                            {(() => {
                                const { dayStart, dayEnd } = getDateRange();

                                if (USE_MOCK && isDark) {
                                    return NIGHT_MOCK_DATA.map((driverData) => {
                                        // Convert mock activities to segments
                                        const segments = driverData.activities.map(act => ({
                                            type: act.type,
                                            start: act.start,
                                            end: act.end,
                                            reason: act.detail,
                                            tripStatus: act.type === 'viaje' ? 'completed' : null,
                                        }));
                                        const mockDriver = { full_name: driverData.name, id: driverData.id };
                                        return <DriverRow key={driverData.id} driver={mockDriver} segments={segments} interactions={[]} shiftConfig={shiftConfig} />;
                                    });
                                }

                                return drivers.map((driver) => {
                                    const driverTrips = tripsMap[driver.id] || [];
                                    const driverActs = activitiesMap[driver.id] || [];
                                    const driverInts = interactionsMap[driver.id] || [];
                                    const segments = buildDriverTimeline(driverTrips, driverActs, shiftConfig, dayStart, dayEnd);
                                    return <DriverRow key={driver.id} driver={driver} segments={segments} interactions={driverInts} shiftConfig={shiftConfig} />;
                                });
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default TimelineView;
