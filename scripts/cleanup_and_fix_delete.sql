-- SCRIPT DE LIMPIEZA Y REPARACIÓN
-- Ejecuta esto en el SQL Editor de Supabase para corregir el error de borrado y limpiar la BD.

-- 1. Modificar la relación entre trips y profiles para permitir borrar en cascada
-- Esto corrige el error "foreign key constraint" al borrar conductores
DO $$ 
DECLARE r RECORD; 
BEGIN 
    FOR r IN (SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'trips' AND constraint_type = 'FOREIGN KEY') 
    LOOP 
        EXECUTE 'ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name); 
    END LOOP; 
END $$;

ALTER TABLE public.trips 
ADD CONSTRAINT trips_driver_id_fkey 
FOREIGN KEY (driver_id) REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- 2. LIMPIAR LA BASE DE DATOS (Borrar TODOS los conductores y sus viajes)
-- Como pediste "limpiar la base de datos", esto borrará todos los perfiles de tipo 'conductor'.
-- Gracias al paso 1, sus viajes se borrarán automáticamente (sin error).
DELETE FROM public.profiles WHERE role = 'driver';

-- NOTA: Los datos de "Origen y Destino" están en el código de la App, no se perderán.
