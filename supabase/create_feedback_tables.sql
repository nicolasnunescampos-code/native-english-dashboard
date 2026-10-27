CREATE TABLE public.feedback_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT DEFAULT 'active' -- can be 'active' or 'closed'
);

CREATE TABLE public.student_feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.feedback_requests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL, -- references students table if needed, assuming uuid
    classes_score INT CHECK (classes_score BETWEEN 1 AND 5),
    teachers_score INT CHECK (teachers_score BETWEEN 1 AND 5),
    lessons_score INT CHECK (lessons_score BETWEEN 1 AND 5),
    schedule_score INT CHECK (schedule_score BETWEEN 1 AND 5),
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(request_id, student_id)
);

ALTER TABLE public.feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for all" ON public.feedback_requests FOR SELECT USING (true);
CREATE POLICY "Enable all for admin" ON public.feedback_requests FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users" ON public.student_feedbacks FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for own feedback or admin" ON public.student_feedbacks FOR SELECT USING (true);
CREATE POLICY "Enable update for all" ON public.student_feedbacks FOR UPDATE USING (true) WITH CHECK (true);
