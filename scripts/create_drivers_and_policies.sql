-- SCRIPT CORREGIDO Y DEFINITIVO PARA CREAR CUENTAS DE CONDUCTORES
-- Ejecuta este script completo en el SQL Editor de Supabase.

-- 1. Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 2. Configurar RLS en la tabla trips para asegurar la privacidad
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas viejas
DROP POLICY IF EXISTS "Admin Gestion Viajes" ON public.trips;
DROP POLICY IF EXISTS "Admin ALL" ON public.trips;
DROP POLICY IF EXISTS "Driver SELECT" ON public.trips;
DROP POLICY IF EXISTS "Ver propios viajes" ON public.trips;
DROP POLICY IF EXISTS "Admin Gestion Total" ON public.trips;
DROP POLICY IF EXISTS "Conductor Ve Sus Viajes" ON public.trips;

-- Política de ADMIN (Acceso total)
CREATE POLICY "Admin Gestion Total"
ON public.trips
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Política de CONDUCTOR (Solo ver sus viajes)
CREATE POLICY "Conductor Ve Sus Viajes"
ON public.trips
FOR SELECT
TO authenticated
USING (
  driver_id = auth.uid()
);

-- 3. Generar usuarios y migrar datos
DO $$
DECLARE
    r RECORD;
    new_uid UUID;
    user_email TEXT;
    encrypted_pw TEXT;
    first_name TEXT;
    clean_name TEXT;
BEGIN
    -- Contraseña encriptada: "sama2026"
    encrypted_pw := crypt('sama2026', gen_salt('bf'));
    
    FOR r IN SELECT * FROM public.profiles WHERE role = 'driver' LOOP
        
        -- Generar email: nombre@sama.com
        first_name := split_part(trim(r.full_name), ' ', 1);
        -- Usar unaccent directamente (sin utils.)
        clean_name := lower(regexp_replace(unaccent(first_name), '[^a-z0-9]', '', 'g')); 
        
        user_email := clean_name || '@sama.com';
        
        RAISE NOTICE 'Procesando: % -> Email: %', r.full_name, user_email;

        -- Buscar si el usuario ya existe en auth
        SELECT id INTO new_uid FROM auth.users WHERE email = user_email;
        
        IF new_uid IS NULL THEN
            -- Crear usuario en auth.users
            new_uid := gen_random_uuid();
            
            INSERT INTO auth.users (
                instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                confirmation_token, email_change, email_change_token_new, recovery_token
            ) VALUES (
                '00000000-0000-0000-0000-000000000000', new_uid, 'authenticated', 'authenticated',
                user_email, encrypted_pw, now(),
                '{"provider": "email", "providers": ["email"]}',
                json_build_object('full_name', r.full_name),
                now(), now(), '', '', '', ''
            );
        ELSE
            -- Actualizar contraseña si existe
            UPDATE auth.users 
            SET encrypted_password = encrypted_pw 
            WHERE id = new_uid;
        END IF;

        -- Migrar perfil y viajes si el ID es diferente
        IF r.id != new_uid THEN
            -- Insertar perfil con nuevo ID (SIN created_at)
            INSERT INTO public.profiles (id, full_name, dni, license, phone, role)
            VALUES (new_uid, r.full_name, r.dni, r.license, r.phone, 'driver')
            ON CONFLICT (id) DO UPDATE 
            SET full_name = EXCLUDED.full_name;
            
            -- Reasignar viajes
            UPDATE public.trips 
            SET driver_id = new_uid 
            WHERE driver_id = r.id;
            
            -- Borrar perfil antiguo con manejo de error
            BEGIN
                DELETE FROM public.profiles WHERE id = r.id;
            EXCEPTION WHEN foreign_key_violation THEN
                RAISE NOTICE 'No se pudo borrar perfil antiguo % (tiene dependencias)', r.id;
            END;
        END IF;
        
    END LOOP;
END $$;
