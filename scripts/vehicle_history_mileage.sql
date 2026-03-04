-- 1. Add vehicle_plate to fuel_records
ALTER TABLE fuel_records
ADD COLUMN vehicle_plate TEXT;

-- 2. Add vehicle_plate and mileage to driver_activities (for maintenance logs)
ALTER TABLE driver_activities
ADD COLUMN vehicle_plate TEXT,
ADD COLUMN mileage NUMERIC;

-- 3. Create a new table for mileage logs based on driver changes
CREATE TABLE IF NOT EXISTS vehicle_mileage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    vehicle_plate TEXT NOT NULL,
    driver_id UUID REFERENCES public.profiles(id),
    mileage NUMERIC NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('relay', 'trip_start', 'trip_end', 'maintenance', 'fuel')),
    photo_url TEXT
);

-- Note: RLS policies for vehicle_mileage_logs
ALTER TABLE vehicle_mileage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can insert vehicle_mileage_logs"
    ON vehicle_mileage_logs FOR INSERT
    WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can view their own vehicle_mileage_logs"
    ON vehicle_mileage_logs FOR SELECT
    USING (auth.uid() = driver_id);

CREATE POLICY "Admins can view all vehicle_mileage_logs"
    ON vehicle_mileage_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
