-- SCRIPT DE LIMPIEZA TOTAL Y DEFINITIVO (V4)
-- Ejecutar en SQL Editor de Supabase
-- Este script NO usa bucles complejos para evitar errores.
-- Borra explícitamente y crea las restricciones de nuevo.

-- 1. Intenta borrar las restricciones existentes (si existen)
ALTER TABLE public.trip_containers DROP CONSTRAINT IF EXISTS trip_containers_trip_id_fkey;
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_driver_id_fkey;

-- 2. BORRADO DE DATOS (Orden Inverso Seguro)
DELETE FROM public.trip_containers; -- Hijos de viajes
DELETE FROM public.trips;           -- Viajes (Hijos de conductores)
DELETE FROM public.profiles WHERE role = 'driver'; -- Conductores

-- 3. RE-CREAR RESTRICCIONES CON 'ON DELETE CASCADE'
-- Esto asegura que en el futuro no vuelva a fallar.

-- Relación: Contenedores -> Viajes
ALTER TABLE public.trip_containers
ADD CONSTRAINT trip_containers_trip_id_fkey
FOREIGN KEY (trip_id) REFERENCES public.trips(id)
ON DELETE CASCADE;

-- Relación: Viajes -> Conductores
ALTER TABLE public.trips
ADD CONSTRAINT trips_driver_id_fkey
FOREIGN KEY (driver_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- 4. CONFIRMACIÓN
SELECT 'Limpieza completada y restricciones arregladas' as estado;
