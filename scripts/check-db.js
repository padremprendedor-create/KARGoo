import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars manually to avoid installing dotenv
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');

let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            if (key.trim() === 'VITE_SUPABASE_URL') supabaseUrl = value.trim();
            if (key.trim() === 'VITE_SUPABASE_ANON_KEY') supabaseKey = value.trim();
        }
    });
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: No se pudieron leer las variables de entorno del archivo .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('1. Verificando conexión a:', supabaseUrl);

    // 1. Check Profiles (known to exist)
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('count').limit(1);
    if (profileError) {
        console.error('❌ Error conectando a tabla profiles:', profileError.message);
    } else {
        console.log('✅ Conexión exitosa. Profiles accesibles.');
    }

    // 2. Check Vehicles
    console.log('\n2. Verificando tabla vehicles...');
    const { data: vehicles, error: vehicleError } = await supabase.from('vehicles').select('*').limit(1);

    if (vehicleError) {
        console.error('❌ Error accediendo a tabla vehicles:', vehicleError.message);
        console.log('\nPosibles causas:');
        console.log('- La tabla no existe (Ejecutar CREATE TABLE)');
        console.log('- Políticas RLS bloquean el acceso (Ejecutar ALTER TABLE... ENABLE RLS)');
        console.log('- El Cache de Schema no se ha actualizado (Ir a Settings -> API -> Reload Schema Cache)');
    } else {
        console.log('✅ Tabla vehicles encontrada y accesible.');
        console.log('Registros encontrados:', vehicles.length);
    }
}

check();
