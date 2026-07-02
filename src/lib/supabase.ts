import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'student' | 'teacher' | 'admin';

export interface Teacher {
  id: string;
  name: string;
  color: string;
  meet_link: string;
}

export interface Student {
  id: string; // Changed to match UUID from DB
  email: string;
  student_name: string;
  classes_per_week: number;
  cpf?: string;
  schedule_preference?: string;
  course_type?: 'Native English' | 'Conversation Club' | 'Business English';
}

export interface ClassAssignment {
  id: number;
  class_id: number;
  student_id: string;
}

export interface Class {
  id?: number;
  title: string; // Now acts as "Class Name" or still "Teacher Name" for backward compat if needed, but per new design we rely on teacher_id
  date: string;
  time: string; // Keep for backward compat or display
  start_time?: string; // New
  end_time?: string;   // New
  timezone?: string; // New
  teacher_id?: string; // New FK
  status?: 'draft' | 'published'; // New
  event_id?: string; // For recurrence grouping
  
  student_name?: string; // Legacy: Keeping for backward compatibility/display 
  link_url?: string;     // Legacy: We might still use specific links or default to teacher's

  class_level: string;
  class_grade?: number;
  speaking_grade?: number;
  grammar_grade?: number;
  reading_grade?: number;
  class_chapter?: string;
  class_type?: string;
  is_absent?: boolean;
  notes?: string | null;
  teachers?: Teacher; // Optional, for joined queries
}

export interface Payment {
  id?: number;
  amount: number;
  currency: 'BRL' | 'USD' | 'EUR' | 'CAD';
  due_date: string;
  status: 'pending' | 'paid';
  payment_link?: string;
  student_name?: string;
  student_id?: string;
}

export interface Material {
  id?: number;
  title: string;
  category: string;
  level: string;
  url: string;
  description?: string | null;
  thumbnail_url?: string;
  target_audience?: string; // 'student', 'teacher', 'both'
}

export interface Announcement {
  id?: number;
  title: string;
  message: string;
  date: string;
}

export interface Video {
  id?: number;
  title: string;
  description?: string;
  youtube_url: string;
  thumbnail_url: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
}
export interface Audio {
  id?: number;
  title: string;
  description?: string;
  url: string;
  category: string;
  created_at?: string;
}

export interface Rule {
  id?: string;
  role: 'student' | 'teacher';
  title: string;
  content: string;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface RecuperationClass {
  id: string;
  student_id: string;
  status: 'pending' | 'completed' | 'cancelled';
  date: string;
  notes: string;
  created_at?: string;
}

export interface Exam {
  id: string;
  title: string;
  chapter_number: number;
  level: string;
  created_at?: string;
}

export interface Question {
  id: string;
  exam_id: string;
  topic?: string;
  question_text: string;
  type: 'fill-in-the-blank' | 'multiple-choice';
  correct_answer: string;
  points: number;
  created_at?: string;
}

export interface ExamSubmission {
  id: string;
  student_id: string;
  exam_id: string;
  score: number | null;
  answers_json: any | null;
  assigned_by?: string;
  completed_at: string | null;
  created_at?: string;
  exams?: Exam; // For joined queries
}

