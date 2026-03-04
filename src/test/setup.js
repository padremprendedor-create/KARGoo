import '@testing-library/jest-dom';

// Shim import.meta.env for Vitest / jsdom so that supabaseClient.js
// can load without crashing. The actual supabase client is always
// mocked via vi.mock() in test files, so these values are never used.
if (!globalThis.importMeta) {
    Object.defineProperty(globalThis, 'importMeta', { value: { env: {} } });
}
// Vitest provides import.meta, but env may be undefined in some configs
if (typeof import.meta.env === 'undefined') {
    Object.defineProperty(import.meta, 'env', {
        value: {
            VITE_SUPABASE_URL: 'http://localhost:54321',
            VITE_SUPABASE_ANON_KEY: 'test-anon-key',
        },
        writable: true,
        configurable: true,
    });
} else {
    import.meta.env.VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
    import.meta.env.VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key';
}
