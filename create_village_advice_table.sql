-- Create village_advice table
CREATE TABLE IF NOT EXISTS public.village_advice (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    village_name text NOT NULL,
    risk_level text,
    auto_advice text[],
    custom_advice text,
    worker_id uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT village_advice_village_name_key UNIQUE (village_name)
);

-- Enable RLS
ALTER TABLE public.village_advice ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Allow everyone to read advice (Villagers and Workers)
CREATE POLICY "Enable read access for all users" ON public.village_advice
    FOR SELECT USING (true);

-- 2. Allow authenticated users (Health Workers) to insert advice
CREATE POLICY "Enable insert for authenticated users" ON public.village_advice
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Allow authenticated users (Health Workers) to update advice
CREATE POLICY "Enable update for authenticated users" ON public.village_advice
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 4. Allow authenticated users to delete advice (optional, but good for cleanup)
CREATE POLICY "Enable delete for authenticated users" ON public.village_advice
    FOR DELETE USING (auth.role() = 'authenticated');
