import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ibykhkbyzifddwnsfxxy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieWtoa2J5emlmZGR3bnNmeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NDU3MjMsImV4cCI6MjA3NDQyMTcyM30.w1TtWeXJGMjvSEmBccBgxk0PQ3_E9J9_dAJYd3LW_t4';

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
  listening_grade?: number;
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

export interface Expense {
  id?: string;
  title: string;
  category: string;
  amount: number;
  currency: 'BRL' | 'USD' | 'EUR' | 'CAD';
  due_date: string;
  status: 'pending' | 'paid';
  payment_method?: string;
  is_recurring?: boolean;
  notes?: string | null;
  created_at?: string;
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
  category?: string;
}

const VIDEO_COURSE_PREFIX = /^\[VideoCourse\]\s*/i;

export function isVideoCourseItem(video: Video): boolean {
  if (video.category === 'video_course') return true;
  if (typeof video.description === 'string' && VIDEO_COURSE_PREFIX.test(video.description)) {
    return true;
  }
  return false;
}

export function cleanVideoDescription(description?: string | null): string {
  if (!description) return '';
  return description.replace(VIDEO_COURSE_PREFIX, '').trim();
}

export function encodeVideoCourseDescription(description?: string | null): string {
  const clean = cleanVideoDescription(description);
  return clean ? `[VideoCourse] ${clean}` : '[VideoCourse]';
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

export interface FeedbackRequest {
  id: string;
  created_at?: string;
  status: 'active' | 'closed';
}

export interface StudentFeedback {
  id?: string;
  request_id: string;
  student_id: string;
  classes_score: number;
  teachers_score: number;
  lessons_score: number;
  schedule_score: number;
  comments?: string;
  created_at?: string;
}

export type GrammarBookLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type GrammarQuestionType = 'true_false_fix' | 'fill_gap' | 'word_order' | 'speaking';
export type GrammarQuestionStatus = 'draft' | 'approved' | 'archived';

export interface GrammarGameQuestion {
  id: string;
  book: GrammarBookLevel;
  chapter: string;
  type: GrammarQuestionType;
  sentence: string;
  correct_sentence: string;
  error_word_index: number | null;
  options: string[];
  correct_option: string;
  explanation: string;
  phonetic_focus?: string;
  status: GrammarQuestionStatus;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GrammarGameMistake {
  question_id: string;
  question_type?: GrammarQuestionType;
  sentence?: string;
  student_answer: string;
  correct_answer: string;
  correct_sentence?: string;
  explanation?: string;
}

export interface GrammarGameSession {
  id: string;
  student_id: string;
  book: GrammarBookLevel;
  chapter: string;
  score: number;
  accuracy: number;
  correct_count: number;
  total_count: number;
  best_combo: number;
  duration_seconds: number;
  mistakes: GrammarGameMistake[];
  created_at: string;
}

export interface GrammarRushLeaderboardEntry {
  rank: number;
  first_name: string;
  score: number;
  accuracy: number;
  best_combo: number;
  games_played: number;
  is_current_user: boolean;
}


