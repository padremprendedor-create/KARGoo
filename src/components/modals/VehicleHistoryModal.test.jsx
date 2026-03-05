import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VehicleHistoryModal from './VehicleHistoryModal';
import { supabase } from '../../supabaseClient';

vi.mock('../../supabaseClient', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('VehicleHistoryModal Integration', () => {
    const mockVehicle = { plate: 'ABC-123', brand: 'Toyota', model: 'Hilux' };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the modal when isOpen is true and vehicle is provided', async () => {
        // Setup mock response for supabase queries
        supabase.from.mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }));

        render(<VehicleHistoryModal isOpen={true} onClose={vi.fn()} vehicle={mockVehicle} />);

        // Wait for the data fetching to complete and component to render
        await waitFor(() => {
            expect(screen.getByText('Historial del Vehículo')).toBeInTheDocument();
        });

        expect(screen.getByText('ABC-123 - Toyota Hilux')).toBeInTheDocument();
        expect(screen.getByText('Abastecimiento')).toBeInTheDocument();
        expect(screen.getByText('Mantenimiento')).toBeInTheDocument();
        expect(screen.getByText('Kilometraje')).toBeInTheDocument();
    });

    it('fetches and displays history data when different tabs are clicked', async () => {
        const mockFuelData = [{ id: 1, created_at: '2023-10-01T10:00:00Z', mileage: 10000, profiles: { full_name: 'Driver 1' } }];
        const mockMaintenanceData = [{ id: 1, start_time: '2023-10-02T10:00:00Z', reason: 'Cambio de aceite', mileage: 10100, profiles: { full_name: 'Driver 2' } }];
        const mockMileageData = [{ id: 1, created_at: '2023-10-03T10:00:00Z', mileage: 10200, event_type: 'trip_start', profiles: { full_name: 'Driver 3' } }];

        // Setup mock response based on the table being queried
        supabase.from.mockImplementation((table) => {
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockImplementation(() => {
                    if (table === 'fuel_records') return Promise.resolve({ data: mockFuelData, error: null });
                    if (table === 'driver_activities') return Promise.resolve({ data: mockMaintenanceData, error: null });
                    if (table === 'vehicle_mileage_logs') return Promise.resolve({ data: mockMileageData, error: null });
                    return Promise.resolve({ data: [], error: null });
                })
            }
        });

        render(<VehicleHistoryModal isOpen={true} onClose={vi.fn()} vehicle={mockVehicle} />);

        // Wait for default tab (fuel) to render data
        await waitFor(() => {
            expect(screen.getByText(/10000 KM/)).toBeInTheDocument();
            expect(screen.getByText(/Driver 1/)).toBeInTheDocument();
        });

        // Click Maintenance Tab
        fireEvent.click(screen.getByText('Mantenimiento'));
        await waitFor(() => {
            expect(screen.getByText(/Cambio de aceite/)).toBeInTheDocument();
            expect(screen.getByText(/Driver 2/)).toBeInTheDocument();
            expect(screen.getByText(/10100 KM/)).toBeInTheDocument();
        });

        // Click Mileage Tab
        fireEvent.click(screen.getByText('Kilometraje'));
        await waitFor(() => {
            expect(screen.getByText(/10200 KM/)).toBeInTheDocument();
            expect(screen.getByText(/Driver 3/)).toBeInTheDocument();
        });

        // Verify supabase was called correctly
        expect(supabase.from).toHaveBeenCalledWith('fuel_records');
        expect(supabase.from).toHaveBeenCalledWith('driver_activities');
        expect(supabase.from).toHaveBeenCalledWith('vehicle_mileage_logs');
    });

    it('displays empty state messages when no data exists', async () => {
        supabase.from.mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }));

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

    it('does not render when isOpen is false', () => {
        const { container } = render(<VehicleHistoryModal isOpen={false} onClose={vi.fn()} vehicle={mockVehicle} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('calls onClose when close button is clicked', async () => {
        supabase.from.mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }));

        const mockOnClose = vi.fn();
        render(<VehicleHistoryModal isOpen={true} onClose={mockOnClose} vehicle={mockVehicle} />);

        await waitFor(() => {
            expect(screen.getByText('Historial del Vehículo')).toBeInTheDocument();
        });

        // The close button is the one with the X icon (or in this case, a button that doesn't have text and contains the X icon)
        // Since there is no aria-label, we can find it by its style or by the parent div.
        // It's easier to find the button that is first child of the header or by grabbing the button that only contains the svg
        const closeButton = screen.getByRole('button', { name: '' });
        // Note: The role button will match the tabs too, but they have text.
        // Let's refine the query:
        const buttons = screen.getAllByRole('button');
        const xButton = buttons[0]; // The first button in the component is the X close button.

        fireEvent.click(xButton);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
});
