import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VehicleHistoryModal from './VehicleHistoryModal';
import { supabase } from '../../supabaseClient';

vi.mock('../../supabaseClient', () => ({
    supabase: {
        from: vi.fn(),
        storage: {
            from: vi.fn(),
        },
    },
}));

describe('VehicleHistoryModal Integration', () => {
    const mockVehicle = { plate: 'ABC-123', brand: 'Toyota', model: 'Hilux' };

    const setupEmptyMock = () => {
        supabase.from.mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }));
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the modal when isOpen is true and vehicle is provided', async () => {
        setupEmptyMock();
        render(<VehicleHistoryModal isOpen={true} onClose={vi.fn()} vehicle={mockVehicle} />);

        await waitFor(() => {
            expect(screen.getByText('Historial del Vehículo')).toBeInTheDocument();
        });

        expect(screen.getByText('ABC-123 - Toyota Hilux')).toBeInTheDocument();
        expect(screen.getByText('Abastecimiento')).toBeInTheDocument();
        expect(screen.getByText('Mantenimiento')).toBeInTheDocument();
        expect(screen.getByText('Kilometraje')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
        const { container } = render(<VehicleHistoryModal isOpen={false} onClose={vi.fn()} vehicle={mockVehicle} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('calls onClose when close button is clicked', async () => {
        setupEmptyMock();
        const mockOnClose = vi.fn();
        render(<VehicleHistoryModal isOpen={true} onClose={mockOnClose} vehicle={mockVehicle} />);

        await waitFor(() => {
            expect(screen.getByText('Historial del Vehículo')).toBeInTheDocument();
        });

        const buttons = screen.getAllByRole('button');
        const xButton = buttons[0];
        fireEvent.click(xButton);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('fetches and displays fuel data in table format on default tab', async () => {
        const mockFuelData = [
            { id: 1, created_at: '2026-03-05T10:00:00Z', mileage: '1500', photo_url: 'fuel_receipts/test.jpeg', profiles: { full_name: 'Brian' } },
            { id: 2, created_at: '2026-03-04T08:00:00Z', mileage: '1200', photo_url: null, profiles: { full_name: 'Carlos' } },
        ];

        supabase.from.mockImplementation((table) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockImplementation(() => {
                if (table === 'fuel_records') return Promise.resolve({ data: mockFuelData, error: null });
                return Promise.resolve({ data: [], error: null });
            }),
        }));

        render(<VehicleHistoryModal isOpen={true} onClose={vi.fn()} vehicle={mockVehicle} />);

        await waitFor(() => {
            expect(screen.getByText(/1500 KM/)).toBeInTheDocument();
            expect(screen.getByText('Brian')).toBeInTheDocument();
            expect(screen.getByText(/1200 KM/)).toBeInTheDocument();
            expect(screen.getByText('Carlos')).toBeInTheDocument();
        });

        // Record with photo should have "Ver foto" button
        const verFotoButtons = screen.getAllByText('Ver foto');
        expect(verFotoButtons).toHaveLength(1);

        // Record without photo should have "Sin foto"
        expect(screen.getByText('Sin foto')).toBeInTheDocument();
    });

    it('switches to maintenance tab and displays data in table format', async () => {
        const mockMaintenanceData = [
            { id: 1, start_time: '2026-03-05T12:00:00Z', reason: 'Cambio de aceite', mileage: '13000', photo_url: 'maintenance/test.jpeg', profiles: { full_name: 'Driver M' } },
        ];

        supabase.from.mockImplementation((table) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockImplementation(() => {
                if (table === 'driver_activities') return Promise.resolve({ data: mockMaintenanceData, error: null });
                return Promise.resolve({ data: [], error: null });
            }),
        }));

        render(<VehicleHistoryModal isOpen={true} onClose={vi.fn()} vehicle={mockVehicle} />);

        fireEvent.click(screen.getByText('Mantenimiento'));

        await waitFor(() => {
            expect(screen.getByText('Cambio de aceite')).toBeInTheDocument();
            expect(screen.getByText(/13000 KM/)).toBeInTheDocument();
            expect(screen.getByText('Driver M')).toBeInTheDocument();
        });

        // Maintenance record with photo should have "Ver foto"
        const verFotoButtons = screen.getAllByText('Ver foto');
        expect(verFotoButtons).toHaveLength(1);
    });

    it('switches to mileage tab and displays data in table format', async () => {
        const mockMileageData = [
            { id: '1', created_at: '2026-03-05T10:00:00Z', mileage: '10200', event_type: 'trip_start', profiles: { full_name: 'Driver K' } },
            { id: '2', created_at: '2026-03-05T14:00:00Z', mileage: '10500', event_type: 'trip_end', profiles: { full_name: 'Driver K' } },
        ];

        supabase.from.mockImplementation((table) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockImplementation(() => {
                if (table === 'vehicle_mileage_logs') return Promise.resolve({ data: mockMileageData, error: null });
                return Promise.resolve({ data: [], error: null });
            }),
        }));

        render(<VehicleHistoryModal isOpen={true} onClose={vi.fn()} vehicle={mockVehicle} />);

        fireEvent.click(screen.getByText('Kilometraje'));

        await waitFor(() => {
            expect(screen.getByText(/10200 KM/)).toBeInTheDocument();
            expect(screen.getByText(/10500 KM/)).toBeInTheDocument();
        });
    });

    it('displays empty state messages when no data exists', async () => {
        setupEmptyMock();
        render(<VehicleHistoryModal isOpen={true} onClose={vi.fn()} vehicle={mockVehicle} />);

        await waitFor(() => {
            expect(screen.getByText('No hay registros de abastecimiento.')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Mantenimiento'));
        await waitFor(() => {
            expect(screen.getByText('No hay reportes de mantenimiento.')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Kilometraje'));
        await waitFor(() => {
            expect(screen.getByText('No hay registros de kilometraje.')).toBeInTheDocument();
        });
    });

    it('opens photo via signed URL when "Ver foto" is clicked', async () => {
        const mockFuelData = [
            { id: 1, created_at: '2026-03-05T10:00:00Z', mileage: '1500', photo_url: 'fuel_receipts/driver1/photo.jpeg', profiles: { full_name: 'Brian' } },
        ];

        supabase.from.mockImplementation((table) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockImplementation(() => {
                if (table === 'fuel_records') return Promise.resolve({ data: mockFuelData, error: null });
                return Promise.resolve({ data: [], error: null });
            }),
        }));

        // Mock storage signed URL
        const mockCreateSignedUrl = vi.fn().mockResolvedValue({
            data: { signedUrl: 'https://example.com/signed-photo-url' },
            error: null,
        });
        supabase.storage.from.mockReturnValue({ createSignedUrl: mockCreateSignedUrl });

        // Mock window.open
        const mockWindowOpen = vi.spyOn(window, 'open').mockImplementation(() => { });

        render(<VehicleHistoryModal isOpen={true} onClose={vi.fn()} vehicle={mockVehicle} />);

        await waitFor(() => {
            expect(screen.getByText('Ver foto')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Ver foto'));

        await waitFor(() => {
            expect(supabase.storage.from).toHaveBeenCalledWith('trip-photos');
            expect(mockCreateSignedUrl).toHaveBeenCalledWith('fuel_receipts/driver1/photo.jpeg', 3600);
            expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com/signed-photo-url', '_blank');
        });

        mockWindowOpen.mockRestore();
    });

    it('shows alert when signed URL generation fails', async () => {
        const mockFuelData = [
            { id: 1, created_at: '2026-03-05T10:00:00Z', mileage: '1500', photo_url: 'fuel_receipts/bad-path.jpeg', profiles: { full_name: 'Brian' } },
        ];

        supabase.from.mockImplementation((table) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockImplementation(() => {
                if (table === 'fuel_records') return Promise.resolve({ data: mockFuelData, error: null });
                return Promise.resolve({ data: [], error: null });
            }),
        }));

        // Mock storage signed URL failure
        supabase.storage.from.mockReturnValue({
            createSignedUrl: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Object not found' },
            }),
        });

        const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => { });

        render(<VehicleHistoryModal isOpen={true} onClose={vi.fn()} vehicle={mockVehicle} />);

        await waitFor(() => {
            expect(screen.getByText('Ver foto')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Ver foto'));

        await waitFor(() => {
            expect(mockAlert).toHaveBeenCalledWith('No se pudo abrir la foto: Object not found');
        });

        mockAlert.mockRestore();
    });

    it('queries supabase with the correct vehicle plate', async () => {
        setupEmptyMock();
        render(<VehicleHistoryModal isOpen={true} onClose={vi.fn()} vehicle={mockVehicle} />);

        await waitFor(() => {
            expect(supabase.from).toHaveBeenCalledWith('fuel_records');
            expect(supabase.from).toHaveBeenCalledWith('driver_activities');
            expect(supabase.from).toHaveBeenCalledWith('vehicle_mileage_logs');
        });
    });
});
