-- SCRIPT DE CORRECCIÓN PARA CONDUCTORES
-- Ejecuta este script completo en el SQL Editor de Supabase

-- 1. Habilitar la extensión pgcrypto para generar UUIDs (si no está activa)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Modificar la columna ID para que se genere automáticamente
ALTER TABLE public.profiles 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Eliminar las restricciones que obligan a tener un usuario de Auth
-- Intentamos borrar ambas por si acaso tienen nombres distintos
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- 4. Asegurar que los permisos (RLS) permitan la creación
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Gestion Total" ON public.profiles;

CREATE POLICY "Admin Gestion Total"
ON public.profiles
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Forzar recarga de la configuración
NOTIFY pgrst, 'reload schema';
