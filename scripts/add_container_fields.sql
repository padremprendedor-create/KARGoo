-- Añadir campos dimension y condition a trip_containers
ALTER TABLE public.trip_containers ADD COLUMN IF NOT EXISTS dimension TEXT DEFAULT '20';
ALTER TABLE public.trip_containers ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'LLENO';
