import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DriverDashboard from './DriverDashboard';
import { supabase } from '../supabaseClient';

// ─── Mock supabase (uses src/__mocks__/supabaseClient.js) ─────────────────────
vi.mock('../supabaseClient');

// ─── Mock react-router-dom ────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}));

// ─── Mock child components that are not under test ───────────────────────────
vi.mock('../components/SidebarDrawer', () => ({ default: () => null }));
vi.mock('../components/CameraCapture', () => ({
    default: ({ onCapture }) => (
        <button data-testid="mock-camera-capture" onClick={() => onCapture('data:image/jpeg;base64,FAKE')}>
            Tomar Foto
        </button>
    ),
}));
vi.mock('../components/PhotoConfirmModal', () => ({
    default: ({ onConfirm }) => (
        <div data-testid="mock-photo-modal">
            <button data-testid="confirm-btn" onClick={onConfirm}>Confirmar</button>
        </div>
    ),
}));

// ─── Mock global fetch (converts base64 → blob) ───────────────────────────────
global.fetch = vi.fn(() =>
    Promise.resolve({
        blob: () => Promise.resolve(new Blob(['x'], { type: 'image/jpeg' })),
    })
);

// ─── Mock window.alert ────────────────────────────────────────────────────────
global.alert = vi.fn();

// ─── Shared mock functions ────────────────────────────────────────────────────
const mockUpload = vi.fn();
const mockInsertDailyChecks = vi.fn();
const mockInsertInteractions = vi.fn();

// ─── Helper: build a chainable supabase.from() mock ──────────────────────────
function mockFromTable(table) {
    if (table === 'driver_daily_checks') {
        return { insert: mockInsertDailyChecks };
    }
    if (table === 'driver_interactions') {
        return { insert: mockInsertInteractions };
    }
    if (table === 'profiles') {
        return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { full_name: 'Daniel Aucaruri' }, error: null }),
        };
    }
    // trips, driver_activities, etc. — return chainable no-op
    const chainable = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    // The last call in trip/maintenance chains resolves
    chainable.order.mockResolvedValue({ data: [], error: null });
    chainable.limit.mockResolvedValue({ data: [], error: null });
    return chainable;
}

