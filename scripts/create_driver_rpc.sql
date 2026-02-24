-- scripts/create_driver_rpc.sql

-- SCRIPT PARA CREAR LA FUNCIÓN DE REGISTRO DE CONDUCTORES
-- Ejecutar en SQL Editor de Supabase (borra todo antes de pegar)
-- 
-- Este script crea una función `create_driver_account` que:
-- 1. Genera un email automáticamente: format [nombresinpcacios]@sama.com
-- 2. Crea un usuario en auth.users con contraseña sama[dni]
-- 3. Crea el perfil en public.profiles
-- IMPORTANTE: Ejecutar esto con privilegios de SUPABASE ADMIN.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

CREATE OR REPLACE FUNCTION public.create_driver_account(
    p_full_name TEXT,
    p_dni TEXT,
    p_license TEXT,
    p_phone TEXT
) RETURNS JSONB AS $$
DECLARE
    new_uid UUID;
    user_email TEXT;
    encrypted_pw TEXT;
    first_name TEXT;
    clean_name TEXT;
BEGIN
    -- Generar email: primero obtenemos el primer nombre y/o limpiamos espacios
    first_name := split_part(trim(p_full_name), ' ', 1);
    clean_name := lower(regexp_replace(unaccent(first_name), '[^a-zA-Z0-9]', '', 'g'));
    
    -- Si por alguna razón está vacío
    IF length(clean_name) = 0 THEN
        clean_name := 'conductor';
    END IF;

    user_email := clean_name || '@sama.com';

    -- Si el email ya existe en auth.users, agregar un sufijo aleatorio para evitar conflictos 
    -- o para simplificar, permitimos que falle con un RAISE EXCEPTION.
    SELECT id INTO new_uid FROM auth.users WHERE email = user_email;
    IF new_uid IS NOT NULL THEN
        -- Si ya existe alguien con ese primer nombre, le agregamos el dni al email
        user_email := clean_name || p_dni || '@sama.com';
        SELECT id INTO new_uid FROM auth.users WHERE email = user_email;
        IF new_uid IS NOT NULL THEN
            RAISE EXCEPTION 'El correo % ya está en uso. Revisa el conductor duplicado.', user_email;
        END IF;
    END IF;

    -- Contraseña: sama[DNI]
    encrypted_pw := crypt('sama' || p_dni, gen_salt('bf'));

    -- Generar nuevo ID de usuario
    new_uid := gen_random_uuid();
    
    -- 1. Insertar en auth.users
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', new_uid, 'authenticated', 'authenticated',
        user_email, encrypted_pw, now(),
        '{"provider": "email", "providers": ["email"]}',
        json_build_object('full_name', p_full_name),
        now(), now(), '', '', '', ''
    );
    
    -- 2. Insertar en auth.identities
    INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
        new_uid, new_uid,
        json_build_object('sub', new_uid::text, 'email', user_email),
        'email', new_uid::text, now(), now(), now()
    );

    -- 3. Insertar en public.profiles
    INSERT INTO public.profiles (id, full_name, dni, license, phone, role)
    VALUES (new_uid, p_full_name, p_dni, p_license, p_phone, 'driver');

    -- Retornar el usuario creado para que el frontend lo confirme
    RETURN json_build_object(
        'id', new_uid,
        'email', user_email,
        'full_name', p_full_name,
        'dni', p_dni
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
