// src/__mocks__/supabaseClient.js
// Manual mock for supabaseClient — used by Vitest when vi.mock('../supabaseClient') is called.
// This prevents the real module from loading import.meta.env at test time.
import { vi } from 'vitest';

export const supabase = {
    auth: {
        getUser: vi.fn(),
    },
    from: vi.fn(),
    storage: {
        from: vi.fn(),
    },
};