// ─── Setup before each test ───────────────────────────────────────────────────
beforeEach(() => {
    vi.clearAllMocks();

    // Auth: authenticated user
    supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
    });

    // supabase.from() routing
    supabase.from.mockImplementation((table) => mockFromTable(table));

    // Storage
    supabase.storage.from.mockReturnValue({ upload: mockUpload });

    // Default: all operations succeed
    mockUpload.mockResolvedValue({ error: null });
    mockInsertDailyChecks.mockResolvedValue({ error: null });
    mockInsertInteractions.mockResolvedValue({ error: null });
});

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('DriverDashboard — CHEQUEO/IPERC photo upload', () => {

    // Test 1: Happy path
    it('marca CHEQUEO como completado tras subir foto exitosamente', async () => {
        render(<DriverDashboard />);
        await waitFor(() => expect(screen.queryByText('Cargando...')).not.toBeInTheDocument());

        fireEvent.click(screen.getByText(/^CHEQUEO$/i));
        fireEvent.click(await screen.findByTestId('mock-camera-capture'));
        fireEvent.click(await screen.findByTestId('confirm-btn'));

        await waitFor(() => {
            expect(global.alert).toHaveBeenCalledWith('Foto de CHEQUEO subida correctamente.');
        });

        expect(mockUpload).toHaveBeenCalledTimes(1);
        expect(mockInsertDailyChecks).toHaveBeenCalledWith(
            expect.objectContaining({ check_type: 'chequeo' })
        );
        expect(mockInsertInteractions).toHaveBeenCalledTimes(1);
    });

    // Test 2: Storage error
    it('muestra error al usuario si el storage falla', async () => {
        mockUpload.mockResolvedValue({ error: { message: 'Bucket not found' } });

        render(<DriverDashboard />);
        await waitFor(() => expect(screen.queryByText('Cargando...')).not.toBeInTheDocument());

        fireEvent.click(screen.getByText(/^CHEQUEO$/i));
        fireEvent.click(await screen.findByTestId('mock-camera-capture'));
        fireEvent.click(await screen.findByTestId('confirm-btn'));

        await waitFor(() => {
            expect(global.alert).toHaveBeenCalledWith(
                expect.stringContaining('Error al subir foto de CHEQUEO')
            );
        });

        expect(mockInsertDailyChecks).not.toHaveBeenCalled();
    });

    // Test 3: DB insert error in daily_checks
    it('muestra error si el insert en driver_daily_checks falla', async () => {
        mockInsertDailyChecks.mockResolvedValue({ error: { message: 'violates FK constraint' } });

        render(<DriverDashboard />);
        await waitFor(() => expect(screen.queryByText('Cargando...')).not.toBeInTheDocument());

        fireEvent.click(screen.getByText(/^CHEQUEO$/i));
        fireEvent.click(await screen.findByTestId('mock-camera-capture'));
        fireEvent.click(await screen.findByTestId('confirm-btn'));

        await waitFor(() => {
            expect(global.alert).toHaveBeenCalledWith(
                expect.stringContaining('Error al subir foto de CHEQUEO')
            );
        });

        expect(mockInsertInteractions).not.toHaveBeenCalled();
    });

    // Test 4: driver_interactions error → NO BLOQUEA el flujo (el fix aplicado)
    it('NO muestra error al usuario si driver_interactions falla (non-blocking)', async () => {
        mockInsertInteractions.mockResolvedValue({ error: { message: 'FK violation on profiles' } });

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        render(<DriverDashboard />);
        await waitFor(() => expect(screen.queryByText('Cargando...')).not.toBeInTheDocument());

        fireEvent.click(screen.getByText(/^CHEQUEO$/i));
        fireEvent.click(await screen.findByTestId('mock-camera-capture'));
        fireEvent.click(await screen.findByTestId('confirm-btn'));

        await waitFor(() => {
            // ✅ El usuario ve éxito aunque el log de interacción falle
            expect(global.alert).toHaveBeenCalledWith('Foto de CHEQUEO subida correctamente.');
        });

        // ✅ El error queda solo en consola, no molesta al conductor
        expect(warnSpy).toHaveBeenCalledWith(
            'driver_interactions insert failed:',
            'FK violation on profiles'
        );

        warnSpy.mockRestore();
    });

    // Test 5: Sin usuario autenticado
    it('muestra error si no hay usuario autenticado', async () => {
        supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

        render(<DriverDashboard />);
        await waitFor(() => expect(screen.queryByText('Cargando...')).not.toBeInTheDocument());

        fireEvent.click(screen.getByText(/^CHEQUEO$/i));
        fireEvent.click(await screen.findByTestId('mock-camera-capture'));
        fireEvent.click(await screen.findByTestId('confirm-btn'));

        await waitFor(() => {
            expect(global.alert).toHaveBeenCalledWith(
                expect.stringContaining('Usuario no autenticado')
            );
        });

        expect(mockUpload).not.toHaveBeenCalled();
    });

    // Test 6: Botón CHEQUEO se deshabilita al completar
    it('deshabilita el botón CHEQUEO después de completarlo', async () => {
        render(<DriverDashboard />);
        await waitFor(() => expect(screen.queryByText('Cargando...')).not.toBeInTheDocument());

        const chequeoBtn = screen.getByText(/^CHEQUEO$/i);
        expect(chequeoBtn).not.toBeDisabled();

        fireEvent.click(chequeoBtn);
        fireEvent.click(await screen.findByTestId('mock-camera-capture'));
        fireEvent.click(await screen.findByTestId('confirm-btn'));

        await waitFor(() =>
            expect(global.alert).toHaveBeenCalledWith('Foto de CHEQUEO subida correctamente.')
        );

        // Después del éxito, chequeoDoneToday = true → button disabled
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /CHEQUEO/i })).toBeDisabled();
        });
    });
});
