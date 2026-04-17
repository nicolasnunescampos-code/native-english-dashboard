-- Run this script to add the referred_by column to your leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.students(id) ON DELETE SET NULL;
