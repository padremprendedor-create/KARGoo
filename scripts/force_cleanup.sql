-- SCRIPT DE LIMPIEZA FORZADA (V3)
-- Ejecutar en el SQL Editor de Supabase
-- Explicación: Borra manualmente los datos en orden inverso a las dependencias para evitar errores de FK.

-- 1. Borrar datos en orden de dependencia (Hijos -> Padres)
-- Primero los contenedores (dependen de viajes)
DELETE FROM public.trip_containers;

-- Segundo los viajes (dependen de conductores)
DELETE FROM public.trips;

-- Tercero los conductores (se pueden borrar ahora que no tienen viajes asociados)
DELETE FROM public.profiles WHERE role = 'driver';


-- 2. APLICAR ARREGLO PARA ELFUTURO (CASCADE DELETE)
-- Esto asegurará que la próxima vez NO tengas este error.

-- Fix trips -> profiles
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

-- Fix trip_containers -> trips
DO $$ 
DECLARE r RECORD; 
BEGIN 
    FOR r IN (SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'trip_containers' AND constraint_type = 'FOREIGN KEY') 
    LOOP 
        EXECUTE 'ALTER TABLE public.trip_containers DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name); 
    END LOOP; 
END $$;

ALTER TABLE public.trip_containers
ADD CONSTRAINT trip_containers_trip_id_fkey
FOREIGN KEY (trip_id) REFERENCES public.trips(id)
ON DELETE CASCADE;


-- Confirmación
SELECT 'Base de datos de conductores limpia y arreglada' as mensaje;
