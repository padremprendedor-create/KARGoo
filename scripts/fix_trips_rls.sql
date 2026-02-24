-- SCRIPT DE CORRECCIÓN PARA VIAJES (TRIPS)
-- Ejecuta este script completo en el SQL Editor de Supabase

-- 1. Habilitar RLS en la tabla trips
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar política anterior si existe
DROP POLICY IF EXISTS "Admin Gestion Viajes" ON public.trips;

-- 3. Crear política permisiva para usuarios autenticados (Admins)
CREATE POLICY "Admin Gestion Viajes"
ON public.trips
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Asegurar que la tabla trips tenga los permisos correctos
GRANT ALL ON TABLE public.trips TO authenticated;
GRANT ALL ON TABLE public.trips TO service_role;

-- 5. Recargar esquema por si acaso
NOTIFY pgrst, 'reload schema';
