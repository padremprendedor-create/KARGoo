-- SCRIPT PARA VINCULAR CONDUCTORES CON CUENTAS DE AUTENTICACIÓN
-- Ejecutar en SQL Editor de Supabase (borra todo antes de pegar)
-- 
-- Este script:
-- 1. Crea usuarios en auth.users para cada conductor
-- 2. Actualiza profiles.id para que coincida con auth.users.id
-- 3. Actualiza trips.driver_id para que apunte al nuevo ID
--
-- Email: [nombre]@sama.com | Contraseña: sama2026

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

DO $$
DECLARE
    r RECORD;
    new_uid UUID;
    user_email TEXT;
    encrypted_pw TEXT;
    first_name TEXT;
    clean_name TEXT;
    old_id UUID;
BEGIN
    encrypted_pw := crypt('sama2026', gen_salt('bf'));
    
    FOR r IN 
        SELECT p.* 
        FROM public.profiles p
        LEFT JOIN auth.users au ON au.id = p.id
        WHERE p.role = 'driver' AND au.id IS NULL
    LOOP
        old_id := r.id;
        
        -- Generar email
        first_name := split_part(trim(r.full_name), ' ', 1);
        clean_name := lower(regexp_replace(unaccent(first_name), '[^a-z0-9]', '', 'g'));
        user_email := clean_name || '@sama.com';
        
        RAISE NOTICE 'Procesando: % -> Email: %', r.full_name, user_email;

        -- Verificar si ya existe un usuario con ese email
        SELECT id INTO new_uid FROM auth.users WHERE email = user_email;
        
        IF new_uid IS NULL THEN
            -- Crear nuevo usuario en auth
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
            
            -- Insertar identidad en auth.identities
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
            ) VALUES (
                new_uid, new_uid,
                json_build_object('sub', new_uid::text, 'email', user_email),
                'email', new_uid::text, now(), now(), now()
            );
        END IF;

        -- Reasignar viajes al nuevo ID
        UPDATE public.trips SET driver_id = new_uid WHERE driver_id = old_id;
        
        -- Actualizar el perfil: borrar viejo, crear nuevo
        DELETE FROM public.profiles WHERE id = old_id;
        
        INSERT INTO public.profiles (id, full_name, dni, license, phone, role)
        VALUES (new_uid, r.full_name, r.dni, r.license, r.phone, 'driver');
        
        RAISE NOTICE 'Conductor % vinculado. Viejo ID: % -> Nuevo ID: %', r.full_name, old_id, new_uid;
        
    END LOOP;
END $$;

-- Verificar resultado
SELECT p.id, p.full_name, au.email
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
WHERE p.role = 'driver';
