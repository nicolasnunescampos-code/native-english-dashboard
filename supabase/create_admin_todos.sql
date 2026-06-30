CREATE TABLE IF NOT EXISTS public.admin_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.admin_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all active users" ON public.admin_todos FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all active users" ON public.admin_todos FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all active users" ON public.admin_todos FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all active users" ON public.admin_todos FOR DELETE USING (true);
