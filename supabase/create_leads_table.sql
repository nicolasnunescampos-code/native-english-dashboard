-- Use this SQL snippet to recreate or alter your leads table to use the new "status" column instead of a boolean.
-- Since the table is likely empty right now, the easiest way is to DROP and recreate.
-- Warning: DROPPING WILL DELETE EXISTING LEADS if you've added any. 

DROP TABLE IF EXISTS public.leads CASCADE;

CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    source TEXT,
    status TEXT DEFAULT 'pending_contact', -- Can be 'pending_contact', 'contacted', 'client', 'lost'
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Turn on Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to perform operations on the leads table
CREATE POLICY "Enable all for authenticated users" 
ON public.leads 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
