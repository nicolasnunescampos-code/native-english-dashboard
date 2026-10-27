CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Other',
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'paid', -- 'paid' or 'pending'
    payment_method TEXT DEFAULT 'Company Nubank',
    is_recurring BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- If you already created the expenses table previously, run this one line to add payment_method:
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Company Nubank';

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for all" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "Enable insert for all" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all" ON public.expenses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all" ON public.expenses FOR DELETE USING (true);
